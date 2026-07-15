# Phase 13B4 durable execution and restart recovery

Phase 13B4 makes MongoDB the authoritative coordination layer for Gateway execution. It adds a
persisted `RuntimeWorkItem`, a dedicated worker process, ownership-fenced leases, restart-safe retry
scheduling, abandonment classification, a small durable event outbox, and worker heartbeats. Agent
Passport, install-key, delegated-credential, circuit-breaker, and provider configuration contracts
are unchanged.

## Process responsibilities

The API process still validates the caller, resolves the connection and capability, reserves or
reuses the Invocation, and preserves the existing synchronous invocation response where the current
contract requires it. Before inline runtime execution it persists and atomically claims a WorkItem.
The API process is therefore an eligible short-lived queue owner, but its in-memory controller and
heartbeat timer are accelerators rather than the source of truth.

The dedicated worker connects independently to MongoDB, verifies the coordination indexes, writes a
safe worker heartbeat, polls a bounded batch, and claims due work atomically. Before execution it
reloads the Invocation and runs the normal Runtime Gateway path, including authorization/policy,
connection health, circuit, rate-limit, capacity, credential, and cancellation checks. It renews the
WorkItem lease plus Invocation, Attempt, and capacity ownership while work is active.

Run the API and worker as separate processes in production. API readiness and worker availability are
separate signals: the API can be alive while no worker is available, and a worker heartbeat never
makes a Gemini or external-runtime request.

Every API and worker replica must use the same MongoDB database, `CREDENTIAL_ENCRYPTION_KEY`, and
compatible reliability configuration. The encryption key must remain stable across instances and
redeploys. A worker with a different or rotated-without-migration key cannot decrypt the protected
Invocation replay input; execution must fail or enter safe recovery rather than inventing an input or
falling back to a redacted display summary.

## Persisted records and lifecycle

`RuntimeWorkItem` contains tenant and object references, safe lifecycle timestamps, execution
generation and attempt counters, a hashed dedupe identity, safe milestone/reason codes, and lease
coordination fields. It does not duplicate the task payload. The protected replay input remains an
encrypted, `select: false` field on the referenced Invocation.

The principal WorkItem transitions are:

| From                          | To                                   | Cause                                                                  |
| ----------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| `pending` / `retry_scheduled` | `claimed`                            | One due atomic claim acquires a lease.                                 |
| `claimed`                     | `running`                            | The current owner begins execution after a cancellation check.         |
| `running`                     | `retry_preparing`                    | An approved retry acquires a private preparation fence.                |
| `retry_preparing`             | `retry_scheduled` / recovery state   | Invocation and Work attempts align before the fence is released.       |
| `pending` / `retry_scheduled` | `cancelled`                          | Persisted cancellation wins before claim.                              |
| `claimed` / `running`         | `cancellation_requested`             | Cancellation is persisted for the owner to observe and abort locally.  |
| owned work                    | `completed` / `failed` / `cancelled` | The current owner passes the lease and finalization predicates.        |
| abandoned or owned work       | `recovery_required`                  | Transmission or result persistence makes the remote outcome uncertain. |
| repeatedly safe-failing work  | `dead_lettered`                      | A bounded safe-attempt limit is exhausted.                             |

Terminal WorkItems and Invocation/Attempt history are retained. Dead-lettering never copies a raw
request or response into a second queue.

## Dedupe and atomic claims

The deterministic WorkItem identity hashes Partner, receiving workspace, connection, Invocation,
execution generation, and work type. Unique indexes cover that hash and the corresponding logical
identity, so concurrent enqueue or reconciliation returns the existing WorkItem instead of creating a
second execution generation. Raw client idempotency keys are not stored in the queue.

A claim is one conditional `findOneAndUpdate`. Eligible rows must be `pending` or
`retry_scheduled`, have `availableAt <= now`, have no live lease, have no persisted cancellation, and
remain within their attempt limit. Ordering is priority descending, then availability, creation time,
and ID ascending. The winning update assigns an opaque worker/API owner, stores only a hash of a fresh
lease token, records `work_claimed`, and increments the WorkItem version.

