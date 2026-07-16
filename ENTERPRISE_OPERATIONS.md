# Enterprise Operations and Administration

Phase 13C5 adds a tenant-safe operational control plane to Ghost Bridge. It governs organization and workspace lifecycle, maintenance, identity lifecycle, access reviews, configuration, incidents, administrative notifications, tenant metadata exports, deletion, recovery, and disaster-recovery status.

The existing `Partner` remains the authoritative tenant. `Organization` and `Workspace` are the optional enterprise lifecycle layer and never create a second authorization boundary. Every administrative API is authenticated, checked against permission registry v5, evaluated by the policy engine, checked for configured approval requirements, checked against current operational state, and audited with redacted metadata.

## Safety contract

- Unknown lifecycle or maintenance states fail closed.
- Tenant and workspace scope comes from the authenticated partner. A caller cannot select another organization.
- There is no emergency authorization, policy, approval, retention, or legal-hold bypass.
- Suspension blocks new execution, queue submission, connection/install-key creation paths, credential operations, and worker claims in the affected scope.
- A worker rechecks operational state immediately before starting claimed work. Queued work moved to `blocked` is non-claimable and resumes only through an explicit controlled operation.
- Suspension cannot guarantee cancellation after an external provider has accepted a request. In-flight cancellation is best effort, and ambiguous external outcomes remain subject to the existing runtime recovery rules.
- Maintenance release and tenant reactivation do not automatically run paused work.
- Tenant deletion is a governed, staged, resumable operation, not an immediate delete endpoint.
- Legal holds and applicable retention policies block tenant deletion.
- Destructive recovery never automatically retries an external or deletion side effect.
- DR status reports only configured, authoritative sources. Ghost Bridge does not configure MongoDB Atlas backups and does not infer backup success from database availability.
- Health and readiness checks never invoke an external model or provider and do not prove that lifecycle controls, backups, or recovery procedures are production-ready.

Passing the repository tests is not production validation. Before production enablement, validate organization-specific approval policies, retention schedules, legal authority, export storage, alert routing, backup ownership, restore procedures, operator training, and failure drills in the target environment.

## Lifecycle model

Organization states are `active`, `suspending`, `suspended`, `reactivating`, `archiving`, `archived`, `deletion_requested`, `deletion_blocked`, `deletion_in_progress`, `deleted`, and `recovery_required`. Workspace states add `read_only` for narrower operational control and also support `recovery_required`.

Transitions are deterministic and versioned with optimistic concurrency. Each operation records an operation identifier, reason, actor, approval linkage when applicable, prior and resulting revision, and timestamp in `LifecycleTransition`. Repeating the same operation is idempotent; conflicting operations at an old revision are rejected.

Suspension pauses pending and retry-scheduled durable work only in the targeted scope. Existing external requests may complete, so operators must inspect drain state and ambiguous outcomes. Reactivation validates deletion status, unresolved critical incidents, credential bindings, and worker readiness when recoverable queued work exists. It preserves legal holds and retention rules and does not resume blocked work.

Membership states are `invited`, `active`, `suspended`, `removal_pending`, `removed`, and `deleted`. Service-account states are `active`, `disabled`, `rotation_required`, `expired`, `revoked`, `deleted`, and `suspended`. Suspension, removal, disablement, expiry, and revocation immediately remove current governed use. Historical audit actor references remain intact and contain no credential material. Human approval workflows require an active human membership; a service account cannot approve them. The provisioning API stores scoped identity metadata and role bindings but does not issue a raw service-account secret or introduce a new authentication protocol.

## Maintenance and draining

Maintenance records progress through `DRAFT`, `VALIDATED`, `ACTIVE`, `RELEASED`, or `CANCELLED`. Scope can be platform, organization, workspace, runtime adapter, or connection. Modes are:

- `READ_ONLY`: safe reads and health remain available; mutations are denied.
- `EXECUTION_BLOCKED`: new execution, durable submissions, worker claims, and credential operations are denied.
- `DRAINING`: new submissions and claims stop; an already-claimed execution may finish explicitly.
- `FULL_MAINTENANCE`: only safe reads and health remain available.

Activation and release are explicit, authorized operations. Drain status reports bounded aggregate counts without tenant identifiers in metrics. Release never implicitly resumes blocked jobs.

## Access review

