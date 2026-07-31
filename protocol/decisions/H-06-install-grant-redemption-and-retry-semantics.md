# H-06 — Install Grant redemption and retry semantics

## Decision ID

`H-06`

## Status

**ACCEPTED**

Option B — Exact-intent convergent redemption, the complete durable
authority-creation transaction, the durable-observability authority commit
point, exact authenticated replay convergence, conflict-safe non-disclosure,
lost-response recovery, strict half-open expiry, serialized redemption, expiry,
and revocation races, minimum replay-result retention, commit-before-audit
ordering, secret exclusion, and immutable historical treatment were approved by
rudra on 2026-07-31.

All qualifications, residual risks, compatibility consequences, security
consequences, and deferred boundaries recorded in this decision and its
verbatim human approval are part of the approval.

Before human acceptance, current prose, development behavior, production
behavior, passing tests, and implementation behavior were evidence only and
could not approve H-06. The identified human approval recorded below is the
source of this governance disposition; implementation behavior still cannot
substitute for it.

This acceptance records a protocol-governance decision only. It does not create
normative requirements, schemas, executable state machines, fixtures, vectors,
conformance cases, SDK or runtime behavior, Agent or Client behavior, Platform
behavior, storage migration, public error mappings, deployment, publication,
release, gap closure, or Protocol 1.0 conformance.

H-01 through H-05 remain `ACCEPTED`. H-06 is `ACCEPTED`. H-07 through H-14
remain deferred. No Protocol 1.0 claim is made.

## Date prepared

2026-07-31

## Purpose

H-06 records the human choice governing interoperable Install Grant redemption,
concurrency, ambiguous transport recovery, and the authority-creation commit. It
separates evidence about existing implementations from the accepted semantic
model. Acceptance does not itself change historical `ghostbridge/0.1-draft`
artifacts, current runtime behavior, or any normative or conformance artifact.

## Decision scope

The accepted H-06 decision settles all of the following as one coherent
semantic bundle:

- the Install Grant lifecycle relevant to resolution and redemption;
- the exact successful authority-creation commit point;
- the contents of the atomic authority-creation transaction;
- the identity and contents of the authoritative Connection result;
- repeated redemption after committed success;
- concurrent identical and concurrent conflicting redemption;
- retry after a lost, interrupted, or timed-out response;
- process crash and restart at every transaction boundary;
- grant expiry and grant revocation at and around commit;
- grant-state and Connection-state consistency;
- durable result/replay retention and authenticated replay eligibility;
- exact-intent equality versus conflicting reuse;
- response timing relative to durable commit and observability;
- safe resolution behavior after redemption;
- secret, privacy, and result-disclosure handling;
- semantic failure categories independent of public wire representation;
- audit and metric ordering relative to authority commit;
- compatibility and migration consequences; and
- later normative, schema, state-machine, fixture, conformance, SDK, Agent,
  Client, storage, migration, and security-review work.

The accepted decision preserves these distinctions:

- **Resolution versus redemption:** resolution is an informational inspection;
  redemption is the authority-creation attempt.
- **Request versus result:** a redemption request expresses intent; a
  redemption result identifies the durable authority outcome.
- **Retry versus new installation:** a request retry repeats one exact intent;
  a new installation uses a new grant, consent, or materially different intent.
- **Exact replay versus conflict:** an exact eligible replay converges on one
  result; conflicting reuse must not receive or create authority.
- **Possession versus eligibility:** possession of a grant presentation value
  does not establish the authenticated replay principal or permit result
  disclosure.
- **Serialization versus delivery:** transaction serialization settles the
  durable semantic outcome; HTTP response delivery merely reports it.
- **Creation versus activation:** constructing a candidate Connection is not
  creation of protocol authority; an `active` Connection becomes authoritative
  only at the accepted durable commit point.
- **Grant versus Connection revocation:** grant revocation prevents a later
  grant commit; it does not by itself revoke a Connection already created by a
  successful commit.
- **Semantics versus wire errors:** H-06 may name semantic outcomes, while H-12
  retains HTTP status, public error, precedence, retry headers, and transport
  representation.
- **Grant replay versus Invocation idempotency:** H-06 is purpose-bound to
  Install Grant authority creation; general Invocation idempotency associated
  with `GB-017` and future normative work is a different operation, namespace,
  result, and risk.
- **Lock versus authority:** an internal transaction lock or lease can serialize
  work but is never protocol-visible authority.
- **Commit versus telemetry:** durable committed state is authoritative; an
  audit record, audit intent, metric, or delivery acknowledgment is not the
  authority commit.

## Out of scope

H-06 does not decide:

- the complete Connection state machine, retained by H-07;
- exact-action Approval consumption, retained by H-08;
- Task creation, cancellation, result, or Receipt races, retained by H-09;
- canonical bytes, digest algorithms, signature algorithms, encodings, or
  cryptographic domains, retained by H-10;
- revocation-set publication, sequencing, freshness, anti-rollback, key
  rotation, or historical Receipt validity, retained by H-11;
- exact HTTP routes, methods, statuses, headers, public error identifiers,
  precedence, retries, limits, timeouts, redirects, media types, or logging
  fields, retained by H-12;
- schema openness and extension evolution, retained by H-13;
- registry, support, release, or Protocol 1.0 governance, retained by H-14;
- production implementation, storage technology, distributed consensus
  technology, database vendor, lock mechanism, queue implementation, exact
  identifier syntax, or migration execution.

H-06 may identify semantic fields which later H-10 canonicalization must bind
and semantic outcomes which later H-07, H-11, H-12, and H-13 artifacts must
represent. That identification does not authorize those later artifacts.

## Accepted-decision dependencies

### H-01 — lifecycle initialization and ordering

H-01 accepts public, authority-free discovery and an explicit result committed
with redemption and final Connection creation. Its controlling sequence makes
discovery and preview non-authoritative; requires Trust and authentication to
complete before redemption; binds the exact immutable consent envelope; requires
the Agent to revalidate the envelope and final selection; and requires a new
preview and explicit human consent after a material difference
(`protocol/decisions/H-01-lifecycle-initialization-and-ordering.md:714-746`).

H-06 must therefore preserve:

- discovery, resolution, preview, consent, Trust, and authentication as
  non-authoritative before commit;
- normal failure of negotiation, Trust, authentication, scope, consent,
  capability, and policy validation before grant consumption;
- Agent revalidation of the exact immutable consent envelope and final selected
  result at redemption;
- a new preview and explicit human consent after a material difference;
- the atomic successful redemption and durable Connection-creation commit as the
  exact authority-initialization point;
- an `active` Connection becoming authoritative only at that commit;
- restart loading durable Connection history rather than renegotiating from
  current discovery; and
- H-06 ownership of exact grant-consumption transaction, repeat, concurrency,
  and recovery semantics.

### H-02 — roles, trust boundaries, and authorization floor

H-02 makes the Agent the final protocol-floor enforcement point, makes effective
authority the intersection of authentication, active Connection, tenant, Trust,
authorization, and Approval, and requires principal derivation from trusted
evidence rather than the request body
(`protocol/decisions/H-02-roles-trust-boundaries-and-authorization-floor.md:976-1008`).

H-06 must therefore preserve:

- authentication identifies the Host principal but grants no Connection or
  action authority;
- the Agent remains the final protocol-floor enforcement point;
- effective authority remains a narrowing intersection;
- a body-supplied principal is never authoritative;
- replay-result disclosure never relies solely on grant possession; and
- redemption creates no Agent-to-Agent authority transfer.

### H-03 — protocol version identity and history

H-03 requires the final exact release to be selected only after eligibility
filters and committed during redemption, with no package constant, current
pointer, adjacent-version inference, or fallback
(`protocol/decisions/H-03-protocol-version-identity-and-history.md:197-217`).
It binds the release and immutable evidence into the grant context and durable
Connection, and forbids restart or fresh discovery from reinterpreting that
Connection (`protocol/decisions/H-03-protocol-version-identity-and-history.md:245-280`).

H-06 must therefore preserve:

- interpretation of every grant and Connection result under the exact selected
  protocol release;
- historical meaning independent of current defaults or mutable pointers;
- durable historical identification of the authoritative result and its
  evidence identity; and
- the distinction among SDK, package, deployment, grant, credential,
  Connection, and protocol versions.

### H-04 — capability, profile, and optional-feature negotiation

H-04 accepts layered monotonic intersection and a hybrid direct/reference
binding (`protocol/decisions/H-04-capability-profile-and-optional-feature-negotiation.md:1702-1745`).
It makes selected identities non-substitutable, binds consent to exact versions
and restrictions, requires the durable Connection to retain authority-critical
semantics, and prohibits restart reinterpretation
(`protocol/decisions/H-04-capability-profile-and-optional-feature-negotiation.md:1810-1854`).

H-06 must therefore preserve:

- the final result as the monotonic intersection of accepted source-owned
  ceilings;
- non-substitutability of selected version, profiles/facets, capabilities,
  authentication identifier, experiments, extensions, omissions, limitations,
  and evidence;
- explicit Host selection of one eligible authentication identifier, with no
  array-order or fallback selection;
- consent binding to exact selected values and material restrictions;
- direct retention of authority-critical safe semantics plus immutable evidence
  identity or a future H-10-qualified digest in the durable Connection; and
- no renegotiation or reinterpretation of the final result during retry.

### H-05 — authentication profiles and credential binding

H-05 requires an exact final secret-free authentication preview, explicit human
consent, and redemption-time revalidation before the atomic Connection commit
(`protocol/decisions/H-05-authentication-profiles-and-credential-binding.md:1149-1193`).
It derives the Host principal from verified evidence, distinguishes the
authentication audience, keeps reusable credential material outside protocol
artifacts, prohibits downgrade/fallback, and requires replacement after
material identity, profile, target, or tenant change
(`protocol/decisions/H-05-authentication-profiles-and-credential-binding.md:1643-1739`).

H-06 must therefore preserve:

- completion of authentication establishment and validation before authority
  commit;
- explicit human consent to the final exact secret-free authentication result;
- distinction between the authenticated Host principal and Agent/resource
  authentication audience;
- replay eligibility based on current verified selected-profile evidence;
- the rule that a credential or grant reference is never proof by itself;
- exclusion of reusable credential material from protocol artifacts;
- replacement rather than in-place rebinding after profile, principal, issuer,
  Agent, Passport, audience, organization, or workspace change;
- no weaker-profile, bearer-for-PoP, cached-success, provider-default,
  broker-failure, or `none` fallback; and
- H-06 control of grant consumption, replay, concurrency, and lost-response
  outcomes.

## Affected gaps and Phase items

H-06 primarily affects:

- `GB-009` — Install Grant semantics and the direct retry/concurrency
  contradiction;
- `GB-010` — exact preview/consent/result binding into redemption;
- `GB-017` — operation-specific idempotency and ambiguous retry safety;
- `GB-034` — future semantic-to-public error taxonomy; and
- `GB-035` — future HTTP status mapping.

Coupled boundaries include `GB-011` and `GB-012` for Connection authority and
tenant absence/equality; `GB-014` and `GB-015` for identifiers and transport
timeouts; `GB-028` through `GB-033` for retained historical and current Trust,
key, revocation, freshness, and anti-rollback evidence; `GB-039` for
credential-safe redirect behavior; `GB-047` and `GB-049` for security,
redaction, audit ordering, and observability; `GB-052` and `GB-053` for future
canonical vectors and malicious fixtures; and `GB-058`, `GB-059`, and `GB-060`
for independent interoperability, external review, and stable-release gates.
The gap register identifies the primary contradiction at
`docs/protocol/normative-specification-gap-analysis.md:60-68`, the coupled
Trust/error/observability gaps at `:84-105` and `:118-124`, and the independent
evidence/release gates at `:129-131`.

