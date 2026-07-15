# Operations, runtime protection, and Phase 13B3 recovery controls

The Operations page and `/api/v1/operations` APIs provide receiving-workspace metrics from persisted
gateway records. Every request requires `X-Partner-Api-Key` plus the current receiving identity fields
`receivingWorkspaceId` and `receivingUserId`; queries, alert records, acknowledgement updates, and
legacy invocation fallbacks are constrained to connections owned by that Partner in the requested
workspace. Partner-global passport and install-key counts are never returned to a receiving
workspace.

The authenticated partner must own a connection for the selected workspace/user before metrics or
alerts are returned. Invocation history and state-changing recovery operations use the same authentication. A valid
`X-Partner-Api-Key` must map to the invocation's connection. Invocation controls additionally match
the exact receiving workspace and user; recovery queue/scans cover the authenticated partner's
connections in the selected workspace. Identity fields alone are not operator credentials.

## Windows and endpoints

The only accepted UTC windows are `1h`, `24h`, `7d`, and `30d`. Any other value returns a validation
error.

- `GET /api/v1/operations/summary`
- `GET /api/v1/operations/latency`
- `GET /api/v1/operations/errors?page=1&limit=25`
- `GET /api/v1/operations/passport-funnel`
- `GET /api/v1/operations/alerts?page=1&limit=25`
- `GET /api/v1/operations/recovery?page=1&limit=25`
- `POST /api/v1/operations/recovery/scan`
- `POST /api/v1/operations/alerts/:alertId/acknowledge`

GET requests take the receiving identity and, where applicable, `window` in the query string. Alert
acknowledgement takes the receiving identity in its JSON body. The error and alert APIs are paginated;
limits must be between 1 and 100.

The invocation list/detail/attempt APIs and recovery queue/scan require `X-Partner-Api-Key`. Recovery queue identity is supplied in the
query; scan identity and an optional bounded `limit` are supplied in the body. The related invocation
controls are `POST /api/v1/invocations/:id/cancel`, `/:id/retry`, and `/:id/resolve`. Those controls
also require the partner key plus exact `receivingWorkspaceId` and `receivingUserId` ownership.

## Metric definitions

- Gateway readiness uses the existing database and runtime-configuration readiness checks. The
  service version comes from the backend package metadata.
- Passport totals include only distinct passports referenced by that workspace's connections.
  `active` means the persisted passport is `valid`. Invalid, suspended, draft, unknown, and updated
  during the window are reported separately.
- Connection `active` means `connected`. Health is `healthy`, `degraded`, `unhealthy`/`unreachable`, or `unknown`
  for an active connection without a recognized persisted result. Health-check failures count
  unhealthy or unreachable health audit results in the selected window.
- Invocation success means authoritative lifecycle `succeeded` (or legacy `completed`). Deterministic
  failures, timeouts, cancellations, recovery-required outcomes, and in-progress states are reported
  separately. Failure rate includes `failed`, `timed_out`, and `recovery_required`. Attempt totals,
  additional attempts, retry decisions, and repeated transient failures use safe denormalized
  invocation fields. Retryability uses the deterministic classifier stored with invocation errors.
- Control metrics report cancellation requested, confirmed cancellation, cancellation outcome
  unknown, stuck invocation detected, recovery required, manually retried, manually resolved, and
  recovery retry denied. They are derived from bounded safe invocation fields or tenant-scoped audit
  events; they do not infer remote cancellation success from a closed connection.
- Error groups contain only code, safe category, approved stage (or `unknown`), retryability, provider
  HTTP status, runtime type, connection health, count, percentage of failures, and latest timestamp.
  Raw messages, bodies, inputs, outputs, and stack traces are not projected.
- Runtime protection reports workspace-scoped open and half-open circuits, rate-limited connections,
  active lease groups/slots, capacity rejections, and the process draining phase. Circuit endpoint
  identity hashes and capacity lease IDs are not returned to the dashboard.

