# Phase 13C4: Compliance, Approval Workflows, and Audit Evidence

## Security boundary

The governed execution order is authentication, tenant resolution, RBAC authorization, conditional policy evaluation, approval requirement evaluation, approval validation, credential governance, execution, and audit evidence.

Approval does not override RBAC or an explicit policy `DENY`. It is an additional control evaluated only after authorization succeeds. A grant is an internal database record, never a bearer token, and there is no generic grant-redemption API.

## Existing audit architecture

Phase 13C4 extends the existing `AuditLog` stream. It does not introduce a disconnected security audit path. `createAuditLog` keeps writing the backward-compatible record and then best-effort normalizes that record into `EvidenceEvent`. A resumable migration normalizes older events without modifying them or changing their timestamps.

Authorization decisions already provide permission, RBAC result, policy result, matched policy IDs and versions, policy snapshot revision, tenant IDs, request ID, and trace ID. Policy, secret-governance, invocation, and durable-work audit records are normalized from the same source. Records without authoritative organization ownership are declared ambiguous and quarantined from tenant chains; ownership is never guessed.

## Approval workflows

`ApprovalWorkflow` is versioned by `(organizationId, stableWorkflowId, version)`. Versions use `DRAFT`, `ACTIVE`, and `RETIRED`. Activation retires the prior active version and activates the draft in one transaction with an expected revision. Active versions are immutable. Editing an active version creates a new draft version.

Targets can match stable permission, resource, organization, workspace, environment, passport, connection, capability, classification, category, side-effect, and operation IDs. Trigger conditions are bounded declarative literals over a registered safe field set; arbitrary executable expressions are not supported.

Each ordered stage defines a stable ID, sequence, required decision count, eligible permission/role/team constraints, human membership requirements, requester exclusion, distinct approvers, optional previous-stage approver exclusion, timeout metadata, and rejection behavior. Business logic uses registered permissions and current identity attributes rather than role-name conditionals.

## Requests, decisions, and grants

An `ApprovalRequest` is bound to one intended operation. It stores safe IDs, workflow version, requester, permission, resource and operation identity, authorization/policy snapshots, expiry, stage, revision, and a cryptographic fingerprint. It never stores credentials, headers, prompts, private memory, or invocation payloads.

Fingerprints use deterministic sorted serialization and SHA-256 over organization/workspace, requester, permission/resource, connection/capability/operation/environment, workflow version, policy revision, and a digest of a redacted payload-sensitive subset. Changing a relevant field causes `APPROVAL_FINGERPRINT_MISMATCH` and invalidates the request.

At decision time the service rechecks active enterprise-user status, tenant/workspace membership, current approval permission, current policy, stage permission/role/team constraints, expiry, requester exclusion, duplicate identity, and previous-stage exclusion. Service accounts and agents cannot satisfy human stages. Decision insertion, request revision transition, and final grant creation are transactional. A unique stage/approver index prevents duplicate counting.

Grants are tenant-, requester-, permission-, resource-, operation-, fingerprint-, workflow-, and expiry-bound. Single-use grant consumption and request transition to `CONSUMED` are transactional. Current approver membership is checked again before execution.

## State machine and separation of duties

Requests use `DRAFT`, `PENDING`, `PARTIALLY_APPROVED`, `APPROVED`, `REJECTED`, `EXPIRED`, `CANCELLED`, `INVALIDATED`, `CONSUMED`, `EXECUTION_FAILED`, and `RECOVERY_REQUIRED`.

Separation of duties is workflow-configured. Supported controls include requester exclusion, distinct people for required slots, prior-stage approver exclusion, human-only approval, permission/role/team eligibility, and workspace/organization membership. State predicates include the current revision and current stage, so concurrent decisions cannot skip stages or over-count.

## Runtime and administrative enforcement

Agent Passport invocation performs RBAC and policy authorization before approval evaluation. A matching active workflow requires approved request IDs. Enforcement occurs before durable work initialization, credential brokering, adapter selection, execution leases, and external calls. The grant is consumed immediately before an execution can reach an adapter or credential resolver.

`waiting_for_approval` is an explicit invocation and durable-work state. It is absent from `CLAIMABLE_DURABLE_WORK_STATUSES`; workers cannot lease it. `releaseQueuedWorkForApproval` atomically changes approved work to `pending` and its invocation to `authorized`. The current gateway uses approval-before-queue admission for normal invocations and exposes the waiting state for asynchronous governed producers.

