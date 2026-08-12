# Versioning and capabilities

This chapter defines the single deterministic protocol-release and H-04
selection model for `ghostbridge/e1.r0-draft.1`. It defines semantic inputs and
results, not JSON member names, canonical digest bytes, or a second Connection
lifecycle.

## Release identity

## REQ-VERS-0001 - Canonical release grammar

**Requirement.** A normal Ghost Bridge protocol release identity MUST match one
of these semantic grammars exactly:

```text
final:     ghostbridge/e<epoch>.r<revision>
non-final: ghostbridge/e<epoch>.r<revision>-<stage>.<iteration>
```

`<epoch>`, `<revision>`, and `<iteration>` MUST each be canonical unsigned ASCII
decimal in the inclusive integer range `0` through `2147483647`: one through ten
digits, no leading zero unless the value is exactly `0`, and no sign, decimal
point, exponent, or whitespace. A ten-digit component greater than `2147483647`
MUST be rejected. Parsing MUST NOT wrap, clamp, coerce, round, pass through a
lossy floating-point value, or vary with implementation integer width. `<stage>`
MUST be exactly one of `experimental`, `draft`, `alpha`, `beta`, or `rc`. The
entire identity MUST be lowercase ASCII and case-sensitive; non-ASCII,
normalization, trimming, case folding, punctuation repair, and alternative
spellings are prohibited. `ghostbridge/e1.r0-draft.1` is the exact identity of
this normative-writing draft.

**Applies to.** Every protocol-release identity in advertisements, artifacts,
negotiation inputs/results, Connections, governed messages, and history.

**Lifecycle/state impact.** Validation only; it MUST occur before unknown,
support, compatibility, or selection processing.

**Semantic failure.** A non-canonical or out-of-range identity makes the
containing authoritative advertisement, offer, result, or object invalid.

**Sources:** H-03, H-13. **Gaps:** GB-005, GB-043, GB-044, GB-045.

## REQ-VERS-0002 - Equality and total preference order

**Requirement.** Two normal release identities MUST be equal only by exact
code-unit equality after each passes REQ-VERS-0001. Their total preference order
MUST be computed without locale-sensitive comparison as follows:

1. compare epoch integer values;
2. if equal, compare revision integer values;
3. if equal, compare stage using
   `experimental < draft < alpha < beta < rc < final`, where a final identity
   has no stage suffix; and
4. for equal non-final stages, compare iteration integer values.

The greater value is later in this preference/chronology order. Ordering MUST
NOT imply compatibility, implementation support, release support, conformance,
security eligibility, safety, or authority. No stable sort, input order, locale,
or implementation-specific tie breaker MAY affect the result.

**Applies to.** Validated normal H-03 identities during local preferred-version
checking and final bilateral selection.

**Lifecycle/state impact.** None until the final selected result is committed by
H-06.

**Semantic failure.** An implementation unable to reproduce this order MUST
treat negotiation as invalid and MUST NOT select or commit a release.

**Sources:** H-03. **Gaps:** GB-005, GB-044.

## REQ-VERS-0003 - Identity-class separation and legacy identity

**Requirement.** Protocol release identity MUST remain distinct from schema-
bundle or individual-schema identity, profile or facet identity, authentication-
profile identity, capability version, extension identity, experiment identity,
selection-algorithm identity, SDK or package version, implementation build,
deployment version, product channel, and mutable support-state record. None of
those identities MUST be parsed, ranked, or substituted as a protocol release.
`ghostbridge/0.1-draft` MUST remain an immutable legacy historical identity
outside REQ-VERS-0001 and MUST NOT be treated as epoch 0, epoch 1, an alias of
`ghostbridge/e1.r0-draft.1`, or a candidate under the normal grammar unless an
exact historical reader expressly supports that legacy identity.

**Applies to.** All release, artifact, registry, implementation, deployment, and
historical metadata.

**Lifecycle/state impact.** None; the distinction prevents selection and
historical reinterpretation errors.

