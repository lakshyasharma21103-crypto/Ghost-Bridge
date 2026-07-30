# H-04 — Capability, profile, and optional-feature negotiation

## Title

Capability, profile, and optional-feature negotiation

## Decision ID

`H-04`

## Status

**ACCEPTED**

Option C — Layered monotonic intersection, Baseline Alternative 3 —
Role-scoped Core facets, Binding Alternative 3 — Hybrid essential result plus
immutable evidence, and Failure Alternative 2 — Classified
capability-scoped failure were approved by rudra on 2026-07-30.

All qualifications in the approval block control. The rejected alternatives,
comparative analysis, repository evidence, threats, residual risks, migration
analysis, and deferred-decision boundaries remain immutable decision history.

This acceptance does not create normative requirements, authorize schemas or
runtime changes, close any GB gap, publish a release, or claim Protocol 1.0
conformance.

## Date prepared

2026-07-30

## Scope

This record documents the deterministic relationship humans selected among:

1. the exact bilateral release candidates and final greatest-eligible-release
   selection controlled by H-03;
2. discovery-level feature advertisements;
3. profiles and profile-conformance claims;
4. Host-required, Host-optional, and Host-preferred items;
5. Agent and Passport declarations;
6. authentication-mode identifiers;
7. required and optional extensions;
8. experimental features;
9. exact capability contracts and per-capability feature fields;
10. Connection Offer restrictions;
11. the immutable human-consented subset;
12. stricter deployment policy;
13. the final negotiated set; and
14. the capability authority sealed into the durable Connection.

The human review also considered the candidate mandatory baseline for a future
Protocol 1.0, failure granularity, downgrade treatment, and minimum semantic
Connection binding. The accepted bundle selects Baseline Alternative 3,
Failure Alternative 2, Option C's downgrade and renegotiation treatment, and
Binding Alternative 3. This acceptance does not establish, publish, or claim
Protocol 1.0.

Compatibility and authority remain separate. A compatible item is only
eligible for selection. An enabled and consented item becomes usable only
inside the active Connection and remains subject to authentication, Trust,
structured authorization, deployment policy, and exact-action Approval where
applicable under accepted H-01 and H-02.

## Out of scope

This accepted H-04 decision does not:

- write normative protocol requirements;
- create a negotiation request, result, transcript, schema, registry, state
  machine, fixture, vector, conformance case, SDK behavior, or runtime behavior;
- alter H-01, H-02, or H-03;
- define credential establishment, bearer semantics, OAuth, mutual TLS,
  signed-request proofs, token storage, refresh, or revocation;
- decide Install Grant replay, retry, concurrency, expiry, or commit behavior;
- complete the Connection, Approval, Task, or revocation lifecycle;
- select canonical bytes, digest/signature algorithms, or cryptographic domain
  labels;
- select HTTP routes, statuses, exact error codes, error precedence, limits,
  timeouts, or logging fields;
- decide schema openness, unknown-field forwarding, extension namespace
  ownership, canonical extension data, schema evolution, or experiment
  graduation;
- decide registry publication authority, support windows, deprecation
  timelines, release signing, or Protocol 1.0 graduation authority;
- make current JavaScript, JSON Schema, tests, examples, TypeScript
  declarations, package constants, or Platform behavior normative; or
- adopt MCP capability, profile, authority, Trust, lifecycle, transport,
  package, or SDK semantics.

## Accepted-decision dependencies

### H-01 — lifecycle and authority initialization

H-01 is `ACCEPTED` and controlling. Discovery and preview are
non-authoritative. Negotiation becomes authoritative only in the successful
Install Grant redemption and durable Connection-creation commit. The final
selection must remain within the immutable preview and consent envelope;
material change requires a new preview and new human consent. Restart resumes
the durable Connection and fresh discovery cannot silently renegotiate it
(`protocol/decisions/H-01-lifecycle-initialization-and-ordering.md:714-753`).

### H-02 — roles, authority, and intersection

H-02 is `ACCEPTED` and controlling. The active scoped Connection is the durable
authority source. Its bounds include Agent and Passport identity, principal,
Host or audience, organization, workspace, authentication, capabilities, and
accepted constraints. Authentication, Connection authority, authorization,
Platform policy, Trust, and Approval remain separate. Effective authority is
an intersection, never a union. Policy may narrow but not widen the Connection,
the Agent remains the mandatory final authorization-floor enforcement point,
and one Agent does not receive another Agent's authority
(`protocol/decisions/H-02-roles-trust-boundaries-and-authorization-floor.md:893-1011`).

### H-03 — release eligibility and durable release identity

H-03 is `ACCEPTED` and controlling. Exact release identity, release ordering,
and compatibility are separate. H-03 alone retains exact release ordering and
the final greatest-remaining-candidate selection. H-04 does not choose a
release independently of H-03; it supplies release-scoped profile, feature,
authentication-identifier, extension, capability, mandatory-baseline, and
registry eligibility predicates for each exact bilateral candidate. Only
after those predicates and all accepted H-03 predicates have removed
ineligible candidates does H-03 select the greatest remaining exact release.
H-04 then produces the complete negotiated set under that selected release.

Array order, SDK/package defaults, Platform defaults, and deployment versions
are not release negotiation inputs. Compatibility is explicit, directed, and
non-transitive. There is no silent fallback. Profiles and features cannot be
evaluated using one release and then bound under another. The algorithm cannot
select a release and later discover that its required profile or capability
set is incompatible, and it cannot rerun release ordering after consent or
Connection creation. The exact selected release and relevant evidence bind to
consent and the durable Connection, active Connections are not reinterpreted
from fresh discovery, and historical objects retain their original meaning
(`protocol/decisions/H-03-protocol-version-identity-and-history.md:149-291,
1511-1634`).

H-04 eligibility is evaluated independently for each exact release candidate
because profile, feature, capability, extension, authentication-identifier,
and registry semantics may differ by release. H-04 may not substitute an
adjacent release, treat same-release peers as feature-compatible without
evidence, or apply one release's semantic evidence to another.

## Deferred-decision boundaries

| Decision | Boundary preserved by this packet |
| --- | --- |
| H-05 | H-04 records the accepted rule that the Host explicitly selects one identifier from the exact common eligible authentication-mode set and binds it through preview, consent, and Connection. H-05 retains credential establishment, proof, expiry, refresh, storage, revocation, concrete mode semantics, and exact authentication errors. |
| H-06 | H-04 may require compatibility validation before the accepted H-01 authority commit. H-06 retains lost-response, replay, concurrency, expiry, retry, and exact grant-consumption outcomes. |
| H-07 | H-04 may identify immutable negotiated contents. H-07 retains the full Connection state machine, replacement, recovery, and exact persistence transitions. |
| H-08 | H-04 may treat `approvalRequirement` as a capability restriction. H-08 retains Approval action bytes, lifecycle, eligibility, consumption, and replay behavior. |
| H-09 | H-04 may select Task/cancellation/Receipt availability. H-09 retains Task states, races, cancellation guarantees, result model, terminality, and retention. |
| H-10 | H-04 may require immutable references or future digests. H-10 retains canonical bytes, digest/signature algorithms, encodings, and domain labels. |
| H-11 | H-04 may preserve Trust/revocation eligibility as a separate gate. H-11 retains freshness, anti-rollback, rotation, and historical Trust verification. |
| H-12 | H-04 may define semantic outcomes and stable reason categories. H-12 retains exact public error codes, HTTP routes/statuses, error precedence, transport mapping, sizes, timeouts, and logging fields. |
| H-13 | H-04 may decide required/optional extension compatibility and experiment opt-in. H-13 retains object openness, unknown fields, namespace ownership, forwarding, canonical extension data, schema evolution, and graduation/removal governance. |
| H-14 | H-04 may state baseline alternatives and how published support states affect eligibility. H-14 retains registry/publication ownership, support windows, deprecation timelines, release signing, withdrawal authority, independent-evidence gates, and Protocol 1.0 graduation. |

Where an algorithm below encounters a deferred question, it records a
dependency rather than inventing the answer.

## Affected GB gap IDs

Primary:

- `GB-006` — capability negotiation has no precedence or Connection binding;
- `GB-011` — no public final Connection schema records selected authority;
- `GB-042` — extension and unknown-field behavior is contradictory;
- `GB-046` — experimental opt-in and isolation are incomplete;
- `GB-054` — the required independent-implementation profile is undefined;
  and
- `GB-060` — the mandatory 1.0 baseline and graduation evidence are undefined.

The primary audit evidence is
`docs/protocol/normative-specification-gap-analysis.md:52,60,108,112,125,131`.

Closely coupled but deferred in whole or part:
`GB-005`, `GB-007`, `GB-010`, `GB-012`, `GB-013`, `GB-017`, `GB-025`,
`GB-034`, `GB-036`, `GB-040`, `GB-043`, `GB-044`, `GB-045`, `GB-047`,
`GB-055`, `GB-057`, and `GB-058`.

H-04 alone would not resolve or close any of those gaps. Even the primary gaps
remain open until accepted decisions are expressed as traced normative
requirements and later executable assets.

## Affected Phase work items

Primary Phase work items:

- `D1-02` — discovery, version/capability/profile negotiation,
  compatibility, extensions, and evolution;
- `D1-03` — durable Connection authority and installation constraints;
- `D2-01` — canonical schemas for negotiation and Connection data;
- `D2-04` — malicious, failure, profile, feature, and compatibility fixtures;
- `P1-01` — the mandatory profile implemented independently;
- `P1-02` — bidirectional profile/feature interoperability; and
- `P1-05` — the 1.0 graduation evidence checklist.

The Phase plan maps these dependencies at
`docs/protocol/phase-15d-plan.md:83-87,109-115,147-153,202-220`.
Acceptance informs those items; it does not authorize or complete them.

## Terminology and concepts that must remain separate

| Term | Meaning in this packet | Not an alias for |
| --- | --- | --- |
| Advertised | A participant states an item in bounded metadata. | Verified support, selection, consent, or authority |
| Source-owned field | A release-scoped immutable registry or manifest identifies a declaration that a particular source is required or permitted to carry. | A field every source must repeat |
| Identity-authorized ceiling | The maximum exact identities, claims, contracts, and restrictions established by the applicable Passport or immutable capability manifest. | Current deployment availability or Connection authority |
| Supported | The implementation genuinely implements the named item for the claimed role/release and can identify required evidence. | Enabled for a Connection |
| Eligible | The item survives release, status, compatibility, security, and policy preconditions for possible selection. | Selected or authorized |
| Required | Absence prevents the requesting scope from succeeding. | Preferred or automatically enabled |
| Optional | Absence may be tolerated under an explicit omission/limitation rule. | Ignored without evidence |
| Preferred | A deterministic tie-break preference among already eligible optional choices. | A requirement or array position |
| Selected | The negotiation algorithm chose the item. | Enabled, consented, or authorized |
| Enabled | The item is recorded as available within the created Connection. | Current permission to execute an action |
| Consented | The human-approved immutable subset includes the item and its material restrictions. | Authentication or authorization |
| Authorized | Current Connection, principal, scope, Trust, authorization, policy, and Approval gates permit a particular operation. | Profile support or consent alone |
| Unavailable | The item was not eligible or not selected in this negotiation context. | Globally unsupported forever |
| Incompatible | A required condition cannot be satisfied for the relevant scope. | Invalid syntax or authorization denial |
| Deprecated | A valid published support state warning that remains subject to H-14 eligibility policy. | Withdrawn or invalid |
| Experimental | A non-final, explicitly isolated feature status. | Bilateral opt-in |
| Withdrawn | Published support/security state makes an item unavailable for the affected new selection, subject to H-14 authority. | Deleted history |
| Disabled | A supported or selected item is deliberately not enabled in this Connection or is blocked for current use. | Unsupported |
| Limitation | Explicit evidence that an optional item was omitted or narrowed. | Authority to use the omitted item |
| Absent | A declaration is not present. Its meaning is determined by the release-scoped source rule: invalid if required, no claim if optional, and never an implementation default. | Explicit `false`, unsupported, disabled, or excluded |
| Profile invariant | A registered property that every exact claim of that release, role, and facet must satisfy. | A capability-local preference |
| Capability-narrowable property | A registered profile property that may be restricted for one exact capability and version. | Permission to expand a profile or global claim |

Further distinctions:

- A profile identifier names an interoperability claim; it is not a
  capability key, permission, authorization grant, or delegation.
- A conformance level is a registered claim set, not an integer whose greatest
  suffix automatically wins.
- A global feature advertisement is coarse availability evidence; a
  capability contract describes exact behavior only for that capability.
- A global feature value of `true` is a coarse ceiling, not enablement. A
  global `false` prohibits capability-level expansion.
- A capability contract is not an Agent-wide declaration and cannot create
  global support.
- Discovery describes the current deployment subset; it never overrides or
  expands the applicable Passport/manifest identity-authorized ceiling.
- Absence is evaluated according to field ownership. Only semantically
  overlapping claims are intersected.
- A Connection Offer is installation-attempt evidence and restrictions, not
  the final Connection.
- Human consent limits what may be installed; it does not prove the Agent
  supports the item or authorize every later use.

## Existing Ghost Bridge evidence

All observations here are historical prose, schema, implementation, test,
example, or Platform evidence. None is normative for H-04.

### Historical prose

