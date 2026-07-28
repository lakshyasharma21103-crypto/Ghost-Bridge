# H-03 — Protocol version identity, ordering, compatibility, history, and anti-downgrade binding

## Decision ID

`H-03`

## Title

Protocol version identity, ordering, compatibility, history, and anti-downgrade
binding

## Status

**ACCEPTED**

Option C — Protocol epoch and revision was approved by Lakshya Sharma
(`lakshyasharma21103-crypto`) on 2026-07-28. All qualifications in the approval
block control. The alternatives and analysis remain immutable decision history.
This acceptance does not publish a normative release, modify runtime behavior,
or claim Protocol 1.0 conformance.

## Date prepared

2026-07-28

## Scope

This record was prepared to ask humans to decide:

- protocol release identity and its canonical wire syntax;
- exact equality, release ordering, and the boundary between ordering,
  preference, wire compatibility, and feature/profile compatibility;
- draft, prerelease, experimental, and final release status;
- specification, schema-bundle, and canonical artifact identity;
- the deterministic algorithm by which one protocol release is selected;
- the lifetime and durable binding of the selected release under accepted
  H-01;
- downgrade detection and prevention from preview through historical
  verification;
- the meaning of protocol versions recorded by durable and signed objects;
- immutable history, supersession, and explicit errata;
- the treatment of `protocol/specification/0.1-draft/` and
  `protocol/schemas/0.1-draft/`;
- the identifier proposed for the next versioned draft and the relationship
  between a release identity and its directory/artifact identities; and
- the normative, schema, state-machine, error, conformance, and migration work
  that follows only after acceptance and separate authorization.

## Out of scope

- Writing any normative specification requirement.
- Creating a new specification, schema, fixture, state-machine, or conformance
  directory.
- Modifying `protocol/specification/0.1-draft/` or
  `protocol/schemas/0.1-draft/`.
- Selecting capability, profile, authentication, or extension precedence
  governed by H-04, H-05, and H-13.
- Selecting the Install Grant retry/concurrency outcome governed by H-06.
- Completing the Connection, Approval, Task, or revocation state machines
  governed by H-07 through H-09 and H-11.
- Selecting canonical JSON, digest algorithms, signature algorithms, proof
  encodings, or cryptographic domain labels governed by H-10.
- Selecting HTTP placement, status codes, error precedence, limits, or
  observability details governed by H-12.
- Approving support-window ownership, publication authority, release signing,
  or Protocol 1.0 graduation governed by H-14.
- Treating package versions, SDK releases, Agent or Client builds, Platform
  deployments, current tests, or current runtime behavior as protocol law.
- Adopting MCP lifecycle, authority, Trust, version, or transport semantics;
  introducing an MCP dependency; or making Ghost Bridge an MCP wrapper. The
  only external material used here is the supplied observation already recorded
  in `docs/protocol/phase-15d0-reference-register.md`, “Reference A” and
  “Comparison boundary.” No external MCP repository was directly inspected for
  this record.

## Dependencies

### Accepted decisions

- **H-01 is ACCEPTED and controlling.** Discovery and preview are
  non-authoritative. A wire-visible negotiation offer and result are committed
  only as part of Install Grant redemption and final Connection creation. The
  selected protocol version, relevant metadata, identity, tenant scope,
  authentication, capabilities, extensions, and limits remain inside the
  immutable consent envelope. Material change requires a new preview and human
  consent. An active Connection resumes from its durable record and is not
  renegotiated from current discovery
  (`protocol/decisions/H-01-lifecycle-initialization-and-ordering.md`,
  “Accepted decision,” especially lines 714-753).
- **H-02 is ACCEPTED and controlling.** Connection authority bounds the selected
  protocol, Agent/Passport, organization/workspace, Host/audience,
  authentication profile, and enabled capabilities. Authentication,
  Connection authority, structured authorization, deployment policy, and
  exact-action Approval remain distinct. Effective authority is their
  intersection, never their union
  (`protocol/decisions/H-02-roles-trust-boundaries-and-authorization-floor.md`,
  “Accepted protocol distinctions,” especially lines 893-945, and “Accepted
  decision,” lines 947-1011).

### Deferred decisions

H-04 through H-13 remain deferred. H-14 remains outside this packet's assigned
range and is also not decided here. H-03 may establish version identity and
binding constraints that later decisions must respect, but it must not decide
their capability rules, object state machines, cryptographic algorithms,
transport mappings, schema openness, or governance owners.

### H-03 and H-14 support-state boundary

H-03 establishes only the protocol meaning required to produce a deterministic
negotiation result:

- a participant advertises exact releases it supports;
- deprecated or withdrawn status is eligibility information, separate from
  release identity and ordering;
- security eligibility is filtered before release ordering;
- a withdrawn release is not eligible for a new Connection; and
- deprecation, withdrawal, support change, or supersession never rewrites a
  historical release identity or the meaning of an existing object.

H-14 remains responsible for:

- the governance authority that publishes or signs release and support
  metadata;
- support durations and supported-version windows;
- deprecation notice periods;
- end-of-life schedules;
- withdrawal authority;
- emergency-release and rollback governance; and
- whether withdrawal requires revocation, replacement, or other treatment for
  an active Connection.

Nothing in H-03 silently decides those H-14 governance details. In particular,
the H-03 rule barring a withdrawn release from **new** Connection creation does
not itself revoke, replace, reinterpret, or otherwise change an active
Connection.

### Planning and evidence dependencies

- The Phase 15D plan requires a human-approved versioned draft directory,
  immutable `0.1-draft`, a non-normative current-version index, explicit errata,
  and original-version interpretation for historical objects
  (`docs/protocol/phase-15d-plan.md:39-77`).
- D1-02 requires one deterministic negotiation algorithm and a wire-visible
  result bound to the Connection and later operations
  (`docs/protocol/phase-15d-plan.md:83-87`).
- The future conformance architecture makes the versioned normative
  specification and versioned executable assets authoritative over
  implementation behavior
  (`docs/protocol/conformance-architecture.md:11-23`).
- Compatibility fixtures must cover overlapping versions, no overlap,
  required capability/profile absence, later-operation binding, and no silent
  downgrade (`docs/protocol/conformance-architecture.md:192-203`).

## Accepted decision

Lakshya Sharma (`lakshyasharma21103-crypto`) approved Option C — Protocol epoch
and revision — on 2026-07-28, with the following controlling rules and all
qualifications recorded in the completed approval block.

### Version identity

The canonical final syntax is:

```text
ghostbridge/e<epoch>.r<revision>
```

The canonical non-final syntax is:

```text
ghostbridge/e<epoch>.r<revision>-<stage>.<iteration>
```

Epoch, revision, and stage iteration each use the inclusive integer range `0`
through `2147483647`. Each component uses:

- canonical unsigned ASCII decimal;
- one through ten decimal digits;
- no leading zero unless the value is exactly `0`;
- no plus or minus sign;
- no decimal point;
- no exponent notation;
- no whitespace;
- rejection of overflow, wrapping, clamping, coercion, and rounding; and
- exact numeric comparison only after canonical validation.

The registered stage order is:

```text
experimental < draft < alpha < beta < rc < final
```

Ordering expresses chronology and preference only. It does not automatically
establish compatibility, support, conformance, or safety.

### Deterministic negotiation

- Each participant advertises exact supported release identities.
- Duplicates and non-canonical identifiers are invalid.
- Array order, object enumeration, locale ordering, package versions, SDK
  versions, Platform preferences, deployment versions, and implementation
  defaults are not negotiation inputs.
- `preferredVersion` is a redundant consistency field equal to the greatest
  locally status-eligible and locally security-eligible release in that
  participant's own advertised set.
- `preferredVersion` cannot force final selection or express a unilateral lower
  preference.
- Final selection is the greatest exact release in the bilateral intersection
  only after all compatibility, security, withdrawal, artifact, freshness,
  profile, feature, authentication, consent-envelope, and other accepted
  eligibility filters.
- The Client and Agent independently reproduce the same result.
- The Agent may commit only that result during Install Grant redemption.
- A no-common or no-compatible result fails without fallback to a package
  constant, adjacent revision, latest/current pointer, same-epoch inference, or
  draft default.

### Invalid, unknown, and unsupported releases

- An invalid or non-canonical identifier rejects the containing offer or
  advertisement.
- A participant claiming support must possess and identify the required trusted
  immutable manifests for that release.
- Missing required manifests make that participant's own metadata invalid.
- A canonical release unknown to the receiver but outside the exact
  intersection does not itself invalidate negotiation.
- Every intersecting candidate must resolve to trusted immutable manifests.
- An unresolved intersecting candidate is classified as unknown and removed.
- A known release not implemented or advertised by a participant is
  unsupported.
- No unknown or unsupported release may be interpreted using epoch proximity,
  package defaults, current deployment behavior, or latest/current pointers.

### Compatibility

- Compatibility declarations are explicit, directed, separately identified,
  and non-transitive by default.
- A shared epoch does not prove compatibility.
- Numeric ordering does not prove compatibility or safety.
- Implementations advertise every exact release they can genuinely emit,
  accept, and interpret.
- Compatibility and security eligibility are determined before ordering.

### Binding and anti-downgrade

The selected release and relevant evidence are bound through:

- the Client supported offer;
- the Agent supported advertisement;
- the deterministic selection result;
- release, specification, schema-bundle, compatibility, and relevant registry
  manifest identities and digests;
- the discovery or Connection Offer metadata digest;
- the Install Grant/redemption context;
- Agent and Passport identity;
- Host/audience and authenticated principal context;
- organization;
- workspace with explicit absence semantics;
- the authentication profile;
- the immutable H-01 consent envelope; and
- the final durable Connection.

Discovery and negotiation grant no authority. The active scoped Connection
remains the durable authority source. Later headers, bodies, SDK defaults,
package constants, deployments, or fresh discovery cannot substitute another
release. Active Connections are not reinterpreted or renegotiated after
restart. Mixed-version requests fail. Version mismatch or downgrade failure
occurs before Task creation, Approval consumption, and external side effects
and, subject to accepted H-01 and later H-06, before Install Grant consumption.

### Immutable artifacts and errata

- Each protocol release identity has exactly one immutable release manifest.
- Release-manifest, specification-manifest, schema-bundle-manifest, and original
  artifact identities and digests never change.
- Editorial errata use a separate append-only errata index/manifest.
- Each updated errata-index snapshot has its own identity and digest.
- An errata index cannot mutate the release identity, Connection-selected
  semantics, original artifact digests, or historical-object meaning.
- Any correction changing required emit, accept, reject, authorize, sign,
  verify, persist, transition, or historical-interpretation behavior requires a
  new protocol release identity and new immutable affected artifacts.

### Historical version treatment

- `ghostbridge/0.1-draft` is an immutable legacy historical label outside the
  new epoch/revision grammar.
- It is not an alias for `ghostbridge/e1.r0-draft.1`.
- It must not be relabeled, silently rewritten, or reinterpreted.
- Historical objects and fixtures may continue to cite it.
- Missing historical negotiation, artifact, or consent evidence must not be
  fabricated or backfilled.
- Historical objects retain their original version meaning.
- Detailed treatment of active legacy Connections, nonterminal Tasks, and
  pending Approvals remains a separate human-governed migration decision.

### Next draft

The approved next draft protocol release identity is:

```text
ghostbridge/e1.r0-draft.1
```

The approved specification/schema directory component is:

```text
e1.r0-draft.1
```

This is a draft identity, not a final release, and does not establish Protocol
1.0 conformance. Creating the directories and writing normative content
requires a separately authorized phase.

### H-03 and H-14 boundary

H-03 establishes only the protocol meaning needed for negotiation:

- exact advertised support;
- support and security eligibility before ordering;
- deprecated and withdrawn status as separate eligibility information;
- withdrawn releases as ineligible for new Connections; and
- historical identity and meaning as never rewritten.

H-14 remains responsible for:

- who publishes and signs release and support metadata;
- support durations and supported-version windows;
- deprecation notice periods;
- end-of-life schedules;
- withdrawal authority;
- emergency release and rollback governance;
- treatment of active Connections after withdrawal; and
- Protocol 1.0 graduation authority.

## Affected GB gap IDs

Primary: `GB-005`, `GB-043`, `GB-044`, `GB-045`, `GB-057`, `GB-058`, and
`GB-060`.

Closely coupled but not decided here: `GB-004`, `GB-006`, `GB-007`, `GB-009`
through `GB-013`, `GB-017` through `GB-019`, `GB-025` through `GB-033`,
`GB-038`, `GB-042`, `GB-046`, `GB-050` through `GB-053`, and `GB-056`.

The canonical audit describes GB-005 as contradictory because
`negotiateVersion`, `checkCompatibility`, and later Client behavior do not
produce or retain one result
(`docs/protocol/normative-specification-gap-analysis.md:45-52`). GB-043 through
GB-045 identify missing schema, backward, and forward compatibility rules
(`docs/protocol/normative-specification-gap-analysis.md:101-112`). GB-057,
GB-058, and GB-060 cover support, interoperability evidence, and 1.0 graduation
(`docs/protocol/normative-specification-gap-analysis.md:128-131`).

## Affected Phase work items

Primary: `D1-02`, `D2-01`, `D2-04`, `E-03`, `P1-02`, `P1-04`, and `P1-05`.

Downstream: `D1-03` through `D1-07`, `D2-02`, `D2-03`, `D2-05`, `E-01`,
`E-02`, `P1-01`, and `P1-03`.

The Phase plan maps H-03 directly to version negotiation, schema evolution,
stored-object compatibility, deprecation/support fixtures, interoperability,
and graduation evidence (`docs/protocol/phase-15d-plan.md:155-220`).

## Terminology and version concepts that must remain separate

The following concepts are not aliases. A future specification must give each
one a distinct field, registry entry, or explicitly documented derivation.

| Concept | Meaning | Must not be confused with |
| --- | --- | --- |
| Protocol release identity | Immutable identifier for one governed set of protocol semantics | Package, SDK, build, deployment, schema, or display version |
| Human-readable version label | Display text such as “Epoch 1 Revision 0 Draft 1” | Canonical equality or signed input |
| Exact version equality | Whether two canonical release identities are the same immutable identity | Ordering or compatibility |
| Version ordering | A deterministic precedence/preference relation, if the chosen model provides one | Safety, support, or compatibility |
| Wire compatibility | Whether two implementations can exchange a named release's messages with identical required meaning | A higher number or same package API |
| Feature/profile compatibility | Whether required capabilities, profiles, authentication, limits, and extensions are mutually satisfiable | Protocol-release equality; governed later by H-04, H-05, and H-13 |
| Draft/prerelease/experimental/final status | Governance and conformance status of one immutable release | A mutable flag that can silently turn a draft into final |
| Specification artifact identity | Stable identifier for a versioned specification bundle/manifest | Protocol release identity alone |
| Schema identity | Stable `$id` or registry identity of an individual schema and its bundle | Protocol release identity or schema file path alone |
| Canonical artifact digest | Algorithm-qualified digest of exact manifest/artifact bytes under a later H-10 profile | A version label or mutable URL |
| Connection-selected version | The one release sealed by successful redemption and used for the Connection lifetime | Fresh discovery preference or implementation default |
| Object-recorded historical version | The release under which an object was created/interpreted | The version currently deployed when the object is read |
| Implementation/package version | Release of a software package such as `@ghostbridge/protocol-core` | Protocol release identity |
| SDK version | Release of a public Client, Agent, Trust, or Issuer SDK/API | Protocol release identity |
| Platform deployment version | Version/build/configuration of a Ghost Bridge Platform deployment | Protocol compatibility or Connection-selected version |

Package, SDK, Native Agent build, Native Client build, Trust build, Issuer build,
and Platform deployment versions are **not automatically protocol-version
identities**. The repository already demonstrates why: the root package is
`0.1.0`, protocol packages are `0.1.0-draft`, and the protocol constant is
`ghostbridge/0.1-draft` (`package.json:3`;
`packages/ghostbridge-protocol-core/package.json:3`;
`packages/ghostbridge-native-client/package.json:3`;
`packages/ghostbridge-native-agent/package.json:3`;
`packages/ghostbridge-trust/package.json:3`;
`packages/ghostbridge-protocol-core/src/index.js:9-10`).

## Existing Ghost Bridge evidence

All observations in this section are implementation behavior, historical draft
prose, schema content, or tests. They are evidence for the human decision, not
normative protocol law.

### Historical draft prose and planning

- The historical versioning page names `ghostbridge/0.1-draft`, calls for a
  mutually supported selection or a safe unsupported-version error, warns on
  draft selection, prohibits silent downgrade for signed/high-impact messages,
  and requires a new negotiated version for breaking wire changes. It defines
  no canonical equality, complete ordering, supported window, durable binding,
  errata, or historical-object rule
  (`protocol/specification/0.1-draft/versioning.md:1-9`).
