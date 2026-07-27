# Phase 15C.2 implementation report

## Status

**INDEPENDENT-REVIEW CORRECTIONS COMMITTED AND PUSHED; NOT PASS.**

Independent review identified production-authorization,
cross-request anti-rollback, and Task scope-binding blockers in commit
`60839a0d21364228f2a2894344b9a0a83a68bb38`. All three blockers are corrected
in commit `9e3262da52cc231637dae679b0c3f7d6914583f2`, and both Phase 15C.2 commits
are pushed to `phase-15c2`. Required local non-database commands passed. No
Phase 15C.2 pull request exists yet, no Phase 15C.2 GitHub Actions matrix has
run, and MongoDB replica-set gates remain unobserved in Phase 15C.2 CI. Phase
15C.2 remains **NOT PASS** until mandatory CI succeeds.

## Repository baseline

- Branch: `phase-15c2`
- Starting base: `5bb5980ed4abfafe50373819f879b721fd60565d`
- Initial Phase 15C.2 commit:
  `60839a0d21364228f2a2894344b9a0a83a68bb38`
- Independent-review correction commit:
  `9e3262da52cc231637dae679b0c3f7d6914583f2`
- Both Phase 15C.2 commits are committed and pushed to `phase-15c2`.
- Baseline audit: `docs/engineering/phase-15c2-audit-baseline.md`
- No new branch or pull request was created, and no merge, publish,
  deployment, migration, external-provider invocation, or performance suite
  was performed.

## Independent-review corrections

### Production authorization

Every discovery, installation, invocation, Approval continuation, Task
status/result, cancellation, Receipt retrieval/verification, and revocation
request now receives an operation-specific decision from the existing
production authorization service. The adapter requires complete ALLOW
evidence from RBAC and active-policy evaluation and binds it to a canonical
digest covering the authenticated subject, organization, workspace, Agent,
Passport, Connection, invocation, capability/version, input digest, and
Approval reference where applicable.

The resulting policy-decision reference is sealed with the invocation and
Task binding and is included in the Agent-signed Receipt. Caller-supplied
authorization references are ignored. Missing, malformed, denied,
cross-action, or development-fixture evidence fails closed. Simplified
authorization exists only for explicit development Native Client fixtures
with both environment and request opt-ins.

### Cross-request Trust continuity

The Platform adapter owns shared `AntiRollbackStore`, `RevocationCache`, and
`PlatformTrustContinuityStore` instances and injects them into every newly
constructed public Native Client. Sealed Connection evidence additionally
records issuer metadata sequence/digest and signed revocation
sequence/digest/predecessor digest.

Every later bound operation compares live cryptographically verified state
with both the shared Platform state and sealed prior evidence. Lower
sequences, same-sequence digest changes, non-contiguous revocation updates,
bad predecessor digests, missing mandatory prior evidence, and stale or
unknown state fail closed.

### Complete Task binding

Native Agent Task responses now carry organization, workspace, Connection,
Agent, Passport version, invocation, capability key/version, and Approval
reference where applicable. The Platform validates every field before
returning either non-terminal or terminal Task state.

## Files changed

### Platform integration and isolation

- `backend/src/controllers/platformNativeClientController.js`
- `backend/src/middleware/requireLegacyProtocolFixture.js`
- `backend/src/models/NativeClientApprovalReplay.js`
- `backend/src/routes/agentDiscoveryRoutes.js`
- `backend/src/routes/connectionRoutes.js`
- `backend/src/routes/index.js`
- `backend/src/routes/invocationRoutes.js`
- `backend/src/routes/passportRoutes.js`
- `backend/src/routes/platformNativeClientRoutes.js`
- `backend/src/services/agentSelection.service.js`
- `backend/src/services/connectionService.js`
- `backend/src/services/invocationControl.service.js`
- `backend/src/services/platformNativeClient.service.js`
- `backend/src/services/runtimeGateway.service.js`
- `backend/src/config/env.js`
- `backend/src/utils/errorCodes.js`

### Package and fixture support

- `backend/package.json`
- `package.json`
- `package-lock.json`
- `packages/ghostbridge-native-client/src/index.js`
- `packages/ghostbridge-native-client/src/index.d.ts`
- `packages/ghostbridge-native-agent/src/index.js`
- `packages/ghostbridge-protocol-core/src/index.d.ts`
- `protocol/schemas/0.1-draft/invocation.schema.json`
- `protocol/schemas/0.1-draft/task.schema.json`
- `protocol/examples/codeforge-agent-provider/src/index.js`

### Tests, verification, CI, and documentation

