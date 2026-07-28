# H-01 — Lifecycle initialization and ordering

## Decision ID

`H-01`

## Title

Lifecycle initialization and ordering

## Status

**ACCEPTED**

Option C and the qualifications recorded in the approval block were approved by
the identified human approver on 2026-07-28. The alternatives and analysis
remain immutable decision history.

## Date prepared

2026-07-27

## Deferred decisions

H-03 through H-13 remain deferred. Acceptance of H-01 and H-02 does not
implicitly decide version negotiation details, capability precedence,
authentication profiles, Install Grant retry semantics, the complete Connection
state machine, Approval lifecycle, Task lifecycle, canonicalization, revocation,
transport/errors, or schema evolution.

## Scope

This record asks humans to select the Ghost Bridge initialization model and the
ordering rules around discovery, Trust verification, installation preview,
authentication, Install Grant redemption, Connection activation, governed
operation, restart, shutdown, closure, and revocation.

It also identifies the durable state, wire, state-machine, error, migration,
and conformance consequences of that selection.

## Out of scope

- The version ordering and downgrade algorithm governed by H-03.
- Capability/profile precedence governed by H-04.
- Authentication profile semantics governed by H-05.
- Lost-response and concurrent Install Grant redemption outcomes governed by
  H-06.
- The complete Connection state machine governed by H-07.
- Task cancellation, retention, and terminal race resolution governed by H-09.
- HTTP status, timeout, and transport details governed by H-12.
- Selecting a new normative specification version or writing that
  specification.
- Adopting MCP lifecycle, transport, authority, or Trust semantics. The only
  external lifecycle material in this repository is the supplied observation
  recorded in
  `docs/protocol/phase-15d0-reference-register.md`; this preparation did not
  directly inspect an external MCP repository.

## Affected GB gap IDs

`GB-001`, `GB-003`, `GB-004`, `GB-005`, `GB-014`, `GB-015`, and `GB-016`.

Closely coupled but governed by later human decisions: `GB-009` through
`GB-011`, `GB-017`, `GB-021`, `GB-033`, `GB-034`, `GB-038`, and `GB-044`.

## Affected Phase work items

Primary: `D1-01`, `D1-02`, `D1-03`, `D2-02`, and `D2-05`.

Downstream: `D1-05`, `D1-07`, `D2-01`, `D2-04`, `E-02`, `P1-02`, and `P1-03`.

## Existing Ghost Bridge evidence

All observations in this section describe implementation or draft repository
behavior. They are evidence, not normative authority.

### Draft documentation

- The repository-level lifecycle is a single sequence,
  `DISCOVER → VERIFY → PREVIEW COMPATIBILITY → AUTHENTICATE → INSTALL → INVOKE →
  OBSERVE TASK → VERIFY RECEIPT → REVOKE`, but it gives no entry conditions,
  illegal transitions, restart, shutdown, or resumption rules
  (`protocol/README.md`, “Lifecycle”).
- The draft overview says a Host Client resolves a grant, verifies the Passport,
  previews compatibility, negotiates authentication, and establishes a scoped
  Connection, but it does not define the first legal wire interaction
  (`protocol/specification/0.1-draft/overview.md`).
- Discovery is described as `GET /.well-known/ghostbridge`, returning public
  metadata; it is not described as an authority-bearing exchange
  (`protocol/specification/0.1-draft/discovery.md`).
- Profiles require a Host to negotiate version and authentication before grant
  redemption, but do not define a wire-visible negotiation result or its
  lifetime (`protocol/specification/0.1-draft/profiles.md`, “Compatibility”).
- Install Grant prose says redemption is atomic and idempotent and creates one
  Connection
  (`protocol/specification/0.1-draft/install-grant.md`).
- The Connection draft describes only a Connection Offer. It does not define
  final Connection activation, closure, resumption, or selected-negotiation
  persistence (`protocol/specification/0.1-draft/connection.md`).
- Revocation is checked before installation and Invocation, but the draft does
  not enumerate every legal request after revocation
  (`protocol/specification/0.1-draft/revocation.md`).

### Schemas

- Discovery advertises supported/preferred versions, feature flags, transports,
  limits, endpoint strings, profiles, and extension namespaces. It has no
  caller input, selected version, initialization identifier, expiry, or
  negotiation proof
  (`protocol/schemas/0.1-draft/discovery.schema.json:7-33`).
- Discovery endpoint names are not required individually; `endpoints` permits
  arbitrary string-valued properties
  (`protocol/schemas/0.1-draft/discovery.schema.json:27-30`).
- A Connection Offer has a single `protocolVersion` plus authentication and
  scope fields, but there is no public final Connection schema
  (`protocol/schemas/0.1-draft/connection-offer.schema.json`).
- The Invocation schema carries `protocolVersion` and tenant scope but no
  `connectionId`; the HTTP implementation instead sends `connectionId` in an
  outer body wrapper
  (`protocol/schemas/0.1-draft/invocation.schema.json:7-30`;
  `packages/ghostbridge-native-client/src/index.js:801-809`).
- Task and Receipt schemas carry a `connectionId` optionally, but neither
  schema defines a session or initialization reference
  (`protocol/schemas/0.1-draft/task.schema.json`;
  `protocol/schemas/0.1-draft/execution-receipt.schema.json`).

### Protocol core

- `negotiateVersion` considers preferred versions and otherwise sorts by
  numeric major/minor
  (`packages/ghostbridge-protocol-core/src/index.js:215-255`).