**Semantic failure.** Cross-class substitution, legacy relabeling, or deriving
a release from another version class is invalid metadata and MUST fail closed.

**Sources:** H-03, H-10, H-13, H-14. **Gaps:** GB-005, GB-043, GB-044.

## Canonical inputs and candidate eligibility

## REQ-VERS-0004 - Participant release metadata

**Requirement.** Each participant's release metadata MUST provide a set of
unique exact supported-release records and, for every claimed release, the
required immutable release, specification, schema-bundle, compatibility,
registry, and other release-defined artifact identities and integrity
references. It MUST include the release-scoped status and security eligibility,
compatibility declarations, `preferredVersion` consistency assertion, and
H-04 declarations that its owning release requires. Client/Host input MUST also
carry its release constraints, required and optional H-04 items, exact Host
selections, applicable identity and tenant context, freshness, and immutable
consent-envelope reference. Agent input MUST bind its Agent and Passport,
deployment advertisement, freshness, and release-scoped support evidence. An
input collection MUST be treated as a set: duplicate identities or conflicting
records MUST reject it, and array order, object enumeration, `Set` iteration,
locale, package defaults, Platform preference, and deployment defaults MUST NOT
be inputs.

**Applies to.** Client/Host offers, Agent advertisements, release manifests, and
the pre-Connection selection context.

**Lifecycle/state impact.** None; these inputs remain non-authoritative until
the H-06 commit.

**Semantic failure.** A non-canonical identity, duplicate, conflict, missing
source-required declaration, or missing/untrusted required artifact makes that
participant's containing metadata invalid.

**Sources:** H-01, H-03, H-04, H-10, H-13. **Gaps:** GB-005, GB-006, GB-042,
GB-045.

## REQ-VERS-0005 - Participant-local preferredVersion

**Requirement.** For each participant independently, `preferredVersion` MUST be
a redundant consistency assertion equal to the greatest release under
REQ-VERS-0002 in that participant's own advertised set that was locally status-
eligible and locally security-eligible when the metadata was created. Each
participant's canonical input MUST include it. It MUST be a member of that set
and MUST reflect the same status/security material carried or immutably
referenced by the participant. It MUST NOT express a unilateral lower
preference, rank bilateral candidates, or force the final selected release.

**Applies to.** Each Client and Agent supported-release advertisement
independently.

**Lifecycle/state impact.** None; this is input consistency validation, not
bilateral selection.

**Semantic failure.** A missing, invalid, stale, out-of-set, locally ineligible,
or lower `preferredVersion` makes that participant's containing metadata
invalid; it MUST NOT be repaired or used as a preference hint.

**Sources:** H-03. **Gaps:** GB-005.

## REQ-VERS-0006 - Exact bilateral candidate set

**Requirement.** The initial bilateral candidate set MUST be the mathematical
intersection of the Client and Agent sets of exact advertised release
identities. A canonical release unknown to a receiver but outside that exact
intersection MUST NOT by itself invalidate negotiation. A known release that a
participant does not implement or advertise is unsupported and MUST NOT become
a candidate. No compatibility edge, shared epoch, adjacent revision, package
support, `latest` pointer, profile membership, or implementation behavior MAY
add a release to the intersection.

**Applies to.** The validated participant supported-release sets.

**Lifecycle/state impact.** Formation and exclusion of candidates only; no
authority or state transition.

**Semantic failure.** An empty intersection proceeds only to the stable
no-compatible-release semantic outcome; it MUST NOT trigger fallback.

**Sources:** H-03, H-04. **Gaps:** GB-005, GB-044, GB-045.

## REQ-VERS-0007 - Per-candidate immutable evidence

**Requirement.** Every exact intersecting candidate MUST be resolved and
evaluated independently under that candidate's own trusted immutable H-03 and
H-04 release, specification, schema, compatibility, status/security, profile,
feature, authentication, capability, extension, experiment, and registry
material. Evidence, defaults, declarations, or compatibility conclusions from
one release MUST NOT satisfy another. An unresolved intersecting candidate MUST
be classified as unknown and removed. An implementation MUST NOT infer unknown
meaning from epoch or revision proximity, a newer implementation, a package,
current deployment behavior, or mutable registry data.