H-06 maps to:

- `D1-03` — installation, Connection, commit, timeout, idempotency, and retry
  prose;
- `D2-02` — later machine-readable Grant state machine and invariants;
- `D2-04` — later malicious, failure, concurrency, compatibility, and recovery
  fixtures; and
- `P1-03` — later independent authority, grant, storage, privacy, and replay
  security review.

The plan records this exact H-06 mapping at
`docs/protocol/phase-15d-plan.md:29`, and the four work-item boundaries at
`:87`, `:112`, `:114`, and `:151`. H-06 acceptance alone closes no gap.
Closure would require separately authorized normative text, schemas, state
machines, fixtures, conformance evidence, independent implementation evidence,
and review as applicable.

## Repository evidence

All evidence in this section is descriptive. Its existence, maturity, test
coverage, or deployment use does not make it protocol authority.

### Governance and audit evidence

| Evidence | Useful lines | Observation |
| --- | --- | --- |
| `docs/protocol/phase-15d-plan.md` | `29`, `87`, `112`, `114`, `151` | Assigns H-06 and later prose, state-machine, malicious-fixture, and security-review work. |
| `docs/protocol/normative-specification-gap-analysis.md` | `60-68`, `136`, `175`, `197`, `257` | Records the development/production contradiction, missing schemas, lost-response risk, JS-only transaction tests, and H-06 scope. |
| `protocol/decisions/README.md` | `5-31`, `33-64`, `89-115` before this edit | Separates evidence from approval, defines `PROPOSED`, and requires identified human approval. |
| H-01 | `protocol/decisions/H-01-lifecycle-initialization-and-ordering.md:714-753` | Places authority at the atomic redemption/Connection commit. |
| H-02 | `protocol/decisions/H-02-roles-trust-boundaries-and-authorization-floor.md:976-1008` | Requires trusted-principal derivation, Agent enforcement, and intersection authority. |
| H-03 | `protocol/decisions/H-03-protocol-version-identity-and-history.md:197-280` | Requires exact selected release and immutable historical binding. |
| H-04 | `protocol/decisions/H-04-capability-profile-and-optional-feature-negotiation.md:1702-1854` | Requires monotonic intersection, exact selection, and direct/reference durable binding. |
| H-05 | `protocol/decisions/H-05-authentication-profiles-and-credential-binding.md:1149-1193,1643-1739` | Requires final consent, current verified principal evidence, no secret retention, and no downgrade. |

### Historical prose and schema evidence

| Evidence | Useful lines | Observation |
| --- | --- | --- |
| `protocol/specification/0.1-draft/install-grant.md` | `3-11` | Calls a grant opaque, short-lived, one-time, replay-protected and revocable; then says redemption is atomic and idempotent and concurrent redemption creates one Connection. |
| `protocol/specification/0.1-draft/connection.md` | `3-10` | Describes a secret-free Connection Offer but not an authoritative redemption result. |
| `protocol/specification/0.1-draft/security-considerations.md` | `3-13` | Calls for atomic grant consumption, idempotency binding, revocation checks, redaction, and bounded metrics without defining the transaction or retry result. |
| `protocol/schemas/0.1-draft/install-grant-resolution.schema.json` | `4-18`, `29-34` | Defines an informational resolution and `redemptionState`, but not a redemption request or authoritative Connection result. |
| `protocol/schemas/0.1-draft/connection-offer.schema.json` | `4-28`, `29-40` | Defines an Offer and selected setup metadata, not committed Connection authority. |
| `protocol/schemas/0.1-draft/error.schema.json` | `4-17` | Allows any uppercase error code and generic retry fields; it does not distinguish H-06 semantic outcomes. |

The historical draft is evidence of intended meaning, not an approval of any
new release rule. Its bytes and historical interpretation must remain intact.

### Native Agent evidence

| Area | Useful lines | Current observed behavior |
| --- | --- | --- |
| Grant issuance and resolution | `packages/ghostbridge-native-agent/src/index.js:442-533` | Creates a random presentation value, stores a digest-indexed active grant, returns a reference/expiry, resolves separately, and chooses development or production redemption paths. |
| HTTP authentication | `packages/ghostbridge-native-agent/src/index.js:1190-1228` | Requires a verified Host principal for redemption but takes tenant fields from the request body for scope construction. |
| Development redemption | `packages/ghostbridge-native-agent/src/index.js:1551-1660` | Allows a redeemed grant, returns its existing Connection with `idempotentReplay: true`, creates active Connection/grant records, then emits metrics/audits. It does not bind a stable attempt ID, exact consent/result digest, or authenticated replay principal. |
| Production validation and candidate | `packages/ghostbridge-native-agent/src/index.js:1663-1791` | Validates inputs and trusted grant, creates a candidate Connection before invoking the transaction adapter, and submits grant digest, time, scope, capabilities, and candidate. The candidate alone is not trusted or authoritative. |
| Production result verification | `packages/ghostbridge-native-agent/src/index.js:1792-1861` | Maps a transaction loser to `INSTALL_GRANT_ALREADY_REDEEMED`, deep-compares the returned grant/Connection with trusted expectations, performs a durable post-transaction read, then emits metrics/audits and returns the projection. |
| Resolution and grant checks | `packages/ghostbridge-native-agent/src/index.js:1864-1941` | Projects current grant status; uses `expiresAt <= now` as expired; rejects revoked and, in the production path, redeemed grants; then checks tenant scope. |
| Public Connection projection | `packages/ghostbridge-native-agent/src/index.js:2088-2104` | Returns version, IDs, tenant, status, authentication, capabilities, creation time, and revocation reference, but lacks the full H-01–H-05 authoritative-result inventory. |
| Production store validation | `packages/ghostbridge-native-agent/src/index.js:2410-2480` | Requires a production-eligible durable transaction adapter advertising atomic grant redemption. This is an implementation interface, not deployment-neutral semantics. |
| Safe mapping and HTTP mapping | `packages/ghostbridge-native-agent/src/index.js:2490-2501,2898-2970` | Maps a small set of safe grant errors; the generic HTTP mapper leaves most grant outcomes at 400 and belongs to H-12. |
| Resolution/redemption routes | `packages/ghostbridge-native-agent/src/index.js:2779-2836` | Exposes POST resolution and authenticated POST redemption, including fixture-only legacy path forms. Exact routes remain H-12. |
| Audit/metric helper | `packages/ghostbridge-native-agent/src/index.js:200-234` | Emits in-process metrics and filtered audit fields; redemption calls these only after the current durable observability check, but delivery durability/failure semantics are undefined. |

Production code constructing a candidate before transaction entry is not an
authority leak by itself: only the adapter result, exact result verification,
and durable stored result are relied upon. A future decision must nevertheless
say explicitly that candidate construction, transaction entry, or an internal
lock grants no authority.

### Storage and transaction evidence

| Evidence | Useful lines | Observation |
| --- | --- | --- |
| `packages/ghostbridge-native-agent/src/index.d.ts` | `117-149` | The transaction contract accepts a grant digest, time, tenant, capabilities, and candidate, and returns only a grant plus Connection. It has no replay/result record or authenticated replay identity. |
| `packages/ghostbridge-native-agent/src/fileProtocolStores.js` | `55-112` | The file store serializes an in-process exclusive draft and replaces one state file after syncing the file; this is useful test/local evidence, not a required storage technology or cross-instance consensus model. |
| `packages/ghostbridge-native-agent/src/fileProtocolStores.js` | `276-376` | The local transaction rejects redeemed/revoked/expired grants, creates one Connection, and updates the grant in one exclusive state replacement. It does not converge exact replay. |
| `backend/scripts/verifyPhase15c1aR1MongoStoreContract.js` | `278-361`, `512-528` | A database-specific verification adapter rejects an already-redeemed loser and tests one winner. Database-specific mechanics cannot become protocol law. |

### Native Client evidence

| Area | Useful lines | Current observed behavior |
| --- | --- | --- |
| Resolution and preview | `packages/ghostbridge-native-client/src/index.js:494-518,596-625` | Resolves separately, validates public material, and caches an informational preview. |
| Authentication and consent preparation | `packages/ghostbridge-native-client/src/index.js:635-692` | Prepares a selected authentication binding and requires explicit capability selection, but current cache state is process-local and not a protocol retry record. |
| Redemption and result validation | `packages/ghostbridge-native-client/src/index.js:695-739` | Sends a POST body, validates an active Connection response, and caches it only after a response arrives. It supplies no stable redemption-attempt ID or intent digest. |
| Timeout and transport error | `packages/ghostbridge-native-client/src/index.js:1000-1106` | Aborts on timeout and marks deadline/provider errors retryable at the SDK-error layer, but does not determine whether redemption committed. |
| Generic retry classifier | `packages/ghostbridge-native-client/src/index.js:1126-1145` | Treats unsafe side-effecting methods as retryable only with acknowledged idempotency and a same-request fingerprint; redemption supplies no such acknowledgment or fingerprint contract. |
| Preview cache identity | `packages/ghostbridge-native-client/src/index.js:1475-1490` | Hashes grant, tenant, audience, capabilities, authentication mode, and policy revision for a local cache key; this is not an H-10-qualified redemption-intent identity. |

The Client does not automatically retry Install Grant redemption. Its POST call
is made once by `redeemInstallGrant`; the generic classifier is separate and is
not invoked there. A timeout can therefore leave the Host without a
protocol-defined answer even though the SDK error says the transport condition
is retryable.

### Tests, fixtures, and Platform evidence

| Evidence | Useful lines | Observation |
| --- | --- | --- |
| `packages/ghostbridge-native-agent/test/agent.test.js` | `66-90` | Development mode expects same-Connection replay and one Connection. |
| `packages/ghostbridge-native-agent/test/security15c1a.test.js` | `554-646` | The production test transaction applies expiry, revocation, scope, capability, grant, and Connection changes under one exclusive helper and rejects redeemed state. |
| `packages/ghostbridge-native-agent/test/security15c1a.test.js` | `1631-1692` | File-backed concurrency expects one winner, one `ALREADY_REDEEMED` loser, and persistence after restart. |
| `packages/ghostbridge-native-agent/test/security15c1a.test.js` | `1694-1729` | Production Agent concurrency likewise requires one success and one rejected loser despite the historical idempotent-concurrency statement. |
| `packages/ghostbridge-native-agent/test/security15c1a.test.js` | `1731-1835` | Twenty-one transaction-adapter mutation cases require fail-closed result verification. |
| `packages/ghostbridge-native-client/test/client.test.js` | `78-90`, `126-147` | Exercises resolution/install and the generic retry classifier, not redemption lost-response convergence. |
| `scripts/black-box/raw-agent.mjs` | `384-458` | The black-box fixture exposes resolution and authenticated redemption but rejects a second redemption; it is fixture evidence, not a conformance rule. |
| `backend/src/services/platformNativeClient.service.js` | `530-611` | The Platform adapter previews, authorizes, calls the Client once, then verifies Trust/revocation and seals a Platform binding. Platform sequencing cannot define protocol authority. |
| `backend/src/tests/platformNativeClient.test.js` | `198-209`, `287-297` | Exercises one successful Platform installation, not lost-response or exact replay recovery. |