- The historical profiles page requires version and authentication negotiation
  before grant redemption but provides no version-offer or selection-result
  wire object (`protocol/specification/0.1-draft/profiles.md:30-36`).
- Historical discovery prose lists `supportedVersions` and
  `preferredVersion` but does not define their syntax, uniqueness, ordering, or
  relationship (`protocol/specification/0.1-draft/discovery.md:1-10`).
- The Phase plan explicitly preserves `protocol/specification/0.1-draft/`,
  leaves the next directory identifier for H-03, proposes a non-normative root
  index and version-specific errata, and prohibits in-place edits to published
  version directories (`docs/protocol/phase-15d-plan.md:39-75`).
- The supplied external-reference register records only the reusable lesson
  that compatibility and capability exchange must be explicit and respected.
  It expressly does not supply Ghost Bridge version, downgrade, authority, or
  Trust semantics (`docs/protocol/phase-15d0-reference-register.md:11-23,70-77`).

### Historical schemas

- `common.schema.json` makes `protocolVersion` a constant equal to
  `ghostbridge/0.1-draft`
  (`protocol/schemas/0.1-draft/common.schema.json:3-7`).
- Discovery requires supported and preferred version strings, but JSON Schema
  expresses neither a canonical version grammar nor the invariant that the
  preferred value is a unique member of the supported set
  (`protocol/schemas/0.1-draft/discovery.schema.json:3-12`).
- A Connection Offer requires one `protocolVersion`, and later optional fields
  include `supportedProtocolVersions`; the schema does not distinguish offer
  identity, compatibility declarations, selection, or artifact digest
  (`protocol/schemas/0.1-draft/connection-offer.schema.json:3-12,31-39`).
- Install Grant resolution requires `protocolVersion`, while there is no public
  schema for grant issuance, redemption request, redemption result, or final
  Connection
  (`protocol/schemas/0.1-draft/install-grant-resolution.schema.json:3-18`).
- Invocation requires `protocolVersion`, but lacks a required `connectionId`
  in the envelope (`protocol/schemas/0.1-draft/invocation.schema.json:3-30`).
- Task has optional `connectionId` and no `protocolVersion`
  (`protocol/schemas/0.1-draft/task.schema.json:3-19`).
- Approval Challenge and Approval Decision have neither `connectionId` nor
  `protocolVersion`
  (`protocol/schemas/0.1-draft/approval-challenge.schema.json:3-21`;
  `protocol/schemas/0.1-draft/approval-decision.schema.json:3-18`).
- Execution Receipt has optional `connectionId`, no `protocolVersion`, and an
  optional Trust-profile constant
  (`protocol/schemas/0.1-draft/execution-receipt.schema.json:3-12,34-42`).
- Passport and capability manifest carry a protocol version and their own
  object versions; Passport also advertises supported protocol versions
  (`protocol/schemas/0.1-draft/passport.schema.json:3-31`;
  `protocol/schemas/0.1-draft/capability-manifest.schema.json:3-25`).
- Revocation Set carries protocol and Trust-profile versions, while
  Revocation Status and Trust Result carry neither
  (`protocol/schemas/0.1-draft/revocation-set.schema.json:3-10`;
  `protocol/schemas/0.1-draft/revocation-status.schema.json:3-17`;
  `protocol/schemas/0.1-draft/trust-result.schema.json:3-13`).
- Schema `$id` values identify paths under `schemas/0.1-draft`, but no immutable
  schema-bundle manifest or canonical bundle digest exists; the gap audit
  records that absence as GB-043
  (`docs/protocol/normative-specification-gap-analysis.md:108-110`).

### Protocol core implementation

- `PROTOCOL_VERSION` is the single hard-coded value
  `ghostbridge/0.1-draft`
  (`packages/ghostbridge-protocol-core/src/index.js:9-10`).
- `parseProtocolVersion` accepts `ghostbridge/<major>.<minor>` with one optional
  lowercase hyphenated channel. It has no patch component, interprets a channel
  containing `draft` as draft, and otherwise labels the version stable
  (`packages/ghostbridge-protocol-core/src/index.js:191-203`).
- `validateProtocolVersion` first parses and then requires exact JavaScript
  string membership in a supplied list
  (`packages/ghostbridge-protocol-core/src/index.js:205-213`).
- `negotiateVersion` de-duplicates each list, computes exact overlap, honors an
  explicit requested version, otherwise chooses the first compatible value in
  `[localPreferred, remotePreferred]`, and finally sorts by numeric major/minor
  only (`packages/ghostbridge-protocol-core/src/index.js:215-255`).
- Versions with the same major/minor but different channel compare equal in
  that final sort, so the fallback retains incidental compatible-list order.
  Patch ordering, channel ordering, final-versus-draft ordering, and
  compatibility beyond exact membership are absent
  (`packages/ghostbridge-protocol-core/src/index.js:243-248`).
- Its `signedOrHighImpact` guard rejects any selected release other than the
  local preferred value, even if an explicitly requested or mutually preferred
  alternative has an approved security relationship
  (`packages/ghostbridge-protocol-core/src/index.js:249-255`).
- `checkCompatibility` performs a different operation: it computes overlap in
  Host input order without calling the parser and returns
  `commonVersions[0]`
  (`packages/ghostbridge-protocol-core/src/index.js:476-497,557-575`).
- `assertCompatibility` maps the missing-overlap reason to
  `NO_COMMON_PROTOCOL_VERSION`, while `negotiateVersion` reports
  `UNSUPPORTED_PROTOCOL_VERSION` for no mutual release
  (`packages/ghostbridge-protocol-core/src/index.js:236-241,578-590`).
- `GhostBridgeProtocolError` defaults its own `protocolVersion` to the current
  package constant, which can mislabel an error encountered while processing
  another Connection release
  (`packages/ghostbridge-protocol-core/src/index.js:151-183`).

### Native Client implementation

- The Client stores a supported-version list in `hostSupport`, defaulting to
  the package constant, but has no stored preferred protocol release or
  canonical release-manifest binding
  (`packages/ghostbridge-native-client/src/index.js:121-143`).
- `discover` and the public `negotiateVersion` method do not pass
  `hostSupport.supportedProtocolVersions` as `localSupported`; absent explicit
  method options, core negotiation therefore uses its package-constant default,
  while installation preview later uses the configured Host list
  (`packages/ghostbridge-native-client/src/index.js:192-204,400-407`;
  `packages/ghostbridge-protocol-core/src/index.js:215-222`;
  `packages/ghostbridge-native-client/src/index.js:593-602`).
- `discover` validates discovery, runs `negotiateVersion`, discards the returned
  selection, caches only the discovery document, and returns the document
  (`packages/ghostbridge-native-client/src/index.js:192-207`).
- The public `negotiateVersion` method recomputes a result from current cached
  discovery whenever called; it does not bind the result to preview,
  redemption, or a Connection
  (`packages/ghostbridge-native-client/src/index.js:400-412`).
- Installation preview separately calls `assertCompatibility`, therefore using
  `checkCompatibility` and its Host-array-order selection
  (`packages/ghostbridge-native-client/src/index.js:593-619`).
- Redemption sends scope/authentication/capability data but no explicit
  protocol-version offer, selection, compatibility proof, discovery digest, or
  consent digest. It accepts a result only when `response.protocolVersion`
  equals the package constant and stores that result in a process-local map
  (`packages/ghostbridge-native-client/src/index.js:695-739`).
- Client-built Invocations set `protocolVersion` to the package constant rather
  than the installed Connection's selected version
  (`packages/ghostbridge-native-client/src/index.js:742-809`, especially
  `:774-805`).
- Every HTTP request, including discovery and historical-object retrieval, sends
  `ghostbridge-version: PROTOCOL_VERSION`; request-specific or
  Connection-bound release identity is not used
  (`packages/ghostbridge-native-client/src/index.js:1000-1033`).
- Error responses may supply a `protocolVersion`, but successful responses are
  not generally checked against a Connection-selected version
  (`packages/ghostbridge-native-client/src/index.js:1035-1075`).
- `close` deletes process-local discovery, Connection, preview, and
  authentication state. It does not preserve selected-version evidence across a
  Client restart (`packages/ghostbridge-native-client/src/index.js:992-998`).

### Native Agent implementation

- Discovery advertises only the package constant as supported and preferred,
  with `experimental` status
  (`packages/ghostbridge-native-agent/src/index.js:304-354`).
- The internal Install Grant record contains issuer, Agent, tenant scope,
  expiry, status, restrictions, and allowed capabilities but no release
  identity, supported-version constraint, discovery digest, or artifact digest
  (`packages/ghostbridge-native-agent/src/index.js:442-471`).
- A signed Connection Offer adds a supported protocol list derived from the
  Passport, but no Client offer or deterministic selected-result proof is
  present (`packages/ghostbridge-native-agent/src/index.js:478-524`).
- Development and production Connection records contain no protocol release
  field. `publicConnection` inserts the current package constant only when
  projecting the record
  (`packages/ghostbridge-native-agent/src/index.js:1608-1636,1745-1778,2088-2104`).
- Invocation validates the envelope version against the package constant before
  loading the Connection, but cannot compare it with a stored selected version
  because the Connection has none
  (`packages/ghostbridge-native-agent/src/index.js:587-592`).
- The HTTP dispatcher routes and parses requests without inspecting the
  Client's `ghostbridge-version` header, so header/body disagreement is not
  rejected at that layer
  (`packages/ghostbridge-native-agent/src/index.js:2720-2969`).
- Task creation persists Connection, Passport, and capability references but no
  protocol release (`packages/ghostbridge-native-agent/src/index.js:2143-2168`).
- Receipt context retains the Invocation envelope's protocol version only in an
  internal nested context; the Task, final Receipt, and stored Connection do not
  all expose the same binding
  (`packages/ghostbridge-native-agent/src/index.js:2195-2279`).
- The default Receipt contains Connection, Passport, capability, tenant, and
  evidence fields but no protocol release or specification/schema artifact
  identity (`packages/ghostbridge-native-agent/src/index.js:2294-2347`).

### Trust, Issuer, Platform, and conformance implementation

- Trust uses independent constants such as
  `ghostbridge-trust/0.1-draft`, `ghostbridge-proof/0.1-draft`, and
  `ghostbridge-http-signature/0.1-draft`; those profile identities are not the
  protocol release identity
  (`packages/ghostbridge-trust/src/index.js:8-11`).
- Signed-request descriptors do bind a `protocolVersion` with Connection,
  audience, Invocation, message, nonce, and validity data, demonstrating useful
  implementation evidence, but they copy the caller's value and do not prove
  that it equals a durable Connection selection
  (`packages/ghostbridge-trust/src/index.js:1532-1565`).
- `trustResult` produces category, validity booleans, reason codes, and evidence
  without a required protocol, Trust-profile, schema, or artifact identity
  (`packages/ghostbridge-trust/src/index.js:1120-1129`;
  `protocol/schemas/0.1-draft/trust-result.schema.json:3-13`).
- Platform builds Invocations with the package protocol constant even though it
  opens a sealed Connection binding
  (`backend/src/services/platformNativeClient.service.js:631-716`, especially
  `:661-669`).
- Platform discovery obtains a Client `selectedVersion`, but this is product
  evidence and not a normative Connection-selection contract
  (`backend/src/services/platformNativeClient.service.js:472-526`).
- The current conformance result records the package protocol constant, while
  the runner imports official helpers. It records no specification/schema
  manifest digest and cannot establish independent version semantics
  (`packages/ghostbridge-conformance/src/index.js:145-178`;
  `docs/protocol/conformance-architecture.md:268-282`).

### Current test evidence

The bodies of the cited tests were inspected. They prove only the stated current
implementation behavior:

- The protocol-core test exercises only the single package constant and one
  non-overlapping value. It does not permute multiple versions, channels,
  preferences, duplicates, stale discovery, or downgrade evidence
  (`packages/ghostbridge-protocol-core/test/core.test.js:28-42`).
- The compatibility test checks current compatible/limited/incompatible profile
  outcomes and a no-overlap Host value. It does not assert which release wins
  when more than one version overlaps
  (`packages/ghostbridge-protocol-core/test/core.test.js:229-271`).
- The Native Client happy path uses the same package constant in Passport,
  discovery, Connection, and Invocation. It proves a one-version official
  Client/Agent path, not negotiation determinism or historical binding
  (`packages/ghostbridge-native-client/test/client.test.js:13-150`).
- The Native Agent Invocation test uses the package constant and proves that a
  currently revoked Connection rejects a later Invocation; it does not test
  version substitution or renegotiation
  (`packages/ghostbridge-native-agent/test/agent.test.js:114-148`).
- The filesystem restart test proves that a minimal Connection status, Task,
  Receipt, and Approval-consumption record can survive reopening. Its Connection
  fixture has no version identity, so it does not prove selected-version
  survival (`packages/ghostbridge-native-agent/test/security15c1a.test.js:1553-1628`).
- The Platform negative test rejects discovery advertising
  `ghostbridge/99`, but that input is also outside the current parser grammar.
  It does not establish valid-but-unsupported release behavior or a
  compatibility matrix
  (`backend/src/tests/platformNativeClient.test.js:928-970`).

Passing these tests does not settle H-03.

## Current contradictions and ambiguities

1. The historical label is `ghostbridge/0.1-draft`, package versions are
   `0.1.0-draft`, and the root deployment/package is `0.1.0`; no rule relates or
   separates them.
2. The current parser resembles a two-component numeric version with a channel,
   not strict Semantic Versioning, and has no patch or formal prerelease order.
3. `negotiateVersion` prefers local preference over remote preference and then
   numeric major/minor; `checkCompatibility` takes first Host-list overlap.
   Identical supported sets in a different order can yield different results.
4. `negotiateVersion` reports `UNSUPPORTED_PROTOCOL_VERSION` for no overlap;
   compatibility can map the same condition to
   `NO_COMMON_PROTOCOL_VERSION`.
5. Discovery-time selection is discarded, preview calculates another result,
   and redemption does not carry either result or its inputs.
6. Client configuration can declare custom supported versions that discovery
   negotiation ignores while compatibility preview consumes them, creating
   another path to different results.
7. The Client sends a package constant in HTTP and Invocation data after
   installation, rather than a Connection-selected release.
8. The Agent stores no selected release on the Connection, yet projects the
   current package constant when returning it. A package upgrade could therefore
   reinterpret an old durable Connection.
9. The Client sends a version header, the Invocation carries a body version, and
   the Agent does not compare header, body, and durable Connection.
10. Connection Offer, Passport, discovery, Invocation, Trust metadata, and some
   revocation objects carry version-like fields, while Tasks, Approvals,
   Receipts, Trust results, final stored Connections, and current grants do not
   carry a consistent protocol release.
11. `passportVersion`, `capabilityVersion`, `manifestVersion`,
    `metadataVersion`, Trust/profile identifiers, package versions, and the
    protocol release have no explicit identity registry or anti-confusion rule.
12. Schema paths and `$id` values imply `0.1-draft`, but no immutable manifest
    binds the exact specification and schema artifacts used by a Connection or
    historical object.
13. Draft prose says breaking wire changes require a new version, but does not
    say whether compatible changes require one, whether patch changes may alter
    wire behavior, or whether a final implementation may negotiate a draft.
14. Numeric/newer does not imply supported, safe, compatible, or non-withdrawn;
    no security-floor or downgrade relationship is published.
15. Fresh discovery can differ after Agent restart or deployment, while H-01
    requires the active Connection to retain its original result.
16. No rule distinguishes an unknown syntactically valid release, an unsupported
    known release, a stale advertisement, a withdrawn release, and an invalid
    identifier.
17. No rule defines duplicates, whitespace, Unicode, case, normalization,
    locale-sensitive comparison, or deterministic tie-breaking.
18. No rule says whether errata changes artifact digest, release identity, both,
    or neither.
19. No rule prevents `0.1-draft` from being silently relabeled as a final
    release or historical records from being backfilled with negotiation
    evidence they never contained.

## Security properties that must be preserved

Every viable option is constrained by these properties:

- Discovery, version advertisement, compatibility calculation, preview,
  selection, or artifact possession grants no authority.
- The active Connection created by successful Install Grant redemption remains
  the sole durable source of governed authority under H-01.
- No downgrade may expand authority, enable an unconsented capability/profile,
  weaken authentication/Trust/authorization/Approval, relax tenant scope,
  change canonical proof meaning, or avoid revocation.
- A version/identity/binding failure occurs before Task creation, Approval
  consumption, external side effects, and—subject to accepted H-01 and later
  H-06—Install Grant consumption.
- The selected release is bound to the exact Client offer, Agent advertisement,
  deterministic result, relevant discovery/metadata digest, Install Grant
  redemption context, Agent and Passport identity, Host/audience, organization,
  workspace with explicit absence semantics, authentication profile, immutable
  consent envelope, and final durable Connection.
- A later header, body, SDK default, package constant, deployment default, fresh
  discovery document, or newer artifact cannot substitute a different release.
