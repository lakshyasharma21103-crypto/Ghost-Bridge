# H-13 — Schema openness, extensions, and evolution

## Decision ID

`H-13`

## Status

**ACCEPTED**

## Date prepared

2026-08-11

## Approval record

- **Approver:** Rudra
- **Approval date:** 2026-08-11
- **Approved option:** Option B — Closed Core with registered namespaced extension points
- **Approval source:** `H-13-human-approval-rudra-2026-08-11.txt`
- **Verified SHA-256:**
  `441960223D24E801CDE6BC1498F57E2DD0C3AD1C56755216587944332395A292`

## Governance boundary

This record is an accepted protocol-governance decision and repository-evidence
audit. Rudra's approval gives Option B and the complete corrected Option B
governance model below H-13 decision authority. It is not a normative
specification, schema, schema-bundle manifest, state machine, fixture, vector,
conformance case, generated type, implementation instruction, migration
authorization, deployment instruction, publication, release, or Protocol 1.0
claim.

Implementation, tests, existing schemas, historical draft prose, Platform
behavior, examples, and external standards remain evidence only. None supplied
the human approval or silently became protocol law. The unselected Options A,
C, and D remain decision rationale and have no decision authority.

H-13 acceptance changes no accepted H-01 through H-12 decision, closes no
`GB-*` gap, and does not resolve H-14.

## Canonical unresolved question

Decide closed versus extensible object boundaries, unknown field/message/enum
behavior, extension namespace and required/optional semantics,
canonicalization/forwarding of extensions, schema-version rules, and
experimental feature graduation/removal.

## Why a human decision is required

Schema and runtime openness currently differ; evolution rules determine
forward compatibility and signed-object integrity.

The conflict cannot be resolved mechanically. Strict closure protects
authority and makes independent validation clearer, but reduces forward
compatibility. Preservation permits intermediaries and durable stores to carry
new optional data, but increases cryptographic, privacy, SDK, and persistence
complexity. Selecting that tradeoff establishes protocol semantics and
therefore requires accountable human disposition.

## Affected gaps and Phase work

| Kind | Identifiers | H-13 relationship |
| --- | --- | --- |
| Receipt representation | `GB-025` | Receipt schema, declarations, runtime construction, and accepted H-09/H-10/H-11 bindings disagree; Receipt openness and extension participation remain undecided |
| Error detail evolution | `GB-036` | The outer envelope is mostly closed while `details` is generic and open; no safe per-error evolution contract exists |
| Openness and extensions | `GB-042` | Core objects, open subobjects, extension declarations, extension values, and runtime checks have no consistent ownership model |
| Schema evolution | `GB-043` | No governed schema-bundle identity, immutable per-release schema policy, generation contract, or change classification exists |
| Backward compatibility | `GB-044` | New readers consuming older objects have no complete release/schema/history rule |
| Forward compatibility | `GB-045` | Old readers, SDKs, stores, and proxies have no complete unknown-field/enum/message preservation rule |
| Experimental lifecycle | `GB-046` | Default-off selection exists, but graduation, removal, persisted data, and historical meaning remain unresolved |
| Privacy and minimization | `GB-048` | Unknown and extension data lack one logging, inspection, retention, Receipt, and cross-tenant floor |
| Golden evidence | `GB-051` | No approved fixture corpus proves unknown, extension, evolution, signing, or old/new behavior |
| Requirements work | `D1-02`, `D1-07` | Would consume the accepted H-13 choice; not authorized by this acceptance |
| Schema, vector, and case work | `D2-01`, `D2-03`, `D2-04` | Would encode later approved requirements; no artifact is created here |
| SDK work | `E-01` | Would generate implementation-neutral SDK behavior after the requirements and schemas exist |
| Support and release policy work | `P1-04` | Would define support, compatibility, deprecation, release, and supply-chain policy while consuming approved H-13 evolution/compatibility semantics; not authorized here |

All affected gaps remain open. All listed Phase work retains its current Phase
status.

`P1-04` is policy work, not independent implementation work. H-13 neither
authorizes it nor owns support windows, deprecation timelines, release policy,
artifact publication, supply-chain policy, or signing/release authority.
Independent implementation remains separately owned by the applicable
canonical P1 work items and H-14 governance.

## Accepted-decision dependency and conflict ledger

Every complete accepted H-01 through H-12 record was inspected. Its approved
option, qualifications, security and compatibility consequences, deferred
ownership, and human disposition are binding inputs. H-13 may govern
representation openness and evolution but may not reinterpret their accepted
semantics.

| Accepted record | Binding input to H-13 | Conflict H-13 must not introduce |
| --- | --- | --- |
| H-01 | Discovery and preview remain non-authoritative. Selected extensions and experiments belong to immutable consent and final Connection state where applicable. Active Connections and historical objects retain their governing context. | Turning discovery extension data into authority, silently changing an active Connection, or applying later schema meaning to earlier history. |
| H-02 | Authentication, Connection authority, Trust, authorization, policy, Approval, execution, and evidence remain distinct. The Agent is the final authorization enforcement point and effective authority is their monotonic intersection. | Letting an extension create or widen authority, bypass the Agent, transfer Agent-to-Agent authority, or make body data authoritative by its presence. |
| H-03 | Openness is scoped to exact immutable release identity. Compatibility is explicit, directed, and non-transitive. Historical meaning is immutable; an optional member cannot silently become required. | Importing a later field or registry meaning into an earlier release, inferring compatibility from ordering, relabeling history, or creating a second schema/extension version negotiation. |
| H-04 | Required unknown capability/profile/extension items fail. Optional means omission preserves complete authority, security, input, output, side-effect, error, and historical semantics. Experiments are default-off and exactly selected; material changes require replacement. | Treating authority-critical data as optional, silently enabling an experiment, falling back to a nearby extension/profile, or changing selected material without preview, consent, and replacement. |
| H-05 | Authentication identity/revision, principal, target, audience, purpose, current proof, no-fallback, secret exclusion, and terminal compromise semantics remain exact. | Using an open authentication object to weaken bindings, accepting an unknown auth mode or key purpose as a safe default, or placing reusable secrets in extension data. |
| H-06 | Exact Grant-redemption retry converges on the same authoritative result and committed intent/result history is immutable. | Reinterpreting a committed Grant intent/result after schema evolution, or treating representational difference as authority for a second redemption. |
| H-07 | Extensions, experiments, omissions, limitations, release/schema evidence, and exact scope belong to the immutable Connection bundle where applicable. Current evidence can narrow but never widen or reinterpret it. | Enabling an unselected extension, repairing an old Connection from later metadata, widening scope, or mutating the bundle without replacement. |
| H-08 | Approval is exact-action, single-use, purpose-bound, and atomically consumed at the accepted boundary. H-13 owns only representation openness. | Ignoring unknown required Approval material, moving consumption, widening an action through an extension, or reinterpreting historical Approval evidence. |
| H-09 | Task is lifecycle truth, Result is terminal semantic/effect truth, and Receipt is evidence. The accepted states, transitions, cancellation races, retry identity, terminality, and retention boundaries are fixed. | Adding states by extension, guessing an unknown Task state as terminal/nonterminal/success/failure, rewriting Result history, or making a Receipt authority. |
| H-10 | H-13 decides participation. Once a field or extension participates in an H-10 protected projection it is covered exactly by the owning context; standalone proof requires an accepted registered domain. | Stripping, relocating, defaulting, reconstructing, or semantically normalizing participating material; redefining canonical JSON, digests, signatures, domains, algorithms, or proof profiles. |
| H-11 | Bootstrap, freshness, anti-rollback, revocation coverage, key purpose, compromise, terminal tombstones, and historical verification remain fail-closed and distinct from present authority. | Treating unknown revocation/history values as active, weakening durable floors, dropping security-significant signed extensions, or using current schema meaning for historical evidence. |
| H-12 | H-13 owns extra members, unknown enums/messages, namespaces, error-envelope extensibility, future resource-ID representation, and evolution. H-12 owns operations, status, media, redirects, TLS/DNS, limits, timeout, retry, cache, and observability. Unknown error identity is fail-closed/non-authoritative. | Changing H-12 transport or retry semantics, making query parameters authoritative, adding HTTP/auth fallback negotiation, or mapping unknown errors to retryable/success behavior. |

## Repository evidence inspected

The audit inspected the following repository evidence. The observed behavior is
descriptive, not governing.

### Governance, planning, and conformance architecture

- `docs/protocol/phase-15d-plan.md`, including the canonical H-13 row, all
  affected work IDs, and the gap closure register.
- `docs/protocol/normative-specification-gap-analysis.md`, especially
  `GB-025`, `GB-036`, `GB-042` through `GB-046`, `GB-048`, and `GB-051`.
- `protocol/decisions/README.md` and every accepted H-01 through H-12 record.
- `docs/protocol/conformance-architecture.md`, including authority ordering,
  schema-conformance dimensions, compatibility matrices, malicious cases,
  fixture planning, and independent implementation.
- `docs/protocol/phase-15d0-reference-register.md`; external material remains
  non-governing input and was not imported as protocol law.

### Historical `0.1-draft` prose and lifecycle material

- `protocol/specification/0.1-draft/extensions.md`, `profiles.md`,
  `conformance.md`, and `versioning.md`.
- Discovery, Passport, capability, authentication, Install Grant, Connection,
  Invocation, Approval, Task, cancellation, Result/Receipt, error, Trust,
  issuer, key, revocation, proof, and privacy prose under
  `protocol/specification/0.1-draft/`.
- `gbeps/GBEP-0002-extension-lifecycle.md`, including its draft lifecycle and
  independent extension-version ideas.

### Historical schemas and identifiers

- Every JSON schema under `protocol/schemas/0.1-draft/`, with focused review of
  `common`, `extension`, discovery, profile, capability, Passport, Connection,
  Invocation, Approval, Task, Receipt, error, Trust, issuer, key, revocation,
  proof, and signed-envelope structures.
- Existing `$id` values, draft-07 declarations, `additionalProperties` rules,
  enums, open maps, extension references, bounds, and required-member sets.

### Implementation, declarations, adapters, tests, and examples

- Protocol Core JSON parsing/serialization, required-member validation,
  extension identity/value validation, extension negotiation, profile checks,
  Task/Receipt validation, error construction, redaction, TypeScript source
  types, and generated declarations.
- Trust strict parsing, duplicate-name rejection, plain-data/resource checks,
  canonicalization, signing, verification, and proof-excluded projection.
- Issuer extension-bearing document construction.
- Native Agent discovery, extension negotiation, Invocation processing, Task
  and Receipt construction, binding checks, signing, persistence, and routes.
- Native Client request/response JSON handling, extension declarations,
  forwarding, Task/Receipt validation, error-detail propagation, and proof
  verification.
- Platform Native Client projection, sealed bindings, Receipt verification,
  generic adapters, and schema-compatibility analysis.
- Tests and examples concerning extension identifiers, optional/required
  negotiation, profile declarations, strict JSON, canonicalization, schemas,
  Task/Receipt behavior, wire parsing, errors, and Platform projection.
- Current fixture, test-vector, conformance, generated-type, and independent
  implementation planning surfaces; no H-13 golden corpus exists.

## Evidence contradictions and missing contracts