- `checkCompatibility` instead selects `commonVersions[0]`, based on Host input
  order
  (`packages/ghostbridge-protocol-core/src/index.js:476-575`, especially
  `:493-496` and `:562-565`).
- `CommonEnvelope` declares version, identity, correlation, scope, expiry, and
  proof fields, but no general wire schema or initialization binding exists
  (`packages/ghostbridge-protocol-core/src/types.ts:31-49`).

### Native Client

- `GhostBridgeClient.discover` fetches the public document, validates it, runs
  `negotiateVersion`, caches only the discovery document, and returns it. The
  selected result is not persisted by this method
  (`packages/ghostbridge-native-client/src/index.js:192-207`).
- `ensureDiscovery` lazily performs discovery before Client operations
  (`packages/ghostbridge-native-client/src/index.js:959-962`). For example,
  `getPassport`, Invocation, Task lookup, cancellation, and Receipt lookup all
  call it
  (`packages/ghostbridge-native-client/src/index.js:414-417,801-809,862-890`).
  This is SDK sequencing; the Agent does not enforce discovery-first ordering.
- `previewInstall` prepares a target, calls discovery, resolves the grant,
  verifies configured Trust material, calculates compatibility, and caches a
  local preview
  (`packages/ghostbridge-native-client/src/index.js:510-625`).
- `installFromGrant` performs authentication after preview and before
  redemption, then requires explicit approved capability keys
  (`packages/ghostbridge-native-client/src/index.js:635-692`).
- Redemption accepts a response only when its hard-coded
  `protocolVersion` equals the package constant and its status is `active`; it
  then stores the Connection in a process-local map
  (`packages/ghostbridge-native-client/src/index.js:695-739`).
- Every HTTP request sends the hard-coded package version in
  `ghostbridge-version`
  (`packages/ghostbridge-native-client/src/index.js:1000-1033`).
- `close` clears local discovery, Connections, previews, and authentication
  bindings. It sends no protocol closure request and does not revoke a remote
  Connection
  (`packages/ghostbridge-native-client/src/index.js:992-998`).

### Native Agent

- `getDiscovery` builds metadata and operation endpoints without creating an
  initialization or Connection record
  (`packages/ghostbridge-native-agent/src/index.js:304-354`).
- The HTTP dispatcher serves discovery, Passport, and the unfiltered capability
  list without authenticating or checking prior discovery
  (`packages/ghostbridge-native-agent/src/index.js:2727-2730,2779-2780`).
  Capability search/details, redemption, Invocation, Task, Receipt, Approval,
  and revocation routes have operation-specific authentication behavior
  (`packages/ghostbridge-native-agent/src/index.js:2731-2914`).
- Development redemption creates an `active` Connection and marks the grant
  redeemed in the same synchronous operation
  (`packages/ghostbridge-native-agent/src/index.js:1551-1660`).
  Production redemption constructs the `active` Connection and delegates the
  grant/Connection commit to one durable transaction
  (`packages/ghostbridge-native-agent/src/index.js:1663-1862`).
- The public Connection projection includes the package protocol version,
  scope, authentication state, enabled/disabled capabilities, status, and
  revocation reference. It contains no full negotiation transcript
  (`packages/ghostbridge-native-agent/src/index.js:2088-2104`).
- Invocation first requires a stored active Connection and checks revocation,
  exact Connection scope, authorization, Agent/Passport identity, enabled
  capability, capability version, and contract before execution
  (`packages/ghostbridge-native-agent/src/index.js:587-705`).
- Revocation changes a stored Connection to `revoked`
  (`packages/ghostbridge-native-agent/src/index.js:1118-1147`).
- `listen` and `close` start and stop the HTTP listener only. They do not define
  a peer-visible protocol shutdown or close durable Connections
  (`packages/ghostbridge-native-agent/src/index.js:1159-1187`).
- Production mode requires durable stores for grants, Connections, Tasks,
  Task contexts, Receipts, Approvals, idempotency, replay, revocation, and
  atomic terminal/redemption operations
  (`packages/ghostbridge-native-agent/src/index.js:60-125`).

### Tests

- The Native Client happy-path test explicitly calls discovery, Passport,
  resolution, installation, capability search, Invocation, and Receipt
  retrieval, but it does not prove the Agent rejects an out-of-order request
  (`packages/ghostbridge-native-client/test/client.test.js:13-150`).
- The Native Agent test proves an Invocation is rejected after the current
  implementation marks its Connection revoked
  (`packages/ghostbridge-native-agent/test/agent.test.js:114-148`).
- The production persistence test reopens durable stores and observes the same
  active Connection and terminal Task/Receipt after restart
  (`packages/ghostbridge-native-agent/test/security15c1a.test.js:1553-1628`).
- The Install Grant transaction tests prove exactly one concurrent winner and
  durable Connection survival, while the production API test expects the
  concurrent loser to receive `INSTALL_GRANT_ALREADY_REDEEMED`
  (`packages/ghostbridge-native-agent/test/security15c1a.test.js:1631-1728`).
  This conflicts with the draft's unqualified idempotent-redemption statement
  and is for H-06 to settle.

### Platform

- Platform discovery requires an authenticated Host principal, verifies
  Passport/Trust, reads capabilities, applies Platform authorization, and seals
  a target binding
  (`backend/src/services/platformNativeClient.service.js:472-526`). This is
  stricter deployment policy than the Native Agent's public discovery route.
- Platform installation repeats discovery, previews installation, applies
  exact Platform authorization, redeems the grant, verifies current Trust and
  Connection revocation, and seals a Connection binding
  (`backend/src/services/platformNativeClient.service.js:530-624`).
