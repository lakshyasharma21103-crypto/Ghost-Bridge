# Performance testing, budgets, and capacity planning

Phase 13E4 adds a bounded, provider-neutral performance-engineering control plane. It stores versioned scenarios and budgets, executes deterministic synthetic workloads, records aggregate evidence, compares compatible baselines, and produces advisory capacity estimates. It does not provision capacity or certify production throughput.

## Trust boundaries and safety rules

The performance control plane is mounted at `/api/v1/performance`. Requests pass the existing partner authentication, tenant/workspace scope, permission middleware, policy authorization, operational-state guard, approval service where required, idempotency handling, and audit logging. Synthetic traffic is not a privileged bypass around those controls.

The workload plane accepts only registered workload identifiers, target identifiers, traffic models, stages, conditions, and bounded numeric values. It rejects arbitrary JavaScript, shell commands, request bodies, methods, headers, executable conditions, and target URLs. The registry stores no target credentials. Test identities and fixture names are synthetic and scoped by `fixtureSetId`.

The evidence plane stores aggregate windows, histograms, percentile summaries, safe categories, and reason codes. Raw request and response bodies, authorization headers, credentials, connection strings, environment-variable values, hostnames, IP addresses, private topology, and hidden reasoning are not performance evidence. Exports run through the same redaction and prohibited-key checks.

The following boundaries are absolute:

- Production traffic generation is disabled. `production_observation_only` may consume safe aggregate observations but creates no fixture set and invokes no traffic harness.
- The manual runner explicitly refuses `production_observation_only`.
- Staging execution is manual, allowlist-, permission-, reason-, and approval-gated. The shipped `staging-http-v1` target is disabled, so it fails closed until a later governed deployment explicitly enables a trusted staging integration.
- Automated tests use deterministic local mocks and simulations. They never invoke Gemini or another paid provider.
- No performance operation changes worker replicas, Render instances, Kubernetes resources, Atlas tier or topology, DNS, routing infrastructure, cloud autoscaling, or billing configuration.
- Local and simulated results do not prove production capacity. Capacity values and recommendations are estimates and advisory only.

## Durable records

Phase 13E4 adds indexed MongoDB models for:

- `PerformanceLoadScenario`: tenant- or platform-scoped, named, versioned scenario definitions.
- `PerformanceBudgetPolicy`: scoped, versioned performance thresholds.
- `PerformanceTestRun`: governed run state, aggregate results, lineage, and cleanup state.
- `PerformanceMeasurementWindow`: bounded stage/window histograms and safe health categories.
- `PerformanceEnvironmentFingerprint`: categorized environment identity and safe configuration hashes.
- `PerformanceBaseline`: immutable candidate, active, superseded, rejected, or archived evidence.
- `PerformanceRegressionEvaluation`: compatible comparison results and safe reason codes.
- `PerformanceFixtureSet`: deterministic fixture-set metadata and cleanup lifecycle.
- `PerformanceFailureInjectionProfile`: versioned, bounded test-only fault rules.
- `CapacityModel`: versioned estimates derived from a performance run.
- `CapacityPlan`: versioned, advisory forecast and capacity intent.

`npm run migrate:performance-capacity` creates the additive indexes. The migration is idempotent, restart safe, and non-destructive; it does not rewrite existing production records.

## Modes and target registry

Supported modes are:

| Mode | Intended use | Execution boundary |
| --- | --- | --- |
| `simulation` | Unit tests and deterministic calculations | In-process virtual/synthetic behavior |
| `local_smoke` | Bounded automated smoke verification | At most 30 seconds, concurrency 10, and 25 requests/second |
| `local_load` | Larger local opt-in work | Manual-only, no paid providers |
| `integration_load` | Bounded integration-stack work | Allowlisted integration category; no paid providers |
| `staging_load` | Manual staging load | Disabled target by default; approval and confirmation required |
| `staging_stress` | Manual bounded staging stress | Disabled target by default; approval and confirmation required |
| `staging_soak` | Manual bounded staging soak | Disabled target by default; approval and confirmation required |
| `production_observation_only` | Read safe existing aggregate metrics | Zero generated concurrency and request rate |

The fixed registry contains `local-in-process-v1`, `local-http-v1`, `integration-http-v1`, `staging-http-v1`, and `production-observation-v1`. Each record declares its allowed modes and workloads, residency tags, duration, concurrency and rate ceilings, approval/manual flags, and enabled state. Normal API requests select a `targetId`; they cannot submit a URL.