**Applies to.** Each member of the exact bilateral candidate set and every
release-scoped evidence reference used for it.

**Lifecycle/state impact.** Removes unresolved candidates before selection;
none otherwise.

**Semantic failure.** Missing, unverifiable, mismatched, or cross-release
required evidence makes only that candidate unknown or ineligible unless it
also proves the containing authoritative metadata internally invalid.

**Sources:** H-03, H-04, H-10, H-13. **Gaps:** GB-005, GB-006, GB-043, GB-044,
GB-045.

## REQ-VERS-0008 - H-03 candidate predicates

**Requirement.** Before ordering, each candidate MUST independently satisfy all
applicable H-03 release predicates, including exact bilateral support, required
immutable artifacts, explicit directed compatibility evidence required for the
candidate and each communication direction, release status, local and bilateral
security eligibility, withdrawal eligibility, freshness, and the release and
artifact bounds of the preview and consent envelope. A withdrawn or security-
forbidden release MUST be ineligible for a new Connection. Deprecation alone
MUST NOT imply withdrawal or incompatibility, and support metadata MUST NOT
rewrite historical meaning.

**Applies to.** Each exact candidate release before H-04 eligibility and final
ordering.

**Lifecycle/state impact.** Ineligible candidates are removed before authority
commit; active-Connection treatment remains H-07/H-11/H-14-owned.

**Semantic failure.** Failure of a required H-03 predicate removes the exact
candidate; if none remain, negotiation is incompatible without fallback.

**Sources:** H-03, H-11, H-14. **Gaps:** GB-005, GB-044.

## REQ-VERS-0009 - Role-scoped Core and Governed facets

**Requirement.** Every candidate MUST establish the exact release's applicable
role-scoped Core baseline. A participant claiming the Host Application role
MUST implement that release's Host Core facet; a participant claiming the Agent
role MUST implement its Agent Core facet; and a participant claiming a Trust-
verification role MUST implement its Trust-verification Core facet. A valid
Host-to-Agent Connection MUST satisfy both Host and Agent Core facets. Governed
Execution MAY be globally optional, but every participating role that claims or
uses a governed feature MUST satisfy its applicable Governed facet. A Core-only
role MUST deterministically reject unsupported governed requirements. A facet
claim proves only the registered invariants of that exact release, role, and
facet; it MUST NOT enable an arbitrary capability or authorize an action.
Historical C1-C3 and G1-G3 claims MUST remain `ghostbridge/0.1-draft` history and
MUST NOT be mapped to these facets.

**Applies to.** Release-scoped participant role/facet claims and every exact
Connection candidate.

**Lifecycle/state impact.** A missing required facet removes the candidate;
facets grant no authority before commit.

**Semantic failure.** A missing or false required Core/Governed facet makes the
candidate incompatible; an unsupported governed requirement MUST NOT be
silently downgraded to Core-only behavior.

**Sources:** H-04. **Gaps:** GB-006, GB-044.

## REQ-VERS-0010 - Layered monotonic intersection

**Requirement.** For each candidate, semantically overlapping source claims
MUST be evaluated as a monotonic intersection under the immutable release
registry's source-ownership rules:

| Source | Permitted semantic role |
| --- | --- |
| Passport or immutable capability manifest | Identity-authorized maximum support and restriction ceiling |
| Discovery | Current deployment-supported and operationally available subset |
| Connection Offer and Install Grant | Transaction-specific subset and restrictions |
| Host metadata | Required items, optional interests, exact selections where required, and preferences among already eligible choices |
| Human consent | Immutable permitted subset |
| Deployment policy | Denial or narrowing only |

No source MUST widen another. A source-required absent declaration MUST make
that source's metadata invalid; an optional absent declaration MUST mean that no
claim was made; explicit false, unsupported, disabled, excluded, or limited
meaning MUST narrow; and an omitted value MUST NOT acquire an implementation
default. A source MUST NOT be treated as denying a semantic dimension it is not
registered to carry.

