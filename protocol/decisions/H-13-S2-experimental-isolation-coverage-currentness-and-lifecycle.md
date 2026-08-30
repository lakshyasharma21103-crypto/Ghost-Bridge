# H-13-S2 — Experimental Isolation Coverage, Currentness and Lifecycle

## Accepted governance record

```text
STATUS=ACCEPTED
DECISION=H-13-S2
REVISION=14
SUPPLEMENTS=H-13

ACCEPTED=YES
INTEGRATED=NO
ACCEPTANCE_DATE=2026-08-30
APPROVER=Lakshya Sharma (`lakshyasharma21103-crypto`)
ACCEPTED_REVISION=14

INDEPENDENT_HOSTILE_REVIEW=PASS
HUMAN_ACCEPTANCE_RECOMMENDED=YES
REVISION_15_REQUIRED=NO

IMPLEMENTATION_AUTHORIZED=NO
SCHEMA_WORK_AUTHORIZED=NO
D2_AUTHORIZED=NO

BASELINE=main@841772bb1dc5d0f5e1979b7fc9c702b9208e0f94

H10_ISOLATION_SUPPLEMENT_REQUIRED=YES
H11_ISOLATION_SUPPLEMENT_REQUIRED=YES
D1_EXPERIMENTAL_ISOLATION_NORMATIVE_SUPPLEMENT_REQUIRED=YES

CONFORMANCE=NO
INTEROPERABILITY=NO
PRODUCTION_READINESS=NO
RELEASE_AUTHORIZED=NO
PROTOCOL_1_0=NO
```

---

## Acceptance and review record

- **Decision ID:** `H-13-S2`
- **Parent:** H-13 — Schema openness, extensions, and evolution
- **Title:** Experimental Isolation Coverage, Currentness and Lifecycle
- **Status:** `ACCEPTED`
- **Human acceptance date:** 2026-08-30
- **Approver:** Lakshya Sharma (`lakshyasharma21103-crypto`)
- **Accepted revision:** Revision 14
- **Result:** `ACCEPTED`
- **Revision 15:** Not required and not created.
- **Review evidence:** Revision 14 passed independent hostile review with `BLOCKERS=0`, `MAJORS=0`, `MINORS=0`, and a recommendation of human acceptance.

### Exact human disposition

> I explicitly accept the H-13-S2 semantic decision in PROPOSED-H-13-S2 Revision 14.

That exact statement is the separate human act that created semantic acceptance of H-13-S2 only. It does not itself authorize implementation, H-10, H-11, D1, D2, schema work, fixtures, vectors, conformance, interoperability claims, production readiness, publication, release, or Protocol 1.0.

The present local repository mutation is a separately authorized integration gate and does not broaden the semantic acceptance.

### Final independent hostile-review disposition

```text
H13_S2_R14_INDEPENDENT_HOSTILE_REVIEW=PASS

R13_B_001_CONCRETE_BOOTSTRAP_SOURCE_IDENTITY_CARDINALITY_POSITIVE_AUTHORITY=CLOSED
R13_B_002_CANDIDATE_INDEPENDENT_BASELINE_VERIFICATION_UNIVERSE=CLOSED
R13_m_001_GENERIC_FRESHNESS_CASE_SCOPING=CLOSED
R13_G_001_STALE_HUMAN_ACCEPTANCE_ARTIFACT_TARGET=CLOSED

R12_B_001_BINDING_BASELINE_CROSS_OWNER_CORRECTNESS=CLOSED
R12_B_002_BINDING_CONCLUSION_CAUSAL_ORDERING=CLOSED
R12_B_003_TOTAL_BINDING_CURRENTNESS_STATUS_PROPAGATION=CLOSED

R11_B_001_Q_INDEPENDENT_PRODUCER_INTRINSIC_CONTINUITY=CLOSED
R11_B_002_BINDING_EVENT_SOURCEATTRIBUTION_RECURSION=CLOSED
R11_B_003_BINDING_CONTINUITY_SOURCE_AUTHORITY=CLOSED

NEW_R14_BLOCKERS=0
NEW_R14_MAJORS=0
NEW_R14_MINORS=0
```

The hostile review did not create acceptance. Acceptance arose only from the separate explicit human act recorded above.

### Accepted scope, qualifications, and dependencies

Acceptance is limited to the complete self-contained Revision 14 H-13-S2 semantic contract in Sections 1 through 28 below. Revision 14 supplements H-13. Revisions 2 through 13 remain review history and contribute no semantic rule by reference.

The exact Revision 14 recommended choices are the accepted H-13-S2 choices. Every alternative, consequence, rationale, and recommendation remains recorded. Accepted residual risks are acknowledged, not claimed solved. Explicitly future extensions and alternatives remain future and unaccepted.

H-10 and H-11 isolation supplements and the D1 Experimental Isolation normative supplement remain required. D2, schema, fixture, vector, representation, implementation, conformance, publication, release, production-readiness, interoperability, and Protocol 1.0 work remain unauthorized by this decision.

### Downstream nonauthorization and handoff boundary

This record fixes H-13-S2 semantics only. H-10 may later own authentication and representation mechanics; H-11 may later own history, time, order, current-head, revocation, compromise, rollback, fork, and materialization mechanics; D1 may later own public normative requirements; and D2 may later own representation artifacts. None may alter the accepted identities, authority hierarchy, coverage, currentness, freshness, event, privacy, reuse, reason, provenance, inventory, predicate, or fail-closed meanings below.

No implementation or downstream artifact may treat semantic acceptance as repository integration, conformance, interoperability, production readiness, release authorization, or Protocol 1.0 status.

---

# Accepted H-13-S2 semantic contract

## 1. Purpose, force, and stop boundary

This document is one complete self-contained accepted H-13-S2 semantic contract. It supplements H-13 and supersedes no other accepted decision. Revisions 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, and 13 remain review inputs and are not incorporated by reference.

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, and MAY are normative inside this accepted decision. A required value that is absent, malformed, contradictory, stale, incomplete, outside a closed universe, historically unresolvable, or supported by an ineligible source is non-authorizing.

H-13-S2 answers only:

> At one AuthorityUseCut, does the exact Connection, each side's exact finite non-deduplicated H-02 ApplicablePermissionSet, every exact per-permission IAA/registration/correspondence/MeasurementTarget relation, both exact H-02 ParticipantSide values, and the exact selected release/profile satisfy the accepted isolation semantics using complete, current, source-attributed evidence?

It does not grant permission, create Connection authority, select an experiment, define wire representation, define history storage, authorize implementation, or establish conformance or production readiness.

## 2. Authority hierarchy and accepted upstream invariants

The accepted H-02 and H-07 meanings are immutable inputs:

1. Organization permission is not runtime measurement truth.
2. Workspace narrows authority only; it supplies no positive authority.
3. Workspace absence is a valid explicit tagged branch.
4. An IAA has only its accepted bounded measured-fact authority under its exact Stage-A-applicable, H-11-qualified H-02 permission, ParticipantSide, ExactTenantContext, and selected H-13 profile.
5. Trust verifies evidence; it creates no permission, measured truth, Connection authority, or action authority.
6. GovernedBoundaryLineageKey is an H-02 permission-target lineage and proves no H-13 runtime identity, equality, uniqueness, deduplication, or coverage.
7. Distinct IsolationBoundaryPermissionSubjectIdentity values remain distinct even when H-13 concludes that their runtime targets coincide.
8. Every repeated, embedded, referenced, or derivable H-02 component is an exact universal projection. Any contradiction is invalid, non-authorizing, and not repairable by precedence.
9. H-07 owns the exact Connection bundle. H-13 and IAA evidence repeat Connection-owned values only as equality assertions in the accepted comparison direction.
10. One current authority-bearing isolation result is bound to one exact Connection and cannot be replayed for another.
11. Selected experiment/release/profile meaning is immutable for the Connection.
12. Current active Connection state is necessary and not sufficient. Isolation is a narrowing gate only.
13. Protected stable carrier nonreuse applies across every unequal ExactTenantContext, subject only to H-02's field-specific accepted-upstream-value exception.
14. Exact Organization authority authors immutable Organization registration and boundary-permission governance actions; exact Workspace authority authors immutable Workspace state and overlay actions; neither generic “H-02” nor an IAA is their content author.
15. Claimed effective time is immutable claimed source content. Membership in a claimed interval never creates current authority before H-11-qualified authoritative application/materialization.
16. An exact IAA authors only its bounded H-13 measured conclusions. That authorship does not prove that a historical conclusion is the authoritative current conclusion.
17. H-11 isolation governance owns authoritative current-head resolution, revocation, compromise, rollback, fork/equivocation handling, historical eligibility, terminal history, and authoritative application/materialization/history evidence. H-13 owns only the closed qualification outcomes and their isolation-authorization effect.
18. H-13 freshness/revalidation and H-11-realized historical currentness are independent gates. No H-13 measurement fact creates, repairs, or substitutes for historical currentness qualification.

ExactTenantContext is exactly:

~~~
ExactTenantContext = (
  Organization,
  tagged Workspace presence/value
)

WorkspaceTag =
  workspace-absent
  | workspace-present(exact Workspace)
~~~

Two ExactTenantContext values are equal exactly when their Organization values are semantically equal, their Workspace tags are the same branch, and, for workspace-present, their Workspace values are semantically equal. No Workspace value exists or is required on workspace-absent. A null, sentinel, empty value, mandatory untagged Workspace field, or H-13-local encoding is not this semantic object.

ParticipantSide is exactly:

~~~
host-side
| agent-side
~~~

Initiator/responder, caller/callee, source/destination, and routing direction are not ParticipantSide aliases. Where message direction is needed, this decision uses the separate DirectionalEndpointRelation defined in Section 16.

The accepted H-02 identity meanings used by this decision are exactly:

~~~
IsolationAttestationAuthorityIdentity = (
  Organization,
  organizationLocalIAALineageIdentity
)

OrganizationIAARegistrationSubjectIdentity = (
  exact IsolationAttestationAuthorityIdentity,
  purpose = experiment-isolation
)

OrganizationIAARegistrationRevisionIdentity = (
  exact OrganizationIAARegistrationSubjectIdentity,
  organizationLocalRegistrationRevisionIdentity
)

IsolationBoundaryPermissionSubjectIdentity = (
  GovernedBoundaryLineageKey,
  exact IsolationAttestationAuthorityIdentity,
  ParticipantSide
)

IsolationBoundaryPermissionRevisionIdentity = (
  exact IsolationBoundaryPermissionSubjectIdentity,
  organizationLocalBoundaryPermissionRevisionIdentity
)

Workspace applicability uses the accepted H-02 identity types:
  WorkspaceIAAStateSubjectIdentity
  WorkspaceIAAStateRevisionIdentity
  WorkspaceIAAOverlaySubjectIdentity
  WorkspaceIAAOverlayRevisionIdentity
~~~

These are accepted upstream semantic identities, not H-13 fields or representations. H-13 allocates no alias, lifecycle, incarnation, current pointer, or replacement identity for an IAA registration. The exact immutable OrganizationIAARegistrationRevisionIdentity is the positive ceiling wherever registration equality/currentness matters; H-11 later owns predecessor, current-head, and history realization under accepted H-02.

## 3. Explicit nonownership

| Owner | Meaning not owned by H-13-S2 |
|---|---|
| H-02 | Organization permission, tagged Workspace narrowing, IAA role authority, Trust's evidence-only role, IsolationBoundaryPermissionSubjectIdentity equality, ParticipantSide vocabulary, projection direction, or privacy floor |
| H-04 | experiment support, request, selection, dependency, or consent |
| H-07 | Connection identity, selected interface/profile binding, lifecycle, replacement, suspension, revocation, or terminal races |
| H-10 | representation, member names, framing, canonical forms, bytes, algorithms, keys, cryptographic authentication, signatures, digests, commitments, or proof domains |
| H-11 | history record shape, proof format, predecessor/current-head encoding, current-head materialization, storage, trusted clock or ordering materialization, rollback/fork/revocation/compromise evidence mechanics, anti-rollback implementation, authoritative application/materialization evidence, or historical-verification representation |
| D1 | final public normative wording and public error placement |
| D2 | schema, registry, fixture, vector, encoding, and conformance artifact |
| Implementation | API, service, module, provider, adapter, SDK, deployment, and enforcement mechanism |

Every object in this document is a semantic object or semantic relation. It does not imply a field, byte sequence, record, key, proof, process, service, or API.

## 4. Structural equality and authority-use scope

Semantic equality is exact equality under the owning accepted semantic definition. Finite sets use mathematical set equality: order and presentation are irrelevant, multiplicity is absent, and every element must be semantically equal. Tuples use componentwise semantic equality. Tagged unions require the same branch and, when that branch carries a value, equal carried values. No byte equality, canonicalization, locale rule, display equality, provider identifier, or cryptographic value is introduced here.

AuthorityUseCut is the structural tuple:

~~~
AuthorityUseCut = (
  exact Connection,
  exact owning authority-use purpose/action,
  semantic state cut
)
~~~

It names when accepted Connection authority would be consumed. It is not an identity, transaction, lock, serialization mechanism, state transition, or history record.

The nonrecursive side-wide scope is:

~~~
SideScopeKey = (
  exact Connection,
  ExactTenantContext,
  ParticipantSide,
  selected release,
  selected IsolationProfile
)
~~~

SideEvaluationKey contains side-wide semantics only:

~~~
SideEvaluationKey = (
  exact SideScopeKey,
  AuthorityUseCut
)
~~~

It contains no IsolationAttestationAuthorityIdentity, H-02 permission identity, RuntimeCorrespondence, or MeasurementTarget. No side-level object may choose one per-permission value as canonical.

ApplicablePermissionMember is the exact accepted H-02 permission identity tuple:

~~~
ApplicablePermissionMember = (
  exact IsolationBoundaryPermissionSubjectIdentity,
  exact IsolationBoundaryPermissionRevisionIdentity
)

ApplicablePermissionSet =
  exact finite mathematical set of ApplicablePermissionMember values
~~~

Every repeated identity must equal the exact projection carried by the accepted H-02 boundary-permission semantics. The permission revision embeds the same exact permission subject, whose accepted projection embeds its exact IsolationAttestationAuthorityIdentity and ParticipantSide. The applicable H-02 semantics also supplies the exact OrganizationIAARegistrationSubjectIdentity and immutable OrganizationIAARegistrationRevisionIdentity positive ceiling associated with that member. H-13 allocates none of these identities.

PermissionEvaluationCoordinate identifies the deterministic required coordinate before IAA, registration, correspondence, and measured-target values are resolved:

~~~
PermissionEvaluationCoordinate = (
  exact SideEvaluationKey,
  exact ApplicablePermissionMember
)
~~~

PermissionScopeKey is the nonrecursive local measurement/closure scope:

~~~
PermissionScopeKey = (
  exact SideScopeKey,
  exact ApplicablePermissionMember,
  exact IsolationAttestationAuthorityIdentity,
  exact OrganizationIAARegistrationSubjectIdentity,
  exact OrganizationIAARegistrationRevisionIdentity,
  exact MeasurementTargetRoot
)
~~~

It contains neither RuntimeCorrespondence, MembershipEpoch, MeasurementTarget, nor a CombinedClosure. It can therefore scope the observations and five closures from which MembershipEpoch and MeasurementTarget are later constructed without recursion.

PermissionEvaluationKey is:

~~~
PermissionEvaluationKey = (
  exact PermissionEvaluationCoordinate,
  exact IsolationAttestationAuthorityIdentity,
  exact OrganizationIAARegistrationSubjectIdentity,
  exact OrganizationIAARegistrationRevisionIdentity,
  exact RuntimeCorrespondence,
  exact MeasurementTarget
)
~~~

Thus its expanded components are the exact SideEvaluationKey, IsolationBoundaryPermissionSubjectIdentity, IsolationBoundaryPermissionRevisionIdentity, IsolationAttestationAuthorityIdentity, OrganizationIAARegistrationSubjectIdentity, OrganizationIAARegistrationRevisionIdentity, RuntimeCorrespondence, and MeasurementTarget. Universal projection coherence applies to every repeated component.

For each side, PermissionEvaluationKeySet is the exact finite set produced by a one-to-one resolution relation from ApplicablePermissionSet: every ApplicablePermissionMember has exactly one PermissionEvaluationCoordinate and exactly one PermissionEvaluationKey, and no key has an unlisted member. The structural model represents an empty set deterministically, but an empty side is non-authorizing because no applicable permission/target membership is established; a pass requires both sets nonempty. Candidate multiplicity is retained until this bijection is checked, so identical duplicate candidates cannot disappear through mathematical-set projection.

The Connection scope is:

~~~
ConnectionEvaluationKey = (
  exact Connection,
  exact host-side SideEvaluationKey,
  exact agent-side SideEvaluationKey
)
~~~

Every repeated Connection, release, profile, cut, and side projection in this key must be universally coherent. The exact per-IAA local separation grouping is:

~~~
LocalIAASeparationKey = (
  exact SideEvaluationKey,
  exact IsolationAttestationAuthorityIdentity,
  exact OrganizationIAARegistrationSubjectIdentity,
  exact OrganizationIAARegistrationRevisionIdentity,
  exact nonempty finite covered PermissionEvaluationKey set
)
~~~

The covered set is exactly the full preimage of the stated IAA/registration triple in that side's PermissionEvaluationKeySet: all and only keys with those projections appear. Exactly one LocalIAASeparationKey exists for every distinct such triple. It contains no opposite-context value and privileges no permission or target.

The pairwise F04 key is:

~~~
F04PairKey = (
  exact ConnectionEvaluationKey,
  exact host-side PermissionEvaluationKey,
  exact agent-side PermissionEvaluationKey
)
~~~

Each side may contain any exact finite ApplicablePermissionSet, including multiple permission subjects, IAAs, registration revisions, RuntimeCorrespondences, and MeasurementTargets. The two sides may have unequal ExactTenantContext values. Connection, context, ParticipantSide, release, profile, and cut must agree universally wherever repeated at the same coordinate; unrelated per-permission IAA, registration, correspondence, and target values on one side need not equal. Each ApplicablePermissionMember has exactly one coordinate and resolves to exactly one PermissionEvaluationKey and PermissionCoverageEvaluation. The required F04PairKey set is the exact Cartesian product of the host-side and agent-side PermissionEvaluationKeySet values.

Let H and A be the cardinalities of the host-side and agent-side ApplicablePermissionSet values after Stage A. Let Kh and Ka be the cardinalities of their complete authoritative H02ApplicabilityCandidateCoordinate Stage-A populations, including candidates denied, narrowed, wrong-scope, stale, contradictory, or injected for audit. Let Gh and Ga be the sets of distinct (IsolationAttestationAuthorityIdentity, OrganizationIAARegistrationSubjectIdentity, OrganizationIAARegistrationRevisionIdentity) projections on their respective sides. Let D be the frozen Stage-B DirectSemanticPropositionCoordinate set, PI the frozen ProducerIndependenceCoordinate set, E the frozen PermissionEventRequirementSlot set, EA the sum of exact candidate Producer cardinalities over E, RP(Q) the exact RelevantProducerSet for Q, PU the exact set of distinct ProducerLifecycleEvaluationCoordinate values obtained from every ProducerIdentity in every frozen Q Producer candidate population at the one AuthorityUseCut, SB the sum over all Q of `|RP(Q)|`, BB the total exact BindingBaselineUniverseMember count across those SB bindings, BL the total exact BindingLifecycleUniverseMember count across those bindings, BS the total exact concrete BindingBootstrapSourceCoordinate count across every baseline and lifecycle slot, CP the sum over all Q of `|RP(Q)|*(|RP(Q)|-1)/2`, ASC the frozen AbsenceSourceControlCoordinate set, L the exact LocalIAASeparationKey set when contexts are unequal and the empty set otherwise, MC=`(H+A)+|PI|+|ASC|+SB+|L|`, FC=`MC+(H+A)` for all measured-conclusion plus permission-closure freshness coordinates, QT the exact set of distinct required qualified physical-time positions comprising every one of those conclusion/closure state positions plus each owning AuthorityUseCut position, HC the frozen set of exact HistoricalCurrentnessQualification coordinates required by all Stage-A governance inputs and Stage-B IAA conclusions, and Ng the number of non-singleton components across the two SameSideTargetOverlapGraph values. For binding continuity, `M=U` is one semantic position and therefore contributes one distinct qualified-time coordinate, not two aliases. The deterministic required counts are:

~~~
SideEvaluationKey and SideEvaluation              2
H02ApplicabilityPopulation                        2
H02IsolationApplicabilityProjection                Kh + Ka
H02SideCurrentnessAssertion                       2
PermissionEvaluationCoordinate/Key                H + A
H02PermissionCurrentnessAssertion                 H + A
IAA runtime-correspondence-currentness assertion  H + A
RuntimeCorrespondencePropositionResult             11 * (H + A)
PropositionDirectSourceCoverage                    |D|
ProducerIndependenceMeasuredConclusion/currentness |PI|
ProducerInfluenceThreatSet                         |PI|
RelevantProducerSet                                H + A
ProducerCouplingBaseGraph/population               H + A
ProducerIntrinsicContinuity                         |PU|
ProducerSourceSurfaceBinding/currentness            SB
BindingBaselineUniverse                             SB
BindingBaselineOwnerSlot                            BB
BindingLifecycleUniverse                            SB
BindingLifecycleOwnerSlot                           BL
BindingBootstrapSourceCandidatePopulation           BB + BL
BindingBootstrapSourceCoordinate                    BS
ProducerSourceSurfaceBindingBaseline                SB
BindingBaselineObservationPopulation                SB
BindingLifecycleObservationPopulation               SB
ProducerBindingContinuityMeasuredConclusion         SB
BindingConclusionCausality                           SB
IAA binding-continuity-currentness assertion         SB
ProducerBindingEventCoverage                         SB
ProducerControlCouplingState                       CP
ProducerThreatControlDomain                        H + A
AbsenceSourceThreatControlDomain                   |ASC|
AbsenceSourceControlMeasuredConclusion/currentness |ASC|
MeasuredConclusionUseFreshness                     MC
QualifiedPhysicalTimeInput                         |QT|
QualifiedPhysicalTimeDomainComparison              FC
HistoricalCurrentnessQualification                 |HC|
PermissionEventCoverageSet                         H + A
EventRequirementSourcePopulation                   |E|
EventCoverageAssertion candidate coordinates       EA
PermissionCoverageEvaluation                      H + A
F04PairEvaluation                                 H * A
SameSideTargetOverlapGraph                         2
SharedGovernanceRelation                           Ng

if contexts are unequal:
  detector disposition                            |Gh| + |Ga|
  IAA context-local separation conclusion         |Gh| + |Ga|
  IAA separation-currentness assertion            |Gh| + |Ga|

if contexts are equal:
  detector disposition                            0
  IAA context-local separation conclusion         0
  IAA separation-currentness assertion            0
~~~

These formulas are generation rules, not implementation estimates. Every raw candidate occurrence family is checked before mathematical-set projection; missing, equal duplicate, unequal duplicate, injected, or ambiguous occurrences cannot alter the required count or disappear through deduplication.

## 5. Closed profile catalogue

Exactly these accepted profile class tokens exist:

1. org.ghostbridge.isolation.exclusive-environment.v1
2. org.ghostbridge.isolation.partitioned-environment.v1
3. org.ghostbridge.isolation.shared-governance-runtime.v1

IsolationProfile is:

~~~
IsolationProfile = (
  selected release,
  exact profile class token
)
~~~

It has no additional definition identity. A profile cannot be composed, aliased, partially satisfied, silently upgraded, or silently downgraded.

| Property | exclusive-environment | partitioned-environment | shared-governance-runtime |
|---|---:|---:|---:|
| exact nonempty structural MeasurementTarget | required | required | required |
| both H-02 ParticipantSide values | required | required | required |
| current runtime/boundary/resource/producer semantics | required | required | required |
| all five closures and K01-K49 edges | required | required | required |
| per-proposition exact-IAA-authored Producer-independence conclusion with independent H-13 freshness and H-11-realized authoritative-current qualification, plus outside-control direct factual source coverage | required | required | required |
| exact RelevantProducerSet, candidate-independent exact-complete baseline universe, complete concrete bootstrap source populations, exact-coherent cross-owner O09/O10 baseline at B, complete direct-owner E07/E11/E14/E15/E17 post-B population, one M=U causally valid fresh authoritative-current bounded positive IAA baseline-plus-continuity conclusion, literal current binding, all-pairs coupling, and secondary absence-source control qualification | required | required | required |
| MeasuredConclusionMaximumAge for every IAA measured conclusion | 60 seconds | 60 seconds | 60 seconds |
| physical-time comparison | exact-equal QualifiedPhysicalTimeDomain only | exact-equal QualifiedPhysicalTimeDomain only | exact-equal QualifiedPhysicalTimeDomain only |
| physical environment dedicated to target/controllers | required | not assumed | not assumed |
| distinct effective boundary prevents non-target influence | required | required | required |
| shared governance of one same-side target | forbidden | forbidden | conditionally permitted |
| direct external-to-target path | forbidden | forbidden | forbidden |
| unknown external ingress with relevant path | forbidden | forbidden | forbidden |
| K45 mutable sharing with an external subject | forbidden | forbidden | forbidden |
| K46 capacity-only sharing | forbidden | conditionally permitted | conditionally permitted |
| positive event-coverage gap | forbidden | forbidden | forbidden |
| EventSourceCompositionPolicy for every E01-E17 slot | independently-complete-source | independently-complete-source | independently-complete-source |

The EventSourceCompositionPolicy, MeasuredConclusionMaximumAge, exact-domain time-comparison, and binding-currentness rows are constant catalogue rules, not selectable parameters. No implementation, provider, deployment, runtime, Producer, IAA, configuration, local policy, evidence content, source count, conversion mapping, or revalidation request can select a different initial-profile meaning.

## 6. Identity and structural target model

### 6.1 Side-scoped measured identities

The exact isolation identity namespace is:

~~~
IsolationIdentityNamespace = (
  exact IsolationAttestationAuthorityIdentity,
  ExactTenantContext,
  ParticipantSide,
  selected release
)
~~~

Within that namespace, the IAA semantically allocates opaque, injective, non-recyclable values:

~~~
RuntimeLineage = (
  IsolationIdentityNamespace,
  IAA-allocated lineage value
)

RuntimeIncarnation = (
  RuntimeLineage,
  IAA-allocated incarnation value
)

IsolationBoundary = (
  IsolationIdentityNamespace,
  IAA-allocated boundary-incarnation value
)

ControllerIncarnation = (
  IsolationIdentityNamespace,
  IAA-allocated controller-incarnation value
)

ResourceObject = (
  IsolationIdentityNamespace,
  exact ResourceObjectClass,
  IAA-allocated resource-incarnation value
)

Channel = (
  IsolationIdentityNamespace,
  IAA-allocated side-local channel-incarnation value
)
~~~

Allocation requires eligible direct birth, attachment, or creation evidence in the owning source domain. A value maps to one semantic subject for all current and historical uses, is never reassigned, and is never recycled. A label, address, process number, machine name, certificate subject, storage path, provider identifier, or current inventory entry never proves equality.

Restart, recreation, restore, migration, host movement, or replacement ends a RuntimeIncarnation and creates a new one. Exact one-to-one continuity may retain RuntimeLineage only when complete lifecycle semantics establish one ended incarnation, one new incarnation, and no clone or concurrent continuation. A clone creates a new lineage and incarnation. Boundary/controller/resource/channel recreation creates a new incarnation. Reconfiguration without recreation retains identity but invalidates affected evidence.

Channel is one side-local segment from a target endpoint to that side's EnforcementGate. It is not an end-to-end transport, selected logical interface, or Connection identity. Cross-side association exists only through the single MediatedChannelPair definition in Section 16.

### 6.2 Structural MeasurementTarget and MembershipEpoch

The five closure values are defined in Section 9. MembershipEpoch is:

~~~
MembershipEpoch = (
  closure state cut,
  runtime-members CombinedClosure,
  supporting-controllers-and-boundaries CombinedClosure,
  physical-residents-and-environments CombinedClosure,
  resources-and-channels CombinedClosure,
  relation-edges CombinedClosure
)
~~~

MembershipEpoch is a structural value, not an allocated identity. Equality is componentwise semantic equality, including mathematical set equality inside each closure. Any member, controller, ancestor, boundary, environment, resident, resource, channel, relation, source attribution, scope, completeness, or cut change creates an unequal value.

MeasurementTarget is:

~~~
MeasurementTargetRoot = (
  ExactTenantContext,
  ParticipantSide,
  exact nonempty finite RuntimeIncarnation set
)

MeasurementTarget = (
  exact MeasurementTargetRoot,
  MembershipEpoch,
  exact complete effective IsolationBoundary set
)
~~~

It is a structural value, not an allocated target-set identity and not an independently allocated identity. Runtime-set order is irrelevant. No ordering, digest, commitment, or compact carrier is part of H-13.

### 6.3 Side-neutral Producer identity

Producer naming is side-neutral within one exact IsolationAttestationAuthorityIdentity/ExactTenantContext/selected-release scope:

~~~
ProducerNamespace = (
  exact IsolationAttestationAuthorityIdentity,
  ExactTenantContext,
  selected release
)

ProducerIdentity = (
  ProducerNamespace,
  IAA-allocated producer-lineage value
)

ProducerIncarnation = (
  ProducerIdentity,
  IAA-allocated producer-incarnation value
)

ProducerLifecycleEvaluationCoordinate = (
  exact AuthorityUseCut,
  exact ProducerIdentity
)

ProducerActivationIncarnation = (
  exact ProducerIdentity,
  IAA-allocated activation-incarnation value
)

ProducerObservationMechanismIncarnation = (
  exact ProducerIdentity,
  IAA-allocated observation-mechanism-incarnation value
)

ProducerReportMechanismIncarnation = (
  exact ProducerIdentity,
  IAA-allocated report-mechanism-incarnation value
)

ProducerIntrinsicCapabilityCoordinate = (
  exact ProducerClass,
  exact direct-source domain
)

ProducerIntrinsicCapabilityBinding = (
  exact ProducerIntrinsicCapabilityCoordinate,
  exact ProducerObservationMechanismIncarnation,
  exact ProducerReportMechanismIncarnation
)

ProducerIntrinsicCapabilityScope =
  exact finite nonempty mathematical set of ProducerIntrinsicCapabilityBinding

ProducerIntrinsicLifecycleState = (
  exact ProducerIdentity,
  exact ProducerIncarnation,
  exact ProducerActivationIncarnation,
  exact ProducerIntrinsicCapabilityScope,
  lifecycle position,
  state = active | ended
)

ProducerIntrinsicLifecycleDirectAttribution = (
  exact producer-lifecycle direct factual owner for ProducerIdentity,
  exact asserted intrinsic-lifecycle semantic content with this wrapper omitted,
  exact ProducerLifecycleEvaluationCoordinate,
  exact semantic state position or interval,
  verdict
)

intrinsic-lifecycle-direct-attribution verdict =
  attributed-authentic | unavailable | indeterminate | contradictory

ProducerIntrinsicLifecycleEvidence = (
  exact ProducerLifecycleEvaluationCoordinate,
  exact producer-lifecycle direct-owner evidence domain,
  exact baseline lifecycle position = initial enrollment birth | predecessor lifecycle position,
  exact semantic lifecycle interval =
    [initial enrollment birth, AuthorityUseCut]
    | (predecessor lifecycle position, AuthorityUseCut],
  exact ProducerIntrinsicLifecycleDirectAttribution occurrence family,
  exact raw activation birth/end/restart occurrence family,
  exact raw observation-mechanism birth/end/replacement occurrence family,
  exact raw report-mechanism birth/end/replacement occurrence family,
  exact raw capability-binding add/remove/change occurrence family,
  exact unique semantic order and explicit concurrency relation,
  exact continuous-coverage result over that interval,
  exact occurrence/cardinality/consistency result
)

ProducerIntrinsicContinuity = (
  exact ProducerLifecycleEvaluationCoordinate,
  tagged predecessor absent | present(exact ProducerIntrinsicLifecycleState),
  tagged current absent | present(exact ProducerIntrinsicLifecycleState),
  exact ProducerIntrinsicLifecycleEvidence,
  transition = initial-birth | retained | ended | replacement | unresolved,
  verdict
)

intrinsic-continuity verdict =
  continuous | ended | replaced | unavailable | indeterminate | contradictory

ProducerSourceSurfaceCoordinate = (
  exact PermissionEvaluationCoordinate,
  exact ProducerIncarnation,
  kind = producer-observation | producer-report,
  exact ProducerClass,
  exact direct-source domain,
  exact ObservationScope,
  exact producer-lifecycle-owned surface-lineage value
)

ProducerObservationSurface = (
  exact ProducerSourceSurfaceCoordinate whose kind is producer-observation,
  ObjectClass = O09,
  exact finite acquisition attachment/resource/channel set
)

ProducerReportSurface = (
  exact ProducerSourceSurfaceCoordinate whose kind is producer-report,
  ObjectClass = O10,
  exact finite emission attachment/resource/channel set
)

ProducerSourceSurfaceBinding = (
  exact PermissionEvaluationCoordinate Q,
  exact ProducerIncarnation P,
  exact ProducerIntrinsicContinuity at
    ProducerLifecycleEvaluationCoordinate(Q.SideEvaluationKey.AuthorityUseCut,P.ProducerIdentity),
  exact ProducerBindingStateCut B,
  exact complete raw producer-lifecycle surface occurrence family for P at Q,
  exact finite nonempty ProducerObservationSurface set,
  exact finite nonempty ProducerReportSurface set,
  exact surface-to-P and P-to-surface cardinality result,
  verdict
)

surface-to-P and P-to-surface cardinality result =
  exact-one-owner-complete | missing | duplicate | injected | ambiguous

verdict = exact-complete | unavailable | indeterminate | contradictory

BindingLifecycleDirectOwner =
  producer-lifecycle-intrinsic-or-surface-allocation-owner(exact ProducerIdentity)
  | boundary-state-non-K-direct-owner(exact direct factual coordinate)
  | environment-membership-non-K-direct-owner(exact direct factual coordinate)
  | section-11-row-direct-owner(exact K01-K49 row, exact row owner coordinate)

BindingBootstrapFactualRole =
  baseline-state-at-B
  | post-B-binding-lifecycle

BindingBootstrapSourceCoordinate = (
  exact PermissionEvaluationCoordinate Q,
  exact source ProducerIdentity,
  exact source ProducerIncarnation,
  exact ProducerClass,
  exact direct-source domain,
  exact BindingLifecycleDirectOwner,
  exact BindingBootstrapFactualRole,
  exact owning baseline or post-B factual role/domain,
  exact frozen Stage-B producer-candidate-occurrence/source-enumeration coordinate,
  exact ProducerLifecycleEvaluationCoordinate for the source ProducerIdentity,
  exact Q-independent ProducerIntrinsicContinuity projection applicable to the source position or interval
)

BindingBootstrapSourceEligibility = (
  exact BindingBootstrapSourceCoordinate,
  exact required baseline position B or post-B interval (B,U],
  exact enrollment/class/domain/owner-matrix equality result,
  exact Q/ExactTenantContext/ParticipantSide/ObservationScope equality result,
  exact source-incarnation lifecycle eligibility result,
  verdict
)

bootstrap-source-eligibility verdict =
  eligible | ended-or-replaced | wrong-class-or-domain
  | wrong-incarnation | wrong-scope | unavailable | indeterminate | contradictory

BindingBootstrapSourceCandidatePopulation = (
  exact BindingBaselineOwnerSlot or BindingLifecycleOwnerSlot,
  exact frozen H13EvaluationPopulation source-enumeration boundary,
  exact complete finite BindingBootstrapSourceCoordinate candidate set,
  exact raw bootstrap source occurrence family retaining multiplicity,
  exact explicit unavailable source placeholder set,
  exact candidate-source-to-owner-slot cardinality status map,
  exact per-source raw-occurrence multiplicity map,
  exact missing source set,
  exact equal-duplicate occurrence set,
  exact unequal-duplicate occurrence set,
  exact injected source set,
  exact wrong-class-or-domain source set,
  exact wrong-incarnation source set,
  exact wrong-Q/side/context source set,
  exact ended-or-replaced source set,
  exact ambiguous source set,
  exact contradictory-source-attribution set,
  verdict
)

candidate-source-to-owner-slot cardinality status =
  exact-one-per-source-per-slot
  | missing
  | duplicate-equal
  | duplicate-unequal
  | injected
  | wrong-class-or-domain
  | wrong-incarnation
  | wrong-Q-side-or-context
  | ended-or-replaced
  | ambiguous
  | contradictory-attribution

bootstrap-source-population verdict =
  complete-enumerated | unavailable | indeterminate | contradictory

BindingBaselineEvaluationScope = (
  exact PermissionEvaluationCoordinate Q,
  exact ProducerIncarnation P,
  exact ProducerSourceSurfaceBinding candidate established at B,
  exact ProducerBindingStateCut B,
  exact singleton semantic state position B
)

BindingBaselineUniverseScope = (
  exact PermissionEvaluationCoordinate Q,
  exact ProducerIncarnation P,
  exact ProducerBindingStateCut B,
  exact singleton semantic state position B
)

BindingBaselineUniverseMember = (
  exact BindingBaselineUniverseScope,
  baseline category =
    intrinsic-lineage-or-allocation
    | acquisition-or-emission-attachment
    | resource-membership
    | channel-membership
    | endpoint-or-gate-attachment
    | routing
    | control-path
    | section-11-K-relation
    | physical-or-environment-residency,
  exact BindingLifecycleDirectOwner,
  exact complete binding-affecting subject/object/relation owner domain at B,
  projection shape = exact-scalar-or-tuple | exact-complete-finite-set
)

BindingBaselineUniverse = (
  exact BindingBaselineUniverseScope,
  exact frozen Stage-B H13EvaluationPopulation,
  exact complete bounded direct-source enumeration domains,
  exact S01-S12 subject and O01-O11 object universes,
  exact ResourceObjectClass vocabulary,
  exact complete ResourceObject and Channel candidate populations,
  exact K01-K49 type/source/owner matrix,
  exact Section-11 direct factual ownership matrix,
  exact O09/O10 source-surface coordinate class,
  exact finite source-enumeration boundaries,
  exact complete finite BindingBaselineUniverseMember set,
  exact owner-domain enumeration/completeness result,
  verdict
)

binding-baseline-universe verdict =
  exact-complete | unavailable | indeterminate | contradictory

BindingBaselineOwnerProjection =
  present-exact-scalar-or-tuple(exact value)
  | present-exact-complete-set(exact finite set)
  | present-exact-complete-empty-set
  | unavailable
  | indeterminate
  | contradictory

BindingBaselineCandidateExpectedProjection = (
  exact BindingBaselineOwnerSlot,
  exact candidate binding at B,
  exact expected BindingBaselineOwnerProjection
)

BindingBaselineOwnerSlot = (
  exact BindingBaselineUniverseScope,
  exact BindingBaselineUniverse,
  exact BindingBaselineUniverseMember,
  exact BindingLifecycleDirectOwner from that universe member
)

BindingBaselineDirectAttribution = (
  exact BindingBootstrapSourceCoordinate,
  exact BindingLifecycleDirectOwner,
  exact asserted baseline semantic content with this wrapper omitted,
  exact BindingBaselineUniverseScope,
  exact semantic state position B,
  exact BindingBootstrapSourceEligibility,
  verdict
)

binding-baseline-direct-attribution verdict =
  attributed-authentic | unavailable | indeterminate | contradictory

BindingBaselineOwnerObservation = (
  exact BindingBaselineOwnerSlot,
  exact BindingBootstrapSourceCoordinate,
  exact actual BindingBaselineOwnerProjection at B,
  exact BindingBaselineDirectAttribution
)

BindingBaselineOwnerDomainCompositionResult = (
  exact BindingBaselineOwnerSlot,
  exact BindingBootstrapSourceCandidatePopulation,
  exact per-source BindingBaselineOwnerObservation occurrence family retaining multiplicity,
  exact eligible distinct-source set,
  exact corroborating equal distinct-source set,
  exact conflicting unequal distinct-source set,
  exact composed complete actual BindingBaselineOwnerProjection,
  verdict
)

baseline-owner-domain-composition verdict =
  exact-composed | unavailable | indeterminate | contradictory

BindingBaselineObservationPopulation = (
  exact BindingBaselineEvaluationScope,
  exact BindingBaselineUniverse,
  exact complete raw producer-lifecycle surface allocation state at B,
  exact complete BindingBaselineOwnerSlot set,
  exact BindingBaselineCandidateExpectedProjection set,
  exact BindingBootstrapSourceCandidatePopulation set,
  exact raw BindingBaselineOwnerObservation occurrence family retaining multiplicity,
  exact BindingBaselineOwnerDomainCompositionResult set,
  exact BindingBaselineOwnerPopulationResult,
  verdict
)

BindingBaselineOwnerPopulationResult = (
  exact expected BindingBaselineOwnerSlot set derived from BindingBaselineUniverse,
  exact slot-to-complete-source-population map,
  exact slot/source-to-raw-occurrence multiplicity map,
  exact missing-or-inaccessible slot set,
  exact equal-duplicate same-source occurrence set,
  exact unequal-duplicate same-source occurrence set,
  exact injected-or-unknown-owner/source occurrence set,
  exact wrong-class/domain/incarnation/Q/side/context occurrence set,
  exact ended-or-replaced source occurrence set,
  exact ambiguous or contradictory source-attribution set,
  exact corroborating distinct-source projection set,
  exact mutually-conflicting distinct-source or owner-projection set
)

binding-baseline-population verdict =
  complete-projected | unavailable | indeterminate | contradictory

ProducerSourceSurfaceBindingBaseline = (
  exact PermissionEvaluationCoordinate Q,
  exact ProducerIncarnation P,
  exact ProducerSourceSurfaceBinding candidate established at B,
  exact ProducerBindingStateCut B,
  exact candidate-independent BindingBaselineUniverse,
  exact BindingBaselineObservationPopulation,
  exact complete candidate-expected-to-actual-owner projection equality result,
  verdict
)

candidate-to-owner projection equality result =
  exact-equal | unequal | unavailable | indeterminate | contradictory

binding-baseline verdict =
  exact-coherent | unavailable | indeterminate | contradictory

BindingLifecycleEvaluationScope = (
  exact PermissionEvaluationCoordinate Q,
  exact ProducerIncarnation P,
  exact ProducerSourceSurfaceBinding established at B,
  exact BindingBaselineEvaluationScope at B,
  exact AuthorityUseCut U,
  exact semantic interval (B,U]
)

BindingLifecycleUniverseScope = (
  exact PermissionEvaluationCoordinate Q,
  exact ProducerIncarnation P,
  exact ProducerBindingStateCut B,
  exact AuthorityUseCut U,
  exact semantic interval (B,U]
)

BindingLifecycleUniverseMember = (
  exact BindingLifecycleUniverseScope,
  EventFamily in {E07,E11,E14,E15,E17},
  exact BindingLifecycleDirectOwner,
  exact complete binding-affecting subject/object/relation owner domain,
  exact derivation from BindingBaselineUniverse or independently enumerated bounded Stage-B member
)

BindingLifecycleUniverse = (
  exact BindingLifecycleUniverseScope,
  exact candidate-independent BindingBaselineUniverse,
  exact frozen Stage-B H13EvaluationPopulation,
  exact complete bounded post-B direct-source enumeration domains through U,
  exact complete finite BindingLifecycleUniverseMember set,
  exact owner-domain enumeration/completeness result,
  verdict
)

binding-lifecycle-universe verdict =
  exact-complete | unavailable | indeterminate | contradictory

BindingLifecycleDirectAttribution = (
  exact BindingBootstrapSourceCoordinate,
  exact BindingLifecycleDirectOwner,
  exact asserted binding-lifecycle semantic content with this wrapper omitted,
  exact BindingLifecycleUniverseScope,
  exact semantic state position or interval,
  exact BindingBootstrapSourceEligibility,
  verdict
)

binding-lifecycle-direct-attribution verdict =
  attributed-authentic | unavailable | indeterminate | contradictory

BindingLifecycleOwnerSlot = (
  exact BindingLifecycleUniverseScope,
  exact BindingLifecycleUniverse,
  exact BindingLifecycleUniverseMember,
  exact EventFamily and direct factual owner from that universe member
)

BindingLifecycleObservation = (
  exact BindingLifecycleOwnerSlot,
  exact BindingBootstrapSourceCoordinate,
  exact event-family projection,
  exact affected semantic subject/object/relation set,
  exact before-state,
  exact after-state,
  exact semantic event position,
  exact BindingLifecycleDirectAttribution
)

BindingLifecycleCoverageStatement = (
  exact BindingLifecycleOwnerSlot,
  exact BindingBootstrapSourceCoordinate,
  exact continuous direct-owner observation interval (B,U],
  exact finite BindingLifecycleObservation occurrence family for that slot,
  exact unique semantic order and explicit concurrency relation,
  exact BindingLifecycleDirectAttribution,
  verdict
)

binding-lifecycle-slot-coverage verdict =
  continuous-complete | gap | unavailable | indeterminate | contradictory

BindingLifecycleObservationPopulation = (
  exact PermissionEvaluationCoordinate Q,
  exact ProducerIncarnation P,
  exact ProducerSourceSurfaceBinding established at B,
  exact AuthorityUseCut U,
  exact BindingLifecycleUniverse,
  exact complete BindingLifecycleOwnerSlot set,
  exact BindingBootstrapSourceCandidatePopulation set,
  exact BindingLifecycleCoverageStatement occurrence family,
  exact raw BindingLifecycleObservation occurrence family retaining multiplicity,
  exact global unique semantic order and explicit concurrency relation,
  exact owner-domain/cardinality/completeness/consistency result,
  verdict
)

binding-lifecycle-population verdict =
  continuous-complete-no-change | continuous-complete-changed | gap
  | unavailable | indeterminate | contradictory

ProducerBindingContinuityMeasuredConclusion = (
  exact PermissionEvaluationCoordinate Q,
  exact ProducerIncarnation P,
  exact ProducerSourceSurfaceBinding established at B,
  exact candidate-independent BindingBaselineUniverse,
  exact ProducerSourceSurfaceBindingBaseline at B,
  exact BindingLifecycleObservationPopulation over (B,U],
  exact AuthorityUseCut U,
  exact selected release and IsolationProfile,
  exact applicable IsolationAttestationAuthorityIdentity,
  exact OrganizationIAARegistrationSubjectIdentity,
  exact OrganizationIAARegistrationRevisionIdentity,
  exact IAA-authored measured semantic state position M,
  conclusion,
  exact AuthoritativeSourceAttribution owned by that exact IAA
)

binding-continuity conclusion =
  binding-unchanged-through-cut | binding-changed
  | unavailable | indeterminate | contradictory

BindingConclusionCausality = (
  exact ProducerBindingContinuityMeasuredConclusion,
  exact IAA-authored measured semantic state position M,
  exact closing semantic position U of the carried BindingLifecycleObservationPopulation,
  exact QualifiedPhysicalTimeInput(M),
  exact QualifiedPhysicalTimeInput(U),
  exact QualifiedPhysicalTimeDomainComparison,
  exact binding-conclusion semantic-position result,
  verdict
)

binding-conclusion semantic-position result =
  exact-equal | before | after | unavailable | indeterminate | contradictory

binding-conclusion-causality verdict =
  exact-close | unavailable | indeterminate | contradictory

ProducerBindingEventCoverage = (
  exact PermissionEvaluationCoordinate Q,
  exact ProducerIncarnation P,
  exact binding semantic state position B,
  exact AuthorityUseCut U,
  exact candidate-independent BindingBaselineUniverse,
  exact complete BindingLifecycleOwnerSlot set,
  exact ProducerSourceSurfaceBindingBaseline,
  exact BindingLifecycleObservationPopulation,
  exact ProducerBindingContinuityMeasuredConclusion occurrence family,
  exact BindingConclusionCausality,
  exact binding-continuity-currentness assertion,
  exact direct-owner/IAA consistency and cardinality result,
  verdict
)

binding-event-coverage verdict =
  continuous-complete | changed | noncurrent | gap
  | unavailable | indeterminate | contradictory

ProducerSourceSurfaceBindingCurrentness = (
  exact ProducerSourceSurfaceBinding,
  exact ProducerBindingStateCut B,
  exact AuthorityUseCut U,
  exact current ProducerIncarnation occurrence,
  exact ProducerIntrinsicContinuity occurrence,
  exact candidate-independent BindingBaselineUniverse,
  exact ProducerSourceSurfaceBindingBaseline,
  exact BindingConclusionCausality,
  exact ProducerBindingEventCoverage,
  exact occurrence/cardinality/coverage result,
  verdict
)

binding-currentness verdict =
  current | invalidated | noncurrent | unavailable | indeterminate | contradictory
~~~

The exact namespace IAA is allocation authority for ProducerIdentity, ProducerIncarnation, ProducerActivationIncarnation, ProducerObservationMechanismIncarnation, and ProducerReportMechanismIncarnation opaque semantic values. Allocation is not authorship of the underlying lifecycle fact. ProducerIntrinsicLifecycleDirectAttribution names producer-lifecycle as the sole direct factual owner of activation, end, restart, mechanism, and capability-binding evidence without using SourceAttribution or Q-local binding currentness. Its occurrence family retains multiplicity and uses the same absent/equal-duplicate/unequal-conflict fail-closed meanings as other raw owner inputs. Section 9.6 and Section 11 direct owners separately supply their technical/resource/channel facts. Each allocated value is injective within ProducerNamespace, names exactly one semantic subject, is never reassigned or recycled, and has componentwise structural equality. No key, process ID, host ID, certificate, path, address, API, provider identifier, executable image, representation, or presentation label participates in identity or equality.

ProducerActivationIncarnation is born at one explicit activation and ends at explicit deactivation, process/runtime restart, loss of the active execution continuity established by complete lifecycle evidence, or ProducerIdentity end. A restart always ends the prior activation and requires exactly one new ProducerActivationIncarnation and one new ProducerIncarnation when a unique successor exists. A mechanism incarnation is born when that exact intrinsic mechanism begins operation, ends when it definitively ceases, and is replaced only by a uniquely ordered owner-evidenced transition from that exact old mechanism to one exact new mechanism for a continuing ProducerIntrinsicCapabilityCoordinate. A producer runtime restart does not by itself replace a separately continuing mechanism incarnation, but it always replaces ProducerActivationIncarnation and ProducerIncarnation. Complete evidence must state whether each mechanism continued; missing evidence cannot assume preservation. Initial activation allocates one current ProducerIncarnation. A later lifecycle replacement allocates one new ProducerIncarnation at the exact aggregate transition position, even when observation and report mechanisms replace concurrently. Sequential replacement positions allocate sequential incarnations.

ProducerIntrinsicCapabilityScope represents multiple ProducerClass capabilities only as the exact set of ProducerIntrinsicCapabilityBinding values. One mechanism incarnation may appear in more than one binding. Distinct mechanisms may serve distinct capability coordinates. For one capability coordinate at one semantic position there must be exactly one active observation-mechanism incarnation and exactly one active report-mechanism incarnation. Concurrent old and candidate replacement mechanisms for the same coordinate without an exact unique end/replacement relation are not resolved by first, newest, identifier order, discovery order, configuration preference, or IAA preference.

ProducerIntrinsicContinuity is Q-independent. Its coordinate contains no PermissionEvaluationCoordinate, PermissionScopeKey, ObservationScope, Q-local binding membership, Q-local authorization, Q-local coupling state, Q-local threat/source-control result, or Q-local event/result value. Its result is derived by this closed precedence and transition relation:

1. contradictory applies when attributed lifecycle facts assert mutually exclusive activation/mechanism/capability states, unequal successors at one unique position, impossible order, conflicting birth/end, or unequal duplicated lifecycle content;
2. unavailable applies, absent a contradiction, when a required producer-lifecycle domain, coverage interval, activation occurrence, mechanism occurrence, capability binding, or current/predecessor state is missing or inaccessible;
3. indeterminate applies, absent the prior branches, when all required domains are present but order, concurrency, clone/successor relation, mechanism continuation, or unique transition cannot be resolved, including concurrent old/new mechanisms for one capability without a unique replacement edge;
4. ended applies when complete uniquely ordered evidence shows the predecessor activation ended by the cut and no successor under that ProducerIdentity is active;
5. replaced applies when complete uniquely ordered evidence shows a restart, deactivation followed by activation, or replacement of the observation or report mechanism for any continuing capability coordinate and exactly one successor lifecycle state; all concurrent replacement components at one position produce exactly one new ProducerIncarnation; and
6. continuous applies for an initial uniquely active birth or when the exact ProducerActivationIncarnation is retained and every capability coordinate present in both predecessor and current scopes retains its exact observation and report mechanism incarnations.

An in-place configuration change preserving the exact activation and both exact mechanism incarnations is continuous. Adding or removing a ProducerIntrinsicCapabilityBinding without replacing a mechanism used by a continuing capability is continuous, updates the Q-independent capability scope, and invalidates only Q-local evidence whose class/domain availability changed. Adding, removing, or changing an ObservationScope or permission Q; moving only an O09/O10 attachment/topology; or changing only a Q-local coupling state never affects the transition relation. Those Q-local changes may invalidate bindings/evidence but cannot allocate, end, or replace an incarnation. A clone that continues concurrently is a new ProducerIdentity and new ProducerIncarnation; it does not replace the original. A claimed substitution without exact enrollment and unique lifecycle evidence is indeterminate, or contradictory when it asserts equality with an unequal lineage. A replacement by a different enrolled lineage is a new ProducerIdentity. Loss of raw lifecycle evidence is unavailable; present but nonunique lifecycle evidence is indeterminate. Neither outcome authorizes continuity.

The transition effects are therefore exact: (1) explicit deactivation without successor ends the existing ProducerIncarnation; restart, deactivation-reactivation, or a continuing-capability observation/report mechanism replacement ends it and allocates exactly one successor per transition position; (2) Q/ObservationScope add/remove/change, O09/O10 attachment/topology/allocation change with the intrinsic mechanisms retained, Q-local coupling change, in-place configuration change, and capability add/remove without continuing-capability mechanism replacement retain the ProducerIncarnation but invalidate every structurally affected Q-local binding/evidence coordinate; and (3) unavailable, indeterminate, or contradictory lifecycle evidence is non-authorizing and allocates no implementation-selected successor. A separately enrolled clone/new lineage allocates its own ProducerIdentity and ProducerIncarnation without ending the original.

Identical ProducerIntrinsicLifecycleEvidence yields the same precedence branch, transition, intrinsic-continuity verdict, and allocation relation independent of discovery order. The one ProducerLifecycleEvaluationCoordinate result is consumed unchanged by every Q-local binding/projection. If one current ProducerIncarnation appears in Q1 through Qn, adding Q2 with a new ObservationScope, removing Q1's scope, or changing only Q-local topology retains that incarnation unless the independent intrinsic transition relation changes. A genuine intrinsic replacement projects the same one new incarnation into every affected Q. No Q-specific incarnation fork exists. A coupling, binding-currentness, threat, source-control, event, F, reason, or result node may not feed this coordinate.

ProducerBindingStateCut is the exact semantic state position at which the complete O09/O10 allocation/topology population is closed for P at Q. It is structural, has no allocated identity, and need not equal the permission ClosureStateCut; it must be semantically at or before every ordinary observation position whose SourceAttribution uses the binding and at or before AuthorityUseCut. This ordering is established by the same implementation-neutral semantic order rules as other state positions, without a record-link or time-representation rule.

ProducerSourceSurfaceCoordinate, ProducerObservationSurface, ProducerReportSurface, ProducerSourceSurfaceBinding, and ProducerSourceSurfaceBindingCurrentness are structural measured lifecycle values, not H-13-allocated identities, transferable authority, H-11 history records, or representations. The producer-lifecycle direct factual owner establishes the candidate binding from the complete enrollment/surface-allocation population at B; the IAA allocation values identify the semantic subjects but do not transfer ownership of those facts. The candidate grants no authority over facts observed through the surfaces and does not prove actual topology. It carries no SourceAttribution and has no DirectProducerFact, source-control conclusion, Producer-independence conclusion, F, reason, or result dependency. The producer-lifecycle domain must enumerate every and only surface for P at Q and retain raw occurrence multiplicity before the two mathematical sets are formed. A surface coordinate embeds exactly one P and cannot map to a second ProducerIncarnation. exact-complete requires a uniquely ordered B; P and its one Q-independent intrinsic-continuity occurrence are exact/current at B; both surface sets are nonempty; every raw surface occurrence is present exactly once; every attachment set is complete; no surface lies outside P's complete lifecycle allocation; and cardinality is exact-one-owner-complete. Missing occurrence or an empty required set yields unavailable; an equal duplicate, extra/injected occurrence, or unresolvable mapping yields indeterminate; a surface mapped to unequal Producers, an unequal duplicate, conflicting attachment/lineage evidence, or binding position after an attributed observation/use cut is contradictory. Every failure is non-authorizing.

ProducerSourceSurfaceBinding is only the producer-lifecycle allocation candidate; `exact-complete` proves neither actual cross-owner topology nor the verification extent. BindingBaselineUniverse is generated before candidate-to-owner equality from exact Q, P, B, the already-frozen Stage-B population, all complete bounded direct-source enumeration domains, the closed S01-S12/O01-O11/ResourceObjectClass/ResourceObject/Channel populations, K01-K49 type/source/owner matrix, Section-11 direct ownership, and the exact O09/O10 coordinate class. P identifies the candidate whose expected projections will later be compared but has no authority to add, remove, or filter a universe member. Candidate content, provider/local filters, later F predicates, and any substantive verdict are forbidden universe-selection inputs.

The complete universe contains every baseline category and direct-owner domain independently exposed by those bounded inputs, including acquisition/report attachments, ResourceObjects, Channels, endpoints/gates, routes, control paths, K45/K49 facts, physical residency, environment attachments, and Section-11 relations. An independently discovered actual fact creates its universe member even when the candidate omits that category or value. A late member discovered on the last strict-growth step enters the universe before freezing. The candidate supplies only BindingBaselineCandidateExpectedProjection after the universe and its slots exist.

Every owner domain is total. A scalar/tuple domain is present with its exact value or is unavailable, indeterminate, or contradictory. A set-valued domain is present only as an exact complete finite set, including the explicit `present-exact-complete-empty-set` branch when the direct owner affirmatively establishes exhaustive emptiness. Missing, inaccessible, unbounded, or incompletely enumerated evidence never denotes an empty set. Candidate-to-actual equality is complete structural equality: `{A,B}` versus `{A}`, `{A}` versus `{A,B}`, `{}` versus `{A}`, and `{A}` versus `{}` are all unequal; `{}` versus `{}` is equal only when actual emptiness is owner-proven complete. An extra actual fact generates a comparison even if it would not independently fail a later F predicate.

BindingBaselineOwnerSlots(Q,P,B) is the exact one-to-one expansion of BindingBaselineUniverse members and Section-11 ownership, never an expansion of candidate membership. BindingLifecycleUniverse is independently generated from that baseline universe plus every bounded binding-affecting member/domain exposed through U; BindingLifecycleOwnerSlots is its E07/E11/E14/E15/E17 owner/domain expansion. Thus a candidate cannot omit a post-B domain either. One real change projects into every applicable family slot at the same semantic position. Before-state is tagged absent only for birth/addition; after-state is tagged absent only for end/removal; otherwise both exact states are mandatory.

BindingLifecycleDirectOwner remains the closed abstract factual-owner union: every K01-K49 fact uses section-11-row-direct-owner and its exact matrix owner; non-K intrinsic lifecycle or O09/O10 lineage/allocation uses producer-lifecycle-intrinsic-or-surface-allocation-owner; non-K boundary/controller/gate/attachment uses boundary-state-non-K-direct-owner; and non-K physical residency/environment-owned attachment uses environment-membership-non-K-direct-owner. A fact matching no branch, two unresolved branches, or a different owner is malformed. That abstract owner never identifies the concrete Producer that supplied bootstrap content.

BindingBootstrapSourceCoordinate closes concrete source identity without ordinary SourceAttribution. It names exactly one enrolled ProducerIdentity and ProducerIncarnation, its ProducerClass/direct-source domain, its exact abstract owner/factual role/domain, one frozen source-enumeration occurrence coordinate, and the Q-independent intrinsic lifecycle coordinate needed to establish the source candidate. Its class/domain must equal the closed owner matrix. It contains no SourceAttribution, ProducerSourceSurfaceBindingCurrentness, ProducerControlCouplingState, ProducerThreatControlDomain, AbsenceSourceControl, ProducerIndependenceMeasuredConclusion, PropositionDirectSourceCoverage, ordinary EventOccurrence, F, reason, or result. It consumes only upstream identity, enrollment, class/domain, source enumeration, exact scope, and Q-independent intrinsic lifecycle semantics. H-10 may later authenticate that this exact semantic Producer supplied the content; H-10 cannot invent, choose, or substitute the source Producer.

For each baseline or lifecycle slot, BindingBootstrapSourceCandidatePopulation enumerates every matching concrete source from the frozen Stage-B population and retains every explicit unavailable placeholder and raw occurrence. It never chooses a preferred source. Distinct valid Producers for the same owner domain remain distinct. Multiple eligible distinct sources with structurally equal content are deterministic corroboration; structurally unequal content is contradiction. Same-source equal duplicate occurrences are indeterminate; same-source unequal duplicates are contradictory. Same content from distinct Producers is not a duplicate. Missing source, injection, wrong class/domain/incarnation/Q/side/context, ended or replaced source, ambiguous source, and contradictory attribution remain in their exact classified sets. No first, newest, configured, preferred, winner, or IAA-selected source rule exists.

The source-population verdict has contradiction precedence. contradictory applies to unequal same-source duplicates, one raw occurrence mapped to incompatible slots/sources, identity/incarnation collision, contradictory attribution, or mutually exclusive source enrollment/class/domain/lifecycle facts. Otherwise unavailable applies when the bounded enumeration domain, required placeholder, or every potentially matching concrete source is absent/inaccessible/unavailable. Otherwise indeterminate applies to equal same-source duplicates, injection, wrong class/domain/incarnation/Q/side/context, ended/replaced or ambiguous source, nonunique mapping, or unresolved eligibility. complete-enumerated applies only when the finite domain is affirmatively complete, every candidate and placeholder is retained, at least one eligible concrete source exists for the owner domain, every raw occurrence maps exactly once to its exact source/slot, and no prior branch applies. This verdict classifies enumeration/cardinality only; it does not authenticate or compose content.

BindingBaselineDirectAttribution and BindingLifecycleDirectAttribution structurally carry the exact BindingBootstrapSourceCoordinate and its eligibility. `attributed-authentic` means that exact concrete identity/incarnation, exact owner class/domain, exact bootstrap scope, and exact nonrecursive lifecycle eligibility supplied the asserted content without substitution; it also means the content-authentication semantic obligation is exact even though H-10 later chooses its mechanism. A record from Producer A cannot be rebound to Producer B because class/domain/content/surface/provider/operator equality, replacement, age, or configuration preference appears convenient. A new incarnation is a distinct source. An H-10-valid proof for A offered as B is contradictory. These direct attributions are not aliases of AuthoritativeSourceAttribution or ordinary SourceAttribution.

Every repeated source coordinate in a direct attribution, owner observation, coverage statement, population map, and provenance question MUST be structurally equal. A mismatch is source substitution and contradictory; it is never resolved by matching content or abstract owner. One raw occurrence maps to exactly one concrete source and slot, while one distinct source may validly contribute its own occurrence to the same owner domain alongside other distinct sources.

BindingBaselineOwnerObservation and BindingLifecycleObservation are distinct bootstrap types and MUST NOT be aliases, subtypes, wrappers, or renamed canonical EventOccurrence values. They have no ordinary SourceAttribution, ordinary EventCoverageAssertion, EventRequirementSourcePopulation, Producer-independence value, binding-currentness/coupling/threat/source-control result, F, reason, or final result. Each carries or resolves exactly one concrete bootstrap source. H-10 later realizes authentication; it may not require the binding currentness being evaluated, replace the source or direct owner, or use one source's proof for another.

BindingBaselineObservationPopulation composes each slot only by the closed source rule above and retains raw multiplicity. With contradiction precedence, it is contradictory for unequal same-source duplicates, unequal distinct-source projections, mutually exclusive owner facts, impossible state at B, source substitution, contradictory attribution, wrong-owner content asserted as authoritative, or conflicting complete projections; otherwise unavailable for a required slot/domain/source population/occurrence/shard/attribution that is missing, inaccessible, unavailable, unbounded, or incompletely enumerated; otherwise indeterminate for an equal same-source duplicate, injected/wrong-scope/wrong-class/wrong-incarnation/ended/ambiguous source, unresolved owner membership, or unresolvable state; otherwise complete-projected only when the universe is exact-complete, every slot has a complete-enumerated source population, every retained occurrence is accounted for exactly once, every eligible source is attributed-authentic, each slot composes exactly, and all owner projections are mutually consistent. Distinct equal sources corroborate and do not become duplicates.

ProducerSourceSurfaceBindingBaseline uses this closed precedence: contradictory when the candidate, universe, population, source composition, or equality input is contradictory, or any complete actual owner projection is structurally unequal to the candidate's expected projection; unavailable when the candidate or a required universe/domain/source population/projection is absent, unbounded, incomplete, or unavailable and no contradiction is established; indeterminate when multiplicity, injection, scope, owner, concrete source, membership, equality, or projection remains unresolved; and exact-coherent only when the candidate is exact-complete, BindingBaselineUniverse is exact-complete, the population is complete-projected, every actual owner domain is an exact complete projection, and the entire expected projection is structurally equal to the entire independently generated actual projection. A producer-lifecycle claim, abstract owner label, or IAA conclusion alone cannot yield exact-coherent. The baseline is immutable at B; only a new candidate at a new B with a new candidate-independent universe and population may replace it.

Each BindingLifecycleCoverageStatement is owned by its exact abstract factual owner and resolved to one exact concrete source. continuous-complete requires coverage of every position in (B,U] without positive gap for every independently generated slot and every complete-enumerated concrete source population, exact raw multiplicity, a unique order with explicit concurrent sets, and attributed-authentic content. An empty observation family means no change only under affirmative complete coverage for that source/domain. Source replacement during (B,U] produces distinct old/new coordinates and exact end/birth/change observations; it cannot be normalized to continuity. Zero required occurrences or inaccessible source/domain is unavailable; equal same-source duplicates or unresolved scope/order/source are indeterminate; unequal duplicates, conflicting before/after states, impossible order, source substitution, or owner/source conflicts are contradictory.

BindingLifecycleObservationPopulation uses this total precedence: contradictory for any contradictory universe/source population/statement/observation/global order/owner projection; otherwise unavailable for any required universe member, slot, source, owner/domain, or statement absent/inaccessible/unavailable; otherwise indeterminate for any multiplicity, injection, source eligibility, affected scope, order, concurrency, or projection unresolved; otherwise gap for any positive slot/source coverage gap; otherwise continuous-complete-changed when at least one well-formed change exists; otherwise continuous-complete-no-change. The latter two require an exact-complete lifecycle universe, every source population complete-enumerated, every slot/source continuous-complete, every raw occurrence accounted for exactly once in every applicable projection, and one unique global order with explicit concurrency.

The exact applicable IAA is the positive measured-conclusion authority for the bounded conjunction carried by ProducerBindingContinuityMeasuredConclusion: candidate-independent baseline exact coherence at B plus owner-preserving continuous post-B evidence through U. `binding-unchanged-through-cut` affirmatively means both `baseline=exact-coherent` and `population=continuous-complete-no-change`, with every baseline and post-B direct input retaining its exact concrete source. The expected content maps that conjunction to binding-unchanged-through-cut, a coherent baseline plus positive change to binding-changed, any contradictory universe/baseline/population/source conflict to contradictory, an unavailable/gap prerequisite to unavailable, and an indeterminate prerequisite to indeterminate.

The IAA authors only this bounded measured conclusion; it does not author, relabel, suppress, replace, or rewrite BindingBaselineUniverse, a source coordinate, a direct attribution, baseline/boundary/environment/lifecycle/resource/K01-K49 fact, an observation, coverage statement, surface allocation, attachment, resource, channel, or Section-11 row. Its authorizing positive meaning exists only when the baseline is exact-coherent, all concrete baseline/post-B sources and occurrences are retained, the post-B population is continuous-complete-no-change, M=U causality and fixed freshness pass, and H-11 history is authoritative-current. An IAA conclusion cannot override a direct-owner or concrete-source conflict; a claimed unchanged against any retained conflict or positive change is contradictory. Ordinary ProducerIndependenceMeasuredConclusion is downstream and is not a bootstrap prerequisite.

ProducerBindingContinuityMeasuredConclusion has the initial-profile causal rule `M = U`, where equality is exact semantic state-position equality between the conclusion's measured semantic state position and the closing position of its carried `(B,U]` population. It is not byte equality between timestamp representations and cannot be inferred from equal-looking numeric timestamps. BindingConclusionCausality uses this closed precedence: contradictory when complete qualified evidence proves `M < U` or `M > U`, when the same semantic position carries conflicting qualified-time content, or when any causality input is contradictory; unavailable when a required position, qualified-time input, domain, or order/equality input is absent or unavailable and no contradiction is established; indeterminate when semantic equality/order is unresolved or the domain comparison is unequal/indeterminate; and exact-close only when M and U are the same exact semantic position, both projections are the same resolved QualifiedPhysicalTimeInput, and their QualifiedPhysicalTimeDomainComparison is exact-equal. Thus M one second or 59.999 seconds before U is a causal violation, not a fresh conclusion, and M after U also fails. H-11 later realizes equality/order/time evidence but does not choose this relation.

ProducerBindingEventCoverage is H-13's deterministic universe/baseline/continuity/conclusion consistency result, not an IAA-authored raw input and not an ordinary EventOccurrence population. The first applicable branch in this exact precedence is represented: (1) contradictory for a contradictory baseline universe, source population, baseline, lifecycle population, conflicting IAA conclusions, causality/currentness=contradictory, any source substitution, any IAA claim of coherent/unchanged against a retained direct-owner or concrete-source conflict, or any attributed-authentic exact-scope IAA binding-unchanged-through-cut conclusion opposed by a positive change, whether or not that conclusion is otherwise current; (2) changed for a nonconflicting positive change or an equal-current expected/current binding-changed conclusion over an exact-coherent baseline; (3) noncurrent when no higher branch applies and binding-continuity-currentness is changed-or-superseded, revoked, compromised, rollback-or-fork-unresolved, historically-unresolvable, or stale; (4) gap for a positive required-owner/source coverage gap absent a higher branch; (5) unavailable for an unavailable universe/baseline/source population, absent/unavailable required source/owner/domain/conclusion/causality/currentness occurrence, or unavailable currentness; (6) indeterminate for an indeterminate universe/baseline/source population/lifecycle population/causality/currentness, equal same-source duplicate, injected/ambiguous source/scope, unresolved order, or any remaining nonunique input; and (7) continuous-complete only when the universe is exact-complete, the baseline is exact-coherent, all bootstrap source populations are complete-enumerated, the lifecycle population is continuous-complete-no-change, exactly one structurally equal expected/current IAA conclusion affirmatively binds that baseline and population and says binding-unchanged-through-cut, BindingConclusionCausality is exact-close, binding-continuity-currentness is equal-current, and every owner/source/IAA projection is coherent. A malicious or provider label saying “binding current” is no input.

The currentness-to-local-state mapping is exhaustive:

| Exact binding-continuity-currentness status, with all other inputs fixed clean/no-change | ProducerBindingEventCoverage | ProducerSourceSurfaceBindingCurrentness |
|---|---|---|
| contradictory | contradictory | contradictory |
| indeterminate | indeterminate | indeterminate |
| unavailable | unavailable | unavailable |
| changed-or-superseded | noncurrent | noncurrent |
| revoked | noncurrent | noncurrent |
| compromised | noncurrent | noncurrent |
| rollback-or-fork-unresolved | noncurrent | noncurrent |
| historically-unresolvable | noncurrent | noncurrent |
| stale | noncurrent | noncurrent |
| equal-current plus expected/current binding-changed over an exact-coherent baseline and continuous-complete-changed population | changed | invalidated |
| equal-current plus expected/current binding-unchanged-through-cut affirmatively binding the exact-complete universe, complete-enumerated concrete sources, exact-coherent baseline, continuous-complete-no-change population, and exact-close causality | continuous-complete | current |

No `otherwise` branch exists. For multi-faults, the coverage precedence above is controlling: direct-owner or baseline contradiction outranks every history state; an unchanged conclusion opposed by a positive owner change is contradictory even when revoked or stale; a nonconflicting positive owner change yields changed/invalidated and outranks a noncurrent history state; a noncurrent history state outranks gap; gap outranks unavailable and indeterminate; unavailable outranks indeterminate. Therefore baseline contradiction plus changed conclusion is contradictory; owner contradiction plus stale conclusion is contradictory; gap plus compromised history is noncurrent; rollback/fork-unresolved history plus a real positive change is changed unless the conclusion claims unchanged, in which case the owner/conclusion conflict is contradictory. Full applicable reasons are additive and never suppressed by the represented component state.

The IAA conclusion is authority-bearing and therefore retains the same structural MeasuredConclusionMaximumAge, exact-equal QualifiedPhysicalTimeDomain comparison, MeasuredConclusionUseFreshness, and independent HistoricalCurrentnessQualification as every other IAA measured conclusion. For this conclusion only, exact-close causality makes M and U the same semantic position and the derived age necessarily the singleton `[0,0]` seconds; the 60-second test still exists and necessarily passes when its inputs are well formed. Unequal/unavailable/indeterminate/contradictory qualified-time inputs still fail. This causal specialization does not alter the general 60-second rule for RuntimeCorrespondence, ProducerIndependence, AbsenceSourceControl, context-local separation, or ordinary closure freshness. Superseded, revoked, compromised, rollback/fork-unresolved, historically unresolvable, stale, unavailable, indeterminate, contradictory, duplicate, causally invalid, or missing conclusion/currentness cannot make a binding current.

Binding currentness is current exactly when the candidate binding is exact-complete at B; its candidate-independent BindingBaselineUniverse is exact-complete; every baseline/post-B source population is complete-enumerated without substitution; ProducerSourceSurfaceBindingBaseline is exact-coherent at that same B; the current P is structurally the same ProducerIncarnation; the one producer-lifecycle-scoped ProducerIntrinsicContinuity is continuous; exactly one positive IAA measured conclusion binds that exact universe, baseline, and post-B population; BindingConclusionCausality is exact-close; and ProducerBindingEventCoverage is continuous-complete. Its closed precedence is: contradictory for any contradictory binding, universe, source population, baseline, intrinsic, bootstrap, conclusion consistency/causality/currentness, coverage, or current-P evidence; otherwise invalidated for an ended/replaced intrinsic state, unequal current P, source replacement affecting the binding, or changed coverage; otherwise noncurrent for noncurrent coverage; otherwise unavailable for a missing/unavailable binding, universe, source population, baseline, intrinsic, owner population, IAA conclusion/causality/currentness, or gap/unavailable coverage; otherwise indeterminate for any remaining indeterminate binding/universe/source/baseline/intrinsic/coverage/order input; otherwise current only under the exact conjunction above. No post-B no-change result, IAA conclusion, new topology, reason, aggregate currentness set, F value, or final gate can cure an incorrect or unknown baseline or missing concrete source. A new binding established at a new B, a new independently generated universe, new exact source populations/baseline, a new complete post-B population, and a new exact current causally valid IAA conclusion are required after invalidation. SourceAttribution accepts only literal `current`; every other verdict is non-authorizing.

Reason 029 reports currentness failure but cannot turn, reinterpret, or repair a lower-level state. IAAMeasuredCurrentnessSet is only a completeness aggregate and cannot substitute for the local mapping. F03, F05, F14, F16, reasons, provenance validation, result completeness, and the final decision consume the represented binding state and never “fix” it.

Canonical EventOccurrence remains downstream of binding currentness. It may corroborate an already nonrecursively established bootstrap observation but cannot establish the currentness required by its own SourceAttribution. Every overlap must have equal source identity/incarnation, family projection, affected set, before/after state, and semantic position; conflict or source rebinding is contradictory. The acyclic order is exactly: frozen Stage-B source enumeration and raw Q-independent producer-lifecycle evidence; candidate-independent BindingBaselineUniverse and BindingLifecycleUniverse members/slots; concrete BindingBootstrapSourceCoordinate candidates and eligibility; ProducerSourceSurfaceBinding candidate as expected-projection supplier only; complete bootstrap source populations; baseline direct attributions/observations and per-domain composition; BindingBaselineObservationPopulation; ProducerSourceSurfaceBindingBaseline; post-B direct attributions/observations/coverage; BindingLifecycleObservationPopulation; bounded positive IAA ProducerBindingContinuityMeasuredConclusion closed at M=U; BindingConclusionCausality, fixed freshness, and H-11-realized history/currentness; ProducerBindingEventCoverage; ProducerSourceSurfaceBindingCurrentness; ordinary SourceAttribution and DirectProducerFact/EventOccurrence; ordinary event coverage; coupling, threat, source-control, independence, F, and result. No dependency arrow may return upward.

K45/K49/controller/resource/coupling relation changes, attachment/topology changes, and a changed Q-scoped ProducerControlCouplingState do not by themselves allocate, end, or replace ProducerIncarnation. They generate exact owner-preserving bootstrap observations and later ordinary E07/E11/E14/E15/E17 occurrences, invalidate every applicable affected coordinate, and require a fresh Q-local binding/evidence evaluation. Such a relational change may coincide with a genuine intrinsic transition, but only the Q-independent ProducerIntrinsicContinuity relation determines the incarnation transition. An implementation-derived incarnation edge from ProducerControlCouplingState is forbidden and provenance-invalid.

Observation assertions remain side-scoped: each carries exactly one ObservationScope containing host-side or agent-side. One physical producer observing both sides in one ExactTenantContext and IAA namespace uses one ProducerIdentity and one current ProducerIncarnation, but emits two disjoint side-scoped assertion sets. No occurrence, closure member, relation edge, event-coverage conclusion, or result may merge sides; a cross-side fact is malformed.

If one physical producer serves unequal ExactTenantContext values, each context receives a distinct ProducerNamespace, ProducerIdentity, ProducerIncarnation, presentation carrier, occurrence value, and assertion surface. No protocol-visible equality or stable mapping links them. Physical sameness may be known only inside Section 12's protected detector and supplies no producer identity equality.

Producer semantic equality requires exact structural equality of ProducerIdentity; incarnation equality additionally requires equality of ProducerIncarnation. Same physical component, operator, image, key, provider, host, or detector knowledge is insufficient.

### 6.4 Other scoped semantic values

PhysicalEnvironmentObservation is:

~~~
PhysicalEnvironmentObservation = (
  exact environment-membership ProducerIncarnation,
  ExactTenantContext,
  ParticipantSide,
  producer-allocated non-recyclable observation value
)
~~~

It names only that producer's context-local observation stream. It is never a provider-global physical identity and never compares equal across producer incarnations, sides, or contexts.

EnumerationDomain is:

~~~
EnumerationDomain = (
  exact ProducerIncarnation,
  exact ProducerClass,
  exact direct-source domain,
  producer-allocated non-recyclable domain value
)
~~~

It names one complete source stream, not permission or a physical global domain. Producer restart ends it.

Every measured identity has lifecycle state exactly current, ended, replaced, or unknown. Only current participates in a pass. Unknown or conflicting lifecycle is non-authorizing.

AnonymousPhysicalResident is:

~~~
AnonymousPhysicalResident = (
  exact environment-membership ProducerIncarnation,
  ExactTenantContext,
  ParticipantSide,
  exact environment ObservationScope,
  closure state cut,
  producer-allocated occurrence-local non-recyclable resident value
)
~~~

It enumerates a non-target resident without identifying another tenant. It never compares equal outside that exact producer/context/side/scope/cut and cannot be reused in a later closure.

PhysicalResident is the tagged union known-subject(exact S01-S06 or S09-S12 subject reference) or anonymous-external(exact AnonymousPhysicalResident). PhysicalResidentSet is the exact finite mathematical set of all PhysicalResident values in an environment scope.

## 7. Equivalence without cross-context carriers

For equal ExactTenantContext values, RuntimeEquivalence is exactly:

| State | Meaning |
|---|---|
| identity-equal-incarnation | exact RuntimeIncarnation equality |
| same-physical-incarnation | unequal namespace identities and mutual exact-IAA-authored conclusions, each H-13-fresh and H-11-qualified authoritative-current, over one common eligible complete birth/continuity observation set establish one physical incarnation |
| same-lineage-different-incarnation | equal RuntimeLineage and unequal RuntimeIncarnation |
| different-runtime | eligible complete evidence establishes different physical runtime subjects |
| indeterminate-runtime | sameness or difference cannot be established |

BoundaryEquivalence is exactly identity-equal-boundary, same-physical-boundary, different-boundary, or indeterminate-boundary. EnvironmentEquivalence is exactly identity-equal-environment-observation, same-physical-environment, different-environment, or indeterminate-environment. ControllerEquivalence is exactly identity-equal-controller, same-physical-controller, different-controller, or indeterminate-controller. ResourceEquivalence is exactly identity-equal-resource, same-physical-resource, different-resource, or indeterminate-resource.

EquivalenceConclusion is:

~~~
EquivalenceConclusion = (
  kind = runtime | boundary | environment | controller | resource,
  exact left context-local semantic value,
  exact right context-local semantic value,
  exact applicable state from the closed kind vocabulary,
  exact finite ObservationOccurrenceCoordinate set,
  exact finite ProducerClosureCoordinate set,
  closure state cut
)
~~~

It is structural and exists only for equal ExactTenantContext values. Every coordinate must resolve exactly once. A same-physical state requires the mutual IAA rule below.

Cross-IAA same-physical conclusions inside one ExactTenantContext require each applicable IAA to assert the same relation over a common eligible complete observation set at the same semantic cut. A unilateral conclusion is indeterminate. Conflict is contradictory. Physical equivalence never rewrites an H-02 identity or an IAA-allocated identity.

Across unequal ExactTenantContext values, none of these protected identities or same-physical relations is exposed or compared at a protocol-visible surface. Required cross-context separation uses Section 12's context-private detector evidence only as a negative narrowing input and uses only exact IAA-authored IAAContextLocalSeparationConclusion content with H-13-fresh and authoritative-current status on each side as positive measured authority.

RelevantProducerSet(Q), ProducerCouplingBaseGraph(Q), ProducerControlCouplingPairSet(Q), and ProducerControlCouplingPopulation(Q) are the only Producer-coupling population and scope model. They are defined in Section 9.1 from the frozen Stage-B population. No proposition/P-specific ProducerInfluenceBaseGraph, provider label, source count, discovery order, or implementation-selected meaning of “relevant” may select or omit a coupling pair.

## 8. Closed subject, object, and resource universes

### 8.1 Subject classes S01-S12

| Code | Subject class | Exact meaning |
|---|---|---|
| S01 | target-runtime | current RuntimeIncarnation in the exact MeasurementTarget runtime set |
| S02 | supporting-controller | current ControllerIncarnation satisfying Section 10 |
| S03 | observation-only-subject | current observer with no controller role or technical control power |
| S04 | co-resident-runtime | non-target runtime in a relevant environment or boundary |
| S05 | producer-subject | exact current enrolled ProducerIncarnation |
| S06 | capability-endpoint | finite local listener, IPC endpoint, identity/privilege endpoint, storage/device endpoint, or management API through which influence can enter |
| S07 | external-ingress-class | equivalence class of external actors indistinguishable at one S06 under equal effective policy and capability |
| S08 | unknown-external-class | mandatory catch-all for possible ingress not proved to belong to an exhaustive S07 partition |
| S09 | boundary-subject | exact IsolationBoundary used as a structural relation source |
| S10 | environment-subject | exact PhysicalEnvironmentObservation used as a structural relation source |
| S11 | resource-subject | exact ResourceObject used as a structural relation source |
| S12 | channel-endpoint-subject | exact local channel endpoint used as a directed-path source |

S06 is enumerated from complete local listening, attached, configured, identity/privilege, storage/device, and management surfaces. S07 partitions the finite effective policy/capability classes at each S06. Each endpoint contains S08 unless the direct source proves the S07 partition exhaustive. The model does not enumerate the Internet. An unknown subject class is malformed and is not coerced to S08.

Boundary-state is direct source for configured/listening S06 endpoints and their effective-policy S07 partition/S08 catch-all. Environment-membership is direct source for physically present/attached interfaces and environments. A physical network ingress surface requires both domains in CombinedClosure. Neither source may declare the other's domain absent.

### 8.2 Object classes O01-O11

| Code | Object class |
|---|---|
| O01 | target-set, meaning the structural runtime set in MeasurementTarget |
| O02 | runtime-incarnation |
| O03 | isolation-boundary |
| O04 | physical-environment |
| O05 | controller-incarnation |
| O06 | resource-object |
| O07 | channel-endpoint |
| O08 | subject-reference |
| O09 | exact ProducerObservationSurface embedding one ProducerSourceSurfaceCoordinate and ProducerIncarnation |
| O10 | exact ProducerReportSurface embedding one ProducerSourceSurfaceCoordinate and ProducerIncarnation |
| O11 | producer-incarnation |

Subject-reference contains the exact S01-S12 class and exact subject semantic value. It does not transfer authority or change the subject's type. An unknown object class is malformed.

### 8.3 ResourceObjectClass

ResourceObjectClass is exactly one of:

~~~
compute-scheduler
memory-domain
storage-volume
filesystem-namespace
network-interface
network-policy
ipc-namespace
identity-credential
privilege-domain
device
secret-store
management-plane
telemetry-plane
~~~

Unknown or compound classes are malformed. A compound system is multiple exact ResourceObjects plus explicit edges.

### 8.4 RelationEdge

RelationEdgeContent is the structural direct fact:

~~~
RelationEdgeContent = (
  exact RelationKind K01..K49,
  exact source SubjectClass and semantic subject,
  exact object ObjectClass and semantic object,
  tagged Resource absent | present(exact ResourceObject),
  tagged Channel absent | present(exact Channel),
  exact direction token
)

RelationEdge = (
  exact RelationEdgeContent,
  exact ObservationOccurrenceCoordinate,
  exact direct ProducerClosureCoordinate,
  exact finite contributor ProducerClosureCoordinate set
)
~~~

ObservationOccurrenceCoordinate and ProducerClosureCoordinate are nonallocated structural references defined in Section 9. They break evidence-wrapper recursion without introducing an identifier. Each must resolve to exactly one full semantic value in the evaluation.

RelationEdge equality is structural; contributor coordinates form a mathematical set. Section 11's relation type-signature matrix is exhaustive. Required, forbidden, and conditional Resource/Channel tags are semantic constraints. Direction is source-to-object unless a row is explicitly unordered-symmetric. A reverse capability is a distinct edge for every directed row. K07, K45, and K46 use one unordered pair; semantic equality is independent of presentation order.

## 9. Producers, occurrences, closure, and event coverage

IsolationObservationUniverse is:

~~~
IsolationObservationUniverse = (
  exact PermissionEvaluationKey,
  ExactTenantContext,
  ParticipantSide,
  exact MeasurementTarget,
  exact SupportingController set,
  exact IsolationBoundary set and parent relation,
  exact PhysicalEnvironmentObservation set,
  exact PhysicalResidentSet,
  exact ResourceObject set,
  exact Channel set,
  exact K01-K49 relation set,
  closure state cut
)
~~~

It is one structural value. Every set uses mathematical set equality.

### 9.1 Producer classes and direct authority

ProducerClass is exactly one of:

| ProducerClass | Bounded direct-fact responsibility |
|---|---|
| runtime-lifecycle | runtime birth/end/continuity, lineage/incarnation, target membership, K01, K08-K16, and their change occurrences |
| boundary-state | boundary/controller topology and roles, boundary-owned resources/channels, K02-K04, and boundary-owned K17-K49 components assigned in Section 11 |
| environment-membership | physical environment observations, residents, co-residency, environment-owned resources, K05, and environment-owned relation components assigned in Section 11 |
| producer-lifecycle | producer enrollment; activation/incarnation; Q-independent ProducerIntrinsicCapabilityScope and mechanism lifecycle; separately Q-local ObservationScope; raw O09/O10 surface allocation and coupling-candidate cells; and the producer-identity component of K49; never the derived coupling, binding-currentness, or composite-path verdict |
| composite-correlator | deterministic structural composition only; never a direct factual source |
| self-observer | its own observation-only surface and lifecycle; never sole authority for identity, membership, control, closure, independence, or separation |

One producer may perform multiple classes only through distinct class-attributed assertions and complete class scopes. Conflicts are retained; there is no voting, preferred producer, newest-wins, or silent substitution.

An IAA may be colocated with a Producer, but the roles remain semantically distinct. Every concrete bootstrap source still requires its own ProducerIdentity, ProducerIncarnation, class/domain, frozen enrollment/source-enumeration occurrence, Q-independent lifecycle eligibility, and exact direct attribution. The IAA separately authors the bounded ProducerBindingContinuityMeasuredConclusion over the retained candidate-independent baseline and post-B evidence; it does not become any concrete source or underlying factual owner. Mere IAA status supplies no Producer/direct-owner/source property, direct fact, universe member, causality, freshness, or historical currentness.

The Q-scoped Producer population, surface/control model, and proposition-level independence floor are:

~~~
FrozenStageBProducerOccurrenceFamily(Q) =
  every ProducerIncarnation occurrence in the frozen H13EvaluationPopulation for Q that is:
    a candidate direct factual source for any DirectSemanticPropositionCoordinate at Q;
    a candidate event source for any RequiredEventSlot(Q);
    a Producer lifecycle, enrollment, class, scope, or source-enumeration candidate;
    a raw bootstrap-source-candidate Producer occurrence exposed by bounded source enumeration before any slot-specific BindingBootstrapSourceCoordinate is formed;
    a source or target participant of any raw K45 or K49 producer-related candidate cell;
    embedded by any O09 ProducerObservationSurface or O10 ProducerReportSurface used by Q;
    named as a source Producer by any raw AbsenceSourceControl measured-conclusion candidate at Q;
    a contributor to any ProducerClosureAssertion or raw technical-influence population at Q; or
    a late-discovered Producer occurrence added by bounded Stage-B source-domain expansion.

RelevantProducerSet(Q) =
  exact finite mathematical set of every ProducerIncarnation projected from
  FrozenStageBProducerOccurrenceFamily(Q)

ProducerControlCouplingPairSet(Q) = {
  unordered(A,B)
  |
  A in RelevantProducerSet(Q),
  B in RelevantProducerSet(Q),
  A != B
}

ProducerCouplingBaseGraph(Q) = (
  exact PermissionEvaluationCoordinate Q,
  exact frozen H13EvaluationPopulation projection for Q,
  exact RelevantProducerSet(Q),
  exact ProducerSourceSurfaceBinding occurrence family for every P in RelevantProducerSet(Q),
  exact ProducerSourceSurfaceBindingCurrentness occurrence family for every P,
  exact complete raw K45/K49/source-surface candidate-cell occurrence family over that set,
  exact absent-or-unresolved placeholder for every required candidate cell,
  exact complete finite candidate coupling-path population for every pair,
  exact source-enumeration boundary,
  result
)

coupling-base result = exact-complete | incomplete | contradictory

ProducerControlCouplingState = (
  exact PermissionEvaluationCoordinate Q,
  exact unordered(A,B) in ProducerControlCouplingPairSet(Q),
  exact ProducerCouplingBaseGraph(Q),
  exact A and B ProducerSourceSurfaceBinding values,
  exact A and B ProducerSourceSurfaceBindingCurrentness values,
  exact finite derived K45/K49/common-controller coupling-path result set,
  verdict
)

coupling verdict = coupled | not-coupled | indeterminate | contradictory

ProducerControlCouplingPopulation(Q) = (
  exact RelevantProducerSet(Q),
  exact ProducerControlCouplingPairSet(Q),
  exact ProducerCouplingBaseGraph(Q),
  exact ProducerControlCouplingState occurrence family,
  exact pair-to-state cardinality result,
  verdict
)

pair-to-state cardinality result =
  exact-one-to-one | missing | duplicate | injected | ambiguous

coupling-population verdict = complete | non-authorizing

DirectSemanticPropositionCoordinate = (
  exact PermissionEvaluationCoordinate,
  exact PermissionScopeKey,
  exact ProducerClass owning the direct fact,
  exact direct-source domain,
  exact ObservedStatement
)

DirectAbsenceCellCoordinate =
  subject-membership-cell(exact subject class, exact semantic subject, exact membership domain)
  | relation-edge-cell(exact RelationEdgeContent candidate coordinate)
  | producer-surface-cell(exact ProducerSourceSurfaceCoordinate)

DirectCellResult = (
  exact DirectAbsenceCellCoordinate,
  exact direct factual owner from the closed class/domain/source matrix,
  exact positive/negative DirectProducerFact occurrence family,
  exact SourceAttribution occurrence family including its source Producer and surfaces,
  result
)

direct-cell result = present | absent | unavailable | indeterminate | contradictory

DerivedInfluencePathCoordinate = (
  exact PermissionEvaluationCoordinate Q,
  purpose = threat-to-classified-producer | threat-to-absence-source | producer-coupling,
  exact semantic source,
  exact semantic sink ProducerSourceSurfaceCoordinate,
  exact finite nonempty ordered DirectAbsenceCellCoordinate sequence
)

DerivedInfluencePathResult = (
  exact DerivedInfluencePathCoordinate,
  exact DirectCellResult for every and only constituent cell,
  result
)

derived-path result = path-present | path-absent | indeterminate | contradictory

ProducerThreatControlDomain(Q) = (
  exact PermissionEvaluationCoordinate Q,
  exact MeasurementTargetRoot,
  exact RelevantProducerSet(Q),
  exact ProducerSourceSurfaceBinding occurrence family for RelevantProducerSet(Q),
  exact ProducerSourceSurfaceBindingCurrentness occurrence family for RelevantProducerSet(Q),
  exact finite raw target/runtime/controller/boundary/resource/subject candidate population,
  exact finite raw attributed known-type K01-K49 candidate-cell occurrence family,
  exact absent-or-unresolved placeholder for every required cell,
  exact finite direct-cell/derived-path occurrence family required by the least closure,
  exact deterministic least-closure threat-subject population,
  membership result
)

threat-domain membership result = exact-complete | incomplete | contradictory

AbsenceSourceThreatControlCoordinate = (
  exact PermissionEvaluationCoordinate Q,
  exact source ProducerIncarnation S
)

AbsenceSourceThreatControlDomain(Q,S) = (
  exact AbsenceSourceThreatControlCoordinate(Q,S),
  exact MeasurementTargetRoot and threat seed population,
  exact RelevantProducerSet(Q) and ProducerSourceSurfaceBinding occurrence family,
  exact ProducerSourceSurfaceBindingCurrentness occurrence family,
  exact complete raw target/control DirectCellResult population excluding every
    negative cell whose SourceAttribution names S,
  exact finite derived-path population formed only from those nonexcluded cells,
  exact absent-or-unresolved placeholder for every required nonexcluded cell,
  exact deterministic least-closure threat-subject population,
  membership result
)

ProducerIndependenceCoordinate = (
  exact DirectSemanticPropositionCoordinate,
  exact ProducerIncarnation being evaluated
)

ProducerInfluenceBaseGraph = (
  exact ProducerIndependenceCoordinate,
  exact ProducerThreatControlDomain(Q),
  exact ProducerSourceSurfaceBinding(Q,evaluated ProducerIncarnation),
  exact ProducerSourceSurfaceBindingCurrentness(Q,evaluated ProducerIncarnation),
  exact ProducerControlCouplingPopulation(Q),
  exact finite candidate influence-path coordinate population from every threat member
    to every O09/O10 surface of the evaluated ProducerIncarnation,
  exact DirectCellResult and DerivedInfluencePathResult occurrence families,
  exact raw source-enumeration boundary,
  population/cardinality/completeness/contradiction result
)

ProducerInfluenceThreatSet = (
  exact PermissionEvaluationCoordinate,
  exact DirectSemanticPropositionCoordinate,
  exact ProducerIncarnation being evaluated,
  exact ProducerThreatControlDomain(Q),
  exact ProducerInfluenceBaseGraph,
  exact finite threat-subject population equal to the domain population,
  exact finite candidate influence-path population,
  exact K49 path population,
  exact K45 common mutable observation/report resource population,
  exact ProducerControlCouplingPopulation(Q),
  membership-and-path-closure result,
  verdict
)

membership-and-path-closure result =
  exact-complete | incomplete | contradictory

threat-set verdict =
  influence-established | influence-absent | indeterminate | contradictory

AbsenceSourceControlCoordinate = (
  exact PermissionEvaluationCoordinate Q,
  exact source ProducerIncarnation S,
  exact AbsenceSourceThreatControlCoordinate(Q,S)
)

AbsenceSourceControlCoordinateSet(Q) = {
  (Q, S, AbsenceSourceThreatControlCoordinate(Q,S))
  |
  S in RelevantProducerSet(Q),
  S is named by at least one candidate negative DirectCellResult occurrence at Q
}

AbsenceSourceControlBaseGraph = (
  exact AbsenceSourceControlCoordinate,
  exact ProducerSourceSurfaceBinding(Q,S),
  exact ProducerSourceSurfaceBindingCurrentness(Q,S),
  exact finite candidate influence-path coordinate population from every member of
    AbsenceSourceThreatControlDomain(Q,S)
    to every O09/O10 surface of S,
  exact raw DirectCellResult population for those paths excluding every negative cell
    whose SourceAttribution names S,
  exact DerivedInfluencePathResult occurrence family derived only from the nonexcluded cells,
  exact source-enumeration boundary,
  result
)

source-control-base result = exact-complete | incomplete | contradictory

AbsenceSourceControlMeasuredConclusionContent = (
  exact AbsenceSourceControlCoordinate,
  exact AbsenceSourceControlBaseGraph,
  exact IsolationAttestationAuthorityIdentity named by the Stage-A-applicable permission,
  exact OrganizationIAARegistrationSubjectIdentity,
  exact OrganizationIAARegistrationRevisionIdentity,
  conclusion
)

source-control conclusion =
  source-outside-threat-control
  | source-inside-threat-control
  | indeterminate
  | contradictory

AbsenceSourceControlMeasuredConclusion = (
  exact AbsenceSourceControlMeasuredConclusionContent,
  exact IAA measured semantic state position,
  exact AuthoritativeSourceAttribution owned by the exact IsolationAttestationAuthorityIdentity
)

AbsenceSourceAdmissibility = (
  exact negative DirectProducerFact occurrence for one DirectAbsenceCellCoordinate,
  exact SourceAttribution naming source ProducerIncarnation S and its O09/O10 surfaces,
  exact AbsenceSourceControlMeasuredConclusion for (Q,S),
  exact source-control-currentness assertion,
  exact classified ProducerIncarnation P,
  verdict
)

absence-source verdict = admissible | ineligible | indeterminate | contradictory

TechnicalInfluenceEvidencePopulation = (
  exact ProducerIndependenceCoordinate,
  exact ProducerInfluenceThreatSet,
  exact finite raw attributed DirectCellResult population,
  exact finite DerivedInfluencePathResult population,
  exact finite raw attributed K45/K49/control-coupling evidence population,
  exact AbsenceSourceAdmissibility occurrence family for every negative cell used,
  exact admissible negative direct-cell source occurrence set,
  exact direct-source enumeration boundary,
  technical-evidence result
)

technical-evidence result =
  exact-complete-coherent | incomplete | contradictory

ProducerIndependenceMeasuredConclusionContent = (
  exact PermissionEvaluationCoordinate,
  exact DirectSemanticPropositionCoordinate,
  exact ProducerIncarnation being evaluated,
  exact complete TechnicalInfluenceEvidencePopulation,
  exact ProducerInfluenceThreatSet membership/path verdict,
  exact K45/K49/control-coupling conclusion,
  exact IsolationAttestationAuthorityIdentity named by the Stage-A-applicable permission,
  exact OrganizationIAARegistrationSubjectIdentity,
  exact OrganizationIAARegistrationRevisionIdentity,
  conclusion
)

conclusion = outside-control | inside-control | indeterminate | contradictory

ProducerIndependenceMeasuredConclusion = (
  exact ProducerIndependenceMeasuredConclusionContent,
  exact IAA measured semantic state position,
  exact AuthoritativeSourceAttribution owned by the exact IsolationAttestationAuthorityIdentity
)

PropositionDirectSourceCoverage = (
  exact DirectSemanticPropositionCoordinate,
  exact required candidate direct factual source occurrence family whose class/domain owns the proposition,
  exact ProducerIndependenceMeasuredConclusion occurrence family for those candidate ProducerIncarnations,
  exact producer-independence-currentness assertion occurrence family,
  exact current outside-control eligible direct factual source subset,
  exact source-to-conclusion cardinality result,
  verdict
)

source-to-conclusion cardinality result =
  exact-one-per-source | missing | duplicate | injected | ambiguous

verdict =
  independently-covered
  | influence-threat-only
  | unavailable
  | indeterminate
  | contradictory
~~~

RelevantProducerSet(Q) is derived only after H13EvaluationPopulation is frozen. Every listed occurrence branch is inclusive and verdict-independent; no offered ProducerControlCouplingState or pair can add its own endpoint to the set. Consequently a Producer appearing only in an injected pair remains outside the set, while a late-discovered bounded source-domain Producer is present in the same final set in every discovery order. For n set members, ProducerControlCouplingPairSet contains exactly n(n-1)/2 unordered pairs; three Producers yield exactly three pairs and zero or one Producer yields the exact empty pair set.

ProducerCouplingBaseGraph(Q) is exact-complete only when every RelevantProducerSet member has one exact-complete ProducerSourceSurfaceBinding whose currentness is current, every K45/K49/source-surface cell and explicit absent/unresolved placeholder over the complete set is represented exactly once, and every pair's finite candidate path population is complete. For each unordered pair, candidate coupling paths include A-to-B and B-to-A direct or transitive K49 paths to either Producer's current O09/O10 surfaces, a common third subject with qualifying paths to both, and every K45 common mutable observation/report resource through which either can alter the other's observation or report. ProducerControlCouplingState is coupled when any such path is path-present; it is not-coupled only when the base graph and both bindings/currentness values are exact/current and every candidate coupling path is path-absent. Missing, stale, or invalidated bindings/cells or unresolved paths yield indeterminate; incompatible facts yield contradictory. K46 alone never couples a pair unless Section 11.3 deterministically promotes its facts to K45, K49, or another qualifying influence path.

ProducerControlCouplingPopulation is complete exactly when its pair set is the full formula above, its state occurrence family contains exactly one state for every pair and none outside it, every state names Q and the same ProducerCouplingBaseGraph(Q), and pair-to-state cardinality is exact-one-to-one. A missing/equal-duplicate/unequal-duplicate pair state, omitted event-only/K49-only/late Producer, or injected pair is non-authorizing and remains visible to provenance, reason, and completeness evaluation. No proposition support, Producer result, failure outcome, discovery order, provider, IAA, configuration, or implementation can filter the set or pair population.

DerivedInfluencePathCoordinate is generated for every finite simple path admitted by the complete raw graph from its exact source to its exact sink. “Simple” means no repeated semantic vertex; it loses no reachability and keeps the population finite. Each constituent direct membership, relation-edge, or surface cell retains its Section 9/11 direct factual owner and SourceAttribution. A DerivedInfluencePathResult is contradictory if any constituent cell is contradictory; path-present exactly when every constituent cell is present; path-absent exactly when every constituent cell is resolved noncontradictory and at least one is absent; otherwise it is indeterminate. The composite result has no Producer, SourceAttribution, or direct factual owner of its own and cannot turn a comparison or correlator into an absence source.

ProducerThreatControlDomain(Q) membership is one deterministic least finite closure. Its seeds are every raw S01 target-runtime candidate tied to MeasurementTargetRoot by K01, every raw S09 boundary enclosing such a runtime or reached through zero or more K03 parent edges, and every raw S02 controller having K04 to one of those boundaries with its exact role-defining edge population. At each step add every S01-S12 subject joined to an existing member by K06 or by a directed K08-K45 or K47-K49 capability when the candidate can act on the member or its boundary/resource/channel/surface, or the member can technically control, configure, invoke, mutate, select, substitute, or act through the candidate or its attached surface. K45 is traversable in either direction through its exact common mutable ResourceObject. K01-K05 supply only their stated seed/join meanings; K46 supplies neither a seed nor a closure step. Repeat until no member is added. The finite monotone closure is unique and traversal-order-independent.

The threat-domain membership result is exact-complete only when every required raw candidate and matrix placeholder is present exactly once, every consumed Producer surface binding is current, and every seed/closure step resolves. It is derived directly from Q's frozen RelevantProducerSet/current surface bindings and raw target/control cells and paths; it has no ProducerControlCouplingState result dependency, so a pair-state absence cannot establish source safety. The P-specific candidate influence-path population is every finite simple K06/K08-K45/K47-K49 path from every exact domain member to every current O09/O10 surface in the evaluated Producer's exact binding. It includes direct/transitive K49, K45 mutable resources, and separately consumes the exact Q-scoped coupling population. K46-only sharing never enters; a Section 11.3 promotion participates normally. Missing/ambiguous/stale/invalidated surface binding, unknown membership, missing cell, unresolved path, incomplete coupling population, or incomplete enumeration makes the applicable result incomplete/indeterminate. Incompatible evidence is contradictory. Provider identity, operator name, deployment relation, process ancestry, configuration, source self-claim, IAA-selected traversal, or implementation-selected filtering contributes no membership, path, or verdict.

AbsenceSourceThreatControlDomain(Q,S) uses the same closed seeds and least-closure rule but is a distinct source-relative structural projection. Every negative DirectCellResult whose SourceAttribution names S is excluded before closure; it remains in the frozen audit/inventory population but cannot establish nonmembership, a missing edge, or a path absence in S's own source-control proof. Positive S-sourced cells remain visible and may establish source-inside-threat-control. The source-relative membership result is exact-complete only when every required nonexcluded cell and path resolves; if excluding an S-sourced negative leaves a required cell unresolved, the result is incomplete, never outside-control. It consumes no ProducerControlCouplingState, AbsenceSourceControlMeasuredConclusion, AbsenceSourceAdmissibility, or P-specific conclusion. Thus two implementations derive the same source-relative domain from Q, S, and the frozen raw population without trusting S's negative claim.

A path-absence statement is never a magically Producer-owned primitive. Direct negative subject-membership, edge, and surface cells are ObservedStatement values with the exact closed direct factual owner and a SourceAttribution naming the source Producer and its exact O09/O10 binding projections. Derived path absence follows only from the complete constituent DirectCellResult set. Thus the source of every negative primitive is explicit while the composite path result remains deterministic and ownerless.

AbsenceSourceControlMeasuredConclusion is the nonrecursive positive measured-fact anchor for whether the exact source-relative target/threat domain can influence a secondary negative-evidence Producer S. Its content is source-inside-threat-control when S belongs to AbsenceSourceThreatControlDomain(Q,S) or any candidate path from that domain to S's own bound O09/O10 surfaces is path-present. It is source-outside-threat-control only when AbsenceSourceThreatControlDomain(Q,S), S's binding, AbsenceSourceControlBaseGraph, every candidate path, and the source boundary are exact-complete; S is outside the source-relative domain; every candidate path is path-absent using only nonexcluded constituent cells; and the exact applicable IAA authors the content under Q's exact profile/registration scope. Every negative primitive whose SourceAttribution names S is retained audit-only and forbidden from the source-control derivation, so S cannot prove its own control-independence. No constituent negative cell is recursively required to possess AbsenceSourceAdmissibility inside this base graph; the exact IAA conclusion is the bounded positive anchor. A missing or ambiguous binding, incomplete domain, missing qualified nonexcluded cell, or unresolved path yields indeterminate; a conflicting binding/path/evidence population yields contradictory. Present use additionally requires the conclusion's exact H-13 MeasuredConclusionUseFreshness and H-11-realized authoritative-current HistoricalCurrentnessQualification.

The source-control conclusion has no dependency on any negative DirectProducerFact sourced by S, including every statement it qualifies; any ProducerControlCouplingState result; the general ProducerThreatControlDomain(Q) verdict; the classified P-specific ProducerInfluenceThreatSet; AbsenceSourceAdmissibility; PropositionDirectSourceCoverage; DirectProducerFactEligibility; ObservationOccurrence; ProducerClosureAssertion; CombinedClosure; RuntimeCorrespondence; F; reason; or result. It consumes only AbsenceSourceThreatControlDomain(Q,S), S's binding, complete nonexcluded raw constituent cell population, and exact IAA scope. The presence of a candidate negative occurrence generates the required (Q,S) question coordinate from source identity metadata only; neither that occurrence's asserted absence nor its truth value feeds conclusion content. Excluded S-sourced negative candidates remain independent audit/inventory members but are not dependencies of this conclusion. This makes the exact IAA—not S, another Producer, a pair-state absence, or a recursive source-admissibility claim—the bounded positive anchor. It gives the IAA no generic authority over arbitrary Producer facts.

AbsenceSourceAdmissibility is admissible exactly when the negative primitive is attributed-authentic to its exact direct factual owner through source Producer S and current bound surfaces; S is unequal to classified Producer P; S's S05 producer-subject is outside AbsenceSourceThreatControlDomain(Q,S); exactly one IAA-authored AbsenceSourceControlMeasuredConclusion says source-outside-threat-control; its fixed H-13 freshness is fresh-for-exact-cut; and its HistoricalCurrentnessQualification is authoritative-current. source-inside-threat-control, S=P, S inside the source-relative threat domain, or noncurrent binding is ineligible. Missing/ambiguous binding or binding currentness, missing conclusion/currentness, or unresolved source-control path is indeterminate. Conflicting source, binding, path, conclusion, freshness, or history is contradictory. A provider/IAA label or S's self-claim supplies none of these conditions.

TechnicalInfluenceEvidencePopulation is exact-complete-coherent only when the threat/coupling/surface populations and direct-source boundary are exact; every required DirectCellResult and DerivedInfluencePathResult occurs exactly once; every candidate threat-to-P path is path-absent; the exact set of admissible negative constituent cells for each path is nonempty; every negative cell and ineligible candidate remains visible; and no retained evidence conflicts. A different Producer Q whose O09/O10 surface is reachable by K49, K45, or an indirect controller/resource path is ineligible even if Q != P and Q reports no threat-to-P path. Ineligible-only negative cells, a path with no admissible absent constituent, or any incomplete source-control qualification makes the technical result incomplete; incompatible evidence makes it contradictory.

Only the exact IAA named by the applicable permission authors ProducerIndependenceMeasuredConclusion as a profile-governed measured isolation fact about the exact permission-bound domain's ability to influence Producer P. The content is outside-control only when the Q-scoped Producer/coupling populations, P binding, threat set, every derived path, every source-control qualification, and TechnicalInfluenceEvidencePopulation are exact-complete-coherent and every candidate path is absent through at least one admissibly sourced negative constituent. The classified P and every threat-domain member remain forbidden as sole absence sources. That content becomes positive authorization evidence only after its independent fixed H-13 freshness and H-11-realized authoritative-current qualification pass. Any qualifying K49/K45/control/coupling path yields inside-control; incomplete evidence yields indeterminate; conflicts yield contradictory.

The Producer being classified may contribute positive observations, but no self or threat-controlled negative assertion can bootstrap its own independence. Each AbsenceSourceThreatControlDomain precedes its source-control conclusion without consuming that source's negative facts or pair-state results. ProducerThreatControlDomain and ProducerControlCouplingPopulation are independently derived from the Q-scoped raw graph; both precede the P-specific threat/evidence chain. Source-control conclusions precede AbsenceSourceAdmissibility; admissibility precedes TechnicalInfluenceEvidencePopulation; and only then is ProducerIndependenceMeasuredConclusion authored. None depends on PropositionDirectSourceCoverage or downstream eligibility. This is the one acyclic measured-fact architecture.

Each IAA wrapper carries exact content-source attribution and equality of content/conclusion/attribution positions. The IAA authors content but cannot establish its freshness or historical currentness; H-13 derives freshness and H-11 later realizes HistoricalCurrentnessQualification. Trust may verify evidence/attribution but creates no conclusion, independence truth, source-control truth, currentness, permission, Connection authority, or action authority.

For every required direct semantic proposition, PropositionDirectSourceCoverage is independently-covered exactly when its raw source, ProducerSourceSurfaceBinding, IAA conclusion, H-13 freshness, and HistoricalCurrentnessQualification occurrence families are exact; at least one class/domain-owning source has an outside-control conclusion with authoritative-current history; every assertion remains attributed and conflict-visible; and no eligible outside-control conclusion conflicts. Inside-control contributors may coexist but do not cure the positive floor. A composite-correlator, comparison-only contributor, detector, ineligible absence source, self-observer outside its narrow domain, or Producer that does not own the direct-source domain cannot count. Inside-control, indeterminate, contradictory, unavailable, stale, or historically noncurrent conclusions cannot count. Every downstream fact/occurrence/closure/F consumer accepts only independently-covered propositions. No closure-level substitute or implementation-selected sampling exists.

DirectProducerFactEligibility is the deterministic relation:

~~~
DirectProducerFactEligibility = (
  exact DirectProducerFact coordinate and value,
  exact matching DirectSemanticPropositionCoordinate,
  exact matching PropositionDirectSourceCoverage,
  exact direct-owner/class/domain equality result,
  exact current attributed-authentic result,
  verdict
)

verdict = eligible | ineligible
~~~

It is eligible exactly when the fact's proposition coordinate is equal, its ProducerClass/direct-source-domain is the exact Section 11 direct factual owner, its source occurrence is attributed-authentic, the matching ProducerIndependenceMeasuredConclusion has H-13-fresh and H-11-qualified authoritative-current status, and the matching coverage verdict is independently-covered. Raw threat-set/technical-influence evidence feeds the IAA conclusion; that conclusion, H-13 freshness, and H-11-realized historical qualification feed coverage; only then is eligibility derived. Eligibility never feeds the threat set, IAA conclusion, or coverage. ProducerClosureAssertion and every downstream consumer accept only eligible facts while retaining all ineligible/conflicting candidates for triggers and provenance.

This decision trusts an exact registered, H-11-qualified authoritative-current IAA conclusion as the bounded measured-fact authority for this nonrecursive relation. Compromise, malicious measurement, dishonest absence evaluation, or evidence suppression by that IAA is an accepted and acknowledged residual requiring later H-10/H-11 trust, evidence, deployment, and historical controls; a future stricter profile may require stronger independence evidence. Acceptance acknowledges this residual; it does not claim that the risk is solved.

### 9.2 Abstract source attribution and authenticity

SourceAttribution is the structural assertion:

~~~
SourceAttribution = (
  exact asserted semantic value,
  exact ProducerIdentity and ProducerIncarnation,
  exact ProducerClass,
  exact direct-source domain,
  exact ObservationScope,
  exact nonempty ProducerObservationSurface subset used to acquire the value,
  exact nonempty ProducerReportSurface subset used to emit the value,
  exact ProducerSourceSurfaceBinding projection containing both subsets,
  exact ProducerSourceSurfaceBindingCurrentness projection,
  attribution verdict
)

attribution verdict =
  attributed-authentic
  | unavailable
  | indeterminate
  | contradictory
~~~

Attributed-authentic means the ordinary semantic value was produced by that exact eligible source in that exact scope without substitution or alteration; the binding is exact-complete, its candidate-independent BindingBaselineUniverse is exact-complete, every required concrete bootstrap source population is complete-enumerated, its ProducerSourceSurfaceBindingBaseline is exact-coherent at B, and its ProducerSourceSurfaceBindingCurrentness verdict is literally current at AuthorityUseCut. Every carried O09/O10 surface embeds the same current ProducerIncarnation; both subsets are contained in that binding; and no other Producer owns any carried surface. invalidated, noncurrent, unavailable, indeterminate, or contradictory never means current. A missing/ambiguous/substituted/contradictory/noncurrent source, universe, binding, baseline, or surface projection cannot be attributed-authentic. Ordinary SourceAttribution is downstream and cannot create or repair BindingBootstrapSourceCoordinate or either bootstrap direct attribution. Only attributed-authentic may support a pass. H-10 later owns cryptographic realization; H-11 later realizes event/history/time evidence without choosing currentness semantics.

For an object that contains SourceAttribution, asserted semantic value means that object's complete semantic content with the SourceAttribution field omitted. This prevents recursive self-attribution while leaving every sourced component exact.

### 9.3 ObservationScope and ObservationOccurrence

ObservationScope is:

~~~
ScopePurpose =
  closure(exact ClosureKind)
  | event(exact EventFamily)
  | direct-fact(exact direct-source domain)

ObservationScope = (
  exact PermissionScopeKey,
  exact ScopePurpose,
  exact EnumerationDomain,
  exact finite root set,
  exact finite included surface set,
  exact exclusion boundary,
  exact direct-source domain,
  closure state cut
)
~~~

Every root and surface is explicit. A producer-selected sub-root, inaccessible partition, implicit filter, open selector, omitted source shard, or unbounded boundary cannot support completeness.

OccurrenceMode is exactly point, bounded-interval, or continuous-series.

ObservedStatement is the closed tagged union:

~~~
ObservedStatement =
  positive-direct-fact(exact direct-domain semantic fact with wrappers omitted)
  | negative-direct-cell(exact DirectAbsenceCellCoordinate)
~~~

For a positive relation fact, the carried value is RelationEdgeContent; for positive identity/membership/state it is the corresponding exact proposition. A negative-direct-cell asserts only that the exact closed subject-membership, candidate relation-edge, or Producer-surface cell is absent under the direct factual owner named by its coordinate. Composite path absence is never an ObservedStatement and has no direct Producer owner; it is only DerivedInfluencePathResult. ObservedStatement never contains ObservationOccurrence, ProducerClosureAssertion, SourceAttribution, a derived path, or a reference to itself.

ObservationOccurrenceCoordinate is:

~~~
ObservationOccurrenceCoordinate = (
  exact ProducerIncarnation,
  exact ProducerClass,
  exact ObservationScope,
  OccurrenceMode,
  exact semantic observation position or interval
)

ObservationOccurrence = (
  exact ObservationOccurrenceCoordinate,
  exact observed semantic statement set,
  exact SourceAttribution,
  lifecycle state
)
~~~

ObservationOccurrenceCoordinate has structural semantic identity/equality and no allocated identity. The full occurrence has structural equality. Its observation position/interval participates in Section 14's semantic order. A bounded interval asserts the statement set throughout that interval. A continuous series asserts the exact closed series of state positions and requires continuous event coverage. Only a current, attributed-authentic occurrence in the exact scope may support current use.

### 9.4 ProducerClosureAssertion

ClosureKind is exactly:

1. runtime-members
2. supporting-controllers-and-boundaries
3. physical-residents-and-environments
4. resources-and-channels
5. relation-edges

ProducerClosureCoordinate is:

~~~
ProducerClosureCoordinate = (
  ClosureKind,
  exact ObservationScope,
  exact ProducerIncarnation and ProducerClass,
  exact direct-source domain,
  exact ObservationOccurrenceCoordinate
)

ProducerClosureAssertion = (
  exact ProducerClosureCoordinate,
  exact finite closed semantic member/edge set,
  exact ObservationOccurrence,
  exact DirectProducerFactEligibility set for every asserted direct fact,
  exact PropositionDirectSourceCoverage set for every asserted required direct proposition,
  completeness verdict,
  exact exclusion conclusions
)

completeness verdict =
  complete | partial | unknown | contradictory
~~~

Complete means the asserted set equals every subject, object, or relation of that ClosureKind in the exact scope at the closure state cut, every asserted direct fact's DirectProducerFactEligibility is eligible, and every asserted required direct proposition has exactly one independently-covered PropositionDirectSourceCoverage. Merely listing observed values is not completeness. Set equality is unordered semantic set equality.

ResourceOwnerDomain is the structural conclusion:

~~~
ResourceOwnerDomain = (
  exact ResourceObject,
  owner = boundary-owned | environment-owned,
  exact creation/attachment/enumeration source domain,
  exact complete ownership SourceAttribution set,
  verdict
)

verdict = resolved | unknown | contradictory
~~~

Boundary-owned means boundary-state is the direct source for the resource's complete creation, attachment, state, and removal domain. Environment-owned means environment-membership is that direct source for a physical/environment allocation domain. Exactly one branch must be resolved. Competing branches are contradictory; missing completeness is unknown.

Every ObservationOccurrenceCoordinate and ProducerClosureCoordinate in an evaluation must resolve to exactly one full ObservationOccurrence or ProducerClosureAssertion with that coordinate. Missing resolution is incomplete; more than one unequal full value for one coordinate is contradictory. Coordinates are semantic structure, not allocated IDs, representations, or commitment carriers.

The mandatory extent is:

| ClosureKind | Roots and mandatory extent |
|---|---|
| runtime-members | every candidate lineage/incarnation and every runtime birth/end/membership fact in the lifecycle source domain |
| supporting-controllers-and-boundaries | every target; transitive K02/K03 ancestry; every K04 source; every controller/source whose K08-K19, K31, K35, K47-K49 path can affect a relevant target, boundary, resource, channel, observation, or report |
| physical-residents-and-environments | every environment observation containing a target/controller; every resident; every environment-owned resource; K05, K45, and K46 in those source domains |
| resources-and-channels | union of target/controller/boundary/environment roots; every attached or reachable ResourceObject and Channel under K06/K07/K18/K19 and every type needed by K20-K49 |
| relation-edges | every received edge plus every ordered source/object direction admitted by the exact Section 11 type-signature row over the closed finite source/object universe; unordered rows use their one structural pair |

### 9.5 CombinedClosure and direct-source preservation

ClosureConflict is the structural tuple of exact competing source coordinates, exact semantic proposition, and exact unequal/contradictory values. ClosureCoverageConclusion is:

~~~
ClosureCoverageConclusion = (
  exact ObservationScope,
  exact required root/surface set,
  exact covered root/surface set,
  exact missing set,
  verdict
)

verdict = complete | partial | unknown | contradictory
~~~

CombinedClosure is:

~~~
CombinedClosure = (
  ClosureKind,
  exact PermissionScopeKey,
  exact required ProducerClass attribution set,
  exact finite ProducerClosureAssertion set,
  exact mathematical set union,
  exact ClosureConflict set,
  exact ClosureCoverageConclusion,
  exact PropositionDirectSourceCoverage set,
  verdict
)

verdict = complete | partial | unknown | contradictory
~~~

The composite-correlator originates no fact. CombinedClosure is local to one nonrecursive PermissionScopeKey. Its roots may include MeasurementTargetRoot and its exact runtime members, but never MeasurementTarget or MembershipEpoch; the completed five CombinedClosure values are themselves the components from which MembershipEpoch and then MeasurementTarget are constructed. CombinedClosure is complete exactly when:

1. every required direct-source domain has one current attributed-authentic complete assertion;
2. every optional contributor is exact, attributed, and current;
3. every contributor is already in the exact PermissionScopeKey's local IAA/source namespace and no cross-IAA equivalence is used to rewrite or reconcile a closure member;
4. the mathematical union covers every mandatory root and surface;
5. the conflict set is empty;
6. no contributor replaces, negates, or suppresses a direct-source fact;
7. every repeated H-02 component is projection-coherent; and
8. every required direct proposition in the mandatory extent and union has exactly one independently-covered PropositionDirectSourceCoverage.

Unequal-context detector evidence, IAAContextLocalSeparationConclusion, F04, RuntimeCorrespondence, PermissionEvaluationKey, MeasurementTarget, and MembershipEpoch are not CombinedClosure inputs. Cross-side separation is evaluated only after both sides' local closures and targets exist. This removes any closure-to-target or closure-to-detector recursion.

Assertions for different source domains compose by mathematical union. Two assertions claiming the same exact direct-source domain must have semantically equal asserted sets, scopes, occurrences, and attribution; otherwise the closure is contradictory. No representation equality is required.

| ClosureKind | Required direct ProducerClass | Permitted contributors | Authority boundary |
|---|---|---|---|
| runtime-members | runtime-lifecycle | boundary-state, environment-membership | only runtime-lifecycle decides K01 and runtime lifecycle |
| supporting-controllers-and-boundaries | boundary-state | runtime-lifecycle, environment-membership | only boundary-state decides K02-K04, controller membership, and roles |
| physical-residents-and-environments | environment-membership | boundary-state | only environment-membership decides K05 and physical residency |
| resources-and-channels | boundary-state plus environment-membership for each environment-owned object | runtime-lifecycle | exact owner domain decides identity and attachment |
| relation-edges | every class assigned by Section 11 | other factual Producers | each edge retains its exact row-specific direct assertion |

K01 always comes from runtime-lifecycle. K49 exists only when producer-lifecycle supplies the producer identity/lifecycle component and boundary-state or environment-membership, according to object ownership, supplies the technical alteration-path component. Neither component alone is K49.

### 9.6 Closed producer event-family meaning

Producer event coverage contains exactly E01-E17:

| EventFamily | Exact change meaning | Required direct ProducerClass |
|---|---|---|
| E01 runtime-birth-end-restart-or-replacement | target runtime/incarnation or runtime membership stream | runtime-lifecycle |
| E02 runtime-clone | source runtime and any concurrent state-derived successor | runtime-lifecycle |
| E03 runtime-snapshot-or-restore | source runtime, restored runtime, and affected lineage/incarnation | runtime-lifecycle |
| E04 runtime-migration-or-host-movement | runtime plus old/new environment residency | runtime-lifecycle and environment-membership |
| E05 runtime-member-addition-or-removal | exact target runtime set and K01 | runtime-lifecycle; environment-membership also when K05 changes |
| E06 boundary-birth-end-parent-role-or-recreation | boundary, K02-K04, controller incarnation, and role set | boundary-state |
| E07 control-path-or-privilege-change | K08-K19, K31, K35, K47-K49, controller roles, privilege configuration, and any control-path change reaching an O09/O10 surface or its mechanism | each direct owner named by Section 11 |
| E08 memory-or-ipc-relation-change | K20-K24 and referenced resources/channels | boundary-state; environment-membership for environment-owned objects |
| E09 storage-relation-change | K25-K27/K45 storage edges and objects | boundary-state or environment-membership by owner |
| E10 network-relation-or-policy-change | K28-K31, endpoints, gates, policies, and Channels | boundary-state; environment-membership for environment-owned objects |
| E11 device-or-resource-relation-change | K06/K19/K32-K35/K45/K46 and their objects, including acquisition/emission resources used by an O09/O10 surface | boundary-state or environment-membership by owner |
| E12 namespace-or-environment-relation-change | K36-K39/K45 and namespace/environment objects | boundary-state or environment-membership by owner |
| E13 debug-introspection-or-instrumentation-change | K40-K44 and management/telemetry objects | boundary-state |
| E14 isolation-configuration-change | every mutable configuration value capable of changing F01-F16, Producer observation/report mechanism selection, O09/O10 routing, or ProducerSourceSurfaceBinding membership | boundary-state, environment-membership, or producer-lifecycle by exact owner |
| E15 resource-channel-or-gate-attachment-change | resource/channel sets, gates, endpoints, K06/K07/K18/K19/K47/K48, and every O09 acquisition or O10 emission attachment/add/remove/replacement | boundary-state; environment-membership for physical ownership/residency; producer-lifecycle for surface allocation |
| E16 environment-resident-co-residency-or-capacity-change | environments, residents, K05, K45, and K46 | environment-membership |
| E17 producer-lifecycle-mechanism-coupling-or-scope-change | ProducerIdentity/Incarnation/activation; Q-independent intrinsic capability binding; observation/report mechanism birth/end/replacement; Q-local ObservationScope add/remove/change; O09/O10 allocation/add/remove/replacement; ProducerSourceSurfaceCoordinate lineage/allocation; ProducerSourceSurfaceBinding membership; and producer-related K45/K49 state | producer-lifecycle for intrinsic lifecycle, capability, and surface allocation; exact owner source for each scope/technical/resource/channel relation |

H-02 permission/currentness, H-07 Connection currentness, and IAA measured-conclusion currentness are not Producer events. E07/E11/E14/E15/E17 overlap only when one real change satisfies more than one exact row; every applicable family occurrence is retained, ordered at the same semantic position when simultaneous, and none substitutes for another.

EventOccurrence is the structural value:

~~~
EventOccurrence = (
  EventFamily,
  exact affected semantic subject/object/relation set,
  exact before-state and after-state when the event changes state,
  exact ObservationScope,
  exact ProducerIncarnation and ProducerClass,
  exact semantic event position,
  exact SourceAttribution
)
~~~

Birth has absent before-state. End has absent after-state. A continuity-changing event identifies exact before/after subjects and complete concurrency meaning, but H-13 prescribes no history-record linkage. This canonical EventOccurrence is an ordinary downstream attributed object and never a BindingLifecycleObservation. ProducerIntrinsicContinuity, at producer-lifecycle scope and without this ordinary occurrence as an immediate dependency, decides whether an intrinsic E17 transition ends/replaces ProducerIncarnation. A purely Q-local scope, relational, attachment, allocation, or topology E07/E11/E14/E15/E17 occurrence retains the incarnation when intrinsic continuity remains continuous, while invalidating the old surface binding and all dependent Q-local evidence. A genuine activation restart or continuing-capability mechanism replacement creates one new incarnation at that transition position consistently across every affected Q.

PermissionEventRequirementSlot closes permission, class, domain, scope, interval, and the one catalogue-fixed source-composition policy before evidence is considered. It never selects one Producer:

~~~
PermissionEventRequirementSlot = (
  exact PermissionEvaluationCoordinate,
  exact PermissionScopeKey,
  EventFamily,
  exact required ProducerClass,
  exact direct-source domain,
  exact ObservationScope whose ScopePurpose is event(EventFamily),
  exact semantic interval (ClosureStateCut, AuthorityUseCut],
  EventSourceCompositionPolicy = independently-complete-source
)

EventSourceCompositionPolicy =
  independently-complete-source

EventCoverageAssertionCoordinate = (
  exact PermissionEventRequirementSlot,
  exact candidate ProducerIncarnation whose class/domain/scope owns that slot
)

EventCoverageAssertion = (
  exact EventCoverageAssertionCoordinate,
  exact finite EventOccurrence set,
  exact unique semantic order relation over that set,
  CoverageVerdict,
  exact SourceAttribution,
  historical-resolvability verdict
)

CoverageVerdict =
  continuous-complete
  | gap
  | missing
  | duplicate
  | injected
  | wrong-permission
  | wrong-side
  | wrong-domain
  | unattributed
  | unknown
  | contradictory

historical-resolvability verdict =
  uniquely-resolvable | unresolvable | contradictory

EventRequirementSourcePopulation = (
  exact PermissionEventRequirementSlot,
  exact finite candidate ProducerIncarnation set whose class/domain/scope owns the slot,
  exact IAA-authored ProducerIndependenceMeasuredConclusion per candidate,
  exact producer-independence-currentness assertion per candidate,
  exact EventCoverageAssertion occurrence family over every candidate,
  exact source cardinality/consistency result,
  verdict
)

source cardinality/consistency result =
  exact-complete-consistent
  | missing-candidate
  | duplicate-candidate-assertion
  | injected-candidate
  | unresolved-candidate
  | eligible-assertion-conflict
  | unknown-or-malformed-policy

verdict = continuous-complete | gap | unavailable | indeterminate | contradictory
~~~

For each candidate, EventCoverageAssertion is continuous-complete only when that exact candidate observed every position in the interval without a positive gap, every event has one unique order position, all same-position events are represented as an explicit concurrent set, the occurrence set is complete, and the assertion is attributed-authentic. An empty occurrence set proves absence only under continuous-complete coverage of the whole interval.

EventRequirementSourcePopulation contains every and only finite Producer candidate whose class, direct-source domain, permission scope, ObservationScope, and interval own the slot; every such candidate is independently included in RelevantProducerSet(Q), its source-surface binding, and the Q all-pairs coupling population. It retains every candidate, assertion occurrence, attribution, qualification, and conflict; there is no preferred, newest, first, primary, winner, singular resolving Producer, or policy-selection input. Multiple valid Producers are distinct corroborating candidates, not duplicate assertions.

For every E01-E17 PermissionEventRequirementSlot in each of the three initial profiles, independently-complete-source is the only recognized policy token and the only semantic branch. No implementation, provider, deployment, runtime, Producer, IAA, configuration, local policy, evidence content, source count, or source order may select or request another composition rule. A received absent, malformed, obsolete, or future policy token is unknown-required-h13-semantics: it sets unknown-or-malformed-policy, emits reason 031 and reason 025 at the affected permission, and is non-authorizing.

The population is continuous-complete exactly when: its complete candidate Producer population is enumerated; the source cardinality/consistency result is exact-complete-consistent; RelevantProducerSet/surface/coupling populations are complete; and at least one exact candidate has an exact IAA-authored outside-control ProducerIndependenceMeasuredConclusion whose secondary negative sources are admissible, whose fixed MeasuredConclusionUseFreshness is fresh-for-exact-cut, and whose HistoricalCurrentnessQualification is authoritative-current. That same candidate's own assertion is continuous-complete across the entire slot interval and direct-source domain; every candidate/assertion remains visible; and no eligible assertion conflict exists. Inside-control, secondary-controlled, indeterminate, stale, historically noncurrent, unavailable, or partial candidates create no positive coverage. Multiple consistent complete eligible candidates corroborate and do not become duplicate assertions. One complete eligible candidate plus any number of consistent partial corroborators passes. Partial intervals or domains from different candidates are never unioned to manufacture complete coverage.

Distributed or partitioned collective event sourcing is outside the initial accepted semantic vocabulary. Introducing it requires a new separately reviewed H-13 profile or semantic decision that closes exact partition-domain identity/equality, allocation and source authority, exhaustive partition rules, the candidate-to-partition relation, order and consistency semantics, conflict handling, lifecycle, and provenance. Until then every collective-mode request is merely an unknown input and cannot change this policy.

For every ordinary slot, the exact continuous-coverage statement and every canonical EventOccurrence before/after statement are required DirectSemanticPropositionCoordinate values owned by the slot's ProducerClass/direct-source domain. Each candidate's eligibility uses its exact literal-current ProducerSourceSurfaceBindingCurrentness, full Q coupling population, exact-complete ProducerInfluenceThreatSet/TechnicalInfluenceEvidencePopulation, admissible secondary negative sources, and IAA-authored Producer-independence conclusion with fixed H-13 freshness and authoritative-current history. An ordinary event assertion never supplies its own baseline, binding currentness, independence, source-control qualification, freshness, or history. BindingBaselineOwnerObservation, BindingLifecycleObservation, and BindingLifecycleCoverageStatement are separate owner-preserving bootstrap types in Section 6.3 and are not DirectSemanticPropositionCoordinate, EventOccurrence, EventCoverageAssertion, or EventRequirementSourcePopulation values. Thus a stale-surface or threat-controlled monitor, comparison-only enumerator, or gapless ordinary series with an unsafe negative-evidence source cannot prove either an ordinary event or its absence, and no ordinary assertion can authenticate itself by feeding binding baseline/currentness.

BindingAffectingEventFamilies = {E07,E11,E14,E15,E17}. For one exact ordinary EventOccurrence e, AffectedCoordinates(e,Q) is generated from e's exact affected before/after subjects/objects/relations and the frozen Q population. For one exact BindingLifecycleObservation b, BindingAffectedCoordinates(b,Q) is generated by the same structural affected-member function from b's exact projection without consuming SourceAttribution or an ordinary event node. A baseline owner mismatch or non-exact baseline verdict invalidates the same Q-local dependent coordinate set at B without being reclassified as an event. If e or b is outside Q's scope and shares no exact ProducerIncarnation, O09/O10 surface, mechanism, attachment, resource, channel, relation, or dependent coordinate with Q, its set is empty. Otherwise its set contains every and only Q-local coordinate whose semantic value consumes a changed member. For a binding-affecting change this includes, as applicable:

- ProducerSourceSurfaceBinding, its immutable-at-B ProducerSourceSurfaceBindingBaseline, the post-B BindingLifecycleObservationPopulation, ProducerBindingContinuityMeasuredConclusion/BindingConclusionCausality/currentness, ProducerBindingEventCoverage, and ProducerSourceSurfaceBindingCurrentness for every affected Producer/surface;
- every SourceAttribution, DirectCellResult, and DerivedInfluencePathResult containing or reaching that binding/surface;
- ProducerCouplingBaseGraph, every affected ProducerControlCouplingState, and ProducerControlCouplingPopulation;
- ProducerThreatControlDomain and every affected AbsenceSourceThreatControlDomain;
- AbsenceSourceControlMeasuredConclusion/currentness/admissibility;
- ProducerInfluenceThreatSet, TechnicalInfluenceEvidencePopulation, ProducerIndependenceMeasuredConclusion/currentness, PropositionDirectSourceCoverage, and DirectProducerFactEligibility;
- every affected EventCoverageAssertion/EventRequirementSourcePopulation and event-source eligibility;
- F03, F05, F14, F16, PermissionCoverageEvaluation, reuse destination evaluation, provenance, and inventory coordinates that consume any foregoing value.

The exact owner-preserving BindingBaselineObservationPopulation at B, E07/E11/E14/E15/E17 BindingLifecycleObservationPopulation over (B,U], causally closed bounded current IAA conclusion, and exhaustive local state mapping are therefore the nonrecursive inputs for binding current use. Later canonical coverage and EventOccurrence populations must agree but do not feed that bootstrap. An E15 attachment change or Q-local E17 allocation/scope/membership change with continuous ProducerIntrinsicContinuity retains ProducerIncarnation but invalidates the old binding and all listed dependents. An E17 activation restart or continuing-capability mechanism replacement additionally replaces ProducerIncarnation and projects that one replacement through every affected Q. No baseline/bootstrap/ordinary event occurrence, affected-coordinate set, IAA conclusion, or invalidation verdict allocates identity.

Overlap contradictions, nonunique order, missing interval positions, scope narrowing, producer substitution, source-class mismatch, or unresolvable semantic history are non-authorizing. H-13 defines those failure meanings. H-11 later owns any record linkage, storage, trusted ordering materialization, and anti-rollback evidence mechanics.

An event after an affected closure state and at or before AuthorityUseCut invalidates that closure. A new complete closure after the event and new continuous coverage from its cut are required. A later reverse change does not erase the earlier event.

PermissionEventCoverageSet is:

~~~
PermissionEventCoverageSet = (
  exact PermissionEvaluationCoordinate,
  exact PermissionScopeKey,
  ClosureStateCut,
  AuthorityUseCut,
  exact required PermissionEventRequirementSlot set,
  exact EventRequirementSourcePopulation occurrence family,
  exact owner-preserving EventCoverageAssertion occurrence family projection,
  exact slot-to-source-population cardinality result,
  exact affected closure/F invalidation set,
  verdict
)

slot-to-source-population cardinality result =
  exact-one-to-one | missing | duplicate | injected | ambiguous

verdict = continuous-complete | gap | unknown | contradictory

ConnectionEventCoverageUnion = (
  exact ConnectionEvaluationKey,
  exact PermissionEventCoverageSet set,
  exact owner-preserving EventRequirementSourcePopulation union,
  exact owner-preserving EventCoverageAssertion union,
  verdict
)

verdict = complete-owner-preserving | partial | unknown | contradictory
~~~

The required slot set is generated for that permission alone by the closed E01-E17 table, Section 11 direct-source ownership, exact profile/type matrices, complete ObservationScope population, and the constant independently-complete-source policy. A family requiring two source classes creates distinct slots. Raw population and assertion families retain multiplicity. Exactly one EventRequirementSourcePopulation is required per slot and none outside it; inside it, exactly one assertion occurrence or explicit unavailable placeholder is required per candidate coordinate. Same-looking evidence at another permission, side, domain, scope, interval, or unlisted Producer cannot satisfy the slot. Missing, equal duplicate, unequal duplicate, injected, ambiguous, unattributed, contradicting, wrongly projected, or unknown-policy population/assertion occurrences make the permission set non-authorizing.

ConnectionEventCoverageUnion is an owner-preserving derived output only. It equals every and only permission-local set from both sides and cannot be consumed as authority by F12, F15, freshness, invalidation, PermissionCoverageEvaluation, or provenance dependency generation. Each permission's PermissionEventCoverageSet is established before its F12 and F15. Those predicates consume only that set and never create it.

## 10. Controller and observation-only model

K04 controller-controls-boundary is structural membership/topology. It identifies which closed ControllerIncarnation is assigned to which IsolationBoundary. K04 grants no technical power and does not by itself create a ControlCapableSubject.

SupportingController is exactly a current S02 ControllerIncarnation in the exact side/context/release scope, present in the complete controller/boundary CombinedClosure, carrying a nonempty role-token set below, having K04 to at least one relevant boundary, and having at least one defining edge for every declared role.

| Role token | Required defining edge | Only permitted technical kinds |
|---|---|---|
| runtime-lifecycle-enforcer | at least one K08-K16 | K08-K16 |
| boundary-state-enforcer | K17 or K18 | K17-K18 |
| resource-state-enforcer | K19, K31, or K35 | K19, K31, K35 |
| protocol-message-gate | K47 or K48 | K47-K48 |

A controller may carry multiple roles; its permitted technical set is exactly the union. Every outgoing K08-K19, K31, K35, K47, or K48 must be in that union and reach only a boundary descendant, target, resource, or channel covered by one of its K04 boundaries. Every declared role must have a defining edge. K04 and K05 are the only role-independent structural relations permitted for S02.

K20-K30, K32-K34, K36-K46, and K49 are never S02 role powers. Their presence from a SupportingController to a relevant object remains a well-typed observed edge but fails the applicable predicate. The verifier never hides or reclassifies the controller.

ControlCapableSubject means S02 with at least one current K08-K19, K31, or K35 edge. ProtocolGateCapableSubject means S02 with K47 or K48. Neither classification expands its role union.

ObservationOnlySubject is exactly a current S03 in the exact side/context/release scope, present in a complete relevant closure, with no controller role, no K04, and outgoing K08-K49 set that is a subset of K44. It may participate in structural K05. Any other outgoing K08-K49 edge contradicts the S03 classification and fails closed; it is never promoted to S02.

For one MeasurementTarget, EffectiveIsolationBoundarySet is the exact finite mathematical set containing every K02 boundary enclosing any target member and every boundary reachable from those boundaries by zero or more K03 parent edges. It is complete only when the supporting-controllers-and-boundaries CombinedClosure is complete.

## 11. Closed K01-K49 relation type-signature matrix

Let A be exactly {S01,S02,S03,S04,S05,S06,S07,S08}. Set notation is exhaustive. REQUIRED means the tagged field is present. FORBIDDEN means absent. Same means the Resource equals the O06 object or S11 source, as applicable. Owner means boundary-state for a boundary-owned object and environment-membership for an environment-owned object; ownership itself must be complete and nonconflicting.

Each may-* edge means an effective technical path exists without a new deployment or privilege grant. Policy denial does not erase the path. Every K edge is side-local and carries one exact ExactTenantContext and ParticipantSide. No K edge crosses a side or context.

| K | Exact relation | Sources | Object | Resource | Channel | Direction | Direct source |
|---|---|---|---|---|---|---|---|
| K01 | runtime-member-of-target | S01 | O01 | FORBIDDEN | FORBIDDEN | directed | runtime-lifecycle |
| K02 | boundary-encloses-runtime | S09 | O02 | FORBIDDEN | FORBIDDEN | directed | boundary-state |
| K03 | boundary-parent-of-boundary | S09 | O03 | FORBIDDEN | FORBIDDEN | directed | boundary-state |
| K04 | controller-controls-boundary | S02 | O03 | FORBIDDEN | FORBIDDEN | directed | boundary-state |
| K05 | subject-resident-in-environment | S01,S02,S03,S04,S05,S06,S09,S11,S12 | O04 | FORBIDDEN | FORBIDDEN | directed | environment-membership |
| K06 | resource-attached-to-subject | S11 | O08 of S01,S02,S03,S04,S05,S06,S09,S10,S12 | REQUIRED same | FORBIDDEN | directed | owner |
| K07 | channel-connects-endpoints | S12 | O07 | FORBIDDEN | REQUIRED | unordered-symmetric | boundary-state |
| K08 | may-start-runtime | A | O02 | FORBIDDEN | FORBIDDEN | directed | runtime-lifecycle |
| K09 | may-stop-runtime | A | O02 | FORBIDDEN | FORBIDDEN | directed | runtime-lifecycle |
| K10 | may-restart-runtime | A | O02 | FORBIDDEN | FORBIDDEN | directed | runtime-lifecycle |
| K11 | may-replace-runtime | A | O02 | FORBIDDEN | FORBIDDEN | directed | runtime-lifecycle |
| K12 | may-clone-runtime | A | O02 | FORBIDDEN | FORBIDDEN | directed | runtime-lifecycle |
| K13 | may-snapshot-runtime | A | O02 | FORBIDDEN | FORBIDDEN | directed | runtime-lifecycle |
| K14 | may-restore-runtime | A | O02 | FORBIDDEN | FORBIDDEN | directed | runtime-lifecycle |
| K15 | may-migrate-runtime | A | O02 | FORBIDDEN | FORBIDDEN | directed | runtime-lifecycle |
| K16 | may-change-runtime-membership | A | O01 | FORBIDDEN | FORBIDDEN | directed | runtime-lifecycle |
| K17 | may-reconfigure-boundary | A | O03 | FORBIDDEN | FORBIDDEN | directed | boundary-state |
| K18 | may-grant-or-revoke-exposure | A | O03 | FORBIDDEN | FORBIDDEN | directed | boundary-state |
| K19 | may-attach-or-detach-resource | A | O06 | REQUIRED same | FORBIDDEN | directed | owner |
| K20 | may-read-memory | A | O02 | REQUIRED memory-domain | FORBIDDEN | directed | owner |
| K21 | may-write-memory | A | O02 | REQUIRED memory-domain | FORBIDDEN | directed | owner |
| K22 | may-execute-in-address-space | A | O02 | REQUIRED compute-scheduler or memory-domain | FORBIDDEN | directed | owner |
| K23 | may-signal-or-invoke-ipc | A | O02 | REQUIRED ipc-namespace | REQUIRED | directed | boundary-state |
| K24 | may-map-shared-memory | A | O02 | REQUIRED memory-domain or ipc-namespace | FORBIDDEN | directed | owner |
| K25 | may-read-storage | A | O06 | REQUIRED same; storage-volume, filesystem-namespace, or secret-store | FORBIDDEN | directed | owner |
| K26 | may-write-storage | A | O06 | REQUIRED same; storage-volume, filesystem-namespace, or secret-store | FORBIDDEN | directed | owner |
| K27 | may-enumerate-storage | A | O06 | REQUIRED same; storage-volume, filesystem-namespace, or secret-store | FORBIDDEN | directed | owner |
| K28 | may-send-network-data | A | O07 | REQUIRED network-interface | REQUIRED | directed | boundary-state |
| K29 | may-receive-network-data | A | O07 | REQUIRED network-interface | REQUIRED | directed | boundary-state |
| K30 | may-route-or-forward-network-data | A | O07 | REQUIRED network-interface or network-policy | REQUIRED | directed | owner |
| K31 | may-change-network-policy | A | O06 | REQUIRED same; network-policy | FORBIDDEN | directed | owner |
| K32 | may-read-device-state | A | O06 | REQUIRED same; device | FORBIDDEN | directed | owner |
| K33 | may-write-device-state | A | O06 | REQUIRED same; device | FORBIDDEN | directed | owner |
| K34 | may-submit-device-work | A | O06 | REQUIRED same; device | FORBIDDEN | directed | owner |
| K35 | may-reassign-device | A | O06 | REQUIRED same; device | FORBIDDEN | directed | owner |
| K36 | may-read-namespace | A | O06 | REQUIRED same; filesystem-namespace, ipc-namespace, or privilege-domain | FORBIDDEN | directed | owner |
| K37 | may-write-namespace | A | O06 | REQUIRED same; filesystem-namespace, ipc-namespace, or privilege-domain | FORBIDDEN | directed | owner |
| K38 | may-inject-environment-value | A | O02 | REQUIRED management-plane | FORBIDDEN | directed | boundary-state |
| K39 | may-enumerate-namespace | A | O06 | REQUIRED same; filesystem-namespace, ipc-namespace, or privilege-domain | FORBIDDEN | directed | owner |
| K40 | may-attach-debugger | A | O02 | REQUIRED management-plane | FORBIDDEN | directed | boundary-state |
| K41 | may-trace-execution | A | O02 | REQUIRED telemetry-plane or management-plane | FORBIDDEN | directed | boundary-state |
| K42 | may-capture-runtime-state | A | O02 | REQUIRED telemetry-plane or management-plane | FORBIDDEN | directed | boundary-state |
| K43 | may-instrument-execution | A | O02 | REQUIRED telemetry-plane or management-plane | FORBIDDEN | directed | boundary-state |
| K44 | may-observe-isolation-metadata | S03,S05 | O09 | REQUIRED telemetry-plane | FORBIDDEN | directed | boundary-state |
| K45 | shares-mutable-resource | A | O08 of A | REQUIRED exact shared ResourceObject | FORBIDDEN | unordered-symmetric | owner |
| K46 | shares-capacity-only-resource | A | O08 of A | REQUIRED exact shared ResourceObject | FORBIDDEN | unordered-symmetric | owner |
| K47 | may-admit-protocol-message | A | O02 | FORBIDDEN | REQUIRED | directed | boundary-state |
| K48 | may-emit-protocol-message | A | O07 | FORBIDDEN | REQUIRED | directed | boundary-state |
| K49 | may-alter-producer-observation-or-report | A | O09 or O10 | FORBIDDEN | FORBIDDEN | directed | producer-lifecycle identity plus owner technical path |

The object/source identity joins are only: S01/S04 with O02 by exact RuntimeIncarnation; S02 with O05 by exact ControllerIncarnation; S05 with O09/O10/O11 by the exact ProducerIncarnation embedded in the exact ProducerSourceSurfaceCoordinate or O11 value; S06/S12 with O07 by exact endpoint; S09 with O03; S10 with O04; S11 with O06; and O08 with its exact embedded subject. O09/O10 may be used only when their exact ProducerSourceSurfaceBinding(Q,P) is exact-complete and the object coordinate belongs to its corresponding surface set. Missing, ambiguous, cross-Q, or cross-Producer surface joins are malformed. No other implicit join or conversion exists.

The verifier validates every received edge in this order: known K token; permitted source class; permitted object and embedded class; Resource tag/class; Channel tag; direction; direct-source class/domain; exact scope; occurrence; identity lifecycle; projection coherence. A failure retains the edge as malformed and fails closed. It is never dropped, reversed, inferred, repaired, or recast.

### 11.1 Direct-source contribution authority

| K family | Direct factual authority | Contributors that may enumerate or compare only |
|---|---|---|
| K01 | runtime-lifecycle | boundary-state, environment-membership |
| K02-K04 | boundary-state | runtime-lifecycle for runtime identity; environment-membership for residency |
| K05 | environment-membership | boundary-state for boundary/controller identity |
| K06 | exact owner | runtime-lifecycle for runtime identity; nonowner source for equivalence only |
| K07 | boundary-state | runtime-lifecycle for endpoint identity; environment-membership for physical interface comparison |
| K08-K16 | runtime-lifecycle | boundary-state for controller/boundary identity; environment-membership for residency |
| K17-K18 | boundary-state | runtime-lifecycle for target identity; environment-membership for environment comparison |
| K19-K22,K24-K27 | exact resource owner | runtime-lifecycle for target identity; nonowner source for resource equivalence |
| K23 | boundary-state | runtime-lifecycle for target identity; environment-membership for physical IPC residency |
| K28-K29 | boundary-state | runtime-lifecycle for target identity; environment-membership for physical interface comparison |
| K30-K37,K39 | exact resource owner | runtime-lifecycle for target identity; nonowner source for resource equivalence |
| K38,K40-K44 | boundary-state | runtime-lifecycle for target identity; environment-membership for physical management/telemetry comparison |
| K45-K46 | exact resource owner | runtime-lifecycle for runtime identities; nonowner source for equivalence |
| K47-K48 | boundary-state | runtime-lifecycle for target identity; environment-membership for endpoint comparison |
| K49 | producer-lifecycle for the exact O09/O10 binding plus the exact direct technical-path owner for every constituent edge cell | runtime-lifecycle for target/controller identity; composite-correlator may derive a path result only and never owns edge or path absence |

This matrix is the closed abstract owner and concrete-source class/domain matrix for every BindingBaselineUniverseMember and BindingLifecycleUniverseMember. Boundary-state remains direct owner of its boundary, controller, gate, attachment, and boundary-owned resource/channel facts at B and afterward. Environment-membership retains physical residency, environment-owned object, and environment-attachment facts. Producer-lifecycle retains only Producer activation/mechanism/capability and O09/O10 surface lineage/allocation facts. Each row-specific owner remains owner of its fact. For every universe slot, the frozen Stage-B source population enumerates every matching concrete ProducerIdentity/ProducerIncarnation, retains multiplicity and unavailable placeholders, and applies the one corroboration/conflict composition rule. No abstract owner branch substitutes for a concrete source. The bounded IAA conclusion provides positive authority only for the exact retained baseline-coherent-plus-post-B-continuous conjunction; no IAA wrapper, conclusion, registration, source selection, or conflict rule transfers or rewrites factual authority.

### 11.2 Exact K45 mutable-sharing meaning

For two exact subjects A and B and one exact shared ResourceObject R, CommonState(A,B,R) is the exact state/content/configuration of R that is reachable by both subjects' effective technical paths.

K45(A,B,R) holds exactly when complete owner-domain evidence establishes:

1. A and B are distinct semantic subjects in the applicable closure;
2. both attach to or otherwise reach the same physical resource represented locally by R;
3. CommonState is nonempty; and
4. at least one of these cross-subject influence conditions holds:
   - either subject can read content or state whose value can be changed by the other;
   - either subject can write or alter content or state read, executed, consumed, or acted on by the other;
   - either subject can identify the other's content, state, partition, workload, addressable object, or resource use through R; or
   - either subject can control allocation, naming, attachment, policy, configuration, priority, ownership, or access state of R in a way that changes the other's content/state access or behavior.

Read means obtaining semantic content or state, not merely observing aggregate service delay. Write means causing a semantic content or state change. Identify means resolving a stable or occurrence-specific fact about the other subject or its partition/content beyond aggregate anonymous load. Control means choosing a resource state, policy, allocation, mapping, priority, attachment, or access decision that affects the other.

K45 is symmetric because the subjects share the resource even when the capability is one-way. Its owner source must identify the exact common resource and exact influence condition. A shared readable mutable store is K45 even if neither subject currently writes, when another common controller or resource process can change the shared content and both consume the same mutable state.

### 11.3 Exact K46 capacity-only meaning and promotion rules

ResidualCapacityInfluence is limited to this closed effect set caused solely by contention for one finite service-capacity pool:

~~~
service-start delay
service-completion delay
throughput variation
temporary allocation denial or availability variation
~~~

The bound is qualitative and closed by effect kind: no content, identity, addressability, configuration, allocation control, policy control, or targeted control effect is included. This decision does not claim a numeric latency or availability guarantee.

K46(A,B,R) holds exactly when complete owner-domain evidence establishes all of:

1. A and B share the exact finite service-capacity ResourceObject R and its finite service-capacity pool;
2. their semantic content/state partitions are disjoint;
3. neither can read, write, enumerate, map, identify, address, attach/detach, reprioritize, reassign, configure, or control the other's partition, content, state, or access through R;
4. no common mutable content/state is reachable by both;
5. no K20-K45 or K49 path through R supplies such influence;
6. the only cross-subject effect is ResidualCapacityInfluence from aggregate anonymous load; and
7. complete closure and event coverage establish these conditions at the cut.

Ordinary workload modulation that changes aggregate timing/load remains an accepted and acknowledged residual for partitioned-environment and shared-governance-runtime only when it cannot identify or address the other subject and has no mutable/control path. It is forbidden in exclusive-environment. Acceptance acknowledges this residual; it does not claim that the risk is solved.

An apparent K46 is reclassified deterministically:

- it is K45 when common mutable content/state, cross-subject reading/writing/identification, partition addressing, quota/scheduling/configuration control, or targeted allocation control exists;
- it additionally produces the applicable K20-K44 edge when that closed relation vocabulary names the concrete influence;
- it produces K49 when producer observation/report alteration is possible; and
- it is indeterminate, not K46, when completeness cannot exclude any such path.

K46 never erases K45 or another edge. If both are reported for the same subject pair/resource/cut, the owner source must establish that K46's exclusivity conditions hold; otherwise the assertions conflict and the evaluation is non-authorizing.

K46 necessarily names one shared ResourceObject R; no K46 state may simultaneously require that A and B share no ResourceObject. K46 does not state that their MeasurementTarget runtime-member sets or effective-boundary sets overlap. It may coexist with target-disjoint and is evaluated independently by this Section, the complete resource/relation closures, E11/E16 coverage, F09/F13, and the selected profile. It never makes two PermissionEvaluationKey vertices adjacent in SameSideTargetOverlapGraph and never creates a SharedGovernanceRelation component. K45 is likewise independent of target equality: it remains its own mutable-sharing failure/profile fact and cannot establish a whole or partial target relation.

### 11.4 Closed path semantics

IsolationPath is an exact finite nonempty sequence of directed RelationEdge values in which each edge's semantic object is the next edge's semantic source, or the first edge's effect grants the capability represented by the next. Every edge must belong to the complete relation CombinedClosure at one PermissionScopeKey and closure state cut. Unordered-symmetric relations may be traversed in either direction.

ExternalSubject is any S04, S06, S07, or S08, or any S01-S05 subject outside the exact MeasurementTarget whose relevant capability is not an exact role-bounded SupportingController path.

BypassPath is an IsolationPath from an ExternalSubject to a target RuntimeIncarnation, EffectiveIsolationBoundarySet member, target-attached mutable ResourceObject, Producer observation, or Producer report through K08-K45 or K49 that neither:

- originates from an exact SupportingController using only its permitted role union and descendants; nor
- for message transfer alone, traverses the exact compatible EnforcementGate and MediatedChannelPair of Section 16.

DirectRemotePath is a BypassPath beginning at S07 or S08 and reaching a target, boundary, attached mutable resource, or admitted Channel. An S07 path that reaches only the exact gate is not direct only when every continuation is dominated by that gate and no alternative path exists. Any relevant S08 path is forbidden. An incomplete path universe never proves absence.

## 12. Privacy-safe cross-context separation detector and IAA conclusion

### 12.1 Role and strict authority boundary

ProtectedSeparationDetector is a narrowly bounded internal sensing and comparison role used only when a Connection requires physical separation comparison across unequal ExactTenantContext values. It may possess the minimum internal correlation needed to detect unsafe sharing.

It is:

- non-authoritative and non-authorizing;
- non-disclosing and inaccessible to tenants, ordinary telemetry, public errors, Trust-result consumers, Connection-result consumers, and context-visible history;
- not a Producer merely by being a detector, not an IAA, not a protocol or presentation identity, and not a stable cross-context carrier; and
- prohibited from asserting positive protocol measured truth or supplying runtime, boundary, environment, resource, producer, tenant, or topology equality to a protocol-visible surface.

Only the exact IsolationAttestationAuthorityIdentity named by the Stage-A-applicable permission, acting under its exact accepted OrganizationIAARegistrationSubjectIdentity and OrganizationIAARegistrationRevisionIdentity, may positively author a profile-governed measured separation conclusion. Present use separately requires H-13 freshness and H-11-realized authoritative-current HistoricalCurrentnessQualification. Detector unsafe or indeterminate evidence may always narrow an evaluation; detector evidence alone can never satisfy F04 or make an evaluation pass.

### 12.2 Exact protected evaluation, source, and completeness semantics

The local, privacy-safe detector evaluation key is:

~~~
ProtectedDetectorEvaluationKey = (
  exact local LocalIAASeparationKey,
  counterpart = opposite ParticipantSide
)
~~~

The key's expanded local fields are exact SideEvaluationKey, IsolationAttestationAuthorityIdentity, OrganizationIAARegistrationSubjectIdentity, OrganizationIAARegistrationRevisionIdentity, and the complete covered local PermissionEvaluationKey set. It exposes no opposite ExactTenantContext, permission, IAA, target, count, or physical identity. Inside the protected boundary only, the evaluation consumes the complete opposite-side target set for this exact Connection/profile/cut; evidence-supports-adequate-separation therefore means separation of every covered local MeasurementTarget from every opposite-side MeasurementTarget, not a sampled pair.

Inside the protected boundary, DetectorSourceDomain is exactly:

~~~
runtime-physical-placement
boundary-physical-placement
environment-residency-and-co-location
physical-resource-membership-and-influence
~~~

A ProtectedPhysicalLocator is an occurrence-local internal comparison value for one physical runtime unit, boundary mechanism, environment, or resource. It is usable only inside one exact detector evaluation, is never returned to an IAA-visible or context-visible surface, and is not a stable semantic identity or cross-evaluation comparison carrier.

ProtectedSourceAttribution is the abstract structural fact that one exact protected domain owner supplied the exact asserted detector-source content at the exact semantic position without substitution or alteration. Asserted content omits this wrapper. Its verdict is attributed-authentic, unavailable, indeterminate, or contradictory. It defines no proof mechanism and grants no protocol authority.

ProtectedDetectorSourceAssertion is:

~~~
ProtectedDetectorSourceAssertion = (
  exact ProtectedDetectorEvaluationKey,
  DetectorSourceDomain,
  exact internal host-side and agent-side input scopes,
  exact finite ProtectedPhysicalLocator assignment/relation,
  exact complete relevant state/change coverage,
  exact ProtectedSourceAttribution,
  completeness verdict
)

completeness verdict =
  complete | partial | unknown | contradictory
~~~

The internal locator relation may contain the minimum other-context correlation needed for comparison only inside the detector boundary. It is not part of a detector disposition, an IAA conclusion, exposed provenance, context-visible history, ordinary telemetry, or a protocol carrier.

A ProtectedDetectorSourceAssertion is eligible only when the source:

1. directly controls or observes the complete physical allocation domain for its named domain at the AuthorityUseCut;
2. maps every target, effective boundary, relevant environment placement, resident, and attached physical resource involved in both Connection sides without a tenant-visible shared identifier;
3. includes preexisting state and every create, end, move, attach, detach, reconfigure, co-residency, and resource-membership change that can alter the comparison;
4. has no inaccessible shard, filter, sampling omission, open selector, unknown owner domain, or positive event gap;
5. binds all four DetectorSourceDomain values to one common semantic cut;
6. retains exact internal source attribution and contradiction detection; and
7. is used only for the exact destination ProtectedDetectorEvaluationKey.

All four eligible domains are required. Multiple owners may contribute, but each retains its direct domain and conflicts are not reconciled by precedence. ProtectedDetectorCompleteness is complete only when every condition above holds and every mapping generated by the four closed DetectorSourceDomain values over both complete target/closure populations is classified; it is partial, unknown, or contradictory otherwise.

### 12.3 Detector evidence disposition and IAA measured conclusion

For every LocalIAASeparationKey under unequal contexts, exactly one distinct context-private detector evidence disposition is required:

~~~
ProtectedDetectorEvidenceDisposition = (
  exact ProtectedDetectorEvaluationKey,
  evidence disposition,
  local completeness verdict
)

evidence disposition =
  evidence-unsafe-same-runtime
  | evidence-unsafe-same-boundary
  | evidence-unsafe-forbidden-co-residency
  | evidence-unsafe-forbidden-mutable-or-control-influence
  | evidence-supports-adequate-separation
  | evidence-indeterminate
~~~

The exact IAA named by LocalIAASeparationKey consumes only its permitted local disposition and independently authors this bounded measured content:

~~~
IAAContextLocalSeparationConclusionContent = (
  exact LocalIAASeparationKey,
  exact ProtectedDetectorEvidenceDisposition,
  measured conclusion
)

IAAContextLocalSeparationConclusion = (
  exact IAAContextLocalSeparationConclusionContent,
  exact semantic state position owned by the IsolationAttestationAuthorityIdentity in LocalIAASeparationKey,
  exact AuthoritativeSourceAttribution owned by the exact IsolationAttestationAuthorityIdentity in LocalIAASeparationKey
)

measured conclusion =
  unsafe-same-runtime
  | unsafe-same-boundary
  | unsafe-forbidden-co-residency
  | unsafe-forbidden-mutable-or-control-influence
  | adequately-established-separation
  | indeterminate-separation
~~~

The content's expanded fields include the exact local IAA, registration Subject/Revision, ExactTenantContext, ParticipantSide, Connection, selected profile, AuthorityUseCut, covered local permissions/targets, detector disposition, and measured conclusion. Every repeated value is universally projection-coherent. The attribution's asserted content is IAAContextLocalSeparationConclusionContent and its state position equals the conclusion position. An adequate IAA conclusion is eligible only from evidence-supports-adequate-separation with complete sources; an IAA may narrow that evidence to unsafe or indeterminate but may not turn unsafe, incomplete, contradictory, unavailable, or indeterminate detector evidence into adequate separation. The IAA authors measured truth only inside its exact accepted bounded authority and does not grant permission, Connection authority, or historical currentness. Present use separately requires H-13 fresh-for-exact-cut status and an authoritative-current HistoricalCurrentnessQualification realized later by H-11.

The local disposition and conclusion use context-distinct carriers and contain no opposite context identity, opposite IsolationBoundaryPermissionSubjectIdentity, opposite IsolationAttestationAuthorityIdentity, topology, count, raw identifier, shared token, source locator, timing value, or stable link. Opposite ParticipantSide is an accepted vocabulary value, not the other context's identity. Exact Connection is present only in the already accepted H-02/H-07 comparison direction.

The unsafe meanings are the corresponding complete-source findings of same runtime, same effective boundary, forbidden profile co-residency, or a forbidden K45/K20-K45/K49-equivalent mutable/control influence. Adequate means complete coverage, no unsafe condition, every required comparison performed, and no forbidden influence. Anything unavailable, partial, contradictory, unresolved, or not safely provable is indeterminate. No disposition or conclusion discloses which pair, how many pairs, what physical object, what other tenant, where it resides, or when it changed.

### 12.4 Decidable F04 rule

F04PairEvaluation is evaluated separately for every exact F04PairKey. One aggregate F04 FactEvaluation is satisfied exactly when every required pair evaluation is satisfied.

When the two SideEvaluationKey values have equal ExactTenantContext, each pair evaluation uses Section 7's mutual same-context equivalence rules and no protected detector disposition or IAAContextLocalSeparationConclusion is permitted for that Connection.

When the contexts are unequal, each pair evaluation consumes exactly the host-side and agent-side IAAContextLocalSeparationConclusion values selected by membership of its two PermissionEvaluationKey components in the exact covered sets of two unique LocalIAASeparationKey values. The pair evaluation is satisfied only when:

1. both corresponding IAA separation-currentness assertion variants are equal-current at the destination AuthorityUseCut;
2. each conclusion is independently and authentically attributed to its own exact IAA, binds the exact OrganizationIAARegistrationRevisionIdentity, is H-13-fresh-for-exact-cut, and has authoritative-current HistoricalCurrentnessQualification for both the conclusion and registration revision;
3. both conclusions, their local detector dispositions, Connection, profile, cut, side, and per-permission projections are coherent;
4. both local detector dispositions are complete evidence-supports-adequate-separation; and
5. both IAA measured conclusions are adequately-established-separation.

Any unsafe detector disposition or unsafe IAA conclusion fails every affected pair evaluation even if another source says adequate. Any indeterminate detector disposition or IAA conclusion makes every affected pair indeterminate. Unilateral positivity, disagreement, missing or duplicate disposition/conclusion, unavailable detector, unavailable IAA, stale H-13 freshness, non-authoritative-current history, inauthentic attribution, wrong registration revision, or incomplete evidence is non-authorizing. Detector narrowing is thus effective, while detector positivity alone never creates positive measured truth.

### 12.5 Protected sensing reuse is not conclusion reuse

Protected raw sensing may be computationally reused only inside the protected boundary under this structural record:

~~~
ProtectedSensingReuse = (
  exact internal source sensing statement set,
  exact destination ProtectedDetectorEvaluationKey,
  exact destination ProtectedDetectorSourceAssertion set,
  eligibility result
)

eligibility result =
  destination-evaluation-performed | ineligible
~~~

Destination-evaluation-performed requires every reused sensing statement to remain current, source-attributed, complete for its direct domain, and re-evaluated against the exact destination Connection/profile/cut and complete destination input scopes. The record remains internal, is not LowerMeasurementEvidence, is not IAA-visible authority, and supplies neither a disposition nor a conclusion.

A source Connection's ProtectedDetectorEvidenceDisposition, IAAContextLocalSeparationConclusion, IAAMeasuredCurrentnessAssertion, F04, or result is never reused for a destination Connection or cut. Every destination requires a destination-bound detector evaluation and disposition, fresh independently attributed destination IAA conclusions, fresh IAA currentness assertions, and fresh F04 evaluation. Cross-context protocol-visible evidence reuse remains prohibited.

## 13. Authoritative currentness and correspondence

AuthoritativeSourceAttribution is:

~~~
AuthoritativeSourceAttribution = (
  content owner =
    exact Organization-authority(exact Organization)
    | exact Workspace-authority(exact Organization, exact Workspace)
    | H-07
    | exact IsolationAttestationAuthorityIdentity,
  exact asserted semantic content with this wrapper omitted,
  exact authoritative scope,
  exact semantic state position,
  verdict
)

verdict =
  attributed-authentic | unavailable | indeterminate | contradictory
~~~

It is the abstract semantic fact that the named accepted content owner supplied the exact immutable content at that state position without substitution or alteration. Organization-authority owns accepted Organization registration and boundary-permission actions. Workspace-authority owns accepted Workspace state and overlay actions. An exact IAA owns only its explicitly defined bounded measured conclusions. For ProducerBindingContinuityMeasuredConclusion, that bounded content is the positive claim over the exact carried candidate-independent universe, exact-coherent baseline result, and post-B population; it is never authorship of any underlying baseline, bootstrap-source, or E07/E11/E14/E15/E17 fact and cannot override their conflicts. H-07 owns Connection semantics. Generic “H-02” is not a content owner. BindingBaselineDirectAttribution and BindingLifecycleDirectAttribution separately carry exact concrete BindingBootstrapSourceCoordinate values and cannot be rewritten as IAA AuthoritativeSourceAttribution or ordinary SourceAttribution. AuthoritativeSourceAttribution alone proves neither a direct fact, universe completeness, baseline correctness, causal position, historical eligibility, nor current-head status, does not make the owner a Producer, and defines no proof mechanism.

HistoricalCurrentnessSubject is the closed tagged union:

~~~
HistoricalCurrentnessSubject =
  organization-registration(
    exact OrganizationIAARegistrationSubjectIdentity,
    exact OrganizationIAARegistrationRevisionIdentity,
    exact immutable R8-10 content with attribution and qualification wrappers omitted
  )
  | workspace-state(
      exact WorkspaceIAAStateSubjectIdentity,
      exact WorkspaceIAAStateRevisionIdentity,
      exact WorkspaceStateOutcome
    )
  | workspace-overlay(
      exact WorkspaceIAAOverlaySubjectIdentity,
      exact WorkspaceIAAOverlayRevisionIdentity,
      exact immutable R8-18 content with attribution and qualification wrappers omitted
    )
  | boundary-permission(
      exact IsolationBoundaryPermissionSubjectIdentity,
      exact IsolationBoundaryPermissionRevisionIdentity,
      exact immutable R8-25 content with attribution and qualification wrappers omitted
    )
  | iaa-runtime-correspondence(exact RuntimeCorrespondence)
  | iaa-producer-independence(exact ProducerIndependenceMeasuredConclusion)
  | iaa-absence-source-control(exact AbsenceSourceControlMeasuredConclusion)
  | iaa-producer-binding-continuity(exact ProducerBindingContinuityMeasuredConclusion)
  | iaa-context-local-separation(exact IAAContextLocalSeparationConclusion)

HistoricalCurrentnessQualification = (
  exact HistoricalCurrentnessSubject,
  exact AuthorityUseCut,
  outcome
)

outcome =
  authoritative-current
  | superseded-or-retired
  | revoked
  | compromised
  | rollback-or-fork-unresolved
  | historically-unresolvable
  | unavailable
  | indeterminate
  | contradictory
~~~

HistoricalCurrentnessQualification is an implementation-neutral H-13-required semantic input. H-13 defines the closed outcomes and their authorization effect; H-11 later defines how the outcome is authoritatively materialized and proved. This tuple defines no H-11 record, proof format, predecessor encoding, current-head encoding, trusted clock, storage, signature, digest, or anti-rollback mechanism. Only authoritative-current can satisfy current use. Every other outcome is non-authorizing. A local mutable status, provider assertion, IAA assertion, claimed time, evidence count, or H-13 measurement fact cannot create or repair it.

Content-source authority and HistoricalCurrentnessQualification are orthogonal. The exact Organization/Workspace/IAA/H-07 owner remains the author even when the content is superseded, revoked, compromised, unavailable, or historically unresolvable. Conversely, a purported currentness outcome cannot authenticate, alter, or author content.

An assertion occurrence family is a finite structural multiplicity function from assertion values to natural-number occurrence counts. It is unordered and allocates no occurrence identity. It is used only where exact cardinality must reject repeated assertion occurrences before mathematical-set projection. A multiplicity other than one at a required semantic key fails even when repeated assertion content is otherwise equal.

### 13.1 H-02 content inputs and H-11-qualified applicability

H-13 consumes H-02's heterogeneous accepted applicability semantics; it does not redefine, create, widen, normalize, or fill defaults for them. The Stage-A candidate coordinate and four source-specific input projections are:

~~~
H02ApplicabilityCandidateCoordinate = (
  exact SideEvaluationKey,
  exact IsolationBoundaryPermissionSubjectIdentity,
  exact IsolationBoundaryPermissionRevisionIdentity
)

OrganizationRegistrationApplicabilityInput = (
  exact R8-10 OrganizationIAARegistrationRevisionSemantics.registrationSubject,
  exact R8-10 OrganizationIAARegistrationRevisionSemantics.registrationRevision,
  exact R8-10 permittedParticipantSides,
  exact R8-10 permittedIsolationProfileClasses,
  exact R8-10 permittedReleaseScope,
  exact R8-10 permittedWorkspaceScope,
  exact R8-10 purpose = experiment-isolation,
  exact R8-10 claimedEffectiveStart,
  exact R8-10 claimedEffectiveEnd,
  exact R8-10 predecessorRevision,
  exact AuthoritativeSourceAttribution owned by exact Organization-authority,
  exact HistoricalCurrentnessQualification for this registration subject/revision/content at AuthorityUseCut
)

BoundaryPermissionApplicabilityInput = (
  exact R8-25 BoundaryPermissionSemantics.permissionSubject,
  exact R8-25 BoundaryPermissionSemantics.permissionRevision,
  exact R8-25 Organization,
  exact R8-25 tagged Workspace permission scope,
  exact R8-25 OrganizationIAARegistrationSubjectIdentity,
  exact R8-25 OrganizationIAARegistrationRevisionIdentity positive ceiling,
  exact R8-25 IsolationAttestationAuthorityIdentity,
  exact R8-25 participantSide,
  exact R8-25 GovernedBoundaryLineageKey,
  exact R8-25 permittedIsolationProfileCeiling,
  exact R8-25 purpose = experiment-isolation,
  exact R8-25 predecessorRevision,
  exact R8-25 claimedEffectiveInterval,
  exact AuthoritativeSourceAttribution owned by exact Organization-authority,
  exact HistoricalCurrentnessQualification for this permission subject/revision/content at AuthorityUseCut
)

WorkspaceStateApplicabilityInput = (
  exact WorkspaceIAAStateSubjectIdentity,
  exact WorkspaceIAAStateRevisionIdentity,
  exact R8-15 WorkspaceStateOutcome,
  exact AuthoritativeSourceAttribution owned by exact Workspace-authority,
  exact HistoricalCurrentnessQualification for this Workspace state subject/revision/outcome at AuthorityUseCut
)

WorkspaceStateOutcome =
  denied
  | no-stricter-overlay
  | positive-overlay(exact WorkspaceIAAOverlayRevisionIdentity)

WorkspaceOverlayApplicabilityInput = (
  exact R8-18 overlaySubject,
  exact R8-18 overlayRevision,
  exact R8-18 exactRegistrationSubject,
  exact R8-18 exactWorkspaceStateSubject,
  exact R8-18 participantSideNarrowing,
  exact R8-18 profileNarrowing,
  exact R8-18 boundaryPermissionSubjectNarrowing,
  exact R8-18 isolationUseDisposition,
  exact R8-18 effectiveIntervalNarrowing,
  exact R8-18 predecessorRevision,
  exact R8-18 claimedEffectiveInterval,
  exact AuthoritativeSourceAttribution owned by exact Workspace-authority,
  exact HistoricalCurrentnessQualification for this overlay subject/revision/content at AuthorityUseCut
)

H02SelectedCurrentUseIntersection = (
  exact H02ApplicabilityCandidateCoordinate,
  exact Connection ExactTenantContext WorkspaceTag,
  exact ParticipantSide,
  exact selected release,
  exact selected IsolationProfile class token,
  exact AuthorityUseCut semantic state position,
  exact OrganizationRegistrationApplicabilityInput,
  exact BoundaryPermissionApplicabilityInput,
  tagged WorkspaceStateApplicabilityInput absent | present(exact value),
  tagged WorkspaceOverlayApplicabilityInput absent | present(exact value),
  structural scope result,
  exact required HistoricalCurrentnessQualification set,
  result
)

structural scope result =
  scope-eligible | denied | outside-ceiling | claimed-interval-outside | wrong-scope | indeterminate | contradictory

result =
  applicable
  | denied
  | outside-ceiling
  | stale
  | noncurrent
  | wrong-scope
  | indeterminate
  | contradictory
~~~

Each projection contains only fields actually owned by its named accepted H-02 source. No boundary-permission projection contains a synthesized permitted release set, isolation-use-disposition set, or generic side set; its exact participantSide is the R8-25 value. No Organization-registration projection contains a synthesized permission-subject set, isolation-use-disposition set, or boundary-permission field. Workspace state contributes only its accepted identities and R8-15 outcome. Workspace overlay contributes only the exact R8-18 identities and narrowing fields. An absent field is never interpreted as no restriction, organization-wide, no-claim, current, or permitted. Source values remain unchanged and universally projection-coherent wherever H-13 repeats them.

H02SelectedCurrentUseIntersection is an H-13-owned deterministic comparison result, not an H-02 field. It performs only the comparisons actually licensed by the typed inputs: registration participant-side/profile/release/workspace ceilings; boundary permission's exact Organization, Workspace tag, registration ceiling, IAA, participantSide, profile ceiling, purpose, and claimed interval; and, when present, the exact R8-15/R8-18 narrowing. Those comparisons produce only structural scope result. ClaimedEffectiveStart/End and claimedEffectiveInterval remain immutable claimed source content; claimed interval membership may support scope-eligible but can never by itself produce applicable.

The result is applicable exactly when structural scope result is scope-eligible, every required content-source attribution is attributed-authentic under its real Organization or Workspace owner, and every exact required HistoricalCurrentnessQualification outcome is authoritative-current at the same AuthorityUseCut. claimed-interval-outside maps to stale as a structural claimed-scope failure, never as a currentness proof. A non-authoritative-current outcome produces noncurrent, except that an underlying denied/outside-ceiling/stale/wrong-scope/indeterminate/contradictory structural result remains its exact branch. No H-13 RuntimeCorrespondence, Producer fact, IAA measured conclusion, event, closure, F result, local status, or configuration can supply or repair a governance qualification. Wrong or unavailable source fields remain wrong or unavailable; no cross-source field is copied to fill another source.

H02IsolationApplicabilityProjection is a closed tagged union:

~~~
H02IsolationApplicabilityProjection =
  workspace-absent-applicability(
    exact H02ApplicabilityCandidateCoordinate,
    exact Connection workspace-absent tag,
    exact OrganizationRegistrationApplicabilityInput,
    exact BoundaryPermissionApplicabilityInput whose Workspace tag is workspace-absent,
    WorkspaceStateApplicabilityInput = absent,
    WorkspaceOverlayApplicabilityInput = absent,
    exact H02SelectedCurrentUseIntersection,
    applicability result
  )
  | workspace-present-applicability(
    exact H02ApplicabilityCandidateCoordinate,
    exact Connection workspace-present(exact Workspace),
    exact OrganizationRegistrationApplicabilityInput,
    exact BoundaryPermissionApplicabilityInput whose Workspace tag is workspace-present(exact same Workspace),
    exact WorkspaceStateApplicabilityInput,
    tagged WorkspaceOverlayApplicabilityInput absent | present(exact value),
    exact H02SelectedCurrentUseIntersection,
    applicability result
  )

applicability result =
  applicable
  | denied
  | outside-ceiling
  | stale
  | noncurrent
  | wrong-scope
  | indeterminate
  | contradictory
~~~

In the R8-20A workspace-absent branch, the Connection and boundary-permission tags are workspace-absent; R8-10 permittedWorkspaceScope is exactly organization-wide or workspace-absent-only; selected side/release/profile is admitted by the R8-10 fields; the R8-25 exact participantSide/profile/Organization/registration ceiling/purpose/claimed interval is structurally coherent; the registration and boundary-permission content attributions are exact; both exact HistoricalCurrentnessQualification outcomes are authoritative-current; and all four Workspace state/overlay identities are absent. Presence of any WorkspaceStateApplicabilityInput, WorkspaceOverlayApplicabilityInput, inferred/default/null/empty/wildcard Workspace value, or cross-branch field is contradictory and cannot be ignored.

In the R8-20 workspace-present branch, the same exact Workspace appears in ExactTenantContext, the R8-10 permittedWorkspaceScope comparison, the R8-25 Workspace permission scope, and WorkspaceIAAStateSubjectIdentity. workspace-absent-only is forbidden and exact-workspaces must contain that Workspace. Exactly one WorkspaceStateApplicabilityInput supplies one R8-15 outcome with Workspace content attribution and authoritative-current HistoricalCurrentnessQualification. denied has no overlay and cannot authorize. no-stricter-overlay has no overlay input. positive-overlay(X) has exactly one WorkspaceOverlayApplicabilityInput whose overlayRevision is X, whose subject/registration/state projections are exact, whose Workspace content attribution is authentic, and whose qualification is authoritative-current. Registration and boundary permission independently require their Organization attributions and authoritative-current qualifications. The R8-18 narrowing fields may narrow only their named dimensions and never add, widen, resurrect, or substitute permission. Any missing, extra, noncurrent, scope-wrong, or contradictory state/overlay value is non-authorizing.

Stage A is the complete authoritative applicability population:

~~~
H02ApplicabilityPopulation = (
  exact SideEvaluationKey,
  exact finite authoritative OrganizationRegistrationApplicabilityInput candidate family,
  exact finite authoritative BoundaryPermissionApplicabilityInput candidate family,
  exact finite authoritative WorkspaceStateApplicabilityInput candidate family,
  exact finite authoritative WorkspaceOverlayApplicabilityInput candidate family,
  exact HistoricalCurrentnessQualification occurrence family for every candidate input,
  exact H02IsolationApplicabilityProjection occurrence family,
  exact rejected/wrong/stale/contradictory/injected audit population,
  exact source-to-candidate cardinality and projection-coherence result
)
~~~

It contains every accepted-domain H-02 candidate, including structurally eligible, applicable, denied, narrowed, wrong-scope, noncurrent, contradictory, and received injected audit candidates. Every content attribution, HistoricalCurrentnessQualification, and H02SelectedCurrentUseIntersection is computed or consumed in Stage A alone. H-13 RuntimeCorrespondence, Producer evidence, MeasurementTarget, closure, event, freshness, overlap, governance, reuse, F, reason, provenance verdict, or result cannot add, remove, qualify, or influence a Stage-A candidate or applicability result.

For each side, H02SideApplicabilityProjection is:

~~~
H02SideApplicabilityProjection = (
  exact SideEvaluationKey,
  exact Connection WorkspaceTag,
  exact H02ApplicabilityPopulation,
  exact H02IsolationApplicabilityProjection candidate occurrence family projected from that population,
  exact H02ApplicabilityCandidateCoordinate-to-projection cardinality result,
  exact ApplicablePermissionSet derived from every and only result=applicable candidate,
  verdict
)

H02ApplicabilityCandidateCoordinate-to-projection cardinality result =
  exact-one-to-one | missing | duplicate | injected | ambiguous

verdict = complete-applicable | non-authorizing

H02SideCurrentnessAssertion = (
  exact SideEvaluationKey,
  expected exact H02SideApplicabilityProjection,
  current exact H02SideApplicabilityProjection,
  exact HistoricalCurrentnessQualification occurrence family for every exact governance subject/revision in expected and current,
  status
)

H02PermissionCurrentnessAssertion = (
  exact PermissionEvaluationCoordinate,
  expected exact H02IsolationApplicabilityProjection with result=applicable,
  current tagged absent
    | present(exact H02IsolationApplicabilityProjection),
  exact HistoricalCurrentnessQualification occurrence family for every exact governance subject/revision in expected and current,
  status
)

status =
  equal-current
  | changed-or-superseded
  | revoked
  | compromised
  | rollback-or-fork-unresolved
  | historically-unresolvable
  | unavailable
  | indeterminate
  | contradictory

H02CurrentnessSet = (
  exact SideEvaluationKey,
  exact H02SideCurrentnessAssertion occurrence family,
  exact H02PermissionCurrentnessAssertion occurrence family,
  exact expected PermissionEvaluationCoordinate set,
  exact key-to-assertion cardinality result,
  verdict
)

key-to-assertion cardinality result =
  exact-one-to-one | missing | duplicate | injected | ambiguous

verdict =
  complete-equal-current | non-authorizing
~~~

H02SideApplicabilityProjection derives ApplicablePermissionSet rather than accepting an implementation-supplied set. Its Stage-A family contains every and only accepted-domain candidate at that side and cut, including scope-eligible-but-noncurrent, denied, narrowed, wrong-scope, unavailable, and contradictory candidates needed for audit. Exactly one projection occurrence is required per candidate coordinate and no extra occurrence is permitted. Only a result=applicable already backed by exact content attributions and authoritative-current HistoricalCurrentnessQualification values enters ApplicablePermissionSet. Stage B then creates every and only such member's PermissionEvaluationCoordinate, PermissionEvaluationKey resolution, H02PermissionCurrentnessAssertion, RuntimeCorrespondence, Producer/closure/event/freshness/overlap/governance/reuse/F/provenance questions, and PermissionCoverageEvaluation. Rejected or invalid candidates remain in Stage-A audit/provenance/trigger populations but receive no authorization predicate.

Exactly one side assertion occurrence is required. Its expected coordinate set is derived one-for-one from the complete expected ApplicablePermissionSet. Exactly one per-permission assertion occurrence whose key is that coordinate is required for every expected coordinate, and none may have any other coordinate. A missing, equal duplicate, unequal duplicate, injected, conflicting, or unkeyable occurrence makes the cardinality result non-exact and the verdict non-authorizing; it is never normalized, deduplicated, sampled, or repaired by precedence.

Current-use resolution has three nontransferable layers. First, exact Organization or Workspace authority authors each immutable accepted H-02 governance action and its claimed fields. Second, H-11-realized HistoricalCurrentnessQualification supplies authoritative current-head, supersession/retirement, revocation, compromise, rollback/fork, application/materialization, and historical eligibility at AuthorityUseCut. Third, H-13 structurally compares the qualified source content and defines whether the closed outcome authorizes. Generic “H-02” authors or proves none of these currentness facts.

A side assertion is equal-current only when the complete expected/current H02SideApplicabilityProjection values, typed Stage-A input families, candidate maps, branches, values, attributions, qualifications, results, and derived ApplicablePermissionSet are structurally equal and every required exact qualification outcome is authoritative-current. A per-permission assertion is equal-current only when current is present, result=applicable, every exact qualification is authoritative-current, and the complete expected/current H02IsolationApplicabilityProjection is structurally equal, including all five accepted core H-02 identity types and every source-specific field that its branch actually carries. It never demands a field absent from that H-02 source type. The immutable OrganizationIAARegistrationRevisionIdentity remains the exact positive ceiling content identity, but only its authoritative-current qualification permits present use. workspace-absent never equals workspace-present.

ApplicablePermissionSet is the exact mathematical set of every IsolationBoundaryPermissionSubjectIdentity and IsolationBoundaryPermissionRevisionIdentity tuple whose Organization/Workspace-authored content is attributed-authentic, whose exact required historical qualifications are all authoritative-current, and whose closed projection result is applicable to the Connection, ExactTenantContext branch, profile, release, and ParticipantSide. It is never ordered or summarized here. Equal-looking subjects remain distinct under their accepted identity. Omission, injection, filtering, widening, or silent deduplication fails completeness.

### 13.2 H-07 currentness

H07CurrentnessComparison is:

~~~
H07CurrentnessComparison = (
  AuthorityUseCut,
  exact expected Connection semantic bundle,
  exact current Connection semantic bundle,
  status,
  exact AuthoritativeSourceAttribution owned by H-07
)

Connection semantic bundle = (
  exact Connection,
  lifecycle state,
  selected logical interface,
  selected release/profile binding,
  exact host-side and agent-side ParticipantSide projections,
  exact host-side and agent-side ExactTenantContext projections,
  replacement status
)

status =
  equal-current | changed | unavailable | indeterminate
~~~

At the same AuthorityUseCut, only semantic equality of the two complete bundles plus current lifecycle/replacement state passes. It is not a Producer event.

### 13.3 IAA measured-conclusion currentness

~~~
MeasuredConclusionMaximumAge = 60 seconds

QualifiedPhysicalTimeDomain = (
  exact H-11-qualified physical-time reference-domain semantic value,
  unit semantics = SI-second,
  order semantics = linear physical-time order,
  exact qualification scope
)

QualifiedPhysicalTimeDomainComparison = (
  exact left QualifiedPhysicalTimeDomain candidate,
  exact right QualifiedPhysicalTimeDomain candidate,
  verdict
)

domain-comparison verdict =
  exact-equal | unequal | unavailable | indeterminate | contradictory

QualifiedPhysicalTimeInput = (
  exact semantic state position,
  exact QualifiedPhysicalTimeDomain candidate,
  tagged closed physical-time uncertainty interval absent | present([lower,upper] seconds),
  qualification verdict
)

qualification verdict = resolved | unavailable | indeterminate | contradictory

DerivedMeasuredConclusionAgeInterval = (
  exact IAA conclusion state position M,
  exact AuthorityUseCut U,
  exact QualifiedPhysicalTimeInput(M),
  exact QualifiedPhysicalTimeInput(U),
  exact QualifiedPhysicalTimeDomainComparison,
  exact derived-age branch,
  derivation verdict
)

derived-age branch =
  absent
  | binding-self-age(present([0,0] seconds))
  | general-age(present([U.lower - M.upper, U.upper - M.lower] seconds))

derivation verdict = resolved | unavailable | indeterminate | contradictory

MeasuredConclusionUseFreshness = (
  exact HistoricalCurrentnessSubject for one IAA conclusion,
  exact IAA-authored measured semantic state position M,
  exact AuthorityUseCut U,
  exact QualifiedPhysicalTimeInput(M),
  exact QualifiedPhysicalTimeInput(U),
  exact QualifiedPhysicalTimeDomainComparison,
  exact DerivedMeasuredConclusionAgeInterval,
  verdict
)

verdict =
  fresh-for-exact-cut | stale | unavailable | indeterminate | contradictory

IAAMeasuredCurrentnessAssertion =
  runtime-correspondence-currentness(
    exact PermissionEvaluationCoordinate,
    exact expected PermissionEvaluationKey,
    current tagged absent | present(exact PermissionEvaluationKey),
    exact MeasuredConclusionUseFreshness,
    exact HistoricalCurrentnessQualification for the exact RuntimeCorrespondence,
    status
  )
  | producer-independence-currentness(
    exact ProducerIndependenceCoordinate,
    exact expected ProducerIndependenceMeasuredConclusion,
    current tagged absent | present(exact ProducerIndependenceMeasuredConclusion),
    exact MeasuredConclusionUseFreshness,
    exact HistoricalCurrentnessQualification for the exact ProducerIndependenceMeasuredConclusion,
    status
  )
  | source-control-currentness(
    exact AbsenceSourceControlCoordinate,
    exact expected AbsenceSourceControlMeasuredConclusion,
    current tagged absent | present(exact AbsenceSourceControlMeasuredConclusion),
    exact MeasuredConclusionUseFreshness,
    exact HistoricalCurrentnessQualification for the exact AbsenceSourceControlMeasuredConclusion,
    status
  )
  | binding-continuity-currentness(
    exact PermissionEvaluationCoordinate,
    exact ProducerIncarnation,
    exact ProducerBindingStateCut,
    exact AuthorityUseCut,
    exact expected ProducerBindingContinuityMeasuredConclusion,
    current tagged absent | present(exact ProducerBindingContinuityMeasuredConclusion),
    exact BindingConclusionCausality,
    exact MeasuredConclusionUseFreshness,
    exact HistoricalCurrentnessQualification for the exact ProducerBindingContinuityMeasuredConclusion,
    status
  )
  | context-local-separation-currentness(
    exact LocalIAASeparationKey,
    exact expected IAAContextLocalSeparationConclusion,
    current tagged absent | present(exact IAAContextLocalSeparationConclusion),
    exact MeasuredConclusionUseFreshness,
    exact HistoricalCurrentnessQualification for the exact IAAContextLocalSeparationConclusion,
    status
  )

status =
  equal-current
  | changed-or-superseded
  | revoked
  | compromised
  | rollback-or-fork-unresolved
  | historically-unresolvable
  | stale
  | unavailable
  | indeterminate
  | contradictory

IAAMeasuredCurrentnessSet = (
  exact ConnectionEvaluationKey,
  exact runtime-correspondence-currentness assertion occurrence family,
  exact producer-independence-currentness assertion occurrence family,
  exact source-control-currentness assertion occurrence family,
  exact binding-continuity-currentness assertion occurrence family,
  exact context-local-separation-currentness assertion occurrence family,
  exact runtime coordinate cardinality result,
  exact producer-independence coordinate cardinality result,
  exact source-control coordinate cardinality result,
  exact binding-continuity coordinate cardinality result,
  exact separation coordinate cardinality result,
  verdict
)

verdict =
  complete-equal-current | non-authorizing
~~~

QualifiedPhysicalTimeDomain is an implementation-neutral semantic value, not a clock, clock-identifier encoding, timestamp representation, protocol, H-11 record, proof, or cryptographic mechanism. Its qualification scope is the exact Connection/profile/side/permission or local-IAA scope in which both positions are asserted. Domain equality is exact structural equality of every tuple field. QualifiedPhysicalTimeDomainComparison is exact-equal only when both well-formed domains are structurally equal; unequal when both are well formed but not equal; unavailable when either is absent/unavailable; indeterminate when either domain or its qualification cannot be resolved; and contradictory when domain content/attribution conflicts or an assertion claims equality between structurally unequal domains. No other comparison state exists.

Direct interval subtraction is permitted only when QualifiedPhysicalTimeDomainComparison=exact-equal. There is no implicit or provider-supplied conversion, offset, local-clock mapping, implementation-selected equivalence, same-units heuristic, offset guess, or display-timestamp comparison. For unequal well-formed domains the derivation verdict and freshness verdict are indeterminate and the numeric bounds are not subtracted. An offered mapping or conversion is ignored as non-authoritative input and cannot change that result; conflicting equality attribution is contradictory. Cross-domain conversion, if ever desired, requires a separately reviewed H-13 semantic extension/profile.

The fixed rule shape applies in all three initial profiles. Its `general-age` branch applies only to RuntimeCorrespondence, ProducerIndependenceMeasuredConclusion, IAAContextLocalSeparationConclusion, and AbsenceSourceControlMeasuredConclusion. ProducerBindingContinuityMeasuredConclusion instead requires semantic `M=U` and only `binding-self-age([0,0])` when well formed; no binding-continuity conclusion with M before U can pass because a calculated general age happens to be below 60 seconds. This is not a waiver or widened age window. Population coverage establishes what was measured, BindingConclusionCausality establishes exact closure, and MeasuredConclusionUseFreshness remains the uniform current-use shape. HistoricalCurrentnessSubject already carries the exact conclusion content, destination/permission/profile/registration/Producer/binding/baseline/local-separation scope; no implementation-supplied revalidation policy object exists.

With contradiction precedence, the freshness verdict is derived exactly as follows. contradictory applies when either time input or domain comparison is contradictory, the physical-time interval is empty/inconsistent, the semantic state position is definitively after U, or the complete resolved same-domain age interval lies strictly below zero. unavailable applies when either required qualified-time input/domain/interval is absent or unavailable and no contradiction is established. indeterminate applies when the domain comparison is unequal or indeterminate, either input/order is indeterminate, the same-domain age interval crosses zero, or its values include both ages below 60 seconds and ages at or above 60 seconds. stale applies exactly when the same-domain resolved nonnegative age interval has lower bound at least 60 seconds; a singleton age of exactly 60 seconds is stale. fresh-for-exact-cut applies exactly when the domains are exact-equal and every value in the resolved interval satisfies `0 <= age < 60 seconds`. These branches are closed and mutually exclusive.

For a binding-continuity conclusion, the two tuple projections refer to one exact semantic position and one exact QualifiedPhysicalTimeInput occurrence. `derived-age branch=binding-self-age([0,0])` applies exactly when BindingConclusionCausality is exact-close; `general-age` is forbidden for this conclusion. Its self-difference is definitionally `[0,0]`, not the subtraction of two independently sampled uncertainty bounds. For every other conclusion family, `general-age` applies exactly on resolved exact-equal-domain inputs and `binding-self-age` is forbidden; absent applies when no permitted numeric interval exists. BindingConclusionCausality must be exact-close before binding-continuity freshness can be fresh-for-exact-cut. Proven `M<U` or `M>U` makes causality contradictory even where the generic numeric age would be below 60 seconds; unresolved order or unequal domains makes causality indeterminate; missing inputs make it unavailable. Equal-looking numeric timestamps in unequal QualifiedPhysicalTimeDomain values supply no semantic equality. These special causal checks do not change any other conclusion family's half-open `0 <= U-M < 60 seconds` rule or R10's exact-domain arithmetic.

Each IAAMeasuredCurrentnessAssertion status uses this closed precedence when multiple failures coexist: contradictory; rollback-or-fork-unresolved; compromised; revoked; changed-or-superseded; historically-unresolvable; stale; unavailable; indeterminate; equal-current. The first applicable branch is the represented status. changed-or-superseded covers unequal expected/current content or history outcome superseded-or-retired; the next four named historical branches map their identical HistoricalCurrentnessQualification outcomes; stale requires freshness=stale absent a higher branch; unavailable covers missing conclusion/cardinality, freshness=unavailable, or history=unavailable; indeterminate covers any remaining ambiguous cardinality, freshness=indeterminate, or history=indeterminate; equal-current requires every equality/cardinality, fresh-for-exact-cut, and authoritative-current condition. For binding-continuity-currentness, causality=contradictory maps to contradictory, causality=unavailable maps to unavailable, causality=indeterminate maps to indeterminate, and only exact-close can reach equal-current. IAAMeasuredCurrentnessSet is complete-equal-current exactly when every required coordinate occurs exactly once, none is injected, and every assertion is equal-current; otherwise it is non-authorizing. Full reasons remain independently emitted and are never suppressed by status precedence.

No rounding, grace, stale-while-revalidate, offline authority, cached success, provider override, IAA-selected age, deployment-selected age, profile-local default, source-count-dependent age, local-clock assumption, or cross-domain conversion exists. A received proposed 120-second policy or any value other than MeasuredConclusionMaximumAge is unknown-required-h13-semantics, cannot alter the constant, and is non-authorizing. H-13 owns the 60-second rule, exact-domain prerequisite, and interval derivation. H-11 may later realize domain-qualified trusted-time/history evidence but cannot choose, widen, or convert the semantic domain or bound.

The runtime family contains exactly one occurrence per PermissionEvaluationCoordinate across both sides. The Producer-independence family contains exactly one per ProducerIndependenceCoordinate. The source-control family contains exactly one per AbsenceSourceControlCoordinate generated for every source Producer used by a negative cell. The binding-continuity family contains exactly one occurrence per generated (Q, ProducerIncarnation, ProducerBindingStateCut, AuthorityUseCut) binding-continuity coordinate and consumes exactly one BindingConclusionCausality. The separation family contains exactly one per LocalIAASeparationKey when contexts are unequal and zero when equal. None occurs outside its exact coordinate set. Missing, duplicate, injected, or ambiguous occurrences fail under the same cardinality meanings as H02CurrentnessSet. Equal duplicate IAA binding conclusions are indeterminate and unequal duplicates are contradictory; neither is set-deduplicated. Every occurrence contains exactly one MeasuredConclusionUseFreshness, its exact qualified-time input projections/derived interval, and one HistoricalCurrentnessQualification; freshness and history are never inferred from each other. Binding continuity's M and U projections must resolve to the same one qualified-time input occurrence.

The exact IAA named by the applicable permission remains the positive content author of RuntimeCorrespondence, ProducerIndependenceMeasuredConclusion, AbsenceSourceControlMeasuredConclusion, ProducerBindingContinuityMeasuredConclusion, and IAAContextLocalSeparationConclusion. For binding continuity it authors only the closed bounded conclusion over the candidate-independent BindingBaselineUniverse, exact-coherent baseline result, and exact owner-preserving post-B population; every underlying fact and concrete bootstrap source remains separately retained under its Section 9.6/Section 11 owner. This measured authorship supplies positive authority for the conjunction “baseline coherent at B and unchanged through U” but cannot manufacture a missing source, change an actual projection, settle a direct conflict, or turn a nonexact baseline/population into an exact one. IAA attribution proves neither freshness nor current-head/revocation/rollback/fork/compromise/historical eligibility. H-13 derives freshness; H-11 later realizes history.

Each equal-current branch requires a present structurally equal expected/current IAA-authored conclusion in its exact embedded scope, fresh-for-exact-cut under the rule above, and authoritative-current history. Runtime additionally compares the complete PermissionEvaluationKey. Producer independence compares the exact proposition/P/threat/source-control/evidence population. Source control compares the exact Q/source-relative-threat-domain/source-Producer/binding/base-graph conclusion. Binding continuity compares exact Q, P, binding, candidate-independent BindingBaselineUniverse, complete concrete source populations, carried exact-coherent baseline at B, complete BindingLifecycleObservationPopulation, U, selected release/profile, IAA/registration scope, state position, and closed conclusion; it additionally requires BindingConclusionCausality=exact-close. Separation compares the exact destination LocalIAASeparationKey. A source-Connection conclusion, wrong IAA/registration/context/side/release/profile/cut/binding/universe/source/baseline/population, missing qualified time, causally unequal M/U, negative or straddling general age, stale freshness, or any non-authoritative-current history is non-authorizing.

Fresh H-13 time with superseded/noncurrent history fails. Authoritative-current history with stale/unresolved H-13 time fails. Only both passing can yield equal-current. Organization/Workspace content authority, H-11-realized governance currentness, H-07 currentness, IAA measured-content authority, H-13 measured-conclusion freshness, H-11-realized IAA-conclusion history, permission ClosureStateCut FreshnessCalculation, and Producer E01-E17 coverage remain separate systems. No one substitutes for another and no H-13 fact feeds back into Stage A.

### 13.4 RuntimeCorrespondence and complete permission coverage

RuntimeCorrespondenceMeasuredConclusion is a closed proposition population, not a prose-selected fact set:

~~~
RuntimeCorrespondenceProposition =
  RC01-permission-coordinate-projection-coherent
  | RC02-context-side-release-profile-projection-coherent
  | RC03-measurement-target-root-exact
  | RC04-runtime-member-population-complete
  | RC05-every-runtime-current-and-member
  | RC06-membership-epoch-five-closure-projection-exact
  | RC07-effective-boundary-population-complete
  | RC08-every-runtime-covered-by-an-effective-boundary
  | RC09-no-extra-runtime-boundary-resource-channel-or-edge-member
  | RC10-direct-evidence-and-source-population-complete-current-and-independent
  | RC11-contradiction-population-empty
~~~

The branch subjects and expected values are exactly:

| Branch | Exact proposition subject | Exact expected value |
|---|---|---|
| RC01 | (PermissionEvaluationCoordinate, PermissionScopeKey, IsolationBoundaryPermissionSubjectIdentity, IsolationBoundaryPermissionRevisionIdentity, IsolationAttestationAuthorityIdentity, OrganizationIAARegistrationSubjectIdentity, OrganizationIAARegistrationRevisionIdentity) | every component equals the exact expected result=applicable H-02 projection and PermissionScopeKey projection; no permission/currentness assertion is created |
| RC02 | (ExactTenantContext, ParticipantSide, selected release, selected IsolationProfile) | exact equality to the already-authoritative H-02 side/permission and H-07 Connection projections in their accepted comparison directions |
| RC03 | MeasurementTargetRoot | exact equality to the root in PermissionScopeKey and to every root from which the five mandatory local closure extents are generated |
| RC04 | exact RuntimeIncarnation candidate population | exact mathematical equality to every and only current member established by the complete runtime-members CombinedClosure |
| RC05 | one result subject for each RuntimeIncarnation in RC04 | lifecycle=current at the conclusion position and exact K01 membership in this target; an ended, replaced, extra, or unresolved member fails |
| RC06 | MembershipEpoch | exact componentwise equality to the five complete CombinedClosure values at one ClosureStateCut, with no allocated epoch identity |
| RC07 | exact effective IsolationBoundary candidate population | exact mathematical equality to the complete transitive K02/K03 boundary ancestry established by the supporting-controller/boundary closure for the RC04 member set |
| RC08 | one result subject for each RuntimeIncarnation in RC04 | at least one exact current RC07 boundary contains/covers that runtime under the complete direct boundary relation facts, with every covering relation retained |
| RC09 | (RuntimeIncarnation set, effective IsolationBoundary set, ResourceObject set, Channel set, RelationEdgeContent set) | each set equals its owning complete closure projection and contains no extra, omitted, substituted, or unresolved member/edge |
| RC10 | DirectStatements(Q), RelevantProducerSet/global intrinsic results, every binding, baseline/lifecycle universe, concrete bootstrap source/eligibility/population/direct input/composition/baseline/lifecycle population, positive IAA binding conclusion/causality/currentness/coverage/binding-currentness, and all retained coupling/threat/source-control/independence/proposition evidence | every proposition retains exact ordinary SourceAttribution downstream; every binding has candidate-independent exact-complete universes, all concrete sources/multiplicity retained without substitution, complete actual projections equal to candidate expected projections, exact baseline, complete no-change lifecycle evidence, one M=U/self-age fresh authoritative-current positive IAA baseline-plus-continuity conclusion, continuous-complete coverage, and literal currentness; retained coupling/threat/source-control/independence floors remain exact. Candidate-shrunk scope, abstract-owner-only source, missing/ineligible/rebound source, owner/source/IAA conflict, causal failure, stale/noncurrent conclusion, or cross-domain subtraction never counts |
| RC11 | complete local contradiction population | exact empty mathematical set after retaining every source identity/incarnation/class/domain/substitution conflict, same-source unequal duplicate, distinct-source unequal projection, universe/equality conflict, global intrinsic conflict, baseline/lifecycle conflict, IAA-against-direct conflict, M/U causal conflict, ordinary occurrence conflict, closure conflict, and relation contradiction; no precedence/vote removes one |

RC04, RC07, RC09, RC10, and RC11 each have one branch result whose subject is the complete exact set named in the table. RC05 and RC08 remain one required branch result each, but that result contains the exact member-indexed map over every RC04 RuntimeIncarnation; it is not an implementation-selected subset. Thus the required top-level result population remains exactly one occurrence for each of RC01-RC11.

~~~

RuntimeCorrespondencePropositionResult = (
  exact PermissionEvaluationCoordinate,
  exact RuntimeCorrespondenceProposition,
  exact proposition subject and expected value fixed by that proposition branch,
  exact eligible DirectSemanticPropositionCoordinate set,
  exact PropositionDirectSourceCoverage set for those coordinates,
  exact Producer evidence coordinate set consumed,
  verdict
)

verdict = satisfied | failed | indeterminate | not-observed | contradictory

RuntimeCorrespondenceMeasuredConclusion = (
  exact PermissionEvaluationCoordinate,
  exact PermissionScopeKey,
  exact IsolationBoundaryPermissionSubjectIdentity,
  exact IsolationBoundaryPermissionRevisionIdentity,
  exact IsolationAttestationAuthorityIdentity,
  exact OrganizationIAARegistrationSubjectIdentity,
  exact OrganizationIAARegistrationRevisionIdentity,
  ParticipantSide,
  selected IsolationProfile,
  ExactTenantContext,
  exact MeasurementTargetRoot,
  exact nonempty finite RuntimeIncarnation membership set,
  exact MembershipEpoch,
  exact effective IsolationBoundary set,
  exact ResourceObject and Channel sets,
  exact IsolationAttestationAuthorityIdentity-owned measured semantic state position,
  exact RuntimeCorrespondencePropositionResult occurrence family,
  exact proposition-to-result cardinality result,
  exact contradiction set,
  completeness verdict
)

proposition-to-result cardinality result =
  exact-one-to-one | missing | duplicate | injected | ambiguous

completeness verdict = complete-satisfied | non-authorizing

RuntimeCorrespondenceContent = (
  exact IsolationBoundaryPermissionSubjectIdentity,
  exact IsolationBoundaryPermissionRevisionIdentity,
  exact IsolationAttestationAuthorityIdentity,
  exact OrganizationIAARegistrationSubjectIdentity,
  exact OrganizationIAARegistrationRevisionIdentity,
  ParticipantSide,
  selected IsolationProfile,
  ExactTenantContext,
  exact MeasurementTarget,
  exact MembershipEpoch,
  exact RuntimeCorrespondenceMeasuredConclusion
)

RuntimeCorrespondence = (
  exact RuntimeCorrespondenceContent,
  exact correspondence semantic state position,
  exact AuthoritativeSourceAttribution owned by the exact IsolationAttestationAuthorityIdentity
)
~~~

The RC population remains closed and nonselectable. RC10 now expressly requires candidate-independent baseline/lifecycle universes, every concrete bootstrap source and raw multiplicity, exact source composition/complete-set equality, the positive bounded IAA baseline-plus-continuity conclusion, and all retained downstream evidence. RC11 expressly retains source substitution, source cardinality, distinct-source disagreement, universe/equality, direct-owner/IAA, and M/U conflicts. No candidate, provider, source, or IAA can narrow either RC population. Every other RC01-RC09 meaning, exact-once cardinality, attribution, freshness/history, and forbidden authority remains unchanged.

The measured conclusion position, RuntimeCorrespondence correspondence position, and attribution position are exactly equal. The attribution's asserted content is the complete RuntimeCorrespondenceContent. The exact IsolationAttestationAuthorityIdentity owns the RC01-RC11 conclusion content, but every Producer fact it consumes retains its Producer SourceAttribution and proposition-level independence coverage. Present use separately requires H-13 freshness and authoritative-current HistoricalCurrentnessQualification; the IAA's content attribution supplies neither. This avoids recursive evidence wrapping, does not treat the IAA as a Producer, and allocates no correspondence identity.

ApplicablePermissionSet comes only from Organization/Workspace-authored H-02 registration, boundary permission, tagged Workspace intersection, and boundary-permission-for-Connection mapping content whose exact required HistoricalCurrentnessQualification outcomes are authoritative-current in Stage A. Claimed intervals, H-13, an IAA, a Producer, runtime discovery, local mutable status, and Workspace absence cannot create or widen it.

One IsolationBoundaryPermissionRevisionIdentity corresponds to exactly one nonempty finite MeasurementTarget at one MembershipEpoch. One-to-many runtime membership is allowed. Primitive many-to-many correspondence is not. Two permission revisions may map to the same entire same-side target only through SharedGovernanceRelation. Partial overlap is forbidden.

RuntimeCorrespondenceMeasuredConclusion contains exactly RC01-RC11 and their fixed structural subjects, values, evidence coordinates, proposition coverage, cardinality, contradiction, and completeness fields. It cannot assert or determine H-02 permission/applicability/currentness, Workspace authority or currentness, H-07 Connection authority/currentness, protected detector evidence, IAAContextLocalSeparationConclusion, cross-side F04, action authority, Trust truth, a result/reason/state, or any implementation-selected subset. An unknown additional proposition is reason 031; an omitted required proposition is incomplete and cannot be normalized.

Every ApplicablePermissionMember receives a separate PermissionCoverageEvaluation even when targets coincide or lower evidence is reused. A side is complete only when its PermissionEvaluationCoordinate, PermissionEvaluationKey, PermissionCoverageEvaluation, H02PermissionCurrentnessAssertion, governance HistoricalCurrentnessQualification family, runtime-correspondence-currentness assertion, and IAA-conclusion HistoricalCurrentnessQualification projections are each exact one-to-one keyed families over its complete ApplicablePermissionSet. Distinct permission identities are never deduplicated by equal IAA, registration revision, RuntimeCorrespondence, MeasurementTarget, evidence, or result. Both host-side and agent-side are mandatory.

### 13.5 SharedGovernanceRelation

MeasurementTargetCorrespondence is the structural relation:

~~~
MeasurementTargetCorrespondence = (
  exact left MeasurementTarget,
  exact right MeasurementTarget,
  exact finite bijection between runtime members,
  exact finite bijection between effective boundaries/resources/channels,
  exact preservation result for every closure member and K edge,
  relation status
)

relation status =
  structurally-equal
  | mutually-same-physical-and-structure-preserving
  | different
  | indeterminate
~~~

Structurally-equal requires ordinary MeasurementTarget and MembershipEpoch structural equality. Mutually-same-physical-and-structure-preserving is available only inside one ExactTenantContext: every paired unequal-namespace runtime/boundary/resource conclusion satisfies Section 7's mutual rule, both target sets have equal cardinality, the mappings are bijective, and applying those mappings makes every closure set and relation equal while retaining both IAA namespaces. This relation does not make the MeasurementTarget or MembershipEpoch values themselves equal and never rewrites either identity.

SameSideTargetOverlapState is exactly:

~~~
whole-target-structurally-equal
| whole-target-mutually-same-physical
| partial-target-overlap
| target-disjoint
| target-overlap-indeterminate
| target-overlap-contradictory
~~~

The exact pair classifier input is:

~~~
SameSideTargetOverlapEvidence = (
  exact unordered pair of distinct same-side PermissionEvaluationKey values,
  exact structural MeasurementTarget equality result,
  exact complete RuntimeCorrespondence values for both targets,
  exact complete effective IsolationBoundary correspondence values,
  exact shared RuntimeIncarnation semantic subset,
  exact shared effective IsolationBoundary semantic subset,
  exact complete runtime/boundary disjointness proof populations,
  exact missing/unknown evidence population,
  exact contradictory evidence population
)
~~~

Target overlap means only runtime-member or effective-boundary semantic overlap. Resource capacity, mutable resources, Channels, governance controllers, K45, K46, workload timing, shared provider, shared environment label, or common observation source cannot create target equality or overlap. Those independent relations remain governed by their own F, closure, event, and profile rules.

The classifier uses this exact precedence, with no alternative or tie breaking:

1. any contradictory target-overlap evidence yields target-overlap-contradictory;
2. otherwise, incomplete or unresolved equality/disjointness evidence yields target-overlap-indeterminate;
3. otherwise, exact ordinary MeasurementTarget structural equality yields whole-target-structurally-equal;
4. otherwise, complete runtime and effective-boundary bijections satisfying the mutually-same-physical rules yield whole-target-mutually-same-physical;
5. otherwise, a nonempty proper shared runtime or effective-boundary subset yields partial-target-overlap; and
6. otherwise, complete runtime and effective-boundary disjointness yields target-disjoint.

K45 and K46 are not classifier inputs. In particular, exact K46(A,B,R) asserts that A and B share the same finite service-capacity ResourceObject R; it can coexist with target-disjoint and cannot require that there is no shared ResourceObject. K45 can likewise coexist with a target relation but supplies an independent isolation failure/profile fact, not equality or graph connectivity. The graph is:

~~~
SameSideTargetOverlapGraph = (
  exact SideEvaluationKey,
  exact vertex set = PermissionKeys(SideEvaluationKey),
  exact unordered-distinct-pair to SameSideTargetOverlapState map,
  exact edge set,
  exact connected-component partition
)

edge(left,right) exists exactly when state is one of:
  whole-target-structurally-equal
  | whole-target-mutually-same-physical
  | partial-target-overlap
  | target-overlap-indeterminate
  | target-overlap-contradictory
~~~

The pair map contains exactly one classification for every unordered distinct vertex pair and no other entry. The edge set is the formula above. The component partition is the unique reachability partition of that exact finite graph, with singleton components retained. No equivalence transitivity is assumed: graph reachability groups risk; it does not turn pairwise overlap or whole-target correspondence into an equivalence relation.

SharedGovernanceRelation is the structural relation:

~~~
SharedGovernanceRelation = (
  exact SideEvaluationKey,
  profile = org.ghostbridge.isolation.shared-governance-runtime.v1,
  exact non-singleton connected component G from SameSideTargetOverlapGraph,
  exact pair-indexed MeasurementTargetCorrespondence map whose domain is every unordered distinct pair in G,
  exact pair-indexed SameSideTargetOverlapState map restricted from the graph,
  exact governance ControllerIncarnation and role set,
  relation verdict
)

relation verdict =
  holds | different | partial-overlap | indeterminate | contradictory

SharedGovernanceRelationSet = (
  exact SideEvaluationKey,
  exact SameSideTargetOverlapGraph,
  exact non-singleton component set,
  exact SharedGovernanceRelation occurrence family,
  exact component-to-relation cardinality result,
  verdict
)

component-to-relation cardinality result =
  exact-one-to-one | missing | duplicate | injected | ambiguous

verdict = all-components-hold | failed | indeterminate | contradictory
~~~

Exactly one SharedGovernanceRelation occurrence exists for each non-singleton connected component and none for a singleton. No implementation may split a component into cliques, choose a spanning tree, discard an indeterminate/contradictory edge, merge disconnected components, sample pairs, or assume transitivity. Thus A-B whole-target and B-C whole-target with A-C target-overlap-indeterminate forms one three-key component and fails as a whole; it cannot become two successful two-key relations. Likewise A-B partial overlap and B-C partial overlap with A-C target-disjoint remains one connected component and fails because the complete pair map is not whole-target-correspondent.

This is the complete definition. It has no allocated identity or lifecycle. G may contain distinct permissions, IAAs, registration revisions, correspondences, and targets, including more than one IAA. A relation holds only when every key has the exact same SideEvaluationKey; its component equals exactly one graph component; both pair maps contain exactly one entry for every unordered distinct pair and no other entry; every overlap state is whole-target-structurally-equal or whole-target-mutually-same-physical; every MeasurementTargetCorrespondence has the matching whole-target status; every governance subject/revision has authoritative-current HistoricalCurrentnessQualification; every IAA conclusion is separately H-13-fresh and H-11-qualified authoritative-current; every target, controller, role, closure, and defining path is current, complete, and projection-coherent under its owning semantics; every IAA asserts only facts inside its own accepted authority; and no partial, indeterminate, contradictory, or missing relation appears inside the component. K45/K46 values are evaluated separately and neither create nor split G. These are pre-governance facts and base predicates: PermissionCoverageEvaluation and SideEvaluation are not inputs, preventing result-to-governance recursion.

It never permits cross-side runtime/boundary equality and never joins unequal ExactTenantContext values. An absent, partial, unilateral, conflicting, or stale relation is non-authorizing.

## 14. Semantic order, state cuts, coverage, and freshness

Semantic order is the strict before/equal/concurrent/after relation supplied by the eligible source meaning for the affected state domain. Every required occurrence and event must be uniquely located in that order, except that genuinely concurrent events occupy one explicit unordered concurrent set at the same position. Arrival order, display time, and document order supply no semantic order.

For each Stage-B PermissionEvaluationCoordinate Q, the event-independent cut input is:

~~~
ClosureCutEvidenceSet(Q) =
  the exact finite set of every and only non-event ObservationOccurrence whose
  observed-statement population is needed to establish Q's five ClosureKind values,
  the direct facts consumed by those closures, target membership, effective-boundary
  state, and required measured identity/lifecycle state at the measurement cut
~~~

ClosureCutEvidenceSet(Q) explicitly excludes every event-scoped ObservationScope, PermissionEventRequirementSlot, EventCoverageAssertion, EventRequirementSourcePopulation, PermissionEventCoverageSet, ConnectionEventCoverageUnion, event absence statement, event invalidation verdict, and post-cut EventOccurrence. No event population, event coverage, local event set, Connection union, or later event can select or move the cut.

ClosureStateCut is the latest common semantic state position contained in the nonempty intersection of every validity interval in ClosureCutEvidenceSet(Q). The set must be complete and nonempty before this selection. All five closure values represent state at that cut. A point occurrence is valid only at its state position; a bounded interval covers every position in its interval; a continuous series covers its exact closed series.

Only after ClosureStateCut is fixed does the evaluator generate each PermissionEventRequirementSlot and EventRequirementSourcePopulation for the exact interval `(ClosureStateCut, AuthorityUseCut]`. A later event cannot feed back into the chosen cut. If it invalidates a closure, the present evaluation is non-authorizing; a subsequent evaluation must independently establish a new complete ClosureCutEvidenceSet and cut.

Each PermissionEventCoverageSet must be continuous-complete from that permission's ClosureStateCut through AuthorityUseCut with zero positive gap. An event invalidates only every exact permission-local closure/F coordinate in its affected closure/F invalidation set; it cannot be hidden by a complete assertion belonging to another permission. FreshnessCalculation consumes only that permission's already-fixed ClosureStateCut, AuthorityUseCut, and qualified time uncertainty, never an event coordinate, Connection aggregate, or another permission's cut. Event absence and freshness are independent; the local PermissionCoverageEvaluation requires both. F15 consumes the independently fixed cut and post-cut local event population but cannot derive or revise the cut.

PermissionClosureMaximumAge is the immutable accepted 60-second rule:

~~~
0 <= physicalTime(AuthorityUseCut) - physicalTime(ClosureStateCut) < 60 seconds
~~~

FreshnessCalculation is:

~~~
FreshnessCalculation = (
  exact PermissionEvaluationKey,
  ClosureStateCut,
  AuthorityUseCut,
  exact QualifiedPhysicalTimeInput(ClosureStateCut),
  exact QualifiedPhysicalTimeInput(AuthorityUseCut),
  exact QualifiedPhysicalTimeDomainComparison,
  tagged derived age uncertainty interval absent | present(exact interval),
  verdict
)

verdict = fresh | stale | unavailable | indeterminate | contradictory
~~~

Fresh requires QualifiedPhysicalTimeDomainComparison=exact-equal and every possible age in the derived interval to satisfy the half-open inequality. The age interval is not formed when the domains are unequal, unavailable, indeterminate, or contradictory.

The entire same-domain qualified time-uncertainty interval must satisfy the half-open inequality. With contradiction precedence, contradictory applies to contradictory time/domain attribution, an empty/inconsistent interval, a definitely reversed cut order, or a resolved same-domain interval strictly below zero; unavailable applies to a missing/unavailable required input/domain/interval absent contradiction; indeterminate applies to unequal/indeterminate domains, unresolved order, an interval crossing zero, or an interval straddling 60 seconds; stale applies only on exact-equal domains when the nonnegative interval lower bound is at least 60 seconds; and fresh applies only on exact-equal domains when every age satisfies the half-open rule. Exactly 60 seconds is stale. No grace, rounding, conversion/offset, stale-while-revalidate, cached success, emergency path, or offline authority exists. H-13 defines this time/domain meaning; H-11 later realizes trusted-time/domain and historical evidence but does not choose the bound or cross-domain relation.

FreshnessCalculation(ClosureStateCut,AuthorityUseCut) and MeasuredConclusionUseFreshness(IAAConclusionStatePosition,AuthorityUseCut) are distinct semantic objects with distinct coordinates, populations, dependencies, and authorization effects. They intentionally share the same initial-profile 60-second half-open bound, but neither contains, derives, repairs, or substitutes for the other. The former qualifies the permission closure measurement cut; the latter qualifies each exact IAA-authored conclusion state position. HistoricalCurrentnessQualification is independently required in addition to either H-13 freshness result.

Every generic measured-position M/U freshness example, including T01-T06 and X01-X09 in Section 25, is scoped only to measured-conclusion families using `general-age` unless its row expressly says otherwise. T07 alone is the distinct ClosureStateCut freshness permission case. ProducerBindingContinuityMeasuredConclusion is tested only by the binding-specific Y09-Y15 and Z/R13 causality cases: semantic M must equal U, its sole well-formed derived age is `binding-self-age([0,0])`, and M<U cannot pass merely because a general age would be less than 60 seconds.

## 15. Universally quantified F01-F16 predicates

FactVerdict is exactly satisfied, failed, indeterminate, not-observed, or not-applicable. Every F01-F16 predicate applies to all three initial profiles. not-applicable is prohibited. A complete empty typed set satisfies an applicable universal predicate; it is not not-applicable.

FactEvaluation is the closed tagged union:

~~~
FactEvaluation =
  permission-fact(
    family = F01 | F02 | F03 | F05 | F06 | F07 | F08
      | F09 | F10 | F11 | F12 | F13 | F14 | F15 | F16,
    exact PermissionEvaluationKey,
    exact predicate from the table below,
    exact IsolationObservationUniverse consumed,
    exact required immediate dependency-coordinate set from Section 22,
    FactVerdict
  )
  | connection-f04(
    family = F04,
    exact ConnectionEvaluationKey,
    exact required F04PairKey set,
    exact F04PairEvaluation set,
    exact predicate from the table below,
    exact required immediate dependency-coordinate set from Section 22,
    FactVerdict
  )

F04PairEvaluation = (
  exact F04PairKey,
  exact required same-context equivalence inputs
    | exact required unequal-context detector-disposition, IAA-conclusion, and IAA-currentness inputs,
  FactVerdict
)
~~~

It is structural and has no allocated identity. There is exactly one permission-fact for every listed family and every PermissionEvaluationKey. There is exactly one connection-f04 whose required pair-key set is the Cartesian product defined in Section 4 and whose pair-evaluation projection is exactly one-to-one with that set. A missing, duplicate, injected, or ambiguously keyed pair fails completeness. The F04 verdict is failed when any pair failed, indeterminate when none failed and at least one is indeterminate/not-observed, and satisfied only when every pair is satisfied. The dependency-coordinate fields must equal Section 22's generated exact minimal immediate sets; they are not implementation-supplied relevance lists.

| ID | Exact predicate |
|---|---|
| F01 | At this exact permission coordinate, every semantic identity equals its authoritative source value; the Stage-A applicable H02IsolationApplicabilityProjection and its source-specific OrganizationRegistrationApplicabilityInput, BoundaryPermissionApplicabilityInput, and exact branch-appropriate Workspace inputs remain unchanged and projection-coherent; no synthetic/default cross-source field participates; every endpoint resolves to exactly one current member of its typed closure; and every repeated ExactTenantContext, ParticipantSide, Connection, release, profile, IsolationBoundaryPermissionSubjectIdentity, IsolationBoundaryPermissionRevisionIdentity, IsolationAttestationAuthorityIdentity, OrganizationIAARegistrationSubjectIdentity, and OrganizationIAARegistrationRevisionIdentity is universally projection-coherent. Values at unrelated per-permission coordinates are not required to equal. |
| F02 | For every target, complete K02/K03 ancestry is closed; every K04 source is an S02 SupportingController with a nonempty exact role set; every role has a defining edge; every role-controlled edge remains under a K04 boundary descendant; and no bypass exists. K04 itself is structural. |
| F03 | All five CombinedClosure values are complete, finite, mutually coherent, at the event-independent ClosureStateCut, cover the entire observation universe, and preserve every primitive direct owner/SourceAttribution. RelevantProducerSet(Q), every global ProducerIntrinsicContinuity result, every ProducerSourceSurfaceBinding with an exact-complete candidate-independent BindingBaselineUniverse, complete-enumerated concrete bootstrap source populations, exact-coherent baseline at B, and exact-complete direct-owner BindingLifecycleObservationPopulation, one M=U causally valid bounded positive IAA baseline-plus-continuity conclusion/currentness, continuous-complete ProducerBindingEventCoverage, and literally current ProducerSourceSurfaceBindingCurrentness through AuthorityUseCut, the full all-pairs ProducerControlCouplingPopulation, ProducerThreatControlDomain, every required AbsenceSourceThreatControlDomain and AbsenceSourceControl conclusion/currentness, ProducerInfluenceThreatSet, and TechnicalInfluenceEvidencePopulation are exact-complete. Every required proposition has independently-covered PropositionDirectSourceCoverage backed by exact IAA-authored conclusions whose QualifiedPhysicalTimeDomain comparisons are exact-equal, applicable freshness is fresh, and history is authoritative-current. |
| F04 | Every exact F04PairKey establishes different runtime and effective-boundary targets; exclusive-environment also establishes required environment separation. Equal-context pairs use mutual Section 7 equivalence. Unequal-context pairs use the two exact independently IAA-authored Section 12 conclusions selected by their LocalIAASeparationKey memberships, each separately H-13-fresh and H-11-qualified authoritative-current, while detector evidence supplies only a negative narrowing gate. Unsafe fails; indeterminate is non-authorizing. |
| F05 | Every K08-K19, K31, K35, K47, or K48 source affecting a target/boundary/resource/channel is exact S02, K04-connected, and permitted by its role union; no other subject class has such an edge. The exact Q-scoped coupling/source-surface population is complete, every surface binding has a candidate-independent complete baseline universe, complete concrete source enumeration, an exact cross-owner baseline at B, and literal currentness through AuthorityUseCut under complete owner-preserving post-B evidence and one causally valid fresh authoritative-current bounded IAA conclusion positively binding baseline coherence plus continuity. No Q-scoped coupling state allocates or replaces ProducerIncarnation. For every Producer counted by PropositionDirectSourceCoverage or used as a negative source, no threat member/controller/resource path reaches its currently bound O09/O10 surfaces unless the applicable conclusion is inside-control and nonpositive. K49/K45/indirect control, candidate-shrunk universe, source substitution, baseline or owner/source/IAA conflict, missing source/owner evidence, causal failure, noncurrent/stale bindings/conclusions, and unresolved source-control paths fail; K44 never grants a controller role. |
| F06 | For every nonmember subject and target, no K20-K24 edge exists in either direction except K23 segments of one exact compatible protocol-mediated message channel dominated by its EnforcementGate. |
| F07 | For every nonmember and target-attached storage object, no K25-K27 or K45 path exists. Separate immutable copies are distinct resources; common readable or mutable storage is exposure. |
| F08 | Every K28-K30 boundary-crossing edge is an exact compatible mediated-channel segment; every K31 source is an S02 resource-state-enforcer; every S07 path is gate-dominated; no S07 direct path or relevant S08 path exists. |
| F09 | No external subject has K32-K35 or K45 to a target or its device/resource. K46 is forbidden for exclusive-environment; for the other profiles it is allowed only under Section 11.3 with no K20-K45/K49 path. |
| F10 | No external subject has K36-K39 or K45 into, out of, or between target namespaces/environment objects. Controller powers remain Section 10-limited; K44 metadata observation grants no namespace access. |
| F11 | No external subject or SupportingController has K40-K44 to target content/execution surfaces. An S03 may have K44 only, excluding content, execution state, memory, and mutable configuration. |
| F12 | Every mutable object/relation/controller capable of altering F01-F11 or F13-F16 is in this permission's established closures, and this permission's already-established PermissionEventCoverageSet contains one exact continuous-complete EventRequirementSourcePopulation for every generated PermissionEventRequirementSlot through AuthorityUseCut. Every slot's policy is the catalogue constant independently-complete-source. No ConnectionEventCoverageUnion, preferred Producer, cross-Producer partial interval/domain union, provider/IAA/configuration policy request, unknown policy token, or other permission's assertion can satisfy it. |
| F13 | Physical environment/resident closure is complete; the selected profile's resident rule holds; all K05/K06/K45/K46 facts and, for unequal contexts, the applicable local detector disposition and exact IAAContextLocalSeparationConclusion are evaluated. Detector evidence alone never supplies positive truth. |
| F14 | Every required DirectSemanticPropositionCoordinate has an exact eligible Producer/class/domain/occurrence/SourceAttribution with exact O09/O10 binding whose candidate-independent baseline universe is exact-complete, whose concrete bootstrap source populations are complete-enumerated without substitution, whose cross-owner baseline is exact-coherent at B, and whose binding verdict is literally current for the exact current ProducerIncarnation through AuthorityUseCut under complete direct-owner lifecycle coverage, one consistent M=U fresh authoritative-current bounded positive IAA baseline-plus-continuity conclusion, and continuous-complete H-13 binding-event coverage. Every raw negative cell has a direct owner/source Producer and AbsenceSourceAdmissibility; derived path absence has no invented owner. RelevantProducerSet, all coupling pairs, source-control/threat/evidence populations, IAA conclusion/currentness families including binding continuity, exact-equal QualifiedPhysicalTimeDomain comparisons, applicable freshness, authoritative-current history, and PropositionDirectSourceCoverage are exact/complete/conflict-free. No candidate-selected verification extent, abstract-owner-only source, source substitution, baseline or owner/source/IAA conflict, missing owner/source domain, causal failure, noncurrent/stale binding/conclusion, self/threat-member/secondary-controlled source, incomplete surface/path/coupling population, composite, comparison-only source, label, selected traversal, or cross-domain subtraction satisfies the floor. |
| F15 | Every fact has an eligible occurrence; ClosureCutEvidenceSet is complete and has a nonempty common validity intersection whose latest position is ClosureStateCut; the cut has no event dependency; and this permission's already-established EventRequirementSourcePopulation family has the catalogue-fixed independently-complete-source policy with at least one same-candidate complete eligible source spanning without gap from that fixed cut through AuthorityUseCut. Cross-candidate partial unions never satisfy the predicate. |
| F16 | Every semantic input required by the selected profile is present/resolved: exact Stage-A H-02 content/real-owner/history inputs; RC01-RC11; identities and one producer-lifecycle-scoped ProducerIntrinsicContinuity per lifecycle coordinate; frozen RelevantProducerSet; ProducerSourceSurfaceBinding; candidate-independent BindingBaselineUniverse and BindingLifecycleUniverse; every concrete BindingBootstrapSourceCoordinate/eligibility/candidate population; every BindingBaselineOwnerSlot/expected projection/direct input/composition, BindingBaselineObservationPopulation, and ProducerSourceSurfaceBindingBaseline; every BindingLifecycleOwnerSlot/direct input and BindingLifecycleObservationPopulation; positive bounded ProducerBindingContinuityMeasuredConclusion, BindingConclusionCausality, and currentness; ProducerBindingEventCoverage; ProducerSourceSurfaceBindingCurrentness; ProducerCouplingBaseGraph and complete all-pairs states; ProducerThreatControlDomain and every AbsenceSourceThreatControlDomain; DirectCell/derived-path/source-control/threat/evidence populations; exact IAA-authored conclusions; QualifiedPhysicalTimeInput, QualifiedPhysicalTimeDomainComparison, applicable fixed MeasuredConclusionUseFreshness, and HistoricalCurrentnessQualification inputs/results; PropositionDirectSourceCoverage; closed sets/facts/closures/occurrences/edges; detector/separation inputs; constant event-policy and local event populations; equivalence; and uncertainty. It does not inspect later H02/IAA aggregate currentness verdicts, permission FreshnessCalculation except through an expressly required closure-freshness input, reuse, other F nodes, reasons, states, decisions, result completeness, or provenance. |

Quantification covers both exact ParticipantSide values, every non-deduplicated IsolationBoundaryPermissionRevisionIdentity, every PermissionEvaluationKey, every member of each finite closure, every permitted source/object pair, every stored direction, every F04PairKey, and every protected comparison required by the Connection. A generic isolation=true, product label, certification, or subset sample satisfies none of F01-F16.

## 16. Protocol-mediated message channel and the one MediatedChannelPair definition

EnforcementGate is the structural value:

~~~
EnforcementGate = (
  exact S02 ControllerIncarnation,
  role = protocol-message-gate,
  exact K04 IsolationBoundary,
  exact side-local Channel,
  exact local endpoint set,
  exact closed gate configuration state
)
~~~

It has no separate identity. Equality is structural.

The only initial isolation-crossing channel class is protocol-mediated-message-channel. One side-local segment is compatible only when:

1. it is in the exact closed Channel set and binds the exact selected logical interface and endpoints;
2. its EnforcementGate is exact S02 with protocol-message-gate, K04, and K47/K48 as direction requires;
3. every inbound K23/K28-K30/K47 path terminates at the gate before target receipt and every outbound K23/K28-K30/K48 path originates through it;
4. no alternate K20-K45/K49 path carries the same content, effect, or control around the gate;
5. closed gate state prevents transfer unless the independently accepted current authorization model authorizes the exact Connection-bound action at that cut;
6. every transfer binds to that exact current decision;
7. the channel grants no K20-K22, K24-K27, K32-K43, K45, or K49 exposure;
8. gate, role, configuration, endpoints, and paths have complete closure and E01-E17 coverage; and
9. authorization failure or indeterminacy leaves the gate closed.

DirectionalEndpointRelation is separate from ParticipantSide:

~~~
DirectionalEndpointRelation = (
  direction = host-to-agent | agent-to-host | bidirectional,
  exact host-side local endpoint role,
  exact agent-side local endpoint role,
  exact mapping of inbound/outbound segment to selected logical interface
)
~~~

It describes routing/message flow only. It does not rename, alias, or determine ParticipantSide.

MediatedChannelPair is defined exactly once, here:

~~~
MediatedChannelPair = (
  exact Connection,
  exact selected logical interface,
  exact host-side Channel,
  exact host-side EnforcementGate,
  exact agent-side Channel,
  exact agent-side EnforcementGate,
  exact DirectionalEndpointRelation
)
~~~

Equality is exact structural equality of all seven components. Every repeated Connection, ExactTenantContext, ParticipantSide, release, selected-interface, channel, endpoint, boundary, and controller component must satisfy H-02 universal projection coherence. A changed component creates an unequal relation.

MediatedChannelPair has no allocated identity, lifecycle, permission, authority, mediator identity, transport identity, or governance power. H-04/H-07 interface selection supplies eligibility only and waives no predicate.

## 17. Profile-specific structural rules

### 17.1 Exclusive environment

For each side, the exact PhysicalResident set equals that side's target RuntimeIncarnation set union the SupportingController set needed to enforce it. S03 observes only from outside through a closed K44 telemetry surface. No S04 or external S07/S08 is resident. No external K45 or K46 exists. Host-side and agent-side runtime sets, effective boundaries, and physical environments are established separated by Section 12 when contexts differ or Section 7 when equal.

### 17.2 Partitioned environment

Non-target residents and K46 may exist. Every target has a distinct effective boundary. Host-side and agent-side runtime sets and effective boundaries are established separated. No non-target/external subject has a forbidden K20-K45/K49 path across the boundary. K46 is allowed only under Section 11.3; its closed ResidualCapacityInfluence remains an accepted and acknowledged security/privacy residual. Physical dedication never substitutes for path predicates. Acceptance acknowledges this residual; it does not claim that the risk is solved.

### 17.3 Shared-governance runtime

All partitioned-environment rules apply. The only added permission is same-side sharing of one entire target classified whole-target-structurally-equal or whole-target-mutually-same-physical for every pair, by multiple distinct IsolationBoundaryPermissionSubjectIdentity values under the exact SharedGovernanceRelation in Section 13.5. Partial, indeterminate, contradictory, or merely K45/K46-related targets are not eligible. Cross-side runtime/boundary equality and unequal-context governance joining remain forbidden.

## 18. Privacy, presentation surfaces, and one-Connection scope

PresentationSurfaceClass is exactly:

~~~
tenant-visible-evidence
trust-result
connection-result
context-visible-history
protected-internal-detector
ordinary-telemetry-or-public-error
~~~

All runtime, boundary, controller, resource, Channel, producer, concrete bootstrap-source, baseline/lifecycle-universe, occurrence, closure, provenance, and result references are context-private and nonrecyclable at protocol-visible surfaces. Universe/source populations are retained only inside the exact Q/side/context/binding evaluation and a context-visible projection may safely collapse them only after the protected candidate/decision is fixed. No protected stable carrier/reference/link may compare equal across unequal ExactTenantContext values unless an accepted upstream requirement mandates equality for that exact field/value. Same provider, physical resource, IAA, key, algorithm, product, or convenience is not an exception.

| Surface | Exact privacy rule |
|---|---|
| tenant-visible-evidence | exact context-bound value; no global physical/producer/other-tenant link |
| trust-result | safe context-bound verification category/reference only; Trust creates no measured truth or authority |
| connection-result | bound to exact Connection and context projections; unusable for another Connection |
| context-visible-history | context-local semantic facts/dependencies only; no cross-context stable link |
| protected-internal-detector | Section 12's minimum internal correlation, detector evidence disposition, and exact IsolationAttestationAuthorityIdentity-authored context-local conclusion only; detector evidence is not positive authority |
| ordinary-telemetry-or-public-error | no raw tenant/runtime/producer/machine/resource/evidence identifier or detector detail |

One ConnectionIsolationEvaluation binds one exact Connection. It cannot be pooled, widened, joined, or replayed. Both sides remain mandatory within that Connection. Privacy-safe public error collapse never deletes reasons from the protected internal evaluation.

## 19. Bounded lower-evidence reuse

LowerMeasurementEvidence is the exact finite structural set of eligible ordinary Producer direct facts, observation semantics, Producer closure member sets, relation contents, and same-context equivalence conclusions below a PermissionCoverageEvaluation. It excludes every RelevantProducerSet, global ProducerIntrinsicContinuity result, ProducerSourceSurfaceBinding, BindingBaselineUniverse, BindingLifecycleUniverse, BindingBootstrapSourceCoordinate/eligibility/source population, baseline/lifecycle slot/direct attribution/observation/composition/population/verdict, ProducerBindingContinuityMeasuredConclusion/currentness/coverage/binding-currentness, and every coupling, threat, source-control, independence, freshness, history, proposition-coverage, event-coverage, governance, or result wrapper defined in this document. No source universe, concrete bootstrap identity, baseline, causal/currentness verdict, or Connection/cut-specific conclusion is reusable lower evidence.

It also excludes every ProtectedPhysicalLocator, protected raw sensing statement, ProtectedDetectorSourceAssertion, ProtectedSensingReuse, ProtectedDetectorEvidenceDisposition, IAAContextLocalSeparationConclusion, separation-currentness assertion, F04PairEvaluation, connection F04, and any F13/F16 or other derived value that depends on them. No direct or transitive Connection/cut-specific separation conclusion can therefore enter ordinary lower-evidence reuse.

ReuseProducerCorrespondence is the structural same-context relation:

~~~
ReuseProducerCorrespondence = (
  exact source ProducerIncarnation,
  exact destination ProducerIncarnation,
  exact equal ProducerClass and direct-source domain,
  exact equal observation mechanism/scope conclusion,
  exact source and destination ProducerIntrinsicContinuity results,
  exact current source and destination ProducerSourceSurfaceBinding values with
    exact-complete BindingLifecycleObservationPopulation, fresh authoritative-current
    ProducerBindingContinuityMeasuredConclusion, continuous-complete
    ProducerBindingEventCoverage through each destination use cut,
  exact IAA-authored lifecycle conclusions with fresh-for-exact-cut over exact-equal
    QualifiedPhysicalTimeDomain values and authoritative-current status from both scopes,
  exact fresh Q-scoped Producer/coupling/source-control/threat/evidence/conclusion/currentness/history/coverage populations for both scopes,
  status
)

status =
  mutually-corresponding
  | different
  | indeterminate
~~~

Mutually-corresponding requires both IAAs, within one ExactTenantContext, to bind their distinct enrolled ProducerIncarnations to the same eligible physical observation mechanism and exact equal source domain/scope at the destination cut. It does not make their Producer identities equal. It is prohibited across unequal ExactTenantContext values.

ReuseProvenance is:

~~~
ReuseProvenance = (
  exact destination PermissionEvaluationKey,
  exact source LowerMeasurementEvidence set,
  exact source lower occurrence/closure semantics with permission-bound coverage wrappers omitted,
  exact source PermissionEvaluationKey and PermissionScopeKey,
  exact destination PermissionEvaluationKey and PermissionScopeKey,
  exact source and destination IsolationBoundaryPermissionSubjectIdentity,
  exact source and destination IsolationBoundaryPermissionRevisionIdentity,
  exact source and destination IsolationAttestationAuthorityIdentity,
  exact source and destination OrganizationIAARegistrationSubjectIdentity,
  exact source and destination OrganizationIAARegistrationRevisionIdentity,
  exact ReuseProducerCorrespondence set when IsolationAttestationAuthorityIdentity differs,
  exact result of each condition below,
  destination AuthorityUseCut
)
~~~

It is structural, has no allocated identity/lifecycle, and exists only when reuse is attempted. A failed/indeterminate condition remains present and emits reason 028.

Lower evidence may be reused across Connections and, within one equal ExactTenantContext, across different IAA namespaces only when all conditions hold:

1. selected release, IsolationProfile, ExactTenantContext, and ParticipantSide are semantically equal;
2. source/destination RuntimeIncarnation values are equal inside one namespace, or distinct IAA namespaces have a mutual same-physical-incarnation relation under Section 7 whose IAA-authored conclusions are separately H-13-fresh and H-11-qualified authoritative-current;
3. source/destination MeasurementTargets have an exact mutually-same-physical-and-structure-preserving MeasurementTargetCorrespondence; ordinary equality is sufficient when the namespace is unchanged;
4. source/destination MembershipEpoch values are equal when their namespaces are equal, or their exact closure graphs correspond under that relation while both unequal IAA scopes remain explicit; when IAA differs, every Producer has mutually-corresponding ReuseProducerCorrespondence and all facts, predicates, occurrences, and direct-source attributions correspond without identity merging;
5. destination-bound evaluation freshly resolves global ProducerIntrinsicContinuity, RelevantProducerSet, every O09/O10 binding, a destination-generated candidate-independent BindingBaselineUniverse and BindingLifecycleUniverse, every concrete bootstrap source/eligibility/population/direct input/composition, exact baseline, post-B population, and bounded positive ProducerBindingContinuityMeasuredConclusion/currentness/freshness/history before literal binding currentness; it then resolves the retained coupling/threat/source-control/independence/proposition/closure and constant-policy ordinary-event populations. No source universe, source identity, baseline, or binding verdict is rebound from the source evaluation;
6. permission ClosureStateCut freshness and every destination IAA MeasuredConclusionUseFreshness independently satisfy their fixed half-open 60-second rules only after exact QualifiedPhysicalTimeDomainComparison=exact-equal; every destination binding-continuity conclusion additionally has fresh exact-close M=U causality and zero self-age; no invalidating event occurred, and no source-domain conversion, prior time comparison, baseline, causal verdict, or prior binding-currentness verdict is reusable;
7. distinct source/destination H-02/H-07 and every IAA runtime/Producer/source-control/separation currentness assertion are present/equal-current; every governance/IAA history qualification is independently authoritative-current and no content authentication substitutes for fixed H-13 freshness;
8. no Connection-owned value, IsolationBoundaryPermissionSubjectIdentity, IsolationBoundaryPermissionRevisionIdentity, IAA/registration projection, RuntimeCorrespondence, MeasurementTarget, or PermissionEvaluationKey is supplied by lower evidence;
9. privacy bindings remain inside one ExactTenantContext and no protected cross-context carrier/link is reused;
10. every conflict and comparison is retained in ReuseProvenance; and
11. every destination Q resolves fresh destination global intrinsic continuity, surface binding, baseline/lifecycle universes, concrete bootstrap-source coordinates/eligibility/populations, baseline inputs/composition/population/verdict, post-B inputs/population, positive IAA binding conclusion/causality/currentness/coverage/binding-currentness, and all retained downstream coupling/threat/source-control/direct/derived/admissibility/independence/time/proposition/event/F/PCE/reason/provenance/result values.

Connection, IsolationAttestationAuthorityIdentity, OrganizationIAARegistrationSubjectIdentity, OrganizationIAARegistrationRevisionIdentity, IsolationBoundaryPermissionSubjectIdentity, IsolationBoundaryPermissionRevisionIdentity, and AuthorityUseCut are therefore allowed and expected to differ only where this rule explicitly permits it; none is supplied by lower evidence and an unchanged SideEvaluationKey is not required. Same lineage/different incarnation, similar configuration/provider, old proof validity, or cache hit is insufficient.

Cross-context protocol evidence reuse is prohibited. A source permission's independence or event-coverage wrapper is never rebound to a destination permission, including within the same Connection; computationally reused lower observations must be re-attributed and re-evaluated into fresh destination proposition and event objects. Protected raw sensing reuse occurs only through Section 12.5, outside LowerMeasurementEvidence and ReuseProvenance. It always constructs destination-bound protected source assertions and disposition, fresh destination IAA conclusions/currentness, fresh pair evaluations, and fresh aggregate F04. A source disposition or IAA conclusion is never rebound. A prior Connection result is never reusable, even when all ordinary lower evidence is eligible.

## 20. Deterministic reason model

SemanticReason is:

~~~
SemanticReason = (
  rank and exact ReasonClass,
  exact ReasonScope,
  tagged FactFamily absent | present(F01..F16)
)

ReasonScope =
  connection-scope(exact ConnectionEvaluationKey)
  | side-scope(exact SideEvaluationKey)
  | h02-applicability-scope(exact H02ApplicabilityCandidateCoordinate)
  | permission-scope(exact PermissionEvaluationCoordinate)
  | local-iaa-scope(exact LocalIAASeparationKey)
  | f04-pair-scope(exact F04PairKey)
  | governance-component-scope(
      exact SideEvaluationKey,
      exact connected-component PermissionEvaluationKey set
    )
~~~

All true reasons are included as a mathematical set. The exact trigger-instance population and dependencies are closed in Section 22. A fault at two H-02 applicability candidates, two permission coordinates, two local IAAs, two F04 pairs, or two governance components produces two distinct reasons and cannot set-deduplicate at side scope. h02-applicability-scope is valid only for one exact Stage-A candidate; governance-component-scope is valid only for an exact component of that side's SameSideTargetOverlapGraph. For ranks 017-019, one tuple is emitted for each affected exact FactEvaluation coordinate; an F04 pair fault uses f04-pair-scope and present(F04). Rank 008 emits a family-qualified tuple for each contradictory FactEvaluation and an unqualified tuple at the narrowest canonical scope for every contradictory Stage-A projection, closure, relation, event, detector disposition, IAA conclusion, or cross-family pair. Discovery and presentation order never affect the set.

| Rank | ReasonClass | Exact trigger |
|---|---|---|
| 001 | wrong-connection | authoritative Connection absent/unequal, repeated Connection projection unequal, or current H-07 Connection replaced |
| 002 | wrong-tenant-context | Organization absent/invalid/unequal; Workspace tag absent/invalid/unequal; workspace-present lacks/equates wrong Workspace; workspace-absent carries any Workspace state/overlay identity or exact-workspaces registration scope; workspace-present uses workspace-absent-only registration scope; or any static ExactTenantContext/applicability branch projection conflicts. workspace-absent itself is valid |
| 003 | privacy-carrier-violation | protected carrier/link equals across unequal contexts without the exact H-02 exception; detector detail/carrier discloses or authorizes; or protected detector output exceeds Section 12 |
| 004 | wrong-participant-side | ParticipantSide absent, outside host-side/agent-side, or unequal in any subject/permission/target/fact/result projection |
| 005 | wrong-permission-or-correspondence | an expected/current applicable projection becomes denied/outside-ceiling, any Stage-A projection is wrong-scope/contradictory/widened, a denied/outside candidate is offered as Stage-B authority, or IsolationBoundaryPermissionSubjectIdentity, IsolationBoundaryPermissionRevisionIdentity, IsolationAttestationAuthorityIdentity, OrganizationIAARegistrationSubjectIdentity, OrganizationIAARegistrationRevisionIdentity, or RuntimeCorrespondence is absent, outside the exact applicable coordinate, or statically unequal; a legitimate Stage-A denied/narrowed exclusion alone emits no reason; temporal currentness uses 029 |
| 006 | wrong-runtime-subject | target differs from MeasurementTarget or required current equal/same-physical relation does not hold |
| 007 | wrong-profile-or-release | selected profile/release absent, unsupported, unresolvable, or unequal |
| 008 | projection-or-measured-fact-contradiction | eligible nonidentity projections, direct facts, closures, edges, binding universes, concrete bootstrap-source attributions, baseline/lifecycle inputs, ordinary events, detector dispositions, IAA conclusions, or derived facts cannot all be true; specifically candidate expected versus complete actual projection is unequal, distinct concrete sources conflict, Producer A content is rebound to B, an IAA claims coherent/unchanged against a retained baseline/source conflict or positive change, or causality proves M before/after U while the conclusion claims through U |
| 009 | identity-or-equivalence-contradiction | identity, lifecycle, or equal-context equivalence conclusions conflict |
| 010 | history-unresolvable-rollback-or-fork | any required governance or IAA HistoricalCurrentnessQualification, including binding-continuity conclusion history, is rollback-or-fork-unresolved or historically-unresolvable; or required baseline-at-B, lifecycle/bootstrap/ordinary occurrence/closure/event history or M/U semantic order is nonunique, reversed, divergent, corrupt, or historically unresolvable. This is H-13 failure meaning only; it defines no H-11 record, proof, predecessor/current-head encoding, trusted clock, storage, signature, digest, or anti-rollback mechanism |
| 011 | producer-unknown-ineligible-or-substituted | required Producer identity/incarnation/class/scope, including any concrete BindingBootstrapSourceCoordinate, is absent, ineligible, ended, replaced, wrong-scope, ambiguous, or substituted; same class/domain/content/provider never repairs unequal source identity/incarnation |
| 012 | producer-independence-failed | any required proposition lacks independently-covered coverage; RelevantProducerSet, global ProducerIntrinsicContinuity, surface binding, candidate-independent baseline/lifecycle universe, concrete bootstrap-source population, exact baseline at B, lifecycle population, bounded positive IAA baseline-plus-continuity conclusion/causality/currentness, total binding mapping, or coupling population is incomplete, nonexact, conflicting, or noncurrent; any threat/source-control/path/evidence population is incomplete/conflicting; a negative primitive lacks admissible source-control qualification; classified P, a threat member, or a threat-controlled secondary Producer is the sole absence source; a qualifying K45/K49/indirect/coupling path is present; any IAA binding/source-control/independence conclusion is nonpositive, causally invalid, indeterminate, contradictory, unavailable, stale, or historically noncurrent; or only a candidate-shrunk universe, abstract-owner-only source, substituted source, stale/noncurrent binding, producer-only baseline claim, self-claim, provider label, composite/derived-path owner, cross-domain arithmetic, comparison, nonowner source, or selected traversal is offered |
| 013 | runtime-membership-closure-incomplete | runtime-members CombinedClosure incomplete, nonfinite, nonexact, or unreconciled |
| 014 | controller-or-boundary-closure-incomplete | controller/boundary CombinedClosure incomplete or controller/ancestor/role unclosed |
| 015 | environment-residency-closure-incomplete | environment/resident CombinedClosure incomplete or relation unclosed |
| 016 | resource-channel-or-relation-closure-incomplete | resource/channel/relation CombinedClosure incomplete, relation type-signature invalid, primitive direct attribution missing, typed source/object pair omitted, ProducerIntrinsicContinuity or O09/O10 binding/cut/membership malformed, BindingBaselineUniverse/BindingLifecycleUniverse member or completeness malformed, concrete bootstrap source/class/domain/incarnation/cardinality malformed, baseline slot/expected/actual/direct-attribution/composition malformed, lifecycle slot/direct-attribution/before-after projection malformed, canonical EventOccurrence or ordinary SourceAttribution offered as bootstrap authority, binding/baseline/conclusion-causality occurrence missing/duplicate/ambiguous, required coupling/source-control cell omitted, or derived path is offered as a primitive owned fact |
| 017 | required-fact-incomplete | applicable F01-F16 absent, not-observed, or illegally not-applicable |
| 018 | required-fact-indeterminate | applicable F verdict indeterminate without direct contradiction |
| 019 | required-fact-unsatisfied | applicable F verdict failed |
| 020 | coverage-partial | required PermissionEvaluationKey, PermissionCoverageEvaluation, side evaluation, F04PairEvaluation, or exact one-to-one relation is absent/incomplete while membership is known |
| 021 | coverage-unknown-membership | applicable permission, target membership, or RuntimeCorrespondence cannot be exact and complete |
| 022 | unexpected-duplicate-runtime | a SameSideTargetOverlapGraph component has partial, indeterminate, contradictory, or otherwise unpermitted overlap; same-side targets overlap outside a holding exact component relation; cross-side sameness is established; or a protected detector disposition/IAA conclusion reports unsafe-same-runtime or unsafe-same-boundary |
| 023 | shared-governance-condition-failed | any non-singleton graph component lacks exactly one holding SharedGovernanceRelation, any complete pair state/correspondence/governance condition is false or indeterminate, or a candidate component is split/merged/sampled |
| 024 | occurrence-or-time-indeterminate | required occurrence/cut/order/common interval is unresolved; BindingConclusionCausality is unavailable, indeterminate, contradictory, proves M unequal to U, or is offered equal only through numeric timestamp appearance; or any permission FreshnessCalculation or MeasuredConclusionUseFreshness has missing/unavailable/indeterminate/contradictory QualifiedPhysicalTimeInput or QualifiedPhysicalTimeDomainComparison, unequal domains, negative/unknown same-domain order, empty interval, or a same-domain uncertainty interval crossing zero or the 60-second boundary. Unequal domains are never subtracted and are not stale |
| 025 | event-observation-gap | any ordinary required slot lacks its one complete source population or same-candidate full-interval/domain source; any candidate-independent baseline/lifecycle universe is missing, unbounded, incomplete, verdict-dependent, or candidate-filtered; any required owner slot, concrete source population, unavailable placeholder, direct attribution, occurrence, composition, or projection is missing, duplicated, injected, unavailable, indeterminate, contradictory, wrong-owner/class/domain/incarnation/Q/side/context, or nonexhaustive; any post-B slot/source has a positive gap; or ProducerBindingEventCoverage is gap/unavailable/indeterminate/contradictory. A complete positive change emits 026, not 025, unless an independent baseline/source/coverage fault also exists |
| 026 | lifecycle-invalidated | an owner-preserving bootstrap observation or canonical E01-E17 occurrence after a closure/binding cut and at/before use affects an exact coordinate without a new closing measurement, rebuilt binding at a new B when required, new candidate-independent universe, new concrete source populations, exact new baseline, complete post-B population, and one new causally closed current consistent positive IAA conclusion. A bootstrap source incarnation replacement remains an old/new source transition and cannot be normalized; Q-local relational/topology change retains an intrinsically continuous binding Producer incarnation but invalidates affected coordinates; intrinsic discontinuity projects one replacement incarnation into every affected Q. A later reversal never repairs the old baseline |
| 027 | measurement-stale | a permission ClosureStateCut FreshnessCalculation or any general IAA MeasuredConclusionUseFreshness is stale only when QualifiedPhysicalTimeDomainComparison=exact-equal and its resolved nonnegative age interval has lower bound at least 60 seconds; exactly 60 seconds is stale. A well-formed binding-continuity conclusion has M=U and age `[0,0]`; nevertheless the closed local mapping explicitly maps any represented stale binding currentness to noncurrent, while a proved M/U inequality independently emits 024. Unequal, unavailable, indeterminate, or contradictory domains emit 024 rather than 027 |
| 028 | lower-evidence-reuse-ineligible | reuse attempted and any Section 19 condition is false/indeterminate |
| 029 | authoritative-currentness-failed | an H02CurrentnessSet, IAAMeasuredCurrentnessSet, or required qualification/currentness cardinality is not exact-one-to-one; any required history is not authoritative-current; a typed applicability/currentness input is changed/noncurrent/unavailable/indeterminate/contradictory; any general conclusion freshness is not fresh under `general-age`; any binding freshness lacks exact-close M=U and `binding-self-age([0,0])`; any binding-continuity-currentness is not equal-current; any required binding currentness is not literal current; or H-07 other than explicit 001/007 mismatch is noncurrent. This reason records but never repairs a source, universe, baseline, coverage, or binding state. Freshness/history never repair each other or causality/baseline/source/currentness |
| 030 | measurement-infrastructure-unavailable | required Producer, global ProducerIntrinsicContinuity evidence, surface binding, candidate-independent universe/enumeration boundary, concrete bootstrap source/eligibility/population, baseline/lifecycle direct attribution/owner domain/population, positive bounded binding conclusion/causality, binding coverage/currentness, source-control/closure/ordinary-event source, qualified-time input/domain attribution, measurement service, or protected detector is unavailable; authoritative upstream sources use 029 |
| 031 | unknown-required-h13-semantics | unknown H-13 identity/subject/object/resource/K/F/profile/event/result meaning, including a candidate/provider/local baseline enumeration filter, preferred/newest/IAA-selected bootstrap source token, abstract-owner-only bootstrap attribution, source-rebinding token, nonexhaustive-empty token, EventSourceCompositionPolicy other than independently-complete-source, measured maximum-age token other than 60 seconds, provider conversion/mapping, alternate binding cut, custom currentness fallthrough, untyped “baseline matches”/“binding current” label, or obsolete IAA-registration lifecycle token |

An unknown relation class emits 031 and 016. A known class in a type-forbidden position emits 016 but not 031. A malformed edge also affects its dependent F family and is retained.

## 21. Component states before provenance

ProfileEvaluationState uses the first applicable state:

~~~
wrong-subject       reasons 004-006
wrong-profile       reason 007
contradictory       reasons 008-009
incomplete          reasons 011-017,030-031
indeterminate       reasons 018,024
unsatisfied         reason 019
satisfied           otherwise
~~~

CoverageState uses the first applicable state:

~~~
wrong-correspondence        reasons 004-006
contradictory-coverage      reasons 008-009
unexpected-duplicate        reasons 022-023
unknown-membership          reasons 013,015,021
partial                     reasons 014,016,020
complete-shared-permitted   every non-singleton SameSideTargetOverlapGraph component has exactly one holding SharedGovernanceRelation and every permission coverage is complete
complete-unique             otherwise when complete
~~~

SubstantiveCurrentUseDisposition uses the first applicable state:

~~~
non-authorizing-wrong-connection           reason 001
non-authorizing-wrong-context-or-privacy  reasons 002-003
non-authorizing-history-unresolvable       reason 010
non-authorizing-unknown-h13-semantics      reason 031
non-authorizing-upstream-currentness       reason 029
non-authorizing-measurement-unavailable    reason 030
non-authorizing-invalidated               reasons 025-026
non-authorizing-stale                      reason 027
current                                   otherwise
~~~

SubstantiveGateDecision is pass-candidate only when the semantic reason set is empty, profile state is satisfied, coverage is complete-unique or complete-shared-permitted, and substantive disposition is current. Otherwise it is non-authorizing.

## 22. Structural acyclic EvaluationProvenance

### 22.1 Canonical scope, population, coordinate, and edge grammar

The provenance model is semantic and structural. It allocates no identifier and defines no representation, order, bytes, hash, digest, signature, commitment, canonical form, or D2 realization.

The closed evaluation-scope grammar is:

~~~
EvaluationScope =
  connection-scope(exact ConnectionEvaluationKey)
  | side-scope(exact SideEvaluationKey)
  | permission-scope(exact PermissionEvaluationCoordinate)
  | producer-lifecycle-scope(exact ProducerLifecycleEvaluationCoordinate)
~~~

For one ConnectionEvaluationKey C:

- Sides(C) is exactly the mathematical set containing C's host-side and agent-side SideEvaluationKey;
- H02ApplicabilityCandidates(S) is every H02ApplicabilityCandidateCoordinate in S's complete Stage-A H02ApplicabilityPopulation, including denied, narrowed, wrong-scope, stale, contradictory, and injected audit candidates;
- PermissionCoordinates(S) is exactly the one-for-one Stage-B image of every and only authoritative Stage-A result=applicable member in S's ApplicablePermissionSet;
- CandidatePermissionCoordinates(S) is PermissionCoordinates(S) union every structurally formable PermissionEvaluationCoordinate carried by a raw RuntimeCorrespondence, target, or other H-13 measurement candidate that purports to resolve an applicable member at S; a denied/narrowed/wrong/stale/contradictory Stage-A candidate remains only an H02ApplicabilityCandidateCoordinate and never enters this set;
- PermissionResolution(Q) is the exact unordered candidate occurrence family for coordinate Q plus tagged resolution absent, unique(exact PermissionEvaluationKey), or ambiguous;
- PermissionKeys(S) is the mathematical set of the unique PermissionEvaluationKey values from all Q in PermissionCoordinates(S);
- LocalIAAKeys(C) is the exact LocalIAASeparationKey set derived from the full IAA/registration preimages when both sides' permission resolutions are unique and contexts are unequal, and is empty when contexts are equal;
- F04Pairs(C) is the exact Cartesian product of the two PermissionKeys sets when both are fully resolved; and
- any absent or ambiguous resolution remains explicitly present in DerivationPopulation and is non-authorizing; it cannot remove its own coordinate, currentness, coverage, trigger, or component-state record.

No permission coordinate or key may be replaced by another having the same IAA, registration revision, target, runtime, or result. CandidatePermissionCoordinates outside PermissionCoordinates remain frozen for exact malformed/injected Stage-B measurement triggers and cannot enter PermissionKeys, F04 pairs, governance components, or a pass. Rejected Stage-A candidates remain independently frozen in H02ApplicabilityCandidates for applicability audit/provenance/triggers without receiving Q-scoped authorization nodes. For each side, exact one-to-one authorization resolution requires:

~~~
|PermissionCoordinates(S)|
  = |ApplicablePermissionSet(S)|
  = |PermissionKeys(S)|
~~~

Raw authoritative H-02 input nodes are source-specific typed inputs only. H02ApplicabilityEvaluation(A) is the H-13-owned intersection/projection result derived from those nodes. H02SideInputNode(S) is the complete Stage-A H02ApplicabilityPopulation/H02SideApplicabilityProjection node. Only after Stage A is resolved does H02PermissionInputNode(Q) exist: it is the exact result=applicable projection for Q and depends on its Stage-A evaluation/side node. References below to H-02 side input and H-02 permission input mean exactly these two derived node branches, never a synthetic upstream object. H07AuthoritativeConnectionInput is the exact accepted H-07 Connection semantic bundle. DirectProducerFact is one exact DirectSemanticPropositionCoordinate together with its exact candidate source and SourceAttribution.

QuestionKey is the closed tagged union prescribed row-by-row in Section 22.2. NodeSemanticCoordinate is exactly:

~~~
NodeSemanticCoordinate = (
  exact ProvenanceNodeType,
  exact EvaluationScope,
  exact QuestionKey branch and components prescribed for that node type
)
~~~

Scope and question decomposition is normative. A component assigned to scope MUST NOT instead be copied into, removed from, or substituted into the question. An answer, verdict, state, dependency set, display label, or representation value MUST NOT participate in QuestionKey.

For a finite semantic population X, coordinates(X) is the mathematical set containing the one prescribed coordinate for every member of X. The selection helpers used below are:

~~~
permission(Q, T) = every generated node of type/category T at permission-scope(Q)
side(S, T) = every generated node of T at side-scope(S)
  plus every permission(Q, T) for Q on S when the row says side closure
connection(C, T) = every generated node of T in C when the row says connection closure
producer-lifecycle(PU, T) = every generated node of T at producer-lifecycle-scope(PU)
~~~

These are exact type-and-scope selections over DerivationPopulation, never implementation-selected relevance filters.

Every parameter token used by the coordinate/dependency grammar is closed:

~~~
ProjectionFieldClass =
  connection
  | organization
  | workspace-tag-and-value
  | participant-side
  | selected-release
  | selected-profile
  | authority-use-cut
  | permission-subject
  | permission-revision
  | iaa-identity
  | organization-iaa-registration-subject
  | organization-iaa-registration-revision
  | h02-permitted-workspace-scope
  | h02-applicability-branch-and-result
  | workspace-state-outcome
  | isolation-use-disposition
  | h02-organization-registration-applicability-input
  | h02-boundary-permission-applicability-input
  | h02-workspace-state-applicability-input
  | h02-workspace-overlay-applicability-input
  | h02-selected-current-use-intersection
  | content-source-attribution
  | historical-currentness-qualification
  | workspace-state-subject-and-revision
  | workspace-overlay-subject-and-revision
  | runtime-correspondence
  | measurement-target-root
  | membership-epoch
  | measurement-target
  | runtime-correspondence-state-position
  | closure-state-cut

MeasuredIdentityClass =
  runtime-lineage
  | runtime-incarnation
  | isolation-boundary
  | controller-incarnation
  | resource-object
  | channel
  | producer-identity
  | producer-incarnation
  | physical-environment-observation
  | anonymous-physical-resident

PathClass =
  isolation-path
  | supporting-control
  | direct-remote
  | bypass
  | storage
  | network
  | device-resource
  | namespace-environment
  | observation-report-alteration
  | gate-dominating
  | mutable-sharing

SemanticSubjectCoordinate =
  subject(exact S01-S12 member)
  | object(exact O01-O11 member)
  | resource(exact ResourceObject)
  | channel(exact Channel)
  | relation-content(exact RelationEdgeContent)
  | direct-proposition(exact DirectSemanticPropositionCoordinate)
  | producer-independence(exact ProducerIndependenceCoordinate)
  | historical-currentness(exact HistoricalCurrentnessSubject, exact AuthorityUseCut)
  | event-slot(exact PermissionEventRequirementSlot)
  | event-source-candidate(exact EventCoverageAssertionCoordinate)
  | runtime-correspondence-proposition(exact RuntimeCorrespondenceProposition)
  | h02-applicability-candidate(exact H02ApplicabilityCandidateCoordinate)
  | local-iaa(exact LocalIAASeparationKey)
  | f04-pair(exact F04PairKey)
  | producer-lifecycle(exact ProducerLifecycleEvaluationCoordinate)
~~~

H02ProjectionOwner is closed: every R8-10 registration field maps only to OrganizationRegistrationApplicabilityInput and exact Organization-authority content attribution; every R8-25 permission field maps only to BoundaryPermissionApplicabilityInput and exact Organization-authority content attribution; Workspace state Subject/Revision/outcome maps only to WorkspaceStateApplicabilityInput and exact Workspace-authority content attribution; and every R8-18 overlay identity/narrowing field maps only to WorkspaceOverlayApplicabilityInput and exact Workspace-authority content attribution. Historical currentness maps only to the separate HistoricalCurrentnessQualification for that exact subject/revision/content/cut. h02-applicability-evaluation may compare those values with the selected H-07 Connection values, but cannot copy a value into a source type, attribution, or qualification that does not own it. RepeatedFieldOwners for the four h02-*-applicability-input ProjectionFieldClass branches returns only the matching authoritative-h02-input node plus its exact historical-currentness-qualification node. Missing, extra, cross-owned, defaulted, or locally asserted fields remain structurally distinct failures.

No synonym, provider class, implementation label, or open string belongs to those token sets. `field-class`, `identity-class`, `path-class`, `subject`, `used`, `relevant`, `required`, and `affected` below mean only the following structural selection functions:

- RepeatedFieldOwners(field,Q/S/C) is every and only authoritative/measured input in the owning scope that structurally carries that ProjectionFieldClass.
- DirectStatements(Q) is every DirectSemanticPropositionCoordinate generated from the mandatory closure extents, the complete S/O/resource/channel/K population, and the Section 11 direct-owner cell for Q.
- UsedEdges(value) is exactly the RelationEdgeContent coordinates explicitly carried by that value's complete pair map, path, closure, target, gate, correspondence, or governance fields.
- CompletePathUniverse(PathClass,source,sink,Q) is every well-typed and received-malformed edge in Q's relation closure whose endpoints form any finite source-to-sink walk admitted by Section 11.4 for that PathClass, plus the explicit absent/unresolved conclusion when no such complete walk is established.
- RequiredEventSlots(Q) is exactly the Section 9.6 function of Q, E01-E17, Section 11's direct-owner cells, ObservationScope, ClosureStateCut, and AuthorityUseCut.
- AffectedCoordinates(event-slot) is exactly every Q-local closure and F family whose mandatory extent or table predicate mentions a subject/object/relation mutable by that EventFamily; it never contains another permission coordinate merely because values compare equal.
- BindingBaselineUniverseFor(Q,P,B) is exactly the Section 6.3 candidate-independent expansion from the frozen Stage-B population, complete bounded source enumerations, S01-S12/O01-O11/ResourceObjectClass/ResourceObject/Channel populations, K01-K49 matrix, Section-11 ownership, O09/O10 coordinate class, and finite enumeration boundaries. P selects only the later expected projection; candidate content, provider/local filters, and verdicts select no member.
- BindingBaselineOwnerSlots(Q,P,B) is exactly the one-to-one Section 6.3 expansion of BindingBaselineUniverseFor(Q,P,B) members with their closed direct owners. It is not a function of the candidate's member set.
- BindingLifecycleUniverseFor(Q,P,B,U) is exactly the candidate-independent expansion from the baseline universe and every independently enumerated binding-affecting E07/E11/E14/E15/E17 owner/domain member through U.
- BindingLifecycleOwnerSlots(Q,P,B,U) is exactly the one-to-one owner/domain/family expansion of BindingLifecycleUniverseFor(Q,P,B,U), generated before any observation or conclusion verdict.
- BindingBootstrapSources(slot) is every concrete ProducerIdentity/ProducerIncarnation candidate, raw occurrence, and unavailable placeholder from the frozen Stage-B source-enumeration population whose class/domain/scope may match that exact baseline or lifecycle slot. It retains all candidates and multiplicity; no preferred/newest/configured/IAA-selected filter exists.
- BindingAffectedCoordinates(binding-observation,Q) is exactly the Section 9.6 changed-member expansion and never uses a SourceAttribution, ordinary EventOccurrence, or conclusion verdict to select a coordinate.
- ApplicableSeparation(Q) is the unique LocalIAASeparationKey whose full-preimage covered set contains Q's resolved PermissionEvaluationKey, when contexts are unequal, and absent when equal.
- GovernanceComponent(Q) is the unique SameSideTargetOverlapGraph connected component containing Q's resolved key.

These functions operate over the complete frozen DerivationPopulation defined in Section 22.6. They are semantic functions, not implementation-selected filters.

For each node, RequiredDependencies(node) is generated by the exact row and tables below. It is the exact minimal immediate dependency set. Transitive dependencies MUST NOT be added. A row that says every X means every and only X in the stated exact scope/population.

ProvenanceNode is:

~~~
ProvenanceNode = (
  exact NodeSemanticCoordinate,
  exact represented SemanticValue class prescribed by the row,
  exact declared DependencyCoordinateSet
)
~~~

Node identity is coordinate equality. Full equality includes all three fields. Candidate node occurrences retain multiplicity until validation; repeated equal nodes at one coordinate are not silently set-deduplicated.

The edge relation is never supplied independently:

~~~
DeclaredEdgeSet = {
  (dependency, derived-node-coordinate)
  |
  dependency is in that node's declared DependencyCoordinateSet
}

RequiredEdgeSet = {
  (dependency, derived-node-coordinate)
  |
  derived-node-coordinate is required
  and dependency is in RequiredDependencies(derived-node-coordinate)
}
~~~

EvaluationProvenanceCandidate is exactly the finite ProvenanceNode occurrence family, its derived DeclaredEdgeSet, and the exact PopulationDependencySet defined in Section 22.6. A conforming candidate has exactly one node at every required coordinate, no extra node, declared dependencies equal to RequiredDependencies for every node, DeclaredEdgeSet equal to RequiredEdgeSet, and PopulationDependencySet equal to the one closed Stage-A-to-Stage-B relation.

### 22.2 Closed node/value/question/dependency grammar

ProvenanceNodeType is exactly the first-column token set below. No other token exists.

| ProvenanceNodeType | Allowed scope; represented SemanticValue; exact QuestionKey | Exact RequiredDependencies generation |
|---|---|---|
| authoritative-h02-input | side-scope(S), one exact raw OrganizationRegistrationApplicabilityInput, BoundaryPermissionApplicabilityInput, WorkspaceStateApplicabilityInput, or WorkspaceOverlayApplicabilityInput candidate including exact real-owner content attribution but excluding its historical qualification; h02-source-input(exact source-type, exact H02ApplicabilityCandidateCoordinate) | Empty set. Exactly the fields and Organization/Workspace content-source attribution of the named accepted source type are represented; missing branch inputs use an exact absent question/value, not a default. |
| historical-currentness-qualification | side-scope(S) for Stage-A governance content or permission-scope(Q)/side-scope(S) for Stage-B IAA content according to its owning conclusion coordinate; exact HistoricalCurrentnessQualification; historical-currentness(exact HistoricalCurrentnessSubject, exact AuthorityUseCut) | Empty set. It is an H-11-realized semantic input, not content attribution or an H-11 representation. Exactly one coordinate exists for every required subject/content/cut. |
| h02-applicability-evaluation | side-scope(S), exact H02SelectedCurrentUseIntersection plus H02IsolationApplicabilityProjection for A, h02-applicability-evaluation(exact H02ApplicabilityCandidateCoordinate) | Exactly A's Organization-registration and boundary-permission source-input nodes, branch-required Workspace state/overlay source-input nodes, every exact historical-currentness-qualification for those inputs, and authoritative H-07 Connection input. No H-13 measured/closure/event/F/result node is permitted. Claimed interval comparison cannot replace a qualification. |
| h02-applicability-population | side-scope(S), exact H02ApplicabilityPopulation plus H02SideApplicabilityProjection, h02-stage-a-population | Exactly every raw authoritative-h02-input and h02-applicability-evaluation node for H02ApplicabilityCandidates(S), including rejected audit candidates. |
| h02-stage-b-applicable-input | permission-scope(Q), exact Stage-A result=applicable H02IsolationApplicabilityProjection, h02-permission-applicable-input | Exactly the h02-applicability-evaluation for Q's ApplicablePermissionMember and S's h02-applicability-population node. It exists only for Stage-A authoritative result=applicable. |
| authoritative-h07-input | connection-scope(C), exact H07AuthoritativeConnectionInput, h07-connection-authoritative-input | Empty set. |
| iaa-measured-input | permission-scope(Q), exact tagged absent/unique/ambiguous RuntimeCorrespondence candidate, runtime-correspondence; or side-scope(S), exact IAAContextLocalSeparationConclusion candidate family for L, iaa-context-local-separation(L) | Runtime branch: exactly all eleven runtime-correspondence-proposition-result coordinates for Q. Separation branch: exactly the protected-detector-evidence-disposition coordinate for L. |
| producer-candidate-occurrence | permission-scope(Q), exact tagged raw Producer occurrence/placeholder from one FrozenStageBProducerOccurrenceFamily branch, producer-candidate-occurrence(exact occurrence-family tag, exact raw candidate coordinate) | Empty set. It records the frozen Stage-B raw occurrence before any surface, coupling, source-control, threat, eligibility, conclusion, F, reason, or result verdict. |
| relevant-producer-set | permission-scope(Q), exact RelevantProducerSet(Q), relevant-producer-set | Exactly every producer-candidate-occurrence node in Q's frozen inclusive occurrence family and the frozen-population equality predicate. It has no Producer verdict, surface result, coupling pair/state, threat, conclusion, coverage, F, reason, or result dependency. |
| producer-intrinsic-continuity | producer-lifecycle-scope(PU), exact ProducerIntrinsicContinuity for PU, producer-intrinsic-continuity | Exactly PU's complete raw ProducerIntrinsicLifecycleDirectAttribution activation/mechanism/capability evidence occurrence family, unique order/concurrency relation, coverage/cardinality result, and IAA allocation bindings for the opaque identity values. It has no PermissionEvaluationCoordinate, PermissionScopeKey, ObservationScope, Q-local surface/binding/coupling/threat/source-control/event/result, SourceAttribution, ordinary event, F, reason, or final-result dependency. Exactly one node exists per PU and every Q-local consumer of the same ProducerIdentity/cut references this one coordinate. |
| producer-source-surface-binding | permission-scope(Q), exact ProducerSourceSurfaceBinding(Q,P), producer-source-surface-binding(exact P, exact ProducerBindingStateCut) | Exactly the relevant-producer-set node, the one matching producer-lifecycle-scope producer-intrinsic-continuity node, P lifecycle allocation binding, binding-state-position/order input, and every raw producer-lifecycle-direct-owner O09/O10 surface/attachment occurrence/placeholder for P at Q. It has no SourceAttribution/direct-fact, surface-currentness, source-control, coupling result, threat, IAA conclusion, ordinary event eligibility, closure, F, reason, or result dependency. |
| binding-baseline-universe | permission-scope(Q), exact BindingBaselineUniverse(Q,P,B), binding-baseline-universe(exact P, exact B) | Exactly every frozen Stage-B producer/source-enumeration occurrence and unavailable placeholder, frozen-population equality/boundary, S01-S12/O01-O11/ResourceObjectClass/ResourceObject/Channel coordinate population, K01-K49 type/source/owner matrix, Section-11 ownership, and O09/O10 coordinate class needed by BindingBaselineUniverseFor(Q,P,B). It has no producer-source-surface-binding candidate content, expected projection, baseline occurrence/verdict, post-B observation, IAA conclusion, currentness, SourceAttribution, F, reason, or result dependency. |
| binding-lifecycle-universe | permission-scope(Q), exact BindingLifecycleUniverse(Q,P,B,U), binding-lifecycle-universe(exact P, exact B, exact U) | Exactly binding-baseline-universe plus every frozen bounded binding-affecting E07/E11/E14/E15/E17 owner/domain/source-enumeration coordinate and unavailable placeholder through U. It has no candidate membership filter, baseline/population verdict, direct observation verdict, IAA conclusion, currentness, SourceAttribution, ordinary event, F, reason, or result dependency. |
| binding-bootstrap-source | permission-scope(Q), exact BindingBootstrapSourceCoordinate plus BindingBootstrapSourceEligibility, binding-bootstrap-source(exact baseline-or-lifecycle slot, exact source ProducerIncarnation) | Exactly the owning universe/member, matching frozen producer-candidate-occurrence/source-enumeration coordinate, exact enrollment/class/domain/owner/scope inputs, and the one matching producer-lifecycle-scope producer-intrinsic-continuity node. It has no SourceAttribution, surface-binding-currentness, coupling/threat/source-control/independence, ordinary event, IAA conclusion, F, reason, or result dependency. |
| binding-bootstrap-source-population | permission-scope(Q), exact BindingBootstrapSourceCandidatePopulation for one baseline or lifecycle slot, binding-bootstrap-source-population(exact baseline-or-lifecycle slot) | Exactly the owning universe/member, every and only binding-bootstrap-source coordinate and raw occurrence/unavailable placeholder returned by BindingBootstrapSources(slot), source-to-slot/per-source occurrence cardinality inputs, and frozen source-enumeration boundary. It has no preferred-source token, direct-content verdict, IAA conclusion, SourceAttribution, binding currentness, ordinary event, F, reason, or result dependency. |
| binding-baseline-direct-input | permission-scope(Q), exact tagged absent/unique/ambiguous BindingBaselineOwnerObservation candidate occurrence family for one BindingBaselineOwnerSlot and source, binding-baseline-owner-slot(exact BindingBaselineOwnerSlot, exact BindingBootstrapSourceCoordinate) | Exactly binding-baseline-universe, the slot's binding-bootstrap-source-population, and the exact binding-bootstrap-source coordinate/eligibility carried by each direct attribution. It is a concrete-source state-at-B input, never SourceAttribution or IAA AuthoritativeSourceAttribution. Raw multiplicity is retained. It has no post-B observation, IAA conclusion, binding currentness, canonical EventOccurrence, ordinary event coverage, coupling/threat/source-control/independence, F, reason, or result dependency. |
| binding-baseline-population | permission-scope(Q), exact BindingBaselineObservationPopulation(Q,P,B), binding-baseline-population(exact P, exact B) | Exactly binding-baseline-universe, producer-source-surface-binding as expected-projection supplier only, every candidate expected projection, every bootstrap source population, every baseline direct input, and owner/source projection/cardinality/composition/completeness/consistency inputs. It has no IAA conclusion, SourceAttribution, post-B observation, canonical EventOccurrence, ordinary event coverage, binding currentness, coupling/threat/source-control/independence, F, reason, or result dependency. |
| producer-source-surface-binding-baseline | permission-scope(Q), exact ProducerSourceSurfaceBindingBaseline(Q,P,B), producer-source-surface-binding-baseline(exact P, exact B) | Exactly binding-baseline-universe, producer-source-surface-binding, binding-baseline-population, and complete candidate-expected-to-actual-owner structural equality input. It has no IAA conclusion, post-B population, SourceAttribution, canonical EventOccurrence, binding-event-coverage/currentness, ordinary event eligibility, coupling/threat/source-control/independence, F, reason, or result dependency. |
| binding-lifecycle-direct-input | permission-scope(Q), exact tagged absent/unique/ambiguous BindingLifecycleCoverageStatement candidate and raw BindingLifecycleObservation occurrence family for one BindingLifecycleOwnerSlot and source, binding-lifecycle-owner-slot(exact BindingLifecycleOwnerSlot, exact BindingBootstrapSourceCoordinate) | Exactly binding-lifecycle-universe, the slot's binding-bootstrap-source-population, and the exact binding-bootstrap-source coordinate/eligibility carried by each direct attribution. It is not SourceAttribution or AuthoritativeSourceAttribution. Raw multiplicity is retained. It has no canonical EventOccurrence, ordinary event coverage, binding currentness, IAA conclusion, coupling/threat/source-control/independence, F, reason, or result dependency. |
| binding-lifecycle-population | permission-scope(Q), exact BindingLifecycleObservationPopulation(Q,P,B,U), binding-lifecycle-population(exact P, exact B, exact U) | Exactly binding-lifecycle-universe, producer-source-surface-binding, producer-source-surface-binding-baseline, the one matching producer-intrinsic-continuity node, every lifecycle bootstrap source population/direct input, and structural global order/concurrency/cardinality/consistency inputs. It has no SourceAttribution, canonical EventOccurrence, ordinary EventCoverageAssertion/EventRequirementSourcePopulation, IAA conclusion, binding currentness, coupling/threat/source-control/independence, F, reason, or result dependency. |
| iaa-binding-continuity-conclusion | permission-scope(Q), exact ProducerBindingContinuityMeasuredConclusion candidate occurrence family, iaa-binding-continuity(exact P, exact B, exact U) | Exactly producer-source-surface-binding, binding-baseline-universe, producer-source-surface-binding-baseline, every retained baseline/lifecycle bootstrap-source population, and binding-lifecycle-population. The exact IAA authors the bounded positive baseline-coherence-plus-continuity conclusion and cannot author or rewrite any universe/source/direct fact. No SourceAttribution, canonical EventOccurrence, ordinary event eligibility, causality/freshness/history/currentness, binding-event-coverage/currentness, coupling/threat/source-control/independence, F, reason, or result dependency is permitted. |
| binding-conclusion-causality | permission-scope(Q), exact BindingConclusionCausality, binding-conclusion-causality(exact P, exact B, exact U) | Exactly iaa-binding-continuity-conclusion, qualified-time-source-input for M and U, their qualified-time-domain-comparison, and the exact semantic-position equality/order input. It has no measured freshness/history/currentness, binding-event-coverage/currentness, SourceAttribution, ordinary event, F, reason, or result dependency. |
| producer-binding-event-coverage | permission-scope(Q), exact ProducerBindingEventCoverage(Q,P,B,U), producer-binding-event-coverage(exact P, exact B, exact U) | Exactly binding-baseline-universe, binding-lifecycle-universe, every required bootstrap-source population, producer-source-surface-binding-baseline, binding-lifecycle-population, positive iaa-binding-continuity-conclusion, binding-conclusion-causality, its domain-comparison/freshness/history/currentness nodes, and exact owner/source/IAA projection/cardinality consistency inputs. It has no ordinary SourceAttribution/EventOccurrence/event population, producer-source-surface-binding-currentness, coupling/threat/source-control/independence, F, reason, or result dependency. |
| producer-source-surface-binding-currentness | permission-scope(Q), exact ProducerSourceSurfaceBindingCurrentness(Q,P), producer-source-surface-binding-currentness(exact P, exact AuthorityUseCut) | Exactly producer-source-surface-binding, binding-baseline-universe, binding-lifecycle-universe, every required bootstrap-source population, producer-source-surface-binding-baseline, matching global intrinsic continuity, positive iaa-binding-continuity-conclusion/currentness, binding-conclusion-causality, producer-binding-event-coverage, current P lifecycle occurrence, B/U order input, and exact BindingAffectedCoordinates projection. It has no ordinary SourceAttribution/direct-fact/EventOccurrence/event eligibility, coupling/threat/source-control/independence conclusion, closure, F, reason, or final-result dependency. |
| direct-producer-fact | permission-scope(Q), exact DirectProducerFact candidate family, direct-fact(exact DirectSemanticPropositionCoordinate, exact ProducerIncarnation) | Exactly its Producer lifecycle, producer-source-surface-binding, and producer-source-surface-binding-currentness node. One question exists for every member of DirectStatements(Q) and raw source candidate, using an explicit unavailable/indeterminate value when required content is absent. Negative values carry a DirectAbsenceCellCoordinate; derived path absence is forbidden. |
| direct-cell-result | permission-scope(Q), exact DirectCellResult, direct-cell-result(exact DirectAbsenceCellCoordinate) | Exactly every positive/negative direct-producer-fact candidate and SourceAttribution for that cell, each candidate's producer-source-surface-binding, and the closed direct-owner matrix binding. It has no derived path, source-control/admissibility, threat, IAA conclusion, coverage, closure, F, or result dependency. |
| derived-influence-path-result | permission-scope(Q), exact DerivedInfluencePathResult, derived-influence-path(exact DerivedInfluencePathCoordinate) | Exactly every and only constituent direct-cell-result node in path order plus its source/sink surface bindings. It has no SourceAttribution/direct owner of its own and no source-control/admissibility, threat verdict, IAA conclusion, coverage, closure, F, or result dependency. |
| producer-coupling-base-graph | permission-scope(Q), exact ProducerCouplingBaseGraph(Q), producer-coupling-base-graph | Exactly relevant-producer-set, every member's matching producer-lifecycle-scoped producer-intrinsic-continuity/surface-binding/binding-currentness, every raw K45/K49/source-surface direct-cell-result/placeholder, and Q's frozen source-enumeration boundary. It has no pair-state/population, threat, conclusion/currentness, coverage, closure, F, reason, or result dependency. |
| producer-control-coupling-state | permission-scope(Q), exact ProducerControlCouplingState(Q,A,B), producer-control-coupling(exact unordered(A,B)) | Exactly producer-coupling-base-graph, A/B surface bindings/currentness values, and every derived-influence-path-result in the complete candidate coupling-path population for that pair. It cannot allocate or replace A/B and has no threat, source-control/admissibility, conclusion/currentness, coverage, closure, F, reason, or result dependency. |
| producer-control-coupling-population | permission-scope(Q), exact ProducerControlCouplingPopulation(Q), producer-control-coupling-population | Exactly relevant-producer-set, producer-coupling-base-graph, and every and only producer-control-coupling-state coordinate for ProducerControlCouplingPairSet(Q). |
| producer-threat-control-domain | permission-scope(Q), exact ProducerThreatControlDomain(Q), producer-threat-control-domain | Exactly MeasurementTargetRoot binding, relevant-producer-set, every member's source-surface binding/currentness, every raw target/control direct-cell-result/placeholder and derived path required by the least-closure rules, and the frozen enumeration boundary. No coupling-state/population result, source-control/admissibility, P-specific threat, IAA conclusion/currentness, coverage, closure, F, reason, or result dependency is permitted. |
| absence-source-threat-control-domain | permission-scope(Q), exact AbsenceSourceThreatControlDomain(Q,S), absence-source-threat-control-domain(exact S) | Exactly MeasurementTargetRoot binding, relevant-producer-set, every member's source-surface binding/currentness, every nonexcluded raw target/control direct-cell-result/placeholder and derived path required by the source-relative least closure, and the frozen enumeration boundary. Every negative fact sourced by S, coupling-state/population result, source-control/admissibility, P-specific threat/conclusion, coverage, closure, F, reason, and result dependency is forbidden. |
| iaa-absence-source-control-conclusion | permission-scope(Q), exact AbsenceSourceControlMeasuredConclusion candidate family, iaa-absence-source-control(exact AbsenceSourceControlCoordinate) | Exactly absence-source-threat-control-domain, source S's surface binding, and every nonexcluded direct-cell-result and derived-influence-path-result in AbsenceSourceControlBaseGraph. It cannot depend on any negative fact sourced by S, general producer-threat-control-domain verdict, coupling-state/population result, AbsenceSourceAdmissibility, P-specific threat, Producer-independence conclusion, coverage/eligibility, closure, F, reason, or result. |
| absence-source-admissibility | permission-scope(Q), exact AbsenceSourceAdmissibility, absence-source-admissibility(exact negative DirectProducerFact coordinate, exact classified P) | Exactly the negative direct-producer-fact/SourceAttribution, source binding, absence-source-threat-control-domain, source-control conclusion/currentness/freshness/historical qualification, and classified-P lifecycle binding. It has no P-specific threat verdict, Producer-independence conclusion, coverage, closure, F, reason, or result dependency. |
| producer-influence-threat-set | permission-scope(Q), exact ProducerInfluenceBaseGraph plus ProducerInfluenceThreatSet, producer-influence-threat-set(exact ProducerIndependenceCoordinate) | Exactly producer-threat-control-domain, evaluated-P source binding, producer-control-coupling-population, every P-specific direct-cell-result/derived-influence-path-result, MeasurementTargetRoot and Producer lifecycle bindings, and the raw source-enumeration boundary. No admissibility, evidence verdict, IAA Producer-independence conclusion/currentness, coverage/eligibility, occurrence, closure, F, reason, or result dependency is permitted. |
| iaa-producer-independence-conclusion | permission-scope(Q), exact ProducerIndependenceMeasuredConclusion candidate family, iaa-producer-independence(exact ProducerIndependenceCoordinate) | Exactly producer-influence-threat-set and producer-independence-evidence binding. The binding contains every DirectCell/derived-path result and absence-source-admissibility required by TechnicalInfluenceEvidencePopulation. The conclusion has no coverage/eligibility, occurrence, closure, RuntimeCorrespondence, F, reason, state, or result dependency. |
| proposition-source-independence | permission-scope(Q), exact PropositionDirectSourceCoverage candidate family, proposition-source-independence(exact DirectSemanticPropositionCoordinate) | Exactly every class/domain-owning direct-producer-fact/source binding, each candidate's threat/evidence and Producer-independence conclusion/currentness/freshness/history nodes, and Producer lifecycle binding. It has no ObservationOccurrence, closure, RuntimeCorrespondence, F, reason, state, or result dependency. |
| runtime-correspondence-proposition-result | permission-scope(Q), exact tagged absent/unique/ambiguous RuntimeCorrespondencePropositionResult candidate occurrence family for one branch, runtime-correspondence-proposition(exact RuntimeCorrespondenceProposition) | Exactly RuntimeCorrespondencePropositionDependencies(Q,branch) from Section 22.3. The absent placeholder is a resolved represented semantic value. It has no RuntimeCorrespondence wrapper, permission-key resolution, IAA currentness, detector, F, governance, reason, state, or final-result dependency. |
| protected-detector-input | connection-scope(C), exact ProtectedDetectorSourceAssertion candidate, protected-source(ProtectedDetectorEvaluationKey, DetectorSourceDomain, exact protected domain owner, exact protected source scope) | Empty set. Exists only in the protected internal candidate and only when contexts are unequal. |
| protected-detector-evidence-disposition | side-scope(S), exact ProtectedDetectorEvidenceDisposition candidate family for L, local-detector-evidence(L) | Exactly every protected-detector-input assigned to L by the destination protected source population: every contributor in each of the four DetectorSourceDomain values and no source for another Connection, profile, cut, or local IAA recipient. |
| identity-binding | scope fixed by BindingKey: connection projection uses connection-scope(C), side projection uses side-scope(S), and permission/target-local binding uses permission-scope(Q); exact binding conclusion; identity-binding(BindingKey) | Exactly BindingPremises(BindingKey) from Section 22.3. |
| equivalence-conclusion | permission-scope(Q) when both subjects belong to Q, side-scope(S) for distinct same-side permissions, or connection-scope(C) for a cross-side comparison; exact EquivalenceConclusion or MeasurementTargetCorrespondence; entity-equivalence(kind,left-subject,right-subject,cut) or measurement-target-correspondence(left-Q,right-Q) | EquivalenceConclusion: exactly its resolved observation-occurrence, producer-closure-assertion, and IAA measured-input coordinates; no CombinedClosure dependency. MeasurementTargetCorrespondence: exactly both target/lifecycle bindings, both permissions' five CombinedClosure nodes, UsedEdges(the complete correspondence), and every entity-equivalence node explicitly carried by its bijections. |
| observation-occurrence | permission-scope(Q), exact ObservationOccurrence candidate, observation-occurrence(exact ObservationOccurrenceCoordinate) | Exactly the direct-producer-fact coordinate for every observed statement plus the Producer lifecycle binding for the exact ProducerIncarnation. |
| producer-closure-assertion | permission-scope(Q), exact ProducerClosureAssertion candidate, producer-closure(exact ProducerClosureCoordinate) | Exactly its resolved observation-occurrence; every direct-producer-fact and proposition-source-independence coordinate for its closed member/edge and exclusion sets; and its Producer, scope, and lifecycle binding nodes. |
| combined-closure | permission-scope(Q), exact CombinedClosure candidate, combined-closure(exact ClosureKind) | Exactly its contributor ProducerClosureAssertion nodes, every proposition-source-independence coordinate for its mandatory extent and union, and, for relation-edges, every RelationEdge node in its union. No equivalence, IAA measured-input, CombinedClosure, or detector/IAA-separation dependency is permitted. |
| relation-edge | permission-scope(Q), exact RelationEdge candidate, relation-edge(RelationEdgeContent, ObservationOccurrenceCoordinate, direct ProducerClosureCoordinate) | Exactly the direct-producer-fact for RelationEdgeContent, its resolved observation-occurrence, its direct ProducerClosureAssertion, and every contributor ProducerClosureAssertion named by the value. |
| event-coverage-assertion | permission-scope(Q), exact tagged absent/unique/ambiguous EventCoverageAssertion candidate occurrence family for one EventCoverageAssertionCoordinate, event-coverage(exact EventCoverageAssertionCoordinate) | Exactly every direct-producer-fact and corresponding proposition-source-independence coordinate for that candidate's continuous-coverage/canonical EventOccurrence statements, every candidate-local observation-occurrence intersecting the interval, and that candidate Producer's exact lifecycle/scope/binding/currentness nodes. The absent placeholder remains one resolved represented semantic value. No BindingLifecycleObservation/CoverageStatement/Population or ProducerBindingEventCoverage is an immediate dependency; an ordinary assertion cannot establish the binding currentness it consumes. |
| event-requirement-source-population | permission-scope(Q), exact EventRequirementSourcePopulation, event-source-population(exact PermissionEventRequirementSlot) | Exactly relevant-producer-set, coupling population, every event candidate's surface binding/binding-currentness/event-coverage assertion/threat/evidence, source-control admissibility, Producer-independence conclusion/currentness/fixed freshness/domain-comparison/history, the constant event-policy binding, and fixed closure-state-cut binding. It has no selectable policy input, PermissionEventCoverageSet, F, invalidation, or Connection-union dependency. |
| permission-event-coverage | permission-scope(Q), exact PermissionEventCoverageSet, permission-event-coverage | Exactly every and only event-requirement-source-population coordinate for RequiredEventSlots(Q), plus Q's already-fixed closure-state-cut binding. It cannot depend on ConnectionEventCoverageUnion, F, or another permission. |
| connection-event-coverage-union | connection-scope(C), exact ConnectionEventCoverageUnion, connection-event-coverage-union | Exactly every and only permission-event-coverage coordinate for PermissionCoordinates on both sides. No F, freshness, invalidation, PermissionCoverageEvaluation, or other authority node may depend on this node. |
| h02-currentness-assertion | side-scope(S), exact H02SideCurrentnessAssertion candidate family, h02-side-currentness; permission-scope(Q), exact H02PermissionCurrentnessAssertion candidate family, h02-permission-currentness; or side-scope(S), exact H02CurrentnessSet, h02-currentness-set | Side assertion: exact Stage-A side input plus every exact governance historical-currentness-qualification it carries. Permission assertion: exact H-02 permission/side inputs plus every exact governance qualification for that permission branch. Set: side assertion node plus every permission assertion node for PermissionCoordinates(S). No generic H-02 content-attribution node exists. |
| h07-currentness-comparison | connection-scope(C), exact H07CurrentnessComparison, h07-currentness | Exactly the H-07 authoritative-input node. |
| iaa-measured-currentness-assertion | permission-scope(Q), exact runtime/Producer-independence/source-control/binding-continuity currentness candidate family; side-scope(S), exact separation-currentness candidate family; or connection-scope(C), exact IAAMeasuredCurrentnessSet; QuestionKey is the exact branch coordinate | Each conclusion branch depends on its exact IAA-authored conclusion input, measured-conclusion-freshness node, historical-currentness-qualification, and Q/side H-02 currentness. Source control has no Producer coverage/eligibility dependency. Binding continuity additionally depends on binding-conclusion-causality and does not depend on ProducerBindingEventCoverage or binding currentness. Set depends on every runtime, Producer-independence, source-control, binding-continuity, and required separation currentness node in C. |
| qualified-time-source-input | scope of the owning permission/local-IAA conclusion, exact QualifiedPhysicalTimeInput including its exact QualifiedPhysicalTimeDomain for one semantic state position, qualified-time-source(exact semantic state position) | Empty set. H-13 fixes domain/value/interval semantics; H-11 owns later trusted-time/domain evidence realization, not domain equality or the 60-second rule. |
| qualified-time-domain-comparison | scope shared by the owning freshness coordinate, exact QualifiedPhysicalTimeDomainComparison, qualified-time-domain-comparison(exact left position, exact right position) | Exactly the two qualified-time-source-input nodes. It uses structural domain equality only and has no conversion/offset/provider mapping, freshness, history, F, reason, or result dependency. |
| measured-conclusion-freshness | scope of the owning IAA conclusion, exact MeasuredConclusionUseFreshness, measured-conclusion-freshness(exact HistoricalCurrentnessSubject, exact AuthorityUseCut) | Exactly the represented IAA conclusion/state-position node, qualified-time-source-input nodes for M and U, and exact qualified-time-domain-comparison node; the binding-continuity branch additionally depends on binding-conclusion-causality and uses the exact semantic self-difference `[0,0]`. It applies the fixed same-domain interval derivation and has no HistoricalCurrentnessQualification/currentness, closure FreshnessCalculation, provider/IAA conversion/policy, F, reason, or result dependency. |
| freshness-calculation | permission-scope(Q), exact permission ClosureStateCut FreshnessCalculation, freshness | Exactly closure-state-cut binding, qualified-time-source-input nodes for ClosureStateCut and AuthorityUseCut, and exact qualified-time-domain-comparison node. No measured-conclusion-freshness, conversion/offset, or event coordinate is a dependency. |
| reuse-provenance | permission-scope(destination-Q), exact tagged not-attempted or ReuseProvenance, reuse(source-Connection,source-permission,destination-Q) | not-attempted: empty. Attempted: source LowerMeasurementEvidence plus fresh destination RelevantProducerSet/global intrinsic/binding; baseline/lifecycle universes; bootstrap source/eligibility/populations/direct inputs/compositions/baseline/lifecycle population; positive IAA binding conclusion/causality/currentness/coverage/binding-currentness; retained coupling/threat/source-control/admissibility/independence/time/history/event; source/destination H-02/H-07 currentness; and correspondence/equivalence. Source permission-bound wrappers/results/F/reasons/states, source universes/source identities/baselines/binding verdicts, and cross-context visible evidence are forbidden. |
| mediated-channel-pair | connection-scope(C), exact tagged absent/present MediatedChannelPair evaluation, mediated-channel-pair | Exactly H07CurrentnessComparison and, for every PermissionEvaluationKey whose complete resource/channel closure contains either exact channel endpoint, its EnforcementGate binding, channel/resource/relation closures, and every edge in CompletePathUniverse(gate-dominating,source-endpoint,sink-endpoint,Q). |
| same-side-target-overlap-graph | side-scope(S), exact SameSideTargetOverlapGraph, same-side-target-overlap-graph | Exactly every unordered distinct pair's structural target equality, target/membership bindings, complete RuntimeCorrespondence inputs, effective-boundary bindings/correspondence, shared runtime/boundary subsets, disjointness populations, and missing/contradictory target-overlap evidence. K45, K46, resource capacity, governance, F, and result nodes are not dependencies. Every pair receives exactly one precedence-derived state. |
| shared-governance-relation | side-scope(S), exact SharedGovernanceRelationSet evaluation, shared-governance | Exactly the same-side-target-overlap-graph node; every component member's H-02 content/currentness assertions and governance qualifications, IAA RuntimeCorrespondence input/freshness/historical qualification, target binding, MeasurementTargetCorrespondence, five CombinedClosure nodes, governance-controller binding, and UsedEdges of every pair/relation. It has no F, PermissionCoverageEvaluation, SideEvaluation, reason, or decision dependency. |
| f04-pair-evaluation | connection-scope(C), exact F04PairEvaluation, f04-pair(exact F04PairKey) | Equal contexts: exactly both permissions' target/effective-boundary bindings; one equivalence-conclusion for every Cartesian runtime-member pair and effective-boundary pair; and, for exclusive-environment, every Cartesian environment pair. Unequal contexts: exactly both selected local detector dispositions, both IAA separation inputs, both separation-currentness nodes, and both permissions' target/effective-boundary bindings. |
| f-predicate | permission-scope(Q), exact permission FactEvaluation, fact-family(F01/F02/F03/F05..F16); or connection-scope(C), exact aggregate F04 FactEvaluation, fact-family(F04) | Exactly the family closure in Section 22.3. Aggregate F04 depends on every and only f04-pair-evaluation in F04Pairs(C). |
| semantic-trigger-evaluation | connection-scope(C), side-scope(S), or permission-scope(Q) as prescribed by TriggerInstanceKey; exact (ReasonClass, TriggerInstanceKey, Boolean, emitted SemanticReason set); semantic-trigger(rank, exact TriggerInstanceKey) | Exactly the trigger closure in Section 22.4. local-iaa and governance-component instances use side-scope with L/component in TriggerInstanceKey; F04-pair instances use connection-scope with F04PairKey in TriggerInstanceKey. |
| semantic-reason-set | connection-scope(C), exact SemanticReasonSet, semantic-reason-set | Exactly every required semantic-trigger-evaluation coordinate. Its represented set is the union of each true trigger's exact emitted set. |
| permission-coverage-evaluation | permission-scope(Q), exact PermissionCoverageEvaluation candidate family, permission-coverage | Exactly unique-key resolution; five closures; RelevantProducerSet/global intrinsic/binding; baseline/lifecycle universes and every concrete bootstrap source/eligibility/population/direct input/composition/baseline/lifecycle population; positive IAA binding conclusion/causality/currentness/coverage/binding-currentness; retained coupling/threat/source-control/admissibility/independence/proposition populations; F values; H-02/H-07/IAA currentness; time/freshness/history; ordinary event coverage; permission freshness; reuse; overlap and governance. It has no trigger/reason/state/provenance-validation/completeness/final-decision dependency. |
| side-evaluation | side-scope(S), exact SideEvaluation, side-evaluation | Exactly the side H-02 input/currentness, every and only PermissionCoverageEvaluation for PermissionCoordinates(S), SameSideTargetOverlapGraph, and side SharedGovernanceRelationSet. It does not depend on triggers or reasons. |
| profile-evaluation-state | connection-scope(C), exact ProfileEvaluationState, profile-evaluation-state | Exactly SemanticReasonSet. |
| coverage-state | connection-scope(C), exact CoverageState, coverage-state | Exactly SemanticReasonSet, both SideEvaluation nodes, and both SharedGovernanceRelationSet nodes. |
| substantive-current-use-disposition | connection-scope(C), exact SubstantiveCurrentUseDisposition, substantive-current-use-disposition | Exactly SemanticReasonSet. |
| substantive-gate-decision | connection-scope(C), exact SubstantiveGateDecision, substantive-gate-decision | Exactly SemanticReasonSet, ProfileEvaluationState, CoverageState, and SubstantiveCurrentUseDisposition. |

The iaa-measured-input separation row's dependency does not transfer authority: the represented conclusion must be independently attributed to the exact IsolationAttestationAuthorityIdentity carried by L. The detector disposition is evidence only.

### 22.3 Closed binding and F-family dependency tables

BindingKey and its exact BindingPremises are closed as follows:

| BindingKey branch | Exact BindingPremises |
|---|---|
| connection-projection(ProjectionFieldClass) | Every and only RepeatedFieldOwners(field,C); illegal field/scope combinations generate no alternate coordinate and make the offered node malformed |
| side-projection(ProjectionFieldClass) | Every and only RepeatedFieldOwners(field,S) |
| permission-projection(ProjectionFieldClass) | Every and only RepeatedFieldOwners(field,Q) |
| permission-key-resolution | Q's H-02 side input, H-02 permission-input candidate family, and IAA RuntimeCorrespondence candidate family |
| measured-identity-or-lifecycle(MeasuredIdentityClass,SemanticSubjectCoordinate) | For a non-Producer, every raw lifecycle input at Q whose coordinate has that exact subject and identity class. For a Producer identity/incarnation, the one matching producer-lifecycle-scoped allocation/intrinsic-continuity node plus only the Q-local projection input. No Q-local coupling-state, threat, conclusion, F, result, or observation-occurrence dependency may feed the global node |
| supporting-controller(controller) | Supporting-controller/boundary CombinedClosure, controller lifecycle binding, exact K04 edge, and every defining role edge |
| effective-boundary-set(target) | Supporting-controller/boundary CombinedClosure and every K02/K03 edge reachable from the exact target |
| resource-owner(resource) | Every producer-closure-assertion and direct creation/attachment/enumeration fact for the resource |
| relevant-producer-set(Q) | Every and only producer-candidate-occurrence node from all Section 9.1 direct, event, lifecycle, K45, K49, surface, raw source-control-candidate, closure, technical-influence, and late-discovered branches in the frozen H13EvaluationPopulation at Q, plus the frozen-population equality predicate; no substantive verdict, surface result, coupling state, threat result, eligibility, conclusion result, F, reason, or final result is permitted |
| producer-intrinsic-continuity(PU) | Exact raw ProducerIntrinsicLifecycleDirectAttribution activation/restart/deactivation, observation/report mechanism birth/end/replacement, capability binding/scope, order/concurrency/coverage/cardinality, and IAA opaque allocation inputs at producer-lifecycle-scope(PU); every Q, PermissionScopeKey, ObservationScope, surface/binding/coupling/threat/source-control/event/conclusion/F/reason/result dependency is forbidden |
| producer-source-surface-binding(Q,P) | Exact P lifecycle/incarnation and one matching producer-lifecycle-scoped intrinsic-continuity binding, ProducerBindingStateCut/order input, producer-lifecycle-direct-owner ProducerObservationSurface(O09) and ProducerReportSurface(O10) allocation/attachment cells for P, and every received surface-binding candidate/placeholder at Q; no SourceAttribution, negative fact, binding-currentness, coupling result, threat, IAA conclusion, eligibility, or result dependency is permitted |
| binding-baseline-universe(Q,P,B) | Exact frozen Stage-B population/boundary, complete bounded source enumerations, closed subject/object/resource/channel/K/owner matrices, and O09/O10 coordinate class; candidate content/expected projection, baseline evidence/verdict, IAA conclusion, currentness, F, reason, and result are forbidden |
| binding-lifecycle-universe(Q,P,B,U) | Exact binding-baseline-universe plus every independently enumerated bounded E07/E11/E14/E15/E17 owner/domain/source coordinate through U; candidate membership, direct observation verdict, IAA conclusion, currentness, ordinary event, and downstream result are forbidden |
| binding-bootstrap-source(slot,S) | Exact owning universe/slot, frozen source occurrence/enrollment/class/domain/scope inputs, and matching global intrinsic lifecycle node for S; ordinary SourceAttribution, binding currentness, coupling/threat/source-control/independence, IAA conclusion, event, F, reason, and result are forbidden |
| binding-bootstrap-source-population(slot) | Exact owning universe/slot, every matching concrete source/eligibility/raw occurrence/unavailable placeholder, source-to-slot and occurrence multiplicity maps, and frozen enumeration boundary; preferred/winner/IAA-selected source input and all downstream verdicts are forbidden |
| binding-baseline-owner-slot(Q,P,B,slot,S) | Exact universe-derived slot, its complete source population, concrete source/eligibility, one direct BindingBaselineOwnerObservation occurrence family, and candidate expected projection as comparison content only; ordinary SourceAttribution, post-B event, IAA conclusion, currentness, or downstream result is forbidden |
| binding-baseline-population(Q,P,B) | Exact binding-baseline-universe, producer-source-surface-binding as expected-projection supplier only, every source population/direct input, and source/owner projection/cardinality/composition/completeness inputs; no IAA conclusion, post-B population, ordinary SourceAttribution/EventOccurrence/coverage, or currentness dependency is permitted |
| producer-source-surface-binding-baseline(Q,P,B) | Exact binding-baseline-universe, producer-source-surface-binding, BindingBaselineObservationPopulation, and complete expected-to-actual structural equality input; no IAA conclusion, post-B population, ordinary SourceAttribution/event, or currentness dependency is permitted |
| binding-lifecycle-owner-slot(Q,P,B,U,slot,S) | Exact lifecycle-universe-derived slot, complete source population, concrete source/eligibility, and one BindingLifecycleCoverageStatement/raw observation family; ordinary SourceAttribution/AuthoritativeSourceAttribution/EventOccurrence/event coverage, binding currentness, IAA conclusion, or downstream result is forbidden |
| binding-lifecycle-population(Q,P,B,U) | Exact binding-lifecycle-universe, every lifecycle source population/direct input, producer binding/baseline, matching global intrinsic node, and global order/concurrency/cardinality/consistency input; ordinary EventOccurrence/coverage and IAA conclusion/currentness are forbidden |
| producer-binding-continuity-conclusion(Q,P,B,U) | Exact binding-baseline-universe, producer binding, carried exact baseline, every retained bootstrap-source population, and BindingLifecycleObservationPopulation; the IAA owns only the bounded positive baseline-coherence-plus-continuity conclusion and cannot own or rewrite any direct input; causality/freshness/history/currentness, binding-event-coverage/currentness, ordinary SourceAttribution/event, coupling/threat/source-control/independence/F/reason/result are forbidden |
| binding-conclusion-causality(Q,P,B,U) | Exact IAA binding conclusion, qualified-time inputs for M and U, exact domain comparison, and semantic-position equality/order input; no freshness/history/currentness, binding-event-coverage/currentness, SourceAttribution, ordinary event, F/reason/result dependency is permitted |
| producer-binding-event-coverage(Q,P,B,U) | Exact baseline/lifecycle universes, all bootstrap source populations, exact baseline, lifecycle population, bounded positive IAA conclusion occurrence family, causality/domain/freshness/history/currentness, and owner/source/IAA projection/cardinality consistency; no ordinary SourceAttribution/EventOccurrence/event population/eligibility, binding-currentness, coupling/threat/source-control/independence, F, reason, or result dependency is permitted |
| producer-source-surface-binding-currentness(Q,P,U) | Exact producer binding, baseline/lifecycle universes, all bootstrap source populations, exact baseline, matching global intrinsic continuity, positive IAA conclusion/currentness, causality, binding-event-coverage, current P lifecycle occurrence, B/U order, and BindingAffectedCoordinates; no ordinary SourceAttribution/direct fact/event eligibility, coupling/threat/independence conclusion, closure, F, reason, or result dependency is permitted |
| direct-cell-result(DirectAbsenceCellCoordinate) | Exact raw direct-owner statement/placeholder for the tagged membership, edge, or source-surface cell, its P-to-O09/O10 surface binding and binding-currentness when the cell is Producer-observed or Producer-reported, and exact endpoint lifecycle bindings; no derived path, source-control conclusion, threat set, absence admissibility, Producer-independence conclusion, closure, or result dependency is permitted |
| derived-influence-path-result(DerivedInfluencePathCoordinate) | Every and only constituent direct-cell-result on the exact finite simple path; the derived path has no additional owner/source and no direct-fact dependency of its own |
| producer-coupling-base-graph(Q) | Exact relevant-producer-set(Q), every Producer lifecycle/intrinsic-continuity/surface-binding/currentness value in it, every raw K45/K49 direct-cell-result/placeholder, and every derived-influence-path-result used by the closed Section 9.1 coupling predicate; no coupling-state/population, threat, eligibility, conclusion, closure, F, or result dependency is permitted |
| producer-control-coupling(Q,A,B) | Exact producer-coupling-base-graph(Q), the exact unordered pair {A,B} from ProducerControlCouplingPairSet(Q), both lifecycle/intrinsic/surface-currentness bindings, and every direct/derived K45/K49/control-chain cell for that pair; it cannot allocate/replace A or B, and no P-specific graph ownership, threat, eligibility, conclusion, closure, F, or result dependency is permitted |
| producer-control-coupling-population(Q) | Exact relevant-producer-set(Q), ProducerControlCouplingPairSet(Q), producer-coupling-base-graph(Q), and exactly one producer-control-coupling state for every pair plus every received coupling-state occurrence used for missing/duplicate/injected/ambiguous cardinality classification |
| producer-threat-control-domain(Q) | Exact relevant-producer-set(Q), every member's producer-source-surface-binding/currentness, and every direct-cell-result/derived-influence-path-result needed by the deterministic least closure; coupling-state/population results, source-control conclusion, absence admissibility, P-specific threat/evidence, IAA Producer-independence conclusion, eligibility, closure, F, and result dependencies are forbidden |
| absence-source-threat-control-domain(Q,S) | Exact relevant-producer-set(Q), every member's producer-source-surface-binding/currentness, and every nonexcluded direct-cell-result/derived-influence-path-result needed by the source-relative least closure; every negative fact sourced by S, coupling-state/population result, source-control/admissibility, P-specific threat/conclusion, coverage, eligibility, closure, F, and result dependency is forbidden |
| absence-source-control(AbsenceSourceControlCoordinate) | Exact absence-source-threat-control-domain(Q,source), producer-source-surface-binding(Q,source), producer-source-surface-binding-currentness(Q,source), and every nonexcluded direct-cell-result/derived-influence-path-result needed to classify that source before its negative facts are qualified; every negative fact sourced by that source, general threat-domain verdict, coupling-state/population result, its claimed absence, absence-source-admissibility, P-specific threat/evidence, Producer-independence conclusion, eligibility, closure, F, and result are forbidden |
| absence-source-admissibility(negative-direct-cell,P) | Exact negative direct-cell-result and its primitive SourceAttribution, producer-source-surface-binding/currentness for that source, absence-source-threat-control-domain(Q,source), exact absence-source-control conclusion, its qualified-time-domain-comparison and MeasuredConclusionUseFreshness, and exact HistoricalCurrentnessQualification; no derived composite-path owner, Producer-independence conclusion, coverage, eligibility, closure, F, or result dependency is permitted |
| producer-influence-threat-set(ProducerIndependenceCoordinate) | Exact MeasurementTargetRoot binding, relevant-producer-set(Q), Producer lifecycle/intrinsic-continuity binding, producer-source-surface bindings/currentness, producer-coupling-base-graph(Q), producer-control-coupling-population(Q), producer-threat-control-domain(Q), every raw direct-cell-result/placeholder in ProducerInfluenceBaseGraph, every derived-influence-path-result, and every least-closure membership step; K46-only cells are retained but never create membership/path edges unless their own facts are promoted under Section 11.3; no absence admissibility, eligibility, coverage, occurrence, closure, RuntimeCorrespondence, IAA Producer-independence conclusion/currentness, F, or result dependency is permitted |
| producer-independence-evidence(ProducerIndependenceCoordinate) | Exact producer-influence-threat-set node, producer-threat-control-domain(Q), every raw direct-cell-result and derived-influence-path-result in TechnicalInfluenceEvidencePopulation, and exact absence-source-admissibility for every negative constituent; neither the classified Producer, a threat member, nor any source controlled by the target can establish absence; no occurrence, closure, RuntimeCorrespondence, IAA Producer-independence conclusion/currentness, F, or result dependency is permitted |
| closure-state-cut | Every and only observation-occurrence coordinate in ClosureCutEvidenceSet(Q). Its occurrence nodes already depend on their direct facts and lifecycle bindings; repeating those transitive coordinates here is forbidden. Event scopes, slots, assertions, source populations, local/Connection coverage sets, invalidation verdicts, and post-cut events are forbidden dependencies |
| event-source-composition-policy(exact PermissionEventRequirementSlot) | Empty set. The value is always independently-complete-source, generated from the closed initial profile catalogue, E01-E17 row, and Section 11 direct-owner cell before evidence; no Producer, provider, configuration, IAA, source count, assertion, or verdict selects it. Any other received token is unknown/malformed and cannot replace this coordinate |
| historical-currentness(exact HistoricalCurrentnessSubject, exact AuthorityUseCut) | Exactly the matching historical-currentness-qualification input node; no content owner, claimed interval, local status, H-13 measurement, F, reason, or result may be substituted |
| path-set(PathClass,SemanticSubjectCoordinate,SemanticSubjectCoordinate) | Relation CombinedClosure and every edge or explicit absence/unresolved conclusion in CompletePathUniverse(PathClass,source,sink,Q) |
| enforcement-gate(channel) | Controller binding, effective-boundary binding, channel/resource/relation CombinedClosures, and UsedEdges(the complete EnforcementGate value), limited to K04/K23/K28-K30/K47/K48 by Section 16 |
| governance-controller(exact non-singleton SameSideTargetOverlapGraph component) | Controller lifecycle/supporting-controller binding, controller/boundary and relation CombinedClosures for every component key, and every exact K04/role edge defining governance over that indivisible component |
| target-and-membership(Q) | Q's five CombinedClosures and every runtime/effective-boundary lifecycle binding for every member explicitly carried by the constructed MembershipEpoch and MeasurementTarget; it has no RuntimeCorrespondence, permission-key-resolution, IAA currentness, F, governance, reason, or result dependency |
| privacy-projection(surface) | Every authoritative/measured/protected-disposition node whose value is projected to that surface; protected-detector-input and ProtectedPhysicalLocator are forbidden |
| qualified-time-input(position) | Exactly the qualified-time-source-input coordinate for the specified measurement/conclusion time or use cut, including its QualifiedPhysicalTimeDomain, uncertainty interval, and source verdict; no conclusion, comparison/freshness verdict, history, event, F, or final-result dependency is permitted |
| qualified-time-domain-comparison(left,right) | Exact qualified-time-input(left) and qualified-time-input(right); equality is structural and no conversion, offset, provider mapping, local-clock relation, freshness, history, F, reason, or result dependency is permitted |
| measured-conclusion-freshness(subject,M,U) | Exact qualified-time-input(M), exact qualified-time-input(U), exact qualified-time-domain-comparison(M,U), and catalogue constant MeasuredConclusionMaximumAge=60 seconds; no history/currentness qualification, event, closure FreshnessCalculation, override/conversion token, configuration, IAA/provider choice, F, reason, or result dependency is permitted |

RuntimeCorrespondencePropositionDependencies is the following closed immediate table. No RC result depends on the RuntimeCorrespondence wrapper that will contain it:

| RC branch | Exact immediate dependencies |
|---|---|
| RC01 | Q's authoritative H-02 side and result=applicable permission inputs only |
| RC02 | Q's authoritative H-02 side/permission inputs and the H-07 authoritative Connection input only |
| RC03 | target-and-membership(Q) and MeasurementTargetRoot's exact lifecycle/direct-fact bindings |
| RC04 | runtime-members CombinedClosure and every runtime candidate/lifecycle binding in its mandatory extent |
| RC05 | runtime-members CombinedClosure plus every member's lifecycle and exact K01 direct-producer-fact |
| RC06 | exactly all five CombinedClosure nodes and closure-state-cut binding |
| RC07 | supporting-controller/boundary CombinedClosure and effective-boundary-set binding |
| RC08 | runtime-members and supporting-controller/boundary CombinedClosures, effective-boundary-set binding, and UsedEdges(the complete runtime-to-effective-boundary coverage relation) |
| RC09 | exactly all five CombinedClosure nodes and every RelationEdge in their complete unions |
| RC10 | every relevant-producer-set/global intrinsic/binding; baseline/lifecycle universe; bootstrap source/eligibility/source-population; baseline expected/actual/direct-input/composition/population/verdict; lifecycle direct-input/population; positive IAA binding conclusion/causality/domain/freshness/history/currentness; binding coverage/currentness; and every retained direct/derived/coupling/threat/source-control/independence/proposition/occurrence/closure coordinate required by the five extents |
| RC11 | all five closures; every contradictory global intrinsic, universe, bootstrap source/eligibility/population, baseline direct-input/composition/population/equality/verdict, lifecycle direct-input/population, IAA conclusion/causality/consistency/currentness, direct fact, occurrence, closure assertion, and relation candidate in the frozen population; each closure carries its exact ClosureConflict set |

The following F-family rules generate exact immediate dependency sets. local(Q,X) means every generated X node at exact permission scope Q. No row permits an unlisted dependency.

| Family | Exact RequiredDependencies |
|---|---|
| F01 | Q's real-owner H-02 content inputs and governance historical-currentness-qualification inputs, H-07 input, IAA measured inputs; permission/side/Connection projection bindings; permission-key-resolution; target, identity, lifecycle, and correspondence bindings |
| F02 | Q's supporting-controller/boundary CombinedClosure; every K02-K04 RelationEdge; supporting-controller, role, and effective-boundary bindings |
| F03 | Q's five closures; relevant-producer-set/global intrinsic/binding; baseline/lifecycle universes; all bootstrap source/eligibility/population/direct-input/composition/baseline/lifecycle nodes; positive IAA binding conclusion/causality/domain/freshness/history/currentness; binding coverage/currentness; and every retained coupling/threat/source-control/admissibility/influence/evidence/proposition/IAA-independence node for mandatory extents/unions |
| F04 | Every and only f04-pair-evaluation coordinate in F04Pairs(C); each unequal-context pair already consumes separation-currentness, whose own exact immediate dependencies include measured freshness and history, so adding those transitive nodes directly to aggregate F04 is forbidden |
| F05 | Q's controller/boundary/relation closures; controller roles; relevant-producer-set/global intrinsic/binding; baseline/lifecycle universes; all bootstrap source/eligibility/population/direct-input/composition/baseline/lifecycle nodes; positive IAA binding conclusion/causality/domain/freshness/history/currentness; binding coverage/currentness; coupling/threat/source-control/admissibility/influence/evidence/path bindings; IAA independence conclusion/time/history/currentness; and all K08-K19/K31/K35/K47-K49 edges |
| F06 | Q's resource/channel and relation CombinedClosures; every path-set binding whose CompletePathUniverse contains a K20-K24 candidate between a nonmember and Q's target/resource/channel surface; every applicable enforcement-gate binding; MediatedChannelPair |
| F07 | Q's resource/channel and relation CombinedClosures and every K25-K27/K45 edge |
| F08 | Q's resource/channel and relation CombinedClosures; path-set and enforcement-gate bindings; MediatedChannelPair |
| F09 | Q's physical-environment, resource/channel, and relation CombinedClosures and every K32-K35/K45/K46 edge |
| F10 | Q's physical-environment, resource/channel, and relation CombinedClosures and every K36-K39/K45 edge |
| F11 | Q's controller/boundary, resource/channel, and relation CombinedClosures; observation-only and controller-role bindings; every K40-K44 edge |
| F12 | Q's five CombinedClosures; every mutable RelationEdge in them; every catalogue-constant event-source-composition-policy binding; Q's PermissionEventCoverageSet and every event-requirement-source-population node for RequiredEventSlots(Q) |
| F13 | Q's physical-environment, resource/channel, and relation CombinedClosures; every K05/K06/K45/K46 edge; and, for unequal contexts, Q's unique applicable local detector disposition, IAA separation input, and separation-currentness nodes |
| F14 | Every relevant-producer-set/global intrinsic/binding; baseline/lifecycle universe; bootstrap source/eligibility/population/direct-input/composition/baseline/lifecycle population; positive IAA binding conclusion/causality/time/freshness/history/currentness; binding coverage/currentness; and every retained direct/derived/coupling/threat/source-control/admissibility/ordinary SourceAttribution/influence/evidence/IAA-independence/proposition/occurrence/closure node at Q |
| F15 | Q's closure-state-cut binding, every ClosureCutEvidenceSet observation occurrence, every catalogue-constant event-source-composition-policy binding, Q's PermissionEventCoverageSet, and every event-requirement-source-population node for RequiredEventSlots(Q); no event node is a cut-binding dependency |
| F16 | Every real-owner/Stage-A/history/RuntimeCorrespondence input; relevant-producer-set/global intrinsic/binding; baseline/lifecycle universe; bootstrap source/eligibility/population; baseline expected/actual/direct-input/composition/population/verdict; lifecycle direct-input/population; positive IAA binding conclusion/causality/currentness/coverage/binding-currentness; and all retained direct/derived/coupling/threat/source-control/independence/protected/time/history/identity/equivalence/occurrence/closure/relation/event-policy/event-population inputs required before F. It excludes closure FreshnessCalculation except where expressly consumed, reuse, F/triggers/reasons/states/provenance validation/completeness/final results |

### 22.4 Exact semantic-trigger population

Every trigger instance below is generated even when its represented Boolean is false. No trigger is omitted because an earlier trigger is true. “One per FactEvaluation” includes every permission-scoped family and the aggregate F04; where the exact construction identifies an affected F04PairKey, its emitted reason uses f04-pair-scope.

| Rank | Exact instance population and TriggerInstanceKey | Exact RequiredDependencies |
|---|---|---|
| 001 | one at connection-scope(C), wrong-connection | H-07 input/currentness, every connection-projection binding, every F01 |
| 002 | one per S at side-scope(S), wrong-tenant-context | S H-02 input/currentness, all permission inputs/projection bindings on S, their F01 nodes |
| 003 | one at connection-scope(C), privacy-carrier-violation | every privacy-projection binding, protected disposition, IAA separation conclusion, and aggregate F04 |
| 004 | one per A in H02ApplicabilityCandidates(S), stage-a-wrong-participant-side(A), plus one per Q in CandidatePermissionCoordinates(S), stage-b-wrong-participant-side(Q) | A: exact typed Stage-A H-02 inputs/intersection/result for A. Q: Q H-02 applicable input/currentness when expected, side projection, RuntimeCorrespondence candidate, and F01 when generated |
| 005 | one per A in H02ApplicabilityCandidates(S), stage-a-wrong-permission-or-correspondence(A), plus one per Q in CandidatePermissionCoordinates(S), stage-b-wrong-permission-or-correspondence(Q) | A: exact typed Stage-A inputs/intersection/result/cardinality for A. Q: applicable H-02 input/currentness when expected, RuntimeCorrespondence/currentness when expected, permission projections, key resolution candidate, and F01 when generated |
| 006 | one per Q in CandidatePermissionCoordinates(S) | RuntimeCorrespondence/target candidates, target/lifecycle bindings, and F01 when generated |
| 007 | one at connection-scope(C), wrong-profile-or-release | H-07 input/currentness, both side H-02 inputs/currentness, profile/release projections, every F01 |
| 008 | one unqualified per A in H02ApplicabilityCandidates, one unqualified per Q in CandidatePermissionCoordinates, one cross-side at C, and one family-qualified per FactEvaluation | A: all typed Stage-A projections/results. Q: all authoritative/measured, baseline/lifecycle universe, concrete bootstrap source/population/direct-input/composition/baseline, IAA binding conclusion/causality/currentness, binding coverage/currentness, ordinary direct/binding/equivalence/occurrence/closure/edge/event nodes plus matching global intrinsic nodes; C: cross-side equivalence/detector/disposition/conclusion; family: its exact F node |
| 009 | one per Q in CandidatePermissionCoordinates plus one cross-side at C | Q identity/lifecycle/equivalence bindings; C cross-side equivalences and separation conclusions |
| 010 | one per A in H02ApplicabilityCandidates(S), stage-a-history(A), plus one per Q | A: every governance historical-currentness-qualification for that exact Stage-A candidate. Q: governance/IAA historical qualifications including binding-continuity conclusions, baseline-at-B and lifecycle/bootstrap/ordinary occurrences, binding conclusion M/U order, producer closures, event coverage, correspondence currentness, and closure-state-cut binding |
| 011 | one per Q | Q direct facts, every concrete binding-bootstrap-source/eligibility/population, Producer lifecycle bindings, occurrences, and ProducerClosureAssertions |
| 012 | one per Q | relevant-producer-set, matching global intrinsic nodes, producer binding, baseline/lifecycle universes, every bootstrap source/population/direct input/composition/baseline verdict, lifecycle population, positive IAA binding conclusion/causality/domain/freshness/history/currentness, binding coverage/currentness, coupling pair/base/state/population, general/source-relative threat domains, source-control conclusion/domain/freshness/history/admissibility, all propositions, threat/evidence, IAA independence conclusion/freshness/currentness/history, proposition coverage, and five closures |
| 013 | one per Q | runtime-members CombinedClosure |
| 014 | one per Q | supporting-controller/boundary CombinedClosure |
| 015 | one per Q | physical-resident/environment CombinedClosure |
| 016 | one per Q | resource/channel/relation closures and edges, matching global intrinsic nodes, producer bindings, baseline/lifecycle universes and members, every concrete bootstrap source/eligibility/population, baseline expected/actual/direct-input/composition/population/verdict, lifecycle direct-input/before-after/population, positive IAA conclusion/causality, binding coverage/currentness, direct/derived cells, coupling graph/state/population, source-relative threat domain, and source-control/admissibility coordinate |
| 017 | one per FactEvaluation, required-fact-incomplete(exact family coordinate) | exact F node |
| 018 | one per FactEvaluation, required-fact-indeterminate(exact family coordinate) | exact F node |
| 019 | one per FactEvaluation, required-fact-unsatisfied(exact family coordinate) | exact F node |
| 020 | one per Q and one per S | Q: permission-key-resolution and PermissionCoverageEvaluation candidate family; S: ApplicablePermissionSet input, exact coordinate/key resolution family, and SideEvaluation candidate family |
| 021 | one per Q | H-02 input/currentness, RuntimeCorrespondence/currentness, target binding, and permission-key-resolution |
| 022 | one per graph component including singleton and one per F04PairKey | component: SameSideTargetOverlapGraph, every complete pair classification/correspondence in that component, and SharedGovernanceRelationSet; pair: exact f04-pair-evaluation and cross-side equivalence/separation inputs. A true component instance emits governance-component-scope. |
| 023 | one per non-singleton graph component, emitting governance-component-scope | SameSideTargetOverlapGraph, that exact SharedGovernanceRelation occurrence, every pair correspondence/state, permission currentness, governance-controller binding, and defining base closures/edges |
| 024 | one closure instance per Q plus one measured-conclusion instance per RuntimeCorrespondence, ProducerIndependence, ProducerBindingContinuity, IAA separation, and AbsenceSourceControl conclusion coordinate | closure instance: occurrences, closure-state-cut binding, both qualified-time-input nodes, their exact qualified-time-domain-comparison, and FreshnessCalculation; measured instance: exact conclusion coordinate, both qualified-time-input nodes, their exact qualified-time-domain-comparison, derived-age interval when and only when exact-equal, and MeasuredConclusionUseFreshness; binding instance additionally consumes BindingConclusionCausality and the exact M/U semantic-position equality/order input |
| 025 | one per Q | PermissionEventCoverageSet and ordinary event policy/source/assertion nodes; every baseline/lifecycle universe, owner slot, concrete source/population/direct input/composition/population/baseline verdict; positive IAA conclusion/causality/currentness; and ProducerBindingEventCoverage. Bootstrap nodes do not depend on ordinary EventOccurrence/source eligibility |
| 026 | one per Q | PermissionEventCoverageSet; every baseline/lifecycle universe/source/baseline verdict, lifecycle observation/affected projection, canonical event/affected projection, binding coverage/currentness; matching global intrinsic continuity for intrinsic events; and five closures. No replacement/reversal repairs an old source/baseline, and no Q-local result allocates an incarnation |
| 027 | one closure instance per Q plus one measured-conclusion instance per RuntimeCorrespondence, ProducerIndependence, ProducerBindingContinuity, IAA separation, and AbsenceSourceControl conclusion coordinate | exact qualified-time-domain-comparison and exact FreshnessCalculation or MeasuredConclusionUseFreshness; trigger true only on exact-equal domains with resolved lower age bound at least 60 seconds. A binding instance also consumes BindingConclusionCausality and cannot be well formed and stale simultaneously |
| 028 | one per Q | exact tagged ReuseProvenance |
| 029 | one H-07 instance at C; one H-02 side/set per S; one H-02 permission per Q; one IAA runtime, independence, source-control, binding-continuity/currentness plus one binding-currentness per coordinate; and one separation per L when required | Each instance depends on exact currentness, domain comparison/freshness when applicable, and history. Each binding instance additionally depends on global intrinsic continuity, producer binding, baseline/lifecycle universes, all bootstrap source populations, baseline/populations, positive conclusion/causality/currentness, binding coverage/currentness. It records failure and cannot rewrite any source/universe/baseline/local state; freshness/history cannot cure one another or causal/source/baseline/currentness failure |
| 030 | one ordinary-measurement instance per Q and one protected-detector instance per L when required | Q direct facts, global intrinsic continuity, producer bindings, baseline/lifecycle universes, bootstrap source/eligibility/populations/direct inputs/compositions/baselines, lifecycle populations, binding conclusions/causality/currentness/coverage, source-control conclusions, time inputs/comparisons/freshness, occurrences, closures, and event coverage; L protected detector inputs/disposition and time inputs/comparison |
| 031 | one per Q in CandidatePermissionCoordinates plus one at C | Q: every required/extra semantic-class, baseline-universe filter, source-selection/rebinding, nonexhaustive-empty, event-policy, maximum-age/override, alternate binding cut, custom fallthrough, provider label, or cross-domain conversion token; C: connection/profile/cross-side/detector/channel/governance tags. Only 60 seconds is accepted, binding continuity uses M=U/self-age `[0,0]`, and no source-selection or cross-domain-conversion token is accepted |

The emitted reason for each true trigger has the exact canonical ReasonScope: connection, side, permission, local-IAA, F04-pair, or governance-component as dictated by its TriggerInstanceKey. The tables define dependency generation, not a representation or evaluation order.

### 22.5 Total validation and reasons 032-035

Four independent total checks run over the structural graph:

| Rank | ReasonClass | Emit exactly when |
|---|---|---|
| 032 | provenance-cycle | the directed relation contains a cycle, including self-dependency |
| 033 | provenance-missing-dependency | a required node is absent; a declared dependency coordinate has no present node; or RequiredDependencies(node) minus declared DependencyCoordinateSet is nonempty |
| 034 | provenance-unknown-node-type | a present node has a type outside Section 22.2; a reference to an absent coordinate remains 033 |
| 035 | provenance-contradictory-duplicate-or-malformed | a known node has noncanonical scope/question; a required known node has an extra dependency; a known extra node is present; candidate multiplicity at one coordinate differs from one; two nodes at one coordinate differ; or declared DependencyCoordinateSet minus RequiredDependencies(node) is nonempty |

Every true check emits its reason; no discretionary selection exists. A cycle plus missing dependency emits both 032 and 033. An unknown-type node also emits 035 only if its common structural envelope is malformed.

All 032-035 tuples have connection-scope(exact ConnectionEvaluationKey) and absent FactFamily.

ProvenanceIntegrityState precedence is:

~~~
cycle                reason 032
missing-dependency   reason 033
unknown-node         reason 034
malformed            reason 035
valid                otherwise
~~~

The checks are independent. One omitted required dependency with all nodes otherwise present emits exactly 033. One unnecessary existing canonical dependency emits exactly 035. A wrong permission scope, side scope substituted for a permission node, or different subject/question decomposition that replaces the canonical node emits 033 and 035; its absent inventory record independently emits 036. If the canonical node remains and only an extra alternative node is added, it emits 035 without 033 or 036 solely for that defect. Integrity-state precedence never suppresses a true reason.

PopulationDependencySet participates in the same four checks as a closed provenance relation: omission of its sole StageAResolvedPopulation-to-H13EvaluationPopulation dependency emits 033; any reverse or extra population dependency emits 035; a directed population cycle independently emits 032; and an unknown population endpoint type emits 034. Its required Stage-A and Stage-B population records are independently inventoried, so absent/duplicate/conflicting records also emit 036 without changing those provenance reasons.

### 22.6 Honest two-stage applicability and evaluation populations, inventory, and reason 036

Population generation has exactly two ordered stages. Stage A is authoritative H-02 applicability resolution. Stage B is H-13 measurement/evaluation expansion over every and only Stage-A authoritative result=applicable. No Stage-B semantic value can influence Stage A. The exact finite bounds are:

~~~
H02ApplicabilityCoordinateUniverse = every structural coordinate obtainable from
  the exact ConnectionEvaluationKey, two SideEvaluationKey values, AuthorityUseCut,
  the complete authoritative H-02 Organization-registration, boundary-permission,
  Workspace-state, and Workspace-overlay candidate domains, including malformed,
  noncurrent, wrong-scope, contradictory, and injected received audit candidates,
  plus every exact real-owner content attribution and HistoricalCurrentnessQualification.

H02ApplicabilitySeed = (
  exact ConnectionEvaluationKey and Sides(ConnectionEvaluationKey),
  exact raw accepted H-02 OrganizationRegistrationApplicabilityInput,
    BoundaryPermissionApplicabilityInput, WorkspaceStateApplicabilityInput, and
    WorkspaceOverlayApplicabilityInput candidate families,
  exact Organization/Workspace content-source attribution candidate families,
  exact HistoricalCurrentnessQualification candidate family at AuthorityUseCut,
  exact H-07 Connection WorkspaceTag/side/release/profile comparison inputs,
  exact received malformed/unknown candidates in those bounded H-02 domains
)

StageAResolvedPopulation = (
  exact host-side and agent-side H02ApplicabilityPopulation values defined in Section 13.1,
  exact host-side and agent-side H02SideApplicabilityProjection values,
  exact host-side and agent-side ApplicablePermissionSet values,
  exact Stage-A completion and source-to-result dependency result
)

H13ClosedCandidateCoordinateUniverse = every structural coordinate obtainable within
  the exact ConnectionEvaluationKey, two SideEvaluationKey values, AuthorityUseCut,
  selected profile/release, exact Stage-A result=applicable permission coordinates,
  authoritative H-07 bundle, complete bounded direct-source enumeration domains,
  received candidate occurrences including malformed candidates, and the closed
  S01-S12/O01-O11/resource/channel/K01-K49/E01-E17/RC01-RC11/type/source matrices,
  RelevantProducerSet/Q-independent intrinsic-continuity/surface-binding/
  candidate-independent BindingBaselineUniverse/BindingLifecycleUniverse/
  concrete BindingBootstrapSourceCoordinate/eligibility/candidate-population/
  BindingBaselineOwnerSlot/expected-projection/direct-input/composition/population/baseline-verdict/
  BindingLifecycleOwnerSlot/direct-input/population/positive-IAA-binding-conclusion/causality/
  total binding-event-coverage/currentness/coupling/source-control/threat-set rules,
  exact QualifiedPhysicalTimeDomain
  equality/comparison, the fixed 60-second measured-conclusion freshness rule, the catalogue-fixed
  event-source policy, and Stage-B IAA HistoricalCurrentnessQualification coordinates.

H13EvaluationSeed = (
  exact ConnectionEvaluationKey and Sides(ConnectionEvaluationKey),
  exact complete StageAResolvedPopulation,
  every and only Stage-A authoritative result=applicable H02IsolationApplicabilityProjection
    and its PermissionEvaluationCoordinate,
  exact H-07 input,
  exact selected profile/release/type/source matrices,
  exact raw direct-source enumeration candidates and required-source-slot placeholders,
  exact raw IAA RuntimeCorrespondence candidates,
  exact raw IAA conclusion HistoricalCurrentnessQualification candidates/placeholders,
  exact raw QualifiedPhysicalTimeDomain and QualifiedPhysicalTimeInput candidates/placeholders
    for each closure/conclusion state position and AuthorityUseCut,
  exact raw producer-lifecycle-direct-owner intrinsic and O09/O10 allocation candidates,
  exact raw candidate-independent subject/object/resource/channel/K/owner/source enumeration
    candidates and unavailable placeholders needed to generate every BindingBaselineUniverse,
  exact raw concrete bootstrap Producer enrollment/class/domain/scope/lifecycle candidates,
    occurrences, and unavailable placeholders for every generated baseline/lifecycle owner slot,
  exact raw BindingBaselineDirectAttribution and BindingBaselineOwnerObservation
    candidates/placeholders for every generated universe-derived baseline owner slot/source at B,
  exact raw E07/E11/E14/E15/E17 BindingLifecycleDirectAttribution,
    BindingLifecycleCoverageStatement, and BindingLifecycleObservation candidates/placeholders
    for every generated universe-derived lifecycle owner slot/source,
  exact raw IAA ProducerBindingContinuityMeasuredConclusion candidates/placeholders,
  exact raw protected-source candidates when contexts are unequal,
  exact received malformed/unknown candidates in the bounded source domains
)
~~~

Every domain in both universes is finite and explicitly bounded by the Connection, authoritative H-02 domains, scope roots, source enumeration boundaries, and AuthorityUseCut. An unbounded selector, inaccessible finite source domain, or source that cannot state a finite complete domain supplies an explicit unavailable/indeterminate placeholder and cannot authorize; it does not create an infinite population.

Stage A computes every source-specific structural scope result directly from H02ApplicabilitySeed, authenticates content under the exact Organization/Workspace owner, requires authoritative-current HistoricalCurrentnessQualification for every exact participating governance subject/revision/content, and only then computes applicability under Section 13.1. It terminates before any PermissionEvaluationCoordinate or H-13 measured question is generated. Claimed interval membership alone can produce only scope-eligible. Stage-A denied, narrowed, wrong-scope, noncurrent, contradictory, or injected candidates remain audit/provenance/trigger members but cannot seed Stage B. No H-13 measured fact can create or repair a Stage-A qualification.

ExpandH13(P) is the exact union of these Stage-B additions, with no other rule:

1. every and only Stage-A authoritative result=applicable member yields its required PermissionEvaluationCoordinate, key-resolution placeholder, per-permission currentness, RC01-RC11, F, event, coverage, freshness, reuse, overlap/governance, and trigger coordinates; a raw supplied RuntimeCorrespondence/target/H-13 measurement candidate purporting to resolve such a member also yields its CandidatePermissionCoordinate and exact input/projection/trigger coordinates even when injected or malformed; no rejected Stage-A candidate yields a Q-scoped authorization-required coordinate;
2. every runtime candidate yields its lineage/incarnation lifecycle, K01 membership, required runtime ClosureKind roots, membership-epoch/target binding questions, and direct proposition questions;
3. every boundary/controller candidate yields complete K02-K04 ancestry, roles, every K08-K19/K31/K35/K47-K49 path cell, lifecycle, closure, and direct proposition questions;
4. every physical environment/resident candidate yields K05, co-residency, environment-owned object, K45/K46, lifecycle, closure, and direct proposition questions;
5. every ResourceObject or Channel candidate yields its owner-domain question, all applicable attachments/endpoints/gates, every type-matrix K06-K49 cell, lifecycle, closure, and direct proposition questions;
6. every RelationEdge candidate, including a received malformed edge, yields both endpoint subject/object/resource/channel questions, the exact direct-owner statement, every CompletePathUniverse membership, affected F/trigger coordinates, and no normalization or deletion;
7. every Producer candidate first yields its exact tagged occurrence coordinate for each applicable direct/event/lifecycle/bootstrap/K45/K49/surface/source-control/closure/technical/late branch; every distinct ProducerIdentity yields one Q-independent lifecycle coordinate/result. For each Q/P/B, all frozen bounded subject/object/resource/channel/K/owner/source-enumeration members first yield BindingBaselineUniverseMember coordinates and one candidate-independent BindingBaselineUniverse; each universe member yields exactly one baseline owner slot before candidate expected projection. Every matching concrete Producer candidate and unavailable placeholder yields its distinct BindingBootstrapSourceCoordinate/eligibility and raw occurrence; every slot yields one complete source population. Only then does the producer binding supply expected projections; per-source baseline direct inputs compose into one actual complete owner projection, one baseline population, and one baseline verdict. Independently enumerated binding-affecting members through U similarly yield BindingLifecycleUniverse, lifecycle slots, per-slot concrete source populations/direct inputs, and the lifecycle population. Then one bounded positive IAA ProducerBindingContinuityMeasuredConclusion binds the exact universe, baseline, and post-B population at M=U; causality/currentness/freshness/history, total binding coverage/currentness, raw cells, and derived paths follow. Candidate membership, provider/local filters, source preference, verdicts, offered pairs, failures, or downstream conclusions select no universe member/source and allocate no incarnation;
8. every candidate negative DirectCellResult source yields its exact AbsenceSourceThreatControlDomain excluding that source's negative cells, AbsenceSourceControlCoordinate, base-graph, IAA conclusion/currentness/fixed-freshness/historical-qualification, and AbsenceSourceAdmissibility questions for every classified Producer coordinate at Q; the source-control conclusion is generated only from that source-relative pre-source-control domain and never from the negative fact it qualifies;
9. every DirectSemanticPropositionCoordinate yields its exact candidate source set, direct-fact candidates/placeholders, ProducerInfluenceThreatSet, ProducerIndependenceMeasuredConclusion/currentness/fixed-freshness/historical-qualification candidates/placeholders, PropositionDirectSourceCoverage, occurrence, ProducerClosureAssertion, CombinedClosure, RC proposition, and affected F coordinates;
10. only after Q's closure-state-cut binding is generated from ClosureCutEvidenceSet(Q), every permission-local mutable subject/object/relation yields every RequiredEventSlot, its constant independently-complete-source policy binding, complete candidate Producer set, continuous-coverage and canonical EventOccurrence DirectSemanticPropositionCoordinate questions, per-candidate assertion/placeholder, EventRequirementSourcePopulation, exact E07/E11/E14/E15/E17 AffectedCoordinates including binding invalidation, and PermissionEventCoverageSet; any received other policy token yields its unknown/malformed input/trigger coordinate but never replaces the constant; no ordinary event coordinate feeds the cut or any BindingLifecycleObservationPopulation/ProducerBindingEventCoverage, and ordinary event-source eligibility never authenticates itself;
11. every two resolved same-side permission candidates yield their exact unordered target-overlap pair question; all pairs yield SameSideTargetOverlapGraph components and one SharedGovernanceRelation candidate/placeholder per non-singleton component;
12. unequal contexts yield the exact full-preimage LocalIAASeparationKey population, protected detector sources/dispositions, IAA separation conclusions/currentness/fixed-freshness, and Cartesian F04PairKey population; equal contexts yield none of them; every permission closure freshness instance and every RuntimeCorrespondence, ProducerIndependence, ProducerBindingContinuity, separation, and AbsenceSourceControl conclusion yields exact qualified measurement/use time-input, exact QualifiedPhysicalTimeDomainComparison, a DerivedMeasuredConclusionAgeInterval only on exact-equal domains, and the applicable FreshnessCalculation or MeasuredConclusionUseFreshness questions; ProducerBindingContinuity additionally yields exact M/U semantic equality/order and BindingConclusionCausality, with M and U resolving to one input coordinate when exact-close; and
13. every added semantic question yields its one canonical Section 22.2 node coordinate, all Section 22.4 true-or-false trigger coordinates, required component/state coordinates, and RequiredDependencies questions. A newly exposed semantic coordinate re-enters rules 1-13.

Only Stage B uses a structural least fixed point:

~~~
P0 = H13EvaluationSeed
P(n+1) = P(n) union ExpandH13(P(n))
H13EvaluationPopulationMembers = least Pn such that P(n+1) = P(n)

H13EvaluationPopulation = (
  exact ConnectionEvaluationKey,
  exact H13ClosedCandidateCoordinateUniverse,
  exact H13EvaluationSeed,
  exact H13EvaluationPopulationMembers,
  exact fixed-point equality result
)

PopulationDependencySet = {
  (exact StageAResolvedPopulation, exact H13EvaluationPopulation)
}

DerivationPopulation = (
  exact ConnectionEvaluationKey,
  exact StageAResolvedPopulation,
  exact H13EvaluationPopulation,
  exact PopulationDependencySet,
  exact stage-order result
)
~~~

Stage-B expansion is monotone addition only and terminates after at most the cardinality of H13ClosedCandidateCoordinateUniverse strict-growth steps. No candidate is removed because it is malformed, contradictory, duplicate, late, unavailable, candidate-omitted, or failure-causing. Only the final Stage-A applicable set selects Stage B; no substantive verdict controls either stage. H13EvaluationPopulation freezes before substantive resolution. From it derive global intrinsic continuity and RelevantProducerSet; then generate candidate-independent baseline universes from all bounded direct-source members. A member discovered on the final strict-growth step re-enters expansion and adds its universe/slot/source coordinates before fixed-point equality can hold. Generate complete concrete source populations and actual projections, then allow the binding candidate to supply only expected projections and derive the baseline. Generate candidate-independent lifecycle universes/source populations and post-B evidence, then the bounded positive IAA conclusion closed at M=U, causality, freshness/history/currentness, binding coverage/currentness, and only afterward ordinary attribution/events, coupling, threats, source control, independence, F, and result. Equal complete semantic inputs therefore yield identical universes, slots, concrete-source populations, provenance, and decisions regardless of discovery order. RequiredNodeCoordinateSet, RequiredRecordSet, and RequiredDerivationInventory are finalized from this closed population before completeness.

When a required Stage-B resolution is absent or ambiguous, the exact coordinate and a tagged absent/ambiguous population member remain; fixed per-permission currentness, RC01-RC11, F, trigger, coverage, and state coordinates are still generated. A required dynamic source member that cannot be resolved is represented by its exact required-question coordinate with unavailable/indeterminate semantic value, never omitted. Structurally equal complete raw inputs necessarily produce the same StageAResolvedPopulation, Stage-A ApplicablePermissionSet values, H13EvaluationSeed, Stage-B expansion sequence, least fixed point, and frozen DerivationPopulation regardless of discovery order or implementation.

RequiredNodeCoordinateSet is every and only coordinate generated by Sections 22.2-22.4 from DerivationPopulation.

SemanticRecordCoordinate is:

~~~
SemanticRecordCoordinate = (
  exact SemanticRecordType,
  exact EvaluationScope,
  exact RecordQuestion
)

SemanticRecordType =
  node-semantic-value(exact ProvenanceNodeType)
  | h02-applicability-population
  | h13-evaluation-population
  | derivation-population
  | evaluation-provenance-candidate
  | provenance-check
  | provenance-validation-reason-set
  | provenance-integrity-state

RecordQuestion =
  exact QuestionKey prescribed for the node type
  | exact-stage-a-population
  | exact-stage-b-population
  | exact-population
  | substantive-stages-1-through-13
  | cycle-check
  | missing-dependency-check
  | unknown-node-type-check
  | coordinate-dependency-grammar-check
  | provenance-validation-reason-set
  | provenance-integrity-state
~~~

~~~
RequiredRecordSet =
  {
    (
      node-semantic-value(node.ProvenanceNodeType),
      node.EvaluationScope,
      node.QuestionKey
    )
    | node in RequiredNodeCoordinateSet
  }
  union
  {
    (h02-applicability-population, connection-scope(C), exact-stage-a-population),
    (h13-evaluation-population, connection-scope(C), exact-stage-b-population),
    (derivation-population, connection-scope(C), exact-population),
    (evaluation-provenance-candidate, connection-scope(C), substantive-stages-1-through-13),
    (provenance-check, connection-scope(C), cycle-check),
    (provenance-check, connection-scope(C), missing-dependency-check),
    (provenance-check, connection-scope(C), unknown-node-type-check),
    (provenance-check, connection-scope(C), coordinate-dependency-grammar-check),
    (provenance-validation-reason-set, connection-scope(C), provenance-validation-reason-set),
    (provenance-integrity-state, connection-scope(C), provenance-integrity-state)
  }

RequiredDerivationInventory = (
  exact ConnectionEvaluationKey,
  exact selected IsolationProfile,
  exact DerivationPopulation,
  exact PopulationDependencySet,
  exact RequiredRecordSet
)

ResultCompletenessGate = (
  exact RequiredDerivationInventory,
  exact finite present SemanticRecordCoordinate multimap,
  exact missing coordinate set,
  exact conflicting/multiply-present coordinate set,
  ResultCompletenessState
)

ResultCompletenessState = complete | incomplete
~~~

The h02-applicability-population record represents the exact StageAResolvedPopulation. The h13-evaluation-population record represents the exact H13EvaluationPopulation. PopulationDependencySet contains exactly the single Stage-A-to-Stage-B relation shown and no reverse or additional cross-stage edge. The derivation-population record represents their ordered pair and stage-order result. Omitting, duplicating, reversing, or adding an H-13-to-Stage-A dependency is independently incomplete or malformed under the ordinary record/provenance rules.

This two-stage generation yields, without discretionary selection:

- exactly one complete H02ApplicabilityPopulation and H02SideApplicabilityProjection for each side, with every rejected candidate retained and no Stage-B authorization node for it;
- exactly one SideEvaluation, H02SideCurrentnessAssertion, H02CurrentnessSet, SameSideTargetOverlapGraph, and SharedGovernanceRelationSet evaluation for each of the two sides;
- exactly one PermissionEvaluationCoordinate, PermissionCoverageEvaluation coordinate, H02PermissionCurrentnessAssertion coordinate, RuntimeCorrespondence input/currentness coordinate, eleven RC proposition-result coordinates, PermissionEventCoverageSet, freshness, reuse, and F01-F03/F05-F16 set per ApplicablePermissionMember;
- exactly one Q-independent ProducerIntrinsicContinuity result per ProducerLifecycleEvaluationCoordinate; exactly one RelevantProducerSet, coupling graph/population, and threat domain per Q; per RelevantProducerSet member/Q exactly one ProducerSourceSurfaceBinding, candidate-independent BindingBaselineUniverse and BindingLifecycleUniverse, baseline/lifecycle population, baseline verdict, positive bounded IAA conclusion/causality/currentness/freshness/history, binding coverage, and binding currentness; exactly one slot per universe member; exactly one distinct binding-bootstrap-source coordinate per concrete candidate and one complete source-population node per slot; exactly one baseline/lifecycle direct-input coordinate per slot/source with raw multiplicity retained; exactly one coupling state per unordered pair; exactly one source-relative threat/source-control family per coordinate; one threat/independence family per ProducerIndependenceCoordinate; and one proposition coverage per direct proposition;
- exactly one EventRequirementSourcePopulation per required permission-local slot and one event-coverage-assertion candidate-family/placeholder coordinate per exact slot/candidate-Producer coordinate;
- exactly one connection-event-coverage-union coordinate whose dependencies preserve every permission owner;
- exactly one aggregate connection F04 and exactly one F04PairEvaluation per exact Cartesian-product pair;
- exactly one ProtectedDetectorEvidenceDisposition, IAAContextLocalSeparationConclusion, separation-currentness, and fixed-freshness coordinate per LocalIAASeparationKey when contexts are unequal, and zero when equal;
- exactly one QualifiedPhysicalTimeDomain value and QualifiedPhysicalTimeInput per distinct required closure/conclusion state position and use-cut position, exactly one QualifiedPhysicalTimeDomainComparison per required pair, and exactly one applicable FreshnessCalculation or MeasuredConclusionUseFreshness per permission closure, RuntimeCorrespondence, ProducerIndependence, ProducerBindingContinuity, separation, and AbsenceSourceControl coordinate; binding continuity additionally has exactly one BindingConclusionCausality and exact-close M/U share one structural qualified-time coordinate with self-age `[0,0]`; shared equal time positions share their one structural coordinate rather than duplicating occurrences, and unequal domains generate no derived numeric age interval;
- every true-or-false trigger instance in Section 22.4;
- SemanticReasonSet, ProfileEvaluationState, CoverageState, SubstantiveCurrentUseDisposition, and SubstantiveGateDecision;
- the candidate and all four explicit Boolean provenance-check results; and
- ProvenanceValidationReasonSet and ProvenanceIntegrityState.

The present-record multimap retains raw occurrence multiplicity. It must contain exactly one structurally resolved value for every coordinate in RequiredRecordSet and no conflicting alternative. A canonical tagged absent/unavailable/indeterminate candidate-family or placeholder is a resolved semantic value and causes the applicable substantive failure, not 036. Zero record occurrences, two or more record occurrences even when equal, an unparsed/unresolved record envelope, or conflicting record values emits reason 036. RequiredDerivationInventory excludes its own record value, ResultCompletenessGate, ResultCompletenessState, reason 036, ApplicableReasonSet, PrimaryReason, final CurrentUseDisposition, final IsolationGateDecision, and the final output wrapper, so no recursion exists.

It emits:

| Rank | ReasonClass | Trigger |
|---|---|---|
| 036 | result-derivation-incomplete | a required record coordinate has zero record occurrences, record multiplicity other than one, an unparsed/unresolved record envelope, or conflicting record values; a canonical substantive absent/unavailable/indeterminate placeholder does not itself trigger 036 |

Every 036 tuple has connection-scope(exact ConnectionEvaluationKey) and absent FactFamily. ResultCompletenessState is complete exactly when 036 is absent.

The protected internal EvaluationProvenanceCandidate is the sole candidate validated for authority. A context-visible redaction is a separate non-authoritative view: it may omit protected internals but cannot change candidate generation, dependency validation, reasons, completeness, or decision. Two implementations consuming structurally equal complete semantic inputs must therefore generate structurally equal DerivationPopulation, RequiredNodeCoordinateSet, node values, dependency sets, edge sets, candidate, and RequiredDerivationInventory.

## 23. Final reason, state, and result

SemanticReasonSet is the exact mathematical set of all SemanticReason values whose Section 20 triggers are true. ProvenanceValidationReasonSet is the exact mathematical set of all true 032-035 results. ResultCompletenessReasonSet is empty or the singleton reason 036.

PermissionCoverageEvaluation is:

~~~
PermissionCoverageEvaluation = (
  exact PermissionEvaluationCoordinate,
  tagged permission-key resolution absent | unique(exact PermissionEvaluationKey) | ambiguous,
  exact five CombinedClosure values,
  exact RelevantProducerSet and matching producer-lifecycle-scoped ProducerIntrinsicContinuity projections,
  exact ProducerSourceSurfaceBinding,
  exact candidate-independent BindingBaselineUniverse and BindingLifecycleUniverse projections,
  exact BindingBootstrapSourceCoordinate, BindingBootstrapSourceEligibility,
    and BindingBootstrapSourceCandidatePopulation projections,
  exact BindingBaselineOwnerSlot/direct-input, BindingBaselineObservationPopulation,
    and ProducerSourceSurfaceBindingBaseline projections,
  exact BindingLifecycleOwnerSlot/direct-input projections,
  exact BindingLifecycleObservationPopulation,
  exact ProducerBindingContinuityMeasuredConclusion/BindingConclusionCausality/currentness projections,
  exact ProducerBindingEventCoverage and ProducerSourceSurfaceBindingCurrentness projections,
  exact ProducerCouplingBaseGraph and ProducerControlCouplingPopulation,
  exact ProducerThreatControlDomain,
  exact AbsenceSourceThreatControlDomain projection,
  exact AbsenceSourceControlMeasuredConclusion/currentness/AbsenceSourceAdmissibility projections,
  exact ProducerInfluenceThreatSet/TechnicalInfluenceEvidencePopulation projections,
  exact ProducerIndependenceMeasuredConclusion/currentness and PropositionDirectSourceCoverage projections,
  exact permission-scoped FactEvaluation set for F01-F03 and F05-F16,
  exact aggregate connection F04 FactEvaluation,
  exact H02SideCurrentnessAssertion,
  exact H02PermissionCurrentnessAssertion occurrence family at this coordinate,
  exact Stage-A governance HistoricalCurrentnessQualification projection,
  exact H07CurrentnessComparison,
  exact IsolationAttestationAuthorityIdentity runtime-correspondence-currentness assertion occurrence family,
  exact every Stage-B QualifiedPhysicalTimeDomain/QualifiedPhysicalTimeInput,
    QualifiedPhysicalTimeDomainComparison, and MeasuredConclusionUseFreshness projection at this coordinate,
  exact Stage-B IAA-conclusion HistoricalCurrentnessQualification projection,
  tagged IAA separation-currentness absent | present(exact applicable assertion),
  exact PermissionEventCoverageSet,
  exact FreshnessCalculation,
  exact tagged ReuseProvenance not-attempted | attempted(exact value),
  exact SameSideTargetOverlapGraph projection and component membership,
  exact applicable SharedGovernanceRelationSet projection,
  coverage verdict
)

coverage verdict =
  complete-unique
  | complete-shared-permitted
  | partial
  | unknown
  | contradictory
~~~

It is structural and has no identity. Complete requires unique key resolution; five complete closures; frozen RelevantProducerSet; matching global intrinsic results; every exact-complete binding; one exact-complete candidate-independent baseline universe and lifecycle universe per binding; one universe-derived slot for every member; every concrete source candidate/placeholder and raw occurrence retained; every source population complete-enumerated without selection/substitution; every baseline direct input/composition complete-projected; an exact-coherent baseline; every post-B source/slot/input complete; an exact-complete-no-change lifecycle population; and exactly one bounded positive IAA binding-unchanged-through-cut conclusion over that exact universe/baseline/population with M=U, self-age `[0,0]`, equal-current status, and authoritative-current history. Binding coverage must be continuous-complete and binding currentness literal current. It also requires the retained coupling/threat/source-control/independence/proposition/qualified-time/F/currentness/event/freshness/reuse/governance conditions from Revision 12. It does not depend on reasons, component state, provenance validation, completeness, or a final decision.

SideEvaluation is:

~~~
SideEvaluation = (
  exact SideEvaluationKey,
  exact ApplicablePermissionSet,
  exact PermissionEvaluationCoordinate set,
  exact PermissionEvaluationKey candidate occurrence family,
  exact PermissionCoverageEvaluation candidate occurrence family,
  exact one-to-one ApplicablePermissionMember-to-coordinate-to-key-to-evaluation relation,
  exact H02CurrentnessSet,
  exact side projection of IAAMeasuredCurrentnessSet,
  exact SameSideTargetOverlapGraph,
  exact SharedGovernanceRelationSet,
  side completeness verdict
)
~~~

The correspondence is exact only when every ApplicablePermissionMember has exactly one coordinate, one unique PermissionEvaluationKey, and one PermissionCoverageEvaluation occurrence, and no candidate has an extra/unkeyable coordinate. Missing, equal duplicate, unequal duplicate, injected, or ambiguous candidates fail without normalization or set deduplication. Thus one side can contain any exact finite nonempty ApplicablePermissionSet, multiple IAAs/registration revisions/correspondences/targets, and multiple disjoint governance groups while retaining one side-level key.

~~~
ApplicableReasonSet =
  SemanticReasonSet
  union ProvenanceValidationReasonSet
  union ResultCompletenessReasonSet
~~~

These are mathematical set unions. PrimaryReason is none for the empty set and otherwise the numerically lowest rank present. Scope and F family do not affect precedence.

CurrentUseDisposition starts with Section 21's substantive precedence and, immediately before current, inserts:

~~~
non-authorizing-provenance-invalid   any reason 032-035
non-authorizing-result-incomplete    reason 036
~~~

IsolationGateDecision is exactly pass only when:

- ApplicableReasonSet is empty;
- ProfileEvaluationState is satisfied;
- CoverageState is complete-unique or complete-shared-permitted;
- CurrentUseDisposition is current;
- ProvenanceIntegrityState is valid; and
- ResultCompletenessState is complete.

Otherwise it is exactly non-authorizing.

ConnectionIsolationEvaluation is the structural output:

~~~
ConnectionIsolationEvaluation = (
  exact ConnectionEvaluationKey,
  exact host-side and agent-side H02ApplicabilityPopulation,
  exact host-side and agent-side H02CurrentnessSet,
  exact H07CurrentnessComparison,
  exact IAAMeasuredCurrentnessSet,
  exact host-side SideEvaluation,
  exact agent-side SideEvaluation,
  tagged protected detector disposition set absent | present(exact ProtectedDetectorEvidenceDisposition set),
  tagged IAA context-local separation set absent | present(exact IAAContextLocalSeparationConclusion set),
  exact F04PairEvaluation set,
  tagged MediatedChannelPair absent | present(exact value),
  exact host-side and agent-side SameSideTargetOverlapGraph values,
  exact host-side and agent-side SharedGovernanceRelationSet values,
  exact tagged ReuseProvenance evaluation set,
  exact CombinedClosure set,
  exact RelationEdge set,
  exact ObservationOccurrence set,
  exact RelevantProducerSet set,
  exact ProducerIntrinsicContinuity set,
  exact ProducerSourceSurfaceBinding set,
  exact BindingBaselineUniverse and BindingLifecycleUniverse sets,
  exact BindingBootstrapSourceCoordinate and BindingBootstrapSourceEligibility sets,
  exact BindingBootstrapSourceCandidatePopulation set,
  exact BindingBaselineOwnerSlot and BindingBaselineDirectAttribution sets,
  exact BindingBaselineOwnerObservation and BindingBaselineObservationPopulation sets,
  exact ProducerSourceSurfaceBindingBaseline set,
  exact BindingLifecycleOwnerSlot and BindingLifecycleDirectAttribution sets,
  exact BindingLifecycleCoverageStatement and BindingLifecycleObservation sets,
  exact BindingLifecycleObservationPopulation set,
  exact ProducerBindingContinuityMeasuredConclusion set,
  exact BindingConclusionCausality set,
  exact ProducerBindingEventCoverage set,
  exact ProducerSourceSurfaceBindingCurrentness set,
  exact DirectCellResult and DerivedInfluencePathResult sets,
  exact ProducerCouplingBaseGraph and ProducerControlCouplingPopulation sets,
  exact ProducerThreatControlDomain set,
  exact AbsenceSourceThreatControlDomain set,
  exact AbsenceSourceControlMeasuredConclusion set,
  exact AbsenceSourceAdmissibility set,
  exact ProducerInfluenceThreatSet set,
  exact TechnicalInfluenceEvidencePopulation set,
  exact ProducerIndependenceMeasuredConclusion set,
  exact QualifiedPhysicalTimeDomain and QualifiedPhysicalTimeInput sets,
  exact QualifiedPhysicalTimeDomainComparison set,
  exact MeasuredConclusionUseFreshness set,
  exact HistoricalCurrentnessQualification set,
  exact PropositionDirectSourceCoverage set,
  exact PermissionEventCoverageSet set,
  exact EventRequirementSourcePopulation set,
  exact EventCoverageAssertion set,
  exact ConnectionEventCoverageUnion,
  exact permission-scoped FactEvaluation set,
  exact aggregate F04 FactEvaluation,
  SemanticReasonSet,
  ProfileEvaluationState,
  CoverageState,
  SubstantiveCurrentUseDisposition,
  SubstantiveGateDecision,
  EvaluationProvenanceCandidate,
  ProvenanceValidationReasonSet,
  ProvenanceIntegrityState,
  ResultCompletenessGate,
  ResultCompletenessState,
  ApplicableReasonSet,
  PrimaryReason,
  CurrentUseDisposition,
  IsolationGateDecision
)
~~~

For equal contexts, both separation tags are absent and the detector/source/conclusion populations are empty. For unequal contexts, both tags are present and are exact one-to-one projections of LocalIAAKeys(C). F04PairEvaluation is exact one-to-one with F04Pairs(C). ConnectionEventCoverageUnion is the exact owner-preserving projection of every permission-local set and never an authority input. Every top-level Stage-A applicability, closure, fact, currentness, Producer/global-intrinsic-continuity/surface, candidate-independent baseline/lifecycle universe, concrete bootstrap-source/eligibility/population, baseline direct-input/composition/population/verdict, post-B direct-input/population, positive IAA binding conclusion/causality/coverage/currentness, coupling/threat/source-control, qualified-time/freshness, graph, governance, reuse, ordinary event, measured conclusion, proposition-coverage, and separation set is the exact mathematical projection of the underlying populations with nothing omitted or injected.

The output has structural equality only, no allocated identity/lifecycle/permission/authority, and is usable only for its exact Connection and AuthorityUseCut. A context-visible projection MUST remove or safely collapse fields prohibited by Section 18 without changing the protected evaluation's candidate, decision, reason, or completeness semantics.

## 24. Mandatory dependency order and total algorithm

The normative dependency order is:

1. load the complete typed H-02/H-07 scope, selected profile, bounded H-02 content candidate families, exact Organization/Workspace content attributions, and every required governance HistoricalCurrentnessQualification; compute structural scope eligibility, require authoritative-current qualification, and freeze both Stage-A H02ApplicabilityPopulation values and source-specific applicability results without any H-13 measurement input;
2. derive both ApplicablePermissionSet values from every and only Stage-A result=applicable already backed by real-owner attribution and authoritative-current qualification; construct every and only corresponding PermissionEvaluationCoordinate; seed, expand, and freeze the Stage-B H13EvaluationPopulation; then inventory both populations and their exact stage dependency before Stage-B substantive verdicts;
3. validate the closed R8-20A workspace-absent and R8-20 workspace-present H-02 branches, ExactTenantContext/ParticipantSide/source-specific projections, real content owners, and qualifications; evaluate H02SideCurrentnessAssertion, H02PermissionCurrentnessAssertion, H02CurrentnessSet, and H07CurrentnessComparison; rejected Stage-A candidates remain audit/provenance inputs and receive no authorization facts;
4. type-check every raw K01-K49 candidate/placeholder; construct exact producer-lifecycle direct-owner evidence; generate one ProducerLifecycleEvaluationCoordinate per distinct ProducerIdentity/cut; derive one Q-independent ProducerIntrinsicContinuity and ProducerIncarnation transition there; then construct closed controller-role facts, MembershipEpoch, MeasurementTargetRoot, MeasurementTarget, DirectSemanticPropositionCoordinate population, and every direct membership/edge/source-surface DirectCellResult; derive no negative composite owner, include no ObservationScope in the global lifecycle node, and permit no Q-local binding/coupling/event/threat/source-control result to feed intrinsic continuity or incarnation;
5. from frozen Stage B derive RelevantProducerSet(Q) and one P-to-O09/O10 binding candidate per member. Independently generate BindingBaselineUniverse from all bounded direct-source members before reading candidate membership; generate one slot per universe member, every matching concrete bootstrap source/eligibility/raw occurrence/unavailable placeholder, and one complete source population per slot. Then let the candidate supply only expected projections, compose every retained per-source actual projection, derive the baseline population, compare complete expected versus actual projections, and derive the baseline. Independently generate BindingLifecycleUniverse from the baseline universe plus all bounded post-B members, then every lifecycle slot/source population/direct input and complete population. Obtain one bounded positive IAA conclusion over the exact universe, baseline, and post-B population with M=U; derive causality before self-age freshness/currentness and apply separate H-11 history plus the exhaustive binding mapping. Only afterward construct ordinary SourceAttribution/EventOccurrence/direct facts, derived paths, all-pairs coupling, and threat domains. No candidate omission/filter, source preference, P-specific outcome, or Q-scoped relational result selects a universe/source or allocates an incarnation;
6. for every required permission closure or measured conclusion, derive QualifiedPhysicalTimeDomainComparison before any interval subtraction; derive an age interval only for exact-equal domains; for binding continuity require semantic M=U and the one-input self-age `[0,0]`, while retaining the general half-open 60-second rule unchanged for every other conclusion family; for every AbsenceSourceControlCoordinate first derive AbsenceSourceThreatControlDomain(Q,S) while excluding every S-sourced negative fact, then derive the nonrecursive base graph, obtain the exact IAA-authored AbsenceSourceControlMeasuredConclusion, apply the fixed 60-second MeasuredConclusionUseFreshness only after exact-equal domain comparison, require its separate H-11-realized HistoricalCurrentnessQualification/currentness assertion, and only then derive AbsenceSourceAdmissibility; construct every P-specific ProducerInfluenceBaseGraph, ProducerInfluenceThreatSet, and TechnicalInfluenceEvidencePopulation from the separately derived general domain/coupling populations and admissible primitives; then obtain the exact IAA-authored ProducerIndependenceMeasuredConclusion, apply the same comparison/freshness rule, require separate authoritative-current history, and construct PropositionDirectSourceCoverage and DirectProducerFactEligibility;
7. construct occurrences, ProducerClosureAssertions, the five local CombinedClosure values, every RC01-RC11 result, the complete RuntimeCorrespondenceMeasuredConclusion/RuntimeCorrespondence, unique PermissionEvaluationKey resolution, paths, and environments; apply the same exact-domain-comparison and fixed 60-second RuntimeCorrespondence conclusion freshness and require separate H-11-realized authoritative-current history;
8. construct ClosureCutEvidenceSet and fix each ClosureStateCut without any event dependency; only then construct every PermissionEventRequirementSlot with EventSourceCompositionPolicy fixed to independently-complete-source, complete EventRequirementSourcePopulation, per-candidate EventCoverageAssertion, PermissionEventCoverageSet, the derived ConnectionEventCoverageUnion, and the distinct permission-closure FreshnessCalculation after exact QualifiedPhysicalTimeDomainComparison; reject every other policy or cross-domain conversion token as unknown/malformed;
9. for unequal contexts only, obtain destination protected source assertions, derive one detector evidence disposition per LocalIAASeparationKey, obtain independently IAA-attributed conclusions, apply the same exact-domain-comparison and fixed 60-second measured-conclusion freshness, require separate authoritative-current HistoricalCurrentnessQualification, and evaluate separation currentness;
10. construct current same-context equivalences from complete local targets and IAA RuntimeCorrespondence inputs; construct every exact F04PairEvaluation and aggregate F04; evaluate reuse, MediatedChannelPair, every MeasurementTargetCorrespondence, both complete SameSideTargetOverlapGraph values, their deterministic connected components, and SharedGovernanceRelationSet values from base inputs;
11. evaluate permission F01-F03/F05-F16, with F12/F15 consuming step 8, F13 consuming applicable step 9 inputs, and F16 consuming only the input classes its closed row permits;
12. construct every PermissionCoverageEvaluation and both SideEvaluation values with exact occurrence cardinality and bijection checks;
13. evaluate every semantic trigger without early exit and construct SemanticReasonSet;
14. derive ProfileEvaluationState, CoverageState, SubstantiveCurrentUseDisposition, and SubstantiveGateDecision;
15. construct the structural provenance candidate over substantive steps 1-13 from the canonical coordinates/dependencies and run all four validation checks independently;
16. evaluate ResultCompletenessGate against the precomputed inventory; and
17. union final reasons, select PrimaryReason, and derive final CurrentUseDisposition and IsolationGateDecision.

No semantic dependency may point from a later step to an earlier one. Stage A precedes and solely selects Stage B. Raw enrollment/lifecycle and frozen source-enumeration occurrences precede Q-independent ProducerIntrinsicContinuity and concrete bootstrap-source coordinates. Frozen bounded subject/object/resource/channel/K/owner/source populations precede candidate-independent baseline/lifecycle universes; candidate content and all verdicts are forbidden inputs to universe generation. Universes precede slots; slots plus frozen occurrence/lifecycle inputs precede concrete source eligibility and source populations; source populations plus direct content precede per-domain composition; the candidate supplies expected projections only after slot generation. Baseline composition/equality precedes the exact baseline; lifecycle source populations/direct evidence precede the post-B population. Universe, baseline, and post-B population precede the positive bounded IAA conclusion; conclusion and M/U inputs precede causality; exact-close causality precedes self-age freshness/currentness; those inputs precede coverage and binding currentness; only literal currentness precedes ordinary SourceAttribution/EventOccurrence, coupling, threat, source control, independence, F, and result. No arrow returns upward. Ordinary ProducerIndependence is never a bootstrap prerequisite. Direct cells precede derived paths. Coupling and threat domains remain sibling derivations and feed no identity/incarnation/intrinsic/source-universe allocation. General time comparisons gate `general-age`; binding uses only M=U/self-age. ClosureCutEvidenceSet remains event-independent; ordinary event eligibility never feeds bootstrap. Later detector/F/reason/provenance/result nodes retain their Revision 12 order and cannot change any upstream population.

For every AuthorityUseCut, the evaluator enumerates both ParticipantSide values, every non-deduplicated ApplicablePermissionMember, every exact per-permission coordinate, every local IAA group, every required cross-side pair, and every closed source/fact/trigger/check population. It authorizes only on literal pass. Timeout, unavailable source, unknown value, empty-unproved set, privacy-conflicting need for information, or evaluator exception produces non-authorizing or no consumable result. There is no default-pass branch.

## 25. Normative clean-room and hostile cases

Unless stated otherwise, all unmentioned required facts are complete, current, fresh, coherent, source-attributed, provenance-valid, result-complete, and same-cut. P is ProfileEvaluationState, C is CoverageState, U is CurrentUseDisposition, I is ProvenanceIntegrityState, Q is ResultCompletenessState, and D is IsolationGateDecision.

Case notation is structural: C0 is connection-scope(the case's ConnectionEvaluationKey); Sh/Sa are its host/agent side-scope values; Ah1/Ah2 are h02-applicability-scope(exact named host H02ApplicabilityCandidateCoordinate) values; Qh1/Qh2/Qa1 are named permission-scope values; Lh1/Lh2/La1 are named local-iaa-scope values; X11 is f04-pair-scope(F04PairKey(Qh1,Qa1)) and X21 is f04-pair-scope(F04PairKey(Qh2,Qa1)); Gabc is governance-component-scope(Sh,{A,B,C}). In legacy rows, host-side or agent-side is shorthand for the unique canonical scope determined by the rank's Section 22.4 trigger at the named side; connection means C0. This shorthand never collapses two applicability candidates, permissions, local IAAs, pairs, or governance components.

### 25.1 Every prior Revision 3 repair case, retained

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| C01 exclusive, both sides | distinct targets/boundaries/environments; exact residents; no K46; valid gates and exact IAA-authored outside-control Producer conclusions with fresh/authoritative-current status; if contexts differ, both destination IAAs issue equally qualified adequate conclusions from complete local detector dispositions | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| C02 partitioned, both sides | external residents; all forbidden paths absent; exact safe K46; sides separated; if contexts differ, both destination IAAs issue adequate conclusions from complete local detector dispositions, each H-13-fresh and H-11-qualified authoritative-current | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| C03 shared governance | the complete same-side overlap graph has one non-singleton component containing every distinct PermissionEvaluationKey that shares a target; its exact one relation holds for every unordered pair; no permission is deduplicated; cross-side pairs are separated by current authoritative conclusions | empty | P=satisfied; C=complete-shared-permitted; U=current; I=valid; Q=complete; D=pass |
| C04 K04 runtime role | S02 has K04 plus runtime-lifecycle-enforcer, at least one K08-K16, and no outside-union power | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| C05 K04 boundary role | S02 has K04 plus boundary-state-enforcer and K17/K18 only | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| C06 K04 resource role | S02 has K04 plus resource-state-enforcer and K19/K31/K35 only | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| C07 K04 protocol role | S02 has K04 plus protocol-message-gate and K47/K48 only | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| C08 K04 multi-role | each of 11 nonempty multi-role subsets has one defining edge per role and no edge outside its exact union | empty for every subset | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| H01 observation-only escalation | S03 has K08 to a target; evaluator retains S03 and does not promote it | {(008,host-side),(019,host-side,F05)} | P=contradictory; C=contradictory-coverage; U=current; I=valid; Q=complete; D=non-authorizing |
| H02 observation-only K04 | S03 sources K04, a known type-forbidden source | {(014,host-side),(016,host-side),(019,host-side,F02)} | P=incomplete; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |
| H03 direct remote target | S07 has directed network path to target around the gate | {(019,host-side,F08)} | P=unsatisfied; C=complete-unique; U=current; I=valid; Q=complete; D=non-authorizing |
| C09 remote reaches gate only | S07 reaches only the exact closed gate; all nine channel rules and path domination hold | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| H04 unknown external actor | received source class S99 is retained, not coerced to S08 | {(016,host-side),(019,host-side,F16),(031,host-side)} | P=incomplete; C=partial; U=non-authorizing-unknown-h13-semantics; I=valid; Q=complete; D=non-authorizing |
| H05 invalid known type | K02 is sourced by S07 or directed to O06 | {(016,host-side),(019,host-side,F16)} | P=incomplete; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |
| C10 multi-producer closure | boundary/environment resources retain owner assertions; correlator forms mathematical union | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| H06 missing resource owner | environment-owned object has only boundary-state assertion | {(011,host-side),(016,host-side),(019,host-side,F03),(019,host-side,F14),(019,host-side,F16)} | P=incomplete; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |
| C11 K01 source authority | runtime-lifecycle supplies K01; boundary/environment only corroborate | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| H07 K01 substitution | runtime-lifecycle K01 absent; boundary/environment claims membership | {(011,host-side),(013,host-side),(019,host-side,F03),(019,host-side,F14),(019,host-side,F16)} | P=incomplete; C=unknown-membership; U=current; I=valid; Q=complete; D=non-authorizing |
| H08 H-02 permission changes | current IsolationBoundaryPermissionRevisionIdentity for expected Qh1 is absent/replaced and the complete current host ApplicablePermissionSet differs | {(029,Qh1),(029,Sh)} | P=satisfied; C=complete-unique; U=non-authorizing-upstream-currentness; I=valid; Q=complete; D=non-authorizing |
| H09 RuntimeCorrespondence changes | current structural RuntimeCorrespondence differs from expected at Qh1 | {(029,Qh1)} | P=satisfied; C=complete-unique; U=non-authorizing-upstream-currentness; I=valid; Q=complete; D=non-authorizing |
| H10 IAA registration revision superseded | the same OrganizationIAARegistrationSubjectIdentity now has a different authoritative-current OrganizationIAARegistrationRevisionIdentity positive ceiling while Producer event coverage is unchanged | {(029,Qh1)} | P=satisfied; C=complete-unique; U=non-authorizing-upstream-currentness; I=valid; Q=complete; D=non-authorizing |
| C12 F12/F15 ordered | each PermissionEventCoverageSet is dependency-linked before that permission's F12 and F15; the derived Connection union is not a dependency | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| H11 F12/F15 missing coverage dependency | F12 or F15 omits required EventCoverage dependency | {(033,connection)} | P=satisfied; C=complete-unique; U=non-authorizing-provenance-invalid; I=missing-dependency; Q=complete; D=non-authorizing |
| C13 F16/completeness acyclic | F16 consumes semantic inputs only; completeness excludes itself/final fields | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| H12 forbidden F16/reason cycle | reason-to-F16 and F16-to-reason dependencies are added | {(032,connection),(035,connection)} | P=satisfied; C=complete-unique; U=non-authorizing-provenance-invalid; I=cycle; Q=complete; D=non-authorizing |
| H13 provenance cycle | otherwise valid graph contains A-to-B-to-A | {(032,connection)} | P=satisfied; C=complete-unique; U=non-authorizing-provenance-invalid; I=cycle; Q=complete; D=non-authorizing |
| H14 omitted provenance dependency | known derived node omits a required dependency coordinate | {(033,connection)} | P=satisfied; C=complete-unique; U=non-authorizing-provenance-invalid; I=missing-dependency; Q=complete; D=non-authorizing |
| H15 unknown provenance node | present well-enveloped type is future-semantic-x | {(034,connection)} | P=satisfied; C=complete-unique; U=non-authorizing-provenance-invalid; I=unknown-node; Q=complete; D=non-authorizing |
| H16 contradictory duplicate node | one NodeSemanticCoordinate has two unequal semantic values | {(035,connection)} | P=satisfied; C=complete-unique; U=non-authorizing-provenance-invalid; I=malformed; Q=complete; D=non-authorizing |
| H17 missing result inventory | valid graph but one required false-check record is absent after validation | {(036,connection)} | P=satisfied; C=complete-unique; U=non-authorizing-result-incomplete; I=valid; Q=incomplete; D=non-authorizing |
| H18 unexpected S08 path | mandatory catch-all reaches a relevant gate-bypass surface | {(019,host-side,F08)} | P=unsatisfied; C=complete-unique; U=current; I=valid; Q=complete; D=non-authorizing |
| H19 Shared Governance dedup | Qh1 and Qh2 are expected but Qh2 is collapsed into Qh1 and the attempted governance group is therefore incomplete | {(020,Qh2),(020,Sh),(023,Sh)} | P=satisfied; C=unexpected-duplicate; U=current; I=valid; Q=complete; D=non-authorizing |
| H20 exactly 60 seconds | Qh1's age equals 60 seconds | {(027,Qh1)} | P=satisfied; C=complete-unique; U=non-authorizing-stale; I=valid; Q=complete; D=non-authorizing |
| H21 zero-event gap | no events are reported but one positive interval position is uncovered | {(025,host-side)} | P=satisfied; C=complete-unique; U=non-authorizing-invalidated; I=valid; Q=complete; D=non-authorizing |

### 25.2 Revision 4 repair cases

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| C14 Workspace absent | every host-side projection is Organization A plus workspace-absent; no Workspace value is supplied or demanded | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| C15 Workspace present | every agent-side projection is Organization B plus workspace-present(Workspace X) | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| H22 absent versus present | authoritative host-side context is Organization A/workspace-absent but one static projection says Organization A/workspace-present(Workspace X) | {(002,host-side)} | P=satisfied; C=complete-unique; U=non-authorizing-wrong-context-or-privacy; I=valid; Q=complete; D=non-authorizing |
| C16 exact H-02 sides | all host facts say host-side and all agent facts say agent-side; message direction separately says agent-to-host | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| H23 side alias rejected | a ParticipantSide field says initiator while routing says host-to-agent | {(004,host-side)} | P=wrong-subject; C=wrong-correspondence; U=current; I=valid; Q=complete; D=non-authorizing |
| C17 unequal-context separation | host Organization A/workspace-absent and agent Organization B/workspace-present(X); complete detector produces distinct local evidence-supports-adequate-separation dispositions; both exact IAAs independently author adequately-established-separation conclusions, each separately H-13-fresh and H-11-qualified authoritative-current | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| H24 detector unavailable | unequal contexts require comparison; both protected local evaluations are unavailable, no IAA can issue an eligible positive conclusion, and X11 is indeterminate | {(018,X11,F04),(030,Lh1),(030,La1)} | P=incomplete; C=complete-unique; U=non-authorizing-measurement-unavailable; I=valid; Q=complete; D=non-authorizing |
| H25 unsafe same runtime | complete protected evidence establishes one physical runtime; each affected IAA conclusion is unsafe-same-runtime without other-context detail | {(019,X11,F04),(022,X11)} | P=unsatisfied; C=unexpected-duplicate; U=current; I=valid; Q=complete; D=non-authorizing |
| C18 one physical producer, unequal contexts | each context has distinct ProducerNamespace/Identity/Incarnation/assertions/carriers; detector knowledge creates no visible link | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| C19 one producer, both sides | one exact IsolationAttestationAuthorityIdentity/ExactTenantContext/release ProducerIdentity emits disjoint host-side and agent-side occurrences/closures with no merged fact | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| C20 MediatedChannelPair equality | two pair values contain equal seven structural components from Section 16 and compare equal; no mediator identity exists | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| C21 Target set order independence | target runtime set {R1,R2} is presented once as R1,R2 and once as R2,R1; all semantic members equal | empty | values are equal; evaluation unchanged and passes |
| C22 MembershipEpoch structural equality | two epochs have equal cuts, five closure values, sets, relations, scopes, and attributions with different presentation order | empty | values are equal; evaluation unchanged and passes |
| C23 no H-10 realization assumption | SourceAttribution is attributed-authentic and all semantic values compare structurally; no digest, signature, canonicalization, canonical bytes, commitment, or cryptographic node identifier is supplied | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| C24 no H-11 representation assumption | every required HistoricalCurrentnessQualification is authoritative-current and E01-E17 semantic coverage is uniquely resolvable, while no predecessor-chain, GENESIS, current-head field, proof format, signature, digest, storage format, or anti-rollback mechanism is supplied | empty | semantic qualification is sufficient at H-13; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| H26 K45 mutable storage | external subject and target share exact storage resource; either can write content read by the other | {(019,host-side,F07),(019,host-side,F09),(019,host-side,F13)} | P=unsatisfied; C=complete-unique; U=current; I=valid; Q=complete; D=non-authorizing |
| C25 K46 capacity only | partitioned profile; subjects share exact finite service-capacity ResourceObject R; semantic partitions are disjoint; only aggregate throughput/delay varies; no K20-K45/K49 path exists | empty | P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| C26 K46 timing/load residual | ordinary anonymous aggregate load on exact shared ResourceObject R changes completion delay, but neither subject can identify/address/control the other or shared state | empty | accepted and acknowledged residual; under the accepted Revision 14 model, D=pass under partitioned/shared only when all other facts pass |
| H27 apparent K46 promoted | external subject can alter target quota/priority through the resource; owner reports K46 but complete facts establish cross-subject control | {(008,host-side),(019,host-side,F09),(019,host-side,F13)} | P=contradictory; C=contradictory-coverage; U=current; I=valid; Q=complete; D=non-authorizing; relation is K45, not capacity-only |
| C27 cross-IAA same-context reuse | source/destination Connections and IAAs differ; context/side/release/profile equal; fresh mutual same-physical relation and exact closure correspondence hold; no source permission independence/event wrapper, detector disposition, IAA separation conclusion, F04, reason, state, or result is reused; fresh destination proposition/event objects and a new full destination evaluation are produced | empty | reuse eligible; destination P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| H28 cross-context reuse | Qh1 attempts to reuse lower protocol evidence from an unequal ExactTenantContext | {(003,C0),(028,Qh1)} | P=satisfied; C=complete-unique; U=non-authorizing-wrong-context-or-privacy; I=valid; Q=complete; D=non-authorizing |
| H29 cross-side evidence merge | one unkeyable producer assertion combines Qh1 and Qa1 facts in one ObservationScope | {(004,Qh1),(004,Qa1),(008,C0),(016,Qh1),(016,Qa1)} | P=wrong-subject; C=wrong-correspondence; U=current; I=valid; Q=complete; D=non-authorizing |
| H30 detector disclosure | a local detector disposition or IAA conclusion includes other-tenant identity, a physical host identifier, timing detail, or a shared stable carrier | {(003,C0)} | P=satisfied; C=complete-unique; U=non-authorizing-wrong-context-or-privacy; I=valid; Q=complete; D=non-authorizing |

### 25.3 Revision 5 cardinality, authority, reuse, and grammar cases

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| N01 same IAA, different targets | host ApplicablePermissionSet has Qh1 and Qh2 under the same exact IsolationAttestationAuthorityIdentity and Organization registration Subject/Revision but distinct RuntimeCorrespondence and MeasurementTarget values; one Lh1 covers exactly both keys; agent has Qa1; X11 and X21 both pass | empty | one Sh, two host permission keys/evaluations, no governance relation; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| N02 two host IAAs | host has Qh1 under Lh1 and Qh2 under distinct Lh2; both local groups issue exact-IAA-authored adequate conclusions with independent H-13-fresh and H-11-qualified authoritative-current status; agent La1 is equally qualified; both required pairs pass | empty | one Sh, two distinct host local IAA groups, two host evaluations; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| N03 multi-IAA shared governance | Qh1 and Qh2 use two different IAAs and map to one entire same-side target; the deterministic overlap graph has one two-key component and its one pair correspondence and governance base inputs hold | empty | SharedGovernanceRelationSet has one two-key relation; P=satisfied; C=complete-shared-permitted; U=current; I=valid; Q=complete; D=pass |
| N04 side key unchanged | Qh1 and Qh2 share exactly the same Sh while their accepted permission identities, IAAs, registration revisions, correspondences, and targets differ | empty | Sh compares equal to itself and the two PermissionEvaluationKey values compare unequal; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| N05 missing H-02 permission currentness | expected Qh1 has zero H02PermissionCurrentnessAssertion occurrences; the side H02CurrentnessSet record remains present and reports missing | {(029,Qh1),(029,Sh)} | P=satisfied; C=complete-unique; U=non-authorizing-upstream-currentness; I=valid; Q=complete; D=non-authorizing |
| N06 duplicate H-02 permission currentness | expected Qh1 has two structurally equal H02PermissionCurrentnessAssertion occurrences; no set projection deduplicates them | {(029,Qh1),(029,Sh)} | P=satisfied; C=complete-unique; U=non-authorizing-upstream-currentness; I=valid; Q=complete; D=non-authorizing |
| N07 wrong static registration revision | the exact qualification identifies revision R as authoritative-current, but Qh1's RuntimeCorrespondence/PermissionEvaluationKey projection carries unequal OrganizationIAARegistrationRevisionIdentity R2 | {(005,Qh1),(008,Qh1),(019,Qh1,F01)} | P=wrong-subject; C=wrong-correspondence; U=current; I=valid; Q=complete; D=non-authorizing |
| N08 old/unknown registration input | every required accepted Subject/Revision identity is correct, and one extra obsolete unrecognized registration-lifecycle alias is supplied; it is classified unknown/malformed, retained, and never normalized | {(031,Qh1)} | P=incomplete; C=complete-unique; U=non-authorizing-unknown-h13-semantics; I=valid; Q=complete; D=non-authorizing |
| N09 detector adequate, IAA absent | both local detector dispositions support adequate separation, but Lh1 has no exact IAA-authored IAAContextLocalSeparationConclusion with separate H-13 freshness and H-11 authoritative-current qualification; Qa1's conclusion is fully qualified | {(018,X11,F04),(029,Lh1)} | P=indeterminate; C=complete-unique; U=non-authorizing-upstream-currentness; I=valid; Q=complete; D=non-authorizing |
| N10 both IAAs adequate | unequal contexts; Lh1 and La1 receive distinct complete evidence-supports-adequate-separation dispositions and independently issue current, coherent, destination-bound adequate conclusions | empty | X11 and aggregate F04 satisfied; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| N11 IAAs disagree | Lh1 issues an H-13-fresh, H-11-qualified authoritative-current adequate separation conclusion while La1 issues an equally qualified unsafe-same-runtime conclusion from its eligible local disposition | {(008,C0),(019,X11,F04),(022,X11)} | P=contradictory; C=contradictory-coverage; U=current; I=valid; Q=complete; D=non-authorizing |
| N12 source conclusion offered to destination | a source Connection's old Lh1 conclusion is offered as the destination host conclusion/reuse input; the destination agent conclusion is fresh, but no fresh destination host conclusion exists | {(001,C0),(018,X11,F04),(028,Qh1),(029,Lh1)} | P=indeterminate; C=complete-unique; U=non-authorizing-wrong-connection; I=valid; Q=complete; D=non-authorizing |
| N13 protected sensing reused correctly | internal raw sensing remains current and eligible; destination ProtectedDetectorSourceAssertions and dispositions are re-evaluated for its exact Connection/profile/cut; both destination IAAs issue fresh conclusions; destination pairs/F04 are fresh | empty | source disposition/conclusion coordinates are absent from destination dependencies; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| N14 unnecessary provenance dependency | one canonical node declares one existing canonical dependency not in its exact RequiredDependencies; every required node/record otherwise exists | {(035,C0)} | P=satisfied; C=complete-unique; U=non-authorizing-provenance-invalid; I=malformed; Q=complete; D=non-authorizing |
| N15 omitted mandatory dependency | one canonical node omits one exact RequiredDependencies member while every required node/record otherwise exists | {(033,C0)} | P=satisfied; C=complete-unique; U=non-authorizing-provenance-invalid; I=missing-dependency; Q=complete; D=non-authorizing |
| N16 wrong permission provenance scope | the required Qh1 F01 node/record is replaced by the same value/question at Qh2; the canonical Qh1 node and record are absent | {(033,C0),(035,C0),(036,C0)} | P=satisfied; C=complete-unique; U=non-authorizing-provenance-invalid; I=missing-dependency; Q=incomplete; D=non-authorizing |
| N17 alternate coordinate decomposition | one implementation uses canonical (f-predicate,permission-scope(Qh1),fact-family(F01)); another replaces it by moving Qh1 into QuestionKey; the alternate is not normalized | {(033,C0),(035,C0),(036,C0)} for the alternate candidate | canonical candidate is structurally unequal to alternate; alternate U=non-authorizing-provenance-invalid; I=missing-dependency; Q=incomplete; D=non-authorizing |
| N18 side scope for permission node | Qh1's required H02PermissionCurrentnessAssertion node/record is replaced by side-scope(Sh) with otherwise equal content | {(033,C0),(035,C0),(036,C0)} | U=non-authorizing-provenance-invalid; I=missing-dependency; Q=incomplete; D=non-authorizing |
| N19 missing PermissionCoverageEvaluation | Qh1's candidate family explicitly contains zero PermissionCoverageEvaluation occurrences while the canonical node/record remains | {(020,Qh1),(020,Sh)} | P=satisfied; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |
| N20 duplicate PermissionCoverageEvaluation | Qh1's candidate family contains two equal evaluation occurrences; multiplicity is retained | {(020,Qh1),(020,Sh)} | P=satisfied; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |
| N21 permission reason non-deduplication | Qh1 and Qh2 independently fail F07 with the same rank/family and no other defect | {(019,Qh1,F07),(019,Qh2,F07)} | two distinct reasons remain; P=unsatisfied; C=complete-unique; U=current; I=valid; Q=complete; D=non-authorizing |
| N22 injected currentness assertion | all expected permission-currentness occurrences are exact, plus one assertion at a coordinate outside Sh's ApplicablePermissionSet | {(029,Sh)} | P=satisfied; C=complete-unique; U=non-authorizing-upstream-currentness; I=valid; Q=complete; D=non-authorizing |

The qualifiers are exact for each construction. A defect independently present on both sides emits both side-qualified tuples. Genuinely additional defects add reasons and never replace a listed trigger.

### 25.4 Revision 6 consolidation cases

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| R01 host Qh1 event injected into Qh2 | under the catalogue-constant independently-complete-source policy, Qh2's local EventRequirementSourcePopulation contains a Qh1-scoped candidate assertion in place of its required equal-family candidate; Qh1 retains a same-candidate complete source | {(025,Qh2),(019,Qh2,F12),(019,Qh2,F15)} | Qh1 remains complete; Qh2 P=unsatisfied; C=complete-unique; U=non-authorizing-invalidated; I=valid; Q=complete; D=non-authorizing |
| R02 agent event injected into host Qh1 | under the catalogue-constant independently-complete-source policy, a Qa1-scoped assertion is offered at Qh1 and Qh1's required host slot has no same-candidate complete source | {(004,Qh1),(025,Qh1),(019,Qh1,F12),(019,Qh1,F15)} | P=wrong-subject; C=complete-unique; U=non-authorizing-invalidated; I=valid; Q=complete; D=non-authorizing |
| R03 one E family missing only for Qh2 | under the catalogue-constant independently-complete-source policy, the exact E14 boundary-state slot has zero EventRequirementSourcePopulation occurrences for Qh2; Qh1 and Qa1 each retain same-candidate complete coverage | {(025,Qh2),(019,Qh2,F12),(019,Qh2,F15)} | Qh1/Qa1 remain complete; Qh2 P=unsatisfied; C=complete-unique; U=non-authorizing-invalidated; I=valid; Q=complete; D=non-authorizing |
| R04 distinct valid permission cuts | under the catalogue-constant independently-complete-source policy, Qh1 and Qh2 have unequal valid ClosureStateCut values; each local assertion family has a same-candidate source covering its own half-open interval continuously and each freshness interval is wholly under 60 seconds | empty | distinct cuts and coverage sets are retained; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| R05 derived event union preserves owners | under the catalogue-constant independently-complete-source policy, Qh1, Qh2, and Qa1 each have same-candidate exact local coverage; ConnectionEventCoverageUnion contains their three owner-preserving projections and is absent from every F12/F15 dependency | empty | union cardinality and local ownership exact; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| R06 one independently covered proposition, nine influence-threat propositions | one relation proposition has a qualified IAA outside-control conclusion; nine other required relation propositions have only qualified inside-control conclusions | {(012,Qh1),(016,Qh1),(019,Qh1,F03),(019,Qh1,F14)} | nine coverage objects are influence-threat-only; P=unsatisfied; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |
| R07 two sources for one proposition | the exact proposition has two class/domain-owning sources, one with a qualified IAA outside-control conclusion and one with a qualified IAA inside-control conclusion; both remain visible without conflict | empty | PropositionDirectSourceCoverage is independently-covered by the outside-control subset; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| R08 enumeration-only source cannot cure | a composite/enumeration contributor lists a required relation, while its only direct factual owner has a qualified IAA inside-control conclusion | {(012,Qh1),(016,Qh1),(019,Qh1,F03),(019,Qh1,F14)} | comparison/enumeration source is excluded from the outside-control direct subset; P=unsatisfied; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |
| R09 every proposition independently covered | each DirectSemanticPropositionCoordinate in all five mandatory extents has at least one class/domain-owning source with an exact IAA-authored outside-control conclusion whose H-13 freshness and H-11 authoritative-current qualification independently pass; additional inside-control contributors remain attributed | empty | every PropositionDirectSourceCoverage is independently-covered; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| R10 complete RC01-RC11 | Qh1 has exactly one satisfied result for every RC01-RC11 proposition, exact evidence/independence dependencies, empty contradiction set, coherent state position, IAA content attribution, H-13 freshness, and authoritative-current qualification | empty | RuntimeCorrespondenceMeasuredConclusion=complete-satisfied; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| R11 missing RC08 | Qh1's result family has zero RC08 occurrences while all other branches are satisfied and the canonical unavailable placeholder remains | {(017,Qh1,F16),(020,Qh1),(021,Qh1)} | correspondence non-authorizing; P=incomplete; C=unknown-membership; U=current; I=valid; Q=complete; D=non-authorizing |
| R12 duplicate RC06 | Qh1 has two structurally equal RC06 result occurrences; raw multiplicity is retained | {(017,Qh1,F16),(020,Qh1),(021,Qh1)} | proposition cardinality=duplicate; P=incomplete; C=unknown-membership; U=current; I=valid; Q=complete; D=non-authorizing |
| R13 IAA adds permission-authorized proposition | all RC01-RC11 results are exact, plus an unknown injected IAA proposition claiming H-02 permission/Workspace authority | {(017,Qh1,F16),(020,Qh1),(021,Qh1),(031,Qh1)} | proposition cardinality=injected; extra proposition is retained and never grants authority; P=incomplete; C=unknown-membership; U=non-authorizing-unknown-h13-semantics; I=valid; Q=complete; D=non-authorizing |
| R14 stale runtime conclusion | the complete expected RuntimeCorrespondence differs from the presented IAA-authored value in measured semantic state position and target membership, and H-13 freshness is stale | {(029,Qh1)} | P=satisfied; C=complete-unique; U=non-authorizing-upstream-currentness; I=valid; Q=complete; D=non-authorizing |
| R15 nontransitive indeterminate triangle | A-B and B-C are whole-target correspondences; A-C is target-overlap-indeterminate | {(022,Gabc),(023,Gabc)} | graph has one indivisible three-key component; its relation fails and is not split; P=satisfied; C=unexpected-duplicate; U=current; I=valid; Q=complete; D=non-authorizing |
| R16 overlap chain with disjoint endpoints | A partially overlaps B, B partially overlaps C, and A-C is target-disjoint | {(022,Gabc),(023,Gabc)} | graph reachability still yields one three-key component; the complete pair condition fails and no two-key clique is selected; P=satisfied; C=unexpected-duplicate; U=current; I=valid; Q=complete; D=non-authorizing |
| R17 complete three-key sharing | A-B, B-C, and A-C are each exact permitted whole-target correspondences and all governance/currentness/base conditions hold | empty | one three-key component and exactly one holding relation; P=satisfied; C=complete-shared-permitted; U=current; I=valid; Q=complete; D=pass |
| R18 capacity relation without overlap | Qh1 and Qh2 share exact finite service-capacity ResourceObject R under valid K46 while complete runtime/effective-boundary evidence establishes target-disjoint | empty | pair state=target-disjoint; two singleton components, no governance relation; shared R remains in the resource closures; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| R19 Workspace-present no-stricter-overlay | exact WorkspaceStateApplicabilityInput outcome is no-stricter-overlay, WorkspaceOverlayApplicabilityInput is absent, and selected side/profile/release/current use satisfies only the fields actually owned by the Organization registration and boundary permission inputs | empty | branch exact and applicable; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| R20 Workspace-present positive overlay | exact current state selects positive-overlay(X); exact current overlay Subject/Revision X and every narrowing intersection admit Qh1 | empty | branch exact and applicable; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| R21 Workspace-present denied | expected Qh1 was applicable, but the current exact Workspace state outcome is denied | {(005,Qh1),(019,Qh1,F01),(029,Qh1),(029,Sh)} | P=wrong-subject; C=wrong-correspondence; U=non-authorizing-upstream-currentness; I=valid; Q=complete; D=non-authorizing |
| R22 overlay profile narrowing | Stage-A positive overlay excludes the selected otherwise-supported profile for Ah1; a raw H-13 candidate nevertheless attempts authorization | {(005,Ah1)} | Ah1 remains Stage-A audit-only; no Qh1/PCE/F population is created; P=wrong-subject; C=wrong-correspondence; U=current; I=valid; Q=complete; D=non-authorizing |
| R23 overlay ParticipantSide narrowing | Stage-A positive overlay permits agent-side only for host candidate Ah1; a raw H-13 candidate nevertheless attempts authorization | {(004,Ah1),(005,Ah1)} | Ah1 remains Stage-A audit-only; no Qh1/PCE/F population is created; P=wrong-subject; C=wrong-correspondence; U=current; I=valid; Q=complete; D=non-authorizing |
| R24 overlay removes Qh2 only | current authoritative candidate map marks Qh1 applicable and Qh2 outside the overlay's permission narrowing before expected evaluation population generation | empty | ApplicablePermissionSet contains Qh1 only; no Qh2 coordinate/PCE/currentness/F node is generated; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| R25 stale or wrong overlay revision | expected positive-overlay revision X is scope-eligible, but the exact qualification identifies it as superseded or the presented Workspace-authored content is structurally unequal revision X2 | {(005,Qh1),(008,Qh1),(029,Qh1),(029,Sh),(019,Qh1,F01)} | P=wrong-subject; C=wrong-correspondence; U=non-authorizing-upstream-currentness; I=valid; Q=complete; D=non-authorizing |
| R26 Workspace-absent with Workspace object | workspace-absent candidate Ah1 carries a WorkspaceIAAStateRevisionIdentity while every other required field is present | {(002,Sh),(005,Ah1),(008,Ah1)} | wrong-scope object is retained in Stage A; no Q exists for Ah1; P=wrong-subject; C=wrong-correspondence; U=non-authorizing-wrong-context-or-privacy; I=valid; Q=complete; D=non-authorizing |
| R27 Workspace-absent exact-workspaces scope | workspace-absent registration input for Ah1 has permittedWorkspaceScope=exact-workspaces({W}) | {(002,Sh),(005,Ah1)} | Stage-A result=wrong-scope and no Q exists; P=wrong-subject; C=wrong-correspondence; U=non-authorizing-wrong-context-or-privacy; I=valid; Q=complete; D=non-authorizing |
| R28 Workspace-present absent-only scope | workspace-present(W) registration input for Ah1 has permittedWorkspaceScope=workspace-absent-only | {(002,Sh),(005,Ah1)} | Stage-A result=wrong-scope and no Q exists; P=wrong-subject; C=wrong-correspondence; U=non-authorizing-wrong-context-or-privacy; I=valid; Q=complete; D=non-authorizing |
| R29 late ResourceObject fixed point | a resource appears only in a late complete owner enumeration; two independent implementations discover it in different orders | empty | both add identical owner, attachment, K-cell, proposition, event, node, trigger, and record coordinates before freeze; populations equal; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| R30 late S06 endpoint fixed point | a finite S06 endpoint appears only after a Channel enumeration and forces a path/gate question | empty | both implementations reach the same least fixed point and RequiredRecordSet; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| R31 late Producer fixed point | an additional candidate Producer appears from a required Stage-B source-domain enumeration after its proposition was seeded | empty | both add the same lifecycle, coupling, influence, IAA independence conclusion/currentness, direct-fact, event-source-population, occurrence, closure, RC, F, and trigger coordinates; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| R32 late malformed edge fixed point | a received type-forbidden K32 edge appears only after endpoint/resource expansion; two implementations retain it and all affected coordinates | {(016,Qh1),(019,Qh1,F09)} | populations/inventories are structurally equal and complete despite failure; P=unsatisfied; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |

Every R01-R32 reason set is the complete set for its isolated construction under the default qualifier. Where a case names one permission, other permissions remain independently complete and cannot cure it.

### 25.5 Revision 7 final bounded-repair cases

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| V01 classified Producer is sole absence source | Producer P is the only source claiming that P has no K49/control path; the exact threat-set evidence has no eligible non-threat absence source and the IAA returns indeterminate | {(012,Qh1),(016,Qh1),(019,Qh1,F03),(019,Qh1,F14)} | self-bootstrapping is rejected; P=unsatisfied; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |
| V02 threat-member boundary source claims no K49 | the only absence evidence is authored by a boundary-state Producer that belongs to ProducerInfluenceThreatSet; the IAA cannot conclude outside-control | {(012,Qh1),(016,Qh1),(019,Qh1,F03),(019,Qh1,F14)} | threat-member-only absence is nonpositive; P=unsatisfied; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |
| V03 independent evidence but no qualified IAA conclusion | complete threat/path evidence exists, but the exact IAA ProducerIndependenceMeasuredConclusion/currentness/qualification occurrence is absent | {(012,Qh1),(016,Qh1),(019,Qh1,F03),(019,Qh1,F14),(029,Qh1)} | evidence alone has no positive measured authority; P=unsatisfied; C=partial; U=non-authorizing-upstream-currentness; I=valid; Q=complete; D=non-authorizing |
| V04 IAA concludes inside-control | the exact IAA retains a complete K49 path and authors inside-control for the only direct owner | {(012,Qh1),(016,Qh1),(019,Qh1,F03),(019,Qh1,F14)} | coverage=influence-threat-only; P=unsatisfied; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |
| V05 IAA concludes indeterminate | one threat-membership/path-absence cell is unresolved, so the exact IAA authors indeterminate | {(012,Qh1),(016,Qh1),(018,Qh1,F03),(018,Qh1,F14)} | incomplete closure cannot become outside-control; P=indeterminate; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |
| V06 qualified IAA outside-control from complete evidence | ProducerInfluenceThreatSet and every influence-path absence are complete with eligible non-threat evidence; exact IAA attribution, H-13 freshness, and authoritative-current qualification hold | empty | conclusion is the nonrecursive anchor and coverage is independently-covered; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| V07 old IAA independence conclusion after registration change | an IAA-authored outside-control conclusion names a superseded OrganizationIAARegistrationRevisionIdentity and its HistoricalCurrentnessQualification is superseded-or-retired | {(012,Qh1),(016,Qh1),(019,Qh1,F03),(019,Qh1,F14),(029,Qh1)} | old conclusion is not rebound; P=unsatisfied; C=partial; U=non-authorizing-upstream-currentness; I=valid; Q=complete; D=non-authorizing |
| V08 two complete eligible event monitors | one slot has two distinct candidates; both have qualified outside-control conclusions and consistent full-interval/domain assertions | empty | neither is a duplicate/preferred source; source population=continuous-complete; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| V09 one complete plus partial corroborators | all candidate assertions are visible; one qualified outside-control candidate covers the full interval/domain and any number of other consistent candidates cover only partial intervals/domains | empty | partial candidates supply no positive completion and do not erase the same-candidate complete source; D=pass with all states satisfied/current/valid/complete |
| V10 two eligible complete monitors contradict | two qualified outside-control candidates each cover the full interval/domain but assert incompatible before/after state for one event | {(008,Qh1),(025,Qh1),(019,Qh1,F12),(019,Qh1,F15)} | conflict retained; P=contradictory; C=contradictory-coverage; U=non-authorizing-invalidated; I=valid; Q=complete; D=non-authorizing |
| V11 two partial monitors under catalogue policy | two qualified outside-control candidates cover disjoint partial intervals whose union would be gapless, but every initial slot is independently-complete-source | {(025,Qh1),(019,Qh1,F12),(019,Qh1,F15)} | cross-candidate union prohibited; P=unsatisfied; C=complete-unique; U=non-authorizing-invalidated; I=valid; Q=complete; D=non-authorizing |
| V12 no eligible complete event monitor | every candidate assertion is full-interval, but each candidate has an exact IAA-authored inside-control conclusion whose separate H-13 freshness and H-11 authoritative-current qualification both pass | {(012,Qh1),(025,Qh1),(019,Qh1,F12),(019,Qh1,F14),(019,Qh1,F15)} | inside-control creates no positive source; P=unsatisfied; C=partial; U=non-authorizing-invalidated; I=valid; Q=complete; D=non-authorizing |
| V13 future collective-policy token | a received policy token future-collective-x accompanies otherwise complete consistent partial monitor populations | {(025,Qh1),(031,Qh1),(019,Qh1,F12),(019,Qh1,F15)} | token is unknown/malformed, cannot replace independently-complete-source, and is non-authorizing; P=incomplete; C=partial; U=non-authorizing-unknown-h13-semantics; I=valid; Q=complete; D=non-authorizing |
| V14 synthetic release set on boundary permission | Ah1 carries all exact R8-25 fields plus an invented boundary-permission permittedReleaseScope copied from R8-10 | {(005,Ah1),(008,Ah1)} | field remains wrong-owner Stage-A input and is never normalized; P=contradictory; C=wrong-correspondence; U=current; I=valid; Q=complete; D=non-authorizing |
| V15 missing registration release scope defaulted | Ah1's R8-10 input omits permittedReleaseScope and an evaluator attempts to treat omission as unrestricted | {(005,Ah1),(008,Ah1)} | no default exists and no Stage-B Q is created; P=wrong-subject; C=wrong-correspondence; U=current; I=valid; Q=complete; D=non-authorizing |
| V16 exact Workspace-present typed intersection | R8-10 admits W/release/side/profile, R8-25 binds W/exact side/profile, R8-15 selects positive-overlay(X), exact R8-18 narrowing admits Ah1, real-owner attributions hold, and all four exact qualifications are authoritative-current | empty | Stage-A result=applicable and exact Stage-B Qh1 is generated; D=pass with all states satisfied/current/valid/complete |
| V17 exact Workspace-absent typed intersection | R8-10 scope is workspace-absent-only, R8-25 tag is absent, all Workspace inputs/identities are absent, exact Organization-owned fields admit Ah1, and registration/permission qualifications are authoritative-current | empty | R8-20A result=applicable; D=pass with all states satisfied/current/valid/complete |
| V18 overlay narrowing injected into registration input | an R8-18 boundaryPermissionSubjectNarrowing field is copied into OrganizationRegistrationApplicabilityInput and omitted from the exact overlay input | {(005,Ah1),(008,Ah1)} | source ownership/projection contradiction retained; no default/copy repair; P=contradictory; C=wrong-correspondence; U=current; I=valid; Q=complete; D=non-authorizing |
| V19 structural whole-target classification | Qh1/Qh2 targets are structurally equal under complete runtime/effective-boundary evidence and every shared-governance condition holds | empty | pair=whole-target-structurally-equal; one holding component relation; P=satisfied; C=complete-shared-permitted; U=current; I=valid; Q=complete; D=pass |
| V20 proper runtime subset overlap | targets share one nonempty proper RuntimeIncarnation subset with complete evidence and are not whole-target equal | {(022,Gabc),(023,Gabc)} | pair=partial-target-overlap; component indivisible and nonholding; P=satisfied; C=unexpected-duplicate; U=current; I=valid; Q=complete; D=non-authorizing |
| V21 exact K46 with disjoint targets | Qh1/Qh2 share exact finite service-capacity ResourceObject R under valid K46; runtime and effective-boundary populations are completely disjoint | empty | pair=target-disjoint; shared R remains present; no graph edge/governance component; D=pass with all states satisfied/current/valid/complete |
| V22 K45 with disjoint targets | runtime/effective-boundary populations are target-disjoint, but exact mutable ResourceObject R establishes K45 | {(019,Qh1,F07),(019,Qh1,F09),(019,Qh1,F13)} | pair remains target-disjoint and no graph edge is created; independent K45 predicates fail; P=unsatisfied; C=complete-unique; U=current; I=valid; Q=complete; D=non-authorizing |
| V23 contradictory target-overlap evidence | one complete input establishes whole-target correspondence while another eligible complete input establishes runtime disjointness | {(008,Gabc),(022,Gabc),(023,Gabc)} | pair=target-overlap-contradictory and component fails; P=contradictory; C=contradictory-coverage; U=current; I=valid; Q=complete; D=non-authorizing |
| V24 impossible K46 without shared ResourceObject | K46(A,B,R) is asserted while the complete resource closure says exact R is not shared | {(008,Qh1),(016,Qh1),(019,Qh1,F09),(019,Qh1,F13)} | K46/resource contradiction retained and never rephrased as target overlap; P=contradictory; C=partial; U=current; I=valid; Q=complete; D=non-authorizing |
| V25 later event observation cannot move cut | Qh1's complete ClosureCutEvidenceSet has latest common position t1; a later event-scoped continuous-series ObservationOccurrence at t2 is added to the already complete no-event coverage population | empty | t2 is excluded from ClosureCutEvidenceSet, ClosureStateCut remains t1, and coverage continues over (t1,use]; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| V26 event inserted as ClosureStateCut dependency | an otherwise complete candidate adds a post-cut event-source-population coordinate to closure-state-cut while that population already depends on the cut | {(032,C0),(035,C0)} | prohibited cycle/extra dependency; P=satisfied; C=complete-unique; U=non-authorizing-provenance-invalid; I=cycle; Q=complete; D=non-authorizing |
| V27 denied candidate remains Stage A only | Ah2 is authoritatively denied while Ah1 is applicable; both remain in Stage A and only Ah1 generates Qh1/Stage-B authorization coordinates | empty | denied audit candidate is retained without predicates; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| V28 H-13 fact attempts to influence Stage A | H02SelectedCurrentUseIntersection declares F01 as a dependency and F01 depends on the H-02 input | {(032,C0),(035,C0)} | Stage-order cycle and malformed dependency; P=satisfied; C=complete-unique; U=non-authorizing-provenance-invalid; I=cycle; Q=complete; D=non-authorizing |
| V29 exact two-stage population | Stage A resolves Ah1 applicable and Ah2 narrowed; Stage B contains every and only Qh1 while inventory contains both Stage-A records and the complete Qh1 population | empty | stage dependency exact and deterministic; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| V30 rejected candidate receives injected PCE | Ah2 is Stage-A denied, yet an extra Qh2 PermissionCoverageEvaluation/provenance node is supplied | {(005,Ah2),(020,Sh),(035,C0)} | injected Stage-B authorization node is retained and non-authorizing; P=wrong-subject; C=partial; U=non-authorizing-provenance-invalid; I=malformed; Q=complete; D=non-authorizing |

Every V01-V30 reason set is complete for its isolated construction. The cases fix the IAA trust anchor, initial constant source-population policy, typed H-02 field/content ownership, historical qualification, overlap precedence, K45/K46 separation, event-independent cut, and Stage-A/Stage-B boundary without changing any unrelated successful Revision 7 case outcome.

### 25.6 Revision 8 three-finding repair cases

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| W01 two partial monitors whose union would be complete | two qualified outside-control candidates cover complementary interval/domain portions, but neither same candidate is continuous-complete for the whole slot | {(025,Qh1),(019,Qh1,F12),(019,Qh1,F15)} | independently-complete-source forbids the union; P=unsatisfied; C=complete-unique; U=non-authorizing-invalidated; I=valid; Q=complete; D=non-authorizing |
| W02 provider configuration requests collective mode | provider configuration supplies collective-mode as the slot policy even though all initial slots generate independently-complete-source | {(025,Qh1),(031,Qh1),(019,Qh1,F12),(019,Qh1,F15)} | configuration is unknown/malformed and non-authorizing; it cannot select policy |
| W03 IAA requests collective mode | the exact IAA authors a measured conclusion requesting collective-mode and otherwise valid partial-source union | {(025,Qh1),(031,Qh1),(019,Qh1,F12),(019,Qh1,F15)} | measured authority does not include profile-policy selection; request cannot change the constant and is non-authorizing |
| W04 two complete consistent eligible monitors | two distinct enumerated candidates each have qualified outside-control conclusions and continuous-complete consistent whole-slot assertions | empty | both corroborate without becoming duplicates; D=pass with all states satisfied/current/valid/complete |
| W05 one complete plus any number of partial corroborators | one enumerated qualified candidate covers the whole slot; all remaining candidates are visible, partial, and consistent | empty | same-candidate positive floor holds, partial corroborators are nonpositive, and D=pass |
| W06 future unknown collective-policy token | future-collective-y is received at a slot with otherwise complete evidence | {(025,Qh1),(031,Qh1),(019,Qh1,F12),(019,Qh1,F15)} | reason 031 and non-authorizing; reviewed semantic evolution is required |
| W07 claimed registration interval contains cut but qualification unavailable | immutable R8-10 claimed interval contains AuthorityUseCut, but the exact registration HistoricalCurrentnessQualification outcome is unavailable | {(029,Sh)} | Stage A may produce scope-eligible but not applicable; no Q is seeded; U=non-authorizing-upstream-currentness; D=non-authorizing |
| W08 registration interval contains cut but revision superseded | claimed interval contains the cut, while the exact qualification is superseded-or-retired | {(029,Sh)} | claimed time cannot resurrect the revision; no Q is seeded; D=non-authorizing |
| W09 old Workspace overlay replay | an old authentic Workspace-authored overlay still claims an interval containing the cut, but its qualification is superseded-or-retired | {(029,Sh)} | content authority remains Workspace-owned, history is noncurrent, and Stage A is non-authorizing |
| W10 old IAA conclusion replay | an IAA-authored RuntimeCorrespondence has valid immutable content and attribution but its HistoricalCurrentnessQualification is superseded-or-retired | {(029,Qh1)} | IAA content authority does not prove current history; U=non-authorizing-upstream-currentness; D=non-authorizing |
| W11 current content with rollback/fork unresolved | exact authentic registration content is structurally scope-eligible, but qualification is rollback-or-fork-unresolved | {(010,Ah1),(029,Sh)} | history integrity and currentness both fail; no Stage-B authorization coordinate is seeded |
| W12 exact authoritative-current qualification and all gates | each Organization/Workspace input and each IAA conclusion has authentic real-owner content, authoritative-current qualification, and required H-13 freshness; every other gate passes | empty | currentness may pass; P=satisfied; C=complete-unique; U=current; I=valid; Q=complete; D=pass |
| W13 local mutable status says current | a local status flag says current for authentic registration content, but no HistoricalCurrentnessQualification is available | {(029,Sh)} | local status has no authority; Stage A is non-authorizing and seeds no Q |
| W14 target runtime direct K49 to Producer report | exact target S01 is a threat-set seed and a present K49 reaches evaluated Producer P's O10 report surface | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14)} | threat set is complete, influence-established, IAA must not author outside-control; D=non-authorizing |
| W15 controlled controller indirect alteration path | exact S02 belongs through K04/role closure and a finite transitive qualifying path reaches P's observation surface | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14)} | indirect influence is inside-control; D=non-authorizing |
| W16 common mutable telemetry resource | a threat subject and P participate in K45 through one exact mutable telemetry-plane ResourceObject | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14)} | K45 establishes inside-control; D=non-authorizing |
| W17 threat-set subject membership indeterminate | one raw candidate subject has unresolved closure membership under the finite least-closure rules | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F14)} | threat set is incomplete, outside-control is prohibited, P=indeterminate; D=non-authorizing |
| W18 one path absence unresolved | threat membership is exact-complete but one candidate simple path lacks a coherent presence/absence result | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F14)} | incomplete absence evidence is indeterminate, never outside-control; D=non-authorizing |
| W19 provider label says independent | provider metadata labels P independent, while the required structural graph/path absence population is incomplete | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F14)} | label supplies no membership or path fact; D=non-authorizing |
| W20 complete threat set and all paths absent | the finite least closure is exact-complete; every possible influence path is coherently absent; absence evidence has eligible non-threat sources; exact IAA content, H-13 freshness, and authoritative-current history all hold | empty | IAA may author outside-control; coverage becomes independently-covered and D=pass with all other gates passing |
| W21 K46-only anonymous aggregate sharing | exact K46 satisfies Section 11.3; only anonymous aggregate capacity timing/load is shared; no promotion to K45/K49/other influence exists | empty | K46 alone creates neither threat membership nor influence path; outside-control may still hold and D=pass with all other gates passing |

Every W01-W21 reason set is complete for its isolated construction. These cases close R8-B-001, R8-B-002, and R8-B-003 without altering the retained target-overlap, K45/K46, cut, cardinality, privacy, reuse, or result semantics.

### 25.7 Revision 9 three-finding bounded-repair cases

X01-X09 are exclusively `general-age` measured-conclusion cases (RuntimeCorrespondence is the representative family). They do not apply to ProducerBindingContinuityMeasuredConclusion. Binding continuity is governed by Y09-Y15 and Z/R13 cases and can pass only at semantic M=U with `binding-self-age([0,0])`.

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| X01 general-age conclusion wholly below 60 seconds | a non-binding general-age conclusion has resolved same-domain inputs and derived age [59.999,59.999] seconds; history is authoritative-current | empty | general-age freshness=fresh; D=pass with other gates passing; no binding inference |
| X02 general-age conclusion exactly 60 seconds | a non-binding general-age conclusion has derived age [60,60] seconds and current history | {(027,Qh1),(029,Qh1)} | exact 60 is stale for that family; no binding inference |
| X03 general-age interval straddles 60 | a non-binding general-age conclusion has [59.8,60.2] seconds | {(024,Qh1),(029,Qh1)} | freshness=indeterminate; no binding inference |
| X04 general-age conclusion possibly after use | a non-binding general-age conclusion has interval [-0.2,0.1] seconds | {(024,Qh1),(029,Qh1)} | order/freshness=indeterminate; no future normalization and no binding inference |
| X05 fresh general-age conclusion but superseded history | a non-binding general-age interval is wholly in [0,60), while its history is superseded-or-retired | {(029,Qh1)} | freshness cannot cure history; no binding inference |
| X06 stale general-age conclusion but current history | a non-binding general-age conclusion is exactly 60 seconds old with current history | {(027,Qh1),(029,Qh1)} | history cannot cure freshness; no binding inference |
| X07 fresh general-age conclusion and current history | a non-binding general-age interval is wholly in [0,60), resolved, and authoritative-current | empty | both gates pass for that family; no binding inference |
| X08 120-second general-age token | a non-binding general-age input requests MeasuredConclusionMaximumAge=120 while the coordinate uses 60 | {(031,Qh1)} | token cannot alter the constant; no binding inference |
| X09 missing general-age measurement time | a non-binding general-age conclusion/history exists but its measured-position input is unavailable | {(024,Qh1),(029,Qh1),(030,Qh1)} | freshness=unavailable; no history or binding inference |
| X10 Q-controlled report source claims no Q-to-P path | source S reports a negative K49 cell through its O10 surface, but a present path from a threat-domain member reaches S | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14)} | source-control=source-inside-threat-control; the negative primitive is ineligible and cannot establish outside-control |
| X11 Q-controlled observation source claims no Q-to-P path | source S observes a negative edge through O09, while exact K45 gives a threat-domain member mutable control of S's observation resource | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14)} | source is controlled and the primitive is ineligible; D=non-authorizing |
| X12 indirectly controlled secondary source | no direct threat-to-S edge exists, but the complete constituent cells establish a transitive threat-to-S path | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14)} | derived path-present makes source-control inside; a different Producer identity supplies no independence |
| X13 missing P-to-O09/O10 surface binding | one candidate negative cell names S but S has no exact report/observation surface allocation binding | {(012,Qh1),(016,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(029,Qh1),(030,Qh1)} | binding and binding currentness are unavailable, source control and evidence are indeterminate; D=non-authorizing |
| X14 unresolved constituent in source-control path | the finite path population is closed, but one required direct edge cell is unavailable | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14)} | ownerless composite path is indeterminate, never absent; D=non-authorizing |
| X15 provider label asserts source independence | provider metadata calls S independent while one required threat-to-S cell is unavailable | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14)} | label has no source-control authority; D=non-authorizing |
| X16 clean qualified secondary negative source | S differs from P, has exact-complete O09/O10 binding, is outside exact-complete AbsenceSourceThreatControlDomain(Q,S), every threat-to-S path is coherently absent from non-S-sourced direct cells, and its IAA source-control conclusion is fixed-fresh and authoritative-current | empty | negative primitives from S are admissible; complete evidence may support outside-control and D=pass with all other gates passing |
| X17 classified Producer self-absence | P is the sole source of a negative cell used to prove no threat-to-P path | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14)} | P is ineligible regardless of a self-authored label or report; D=non-authorizing |
| X18 threat-domain member supplies absence | S differs from P but S is itself in AbsenceSourceThreatControlDomain(Q,S) through non-S-sourced positive evidence | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14)} | source is ineligible before any P-specific evidence conclusion; D=non-authorizing |
| X19 direct-only Producer enters coupling set | P appears only as a direct factual source in the frozen Stage-B population | empty | P is in RelevantProducerSet(Q), receives one surface binding, and participates in every required unordered pair |
| X20 event-only Producer enters coupling set | P appears only in an E01-E17 candidate EventRequirementSourcePopulation | empty | P is included before coupling enumeration; no event verdict can filter it |
| X21 K49-only Producer enters coupling set | P appears only as an endpoint/source in a raw K49 candidate cell | empty | P is included and all of its pairs are generated even when the cell later resolves absent |
| X22 late bounded Producer discovery | a Producer is exposed on the final strict-growth Stage-B expansion step | empty | frozen RelevantProducerSet and all-pairs population equal the result of early discovery; ordering cannot change them |
| X23 three Producers require three pairs | RelevantProducerSet(Q)={A,B,C} with one exact state for {A,B}, {A,C}, and {B,C} | empty | pair count=3, population=complete, and D=pass with all other gates passing |
| X24 one required coupling pair state record omitted | the frozen set is {A,B,C}; {A,B} and {A,C} resolve, while the required {B,C} state node and semantic record are absent | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(033,C0),(036,C0)} | pair-to-state cardinality=missing, provenance has a missing dependency, result completeness is incomplete, and no n=3-to-2 normalization occurs; D=non-authorizing |
| X25 injected outside-set coupling pair | frozen set is {A,B}; received state {A,Z} is retained even though Z appears only in that injected state | {(012,Qh1),(016,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14)} | Z cannot self-add; pair-to-state cardinality=injected and D=non-authorizing |
| X26 implementation-order equality | two clean-room implementations discover the same direct/event/K45/K49/surface/closure/technical/late candidates in different orders | empty | RelevantProducerSet, n(n-1)/2 pair set, base graph, state population, threat domain, provenance, and final decision are structurally equal |

Every X01-X26 reason set is complete for its isolated construction. X01-X09 close fixed `general-age` measured-conclusion freshness and its independence from history and explicitly exclude binding continuity; X10-X18 close secondary negative-source control and exact P-to-O09/O10 binding; X19-X26 close RelevantProducerSet/all-pairs coupling. Separate closure freshness and retained Revision 8 outcomes remain unchanged.

### 25.8 Revision 10 three-finding bounded-repair cases

T01-T06 are exclusively non-binding measured-conclusion `general-age` cases. T07 is exclusively the separate ClosureStateCut FreshnessCalculation case. No T01-T07 pass vector permits binding continuity with M<U; binding causality remains Y09-Y15/Z-specific.

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| T01 general-age equal domain below 60 | a non-binding conclusion's M/U domains are exact-equal and general age=[59.999,59.999] seconds | empty | general-age freshness=fresh for that family; no binding inference |
| T02 general-age equal domain at 60 | a non-binding conclusion's exact-equal-domain general age=[60,60] seconds | {(027,Qh1),(029,Qh1)} | stale at the boundary for that family; no binding inference |
| T03 general-age unequal domains | a non-binding conclusion has unequal well-formed domains despite compatible displayed numerals | {(024,Qh1),(029,Qh1)} | no general-age interval; freshness=indeterminate; no binding inference |
| T04 general-age provider conversion | T03 carries a provider conversion/offset token | {(024,Qh1),(029,Qh1),(031,Qh1)} | token is non-authoritative and creates no interval; no binding inference |
| T05 general-age domain unavailable | a non-binding conclusion has resolved M domain and unavailable U domain | {(024,Qh1),(029,Qh1),(030,Qh1)} | comparison/freshness unavailable; no binding inference |
| T06 general-age contradictory domain attribution | a non-binding conclusion claims equal domains while structural domains differ | {(008,Qh1),(024,Qh1),(029,Qh1)} | comparison=contradictory; no subtraction and no binding inference |
| T07 closure freshness with unequal domains | ClosureStateCut and AuthorityUseCut use well-formed unequal QualifiedPhysicalTimeDomain values | {(024,Qh1)} | permission FreshnessCalculation=indeterminate under the same no-subtraction rule; P=indeterminate; U=current; D=non-authorizing |
| T08 time-domain clean-room equality | two implementations receive identical domain structures, input intervals, and use cut | empty | both derive the same comparison, optional age interval, freshness verdict, provenance, and decision |
| L01 K49 relation changes under intrinsic continuity | a K49 coupling relation changes after the closing cut while both Producer observation/report mechanisms and intrinsic lifecycle remain continuous and no re-evaluation has yet closed the affected coordinates | {(026,Qh1)} | both ProducerIncarnation values remain unchanged; exact Qh1 evidence is invalidated and must be re-evaluated |
| L02 K45 telemetry-resource relation changes | a K45 common mutable telemetry resource relation changes without restart or observation/report mechanism substitution and before fresh re-evaluation | {(026,Qh1)} | ProducerIncarnation values remain unchanged; the relationally affected Qh1 coordinates invalidate |
| L03 actual Producer restart | raw lifecycle evidence establishes activation-continuity loss and a restart; the new incarnation and every affected binding/evaluation are freshly closed | empty | old ProducerIncarnation ends, exactly one new Q-independent incarnation begins, and no coupling verdict determines either value |
| L04 intrinsic mechanism substitution | observation/report mechanism substitution breaks intrinsic continuity; every affected Q receives the new incarnation and rebuilt current binding | empty | one new ProducerIncarnation is required by intrinsic lifecycle evidence |
| L05 one of two Q values has a coupling change | the same ProducerIncarnation participates in Qh1 and Qh2; only Qh1 has a relational coupling event and no Qh1 re-evaluation yet | {(026,Qh1)} | the incarnation is identical in Qh1 and Qh2; only exact affected Qh1 evidence invalidates; no Q-specific incarnation is manufactured |
| L06 genuine replacement across two Q values | a real intrinsic Producer replacement affects Qh1 and Qh2 and both evaluations are freshly rebuilt | empty | both Q populations project the same new ProducerIncarnation and independently rebuild their Q-local values |
| L07 reverse coupling-to-incarnation dependency | an implementation declares ProducerIncarnation dependent on ProducerControlCouplingState, while the coupling state already depends on RelevantProducerSet and the incarnation | {(032,C0),(035,C0)} | the reverse extra edge is cyclic and noncanonical; provenance is invalid and D=non-authorizing |
| L08 lifecycle/coupling clean-room equality | two implementations receive identical raw intrinsic lifecycle evidence and Q-local K45/K49 events in different discovery orders | empty | both derive equal global ProducerIncarnation values, equal RelevantProducerSet/pair populations, and equal Q-local invalidations |
| S01 safe report surface replaced after binding | binding at t0 names safe O10-A; E17 at t1 replaces it with threat-controlled O10-B; AuthorityUseCut follows t1 and no new binding has closed | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(026,Qh1),(029,Qh1)} | old binding currentness=invalidated; old SourceAttribution is ineligible and cannot authorize |
| S02 O09 acquisition resource changes | E15 changes the O09 acquisition resource while intrinsic Producer continuity remains valid and no new binding has closed | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(026,Qh1),(029,Qh1)} | ProducerIncarnation remains the same; old binding invalidates and a new binding is required |
| S03 exact report mechanism incarnation replacement | complete uniquely ordered intrinsic evidence replaces the report mechanism for a continuing capability; the evaluator creates the one new incarnation and closes a new binding with complete owner evidence/current IAA conclusion | empty | new ProducerIncarnation plus new current binding are required; the old pair cannot be reused |
| S04 membership change without continuity break | O09/O10 binding membership changes under E17 while the intrinsic mechanism remains continuous and no rebuilt binding has closed | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(026,Qh1),(029,Qh1)} | same ProducerIncarnation is permitted, but old binding currentness=invalidated |
| S05 positive binding-event coverage gap | ProducerBindingEventCoverage has a positive gap around a possible O09/O10 change | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1),(029,Qh1)} | coverage=gap and binding currentness=unavailable under the closed mapping; missing event absence is never inferred; D=non-authorizing |
| S06 binding occurrence missing or ambiguous | one required Producer has no unique exact O09/O10 binding occurrence | {(012,Qh1),(016,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(029,Qh1),(030,Qh1)} | binding and currentness are unavailable/indeterminate under retained exact-cardinality behavior; D=non-authorizing |
| S07 unchanged binding with complete coverage | binding is established at the exact ProducerBindingStateCut for the current incarnation; every exact baseline owner agrees at B; binding-event coverage is continuous-complete and zero-gap through AuthorityUseCut; the M=U conclusion is exact-close/current and no binding-affecting event occurs | empty | ProducerSourceSurfaceBindingCurrentness=current and the binding may qualify evidence |
| S08 stale safe binding versus current controlled surface | the evaluator offers the pre-event safe binding even though the actual current surface is threat-controlled and a covered binding-affecting event intervened | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(026,Qh1),(029,Qh1)} | stale binding cannot yield source-outside-threat-control, admissibility, independence, or authority |
| S09 binding-currentness clean-room equality | two implementations receive identical binding candidate, cross-owner baseline state, intrinsic lifecycle, surface allocation/topology, event occurrences, M/U causality/currentness, and AuthorityUseCut | empty | both derive the same binding-currentness, affected-coordinate invalidation, provenance, and decision |

### 25.9 Revision 11 Q-independent intrinsic-lifecycle cases

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| I01 same Producer added to Q2 | Qh1 and Qh2 project the same ProducerIdentity at one AuthorityUseCut; Qh2 adds a new permission-local ObservationScope while the exact activation/mechanism/capability state is unchanged and both Q bindings are freshly complete | empty | exactly one producer-lifecycle-scoped ProducerIntrinsicContinuity is continuous; both Q values carry the same ProducerIncarnation |
| I02 Q1 ObservationScope removed | Qh1's ObservationScope is removed while Qh2 remains and no Q-independent lifecycle component changes; Qh1 invalidation is fully closed | empty | the same ProducerIncarnation remains globally and in Qh2; scope removal allocates no identity |
| I03 O09 attachment moves under exact same mechanism | boundary-state direct owner reports an attachment move while the exact observation mechanism incarnation is retained and no replacement Qh1 binding has closed | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(026,Qh1),(029,Qh1)} | global intrinsic verdict=continuous and ProducerIncarnation is unchanged; Qh1 old binding invalidates |
| I04 observation mechanism replacement across Q1/Q2 | one uniquely ordered observation-mechanism replacement for a continuing capability occurs; both Q bindings and evidence are freshly rebuilt | empty | exactly one new ProducerIncarnation is allocated at the transition and the identical replacement is projected to Qh1 and Qh2 |
| I05 report mechanism replacement | one uniquely ordered report-mechanism replacement for a continuing capability occurs and all affected Q values are freshly rebuilt | empty | the same closed replacement rule allocates exactly one new ProducerIncarnation at that transition |
| I06 concurrent old and replacement mechanisms | old and candidate new observation mechanisms operate concurrently for one capability without a unique end/replacement relation | {(011,Qh1),(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(024,Qh1),(029,Qh1)} | ProducerIntrinsicContinuity=indeterminate; no first/newest wins and no candidate incarnation authorizes |
| I07 raw lifecycle evidence missing | the required producer-lifecycle mechanism coverage domain is absent while no contradiction is established | {(011,Qh1),(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(029,Qh1),(030,Qh1)} | ProducerIntrinsicContinuity=unavailable, never assumed continuous; D=non-authorizing |
| I08 lifecycle and Q changes discovered in different orders | two implementations receive identical lifecycle facts plus Q-local scope changes in different discovery orders | empty | both generate one equal ProducerLifecycleEvaluationCoordinate/node and equal continuity/incarnation/Q projections |
| I09 Q-local ObservationScope declared as global intrinsic dependency | a provenance candidate makes Qh1 ObservationScope an immediate dependency of the producer-lifecycle-scoped intrinsic node | {(035,C0)} | the extra dependency and illegal cross-scope content are malformed; I=malformed; D=non-authorizing |
| I10 coupling attempts to allocate incarnation | ProducerControlCouplingState is declared to allocate or replace ProducerIncarnation and feeds the global intrinsic node | {(032,C0),(035,C0)} | the reverse edge is cyclic/noncanonical; coupling remains incapable of identity allocation |

### 25.10 Revision 11 nonrecursive binding-bootstrap cases

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| B01 canonical EventOccurrence offered as bootstrap | a canonical EventOccurrence value is supplied at a binding-lifecycle-direct-input coordinate | {(016,Qh1),(025,Qh1),(035,C0)} | known wrong semantic type is rejected; it cannot bootstrap the binding required by its SourceAttribution; D=non-authorizing |
| B02 bootstrap contains recursive SourceAttribution | a purported BindingLifecycleObservation contains SourceAttribution whose currentness depends on the binding under evaluation | {(032,C0),(035,C0)} | the forbidden extra edge creates the exact attribution/currentness cycle; I=cycle; D=non-authorizing |
| B03 missing bootstrap owner-slot coordinate | one generated BindingLifecycleOwnerSlot has no semantic node or record occurrence | {(025,Qh1),(030,Qh1),(033,C0),(036,C0)} | population=unavailable; provenance and result inventory are incomplete; D=non-authorizing |
| B04 duplicate equal bootstrap statement | one owner slot's single candidate-family node retains two equal BindingLifecycleCoverageStatement occurrences | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(025,Qh1)} | semantic occurrence multiplicity fails before set projection while node/record cardinality remains one; population=indeterminate; D=non-authorizing |
| B05 conflicting bootstrap before/after state | equal owner/scope/position inputs carry unequal before/after values | {(008,Qh1),(025,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14)} | population=contradictory; no precedence or deduplication; D=non-authorizing |
| B06 ordinary coverage authenticates itself | an EventCoverageAssertion is declared to establish ProducerBindingEventCoverage/currentness required by that assertion's own SourceAttribution | {(032,C0),(035,C0)} | the returned edge is cyclic and forbidden; I=cycle; D=non-authorizing |
| B07 clean no-change bootstrap population | the cross-owner baseline is exact-coherent; every exact post-B owner slot has one attributed-authentic continuous-complete statement over (B,U], every observation family is empty, and one M=U exact-close current qualified IAA conclusion says unchanged | empty | population=continuous-complete-no-change; ProducerBindingEventCoverage=continuous-complete; binding may be current |
| B08 clean binding-change bootstrap population | one exact owner reports a well-formed binding-affecting change and the current IAA conclusion consistently says changed; no replacement binding has closed | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(026,Qh1),(029,Qh1)} | coverage=changed and old binding=invalidated even before ordinary EventOccurrence eligibility is evaluated |
| B09 bootstrap clean-room equality | two implementations receive identical owner-slot sets, direct inputs, order/concurrency, IAA conclusion/currentness, and cut | empty | both derive an identical acyclic graph, population, coverage/currentness, affected coordinates, and decision |

### 25.11 Revision 11 direct-owner and bounded-IAA authority cases

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| A01 environment owner change versus IAA unchanged | environment-membership direct owner reports an O09 resource change at t1 and the current IAA conclusion says unchanged through U greater than t1 | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1),(029,Qh1)} | direct-owner/IAA consistency=contradictory; IAA cannot override the change; binding is noncurrent |
| A02 boundary-state change versus IAA unchanged | boundary-state direct owner reports an attachment change and the current IAA conclusion says unchanged through the later cut | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1),(029,Qh1)} | contradictory/non-authorizing; no IAA-wins or newest-wins branch exists |
| A03 producer-lifecycle replacement versus IAA unchanged | producer-lifecycle direct owner establishes a mechanism replacement while the IAA says the old binding remained unchanged | {(008,Qh1),(009,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F14),(025,Qh1),(029,Qh1)} | global replacement follows direct lifecycle evidence; the opposing IAA conclusion is contradictory and cannot preserve old authority |
| A04 required owner domain unavailable | one generated direct-owner slot/domain is inaccessible while the IAA claims unchanged | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(025,Qh1),(029,Qh1),(030,Qh1)} | population=unavailable; IAA absence cannot fill the missing domain; D=non-authorizing |
| A05 direct owners clean but IAA conclusion absent | every owner slot is continuous-complete-no-change but the required IAA conclusion occurrence is absent | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(025,Qh1),(029,Qh1),(030,Qh1)} | coverage/conclusion currentness=unavailable; direct evidence alone is not the positive anchor |
| A06 IAA conclusion superseded, revoked, or compromised | the exact conclusion content is present and fresh but HistoricalCurrentnessQualification is respectively superseded-or-retired, revoked, or compromised | {(029,Qh1)} for each branch | binding-continuity-currentness is respectively changed-or-superseded, revoked, or compromised; coverage and binding are explicitly noncurrent in every branch |
| A07 IAA conclusion rollback/fork unresolved | content and fixed freshness pass but binding conclusion history is rollback-or-fork-unresolved | {(010,Qh1),(029,Qh1)} | currentness=rollback-or-fork-unresolved; coverage and binding=noncurrent |
| A08 duplicate or conflicting IAA binding conclusions | one candidate-family node retains two conclusion occurrences at the same coordinate; branch one is equal and branch two is unequal | equal: {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(025,Qh1),(029,Qh1)}; unequal: {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1),(029,Qh1)} | semantic occurrence multiplicity fails while node/record cardinality remains one; equal duplicate is indeterminate and unequal duplicate contradictory; neither authorizes |
| A09 complete owner evidence and exact current IAA unchanged | every baseline and post-B owner slot is complete/clean; the baseline is exact-coherent; exactly one M=U IAA conclusion over the exact post-B population says unchanged; domain equality, zero-age fixed freshness, and history pass | empty | ProducerBindingEventCoverage=continuous-complete and the exact binding may be current |
| A10 malicious/provider “binding current” label | no exact owner population or IAA conclusion exists; only an untyped label claims currentness | {(012,Qh1),(025,Qh1),(029,Qh1),(030,Qh1),(031,Qh1)} | label supplies no authority, owner evidence, conclusion, freshness, or history; D=non-authorizing |

Every T01-T08, L01-L08, S01-S09, I01-I10, B01-B09, and A01-A10 reason set is complete for its isolated construction. T01-T06 are only `general-age`, T07 only ClosureStateCut freshness, and none licenses binding M<U; L/S/I/B/A retain their Revision 12 meanings.

### 25.12 Revision 12 baseline, causality, and total-state cases

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| Y01 false baseline, no later change | producer-lifecycle candidate says O10 maps to SafeResourceA at B; the exact boundary owner says the actual attachment is ThreatControlledResourceB; every post-B slot is complete-no-change | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1),(029,Qh1)} | baseline=contradictory; coverage=contradictory; binding=contradictory; post-B no-change cannot authorize |
| Y02 required baseline environment owner unavailable | producer-lifecycle allocation exists at B but the generated environment-membership owner domain is inaccessible | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(025,Qh1),(029,Qh1),(030,Qh1)} | baseline=unavailable; coverage and binding=unavailable; absence/agreement is not inferred |
| Y03 exact baseline plus clean continuity | producer-lifecycle and every exact baseline direct owner agree at B; all post-B slots are continuous-complete-no-change; one M=U fresh authoritative-current IAA conclusion says unchanged | empty | baseline=exact-coherent; coverage=continuous-complete; binding=current; pass remains possible |
| Y04 equal duplicate baseline owner occurrence | one generated baseline slot retains two equal owner occurrences | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(025,Qh1),(029,Qh1)} | raw multiplicity makes population/baseline indeterminate; no deduplication and no pass |
| Y05 unequal duplicate baseline owner occurrence | one generated baseline slot retains two unequal owner occurrences at B | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1),(029,Qh1)} | population/baseline=contradictory; no first/newest precedence |
| Y06 provider label claims baseline match | required baseline owner occurrences are absent and only an untyped local/provider label says the candidate matches | {(012,Qh1),(025,Qh1),(029,Qh1),(030,Qh1),(031,Qh1)} | label has no direct-owner authority; baseline=unavailable and binding cannot be current |
| Y07 later equality cannot repair old baseline | the Y01 conflict exists at B; a later topology change and reversal produces a state equal to the producer's old claim without a new B/baseline | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1),(026,Qh1),(029,Qh1)} | old baseline remains contradictory and the later change invalidates; no change-and-reverse repair |
| Y08 baseline discovery-order equality | two implementations receive identical candidate, owner-slot, raw occurrence, and projection inputs in different orders | empty | both derive the same slot set, multiplicity, baseline verdict, provenance, and decision |
| Y09 causal close at M=U | one exact conclusion over the complete `(B,U]` population has M and U as the same semantic position and one resolved qualified-time input | empty | causality=exact-close; self-age=[0,0]; binding currentness may proceed |
| Y10 conclusion at M=U-1 second | the conclusion claims observations through U but its resolved exact-domain position M is one second before U | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(024,Qh1),(029,Qh1)} | causality=contradictory even though generic age is below 60; binding=contradictory/non-authorizing |
| Y11 conclusion at M=U-59.999 seconds | the conclusion claims through U while M is 59.999 seconds before U in one exact domain | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(024,Qh1),(029,Qh1)} | same causal violation as Y10; freshness cannot license future observations |
| Y12 conclusion after U | complete order proves M is after the population's closing U | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(024,Qh1),(029,Qh1)} | causality=contradictory; content/cut position is inconsistent |
| Y13 M/U order unresolved | both positions are present but their semantic equality/order cannot be resolved | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(024,Qh1),(029,Qh1)} | causality=indeterminate; coverage/binding=indeterminate |
| Y14 equal-looking numerals in unequal domains | M and U display the same numeric timestamp but their well-formed QualifiedPhysicalTimeDomain values are structurally unequal | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(024,Qh1),(029,Qh1)} | no semantic equality or subtraction is inferred; causality/coverage/binding=indeterminate |
| Y15 causal clean-room equality | two implementations receive structurally equal M/U positions, domains, inputs, order, population, and conclusion | empty | both derive the same causality, zero age, currentness, provenance, and decision |
| Y16 clean unchanged plus current conclusion | exact baseline and no-change population coexist with one exact-close equal-current unchanged conclusion | empty | coverage=continuous-complete; binding=current |
| Y17 unchanged plus stale conclusion status | all local owner inputs are clean/no-change but the unique binding-continuity currentness status is stale | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(027,Qh1),(029,Qh1)} | coverage=noncurrent; binding=noncurrent; no fallthrough to current |
| Y18 unchanged plus revoked conclusion | clean/no-change local inputs coexist with binding-continuity-currentness=revoked | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(029,Qh1)} | coverage=noncurrent; binding=noncurrent |
| Y19 unchanged plus compromised conclusion | clean/no-change local inputs coexist with binding-continuity-currentness=compromised | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(029,Qh1)} | coverage=noncurrent; binding=noncurrent |
| Y20 unchanged plus superseded conclusion | clean/no-change local inputs coexist with binding-continuity-currentness=changed-or-superseded | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(029,Qh1)} | coverage=noncurrent; binding=noncurrent |
| Y21 unchanged plus rollback/fork unresolved | clean/no-change local inputs coexist with rollback-or-fork-unresolved conclusion history | {(010,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(029,Qh1)} | coverage=noncurrent; binding=noncurrent |
| Y22 unchanged plus historically unresolvable | clean/no-change local inputs coexist with historically-unresolvable conclusion currentness | {(010,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(029,Qh1)} | coverage=noncurrent; binding=noncurrent |
| Y23 unchanged plus currentness unavailable | clean/no-change local inputs exist but the required binding-conclusion currentness input is unavailable | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(029,Qh1),(030,Qh1)} | coverage=unavailable; binding=unavailable |
| Y24 unchanged plus currentness indeterminate | clean/no-change local inputs coexist with a unique currentness assertion whose required status inputs remain ambiguous | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(029,Qh1)} | coverage=indeterminate; binding=indeterminate |
| Y25 unchanged plus currentness contradictory | clean/no-change local inputs coexist with contradictory binding-conclusion currentness evidence | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(029,Qh1)} | coverage=contradictory; binding=contradictory |
| Y26 positive owner change plus equal-current changed conclusion | one direct owner reports a well-formed change and the exact-close equal-current IAA conclusion consistently says changed | {(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(026,Qh1),(029,Qh1)} | coverage=changed; old binding=invalidated |
| Y27 positive owner change plus revoked unchanged conclusion | one owner reports a real change while a revoked conclusion claims unchanged through U | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1),(026,Qh1),(029,Qh1)} | owner/conclusion conflict precedence yields coverage/binding=contradictory; change and revocation reasons both remain |
| Y28 contradictory owner population plus stale conclusion | owner evidence is contradictory and the conclusion currentness is stale | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1),(027,Qh1),(029,Qh1)} | contradiction outranks stale; coverage/binding=contradictory and all reasons remain additive |
| Y29 false local current against revoked history | local data is clean but an evaluator records binding=current while the exact conclusion currentness is revoked | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(029,Qh1),(035,C0)} | deterministic mapping requires noncurrent; the inconsistent semantic/provenance value is malformed and non-authorizing |
| Y30 exhaustive mapping clean-room equality | two implementations enumerate all ten binding-continuity-currentness statuses with identical fixed baseline/population/conclusion inputs | empty | each derives the identical table row, multi-fault precedence, local binding state, provenance, and reason set |

Every Y01-Y30 reason set is complete for its isolated construction. Y01-Y08 prove baseline truth at B independently of post-B no-change, Y09-Y15 close causal position without weakening the general 60-second/domain rules, and Y16-Y30 prove exhaustive currentness propagation and deterministic multi-fault precedence. No Y case transfers a direct fact to the IAA, reintroduces SourceAttribution recursion, or realizes H-10/H-11.

### 25.13 Revision 13 concrete-source, independent-universe, and freshness-scope cases

| Case | Construction | Exact reason set | Exact state/result |
|---|---|---|---|
| Z01 two concrete boundary sources agree | two distinct eligible boundary-state ProducerIdentity/ProducerIncarnation coordinates match one owner domain and supply equal complete baseline content | empty | both identities remain; distinct-source corroboration composes exact; pass remains possible |
| Z02 two concrete boundary sources disagree | the two eligible sources for one domain supply unequal complete projections | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1)} | baseline/source composition=contradictory; no preferred source or positive IAA override |
| Z03 equal class/domain with unequal control state | independent A and threat-controlled B have equal class/domain and equal bootstrap content | empty | A/B source coordinates remain distinct; no silent rebound; downstream control classification does not alter bootstrap identity |
| Z04 abstract owner without concrete incarnation | baseline content says only “boundary-state owner” with no ProducerIncarnation | {(011,Qh1),(012,Qh1),(016,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(025,Qh1),(030,Qh1)} | malformed/unavailable concrete source; baseline non-authorizing |
| Z05 source ended before B | named source incarnation ended or was replaced before B | {(011,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1),(026,Qh1),(029,Qh1)} | source eligibility=ended-or-replaced; it cannot establish baseline |
| Z06 source incarnation changes during (B,U] | source A-old ends and A-new begins during the interval without a rebuilt binding | {(011,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(026,Qh1),(029,Qh1)} | old/new coordinates remain distinct; positive change invalidates, never normalizes |
| Z07 equal duplicate from one source | one concrete source has two equal raw bootstrap occurrences for one slot | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(025,Qh1)} | same-source multiplicity is indeterminate; no deduplication |
| Z08 unequal duplicate from one source | one concrete source has two unequal occurrences for one slot | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1)} | source population/baseline=contradictory |
| Z09 same content from distinct sources | eligible A and B supply equal content once each | empty | corroboration, not duplicate occurrence; both sources retained |
| Z10 wrong-Q/side/context injection | three concrete bootstrap occurrences respectively carry wrong Q, wrong ParticipantSide, and wrong ExactTenantContext | {(002,Qh1),(004,Qh1),(005,Qh1),(011,Qh1),(012,Qh1),(016,Qh1),(025,Qh1)} | all injected sources remain classified and none can satisfy the slot |
| Z11 H-10 authentication rebound | valid content authentication for Producer A is offered as proof for Producer B | {(008,Qh1),(011,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1)} | source substitution=contradictory; H-10 cannot retarget the semantic source |
| Z12 IAA conclusion with missing baseline source | an attributed current M=U IAA conclusion claims coherent/unchanged while one required concrete baseline source is absent | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(025,Qh1),(029,Qh1),(030,Qh1)} | no positive baseline authority; coverage/binding unavailable |
| Z13 IAA conclusion against retained conflict | two direct sources conflict and the IAA claims coherent/unchanged | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1)} | conclusion consistency/baseline/coverage/binding=contradictory; IAA does not win |
| Z14 multi-source discovery-order equality | two implementations discover equal concrete candidates/occurrences in different orders | empty | identical source sets, multiplicity maps, composition, provenance, and decision |
| Z15 candidate omits actual unsafe attachment | candidate O10 attachments={SafeA}; complete owner actual={SafeA,ThreatB} | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1)} | independent universe includes ThreatB; complete-set equality fails |
| Z16 candidate omits independent ResourceObject | bounded source enumeration exposes ResourceObject R absent from candidate | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1)} | R generates a universe member/slot and baseline fails |
| Z17 candidate omits independent Channel | bounded source enumeration exposes Channel C absent from candidate | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1)} | C enters the universe and baseline fails |
| Z18 candidate omits K49 path | exact row owner exposes K49 path reaching O10 but candidate omits it | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1)} | row fact independently generates comparison; baseline fails |
| Z19 candidate omits whole environment category | universe requires the environment-membership domain but its exact source/projection is missing or inaccessible | {(012,Qh1),(018,Qh1,F03),(018,Qh1,F05),(018,Qh1,F14),(025,Qh1),(030,Qh1)} | required domain is unavailable, never empty; baseline non-authorizing |
| Z20 candidate empty, actual nonempty | candidate attachment projection={} and complete actual={A} | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1)} | complete-set inequality; baseline=contradictory |
| Z21 candidate nonempty, actual complete empty | candidate={A}; owner proves exhaustive actual={} | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1)} | complete-set inequality; baseline=contradictory |
| Z22 both complete empty | candidate={} and exact owner affirmatively proves exhaustive actual={} | empty | category equality succeeds; pass remains possible |
| Z23 member found on final expansion step | the last strict-growth step reveals extra bounded attachment R omitted by the candidate | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1)} | fixed point cannot freeze early; every clean-room universe includes R and baseline fails |
| Z24 complete-input discovery-order equality | equal semantic inputs arrive in different orders | empty | identical universe, slots, source populations, equality, provenance, reasons, and decision |
| Z25 provider/local candidate filter | otherwise coherent input offers a filter restricting baseline enumeration to candidate members | {(031,Qh1)} | filter has no authority and does not change the complete universe; evaluation is non-authorizing for the unknown token |
| Z26 omitted fact not repaired by later F | candidate omits an independently known fact that would not separately fail a later substantive predicate | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(025,Qh1)} | baseline still detects complete-set inequality; downstream predicate behavior is irrelevant |
| Z27 binding M<U generic-age misuse | binding conclusion uses M=U-59.999 seconds and attempts to import the X01/T01 pass vector | {(008,Qh1),(012,Qh1),(019,Qh1,F03),(019,Qh1,F05),(019,Qh1,F14),(024,Qh1),(029,Qh1),(031,Qh1)} | general-age is forbidden; causality=contradictory and binding cannot be current |
| Z28 clean positive bootstrap authority | exact-complete universe, all concrete sources retained/coherent, exact baseline, complete no-change population, one authoritative-current M=U/self-age IAA conclusion | empty | IAA positively authorizes only the bounded baseline-plus-continuity conclusion; underlying facts retain their owners |

Every Z01-Z28 reason set is complete for its isolated construction. Z01-Z14 close concrete source identity, cardinality, substitution resistance, and positive bounded IAA authority; Z15-Z26 close candidate-independent universe generation, total complete-set equality, and late-discovery invariance; Z27 closes generic-freshness case scoping; Z28 exercises the clean positive path. No Z case introduces ordinary SourceAttribution upstream, lets H-10 select a Producer, lets the candidate select verification extent, or lets the IAA rewrite a direct fact.

## 26. Complete human-decision matrix

The Recommended choice in every row below is the accepted H-13-S2 choice from Revision 14. All alternatives, consequences, recommendations, and reasons remain part of the decision record; no alternative or future extension is accepted unless a row expressly says so.

| Material choice | Meaningful alternatives | Security consequence | Privacy consequence | Operability/portability consequence | Recommended choice | Reason |
|---|---|---|---|---|---|---|
| concrete bootstrap source identity versus owner-class-only attribution | abstract owner class/domain only; ordinary SourceAttribution; distinct nonrecursive concrete ProducerIdentity/ProducerIncarnation coordinate | abstract attribution permits source substitution and hides ended/replaced sources; ordinary attribution creates recursion | concrete identity adds protected per-context linkage only inside the bounded evaluation and must not cross contexts | requires enrollment/lifecycle/source-enumeration integration but is implementation-neutral | require BindingBootstrapSourceCoordinate and exact eligibility on every bootstrap fact | factual owner class and concrete supplying source answer different security questions |
| multiple concrete bootstrap Producers for one owner domain | pick first/newest/preferred; deduplicate equal content; retain all with one composition rule | selection can suppress conflict; deduplication hides source cardinality | retaining all sources increases protected internal correlation but exports no new carrier | multiplicity and composition add bounded storage/validation cost | retain every source; distinct equal content corroborates, unequal content contradicts | equal sources are corroborators, not one occurrence; no source has implicit priority |
| bootstrap source replacement/incarnation semantics | normalize replacement to same source; inherit old attribution; distinct old/new coordinates | normalization lets a terminated source authorize later content | distinct incarnations limit unintended longitudinal aliasing | replacement requires new source eligibility, event evidence, and often rebuilt binding | treat every new incarnation as a distinct source and retain the transition | authentication and class/domain equality do not establish incarnation continuity |
| positive authority for baseline coherence plus continuity | direct facts alone imply absence; IAA owns all facts; bounded IAA measured conjunction over retained facts | absence without a bounded positive anchor is underauthorized; IAA factual takeover can suppress conflict | bounded conclusion exposes only the exact binding evidence scope | complete collection plus one current conclusion is demanding but portable | IAA authors only the bounded baseline-coherent-plus-post-B-continuous conclusion | accepted H-02 permits bounded measured authority without transferring factual ownership |
| candidate-independent baseline universe versus candidate-selected extent | candidate members select slots; provider filter; frozen independent universe before expected projection | candidate selection permits omission of unsafe attachments/resources/channels/paths | independent enumeration may retain more protected topology internally but need not export it | bounded full enumeration costs more and fails closed when incomplete | generate BindingBaselineUniverse from frozen Stage-B domains before candidate comparison | an object under verification cannot choose its own verification extent |
| complete-empty owner-domain semantics | missing means empty; candidate empty proves empty; direct owner affirmatively proves exhaustive empty set | missing-as-empty creates false equality and omission attacks | affirmative emptiness can avoid enumerating nonexistent members while retaining bounded proof semantics | requires owners to report completeness as well as values | accept empty only as present-exact-complete-empty-set from the exact owner | absence of evidence is not a complete empty domain |
| late-discovered baseline members and fixed-point closure | freeze at first pass; ignore late members; strict-growth expansion until equality | early freeze makes discovery order security-relevant and permits hidden members | deterministic bounded closure avoids provider-dependent privacy leakage patterns | may require additional finite expansion steps but has a closed termination bound | re-enter ExpandH13 for every new bounded member and freeze only at equality | equal semantic inputs must produce equal universes and decisions |
| binding baseline truth at B versus post-B continuity | treat allocation candidate as true; require post-B no-change only; prove cross-owner baseline at B plus post-B continuity | no-change alone can preserve a binding that was false from its start | baseline proof retains bounded protected topology at one cut but exports no new identity | exact owner corroboration adds state-at-B collection and may reduce availability | require exact-coherent ProducerSourceSurfaceBindingBaseline at B and complete zero-gap continuity over `(B,U]` | start-state correctness and later continuity are independent necessary conditions |
| exact direct owners required for baseline corroboration | producer-lifecycle owns all topology; IAA owns facts; exact existing owner plus concrete source per fact | owner consolidation lets one source suppress conflicts | projections disclose only bounded binding closure | multiple domains/sources and multiplicity add integration work | generate universe-derived slots under Section-11 owners and enumerate every concrete matching source | abstract ownership and concrete supply are both required; neither replaces the other |
| binding conclusion causal position relative to covered interval | generic 60-second freshness permits M<U; allow M after U; require exact semantic closure at the population end | early conclusions attest about future observations; late positions mismatch their carried cut | exact position equality adds no new carrier beyond M/U already required | equality is simpler to implement and audit than a second uncovered interval | require BindingConclusionCausality=exact-close with semantic M=U | a conclusion through U must be authored at that semantic closing position |
| M=U initial-profile rule versus separate conclusion-cut architecture | M=U; introduce C with `(B,C]` plus independently proven `(C,U]`; implementation-selected cut | a separate C creates another continuity interval whose gaps could be missed; implementation choice is underdefined | C adds protected temporal metadata | M=U rejects asynchronous attestations but has one closed interval and one time coordinate | use M=U for all initial profiles; reserve C for a separately reviewed extension | the bounded repair closes causality without multiplying cuts, invalidation, or provenance rules |
| local treatment of noncurrent IAA binding conclusions | fall through to continuous; rely only on reason 029; exhaustive local state mapping | fallthrough or reason-only repair can expose a falsely current primitive | explicit status mapping adds no new factual content | one total table is portable and testable across evaluators | map six historical/stale statuses to coverage=noncurrent and binding=noncurrent; map unavailable/indeterminate/contradictory exactly | lower-level security state must be correct before aggregation or reasons |
| retaining explicit noncurrent component states | collapse into unavailable; collapse into invalidated; retain noncurrent separately | collapsing can obscure whether authority existed but is no longer usable and invite accidental retries as current | status differentiation remains internal protected metadata | one extra enum branch improves diagnostics and conformance testing | retain noncurrent in coverage and binding-currentness vocabularies | historical/current-use failure is distinct from topology change, missing data, ambiguity, and contradiction |
| multi-fault precedence across baseline, owner change, gap, and history | first/newest; IAA-wins; aggregate reason decides state; closed semantic precedence | discretionary precedence can hide a positive change or baseline contradiction | deterministic state exposes no extra data beyond already retained faults | implementations can enumerate one finite table; additive reasons retain diagnostics | contradiction, then nonconflicting positive change, then noncurrent history, then gap, unavailable, indeterminate, and success | the security primitive remains deterministic while all independently true reasons survive |
| QualifiedPhysicalTimeDomain equality/comparability | implementation clock identifier equality; provider-declared equivalence; same-units heuristic; exact semantic structural equality | nonsemantic equivalence can authorize arithmetic across unrelated timelines | provider/global clock identifiers can become correlation carriers | exact equality rejects otherwise convertible sources but is representation-neutral | compare domains only by exact H-13 semantic structural equality | equal inputs must produce one comparison without choosing clocks or encodings |
| cross-domain time behavior | implicit conversion; provider/local offset mapping; freshest-looking display value; fail-closed no subtraction | conversions or guessed offsets can turn indeterminate age into fresh authority | mappings can expose clock topology and cross-domain correlation | no conversion reduces availability across heterogeneous time sources; a future profile can add reviewed semantics | unequal well-formed domains are indeterminate, conflicting equality is contradictory, and neither is numerically subtracted | initial profiles contain no reviewed cross-domain conversion authority |
| Producer intrinsic incarnation versus relational coupling | every coupling change rolls incarnation; never roll incarnation; closed intrinsic transition with Q-local relational invalidation | coupling-driven identity creates reverse dependencies; never-roll reuses evidence across real activation/mechanism replacement | unnecessary rollover increases linkability churn and retained history | global lifecycle evidence is Q-independent while relational re-evaluation stays Q-local | only activation restart/deactivation-reactivation or continuing-capability observation/report mechanism replacement ends ProducerIncarnation; K45/K49/coupling/scope/attachment changes invalidate affected Q-local results without allocating identity | upstream lifecycle and downstream derived coupling remain acyclic and semantically distinct |
| multi-Q Producer incarnation coherence | Q-specific ProducerIncarnation; first-Q wins; one Q-independent incarnation projected into all affected Q values | Q-specific identities let one physical lifecycle acquire inconsistent authority | extra Q-specific identity carriers increase permission-to-permission linkage | coherent projection may invalidate several Q evaluations after a real replacement | use one side-neutral namespace/incarnation equality across Q; invalidate only affected Q relational results, but project genuine replacement consistently | identical lifecycle evidence must yield identical Producer identity in every permission |
| O09/O10 binding temporal/current-use semantics | exact-complete allocation only; incarnation-current only; baseline-at-B plus continuous binding-event coverage/currentness | stale or initially false safe bindings can conceal a threat-controlled surface | current binding evidence adds protected local topology but no transferable identity | exact baseline, zero-gap coverage, and rebinding reduce availability after topology changes | establish at exact ProducerBindingStateCut, corroborate every direct-owner baseline projection, and require currentness through AuthorityUseCut | cardinality/current incarnation alone prove neither initial truth nor later continuity |
| E17/E15 binding-change event coverage | E17 lifecycle only; E15 attachment only; open implementation mapping; closed coordinated E07/E11/E14/E15/E17 meanings | omitted surface/mechanism/topology events let stale attribution survive | closed event families retain bounded protected topology/change metadata | multiple coordinated families increase monitoring and invalidation work | cover intrinsic mechanism/allocation/membership changes in E17, attachment changes in E15, and applicable control/resource/configuration effects in E07/E11/E14 | every binding-affecting cause must map deterministically to exact events and AffectedCoordinates |
| surface change with versus without intrinsic continuity break | every surface change rolls incarnation; no surface change rolls incarnation; distinguish mechanism discontinuity from relational allocation/topology change | always-roll creates reverse identity pressure; never-roll can retain stale mechanism authority | selective rollover minimizes new lineage while retaining protected change evidence | distinction requires lifecycle evidence plus binding rebuild but preserves stable Producers across attachment moves | intrinsic mechanism discontinuity creates a new incarnation and binding; attachment/topology-only change retains incarnation but invalidates/rebuilds binding | identity continuity and current surface allocation are separate security questions |
| Q-independent intrinsic Producer lifecycle versus permission-local ObservationScope | embed Q/ObservationScope in ProducerIntrinsicContinuity; fork one incarnation per Q; one global lifecycle node plus Q-local projections | embedding permission scope makes identical physical lifecycle depend on authorization and permits inconsistent incarnation forks | Q-specific identities add cross-permission carriers and churn; a global context-private identity adds no new cross-context carrier | global derivation plus local projection requires one additional provenance scope but avoids redundant lifecycle decisions | ProducerLifecycleEvaluationCoordinate and ProducerIntrinsicContinuity contain no Q or ObservationScope; each Q-local binding consumes the same global node | permission scope controls what may be observed, not whether the Producer activation/mechanism continued |
| exact intrinsic mechanism continuity/replacement rule | implementation interprets “same mechanism”; compare process/key/path/provider ID; exact allocated activation/mechanism incarnations and closed transition precedence | heuristic sameness enables clone/substitution or stale evidence reuse; over-eager replacement can mask conflicts through churn | provider/process identifiers increase linkability; opaque namespace values stay context-local | lifecycle owners must expose birth/end/replacement/order evidence; restarts and ambiguous concurrency reduce availability | use nonrecyclable activation/observation/report mechanism incarnations, exact capability bindings, and the Section 6.3 deterministic transition relation | equal lifecycle evidence must yield equal continuous/ended/replaced/unavailable/indeterminate/contradictory results |
| bootstrap binding-lifecycle evidence type | reuse canonical EventOccurrence; treat an IAA wrapper as raw fact; distinct owner-preserving BindingLifecycleObservation/CoverageStatement population | EventOccurrence reuse creates SourceAttribution recursion; IAA wrapper can erase direct-owner changes | distinct bootstrap objects retain bounded protected topology without exporting ordinary fact identity | a separate population adds types/cardinality checks but makes the dependency graph implementable | use BindingLifecycleOwnerSlot, BindingLifecycleDirectAttribution, BindingLifecycleObservation, CoverageStatement, and exact population | currentness needs nonrecursive raw change evidence with explicit owners, domains, positions, before/after state, and completeness |
| ordinary EventOccurrence versus binding-bootstrap event separation | alias the types; let either substitute; strict separation with downstream consistency check | aliasing lets an ordinary event authenticate the binding required by its own SourceAttribution | strict separation duplicates only bounded local change projections and creates no cross-context join | producers must emit/derive two semantic projections for overlapping changes | canonical EventOccurrence is always downstream of binding currentness; bootstrap observations are never ordinary event assertions; equal overlaps must agree | removes the SourceAttribution → currentness → EventOccurrence → SourceAttribution cycle without weakening ordinary event authority |
| direct-owner event authority versus bounded IAA conclusion authority | IAA owns all facts; direct facts alone authorize absence; direct owners/sources retain facts while IAA owns the bounded baseline-plus-continuity conclusion | factual takeover suppresses conflict; facts alone do not supply positive bounded absence authority | conclusion adds no carrier beyond its exact retained evidence scope | complete multi-source evidence plus one current conclusion is fail-closed | retain every owner/source; IAA authors only ProducerBindingContinuityMeasuredConclusion over exact universe/baseline/post-B population | positive measured authorship is not authorship of evidence and cannot rewrite a conflict |
| IAA binding-continuity conclusion currentness/history | cut coverage alone; 60-second freshness only; history only; fixed freshness plus separate H-11 qualification | omitting age permits replay; omitting history permits superseded/revoked/compromised/forked conclusions | scoped time/history values add no new global identifier | two independent gates reduce availability but reuse the existing rule | apply exact-domain half-open 60-second MeasuredConclusionUseFreshness and require authoritative-current HistoricalCurrentnessQualification | observation completeness, conclusion age, and authoritative history answer three different questions |
| conflict between IAA binding conclusion and direct-owner positive event | IAA-wins; newest/first wins; direct-owner change silently overrides; contradictory/non-authorizing | precedence can authorize stale bindings or hide a compromised conclusion/source | retaining conflict adds protected audit data but no new carrier | contradiction forces remeasurement/reconciliation | any positive owner change opposed by IAA unchanged is contradictory; no precedence | both claims cannot be true for the exact population/cut and neither authority may erase the other |
| missing owner evidence versus IAA absence claim | infer unchanged from IAA; infer unchanged from clean available shards; unavailable/indeterminate | absence inferred across an inaccessible owner domain permits change-and-reverse or suppressed-event bypass | failing closed avoids inventing observations about an unobserved domain | inaccessible shards/domain owners reduce availability | an IAA unchanged conclusion authorizes only with every generated owner slot continuously complete; missing/inaccessible evidence never becomes unchanged | the IAA is a bounded conclusion anchor, not a source of the underlying absence facts |
| profile catalogue | one parameterized profile; provider-defined profiles; finite closed catalogue | open/provider profiles allow silent weakening | provider meanings can change disclosure behavior | finite catalogue requires explicit evolution | exactly three Section 5 profiles | closed immutable meanings are reviewable and fail closed |
| both ParticipantSide values | selected side only; both sides | one-side checks miss cross-side sharing | both-side evaluation processes more protected facts | doubles evidence duties | require exact host-side and agent-side | Connection isolation is a pair property |
| exact H-02 tenant context | mandatory Workspace; null/sentinel; tagged absence/presence | wrong scope can authorize outside accepted governance | sentinels create cross-context link/collision risk | tagged union requires explicit branch handling | preserve exact Organization plus tagged Workspace presence/value | it is already accepted H-02 semantics |
| H-02 source-specific applicability consumption | one universal synthetic ceiling; omission-as-no-restriction; exact R8-10/R8-25/R8-15/R8-18 typed inputs | a universal shape invents authority fields and can admit denied, narrowed, stale, or wrong-scope use | typed branches avoid invented Workspace/global carriers | field-owner-specific integration and comparison add work | Section 13.1 exact typed projections plus H-13-owned intersection for R8-20/R8-20A | consumes only fields each accepted source actually owns and never defaults omission |
| content source authority versus historical/currentness qualification | generic H-02 authors both; content owner alone proves currentness; real content owner plus separate H-11-realized qualification | conflation lets stale/revoked/forked content authorize or gives generic H-02 nonexistent authorship | separation avoids a new global H-02 author/currentness carrier | exact owner attribution and qualification per subject/revision add integration work | Organization/Workspace/IAA/H-07 retain content authority; HistoricalCurrentnessQualification is separate and only authoritative-current passes | preserves accepted H-02/H-11 ownership and makes revocation/rollback fail closed |
| claimed interval versus authoritative-current applicability | claimed interval alone; ignore claimed interval; scope eligibility plus qualification | claimed time alone permits pre-application or replayed governance | immutable claimed fields need no new tracking carrier | two-stage comparison adds one qualification gate | claimed membership may yield scope-eligible only; applicable requires authoritative-current qualification | accepted H-02 says claimed time is not authority |
| two-stage H-02 to H-13 population | one verdict-independent fixed point; H-13 facts influence applicability; Stage A then Stage B | self-populating evaluation can omit denied audit inputs or let measurement create permission | rejected candidates remain audit-local without generating extra target data | Stage A must finish before Stage-B measurement enumeration | complete H02ApplicabilityPopulation first, then every and only authoritative applicable result seeds H13EvaluationPopulation | authority selection precedes measurement and no H-13 verdict controls permission |
| runtime identity source | provider/global ID; producer-local ID; IAA allocation | global/heuristic equality enables substitution/deduplication | global ID links contexts | IAA allocation requires lifecycle integration | IAA-scoped semantic allocation from eligible birth facts | aligns naming with bounded measured-fact authority |
| lineage/incarnation | one stable runtime ID; split continuity/current instance | stable ID reuses stale evidence after restart/restore/move | longer-lived ID increases linkage | split requires remeasurement | split RuntimeLineage and RuntimeIncarnation | current authority needs incarnation granularity |
| same-context identity reconciliation | provider-global ID; majority/newest observer; mutual IAA relation | unilateral/majority equality can merge different subjects | global correlator creates avoidable linkage | mutual conclusions need coordination | exact identity equality or current mutual same-physical relation | preserves both IAA namespaces and fails conflict closed |
| controller/resource cross-IAA comparison | infer from provider label; ignore; closed mutual equivalence | inference hides common control/resource; ignore misses sharing | provider label would expose global linkage | mutual comparisons add evidence cost | closed ControllerEquivalence/ResourceEquivalence states under equal context | separation/sharing must be decidable without identity rewriting |
| MeasurementTarget | allocated target ID; ordered list; structural set | allocated/ordered shortcuts can hide membership difference | stable target ID increases correlation | structural comparison may be larger | exact finite structural runtime set plus epoch/boundaries | H-13 needs meaning, not compact representation |
| target cardinality | singleton only; wildcard/dynamic set; exact finite one-to-many | wildcard can add unchecked runtimes | dynamic selectors reveal/merge changing subjects | finite closure supports multi-runtime products | one IsolationBoundaryPermissionRevisionIdentity to one exact nonempty finite target | complete enumeration with no primitive many-to-many |
| RuntimeCorrespondenceMeasuredConclusion | implementation-selected needed facts; open IAA property bag; closed RC01-RC11 result population | subset/open designs can omit membership, epoch, boundary, source, or contradiction checks | closed local propositions reveal no new cross-context value | eleven exact results and evidence dependencies increase evaluation volume | complete exact-once RC01-RC11 population with retained Producer attribution and proposition independence | H-13 owns one reviewable correspondence meaning while the IAA retains bounded measured authority |
| side/per-permission cardinality | one canonical IAA/target per side; arbitrary association; exact two-level bijection | canonical selection omits or misattributes applicable permissions | side-global IAA/target can over-link distinct authority scopes | exact occurrence families and bijections add evaluation volume | side-only SideEvaluationKey plus one exact PermissionEvaluationKey/PCE per ApplicablePermissionMember | supports any finite applicable set without privileging an IAA or target |
| H-02 registration projection | local alias/lifecycle token; IAA only; exact accepted Subject and immutable Revision identities | aliases can accept a superseded positive ceiling | new lifecycle carrier creates unnecessary linkability | exact projection requires H-02 integration | use OrganizationIAARegistrationSubjectIdentity and OrganizationIAARegistrationRevisionIdentity everywhere current equality matters | preserves accepted authority and leaves history realization to H-11 |
| MembershipEpoch | allocated epoch ID; compact commitment; structural closures | an ID can compare equal despite changed closure | persistent epoch carrier links observations | structural equality is more expensive | exact structural five-closure value | every security-relevant member/relation remains visible semantically |
| producer namespace | include ParticipantSide; provider-global; side-neutral per IAA/context/release | side-in-identity creates false independence; global names cross authority | global or cross-context names link tenants | side-neutral permits one physical observer for both sides | side-neutral within exact IsolationAttestationAuthorityIdentity/ExactTenantContext/release | identity and side-scoped observation are separate concerns |
| one producer observes both sides | forbid; merge observations; one identity with disjoint scopes | merging hides cross-side contradiction | merged scope leaks side facts | disjoint assertions are practical | one identity may emit separate exact side-scoped sets | avoids false producer duplication without merging sides |
| physical producer serves unequal contexts | reuse visible identity; forbid service; distinct context-private identities | reuse can transfer evidence/authority | reuse is a stable correlator | distinct enrollment/carriers add overhead | distinct semantic identities and carriers per context | preserves H-02 privacy floor |
| IAA nonrecursive Producer-independence anchor | Producer self-attestation; recursive fact eligibility; Trust/generic-H-02 conclusion; exact IAA-authored measured conclusion with separate freshness/history | self/recursive absence can prove itself; wrong authority transfers measured truth | IAA-local conclusion avoids a global Producer-control carrier | complete threat/influence populations, IAA attribution, freshness, and qualification add work | exact ProducerIndependenceMeasuredConclusion per proposition/Producer, then historical/freshness gates, coverage, and eligibility | one bounded measured authority breaks recursion while retaining all raw source attribution |
| IAA measured-content authority versus H-11 historical currentness | IAA proves both; H-11 authors measured content; IAA authors bounded content and H-11 realizes qualification | self-currentness permits replay; H-11 content authorship would usurp bounded measured authority | separate local qualification avoids exporting measured detail | requires two independent gates and failure handling | IAA authors RuntimeCorrespondence, Producer independence, source control, binding continuity, and local separation conclusions; H-13 owns freshness; only H-11-realized authoritative-current qualification permits use | authorship, freshness, and historical eligibility answer different questions |
| exact ProducerInfluenceThreatSet semantics | provider/operator label; IAA-selected traversal; open threat graph; closed finite structural least closure/path population | heuristics can omit a controller, transitive K49, K45 resource, or unresolved member and falsely prove outside-control | context-local structural facts avoid global provider/operator identifiers | exhaustive finite graph/path cells add measurement and provenance volume | Section 9.1 exact seeds, least closure, simple-path population, K45/K49 participation, K46 exclusion, and fail-closed completeness | equal semantic inputs must yield one threat set and one independence result |
| malicious or compromised IAA independence residual | claim solved; require multi-IAA consensus now; expose as accepted and acknowledged residual/future stricter profile | even a fresh authoritative-current IAA conclusion may lie, suppress evidence, or misclassify absence | stronger consensus would expose more cross-source metadata | multi-IAA evidence may be unavailable and is not accepted H-02 authority today | explicitly trust the exact qualified IAA conclusion for this bounded relation and require later H-10/H-11/deployment controls; keep future stricter profile open | semantic recursion is closed without pretending the remaining trust risk is solved |
| ProducerControlCoupling | operator-name heuristic; ignore; K45/K49 closure | heuristic/ignore overcounts independence; coupling-driven incarnation changes create a reverse authority dependency | explicit graph exposes only context-local relation | closure adds measurement work and Q-local invalidation after relation changes | coupled producers form one independence domain without allocating/replacing ProducerIncarnation | technical influence, not labels or identity rollover, determines independence |
| IAA/Producer separation | prohibit colocation; conflate roles; permit with separate evidence | conflation transfers authority; prohibition may not add real independence | separate identifiers limit disclosure | controlled colocation improves deployability | permit colocation only with distinct identity/class/scope/independence/lifecycle | preserves roles while remaining portable |
| finite ingress S06/S07/S08 | enumerate Internet actors; local endpoints only without catch-all; finite classes plus catch-all | missing catch-all creates false closure | no global remote identity collection is needed | finite local enumeration is implementable | retain S06/S07/S08 exact abstraction | complete path reasoning without unbounded identity inventory |
| subject/object/resource vocabularies | open extension; product types; S01-S12/O01-O11/13 resources | open types can bypass predicates | closed context-local types reduce raw disclosure | future mechanisms require reviewed evolution | retain closed vocabularies | unknown semantics fail instead of widening |
| fact model | generic isolation boolean; open properties; closed K/F model | generic/open facts omit paths and quantification | closed facts avoid provider-specific identifier disclosure | more facts must be measured | K01-K49 plus universally quantified F01-F16 | precise failure and closure are independently testable |
| K01-K49 relation ownership | first observer wins; composite authority; row-specific direct sources | authority substitution can invent/delete exposure | retained attribution limits inference to needed source | multiple owners complicate collection | retain complete type matrix and direct-source map | every fact has one deterministic semantic owner |
| K04/controller roles | K04 grants all power; open roles; four closed roles | broad roles hide bypass capability | closed roles avoid operator-label disclosure | multi-role union is implementable | structural K04 plus four exact role tokens/unions | reconciles topology with least semantic power |
| S03 observation-only | promote on power; ignore extra power; fail contradiction | promotion legitimizes escalation | exact S03 limits telemetry reach | failure may reduce availability | never promote; retain contradictory edge and fail | classification cannot repair capability |
| multi-producer closure | choose newest; vote; attributed mathematical union | precedence/voting can suppress direct facts | exact attribution avoids global aggregation | requires conflict handling | CombinedClosure with owner preservation and all conflicts | deterministic composition without authority transfer |
| K45 mutable sharing | provider label; open influence model; exact common-state conditions | mutable/common control is a direct isolation bypass | identification path can leak other workload/content | exact classification needs owner evidence | Section 11.2 exact read/write/identify/control test | closes the Revision 3 ambiguity |
| K46 capacity-only sharing | prohibit all; ignore; permit closed residual | permits timing/load/availability influence and possible aggregate side channel | aggregate contention may reveal activity but not identity/content under the rule | prohibition makes shared infrastructure impractical | permit only partitioned/shared under Section 11.3; exclusive forbids | explicit experimental residual with deterministic promotion to forbidden paths |
| cross-context detector authority | detector directly concludes; prohibit all correlation; detector evidence followed by IAA conclusion | detector positivity would usurp accepted IAA measured-fact authority; no correlation makes separation unknowable | detector is residual internal correlation risk and must expose no stable link | fresh per-IAA conclusions add work and can fail unavailable | non-authoritative private detector disposition, then exact-IAA-authored conclusion with separate H-13 freshness and H-11 authoritative-current qualification | makes F04 decidable without transferring authority |
| protected sensing reuse | copy prior conclusion; forbid all computation reuse; internal sensing reuse with fresh destination derivation | copied Connection/cut conclusion authorizes stale/wrong scope | copied conclusion/carrier links contexts/Connections | fresh destination evaluation costs work but permits safe cache use | internal sensing only; fresh destination source assertions, disposition, IAA conclusions/currentness, pairs, and F04 | preserves bounded optimization without reusing authority |
| cross-side separation | profile-specific runtime sharing; prohibit in all initial profiles | same runtime/boundary collapses isolation | strict separation avoids cross-side correlation | disallows some colocated products | require runtime/boundary separation for all profiles | safest initial experimental meaning |
| all-pairs F04 cardinality | sample one pair; compare IAA groups only; exact H times A permission pairs | sampling/group-only evaluation can miss one forbidden target pairing; exact Cartesian evaluation proves every cross-side permission pair | pair outputs remain protected and do not add stable carriers | worst-case pair count is quadratic H times A; one detector disposition/IAA conclusion per local group may be reused as an input inside the same Connection/cut, but each F04PairEvaluation remains exact and distinct | exact H times A F04PairKey and evaluation population | explicit worst-case growth buys complete cross-side separation without privileging one permission |
| physical co-residency | prohibit all; ignore; profile-specific | shared environment enlarges side-channel/common-mode risk | can expose aggregate activity | profile-specific rule supports commodity infrastructure | exclusive forbids; partitioned/shared permit only with all predicates | risk is explicit rather than hidden |
| permission-local event coverage | one Connection-wide authority set; side-wide set; exact set per permission | aggregate sets allow another side/permission's source or cut to cure a local gap | local ownership avoids unnecessary cross-permission correlation | separate slot/cardinality checks increase record volume | one exact PermissionEventCoverageSet per Q; Connection union is output-only | F12/F15/invalidation must follow the exact permission whose evidence can change |
| all initial event slots use independently-complete-source | provider/configuration selects; IAA selects; source-count branch; catalogue constant | selection or partial-source union can manufacture event absence | retaining all candidates increases local protected metadata but creates no cross-permission join | same-candidate full coverage may reduce availability and adds consistency checks | every E01-E17 slot in all three initial profiles is independently-complete-source; one qualified same candidate must cover the whole interval/domain | deterministic policy preserves multiple candidates without invented union authority |
| future collective event composition | silently add a token; reuse initial profile; new reviewed H-13 profile/decision | silent collective composition can hide gaps, allocation conflicts, and inconsistent order | new partition metadata may add correlation and retention | reviewed evolution costs design/review but permits distributed monitors | require a new decision closing partition identity/equality, authority, exhaustiveness, candidate relation, order/consistency, conflict, lifecycle, and provenance | the initial vocabulary intentionally contains no collective branch |
| ClosureStateCut excludes events | event-selected cut; joint event/closure fixed point; closure-only evidence cut | event feedback can move the cut past an unsafe change and circularly prove coverage | separation avoids retaining events as measurement-identity inputs | evaluator must complete closures before generating post-cut slots | derive cut only from ClosureCutEvidenceSet, then generate `(cut, AuthorityUseCut]` event populations | later events invalidate or require a new evaluation but never rewrite the present cut |
| event gap rule | resample only; tolerate gap; continuous-complete zero gap | unseen transient changes can bypass snapshot checks | event sources retain sensitive lifecycle metadata | zero-gap sources can be costly/unavailable | E01-E17 continuous-complete zero positive gap per permission slot | state equality after a gap cannot prove safety during it |
| monitoring gaps | configurable tolerance; under-freshness-window tolerance; zero positive gap | any tolerated gap permits change-and-reverse evasion | gap-tolerant history may conceal activity | zero-gap reduces availability | no positive event-observation gap | freshness cannot prove event absence |
| event/history realization | H-13 linked records; H-13 storage rules; semantics only | premature mechanics can leave semantic gaps | record designs may over-retain identifiers | deferral permits multiple implementations | H-13 defines order/coverage/failure; H-11 realizes history | respects ownership without leaving meaning open |
| currentness family separation | infer from Producer events; let content authors self-current; exact governance/IAA historical qualifications plus H-13 freshness, H-07 comparison, and events | conflation misses revocation/fork/replay or transfers authority between systems | separate scoped outcomes minimize disclosure and avoid a global currentness carrier | exact qualification/assertion cardinality adds records per subject/conclusion | retain distinct real-owner content, HistoricalCurrentnessQualification, H-13 freshness, H-07 currentness, and event families | missing/duplicate/injected/noncurrent inputs fail without allowing one source to acquire another's authority |
| exact measured-conclusion freshness calculation | point timestamp subtraction; configurable tolerance; closed uncertainty-interval calculation | rounding, negative ages, or threshold-straddling uncertainty can authorize an unresolved conclusion | qualified intervals disclose only bounded time information | interval arithmetic and common-domain qualification add evaluator work | derive one age interval and pass only when every possible age is at least zero and strictly below 60 seconds | closes boundary, order, and uncertainty discretion |
| one 60-second bound for every measured conclusion | per-class bounds; provider/IAA override; one H-13 catalogue constant | divergent or selectable bounds create downgrade paths between RuntimeCorrespondence, Producer independence, separation, source control, and binding continuity | one constant creates no class-specific timing carrier | a uniform strict bound may reduce availability for slower sources | use MeasuredConclusionMaximumAge=60 seconds for all five classes in all initial profiles | one nonselectable rule is reviewable and history-independent |
| measured freshness versus historical currentness | either gate cures the other; merge them; require both independently | freshness alone misses supersession/fork and history alone permits replay of old measurements | separate scoped results avoid a universal currentness token | two checks increase evidence volume and failure modes | require fixed H-13 freshness and H-11-realized authoritative-current history independently | the controls answer different questions and neither can infer the other |
| secondary negative-evidence source control | trust any different Producer; provider label; exact Q-scoped control classification | a target-controlled witness can falsely report absence and manufacture Producer independence | structural local classification avoids global operator labels | every negative source needs its own bounded conclusion/freshness/history | admit a negative primitive only from a distinct source outside the threat-control domain with a fresh authoritative-current IAA source-control conclusion | closes colluding or controlled-witness self-bootstrapping |
| exact Producer-to-O09/O10 surface binding | infer from labels; one generic Producer endpoint; exact observation/report allocation with current-use evaluation | ambiguous, stale, or cross-Producer surface ownership lets evidence be reassigned | separate observation/report surfaces remain permission-local protected metadata | cut-bound allocation, event coverage, and currentness add cardinality and monitoring checks | bind each relevant ProducerIncarnation exactly to its O09 observation and O10 report surfaces at ProducerBindingStateCut and require currentness through use | influence and attribution must reach the surface that actually emits current evidence |
| direct negative cells versus composite path absence | let a correlator own path absence; copy one source to the path; derive ownerless result from direct cells | magical composite ownership conceals missing edges and transfers factual authority | constituent attribution exposes only necessary local lineage | complete simple-path cell enumeration increases work | retain direct owner/source per primitive and give the derived path result no owner | path absence is a calculation over evidence, not a new observed fact |
| RelevantProducerSet(Q) population | P-specific relevance; verdict-selected sources; frozen inclusive Q-scoped occurrence union | filtered populations omit event-only, K49-only, technical, or late Producers and undercount coupling | one Q-local set avoids provider-global correlation | inclusive enumeration increases bounded pair cost | derive the exact set after Stage B freezes from every listed occurrence family, independent of verdict/order | equal inputs yield equal producer and pair populations |
| total Producer coupling pair population | implementation-selected applicable pairs; P-specific graph; all unordered pairs | omitted pairs can falsely establish independence or let an injected pair choose scope | structural unordered pairs add no allocated pair identifier | n(n-1)/2 state evaluations are quadratic | generate exactly one state for every unordered pair in RelevantProducerSet(Q), none outside, from one Q-scoped base graph | cardinality and acyclicity are explicit and hostile-testable |
| occurrence model | point only; open modes; three exact modes | point-only can overclaim duration | continuous modes retain more metadata | three modes support varied sensors | point, bounded-interval, continuous-series | exact validity meaning without representation choice |
| continued use of point/interval evidence | assume unchanged; event coverage only; coverage plus freshness | assumption or single control misses stale/transient state | shorter continued use reduces retained linkage | dual checks increase monitoring demand | continuous event coverage and strict age are both required | age and event absence prove different properties |
| runtime identity-ending lifecycle rules | preserve runtime identity through restart/move/restore; event-specific; always-new runtime lineage | preserving runtime incarnation reuses stale execution evidence | long-lived runtime identity increases linkability | new runtime incarnations force remeasurement | new RuntimeIncarnation for restart/restore/migration/host movement; clone also has new runtime lineage; Producer incarnation follows the separate intrinsic-continuity row | runtime execution identity ends whenever its physical/current continuity ends without conflating Producer coupling |
| freshness | event-only; configurable; fixed 60 seconds; synchronous-only | 60 seconds leaves bounded replay exposure | more frequent sampling processes more context data | fixed bound is portable but demanding | strict half-open under 60 seconds plus event coverage | deterministic accepted compromise |
| grace/offline authority | cached/grace; emergency; none | grace authorizes stale state | cached values prolong linkability | no grace reduces availability | no grace, stale-while-revalidate, or offline authority | isolation is a current narrowing gate |
| target-overlap classification | provider labels/resource sharing; open states; exact runtime/effective-boundary classifier | vague overlap can split risk components or create false governance equality | runtime/boundary-local comparison adds no K45/K46 correlation carrier | complete pair evidence and precedence cost work | six exact states with contradiction/incomplete/whole/partial/disjoint precedence | every pair has one deterministic risk classification |
| target overlap separate from K45/K46 | K45/K46 create target edges; K46 implies no shared resource; independent relation families | conflation treats shared capacity as target identity or hides mutable-sharing failure | separation avoids deriving identity from common infrastructure | K45/K46 remain separately evaluated by closures/events/F/profile | classify target overlap only from runtime/effective boundaries; allow target-disjoint with exact shared K46 ResourceObject | equality, mutable state, and capacity sharing are different security questions |
| shared-governance grouping | implementation-selected cliques; assumed equivalence components; deterministic overlap graph components | clique splitting or assumed transitivity can hide a missing/partial/indeterminate pair | structural components add no allocated group carrier | all unordered pairs in a connected risk component may be expensive and one bad pair fails the whole component | exact SameSideTargetOverlapGraph reachability components, indivisible all-pairs relation, no clique splitting | grouping is unique even when overlap is nontransitive or indeterminate |
| profile composition | arbitrary mix; inheritance; no initial composition | mixing predicates enables downgrade/omission | composed meanings can alter disclosure unnoticed | no composition requires new profile work | no initial composition; future flattened reviewed profile | every active profile has one complete meaning |
| message gates | selection implies exposure; no crossing; exact gated messages | selected interface alone cannot prevent bypass | gate limits content path but still processes messages | nine conditions constrain implementations | exact protocol-mediated channel with one structural pair | only closed dominated message paths are compatible |
| MediatedChannelPair | end-to-end identity; provider transport ID; structural pair | allocated identity may imply authority/reuse | transport/global ID can correlate sides/contexts | structural recomputation on change | one Section 16 definition, no identity/authority | removes conflicting definitions and undefined mediator |
| lower-evidence reuse | none; unchanged key only; provider-global; bounded same-context cross-IAA | broad reuse transfers stale/wrong authority; none wastes sensing | same-context linkage is accepted within Section 19; cross-context remains forbidden | bounded reuse improves cost/latency | Section 19 with fresh destination evaluation and mutual correspondences | preserves Revision 2 without reusing Connection decisions |
| reason model | first failure; open reasons; full set plus primary | first failure hides simultaneous faults | protected reasons may be sensitive and need public collapse | full evaluation costs more | closed 001-036 set and deterministic precedence | auditability without granting authority to precedence |
| provenance design | opaque log; cryptographic node IDs here; discretionary dependency graph; canonical structural grammar | opaque/cyclic/discretionary derivation can conceal missing or extra inputs | structural context-bound values avoid global commitment carriers | closed coordinate/dependency generation is larger; later encodings remain free | Section 22 exact node/value/scope/question/immediate-dependency grammar and derived edges | equal semantic inputs force equal candidate and inventory while realization stays H-10/D2 |
| dynamic provenance population | one fixed point including H-02 applicability; static Stage B; authoritative Stage A then bounded Stage-B fixed point | one mixed fixed point is dishonest about applicability selecting coordinates; static/discovery-order Stage B can omit late sources | both stage populations remain in their existing protected scopes | two inventories and bounded Stage-B expansion cost memory/time | freeze typed Stage A, seed every/only applicable Q, structurally expand Stage B, freeze, inventory both | equal raw inputs force equal authority selection and equal evaluation populations without H-13 feedback |
| derived evaluation identity | allocate evaluation/group/policy IDs; structural values only | stable IDs may be mistaken for transferable authority | stable IDs link cuts/Connections | structural outputs may be larger | no allocated identity for evaluation, target, epoch, pair, reuse, governance, or provenance | derived meaning is bound by its exact components |
| result completeness | assume omitted false checks; recursive completeness; precomputed inventory | omissions can create accidental pass | inventory contains no new cross-context identity | explicit false records cost space | nonrecursive RequiredDerivationInventory and reason 036 | closes fail-open output omissions |
| privacy surfaces | one provider-global namespace; ad hoc redaction; six closed surfaces | global identifiers become correlation/oracle paths | direct control of disclosure/linkability | context-private carriers increase enrollment/storage cost | Section 18 exact surface rules | preserves accepted H-02 privacy while keeping protected audit detail |
| unknown semantic evolution | implementation extension; silent widening; new reviewed meaning | silent new relations/profile rules can bypass gates | new fields can expand correlation | reviewed evolution is slower | unknown fails closed and requires new accepted decision/profile identity | no implementation discretion in security meaning |
| IAA measured-independence trust residual | claim solved; require two IAAs; one exact IAA-authored conclusion plus complete evidence, independent H-13 freshness, and H-11 authoritative-current qualification | a malicious IAA can lie or suppress influence evidence despite currentness | additional authorities/evidence increase protected observation footprint | one bounded IAA authority is deployable; multi-IAA consensus is not accepted upstream | accepted and acknowledged residual requiring later H-10/H-11/deployment controls; future stricter profiles remain separately reviewed and unaccepted | nonrecursive semantics expose rather than conceal the remaining authority-compromise risk |
| shared-controller residual | require distinct controller per side; permit closed shared controller | shared controller is a common-mode compromise path | shared operator may correlate sides | separation may be unavailable | permit only when all role/closure/path rules hold | explicit trusted-boundary residual, not implicit safety |
| source availability residual | fallback/cache; fail closed | fallback weakens current isolation | fallback retains stale data | fail closed reduces availability | unavailable required source is non-authorizing | availability cannot widen authority |
| detector-abuse residual | no controls; unrestricted global correlation; tightly bounded role | abuse can become an identity oracle | principal residual is internal correlation | access controls/monitoring are downstream work | accepted and acknowledged residual bounded by Section 12 plus later operational controls | minimum function is needed for safe separation detection |
| timing/load residual | claim absent; prohibit co-residency; propose closed K46 effects | denial/timing channel remains | aggregate activity may be inferred | acceptance enables shared infrastructure only within the closed rule | accepted and acknowledged residual only for partitioned/shared, never exclusive | explicit accepted tradeoff matches the profile purpose |
| H-10/H-11/D2 realization risk | treat later design as accepted now; separate hostile reviews | flawed realization can violate these semantics | representation/history may add stable carriers | separate gates add schedule cost | require later independently accepted artifacts | semantic acceptance must not pre-approve mechanics |

Changing any accepted recommendation can affect identity, closure, relation, privacy, result, or profile meaning and requires a reviewed revision. The accepted model contains no unresolved implementation-selectable H-13 semantic branch. Human acceptance of the entire matrix and its residual risks is recorded. Residual acceptance acknowledges bounded risk; it does not claim that a risk is solved or authorize downstream work.

## 27. Residual-risk register

The following residuals are not claimed solved:

| Residual risk | Bounded treatment | Acceptance status |
|---|---|---|
| an authoritative-current IAA conclusion can still be malicious, suppress evidence, or misclassify independence, source control, or binding continuity | candidate-independent universes, all concrete sources/multiplicity/conflicts retained, exact M=U, separate freshness/history, and fail-closed mappings prevent semantic override but do not make a compromised IAA honest; later trust/deployment controls or a stricter multi-authority profile may be required | accepted and acknowledged; not solved |
| a concrete bootstrap Producer or direct owner can be malicious, compromised, or suppress bounded enumeration members | multiple sources/conflicts are retained; missing/incomplete domains fail closed; no source preference exists; H-10/H-11 may authenticate/history-qualify evidence but this decision does not guarantee source honesty or discovery completeness outside the declared bounded domain | accepted and acknowledged; not solved |
| complete candidate-independent enumeration may expose or retain more protected topology internally | universes remain exact Q/context/side/binding scoped, structural, nonexporting, and subject to Section 18 projection; inability to collect safely is non-authorizing, not permission to shrink the universe | accepted and acknowledged; not solved |
| IAA/Producer colocation concentrates trust | distinct roles/identities/scopes, complete ProducerInfluenceThreatSet/evidence, and separately attributed/fresh/historically qualified IAA Producer-independence conclusions remain mandatory | accepted and acknowledged; not solved |
| one SupportingController can participate on both sides | every role/path remains visible; runtime/boundary equality remains forbidden | accepted and acknowledged; not solved |
| K46 permits aggregate timing/load/availability influence | closed effect class; no content/identity/control; exclusive forbids | accepted and acknowledged; not solved |
| protected detector holds limited internal correlation knowledge | minimum domains/output, no stable carrier/disclosure/authority, fail closed | accepted and acknowledged; not solved |
| zero-gap sources or currentness services may be unavailable | no fallback or cached authority | accepted and acknowledged; not solved |
| fixed 60-second bounds leave bounded replay exposure and may be operationally strict | the same nonselectable half-open bound applies independently to closure state and every measured conclusion, while continuous event populations protect mutable closure state; no grace/override exists | accepted and acknowledged; not solved |
| exact-equal QualifiedPhysicalTimeDomain availability may be operationally limited | unequal domains never authorize subtraction or provider conversion in the initial profiles; a separately reviewed future H-13 extension/profile is required for semantic conversion | accepted and acknowledged; not solved |
| O09/O10 allocation, universe enumeration, concrete source, baseline, or lifecycle evidence may be forged, suppressed, gapped, or realized incorrectly | frozen complete bounded enumeration, exact source identity/incarnation/eligibility/multiplicity, complete-set equality, post-B coverage, positive M=U bounded IAA conclusion, conflict rejection, exhaustive states, and literal currentness are required; H-10 authentication and H-11 evidence realization remain downstream | accepted and acknowledged; not solved |
| exact M=U binding conclusions may be operationally difficult for distributed evidence collection | initial profiles fail closed rather than permitting future-looking conclusions; any separate conclusion cut C and `(C,U]` continuity architecture requires a future reviewed semantic extension | accepted and acknowledged; not solved |
| closed vocabulary may omit a future mechanism | unknown semantics non-authorizing; reviewed new profile/decision required | accepted and acknowledged; not solved |
| distributed event monitoring cannot authorize by combining partial initial-profile sources | independently-complete-source requires one qualified complete candidate; future collective composition requires a new reviewed semantic profile/decision | accepted and acknowledged; not solved |
| later H-10/H-11/D2 realization may be flawed | each remains separately unauthorized and requires hostile review | accepted and acknowledged; not solved |

## 28. Audited downstream handoffs

H-10 later receives BindingBaselineUniverse/BindingLifecycleUniverse, every exact BindingBootstrapSourceCoordinate/eligibility/source population, raw multiplicity and complete-set semantics, the distinct bootstrap direct attributions, exact baseline/lifecycle populations, the bounded positive IAA conclusion, causality, and all retained Revision 12 identities/attributions/provenance. H-10 may authenticate that the already-named exact ProducerIdentity/ProducerIncarnation supplied exact content and may choose representation, keys, proofs, and commitments. It MUST NOT invent or select the source Producer, retarget A's proof to B, collapse incarnations, select the universe, treat missing as empty, prefer a source, let an IAA proof rewrite a conflict, depend on binding currentness to authenticate bootstrap evidence, alias bootstrap to ordinary SourceAttribution/EventOccurrence, choose M/U equality, or repair a failure.

H-11 later receives every exact bootstrap source identity/incarnation/lifecycle position, source replacement transition, universe/population/baseline, positive bounded IAA conclusion, M=U, freshness/history, zero-gap coverage, and retained Revision 12 event/currentness meanings. It owns evidence realization, current-head/history/revocation/compromise/rollback/fork/order mechanics and representations. It MUST NOT merge old/new sources, infer a missing source or complete empty domain, select a source/universe member, make candidate omission authoritative, author direct or IAA content, transfer direct facts to the IAA, choose baseline correctness or M/U equality, permit binding M<U under the general-age rule, change the 60-second bound, merge freshness/history, tolerate gaps, or turn noncurrent into authority.

D1 later owns final public requirement/error wording. D2 later owns schemas, member names, encodings, registries, fixtures, and vectors. No downstream owner may silently choose different identity, closure, relation, source, currentness, coverage, freshness, reuse, reason, provenance, privacy, or result meaning.

The protected audit retains every exact semantic content-source attribution, HistoricalCurrentnessQualification, threat-set membership/path fact, closure conflict, malformed relation edge, coverage gap, currentness/freshness comparison, detector disposition without forbidden detail, reason trigger, substantive state, provenance validation result, completeness result, and final structural evaluation. H-13 defines the authorization effect of qualification outcomes but does not revoke permission, mutate an IAA/Connection, send a public error, or define persistence.