- Active Connections are never reinterpreted from current discovery or current
  package behavior after Client restart, Agent restart, deployment, or
  Connection resumption.
- Algorithm/profile identity and protocol release identity remain distinct and
  are both bound where proofs or digests depend on them, preventing
  algorithm-confusion substitution.
- Historical Receipts and evidence remain verifiable against their original
  release, schema/specification artifacts, identity, Trust material, and
  applicable historical-time rules.
- Revoked Connections cannot be revived or replaced in place by rediscovery,
  renegotiation, version upgrade, or version downgrade.
- Draft or experimental behavior cannot be smuggled into a final production
  Connection through aliases, normalization, compatibility edges, extension
  claims, or implementation fallbacks.
- Direct Agent-to-Agent authority remains prohibited.
- Authentication, Connection authority, structured authorization, deployment
  policy, and exact-action Approval remain distinct under H-02.

## Compatibility properties that must be preserved

- Independent implementations can validate release identifiers and reproduce
  one selected result without JavaScript, package metadata, locale rules,
  Platform policy, or unordered-container behavior.
- Exact equality, preference ordering, wire compatibility, feature/profile
  compatibility, support status, and security eligibility are separate
  determinations.
- Identical canonical inputs produce one identical selection result.
- Release ordering, where present, is preference information only. It never
  automatically proves compatibility or safety.
- Implementations advertise only release identities they can actually emit,
  accept, and interpret according to the named release and claimed profile.
- An implementation may support several exact release identities, but it may
  not claim support merely because their numbers share a component.
- A selected release and artifact set remain stable for the Connection
  lifetime. Version change requires an explicitly governed replacement or
  transition under later H-07, not mutation in place.
- Client and Agent restart recover durable selection evidence without
  renegotiating active Connections.
- Historical objects retain original meaning after supersession, deprecation,
  support-window change, SDK upgrade, or Platform deployment.
- Draft/prerelease participation is explicit and cannot be mistaken for final
  conformance.
- Schema and specification identity remain reproducible even when a
  non-normative “current” index changes.
- Errata are discoverable without mutating original artifacts or fabricating
  what an historical peer negotiated.
- H-13 extensions can evolve only inside the selected release's declared
  extension rules and cannot silently import later core semantics.

## Immutable release manifest and separate errata-index model

Every option in this packet uses the same proposed artifact rule:

- one protocol release identity has exactly one immutable release manifest;
- the release-manifest identity and digest never change;
- the specification-manifest identity and digest never change;
- the schema-bundle-manifest identity and digest never change;
- every original specification, schema, fixture, vector, state-machine, and
  other release artifact retains its original identity and digest;
- the release's draft/prerelease/final status at publication is immutable;
- later deprecation or withdrawal is separate support/eligibility metadata
  governed under the H-03/H-14 boundary, not a mutation of the release
  manifest; and
- immutable compatibility declarations and their evidence are separately
  identified; later declarations do not rewrite an earlier declaration.

Editorial errata are published through a **separate append-only errata
index/manifest**. Each updated errata-index snapshot has a new immutable
identity and digest and references the immutable erratum entries it includes.
Publishing a new erratum or errata-index snapshot does not change:

- protocol release identity;
- release-manifest identity or digest;
- specification-manifest identity or digest;
- schema-bundle-manifest identity or digest;
- any original artifact identity or digest;
- Connection-selected semantics; or
- historical-object meaning.

An active Connection may retain its original selected release and artifact
bindings without mutation when editorial errata are published later. Reviewers
may consult the current errata index as a separate governance overlay, but the
overlay is not a negotiated semantic update and cannot override the
Connection.

Any correction that changes required emit, accept, reject, authorize, sign,
verify, persist, transition, or historical-interpretation behavior creates a
new protocol release identity and new immutable release, specification, schema,
and affected executable artifacts.

## Viable options

The syntaxes and algorithms below are concrete enough for review. They are
proposals inside unapproved options, not protocol requirements.

### Option A — Semantic version identity

Use a strict Semantic-Versioning-style protocol release identity.

#### Proposed identifier contract

| Question | Option A answer |
| --- | --- |
| Canonical wire syntax | `ghostbridge/<major>.<minor>.<patch>` for final releases; `ghostbridge/<major>.<minor>.<patch>-<prerelease>` for non-final releases |
| Numeric components | Unsigned ASCII decimal integers with no leading zero unless the value is exactly `0`; implementations must reject values outside an approved bounded integer range rather than round them |
| Prerelease grammar | One or more dot-separated ASCII identifiers; each identifier is `[0-9a-z-]+`, empty identifiers are invalid, numeric identifiers have no leading zero, and Ghost Bridge governance restricts registered stage prefixes to `experimental`, `draft`, `alpha`, `beta`, or `rc` plus an optional numeric component |
| Example final identity | `ghostbridge/1.2.0` |
| Example draft identity | `ghostbridge/1.2.0-draft.3` |
| Human label | Separate, for example `Ghost Bridge 1.2.0 Draft 3`; never an equality input |
| Case sensitivity | Prefix and registered textual prerelease identifiers are lowercase and case-sensitive; uppercase input is invalid, not normalized |
| Whitespace | Leading, trailing, or embedded whitespace is invalid |
| Unicode | Any non-ASCII code point is invalid; Unicode normalization is never applied |
| Normalization | None. A sender emits canonical syntax; a receiver rejects non-canonical input rather than trimming, case-folding, decoding aliases, or removing leading zeros |
| Exact equality | Byte-for-byte equality of two validated canonical ASCII release identities |
| Invalid identifier | Fail as invalid before negotiation; do not reinterpret it as unknown, unsupported, or a package version |
| Release ordering | Total SemVer precedence for validated identities, with build metadata prohibited so precedence and identity cannot diverge |
| Status | Encoded by prerelease form and repeated in an immutable release manifest; a final identity has no prerelease suffix |

Major, minor, and patch would have these governance meanings:

- A **major** increment is required for an intentionally incompatible wire,
  authority, verification, or historical-meaning change.
- A **minor** increment may add optional wire behavior, optional fields, or
  features only where the accepted H-13 evolution rules let an older
  implementation safely ignore, preserve, or reject them. It may not make a
  previously optional field required for an existing message.
- A **patch** increment may correct prose, tighten rejection of behavior that
  was already invalid, or apply a wire-compatible security correction. It may
  not change required emitted bytes, make valid historical messages invalid,
  add a required field, change an enum/state meaning, or alter proof inputs. If
  a correction does any of those things, it requires at least a minor or major
  release according to its compatibility impact.
- A prerelease identifier is part of exact release identity. Removing
  `-draft.3` creates a different final identity; it never “promotes” the draft
  in place.

These meanings constrain release governance but do not themselves prove that
two releases interoperate. In particular, “same major” is not sufficient
evidence of wire compatibility.

#### Compatibility and artifact model

Each release has a separately identified immutable release manifest containing:

- canonical protocol release identity and human label;
- immutable status at publication;
- specification-manifest identity and digest;
- schema-bundle identity and digest;
- applicable profile/extension registries;
- immutable references to explicit directed wire-compatibility declarations and
  their evidence; and
- immutable conformance/interop evidence references available at publication.

The release manifest, specification manifest, schema-bundle manifest, and
original artifact digests never change. Later support, deprecation, withdrawal,
supersession, additional compatibility evidence, and editorial errata are
separate append-only governance records or indices. They do not mutate the
release manifest or the semantics selected by an existing Connection.

An implementation advertises an exact release only if it can speak that release
as specified. If a `1.3.0` implementation can also speak `1.2.0`, it advertises
both exact identities; it does not rely on the shared major number.
Feature/profile compatibility is calculated after release eligibility and is
governed by H-04, H-05, and H-13.

The specification artifact, schema bundle, and individual schema identities are
not derived solely from `1.2.0`. Their immutable identifiers and canonical
digests remain separate fields. H-10 must later define exact canonical bytes,
digest algorithm, encoding, and domain separation.

#### Deterministic negotiation

Option A uses the following proposed algorithm:

1. Parse every Client-supported and Agent-supported identity using the exact
   grammar. Reject the whole offer/advertisement if any identifier is invalid.
2. Treat each supported list as a mathematical set. Duplicate exact identities
   are invalid, even if associated metadata is identical.
3. Require each advertised preferred identity to be a member of that
   participant's supported set. Otherwise the advertisement/offer is invalid.
4. Resolve every syntactically valid identity to the immutable release manifest
   and required artifact manifests. A syntactically valid identity with no
   trusted manifest is **unknown**, not merely unsupported.
5. Compute the exact intersection of Client and Agent supported identities.
6. Remove candidates forbidden by either side's explicit final/draft policy,
   required support/security floor, withdrawn status, missing/invalid artifact
   digest, or absence from the immutable consent envelope.
7. Apply H-04/H-05/H-13 compatibility constraints without changing the release
   identity. A required profile/feature mismatch removes the candidate.
8. If the Client and Agent preferred identities are equal and remain eligible,
   select that identity. Otherwise select the greatest eligible identity by
   SemVer precedence.
9. If SemVer precedence is equal, the identities are equal because build
   metadata is prohibited; therefore no further tie is possible.
10. The Client and Agent independently recompute the same result. The Agent may
    commit only that result during redemption. Any different selection fails.

Array order, JavaScript sort stability, object enumeration, locale, package
version, Platform preference, and current deployment version are not inputs.
The `preferredVersion` field is validated but cannot unilaterally force a lower
release unless both participants explicitly prefer the same eligible release.

#### Required negotiation and binding behavior

| Topic | Option A treatment |
| --- | --- |
| Supported-version advertisement | Canonical unique set of exact SemVer-style release identities plus immutable release/artifact manifest references |
| Preferred-version advertisement | One member of the advertised set; both sides matching can override greatest-version preference |
| Client offer | Canonical supported set, preferred member, final/draft policy, security floor, release/artifact digests, nonce/freshness data, identity/scope/authentication/consent bindings |
| Agent selection | Recompute the algorithm and select only its single result inside the consent envelope |
| Unknown version | Syntactically valid but unresolved manifest; fail or exclude as explicitly declared, but never guess semantics |
| Unsupported version | Known release not implemented/advertised by a participant; not eligible |
| No common version | Stable incompatibility before grant consumption, Connection/Task creation, Approval consumption, or side effect |
| Header/body/object mismatch | Fail before operation processing; none may override the durable Connection |
| Stale discovery | Revalidate the advertisement/digest at redemption; material change requires new preview and consent under H-01 |
| Downgrade detection | Compare offer, advertisement, eligible candidate set, deterministic result, consent envelope, and received selection; any unexplained difference is a downgrade/binding failure |
| Downgrade prevention | Security/withdrawal floor is applied before SemVer ordering; a numerically higher release is not automatically safest |
| Algorithm confusion | Bind protocol release, digest/proof profile identities, manifest digests, and algorithm policy as distinct fields |
| Version proof/digest | Bind a canonical negotiation-transcript digest and release/spec/schema manifests; exact H-10 algorithm remains deferred |
| Install Grant redemption | Redemption carries/references the offer, advertisement, selected result, metadata and consent digests; success atomically stores them with grant consumption and Connection creation |
| Durable Connection | Stores exact selected release, manifest identities/digests, transcript/consent binding, identities, scope, Host/audience, authentication profile, and applicable compatibility evidence |
| Later requests | Carry the selected release and required Connection reference; HTTP/body/proof/object mirrors must equal the durable Connection |
| Connection resumption | Load the stored selection; do not rerun negotiation or use current discovery |
| Mixed-version request | Reject; no per-message version switching inside one active Connection |

#### Restart, history, drafts, errata, and extensions

- Client restart must recover an opaque durable Connection binding or reacquire
  it through a defined resumption mechanism; it must not rebuild the selection
  from discovery. Exact storage/API behavior remains for H-07.
- Agent restart loads the original Connection selection and artifact bindings.
  A new package default cannot change them.
- Historical verification resolves the object/Connection's exact release and
  pinned artifact manifests, then applies H-11 historical-time semantics.
- Specification and schema identity are explicit. A matching SemVer release
  string with a mismatched manifest digest is a binding failure.
- Editorial errata create new erratum artifacts and a new separate
  errata-index identity/digest but do not change the immutable release manifest,
  specification/schema manifests, original artifact bytes/digests, or release
  identity. A correction that changes interoperable behavior creates a new
  SemVer release identity and new immutable artifacts.
- Supersession is prospective. Higher SemVer precedence does not rewrite old
  Connections or objects.
- Final implementations reject draft negotiation by default. Draft use requires
  explicit bilateral opt-in, explicit human consent, an isolated Connection,
  and a conformance claim that names the draft rather than a final release.
- Extensions under H-13 remain constrained by the selected release. A later
  extension registry or later minor release cannot be imported by discovery
  alone.
- Transition to an independently implementable release requires a new immutable
  release directory and asset manifests; `0.1-draft` is not silently converted
  to a SemVer final release.

#### Benefits

- Familiar syntax and a widely understood total precedence relation.
- Clear three-part release cadence and conventional prerelease notation.
- Easy deterministic sorting in many languages when the complete grammar and
  bounds are implemented correctly.
- Patch releases give governance a place for genuinely wire-compatible
  corrections without consuming a minor identifier.
- Human operators can often recognize broad release chronology from the
  identifier.

#### Risks

- Implementers may infer “same major means compatible,” “minor is safe,” or
  “patch cannot affect security” even though compatibility remains explicit.
- SemVer is primarily a software/API convention; applying it to durable,
  signed, authority-bearing wire semantics invites false assumptions.
- Patch-versus-minor classification can become contentious, especially for a
  security correction that changes rejection behavior.
- Numeric precedence can be mistaken for security preference or support status.
- The current two-component `ghostbridge/0.1-draft` label does not fit the new
  grammar and needs explicit legacy treatment.
- Prerelease precedence rules are more complex than Option C's constrained
  stage registry and easier to implement inconsistently.

#### Failure scenarios

1. An Agent assumes `1.4.0` can process a `1.2.0` Connection because the major
   matches, but a canonicalization rule changed; historical signature
   verification fails or, worse, accepts altered meaning.
2. A security fix is shipped as `1.2.1` but changes valid request bytes. One peer
   treats the patch as transparent while another requires exact release
   negotiation.
3. Peers select the numerically greatest overlap even though its release
   manifest is withdrawn for a downgrade vulnerability.
4. A final implementation accepts `1.2.0-rc.1` because prerelease ordering made
   it the greatest common candidate, despite no explicit draft opt-in.
5. One parser accepts leading zeros, uppercase stage names, or build metadata
   and another rejects them, producing unequal transcript digests.
6. A mutable “latest 1.x” artifact URL changes schema bytes while the release
   string stays `1.2.0`.
7. An active `1.2.0` Connection is read after installing an SDK whose package
   version is `2.0.0`; package-derived defaults silently reinterpret it.
8. A Client header says `1.3.0`, its Invocation says `1.2.0`, and the Agent uses
   whichever layer it validates first.

### Option B — Opaque release identifier with explicit compatibility graph

Use an immutable opaque release identifier. Derive neither ordering nor
compatibility from its characters.

#### Proposed identifier contract

| Question | Option B answer |
| --- | --- |
| Canonical wire syntax | `ghostbridge/r/<opaque-id>` |
| Opaque ID grammar | Exactly 26 lowercase characters from the unambiguous ASCII base32 alphabet `0123456789abcdefghjkmnpqrstvwxyz`; generated from at least 128 bits of release-governance randomness, not from time or artifact contents |
| Example identity | `ghostbridge/r/01jx6m9q4tw7c3k2vh8s5n0pfa` (illustrative only) |
| Human label | Required separate field, for example `Ghost Bridge 1.0 Candidate 2`; it may contain display text but is never an equality, order, or proof input unless separately canonicalized |
| Case sensitivity | Entire canonical identity is lowercase and case-sensitive; uppercase is invalid |
| Whitespace | Leading, trailing, or embedded whitespace is invalid |
| Unicode | Any non-ASCII code point is invalid; Unicode normalization is never applied |
| Normalization | None; reject rather than trim, case-fold, or map ambiguous base32 characters |
| Exact equality | Byte-for-byte equality after canonical grammar validation |
| Invalid identifier | Fail before compatibility processing |
| Release ordering | None. IDs have neither chronological nor preference order |
| Status | Immutable publication status in the release manifest (`experimental`, `draft`, registered prerelease stage, or `final`); later `deprecated` or `withdrawn` eligibility is separate support metadata under the H-03/H-14 boundary |

The identifier is intentionally not the artifact digest. Artifact replacement,
manifest digest, status, compatibility edges, and human label remain separate,
reviewable data. A release ID is never regenerated from new bytes or reused for
another release.

#### Explicit compatibility graph

Each immutable release manifest is a node. Directed, signed/reviewed
compatibility declarations are edges. An edge must name:

- source implementation/release behavior and target wire release;
- direction (`emit`, `accept`, or both);
- applicable roles, transports, profiles, features, authentication profiles,
  and extension boundaries;
- exact specification and schema artifact manifests;
- security constraints and withdrawal status;
- conformance and interoperability evidence;
- effective/supersession governance reference; and
- declaration identity and canonical digest.

Absence of an edge means no compatibility claim. Graph reachability is not
transitive unless an explicit declaration says so and cites evidence; if A can
speak B and B can speak C, A is not automatically compatible with C.

An implementation advertises every exact target release it can speak, backed by
the appropriate edge/evidence. Negotiation still selects one exact release
identity; it does not select “a path” whose intermediate releases can change
message meaning.

#### Explicit preference and deterministic negotiation

Because release IDs have no natural order, each Client offer and Agent
advertisement includes a unique non-negative integer `preferenceRank` for every
supported exact release. `0` is most preferred. Ranks are explicit protocol
data, not array positions. The separately exposed `preferredVersion` must equal
the unique rank-0 identity.

Option B uses the following proposed algorithm:

1. Validate every release ID, rank, release/artifact manifest reference, and
   preferred member. Invalid input fails the whole offer/advertisement.
2. Reject duplicate IDs, duplicate ranks within one participant's list,
   conflicting metadata for one ID, and a preferred value that is not rank 0.
3. Resolve each ID and applicable graph edge to trusted immutable manifests.
   Syntactically valid unresolved IDs are unknown.
4. Compute the exact ID intersection.
5. Remove candidates forbidden by final/draft policy, security/support floor,
   withdrawal, missing compatibility evidence, profile/feature constraints, or
   the consent envelope.
6. For each eligible candidate compute the integer tuple:
   `(clientRank + agentRank, max(clientRank, agentRank), clientRank, agentRank,
   canonicalReleaseId)`.
7. Select the lexicographically least tuple, comparing integers numerically and
   the final release ID by unsigned ASCII bytes.
8. Both peers recompute the result. The Agent may commit only that result during
   redemption; a different result is a selection/downgrade failure.

The sum balances both stated preferences; `max` avoids a candidate strongly
disfavored by one side winning a sum tie; Client and Agent ranks then give
stable role-specific tie-breaking; the opaque ID makes the last tie
deterministic without giving it compatibility meaning.

#### Required negotiation and binding behavior

| Topic | Option B treatment |
| --- | --- |
| Supported-version advertisement | Unique `{releaseId, preferenceRank, releaseManifest, artifactManifest}` records; array order has no meaning |
| Preferred-version advertisement | Exact rank-0 ID; mismatch is invalid metadata |
| Client offer | Ranked records plus graph/declaration digests, status policy, security floor, nonce/freshness, identity/scope/authentication/consent bindings |
| Agent selection | Recompute tuple ranking and select its single result inside the consent envelope |
| Unknown version | Valid opaque ID without a trusted node manifest; never interpret from label or rank |
| Unsupported version | Known node not advertised/speakable by a participant or lacking the required directed compatibility declaration |
| No common version | Stable pre-authority incompatibility; no graph-path guessing |
| Duplicate identifiers | Reject the containing offer/advertisement; do not silently de-duplicate |
| Tie-breaking | Numeric tuple followed by unsigned ASCII identity; never locale or container order |
| Header/body/object mismatch | Fail against durable Connection identity before governed processing |
| Stale discovery | Advertisement digest/freshness is revalidated during redemption; material change requires new preview and consent |
| Downgrade detection | Recompute ranks/graph/security filters and compare with selected ID and consent/transcript digest |
| Downgrade prevention | A low opaque ID has no “older” meaning; explicit ranks, security status, and graph constraints are the only selection inputs |
| Algorithm confusion | Compatibility edge, protocol release, artifact digests, and proof/digest profiles are independently identified and bound |
| Version proof/digest | Bind release-node manifest, exact graph declaration(s), artifact manifests, and negotiation transcript |
| Install Grant redemption | Atomically binds exact ranked offer, advertisement, graph evidence, result, consent, and Connection at H-01 commit |
| Durable Connection | Stores selected opaque ID plus all graph/artifact/transcript evidence required to reproduce selection and historical meaning |
| Later requests | Carry/mirror the exact opaque ID and Connection reference; no label, rank, or package version can override |
| Connection resumption | Load the original opaque ID and evidence; current graph changes do not mutate it |
| Mixed-version request | Reject; a graph edge cannot authorize per-message switching inside a Connection |

#### Restart, history, drafts, errata, and extensions

- Client and Agent restart use durable Connection selection evidence, not
  current ranks or graph edges.
- Withdrawal metadata makes the affected release ineligible for new
  Connections; H-14 decides who may publish withdrawal and whether it requires
  revocation, replacement, or other treatment for active Connections. Neither
  the support metadata nor that later treatment rewrites release identity or
  the original meaning of a historical Connection or Receipt.
- Historical verification pins the original release node, compatibility
  declaration if relevant, and artifact manifests. A current human label is not
  evidence.
- Draft/final status is immutable for a node. A draft becoming final creates a
  new opaque release ID and a supersession edge.
- Final implementations reject draft nodes by default. Explicit bilateral
  opt-in, consent, isolation, and draft-named conformance claims are required.
- Editorial errata add immutable erratum artifacts and a new separate
  errata-index identity/digest; the opaque release node, release manifest,
  specification/schema manifests, and original digests remain unchanged.
  Interoperable-behavior changes create a new opaque node, immutable artifacts,
  and explicit edges.
- H-13 extensions are compatibility-edge constraints. A later graph update
  cannot inject an extension into an active Connection.
- The first independently implementable normative release gets a newly approved
  opaque node and artifacts; `0.1-draft` remains a separate legacy historical
  label rather than being encoded into a fabricated opaque ID.

#### Benefits

- Makes it difficult to infer compatibility, safety, age, or support from the
  identifier alone.
- Compatibility is explicit, directional, profile-aware, evidence-backed, and
  non-transitive by default.
- Historical release identity remains clear even if human labels, release
  cadence, or marketing terminology change.
- Security withdrawal and preference do not fight a misleading numeric order.
- Supports unusual evolution such as parallel release families without
  overloading major/minor components.

#### Risks

- Requires a trustworthy compatibility-graph distribution, caching, signing,
  and review process before even simple multi-version negotiation.
- Every implementation and operator must manage opaque IDs, human labels,
  ranks, graph nodes, edges, and artifact manifests.
- Preference ranks can drift between discovery and redemption and enlarge the
  consent/transcript surface.
- Debugging and manual configuration are harder because identifiers are not
  memorable.
- An unavailable graph authority or missing edge can make otherwise compatible
  implementations fail closed.
- Graph governance, support windows, and publication ownership overlap heavily
  with H-14 and could delay an independently implementable release.

#### Failure scenarios

1. Two deployments use the same human label for different opaque IDs and an
   operator configures the label rather than the canonical release identity.
2. A Client follows A→B and B→C edges transitively even though A→C was never
   tested, accepting incompatible signed-object semantics.
3. One peer uses array position as rank while the other uses explicit
   `preferenceRank`, producing different selections.
4. A stale graph edge says an older implementation can accept a release whose
   security profile was withdrawn; redemption fails to bind the current
   security status.
5. A graph service outage makes manifests unavailable and an implementation
   falls back to any common-looking opaque ID.
6. An Agent selects its rank-0 release instead of the tuple result, silently
   overriding Client support/consent.
7. Active Connections are recomputed when preference ranks change after a
   deployment, changing release identity without replacement.
8. A draft node's status is edited to `final` in place, destroying the meaning
   of historical conformance results.

### Option C — Protocol epoch and revision

Use a constrained Ghost Bridge release model: an epoch identifies a
compatibility line, an ordered revision identifies an immutable release within
that line, and an optional registered stage identifies a non-final immutable
release.

The syntax below was proposed for decision and was subsequently accepted with
the qualifications in the completed approval block.

#### Proposed identifier contract

| Question | Option C answer |
| --- | --- |
| Canonical final syntax | `ghostbridge/e<epoch>.r<revision>` |
| Canonical non-final syntax | `ghostbridge/e<epoch>.r<revision>-<stage>.<iteration>` |
| Epoch bound | Integer value `0` through `2147483647`, inclusive |
| Revision bound | Integer value `0` through `2147483647`, inclusive |
| Stage-iteration bound | Integer value `0` through `2147483647`, inclusive |
| Numeric encoding | Canonical unsigned ASCII decimal text, one to ten digits; no leading zero unless the component is exactly `0`; no plus or minus sign, decimal point, exponent notation, or whitespace |
| Overflow and comparison | Reject a value above `2147483647` rather than wrapping, clamping, rounding, or using an implementation-specific maximum; compare exact numeric values only after canonical validation |
| Registered stages | `experimental`, `draft`, `alpha`, `beta`, `rc` |
| Example final identity | `ghostbridge/e1.r0` |
| Proposed next draft identity | `ghostbridge/e1.r0-draft.1` |
| Proposed directory component | `e1.r0-draft.1`, yielding `protocol/specification/e1.r0-draft.1/` and `protocol/schemas/e1.r0-draft.1/` |
| Human label | Separate, for example `Ghost Bridge Epoch 1 Revision 0 Draft 1` |
| Case sensitivity | Entire canonical identity is lowercase and case-sensitive; uppercase is invalid |
| Whitespace | Leading, trailing, or embedded whitespace is invalid |
| Unicode | Any non-ASCII code point is invalid; Unicode normalization is never applied |
| Normalization | None; reject non-canonical input rather than trimming, case-folding, removing zeros, or aliasing punctuation |
| Exact equality | Byte-for-byte equality after canonical grammar validation |
| Invalid identifier | Fail before unknown/support/compatibility processing |
| Status | Final has no suffix; non-final status is part of identity and repeated in the immutable release manifest |

The same `0` through `2147483647` bound applies independently to epoch,
revision, and stage iteration. Ten digits is the maximum encoded component
length, but a ten-digit value above `2147483647` is invalid. Parsing must not
pass through a floating-point representation that can round the value, and an
implementation's native integer width must not narrow or expand the accepted
range.

The proposed total release-preference order is:

1. compare epoch numerically;
2. compare revision numerically;
3. for the same epoch/revision, stages order
   `experimental < draft < alpha < beta < rc < final`;
4. compare stage iteration numerically for equal non-final stages.

This is a **preference/chronology order only**. It does not establish wire
compatibility, support, conformance, or security eligibility.

Epoch and revision would have these governance meanings:

- An **epoch change is mandatory** for an intentionally breaking change to
  required wire behavior, authority boundaries, canonical proof meaning,
  durable-object interpretation, or required verification.
- A **revision change is eligible to be declared compatible** within the epoch
  for optional additions, clarifications, or wire-compatible security
  corrections. Compatibility still requires an explicit, directional
  declaration and evidence.
- A release that intentionally breaks the epoch's compatibility promise is
  invalid governance and must use a new epoch. A security withdrawal may make
  an older revision ineligible for new Connections without changing its
  historical identity.
- Each draft/prerelease is immutable. `e1.r0-draft.1`, `e1.r0-draft.2`, and
  `e1.r0` are distinct releases and artifact sets.

#### Explicit compatibility and artifact model

Each release identity has exactly one immutable release manifest with the same
minimum contents described for Option A. Its release-manifest identity/digest,
specification-manifest identity/digest, schema-bundle-manifest identity/digest,
and original artifact digests never change. Editorial errata use the separate
append-only errata-index model and do not mutate those bindings. Within an
epoch, separately identified directed declarations state which implementation
revisions can emit/accept which exact wire revisions, under which profiles and
evidence. Compatibility is not transitive by default.

An implementation advertises each exact wire release it can speak. For example,
an implementation built from `e1.r3` may advertise `e1.r3`, `e1.r2`, and
`e1.r1` only if it genuinely implements each named release and has the required
compatibility/conformance evidence. A Connection always selects one exact
identity such as `ghostbridge/e1.r2`.

Specification-manifest identity, schema-bundle identity, and their canonical
digests remain separate from the release identity. A mutable directory,
“latest” pointer, package version, or deployment version cannot satisfy this
binding.

#### Deterministic negotiation

Option C uses the following proposed algorithm:

1. Strictly validate every Client and Agent release identity, including the
   exact numeric bounds and encoding rules. Any invalid or non-canonical
   identity rejects the containing offer or advertisement.
2. Reject duplicate exact identities and conflicting metadata. Treat supported
   identities as sets; array order has no meaning.
3. A participant claiming support for a release must possess and identify that
   release's required trusted immutable release, specification, schema-bundle,
   and applicable artifact manifests. Missing required manifest identity or
   digest makes that participant's own offer/advertisement invalid.
4. For each participant separately, compute the subset of its own advertised
   releases that is **locally** status-eligible and security-eligible at the
   time it creates the metadata. `preferredVersion` is a redundant consistency
   field and must equal the greatest release in that local subset. It cannot
   encode a unilateral lower preference. A missing, out-of-set, stale, or lower
   value makes that participant's metadata invalid.
5. A canonical release unknown to the receiving participant but outside the
   exact supported intersection does not by itself invalidate negotiation.
   Never infer its meaning from epoch proximity, package defaults, current
   deployment behavior, a latest/current pointer, or same-epoch assumptions.
6. Compute the exact bilateral intersection of the two supported sets.
7. Resolve every intersecting candidate to trusted immutable release and
   artifact manifests. An unresolved intersecting candidate is **unknown** and
   is removed from eligibility. A known release not actually implemented or
   advertised by a participant is **unsupported** and is not a bilateral
   candidate.
8. Apply all bilateral compatibility, security, withdrawal, profile, feature,
   authentication, artifact, freshness, consent-envelope, and other accepted
   eligibility filters. A withdrawn release is ineligible for new Connection
   creation.
9. If no eligible exact candidate remains, return the stable
   no-compatible-release outcome.
10. Select the greatest remaining identity by the canonical
    epoch/revision/stage order.
11. The Client and Agent independently recompute the same result. The Agent may
    commit only that result during redemption.

The numerically greatest identity is **not automatically safest or
compatible**. It is selected only after exact support, explicit compatibility,
security/withdrawal, status, artifact, freshness, profile, feature,
authentication, consent, and every other accepted bilateral filter makes it
eligible. Ordering is the last step, not the eligibility rule.

Local preferred evaluation and final bilateral eligibility are distinct.
`preferredVersion` describes only the greatest locally eligible member of one
participant's own advertised set. It cannot force the final selection, which
may legitimately be lower or otherwise different because the peer does not
advertise the local preferred release or a bilateral filter removes it.

#### Required negotiation and binding behavior

| Topic | Option C treatment |
| --- | --- |
| Supported-version advertisement | Unique canonical set of exact epoch/revision/stage identities; the participant must possess and identify required trusted immutable release/artifact manifests for every claimed release |
| Preferred-version advertisement | Redundant consistency field equal to the greatest locally status-eligible and locally security-eligible member of that participant's own advertised set; it cannot encode a lower unilateral preference or force final selection |
| Client offer | Supported set, epoch/security floor, final/draft policy, manifests, compatibility evidence, nonce/freshness, identity/scope/authentication/consent bindings |
| Agent selection | Recompute eligibility and greatest eligible exact identity; no unilateral choice |
| Duplicate identifiers | Reject; do not de-duplicate silently |
| Invalid advertisement | Any invalid/non-canonical ID, duplicate/conflict, missing claimed-release manifest, or inconsistent preferred value rejects that participant's containing metadata |
| Unknown version | A canonical non-intersecting unknown does not itself invalidate negotiation; an unresolved intersecting candidate is unknown and removed; never infer meaning from epoch/revision, package/default/current pointers, or same-epoch proximity |
| Unsupported version | Known identity not actually implemented or advertised by a participant; it is not an exact bilateral candidate |
| No common version | Exact intersection is empty; continue to the stable no-compatible-release outcome before authority or side effects |
| No compatible version | No exact candidate remains after unknown-candidate removal and all bilateral eligibility filters; return the stable no-compatible-release outcome without adjacent-revision substitution |
| Tie-breaking | Canonical numeric/stage order is total; exact equal tuple means exact identity |
| Header/body/object mismatch | Fail before Task/Approval/grant commit/side effect; durable Connection wins only as the expected value, never by silently rewriting the request |
| Stale discovery | Revalidate advertisement/manifest digest at redemption; material change requires a new H-01 preview and consent |
| Downgrade detection | Recompute the full eligible set and greatest result; compare offer, advertisement, selected result, security floor, consent, and transcript digest |
| Downgrade prevention | Apply explicit security/withdrawal floor before ordering; disallow a lower selected revision when a higher eligible result is deterministic |
| Algorithm confusion | Bind release, compatibility declaration, schema/spec manifests, and H-10 proof/digest profiles as separate identities |
| Version proof/digest | Bind a canonical transcript digest and all release/artifact declarations; H-10 decides byte and algorithm details |
| Install Grant redemption | Carry/reference the offer and result; atomically record exact release and transcript with grant outcome and Connection |
| Durable Connection | Store exact release, artifacts, compatibility/security declarations, consent/transcript, Agent/Passport, Host/audience, tenant scope, and authentication profile |
| Task/Approval/Receipt/revocation | Bind or inherit the Connection release using the object rules later in this record; no later revision substitution |
| Client/Agent restart | Recover stored selection; no fresh selection for an active Connection |
| Connection resumption | Resume the original epoch/revision/stage and artifact set |
| Mixed-version request | Reject; a Connection cannot move from revision to revision per message |

