# Phase 15C.1A-R1 correction report

Recorded: 2026-07-26 (Asia/Calcutta)

## 1. Starting branch and SHA

- Branch: `phase-15c1a-r1`
- Starting SHA: `064cd66d11ead4b382a38fb16cd704a4ba39b6b5`
- Expected SHA: exact match

## 2. Initial git state

The working tree was clean. The required audit was completed and recorded in
`phase-15c1a-r1-audit-baseline.md` before any source file was changed.

## 3. Frontend authentication fix

The frontend API client now classifies `/passports/resolve` as a Partner-authenticated
route. It attaches the configured credential only through `X-Partner-Api-Key`. A missing
credential fails before transport with the existing safe client error. Tests inspect the
actual URL, headers, and body and prove that the credential is absent from the URL and
body.

## 4. Organization-scope fix

`ResolvePassportKey` now sends `key`, `receivingWorkspaceId`, and
`receivingOrganizationId`; it does not send `receivingUserId`. The Platform controller
constructs a bounded resolver input from the authenticated principal and the two submitted
scope confirmations instead of spreading caller-controlled body fields. Existing
server-side workspace and organization checks remain authoritative, and a mismatched
organization fails.

## 5. Approval action digest design

Protocol core now exposes one canonical `createApprovalAction` /
`approvalActionDigest` contract. It binds invocation ID, Connection ID, capability key and
version, organization and optional workspace scope, input contract reference, the canonical
payload digest, optional side-effect category, approval limits, policy decision reference,
and expiry. Recursive object-key canonicalization makes semantically equivalent object
ordering stable without changing the repository's general digest behavior.

Approval Challenge and Approval Decision schemas require the digest. The Native Agent
creates it from the actual invocation and current authority context, repeats it in the
Decision, persists it, and recalculates it from the invocation presented at atomic
consumption time. An invocation ID alone is insufficient, and one Decision still authorizes
at most one exact action.

## 6. Payload substitution tests

Behavioral tests prove that the exact approved payload succeeds while a changed scalar
value, changed nested field, capability version, Connection, input contract, organization,
workspace, or limits fails. They also cover absent and malformed digests, canonical
object-key reordering, and concurrent single-use consumption. Governed black-box
conformance retains the same approval reference, substitutes the payload, and observes
`APPROVAL_INVALID`.

## 7. Task/Receipt terminal consistency

Accepted, queued, waiting-for-approval, and running Tasks retain bounded Receipt context
without raw payloads, secrets, or transport credentials. Cancellation, handler failure,
and timeout construct and verify a signed Receipt before committing the terminal pair.

Fixture stores use ordered persistence with rollback on failure. Production requires a
production-eligible terminal unit-of-work contract. The JSON filesystem adapter demonstrates
the terminal-pair and recovery behavior only within one deterministic local database
instance; it is rejected in `productionMode` and is not production atomicity evidence.
Concurrent/repeated cancellation converges on one terminal Task and one Receipt. Receipt
issuance, Receipt persistence, or Task persistence failure cannot leave a committed terminal
Task without its required Receipt.

## 8. Store contract changes

Production store methods are Promise-compatible and have explicit capability metadata:
durable persistence, `productionEligible: true`, atomic compare-and-set, terminal
transaction support, atomic Install Grant redemption, adapter name, and adapter version. A
boolean `durable` claim is not sufficient. Direct Maps, obvious Map wrappers, test/fake/
memory identities, and the local JSON adapter are rejected in production.

Production redemption now obtains a trusted immutable grant snapshot for result binding,
then invokes one `installGrantTransactions.redeemInstallGrant` consumption operation. The
snapshot is not treated as the atomic consumption decision: the store operation must still
atomically reverify active status, expiry, exact scope, and capability selection; mark the
grant redeemed; create exactly one Connection; and store the Connection reference. The
runtime constructs the complete expected Connection, compares the entire returned grant
against the trusted snapshot plus the exact redemption transition, validates durable
readback, and fails closed on malformed or unavailable transaction results. A concurrent
loser receives `INSTALL_GRANT_ALREADY_REDEEMED`.