Durable workers reload approval IDs, rerun current RBAC and policy authorization, reload connection/capability metadata, revalidate the grant and current human approvers, and only then continue. A consumed single-use grant may be recognized only by the same durable invocation restart path; it cannot authorize a new action.

Policy activation/retirement, secret version activation/revocation/destruction, secret disable/revoke, and evidence export use the same post-authorization approval evaluator when a matching workflow is active. No workflow is enabled automatically, so existing tenants retain existing behavior.

Unknown external side-effect recovery remains an explicit `RECOVERY_RETRY` action. Approval does not make retry technically safe, bypass existing recovery decisions, or bypass idempotency/duplicate-execution safeguards. The UI surfaces the possibility that an external side effect already occurred.

Automatic invalidation occurs for fingerprint mismatch, expiry, stale tenant/workspace/action binding, missing grant, inactive approver, and policy denial during invocation reauthorization. Credential revocation and connection/capability changes continue to fail closed in their authoritative runtime checks even when a grant was issued earlier.

## Notifications

`ComplianceNotification` supports approval requested, decision recorded, rejected, expired, invalidated, completed, execution failed after approval, and recovery required. Notifications contain safe summaries only. A delivery-adapter registration point is present; no email, Slack, or Teams integration is enabled.

## Normalized evidence and integrity

`EvidenceEvent` contains event and schema IDs, occurrence/record times, verified tenant scope, actor, action/permission, resource, decision, safe reason code, trace/request/invocation/approval IDs, policy references, safe state transitions, source subsystem, retention class, legal-hold indicator, and integrity metadata.

Metadata is redacted and then reduced to an allowlist. Credentials, ciphertext, keys, tokens, authorization headers, signed URLs, prompts, full inputs/outputs, private memory, and provider responses are excluded.

Each organization has independent monthly partitions. `AuditChainState` allocates sequences transactionally. A digest commits to canonical event content, chain ID, partition, sequence, previous digest, and algorithm version. Verification detects modifications, sequence gaps, previous-digest breaks, cross-chain records, and tenant mismatches. MongoDB natural ordering is never used.

Audit hash chains are tamper-evident, not automatically tamper-proof. A database administrator with broad write access could alter both events and chain state. External immutable storage, object lock, external timestamping, HSM signing, independent audit sinks, and external anchoring are extension points and are not implemented.

## Checkpoints

`AuditCheckpoint` records a tenant partition, sequence range, first/final digests, count, and verification status. The tenant/range index makes generation idempotent. Checkpoints are hash checkpoints and are not presented as externally signed.

## Evidence packages and verification

Exports are represented by durable `EvidenceExport` metadata and stored through `LocalEvidencePackageStorage` under secured local development storage. The abstraction is replaceable by S3-compatible, Azure Blob, Google Cloud Storage, or object-lock adapters without changing package generation. No cloud dependency is included.

Exports move through `PENDING`, `RUNNING`, `FINALIZING`, and terminal states. They are cancellable before finalization. Startup resumes `PENDING`/interrupted `RUNNING` work and marks uncertain finalization `RECOVERY_REQUIRED`. Access always rechecks authentication, tenant ownership, permission, policy, status, and expiry; no public URL is created.

A package contains `manifest.json`, normalized `events.jsonl`, and a safe `summary.csv`. The manifest contains tenant scope, requested filters, schema versions, counts, checkpoint references, file digests, package digest, redaction report, known gaps, generator version, and verification instructions.

Verification checks manifest version, required files, file and package digests, event count, record shape, tenant consistency, chain continuity, checkpoint consistency, malformed events, and declared gaps. Results are `VALID`, `INVALID`, `PARTIALLY_VERIFIABLE`, or `UNSUPPORTED_VERSION`. Missing important files are never valid.

Evidence packages intentionally exclude secrets and private payloads.

## Retention and legal holds

Retention policies are versioned and tenant/workspace/category scoped. They define duration, archive behavior, deletion eligibility, hold behavior, creator, activation, status, and revision. There is no TTL index on evidence, approvals, decisions, or legal holds.

Retention is non-destructive by default. Preview is a dry run and makes no changes. Deletion requires an active explicit policy, current authorization/policy, explicit confirmation, and a bounded preview. Legal holds are evaluated before deletion; uncertainty preserves evidence. Deletion is audited and any resulting chain gap remains detectable.

