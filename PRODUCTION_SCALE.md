# Production Scale, Queue Partitioning, and Backpressure

Phase 13E1 makes queue correctness independent of a single API or worker process. It extends the existing MongoDB orchestration queues, Runtime Gateway, enterprise authorization, operational-state controls, approvals, credential brokerage, recovery, audit, and observability systems. It does not create a second execution or credential path.

## Trust and consistency boundaries

MongoDB is authoritative for accepted work, idempotency, claims, fencing epochs, cancellation, partition ownership, admission decisions, and quota reservations. Process-local state may accelerate polling, but it never grants authority. Every worker mutation matches the current job lease epoch, and partition-coordinated orchestration also matches the current partition ownership epoch.

Strong consistency is required for:

- atomic job and partition claims;
- job lease and partition ownership fencing;
- invocation, delegation, and compensation idempotency;
- admission and quota-slot reservation;
- cancellation, revocation, suspension, and operational access.

Queue counts, oldest-age snapshots, capacity estimates, dashboard summaries, and autoscaling recommendations are explicitly eventual estimates. They cannot authorize work.

Scale-control records reject credential-, authorization-, secret-, token-, and payload-shaped fields. Queue routes use safe stable identifiers only. The Runtime Gateway remains the only credential broker.

## Workload categories and pools

Categories are a closed server registry; callers cannot create executable queue types.

| Pool | Categories | Default behavior |
| --- | --- | --- |
| `execution` | `orchestration_node`, `orchestration_retry` | Standard priority; defer under early pressure |
| `recovery` | `orchestration_recovery`, `orchestration_compensation`, `intervention_expiry`, `approval_resume`, `checkpoint` | Bounded high or critical priority with protected capacity where configured |
| `control_plane` | `timeline_projection`, `trace_projection` | Low-priority projections that may defer |
| `evaluation` | `slo_evaluation`, `alert_evaluation` | Isolated SLO and alert capacity |
| `maintenance` | `retention_cleanup` | Bounded maintenance capacity that can pause or reject |

Each category defines a default priority, maximum attempts, lease and heartbeat intervals, claim batch size, concurrency bounds, queue-age target, partition count, dead-letter behavior, and overload behavior in `Backend/src/constants/productionScale.js`.

Priority is categorical: `critical_recovery`, `high`, `standard`, `low`, or `maintenance`. Criticality never bypasses RBAC, policy, tenant state, workspace state, cancellation, or a fencing check. Low-priority work gains one bounded aging step per minute up to three steps.

## Deterministic routing and versions

Routing uses SHA-256 over length-prefixed values for organization, workspace, routing key, workload category, and routing version. The first unsigned 64 digest bits are reduced modulo that version's category partition count:

```text
partition = hash64(org, workspace, routingKey, category, routingVersion) mod partitionCount
partitionKey = category:routingVersion:partition
```

Randomness, process IDs, worker IDs, timestamps, expressions, and credentials are not routing inputs. The accepted job stores `workloadCategory`, `routingVersion`, `partitionNumber`, `partitionKey`, `workerPool`, `admissionClass`, and `priorityClass`.

Changing a partition count requires a new routing version. New work uses the one active version; old work retains its frozen version and modulo. Workers advertise all versions they support. A previous version can remain `draining` until its queue is empty and is then explicitly retired. No active queue document is destructively rewritten.

## Partition ownership and worker registration

`QueuePartition` stores durable status, owner and instance IDs, lease timestamps, an ownership epoch, and eventual queue estimates. Acquisition and renewal use compare-and-set predicates. Acquisition by a new owner increments the epoch. A stale owner receives `PARTITION_OWNERSHIP_LOST` and cannot renew or finalize work.

`WorkerRegistration` is an idempotent durable registration keyed by an opaque worker ID. It stores a distinct instance ID, pool, bounded supported categories and routing versions, concurrency/capacity, status, heartbeat, protocol/software versions, and optional safe region/zone. It never stores environment variables, commands, host topology, or credentials.

Draining changes registration state and available capacity to zero. The worker stops taking new claims and may safely finish already fenced work during its shutdown deadline. A stopped, unhealthy, replaced, or stale instance cannot heartbeat or claim.

