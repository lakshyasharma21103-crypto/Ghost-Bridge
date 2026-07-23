# Multi-Region Resilience and Disaster Recovery

Phase 13E3 adds a provider-neutral regional control plane. It records regional intent, health, authority, failover work, backup inventory, restore validation, and drill evidence. It does not provision infrastructure or invoke provider failover APIs.

## Safety boundary

Ghost Bridge does not claim active-active strong consistency. Correctness-critical orchestration state has one durable write-authority region per platform, organization, or workspace scope. Read-only immutable data and rebuildable projections may be served regionally only with explicit generation time, source region, staleness category, and configured maximum staleness.

Correctness does not depend on DNS propagation, load-balancer state, process memory, or cache contents. Cloud traffic routing, DNS and load-balancer changes, database topology changes, regional service deployment, credential rotation, and provider-side fencing remain external operator responsibilities. Production failover must combine this control plane with an approved infrastructure runbook.

Regional records accept bounded safe identifiers such as `india-primary` and safe provider categories. They reject credentials, authorization material, database/cache URIs, private topology, executable expressions, and unrestricted provider responses.

## Regional configuration and services

`RegionalDeploymentConfiguration` is scoped and versioned. Drafts may be edited and validated; activation archives the previous named active version; active and archived versions are immutable. A configuration declares roles, priorities, residency/classification support, capabilities, the preferred primary and standby, failover allow/deny lists, health and authority timing, degraded mode, cache isolation, and projection recovery policy.

Supported roles are `primary`, `warm_standby`, `cold_standby`, `read_only`, `isolated`, and `disabled`. This phase supports a primary plus standby topology for strong state. It does not turn those roles into an active-active database protocol.

`RegionalServiceRegistration` stores a service/instance identity, service type, region, bounded capabilities, routing versions, state, concurrency, and safe deployment categories. Registration is idempotent, and regional worker registration is mirrored into this inventory. Heartbeats and readiness timestamps feed `RegionalHealthSnapshot`; snapshots contain health categories and bounded counts, never raw health bodies or network topology.

## Single-writer authority, leases, and fencing

`RegionalWriteAuthority` is the source of truth. Its unique `authorityKey` identifies the scope. Workspace checks resolve the most-specific active workspace, organization, then platform authority. Acquisition and transfer use atomic compare-and-set predicates against status, region, authority epoch, and lease epoch.

- `authorityEpoch` increases on every acquisition, promotion, and failback. An old value is never reused.
- `leaseEpoch` fences an old lease holder inside the same authority epoch.
- `leaseExpiresAt` bounds ownership. Expiry freezes writes; it never promotes another region by itself.
- A writer verifies active region, authority status, authority epoch, lease epoch, and expiry at the mutation boundary.
- Authority leases are not cached and lease identifiers are not sent to agents.

When regional mode is enabled, orchestration creation and cancellation, scheduler claims and transitions, checkpoint resume, delegation accounting, quota reservation, approval transitions, policy/recovery-policy/secret activation, and governed runtime mutations call the shared authority guard. Queue claims additionally verify regional partition ownership. Stale writers receive stable `REGION_*` errors.

If the durable authority store is unavailable, correctness-critical writes enter a frozen/recovery-required posture. A target is never promoted based only on a missing heartbeat. Promotion requires the target to be eligible and healthy, residency to allow it, replication to be assessed, required approvals to be satisfied, the old writer to be fenced, and the new epoch to be committed atomically. If fencing cannot be proven, execution stops and requires intervention. Infrastructure fencing outside the application must be recorded in the production runbook.

## Routing, queue ownership, workers, and admission

Regional routing combines tenant/workspace scope, consistency class, requested/home region, active authority, health, residency, classification, and projection staleness:

- `strong_authority` routes to the active writer, queues for it only when explicitly allowed, or rejects when fenced/unavailable.
- Immutable/versioned and eventual-projection reads may use a healthy eligible regional replica.
- Stale diagnostics can use an explicitly configured read-only degraded mode.
- Residency and classification failure always deny routing.

`RegionalRoutingDecision` persists only safe bounded decision inputs and outputs; it never stores a request payload.

