# Phase 15C.1A-R1 audit baseline

Recorded: 2026-07-26 (Asia/Calcutta)

## Repository state

- Branch: `phase-15c1a-r1`
- Starting SHA: `064cd66d11ead4b382a38fb16cd704a4ba39b6b5`
- Expected SHA: exact match
- Initial working tree: clean
- No source file was modified before this baseline was completed.

## Reviewed surfaces and residual findings

| Surface | Baseline behavior | Residual blocker |
|---|---|---|
| Frontend API authentication | `apiClient` attaches `X-Partner-Api-Key` only to its existing protected-route list | `/passports/resolve` is absent from the list |
| `ResolvePassportKey` | Displays organization and workspace; submits only grant key and workspace | Organization confirmation is not submitted; no user authority is submitted |
| Platform Passport route | `POST /api/v1/passports/resolve` mounts `authenticateHostPrincipal` | Correctly protected |
| Platform scope enforcement | Workspace and optional organization are checked against the server-derived principal | Organization is enforceable when supplied, but the frontend omits it |
| Approval schemas | Challenge/Decision bind challenge, invocation, action key, limits, scope, and expiry | No canonical exact-action digest |
| Approval consumption | Production delegates single-use consumption to `consumeApprovedDecision` | Match criteria omit payload, capability version, Connection, and contract reference |
| Task cancellation | Running Tasks can issue Receipts from `activeExecutions` | `waiting_for_approval` can be persisted as cancelled before Receipt issuance and lacks a complete Receipt context |
| Receipt persistence | Receipt is validated, optionally trust-verified, then stored before terminal Task update | No transaction/unit-of-work contract; partial terminal persistence is possible |
| Production stores | Reject direct `Map`, require `durable === true` and synchronous Map-like methods | Wrapped in-memory Maps can claim durability; async adapters are not modeled |
| Revocation lookup | Missing Connection falls through to the active status branch | Unknown Connection is incorrectly reported active |
| Conformance negatives | Separate raw Agent and Host processes are used | Missing-endpoint and cross-origin checks use manual assertions and report `ERR_ASSERTION` |
| GitHub Actions | Linux Node 20/22 and MongoDB 7 workflow exists with timeout, least privilege, and concurrency | Pull-request target is broad, actions float on `@v4`, and no R1 aggregate runs |
| Phase reports | Phase 15C.1A reports claim no known code blocker | Claim is contradicted by the reviewed residual blockers |

## Existing focused-test evidence

All commands were run from the unmodified baseline:

| Command | Result |
|---|---|
| `node --test src/tests/platformInstallationAuth.test.js` in `backend` | PASS, 10/10 |
| `node --test test/security15c1a.test.js` in Native Agent | PASS, 8/8 |
| `node --test test/transport15c1a.test.js` in Native Client | PASS, 4/4 |
| `node scripts/verifyGhostBridgeBlackBoxConformance.mjs` | PASS, Core 17/17 |

The conformance output confirms the reviewed defect: both
`GB-C-MISSING-ENDPOINT-001` and `GB-C-CROSS-ORIGIN-001` pass only with
`ERR_ASSERTION`, not a Ghost Bridge implementation error.

## Baseline conclusion

The repository matches the requested branch and SHA and starts clean. Phase 15C.1A-R1
must correct the nine bounded residual findings without beginning Phase 15C.2 or running
manual, external, migration, deployment, publication, or performance commands.
