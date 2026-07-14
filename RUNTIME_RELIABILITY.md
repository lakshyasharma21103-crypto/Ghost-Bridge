# Phase 13B2 runtime reliability

Phase 13B2 contains failures at the narrowest practical runtime boundary while preserving the Phase
13B1 invocation state machine, attempt, idempotency, ownership, and retry contracts. Agent Passport
documents, install keys, delegated credentials, and Gemini request configuration are unchanged.

## Circuit breaker

A persistent `CircuitBreaker` is scoped by receiving workspace, connection, runtime type, a SHA-256
runtime endpoint identity, and the shared `runtime` capability scope. Raw endpoints, credentials,
prompts, inputs, outputs, response bodies, provider errors, headers, and source URLs are never stored.
The unique scope prevents one tenant or connection from opening another connection's circuit.

The state machine is:

- `closed`: invocations are admitted. Eligible failures within the configured window increment the
  version-checked counters. A success clears the failure window and passive rate-limit protection.
- `open`: invocations fail before capacity, execution ownership, attempt creation, or outbound I/O
  with `CIRCUIT_OPEN` and a bounded `retryAfterMs`.
- `half_open`: after `openUntil`, an atomic compare-and-set claims a limited probe. The default is one
  concurrent probe. A successful probe closes the circuit after the configured success count; a
  failed eligible probe immediately reopens it.

`classifyCircuitFailure(errorMetadata)` is authoritative. Network/DNS/connect failures, safeFetch
timeouts, HTTP 502/503/504, declared runtime unavailability/readiness failures, and clearly
runtime-originated malformed output count with weight 1. Input/schema errors, authorization and
policy denials, install-key errors, local credential/configuration errors, unsupported capabilities,
idempotency conflicts, cancellation/shutdown, and unsafe URL policy rejections do not count.

HTTP 429 is separate. A safe `Retry-After` delta/date is bounded to one hour and persisted as
`rateLimitedUntil`; absent metadata falls back to the circuit open duration. Calls fail with
`RATE_LIMIT_PROTECTED` until expiry. A 429 does not increment runtime-unavailable counters and does
not enable an automatic billable retry.

Configuration defaults are documented in `Backend/.env.example`:

- failure threshold: 5 failures in 60 seconds
- open duration: 30 seconds
- half-open maximum: 1 concurrent probe
- close threshold: 1 successful probe

All values are positive and bounded at startup. The workspace capacity limit must be at least the
connection limit.

## Connection health

`PassportConnection.healthStatus` is distinct from connection installation/authentication status and
uses `unknown`, `healthy`, `degraded`, `unhealthy`, or `disabled`. Timestamps, an allowlisted reason,
and a consecutive eligible-failure count accompany transitions.

- A successful invocation or active readiness check changes an eligible connection to `healthy` and
  resets the consecutive failure count.
- The first and second consecutive eligible failures change it to `degraded`.
- The third consecutive eligible failure changes it to `unhealthy`.
- Non-circuit failures do not degrade runtime health.
- `unknown` is never presented as healthy, and `disabled` is excluded from automatic updates.

Active checks use a declared health endpoint, or a non-billable HTTP `OPTIONS` check for a REST
runtime without one. MCP requires a declared HTTP health endpoint. Active checks never call the main
agent capability or Gemini.

## Capacity bulkheads

`RuntimeCapacitySlot` implements database-backed, expiring slots at both workspace and connection
scope. Acquisition atomically claims one slot in each scope and is isolated by workspace. Defaults
are 3 concurrent invocations per connection and 20 per workspace. A denial returns
`RUNTIME_CAPACITY_EXCEEDED` before ownership claim, attempt creation, or outbound I/O.

Both slots share a random lease ID and the Phase 13B1 execution-lease expiry. Success, deterministic
failure, timeout, cancellation, and shutdown cleanup release both slots in a `finally` path. A process
crash leaves bounded leases that can be atomically reclaimed after expiry. The existing invocation
execution lease remains authoritative for ambiguity: an expired in-flight execution is marked
`recovery_required` with `EXECUTION_LEASE_EXPIRED`; capacity expiry never proves the remote task
failed.

