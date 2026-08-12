# Extensions

This chapter defines the H-13 closed-Core and registered-extension model for
`ghostbridge/e1.r0-draft.1`. It governs openness, unknown data, preservation,
selection, and evolution; later D1 chapters retain each object's complete field,
lifecycle, authorization, proof, error, and transport contract.

## REQ-EXT-0001 - Closed Core by default

**Requirement.** Every protocol object's Core member set MUST be closed under
the exact selected or historical H-03 release. A member outside that Core set
MUST be accepted only when it occurs at an explicit extension point permitted by
REQ-EXT-0002 and satisfies every applicable registration and selection rule.
Any other member MUST reject the owning object; implementations MUST NOT ignore,
preserve as a mixed member, route, normalize, or infer semantics for it. An open
Capability application input/output data contract or an intentionally keyed
application collection MUST remain a separately bounded data domain and MUST
NOT make protocol Core open.

**Applies to.** Every Ghost Bridge control, authority, lifecycle, security,
evidence, metadata, and error object.

**Lifecycle/state impact.** Validation only; unknown mixed Core data MUST NOT
reach dispatch, authority evaluation, or a state transition.

**Semantic failure.** An unknown member outside a registered extension point
makes the owning object invalid.

**Sources:** H-03, H-10, H-13. **Gaps:** GB-042, GB-043, GB-045.

## REQ-EXT-0002 - Per-object openness registry

**Requirement.** Implementations MUST apply this release-scoped openness
registry. `Closed` invokes REQ-EXT-0001. `Opaque` means structurally valid,
bounded, losslessly preserved, and non-authoritative without semantic use. A
permission to preserve or forward MUST be limited by REQ-EXT-0009 through
REQ-EXT-0011. A row does not define the object's later D1 wire fields or
lifecycle.

