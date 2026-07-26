# Phase 15C.1 cleanup inventory

Recorded: 2026-07-26

This inventory distinguishes removal from temporary quarantine. A quarantined item remains
in the repository for compatibility or historical inspection but is not loaded by the normal
Core or Governed runtime surface.

| ID | Path/symbol/route/dependency | Active callers | Runtime loading mechanism | Classification | Action | Replacement | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | `Backend/` directory spelling | Root npm workspace, scripts, documentation | npm workspace discovery and filesystem paths | superseded | Renamed with the two-step Git operation to canonical `backend/` | `backend/` | `verify:phase-15c1-cleanup` enumerates root directories and rejects aliases or stale active references |
| C-002 | Manual backend `node --check file1 ...` build/lint lists | Backend npm scripts | `backend/package.json` scripts | duplicate_with_canonical_replacement | Removed the lists from scripts | `backend/scripts/checkJavaScript.js` recursively checks all backend source/script JavaScript | Build reports 463 checked files |
| C-003 | `POST /api/v1/connections/:id/import-mcp-tools` | No normal caller | Conditional Express registration | quarantine_temporarily | Disabled by default; mounted only with `LEGACY_MCP_ENABLED=true` | Native REST/HTTP runtime path | `backend/src/routes/connectionRoutes.js`; default-off test coverage |
| C-004 | `backend/src/services/adapters/mcpAdapter.js` and MCP Passport validation | Historical direct adapter tests | Lazy/conditional registry and validator branch | quarantine_temporarily | Retained for historical compatibility; unavailable by default | Native runtime adapters | `backend/src/services/adapters/index.js`, `backend/src/services/passportValidator.js`, `backend/src/tests/mcpAdapter.test.js` |
| C-005 | `/api/v1/inter-agent-contracts/*` and `/api/v1/inter-agent-delegations/*` | No normal Core/Governed caller | Conditional Express registration | quarantine_temporarily | Disabled by default behind `EXPERIMENTAL_AGENT_COORDINATION_ENABLED` | Host-controlled orchestration and direct Host→Agent invocation | `backend/src/routes/index.js` |
| C-006 | `frontend/src/pages/DelegationGrant*.jsx` and `DelegationInvocation*.jsx` | No active route or navigation item | None in the primary React router | quarantine_temporarily | Removed active imports, routes, and navigation; retained source pending persisted-data review | Host orchestration pages and Data Contracts | `frontend/src/App.jsx`, `frontend/src/components/Sidebar.jsx`, frontend quarantine test |
| C-007 | Native Agent `registerDelegation` method/type | Former two-agent fixture only | Public object method and declaration | superseded | Removed from runtime API and declaration | No direct authority transfer; Host remains caller | `packages/ghostbridge-native-agent/src/index.js`, `src/index.d.ts` |
| C-008 | Unsupported Platform discovery endpoint declarations | Remote Native clients | `/.well-known/ghostbridge` response | superseded | Removed from discovery | Empty public endpoint map until Stage B routes exist | `backend/src/routes/nativeProtocolRoutes.js`, integration consistency test |
| C-009 | `frontend/src/pages/TrustConsole.jsx` | Five authenticated console routes | React router | keep_and_document | Retained and explicitly labeled as a static demo placeholder | Future scoped trust administration APIs | Visible placeholder statement; no operational claim |
| C-010 | `backend/scripts/migrate*.js` | Repository state reconstruction and operator workflows | Explicit npm migration scripts only | historical_migration | Retained; no migration executed | None | Baseline migration inventory |
| C-011 | Durable Host orchestration, recovery, compensation, queues, and workers | Platform control plane | Express routes, services, worker entry point | keep | Retained | None; this is Host-controlled orchestration, not direct A2A authority transfer | Backend tests and orchestration verifiers |
| C-012 | Legacy `/passports/resolve` installation implementation | Current Add External Agent UI | Authenticated backend Passport route | human_review_required | Hardened principal scope, but not deleted | Canonical public Native installation service still required | `backend/src/controllers/passportController.js`; Stage B blocker |
| C-013 | Runtime validators, JSON Schemas, `.d.ts` files, and TypeScript wire declarations | Public packages, docs, conformance | Package exports and schema loader | human_review_required | Retained pending generated-source migration | One canonical generated protocol source | Package-integrity passes, but generated declaration/runtime comparison is incomplete |
| C-014 | `protocol/examples/two-agent-workflow/` | No active readiness caller | None; retained fixture source | quarantine_temporarily | Removed from primary Native aggregate; experimental command now verifies isolation rather than direct delegation | `verify:ghostbridge-native-protocol` runs black-box Host→Agent conformance | Root `package.json`, `scripts/verifyGhostBridgeNativeProtocol.js` |
| C-015 | Raw black-box Host/Agent fixtures | Phase 15C.1 conformance verifier | Separate Node child process and HTTP serialization | keep | Added and retained | Future complete conformance CLI/matrix | Four stable checks and redacted JSON transcript |
| C-016 | Agent Coordination schemas, package constants, backend models, migrations, and old verifier | Experimental/historical code only | Default-off flag or explicit experimental command | quarantine_temporarily | Isolated from discovery, Native Agent API, primary nav, and active aggregate | Future clearly named experimental package/location | Cleanup and platform-truth verifiers |
| C-017 | `packages/ghostbridge-trust/src/nodeTransport.js` and `backend/src/utils/safeFetch.js` | Trust SDK and Platform backend respectively | Explicit server transport and backend utility imports | keep_and_document | Retained as separate bounded implementations because the public SDK cannot depend on Platform code | Possible future portable network-safety primitive package | Both pin validated addresses; network/security test suites pass |
| C-018 | Primary frontend MCP creation option and “supported” status text | Create Passport and Settings pages | Active React pages | obsolete | Removed MCP selection and false support claim from active UI | REST runtime; MCP reported quarantined | `frontend/src/pages/CreatePassport.jsx`, `frontend/src/pages/Settings.jsx` |

## Exact removal summary

- Files deleted: none.
- Directories deleted: none.
- Directory renamed: `Backend/` → `backend/`.
- Public runtime method/type removed: `GhostBridgeAgent.registerDelegation`.
- Default route registrations removed: MCP import and inter-agent contract/delegation
  surfaces listed above.
- Primary navigation items removed: `Delegation Grants`, `Delegation Invocations`.
- Dependencies removed: none.
- Environment variables removed: none.

No finding is classified as removed while still present. Items needing broader caller,
persisted-data, protocol-generation, or product review remain explicitly quarantined or marked
`human_review_required`.