- Historical profiles call Core universally required, define C1 through C3,
  state that Governed Execution includes Core, define G1 through G3, and leave
  Agent Coordination experimental/deferred
  (`protocol/specification/0.1-draft/profiles.md:3-36`;
  `protocol/specification/0.1-draft/conformance.md:3-35`).
- Historical extension prose says an unsupported required extension is
  incompatible, an unavailable optional extension yields limitations, and no
  extension may weaken Core, Governed Execution, tenant, revocation,
  capability, Approval, or bounds
  (`protocol/specification/0.1-draft/extensions.md:3-14`).
- Historical discovery exposes global features and extension namespaces but
  does not relate them to capability fields
  (`protocol/specification/0.1-draft/discovery.md:3-10`).
- Historical installation prose describes a secret-free Offer and atomic
  Connection creation without a negotiated-result object
  (`protocol/specification/0.1-draft/connection.md:3-10`;
  `protocol/specification/0.1-draft/install-grant.md:3-11`).

### Historical schemas

- Discovery requires `tasks`, `approvals`, `delegation`, `receipts`, and
  `revocation` booleans plus optional profiles and extension namespace strings
  (`protocol/schemas/0.1-draft/discovery.schema.json:7-33`).
- Profile declarations have three fixed object keys, but `profileSupport`
  does not require its own `id`; conformance accepts individual `C`, `G`, or
  `A` level strings without expressing level implication
  (`protocol/schemas/0.1-draft/common.schema.json:16-46`).
- Capability contracts separately require idempotency, asynchronous,
  cancellation, Approval, delegation, timeout, Receipt, status, and extension
  fields (`protocol/schemas/0.1-draft/capability.schema.json:7-40`).
- Passport carries capabilities, profiles, `receiptSupport`, extension
  declaration strings, authentication declaration strings, and supported
  protocol versions
  (`protocol/schemas/0.1-draft/passport.schema.json:7-35`).
- Connection Offer can carry authentication identifiers, supported protocol
  and Trust profiles, `allowedCapabilitySet`, and string restrictions, but it
  has no profiles, feature result, selected extensions, exact capability
  versions, or final Connection semantics
  (`protocol/schemas/0.1-draft/connection-offer.schema.json:7-41`).
- Extension declarations distinguish required/optional and lifecycle status,
  but cap profile references at three; the runtime permits ten
  (`protocol/schemas/0.1-draft/extension.schema.json:7-39`;
  `packages/ghostbridge-protocol-core/src/index.js:368-386`).

### Protocol-core behavior and declarations

- Defaults claim full Core and Governed Execution levels while declaring Agent
  Coordination unsupported/deferred
  (`packages/ghostbridge-protocol-core/src/index.js:11-44`).
- `validateProfileDeclarations` accepts missing profiles, silently
  de-duplicates and sorts levels, permits non-contiguous level sets, and does
  not express that C3 includes C1/C2 or G3 includes G1/G2
  (`packages/ghostbridge-protocol-core/src/index.js:399-450`).
- Compatibility chooses Agent profiles from `discovery.profiles` before
  `passport.profiles`, rather than comparing both. It similarly chooses
  discovery versions before Passport versions
  (`packages/ghostbridge-protocol-core/src/index.js:476-497`).
- Required Core means the Agent advertises all of C1, C2, and C3; required
  Governed Execution means all of G1, G2, and G3. An optional Host default
  Governed claim becomes a limitation when absent
  (`packages/ghostbridge-protocol-core/src/index.js:498-519`).
- Authentication selection uses an explicit Host preferred value when common,
  otherwise the first common value in Host array order
  (`packages/ghostbridge-protocol-core/src/index.js:453-474`).
- Compatibility checks only global required Tasks and Receipts; it does not
  evaluate individual capability contracts, `allowedCapabilitySet`,
  restrictions, Approval, cancellation, idempotency, or exact capability
  versions (`packages/ghostbridge-protocol-core/src/index.js:476-575`).
- Extension negotiation expects declaration arrays at non-schema
  `connectionOffer.extensions` or `passport.extensions`, while schemas expose
  `extensionNamespaces` and `extensionDeclarations`. It compares exact
  extension version strings and reports optional omission
  (`packages/ghostbridge-protocol-core/src/index.js:539-546,681-755`).
- Installation preview projects profile results and selected authentication,
  but capability projection omits async, cancellation, idempotency, Receipt
  requirement, exact restrictions, and most extension meaning
  (`packages/ghostbridge-protocol-core/src/index.js:596-655`).
- The public `InstallationPreview` TypeScript declaration describes `scope`,
  top-level `profiles`, and extension arrays, while runtime returns
  `requestedScope`, profiles inside `compatibility`, and an extension result
  object
  (`packages/ghostbridge-native-client/src/index.d.ts:119-127`;
  `packages/ghostbridge-protocol-core/src/index.js:607-650`).

### Native Client and Agent behavior

- Host configuration supplies supported releases, profile declarations,
  authentication arrays, extensions, required profiles, and only two governed
  feature requirements (`tasks` and `receipts`)
  (`packages/ghostbridge-native-client/src/index.js:121-143`;
  `packages/ghostbridge-native-client/src/index.d.ts:64-70`).
- Preview uses the compatibility helper and caches a local result. Redemption
  sends authentication mode and approved capability keys but not the full
  profile/feature/extension result or immutable consent evidence
  (`packages/ghostbridge-native-client/src/index.js:510-739`).
- The Client accepts only a package-constant response version and stores the
  response in memory; later Invocation construction uses the package constant
  (`packages/ghostbridge-native-client/src/index.js:695-805`).
- Agent discovery always advertises global Tasks, Approvals, Receipts, and
  revocation and full default Core/Governed profiles, independently of the
  registered capability set
  (`packages/ghostbridge-native-agent/src/index.js:304-354`).
- Capability contracts derive async/cancellation/Approval/Receipt fields from
  each definition. The default Receipt value is `standard`, which is not one of
  the schema's `none|optional|required` values; runtime validation does not
  validate those enums
  (`packages/ghostbridge-native-agent/src/index.js:1960-1990`;
  `protocol/schemas/0.1-draft/capability.schema.json:18-38`).
- Signed Connection Offers can include `allowedCapabilitySet`, but redemption
  ultimately enforces internal grant allowed keys and Host-approved keys
  rather than a canonical cross-source negotiated object
  (`packages/ghostbridge-native-agent/src/index.js:478-524,1551-1862`).
- Stored Connections contain enabled/disabled capability keys but no exact
  capability versions, selected profiles/levels, global features, selected
  extensions, experimental opt-ins, full restrictions, or negotiation
  transcript. The public projection inserts the current package release
  (`packages/ghostbridge-native-agent/src/index.js:1608-1636,1745-1778,
  2088-2104`).
- Invocation enforces the active Connection's enabled capability key and the
  live capability contract version, so a deployment change can alter what the
  same stored key means unless later durable binding is added
  (`packages/ghostbridge-native-agent/src/index.js:587-705`).

### Tests, examples, and Platform

- Core tests prove only the current full-profile defaults, first-common
  authentication choice, optional extension omission, and three coarse
  compatibility statuses. They do not exercise cross-source conflicts or the
  global/per-capability Cartesian set
  (`packages/ghostbridge-protocol-core/test/core.test.js:174-286`).
- The Agent test expects Agent Coordination to be omitted while global
  delegation is false, demonstrating one implementation choice rather than a
  profile rule
  (`packages/ghostbridge-native-agent/test/agent.test.js:153-171`).
- The Client/Agent happy path gives every capability async, cancellation, and
  required Receipt support and therefore does not exercise contradictions
  (`packages/ghostbridge-native-client/test/client.test.js:13-150`).
- FlowDesk defaults to full Host profile declarations but requires only Core;
  OpsCanvas requires Core, Governed Execution, Tasks, and Receipts. This is
  useful product evidence for optional versus required Host intent
  (`protocol/examples/flowdesk-host/src/index.js:13-30`;
  `protocol/examples/governed-host-agent/opscanvas-host.js:13-26`).
- LedgerWorks advertises full profiles and global features while its
  per-capability contracts carry exact Approval, idempotency, cancellation,
  and Receipt properties
  (`protocol/examples/governed-host-agent/ledgerworks-provider.js:70-187`).
- Platform seals approved capability keys and rechecks exact Platform policy
  and current Passport/Trust, but it does not seal a complete H-04 result.
  Platform policy is stricter deployment evidence, not protocol law
  (`backend/src/services/platformNativeClient.service.js:472-624,
  1012-1132,1249-1353`).

## Contradictions and ambiguities found

1. Historical prose calls Core universally required, while schema and runtime
   allow it to be absent or `supported:false`; current compatibility supplies a
   default false Core only when both discovery and Passport omit profiles.
2. C1/C2/C3 and G1/G2/G3 read as cumulative levels in prose, but schema/runtime
   represent unordered sets and accept `C3` without `C1` or `C2`.
3. Runtime compatibility interprets required Core as all C1-C3 and Governed as
   all G1-G3; no source explains whether a Host may require a lower level.
4. Discovery profiles override Passport profiles by truthiness. A disagreement
   is neither rejected nor intersected.
5. Discovery protocol releases similarly override Passport release claims,
   although H-03 requires consistent, evidence-backed exact support.
6. Global feature booleans have no defined relationship to capability async,
   cancellation, Approval, idempotency, delegation, or Receipt fields.
7. Agent discovery advertises Tasks, Approvals, and Receipts globally even when
   a particular capability can declare them unavailable.
8. `receiptSupport` on Passport, `features.receipts` in discovery, and
   `receiptRequirement` per capability can disagree without a rule.
9. Extension negotiation reads declaration arrays from properties absent from
   the relevant schemas and ignores the schema-defined namespace/declaration
   fields.
10. Extension profile-count bounds differ between schema and runtime.
11. Authentication choice depends on Host array order when no explicit
    preferred mode wins; the array's semantic role is undocumented.
12. `requiredGovernedFeatures` supports only Tasks and Receipts, while other
    global features and capability flags cannot be expressed as Host
    requirements through that interface.
13. A default Host Governed profile claim can create
    `compatible_with_limitations` even when the Host required only Core,
    conflating support with preference.
14. Connection Offer restrictions and `allowedCapabilitySet` do not participate
    in one compatibility algorithm.
15. Human consent selects capability keys, not exact versions, feature
    restrictions, profiles, extensions, experiments, or relevant manifest
    identities.
16. The durable Connection omits the negotiated evidence needed to survive
    deployment, SDK, default, or capability-contract change without
    reinterpretation.
17. Profile, extension, capability, discovery, Passport, and Connection Offer
    status vocabularies differ; `deprecated`, `removed`, `revoked`,
    `suspended`, `deferred`, and `experimental` have no shared eligibility
    semantics.
18. The runtime can produce a per-capability Receipt default that the historical
    schema rejects, demonstrating that neither artifact can be treated as the
    negotiation oracle.
19. Type declarations and runtime preview shape disagree, so a TypeScript
    consumer cannot infer the intended binding from the public type alone.

## External comparison boundary

The only external comparison evidence is the supplied observation in
`docs/protocol/phase-15d0-reference-register.md:11-23`: explicit capability
exchange and later respect for the result are useful protocol-engineering
practices. It does not supply Ghost Bridge profile names, capability taxonomy,
authentication identifiers, extension semantics, authority, Trust, lifecycle,
or package design.

No external repository was accessed for this packet. No MCP profile,
capability, authority, transport, lifecycle, Trust, SDK, or registry behavior
is proposed as Ghost Bridge law. Ghost Bridge remains independently
implementable and is not an MCP wrapper, extension, dependency, or
compatibility layer.

## Decision questions

The human review considered the following grouped questions. The accepted
bundle and approved qualifications record their H-04 disposition; questions
assigned to later decisions remain deferred.

### A. Negotiation inputs

1. Are discovery and Passport support claims intersecting ceilings, or does one
   override the other?
2. Does a Connection Offer only narrow those ceilings?
3. Which Host fields are requirements, optional interests, or deterministic
   preferences?
4. Can a capability contract narrow global/profile support, and can it ever
   expand it?
5. Does a schema validate representation only, or may schema presence prove
   support?
6. Does a cross-source conflict invalidate the Agent advertisement, exclude an
   affected capability, or reject the whole Connection?
7. May any post-consent input widen the selected set? Every serious option in
   this packet answers no because H-01 and H-02 already prohibit that outcome.

### B. Precedence

The review considered whether protocol release, profiles, levels, features,
authentication identifiers, extensions, capabilities, consent, Connection
restrictions, and policy:

- override one another;
- intersect as ceilings;
- serve distinct semantic roles;
- invalidate the affected scope when contradictory; or
- narrow but never widen earlier eligible support.

### C. Profiles

The review considered:

- whether a Core profile is mandatory and for which roles;
- whether historical C1-C3 and G1-G3 are retained, replaced, or rejected;
- whether Governed Execution is globally optional but mandatory for any
  implementation claiming governed operations;
- whether Agent Coordination is excluded from the mandatory baseline;
- whether a profile implies named features only through a reviewed immutable
  profile definition;
- whether capability contracts may narrow but never expand a profile; and
- when a profile claim is false or internally inconsistent.

### D. Global features and per-capability fields

The review considered behavior for:

- global `tasks:true` with `asynchronousSupport:false`;
- global `receipts:true` with `receiptRequirement:none`;
- durable-execution profile claims with `idempotencySupport:none`;
- global cancellation with a capability's `cancellationSupport:false`;
- capability-required Approval with global Approvals omitted; and
- a capability requiring an extension absent from Agent extension metadata.

The alternatives below distinguish coarse availability, capability-local
authority, narrowing, expansion, affected-capability exclusion, and
security-critical invalidity.

### E. Authentication-mode identifiers

H-04 can decide whether an exact common eligible identifier is required and
where selection occurs. It cannot define how the selected mode establishes or
maintains credentials. The accepted decision answers the selection question by
requiring one explicit Host-selected identifier from the exact common eligible
set, with independent Agent verification and no ranking, array-order,
substitution, or fallback behavior.

### F. Extensions and experimental features

The review considered required versus optional compatibility, unknown required
behavior, recorded omission, default-off experiments, bilateral opt-in,
consent, Core-authority isolation, and whether enabling an experiment requires
a replacement Connection.

Namespace ownership, schema openness, forwarding, canonical extension data,
graduation, removal, and schema evolution remain deferred.

### G. Mandatory 1.0 baseline

The review compared the baseline alternatives below for Host, Agent,
Trust-verification, Core-only, Governed Execution, and optional-profile claims.
No alternative itself declares Protocol 1.0.

### H. Negotiated-result binding

The review considered the direct versus referenced semantic contents of the
future result and durable Connection, including release, profiles, levels,
authentication identifier, features, exact capabilities/versions,
restrictions, extensions, omissions, experiments, requirements,
advertisements, consent, Offer restrictions, immutable manifests, future
digests, status, and reasons.

### I. Downgrade and renegotiation

The review considered how the selected option reports required-item removal,
lower conformance, omitted extensions, similar-item substitution, deployment
change, policy change, migration, restart, and SDK/package default change while
preserving H-01's new-preview/new-consent rule and no automatic widening.

### J. Failure granularity

The review compared whole-negotiation failure, affected-capability
exclusion, explicit limitation, optional omission, experiment-disabled, and
invalid-advertisement outcomes. H-04 can select semantic categories and scope;
H-12 retains exact codes, statuses, details, and transport precedence.

## Required invariants shared by every viable option

These are viability constraints inherited from accepted H-01 through H-03 and
remain controlling in accepted Option C. Their original inclusion did not
itself approve any H-04 algorithm:

1. Each participant's canonical exact release advertisements are validated
   under H-03 and used to form the exact bilateral candidate intersection.
2. H-03 and H-04 eligibility is evaluated independently for each exact
   candidate using that release's immutable semantic and registry evidence.
3. H-03 retains exact release ordering and selects the greatest remaining
   candidate only after all required H-03 and H-04 eligibility predicates have
   removed ineligible candidates.
4. The complete H-04 result is produced under that one selected release.
   Profiles or features evaluated under one release cannot be bound under
   another, and ordering is not rerun after consent or Connection creation.
5. Discovery, Passport, profile, capability, extension, preview, and
   negotiation evidence grants no governed authority by itself.
6. Successful H-01 redemption and durable Connection creation is the only
   point at which the selected set becomes Connection authority.
7. A result stays within verified Agent/Passport support, current discovery,
   Host requirements, Offer/grant bounds, immutable human consent, tenant
   scope, and stricter policy. No union of these inputs can create authority.
8. Source ownership and absence meanings come from immutable release-scoped
   registry or manifest evidence. Only semantically overlapping claims are
   intersected; an omitted value is never replaced by an implementation
   default.
9. A later source may narrow or reject. It may not silently add a profile,
   feature, capability, extension, authentication mode, experiment, scope, or
   permission absent from an applicable earlier ceiling.
10. Array order, object enumeration, SDK defaults, TypeScript constants,
    package versions, Platform defaults, deployment versions, or mutable
    current pointers cannot settle selection.
11. An exact capability key is not substitutable for a similar key, and one
    capability version is not substitutable for another.
12. Unknown is not supported. Optional omission is explicit and recorded.
13. A limitation is evidence of absence/narrowing, never authority.
14. A capability can narrow a profile property only when immutable
    release-scoped evidence classifies that property as
    capability-narrowable. Unclassified properties are invariant and fail
    closed; no capability may expand a profile or global claim.
15. The Host explicitly selects one common eligible authentication-mode
    identifier. There is no ranking input, first-common choice, array-order
    choice, substitution, or weaker-mode fallback.
16. Material change after preview or consent requires a new preview and new
    human consent before a new or replacement Connection.
17. Restart uses durable Connection state. Fresh discovery cannot widen,
    narrow, or reinterpret an active Connection.
18. Deployment policy may deny or narrow current use but cannot add authority
    or rewrite the immutable negotiated result.
19. Authentication, compatibility, Connection authority, authorization,
    Trust, policy, and exact-action Approval remain distinct.
20. Direct Agent-to-Agent authority and inherited authority between connected
    Agents remain prohibited.
21. Invalid or security-critical contradictory evidence fails before authority
    creation, Task creation, Approval consumption, and external side effects.
22. Identical canonical inputs must permit independent implementations to
    reproduce one semantic result without official JavaScript or Platform code.

## Option A — Profile-dominant bundles

Profiles and conformance levels are the principal interoperability bundles.
The selected profile definition supplies most global features and expected
capability properties. Individual capability contracts choose operations
inside the bundle but are subordinate to its defined semantics.

### Candidate input and precedence model

1. Form the H-03 exact bilateral release candidate set.
2. For each candidate, validate advertisements and the required profile bundle
   and level using only that release's immutable evidence.
3. Derive required global features, authentication classes, extension classes,
   and capability constraints from the profile definition.
4. Treat per-capability fields as confirmations or permitted narrow
   exceptions defined by that profile.
5. Remove candidates that cannot satisfy the bundle and required capability
   predicates; H-03 selects the greatest remaining exact release.
6. Apply Host requirements, Offer/grant restrictions, consent, and policy as
   narrowing filters.
7. Reject a capability or advertisement whose fields contradict a
   non-narrowable profile property.

### Benefits

- Compact advertisements and Connections.
- A dependable, easily communicated common baseline when profile definitions
  are precise.
- Smaller test matrix for simple Core implementations.
- Profile-level interoperability claims are easy to display and audit.

### Costs and risks

- One bundle can overstate support across diverse capabilities.
- Profile identifiers can be mistaken for capability or authorization grants.
- Coarse levels invite “highest level wins” logic and silent inference.
- Every profile revision becomes a wide compatibility event.
- Independent implementations must implement the entire bundle even when they
  need a small capability subset.
- Exceptions either weaken the bundle or create complex hidden subprofiles.
- A false profile claim can grant apparent support far beyond verified
  capability behavior.

### Contradiction handling

Option A would need a registry to mark each profile property as invariant or
capability-narrowable. A contradiction against an invariant would invalidate
the advertisement. A permitted narrow exception would remove or restrict only
the capability and record a limitation. Without that registry, Option A is not
deterministic.

### Security and evolution assessment

This option has the highest risk of coarse or overstated authority. It is
secure only if profile claims are verified, cannot directly authorize use, and
the durable Connection still records exact enabled capabilities and
restrictions. Adding one feature to a widely used profile risks breaking peers
or encouraging silent partial conformance.

## Option B — Capability-dominant negotiation

Profiles are descriptive labels or computed convenience groupings.
Compatibility is determined primarily from exact capability contracts,
feature requirements, extensions, and authentication eligibility.

### Candidate input and precedence model

1. Form the H-03 exact bilateral release candidate set.
2. For each candidate, validate exact authentication and required extension
   eligibility using only that release's immutable evidence.
3. Intersect exact capability keys and versions across Passport/manifest,
   deployment advertisement, Offer/grant, and Host request.
4. Evaluate every capability's idempotency, async, cancellation, Approval,
   Receipt, data, limits, and extension requirements.
5. Remove candidates that cannot satisfy all required capability predicates;
   H-03 selects the greatest remaining exact release.
6. Apply consent and policy.
7. Compute descriptive profile claims from the selected capabilities rather
   than using profiles to grant eligibility.

### Benefits

- Fine-grained least authority and accurate per-capability behavior.
- Diverse capabilities can evolve independently.
- Optional unsupported capabilities can be excluded without losing an entire
  otherwise useful Connection.
- Exact capability versions and restrictions are visible in the durable
  result.

### Costs and risks

- Large negotiation inputs, results, and conformance matrices.
- Capability explosion and inconsistent cross-capability semantics.
- No dependable common baseline unless a separate mandatory core is retained.
- Cross-language implementers must evaluate many fine-grained fields and
  interactions.
- Equivalent behaviors may use different capability keys and remain
  incompatible; “similar” substitution cannot be safe.
- Capability contracts could accidentally redefine global lifecycle or
  security behavior.

### Contradiction handling

Option B naturally excludes the affected optional capability. A contradiction
in shared identity, baseline, authentication, global required extension, or
security evidence still rejects the whole negotiation. A required capability
failure rejects the Connection. Profiles become invalid only if the computed
selected set cannot justify the label.

### Security and evolution assessment

This option gives the finest authority boundary but the greatest validation
surface. It reduces profile overclaim while increasing the risk that one
capability quietly omits a cross-cutting security property. A small immutable
Core floor would still be necessary to avoid “capabilities all the way down.”

## Option C — Layered monotonic intersection

Protocol release, mandatory baseline, required profiles, authentication
eligibility, extensions, global features, exact capability contracts,
per-capability restrictions, Host intent, Offer restrictions, human consent,
and policy have distinct semantic roles.

Later layers may validate, filter, narrow, reject, or record an explicit
limitation. They may not silently widen support or authority established by an
earlier required layer.

Profiles establish interoperable baselines. Global features establish coarse
deployment availability. Capability contracts establish exact
capability-local behavior. Per-capability fields may narrow a broader claim
but cannot manufacture support absent from a required broader advertisement.

### Candidate input and precedence model

1. Validate each participant's canonical exact release advertisements under
   H-03.
2. Form the exact bilateral candidate intersection.
3. For each exact candidate release independently, resolve its immutable
   release-scoped profile, feature, authentication-identifier, extension,
   capability, and registry evidence.
4. Apply all accepted H-03 security, support, withdrawal, artifact, and
   freshness eligibility.
5. Apply the H-04 profile, feature, authentication-identifier, extension,
   capability, and mandatory-baseline eligibility rules to that exact release
   candidate.
6. Remove any candidate that cannot satisfy all required eligibility rules.
7. H-03 selects the greatest remaining exact eligible release.
8. Produce the complete H-04 negotiated set under that selected exact release.
9. Apply Offer/grant restrictions, immutable human consent, and policy as
   narrowing-only layers.
10. Bind the complete result during the H-01 redemption and durable
    Connection-creation commit.

H-04 does not choose a release independently of H-03. H-03 retains exact
release ordering and final greatest-candidate selection. H-04 supplies
release-scoped eligibility predicates and the final
profile/feature/capability result. Profiles and features cannot be evaluated
using one release and then bound under another. The algorithm cannot select a
release and later discover that its required profile or capability set is
incompatible, must not rerun ordering after consent or Connection creation,
and must evaluate H-04 eligibility separately for each exact release candidate
because profile and capability semantics may differ by release.

### Advertisement source ownership and absence semantics

The accepted decision adopts these semantic rules:

1. A release-scoped immutable registry or manifest defines which fields and
   declarations each source is required or permitted to carry.
2. Passport or its immutable capability manifest defines the
   identity-authorized maximum ceiling for:

   - Agent identity;
   - exact capability keys and versions;
   - profile claims;
   - extension claims where applicable;
   - authentication-mode identifiers where applicable;
   - immutable capability-contract references; and
   - declared authority and safety restrictions.

3. Discovery defines the current deployment's available subset and
   operational availability. It cannot add an identity, profile, capability,
   extension, or authentication identifier absent from the applicable
   Passport/manifest ceiling.
4. A Connection Offer and Install Grant context define a
   transaction-specific subset and restrictions. They can only narrow verified
   Passport/manifest and current-discovery support.
5. Host metadata defines required items, optional interests, one explicit
   selection where required, and preferences only among already eligible
   choices.
6. Human consent defines the immutable subset permitted for installation.
7. Deployment policy can deny or narrow. It cannot manufacture support or
   widen consent or Connection authority.
8. Only semantically overlapping claims are intersected. A source is not
   treated as denying a field it is not required or permitted to carry.
9. Absence has no universal meaning:

   - absence of a source-required declaration makes that source's metadata
     invalid;
   - absence of an optional declaration means no claim was made;
   - explicit `false`, unsupported, disabled, or excluded values narrow
     eligibility; and
   - an omitted value must not be replaced by an implementation default.

10. When two authoritative sources make contradictory claims about the same
    exact item and semantic dimension:

    - identity, release, profile-invariant, authentication, global extension,
      tenant, consent, or shared-security contradictions invalidate the
      containing metadata or whole negotiation;
    - a contradiction confined to one optional capability may exclude only
      that capability if it does not falsify a broader profile or global
      claim; and
    - if that capability is Host-required, the Connection is incompatible.

11. Discovery never overrides Passport. Passport never overrides current
    discovery availability. Offer/grant never widens either. The relationship
    is field-owned, release-scoped, and monotonic.

### Profile invariants and capability-local narrowing

