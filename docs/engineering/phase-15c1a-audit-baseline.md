# Phase 15C.1A audit baseline

Recorded: 2026-07-26 (Asia/Calcutta)

## Source and tools

- Branch: `main`
- Commit: `fe9847b7005e15b82dae8b3ed27a8c1764178c0f`
- Expected starting commit: exact match
- Initial `git status --short`: clean (zero entries)
- Node.js: `v22.18.0`
- npm: `10.9.3`
- Local MongoDB at `127.0.0.1:27017`: unavailable
- GitHub Actions workflows: none

The repository already includes the completed Phase 15C.1 changes at this commit, including
the lowercase `backend/` directory, Trust Node transport, Platform `safeFetch` pinning,
truthful Stage A discovery, default-off MCP/Agent Coordination, and Phase 15C.1 reports and
verifiers.

## Authentication middleware inventory

`backend/src/middleware/authenticatePartner.js` is the only current credential
authentication middleware. It:

- reads `X-Partner-Api-Key`;
- hashes the candidate for indexed lookup of an active Partner;
- verifies the stored hash in constant time;
- attaches the bounded Partner record to `request.partner`.

`backend/src/middleware/requiresPermission.js` performs authorization after Partner
authentication. Request ID, safe error, not-found, and test-fault middleware do not create an
identity.

There is no middleware that creates `request.authenticatedPrincipal`. The installation
controller expects it, but `backend/src/routes/passportRoutes.js` mounts
`POST /resolve` directly. The controller also trusts body user/workspace identity whenever
`NODE_ENV=development`; no explicit default-false fixture flag exists.

## Protected Platform route inventory

Partner authentication is mounted on the partner, invocation, audit, approval, agent
discovery/selection, policy, secret, evidence, operations, enterprise identity/operations,
orchestration, production scale, data-performance, regional-resilience, capacity,
release-readiness, staging-pilot, pilot analytics, commercial, and default-off inter-agent
routers.

Passport routes at baseline:

- `POST /api/v1/passports/validate`: public schema validation
- `POST /api/v1/passports/resolve`: active installation route; no authentication middleware

The existing trustworthy server identity available for the active installation boundary is
the verified Partner API key and its server-side Partner record. No browser/session
authentication middleware exists in this backend.

## Native Agent HTTP route inventory

Public protocol metadata:

- `GET /.well-known/ghostbridge`
- `GET /ghostbridge/passport`
- `GET /ghostbridge/capabilities`
- capability search/details

Grant possession:

- `POST /ghostbridge/install-grants/resolve`

Authority-sensitive routes currently lacking transport authentication:

- `POST /ghostbridge/install-grants/redeem`
- `POST /ghostbridge/invocations`
- `GET /ghostbridge/tasks/{taskId}`
- `POST /ghostbridge/tasks/{taskId}?action=cancel`
- `GET /ghostbridge/receipts/{receiptId}`
- `POST /ghostbridge/approvals/{challengeId}/decisions`
- `POST /ghostbridge/revocations/connection/{connectionId}`

Revocation lookup is read-only but Connection-scoped and currently unauthenticated. The HTTP
dispatcher passes request bodies directly to Agent methods and has no request authentication
contract.

## Native Agent stores, authorization, revocation, and Receipts

Production currently requires stores named `installGrants`, `connections`, `tasks`,
`receipts`, `approvals`, `idempotency`, and `revocation`. `approvalDecisions` is omitted from
the required list and silently defaults to a `Map`.

Store declarations are typed only as `Record<string, Map<string, unknown>>`; no explicit
durable/CAS interfaces exist. Approval consumption searches then mutates the local object,
which is not atomic across consumers or processes.

Production requires callbacks for authorization, revocation, and Receipt issuance. Residual
behavior:

- authorization denies explicit false/`allowed:false`, but malformed or empty results can
  authorize;
- revocation accepts `status: active` with missing freshness;
- the Receipt wrapper checks only selected structural/proof fields returned by the callback;
- failed/cancelled/timed-out terminal execution does not consistently persist a signed
  Receipt.

## Native Client transport inventory

`@ghostbridge/native-client` validates base URL schemes, exact loopback fixture origins,
same-origin discovered endpoints, credentials/fragments, and rejects redirects. It combines
timeout with caller cancellation.

The request path uses `globalThis.fetch` (or a supplied fetch) and calls `response.text()`
before enforcing the message-size limit. It does not resolve all DNS answers, pin the actual
socket, or declare custom transport security properties. Trust-required Node use can
therefore silently use an unpinned Fetch implementation.

`installGrantResolver` results do pass `normalizeBaseUrl`, but they receive the same scheme
policy only—not a DNS/IP-pinned Node transport.

## IP classification

The Trust Node transport already contains broad special-use IPv4/IPv6 blocking and address
pinning. Backend `safeFetch` independently pins addresses but requires regression review for
IPv4-mapped IPv6 values such as `::ffff:169.254.169.254`. Public SDK packages do not depend on
backend code and that dependency direction must remain unchanged.

## Inspector profile representation

Protocol discovery represents profiles as an object keyed by canonical profile name.
`GhostBridgeInspector.inspectProfiles()` treats it as an array and calls
`discovery.profiles.find(...)`, which can throw `find is not a function`. Existing Inspector
tests inspect source ordering and do not execute this method.

## Conformance runner inventory

`scripts/verifyGhostBridgeBlackBoxConformance.mjs` starts
`scripts/black-box/raw-agent.mjs` as a separate process and exchanges HTTP JSON. It accepts
`--profile=core|governed|trust`, but all options execute the same four checks.

Two negative checks trust labels returned by the raw fixture rather than running protocol
validators/verifiers in the Host. Reports omit requirement references, timings, Host/Agent
evidence details, and meaningful profile-specific matrices. This is a separate-process smoke
fixture, not complete or independent conformance.

## Package exports

The seven public packages (`protocol-core`, `trust`, `issuer`, `native-client`,
`native-agent`, `conformance`, and `inspector`) export `.` with `types`, `require`, and
`default` entries. Native Client has no explicit secure Node transport export at baseline.

## Existing tests and verifier behavior

Before source edits:

- Native Agent, Native Client, and Inspector focused tests: 11 passed, 0 failed, 0 skipped.
- `verify:ghostbridge-phase-15c1`: passed all eight component verifiers.

These passing tests do not exercise the residual Platform middleware boundary, Native Agent
HTTP transport authentication, all fail-closed callback shapes, durable Approval Decision
CAS, signed terminal failure Receipts, secure Native Client DNS pinning, the Inspector
profile method, or distinct conformance matrices.

## CI inventory

No `.github/workflows` directory exists. Linux casing, workspace discovery, ephemeral MongoDB
verification, package dry-runs, and Phase 15C.1/15C.1A aggregates therefore have no remote CI
evidence.

## Known limitations and stop conditions

- Local MongoDB is unavailable; database-backed verification cannot be completed on this
  Windows host.
- A real GitHub Actions result cannot be observed without committing/pushing, which this
  phase explicitly forbids unless requested.
- Failure Receipt semantics may require a bounded implementation choice within existing
  protocol fields; no new direct A2A semantics will be introduced.
- Historical migrations, persisted-data models, MCP, and Agent Coordination artifacts remain
  outside deletion scope.

## Commands intentionally not run

No Gemini, external-flow, live/deployed Agent, provider, deployment, publication, migration,
production database, real KMS, real identity-provider, payment, load, stress, spike, soak,
regional simulation, or performance command was run.