#### Restart, history, drafts, errata, and extensions

- Restart and resumption use the durable Connection identity and manifests.
- Historical objects resolve their exact epoch/revision/stage. A later revision
  in the same epoch does not reinterpret them.
- A final implementation may contain draft support only behind explicit
  bilateral opt-in and isolation. Draft Connections and results cannot be used
  to claim final conformance.
- `ghostbridge/0.1-draft` is treated as a legacy historical label outside the
  new grammar. It is not normalized to `e0.r1-draft.1` or
  `e1.r0-draft.1`.
- Editorial errata create immutable erratum artifacts and a new separate
  append-only errata-index identity/digest. They do not change the release
  manifest, specification/schema manifests, original artifact digests,
  Connection-selected semantics, or historical meaning. Normative/interoperable
  corrections create a new revision or epoch and new immutable artifacts as
  their impact requires.
- Supersession and support/security withdrawal are prospective eligibility
  information. A withdrawn release is not eligible for a new Connection;
  historical identity remains unchanged, and H-14 decides any required
  treatment of active Connections.
- H-13 extensions remain selected-release scoped. A later revision's extension
  behavior is not automatically compatible with an earlier revision.
- The accepted `e1.r0-draft.1` identity is the first candidate for new
  independently implementable normative writing. It is not a final release,
  and creating its directories or normative content requires separate
  authorization.

#### Benefits

- Small, Ghost Bridge-specific grammar is easier to implement consistently than
  full SemVer prerelease rules.
- Epoch clearly signals a compatibility boundary while revision gives a useful,
  deterministic preference order.
- Explicit compatibility declarations prevent revision ordering from becoming
  an unsafe compatibility shortcut.
- Human operators can recognize sequence and compatibility line without
  managing only opaque identifiers.
- Fits H-01's single durable Connection selection with less graph/rank
  machinery than Option B.
- Provides a clean, explicitly non-final migration target from the historical
  `0.1-draft` label without pretending that the historical draft was already
  epoch/revision governed.

#### Risks

- “Same epoch” may still be misread as automatic compatibility despite the
  explicit-declaration rule.
- A revision that needs a security-motivated incompatible correction may force
  an epoch change earlier than operators expect.
- The stage order is project-specific and must be implemented exactly in every
  language.
- Epoch/revision is unfamiliar compared with SemVer and needs clear SDK
  documentation.
- A governance mistake that ships a breaking revision inside an epoch weakens
  the value of the epoch promise.
- `e1.r0-draft.1` and its directory component are new identifiers whose human
  approval is recorded here and which still require migration guidance.

#### Failure scenarios

1. An implementation sees two releases in epoch 1 and assumes compatibility
   without the required declaration/evidence.
2. A Client selects the greatest revision before filtering a withdrawn release,
   negotiating a known downgrade vulnerability.
3. A peer treats `e1.r0-draft.2` as the same identity as `e1.r0`, silently
   promoting draft behavior into final production.
4. One implementation orders `draft` after `rc` or uses locale string order
   instead of the registered stage order.
5. A rolling deployment projects its new package-supported revision onto an
   old stored Connection that did not persist `e1.r0`.
6. A material schema change is published as an editorial erratum under the same
   revision, leaving two wire meanings for one identity.
7. A Client sends `e1.r2` in the header on an `e1.r1` Connection and the Agent
   silently treats it as a compatible revision.
8. Historical `0.1-draft` objects are relabeled `e1.r0-draft.1` despite lacking
   its negotiation transcript and artifact manifests.
9. One implementation accepts `e2147483648.r0`, `e+1.r0`, `e01.r0`,
   `e1e3.r0`, or an overlong component by wrapping, coercing, or rounding while
   another rejects it.
10. A participant sets `preferredVersion` to a lower locally eligible release
    as a unilateral preference, or a peer mistakes a valid local preferred
    value for the final bilateral result.
11. A peer rejects an otherwise valid negotiation merely because an unknown
    canonical release is outside the intersection, or retains an unresolved
    intersecting release as eligible based on same-epoch proximity.
12. A later editorial errata index is treated as a replacement release
    manifest and silently mutates an active Connection's specification or
    schema bindings.

## Detailed option-comparison table

| Criterion | Option A — Semantic version | Option B — Opaque ID + graph | Option C — Epoch + revision |
| --- | --- | --- | --- |
| Canonical example | `ghostbridge/1.2.0-draft.3` | `ghostbridge/r/<26-base32>` | `ghostbridge/e1.r2-draft.3` |
| Numeric component bounds | Option-specific future bound | Not applicable to opaque ID | Epoch, revision, and iteration each `0..2147483647`, canonical unsigned ASCII decimal, at most 10 digits |
| Exact equality | Validated byte equality | Validated byte equality | Validated byte equality |
| Natural release order | Total SemVer precedence | None | Total epoch/revision/stage preference |
| Does order imply compatibility? | No, despite common SemVer expectations | No order exists | No; explicit declaration required |
| Does order imply safety? | No | No | No |
| Compatibility representation | Exact advertised support plus explicit directed declarations | Mandatory explicit non-transitive graph | Exact advertised support plus explicit directed declarations within/across epochs |
| Breaking-change signal | Major increment | New opaque node and incompatible/no edge | Epoch increment |
| Compatible-change signal | Minor/patch governance category, still evidence-dependent | New node plus explicit edge | Revision increment eligible for explicit edge |
| Wire-changing patch | Prohibited if it changes valid required wire meaning | Not applicable | New revision or epoch according to impact |
| Human readability | Highest familiarity | Lowest | Moderate and Ghost Bridge-specific |
| Parser complexity | Moderate; full prerelease precedence | Low identifier parser, high graph handling | Low-to-moderate constrained parser/order |
| Negotiation metadata | Supported set, preferences, manifests, security floor | Ranked supported records plus graph nodes/edges/manifests | Supported set, manifests, security/epoch floor |
| Preference source | Matching peer preference, otherwise greatest SemVer eligible | Explicit bilateral ranks and deterministic tuple | `preferredVersion` redundantly checks local eligibility; final result is greatest exact candidate after all bilateral filters |
| Array order normative? | No | No | No |
| Locale/object enumeration dependency | Prohibited | Prohibited | Prohibited |
| Duplicate handling | Reject | Reject | Reject |
| Unknown valid ID | Unresolved SemVer release manifest | Unresolved opaque graph node | Non-intersecting unknown does not invalidate; unresolved intersecting candidate is removed |
| Unsupported known ID | Known but not advertised/implemented | Known node without participant support/edge | Known but not advertised/implemented |
| No overlap | Stable pre-authority failure | Stable pre-authority failure | Stable pre-authority failure |
| Draft/final distinction | Prerelease suffix, immutable manifest status | Separate immutable node status | Stage suffix, immutable manifest status |
| Draft-to-final | New SemVer identity | New opaque ID/node | New stage/final identity |
| Default production draft rule | Reject unless bilateral explicit isolated opt-in | Same | Same |
| Historical clarity | Good if SemVer discipline is strict | Excellent, because nodes never imply mutable chronology | Good, with explicit legacy namespace for `0.1-draft` |
| Risk of numeric compatibility assumption | High | Lowest | Medium |
| Risk of governance operational burden | Medium | Highest | Medium |
| Security withdrawal | Separate eligibility metadata overrides order | Separate graph/node eligibility metadata | Separate eligibility metadata overrides order; no new Connection, while H-14 decides active-Connection treatment |
| Active-Connection behavior | Exact selected release and artifacts stay pinned | Exact node/edges/artifacts stay pinned | Exact epoch/revision/stage and artifacts stay pinned |
| Artifact identity | Separate release/spec/schema manifests and digests | Separate node/spec/schema manifests and digests | Separate release/spec/schema manifests and digests |
| Errata | Separate append-only errata index; wire change gets new SemVer | Separate append-only errata index; wire change gets new node | Separate append-only errata index; wire change gets revision/epoch |
| Supersession | Higher identity may supersede prospectively | Explicit supersession edge | Higher revision/epoch may supersede prospectively |
| `0.1-draft` migration | Legacy label; proposed next ID must add patch/stage | Legacy label; assign new opaque normative node | Legacy label; proposed next ID `e1.r0-draft.1` |
| Independent implementation | Familiar libraries help, but SemVer assumptions must be constrained | Graph machinery is language-neutral but substantial | Small deterministic grammar plus explicit manifests |
| Long-term parallel lines | Major/minor branches | Natural graph branches | Multiple epochs/revision lines |
| Main compatibility tradeoff | Familiarity versus unsafe inferred compatibility | Precision versus graph/rank complexity | Bounded simplicity versus same-epoch assumption risk |
| Main security tradeoff | Numeric precedence can mask withdrawal/downgrade policy | Explicit security data but more availability/governance dependencies | Security filter is explicit, order stays simple |
| Decision outcome | Not accepted | Not accepted | **HISTORICAL RECOMMENDATION — OPTION C SUBSEQUENTLY ACCEPTED** |

## Cross-option deterministic negotiation requirements

Whichever option is accepted, the future normative algorithm must have one
canonical input model and one result. It must replace the present split between
`negotiateVersion` and `checkCompatibility`, not preserve two public algorithms
with different selection behavior.

### Canonical input classes

1. **Client offer**
   - canonical unique supported-release records;
   - explicit preferred release or explicit ranks as the option requires;
   - allowed final/draft statuses;
   - security/support floor and required compatibility declarations;
   - required trusted immutable release, specification, schema-bundle, and
     relevant artifact-manifest identities/digests for every release it claims
     to support;
   - separately identified current deprecation/withdrawal/security-eligibility
     metadata;
   - required profiles/features/authentication/extensions as later decisions
     define;
   - fresh nonce/correlation and offer validity;
   - Client/Host identity and audience binding;
   - organization and workspace, with workspace encoded as a tagged
     `absent` or `value` state rather than empty-string inference; and
   - consent-envelope reference and digest.
2. **Agent advertisement**
   - canonical unique supported-release records;
   - option-specific preference;
   - required trusted immutable release/artifact-manifest identities/digests
     for every release it claims to support;
   - immutable compatibility-declaration identities/digests;
   - Agent and Passport identity/version;
   - applicable discovery/Connection Offer metadata digest and freshness;
   - security/withdrawal status; and
   - supported profile/authentication/extension declarations under later
     decisions.
3. **Selection context**
   - Install Grant reference/redemption context;
   - Host/audience and authenticated principal context;
   - exact tenant scope with absence semantics;
   - authentication profile;
   - immutable H-01 consent envelope;
   - policy/security inputs allowed by the accepted option; and
   - an algorithm/version identifier for the selection algorithm itself, kept
     separate from the selected protocol release.

Under Option C, `preferredVersion` in each participant's input is a redundant
local-consistency value. It is derived before bilateral intersection/filtering
and must equal the greatest release in that participant's own advertised set
that is locally status-eligible and locally security-eligible. It cannot express
a lower unilateral preference, and it is not the final selection.

### Canonical result

The one result must contain or unambiguously reference:

- selected exact protocol release identity;
- release-manifest identity/digest;
- specification-manifest identity/digest;
- schema-bundle identity/digest;
- selected compatibility-declaration identities/digests, if any;
- selected profiles/features/authentication/extensions once later decisions
  define them;
- complete Client-offer and Agent-advertisement digests;
- relevant discovery/metadata digest and freshness evidence;
- Agent/Passport, Host/audience, organization, and tagged workspace binding;
- Install Grant/redemption reference;
- consent-envelope identity/digest;
- selection-algorithm identity;
- canonical negotiation-transcript digest under the future H-10 profile; and
- a safe warning/status showing draft/experimental use where applicable.

The result itself grants no authority. It becomes authoritative only when the
successful H-01 redemption commit stores it in the new active Connection.

### Determinism and failure rules

1. Identical canonical inputs must produce one identical selected release and
   transcript digest.
2. Any invalid or non-canonical release identifier rejects the containing offer
   or advertisement before unknown, unsupported, or compatibility processing.
3. Duplicates or conflicting records reject the containing metadata;
   implementations must not silently keep first, keep last, or de-duplicate.
4. A participant claiming support for a release must possess and identify all
   required trusted immutable release/artifact manifests for that release.
   Otherwise that participant's own offer/advertisement is invalid.
5. A canonical release unknown to the receiver but outside the exact supported
   intersection does not by itself invalidate negotiation.
6. Every exact intersecting candidate must resolve to trusted immutable
   manifests. An unresolved intersecting candidate is **unknown** and removed
   from eligibility. A known release not actually implemented or advertised by
   a participant is **unsupported** and cannot be a bilateral candidate.
7. If no exact candidate remains after unknown-candidate removal and all
   compatibility, security, withdrawal, profile, feature, authentication,
   artifact, freshness, consent-envelope, and other accepted filters,
   negotiation returns the stable no-compatible-release outcome.
8. No unknown release may be interpreted from epoch proximity, package
   defaults, current deployment behavior, latest/current pointers, or
   same-epoch assumptions.

Additional required rules:

- Under Option C, a stale, out-of-set, or lower unilateral
  `preferredVersion` makes that participant's metadata invalid.
- Under Option C, the final result is the greatest release in the exact
  bilateral intersection only after every bilateral eligibility filter. It may
  differ from either participant's valid local `preferredVersion`.
- No stable no-compatible-release outcome may fall back to a package default,
  “latest,” lowest, Agent-only preference, adjacent revision, or draft.
- A Client or Agent may not add candidates after human consent without a new
  preview and consent.
- An Agent may not select any arbitrary member of its supported list. It selects
  only the deterministic result.
- A Client must verify the returned result rather than trusting the Agent's
  selection.
- Preferred values and compatibility/security metadata must be internally
  consistent; inconsistency is invalid metadata, not a tie-breaking hint.
- Header, body, proof descriptor, object field, selection result, and durable
  Connection identities must match wherever more than one is present.
- Current discovery is revalidated at redemption only as H-01 requires. After
  activation it cannot update the Connection.
- Sorting compares canonical ASCII/numeric components exactly as the accepted
  option says. Locale-sensitive collation is prohibited.
- JavaScript object enumeration, `Set` iteration, incidental array order,
  stable-sort behavior, implementation package version, Platform preference,
  and deployment version are prohibited inputs.
- Mixed-version requests inside one active Connection fail. A future version
  transition requires an explicit Connection replacement/transition accepted
  under H-07.

## Anti-downgrade binding implications

### Binding chain

The selected release must be protected by one continuous, reviewable binding
chain:

```text
Client supported offer + preference/security floor
  + Agent supported advertisement + preference/security status
  + release/specification/schema/compatibility manifests
  + discovery or Connection Offer metadata digest
  + Agent + Passport
  + Host/audience + authenticated principal context
  + organization + tagged workspace absence/value
  + authentication profile
  + H-01 consent envelope
  + Install Grant redemption context
  + deterministic selection result
  -> canonical negotiation transcript digest
  -> atomic active Connection record
  -> every governed request and durable/historical object
```

This diagram is a decision-packet constraint, not a finalized schema or H-10
canonical byte definition.

### Detection

A conforming implementation must be able to detect:

- removal of a Client-offered supported release;
- insertion of an unoffered release;
- alteration of Agent-supported or preferred data;
- use of stale or differently digested discovery/metadata at redemption;
- substitution of release, specification, schema, compatibility declaration,
  status, or security-floor data;
- selection of a result other than the deterministic result;
- substitution across Agent, Passport, Host/audience, principal,
  organization, or workspace;
- changing workspace `absent` to empty/present or vice versa;
- authentication-profile downgrade;
- change outside the immutable consent envelope;
- header/body/proof/object/Connection mismatch;
- proof/digest algorithm or profile substitution;
- use of current package/deployment defaults after restart;
- use of a later schema or erratum to reinterpret an active Connection; and
- draft/final aliasing.

### Prevention and failure timing

- The Client verifies selection before accepting a redemption result.
- The Agent verifies the offer, metadata, consent, and deterministic result
  before the successful redemption commit.
- Version failure must not create a Task, consume an Approval, or begin an
  external side effect.
- Under accepted H-01, version failure occurs before Install Grant consumption
  unless a later accepted H-06 decision expressly defines a different safe
  transaction rule.
- The Connection stores the result and transcript durably. Later requests
  compare against that stored value before governed work.