The raw lease token exists only in the owning process. Every heartbeat, milestone, retry schedule, and
finalization compares WorkItem ID, owner, token hash, active status, and unexpired lease. Relevant
Invocation, Attempt, and capacity updates also compare their current execution ownership. A stale
process cannot overwrite a replacement owner's result.

## Leases, heartbeats, and database loss

`DURABLE_WORK_HEARTBEAT_MS` must be at most one third of `DURABLE_WORK_LEASE_MS`; the lease must exceed
the maximum normal Gateway invocation deadline. A worker heartbeat extends the WorkItem lease and,
after runtime ownership is created, renews the matching Invocation, Attempt, and capacity leases.
Stopped and stale worker-heartbeat records expire through a 24-hour MongoDB TTL index; health
aggregation detects staleness on the shorter operational threshold and does not count stopped rows as
active workers.

MongoDB disconnection is fail-closed for workers. The worker stops claiming and aborts its local
execution signal when it cannot prove ownership. It does not finalize success from memory. A later
abandonment scan decides whether replay is safe from persisted evidence. Process-local
`AbortController` entries remain useful for immediate cancellation, but losing that map on restart
does not erase the durable cancellation or lease state.

## Transmission evidence and abandonment

WorkItems store only the milestone name, timestamp, attempt number, and `completed`/`failed` status:

1. `work_claimed`
2. `validation_completed`
3. `credentials_loaded`
4. `outbound_transmission_started`
5. `outbound_response_received`
6. `response_validated`
7. `finalization_started`
8. `invocation_persisted`

`outbound_transmission_started` is persisted before, or as close as safely possible before, transport
send. An expired lease is classified with a version-checked update:

- Before transmission, eligible work returns to `pending` with a future `availableAt`; cancellation
  or attempt exhaustion can instead cancel or dead-letter it.
- After transmission and before a confirmed persisted outcome, work becomes `recovery_required` and
  is not automatically replayed.
- After a response or during finalization, an unproven persisted outcome also becomes
  `recovery_required`; a trusted already-terminal Invocation can be reconciled without re-sending.

Two scanners can inspect the same expired record, but only one version/status/lease compare-and-set
wins. There is still an unavoidable narrow window between persisting the transmission marker and the
remote system accepting the request. Conversely, a process can fail immediately before the marker is
written. Without a remote idempotency acknowledgement and trusted status lookup, Ghost Bridge cannot
prove exactly-once remote execution and does not claim it.

## Durable retries and dead letters

Retry delay is persisted as `status: retry_scheduled` and `availableAt`; it is not a process timer.
The worker cannot claim it early, and a restart does not lose it. The Phase 13B1 retry-policy decision
remains authoritative. Retry requires a proven safe operation, respects client/remote idempotency
evidence, maximum attempts, cancellation, circuits, rate limits, connection health, and capacity, and
never replays an ambiguous remote outcome.

`retry_preparing` is an internal, non-claimable ownership-fenced state. After policy approval, a fresh
preparer lease updates the Work attempt and the referenced Invocation's retry state/generation as one
controlled sequence; only then does it publish `retry_scheduled` and release the preparation lease.
If that process dies, the abandoned-work scan resumes the same fenced preparation when the persisted
evidence is still safe, or terminalizes it as failed/recovery-required. Another worker cannot claim
half-prepared work.

Authentication, authorization, policy, schema, credential, source-verification, unsafe-URL, and
unknown-outcome failures are not converted into automatic retries. Repeated safe pre-transmission
failure reaches `dead_lettered`; the Invocation and Attempt history remain intact. The only requeue
control accepts an eligible pre-transmission dead letter, checks its tenant, state, version, and one-
requeue limit, and is audited. There is no arbitrary replay or force-success control.

## Cancellation and shutdown