Legal holds use bounded date/category/actor/resource/invocation/approval/policy/connection/passport selectors with complexity limits. `DRAFT`, `ACTIVE`, `RELEASED`, and `EXPIRED` are supported. Release requires expected revision and explicit confirmation. Release does not delete evidence; normal retention evaluation must run later.

## Control catalog and reporting

The internal catalog includes authorization, tenant isolation, policy-deny precedence, requester exclusion, distinct approvers, secret non-disclosure, credential revocation, evidence normalization/integrity, and durable recovery. Each control has a stable ID/version, category, implementation status, event types, subsystem, test references, timestamps, and limitations.

Framework mappings are informational implementation evidence only. Control mappings do not constitute certification, attest full compliance, or prove operating effectiveness.

Reports expose tenant-scoped approval status, authorization denials, integrity verification, export history, active holds, and control implementation status. Detailed identities remain in protected evidence queries, not metric labels.

## Permissions and APIs

Permission registry v4 adds the `approval.workflow.*`, `approval.request.*`, `approval.audit.read`, `evidence.*`, `audit.integrity.*`, `audit.retention.*`, `legal-hold.*`, `control.*`, and `compliance.report.read` permissions. Each includes description, category, risk, audit requirement, and built-in defaults.

Protected APIs are mounted under:

- `/api/v1/approvals/workflows` for list, create, versions, validate, simulate, activate, and retire;
- `/api/v1/approvals/requests` for create, list, inspect, approve, reject, cancel, and decision/grant metadata;
- `/api/v1/approvals/notifications` for the internal inbox;
- `/api/v1/evidence/events` for normalized metadata;
- `/api/v1/evidence/integrity/*` for checkpoints and verification;
- `/api/v1/evidence/exports/*` for create, inspect, cancel, verify, and authorized download;
- `/api/v1/evidence/retention/*` and `/api/v1/evidence/legal-holds/*`;
- `/api/v1/evidence/controls` and `/api/v1/evidence/reports`.

The frontend adds a compact Compliance console with approval inbox/details, decisions, workflow drafts/activation, evidence exports, control status, report summary, and legal-hold visibility. It never renders private payloads, prompts, headers, or credentials.

## Migration and rollback

Run `npm run migrate:compliance-governance` after backup and change approval. It creates indexes first, then normalizes legacy audit batches in timestamp/ID order, resumes from `COMPLIANCE_BACKFILL_AFTER_ID`, preserves source records/timestamps/tenant IDs, declares ambiguous ownership, and builds tenant partition chains.

Rollout order is models/indexes, normalization, backfill, chain verification, new emission, and explicit workflow activation. Rollback disables workflow activation/routes and evidence emission while keeping legacy `AuditLog` readable. New collections can remain for forward recovery; do not delete evidence as part of rollback.

## Operations and alerts

Low-cardinality counters/durations cover approval lifecycle/conflicts, requirement evaluation, normalization, chain/checkpoint verification, exports, verification, holds, retention, and reports. Actor, tenant, resource, request, policy, and trace IDs are not labels.

Internal alerts are raised for audit integrity and evidence export failures. Approval conflicts, self-approval prevention, policy revocation, retention failures, and legal-hold blocking emit audit evidence/metrics for existing operations reporting.

## Verification

Non-billed checks are `npm test`, `npm run build --workspace frontend`, `npm run verify:demo`, `npm run verify:sandbox`, `npm run verify:policy-engine`, `npm run verify:secret-governance`, and `npm run verify:compliance-governance`.

The dedicated verifier uses local fake data only. It does not call Gemini, Google Search, or an external research agent.

## Known limitations and Phase 13C5 handoff

Phase 13C4 is an implementation layer, not a claim of production readiness or enterprise certification. Remaining work includes penetration testing, formal control review, external audit, legal and retention-policy review, disaster-recovery tests, external evidence storage validation, incident-response exercises, load testing, and multi-instance deployment testing.

Recommended Phase 13C5 work is external immutable/object-lock storage, independent evidence anchoring/signing, multi-instance chain/export stress tests, SIEM delivery adapters, formal operating-effectiveness sampling, and deployment-specific retention/legal review. Manual billed release gates remain `npm run verify:gemini-agent` and `npm run verify:external-flow`.