| Object/message class | Permitted extension point | Unknown extension or enum/message outcome | Preservation/forwarding and authority | H-10 and history/evolution |
| --- | --- | --- | --- | --- |
| Discovery | One advertised-extension declaration container; no mixed Core members | Optional advertisement may be opaque; required unsupported is incompatible; unknown Core discriminator rejects | Bounded same-public-context forwarding only; never selection, Trust, endpoint authority, or Connection authority | Registered entries participate if the owning discovery object is protected; later discovery cannot alter consent, Connection, or history |
| Release metadata and schema-bundle descriptor | No ordinary container; only immutable manifest-declared metadata slots | Unregistered slot and unknown release/profile/schema identity reject without fallback | Preserve a complete historical artifact, never a partial reconstruction | Entire protected descriptor participates except an H-10-defined proof self-field; immutable release artifacts and non-semantic errata only |
| Passport | Registered object-local extension container | Required, authority-critical, or unknown critical status/profile/auth/key-purpose/capability class rejects; optional opaque may be preserved but not used | Preserve/forward only with exact release and every applicable Passport/context binding; no capability or Trust claim | Every participating entry is protected in the Passport context; historical meaning remains original |
| Capability collection envelope | No collection-level semantic extension; item extensions stay inside items | Extension at envelope and unknown collection discriminator reject | Individual items may be preserved as permitted; collection metadata cannot hide extension semantics | Protected collection entries participate if an owning proof exists; new collection fields require a new release |
| Capability item or contract | Registered object-local container; application data contracts remain separate | Required unknown and unknown risk/effect/approval/receipt/status class reject; optional opaque cannot widen capability | Only known-safe presentation data may be opaque; authority-affecting data must be known, required, and selected | All participating values use the owning contract/manifest context; later meaning cannot rewrite a Connection or Invocation |
| Authentication message or profile data | Profile-specific registered container only | Required unknown or unknown mode/algorithm/principal/proof-result/key-purpose rejects; optional opaque only when registered non-secret and non-authoritative | Same exact authentication exchange only; no cross-target forwarding | Participating data uses its exact H-10 request/object context; profile identity and bindings remain immutable |
| Install Grant issue | Registered issuer-metadata container that cannot change secret, scope, expiry, purpose, or redemption | Required unknown or unknown Grant state/purpose rejects; optional opaque may be preserved | Secret-bearing material is never forwarded; selected metadata stays with the Grant | Participating values use the Grant's owning proof when protected; issued intent is immutable |
| Install Grant resolution or preview | Registered non-authoritative presentation container | Optional unknown may be opaque; required unsupported is incompatible; unknown resolution status rejects | Preserve only the exact existing context; infer no secret, consent, or authority | Protected response covers registered values; later metadata cannot alter redemption intent or committed result |
| Install Grant redemption request/result | Only registered selected extensions included in exact intent/result equality | Required unknown, unknown result/discriminator, invalid value, or present unselected value rejects; unknown optional authority-critical data must be absent unless H-04-safe | Preserve exact committed request/result with no drop/addition on replay | Every participating value is protected and included in H-06 exact-intent treatment as registered; no evolution rewrites commit |
| Connection | Registered selected-extension bundle and per-extension value container | Required unknown and unknown lifecycle/profile/limit/result reject; unsupported optional is unselected and absent from governed occurrences; present unselected rejects | Persist offered, omitted, selected, and limited evidence; forwarding only inside the exact bound context; no reconstruction from current metadata | Selected identities, requiredness, omissions, limitations, and values participate where the Connection is protected; material change requires replacement |
| Invocation | Registered container for exactly selected extensions | Unknown/unselected, unknown operation/discriminator/effect, invalid value, or missing required occurrence rejects; optional absence only if registered | A pure proxy may preserve selected opaque optional data only without authority/effect evaluation; endpoint understands all critical values | Every participating value is in the owning Invocation projection; accepted meaning is never reinterpreted |
| Approval Challenge | Registered selected container; authority-critical extension is required | Required unknown or unknown challenge/action/purpose rejects; optional presentation value may be opaque | Preserve only within the exact action; no cross-action forwarding or mutation | Participating value is part of exact action and owning projection; historical action keeps original meaning |
| Approval Decision | Registered selected container only where exact decision semantics remain intact | Required unknown or unknown decision/outcome/purpose rejects; optional non-semantic data may be opaque | Preserve exact evidence; never synthesize, map, or relocate values | Participating values use the decision proof and cannot move to Challenge/Invocation; consumption evidence is immutable |
| Task | Registered optional presentation/progress container only; never lifecycle extension | Authority/state extension rejects; unknown Task state/transition rejects semantic use and may quarantine; optional display data may be opaque | Monitor may preserve display data but cannot advance state from it | Protected snapshot includes registered data and state stays Core; later states require new release/H-09 governance |
| Cancellation intent | No ordinary semantic extension; only pre-registered optional correlation metadata | Unregistered extension or unknown cancellation action/result rejects | Preserve exact accepted intent/correlation only; transport abort remains distinct | Protected intent includes every registered member; race and terminal history are never reinterpreted |
| Result | Closed protocol envelope with registered envelope-metadata container; capability output remains its data-contract domain | Required unknown and unknown terminal/effect outcome reject; optional opaque metadata may be preserved | Preserve committed Result/output under the original contract; never infer success | Protected envelope extensions participate; output coverage follows H-09/H-10; Result is immutable |
| Receipt | One explicit registered container under stricter minimization | Required, binding-relevant, outcome/proof/revocation/history/billable/verification unknown rejects semantic verification or remains non-authoritative as owned; optional opaque only if bounded and protected | Preserve complete protected Receipt; no projection, universal forwarding, or authority inference | Every registered entry participates unless a separate H-10 domain says otherwise; original identities govern forever |
| Issuer metadata | Registered signed container that cannot weaken bootstrap/endpoint policy | Required/security unknown or unknown status/Trust profile/algorithm/purpose/endpoint class rejects current use; optional opaque creates no Trust | Preserve complete signed artifact; opaque data selects no key/endpoint | Every participating entry is protected; H-11 sequence/floor and history remain original |
| Key metadata and JWK-facing protocol structure | Registered key-metadata extension with explicit purpose/criticality; no arbitrary JWK extension | Security-critical or unknown key type/curve/algorithm/use/purpose/status/compromise result rejects; optional display data may be opaque outside cryptographic identity | No cross-context forwarding; preserve public historical evidence whole under H-11/H-12 | Participating metadata is protected; no extension changes key identity, purpose, or past validity |
| Revocation snapshot or set | Registered signed container that cannot change chain/floor semantics | Required/security or unknown snapshot/chain/verification outcome rejects or is indeterminate; optional opaque cannot affect status | Preserve complete protected snapshot for history; do not merge opaque data into current state | All registered entries participate; chain/floor are immutable and later schema cannot repair them |
| Revocation status or entry | Registered signed container for exact subject/status evidence | Required or unknown subject/status/reason/terminality/history result is indeterminate and never active authority; optional opaque never means active | Historical/diagnostic preservation only; not current authorization evidence | Participating values are protected; tombstone, effective time, and original meaning persist |
| Revocation history or checkpoint | No arbitrary semantic extension; immutable manifest-registered protected metadata only | Required unknown rejects; optional opaque cannot bridge a chain gap; unknown transition/checkpoint makes affected history indeterminate | Preserve entire chain element without coalescing or rewriting | Protected metadata participates in its exact domain; history remains append-only |
| Protocol error envelope | No general extension container; only registered details below | Unknown Core/error identity follows H-12 fail-closed, non-authoritative, no-inferred-retry handling | Diagnostics only under H-12 privacy; never forward secret context or derive success | Protected only if a separately accepted H-10 object exists; originating release and H-12 meaning control |
| Error details | Closed per known error; explicit release-registered namespaced optional detail entries | Unregistered Core detail rejects that entry; optional namespaced detail may be redacted opaque; required unknown makes detail set incompatible but cannot change valid base error | No cross-context forwarding; SDK may expose bounded opaque wrapper and must not auto-log it | Participates when its owning object is protected; origin release controls detail meaning |
| Profile and feature declarations | No arbitrary member extension; new identities only through immutable registry and H-04 selection | Required unknown fails; optional preview advertisement may be opaque; unknown state cannot be active | Preserve offered/omitted/selected/limited evidence; only exact understood selection is active | Protected selection covers identities/states; later registry cannot add to a Connection |
| Extension declaration | Declaration is itself closed; no recursive generic container | Unknown declaration member or lifecycle/requiredness/profile/dependency class rejects selection | Preserve the complete immutable declaration; no recursive negotiation or aliasing | Declaration participates in release/Connection protection as applicable; identity/definition remain immutable |
| Extension value container | Closed container semantics; a key is an extension point only by exact registration and selection | Invalid/unregistered/non-namespaced key rejects; required unknown rejects; optional unknown opaque only in explicitly permitted preview/forward/history context | Preserve exact semantic value only if lossless and context-permitted | Every value inherits owning H-10 projection; container/entries retain original release and identity |
| Separately registered extension message | Closed base dispatch envelope with exact selected extension payload | Unknown base discriminator rejects; unknown/unselected extension message rejects endpoint dispatch | Pure proxy may forward only where registered, labels semantics unevaluated, and preserves all context | Protected payload participates in its registered owning domain; new message type requires release governance |

