# H-13-S3 - Stage-B Evaluation Population Member Grammar and Fixed-Point Typing

## Accepted governance record

```text
STATUS=ACCEPTED
DECISION=H-13-S3
REVISION=5
SUPPLEMENTS=H-13-S2

ACCEPTED=YES
INTEGRATED=NO
ACCEPTANCE_DATE=2026-09-03
APPROVER=Lakshya Sharma (`lakshyasharma21103-crypto`)
ACCEPTED_REVISION=5

INDEPENDENT_HOSTILE_REVIEW=PASS
HUMAN_ACCEPTANCE_RECOMMENDED=YES
REVISION_6_REQUIRED=NO

BASELINE=origin/main@7c305de57f86efbad99b4dcc635d6ef49f820549

H02_S2_R11_AUTHORIZED=NO
H10_S2_AUTHORIZED=NO
H11_ISOLATION_SUPPLEMENT_AUTHORIZED=NO
D1_ISOLATION_SUPPLEMENT_AUTHORIZED=NO
D2_AUTHORIZED=NO
SCHEMA_WORK_AUTHORIZED=NO
IMPLEMENTATION_AUTHORIZED=NO
CONFORMANCE=NO
INTEROPERABILITY=NO
PRODUCTION_READINESS=NO
RELEASE_AUTHORIZED=NO
PROTOCOL_1_0=NO
```

---

## Acceptance and review record

- **Decision ID:** `H-13-S3`
- **Parent/supplement relationship:** H-13-S3 supplements accepted H-13-S2 - Experimental Isolation Coverage, Currentness and Lifecycle.
- **Title:** Stage-B Evaluation Population Member Grammar and Fixed-Point Typing
- **Status:** `ACCEPTED`
- **Accepted revision:** Revision 5
- **Human acceptance date:** 2026-09-03
- **Approver:** Lakshya Sharma (`lakshyasharma21103-crypto`)
- **Independent hostile review:** `PASS`
- **Review findings:** `BLOCKERS=0`, `MAJORS=0`, `MINORS=0`
- **Revision 6:** Not required and not created.
- **Accepted source SHA-256:** `2bb5d02c582dfa3166881729313a50b89c51a844817497ac7a10eac7f8731aca`
- **Accepted source size:** 111119 bytes
- **Accepted source line count:** 1623 LF-terminated lines

### Exact human acceptance statement

> I explicitly accept the H-13-S3 semantic decision in PROPOSED-H-13-S3 Revision 5.

That exact statement is the sole human semantic-acceptance authority for H-13-S3 Revision 5. It does not broaden acceptance beyond this decision or authorize any downstream work.

### Final independent hostile-review disposition

```text
H13_S3_R5_INDEPENDENT_HOSTILE_REVIEW=PASS

BLOCKERS=0
MAJORS=0
MINORS=0

H13_S3_REVISION_6_REQUIRED=NO
H13_S3_HUMAN_ACCEPTANCE_RECOMMENDED=YES
```

The hostile review did not itself create acceptance. Acceptance arose only from the separate explicit human act recorded above.

### Accepted scope, provenance, and transcription boundary

Acceptance is limited to the complete self-contained Revision 5 H-13-S3 semantic contract in Sections 1 through 16 below. H-13-S3 supplements H-13-S2 and does not reopen or replace accepted H-13-S2 semantics.

The canonical accepted source is the exact strict-UTF-8, LF-only Revision 5 artifact with SHA-256 `2bb5d02c582dfa3166881729313a50b89c51a844817497ac7a10eac7f8731aca`, 111119 bytes, and 1623 LF terminators. No rendered, chat-transcribed, reconstructed, or CRLF-transcoded copy was used.

The semantic body below preserves source Sections 1 through 16 in their original order and wording, except for the single mechanical governance-state conversion from "This proposal does not redefine RequiredNodeCoordinateSet" to "This accepted decision does not redefine RequiredNodeCoordinateSet." The source's proposal-only governance status, nonauthoritative self-review, artifact-delivery contract, governance flags, and proposal-classification marker are superseded by this accepted governance and review record. No semantic change is intended or authorized by that transcription.

Revision 5's repair history remains recorded as historical acceptance evidence. It does not reopen any finding or create authority beyond the accepted H-13-S3 scope.

### Repository-integration boundary

Repository integration is a separate act from hostile review and human semantic acceptance. The present branch, commit, and pull request record the already-accepted decision; they do not create acceptance or broaden its effect. `INTEGRATED=NO` remains in this record unless and until this exact reviewed record is merged into authoritative `main` and the resulting repository state is separately verified.

### Downstream nonauthorization boundary

This record does not authorize H-02-S2 Revision 11, H-10-S2, an H-11 isolation supplement, a D1 isolation supplement, D2, schema work, implementation, fixtures, vectors, conformance, interoperability, production readiness, publication, release, or Protocol 1.0. Repository integration does not change any of those `NO` flags.

H-02-S2 may later consume this accepted typing contract only through a separately authorized revision. H-10, H-11, D1, D2, representation, schema, implementation, and release work remain separate downstream acts and may not alter the accepted occurrence-family tags, lifecycle reference totality, owner-resolution behavior, Q-independent intrinsic-family identity, fixed-point typing, RequiredNodeCoordinateSet equivalence, termination bound, wrapper co-emission, or Stage-A/Stage-B ordering below.

---

# Accepted H-13-S3 semantic contract

## 1. Authoritative basis and review reconciliation

### 1.1 Accepted baseline

The authoritative repository baseline is origin/main at:

~~~text
7c305de57f86efbad99b4dcc635d6ef49f820549
~~~

The complete accepted inputs were reviewed at these exact blob identities:

| Accepted input | Blob |
|---|---|
| H-13 - Schema openness, extensions, and evolution | 9f217d9766da102887ea73320c2f068dc9afd891 |
| H-13-S2 - Experimental Isolation Coverage, Currentness and Lifecycle | b0b312a4f143daa1ae86f29a8c0e6bd07b223ca4 |
| H-02-S1 - Experimental Isolation Roles and Evidence Authority | 21604f71da8d0248980f959583dda170ae90bdb5 |
| H-07 - Connection lifecycle and scoped authority | cfae912d6303a57b194f6a1f3ca9e6c5137022ce |
| H-10 - Canonical bytes, digests, signatures, and proof profiles | d1ec222f0d842a5fc2fc2f2793b38a1eb21153d4 |
| H-11 - Revocation, anti-rollback, and historical verification | 06a68d13eecc0bc28b8d8ae790ac47f3cb16bdce |

Immediately before drafting, live `origin/main` was fetched. It resolved to `7c305de57f86efbad99b4dcc635d6ef49f820549`. The accepted H-13-S2 file was reachable from that tree at `protocol/decisions/H-13-S2-experimental-isolation-coverage-currentness-and-lifecycle.md` with exact blob `b0b312a4f143daa1ae86f29a8c0e6bd07b223ca4` and exact blob size 589513 bytes. The accepted semantics are unchanged and no upstream conflict exists.

Implementation behavior is not semantic authority.

### 1.2 Canonical local Revision 4 identity

The canonical local Revision 4 source is `C:\Users\PREDATOR\Desktop\PROPOSED-H-13-S3-REVISION-4.md`. It was verified before drafting:

| Property | Actual local value |
|---|---|
| SHA-256 | 155b200c5f4f66e5c7ad5b69e037bf16a5db6279ba5f022ce7a1282fb7687439 |
| bytes | 99647 |
| LF terminators | 1493 |
| strict UTF-8 decoding | yes |
| UTF-8 BOM | no |
| exactly one final LF | yes |
| CR bytes | 0 |
| NUL bytes | 0 |
| tab bytes | 0 |
| trailing-whitespace lines | 0 |
| common mojibake sequences | 0 |
| Markdown transport escapes | 0 |

The exact local bytes match the independently reviewed Revision 4 artifact. No rendered or chat copy was substituted.

### 1.3 Controlling independent Revision 4 review and complete reconciliation

Revision 5 accepts the controlling result:

~~~text
H13_S3_R4_INDEPENDENT_HOSTILE_REVIEW=FAIL
BLOCKERS=2
MAJORS=0
MINORS=0
~~~

Revision 5 repairs only those two blockers and their direct proof consequences. It preserves every sound Revision 4 construction, including the already-closed seed/dependency-wrapper repair and artifact-hygiene finding.

| Finding | Controlling status | Revision 5 disposition | Closing construction |
|---|---|---|---|
| R4_B_001_ACCEPTED_LIFECYCLE_OCCURRENCE_FAMILY_TAG_REDEFINED | BLOCKER | CLOSED | Sections 5, 9, 10, 11, and 14 use only the exact accepted Rule-7 tag `lifecycle` for every lifecycle-branch candidate; enrollment, ProducerClass, Q-local ObservationScope, and source-enumeration remain owner-native/source classifications only |
| R4_B_002_MALFORMED_LIFECYCLE_OCCURRENCE_DROPPED_BY_OWNER_UNIQUENESS_GATE | BLOCKER | CLOSED | Sections 5, 7, 9, 11, 12, 13, and 14 make R total over every accepted frozen lifecycle-branch candidate or placeholder before and independently of owner resolution |
| R3_B_001_LIFECYCLE_REFERENCE_DOMAIN_NOT_TOTAL | PARTIALLY_CLOSED_BUT_STILL_OPEN | CLOSED | the reference-domain theorem covers unique-owner, zero-owner, multi-owner, duplicate-owner, unavailable, indeterminate, and contradictory retained candidates |
| R1_M_001_REQUIRED_NODE_COORDINATE_EQUIVALENCE | REOPENED | CLOSED | Section 11 proves both inclusions without invented occurrence-family tags and without universal unique-owner resolution |
| R2_B_002_SEED_REQUIRED_DEPENDENCY_WRAPPERS_NOT_COEMITTED | CLOSED | CLOSED | Section 9 preserves atomic co-emission in P0 and every expansion iteration; no delayed Di(P) exists |
| R2_m_001_ARTIFACT_HYGIENE_NOT_PROVEN_BY_SUBMITTED_COPY | CLOSED | CLOSED | closure remains based on verification of the actual output bytes, not a rendered copy |

No finding outside this repair scope is reopened.

## 2. Preserved Revision 4 architecture

The following remains normative:

1. H13EvaluationPopulationMembers is a finite mathematical set.
2. Top-level order and multiplicity are absent.
3. Discovery route, rule number, pass number, arrival order, and discovery count do not participate in member identity.
4. Repeated discovery of one structurally equal member leaves one top-level member.
5. An accepted inner occurrence or candidate family retains its owner-defined multiplicity inside one member.
6. Top-level set equality neither deduplicates nor expands the inner family.
7. The Q-scoped lifecycle member added here is a structural consumer reference only. Any later H-02 reference classification or multiplicity rule is outside H-13.
8. StageAResolvedPopulation remains one nested aggregate boundary.
9. Only authoritative Stage-A result=applicable selects Stage B.
10. Rejected Stage-A candidates remain Stage-A audit/provenance inputs under accepted semantics and receive no Q-scoped authorization question.
11. The accepted 71-token ProvenanceNodeType domain is unchanged.
12. No H-02 Trust classifier and no H-10 or H-11 mechanism enters H-13-S3.
13. No allocated identity, provider, storage row, implementation class, representation, proof, signature, digest, or database coordinate participates in equality.

## 3. Pre-freeze/post-freeze causal boundary

### 3.1 Normative direction

Accepted H-13-S2 fixes the direction:

```text
Stage-A applicable set
  -> H13EvaluationSeedMemberSet
  -> P0
  -> monotone coordinate/raw-input expansion
  -> least fixed point
  -> frozen H13EvaluationPopulation
  -> RequiredNodeCoordinateSet and inventory
  -> substantive resolution
  -> reasons, states, provenance validation, completeness, and final result
```

The reverse edge does not exist:

```text
substantive resolution
  -/-> H13EvaluationPopulationMembers
```

For fixed H13EvaluationSeed and equal accepted pre-freeze raw/candidate inputs, changing only a post-freeze answer cannot change H13EvaluationSeedMemberSet, P0, any Pn, H13EvaluationPopulationMembers, fixed-point equality, or top-level cardinality.

### 3.2 Closed pre-freeze literal value domain

H13PreFreezeLiteralInputValue is exactly:

```text
H13PreFreezeLiteralInputValue =
  stage-b-applicable-input(
    exact H13RowCoordinate whose node class is h02-stage-b-applicable-input,
    exact Stage-A authoritative result=applicable
      H02IsolationApplicabilityProjection
  )
  | authoritative-h07-input(
      exact H13RowCoordinate whose node class is authoritative-h07-input,
      exact H07AuthoritativeConnectionInput
    )
```

No third branch exists. These two values are literal accepted inputs before Stage-B substantive resolution. StageAResolvedPopulation and the selected catalogue are separate aggregate constructors. Raw candidate families and explicit placeholders use the closed constructors in Sections 6 and 7.

### 3.3 Values prohibited from the fixed point

There is no semantic-value(N,V) constructor and no ValueMemberSet function in Revision 5. A row coordinate can belong to the planning population without its answer belonging to that population.

The following resolved values are post-freeze and cannot be top-level members merely because Section 22.2 defines their node coordinates:

- ProducerIntrinsicContinuity;
- RelevantProducerSet;
- ProducerSourceSurfaceBinding and currentness;
- BindingBaselineUniverse, BindingLifecycleUniverse, their populations, composition results, and verdicts;
- BindingBootstrapSourceEligibility and candidate-population verdicts;
- ProducerBindingContinuityMeasuredConclusion, causality, freshness, history/currentness, coverage, and binding currentness results;
- DirectCellResult and DerivedInfluencePathResult verdicts;
- coupling graph, pair-state, population, threat, source-control, admissibility, and ProducerIndependence results;
- RuntimeCorrespondence proposition results and resolved wrapper;
- observation, closure, relation, equivalence, overlap, governance, reuse, mediated-channel, and event-coverage results;
- QualifiedPhysicalTimeDomainComparison, derived age, freshness, and currentness results;
- F predicate results;
- semantic trigger results and SemanticReasonSet;
- PermissionCoverageEvaluation and SideEvaluation results;
- ProfileEvaluationState, CoverageState, SubstantiveCurrentUseDisposition, and SubstantiveGateDecision;
- provenance validation results, ResultCompletenessGate, and reason 036 result;
- final CurrentUseDisposition, IsolationGateDecision, and ConnectionIsolationEvaluation; and
- every other answer whose accepted dependency order resolves after Stage-B freeze.

Their accepted question coordinates remain formable where accepted H-13-S2 requires them.

## 4. Closed source-domain and boundary projections

H-13-S3 introduces only structural projections needed to type pre-freeze families. They contain accepted components, allocate no identity or lifecycle, and create no authority.

### 4.1 Direct fact domain class

H13DirectFactDomainClass is exactly:

```text
H13DirectFactDomainClass =
  subject-domain(
    exact SemanticSubjectCoordinate whose branch is
      subject(exact S01-S12 member)
  )
  | object-domain(
      exact SemanticSubjectCoordinate whose branch is
        object(exact O01-O11 member)
    )
  | resource-domain(
      exact ResourceObjectClass,
      exact SemanticSubjectCoordinate whose branch is
        resource(exact ResourceObject)
    )
  | channel-domain(
      exact SemanticSubjectCoordinate whose branch is
        channel(exact Channel)
    )
  | relation-domain(
      exact K01-K49 row,
      exact row source type,
      exact row target type,
      exact BindingLifecycleDirectOwner for that row
    )
  | event-domain(
      exact E01-E17 EventFamily,
      exact BindingLifecycleDirectOwner for that event row
    )
  | producer-surface-domain(
      exact ProducerSourceSurfaceCoordinate whose object class is O09 or O10
    )
  | producer-intrinsic-domain(
      exact ProducerIntrinsicInputClass
    )
```

ProducerIntrinsicInputClass is exactly:

```text
ProducerIntrinsicInputClass =
  activation-birth-end-restart
  | observation-mechanism-birth-end-replacement
  | report-mechanism-birth-end-replacement
  | intrinsic-capability-binding-add-remove-change
  | o09-allocation
  | o10-allocation
  | producer-lifecycle-direct-attribution
```

The relation-domain branch consumes only an accepted Section 11 K row and that row's exact source, target, and direct owner. The event-domain branch consumes only the accepted E01-E17 table. No open token, provider label, or implementation category extends either union.

### 4.2 Direct-source domain coordinate

The accepted EnumerationDomain fields are projected without the formerly unnamed equality slot:

```text
H13EnumerationStreamCoordinate = (
  exact ProducerIncarnation,
  exact ProducerClass,
  exact H13DirectFactDomainClass,
  producer-allocated non-recyclable domain value
)

H13DirectSourceDomainCoordinate = (
  exact ProducerClass,
  exact H13DirectFactDomainClass,
  exact H13EnumerationStreamCoordinate
)
```

Equality is componentwise. This is the H-13-S3 structural name for the source-domain components accepted H-13-S2 already requires. The producer-allocated domain value remains nonrecyclable and ends with its ProducerIncarnation. Two unequal K rows, event families, subjects, objects, resources, channels, producer surfaces, intrinsic classes, ProducerIncarnations, ProducerClasses, or domain values produce unequal coordinates.

### 4.3 Named source-boundary coordinate

H13SourceEnumerationBoundaryCoordinate is exactly:

```text
H13SourceEnumerationBoundaryCoordinate =
  observation-scope-boundary(
    exact ObservationScope,
    exact H13DirectSourceDomainCoordinate equal to the scope's
      typed direct-source projection
  )
  | producer-intrinsic-boundary(
      exact ProducerLifecycleEvaluationCoordinate,
      exact ProducerIntrinsicInputClass
    )
  | baseline-member-boundary(
      exact H13BaselineUniverseMemberCoordinate
    )
  | lifecycle-member-boundary(
      exact H13LifecycleUniverseMemberCoordinate
    )
  | bootstrap-owner-slot-boundary(
      exact H13OwnerSlotCoordinate
    )
  | protected-detector-boundary(
      exact ProtectedDetectorEvaluationKey,
      exact DetectorSourceDomain,
      exact protected domain owner,
      exact protected source scope
    )
```

The observation-scope-boundary uses the complete accepted ObservationScope, including PermissionScopeKey, ScopePurpose, EnumerationDomain, finite roots, included surfaces, exclusion boundary, direct-source projection, and ClosureStateCut. The other branches use the exact closed structural coordinates below. No free-form boundary value participates.

A separately Q-local ObservationScope remains in observation-scope-boundary and the Section 5 owner-native Q-local scope branch. It cannot be normalized into producer-intrinsic-boundary and cannot enter H13ProducerIntrinsicRawFamilyCoordinate.

### 4.4 Universe-member and owner-slot coordinates without verdict feedback

H13BaselineUniverseMemberCoordinate is the structural projection:

```text
H13BaselineUniverseMemberCoordinate = (
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
  exact structural owner-domain coordinate,
  projection shape =
    exact-scalar-or-tuple
    | exact-complete-finite-set
)
```

H13LifecycleUniverseMemberCoordinate is:

```text
H13LifecycleUniverseMemberCoordinate = (
  exact BindingLifecycleUniverseScope,
  EventFamily = E07 | E11 | E14 | E15 | E17,
  exact BindingLifecycleDirectOwner,
  exact structural owner-domain coordinate,
  derivation class =
    baseline-member(exact H13BaselineUniverseMemberCoordinate)
    | independently-enumerated-post-b-owner-domain
)
```

The structural owner-domain coordinate is exactly one of:

```text
H13OwnerDomainCoordinate =
  subject(exact S01-S12 member coordinate)
  | object(exact O01-O11 member coordinate)
  | resource(exact ResourceObject coordinate)
  | channel(exact Channel coordinate)
  | relation(
      exact K01-K49 row,
      exact RelationEdgeContent coordinate,
      exact row direct owner
    )
  | producer-surface(exact O09 or O10 ProducerSourceSurfaceCoordinate)
  | producer-intrinsic(
      exact ProducerLifecycleEvaluationCoordinate,
      exact ProducerIntrinsicInputClass
    )
```

H13OwnerSlotCoordinate is:

```text
H13OwnerSlotCoordinate =
  baseline-owner-slot(
    exact BindingBaselineUniverseScope,
    exact H13BaselineUniverseMemberCoordinate,
    exact BindingLifecycleDirectOwner
  )
  | lifecycle-owner-slot(
      exact BindingLifecycleUniverseScope,
      exact H13LifecycleUniverseMemberCoordinate,
      exact EventFamily and BindingLifecycleDirectOwner
    )
```

These coordinates exclude BindingBaselineUniverse, BindingLifecycleUniverse, their verdicts, source-population verdicts, baseline equality/verdict, post-B population verdict, IAA conclusion, causality, freshness, currentness, F, reason, and result values. A wrapper is generated in the same step as its underlying accepted coordinate and cannot create a result-driven iteration.

### 4.5 Pre-freeze bootstrap source candidate coordinate

Raw source grouping must not depend on later ProducerIntrinsicContinuity or BindingBootstrapSourceEligibility results. H13BootstrapSourceCandidateCoordinate is exactly:

```text
H13BootstrapSourceCandidateCoordinate = (
  exact H13OwnerSlotCoordinate,
  exact source ProducerIdentity,
  exact source ProducerIncarnation,
  exact ProducerClass,
  exact H13DirectSourceDomainCoordinate,
  exact BindingLifecycleDirectOwner,
  exact BindingBootstrapFactualRole =
    baseline-state-at-B | post-B-binding-lifecycle,
  exact H13EnumerationStreamCoordinate,
  exact ProducerLifecycleEvaluationCoordinate for the source ProducerIdentity
)
```

The later accepted BindingBootstrapSourceCoordinate and eligibility result may reference this pre-freeze candidate coordinate. They do not define its raw family identity.

When the same bootstrap C participates in both the accepted `lifecycle` branch and the accepted `bootstrap` Rule-7 branch, the two exact Q-scoped coordinates are projections of that one owner-native source occurrence. A successful unique-owner resolution identifies the existing bootstrap-source-family for C's slot and bootstrap-owner-slot-boundary; zero-owner or multi-owner resolution does not delete either required coordinate. H13BootstrapSourceCandidateCoordinate and its multiplicity are never copied or changed.

## 5. Exclusive Q-independent producer intrinsic ownership

### 5.1 One coordinate

H13ProducerIntrinsicRawFamilyCoordinate is exactly:

```text
H13ProducerIntrinsicRawFamilyCoordinate = (
  exact ProducerLifecycleEvaluationCoordinate,
  exact ProducerIntrinsicInputClass
)
```

It contains no PermissionEvaluationCoordinate, PermissionScopeKey, ObservationScope, Q-local binding, Q-local surface-currentness result, event, coupling, threat, source-control, direct-fact result, F, reason, or final result.

Exactly one constructor owns:

- ProducerIntrinsicLifecycleDirectAttribution occurrences;
- activation birth/end/restart occurrences;
- observation-mechanism birth/end/replacement occurrences;
- report-mechanism birth/end/replacement occurrences;
- intrinsic capability-binding add/remove/change occurrences;
- accepted Q-independent O09 allocation inputs; and
- accepted Q-independent O10 allocation inputs.

### 5.2 Closed nonintrinsic producer-lifecycle owner-native input coordinate

Accepted H-13-S2 separates intrinsic lifecycle evidence from producer-lifecycle-owned enrollment, class, Q-local ObservationScope, surface, coupling-cell, and source-enumeration inputs. The following dependent subset names the nonintrinsic owner-native families already required by the accepted seed; it creates no new factual owner:

```text
H13ProducerLifecycleOwnerNativeRawInputCoordinate =
  enrollment(
    exact accepted Producer enrollment candidate coordinate C,
    exact source ProducerIdentity and ProducerIncarnation,
    exact H13DirectSourceDomainCoordinate D,
    exact H13SourceEnumerationBoundaryCoordinate B that enumerates C
  )
  | producer-class(
      exact accepted ProducerClass candidate coordinate C,
      exact source ProducerIdentity and ProducerIncarnation,
      exact ProducerClass,
      exact H13DirectSourceDomainCoordinate D,
      exact H13SourceEnumerationBoundaryCoordinate B that enumerates C
    )
  | q-local-observation-scope(
      exact accepted scope candidate coordinate C,
      exact PermissionEvaluationCoordinate Q,
      exact ProducerIncarnation P,
      exact ObservationScope S for P at Q,
      exact H13DirectSourceDomainCoordinate D equal to S's direct-source projection,
      exact observation-scope-boundary(S,D)
    )
  | source-enumeration(
      exact accepted source-enumeration candidate coordinate C,
      exact source ProducerIdentity and ProducerIncarnation,
      exact H13DirectSourceDomainCoordinate D,
      exact H13SourceEnumerationBoundaryCoordinate B that enumerates C
    )
```

The four constructor branches are owner-native source classifications, not occurrence-family tags. C, D, and B must already be the exact accepted seed or bounded-expansion coordinates; an implementation cannot choose, synthesize, or retag them. The Q field occurs only in the Q-local ObservationScope branch. ObservationScope is forbidden from the intrinsic coordinate in Section 5.1.

### 5.3 Closed owner-reference codomain and total fail-closed resolution

H13ProducerLifecycleOccurrenceOwnerReference is exactly:

~~~text
H13ProducerLifecycleOccurrenceOwnerReference =
  raw-family-owner(
    exact H13RawInputFamilyCoordinate D,
    exact reference to the existing raw-input-family(D,F)
  )
  | placeholder-owner(
      exact H13PreFreezePlaceholderCoordinate D,
      exact reference to the existing pre-freeze-placeholder(D,V)
    )
~~~

It is a coordinate reference only. F and V are not copied into the reference.

The closed candidate-owner classification table is:

| Retained accepted C classification | Candidate owner reference contributed when that classification matches |
|---|---|
| ProducerIntrinsicLifecycleDirectAttribution occurrence | raw-family-owner(producer-intrinsic-family(L)) for the exact matching L |
| activation birth/end/restart occurrence | raw-family-owner(producer-intrinsic-family(L)) for the exact matching L |
| observation-mechanism birth/end/replacement occurrence | raw-family-owner(producer-intrinsic-family(L)) for the exact matching L |
| report-mechanism birth/end/replacement occurrence | raw-family-owner(producer-intrinsic-family(L)) for the exact matching L |
| intrinsic capability-binding add/remove/change occurrence | raw-family-owner(producer-intrinsic-family(L)) for the exact matching L |
| accepted Q-independent O09 allocation input | raw-family-owner(producer-intrinsic-family(L)) for the exact matching L and o09-allocation class |
| accepted Q-independent O10 allocation input | raw-family-owner(producer-intrinsic-family(L)) for the exact matching L and o10-allocation class |
| nonbootstrap Producer enrollment candidate | raw-family-owner(raw-node-family(producer-lifecycle-owner-native-input(enrollment(C,...)))) |
| nonbootstrap ProducerClass candidate | raw-family-owner(raw-node-family(producer-lifecycle-owner-native-input(producer-class(C,...)))) |
| separately Q-local ObservationScope candidate | raw-family-owner(raw-node-family(producer-lifecycle-owner-native-input(q-local-observation-scope(C,Q,P,S,D,B)))) |
| nonbootstrap source-enumeration candidate | raw-family-owner(raw-node-family(producer-lifecycle-owner-native-input(source-enumeration(C,...)))) |
| Q-local O09 surface-allocation candidate | raw-family-owner(raw-node-family(q-producer-candidate-occurrence-input(Q,q-local-observation-surface(S),C))) for exact O09 ProducerSourceSurfaceCoordinate S |
| Q-local O10 surface-allocation candidate | raw-family-owner(raw-node-family(q-producer-candidate-occurrence-input(Q,q-local-report-surface(S),C))) for exact O10 ProducerSourceSurfaceCoordinate S |
| raw K45 coupling-candidate cell used as lifecycle-owned input | raw-family-owner(raw-node-family(q-producer-candidate-occurrence-input(Q,k45-candidate(K),C))) for exact K45 DirectAbsenceCellCoordinate K |
| raw K49 coupling or producer-identity candidate cell used as lifecycle-owned input | raw-family-owner(raw-node-family(q-producer-candidate-occurrence-input(Q,k49-candidate(K),C))) for exact K49 DirectAbsenceCellCoordinate K |
| bootstrap enrollment/class/domain/scope/lifecycle/source-enumeration candidate for one owner slot | raw-family-owner(bootstrap-source-family(slot,bootstrap-owner-slot-boundary(slot))) |
| unavailable/indeterminate intrinsic input | placeholder-owner(producer-intrinsic-placeholder(L)) |
| unavailable/indeterminate nonbootstrap enrollment/class/Q-local-scope/source-enumeration input | placeholder-owner(raw-node-placeholder(producer-lifecycle-owner-native-input(exact matching branch))) |
| unavailable bootstrap lifecycle/source input | placeholder-owner(bootstrap-source-placeholder(slot)) |

The ellipses abbreviate only the exact fields already enumerated in H13ProducerLifecycleOwnerNativeRawInputCoordinate. No field is optional or implementation supplied. For well-formed owner-resolvable C, exactly one row occurrence matches. A retained malformed or contradictory C may match zero row occurrences or more than one row occurrence. The table does not normalize such C into a well-formed candidate.

Formally:

~~~text
H13ProducerLifecycleOccurrenceOwnerMatch(C) = (
  exact matching table-row coordinate,
  exact H13ProducerLifecycleOccurrenceOwnerReference yielded by that row
)

H13ProducerLifecycleOccurrenceOwnerMatchFamily(C) =
  exact finite retained occurrence family of every
  H13ProducerLifecycleOccurrenceOwnerMatch(C),
  preserving equal duplicate row matches

H13ProducerLifecycleOccurrenceOwnerCandidateSet(C) = {
  O
  | some match occurrence in
      H13ProducerLifecycleOccurrenceOwnerMatchFamily(C)
    yields O
}

H13ProducerLifecycleOccurrenceOwnerResolution(C) =
  unique-owner(exact O)
    when cardinality(H13ProducerLifecycleOccurrenceOwnerMatchFamily(C)) = 1
  | no-unique-owner
    when cardinality(H13ProducerLifecycleOccurrenceOwnerMatchFamily(C)) = 0
  | multiple-owner-candidates(
      exact H13ProducerLifecycleOccurrenceOwnerMatchFamily(C),
      exact H13ProducerLifecycleOccurrenceOwnerCandidateSet(C)
    )
    when cardinality(H13ProducerLifecycleOccurrenceOwnerMatchFamily(C)) > 1
~~~

The occurrence-family cardinality, rather than only set cardinality, makes two equal duplicated owner matches classify as multiple-owner-candidates. Unequal competing owners also classify there. The result is total and structural for every retained C. It never invents an owner and has no first, newest, preferred, configured, provider, IAA-selected, or implementation-selected branch.

A unique-owner result supplies the exact existing owner reference. A no-unique-owner or multiple-owner-candidates result supplies no selected owner. Both failure results retain the exact match evidence, remain malformed, contradictory, unavailable, or indeterminate as accepted semantics requires, and are non-authorizing.

### 5.4 Total Q-scoped accepted-lifecycle occurrence/reference coordinate

The accepted Rule-7 Producer occurrence-family tag domain remains exactly:

~~~text
direct | event | lifecycle | bootstrap | K45 | K49 | surface |
source-control | closure | technical | late
~~~

Revision 5 adds no tag. In particular, enrollment, class, scope, source-enumeration, intrinsic lifecycle, bootstrap ownership, surface ownership, and K45/K49 ownership are source or owner-native classifications. They are never substituted for an accepted Rule-7 occurrence-family tag.

For Q, define the accepted lifecycle branch domain:

~~~text
AcceptedProducerLifecycleOccurrenceCandidateDomain(Q) = {
  C
  | C is an exact raw candidate in the accepted lifecycle branch of
      FrozenStageBProducerOccurrenceFamily(Q),
    including intrinsic lifecycle, enrollment, ProducerClass,
      Q-local ObservationScope, source-enumeration, bootstrap,
      surface-allocation, K45/K49 lifecycle-owned, malformed,
      contradictory, duplicate, late, or other accepted retained C;
    or C is that branch's exact accepted unavailable or
      indeterminate placeholder coordinate
}
~~~

H13QScopedProducerLifecycleOccurrenceReferenceCoordinate is exactly:

~~~text
H13QScopedProducerLifecycleOccurrenceReferenceCoordinate = (
  exact PermissionEvaluationCoordinate Q,
  exact accepted occurrence-family tag = lifecycle,
  exact C in AcceptedProducerLifecycleOccurrenceCandidateDomain(Q)
)
~~~

R is legal solely from Q, the exact accepted `lifecycle` branch, and C's membership in that accepted frozen branch domain. Owner uniqueness is not a precondition. H13ProducerLifecycleOccurrenceOwnerResolution(C) is a later closed structural interpretation of the already-retained C and is not a component of R identity.

Define:

~~~text
H13ProducerLifecycleOccurrenceReferenceNodeCoordinate(R) =
  the accepted Section 22.2 producer-candidate-occurrence coordinate at
  permission-scope(R.Q), with exact occurrence-family tag lifecycle and
  exact raw candidate or placeholder coordinate R.C
~~~

This function allocates no NodeSemanticCoordinate. It selects the already-required accepted coordinate `producer-candidate-occurrence(lifecycle,C)`. It is injective over legal R because Q, the fixed accepted tag, and C are exact.

If the same C also participates in another accepted Rule-7 branch, such as bootstrap, surface, K45, or K49, that other branch independently yields its exact accepted branch-tagged coordinate. The `lifecycle` coordinate and the other accepted coordinate remain distinct. No raw occurrence is copied, no branch is collapsed, and no new tag is created.

The reference-domain and resolution-totality theorem is:

~~~text
for every Q and every C in
AcceptedProducerLifecycleOccurrenceCandidateDomain(Q):
  there exists exactly one legal R = (Q,lifecycle,C);
  H13ProducerLifecycleOccurrenceReferenceNodeCoordinate(R) exists;
  H13ProducerLifecycleOccurrenceOwnerResolution(C) yields exactly one
    structural result in {
      unique-owner,
      no-unique-owner,
      multiple-owner-candidates
    }

owner-resolution result never controls existence of R or its node coordinate
~~~

For a unique-owner result, the exact owner reference exists. For zero owner, R and the accepted occurrence coordinate still exist and no owner is guessed. For multiple or duplicate owner matches, R and the coordinate still exist and no owner is selected. Contradiction or ambiguity remains visible and non-authorizing.

R, its node coordinate, and the resolution result own no source payload, change no raw-family multiplicity, allocate no ProducerIdentity or ProducerIncarnation, create no ProducerIntrinsicContinuity or lifecycle allocation, and add no factual authority. Q participates only in R and in an owner-native coordinate whose accepted semantics are already Q-local. An intrinsic raw family remains Q-independent; Q-local ObservationScope remains Q-local.

### 5.5 Closed Q-scoped producer-use classes

H13QScopedProducerOccurrenceUse is exactly:

~~~text
H13QScopedProducerOccurrenceUse =
  direct-fact(exact DirectSemanticPropositionCoordinate)
  | event-source(exact PermissionEventRequirementSlot)
  | producer-lifecycle-reference(
      exact H13QScopedProducerLifecycleOccurrenceReferenceCoordinate
    )
  | binding-bootstrap(exact H13OwnerSlotCoordinate)
  | k45-candidate(exact DirectAbsenceCellCoordinate)
  | k49-candidate(exact DirectAbsenceCellCoordinate)
  | q-local-observation-surface(exact ProducerSourceSurfaceCoordinate)
  | q-local-report-surface(exact ProducerSourceSurfaceCoordinate)
  | absence-source-control(exact AbsenceSourceControlCoordinate)
  | producer-closure(exact ProducerClosureCoordinate)
  | technical-influence(exact ProducerIndependenceCoordinate)
  | late-q-source(
      exact H13DirectSourceDomainCoordinate,
      exact H13SourceEnumerationBoundaryCoordinate
    )
~~~

The lifecycle use names total R. Each non-lifecycle use retains its exact accepted Rule-7 tag and construction. Enrollment, ProducerClass, Q-local ObservationScope, and source-enumeration C values enter the lifecycle use through `producer-candidate-occurrence(lifecycle,C)`; none defines an occurrence-family tag. The lifecycle reference remains a dedicated top-level member and is forbidden from raw-node-family.

### 5.6 Exclusivity, multiplicity, and authority law

An intrinsic lifecycle occurrence family is legal only under `producer-intrinsic-family(L)`. It is forbidden under another raw-family constructor. A nonintrinsic owner-native family is legal only in its exact row of Section 7. No candidate may be reassigned to the intrinsic row merely because producer-lifecycle owns its factual domain.

`q-scoped-producer-lifecycle-reference(R)` carries only Q, the fixed accepted `lifecycle` tag, and C. The member carries no H13AcceptedRawFamily, owns no occurrence family, supplies no direct factual evidence, and cannot add, remove, reorder, or duplicate an owner family's inner occurrences. Adding or deleting a Q reference changes neither the underlying raw occurrence nor its multiplicity.

A unique-owner resolution references one existing owner. A no-unique-owner or multiple-owner-candidates resolution selects no owner. None of the three results changes R identity or existence. Malformed owner resolution cannot delete C, R, or the accepted lifecycle producer-candidate-occurrence coordinate.

One intrinsic raw family used by Q1 and Q2 remains one family. Neither Q nor ObservationScope may enter H13ProducerIntrinsicRawFamilyCoordinate or ProducerIntrinsicContinuity. One raw C may participate in several accepted Rule-7 branch projections without source duplication. R matches no raw-family row.

## 6. Closed raw-input node subset and raw-family grammar

### 6.1 Raw-input-capable node coordinate

H13RawInputNodeCoordinate is exactly this dependent subset of accepted NodeSemanticCoordinate:

```text
H13RawInputNodeCoordinate =
  historical-currentness-qualification-input(
    exact Stage-B IAA HistoricalCurrentnessSubject,
    exact AuthorityUseCut
  )
  | iaa-runtime-correspondence-input(
      exact permission-scope Q runtime-correspondence coordinate
    )
  | iaa-local-separation-input(
      exact side-scope LocalIAASeparationKey coordinate
    )
  | q-producer-candidate-occurrence-input(
      exact permission-scope Q,
      exact H13QScopedProducerOccurrenceUse whose branch is not
        producer-lifecycle-reference,
      exact raw candidate coordinate
    )
  | producer-lifecycle-owner-native-input(
      exact H13ProducerLifecycleOwnerNativeRawInputCoordinate
    )
  | baseline-direct-input(
      exact H13OwnerSlotCoordinate whose branch is baseline-owner-slot,
      exact H13BootstrapSourceCandidateCoordinate
    )
  | lifecycle-direct-input(
      exact H13OwnerSlotCoordinate whose branch is lifecycle-owner-slot,
      exact H13BootstrapSourceCandidateCoordinate
    )
  | iaa-binding-continuity-input(
      exact PermissionEvaluationCoordinate,
      exact ProducerIncarnation,
      exact ProducerBindingStateCut,
      exact AuthorityUseCut
    )
  | direct-producer-fact-input(
      exact DirectSemanticPropositionCoordinate,
      exact source ProducerIncarnation
    )
  | iaa-absence-source-control-input(
      exact AbsenceSourceControlCoordinate
    )
  | iaa-producer-independence-input(
      exact ProducerIndependenceCoordinate
    )
  | protected-detector-source-input(
      exact ProtectedDetectorEvaluationKey,
      exact DetectorSourceDomain,
      exact protected domain owner,
      exact protected source scope
    )
  | observation-occurrence-input(
      exact ObservationOccurrenceCoordinate
    )
  | producer-closure-assertion-input(
      exact ProducerClosureCoordinate
    )
  | relation-edge-input(
      exact RelationEdgeContent candidate coordinate,
      exact ObservationOccurrenceCoordinate,
      exact direct ProducerClosureCoordinate
    )
  | event-coverage-assertion-input(
      exact EventCoverageAssertionCoordinate
    )
  | qualified-time-input(
      exact owning EvaluationScope,
      exact semantic state position
    )
```