Cancellation updates MongoDB first. Pending and scheduled work becomes cancelled and is excluded from
claims. Claimed/running work becomes `cancellation_requested`; the local owner observes it at a stage
boundary or heartbeat and aborts its local controller. After a restart, a new process reads the same
persisted state before executing. Remote cancellation certainty still follows Phase 13B3: an
ambiguous transmitted cancellation remains `recovery_required`.

On worker shutdown, readiness and claim admission turn off first. The worker continues heartbeating
active leases while it drains for `DURABLE_WORK_SHUTDOWN_DRAIN_MS`. At the deadline it aborts safe
local work, leaves transmitted ambiguity for recovery classification, records a stopped heartbeat
when possible, closes MongoDB, and exits deterministically. It never releases a live outbound lease
early merely to accelerate shutdown.

## Creation consistency and the outbox

Production creation currently uses deterministic compensation; it does not call the available
`withDurableTransaction` helper. Invocation reservation, initially fenced WorkItem insertion, and the
Invocation-to-Work link are separate conditional writes. A crash can therefore leave a temporary
partial state. Deterministic generation-scoped identities plus bounded abandoned/missing-work scans
claim, link, release, or safely terminalize that state. Reconciliation skips terminal, cancelled, and
ambiguous Invocations and never links a WorkItem owned by another reconciler. The transaction helper is
unit-tested for future transaction-capable call sites but must not be described as active creation
atomicity.

`DurableEventOutbox` stores a unique event hash, tenant/object references, trace ID, allowlisted event
type, and small safe metadata. It covers acceptance, enqueue/claim, retry, abandonment, recovery,
dead-letter, requeue, and Work completion/failure signals. A Work mutation retries its outbox insert
twice; if both writes fail, the authoritative WorkItem retains a bounded allowlisted repair event plus
repair-required timestamp/reason rather than failing the already-persisted lifecycle transition or
claiming event delivery. Bounded worker maintenance merges those records with events inferred from
recent authoritative Work state, retries idempotent unique outbox inserts, clears repaired markers,
and retains failed records for a later pass. It is an internal durability and audit aid, not a general
event platform or external broker.

## Operations, controls, and alerts

The Operations page adds queue counts, `dueExecutableCount`, abandoned leases,
recovery/dead-letter counts, worker health, oldest due-work age, average queue wait, and a compact
tenant-scoped WorkItem table. `dueExecutableCount` includes only uncancelled `pending` or
`retry_scheduled` rows whose `availableAt` is due. Future scheduled retries do not trigger the
no-healthy-worker alert. Authenticated Partner operations use exact Partner + receiving workspace/user
connection ownership. Public views never expose lease owner/token/hash, dedupe hashes, task content,
or runtime endpoints.

The narrow administrative endpoints are:

```text
GET  /api/v1/operations/work-items
GET  /api/v1/operations/work-items/metrics
GET  /api/v1/operations/workers
POST /api/v1/operations/work-items/abandoned/scan
POST /api/v1/operations/work-items/reconcile
POST /api/v1/operations/work-items/:id/requeue
```

Every mutation is authenticated, workspace-authorized, bounded, audited, and protected by state and
version predicates. The controls cannot edit payloads, replay an unknown remote outcome, force
success, or clear history.

Durable signals reuse the existing Partner/workspace alert dedupe. Critical conditions include due,
uncancelled executable work without a healthy worker, elevated abandoned leases, repeated
remote-execution lease loss, a dead-letter backlog, and finalization consistency failures. Warnings
cover old due work, stale worker heartbeats, retry backlog, repeated compensation, and sustained
capacity saturation. Information signals cover worker availability/draining, safe pre-transmission
recovery, and completed scheduled retries. Alert evaluation remains tied to Operations summary
evaluation rather than a new external monitoring service.

## Security and data minimization

