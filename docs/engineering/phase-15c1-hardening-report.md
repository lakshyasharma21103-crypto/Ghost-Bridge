# Phase 15C.1 hardening report

Recorded: 2026-07-26

## 1. Executive outcome

**BLOCKED**

The confirmed correctness defect and the highest-risk fail-open/security defects were fixed,
the new Phase 15C.1 aggregate passes, and the complete workspace unit/build suite passes.
The phase cannot honestly be marked PASS because Platform Native Stage B, canonical
installation migration, full protocol code generation, the complete conformance matrix,
exhaustive dead-code removal, and database-backed required verification remain incomplete.

## 2. Baseline

- Branch: `main`
- Commit: `a2a2be4c165550342bfd1bf271e3f6d63ec5c17b`
- Initial Git state: clean
- Canonical backend rename: `Backend/` → `backend/`
- Full baseline: `docs/engineering/phase-15c1-audit-baseline.md`

## 3. Critical defects fixed

- `backend/src/services/runtimeGateway.service.js`: removed the temporal-dead-zone access in
  `loadReservedInvocation`. The initial query now uses only trusted identifiers already in
  scope. Credential binding and persisted requirement validation occur after load.
- Preserved attempt, execution generation, ownership, durable state, and concurrent-claim
  checks.
- `backend/scripts/verifyDurableRecovery.js` now executes the focused reserved-invocation
  suite before its database-backed recovery verification.

## 4. Security corrections

- Added a pinned Node HTTP(S) transport for Trust issuer/JWKS discovery with complete DNS
  answer validation, no redirects, TLS hostname/SNI preservation, hard deadlines,
  cancellation, streamed byte limits, expected media type, and exact local-fixture allowlists.
- Corrected backend `safeFetch` so DNS validation and connection use the same address; added
  redirect revalidation, downgrade rejection, sensitive-header stripping, side-effect method
  rules, redirect-loop protection, deadlines, and body bounds.
- Partner API authentication uses indexed deterministic key hashes plus constant-time
  verification instead of scanning all Partners.
- Passport installation requires an authenticated server principal outside explicit
  development fixture mode; body identifiers can only match/narrow that scope.

## 5. Platform Native protocol status

Implemented and mounted:

- `GET /.well-known/ghostbridge`
- `GET /api/v1/native/status`
- `GET /api/v1/native/metrics`

The public discovery `endpoints` object is intentionally empty. Status and metrics are
Platform operational routes, not advertised public protocol endpoints. Discovery no longer
uses the incoming Host header and does not claim Agent Coordination.

Not implemented and therefore not advertised:

- Passport and Capability resources
- Install Grant resolution/redemption and Connection result
- Invocation, Task lookup/cancellation, Receipt retrieval
- Approval Decision submission
- Revocation lookup and Connection revocation

This truthful Stage A correction passes an actual HTTP integration test. Stage B remains a
production blocker.

## 6. Authentication and tenant boundaries

- Indexed Partner lookup and constant-time verification are covered by backend tests.
- Platform install scope now prefers `authenticatedPrincipal` and rejects mismatched browser
  organization/workspace/user identifiers outside explicit development fixtures.
- Native Client preview keys bind grant digest, organization, workspace, Host audience,
  approved capability set, authentication mode, and policy revision.
- Connections are keyed by `connectionId`; an agent lookup must resolve uniquely.
- Invocation scope must exactly match the selected Connection.
- Authentication handlers must return an opaque credential or transport reference; the Client
  binds it to grant, mode, and scope before redemption.

The entire legacy Platform installation route has not yet been replaced by the canonical
Native installation service, so this area remains partially complete.

## 7. Trust enforcement

- Only EdDSA/Ed25519 remains accepted.
- Verification time comes from signed payload fields; unsigned proof time cannot authorize a
  key.
- Expired, revoked, compromised, suspended, generated, and prepublished keys are rejected as
  applicable. Historical retired-key use is explicit.
