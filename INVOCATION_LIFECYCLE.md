# Invocation lifecycle, cancellation, and recovery safety

Phase 13B3 extends the deterministic Phase 13B1 lifecycle and Phase 13B2 runtime protections with
cooperative cancellation, bounded stuck-work evaluation, and operator-controlled recovery. It does
not add a durable queue, background worker, or blind external replay. `Invocation.lifecycleState`
remains authoritative. The older `Invocation.status` remains a compatibility projection
(`succeeded` is returned as `completed`) so the successful invocation contract does not change.

## States and transitions

- `accepted`: the workspace-scoped idempotency reservation was created.
- `validating`: connection policy, Passport, capability, and input are being validated.
- `authorized`: validation and policy checks passed; no runtime call has started.
- `running`: one process owns the execution lease and is preparing the call.
- `waiting_for_runtime`: an attempt exists and the external call has been transmitted.
- `succeeded`: the response passed the output schema and was persisted.
- `failed`: a deterministic non-timeout failure was persisted.
- `timed_out`: the runtime returned a deterministic timeout outcome.
- `cancelled`: cancellation was confirmed before ambiguous remote execution, or an operator later
  resolved a recovery-required invocation as cancelled.
- `recovery_required`: the remote outcome, cancellation result, or local finalization is ambiguous;
  automatic execution is forbidden.

There is no `queued` lifecycle state because there is no durable queue.

```text
accepted -> validating | cancelled
validating -> authorized | failed | cancelled
authorized -> running | failed | cancelled
running -> waiting_for_runtime | failed | timed_out | recovery_required | cancelled
waiting_for_runtime -> succeeded | failed | timed_out | recovery_required | cancelled
recovery_required -> running | failed | cancelled   (authorized recovery only)
```

`succeeded`, `failed`, `cancelled`, and `timed_out` are immutable terminal states. Every transition is
an expected-state, workspace-scoped atomic update with a timestamp and bounded safe history. A manual
resolution closes `recovery_required`; it does not rewrite attempt history or delete original failure
evidence.

## Cancellation model

`cancellationState` is independent from the invocation lifecycle:

| State             | Meaning                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `not_requested`   | No cancellation intent has been recorded.                                                                      |
| `requested`       | An allowlisted request has been accepted for evaluation.                                                       |
| `aborting`        | The owning process was asked to abort cooperatively.                                                           |
| `confirmed`       | Local cancellation was proven before remote transmission, or an operator supplied an allowed later resolution. |
| `rejected`        | The invocation was terminal, unauthorized, missing, or no longer eligible.                                     |
| `outcome_unknown` | A request may already have reached the runtime and remote termination cannot be proved.                        |

Cancellation before transmission atomically enters `cancelled`, with `local_confirmed` outcome.
Cancellation after `outbound_request_started`, or while `waiting_for_runtime`, requests a local
`AbortController` abort but immediately enters `recovery_required` with `remote_unconfirmed` outcome.
Closing an HTTP connection is never treated as proof that a remote, billable, or side-effecting
operation stopped. A cancellation request against an existing `recovery_required` invocation records
intent and preserves the historical ambiguous outcome. Repeated requests return the existing
confirmed or outcome-unknown state. Terminal invocations return a conflict and are not rewritten.

The public cancel endpoint accepts only `USER_REQUESTED` (or defaults to it). Internal lifecycle paths
use the bounded model allowlist for client disconnect, service shutdown, execution timeout, stuck work,
remote outcome uncertainty, and operator-confirmed cancellation. Free-form reasons are not persisted.

The control endpoint is:

```text
POST /api/v1/invocations/:id/cancel
```

The body contains `receivingWorkspaceId`, `receivingUserId`, and an optional allowlisted `reasonCode`.
A confirmed or idempotent request returns HTTP 200. An unconfirmed transmitted cancellation returns
HTTP 202. Terminal-state conflicts return HTTP 409.

## Control authorization and tenant isolation