**Applies to.** Every listed object/message class, including producers,
consumers, validators, proxies, stores, and historical readers.

**Lifecycle/state impact.** Each row's outcome controls validation,
preservation, or pre-dispatch rejection only; no opaque or unknown value creates
a lifecycle transition or authority.

**Semantic failure.** The row's reject, incompatible, unsupported, or
indeterminate outcome is mandatory. An implementation unable to distinguish or
preserve the assigned class MUST fail closed and MUST NOT substitute a generic
open-object behavior.

**Sources:** H-03, H-04, H-05, H-06, H-07, H-08, H-09, H-10, H-11, H-12,
H-13. **Gaps:** GB-042, GB-043, GB-045.

## REQ-EXT-0003 - Class-specific unknown values and dispatch

**Requirement.** Unknown authority, lifecycle, state, security, Trust,
revocation, proof-result, algorithm, profile, authentication, key-purpose, error,
informational, and extension-owned values MUST receive only the class-specific
outcome in REQ-EXT-0002. No unknown enum MAY be mapped to a supposedly safe
known value. An unknown Task state MUST NOT be guessed terminal, nonterminal,
successful, or failed; an unknown revocation/security/history result MUST NOT
create current authority; an unknown algorithm/profile/key-purpose/
authentication value MUST NOT fall back. An unknown base message, operation
discriminator, resource kind, or Core union tag MUST reject before dispatch and
MUST NOT route to generic success, mutate state, consume Approval, create a
Task, or trigger an effect.