- Before subsequent operation, Platform rediscovers and re-verifies the bound
  Passport and current Trust
  (`backend/src/services/platformNativeClient.service.js:1249-1353`).
- Platform production sessions do not offer unauthenticated Agent access
  (`backend/src/services/platformNativeClient.service.js:1531-1541`;
  `backend/src/tests/platformNativeClientAuthority.test.js:111-143`).

## Current contradictions and ambiguities

1. The README presents one ordered lifecycle, but Agent routes do not enforce
   discovery as the first interaction.
2. Discovery looks like public, cacheable metadata in prose, schema, and Agent
   HTTP behavior; Platform treats discovery as an authenticated and authorized
   product operation.
3. The Client calls a version negotiator during discovery but stores no selected
   result; compatibility calculates a possibly different selected version.
4. Later Client requests send a package constant rather than a Connection-bound
   negotiated version.
5. The final Connection is implementation-only and does not record the full
   version/capability/profile negotiation evidence.
6. Draft prose says negotiation occurs before redemption, but no negotiation
   request/result exists on the wire.
7. Discovery, Passport, capability list, grant resolution, Trust verification,
   capability search, and capability details have no consistent public versus
   Connection-required classification.
8. Client close and Agent listener close are local resource actions, not
   protocol shutdown or Connection closure.
9. Durable stores demonstrate that Connections and Tasks can survive an Agent
   process restart, but no normative recovery, resumption, or peer-restart
   handshake exists.
10. Post-revocation Invocation is rejected, but the legality of Task lookup,
    cancellation, Approval continuation, Receipt retrieval, and historical
    verification after revocation is not consistently defined.
11. The production and development Install Grant retry outcomes differ. H-01
    must not silently choose the H-06 result while defining lifecycle ordering.
12. HTTP is request/response and mostly stateless, while grants, Connections,
    Tasks, approvals, replay state, Receipts, revocation, and anti-rollback
    checkpoints are durable protocol state. The boundary between the two is not
    specified.

## Security properties that must be preserved

Every viable option in this record is constrained by these properties:

- Discovery, initialization, metadata, or negotiation alone grants no governed
  authority.
- Governed authority becomes usable only through an active, scoped Connection
  created by valid Install Grant redemption.
- Agent authentication or Passport possession alone does not create Connection
  authority.
- Version, profile, authentication, capability, organization, and workspace
  decisions used for governed operation are bound to the Connection and cannot
  silently downgrade.
- Trust verification occurs before Connection activation when the selected
  profile requires Trust, and current Trust/revocation checks continue at the
  required operation boundaries.
- Authentication bindings and opaque Install Grants are not exposed through
  public discovery or preview.
- Illegal ordering fails before authority creation, Task creation, Approval
  consumption, or external side effects.
- Client or Agent restart cannot reset revocation, replay, idempotency, or
  anti-rollback protection for a production profile.
- A transport close does not silently reactivate, revoke, or transfer a
  Connection.
- Revocation takes precedence over later governed requests and cannot be undone
  by rediscovery or renegotiation.
- Direct Agent-to-Agent authority remains prohibited.

## Compatibility properties that must be preserved

- Discovery remains usable by independently implemented Clients and Agents and
  does not require the Ghost Bridge Platform.
- HTTP request independence remains possible; no option requires a long-lived
  transport connection to carry protocol authority.
- Existing Install Grants, Connections, Tasks, Receipts, and Trust evidence are
  interpreted under their original protocol version.
- A selected version and capability set is stable for the lifetime of the
  Connection unless a future, explicitly versioned transition replaces it.
- Client and Agent restart can recover durable objects without renegotiating
  them under newer semantics.
- Public metadata can evolve under H-03, H-04, and H-13 without retroactively
  changing active Connections.
- Implementations can distinguish public pre-Connection operations,
  authenticated pre-Connection operations, Connection-governed operations, and
  historical-evidence operations.

## Viable options

### Option A — Discovery is the initialization exchange

Under Option A, the first Agent interaction is discovery and the discovery
request/response is extended to carry or derive a concrete initialization
result. A viable design would need Client-supported versions/capabilities in
headers, query fields, or a non-GET discovery form, and a bounded result
identifier or proof. The result still grants no authority.

```text
DISCOVER + INITIALIZE
        |
        v
VERIFY -> PREVIEW -> AUTHENTICATE -> REDEEM GRANT + CREATE CONNECTION
                                             |
                                             v
                                      GOVERNED OPERATION
```

#### Benefits

- One mandatory first interaction and one fewer named lifecycle phase.
- The Agent can reject unsupported versions before other Agent resources are
  read.
- A selected initialization result can be bound into preview and redemption.
- Similarity to the Client's current lazy `ensureDiscovery` sequencing may
  reduce SDK migration.

#### Risks

- A cacheable, anonymous metadata resource becomes caller-specific or stateful.
- GET semantics are a poor fit for a two-sided capability negotiation.
- Anonymous initialization can consume server state and enable resource
  exhaustion or session fixation.
- Authenticated discovery would reveal less metadata publicly and conflict with
  the current Native Agent surface.
- Implementers may incorrectly treat a successful discovery response as
  authority.

#### Failure scenarios

- A shared cache returns another Client's selected version or initialization
  token.
- An attacker replays an initialization result during a different grant
  redemption.
- A Client uses discovery metadata after Agent capabilities changed, and the
  redemption path fails to revalidate it.
- An implementation treats a discovery success as permission to invoke without
  a Connection.
