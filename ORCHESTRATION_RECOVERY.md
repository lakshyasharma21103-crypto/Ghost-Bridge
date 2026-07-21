# Orchestration Recovery, Compensation, and Human Intervention

Phase 13D4 adds durable failure recovery, explicit compensating actions, and controlled human intervention to the Phase 13D1 orchestration engine. It reuses Phase 13D2 governed agent selection and Phase 13D3 data contracts and delegation grants. It does not introduce another invocation, credential, policy, approval, audit, or worker path.

Recovery is explicit and deterministic. A run can retry eligible work, pause, request intervention, execute declared compensation, resume from a verified checkpoint, or terminate with honest unresolved-side-effect evidence. Recovery never silently changes an agent, data-contract version, recovery-policy version, or node input.

## Retry, cancellation, and compensation are different

| Operation | Purpose | What it does not prove |
| --- | --- | --- |
| Retry | Makes another bounded attempt at the same logical work when replay is proven safe. | It does not make a non-idempotent or unknown-outcome action safe. |
| Cancellation | Stops future claims and requests cooperative cancellation of work already running. | It does not prove that a transmitted external action stopped or was undone. |
| Compensation | Invokes an explicit, predeclared corrective operation for completed work. | It is not a database transaction, rollback, or atomic inverse of the original external effect. |

Compensation is best-effort corrective execution. A successful compensation means that its declared success criteria passed; it does not mean that the original action never happened. External systems can reject, partially apply, delay, or independently modify the affected state. Compensation failure and uncertainty remain visible and can require intervention.

## Trust and data boundaries

The recovery control plane stores tenant-scoped policy and state metadata, immutable hashes and snapshots, safe failure classifications, attempt counters, references, and bounded operator decisions. It does not become a credential broker. Every normal and compensating invocation continues through the Runtime Gateway, which resolves the current Passport Connection, reauthorizes the action, brokers runtime access internally, applies rate and circuit controls, records deterministic invocation state, and invokes the declared Agent Passport capability.

A delegation grant is data authority, not credential authority. Recovery never converts a grant or delegation reference into runtime access. Expired or revoked access is resolved again through the existing governance path and cannot be restored by a checkpoint.

Recovery records, plans, checkpoints, interventions, APIs, audits, incidents, metrics, and evidence exclude:

- runtime credentials, provider keys, install keys, authorization headers, database credentials, and delegated credential material;
- opaque delegation references and raw secret values;
- unrestricted run or node inputs and outputs;
- source code, system prompts, private memory, hidden context, private policy rules, and chain of thought;
- environment variables, process globals, and undeclared dependency data.

Compensation input can come only from the immutable run snapshot, the original node's validated input and output, safe invocation-result metadata, approved orchestration metadata, declared safe literals, approved data-contract fields, and declared prior compensation results. Phase 13D3 allowlist extraction, transformations, redaction, minimization, schema bounds, classification, region, and residency checks run before persistence and invocation. Only retention-approved mapped values may be retained.

## Recovery policy and definition freezing

`OrchestrationRecoveryPolicy` is organization/workspace scoped and versioned:

```text
draft -> active -> archived
```

A draft can be validated and edited. Activation requires validation, RBAC, active policy evaluation, and operational readiness. An active version is immutable; editing creates a successor draft. Archiving prevents selection for new runs without changing existing history. Each run freezes the selected policy ID, version, digest, limits, deadlines, permitted categories, operator controls, approval requirements, compensation ordering, and cancellation behavior.

Orchestration definitions declare recovery before execution. Orchestration-level fields select the policy and bound attempts and deadlines. Each node declares one recoverability class:

- `retryable`: replay may be considered under failure, idempotency, policy, and attempt rules;
- `compensatable`: a validated compensation definition is frozen into the run;
- `non_reversible`: completed side effects cannot be represented as corrected automatically;
- `manual_only`: an authorized human decision is required.

A compensation definition names exactly one pinned or governed target, the declared passport capability and operation, schemas, safe input mapping, timeout, retry rules, optional data-contract version, approval requirement, expected idempotency behavior, and success criteria. It contains identifiers and safe metadata only. A node without a valid frozen compensation definition is non-compensatable. Dangerous or sensitive operations can be forced to intervention even when a compensation definition exists.

## Durable records and lifecycles

Phase 13D4 adds separate records so recovery history is never rewritten into an ambiguous run status.