Global scenario ceilings are 24 hours, 500 concurrent operations, 2,000 requests/second, 50 tenants, 250 workspaces, 1,000 users, 10,000 fixtures, and 50 stages. Automated scenarios are further limited to 120 seconds, concurrency 50, 250 requests/second, and 2,000 fixtures. A registered workload or target may impose a lower ceiling.

## Workload domains and traffic models

The registered workload domains are:

`interactive_api`, `authentication_and_authorization`, `agent_catalog`, `agent_selection`, `orchestration_submission`, `orchestration_execution`, `delegation`, `recovery`, `compensation`, `approval_resume`, `intervention_resolution`, `queue_claiming`, `database_read`, `database_write`, `cache_read`, `cache_invalidation`, `projection_rebuild`, `observability_query`, `slo_evaluation`, `alert_evaluation`, `regional_failover_simulation`, and `backup_restore_simulation`.

Each registration fixes the target operation, request-generator ID, response-validator ID, expected outcomes, consistency class, timeout, concurrency/rate/fixture ceilings, cleanup behavior, and supported modes. There is no script editor or dynamic code loader.

Traffic models are `closed_loop`, `open_loop`, `fixed_arrival`, `stepped_arrival`, `burst`, `spike`, `soak`, and `stress`. Stage definitions have explicit order, duration, concurrency, request rate, expected backpressure/admission categories, and bounded workload-mix overrides. The deterministic scheduler derives monotonic start/end offsets and will not create an unbounded stage.

## Scenario and budget lifecycles

A scenario follows `draft -> active -> archived`. Drafts may be updated and validated. Activation requires a valid active budget, an eligible enabled target, compatible workload/mode/residency, permission, policy authorization, and an operational guard. Activating a new version archives another active version of the same scoped name. Active and archived versions are immutable.

Validation checks scope, workload and mode registration, target allowlisting, production observation constraints, durations, stage ordering, concurrency and rate bounds, tenant/workspace/user/fixture counts, a 10,000-basis-point request mix, cleanup policy, allowlisted stop/abort conditions, budget compatibility, residency, manual execution, and approval requirements. Governed create/update/lifecycle/run mutations require an `Idempotency-Key` header or `idempotencyKey` body field; replaying the key with different content is rejected. Validation reads/checks do not consume an idempotency key.

A budget follows the same `draft -> active -> archived` version pattern. It supports platform, organization, workspace, orchestration-definition, and workload-domain scopes. Thresholds cover sample size, error/timeout/retry/overload/quota rates, p50/p90/p95/p99/maximum latency, queue wait and age, execution components, orchestration duration and unknown outcomes, utilization and headroom, database/backpressure categories, lease expiry, tenant fairness, recovery/compensation, regional RPO/RTO, and relative plus absolute regression tolerance.

Budget evaluation returns `passed`, `passed_with_warnings`, `failed`, `insufficient_data`, `incompatible_environment`, or `aborted`. A correctness or security violation always fails. Expected overload rejection is separate from an unexpected failure and can yield `passed_with_warnings` only for an intentional overload model when accepted work is preserved and protected recovery capacity remains available.

## Run lifecycle and measurements

The strict run path is:

`requested -> validating -> [approval_required -> approved] -> preparing -> warming_up -> running -> cooling_down -> analyzing -> passed | passed_with_warnings | failed -> cleanup_required -> cleaned_up`

Eligible preparing/running states may abort or cancel into cleanup. Invalid or stale concurrent transitions are rejected with a safe conflict code. Repeated governed mutations use the stored idempotency fingerprint.

Warmup initializes the deterministic workers, fixtures, cache paths, and workload path. Warmup is stored as its own window and is excluded from the normal steady-state summary. Steady state generates bounded work and is the default budget-evaluation window. Cooldown generates no new work, captures the final drain boundary, and precedes analysis and cleanup. Accepted synthetic work must not be silently abandoned.

Measurements distinguish outcomes (`success`, expected/overload/quota rejection, timeout, retry, cancellation, unknown outcome, internal failure, correctness failure, and security failure) and timing domains such as admission, queue, claim, execution, database, cache, and policy time. Large runs use bounded histograms instead of unrestricted per-request samples. The stable millisecond bucket boundaries are:

`1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 30000, 60000, 120000, 300000, 600000`.

Percentiles use nearest-rank selection for bounded exact verifier samples and the first cumulative matching bucket for aggregated histograms. Summaries report p50, p90, p95, p99, maximum, sample size, throughput, queue wait, worker state, database pressure, cache behavior, fairness, recovery, and regional evidence. Deterministic or monotonic time is used for durations; wall-clock timestamps remain for persistence, audit, and correlation.

Abort conditions are allowlisted. Correctness/security violations, cross-tenant responses, credential patterns, excessive unexpected failures, database unavailability, hard queue depth, and manual cancellation stop generation and preserve safe reason codes. Budget logic also treats duplicate execution, accepted-work loss, and stale-writer success as correctness failures.

## Fixtures, failure injection, and cleanup

A scenario seed deterministically produces safe synthetic organizations, workspaces, users with `invalid.example` addresses, mock Agent Passports, and sequential/parallel orchestration definitions. Every entry carries `testOrigin: true` and its `fixtureSetId`; the manifest contains counts and a cleanup tag, not credentials or production data.

The current deterministic harness keeps generated product fixtures in memory and persists only `PerformanceFixtureSet` metadata for API-driven runs. Cleanup is workspace- and organization-scoped, requires `testOrigin: true` and the exact fixture-set ID, increments a cleanup attempt, and moves the run to `cleaned_up`. The pure cleanup helper removes only records matching both markers and is bounded and idempotent; non-test records are retained.

Failure-injection profiles allow only bounded synthetic latency, timeout, transient failure, rate limit, circuit-open, worker-crash, lease-expiry, cache-unavailable, database-delay, projection-lag, region-unavailable, replication-unknown, and agent-unavailable rules. A profile cannot include production observation mode or executable code. Referencing a profile makes the scenario approval-required. Faults are for test adapters/simulators only; production request paths do not accept test fault controls. Phase 13E4 does not expose general public CRUD routes for these profiles.

## What the deterministic harness exercises

The harness creates bounded authenticated/policy/quota/residency-evaluated samples, deterministic request and trace lineage, multiple execution workers, a protected recovery worker, and a control-plane worker. It reuses the Phase 13E1 deterministic scaling harness for admission, queue claims, partition ownership, leases, worker crashes, fencing, backpressure, load shedding, and fair service. Accepted logical work is checked for durability and exactly-once completion within the simulation.

Spike scenarios create expected bounded overload responses and verify that normal/accepted work and recovery capacity remain protected. Stress and soak are bounded traffic models; their heavy command entry points remain manual-only. Fairness summaries use bounded service-share skew and starvation-window categories and never put tenant IDs in metric labels.

Database and cache workloads report safe query/pressure, hit/miss, invalidation, and latency categories. They reuse the Phase 13E2 vocabulary and controls but do not run destructive index scans or expose cached values. The current local harness simulates database/cache evidence rather than benchmarking an Atlas tier.

Regional tests reuse the Phase 13E3 local multi-region harness. They simulate admission freeze, authority and queue transfer, standby worker activation, checkpoint resume, projection/routing evidence, stale-writer fencing, and exactly-once resumed completion under bounded load. They never change real DNS, load balancers, database topology, or regional infrastructure.

## Baselines and regression comparison

A passing run may create a `candidate` baseline. Promotion is permission-, policy-, operational-guard-, and approval-protected. Promotion marks the previous matching active baseline `superseded`; it does not delete history. Active baseline evidence is immutable and may later be archived.

Every run has a safe environment fingerprint made from bounded categories, process/worker counts, runtime/application/schema/migration versions, adapter/topology categories, and SHA-256-style configuration hashes. It deliberately omits hostnames, usernames, paths, IPs, URIs, environment values, and secrets.

Regression comparison first checks minimum sample size, workload domain, scenario version, mode, budget version, and the bounded environment compatibility fields/configuration hashes. Incompatible evidence is reported as `incompatible`, never as a regression. Comparable p50/p95/p99 latency, throughput, error rate, and queue p95 changes must cross both the configured relative basis-point tolerance and the applicable absolute tolerance before they are material. A material adverse change is `regressed`; a material favorable change is `improved`; otherwise it is `unchanged`.