| Evidence surface | Observed contradiction or gap | Why it cannot decide H-13 |
| --- | --- | --- |
| Core object schemas | Most top-level objects use `additionalProperties: false`, but common payload, evidence, policy, proof, endpoint, limit, and detail maps are open. | A schema keyword does not explain semantic ownership, safe ignoring, forwarding, or authority. |
| Extension values | The common extension container accepts arbitrary JSON values, while extension declaration metadata does not bind each value to one selected declaration or object location. | Namespace shape alone does not establish meaning, bounds, requiredness, or H-10 participation. |
| Namespace rules | The common extension-key pattern, the extension declaration schema, and two runtime validators accept different forms; one runtime path lowercases identifiers while another permits case-insensitive matching without normalization. | Collision, aliasing, case, and signature behavior require one human-selected identity rule. |
| Profile bounds | Historical schema and runtime allow different extension profile-list maxima. Profile IDs are also represented differently across schemas and declarations. | Neither behavior has precedence; conformance cannot choose one implementation. |
| Runtime object validation | Runtime validators generally assert required members but do not reject unknown members, even where schemas close the corresponding objects. | Schema conformance and runtime acceptance disagree directly. |
| Extension negotiation | Runtime independently compares extension semantic versions and can degrade optional mismatches. Draft GBEP prose also suggests extension-specific negotiation. | That can become a second negotiation/version channel prohibited by H-03/H-04 unless H-13 constrains it. |
| Proof shape | A strict proof schema coexists with an open common proof object; generic open maps can appear inside protected documents. | H-10 needs H-13 to decide which values participate and may be preserved. |
| Canonicalization | Trust canonicalizes complete semantic JSON values; other serializers use ordinary insertion-order JSON. Unknown values may pass through SDKs and stores with different number/string/object behavior. | Verification, preservation, and reserialization are separate operations and need an explicit rule. |
| Receipt | Historical schema, TypeScript declaration, Native Agent construction, validator, and verification bindings disagree about required fields and accepted outcomes; Receipt has no consistent extension point. | H-09/H-10/H-11 constrain semantics, but openness and migration still require H-13. |
| Task | Historical schema/runtime include states superseded by accepted H-09 and provide no unknown-state contract. | Present implementation cannot override accepted lifecycle semantics or define forward compatibility. |
| Error | The outer object is closed, the code is pattern-open, `details` is generic/open, SDKs propagate it, and H-12 now fixes a different public identity/retry model. | Safe detail evolution and privacy need a governed H-12-preserving design. |
| Discovery and capability | Discovery is structurally closed but contains open endpoint maps; capability objects expose both an extension map and non-namespaced open contract/policy data. | Application payload openness must be distinguished from protocol Core extensibility. |
| Trust/issuer/revocation | Some owning documents have extension maps while nested key, status, entry, result, and proof structures are closed or generically open; enum vocabularies differ. | Unknown security meaning cannot be inferred safe from container placement. |
| Schema identity | Historical `$id` URLs identify mutable-looking `0.1-draft` paths; no immutable bundle manifest/digest or generation contract exists. | An identifier without release binding does not establish history or compatibility. |
| SDK and adapters | Broad `Record<string, unknown>` types coexist with narrow interfaces; some Platform bindings project selected fields while other paths return full objects. | Old SDKs/stores can drop or reconstruct unknown data unless preservation is a deliberate contract. |
| Fixtures | Tests verify current implementations; no static old/new reader-writer, signed-extension, graduation/removal, or privacy corpus exists. | Tests of current code are evidence, not an independent protocol oracle. |

The accepted H-03 release identity `ghostbridge/e1.r0-draft.1` does not relabel
the historical `ghostbridge/0.1-draft` schema directory. The latter remains
immutable legacy evidence and cannot be backfilled into the accepted release.

## Decision criteria

A viable H-13 choice should:

1. keep authority, lifecycle, security outcomes, and H-10 participation
   independently implementable and fail-closed;
2. preserve H-03 exact-release identity without a schema or extension side
   negotiation;
3. make every extension location and required/optional consequence explicit;
4. allow only demonstrably safe forward compatibility and make preservation
   obligations visible to SDKs, proxies, and stores;
5. retain immutable historical meaning across schema and experiment changes;
6. bound privacy and resource risks for semantically opaque data; and
7. support later schemas, fixtures, generated types, and independent
   conformance without treating current code as the oracle.

## Materially distinct top-level options

### Option A — Fully closed release schemas

Every Core object, message discriminator, and enum rejects unknown material.
Extensions can exist only as completely separate objects introduced by a new
H-03 release. Evolution is clear and safe for authority, signing, generated
types, and storage, but old readers cannot preserve new optional information
and nearly every evolution requires release/Connection replacement work.

### Option B — Closed Core with registered namespaced extension points

Core members remain closed by default. A mandatory per-object registry names
the only extension locations and classifies preservation, forwarding,
security, H-10 participation, and history. Required unknown extensions fail;
optional material can be ignored semantically only when H-04 optionality is
proven, and can be preserved/forwarded only under explicit lossless and privacy
rules. Separately registered extension messages are possible only after exact
selection. This option offers bounded forward carriage while preventing mixed
unknown Core fields from acquiring authority.

### Option C — Open Core objects with ignore/preserve semantics

Objects accept unknown members broadly. Endpoints ignore unknown values and
intermediaries attempt to preserve them. This maximizes syntactic forward
compatibility, but makes authority smuggling, enum fallback, signature
participation, data minimization, old-SDK loss, and store/proxy rewriting much
harder to detect. A context registry would still be needed to keep security
objects safe, eroding the option's simplicity.

### Option D — Negotiated openness and schema-bundle profiles

Each Connection selects an openness profile or compatible schema-bundle
revision. Deployments can choose strict or preserving behavior, but peers may
disagree about the same object, compatibility becomes profile-dependent, and
the profile/bundle can become a second protocol-version negotiation channel.
Conformance and downgrade surfaces grow substantially and conflict with the
accepted exact-release model unless subordinated so completely that this
collapses into Option B.

## Accepted option and decision rationale

Rudra approved **Option B — Closed Core with registered namespaced extension
points**, together with the complete corrected governance model below.

This selection follows from the repository contradictions and accepted
constraints rather than the existing schemas: broad openness cannot safely
distinguish authority-bearing unknowns, while full closure would prevent even
non-authoritative proxies and durable stores from carrying optional new
material. Option B confines ambiguity to explicit locations, preserves H-04
selection and H-10 coverage, and gives independent implementations a finite
registry to test.

The approval includes the registry, compatibility matrix, threat treatment,
explicit qualifications, all 30 dispositions, and all 14 residual risks. The
unselected options are not approved alternatives.

## Accepted governance model

The complete corrected model in this section has H-13 protocol-governance
decision authority. It has no direct normative or executable force and requires
separately authorized downstream requirements and artifacts.

### Terms and default object openness

- **Core member** means a member whose name and semantics are owned by the
  selected H-03 release for that object class.
- **Protocol object** means a Ghost Bridge control, authority, lifecycle,
  security, evidence, or error object. Application input/output governed by a
  Capability data contract is not made into Core merely because it is carried
  by a protocol object.
- **Extension point** means a location explicitly listed in the per-object
  openness registry and represented by a namespaced extension container or a
  separately registered extension message. Arbitrary mixed-in unknown members
  are not extension points.
- **Known extension** means an exact extension identity and release-scoped
  definition present in the immutable selected release material and, where
  applicable, in the H-04/H-07 Connection selection.
- **Unknown** means not defined by the exact selected release and applicable
  selection. A later registry, current package, or implementation cannot make
  a value known retroactively.
- **Preserve** means retain the exact H-10-eligible JSON semantic value and its
  governing identity without using its unknown semantics. It does not promise
  preservation of insignificant JSON whitespace or object-member order.
- **Forward** means transmit preserved material only where the registry permits
  that role, while retaining the exact release and owning object/message
  context plus every tenant, organization/workspace, principal, audience,
  target, scope, Connection, and purpose binding that applies to that object or
  accepted context. Forwarding does not assert semantic validity.

Release and owning object/message context are always preserved. A tenant,
organization/workspace, principal, audience, target, scope, Connection, or
purpose binding is preserved exactly where the owning object or accepted
context has it; a genuinely public or non-tenant object does not acquire a
fictitious binding. Public discovery remains non-authoritative, and public
issuer, key, and revocation evidence remains governed by its H-11/H-12 context.
Material bound to one context cannot cross to a different bound context.
“Public” never means authority-bearing, safe to log, or universally
forwardable, and the per-object registry still decides whether preservation or
forwarding is allowed at all.

The accepted default is: every protocol object's Core field set is closed;
every field outside an explicit registered extension point is rejected; and
an extension point exists only where the following registry says it may. Open
application data contracts and keyed collections are separately bounded data
domains, not a license to add protocol semantics.

### Per-object openness registry

This registry is governance-level decision evidence, not JSON Schema. “Reject”
means the object cannot be used for the requested protocol operation. “Opaque”
means structurally validated, bounded, and non-authoritative without semantic
interpretation. This accepted record still requires separately authorized later
normative work to turn each row into exact requirements and schemas.