No dedicated lost-response/idempotent production replay fixture, no portable
concurrent-exact replay fixture, and no targeted production grant
expiry/revocation race fixture was found in the inspected paths. The current
store helpers do check expiry and revocation, but that is not a portable
state-machine or race contract.

## Explicit contradictions and unresolved evidence

1. **Historical atomic idempotency versus undefined identity.** Historical
   `install-grant.md:8-11` says redemption is atomic/idempotent and concurrent
   redemption creates one Connection, but it never defines exact intent,
   replay eligibility, the result record, or disclosure.
2. **Development convergence.** Development redemption allows `redeemed`,
   loads the referenced Connection, and returns `idempotentReplay: true`
   (`packages/ghostbridge-native-agent/src/index.js:1551-1564`).
3. **Production rejection.** Production maps the transaction provider's
   `INSTALL_GRANT_ALREADY_REDEEMED` to a terminal-looking protocol error
   (`packages/ghostbridge-native-agent/src/index.js:1792-1807`).
4. **Concurrent test divergence.** Production tests require one success and one
   rejected loser (`packages/ghostbridge-native-agent/test/security15c1a.test.js:1694-1729`),
   contradicting a natural reading of convergent historical concurrency.
5. **Candidate versus trusted outcome.** Production constructs a candidate
   Connection before the adapter, but trusts only the exact transaction result
   and its durable reread (`packages/ghostbridge-native-agent/src/index.js:1745-1846`).
   The semantic commit point is still not independently specified.
6. **Resolution state without redemption/result schemas.** The public
   resolution schema exposes `available`, `redeemed`, `expired`, or `revoked`,
   yet the repository has no complete redemption-request or authoritative
   Connection-result schema.
7. **Response validation without recovery.** The Client validates and caches a
   successful Connection only after response receipt
   (`packages/ghostbridge-native-client/src/index.js:695-739`); it has no
   protocol-defined recovery after a response is lost.
8. **Generic retry prerequisites absent.** The generic Client classifier
   requires acknowledged idempotency and same fingerprint for unsafe methods
   (`packages/ghostbridge-native-client/src/index.js:1126-1145`), but grant
   redemption has no independent acknowledgment, stable attempt ID, or
   fingerprint contract.
9. **Incomplete wire mapping.** The current safe error and HTTP mapper do not
   distinguish exact replay, racing exact replay, conflict, known commit with
   missing result, ambiguous response loss, or inconsistent durable state.
   Exact public mapping belongs to H-12.
10. **Tests exceed portable artifacts.** Concurrency, restart, atomicity, and
    malicious-adapter guarantees are substantial but remain JavaScript
    implementation tests, not portable normative state machines, fixtures, or
    conformance assets.

## Terminology

| Term | Meaning for this decision packet |
| --- | --- |
| **Install Grant** | A purpose-bound, bounded-lived authorization input that can initialize at most one Connection authority under the final accepted semantics. |
| **Grant secret or presentation value** | The high-entropy value presented for lookup/redemption. It is sensitive bearer-like material but is not by itself authenticated replay eligibility. |
| **Grant identity/reference** | The stable non-secret semantic identity of the issued grant, distinct from its presentation value. |
| **Grant digest or safe lookup identity** | A non-reversible, purpose-bound lookup representation of the presentation value. Its exact algorithm and bytes remain H-10. |
| **Grant issuer** | The authority which issues and binds the Install Grant, subject to H-02 and later normative definition. |
| **Grant target Agent** | The exact Agent, Passport context, and purpose-bound resource for which the grant is eligible. |
| **Grant scope** | The exact organization and explicit workspace absence/value plus grant ceilings and restrictions. |
| **Resolution** | Non-authoritative retrieval of safe preview information and informational grant state. It does not consume the grant or create authority. |
| **Informational redemption state** | A safe resolution projection such as available/redeemed/expired/revoked; it is not an authoritative result or proof of a transaction outcome. |
| **Redemption request** | One received attempt to commit an installation intent. Transport retries may produce several requests for one intent. |
| **Redemption intent** | The complete authority-critical semantic selection, consent, identity, scope, profile, and target intended to create one Connection. |
| **Redemption-attempt identifier** | A stable Host-generated identifier repeated only for the same intent. It is neither a bearer secret nor sufficient proof of equality. |
| **Redemption-intent identity or future H-10-qualified digest** | A stable semantic identity over every authority-critical intent field; the future digest representation is defined only after H-10. |
| **Exact replay** | A repeat with the same grant, attempt identifier, complete semantic intent, and authenticated replay principal/eligibility as the committed request. |
| **Conflicting replay** | Reuse of a grant or attempt identifier with any different authority-critical field or an ineligible principal. It receives no authoritative result. |
| **Concurrent identical redemption** | Two or more exact eligible requests whose transaction windows overlap before the committed result is observed. |
| **Concurrent conflicting redemption** | Overlapping requests for the same grant which differ in any authority-critical intent or authenticated replay eligibility. |
| **Authority-creation transaction** | The accepted indivisible durable operation that consumes the grant, creates the one Connection, and retains sufficient replay/result/conflict evidence. |
| **Transaction serialization point** | The deployment-neutral logical instant at which competing grant expiry, revocation, redemption, and replay observations receive one total outcome for that grant. It does not mandate a lock or database primitive. |
| **Successful authority commit** | Durable completion of the entire authority-creation transaction. No partial component grants authority. |
| **Authoritative Connection result** | The immutable secret-free semantic Connection outcome committed for the exact intent, returned identically on eligible replay. |
| **Immutable redemption-result identity** | A stable identity which binds the authoritative result and allows exact historical reconstruction without current defaults. Exact digest mechanics remain H-10. |
| **Durable replay record** | The committed, secret-free evidence binding grant, intent, authenticated replay eligibility, authoritative result, commit time, and conflict-safe history. |
| **Lost response** | A response that was not received or could not be trusted even though the server may have committed. |
| **Ambiguous transport outcome** | A timeout, reset, crash, or delivery failure which does not prove whether commit occurred. |
| **Committed success** | A complete durable authority commit, independent of response delivery. |
| **Uncommitted failure** | A known failure before successful authority commit; no Connection authority exists from that attempt. |
| **Expired grant** | A grant whose serialization time is at or after its exclusive `expiresAt` boundary and which had not already committed redemption. |
| **Revoked grant** | A grant for which authoritative revocation serialized before successful redemption. |
| **Redeemed grant** | A terminal grant bound by one successful commit to exactly one intent and one authoritative Connection result. |
| **Replay eligibility** | Current proof that the retry is exact and presented by the authorized authenticated replay principal under the selected H-05 profile and purpose-bound target. |
| **Authenticated replay principal** | The typed Host principal derived again from current verified H-05 evidence and compared with the committed replay binding. |
| **Result disclosure** | Returning any authoritative Connection/result data. It requires exact replay eligibility, not mere evidence that a Connection exists. |
| **Resolution tombstone** | A safe, minimal, non-authoritative terminal projection which avoids exposing the Connection result or sensitive conflict detail. |
| **Audit intent** | A durable, safe identity indicating that a post-commit audit delivery is required. It is not the audit event and does not create authority. |
| **Connection authority** | The scoped authority established only by the fully committed `active` Connection under H-01 through H-07. |
| **General Invocation idempotency** | A separate mechanism for deduplicating or replaying governed Invocation effects/results; it has a different operation, namespace, authority, and future decision boundary. |

### Controlling non-equivalences

- Resolution is not redemption.
- Successful validation is not grant consumption.
- Transaction start is not authority creation.
- Grant possession is not authenticated replay eligibility.
- Repeated presentation is not necessarily exact replay.
- One Connection existing is not proof that the caller may retrieve it.
- `already redeemed` is not sufficient lost-response recovery.
- An HTTP timeout is not proof that the transaction failed.
- Response delivery is not the commit point.
- An audit event is not the authority commit.
- Grant revocation is not automatically Connection revocation after successful
  commit.
- A current provider, discovery document, package, deployment, or default cannot
  reinterpret the committed result.
- Install Grant replay is not general Invocation idempotency.

## Decision questions retained as review history

The following questions and selectable choices are retained as the review
history from which the human selected the accepted Option B bundle.

### Transaction and authority

| Question | Selectable choices for review |
| --- | --- |
| What writes belong to atomic success? | Grant plus Connection only; grant plus Connection plus replay/result record; or another explicitly bounded bundle. |
| Are consumption and creation indivisible? | Yes, one semantic transaction; or no, with a separately justified recovery state. |
| Is the replay/result record in the same transaction? | Yes; no, with a proven fail-closed reconstruction contract; or separate recovery handle. |
| When does Connection authority begin? | Durable full-bundle commit; another explicit point; never candidate construction, lock acquisition, or response delivery. |
| May success precede durable observability? | No; or yes only with a separately approved durable acknowledgment model. |
| Is `redeeming` protocol-visible? | No, internal only; or yes as a separately specified non-authoritative state with recovery rules. |

### Redemption intent

| Question | Selectable choices for review |
| --- | --- |
| Which fields identify one exact intent? | Full H-01–H-05 semantic bundle; a smaller named subset with substitution analysis; or a recovery-handle model. |
| Is a Host-generated attempt ID required? | Required and stable per intent; optional; or replaced by another purpose-bound identity. |
| Is grant possession enough to replay? | No, current authenticated eligibility required; or a deliberately accepted bearer-disclosure model. |
| Must the same Host principal retry? | Exact same typed principal; a named equivalence class; or separately authorized recovery principal. |
| How is equality decided before H-10? | Field-by-field semantic equality under the selected release, later represented by H-10 bytes/digest; or defer all replay until H-10. |

### Repeat and concurrency

| Question | Selectable choices for review |
| --- | --- |
| Exact repeat after success? | Return same authoritative result; reject as consumed; or use a separate recovery handle. |
| Two exact concurrent requests? | Converge on same result; one succeeds and one receives consumed; or create/poll an operation object. |
| Concurrent requests differ? | Serialize one winner and reject the conflict without disclosure; reject all; or another explicitly safe rule. |
| May an exact loser receive `already redeemed`? | Never as the eventual semantic result; yes; or only as a temporary H-12 representation with mandatory recovery. |
| Must successful replay be identical? | Yes, same semantic Connection/result identity; or a specified projection compatible with immutable history. |
| May any retry create a second Connection? | No under all models; any contrary choice requires explicit authority-duplication analysis. |

### Lost response and restart

| Question | Selectable choices for review |
| --- | --- |
| Commit then crash before response? | Exact replay returns result; separate recovery lookup; or operator recovery. |
| Response transmission fails after commit? | Treat as ambiguous and exact-retry safe; or require a separate handle. |
| Crash before commit? | No authority and exact retry may attempt commit while valid; or recover a visible operation state. |
| Restart recovery source? | Atomic replay/result record; deterministic reconstruction from immutable transaction evidence; or operation object. |
| Replay retention? | Connection lifetime plus historical-support period; indefinite append-only; bounded duration; or external archive with explicit failure semantics. |
| Connection exists but replay record is missing/corrupt? | Fail closed and recover the single transaction; operator-assisted historical recovery; never create a replacement implicitly. |

### Expiry and revocation