Scenario version is currently the fixture-shape compatibility proxy; there is no separate persisted fixture-scale compatibility signature.

## Capacity calculations and plans

Capacity calculations are deterministic and do not use an LLM:

- Throughput is completed work divided by the bounded duration.
- Safe concurrency uses Little's Law (`arrival rate * average service time`) adjusted by the utilization/headroom target.
- Saturation is estimated from observed completion rate divided by observed utilization.
- Sustainable throughput discounts saturation by minimum required headroom.
- Queue drain rate is completion rate minus continuing arrival rate; drain time is unknown when that value is not positive.
- Required workers use observed per-worker completion and the configured headroom target.
- Suggested partitions use a bounded worker-to-partition ratio.
- Failover capacity subtracts protected recovery capacity before testing whether the target region can absorb primary load, then reports projected queue growth and drain time.

Headroom is `unknown` without sufficient data or positive capacity. Otherwise it is `ample` at 3,000 basis points or more, `adequate` at 1,500–2,999, `limited` at 500–1,499, and `critical` below 500. Unknown is never rendered as healthy.

A `CapacityModel` records observations, saturation/sustainable throughput, safe concurrency, queue drain, reserved capacity, worker and partition estimates, confidence, assumptions, limitations, and source runs. Confidence is low for fewer than 20 samples, medium for bounded evidence, and high only for at least 1,000 samples across multiple windows.

A `CapacityPlan` follows `draft -> active -> archived`, covers current/7/30/90-day forecasts, execution/recovery/control-plane workers, concurrency, partitions, database/cache categories, reserved recovery headroom, and regional/failover requirements, and references its source models. Activation requires critical permission, policy, operational access, and approval. It remains advisory.

Provider-neutral recommendations may include worker or partition scale-up, protected-recovery reservation, database/cache investigation, hold, or insufficient data. Every recommendation includes reason codes, evidence window, confidence, expected effect, and limitations. No recommendation calls a provider API or applies itself.

## APIs, authorization, approval, and audit

All endpoints use the `/api/v1/performance` prefix:

- Scenarios: `POST/GET /scenarios`, `GET/PATCH /scenarios/:scenarioId`, and `POST /scenarios/:scenarioId/{validate,activate,archive}`.
- Budgets: `POST/GET /budgets`, `GET/PATCH /budgets/:budgetId`, and `POST /budgets/:budgetId/{validate,activate,archive}`.
- Runs: `POST/GET /runs`, `GET /runs/:runId`, `POST /runs/:runId/{execute,cancel,abort,cleanup}`, and `GET /runs/:runId/{windows,budget-evaluation,regression,export}`.
- Baselines: `POST/GET /baselines`, `GET /baselines/:baselineId`, and `POST /baselines/:baselineId/{promote,archive}`.
- Capacity models: `GET /capacity-models`, `GET /capacity-models/:modelId`, and `POST /runs/:runId/capacity-model`.
- Capacity plans: `POST/GET /capacity-plans`, `GET/PATCH /capacity-plans/:planId`, and `POST /capacity-plans/:planId/{validate,activate,archive}`.
- Registry/overview: `GET /targets`, `/environment`, `/capacity`, and `/recommendations`.

Requests require `X-Partner-Api-Key`; the authenticated partner is the organization boundary, and workspace-scoped records require the workspace ID. Lists use stable bounded cursor pagination with a maximum page size of 100. Cross-tenant and cross-workspace lookups fail as not found/denied.

Permission families are `performanceTesting.*`, `performanceScenario.*`, `performanceBudget.*`, `performanceRun.*`, `performanceBaseline.*`, `capacityModel.*`, `capacityPlan.*`, `performanceEnvironment.read`, `performanceRecommendation.read`, and the critical `performanceFaultInjection.manage`/`performanceRun.executeHeavy`. Normal viewer roles receive safe reads, not execution, staging, baseline-promotion, plan-activation, export, or fault-injection authority. The API chooses separate local, integration, and staging execution permissions from the run mode.

The service supplies only bounded safe metadata to policy evaluation and applies operational guards at scenario/budget/plan configuration, execution, baseline/capacity operations, export, and cleanup. Staging execution additionally requires `manualConfirmation: true`, a bounded `reasonCode`, a matching approval request, and `performanceRun.executeStaging`. Baseline promotion and capacity-plan activation also consume governed approvals.