**Applies to.** All protocol enums, identifiers with registered closed classes,
message dispatch, resource kinds, and union tags.

**Lifecycle/state impact.** Rejection occurs before dispatch or semantic state
use; opaque informational display causes no state change.

**Semantic failure.** The owning selection, verification, object use, or
operation fails or becomes indeterminate according to its registered class;
fallback and default mapping are prohibited.

**Sources:** H-09, H-11, H-12, H-13. **Gaps:** GB-042, GB-045.

## REQ-EXT-0004 - Immutable extension identity

**Requirement.** An extension identity MUST be one immutable, case-sensitive,
lowercase ASCII identifier consisting of a reverse-DNS owner namespace followed
by `/` and an extension name. Namespace labels MUST use lowercase ASCII letters,
digits, and internal hyphens; the extension name MAY additionally use `.` and
`_`. The complete identity MUST be no longer than 255 ASCII characters. Exact
component and schema bounds remain D2-owned and MUST NOT be inferred here.
Comparison MUST use exact code-unit equality. A receiver MUST NOT lowercase,
trim, Unicode-normalize, repair, alias, or otherwise transform an identity.
Duplicate identities, including equal duplicate declarations, MUST reject the
containing selection or object without first/last-wins behavior. A namespace
MUST NOT be reassigned; aliases are prohibited; and a compatibility link MUST
NOT make two identities substitutes. Experimental or stable state MUST be
immutable release-registry metadata, not an alternate spelling.

**Applies to.** Extension and experiment declarations, advertisements,
selections, value-container keys, dependencies, compatibility links, and
historical evidence.

**Lifecycle/state impact.** Identity validation and duplicate detection only;
an identity grants no support, selection, or authority.

**Semantic failure.** A malformed, normalized, duplicated, reassigned, or
aliased identity makes the containing declaration set or object invalid.

**Sources:** H-03, H-13, H-14. **Gaps:** GB-042, GB-043, GB-046.

## REQ-EXT-0005 - Extension locations and semantic limits

**Requirement.** An extension MAY occur only in an explicit registered
namespaced object-local extension container or as a narrowly registered,
separately selected extension message inside an already governed operation and
context. Arbitrary mixed-in Core members are prohibited. An extension MUST NOT
silently create a new HTTP resource, status or retry meaning, authentication
method, release/profile negotiation mechanism, lifecycle state or transition,
authority source, or second H-03 selection channel. An ordinary optional
extension MAY add only semantics whose complete omission satisfies H-04; it
MUST NOT conceal authority-bearing Core meaning.

**Applies to.** All extension containers, extension messages, protocol routes,
authentication/profile declarations, lifecycle objects, and errors.

**Lifecycle/state impact.** No extension creates an unregistered operation or
transition; selected extensions act only inside their owning accepted context.

**Semantic failure.** Material at an unregistered location or attempting a
prohibited semantic channel makes the owning object or candidate invalid.

