# Phase 15C completion report

Date: 2026-07-24

## Outcome and status

Phase 15C adds `ghostbridge-trust/0.1-draft`, a production-oriented trust
foundation for issuer identity, public-key discovery, signed protocol objects,
Host policy, key lifecycle, revocation, request integrity, replay protection,
and signed Execution Receipts.

The profile is experimental. It has not been externally audited, formally
verified, certified for production, or tested for broad external
interoperability. No production key was created, no package was published, and
no deployment was performed.

The existing Core and Governed Execution behavior remains compatible. Agent
Coordination remains Experimental/Deferred and is not required. The independent
CodeForge Provider and FlowDesk Host trust scenario does not use a
provider-specific adapter, MCP, or agent-to-agent communication.

## Source inventory

### Packages added

| Package | Purpose |
| --- | --- |
| `@ghostbridge/trust` | Bounded parsing and canonicalization, issuer and JWKS validation, JWK thumbprints, proof creation and verification, trust policy, issuer review, revocation, replay, request integrity, and Receipt verification |
| `@ghostbridge/issuer` | Reference issuer toolkit and isolated local test-key provider |

Both packages are private draft workspaces. Neither was published.

### Files created

- `packages/ghostbridge-trust/package.json`, implementation, declarations, and
  tests.
- `packages/ghostbridge-issuer/package.json`, implementation, declarations, and
  tests.
- Public schemas for proof, key metadata, issuer metadata, signed envelopes,
  agent execution keys, Capability Manifests, revocation entries and sets,
  trust results, request challenges and proofs, and Receipt proofs under
  `protocol/schemas/0.1-draft`.
- Normative draft documents for the trust profile, issuer identity and
  discovery, proof profile, key discovery and lifecycle, rotation, revocation,
  audience binding, replay protection, request integrity, Receipt proof, and
  trust errors under `protocol/specification/0.1-draft`.
- `protocol/threat-model/phase-15c-trust.md`.
- Security guidance under `docs/security` for trust, issuer identity and
  discovery, Passport signing, key management and rotation, revocation,
  request integrity, replay, Receipt verification, issuer compromise, trust
  policies, and authentication profiles.
- `Backend/src/models/IssuerTrustRecord.js`,
  `Backend/src/models/ConnectionTrustRecord.js`, and
  `Backend/src/models/TrustReplayRecord.js`.
- `Backend/src/services/trustMetrics.service.js`,
  `Backend/scripts/migrateGhostBridgeTrust.js`, and trust-storage tests.
- `frontend/src/pages/TrustConsole.jsx`.
- Local trust fixture plus issuer-trust, key-rotation,
  revocation-distribution, request-integrity, cross-company, and aggregate
  verifier scripts under `scripts`.
- `docs/engineering/phase-15c-cleanup-inventory.md` and this report.

### Files modified

- Root workspace scripts, build/test orchestration, lockfile, README, and
  protocol README.
- Protocol Core error codes, parsing bounds, schemas, and schema tests.
- Native Client, Native Agent, Conformance, and Inspector package manifests,
  implementations, declarations, and tests.
- CodeForge Provider and FlowDesk Host fixtures.
- Passport, Connection Offer, Install Grant resolution, and Execution Receipt
  schemas.
- Frontend routes, sidebar, Passport-resolution trust display, documentation
  manifest, and generated `llms.txt` indexes.
- Backend package scripts.

No Phase 15C file was removed. Historical migrations and retained
compatibility code were not rewritten.

### Dependencies

Only internal workspace dependencies on `@ghostbridge/trust` and
`@ghostbridge/issuer` were added. The implementation uses the maintained Node
`crypto` runtime for Ed25519, SHA-256, and public JWK operations. No new
third-party cryptography, MCP, KMS, or identity-provider dependency was added.

## Trust-profile design

### Issuer identity, discovery, and metadata

An issuer ID is an exact normalized HTTPS origin. User information, query
strings, fragments, non-root paths, unsafe schemes, and literal
private/loopback remote destinations are rejected. HTTP is available only for
an explicitly allowlisted loopback issuer in local fixture mode.