1. Every release-scoped profile/facet definition classifies each included
   property as either `invariant` or `capability-narrowable`. These are
   semantic categories only; this packet creates no wire identifiers or
   schemas.
2. A capability may narrow a property only when the applicable profile/facet
   definition explicitly permits capability-local narrowing.
3. An unclassified profile property is treated as invariant and fails closed.
4. A capability can never expand a profile or global feature claim.
5. A capability-local contradiction against an invariant makes that exact
   capability inconsistent with the claimed profile.
6. If the contradiction demonstrates that the participant's profile claim is
   false globally, the containing profile advertisement is invalid rather than
   merely excluding one capability.
7. Global feature-to-profile mappings come from immutable release-scoped
   registry evidence, never SDK constants or Platform defaults.
8. A global feature value of `true` is a coarse ceiling, not enablement.
9. A global feature value of `false` prohibits capability-level expansion of
   that feature.
10. Capability fields describe only that exact capability and exact version.

### Authentication-identifier selection

1. The Host supplies one explicit selected authentication-mode identifier from
   the exact common eligible set.
2. Local Host software or policy may recommend that identifier, but local
   ranking logic is not a protocol negotiation input and does not bind the
   Agent until the exact identifier is placed in the preview/consent context.
3. The Agent independently verifies that the selected identifier is in its
   exact eligible advertisement for the selected release and Connection
   context.
4. The exact identifier is included in the immutable preview, consent
   envelope, and durable Connection.
5. If the selected identifier is not common and eligible, negotiation fails.
6. There is no first-common fallback, array-order selection, nearest-mode
   substitution, or automatic weaker-mode fallback.
7. H-05 retains credential establishment, proof, audience, expiry, refresh,
   storage, revocation, and security semantics.

### Experiments and optional extensions

1. An experimental feature may be included in the same Connection at initial
   creation only when:

   - both participants support the exact experiment for the selected release;
   - the Host explicitly requests it;
   - the human explicitly consents to it;
   - it is recorded separately from Core and Governed baseline authority;
   - it cannot weaken or redefine Core, tenant, Trust, revocation, consent,
     capability, or authorization semantics; and
   - its exact capability and extension dependencies are bound.

2. A separate Connection for experiments is permitted as a stricter deployment
   choice but is not universally required by H-04.
3. Adding, removing, or materially changing an experiment after Connection
   creation requires a new preview, new consent, and a new or replacement
   Connection.
4. An extension is genuinely optional only when omitting it preserves the
   complete required base capability semantics, including input meaning,
   output meaning, side-effect meaning, authority requirements, security
   requirements, error interpretation, and historical interpretation.
5. If omission changes any required semantic property, the extension is
   required for that capability and cannot be treated as optional.
6. Optional omission is recorded.
7. Exact namespace ownership, extension encoding, forwarding,
   canonicalization, graduation, and removal remain H-13/H-14.

### Benefits

- Each source has one reviewable role and conflicts are not resolved by
  accidental precedence.
- Monotonic narrowing best preserves H-01 consent and H-02 intersection.
- Global discovery remains compact while capability authority remains exact.
- Required failures and optional omission can have explicit scopes.
- Independent implementations can reproduce the result from canonical sets and
  registries without copying TypeScript.
- Profiles remain useful without becoming broad authorization grants.
- New optional capabilities and extensions can evolve without redefining Core.

### Costs and risks

- More layers, validation states, reason categories, and binding evidence than
  Option A.
- A registry must define which profile properties may be narrowed.
- Failure granularity can be implemented inconsistently unless selected here
  and later tested exhaustively.
- The exact Host-selected authentication identifier must be carried through
  preview, consent, and Connection without local-ranking substitution.
- The durable Connection and consent envelope become richer.
- Incorrectly classifying a contradiction as a harmless limitation can still
  weaken security.

### Contradiction handling

Identity, authenticity, release, required Core, globally false profile
invariant, selected authentication, required global extension, tenant, consent,
Offer/grant widening, evidence, and shared-security contradictions invalidate
the containing metadata or whole negotiation. One exact optional capability is
excluded only if every Failure Alternative 2 condition is satisfied. A
Host-required conflict makes the Connection incompatible. Optional
unavailability is recorded; experiments remain disabled without complete
opt-in. Internally contradictory metadata is never treated as compatible with
limitations.

### Security and evolution assessment

Option C most directly models H-02 effective authority as intersection and
H-01 consent as an immutable ceiling. It is less coarse than A and retains a
stronger baseline than B. Its security depends on precise future
classification of global versus capability-local invariants and on a
fail-closed invalid-advertisement path. Per-release evaluation prevents a
participant from presenting eligible profile/capability evidence for one
release and binding it under another release selected by H-03.

## Comparative decision matrix

| Criterion | Option A — profile dominant | Option B — capability dominant | Option C — layered intersection |
| --- | --- | --- | --- |
| Determinism | High only with complete bundle/exception registry | High with exact capability registries | High with explicit layer roles and canonical sets |
| Connection authority precision | Medium | Highest | High |
| Common baseline | Strongest | Weak unless separately added | Strong and explicit |
| Profile-overclaim risk | Highest | Lowest | Controlled |
| Capability explosion | Low | Highest | Medium |
| Global/per-capability clarity | Subordinate capability fields | Global claims mostly descriptive | Global ceiling plus local narrowing |
| Optional omission | Bundle-specific and potentially coarse | Natural per capability | Explicit per item/scope |
| Security-critical contradiction | Whole advertisement likely invalid | Shared gate or affected capability | Shared gate invalid; scoped contradiction excluded |
| Independent implementation burden | Low initially; high as bundles grow | Highest | Medium |
| Conformance feasibility | Small matrix but false confidence risk | Very large Cartesian matrix | Layered matrices plus focused cross-products |
| Evolution | Profile revisions have broad blast radius | Fine-grained but fragmented | Optional layers evolve within fixed Core rules |
| H-01 consent binding | Compact but possibly overstated | Exact but large | Exact hybrid binding |
| H-02 intersection fit | Weakest unless exact capabilities are still recorded | Strong | Strongest conceptual match |
| H-03 preservation | Possible with per-candidate bundles | Possible with per-candidate contracts | Explicit per-candidate H-04 eligibility; H-03 final greatest-candidate selection |
| Main compatibility tradeoff | Simplicity versus coarse bundles | Flexibility versus no shared floor | Layer clarity versus algorithm complexity |
| Main security tradeoff | Overclaim/downgrade risk | Omission/cross-cutting inconsistency | Misclassification/failure-granularity risk |

## Mandatory/optional 1.0 baseline alternatives

No row states an approved 1.0 requirement.

### Baseline Alternative 1 — Historical maximal levels

Retain C1-C3 and G1-G3 as cumulative levels. Require Host and Agent roles to
implement Core C3 for any 1.0 claim. Governed implementations additionally
implement G3. Trust-verification implementations claim the applicable C1/G3
verification portions.

Benefits: close to historical language and current defaults. Costs: C3 and G3
mix role responsibilities, create a large minimum, and preserve ambiguous
level implication. This alternative risks treating current JavaScript defaults
as law.

### Baseline Alternative 2 — Minimal Core plus optional execution

Retain a small Core profile for discovery, identity, release negotiation,
installation, Connection creation, stable errors, and safe unsupported
behavior. Task, Receipt, Approval, durable execution, and Trust features become
optional profiles/capabilities.

Benefits: lowest entry barrier and clear Core-only implementations. Costs: two
“Core 1.0” peers might create a Connection with little useful common behavior;
production safety claims become fragmented.

### Baseline Alternative 3 — Role-scoped Core facets

This accepted alternative selects the following semantic role baseline:

1. Every implementation claiming the Host Application role implements the
   applicable Host Core facet.
2. Every implementation claiming the Agent role implements the applicable
   Agent Core facet.
3. An implementation claiming a Trust-verification role implements the
   applicable Trust-verification Core facet. An implementation that does not
   claim that role is not required to implement the facet.
4. A valid Host-to-Agent Connection requires the applicable Host Core and
   Agent Core facets for the selected release.
5. Core facets cover the minimum common lifecycle and safe-interoperability
   behavior needed for:

   - discovery;
   - identity and release advertisement;
   - compatibility negotiation;
   - safe preview;
   - installation and Connection creation;
   - exact capability identification;
   - safe unsupported-item behavior;
   - stable semantic failure categories;
   - scope and authority separation; and
   - safe shutdown and restart interpretation.

6. Governed Execution remains an optional protocol profile globally.
7. The applicable Governed facet becomes mandatory for a role when that role
   claims or participates in one or more governed features, including:

   - structured authorization;
   - policy-controlled capability execution;
   - data-contract enforcement;
   - exact-action Approval;
   - durable or asynchronous Tasks;
   - cancellation of durable work;
   - idempotent execution guarantees;
   - required signed Receipts or durable execution evidence;
   - delegation or coordinated execution; and
   - Trust- or revocation-gated execution beyond the Core identity floor.

8. A role cannot claim or use one of those governed features while claiming
   only the Core facet.
9. A simple Core implementation may omit Governed Execution, but rejects
   unsupported governed requirements safely and deterministically.
10. Agent Coordination remains outside the mandatory baseline, experimental,
    default-off, and incapable of transferring authority.
11. Historical C1-C3 and G1-G3 remain immutable legacy claims for
    `ghostbridge/0.1-draft`.
12. Those historical claims are not silently mapped to the new role-scoped
    facets.
13. Exact future facet identifiers, schemas, and registry representation
    remain later normative/schema work. Accepted H-04 selects the semantic role
    matrix.
14. A profile claim proves only the registered invariant requirements of that
    exact release, role, and facet. It does not enable arbitrary capabilities
    or authorize an action.

Benefits: requirements follow accepted H-02 roles, no “highest level wins,”
and independent implementations can claim only roles they implement. A
Core-only implementation remains possible while governed behavior has an
explicit conformance floor. Costs: historical names and tests require
migration; more profile identifiers or facet metadata are needed.

### Role matrix

| Role/claim | Alternative 1 | Alternative 2 | Alternative 3 |
| --- | --- | --- | --- |
| Host Application or Client | Core C3 | Minimal Host Core | Host Core facet mandatory when Host role claimed |
| Agent | Core C3 | Minimal Agent Core | Agent Core facet mandatory when Agent role claimed |
| Valid Host-to-Agent Connection | Both sides use Core C3 | Minimal Host and Agent Core | Applicable Host Core and Agent Core facets required for selected release |
| Trust verification where claimed | Applicable C/G portions | Optional Trust profile | Trust-verification Core facet mandatory only when that role is claimed |
| Core-only implementation | Full C3 despite no governed claim | Permitted with minimal lifecycle | Permitted; safely rejects unsupported governed requirements |
| Governed Execution implementation | G3 including C3 | Optional feature set may vary | Applicable Governed role facet mandatory for every participating role |
| Optional profile claim | Highest named cumulative level | Individually selected optional items | Complete registered facet set |
| Agent Coordination | Excluded/experimental | Excluded/experimental | Excluded, experimental, default-off, and non-authority-transferring |
| Historic C/G treatment | Retained | Replaced by minimal names | Immutable `ghostbridge/0.1-draft` legacy claims; no silent mapping |

For all alternatives, a profile claim would prove support only for requirements
explicitly registered in that profile. It would not enable arbitrary
capabilities or grant authorization.

## Proposed precedence algorithms for each option

These were the selectable proposals reviewed by the approver. Option C is the
accepted governance decision; none of these algorithms is normative
specification text.

### Option A algorithm

1. Validate canonical H-03 release inputs and form the exact bilateral
   candidate intersection.
2. For each exact candidate, resolve that release's immutable profile
   definitions, levels, status, cumulative prerequisites, global features,
   authentication classes, extension classes, and capability constraints.
3. Remove a candidate if no profile bundle/level can satisfy every
   Host-required item or if a claim contradicts a non-narrowable bundle
   invariant.
4. H-03 selects the greatest remaining exact candidate.
5. Under only that release, select the smallest eligible bundle using explicit
   registry rules, never array order, and apply permitted capability exceptions
   as narrowing limitations.
6. Apply exact Host requirements, Offer/grant restrictions, consent, and
   policy by intersection.
7. Record the exact release, bundle, exceptions, omitted optional items, and
   enabled capabilities in the Connection.

### Option B algorithm

1. Validate canonical H-03 release inputs and form the exact bilateral
   candidate intersection.
2. For each exact candidate, resolve that release's immutable
   Agent/Passport/manifest/Offer capability identities and statuses,
   authentication identifiers, extensions, experiments, exact capability
   versions, and cross-cutting constraints.
3. Remove a candidate if its required authentication, extension, experiment,
   capability, data, limit, Approval, Receipt, idempotency, cancellation, or
   profile predicates cannot be satisfied.
4. H-03 selects the greatest remaining exact candidate.
5. Under only that release, exclude failed optional capabilities and fail when
   a Host-required capability is absent.
6. Apply Host selection, consent, Offer/grant restrictions, and policy.
7. Compute descriptive profiles from the result and reject any requested
   profile label the result cannot justify.
8. Bind the exact release and complete capability result to the Connection.

### Option C algorithm

The accepted Option C algorithm has this fixed candidate ordering:

1. **Validate exact release advertisements.** Validate each participant's
   canonical exact release advertisements under H-03.