Each branch maps injectively to the exact accepted Section 22.2 NodeSemanticCoordinate for its named node class and QuestionKey. No f-predicate, trigger, reason, state, coverage result, side result, provenance result, completeness result, gate decision, or arbitrary NodeSemanticCoordinate belongs to this subset.

The lifecycle reference branch is intentionally absent. Its accepted producer-candidate-occurrence node coordinate is produced by H13ProducerLifecycleOccurrenceReferenceNodeCoordinate and its population member is the Section 8 reference constructor. It cannot be converted into a raw-node-family. The separate producer-lifecycle-owner-native-input branch owns only the accepted nonintrinsic raw family named by its closed coordinate; it is not a Q-scoped occurrence projection.

### 6.2 Complete raw-family coordinate

H13RawInputFamilyCoordinate is exactly:

```text
H13RawInputFamilyCoordinate =
  raw-node-family(exact H13RawInputNodeCoordinate)
  | producer-intrinsic-family(
      exact H13ProducerIntrinsicRawFamilyCoordinate
    )
  | baseline-enumeration-family(
      exact H13BaselineUniverseMemberCoordinate,
      exact H13SourceEnumerationBoundaryCoordinate whose branch is
        observation-scope-boundary or baseline-member-boundary
    )
  | lifecycle-enumeration-family(
      exact H13LifecycleUniverseMemberCoordinate,
      exact H13SourceEnumerationBoundaryCoordinate whose branch is
        observation-scope-boundary or lifecycle-member-boundary
    )
  | bootstrap-source-family(
      exact H13OwnerSlotCoordinate,
      exact H13SourceEnumerationBoundaryCoordinate whose branch is
        bootstrap-owner-slot-boundary
    )
  | baseline-direct-observation-family(
      exact H13OwnerSlotCoordinate whose branch is baseline-owner-slot,
      exact H13BootstrapSourceCandidateCoordinate
    )
  | lifecycle-direct-observation-family(
      exact H13OwnerSlotCoordinate whose branch is lifecycle-owner-slot,
      exact H13BootstrapSourceCandidateCoordinate,
      exact EventFamily = E07 | E11 | E14 | E15 | E17
    )
  | event-policy-token-family(
      exact PermissionEventRequirementSlot
    )
```

H13AcceptedRawFamily(D) is the exact complete accepted occurrence or candidate family owned by D, including its owner-defined multiplicity. Equality is equality of D plus equality of the complete family. No occurrence ordinal, provider, storage path, source order, arrival order, proof, digest, signature, rule, pass, or implementation object participates.

H13QScopedProducerLifecycleOccurrenceReferenceCoordinate is not a branch of H13RawInputFamilyCoordinate. Therefore no legal lifecycle reference can become a raw family. A well-formed owner-resolvable intrinsic C has only its existing `producer-intrinsic-family`; a well-formed nonintrinsic C has only its existing owner-native family. A retained malformed C with zero, duplicate, or multiple owner matches is not normalized or reassigned, and its reference still cannot become a raw family.

## 7. Raw-family ownership, independent occurrence-owner resolution, and placeholders

### 7.1 Legal raw-family one-owner table

Every legal owner-native raw family consumed by H13EvaluationSeed or exposed by pre-freeze expansion matches exactly one row. This raw-family ownership property is distinct from successful unique-owner resolution for a retained lifecycle occurrence C. A malformed retained C can have zero, duplicate, or multiple candidate-owner matches without losing its accepted source-family occurrence or lifecycle projection:

| Accepted family | Exact raw-family constructor | Equality components | Scope | Inner multiplicity owner | Boundary constructor | Forbidden aliases |
|---|---|---|---|---|---|---|
| Stage-A Organization registration, boundary permission, Workspace state/overlay, attribution, qualification, and rejected-candidate families | none; retained only inside stage-a-resolved-population(C,A) | exact A aggregate equality | Stage A | accepted StageAResolvedPopulation owners | none in Stage B | every H13RawInputFamilyCoordinate branch |
| Stage-A applicable projection | none; pre-freeze-literal-input only | h02-stage-b-applicable-input NodeSemanticCoordinate plus projection | Q-scoped | accepted projection cardinality | exact node coordinate | every raw family branch |
| H-07 authoritative bundle | none; pre-freeze-literal-input only | authoritative-h07-input NodeSemanticCoordinate plus H07 bundle | Connection | singular accepted input | exact node coordinate | every raw family branch |
| RuntimeCorrespondence candidates | raw-node-family(iaa-runtime-correspondence-input(Q)) | exact Q and runtime QuestionKey | Q-scoped | accepted candidate occurrence family | exact raw node coordinate | every nonmatching raw-node branch |
| IAA local-separation conclusion candidates | raw-node-family(iaa-local-separation-input(L)) | exact L and accepted separation QuestionKey | side/local IAA | accepted candidate family | exact raw node coordinate | protected-source and Q runtime branches |
| Stage-B IAA HistoricalCurrentnessQualification candidates | raw-node-family(historical-currentness-qualification-input(subject,cut)) | exact HistoricalCurrentnessSubject and AuthorityUseCut | owning Q/side | accepted qualification candidate family | exact raw node coordinate | Stage-A aggregate and qualified-time branches |
| QualifiedPhysicalTimeDomain/Input candidates | raw-node-family(qualified-time-input(scope,position)) | exact EvaluationScope and semantic state position | owning Q/side | accepted time-input candidate family | exact raw node coordinate | history and derived comparison branches |
| producer intrinsic lifecycle and Q-independent O09/O10 allocation families | producer-intrinsic-family(PU,class) | exact ProducerLifecycleEvaluationCoordinate and ProducerIntrinsicInputClass | Q-independent | accepted intrinsic occurrence family | producer-intrinsic-boundary(PU,class) | all raw-node and Q-scoped producer branches |
| nonintrinsic producer-lifecycle enrollment, ProducerClass, Q-local ObservationScope, and source-enumeration families outside bootstrap slots | raw-node-family(producer-lifecycle-owner-native-input(D)) | exact closed D branch and all of its accepted candidate/domain/boundary components | owner-native; Q only for Q-local ObservationScope | accepted producer-lifecycle or source-enumeration occurrence family | exact boundary carried by D | producer-intrinsic-family, bootstrap-source-family, and every q-scoped reference |
| Q-scoped direct/event/bootstrap/K45/K49/surface/source-control/closure/technical/late Producer candidates | raw-node-family(q-producer-candidate-occurrence-input(Q,use,candidate)) | exact Q, closed non-lifecycle use tag, raw candidate coordinate | Q-scoped | FrozenStageBProducerOccurrenceFamily branch owner | observation-scope-boundary or exact owner-slot boundary selected by use | producer-intrinsic-family and producer-lifecycle-reference use |
| candidate-independent baseline subject/object/resource/channel/K/owner/source enumeration | baseline-enumeration-family(member,boundary) | exact H13BaselineUniverseMemberCoordinate and permitted boundary | Q/P/B structural scope | accepted bounded enumeration family | observation-scope-boundary or baseline-member-boundary | lifecycle and bootstrap branches |
| candidate-independent E07/E11/E14/E15/E17 lifecycle enumeration | lifecycle-enumeration-family(member,boundary) | exact H13LifecycleUniverseMemberCoordinate and permitted boundary | Q/P/B/U structural scope | accepted bounded enumeration family | observation-scope-boundary or lifecycle-member-boundary | baseline and bootstrap branches |
| concrete bootstrap Producer enrollment/class/domain/scope/lifecycle candidates and unavailable sources for one slot | bootstrap-source-family(slot,boundary) | exact H13OwnerSlotCoordinate and matching bootstrap-owner-slot-boundary | slot-scoped; intrinsic lifecycle dependency remains Q-independent | accepted raw bootstrap source family | bootstrap-owner-slot-boundary(slot) | producer-intrinsic and direct-observation branches |
| BindingBaselineDirectAttribution and BindingBaselineOwnerObservation candidates | baseline-direct-observation-family(slot,source) | exact baseline slot and pre-freeze source candidate coordinate | Q/P/B slot | accepted baseline observation occurrence family | baseline owner slot | lifecycle direct branch |
| BindingLifecycleDirectAttribution, CoverageStatement, and Observation candidates | lifecycle-direct-observation-family(slot,source,E) | exact lifecycle slot, source candidate, and E07/E11/E14/E15/E17 | Q/P/B/U slot | accepted lifecycle occurrence family | lifecycle owner slot | baseline direct branch |
| ProducerBindingContinuityMeasuredConclusion candidates | raw-node-family(iaa-binding-continuity-input(Q,P,B,U)) | exact Q, P, B, U and accepted QuestionKey | Q-scoped | accepted IAA conclusion candidate family | exact raw node coordinate | derived causality/currentness branches |
| direct Producer fact candidates/placeholders | raw-node-family(direct-producer-fact-input(D,P)) | exact DirectSemanticPropositionCoordinate and source ProducerIncarnation | Q-scoped | accepted direct-fact candidate family | observation-scope-boundary from D | derived DirectCellResult branch |
| AbsenceSourceControlMeasuredConclusion candidates | raw-node-family(iaa-absence-source-control-input(A)) | exact AbsenceSourceControlCoordinate | Q-scoped | accepted IAA candidate family | exact raw node coordinate | admissibility and currentness branches |
| ProducerIndependenceMeasuredConclusion candidates | raw-node-family(iaa-producer-independence-input(PI)) | exact ProducerIndependenceCoordinate | Q-scoped | accepted IAA candidate family | exact raw node coordinate | threat, coverage, and currentness branches |
| ProtectedDetectorSourceAssertion candidates | raw-node-family(protected-detector-source-input(K,D,O,S)) | exact protected evaluation key, DetectorSourceDomain, owner, and scope | protected Connection input | accepted protected candidate family | protected-detector-boundary(K,D,O,S) | detector disposition and IAA conclusion branches |
| raw ObservationOccurrence candidates | raw-node-family(observation-occurrence-input(O)) | exact ObservationOccurrenceCoordinate | Q-scoped | accepted occurrence family | observation-scope-boundary carried by O | closure and event branches |
| raw ProducerClosureAssertion candidates | raw-node-family(producer-closure-assertion-input(PC)) | exact ProducerClosureCoordinate | Q-scoped | accepted assertion candidate family | observation-scope-boundary carried by PC | combined-closure branch |
| RelationEdge candidates, including accepted malformed candidates | raw-node-family(relation-edge-input(R,O,PC)) | exact RelationEdgeContent, occurrence, and direct closure coordinates | Q-scoped | accepted edge candidate family | observation-scope-boundary carried by O/PC | derived-path branch |
| EventCoverageAssertion candidates | raw-node-family(event-coverage-assertion-input(EA)) | exact EventCoverageAssertionCoordinate | Q/slot/candidate Producer | accepted assertion candidate family | observation-scope-boundary in the slot | event population/coverage branches |
| received noncatalogue event-policy tokens | event-policy-token-family(slot) | exact PermissionEventRequirementSlot | Q/slot | accepted received token family | exact slot | no replacement of independently-complete-source |

Exactly one row matches each legal owner-native raw family. The table is total for legal H13EvaluationSeed raw fields and the legal pre-freeze source families named by rules 1 through 12. A purported raw family matching zero or more than one row is malformed and nonconforming, but the accepted bounded candidate occurrence that exposed the defect remains retained by its accepted received-candidate family or placeholder. Raw-family grammar failure does not authorize inventing a family and does not delete the candidate's accepted lifecycle projection.

The lifecycle occurrence projection is audited separately from both raw-family ownership and owner-resolution success:

| Q-scoped member | H13ProducerLifecycleOccurrenceOwnerResolution(C) | Payload copied | Raw-owner rows matched by R | Required coordinate and authority |
|---|---|---|---|---|
| q-scoped-producer-lifecycle-reference(R) for well-formed intrinsic C | unique-owner(exact producer-intrinsic-family(L) reference) | none | zero | exact `producer-candidate-occurrence(lifecycle,C)`; structural projection only |
| q-scoped-producer-lifecycle-reference(R) for well-formed enrollment/class/Q-local-scope/source-enumeration C | unique-owner(exact matching owner-native reference) | none | zero | exact `producer-candidate-occurrence(lifecycle,C)`; structural projection only |
| q-scoped-producer-lifecycle-reference(R) for well-formed bootstrap C | unique-owner(exact matching bootstrap-source-family reference) | none | zero | exact `producer-candidate-occurrence(lifecycle,C)`; structural projection only |
| q-scoped-producer-lifecycle-reference(R) for accepted unavailable/indeterminate placeholder C | unique-owner when an exact placeholder owner exists, otherwise no-unique-owner or multiple-owner-candidates | none | zero | exact accepted lifecycle placeholder coordinate remains representable; structural projection only |
| q-scoped-producer-lifecycle-reference(R) for zero-owner malformed C | no-unique-owner | none | zero | exact `producer-candidate-occurrence(lifecycle,C)` remains; no owner guessed; non-authorizing |
| q-scoped-producer-lifecycle-reference(R) for duplicate or multiple-owner C | multiple-owner-candidates(exact retained match family and candidate set) | none | zero | exact `producer-candidate-occurrence(lifecycle,C)` remains; no owner selected; contradiction or ambiguity retained |