| Question | Selectable choices for review |
| --- | --- |
| Expiry boundary? | Half-open validity with equality expired; inclusive expiry; or another exact boundary. |
| Expiry evaluation time? | Transaction serialization point; request receipt; or both with serialization controlling. |
| Recheck inside transaction? | Required; or rely on a separately proven immutable validity claim. |
| Redemption versus expiry? | Whichever is valid at serialization; expiry always wins; or an explicit reservation model. |
| Redemption versus revocation? | First serialized terminal outcome wins; revocation always wins even after commit; or compensating Connection action. |
| Post-commit grant expiry/revocation? | No retroactive Connection effect; automatic Connection effect; or H-07/H-11-qualified rule. |
| Terminal history? | Minimal tombstone plus result/conflict evidence; full safe record; or bounded archive. |

### Resolution and disclosure

| Question | Selectable choices for review |
| --- | --- |
| Resolution after redemption? | Safe tombstone only; safe status plus Connection ID; or no resolution. |
| May resolution expose Connection ID? | No without replay eligibility; yes; or only a non-authoritative opaque correlation. |
| Recovery channel? | Exact authenticated redemption replay only; a separate approved recovery endpoint/handle; or operator action. |
| Stolen consumed grant defense? | Same principal, exact intent, current H-05 proof, and target/tenant checks; or another named mechanism. |
| Historical tombstone? | Grant identity, terminal state/reason, safe times, and non-sensitive result identity; or a narrower explicit set. |

### Failure and observability

| Question | Selectable choices for review |
| --- | --- |
| Which failures prove no Connection? | Every known pre-commit validation/transaction failure; or a specified subset if an operation state exists. |
| Which outcomes are transport-ambiguous? | Timeout/reset/crash without authoritative result; each must be safe to retry exactly or recover by a selected mechanism. |
| What is conflict? | Any reused grant/attempt with a different authority-critical field or replay principal; or another exact definition. |
| Audit ordering? | Commit, then success audit/metric, with optional transactional audit intent; or audit in transaction without making it authority. |
| What remains for H-12? | Every route, method, status, public identifier, error precedence/detail, retry flag/header, bounded wait, timeout, and disclosure representation. |

## Alternatives

### Option A — Strict single-success consumption

The first committed redemption returns the Connection. Every later redemption,
including an exact authenticated retry, receives a consumed/already-redeemed
failure. Recovery requires an unrelated Connection lookup or operator action.

Advantages:

- smallest transaction/result model if only grant and Connection are stored;
- limits result disclosure through the consumed grant;
- aligns with the current production loser-rejection behavior.

Costs and risks:

- a lost success response leaves the Host unable to distinguish success from
  failure;
- unrelated lookup needs another authenticated authority and correlation rule;
- operators may be forced to reveal or replace authority manually;
- it diverges from the historical idempotent and development behavior;
- it encourages unsafe new installation attempts after ambiguous outcomes.

### Option B — Exact-intent convergent redemption

One atomic commit creates one authoritative Connection and durable replay/result
binding. Exact authenticated repeats and exact concurrent requests converge on
that same result. Conflicting requests fail without disclosure or mutation. No
retry creates a second Connection.

Advantages:

- directly resolves the lost-response ambiguity;
- aligns the authority point with H-01 and the historical one-Connection intent;
- gives every exact eligible participant one stable semantic outcome;
- supports restart from durable committed history;
- distinguishes replay recovery from conflict and from general Invocation
  idempotency.

Costs and risks:

- requires a precise, privacy-safe intent identity and authenticated disclosure;
- expands the atomic transaction and retention obligations;
- may require waiting or a temporary transport response during a concurrent
  in-flight transaction;
- creates privacy and deletion tensions for long-lived result records;
- requires migration away from current production loser rejection.

### Option C — Separate recovery handle

Redemption remains single-success. A separately authenticated, secret-free or
purpose-bound recovery handle resolves ambiguous outcomes.

Advantages:

- separates ordinary redemption from recovery;
- can support bounded disclosure and an explicit recovery lifecycle;
- may avoid replaying the grant presentation value.

Costs and risks:

- adds wire fields, storage state, and another lifecycle object;
- handle loss recreates the ambiguity;
- handle theft can become a second authority-token risk;
- the handle must still bind exact principal, intent, target, and result;
- historical prose did not define this object, and migration would be material.

### Option D — Asynchronous redemption operation

Redemption creates a durable operation record and callers poll until committed
success or terminal failure.

Advantages:

- makes uncertain server processing visible;
- naturally accommodates bounded waiting, recovery, and long-running
  transaction providers;
- can separate accepted request from completed authority commit.

Costs and risks:

- adds a new operation lifecycle, schema, expiry, authorization, and retention
  surface;
- operation identifiers become theft, confusion, and disclosure targets;
- increases Client, Agent, storage, and compatibility complexity;
- may improperly overlap Task semantics even though installation is not a Task;
- still needs an atomic final grant/Connection/result commit.

### Comparative summary

| Criterion | Option A | Option B | Option C | Option D |
| --- | --- | --- | --- | --- |
| Lost-response recovery | Poor without unrelated lookup | Direct exact replay | Direct if handle survives | Direct by polling |
| One-Connection invariant | Yes | Yes | Yes | Yes |
| Exact concurrent convergence | No | Yes | Not through redemption | Through operation result |
| Disclosure defense | Simple denial | Strong authentication required | Strong handle authentication required | Strong operation authentication required |
| Durable state complexity | Low/medium | Medium/high | High | Highest |
| Historical prose alignment | Partial | Strongest | Weak | Weak |
| Current development alignment | Weak | Strong | Weak | Weak |
| Current production alignment | Strong | Requires change | Partial | Requires change |
| Privacy/retention cost | Low | Medium/high | Medium/high | High |
| H-01 authority alignment | Possible but poor recovery | Direct | Possible | Possible |

Options A, C, and D were not selected. The review found that Option A does not
provide safe lost-response recovery; Option C introduces a second handle without
removing exact-authentication needs; and Option D adds a lifecycle object whose
cost is disproportionate to one atomic authority commit. These alternatives and
their analysis remain immutable selection history.

## Accepted decision

**ACCEPTED DECISION:** The human approver selected Option B — Exact-intent
convergent redemption with all qualifications recorded below.

The accepted decision is qualified as follows:

1. A valid redemption intent binds the exact Install Grant identity, selected
   protocol release, Agent and Passport identity, authenticated Host principal,
   organization and explicit workspace absence/value, immutable final preview
   and consent identity, negotiated profiles/facets, capabilities, extensions,
   experiments, omissions, limitations and authentication result, exact
   approved capability set, H-05 authentication binding, a stable Host-generated
   redemption-attempt identifier, and a future H-10-qualified intent digest.
2. The request body is never authoritative for principal identity. The Agent
   derives and verifies the authenticated Host principal under H-05.
3. Grant possession alone never permits replay-result disclosure.
4. The Agent validates before transaction entry and transactionally revalidates
   every authority-critical invariant that can change or race.
5. The successful transaction atomically and durably records:
   - terminal `redeemed` grant state;
   - the one authoritative Connection;
   - exact immutable redemption-intent identity or future H-10-qualified digest;
   - the authoritative secret-free Connection result or immutable result
     identity sufficient to reproduce it;
   - the authenticated replay principal and applicable purpose-bound target;
   - commit time;
   - safe historical state needed to reject conflicts; and
   - any durable audit-intent identity needed to prove commit-before-audit,
     while H-12 retains audit fields and delivery mechanics.
6. No protocol-visible partially authoritative `redeeming` state exists.
   Internal locks, leases, candidates, and transaction attempts grant no
   authority.
7. Connection authority begins only when the complete transaction is durably
   committed.
8. A success response may be emitted only after the committed result is durably
   observable through the authoritative storage boundary.
9. An exact authenticated repeat after committed success returns the same
   authoritative Connection result. A later H-12/H-13 representation may
   indicate replay but cannot change the result.
10. Exact concurrent redemptions converge:
    - one transaction performs creation commit;
    - every other exact eligible request observes that committed result;
    - an exact eligible loser does not receive a terminal
      `INSTALL_GRANT_ALREADY_REDEEMED` semantic outcome merely for losing the
      race; and
    - H-12 may define bounded waiting and temporary transport representation,
      but the eventual semantic result is the same committed success.
11. A repeated or concurrent request with a different principal, consent
    binding, scope, selected result, attempt identity, or other
    authority-critical field is conflicting redemption. It receives no
    Connection result, creates no Connection, and fails without mutation. H-12
    later defines its public representation and disclosure.
12. A lost response after commit is recovered by repeating the exact
    authenticated intent and receiving the same authoritative Connection.
13. A crash before commit leaves no Connection authority and permits the exact
    request to try again while the grant remains valid and unrevoked.
14. A crash after commit cannot restore grant availability or permit a second
    Connection. Restart loads the committed result.
15. Partial grant/Connection/replay-result commit is forbidden. Missing or
    inconsistent components fail closed and require recovery of the single
    authoritative transaction, never implicit new authority.
16. Grant validity is half-open: valid at or after its applicable not-before or
    issuance boundary and strictly before `expiresAt`; equality is expired.
    Later H-11/H-12 clock-skew policy cannot extend authority commit beyond
    expiry.
17. Expiry is reevaluated at the transaction serialization point. A
    pre-transaction check is insufficient.
18. Revocation is reevaluated at serialization using the later
    H-11-qualified current evidence mechanism.
19. Redemption, expiry, and revocation serialize against one grant state:
    successful redemption first yields one redeemed grant and one Connection;
    expiry or authoritative revocation first yields no Connection; stale
    prechecks cannot override the serialized result.
20. Grant expiry or revocation after successful authority commit does not
    retroactively erase or reinterpret the Connection. H-07/H-11 govern later
    Connection suspension or revocation.
21. Resolution after redemption exposes only a safe redeemed tombstone and
    non-authoritative status. Grant possession does not disclose the
    authoritative Connection result.
22. Authoritative-result recovery occurs only through exact replay with current
    authenticated eligibility, or another later separately approved recovery
    mechanism.
23. The replay/result record remains durable for at least the lifetime and
    historical-support period of the resulting Connection. Indefinite or
    append-only retention is a stronger alternative and was not selected.
24. Raw grant secrets, credentials, private keys, bearer material, and
    authentication-provider secrets never enter Connections, replay records,
    evidence bundles, errors, logs, metrics, or audit fields.
25. Success audit and metrics cannot precede authority commit or imply success
    without commit. Exact audit delivery remains H-12.
26. This accepted decision does not define exact wire fields, canonical bytes,
    digest algorithms, HTTP statuses, public errors, wait durations, retry
    headers, database primitives, locks, or storage products.

Before H-10 exists, "exact" in this accepted decision means field-by-field
semantic equality under the exact selected protocol release, including explicit
absence/value distinctions and unordered-set semantics only where H-04 defines
them. The later H-10 digest may represent that equality but may not redefine it.

## Accepted semantic Grant state model

This semantic model is part of the accepted Option B governance decision. It is
not an executable state-machine artifact; creating one requires separate
authorization.

### State interpretation

| State | Semantic condition | Authority consequence | Replay consequence | Restart consequence |
| --- | --- | --- | --- | --- |
| `available` | Issued, within validity, not authoritatively revoked, and no successful redemption commit | No Connection authority | An eligible request may attempt the one commit | Reload grant and reevaluate time/revocation; never assume continued availability from stale memory |
| `redeemed` | Full authority transaction committed and binds exactly one intent plus one Connection/result | Exactly that Connection is authoritative, subject to H-07 | Exact authenticated replay returns same result; conflict fails without disclosure | Load grant, Connection, intent, result, and replay binding as one committed history |
| `expired` | Serialization observed time at or after `expiresAt` before redemption won | No Connection authority from the grant | Redemption/replay cannot create authority; resolution may show safe tombstone | Reload terminal evidence; never return to available |
| `revoked` | Authoritative grant revocation serialized before redemption won | No Connection authority from the grant | Redemption/replay cannot create authority; resolution may show safe tombstone | Reload revocation evidence under H-11; never return to available |