2. **Form the candidate intersection.** Form the exact bilateral candidate
   intersection without using array order, defaults, or adjacent-release
   inference.
3. **Resolve evidence per candidate.** For each exact candidate release
   independently, resolve its immutable release-scoped profile, feature,
   authentication-identifier, extension, capability, and registry evidence.
   Evidence for one candidate cannot satisfy another.
4. **Apply accepted H-03 eligibility.** Apply all accepted H-03 security,
   support, withdrawal, artifact, and freshness eligibility to that exact
   candidate.
5. **Apply H-04 eligibility.** Under that same candidate, validate source-owned
   declarations and absence semantics; establish the role-scoped Core and
   applicable Governed baseline; evaluate profile invariants,
   capability-narrowable properties, global features, the Host-selected common
   authentication identifier, required extensions, explicit experiments,
   exact capability keys/versions, capability restrictions, and Host-required
   items.
6. **Remove ineligible candidates.** Remove any exact candidate that cannot
   satisfy every required H-03 and H-04 predicate. Unknown required items,
   false global/profile claims, or a missing required baseline cannot be
   converted into limitations to keep a candidate.
7. **Let H-03 select.** H-03 selects the greatest remaining exact eligible
   release. H-04 does not choose independently or reorder the remaining set.
8. **Produce the complete H-04 result.** Under only that selected exact
   release, produce selected profiles/facets, global features, the exact
   Host-selected authentication identifier, capabilities and exact versions,
   restrictions, required/optional extensions, experiments, omitted/excluded
   items, source/evidence bindings, and semantic outcomes.
9. **Apply narrowing-only transaction and authority ceilings.** Apply
   Connection Offer/Install Grant restrictions, immutable human consent, and
   deployment policy. Offer/grant and policy cannot widen Passport/manifest,
   discovery, Host, or consent bounds. If narrowing removes a required item,
   the Connection is incompatible; ordering is not rerun.
10. **Bind once at the H-01 commit.** Bind the complete result during
    successful Install Grant redemption and durable Connection creation.
    Reject later substitution, widening, release reordering, or
    reinterpretation. A material change requires a new preview, consent, and
    new or replacement Connection.

This ordering prevents selecting a release and only later discovering that
its required profile or capability set is incompatible. It also prevents
evaluating profiles or capabilities under one release and binding them under
another. Consent and Connection creation are terminal for this negotiation
ordering; they cannot trigger a second H-03 selection.

### Input-role decision under Option C

| Input | Candidate role | Can grant support/authority? | Can narrow? |
| --- | --- | --- | --- |
| H-03 exact release candidate | Candidate-specific eligibility namespace and immutable semantics | Eligibility only; H-03 selects | Yes, by removing the candidate |
| H-03 selected release | Greatest remaining exact eligible candidate and sole namespace for the final H-04 result | No feature/capability authority | Not reordered after selection |
| Discovery | Current deployment's available subset and operational availability | Support evidence only; cannot exceed Passport/manifest | Yes |
| Passport/manifest | Identity-authorized maximum ceiling and immutable contract references | Support evidence only | Yes |
| Schema validation | Representation precondition | No | Invalidates malformed data |
| Profile definition/claim | Registered baseline evidence | No authority | Yes, through exact invariants |
| Global feature | Coarse availability ceiling | No | Yes |
| Capability contract | Exact capability-local support/restrictions | No authority alone | Yes |
| Host requirement | Acceptance condition | No Agent support | Yes/reject |
| Host explicit authentication choice | One identifier from the exact common eligible set | No credential or action authority | Selects but cannot add or fall back |
| Host optional/preference | Selection input among eligible items | No | Selects but cannot add |
| Connection Offer/grant | Installation-attempt ceiling | No | Yes |
| Human consent | Immutable enablement ceiling | No action authority | Yes |
| Deployment policy | Current stricter ceiling | Never | Yes/deny |
| Active Connection | Durable installed authority root | Yes, within all bounds | Later policy/authorization can narrow |
| Authorization/Approval | Later exact-action execution gates | No expansion | Yes/deny at execution |

### Conceptual monotonic-authority expression

For each exact bilateral release candidate, accepted Option C first evaluates
this conceptual eligibility expression:

```text
candidate-specific H-03 release eligibility
∩ mandatory baseline
∩ selected profiles/conformance
∩ authentication eligibility
∩ required extension support
∩ Passport/manifest identity-authorized ceiling
∩ current discovery availability
∩ exact capability identity/version
∩ per-capability restrictions
∩ Host requirements
```

Candidates failing that expression are removed. H-03 then applies its exact
ordering and selects the greatest remaining candidate. Under only that selected
release, Option C produces the complete H-04 result and applies this separate
narrowing expression:

```text
selected release-scoped H-04 result
∩ Connection Offer and Install Grant restrictions
∩ immutable human consent
∩ organization/workspace and Host scope
∩ stricter deployment policy
```

No narrowing outcome reruns H-03 ordering. At the successful H-01 commit, the
complete result becomes the active Connection authority root and later use is:

```text
active Connection authority
∩ current authentication, Trust, policy, and authorization gates
∩ exact-action Approval when applicable
```

Release, authentication, profiles, and extensions establish eligibility or
prove support. Advertisements prove claimed support only after validation
according to source ownership and absence rules. Offer, consent, tenant scope,
and policy narrow after selection without rerunning ordering. Structured
authorization and Approval apply only during later execution. These
expressions record the accepted semantic decision; they are not normative
specification text.

## Negotiated-result and Connection-binding alternatives

### Binding Alternative 1 — Fully inline snapshot

Store every advertisement, manifest, profile definition, capability contract,
Offer, consent item, restriction, omission, and reason directly in the
Connection.

Benefits: self-contained historical interpretation. Costs: large records,
duplication, sensitive-data risk, and difficult migration. H-10 canonical
digests would still be needed to prevent mutation.

### Binding Alternative 2 — Reference-only result

Store only immutable identities/digests for the result and all source
artifacts.

Benefits: compact Connection. Costs: availability and historical-resolution
risk; a missing immutable artifact could make authority indeterminate. A
mutable URL or current registry pointer is insufficient.

### Binding Alternative 3 — Hybrid essential result plus immutable evidence

Store authority-critical semantic results directly and reference bulky
immutable inputs by historically resolvable identity or future qualified
digest. This direct/reference division is part of the accepted decision rather
than an open candidate list.

The durable Connection directly retains:

- selected exact protocol release identity;
- selected profile/facet identities and exact conformance claims;
- selected authentication-mode identifier;
- enabled global features;
- exact enabled capability keys and exact capability versions;
- capability-specific authority and safety restrictions;
- async, cancellation, idempotency, Receipt, Approval, and extension outcomes
  where they affect use;
- selected required and optional extensions;
- explicit experimental opt-ins;
- explicitly disabled, omitted, and excluded items or stable semantic
  categories;
- Host-required items;
- immutable human-consented subset;
- Offer/grant restrictions affecting authority;
- Agent and Passport identity;
- Host/audience and authenticated principal binding;
- organization and workspace binding with explicit absence semantics;
- immutable evidence-bundle identities or future H-10-qualified digests; and
- semantic result status.

The Connection may reference rather than inline:

- complete Host advertisement and requirements;
- complete discovery advertisement;
- Passport and capability manifest;
- complete exact capability contracts;
- full Connection Offer and Install Grant context;
- full immutable consent envelope;
- profile/facet and extension registry definitions;
- H-03 release, specification, schema, and compatibility manifests; and
- a future canonical negotiation transcript.

Every referenced object must be immutable and historically resolvable. A
mutable URL, latest/current pointer, package default, or deployment lookup is
not sufficient. Unavailable optional items remain represented for the
Connection's lifetime either directly or through the immutable bound result
evidence; they cannot disappear from historical interpretation.

The exact schema, digest algorithms, byte canonicalization, inline/reference
encoding, absence encoding, and archival mechanism remain H-10, H-13, and
later schema work. H-04 selects the semantic contents and direct/reference
division but creates no schema.

Every binding alternative preserves that the result grants no authority before
the H-01 commit. After commit, a referenced optional limitation cannot be
mistaken for an enabled item.

## Failure-granularity alternatives

### Failure Alternative 1 — Whole negotiation only

Any contradiction or unavailable requested item rejects the Connection.

Benefit: simplest fail-closed rule. Cost: poor graceful degradation; one
optional capability or extension can unnecessarily block unrelated safe
capabilities.

### Failure Alternative 2 — Classified capability-scoped failure

The whole negotiation or containing authoritative metadata is invalid when a
contradiction concerns:

- participant or Agent identity;
- Passport or manifest identity/authenticity;
- exact release identity;
- required Core baseline;
- a claimed profile invariant that is false globally;
- no common selected authentication identifier;
- a required global extension;
- organization, workspace, Host/audience, or principal scope;
- human-consent integrity;
- Offer/grant attempted widening;
- evidence authenticity; or
- any shared security property whose falsity affects more than one capability.

Only the exact capability may be excluded when all of these are true:

1. the conflict is confined to one exact capability key and version;
2. the capability is optional to the Host;
3. the conflict does not falsify a profile invariant;
4. the conflict does not falsify a global feature advertisement;
5. the conflict does not affect shared authentication, Trust, tenant, consent,
   extension, or evidence; and
6. excluding it leaves a complete and safe semantic result for every remaining
   capability.

If the excluded capability is Host-required, the whole Connection is
incompatible. Unavailable optional profiles, extensions, and features are
omitted and recorded. Unknown required items are incompatible. Unknown
optional items are omitted and recorded. An internally contradictory
advertisement is invalid and can never be downgraded to
`compatible_with_limitations`. A resulting limited Connection authorizes only
its explicitly enabled set.

This classification makes Alternative 2 deterministic at H-04's semantic
level. H-12 later assigns exact public error codes, status codes, transport
mapping, and error precedence.

### Failure Alternative 3 — Separate Connections per compatibility island

Partition incompatible capability/profile groups into separate Connection
candidates and require separate consent for each.

Benefit: strongest isolation. Cost: Connection proliferation, confusing Host
ownership, more grants/consent, and complex cross-capability workflows. It
cannot be silently performed after one preview.

H-12 would later assign exact codes, HTTP statuses, multi-fault precedence,
safe details, and retry categories. H-04 can decide only the semantic outcome
and affected scope.

## Downgrade and renegotiation analysis

| Change/failure | Option A | Option B | Option C | H-01/H-02-preserving outcome |
| --- | --- | --- | --- | --- |
| Required profile removed | Bundle fails | Required label may fail after capability calculation | Required layer fails | No silent lower profile; new preview/consent if an alternative is offered |
| Required global feature removed | Profile contradiction or bundle failure | Required capability set fails | Required feature layer fails | No omission disguised as limitation |
| Required capability removed | Bundle may over-fail | Exact Connection fails | Required capability failure rejects | No similar-key substitution |
| Lower conformance selected | Registry bundle choice | Usually descriptive | Explicit required-level/facet failure | Lower level only through new consented alternative |
| Required extension omitted | Bundle invalid | Affected required scope fails | Required extension scope fails | Never silently omitted |
| Optional extension omitted | Bundle exception | Recorded omission | Recorded limitation | Connection remains limited only when Host did not require it |
| “Similar” item substituted | Unsafe profile inference risk | Exact identity rejects | Exact identity rejects | New item needs new compatibility and consent |
| Fresh discovery adds items | Bundle appears larger | New capabilities appear | New eligible candidates appear | Active Connection unchanged; new preview/consent/Connection to add |
| Fresh discovery removes items | Bundle appears smaller | Live support differs | Current support ceiling differs | Active record not rewritten; current use fails closed as later H-07/H-14 defines |
| Restart | Reload bundle | Reload exact capability result | Reload layered result | Never recompute from discovery |
| Agent deployment change | Profile drift risk | Contract drift risk | Evidence mismatch detected | No reinterpretation; block current use or replace under later decisions |
| SDK default/package upgrade | Bundle/default drift risk | Capability default drift risk | Explicitly non-input | Stored result wins; default cannot widen/narrow |
| Platform policy removes item | Bundle narrowed at use | Capability denied | Policy narrows at use | Deny use without rewriting original result |
| Platform policy attempts addition | Coarse bundle may conceal it | Reject/not selected | Reject/not selected | Policy `ALLOW` adds no authority |
| Active Connection migration | Bundle translation tempting | Exact set translation tempting | Layer/evidence translation tempting | Preserve historical meaning; explicit replacement only |

Removal from current deployment support does not authorize silently continuing
unsupported behavior. It also does not permit rewriting the Connection.
H-07, H-11, and H-14 must later decide suspension, drain, replacement,
revocation, and historical verification behavior.

## Security and threat analysis

The “future requirement” and “future case” columns record consequences of the
accepted decision that become implementable obligations only after separate
normative and conformance work is authorized.