### Recovery decision

`OrchestrationRecoveryDecision` is the immutable request and result record for automatic retry, operator retry, skip, resume, compensate, replace agent, correct input, terminate, and waive compensation.

```text
pending -> approval_required -> approved -> applied
   |              |              |          +-> failed
   |              +-> rejected | expired | cancelled
   +-> approved | applied | failed | expired | cancelled
```

The decision freezes the actor, policy version, safe reason, previous/requested state, request fingerprint, hashed idempotency identity, trace lineage, and a bounded change summary. Applying a decision uses atomic state guards. Replaying the same logical request returns the existing decision or current durable result.

### Compensation plan

`OrchestrationCompensationPlan` is an immutable ordered-step snapshot.

```text
planned -> active -> succeeded | partial | failed | cancelled | terminated
                 +-> paused -> active | partial | failed | cancelled | terminated
```

Steps contain safe node references, order, dependencies, recoverability, approval need, parallel-safety declaration, and definition hash. They contain no task payload. `partial` is used when required work was waived, non-reversible work remains, or not every required correction succeeded; it is never presented as fully compensated.

### Compensation run

`OrchestrationCompensationRun` is one durable execution of one logical plan step.

```text
pending -> queued -> running -> succeeded
   |         |          +-> retry_wait -> queued | running
   |         |          +-> waiting_intervention | failed | cancelled | terminated
   |         +-> waiting_intervention | cancelled | terminated
   +-> waiting_approval | waiting_intervention | waived | cancelled | terminated
```

It freezes the compensation target and schema/data-contract references, records bounded attempts and deadlines, links the Runtime Gateway invocation, and uses lease, heartbeat, and retry scheduling fields. `waived` is distinct from `succeeded`.

### Intervention request

`OrchestrationInterventionRequest` survives process restarts and contains only a safe summary, bounded allowed action types, assignments, expiry, approval and decision references, and trace/request IDs.

```text
pending -> approval_required -> resolved | rejected | expired | cancelled
   +--------------------------> resolved | rejected | expired | cancelled
```

The durable request's allowed actions are not sufficient authorization by themselves. The resolving actor must still pass the action-specific RBAC permission, current policy, recovery policy, approval, transition, expiry, and tenant checks.

### Checkpoint

`OrchestrationCheckpoint` contains safe node-key sets and hashes of the definition, selection, contract, recovery-policy, and safe run state.

```text
created -> verified -> superseded
   +----------+-----> invalidated
```

Verified checkpoint contents are immutable. A checkpoint contains no task payload or access material. It can prove consistency and identify completed logical work; it cannot restore a revoked passport, connection, grant, policy permission, or operational state.

## Run and node recovery states

The existing run and node state machines add guarded waiting, recovery, compensation, and termination states. Representative run flow is:

```text
running -> recovery_pending -> recovering -> running | waiting_intervention | failed
running -> compensation_pending -> compensating -> failed | cancelled | waiting_intervention | compensation_failed
running | recovering | compensating -> waiting_intervention
waiting_intervention -> recovery_pending | compensation_pending | terminated
```

Node records separately track recoverability, failure category, recovery and compensation attempts, intervention/decision/checkpoint links, safe failure, completed-side-effect time, compensation result, skip, and termination. Compare-and-update transition guards reject stale state, and completed compensation cannot re-enter an executable state.

## Failure classification and automatic recovery

Failures are mapped to a bounded safe category such as transient network, timeout, rate limited, circuit open, provider unavailable, malformed output, schema validation, policy or access denial, revoked connection/passport, approval rejection, data-contract/residency/classification denial, cancellation, non-reversible failure, or `outcome_unknown`.

Automatic recovery may perform a bounded retry, delayed retry, circuit/rate wait, expired-lease requeue, declared compensation, or an intervention pause. Eligible retries use durable exponential backoff with bounded jitter and stop at the frozen attempt or deadline limit.

Automatic recovery does not retry authentication or authorization failure, active policy denial, revocation, invalid schema or mapping, malformed contract, approval rejection, explicit cancellation, operator termination, non-reversible failure, or an unknown external outcome. A later human action must still authorize a valid next step; it cannot override an invalid target or make an unsafe replay safe.

Automatic recovery never switches agents, changes contract or policy versions, edits input, bypasses approval, uses revoked access, or repeats non-idempotent work without proof of safe replay.

## Deterministic compensation ordering