Expiry is semantically derived from the half-open time boundary even if no write
occurs at the instant time advances. The accepted decision materializes a durable
`expired` tombstone when an authoritative serialized operation observes expiry,
so later history does not appear available. Revocation is a serialized durable
terminal transition. If expiry and revocation are both eligible at one
serialization, the first authoritative terminal reason retained by that grant
wins; H-11/H-12 later define evidence and public representation. Internal
`redeeming` work is non-authoritative and invisible. Terminal states do not
transition except through later explicit superseding governance. Resolution may
project safe terminal status but no authority.

### Accepted legal transitions

| From | Trigger at serialization | To | Durable effect |
| --- | --- | --- | --- |
| none | Valid issuance | `available` | Store safe grant identity, target, scope, ceilings, issue/expiry, and lookup identity; keep secret out of public artifacts |
| `available` | Complete valid authority transaction commits first | `redeemed` | Atomically bind one Connection, intent/result, replay principal, commit time, conflict history, and optional audit intent |
| `available` | Time is at/after `expiresAt` before redemption commit | `expired` | Retain first terminal reason/time and safe tombstone; create no Connection |
| `available` | Authoritative grant revocation serializes before redemption commit | `revoked` | Retain revocation evidence/reference and safe tombstone; create no Connection |
| `redeemed` | Exact eligible repeat | `redeemed` | No transition or authority mutation; return identical authoritative result |
| `expired` | Resolution or rejected presentation | `expired` | No transition; safe tombstone only |
| `revoked` | Resolution or rejected presentation | `revoked` | No transition; safe tombstone only |

### Accepted illegal transitions

| Attempted transition | Why illegal | Required semantic handling |
| --- | --- | --- |
| `redeemed` → `available` | Would permit duplicate authority after rollback/restart | Fail closed; restore committed history |
| `expired` → `available` | Would extend a grant beyond its validity | Fail closed; require a new grant |
| `revoked` → `available` | Would reverse authoritative revocation | Fail closed; later issuance/replacement only |
| `redeemed` → `expired` | Later grant time cannot reinterpret committed Connection | Retain redeemed; H-07 governs Connection |
| `redeemed` → `revoked` as a grant effect | Grant revocation cannot retroactively rewrite committed authority | Retain redeemed; use H-07/H-11 Connection action |
| `expired` or `revoked` → `redeemed` | Terminal failure won serialization | Create no Connection |
| `redeemed` → another `redeemed` result | Would bind two intents/Connections | Conflict and fail closed |
| any state → protocol-visible `redeeming` authority | A lock/attempt is not authority | Keep internal only; recover as precommit or committed |

### Accepted race resolution

| Race | First serialized condition | Outcome |
| --- | --- | --- |
| Exact request A vs exact request B | One commit completes | Both eventually receive same result; one creation only |
| Intent A vs conflicting intent B | One valid commit completes | Winner binds result; conflict receives no result and no mutation |
| Redemption vs expiry | Commit serialization strictly before `expiresAt` | Redeemed; later grant expiry has no retroactive effect |
| Redemption vs expiry | Serialization at/after `expiresAt` | Expired; no Connection |
| Redemption vs revocation | Redemption commit serializes first | Redeemed; later Connection action remains H-07/H-11 |
| Redemption vs revocation | Authoritative revocation serializes first | Revoked; no Connection |
| Expiry vs revocation while available | First authoritative terminal observation/effect | Retain first terminal reason; no Connection |
| Cross-instance exact requests | Deployment serialization mechanism orders them | Same convergent result; a process-local lock alone is insufficient |

## Accepted transaction sequence

1. Receive a redemption request without treating the grant presentation value,
   request body, request ID, or attempt ID as authority.
2. Authenticate the Host using the exact selected H-05 profile and derive the
   typed principal from verified evidence.
3. Perform bounded structural validation and load the trusted immutable grant,
   Offer, Passport, preview/consent, selected-release, H-04, and H-05 evidence.
4. Establish semantic intent equality field by field and verify the stable
   Host-generated attempt identifier is bound to that intent.
5. Perform pre-transaction validation of target, issuer, Agent/Passport, tenant,
   consent, capability intersection, authentication, policy, validity, and
   revocation. Failure here commits no authority.
6. Enter a deployment-neutral serialization boundary for this grant. An
   internal lock/lease/transaction may implement it but has no protocol-visible
   meaning.
7. Reload or transactionally verify all raceable authority-critical state,
   including current grant state, exact intent/attempt, expiry, authoritative
   revocation, tenant, consent/result identity, and conflicting Connection IDs.
8. If a complete committed exact result exists, verify current replay
   eligibility and return that result without mutation after durable
   observability.
9. If a committed result exists but the request conflicts or is ineligible,
   disclose no result and fail without mutation.
10. If expiry/revocation already won, materialize or retain the safe terminal
    state and create no Connection.
11. Otherwise atomically write the terminal redeemed grant, one active
    Connection, intent/result/replay binding, commit time, safe conflict history,
    and optional audit-intent identity.
12. Verify the entire committed result is durably observable. An adapter-returned
    candidate alone is insufficient.
13. Only after step 12 does Connection authority exist and may a success
    response be constructed.
14. Emit success audit/metrics after commit. Failure to deliver telemetry cannot
    roll back authority or cause a second Connection; an audit-intent mechanism
    may support later delivery without becoming authority.
15. Return the same authoritative secret-free result for creation and every
    eligible exact replay.

## Transaction and crash matrix

The table describes the accepted decision. "No new" means no second Connection
for the grant; an exact precommit retry may perform the single first commit if
the grant is still eligible.

| Boundary/event | Connection authority? | Grant state | Permissible semantic response | Exact retry safe? | New Connection may be created? | Required durable evidence | Deferred dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1. Before request authentication | No | Unchanged | Authentication/invalid-request failure; no result disclosure | Yes after valid authentication | Only the eventual single first commit | Existing grant only | H-05, H-12 |
| 2. Authenticated, before consent/result validation | No | Unchanged | Validation failure; no result disclosure | Yes with exact valid evidence | Only the eventual single first commit | No new evidence required | H-01, H-04, H-05, H-10, H-12 |
| 3. Validated, before transaction entry | No | Unchanged | Known uncommitted failure or no response | Yes | Only the eventual single first commit | Existing grant/evidence | H-10, H-11, H-12 |
| 4. Transaction entered, before serialization | No | Unchanged externally; internal attempt invisible | No success; may wait/fail as transport mechanics permit | Yes after outcome check | Only one first commit | No protocol-visible `redeeming` authority | H-12 |
| 5. Expiry occurs before serialization | No | `expired` when authoritatively observed | Expired-before-commit category | No authority retry; resolution tombstone only | No | Expiry boundary and terminal observation | H-10, H-12 |
| 6. Revocation occurs before serialization | No | `revoked` | Revoked-before-commit category | No authority retry; resolution tombstone only | No | H-11-qualified revocation evidence | H-11, H-12 |
| 7. Successful full transaction commit | Yes, exactly one | `redeemed` | Same authoritative success result | Yes, with replay eligibility | No new; committed one already exists | Grant, Connection, intent, result, principal, commit, conflict history | H-07, H-10, H-11, H-12 |
| 8. Commit succeeds; response construction fails | Yes | `redeemed` | Transport/internal ambiguity, never uncommitted-failure assertion | Yes; return same result | No | Complete committed bundle | H-12, H-13 |
| 9. Commit succeeds; network response is lost | Yes | `redeemed` | Ambiguous transport outcome | Yes; return same result | No | Complete committed bundle | H-12 |
| 10. Process crashes immediately after commit | Yes | `redeemed` | No response; restart/replay returns result | Yes | No | Crash-durable complete bundle | H-07, H-10, H-12 |
| 11. Process crashes before commit | No | Previous terminal/available state | No response; known only after recovery | Yes if still available | Yes, but only the single first commit | Absence of commit plus durable prior state | H-11, H-12 |
| 12. Audit/metric delivery fails after commit | Yes | `redeemed` | Success remains valid; observability failure handled separately | Yes; same result | No | Complete bundle and optional audit intent | H-12 |
| 13. Restart with complete committed state | Yes | `redeemed` | Exact replay returns same result | Yes | No | Complete immutable bundle | H-07, H-10, H-11 |
| 14. Restart with no committed state | No | `available`, `expired`, or `revoked` after current evaluation | Exact retry may attempt commit only if available | Yes if available | Only the single first commit | Trusted grant plus current validity/revocation | H-11, H-12 |
| 15. Restart with inconsistent partial durable state | Unknown until recovery; fail closed | Inconsistent, not safely `available` | Durable-result-unavailable/inconsistent-state category; no result disclosure | Retry may diagnose/recover, not create authority | No new authority until single transaction restored | All surviving components, recovery/audit evidence | H-07, H-10, H-11, H-12 |
| 16. Exact replay after success | Yes | `redeemed` | Same authoritative success result, replay represented later | Yes | No | Intent/result/principal binding | H-10, H-12, H-13 |
| 17. Conflicting replay after success | Yes, for original only | `redeemed` | Conflict; no Connection/result disclosure | Repeating conflict is not eligible | No | Safe conflict comparison/history | H-10, H-12 |
| 18. Two exact concurrent requests | No before commit; yes after one commit | `available` → `redeemed` | Both eventually same success result | Yes | Exactly one total | Serialized complete bundle | H-10, H-12 |
| 19. Two conflicting concurrent requests | No before commit; winner may create one | `available` → winner's terminal outcome | Winner success; conflict failure without disclosure | Only winner's exact intent is replay eligible | At most one total | Serialized winner intent/result plus safe conflict evidence | H-10, H-12 |
| 20. Adapter returns mutated/inconsistent state | Authority may already exist only if provider actually committed; treat as unknown and fail closed | Unknown/inconsistent | Internal verification/durable-state category, not a clean uncommitted assertion | Recovery retry may inspect exact intent; never create another | No until authoritative bundle recovered | Submitted intent, adapter result, durable reread, transaction identity | H-07, H-10, H-12 |

The adapter-mutation row is deliberately conservative. Verification failure
after a provider might have committed cannot be relabeled as an ordinary
precommit failure. Operator or storage recovery may be required, and no new
Connection can be attempted until the one transaction's outcome is established.

## Authoritative redemption-result inventory

### Directly retained semantic fields

The accepted committed Connection/result/replay bundle directly retains or
binds:

- exact protocol release;
- non-secret Install Grant identity;
- redemption-intent identity or future H-10-qualified digest;
- stable redemption-attempt identifier;
- final immutable consent identity or future H-10-qualified digest;
- Connection ID and resulting status;
- Agent ID;
- Passport ID, version, issuer, and safe evidence identity;
- authenticated typed Host principal;
- exact authentication profile and H-05 binding result;
- authentication audience and exact Agent/resource target;
- organization and explicit workspace absence/value;
- selected profiles/facets;
- enabled and disabled capabilities;
- extensions, experiments, omissions, limitations, and restrictions;
- relevant Offer/grant identity or future H-10-qualified digest;
- immutable H-04 evidence identity or future H-10-qualified digest;
- commit time;
- replay eligibility limits and purpose;
- safe historical conflict/failure evidence;
- later-governed revocation reference; and
- immutable result identity sufficient to reproduce the same semantic response.

