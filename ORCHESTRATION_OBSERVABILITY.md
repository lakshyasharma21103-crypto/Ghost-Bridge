# Phase 13D5 orchestration observability

Phase 13D5 adds the operations and observability control plane for secure orchestration. It extends the Phase 13D1-D4 runtime, recovery, agent-selection, delegation, policy, compliance, durable-work, and enterprise operations systems. It does not introduce a new runtime path, credential path, or payload capture path.

## Trust boundaries

Observability records contain only safe metadata: tenant scope, run/node identifiers, safe status, safe reason codes, bounded summaries, timings, categories, sequence numbers, trace identifiers, and source record references. They do not store run input, node input/output, invocation payloads, delegated credentials, provider keys, install keys, bearer tokens, raw runtime responses, private memory, hidden reasoning, prompts, or private snapshots.

Diagnostic export uses a deny-list assertion after normal recursive redaction. Unsafe content rejects the export instead of silently shipping a package. Export records store a manifest, content hash, counts, creator, expiry, trace ID, and request ID; the package content is returned to the requesting API response and is not persisted as raw content.

## Timeline and trace

`OrchestrationTimelineEvent` projects a deterministic chronological view from run, node, approval, agent-selection, delegation, recovery-decision, compensation, checkpoint, intervention, incident, and audit records. A unique tenant/source/event index makes rebuilds idempotent.

`OrchestrationTraceSpan` projects a distributed trace tree for:

- orchestration run roots;
- node execution and retry waits;
- Runtime Gateway invocations;
- agent selection;
- approval waits;
- inter-agent delegation;
- recovery decisions;
- compensation;
- checkpoints.

Trace validation detects missing parents, cycles, tenant mismatches, run mismatches, duplicate logical roots, invalid identifiers, and invalid time ordering. Validation is fail-closed for diagnostics and does not infer missing payload detail.

## Health, critical path, and bottlenecks

Run health summarizes total nodes, terminal nodes, success/failure counts, wait counts, retry and compensation counts, queue age, total duration, critical path duration, current critical node, last progress, heartbeat, stale state, and safe health reasons.

Stuck-run detection excludes intentional waits such as active approval or intervention deadlines. It flags no progress, expired leases, excessive queue waits, missed retry schedules, expired approval/intervention deadlines, stale compensation heartbeats, recovery deadlines, cancellation delays, termination delays, and state inconsistencies.

Critical-path analysis uses the definition DAG and observed timing contributions: queue wait, execution, policy/selection wait, approval wait, retry delay, recovery delay, and compensation delay. Bottleneck detection classifies queue congestion, worker saturation, slow gateway invocation, repeated retries, approval delay, compensation delay, and queue age pressure with safe evidence only.

## SLOs and alerts

`OrchestrationSloPolicy` stores tenant/workspace objectives for success rate, failure rate, partial-failure budget, queue wait, run duration, node duration, recovery duration, compensation duration, approval wait, intervention wait, retry rate, stuck-run count, minimum sample size, and rolling windows.

`OrchestrationSloEvaluation` stores calculated availability, success, failure, retry, queue, run-duration, node-duration, error-budget, burn-rate, stuck-run, cancellation, and terminal-failure metrics. Evaluation statuses are `healthy`, `at_risk`, `breached`, and `insufficient_data`.

`OrchestrationAlertRule` and `OrchestrationAlert` add deduplicated alerting for SLO breaches, error-budget burn, stuck runs, queue congestion, unhealthy workers, compensation failures, recovery failures, retry rate, circuit/rate-limit pressure, approval/intervention backlog, and security anomalies. Alert transitions support open, acknowledged, suppressed, and resolved states with tenant-scoped authorization.

## Operations controls

`OrchestrationFleetControl` records guarded controls for:

- workspace pause and resume;
- worker drain and resume;
- definition pause and resume;
- connection quarantine and unquarantine.

The orchestration run creation path rejects workspace or definition pause controls. The scheduler rejects new node claims while workers are draining. Agent selection filters quarantined connections, and the Runtime Gateway rejects invocation through a quarantined orchestration connection. These controls are audited and routed through RBAC, policy, operational access, and approval infrastructure.

## Operations overview

`OrchestrationOperationalSnapshot` captures run status counts, worker fleet health, queue summaries, alert summary, and SLO summary. The console surfaces operations, analytics, SLOs, alerts, and run-detail observability using:

- `GET /api/v1/orchestrations/operations/overview`
- `GET /api/v1/orchestrations/runs/:runId/observability`
- `GET|POST /api/v1/orchestrations/runs/:runId/timeline`
- `GET|POST /api/v1/orchestrations/runs/:runId/trace`
- `GET /api/v1/orchestrations/runs/:runId/health`
- `GET /api/v1/orchestrations/runs/:runId/critical-path`
- `POST /api/v1/orchestrations/runs/:runId/diagnostic-export`
- SLO, alert, control, and retention routes under `/api/v1/orchestrations`.

All routes require Partner authentication, workspace scope, permission checks, policy evaluation through existing middleware, operational-state checks where appropriate, bounded pagination, safe sorting, and redacted audit events.

## Retention and tenant lifecycle

Retention cleanup removes expired timeline events, trace spans, operational snapshots, SLO evaluations, resolved alerts, and expired diagnostic exports by tenant/workspace while preserving data under legal hold. Tenant deletion includes the orchestration observability collections and uses scoped filters, restart-safe deletion steps, and existing deletion recovery behavior.

## Migrations and verification

Create indexes idempotently:

```powershell
npm run migrate:orchestration-observability
```

Run the deterministic non-billed Phase 13D5 gate:

```powershell
npm run verify:orchestration-observability
```

The verifier builds synthetic fixed-time records, derives timeline and trace projections, validates lineage, checks retry/approval/delegation/recovery/compensation spans, calculates critical path and bottlenecks, evaluates healthy and breached SLOs, opens and deduplicates alerts, proves stuck-run and intentional-wait behavior, summarizes worker and queue state, verifies quarantine and pause guard decisions, asserts safe diagnostic export behavior, rejects credential-like export content, checks bounded metric labels, and confirms tenant-isolation anomaly detection. It uses no MongoDB connection, live provider, external-agent, or billed Gemini path.