The filesystem adapter remains useful for deterministic get/put/delete/has/values/scan,
restart, Approval Decision, terminal-pair, and grant-redemption contract tests. Its
capabilities now state `persistence: "deterministic_local"`,
`productionEligible: false`, and false production atomicity flags. It has no cross-process
or cross-instance lock and is not production persistence evidence. TypeScript declarations
match the runtime contract.

## 9. Restart evidence

A deterministic temporary-directory test writes a Connection, Approval Decision, Task, and
Receipt through local database instance A, closes it, and recovers the same state through
instance B. A second test runs two simultaneous local redemption operations: one succeeds,
one receives `INSTALL_GRANT_ALREADY_REDEEMED`, exactly one Connection exists, the grant
references it, and the result survives restart. These are deterministic local persistence
tests only. They do not prove production durability, cross-instance locking, or
cross-process atomicity; that evidence requires MongoDB CI or another genuinely
transactional production adapter.

The in-process store harness used by production-mode unit tests is test-only and not
exported. It exercises runtime fail-closed and transaction-call behavior; it is not cited as
production persistence evidence.

## 10. Revocation unknown-state fix

Connection revocation lookup now distinguishes a missing subject reference from an unknown
subject. Missing input fails with `INVALID_MESSAGE`; an unknown Connection fails with
`CONNECTION_NOT_ACTIVE`; known active and revoked Connections retain their canonical
statuses. Unit and authenticated raw HTTP tests prove that unknown authority is never
reported active.

## 11. Conformance changes

The raw Agent now serves malformed discovery documents for the missing-endpoint and
cross-origin cases. The separate Host process routes those documents through the real
Native Client and attempts the relevant operation. Both are rejected with
`INVALID_MESSAGE`, not a hand-written assertion. Wrong-media discovery also uses the Native
Client path and reports its actual safe error. Host and Agent remain separate processes,
and the Host does not import Native Agent.

Governed conformance adds exact-action substitution evidence. This remains
separate-process black-box conformance for the current JavaScript implementation, not
independent cross-language conformance.

## 12. CI changes

The Phase workflow now triggers on pull requests targeting `main`, preserves `contents:
read` and concurrency cancellation, sets a 45-minute job timeout, and keeps Ubuntu,
Node 20/22, and MongoDB 7. Checkout and setup-node are pinned to full commit SHAs. The
workflow runs the R1 aggregate in addition to the existing typecheck, lint, tests, build,
Phase 15C.1, Phase 15C.1A, database, casing, package-integrity, and package dry-run gates.
It now also starts an isolated replica-set member inside the MongoDB service container and
explicitly runs `npm run verify:phase-15c1a-r1-mongo-store-contract`. That verifier exercises
the Native Agent production store contract with MongoDB transactions. No manual,
external-provider, migration, deployment, publication, or performance command was added.

## 13. Tests added

- Three frontend/API-client installation authentication tests.
- Two protocol-core approval-action tests with field-by-field digest substitution cases.
- Native Agent R1 tests covering action binding, terminal consistency, local persistence/
  restart, production adapter rejection, verified authorization evidence, atomic Install
  Grant redemption, and Connection revocation.
- Development-mode authorization tests proving simplified positive results fail while a
  complete verified decision succeeds.
- A TypeScript compilation fixture covering full production authorization evidence and a
  Promise-compatible protocol Task store.
- A 21-case malicious redemption-adapter matrix covering the complete returned grant and
  Connection security binding.
- An isolated MongoDB production-store verifier covering one-time redemption, single-use
  approval consumption, terminal Task/Receipt commit, rollback, and reconstruction.
- Governed and core black-box conformance assertions for actual implementation errors.
- Eight focused R1 verifier groups, including the production authorization boundary, plus
  one aggregate.
- Two cleanup-verifier regressions prove the full cleanup check works with an empty tool
  `PATH` and that the Node scanner reports a planted uppercase-backend source reference.