An access-review campaign snapshots active membership and service-account access within one tenant/workspace scope. Every item stores a digest of that snapshot. Decisions (`retain`, `revoke`, `suspend`, or `remediate`) are separate from access mutation.

Remediation re-authenticates an active human reviewer, re-runs authorization and policy, enforces configured approval, and verifies the snapshot digest in a transaction. A stale item becomes a conflict instead of silently changing current access. Campaign close does not imply that undecided or failed remediation was performed.

## Configuration and feature availability

Operational configuration is bounded JSON with immutable activated versions. Values are screened for secret-like keys and executable content. Core tenant isolation, authorization, policy, approval, audit, encryption, retention, and legal-hold controls cannot be disabled by configuration or feature availability.

The lifecycle is create, validate, activate, and optionally roll back. Activation transactionally retires the prior active version. Rollback creates and activates a new version derived from the intended prior version, preserving complete history. Feature availability is evaluated on the backend by organization/workspace and defaults safely to disabled when no active value exists.

## Incidents, security events, and notifications

Operational incidents have severity, status, owner, affected scope, timeline, and response actions. Incident response uses the same permission, policy, approval, operational-state, and audit path as direct administration. It cannot serve as a bypass.

Security events store normalized, allowlisted metadata only. Tokens, passwords, credentials, request bodies, private invocation payloads, and arbitrary nested input are discarded. Administrative notifications reuse `ComplianceNotification`, are tenant scoped, deduplicated, and have explicit unread/read state. Alerts reuse `OperationalAlert`; metrics use low-cardinality outcome, operation, and reason labels and never include tenant, user, incident, export, or deletion identifiers.

## Tenant metadata export

Tenant export is an asynchronous, bounded metadata export. The operator selects supported metadata categories; the package records those selections and explicit exclusions. Secret plaintext, ciphertext, private credentials, raw tokens, and private invocation payloads are excluded, and exported objects pass through the shared redactor.

A completed export has an expiry. Download requires `tenant-export.download` and a short-lived authorization token whose hash, not plaintext, is stored. Cancellation and package expiry are explicit. An active, unexpired package can block tenant deletion so it is not orphaned by a destructive operation.

## Tenant deletion

Deletion starts with a non-mutating preview. The preview reports blockers, the bounded collection plan, estimated item counts, an operation fingerprint, and the exact confirmation text. Request, approval, and execution are separate permissions and may require configured approvals and separation of duties.

Execution is durable and collection-specific. Every destructive query contains tenant scope; an unscoped `deleteMany({})` is never used. Each completed step is checkpointed so recovery continues at the first unfinished step. Audit evidence, approval evidence, legal holds, retention records, deletion history, and the secret-free tombstone remain available where required for compliance and recovery. Partial failure creates an operator-visible recovery record and is not automatically retried.

Deletion blockers include:

- active legal holds;
- retention obligations that have not expired;
- active or ambiguous invocation/work records;
- active tenant-export packages;
- unresolved critical incidents;
- an operation fingerprint or confirmation mismatch.

## Recovery and disaster recovery

`OperationalRecovery` records partial or failed administrative operations with bounded context, status, operator ownership, and resolution notes. Recovery actions are authorized and audited. Exports that were safely queued may be resumed at startup; destructive deletion steps are never automatically resumed or retried.

`DisasterRecoveryStatus` is an integration/status surface for configured backup, restore, and continuity sources. A source may report `UNKNOWN`, `HEALTHY`, `DEGRADED`, `FAILED`, or `NOT_CONFIGURED` with its last authoritative observation. Database connectivity is not backup verification. Ghost Bridge does not configure Atlas backup policies, take snapshots, or claim a successful restore.

## API and console

All routes are under `/api/v1/admin/operations` and require partner authentication. Route-level permissions are granular; service-level authorization and policy checks are repeated for sensitive operations. Major route groups are:

- `/dashboard`, `/lifecycle`, `/organization/*`, and `/workspaces/:workspaceId/*`
- `/maintenance` and `/drain-status`
- `POST /members`, `/members/:userId/*`, `POST /service-accounts`, and `/service-accounts/:accountId/*`
- `/access-reviews` and `/access-review-items/:reviewItemId/*`
- `/configurations/*`
- `/incidents`, `/security-events`, and `/notifications`
- `/tenant-exports/*` and `/tenant-deletion/*`
- `/recoveries` and `/dr-status`