Planning considers only completed nodes with a recorded side-effect boundary and a valid frozen compensation definition. It excludes work that never started, did not complete a side effect, is already compensated, was explicitly waived, is non-reversible, or lacks compensation.

The default algorithm is:

1. Build the completed subgraph and explicit compensation dependencies from the frozen run snapshot.
2. Order dependent children before parents using reverse topological order.
3. Within independent branches at the same dependency level, use reverse completion time with a stable node-key tie break.
4. Record non-reversible and ineligible steps explicitly instead of silently dropping them.
5. Hash and persist the immutable ordered plan before a compensation worker can claim a step.

Parallel compensation is permitted only for dependency-independent branches whose frozen definitions declare parallel safety, when the policy permits it, and within `maximumParallelCompensations`. A parent is never compensated before its completed dependent children are handled. If non-reversible completed work prevents full correction, the plan becomes partial or pauses for intervention; the run is never described as fully compensated.

## Compensation idempotency and uncertain outcomes

The logical compensation identity includes the orchestration run, original node run, compensation-definition version, plan, step ordinal, and logical compensation attempt. Its deterministic key is stored as a hash and protected by unique tenant/plan-step indexes. Atomic claim and transition guards ensure that concurrent or restarted workers return the existing active or completed record rather than invoke twice.

Provider-supported idempotency is used when declared. Successful compensation is never repeated automatically. A retry remains linked to the same logical compensation and is allowed only while attempts, deadline, target state, approval, and idempotency rules remain valid.

`outcome_unknown` is used when a request may have reached an external system but Ghost Bridge cannot prove its result—for example, a connection loss after transmission or a process failure after remote completion and before local finalization. Recovery first inspects the durable invocation record and provider idempotency evidence. It may use an explicitly declared status-check capability. If the result still cannot be proven, non-idempotent work is not replayed: the run pauses and creates an intervention while preserving invocation, request, and trace IDs. Uncertainty is never rewritten as success or ordinary failure.

## Human actions

Every operator action is tenant scoped, idempotent, RBAC checked, policy evaluated with bounded metadata, validated against the frozen recovery policy and current transition, approval checked when required, and safely audited.

- **Retry:** preserves the logical node and frozen target/contract unless a separate replacement decision exists; attempts and delegation accounting remain bounded.
- **Skip:** is allowed only when downstream dependencies remain valid and the node is not mandatory security, compliance, or approval work. It creates no synthetic output and can produce `partial_failure`.
- **Correct input:** preserves the original input and creates an immutable correction version. Only policy/schema-approved fields may change; Phase 13D3 filtering, redaction, classification, residency, size, and schema checks apply. Audit stores field names/counts, not before/after values.
- **Replace agent:** invokes Phase 13D2 governed selection, normally excluding the unavailable candidate. Capability, operation, schemas, trust, health, classification, region, residency, and policy are rechecked. A new selection decision and recovery snapshot are frozen; original selection history is unchanged. Required data contracts and grants are re-created, while unused old grants are revoked.
- **Compensate:** requires a frozen definition and deterministic plan, and invokes through the Runtime Gateway with normal policy, approval, data-contract, and retry checks.
- **Waive compensation:** requires privileged permission, policy, approval where configured, and a safe reason. The step becomes `waived`, not successful; final state records partial or accepted risk.
- **Resume:** verifies the checkpoint/current state and rechecks present access, policy, approvals, operational state, and deadlines before scheduling new work.
- **Terminate:** prevents new claims, requests cancellation of active invocations where possible, closes unused grants, stops recovery scheduling, preserves evidence, and records unresolved effects and incident linkage. Repeated termination is idempotent.

## Checkpoint creation and resume

Checkpoints are created at durable boundaries including run creation, successful node completion, approval or intervention pause, applied recovery decision, compensation completion, cancellation boundary, and terminal completion. Creation captures identifiers and stable hashes, then verification recomputes the expected safe state.

Resume rejects an invalid, inconsistent, superseded, or tenant-mismatched checkpoint. It re-evaluates current policy and operational readiness and resolves all current passports, connections, contracts, and grants. Completed logical invocations and successful compensation steps remain completed; resume does not consume delegation limits again or reconstruct revoked access.

## Deadlines and expiry