Audit events cover scenario and budget CRUD/lifecycle, run validation/stages/completion/failure/cancel/abort/cleanup, budget outcomes, regression detection/clearance, baseline lifecycle, capacity model/plan lifecycle, and safe exports. Audit metadata contains safe IDs/categories, versions, result states, reason codes, actors, timestamps, request IDs, and trace IDs—never credentials, payloads, or private target details.

## Metrics, exports, and console

Performance metrics use an explicit label allowlist and a 3,000-series process bound. Labels may contain bounded workload, mode, stage, outcome, backpressure, latency/throughput/concurrency, database/cache, fairness, recovery/regional, budget/regression, capacity/headroom, recommendation, and cleanup categories. Organization, workspace, tenant, run, scenario, baseline, user, request, trace, passport, connection, worker, partition-key, and target-URL labels are rejected.

The safe export contains scenario metadata, environment fingerprint, budget policy, aggregate performance summary, budget/regression evaluations, capacity model, advisory recommendations, and categorized bottleneck findings. A final serialized-key/value scan fails the export if prohibited data remains.

The compact Operations console adds:

- `/operations/load-tests` and `/operations/load-tests/:runId`
- `/operations/performance-budgets`
- `/operations/baselines`
- `/operations/capacity-planning`

High-impact controls display target, duration, concurrency, request rate, cleanup plan, reason, and approval state. The UI does not render raw payloads or credentials.

## Verification and manual commands

The bounded, deterministic, non-billed verifier is:

```powershell
npm run verify:performance-capacity
```

It covers the registry, budgets/scenarios, deterministic fixtures and stages, authenticated workload invariants, multi-worker durability and lineage, summaries, budget pass/failure, baseline/regression compatibility, fairness, spike shedding and recovery capacity, crash recovery/fencing, cache behavior, regional failover, capacity estimates/plans, recommendations, safe export, bounded metrics, and cleanup/isolation. It does not run any heavy command.

Manual-only commands are:

```powershell
npm run perf:local-load
npm run perf:local-spike
npm run perf:local-stress
npm run perf:local-soak
npm run perf:regional-simulation
npm run perf:staging-load
```

The runner prints the selected target, mode, maximum concurrency, maximum request rate, duration, and cleanup policy. Optional bounded overrides use npm argument forwarding, for example:

```powershell
npm run perf:local-load -- --duration=10000 --concurrency=12 --rate=30
```

Staging additionally requires `--confirm=STAGING_LOAD`, but confirmation alone is not approval and does not enable the shipped disabled target:

```powershell
npm run perf:staging-load -- --confirm=STAGING_LOAD
```

Use the governed API execution flow with an authorized approval request, manual confirmation, reason code, and an explicitly enabled trusted staging target when staging support is deployed. Never point the runner at production. Stop a local synchronous run with the normal process interrupt; follow the printed `fixtureSetId` cleanup instruction if a run completed far enough to create fixtures.

## Known limitations

- The deterministic harness measures modeled/in-process behavior, not real network transport, external agents, Atlas tier limits, Redis service limits, or cloud infrastructure. Registered local HTTP/integration categories do not turn the current generic harness into a socket-level benchmark.
- Production observation has no traffic generator and no automatic production telemetry connector in this phase; it accepts only safe aggregate observation input through the governed path.
- The staging target is intentionally disabled in the shipped registry. There is no automatic staging deployment discovery or cloud target configuration.
- Manual stress/soak/spike commands are short bounded simulations unless an operator supplies different bounded arguments; they are not automatically scheduled CI jobs.
- Performance metrics are bounded process-local snapshots, not a durable external time-series backend.
- Fixture manifests are synthetic/in-memory and API runs persist fixture metadata rather than cloning product tenant data. Cleanup therefore has no production-derived records to remove.
- Failure-injection profiles have a durable schema and permission boundary, but no general public CRUD/execution surface in Phase 13E4.
- Regression comparison uses scenario version as the fixture compatibility boundary and does not persist an independent fixture-scale fingerprint.
- Performance findings do not overwrite production SLOs or automatically page production channels. Test incidents and external alert delivery remain separate operator integrations.
- Autoscaling recommendations and capacity plans never apply changes. Provider adapters, billing/cost claims, automatic replica changes, and production capacity certification are reserved for later phases.