The frontend route `/enterprise-operations` exposes a compact Enterprise Admin console for lifecycle, maintenance, access, configuration, incident, export, deletion preview, recovery, and DR status. Destructive execution is never represented as a harmless UI-only toggle; the backend remains authoritative.

## Migration and rollback

Run the idempotent migration with a configured MongoDB:

```powershell
npm run migrate:enterprise-operations
```

The migration creates indexes, backfills lifecycle revisions, and treats existing organizations and workspaces as active. It preserves current membership and service-account state and never automatically suspends or deletes a tenant. Batches can be resumed using the checkpoint environment variables printed by the script.

Application rollback is safe before operators begin using new lifecycle transitions: deploy the prior application while retaining the additive collections and fields. After use begins, do not delete Phase 13C5 history. First release maintenance, validate active tenant state, explicitly resume only reviewed blocked work, and retain lifecycle, audit, evidence, hold, deletion, recovery, and tombstone records. A database rollback must be planned as a governed data migration; reverting code does not reverse a completed deletion or external side effect.

## Runbooks

### Suspend and reactivate an organization

1. Create or reference the incident/change record and inspect active work and export status.
2. Request then complete suspension with the required reason, operation ID, revision, and approval.
3. Verify new submissions and claims are denied; review in-flight or ambiguous work separately.
4. Before reactivation, resolve critical incidents, validate bindings and worker readiness, and re-run policy/approval checks.
5. Reactivate. Review blocked work item-by-item or by approved scope, then use controlled resume. Do not assume reactivation resumed it.

### Suspend a workspace

1. Confirm the workspace belongs to the authenticated organization.
2. Request and complete the workspace transition.
3. Verify only the selected workspace is blocked and another active workspace remains usable.
4. Reactivate only after workspace blockers are cleared; explicitly review paused work before resume.

### Enter and leave maintenance

1. Create a scoped draft with mode, reason, start, optional end, and expected impact.
2. Validate the draft and resolve overlap or scope errors.
3. Activate with required approval. For draining, monitor aggregate drain status until the agreed threshold.
4. Release maintenance explicitly and validate state. Resume blocked work separately after review.

### Remove a member or revoke a service account

1. Inspect current access, owned reviews/incidents, and pending approvals.
2. Suspend/disable first when immediate containment is needed.
3. For a member, request then execute removal. For an account, rotate or revoke as appropriate.
4. Verify current grants no longer authorize use while historical actor references remain readable.

### Run an access review

1. Create a tenant/workspace-scoped campaign and inspect the snapshot counts and digest.
2. Activate and assign active human reviewers.
3. Record decisions. A decision alone does not mutate access.
4. Remediate governed items. Resolve stale-snapshot conflicts by creating or refreshing a review; do not overwrite current access blindly.
5. Close only after failed and pending remediations have been reconciled.

### Activate or roll back configuration

1. Create a bounded version without secrets or executable values.
2. Validate it and confirm it cannot weaken core security controls.
3. Activate with policy and approval. Observe the backend-evaluated result.
4. To roll back, select the known-good prior version; the system creates a new rollback version. Verify behavior and audit linkage.

### Respond to an incident

1. Create or update the incident with severity, owner, affected scope, and sanitized evidence references.
2. Select a supported response action.
3. Complete normal authorization, policy, and approval. Do not use incident response to bypass lifecycle governance.
4. Record the outcome and any ambiguous external work in the timeline and recovery queue.

### Export tenant metadata

1. Choose the minimum necessary supported categories and review the explicit exclusions.
2. Request the asynchronous export and wait for `COMPLETED`.
3. Issue a short-lived download authorization and retrieve it through the authenticated route.
4. Store the package under the organization's data-handling policy and expire/cancel it when no longer required.

### Delete a tenant

1. Run preview only. Review blockers, collection plan, counts, fingerprint, and exact confirmation text.
2. Clear work/export/incident blockers through their normal workflows. Never remove a hold or shorten retention merely to make deletion pass.
3. Submit the deletion request, obtain independent approval where configured, and verify the fingerprint has not changed.
4. Execute the durable job. Monitor every step and recovery record.
5. On partial failure, preserve checkpoints and investigate; resume through governed recovery only. Verify the tombstone and retained compliance records after completion.

### Validate DR status

1. Confirm which external backup or continuity system is authoritative and who owns it.
2. Record only observed status and timestamp from that source.
3. Treat `UNKNOWN`, stale, or `NOT_CONFIGURED` as requiring operator action.
4. Perform restore testing outside this status endpoint and attach sanitized evidence. Never infer restore success from a passing health check.