| Object / message class | Core openness | Extension point | Unknown Core member | Unknown extension | Unknown enum / message | Preservation / forwarding | Security / authority sensitivity | H-10 protected participation | Historical / evolution rule |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Discovery | Closed | One advertised-extension declaration container; no mixed members | Reject | Preserve opaque optional advertisements; required unsupported means incompatible, never authority | Unknown feature/profile identifiers are opaque advertisements only; unknown Core discriminator rejects | A discovery proxy may forward bounded advertisements in the same public context; endpoints must not treat them as selection | Non-authoritative but security-sensitive because it starts selection | If discovery is protected, all registered extension entries participate in the owning projection | Later discovery cannot alter consent, Connection, or history |
| Release metadata and schema-bundle descriptor | Closed | No ordinary object extension; only manifest-declared metadata slots fixed by the release | Reject | Reject unless the release manifest already defines the slot | Unknown release/profile/schema identity rejects; no fallback | Preserve whole historical artifact; do not partially reconstruct | Critical to anti-downgrade and interpretation | Entire protected descriptor participates except H-10-declared proof self-field | Immutable per H-03; non-semantic append-only errata may clarify without changing validation, required/optional behavior, generated types, schema identity, canonical/H-10 participation or protected bytes, extension/authority/security meaning, or historical interpretation; any behavioral or semantic correction requires a new H-03 identity and explicit directed compatibility analysis |
| Passport | Closed | Registered `extensions` container | Reject | Required/authority-critical unknown rejects; optional opaque value may be preserved but not used | Unknown status, profile, auth, key-purpose, or capability class rejects current use | Preserve/forward only within the selected release and every applicable Passport/accepted-context binding; terminal consumers may ignore optional semantics but must not claim them | Identity, Trust, capability, and authentication critical | Every extension entry in the protected Passport projection is covered by the owning H-10 context | Historical Passport retains original release, extension selection, and proof meaning |
| Capability collection envelope | Closed | No collection-level semantic extension; item extensions are inside items | Reject | Reject at envelope | Unknown collection discriminator rejects | Items may be preserved individually; collection metadata cannot hide extensions | Discovery is non-authoritative; item content influences later selection | Protected collection entries participate if a collection proof is later defined | New collection fields require new release; old collections remain historical snapshots |
| Capability item / contract | Closed | Registered `extensions` container; application input/output schemas remain separate data contracts | Reject | Required unknown rejects; optional opaque may be preserved but cannot widen capability or authority | Unknown risk, effect, approval, receipt, or status value rejects selection/use | Preserve known-safe optional presentation data; authority-affecting extensions must be known, selected, and required | High: shapes allowed action, data, approval, and effects | All participating extension values are covered in the owning contract/manifest projection | Later contract meaning cannot rewrite a selected Connection or past Invocation |
| Authentication messages and profile data | Closed | Profile-specific registered container only | Reject | Unknown required rejects; unknown optional can be carried only when proven non-secret and non-authoritative | Unknown mode, algorithm, principal type, proof result, or key purpose rejects; never default | No cross-target forwarding; preserve only inside same exact authentication exchange where registry permits | Critical; reusable secrets are prohibited | Protected profile data participates in its exact H-10 request/object context | Profile identity/revision and bindings are immutable; compromise semantics unchanged |
| Install Grant issue | Closed | Registered container only for issuer metadata that cannot change the secret, scope, expiry, purpose, or redemption rules | Reject | Required unknown rejects; optional opaque may be preserved | Unknown Grant state/purpose rejects | Do not forward secret-bearing material; preserve selected metadata with the Grant | Authority-creation and secret-sensitive | Participating extension is covered by the Grant's owning proof if protected | Issued Grant intent is immutable; later schemas cannot reinterpret it |
| Install Grant resolution / preview | Closed | Registered non-authoritative presentation container | Reject | Optional unknown may be preserved/ignored; required unsupported means incompatible before redemption | Unknown resolution status rejects; never treat as successful preview | Preserve every scope or other context binding that exists; do not invent one for public preview material; no secret or authority inference | Non-authoritative preview but privacy-sensitive | Protected response covers registered extension values | Later metadata cannot alter redemption intent or committed result |
| Install Grant redemption request/result | Closed | Only registered, selected extensions whose complete semantics are part of exact intent/result equality | Reject | Unknown required rejects; unknown optional must be absent from authority-critical intent unless omission is H-04-safe | Unknown result/discriminator rejects | Preserve exact committed request/result; do not drop or add material on replay | Critical authority and idempotency boundary | Every participating extension is covered and included in H-06 exact-intent comparison as registered | Exact replay converges; no schema evolution rewrites a committed result |
| Connection | Closed | Registered selected-extension bundle and per-extension value container | Reject | Unknown required rejects; an unsupported optional extension is not selected for active use and its value is absent from later governed occurrences, while offer/omission/limitation evidence remains in the immutable bundle; present-but-unselected rejects | Unknown lifecycle/profile/limit/selection result rejects | Persist the full immutable bundle, including what was offered, omitted, selected, and limited; forwarding only within its bound context; never reconstruct from current metadata | Primary durable authority bundle | All selected extension identities, versions/revisions, requiredness, omissions, limitations, and participating values are covered where H-10 protects the Connection | Material change requires preview, consent, and replacement; old Connection stays pinned |
| Invocation | Closed | Registered `extensions` container for exactly selected extensions | Reject | Unknown/unselected rejects; known required occurrence must be present; optional occurrence may be absent only by registered semantics | Unknown operation/discriminator/effect class rejects; no generic route | Proxy may preserve selected opaque optional data only if it does not evaluate authority/effects; endpoint must understand every authority-critical value | Critical acceptance and effect boundary | Every participating extension value is part of the owning protected Invocation projection; no stripping/defaulting | Meaning is fixed at acceptance; later release cannot reinterpret accepted input/effect |
| Approval challenge | Closed | Registered selected-extension container; authority-critical extensions must be required | Reject | Unknown required rejects; optional presentation value may be opaque | Unknown challenge/action/purpose discriminator rejects | Preserve within exact action; no cross-action forwarding or mutation | Exact-action authority gate | Participating extension is included in exact action and owning H-10 projection as registered | Historical challenge keeps original exact action and release semantics |
| Approval decision | Closed | Registered selected-extension container only where decision semantics remain exact | Reject | Unknown required rejects; optional non-semantic data may be opaque | Unknown decision/outcome/purpose rejects; never map to approve/deny | Preserve exact evidence; do not synthesize missing extension values | Critical, single-use, purpose-bound | Participating values covered by decision proof; cannot be relocated to challenge or Invocation | Consumption and decision evidence are immutable; evolution cannot restore/reuse |
| Task | Closed | Optional registered presentation/progress container only; never lifecycle extension | Reject | Unknown authority/state extension rejects; optional display data may be opaque | Unknown Task state or transition rejects/quarantines the Task for semantic use; never guessed terminal or nonterminal | A monitor may preserve opaque display data but cannot advance state from it | Lifecycle truth; highly critical | Protected Task snapshot includes registered extension data; state always Core | H-09 state machine is fixed; later states require H-03/H-09 governance, not extension |
| Cancellation intent | Closed | No ordinary semantic extension; a future release may register non-authoritative correlation metadata | Reject | Reject unless already registered as optional metadata | Unknown cancellation action/result rejects; transport abort is not cancellation | Preserve the exact accepted intent and correlation only | Race, authorization, and side-effect critical | Protected cancellation intent includes every registered member | Race winner and terminal history are not reinterpreted |
| Result | Closed protocol envelope; capability output remains its declared data domain | Registered envelope metadata container only | Reject | Required unknown rejects; optional opaque metadata may be preserved | Unknown terminal semantic/effect outcome rejects; output-owned enums follow exact data contract | Preserve committed Result and output according to contract; never infer success from unknown metadata | Terminal semantic/effect truth | Every protected envelope extension participates; output digest/coverage follows H-09/H-10 | Result is immutable; new readers use original release and data contract |
| Receipt | Closed | Explicit registered `extensions` container, with stricter Receipt profile and minimization rules | Reject | Unknown required or binding-relevant extension rejects verification/use; optional opaque may be preserved only if safely bounded and protected | Unknown outcome, proof, revocation, historical, billable, or verification class is non-authoritative and rejects semantic verification | Preserve the complete protected Receipt; forwarding does not make it authority; no field projection that drops extensions | High-value evidence containing tenant, action, outcome, and Trust bindings | Every registered Receipt extension participates in the owning Receipt projection unless a later accepted H-10 domain explicitly says otherwise | Original release/schema/extension identities govern forever; no graduation/removal rewrite |
| Issuer metadata | Closed | Registered signed extension container; no weakening of bootstrap or endpoint policy | Reject | Unknown required/security extension rejects; optional opaque data cannot create Trust | Unknown status, Trust profile, algorithm, purpose, or endpoint class rejects current use | Preserve signed artifact; do not use opaque extensions to select keys/endpoints | Bootstrap and Trust critical | Every extension entry in the protected metadata projection is covered | Metadata sequence/floors and historical verification retain original meaning |
| Key metadata and JWK-facing protocol structures | Closed | No arbitrary JWK extension; registered key-metadata extension only when purpose and criticality are explicit | Reject | Unknown security-critical rejects; optional display metadata may be opaque outside the JWK cryptographic identity | Unknown key type, curve, algorithm, use, purpose, status, or compromise result rejects | Never forward material across different applicable issuer/tenant contexts; preserve genuinely public historical evidence as a whole under H-11/H-12 without inventing a tenant | Cryptographic and compromise critical | Participating key-metadata extension covered by owning proof; JWK thumbprint members remain H-10-owned | No later extension changes key identity, purpose, or past validity |
| Revocation snapshot / set | Closed | Registered signed extension container; no extension may alter chain/floor semantics | Reject | Unknown required/security extension rejects; optional opaque cannot affect current status | Unknown snapshot type, chain status, or verification outcome is indeterminate/non-authoritative | Preserve complete protected snapshot for history; do not merge opaque values into current state | Anti-rollback and current-authority critical | All registered entries participate in signed snapshot projection | Chain and floor are immutable; later schema cannot repair or reinterpret old snapshot |
| Revocation status / entry | Closed | Registered signed extension container only for exact subject/status evidence | Reject | Unknown required rejects; optional opaque never means active | Unknown subject type, status, reason class, terminality, or historical result is indeterminate; never current authority | Preserve for diagnostic/historical review; do not forward as current authorization evidence | Current denial and historical classification critical | Participating values covered by owning entry/status proof | Terminal tombstones, effective times, and original meaning persist |
| Revocation history / checkpoint | Closed | No arbitrary semantic extension; manifest-registered protected metadata only | Reject | Unknown required rejects; optional opaque cannot bridge chain gaps | Unknown transition/checkpoint type makes the affected history indeterminate | Preserve entire chain element; no coalescing or rewriting | Historical integrity and rollback critical | Protected checkpoint extension participates in its exact domain | History is append-only/immutable; new schemas do not backfill |
| Protocol error envelope | Closed | No general Core extension container; only the registered `details` mechanism below | Reject | Not applicable outside `details` | Unknown error identity remains H-12 fail-closed, non-authoritative, and never retryable by inference | May preserve an envelope for diagnostics under H-12 privacy limits; never forward credentials/secret context | Security and disclosure sensitive, but not authority | H-10 participation only if a separately accepted protected error object exists; H-13 does not create one | Error meaning follows originating release; status/retry mappings remain H-12 |
| Error details | Closed per error identity | Explicit namespaced optional detail entries registered by the release | Reject unregistered Core detail names | Unknown optional namespaced detail may be preserved/surfaced as opaque after redaction; unknown required detail makes the error detail set incompatible but never changes base identity | Unknown detail discriminator is opaque only; no effect on identity, retry, status, or authority | No forwarding across different applicable tenant, principal, audience, target, scope, or purpose bindings; SDK may expose a bounded opaque wrapper, not auto-log value | High privacy risk; intentionally non-authoritative | Normally not separately protected; if included in a protected owning object, all entries participate | Origin release controls detail meaning; later localization/display text never changes machine identity |
| Profile and feature declarations | Closed | No arbitrary member extension; new declaration identities come through immutable release registry and H-04 selection | Reject | Unknown required declaration fails; an optional advertisement may be opaque before selection, while an unselected active value is absent afterward and its required omission/limitation evidence remains in the Connection | Unknown profile/feature state rejects selection or stays non-authoritative advertisement | Preserve preview advertisements and the final Connection evidence of what was offered, omitted, selected, and limited; only the exact understood selected set is active | Negotiation and downgrade sensitive | Protected Connection selection covers exact declaration identities and states | Later registry cannot add a feature to an active Connection |
| Extension declarations | Closed | The object is itself the governed declaration; no recursive generic extension container | Reject | Unknown declaration members reject; extension-owned metadata must be inside its registered schema | Unknown lifecycle/requiredness/profile/dependency class rejects selection | Preserve complete immutable declaration as release evidence; no recursive negotiation | Selection and downgrade sensitive | Declaration participates in release/Connection proof where protected | Identity and selected definition immutable; compatibility link is not aliasing |
| Extension value containers | Closed container semantics with only valid registered names as map keys; each value follows its registered schema | Any member is an extension point only by exact namespace registration and selection | Non-namespaced/invalid/unregistered key rejects | Unknown optional value is opaque only in preview, forwarding, or historical contexts explicitly allowed; required unknown rejects | Extension-owned unknowns follow its registered enum/message class and cannot default | Preserve exact JSON semantic value only if representation is lossless and context permits; otherwise reject | Sensitivity inherited from owner and extension; cannot widen authority | Every value inherits owning object's H-10 projection; standalone proof needs accepted domain | Container and entries retain original release and extension identity |
| Separately registered extension messages | Closed base dispatch envelope plus exact selected extension payload | Only after immutable release registration and H-04 selection | Unknown base member/discriminator rejects | Unknown/unselected extension message rejects endpoint dispatch; a pure proxy may preserve only where explicitly registered | Unknown message/union tag never routes to generic success or a Core state transition | Forward-only implementations must label semantics unevaluated and keep the exact release, owning message context, and every applicable binding | Inherits operation sensitivity; cannot invent H-12 operations or authority | Protected payload participates in registered owning domain; no generic standalone signature | New message type requires release governance; old history remains under original type |

### Unknown Core fields

The accepted choice is **reject** for every unknown member outside a registered
extension point. Ignore and preserve-and-forward are rejected as Core defaults:

- ignoring can smuggle authority or security meaning past old endpoints;
- preserving a mixed unknown does not say whether it participates in H-10;
- old SDKs and relational/document projections routinely drop or rewrite
  unknown members; and
- open-by-default Core makes independently generated validators disagree about
  where protocol semantics end and application data begins.

A registry may classify an explicit keyed collection or application payload as
open data, but that is a positive definition of the field's data domain, not a
context-dependent exception for unknown Core fields.

### Unknown enum values

Unknown enum values are never mapped to a “safe” known value.

| Enum class | Accepted endpoint behavior | Application visibility | Preservation / forwarding |
| --- | --- | --- | --- |
| Authority, lifecycle, and state | Reject semantic use; quarantine durable object if needed for evidence | May expose an `unknown` wrapper for diagnostics, never a substituted state | Preserve only for history/diagnostics; no authority forwarding |
| Security, Trust, revocation, and proof outcome | Fail closed or classify indeterminate as defined by the owning accepted decision | Opaque diagnostic value only, redacted | Historical preservation allowed; never becomes current authority |
| Algorithm, profile, key purpose, and authentication identity | Reject selection, verification, or authenticated use; no fallback | Exact opaque identifier may be reported safely | Preserve signed artifact as history; do not negotiate/forward as supported |
| Error identity | Apply H-12 unknown-error rule: non-authoritative, no inferred retry, status, or success semantics | Surface bounded exact identity plus safe generic handling | Preserve under error privacy limits; details remain non-authoritative |
| Informational/display enum | Preserve opaque; local UI may show safe generic “unrecognized” presentation | Yes, through an unknown-value wrapper | May forward only where the object registry permits |
| Extension-owned enum | Apply the registered extension classification; required/security unknown fails, optional informational unknown may be opaque | Only if the extension registry permits | Preserve/forward only under owning object and extension rules |

An unknown H-09 Task state is never guessed as success, failure, terminal, or
nonterminal. An unknown H-11 revocation or historical-verification result is
never current authority.

### Unknown messages, discriminators, and union tags

An unknown base protocol message, operation discriminator, resource kind, or
Core union tag is rejected before dispatch. It cannot route to a generic
success handler, mutate lifecycle state, consume Approval, create a Task, or
trigger an effect.

An extension-owned message type may exist only when its exact identity,
payload class, owning operation/context, requiredness, H-10 domain
participation, privacy class, and limits are registered in the exact H-03
release and exactly selected under H-04. It cannot create a new H-12 HTTP or
authentication negotiation path. A forwarding-only proxy may carry a message
only when its registry row expressly permits that role, and must not assert
that the unknown extension semantics are valid.

### Extension location model