| Threat | Attacker/failure source; violated assumption; consequence | Option impact | Required fail-closed behavior | Future requirement and conformance obligation |
| --- | --- | --- | --- | --- |
| Silent profile downgrade | Agent/Host removes a required profile or level after preview; assumes lower is equivalent; weaker controls | A is vulnerable to level inference; B detects only if required explicitly; C detects at profile layer | Reject changed result; require new preview/consent | Bind required/selected profile; mutate each profile/level between preview and redemption |
| Cross-release semantic binding | Peer or implementation evaluates a profile/capability under one candidate, then binds it under another release; required semantics are bypassed | Any release-first implementation is exposed; corrected C evaluates immutable evidence per candidate before H-03 selection | Remove the ineligible candidate; never transplant evidence or rerun ordering after consent | Cross product of candidate releases with differing facet/capability registries; prove H-03 selects the greatest candidate surviving both H-03 and H-04 |
| False profile-conformance claim | Malicious or buggy Agent claims a bundle not implemented; Host uses unsupported behavior | A worsens broad impact; B limits label value; C validates registry invariants and capability consistency | Invalid advertisement or exclude affected scope before authority | Define claim evidence; seed false C/G/facet claims against observable features |
| Global feature overclaim | Discovery says supported while no capability or lifecycle path supports it; Client invokes/polls incorrectly | A may derive truth; B largely ignores global; C treats global as coarse ceiling only | Never enable a capability solely from global true; invalidate systematic false claim | Map global flags to permissible capability claims; test true-global/false-local matrix |
| Source absence or override confusion | Buggy/malicious peer omits a source-required field or uses discovery/Offer to add beyond Passport; missing data becomes a default or wider authority | A/B are ambiguous without field ownership; C uses release-scoped ownership and intersecting ceilings | Required absence invalidates its source; optional absence makes no claim; explicit false narrows; no source overrides another to widen | Registry cases for required/permitted fields, optional absence, explicit false, and every attempted Passport/discovery/Offer expansion |
| Capability-level privilege expansion | Capability sets async/Approval/Receipt/extension true when broader required support is false; expands apparent authority | B most exposed without cross-cutting floor; C blocks expansion; A subordinates field | Exclude or invalidate; never manufacture global support | State one-way narrowing; mutate every local flag from narrower to wider |
| Omitted required extension | Peer drops an extension or version; operation meaning changes | All can prevent; A scope may be coarse; B/C exact | Reject affected required scope before commit/use | Bind required extension identity/version; removal and version-substitution cases |
| Optional extension treated as required | Buggy parser rejects safe Core when optional item absent; availability loss | A bundle coupling worsens; B/C record omission | Omit and record when genuinely optional; do not expand semantics | Define optional omission category; unavailable optional extension case |
| Experiment enabled by default | Code presence or default activates unstable behavior; unconsented authority | A profile inclusion can conceal; B/C require explicit item | Keep disabled absent bilateral request, consent, and isolation | Default-off and one-missing-opt-in cases; verify no experimental state/authority |
| Array-order-dependent negotiation | Peers reorder same sets and choose different auth/profile/extension | Current auth helper is exposed; corrected C requires an explicit Host-selected auth identifier | Reject any selected identifier outside the exact common eligible set; never choose first-common | Permute every array while holding the explicit Host choice fixed and require identical result |
| SDK-default-dependent negotiation | SDK upgrade changes required profiles/features or auth choice; old Connection changes | A defaults most dangerous; C explicit layers strongest | Ignore defaults after inputs/Connection exist | Record explicit input/result; rerun across differing SDK defaults |
| Platform-default-dependent negotiation | Managed deployment preference becomes de facto protocol selection | All exposed if Platform fields leak; C labels policy role | Platform can narrow only; cannot choose unsupported/unconsented item | Separate policy fields; compare standalone and Platform outcomes |
| Stale discovery after Connection creation | Cache/deployment metadata differs; active authority silently changes | A/B/C constrained by H-01 | Use durable Connection; fresh data cannot renegotiate | Restart/rediscovery cases with more and fewer items |
| Offer widens Passport claims | Malicious issuer/operator adds capability/profile/auth/extension in Offer | A override risk; B/C exact intersection prevents | Invalid Offer or discard widening item; no authority created | Offer subset rule; one-field additions beyond Passport/manifest |
| Discovery/Passport widens consent | New advertisement adds capabilities after user approval | All constrained by H-01; C explicit consent layer | Enable only consented subset | Add advertised item after preview and prove it stays disabled |
| Similar-key/version substitution | Agent replaces required capability/extension with close name/version; different semantics execute | A profile abstraction worsens; B/C exact identity strongest | Reject; no fuzzy/adjacent fallback | Confusable keys, case, punctuation, adjacent versions |
| Authentication-mode downgrade | First common/default/local rank chooses weaker ID; credential security weakened | Current helper is vulnerable; corrected C binds one explicit Host-selected common ID | A selected ID outside the exact common eligible set is incompatible; no substitution or fallback | Reorder modes, remove or replace the explicit selected ID, add a weaker ID, and mutate preview/consent/Connection |
| Unsupported feature use after installation | Client calls Tasks/cancel/Receipt/Approval absent from selected capability | A may over-enable bundle; B/C exact binding helps | Agent rejects before mutation/effect; Client preflight is defense in depth | Gate each operation on stored feature/capability result |
| Cross-tenant capability reuse | Connection/capability result reused in another organization/workspace | All rely on H-02 binding; capability-only IDs are unsafe | Exact tenant/Host/Connection mismatch denies | Mutate organization, workspace absence/value, principal, Host |
| Deployment reinterprets active Connection | Live contract/profile registry changes; stored key now means new behavior | B most sensitive to contract drift; C hybrid evidence detects | Do not reinterpret; fail safely or replace | Pin exact definitions/evidence; rolling-upgrade and restart cases |
| Unknown treated as supported | Parser/default maps unknown profile/feature/extension to nearest known behavior | A level inference high; B/C exact identity | Unknown required fails; unknown optional omitted/recorded | Unknown required/optional cases for every item class |
| Limitation mistaken for authority | Client sees `compatible_with_limitations` and uses omitted feature | All require explicit enabled set; C clearest | Only enabled set authorizes; omission stays unavailable | Attempt every omitted item on limited Connection |
| Profile ID treated as authorization grant | Agent/Host assumes Governed profile permits operation without Connection/policy/Approval | A highest risk; B lowest; C separates roles | Reject absent exact active Connection and current authorization | Valid profile with missing Connection/ALLOW/Approval cases |
| Another Agent's support treated as delegated authority | Coordination or shared Host combines capability sets; cross-Agent invocation | None permits under H-02; experiments increase risk | Reject direct/inherited authority and cross-Agent bindings | Two Agents with different capabilities; attempt authority transfer |

Additional security-critical contradictions—tenant mismatch, false Agent or
Passport identity, consent mutation, a required Approval with no Approval
support, or a durable-execution claim paired with no required persistence/
idempotency semantics—should never be downgraded to a display-only warning.

## Compatibility examples

The expected outcomes below describe accepted Option C plus Failure
Alternative 2. They are accepted semantic examples, not normative requirements
or H-12 error codes.

| # | Explicit inputs | Expected semantic outcome |
| ---: | --- | --- |
| 1 | Host requires Core; Agent advertises no Core support. | **Incompatible; whole Connection rejected.** No lower or absent profile fallback. |
| 2 | Host supports Governed Execution optionally; Agent supports only Core; no governed capability is required. | **Compatible with explicit limitations.** Governed profile omitted; Core-only enabled set may proceed. |
| 3 | Host requires Governed Execution; Agent supports only Core. | **Incompatible; whole Connection rejected.** |
| 4 | Discovery says `tasks:true`; capability A says `asynchronousSupport:false`. | If the release-scoped mapping classifies async as capability-narrowable, **compatible capability narrowing:** A is synchronous-only. If async is invariant for the claimed facet, A is inconsistent; a globally false facet claim invalidates its containing metadata. |
| 5 | Discovery says `receipts:true`; capability A says `receiptRequirement:none`; Host does not require a Receipt for A. | **Compatible with a recorded capability restriction.** No Receipt authority/expectation exists for A. If the selected profile makes Receipts invariant for A, treat it as contradiction instead. |
| 6 | Host requires Receipts for capability A; A says `receiptRequirement:none`. | If A is required, **whole Connection incompatible**. If A is optional, **A excluded** and the limitation recorded. |
| 7 | Capability A requires unknown extension `dev.example/a@1`. | **A excluded**; if A or the extension is Host-required globally, **whole Connection incompatible**. Unknown is never inferred. |
| 8 | Capability A declares unavailable optional extension B. | **Optional item omitted** and recorded. A remains only if its Core meaning is complete without B. |
| 9 | Host and Agent contain identical items in different array orders. | **Identical result.** Any differing result is invalid algorithm behavior. |
| 10 | Discovery claims Governed; the applicable Passport/manifest ceiling explicitly excludes it. | **Invalid Agent advertisement or whole negotiation**, according to the source-owned semantic dimension. Discovery never overrides Passport; Passport does not turn currently unavailable discovery support into availability. |
| 11 | Passport/manifest allows A and B; Offer/grant restricts to A. | **Compatible narrowing.** Only A is eligible for consent/enablement. |
| 12 | Passport/manifest allows A; Offer attempts A and B. | **Invalid widening Offer** or B removed with a widening-attempt failure; B can never enter consent or Connection. |
| 13 | A and B are compatible; human consents only to A. | **Compatible selected subset.** A enabled, B explicitly disabled/unconsented; B cannot be invoked. |
| 14 | Fresh discovery adds C after A-only Connection creation. | **Active Connection unchanged.** C needs a new preview, consent, and new/replacement Connection. |
| 15 | Fresh discovery removes A from an active A Connection. | **Do not rewrite the Connection.** Current use fails closed or transitions under later H-07/H-14 rules; replacement requires new preview/consent. |
| 16 | Agent Coordination experiment advertised; Host did not opt in. | **Experimental item remains disabled** and is recorded as omitted/disabled rather than enabled authority. |
| 17 | Host explicitly requests an experimental capability; Agent supports it. | It becomes eligible only with bilateral exact opt-in, human consent, isolation, and no Core-authority change. Otherwise **omitted or incompatible if required**. |
| 18 | Profile claims durable execution; capability A says `idempotencySupport:none`. | If durable idempotency is invariant and the conflict proves the profile claim false globally, **containing profile advertisement invalid**. If it is confined to optional A without falsifying the global claim, **exclude A**; Host-required A makes the Connection incompatible. |
| 19 | Host explicitly selects `signed_request`; the Agent's exact eligible set contains only `oauth`. | **Incompatible; whole Connection rejected.** No first-common, ranking, nearest-mode, or weaker-mode fallback. H-05 mode details remain deferred. |
| 20 | Agent advertises an unknown optional profile. | **Optional profile omitted and recorded.** It grants no support or authority and does not block another valid common baseline. |
| 21 | Host requires an unknown profile. | **Incompatible; whole Connection rejected.** No nearest-name or same-epoch inference. |
| 22 | A required feature is deprecated or withdrawn by valid governance metadata. | Deprecated treatment follows the selected H-14 policy and explicit consent; withdrawn is unavailable for the affected new selection. If required, **incompatible**. History is not rewritten. |
| 23 | Same H-03 release; required profile sets do not overlap. | **Incompatible.** Same release does not prove H-04 compatibility. |
| 24 | Profiles compatible; Host requires A@2; Agent supports A@1. | **Incompatible for required A.** Optional A would be excluded; no adjacent-version substitution. |
| 25 | A is otherwise negotiated; Platform policy denies A before creation. | Policy may **narrow** the result. If A is Host-required, reject; otherwise omit A and bind the narrower result. |
| 26 | Platform policy attempts to add B not consented by the user. | **Reject or ignore attempted widening.** B remains disabled and unauthorized. |
| 27 | Restart occurs with discovery containing more/fewer capabilities. | **Resume exact durable result.** Fresh metadata may trigger current-support checks but cannot reinterpret it. |
| 28 | Active Connection encounters SDK/package upgrade with different defaults. | **No change.** Defaults are not negotiation inputs and cannot replace stored profiles, features, authentication, capabilities, or extensions. |
| 29 | Exact candidates R1 and R2 are common; R2 is greatest by H-03 order but cannot satisfy a required R2 profile, while R1 satisfies all R1 rules. | Remove R2 during per-candidate H-04 eligibility. **H-03 selects R1 as the greatest remaining exact eligible release.** This is not adjacent-release substitution or post-selection fallback. |
| 30 | R1 profile evidence would satisfy the Host, but the same profile identifier has different or absent semantics under candidate R2. | Evaluate each candidate only with its own immutable release-scoped evidence. **R1 evidence cannot make R2 eligible** and cannot be bound under R2. |
| 31 | Passport is permitted but not required to carry a deployment-availability field; discovery carries it. | Passport absence is **not a denial**. Evaluate the field from its release-scoped owner. If Passport was required to carry it, the Passport metadata would instead be invalid. |
| 32 | Passport permits A; discovery currently omits A where discovery is required to declare available capabilities. | A is **currently unavailable** and cannot be added by Passport, Offer, consent, or policy. If A is Host-required, the Connection is incompatible. |
| 33 | An optional capability has a contradiction confined to its exact version, with no profile/global/shared-security effect. | **Exclude only that exact optional capability and record it.** If it is Host-required or the contradiction falsifies a broader claim, reject the whole Connection or containing metadata. |

Outcome distinctions:

- **Invalid advertisement** means the containing evidence is internally false,
  malformed, contradictory, or improperly widening before compatibility can be
  trusted.
- **Incompatible negotiation** means valid inputs cannot satisfy a required
  item.
- **Compatible with explicit limitations** means the Connection can be created
  with a smaller recorded enabled set.