For every legal L, `cardinality(RawFamilyOwnerRows(producer-intrinsic-family(L))) = 1`. For every legal nonintrinsic D, the applicable raw-node or bootstrap family matches exactly one raw-family row. For every legal R, `cardinality(RawFamilyOwnerRows(R)) = 0` because R is not a raw family. These laws do not imply that every retained malformed C resolves to one owner. Multiple R values consuming one C do not change source ownership or inner multiplicity.

### 7.2 Closed pre-freeze placeholder coordinate

H13PreFreezePlaceholderCoordinate is exactly:

```text
H13PreFreezePlaceholderCoordinate =
  permission-key-resolution-placeholder(
    exact PermissionEvaluationCoordinate
  )
  | raw-node-placeholder(
      exact H13RawInputNodeCoordinate
    )
  | producer-intrinsic-placeholder(
      exact H13ProducerIntrinsicRawFamilyCoordinate
    )
  | baseline-enumeration-placeholder(
      exact H13BaselineUniverseMemberCoordinate
    )
  | lifecycle-enumeration-placeholder(
      exact H13LifecycleUniverseMemberCoordinate
    )
  | bootstrap-source-placeholder(
      exact H13OwnerSlotCoordinate
    )
  | baseline-direct-input-placeholder(
      exact baseline H13OwnerSlotCoordinate,
      exact H13BootstrapSourceCandidateCoordinate
    )
  | lifecycle-direct-input-placeholder(
      exact lifecycle H13OwnerSlotCoordinate,
      exact H13BootstrapSourceCandidateCoordinate
    )
  | runtime-proposition-placeholder(
      exact RuntimeCorrespondenceProposition coordinate
    )
```

H13AcceptedPreFreezePlaceholder(D) is constrained by this total table:

| Placeholder coordinate branch | Exact allowed accepted placeholder |
|---|---|
| permission-key-resolution-placeholder | tagged resolution absent or ambiguous |
| raw-node-placeholder for RuntimeCorrespondence or IAA conclusion candidate family | the row-prescribed tagged absent or ambiguous candidate-family value, including exact accepted unavailable/indeterminate candidate when the owning type defines it |
| raw-node-placeholder for HistoricalCurrentnessQualification candidate input | exact unavailable/indeterminate input placeholder; no invented HistoricalCurrentnessQualification outcome |
| raw-node-placeholder for QualifiedPhysicalTimeInput | exact candidate with qualification verdict unavailable or indeterminate and its exact state position/domain candidate fields |
| raw-node-placeholder for direct-producer-fact | exact unavailable/indeterminate direct-fact placeholder prescribed by the row |
| raw-node-placeholder for protected detector, observation, closure, relation, or event input | only the exact absent/unavailable/indeterminate placeholder expressly prescribed by that owner |
| producer-intrinsic-placeholder | exact unavailable/indeterminate intrinsic source-family placeholder |
| baseline-enumeration-placeholder | exact unavailable/indeterminate bounded-domain placeholder for that baseline member coordinate |
| lifecycle-enumeration-placeholder | exact unavailable/indeterminate bounded-domain placeholder for that lifecycle member coordinate |
| bootstrap-source-placeholder | exact unavailable source placeholder for that owner slot |
| baseline-direct-input-placeholder | tagged absent or ambiguous baseline direct-input family for that slot/source |
| lifecycle-direct-input-placeholder | tagged absent or ambiguous lifecycle direct-input family for that slot/source |
| runtime-proposition-placeholder | exact canonical absent proposition-result placeholder |

No null, generic unresolved value, storage error, parser exception, transport error, or arbitrary unknown tag is permitted.

No Q-scoped lifecycle-reference placeholder branch exists. An unavailable or indeterminate C uses its exact accepted existing placeholder semantics, such as `producer-intrinsic-placeholder(L)`, `raw-node-placeholder(producer-lifecycle-owner-native-input(D))`, or `bootstrap-source-placeholder(slot)` when that owner-native coordinate is uniquely established. R directly preserves the accepted C coordinate even when owner resolution is absent or ambiguous. R cannot create a Q-specific intrinsic placeholder, family, evidence owner, or guessed owner.

## 8. Closed canonical population member grammar

H13EvaluationPopulationMember is exactly:

```text
H13EvaluationPopulationMember =
  connection-evaluation-key(exact ConnectionEvaluationKey)
  | side-evaluation-key(exact SideEvaluationKey)
  | stage-a-resolved-population(
      exact ConnectionEvaluationKey,
      exact StageAResolvedPopulation
    )
  | selected-catalogue(
      exact ConnectionEvaluationKey,
      exact selected release,
      exact IsolationProfile,
      exact selected type/source matrix aggregate named by H13EvaluationSeed
    )
  | pre-freeze-literal-input(
      exact H13PreFreezeLiteralInputValue
    )
  | raw-input-family(
      exact H13RawInputFamilyCoordinate D,
      exact H13AcceptedRawFamily(D)
    )
  | q-scoped-producer-lifecycle-reference(
      exact H13QScopedProducerLifecycleOccurrenceReferenceCoordinate R
    )
  | pre-freeze-placeholder(
      exact H13PreFreezePlaceholderCoordinate D,
      exact H13AcceptedPreFreezePlaceholder(D)
    )
  | semantic-question(
      exact NodeSemanticCoordinate
    )
  | required-dependencies-question(
      exact NodeSemanticCoordinate
    )
```

The union is exhaustive. The lifecycle-reference constructor carries a coordinate only and is not a raw-input-family. No general row value, derived answer, verdict, state, reason, provenance result, completeness result, or final result constructor exists.

### 8.1 Equality

Two members are equal exactly when their outer tags are equal and every carried component is equal under its owning accepted semantic equality. The H-13-S3 structural projections use componentwise equality.

Two lifecycle-reference members are equal exactly when their R values are equal: exact Q, exact accepted tag `lifecycle`, and exact C. Owner-resolution status and candidate-owner matches do not participate in R equality or in equality of any underlying raw family.

Member identity does not contain:

- seed-field position;
- expansion rule or pass;
- discovery or arrival order;
- reference count;
- provider, adapter, module, process, storage row, or database key;
- representation, bytes, proof, signature, digest, or key;
- answer, verdict, reason, state, or final result; or
- display labels.

### 8.2 Multiplicity boundary

raw-input-family(D,F) is one top-level member. F retains the accepted multiplicity function or occurrence-family semantics. Two equal inner occurrences remain count two where the owner says so. Three semantic questions referencing D do not make F occur three times. A later failure of one consumer changes no source-family count and creates no population member.

A lifecycle-reference member carries no occurrence-family payload. Two Q values may therefore contribute two distinct reference members to one L while the raw-family member and every inner multiplicity of L remain exactly one owner-defined value. Repeated discovery of one structurally equal R yields one top-level reference member.

## 9. Seed projection and repaired expansion codomain

### 9.1 Exact seed-to-set projection

H13EvaluationSeedMemberSet(seed) is the finite mathematical union of:

1. one connection-evaluation-key(C);
2. one side-evaluation-key(S) for each member of the exact two-member Sides(C) set;
3. one stage-a-resolved-population(C,A), with no Stage-A flattening;
4. one pre-freeze-literal-input for each Stage-A result=applicable projection and its h02-stage-b-applicable-input coordinate;
5. one pre-freeze-literal-input for the authoritative H-07 input;
6. one selected-catalogue aggregate for the exact selected release/profile/type/source matrices;
7. one raw-input-family for every legal family selected by the raw-family table, while accepted malformed candidate occurrences remain in their accepted received-candidate family;
8. one pre-freeze-placeholder for every explicit accepted placeholder already required by the seed;
9. one q-scoped-producer-lifecycle-reference for every accepted `lifecycle` branch C mechanically exposed by the seed, regardless of owner-resolution result; and
10. both semantic-question(N) and required-dependencies-question(N) for every exact Stage-B node coordinate N mechanically exposed by items 4 through 9.

No nested Stage-A source is projected by items 7 through 10. StageANodeCoordinateProjection is handled only by the theorem in Section 11.

Formally:

~~~text
SeedQuestionCoordinateSet(seed) =
  every exact Stage-B NodeSemanticCoordinate mechanically exposed by seed,
  including H13ProducerLifecycleOccurrenceReferenceNodeCoordinate(R)
  for every seed-exposed accepted lifecycle R

SeedSemanticQuestionMemberSet(seed) = {
  semantic-question(N)
  | N in SeedQuestionCoordinateSet(seed)
}

SeedRequiredDependenciesQuestionMemberSet(seed) = {
  required-dependencies-question(N)
  | N in SeedQuestionCoordinateSet(seed)
}

SeedLifecycleReferenceMemberSet(seed) = {
  q-scoped-producer-lifecycle-reference(R)
  | R = (Q,lifecycle,C) for an accepted seed-exposed C and
    H13ProducerLifecycleOccurrenceReferenceNodeCoordinate(R)
      in SeedQuestionCoordinateSet(seed)
}

H13EvaluationSeedMemberSet(seed) =
  ControlMemberSet(seed)
  union PreFreezeLiteralInputMemberSet(seed)
  union RawInputFamilyMemberSet(seed)
  union PreFreezePlaceholderMemberSet(seed)
  union SeedLifecycleReferenceMemberSet(seed)
  union SeedSemanticQuestionMemberSet(seed)
  union SeedRequiredDependenciesQuestionMemberSet(seed)
~~~

Every function has the closed domain defined in Sections 3 through 7.

Consequently, for every N in SeedQuestionCoordinateSet(seed), both wrappers are in P0. Neither implication is conditional on an answer or on owner-resolution success:

~~~text
N in SeedQuestionCoordinateSet(seed)
  => semantic-question(N) in P0
  and required-dependencies-question(N) in P0
~~~

No seed wrapper or lifecycle occurrence coordinate may wait for a substantive answer, owner verdict, currentness, freshness, reason, F result, provenance result, completeness result, final result, or later discovery pass.

### 9.2 Repaired rule codomain

For rule i:

~~~text
ExpansionSemanticQuestionMemberSet_i(P) = {
  semantic-question(N)
  | N in Ni(P)
}

ExpansionRequiredDependenciesQuestionMemberSet_i(P) = {
  required-dependencies-question(N)
  | N in Ni(P)
}

ExpansionLifecycleReferenceMemberSet_i(P) = {
  q-scoped-producer-lifecycle-reference(R)
  | R = (Q,lifecycle,C) is exposed by accepted rule 7 and
    H13ProducerLifecycleOccurrenceReferenceNodeCoordinate(R) in Ni(P)
}

ExpandRuleMemberSet_i(P) =
  ExpansionSemanticQuestionMemberSet_i(P)
  union ExpansionRequiredDependenciesQuestionMemberSet_i(P)
  union ExpansionLifecycleReferenceMemberSet_i(P)
  union RawInputFamilyMemberSet(Zi(P))
  union PreFreezePlaceholderMemberSet(Ui(P))
~~~

There is no ValueMemberSet term.

Ni(P) is the exact accepted Sections 22.2 through 22.4 coordinate set exposed by H-13-S2 rule i. Zi(P) contains only coordinates from H13RawInputFamilyCoordinate. Ui(P) contains only coordinates from H13PreFreezePlaceholderCoordinate. ExpansionLifecycleReferenceMemberSet_i is nonempty only for the accepted `lifecycle` branch of rule 7. A rule returns the empty set for a constructor family it does not expressly generate.

There is no independent Di(P) that can schedule a dependency wrapper later. For every N first exposed by an expansion rule at iteration k, semantic-question(N) and required-dependencies-question(N) both enter at k. The same atomic step emits any R whose accepted lifecycle occurrence coordinate is N. Every population wrapper that is a deterministic function only of N is therefore emitted with N at first formability.

R and its accepted lifecycle node coordinate are emitted from Q and C without consulting H13ProducerLifecycleOccurrenceOwnerResolution(C). When source semantics also make an owner-native family, placeholder, or malformed received-candidate family formable in that step, it is co-emitted under its own accepted rule. No later owner success is required, no owner is invented, and owner failure cannot erase R or N.

### 9.3 Rule-by-rule pre-freeze output