Directly retained does not require one physical row or object. It requires that
the complete semantic transaction and its invariant can be recovered
atomically, independently of mutable defaults.

### Bulky immutable safe evidence which may be referenced

Large, secret-free, immutable Passport, manifest, negotiation, Trust,
authentication-verification, Offer, consent, or compatibility evidence may be
referenced only when its exact identity is immutable, historically resolvable,
release-bound, and unavailable evidence fails closed. A mutable URL,
latest/current pointer, provider default, package version, or deployment lookup
is insufficient.

### Transient-only values

- raw grant presentation during lookup and proof;
- current request-authentication proof/channel evidence after its safe semantic
  result is derived;
- internal transaction lock/lease tokens;
- candidate objects before verified commit;
- database sessions, driver objects, retry counters, sockets, and response
  buffers;
- unredacted provider responses used only inside the designated verification
  boundary.

### Prohibited durable protocol-artifact values

- raw Install Grant secret/presentation value;
- passwords, access tokens, refresh tokens, bearer material, private keys, or
  reusable PoP secrets;
- credential-broker or authentication-provider secrets;
- unbounded private policy rules or raw authorization payloads;
- sensitive response bodies or proofs not required as safe immutable evidence;
- body-supplied principal assertions treated as truth;
- storage-vendor handles presented as protocol authority.

## Semantic failure categories

These categories do not select public identifiers, HTTP statuses, precedence,
details, or retry headers. "May exist" means the caller cannot infer absence
from the category alone.

| Semantic category | Authority may exist? | Exact retry safe? | Result disclosure allowed? | Operator recovery? | H-12 may call retryable? | Can a new Connection ever be created? |
| --- | --- | --- | --- | --- | --- | --- |
| Invalid or unknown grant | No from a confirmed lookup failure | Only after correcting input; not as same invalid request | No | Usually no | Usually no | Only through a different valid grant |
| Expired before commit | No | No authority retry | No | No | No | Not from this grant |
| Revoked before commit | No | No authority retry | No | Only for evidence disputes | No | Not from this grant |
| Scope mismatch | No from rejected attempt | Yes only with the original exact valid scope and eligibility | No | Usually no | No/conditional | At most one, only if grant remains available |
| Agent/Passport/issuer mismatch | No from rejected attempt | Only after trusted exact evidence is restored | No | Possibly | Conditional | At most one, only if still available |
| Final consent or negotiated-result mismatch | No | No as the mismatched intent; new preview/consent required | No | No | No | At most one under a newly valid exact intent if grant remains available |
| Authentication failure | No new authority from attempt; earlier committed authority cannot be inferred | Yes after current valid proof, preserving exact principal/intent | No | Provider recovery may be needed | Conditional | At most one if no prior commit and grant remains available |
| Authorization/policy failure | No from attempt | Only after valid narrowing policy outcome without changing consent improperly | No | Possibly | Conditional | At most one if still available |
| Exact replay with committed success | Yes, exactly one | Yes | Yes, only to eligible replay principal | No | Success, not failure | No second Connection |
| Exact redemption currently racing | Not yet known to this request | Yes or bounded wait | Only after committed result and eligibility | Usually no | Yes as temporary representation | Exactly one total |
| Conflicting replay | Original authority may exist | No for conflict | No | Usually no | No | No second Connection |
| Transaction provider unavailable before known commit | No only if provider proves no commit; otherwise ambiguous | Yes when proven precommit; otherwise recover exact intent | No until commit known | Possibly | Yes | At most one after outcome established |
| Durable result unavailable after known commit | Yes | Safe for recovery, not new creation | No until exact result and eligibility are verified | Yes | Yes/conditional | No |
| Inconsistent partial durable state | Unknown; fail closed | Safe only for recovery/diagnosis | No | Yes | Conditional | No until restored |
| Response lost after commit | Yes | Yes; same exact intent | Yes after eligibility revalidation | No | Yes | No |
| Internal mutation/transaction-result verification failure | Unknown if commit might have occurred | Recovery retry only | No | Often | Conditional | No until outcome established |

An ambiguous transport outcome is not a confirmed transaction failure.
Likewise, "provider unavailable" must not imply no authority if the provider may
have committed before losing contact.

## Security and threat analysis

Every mitigation below describes the accepted Option B decision.

| Threat | Protected asset | Attacker capability and failure scenario | Accepted mitigation | Residual risk | Deferred dependency |
| --- | --- | --- | --- | --- | --- |
| Stolen grant after redemption | Connection result and Host authority | Attacker presents consumed secret to discover/recover Connection | Require same typed authenticated principal, exact intent/attempt, current H-05 proof, target and tenant; resolution shows tombstone only | Principal credential compromise can satisfy checks; timing leakage remains | H-05, H-10, H-12 |
| Two principals race one grant | One authorized Host principal and one Connection | Attacker races legitimate Host before commit | Principal is intent-bound; serialization commits at most one; loser conflict receives no result | First valid malicious principal may win if issuance allowed it; grant-distribution risk remains | H-02, H-05, H-10 |
| Same principal changes capability selection | Consent and least privilege | Caller reuses grant/attempt with broader/different capabilities | Bind exact approved set, H-04 result, and consent; classify difference as conflict | Bugs in set equality/canonicalization | H-04, H-10 |
| Altered organization/workspace | Tenant isolation | Replay changes tenant or swaps absent/value | Bind exact organization and explicit workspace absence/value; no body principal authority | Incorrect tenant mapping upstream | H-02, H-07, H-10, H-12 |
| Altered authentication profile/binding | Host identity and proof strength | Replay downgrades profile or swaps binding | Bind exact H-05 result; revalidate current evidence; no fallback | Provider compromise and availability | H-05, H-10, H-11 |
| Altered Agent/Passport/audience | Target and identity integrity | Replay redirects authority to another target | Bind exact Agent, Passport, issuer, resource target, and authentication audience | Target-alias/canonicalization defects | H-03, H-05, H-10 |
| Stale preview or consent | Human intent | Agent state changes after preview while old consent is reused | Revalidate immutable exact H-01/H-04/H-05 envelope inside transaction | Freshness and digest algorithms not yet defined | H-10, H-12 |
| Response loss duplicates Connection | Single-authority invariant | Host retries or starts new install because success was unseen | Durable convergent replay returns same result and forbids second creation | Host may abandon grant and initiate unrelated grant; policy must detect duplicates | H-07, H-10, H-12 |
| Transaction adapter mutation | Authority/result integrity | Malicious adapter returns altered Connection/grant or different existing result | Verify complete exact result and durable reread; mismatch fails closed and blocks new authority | Provider may atomically commit malicious state; recovery tooling needed | H-10, H-12, external review |
| Partial database write | Grant/Connection consistency | Crash persists only one component | Single atomic bundle; inconsistent state fails closed and recovers original transaction | Storage guarantees or backup anomalies can violate model | H-07, storage contract, external review |
| Audit emitted before commit | Audit integrity | Success event survives while authority transaction fails | Emit success only after durable commit; optional in-transaction audit intent is not success authority | Event delivery can still be delayed/duplicated | H-12 |
| Expired grant commits after stale precheck | Grant validity | Delay crosses expiry after prevalidation | Recheck strict half-open expiry at serialization | Clock integrity/skew and multi-node time | H-11, H-12 |
| Revoked grant commits after stale check | Revocation integrity | Revocation arrives between check and commit | Recheck H-11-qualified authoritative revocation at serialization | Distribution/freshness/partition semantics | H-11 |
| Current defaults reinterpret restart | Historical authority | New deployment loads committed ID but reconstructs current profiles/capabilities | Store direct critical semantics and immutable evidence identity; never renegotiate replay | Long-term evidence availability | H-03, H-04, H-10, H-14 |
| Replay record deletion | Recovery and single-authority invariant | Retention cleanup removes intent/result while Connection remains | Retain for Connection lifetime plus historical support; deletion makes fail-closed recovery, never availability | Privacy erasure duties and storage loss conflict | H-07, H-12, H-14 |
| Result lookup without current authentication | Result confidentiality and authority | Caller guesses reference or possesses grant digest | Require current H-05 evidence and exact committed principal/target/tenant; reference is not proof | Authentication-provider compromise | H-05, H-12 |
| Timing/error reveals Connection existence | Privacy | Attacker compares invalid, conflict, and replay latency/errors | H-12 chooses safe precedence, bounded timing, and minimally distinguishing public errors | Perfect indistinguishability may be impractical | H-12 |
| Exact-replay denial of service | Availability | Authorized or credential-compromised caller floods exact replay | Bounded wait, rate/resource controls keyed safely, cached immutable result after authentication | Controls can amplify state/cardinality or block legitimate recovery | H-12, H-13 |
| Unbounded retention harms privacy | Privacy and data minimization | Long-lived records expose principal/tenant/history | Retain only secret-free minimum for Connection life/support; separate stronger append-only option; access control and minimization | Legal deletion versus historical verification tension | H-12, H-14, privacy review |
| Cross-instance race | Single-authority invariant | Requests hit instances without shared process lock | Require deployment-wide serialization/atomic invariant, not a specific lock | Distributed store/partition behavior | Future storage contract, external review |
| Backup/restore rollback | Monotonic history | Restore pre-redemption backup and reuse grant | Durable anti-rollback/continuity evidence, reconciliation, fail closed on missing committed lineage | Disaster recovery can lose latest checkpoint | H-11, H-14 |
| Provider returns different existing Connection | Result integrity | Adapter substitutes an attacker-selected Connection | Exact candidate/result/intent and durable bundle comparison; immutable result identity | Compromised provider can forge all local data without independent evidence | H-10, external review |
| Body-supplied principal replay | Authenticated identity | Attacker writes legitimate subject into request body | Derive principal only from verified H-05 evidence; body value ignored as authority | Proxy/provider mapping bugs | H-02, H-05 |
| Grant retry confused with Invocation idempotency | Domain separation | Key/result/fingerprint crosses namespaces or effects | Purpose/domain-separated identifiers, records, fields, and future H-10 digests; distinct H-12 operations | Implementation reuse can still mix stores | H-10, H-12, future Invocation decision |

## Compatibility and migration analysis

No migration is approved here.