Invocation list/detail/attempt reads, cancellation, retry, resolution, recovery-queue reads, and
scans require a valid `X-Partner-Api-Key`. An invocation control must resolve through one connection
owned by that exact partner, `receivingWorkspaceId`, and `receivingUserId`; recovery queue/scan access
covers all of that partner's connections in the selected workspace. Identity values do not grant
authority by themselves. Missing or invalid partner authentication returns 401; missing,
cross-partner, cross-workspace, cross-user, and mismatched-connection records are not exposed.

The Partner API key is the current operator principal. There is not yet a separately authenticated
workspace-user or workspace-admin role, so a partner operator can act across that partner's
connections in a workspace. The application does not invent a client-supplied admin header or
platform-admin role. A future session principal can enforce creator/operator roles and supply tenant
identity server-side without weakening these query boundaries.

## Active execution registry

Each Gateway process maintains a non-durable map from `invocationId` to one `AbortController` and safe
execution metadata: workspace, connection, execution owner, execution lease, and whether transmission
started. It never stores credentials, headers, endpoint URLs, provider bodies, or task data.
Registration is duplicate-safe, cleanup runs in `finally`, and cancellation must match the persisted
execution ownership before the controller is aborted. Repeated cancellation is idempotent.

The registry only controls work in the current process. MongoDB remains authoritative, and a restart
or another replica cannot recover an in-memory controller. This limitation is why ambiguous work is
persisted as `recovery_required` instead of being reported as successfully cancelled.

## Remote-control capability

`PassportConnection.runtimeControl` is internal-only metadata until a future Agent Passport protocol
version can declare and authenticate cancellation and idempotency capabilities. Its bounded fields
are:

- `cancellationMode`: `unsupported`, `request_abort`, or `protocol_cancel`;
- `remoteIdempotencySupported`;
- `statusLookupSupported`.

The default is unsupported. Aborting the Gateway's REST request is cooperative local control, not
remote confirmation. `protocol_cancel` and status lookup are not invented for runtimes that do not
provide a trusted cancel endpoint or job identifier. The Gemini research runtime exposes neither a
durable job ID nor a non-billed status lookup, so the Gateway performs no Gemini request to determine
cancellation status.

## Attempts, ownership, and progress

`InvocationAttempt` is created immediately before an adapter call. Attempt numbers are unique per
invocation. It stores only safe timing, correlation, stage, HTTP status, error classification,
ambiguity, and retry-decision fields. It does not store keys, headers, credentials, runtime bodies,
stacks, research output, or sources.

Execution uses an atomic `authorized -> running` claim with `executionLeaseId`,
`executionLeaseExpiresAt`, and `executionOwner`. A second claimant is rejected. Phase 13B3 records
bounded progress only at meaningful boundaries:

```text
accepted
validation_started
authorized
execution_claimed
request_mapped
outbound_request_started
remote_response_received
response_validation_started
finalization_started
terminalized
```

Each update contains only `lastProgressAt` and `lastProgressStage` plus safe correlation data. There
is no continuous MongoDB heartbeat. `runtimeDeadlineAt` is established from
`RUNTIME_INVOCATION_TIMEOUT_MS` immediately before outbound transmission, so a legitimate long-running runtime is
not compared with an unrelated short generic timeout.

## Deterministic stuck-work classification

One classifier evaluates lifecycle state, last progress, execution lease, runtime deadline, persisted
shutdown evidence, and terminalization:

| Classification             | Evidence and action                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `not_stuck`                | Terminal/recovery work, or active work still inside its configured deadline. No mutation.                                                                      |
| `stale_before_runtime`     | No transmission boundary was crossed and progress exceeded the stuck grace. `accepted` may be cancelled; other pre-transmission states fail deterministically. |
| `external_runtime_overdue` | `waiting_for_runtime` exceeded `runtimeDeadlineAt` plus grace. Mark `recovery_required`.                                                                       |
| `lease_expired`            | Execution ownership expired. The scan conservatively requires recovery, preserves transmission evidence, and releases expired matching capacity slots.         |
| `finalization_stalled`     | A response was received or validation/finalization began, but bounded finalization grace expired. Mark `recovery_required`.                                    |
| `shutdown_interrupted`     | An otherwise-active record carries persisted shutdown evidence. Mark `recovery_required`.                                                                      |