- `backend/scripts/verifyDemo.js`
- `backend/scripts/verifySandbox.js`
- `backend/src/tests/platformInstallationAuth.test.js`
- `backend/src/tests/appLoad.test.js`
- `backend/src/tests/platformNativeClient.test.js`
- `backend/src/tests/platformNativeClientAuthority.test.js`
- `backend/src/tests/securityFoundation.test.js`
- `scripts/verifyPhase15c2.mjs`
- `.github/workflows/phase-15c2.yml`
- `docs/engineering/phase-15c2-audit-baseline.md`
- `docs/engineering/phase-15c2-implementation-report.md`
- `docs/engineering/phase-15c2-residual-inventory.md`

## Architecture before and after

Before Phase 15C.2, production Platform operations used database-backed
Passport/capability discovery, direct REST/MCP runtime adapters, local Task
and invocation rows, and Platform evidence as protocol truth. The public
Native Client existed only as a package and independent test surface.

After Phase 15C.2, the Host-facing Platform path is:

`authenticated principal -> Platform adapter -> @ghostbridge/native-client
-> explicit pinned Node security transport -> Agent endpoints -> public
schema/trust/revocation/Receipt verification -> bounded Platform result`

The adapter is the only new Platform integration layer. It does not copy the
Native Client implementation. It seals target, Connection, Task, and Approval
bindings with a Platform HMAC so client-supplied identifiers remain
confirmations rather than authority. Approval replay consumption is atomic in
MongoDB and persists only a digest of the replay key.

The new authenticated routes are mounted at `/api/v1/platform-native`:

- discovery and installation;
- invocation;
- Task status, result, and cancellation;
- exact-action Approval continuation;
- Receipt retrieval and verification;
- revocation checking.

## Platform paths migrated

- Agent discovery and protocol negotiation
- Passport, manifest, capability, issuer, and revocation verification
- installation grant redemption and Connection creation
- synchronous invocation and asynchronous Agent Task creation
- Task status/result retrieval
- exact-action Approval continuation
- Task cancellation with a signed terminal Receipt
- Receipt retrieval, signature/audience/binding/digest verification
- current revocation checking

The invocation result binds invocation, Connection, Agent, Passport,
capability, organization, workspace, canonical input digest, input contract,
policy decision, approval, hashed idempotency reference, Trust/revocation
evidence, and Receipt reference.

## Shortcuts removed or isolated

- Legacy database discovery routes are development-fixture-only.
- Legacy install-key resolution is development-fixture-only.
- Legacy direct health, REST/MCP invocation, MCP import, invocation status,
  retry, resolution, and cancellation routes are development-fixture-only.
- `runtimeGateway.invoke`, direct cancellation, catalog refresh, install-key
  resolution, and direct health probes fail with
  `PLATFORM_NATIVE_CLIENT_REQUIRED` in production even if called in-process.
- Fixture transport requires `NODE_ENV=development`, the corresponding
  environment flag, and an explicit request header. Production rejects it.

The retained legacy implementation is catalogued in the residual inventory;
it is not silently treated as migrated code.

## Authentication and authority behavior

- `authenticateHostPrincipal` establishes Platform user or Partner authority.
- Authentication and organization/workspace membership do not constitute
  capability authorization.
- Operation-specific production permissions are `passport.read`,
  `connection.create`, `connection.invoke`, `invocation.read`,
  `invocation.cancel`, and `connection.read`.
- The existing authorization service must return authoritative RBAC and
  active-policy ALLOW evidence bound to the exact canonical action digest.
- Platform user/Partner authentication remains separate from Agent protocol
  authentication.
- Organization, workspace, user, Agent, capability, and Connection values in
  request bodies only confirm principal-scoped sealed bindings.
- Partner API-key hashes are not attached to request principals.
- Agent authentication is supplied through the Native Client session and its
  explicit transport; there is no unauthenticated fallback.
- Development Native Client fixtures additionally require
  `X-GhostBridge-Native-Client-Fixture: 1`.
- Legacy protocol fixtures additionally require
  `X-GhostBridge-Legacy-Protocol-Fixture: 1`.

## Trust, revocation, and Receipt behavior

- Passport and capability-manifest signatures are verified through the public
  Native Client trust path and configured Trust policy.
- Issuer audience, Trust category, Passport/Connection identity, and signed
  revocation state are checked on installation and every bound operation.
- Shared Platform stores preserve issuer-metadata and signed-revocation
  anti-rollback state across HTTP requests and Native Client instances.
