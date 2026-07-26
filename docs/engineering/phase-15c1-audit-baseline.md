# Phase 15C.1 audit baseline

Recorded: 2026-07-26 (Asia/Calcutta)

## Source state

- Branch: `main`
- Commit: `a2a2be4c165550342bfd1bf271e3f6d63ec5c17b`
- Initial `git status --short`: clean (no modified or untracked files)
- Repository directory at baseline: `Backend/`; root npm workspace entry: `backend`
- Environment: Windows/PowerShell, Node.js workspace dependencies already present
- No deployment, publication, migration, production-database, live-provider, external-agent,
  load, stress, soak, regional, staging-performance, billed, real-KMS, real-identity-provider,
  or payment command was run.

The first combined inspection command returned a non-zero status after attempting to search
nonexistent `Backend/test`, `Backend/tests`, and `Backend/src/index.js` paths. Its useful output
completed before that point. Test discovery was subsequently confirmed under
`Backend/src/tests`. No build or product failure was inferred from that inspection error.

## npm workspace inventory

| Workspace | Package | Purpose |
| --- | --- | --- |
| `frontend` | `frontend` | React/Vite Platform UI |
| `backend` (`Backend/` at baseline) | `backend` | Express/Mongoose Platform backend |
| `external-agent` | `external-agent` | External Agent implementation |
| `packages/ghostbridge-protocol-core` | `@ghostbridge/protocol-core` | Wire validators, schemas, canonicalization |
| `packages/ghostbridge-trust` | `@ghostbridge/trust` | Trust verification and policy |
| `packages/ghostbridge-issuer` | `@ghostbridge/issuer` | Issuer utilities |
| `packages/ghostbridge-native-client` | `@ghostbridge/native-client` | Native Host client |
| `packages/ghostbridge-native-agent` | `@ghostbridge/native-agent` | Native Agent runtime |
| `packages/ghostbridge-conformance` | `@ghostbridge/conformance` | Protocol conformance |
| `packages/ghostbridge-inspector` | `@ghostbridge/inspector` | Local inspector |
| `protocol/examples/invoice-agent` | `@ghostbridge/example-invoice-agent` | Agent example |
| `protocol/examples/accounting-agent` | `@ghostbridge/example-accounting-agent` | Agent example |
| `protocol/examples/codeforge-agent-provider` | `@ghostbridge/example-codeforge-provider` | Issuer/Agent example |
| `protocol/examples/flowdesk-host` | `@ghostbridge/example-flowdesk-host` | Host example |

All package manifests and package `exports` were inspected. The seven public
`@ghostbridge/*` packages export `.` with `types`, `require`, and `default` entries pointing at
`src/index.d.ts` and `src/index.js`; the two provider/Host examples with exports expose their
CommonJS source. Application workspaces do not declare package exports.

## Package dependency graph

```text
backend -> protocol-core
conformance -> native-client, protocol-core, trust
inspector -> native-client, protocol-core, trust
issuer -> protocol-core, trust
native-agent -> protocol-core, trust
native-client -> protocol-core, trust
native-client (dev) -> native-agent
trust -> protocol-core
accounting-agent -> native-agent, protocol-core
invoice-agent -> native-agent, protocol-core
codeforge-provider -> issuer, native-agent, protocol-core, trust
flowdesk-host -> native-client, protocol-core, trust
```

The remaining application dependencies are third-party runtime or build dependencies declared
in their respective manifests. Internal package versions used exact `0.1.0-draft` references at
baseline rather than `workspace:*`.

## Build and test scripts

The root aggregates `build`, `typecheck`, `lint`, and `test` across workspaces. Each public
package exposes `build`, `typecheck`, `lint`, and `test`. Backend, frontend, external-agent, and
each protocol example expose their own applicable scripts.

Backend `build` and `lint` used long hand-maintained `node --check` file lists at baseline.
Backend tests use Node test discovery (`node --test`). Root `test` invokes each workspace test
explicitly. Test inventory at baseline:

- Backend: 50 `*.test.js` files under `Backend/src/tests`
- Frontend: 16 under `frontend/tests`
- External Agent: 4 under `external-agent/tests`
- Public packages: one test file in each of the seven package test directories
- Protocol examples: one test file in each example test directory

Deterministic verifier registrations live in root `package.json` and backend `package.json`.
Phase 15B/15C, SDK, documentation, inspector, trust, key-rotation, revocation,
request-integrity, cross-company, orchestration, recovery, operations, governance, readiness,
and compatibility commands were present. Live and performance commands are separately named.

## HTTP route inventory

`Backend/src/routes/index.js` mounts:

- `/.well-known/ghostbridge`
- health/readiness routes
- `/api/v1/native`
- passports, partner, connections, invocations, audit logs, operations, enterprise identity,
  policies, secrets, approvals, evidence, enterprise operations
- orchestrations, agent discovery/selection, inter-agent contracts/delegations
- production scale, data performance, regional resilience, performance, releases, launch,
  pilot analytics, commercial, and GA routes
- development-only demo and developer-sandbox routes

At baseline, the Native router implemented only `/status` and `/metrics`, while discovery
advertised additional protocol URLs. The connection router also exposed the active
`/:id/import-mcp-tools` route. Direct inter-agent delegation routes were mounted normally.

Frontend route/navigation inspection found active Delegation Grant and Delegation Invocation
pages, five Trust Console routes backed by a static placeholder, MCP-specific Passport and
invocation presentation, and Host orchestration surfaces.

## Workers, queues, migrations, and registries

- Worker entry point: `Backend/src/worker.js`
- Durable work, runtime work items, attempts, event outbox, scheduling, orchestration, recovery,
  and queue producers/consumers are implemented through backend models/services and the worker
  entry point.
- Migration loader registrations are in root and backend package scripts.
- Eighteen backend migration scripts were present, covering policy, secret/compliance,
  enterprise operations, orchestration, agent selection/delegation/recovery/observability,
  production scale, data performance, regional resilience, capacity/readiness/pilot/GA, and
  Ghost Bridge trust.
- Historical migrations were treated as retained reconstruction evidence during baseline.

## Schema and documentation pipelines

- Protocol JSON Schemas: `protocol/schemas/0.1-draft`
- Runtime schema loading: `packages/ghostbridge-protocol-core/src/index.js`
- Hand-maintained declarations: each public package `src/index.d.ts`
- Documentation generator: `scripts/generateGhostBridgeDocsIndex.mjs`
- Documentation drift verifier: `scripts/verifyGhostBridgeDocs.mjs`
- Generated documentation outputs are checked by the docs verifier.

## Configuration and secret-safety inspection

Root and backend `.gitignore` files ignore `.env`, nested environment files, dependencies,
build output, logs, caches, and local inspector artifacts while allowing `.env.example`.
Examples exist at:

- `Backend/.env.example`
- `frontend/.env.example`
- `external-agent/.env.example`

Only variable names were emitted during inspection; values were not printed. The examples
cover database/session/encryption/runtime/worker/operations settings, frontend public URLs,
and external-agent/provider fixture settings. Tracked-secret scanning and placeholder
validation remain part of the Phase 15C.1 security batch.

## Baseline failures and limitations

- Initial Git state was clean.
- The confirmed `loadReservedInvocation` temporal-dead-zone defect was present.
- Windows case-insensitive filesystem behavior requires a two-step Git rename for `Backend/`.
- No local MongoDB availability was assumed or tested during baseline.
- No live or billed validation was run.