| Rule | Semantic-question coordinate classes | Raw families or placeholders allowed before freeze | Post-freeze answers added |
|---|---|---|---|
| 1 | exact Q, permission-key-resolution, currentness, RC01-RC11, F, event, coverage, freshness, reuse, overlap/governance, trigger, and candidate-measurement coordinates required by the accepted clause | RuntimeCorrespondence and other exact raw-node families from the closed subset; exact absent/ambiguous permission-resolution and required-input placeholders | none |
| 2 | lineage/incarnation lifecycle, K01, runtime closure roots, MembershipEpoch/target binding, and direct-proposition coordinates | exact Q-scoped producer candidate families and required accepted placeholders | none |
| 3 | K02-K04 ancestry, roles, K08-K19/K31/K35/K47-K49 path, lifecycle, closure, and proposition coordinates | exact boundary/controller raw-node families and accepted placeholders | none |
| 4 | K05, co-residency, environment object, K45/K46, lifecycle, closure, and proposition coordinates | exact environment/resident raw-node families and placeholders | none |
| 5 | owner, attachment, endpoint, gate, K06-K49, lifecycle, closure, and proposition coordinates | exact ResourceObject/Channel raw-node families and placeholders | none |
| 6 | both endpoints, direct owner, relation, CompletePathUniverse, affected F, and trigger coordinates | exact relation-edge raw family, including accepted malformed candidates; accepted missing/unavailable path inputs only | none |
| 7 | Q-independent PU lifecycle; every Q-scoped direct/event/lifecycle/bootstrap/K45/K49/surface/source-control/closure/technical/late Producer occurrence; baseline/lifecycle member, owner-slot, bootstrap-source, binding, causality, time, currentness, coverage, direct-cell, and path coordinate | exactly one producer-intrinsic-family per legal PU/class; dedicated non-owning Q-scoped lifecycle references for every accepted lifecycle C independent of owner success; non-lifecycle Q-scoped Producer raw families; baseline/lifecycle enumeration; bootstrap-source; baseline/lifecycle direct-observation; IAA binding candidate families; accepted malformed received-candidate families and exact placeholders | none |
| 8 | AbsenceSourceThreatControlDomain, AbsenceSourceControlCoordinate, base graph, IAA input/currentness/freshness/history, and admissibility coordinates | exact IAA absence-source-control candidate family, time/history raw families, and prescribed placeholders | none |
| 9 | source-set, direct fact, threat, IAA independence/currentness/freshness/history, proposition coverage, occurrence, closure, RC, affected F coordinates | exact direct-fact, IAA independence, observation, closure, time/history raw families and prescribed placeholders | none |
| 10 | ClosureStateCut, RequiredEventSlot, constant policy, event statement, assertion, population, affected-coordinate, and permission coverage coordinates | exact event-coverage raw families, event-policy-token family, Q-scoped event Producer families, and prescribed placeholders | none |
| 11 | unordered same-side target-overlap pair, graph component, and governance relation coordinates | no new raw family; required candidate inputs already have one owner row or remain retained malformed inputs | none |
| 12 | LocalIAASeparationKey, protected source/disposition, IAA conclusion/currentness, F04 pair, qualified-time/domain/freshness, M/U order/causality coordinates | exact protected source, IAA separation, time/history raw families and prescribed placeholders; equal contexts yield the accepted empty protected set | none |
| 13 | every applicable coordinate in the unchanged 71-token Section 22.2 grammar, every true-or-false trigger coordinate, and required component/state coordinates | no newly resolved semantic answer; only a still-missing exact raw input family or accepted placeholder already authorized by Sections 6 and 7 | none |

Rule 7 preserves the accepted tag domain exactly. Every applicable Producer candidate yields the exact tagged occurrence coordinate for every applicable `direct`, `event`, `lifecycle`, `bootstrap`, `K45`, `K49`, `surface`, `source-control`, `closure`, `technical`, and `late` branch. Every lifecycle-branch intrinsic, enrollment, ProducerClass, Q-local ObservationScope, source-enumeration, bootstrap-overlap, malformed, contradictory, unavailable, or indeterminate C uses the exact accepted `lifecycle` tag. Owner-native classifications do not become occurrence-family tags.

An input family, placeholder, lifecycle reference, semantic question, and required-dependencies question are emitted together when their accepted coordinate first becomes formable under their respective accepted rules. None is delayed until owner resolution or a substantive answer exists.

For every newly exposed N, the co-emission law is exact:

~~~text
first-formable(N, iteration k)
  => {
       semantic-question(N),
       required-dependencies-question(N)
     } subset of additions-at(k)
~~~

### 9.4 Fixed point

~~~text
H13ExpandMemberSet(P) =
  union of ExpandRuleMemberSet_i(P) for i in {1,...,13}

P0 =
  H13EvaluationSeedMemberSet(H13EvaluationSeed)

P(n+1) =
  P(n) union H13ExpandMemberSet(P(n))

H13EvaluationPopulationMembers =
  least Pn such that P(n+1) = P(n)
~~~

Both functions return finite mathematical sets of exactly H13EvaluationPopulationMember.

## 10. Complete 71-row coordinate/value audit

The accepted H13NodeClass token set is unchanged. Coordinate YES means the Stage-B planning coordinate enters the fixed point when its accepted row condition is met. Coordinate NO means it belongs to the independently frozen Stage-A side of DerivationPopulation. PRE_FREEZE_INPUT, PRE_FREEZE_PLACEHOLDER, and Q_SCOPED_REFERENCE mean only the closed Revision 5 constructors; NO_POST_FREEZE_VALUE means the row's resolved answer is excluded from P.

| H13NodeClass / exact branch | ROW_COORDINATE_IN_FIXED_POINT | ROW_RESOLVED_VALUE_IN_FIXED_POINT |
|---|---|---|
| authoritative-h02-input | NO | NO_POST_FREEZE_VALUE |
| historical-currentness-qualification, Stage-A governance branch | NO | NO_POST_FREEZE_VALUE |
| historical-currentness-qualification, Stage-B IAA branch | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only through the closed raw-input constructors |
| h02-applicability-evaluation | NO | NO_POST_FREEZE_VALUE |
| h02-applicability-population | NO | NO_POST_FREEZE_VALUE |
| h02-stage-b-applicable-input | YES | PRE_FREEZE_INPUT |
| authoritative-h07-input | YES | PRE_FREEZE_INPUT |
| iaa-measured-input, runtime or separation candidate branch | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only through the closed raw-input constructors |
| producer-candidate-occurrence | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER for non-lifecycle accepted branches; Q_SCOPED_REFERENCE for every accepted lifecycle-branch C at exact `producer-candidate-occurrence(lifecycle,C)`, independent of unique, zero, duplicate, or multiple owner resolution; subtype/source classifications never replace the accepted lifecycle tag |
| relevant-producer-set | YES | NO_POST_FREEZE_VALUE |
| producer-intrinsic-continuity | YES | NO_POST_FREEZE_VALUE |
| producer-source-surface-binding | YES | NO_POST_FREEZE_VALUE |
| binding-baseline-universe | YES | NO_POST_FREEZE_VALUE |
| binding-lifecycle-universe | YES | NO_POST_FREEZE_VALUE |
| binding-bootstrap-source | YES | NO_POST_FREEZE_VALUE |
| binding-bootstrap-source-population | YES | NO_POST_FREEZE_VALUE |
| binding-baseline-direct-input | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only through the closed raw-input constructors |
| binding-baseline-population | YES | NO_POST_FREEZE_VALUE |
| producer-source-surface-binding-baseline | YES | NO_POST_FREEZE_VALUE |
| binding-lifecycle-direct-input | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only through the closed raw-input constructors |
| binding-lifecycle-population | YES | NO_POST_FREEZE_VALUE |
| iaa-binding-continuity-conclusion | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only through the closed raw-input constructors |
| binding-conclusion-causality | YES | NO_POST_FREEZE_VALUE |
| producer-binding-event-coverage | YES | NO_POST_FREEZE_VALUE |
| producer-source-surface-binding-currentness | YES | NO_POST_FREEZE_VALUE |
| direct-producer-fact | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only through the closed raw-input constructors |
| direct-cell-result | YES | NO_POST_FREEZE_VALUE |
| derived-influence-path-result | YES | NO_POST_FREEZE_VALUE |
| producer-coupling-base-graph | YES | NO_POST_FREEZE_VALUE |
| producer-control-coupling-state | YES | NO_POST_FREEZE_VALUE |
| producer-control-coupling-population | YES | NO_POST_FREEZE_VALUE |
| producer-threat-control-domain | YES | NO_POST_FREEZE_VALUE |
| absence-source-threat-control-domain | YES | NO_POST_FREEZE_VALUE |
| iaa-absence-source-control-conclusion | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only through the closed raw-input constructors |
| absence-source-admissibility | YES | NO_POST_FREEZE_VALUE |
| producer-influence-threat-set | YES | NO_POST_FREEZE_VALUE |
| iaa-producer-independence-conclusion | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only through the closed raw-input constructors |
| proposition-source-independence | YES | NO_POST_FREEZE_VALUE |
| runtime-correspondence-proposition-result | YES | PRE_FREEZE_PLACEHOLDER only when the accepted canonical absent proposition member is required; every resolved verdict is NO_POST_FREEZE_VALUE |
| protected-detector-input | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only through the closed raw-input constructors |
| protected-detector-evidence-disposition | YES | NO_POST_FREEZE_VALUE |
| identity-binding | YES | PRE_FREEZE_PLACEHOLDER only for accepted absent/ambiguous permission-key resolution; every resolved binding answer is NO_POST_FREEZE_VALUE |
| equivalence-conclusion | YES | NO_POST_FREEZE_VALUE |
| observation-occurrence | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only as an unadjudicated raw candidate family; resolved occurrence answer is excluded |
| producer-closure-assertion | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only as an unadjudicated raw candidate family; resolved assertion answer is excluded |
| combined-closure | YES | NO_POST_FREEZE_VALUE |
| relation-edge | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only as an unadjudicated accepted edge candidate family |
| event-coverage-assertion | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only as an unadjudicated raw candidate family; CoverageVerdict is excluded |
| event-requirement-source-population | YES | NO_POST_FREEZE_VALUE |
| permission-event-coverage | YES | NO_POST_FREEZE_VALUE |
| connection-event-coverage-union | YES | NO_POST_FREEZE_VALUE |
| h02-currentness-assertion | YES | NO_POST_FREEZE_VALUE |
| h07-currentness-comparison | YES | NO_POST_FREEZE_VALUE |
| iaa-measured-currentness-assertion | YES | NO_POST_FREEZE_VALUE |
| qualified-time-source-input | YES | PRE_FREEZE_INPUT or PRE_FREEZE_PLACEHOLDER only through the closed raw-input constructors |
| qualified-time-domain-comparison | YES | NO_POST_FREEZE_VALUE |
| measured-conclusion-freshness | YES | NO_POST_FREEZE_VALUE |
| freshness-calculation | YES | NO_POST_FREEZE_VALUE |
| reuse-provenance | YES | NO_POST_FREEZE_VALUE |
| mediated-channel-pair | YES | NO_POST_FREEZE_VALUE |
| same-side-target-overlap-graph | YES | NO_POST_FREEZE_VALUE |
| shared-governance-relation | YES | NO_POST_FREEZE_VALUE |
| f04-pair-evaluation | YES | NO_POST_FREEZE_VALUE |
| f-predicate | YES | NO_POST_FREEZE_VALUE |
| semantic-trigger-evaluation | YES | NO_POST_FREEZE_VALUE |
| semantic-reason-set | YES | NO_POST_FREEZE_VALUE |
| permission-coverage-evaluation | YES | NO_POST_FREEZE_VALUE |
| side-evaluation | YES | NO_POST_FREEZE_VALUE |
| profile-evaluation-state | YES | NO_POST_FREEZE_VALUE |
| coverage-state | YES | NO_POST_FREEZE_VALUE |
| substantive-current-use-disposition | YES | NO_POST_FREEZE_VALUE |
| substantive-gate-decision | YES | NO_POST_FREEZE_VALUE |

For the rows marked PRE_FREEZE_INPUT, only the literal input or unadjudicated candidate family enters through the closed constructor. A later resolved verdict or answer at the same node coordinate does not.

The lifecycle Q_SCOPED_REFERENCE row changes no ProvenanceNodeType token, scope grammar, SemanticValue grammar, QuestionKey, or RequiredDependencies rule. It is total over the accepted frozen lifecycle branch, always uses the exact accepted `lifecycle` occurrence-family tag, survives failed owner resolution, restores every already-accepted producer-candidate-occurrence coordinate, and carries no resolved substantive value.

## 11. RequiredNodeCoordinateSet preservation and equivalence theorem

### 11.1 Accepted definition remains literal

This accepted decision does not redefine RequiredNodeCoordinateSet. It remains:

~~~text
RequiredNodeCoordinateSet is every and only coordinate generated by
accepted H-13-S2 Sections 22.2 through 22.4 from DerivationPopulation.
~~~

RequiredRecordSet, RequiredDerivationInventory, ResultCompletenessGate, reason 036, DeclaredEdgeSet, RequiredEdgeSet, and PopulationDependencySet are unchanged.

### 11.2 Derived projection only

Define the nonauthoritative helper:

~~~text
H13S3MemberNodeCoordinateProjection(P,A) =
  StageANodeCoordinateProjection(A)
  union
  {
    N
    | semantic-question(N) in P
  }
~~~

StageANodeCoordinateProjection(A) is exactly the authoritative-h02-input, Stage-A historical-currentness-qualification, h02-applicability-evaluation, and h02-applicability-population coordinates required by accepted Sections 22.2 through 22.4 from the complete nested StageAResolvedPopulation A.

For every q-scoped-producer-lifecycle-reference(R), Section 9 co-emits semantic-question(H13ProducerLifecycleOccurrenceReferenceNodeCoordinate(R)). The helper therefore observes the exact accepted `producer-candidate-occurrence(lifecycle,C)` coordinate through the same semantic-question projection as every other Stage-B coordinate. The reference member, owner-resolution result, and any owner reference add no second node coordinate to this helper.

