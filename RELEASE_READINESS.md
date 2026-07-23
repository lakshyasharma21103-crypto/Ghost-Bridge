# Production Release Hardening and Operational Readiness

Phase 13E5 adds a provider-neutral release control plane. It validates and records
release metadata, simulates bounded rollout behavior, and creates immutable evidence.
It does not deploy Ghost Bridge to staging or production.

Production deployment, production smoke tests, live Gemini and external-flow
verification, heavy performance tests, failover, restore, credential rotation, tags,
and hosted releases remain explicit manual or external operations.

## Trust boundaries and environment categories

The control plane may read Git-tracked source, package manifests, the lockfile, safe
operational records, regional status, and bounded performance evidence. It may write
release records, migration checkpoints, approvals, audits, and safe evidence metadata.
It never stores environment values, connection strings, credentials, authorization
headers, signed URLs, prompts, agent outputs, hidden reasoning, or customer payloads.
`NoopDeploymentAdapter` is the production boundary and always returns
`PRODUCTION_DEPLOYMENT_DISABLED`; `MockDeploymentAdapter` is deterministic and local.

Supported categories are `development`, `test`, `ci`, `integration`, `staging`, and
`production`. Development permits explicit local conveniences. Test/CI use synthetic
secrets and mocks. Integration uses mock or allowlisted services without production
data. Staging is production-like but manual. Production requires HTTPS, secure cookies,
hardened CORS, an explicit trusted proxy, fenced single write authority, strong
secrets, active redaction, and disabled debug, fault injection, source-map exposure,
and production load targets.

## Production profile and startup validation

`Backend/src/config/productionProfile.js` is code-defined and contains names and
requirements, never values. It defines required/optional/forbidden variable names,
supported adapters, URL schemes, logging/source-map constraints, and fail-closed
startup. Production startup validates configuration before readiness.

Stable safe codes include `CONFIG_REQUIRED_VALUE_MISSING`,
`CONFIG_SECRET_TOO_WEAK`, `CONFIG_SECRET_FORMAT_INVALID`,
`CONFIG_TIMEOUT_HIERARCHY_INVALID`, `CONFIG_LEASE_HIERARCHY_INVALID`,
`CONFIG_PRODUCTION_COOKIE_INSECURE`, `CONFIG_PRODUCTION_CORS_UNSAFE`,
`CONFIG_PRODUCTION_DEBUG_ENABLED`, `CONFIG_PRODUCTION_FAULT_INJECTION_ENABLED`,
`CONFIG_PRODUCTION_LOAD_TARGET_ENABLED`, `CONFIG_RUNTIME_URL_UNSAFE`,
`CONFIG_TRUSTED_PROXY_INVALID`, `CONFIG_CACHE_ADAPTER_UNSUPPORTED`,
`CONFIG_REGION_ID_MISSING`, and `CONFIG_WRITE_AUTHORITY_INVALID`.
Errors contain variable names only—never values, connection strings, tokens, or useful
secret-length information. External-agent validation uses the same environment
categories, forbids its mock provider in production, and requires HTTPS origins.

## Environment and tracked-secret hygiene

Tracked `.env.example` files use placeholders such as `<mongodb-username>`,
`<mongodb-password>`, `<mongodb-cluster-host>`, `<generate-long-random-secret>`,
`<base64-encoded-32-byte-key>`, `<external-agent-runtime-token>`, and
`<gemini-api-key>`. Real values must never appear in an example. Ignored `.env` files
are neither read by normal release validation nor packaged. Gitignore validation checks
root and workspace variants while allowing examples.

`releaseSecurity.service.js` obtains bounded paths from `git ls-files` and detects
embedded MongoDB/Redis credentials, private keys, provider/GitHub/Slack/AWS tokens,
bearer headers, signed URL credentials, and real-looking secret assignments. Findings
contain path, line, detector name, and a redacted marker only. The scanner explicitly
reports that history was not scanned.

Test directories, verifier scripts, provider-response snapshots, and named synthetic
harness modules form a documented fixture allowlist. Direct `scanText` tests prove
those credential patterns remain detectable and redacted.

### Tracked secret remediation

1. Block release validation and treat the credential as exposed.
2. Revoke or rotate it with existing secret governance.
3. Replace tracked content with a placeholder.
4. Review logs, artifacts, evidence, and provider audit records.
5. Re-run security and release verifiers.
6. Link the incident and remediation evidence.

Known credential exposure is not waivable.

### Manual Git-history scan