Discovery uses:

`{issuer-origin}/.well-known/ghostbridge-issuer`

Fetches are bounded by timeout and response size and do not follow redirects.
Metadata validation binds the claimed issuer to the requested origin and
checks status, sequence, issuance/expiry, algorithms, trust profile, and
same-origin public endpoints. Sequence tracking rejects rollback.

Issuer metadata is rooted in a separately pinned public root-key thumbprint.
Operational keys come from the issuer's bounded public JWKS. Public JWK
validation rejects private members, symmetric keys, duplicate key IDs,
duplicate thumbprints, unsupported curves, changed material under one key ID,
and test keys in production mode.

RFC 7638-style SHA-256 JWK thumbprints bind the public Ed25519 members. `EdDSA`
is the sole allowed draft algorithm. `none`, HMAC algorithms, unprotected
algorithm/key selection, embedded JWKs, `jku`, `x5u`, and unsupported critical
headers are rejected.

### Canonicalization and signed envelopes

`ghostbridge-jcs/0.1-draft` produces deterministic UTF-8 JSON for plain public
data with sorted object keys and bounded depth, arrays, strings, and total
bytes. Non-finite numbers, invalid Unicode, prototype-sensitive keys, and
duplicate JSON keys are rejected. SHA-256 digests use the canonical bytes.

`ghostbridge-proof/0.1-draft` uses compact JWS with protected `alg`, `kid`,
`typ`, and profile fields. Proof verification independently checks issuer,
audience, time, key purpose, key state, algorithm, digest, and signature.
Errors expose bounded safe codes rather than key material or signed payloads.

The following protocol objects can be signed and verified:

- Agent Passport.
- Capability Manifest.
- Install Grant resolution.
- Connection Offer.
- issuer metadata and revocation sets.
- request descriptors.
- Execution Receipt.

Passport verification binds the signed Capability Manifest digest and the
issuer-authorized agent execution key. Capability count and exact contract
digests prevent unsigned capability insertion or risk/approval/Data Contract
mutation.

### Connection trust and policy

The Native Client verifies the issuer root, issuer metadata, JWKS, Passport,
Capability Manifest, signed installation resolution, and Connection Offer
before creating a trust-required Connection.

The resulting Connection Trust Record binds:

- issuer, agent, Passport ID/version/digest, and Capability Manifest digest;
- verified issuer key ID and thumbprint;
- trust-profile and policy decision;
- selected authentication profile and Host audience;
- organization, workspace, and approved capabilities;
- verification and revocation state.

Cryptographic validity is separate from Host approval. Trust results include
verified-and-trusted, review-required, cryptographically-valid-but-untrusted,
warning, indeterminate, suspended, revoked, blocked, and invalid.

Organization policies cover allow/block lists, pinned roots, accepted
algorithms and profiles, cache/revocation bounds, conformance, authentication,
risk, side effects, Receipt/approval requirements, and failure behavior.
Workspace policy may narrow but cannot silently weaken the active organization
policy. Unknown high-impact issuers are not silently trusted.

`IssuerReviewWorkflow` implements discovered, pending-review, approved,
approved-with-limits, suspended, blocked, expired-review, and revoked states.
Administrator decisions are explicit and audited. Limited approval can bind a
workspace, selected agents, selected capabilities, risk ceiling, and expiry.
Review evidence separates issuer metadata, public policies/docs, Registry
observation, conformance evidence, warnings, and revocation freshness.

### Private-key provider and lifecycle

`IssuerToolkit` depends on a signing-key provider contract rather than reading
raw private key files. `LocalTestKeyProvider` keeps private `KeyObject`
instances in a private map, exports only public JWK metadata, never returns
private bytes, and refuses production mode.

Key states are generated, prepublished, active, retiring, retired, suspended,
revoked, expired, and compromised. Transition rules enforce:

- only active, purpose-authorized keys sign new objects;
- prepublication before activation;
- bounded old-key verification during overlap;
- no signing with retired/revoked/compromised/expired keys;
- no key-ID reuse or silent public-material substitution;
- retained public metadata for historical verification;
- explicit audit events for rotation, compromise, and revocation.