This helper is not the definition of RequiredNodeCoordinateSet.

### 11.3 Extensional equivalence theorem

For every complete accepted DerivationPopulation, including accepted bounded malformed, contradictory, duplicate, unavailable, indeterminate, late, and failure-causing retained candidates:

~~~text
H13S3MemberNodeCoordinateProjection(
  H13EvaluationPopulationMembers,
  StageAResolvedPopulation
)
=
accepted RequiredNodeCoordinateSet
~~~

Proof, projection to accepted set:

1. Every StageANodeCoordinateProjection member is one of the four accepted Stage-A row classes generated from A by Sections 22.2 through 22.4.
2. Every semantic-question(N) is generated only by SeedSemanticQuestionMemberSet or ExpansionSemanticQuestionMemberSet_i.
3. SeedQuestionCoordinateSet uses only exact accepted Stage-B input rows mechanically exposed by H13EvaluationSeed.
4. For lifecycle R, H13ProducerLifecycleOccurrenceReferenceNodeCoordinate(R) is exactly the accepted Section 22.2 permission-scoped `producer-candidate-occurrence(lifecycle,C)` coordinate. Legality requires only Q and C in the accepted frozen lifecycle branch. It neither admits enrollment/class/scope/source-enumeration as occurrence-family tags nor requires unique-owner resolution.
5. Each Ni(P) is constrained to the exact Sections 22.2 through 22.4 row condition, EvaluationScope, SemanticValue class, and QuestionKey exposed by accepted rule i.
6. Rules 1 through 12 add only their accepted question populations. Rule 13 adds only accepted canonical node, component, state, true-or-false trigger, and dependency questions.
7. required-dependencies-question(N), q-scoped-producer-lifecycle-reference(R), and H13ProducerLifecycleOccurrenceOwnerResolution(C) do not independently project a NodeSemanticCoordinate.
8. Therefore H13S3MemberNodeCoordinateProjection is a subset of accepted RequiredNodeCoordinateSet.

Proof, accepted set to projection:

1. An accepted required coordinate is either Stage A or Stage B.
2. Every Stage-A required coordinate is generated from A and is in StageANodeCoordinateProjection.
3. Every seed Stage-B semantic question N is in SeedQuestionCoordinateSet and enters P0 as semantic-question(N), together with required-dependencies-question(N).
4. Every coordinate exposed by accepted rules 1 through 12 is in the corresponding Ni(P) and is emitted as semantic-question(N), with its dependency wrapper in the same iteration.
5. Accepted rule-7 direct, event, bootstrap, K45, K49, surface, source-control, closure, technical, and late occurrence coordinates follow step 4 through their exact accepted branch-tagged paths.
6. Valid intrinsic lifecycle C: C is in AcceptedProducerLifecycleOccurrenceCandidateDomain(Q); exactly one R=(Q,lifecycle,C) emits exactly `producer-candidate-occurrence(lifecycle,C)`. Its well-formed owner resolution may identify the Q-independent intrinsic family, but ownership is not an existence premise.
7. Valid Q-local ObservationScope C: C remains in its Q-local owner-native source classification, never intrinsic identity. Exactly one R=(Q,lifecycle,C) emits exactly `producer-candidate-occurrence(lifecycle,C)`, never a scope-tagged occurrence coordinate.
8. Valid enrollment C: enrollment remains owner-native/source classification. Exactly one R emits the accepted lifecycle-tagged coordinate; no enrollment occurrence-family tag exists.
9. Valid ProducerClass C: ProducerClass remains owner-native/source classification. Exactly one R emits the accepted lifecycle-tagged coordinate; no class occurrence-family tag exists.
10. Valid source-enumeration C: source-enumeration remains owner-native/source classification. Exactly one R emits the accepted lifecycle-tagged coordinate; no source-enumeration occurrence-family tag exists.
11. Valid bootstrap lifecycle C: exactly one lifecycle R emits `producer-candidate-occurrence(lifecycle,C)`. If the accepted bootstrap branch also applies, rule 7 independently emits the distinct bootstrap-tagged coordinate. Both reference one underlying source occurrence.
12. One C in lifecycle plus any other accepted Rule-7 branch: each accepted branch coordinate remains distinct by its exact accepted tag. No branch is collapsed and no raw occurrence is duplicated.
13. Zero-owner malformed lifecycle C: accepted frozen-branch membership forms R and the lifecycle occurrence coordinate before resolution. H13ProducerLifecycleOccurrenceOwnerResolution(C)=no-unique-owner retains the malformed non-authorizing path and cannot erase the coordinate.
14. Multi-owner or duplicate-owner contradictory lifecycle C: accepted frozen-branch membership forms the same exact R and coordinate. The multiple-owner-candidates result retains all exact owner matches, selects none, and cannot erase the coordinate.
15. Unavailable or indeterminate lifecycle placeholder C: the exact accepted placeholder coordinate is representable in R. No Q-specific intrinsic placeholder is created, and failed owner resolution does not alter the lifecycle occurrence coordinate.
16. Section 9 emits q-scoped-producer-lifecycle-reference(R), semantic-question(H13ProducerLifecycleOccurrenceReferenceNodeCoordinate(R)), and required-dependencies-question for that same N in P0 or the same rule-7 expansion iteration for every case in steps 6 through 15.
17. Every canonical node, required component, state, true-or-false trigger, and RequiredDependencies question required by accepted rule 13 and Sections 22.2 through 22.4 is emitted by rule 13.
18. Newly exposed accepted coordinates re-enter rules 1 through 13 until fixed-point equality.
19. Therefore accepted RequiredNodeCoordinateSet is a subset of H13S3MemberNodeCoordinateProjection.

Both inclusions hold by accepted generation coverage. They do not depend on invented lifecycle subtype tags or on universal unique-owner success. There is no extra coordinate and no missing coordinate.

## 12. Termination and accepted bound

Let U be the accepted H13ClosedCandidateCoordinateUniverse, unchanged. Termination follows from these exact facts:

1. P0 is finite because H13EvaluationSeed, its accepted bounded raw families, explicit placeholders, lifecycle-reference projections, and SeedQuestionCoordinateSet are finite. Each seed coordinate emits a fixed two-member question-wrapper set.
2. Every legal top-level member is one of the closed H13EvaluationPopulationMember constructors in Section 8.
3. No post-freeze substantive answer, owner verdict, value, reason, state, provenance result, completeness result, or final result can enter P because there is no constructor for it.
4. No raw-family identity is generated from a Q-local verdict or result. H13ProducerIntrinsicRawFamilyCoordinate remains Q-independent. R projects Q, the already-accepted fixed tag `lifecycle`, and existing accepted C.
5. No enrollment, class, scope, or source-enumeration occurrence-family tag is created. Those source classifications therefore create no extra tag-indexed coordinate universe.
6. Every deterministic wrapper for a newly exposed coordinate N is co-emitted with N. This includes semantic-question(N) and required-dependencies-question(N) in both P0 and every expansion step.
7. A wrapper cannot cause a later strict-growth step after N is known. There is no delayed Di(P), wrapper queue, answer gate, owner-resolution gate, or pass-dependent wrapper constructor.
8. Every raw-input-family, placeholder, and lifecycle reference that becomes formable solely from a newly exposed accepted coordinate is emitted in the same atomic projection step under its accepted rule. A later source-domain expansion is legal only when it exposes at least one previously absent accepted coordinate in U.
9. Consequently, if P(n+1) differs from P(n), the difference contains at least one semantic-question(N) for a previously absent N in U. Wrappers and reference members emitted with N do not consume separate strict-growth steps.
10. Every such N is drawn from finite U. Therefore there are at most `cardinality(H13ClosedCandidateCoordinateUniverse)` strict-growth steps.
11. H13ProducerLifecycleOccurrenceReferenceNodeCoordinate(R) is the already-required accepted lifecycle-tagged coordinate in U. It does not enlarge U.
12. H13ProducerLifecycleOccurrenceOwnerResolution(C) is a closed structural classification over the exact already-retained match family. Its unique-owner, no-unique-owner, and multiple-owner-candidates results do not create an independent discovery universe, a new semantic-question coordinate, or wrapper-only iteration.
13. Changing only owner-resolution status from unique to ambiguous while Q and C remain identical leaves R, its accepted node coordinate, U, and the strict-growth bound unchanged.

No result or verdict arrival can extend the fixed point. A wrapper-only or owner-resolution-only strict-growth step is invalid. The accepted bound remains at most `cardinality(H13ClosedCandidateCoordinateUniverse)` strict-growth steps.

## 13. Stage-A, malformed/unknown, and provenance boundaries

### 13.1 Stage A

stage-a-resolved-population(C,A) remains one nested aggregate top-level seed member. Its Organization registration, boundary permission, Workspace state/overlay, source attribution, HistoricalCurrentnessQualification, rejected candidates, H02ApplicabilityPopulation, H02SideApplicabilityProjection, and ApplicablePermissionSet values are not flattened into Stage-B top-level members.

Every and only authoritative result=applicable projection creates its accepted pre-freeze literal input and Stage-B permission question coordinate. No Stage-B question, raw family, placeholder, answer, reason, or result feeds Stage A.

### 13.2 Malformed and unknown inputs

An accepted bounded malformed or unknown candidate remains inside its accepted received-candidate family or exact placeholder path. Equal repeated receipt remains inner multiplicity. For lifecycle-branch C, zero, duplicate, or multiple owner matches never delete C, R, or `producer-candidate-occurrence(lifecycle,C)`; resolution fails closed, chooses no owner, and remains non-authorizing. A received noncatalogue event-policy token remains in event-policy-token-family(slot), produces the accepted unknown/malformed trigger question, and never replaces independently-complete-source.

Unknown Core tags, parser exceptions, storage errors, arbitrary bytes, and implementation nulls create no member. They remain fail-closed under their owning accepted H-13/H-10 boundary.

### 13.3 Provenance

The 71 ProvenanceNodeType tokens, NodeSemanticCoordinate grammar, QuestionKey grammar, RequiredDependencies tables, trigger populations, dependency edges, and validation reasons remain unchanged.

Population questions plan the node inventory before answers are resolved. Candidate ProvenanceNode occurrence multiplicity is separate from top-level population set membership and separate from inner raw-family multiplicity.

## 14. Hostile cases

### 14.1 Pre-freeze cases

| Case | Input | Required result |
|---|---|---|
| PF01 | same frozen population; one F result changes pass to fail | H13EvaluationPopulationMembers identical |
| PF02 | same pre-freeze inputs; SubstantiveGateDecision changes | population identical |
| PF03 | same pre-freeze inputs; SemanticReasonSet changes | population identical |
| PF04 | same pre-freeze inputs; ProducerIndependence result changes | population identical |
| PF05 | accepted absent/ambiguous placeholder required before resolution | exact allowed pre-freeze-placeholder remains in P |
| PF06 | required dynamic source unresolved | exact semantic-question plus its accepted unavailable/indeterminate placeholder; no null |
| PF07 | implementation inserts resolved substantive-gate-decision value | nonconforming; no constructor |
| PF08 | implementation inserts post-freeze baseline verdict | nonconforming; no constructor |
| PF09 | equal pre-freeze inputs; clean-room implementations later derive different adverse results | frozen populations equal; later outputs require correctness review |
| PF10 | later reason, provenance, completeness, or final result arrives | no strict-growth step |

### 14.2 Q-independent lifecycle cases

| Case | Input | Required result |
|---|---|---|
| QL01 | Q1 and Q2 consume the same ProducerIdentity/PU | one producer-intrinsic-family coordinate |
| QL02 | same raw activation event consumed by Q1 and Q2 | source multiplicity unchanged; no duplicate family |
| QL03 | implementation constructs a Q-scoped producer-lifecycle raw family | invalid; only the non-owning producer-lifecycle-reference use exists |
| QL04 | intrinsic lifecycle family appears through producer-intrinsic-family and raw-node-family | invalid alias and double-count |
| QL05 | Q-local binding or scope changes without accepted intrinsic lifecycle change | intrinsic coordinate and Q-independent source identity unchanged; only affected Q-local coordinates change |
| QL06 | accepted restart/replacement changes the PU family | one changed Q-independent family observed by every Q consumer |
| QL07 | Q1 references intrinsic lifecycle family L and Q2 references the same L | one Q-independent raw family L; two lifecycle references where applicable; no duplicated inner family |
| QL08 | Q1 disappears while Q2 remains | L identity and multiplicity unchanged; Q2 reference remains |
| QL09 | Q3 becomes a consumer of already-frozen L through accepted bounded expansion | no new intrinsic raw family; Q3 receives its accepted lifecycle reference projection |
| QL10 | implementation includes Q or ObservationScope in H13ProducerIntrinsicRawFamilyCoordinate | invalid and nonconforming |
| QL11 | lifecycle evidence appears in both producer-intrinsic-family and raw-node-family | invalid alias and double owner |
| QL12 | Q-scoped lifecycle projection allocates ProducerIncarnation or changes ProducerIntrinsicContinuity | invalid; reference has no such authority |

### 14.3 Raw-family closure and multiplicity cases