- Sealed prior Trust evidence provides an additional continuity boundary.
- Unknown, stale, or revoked state fails closed.
- Terminal Tasks require a signed Receipt.
- Receipt verification binds Agent, Passport, Connection, Task, invocation,
  tenant scope, outcome, approval reference, audience, and execution
  revocation state, plus the authoritative policy-decision reference.
- Supplied output and evidence are checked against their signed digests.
- Platform database rows are not accepted as Agent Task or Receipt proof.

## Stable errors and observability

The adapter preserves distinct safe errors for authentication, authorization,
Trust, revocation, inactive Connection, discovery, protocol version,
capability, Approval, Task, Receipt, timeout, response size, and transport
failure. Observability exposes bounded identifiers, stage, duration, and safe
reason codes; it does not log credentials, keys, cookies, approval secrets, or
full payloads.

## Tests added

`platformNativeClient.test.js` exercises the actual Platform HTTP router,
public Native Client, explicit transport, and signed native Agent:

- discovery, installation, synchronous invocation, Task result, and Receipt;
- asynchronous waiting-for-approval flow and exact-action continuation;
- changed payload and replay rejection;
- cancellation with signed terminal Receipt;
- output/evidence digest mismatch and Task/Receipt disagreement rejection;
- organization/workspace isolation;
- untrusted issuer, invalid Passport signature, stale revocation, and revoked
  Connection;
- missing/malformed/cross-origin discovery data, unsupported version,
  oversized response, and timeout;
- production fixture rejection and missing principal.
- authenticated membership without permission, missing or malformed
  production evidence, and simplified development evidence in production;
- policy decisions substituted across Agent, capability, Connection,
  organization, workspace, or input digest;
- a higher signed revocation sequence followed by a lower sequence through a
  newly constructed Native Client;
- lower metadata/revocation sequences, same-sequence digest substitution,
  missing continuity, and non-contiguous predecessor state;
- non-terminal malicious Tasks substituting organization, workspace, Agent,
  Connection, or invocation.

`platformNativeClientAuthority.test.js` covers principal-derived scope,
spoofing rejection, fixture eligibility, production direct-gateway rejection,
and digest-only atomic MongoDB Approval replay behavior.

## Correction verifier results

All required non-database correction gates passed on 2026-07-27:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run verify:ghostbridge-phase-15c1`
- `npm run verify:ghostbridge-phase-15c1a`
- `npm run verify:ghostbridge-phase-15c1a-r1`
- `npm run verify:ghostbridge-phase-15c2`

The focused Platform Native Client suite and Native Agent, Native Client, and
Protocol Core package suites also pass. The build retained the existing
non-fatal frontend chunk-size warning.

## Commands not run

- `npm run verify:phase-15c1a-r1-mongo-store-contract`
- `npm run verify:sandbox`
- `npm run verify:enterprise-operations`
- `npm run verify:durable-recovery`
- the Phase 15C.2 GitHub Actions Node 20/22 and MongoDB 7 matrix

Database commands were not run because no intentional local MongoDB
replica set was running or configured. They were not redirected to an external
database, and MongoDB Atlas was not used. No external Agent provider was used.
No Phase 15C.2 pull request exists yet, so no Phase 15C.2 GitHub Actions
matrix has run.

## Environment variables

- `PLATFORM_NATIVE_CLIENT_TIMEOUT_MS` (default `10000`)
- `PLATFORM_NATIVE_CLIENT_MAX_RESPONSE_BYTES` (default `131072`, bounded by
  the protocol maximum)
- `PLATFORM_NATIVE_CLIENT_HOST_AUDIENCE` (default `ghostbridge-platform`)
- `PLATFORM_NATIVE_CLIENT_BINDING_SECRET` (minimum 32 bytes; required outside
  development)
- `PLATFORM_NATIVE_CLIENT_TRUST_POLICY_JSON` (bounded JSON object)
- `ALLOW_NATIVE_PROTOCOL_FIXTURES` (default `false`)
- `ALLOW_LEGACY_PROTOCOL_FIXTURES` (default `false`)

`ALLOW_DEVELOPMENT_IDENTITY_FIXTURES` remains a separate gate for development
Host identity fixtures; it does not enable Native Client transport fixtures.

## Unresolved issues

- No Phase 15C.2 pull request exists yet.
- No Phase 15C.2 GitHub Actions matrix has run.
- MongoDB replica-set gates remain unobserved in Phase 15C.2 CI.
- Legacy protocol implementations remain for explicit development fixtures
  and historical operational records. Their inventory and production
  eligibility are documented separately.

## Final status

**The independent-review blockers are corrected and required local
non-database verification is green, but Phase 15C.2 remains NOT PASS until
mandatory CI succeeds.**