Recovery, approval waits, intervention waits, compensation plans, and compensation steps use persisted deadlines. Expiry workers use atomic claims and survive process restart. The frozen policy selects a safe outcome such as fail, remain paused, escalate, create an incident, terminate, or begin declared compensation. No recovery state waits forever unless an explicit policy permits that behavior.

An expired decision, intervention, plan, lease, or step cannot execute. Expired worker leases are recoverable only through the normal claim and idempotency guards; lease recovery does not imply permission to replay an uncertain external action.

## Incidents and security events

Recovery reuses the enterprise incident and security-event systems. It creates or links an incident for repeated compensation failure, non-reversible or unknown side effects, unexpected runtime authentication failure, revocation during compensation, classification/residency violation, missed recovery deadline, force termination, suspicious compensation result, or operator acceptance of unresolved risk.

Incident linkage contains safe categories, reason codes, attempt/effect counts, state, and record/trace references. It does not copy task data. Incident response does not bypass the recovery transition, permission, approval, or Runtime Gateway path.

## Audit, compliance evidence, and retention

Safe audit events cover policy lifecycle, recovery start/result/expiry, plan creation, compensation start/retry/result/waiver, intervention lifecycle, node actions, checkpoint lifecycle, agent replacement, and force or accepted-risk termination. Payloads are bounded to IDs, state transitions, safe failure/reason categories, counts, actor, timestamps, and request/trace IDs.

These events flow through the existing normalized evidence service, tamper-evident audit chain, retention policy, legal hold, and evidence-package controls. Evidence export is independently authorized and redacted. Compensation inputs and results follow the frozen data-contract and retention modes; intervention, plan, decision, checkpoint, incident, and metric records never become an alternate payload archive. Tenant deletion includes the new scoped records and still respects active-run, incident, legal-hold, and evidence blockers.

## Workers, operational controls, metrics, and console

Recovery decisions, plans, compensation runs, intervention expiry, deadlines, checkpoint validation, and operator-action application use durable MongoDB work with atomic claims, lease tokens, heartbeats, expired-lease recovery, bounded concurrency, and idempotent replay. Multiple workers cannot own the same logical plan step. Draining stops new claims at the safe boundary; maintenance and organization/workspace suspension block new recovery work according to existing operational guards. Cancellation and termination signals are checked before claim and invocation.

Metrics use bounded outcome, state, category, recoverability, and action labels. Run, node, user, passport, connection, compensation, and intervention IDs are not metric labels. Operational views show counts for recoveries, retries, interventions, compensation outcomes, non-reversible/unknown effects, checkpoints, deadline expiry, claim conflicts, and expired leases.

The compact console adds Recovery Policies and Interventions under Orchestrations. Run detail shows safe recovery status, frozen policy, current failure, actor-authorized actions, compensation progress, unresolved effects, intervention state, checkpoints, and a safe timeline. Action buttons are rendered only when the server advertises them as currently allowed; every mutation still reauthorizes on the server and sends an idempotency key.

## Verification and migration

Use the restart-safe migration for recovery indexes and backward-compatible run/node defaults:

```powershell
npm run migrate:orchestration-recovery
```

Run the deterministic non-billed recovery scenario:

```powershell
npm run verify:orchestration-recovery
```

The verifier uses local mock Agent Passports and proves retry, intervention, deterministic compensation ordering, Runtime Gateway compensation, schema/data safety, idempotent replay, duplicate prevention, governed replacement, immutable original selection history, non-reversible accepted-risk handling, checkpoint verification/resume, trace lineage, safe evidence, and tenant isolation. It does not call Gemini or another billed provider.

## Known limitations reserved for Phase 13D5+

- There is no atomic transaction spanning Ghost Bridge and an external agent or provider. Compensation can fail and cannot erase historical external effects.
- Ghost Bridge cannot infer a semantic inverse for an operation. Only explicit, validated compensation definitions are executable.
- An external unknown outcome may remain unresolved when a provider offers neither idempotency nor a declared status-check operation; human intervention is required.
- Agent, contract, input, and policy replacement remain explicit recovery decisions; there is no autonomous adaptive replanning or dynamic graph mutation.
- Parallel compensation is limited to declared independent, parallel-safe branches; there is no distributed transaction coordinator.
- Cross-organization execution, loops, streaming recovery channels, and graphical remediation design are not provided.
- Deployment-specific multi-region failover, reconciliation with provider-specific ledgers, and disaster-recovery exercises remain operational integrations rather than universal orchestration semantics.