- One direct Trust regression signs a real document, flips a decoded signature byte, reaches
  `verifyDocument`, and requires `SIGNATURE_INVALID`.

## 14. Commands run

| Command | Result |
|---|---|
| `npm ci` | PASS, 297 packages, about 11 s |
| `npm run typecheck` | PASS, final production-correction rerun 26.6 s |
| `npm run lint` | PASS, final production-correction rerun 25.8 s |
| `npm test` | PASS, all workspaces, 0 failed/skipped, final production-correction rerun 20.0 s |
| `npm run build` | PASS, 122 public pages, final production-correction rerun 31.0 s |
| `npm run verify:phase-15c1-cleanup` | PASS, including 2/2 regression tests, 1.3 s |
| `node --test --test-name-pattern "decoded signature byte mutation" packages/ghostbridge-trust/test/trust.test.js` | PASS, 1/1, 0.6 s |
| `node scripts/verifyGhostBridgeBlackBoxConformance.mjs --profile=trust` | PASS, 39/39; invalid signature rejected with `SIGNATURE_INVALID`, 2.8 s |
| `npm run verify:phase-15c1a-conformance` | PASS, 9.1 s |
| `npm run verify:phase-15c1a-r1-authorization-boundary` | PASS |
| `npm run verify:phase-15c1a-r1-store-contract` | PASS |
| `npm run verify:ghostbridge-phase-15c1` | PASS, 8/8 groups, final production-correction rerun 18.7 s |
| `npm run verify:ghostbridge-phase-15c1a` | PASS, final production-correction rerun 12.3 s |
| `npm run verify:ghostbridge-phase-15c1a-r1` | PASS, 8/8 groups, final production-correction rerun 8.7 s |
| `npm run typecheck` (final tree rerun) | PASS, including the relocated production TypeScript fixture, 27.9 s |
| `npm run lint` (final integration-blocker pass) | PASS, 35.4 s |
| `npm test` (first integration-blocker pass) | FAIL: Node 22 test discovery executed the compile-only `.ts` fixture under `test/`; all 28 Native Agent behavioral tests passed |
| `npm test` (after moving the fixture outside test discovery) | PASS, all workspaces, 0 failed/skipped, 26.5 s |
| `npm run build` (final integration-blocker pass) | PASS, 122 public pages, 32.6 s |
| `npm run verify:ghostbridge-phase-15c1` (final integration-blocker pass) | PASS, 8/8 groups, 19.5 s |
| `npm run verify:ghostbridge-phase-15c1a` (final integration-blocker pass) | PASS, 12.3 s |
| `npm run verify:ghostbridge-phase-15c1a-r1` (final integration-blocker pass) | PASS, 8/8 groups, 9.1 s |
| `npm run verify:phase-15c1a-r1-mongo-store-contract` | NOT RUN locally; requires the isolated replica-set member configured in CI |
| `node --test backend/src/tests/releaseReadiness.test.js` | PASS, 11/11 |
| `npm run verify:phase-15b1-realignment` | PASS, 12/12 checks |
| `node scripts/verifyGhostBridgeBlackBoxConformance.mjs --profile=core` | PASS, 17/17 |
| Focused R1 Native Agent cancellation/revocation tests | PASS, 2/2 |
| Protocol-core approval tests | PASS, 14/14 full package |
| Frontend R1 installation-auth tests | PASS, 3/3 |
| Existing public-package verifier/dry-runs | PASS through Phase 15C.1 |
| `git diff --check` | PASS; only Git line-ending notices |
| Local MongoDB/Docker/process probes | UNAVAILABLE |

The existing Vite 906.32 kB chunk warning and the npm
`node-domexception` deprecation warning were recorded; neither is an R1 gate failure.

## 15. Commands intentionally not run

The Gemini and external-flow verifiers, external/live providers, all local or regional
performance commands, migrations, deployment, publication, repository transfer, package
publication, production databases, and the configured external MongoDB SRV target were not
run. Normal unit tests contain mocked Gemini-labelled cases but did not contact a provider.
No commit, push, merge, or Phase 15C.2 work occurred.

