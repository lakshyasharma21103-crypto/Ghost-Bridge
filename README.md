# Ghost Bridge

Ghost Bridge is an open protocol for installing external AI agents into any
compatible Host Application.

**Install external agents into any compatible application.**

An Agent Provider publishes one conforming Native Agent. A Host Application
uses a generic resolver-backed SDK path to verify its Passport, preview profile
and extension compatibility, negotiate authentication, install approved
capabilities, invoke them, observe Tasks and Receipts, and revoke the
Connection. Users enter an opaque Install Grant, never a runtime endpoint or
provider credential.

Core C1-C3 is the universal baseline. Governed Execution G1-G3 adds
organization/workspace policy, authorization, Data Contracts, approval,
idempotent durable execution, and audit evidence. Agent Coordination is
Experimental/Deferred and is not required by either active profile.

## Protocol and Platform

The **Ghost Bridge Protocol** is open and portable: public specification, JSON
Schemas, native wire messages, TypeScript SDK foundations, conformance tools,
and reference examples. It can be implemented without this repository's
commercial control plane.

The **Ghost Bridge Platform** is the first complete implementation: hosted or
privately deployed enterprise installation, orchestration, Runtime Gateway,
organizations/workspaces, RBAC, policy, approvals, recovery, observability,
audit, operations, analytics, and commercial administration. The Platform
implements the Protocol; it is not the only possible implementation.

Protocol `ghostbridge/0.1-draft` is **experimental**, not stable. Phase 15C
adds the first production-oriented issuer, proof, signing-key, revocation,
request-integrity, and receipt-verification trust foundation. It remains a
draft: independent implementation, external security review, and production
certification have not been completed.

- [Protocol entry point](protocol/README.md)
- [0.1-draft specification](protocol/specification/0.1-draft/overview.md)
- [Public JSON Schemas](protocol/schemas/0.1-draft)
- [North Star](docs/NORTH_STAR.md)
- [Universal CodeForge/FlowDesk verifier](scripts/verifyUniversalAgentCompatibility.js)
- [Experimental two-agent example](protocol/examples/two-agent-workflow/README.md)
- [Legacy integration quarantine](docs/legacy/mcp-code-inventory.md)
- [Future benchmark plan](docs/BENCHMARK_PLAN.md)

Ghost Bridge Native has no dependency on MCP and requires no MCP URL. Phase 15
adds no MCP adapter or migration tooling. Historical MCP-specific Platform code
is quarantined for backward compatibility and absent from the public protocol
site and native packages.

Run the deterministic, local, non-billed native verification:

```powershell
npm run verify:ghostbridge-native-protocol
```

This retained Experimental/Deferred regression starts synthetic Invoice and
Accounting agents and exercises
discovery, version negotiation, one-time installation, organization/workspace
isolation, Tasks, Receipts, Data Contracts, scoped delegation, approval,
side-effect idempotency, and revocation, then cleans up its listeners.

## Phase 15B.1 universal compatibility

Phase 15B.1 realigns the primary product model to Host Application → External
Agent. It adds explicit profiles, compatibility and authentication negotiation,
generic grant resolution, independent CodeForge/FlowDesk fixtures, a direct
LedgerWorks/OpsCanvas governed fixture, Core/Governed conformance levels, and
Host-first public documentation and tooling.

```powershell
npm run verify:universal-agent-compatibility
npm run verify:governed-host-agent-compatibility
npm run verify:phase-15b-realignment
```

Read the [Phase 15B.1 completion report](docs/PHASE_15B1_COMPLETION_REPORT.md)
for the complete API, documentation, verification, migration, and retained
experimental-work inventory.

## Phase 15B developer ecosystem

Phase 15B adds the production-draft TypeScript SDK surface, progressive
Capability Discovery, typed errors, a local-only Inspector, a manifest-driven
manifest-driven documentation system, generated `llms.txt` indexes, Extensions,
Registry Preview, GBEP governance, and an agent-development skill pack.

```powershell
npm run generate:docs-index
npm run verify:ghostbridge-sdk
npm run verify:ghostbridge-docs
npm run verify:ghostbridge-inspector
npm run verify:ghostbridge-phase-15b
npm run dev:ghostbridge-inspector -- --target=http://127.0.0.1:PORT
```