The rotation verifier covers generation, prepublication, activation, overlap,
new-key signing, old-object verification, retirement, cache refresh, sequence
increase, rollback rejection, and audit evidence.

### Revocation, freshness, and historical verification

Signed revocation sets contain an issuer-scoped monotonically increasing
sequence, generation/next-update times, the previous-set digest, and bounded
entries. Validation checks the proof, sequence, chain, time, and entry bounds.

The cache is issuer-scoped and rejects non-increasing updates. It supports
explicit invalidation and freshness states: fresh, nearing expiry, stale,
unavailable, invalid, and rollback detected. High-risk behavior fails closed
when policy requires fresh revocation data.

Historical Receipt classification distinguishes valid-at-execution,
revoked-after-execution, compromised-history warning, invalid-at-execution,
and indeterminate history. A current compromise does not silently rewrite the
recorded historical result.

### Request integrity, replay, and authentication

`ghostbridge-http-signature/0.1-draft` signs a canonical request descriptor
binding method, path, content digest, audience, Connection, Invocation,
organization/workspace, scope, message ID, nonce, issuance, and expiry. The
Native Agent can require this negotiated profile and reject missing, replayed,
expired, future-issued, wrong-key, wrong-method/path/body/audience/scope, or
invalid-signature requests with safe errors.

The in-process replay cache has atomic consume semantics and bounded entries.
The backend replay model adds a unique authenticated-message index and TTL
cleanup for a durable deployment integration.

Authentication profiles remain separate from issuer trust. The draft
documentation covers none, OAuth, mutual TLS, signed request, managed
credential, delegated credential, and platform-brokered negotiation without
putting runtime credentials into public trust records.

### Signed Receipts

The Native Agent can sign an Execution Receipt with the Passport-authorized
execution key. Verification binds issuer, audience, Passport, execution key,
Connection/Invocation context, time, and proof. It rejects a valid signature
from an execution key not authorized by that Passport.

## Product, Inspector, Registry, and operations

- Installation preview separates cryptographic status, Host trust, Registry
  observation, audit state, and revocation freshness. Advanced details remain
  public-key metadata only.
- Authenticated Console routes exist for Issuers, Trust Policies, Signing Keys,
  Revocation, and Verification Events. Their safe empty-state projection makes
  clear that administrator review is required and that no private signing-key
  bytes enter the Console.
- Inspector APIs cover issuer, metadata, keys, Passport proof, capability
  integrity, Connection trust, revocation, request/Receipt proof, policy
  result, and safe errors while retaining loopback-only defaults.
- Registry documentation uses separate labels for cryptographic verification,
  Host issuer approval, Registry observation, local conformance, and external
  audit. It does not use a single ambiguous “Verified” state.
- Trust audit events cover discovery, metadata, review, key lifecycle,
  Passport/install/request/Receipt processing, revocation, rollback, replay,
  and cache invalidation. Payload redaction excludes keys, credentials,
  authorization headers, cookies, raw grants, and customer inputs/outputs.
- Metrics accept only bounded low-cardinality outcome, category, algorithm,
  key-state, and freshness labels. Issuer, key, Passport, tenant, Connection,
  Invocation, Receipt, request, and trace identifiers are not metric labels.

## Storage, migration, and indexes

The additive Mongoose models store scoped issuer review/key observations,
Connection Trust Records, and replay records. Indexes cover:

- organization/workspace/issuer uniqueness;
- issuer metadata sequence and observed key ID/thumbprint;
- unique Connection ID, Passport version, and next verification;
- authenticated-message replay uniqueness;
- replay-record TTL cleanup.

`migrateGhostBridgeTrust.js` only calls additive `createIndexes` operations and
reports itself as idempotent, restart-safe, rolling-safe, and non-destructive.
It was syntax-checked and its model/index contracts were tested. It was not
run against a production database.

## Verification evidence

The final root test run contains 980 passing tests across 14 workspace
summaries, with zero failures, skips, or cancellations. Phase 15C directly adds
14 trust unit tests, 9 issuer integration-style tests, and 2 backend
storage/metric tests, in addition to verifier scenarios.