**Applies to.** Every release-scoped profile, feature, capability,
authentication, extension, experiment, scope, and restriction claim with more
than one applicable source.

**Lifecycle/state impact.** Narrows candidate eligibility and the eventual
selected set; no authority exists before commit.

**Semantic failure.** Required absence or a contradiction affecting shared
identity, release, scope, consent, authentication, profile invariants, global
extensions, or security makes the source invalid or candidate incompatible as
REQ-VERS-0013 requires.

**Sources:** H-01, H-04, H-07. **Gaps:** GB-006, GB-042, GB-045.

## REQ-VERS-0011 - Profiles, features, and exact capabilities

**Requirement.** An immutable release registry MUST classify every
profile/facet property as invariant or capability-narrowable. An unclassified
property MUST be treated as invariant and fail closed. A capability restriction
MAY narrow a property only when the profile expressly classifies it as
capability-narrowable, and it MUST apply only to one exact capability key and
exact version. A capability MUST NOT expand a profile or global-feature claim.
A global feature `true` value MUST be only a coarse availability ceiling, not
enablement; a global `false` value MUST prohibit capability-level expansion.
Global feature-to-profile relationships MUST come from immutable release-scoped
evidence, not SDK constants or Platform defaults. Exact capability keys,
versions, contracts, restrictions, risk/effect semantics, and required Host
conditions MUST be evaluated before selection.

**Applies to.** Candidate profile/facet claims, global features, capability
contracts, and capability-local restrictions.

**Lifecycle/state impact.** Determines candidate eligibility and exact optional
capability inclusion; no direct state transition.

**Semantic failure.** A false global invariant or global-feature contradiction
makes the applicable metadata/candidate invalid; only a safely isolated optional
capability conflict may be excluded under REQ-VERS-0013.

**Sources:** H-04. **Gaps:** GB-006.

## REQ-VERS-0012 - Authentication, extensions, and experiments

**Requirement.** For each candidate, the Host MUST supply one exact
authentication-profile identifier from the exact common eligible set, and the
Agent MUST independently verify it for that release and context. No rank,
first-common, array-order, provider default, nearest identifier, bearer-for-PoP,
weaker-profile, or `none` fallback is permitted. H-05 exclusively owns
credential establishment, proof, audience, expiry, storage, rotation,
revocation, and request-authentication semantics. Required extensions and their
finite dependency closure MUST be understood, supported, and selectable under
the candidate. An experiment MUST remain off unless both participants support
its exact identity, the Host explicitly requests it, required human consent is
present, its exact dependency closure is satisfied, and it cannot weaken or
redefine Core, tenant, Trust, revocation, consent, capability, authorization, or
other shared security semantics.

**Applies to.** Candidate authentication-profile selection, required/optional
extension eligibility, and experimental opt-ins.

**Lifecycle/state impact.** Determines precommit eligibility and the exact
consented result; no authentication, extension, or experiment grants Connection
authority before H-06 commit.

**Semantic failure.** No common eligible authentication identifier, an unknown
or unsupported required extension, an unsatisfied required dependency, or an
incompletely opted-in experiment makes the applicable candidate incompatible;
an optional unsupported item is omitted and recorded where safe.

**Sources:** H-04, H-05, H-13. **Gaps:** GB-006, GB-042, GB-046.

## REQ-VERS-0013 - Failure granularity

**Requirement.** The containing authoritative metadata or whole candidate MUST
be invalid or incompatible when a contradiction affects participant, Agent,
Passport, or manifest identity/authenticity; exact release; required Core;
globally false profile invariant or global feature; authentication eligibility;
required global extension; organization, workspace, Host/audience, or principal
scope; consent integrity; Offer/Grant widening; shared evidence authenticity; or
any shared security property affecting more than one capability. Only one exact
capability key and version MAY be excluded when all of these conditions hold:

1. the conflict is confined to that exact capability and version;
2. the capability is optional to the Host;
3. no profile invariant is falsified;
4. no global feature claim is falsified;
5. shared authentication, Trust, tenant, consent, extension, evidence, and other
   security properties are unaffected; and