**Sources:** H-03, H-04, H-05, H-12, H-13. **Gaps:** GB-042, GB-043, GB-045.

## REQ-EXT-0006 - Required, optional, selected, and occurring matrix

**Requirement.** Selection optionality and per-object occurrence optionality
MUST be separate immutable attributes. `Optional` MUST mean that complete
omission preserves input, output, side-effect, authority, security, error, and
historical meaning; it MUST NOT mean that arbitrary namespace content may be
ignored. The following matrix MUST apply:

| Condition | Required outcome |
| --- | --- |
| Known required extension | Exact definition, dependencies, profiles, security prerequisites, bilateral support, and final selection MUST all succeed; every required occurrence MUST be present |
| Known optional extension | Active only with exact bilateral support and H-04 selection; if unselected, governed values/semantics MUST be absent while immutable evidence records offer/omission/limitation/selection |
| Unknown or unsupported required extension | Candidate or object use MUST be incompatible; no ignore, downgrade, or nearby-release fallback |
| Unknown optional advertisement during discovery/preview | MAY be preserved as bounded non-authoritative data only where REQ-EXT-0002 permits; an unaware party MUST NOT select it |
| Unknown optional extension on authority/lifecycle message | MUST reject unless an explicitly permitted forwarding-only intermediary evaluates no semantics and preserves it losslessly |
| Duplicate or conflicting identity | Declaration set/object MUST reject before selection or verification |
| Required dependency unavailable | Candidate MUST be incompatible; dependency MUST NOT be recursively negotiated or silently dropped |
| Optional dependency unavailable | Extension MUST remain unselected and omission/limitation MUST be recorded; loss after active selection is a material change, not silent omission |
| Selected extension absent at an occurrence | MUST reject when required there; MAY be absent only when that exact occurrence is registered optional |
| Extension present but unselected | Governed Connection traffic MUST reject; presence MUST NOT self-select it |
| Registered value violates shape or limits | Owning object MUST reject; invalid known data MUST NOT be reclassified as unknown optional data |

Omission, limitation, or selection evidence MUST NOT itself select an extension
or create authority.

**Applies to.** Extension advertisements, declarations, H-04 selection,
Connection evidence, and every later object occurrence.

**Lifecycle/state impact.** Required failure prevents candidate/operation use;
optional omission is durably recorded at Connection commit and changes no
existing Connection afterward.

**Semantic failure.** The matrix's incompatible, reject, unselected, omitted,
or material-change outcome MUST be used; implementations MUST NOT convert a
required or invalid occurrence into optional success.

**Sources:** H-04, H-07, H-13. **Gaps:** GB-006, GB-042, GB-045.

## REQ-EXT-0007 - Authority-affecting extensions narrow only

**Requirement.** An extension with authority or security meaning MUST only
narrow authority already accepted under H-02/H-07. It MUST be explicitly
classified as authority-critical, required for H-04 selection and at every
relevant occurrence, known and understood by every party that evaluates the
action, exactly selected, and protected in its applicable H-10 owning context.
It MUST NOT create a new authority source or expand a capability, tenant,
principal, consent, Connection, or authorization intersection. Ordinary
optional extensions MUST NOT carry authority-bearing semantics, and
cryptographic validity or opaque preservation MUST NOT imply authorization,
semantic validity, safety, or current Trust.

**Applies to.** Authority/security-affecting extension definitions, selection,
Connection binding, governed messages, and evaluators.

**Lifecycle/state impact.** A valid authority-critical extension may narrow the
committed and evaluated allowed set; it never creates a Connection or expands
state authority.

**Semantic failure.** An unknown, optional, unselected, unprotected, or
not-universally-understood authority-affecting extension makes the applicable
candidate or operation incompatible and MUST fail closed.

**Sources:** H-02, H-04, H-07, H-10, H-13. **Gaps:** GB-006, GB-042, GB-045.

## REQ-EXT-0008 - Exact finite dependency resolution