## 16. Files added, modified, and deleted

Added:

- `backend/scripts/verifyPhase15c1aR1MongoStoreContract.js`
- `docs/engineering/phase-15c1a-r1-audit-baseline.md`
- `docs/engineering/phase-15c1a-r1-correction-report.md`
- `docs/engineering/phase-15c1a-r1-residual-inventory.md`
- `frontend/tests/phase15c1aR1InstallationAuth.test.mjs`
- `packages/ghostbridge-native-agent/fixtures/typescript/production-configuration.ts`
- `packages/ghostbridge-native-agent/fixtures/typescript/tsconfig.json`
- `packages/ghostbridge-native-agent/src/fileProtocolStores.js`
- `packages/ghostbridge-protocol-core/test/approvalAction15c1aR1.test.js`
- `scripts/lib/phase15c1Cleanup.mjs`
- `scripts/test/verifyPhase15c1Cleanup.test.mjs`
- `scripts/verifyPhase15c1aR1.mjs`

Modified:

- `.github/workflows/phase-15c1a.yml`
- `backend/scripts/verifyExternalFlow.js`
- `backend/scripts/verifyReleaseReadiness.js`
- `backend/src/controllers/passportController.js`
- `backend/src/services/evidence.service.js`
- `backend/src/tests/platformInstallationAuth.test.js`
- `backend/src/tests/releaseReadiness.test.js`
- `docs/engineering/phase-15c1a-hardening-report.md`
- `docs/engineering/phase-15c1a-residual-inventory.md`
- `frontend/src/api/apiClient.js`
- `frontend/src/pages/ResolvePassportKey.jsx`
- `package.json`
- `packages/ghostbridge-native-agent/package.json`
- `packages/ghostbridge-native-agent/src/index.d.ts`
- `packages/ghostbridge-native-agent/src/index.js`
- `packages/ghostbridge-native-agent/test/security15c1a.test.js`
- `packages/ghostbridge-protocol-core/src/index.d.ts`
- `packages/ghostbridge-protocol-core/src/index.js`
- `packages/ghostbridge-trust/test/trust.test.js`
- `protocol/examples/two-agent-workflow/index.js`
- both 0.1-draft Approval schemas
- `scripts/black-box/raw-agent.mjs`
- `scripts/verifyGhostBridgeBlackBoxConformance.mjs`
- `scripts/verifyGhostBridgeInspector.js`
- `scripts/verifyGovernedHostAgentCompatibility.js`
- `scripts/verifyPhase15b1Realignment.mjs`
- `scripts/verifyPhase15c1.mjs`
- `scripts/verifyPhase15c1a.mjs`

Deleted: none.

## 17. Dependencies added or removed

None. `package-lock.json` is unchanged.

## 18. Environment variables changed

Added `MONGODB_STORE_URI` to the Phase 15C.1A GitHub Actions workflow.
It points only to the isolated CI MongoDB replica-set member used by
`verify:phase-15c1a-r1-mongo-store-contract`.

No production, developer, or external-service environment variable was added.

## 19. Local verification results

### Mandatory regression failures and root causes

Two mandatory failures were observed after the initial R1 pass:

1. `verify:phase-15c1-cleanup` received `spawnSync('rg').status === null`
   because the Node child environment could not start a globally supplied ripgrep binary.
   The verifier incorrectly depended on tooling not declared by the repository. The scan is
   now a deterministic Node filesystem walk over intended source/configuration roots and
   extensions, with generated/vendor directories excluded and the three existing historical
   engineering-report exclusions preserved explicitly. General child execution now reports
   startup errors and missing exit status separately. Stale uppercase-backend references in
   intended source files were corrected to the canonical lowercase path.