6. exclusion leaves complete and safe semantics for every remaining capability.

A Host-required excluded capability MUST make the candidate incompatible.
Unavailable optional profiles, features, extensions, and capabilities MAY be
omitted only where their complete base semantics remain unchanged, and every
omission or limitation MUST be recorded. Unknown required items MUST fail;
unknown optional items MAY be omitted and recorded only where their registry
class permits. Internally contradictory metadata MUST NOT be converted to a
compatible-with-limitations result.

**Applies to.** Candidate-wide and exact capability-scoped H-04 contradictions
and unavailable items.

**Lifecycle/state impact.** Removes a candidate or records an exact optional
exclusion before commit; an active Connection later authorizes only its recorded
enabled set.

**Semantic failure.** The semantic outcome is invalid metadata, candidate
incompatibility, or exact optional-capability exclusion according to the
exhaustive boundary above; final public errors remain D1-07-owned.

**Sources:** H-04, H-07, H-13. **Gaps:** GB-006, GB-042, GB-045.

## Selection and binding

## REQ-VERS-0014 - Single deterministic selection algorithm

**Requirement.** Client and Agent MUST independently compute steps 1 through 10
of this one semantic algorithm from the same canonical semantic inputs:

1. validate all participant release identities and records under
   REQ-VERS-0001 and REQ-VERS-0004; reject the containing participant metadata
   on any invalid identity, duplicate, conflict, or missing required artifact;
2. validate each participant-local `preferredVersion` under REQ-VERS-0005;
3. form the exact bilateral intersection under REQ-VERS-0006;
4. for each candidate independently, resolve only its own immutable evidence
   under REQ-VERS-0007;
5. remove unresolved intersecting candidates and apply every applicable H-03
   predicate in REQ-VERS-0008;
6. for each remaining candidate, apply the role-scoped Core/Governed baseline,
   monotonic source intersection, profile/feature/capability predicates,
   authentication selection, extension and experiment prerequisites, Host
   requirements, and failure classifications in REQ-VERS-0009 through
   REQ-VERS-0013, including candidate-level permission by the immutable consent
   envelope;
7. remove every candidate failing any required predicate;
8. if no candidate remains, produce the single semantic
   `no-compatible-release`/incompatible outcome and stop without fallback;
9. otherwise select the greatest remaining exact identity under
   REQ-VERS-0002;
10. under only that selected release, construct the complete H-04 semantic
    result required by REQ-VERS-0016 and apply REQ-VERS-0015;
11. after that independent computation, the Agent MUST commit only that exact
    result, solely through the H-06 atomic durable Connection commit in
    REQ-VERS-0017; and
12. after receiving or authoritatively recovering the committed Connection
    result, the Client MUST verify that its exact selected release and complete
    negotiated semantic result equal the Client's independently computed
    expectation and every applicable immutable input.

The algorithm MUST NOT select first-common, array-first, lowest, `latest`, a
package default, a Platform preference, an Agent-only preference, an adjacent
revision, a same-epoch inference, a draft fallback, or a different release on
retry. Compatibility declarations MUST act only as candidate eligibility
evidence and MUST NOT create a second selection channel. Ordering MUST be the
last release-selection step. Independent computation MUST NOT create an extra
Client signature, acknowledgement, consensus vote, two-phase commit, or proof
that the Client obtained the same answer before the Agent commit. H-06 remains
the sole authority-creation commit.

**Applies to.** Final precommit protocol release and H-04 negotiation for one
Install Grant redemption context.

**Lifecycle/state impact.** Produces a non-authoritative semantic result or an
incompatible outcome; only REQ-VERS-0017 can bind a successful result to state.
Client verification follows observation or authoritative recovery of that
commit and creates no second commit or authority transition.