Rebalancing sorts eligible workers, hashes each stable partition key, and assigns a deterministic owner. Ownership changes are compare-and-set, increment epochs, retain job routes, and are audited. Repeating a converged rebalance makes no additional ownership change.

## Claims and fencing

Orchestration workers register before polling and claim only supported routing versions in an owned partition. The existing eligibility gates still check tenant/workspace state, definition and fleet controls, connection state, cancellation, retry time, attempt bounds, and the absence or expiry of a lease.

A successful claim atomically records the worker, lease token, incremented lease epoch, partition epoch, pool, heartbeat, expiry, attempt, and claim time. Lease renewal, success, failure, retry scheduling, and terminal writes match the same epoch. Durable runtime work and compensation records also carry lease epochs; their existing atomic idempotency and claim predicates remain authoritative.

Stable failures include `STALE_WORKER_LEASE`, `WORKER_FENCED`, and `PARTITION_OWNERSHIP_LOST`.

## Fair scheduling

Eligible orchestration work is grouped by organization/workspace and ordered with bounded weighted fair queueing. Durable historical service counts move the least-served tenant forward. Tenant and workspace weights are integers from 1 through 100, but the per-round quantum is capped at four to prevent a high weight from monopolizing a poll. Priority, retry urgency, and bounded aging determine ordering within the fair service loop.

Suspended or quota-blocked tenants receive no claim. Otherwise every eligible tenant is visited deterministically, so a large backlog cannot indefinitely starve another tenant.

## Admission and quota reservations

New orchestration runs pass admission before any run or node record is created. Admission checks operational state, active tenant/workspace policy, queued and active usage, payload-size estimate, durable pool backpressure, and safe database-pressure category.

Outcomes are `accepted`, `accepted_deferred`, `rejected_capacity`, `rejected_quota`, `rejected_operational_state`, or `approval_required`. Accepted and deferred outcomes reserve capacity and persist an immutable `WorkloadAdmissionDecision`. A run is then durably created with its decision/reservation references before success is returned. Failed run creation releases the reservation and does not leave an orphan run.

`WorkloadQuotaPolicy` is organization/workspace scoped and versioned. Only drafts can be edited. Validation is separate from governed activation; activation archives the prior scoped version. Limits and weights are bounded integers, and decisions retain the policy version they used.

`WorkloadQuotaReservation` uses unique active tenant and workspace slot indexes. Concurrent attempts can fill different numbered slots but cannot commit the same active slot. The organization/workspace/idempotency digest is unique, so a replay reuses its reservation. Reservations can be consumed, released, or expired; an idempotent recovery pass expires abandoned reservations.

Quota and capacity failures use safe 429/503 responses and stable reason codes. Responses never reveal another tenant's counts.

## Backpressure, shedding, and protected capacity

`WorkloadBackpressureState` persists a per-scope/per-pool state derived from bounded depth, age, utilization, lease-expiry, throughput, failure/retry, SLO, and database-pressure signals.

Default thresholds are:

| State | Queue depth | Oldest age | Utilization |
| --- | ---: | ---: | ---: |
| `elevated` | 100 | 60 seconds | 75% |
| `saturated` | 500 | 5 minutes | 90% |
| `shedding` | 1,000 | 15 minutes | 98% |

`paused` is an explicit operational state. Thresholds are durable, versioned, validated configuration rather than mutable process-only environment settings.

Elevated pressure defers optional/low work. Saturation rejects or defers new work according to quota policy. Shedding rejects new non-critical work. Existing accepted work is never deleted by pressure handling. Cancellation, compensation, recovery, approval resumption, and security recovery can use configured reserved slots, but reserved usage is always capped by both configured and total capacity.

Database health is exposed only as `healthy`, `elevated`, `degraded`, or `unavailable`; connection strings, hosts, and provider diagnostics are not exposed. Degraded/unavailable pressure can reject new work but cannot invalidate an existing lease or drop accepted work.

## Dead letters

`WorkloadDeadLetter` contains tenant scope, a safe job ID, workload category, route, bounded attempt count, safe failure code, request/trace IDs, and timestamps. It never copies queue payloads or credentials.