**Requirement.** Extension dependencies, conflicts, incompatibilities,
prerequisites, required Core profiles/features, and object occurrences MUST be
finite, acyclic, exact-identity, and exact-release-scoped immutable declaration
data evaluated to complete closure before H-04 selection. Cycles, duplicates,
ambiguity, conflicts, and unsatisfied required prerequisites MUST fail
deterministically. Cross-release use MUST require an explicit H-03 compatibility
edge for the exact direction. Numeric or minimum release floors, semantic-
version ranges, epoch proximity, monotonic version comparison, `latest`/
`current`, nearest/newer/lower/alternative/first-common fallback, recursive
runtime activation, and implicit dependency opt-in are prohibited. Dependency
resolution MUST NOT become a second release-negotiation channel.

**Applies to.** Release-scoped extension/experiment declarations and H-04
candidate evaluation.

**Lifecycle/state impact.** Closure is evaluated before selection; after commit
the exact dependency set is immutable and later registry changes cause no state
change.

**Semantic failure.** Invalid or unsatisfied required closure makes the
candidate incompatible; an optional extension with unavailable closure remains
unselected and recorded without fallback.

**Sources:** H-03, H-04, H-13. **Gaps:** GB-005, GB-006, GB-042, GB-046.

## REQ-EXT-0009 - H-10 participation and distinct validation claims

**Requirement.** Every registered extension value participating in an already
protected owning object MUST participate in that owning H-10 semantic projection
unless a separately accepted H-10 domain defines a different owning object.
It MUST NOT be treated as a detachable unsigned annotation. Semantic
understanding, structural validation, H-10 canonicalization, cryptographic
verification, preservation, forwarding, and authorized local application use
MUST remain distinct claims. An implementation MAY claim integrity of unknown
participating data only if it can establish H-10 eligibility, represent the
exact JSON semantic value losslessly, identify the original release's exact
owning domain, and verify the proof. That integrity claim MUST NOT imply
extension conformance, semantic validity, safety, authorization, current Trust,
or application meaning. A standalone extension proof MUST require a separately
accepted H-10 domain and MUST NOT be inferred from its namespace.

**Applies to.** Protected protocol objects, participating extension values,
verifiers, proxies, stores, and proof claims.

**Lifecycle/state impact.** Integrity validation alone changes no lifecycle or
authority state.

**Semantic failure.** Inability to identify or reproduce the required owning
projection makes proof use and protected semantic use fail; the value MUST NOT
be stripped while retaining the original proof claim.

**Sources:** H-10, H-13. **Gaps:** GB-042, GB-043, GB-045.

## REQ-EXT-0010 - Lossless preservation and mutation prohibition

**Requirement.** When REQ-EXT-0002 permits or requires preservation, an
implementation MUST retain the exact H-10-eligible JSON semantic value, member
presence, array order, number value, string code points, extension identity,
protocol release, and owning context. It MAY alter insignificant wire whitespace
or object-member order only when no semantic or protected carrier changes.
`Ignored` MUST NOT mean dropped. A parser, runtime number model, generated type,
database, mapper, or serializer MUST NOT normalize strings or numbers,
approximate unsupported numbers, materialize defaults, change absence to
`null`, empty, or default, remove, rename, re-parent, merge, split, reconstruct,
or reinterpret extension data, or rewrite a historical object under a current
schema. An implementation MUST NOT add material to another producer's protected
object or mutate it while retaining the original proof. It MAY add its own value
only where registered, selected, occurrence-permitted, and newly protected by
an authorized producer.

**Applies to.** Parsing, storage, type mapping, serialization, proxying,
export/import, SDK exposure, migration tooling, and protected objects.

**Lifecycle/state impact.** Preservation is state-neutral; it MUST NOT mutate a
Connection, governed object, or history.

**Semantic failure.** Inability to preserve required or protected material
losslessly MUST reject storage, forwarding, verification, or use; lossy
approximation and proof reuse are prohibited.

