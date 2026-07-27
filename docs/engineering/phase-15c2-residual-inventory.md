# Phase 15C.2 residual protocol-path inventory

Status date: 2026-07-27

This inventory is intentionally broader than the new Native Client API. A
remaining implementation is not considered migrated merely because production
now rejects it.

| Remaining path | Files / callers | Direct or duplicated behavior | Production eligibility after Phase 15C.2 | Disposition |
| --- | --- | --- | --- | --- |
| Legacy Passport install-key resolution | `passportRoutes.js`, `passportController.js`, `connectionService.resolveInstallKey` | Reads install keys, Passports, capabilities, and Connections from MongoDB | **Prohibited.** Route requires explicit development fixture eligibility and service fails closed in production. | Retained only for deterministic legacy fixtures. |
| Legacy capability and Agent catalog | `agentDiscoveryRoutes.js`, `agentSelection.service.js`, `agentSelectionEngine.service.js` | Builds discovery/selection results from Platform database rows | **Prohibited as Agent discovery.** Routes are fixture-only and catalog refresh fails closed in production. | May remain as a development fixture and non-authoritative catalog implementation. |
| Legacy direct health probe and MCP import | `connectionRoutes.js`, `connectionService.checkConnectionHealth`, `runtimeGateway.importMcpTools` | Calls declared health/runtime endpoints or imports MCP tools without the Native Client operation path | **Prohibited.** Routes are fixture-only; direct health service fails closed in production. | Retained for development compatibility only. |
| Legacy REST/MCP invocation adapters | `runtimeGateway.service.js`, `services/adapters/*`, Connection invoke route | Calls Agent runtime endpoints directly and records Platform invocation evidence | **Prohibited.** Route is fixture-only and `runtimeGateway.invoke` fails closed in production. | Retained for deterministic legacy tests; not Agent protocol truth. |
| Legacy worker/orchestration calls into the runtime gateway | `durableWorker.service.js`, `orchestrationScheduler.service.js`, `orchestrationRecovery.service.js`, `interAgentDelegation.service.js` | Imports the direct runtime gateway in-process | **No successful production Agent call.** The shared gateway production guard rejects before adapter admission. | Future orchestration migration may call the Platform Native Client adapter directly; current path fails closed. |
| Legacy invocation status, retry, resolution, and cancellation | `invocationRoutes.js`, `invocationControl.service.js`, `runtimeGateway.service.js` | Reads/mutates Platform invocation and attempt rows and may call adapter cancellation | **Prohibited as protocol operations.** Routes are fixture-only; direct cancellation fails closed in production. | Historical rows may remain operational history but never substitute for Agent Task/Receipt proof. |
| Platform-local Approval workflow | `approval.service.js`, Approval controllers/routes/models | Creates and records Platform governance approvals | **Production eligible only as Platform policy workflow.** It does not continue an Agent challenge by itself. | Agent exact-action continuation is exclusively exposed through `/platform-native/approvals/continue`, sealed binding, and durable replay consumption. |
| Platform invocation/evidence records | `runtimeGateway.service.js`, `evidence.service.js`, invocation/evidence models | Stores local attempts, evidence, and historical receipts | **Production eligible only as Platform operational history.** It is not accepted by the Native Client adapter as Agent proof. | Native operations retrieve and verify signed Agent Receipts. |
| Partner legacy Passport administration | `partnerService.js`, `passportValidator.js`, Partner and developer-sandbox routes | Validates `agent-passport.v1` JSON and stores Passport/capability metadata directly | **Production reachable management plane; not used by the Native Client operation path.** Developer sandbox remains development-scoped. | Retained for pre-existing Partner administration. It must not be presented as signed native Agent discovery or Trust proof. |
| Platform Trust administration/cache | `ghostBridgeTrust.service.js` and Trust models/routes | Reads and writes Platform Trust policy, review, cache, and audit state | **Production reachable administration plane.** | The Native Client adapter still requires public cryptographic verification and fresh signed revocation evidence; stored rows alone do not authorize an Agent operation. |
| Platform native protocol server surface | `nativeProtocolRoutes.js`, `nativeProtocolMapping.service.js` | Implements the Platform acting as a protocol server | **Production eligible and not a Host-client shortcut.** | Retained; server responsibilities are distinct from the Platform Native Client adapter. |
| Public Native Client Fetch transport | `packages/ghostbridge-native-client/src/index.js` | Generic browser-compatible transport exists beside the explicit Node pinned transport | **Not used by the Platform adapter.** Trust-required insecure Fetch is rejected by the package. | Retained as a public client feature. Platform always constructs the explicit Node security transport. |
| Deterministic native Agent/provider fixtures | `protocol/examples/codeforge-agent-provider`, Platform Native Client tests | Runs a local signed Agent and loopback transport | **Prohibited outside development and requires request opt-in.** | Retained to prove the real public Client code path without external services. |

## Production shortcut conclusion

No known production-reachable Agent discovery, invocation, Task, Approval
continuation, cancellation, Receipt, or revocation operation can successfully
use the listed legacy direct paths after Phase 15C.2. Route gates and
service-level guards provide separate enforcement.

The production-reachable Partner, Trust, history, and protocol-server entries
above are management/storage/server responsibilities, not substitutes for the
Host Native Client operation path. This conclusion is locally tested but is
not a Phase PASS claim: the mandatory GitHub Actions and MongoDB replica-set
gates remain unobserved.