The accepted model is a constrained hybrid:

1. registered namespaced extension containers are the default extension
   location for object-local data;
2. separately registered extension messages may exist only for an already
   selected extension and an already governed operation/context;
3. arbitrary unknown members mixed with Core members are prohibited; and
4. an extension cannot silently introduce a new HTTP resource, status mapping,
   authentication method, profile-negotiation path, lifecycle transition, or
   authority source.

Ordinary optional extensions may add presentation, correlation, diagnostic, or
other semantics only when complete omission satisfies H-04. They may not add
authority-bearing Core semantics. A governed extension may impose an
authority/security restriction only if the release registry classifies it as
authority-critical, it is required for selection and at every relevant object
occurrence, all parties that evaluate the action understand it, it participates
in H-10 as registered, and it only narrows the accepted H-02/H-07
authorization intersection. It can never widen that intersection.

### Extension namespace and identity

The accepted namespace policy is:

- one immutable, case-sensitive, lowercase ASCII identifier consisting of a
  reverse-DNS owner followed by `/` and an extension name;
- ASCII labels use lowercase letters, digits, and internal hyphens; the name
  may additionally use `.` and `_`; identifiers are bounded to 255 ASCII
  characters, with exact component bounds left for later schema work;
- comparison is exact code-unit equality; receivers never lowercase, Unicode
  normalize, trim, alias, or otherwise repair an identifier;
- duplicate identities, including duplicate declaration entries, reject the
  containing selection or object even when values appear equal;
- a namespace is never reassigned and aliases are prohibited;
- an explicit compatibility link records a relationship between two immutable
  identities but never makes them aliases or substitutes;
- experimental versus stable state is immutable release-registry metadata, not
  an alternate case or normalization convention; graduation uses a new stable
  identity under the accepted lifecycle below; and
- the release-scoped declaration records protocol-level semantic ownership and
  change-control responsibility. H-14 still decides registry operator,
  publisher identity, package ownership, signing/publication authority, and
  release process.

The later normative grammar must choose exact label and character bounds. This
acceptance intentionally creates no JSON Schema or registry entry.

### Required, optional, unsupported, and absent extensions

“Optional” describes whether the entire extension or a registered occurrence
may be omitted without any semantic difference under H-04. It does not mean
“ignore anything under this namespace.” Selection optionality and per-object
occurrence optionality are separate immutable attributes.

| Condition | Accepted consequence |
| --- | --- |
| Known required extension | Exact release definition, dependencies, profiles, security prerequisites, and bilateral support must be satisfied and the extension must be in final selection; otherwise compatibility fails. |
| Known optional extension | It is selected for active use only with exact bilateral support and all other H-04 conditions. If not selected, its value/semantics is absent from later governed object occurrences, but the H-07 Connection bundle durably retains every required offer, omission, limitation, and selection fact. That evidence neither creates authority nor selects the extension. |
| Unknown required extension | Compatibility or object use fails. It is never ignored, guessed, or downgraded to optional. |
| Unknown optional extension during preview/discovery | May be retained as a bounded, non-authoritative advertisement where that registry row allows; it is not selected by an implementation that does not understand it. |
| Unknown optional extension on an authority/lifecycle message | Reject unless the receiver is an explicitly permitted forwarding-only intermediary that does not evaluate the object and can preserve it losslessly. |
| Unsupported required extension | Compatibility fails with the H-12-safe public error treatment; no nearby version/profile fallback. |
| Omitted optional extension | Valid only when its registered omission proof satisfies H-04 for the entire input, output, effect, authority, security, error, and history semantics. The immutable Connection evidence retains the omission/limitation and enabled set so exact replay/history can prove what was offered, omitted, selected, and limited without making the omission authoritative. |
| Duplicate or conflicting identity | Reject the declaration set/object before selection or verification; no first/last-wins behavior. |
| Required extension with unavailable dependency | Compatibility fails. Dependencies are not recursively negotiated and cannot be silently dropped. |
| Optional extension with unavailable dependency | The extension is not selected for active use and its omission/limitation is durably recorded in the Connection bundle. If already selected on an active Connection, the loss is a material support change handled by replacement/security rules, not silent omission. |
| Extension selected on the Connection but absent later | Apply the extension's registered per-object occurrence: absence rejects when required at that occurrence; absence is valid only when occurrence is explicitly optional. |
| Extension present but not selected on the Connection | Reject for governed Connection traffic, even if the declaration calls it optional. Presence cannot self-select it. |
| Extension value violates its registered schema/limits | Reject the owning object; do not preserve it as though it were a merely unknown optional extension. |

### Dependencies and conflicts

An extension declaration may identify a finite, acyclic set of exact extension
dependencies, incompatibilities, an exact owning H-03 release identity where
needed, required Core profiles/features, object occurrences, and security
prerequisites. Each extension definition is owned by one exact H-03 release,
and every declaration is part of that immutable release registry and the H-04
selection input.

Accepted rules:

- dependencies use exact registered identities and exact release-scoped
  definitions. A dependency may name an exact owning release identity where
  needed; use under another exact release is permitted only through explicitly
  recorded H-03 compatibility evidence applicable in that exact direction;
- “at least release X,” numeric release floors, shared-epoch proximity,
  `latest`/`current`, semantic-version ranges, and monotonic version comparison
  never prove extension compatibility or safety;
- the complete dependency closure and all conflicts are evaluated before final
  selection, with deterministic rejection on cycles, duplicates, ambiguity,
  or unsatisfied required prerequisites;
- no dependency is fetched and activated recursively at runtime;
- dependency resolution never chooses a newer, lower, nearest, alternative,
  generically “compatible,” or first-common release/dependency as fallback and
  never becomes a second H-03 negotiation channel;
- selection is recorded in the H-07 Connection bundle, including omissions and
  limitations; and
- later registry or deployment changes cannot mutate that bundle. Material
  change requires the accepted preview/consent/replacement path.

### H-10 signed and digested extension treatment

H-13 defines the accepted participation rules in this record; H-10 exclusively
controls eligible values, canonical bytes, domains, digests, signatures, proof
profiles, self-field exclusion, and verification ordering.

1. An object registry and extension definition must state whether each
   extension occurrence participates in the owning semantic object. For every
   currently protected object in this accepted model, all entries of its registered
   extension container participate in the owning protected projection unless
   a future accepted H-10 domain explicitly defines a different owning object.
2. A participating extension is not a detachable unsigned annotation. A
   verifier may not strip, relocate, default, reconstruct, redact inside,
   semantically normalize, or replace it and still claim the original proof.
3. A verifier can cryptographically verify an unknown-but-participating value
   without understanding its application semantics only when it can validate
   that the JSON value is H-10-eligible, losslessly represent the exact JSON
   semantic value, identify the exact owning H-10 projection/domain from the
   original release, and verify the proof. That establishes integrity only,
   not extension conformance, authority, safety, or application meaning.
4. An unaware proxy may forward the complete protected object unchanged in
   semantic content when the per-object registry permits forwarding. It must
   not describe the extension or entire object as semantically validated if it
   did not understand every required/security-critical component.
5. If a runtime, generated type, parser, number model, database, mapper, or
   serializer cannot preserve a participating value losslessly, it must reject
   or use a bit/byte-preserving opaque carrier expressly allowed by later
   requirements. It cannot drop or approximate the value.
6. A standalone extension proof is not inferred from a namespace or existing
   generic proof. It requires a separately accepted H-10 registered domain and
   purpose.

### Canonicalization, preservation, forwarding, and local use

These operations are distinct:

| Operation | What it establishes | What it does not establish |
| --- | --- | --- |
| Semantic understanding | The implementation knows the selected extension definition and can apply its meaning | Structural validity or cryptographic integrity unless separately checked |
| Structural validation | JSON eligibility, duplicate-key safety, namespace, bounds, and registered shape are valid | Authority, effect safety, or proof validity |
| H-10 canonicalization | One eligible semantic value maps to the accepted protected bytes | Permission to ignore, mutate, forward, or apply unknown semantics |
| Cryptographic verification | The exact participating semantic projection is intact under the accepted proof context | Authorization, current Trust, revocation safety, extension support, or application meaning |
| Preservation | The exact semantic value and identity can survive the required storage/round trip | Local semantic support or permission to forward |
| Forwarding | The registry permits retransmission while the exact release, owning object/message context, and every applicable context binding are retained | Semantic validation, new authority, or permission to invent a binding absent from a genuinely public object |
| Local application use | The implementation understands and is authorized to act on the selected extension | Permission to change the protected or historical object |

“Ignored” therefore never means “dropped.” A terminal endpoint may ignore the
semantics of an optional informational value only when the registry permits and
H-04 omission is safe. A proxy or durable store with a preservation obligation
must retain it even though local application code does not interpret it.

### Mutation and round-trip rules

An unaware implementation may:

- parse and reserialize an unprotected or H-10-canonicalizable object only when
  it preserves the exact JSON semantic value, member presence, array order,
  number value, string code points, extension identity, and owning context;
- change insignificant wire whitespace or object-member order when doing so
  does not change H-10 semantic content or an already-carried protected form;
- copy a registered unknown optional extension only where preservation and
  forwarding are permitted; and
- add its own extension value only when that extension is registered, selected,
  allowed at that object occurrence, and any protected object is newly created
  and proven by an authorized producer under H-10.

It may not:

- normalize strings or numbers, convert large/precise numbers through a lossy
  runtime type, turn absence into `null`/empty/default, or materialize defaults;
- remove, rename, re-parent, merge, split, or reinterpret unknown extension
  data;
- attach locally generated extension material to someone else's protected
  object while retaining the original proof;
- use parse/serialize success as evidence of extension semantics; or
- rewrite a historical object into a current schema merely to make it validate.

A transparent byte-preserving proxy may forward an original protected carrier
without semantic interpretation if the registry and H-12 context permit. It
must still enforce transport/resource boundaries and every tenant, scope,
audience, target, purpose, or other owning-context boundary that applies. It
does not invent such a binding for a genuinely public object and cannot claim
semantic conformance.

## Schema identity and evolution model

### Accepted identity relationship

The accepted choice combines the useful parts of “immutable schemas subordinate
to a release” and “bundle manifest/digest subordinate to a release”:

| Identity | Accepted role |
| --- | --- |
| H-03 release identity | Sole protocol selection and compatibility identity; exact, immutable, and bound to Connection/history |
| Schema-bundle identity/digest | Immutable integrity identity of the complete schema/registry/generation input set, named by the H-03 release; not independently negotiated |
| Individual schema identity | Immutable identifier for one exact schema artifact inside that bundle; never overwritten or repointed |
| Schema revision | Build-time provenance before release; after release any semantic or validation change requires a new individual identity, bundle, and H-03 release/revision as classified below |
| Implementation package version | Deployment metadata only; never a wire identity, compatibility claim, or schema-selection input |

The exact release manifest would bind every schema identity and digest,
openness-registry revision, extension definition, generator input/profile, and
compatibility assertion. H-13 creates no such manifest. Runtime peers negotiate
only H-03/H-04 material; they do not negotiate schema URLs, bundle digests,
package versions, or independent extension semantic-version ranges.

Once published for a release, schema content and identifiers are immutable.
Descriptions may be clarified only through non-semantic errata that do not
change validation, generated types, canonical participation, or meaning. Any
behavioral correction receives a new H-03 identity and explicit directed
compatibility analysis. A mutable remote `$id` target is never sufficient
release evidence.

### Backward compatibility

A newer implementation consuming an older-release object must select the
object's exact original H-03 release, original schema bundle, registry,
extension identities, H-10 profiles, and accepted historical semantics. It may
support that release through an explicit H-03 directed compatibility edge or a
native historical reader. It must not validate the object only against a
current schema, materialize current defaults, backfill new extensions, relabel
the object, or turn historical evidence into current authority.

If the original release artifacts are unavailable or their identity/integrity
cannot be established, the object is unsupported or historically
indeterminate according to its owning accepted decision. “Newest reader” does
not mean “current semantics apply.”

### Forward compatibility

An older implementation encountering newer material has distinct safe modes:

- **reject** when the release, Core member, required extension, security/state
  enum, message, or discriminator is unknown;
- **preserve but do not interpret** only at explicit extension points and only
  for roles and objects allowed by the registry;
- **locally ignore but preserve** only for registered optional informational
  semantics satisfying H-04;
- **forward only** only with lossless representation, intact protected content,
  the exact release and owning object/message context, every applicable bound
  tenant/scope/principal/audience/target/Connection/purpose value, and no
  semantic-validity claim; and