**Sources:** H-03, H-10, H-13. **Gaps:** GB-042, GB-043, GB-044, GB-045.

## REQ-EXT-0011 - Context-preserving forwarding and privacy

**Requirement.** Forwarding MUST occur only for an object and role expressly
permitted by REQ-EXT-0002. It MUST preserve the exact protocol release, owning
object/message, extension identity and value, and every organization/workspace,
tenant, principal, audience, target, scope, Connection, purpose, and authorized-
route binding actually present in the owning object or accepted context.
Material bound to one context MUST NOT cross to a different context. A genuinely
public or non-tenant object MUST NOT acquire a fictitious binding. Public MUST
NOT mean authoritative, safe to log, universally forwardable, reusable across
origins, or permission to move credentials. A forwarding-only implementation
MUST state no semantic-validity claim and MUST continue to enforce H-12
transport/resource boundaries.

Unknown or opaque data MUST be treated as potentially personal, tenant-
sensitive, credential-adjacent, policy-sensitive, and security-sensitive. Raw
values MUST NOT be logged, traced, used as metric labels, crash-reported,
analytics-exported, or displayed by default. Implementations MAY record only
the H-12-permitted bounded identity, presence, size, structural rejection class,
and redacted safe status. Preservation MUST NOT authorize product inspection;
data collection and retention MUST be limited to the selected purpose and the
owning object's applicable rules.

**Applies to.** Discovery proxies, protocol gateways, SDKs, stores, exports,
diagnostics, telemetry, and every forwardable extension-bearing object.

**Lifecycle/state impact.** Forwarding and telemetry create no protocol
authority or lifecycle transition.

**Semantic failure.** Loss of an applicable context binding, privacy
classification, protected content, or lossless representation MUST stop
forwarding/preservation; cross-context or unsafe raw telemetry use is
prohibited.

**Sources:** H-05, H-10, H-12, H-13. **Gaps:** GB-042, GB-045.

## REQ-EXT-0012 - Extension evolution and immutable selection

**Requirement.** Every extension definition MUST be owned by one exact H-03
release and MUST immutably define its identity, stable/experimental state,
owning objects/messages, selection and occurrence requiredness, profiles,
dependencies/conflicts, shape and limits, semantic classes, authority/security
role, data classification, H-10 participation, forwarding permissions, and
historical rule. A later registry, package, or implementation MUST NOT make an
unknown value known retroactively. Adding or removing an extension definition,
making an optional extension required, changing a dependency/conflict,
selection or occurrence semantics, shape, meaning, H-10 participation,
authority/security/privacy classification, or permitted owning message MUST use
a new H-03 release and affected identities as REQ-COMP-0008 requires. An
already-published definition MAY admit only values and occurrences it expressly
predeclared. No change MAY add, remove, or reinterpret an extension on an active
Connection or historical object.

**Applies to.** Release registries, extension definitions, schema bundles,
Connections, governed objects, current implementations, and history.

**Lifecycle/state impact.** Existing selections remain pinned. Material changed
use requires new preview, consent, and a new/replacement Connection.

**Semantic failure.** Same-identity semantic mutation, retroactive knowledge,
or current-registry reinterpretation is invalid and MUST NOT be selected,
emitted, accepted, or used for historical verification.

**Sources:** H-03, H-04, H-07, H-10, H-13. **Gaps:** GB-043, GB-044, GB-045,
GB-046.

## REQ-EXT-0013 - Experimental selection and change

**Requirement.** Every experiment MUST be default-off and have an immutable
namespaced experimental identity and exact release-scoped definition under
REQ-EXT-0012. It MAY be selected on an initial Connection only with exact
bilateral support, H-04 selection, explicit Host request, explicit human consent
where required, complete exact dependency closure, isolation from unselected
peers and tenants, and immutable H-07 Connection persistence of the selection,
omissions, and limitations. Code presence, profile membership, dependency
presence, deployment rollout, or current registry status MUST NOT opt in a
party. Experimental status MUST NOT open Core or relax any lifecycle, Trust,
authentication, proof, transport, privacy, authority, or security floor. Adding,
removing, or materially changing an experiment after Connection creation MUST
use a new experimental identity or release definition as applicable and the new
preview, consent, and new/replacement Connection path.