- Current implementation constants may describe what a build supports, but they
  cannot override the stored selected release.
- A withdrawn release is ineligible for new Connections. H-14 decides whether
  withdrawal requires revocation, replacement, or other treatment of active
  Connections. Neither support metadata nor later active-Connection treatment
  may silently reinterpret historical bytes.
- Revocation takes precedence over any attempt to negotiate or resume a
  different release on the same Connection.

### Algorithm-confusion prevention

Protocol release identity does not identify canonicalization, digest, signature,
request-integrity, Trust, schema, or selection algorithms. Where those matter,
the Connection and signed/historical object must bind:

- protocol release identity;
- applicable specification/schema manifests;
- digest/canonicalization profile;
- signature/proof profile and permitted algorithm policy;
- selection-algorithm identity; and
- the canonical digest(s) created under those profiles.

H-10 will define exact bytes and algorithms. H-03 requires the identities and
bindings to exist; it does not choose H-10's cryptography.

## Historical-object version binding

The following table determines the minimum version-binding category for later
schema work without finalizing those schemas. “Own release” means an explicit
protocol-release field on the object. “Inherit” means a required, immutable
reference whose target supplies the release. “Artifact binding” means the
object or its immutable referenced context identifies the applicable
specification/schema bundle and canonical digest.

| Object/evidence | Current repository evidence | Proposed minimum after H-03 acceptance |
| --- | --- | --- |
| Install Grant issuance record | Internal grant has Agent and scope but no protocol release (`packages/ghostbridge-native-agent/src/index.js:442-471`) | May be unselected at issuance only with an explicit state; must constrain Agent/Passport/Host/scope and any permitted release policy. The successful redemption record must add the exact selected release, transcript/consent digest, and Connection reference atomically. No fabricated pre-redemption selection. |
| Install Grant resolution | Historical schema requires `protocolVersion` but no complete selection evidence (`protocol/schemas/0.1-draft/install-grant-resolution.schema.json:3-18`) | Own release/status context for the resolution message, plus Agent advertisement/release/artifact manifests and digest. Remains non-authoritative. |
| Connection Offer | Has one protocol constant and optional supported list (`protocol/schemas/0.1-draft/connection-offer.schema.json:3-12,31-39`) | Own message release, exact Agent-supported advertisement, release/artifact/compatibility references, Agent/Passport/Host/scope/freshness binding, and artifact/transcript-component digest. Still grants no authority. |
| Final Connection | Stored records omit release; projection inserts package constant (`packages/ghostbridge-native-agent/src/index.js:1608-1636,1745-1778,2088-2104`) | **Required own selected release**, release/spec/schema manifests and digests, negotiation transcript/consent, Agent/Passport, Host/audience, tenant scope with absence semantics, authentication profile, and later capability/profile result. It is the authoritative inheritance root. |
| Invocation | Historical schema carries release but not required Connection ID (`protocol/schemas/0.1-draft/invocation.schema.json:3-30`) | Own release plus required Connection reference. Release, header, proof descriptor, and Connection must be equal. Schema/artifact identity may inherit from Connection unless the Invocation is archived independently, in which case its evidence bundle must retain the reference. |
| Task | No protocol release; Connection ID optional (`protocol/schemas/0.1-draft/task.schema.json:3-19`) | Required Connection reference **and own release snapshot** for durable recovery/audit. Schema identity/digest or immutable bundle reference is required. Exact lifecycle details remain H-09. |
| Approval Challenge | No protocol release or Connection ID (`protocol/schemas/0.1-draft/approval-challenge.schema.json:3-21`) | Own release and required Connection reference. Exact approval-action digest must bind both under H-08/H-10. Schema identity/digest required for independent historical interpretation. |
| Approval Decision | References Challenge but has no protocol release/Connection (`protocol/schemas/0.1-draft/approval-decision.schema.json:3-18`) | Own release mirror plus immutable Challenge and action-digest references; all must resolve to the same Connection release. A Decision cannot authorize another release. |
| Execution Receipt | Optional Connection ID, no protocol release (`protocol/schemas/0.1-draft/execution-receipt.schema.json:3-12,34-42`) | **Required own release**, required Connection reference, specification/schema artifact identity/digest, and proof-profile identity. Must remain independently historically verifiable after Connection closure, revocation, or support end. |
| Passport | Carries protocol release, Passport version, supported releases, and optional Trust profile (`protocol/schemas/0.1-draft/passport.schema.json:3-31`) | Own Passport schema/release context plus canonical supported-release advertisement and Passport/manifest artifact digests. Passport version remains a distinct object version, never the selected Connection release. |
| Capability manifest | Carries protocol, Trust-profile, manifest, Passport, and capability versions (`protocol/schemas/0.1-draft/capability-manifest.schema.json:3-25`) | Own manifest schema/release context and canonical digest; supported/compatible protocol releases explicitly declared. Capability versions remain distinct from protocol release. |
| Revocation Set/document | Set carries protocol/Trust release, Status does not (`protocol/schemas/0.1-draft/revocation-set.schema.json:3-10`; `protocol/schemas/0.1-draft/revocation-status.schema.json:3-17`) | Each signed revocation artifact has its own schema/profile identities and digest. When it affects a Connection/object, the subject reference and applicable protocol release must be unambiguous. H-11 decides chain, time, and rollback semantics. |
| Trust evidence/result | Current Trust Result has category/evidence but no version identity (`protocol/schemas/0.1-draft/trust-result.schema.json:3-13`; `packages/ghostbridge-trust/src/index.js:1120-1129`) | Own Trust-evidence schema/profile identity and digest; reference the evaluated protocol release, subject artifact, policy revision, and evaluation/historical time as later H-10/H-11 require. Trust result does not become protocol authority. |
| Authorization decision | H-02 accepted a future structured decision; current wire schema is absent (`protocol/decisions/H-02-roles-trust-boundaries-and-authorization-floor.md:947-1011`) | Own authorization schema/profile identity and exact Connection-selected release binding, in addition to H-02's principal/Connection/scope/Agent/Passport/capability/action/policy/time bindings. Authorization and Approval remain distinct. |
| Conformance fixture/vector | Current fixtures are code/ad hoc; no immutable versioned data bundle (GB-051 at `docs/protocol/normative-specification-gap-analysis.md:121-124`) | Own exact protocol release, applicable requirement/schema/state-machine/vector IDs, artifact-manifest digest, and fixture-set digest. Package version is recorded only as IUT metadata. |
| Conformance result | Current result records the package protocol constant only (`packages/ghostbridge-conformance/src/index.js:169-178`) | Own claimed protocol release, profile/role/transport/features, suite/fixture/artifact digests, IUT implementation/package version, adapter version, environment digest, and result. These version classes remain separate. |
| Interoperability report | No standard report schema (GB-058 at `docs/protocol/normative-specification-gap-analysis.md:128-129`) | Record both implementation/SDK/build identities, exact selected protocol release and transcript/artifact digests, directions, roles, profiles, and retained safe evidence. |

Objects may use an immutable referenced evidence bundle to avoid repeating large
manifests, but a bare mutable URL, current index, package version, or deployment
lookup is insufficient. If an evidence bundle cannot be resolved, historical
verification returns an explicit indeterminate outcome rather than applying the
current release.

## Proposed `0.1-draft` historical treatment

### Classification

`ghostbridge/0.1-draft` is proposed to be classified as an **immutable legacy
historical draft label**, not a final protocol release and not an alias for the
next normative draft. Its repository artifacts are:

- `protocol/specification/0.1-draft/`; and
- `protocol/schemas/0.1-draft/`.

Their existing bytes and existing meaning remain historical. This classification
does not retroactively claim that every current object was negotiated correctly
or that the directory was an independently implementable normative release.

### Advertisement and production use

**Proposed rule:** after an accepted successor transition exists, a production
implementation claiming conformance to a final Ghost Bridge release must not
advertise or negotiate `ghostbridge/0.1-draft` on a final production profile.

A build may retain an explicitly enabled, isolated legacy/draft mode only when:

- both peers explicitly opt in to the exact historical label;
- the Host receives a conspicuous draft/legacy warning and consents;
- the Connection is labeled legacy/draft and cannot claim final conformance;
- no compatibility alias maps the draft to a final or successor release;
- current security policy does not withdraw the draft from new Connections;
- the implementation actually preserves the historical wire behavior it claims
  to support; and
- legacy operation cannot expand authority or weaken accepted H-01/H-02
  controls.

Whether any production deployment should be allowed to enable that isolated
mode requires human confirmation below. The recommendation is “disabled by
default; never part of a final-production conformance claim.”

### Historical objects and fixtures

- Existing fixtures and objects may continue to cite
  `ghostbridge/0.1-draft`.
- Existing schema `$id` values under `schemas/0.1-draft` remain their historical
  identities.
- A historical object that carries the label retains it. It is not rewritten to
  the Option A, B, or C syntax.
- A historical object lacking a protocol release or negotiation transcript must
  not be backfilled as though it carried one.
- A migration inventory may attach an external, append-only provenance
  classification such as `legacy_version_claim_present`,
  `legacy_version_inherited`, or `legacy_negotiation_indeterminate`. Such a
  classification must identify its evidence and must not modify the original
  object or claim proof that did not exist.
- Historical fixtures remain regression evidence for the historical
  implementation. They do not become normative fixtures for a successor
  release unless independently reviewed and republished under new IDs and
  manifests.

### Corrections and errata

The proposed errata layout is:

```text
protocol/specification/errata/
  entries/
    0.1-draft/
      <YYYY-MM-DD>-<erratum-id>.md
    <future-release-directory>/
      <YYYY-MM-DD>-<erratum-id>.md
  manifests/
    <errata-index-identity>.json
```

Each erratum must:

- identify the affected release, exact files, headings/requirement IDs where
  they exist, schemas/assets, and original artifact digests;
- state whether it is editorial clarification or normative/interoperable
  correction;
- explain security, compatibility, historical-object, and conformance impact;
- identify approver/date/governance reference;
- carry its own immutable artifact identity and digest; and
- be referenced by a new immutable errata-index snapshot with its own identity
  and digest, separate from the release manifest.

Every release has exactly one immutable release manifest. Its identity, digest,
specification digest, schema-bundle digest, original artifact digests, and
publication status never change.

An editorial erratum creates a new immutable erratum artifact and a new
append-only errata-index snapshot with a new identity and digest. It does
**not** change the release identity, release manifest or digest, specification
or schema bytes or digests, original artifact digests, active Connection
interpretation, or historical meaning. Reviewers may consult the overlay; an
implementation must not apply it as a silent runtime reinterpretation.

A correction that changes what valid peers must emit, accept, reject, authorize,
sign, verify, persist, or historically interpret is not merely editorial. It
creates a new protocol release identity, a new immutable release manifest, and
new versioned artifacts. It does not retroactively apply to existing
`0.1-draft` objects.

### Prohibitions

- Do not silently relabel `0.1-draft` as `1.0`, `e1.r0`, a final opaque node, or
  any successor.
- Do not edit historical draft/specification or schema bytes to match current
  implementation behavior.
- Do not infer missing negotiation evidence from the fact that only one package
  constant existed.
- Do not use passing tests to claim historical compatibility.
- Do not apply a successor schema, state machine, proof profile, or erratum as
  though an historical object selected it.
- Do not let a mutable “latest” or current-version index change historical
  meaning.

## Migration and historical-object impact

### Common migration rules

1. Inventory active and historical grants, offers, Connections, Invocations,
   Tasks, Approvals, Receipts, Passports, manifests, revocation documents,
   Trust/authorization evidence, fixtures, and results by the evidence they
   actually contain.
2. Preserve original bytes and identifiers. Record external migration metadata
   append-only with provenance.
3. Classify active legacy Connections with missing selection evidence as
   **legacy negotiation indeterminate** unless exact evidence proves otherwise.
4. Do not insert a successor release into an existing Connection. A successor
   release requires a new preview, consent, grant/redemption context, and new
   Connection, or a future explicitly accepted H-07 transition with equivalent
   authority safeguards.
5. Decide separately whether legacy active Connections may run to a bounded
   expiry, become read/historical-only, require replacement before governed
   work, or be revoked. That operational disposition requires human approval
   and later H-07/H-11/H-14 inputs.
6. Nonterminal Tasks remain interpreted under their originating Connection and
   release evidence. They are not upgraded in place. If evidence is
   insufficient, fail safely according to later H-09/H-11 migration rules.
7. Receipts remain immutable. Historical verification uses their original
   evidence and returns indeterminate when required evidence is absent; it never
   fabricates a successful successor-release verification.
8. Package, SDK, and Platform releases must expose supported protocol releases
   explicitly. Their package version changes do not migrate Connections.
9. Rolling deployments must keep handlers and artifacts required by active
   supported Connections, or explicitly drain/replace those Connections under
   accepted policy.
10. The current-version index is a non-normative pointer and may change only
    what new readers discover, not what old records mean.

### Option A migration impact

- New releases and directories need three numeric components; the recommended
  first candidate would need a separate human choice such as
  `ghostbridge/1.0.0-draft.1`.
- `ghostbridge/0.1-draft` remains a legacy grammar exception and cannot be
  normalized to `0.1.0-draft.1`.
- Implementations need strict SemVer parsing/ordering and must purge
  compatibility assumptions derived only from major/minor/patch.
- Release governance must audit every correction as patch/minor/major and
  document the compatibility effect.
- Existing package version `0.1.0-draft` must be presented as package metadata,
  not evidence that the protocol was already `ghostbridge/0.1.0-draft`.

### Option B migration impact

- The first successor release needs a newly generated and human-approved opaque
  ID plus a separate human label/directory policy.
- A compatibility graph, node/edge manifests, preference ranks, distribution,
  cache, signature/review, and failure policy are prerequisites to multi-release
  rollout.
- Historical `0.1-draft` remains a legacy non-node unless governance creates a
  clearly labeled archival node that references—but does not replace—the
  historical label. Such a node must not fabricate selection evidence.
- Operators and APIs need label-to-ID display support while keeping
  canonical decisions keyed only by ID.
- Rolling upgrade configuration must preserve exact graph and rank evidence used
  at consent/redemption.

### Option C migration impact

- The proposed successor identity and directory are
  `ghostbridge/e1.r0-draft.1` and `e1.r0-draft.1/`.
- `ghostbridge/0.1-draft` remains a legacy label outside the epoch grammar; it
  is not epoch 0 revision 1 or epoch 1 revision 0.
- Implementations need one small strict parser, registered stage order,
  explicit compatibility manifests, and durable selection fields.
- A later final `ghostbridge/e1.r0` is a new identity and artifacts; it cannot
  reuse draft manifests or silently “drop the suffix.”
- Breaking corrections during the epoch require an epoch increment, so release
  governance must review the compatibility-line promise carefully.

## Required normative-specification consequences

Following H-03 acceptance, a separately authorized normative-writing phase
must:

1. Create the human-approved immutable specification directory and a matching
   schema directory. It must not modify `0.1-draft`.
2. Create a non-normative `protocol/specification/index.md` that lists release
   identity, status, artifact manifests, supersession, support/security status,
   and errata without becoming a mutable source of semantics.
3. Define protocol release identity, human label, exact equality, ordering,
   compatibility, status, specification identity, schema identity, artifact
   digest, Connection selection, object historical version, package/SDK/build,
   and deployment version as separate terms.
4. Publish the exact accepted grammar, ASCII/case/whitespace/Unicode rules and,
   for Option C, the inclusive `0..2147483647` bound and canonical unsigned
   one-to-ten-digit ASCII decimal encoding for epoch, revision, and stage
   iteration. Require overflow rejection and exact numeric comparison after
   validation, together with the accepted invalid/unknown/unsupported
   classification, equality, ordering, duplicate handling, and tie-breaking.
5. Publish one requirement-numbered deterministic negotiation algorithm with
   exact canonical inputs, filtering order, result, warnings, and failure
   effects.
6. State that release ordering never by itself proves compatibility, safety,
   support, or conformance.
7. Define exactly one immutable release manifest per release, immutable
   specification and schema-bundle artifacts, separate compatibility and
   support-state records, and a separate append-only errata index whose every
   snapshot has a new identity and digest, including H-10 digest hooks.
8. Define supported/preferred advertisement and Client offer/Agent selection
   semantics under accepted H-01. Under Option C, each `preferredVersion` must
   equal the greatest member of that participant's own advertised set that is
   locally status- and security-eligible when the metadata is created; final
   selection is independently the greatest candidate remaining after exact
   bilateral intersection and every bilateral filter.
9. Define the negotiation transcript and all anti-downgrade bindings listed in
   this packet.
10. Define the Connection-selected release lifetime, later-request equality,
    restart/resumption behavior, and prohibition on fresh-discovery mutation.
11. Define historical-object own/inherited release and artifact bindings for
    every object class, referencing later decisions where schemas/states remain
    deferred.
