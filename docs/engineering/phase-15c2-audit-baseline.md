# Phase 15C.2 Platform Native Client audit baseline

Baseline commit: `5bb5980ed4abfafe50373819f879b721fd60565d`

Branch: `phase-15c2`

Audit date: 2026-07-27

Status at baseline: **FAIL**. The public `@ghostbridge/native-client` package existed and
was covered independently, but the Platform did not use it for its production Agent
operations. Unit coverage of either side did not make the Platform path conformant.

## Production path inventory

| Operation | Caller and entry point | Implementation | Transport / authentication | Trust, revocation, and Receipt verification | Native Client | Production reachable | Required correction |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Install-key / Passport resolution | `POST /api/v1/passports/resolve` → `passportController.resolvePassportInstallKey` | `backend/src/controllers/passportController.js`, `backend/src/services/connectionService.js` | Direct MongoDB resolution; Partner API key or development principal | Local Passport validator and stored status; no public Trust Node or signed revocation proof; no Receipt | No | Yes | Use a principal-scoped Native Client installation path; make the legacy resolver fixture-only. |
| Capability discovery | `GET /api/v1/agent-discovery/capabilities` → `agentSelectionController.listCapabilities` | `backend/src/services/agentSelection.service.js` | Direct MongoDB reads from `PassportConnection`, `AgentPassport`, `Capability`, and `CapabilityCatalogEntry`; Partner API key | Stored lifecycle/trust-tier fields; no live signed discovery, Trust, or revocation proof | No | Yes | Discover the Agent and its capabilities through the Native Client; isolate the database catalog as a development fixture/cache, not protocol truth. |
| Agent discovery | `GET /api/v1/agent-discovery/agents[/:connectionId]` | `backend/src/services/agentSelection.service.js` | Direct protocol-store/catalog reads; Partner API key | Stored health and trust flags only | No | Yes | Route public Agent discovery through the Native Client and return bounded verified data. |
| Compatibility check | `POST /api/v1/agent-discovery/compatibility/check` | `backend/src/services/agentSelection.service.js`, `schemaCompatibility.service.js` | Platform-local schema assertions over stored or client-supplied contracts | No live Agent identity or trust binding | No | Yes | Obtain the authoritative capability contract through the Native Client before Platform-local comparison. |
| Connection health / direct Agent call | `POST /api/v1/connections/:id/health` | `backend/src/services/connectionService.js`, REST/MCP adapters | Direct Agent health/runtime endpoint; stored credential lease | Stored Passport/Connection status; no Native Client Trust or revocation path | No | Yes | Replace protocol health/discovery checks with Native Client discovery and revocation checks; isolate legacy probes. |
| Synchronous invocation | `POST /api/v1/connections/:id/invoke` → `runtimeGateway.invoke` | `backend/src/services/runtimeGateway.service.js`, `backend/src/services/adapters/*` | Direct REST or MCP transport; Partner identity is mixed with client-supplied user/workspace fields; stored credential lease | Platform authorization/policy and local rows; response Receipt is Platform-generated evidence rather than Agent protocol proof | No | Yes | Invoke with the public Native Client using a sealed, principal-scoped Connection binding and live Agent contract/trust state. |
| Durable/asynchronous invocation | durable worker, orchestration scheduler/recovery, inter-Agent delegation, retry control → `runtimeGateway.invoke` | `backend/src/services/durableWorker.service.js`, `orchestrationScheduler.service.js`, `orchestrationRecovery.service.js`, `interAgentDelegation.service.js`, `invocationControl.service.js` | In-process call into the same direct REST/MCP gateway | Platform invocation/task rows are treated as runtime truth; no Agent Task or Receipt proof | No | Yes | Make legacy adapters production-ineligible; new protocol tasks must use Native Client Task and Receipt operations. |
| Task/invocation status and result | `GET /api/v1/invocations/:id`, `/attempts` | `backend/src/services/runtimeGateway.service.js` | Direct MongoDB reads | Local invocation/attempt/evidence rows; no Agent Task/Receipt comparison | No | Yes | Use Native Client `getTask` and `getReceipt`; compare the signed terminal Receipt with the Task and requested scope. |
| Cancellation | `POST /api/v1/invocations/:id/cancel` | `backend/src/services/invocationControl.service.js`, runtime adapters/service lifecycle | Local abort plus optional direct adapter cancellation | Local state transition can be terminal without an Agent-signed Receipt | No | Yes | Use Native Client `cancelTask`; require a terminal Agent Task and verified cancellation Receipt. |
| Manual retry / resolution | `POST /api/v1/invocations/:id/retry|resolve` | `backend/src/services/invocationControl.service.js` | In-process call to `runtimeGateway.invoke` or local state mutation | Local rows and operator decision | No | Yes | Keep as internal operational history only; prohibit it from substituting for Agent protocol proof. |
| Approval creation/decision | `/api/v1/approvals/*` | `backend/src/services/approval.service.js` | Platform database workflow; Partner API key | Platform action fingerprints exist, but no Native Client continuation to the Agent | No | Yes | Continue an Agent challenge through Native Client `submitApprovalDecision` and re-invoke only the sealed exact action; reject replay. |
| Receipt retrieval | invocation/evidence APIs and runtime finalization | `backend/src/services/runtimeGateway.service.js`, `evidence.service.js` | Direct MongoDB reads | Manual/local evidence digest and receipt mapping; no Agent signature verification | No | Yes | Retrieve with Native Client `getReceipt`, validate issuer/audience/scope/task, and verify output/evidence digests. |
| Trust and revocation administration | Trust console/services and connection checks | `backend/src/services/ghostBridgeTrust.service.js`, `connectionService.js`, Trust models | Direct Trust records and database state; some public trust library usage exists outside the Agent operation path | Stored freshness/status can be accepted without a live Native Client operation | No | Yes | Configure Native Client Trust Node verification and require fresh signed revocation evidence for every Agent operation. |
| Platform Native protocol server | `/.well-known/ghostbridge`, `/api/v1/native/*` | `backend/src/routes/nativeProtocolRoutes.js`, `nativeProtocolMapping.service.js` | In-process Platform route/mapping | Advertises no Agent-operation endpoints at baseline | No (server side) | Yes | Retain as the Platform's truthful server surface; do not confuse it with the Platform Host client path. |

## Authentication and authority baseline

- `authenticateHostPrincipal` correctly strips the Partner API-key hash before attaching
  the Partner principal and only permits development identity fixtures with both an
  environment flag and request header.
- `passportController.installationPrincipal` derives installation user authority from
  the authenticated principal and rejects user/workspace/organization mismatches.
- Invocation controllers still populated authoritative-looking actor fields directly from
  `request.body.receivingUserId` and `request.body.receivingWorkspaceId`.
- The legacy Connection routes had no router-level Host authentication middleware.
- Agent protocol authentication was performed by individual REST/MCP adapters rather than
  one Native Client boundary.

## Baseline shortcut classification

The following are production-reachable protocol shortcuts at baseline:

1. direct `runtimeGateway` REST/MCP invocation;
2. direct adapter cancellation and health probes;
3. database capability/passport discovery;
4. database Task/invocation rows used as Agent truth;
5. Platform-generated execution evidence used in place of an Agent-signed Receipt;
6. approval decisions consumed by the Platform without a Native Client continuation;
7. internal orchestration/worker imports of `runtimeGateway.invoke`.

They must either be replaced by the Platform Native Client adapter or become explicitly
fixture-only and production-ineligible. No baseline path is marked PASS.