- **continue authority evaluation** only when every authority-, state-,
  security-, effect-, and required extension semantic is understood under an
  explicit H-03 compatibility edge.

No forward-compatibility rule creates present authority from an unknown value.

### Change-compatibility matrix

“Same release” means the already immutable published release and bundle. A new
artifact under the same release label is not a compatible change; it is an
impermissible mutation. “Replacement” refers to using the changed material for
governed authority on an active Connection, not merely installing newer
software that continues to honor the existing selection.

| Change type | Old reader / new writer | New reader / old writer | Same-release eligibility | H-03 release / revision consequence | Connection replacement consequence | Historical-object consequence | Security / privacy concern |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Add optional Core field | Old closed reader rejects if emitted; explicit compatibility edge may require writer omission | Safe only if absence has no defaulted/new meaning | No | New H-03 identity and explicit directed edges | Yes before the new field is used on governed traffic | Never backfill field into old objects | Old endpoint could miss authority/privacy meaning |
| Add required Core field | Old reader rejects | Old object lacks requirement and remains valid only under old release | No | New H-03 identity; breaking toward old writers/readers | Yes | Never mark old object invalid under its original release | Defaulting would forge intent/history |
| Remove optional or required Core field | Old reader may require or interpret it; new writer is incompatible | New reader must use old schema when reading old object | No | New H-03 identity; usually breaking | Yes | Field and meaning remain in old history | Removal can erase bindings, consent, or minimization evidence |
| Change field type or union shape | Reject or misparse; no coercion | Must use original type for old release | No | New H-03 identity; breaking unless explicit representation bridge exists | Yes | No coercion/rewrite of history | Coercion can change signed value or authority |
| Widen numeric/string bounds | Old reader may reject new values | Reads old narrower values | No for schema mutation; a predeclared range remains usable | New H-03 identity if artifacts/accepted values change | Yes when new values may appear | Old values retain original bounds and meaning | Larger values increase resource/privacy risk |
| Narrow numeric/string bounds | New writer may emit values old reader accepts, but newer system rejects older edge values | New reader must still accept old values under old release | No | New H-03 identity; backward-incompatible without historical reader | Yes for new selection | Old valid values never become historically invalid | Can strand durable evidence or force lossy migration |
| Add value to authority/lifecycle/security enum | Old reader rejects; must never default | Reads old values | No | New H-03 identity and explicit compatibility; owner decision may also be required | Yes before value can occur | Old semantics unchanged | Old implementation could guess unsafe state |
| Add informational/display enum value | Old reader may preserve opaque only if the original schema already defined an open identifier class; closed enum rejects | Reads old values | No for closed enum; yes only within a pre-registered open display class without artifact change | New release when enum/schema changes | Usually yes if release selection changes; not for already-permitted opaque value | Preserve exact old/new identity | UI/logging may disclose or mislabel unknown value |
| Remove enum value | Old writer may still emit it; new reader must use old release reader for history | Old reader knows a value new writer no longer emits | No | New H-03 identity; breaking for current interop | Yes for changed selection | Removed value remains valid historical evidence | Mapping to another value rewrites state/security meaning |
| Change enum meaning | Syntactically invisible and therefore dangerous | Syntactically invisible | Forbidden | New identity/name is required; old meaning immutable | Yes | Never reinterpret historical instances | Semantic substitution can widen authority |
| Add optional extension definition | Old endpoint cannot select it; preview proxy may preserve advertisement | New endpoint interoperates when extension is omitted | No after release publication | New H-03 release/bundle; optional compatibility edge may permit omission | Yes only to select/use it; existing Connection remains unchanged | No insertion into old selection/history | Omission must satisfy full H-04 semantics |
| Add optional value under an already selected extension | Old reader behavior follows the extension's immutable unknown-value class; otherwise rejects | Reads old value set | Only if the existing registered schema/class already permits that exact optional evolution without artifact change | Otherwise new H-03 identity | If semantics or selection materially changes, yes | Preserve original extension definition with object | Store/SDK loss and H-10 mismatch risk |
| Add required extension | Old reader/writer incompatible | New endpoint cannot require it when speaking old release | No | New H-03 identity; breaking selection | Yes | Never add to old Connection or object | Silent downgrade would omit authority/security semantics |
| Make optional extension required | Old endpoint may omit it and becomes incompatible | Old object remains valid under old selection | No | New H-03 identity; breaking | Yes | Old optional/omitted state remains unchanged | Reclassifying history forges consent and completeness |
| Change extension dependency/conflict/prerequisite | Selection result may differ | Must honor old dependency set on old release | No | New H-03 identity | Yes if new selection is desired | Original dependency closure remains evidence | Hidden recursive negotiation/downgrade risk |
| Add base message/discriminator | Old endpoint rejects; forward-only proxy may carry only if registered | Reads old types | No | New H-03 identity; H-12/H-owner review if operation changes | Yes before use on Connection | Old message set remains closed | Generic fallback could trigger unauthorized effect |
| Add selected extension message | Old endpoint that does not understand selected required semantics is incompatible; explicit proxy role may preserve | Reads old extension messages | Only if exact message class was already registered in immutable release | Otherwise new H-03 identity | Yes if selection/material semantics change | Original message identity remains | Dispatch and proof-domain confusion |
| Add error-detail member | Old reader may expose opaque only in a pre-registered namespaced detail class; otherwise rejects detail entry but retains safe base error handling | Reads old details | Only when already permitted by immutable per-error detail registry/schema | Otherwise new H-03 identity | No solely for non-authoritative optional detail; yes if release/Connection selection changes | Original error identity/retry semantics remain | Details may leak secrets or become accidental retry input |
| Change error identity/status/retry meaning | Must not infer or remap | Must use old H-12 mapping for old error | Forbidden under H-13 | Requires H-12/H-03 governance and new identity as applicable | Potentially | Never reinterpret historical retry/outcome | Can cause duplicate effects or disclosure |
| Change default or absent/null treatment | Old and new endpoints compute different semantics | Historical object could be rewritten | Forbidden in place | New H-03 identity and usually new explicit field/representation | Yes | Original presence semantics immutable | Forged consent, intent, signature, or authority |
| Change canonicalization participation | Old proof projection disagrees | New verifier must retain original H-10 profile | Forbidden in place | New H-10 domain/profile and H-03 identity after separate governance | Yes for newly protected semantics | Existing proof remains under original projection | Signature stripping/mismatch and false validity |
| Change authority/security meaning of any field/extension | Old endpoint may accept semantics it cannot enforce | New endpoint must use original semantics for old object | Forbidden under same identity | New explicit identity, relevant H-owner decision, and H-03 release | Yes | No historical reinterpretation | Direct authority escalation/downgrade |
| Graduate experimental extension to stable | Old endpoint knows only experimental identity | New endpoint can read experimental history only with explicit old reader | No silent identity/status mutation | New stable identity and explicit directed compatibility/migration link | Yes to select stable identity; experimental Connection stays pinned | Experimental objects remain experimental | Silent graduation would rewrite consent and risk |
| Deprecate/remove/abandon experimental extension | Active selected peer may still require it; no silent removal | New implementation needs historical reader or declares unsupported | No mutation of old release | Future release excludes selection; H-14 governs support action/timing | Existing Connection is not silently edited; replacement/closure follows accepted material-change/security rules | Preserve original historical interpretation | Stranding active authority, data, or proofs |
| Change privacy classification or logging rule | Old deployment may over-collect | New deployment applies stricter policy prospectively where compatible | Security tightening may be deployment policy, but release semantics/history cannot be rewritten | Semantic disclosure changes need new governance/release | May require replacement if data flow/consent changes | Existing retained data remains governed by original context plus current law/policy | Opaque data may already have leaked or exceeded minimization |

There is no general “minor schema revision” exception inside an immutable H-03
release. Same-release evolution is limited to values and occurrences that the
already published schema, registry, optionality proof, H-10 projection, and
privacy classification expressly allow.

## Error envelope and details

H-12's accepted error identity, precedence, HTTP/status mapping, retry class,
safe-message, disclosure, and observability behavior remains fixed.

The accepted H-13 model keeps the base error envelope closed. It replaces a
generic ungoverned detail bag, in later separately authorized requirements,
with:

- an immutable per-error detail registry bound to the H-03 release;
- closed Core detail members for each known error identity;
- an explicit namespaced detail-extension location for bounded optional
  machine-readable data whose absence cannot change base identity, status,
  retryability, authority, or security response;
- exact sensitivity/redaction, audience, logging, forwarding, and retention
  classification for every registered detail;
- an opaque unknown-detail wrapper for SDKs when preservation is permitted; and
- separate stable machine identity, safe display text, and localization keys.

Unknown detail values never make an unknown error known, change precedence,
make it retryable, or authorize action. Invalid or unknown required detail may
make the detail set unusable, but safe base error handling still follows H-12
when the base envelope/identity itself is valid. Details are not forwarded
across different tenant, principal, target, or audience boundaries where those
bindings apply; a public error does not acquire a fictitious binding.

## Privacy and data minimization

Unknown and extension data is untrusted and potentially personal,
tenant-sensitive, credential-adjacent, policy-sensitive, or security-sensitive
even when its semantics are opaque.

Rudra accepted the complete privacy, minimization, applicable-context,
public/non-tenant, telemetry, Receipt, and cross-context impact in this section.

The accepted floor is:

- do not log, trace, metric-label, crash-report, analytics-export, or display
  raw extension/unknown values by default;
- telemetry may record bounded identity, presence, byte count, structural
  rejection category, and redacted safe status only when H-12 permits;
- structural inspection is limited to what is necessary for parsing, bounds,
  duplicate detection, namespace, selected schema, proof, authorization, and
  safe routing; opaque preservation is not permission for product inspection;
- collect and include only extension data necessary for the selected purpose;
  optional diagnostic/presentation values stay out of authority objects and
  Receipts unless the Receipt registry expressly requires them;
- an intermediary always preserves the exact release and owning object/message
  context and preserves tenant, organization/workspace, principal, audience,
  target, scope, Connection, purpose, and authorized-route bindings exactly
  where they apply. Material bound to one such context never crosses to a
  different one;
- a genuinely public/non-tenant object acquires no fictitious tenant, scope, or
  principal. Public discovery remains non-authoritative; public issuer, key,
  and revocation evidence remains under its H-11/H-12 context; and “public” is
  not permission for universal forwarding, cache reuse, telemetry aggregation,
  namespace-based sharing, authority inference, or raw logging;
- durable preservation creates retention, access-control, deletion, backup,
  export, and incident-response obligations. H-13 defines no duration; H-09,
  H-12, law, deployment policy, and H-14 support commitments remain applicable;
- a sensitive extension requires explicit data classification, minimization,
  redaction behavior, Receipt participation, storage behavior, and security
  review before release selection; and
- experiment telemetry follows the same floor and cannot collect new values
  merely because the extension is experimental.

Preservation can therefore be disallowed for an object/role when privacy cannot
be maintained, even if the JSON value could be represented losslessly.

## Experimental feature lifecycle

The accepted lifecycle consumes H-04's accepted default-off rules: exact
bilateral support, Host request, human consent where required, dependency
closure, isolation, and final Connection selection. H-13 does not create a
second experiment negotiation path.

### Identity, opt-in, and change

- Every experiment has an immutable namespaced experimental identity, exact
  release-scoped definition, lifecycle state, owning objects/messages,
  dependencies/conflicts, requiredness, limits, data classification, H-10
  participation, and history rule.
- Experimental status never makes a Core object open and never relaxes H-02,
  H-04, H-05, H-10, H-11, or H-12 safety floors.
- Final selection and all omissions/limitations are persisted in the immutable
  H-07 Connection bundle. Restart restores that exact state.
- Any semantic, schema, dependency, canonical-participation, authority,
  security, or privacy change receives a new experimental identity or H-03
  release definition. It does not mutate active Connections.
- Experiments are isolated from unselected peers and tenants. An extension
  dependency cannot implicitly opt a party into a second experiment.

### Graduation

The accepted choice is **graduation creates a new stable identifier plus an
explicit directed compatibility/migration link**. Retaining the same identity
is rejected because lifecycle-state mutation could silently reinterpret
Connection consent, persisted data, proofs, fixtures, and historical objects.
An exact-release exception is also rejected as the default because it makes
identity semantics vary by release.