Maximum attempts and non-retryable failures can create one idempotent dead-letter record. Governed actions can request retry, archive the record, or request human intervention. Retrying updates only the known source record under the same tenant/workspace and then records the controlled action. All public actions pass RBAC, policy evaluation, scope checks, and audit logging.

## Configuration, capacity, and autoscaling

`WorkloadScaleConfiguration` is durable and versioned at platform, organization, or workspace scope. It contains routing versions, category partitions, pool settings, concurrency, claim batches, lease/heartbeat values, reserved capacity, backpressure thresholds, overload behavior, and provider-neutral targets. Unsafe mixed keys and unbounded values fail validation. Activation is an RBAC/policy-governed explicit transition.

Caller organization scope is always derived from the authenticated partner and cannot be overridden by request data. Platform-scoped configuration mutations additionally require deployment-authorized context and the existing administrative approval workflow. An active configuration cannot be archived until a governed replacement has been activated.

Capacity summaries label their data as estimates and report current/used slots, bounded reserved slots, queue depth, protected depth, completion rate, utilization, saturation, and estimated drain time. Autoscaling recommendations are only `scale_up`, `scale_down`, `hold`, or `investigate`. Phase 13E1 never changes Kubernetes, Render, or cloud-provider configuration.

## API and permissions

All routes are under `/api/v1/production-scale`, require partner authentication, use bounded pagination, and invoke both route middleware and service-level authorization/policy checks.

- `/configurations` plus read, update, validate, activate, and archive actions
- `/quota-policies` plus read, update, validate, activate, and archive actions
- `/partitions` plus pause, resume, drain, and `/partitions/rebalance`
- `/workers` plus drain and stop-claims actions
- `/admission/evaluate` and `/admission/decisions`
- `/capacity`, `/autoscaling-signals`, `/backpressure`, and `/queues`
- `/dead-letter` plus retry, archive, and create-intervention actions

Permission registry v11 adds granular `productionScale*`, `workloadQuotaPolicy*`, `queuePartition*`, `workerFleet*`, `workloadAdmission*`, `deadLetter*`, `autoscalingSignal.read`, and `backpressureControl.read` permissions. Normal viewers do not receive rebalance, worker drain, activation, or dead-letter retry authority.

Policy context contains only bounded operational action, workload, priority/admission class, and safe pressure categories. Audit records contain safe IDs and categories, never payloads or authorization material.

## Metrics cardinality

Production-scale metrics accept only bounded labels such as workload category, worker pool, status, outcome, safe reason, pressure category, and recommendation. A hard series cap prevents process memory growth. Run, node, organization, workspace, passport, connection, worker, partition, trace, request, and key identifiers are never metric labels.

Metrics cover admission/quota outcomes, queue depth and age, worker/capacity state, partition claims/ownership/rebalances, fencing rejections, backpressure transitions, dead letters, drain estimates, and autoscaling recommendations.

## Migration and verification

Run the restart-safe migration after deploying the code:

```powershell
npm run migrate:production-scale
```

It creates indexes and default v1 partitions, then backfills only missing routing metadata on orchestration nodes, compensation runs, and durable runtime work. Existing route metadata and active job state are not rewritten. Re-running it is safe.

The deterministic, non-billed verifier uses local multi-worker simulations:

```powershell
npm run verify:production-scale
```

It covers deterministic v1/v2 routing, concurrent claims, fairness, quota contention/idempotency, crashes, fencing, ownership transfer, draining, pool isolation, backpressure, shedding, protected capacity, safe dead letters, capacity/signals, metric cardinality, credential exclusion, and tenant isolation. It never calls Gemini or another provider.

## Known Phase 13E1 boundaries

- Capacity, queue counts, and drain times are bounded estimates, not predictions.
- Autoscaling is advisory; provider adapters and automatic scaling belong to a later phase.
- Routing-version retirement remains an explicit operator action after observing a drained queue.
- MongoDB remains the strong-consistency dependency; database unavailability fails new claims and admissions closed.
- Scale configuration is read durably on correctness-sensitive paths. A distributed invalidation accelerator can be added later without changing authority.