12. Define draft/prerelease/final interoperability, production claims, warnings,
    opt-in, isolation, and supersession.
13. Define `0.1-draft` immutable legacy treatment and explicit errata without
    changing its bytes.
14. Define mixed-version rejection and require Connection replacement for
    version change unless later H-07 accepts a secure explicit transition.
15. Define extension scoping so H-13 cannot import later core meaning into an
    older selected release.
16. Give every requirement a stable ID and cite accepted H-01, H-02, and H-03
    as applicable.
17. Define the H-03 support-state boundary: exact advertised support,
    deprecated/withdrawn eligibility information, security filtering before
    order, withdrawn releases barred from new Connections, and immutable
    history. Leave publisher/signing authority, durations and support windows,
    notice and end-of-life process, withdrawal authority, emergency/rollback
    procedure, and active-Connection treatment to H-14.

The new text must distinguish:

- accepted H-01/H-02 protocol law;
- the H-03 option eventually approved by humans;
- historical `0.1-draft` prose;
- implementation evidence;
- non-normative guidance/examples; and
- details still deferred to H-04 through H-13 and H-14.

## Required schema consequences

No schema is created by this decision packet. After acceptance and dependent
decisions, canonical schemas must include or reference:

- a strict protocol release-identity type for the accepted option, including
  Option C's inclusive bounds of `0` through `2147483647` and canonical
  unsigned one-to-ten ASCII decimal digits for each numeric component;
- exactly one immutable release manifest per release and immutable
  specification/schema-bundle identities and digest descriptors;
- separate compatibility declarations, support-state records, erratum
  artifacts, and append-only errata-index snapshots, each with the appropriate
  immutable identity and digest;
- Agent supported/preferred release advertisement;
- Client version offer;
- deterministic selection result;
- negotiation transcript/evidence reference;
- final Connection with required selected release and anti-downgrade bindings;
- Install Grant/redemption fields that bind the selection at the H-01 commit;
- explicit tenant scope with tagged workspace absence/value semantics;
- protocol-release and Connection bindings for Invocation, Task, Approval
  Challenge, Approval Decision, Receipt, Passport, capability manifest,
  revocation, Trust evidence, and authorization evidence according to the
  historical-object table;
- schema identity/bundle release binding for every wire and durable object;
- version-aware error details that disclose only safe information;
- conformance fixture/result and interoperability report manifests with
  protocol, suite, asset, package, adapter, and deployment versions separated;
  and
- a legacy-evidence classification outside original historical object bytes.

Schema requirements must also enforce, where JSON Schema can express them:

- canonical length/pattern bounds, including rejection of signs, decimal
  points, exponent notation, whitespace, leading zeros except the single digit
  `0`, more than ten digits, and every value greater than `2147483647` under
  Option C;
- uniqueness;
- the requirement that every claimed supported release have a trusted immutable
  release/artifact-manifest reference;
- `preferredVersion` membership where representable and, in normative
  cross-field validation, equality to the greatest locally status- and
  security-eligible member of the participant's own advertised set at metadata
  creation;
- closed versus extensible boundaries only after H-13;
- no conflation of protocol release with `passportVersion`,
  `capabilityVersion`, Trust/profile version, package version, or schema
  version; and
- immutable `$id` values that do not point at mutable “latest” content.

Cross-field preferred-value derivation, exact bilateral intersection,
unknown-release resolution, eligibility filtering, selection, equality,
artifact-digest, scope, history, and state invariants cannot be delegated to
JSON Schema alone. The normative prose and state machines must state them
explicitly.

## Required state-machine consequences

H-03 does not finalize H-06/H-07/H-09/H-11 state machines. It requires those
future machines to preserve these version transitions and invariants:

### Pre-Connection negotiation lifecycle

```text
advertisement_observed
  -> offer_constructed
  -> previewed_and_consented
  -> redemption_revalidating
  -> selection_verified
  -> active_connection_committed
```

- The first five states/evidence grant no governed authority.
- Invalid/stale/unknown/unsupported/no-common/downgrade/artifact mismatch
  transitions to a failed pre-authority outcome.
- A material input change after consent transitions back to a new preview and
  consent, never forward to silent selection.
- `active_connection_committed` occurs only in the accepted H-01 atomic
  redemption/Connection commit.
- H-06 decides exact grant-consumption/retry transaction outcomes but cannot
  permit an unverified release result to become authoritative.

### Active Connection invariants

- `selectedProtocolRelease` and its artifact/transcript binding are immutable.
- Restart/resumption reloads the same values.
- Later request release must equal the Connection release.
- Fresh discovery/metadata may be used for current endpoint/Trust checks only as
  later decisions permit; it cannot update selected release semantics.
- A release change requires a new/replacement Connection or an explicit future
  transition approved by H-07 with new consent and equivalent anti-downgrade
  binding.
- Revocation, closure, expiry, or replacement cannot transition back to active
  merely through negotiation.

### Governed object transitions

- Version validation and binding precede Task creation, Approval consumption,
  state mutation, and external effects.
- Task/Approval/Receipt transitions retain the originating Connection release,
  including across restart, terminalization, retrieval, and historical
  verification.
- A stored object cannot transition from one release interpretation to another.
- An erratum/supersession/support change can update external governance
  metadata, not the object's original identity or state history.

## Required error-contract consequences

The exact public codes, HTTP statuses, safe details, precedence, and retry
classes remain for H-12. The normative contract must nevertheless distinguish
these trigger categories:

| Provisional semantic category | Required trigger/effect |
| --- | --- |
| Invalid version identifier | Non-canonical syntax, case, whitespace, Unicode, invalid stage, a sign, decimal point, exponent notation, leading zero, more than ten numeric digits, or a numeric component outside `0..2147483647`; reject the containing offer/advertisement before compatibility, without wrapping, clamping, rounding, or native-limit coercion |
| Duplicate version identifier | Repeated identity or conflicting duplicate record; reject the containing offer/advertisement |
| Invalid version advertisement | A participant claims support without possessing or identifying the trusted immutable release/artifact manifests, or its preferred/rank/member relationships are internally inconsistent; reject that participant's containing offer/advertisement |
| Unknown protocol release | A canonical release is unknown to the receiver: if outside the exact bilateral intersection it does not invalidate the advertisement; if intersecting, attempt trusted immutable manifest resolution and remove the candidate if it remains unresolved |
| Unsupported protocol release | Known release not implemented/advertised by the relevant participant |
| No common protocol release | No exact canonical release occurs in both valid advertised supported sets; report this diagnostic trigger through the stable no-compatible-release outcome |
| No compatible protocol release | No candidate remains after intersecting-unknown resolution and bilateral compatibility, security, withdrawal, profile, feature, authentication, artifact, freshness, consent-envelope, and other accepted eligibility filtering; return the stable no-compatible-release outcome |
| Draft release forbidden | Draft/prerelease lacks required opt-in, isolation, consent, or claim context |
| Protocol release withdrawn | Candidate is barred for new Connections by current approved security/governance status |
| Stale negotiation metadata | Discovery/offer/advertisement changed or expired before redemption |
| Version selection mismatch | Agent-returned or Client-expected result differs from deterministic result |
| Version downgrade blocked | Proposed result violates security floor, eligible-order rule, or immutable consent |
| Protocol version binding mismatch | Header/body/proof/object/Connection or Agent/Passport/Host/scope/authentication binding differs |
| Artifact identity/digest mismatch | Release, specification, schema, compatibility, errata, or transcript identity does not match its pinned digest |
| Mixed protocol release | One active Connection receives a request/object from another release |
| Historical version indeterminate | Required original release/artifact evidence is absent and cannot be safely reconstructed |
| Version transition required | Caller attempts in-place Connection release change where replacement is required |

Required failure properties:

- safe messages never echo attacker-controlled identifiers without bounded
  encoding/redaction;
- errors do not advertise a downgrade path that bypasses security/support
  policy;
- no-common and unsupported are not silently mapped to success;
- unknown does not become unsupported merely because the current package lacks
  it;
- a canonical unknown outside the bilateral intersection does not invalidate an
  otherwise valid participant advertisement;
- an unresolved intersecting unknown is removed, and if no candidate remains
  the result is the stable no-compatible outcome;
- no proximity, package-default, current, latest, same-epoch, or other fallback
  inference may replace an unknown or unsupported release;
- retryable metadata may be returned only where a fresh preview/redemption can
  safely succeed without reusing consumed authority;
- multi-fault precedence must preserve authentication, scope, revocation, and
  disclosure protections under H-02/H-12; and
- an error's own protocol-release field must describe the correct processing
  context or use an explicitly version-neutral pre-negotiation error envelope.
  It must not default to the current package constant.

## Required conformance cases

Future implementation-neutral cases must derive from accepted requirements and
must not import official version helpers. At minimum:

### Identifier and equality cases

1. Accept every canonical boundary form for the selected option. For Option C,
   independently exercise `0` and `2147483647` in epoch, revision, and stage
   iteration positions.
2. Under Option C, reject `2147483648`, other ten-digit values above
   `2147483647`, and all eleven-or-more-digit numeric components without wrap,
   clamp, round, or platform-native-limit behavior.
3. Under Option C, reject `+1`, `-1`, `1.0`, `1e0`, `01`, and numeric components
   with leading, trailing, or embedded whitespace in every numeric position.
4. Reject uppercase aliases where lowercase is canonical.
5. Reject non-ASCII, Unicode confusables, and normalization aliases.
6. Reject malformed prerelease/stage/opaque components.
7. Prove numeric order uses exact validated integer values, including the
   `2147483646`/`2147483647` boundary, and never floating-point comparison.
8. Prove byte-exact identity equality and inequality.
9. Prove package, SDK, Agent build, Client build, Trust profile, schema, and
   Platform deployment versions cannot substitute for protocol release.

### Ordering, preference, and compatibility cases

10. Reproduce the complete accepted option's order in at least two independent
    languages.
11. Permute Client and Agent array order and obtain the same result.
12. Insert duplicates and require stable rejection.
13. Accept an Option C advertisement whose `preferredVersion` equals the
    greatest member of that participant's own advertised set that is locally
    status- and security-eligible at metadata creation.
14. Reject a stale Option C `preferredVersion` after the participant's local
    eligibility metadata changes the greatest eligible member.
15. Reject an Option C participant's lower unilateral preference even when that
    release is locally eligible and advertised.
16. Reject an Option C `preferredVersion` that is not a member of the
    participant's own advertised supported set.
17. Select the greatest bilaterally eligible exact intersection member even
    when it differs from one or both valid local `preferredVersion` values.
18. Give the same final result for semantically identical inputs that differ
    only in Client and Agent supported-array order.
19. Exercise equal-order boundary conditions without relying on sort stability.
20. Prove higher/numerically newer does not bypass compatibility or withdrawal
    filters.
21. Prove explicit compatibility is directional and non-transitive by default.
22. Reject a participant's entire containing offer/advertisement when any
    identifier is invalid or non-canonical.
23. Reject a participant's advertisement when it claims support for a release
    but does not possess or identify the trusted immutable release/artifact
    manifests for that release.
24. Include a canonical receiver-unknown release outside the exact bilateral
    intersection and prove that it does not invalidate the advertisement or
    prevent another eligible common release from winning.
25. Include a canonical receiver-unknown release in the exact bilateral
    intersection, fail trusted manifest resolution, remove that candidate, and
    select another eligible common release.
26. Make every intersecting candidate unresolved or otherwise ineligible and
    require the stable no-compatible outcome without proximity, package,
    default, latest, current, or same-epoch inference.
27. Exercise a known release that a participant has not implemented or
    advertised as unsupported, distinct from unknown and invalid.
28. Exercise no exact overlap and overlap removed by bilateral filters as the
    distinct no-common and no-compatible outcomes.
29. Exercise stale, missing, conflicting, and digest-mismatched compatibility
    declarations.

### Deterministic selection and downgrade cases

30. Run identical canonical inputs against Client, Agent, and independent oracle
    and require one result.
31. Attempt Agent unilateral selection of another supported release.
32. Remove, add, or reorder candidates after preview.
33. Lower the Client or Agent security floor.
34. Select a withdrawn release that is otherwise the greatest
    common/preferred candidate and require it to be ineligible for a new
    Connection.
35. Substitute a draft for a final release and vice versa.
36. Attempt draft negotiation without unilateral opt-in, bilateral opt-in,
    consent, and isolation in turn.
37. Mutate discovery/metadata digest between preview and redemption.
38. Mutate Agent, Passport, Host/audience, principal, organization, workspace
    absent/value state, authentication profile, or consent digest one field at a
    time.
39. Mutate release/spec/schema/compatibility manifest identity or digest one
    field at a time.
40. Mutate selection-algorithm or H-10 proof/digest profile identity.
41. Prove every failure occurs before the H-01/H-06 commit point, Task creation,
    Approval consumption, and external side effects.

### Connection and request binding cases

42. Create a Connection and prove the exact result/transcript/artifacts persist.
43. Restart the Client and Agent independently and resume the same release.
44. Change package/SDK/deployment version across restart and prove no
    reinterpretation.
45. Change current discovery preferred/supported releases and prove an active
    Connection is unchanged.
46. Send header/body/proof/Connection release mismatches in every pairwise
    combination.
47. Send a later-release Invocation, Task action, Approval Decision, or Receipt
    reference on an earlier Connection.
48. Attempt per-message mixed versions and in-place Connection upgrade.
49. Revoke a Connection, renegotiate, and prove it does not revive.

### Historical-object and artifact cases

50. Validate own/inherited release binding for every object in the historical
    object table.
51. Remove each required historical evidence component and require a stable
    indeterminate/fail-closed result.
52. Verify an old Receipt after revision/epoch/major/node supersession.
53. Verify during package upgrade, key rotation, revocation, deprecation, and
    support-end timelines without changing original release meaning.
54. Substitute a current schema/specification manifest for the historical one.
55. Change a non-normative current-version index and prove historical results
    unchanged.
56. Publish an editorial erratum and prove the release identity, sole release
    manifest identity/digest, specification and schema bytes/digests, original
    artifact digests, active Connection interpretation, and historical meaning
    all remain unchanged.
57. Prove that publishing the editorial erratum creates a new immutable
    errata-index snapshot with a new identity and digest, separate from the
    release manifest.
58. Consult and omit the editorial overlay during historical review and prove
    neither path mutates the active Connection or original historical record.
59. Attempt a behavior-changing erratum without a new release, release manifest,
    and versioned artifacts and require a suite or
    governance error.
60. Prove conformance results separately record protocol, suite, fixtures,
    schemas, IUT package, adapter, and deployment versions.

### `0.1-draft` migration cases

61. Continue to parse/verify an object that explicitly carries the historical
    label under its pinned historical artifacts.
62. Do not relabel that object to the successor syntax.
63. Classify a legacy object with no version field as indeterminate rather than
    fabricating the package constant.
64. Reject `0.1-draft` in a final production negotiation by default.
65. Exercise the explicitly opted-in isolated legacy mode if humans permit it.
66. Prove a successor final implementation cannot claim final conformance from
    a draft/legacy transcript.

The compatibility suite must publish all supported Client/Agent release pairs
and retain safe transcript/artifact hashes as required by
`docs/protocol/conformance-architecture.md:192-203,251-262`.

## Security tradeoffs

### Option A

Option A benefits from mature parser/order implementations, but its familiar
numbers create the strongest risk that implementers will infer compatibility
or safety. Its security depends on making explicit manifest/security filtering
precede SemVer order and on rigorously policing patch/minor meaning. A mistaken
“same major” fallback can become a downgrade or verification bypass.

### Option B

Option B best prevents inference from the ID and can express precise,
directional security constraints. Its security cost is additional trusted
graph/rank/manifest distribution and availability. If implementers fall back
when that machinery is unavailable, the precision becomes a new downgrade
surface. Fail-closed graph operation must therefore be mandatory.

### Option C

Option C reduces parser and preference complexity while keeping explicit
security/compatibility declarations. Its principal security risk is an
incorrect assumption that same-epoch releases are automatically safe together.
The eligibility-before-order rule and a required epoch change for breaking
semantics are essential. Compared with B it has less mutable negotiation
metadata; compared with A it has fewer conventional but unsafe expectations.

## Compatibility tradeoffs

### Option A

SemVer is easiest for SDK consumers to recognize and can communicate release
cadence, but protocol compatibility will still need a separate matrix. The
extra patch category helps compatible fixes yet creates classification
disputes. Current `0.1-draft` does not conform to the grammar.

### Option B

The explicit graph gives the most accurate compatibility representation,
including parallel families and directionality. It also imposes the greatest
operational burden on small independent implementations and makes manual
configuration/debugging harder.

### Option C

Epoch/revision gives independent implementers a small total ordering plus
explicit compatibility evidence. It communicates breaking boundaries better
than opaque IDs and avoids patch/minor ambiguity, but it provides less familiar
release vocabulary than SemVer and requires strong governance of the epoch
promise.