`outcome_ambiguous` is a durable recovery/control label, not a direct result of the time-based stuck
classifier. Cancellation after transmission, an interrupted recovery claim, or an ambiguous retry
child can assign it while preserving operator review. Likewise, the normal shutdown path transitions
transmitted work directly to `recovery_required`; the classifier's `shutdown_interrupted` result is a
fallback for an active record that still carries persisted shutdown evidence. The scanner does not
reinterpret an already-terminal or already-`recovery_required` invocation.

The authenticated scan endpoint is:

```text
POST /api/v1/operations/recovery/scan
```

It evaluates only connections belonging to the authenticated partner and selected workspace, uses
indexed active-state queries, and applies conditional atomic updates using the observed lifecycle and
progress timestamp. A positive request `limit` is clamped to the smallest of the requested value,
`INVOCATION_STUCK_SCAN_LIMIT`, and 100; it is not rejected merely for being above the configured or
absolute maximum. Repeating a scan is idempotent and never executes runtime work. There is no
background cron or durable scanner.

```dotenv
INVOCATION_STUCK_SCAN_LIMIT=100
INVOCATION_STUCK_GRACE_MS=60000
INVOCATION_FINALIZATION_GRACE_MS=30000
```

The configured scan limit is validated from 1 through 100 at startup. A request limit must be a
positive integer and is then clamped as described above. Both grace values are validated from 1,000
through 3,600,000 milliseconds.

## Recovery decisions and manual actions

The authoritative policy can record `retry_allowed`, `retry_denied`,
`resolve_as_failed_allowed`, `resolve_as_cancelled_allowed`, `mark_succeeded_allowed`, or
`operator_review_required`, always with a safe reason code. The current API intentionally exposes no
force-success action: `mark_succeeded_allowed` is not granted without independently verified runtime
evidence, and no supported runtime currently supplies that evidence.

Safe pre-transmission recovery can return `retry_allowed / NO_REMOTE_TRANSMISSION`. A transmitted or
outcome-unknown invocation returns `retry_denied / REMOTE_OUTCOME_UNKNOWN` unless the internal runtime
metadata explicitly confirms remote idempotency and the original invocation had client-provided
idempotency. Authentication, authorization, policy, schema, credential, encryption, capability, and
unsafe-URL failures are never manually retried. Open or half-open circuits, disconnected or unhealthy
connections, an already claimed recovery, and any state other than `recovery_required` also deny a
manual retry.

```text
POST /api/v1/invocations/:id/retry
POST /api/v1/invocations/:id/resolve
GET  /api/v1/operations/recovery?page=1&limit=25
```

A retry requires the displayed non-negative `version` and uses a unique optimistic recovery claim so
simultaneous operators cannot create two recovery executions. The child invocation is durably linked
to that exact claim before attempt creation or outbound I/O; each new claim first clears any stale
prior child link, and late completion from an expired claim cannot resolve a newer claim. A bounded
scan keeps an expired claim exclusive while its linked child is active and resolves the parent from a
persisted successful child. If no child exists, it restores the original recovery evidence. A proven
pre-transmission terminal child is linked without manufacturing remote ambiguity; transient protection
failures can become retry-eligible again when policy permits, while non-retryable failure classes stay
denied. Only a transmitted or recovery-required terminal child is sent back to operator review as
outcome-ambiguous. The normal Runtime Gateway path then re-evaluates connection ownership,
authorization, policy, circuit state, rate limiting, and workspace/connection capacity before creating
a linked child invocation. The original invocation remains linked to the child, while its attempt
history and original safe failure evidence are not deleted or rewritten.