- **Optional item omitted** means absence is expected and recorded.
- **Affected capability excluded** means other independent capabilities may
  remain eligible.
- **Whole Connection rejected** means a shared/required gate failed.
- **New preview and consent required** applies to every material post-consent
  change.
- **Later H-decision required** applies to exact errors/transports,
  active-Connection state transitions, support governance, cryptography, and
  schema form.

## Independent-implementation impact

### Option A

An independent team implements fewer negotiation records but must reproduce
complete bundle definitions and exception rules. The primary ambiguity risk is
whether an advertised level implies all lower levels and every bundled
feature. A small implementation may be forced to implement unrelated
capabilities to claim Core.

### Option B

An independent team needs exact registries and evaluation for every capability
field. It gains clear least authority but faces the largest Cartesian matrix
and risks producing no meaningful common profile. Clean-room implementation is
possible only if every cross-cutting constraint is explicit.

### Option C

An independent team implements a layered evaluator over canonical sets, exact
identities, per-release immutable evidence, field-owned source roles,
role-scoped Core/Governed facets, profile invariant classifications, an
explicit Host authentication choice, and deterministically classified
failures. It must evaluate every exact bilateral release candidate separately
before H-03 selects the greatest remaining candidate. This is more work than
current `checkCompatibility`, but it avoids hidden JavaScript precedence and
can be reproduced in Go, Python, Java, or Rust. The future specification would
need pseudocode, immutable registries, cross-field rules, and examples that do
not import official helpers. An implementation claiming only Host, only Agent,
or an additional Trust-verification role implements precisely the applicable
facets; a simple Core implementation safely rejects governed requirements.

Under every option, the official TypeScript implementation and Platform are
ordinary implementations. Passing their tests cannot prove the selected
algorithm or baseline.

## Conformance implications

After this human acceptance and separate normative/schema authorization, a
future suite would need:

1. multiple exact release candidates with different release-scoped profile,
   feature, authentication, extension, capability, and registry evidence,
   proving H-03 selects the greatest candidate surviving both H-03 and H-04;
2. proof that evidence from one release candidate cannot qualify or bind
   another, and that ordering is not rerun after consent or Connection
   creation;
3. canonical sets with every array permutation;
4. missing, duplicate, unknown, deprecated, withdrawn, and conflicting
   profile/level records;
5. source-required absence, source-permitted absence, explicit `false`, and
   discovery/Passport/manifest/Offer agreement, narrowing, and attempted
   widening;
6. every profile invariant and capability-narrowable property crossed with
   every applicable global and per-capability state;
7. exact capability key/version, similar-key, case, and adjacent-version
   substitution;
8. required/optional/preferred Host input separation;
9. required/optional extension absence, semantic completeness, and version
   disagreement at global and
   capability scope;
10. every missing experiment opt-in, complete same-Connection opt-in, and
    post-creation material experiment change;
11. no-common and multi-common authentication identifiers with one explicit
    Host-selected identifier, reordered inputs, and attempted fallback;
12. human consent subsets, Offer/grant narrowing, and attempted widening;
13. policy deny/narrow and attempted `ALLOW` widening;
14. whole-metadata failures and all six capability-only exclusion
    preconditions;
15. limited Connections attempting every omitted item;
16. hybrid direct/reference result persistence and immutable historical
    resolution across Client, Agent, SDK, package, and
    deployment restart;
17. fresh discovery with more/fewer/different items after activation;
18. false profile claims and capability/security contradictions;
19. Core-only, Governed, optional-profile, Host, Agent, and
    Trust-verification role claims, including rejection of governed behavior
    under Core-only claims;
20. official Client to independent Agent and independent Client to official
    Agent for every claimed profile/feature pair; and
21. negative cases proving profile IDs, another Agent's support, Trust,
    consent, and limitations never become authorization.

Cases must cite future accepted requirement, schema, state-machine, registry,
fixture, and vector IDs. The current core test and official examples are
evidence inputs, not expected-result oracles. Exact semantic reason identifiers
would be H-04-derived; public codes/statuses remain H-12 work.

## Migration and historical-object implications

- `ghostbridge/0.1-draft` profile, feature, extension, and capability behavior
  remains historical. It is not relabeled as the H-04-selected model.
- Existing Connections that store only capability keys and a projected package
  version do not acquire invented profiles, levels, extensions, exact
  capability versions, experiments, consent, or transcript evidence.
- A migration inventory may classify those Connections externally as
  `legacy_negotiation_indeterminate` or another later approved category, but it
  cannot mutate history.
- Current C1-C3/G1-G3 claims remain legacy claims under accepted Baseline
  Alternative 3. They are not silently mapped to new facets.
- Existing nonterminal Tasks and Receipts retain the meaning of their original
  Connection and release evidence. Missing H-04 evidence remains missing.
- Active legacy Connections may need bounded continuation, restriction,
  read-only treatment, replacement, or revocation. H-07, H-11, and H-14 must
  decide that disposition.
- A new profile, extension, experiment, capability version, or wider consent
  requires a new preview and consent and a new/replacement Connection.
- Rolling deployments must retain behavior and artifacts required for active
  Connections or fail safely under later lifecycle/support rules. They cannot
  project current capability contracts onto old keys.
- A future negotiated-result schema cannot be backfilled into historical
  objects as if it had been exchanged.

## Rejected shortcuts and non-options

These approaches are unsafe or incomplete and are not viable H-04 options:

- “The profile with the highest name or level wins.” Names do not define order,
  and higher does not prove support, compatibility, or authority.
- “The first common array item wins.” Array order is incidental and currently
  creates authentication/version divergence.
- “The Agent decides the final set unilaterally.” It could escape Host
  requirements and consent.
- “The Host decides the final set unilaterally.” It cannot manufacture Agent
  support or exceed Passport/Offer bounds.
- “Discovery feature booleans are sufficient.” They omit exact capability
  behavior and restrictions.
- “Profile support automatically enables every capability.” A profile is not a
  capability or authorization grant.
- “A capability may enable a feature globally.” Capability fields are local to
  that capability.
- “Unknown means supported.” Unknown behavior has no reviewed semantics.
- “Optional means silently ignored without recording.” That destroys
  reproducibility and lets limitations look like full support.
- “Experimental means enabled when both implementations contain code for it.”
  Code presence is not bilateral opt-in or human consent.
- “The Platform database is the protocol registry.” Platform storage is one
  deployment and cannot govern independent peers.
- “The TypeScript constants define mandatory profiles.” They are current
  implementation defaults.
- “Passing official tests proves independent interoperability.” The tests
  import the same implementation semantics.
- “A new deployment may renegotiate active Connections.” H-01 and H-03 forbid
  reinterpretation from fresh metadata.
- “A policy ALLOW may expand the Connection.” H-02 makes effective authority
  an intersection.
- “Same protocol release means all features are compatible.” H-03 keeps
  release and feature/profile compatibility separate.
- “Same epoch means all profiles are compatible.” Epoch order is not H-04
  compatibility evidence.
- “A valid Agent identity implies capability authority.” Passport/Trust
  evidence is not Connection/action authority.
- “Connected Agents inherit each other's capabilities or authority.” H-02
  prohibits that transfer.
- “Discovery overrides Passport,” “Passport overrides discovery,” or “Offer
  overrides both.” An unconditional override can turn stale or malicious data
  into expansion.
- “A limitation can be retried as though the item were enabled.” A limitation
  explicitly records unavailability.
- “A similar capability or extension can replace the required one.” Exact
  identity/version is part of semantics.

## Accepted decision

H-04 selects **Option C — Layered monotonic intersection**, combined with:

- **Baseline Alternative 3 — Role-scoped Core facets**;
- **Binding Alternative 3 — Hybrid essential result plus immutable evidence**;
  and
- **Failure Alternative 2 — Classified capability-scoped failure**.

This four-part bundle was approved by rudra on 2026-07-30.

### Disposition of reviewed alternatives

- Option A was not accepted.
- Option B was not accepted.
- Option C was accepted.
- Baseline Alternatives 1 and 2 were not accepted; Baseline Alternative 3 was
  accepted.
- Binding Alternatives 1 and 2 were not accepted; Binding Alternative 3 was
  accepted.
- Failure Alternatives 1 and 3 were not accepted; Failure Alternative 2 was
  accepted.

Reasons:

1. It best preserves H-01's immutable consent and single authority commit.
2. It directly preserves H-02's intersection and narrowing-only policy model.
3. It keeps H-03 as the sole ordering and final selection authority while
   supplying candidate-specific H-04 eligibility before H-03 chooses the
   greatest remaining exact release.
4. It gives profiles a meaningful baseline without allowing them to overstate
   every capability.
5. It gives global features a useful coarse role while exact capability
   contracts control capability-local behavior.
6. It supports graceful degradation for truly optional items without allowing
   silent downgrade.
7. Role-scoped facets align conformance claims with H-02 responsibilities and
   avoid ordinal “highest level” inference.
8. Hybrid binding gives the Agent enough direct data to enforce authority while
   preserving immutable evidence for independent history.
9. Capability-scoped exclusion contains optional defects while shared,
   required, and security-critical contradictions still fail closed.
10. It is reproducible without TypeScript or Platform behavior if future
    registries and algorithms are fully specified.

With the qualifications below, this accepted governance decision records the
complete reviewed package. No requirement in it is normative, no runtime or
schema change is authorized, no gap is automatically closed, and no Protocol
1.0 claim is made.

## Approved qualifications

The approved qualifications are:

1. Each participant's canonical exact release advertisements are validated and
   intersected under H-03.
2. Every exact release candidate is evaluated independently using only that
   release's immutable H-03 and H-04 profile, feature, authentication,
   extension, capability, artifact, support, withdrawal, freshness, and
   registry evidence.
3. H-03 retains exact release ordering and selects the greatest candidate only
   after all required H-03 and H-04 predicates remove ineligible candidates.
   H-04 never chooses a release independently.
4. The final H-04 set is produced under the selected exact release. Evidence
   cannot move between releases, and ordering is never rerun after Offer,
   consent, or Connection creation.
5. Release-scoped immutable registries or manifests define which declarations
   each source is required or permitted to carry and therefore determine
   absence semantics.
6. Passport/manifest defines the identity-authorized maximum ceiling;
   discovery defines the current deployment subset; Offer/grant defines a
   transaction subset; Host metadata defines requirements, interests, explicit
   selections, and eligible preferences; consent defines the immutable
   permitted subset; policy denies or narrows only.
7. Only semantically overlapping source claims are intersected. Required
   absence invalidates its source, optional absence means no claim, explicit
   false/unsupported/disabled/excluded values narrow, and no omitted value
   receives an implementation default.
8. Discovery never overrides Passport, Passport never overrides current
   discovery availability, and Offer/grant never widens either.
9. Every claimed Host Application role implements the applicable Host Core
   facet, every claimed Agent role implements the applicable Agent Core facet,
   and a claimed Trust-verification role implements its applicable Core facet.
   A valid Host-to-Agent Connection requires the selected release's Host and
   Agent Core facets.
10. Core supplies the minimum safe lifecycle and interoperability behavior
    identified in Baseline Alternative 3. Governed Execution is globally
    optional, but its applicable role facet becomes mandatory whenever that
    role claims or participates in a governed feature. Core-only roles safely
    reject unsupported governed requirements.
11. Historical C1-C3 and G1-G3 remain immutable
    `ghostbridge/0.1-draft` legacy claims and are not silently mapped to new
    facets.
12. Agent Coordination is outside the mandatory baseline, experimental,
    default-off, incapable of transferring authority, and supplies no direct
    or inherited Agent-to-Agent authority.
13. Every release-scoped profile property is classified as invariant or
    capability-narrowable. Unclassified properties are invariant and fail
    closed.
14. Capability fields apply only to one exact capability/version. They can
    narrow only properties explicitly marked capability-narrowable and can
    never expand a profile or global feature claim.
15. A false global profile invariant invalidates the containing claim. A
    conflict can exclude one optional capability only when it satisfies every
    deterministic Failure Alternative 2 condition.
16. Global feature-to-profile mappings come only from immutable
    release-scoped evidence. Global `true` is a coarse ceiling, not enablement;
    global `false` prohibits capability-level expansion.
17. The Host supplies one explicit authentication-mode identifier from the
    exact common eligible set. The Agent verifies it, and the exact identifier
    binds to preview, consent, and Connection. There is no rank, first-common,
    array-order, nearest-mode, or weaker-mode fallback. H-05 retains all
    credential and proof semantics.
18. Exact capability, capability-version, profile/facet, authentication,
    experiment, and extension identities are non-substitutable.
19. Whole metadata/negotiation invalidity and exact optional-capability
    exclusion follow the exhaustive Failure Alternative 2 boundary. A
    Host-required excluded capability makes the Connection incompatible, and
    internally contradictory metadata never becomes
    `compatible_with_limitations`.
20. Unknown required items are incompatible. Unknown or unavailable optional
    items are omitted and recorded.
21. An experiment may share the initial Connection only with exact bilateral
    support, explicit Host request, explicit human consent, separate recording,
    complete dependency binding, and no weakening/redefinition of Core or
    authority/security semantics. A separate Connection may be required by
    stricter policy but is not universal.
22. Adding, removing, or materially changing an experiment after creation
    requires a new preview, consent, and new/replacement Connection.