2. Trust case `GB-T-INVALID-SIGNATURE-001` (`15.8 invalid signature`) replaced only the
   final Base64URL character with `A`. An Ed25519 signature whose canonical encoding already
   ended in `A` was not changed, so the real Trust verifier accepted the still-valid object.
   The Trust implementation was not bypassed or weakened; the defect was nondeterministic
   fixture mutation. The case now decodes the JWS signature, flips one actual byte,
   re-encodes it, reaches `verifyDocument`, and requires the stable
   `SIGNATURE_INVALID` code. Conformance failure output now prints the test ID and
   requirement reference before aborting.

### Independent production-correctness review

Three further production blockers were corrected:

1. `authorizeCapabilityAccess` accepted plain `true` before reaching production evidence
   validation. Literal `true` and simplified `{ allowed: true }` remain fixture-only.
   Production now authorizes only through `isVerifiedAuthorizationDecision`, including
   non-empty principal/policy identifiers, a canonical ISO `evaluatedAt`, and policy
   version.
2. The JSON adapter described single-instance serialization as durable atomic production
   behavior despite having no cross-instance/process lock. It is now explicitly
   deterministic-local, `productionEligible: false`, advertises no production atomicity,
   and is rejected by production construction.
3. Production Install Grant redemption performed a read followed by parallel independent
   writes. It now requires one production-eligible atomic redemption store operation and
   validates durable readback. Direct local and production-runtime contract tests prove one
   concurrent winner, a stable `INSTALL_GRANT_ALREADY_REDEEMED` loser, one Connection, and
   a matching grant reference; the local persistence result also survives restart.

All requested deterministic local code gates pass. The complete workspace test run has no
failed or skipped test, the build emits all 122 public pages, both prior phase aggregates
pass, all eight R1 groups pass, package dry-runs pass, and core/governed conformance reports
contain implementation-produced safe errors. After the regression corrections, the Phase
15C.1, Phase 15C.1A, and Phase 15C.1A-R1 aggregates all exited zero.

### Final integration-blocker correction pass

1. `developmentMode` now follows the verified-decision boundary used by production:
   simplified `true` and `{ allowed: true }` results remain fixture-only, while complete
   principal/policy/timestamp/version evidence succeeds in development and production.
2. Public declarations now expose the complete verified authorization decision and accept
   either the Promise-compatible durable protocol Task store or the supported local Map
   shape. The production compilation fixture is executed by the Native Agent typecheck.
3. Atomic redemption now binds the complete returned grant and Connection to the trusted
   grant snapshot and submitted candidate. Twenty-one self-consistent malicious adapter
   mutations all fail closed with `INSTALL_GRANT_INVALID`.
4. The root MongoDB store-contract command and explicit GitHub Actions step now exist. The
   verifier uses transactions to prove atomic grant redemption, atomic Approval Decision
   consumption, atomic terminal Task/Receipt persistence, rollback without partial state,
   and reconstruction reads. This command was not run locally because no isolated local
   replica set was established, and no remote workflow was triggered.

The first final `npm test` run found that Node 22 discovered and executed a compile-only
TypeScript fixture placed under `test/`. The fixture was moved to `fixtures/typescript`,
its dedicated TypeScript compilation still passes, and the complete `npm test` rerun passes
with zero failures or skips.

## 20. Remote CI status

**BLOCKED.** The workflow is prepared but no pull request was created or pushed, so no
Ubuntu Node 20/22 plus MongoDB 7 workflow result has been observed.

## 21. Remaining blockers

There is no known deterministic local code blocker. The remaining evidence blockers are:

1. An observed successful pull-request workflow on Ubuntu for both Node matrix entries.
2. An observed successful isolated MongoDB 7 run of
   `verify:phase-15c1a-r1-mongo-store-contract` and the other database-backed verifiers.
   The verifier is implemented and CI-wired, but no run has been observed. The JSON
   filesystem adapter cannot satisfy this gate.

The configured live external MongoDB connection was intentionally not used as a substitute
for isolated test evidence.

## 22. Final status

**BLOCKED** - all R1 code and deterministic local gates pass, while mandatory remote
Linux/MongoDB evidence remains unavailable.