Graduation does not select the stable extension on an existing Connection.
Using it requires the applicable H-01/H-04 preview, bilateral support, consent,
and replacement. The old experimental identity remains immutable evidence and
may coexist with the stable representation only when the new release defines
an unambiguous, non-authority-widening relationship.

### Experimental-to-stable data

Persisted experimental fields/messages are never interpreted directly as
stable merely because a related stable extension exists. The future stable
definition must select one explicit behavior per data class:

1. historical experimental evidence remains readable only under the
   experimental identity;
2. an explicit, auditable migration creates a distinct stable object while
   retaining provenance and the original object; or
3. experimental and stable representations coexist without aliasing.

No silent backfill, relabel, in-place mutation, proof reuse, or current-schema
reinterpretation is permitted. A migration that changes an authority bundle or
selected semantics requires replacement and separate authorization.

### Deprecation, removal, abandonment, and security prohibition

These states remain distinct:

- **not selectable for new Connections** is a future release-selection rule;
- **unsupported by a deployment** describes current local support and cannot
  mutate an existing Connection's agreed meaning;
- **deprecated** is lifecycle metadata whose timing and support promises belong
  to H-14;
- **removed from a future release** means the identity cannot be newly selected
  in that release, while old release/history readers retain its meaning;
- **abandoned** means no graduation is planned, not that old data disappears;
  and
- **forbidden due to a security incident** invokes accepted current Trust,
  revocation, compromise, material-change, and future H-14 response authority;
  H-13 does not invent a bypass or automatically rewrite/close Connections.

Removal never edits an active Connection in place. Continued use, replacement,
closure, denial, or historical-only verification follows the already accepted
security/lifecycle rules and later release support decisions. Historical
objects always retain the original experimental identity and meaning.

## Receipt-specific openness

Receipt openness is deliberately stricter than generic informational objects
because a Receipt binds terminal execution evidence across H-09, H-10, and
H-11.

Under accepted Option B:

- the Receipt Core is closed and the later schema must contain all fields that
  the accepted Receipt semantic projection requires; current schema/type/runtime
  disagreement is evidence to reconcile, not a reason to make the object open;
- there is one explicit registered extension container; arbitrary mixed
  members, generic evidence bags, and unsigned annotations are prohibited;
- every Receipt extension entry participates in the owning H-10 Receipt
  projection. A future exception requires a separately accepted H-10 owning
  domain and cannot be inferred by an implementation;
- an extension cannot hide, replace, contradict, default, or weaken the exact
  Connection, Invocation, Task, Result, capability, scope, Passport, Approval,
  policy, output/evidence digest, terminal outcome, proof, revocation-at-
  execution, key-purpose, or historical-verification bindings established by
  H-09 through H-11;
- Receipt extensions cannot make the Receipt present authority, execution
  authorization, billing authority, or proof that current Trust remains valid;
- required or binding/security-relevant unknown extension material makes
  semantic verification fail or become indeterminate as the owning accepted
  decision requires; it is never ignored;
- an unknown optional non-binding value may be carried as opaque only when the
  original release classifies it that way, the proof remains intact, the
  implementation can preserve it losslessly, and Receipt privacy permits;
- no proxy, SDK, storage model, export, or migration may project a protected
  Receipt into a narrower interface and still claim the original proof covers
  the reconstructed object; and
- historical verification uses the Receipt's original release, schema bundle,
  extension definitions, H-10 profile, key/revocation context, and lifecycle
  meaning. Graduation or removal changes none of them.

## Later fixture and golden-evidence consequences

H-13 creates no fixture or vector. If an option is approved, later `D2-03`,
`D2-04`, and conformance work should provide static, language-neutral positive,
negative, malicious, and old/new evidence for at least:

- unknown Core field rejection at every registry class;
- unknown authority, Task, revocation, algorithm/profile, error,
  informational, and extension enum behavior;
- unknown base and extension message/discriminator dispatch;
- known/unknown, required/optional, selected/unselected, duplicate, dependency,
  conflict, absent-occurrence, and invalid extension cases;
- lossless optional-extension round trips through parser, SDK, proxy, durable
  store, retrieval, and reserialization paths;
- inability-to-preserve failures for large integers, exact strings, arrays,
  absent/null distinctions, duplicate names, and bounded nested data;
- H-10 canonical bytes and proofs with known and unknown participating
  extensions, plus stripping, mutation, relocation, and defaulting failures;
- old-reader/new-writer and new-reader/old-writer behavior for every row of the
  compatibility matrix and every explicit H-03 directed edge;
- immutable schema/bundle identity, missing artifact, digest mismatch,
  rollback, relabel, and second-negotiation attempts;
- experiment opt-in, isolation, dependency, replacement, graduation to a new
  identity, explicit data migration/coexistence, removal, abandonment, and
  historical reads;
- Receipt-specific extension protection and verification;
- deeply nested/large values, namespace collision/reassignment, prototype-like
  names, malicious proxy/store/SDK transformation, and authority smuggling;
- safe error-detail evolution, unknown-error behavior, redaction, logging,
  telemetry, Receipt minimization, retention boundaries, and cross-tenant
  rejection; and
- at least one independent implementation that consumes the same immutable
  artifacts without importing official runtime behavior.

Golden evidence must identify exact release, bundle/schema identity, object
registry row, extension definition, direction, expected status, H-10 profile
where relevant, and whether preservation bytes or semantic JSON values are
being compared.

## SDK and generated-type consequences

H-13 modifies no SDK or type declaration. Later `E-01` work should derive, not
invent, the approved model:

- Core object types are strict and expose no catch-all index signature;
- explicit extension containers use an immutable, case-sensitive identity type
  and registry-generated known value types plus a bounded opaque representation
  for permitted unknown optional values;
- enums that can carry permitted opaque informational/extension values use an
  explicit unknown-value wrapper rather than a language enum fallback;
- authority/lifecycle/security discriminated unions are exhaustive and their
  decoders fail closed on unknown tags;
- forwarding/storage APIs distinguish “semantically understood,” “verified,”
  “opaque preserved,” and “forward-only” states so type assertions cannot turn
  one into another;
- generated serializers preserve presence, JSON semantic values, arrays,
  strings, numeric eligibility, and unknown extension entries where required;
- lossy platform numeric models, database projections, and object mappers fail
  rather than silently round, default, drop, or reconstruct protected data;
- Receipt types include the approved complete Core and protected extension
  surface consistently across languages;
- validators are generated from immutable release-bundle inputs and expose
  stable failure classes without making one SDK the oracle; and
- code generation is reproducible and implementation-neutral, with generator
  identity/digest carried as release evidence but never used as wire
  negotiation.

## Compatibility and migration impact

The accepted choice intentionally trades broad syntactic forward compatibility
for bounded, testable carriage at explicit extension points.

Rudra accepted the complete compatibility and migration impact in this section.

Expected impact if later separately authorized and implemented:

- current implementations that accept unknown Core members would become
  nonconforming until strict per-object validation exists;
- historical schemas with inconsistent open subobjects and extension patterns
  would not be edited; future accepted-release schemas would model their data
  domains and extension points explicitly;
- runtime extension lowercasing, case-insensitive checks, independent semantic-
  version negotiation, profile-bound disagreement, and generic arbitrary values
  would require migration or replacement rather than grandfathering;
- SDK interfaces and Platform/store projections would need explicit opaque
  carriers and lossless round-trip tests; types that omit Receipt or extension
  fields could not reconstruct protected evidence;
- published future schema bundles would be immutable and release-bound; any
  validation change would use a new H-03 identity and explicit compatibility
  direction;
- active Connections remain pinned. Enabling, graduating, changing materially,
  or removing selected extensions requires the accepted replacement path;
- durable experimental data is retained under its original identity; any
  stable conversion is a separately authorized, auditable migration that does
  not destroy or relabel source evidence; and
- deployments may need dual historical readers and storage formats for as long
  as applicable history/support obligations require. H-14, not H-13, sets
  exact support windows.

No migration is authorized by H-13 acceptance.

## Security and threat analysis

Rudra accepted the complete security and threat impact in this section,
including every accepted control and remaining concern below.

| Threat | Accepted control | Remaining concern |
| --- | --- | --- |
| Authority smuggling through ignored unknown Core field | Closed Core; reject outside explicit extension points; extensions cannot widen H-02/H-07 authority | Incorrect registry classification could still label authority material optional |
| Required extension treated as optional | Immutable requiredness in release/Connection; unsupported or absent required occurrence fails | Producers and generated code must enforce occurrence-specific requiredness consistently |
| Unknown Task or revocation state guessed safe | Class-specific fail-closed/indeterminate rule; no default mapping | Availability may suffer when a newer release is encountered |
| Signed extension stripped by intermediary | All registered entries participate in owning H-10 projection; verification fails after removal | Unverified application code may still display a projected object misleadingly |
| Extension modified during parse/serialize | Lossless semantic-value rule; no normalization/defaulting; inability to preserve rejects | Cross-language number/string models require demanding fixtures and opaque carriers |
| Duplicate or colliding namespace | Exact lowercase case-sensitive identity; duplicate declarations/keys reject; no repair | DNS ownership does not itself prove publisher identity; H-14 remains needed |
| Namespace reassignment or alias capture | Identities immutable, never reassigned, aliases prohibited; compatibility links non-substitutive | Long-term owner disputes and registry operations are H-14 risks |
| Experiment enabled without selection | Default-off H-04 path; exact release registration, bilateral support, consent, and Connection binding | Deployment configuration could still expose preview/telemetry data improperly |
| Graduation silently changes historical meaning | New stable identity; original experimental identity and objects immutable | Migration tooling may tempt operators to overwrite source objects |
| Extension removed while active Connection depends on it | No in-place Connection mutation; accepted material-change/security lifecycle governs replacement/denial | Urgent security prohibition may reduce availability and requires H-14 response planning |
| Unknown error detail leaks secrets | Per-error detail registry, sensitivity/redaction, bounded opaque wrapper, no raw logging/cross-tenant forwarding | Application-added values can be misclassified before independent review |
| Extension data crosses an applicable tenant or other context boundary | Preserve exact release/object context and every binding that exists; never cross to a different tenant/scope/principal/audience/target/Connection/purpose; public objects gain no fictitious binding and remain registry/H-11/H-12 constrained | Shared infrastructure and backup/export paths remain implementation risks |
| Deeply nested, large, cyclic, or hostile extension payload | H-12 limits plus H-10 JSON eligibility and per-extension structural bounds before use/preservation | Preservation can amplify storage and parsing cost within allowed limits |
| Schema-version rollback/downgrade | Exact H-03 identity, immutable bundle digest, durable Connection/history binding, no mutable `$id` trust | Artifact availability and durable floor implementation remain future work |
| Schema ID becomes second negotiation path | Only H-03 release is selected; bundle/schema/package identities are subordinate evidence | Implementations might still expose unsafe “choose schema URL” APIs |
| Old implementation accepts new authority semantics | Unknown Core/security/state/required material rejects; authority evaluation continues only under explicit directed edge | Strict failure reduces forward availability |
| Proxy preserves bytes but asserts semantic validity | Typed separation of integrity, preservation, forwarding, and semantic support; no validity claim | Operational dashboards may collapse nuanced states |
| Generated SDK drops unknown extension material | Explicit opaque carriers, round-trip APIs/tests, failure when lossless representation is unavailable | Language ecosystems differ and generated-code users may project manually |
| Persistence layer rewrites unknown values | Preserve exact semantic value/protected carrier; verify after retrieval; reject lossy stores | Database migrations, indexing, and backups need continuous controls |
| Compatibility rule causes signature/digest mismatch | Original release/H-10 projection always verifies history; participation change forbidden in place | Supporting many historical profiles increases verifier complexity |
| Extension dependency recursion, release-range inference, or fallback downgrade | Finite immutable acyclic closure, exact extension/release identities, exact-direction H-03 compatibility evidence, pre-selection evaluation, no numeric/minimum/range inference and no runtime fetch/fallback | Large dependency graphs can still burden review and conformance |
| Unknown extension message reaches generic handler | Closed dispatch and exact selected-message registration; forward-only role cannot execute | Framework default routes and union deserializers require adversarial tests |
| Extension overrides Core member through duplicate semantics | Extensions cannot redefine Core; registry review and closed Core reject shadow fields | Semantically similar names can still confuse users and documentation |
| Optional extension carries secret or excessive personal data | Secret exclusion, data classification, minimization, Receipt/logging restrictions, review prerequisite | Opaque intermediaries cannot perfectly classify malicious payload content |

## Residual risks of accepted Option B