Use an approved offline history scanner from a clean clone, covering all branches and
tags, while keeping findings out of ordinary logs. Rotate first. Any history rewrite
requires repository-owner approval, evidence preservation, coordination, and clone-owner
notification. Phase 13E5 never scans or rewrites history automatically.

## Candidate, manifest, provenance, artifact, lockfile, and SBOM

Candidate states are `draft`, `validating`, `validation_failed`,
`ready_for_approval`, `approval_required`, `approved`, `rejected`, `superseded`,
`released`, and `archived`. Exact source revision and bounded component/protocol/schema
versions are required. Approved/released candidates are immutable. Creation does not
deploy. Existing RBAC, policy, approval, operational state, idempotency, and audit
systems govern lifecycle actions.

The immutable manifest records source/workspace versions, protocol/schema/migration/
routing/cache/projection versions, variable names, indexes, migration IDs, feature
snapshot, expected services/pools/regions, artifact SHA-256 values, and SBOM reference.
It never includes values, private URLs, secrets, or headers.

Provenance records clean/dirty/unknown source state, local/CI/trusted-CI category,
runtime/npm versions, lockfile/source digests, named build/test commands, artifact
digests, and timestamps. Local builds cannot claim trusted CI; machine username,
absolute paths, IP addresses, environment values, and CI tokens are excluded.

Artifacts hash deterministically ordered tracked paths and bytes. `.env`, dependencies,
build output, caches, coverage, test output, and temporary files are excluded. Offline
lockfile checks cover parseability, workspaces, integrity shape, insecure HTTP,
unpinned Git sources, external file dependencies, and local user paths.

SBOM metadata comes deterministically from `package-lock.json`, bounded and classified
by workspace, direct/transitive, source, license where present, and development/
production use. SBOM generation does not claim vulnerability-free status; live advisory
review remains a manual CI/release gate.

## Compatibility and migrations

The immutable compatibility matrix explicitly evaluates database, migration, routing,
queue ownership, authority epoch format, cache serialization, projection, passport, and
data-contract versions plus minimum backend/worker/external-agent versions. Package
version equality alone is insufficient. Old workers cannot claim unsupported jobs;
new workers retain accepted historical routes; incompatible workers remain ineligible.
Authority epochs, idempotency, delegation accounting, compensation, events, and audits
remain compatible.

Migration plans reference code-defined IDs only. Rolling releases permit additive
collections/optional fields/non-destructive indexes, tolerant enums, dual read/write,
bounded resumable backfills, and projection rebuilds. They reject destructive drops/
renames, unsafe unique or TTL changes, synchronous large rewrites, historical deletion,
and combined expand plus destructive contract.

Expand deploys compatible schema and code first. Contract is a later approved release
after old processes drain, backfill verifies, the compatibility window closes, and
rollback is decided. Execution requires privileged RBAC, policy, candidate approval,
an exact plan, idempotency, fenced single ownership, bounded batches, durable
checkpoints, retries, audit, and safe-boundary cancellation. No release migration runs
automatically at startup.

The idempotent index command is `npm run migrate:release-readiness`. It is manual and
does not modify Atlas or provider infrastructure.

Cache serialization/namespace/key versions are explicit. Mismatch rejects the entry
and falls back to authoritative MongoDB. Projection mismatch never grants authority;
rebuilds are bounded, resumable, and non-blocking when non-critical.

## Feature flags, targets, and adapters

Flags are versioned, bounded by scope/environment/region/tenant category/release/
percentage/expiry/owner, and contain no expressions, code, secrets, or tenant lists.
Active versions are immutable. They cannot bypass authorization or safety controls.
Snapshots are immutable and bounded. Kill-switch use requires confirmation, reason,
approval where configured, and audit.

Targets are allowlisted as local simulation, manual staging, and manual production.
Arbitrary targets/scripts are rejected. Production cannot generate synthetic traffic
and requires manual execution. The mock adapter simulates versions, health, pause,
failure, rollback, and roll-forward; the no-op adapter has no provider credentials or
provider mutation.

## Rollout, preflight, risk, and canary behavior

Policies support all-at-once, rolling, canary, blue/green, regional sequential, and
manual strategies. They version canary/batch sizes and observation, availability/
surge limits, health/readiness/SLO/error-budget/performance gates, rollback/
roll-forward/migration behavior, and approvals. Active versions are immutable.

Plans record source/target, target/policy, ordered regions/services/pools, strict state,
batch counters, gates, approval, incident, request, and trace. Invalid transitions and
idempotency-key reuse are rejected.