The required commands passed:

- `npm test`
- `npm run build --workspace frontend`
- demo, sandbox, policy, secret, compliance, enterprise, orchestration,
  selection, delegation, recovery, observability, scale, data, DR, capacity,
  release, pilot, analytics, and GA deterministic verifiers;
- Native Protocol, SDK, docs, Inspector, cleanup, Phase 15B, universal
  compatibility, governed compatibility, and Phase 15B.1 realignment
  verifiers;
- all Phase 15C verifiers and the Phase 15C aggregate.

The configured database was initially unavailable for the demo, sandbox, and
enterprise-operations commands. After network access was approved and the
configured replica set became reachable, all three were rerun and passed. No
live model/provider was called.

### Phase 15C verifier outputs

| Verifier | Final result |
| --- | --- |
| `verify:ghostbridge-issuer-trust` | PASS: discovery, origin/metadata/JWKS/root, thumbprints/algorithms, signed Passport/manifest/install/offer/Receipt, policies, audience, freshness, administrator review, leakage and dependency boundaries |
| `verify:ghostbridge-key-rotation` | PASS: 15 rotation and rollback checks plus aggregate |
| `verify:ghostbridge-revocation-distribution` | PASS: 16 signing, sequence, cache, freshness, rollback, failure-policy, invalidation, and history checks plus aggregate |
| `verify:ghostbridge-request-integrity` | PASS: 16 binding, digest, nonce, replay, time, key, algorithm, signature, and safe-error checks plus aggregate |
| `verify:cross-company-trust` | PASS: 22 independent issuer/provider/Host, installation, Invocation, signed request/Receipt, rotation/revocation/replay, leakage, and architectural-boundary checks plus aggregate |
| `verify:ghostbridge-phase-15c` | PASS: retained Phase 15B.1 aggregate, all five Phase 15C verifiers, no MCP, no agent-to-agent requirement, and grounded research disabled |

The documentation verifier reports 122 unique public pages with current
`llms.txt` indexes, weighted trust guidance, safe local retrieval, no private
Console content in public indexes, and explicit Draft/Preview status.

The following prohibited commands were not run:

- `verify:gemini-agent`
- `verify:external-flow`
- all local, regional, stress, soak, and staging performance-load commands

No package publish or deployment command was run.

## Known limitations and external-review requirements

- The trust profile and its canonicalization/proof construction require
  independent cryptographic and protocol review.
- The request-integrity profile is Ghost Bridge draft semantics, not a claim of
  full RFC 9421 interoperability.
- The default implementation targets Node. Other runtimes need a reviewed
  cryptographic backend with equivalent behavior.
- There is no production HSM/KMS key-provider adapter in this repository.
  Only ephemeral local test keys were used.
- Literal unsafe discovery destinations and redirects are blocked. Deployment
  resolvers, proxies, DNS rebinding defenses, certificate validation, egress
  policy, and split-horizon DNS still need environment-specific review.
- SDK caches and replay protection are in-process foundations. Durable
  multi-process atomic integration must use the provided storage contracts or
  an equivalent deployment service.
- Clock synchronization, emergency revocation distribution, cache retention,
  fail-open/fail-closed choices, verification concurrency, and denial-of-service
  limits require deployment-specific capacity and incident testing.
- Console pages provide the authenticated trust-administration information
  architecture and safe projection. Connecting them to organization-specific
  review mutation APIs remains a Platform deployment concern.
- No real Replit, Gumloop, external issuer, identity provider, KMS, or broad
  cross-vendor interoperability test was performed.

## Candidate Phase 15D work

- commission an independent security audit and publish reviewed test vectors;
- add interoperable implementations in a second runtime;
- add production HSM/KMS provider adapters and operational ceremonies;
- integrate durable distributed replay, metadata, revocation, and policy cache
  services with atomic invalidation;
- complete deployment-specific Console review APIs, notifications, and
  separation-of-duties workflows;
- run controlled external-issuer interoperability and incident exercises;
- promote the profile only through an explicit compatibility and governance
  process after the above evidence exists.