Queue partitions now have `homeRegionId`, `activeRegionId`, `fallbackRegionIds`, `regionalOwnershipEpoch`, and `regionalStatus`. Transfer increments the ownership epoch. Old region and ownership epochs are fenced while routing version and logical idempotency identity remain unchanged.

Worker registration includes region and supported regional ownership epochs. Eligibility verifies service state, partition region, ownership epoch, authority epoch, routing version, residency, classification, and existing worker/job fencing. Agent connections and selection decisions also carry safe regional eligibility metadata; failover does not silently replace an agent.

Admission adds authority availability, the durable `admissionFrozen` failover state, target-region health, regional capacity/backpressure, replication status, residency/classification, degraded mode, and the existing authoritative quota reservation. Queue-only degradation requires durable primary storage and defers execution. Restricted operations never bypass RBAC, policy, revocation, fencing, or residency.

## Cache and projections

Caches are region-local by default. Regional keys include a safe region namespace and a digest of tenant/workspace identity; raw tenant identifiers and secrets are not embedded. Authority leases and authority epochs are never trusted from cache. Failover emits durable all-region invalidation events for authority-sensitive aliases; cache outage cannot block an authority transfer.

Projection metadata includes source/projection region, authority epoch, source sequence, replication checkpoint, generation time, and staleness. Failover marks prior projections stale and uses the control-plane worker pool to catch up or rebuild them. Projections remain non-authoritative for execution and respect tenant scope, residency, retention, legal holds, backpressure, and worker fencing. Regional trace spans retain one logical orchestration root and link source, target, failover plan, step, epoch, and regional parent span.

## Replication health and recovery objectives

`RegionalReplicationHealth` is provider-neutral. It records safe domain/status categories and an exact lag only when supplied by a trusted integration. Missing lag is `unknown`, never zero, and is not promotion eligible.

`DisasterRecoveryPolicy` is scoped, versioned, and immutable after activation. It defines criticality, RPO/RTO, maximum promotion lag and unknown window, allowed recovery regions, approvals, bounded degraded mode, backup/retention/verification cadence, and minimum health.

RPO uses the worst available confirmed window from replication lag, last durable write, and verified backup. Unknown replication produces `unknown`, not compliance. RTO is measured from incident start until standard admission resumes. Results are `compliant`, `breached`, `unknown`, or `insufficient_data`; operational status can additionally represent an at-risk policy posture.

## Failover and failback state machines

`RegionalFailoverPlan` is durable, idempotent by scoped key, restart-safe, auditable, and contains only bounded step metadata. Invalid transitions and out-of-order steps are rejected.

A planned switchover performs: validation and approval; admission freeze; source drain and safe claim boundary; replication/readiness verification; source authority freeze; atomic authority epoch transfer; queue ownership transfer; all-region cache invalidation; target worker activation; protected recovery; standard admission resume; projection catch-up; health verification; and incident update.

Emergency failover performs the same correctness-critical transfer with stricter checks. The source must be unavailable or isolated, an incident is linked or created, target capacity must exist, and fencing must be proven. Unknown or excessive replication requires explicit potential-data-loss acceptance when policy permits it. Evidence never labels such a transition lossless.

Pause and resume are durable. Cancellation is allowed only before authority transfer; later reversal requires rollback or a new failback plan. A returned region becomes a standby until health stability, restoration/replication consistency, residency, approvals, claim boundaries, cache invalidation, and projection recovery are verified. Failback is a new planned transfer and always creates a higher authority epoch.

## Backup and isolated restore

`BackupAdapter` defines request/status/list/verify/restore/cancel/retention/health operations. `NoopBackupAdapter` is the production-safe default and rejects provider actions. `MockBackupAdapter` is deterministic and local for tests. Provider credentials and commands are outside the interface records.

`BackupManifest` inventories safe provider references, region/scope, recovery point, retention, encryption/classification categories, schema/application/migration versions, and verification status. `BackupIntegrityManifest` stores only collection counts, safe byte categories, index/schema versions, sequence ranges, and keyed integrity digests; it never stores documents or plain hashes of low-entropy secrets.