**Applies to.** Experimental declarations, advertisements, H-04 selection,
Connections, dependencies, and experiment-bearing objects.

**Lifecycle/state impact.** A complete opt-in may be bound only at initial H-06
Connection commit; no implicit or in-place activation/deactivation exists.

**Semantic failure.** Missing support, request, consent, dependency, isolation,
or understanding leaves the experiment disabled or makes it incompatible when
required; material in-place change MUST fail closed.

**Sources:** H-01, H-04, H-07, H-13. **Gaps:** GB-006, GB-042, GB-046.

## REQ-EXT-0014 - Graduation and experimental data

**Requirement.** Graduation of an experiment MUST create a new immutable stable
extension identity plus an explicit directed compatibility or migration link;
it MUST NOT mutate, alias, relabel, or stabilize the experimental identity.
Graduation MUST NOT select the stable identity on an existing Connection. Use
of the stable identity MUST satisfy its exact release, bilateral support,
selection, preview, consent, and new/replacement Connection rules. Historical
experimental data MUST remain interpreted under the experimental identity. A
stable definition MUST choose for each data class either: historical-only
reading under the experimental identity; an explicit auditable transformation
that creates a distinct stable object while retaining provenance and the
original object; or explicit coexistence without aliasing. Silent backfill,
in-place mutation, current-schema reinterpretation, and reuse of an old proof as
proof of stable semantics are prohibited.

**Applies to.** Experimental and stable identities, registries, Connections,
persisted objects, transformations, proofs, and historical readers.

**Lifecycle/state impact.** Graduation causes no existing state transition; use
of stable semantics requires new selection, and any transformation is a
separately governed migration rather than implicit protocol behavior.

**Semantic failure.** Same-identity graduation, silent conversion, provenance
loss, or old-proof reuse is invalid and MUST fail closed.

**Sources:** H-03, H-04, H-07, H-10, H-13, H-14. **Gaps:** GB-043, GB-044,
GB-046.

## REQ-EXT-0015 - Distinct lifecycle and support states

**Requirement.** Extension and experiment state classifications MUST keep
non-selectable for new Connections, locally unsupported, deprecated,
future-release removed, abandoned, security-forbidden, and historical-only
distinct. None of these states MUST automatically alias an identity, erase
history, widen authority, or silently edit an active Connection. A future
release MAY make an identity non-selectable or removed while historical readers
retain its original meaning. Deprecation and abandonment MUST NOT themselves
remove data or authority; security prohibition MUST follow the applicable
H-07/H-11 response without rewriting history. H-14 MUST own registry operator,
publisher, release, support, deprecation, removal-timeline, EOL, and commitment
semantics.

**Applies to.** Extension/experiment registry status, deployment support,
candidate eligibility, active Connections, and historical objects.

**Lifecycle/state impact.** New-Connection eligibility may narrow; any active-
Connection suspension, denial, replacement, closure, or revocation occurs only
under its owning accepted lifecycle/security rule.

**Semantic failure.** A non-selectable, unsupported required, or security-
forbidden item makes new selection incompatible as applicable; implementations
MUST NOT collapse state classes or infer an active-Connection transition.

**Sources:** H-03, H-07, H-11, H-13, H-14. **Gaps:** GB-043, GB-044, GB-046.

## Non-normative D2 traceability

Later D2 work is expected to derive closed-Core, unknown-field/value/message,
required/optional/selected occurrence, dependency-cycle, lossless round-trip,
context-forwarding, protected-projection, schema-evolution, experiment opt-in,
graduation, removal, and historical-data cases from these requirements. This
chapter creates no registry artifact, schema, fixture, vector, migration, or
conformance asset and closes no `GB-*` gap.