**Semantic failure.** Any validation or required-predicate failure follows its
defined scope; no remaining candidate produces one stable incompatible outcome,
with no retry-time selection of another release. A Client-observed mismatch
MUST make the Connection unusable by that Client and MUST NOT cause negotiation
or fallback to another release. If the Agent already committed, the mismatch
MUST NOT erase or pretend to undo that durable fact; authoritative recovery,
closure, or replacement MUST follow H-06/H-07.

**Sources:** H-01, H-03, H-04, H-06, H-13. **Gaps:** GB-005, GB-006, GB-042,
GB-044, GB-045, GB-046.

## REQ-VERS-0015 - Post-selection narrowing without reordering

**Requirement.** After H-03 selects the exact release, the complete H-04 result
MUST be constructed only under that release. Connection Offer and Install Grant
restrictions, immutable human consent, exact organization/workspace and Host
scope, and stricter deployment policy MUST then be applied as narrowing-only
ceilings. They MUST NOT add an item, widen a restriction, substitute a similar
identity, move evidence between releases, or rerun H-03 ordering. If this
narrowing removes a Host-required, Core-required, security-required, or otherwise
required item, the attempted Connection MUST be incompatible; the algorithm
MUST NOT retry with a lower or different release.

**Applies to.** The selected release's complete profile, feature, capability,
authentication, extension, experiment, limitation, and scope result.

**Lifecycle/state impact.** Final precommit narrowing only; it either produces
the exact committable set or no Connection.

**Semantic failure.** Removal of a required item is incompatible; optional safe
removal is recorded as omitted, excluded, disabled, or limited without granting
authority.

**Sources:** H-01, H-03, H-04, H-06, H-07. **Gaps:** GB-005, GB-006.

## REQ-VERS-0016 - Negotiated semantic result inventory

**Requirement.** A successful negotiation result MUST directly retain or
immutably reference enough information to preserve all of the following without
consulting current defaults:

- selected exact protocol release and release/specification/schema-bundle/
  compatibility identities and integrity references;
- exact selected Core facets, profiles, and conformance claims;
- the exact selected authentication-profile identifier;
- enabled global features and exact enabled capability keys and versions;
- capability-specific authority and safety restrictions;
- selected required and optional extensions and explicit experimental opt-ins;
- every authority-relevant omission, disabled, excluded, unavailable, or
  limited item and its semantic category;
- Host-required items, the immutable consented subset, and Offer/Grant
  restrictions;
- Agent and Passport, Host/audience and authenticated principal, organization,
  and workspace with explicit absence semantics;
- immutable, historically resolvable evidence references; and
- semantic selection status, selection-algorithm identity, and a slot for the
  future H-10/D2 canonical negotiation-transcript identity and digest.

The authority-critical selected semantics MUST be retained directly by the
eventual Connection; bulky evidence MAY be referenced only by immutable,
historically resolvable identity or future H-10-qualified digest. Mutable URLs,
`latest`/`current` pointers, package defaults, and deployment lookups MUST NOT
resolve bound evidence. This requirement defines semantic contents, not field
names, canonical bytes, or digest algorithms.

**Applies to.** The deterministic selection result, immutable evidence bundle,
and eventual Connection binding.

**Lifecycle/state impact.** Result construction grants no authority; it prepares
the exact value for atomic commit.

**Semantic failure.** A result missing an authority-critical meaning or required
immutable evidence binding is non-committable and incompatible.

**Sources:** H-01, H-03, H-04, H-05, H-07, H-10, H-13. **Gaps:** GB-005,
GB-006, GB-042, GB-044, GB-045, GB-046.

## REQ-VERS-0017 - Atomic authority binding

**Requirement.** Discovery, participant advertisements, previews, consent,
candidate eligibility, and the negotiation result MUST grant no authority. The
result becomes authoritative only when H-06 atomically and durably creates the
Connection directly as `active`. That commit MUST retain the authority-critical
semantic result and immutable evidence references from REQ-VERS-0016. Every
later governed operation MUST bind to that Connection's exact selected release,
authentication profile, tenant and participant context, enabled set, and
restrictions. Wherever a later header, body, proof descriptor, object field, or
request repeats a bound identity, it MUST equal the Connection value. Mixed-
release or out-of-set use MUST fail before Task creation, Approval consumption,
or external side effect.

