# Invocation lifecycle and retry safety

Phase 13B1 adds a deterministic execution record without introducing a queue, worker, or blind
external retry. `Invocation.lifecycleState` is authoritative. The older `Invocation.status` remains a
compatibility projection (`succeeded` is returned as `completed`) so existing clients keep their
successful response contract.

## States and transitions

- `accepted`: the workspace-scoped idempotency reservation was created.
- `validating`: connection policy, Passport, capability, and input are being validated.
- `authorized`: validation and policy checks passed; no runtime call has started.
- `running`: one process owns the execution lease and is preparing the call.
- `waiting_for_runtime`: an attempt exists and the external call is in progress.
- `succeeded`: the response passed the output schema and was persisted.
- `failed`: a deterministic non-timeout failure was persisted.
- `timed_out`: the remote service returned a deterministic timeout outcome.
- `cancelled`: reserved for a later administrative cancellation flow.
- `recovery_required`: the remote outcome or result persistence is ambiguous; automatic execution is
  forbidden.

There is no `queued` lifecycle state because 13B1 has no durable queue.

```text
accepted -> validating | cancelled
validating -> authorized | failed | cancelled
authorized -> running | failed | cancelled
running -> waiting_for_runtime | failed | timed_out | recovery_required | cancelled
waiting_for_runtime -> succeeded | failed | timed_out | recovery_required | cancelled
recovery_required -> running | failed | cancelled   (future explicit administrative recovery only)
```

`succeeded`, `failed`, `cancelled`, and `timed_out` are immutable terminal states. Every transition is
an expected-state, tenant-scoped atomic update with a timestamp and bounded safe history. History never
contains credentials, prompts, inputs, outputs, source URLs, or provider bodies.

## Attempts and execution ownership

`InvocationAttempt` is created immediately before an adapter call. Attempt numbers are unique per
invocation. It stores only safe timing, correlation, stage, HTTP status, error classification,
ambiguity, and retry-decision fields. It does not store raw keys, headers, credentials, payloads,
outputs, URLs, provider bodies, stacks, or research text.

Execution uses an atomic `authorized -> running` claim with `executionLeaseId`,
`executionLeaseExpiresAt`, and `executionOwner`. A second claimant is rejected. An expired lease is not
replayed: an execution found in `running` or `waiting_for_runtime` becomes `recovery_required`. Lease
recovery is currently opportunistic on invocation read or idempotency replay; there is no worker.

## Idempotency guarantees

`POST /api/v1/connections/:id/invoke` accepts `Idempotency-Key`.

- Only an HMAC-SHA-256 digest is stored and sent as the stable downstream correlation key.
- The unique key is `(receivingWorkspaceId, operation scope, idempotencyKeyHash)`.
- The request fingerprint is an HMAC of canonical connection, capability, and input data; normalized
  content is never persisted.
- Same key plus same normalized request returns the existing result or current status.
- Same key plus different request returns `IDEMPOTENCY_CONFLICT`.
- Concurrent duplicates race on the unique index, so only the reservation winner executes.
- Without a client key, a random internal identifier is generated. It does not authorize retry.

Production digests use the required credential-encryption secret with domain separation.

## Retry decisions

The deterministic policy returns `allowed`, a reason code, a bounded delay, and the next attempt.
Denial reasons include `AUTHENTICATION_FAILURE`, `POLICY_DENIAL`, `SCHEMA_VALIDATION_FAILURE`,
`CREDENTIAL_FAILURE`, `UNSAFE_URL`, `SOURCE_EXTRACTION_FAILURE`, `MALFORMED_PROVIDER_RESPONSE`,
`GROUNDED_RESEARCH_NOT_AUTOMATICALLY_RETRIED`, `CAPABILITY_RETRY_NOT_ENABLED`,
`CLIENT_IDEMPOTENCY_NOT_PROVIDED`, `REMOTE_IDEMPOTENCY_NOT_CONFIRMED`, and
`MAX_ATTEMPTS_REACHED`. Allowed decisions use `TRANSIENT_IDEMPOTENT_FAILURE`.

External runtime POSTs remain one attempt because the Agent Passport schema does not declare remote
idempotency acknowledgement or capability retry policy. Install-key consumption, connection creation,
authentication, policy, schema, credential, unsafe URL, malformed response, source extraction, and
full grounded research are not automatically retried.

```dotenv
RUNTIME_RETRY_MAX_ATTEMPTS=2
RUNTIME_RETRY_BASE_DELAY_MS=1000
RUNTIME_RETRY_MAX_DELAY_MS=10000
RUNTIME_RETRY_JITTER_PERCENT=20
RUNTIME_EXECUTION_LEASE_MS=360000
```

Values are validated and bounded. 13B1 has no durable scheduler, so no delayed Gateway retry is claimed
to survive process restart.

## Gemini stage policy

Grounded research and Google Search have exactly one provider attempt. Formatting retry uses only the
already obtained in-memory grounded text, never adds Search, and is controlled by
`GEMINI_FORMATTING_MAX_ATTEMPTS=1|2` (default `2`). Authentication, source extraction, blocked output,
and structured-output validation are not retried. Exhausted transient formatting returns
`FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH`; the Gateway records `recovery_required`. Research text is
not persisted for later replay.

## Read API and operations

```text
GET /api/v1/invocations/:invocationId/attempts?page=1&limit=25
```

The endpoint uses receiving workspace and user authorization, supports a maximum page size of 100, and
never returns the idempotency digest or a payload. Operations reports recovery-required invocations,
attempts, repeated transient failures, and safe retry decisions. Any recovery-required invocation
creates a critical internal alert.

## Limitations and next phases

- No durable queue, scheduler, worker, cron, Redis, or process-restart resumption exists.
- No automatic external runtime retry is enabled by the current Passport contract.
- No manual cancellation or user retry endpoint exists.
- Recovery is diagnosed but not resolved automatically.

Phase 13B2 should add durable scheduling only after remote idempotency can be declared and verified.
Phase 13B3 should add explicit authorized recovery, cancellation, and user-directed retry workflows.