Read the [Phase 15B completion report](docs/PHASE_15B_COMPLETION_REPORT.md) for
the route map, SDK/API changes, Inspector restrictions, verification evidence,
safe-cleanup decisions, retained legacy compatibility, and known limitations.

Manual live-provider state is unchanged:

- `verify:gemini-agent` — blocked provider unavailable; never run automatically
- `verify:external-flow` — deferred; never run automatically
- `external.grounded_research` — disabled and non-billable

## Phase 15C trust foundation

Phase 15C adds issuer discovery, Ed25519 public-key discovery, signed Agent
Passports and Capability Manifests, audience and execution-key binding,
rotation and revocation, replay-resistant request integrity, signed Receipts,
Host trust policy, trust inspection, and independent CodeForge/FlowDesk trust
fixtures. Test keys are explicit local fixtures and are rejected in production
mode.

```powershell
npm run verify:ghostbridge-issuer-trust
npm run verify:ghostbridge-key-rotation
npm run verify:ghostbridge-revocation-distribution
npm run verify:ghostbridge-request-integrity
npm run verify:cross-company-trust
npm run verify:ghostbridge-phase-15c
```

These verifiers are deterministic, local, and non-billed. They do not deploy,
publish, contact Gemini, or run external-flow or performance tests. Read the
[Phase 15C completion report](docs/PHASE_15C_COMPLETION_REPORT.md) and
[trust overview](docs/security/trust-overview.md) for the implemented boundary,
verification evidence, and known review gaps.

## Platform implementation history

Phase 14B pilot analytics, product feedback, governed experiments, and adoption optimization are documented in [PILOT_ANALYTICS_ADOPTION.md](PILOT_ANALYTICS_ADOPTION.md).

Phase 14C General Availability controls and commercial operations are documented in [GA_COMMERCIAL_OPERATIONS.md](GA_COMMERCIAL_OPERATIONS.md). The phase adds versioned products, plans, price books, entitlements, authoritative usage, reconciliation-gated invoices, mock/no-op payment and tax adapters, customer lifecycle controls, GA readiness, rollout guardrails, immutable decisions, and safe evidence. Money uses integer minor units; analytics are not invoice authority; grounded research remains commercially blocked.

Phase 13E5 production release governance, deterministic readiness verification,
rollout simulation, manual deployment boundaries, and operator runbooks are documented
in [RELEASE_READINESS.md](./RELEASE_READINESS.md). Phase 13E5 never deploys production
automatically.

Phase 13C2 conditional governance is documented in [POLICY_ENGINE.md](./POLICY_ENGINE.md).
Phase 13C3 secret inventory, encryption-key versioning, bindings, leases, rotation, expiry, revocation, brokered runtime access, and legacy migration are documented in [SECRET_GOVERNANCE.md](./SECRET_GOVERNANCE.md).
Phase 13C4 approval workflows, separation of duties, normalized evidence, tamper-evident chains, retention, legal holds, and evidence packages are documented in [COMPLIANCE_GOVERNANCE.md](./COMPLIANCE_GOVERNANCE.md).
Phase 13C5 organization and workspace lifecycle, maintenance, enterprise identity administration, access reviews, configuration, incidents, tenant export/deletion, recovery, and DR status are documented in [ENTERPRISE_OPERATIONS.md](./ENTERPRISE_OPERATIONS.md).
Phase 13D1 tenant-scoped DAG definitions, secure data mapping, durable multi-agent scheduling, approval resumption, cancellation, and restart recovery are documented in [ORCHESTRATION.md](./ORCHESTRATION.md).
Phase 13D2 tenant-safe installed-agent discovery, conservative schema compatibility, versioned selection policy, deterministic scoring, immutable decisions, and governed orchestration targeting are documented in [AGENT_SELECTION.md](./AGENT_SELECTION.md).
Phase 13D3 versioned data contracts, scoped delegation grants, safe extraction/transformation/redaction/minimization, atomic invocation accounting, and Runtime Gateway execution are documented in [INTER_AGENT_DELEGATION.md](./INTER_AGENT_DELEGATION.md).
Phase 13D4 durable recovery policies, explicit compensation, human intervention, governed replacement/correction, uncertain-outcome containment, and verified checkpoint resume are documented in [ORCHESTRATION_RECOVERY.md](./ORCHESTRATION_RECOVERY.md).
Phase 13D5 orchestration timeline, trace validation, health, critical path, bottlenecks, SLOs, alerts, worker/queue operations, fleet controls, safe diagnostics, retention, and verification are documented in [ORCHESTRATION_OBSERVABILITY.md](./ORCHESTRATION_OBSERVABILITY.md).
Phase 13E1 horizontal worker scaling, deterministic versioned partitions, fencing, tenant fairness, atomic admission quotas, durable backpressure, protected capacity, safe dead letters, and provider-neutral capacity signals are documented in [PRODUCTION_SCALE.md](./PRODUCTION_SCALE.md).
Phase 13E2 governed query shapes, additive indexes, regional cache namespaces, durable invalidation, and resumable projections are documented in [DATA_ACCESS_PERFORMANCE.md](./DATA_ACCESS_PERFORMANCE.md).
Phase 13E3 single-writer regional authority, epoch fencing, failover/failback, regional routing, recovery objectives, backup inventory, isolated restore, and deterministic DR drills are documented in [MULTI_REGION_RESILIENCE.md](./MULTI_REGION_RESILIENCE.md).
Phase 13E4 bounded synthetic load scenarios, performance budgets and baselines, compatible regression checks, safe evidence, and advisory capacity planning are documented in [PERFORMANCE_CAPACITY.md](./PERFORMANCE_CAPACITY.md).