- Root pin policy uses the actual metadata-signing key thumbprint.
- `verifyRequest` requires a trusted expected audience.
- Required future expiration means present and unexpired.
- Replay capacity fails closed without evicting unexpired entries.
- Anti-rollback binds namespace, issuer, sequence, and canonical digest; changed same-sequence
  content, gaps where contiguous, previous-digest changes, and issuer changes fail.
- Revocation cache progression is contiguous and digest chained.
- Receipt verification can recompute actual output/evidence digests and bind invocation,
  Connection Trust Record, and revocation context.
- Unsigned or unverified Receipts return `valid: false`.

## 8. Native Client corrections

- Enforces HTTPS except exact allowlisted loopback fixtures.
- Rejects credentials, unsafe endpoints, redirects, bad media types, oversize bodies, and
  cross-origin discovery endpoints; combines timeout and caller cancellation.
- Install Grants are sent in POST bodies.
- Trust-required install requires signed issuer metadata, Passport, exact Capability Manifest,
  signed resolution and offer, audience, fresh revocation, and an accepted
  `verified_and_trusted` decision.
- Review-required, untrusted, blocked, suspended, revoked, invalid, or indeterminate trust
  cannot silently install.
- Capability approval is explicit outside fixture-only approve-all mode.
- Retry requires capability support, peer acknowledgement, and the same request fingerprint;
  an idempotency key alone is insufficient.
- Connection Trust Records now persist under the exact `connectionId`.

## 9. Native Agent corrections

- Explicit `localFixtureMode`, `developmentMode`, and `productionMode`.
- Production construction requires authorization, revocation resolution, Receipt issuance,
  public base URL, and durable stores.
- Production authorization/revocation/Receipt defaults fail closed.
- Discovery uses configured/runtime public base URL, not request Host; Agent Coordination and
  delegation are absent.
- Install Grant resolution/redemption use POST bodies; legacy path form is fixture-only.
- Capability approval and non-`none` authentication bindings are explicit and scope bound.
- Cancellation aborts the active handler and preserves cancelled Task state.
- Direct delegation registration/invocation is not exposed by Native Agent.

## 10. MCP disposition

MCP is **temporarily quarantined**, not deleted. The import route, adapter registry, and new
MCP Passport validation are disabled by default with `LEGACY_MCP_ENABLED=false`. The active
UI no longer offers MCP creation and reports it unavailable. Historical adapter code/tests
remain for compatibility review.

## 11. Agent Coordination disposition

Agent Coordination is **temporarily quarantined**. Backend inter-agent routers require
`EXPERIMENTAL_AGENT_COORDINATION_ENABLED=true`; Native discovery/Agent API and primary
frontend routes/navigation omit it. `verify:experimental-agent-coordination` now verifies
that isolation and is not in build, release, or Phase 15C.1 readiness. The old two-agent
fixture, models, migrations, schemas, and old pages remain pending a
persisted-data/package-layout decision.

## 12–18. Exact cleanup changes

- Files deleted: none.
- Directories deleted: none.
- Directory renamed: `Backend/` → `backend/`.
- Export removed: Native Agent `registerDelegation` runtime method and public declaration.
- Default backend routes removed:
  - `POST /api/v1/connections/:id/import-mcp-tools`
  - `/api/v1/inter-agent-contracts/*`
  - `/api/v1/inter-agent-delegations/*`
- Frontend routes removed:
  - `/console/delegations`
  - `/delegation-grants`
  - `/delegation-grants/:grantId`
  - `/delegation-invocations`
  - `/delegation-invocations/:invocationId`
- Navigation removed: `Delegation Grants`, `Delegation Invocations`.
- Dependencies removed: none.
- Environment variables removed: none.
- Environment variables added, both default false:
  - `LEGACY_MCP_ENABLED`
  - `EXPERIMENTAL_AGENT_COORDINATION_ENABLED`