**Applies to.** Install Grant redemption, the final Connection, and every later
Connection-governed operation.

**Lifecycle/state impact.** The successful H-06 durable commit is the sole
transition from a non-authoritative result to active Connection authority.

**Semantic failure.** The Agent MUST reject a mismatched, incomplete,
substituted, or non-deterministic result before its commit. A mismatch the Client
detects after observing or recovering an already committed result MUST deny
Client use without renegotiation and MUST retain the commit as a durable fact
for H-06/H-07 recovery, closure, or replacement. A later governed-operation
binding mismatch MUST deny the operation without renegotiation.

**Sources:** H-01, H-03, H-04, H-06, H-07, H-10. **Gaps:** GB-005, GB-006,
GB-044.

## REQ-VERS-0018 - Immutable selection across change and restart

**Requirement.** Restart, resumption, rediscovery, package upgrade, deployment
rollout, mutable registry or support change, new default, or changed peer
advertisement MUST NOT renegotiate or reinterpret an existing Connection.
Adding, removing, substituting, or materially changing a selected release,
profile, authentication identifier, feature, capability/version, restriction,
extension, experiment, participant, target, tenant, or consent meaning MUST use
the accepted new preview, new consent, and new or replacement Connection path.
Same-invariant current evidence refresh MAY occur only as its owning H-05,
H-07, or H-11 rule permits and MUST NOT alter the negotiated semantic result.

**Applies to.** Active, suspended, restarted, replaced, terminal, and historical
Connections and their bound evidence.

**Lifecycle/state impact.** No in-place negotiation transition exists; material
change requires a distinct H-07 replacement/new-Connection lifecycle.

**Semantic failure.** An attempted in-place change or use under current defaults
is a binding mismatch and MUST fail closed without fallback or historical
rewrite.

**Sources:** H-01, H-03, H-04, H-05, H-07, H-11, H-14. **Gaps:** GB-005,
GB-006, GB-043, GB-044, GB-046.

## Non-normative deterministic examples

The symbols below stand for already validated exact releases. `R3 > R2 > R1`
means only the H-03 order, not automatic compatibility.

| Case | Client set | Agent set | Candidate facts before final ordering | Outcome |
| --- | --- | --- | --- | --- |
| Permutation | `[R3, R1, R2]` | `[R2, R3]` | `R3` and `R2` independently eligible | `R3`; every permutation yields the same result |
| Lower local preference | `[R3, R2]`, preferred `R2` | `[R3, R2]`, preferred `R3` | Client-local `R3` is eligible | Invalid Client metadata; `R2` is not selected |
| Unknown intersecting | `[R3, R2]` | `[R3, R2]` | `R3` manifests cannot be resolved; `R2` independently eligible | Remove `R3`, select `R2` |
| Unknown non-intersecting | `[R3, R2]` | `[R2]` | Agent does not advertise and does not understand `R3`; `R2` eligible | `R2`; unknown `R3` alone does not fail |
| Required removal | `[R3, R2]` | `[R3, R2]` | Required selected-release capability is unavailable | Candidate is incompatible; post-selection failure does not rerun order |
| Optional isolation | `[R2]` | `[R2]` | One optional capability satisfies every REQ-VERS-0013 isolation condition | `R2`, with that exact capability excluded and recorded |
| Higher candidate filtered | `[R3, R2]` | `[R3, R2]` | `R3` fails H-04 before ordering; `R2` is independently eligible and consent-permitted | Select `R2`, not as fallback but as greatest remaining candidate |
| Post-selection narrowing | `[R3, R2]` | `[R3, R2]` | `R3` selected; later transaction ceiling removes a required item | Incompatible; do not retry `R2` |

Later D2 work is expected to derive permutation, downgrade, binding, profile/
capability Cartesian, required-removal, optional-isolation, and transcript cases
from this chapter. This chapter creates no fixture or conformance asset and
closes no `GB-*` gap.