Restores always target an isolated reference. Validation checks application/schema compatibility, migrations, index state, tenant boundaries, document/count limits, keyed integrity, and projection rebuild. External agent invocation, credential use, and outbound callbacks remain disabled throughout validation. Encrypted credential records stay encrypted. A validated restore becomes `ready_for_promotion`; production promotion requires RBAC, policy, operational guard, an exact fingerprint-bound approval request, and atomic consumption of its durable approval grant. Client-supplied approval booleans are ignored. Cancel and cleanup are durable and audited.

## Incidents, approvals, audits, and metrics

Emergency failover creates or links an operational incident. Split-brain risk, unknown/excess replication, authority failure, objective breach, backup/restore failure, stale writes, residency violations, and worker isolation use safe bounded incident categories.

Existing RBAC and approval enforcement governs configuration/policy activation, isolation, write freeze, failover/failback, data-loss acceptance, backup/restore, degraded mode, and drills. Failover and restore validation create matching approval requests when an active workflow applies; execution revalidates the fingerprint and consumes the single-use grant. Potential data-loss acceptance has its own critical permission. Critical permissions exclude normal viewer defaults. Policy context contains safe categories and identifiers only.

Audit events record configuration, services, authority, routing, failover steps, queues, workers, cache/projections, backups/restores, objectives, drills, and incident links. Regional metrics filter labels through an allowlist; tenant, workspace, run, node, plan, backup, restore, service, worker, request, trace, provider-account, and hostname identifiers are discarded.

## Operator runbooks

Before planned switchover:

1. Confirm the active configuration/DR policy and source/target residency.
2. Verify target services, workers, database category, capacity, and exact replication freshness.
3. Obtain required approvals and confirm the external traffic/database fencing runbook.
4. Create, validate, approve, and execute the durable plan step-by-step.
5. Apply external routing changes only at the runbook-defined safe point; do not treat them as authority.
6. Verify the new epoch, queue owner, cache invalidation, checkpoint recovery, projections, RPO/RTO, incident, and stale-source rejection.

For emergency failover, isolate/fence the source through both the durable epoch and the infrastructure runbook, create/link the incident, represent unknown data loss honestly, and stop if the authority store is unavailable. For failback, first restore the old region as a standby and prove consistency; never immediately revert on heartbeat recovery.

For backup restoration, request/verify a manifest, restore only to an approved isolated region, keep all external effects disabled, validate schema/index/integrity/projections and tenancy, obtain production-promotion approval, then clean up isolated resources through the provider runbook.

DR drills created by automated tests use only the deterministic harness or explicit isolated mode. The harness simulates heartbeat loss, isolation, fencing, epoch/queue transfer, stale writes, checkpoint recovery, cache/projection recovery, failback, RPO/RTO, and evidence without a network partition or paid service.

## APIs, migration, and verification

Authenticated, tenant-scoped APIs are mounted under `/api/v1/regional-resilience` for configurations, DR policies, regions, authority/history, failovers, health/replication/routing, backups, restores, and drills. Mutations use existing RBAC, policy context, operational guards, request/trace IDs, bounded validation, redaction, audit, and idempotency conventions.

`npm run migrate:multi-region-dr` creates additive indexes and safe regional defaults. It is idempotent, restart-safe, non-destructive, and does not change Atlas or any cloud topology.

`npm run verify:multi-region-dr` runs the deterministic primary-outage, emergency-promotion, checkpoint-resume, exactly-once, restricted-residency, backup/restore, failback, and drill scenario. It does not call Gemini, an external agent, a second database cluster, DNS, Redis, or a paid provider.

Safe optional environment settings are:

- `MULTI_REGION_ENABLED=false` keeps authority guards backward-compatible until a configuration is deployed.
- `SERVICE_REGION_ID=local-region` identifies the local service region.
- `REGIONAL_SERVICE_ID=backend-local` identifies the regional service lease owner.

## Known limitations

Phase 13E3 does not provide active-active strong writes, automatic cloud provisioning, cross-provider replication, Atlas topology management, DNS/load-balancer mutation, distributed cache deployment, provider backup implementation, or automatic infrastructure fencing. Exact production replication lag and provider readiness require trusted integrations. Global traffic automation, topology orchestration, and provider-specific execution remain candidates for Phase 13E4+ and must not be inferred from this control plane.