Overall latency uses succeeded or legacy completed invocations with a numeric `durationMs`. Average,
min, max, p50, p95, and p99 are calculated from the 10,000 most recent matching invocations using
linear interpolation between sorted values. Responses state the sample size and whether it was
truncated. Stage latency is derived only from the bounded Invocation `stageMetrics` array. Stored
entries contain an approved stage name, duration, and completed/failed status; a record can contain at
most 16 entries.

## Recovery review and stuck scan

The recovery table is an operational review list, not a durable execution queue. It returns only
partner/workspace-scoped invocations with unresolved `recovery_required` work, with safe IDs,
connection, lifecycle/cancellation/recovery states, last progress, stuck classification, attempt
count, timestamps, safe error classification, and policy-derived available actions. It never returns
task input, output, sources, endpoint URLs, credentials, remote bodies, execution controllers, lease
IDs, or idempotency hashes.

The scan uses a strict maximum of `INVOCATION_STUCK_SCAN_LIMIT` records and never more than 100. A
positive requested limit above either maximum is clamped rather than rejected; non-integer or
non-positive values fail validation. It uses active lifecycle/progress indexes and conditional
updates, so concurrent scans are idempotent.
`waiting_for_runtime` is not overdue until its persisted runtime deadline plus
`INVOCATION_STUCK_GRACE_MS`; finalization uses the separate
`INVOCATION_FINALIZATION_GRACE_MS`. Safe stale work before transmission may fail or cancel.
Transmitted, lease-expired, shutdown-interrupted, overdue-runtime, and stalled-finalization outcomes
enter `recovery_required`; nothing is automatically re-executed.

## Installation funnel

The funnel reports keys resolved, complete passport snapshots, imported capability metadata, resolved
runtime configuration, applicable delegated credentials, connections created, connected/verified
connections, and distinct connections with a first successful invocation. Resolution failures and
expired/reused-key rejections come only from audit events attributable to the authenticated Partner's
owned connections or install-key records.

Install keys are partner-scoped before resolution. Therefore keys issued and unresolved expired keys
cannot be safely attributed to a receiving workspace; the APIs return an explicit unavailable state
instead of a global or fabricated value.

## Alert rules and lifecycle

Alert conditions are evaluated idempotently over a fixed rolling 24-hour window when summary metrics
are requested. A deterministic Partner + workspace + type + scope key prevents duplicate records.
Most rules use the workspace scope; repeated-stuck rules use the connection ID as their safe scope, so
one connection does not collapse another connection's alert. Re-reading the summary updates
`lastSeenAt` without increasing occurrences. A cleared condition becomes `resolved`; if it returns,
the alert becomes active, acknowledgement fields are cleared, and `occurrenceCount` increases while
`firstSeenAt` is preserved.

Rules include recovery-required invocation outcomes, repeated transient invocation failures, Gateway
readiness loss, high invocation failure rate, all checked active connections unhealthy, credential
failures, repeated authorization failures, provider 429/503/504 errors, repeated timeouts, high p95
latency, unhealthy or unknown connection health, elevated installation failures, elevated reused-key
rejections, and activity with no successful invocation.

Phase 13B3 adds the following tenant-safe signals:

- critical: elevated ambiguous remote outcomes, repeated finalization stalls, and the configured
  count of recovery-eligibility events within the rolling 24-hour evaluation window;
- warning: any cancellation outcome unknown, repeated stuck detections, frequent lease expiry, and
  repeated manual-retry denial;
- information: confirmed cancellation, completed recovery actions, and resolution of work previously
  classified as stuck.

The `recovery_queue_increasing` signal name is retained for compatibility, but its input is a rolling
count of `invocation.recovery.eligible` audit events. It is not a comparison of queue depth across
successive samples and must not be presented as a measured growth trend. Alert dedupe includes the
authenticated Partner and workspace, plus connection scope where a rule supplies one. Stuck or
cancellation events do not change circuit state or connection health without independent runtime
evidence.

Defaults are configurable in `Backend/.env.example`:

| Variable                                 |  Default |
| ---------------------------------------- | -------: |
| `OPS_ALERT_FAILURE_RATE_MIN_INVOCATIONS` |     `10` |
| `OPS_ALERT_FAILURE_RATE_PERCENT`         |     `25` |
| `OPS_ALERT_P95_LATENCY_MS`               | `300000` |
| `OPS_ALERT_PROVIDER_ERROR_COUNT`         |      `5` |
| `OPS_ALERT_INSTALL_FAILURE_PERCENT`      |     `25` |
| `OPS_ALERT_AUTH_FAILURE_COUNT`           |      `3` |
| `OPS_ALERT_AMBIGUOUS_OUTCOME_COUNT`      |      `3` |
| `OPS_ALERT_FINALIZATION_STALL_COUNT`     |      `2` |
| `OPS_ALERT_RECOVERY_GROWTH_COUNT`        |      `5` |
| `OPS_ALERT_LEASE_EXPIRY_COUNT`           |      `3` |
| `OPS_ALERT_RETRY_DENIAL_COUNT`           |      `3` |
| `OPS_ALERT_STUCK_INVOCATION_COUNT`       |      `3` |

## Safe data policy and dashboard

The dashboard contains a flat metric row, invocation activity, Phase 13B3 control metrics, connection
health, internal alerts, installation funnel, stage latency, grouped failures, and a compact recovery
review table. Invocation detail shows lifecycle, cancellation and recovery states, meaningful progress,
attempts, safe reason codes, and only policy-approved actions. Cancel, safe retry, resolve failed, and
resolve cancelled actions use confirmation dialogs. Outcome-unknown work clearly warns that remote
termination is not confirmed and retry is blocked unless policy proves replay safe.

Drill-down uses existing authorized connection and invocation pages. It never renders prompts, task
input, model/runtime response content, source URLs, request headers, cookies, keys, tokens, encrypted
or decrypted credentials, connection strings, execution-controller data, or raw logs.

## Known limitations and future integration

- The current receiving-platform API uses its existing explicit workspace/user identity convention;
  Phase 13A2 does not introduce a new account/session protocol. A future authenticated tenant
  principal should supply these fields server-side without changing the aggregation boundaries.
- The Partner API key is the current operator principal. There is no separate authenticated
  workspace-user/admin role yet, so creator-versus-operator authorization remains a production
  hardening item; no client-supplied role or admin header is trusted.
- Historical invocations created before `receivingWorkspaceId` was persisted are included only through
  a connection that is currently owned by the workspace. Historical records do not have stage metrics.
- Authenticated audit reads include only records attributable to the Partner's owned connection or
  Passport IDs. Older audit rows without that attribution are intentionally excluded rather than
  exposed by workspace text alone; a controlled backfill is required for complete historical views.
- Invocation state/control fields are authoritative. The separate `AuditLog` write is best-effort and
  not atomic with a control transition, so a successful state change can have an audit-sink gap.
  Phase 13B4 should add a transactional outbox and reconciliation for compliance-grade delivery.
- Manual retry currently depends on the inherited redacted `Invocation.inputSummary`, and only when
  its recomputed fingerprint matches the original request. This is not a general task-payload store;
  a future design should use an encrypted/ephemeral replay handle or caller resubmission with
  fingerprint verification.
- Percentiles are a documented bounded recent sample rather than an unbounded exact scan.
- Alerts are evaluated on summary reads, not by a background scheduler, so condition transitions are
  observed when the dashboard or summary endpoint is used.
- Stuck evaluation is an authenticated, bounded operator scan. There is no background recovery
  scheduler, durable execution queue, or automatic replay.
- Active `AbortController` entries are process-local and non-durable. MongoDB state is authoritative;
  cancellation across restarts or replicas requires future durable worker/control infrastructure.
- Runtime cancellation, remote idempotency, and status lookup are internal optional connection
  metadata until a future Agent Passport protocol version declares them. Current Gemini integration
  has no trusted job-status lookup, and Operations never calls Gemini to determine status.
- Manual resolution supports only failed or cancelled. There is no arbitrary mark-succeeded control.
- The internal alert model can later feed a provider-neutral exporter or webhook, but this phase adds no
  external monitoring vendor, queue, Redis cache, email, chat, or paid integration.