### MongoDB outage

1. Treat production operational-state lookup failures as fail-closed and stop new mutations, submissions, claims, credentials, and recovery actions.
2. Preserve in-flight ambiguity; do not assume an interrupted write or external call failed.
3. Restore database connectivity, verify replica and index health, then inspect lifecycle, durable-work, incident, and recovery records before reopening traffic.
4. Resume only explicitly reviewed blocked work and capture the outage and validation evidence in an incident.

### Worker restart or fleet loss

1. Enter scoped draining or execution-blocked maintenance if workers are unstable.
2. Restart workers without manually resetting claims. Allow lease expiry and the durable reconciliation flow to classify abandoned work.
3. Separate provably pre-transmission work from ambiguous post-transmission work; never blindly retry the latter.
4. Validate heartbeat, queue, dead-letter, and recovery counts before releasing maintenance.

### Encryption-key provider outage

1. Block credential and secret operations through scoped maintenance and open a critical incident.
2. Do not export ciphertext, substitute unmanaged keys, or weaken approval and audit controls.
3. Restore the configured key provider and validate unwrap/rewrap health with non-production or organization-approved material.
4. Reconcile leases, rotations, and rewrap jobs before explicitly reopening credential operations.

### External-agent outage

1. Stop new execution with scoped execution-blocked maintenance while leaving safe reads and health available.
2. Classify accepted, timed-out, and unknown external outcomes using existing invocation recovery rules.
3. Restore the agent, run the non-billed health and sandbox checks, and validate capacity before release.
4. Retry only work proven safe or explicitly approved through recovery; do not replay ambiguous calls.

### Credential compromise

1. Disable or revoke the affected account or binding and enter execution-blocked maintenance for the smallest safe scope.
2. Rotate credentials through the governed secret workflow; do not place replacement material in incidents, notifications, logs, or evidence.
3. Review access, leases, invocations, security events, and audit history for affected scope and time.
4. Restore service only after new credentials and authorization are verified and the incident owner approves containment.

### Audit-integrity failure

1. Enter read-only or full maintenance according to impact and open a critical incident; never silently discard an audit write.
2. Preserve database, application, and external logging evidence with documented custody.
3. Reconcile audit sequence, actor, request, trace, approval, and evidence references against authoritative records.
4. Release maintenance only after security/compliance owners accept the repair and any unverifiable interval is explicitly recorded.

### Failed deployment rollback

1. Enter draining, confirm active external calls, and capture the deployment version and migration checkpoint.
2. Roll back application code without deleting additive Phase 13C5 fields or history.
3. Validate lifecycle state, operational guard behavior, worker leases, configuration versions, and indexes.
4. Release maintenance and resume reviewed work separately; code rollback never reverses completed deletion or external effects.

### Accidental configuration activation

1. Identify the active version and impact; use maintenance if execution or mutation safety is uncertain.
2. Select the last known-good immutable version and invoke governed rollback, which creates a new active version.
3. Verify backend feature evaluation and affected workflows, then record the rollback linkage in the incident.
4. Do not edit or delete the erroneous historical version.

### Evidence-export recovery

1. Determine whether generation failed before package publication or after a package may have become available.
2. Cancel or expire any ambiguous package authorization and preserve the export record and failure evidence.
3. Resume only safely queued generation through governed recovery; never automatically duplicate a published export.
4. Verify exclusions, expiry, hash-backed download authorization, storage handling, and audit linkage before delivery.

## Verification

The Phase 13C5 gate is non-billed and does not invoke an external provider:

```powershell
npm run verify:enterprise-operations
```

Before release also run the standard test/build and existing non-billed governance verifiers. The verifier requires configured MongoDB for authoritative collection/index checks. Live Gemini and external-flow gates remain manual and must be run only when billed verification is explicitly intended.

## Operational limits and Phase 13D

The current phase provides the control plane and safe integration seams; it does not procure backup infrastructure, act as a legal retention engine, cancel already accepted provider work, deliver notifications to external paging/email systems, issue independently authenticating service-account credentials, or provide full SIEM/GRC synchronization. Production alert destinations, long-term export object storage, authoritative backup/restore integrations, richer campaign scheduling, external identity lifecycle and service-account credential provisioning, and automated evidence delivery are candidates for Phase 13D after organization-specific security and compliance review.