| Case | Input | Required result |
|---|---|---|
| RF01 | two implementations receive equal source-boundary semantics | equal H13SourceEnumerationBoundaryCoordinate |
| RF02 | one adds provider/storage/source-order detail | invalid extra component; coordinate unchanged under legal grammar |
| RF03 | one omits an equality-bearing source component | invalid coordinate |
| RF04 | derived substantive node offered as raw-node-family coordinate | invalid; not in H13RawInputNodeCoordinate |
| RF05 | raw IAA input at its exact accepted coordinate | exactly one legal raw-node-family owner |
| RF06 | one owner-native raw family referenced by several semantic questions | one raw family; references do not change source count |
| RF07 | unequal H13DirectSourceDomainCoordinate components | unequal H13DirectSourceDomainCoordinate values |
| RF08 | implementation requests a fallback source-domain branch | invalid; no fallback branch |
| RF09 | same raw C participates in lifecycle, surface, and K49 accepted branches | three exact accepted branch coordinates where applicable; one underlying raw occurrence and unchanged multiplicity |
| RF10 | two equal owner-row match occurrences exist for C | multiple-owner-candidates; duplicates retained; no owner selected |

### 14.4 Seed and expansion dependency-wrapper cases

| Case | Input | Required result |
|---|---|---|
| SD01 | seed semantic question N is present in P0 | required-dependencies-question(N) is present in the same P0 |
| SD02 | seed N is known at P0 but dependency wrapper is delayed until P1 | invalid generation |
| SD03 | expansion discovers N at iteration k | semantic-question(N) and required-dependencies-question(N) both enter at k |
| SD04 | no new accepted coordinate is discovered, but an implementation adds a delayed wrapper | invalid; not a legal strict-growth step |
| SD05 | two clean-room implementations receive equal seed semantic inputs in different enumeration orders | identical P0, including all dependency wrappers |
| SD06 | owner resolution changes after R and N are formable | no wrapper-only or owner-resolution-only iteration; R and N were already emitted |

### 14.5 Cross-repair and fixed-point cases

| Case | Input | Required result |
|---|---|---|
| X01 | Q1/Q2 consume one PU family; later substantive results differ | one Q-independent raw family; identical frozen membership for that source |
| X02 | raw family multiplicity two; referenced by three questions; one later consumer fails | inner count two, reference count three, no failure-created member |
| X03 | post-freeze F result becomes contradictory | no P growth |
| X04 | one equality-bearing component of a source boundary changes | new unequal raw-family coordinate |
| X05 | only storage/provider/arrival metadata changes | legal coordinate and P remain equal |
| X06 | final SubstantiveGateDecision changes with equal pre-freeze inputs | H13EvaluationPopulationMembers equal |
| X07 | repaired member projection evaluated | exactly equal to accepted RequiredNodeCoordinateSet |
| X08 | late accepted lifecycle C appears on the final coordinate-discovery step | lifecycle R, semantic question, and dependency wrapper co-emitted before equality can hold |
| X09 | equal accepted inputs discovered in different orders | equal H13EvaluationPopulationMembers, RequiredNodeCoordinateSet, and fixed-point result |
| X10 | termination proof evaluated with seed wrappers and lifecycle references co-emitted | at most cardinality(H13ClosedCandidateCoordinateUniverse) strict-growth steps |

### 14.6 Accepted occurrence-family tag vectors

| Case | Input | Required result |
|---|---|---|
| TAG01 | C is a valid Q-local ObservationScope candidate at Q1 | exact `producer-candidate-occurrence(lifecycle,C)`; no scope occurrence-family tag |
| TAG02 | C is a Producer enrollment candidate in the lifecycle branch | exact accepted tag `lifecycle`; no enrollment occurrence-family tag |
| TAG03 | C is a ProducerClass candidate in the lifecycle branch | exact accepted tag `lifecycle`; no class occurrence-family tag |
| TAG04 | C is a source-enumeration candidate in the lifecycle branch | exact accepted tag `lifecycle`; no source-enumeration occurrence-family tag |
| TAG05 | the same raw C participates in lifecycle and another accepted Rule-7 branch | exact `(lifecycle,C)` and exact `(other accepted branch,C)` coordinates; distinct accepted branches preserved; one underlying owner-native raw occurrence |

### 14.7 Lifecycle owner/reference vectors

| Case | Input | Required result |
|---|---|---|
| OWN01 | valid intrinsic activation C | lifecycle R exists; exactly one intrinsic owner; Q remains outside intrinsic identity |
| OWN02 | valid Q-local ObservationScope C | lifecycle R exists; exactly one Q-local owner-native owner; no intrinsic owner |
| OWN03 | valid bootstrap lifecycle C | lifecycle R exists; exact bootstrap owner; bootstrap-tagged coordinate also exists when that accepted branch applies; one underlying source occurrence |
| OWN04 | C matches zero owner rows | lifecycle R and accepted lifecycle producer-candidate-occurrence node still exist; no-unique-owner; no owner guessed; malformed non-authorizing path |
| OWN05 | C matches two owner rows | lifecycle R and accepted lifecycle producer-candidate-occurrence node still exist; multiple-owner-candidates; no owner selected; contradiction or ambiguity retained |
| OWN06 | unavailable/indeterminate accepted placeholder C | lifecycle reference coordinate remains representable under exact accepted placeholder semantics; no Q-specific intrinsic placeholder |
| OWN07 | one intrinsic C is consumed by Q1 and Q2 | one intrinsic raw family; two lifecycle references where applicable; raw multiplicity unchanged |
| OWN08 | the same owner row is duplicated for C | multiple-owner-candidates retains duplicate match multiplicity; no deduplication into unique-owner |
| OWN09 | owner candidates are returned in different discovery orders | identical match family as an unordered owner-retained occurrence family, identical resolution class, and no selected owner when cardinality exceeds one |

### 14.8 RequiredNodeCoordinateSet equivalence vectors

| Case | Input | Required result |
|---|---|---|
| EQ01 | valid intrinsic lifecycle C | exact accepted lifecycle-tagged coordinate is in H13S3MemberNodeCoordinateProjection |
| EQ02 | valid enrollment, ProducerClass, or source-enumeration lifecycle C | exact accepted lifecycle-tagged coordinate is projected; subtype remains only source classification |
| EQ03 | Q-local ObservationScope C | projects exactly `producer-candidate-occurrence(lifecycle,C)`, not a scope-tagged coordinate |
| EQ04 | zero-owner malformed lifecycle C | exact lifecycle-tagged coordinate remains in RequiredNodeCoordinateSet |
| EQ05 | multi-owner contradictory lifecycle C | exact lifecycle-tagged coordinate remains in RequiredNodeCoordinateSet |
| EQ06 | owner resolution changes from unique to ambiguous while Q, accepted tag, and C are unchanged | raw lifecycle occurrence coordinate remains unchanged; only later non-authorizing ownership interpretation differs |
| EQ07 | unavailable/indeterminate lifecycle placeholder | exact accepted placeholder-based lifecycle coordinate is projected without a Q-specific intrinsic placeholder |
| EQ08 | one C participates in lifecycle and bootstrap | both accepted coordinates are present and reverse inclusion counts neither as an invented tag |

### 14.9 Production-grade clean-room determinism matrix

| Dimension | Required equal-input result |
|---|---|
| valid input | equal references, unique-owner results, raw multiplicity, RequiredNodeCoordinateSet, and fixed point |
| malformed zero-owner input | equal retained C/R/node values and no-unique-owner classification |
| ambiguous or contradictory multi-owner input | equal retained match family, multiple-owner-candidates classification, and no selected owner |
| duplicate ownership | equal duplicate match multiplicity and multiple-owner-candidates classification |
| unavailable placeholder | equal exact accepted placeholder coordinate and no Q-specific intrinsic placeholder |
| same C in several Rule-7 branches | equal accepted branch-tagged coordinate set and one raw occurrence |
| same intrinsic source referenced by several Q values | one equal intrinsic raw family and one equal lifecycle R per applicable Q |
| Q-local scope change | only exact Q-local source/reference consequences change; intrinsic identity and unrelated Q values do not |
| bootstrap overlap | lifecycle and bootstrap coordinates coexist; bootstrap source multiplicity remains one |
| late discovery | same-step question/dependency/reference co-emission and equal least fixed point |
| discovery-order variation | equal H13EvaluationPopulationMembers and owner-resolution classification |
| exact set equality | both RequiredNodeCoordinateSet inclusions hold |
| fail-closed behavior | no guessed owner, no selected conflicting owner, no deleted required coordinate, and no authorization from failure |

Given identical accepted semantic facts, two independent clean-room implementations must derive exactly equal H13EvaluationPopulationMembers, accepted occurrence-family tags, lifecycle reference coordinates, owner-resolution classifications including retained duplicate multiplicity, raw-family multiplicity, RequiredNodeCoordinateSet, and fixed-point termination behavior. Any implementation-dependent tag, subtype, owner choice, preference, or ordering is nonconforming and requires revision; it cannot be supplied by an implementation convention.

## 15. Nonregression audit

| Accepted semantic area | Revision 5 effect |
|---|---|
| H-02 applicability | unchanged; Stage A remains authoritative and frozen before Stage B |
| Organization permission authority | unchanged |
| Workspace narrowing | unchanged |
| IAA authority | unchanged; no direct-source authority is added |
| MeasurementTarget | unchanged |
| Producer identity | unchanged; R references the accepted identity projected by C |
| ProducerIncarnation | unchanged; R cannot allocate or replace one |
| ProducerActivationIncarnation | unchanged |
| ProducerObservationMechanismIncarnation | unchanged |
| ProducerReportMechanismIncarnation | unchanged |
| ProducerIntrinsicContinuity | unchanged and Q-independent |
| separately Q-local ObservationScope | unchanged and Q-local; never inserted into intrinsic equality |
| ProducerSourceSurfaceBinding | unchanged |
| baseline universe | unchanged and verdict-independent |
| lifecycle universe | unchanged and verdict-independent |
| bootstrap source authority | unchanged |
| binding baseline semantics | unchanged |
| binding lifecycle semantics | unchanged |
| positive IAA binding conclusion | unchanged |
| binding causality | unchanged |
| binding freshness/currentness | unchanged |
| RelevantProducerSet | accepted lifecycle occurrence completeness is total across valid and malformed retained C; set meaning is unchanged |
| coupling | unchanged |
| threat domain | unchanged |
| source-control | unchanged |
| ProducerIndependence | unchanged |
| event coverage | unchanged |
| ClosureStateCut | unchanged |
| freshness | unchanged |
| H-11 currentness ownership | unchanged |
| privacy | unchanged |
| equivalence | unchanged |
| shared governance | unchanged |
| F01-F16 | unchanged |
| reasons 001-036 | unchanged |
| reason precedence | unchanged |
| provenance node vocabulary | all 71 accepted tokens unchanged |
| provenance dependencies | unchanged |
| RequiredRecordSet | unchanged |
| RequiredDerivationInventory | unchanged |
| ResultCompletenessGate | unchanged |
| CurrentUseDisposition | unchanged |
| IsolationGateDecision | unchanged |
| ConnectionIsolationEvaluation | unchanged |
| one exact Connection authority-use scope | unchanged |

The Q-independent proof is structural: H13ProducerIntrinsicRawFamilyCoordinate contains only ProducerLifecycleEvaluationCoordinate and ProducerIntrinsicInputClass; its grammar rejects Q, ObservationScope, Q-local binding, event, coupling, threat, source-control, and result components. Every Q-local lifecycle member carries only R=(Q,lifecycle,C). Owner resolution is separate and cannot alter R. A well-formed intrinsic C resolves to L; a well-formed Q-local ObservationScope resolves to its exact owner-native raw-node family; a malformed C selects no owner. Because R is excluded from H13RawInputFamilyCoordinate and carries no family payload, it cannot reintroduce Q-local intrinsic identity or duplicate evidence.

The preserved wrapper repair remains non-substantive. semantic-question(N) and required-dependencies-question(N) contain the same accepted N, carry no answer, and change no RequiredDependencies definition. Co-emission fixes when the already-required population wrappers appear without changing accepted dependency or result meaning. Owner-resolution status cannot delay either wrapper.

PROVENANCE_DEPENDENCIES_CHANGED=NO
REASON_CODES_CHANGED=NO
SUBSTANTIVE_H13_S2_SEMANTICS_CHANGED=NO
ACCEPTED_RULE7_TAG_DOMAIN_CHANGED=NO
OWNER_SELECTION_RULE_ADDED=NO
H02_TRUST_SEMANTICS_ADDED=NO
H10_H11_MECHANICS_ADDED=NO

## 16. H-02-S2 handoff

A later H-02-S2 revision can mechanically distinguish:

- each of the ten legal outer member constructors;
- every pre-freeze literal input branch;
- every raw-family coordinate branch and its legal one-owner row;
- the dedicated Q-scoped accepted-lifecycle reference path from its independent owner-resolution result;
- unique-owner, no-unique-owner, and multiple-owner-candidates without deleting the reference;
- every explicit accepted pre-freeze placeholder branch;
- every exact semantic-question NodeSemanticCoordinate; and
- top-level set cardinality from inner owner-defined occurrence multiplicity.

The Q-local reference path lets a later H-02 classifier distinguish the consumer path without changing H-13 raw-family identity. H-13-S3 defines no Trust direct/empty classifier, reference-family multiplicity rule, result, controller, presentation mapping, H-10 domain, H-11 result, D1 requirement, or D2 schema. Revision 5 does not authorize or perform H-02-S2 Revision 11 work.
