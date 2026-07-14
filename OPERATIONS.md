# Phase 13A2 operations with Phase 13B1 lifecycle signals

The Operations page and `/api/v1/operations` APIs provide receiving-workspace metrics from persisted
gateway records. Every request requires the current receiving identity fields
`receivingWorkspaceId` and `receivingUserId`; queries, alert records, acknowledgement updates, and
legacy invocation fallbacks are constrained to the requested workspace. Partner-global passport and
install-key counts are never returned to a receiving workspace.

## Windows and endpoints

The only accepted UTC windows are `1h`, `24h`, `7d`, and `30d`. Any other value returns a validation
error.

- `GET /api/v1/operations/summary`
- `GET /api/v1/operations/latency`
- `GET /api/v1/operations/errors?page=1&limit=25`
- `GET /api/v1/operations/passport-funnel`
- `GET /api/v1/operations/alerts?page=1&limit=25`
- `POST /api/v1/operations/alerts/:alertId/acknowledge`

GET requests take the receiving identity and, where applicable, `window` in the query string. Alert
acknowledgement takes the receiving identity in its JSON body. The error and alert APIs are paginated;
limits must be between 1 and 100.

## Metric definitions

- Gateway readiness uses the existing database and runtime-configuration readiness checks. The
  service version comes from the backend package metadata.
- Passport totals include only distinct passports referenced by that workspace's connections.
  `active` means the persisted passport is `valid`. Invalid, suspended, draft, unknown, and updated
  during the window are reported separately.
- Connection `active` means `connected`. Health is `healthy`, `unhealthy`/`unreachable`, or `unknown`
  for an active connection without a recognized persisted result. Health-check failures count
  unhealthy or unreachable health audit results in the selected window.
- Invocation success means authoritative lifecycle `succeeded` (or legacy `completed`). Deterministic
  failures, timeouts, cancellations, recovery-required outcomes, and in-progress states are reported
  separately. Failure rate includes `failed`, `timed_out`, and `recovery_required`. Attempt totals,
  additional attempts, retry decisions, and repeated transient failures use safe denormalized
  invocation fields. Retryability uses the deterministic classifier stored with invocation errors.
- Error groups contain only code, safe category, approved stage (or `unknown`), retryability, provider
  HTTP status, runtime type, connection health, count, percentage of failures, and latest timestamp.
  Raw messages, bodies, inputs, outputs, and stack traces are not projected.

Overall latency uses succeeded or legacy completed invocations with a numeric `durationMs`. Average, min, max, p50, p95,
and p99 are calculated from the 10,000 most recent matching invocations using linear interpolation
between sorted values. Responses state the sample size and whether it was truncated. Stage latency is
derived only from the bounded Invocation `stageMetrics` array. Stored entries contain one of the nine
approved stage names, duration, and completed/failed status; a record can contain at most 16 entries.

## Installation funnel

The funnel reports keys resolved, complete passport snapshots, imported capability metadata, resolved
runtime configuration, applicable delegated credentials, connections created, connected/verified
connections, and distinct connections with a first successful invocation. Resolution failures and
expired/reused-key rejections come from workspace-scoped audit events.

Install keys are partner-scoped before resolution. Therefore keys issued and unresolved expired keys
cannot be safely attributed to a receiving workspace; the APIs return an explicit unavailable state
instead of a global or fabricated value.

## Alert rules and lifecycle

Alert conditions are evaluated idempotently over a fixed rolling 24-hour window when summary metrics
are requested. A deterministic `workspace:type` dedupe key prevents duplicate records. Re-reading the
summary updates `lastSeenAt` without increasing occurrences. A cleared condition becomes `resolved`;
if it returns, the alert becomes active, acknowledgement fields are cleared, and `occurrenceCount`
increases while `firstSeenAt` is preserved.

Rules include recovery-required invocation outcomes, repeated transient invocation failures, gateway readiness loss, high invocation failure rate, all checked active connections
unhealthy, credential failures, repeated authorization failures, provider 429/503/504 errors,
repeated timeouts, high p95 latency, unhealthy or unknown connection health, elevated installation
failures, elevated reused-key rejections, and activity with no successful invocation.

Defaults are configurable in `Backend/.env.example`:

| Variable                                 |  Default |
| ---------------------------------------- | -------: |
| `OPS_ALERT_FAILURE_RATE_MIN_INVOCATIONS` |     `10` |
| `OPS_ALERT_FAILURE_RATE_PERCENT`         |     `25` |
| `OPS_ALERT_P95_LATENCY_MS`               | `300000` |
| `OPS_ALERT_PROVIDER_ERROR_COUNT`         |      `5` |
| `OPS_ALERT_INSTALL_FAILURE_PERCENT`      |     `25` |
| `OPS_ALERT_AUTH_FAILURE_COUNT`           |      `3` |

## Safe data policy and dashboard

The dashboard contains a flat metric row, invocation activity, connection health, internal alerts,
installation funnel, stage latency, grouped failures, and recent failed or ambiguous invocation identifiers
with state, attempt count, and safe retry reason.
Drill-down uses existing authorized connection and invocation pages. It never renders prompts, task
input, model/runtime response content, source URLs, request headers, cookies, keys, tokens, encrypted
or decrypted credentials, connection strings, or raw logs.

## Known limitations and future integration

- The current receiving-platform API uses its existing explicit workspace/user identity convention;
  Phase 13A2 does not introduce a new account/session protocol. A future authenticated tenant
  principal should supply these fields server-side without changing the aggregation boundaries.
- Historical invocations created before `receivingWorkspaceId` was persisted are included only through
  a connection that is currently owned by the workspace. Historical records do not have stage metrics.
- Percentiles are a documented bounded recent sample rather than an unbounded exact scan.
- Alerts are evaluated on summary reads, not by a background scheduler, so condition transitions are
  observed when the dashboard or summary endpoint is used.
- Expired invocation leases are marked opportunistically when invocation state is read or replayed;
  there is no process-restart recovery scanner in Phase 13B1.
- The internal alert model can later feed a provider-neutral exporter or webhook, but this phase adds no
  external monitoring vendor, queue, Redis cache, email, chat, or paid integration.