| Surface | Impact of accepted Option B |
| --- | --- |
| Historical `ghostbridge/0.1-draft` prose | Preserves its bytes and one-Connection/idempotent intent, but does not pretend the historical draft defined all new intent, authentication, retention, or disclosure fields. |
| Development-mode replay | Broadly aligns on same-Connection replay, but current development behavior lacks exact intent, stable attempt, principal eligibility, durable result identity, and production-grade atomicity. It cannot be graduated unchanged. |
| Production loser rejection | Materially incompatible: exact authenticated losers would eventually converge rather than receive terminal consumed semantics. Conflicting losers would still fail. |
| Production transaction adapter | Must eventually expand from grant-plus-Connection to the complete result/replay/conflict bundle and expose verifiable durable observability, without standardizing its database API. |
| Current concurrency tests | Tests requiring one rejected exact loser would need replacement by separately authorized exact-convergent and conflict-rejection cases. Historical test commits remain evidence. |
| Client timeout behavior | A timeout remains transport-ambiguous, but a later Client can repeat the stable exact intent and recover the same result. Automatic retry still depends on H-12 bounds and acknowledgment. |
| Storage interfaces | Need deployment-neutral atomicity, serialization, replay retention, corruption detection, backup/restore continuity, and recovery contracts. Vendor APIs remain non-normative. |
| HTTP routes/errors | Need H-12 representations for exact replay, racing exact request, conflict, known commit/result unavailable, ambiguous delivery, and inconsistent state. |
| Connection result representation | Needs a complete semantic inventory and later H-13 schema, with immutable identity under H-10. |
| Audit and metrics | Must separate commit, audit intent, delivery, retry, and metric failure. Existing in-process calls are insufficient as portable law. |
| Platform adapters | Must not interpose Platform-only authority. They may implement the same exact replay result but cannot reinterpret it or substitute a Platform binding. |
| Existing unredeemed grants | May be eligible only if their release, evidence, consent, principal, target, and storage can satisfy the later accepted contract; otherwise restrict or replace. |
| Existing redeemed grants | Do not invent attempt IDs, principals, intent digests, or replay records. Preserve historical behavior and restrict recovery when evidence is insufficient. |
| Existing Connections without replay records | Keep historical meaning; do not silently reconstruct or claim exact replay. Use explicit replacement or operator-assisted recovery if approved later. |
| Independent implementations | Gain a semantic target but need schemas, canonical equality, portable state/transaction fixtures, and no dependency on JavaScript/database internals. |
| Cross-language interoperability | Requires exact absence/set semantics, H-10 bytes/digests, deterministic semantic result reproduction, and bidirectional fixtures. |

Possible migration strategies for later human review include:

- grandfather historical grants/Connections under their original release and
  behavior;
- restrict result recovery for redeemed historical grants which lack sufficient
  principal, intent, consent, or result evidence;
- issue explicit replacement grants/Connections after new preview and consent;
- permit operator-assisted recovery only with separately specified evidence,
  authorization, audit, and non-duplication checks;
- prohibit silent backfill of attempt IDs, digests, authentication evidence, or
  replay eligibility;
- prohibit silent reinterpretation of an existing Connection through current
  discovery, provider defaults, or new H-06 semantics.

Migration must retain historical bytes and meaning. It must not invent replay
evidence for already redeemed grants. Selection, sequencing, and execution of a
migration require separate human authorization.

## Conformance and future artifact obligations

Even after H-06 acceptance, separate authorization would be required for:

- traceable normative requirements;
- redemption request and authoritative result schemas;
- a deployment-neutral Grant state machine;
- an atomic authority-creation transaction contract;
- replay/result retention and privacy contract;
- exact direct/reference/transient/prohibited field inventory;
- H-10 canonical intent, result, and domain-separated digest definitions;
- H-11 revocation-race, freshness, and anti-rollback evidence;
- H-12 routes, status, public errors, precedence, retry acknowledgment, bounded
  wait, timeout, and disclosure representation;
- H-13 schema openness and extension decisions;
- positive first-redemption fixtures;
- sequential and concurrent exact-replay fixtures;
- concurrent conflicting-replay fixtures;
- lost-response-before/after-commit fixtures;
- crash/restart fixtures at every transaction boundary;
- strict expiry-boundary and clock fixtures;
- revocation-before/after-serialization race fixtures;
- malicious transaction-adapter mutation fixtures;
- partial-state, backup/restore, and recovery fixtures;
- redaction, result-disclosure, timing, and privacy fixtures;
- a second independent implementation;
- bidirectional cross-language interoperability evidence; and
- independent external security review.

Future cases must prove at least: zero authority before commit; exactly one
Connection after success; identical semantic result for every eligible exact
replay; no disclosure or mutation for conflict; no duplicate after lost
response/restart; expiry equality failure; serialized revocation outcome;
complete corruption fail-closed behavior; historical non-reinterpretation; and
secret absence from every artifact and report.

The official JavaScript implementation cannot be the conformance oracle.
Normative requirements, schemas, state machines, immutable fixtures, and
independently reproducible expected outcomes must control future conformance.

## Accepted H-06 bundle

The human approver accepted the following complete bundle without narrowing or
expansion:

1. **Architecture:** Option B — Exact-intent convergent redemption.
2. **Atomic transaction:** One indivisible deployment-neutral durable
   transaction records terminal redeemed grant state, exactly one authoritative
   Connection, exact redemption-intent and result identity, authenticated replay
   principal and purpose-bound target, commit time, safe conflict and recovery
   evidence, and optional durable audit-intent identity that is neither
   authority nor proof of delivery.
3. **Authority commit:** Authority begins only after the complete transaction is
   durably committed and durably observable.
4. **Non-authoritative events:** Validation, candidate creation, transaction
   entry, lock or lease acquisition, adapter return alone, audit or metric
   emission, response construction, and response delivery do not create
   authority.
5. **Redemption-intent binding:** Exact grant, selected release, Agent, Passport,
   issuer, purpose-bound target, authenticated Host principal, organization and
   explicit workspace absence/value, immutable consent identity, complete H-04
   result, capability set, H-05 profile/binding, stable attempt ID, and future
   H-10-qualified digest.
6. **Reference/proof rule:** A body principal, grant reference, grant digest,
   attempt ID, or grant possession is never proof by itself.
7. **Exact replay:** The same eligible authenticated exact intent returns the
   same authoritative Connection result without mutation.
8. **Concurrent exact redemption:** One creation commit and convergent
   same-result success for every exact eligible request; losing the race alone
   never produces a terminal consumed semantic result.
9. **Conflicting redemption:** A different authority-critical intent or
   principal receives no result, creates no Connection, and causes no authority
   mutation.
10. **Lost-response recovery:** Exact authenticated retry discovers or completes
    the single transaction and never creates a second Connection.
11. **Crash and restart:** A precommit crash creates no authority; a postcommit
    crash cannot restore availability or permit duplicate authority; restart
    loads committed history without renegotiation.
12. **Partial or inconsistent state:** Fail closed and recover the single
    transaction; never create implicit replacement authority.
13. **Expiry:** Half-open validity, equality expired, and
    transaction-serialization revalidation.
14. **Revocation race:** Redemption, expiry, and authoritative revocation
    serialize against the same grant state; the first serialized terminal
    result controls.
15. **Postcommit grant effects:** Later grant expiry or revocation does not
    retroactively reinterpret the Connection. H-07 and H-11 retain later
    Connection effects.
16. **Grant states:** `available`, `redeemed`, `expired`, and `revoked`.
17. **Internal activity:** `redeeming`, locks, leases, candidates, and
    transaction attempts remain non-authoritative and are not protocol-visible
    authority states.
18. **Result disclosure:** Resolution exposes only a safe non-authoritative
    tombstone. Authoritative recovery requires exact authenticated replay unless
    another mechanism is separately approved.
19. **Replay-result retention:** Retain the minimum secret-free record for at
    least the Connection lifetime and historical-support period.
    Indefinite/append-only retention was not selected.
20. **Audit ordering:** Commit precedes success audit and metrics. Delivery
    failure cannot roll back or duplicate authority.
21. **Secret exclusion:** Raw grant presentation values and reusable
    credentials/secrets are excluded from the listed protocol and observability
    artifacts.
22. **Historical treatment:** Preserve historical bytes and meaning; invent or
    backfill no attempt, principal, consent, intent, result, authentication, or
    replay evidence.
23. **Semantic/wire boundary:** H-06 selects semantics. H-12 retains routes,
    statuses, public errors, precedence, retries, waiting, timeouts,
    representation, disclosure details, and audit delivery.
24. **Equality boundary:** Field-by-field selected-release semantic equality
    controls until H-10 supplies its representation; H-10 cannot redefine the
    semantics.
25. **Domain separation:** Install Grant replay remains separate from general
    Invocation idempotency associated with `GB-017`.

All 26 qualifications in the accepted-decision section, all documented residual
risks, the documented compatibility impact, the documented security impact, and
the H-07 through H-14 deferred boundaries are part of this accepted bundle.

## Consequences of acceptance

1. H-06 and the decision register now record the human disposition, complete
   selected bundle, qualifications, risks, compatibility impact, security
   impact, approver, date, and approval reference.
2. H-06 acceptance authorizes only the selected protocol-governance decision.
3. It does not itself create normative requirements, schemas, executable state
   machines, fixtures, vectors, conformance cases, SDK behavior, Agent or Client
   behavior, Platform behavior, storage contracts, migration, deployment,
   publication, or release.
4. No `GB-*` gap is closed merely by acceptance.
5. Future applicable normative work must cite accepted H-01 through H-06.
6. H-07 must define the complete Connection lifecycle without changing the H-06
   authority-creation transaction or replay outcome.
7. H-10 must define exact bytes, canonical equality representation, digest
   domains, algorithms, encodings, and vectors without redefining H-06 semantic
   equality.
8. H-11 must define revocation, freshness, anti-rollback, and recovery evidence
   without retroactively changing a successfully committed H-06 Connection.
9. H-12 must define exact transport, public errors, statuses, retry classes,
   bounded waiting, timeouts, disclosure representation, and audit delivery.
10. H-13 must define schema openness and compatible evolution without allowing
    an old committed result to be reinterpreted.
11. H-14 retains retention-support policy, historical-evidence availability,
    independent-evidence requirements, external review, and release authority.
12. Existing historical objects cannot be rewritten or backfilled with invented
    redemption evidence.
13. Current production loser rejection and development replay behavior remain
    historical implementation evidence and are not automatically conformant.
14. Independent implementation, bidirectional interoperability, portable
    conformance evidence, and external security review remain required.
15. SDK, Agent, Client, Platform, provider, storage, migration, and deployment
    changes require separately authorized implementation work.

Following this acceptance and separate authorization, future artifacts may
implement and test the accepted semantics. Acceptance alone neither completes
nor authorizes those artifacts.

## Human approval block

Human approval is recorded as follows:

* **Approver:** rudra
* **Approval date:** 2026-07-31
* **Approved architecture option:** Option B — Exact-intent convergent
  redemption
* **Approved transaction boundary:** One indivisible, deployment-neutral,
  durable grant/Connection/intent/result/replay authority-creation transaction
* **Approved authority commit point:** Complete durable transaction commit and
  durable observability
* **Approved replay rule:** Exact currently authenticated replay returns the
  same authoritative Connection result without mutation
* **Approved concurrency rule:** Exact concurrent redemptions converge on one
  result; conflicting redemptions receive no result or mutation
* **Approved lost-response rule:** Exact authenticated retry recovers or
  completes the single authoritative transaction and never creates a second
  Connection
* **Approved expiry/revocation rule:** Half-open expiry and serialized
  redemption/expiry/authoritative-revocation race
* **Approved result-disclosure rule:** Safe resolution tombstone only;
  authoritative result requires exact authenticated replay
* **Approved retention rule:** Minimum secret-free replay/result record for at
  least the Connection lifetime and historical-support period
* **Approved audit rule:** Authority commit precedes success audit and metrics
* **Approved historical treatment:** Preserve historical bytes and meaning;
  no invented or silently backfilled redemption evidence
* **Approved qualifications:** All 26 qualifications recorded in the accepted
  H-06 decision and verbatim human approval
* **Accepted risks:** All residual risks recorded in the accepted H-06 decision
  and verbatim human approval
* **Compatibility impact:** Accepted as recorded in H-06 and the verbatim human
  approval
* **Security impact:** Accepted as recorded in H-06 and the verbatim human
  approval
* **Sign-off/reference:** Explicit human approval supplied by rudra in the
  Phase 15D.1E independent-review conversation on 2026-07-31