- A Client restart loses initialization state while the Agent retains it,
  causing ambiguous re-initialization.

### Option B — Public discovery followed by distinct initialization

Under Option B, discovery stays one-way public metadata. After discovery—and
after bootstrap Trust verification if the selected profile requires it—the
Client sends a distinct initialization/negotiation request. The Agent returns a
bounded, expiring negotiation result that is later bound to grant redemption.
The result may be stateless and signed or backed by short-lived server state;
it grants no Connection authority.

```text
DISCOVER -> VERIFY BOOTSTRAP -> INITIALIZE / NEGOTIATE
                                      |
                                      v
                      PREVIEW -> AUTHENTICATE -> REDEEM + CONNECT
                                                        |
                                                        v
                                                 GOVERNED OPERATION
```

#### Benefits

- Preserves public, cacheable discovery.
- Makes two-sided version/capability/profile negotiation explicit and
  wire-visible before installation.
- Gives preview and authentication a concrete negotiated context.
- Can reject downgrade or incompatible peers before a one-time grant is
  presented for redemption.

#### Risks

- Adds a new endpoint, schemas, errors, expiry rules, and a pre-Connection
  lifecycle object.
- Stateful initialization creates cleanup, restart, fixation, denial-of-service,
  and multi-instance consistency obligations.
- A stateless signed result adds key, canonicalization, replay, and expiry
  dependencies.
- The negotiation snapshot may still become stale before redemption, so the
  Agent must revalidate it.

#### Failure scenarios

- Initialization succeeds on one Agent replica but redemption reaches another
  replica that cannot recover the state.
- A negotiation token is replayed with a different grant, scope, Host, or
  authentication binding.
- Client and Agent disagree whether a refreshed discovery invalidates an
  outstanding initialization result.
- A restart discards pre-Connection state and an implementation incorrectly
  discards the durable grant too.
- A successful initialization is mistaken for an active session and used for a
  governed request.

### Option C — Negotiation is sealed only during redemption and Connection creation

Under Option C, there is no session-style initialization object. Discovery and
previews are public or authenticated metadata operations with no authoritative
negotiated state. The redemption request carries the Client's supported
versions, profiles, features, authentication selection, expected metadata
bindings, approved capabilities, scope, and relevant limits as an immutable
consent envelope shown during installation preview. The Agent selects and
validates the result inside that envelope and atomically records it in the new
Connection. It must not silently select a materially different result during
redemption. A material difference requires a new preview and new human consent
before Install Grant consumption. The consent envelope and final selection
require canonical digest profiles under H-10. Negotiation, Trust,
authentication, scope, consent, and capability validation failure must occur
before the H-06 grant-consumption commit point unless H-06 later explicitly
approves a different safe rule; H-06 also decides retry and concurrency
outcomes.

```text
DISCOVER -> VERIFY -> ADVISORY PREVIEW -> AUTHENTICATE
                                               |
                                               v
                        REDEEM + NEGOTIATE + CREATE ACTIVE CONNECTION
                                               |
                                               v
                                        GOVERNED OPERATION
```

#### Benefits

- Aligns negotiated state with the existing durable authority object rather
  than creating a second pre-authority session.
- Keeps discovery public, stateless, and cacheable.
- Makes the atomic Connection creation point the single authority activation
  point.
- Avoids server-side initialization cleanup and restart consistency.
- Reduces the interval between final negotiation validation and authority
  creation.

#### Risks

- Pre-install previews are advisory and can become stale.
- Incompatibility may be detected later, after the user completed preview or
  authentication.
- The redemption wire contract becomes larger and more security-sensitive.
- A poorly ordered transaction might consume the grant on negotiation failure;
  H-06 must prohibit or deliberately define that behavior.
- Existing implementations do not send or store the required negotiation
  transcript.

#### Failure scenarios

- A Client approves capabilities from a stale preview but omits a preview or
  metadata digest from redemption.
- The Agent selects a version different from the Client's displayed preview.
- The Agent silently changes a selected profile, capability, extension,
  authentication mode, Agent/Passport identity, organization/workspace scope,
  or relevant limit during redemption.
- A material difference is accepted using the old preview or consent instead of
  requiring a new preview and new human consent.
- The consent-envelope digest or final-selection digest is absent, is produced
  by an unapproved/non-canonical profile, or does not match the H-10-bound
  material.
- A grant is consumed before an incompatible version or authentication profile
  is detected.
- Trust, authentication, tenant-scope, consent-envelope, or capability
  validation fails only after the grant-consumption commit point.
- An implementation stores only a package version constant and later loses the
  actual selected feature set.
- A restarted Client attempts to reconstruct an active Connection from fresh
  discovery rather than its durable Connection record.

## Lifecycle analysis by option