## Historical recommendation

**HISTORICAL RECOMMENDATION — OPTION C SUBSEQUENTLY ACCEPTED**

The packet historically recommended **Option C — Protocol epoch and revision**,
with:

- canonical final syntax `ghostbridge/e<epoch>.r<revision>`;
- canonical non-final syntax
  `ghostbridge/e<epoch>.r<revision>-<stage>.<iteration>`;
- epoch, revision, and stage iteration each bounded to the inclusive range
  `0` through `2147483647` and encoded as canonical unsigned one-to-ten-digit
  ASCII decimal with exact comparison and overflow rejection;
- strict lowercase ASCII, no whitespace, no Unicode normalization, no aliases,
  and byte-exact equality;
- the registered stage order proposed in Option C;
- explicit directed compatibility declarations, never compatibility inferred
  from epoch/revision alone;
- one immutable release manifest per release, with immutable release,
  specification, schema-bundle, and original-artifact identities/digests, plus
  a separate append-only errata index whose every snapshot has a new identity
  and digest;
- `preferredVersion` as a redundant local consistency field equal to the
  greatest locally status- and security-eligible member of that participant's
  own advertised set, never a unilateral lower preference or final-selection
  override;
- exact supported-release intersection and eligibility filtering before
  canonical greatest-release selection;
- rejection of invalid containing advertisements and manifestless support
  claims; non-invalidating treatment of canonical unknowns outside the
  intersection; removal of unresolved intersecting unknowns; and rejection of
  duplicate, stale, withdrawn, digest-mismatched, mixed, and non-deterministic
  inputs, with a stable no-compatible outcome when no eligible candidate
  remains and no inferred fallback;
- the H-03/H-14 boundary in this packet: H-03 fixes exact advertised support,
  eligibility information, filtering order, no-new-Connection withdrawal
  effect, and immutable history, while H-14 retains support-governance and
  active-Connection-treatment decisions;
- full H-01 consent/redemption/Connection binding and the historical-object
  rules in this packet;
- `ghostbridge/0.1-draft` retained as an immutable legacy historical label; and
- proposed next draft identity `ghostbridge/e1.r0-draft.1`, with proposed
  directory component `e1.r0-draft.1`.

Lakshya Sharma (`lakshyasharma21103-crypto`) subsequently accepted the
identifier, directory, stage order, and qualifications on 2026-07-28. This
section preserves the recommendation and its reasoning as decision history;
the accepted decision and completed approval block are controlling.

## Reasons for the recommendation

1. A small epoch/revision grammar is straightforward to reproduce across Go,
   Python, Java, Rust, JavaScript, and other runtimes without importing the
   official implementation.
2. It supplies a deterministic preference order missing from Option B without
   importing full SemVer's patch/minor compatibility expectations.
3. Epoch is an explicit signal that breaking authority, wire, proof, or
   historical-meaning changes require a new compatibility line.
4. Revision gives operators useful chronology while the manifest requirement
   keeps chronology separate from compatibility and safety.
5. Eligibility-first selection directly addresses the current divergence
   between numeric/order-aware `negotiateVersion` and Host-order
   `checkCompatibility`.
6. It maps cleanly to H-01's single selected result committed at Connection
   creation and avoids Option B's preference-rank/graph selection machinery.
7. It makes every draft/final step an immutable identity, preventing silent
   promotion.
8. It provides a clear successor namespace without relabeling
   `ghostbridge/0.1-draft`.
9. It keeps package, SDK, schema, proof-profile, and Platform versions visibly
   separate.
10. It allows explicit compatibility and security withdrawal evidence without
    concluding that the numerically highest release is automatically safest.
11. It supports durable historical verification: the exact revision and
    artifact manifests remain pinned even when later revisions exist.
12. Its remaining risks—same-epoch assumption and unfamiliar notation—are
    narrower and more reviewable than Option A's pervasive SemVer assumptions
    or Option B's graph/rank operational burden.

## Rejected or discouraged approaches

The historical analysis rejected or strongly discouraged the following
approaches regardless of the option outcome:

- Treating the latest release as always compatible.
- Treating the numerically highest release as automatically safest.
- Treating Semantic Version ordering as wire compatibility.
- Treating a shared major or epoch as sufficient compatibility evidence.
- Treating graph reachability as transitive compatibility without an explicit
  reviewed declaration.
- Treating package.json, an SDK version, Agent/Client build, Trust package,
  Platform deployment, or schema directory as the protocol release.
- Letting the Agent choose any value in its own supported list.
- Letting either participant's incidental array order settle selection.
- Depending on JavaScript object enumeration, `Set` iteration, stable sorting,
  locale collation, or Platform preference.
- Silently de-duplicating conflicting version records.
- Trimming whitespace, case-folding, Unicode-normalizing, aliasing punctuation,
  or coercing non-canonical identifiers.
- Treating an unknown release as current, nearest, latest, or package-default.
- Falling back to a draft, older revision, lower version, or compatibility path
  after a security/manifest/graph failure.
- Recomputing or updating an active Connection from fresh discovery.
- Allowing a version header or body field to override the Connection.
- Allowing a package constant to override the Connection after restart.
- Permitting mixed-version requests within one active Connection.
- Allowing version renegotiation to revive a revoked Connection.
- Treating discovery or negotiation as authority.
- Treating authentication, Trust, authorization, or Approval as interchangeable
  with Connection authority under H-02.
- Treating direct Agent-to-Agent authority as permitted.
- Silently editing, reinterpreting, or relabeling historical `0.1-draft`
  artifacts.
- Fabricating missing historical negotiation/version evidence.
- Applying a successor schema or erratum retroactively to historical objects.
- Treating a mutable “latest/current” pointer as normative.
- Letting an editorial erratum change interoperable behavior under the same
  artifact/release identity.
- Treating passing current tests as settling H-03.
- Copying MCP version or authority semantics, adding an MCP dependency, or
  making Ghost Bridge an MCP wrapper.

## Review questions retained as decision history

The approval resolves Option C, its syntax, numeric bounds, stage order,
`preferredVersion`, deterministic selection, compatibility declarations,
immutable artifact and errata rules, historical `0.1-draft` treatment, the next
draft identity and directory, and the H-03/H-14 boundary. Questions assigned to
H-04 through H-14 remain deferred. No unresolved deferred question is silently
answered by H-03 acceptance.

1. Is Option C approved, or should Option A or Option B be selected?
2. If Option C is selected, is the exact
   `ghostbridge/e<epoch>.r<revision>[-<stage>.<iteration>]` syntax approved?
3. Are lowercase ASCII, rejection instead of normalization, no leading zeros,
   and byte-exact equality approved?
4. Is the registered stage set and order
   `experimental < draft < alpha < beta < rc < final` approved?
5. Are the proposed inclusive bounds of 0 through 2147483647 for epoch,
   revision, and stage iteration approved, together with the canonical
   unsigned ASCII decimal encoding and overflow-rejection rules?
6. Is `ghostbridge/e1.r0-draft.1` approved as the next draft identity?
7. Is `e1.r0-draft.1` approved as the matching specification and schema
   directory component?
8. Is preferredVersion approved as a redundant consistency field equal to the
   greatest locally status-eligible and locally security-eligible release in
   that participant's own advertised set, while the final selected release is
   independently calculated from the greatest bilaterally eligible exact
   candidate?
9. Are explicit directed, non-transitive compatibility declarations required
   even within one epoch?
10. Is the proposed H-03 boundary approved: H-03 defines exact advertised
    support, deprecated/withdrawn eligibility information, security filtering
    before ordering, withdrawn releases as ineligible for new Connections, and
    the prohibition on rewriting history?
11. Is it confirmed that H-14, not H-03, will decide publisher/signing
    authority, durations and support windows, notice and end-of-life process,
    withdrawal authority, emergency/rollback procedure, and treatment of active
    Connections?
12. Is it confirmed that H-03's no-new-Connection effect for withdrawal neither
    revokes nor preserves an active Connection by itself, leaving that
    operational decision to H-14 without changing historical meaning?
13. Is the proposed “final implementations reject drafts by default” rule
    approved?
14. May a production deployment expose explicitly opted-in isolated
    `0.1-draft` legacy mode, or must production implementations never advertise
    it after a successor exists?
15. Is `0.1-draft` approved as a legacy historical label outside the new
    grammar, with no alias to a successor?
16. Is the proposed errata rule approved: each release has exactly one immutable
    release manifest; editorial errata create immutable entries and new,
    separately identified/digested append-only errata-index snapshots without
    changing release/manifest/specification/schema/original-artifact identity or
    digest, active Connection interpretation, or historical meaning; and every
    behavior-changing correction requires a new release and new artifacts?
17. Which object classes must mirror their own protocol release in addition to
    inheriting it from Connection? This packet recommends own release fields for
    Tasks, Approval Challenges/Decisions, and Receipts.
18. Is a required own release and artifact binding on Receipts approved so they
    remain independently historically verifiable?
19. May legacy active Connections with incomplete negotiation evidence continue
    governed work, or must they become historical/read-only, expire, be revoked,
    or be replaced?
20. Who approves the migration disposition for nonterminal legacy Tasks and
    pending Approvals?
21. Is append-only external classification of legacy evidence acceptable,
    provided it never mutates or backfills original objects?
22. Is a canonical negotiation-transcript digest required at redemption, with
    exact bytes/algorithm deferred to H-10?
23. Must release, specification, schema bundle, compatibility declaration,
    selection algorithm, canonicalization/digest profile, and proof profile all
    be independently identified on the durable binding?
24. Does no-common/incompatible version failure always precede grant consumption
    as H-01 recommends, subject only to an explicitly accepted H-06 rule?
25. Is Connection replacement the only permitted release change, or may H-07
    later design an explicit in-place transition with new consent and equivalent
    anti-downgrade guarantees?
26. Who is the accountable human approver for H-03?

## Approval block

Human approval is recorded as follows:

- **Approver:** Lakshya Sharma (`lakshyasharma21103-crypto`)
- **Approval date:** 2026-07-28
- **Approved option:** Option C — Protocol epoch and revision
- **Approved canonical syntax:** final
  `ghostbridge/e<epoch>.r<revision>` and non-final
  `ghostbridge/e<epoch>.r<revision>-<stage>.<iteration>`
- **Approved numeric bounds/encoding/comparison:** epoch, revision, and stage
  iteration each use the inclusive range `0` through `2147483647`, canonical
  unsigned one-to-ten-digit ASCII decimal encoding, rejection of
  non-canonical forms and overflow without wrapping, clamping, coercion, or
  rounding, and exact numeric comparison after canonical validation
- **Approved preferredVersion semantics:** local redundant consistency field;
  final bilateral eligibility remains independent
- **Approved invalid/unknown/unsupported handling:** the deterministic rules
  recorded in the accepted decision
- **Approved immutable release-manifest/errata-index model:** one immutable
  release manifest and a separate append-only errata index
- **Approved H-03/H-14 support-state boundary:** as recorded in the accepted
  decision
- **Approved next draft identity/directory:**
  `ghostbridge/e1.r0-draft.1` and `e1.r0-draft.1`
- **Approved qualifications:** all security, compatibility, historical,
  deterministic-selection, anti-downgrade, immutable-consent, and durable
  Connection qualifications recorded in H-03
- **Accepted risks:** all Option C residual risks, including:
  - implementers may incorrectly infer compatibility from a shared epoch;
  - exact stage ordering must be reproduced across languages;
  - immutable manifests and compatibility evidence create governance and
    operational burden;
  - epoch/revision terminology is less familiar than SemVer;
  - a breaking security correction may require an earlier-than-expected epoch
    change; and
  - current implementations require migration away from package constants and
    incomplete Connection version records.
- **Compatibility impact:**
  - exact release identities replace package-version assumptions;
  - same-epoch revisions are not automatically compatible;
  - explicit directed compatibility declarations and exact release
    advertisement are required;
  - active Connections remain pinned to their original release and artifacts;
  - `0.1-draft` remains historical and is not aliased to the new draft; and
  - the new draft identifier authorizes later normative drafting but is not a
    final release.
- **Security impact:**
  - eligibility-before-ordering and deterministic recomputation prevent
    unilateral selection and silent downgrade;
  - immutable consent, transcript, artifact, and durable Connection bindings
    prevent package, header, or discovery substitution;
  - discovery and negotiation grant no authority;
  - version failures occur before governed effects and applicable commit
    points;
  - historical verification remains tied to original immutable artifacts; and
  - revocation cannot be reversed through renegotiation.
- **Historical/migration disposition:**
  - preserve all `0.1-draft` artifacts and original objects unchanged;
  - do not fabricate missing evidence;
  - classify legacy evidence only through append-only external records; and
  - active legacy Connection and nonterminal-work treatment remains separately
    deferred.
- **Resulting status:** `ACCEPTED`
- **Approval reference:** Exact human approval statement supplied by Lakshya
  Sharma on 2026-07-28 and reproduced verbatim in this decision record; the
  repository commit and pull-request history will provide the durable
  version-control reference

### Verbatim human approval statement

I, Lakshya Sharma (`lakshyasharma21103-crypto`), approve H-03 Option C —
Protocol epoch and revision — on 2026-07-28, with all qualifications,
security constraints, compatibility rules, historical-object rules,
anti-downgrade bindings, immutable-manifest rules, errata-index rules,
numeric bounds, deterministic negotiation rules, H-03/H-14 boundary, and
migration consequences recorded in the H-03 decision packet.

I approve the canonical protocol release syntax:

- final: ghostbridge/e<epoch>.r<revision>
- non-final: ghostbridge/e<epoch>.r<revision>-<stage>.<iteration>

I approve the inclusive numeric range 0 through 2147483647 independently
for epoch, revision, and stage iteration, with canonical unsigned ASCII
decimal encoding and overflow rejection.

I approve the registered stage order:

experimental < draft < alpha < beta < rc < final

I approve `preferredVersion` as a redundant local consistency field and
approve final selection as the greatest bilaterally eligible exact release
only after all eligibility filters.

I approve explicit directed, non-transitive compatibility declarations.
Neither a shared epoch nor numeric ordering automatically establishes
compatibility or safety.

I approve one immutable release manifest per release, immutable
specification/schema/artifact identities and digests, and a separate
append-only errata index that cannot mutate Connection-selected semantics
or historical-object meaning.

I approve `ghostbridge/0.1-draft` as an immutable legacy historical label
that must not be relabeled, rewritten, or fabricated as having missing
negotiation evidence.

I approve `ghostbridge/e1.r0-draft.1` as the next proposed normative draft
release identity and `e1.r0-draft.1` as its versioned specification and
schema directory component. This approval does not make it a final release
or claim Protocol 1.0 conformance.

I accept the residual risks recorded in H-03, including the risk that
implementers may incorrectly infer compatibility from a shared epoch, the
need for exact cross-language stage ordering, and the governance burden of
immutable manifests and compatibility evidence.

H-04 through H-14 remain deferred and are not silently decided by this
approval.

## Consequences of acceptance

Acceptance authorizes only the selected H-03 protocol-governance rules. It does
not publish a normative release, change runtime behavior, create a schema or
state machine, or authorize implementation or deployment work.

1. This record and the decision register now record the human disposition,
   approved option and qualifications, risks, compatibility and security
   impact, date, and approval reference.
2. The accepted identity, ordering, history, and binding rules inform H-04
   through H-14 without deciding their deferred details.
3. Creating the approved versioned specification and schema directories
   requires a separately authorized normative-writing phase.
4. `protocol/specification/0.1-draft/` and
   `protocol/schemas/0.1-draft/` remain unchanged.
5. A separately authorized phase may create the non-normative current-version
   index, exactly one immutable release manifest per release, immutable
   versioned artifacts, separate compatibility and support-state records, and
   the append-only separately identified and digested errata-index mechanism.
6. Future normative work must write stable requirement-numbered version,
   compatibility, anti-downgrade, history, security, and conformance rules
   citing accepted H-01, H-02, and H-03.
7. Canonical schemas and state-machine hooks may be designed only after their
   dependent decisions are accepted and the work is separately authorized.
8. Portable permutation, downgrade, artifact, restart, legacy, historical,
   malicious-peer, and interoperability fixtures may be derived only in
   separately authorized work.
9. Existing durable and historical objects may be inventoried and classified
   without mutation or invented evidence.
10. Legacy active-Connection and nonterminal-work migration and
    support/security policy still require separate human approval.
11. SDK, runtime, and Platform changes require a separately authorized
    implementation phase.
12. Official TypeScript packages and Platform remain implementations, never the
    normative or expected-result oracle.

No `GB-*` gap is closed merely by H-03 acceptance. Gap closure requires
separately approved normative requirements, schemas and state machines,
fixtures and vectors, independent conformance cases, migration evidence, and
interoperability results.

H-01, H-02, and H-03 are `ACCEPTED`. H-01 and H-02 remain unchanged. H-04
through H-14 remain deferred.
