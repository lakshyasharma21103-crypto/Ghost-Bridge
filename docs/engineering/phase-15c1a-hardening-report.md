# Phase 15C.1A hardening report

Recorded: 2026-07-26 (Asia/Calcutta)

> **R1 correction notice:** This report records the original Phase 15C.1A pass. Independent
> review subsequently found residual code blockers in frontend installation authentication,
> organization confirmation, exact-action approval binding, terminal Task/Receipt
> persistence, production durability contracts, unknown-Connection revocation, and
> conformance evidence. The statement that no code-level blocker remained was therefore
> superseded. Those bounded findings are corrected in the Phase 15C.1A-R1 worktree; see
> `phase-15c1a-r1-correction-report.md` and
> `phase-15c1a-r1-residual-inventory.md`. Remote Linux/MongoDB evidence remains blocked.

## 1. Executive outcome

**Final status: BLOCKED.** Corrective code gates and deterministic Windows verification
pass. PASS is prohibited because GitHub Actions has not been observed and this machine has
no isolated local MongoDB. The configured `mongodb+srv` target was not used because the
phase permits only local/ephemeral test databases.

## 2. Starting branch and SHA

- Branch `main`
- SHA `fe9847b7005e15b82dae8b3ed27a8c1764178c0f` (exact expected match)

## 3. Initial git state

Clean tree; Node `v22.18.0`; npm `10.9.3`; no workflow; Mongo
`127.0.0.1:27017` unavailable. See `phase-15c1a-audit-baseline.md`.

## 4. Platform authentication result

`POST /api/v1/passports/resolve` now mounts a Host-principal middleware. It reuses indexed
Partner API-key verification, removes the key hash, resolves active workspace authority
server-side, and exposes a bounded principal. Body identity only narrows/confirms authority.
Fixture identity requires development mode, `ALLOW_DEVELOPMENT_IDENTITY_FIXTURES=true`,
and `X-GhostBridge-Development-Identity-Fixture: 1`. This original pass removed browser
user/organization authority; R1 retains removal of user authority while sending organization
only as a server-confirmed narrowing value.

## 5. Native Agent transport authentication result

The documented `authenticateHttpRequest` boundary protects scoped catalog/details,
redemption, invocation, Task/Receipt access, cancellation, approvals, and revocation.
Discovery, Passport, and public capabilities remain public; grant resolution is
possession-authorized. Body principal injection, wildcard production principals, and
out-of-scope principals fail before mutation.

## 6. Authorization fail-closed result

Only literal `true`, a verified production decision, or the explicit fixture allow form can
authorize. False, undefined, null, empty/unknown/indeterminate objects, incomplete evidence,
timeouts, and exceptions deny safely.

## 7. Revocation freshness result

Production requires `active` plus `fresh`/`nearing_expiry`. Missing, unknown, revoked,
stale, unavailable, malformed, wrongly bound, and invalid-sequence results fail.

## 8. Receipt enforcement result

Production requires verification JWKS plus a signer or signed-issuer contract. Runtime
verification covers proof, execution key authorization/purpose, issuer, audience, expiry,
Passport, capability, invocation, Task, Connection, scope, outcome, approval, request
fingerprint, and actual output/evidence digests. A previously mismatched digest format was
fixed by using Trust's canonical `sha256-...` representation.

## 9. Durable store result

All production authority stores, including Task contexts and Approval Decisions, must be
durable and cannot be `Map`. Approval Decisions require `putDecision` and atomic
`consumeApprovedDecision`; the concurrency test produces exactly one execution.

## 10. Native Client transport result

Node defaults to the secure Trust transport: absolute URL/HTTPS/port validation, every DNS
answer checked, special-use destinations rejected, selected address pinned, TLS hostname/SNI
preserved, redirects rejected, and deadline/cancellation/media/stream bounds enforced.
Browser/Fetch explicitly declares no DNS pinning. Trust-required Node use rejects transports
without pinning, TLS, rejected redirects, and streamed bounds.

## 11. IP-classification result

Trust and backend `safeFetch` cover every requested IPv4/IPv6 special-use range. Dotted and
hexadecimal IPv4-mapped IPv6 normalize before classification. Every DNS answer is checked.

## 12. Inspector repair

`inspectProfiles()` validates the canonical object with protocol-core. Core, governed,
missing governed/coordination, Stage A, Native Agent, and malformed cases are covered.