| Question | Option A — discovery initializes | Option B — separate initialization | Option C — seal at redemption |
| --- | --- | --- | --- |
| First legal interaction | Discovery/initialization must be the first Agent interaction. All other Agent operations reject an absent initialization context, except an out-of-band grant-target resolver that is not an Agent operation. | Public discovery is the first Agent interaction. Initialization is required before preview/authentication/redemption. | Public discovery is the first Agent interaction for an addressable Agent. No session context is created. A trusted out-of-band resolver may identify the Agent target before that GET. |
| Anonymous versus authenticated discovery | Either anonymous with abuse controls or authenticated; the choice affects the initialization identity and cache model. A single interoperable rule is required. | Discovery can remain anonymous and authority-free. Deployments may authenticate access at a product boundary, but cannot change the protocol meaning of the metadata. | Discovery remains anonymous and authority-free by default. Platform may apply stricter access policy without making it protocol law. |
| Trust verification timing | Verify signed metadata immediately after the discovery/initialization response and before preview, authentication, or redemption. Initialization remains non-authoritative until verified. | Verify bootstrap Passport/issuer material after public discovery and before accepting or using the initialization result for a trusted profile. | Verify discovery-linked Passport, capability manifest, install resolution, Connection Offer, and revocation state before redemption/Connection commit when the selected profile requires them. |
| Installation preview timing | After verified initialization; bind the preview to the initialization result. | After verified initialization; bind the preview to the negotiation result. | Before redemption as advisory output; bind user consent to immutable metadata/offer/capability digests repeated and revalidated at redemption. |
| Authentication timing | After preview and before redemption; bind the result to initialization, grant, Host, and scope. | After preview and before redemption; bind it to the negotiation result, grant, Host, and scope. | After preview and before redemption; carry only a safe binding/reference into the final redemption transaction. |
| Version and capability negotiation | Completed by discovery/initialization, then revalidated and copied into Connection. | Completed by distinct initialization, then revalidated and copied into Connection. | Completed only in the redemption transaction and stored in Connection. Preview calculations are not authoritative negotiation. |
| Install Grant issuance and redemption | Grant issuance may occur before Client contact. Redemption requires verified initialization plus scope/auth/consent. | Grant issuance may occur before Client contact. Redemption requires a valid negotiation result plus scope/auth/consent. | Grant issuance may occur before Client contact. Redemption contains the negotiation proposal, scope/auth/consent, and metadata bindings. |
| Exact Connection authority activation | Only after atomic grant consumption and durable creation of an `active` Connection. Initialization never activates authority. | Only after atomic grant consumption and durable creation of an `active` Connection. Initialization never activates authority. | At the successful atomic commit that both consumes the grant according to H-06 and durably creates the fully bound `active` Connection. |
| Legal pre-Connection operations | Initialization discovery, Trust/Passport/capability metadata, grant resolution, preview, authentication, redemption, and safe status/error retrieval. Capability search/details need an explicit public/protected classification. | Discovery, initialization, Trust/Passport/capability metadata, grant resolution, preview, authentication, redemption, and safe status/error retrieval. | Discovery, Trust/Passport/capability metadata, grant resolution, preview, authentication, and redemption. There is no pre-Connection initialized session. |
| Legal post-Connection operations | All operations permitted by the active Connection's selected version/profile/capabilities/scope: governed Invocation, Task/Approval/Receipt operations, revocation, and authorized metadata refresh. | Same as Option A. | Same as Option A, but every governed request derives its legality only from the durable Connection, not an initialization object. |
| Agent restart | Durable Connections/Tasks survive. Ephemeral initialization must be rebuilt or represented by a replay-safe stateless proof. | Durable Connections/Tasks survive. Short-lived initialization state must be restored, safely invalidated, or reinitialized without changing grants. | Durable grants, Connections, Tasks, Receipts, and security checkpoints survive. No initialization state exists to recover. |
| Client restart | Recover active Connection references and their versioned bindings from Host durable state; do not infer them from discovery. Reinitialize only for new installation. | Recover active Connections; reinitialize expired pre-Connection attempts only. | Recover active Connections; rediscover only for endpoint/Trust refresh or new installation, never to reinterpret the Connection. |
| Durable Task continuation | Task identity, Connection/version/scope binding, terminal Receipt coupling, and polling authority survive either peer restart. Initialization state is irrelevant after Connection creation. | Same as Option A. | Same as Option A; this option has the fewest unrelated resumption dependencies. |
| Shutdown and closure | Transport shutdown ends no authority by itself. Explicit Connection closure/revocation semantics are required; abandoned initialization state expires. | Same, with explicit expiry/cleanup for initialization records. | Transport shutdown ends no authority by itself. There is no initialization cleanup; explicit Connection closure/revocation remains required. |
| Revocation | Revocation invalidates Connection authority regardless of a still-valid initialization result. Rediscovery/reinitialization cannot restore it. | Same as Option A. | Revocation invalidates the Connection. Fresh discovery or a new negotiation proposal cannot reactivate it; a new authorized installation is required. |
| Post-revocation requests | Reject new Invocation, Approval continuation, and other authority-expanding operations before side effects. Human decisions must classify cancellation, Task/Receipt retrieval, revocation status, and historical verification. | Same as Option A. | Same as Option A. No negotiation replay can bypass the revoked Connection. |
| Version binding | Initialization result plus selected version/features is copied into and thereafter constrained by the Connection. | Negotiation result plus selected version/features is copied into and thereafter constrained by the Connection. | Selection is created directly in the Connection and cited by every Task, Approval, Receipt, and governed request. |
| Downgrade prevention | Bind Client offer, Agent advertisement, selection, metadata digest, and grant/Host/scope to the initialization result and Connection. | Bind the same material to the negotiation result and Connection. | Bind the Client offer, Agent current support, selected result, metadata/offer digests, grant, Host, and scope in the redemption transaction and Connection. |
| Illegal ordering errors | Stable initialization-required, stale-initialization, mismatch, inactive-Connection, and revoked errors are needed. Names and precedence remain for H-12. | Stable initialization-required/expired/mismatch plus Connection/revocation errors are needed. | No initialization errors are needed. Stable incompatible-negotiation, stale-preview/binding, inactive-Connection, and revoked errors are needed. |
| HTTP statelessness versus durable protocol state | HTTP may remain stateless only if initialization is a bounded signed/self-contained artifact; otherwise Agent initialization state is short-lived protocol state. | Same choice, made explicit for the separate initialization object. | HTTP remains independent request/response. Durable state begins with pre-existing grants and becomes Connection/Task/Receipt/Approval/replay/revocation state; no session-style state is introduced. |