Manual resolution accepts only `failed` or `cancelled`, only for `recovery_required`, and only with an
allowlisted reason: `OPERATOR_CONFIRMED_REMOTE_FAILURE` or `OPERATOR_CONFIRMED_CANCELLED`. The required
non-negative `version` participates in an atomic `__v` predicate. A conflict means
another action won; it does not overwrite that action.

## Idempotency and provider retry policy

`POST /api/v1/connections/:id/invoke` accepts `Idempotency-Key`.

- Only an HMAC-SHA-256 digest is stored and sent as the stable downstream correlation key.
- The unique key is `(receivingWorkspaceId, operation scope, idempotencyKeyHash)`.
- The request fingerprint is an HMAC of canonical connection, capability, and input data.
- Same key plus the same normalized request returns the existing result or current status.
- Same key plus a different request returns `IDEMPOTENCY_CONFLICT`.
- Concurrent duplicates race on the unique index, so only the reservation winner executes.
- Without a client key, a random internal identifier is generated; it does not prove replay safety.

Grounded Gemini research and Google Search have exactly one provider attempt. Formatting retry uses
only the already obtained in-memory grounded text, never adds Search, and is controlled by
`GEMINI_FORMATTING_MAX_ATTEMPTS=1|2`. Cancellation is checked before every provider stage and retry.
Authentication, source extraction, blocked output, and structured-output validation are not retried.
Exhausted transient formatting returns `FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH`; the Gateway records
`recovery_required` and never blindly repeats grounded research.

## Circuit, capacity, and audit integration

Cancellation is not a circuit failure and does not make a healthy connection unhealthy. Capacity is
released when the owned execution exits. Stuck evaluation releases only matching expired ownership
and capacity; it does not open or close a circuit without runtime evidence. Manual retry passes through
the full Phase 13B2 circuit, rate-limit, connection-health, and capacity checks.

Safe audit events cover cancellation request/confirmation/rejection/outcome-unknown, progress,
stuck detection/resolution, recovery eligibility, retry request/allow/deny, and resolution. They contain tenant
and invocation correlation, safe states, reason codes, actor identity, timestamps, and attempt number
only. Control APIs and recovery views never return controllers, leases, idempotency digests, task
content, credentials, remote bodies, or stack traces.

The invocation document is the authoritative control record: lifecycle/cancellation/recovery fields,
bounded `stateHistory`, reason codes, actor/requested-by fields, and timestamps are updated with the
control transition. The separate `AuditLog` sink is best-effort and is not transactionally coupled to
that compare-and-set update; an audit write can be missing even when the authoritative state change
succeeded. Compliance-grade complete delivery requires a transactional outbox plus reconciliation in
Phase 13B4.

## Verification boundary and future work

Phase 13B3 non-billed validation uses the ordinary unit/integration suites, frontend build, demo
verification, and sandbox verification. The following remain explicit manual gates because they can
invoke a billed provider:

```text
npm run verify:gemini-agent
npm run verify:external-flow
```

Known production-hardening work remains:

- replace the process-local controller map with a durable worker/queue and cross-replica control
  protocol before claiming restart-safe cancellation;
- replace the inherited redacted `Invocation.inputSummary` replay source with an explicitly designed
  encrypted/ephemeral replay handle, or require caller resubmission verified against the request
  fingerprint. Manual retry currently uses that redacted summary only when fingerprint recomputation
  proves it is identical; Phase 13B3 adds no new raw task-payload store, but redaction is not a durable
  payload-retention design;
- deliver control audit events through a transactional outbox and reconcile any best-effort
  `AuditLog` gaps;
- introduce a separately authenticated receiving-workspace operator/admin principal if role
  separation is required; today the Partner key is the only trusted operator principal;
- add a future Agent Passport version for authenticated cancellation, idempotency acknowledgement,
  remote job IDs, and status lookup;
- add durable scheduled scanning if operator-triggered bounded scans are insufficient;
- never add arbitrary force-success or automatic replay of outcome-unknown work.