Preflight deterministically checks source, build/tests, lockfile, secrets, examples,
gitignore, startup profile, migrations/indexes, mixed versions, cache/projection/
routing/worker protocols, regions, backup/restore/DR, performance/capacity/headroom,
SLO/alerts, ownership, rollback, runbooks, approvals, and evidence. States are
`passed`, `passed_with_warnings`, `blocked`, `insufficient_evidence`, and
`approval_required`. Unknown critical evidence is never low risk; deterministic risk
uses the maximum safe category across all dimensions.

The bounded harness simulates old/new backends/workers, scheduler authority, queue
partitions, active work, migrations, cache/projections, and regions. It proves bounded
canary, mixed-version compatibility, incompatible-worker rejection, accepted-work
completion, no duplicate logical execution, graceful drain, stale fencing, regression
pause, authority/idempotency preservation, roll-forward-only handling, cache fallback,
projection rebuild, resume, and cleanup. Local simulation does not prove production
capacity or provider behavior.

### Normal deployment

Validate the candidate and preflight evidence, obtain every required approval, confirm
the target and observation owner, then execute only through the allowlisted adapter.
Pause on any blocked or unknown critical gate. Verify health, readiness, SLOs, queues,
workers, and evidence after every batch; close the rollout only after the observation
window succeeds.

### Canary rollout

Begin with the smallest policy-defined canary, preserve existing routing and authority
epochs, and observe for the complete configured window. Compare errors, latency, queue
age, worker leases, and business-safe synthetic checks with the approved baseline.
Pause before expansion if a threshold regresses or required evidence becomes stale.

### Rollout pause

Stop new expansion and scheduling for the affected scope, retain leases and accepted
work under their original routing, and record the gate, incident, request, and trace
references. Diagnose from redacted evidence. Resume only after the blocking finding is
resolved and approvals and compatibility evidence remain current.

## Health, readiness, shutdown, queue, and scheduler safety

Liveness checks process responsiveness and fatal state only; temporary Gemini failure,
permitted cache fallback, projection delay, and non-critical degradation do not cause
restart loops. Readiness requires configuration, database, migration/index, protocol/
routing, region, writer authority, worker registration where applicable, redaction,
and non-draining/non-isolated state. Public responses expose minimum safe metadata;
detailed release health is authorized.

Shutdown marks draining, stops admission/claims/scheduling/external invocation, drains
bounded active work, continues valid heartbeats, checkpoints resumable work, releases
claims safely, flushes bounded telemetry, closes cache/database, marks stopped, and
exits. Accepted work is not silently abandoned and drain timeout fences stale workers.
An entire worker pool is not drained together without explicit approval.

Rollout preserves jobs, idempotency, partition/regional ownership, routing, fencing,
cancellation, quota reservations, delegation accounting, compensation, and dead-letter
state. Jobs retain accepted routing. One fenced scheduler authority operates per scope;
drain stops scheduling first and missed schedules use existing recovery.

## Rollback, roll-forward, regions, and release gates

Rollback is validated before start. It stops expansion, freezes incompatible writes,
drains new workers, restores compatible code, preserves authority/queue epochs,
invalidates incompatible cache namespaces, selects/rebuilds projections, runs manual
safe smoke tests, verifies queue/worker/SLO recovery, and updates the incident. It does
not undo completed external business effects; orchestration compensation handles those.
Rollback cannot reduce epochs, restore revoked credentials/cancelled state, bypass
residency, or corrupt data. Unsafe rollback requires an explicit approved roll-forward
plan, risk, compatibility, smoke plan, incident, and evidence.

Regional order supports standby/read-secondary/non-authoritative first, active primary
last, and per-region canary. Each stage checks authority epoch, queue ownership, worker
eligibility, capacity, residency, replication, failover, and rollback readiness.
Deployment never transfers write authority automatically.

DR requires an active policy, known backup freshness/integrity, isolated restore
verification, failover/failback, RPO/RTO, target capacity, healthy authority,
split-brain controls, ownership, and runbooks. Unknown is not healthy.

Performance/capacity reuse compatible Phase 13E4 budgets, baselines, runs, regressions,
models/plans, headroom, workers, database/cache pressure, and failover capacity.
Laptop evidence never represents production. Critical SLO/alerts cover queue age,
stuck runs, worker leases, Runtime Gateway/provider, database/cache, regions, RPO/RTO,
backup verification, and release failure without exposing destinations.

### Rollback and roll-forward

Stop expansion first. Use rollback only when schema, protocol, cache, projection, and
worker compatibility remain safe; drain new workers, restore the compatible version,
invalidate incompatible cache namespaces, rebuild projections when required, and
verify queues and SLOs. When rollback is unsafe, keep the rollout paused and execute
the approved roll-forward plan. Never reduce authority epochs or repeat external
business effects.