The post-revocation treatment of already-running Tasks is intentionally not
settled here. H-07 and H-09 must define whether revocation cancels, revokes,
allows compensation, or only prevents new work, and how a signed terminal
Receipt is produced.

## Migration and historical-object impact

### Option A

- Discovery schema and transport behavior become caller-sensitive.
- Existing caches and proxies may be unsafe unless a separate cache-neutral
  metadata form is retained.
- Existing Clients that issue a plain GET cannot provide a two-sided offer.
- Active legacy Connections need a recorded legacy initialization projection or
  must remain on their historical version until replacement.

### Option B

- Every Client and Agent needs a new endpoint and negotiation object.
- Multi-instance Agents need shared initialization state or a reviewed stateless
  proof.
- Pre-existing unredeemed grants need a rule for whether they may be paired with
  the new initialization object.
- Historical Connections remain interpreted under their original version; they
  must not be backfilled with invented negotiation evidence.

### Option C

- Redemption request/response and the final Connection require new canonical
  fields and schemas.
- Current Clients must send their supported set and expected bindings instead
  of relying on local compatibility calculations.
- Current Agents must persist the selected version/profile/capability/auth set,
  not a package constant.
- Existing active Connections either remain legacy-version Connections with
  restricted compatibility or require explicit replacement. Their negotiation
  history cannot be fabricated.
- Existing unredeemed grants can remain usable only if H-06 and the selected
  version define a safe redemption upgrade path.

For every option, durable Tasks and Receipts retain their original protocol
version and Connection reference. A new implementation or specification must
not reinterpret their historical meaning.

## Required schema consequences

### Option A

- Extend or replace discovery with Client offer, selected version/profile/
  features, initialization ID, expiry, Host/audience/scope bindings where
  applicable, and proof/replay fields.
- Define how cache-neutral metadata differs from caller-specific initialization.
- Add a final Connection schema that records the selected initialization
  result.

### Option B

- Add initialization request/result schemas with offers, selection, expiry,
  correlation, metadata digests, Host/audience/scope bindings, and proof.
- Add an initialization reference/binding to preview, redemption, and final
  Connection schemas.
- Add a final Connection schema independent of the Connection Offer.

### Option C

- Add Client-supported versions, profiles, features, extensions,
  authentication selection/binding, approved capabilities, and expected
  metadata/offer digests to the redemption request.
- Add the immutable preview/consent envelope, including selected protocol
  bounds, Agent/Passport identity, organization/workspace scope, and relevant
  limits, plus its H-10 canonical digest profile and digest.
- Add selected version/profile/features/extensions/authentication,
  capability set, Agent/Passport identity, organization/workspace scope,
  relevant limits, Host/audience, Trust evidence references, and commit metadata
  to the final Connection response/schema, with an H-10 canonical digest profile
  and digest for the final selection.
- Define material difference and require a new preview and human-consent
  artifact before redemption may continue when the proposed final selection is
  outside the earlier consent envelope.
- Require governed request/Task/Approval/Receipt schemas to carry or
  unambiguously inherit the Connection and negotiated-version binding.
- Keep discovery a metadata schema without an authority or session field.

All options require stable schema IDs, explicit openness rules under H-13, and
traceability to the accepted H-01, H-03, H-04, H-05, H-06, and H-07 decisions.

## Required state-machine consequences

Every option requires machine-readable legal pre-Connection and
post-Connection operation classes and a durable Connection machine. The
selected model changes the additional lifecycle state:

- **Option A:** `uninitialized → initialized-by-discovery → connection-active`,
  with expiry/replacement of the initialization result.
- **Option B:** `undiscovered → discovered → initialized → connection-active`,
  with initialization expiry, invalidation, and retry.
- **Option C:** no initialization state. Metadata/preview/authentication are
  bounded attempt artifacts; the authority transition is
  `grant-available → connection-active` at the atomic redemption commit.

For all options:

- Agent and Client process state is separate from durable protocol-object
  state.
- Transport start/stop is separate from Connection active/closed/revoked state.
- Restart must preserve or safely reconstruct every durable object and security
  checkpoint.
- Illegal transitions have no authority, approval-consumption, Task, Receipt,
  or side-effect mutation.
- Under Option C, negotiation, Trust, authentication, scope, consent-envelope,
  and capability validation all precede the H-06 grant-consumption commit point
  unless H-06 later explicitly approves a different safe transition.
- Connection revocation is terminal unless H-07 defines an explicit replacement
  object; rediscovery is never a reactivation transition.

## Required error-contract consequences

The accepted option must lead H-12 to define stable trigger conditions,
precedence, retry classification, safe details, state effects, and HTTP mapping
for at least:

- missing/illegal first interaction;
- incompatible or unsupported version/profile/capability;
- downgrade attempt;
- expired, stale, replayed, or mismatched initialization result for Options A
  and B;
- stale or mismatched preview/metadata/offer binding for Option C;
- authentication required/failed;
- Install Grant invalid/expired/revoked/already redeemed;
- inactive, closed, expired, suspended, or revoked Connection;
- operation unsupported by the selected Connection;
- post-revocation Task/Approval/Receipt operation;
- deadline/timeout during pre-Connection and Connection commit phases;
- shutdown/unavailable versus protocol closure.

