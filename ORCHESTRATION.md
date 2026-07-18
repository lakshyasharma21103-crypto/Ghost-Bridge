# Secure Orchestration Control Plane

Phase 13D1 adds tenant-scoped directed acyclic graph (DAG) execution for installed Agent Passports. It extends the existing Runtime Gateway, enterprise RBAC and policy engine, approvals, durable work, operational controls, auditing, compliance evidence, tracing, and invocation cancellation. It does not create a second runtime or credential path.

## Trust and secret boundaries

The control plane stores graph metadata, immutable safe snapshots, run/node state, explicitly resolved node input, and schema-validated output. Node input/output and run input/final output are private MongoDB fields excluded from normal queries and API serializers.

Definitions store only connection and passport identifiers. Immediately before execution, the worker resolves the connection, passport, and capability again under the run tenant. The Runtime Gateway performs credential brokerage; the orchestration worker never decrypts or receives delegated credentials.

Snapshots, mapped payloads, APIs, logs, and evidence exclude:

- install keys, provider keys, bearer tokens, database credentials, and delegated credential material;
- encrypted credential or invocation payloads;
- private agent memory, implementation details, source code, and system prompts;
- hidden reasoning and chain-of-thought fields;
- output from unrelated or undeclared nodes.

## Durable records and indexes

`OrchestrationDefinition` contains an organization/workspace-scoped name and version, status, input/output JSON Schemas, nodes, edges, execution bounds, approval configuration, and safe policy metadata. Editing an active version creates a new draft version.

`OrchestrationRun` contains the selected definition/version, private input/final output, status, trace identifiers, hashed idempotency material, concurrency counters, duration/execution bounds, and the immutable definition snapshot.

`OrchestrationNodeRun` is a separate record for dependency state, attempts, retry timing, lease/heartbeat ownership, invocation/approval linkage, safe failure evidence, and private mapped input/output.

Indexes cover tenant listings, unique definition name/version, run idempotency, scheduling status, node readiness/retry/lease expiry, run-node relationships, approval relationships, and trace/request lookup. `npm run migrate:orchestration` creates them idempotently and backfills only a safe missing active-node counter.

## DAG validation and snapshots

Validation deterministically checks:

- unique bounded node keys and existing dependency/edge endpoints;
- at least one root, complete root reachability, and cycle freedom;
- bounded node, edge, mapping, concurrency, duration, timeout, retry, and execution counts;
- valid JSON Schemas and mapping paths declared by those schemas;
- same-tenant, invoke-scoped, connected Passport Connections;
- valid non-suspended passports and enabled declared capabilities/operations;
- exact node/capability schema agreement.

Errors use stable `ORCHESTRATION_*` codes and safe field paths. Credential, policy-document, and private passport fields are never included.

A run starts only from an active definition that passes fresh authorization, operational, connection, passport, capability, and schema validation. Its strict-whitelist snapshot contains graph/version data, passport IDs and versions, connection IDs, capability/operation names, schemas, mappings, timeouts, retries, approvals, continuation flags, and safe policy context. It never copies connections, endpoints, credentials, secrets, prompts, or implementation details. Later definition edits cannot change an existing run.

## Secure mapping

Mappings are selectors, not programs:

```json
{
  "topic": "$run.input.topic",
  "researchSummary": "$nodes.research.output.summary",
  "runReference": "$meta.runId",
  "mode": { "literal": "concise" }
}
```

A node can read only run input, outputs of declared dependencies, a small safe metadata allowlist, and explicit literals. Run/output paths must exist in their schemas.

The mapper rejects bracket/arbitrary traversal, unknown `$` expressions, missing values, environment/process/global access, templates, unsafe prototypes, `__proto__`, `constructor`, `prototype`, secret-like fields, circular or non-JSON values, and oversized payloads. It never uses `eval`, `Function`, dynamic module loading, or executable templates.

Input is schema-validated before invocation. Output is schema-validated before persistence. Intermediate output is projected to fields referenced by downstream mappings; terminal output is retained only for final output-schema validation.

## Execution and state machines

Node states:

```text
blocked -> ready -> running -> succeeded
                   |  |  |
                   |  |  +-> failed
                   |  +----> retry_wait -> running
                   +-------> waiting_approval -> ready

blocked/ready/queued/retry_wait/waiting_approval -> cancelled
blocked/ready/queued/retry_wait -> skipped
```

Run states:

```text
queued -> running -> succeeded | failed | partial_failure
             |  ^
             v  |
       waiting_approval

queued/running/waiting_approval -> cancel_requested -> cancelled
```