Even with all qualifications, Option B leaves concrete risks:

1. Closed Core reduces forward compatibility and can turn benign new Core
   information into a hard interoperability failure.
2. A per-object registry is large governance surface. A mistaken optionality,
   sensitivity, or H-10 participation classification can become a security
   defect.
3. Preservation substantially complicates parsers, generated SDKs, object
   mappers, databases, caches, backups, exports, and multi-language number
   handling.
4. Opaque forwarding can preserve malicious or sensitive content that an
   intermediary cannot understand; privacy and resource limits reduce but do
   not eliminate this risk.
5. Integrity without semantic understanding is easy to overstate. Operators
   may misread “proof valid” as “extension safe,” “authorized,” or “current.”
6. Exact release/schema-bundle retention increases artifact availability,
   verifier, and historical-reader obligations.
7. New stable identities on graduation avoid reinterpretation but require
   explicit migration, coexistence, replacement, and user-facing explanation.
8. Strict no-fallback dependency handling can reduce availability when one
   selected prerequisite becomes unsupported or insecure.
9. Namespace syntax and immutability do not establish real-world publisher
   control, dispute resolution, signing authority, or continuing support;
   H-14 must do so.
10. Error-detail preservation can leak data through application logs or UI even
    when protocol components obey their default-redaction floor.
11. Receipt extension support increases the amount of sensitive immutable
    evidence and the cost of maintaining complete proof-preserving types.
12. Compatibility edges remain a human-reviewed artifact and may encode an
    unsafe assumption despite deterministic machinery.
13. Rejecting unknown Task, revocation, proof, key, and authority semantics is
    safe but can make mixed-release deployments unavailable until upgraded or
    replaced.
14. H-13 acceptance cannot prove implementability until later static vectors,
    conformance cases, and an independent implementation exercise the model.

Rudra explicitly accepted all 14 residual risks above.

## Recorded approval evidence

The accepted human disposition identifies and accepts all of:

- the exact top-level option and every qualification;
- the complete per-object openness registry;
- the extension location, namespace, identity, required/optional,
  dependency/conflict, selection, omission, and removal rules;
- unknown Core field, enum class, message/discriminator, error-detail,
  preservation, forwarding, and local-use behavior;
- H-10 signed-field participation and lossless round-trip treatment;
- H-03 release, bundle, individual schema, schema revision, package, backward,
  forward, compatible-change, and historical-object relationship;
- experimental identity, opt-in, change, graduation, stable-data, coexistence,
  abandonment, and removal semantics;
- compatibility examples and the complete change matrix;
- migration, SDK/generated-type, fixture/vector, implementation-neutral
  generation, Receipt, security, privacy, and residual-risk impact; and
- accountable approver identity, approval date, exact approved option and
  qualifications, accepted risks, compatibility impact, security impact,
  resulting status, and durable sign-off/review reference where one exists.

The approval record and Human disposition below supply the required identity,
date, option, qualifications, risks, impacts, source, digest, status, and
sign-off reference.

## H-14 boundary

H-13 may decide the protocol semantic meaning of openness, extension identity,
selection consequences, schema evolution, experiment graduation, and removal.
It does not decide:

- package ownership, package names, or license;
- registry operator or publisher identity;
- publication or signing authority;
- release artifacts and publication procedure;
- support, deprecation, withdrawal, or end-of-life windows;
- exact production support commitments;
- independent implementation profiles;
- the interoperability evidence matrix;
- the external security-review and remediation gate;
- residual-risk acceptance authority for a release;
- publication or release authorization; or
- Protocol 1.0 graduation.

Those topics remain explicitly deferred to unresolved H-14 or its separately
authorized downstream work. H-13 cannot decide who publishes a release, how
long it is supported, or whether Protocol 1.0 ships.

## Legacy boundary

`ghostbridge/0.1-draft` remains immutable historical material. H-13 does not
edit, upgrade, relabel, reinterpret, or backfill it and does not claim that it
conforms to any future accepted H-13 model. Its prose, schemas, identifiers,
code, tests, fixtures, and examples remain evidence of legacy behavior only.

## Human questions presented for decision

The following 30 questions are preserved from the final reviewed proposal.
Rudra approved each in the corrected Option B direction recorded in the
Approved human dispositions section below.

1. Is Option B — Closed Core with registered namespaced extension points —
   approved, rejected, or qualified, or should Option A, C, D, or another
   complete model be selected?
2. Is closed Core the default for every protocol object, with application data
   contracts and explicitly defined keyed collections treated as separate data
   domains rather than Core openness?
3. Is the proposed per-object openness registry complete and correct for every
   listed object/message class, including which extension points exist and
   which roles may preserve or forward?
4. Must every unknown Core member outside a registered extension point reject
   the owning object, without ignore or mixed-member preservation exceptions?
5. Are the six enum classes and their fail-closed, indeterminate, opaque,
   application-surface, preservation, and forwarding rules approved, including
   the absolute prohibition on guessing Task and revocation/history values?
6. Must every unknown base message/discriminator reject before dispatch, and
   may a separately registered extension message exist only after exact H-04
   selection without creating new H-12 negotiation?
7. Is the constrained hybrid extension-location model approved: explicit
   namespaced containers plus narrowly registered extension messages, never
   arbitrary mixed Core members?
8. Is an authority/security-affecting extension permitted only when it narrows
   authority, is classified and selected as required, is understood by every
   evaluating party, and participates in H-10 as registered; and are ordinary
   optional extensions prohibited from carrying such semantics?
9. Is the lowercase reverse-DNS-plus-name, case-sensitive, exact-comparison,
   immutable, no-alias, no-reassignment namespace model approved, subject to
   later exact schema bounds?
10. Are experimental/stable lifecycle states registry metadata, with a new
    identity on graduation rather than a mutable namespace meaning?
11. Are all proposed required/optional, known/unknown, supported/unsupported,
    duplicate, dependency-missing, selected-but-absent, and present-but-
    unselected consequences approved, including durable H-04/H-07 evidence of
    every required offer, omission, limitation, and selection without that
    evidence selecting an extension or creating authority?
12. May extensions declare only finite, acyclic, exact-identity and exact-
    release-scoped dependencies/conflicts/prerequisites evaluated before
    selection, with cross-release use allowed only by explicit H-03 evidence
    for the exact direction and no minimum/numeric/range/order inference,
    recursive negotiation, nearest-release choice, alternative, or fallback?
13. Does every extension entry at a protected object point participate in the
    owning H-10 projection by default, with any exception requiring a separately
    accepted H-10 domain?
14. May an implementation claim only cryptographic integrity—not semantic
    validity, safety, or authority—for an unknown-but-participating extension it
    can structurally validate and represent losslessly?
15. Are the distinctions among understanding, validation, canonicalization,
    verification, preservation, forwarding, and local application use approved,
    including that “ignored” never implies “dropped”?
16. Are the mutation and round-trip rules approved, including rejection when
    numbers, strings, presence, arrays, protected data, or extension identity
    cannot be represented losslessly?
17. Is the H-03 release the only protocol compatibility/selection identity,
    with one immutable subordinate schema-bundle digest, immutable individual
    schema identities, no in-place post-release schema revision, and package
    versions excluded from negotiation?
18. Is the complete compatibility matrix approved, including that schema
    artifact changes are not same-release compatible and that directed H-03
    compatibility remains explicit and non-transitive?
19. Are the backward rules approved: use the original release/bundle/registry
    and never current-schema validation, defaults, relabeling, or backfill for
    historical objects?
20. Are the forward modes approved: reject, preserve-only, ignore-but-preserve,
    forward-only, and continued authority evaluation only when every critical
    semantic is understood under an explicit compatibility edge, with exact
    owning context and every applicable binding preserved but no fictitious
    binding invented for a genuinely public object?
21. Is the closed H-12 error envelope plus immutable per-error Core details and
    namespaced optional detail-extension registry approved, with unknown detail
    values unable to alter identity, status, retry, precedence, or authority?
22. Are the privacy/minimization rules approved, including no raw default
    telemetry, minimum inspection, exact preservation of every applicable
    context binding, no cross-context forwarding, no invented tenant/scope for
    public objects, Receipt minimization, sensitive-extension review, and no
    H-13 retention duration?
23. Is the experimental lifecycle approved, including default-off selection,
    immutable Connection persistence, new identities for material changes,
    isolation, no implicit dependency opt-in, and new stable identity on
    graduation?
24. Must experimental-to-stable data remain historical, undergo explicit
    provenance-retaining migration, or coexist—never silent direct
    reinterpretation, backfill, relabel, proof reuse, or in-place mutation?
25. Are non-selectable, locally unsupported, deprecated, future-release
    removed, abandoned, security-forbidden, and historical-only states kept
    distinct, with H-14 retaining all timelines/support commitments?
26. Are the stricter Receipt rules approved, including closed Core, one
    protected extension container, complete H-09/H-10/H-11 bindings, no field
    projection/reconstruction, and no authority inference?
27. Are the later golden-evidence obligations sufficient for `GB-051`, without
    treating future official code as the conformance oracle?
28. Are the strict generated-type, unknown wrapper, explicit extension map,
    discriminated-union, lossless round-trip, Receipt, immutable generation,
    and implementation-neutral SDK consequences approved?
29. Does the human accept the stated compatibility/migration costs, security
    and privacy analysis, and every listed residual risk?
30. Is the H-14 and legacy `ghostbridge/0.1-draft` boundary approved exactly as
    stated, with no downstream authority inferred from H-13?

## Approved human dispositions

1. **Approved:** Option B — Closed Core with registered namespaced extension
   points — is the sole selected top-level model. Options A, C, and D remain
   unselected rationale.
2. **Approved:** Core is closed by default for every protocol object.
   Application data contracts and explicitly defined keyed collections remain
   separate bounded data domains and do not imply Core openness.
3. **Approved:** The complete per-object openness registry, including every
   object's Core openness, extension point, unknown-member, unknown-extension,
   enum/message, preservation/forwarding, sensitivity, H-10 participation, and
   historical/evolution classification.
4. **Approved:** Every unknown Core member outside an explicit registered
   extension point rejects the owning object. There is no generic ignore or
   mixed-member preserve-and-forward rule for Core fields.
5. **Approved:** The six class-specific unknown-enum rules. Authority,
   lifecycle, security, Trust, revocation, proof, algorithm/profile/key-purpose/
   authentication, error, informational/display, and extension-owned values
   receive the exact class treatment in the accepted model. An unknown Task
   state is never guessed as terminal/nonterminal, success/failure, or safe; an
   unknown revocation/history/security result never creates current authority.
6. **Approved:** Unknown base messages, operation discriminators, resource
   kinds, and Core union tags reject before dispatch. Separately registered
   extension messages require exact release registration and H-04 selection
   and create no second H-12 HTTP or authentication negotiation path.
7. **Approved:** The constrained hybrid extension-location model: explicit
   namespaced containers for object-local data, narrowly registered selected
   extension messages, no arbitrary mixed-in Core members, and no silent new
   HTTP resource, status mapping, authentication method, profile negotiation,
   lifecycle transition, or authority source.
8. **Approved:** Authority/security-affecting extensions may only narrow
   accepted authority and only when classified as authority-critical, required,
   selected, understood by all evaluating parties, and protected under H-10 as
   recorded. Ordinary optional extensions cannot carry authority-bearing
   semantics.
9. **Approved:** Extension identities are immutable lowercase ASCII
   reverse-DNS-owner-plus-name values with exact case-sensitive/code-unit
   comparison, no receiver normalization/repair, duplicate rejection, no
   aliases, no reassignment, and non-aliasing compatibility links. Exact
   component grammar/bounds remain later schema work.
10. **Approved:** Experimental/stable lifecycle state is immutable
    release-registry metadata, and graduation creates a new stable identity
    rather than mutating the experimental identifier's meaning or status.
11. **Approved:** The complete required/optional/known/unknown extension model.
    Required known extensions must be supported and selected; unknown or
    unsupported required extensions fail; optional preview advertisements may
    be preserved only where allowed and remain non-authoritative; authority/
    lifecycle messages reject unknown optional extensions except in an
    expressly permitted forwarding-only role; duplicate/conflicting and
    present-but-unselected values reject; required selected occurrences must be
    present; registered optional occurrences alone may be absent; invalid
    registered values reject. An unselected optional extension is not active
    and has no later governed value/semantics, while its required H-04/H-07
    offer/omission/limitation/selection evidence remains durably recorded and
    creates neither selection nor authority.