### Database migrations

Use expand-and-contract changes with bounded batches and durable checkpoints. Validate
old/new readers and writers before execution, monitor replication and database
pressure, and pause at a safe checkpoint on regression. Resume idempotently from the
recorded checkpoint. Destructive contract steps require compatibility evidence and
the separate approved operational window.

## Ownership, runbooks, manual gates, and smoke tests

Ownership stores versioned safe internal owner/escalation/runbook references without
private contact details. The code registry covers normal/canary/pause/rollback/
roll-forward, migration failure, queue backlog, worker fencing, cache/database/gateway/
Gemini outage, credential rotation/leak, failover/failback, backup/restore, SLO/
performance, stuck orchestration, compensation, and cleanup.

### Manual gates

Manual gates store key/result, safe reason, evidence reference, performer, expiry, and
approval only. A Gemini HTTP 503 is `failed_transient` or
`blocked_provider_unavailable`, never passed and never retried automatically. Release
requires a later pass, approved transient waiver, or disabled feature. Live Gemini and
external-flow verification remain manual and potentially billable.

Production smoke tests are manual, allowlisted, bounded, synthetic-tenant only,
idempotent, cleaned up, non-load-generating, and exclude Gemini unless explicitly
selected.

### Old-version decommissioning

Wait for the observation window, queue drain, mixed-version inventory, rollback
decision, and evidence package to complete. Confirm no jobs, workers, routes, cache
namespaces, or projections still depend on the old version. Archive the candidate and
remove compatibility paths only in a separately reviewed change; retain immutable
audit and release evidence.

## Evidence, waivers, freeze, support, drift, and observation

Evidence packages deterministically link manifest, provenance, artifacts,
compatibility, migration, rollout, tests, security, dependencies, performance,
capacity, DR, SLO, alerts, runbooks, approvals, risks, manual gates, and waivers.
Approved evidence is immutable and contains no raw payloads or secret material.

Waivers require bounded reason, risk, mitigation, expiry, approver, approval, scope, and
incident/change link. They cannot bypass tenant isolation, authentication, encryption,
stale-writer fencing, split-brain prevention, residency, known credential exposure, or
turn failure into pass. Freeze states are `open`, `restricted`, `frozen`, and
`emergency_only`; emergency override is approved, while incident recovery stays open.

Support bundles are tenant/RBAC/policy/audit governed and include versions and safe
health/queue/worker/region/SLO/alert/failure-code categories plus variable names and
bounded request/trace references. They exclude secrets, headers, cookies, prompts,
outputs, customer data, and decrypted material.

Drift compares expected to safe deployed metadata only: application/protocol/schema/
migration/routing/cache/projection/worker/region/flag mismatches, missing required
variable names, forbidden names, unknown/stale versions. Secret values are not compared.

Observation windows record categorical success/failure/timeout/overload, queue,
workers/leases, database/cache/projections, gateway/provider, recovery/compensation,
regions, SLOs, alerts, and incidents without payloads. Old versions decommission only
after observation succeeds, no old process remains, historical routing is no longer
needed, compatibility windows close, rollback decision is documented, approval is
consumed, and evidence is preserved.

## APIs, RBAC, policy, audit, metrics, and verification

Routes live under `/api/v1/releases`, with `/api/releases` as an explicit compatible
surface. Reads are authenticated, tenant/workspace scoped, sorted, bounded, and safely
projected. Mutations require idempotency and service authorization; high-impact actions
also use operational state, policy, confirmation/reason, approvals, and audit.
Normal users do not receive release approval, execution, migration, rollback/
roll-forward, waiver approval, freeze override, kill-switch, support-export, or
detailed-drift permissions.

Audits contain safe IDs/versions/source/target/strategy/migration/gate/risk/reason,
actor, request/trace, and time only. Metrics use bounded categories and never tenant,
candidate, rollout, migration, instance, worker, request, trace, user, hostname, or URL
labels.

Run the deterministic verifier with:

`npm run verify:release-readiness`

Full release validation also runs `npm test`, the frontend build, and every earlier
non-billed phase verifier required by the specification. Do not automatically run
`verify:gemini-agent`, `verify:external-flow`, any load/stress/soak/regional/staging
performance command, migration, deployment, tag, failover, or restore command.

Known limitations: provider deployment/inspection and production smoke tests remain
manual; live provider gates may be billable; local tests do not prove production
capacity or data correctness; the normal scanner does not inspect Git history;
readiness is only as current as its source evidence; and waivers cannot bypass core
security or correctness.
