# Agent Passport Runtime Gateway

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