12. **Approved:** Extension dependencies, conflicts, and prerequisites are
    finite, acyclic, exact-identity, exact-release-scoped, and evaluated before
    selection. Cross-release use requires explicit H-03 evidence for the exact
    direction. Minimum/numeric floors, epoch proximity, `latest`/`current`,
    semantic-version ranges, monotonic ordering, recursive runtime negotiation,
    nearest/newest/lower/alternative/first-common fallback, and a second H-03
    negotiation channel are prohibited.
13. **Approved:** Every registered extension entry participating in an already
    protected object participates in the owning H-10 projection by default,
    unless a separately accepted H-10 domain explicitly governs a different
    owning object.
14. **Approved:** An implementation with structural understanding alone may
    claim cryptographic integrity for unknown-but-participating data only when
    H-10 verification and lossless representation succeed. It cannot infer
    semantic validity, safety, authorization, present Trust, extension
    conformance, or application meaning from proof validity.
15. **Approved:** Semantic understanding, structural validation,
    canonicalization, cryptographic verification, preservation, forwarding,
    and local application use remain distinct. “Ignored” never means “dropped.”
16. **Approved:** The complete mutation and lossless round-trip rules.
    Implementations cannot normalize strings/numbers, approximate unsupported
    numeric values, materialize defaults, change absence to null/empty/default,
    strip/re-parent/rename/reconstruct participating extensions, or mutate
    another producer's protected object while retaining its proof. Inability to
    preserve required semantic/protected material losslessly fails.
17. **Approved:** H-03 release identity is the sole protocol compatibility and
    selection identity. Each release names one immutable subordinate
    schema-bundle identity/digest and immutable individual schema identities;
    schema revision is pre-release build provenance only; runtime schema
    negotiation is prohibited; package versions are deployment metadata only.
18. **Approved:** The complete change-compatibility matrix. Published schema/
    bundle artifacts cannot be semantically mutated in place. Schema,
    validation, or meaning changes require a new H-03 identity as classified,
    except for already-declared values/occurrences permitted by the immutable
    published schema/registry. Non-semantic append-only errata cannot change
    validation, required/optional behavior, generated types, schema identity,
    H-10 participation, protected bytes, extension meaning, authority/security
    meaning, or historical interpretation. Behavioral or semantic correction
    requires a new H-03 identity and explicit directed compatibility analysis.
19. **Approved:** Backward compatibility uses the original H-03 release,
    schema bundle, registry, extension identities, H-10 profile, and historical
    meaning. Current-schema-only validation, default injection, relabeling,
    backfill, and conversion of historical evidence into current authority are
    prohibited.
20. **Approved:** Forward compatibility has only the recorded safe modes:
    reject, preserve without interpretation, locally ignore but preserve,
    forward-only, or continue authority evaluation when every critical semantic
    is understood under explicit directed H-03 compatibility. Forwarding keeps
    the exact release, owning context, and every binding that actually exists;
    public/non-tenant objects gain no fictitious bindings; unknown semantics
    never create present authority.
21. **Approved:** H-12's base error envelope remains closed. Future safe
    machine-readable details use immutable per-error Core definitions and
    explicit namespaced optional detail-extension locations. Unknown details
    cannot change error identity, HTTP status, retry class, precedence,
    authority, or security response.
22. **Approved:** The complete privacy/minimization model: no raw default
    telemetry/logging/tracing/analytics/display of opaque values; minimum
    structural/security inspection; necessary data only; exact preservation of
    applicable context bindings; no cross-context forwarding or invented
    tenant/scope for public objects; no inference that public means authoritative,
    safe to log, universally forwardable, or freely reusable; Receipt
    minimization; sensitive-extension review; and no H-13 retention duration.
23. **Approved:** Experiments are default-off and require exact bilateral
    support, H-04 selection, human consent where required, immutable H-07
    Connection persistence, isolation, exact dependency closure, no implicit
    opt-in, and new identities for material semantic, schema, dependency, H-10,
    security, or privacy changes.
24. **Approved:** Experimental-to-stable data remains historical under the
    original identity, is transformed only by explicit auditable provenance-
    retaining migration into a distinct stable object, or coexists explicitly.
    Silent reinterpretation, backfill, relabeling, old-proof reuse for stable
    semantics, and in-place mutation are prohibited.
25. **Approved:** Not-selectable, deployment-unsupported, deprecated,
    future-release-removed, abandoned, security-forbidden, and historical-only
    states remain distinct. H-14 retains support, deprecation, removal-timeline,
    and release-policy ownership.
26. **Approved:** Receipt openness is stricter: closed Core, one explicit
    registered extension container, complete H-09/H-10/H-11 bindings, default
    H-10 participation for all registered Receipt extensions, no proof-
    preserving claim after projection/reconstruction loss, and no present
    authority from Receipt extension data.
27. **Approved:** The future golden-evidence and fixture obligations recorded
    for `GB-051`. H-13 acceptance creates no fixture, vector, or conformance
    asset and does not close `GB-051`.
28. **Approved:** The SDK/generated-type consequences: strict Core types,
    explicit extension maps, permitted unknown-value wrappers, exhaustive
    authority/security discriminated unions, fail-closed unknown tags, lossless
    round trips, complete Receipt representation, immutable release-bundle-
    driven and implementation-neutral generation, and no official SDK as the
    protocol oracle.
29. **Approved:** The complete compatibility/migration impact, security
    analysis, privacy analysis, threat analysis, and all 14 residual risks
    recorded in H-13. Acceptance authorizes no migration or implementation.
30. **Approved:** The stated H-14 and immutable legacy boundaries.
    `ghostbridge/0.1-draft` remains immutable historical material and is not
    edited, upgraded, relabeled, reinterpreted, or backfilled. H-14 remains
    unresolved and retains registry operator/publisher, publication/signing,
    support/deprecation/EOL, release-artifact, production-support,
    interoperability-evidence, external-review/remediation, release-risk,
    publication/release, and Protocol 1.0 graduation authority.

## Human approval checklist

- [x] Top-level option and every qualification selected explicitly.
- [x] Per-object openness registry accepted or precisely amended.
- [x] Unknown Core field behavior accepted.
- [x] Unknown enum classes and behavior accepted.
- [x] Unknown message/discriminator behavior accepted.
- [x] Extension location model accepted.
- [x] Namespace identity, uniqueness, immutability, alias, collision, and
  reassignment rules accepted.
- [x] Required/optional and known/unknown extension rules, including durable
  non-authorizing omission/limitation evidence, accepted.
- [x] Exact-identity dependency, incompatibility, directed H-03 compatibility,
  release, profile, no-minimum/range/order inference, and security prerequisite
  rules accepted.
- [x] H-10 signed-field participation and standalone-domain boundary accepted.
- [x] Canonicalization, lossless preservation, context-preserving forwarding,
  public/non-tenant qualification, mutation, and local-use rules accepted.
- [x] H-03 release, schema-bundle, individual-schema, schema-revision, and
  package-version relationship accepted.
- [x] Complete change-compatibility matrix accepted.
- [x] Backward-compatibility and immutable-history rules accepted.
- [x] Forward-compatibility and continued-authority limits accepted.
- [x] Error-envelope/detail evolution and H-12 boundary accepted.
- [x] Privacy, minimization, inspection, telemetry, retention, Receipt,
  applicable-context preservation, public/non-tenant, and cross-context rules
  accepted.
- [x] Experimental opt-in, isolation, dependency, mutation, and Connection
  persistence rules accepted.
- [x] Graduation, stable-data, coexistence, abandonment, and removal semantics
  accepted.
- [x] Receipt-specific openness and protection rules accepted.
- [x] Fixture/vector/golden-evidence consequences accepted.
- [x] SDK/generated-type and implementation-neutral generation consequences
  accepted.
- [x] Compatibility and migration impact accepted.
- [x] Threat and security analysis accepted.
- [x] Residual risks accepted explicitly.
- [x] H-14 and immutable legacy boundaries accepted.
- [x] Accountable approver, approval date, exact approved option, accepted
  qualifications, accepted risks, compatibility impact, security impact,
  resulting status, and durable sign-off/review reference recorded.

## Human disposition

- **Approver:** Rudra
- **Approval date:** 2026-08-11
- **Approved option:** Option B — Closed Core with registered namespaced extension points
- **Approved qualifications:** the complete corrected Option B governance
  model, complete per-object openness registry, complete change-compatibility
  matrix, all 30 human dispositions, and all final independent-review
  corrections
- **Accepted risks:** all 14 residual risks recorded in H-13
- **Compatibility impact accepted:** the complete compatibility and migration
  impact recorded in H-13; acceptance authorizes no migration
- **Security impact accepted:** the complete security, privacy, and threat
  impact recorded in H-13; acceptance authorizes no implementation or
  deployment
- **Sign-off/reference:** `H-13-human-approval-rudra-2026-08-11.txt`
- **SHA-256:**
  `441960223D24E801CDE6BC1498F57E2DD0C3AD1C56755216587944332395A292`
- **Resulting status:** `ACCEPTED`

### Exact human approval statement

I, Rudra, approve H-13 Option B — Closed Core with registered namespaced extension points — together with the complete corrected Option B governance model, per-object openness registry, change-compatibility matrix, and all 30 human dispositions presented in the final H-13 proposal and final independent review. In particular, I approve closed Core fields with rejection of unknown Core members outside explicit registered extension points; the six class-specific unknown-enum rules; rejection of unknown base messages and discriminators before dispatch; the constrained hybrid of namespaced extension containers and separately registered selected extension messages; the immutable lowercase reverse-DNS-plus-name namespace model with exact case-sensitive comparison, no aliases, and no reassignment; the complete required/optional/known/unknown extension rules with durable non-authorizing H-04/H-07 omission and limitation evidence; finite exact-identity dependency and conflict rules using only exact-direction H-03 compatibility evidence and no minimum, numeric, range, ordering, recursive-negotiation, nearest-version, alternative, or fallback inference; H-10 participation of protected extension material with cryptographic integrity never implying semantic validity, safety, or authority; lossless preservation, context-preserving forwarding, and rejection of lossy mutation; H-03 as the sole protocol compatibility and selection identity with immutable subordinate schema-bundle and individual-schema identities; the complete backward, forward, same-release, historical-object, and compatibility-change model; the closed H-12 error envelope with governed namespaced optional error details; the complete privacy, minimization, telemetry, applicable-context, public/non-tenant, Receipt, and cross-context rules; the default-off experimental lifecycle with immutable Connection persistence and new identities for material changes; graduation by creation of a new stable identifier with explicit compatibility or migration linkage rather than reinterpretation of the experimental identity; provenance-retaining migration or coexistence of experimental-to-stable data with no silent backfill, relabeling, proof reuse, or in-place mutation; the distinctions among non-selectable, unsupported, deprecated, removed, abandoned, security-forbidden, and historical-only extension states; the stricter Receipt openness and H-09/H-10/H-11 protection model; the stated future fixture, vector, golden-evidence, SDK, generated-type, and implementation-neutral-generation consequences; and the complete compatibility, migration, security, privacy, threat, and residual-risk analysis recorded in H-13. I accept all 14 residual risks recorded in the proposal. I also approve the stated H-14 and immutable `ghostbridge/0.1-draft` boundaries. I understand that this approval establishes H-13 protocol-governance decision authority only and does not itself close GB-025, GB-036, GB-042–GB-046, GB-048, or GB-051, create normative requirements, schemas, schema bundles, manifests, state machines, fixtures, vectors, conformance cases, generated types, or implementation, authorize migration, deployment, publication, or release, resolve H-14, or establish Protocol 1.0.

## Resulting status

`ACCEPTED`

## Final governance boundary

- H-01 through H-13 are `ACCEPTED`; H-01 through H-12 remain unchanged.
- H-14 remains unresolved.
- `GB-025` remains open.
- `GB-036` remains open.
- `GB-042` through `GB-046` remain open.
- `GB-048` remains open.
- `GB-051` remains open.
- H-13 acceptance creates no normative requirement.
- H-13 acceptance creates no schema, schema bundle, or manifest.
- H-13 acceptance creates no state machine.
- H-13 acceptance creates no fixture, vector, or conformance case.
- H-13 acceptance creates no generated type or implementation.
- H-13 acceptance authorizes no migration.
- H-13 acceptance authorizes no deployment.
- H-13 acceptance authorizes no publication or release.
- H-13 acceptance does not resolve H-14.
- H-13 acceptance makes no Protocol 1.0 claim.

**H-13 is ACCEPTED.**
