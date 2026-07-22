# Agent Passport Runtime Gateway

Phase 13C2 conditional governance is documented in [POLICY_ENGINE.md](./POLICY_ENGINE.md).
Phase 13C3 secret inventory, encryption-key versioning, bindings, leases, rotation, expiry, revocation, brokered runtime access, and legacy migration are documented in [SECRET_GOVERNANCE.md](./SECRET_GOVERNANCE.md).
Phase 13C4 approval workflows, separation of duties, normalized evidence, tamper-evident chains, retention, legal holds, and evidence packages are documented in [COMPLIANCE_GOVERNANCE.md](./COMPLIANCE_GOVERNANCE.md).
Phase 13C5 organization and workspace lifecycle, maintenance, enterprise identity administration, access reviews, configuration, incidents, tenant export/deletion, recovery, and DR status are documented in [ENTERPRISE_OPERATIONS.md](./ENTERPRISE_OPERATIONS.md).
Phase 13D1 tenant-scoped DAG definitions, secure data mapping, durable multi-agent scheduling, approval resumption, cancellation, and restart recovery are documented in [ORCHESTRATION.md](./ORCHESTRATION.md).
Phase 13D2 tenant-safe installed-agent discovery, conservative schema compatibility, versioned selection policy, deterministic scoring, immutable decisions, and governed orchestration targeting are documented in [AGENT_SELECTION.md](./AGENT_SELECTION.md).
Phase 13D3 versioned data contracts, scoped delegation grants, safe extraction/transformation/redaction/minimization, atomic invocation accounting, and Runtime Gateway execution are documented in [INTER_AGENT_DELEGATION.md](./INTER_AGENT_DELEGATION.md).
Phase 13D4 durable recovery policies, explicit compensation, human intervention, governed replacement/correction, uncertain-outcome containment, and verified checkpoint resume are documented in [ORCHESTRATION_RECOVERY.md](./ORCHESTRATION_RECOVERY.md).
Phase 13D5 orchestration timeline, trace validation, health, critical path, bottlenecks, SLOs, alerts, worker/queue operations, fleet controls, safe diagnostics, retention, and verification are documented in [ORCHESTRATION_OBSERVABILITY.md](./ORCHESTRATION_OBSERVABILITY.md).

One key to discover, connect, and invoke any compatible AI agent.

Agent Passport Runtime Gateway lets a partner platform register an Agent Passport, issue a one-time install key, and let a receiving platform resolve that key into a usable runtime connection. REST runtime invocation is available in v1.

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