The earlier Agent Passport Runtime Gateway remains the Platform's historical
implementation foundation. Phase 15A preserves those enterprise behaviors
behind the authenticated Console while native protocol DTOs remain independent
of database models and legacy adapters.

Read the complete implementation, architecture, route, security, and verification report in [FINAL_IMPLEMENTATION_REPORT.md](FINAL_IMPLEMENTATION_REPORT.md).

Operational metrics, recovery review, alert rules, privacy boundaries, and dashboard usage are documented in [OPERATIONS.md](OPERATIONS.md). The tracing and safe-diagnostics foundation is documented in [OBSERVABILITY.md](OBSERVABILITY.md). Deterministic invocation states, cancellation, progress, stuck detection, manual recovery, attempts, idempotency, leases, and retry safety are documented in [INVOCATION_LIFECYCLE.md](INVOCATION_LIFECYCLE.md).
Persistent circuit breakers, connection health transitions, runtime capacity bulkheads, graceful shutdown, and ambiguous-outcome containment are documented in [RUNTIME_RELIABILITY.md](RUNTIME_RELIABILITY.md).
MongoDB-backed WorkItems, the dedicated worker, restart recovery, durable retries, ownership fencing, dead letters, and data-minimized operations are documented in [DURABLE_EXECUTION.md](DURABLE_EXECUTION.md).

## Quick Start

```powershell
npm run dev --workspace backend
npm run dev --workspace frontend
npm run dev --workspace external-agent
npm run dev:worker
```

The backend defaults to `http://localhost:5001` and the frontend defaults to `http://localhost:5174`.
Run the durable worker as a separate process; API readiness and worker availability are independent.

## Demo

With a reachable MongoDB instance configured in `Backend/.env`:

```powershell
npm run seed:demo
npm run verify:demo
```

The seed command prints the generated FlowAI Demo partner API key once. The verification command intentionally does not print partner keys, install keys, or runtime grants.

## Developer Sandbox

Available only when the backend runs with `NODE_ENV=development`.

```powershell
npm run seed:sandbox
npm run verify:sandbox
```

The sandbox seeds Developer Sandbox and Research Test Agent against the local mock REST runtime. Its Partner API key is printed only when the partner is first created and cannot be recovered later.

## Durable Recovery Verification

With a reachable non-production MongoDB configured in `Backend/.env`:

```powershell
npm run verify:durable-recovery
```

This verifier uses uniquely scoped linked encrypted Invocation, WorkItem, and outbox records, runs an
injected deterministic worker runtime, simulates reconnect and lease recovery, cleans only its own
fixture records, and blocks unexpected HTTP requests. It makes no external-agent or Gemini request.
Run `verify:gemini-agent` and `verify:external-flow` manually only when billed live verification is
intended.

## Orchestration verification

`npm run verify:orchestration` runs the deterministic non-billed two-agent scenario. Use
`npm run migrate:orchestration` to create the restart-safe orchestration indexes.

## Agent-selection verification

`npm run verify:agent-selection` runs the deterministic non-billed three-agent selection and governed-snapshot scenario. Use `npm run migrate:agent-selection` for restart-safe catalog, policy, decision, approval, and orchestration indexes/backfills.