The WorkItem, outbox, heartbeat, API serializers, metrics, alerts, and logs use explicit allowlists.
They do not contain API/install/Partner keys, bearer tokens, Authorization or cookie headers,
credentials or encrypted credential payloads, prompts, task inputs/outputs, provider content, source
URLs, complete runtime endpoints, stack traces, host secrets, or database connection strings. Queue
records reference the Invocation instead of copying its protected input. Worker IDs are random opaque
UUIDs and contain no hostname or environment value.

Lease-token and dedupe hashes are coordination fields selected privately and are omitted from
operations responses. Safe error output contains an allowlisted application code/name and safe IDs or
reason codes only.

## Configuration

Defaults are documented in `Backend/.env.example`:

| Variable                                  |  Default |
| ----------------------------------------- | -------: |
| `DURABLE_WORKER_ENABLED`                  |   `true` |
| `DURABLE_WORKER_POLL_INTERVAL_MS`         |   `1000` |
| `DURABLE_WORKER_BATCH_SIZE`               |      `5` |
| `DURABLE_WORKER_CONCURRENCY`              |      `3` |
| `DURABLE_WORK_LEASE_MS`                   | `360000` |
| `DURABLE_WORK_HEARTBEAT_MS`               |  `30000` |
| `DURABLE_WORK_ABANDONED_GRACE_MS`         |  `60000` |
| `DURABLE_WORK_MAX_ATTEMPTS`               |      `2` |
| `DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS` |      `3` |
| `DURABLE_WORK_SHUTDOWN_DRAIN_MS`          |  `30000` |

All values are startup-validated and bounded. Batch size must cover configured concurrency,
heartbeat must be comfortably shorter than the lease, the lease must exceed the runtime deadline,
and the dead-letter threshold must not be below the safe-attempt limit.

Production disables automatic Mongoose index creation, so both API and worker startup explicitly run
the Phase 13B4 `createIndexes` checks for WorkItems, outbox events, and worker heartbeats before they
declare durable coordination ready. Startup fails closed if those indexes cannot be established. API
and worker deployments must point at the same MongoDB database; splitting them across databases would
split ownership and cancellation state and is unsupported.

## Local development and verification

With `Backend/.env` configured for a reachable MongoDB, run these in separate terminals:

```powershell
npm run dev --workspace backend
npm run dev:worker
npm run dev --workspace frontend
npm run dev --workspace external-agent
```

The production-style worker entry point is `npm run worker`. The non-billed durability verifier uses
uniquely scoped, linked encrypted Invocation/WorkItem/outbox fixtures, simulates reconnects and
competing owners, executes one claimed item through an injected deterministic worker runtime, blocks
unexpected `fetch`, and cleans only its own records:

```powershell
npm run verify:durable-recovery
```

It refuses a production database and makes no HTTP, external-agent, or Gemini request. The live
`verify:gemini-agent` and `verify:external-flow` gates remain manual because they can bill the provider.

## Current limitations

- MongoDB polling adds bounded latency and database load; there is no Redis, broker push delivery,
  cross-region failover, or external queue service in this phase.
- Transaction availability depends on MongoDB topology. Standalone deployments use deterministic
  compensating reconciliation, so creation is eventually repaired rather than multi-document atomic.
- Fairness is deterministic but not a complete tenant scheduler; priority and queue order do not
  provide weighted cross-tenant quotas.
- The safe outbox is persisted but is not a compliance-grade external event delivery platform.
- Remote cancellation, idempotency acknowledgement, job IDs, and status lookup require a future
  Agent Passport protocol version. Gemini currently provides no trusted job lookup for this flow.
- Ambiguous post-transmission work requires operator review. It is deliberately not auto-replayed.
- Worker/API coordination is multi-instance-safe within the configured MongoDB deployment, not a
  claim of exactly-once side effects in an external system.

Recommended Phase 13C work is a separately authenticated workspace-operator role, retention and key-
rotation policy for encrypted replay material, formal outbox delivery/reconciliation objectives,
protocol-level remote idempotency/cancellation/status evidence, and deployment hardening for MongoDB
availability and regional disaster recovery.