## 13. Conformance result

Host and raw Agent remain separate OS processes exchanging HTTP JSON. The Host runs real
validators/verifiers. Results: Core 17/17, Governed 25/25, Trust 38/38. Reports contain
profile, stable ID, requirement, status, safe evidence, PIDs, version, and timestamps. This
is “separate-process black-box conformance for the current JavaScript implementation,” not
independent cross-language conformance.

## 14. CI workflow result

The workflow uses Ubuntu, Node 20/22, `npm ci`, `contents: read`, concurrency cancellation,
MongoDB 7 with isolated DB names, typecheck/lint/test/build, both phase aggregates, four DB
verifiers, casing checks, and package dry-runs. Local contract/syntax validation passes.
Actual GitHub Actions result is unavailable until pushed and run.

## 15. Database verification result

Local port, service, binaries, and Docker are unavailable. A non-local SRV URI exists but no
connection/mutation was attempted. `verify:demo`, `verify:sandbox`,
`verify:enterprise-operations`, and `verify:durable-recovery` await ephemeral CI.

## 16. Tests added

10 Express authentication tests; 8 Native Agent security tests; 4 Native Client transport
tests; 2 Inspector behavior tests; backend/Trust IP vectors; 80 black-box checks.

## 17. Commands run

| Command | Result |
|---|---|
| Baseline focused tests | PASS, 11 |
| Baseline Phase 15C.1 | PASS, 8 groups |
| `npm ci` | PASS, 297 packages, 12.5 s |
| `npm run typecheck` | PASS, 27.9 s |
| First parallel lint | Environmental `EBUSY` while typecheck wrote same Vite output |
| Sequential `npm run lint` | PASS, 31.1 s |
| `npm test` | PASS all workspaces, 0 failed/skipped, 16.5 s |
| `npm run build` | PASS, 36.3 s |
| Phase 15C.1 aggregate | PASS 8/8, 19.9 s |
| Phase 15C.1A aggregate | PASS 9/9, 11.5 s |
| Core/Governed/Trust | PASS 17/17, 25/25, 38/38 |
| Seven package dry-runs | PASS via Phase 15C.1 package verifier |
| Diff/syntax checks | PASS |
| Local Mongo probes | UNAVAILABLE |

Vite's existing 906.19 kB chunk warning was recorded, not hidden.

## 18. Commands intentionally not run

No Gemini verifier, external-flow verifier, live/deployed provider, performance/load,
migration, production/external database, publication, deployment, transfer, real KMS,
real identity-provider, or payment command ran. Normal `npm test` includes mocked Gemini
unit-test labels but did not run `verify:gemini-agent` or contact a provider.

## 19. Package/build results

Typecheck, lint, tests, build, declarations, exports, and seven package dry-runs pass.
Linux casing checks pass locally; independent Ubuntu evidence remains pending.

## 20. Files added

Workflow; Host-principal middleware/test; three Phase reports; Native Agent/Client security
tests; Phase verifier.

## 21. Files modified

Backend env/auth/controller/routes/safeFetch/tests; frontend Resolve page; root manifest and
lock; Inspector, Native Agent, Native Client, protocol-core, Trust; Receipt schema; four
examples; raw Agent and black-box Host. No final-state file was deleted.

## 22. Dependencies added

Workspace-only `@ghostbridge/issuer` Native Agent dev dependency. No third-party runtime
dependency.

## 23. Dependencies removed

None.

## 24. Environment variables

Added `ALLOW_DEVELOPMENT_IDENTITY_FIXTURES=false`. CI supplies only test-local Mongo URI/DB.

## 25. Remaining blockers and R1 correction

1. No observed Ubuntu GitHub Actions run.
2. No observed ephemeral-Mongo execution of the four database verifiers.

The original conclusion that no code-level acceptance blocker remained was superseded by
the R1 audit. The R1 worktree corrects those code findings and passes deterministic local
gates. This phase remains blocked on observed remote Linux and isolated MongoDB evidence;
the R1 correction report is the authoritative current result.

## 26. Final status

**BLOCKED** — local deterministic gates pass; mandatory remote Linux/Mongo evidence does not.

## 27. Recommended next phase

With human authorization, commit/push and observe both Node matrix jobs. If they pass without
code changes, update this report to PASS and then consider Phase 15C.2. Otherwise remain in
Phase 15C.1A and fix the Linux/database-specific failure.