- Implementations consolidated:
  - Backend manual JavaScript file lists → recursive `backend/scripts/checkJavaScript.js`
  - Primary Native protocol verifier → separate-process Host→Agent black-box runner
  - Platform advertised endpoint map → frozen truthful public endpoint map

## 19. Tests added

Twenty-five new `node:test` cases:

- 9 reserved durable invocation cases
- 10 Trust network-safety cases
- 1 Platform discovery HTTP consistency case
- 1 additional Trust cryptographic/policy case
- 1 Native Client hardening case
- 3 Native Agent fail-closed/cancellation/discovery cases

The black-box runner adds four stable-ID checks across a raw Host and raw Agent in separate
OS processes.

## 20. Verifier results

Passed new verifiers:

- `verify:phase-15c1-critical-fixes`
- `verify:ghostbridge-network-safety`
- `verify:ghostbridge-trust-enforcement`
- `verify:ghostbridge-platform-protocol-truth`
- `verify:ghostbridge-authenticated-scope`
- `verify:ghostbridge-package-integrity`
- `verify:ghostbridge-black-box-conformance`
- `verify:phase-15c1-cleanup`
- aggregate `verify:ghostbridge-phase-15c1`

Passed database-independent required regression:

- policy engine, secret governance, compliance governance
- orchestration, agent selection, recovery, observability
- production scale, data access, multi-region DR, deterministic capacity
- release, staging-pilot, pilot analytics, GA readiness
- Native protocol, SDK, docs, inspector
- Phase 15B cleanup/aggregate/realignment and both compatibility suites
- issuer trust, key rotation, revocation distribution, request integrity,
  cross-company trust, and Phase 15C aggregate

Blocked by unavailable local MongoDB:

- `verify:demo`
- `verify:sandbox`
- `verify:enterprise-operations` (all deterministic pre-database checks passed; connectivity
  assertion failed `unavailable` versus `connected`)

The prohibited Gemini, external-flow, deployed-agent, and `perf:*` commands were not run.

## 21. Package and build results

- `npm ci`: PASS, 297 packages
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS across all workspaces
- Backend full suite: 769/769 tests PASS
- `npm run build`: PASS
- Package dry-run: PASS for every public `@ghostbridge/*` package
- TypeScript SDK example `tsc --noEmit`: PASS
- Build caveat: Vite reports an existing minified chunk above 500 kB

Strict TypeScript/checkJs/ESLint coverage, declaration/runtime API comparison, circular and
unused dependency analysis, and clean Linux CI were not fully implemented.

## 22. Human-review items

- Persisted-data compatibility before deleting delegation models, migrations, pages, and old
  MCP artifacts.
- Canonical public protocol schema/code-generation ownership.
- Whether Trust Console placeholder routes should be removed or backed by scoped APIs.
- A shared portable network-safety primitive without introducing Platform dependencies into
  public packages.
- Full tracked-secret/manual dependency review beyond existing deterministic scanners.

## 23. Remaining production blockers

- Platform Native Stage B routes and canonical public model mapping are absent.
- Active Add External Agent still reaches the hardened legacy install controller rather than
  one completed canonical Native Host installation service.
- Trust Console bounded read/admin APIs are absent; the UI is explicitly a placeholder.
- Full policy-field/spec/schema/declaration parity was not proven for every primitive.
- Complete required black-box negative matrix and `ghostbridge conformance
  host|agent|core|governed|trust` CLI are absent.
- Exhaustive Knip/manual dead-code and unused-dependency cleanup is incomplete.
- Strict cross-workspace static analysis and Linux clean-install CI are incomplete.
- Required database-backed local verifiers cannot pass without MongoDB.

## 24–25. Safety confirmation

No live, billed, external-provider, deployed-agent, load, stress, soak, regional-performance,
staging-performance, production-database, real-KMS, real-identity-provider, payment,
deployment, package-publication, or production-migration command was run. No deployment or
package publication occurred.