## Inter-agent delegation verification

`npm run verify:inter-agent-delegation` runs the deterministic non-billed contract-delegation scenario with two local mock agents. Use `npm run migrate:inter-agent-delegation` to add delegation indexes and safely backfill legacy orchestration edges to direct mapping.

## Orchestration-recovery verification

`npm run verify:orchestration-recovery` runs the deterministic non-billed retry, intervention, compensation, governed-replacement, non-reversible-effect, and checkpoint-resume scenario with local mock agents. Use `npm run migrate:orchestration-recovery` for restart-safe recovery-policy, decision, plan, compensation-run, intervention, checkpoint, and orchestration state indexes/backfills. Compensation is an explicit corrective invocation through the Runtime Gateway, not an atomic rollback of an external action.

## Orchestration-observability verification

`npm run verify:orchestration-observability` runs the deterministic non-billed Phase 13D5 observability and operations scenario. Use `npm run migrate:orchestration-observability` for restart-safe timeline, trace, health, SLO, alert, snapshot, fleet-control, and diagnostic-export indexes.

## Production-scale verification

`npm run verify:production-scale` runs the deterministic non-billed Phase 13E1 multi-worker, partition-routing, fencing, fair-scheduling, quota, backpressure, dead-letter, and capacity scenario. Use `npm run migrate:production-scale` to create restart-safe indexes, default partitions, and missing routing metadata without rewriting active work.

## Data-access performance verification

`npm run verify:data-access-performance` runs the deterministic non-billed Phase 13E2 query-governance, cursor, cache, durable invalidation, resumable projection, slow-diagnostic, and index-drift scenario. Use `npm run migrate:data-access-performance` for explicit additive index reconciliation. See [DATA_ACCESS_PERFORMANCE.md](DATA_ACCESS_PERFORMANCE.md) for the authority, consistency, repository, cache, projection, retention, and operations architecture.

## Multi-region disaster-recovery verification

`npm run verify:multi-region-dr` runs the deterministic non-billed Phase 13E3 two-region outage, authority and queue transfer, checkpoint resume, exactly-once recovery, residency denial, backup/isolated-restore, failback, and DR-drill scenario. Use `npm run migrate:multi-region-dr` for additive restart-safe regional indexes and safe defaults. Production cloud routing, DNS, load balancers, database topology, provider failover, and infrastructure fencing remain external runbook actions. See [MULTI_REGION_RESILIENCE.md](MULTI_REGION_RESILIENCE.md).

## Performance and capacity verification

`npm run verify:performance-capacity` runs the deterministic, bounded, non-billed Phase 13E4 load, budget, baseline/regression, fairness, worker fencing, cache, regional simulation, capacity, export, and cleanup scenario. Use `npm run migrate:performance-capacity` for additive restart-safe indexes. Heavy `perf:*` commands are manual-only, production traffic generation is disabled, the shipped staging target is disabled and approval-gated, and local results do not prove production capacity. See [PERFORMANCE_CAPACITY.md](PERFORMANCE_CAPACITY.md).

## Staging and closed-pilot readiness

`npm run verify:staging-pilot-readiness` runs the deterministic, bounded, non-billed Phase 14A staging deployment, smoke-test, capability-gate, synthetic enrollment, quota, observation, restricted launch, feedback-redaction, support, kill-switch, and evidence scenario. Use `npm run migrate:staging-pilot` for additive restart-safe indexes.

Phase 14A does not deploy staging, invite users, send communications, invoke Gemini, or approve production. The current Gemini gate remains provider-unavailable/failed-transient, external-flow remains deferred, and grounded research remains disabled. See [STAGING_PILOT_OPERATIONS.md](STAGING_PILOT_OPERATIONS.md).

## GA commercial readiness

`npm run verify:ga-commercial-readiness` runs the deterministic non-billed Phase 14C catalog, entitlement, subscription, metering, reconciliation, invoice, mock payment, manual tax, renewal, customer-success, readiness, rollout, rollback, evidence, export, isolation, and cleanup scenario. Use `npm run migrate:ga-commercial` for additive restart-safe indexes.

The verifier does not call Gemini, another LLM, a payment or tax provider, email, SMS, accounting, or deployment infrastructure. It does not launch production GA or charge a customer. See [GA_COMMERCIAL_OPERATIONS.md](GA_COMMERCIAL_OPERATIONS.md).