Provisional error names in this record are descriptive only. They are not new
protocol codes.

## Required conformance cases

1. Each possible first Agent interaction, proving exactly which are legal.
2. Anonymous and deployment-authenticated discovery with identical
   authority-free protocol meaning.
3. Discovery/initialization metadata missing endpoints, stale, cross-origin,
   malformed, oversized, replayed, or changed before redemption.
4. Every permutation of supported/preferred versions, capabilities, profiles,
   authentication modes, and extensions, with a deterministic selected result.
5. Attempted silent downgrade and use of a non-selected version after
   Connection activation.
6. Preview mutation between user consent and redemption.
7. Option C final selection at every boundary of the immutable consent
   envelope for protocol version, profiles, capabilities, extensions,
   authentication mode, Agent/Passport identity, organization/workspace scope,
   and relevant limits.
8. One-field material differences between preview/consent and final selection,
   proving that the old consent is rejected, a new preview and human consent
   are required, and the Install Grant remains unconsumed.
9. Missing, unknown, non-canonical, mismatched, and substituted H-10 digest
   profiles or digests for both the consent envelope and final selection.
10. Authentication before/after the permitted lifecycle boundary.
11. Negotiation, Trust, authentication, scope, consent, and capability
    validation failures immediately before and after the H-06 commit boundary,
    proving that the default rule consumes no grant and creates no authority
    on validation failure.
12. Redemption failure before and after the H-06 commit point, including proof
   that negotiation failure does not accidentally create authority.
13. Governed operation before Connection activation.
14. Operation outside the Connection's selected capability, organization,
    workspace, Host/audience, profile, or version.
15. Client restart before preview, after preview, after authentication, after a
    lost redemption response, and with an active Connection.
16. Agent restart with available/redeemed grants, active/revoked Connections,
    nonterminal Tasks, terminal Task/Receipt pairs, consumed Approvals, replay
    state, and anti-rollback checkpoints.
17. Transport shutdown with an active Connection, proving no implicit revoke or
    reactivation.
18. Explicit Connection closure/revocation and every post-terminal operation.
19. Active Task during Connection revocation, with the H-07/H-09-selected
    terminal and Receipt behavior.
20. Old Connection and Task under a rolling upgrade, proving historical version
    preservation.
21. Multi-instance routing of pre-Connection and Connection requests.
22. Deliberately non-conformant Client and Agent implementations that treat
    discovery, initialization, authentication, Trust, Passport, or Approval as
    Connection authority.

Each future case must cite accepted requirement, schema, and state-machine IDs;
test names or current implementation output cannot be the expected-result
oracle.

## Accepted decision

**ACCEPTED DECISION:** **Option C**, with discovery as public, authority-free
metadata and with an explicit, wire-visible negotiation offer and result
committed only as part of Install Grant redemption and final Connection
creation.

The recommended first Agent interaction is public discovery. An out-of-band,
trusted Install Grant resolver may identify the Agent base target before that
interaction, but it is not itself Agent initialization and grants no authority.

The accepted decision includes:

- discovery and preview are non-authoritative;
- required Trust verification and authentication complete before the
  redemption commit;
- the final selected protocol version, profiles, capabilities, extensions,
  authentication mode, Agent/Passport identity, organization/workspace scope,
  and relevant limits must remain inside the immutable consent envelope shown
  during installation preview;
- the Agent revalidates preview/metadata/offer bindings and the immutable
  consent envelope, then selects only a result inside that envelope during
  redemption;
- the Agent must not silently select a materially different result; any material
  difference between preview/consent and final selection requires a new preview
  and new human consent before Install Grant consumption;
- the consent envelope and final selection each require a canonical digest
  profile under H-10;
- negotiation, Trust, authentication, scope, consent, and capability validation
  failure occurs before the H-06 grant-consumption commit point unless H-06
  later explicitly approves a different safe rule;
- the atomic successful commit is the exact moment an `active` scoped
  Connection becomes authoritative;
- every governed object and request binds to that Connection and its original
  selected version;
- existing Connections resume from durable records after restart and are never
  renegotiated from current discovery;
- HTTP remains stateless between requests while grants, Connections, Tasks,
  Approvals, Receipts, replay/revocation state, and anti-rollback checkpoints
  remain durable protocol state.

## Reasons supporting the accepted decision

1. Connection is already Ghost Bridge's central scoped authority object; placing
   final negotiation elsewhere creates two sources of lifecycle truth.
2. The current implementation already makes authority active at redemption,
   although it does not persist sufficient negotiation evidence.
3. Option C keeps public discovery cacheable and avoids turning metadata reads
   into server-side sessions.
4. It minimizes session-fixation, initialization-replay, cleanup, multi-instance,
   and restart state.
5. It narrows the time-of-check/time-of-use interval by requiring final
   compatibility validation at the authority commit.
6. It cleanly separates preview consent from authoritative Connection state:
   a stale preview cannot win over final validation.
7. It preserves independent HTTP requests without confusing transport
   continuity with protocol authority.
8. It does not create direct Client-to-Agent or Agent-to-Agent authority;
   authority continues to derive only from a valid scoped Connection.

The cost is a richer redemption contract and later incompatibility detection.
That cost is preferable to a second pre-authority session state, provided
preview bindings are immutable and incompatibility is checked before grant
consumption.

## Rejected or discouraged approaches

These approaches are discouraged regardless of which option humans accept:

- Treating the current Client's `ensureDiscovery` order as normative proof.
- Treating a successful discovery, initialization, authentication, Passport
  verification, Trust result, or Approval as governed authority.
- Selecting one version during preview and sending a hard-coded different
  version during governed operation.
- Reconstructing or upgrading an active Connection from fresh discovery after
  restart.
- Allowing listener shutdown or Client object disposal to silently close,
  revoke, or preserve authority without an explicit protocol rule.
- Allowing rediscovery or reinitialization to reverse revocation.
- Requiring a long-lived HTTP connection or in-memory session as the holder of
  Connection authority.
- Consuming a one-time grant before compatibility, scope, Trust,
  authentication, and capability consent are valid, unless H-06 explicitly
  approves and secures a different transaction rule.
- Importing MCP lifecycle semantics or adding an MCP runtime dependency.

## Review questions retained as decision history

These questions were recorded before acceptance. The approval block resolves
the option and approver questions and records the accepted qualifications;
remaining detailed design questions stay deferred to H-03 through H-13.

1. Is Option C approved, or should Option A or B be selected?
2. Must discovery be the first Agent request, or may a Client with a trusted
   target and grant call a grant-resolution resource first?
3. Which exact metadata operations are anonymous/public, and may deployments
   require authentication without changing their protocol classification?
4. Is the full capability list public, while search/details require an active
   Connection, or should one consistent rule replace the current split?
5. Which Trust artifacts must be verified before preview versus immediately
   before Connection commit?
6. Must a preview/consent digest be included in redemption, and which H-10
   canonical profile produces it?
7. May an authentication binding be resumed after Client restart, or must it be
   re-established?
8. Which selected fields are immutable for the entire Connection lifetime, and
   can any be changed only through Connection replacement?
9. Does explicit Connection closure differ from revocation, and which
   participant may initiate each?
10. After Connection revocation, may an authenticated Host retrieve an existing
    Task or Receipt, cancel/compensate active work, or submit an Approval
    Decision?
11. What happens to nonterminal durable Tasks when their Connection is revoked
    or closed?
12. What is the migration treatment for active `ghostbridge/0.1-draft`
    Connections that have no complete negotiation transcript?
13. Should negotiation incompatibility be guaranteed not to consume a grant,
    subject to H-06's atomicity decision?
14. Which protocol error has precedence when a request is both out of order and
    unauthenticated, out of scope, expired, or revoked?
15. Who is the accountable human approver for H-01?

## Approval block

Human approval is recorded as follows:

- **Approver:** Lakshya Sharma (`lakshyasharma21103-crypto`)
- **Approval date:** 2026-07-28
- **Approved option:** Option C — negotiation is sealed during Install Grant
  redemption and durable Connection creation.
- **Approved qualifications:**
  - immutable preview/consent envelope;
  - final selection must remain within the approved envelope;
  - material changes require a new preview and new human consent;
  - all negotiation, Trust, authentication, scope, consent, and capability
    validation must occur before the H-06 grant-consumption commit point, unless
    a later accepted H-06 decision explicitly defines another safe rule;
  - active Connection is the sole durable source of governed authority;
  - discovery, preview, authentication, Passport possession, and negotiation do
    not independently grant governed authority;
  - historical Connections, Tasks, Receipts, fixtures, and evidence retain their
    original protocol-version meaning.
- **Accepted risks:**
  - redemption messages and final Connection records become larger;
  - previews can become stale and therefore require digest binding and
    revalidation;
  - current Clients and Agents require migration from package-version
    assumptions to explicit negotiated state;
  - existing legacy Connections may require restricted historical treatment or
    explicit replacement;
  - detailed grant retry and concurrency behavior remains dependent on H-06.
- **Compatibility impact:**
  - new redemption and final Connection schemas will be required;
  - Clients must send supported versions, profiles, capabilities,
    authentication selection, consent bindings, and relevant limits;
  - Agents must persist the complete negotiated result;
  - existing historical objects must not be reinterpreted or backfilled with
    invented negotiation evidence.
- **Security impact:**
  - prevents silent changes between preview and installation;
  - prevents validation failures from consuming grants before the approved
    commit point;
  - keeps authority bound to the active scoped Connection;
  - preserves downgrade prevention, tenant scope, Trust verification,
    revocation, and anti-rollback properties.
- **Resulting status:** `ACCEPTED`
- **Approval reference:** Explicit human approval recorded in the Phase 15D.1A
  independent-review conversation on 2026-07-28.

## Consequences of acceptance

The governance update in item 1 is complete. Remaining work requires separately
authorized phases:

1. Update this record's status and completed approval block through the
   repository's human-governed review process. **Completed by this update.**
2. Use the accepted option as an input to H-03 through H-07, H-09, H-12, and
   H-13 without treating details deferred to those decisions as law.
3. Write lifecycle, discovery, version/capability, installation, Connection,
   transport, error, security, compatibility, and conformance requirements in
   the human-approved versioned specification directory.
4. Give each new normative requirement a stable ID and cite `H-01`.
5. Create canonical schemas and state machines only after the dependent human
   decisions are accepted.
6. Derive implementation-neutral fixtures and conformance cases from those
   requirements and assets.
7. Assess existing Clients, Agents, Platform adapters, grants, Connections,
   Tasks, Receipts, and durable stores against the accepted lifecycle; do not
   rewrite historical objects to imply evidence they never contained.
8. Implement and migrate runtime behavior in a separately authorized phase.

This accepted record does not by itself close any `GB-*` gap. Gap closure
requires separately approved normative requirements and their traced assets.