23. An extension is optional only when omission preserves complete input,
    output, side-effect, authority, security, error, and historical semantics.
    Otherwise it is required for the capability. Every optional omission is
    recorded.
24. Human consent binds exact versions and material restrictions. Offer/grant
    and policy may narrow only; limitations, disabled items, and omissions
    never become authority.
25. Binding Alternative 3's direct/reference division is final for this
    accepted decision: the durable Connection directly retains the listed
    authority-critical semantic result and may reference only bulky immutable,
    historically resolvable evidence.
26. Mutable URLs, latest/current pointers, package defaults, or deployment
    lookups cannot resolve bound evidence. Unavailable optional items remain
    historically represented for the Connection's lifetime.
27. Restart and fresh discovery never reinterpret the stored result. Material
    additions, removals, substitutions, lower profiles, changed restrictions,
    or changed experiments require new preview, consent, and a new/replacement
    Connection.
28. Exact schema form, canonical bytes/digests, lifecycle transitions, public
    errors, namespace evolution, registry ownership, support timelines, and
    independent-evidence graduation remain with H-07 and H-10 through H-14 as
    applicable.
29. Acceptance authorizes no normative, schema, runtime, SDK, Platform,
    migration, or conformance change without separately authorized work.

## Residual risks

- Role-scoped facets may proliferate and become profiles under another name.
- Determining which profile properties are capability-narrowable can remain
  contentious.
- Capability-scoped failure can be implemented inconsistently without a
  complete registry and conformance matrix.
- A hybrid Connection depends on long-term availability of immutable referenced
  evidence.
- The explicit Host-selected authentication identifier still needs an exact
  preview/consent/Connection schema representation.
- A malicious Agent can make internally consistent but false support claims;
  conformance and runtime enforcement remain necessary.
- Fine-grained results increase consent UI and Connection size.
- Policy denial after installation can surprise users even though it correctly
  does not rewrite authority.
- Current implementations require substantial migration away from keys,
  defaults, first-common selection, and incomplete Connections.
- Deprecated/withdrawn treatment depends on H-14 governance availability.
- Optional omission can hide ecosystem fragmentation if interoperability
  reports do not publish limited outcomes.
- Replacing historical levels may impose documentation and tooling migration
  costs.

## Accepted H-04 decision bundle

rudra approved the following complete bundle on 2026-07-30:

1. Option C — Layered monotonic intersection.
2. Baseline Alternative 3 with mandatory Host Core and Agent Core facets for
   claimed roles and a valid Host-to-Agent Connection, a Trust-verification
   Core facet only for implementations claiming that role, and applicable
   Governed facets mandatory for participating roles that claim or use
   governed features.
3. Historical C1-C3 and G1-G3 retained only as immutable
   `ghostbridge/0.1-draft` legacy claims, with no silent mapping to future
   facets.
4. Release-scoped source ownership, absence semantics, and intersecting
   Passport/manifest, discovery, Offer/grant, Host, consent, and policy
   ceilings.
5. Profile properties classified as invariant or capability-narrowable, with
   unclassified properties invariant and fail-closed.
6. One explicit Host-selected authentication identifier from the exact common
   eligible set, with no ranks, first-common behavior, substitution, or
   fallback.
7. Failure Alternative 2 with deterministic whole-metadata/negotiation versus
   exact optional-capability scope.
8. Binding Alternative 3 with the specified authority-critical direct contents
   and bulky immutable, historically resolvable references.
9. Same-Connection initial experiments only under complete bilateral support,
   Host request, human consent, isolation, dependency binding, and
   no-authority-weakening rules; a separate Connection remains a permitted
   stricter policy.
10. Optional-extension status only when omission preserves complete required
    base semantics, with every omission recorded.
11. No silent downgrade, source override, default inference, authority
    widening, similar-item substitution, or cross-release evidence reuse.
12. A new preview, consent, and new or replacement Connection for every
    material post-creation addition, removal, or change.

These choices, the approved qualifications, all recorded residual risks, and
the documented compatibility and security impacts comprise the accepted H-04
decision.

## Questions deferred to later decisions or normative work

1. What are the exact facet identifiers and registry wire representations?
2. What is the exact stable normative requirement text after approval?
3. What exact schema field names and representation encode the negotiated
   result, source ownership, absence, and direct/reference division?
4. What are the canonical bytes, digest algorithms, domain labels, and
   evidence-bundle rules under H-10?
5. What Connection state transitions implement replacement, suspension,
   recovery, and material renegotiation under H-07?
6. What is the disposition of active legacy Connections under
   H-07/H-11/H-14, including deployments that can no longer honor a capability?
7. What public error codes, statuses, transport mappings, and precedence apply
   under H-12?
8. How are extension namespaces owned, encoded, forwarded, canonicalized,
   graduated, and removed under H-13/H-14?
9. Which organization has publication authority for profile, feature,
   capability, extension, experiment, and support-state registries under H-14?
10. What support, deprecation, withdrawal, and archival windows apply under
    H-14?
11. What exact independent-implementation evidence, role/facet set, and final
    Protocol 1.0 graduation gates apply under H-14?

## Consequences of acceptance

1. H-04 and the decision register now record the human disposition, approved
   bundle, qualifications, risks, compatibility impact, security impact,
   approver, date, and approval reference.
2. H-04 acceptance authorizes only the selected protocol-governance decision.
3. It does not itself create normative requirements, schemas, registries,
   state machines, fixtures, vectors, conformance cases, runtime behavior, SDK
   behavior, Platform behavior, migration, deployment, publication, or a
   release.
4. No `GB-*` gap is closed merely by acceptance.
5. Future normative work must cite accepted H-01, H-02, H-03, and H-04 as
   applicable.
6. H-05 through H-14 remain controlling for their deferred subjects.
7. Creating profile/facet, feature, capability, extension, experiment, and
   negotiated-result registries requires separately authorized work.
8. Designing negotiation and final Connection schemas requires separately
   authorized work.
9. Defining H-07 lifecycle transitions, H-10 canonical evidence, H-12 public
   errors, H-13 extension evolution, and H-14 registry/support/graduation
   governance requires their own accepted decisions and separate
   authorization.
10. SDK, Agent, Client, Platform, and migration changes require a separately
    authorized implementation phase.
11. Independent conformance and bidirectional interoperability work remains
    required before any Protocol 1.0 graduation claim.
12. Existing historical and legacy objects must not be rewritten or backfilled
    with invented evidence.

Subject to those separate decisions and authorizations, the reviewed future
work remains:

1. write stable requirement-numbered H-04 normative text;
2. define profile/facet, feature, capability, extension, and result registries;
3. design negotiation offer/result and final Connection schemas;
4. define H-07 lifecycle bindings and replacement transitions;
5. define H-10 canonical transcript/evidence digests;
6. define H-12 semantic-reason mappings, public errors, and transport behavior;
7. define H-13 openness and extension/experiment evolution;
8. define H-14 registry ownership, support state, and baseline graduation;
9. derive portable permutation, contradiction, downgrade, malicious, and
   interoperability fixtures;
10. update SDK, Agent, Client, Platform, and migration behavior; and
11. run independent conformance and bidirectional interoperability work.

Acceptance records the governance decision; it does not itself perform or
authorize that future work.

## Human approval block

Human approval is recorded as follows:

- **Approver:** rudra
- **Approval date:** 2026-07-30
- **Approved option:** Option C — Layered monotonic intersection
- **Approved baseline:** Baseline Alternative 3 — Role-scoped Core facets
- **Approved binding:** Binding Alternative 3 — Hybrid essential result plus
  immutable evidence
- **Approved failure model:** Failure Alternative 2 — Classified
  capability-scoped failure
- **Approved qualifications:** all qualifications recorded in this accepted
  H-04 decision, including:

  - release-scoped per-candidate H-04 eligibility before H-03 final
    greatest-eligible-release selection;
  - H-03 remaining the sole release-ordering and final-selection authority;
  - source-owned fields and explicit absence semantics;
  - Passport/manifest identity-authorized ceilings;
  - current-discovery narrowing;
  - Offer/grant narrowing;
  - Host-required, optional, preference, and explicit-selection separation;
  - immutable human-consent narrowing;
  - policy denial/narrowing without widening;
  - mandatory role-scoped Host Core and Agent Core facets;
  - Trust-verification Core only where that role is claimed;
  - applicable Governed facets for roles participating in governed features;
  - historical C1-C3 and G1-G3 retained only as immutable
    `ghostbridge/0.1-draft` legacy claims;
  - profile invariant versus capability-narrowable classification;
  - unclassified profile properties failing closed;
  - one explicit Host-selected authentication-mode identifier from the exact
    common eligible set;
  - no array-order, first-common, ranking, substitution, or weaker-mode
    fallback;
  - deterministic whole-negotiation versus optional-capability-local failure
    scope;
  - hybrid direct semantic result plus immutable historically resolvable
    evidence;
  - default-off experiments with bilateral support, Host request, human
    consent, isolation, and dependency binding;
  - optional extensions only where omission preserves complete base semantics;
  - no direct or inherited Agent-to-Agent authority; and
  - new preview, consent, and new or replacement Connection for every material
    change.
- **Accepted risks:** all residual risks recorded in H-04, including:

  - role-scoped facet proliferation;
  - contentious invariant versus capability-narrowable classification;
  - inconsistent failure-scope implementation without complete registries and
    conformance;
  - dependence on long-term immutable evidence availability;
  - future schema work for explicit authentication selection and durable
    binding;
  - internally consistent but false support claims;
  - larger consent and Connection records;
  - surprising post-installation policy denial;
  - substantial migration away from keys, defaults, first-common selection,
    and incomplete Connections;
  - dependence on H-14 support governance;
  - ecosystem fragmentation through optional omission; and
  - documentation and tooling migration from historical ordinal levels.
- **Compatibility impact:** accepted as documented, including:

  - current JavaScript behavior, schemas, TypeScript declarations, tests,
    examples, and Platform behavior do not automatically conform;
  - release-scoped registries and deterministic negotiation behavior will be
    required;
  - historical C1-C3 and G1-G3 claims are not automatically mapped;
  - exact capability and extension identities and versions are
    non-substitutable;
  - existing Connections cannot be backfilled with invented H-04 evidence;
  - new wire schemas and richer durable Connection representations will be
    required through separately authorized work;
  - SDKs and deployments will require migration; and
  - historical objects retain their original meaning.
- **Security impact:** accepted as documented, including:

  - monotonic least authority and narrowing-only semantics;
  - candidate-specific evaluation preventing cross-release semantic binding;
  - explicit anti-downgrade and no-fallback handling;
  - consent-integrity preservation;
  - exact release, capability, extension, tenant, Host, principal, and
    authentication binding;
  - fail-closed shared and security-critical contradiction treatment;
  - capability-local exclusion only under the complete approved conditions;
  - experiment isolation;
  - limitations and omissions never becoming authority;
  - prevention of direct or inherited Agent-to-Agent authority;
  - remaining dependency on correct future registries, schemas, evidence
    binding, conformance, and runtime enforcement.
- **Sign-off or review reference:** Exact human approval statement supplied by
  rudra in the Phase 15D.1C independent-review conversation on 2026-07-30 and
  reproduced verbatim in this decision record; repository commit and
  pull-request history will provide the durable version-control reference.
- **Resulting status:** `ACCEPTED`

### Verbatim human approval statement

I, rudra , approve H-04 on July 30, 2026.

Approved decision bundle:

- Option C — Layered monotonic intersection
- Baseline Alternative 3 — Role-scoped Core facets
- Binding Alternative 3 — Hybrid essential result plus immutable evidence
- Failure Alternative 2 — Classified capability-scoped failure

I approve the qualifications stated in the reviewed H-04 decision packet,
including release-scoped per-candidate eligibility before H-03 final selection,
source-owned monotonic narrowing, explicit Host selection of one eligible
authentication identifier, mandatory role-scoped Core facets, conditional
Governed facets, immutable legacy treatment, deterministic failure scope,
hybrid durable binding, default-off experimental features, and new preview and
consent for material changes.

I knowingly accept the documented residual risks, including negotiation
complexity, registry-classification risk, failure-granularity risk, richer
durable Connection records, legacy-Connection indeterminacy, migration costs,
and dependence on later normative, schema, lifecycle, cryptographic, extension,
error, registry, and conformance decisions.

I accept the documented compatibility impact on wire formats, SDKs,
deployments, current implementation behaviour, and historical objects.

I accept the documented security impact, including the protections gained, the
implementation-sensitive risks that remain, and the requirement that H-05
through H-14 continue to govern their deferred subjects.

This approval changes H-04 to ACCEPTED only after the approval information is
recorded in the decision record. It does not itself approve normative
specification text, schemas, runtime implementation, Protocol 1.0, deployment,
publication, migration, or release.

## Final status

- H-01 is `ACCEPTED`.
- H-02 is `ACCEPTED`.
- H-03 is `ACCEPTED`.
- H-04 is `ACCEPTED`.
- H-05 through H-14 remain deferred.
- No normative specification, schema, runtime, SDK, Platform, migration,
  deployment, publication, release, or Protocol 1.0 claim is authorized by
  this recording task.
- Future changes to the accepted H-04 decision require a new superseding
  decision record and explicit human approval; the accepted historical record
  must not be rewritten to show a different original choice.

**H-04 is ACCEPTED.**