Acquiring workspace and connection slots is intentionally not a multi-document transaction. If the
second claim fails, the first is immediately released. A process failure in that small interval can
temporarily under-utilize capacity until lease expiry, but cannot exceed either configured limit.

## Invocation order and ambiguous outcomes

The external path now performs: lifecycle validation, connection-disabled check, rate-limit/circuit
evaluation, workspace/connection capacity claim, Phase 13B1 execution ownership claim, attempt
creation, and outbound invocation. Cleanup errors are logged safely and never replace the original
invocation error.

Once transmission may have begun, timeout, shutdown abort, uncertain attempt persistence, or final
response persistence failure is not treated as a definite remote failure and is never automatically
replayed. Safe recovery reasons include:

- `SHUTDOWN_DURING_EXTERNAL_INVOCATION`
- `REMOTE_TIMEOUT_OUTCOME_AMBIGUOUS`
- `RESPONSE_PERSISTENCE_UNCERTAIN`
- `EXECUTION_LEASE_EXPIRED`

Trace, request, invocation, and attempt identifiers remain available; private task content is not
added to protection records.

## Shutdown and health endpoints

On backend `SIGTERM`/`SIGINT`, readiness changes immediately to false, new mutation work receives
`SERVICE_DRAINING`, the HTTP server stops accepting new connections, and active invocations receive up
to `SHUTDOWN_DRAIN_TIMEOUT_MS` (30 seconds by default). At the deadline, transmitted operations are
aborted through safeFetch, unresolved executions are marked `recovery_required` when MongoDB remains
available, sockets are bounded and closed, MongoDB disconnects, and the process receives a
deterministic exit code. A repeated signal forces abort/socket closure.

The external agent follows the same lifecycle. `/ready` becomes false immediately, authenticated new
research work receives 503, active Gemini operations may finish during the drain window, and the
existing abort signal interrupts provider work at the deadline. No research content is persisted for
shutdown recovery.

- Backend and external-agent `/health` are lightweight process-liveness endpoints.
- Backend `/ready` requires lifecycle readiness, valid runtime configuration, and MongoDB.
- External-agent `/ready` requires lifecycle readiness, runtime authentication, and provider
  configuration; it calls only `checkConfiguration()` and never Gemini.

## Operations, alerts, and safety

The existing Operations page adds a compact runtime-protection section for open/half-open circuits,
rate-limited connections, degraded/unhealthy health, active capacity, capacity rejections, draining,
and recovery-required invocations. No reset control was added.

Workspace alert evaluation now covers multiple/one open circuit, half-open recovery, rate-limit
protection, degraded connections, repeated capacity rejection, database/readiness failure, credential
decryption failure, and recovery-required outcomes. Alert dedupe continues to use workspace-scoped
type keys. Structured events and audits use only safe IDs, states, reason codes, counts, and durations.

Protection API errors may include only established IDs plus `retryable`, `retryAfterMs`, circuit
state, and an allowlisted reason. They do not return endpoint URLs, credentials, prompts, inputs,
outputs, raw remote messages, response headers, or sources.

## Known limitations and Phase 13B3

Without Redis, a queue, or workers, capacity is lease-based and work remains tied to an HTTP process.
There is no durable scheduling, automatic failover, cross-region coordination, manual circuit reset,
or replay of ambiguous work. Circuit state updates use optimistic version checks; a highly contended
scope can reject an update after bounded retries rather than risk a lost update.

Recommended Phase 13B3 work is a durable, tenant-fair execution queue with worker heartbeats,
transactional capacity accounting, explicit operator-reviewed recovery workflows, controlled circuit
administration with authorization/audit, and multi-region health aggregation. It should preserve the
same Agent Passport and idempotency contracts and keep billable retry policy opt-in.