* **Resulting status:** `ACCEPTED`

### Verbatim human approval

I, rudra, approve H-06 on July 31, 2026.

Approved H-06 decision bundle:

1. **Architecture:** Option B — Exact-intent convergent redemption.

2. **Atomic transaction boundary:** Successful Install Grant redemption is one indivisible, deployment-neutral, durable authority-creation transaction. It records:

   * the Install Grant’s terminal `redeemed` state;
   * exactly one authoritative Connection;
   * the exact redemption-intent and authoritative-result identity;
   * the authenticated replay principal and purpose-bound Agent/resource target;
   * the commit time;
   * sufficient safe historical conflict and recovery evidence; and
   * an optional durable audit-intent identity that is neither the authority commit nor proof of audit delivery.

3. **Authority commit point:** Connection authority begins only when the complete authority-creation transaction is durably committed and the complete committed result is durably observable through the authoritative storage boundary.

   Validation, candidate construction, transaction entry, lock or lease acquisition, adapter return alone, audit emission, metric emission, response construction, and response delivery do not create authority.

4. **Redemption-intent binding:** One exact redemption intent binds:

   * the exact Install Grant identity;
   * the exact selected protocol release;
   * the exact Agent, Passport, issuer, and purpose-bound target;
   * the authenticated Host principal derived from verified H-05 evidence;
   * the organization and explicit workspace absence or exact value;
   * the immutable final preview and consent identity;
   * the complete selected H-04 negotiation result;
   * the exact approved capability set;
   * the exact H-05 authentication profile and binding result;
   * a stable Host-generated redemption-attempt identifier; and
   * a future H-10-qualified redemption-intent digest.

5. **Principal and proof:** A request-body principal, Install Grant reference, grant digest, redemption-attempt identifier, or possession of the grant presentation value is never sufficient proof of replay eligibility or authority.

6. **Exact replay:** An eligible repeat using the same grant, attempt identifier, complete semantic intent, and currently verified authenticated replay principal returns the same authoritative Connection result without creating or modifying authority.

7. **Concurrent exact redemption:** Concurrent exact eligible requests converge on one result:

   * exactly one transaction creates the Connection;
   * every exact eligible request eventually receives the same authoritative result;
   * no exact eligible request receives a terminal consumed or `already redeemed` semantic outcome merely because it lost the race; and
   * no request can create a second Connection.

8. **Conflicting redemption:** Any difference in an authority-critical field, attempt identifier, authenticated principal, consent, scope, target, selected result, authentication binding, or replay eligibility is a conflicting redemption.

   A conflicting request:

   * receives no Connection result;
   * creates no Connection;
   * causes no authority mutation; and
   * cannot become an exact replay through fallback or reinterpretation.

9. **Lost-response recovery:** A timeout, reset, response-construction failure, process crash, or lost network response does not prove that redemption failed.

   The Host recovers an ambiguous result by repeating the exact authenticated redemption intent:

   * when the transaction committed, the same authoritative Connection result is returned;
   * when no transaction committed and the grant remains eligible, the one authority-creation transaction may still commit; and
   * a retry never creates a second Connection.

10. **Crash and restart:**

    * a crash before commit creates no Connection authority;
    * a crash after commit cannot restore the grant to `available`;
    * a crash after commit cannot permit another Connection;
    * restart loads the complete committed grant, Connection, intent, result, replay, and historical evidence bundle; and
    * restart never renegotiates or reconstructs authority using current discovery, provider defaults, package defaults, or deployment behavior.

11. **Partial or inconsistent state:** Partial grant, Connection, intent, result, or replay-record commitment is forbidden.

    Missing, corrupt, mutated, or inconsistent durable components fail closed. Recovery must establish or restore the one authoritative transaction outcome. It must never create replacement authority implicitly.

12. **Expiry:**

    * grant validity is half-open;
    * a grant is valid strictly before `expiresAt`;
    * equality with `expiresAt` is expired;
    * expiry is reevaluated at the transaction serialization point; and
    * a stale pre-transaction validity check cannot authorize a commit after expiry.

13. **Revocation race:** Redemption, expiry, and authoritative grant revocation serialize against the same grant state.

    * successful redemption commit first produces one redeemed grant and one Connection;
    * expiry or authoritative revocation first produces no Connection;
    * stale validation cannot override the serialized result; and
    * grant expiry or revocation after successful commit does not retroactively erase or reinterpret the Connection.

    H-07 and H-11 retain later Connection suspension, revocation, continuity, freshness, and anti-rollback mechanics.

14. **Grant state model:** The reviewed semantic states are:

    * `available`;
    * `redeemed`;
    * `expired`; and
    * `revoked`.

    Internal `redeeming` attempts, locks, leases, candidates, and transactions are non-authoritative and are not protocol-visible authority states.

    Terminal grant history does not return to `available`.

15. **Result disclosure:** Resolution after redemption exposes only a safe, minimal, non-authoritative redeemed tombstone.

    Resolution or grant possession alone does not expose the Connection ID or authoritative result. Authoritative-result recovery requires exact replay and current H-05 authenticated replay eligibility, unless a different recovery mechanism is separately approved later.

16. **Replay-result retention:** The minimum secret-free result and replay record remains durable for at least the lifetime and historical-support period of the resulting Connection.

    Indefinite or append-only retention is not approved by H-06 and remains a stronger alternative for later privacy, support, and historical-governance review.

17. **Audit and metrics:** Authority commits before success audit or metric emission.

    Audit or metric delivery failure cannot roll authority back, cannot permit duplicate authority, and cannot cause an uncommitted attempt to appear committed. Exact audit fields, delivery guarantees, retries, and public observability remain with H-12.

18. **Secret exclusion:** Raw Install Grant presentation values, credentials, access tokens, refresh tokens, bearer material, private keys, reusable proof-of-possession secrets, and authentication-provider secrets are excluded from Connections, replay records, consent records, evidence bundles, errors, logs, traces, metrics, and audit fields.

19. **Historical treatment:** Existing `ghostbridge/0.1-draft` artifacts retain their original bytes and historical meaning.

    No attempt identifier, authenticated replay principal, consent digest, intent digest, result digest, authentication evidence, or replay evidence may be invented or silently backfilled for historical grants or Connections.

    Historical objects lacking sufficient evidence may later be grandfathered, restricted, explicitly replaced, or handled through separately approved operator-assisted recovery. They must not be silently reinterpreted.

20. **Semantic versus wire decisions:** H-06 approves semantic transaction and recovery outcomes only.

    H-12 retains exact HTTP routes, methods, status codes, public error identifiers, error precedence, retry flags and headers, bounded waiting, timeouts, response representation, disclosure details, and audit delivery mechanics.

21. **Canonical equality:** Before H-10 exists, exact intent equality means field-by-field semantic equality under the exact selected protocol release, including explicit absence-versus-value distinctions and unordered-set treatment only where H-04 defines it.

    H-10 may provide canonical bytes and domain-separated digests representing this equality but may not redefine the approved semantic equality.

22. **No Invocation-idempotency conflation:** Install Grant redemption replay is purpose-bound to authority creation. General Invocation idempotency associated with `GB-017` and future normative work is a separate operation, namespace, result, authority boundary, and risk.

I approve all 26 qualifications stated in the reviewed H-06 recommendation, including:

* complete H-01 through H-05 intent and evidence binding;
* current verified H-05 authentication for result disclosure;
* no protocol-visible partially authoritative `redeeming` state;
* transaction-time revalidation of every raceable authority-critical invariant;
* success only after durable observability;
* convergent exact replay and conflict-safe non-disclosure;
* no duplicate Connection after retry, response loss, crash, restart, or adapter ambiguity;
* strict half-open expiry;
* serialized expiry and authoritative revocation;
* no retroactive grant effect on a committed Connection;
* minimal secret-free replay retention;
* commit-before-audit ordering;
* secret exclusion;
* immutable historical treatment;
* field-by-field equality until H-10; and
* explicit deferral of wire, cryptographic, storage-product, and implementation mechanics.

I knowingly accept the residual risks documented in the reviewed H-06 packet, including:

* authentication or provider compromise;
* cross-instance serialization and distributed-storage defects;
* clock integrity, skew, revocation freshness, and network-partition risks;
* replay-result or immutable-evidence loss;
* backup and restore rollback;
* partial-state and disaster-recovery ambiguity;
* privacy, deletion, and long-term retention tension;
* timing and public-error information leakage;
* denial of service through concurrent or repeated exact replay;
* malicious or defective transaction adapters;
* operator-recovery complexity;
* migration ambiguity for historical grants and Connections;
* cross-language semantic-equality and canonicalization differences;
* dependency on future H-07, H-10, H-11, H-12, H-13, and H-14 decisions;
* unproven independent implementation and interoperability; and
* the requirement for external security review before any stable-release claim.

I accept the documented compatibility impact, including:

* intentional incompatibility with current production behavior that returns a terminal `INSTALL_GRANT_ALREADY_REDEEMED` outcome to an exact concurrent loser;
* replacement of those expectations with exact-convergent and conflict-rejection semantics through separately authorized work;
* expansion of transaction and storage contracts beyond grant-plus-Connection storage;
* changes to future Client retry and timeout recovery behavior;
* changes to future Agent, SDK, Platform-adapter, HTTP, error, audit, and metric representations;
* only partial alignment with current development-mode replay;
* preservation of current historical test commits as evidence rather than protocol law;
* restricted recovery for historical redeemed grants lacking sufficient evidence;
* no silent reconstruction or backfill of historical replay records; and
* requirement for portable schemas, state machines, fixtures, independent implementations, and cross-language interoperability evidence.

I accept the documented security impact, including:

* exactly one Connection authority per Install Grant;
* no authority before complete durable commit;
* recovery from lost responses without duplicate authority;
* authenticated, exact-intent result disclosure;
* conflict-safe non-disclosure;
* binding to the exact principal, target, tenant, consent, negotiated result, authentication profile, and capability set;
* serialization of redemption, expiry, and revocation races;
* fail-closed handling of partial, corrupt, or ambiguous durable state;
* no reference-as-proof;
* no body-supplied principal authority;
* no fallback or reinterpretation from current defaults;
* strict domain separation from Invocation idempotency;
* commit-before-audit ordering;
* secret exclusion; and
* continued dependence on canonicalization, anti-rollback, transport/error rules, privacy controls, independent implementation, interoperability, and external security review.

This approval records H-06 as an accepted protocol-governance decision only after the approval information is written into the H-06 decision record and decision register.

It does not itself authorize normative specification text, schemas, state machines, fixtures, vectors, conformance cases, SDK or runtime implementation, Agent or Client changes, Platform changes, storage migration, deployment, publication, release, or Protocol 1.0.

No `GB-*` gap is closed by this approval alone.

H-07 through H-14 remain deferred.

## Final status

* H-01 is `ACCEPTED`.
* H-02 is `ACCEPTED`.
* H-03 is `ACCEPTED`.
* H-04 is `ACCEPTED`.
* H-05 is `ACCEPTED`.
* H-06 is `ACCEPTED`.
* H-07 through H-14 remain deferred.
* H-06 acceptance records only the approved protocol-governance decision.
* No normative, schema, executable state-machine, fixture, vector, conformance,
  SDK, runtime, Agent, Client, Platform, storage, test, migration, deployment,
  publication, release, gap-closure, or Protocol 1.0 work is authorized merely
  by this acceptance.

**H-06 is ACCEPTED.**