Explicit transition tables and compare-and-update guards reject stale or invalid transitions.

The scheduler atomically reserves a per-run slot before claiming a node. A claim receives a unique lease token and expiry; only the matching live lease can heartbeat or finalize it. MongoDB enforces `activeNodeCount < concurrencyLimit`.

Every node calls `runtimeGateway.invoke`. The gateway retains connection resolution, authorization/policy, credential brokerage, rate limits, circuit breakers, runtime health, timeouts, durable invocation work, cancellation, tracing, auditing, and adapters. Agents receive only mapped task input.

Each attempt uses `orchestration:<run>:<node>:attempt:<n>` as its gateway idempotency key. Expired orchestration leases requeue with `resumeAttempt=true`, preserving the attempt and key; restart recovery cannot create a second logical invocation.

## Policy, approvals, retries, and cancellation

Permission Registry v6 adds separate definition read/create/update/validate/activate/archive, run create/read/cancel, and node execute/retry permissions. Central authorization and active policy evaluation run for definition lifecycle operations, run creation, node execution, dependency-output mapping, Runtime Gateway invocation, retries, cancellation, and approval decisions.

The operational guard rejects new runs for suspended tenants or applicable maintenance modes. Draining rejects new claims while existing claims follow the safe execution boundary. Suspension marks ready/retry nodes as operationally blocked; controlled resume releases only those nodes.

Approval can be configured or required by normal active approval workflows. The worker creates a normal `ApprovalRequest` bound to the exact `connection.invoke` action and mapped-input fingerprint, then moves the node to `waiting_approval` before invocation. Safe run/node references are stored on the request. Approval returns the node to `ready`; the Runtime Gateway validates and consumes the normal grant. Rejection, expiry, invalidation, or cancellation fails without retry. Durable polling recovers missed resume notifications.

Retry classification reuses the platform utility plus a fail-closed deny list for authorization, policy, schema, mapping, credentials/authentication, passport/connection revocation, approval, malformed output, and cancellation. Eligible failures use bounded exponential backoff with jitter. Persisted failures contain only safe code/message, HTTP and timeout categories, retryability, trace/request IDs, attempt, and timestamp.

Required-node failure fails the run and cancels pending nodes. `continueOnFailure` permits independent branches to finish; dependents that need the failed output are skipped and the run becomes `partial_failure`.

`POST /api/v1/orchestrations/runs/:runId/cancel` atomically records `cancel_requested`, cancels unclaimed nodes, and calls the existing invocation cancellation service for linked running invocations. Repeated requests are idempotent and cancellation survives restart.

## Operations, APIs, and console

The shared worker process starts both durable Runtime Gateway work and orchestration scheduling. Configuration is documented in `.env.example`:

- `ORCHESTRATION_WORKER_ENABLED`
- `ORCHESTRATION_WORKER_POLL_INTERVAL_MS`
- `ORCHESTRATION_WORKER_BATCH_SIZE`
- `ORCHESTRATION_WORKER_CONCURRENCY`
- `ORCHESTRATION_NODE_LEASE_MS`
- `ORCHESTRATION_NODE_HEARTBEAT_MS`

Enterprise drain status includes orchestration active, queued, approval-waiting, and expired-lease counts. Active runs block tenant deletion, and all three collections participate in scoped deletion steps. Audit events automatically enter normalized compliance evidence. Metrics use bounded labels and omit IDs.

All endpoints are under `/api/v1/orchestrations`, require Partner authentication, scope every query by organization/workspace, and use bounded pagination, stable sorting, escaped search, and status filters. Serializers omit raw inputs/outputs, snapshots, idempotency hashes, leases, credentials, tokens, and raw invocation responses.

The existing compact console adds definition list/editor/validation, run list, and run detail pages. The run detail displays only safe input summary, progress, trace lineage, attempts, approval state, safe failures, timestamps, and authorized cancellation.

Run the deterministic non-billed gate:

```powershell
npm run verify:orchestration
```

It prepares two in-memory mock passports and delegated-connection references, validates/snapshots a two-node DAG, invokes both nodes through a deterministic Runtime Gateway boundary, verifies output minimization, trace lineage, final output, audits, secret exclusion, replay, cancellation, and cleanup. It performs no provider or database mutation.

## Deferred beyond Phase 13D1

- compensation and saga transactions;
- graphical graph editing;
- cross-organization execution;
- streaming node channels, loops, and dynamic graph mutation;
- global fairness scheduling beyond existing tenant/runtime controls;
- deployment-specific multi-region coordination and disaster-recovery exercises.
