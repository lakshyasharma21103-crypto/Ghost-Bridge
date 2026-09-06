# H-02-S2 — Experimental Isolation Trust Verification Result Semantics

## Accepted governance record

STATUS=ACCEPTED
DECISION=H-02-S2
REVISION=13
SUPPLEMENTS=H-02-S1

ACCEPTED=YES
INTEGRATED=NO
ACCEPTANCE_DATE=2026-09-06
APPROVER=Lakshya Sharma (`lakshyasharma21103-crypto`)
ACCEPTED_REVISION=13

INDEPENDENT_HOSTILE_REVIEW=PASS
INDEPENDENT_REVIEW_BLOCKERS=0
INDEPENDENT_REVIEW_MAJORS=0
INDEPENDENT_REVIEW_MINORS=0
HUMAN_ACCEPTANCE_RECOMMENDED=YES
REVISION_14_REQUIRED=NO

BASELINE=main@9cd0929454ba18d48651fc56f2ddf2fa6c299545

ACCEPTED_PROPOSAL_SOURCE_SHA256=cf6ebaec7d1ff2299cbdf92da8675c6e4e92852c9aeb1f685168e744757a2e02
ACCEPTED_PROPOSAL_SOURCE_BYTES=479509
ACCEPTED_PROPOSAL_SOURCE_LF_LINES=4364

H13_S3_DEPENDENCY_SATISFIED=YES

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

### Acceptance and review record

- Decision ID: H-02-S2
- Parent/supplemented decision: H-02-S1 — Experimental Isolation Roles and Evidence Authority
- Accepted revision: Revision 13
- Human acceptance date: 2026-09-06
- Approver: Lakshya Sharma (`lakshyasharma21103-crypto`)
- Independent hostile review: PASS
- Blockers: 0
- Majors: 0
- Minors: 0
- Revision 14 required: No

### Exact human acceptance

> I explicitly accept the H-02-S2 semantic decision in PROPOSED-H-02-S2 Revision 13.

That statement is the human-governance act accepting the semantic decision
reviewed in the exact proposal source identified above. It does not itself
integrate the decision into canonical `main` and does not authorize
implementation, schema work, D1, D2, conformance, interoperability,
production readiness, release, or Protocol 1.0.

### Independent hostile-review disposition

H02_S2_R13_INDEPENDENT_HOSTILE_REVIEW=PASS

BLOCKERS=0
MAJORS=0
MINORS=0

R12_B_001_CURRENT_AUTHENTICATION_SUBJECT_POPULATION_STALE_STAGE_B_FAILURE_RULE=CLOSED

R11_B_001_SPECIFIC_VS_GENERIC_SOURCE_COORDINATE_PRECEDENCE_NOT_CLOSED=CLOSED
R11_B_002_EMPTY_RAW_FAMILY_CLASSIFIER_NOT_TOTAL=CLOSED
R3_B_001_RAW_OCCURRENCE_KEY_NATIVE_PROJECTION_UNCLOSED=CLOSED

R9_B_002=CLOSED
R8_B_003=CLOSED
R7_B_002_STAGE_B_REMAINDER=CLOSED
R6_B_003_STAGE_B_REMAINDER=CLOSED

CURRENT_POPULATION_USES_D1_D4=YES
STAGE_B_REFERENCE_GENERATION_SUPPORTED=YES
STAGE_B_FORCED_UNSUPPORTED_FAILURE=NO
SECTION_5_4_FORMAL_PROSE_EQUIVALENT=YES
SECTION_5_5_CONSUMES_SAME_REFERENCE_POPULATION=YES

CROSS_SECTION_CONTRADICTION_COUNT=0
UPSTREAM_CONFLICT_COUNT=0

HUMAN_ACCEPTANCE_RECOMMENDED=YES
REVISION_14_REQUIRED=NO

### Integration and historical-record boundary

The semantic body below is preserved from the exact independently reviewed
and human-accepted Revision 13 proposal source.

Pre-acceptance phrases retained inside the preserved review ledger and
self-review — including wording such as `CLOSED IN THIS PROPOSAL`,
`INDEPENDENT REVIEW STILL REQUIRED`, or statements that the self-review
itself does not create human acceptance — are historical proposal-state
evidence. They do not override this accepted governance record.

Integration remains a separate repository-governance event. Until the
accepted record is separately reviewed, merged, and post-merge verified:

H02_S2_INTEGRATED=NO

No implementation or downstream release gate is authorized by this
acceptance record.

Revision 13 closes only the controlling Revision 12 hostile-review blocker. It deletes Section 5.4's stale rule that excluded Table 2-D4 from the current authentication-subject population and forced the Stage-B reference component to fail. The current population now consumes the same total Tables 2-D1 through 2-D4 reference-generation function already defined by Section 2.1, Table 2-D4, Section 4.4, and Section 5.5. Revision 13 preserves Revision 12's closed typed D/x dispatch, neutral empty raw-family classification, ten outer constructors, fixed point, Stage-A nesting, inner owner-native multiplicity, separate reference multiplicity, lifecycle resolution, historical-question, mapping-event, Trust nonauthority, two-side, privacy, and H-10/H-11 boundary repairs unchanged. No accepted H-13 value, equality, population member, fixed-point rule, source occurrence, authority, or implementation mechanism is created or changed.

The two H-02-S1 Trust-result presentation classes remain:

- `trust-isolation-governance-result`; and
- `trust-isolation-current-result`.

Nothing here changes Organization permission, Workspace narrowing, IAA measured-fact authority, H-07 Connection authority, H-13 isolation evaluation, Invocation authorization, policy, or enforcement.

## Exact source baseline

Read-only preflight, blob verification, and complete rereading established:

```text
canonical repository = lakshyasharma21103-crypto/Ghost-Bridge
origin/main = 9cd0929454ba18d48651fc56f2ddf2fa6c299545

H-02 parent blob = 154aa204d90171082f0d3ad141f0b4d4598b410f
H-02-S1 blob = 21604f71da8d0248980f959583dda170ae90bdb5
H-13-S2 blob = b0b312a4f143daa1ae86f29a8c0e6bd07b223ca4
H-13-S3 blob = 8a22c69a6c60db5a30f28399d7ce6e014f251ee6
H-10 blob = d1ec222f0d842a5fc2fc2f2793b38a1eb21153d4
H-11 blob = 06a68d13eecc0bc28b8d8ae790ac47f3cb16bdce
H-07 accepted blob = cfae912d6303a57b194f6a1f3ca9e6c5137022ce

Revision 2 SHA-256 = f3cba94269c40a506576953716c255a5f861e350f34219d078c58d49445772ab
Revision 2 bytes = 90241
Revision 2 LF-terminated lines = 1339
Revision 2 UTF-8 without BOM = yes
Revision 2 exactly one final LF = yes
Revision 2 CR/NUL/tab/trailing-whitespace counts = 0/0/0/0

Revision 3 source SHA-256 = f9d436fc74f8554a8258ecdf4e8d3e147e5f26f570b4b05fb44780f0aad93a26
Revision 3 source bytes = 118924
Revision 3 source LF-terminated lines = 1615
Revision 3 source title = known reviewed mojibake form
Revision 3 source identity = exact independently reviewed artifact

Revision 4 source SHA-256 = 5eed6f2d496771b08b979285bcf190564c4c21583450836dc3cad6fece8134a0
Revision 4 source bytes = 140761
Revision 4 source LF-terminated lines = 1824
Revision 4 source UTF-8 without BOM = yes
Revision 4 source exactly one final LF = yes
Revision 4 source CR/NUL/tab/trailing-whitespace counts = 0/0/0/0

Revision 5 source SHA-256 = b9a93b072d0e398a0824bfe5ef44c6aa5d5d8b9d8886dde98f4b4de9c0e9b271
Revision 5 source bytes = 197397
Revision 5 source LF-terminated lines = 2209
Revision 5 source UTF-8 without BOM = yes
Revision 5 source exactly one final LF = yes
Revision 5 source CR/NUL/tab/trailing-whitespace counts = 0/0/0/0

Revision 6 reviewed LF-normalized source SHA-256 = f7cae2d8f6c32a1d67f25bac8b0f4592a7471d72468b17213b873d0e5b04ff55
Revision 6 reviewed LF-normalized source bytes = 253655
Revision 6 reviewed LF-terminated lines = 2617
Revision 6 source UTF-8 without BOM = yes
Revision 6 source exactly one final LF = yes
Revision 6 source CR/NUL/tab/trailing-whitespace counts = 0/0/0/0

Revision 7 independently reviewed transport bytes = 298112
Revision 7 independently reviewed transport SHA-256 = 5e8a11818f94cc064acc75f6f8f62be2a9d3d27121fc6c6dc7163be30672afd9
Revision 7 independently reviewed transport line endings = CRLF
Revision 7 LF-normalized source SHA-256 = c27eb2daaa006315013476b9c1ea0a7a4c9488c29cf78562457ce54a0afe0b7a
Revision 7 LF-normalized source bytes = 295217
Revision 7 LF-terminated lines = 2895
Revision 7 UTF-8 without BOM = yes
Revision 7 exactly one final LF = yes
Revision 7 normalized CR/NUL/tab/trailing-whitespace counts = 0/0/0/0

Revision 8 independently reviewed transport bytes = 329557
Revision 8 independently reviewed transport SHA-256 = 737e90ac14e3d07131509cd4337697f2dfd67ed8753d954b501a6fa05f6906b0
Revision 8 independently reviewed transport line endings = CRLF
Revision 8 LF-normalized source SHA-256 = bbc526741f95f17ba256682394f989b58b712be1fe209cfa151fc5dd947f0aa4
Revision 8 LF-normalized source bytes = 326433
Revision 8 LF-terminated lines = 3124
Revision 8 UTF-8 without BOM = yes
Revision 8 exactly one final LF = yes
Revision 8 normalized CR/NUL/tab/trailing-whitespace counts = 0/0/0/0

Revision 9 independently reviewed transport bytes = 361962
Revision 9 independently reviewed transport SHA-256 = 1d70036fb078362882e26922c03967b5c2b1c30ec15aec3884c2b9663955ca85
Revision 9 independently reviewed transport line endings = CRLF
Revision 9 LF-normalized source SHA-256 = ef6547148f9d1cca087b19a9d1ea1f86327913fe3bf53826e121187ee9be72cc
Revision 9 LF-normalized source bytes = 358638
Revision 9 LF-terminated lines = 3324
Revision 9 UTF-8 without BOM = yes
Revision 9 exactly one final LF = yes
Revision 9 normalized CR/NUL/tab/trailing-whitespace counts = 0/0/0/0

Revision 10 LF-normalized source SHA-256 = c38e0cef1e025bf455f717f9af7504a8a3612a8db16a6509063fde286908c75a
Revision 10 LF-normalized source bytes = 370578
Revision 10 LF-terminated lines = 3510
Revision 10 UTF-8 without BOM = yes
Revision 10 exactly one final LF = yes
Revision 10 normalized CR/NUL/tab/trailing-whitespace counts = 0/0/0/0
Revision 10 mojibake-sequence count = 0
Revision 10 Markdown transport-escape count = 0

Revision 11 source SHA-256 = 2d92f63cfce093035faffbd72a8ea45cece860e1e97c1deedc5f5f0f7453a406
Revision 11 source bytes = 410695
Revision 11 source LF-terminated lines = 3896
Revision 11 source UTF-8 without BOM = yes
Revision 11 source exactly one final LF = yes
Revision 11 source CR/NUL/tab/trailing-whitespace counts = 0/0/0/0
Revision 11 source mojibake-sequence count = 0
Revision 11 source Markdown transport-escape count = 0

Revision 12 source SHA-256 = 227ee608f14c2df8b1fdc494173dc81b550e0884fc76274dab2de8a6423a1995
Revision 12 source bytes = 461216
Revision 12 source LF-terminated lines = 4237
Revision 12 source UTF-8 without BOM = yes
Revision 12 source exactly one final LF = yes
Revision 12 source CR/NUL/tab/trailing-whitespace counts = 0/0/0/0
Revision 12 source mojibake-sequence count = 0
Revision 12 source Markdown transport-escape count = 0
```

Revision 12 is the exact nonauthoritative repair base. Its bytes exactly satisfy the identity and hygiene values above. Earlier reviewed sources retain their recorded identities. Every previously valid closure is preserved except that the controlling independent Revision 12 review reopened the current-population consumption of the already-total Stage-B reference classifier to the bounded extent stated below. Accepted H-13-S3 remains structural authority only for the Stage-B member grammar, raw-family grammar, lifecycle-reference boundary, placeholders, equality, multiplicity, and fixed-point typing consumed below.

## Controlling Revision 12 hostile-review disposition and Revision 13 scope

The controlling independent Revision 12 result was `H02_S2_R12_INDEPENDENT_HOSTILE_REVIEW=FAIL`: one blocker, zero majors, and zero minors. `R12_B_001_CURRENT_AUTHENTICATION_SUBJECT_POPULATION_STALE_STAGE_B_FAILURE_RULE` found that Section 5.4's operative tuple still limited required reference generation to Tables 2-D1 through 2-D3 and forced the Stage-B population reference component to fail under Table 2-D4. That rule contradicted the total Tables 2-D1 through 2-D4 classifier already defined elsewhere and could force a valid Stage-B record to fail. Revision 13 repairs exactly that stale current-population rule and its direct nonregression consequences.

| Finding | Controlling disposition | Revision 13 disposition/location |
|---|---|---|
| `R12_B_001_CURRENT_AUTHENTICATION_SUBJECT_POPULATION_STALE_STAGE_B_FAILURE_RULE` | BLOCKER | CLOSED by the Section 5.4 total Tables 2-D1 through 2-D4 population, its exact equivalence with Section 5.5, the DAG, CR13-01 through CR13-12, and the ledger/self-review |
| `R11_B_001_SPECIFIC_VS_GENERIC_SOURCE_COORDINATE_PRECEDENCE_NOT_CLOSED` | CLOSED in Revision 12 | PRESERVED by `R12H13RawSourceDispatchOf`, Tables 2-A0/2-A1, and SG01-SG39 |
| `R11_B_002_EMPTY_RAW_FAMILY_CLASSIFIER_NOT_TOTAL` | CLOSED in Revision 12 | PRESERVED by `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY`, the eight-branch and twenty-subtype audit, and EF01-EF38 |
| `R3_B_001_RAW_OCCURRENCE_KEY_NATIVE_PROJECTION_UNCLOSED` | CLOSED again in Revision 12 | PRESERVED by the single typed dispatch and alias/nonordering proof |
| `R9_B_002`, `R8_B_003`, `R7_B_002` Stage-B remainder, `R6_B_003` Stage-B remainder | REOPENED only to the stale Section 5.4 consumer | CLOSED again only after the Section 5.4 repair and the dependent proofs in Sections 10, 13, and 14 |

Only `R12_B_001` and its exact reopened consequences above are repaired. `R11_B_001`, `R11_B_002`, `R3_B_001`, the original answer-feedback direction of `R8_B_001`, the singular mapping-event repair for `R8_B_002`, deterministic MAP16, and every other sound Revision 12 construction remain closed and unchanged.

## Preserved constitutional boundary

Accepted H-02-S1 R8-05 remains literal. A Trust verification service may issue only bounded verification result/evidence statements about roots, proofs, keys, purpose, currentness, rollback/history, and context binding. A Trust result is evidence for an enforcer. It is not:

```text
Organization permission
Workspace permission
IAA measurement truth
Connection authority
Invocation authorization
policy ALLOW
```

Accepted R8-03 remains the source boundary for Organization isolation governance. This proposal adds only a context-scoped appointment of the already accepted R8-05 Trust role. Appointment does not create an IAA, boundary permission, Workspace grant, measurement proposition, Connection state, authorization, or ALLOW.

Accepted R8-04 remains literal: Workspace authority is narrowing-only and receives no new narrowing dimension from this supplement. Every already accepted Workspace/policy narrowing continues independently. A Workspace cannot appoint a Trust controller, create a positive role occupant, widen its context, or resurrect a retired/revoked/compromised occupant.

Accepted R8-28 remains literal: Trust verification creates neither permission nor measurement truth. Accepted R8-37 remains literal: every current isolation result used in an authority decision binds one exact authoritative Connection and cannot be replayed to another. Accepted R8-42 and R8-43 remain literal: the proof chain is acyclic, each new proof is a new creation event, creation authority is evaluated at that event's own H-11-qualified materialization interval, and later history cannot repair unauthorized creation. Accepted R8-30 through R8-36 remain the privacy floor.

H-13's `ConnectionIsolationEvaluation` remains the sole H-13 structural isolation evaluation. It has structural equality, no allocated identity, no lifecycle, no permission, and no authority. The Connection-level Trust relation added in Section 5.7 consumes H-13; it does not create, edit, rerun, or override H-13 isolation truth.

## Semantic conventions

Unless an owning accepted record says otherwise:

1. Tuple equality is componentwise exact semantic equality.
2. Tagged-union equality requires an equal tag and equal carried values.
3. Finite-set equality is mathematical set equality; order and multiplicity are absent.
4. An occurrence family is an unordered finite multiplicity function from exact semantic occurrence values to natural-number counts. It preserves equal repetitions before set projection.
5. Display equality, bytes, provider labels, `kid`, thumbprints, signatures, digests, arrival order, database keys, local aliases, and current pointers create no semantic equality or authority.
6. Every repeated accepted component is universally projection-coherent. Unequal repeated projections are contradictory; no source wins.
7. `absent` is a tag. It is not `null`, empty text, a wildcard, a default, a missing occurrence, or an inferred value.
8. Each result defined here is an immutable structural value and receives no allocated protocol identity.
9. A content author, a raw-source owner, a Trust-role appointing authority, a Trust result-body semantic controller, a cryptographic proof author, a historical-currentness source, and an enforcer are distinct roles unless an accepted rule explicitly says otherwise. Co-location does not merge them.
10. A verifier component is a derived consumer of raw semantic occurrences. It never creates, keys, duplicates, deletes, or supplies the raw occurrence it evaluates.

# 1. Trust isolation verification authority and role occupancy

## 1.1 Accepted-source audit

No accepted relation already appoints a concrete controller to the R8-05 Trust-verification role.

- R8-05 defines the role's bounded output and nonauthority but no service identity, allocator, appointment, or lifecycle.
- R8-34 makes `Trust verification service` the positive presentation-mapping owner for the two result classes but does not identify which service occupies that role.
- H-10 authenticates an already selected semantic signer/key/purpose/context. Its accepted rule that cryptographic validity is not authorization forbids using key possession as appointment.
- H-11 bootstraps and history-qualifies already authorized issuer/security-authority subjects. Its accepted Option D discussion is unselected, and its accepted bootstrap metadata does not appoint an H-02 Trust verifier.

Therefore projecting an accepted relation into the Trust role is impossible without inventing a source. Sections 1.2 through 1.9 retain the minimum bounded H-02 relation from Revision 2 and apply accepted R8-43 proof-creation authority uniformly. The relation supplements R8-03 only for role appointment; it does not alter R8-03's measurement-truth prohibition or R8-04's narrowing-only rule.

## 1.2 Logical role coordinate retained

```text
TrustIsolationVerificationAuthorityCoordinate = (
  exact ExactTenantContext,
  purpose = experiment-isolation,
  authorityRole = Trust-verification-service
)
```

This is a structural role coordinate, not an identity. Equality is exact tuple equality. It has no allocator, alias, lifecycle, key, provider label, or presentation carrier. Unequal `ExactTenantContext` values always produce unequal coordinates.

## 1.3 Context-private semantic controller identity

```text
TrustIsolationServiceControllerIdentity = (
  exact ExactTenantContext,
  organizationAllocatedContextPrivateTrustControllerLineageIdentity
)
```

Positive allocator: exact Organization authority for the Organization embedded in `ExactTenantContext`.

The allocated lineage value is unique inside that exact context, immutable, nonreassignable, nonrecyclable, and never an H-10 key identifier, thumbprint, proof identifier, provider name, process identifier, endpoint, or public label. The same physical or independently operated service used in two unequal tenant contexts receives two unequal controller identities. A replacement controller receives a new identity. Retirement never frees the old identity for reuse.

Allocation names a semantic controller only. It does not attest independence, honesty, availability, key possession, isolation truth, permission, or Connection authority.

## 1.4 Single-slot Trust-role authorization subject and revisions

The stable authorization subject is the role slot itself:

```text
TrustIsolationRoleAuthorizationSubjectIdentity = (
  exact TrustIsolationVerificationAuthorityCoordinate
)

TrustIsolationRoleAuthorizationRevisionIdentity = (
  exact TrustIsolationRoleAuthorizationSubjectIdentity,
  organizationAllocatedNonrecyclableAuthorizationRevisionIdentity
)
```

The exact Organization authority allocates each revision identity and authors one immutable revision value:

```text
TrustIsolationRoleAuthorizationRevisionSemantics = (
  exact TrustIsolationRoleAuthorizationSubjectIdentity,
  exact TrustIsolationRoleAuthorizationRevisionIdentity,
  occupant =
    present(exact TrustIsolationServiceControllerIdentity)
    | vacant,
  authorizationScope = (
    exact ExactTenantContext,
    purpose = experiment-isolation,
    authorityRole = Trust-verification-service,
    permittedResultClasses = {
      trust-isolation-governance-result,
      trust-isolation-current-result
    }
  ),
  predecessorRevision = absent | present(exact prior revision identity),
  exact claimed effective interval
)
```

Every repeated context/purpose/role value must equal the stable subject and controller context. `permittedResultClasses` is the fixed two-member set above; it is not deployment-selectable and authorizes no other statement. A `present` revision appoints that one controller to the exact role slot. A `vacant` revision removes the occupant. Claimed interval content cannot establish currentness.

There is exactly one stable role-authorization subject for one role coordinate. This single-slot design closes occupant cardinality without an implementation-selected registry, preferred service, or negative enumeration over unknown providers.

## 1.5 Current and historical occupancy

```text
TrustIsolationRoleAuthorizationQualification = (
  exact TrustIsolationRoleAuthorizationRevisionSemantics,
  qualificationQuestion =
    current-use(exact AuthorityUseCut)
    | historical-assessment(
        exact TrustIsolationHistoricalQuestionFor(
          role-authorization-revision-caller(
            exact TrustIsolationRoleAuthorizationRevisionSemantics)))
    | proof-creation(exact proof-creation semantic question coordinate)
    | presentation-mapping-creation(
        exact already-existing TrustIsolationResultPresentationMappingCreationEvent
      ),
  qualificationInput =
    current(exact H-11-owned current-use qualification outcome)
    | historical(
        exact TrustHistoricalQualificationInput bound to that exact
          TrustIsolationHistoricalAssessmentQuestion)
)

TrustIsolationAuthorizedControllerCoordinate = (
  exact TrustIsolationVerificationAuthorityCoordinate,
  exact TrustIsolationServiceControllerIdentity,
  exact TrustIsolationRoleAuthorizationSubjectIdentity,
  exact TrustIsolationRoleAuthorizationRevisionIdentity
)
```

For current use, occupancy is `occupied` only when all of the following hold:

1. exactly one role-authorization revision occurrence resolves for the stable slot at the exact cut;
2. its Organization-authority content attribution is authentic;
3. its H-11 qualification is literally `authoritative-current`;
4. its `occupant` is `present(C)`;
5. `C.ExactTenantContext` equals the role coordinate context; and
6. every revision, subject, scope, purpose, and class projection is coherent.

Zero revision occurrences is `unavailable` because required role evidence is absent. Exactly one authentic, coherent, H-11-qualified `authoritative-current` revision whose occupant is `vacant` is `failed` with `role-occupancy-vacant`: the evidence is present and definitively proves the positive occupant predicate false. Known vacancy is therefore distinct from missing role history/evidence and is nonauthorizing without implying missing data. Two or more equal revision occurrences are indeterminate. Unequal revision occurrences, two distinct revisions both asserted authoritative-current, an occupant/context mismatch, or conflicting Organization authorship is contradictory. A superseded, retired, revoked, compromised, rollback/fork-unresolved, historically unresolvable, unavailable, or indeterminate authorization never occupies the role for current use.

Historical occupancy keeps the H-11 and H-02 questions separate and fixes the answer-independent historical question before any H-11 input. If the required H-11 qualification/result itself is unobtainable, later Trust consumption is unavailable without changing question or source-domain identity. If present, its exact accepted outcome is retained and mapped literally by Section 4.2. Only after a favorable H-11 outcome supplies a resolved supported interval conclusion does H-02 evaluate whether the same immutable role revision appointed the same controller throughout it. A resolved interval wholly outside appointment or definitively crossing appointment, vacancy, removal, or replacement is H-02 `failed`; conflicting H-02 role-revision/occupant facts are Trust `contradictory`. `historically_indeterminate` and `historically_unsupported` remain H-11-owned indeterminate inputs and are never reclassified from their low-level causes. Historical favorability never creates present authority.

H-11 later realizes current-head, predecessor, application, revocation, compromise, rollback/fork, recovery, and interval evidence. It does not allocate the controller, author the appointment, choose the occupant, infer appointment from stored key metadata, or decide that a later appointment reaches backward.

## 1.6 Common Trust-result proof-creation authorization

Accepted H-02-S1 R8-43 applies to both result families without exception. A proof newly created over either a new result body or an older unchanged result body is a new proof-creation event.

```text
TrustIsolationResultClass =
  trust-isolation-governance-result
  | trust-isolation-current-result

TrustIsolationResultProofCreationSemanticQuestionCoordinate = (
  exact proof-creation event semantic coordinate as later identified under
    separately accepted H-10 semantics,
  exact TrustIsolationResultClass,
  exact immutable result subject coordinate,
  exact immutable completed result value,
  exact TrustIsolationServiceControllerIdentity that semantically performed
    that proof-creation event
)

TrustIsolationResultProofCreationAuthorization = (
  exact TrustIsolationResultProofCreationSemanticQuestionCoordinate,
  exact TrustIsolationResultClass,
  exact immutable result subject coordinate,
  exact immutable completed result value,
  exact TrustIsolationAuthorizedControllerCoordinate,
  exact TrustIsolationRoleAuthorizationRevisionSemantics,
  exact TrustIsolationHistoricalQuestionFor(
    result-proof-materialization-caller(
      exact TrustIsolationResultProofCreationSemanticQuestionCoordinate)),
  exact TrustHistoricalQualificationInput supplied to that already-fixed
    historical question,
  exact TrustIsolationCreationAppointmentPredicate,
  creationAuthorizationDisposition
)

TrustIsolationCreationAppointmentPredicate = (
  exact proof-creation event or
    already-existing TrustIsolationResultPresentationMappingCreationEvent,
  exact TrustIsolationAuthorizedControllerCoordinate,
  exact TrustIsolationRoleAuthorizationRevisionSemantics,
  exact available H-11-owned resolved supported materialization-interval
    conclusion when one exists,
  appointmentPredicateDisposition =
    satisfied | failed | unavailable | indeterminate | contradictory
)

creationAuthorizationDisposition =
  authorized-at-creation
  | failed
  | unavailable
  | indeterminate
  | contradictory
```

`authorized-at-creation` requires all of the following for the exact proof event:

1. the proof's exact semantic controller equals the controller carried by `TrustIsolationAuthorizedControllerCoordinate` and the `present(controller)` occupant in the immutable role revision;
2. the required H-11 qualification is available, its exact retained outcome is favorable for historical verification, and its H-11-owned materialization conclusion is resolved and supported;
3. `appointmentPredicateDisposition=satisfied`, proving under H-02 role semantics that this one revision appointed that controller throughout the entire resolved interval;
4. result class, result purpose, role, and `ExactTenantContext` lie within that revision's exact fixed authorization scope;
5. the completed result subject/value is the semantic commitment whose proof was created; and
6. every repeated subject, context, class, controller, revision, and interval projection is coherent.

A proof created wholly before appointment, wholly after a `vacant` revision becomes applicable, or by an old controller after removal/replacement is `failed` at creation. A proof interval definitively crossing an appointment, vacancy, removal, or replacement boundary is also `failed`: the same controller was not appointed throughout the entire materialization interval. A crossing is not unresolved merely because it crosses.

The H-11 input layer and the independent H-02 appointment predicate are total and are also the nonretroactivity floor for presentation-mapping creation in Section 7.4:

| Exact construction | Primary Trust semantic disposition |
|---|---|
| required H-11 qualification/result itself is absent or unobtainable | `unavailable`; no H-11 outcome is invented |
| exact retained H-11 result is `historically_indeterminate` | `indeterminate`; retain that exact H-11 result |
| exact retained H-11 result is `historically_unsupported` | `indeterminate` plus protected `h11-history(historically_unsupported)`; retain that exact H-11 result; `unsupported-profile-or-history` is only an optional tenant-safe projection |
| exact retained H-11 result is `historically_invalid` | `failed`; retain that exact H-11 result |
| exact retained H-11 result is favorable and the resolved whole interval is inside one favorable appointment of the same controller | H-02 appointment predicate `satisfied`; creation may be `authorized-at-creation` subject to every other prerequisite |
| exact retained H-11 result is favorable and the resolved whole interval is outside that controller's appointment | H-02 `failed` |
| exact retained H-11 result is favorable and the resolved interval definitively crosses appointment, vacancy, removal, or replacement | H-02 `failed` |
| equal duplicate representations of one H-11 result or present H-02 appointment evidence cannot uniquely resolve the predicate | Trust `indeterminate`; upstream result remains unchanged |
| incompatible retained H-11 result occurrences or incompatible H-02 role-appointment evidence | Trust `contradictory`; each upstream value remains unchanged |

This table first classifies availability and literal H-11 result, then the independent H-02 predicate. It never inspects a low-level missing H-11 time edge after H-11 has already produced `historically_indeterminate`, and it never changes `historically_unsupported`. Trust aggregate precedence still retains all independently true reasons.

A later appointment, replacement, current revision, successful historical lookup, key recovery, signature recheck, or newly favorable H-11 state cannot change a proof event that was unauthorized when created into `authorized-at-creation`. Mathematical proof validity, including an otherwise valid Ed25519 proof, cannot repair failed creation authority. Reissuing a proof after a later appointment creates a different proof event that must independently satisfy this relation at its own interval; it does not rehabilitate the earlier proof.

H-10 owns the future proof mechanism and mathematical verification. H-11 owns evidence for materialization and appointment intervals. H-02 owns the semantic rule that the already-defined controller must have been favorably appointed throughout creation. Neither H-10 nor H-11 may choose the controller or make authority retroactive.

This relation is evaluated separately for every new proof event, including reissuance over unchanged semantic content. The field above does not allocate a proof identity, proof ID, carrier, or representation; those remain H-10-owned and absent until separately accepted.

## 1.7 Exact result authorship relation

```text
TrustIsolationResultAuthorship = (
  exact TrustIsolationAuthorizedControllerCoordinate,
  exact result subject coordinate,
  exact immutable result value,
  exact TrustIsolationRoleAuthorizationQualification for the questioned use or history,
  exact TrustIsolationResultProofCreationAuthorization,
  exact H-10 author/key/purpose/context verification outcome,
  exact H-11 key/proof history outcome,
  authoringDisposition
)

authoringDisposition =
  exact-controller-authenticated
  | failed
  | unavailable
  | indeterminate
  | contradictory
```

`exact-controller-authenticated` requires `creationAuthorizationDisposition=authorized-at-creation`, exact equality from proof author to `TrustIsolationServiceControllerIdentity`, from that controller to the favorable role revision, and from the proof's subject/purpose/context to the complete result. A valid key for another controller, context, role, purpose, revision, result class, or result body is substitution, not authentication.

Adverse authorship classification is total. `contradictory` applies when creation authorization is contradictory or retained authoritative author/controller/revision/subject evidence is mutually incompatible. Otherwise `failed` applies when creation authorization is failed or resolved evidence definitively mismatches the required controller, scope, subject, purpose, class, or result. Otherwise `unavailable` applies when creation authorization or another required authorship evidence source is absent or unobtainable. Otherwise `indeterminate` applies when creation authorization or present authorship evidence cannot uniquely resolve the required equality. Only the fully favorable branch above is `exact-controller-authenticated`. All independently true reasons remain retained.

The common creation rule applies identically to `TrustIsolationGovernanceVerificationResult` and `TrustIsolationCurrentVerificationResult`. It is not nested only under current-result use.

Proof creation authority, mapping creation authority, and use authority are distinct:

- creation authority asks whether the proof was validly created during its own historical materialization interval;
- mapping creation authority separately asks whether the immutable result-to-carrier relation was materialized by the exact controller throughout that mapping event's own interval under Section 7.4;
- current use additionally requires the exact role revision to be `authoritative-current` at the exact governing `AuthorityUseCut`, the controller to remain the exact current occupant, future accepted H-11 proof/key/history semantics to make the proof usable/current at that cut, and the exact mapping to have both favorable creation authority and favorable currentness; and
- historical verification may establish that an immutable old result or mapping was validly authored during its old appointment interval, but always has present-authority value `false` and never repairs an originally unauthorized proof or mapping creation event.

The result body cannot assert or prove authorship, proof-creation authorization, mapping-creation authorization, or mapping currentness. Current enforcer consumption requires these external dispositions, favorable current role occupancy, favorable result-proof history, and a valid, creation-authorized, current presentation mapping in addition to the body's internal status. Proof validity/currentness cannot repair mapping creation, and mapping validity/currentness cannot repair proof creation.

Because no H-10-S2 or H-11 isolation supplement is accepted, this proposal by itself produces no operational `authorized-at-creation` or `exact-controller-authenticated` result. It closes the semantic questions those later owners must realize without giving them authority to invent the answers.

## 1.8 H-10 key/proof handoff

H-10 may allocate a future result domain, proof purpose, key purpose, canonical bytes, proof profile, and carrier only after separate authorization. It may authenticate that one exact key author supplied one exact completed result for the exact `TrustIsolationAuthorizedControllerCoordinate`. It must not:

```text
use kid, thumbprint, signature, digest, provider, endpoint, or possession as controller identity;
infer role appointment from a mathematically valid signature;
retarget controller A's proof to controller B;
select one of conflicting role revisions;
make an unauthorized controller authoritative;
make a later appointment authorize an earlier proof event;
or treat verification as permission, measurement truth, Connection authority, or ALLOW.
```

## 1.9 Vacancy, replacement, retirement, privacy, and nonauthority consequences

An authoritative-current Organization-authored `vacant` revision means that the stable Trust role slot has no current positive occupant. That exact known state is `failed`, not `unavailable`, because the authoritative evidence resolves the occupant question negatively. It does not revoke, erase, or modify underlying Organization permission, Workspace state, IAA facts, H-07 Connection semantics, H-13 isolation truth, Invocation state, or policy.

A replacement revision must name a new `TrustIsolationServiceControllerIdentity`; controller identities are never reassigned or recycled. Once a `vacant` or replacement revision is H-11-qualified authoritative-current, the old controller cannot create a new authorized Trust proof event or satisfy current authorship. Its old immutable result/proof remains historically assessable only against its original proof-materialization interval and original appointment revision. Vacancy does not erase role history. Replacement cannot authenticate an earlier proof that was unauthorized at creation.

Controller identity, authorization revision, proof/key mapping, and occupancy evidence are protected internal values. Tenant-facing exposure occurs only through Section 7. No provider-global Trust identity, key, proof, revision, or controller carrier may be reused across unequal contexts. R8-36 remains the only exact field/value-specific exception; this proposal creates none.

# 2. Raw semantic evidence occurrences and cardinality

## 2.1 Logical source domain, raw key, and raw occurrence

A raw semantic occurrence exists before and independently of every Trust verifier component. Its source domain is fixed by the accepted owner and the exact temporal/population branch in Sections 3 and 5:

```text
TrustSemanticEvidenceLogicalSourceDomain = (
  exact result-family population branch,
  exact owning accepted semantic source type,
  exact TrustSemanticEvidencePopulationBoundary
)

TrustSemanticEvidenceOccurrenceKey = (
  exact TrustSemanticEvidenceLogicalSourceDomain,
  exact SourceNativeOccurrenceCoordinate
)

TrustSemanticEvidenceOccurrence = (
  exact TrustSemanticEvidenceOccurrenceKey,
  exact successfully resolved semantic source value
)
```

`TrustSemanticEvidencePopulationBoundary` is also closed; it is not an implementation query extent:

```text
TrustSemanticEvidencePopulationBoundary =
  governance-connection-use(
    exact TrustIsolationGovernanceResultSubjectCoordinate,
    exact SideEvaluationKey,
    exact governancePopulationSelector from Section 3.1
  )
  | governance-tenant-observation(
      exact TrustIsolationGovernanceResultSubjectCoordinate,
      cutAvailability = unavailable-pending-accepted-h11-isolation-cut
    )
  | governance-historical(
      exact TrustIsolationGovernanceResultSubjectCoordinate,
      exact TrustIsolationGovernanceEvidenceTarget,
      exact governance-evidence-caller(
        that exact result subject,
        that exact evidence target),
      exact TrustIsolationHistoricalQuestionFor(
        that exact governance-evidence-caller)
    )
  | current-side-use(
      exact TrustIsolationCurrentResultSubjectCoordinate,
      exact ConnectionEvaluationKey,
      exact selected SideEvaluationKey,
      exact SemanticRecordCoordinate(
        h02-applicability-population,
        connection-scope(exact ConnectionEvaluationKey),
        exact-stage-a-population
      ),
      exact SemanticRecordCoordinate(
        h13-evaluation-population,
        connection-scope(exact ConnectionEvaluationKey),
        exact-stage-b-population
      )
    )
```

The result subject/temporal branch fixes exactly one branch above. A store query, enclosing caller context, component, proof, key, verdict, provider, or implementation-selected source extent cannot alter it. This domain boundary scopes which accepted population is being verified; it does not replace or extend the source-native slot within that population.

`SourceNativeOccurrenceCoordinate` is the following closed tagged union. The tag is part of equality. Each carried coordinate is literal accepted semantic structure; the union supplies no caller-selected member set:

```text
SourceNativeOccurrenceCoordinate =
  organization-registration-content(
    exact OrganizationIAARegistrationRevisionIdentity
  )
  | boundary-permission-content(
      exact IsolationBoundaryPermissionRevisionIdentity
    )
  | workspace-state-content(
      exact WorkspaceIAAStateRevisionIdentity
    )
  | workspace-overlay-content(
      exact WorkspaceIAAOverlayRevisionIdentity
    )
  | tenant-presentation-mapping(
      exact TenantPresentationNamespace,
      exact stable source subject
    )
  | h07-authoritative-connection-input(
      exact SemanticRecordCoordinate(
        node-semantic-value(authoritative-h07-input),
        connection-scope(exact ConnectionEvaluationKey),
        h07-connection-authoritative-input
      )
    )
  | h13-authoritative-source-content(
      exact accepted content-native coordinate from Table 2-A
    )
  | h13-authoritative-source-attribution(
      exact accepted content-native coordinate from Table 2-A
    )
  | h13-ordinary-direct-source-content(
      exact accepted direct-source coordinate from Table 2-A
    )
  | h13-source-attribution(
      exact accepted direct-source coordinate from Table 2-A
    )
  | h13-historical-currentness(
      exact HistoricalCurrentnessSubject,
      exact AuthorityUseCut
    )
  | h13-semantic-record(
      exact SemanticRecordCoordinate
    )
  | h13-ownerless-structural-output(
      exact ConnectionEvaluationKey,
      exact H13OwnerlessStructuralOutputSlot from Table 2-B
    )
  | producer-intrinsic-lifecycle-member(
      exact ProducerIntrinsicLifecycleMemberCoordinate
    )
  | producer-intrinsic-lifecycle-attribution(
      exact ProducerIntrinsicLifecycleMemberCoordinate
    )
  | h13-s3-owner-native-raw-family-member(
      exact H13RawInputFamilyCoordinate D,
      exact H13S3OwnerNativeRawFamilyMemberCoordinate(D)
    )
  | h13-s3-accepted-pre-freeze-placeholder(
      exact H13PreFreezePlaceholderCoordinate D
    )
```

Cardinality is a property of the accepted semantic source family, not of this outer union. Every non-H-13-S3-raw family is assigned exactly one member of the following closed tagged class by Table 2-C. Every legal H-13-S3 D/x receives that class from the same `R12H13RawSourceDispatchOf(D,x)` record that supplies its coordinate; Table 2-C restates that carried result and performs no second dispatch:

```text
TrustSourceCardinalityClass =
  EXACT_ONCE_ATOMIC_SLOT
  | MULTIPLICITY_BEARING_ATOMIC_FAMILY
  | EXACT_ONCE_AGGREGATE_FAMILY_RECORD
```

No default exists. No caller, verifier, carrier, or implementation may select atomic versus aggregate treatment. A source family not assigned exactly one class and exact coordinate by Tables 2-A0 through 2-C is `unsupported-required-semantics` and cannot yield a conforming population.

The four raw Producer intrinsic lifecycle families use only `producer-intrinsic-lifecycle-member`; their direct-attribution wrapper family uses only `producer-intrinsic-lifecycle-attribution`. They cannot also be keyed through a generic `h13-ordinary-direct-source-content`, `h13-source-attribution`, or semantic-record branch. The source-family tag therefore prevents an alias or second count.

Accepted H-13 literally defines `ProducerIntrinsicLifecycleEvidence` with separate raw activation, observation-mechanism, report-mechanism, capability-binding, and `ProducerIntrinsicLifecycleDirectAttribution` occurrence families. It defines the accepted types carried below, but it does not define the following H-02 name. `ProducerIntrinsicLifecycleMemberCoordinate` is therefore a **newly proposed H-02-S2 deterministic projection over accepted H-13 values**, not an accepted H-13 type, event identity, or extension of H-13 equality:

```text
ProducerIntrinsicLifecycleMemberCoordinate =
  activation(
    sourceOwner = exact accepted producer-lifecycle direct factual owner
      for ProducerLifecycleEvaluationCoordinate.ProducerIdentity,
    exact ProducerLifecycleEvaluationCoordinate,
    change =
      birth(
        exact newly born ProducerActivationIncarnation,
        exact newly born ProducerIncarnation
      )
      | end(
          exact ended ProducerActivationIncarnation,
          exact ended ProducerIncarnation
        )
      | restart(
          exact predecessor ProducerActivationIncarnation,
          exact successor ProducerActivationIncarnation,
          exact predecessor ProducerIncarnation,
          exact successor ProducerIncarnation
        ),
    exact accepted semantic state position or interval
  )
  | observation-mechanism(
      sourceOwner = exact accepted producer-lifecycle direct factual owner
        for ProducerLifecycleEvaluationCoordinate.ProducerIdentity,
      exact ProducerLifecycleEvaluationCoordinate,
      change =
        birth(exact newly born ProducerObservationMechanismIncarnation)
        | end(exact ended ProducerObservationMechanismIncarnation)
        | replacement(
            exact predecessor ProducerObservationMechanismIncarnation,
            exact successor ProducerObservationMechanismIncarnation,
            exact nonempty finite set of continuing
              ProducerIntrinsicCapabilityCoordinate values affected
          ),
      exact accepted semantic state position or interval
    )
  | report-mechanism(
      sourceOwner = exact accepted producer-lifecycle direct factual owner
        for ProducerLifecycleEvaluationCoordinate.ProducerIdentity,
      exact ProducerLifecycleEvaluationCoordinate,
      change =
        birth(exact newly born ProducerReportMechanismIncarnation)
        | end(exact ended ProducerReportMechanismIncarnation)
        | replacement(
            exact predecessor ProducerReportMechanismIncarnation,
            exact successor ProducerReportMechanismIncarnation,
            exact nonempty finite set of continuing
              ProducerIntrinsicCapabilityCoordinate values affected
          ),
      exact accepted semantic state position or interval
    )
  | capability-binding(
      sourceOwner = exact accepted producer-lifecycle direct factual owner
        for ProducerLifecycleEvaluationCoordinate.ProducerIdentity,
      exact ProducerLifecycleEvaluationCoordinate,
      change =
        add(exact added ProducerIntrinsicCapabilityBinding)
        | remove(exact removed ProducerIntrinsicCapabilityBinding)
        | change(
            exact ProducerIntrinsicCapabilityCoordinate,
            exact predecessor ProducerIntrinsicCapabilityBinding,
            exact successor ProducerIntrinsicCapabilityBinding
          ),
      exact accepted semantic state position or interval
    )

ProducerIntrinsicLifecycleAttributionReference = (
  exact ProducerIntrinsicLifecycleMemberCoordinate,
  exact accepted ProducerIntrinsicLifecycleDirectAttribution wrapper whose
    asserted intrinsic-lifecycle semantic content is that exact member with
    the wrapper omitted,
  exact accepted attribution verdict
)

BindingLifecycleObservationNativeCoordinate = (
  exact BindingLifecycleOwnerSlot,
  exact BindingBootstrapSourceCoordinate,
  exact EventFamily projection,
  exact affected semantic subject/object/relation set,
  exact semantic event position
)

BindingLifecycleCoverageRecordCoordinate = (
  exact BindingLifecycleOwnerSlot,
  exact BindingBootstrapSourceCoordinate,
  exact continuous direct-owner observation interval (B,U]
)

BindingLifecycleAttributedSubjectCoordinate =
  observation(exact BindingLifecycleObservationNativeCoordinate)
  | coverage(exact BindingLifecycleCoverageRecordCoordinate)
```

The four top-level tags and the nested `birth`/`end`/`restart`, `birth`/`end`/`replacement`, and `add`/`remove`/`change` tags are closed. They map one-to-one to the four literal raw occurrence-family fields and exact change kinds in accepted `ProducerIntrinsicLifecycleEvidence`; no caller-defined kind or fifth branch exists. A restart carries both old and new activation and Producer incarnations because accepted H-13 ends the old pair and creates the new pair. A mechanism replacement carries old and new mechanism incarnations and the exact continuing capability-coordinate set whose binding changes establish the replacement; concurrency without the accepted unique old-to-new relation is not projected as replacement and remains H-13-indeterminate. A capability-binding change carries the exact before and after bindings at one capability coordinate. An affected value must belong to the same `ProducerIdentity` and evaluation coordinate; an unequal repeated projection is contradictory.

Equality of `ProducerIntrinsicLifecycleMemberCoordinate` is exact tagged-union/component/set equality, including source owner, evaluation coordinate, change tag and every affected subject, and semantic state position or interval. Each raw accepted lifecycle family is a multiplicity-bearing occurrence family. Unequal member coordinates are independent occurrences, including uniquely ordered or explicitly concurrent events. Two equal complete raw event values at one equal member coordinate retain multiplicity two and are `indeterminate` with `equal-duplicate-occurrence`; unequal complete event values at that coordinate are `contradictory` with `conflicting-duplicate-occurrence`. The coordinate never contains a proof ID, signature, digest, key ID, database row, arrival order, provider identity, process ID, transport value, verdict, or wrapper.

H-02-S2 selects the raw-first model required by accepted H-13's separate fields. Each raw activation/mechanism/capability event is one first-class owner-native source occurrence under `producer-intrinsic-lifecycle-member`. Its matching `ProducerIntrinsicLifecycleDirectAttribution` is a separate wrapper occurrence under `producer-intrinsic-lifecycle-attribution`; it authenticates and attributes the exact wrapper-omitted member but does not allocate, copy, or increment that member. Wrapper multiplicity is retained separately at the member coordinate. Missing wrapper evidence is unavailable for attribution; equal wrapper repetitions are indeterminate; unequal wrapper content, owner, member projection, or verdict at one coordinate is contradictory. The wrapper does not contain another wrapper, cannot key itself, and is never recursively reprojected. Thus raw-member count and attribution-wrapper count remain distinct without double counting one logical raw issuance.

Accepted H-13-S3 supplies the complete raw-family grammar needed to cover the rest of the Stage-B owner-native families without inventing a caller coordinate. For exact legal `D` and one exact occurrence `x` in `H13AcceptedRawFamily(D)`, Revision 12 retains the following H-02-only projection:

```text
H13S3OwnerNativeRawFamilyMemberCoordinate(D,x) = (
  exact H13RawInputFamilyCoordinate D,
  exact owner-native member coordinate of x under the accepted owning type
    and the unique legal H-13-S3 Section 7.1 row for D
)
```

The second component is the literal member coordinate and equality already owned by the accepted family; when that family has no separately named inner member coordinate, it is the complete exact owner-native occurrence value with its accepted equality fields and no representation fields. This H-02 projection does not allocate an H-13 identity or change family equality. Different legal D values remain different source domains. Equal repetitions at one exact `(D,member-coordinate,value)` retain the owner's multiplicity. Unequal values at one equal coordinate are contradictory. A value outside `H13AcceptedRawFamily(D)`, a D/F mismatch, or a D matching zero or more than one legal H-13-S3 owner row cannot be projected and is `failed` with `unsupported-required-semantics` and `source-native-coordinate-unkeyable`; the bounded malformed candidate remains wherever accepted H-13 retains it.

Revision 12 replaces the Revision 11 prose match family with one combined typed result. The result carries the source-native coordinate, Table 2-C class, and direct semantic role together; those outputs cannot perform separate overlap decisions:

```text
R12H13RawSourceDispatch =
  EXISTING_NATIVE_COORDINATE(
    exact R12ExistingTable2ASourceType,
    exact SourceNativeOccurrenceCoordinate,
    exact TrustSourceCardinalityClass,
    exact H13DirectSourceSemanticRole)
  | H13_S3_GENERIC_NATIVE_COORDINATE(
      exact H13RawInputFamilyCoordinate D,
      exact H13S3OwnerNativeRawFamilyMemberCoordinate(D,x),
      cardinalityClass = MULTIPLICITY_BEARING_ATOMIC_FAMILY,
      role = h13-s3-owner-native-raw-family(D))

R12H13RawSourceDispatchOf :
  (exact legal H13RawInputFamilyCoordinate D,
   exact x in H13AcceptedRawFamily(D))
    -> exactly one R12H13RawSourceDispatch

H13S3SourceCoordinateResolution(D,x) =
  exact sourceNativeCoordinate carried by R12H13RawSourceDispatchOf(D,x)

H13S3SourceCardinalityClassOf(D,x) =
  exact cardinalityClass carried by R12H13RawSourceDispatchOf(D,x)

H13S3DirectSourceSemanticRoleOf(D,x) =
  exact role carried by R12H13RawSourceDispatchOf(D,x)
```

`R12ExistingTable2ASourceType` is the following closed H-02 discriminator over accepted semantic source types. Each row is a typed constructor match, not a natural-language predicate. Angle-bracket qualification means that the accepted attribution's asserted content has the exact named accepted source type. The row carries all three outputs atomically.

```text
R12ExistingTable2ASourceType =
  historical-currentness-qualification(exact HistoricalCurrentnessQualification)
  | runtime-correspondence(exact RuntimeCorrespondence)
  | runtime-correspondence-attribution(
      exact distinct AuthoritativeSourceAttribution<RuntimeCorrespondence>)
  | context-local-separation(exact IAAContextLocalSeparationConclusion)
  | context-local-separation-attribution(
      exact distinct AuthoritativeSourceAttribution<IAAContextLocalSeparationConclusion>)
  | producer-intrinsic-activation(exact accepted raw activation occurrence)
  | producer-intrinsic-observation-mechanism(
      exact accepted raw observation-mechanism occurrence)
  | producer-intrinsic-report-mechanism(
      exact accepted raw report-mechanism occurrence)
  | producer-intrinsic-capability-binding(
      exact accepted raw capability-binding occurrence)
  | producer-intrinsic-direct-attribution(
      exact ProducerIntrinsicLifecycleDirectAttribution)
  | direct-producer-fact(exact accepted direct Producer fact)
  | direct-producer-fact-attribution(
      exact distinct SourceAttribution<direct Producer fact>)
  | observation-occurrence(exact ObservationOccurrence)
  | observation-occurrence-attribution(
      exact distinct SourceAttribution<ObservationOccurrence>)
  | binding-baseline-direct-attribution(exact BindingBaselineDirectAttribution)
  | binding-baseline-owner-observation(exact BindingBaselineOwnerObservation)
  | binding-lifecycle-direct-attribution(exact BindingLifecycleDirectAttribution)
  | binding-lifecycle-coverage(exact BindingLifecycleCoverageStatement)
  | binding-lifecycle-observation(exact BindingLifecycleObservation)
  | binding-bootstrap-source(
      exact raw candidate or accepted owner-native unavailable-source occurrence,
      exact BindingBootstrapSourceCoordinate)
  | protected-detector-source(exact ProtectedDetectorSourceAssertion)
  | qualified-physical-time-input(exact QualifiedPhysicalTimeInput)
  | producer-binding-continuity(
      exact ProducerBindingContinuityMeasuredConclusion)
  | producer-binding-continuity-attribution(
      exact distinct AuthoritativeSourceAttribution<
        ProducerBindingContinuityMeasuredConclusion>)
  | absence-source-control(exact AbsenceSourceControlMeasuredConclusion)
  | absence-source-control-attribution(
      exact distinct AuthoritativeSourceAttribution<
        AbsenceSourceControlMeasuredConclusion>)
  | producer-independence(exact ProducerIndependenceMeasuredConclusion)
  | producer-independence-attribution(
      exact distinct AuthoritativeSourceAttribution<
        ProducerIndependenceMeasuredConclusion>)
```

The outer tags above are part of H-02 dispatch equality and are mutually exclusive. The carried accepted value must have exactly the named accepted semantic type. An accepted attribution wrapper and its asserted wrapper-omitted content are distinct source types even when their native coordinate components are equal; the existing `SourceNativeOccurrenceCoordinate` tag and direct semantic role keep their source families distinct.

**Table 2-A0 — closed existing-native raw-source type dispatch**

| Exact accepted semantic source type | Exact existing `SourceNativeOccurrenceCoordinate` constructor | Table 2-C class | Exact direct semantic role |
|---|---|---|---|
| `HistoricalCurrentnessQualification(subject,cut,...)` | `h13-historical-currentness(subject,cut)` | `EXACT_ONCE_ATOMIC_SLOT` | `historical-currentness` |
| `RuntimeCorrespondence` at Q | `h13-authoritative-source-content(Q)` | `EXACT_ONCE_ATOMIC_SLOT` | `iaa-measured-conclusion(runtime-correspondence)` |
| `AuthoritativeSourceAttribution<RuntimeCorrespondence>` at Q | `h13-authoritative-source-attribution(Q)` | `EXACT_ONCE_ATOMIC_SLOT` | `authoritative-source-attribution(runtime-correspondence)` |
| `IAAContextLocalSeparationConclusion` at L | `h13-authoritative-source-content(L)` | `EXACT_ONCE_ATOMIC_SLOT` | `iaa-measured-conclusion(context-local-separation)` |
| `AuthoritativeSourceAttribution<IAAContextLocalSeparationConclusion>` at L | `h13-authoritative-source-attribution(L)` | `EXACT_ONCE_ATOMIC_SLOT` | `authoritative-source-attribution(context-local-separation)` |
| raw Producer activation birth/end/restart occurrence | `producer-intrinsic-lifecycle-member(activation(exact accepted components))` | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `producer-intrinsic-raw(activation)` |
| raw Producer observation-mechanism birth/end/replacement occurrence | `producer-intrinsic-lifecycle-member(observation-mechanism(exact accepted components))` | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `producer-intrinsic-raw(observation-mechanism)` |
| raw Producer report-mechanism birth/end/replacement occurrence | `producer-intrinsic-lifecycle-member(report-mechanism(exact accepted components))` | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `producer-intrinsic-raw(report-mechanism)` |
| raw Producer capability-binding add/remove/change occurrence | `producer-intrinsic-lifecycle-member(capability-binding(exact accepted components))` | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `producer-intrinsic-raw(capability-binding)` |
| `ProducerIntrinsicLifecycleDirectAttribution` | `producer-intrinsic-lifecycle-attribution(exact wrapper-omitted ProducerIntrinsicLifecycleMemberCoordinate)` | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `producer-intrinsic-direct-attribution` |
| direct Producer fact | `h13-ordinary-direct-source-content(exact (DirectSemanticPropositionCoordinate,ProducerIncarnation))` | `EXACT_ONCE_ATOMIC_SLOT` | `ordinary-direct-source(direct-producer-fact)` |
| ordinary `SourceAttribution<direct Producer fact>` | `h13-source-attribution(exact (DirectSemanticPropositionCoordinate,ProducerIncarnation))` | `EXACT_ONCE_ATOMIC_SLOT` | `ordinary-source-attribution(direct-producer-fact)` |
| `ObservationOccurrence` | `h13-ordinary-direct-source-content(exact ObservationOccurrenceCoordinate)` | `EXACT_ONCE_ATOMIC_SLOT` | `ordinary-direct-source(observation-occurrence)` |
| ordinary `SourceAttribution<ObservationOccurrence>` | `h13-source-attribution(exact ObservationOccurrenceCoordinate)` | `EXACT_ONCE_ATOMIC_SLOT` | `ordinary-source-attribution(observation-occurrence)` |
| `BindingBaselineDirectAttribution` | `h13-source-attribution(exact (BindingBaselineOwnerSlot,BindingBootstrapSourceCoordinate))` | `EXACT_ONCE_ATOMIC_SLOT` | `binding-baseline-direct-attribution` |
| `BindingBaselineOwnerObservation` | `h13-ordinary-direct-source-content(exact (BindingBaselineOwnerSlot,BindingBootstrapSourceCoordinate))` | `EXACT_ONCE_ATOMIC_SLOT` | `binding-baseline-owner-observation` |
| `BindingLifecycleDirectAttribution` | `h13-source-attribution(exact BindingLifecycleAttributedSubjectCoordinate)` | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `binding-lifecycle-direct-attribution` |
| `BindingLifecycleCoverageStatement` | `h13-ordinary-direct-source-content(exact BindingLifecycleCoverageRecordCoordinate)` | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `binding-lifecycle-coverage-statement` |
| `BindingLifecycleObservation` | `h13-ordinary-direct-source-content(exact BindingLifecycleObservationNativeCoordinate)` | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `binding-lifecycle-observation` |
| raw binding-bootstrap candidate or accepted owner-native unavailable-source occurrence having exact C | `h13-ordinary-direct-source-content(exact BindingBootstrapSourceCoordinate C)` | `EXACT_ONCE_ATOMIC_SLOT` | `binding-bootstrap-raw-candidate` |
| `ProtectedDetectorSourceAssertion` | `h13-ordinary-direct-source-content(exact (ProtectedDetectorEvaluationKey,DetectorSourceDomain,protected domain owner,protected source scope))` | `EXACT_ONCE_ATOMIC_SLOT` | `protected-detector-source` |
| `QualifiedPhysicalTimeInput` | `h13-ordinary-direct-source-content(exact semantic state position)` | `EXACT_ONCE_ATOMIC_SLOT` | `qualified-physical-time-input` |
| `ProducerBindingContinuityMeasuredConclusion` at `(Q,P,B,U)` | `h13-authoritative-source-content(exact (Q,P,B,U))` | `EXACT_ONCE_ATOMIC_SLOT` | `iaa-measured-conclusion(producer-binding-continuity)` |
| `AuthoritativeSourceAttribution<ProducerBindingContinuityMeasuredConclusion>` at `(Q,P,B,U)` | `h13-authoritative-source-attribution(exact (Q,P,B,U))` | `EXACT_ONCE_ATOMIC_SLOT` | `authoritative-source-attribution(producer-binding-continuity)` |
| `AbsenceSourceControlMeasuredConclusion` at A | `h13-authoritative-source-content(exact AbsenceSourceControlCoordinate A)` | `EXACT_ONCE_ATOMIC_SLOT` | `iaa-measured-conclusion(absence-source-control)` |
| `AuthoritativeSourceAttribution<AbsenceSourceControlMeasuredConclusion>` at A | `h13-authoritative-source-attribution(exact AbsenceSourceControlCoordinate A)` | `EXACT_ONCE_ATOMIC_SLOT` | `authoritative-source-attribution(absence-source-control)` |
| `ProducerIndependenceMeasuredConclusion` at PI | `h13-authoritative-source-content(exact ProducerIndependenceCoordinate PI)` | `EXACT_ONCE_ATOMIC_SLOT` | `iaa-measured-conclusion(producer-independence)` |
| `AuthoritativeSourceAttribution<ProducerIndependenceMeasuredConclusion>` at PI | `h13-authoritative-source-attribution(exact ProducerIndependenceCoordinate PI)` | `EXACT_ONCE_ATOMIC_SLOT` | `authoritative-source-attribution(producer-independence)` |

The following table is the complete definition of `R12H13RawSourceDispatchOf`. `EXISTING(T)` means the one `EXISTING_NATIVE_COORDINATE` record in Table 2-A0 whose first field is exact T. `GENERIC(D,x)` means `H13_S3_GENERIC_NATIVE_COORDINATE(D,H13S3OwnerNativeRawFamilyMemberCoordinate(D,x),MULTIPLICITY_BEARING_ATOMIC_FAMILY,h13-s3-owner-native-raw-family(D))`. These are constructor results, not preference directives.

**Table 2-A1 — closed D/x dispatch over every legal H-13-S3 raw-family member**

| Exact D branch or dependent subtype | Exact accepted x type domain | Sole dispatch result |
|---|---|---|
| `raw-node-family(historical-currentness-qualification-input(subject,cut))` | `HistoricalCurrentnessQualification(subject,cut,...)` | `EXISTING(HistoricalCurrentnessQualification)` |
| `raw-node-family(iaa-runtime-correspondence-input(Q))` | `RuntimeCorrespondence` or its distinct `AuthoritativeSourceAttribution` occurrence | the corresponding exact `EXISTING(...)` row |
| `raw-node-family(iaa-local-separation-input(L))` | `IAAContextLocalSeparationConclusion` or its distinct `AuthoritativeSourceAttribution` occurrence | the corresponding exact `EXISTING(...)` row |
| `raw-node-family(q-producer-candidate-occurrence-input(Q,exact non-lifecycle use,C))` | the exact accepted `FrozenStageBProducerOccurrenceFamily(Q)` member selected by that use and C | `GENERIC(D,x)` |
| `raw-node-family(producer-lifecycle-owner-native-input(enrollment(exact accepted components)))` | exact accepted owner-native enrollment occurrence | `GENERIC(D,x)` |
| `raw-node-family(producer-lifecycle-owner-native-input(producer-class(exact accepted components)))` | exact accepted owner-native ProducerClass occurrence | `GENERIC(D,x)` |
| `raw-node-family(producer-lifecycle-owner-native-input(q-local-observation-scope(exact accepted components)))` | exact accepted Q-local ObservationScope occurrence | `GENERIC(D,x)` |
| `raw-node-family(producer-lifecycle-owner-native-input(source-enumeration(exact accepted components)))` | exact accepted owner-native source-enumeration occurrence | `GENERIC(D,x)` |
| `raw-node-family(baseline-direct-input(slot,source))` | `BindingBaselineDirectAttribution` or `BindingBaselineOwnerObservation` | the corresponding exact `EXISTING(...)` row |
| `raw-node-family(lifecycle-direct-input(slot,source))` | `BindingLifecycleDirectAttribution`, `BindingLifecycleCoverageStatement`, or `BindingLifecycleObservation` | the corresponding exact `EXISTING(...)` row |
| `raw-node-family(iaa-binding-continuity-input(Q,P,B,U))` | `ProducerBindingContinuityMeasuredConclusion` or its distinct `AuthoritativeSourceAttribution` occurrence | the corresponding exact `EXISTING(...)` row |
| `raw-node-family(direct-producer-fact-input(DP,P))` | direct Producer fact or its distinct ordinary `SourceAttribution` occurrence | the corresponding exact `EXISTING(...)` row |
| `raw-node-family(iaa-absence-source-control-input(A))` | `AbsenceSourceControlMeasuredConclusion` or its distinct `AuthoritativeSourceAttribution` occurrence | the corresponding exact `EXISTING(...)` row |
| `raw-node-family(iaa-producer-independence-input(PI))` | `ProducerIndependenceMeasuredConclusion` or its distinct `AuthoritativeSourceAttribution` occurrence | the corresponding exact `EXISTING(...)` row |
| `raw-node-family(protected-detector-source-input(K,domain,owner,scope))` | `ProtectedDetectorSourceAssertion` | `EXISTING(ProtectedDetectorSourceAssertion)` |
| `raw-node-family(observation-occurrence-input(O))` | `ObservationOccurrence` or its distinct ordinary `SourceAttribution` occurrence | the corresponding exact `EXISTING(...)` row |
| `raw-node-family(producer-closure-assertion-input(PC))` | `ProducerClosureAssertion` | `GENERIC(D,x)` |
| `raw-node-family(relation-edge-input(R,O,PC))` | exact accepted `RelationEdge` candidate occurrence, including an accepted malformed candidate | `GENERIC(D,x)` |
| `raw-node-family(event-coverage-assertion-input(EA))` | `EventCoverageAssertion` candidate occurrence | `GENERIC(D,x)` |
| `raw-node-family(qualified-time-input(scope,position))` | `QualifiedPhysicalTimeInput` at position | `EXISTING(QualifiedPhysicalTimeInput)` |
| `producer-intrinsic-family(PU,activation-birth-end-restart)` | raw Producer activation occurrence | `EXISTING(raw Producer activation)` |
| `producer-intrinsic-family(PU,observation-mechanism-birth-end-replacement)` | raw Producer observation-mechanism occurrence | `EXISTING(raw Producer observation-mechanism)` |
| `producer-intrinsic-family(PU,report-mechanism-birth-end-replacement)` | raw Producer report-mechanism occurrence | `EXISTING(raw Producer report-mechanism)` |
| `producer-intrinsic-family(PU,intrinsic-capability-binding-add-remove-change)` | raw Producer capability-binding occurrence | `EXISTING(raw Producer capability-binding)` |
| `producer-intrinsic-family(PU,o09-allocation)` | exact accepted Q-independent O09 allocation occurrence | `GENERIC(D,x)` |
| `producer-intrinsic-family(PU,o10-allocation)` | exact accepted Q-independent O10 allocation occurrence | `GENERIC(D,x)` |
| `producer-intrinsic-family(PU,producer-lifecycle-direct-attribution)` | `ProducerIntrinsicLifecycleDirectAttribution` | `EXISTING(ProducerIntrinsicLifecycleDirectAttribution)` |
| `baseline-enumeration-family(member,boundary)` | exact accepted candidate-independent baseline enumeration occurrence | `GENERIC(D,x)` |
| `lifecycle-enumeration-family(member,boundary)` | exact accepted candidate-independent lifecycle enumeration occurrence | `GENERIC(D,x)` |
| `bootstrap-source-family(slot,bootstrap-owner-slot-boundary(slot))` | raw binding-bootstrap candidate or accepted owner-native unavailable-source occurrence having exact `BindingBootstrapSourceCoordinate` | corresponding exact `EXISTING(...)` row |
| `baseline-direct-observation-family(slot,source)` | `BindingBaselineDirectAttribution` or `BindingBaselineOwnerObservation` | the corresponding exact `EXISTING(...)` row |
| `lifecycle-direct-observation-family(slot,source,E)` | `BindingLifecycleDirectAttribution`, `BindingLifecycleCoverageStatement`, or `BindingLifecycleObservation` | the corresponding exact `EXISTING(...)` row |
| `event-policy-token-family(slot)` | exact received noncatalogue event-policy token occurrence for slot | `GENERIC(D,x)` |

An exact D/x pair whose x type is not in its Table 2-A1 row is outside the legal accepted domain and receives `H13StageBInvalidInputResult`; it is not redirected to another row. The rows are disjoint by D's accepted outer/dependent tag, then by x's accepted semantic source type where a row lists a tagged union. The table contains no complement, ranking, proximity, priority, or textual-position operation.

The Table 2-A source families that cannot be legal x values are audited explicitly: Organization registration content, boundary-permission content, Workspace state content, Workspace overlay content, their four `AuthoritativeSourceAttribution` families, tenant presentation mapping, and Stage-A population remain only in the accepted H-02 applicability/Stage-A paths; the H-07 authoritative bundle and its attribution remain in the exact H-07 literal/provenance path; `BindingBootstrapSourceCandidatePopulation`, every H-13 provenance/semantic record, Stage-B population record, derivation/provenance aggregate, validation record, and Table 2-B ownerless output remain aggregate or structural record sources. None enters Table 2-A1, and none may be retyped as a raw-family x.

For every legal D/x, Table 2-A1 yields one record. The record's coordinate projection and cardinality projection therefore have identical branch identity. Reordering Table 2-A0, Table 2-A1, Table 2-A, or Table 2-C changes no value. An implementation cannot select generic for a Table 2-A0 type, cannot select an existing coordinate for a `GENERIC(D,x)` row, and cannot obtain two raw keys from one semantic source. When the same existing-native source is represented through two legal H-13 paths, both dispatches return the same tagged existing coordinate; when a generic-only source is represented, accepted H-13-S3 Section 7.1's one-owner law supplies its sole D.

`BindingLifecycleObservationNativeCoordinate`, `BindingLifecycleCoverageRecordCoordinate`, and `BindingLifecycleAttributedSubjectCoordinate` are likewise H-02-S2 structural projections of accepted H-13 content. They allocate no event, proof, or record identity. `before-state` and `after-state` are deliberately absent from `BindingLifecycleObservationNativeCoordinate`: they are validated content, so unequal before/after content at one exact event coordinate is a conflict rather than a key split. The attribution verdict and wrapper are absent from `BindingLifecycleAttributedSubjectCoordinate`, so attribution cannot key itself. Proof, key, controller, signature, digest, database row, arrival, provider, component, result, and storage identity are forbidden in every coordinate above.

There is no other legal branch. Tables 2-A0, 2-A1, 2-A, 2-B, and 2-C are normative total projections for every accepted source family consumed by Sections 3 or 5. A value outside the exact typed domain is invalid and yields `unsupported-required-semantics`; no implementation may invent a coordinate or choose a dispatch branch.

The source occurrence and an H-13 reference to that occurrence are different semantic objects:

```text
OwnerNativeSemanticOccurrence = (
  exact TrustSemanticEvidenceLogicalSourceDomain fixed by the owning source,
  exact owner-native SourceNativeOccurrenceCoordinate from the closed union
    above and Table 2-A,
  exact owner-native semantic source value
)

OwnerNativeSemanticOccurrenceFamily =
  exact finite multiplicity function supplied by the complete accepted
  occurrence family of that owning semantic source

H13SourceProjectionContainerCoordinate =
  h02-applicability-candidate(exact H02ApplicabilityCandidateCoordinate)
  | h13-semantic-record(exact SemanticRecordCoordinate)

H13DirectSourceSemanticRole =
  h02-content(
    organization-registration | boundary-permission |
    workspace-state | workspace-overlay)
  | tenant-presentation-mapping
  | h07-authoritative-input
  | authoritative-source-attribution(
      organization-registration | boundary-permission |
      workspace-state | workspace-overlay | h07-connection |
      runtime-correspondence | producer-independence |
      absence-source-control | producer-binding-continuity |
      context-local-separation)
  | producer-intrinsic-raw(
      activation | observation-mechanism | report-mechanism |
      capability-binding)
  | producer-intrinsic-direct-attribution
  | ordinary-direct-source(
      direct-producer-fact | observation-occurrence)
  | ordinary-source-attribution(
      direct-producer-fact | observation-occurrence)
  | binding-baseline-direct-attribution
  | binding-baseline-owner-observation
  | binding-lifecycle-direct-attribution
  | binding-lifecycle-coverage-statement
  | binding-lifecycle-observation
  | binding-bootstrap-population-member
  | binding-bootstrap-raw-candidate
  | protected-detector-source
  | qualified-physical-time-input
  | iaa-measured-conclusion(
      runtime-correspondence | producer-independence |
      absence-source-control | producer-binding-continuity |
      context-local-separation)
  | historical-currentness
  | h13-s3-owner-native-raw-family(
      exact H13RawInputFamilyCoordinate)
  | h13-s3-accepted-pre-freeze-placeholder(
      exact H13PreFreezePlaceholderCoordinate)
  | h13-s3-lifecycle-owner-reference(
      exact H13QScopedProducerLifecycleOccurrenceReferenceCoordinate,
      exact H13ProducerLifecycleOccurrenceOwnerReference)

H13ProvenanceNodeDirectPathToken =
  authoritative-h02-content
  | authoritative-h02-content-attribution
  | historical-currentness-qualification
  | authoritative-h07-input
  | iaa-measured-conclusion
  | iaa-measured-conclusion-attribution
  | producer-candidate-raw-occurrence
  | binding-bootstrap-population-member
  | binding-baseline-direct-attribution
  | binding-baseline-owner-observation
  | binding-lifecycle-direct-attribution
  | binding-lifecycle-coverage-statement-aggregate
  | binding-lifecycle-observation-member
  | iaa-binding-continuity-conclusion
  | iaa-binding-continuity-attribution
  | direct-producer-fact-content
  | direct-producer-fact-attribution
  | iaa-absence-source-control-conclusion
  | iaa-absence-source-control-attribution
  | iaa-producer-independence-conclusion
  | iaa-producer-independence-attribution
  | protected-detector-source
  | observation-occurrence-content
  | observation-occurrence-attribution
  | qualified-time-source-input

H13DirectInnerOccurrenceCoordinate =
  no-inner-occurrence
  | producer-intrinsic(exact ProducerIntrinsicLifecycleMemberCoordinate)
  | binding-bootstrap(exact BindingBootstrapSourceCoordinate)
  | binding-baseline(
      exact BindingBaselineOwnerSlot,
      exact BindingBootstrapSourceCoordinate)
  | binding-lifecycle-attribution(
      exact BindingLifecycleAttributedSubjectCoordinate)
  | binding-lifecycle-coverage(
      exact BindingLifecycleCoverageRecordCoordinate)
  | binding-lifecycle-observation(
      exact BindingLifecycleObservationNativeCoordinate)
  | direct-producer-fact(
      exact DirectSemanticPropositionCoordinate,
      exact ProducerIncarnation)
  | observation(exact ObservationOccurrenceCoordinate)
  | authoritative-h02-candidate(
      exact side,
      exact authoritative H-02 source family tag,
      exact H02ApplicabilityCandidateCoordinate)
  | measured-conclusion(exact accepted measured-conclusion coordinate)
  | protected-detector(exact accepted protected-source coordinate)
  | qualified-time(exact semantic state position)
  | historical-currentness(
      exact HistoricalCurrentnessSubject,
      exact AuthorityUseCut)
  | h13-s3-raw-family-member(
      exact H13RawInputFamilyCoordinate D,
      exact H13S3OwnerNativeRawFamilyMemberCoordinate(D))
  | h13-s3-pre-freeze-placeholder(
      exact H13PreFreezePlaceholderCoordinate)
  | h13-s3-lifecycle-owner-reference(
      exact H13QScopedProducerLifecycleOccurrenceReferenceCoordinate)

H13DirectSourceReferencePath =
  h02-applicability-candidate-direct-content(
    exact H02ApplicabilityCandidateCoordinate)
  | h02-applicability-candidate-direct-attribution(
      exact H02ApplicabilityCandidateCoordinate)
  | provenance-node-direct-represented-source(
      exact NodeSemanticCoordinate,
      exact H13ProvenanceNodeDirectPathToken,
      exact H13DirectInnerOccurrenceCoordinate)
  | stage-a-population-direct-member(
      exact side,
      exact authoritative H-02 source family tag,
      exact H02ApplicabilityCandidateCoordinate)
  | stage-b-direct(
      exact H13StageBDirectSourceReferencePath)

H13DirectSourceReferenceSlot = (
  exact H13DirectSourceSemanticRole,
  exact H13DirectSourceReferencePath
)

H13SourceProjectionReferenceCoordinate = (
  exact H13SourceProjectionContainerCoordinate,
  exact H13DirectSourceReferenceSlot,
  exact expected owner-native SourceNativeOccurrenceCoordinate
)

H13SourceProjectionReference = (
  exact H13SourceProjectionReferenceCoordinate,
  exact projected owner-native semantic value
)

H13SourceProjectionReferenceFamily =
  exact finite multiplicity function over H13SourceProjectionReference values
  retained from the complete accepted H-13 candidate/semantic-record/provenance
  container population, including accepted inner multiplicity where that
  container carries an occurrence family

H13ProjectionToOwnerNativeSourceRelation = (
  exact H13SourceProjectionReference,
  exact OwnerNativeSemanticOccurrenceFamily selected solely by its owner-native
    logical source domain and coordinate,
  exact multiplicity in that owner-native family of the referenced complete
    semantic value,
  relationDisposition = matched | failed | unavailable | indeterminate |
    contradictory
)

H13RequiredSourceProjectionReferenceFamily(container) =
  the exact finite multiplicity function obtained by applying Tables 2-D1
  through 2-D4 to the container class once, using only the closed
  H13DirectSourceReferencePath tokens and accepted-native semantic member
  coordinates emitted by those tables
```

`H13StageBDirectSourceReferencePath` is the following closed H-02-only derived-output union:

```text
H13StageBDirectSourceReferencePath =
  authoritative-h07-literal(
    exact H13PreFreezeLiteralInputValue whose branch is authoritative-h07-input)
  | raw-family-member(
      exact H13RawInputFamilyCoordinate D,
      exact H13S3OwnerNativeRawFamilyMemberCoordinate(D))
  | accepted-placeholder(
      exact H13PreFreezePlaceholderCoordinate D)
  | lifecycle-owner-reference(
      exact H13QScopedProducerLifecycleOccurrenceReferenceCoordinate R,
      exact H13ProducerLifecycleOccurrenceOwnerReference O)
```

This union is output only. A caller/provider-supplied `stage-b-direct(...)` value is not an `H13EvaluationPopulationMember`, cannot select a branch, and fails the invalid-input boundary below. No path token creates an H-13 member, source occurrence, owner, or authority.

This is a newly proposed H-02-S2 verification relation over literal accepted H-13 candidate and `SemanticRecordCoordinate` values; it is not an accepted H-13 type and does not alter H-13 identity. The H-13 container coordinate and closed Table 2-A represented-source role identify the reference independently of the source occurrence. `matched` requires exact coordinate/value equality and owner-native value multiplicity at least one. One resolved reference to a wrong owner-native coordinate or unequal value is `failed` with `projection-reference-mismatch`; a required reference or membership source that is absent/unobtainable is `unavailable` with `projection-reference-missing`; present reference evidence that cannot uniquely resolve its container, source slot, or membership is `indeterminate` with `projection-reference-indeterminate`; mutually incompatible retained authoritative references or membership claims are `contradictory` with `projection-reference-contradictory`. Every repeated projection must be coherent.

A projection reference never allocates a source occurrence, consumes an occurrence token, or changes `OwnerNativeSemanticOccurrenceFamily`. Ten H-13 references to one source occurrence leave owner-native multiplicity one. Two equal occurrences actually supplied by the owner-native family retain multiplicity two regardless of references. Multiple H-13 references remain separately auditable at their unequal accepted candidate/semantic-record coordinates; equal reference repetitions inside one accepted multiplicity-bearing container remain counted in `H13SourceProjectionReferenceFamily` and are never silently set-projected. No reference is discarded because another points to the same source. A missing expected H-13 reference makes H-13 provenance/population incomplete without deleting or changing the independently established source family. There is no first/reference-wins rule, no reference-count dedup heuristic, and no matching assignment that can hide a source duplicate or manufacture a source occurrence.

`H13SourceProjectionReferenceFamily` is a deterministic verification projection of each closed accepted H-13 candidate/semantic-record/provenance container, not another `TrustSemanticEvidenceOccurrence` family. It MUST equal `H13RequiredSourceProjectionReferenceFamily(container)` exactly under Tables 2-D1 through 2-D4, including accepted inner multiplicity and every exact-empty result. The accepted container keeps its existing Table 2-C class and complete inner multiplicity; projecting references neither consumes that record twice nor creates another Table 2-C source row. An omitted required reference is `unavailable` with `projection-reference-missing`; an additional reference not generated by Tables 2-D1 through 2-D4 is `failed` with `projection-reference-unexpected`. Equal duplicate generated references remain multiplicity-bearing and `indeterminate`; unequal retained references at one exact reference coordinate are `contradictory`. No implementation may recurse through dependencies, infer a source from provenance connectivity, or choose a broader or narrower traversal.

**Table 2-A — accepted source type to exact native slot**

| Accepted source family consumed by H-02-S2 | Exact `content-native coordinate` or `direct-source coordinate` |
|---|---|
| R8-10 Organization registration content | exact `OrganizationIAARegistrationRevisionIdentity` |
| R8-25 boundary-permission content | exact `IsolationBoundaryPermissionRevisionIdentity` |
| R8-15 Workspace state content | exact `WorkspaceIAAStateRevisionIdentity` |
| R8-18 Workspace overlay content | exact `WorkspaceIAAOverlayRevisionIdentity` |
| R8-34 tenant presentation mapping, including same-namespace collision candidates | exact `(TenantPresentationNamespace, stable source subject)` |
| H-07 authoritative Connection semantic bundle | exact accepted H-13 `SemanticRecordCoordinate(node-semantic-value(authoritative-h07-input), connection-scope(ConnectionEvaluationKey), h07-connection-authoritative-input)` |
| accepted H-13-S3 `raw-input-family(D,F)` occurrence x for which `R12H13RawSourceDispatchOf(D,x)` is `H13_S3_GENERIC_NATIVE_COORDINATE` | exact `h13-s3-owner-native-raw-family-member(D,H13S3OwnerNativeRawFamilyMemberCoordinate(D,x))` carried by that same dispatch record |
| accepted H-13-S3 pre-freeze source placeholder whose Table 2-D4 branch is direct | exact `h13-s3-accepted-pre-freeze-placeholder(D)`; V is validated content and unequal V at one D is a conflict, not a key split |
| `AuthoritativeSourceAttribution` for Organization registration, boundary permission, Workspace state, or Workspace overlay | the exact matching revision identity in the first four rows; a surrounding `H02ApplicabilityCandidateCoordinate`, side, Connection, provider, or record location is not added |
| `AuthoritativeSourceAttribution` for `RuntimeCorrespondence` | exact `PermissionEvaluationCoordinate` |
| `AuthoritativeSourceAttribution` for `ProducerIndependenceMeasuredConclusion` | exact `ProducerIndependenceCoordinate` |
| `AuthoritativeSourceAttribution` for `AbsenceSourceControlMeasuredConclusion` | exact `AbsenceSourceControlCoordinate` |
| `AuthoritativeSourceAttribution` for `ProducerBindingContinuityMeasuredConclusion` | exact `(PermissionEvaluationCoordinate Q, ProducerIncarnation P, ProducerBindingStateCut B, AuthorityUseCut U)` prescribed by the accepted `iaa-binding-continuity` question |
| `AuthoritativeSourceAttribution` for `IAAContextLocalSeparationConclusion` | exact `LocalIAASeparationKey` |
| `AuthoritativeSourceAttribution` for the H-07 bundle | exact `SemanticRecordCoordinate(node-semantic-value(authoritative-h07-input),connection-scope(ConnectionEvaluationKey),h07-connection-authoritative-input)` |
| raw activation birth/end/restart occurrence family in `ProducerIntrinsicLifecycleEvidence` | exact `activation(...)` branch of newly proposed H-02-S2 `ProducerIntrinsicLifecycleMemberCoordinate` |
| raw observation-mechanism birth/end/replacement occurrence family in `ProducerIntrinsicLifecycleEvidence` | exact `observation-mechanism(...)` branch of newly proposed H-02-S2 `ProducerIntrinsicLifecycleMemberCoordinate` |
| raw report-mechanism birth/end/replacement occurrence family in `ProducerIntrinsicLifecycleEvidence` | exact `report-mechanism(...)` branch of newly proposed H-02-S2 `ProducerIntrinsicLifecycleMemberCoordinate` |
| raw capability-binding add/remove/change occurrence family in `ProducerIntrinsicLifecycleEvidence` | exact `capability-binding(...)` branch of newly proposed H-02-S2 `ProducerIntrinsicLifecycleMemberCoordinate` |
| direct `ProducerIntrinsicLifecycleDirectAttribution` wrapper occurrence family | exact wrapper-omitted `ProducerIntrinsicLifecycleMemberCoordinate`; wrapper and verdict are validated content and cannot add a raw lifecycle-member occurrence |
| direct Producer fact and its ordinary `SourceAttribution` | exact `(DirectSemanticPropositionCoordinate, ProducerIncarnation)` prescribed by accepted `direct-fact(...)` |
| `ObservationOccurrence` and its ordinary `SourceAttribution` | exact `ObservationOccurrenceCoordinate` |
| `BindingBaselineDirectAttribution` / `BindingBaselineOwnerObservation` | exact `(BindingBaselineOwnerSlot, BindingBootstrapSourceCoordinate)` prescribed by accepted `binding-baseline-owner-slot(...)` |
| `BindingLifecycleDirectAttribution` | exact `BindingLifecycleAttributedSubjectCoordinate` |
| `BindingLifecycleCoverageStatement` | exact `BindingLifecycleCoverageRecordCoordinate` |
| raw `BindingLifecycleObservation` | exact `BindingLifecycleObservationNativeCoordinate` |
| complete `BindingBootstrapSourceCandidatePopulation` record | exact `SemanticRecordCoordinate(node-semantic-value(binding-bootstrap-source-population), permission-scope(Q), binding-bootstrap-source-population(exact baseline-or-lifecycle slot))` |
| raw binding bootstrap source candidate or unavailable placeholder | exact `BindingBootstrapSourceCoordinate` |
| raw protected detector source | exact `(ProtectedDetectorEvaluationKey, DetectorSourceDomain, protected domain owner, protected source scope)` prescribed by accepted `protected-source(...)` |
| raw qualified physical-time input | exact semantic state position prescribed by accepted `qualified-time-source(...)` |
| `RuntimeCorrespondence` conclusion occurrence | exact `PermissionEvaluationCoordinate` |
| `ProducerIndependenceMeasuredConclusion` occurrence | exact `ProducerIndependenceCoordinate` |
| `AbsenceSourceControlMeasuredConclusion` occurrence | exact `AbsenceSourceControlCoordinate` |
| `ProducerBindingContinuityMeasuredConclusion` occurrence | exact `(Q, P, B, U)` prescribed by accepted `iaa-binding-continuity(...)` |
| `IAAContextLocalSeparationConclusion` occurrence | exact `LocalIAASeparationKey` |
| `HistoricalCurrentnessQualification` | exact `(HistoricalCurrentnessSubject, AuthorityUseCut)` |
| every accepted H-13 `ProvenanceNode` semantic record as a record source, independently of any direct source represented by that record | exact `SemanticRecordCoordinate(node-semantic-value(ProvenanceNodeType), EvaluationScope, QuestionKey)`; direct represented sources use separately generated Table 2-D2 references and cannot rekey the record |
| accepted Stage-A population, Stage-B population, derivation population, evaluation-provenance candidate, each provenance check, provenance validation reason set, and provenance integrity state | its exact accepted non-node `SemanticRecordCoordinate` in `RequiredRecordSet` |

Where an H-13 semantic record's represented value is a tagged absent/unique/ambiguous candidate or an occurrence family, the table maps the whole accepted record slot, and the raw `TrustSemanticEvidenceOccurrence` value retains that accepted tag, family, and multiplicity unchanged. H-02-S2 does not flatten, deduplicate, or manufacture a second slot for a member already keyed by the accepted H-13 question. The H-13-S3 generic row is selected only by the explicit `GENERIC(D,x)` results in Table 2-A1. Every exact Table 2-A0 type instead returns its carried existing-native coordinate. A D/x type mismatch is invalid, not an overlap decision. Externally owned source content represented through multiple H-13 projections therefore continues to use its external owner's first-class native coordinate. Each enclosing H-13 candidate or semantic/provenance record remains a distinct `H13SourceProjectionReference` at its accepted container coordinate, but cannot split the source key or increment owner-native multiplicity.

**Table 2-B — ownerless H-13 structural output slots**

```text
H13OwnerlessStructuralOutputSlot =
  connection-isolation-evaluation
  | connection-evaluation-key
  | host-side-evaluation(exact host SideEvaluationKey)
  | agent-side-evaluation(exact agent SideEvaluationKey)
  | h13-applicable-reason-set
  | h13-profile-evaluation-state
  | h13-coverage-state
  | h13-current-use-disposition
  | h13-isolation-gate-decision
  | h13-result-completeness-gate
  | h13-result-completeness-state
```

These Table 2-B values are deterministic H-13 structural outputs with no external author. Their owning type tag is `h13-ownerless-structural-output`, their exact structural coordinate is `(ConnectionEvaluationKey, slot)`, and no signer, key, proof, storage identity, or controller is invented. Any H-13 structural/provenance value already possessing an accepted `SemanticRecordCoordinate` must use `h13-semantic-record` instead of Table 2-B; the two branches cannot be caller-selected aliases.

**Table 2-C — total source-family cardinality audit**

In the duplicate/conflict columns below, "equal duplicate" always means two or more semantically equal representations at the same exact atomic member or aggregate-record coordinate and maps to `indeterminate` plus `equal-duplicate-occurrence`. "Unequal duplicate" always means two or more semantically unequal representations at that same coordinate and maps to `contradictory` plus `conflicting-duplicate-occurrence`. For a multiplicity-bearing family, those rules apply only after exact member coordinates are formed; unequal legitimate member coordinates are not duplicates.

| Accepted source family | `CARDINALITY_CLASS` | `EXACT_MEMBER_OR_RECORD_COORDINATE` | `DUPLICATE_SEMANTICS` | `CONFLICT_SEMANTICS` | `INNER_MULTIPLICITY_PRESERVED` |
|---|---|---|---|---|---|
| Organization registration revision content | `EXACT_ONCE_ATOMIC_SLOT` | `OrganizationIAARegistrationRevisionIdentity` | equal duplicate at revision slot is indeterminate | unequal content at revision slot is contradictory | N/A |
| boundary-permission revision content | `EXACT_ONCE_ATOMIC_SLOT` | `IsolationBoundaryPermissionRevisionIdentity` | equal duplicate at revision slot is indeterminate | unequal content at revision slot is contradictory | N/A |
| Workspace state revision content | `EXACT_ONCE_ATOMIC_SLOT` | `WorkspaceIAAStateRevisionIdentity` | equal duplicate at revision slot is indeterminate | unequal content at revision slot is contradictory | N/A |
| Workspace overlay revision content | `EXACT_ONCE_ATOMIC_SLOT` | `WorkspaceIAAOverlayRevisionIdentity` | equal duplicate at revision slot is indeterminate | unequal content at revision slot is contradictory | N/A |
| tenant presentation mapping relation or collision candidate | `EXACT_ONCE_ATOMIC_SLOT` | `(TenantPresentationNamespace, stable source subject)` | equal duplicate for one relation slot is indeterminate | unequal mapping content at one slot is contradictory; equal carriers at unequal subject slots remain distinct collision candidates | N/A |
| H-07 authoritative Connection input bundle | `EXACT_ONCE_ATOMIC_SLOT` | accepted authoritative-H-07 `SemanticRecordCoordinate` | equal duplicate at record slot is indeterminate | unequal bundles at the slot are contradictory | N/A |
| accepted H-13-S3 `raw-input-family(D,F)` occurrence x whose one `R12H13RawSourceDispatchOf(D,x)` result is `H13_S3_GENERIC_NATIVE_COORDINATE` | `MULTIPLICITY_BEARING_ATOMIC_FAMILY`, carried by that result | exact `H13S3OwnerNativeRawFamilyMemberCoordinate(D,x)` | equal complete x repetitions at one exact D/member coordinate remain multiplicity and are indeterminate | unequal complete values at one exact D/member coordinate are contradictory | YES, exactly F's occurrences in this typed source family |
| accepted H-13-S3 `pre-freeze-placeholder(D,V)` | `EXACT_ONCE_ATOMIC_SLOT` | exact `h13-s3-accepted-pre-freeze-placeholder(D)` | equal duplicate V at D is indeterminate | unequal V at D is contradictory | N/A |
| `AuthoritativeSourceAttribution` for Organization registration | `EXACT_ONCE_ATOMIC_SLOT` | `OrganizationIAARegistrationRevisionIdentity` | equal duplicate at attributed revision slot is indeterminate | unequal attribution/content at the slot is contradictory | N/A |
| `AuthoritativeSourceAttribution` for boundary permission | `EXACT_ONCE_ATOMIC_SLOT` | `IsolationBoundaryPermissionRevisionIdentity` | equal duplicate at attributed revision slot is indeterminate | unequal attribution/content at the slot is contradictory | N/A |
| `AuthoritativeSourceAttribution` for Workspace state | `EXACT_ONCE_ATOMIC_SLOT` | `WorkspaceIAAStateRevisionIdentity` | equal duplicate at attributed revision slot is indeterminate | unequal attribution/content at the slot is contradictory | N/A |
| `AuthoritativeSourceAttribution` for Workspace overlay | `EXACT_ONCE_ATOMIC_SLOT` | `WorkspaceIAAOverlayRevisionIdentity` | equal duplicate at attributed revision slot is indeterminate | unequal attribution/content at the slot is contradictory | N/A |
| `AuthoritativeSourceAttribution` for RuntimeCorrespondence | `EXACT_ONCE_ATOMIC_SLOT` | `PermissionEvaluationCoordinate` | equal duplicate at attributed conclusion slot is indeterminate | unequal attribution/content at the slot is contradictory | N/A |
| `AuthoritativeSourceAttribution` for ProducerIndependence | `EXACT_ONCE_ATOMIC_SLOT` | `ProducerIndependenceCoordinate` | equal duplicate at attributed conclusion slot is indeterminate | unequal attribution/content at the slot is contradictory | N/A |
| `AuthoritativeSourceAttribution` for AbsenceSourceControl | `EXACT_ONCE_ATOMIC_SLOT` | `AbsenceSourceControlCoordinate` | equal duplicate at attributed conclusion slot is indeterminate | unequal attribution/content at the slot is contradictory | N/A |
| `AuthoritativeSourceAttribution` for ProducerBindingContinuity | `EXACT_ONCE_ATOMIC_SLOT` | `(PermissionEvaluationCoordinate Q, ProducerIncarnation P, ProducerBindingStateCut B, AuthorityUseCut U)` | equal duplicate at attributed conclusion slot is indeterminate | unequal attribution/content at the slot is contradictory | N/A |
| `AuthoritativeSourceAttribution` for IAA context-local separation | `EXACT_ONCE_ATOMIC_SLOT` | `LocalIAASeparationKey` | equal duplicate at attributed conclusion slot is indeterminate | unequal attribution/content at the slot is contradictory | N/A |
| `AuthoritativeSourceAttribution` for the H-07 bundle | `EXACT_ONCE_ATOMIC_SLOT` | exact authoritative-H-07 `SemanticRecordCoordinate` | equal duplicate at attributed bundle slot is indeterminate | unequal attribution/content at the slot is contradictory | N/A |
| raw Producer activation birth/end/restart occurrence family | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `activation(...)` branch of `ProducerIntrinsicLifecycleMemberCoordinate` | unequal closed event/member coordinates are independent; equal complete raw event repetitions at one coordinate are indeterminate | unequal raw event content at one equal coordinate is contradictory | YES |
| raw Producer observation-mechanism birth/end/replacement occurrence family | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `observation-mechanism(...)` branch of `ProducerIntrinsicLifecycleMemberCoordinate` | unequal closed event/member coordinates are independent; equal complete raw event repetitions at one coordinate are indeterminate | unequal raw event content at one equal coordinate is contradictory | YES |
| raw Producer report-mechanism birth/end/replacement occurrence family | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `report-mechanism(...)` branch of `ProducerIntrinsicLifecycleMemberCoordinate` | unequal closed event/member coordinates are independent; equal complete raw event repetitions at one coordinate are indeterminate | unequal raw event content at one equal coordinate is contradictory | YES |
| raw Producer capability-binding add/remove/change occurrence family | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `capability-binding(...)` branch of `ProducerIntrinsicLifecycleMemberCoordinate` | unequal closed event/member coordinates are independent; equal complete raw event repetitions at one coordinate are indeterminate | unequal raw event content at one equal coordinate is contradictory | YES |
| `ProducerIntrinsicLifecycleDirectAttribution` wrapper occurrence family | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | wrapper-omitted `ProducerIntrinsicLifecycleMemberCoordinate` under the distinct `producer-intrinsic-lifecycle-attribution` source tag | unequal attributed-member coordinates are independent; equal wrapper repetitions at one member are indeterminate and never increment the raw member family | unequal wrapper owner/member/verdict/content at one member coordinate is contradictory | YES, separately from raw-member multiplicity |
| direct Producer fact and ordinary `SourceAttribution` | `EXACT_ONCE_ATOMIC_SLOT` | `(DirectSemanticPropositionCoordinate, ProducerIncarnation)` | equal duplicate at proposition/source slot is indeterminate | unequal fact or attribution at the slot is contradictory | N/A |
| `ObservationOccurrence` and ordinary `SourceAttribution` | `EXACT_ONCE_ATOMIC_SLOT` | `ObservationOccurrenceCoordinate` | equal duplicate at occurrence coordinate is indeterminate | unequal statement/attribution/lifecycle content at the coordinate is contradictory | N/A |
| `BindingBaselineDirectAttribution` | `EXACT_ONCE_ATOMIC_SLOT` | `(BindingBaselineOwnerSlot, BindingBootstrapSourceCoordinate)` | equal duplicate at slot/source is indeterminate | unequal wrapper-omitted baseline content/attribution at slot/source is contradictory | N/A |
| `BindingBaselineOwnerObservation` | `EXACT_ONCE_ATOMIC_SLOT` | `(BindingBaselineOwnerSlot, BindingBootstrapSourceCoordinate)` | equal duplicate at slot/source is indeterminate | unequal actual owner projection at slot/source is contradictory | N/A |
| `BindingLifecycleDirectAttribution` | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `BindingLifecycleAttributedSubjectCoordinate` | unequal attributed-subject coordinates are independent; equal representations of one attributed subject are indeterminate | unequal wrapper-omitted content or attribution at one attributed-subject coordinate is contradictory | YES |
| `BindingLifecycleCoverageStatement` | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `BindingLifecycleCoverageRecordCoordinate` | equal duplicate of the complete coverage record is indeterminate | unequal interval/family/order/concurrency/attribution content at the record coordinate is contradictory | YES |
| raw `BindingLifecycleObservation` | `MULTIPLICITY_BEARING_ATOMIC_FAMILY` | `BindingLifecycleObservationNativeCoordinate` | unequal event positions or unequal affected sets are distinct members; equal representations at one event-native coordinate are indeterminate | unequal before/after or other semantic content at one event-native coordinate is contradictory | YES |
| `BindingBootstrapSourceCandidatePopulation` | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | accepted semantic-record coordinate for the exact baseline or lifecycle owner slot | equal duplicate of the complete population record is indeterminate | unequal candidate/raw-occurrence/placeholder/cardinality maps at the record coordinate are contradictory | YES |
| raw bootstrap source candidate or accepted unavailable placeholder | `EXACT_ONCE_ATOMIC_SLOT` | exact `BindingBootstrapSourceCoordinate` within its independently generated owner slot | equal same-source duplicate is indeterminate | unequal same-source candidate/placeholder content is contradictory; distinct source coordinates remain distinct | N/A |
| raw protected detector source | `EXACT_ONCE_ATOMIC_SLOT` | `(ProtectedDetectorEvaluationKey, DetectorSourceDomain, protected domain owner, protected source scope)` | equal duplicate at protected-source slot is indeterminate | unequal assertion at the slot is contradictory | N/A |
| qualified physical-time input occurrence | `EXACT_ONCE_ATOMIC_SLOT` | exact semantic state position at accepted `qualified-time-source` question | equal duplicate at state-position slot is indeterminate | unequal time-domain/value content at the slot is contradictory | N/A |
| RuntimeCorrespondence conclusion occurrence | `EXACT_ONCE_ATOMIC_SLOT` | `PermissionEvaluationCoordinate` | equal duplicate at conclusion slot is indeterminate | unequal conclusion/attribution at the slot is contradictory | N/A |
| ProducerIndependence conclusion occurrence | `EXACT_ONCE_ATOMIC_SLOT` | `ProducerIndependenceCoordinate` | equal duplicate at conclusion slot is indeterminate | unequal conclusion/attribution at the slot is contradictory | N/A |
| AbsenceSourceControl conclusion occurrence | `EXACT_ONCE_ATOMIC_SLOT` | `AbsenceSourceControlCoordinate` | equal duplicate at conclusion slot is indeterminate | unequal conclusion/attribution at the slot is contradictory | N/A |
| ProducerBindingContinuity conclusion occurrence | `EXACT_ONCE_ATOMIC_SLOT` | `(Q,P,B,U)` at accepted `iaa-binding-continuity` question | equal duplicate at conclusion slot is indeterminate | unequal conclusion/attribution at the slot is contradictory | N/A |
| IAAContextLocalSeparation conclusion occurrence | `EXACT_ONCE_ATOMIC_SLOT` | `LocalIAASeparationKey` | equal duplicate at conclusion slot is indeterminate | unequal conclusion/attribution at the slot is contradictory | N/A |
| `HistoricalCurrentnessQualification` | `EXACT_ONCE_ATOMIC_SLOT` | `(HistoricalCurrentnessSubject, AuthorityUseCut)` | equal duplicate at qualification slot is indeterminate | unequal qualification at the slot is contradictory | N/A |
| H-13 `ProvenanceNode` semantic record whose accepted represented-value declaration contains a candidate/occurrence family, population, or multiplicity map | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `SemanticRecordCoordinate(node-semantic-value(ProvenanceNodeType), EvaluationScope, QuestionKey)` | equal duplicate of the complete node record is indeterminate | unequal represented family/population or dependency set at one node record coordinate is contradictory | YES |
| H-13 `ProvenanceNode` semantic record whose accepted represented-value declaration contains no candidate/occurrence family, population, or multiplicity map | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `SemanticRecordCoordinate(node-semantic-value(ProvenanceNodeType), EvaluationScope, QuestionKey)` | equal duplicate of the complete node record is indeterminate | unequal represented value or dependency set at one node record coordinate is contradictory | N/A |
| Stage-A `StageAResolvedPopulation` record carrying both exact side `H02ApplicabilityPopulation` values | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `SemanticRecordCoordinate(h02-applicability-population, connection-scope(C), exact-stage-a-population)` | equal duplicate of complete Stage-A record is indeterminate | unequal candidate/audit family or projection at the record coordinate is contradictory | YES |
| Stage-B `H13EvaluationPopulation` record | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | accepted `SemanticRecordCoordinate(h13-evaluation-population, connection-scope(C), exact-stage-b-population)` | equal duplicate of complete Stage-B record is indeterminate | unequal frozen Stage-B member/family/inventory content is contradictory | YES |
| `DerivationPopulation` and its inventory | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `SemanticRecordCoordinate(derivation-population, connection-scope(C), exact-population)` | equal duplicate of complete derivation record is indeterminate | unequal coordinate population, multiplicity, or inventory is contradictory | YES |
| `EvaluationProvenanceCandidate` | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `SemanticRecordCoordinate(evaluation-provenance-candidate, connection-scope(C), substantive-stages-1-through-13)` | equal duplicate of complete candidate record is indeterminate | unequal node occurrence family, declared edges, or population dependencies is contradictory | YES |
| each accepted provenance validation check | `EXACT_ONCE_ATOMIC_SLOT` | its exact accepted non-node `SemanticRecordCoordinate` in `RequiredRecordSet` | equal duplicate at check slot is indeterminate | unequal check outcome at the slot is contradictory | N/A |
| H-13 `SemanticReasonSet` provenance-node record | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `SemanticRecordCoordinate(node-semantic-value(semantic-reason-set), connection-scope(C), semantic-reason-set)` | equal duplicate of complete set record is indeterminate | unequal complete reason set at the record coordinate is contradictory | N/A |
| H-13 `ProvenanceValidationReasonSet` record | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `SemanticRecordCoordinate(provenance-validation-reason-set, connection-scope(C), provenance-validation-reason-set)` | equal duplicate of complete set record is indeterminate | unequal complete reason set at the record coordinate is contradictory | N/A |
| H-13 `ApplicableReasonSet` ownerless output | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `(ConnectionEvaluationKey, h13-applicable-reason-set)` | equal duplicate of complete set record is indeterminate | unequal complete reason set at the record coordinate is contradictory | N/A |
| H-13 non-node `ProvenanceIntegrityState` record | `EXACT_ONCE_ATOMIC_SLOT` | `SemanticRecordCoordinate(provenance-integrity-state, connection-scope(C), provenance-integrity-state)` | equal duplicate at state-record slot is indeterminate | unequal state at the slot is contradictory | N/A |
| complete `ConnectionIsolationEvaluation` ownerless output | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `(ConnectionEvaluationKey, connection-isolation-evaluation)` | equal duplicate of complete structural record is indeterminate | unequal complete structural values at the record coordinate are contradictory | YES |
| `ConnectionEvaluationKey` ownerless output | `EXACT_ONCE_ATOMIC_SLOT` | `(ConnectionEvaluationKey, connection-evaluation-key)` | equal duplicate at output slot is indeterminate | unequal output at the slot is contradictory | N/A |
| host `SideEvaluation` ownerless output | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `(ConnectionEvaluationKey, host-side-evaluation(exact host SideEvaluationKey))` | equal duplicate of complete structural record is indeterminate | unequal host-side structural values at the record coordinate are contradictory | YES |
| agent `SideEvaluation` ownerless output | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `(ConnectionEvaluationKey, agent-side-evaluation(exact agent SideEvaluationKey))` | equal duplicate of complete structural record is indeterminate | unequal agent-side structural values at the record coordinate are contradictory | YES |
| H-13 profile-evaluation state ownerless output | `EXACT_ONCE_ATOMIC_SLOT` | `(ConnectionEvaluationKey, h13-profile-evaluation-state)` | equal duplicate at output slot is indeterminate | unequal output at the slot is contradictory | N/A |
| H-13 coverage state ownerless output | `EXACT_ONCE_ATOMIC_SLOT` | `(ConnectionEvaluationKey, h13-coverage-state)` | equal duplicate at output slot is indeterminate | unequal output at the slot is contradictory | N/A |
| H-13 final current-use disposition ownerless output | `EXACT_ONCE_ATOMIC_SLOT` | `(ConnectionEvaluationKey, h13-current-use-disposition)` | equal duplicate at output slot is indeterminate | unequal output at the slot is contradictory | N/A |
| H-13 isolation-gate decision ownerless output | `EXACT_ONCE_ATOMIC_SLOT` | `(ConnectionEvaluationKey, h13-isolation-gate-decision)` | equal duplicate at output slot is indeterminate | unequal output at the slot is contradictory | N/A |
| H-13 result-completeness gate ownerless output | `EXACT_ONCE_AGGREGATE_FAMILY_RECORD` | `(ConnectionEvaluationKey, h13-result-completeness-gate)` | equal duplicate of the complete gate record is indeterminate | unequal inventory/missing/conflict/state content at the slot is contradictory | N/A |
| H-13 result-completeness state ownerless output | `EXACT_ONCE_ATOMIC_SLOT` | `(ConnectionEvaluationKey, h13-result-completeness-state)` | equal duplicate at output slot is indeterminate | unequal output at the slot is contradictory | N/A |

For a legal H-13-S3 raw-family member D/x, an implementation MUST NOT scan or independently match Table 2-C. It evaluates `R12H13RawSourceDispatchOf(D,x)` once and projects that record's `cardinalityClass`. The descriptive Table 2-C row with the same accepted source type is a consistency restatement. Any coordinate result and class result that are not projections of the same semantic dispatch-result value are nonconforming with `source-cardinality-class-mismatch`; no runtime object identity is implied.

The two provenance-node rows are closed and exhaustive: accepted H-13 `ProvenanceNodeType`, `EvaluationScope`, `QuestionKey`, and represented-value declaration determine the row; no caller supplies the classification. In every aggregate row, the aggregate record occurs once, its complete inner value remains unchanged, and no inner member is independently reintroduced under the aggregate record's outer coordinate. In every multiplicity-bearing row, the complete member occurrence family, raw multiplicity, unique semantic order, and explicit concurrency remain intact. `BindingLifecycleCoverageStatement` and its raw observation members may both appear only in their distinct accepted source-family roles; flattening the statement while also consuming its record is double-counting and an invalid population.

**Tables 2-D1 through 2-D4 — closed required H-13 direct-reference path algebra**

“Direct” is not a representation test. It means only that one row below emits one `H13DirectSourceReferencePath` token from an accepted semantic value at the named container coordinate. No property name, JSON member, schema path, document nesting, storage location, reflection API, byte position, or implementation object graph participates. “One per inner occurrence” applies the accepted multiplicity function at the exact already-defined `H13DirectInnerOccurrenceCoordinate`; it never set-projects equal values. “Exact empty” is a required result. Every aggregate boundary and traversal stop is stated below.

**Table 2-D1 — top-level container dispatch**

| Exact accepted container class | Exact emitted path family | Aggregate boundary and traversal stop |
|---|---|---|
| `h02-applicability-candidate(A)` | one `h02-applicability-candidate-direct-content(A)` for A's exact authoritative H-02 content occurrence and, when A directly carries the distinct real-owner attribution occurrence, one `h02-applicability-candidate-direct-attribution(A)` | stop at A; do not enter any provenance node or population containing A |
| `h13-semantic-record(node-semantic-value(T), scope, question)` | apply Table 2-D2 to T and only to that node's represented `SemanticValue` | `NodeSemanticCoordinate` is the container-local root; `RequiredDependencies` and `declared DependencyCoordinateSet` are never visited |
| `h13-semantic-record(h02-applicability-population, connection-scope(C), exact-stage-a-population)` | apply the Stage-A row of Table 2-D3 | the complete `StageAResolvedPopulation` is one aggregate; emit only its literal candidate-member paths and do not enter candidate provenance |
| `h13-semantic-record(h13-evaluation-population, connection-scope(C), exact-stage-b-population)` | apply the exact accepted-member classifier and reference-generation function in Table 2-D4 to every member of the mathematical set once | the Stage-B record is the container; only a Table 2-D4 direct branch emits; nested Stage A, selected aggregates, question wrappers, dependencies, and derived values are never traversed |
| `derivation-population`, `evaluation-provenance-candidate`, every `provenance-check`, `provenance-validation-reason-set`, `provenance-integrity-state`, `RequiredRecordSet`, `RequiredDerivationInventory`, or a Table 2-B ownerless output | exact empty | stop at the named value; inventories, declared edges, reasons, validation/completeness/final results, and nested records are never descended |
| any container semantic class outside the five closed rows above | no reference can be generated; classify the structural requirement `unsupported-required-semantics` | no fallback, reflection, or “contains” rule exists |

**Table 2-D2 — exhaustive `ProvenanceNodeType` dispatch**

| Exact `ProvenanceNodeType` | Exact direct path/role rule | Inner multiplicity and boundary |
|---|---|---|
| `authoritative-h02-input` | `authoritative-h02-content` with matching `h02-content(...)`; plus `authoritative-h02-content-attribution` with matching `authoritative-source-attribution(...)` when that distinct attribution occurrence is carried | no inner occurrence; stop at the two prescribed semantic fields |
| `historical-currentness-qualification` | one `historical-currentness-qualification` / `historical-currentness` | exact subject/cut coordinate; stop |
| `authoritative-h07-input` | one `authoritative-h07-input` / `h07-authoritative-input` | no inner occurrence; stop |
| `iaa-measured-input` | one `iaa-measured-conclusion` for each direct RuntimeCorrespondence or context-local-separation conclusion occurrence, plus one `iaa-measured-conclusion-attribution` for its distinct carried attribution | exact measured-conclusion coordinate; do not enter proposition results or detector dependencies |
| `producer-candidate-occurrence` | one `producer-candidate-raw-occurrence` with the exact matching source role for each raw occurrence | exact accepted raw-candidate coordinate and multiplicity; stop |
| `binding-bootstrap-source-population` | one `binding-bootstrap-population-member` / `binding-bootstrap-population-member` per direct candidate or accepted unavailable-placeholder member | exact `BindingBootstrapSourceCoordinate`; the population is the aggregate boundary and member content is not recursively inspected |
| `binding-baseline-direct-input` | one `binding-baseline-direct-attribution` and one `binding-baseline-owner-observation` for each corresponding direct occurrence actually carried | exact owner-slot/source coordinate and retained multiplicity; stop at each occurrence |
| `binding-lifecycle-direct-input` | one `binding-lifecycle-direct-attribution` per direct wrapper; one `binding-lifecycle-coverage-statement-aggregate` for the direct coverage record; and one `binding-lifecycle-observation-member` per raw observation directly carried in the node's raw family | coverage statement is one aggregate source and is not descended; raw observations use their own exact native coordinates |
| `iaa-binding-continuity-conclusion` | one `iaa-binding-continuity-conclusion` and one `iaa-binding-continuity-attribution` per direct conclusion occurrence | exact measured-conclusion coordinate; do not enter universe/baseline/lifecycle dependencies |
| `direct-producer-fact` | one `direct-producer-fact-content` and one `direct-producer-fact-attribution` per directly carried fact candidate | exact proposition/Producer coordinate and multiplicity; do not enter binding/currentness dependencies |
| `iaa-absence-source-control-conclusion` | one `iaa-absence-source-control-conclusion` and one `iaa-absence-source-control-attribution` per direct conclusion occurrence | exact `AbsenceSourceControlCoordinate`; stop |
| `iaa-producer-independence-conclusion` | one `iaa-producer-independence-conclusion` and one `iaa-producer-independence-attribution` per direct conclusion occurrence | exact `ProducerIndependenceCoordinate`; stop |
| `protected-detector-input` | one `protected-detector-source` / `protected-detector-source` per direct protected assertion | exact protected-source coordinate; stop and preserve protection |
| `observation-occurrence` | one `observation-occurrence-content` and one `observation-occurrence-attribution` per direct occurrence | exact `ObservationOccurrenceCoordinate`; do not enter direct-fact dependency |
| `qualified-time-source-input` | one `qualified-time-source-input` / `qualified-physical-time-input` | exact semantic state position; stop |
| `h02-applicability-evaluation`, `h02-applicability-population`, `h02-stage-b-applicable-input`, `relevant-producer-set`, `producer-intrinsic-continuity`, `producer-source-surface-binding`, `binding-baseline-universe`, `binding-lifecycle-universe`, `binding-bootstrap-source`, `binding-baseline-population`, `producer-source-surface-binding-baseline`, `binding-lifecycle-population`, `binding-conclusion-causality`, `producer-binding-event-coverage`, `producer-source-surface-binding-currentness`, `direct-cell-result`, `derived-influence-path-result`, `producer-coupling-base-graph`, `producer-control-coupling-state`, `producer-control-coupling-population`, `producer-threat-control-domain`, `absence-source-threat-control-domain`, `absence-source-admissibility`, `producer-influence-threat-set`, `proposition-source-independence`, `runtime-correspondence-proposition-result`, `protected-detector-evidence-disposition`, `identity-binding`, `equivalence-conclusion`, `producer-closure-assertion`, `combined-closure`, `relation-edge`, `event-coverage-assertion`, `event-requirement-source-population`, `permission-event-coverage`, `connection-event-coverage-union`, `h02-currentness-assertion`, `h07-currentness-comparison`, `iaa-measured-currentness-assertion`, `qualified-time-domain-comparison`, `measured-conclusion-freshness`, `freshness-calculation`, `reuse-provenance`, `mediated-channel-pair`, `same-side-target-overlap-graph`, `shared-governance-relation`, `f04-pair-evaluation`, `f-predicate`, `semantic-trigger-evaluation`, `semantic-reason-set`, `permission-coverage-evaluation`, `side-evaluation`, `profile-evaluation-state`, `coverage-state`, `substantive-current-use-disposition`, and `substantive-gate-decision` | exact empty | these are derived, structural, dependency/edge, population-control, reason, validation, completeness, or final-result values; their dependencies and nested semantic containers are traversal stops |
| any token not in the accepted H-13 `ProvenanceNodeType` union or any accepted node whose represented `SemanticValue` does not match its one prescribed row | no reference can satisfy the node; classify `unsupported-required-semantics` | no unknown-node fallback and no property inspection |

The long exact-empty row is the set complement of the fifteen nonempty rows within accepted H-13's closed seventy-one-token `ProvenanceNodeType` domain. It is therefore finite and exhaustive, not an open residual-category escape hatch.

**Table 2-D3 — aggregate population dispatch**

| Exact aggregate | Exact path rule | Traversal boundary |
|---|---|---|
| `StageAResolvedPopulation` at its non-node Stage-A record | one `stage-a-population-direct-member(side, authoritative H-02 family tag, A)` per raw authoritative H-02 source candidate occurrence directly carried by the two `H02ApplicabilityPopulation` values; a distinct carried real-owner attribution gets its matching attribution role at the same A coordinate | derived applicability evaluations, `H02SideApplicabilityProjection`, `ApplicablePermissionSet`, completion results, candidate provenance nodes, and every nested container emit zero |
| any nested `StageAResolvedPopulation` inside `H13EvaluationSeed` or `H13EvaluationPopulation` | exact empty in that outer container | it is a separate accepted container; only its own Stage-A record row emits its paths |
| `BindingLifecycleCoverageStatement` | one aggregate-source path for the statement itself | its carried raw observation family is not traversed; raw observations emit only from their exact closed Table 2-D2 node/value role |
| `BindingBootstrapSourceCandidatePopulation` | one member path per exact direct candidate or accepted placeholder at its existing `BindingBootstrapSourceCoordinate` | no inspection of member fields and no dependency traversal |

Accepted H-13 defines Stage B literally as the mathematical set/fixed point:

```text
P0 = H13EvaluationSeedMemberSet(H13EvaluationSeed)
P(n+1) = P(n) union H13ExpandMemberSet(P(n))
H13EvaluationPopulationMembers = least Pn such that P(n+1) = P(n)
```

Finite sets use accepted H-13 mathematical-set equality: order and multiplicity are absent. Revision 9's `H13AcceptedStageBMember` and `H13AcceptedStageBMemberFamily` are deleted. No H-02 wrapper, coordinate, occurrence identity, or multiplicity function is declared equal to `H13EvaluationPopulationMembers`. Repeated discovery of an equal member on two expansion passes leaves one top-level set member.

Multiplicity remains only at two independently owned levels:

```text
accepted top-level level = exact H13EvaluationPopulationMembers mathematical set

accepted inner level = only an occurrence/candidate family explicitly carried
  by an accepted member/value under that family's accepted multiplicity rules

H-02 reference level = H13SourceProjectionReferenceFamily multiplicity derived
  from a closed container/path rule without changing either accepted level

cardinality(H13EvaluationPopulationMembers)
  != accepted inner source occurrence multiplicity
  != H13SourceProjectionReferenceFamily multiplicity
```

None of the three levels allocates, increments, deduplicates, or substitutes another. One top-level member may carry an accepted inner family of multiplicity three and may consequently generate three references under a future exact direct row; it remains one top-level set member. Set projection never deduplicates that carried family.

**Table 2-D4 — accepted H-13-S3 Stage-B member classifier and reference generation**

Accepted H-13-S3 defines `H13EvaluationPopulationMember` as exactly the ten-constructor closed union below. Revision 12 classifies only an exact accepted constructor/value. Classification never accepts discovery rule, fixed-point pass, order, provider, representation, object shape, schema/member name, path string, dependency reachability, provenance reachability, or a caller-supplied output token.

```text
H13StageBMemberReferenceClassification =
  DIRECT(exact nonempty H13SourceProjectionReferenceFamily)
  | STRUCTURAL_EXACT_EMPTY(exact H13StageBStructuralEmptyKind)
  | NESTED_CONTAINER_EXACT_EMPTY(stage-a-resolved-population)
  | QUESTION_WRAPPER_EXACT_EMPTY(
      semantic-question | required-dependencies-question)
  | RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(
      exact H13RawInputFamilyCoordinate D)
  | RETAINED_FAILURE_EXACT_EMPTY(
      exact primary TrustVerificationComponentDisposition,
      exact complete protected reason set)

H13StageBStructuralEmptyKind =
  connection-evaluation-key
  | side-evaluation-key
  | selected-catalogue
  | stage-b-applicable-input

H13StageBMemberReferenceClassificationOf :
  exact H13EvaluationPopulationMember
    -> exactly one H13StageBMemberReferenceClassification
```

In the Revision 12 tables, the report labels `FAILED`, `UNAVAILABLE`, `INDETERMINATE`, and `CONTRADICTORY` denote exactly the existing `TrustVerificationComponentDisposition` tokens `failed`, `unavailable`, `indeterminate`, and `contradictory`. They do not create a second failure taxonomy. Resolved facts that definitively violate a predicate are `FAILED`; absent or unobtainable required evidence is `UNAVAILABLE`; present evidence that does not uniquely resolve the question is `INDETERMINATE`; mutually incompatible retained required/authoritative evidence is `CONTRADICTORY`.

The six result constructors are disjoint by tag. `DIRECT` is structural only: it means that Table 2-D4 emits the stated reference family. `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` means exactly `referenceFamily=empty`, no `primaryDisposition` field, `protectedReasons={}`, and `authority=none`; it neither proves source presence nor fabricates missing-source failure. It does not classify any separately present placeholder. No constructor means that a referenced source, placeholder, attribution, currentness, proof, Trust result, H-13 result, or enclosing authority gate is favorable. Every classifier result has `authority=none`.

| Accepted outer constructor, exact once | Exact dependent domain | Classifier result and emitted Stage-B reference family | Traversal and multiplicity boundary | Malformed/invalid consequence |
|---|---|---|---|---|
| `connection-evaluation-key(exact ConnectionEvaluationKey)` | none | `STRUCTURAL_EXACT_EMPTY(connection-evaluation-key)`; exact empty | the key identifies the evaluation but is not a source; stop | a malformed key is not an accepted member and enters the invalid-input rule |
| `side-evaluation-key(exact SideEvaluationKey)` | none | `STRUCTURAL_EXACT_EMPTY(side-evaluation-key)`; exact empty | the key identifies one accepted side but is not a source; stop | a malformed key is invalid input |
| `stage-a-resolved-population(exact C, exact A)` | exact accepted nested `StageAResolvedPopulation` | `NESTED_CONTAINER_EXACT_EMPTY(stage-a-resolved-population)`; exact empty in the Stage-B container | do not inspect A; the separate Stage-A Table 2-D3 container remains the only source of Stage-A paths | C/A mismatch is invalid; accepted internals remain in A and are not flattened |
| `selected-catalogue(exact C, exact release, exact IsolationProfile, exact selected matrix aggregate)` | exactly the accepted aggregate named by `H13EvaluationSeed` | `STRUCTURAL_EXACT_EMPTY(selected-catalogue)`; exact empty | the selected aggregate is a control/inventory boundary; no representation, configuration object, filename, or release resource is inspected | an aggregate not exactly matching the accepted seed components is invalid input |
| `pre-freeze-literal-input(stage-b-applicable-input(exact row, exact applicable projection))` | first exact `H13PreFreezeLiteralInputValue` branch | `STRUCTURAL_EXACT_EMPTY(stage-b-applicable-input)`; exact empty | the value is the Stage-A-to-Stage-B applicability projection, not another owner-native source occurrence; stop | wrong row class, non-applicable result, or mismatched projection is invalid input |
| `pre-freeze-literal-input(authoritative-h07-input(exact row, exact H07 input))` | second exact literal branch | `DIRECT` with exactly one `stage-b-direct(authoritative-h07-literal(value))` reference, role `h07-authoritative-input`, inner coordinate `no-inner-occurrence`, and expected owner-native H-07 coordinate from Table 2-A | do not inspect the H-07 bundle or dependencies; reference multiplicity one; source multiplicity remains independently exactly once | wrong row class or mismatched H-07 value is invalid input |
| `raw-input-family(exact D, exact H13AcceptedRawFamily(D) F)` | exact eight-branch D grammar and dependent raw-node grammar below | if `cardinality(F)=0`, `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)`; if `cardinality(F)>0`, `DIRECT` with one `stage-b-direct(raw-family-member(D,member-coordinate(x)))` reference for every occurrence x in F, retaining F's exact multiplicity and using the role, expected native coordinate, and Table 2-C class carried by `R12H13RawSourceDispatchOf(D,x)` | F is the complete owner-native aggregate boundary; do not traverse members for dependencies or child containers; top-level cardinality remains one; an accepted placeholder is a separate top-level member | D/F mismatch or zero/multiple H-13 owner rows is invalid input, while an accepted malformed x remains retained in its accepted F; empty F is never converted into or inferred from a placeholder |
| `q-scoped-producer-lifecycle-reference(exact R)` | exact accepted R and exact H-13-S3 owner-resolution result | unique owner O: `DIRECT` with exactly one `stage-b-direct(lifecycle-owner-reference(R,O))`; zero/multiple owner: the total fail-closed table below | R is non-owning, carries no F or source payload, and is never traversed or converted into a raw family; one reference cannot change owner-native multiplicity | malformed owner resolution retains R, C, and its node; no owner is guessed; primary disposition and complete reasons follow the table below |
| `pre-freeze-placeholder(exact D, exact H13AcceptedPreFreezePlaceholder(D) V)` | exact nine-branch placeholder grammar below | `DIRECT` with exactly one `stage-b-direct(accepted-placeholder(D))` reference, role `h13-s3-accepted-pre-freeze-placeholder(D)`, expected native coordinate `h13-s3-accepted-pre-freeze-placeholder(D)`, and value V | placeholder is one accepted semantic value only under its owning branch; no generic null or error value and no traversal | D/V mismatch or invented placeholder is invalid; V's exact owning unavailable or indeterminate tag mechanically fixes the component's adverse disposition |
| `semantic-question(exact NodeSemanticCoordinate N)` | exact accepted N | `QUESTION_WRAPPER_EXACT_EMPTY(semantic-question)`; exact empty | N is inventory/planning only; do not inspect its answer, dependencies, provenance edges, node representation, or reachable sources | malformed N is invalid input |
| `required-dependencies-question(exact NodeSemanticCoordinate N)` | exact accepted N | `QUESTION_WRAPPER_EXACT_EMPTY(required-dependencies-question)`; exact empty | do not traverse `RequiredDependencies`; the co-emitted wrapper supplies no direct source authority | malformed N is invalid input |

The table covers all ten outer constructors exactly once. The two literal subrows partition the exact two-branch literal union. No legal member reaches an unlisted branch and no legal member matches two rows.

The raw-family D dispatch is exact and exhaustive. Accepted H-13-S3 Section 6.2 defines `H13AcceptedRawFamily(D)` as an exact complete finite occurrence or candidate family and does not state a nonempty invariant. Accepted Section 8.2 retains F's owner-defined multiplicity without adding a lower bound. Accepted Sections 7.2, 9.1, and 9.3 make `raw-input-family(D,F)` and `pre-freeze-placeholder(D,V)` separate constructors and co-emit only the exact members independently authorized by their own grammar. Revision 12 therefore does not invent an impossible-empty premise.

| Exact `H13RawInputFamilyCoordinate` branch | `cardinality(F)=0` | `cardinality(F)=1` or `N>1` | Placeholder and boundary law |
|---|---|---|---|
| `raw-node-family(exact H13RawInputNodeCoordinate X)` | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` | one raw-family-member path per x, with coordinate/role/class from Table 2-A1 | an exact `raw-node-placeholder(X)` may coexist only when accepted Section 7.2 supplies it; F does not create it; F is complete and lifecycle R/arbitrary nodes/representation paths are forbidden |
| `producer-intrinsic-family(exact (ProducerLifecycleEvaluationCoordinate,ProducerIntrinsicInputClass))` | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` | one per intrinsic occurrence; the seven exact class rows select existing or generic through Table 2-A1 | an exact producer-intrinsic placeholder is independent; Q and ObservationScope remain absent; no raw-node alias |
| `baseline-enumeration-family(exact baseline member,exact permitted boundary)` | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` | one per accepted bounded enumeration occurrence through the generic branch | an exact baseline-enumeration placeholder is independent; a complete empty enumeration is not fabricated into failure |
| `lifecycle-enumeration-family(exact lifecycle member,exact permitted boundary)` | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` | one per accepted bounded lifecycle-enumeration occurrence through the generic branch | an exact lifecycle-enumeration placeholder is independent; a complete empty enumeration is not fabricated into failure |
| `bootstrap-source-family(exact owner slot,exact bootstrap boundary)` | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` | one per accepted bootstrap source occurrence through its existing-native row | an exact bootstrap-source placeholder is independent; an empty F plus a real placeholder yields only the placeholder's one source reference |
| `baseline-direct-observation-family(exact baseline slot,exact source candidate)` | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` | one per accepted baseline attribution/observation occurrence through its exact existing-native row | an exact baseline-direct-input placeholder is independent; no lifecycle alias |
| `lifecycle-direct-observation-family(exact lifecycle slot,exact source candidate,exact E07/E11/E14/E15/E17)` | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` | one per accepted lifecycle attribution/coverage/observation occurrence through its exact existing-native row | an exact lifecycle-direct-input placeholder is independent; an empty raw observation family may mean no change only under the separately accepted affirmative coverage semantics; no baseline alias |
| `event-policy-token-family(exact PermissionEventRequirementSlot)` | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` | one generic-native reference per received noncatalogue token occurrence | no event-policy-token placeholder constructor exists; zero received noncatalogue tokens is the exact complete empty family and creates no missing-source failure, token, policy decision, or replacement of `independently-complete-source` |

Within `producer-intrinsic-family`, `ProducerIntrinsicInputClass` is dispatched exactly once as follows: `activation-birth-end-restart`, `observation-mechanism-birth-end-replacement`, `report-mechanism-birth-end-replacement`, `intrinsic-capability-binding-add-remove-change`, and `producer-lifecycle-direct-attribution` use their exact existing-native Table 2-A0 rows; `o09-allocation` and `o10-allocation` use their exact generic Table 2-A1 rows. For F=0, all seven instead produce the one neutral raw-family exact-empty constructor. For F>0, every branch emits one raw-family-member path per exact F occurrence. The attribution branch never copies or increments its referenced raw intrinsic occurrence. No eighth class exists.

For `raw-node-family`, the dependent subtype and empty-family dispatch is exactly:

| Exact `H13RawInputNodeCoordinate` branch | Source dispatch for each x when F is nonempty | Exact result when F is empty |
|---|---|---|
| `historical-currentness-qualification-input(subject,cut)` | existing-native historical-currentness row | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `iaa-runtime-correspondence-input(Q)` | existing-native RuntimeCorrespondence or its attribution row, selected by exact x type | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `iaa-local-separation-input(LocalIAASeparationKey)` | existing-native context-local conclusion or its attribution row, selected by exact x type | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `q-producer-candidate-occurrence-input(Q,exact non-lifecycle use,candidate)` | generic-native row; lifecycle use is invalid here | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `producer-lifecycle-owner-native-input(exact enrollment branch)` | generic-native enrollment row | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `producer-lifecycle-owner-native-input(exact producer-class branch)` | generic-native ProducerClass row | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `producer-lifecycle-owner-native-input(exact q-local-observation-scope branch)` | generic-native Q-local ObservationScope row; never intrinsic | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `producer-lifecycle-owner-native-input(exact source-enumeration branch)` | generic-native source-enumeration row | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `baseline-direct-input(exact baseline slot,exact source)` | existing-native baseline attribution or observation row, selected by exact x type | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `lifecycle-direct-input(exact lifecycle slot,exact source)` | existing-native lifecycle attribution, coverage, or observation row, selected by exact x type | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `iaa-binding-continuity-input(Q,P,B,U)` | existing-native binding-continuity conclusion or attribution row, selected by exact x type | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `direct-producer-fact-input(DP,P)` | existing-native direct-fact or ordinary-attribution row, selected by exact x type | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `iaa-absence-source-control-input(A)` | existing-native absence-source-control conclusion or attribution row, selected by exact x type | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `iaa-producer-independence-input(PI)` | existing-native ProducerIndependence conclusion or attribution row, selected by exact x type | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `protected-detector-source-input(K,domain,owner,scope)` | existing-native protected-source row with protection retained | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `observation-occurrence-input(O)` | existing-native ObservationOccurrence or ordinary-attribution row, selected by exact x type | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `producer-closure-assertion-input(PC)` | generic-native ProducerClosureAssertion row | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `relation-edge-input(R,O,PC)` | generic-native RelationEdge row, including an accepted retained malformed candidate | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `event-coverage-assertion-input(EA)` | generic-native EventCoverageAssertion row | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |
| `qualified-time-input(scope,position)` | existing-native QualifiedPhysicalTimeInput row | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` |

These twenty rows are disjoint by outer raw-node tag and, for `producer-lifecycle-owner-native-input`, by its exact four-constructor dependent union. They are the complete accepted H-13-S3 subset. No arbitrary node, F predicate, trigger, reason, state, result, path label, or reflected object type enters it.

The empty-family result is total by natural-number cardinality, not by a placeholder heuristic. Here `cardinality(F)` is the sum of F's accepted owner-defined occurrence multiplicities; it is zero exactly when F has empty support and otherwise is a positive natural number. Equal repeated occurrences contribute their retained counts and are not set-projected:

```text
H13RawFamilyMemberCardinalityCase(D,F) =
  zero-members
    when cardinality(F) = 0
  | one-or-more-members
    when cardinality(F) > 0

H13StageBMemberReferenceClassificationOf(raw-input-family(D,F)) =
  RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)
    when H13RawFamilyMemberCardinalityCase(D,F) = zero-members
  | DIRECT(exact multiplicity function of one dispatched reference per x in F)
    when H13RawFamilyMemberCardinalityCase(D,F) = one-or-more-members
```

Zero and positive are disjoint and exhaustive over the accepted finite-family cardinality. No legal F falls through. In the positive branch, each x obtains its coordinate, role, and Table 2-C class from the single Table 2-A1 dispatch record. In the zero branch, there is no x, no source occurrence, no source key, no Table 2-C member instance, no primary failure disposition, no protected reason, and no authority.

No accepted H-13-S3 branch proves F nonempty. Revision 12 therefore classifies all eight D branches, all twenty raw-node subtypes, and all seven producer-intrinsic classes under accepted-empty option 3: the complete finite family may have zero members, and the raw-family member itself then has an exact empty reference result. This does not assert that every evaluation emits every D; it states only the classifier consequence when accepted H-13 emits the legal `raw-input-family(D,F)` member.

Placeholder existence is orthogonal. If accepted H-13 also emits `pre-freeze-placeholder(P,V)`, the placeholder's own outer-constructor row emits exactly one placeholder reference and supplies V's exact adverse disposition. `raw-input-family(D,empty)` still emits zero. If no placeholder is emitted, none is fabricated. If an accepted population was required to contain a placeholder but omits it, that is a population-completeness/required-member defect evaluated at the enclosing accepted Stage-B record; it does not change the classification of the separately present empty raw-family member. A real placeholder plus an empty raw family therefore produces one placeholder source/reference and zero raw-member sources/references, never two.

The event-policy case is closed directly from accepted H-13-S3 Sections 7.1, 7.2, and 9.3: its family contains received noncatalogue event-policy token occurrences, the placeholder union has no event-policy branch, and Rule 10 says any received other token yields its unknown/malformed input while `independently-complete-source` remains constant. Zero received noncatalogue tokens is consequently the legal complete empty occurrence family and yields `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(event-policy-token-family(slot))`; it is not a missing policy token and creates no failure or policy authority.

The nine placeholder branches are total:

| Exact `H13PreFreezePlaceholderCoordinate` branch | Exact accepted value class and reference consequence | Primary adverse disposition supplied by V |
|---|---|---|
| `permission-key-resolution-placeholder(Q)` | one direct accepted-placeholder reference; only tagged resolution absent or ambiguous | absent=`UNAVAILABLE`; ambiguous=`INDETERMINATE` |
| `raw-node-placeholder(exact X)` | one direct accepted-placeholder reference; only X's row-prescribed absent, unavailable, or indeterminate value | the exact owning tag selects `UNAVAILABLE` or `INDETERMINATE` |
| `producer-intrinsic-placeholder(exact L)` | one direct reference; exact unavailable or indeterminate intrinsic family value | the exact owning tag selects `UNAVAILABLE` or `INDETERMINATE`; Q-specific form invalid |
| `baseline-enumeration-placeholder(exact member)` | one direct reference; exact unavailable or indeterminate bounded-domain value | the exact owning tag selects `UNAVAILABLE` or `INDETERMINATE` |
| `lifecycle-enumeration-placeholder(exact member)` | one direct reference; exact unavailable or indeterminate bounded-domain value | the exact owning tag selects `UNAVAILABLE` or `INDETERMINATE` |
| `bootstrap-source-placeholder(exact slot)` | one direct reference; exact unavailable bootstrap-source value | `UNAVAILABLE` |
| `baseline-direct-input-placeholder(exact slot,exact source)` | one direct reference; tagged absent or ambiguous baseline direct-input family | absent=`UNAVAILABLE`; ambiguous=`INDETERMINATE` |
| `lifecycle-direct-input-placeholder(exact slot,exact source)` | one direct reference; tagged absent or ambiguous lifecycle direct-input family | absent=`UNAVAILABLE`; ambiguous=`INDETERMINATE` |
| `runtime-proposition-placeholder(exact proposition)` | one direct reference; exact canonical absent proposition-result value | `UNAVAILABLE` |

There is no generic null, unresolved, parser-error, storage-error, transport-error, arbitrary unknown, or Q-specific lifecycle placeholder.

Lifecycle owner resolution is independent of R existence and total:

| Exact accepted owner-resolution facts | Classifier/reference result | Exact primary disposition and additive protected reasons |
|---|---|---|
| `unique-owner(exact O)` and O exactly identifies the existing raw-family or placeholder owner for C | `DIRECT`, exactly one lifecycle-owner-reference(R,O) | referenced value's own disposition; no owner-resolution failure reason |
| `unique-owner(O)` but the referenced family/value is absent or unobtainable | `RETAINED_FAILURE_EXACT_EMPTY` | `UNAVAILABLE`; `projection-reference-missing` and `required-component-missing` |
| `unique-owner(O)` but O and C are definitively mismatched | `RETAINED_FAILURE_EXACT_EMPTY` | `FAILED`; `projection-reference-mismatch` |
| `no-unique-owner` for an exact accepted unavailable C | `RETAINED_FAILURE_EXACT_EMPTY` | `UNAVAILABLE`; `projection-reference-missing` |
| `no-unique-owner` for an exact accepted indeterminate C | `RETAINED_FAILURE_EXACT_EMPTY` | `INDETERMINATE`; `projection-reference-indeterminate` |
| `no-unique-owner` where exact accepted C is neither an owning-type unavailable tag nor an owning-type indeterminate tag | `RETAINED_FAILURE_EXACT_EMPTY` | `FAILED`; `unsupported-required-semantics` and `projection-reference-mismatch` |
| `multiple-owner-candidates(M,S)` with `cardinality(S)=1` | `RETAINED_FAILURE_EXACT_EMPTY`; select no owner | `INDETERMINATE`; `projection-reference-indeterminate`, plus `equal-duplicate-occurrence` when M contains equal duplicate match occurrences |
| `multiple-owner-candidates(M,S)` with `cardinality(S)>1` | `RETAINED_FAILURE_EXACT_EMPTY`; select no owner | `CONTRADICTORY`; `projection-reference-contradictory`, plus `conflicting-duplicate-occurrence` for unequal competing match evidence |

For the unique-owner row, `H13StageBLifecycleOwnerReferenceTarget(R,O)` is mechanically exact. If O is `raw-family-owner(D,reference-to-raw-input-family(D,F))`, the unique H-13-S3 owner-match row for R.C identifies the exact x in F whose accepted candidate coordinate is C; the expected source coordinate is the successful exact `H13S3SourceCoordinateResolution(D,x)` coordinate and the projected value is x. If O is `placeholder-owner(D,reference-to-pre-freeze-placeholder(D,V))`, the expected coordinate is `h13-s3-accepted-pre-freeze-placeholder(D)` and the projected value is V. Zero such target occurrences is unavailable; a definitively unequal target is failed; present nonunique target membership is indeterminate; mutually incompatible retained target evidence is contradictory. This target function never copies F or V into R and never changes owner-resolution, source multiplicity, or R identity.

All independently true H-10, H-11, H-13-underlying, source-cardinality, malformed-input, and projection reasons remain additive. Two equal duplicate owner matches are never set-deduplicated into unique owner. Discovery order cannot affect M, S, the primary class, reasons, R, or its node. A change from unique to ambiguous owner resolution while Q, tag, and C remain equal changes only the classification consequence; it never rekeys R, C, or the owner-native raw source.

The invalid-input boundary is outside the exact legal classifier domain and is nevertheless deterministic:

```text
H13StageBInvalidInputResult = (
  referenceFamily = exact empty,
  primaryDisposition = FAILED,
  protectedReasons = {
    trust-structure(unsupported-required-semantics),
    trust-structure(malformed-input-not-semantic-content)
  },
  authority = none
)
```

It applies to a caller-injected `stage-b-direct(...)`, an invented eleventh outer constructor, an unknown future tag not accepted by the present H-13-S3 union, a legal outer tag carrying a value outside its exact dependent type, a D/F or D/V mismatch, a wrong family alias, and any classification attempted from JSON/property name, database row, storage path, rule/pass, reflection type, provider adapter, traversal heuristic, or object-exposed children. Invalid top-level values are not retyped as accepted malformed candidates and are not silently ignored. Accepted bounded malformed candidates remain only inside the exact H-13 family or placeholder that owns them.

Classification is applied to the already frozen accepted mathematical set. `semantic-question(N)` and `required-dependencies-question(N)` remain co-emitted at first formability, but neither wrapper creates a reference. `RequiredDependencies`, provenance edges, transitive reachability, later answers, owner-resolution changes, rule/pass, and arrival order cannot add or remove a population member or direct path. The Stage-A aggregate remains nested. Consequently:

```text
cardinality(H13EvaluationPopulationMembers)
  != owner-native inner occurrence multiplicity
  != H13SourceProjectionReferenceFamily multiplicity

UPSTREAM_CONFLICT_COUNT = 0
TEN_OUTER_CONSTRUCTOR_CLASSIFIER_TOTAL = YES
TEN_OUTER_CONSTRUCTOR_CLASSIFIER_DISJOINT = YES
RAW_FAMILY_CLASSIFIER_TOTAL = YES
RAW_NODE_SUBTYPE_CLASSIFIER_TOTAL = YES
RAW_FAMILY_EMPTY_DOMAIN_TOTAL = YES
ALL_EIGHT_RAW_FAMILY_EMPTY_CASES_AUDITED = YES
EVENT_POLICY_EMPTY_CASE_CLOSED = YES
PLACEHOLDER_EMPTY_F_EQUIVALENCE_INVENTED = NO
SPECIFIC_GENERIC_DISPATCH_TOTAL = YES
SPECIFIC_GENERIC_DISPATCH_DISJOINT = YES
TABLE_ROW_ORDER_SEMANTIC = NO
SOURCE_COORDINATE_IMPLEMENTATION_SELECTABLE = NO
CARDINALITY_CLASS_IMPLEMENTATION_SELECTABLE = NO
STAGE_B_CLASSIFICATION_PROSE_CATCHALL_COUNT = 0

TOP_LEVEL_SET_SEMANTICS_PRESERVED = YES
INNER_OCCURRENCE_MULTIPLICITY_PRESERVED = YES
H02_REFERENCE_MULTIPLICITY_SEPARATE = YES
Q_IN_INTRINSIC_RAW_FAMILY_IDENTITY = NO
OBSERVATION_SCOPE_IN_INTRINSIC_RAW_FAMILY = NO
LIFECYCLE_REFERENCE_CAN_BECOME_RAW_FAMILY = NO
OWNER_GUESSING_POSSIBLE = NO
STAGE_A_NESTING_PRESERVED = YES
WRAPPER_COEMISSION_SEMANTICS_PRESERVED = YES
H13_FIXED_POINT_CHANGED = NO
REQUIRED_NODE_COORDINATE_SET_CHANGED = NO
```

**Bounded clean-room result.** Equal accepted `H13EvaluationPopulation` values have equal top-level mathematical sets. Exact constructor dispatch, exact dependent subdispatch, the single D/x coordinate/cardinality/role dispatch, total zero-versus-positive F cardinality, owner-native F multiplicity, exact lifecycle resolution, and exact placeholder tags therefore yield equal classifications and equal Stage-B reference multiplicity functions. Repeated discovery cannot create a top-level member, source occurrence, or H-02 reference. Table order, Markdown layout, implementation type names, representation, storage, provider, reflection, and dependency traversal are irrelevant. Any different result from equal accepted facts is nonconforming.

Exact occurrence-key equality requires equal `TrustSemanticEvidenceLogicalSourceDomain` and equal tagged `SourceNativeOccurrenceCoordinate`, including exact equality of every carried accepted component. No optional, redundant, inferred, representation, storage, proof/key, component, result, arrival-order, enclosing-caller, or provider coordinate participates. A caller may neither add nor remove a member. Content equality never makes unequal native coordinates equal, and unequal content never splits one native coordinate.

An occurrence exists only when an owning semantic value is successfully resolved. The raw occurrence family is a multiplicity function over the full occurrence tuple. Equal repetitions therefore remain countable without allocating an occurrence identity. A wrong-scope, stale, superseded, revoked, compromised, conflicting, or injected value is an occurrence when it remains a successfully resolved semantic value; its later adverse classification does not erase it.

Raw transport bytes, unparsed envelopes, malformed H-10 inputs, parser exceptions, unavailable network responses, and absent records are not H-02 semantic occurrences.

## 2.2 Missing, malformed, and explicit unavailable

1. A required source slot with no successfully resolved semantic value has zero raw occurrences at the exact `TrustSemanticEvidenceOccurrenceKey`. Its consuming component is `unavailable` with `required-component-missing`.
2. A malformed H-10/carrier input is retained outside the H-02 result body under its H-10 audit owner. After required component generation, the consuming component may carry only:

   ```text
   TrustH10VerificationFailureObservation = (
     exact TrustVerificationComponentCoordinate,
     exact expected TrustSemanticEvidenceOccurrenceKey,
     exact accepted H-10 semantic failure class
   )
   ```

   This is a component verification outcome, not a raw semantic-content occurrence, and never imports raw carrier bytes.
3. An explicit `unavailable` or `indeterminate` value is one raw occurrence only if an already accepted owning semantic type defines that exact value. The occurrence carries the accepted value and owner; H-02 invents no replacement.
4. There is no generic `unavailable placeholder occurrence` in either result family. A future implementation-supplied placeholder is `unsupported-required-semantics` and cannot satisfy a source key.
5. Accepted H-13 values that expressly define an `absent`, `unavailable`, or `indeterminate` placeholder remain real H-13 semantic values when the current result carries the exact H-13 evaluation. Their owner and exact tag are preserved; H-02 does not generalize them.

## 2.3 Raw multiplicity before component generation

Cardinality class is resolved before verification and before any set projection.

For `EXACT_ONCE_ATOMIC_SLOT` and for the outer record coordinate of `EXACT_ONCE_AGGREGATE_FAMILY_RECORD`, evaluate the complete raw family before any component exists:

- zero occurrences: `unavailable`;
- exactly one resolved occurrence: retain it for substantive predicates;
- two or more equal occurrence values at that one key: `indeterminate` with `equal-duplicate-occurrence`;
- two or more unequal occurrence values at that one key: `contradictory` with `conflicting-duplicate-occurrence`.

For `MULTIPLICITY_BEARING_ATOMIC_FAMILY`, first project every occurrence to its Table 2-C exact member coordinate. Different exact member coordinates are independent legitimate members even when they share an owner slot, source coordinate, Producer, owner, source domain, or enclosing evaluation coordinate. The complete occurrence family, multiplicity, unique semantic order, and explicit concurrency are retained. Only multiple representations at the same exact member coordinate invoke the equal/unequal duplicate rule above. There is no first, latest, preferred, same-content deduplication, arrival-order identity, or storage/proof identity.

Before applying any cardinality rule, distinguish an `OwnerNativeSemanticOccurrenceFamily` from every `H13SourceProjectionReference` that cites it. Only occurrences in the complete owner-native family contribute to source multiplicity. H-13 candidate, node, record, dependency, and provenance reference counts are independently preserved at `H13SourceProjectionReferenceCoordinate`; they never add to, consume from, or deduplicate the owner-native count. Relation failure, omission, ambiguity, or contradiction affects projection/provenance verification and population completeness, not the independently fixed source count. Actual equal or unequal source duplicates remain duplicates even if references are missing, repeated, or differently distributed.

For `EXACT_ONCE_AGGREGATE_FAMILY_RECORD`, the outer semantic record occurs once and the complete inner family/set/map remains one unchanged value. H-02-S2 does not flatten the inner family and reapply exact-once semantics to its members under the aggregate coordinate. It also does not consume the flattened member family a second time as though that were the same source role. Legitimate raw members that accepted H-13 exposes as a separate source family retain their own Table 2-C coordinates and are not copies of the aggregate record.

No silent deduplication, first/newest/preferred selection, majority, provider priority, successful-signature priority, current-row priority, or arrival order exists. Distinct eligible sources that an accepted owner expressly treats as corroborators have unequal Table 2-A native coordinates; their owning composition rule remains authoritative. Equal semantic content at those unequal coordinates remains two source slots. Unequal semantic content at one exact-once native coordinate or one exact multiplicity-bearing member coordinate is contradictory.

The count is the count of raw source occurrences, not the number of H-13 projections, predicates, or components that reference them. If one exact raw occurrence appears through two H-13 candidates, one provenance node, `content-owner-and-content-equality`, `proof-profile-domain-purpose-context`, `key-controller-purpose-history`, and `currentness-or-history`, its raw multiplicity remains one; the three H-13 references and four verifier references remain independently auditable. If the owner-native source actually supplies the same raw occurrence twice, its raw multiplicity remains two whether zero, one, or twenty H-13 records/components inspect it.

Adding, removing, failing, duplicating, or reordering a verifier component cannot change a raw occurrence key, raw value, source population, or multiplicity. A failed component does not erase its input occurrence. A component cannot refer backward in a way that participates in creating the raw occurrence it consumes.

## 2.4 Required component generation and component-result cardinality

Only after the exact complete raw occurrence family is fixed does the applicable result-family function generate component coordinates:

```text
TrustVerificationComponentCoordinate = (
  exact result subject coordinate,
  exact component-kind token,
  exact predicate scope,
  exact referenced raw occurrence key set,
  exact referenced H13SourceProjectionReferenceCoordinate set,
  or exact singleton non-source tag
)

TrustVerificationComponentResult = (
  exact TrustVerificationComponentCoordinate,
  exact predicate subject,
  exact referenced raw semantic occurrence subfamily,
  exact referenced H13SourceProjectionReference subfamily,
  exact tagged H-10 failure observation absent | present,
  exact owning accepted outcome when one exists,
  exact TrustVerificationComponentDisposition,
  exact protected reason-coordinate set
)
```

Several component coordinates may reference the same already-existing raw occurrence key, H-13 projection/reference coordinate, or overlapping subfamilies. Such references are views over the separately fixed families; they do not copy or multiply either family. A component coordinate may not occur in a `TrustSemanticEvidenceOccurrenceKey`, `TrustSemanticEvidenceOccurrence`, or `H13SourceProjectionReferenceCoordinate`.

Every required component coordinate has a separate occurrence family of component results. Component-result multiplicity is evaluated independently from raw-source multiplicity using zero/equal-duplicate/unequal-duplicate behavior. A well-formed component outside the required coordinate set is retained as injected evidence and produces `failed` plus `unexpected-component`; an injected conflict additionally produces `contradictory`. No component result feeds backward into raw family construction.

## 2.5 Population closure and causal order

A Trust population is complete only when its exact logical source domain and branch-generation function in Sections 3.4 or 5.4 have enumerated both the complete owner-native raw occurrence family and the complete independently keyed H-13 projection/reference family before required component generation and before any verification verdict is read. No candidate, reference count, component, failure, status, provider, proof success, result, or consumer selects or changes the owner-native family. If a required logical-source-domain, boundary source, or required projection/reference population is absent or unobtainable, the population is `unavailable` without changing established source multiplicity. If required boundary/reference evidence exists but boundedness, closure, membership, or exact completeness cannot be uniquely resolved, the population is `indeterminate`. If retained authoritative boundary/population/reference evidence is mutually incompatible, the population is `contradictory`. It is never treated as a smaller complete population.

The required causal order is:

```text
accepted source-native semantic coordinate
  -> raw semantic occurrence key
  -> raw semantic occurrence value and multiplicity
  -> exact complete owner-native raw occurrence family

accepted H-13 candidate/semantic/provenance container coordinate
  -> independently retained H-13 projection/reference family
  -> deterministic reference-to-owner-native membership relation

exact complete owner-native family + exact complete H-13 reference family
  -> required component coordinate generation
  -> component result occurrence families
  -> aggregate Trust result body
```

The reverse edges `component -> raw occurrence creation`, `H-13 projection/reference count -> owner-native occurrence creation/count`, and `H-11 answer/availability/returned scope -> historical question/boundary/logical-domain/raw-key identity` are forbidden. A caller/provider `stage-b-direct(...)` output tag also cannot determine actual-member classification. A well-formed candidate structure proven to contain a component/source direct or transitive edge is definitively `failed` with `component-source-recursion`; one that uses reference count as source count is `failed` with `source-cardinality-class-mismatch` and `projection-reference-mismatch`; one that rekeys historical identity from an answer is `failed` with `historical-answer-to-question-identity-feedback`. Each yields no consumable Trust evidence. Missing dependency information is `unavailable`; present dependency information that cannot resolve the required edge direction or acyclicity is `indeterminate`; mutually incompatible retained authoritative dependency structures are `contradictory`. Section 8.3 supplies the total rule for every forbidden cycle family.

# 3. Temporal questions, governance cuts, and exact source streams

## 3.1 Closed temporal question

```text
TrustIsolationTemporalQuestion =
  current-use(exact TrustIsolationCurrentUseContext)
  | historical-verification(
      exact TrustIsolationHistoricalCaller,
      exact TrustIsolationHistoricalQuestionFor(
        that exact TrustIsolationHistoricalCaller))

TrustIsolationCurrentUseContext =
  connection-authority-use(
    exact SideEvaluationKey,
    exact AuthorityUseCut embedded by that SideEvaluationKey,
    governancePopulationSelector =
      absent-current-result
      | h13-stage-a(exact H02ApplicabilityCandidateCoordinate)
      | tenant-presentation-mapping-source-unavailable
  )
  | tenant-governance-observation(
      cutAvailability = unavailable-pending-accepted-h11-isolation-cut
    )
```

For `connection-authority-use`, the `SideEvaluationKey`, its `SideScopeKey`, `AuthorityUseCut`, `ParticipantSide`, `ExactTenantContext`, selected release, and selected isolation profile are exact accepted H-13 values. The selector is `h13-stage-a(A)` for the first four governance target branches, `tenant-presentation-mapping-source-unavailable` for the governance mapping branch, and `absent-current-result` for the current-result family. No other selector exists.

The `tenant-governance-observation` branch intentionally carries no cut. No accepted H-02 or H-11 value currently defines a tenant-governance observation cut, its owner, equality, or source population. The Revision 1 tuple `TrustGovernanceVerificationCut(..., semantic state cut)` is removed. No clock, timestamp, sequence, checkpoint, database revision, current pointer, or implementation-selected state token may replace it.

Consequently every tenant-governance-observation current question is substantively `unavailable` with `governance-observation-cut-unavailable` until a separately accepted H-11 isolation supplement supplies an H-02-compatible cut and exact population realization. This constant fail-closed consequence is not an invented unavailable source occurrence.

## 3.2 Closed H-02-owned historical subject/question grammar and separate input

The complete accepted H-11 decision was audited first. It contains no generic historical question-coordinate type: `coordinate` does not occur, and `Question` occurs only as the descriptive middle-column heading of the Section 13 historical Receipt axis table. Accepted H-11 Section 13 owns trusted historical-time evidence and the five aggregate historical classifications, but it does not allocate a generic question or result coordinate applicable to H-02-S2. Therefore:

```text
H11_ACCEPTED_GENERIC_HISTORICAL_QUESTION_COORDINATE_FOUND = NO
```

H-02-S2 owns only the following bounded semantic subjects and question coordinate. H-11 continues to own evidence/history realization and its accepted results.

```text
TrustIsolationResultHistoricalVerificationSubject = (
  exact TrustIsolationResultClass,
  exact immutable result subject coordinate,
  exact immutable completed result value
)

TrustIsolationResultProofCurrentUseHistoricalSubject = (
  exact TrustIsolationResultProofCreationSemanticQuestionCoordinate,
  exact immutable result subject coordinate,
  exact AuthorityUseCut at which the already-created proof/key is questioned
)

TrustIsolationMappingCurrentUseHistoricalSubject = (
  exact TrustIsolationResultPresentationMapping,
  exact TrustIsolationResultPresentationMappingCreationEventCoordinate,
  exact already-existing TrustIsolationResultPresentationMappingCreationEvent,
  exact AuthorityUseCut at which that event lineage is questioned
)

TrustIsolationHistoricalCaller =
  role-authorization-revision-caller(
    exact TrustIsolationRoleAuthorizationRevisionSemantics)
  | result-proof-materialization-caller(
      exact TrustIsolationResultProofCreationSemanticQuestionCoordinate)
  | result-proof-current-use-caller(
      exact TrustIsolationResultProofCurrentUseHistoricalSubject)
  | result-historical-verification-caller(
      exact TrustIsolationResultHistoricalVerificationSubject)
  | presentation-mapping-creation-caller(
      exact already-existing
        TrustIsolationResultPresentationMappingCreationEvent)
  | presentation-mapping-current-use-caller(
      exact TrustIsolationMappingCurrentUseHistoricalSubject)
  | governance-evidence-caller(
      exact TrustIsolationGovernanceResultSubjectCoordinate,
      exact TrustIsolationGovernanceEvidenceTarget)

TrustIsolationHistoricalSemanticSubject =
  role-authorization-revision-history(
    exact TrustIsolationRoleAuthorizationRevisionSemantics)
  | result-proof-materialization-history(
      exact TrustIsolationResultProofCreationSemanticQuestionCoordinate)
  | result-proof-current-use-history(
      exact TrustIsolationResultProofCurrentUseHistoricalSubject)
  | result-history(
      exact TrustIsolationResultHistoricalVerificationSubject)
  | presentation-mapping-creation-history(
      exact already-existing
        TrustIsolationResultPresentationMappingCreationEvent)
  | presentation-mapping-current-use-history(
      exact TrustIsolationMappingCurrentUseHistoricalSubject)
  | governance-evidence-history(
      exact TrustIsolationGovernanceResultSubjectCoordinate,
      exact TrustIsolationGovernanceEvidenceTarget)

TrustIsolationHistoricalSubjectOf(caller) =
  role-authorization-revision-caller(R)
    -> role-authorization-revision-history(R)
  | result-proof-materialization-caller(P)
    -> result-proof-materialization-history(P)
  | result-proof-current-use-caller(U)
    -> result-proof-current-use-history(U)
  | result-historical-verification-caller(R)
    -> result-history(R)
  | presentation-mapping-creation-caller(E)
    -> presentation-mapping-creation-history(E)
  | presentation-mapping-current-use-caller(U)
    -> presentation-mapping-current-use-history(U)
  | governance-evidence-caller(S,T)
    -> governance-evidence-history(S,T)

TrustIsolationHistoricalQualificationQuestionCoordinate = (
  exact TrustIsolationHistoricalSemanticSubject,
  assessmentPurpose = verify-preexisting-immutable-isolation-evidence
)

TrustIsolationHistoricalQuestionFor(caller) = (
  exact TrustIsolationHistoricalQualificationQuestionCoordinate(
    TrustIsolationHistoricalSubjectOf(caller),
    verify-preexisting-immutable-isolation-evidence)
)

TrustIsolationHistoricalAssessmentQuestion = (
  exact TrustIsolationHistoricalQualificationQuestionCoordinate
)

TrustHistoricalQualificationInput = (
  exact already-fixed TrustIsolationHistoricalAssessmentQuestion,
  qualificationAvailability =
    available(
      exact nonempty retained occurrence family of H-11-owned historical
        qualification/result values at the question's required coordinate,
      exact H-11-owned evidence scope carried by those values
    )
    | unavailable
)

TrustIsolationHistoricalPopulationResolution = (
  exact already-fixed TrustIsolationHistoricalAssessmentQuestion,
  exact TrustHistoricalQualificationInput supplied to that question,
  historicalEvidenceScopeSelection =
    supported(exact independently returned H-11 evidence scope)
    | unavailable
    | indeterminate
    | contradictory,
  exact complete historical owner-native occurrence family selected only
    after question and source-domain identity are fixed,
  resolutionDisposition =
    exact-complete | unavailable | indeterminate | contradictory
)
```

The seven caller branches above are the exhaustive result of auditing Sections 1, 3, 4, 5, 7, and 9: role-revision occupancy; result-proof materialization; already-created result-proof/key use; immutable result history; singular mapping creation; event-bound mapping current use; and governance-evidence history. Every branch carries exact already-defined semantic values. Tagged-union equality makes the branches disjoint: proof creation cannot normalize to mapping creation, governance evidence cannot normalize to role authorization, and no caller-selected or catch-all subject exists.

`TrustIsolationHistoricalSubjectOf` and `TrustIsolationHistoricalQuestionFor` are total functions over the closed caller union. Each caller selects exactly its one same-position row; there is no default, overload, provider hook, or normalization. One equal caller produces one structurally equal subject and question in every conforming implementation. One subject branch has exactly one question coordinate because the assessment purpose is constant. A caller supplied under no listed branch, or a caller/subject/question mismatch, is `failed` with protected `unsupported-required-semantics`.

`TrustIsolationHistoricalAssessmentQuestion` is answer-independent and H-02-owned. It is not an accepted H-11 coordinate and cannot compete with a future H-11 representation: future H-11 isolation work must answer this already-fixed semantic question. Question equality contains no `TrustHistoricalQualificationInput`, `qualificationAvailability`, result occurrence family, returned evidence scope, literal historical outcome, duplicate/conflict disposition, Trust disposition, current row, proof/verifier result, history-record identifier, or implementation-selected timestamp. For the same caller its equality is unchanged when the required result is missing, verified, verified-with-current-revocation, invalid, indeterminate, unsupported, duplicated, or conflicting.

`TrustHistoricalQualificationInput` is a newly proposed Trust-local availability and consumption wrapper supplied to the already-fixed question. It is not an H-11 outcome, historical-time verdict, interval type, replacement taxonomy, or part of question/source-domain identity. `unavailable` means the required H-11 qualification/result itself cannot be obtained. `available(...)` retains every exact H-11-owned result occurrence and its returned evidence scope without inspecting lower-level causes to rename the result. The repeated question field is a coherence binding from input to question, not a component of question identity.

`TrustIsolationHistoricalPopulationResolution` runs only after the historical question, `TrustSemanticEvidencePopulationBoundary`, `TrustSemanticEvidenceLogicalSourceDomain`, and owner-native key family are fixed. A favorable H-11 answer may supply the supported evidence scope used to select historical occurrences, but that scope cannot rekey, regroup, split, or rename any source domain or question. Missing or adverse input changes only later resolution/Trust disposition. For one exact question, incompatible retained H-11 result occurrences remain competing answers at one result coordinate and make Trust contradictory; they never allocate unequal questions.

For one exact accepted H-11 result occurrence, H-02 carries `historically_verified`, `historically_verified_with_current_revocation`, `historically_invalid`, `historically_indeterminate`, or `historically_unsupported` literally. In particular, incomplete trusted time, disagreeing sources, a restart-broken ordering chain, or an uncertainty-crossing interval may already be H-11's reason for `historically_indeterminate`; H-02 does not convert that result to unavailable or to an H-11 contradiction. `historically_unsupported` always retains its accepted meaning: the original immutable profile/release is known but unsupported under the applicable H-14 window.

Zero obtainable result occurrences selects Trust-local unavailable without changing the question. One occurrence is mapped literally by Section 4.2. Equal duplicate representations at the exact result coordinate are Trust-local indeterminate under the exact-once duplicate rule. Unequal retained result occurrences at that one coordinate make the Trust population contradictory while every H-11 value and the one historical question remain unchanged. A signer claim, current row, arrival order, or display time cannot synthesize a result, interval, or new question. Historical success always has present-authority value `false`.

H-11 already owns Receipt historical-time evidence and aggregate meanings. A future separately accepted H-11 isolation supplement is still required to realize exact isolation-result proof and mapping materialization/currentness qualification values for the H-02-owned coordinate. H-02-S2 defines only the bounded semantic subject/question, result-absence behavior, and downstream appointment predicate; it defines no H-11 record, interval object, time source, ordering mechanism, sequence, or storage representation.

## 3.3 Governance source streams

For an exact `TrustIsolationGovernanceEvidenceTarget`, the only logical content source/subject stream is the matching branch below:

| Target branch | Exact logical source/subject stream | Positive content owner |
|---|---|---|
| `organization-iaa-registration-revision` | every immutable R8-10 revision occurrence at the exact `OrganizationIAARegistrationSubjectIdentity` and target `OrganizationIAARegistrationRevisionIdentity`, including unequal content offered at that exact semantic key | exact Organization authority |
| `boundary-permission-revision` | every immutable R8-25 revision occurrence at the exact `IsolationBoundaryPermissionSubjectIdentity` and target `IsolationBoundaryPermissionRevisionIdentity`, including unequal content offered at that key | exact Organization authority |
| `workspace-iaa-state-revision` | every immutable R8-15 state revision occurrence at the exact `WorkspaceIAAStateSubjectIdentity` and target `WorkspaceIAAStateRevisionIdentity` | exact Workspace authority within accepted parent delegation |
| `workspace-iaa-overlay-revision` | every immutable R8-18 overlay revision occurrence at the exact `WorkspaceIAAOverlaySubjectIdentity` and target `WorkspaceIAAOverlayRevisionIdentity` | exact Workspace authority within accepted parent delegation |
| `tenant-presentation-mapping-relation` | every mapping-relation occurrence at exact `(TenantPresentationNamespace, stable source subject)` plus every mapping occurrence in that same namespace whose carrier equals a carrier claimed by the target relation, so collision, reassignment, and recycling cannot be omitted | exact R8-34 owner for the mapped presentation class |

Content streams do not include the Trust result's own proof, mapping, currentness, presentation carrier, safe projection, or commitment. The mapping stream forbids the `trust-isolation-governance-result` target's own mapping and every Connection presentation class from serving as its verified underlying target.

The source stream is accompanied, never replaced, by these exact separate streams:

```text
real-owner content-attribution occurrence family
H-10 proof/key/purpose/context verification-outcome family
H-11 currentness or historical-assessment outcome family
accepted parent/projection value family required by the target branch
```

Content authentication cannot create currentness. Currentness cannot authenticate content. Parent equality cannot create either.

## 3.4 Exact population generation by temporal branch

Let `G` be one governance result subject, `T` its exact target, and `Q` its temporal question.

### Connection-authority-use

For the first four target branches, `Q` names one exact accepted H-13 `SideEvaluationKey S` and selector `h13-stage-a(H02ApplicabilityCandidateCoordinate A)`. The content occurrence family is every and only raw occurrence retained for the matching source-input branch at the canonical H-13 Stage-A `authoritative-h02-input(S,A,source-type)` coordinate. Its exact Organization/Workspace content attribution and matching `HistoricalCurrentnessQualification` at `S.AuthorityUseCut` are included through their distinct accepted coordinates. The H-13 projection's raw multiplicity, absent tag, rejected/wrong/stale/contradictory/injected audit classification, and source-to-candidate cardinality remain unchanged.

The target must equal the complete source value selected by its branch; `A` does not authorize a different subject or revision. Other H-02 candidates at `S` remain in H-13's complete Stage-A population but are not occurrences at this target's semantic key. A value offered specifically at `A` with a wrong target subject/revision stays in this target question as wrong-scope or source-content-mismatch evidence; it is not reassigned to another question.

For `tenant-presentation-mapping-relation`, the selector is `tenant-presentation-mapping-source-unavailable`. Accepted H-13 Stage A has no mapping-currentness subject or mapping-history population. Therefore a connection-authority-use mapping result remains `unavailable` until a separately accepted H-11 isolation mapping outcome supplies the exact Section 3.3 stream at the same `AuthorityUseCut`.

### Tenant-governance-observation

All target branches generate the exact required question/component coordinates, zero cut-bounded content occurrences, and the fixed unavailable cut component from Section 3.1. No implementation may consult an unowned state cut. The aggregate cannot be `verified-current`.

### Historical-verification

For each target branch, the answer-independent question first fixes the `governance-historical` population boundary and logical source domain. `TrustIsolationHistoricalPopulationResolution` then contains every successfully resolved occurrence at the exact Section 3.3 semantic key within the exact H-11 evidence scope carried by `available(...)`, plus its exact content attribution, original H-10 proof/key/purpose/context outcomes, and every exact retained H-11 historical result occurrence. The returned scope filters only this post-question resolution; it never participates in question equality, source key, logical domain, boundary identity, or raw grouping. For the governance target branch that verifies an underlying tenant presentation mapping, resolution also contains only that target's same-namespace collision substream; Section 7.4 Trust-result mapping-creation authorization is a separate downstream relation and is not imported into the underlying target. `qualificationAvailability=unavailable` makes later Trust consumption unavailable while leaving the question and raw domain unchanged. With `available(...)`, each H-11 result maps literally under Section 4.2; H-02 does not inspect raw H-11 time evidence to relabel it. Missing required content is independently zero occurrences/unavailable. No history is recomputed under current defaults.

## 3.5 Governance population value

```text
TrustIsolationGovernanceInputPopulation = (
  exact result subject coordinate,
  exact temporal question,
  exact TrustSemanticEvidenceLogicalSourceDomain set,
  exact complete target-candidate raw TrustSemanticEvidenceOccurrence family,
  exact complete H13SourceProjectionReferenceFamily for an H-13-backed branch,
  exact complete raw real-owner content-attribution occurrence family,
  exact complete proof/key/purpose/context verification-input family,
  exact complete currentness/history outcome family,
  exact population-generation branch and source coordinates,
  populationDisposition
)

populationDisposition =
  exact-complete
  | unavailable
  | indeterminate
  | contradictory
```

The branch, source domains, and coordinates must equal Sections 3.3 and 3.4. All raw families are fixed before Section 4.4 generates a verifier component. The same raw source occurrence may be referenced by several governance components without being copied. A supplied implementation query, store, table, API, filter, component inventory, or provider-selected extent has no semantic standing. A smaller population, an invented placeholder, a malformed-byte pseudo-value, an omitted collision stream, or a component-dependent source family makes the population nonexact and nonauthorizing.

For `governance-historical`, the exact answer-independent question and source-domain family exist before qualification consumption. `qualificationAvailability=unavailable` maps later Trust population consumption to unavailable without rekeying them. An available exact H-11 result occurrence maps only through Section 4.2. Equal duplicates make the Trust population indeterminate; incompatible retained occurrences make it Trust-contradictory at the same question/result coordinate without changing either H-11 token. A separately failed, ambiguous, or conflicting H-02 appointment predicate is retained as its own component state and never rewrites the upstream result.

## 3.6 Currentness projection

```text
TrustIsolationGovernanceCurrentnessQualification = (
  exact TrustIsolationGovernanceEvidenceTarget,
  exact TrustIsolationCurrentUseContext,
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
```

For `connection-authority-use`, it equals the matching H-13 `HistoricalCurrentnessQualification` subject/cut/outcome wherever H-13 defines that subject. No mapping qualification exists yet. For `tenant-governance-observation`, the outcome is unavailable because the cut is unavailable. H-11 realizes the outcome; Trust only verifies and carries it.

## 3.7 Exact population completeness statement

Two clean-room implementations have the same complete governance population exactly when they have the same result subject, target, temporal branch, exact historical caller/subject/question where present, logical source domains, H-13 Stage-A coordinate, separately supplied `TrustHistoricalQualificationInput` occurrence family, the same Section 2.1 total source-type-to-native-coordinate projection, the same owner-native raw occurrence keys and multiplicities, the same Tables 2-D1 through 2-D4-required H-13 projection/reference records and relation dispositions, the same exact Stage-B member classifications and lifecycle owner-resolution outcomes, the same real-owner attributions, the same H-10 inputs/outcomes, the same literal H-11-owned outcomes, and the same underlying-target mapping collision stream where the fixed question requires it. Changing only H-11 availability, returned scope, or outcome cannot change historical question equality, source-domain identity, population-boundary identity, or owner-native grouping. No implementation may add an enclosing coordinate, omit or add a native member or required closed-container reference record, traverse H-13 dependencies for source references, infer a replacement, or use reference count as source count. Component count, component order, component success/failure, fixed-point discovery order, and physical storage are irrelevant and cannot change the raw population or Stage-B classification. The external Trust result's own Section 7.4 mapping creation/currentness evidence remains downstream and self-excluded.

# 4. Shared verification vocabulary and governance result

## 4.1 Component disposition and status

```text
TrustVerificationComponentDisposition =
  satisfied
  | failed
  | unavailable
  | indeterminate
  | contradictory

TrustIsolationVerificationStatus =
  verified-current
  | verified-historical-only
  | failed
  | unavailable
  | indeterminate
  | contradictory
```

Component meanings remain those of Revision 1: positive establishment, definitive negative, missing/unobtainable required value, unresolved/ambiguous evidence, and mutually incompatible retained evidence respectively.

The four adverse primary dispositions are nonoverlapping:

- `failed` means the facts are sufficiently resolved and definitively violate a required predicate;
- `unavailable` means a required value or evidence source is absent or unobtainable;
- `indeterminate` means required evidence exists but cannot uniquely resolve the semantic question; and
- `contradictory` means retained authoritative or required evidence contains mutually incompatible claims.

Construction facts select exactly one primary disposition. Protected reasons are additive and never turn a deterministic disposition into an implementation choice. In particular, known vacancy, a proved appointment-boundary crossing for H-02 proof authorization, and every proved Section 8.3 forbidden edge are `failed`; absent required H-11 qualification or dependency evidence is `unavailable`; a literal `historically_indeterminate` H-11 result or unresolved dependency direction is `indeterminate`; and conflicting retained result/dependency structures are `contradictory`.

For a historical question, the answer-independent question, population boundary, logical source domain, and raw grouping are fixed first. Separate `TrustHistoricalQualificationInput` is then evaluated before literal H-11 outcome mapping. An unavailable required H-11 result is Trust-local unavailable without changing those identities. A present exact H-11 result retains its token and maps only through Section 4.2. The independent H-02 appointment predicate is evaluated afterward when an available favorable H-11-owned result supplies the supported historical scope needed for post-question resolution. The general precedence below combines independent Trust components while retaining all reasons; it never renames an H-11 result, invents an H-11 interval object, inspects a low-level H-11 cause, or splits the question.

Status aggregation is total:

1. `contradictory` if any required component or retained evidence is contradictory.
2. Otherwise `failed` if any required component is failed or a well-formed unexpected component is injected.
3. Otherwise `unavailable` if any required component is unavailable or missing.
4. Otherwise `indeterminate` if any required component is indeterminate, an exact-once occurrence is equally duplicated, or required historical support is known but unsupported.
5. Otherwise `verified-current` only for a connection-authority-use current question when every required component is satisfied and each required accepted currentness outcome is literally `authoritative-current`.
6. Otherwise `verified-historical-only` only for a historical question when every required component is satisfied and H-11 classifies it `historically_verified` or `historically_verified_with_current_revocation`.

The tenant-governance-observation branch cannot currently reach rule 5. A current-result-class body cannot carry rule 6. No other status, Boolean valid, warning-only failure, default success, or exception-to-success mapping exists. Precedence never suppresses reasons.

## 4.2 Currentness/history outcome mapping

| Exact accepted current outcome | Current-use disposition |
|---|---|
| `authoritative-current` | `satisfied` |
| `superseded-or-retired` | `failed` |
| `revoked` | `failed` |
| `compromised` | `failed` |
| `rollback-or-fork-unresolved` | `failed` |
| `historically-unresolvable` | `failed` |
| `unavailable` | `unavailable` |
| `indeterminate` | `indeterminate` |
| `contradictory` | `contradictory` |

| Exact H-11 historical outcome | Historical disposition |
|---|---|
| `historically_verified` | `satisfied` |
| `historically_verified_with_current_revocation` | `satisfied`, present-authority `false` |
| `historically_invalid` | `failed` |
| `historically_indeterminate` | `indeterminate` |
| `historically_unsupported` | `indeterminate` plus protected `h11-history(historically_unsupported)` |

The first four rows preserve accepted H-11 aggregate meaning exactly; the fifth does likewise and never branches on a missing bound/source. `unsupported-profile-or-history` is not a protected reason and does not appear in this table: it is only a tenant-safe category that may be projected later if the applicable privacy/disclosure owner permits. Absence of the required H-11 result is handled before this table by `TrustHistoricalQualificationInput=unavailable`. Two incompatible retained H-11 result occurrences create a Trust-population contradiction, not a new H-11 outcome. H-02 neither upgrades H-11 history nor defines its storage/time realization.

## 4.3 Governance stable subject and target

```text
TrustIsolationGovernanceEvidenceSubjectCoordinate =
  organization-iaa-registration(
    exact OrganizationIAARegistrationSubjectIdentity
  )
  | boundary-permission(
      exact IsolationBoundaryPermissionSubjectIdentity
    )
  | workspace-iaa-state(
      exact WorkspaceIAAStateSubjectIdentity
    )
  | workspace-iaa-overlay(
      exact WorkspaceIAAOverlaySubjectIdentity
    )
  | tenant-presentation-mapping(
      exact TenantPresentationNamespace,
      exact H-02 stable source subject
    )

TrustIsolationGovernanceResultSubjectCoordinate = (
  exact TrustIsolationVerificationAuthorityCoordinate,
  exact TenantPresentationNamespace with
    presentationClass = trust-isolation-governance-result,
  exact TrustIsolationGovernanceEvidenceSubjectCoordinate
)
```

The mapping branch permits only accepted tenant classes `iaa-authority`, `iaa-registration`, `boundary-permission`, and `workspace-isolation-governance`, with the exact R8-34 source subject/owner. It forbids the result's own class, Connection classes, and unknown classes.

```text
TrustIsolationGovernanceEvidenceTarget =
  organization-iaa-registration-revision(
    exact OrganizationIAARegistrationRevisionSemantics
  )
  | boundary-permission-revision(
      exact BoundaryPermissionSemantics
    )
  | workspace-iaa-state-revision(
      exact WorkspaceIAAStateSubjectIdentity,
      exact WorkspaceIAAStateRevisionIdentity,
      exact WorkspaceStateOutcome
    )
  | workspace-iaa-overlay-revision(
      exact WorkspaceIAAOverlaySemantics
    )
  | tenant-presentation-mapping-relation(
      exact TenantPresentationNamespace,
      exact tenant-visible presentation value,
      exact stable source subject,
      exact positive mapping owner
    )
```

Every embedded identity, parent, context, purpose, owner, and revision must project exactly to the result subject. One resolved authoritative projection that is unequal to the required subject is `failed`; two retained authoritative projections that make mutually incompatible claims are `contradictory`.

## 4.4 Governance component population

`GovernanceRequiredComponentCoordinateSet` contains exactly one coordinate for each token below. The Stage-B reference-family coordinate consumes the total direct/exact-empty/fail-closed Table 2-D4 result:

```text
source-population-completeness
h13-required-reference-family-exactness
h13-projection-to-owner-native-membership
real-owner-authorship
content-equality
tenant-context-binding
experiment-isolation-purpose
cryptographic-profile-and-domain
proof-integrity
key-controller-binding
key-purpose-binding
subject-currentness-or-history
projection-coherence
population-cardinality
```

Every coordinate/result has the Section 2.4 structural shape. Governance component generation occurs only after `TrustIsolationGovernanceInputPopulation` fixes its complete raw occurrence and H-13 reference families. `h13-required-reference-family-exactness` compares Tables 2-D1 through 2-D4 containers exactly, including exact-empty results, inner multiplicity, omissions, extras, path tokens, aggregate boundaries, lifecycle failure rows, and traversal stops. `h13-projection-to-owner-native-membership` verifies every required reference against the separately fixed source family. Each component references exact already-existing raw occurrence keys, H-13 reference coordinates, or an exact singleton non-source tag. Several predicates may inspect one raw occurrence/reference; none may copy it into additional occurrences, delete it after failure, or participate in its key/family construction.

The first four content branches preserve their exact R8-10/R8-25/R8-15/R8-18 real owners and parent relations. Workspace values never fill Organization fields. Registration/permission values never synthesize Workspace state. The mapping branch requires R8-31 namespace equality, R8-33 injectivity/nonreassignment/nonrecycling, R8-34 exact owner/source, R8-30 cross-context nonreuse, and an accepted mapping-history outcome before favorable current use.

H-13 Stage A alone owns the multi-source current-use intersection and applicability result. One governance result verifies one source-owned subject/revision; it does not manufacture a synthesized permission bundle.

## 4.5 Governance result value

```text
TrustIsolationGovernanceVerificationResult = (
  exact TrustIsolationGovernanceResultSubjectCoordinate,
  exact TrustIsolationTemporalQuestion,
  exact TrustIsolationGovernanceInputPopulation,
  exact GovernanceRequiredComponentCoordinateSet,
  exact component result occurrence family,
  exact TrustIsolationVerificationReason set,
  exact TrustIsolationVerificationStatus,
  authorityEffect = evidence-only-nonauthorizing
)
```

`authorityEffect` remains protected internal semantic content exactly as in Revision 2. It is an invariant of this result type and is not tenant-visible data. Structural equality includes tuple/set/raw-occurrence-family/component-occurrence-family equality. Status and reasons are derived; a supplied unequal status or omitted reason is contradictory.

R8-34 mapping is interpreted exactly as:

```text
presentationClass = trust-isolation-governance-result
logical positive mapping owner = Trust-verification-service at the exact role coordinate
permitted concrete author = exact current/historical controller established by Section 1
source subject = exact TrustIsolationGovernanceResultSubjectCoordinate
verified evidence target = exact TrustIsolationGovernanceEvidenceTarget
```

The controller authors only the Trust component dispositions, status, and Trust-owned reasons. It does not author the governance target, source attribution, H-11 outcome, or H-13 applicability. Every newly created external proof for this governance result must independently satisfy the common Section 1.6 creation-authorization relation at its own H-11-qualified materialization interval before Section 1.7 authorship can be favorable. Every presentation mapping for it must separately satisfy Section 7.4 mapping-creation authorization. A later appointment, mapping currentness, proof validity, or historical success cannot repair unauthorized governance-proof creation or mapping creation.

# 5. Current result participant-side binding and Connection consumption

## 5.1 Structural current-result presentation scope

```text
TrustIsolationCurrentPresentationScope = (
  exact ParticipantSide,
  exact selected SideEvaluationKey,
  exact selected SideEvaluationKey.SideScopeKey,
  exact selected SideEvaluationKey.SideScopeKey.ExactTenantContext,
  exact ConnectionPresentationNamespace with
    presentationClass = trust-isolation-current-result
)
```

Required equalities are literal:

```text
TrustIsolationVerificationAuthorityCoordinate.ExactTenantContext
  = ConnectionPresentationNamespace.ExactTenantContext
  = selected SideEvaluationKey.SideScopeKey.ExactTenantContext

TrustIsolationCurrentPresentationScope.ParticipantSide
  = selected SideEvaluationKey.SideScopeKey.ParticipantSide
```

The selected side key is exactly the host-side key when `ParticipantSide=host-side` and exactly the agent-side key when `ParticipantSide=agent-side`. `initiator`, `responder`, `caller`, `callee`, audience, target, endpoint direction, or message-flow role cannot alias or determine `ParticipantSide`.

Namespace `ConnectionIdentity`, audience, and target equal the authoritative H-07 Connection. `SideScopeKey` equality includes exact Connection, context, side, selected release, and selected isolation profile. The selected `AuthorityUseCut` is the one embedded by that side key.

## 5.2 Exact current context and subject

```text
TrustIsolationCurrentVerificationContext = (
  exact TrustIsolationVerificationAuthorityCoordinate,
  exact TrustIsolationCurrentPresentationScope,
  exact ConnectionEvaluationKey,
  exact AuthorityUseCut embedded by the selected SideEvaluationKey,
  exact ConnectionIsolationEvaluation whose key equals that ConnectionEvaluationKey
)

TrustIsolationCurrentResultSubjectCoordinate = (
  exact TrustIsolationVerificationAuthorityCoordinate,
  exact TrustIsolationCurrentPresentationScope,
  exact ConnectionEvaluationKey
)
```

The complete `ConnectionIsolationEvaluation` remains the verified Connection-wide H-13 value. Side binding selects who owns this protected presentation and its one tenant context; it does not split, edit, or recalculate H-13.

Every repeated Connection, side key, side scope, context, release, profile, cut, audience, target, H-02 input, and H-13 key is universally projection-coherent. A wrong-side value cannot be repaired by correct Connection/audience/target values.

## 5.3 Exact cardinality per Connection evaluation

For one exact `ConnectionIsolationEvaluation E`, define:

```text
ExpectedTrustIsolationCurrentResultSubjectSet(E) = {
  subject(
    roleCoordinate(E.hostSide.ExactTenantContext),
    presentationScope(host-side, E.hostSide),
    E.ConnectionEvaluationKey
  ),
  subject(
    roleCoordinate(E.agentSide.ExactTenantContext),
    presentationScope(agent-side, E.agentSide),
    E.ConnectionEvaluationKey
  )
}

cardinality(ExpectedTrustIsolationCurrentResultSubjectSet(E)) = 2
```

Even when host and agent `ExactTenantContext` values are equal, the subjects remain unequal because `ParticipantSide` and the selected `SideEvaluationKey` differ. They may then occupy the same structural `ConnectionPresentationNamespace`, but R8-33 requires two unequal context-safe presentation values because one carrier maps to exactly one stable subject.

When contexts are unequal, the subjects also have unequal authority coordinates/namespaces, and R8-30/R8-33 prohibit reuse of the same protected carrier across them. Missing role occupancy, authorship, proof history, or mapping does not remove an expected subject coordinate. It prevents a consumable mapped result for that side; any candidate result body retains its independently derived internal status under Section 5.6. No singular Connection tenant context exists.

## 5.4 Current raw authentication-subject population

The exact source population is the occurrence-preserving projection of the complete carried H-13 evaluation, generated before Trust component verification. Its required reference population is the following total projection:

```text
TrustIsolationCurrentRequiredReferencePopulation(E) =
  exact multiplicity-preserving union of
    H13RequiredSourceProjectionReferenceFamily(container)
  for every accepted candidate/semantic-record container in E,
  generated by Tables 2-D1 through 2-D4, where the exact accepted
  Stage-B record is classified by applying Table 2-D4 exactly once
  to every member of its frozen H13EvaluationPopulationMembers set

TrustIsolationCurrentAuthenticationSubjectPopulation(E) = (
  exact complete TrustSemanticEvidenceLogicalSourceDomain set,
  exact complete raw TrustSemanticEvidenceOccurrence family containing
    every externally sourced or source-attributed semantic input represented by E,
    plus E as the structural evaluation subject,
  exact TrustIsolationCurrentRequiredReferencePopulation(E),
  with exact accepted raw multiplicity and no Trust-selected filtering
)
```

It contains all and only:

1. every raw Stage-A Organization registration, boundary permission, Workspace state, and Workspace overlay input candidate occurrence on both sides, including rejected audit candidates;
2. the exact H-07 authoritative Connection input/currentness source;
3. every H-13 provenance value carrying `AuthoritativeSourceAttribution`, ordinary `SourceAttribution`, `BindingBaselineDirectAttribution`, or `BindingLifecycleDirectAttribution`;
4. every exact raw source candidate/accepted placeholder/observation/assertion used by H-13 binding baseline, lifecycle, ordinary facts, closure, event, qualified-time, or protected detector semantics;
5. every exact IAA-authored RuntimeCorrespondence, Producer independence, AbsenceSourceControl, ProducerBindingContinuity, and context-local separation conclusion occurrence;
6. every exact H-13 `HistoricalCurrentnessQualification` occurrence;
7. the exact provenance candidate, derivation inventory, completeness/provenance states, reason sets, current-use disposition, and gate decision required to prove no H-13 coordinate was omitted or injected; and
8. the exact selected-side projection and the opposite-side projection needed to verify that Section 5.1 selected one and only one participant side while retaining the whole Connection evaluation.

Each raw occurrence is keyed only by the Section 2.1 closed source-type-to-`SourceNativeOccurrenceCoordinate` projection and receives exactly the Table 2-C cardinality class. The complete H-13 semantic-record population uses its accepted `SemanticRecordCoordinate`; external source content represented inside H-13 uses its external owner's native Table 2-A0 coordinate; a generic-only H-13-S3 raw member uses its exact D and owner-native member coordinate; and ownerless final H-13 structural fields use exactly Table 2-B. The single `R12H13RawSourceDispatchOf(D,x)` record fixes coordinate, class, and role together, so no table position or implementation choice can create an alias. Every and only Tables 2-D1 through 2-D4-generated direct projection is retained separately as an `H13SourceProjectionReference` at its exact container/path coordinate; dependency sets, nested Stage A, selected aggregates, question wrappers, derived inventories, neutral empty raw families, and ownerless outputs generate none. Closed references are verified against but never counted into `OwnerNativeSemanticOccurrenceFamily`; multiple references do not duplicate a source, and missing references do not delete one. No caller chooses generation/traversal, source/reference rules, or atomic/aggregate representation. Multiplicity-bearing families are enumerated at their accepted owner-native coordinates before verification; lifecycle references remain non-owning; exact-once aggregate records retain their complete inner families without flattening; an aggregate record and its inner members are never double-counted as the same source role. Top-level `H13EvaluationPopulationMembers` remains a mathematical set and is never an occurrence family. Only successfully resolved semantic values are raw `TrustSemanticEvidenceOccurrence` values. Malformed carrier material stays under H-10 as in Section 2.2. Accepted H-13 explicit `unavailable` and `indeterminate` values remain exact H-13 occurrences. A missing required H-13 value is not converted to a generic Trust placeholder.

For an exact accepted Stage-B record, Table 2-D4 is applied once to every frozen mathematical-set member. A nonempty `raw-input-family(D,F)` emits exactly the direct references prescribed for F's retained owner-native occurrences. A zero-member F yields `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` with no reference and no failure. Structural, nested, question-wrapper, and traversal-stop members yield their exact empty results. A valid lifecycle member retains the exact direct or retained-failure consequence selected by its owner-resolution facts. Only a value outside the exact accepted classifier domain, including an invented eleventh constructor or D/value mismatch, receives `H13StageBInvalidInputResult`. Being a valid Stage-B member is never by itself `unsupported-required-semantics`, never suppresses Table 2-D4, and never forces the current population or component to fail.

For every exact complete E, the current-population theorem is:

1. the raw source population contains exactly the owner-native families and their accepted multiplicities;
2. `TrustIsolationCurrentRequiredReferencePopulation(E)` contains exactly the Tables 2-D1 through 2-D4 required reference families for every supported container, including the total Table 2-D4 consequence for every frozen Stage-B member;
3. dependency traversal, reflection, storage shape, discovery order, and caller choice contribute no source, reference, branch, or failure;
4. required reference multiplicity never allocates, deletes, merges, or changes owner-native source multiplicity; and
5. no valid Stage-B record or member is forced to `unsupported-required-semantics` merely because it is Stage B.

The formal tuple above and this prose are extensionally equal: both consume the same exact Tables 2-D1 through 2-D4 population, including direct, exact-empty, and lifecycle retained-failure outcomes, and reserve `H13StageBInvalidInputResult` for truly invalid classifier input.

```text
CURRENT_POPULATION_USES_D1_D4=YES
STAGE_B_REFERENCE_GENERATION_SUPPORTED=YES
STAGE_B_FORCED_UNSUPPORTED_FAILURE=NO
SECTION_5_4_FORMAL_PROSE_EQUIVALENT=YES
```

Derived H-13 calculations without an external author receive no fictional signer. Trust verifies them through exact structural recomputation, provenance, and completeness. All failure-causing inputs remain. Adding or removing a current-result verifier component never changes this raw source population or any raw multiplicity.

## 5.5 Current required components

`CurrentRequiredComponentCoordinateSet(E,side)` contains exactly:

1. `h13-structural-evaluation` for exact equality of the complete carried `ConnectionIsolationEvaluation`;
2. `authoritative-connection-context` for H-07 Connection/audience/target/release/profile/cut equality;
3. `participant-side-and-side-key-binding` for every Section 5.1 equality;
4. `h13-provenance-integrity` for exact H-13 provenance candidate/dependencies/population and integrity state;
5. `h13-required-reference-family-exactness` over exactly `TrustIsolationCurrentRequiredReferencePopulation(E)`, generated by Tables 2-D1 through 2-D4 for every supported container, including Table 2-D4 once per frozen Stage-B member, path tokens, exact-empty cases, inner multiplicity, lifecycle owner-resolution outcomes, aggregate boundaries, traversal stops, omissions, and extras;
6. `h13-projection-to-owner-native-membership` for every required retained `H13SourceProjectionReferenceCoordinate`, with source multiplicity read only from the owner-native family;
7. `h13-result-completeness` for H-13 derivation inventory, multiplicity, completeness gate, and state;
8. one `content-owner-and-content-equality` reference for every externally owned raw semantic occurrence key;
9. one `proof-profile-domain-purpose-context` reference and one `key-controller-purpose-history` reference for every externally authored raw occurrence key under future authorized H-10/H-11 isolation semantics;
10. one `currentness` reference for every exact H-13 `HistoricalCurrentnessQualification` raw key;
11. one `h13-measured-freshness-consistency` reference for every H-13 measured conclusion raw key;
12. `underlying-disposition-retention` for every H-13 reason/state/decision; and
13. `connection-presentation-context` for exact namespace, selected side/context, two-subject cardinality, R8-37 one-Connection restriction, and R8-30/R8-33 carrier rules.

All coordinates are generated after Section 5.4 fixes the complete raw family and exactly the same `TrustIsolationCurrentRequiredReferencePopulation(E)`. The references in items 5 and 7 through 10 may overlap: multiple predicates inspecting one source occurrence or H-13 reference do not create additional source occurrences or reference records. Section 5.5 cannot substitute a Tables 2-D1 through 2-D3 subset, synthesize a Stage-B-wide failure, or derive a different reference population.

```text
SECTION_5_5_CONSUMES_SAME_REFERENCE_POPULATION=YES
```

There is no body component for the current result's own proof, its Section 1 creation authorization/authorship/role qualification, its H-11 proof currentness, its presentation mapping/currentness, its safe projection, the opposite-side result, the Section 5.7 aggregate, or its later evidence commitment. Those are downstream and self-excluded.

## 5.6 Underlying disposition and current result value

```text
UnderlyingIsolationDisposition = (
  exact H-13 ApplicableReasonSet,
  exact H-13 CurrentUseDisposition,
  exact H-13 IsolationGateDecision
)

TrustIsolationCurrentVerificationResult = (
  exact TrustIsolationCurrentResultSubjectCoordinate,
  exact TrustIsolationCurrentVerificationContext,
  temporalQuestion = current-use(
    connection-authority-use(
      exact selected SideEvaluationKey,
      exact embedded AuthorityUseCut,
      governancePopulationSelector = absent-current-result
    )
  ),
  exact TrustIsolationCurrentAuthenticationSubjectPopulation,
  exact CurrentRequiredComponentCoordinateSet,
  exact component result occurrence family,
  exact UnderlyingIsolationDisposition,
  exact TrustIsolationVerificationReason set,
  exact TrustIsolationVerificationStatus,
  authorityEffect = evidence-only-nonauthorizing
)
```

`authorityEffect` remains protected internal semantic content exactly as in Revision 2. It is an invariant of the type and not a tenant-visible category. The current class cannot carry `verified-historical-only`. A later historical assessment of its immutable proof is a separate evidence statement and cannot be replayed at a new cut.

`verified-current` means only that the exact carried evidence/context/history predicates were verified. It may coexist with H-13 `non-authorizing`; Trust does not turn it into pass. Each newly created current-result proof independently requires Section 1.6 `authorized-at-creation`. Consumable side Trust evidence separately requires exact Section 1.7 authorship, authoritative-current role occupancy at this exact cut, current/usable proof/key/history under future accepted H-11 isolation semantics, exact Section 7.4 presentation-mapping creation authorization and mapping currentness, and Section 5.7 two-side consumption. Outside H-02-S2, final authority also independently requires the H-13 decision literally `pass` and every other applicable accepted authority gate. H-13 pass cannot cure unavailable Trust verification, and H-13 nonauthorizing does not make otherwise successful Trust verification fail.

R8-34 mapping is interpreted exactly as:

```text
presentationClass = trust-isolation-current-result
logical positive mapping owner = Trust-verification-service at the selected side's role coordinate
permitted concrete author = Section 1 controller for that exact side context
source subject = exact TrustIsolationCurrentResultSubjectCoordinate
verified context = exact TrustIsolationCurrentVerificationContext
```

## 5.7 Exact two-side Connection current-use consumption

Side result derivation remains independent. The host result body must not depend directly or transitively on the agent result, and the agent result body must not depend directly or transitively on the host result. Only after both bodies and all external per-side qualifications exist may a later Connection-level relation consume them.

For one authority-bearing experiment-isolation use at one exact `ConnectionEvaluationKey` and governing `AuthorityUseCut`, define:

```text
TrustIsolationSideCurrentUseEvidence = (
  exact expected TrustIsolationCurrentResultSubjectCoordinate,
  exact TrustIsolationCurrentVerificationResult,
  exact TrustIsolationResultProofCreationAuthorization,
  exact TrustIsolationResultAuthorship,
  exact authoritative-current role-authorization qualification at AuthorityUseCut,
  exact H-10 result-proof verification outcome,
  exact H-11 result proof/key currentness-history outcome,
  exact TrustIsolationResultPresentationMapping,
  exact TrustIsolationResultPresentationMappingCreationAuthorization,
  exact TrustIsolationMappingCurrentUseEventBinding,
  exact privacy/carrier qualification,
  sideEvidenceDisposition
)

TrustIsolationConnectionCurrentUseEvidenceSet(E) = (
  exact E.ConnectionEvaluationKey,
  exact governing AuthorityUseCut,
  expectedSubjectSet = exact ExpectedTrustIsolationCurrentResultSubjectSet(E),
  exact side-evidence occurrence family keyed by expected subject,
  exact cross-side shared-projection-coherence outcome
)
```

`expectedSubjectSet` has cardinality exactly two. The side-evidence family must contain exactly one host member at the exact host subject and exactly one agent member at the exact agent subject. A repeated host member never fills the agent slot and vice versa. Missing side evidence does not shrink the set. Equal duplicates in one exact-once side slot are indeterminate; unequal duplicates or conflicts are contradictory. A well-formed result for a third/injected subject fails exact cardinality and is retained; a conflict it creates is additionally contradictory.

Each side member is fully favorable only if all of these independent equalities/outcomes hold:

1. exact expected `ParticipantSide` and exact selected `SideEvaluationKey`;
2. exact side `ExactTenantContext`, Trust role coordinate, and context-private controller;
3. exactly one authoritative-current role revision appoints that controller at the governing `AuthorityUseCut`;
4. Section 1.6 proof creation was `authorized-at-creation` at the proof's original materialization interval;
5. Section 1.7 authorship is `exact-controller-authenticated`;
6. the future accepted H-10/H-11 result proof, key, purpose, context, currentness, and history outcomes are completely favorable;
7. the result body's status is exactly `verified-current`;
8. the exact side-specific presentation mapping has one raw creation event, one matching creation-authorization relation whose disposition is `authorized-at-creation`, a `satisfied` exact event-bound current-use binding, coherent field-total R8-31/R8-34/H-07 scope projections, and separately favorable H-11 mapping currentness/history;
9. the result is bound to this one authoritative H-07 Connection under R8-37; and
10. R8-30 through R8-36 privacy, injectivity, nonreassignment, nonrecycling, and carrier rules are satisfied.

The two result bodies must carry and verify the same exact complete `ConnectionIsolationEvaluation`, `ConnectionEvaluationKey`, governing `AuthorityUseCut`, selected release, selected `IsolationProfile`, and authoritative H-07 Connection. Their intentionally distinct `ParticipantSide`, `SideEvaluationKey`, `ExactTenantContext`, Trust role/controller, and presentation namespace/carrier values are compared against their respective expected slots, not forced equal to each other. Any unequal shared Connection-wide projection is a cross-side contradiction. Any attempted edit of the carried H-13 evaluation is a contradiction; the aggregate cannot pick one side's value or rerun H-13.

The deterministic narrowing relation is:

```text
TrustIsolationConnectionCurrentUseNarrowingGate = (
  exact TrustIsolationConnectionCurrentUseEvidenceSet(E),
  exact complete TrustConnectionAggregateReasonSet,
  connectionTrustDisposition,
  authorityEffect = evidence-only-nonauthorizing
)

connectionTrustDisposition =
  favorable
  | failed
  | unavailable
  | indeterminate
  | contradictory
```

`TrustConnectionAggregateReasonSet` is the complete set of Trust-specific defects in exact side-slot cardinality, side verification/currentness/authenticity/mapping/privacy, proof-creation authorization, mapping-creation authorization, controller/authorship, H-10/H-11 proof/key/currentness usability, one-Connection binding, and shared-projection coherence. It cannot contain a policy, consent, capability, Approval, Invocation, Organization-permission, Workspace-permission, H-07-authority, H-13-decision-value, final-enforcement, or future unrelated-gate outcome. Exact H-13 reasons and the exact H-13 evaluation/decision remain structurally retained under H-13 ownership inside `E` and both side result bodies; they are not relabeled as Trust-owned reasons and their favorable/adverse value does not choose `connectionTrustDisposition`.

`favorable` holds if and only if:

- the host side member is fully favorable;
- the agent side member is fully favorable;
- the evidence set contains exactly the two expected side subjects with exact-once cardinality;
- every shared Connection-wide projection, including the complete carried H-13 evaluation and decision as structural values, is exact-coherent; and
- every Trust-owned one-Connection, presentation, mapping, privacy, and carrier-integrity predicate is satisfied.

The H-13 `IsolationGateDecision` value is deliberately absent from that favorability predicate. The aggregate verifies that both sides faithfully carry the same exact decision; it does not require that decision to be `pass`. Thus `connectionTrustDisposition=favorable` and H-13 `IsolationGateDecision=non-authorizing` is a required representable state: the Trust verification succeeded and faithfully verified a current H-13 evaluation whose independently owned result does not authorize.

Otherwise precedence is `contradictory` over `failed` over `unavailable` over `indeterminate`. One side missing or unavailable yields unavailable unless a higher-precedence Trust failure or contradiction independently exists. One side failed yields failed. One side indeterminate yields indeterminate absent a higher condition. One side contradictory, unequal shared projections, or cross-side conflict yields contradictory. H-13 pass cannot repair any such Trust defect. An H-13 nonauthorizing value, policy denial, missing Approval, or other peer-gate outcome cannot create one. All independently true protected reasons remain in their owning evidence objects even when Trust precedence selects one disposition.

The Trust aggregate may test only the predicates necessary to establish: exact two-side subject cardinality; per-side current Trust-result verification; original proof-creation authorization; the unique raw mapping-creation event, its matching creation-authorization relation, and event-bound current-use binding; exact controller/authorship; H-10/H-11 proof/key/currentness usability; exact presentation mapping/currentness; one-Connection binding; cross-side shared-projection coherence; and privacy/carrier integrity. It must not decide Organization permission, Workspace permission, H-07 Connection authority, capability authority, Approval, Invocation authorization, consent, policy `ALLOW`, final enforcement authority, or any future unrelated gate.

Even `favorable` is only a Trust evidence/narrowing result inside the complete accepted enforcer intersection. It is not Organization permission, Workspace permission, IAA truth, H-13 isolation truth, H-07 Connection authority, Invocation authorization, policy `ALLOW`, or final enforcement authority. H-13 remains the only isolation evaluation. If H-13 is nonauthorizing, favorable Trust verification cannot repair it; final authority remains absent. If H-13 is `pass` and both Trust members are favorable, all other applicable accepted authority gates still remain independently necessary.

There is no dynamically open authority-gate collection in this type or any equivalent Trust input. Adding, removing, renaming, or changing a peer or future authorization gate changes neither the bytes nor semantic equality nor favorability of an accepted H-02-S2 Trust aggregate. No peer gate is an input merely because the final enforcer requires both. Therefore the forbidden cycle `other authority/policy gate -> Trust gate -> same other authority/policy gate` has no edge in either direction through this aggregate.

The enclosing accepted enforcer, not H-02-S2, combines:

```text
TrustIsolationConnectionCurrentUseNarrowingGate = favorable
AND H-13 IsolationGateDecision = pass
AND H-07/current Connection authority requirements
AND consent/selection/policy/Approval/action authorization
AND every other independently required accepted gate under its own decision
```

H-02-S2 does not enumerate or own that complete evolving set. This is a boundary and handoff statement, not a new H-02-S2 result object or global authorization tuple.

The Connection-level relation is protected internal evidence. It allocates no new R8-34 presentation class or mapping, creates no tenant-visible category, and adds nothing to the exact five-category Section 7 projection.

# 6. Protected reasons, failure, and nonauthority

## 6.1 Protected reason coordinates

```text
TrustIsolationVerificationReasonCoordinate = (
  exact result subject coordinate or exact ConnectionEvaluationKey,
  exact component coordinate or exact Connection-consumption slot coordinate,
  exact tagged reason
)

TrustIsolationVerificationReason =
  trust-structure(exact TrustStructureReason)
  | h10-verification(exact accepted H-10 semantic failure class)
  | h11-currentness(exact nonfavorable accepted currentness outcome)
  | h11-history(exact nonfavorable accepted H-11 historical classification)
  | h13-underlying(exact H-13 SemanticReason)
```

Every true protected reason is retained as a mathematical set member. The H-10 branch preserves the exact accepted H-10 failure distinction. The H-11 branches preserve their owner/outcome. The H-13 branch copies the exact H-13 reason; Trust is not its author.

`TrustStructureReason` preserves every earlier token and adds only the exact token necessary for the Revision 9 historical-feedback repair:

```text
wrong-result-class
wrong-authority-coordinate
wrong-presentation-namespace
wrong-tenant-context
wrong-connection
wrong-audience
wrong-target
wrong-purpose
wrong-subject
wrong-source-authority
projection-incoherent
source-content-mismatch
required-component-missing
equal-duplicate-occurrence
conflicting-duplicate-occurrence
unexpected-component
component-cardinality-ambiguous
component-population-incomplete
component-population-contradictory
mapping-collision
carrier-reassigned-or-recycled
cross-context-carrier-reuse
unsafe-disclosure
self-dependency
unsupported-required-semantics
underlying-governance-nonauthorizing
underlying-isolation-nonauthorizing
role-authorization-missing
role-authorization-noncurrent
role-occupancy-vacant
role-occupancy-ambiguous
controller-substitution
wrong-participant-side
wrong-side-evaluation-key
governance-observation-cut-unavailable
source-stream-unclosed
invented-unavailable-placeholder
malformed-input-not-semantic-content
tenant-safe-projection-extra-category
raw-source-domain-unclosed
raw-occurrence-key-mismatch
source-native-coordinate-extra
source-native-coordinate-missing
source-native-coordinate-unkeyable
source-cardinality-class-mismatch
source-member-coordinate-mismatch
intrinsic-lifecycle-branch-mismatch
intrinsic-lifecycle-attribution-mismatch
intrinsic-lifecycle-double-counting
projection-reference-mismatch
projection-reference-missing
projection-reference-unexpected
projection-reference-indeterminate
projection-reference-contradictory
aggregate-family-double-counting
component-source-recursion
proof-creation-authorization-missing
proof-created-outside-appointment
proof-creation-known-boundary-crossing
proof-creation-interval-evidence-unavailable
proof-creation-interval-order-indeterminate
proof-creation-interval-evidence-contradictory
retroactive-proof-authorization-attempt
mapping-creation-authorization-missing
mapping-created-outside-appointment
mapping-creation-known-boundary-crossing
mapping-creation-h11-qualification-unavailable
mapping-creation-event-or-role-evidence-contradictory
retroactive-mapping-authorization-attempt
connection-side-slot-missing
connection-side-slot-duplicate
connection-side-subject-injected
cross-side-connection-projection-incoherent
connection-trust-evidence-set-incomplete
forbidden-peer-gate-dependency
h13-result-to-trust-verification-dependency
proof-to-mapping-authority-substitution
mapping-to-proof-authority-substitution
trust-to-permission-authority-substitution
trust-to-measurement-authority-substitution
trust-to-connection-authority-substitution
trust-to-policy-authority-substitution
dependency-evidence-unavailable
dependency-direction-indeterminate
dependency-graphs-contradictory
historical-answer-to-question-identity-feedback
```

The additions do not rename or suppress accepted H-10/H-11/H-13 outcomes. For literal H-11 `historically_unsupported`, the protected internal reason is exactly `h11-history(historically_unsupported)`. `unsupported-profile-or-history` belongs only to the tenant-safe category domain and is emitted only when the applicable privacy/disclosure owner allows it. `unsupported-required-semantics` belongs only to `TrustStructureReason` and means that an H-02-S2 required recognized semantic class, source projection, or closed path/reference rule cannot be represented or resolved—for example, zero/multiple source-owner rows, an invented top-level constructor, a D/F or D/V mismatch, or a missing required direct-path grammar row. It never stands for a known H-11 profile/release classified `historically_unsupported`.

## 6.2 Contradiction and full retention

Once an in-scope Trust contradiction exists, a later valid proof, fresher evidence, higher sequence, alternate source, successful H-13 result, second-side success, peer-gate success, or Trust statement cannot erase it. The applicable result or Connection Trust gate is `contradictory`, all underlying reasons remain, and the type remains evidence-only/nonauthorizing. A value omitting the contradiction is itself contradictory through population, cross-side coherence, or underlying-disposition retention. An independently adverse H-13 decision or peer-gate outcome remains adverse under its own owner but is not thereby a Trust contradiction.

## 6.3 Exact nonauthority consequences

For both result families and the Connection-level Trust relation:

1. `verified-current` and Connection `favorable` are bounded verification/narrowing evidence at one exact cut. Neither is permission, measurement truth, Connection state, authorization, Approval, policy, or enforcement authority.
2. `verified-historical-only` has present-authority value `false`.
3. `failed`, `unavailable`, `indeterminate`, and `contradictory` are nonauthorizing and do not fabricate revocation, compromise, or terminal denial.
4. Trust cannot turn H-13 nonauthorizing into pass or edit any H-13 reason/state/decision.
5. H-13 pass cannot turn one side result, two side results, or the Connection Trust gate into authority.
6. Missing Trust evidence is no evidence and never implicit success/currentness. One side can never substitute for its missing opposite side.
7. Side result derivation remains independent; only the later exact two-member relation consumes them together.
8. Only the exact accepted enforcer may consume a favorable Connection Trust narrowing result as one input to its complete intersection. The enforcer separately requires H-13 `pass`, H-07/current Connection authority, consent/selection/policy/Approval/action authorization, and every other applicable accepted gate under their own decisions.
9. H-02-S2 neither enumerates nor owns that evolving enforcer set. No peer gate feeds the Trust aggregate, and Trust favorability neither predicts nor creates the peer gate's outcome.
10. Trust `favorable` may coexist with H-13 `non-authorizing`, policy deny, missing Approval, or another adverse peer gate. In every such case final authority is absent for the independently owned adverse reason.

# 7. Tenant-visible R8-35 projection and mapping

## 7.1 Exactly five permitted categories

The protected result is never tenant-visible. The maximal H-02-safe projection has exactly the five R8-35 categories and no other member:

```text
TrustIsolationTenantSafeProjection = (
  context = exact context-safe projection of the bound R8-31 namespace,
  safeVerificationCategoryStatus,
  safeReasonCategory = withheld | present(exact safe reason-category set),
  contextSafePresentationReference,
  safeHistoricalOrCurrentEvidenceCommitmentReference =
    absent | present(exact context-safe value)
)
```

`context` is the first R8-35 category. It carries the safe projection of the exact bound Tenant or Connection namespace; there is no separate namespace member that would create a sixth category.

There is no tenant-visible `safe underlying disposition` field and no tenant-visible `authorityEffect` field. Evidence-only/nonauthorizing is a semantic law of both result types. It needs no carrier member.

## 7.2 Safe verification status

The status category is the one-to-one safe renaming:

```text
verified-current
verified-historical-only
verification-failed
verification-unavailable
verification-indeterminate
verification-contradictory
```

The safe status never implies H-13 pass, Organization/Workspace permission, Connection authority, or ALLOW.

## 7.3 Safe reason categories and underlying meaning

The maximal safe reason-category set is drawn only from:

```text
context-or-scope-mismatch
source-or-subject-mismatch
cryptographic-verification-failed
currentness-or-history-noncurrent
evidence-unavailable
evidence-indeterminate
evidence-contradictory
unsupported-profile-or-history
underlying-governance-nonauthorizing
underlying-isolation-nonauthorizing
presentation-or-privacy-failure
```

Protected structural context/Connection/side/purpose faults map to `context-or-scope-mismatch`. Author/controller/subject/content faults map to `source-or-subject-mismatch`. H-10 failures map to cryptographic failure except unsupported/history-specific outcomes. Each exact H-11 outcome maps through Section 4.2 to its one safe currentness/history category and, when that exact outcome is unavailable, indeterminate, or contradictory, to the correspondingly named safe evidence category. Mapping/carrier/privacy faults map to presentation/privacy.

A known authoritative-current `occupant=vacant` is protected `failed` with `role-occupancy-vacant` and maps, if H-12 permits disclosure, only to `underlying-governance-nonauthorizing`. Missing role revision/history evidence is protected `unavailable` and maps only to `evidence-unavailable`. The safe projection therefore does not conflate known vacancy with missing evidence and exposes no controller or role-history detail.

Presentation-mapping creation follows the same total safe separation. A resolved unauthorized author/scope or a failed H-02 creation-appointment predicate maps to safe status `verification-failed` and, if disclosed, `presentation-or-privacy-failure`. An absent required H-11 qualification/result occurrence, creation event, or matching authorization relation maps to `verification-unavailable` and `evidence-unavailable`. A literal H-11 `historically_indeterminate` result, an equal duplicate event/relation, or a nonunique binding maps to `verification-indeterminate` and `evidence-indeterminate`. Mutually incompatible retained events, authorization relations, H-11 result occurrences, or bindings map to `verification-contradictory` and `evidence-contradictory`. No safe field reveals the controller, appointment, H-11 result token, event coordinate, carrier history, or whether a later appointment exists.

Historical assessment is equally exact without redefining H-11: absent required H-11 result occurrence maps to safe unavailable; literal `historically_indeterminate` maps to safe indeterminate; literal `historically_unsupported` produces protected `h11-history(historically_unsupported)` and safe indeterminate, with `unsupported-profile-or-history` added only if disclosure is allowed; conflicting Trust-consumed occurrences map to safe contradictory; and literal `historically_invalid` maps to safe failure/currentness-history-noncurrent. `unsupported-required-semantics` is excluded from ordinary `historically_unsupported` handling. There is no H-02-owned historical interval verdict and no missing-to-indeterminate conversion.

When permitted external meaning about the protected H-13 disposition is exposed, it is carried only by the R8-35 `safe reason category`:

- H-13 nonauthorizing, indeterminate, or contradictory maps to `underlying-isolation-nonauthorizing`.
- Noncurrent/failed/unresolved protected governance evidence maps to `underlying-governance-nonauthorizing`.
- H-13 pass is not exposed as `underlying-isolation-pass` or any extra field. A favorable Trust status remains evidence-only and the protected enforcer checks the exact H-13 decision directly.

Thus Revision 1's `underlying-isolation-pass`, `underlying-isolation-indeterminate-or-contradictory`, and governance-disposition carrier vocabulary is not part of the tenant projection.

The reason set contains no raw coordinate, reason code, identity, path, detector detail, source count, timing detail, key, proof, or provider. H-12 may further redact or collapse the permitted category or mark it `withheld`; it may never expose protected data or convert failure to success.

## 7.4 Presentation mapping relation

The completed result precedes its presentation mapping:

```text
TrustIsolationResultPresentationMapping = (
  exact result presentation namespace,
  exact context-safe presentation value,
  exact result subject coordinate,
  logical positive mapping owner = exact TrustIsolationVerificationAuthorityCoordinate,
  concrete semantic author = exact TrustIsolationServiceControllerIdentity
)

TrustIsolationMappingWithinRoleAuthorizationScope = (
  exact TrustIsolationRoleAuthorizationRevisionSemantics,
  exact TrustIsolationResultPresentationMapping,
  exact TrustIsolationResultClass derived from namespace and result subject,
  exact accepted R8-34 positive-owner/source-subject row,
  exact class-specific namespace projection =
    governance(
      exact TenantPresentationNamespace,
      connectionDimensions = absent)
    | current(
      exact ConnectionPresentationNamespace,
      exact authoritative H-07 ConnectionIdentity,
      exact H-07 audience,
      exact H-07 target),
  scopeDisposition = satisfied | failed | unavailable | indeterminate |
    contradictory
)

TrustIsolationResultPresentationMappingCreationEventCoordinate = (
  mapping-creation-event-question(
    exact immutable TrustIsolationResultPresentationMapping,
    eventQuestionKind = creation-materialization-of-this-exact-mapping
  )
)

TrustIsolationResultPresentationMappingCreationEvent = (
  exact TrustIsolationResultPresentationMappingCreationEventCoordinate,
  exact immutable TrustIsolationResultPresentationMapping equal to the
    coordinate's mapping projection,
  exact TrustIsolationServiceControllerIdentity equal to the mapping's
    concrete semantic author,
  eventFact = creation-materialization-occurred
)

TrustIsolationResultPresentationMappingCreationAuthorization = (
  exact immutable TrustIsolationResultPresentationMapping,
  exact TrustIsolationResultPresentationMappingCreationEventCoordinate,
  exact already-existing TrustIsolationResultPresentationMappingCreationEvent,
  exact TrustIsolationServiceControllerIdentity equal to the event author,
  exact TrustIsolationAuthorizedControllerCoordinate,
  exact TrustIsolationRoleAuthorizationRevisionSemantics,
  exact TrustIsolationMappingWithinRoleAuthorizationScope,
  exact TrustIsolationHistoricalQuestionFor(
    presentation-mapping-creation-caller(
      exact already-existing
        TrustIsolationResultPresentationMappingCreationEvent)),
  exact TrustHistoricalQualificationInput supplied to that already-fixed
    historical question,
  exact TrustIsolationCreationAppointmentPredicate for this already-existing
    event,
  exact mappingCreationAuthorizationCoherencePredicate,
  exact derived mappingCreationAuthorizationDisposition
)

TrustIsolationResultPresentationMappingCreationAuthorizationFamily =
  exact finite occurrence family of matching
    TrustIsolationResultPresentationMappingCreationAuthorization relations
  retained separately from the creation-event occurrence family

TrustIsolationMappingCurrentUseEventBinding = (
  exact TrustIsolationResultPresentationMapping,
  exact TrustIsolationResultPresentationMappingCreationEventCoordinate,
  exact one already-existing TrustIsolationResultPresentationMappingCreationEvent,
  exact one matching
    TrustIsolationResultPresentationMappingCreationAuthorization relation,
  requirement that the matching relation's
    mappingCreationAuthorizationDisposition = authorized-at-creation,
  exact H-11 mapping-currentness/history outcome occurrence family whose
    semantic subject is that exact creation event and event lineage,
  exact AuthorityUseCut,
  currentEventBindingDisposition =
    satisfied | failed | unavailable | indeterminate | contradictory
)

mappingCreationAuthorizationDisposition =
  authorized-at-creation
  | failed
  | unavailable
  | indeterminate
  | contradictory
```

These are newly proposed H-02-S2 semantic question/relations for both Trust result classes. `mapping-creation-event-question(M, creation-materialization-of-this-exact-mapping)` is a tagged semantic coordinate and therefore is not equal to immutable mapping value M, although its projection to M is exact and injective. For one exact immutable M there is exactly one legitimate semantic mapping-creation-event question. A mapping is an immutable relation whose semantic creation is singular. Multiple retained records/assertions of the same event are representations or occurrences of that one semantic event, not separately legitimate events. A second legitimate event coordinate for the same M does not exist. The coordinate contains no event ID, timestamp, H-11 record/sequence/checkpoint, database row, proof ID, carrier representation identity, arrival order, storage location, digest, time value, or wire identifier.

The creation event is the raw pre-qualification occurrence being questioned. Its tuple contains only its exact semantic question coordinate, the exact immutable mapping being materialized, the exact semantic controller who performed the event, and the intrinsic fact that materialization occurred. It contains no `TrustHistoricalQualificationInput`, H-11 result/interval/currentness/history verdict, role revision, `TrustIsolationCreationAppointmentPredicate`, scope disposition, authorization disposition, proof validity/currentness, mapping currentness/history, result currentness, Trust verification result, safe projection, consumer outcome, or fact derived from authorization. The mapping's semantic author is the context-private controller identity, not an `AuthorizedControllerCoordinate`; appointment and revision evidence appear only in the later authorization relation. The event can therefore exist and be retained even when qualification or authorization is absent or adverse.

The exact forward causal order is:

```text
immutable completed result
  -> immutable presentation mapping M
  -> exact mapping-creation-event semantic question coordinate for M
  -> raw creation-event occurrence/fact
  -> H-11 qualification of that already-existing event
  + H-02 controller/role appointment evidence
  + field-total mapping-within-role-scope predicate
  + exact coherence predicate
  -> mapping-creation authorization relation
  -> authorized-at-creation or adverse disposition
  -> H-11 event-bound mapping currentness/history
  -> current-use event binding at AuthorityUseCut
  -> safe presentation consumption
```

There is no reverse edge from H-11 qualification, appointment, scope, authorization disposition, mapping currentness/history, downstream Trust verification disposition/status, proof currentness, or consumer outcome into creation-event construction. The immutable completed result remains the legitimate forward input to M as shown above.

`TrustIsolationMappingWithinRoleAuthorizationScope.scopeDisposition=satisfied` if and only if every following field-total predicate holds:

1. `role.authorizationScope.ExactTenantContext = mapping.namespace.ExactTenantContext = mapping.resultSubject.ExactTenantContext`;
2. `role.authorizationScope.purpose = mapping.namespace.purpose = experiment-isolation`;
3. `role.authorizationScope.authorityRole = Trust-verification-service`;
4. the namespace/result-derived presentation class is exactly one member of `role.authorizationScope.permittedResultClasses`;
5. the accepted R8-34 positive mapping owner for that exact class is `Trust verification service`, equal to the mapping's exact logical Trust role coordinate;
6. the R8-34 source subject for the class equals the exact mapping result subject: governance-evidence subject/context for governance class or current isolation verification context for current class;
7. governance class uses exactly `TenantPresentationNamespace` and has no invented Connection/audience/target dimension; and
8. current class uses exactly `ConnectionPresentationNamespace`, whose `ConnectionIdentity`, audience, and target equal the authoritative H-07 values carried by the exact current result subject/context.

The removed Revision 6 `mappingPurpose` token has no independent semantic type. No action-purpose token is compared with `purpose=experiment-isolation`. Mapping authority is derived only from the exact R8-34 owner row, H-02 role fields/class membership, R8-31 namespace coherence, exact result subject, and H-07 equality above. Namespace/result/audience/target are independent coherence predicates, not undeclared appointment-scope dimensions. One resolved false equality is `failed`; an unobtainable required input is `unavailable`; present nonunique evidence is `indeterminate`; and incompatible retained authoritative projections are `contradictory`.

`authorized-at-creation` is a disposition of the separate authorization relation and holds only when all of the following are established for this exact immutable mapping event:

1. exactly one creation-event occurrence exists at the exact mapping event coordinate;
2. mapping semantic author equals the exact controller in the event, the exact controller in `TrustIsolationAuthorizedControllerCoordinate`, and the `present(controller)` occupant in the immutable role revision;
3. `scopeDisposition=satisfied` under the field-total predicate above;
4. the required H-11 isolation qualification is available, its exact retained historical outcome is favorable, and it supplies a resolved supported materialization conclusion for this event question;
5. `appointmentPredicateDisposition=satisfied`, proving the controller was appointed throughout that resolved interval; and
6. `mappingCreationAuthorizationCoherencePredicate=satisfied`: every repeated mapping, event, controller, authorized-controller coordinate, role revision, result class, context, namespace, subject, H-07 value, event coordinate, qualification subject, and appointment subject is exactly coherent.

Creation-event representation cardinality is exact-once and precedes authorization-relation cardinality. Zero event representations is unavailable with `mapping-creation-authorization-missing`. Exactly one proceeds to qualification and authorization of the singular event question. Two or more equal complete event representations at its coordinate retain multiplicity and are indeterminate with `equal-duplicate-occurrence`. Two or more unequal event values at the same coordinate are contradictory with `mapping-creation-event-or-role-evidence-contradictory`. There are no several legitimate creation events for one immutable mapping. Claim time, arrival order, later appointment, currentness, proof validity, or favorable history cannot make two structurally equal event values unequal or select a later representation.

H-11 qualifies the singular semantic event question for M. Equal H-02 event representations do not supply unequal H-11 event identities or distinct materialization intervals. Mutually incompatible retained H-11 qualifications for that one event remain conflicting qualification evidence under the existing Trust contradiction rules; H-02 allocates no event discriminator to resolve them.

The matching authorization-relation family is counted separately. Given exactly one event, zero matching relations is unavailable with `mapping-creation-authorization-missing`; exactly one is evaluated; equal duplicate complete relation occurrences are indeterminate with `equal-duplicate-occurrence`; unequal relations or a relation for another mapping/event/controller/revision are contradictory with `mapping-creation-event-or-role-evidence-contradictory`. An event whose required H-11 qualification occurrence is absent yields an unavailable authorization relation with `mapping-creation-h11-qualification-unavailable`. No event is described as carrying an authorization disposition.

Literal H-11 result mapping follows Section 1.6. A resolved favorable interval wholly outside appointment or after vacancy/replacement fails with `mapping-created-outside-appointment`; a resolved crossing fails with `mapping-creation-known-boundary-crossing`; an unobtainable H-11 result is unavailable; a present `historically_indeterminate` remains H-11-owned and makes Trust indeterminate; a present `historically_unsupported` remains H-11-owned, makes Trust indeterminate, and retains exactly protected `h11-history(historically_unsupported)`; incompatible H-02 role evidence makes Trust contradictory without renaming H-11. Optional safe `unsupported-profile-or-history` is downstream disclosure only.

The hostile e1/e2 construction is therefore closed without inventing an event discriminator. If two retained records for M carry the same complete event value, they are equal representations of M's one event and the family is indeterminate; a later claim time cannot turn the second into e2. If the retained values are structurally unequal at M's one event coordinate, the family is contradictory and malformed. If the one H-11 qualification proves M's event pre-appointment, M's creation authorization is failed permanently. A later incompatible H-11 qualification claiming post-appointment materialization is conflicting qualification/history evidence about that same singular event, not a new H-02 event identity. A genuinely new authorized creation after appointment must use a new context-safe, nonrecycled carrier, yielding a new immutable mapping M2, its own singular event question, and independent qualification/authorization. No first/latest/preferred/successful-event or qualification selection exists.

R8-33 applies literally. Within a namespace, one carrier resolves to exactly one stable result subject; collision, alias, reassignment, pointer repointing, and recycling fail closed. Across unequal contexts, the same protected value cannot be allocated, returned, or reused absent the exact R8-36 exception. Equal-context host/agent subjects still require two distinct carriers because they are two stable subjects in one namespace.

Current mapping use binds separately to M, its one exact event, its one matching authorization relation whose disposition is `authorized-at-creation`, and the event-bound H-11 currentness/history lineage at the exact `AuthorityUseCut`; it never binds merely to mapping bytes or carrier. Binding is `satisfied` only when all four semantic subjects cohere, the H-11 outcome is uniquely favorable at the use cut and explicitly qualifies that exact event/lineage, the logical Trust role is authoritatively occupied at the use cut, and R8-30 through R8-36 plus all R8-31/H-07 predicates pass. A relation for M replayed against M2, a relation for another event, or an event paired with the wrong relation is contradictory. Missing event, relation, or event-lineage binding is unavailable; equal duplicate bindings are indeterminate; present but nonunique bindings are indeterminate; incompatible retained bindings are contradictory; one resolved noncurrent/revoked/retired binding is failed. No H-11 isolation mapping-currentness value currently exists, so operational current use remains unavailable until a separately accepted H-11 isolation supplement realizes this exact event handoff.

A mapping current under future H-11 semantics but unauthorized at creation is nonconsumable. Mapping currentness/history and proof validity/currentness cannot repair mapping creation. Mapping validity/currentness cannot repair proof creation. A later controller C2 may consume an old C1-authored mapping only if the one C1 event was authorized, the exact event-bound H-11 mapping lineage remains favorable, C2 currently occupies the same logical role, and every other current predicate passes; C2 does not re-author the old event. If C2 creates a new mapping, it requires a new nonrecycled carrier and independently authorized event.

Historical mapping verification may establish that an old immutable mapping was created wholly while its author was appointed. It always has present-authority `false`, cannot make the old controller current, and cannot authorize present use or carrier reallocation. The historical carrier remains reserved and nonrecyclable after retirement, replacement, revocation, or a later controller appointment.

H-11 later owns evidence and mechanics for mapping materialization, event-bound currentness/history, revocation, rollback/fork, and recovery. H-02-S2 owns the semantic event question coordinate, exact-once cardinality, author-authority, field coherence, nonretroactivity, and downstream classification above. H-11 does not decide controller authority or retroactivity. Mapping and both qualifications are outside the mapped result. Missing, duplicate, collided, recycled, noncurrent, creation-unauthorized, or contradictory mapping yields no consumable safe projection.

## 7.5 Forbidden tenant-visible material

Every safe member and nested carrier forbids:

```text
provider-global Trust root, service, or controller identity
provider-global IAA identity
hidden GovernedBoundaryLineageKey
private physical/runtime/Producer identity
raw detector dispositions, paths, populations, or provenance
raw governance candidate populations
cross-context-stable kid, thumbprint, proof, signature, digest, controller revision, or result reference
raw issuer, compromise, rollback, fork, checkpoint, or role-occupancy detail
any nested token, envelope, ciphertext, commitment, or carrier with equivalent correlation behavior
```

R8-36 remains exact-field/value/authority-specific. Same provider, root, physical service, IAA, key, algorithm, or convenience is not an exception.

# 8. Acyclic dependency proof

## 8.1 Raw evidence, role, proof creation, authorship, and governance result

```text
Organization-authority controller identity allocation
  -> Organization-authority immutable role-authorization revision
  -> independent content attribution
  -> H-11 qualification of that already-authored revision
  -> exact authorized-controller coordinate

exact closed TrustIsolationHistoricalCaller
  -> total TrustIsolationHistoricalSubjectOf
  -> one closed tagged TrustIsolationHistoricalSemanticSubject
  -> H-02-owned TrustIsolationHistoricalQualificationQuestionCoordinate
  -> answer-independent TrustIsolationHistoricalAssessmentQuestion
  -> governance-historical population boundary and logical source domain
  -> owner-native raw source key/grouping fixed for that one question
  -> separately supplied TrustHistoricalQualificationInput
  -> post-question TrustIsolationHistoricalPopulationResolution
  -> Trust components and result

NEVER H-11 result/availability/returned scope/duplicate/conflict/Trust status
  -> historical question, population-boundary, logical-domain, or source-key identity

accepted source family
  -> Table 2-C cardinality class
  -> exact atomic member or aggregate-record coordinate
  -> exact complete owner-native semantic occurrence family and multiplicity
  -> raw semantic occurrence key/value

accepted H-13 H13EvaluationSeed + closed ExpandH13 least fixed point
  -> exact mathematical H13EvaluationPopulationMembers set
  + separately carried accepted inner occurrence/candidate families
  -> no fixed-point-discovery multiplicity and no inner-family deduplication
  -> exact accepted H-13-S3 ten-constructor member grammar
  -> total/disjoint H-02 Table 2-D4 constructor and dependent-subtype dispatch
  -> exact direct, structural-empty, nested-empty, wrapper-empty, or
     retained-failure-empty result
  -> exact Stage-B reference family without dependency traversal

accepted Tables 2-D1 through 2-D4 container grammar
  -> exact H13DirectSourceReferencePath and accepted inner occurrence coordinates
  -> exact H13RequiredSourceProjectionReferenceFamily(container)
  + expected owner-native coordinate/value for each generated slot
  -> independently retained H-13 projection reference family
  -> projection-to-owner-native membership verification
  -> zero traversal through RequiredDependencies or transitive provenance edges
  -> no edge that allocates, increments, consumes, or deduplicates
     owner-native occurrence multiplicity

exact complete ConnectionIsolationEvaluation E
  -> exact accepted candidate/semantic-record containers in E
  -> Tables 2-D1 through 2-D4, including Table 2-D4 exactly once
     for every member of frozen H13EvaluationPopulationMembers
  -> TrustIsolationCurrentRequiredReferencePopulation(E)
  -> the identical reference population in
     TrustIsolationCurrentAuthenticationSubjectPopulation(E)
  -> the identical reference population consumed by
     CurrentRequiredComponentCoordinateSet(E,side)

NEVER valid Stage-B membership
  -> forced unsupported-required-semantics or blanket component failure

NEVER caller/provider stage-b-direct tag, discovery pass, reflection,
  dependency reachability, or representation path -> Stage-B classification

exact complete owner-native raw occurrence family
  + exact complete independently retained H-13 reference population
  -> required component coordinate generation
  -> component verification result families
  -> completed Trust result body

already named semantic controller + completed Trust governance or current result body
  -> external H-10 proof event
  -> H-11-realized exact proof-materialization interval evidence

proof event/controller/result + appointment history + materialization interval evidence
  -> total inside/outside/crossing/absent/unresolved/conflicting classification
  -> common proof-creation authorization disposition
  -> authorized-at-creation only on whole-interval-inside with every other prerequisite favorable
  -> H-10 proof verification and H-11 proof/key/history use qualification
  -> exact result authorship

completed result + exact result presentation namespace/carrier/subject/semantic author
  -> exact immutable presentation mapping M
  -> one singular tagged creation-event-question coordinate injectively wrapping M
  -> raw representations of that one semantic event
  -> exact-once representation cardinality classification
  -> exactly one already-existing singular raw event when evaluable
  -> literal H-11 qualification/result occurrence family for that singular event
  + independent H-02 creation-appointment predicate
  + field-total R8-31/R8-34/H-07 scope predicate
  + exact authorization coherence predicate
  -> separate mapping-creation authorization relation family
  -> one matching relation with authorized-at-creation or adverse disposition
  -> H-11 currentness/history bound to that event and lineage
  -> current-use binding to M + event + matching authorized relation + cut
  -> privacy/injectivity and safe-presentation consumption
  -> safe projection

NEVER later appointment/currentness/history/claim time
  -> new event identity or favorable-event selection for M
```

Raw occurrence construction contains no verifier component. Cardinality classification precedes member grouping and verification. One raw occurrence may fan out to many later components without being copied. One aggregate family record retains its inner family without flattening or double counting. The result body excludes its own proof, proof-creation authorization, role-occupancy qualification, key/controller mapping, authorship relation, result currentness, presentation mapping/currentness, safe projection/reference, and later evidence commitment.

The Organization-authored role revision exists independently before it can authorize proof or mapping creation; the raw mapping event exists before H-11 or the H-02 appointment predicate can qualify it. A result precedes its mapping. Mapping M, tagged event-question coordinate `mapping-creation-event-question(M, ...)`, singular semantic event, its retained representation family, and authorization relation are unequal semantic types. Zero, exactly one, equal-duplicate, and unequal event representations have the total Section 7.4 consequences independently from the authorization-relation family's zero/one/equal-duplicate/unequal cardinality. Claim time cannot split the event. A genuine later mapping uses a new nonrecycled carrier and new M2/event-question/event/relation. Each qualification establishes facts about its own prior singular event but never feeds backward to construct M, its coordinate, or its event; incompatible qualifications remain one-question conflicts. Mapping currentness/history, proof validity/currentness, Trust status, and consumer outcomes likewise have no backward edge.

## 8.2 Independent side results and Connection consumption

```text
H-02/H-07 governance and Connection inputs
  -> IAA/direct-owner facts and H-11 qualifications
  -> H-13 ConnectionIsolationEvaluation

H-13 ConnectionIsolationEvaluation
  -> deterministic host-side scope
  -> host raw family/components/body
  -> host proof-creation authorization/authorship/currentness/mapping

H-13 ConnectionIsolationEvaluation
  -> deterministic agent-side scope
  -> agent raw family/components/body
  -> agent proof-creation authorization/authorship/currentness/mapping

two independently completed and qualified side results
  -> exact two-member Connection Trust evidence set
  -> Connection Trust narrowing disposition

Connection Trust narrowing disposition
  + independently owned H-13 IsolationGateDecision
  + independently owned H-07/current Connection authority
  + other independently owned authority/policy gates
  -> accepted enforcer decision outside H-02-S2
```

There is no edge from host result to agent derivation or from agent result to host derivation. Both consume the same exact complete H-13 evaluation independently. The later aggregate checks exact shared projections and two-slot completeness; it does not create either result or feed H-13. H-13 `pass` and every peer authority/policy gate join only at the external enforcer. No such outcome is an input to Trust-verification success.

## 8.3 Forbidden back edges

No direct or transitive edge in the following table is permitted. The mandatory protected-reason set is exact for a proved edge; it is not selected by a caller and is not inherited from a generic cycle bucket.

| ID | Proved forbidden direct or transitive edge | Exact mandatory protected-reason set |
|---|---|---|
| FBE01 | verifier component -> raw occurrence key/value/population construction | `{component-source-recursion}` |
| FBE02 | component failure -> deletion, suppression, or multiplicity reduction of its raw occurrence | `{component-source-recursion, component-population-incomplete}` |
| FBE03 | verifier component -> `SourceNativeOccurrenceCoordinate` construction or selection | `{component-source-recursion, source-native-coordinate-extra}` |
| FBE04 | H-13 projection/reference count -> owner-native source occurrence count | `{source-cardinality-class-mismatch, projection-reference-mismatch}` |
| FBE05 | Producer intrinsic attribution-wrapper count -> raw lifecycle-member allocation or count | `{intrinsic-lifecycle-double-counting}` |
| FBE06 | result proof -> controller appointment or role authorization | `{self-dependency}` |
| FBE07 | later appointment -> earlier proof-creation authorization | `{retroactive-proof-authorization-attempt}` |
| FBE08 | later appointment -> earlier presentation-mapping creation authorization | `{retroactive-mapping-authorization-attempt}` |
| FBE09 | result proof/currentness/history -> completed result body | `{self-dependency}` |
| FBE10 | H-11 qualification of a mapping event or mapping currentness/history -> construction/alteration of that mapping creation event; or mapping currentness/history -> mapping creation authorization | `{retroactive-mapping-authorization-attempt}` |
| FBE11 | result-proof validity/currentness -> mapping creation authorization | `{proof-to-mapping-authority-substitution}` |
| FBE12 | mapping validity/currentness -> proof-creation authorization | `{mapping-to-proof-authority-substitution}` |
| FBE13 | host Trust result -> agent Trust-result derivation | `{self-dependency}` |
| FBE14 | agent Trust result -> host Trust-result derivation | `{self-dependency}` |
| FBE15 | Connection Trust aggregate -> H-13 evaluation, reasons, or decision | `{self-dependency}` |
| FBE16 | H-13 result/pass/fail -> Trust-verification success/failure | `{h13-result-to-trust-verification-dependency}` |
| FBE17 | other authority/policy gate -> Trust aggregate -> that same gate | `{forbidden-peer-gate-dependency}` |
| FBE18 | Trust result or aggregate -> Organization/Workspace permission | `{trust-to-permission-authority-substitution}` |
| FBE19 | Trust result or aggregate -> IAA measured fact | `{trust-to-measurement-authority-substitution}` |
| FBE20 | Trust result or aggregate -> H-07 Connection authority | `{trust-to-connection-authority-substitution}` |
| FBE21 | Trust result or aggregate -> Invocation authorization or policy `ALLOW` | `{trust-to-policy-authority-substitution}` |
| FBE22 | H-11 historical result, qualification availability, returned evidence scope, duplicate/conflict state, or derived Trust disposition -> historical question/scope identity, `TrustSemanticEvidencePopulationBoundary`, logical source domain, raw occurrence key, or owner-native grouping | `{historical-answer-to-question-identity-feedback}` |

No Trust result, proof, mapping, key, controller, aggregate, H-13 decision value, or peer-gate outcome may create, select, authenticate, current-qualify, or repair a Trust prerequisite. Dependency-evidence state is classified separately and totally:

| Dependency facts | Primary semantic disposition | Exact protected-reason rule |
|---|---|---|
| a well-formed candidate structure proves any FBE01-FBE22 edge | `failed` | exact mandatory set from that row; union the sets when several edges are proved |
| required dependency information is absent or unobtainable and no owning edge is proved | `unavailable` | `{dependency-evidence-unavailable}` |
| dependency information exists but exact required edge direction or acyclicity cannot be resolved and no owning edge is proved | `indeterminate` | `{dependency-direction-indeterminate}` |
| retained authoritative dependency candidates are mutually incompatible | `contradictory` | `{dependency-graphs-contradictory}` plus the mandatory set of every FBE row independently proved by all compatible candidates |

A proved forbidden edge remains `failed` even if unrelated dependency evidence is absent or ambiguous; evidence-state reasons are additive only where their stated fact also exists. A known cycle is never reclassified as uncertain merely because it is cyclic. The external enforcer's later conjunction of independent outcomes is forward-only and creates no back edge.

# 9. Exact H-10 and H-11 handoffs

## 9.1 H-10 handoff

For each result family, future separately authorized H-10 work receives:

| Item | Exact semantic input |
|---|---|
| completed semantic subject | Section 4.5 or 5.6 immutable tuple |
| logical role | exact `TrustIsolationVerificationAuthorityCoordinate` |
| concrete semantic controller | exact `TrustIsolationAuthorizedControllerCoordinate` from H-02, not from the key |
| proof-creation authority question | exact result class/subject/body/controller/role revision and H-11-qualified creation interval from Section 1.6 |
| context | exact Tenant namespace or exact side-specific Connection scope; current additionally binds full Connection evaluation key/cut |
| equality | tuple/set equality; exact H-02 historical caller-to-subject-to-question function before returned input; exact Table 2-C source cardinality class; exact atomic-member or aggregate-record coordinate; closed Producer intrinsic lifecycle member projection; literal accepted `H13EvaluationPopulationMembers` set semantics; exact accepted ten-constructor Stage-B dispatch; separate accepted inner occurrence multiplicity and H-02 reference multiplicity |
| mapping-creation event | exact one singular semantic event question per M and an already-existing raw representation containing only its coordinate, immutable mapping, semantic author/controller, and intrinsic materialization-occurrence fact |
| mapping-creation authorization question | separate relation over the exact immutable mapping, singular raw event, controller, authorized-controller coordinate, role revision, field-total scope, answer-independent historical question, separate literal H-11 qualification input, independent H-02 creation-appointment predicate, coherence predicate, and disposition from Section 7.4; separate from result proof creation |
| privacy | R8-30 through R8-36 and Section 7 |
| self-exclusions | own digest/proof/signature/carrier, creation authorization, role/key history, result currentness, mapping/currentness, safe projection/reference, opposite-side result, Connection aggregate, later commitment |

H-10 may authenticate the already named controller and completed content. It may not invent service authority, choose role occupant, decide appointment intervals, retroactively authorize proof or mapping creation, choose source cardinality class, invent/split/merge a member coordinate, turn H-13 reference count into owner-native occurrence count, flatten or double-count an aggregate family, change field participation, filter raw occurrences/conflicts, infer currentness, reinterpret H-13, or make verification authorize.

No H-10 result domain, proof purpose, key purpose, algorithm, canonical bytes, JSON field, schema, proof ID, digest label, JWK format, profile, or carrier is allocated by this proposal. `H10_S2_AUTHORIZED=NO` remains literal.

## 9.2 H-11 handoff

Future separately authorized H-11 isolation work receives the already-fixed H-02-owned `TrustIsolationHistoricalQualificationQuestionCoordinate`, obtained only by `TrustIsolationHistoricalQuestionFor` from one exact closed caller/subject branch, before any answer. Accepted H-11 defines no competing generic coordinate. The handoff includes the controller identity, role-authorization subject/revision/content, result subject, source/controller proof subject, immutable mapping value, its singular tagged creation-event question and already-existing raw mapping-creation event, exact currentness use subjects, side/context binding, Table 2-C source cardinality/member semantics, Tables 2-D1 through 2-D4 closed reference generation, literal top-level H-13 set semantics, separately retained accepted inner and H-02 reference multiplicities, the proof-creation authorization question, separate mapping-creation authorization relation, and nonauthority rules. H-11 returns only its accepted literal historical/currentness semantics and supported evidence scope as input to that one H-02 question; H-02 consumes those values through separate `TrustHistoricalQualificationInput` and never extends H-11's outcome domain.

It may realize proof-materialization intervals; role-revision currentness/history; key/proof currentness/history; mapping-event currentness/history; revocation; compromise; rollback/fork; recovery; checkpoints; and accepted historical qualification evidence. It may not:

```text
allocate or appoint the controller;
decide who semantically owns the Trust role;
infer appointment from stored key metadata;
author Organization/Workspace/Trust result content;
choose a fork/duplicate/conflict winner;
manufacture a missing occurrence, source boundary, or cut;
place result availability, returned evidence scope, literal outcome, or conflict
  disposition into historical-question/source-domain/population-key identity;
split competing H-11 results for one expected coordinate into unequal questions;
change raw occurrence cardinality based on components;
reclassify a known boundary crossing as uncertainty;
choose among failed, unavailable, indeterminate, and contradictory for the same interval facts;
change status precedence;
make historical success current;
make a later appointment retroactively authorize an old proof event;
make a later appointment retroactively authorize an old mapping event;
allocate a second semantic mapping event for the same immutable mapping from
  claim time, sequence, record identity, or a different qualification;
construct or alter a mapping event from qualification, appointment, scope,
  authorization, currentness, history, downstream Trust disposition/status,
  proof state, or consumption;
let proof currentness repair mapping creation or mapping currentness repair proof creation;
collapse absent historical evidence, present ambiguous history, and conflicting
  authoritative history into one unresolved value;
change owner-native source multiplicity from H-13 candidate/provenance reference count;
or put its own proof/history evidence inside the result it qualifies.
```

No H-11 isolation record, state machine, sequence format, history schema, checkpoint, trusted-clock mechanic, storage design, or implementation is authorized here.

# 10. Normative clean-room and hostile cases

Every case has one deterministic semantic consequence. Unless stated otherwise, all unrelated required inputs are exact, complete, current, coherent, and favorable. Independently true protected reasons are additive and are not suppressed by aggregate precedence.

## 10.1 Trust-role authorization, proof creation, and authorship

| Case | Construction | Exact consequence |
|---|---|---|
| A01 clean role occupant | one Organization-authored exact role revision names controller C; attribution is exact; H-11 says authoritative-current; C creates the result proof wholly inside its appointment; exact H-10/H-11 proof checks pass | role `occupied`; creation `authorized-at-creation`; authorship `exact-controller-authenticated`; use still requires every other gate |
| A02 no authorization relation | a valid proof exists for C but the role slot has zero authorization-revision occurrences | authorship unavailable; `role-authorization-missing` and `proof-creation-authorization-missing`; signature creates no appointment |
| A03 bare key possession | a valid single-purpose key is offered as controller/role identity | failed; `wrong-authority-coordinate` and `controller-substitution`; H-10 cannot invent H-02 source authority |
| A04 provider label as occupant | provider metadata labels service P the Trust verifier without an Organization-authored role revision | failed; `wrong-source-authority`; role remains unavailable |
| A05 wrong controller signs | current role revision names C1 but proof maps exactly to unequal C2 | failed; `controller-substitution`; no retargeting or same-provider inference |
| A06 wrong tenant controller | role coordinate is context X and revision names a controller identity scoped to unequal context Y | contradictory; `wrong-tenant-context` and `projection-incoherent` |
| A07 equal duplicate role revision | the exact current revision occurrence is repeated twice | occupancy indeterminate; `role-occupancy-ambiguous` and `equal-duplicate-occurrence` |
| A08 competing current revisions | two unequal role revisions are both represented as authoritative-current | occupancy/authorship contradictory; `conflicting-duplicate-occurrence`; no first/newest winner |
| A09 current vacant revision | exact authentic/coherent authoritative-current slot revision has `occupant=vacant` | `failed` with `role-occupancy-vacant`; no current positive occupant; underlying Organization/Workspace/IAA/Connection/H-13 state unchanged; this is distinct from unavailable role evidence |
| A10 old controller after replacement | authoritative-current revision names new identity C2; C1 offers a newly created proof | creation/current authorship failed with `role-authorization-noncurrent` and `proof-created-outside-appointment` |
| A11 governance proof before appointment | governance result body exists; C creates its proof before C's appointment; C is appointed later | original proof creation remains `failed` and unauthorized; later appointment cannot repair it |
| A12 current proof before appointment | current result body exists; C creates its proof before appointment; C is appointed later | same as A11; result class creates no exception |
| A13 historical C1 proof after replacement | C1 created a proof wholly while appointed; C2 later replaces C1 | historical validation may succeed with present-authority false; current use under C1 fails |
| A14 proof created after vacancy | C creates a new proof after the role's authoritative vacancy begins | failed at creation with `proof-created-outside-appointment`; vacancy does not erase older history |
| A15 proof interval crosses appointment edge | exact retained evidence definitively places the creation interval across the appointment boundary | `failed` with `proof-creation-known-boundary-crossing`; the appointed-throughout-entire-interval predicate is false |
| A16 valid Ed25519 proof without creation authority | mathematical verification succeeds but no favorable whole-interval appointment exists | no authorship; H-10 validity cannot repair semantic creation authority |
| A17 proof reissued after appointment | an unauthorized old proof remains; C later becomes appointed and creates a new proof over unchanged body | old proof remains unauthorized; new proof is a distinct event independently evaluated at its own interval |

## 10.2 Participant-side cardinality and Connection consumption

| Case | Construction | Exact consequence |
|---|---|---|
| S01 clean two-side evaluation | one complete H-13 evaluation has exact host and agent side keys | expected current-result subject set has cardinality exactly two, one per exact `ParticipantSide` |
| S02 host result substituted for agent | host scope/result is supplied in the agent slot | failed with `wrong-participant-side` and `wrong-side-evaluation-key`; expected agent slot remains unavailable |
| S03 agent result substituted for host | agent scope/result is supplied in the host slot | same deterministic consequence with host/agent reversed |
| S04 unequal side contexts | host context X and agent context Y are unequal | two unequal roles/namespaces; independent context-private controllers/results; cross-context carrier equality forbidden |
| S05 equal context, unequal side | both sides use X but `ParticipantSide` and side keys differ | exactly two unequal subjects; two distinct injective carriers required even in one possible namespace |
| S06 correct Connection/audience/target, wrong side | all namespace values except `ParticipantSide` match | failed with `wrong-participant-side`; routing aliases do not repair side binding |
| S07 same carrier reused across unequal contexts | one carrier is returned for host X and agent Y where X != Y | affected projections fail with `cross-context-carrier-reuse`; no alias/reallocation repair |
| S08 same carrier reused for equal-context sides | X is equal on both sides and one carrier maps to both side subjects | contradictory with `mapping-collision`; R8-33 requires separate carriers |
| S09 host verified-current, agent unavailable | exact host member is fully favorable; agent member is missing or unavailable | Connection Trust disposition is `unavailable` and nonauthorizing; host cannot substitute |
| S10 host verified-current, agent failed | agent has any required failed predicate | Connection Trust disposition is `failed` and nonauthorizing; both side reasons retained |
| S11 host verified-current, agent indeterminate | agent evidence is indeterminate and no higher condition exists | Connection Trust disposition is `indeterminate` and nonauthorizing |
| S12 host verified-current, agent contradictory | agent or its slot is contradictory | Connection Trust disposition is `contradictory` and nonauthorizing |
| S13 unequal ConnectionEvaluationKey | both bodies claim verified-current but carry unequal Connection keys | cross-side disposition is `contradictory` and nonauthorizing; no side wins |
| S14 altered H-13 evaluation | both bodies claim verified-current but one carries an unequal/edited complete H-13 evaluation | cross-side contradictory; Trust cannot repair or select an evaluation |
| S15 coherent sides, H-13 nonauthorizing | both members are otherwise fully favorable and exact-coherent, but the one carried H-13 decision is not `pass` | Connection Trust disposition is `favorable`; exact H-13 nonauthorizing decision/reasons remain retained under H-13; final authority is absent |
| S16 coherent sides, H-13 pass | both members are fully favorable/coherent and H-13 is literally `pass` | Connection Trust disposition is `favorable` independently of peer gates; final authority still requires every other applicable accepted gate |
| S17 host member offered twice, agent absent | two equal host occurrences are supplied and no agent occurrence exists | duplicate host does not fill agent; agent missing retained; aggregate unavailable absent higher failure/contradiction, plus duplicate reason |
| S18 same-context consumption | both contexts equal, both exact side members exist, carriers are distinct and injective | eligible for normal aggregate checks; still exactly two subjects/members |
| S19 unequal-context consumption | contexts differ and both exact members exist | both context-private role/controller/mapping/privacy checks apply independently |
| S20 injected third subject | the two expected members exist and another well-formed subject is offered | failed exact cardinality with `connection-side-subject-injected`; contradictory too if it conflicts |

## 10.3 Raw occurrence, population, and cut cases

| Case | Construction | Exact consequence |
|---|---|---|
| E01 one resolved source value | exact owner/source key resolves once | one raw occurrence; predicate evaluated normally |
| E02 required source missing | no semantic value resolves at the required raw key | zero raw occurrences; consuming component/result unavailable with `required-component-missing` |
| E03 malformed H-10 bytes | raw proof input has an accepted H-10 malformed-input failure | no H-02 raw semantic-content occurrence; later component carries exact H-10 failure observation; bytes remain outside body |
| E04 invented unavailable placeholder | implementation inserts generic `unavailable` where owner defines none and offers it as the required value | `failed`; the injected placeholder is invalid and satisfies no required slot; retain `invented-unavailable-placeholder`, `unsupported-required-semantics`, and the independently true missing-source reason |
| E05 accepted explicit unavailable | an accepted owner type defines and supplies its exact unavailable value once | one exact owner-typed raw occurrence; consuming outcome unavailable; no generic coercion |
| E06 equal duplicate exact-once source | the same raw occurrence value occurs twice at one raw key | raw multiplicity two; indeterminate with `equal-duplicate-occurrence` |
| E07 unequal duplicate exact-once source | unequal values occur at one raw key | contradictory with `conflicting-duplicate-occurrence` |
| E08 malformed value silently dropped | implementation drops malformed H-10 input and reports the affected component satisfied | `contradictory`: the supplied satisfied result conflicts with the exact H-10 failure and required population/component derivation; retain the H-10 failure and incomplete-population reasons |
| E09 one raw occurrence feeds three components | one exact occurrence is referenced by content equality, proof profile, and key history components | raw multiplicity remains one; three references create no raw copies |
| E10 equal source duplicate with many components | the source supplies two equal occurrences and four components inspect the key | raw multiplicity remains two, not eight; indeterminate exact-once source consequence unchanged |
| E11 verifier component removed | one component kind is removed from a hypothetical required set while source domain is unchanged | raw key/family/cardinality unchanged; component-set validity is a separate question |
| E12 verifier component added | a new predicate references an existing raw key | source population and raw multiplicity unchanged; no new source occurrence |
| E13 component failure | a substantive predicate fails for an existing raw occurrence | failure/reason retained; the raw occurrence remains in the complete family |
| E14 component/source recursion | a raw occurrence key contains a component coordinate that refers back to that occurrence | `failed` with `component-source-recursion`; structurally established forbidden cycle; nonconsumable |
| E15 connection-use governance population | result names exact side S and Stage-A candidate A | raw family is exactly the matching H-13 source-input/attribution/qualification families; component inventory cannot alter it |
| E16 candidate-selected source extent | target, provider, successful proof, component, or status removes a wrong/stale/conflicting occurrence | population nonexact; `source-stream-unclosed` and `component-population-incomplete`; no verified status |
| E17 mapping collision stream omitted | expected relation exists but a same-namespace equal-carrier mapping to another subject is omitted | mapping population incomplete; collision/source-stream reasons; no consumable mapping result |
| E18 tenant observation uses local timestamp | implementation supplies a clock, row version, sequence, checkpoint, or current pointer as a semantic cut | branch remains unavailable with exact unavailable-cut and unsupported-semantics reasons |
| E19 H-11 historical result indeterminate | one exact required H-11 qualification/result occurrence is available and its literal owner outcome is `historically_indeterminate` | the H-11 token remains literal; Trust consumption is `indeterminate`; H-02 does not inspect or relabel its low-level cause |
| E20 H-11 historical result missing | the exact required H-11 qualification/result occurrence family is absent or unobtainable | `TrustHistoricalQualificationInput.qualificationAvailability=unavailable`; Trust consumption is unavailable; H-02 invents no H-11 result or interval object |
| E21 H-11 historical result occurrences conflict | retained occurrences at the exact required H-11 semantic coordinate contain unequal H-11-owned result values | Trust population is `contradictory` with `conflicting-duplicate-occurrence`; every H-11 value remains unchanged and no new H-11 outcome token is minted |
| E22 H-11 historical favorable result available | exactly one supported H-11 result occurrence is `historically_verified` or `historically_verified_with_current_revocation` and the separately required H-02 appointment predicate is satisfied | substantive historical Trust verification may proceed; present authority remains false and H-02 manufactures no interval or currentness conclusion |

### 10.3.1 Revision 8 literal H-11 outcome-consumption cases

| Case | Exact H-11-owned input fact | Exact Trust-local consequence |
|---|---|---|
| H11H01 | required H-11 historical result occurrence itself is absent or unobtainable | Trust-local wrapper and consumption are `unavailable`; no H-11 token or interval object is fabricated |
| H11H02 | H-11 returns literal `historically_indeterminate` because its trusted bound is incomplete | retain that token and cause ownership; Trust historical qualification is `indeterminate`, never unavailable |
| H11H03 | H-11 returns literal `historically_indeterminate` because its accepted sources disagree | retain that token; Trust is `indeterminate`, not H-02-relabelled as an H-11 contradiction |
| H11H04 | H-11 returns literal `historically_unsupported` while the historical interval is otherwise fully resolved | retain that token; Trust is `indeterminate` with protected `h11-history(historically_unsupported)`, never `unsupported-required-semantics`, invalid, or unavailable; optional safe `unsupported-profile-or-history` requires disclosure permission |
| H11H05 | H-11 returns literal `historically_unsupported` and a separately required Trust transport/source is unavailable | retain both independent facts/reasons; primary Trust status is `unavailable` by Section 4.1 precedence over indeterminate, protected `h11-history(historically_unsupported)` remains retained, and optional safe `unsupported-profile-or-history` still requires disclosure permission |
| H11H06 | two incompatible retained H-11 result occurrences occupy one exact semantic coordinate | Trust population is `contradictory` with `conflicting-duplicate-occurrence`; each H-11 value remains unmodified and neither wins |
| H11H07 | one favorable H-11 result supplies a resolved historical interval definitively outside the exact controller appointment | the independent H-02 appointment predicate is `failed`; the favorable H-11 result remains unchanged |
| H11H08 | one favorable H-11 result supplies a resolved interval definitively crossing appointment, vacancy, removal, or replacement | the independent H-02 appointment predicate is `failed`; no unavailable or indeterminate relabel and no upstream mutation |
| H11H09 | H-11 returns literal `historically_invalid` | retain that token; Trust is `failed` and no unsupported category is created |
| H11H10 | H-11 returns literal `historically_verified` | retain that token; historical Trust qualification may be satisfied when the separate H-02 appointment and every other predicate satisfy; present authority remains false |
| H11H11 | H-11 returns literal `historically_verified_with_current_revocation` | retain that token; historical Trust qualification may be satisfied, current revocation remains literal, and present authority is false |

### 10.3.2 Revision 10 closed historical-subject and answer-independent question cases

| Case | Construction | Exact consequence |
|---|---|---|
| HQ01 same caller/subject/question, result missing | the exact caller branch maps through `TrustIsolationHistoricalSubjectOf` and the H-02-owned fixed-purpose coordinate before the required result occurrence is found absent | question, population boundary, logical source domain, and raw grouping are unchanged; separate input and later consumption are `unavailable` |
| HQ02 same question, verified | H-11 supplies one literal `historically_verified` occurrence at the expected coordinate | the same question remains; input is favorable and post-question population resolution may use its supported evidence scope |
| HQ03 same question, invalid | H-11 supplies one literal `historically_invalid` occurrence | the same question remains; Trust consumption is `failed`; no source rekeying |
| HQ04 same question, unsupported | H-11 supplies one literal `historically_unsupported` occurrence | the same question remains; Trust is `indeterminate` with exact protected `h11-history(historically_unsupported)`; optional safe `unsupported-profile-or-history` still requires disclosure permission |
| HQ05 verified plus invalid at one result coordinate | two incompatible retained H-11 result occurrences answer the same question | Trust is `contradictory`; both occurrences remain; no question splitting or result winner |
| HQ06 availability embedded in question | implementation places `qualificationAvailability` or the whole `TrustHistoricalQualificationInput` in question equality | `failed` under FBE22 with `{historical-answer-to-question-identity-feedback}`; no conforming historical question/source domain is supplied |
| HQ07 returned evidence scope embedded in question | implementation places the H-11-returned supported evidence scope in question, boundary, or source-key identity | `failed` under FBE22 with `{historical-answer-to-question-identity-feedback}`; the scope may be used only in post-question population resolution |
| HQ08 outcome rekeys historical source | changing only the H-11 result changes owner-native historical source key, logical domain, boundary, or raw grouping | `failed` under FBE22 with `{historical-answer-to-question-identity-feedback}`; existing source identity remains fixed |
| HQ09 every caller branch | each of the seven `TrustIsolationHistoricalCaller` branches is supplied once with well-formed carried values | each maps to exactly its same-position closed subject tag and one H-02-owned question; no branch/default selection exists |
| HQ10 two clean-room implementations | two implementations receive structurally equal immutable caller values | `TrustIsolationHistoricalSubjectOf` and `TrustIsolationHistoricalQuestionFor` produce structurally equal subjects/questions |
| HQ11 proof retyped as mapping creation | a `result-proof-materialization-caller(P)` is represented under `presentation-mapping-creation-history(...)` | tag/subject mismatch; `failed` with `unsupported-required-semantics`; no question is allocated under either wrong branch |
| HQ12 governance retyped as role revision | a `governance-evidence-caller(S,T)` is represented under `role-authorization-revision-history(...)` | tag/subject mismatch; `failed` with `unsupported-required-semantics`; owner meanings remain distinct |
| HQ13 invented H-11 coordinate | implementation adds a generic H-11 coordinate absent from accepted H-11 and outside `TrustIsolationHistoricalQualificationQuestionCoordinate` | `failed` with `unsupported-required-semantics`; the invented value is not question identity and creates no result slot |
| HQ14 answer changes, question equal | only the returned H-11 outcome changes across missing/favorable/adverse/unsupported/conflicting inputs for one exact caller | H-02-owned question coordinate remains exactly equal; inputs remain competing answers to that one question |

## 10.4 R8-35 safe-projection cases

| Case | Construction | Exact consequence |
|---|---|---|
| P01 exact five-category projection | context, safe status, permitted safe reason category, context-safe presentation reference, and optional safe evidence reference only | structurally eligible H-02 maximal projection, subject to H-12 further redaction |
| P02 separate underlying disposition | projection adds `safe underlying disposition` as a sixth member | invalid projection; extra-category and unsafe-disclosure reasons; no tenant-visible result |
| P03 authorityEffect member | projection adds `authorityEffect=evidence-only-nonauthorizing` | invalid extra category; semantic nonauthority remains true without a carrier |
| P04 H-13 nonauthorizing disclosed safely | H-12 permits a coarse disclosure | carried only as safe reason `underlying-isolation-nonauthorizing`; no extra status/disposition member |
| P05 H-13 pass exposed | projection adds `underlying-isolation-pass` | invalid extra/nonpermitted disclosure; protected enforcer uses exact H-13 value instead |
| P06 H-12 collapses detail | public layer withholds or collapses an allowed reason category | permitted only if status/failure is not converted to success and no protected detail leaks |
| P07 provider-global value nested in safe reference | nested commitment/reference repeats across unequal contexts | projection fails with cross-context reuse/unsafe disclosure; nesting is no exception |

## 10.5 Retained Revision 1/Revision 2 authority, substitution, privacy, and cycle cases

| Case | Construction | Exact consequence |
|---|---|---|
| T01 Trust result as Organization permission | either Trust result is placed in permission slot | type substitution; failed; no permission |
| T02 Trust result as Workspace permission | result is placed in Workspace state/overlay or positive narrowing | failed; no Workspace authority |
| T03 Trust result as IAA measurement truth | Trust status replaces measured conclusion/fact | failed; measured fact remains missing |
| T04 Trust result as Connection authority | favorable Trust status/gate is treated as active Connection/Invocation authority | forbidden nonauthority use; failed; H-07 remains required |
| T05 governance result for current class | tenant result supplied at side-specific Connection slot | wrong class/namespace; failed; expected current result unavailable |
| T06 current result for governance class | Connection result supplied at tenant governance slot | wrong class/namespace; failed; expected governance result unavailable |
| T07 replay to second Connection | current result for C1 is offered to unequal C2 | failed, `wrong-connection`; no rebinding |
| T08 wrong context | namespace/role/subject context projections conflict | contradictory, wrong-context/projection reasons |
| T09 wrong audience | namespace audience differs from H-07 | failed, `wrong-audience` |
| T10 wrong target | namespace target differs from H-07 | failed, `wrong-target` |
| T11 wrong governance subject | authentic content belongs to another stable subject | failed; correct evidence remains missing |
| T12 wrong H-13 context | key/cut/release/profile/Connection differs | contradictory if authoritative projections conflict, otherwise failed |
| T13 valid proof, revoked key | cryptography passes and H-11 says revoked | currentness failed; proof validity retained and nonauthorizing |
| T14 valid proof, literal H-11 history indeterminate | crypto passes but the exact H-11 result is `historically_indeterminate` | aggregate indeterminate; never current or historically verified; upstream token unchanged |
| T15 conflicting underlying evidence | unequal in-scope source/content values | contradictory; both retained; no winner |
| T16 provider-global Trust identity leakage | safe projection exposes a provider-global root/service/controller | `failed` with unsafe disclosure; projection is invalid |
| T17 cross-tenant key/thumbprint reuse | same tenant-visible key/thumbprint in unequal contexts | failed with cross-context reuse; no R8-36 inference |
| T18 cross-tenant result/reference reuse | same stable result/reference carrier in unequal contexts | privacy failure; both uses nonconsumable |
| T19 raw protected detail | projection exposes detector/source/provenance/history data | failed with unsafe disclosure |
| T20 carrier recycling | historical carrier reassigned to another subject | failed; reservation remains |
| T21 underlying contradiction suppressed | result reports favorable while H-13/governance population contradicts | result contradictory through retention/population failure |
| T22 duplicate component result | two equal results at one exact-once component coordinate | component family indeterminate; raw family unchanged |
| T23 injected component | well-formed component outside closed required set | failed with `unexpected-component`; contradictory too if conflicting; raw family unchanged |
| T24 valid proof, H-13 nonauthorizing | Trust checks pass; both exact side results are fully favorable/current/authentic/mapped/private/coherent; both retain the same complete H-13 evaluation; H-13 is nonauthorizing | protected side statuses are `verified-current`; `connectionTrustDisposition=favorable`; H-13 remains independently nonauthorizing; final authority is absent because the external enforcer separately requires H-13 `pass` |
| T25 H-13 pass, Trust history unavailable | H-13 passes but Trust proof/key/currentness is absent | Trust unavailable; H-13 cannot cure it |
| T26 result verifies own proof/currentness/mapping | a well-formed candidate result body inserts its own downstream proof/currentness/mapping outcome as a prerequisite | `failed` with `self-dependency`; structurally established forbidden cycle; no consumable result |
| T27 first/newest/preferred source | duplicates/conflicts collapsed by policy | population failure; equal duplicates indeterminate, unequal contradictory |
| T28 current reconstruction of history | immutable target rebuilt with current values/defaults | mismatch or unsupported history; never verified |
| T29 upstream exception guessed | carrier equality allowed because provider/root/runtime matches | privacy failure; only exact accepted R8-36 rule could allow it |
| T30 valid future commitment as authority | cryptographic commitment replaces H-07/H-13/policy | cryptographic fact retained; failed nonauthority use |
| T31 Trust result creates policy ALLOW | result/gate is offered as positive policy decision | authority substitution; failed; no ALLOW |
| T32 Trust result creates permission on absence | no Organization/Workspace permission exists but Trust is favorable | permission remains absent; Trust cannot fill it |
| T33 Trust controller authors measurement | authorized controller asserts a runtime fact directly | failed, wrong source authority; IAA/direct owner remains required |

For all cases, structurally equal complete source populations produce equal raw occurrence families, subjects, component dispositions, full reason sets, statuses, two-side evidence sets, Connection Trust dispositions, safe categories, mappings, and nonauthority consequences independent of discovery order or component count.

## 10.6 Revision 3 source-native-key and Trust/enforcer separation cases

| Case | Construction | Exact consequence |
|---|---|---|
| R3K01 redundant enclosing context | one Organization-authored registration occurrence is represented through each of two H-13 applicability candidates, while `H02ApplicabilityCandidateCoordinate` is not part of the R8-10 owner-native content coordinate | owner-native multiplicity remains exactly one at `organization-registration-content(OrganizationIAARegistrationRevisionIdentity)`; the two unequal candidate coordinates produce two independently retained `H13SourceProjectionReference` records; neither reference allocates or consumes a source occurrence |
| R3K02 extra useful coordinate | an implementation adds Connection, side, component, provider, record location, or another useful-looking value to a Table 2-A native coordinate | invalid key with `source-native-coordinate-extra`; it creates no raw slot and cannot change grouping or multiplicity |
| R3K03 omitted native member | an implementation omits one component of `ObservationOccurrenceCoordinate`, `BindingBootstrapSourceCoordinate`, `HistoricalCurrentnessSubject`, `SemanticRecordCoordinate`, or another exact Table 2-A coordinate | unkeyable with `source-native-coordinate-missing`; no default, inference, enclosing value, proof/key identity, or content hash repairs it |
| R3K04 unequal coordinates, equal content | two unequal `DirectSemanticPropositionCoordinate`/Producer source slots or two unequal accepted revision identities carry semantically equal content | they remain two raw source slots; content equality does not merge accepted native coordinates |
| R3K05 one coordinate, unequal values | two unequal successfully resolved values occur at one exact-once native source key | raw population is contradictory with `conflicting-duplicate-occurrence`; an added enclosing coordinate cannot conceal the conflict by splitting the key |
| R3K06 component and proof invariance | component count changes and an H-10 proof/key/currentness outcome changes after the complete raw population is fixed | raw native keys and multiplicity do not change; components and proof/key/currentness are downstream consumers/outcomes |
| R3G01 favorable Trust, H-13 nonauthorizing | both exact side Trust members are completely verified/current/authentic/mapped/private and coherent; the shared H-13 decision is `non-authorizing` | `connectionTrustDisposition=favorable`; final authority absent because the external enforcer independently requires H-13 `pass` |
| R3G02 favorable Trust, policy denies | Trust evidence remains fully favorable; independently owned policy denies | Trust aggregate remains byte/semantically unchanged and `favorable`; enclosing authority is denied |
| R3G03 favorable Trust, Approval missing | Trust evidence remains fully favorable; required Approval is absent | Trust aggregate remains `favorable`; action authority is absent |
| R3G04 policy feeds Trust | a policy implementation supplies its outcome as a Trust aggregate field, predicate, reason determinant, or favorability input | forbidden `forbidden-peer-gate-dependency`; no valid accepted Trust aggregate or Trust-result mutation exists |
| R3G05 future gate addition | another accepted decision adds a new independently owned authority gate | H-02-S2 Trust aggregate fields, bytes, semantic equality, and favorability do not change; only the enclosing enforcer's independently owned intersection changes |
| R3G06 shared H-13 mismatch | both Trust side members are otherwise favorable but carry unequal complete H-13 evaluations or unequal decisions | Trust aggregate is `contradictory` for cross-side shared-projection incoherence; neither side wins and Trust does not rerun H-13 |
| R3G07 one side unavailable | H-13 is `pass`; one exact Trust side member is unavailable or missing | Trust aggregate is `unavailable` absent a higher Trust failure/contradiction; H-13 cannot repair the missing side |
| R3G08 one side failed | H-13 is `pass`; one exact Trust side member has a required failed Trust predicate | Trust aggregate is `failed`; H-13 cannot repair Trust evidence |

## 10.7 Revision 6 source-cardinality and lifecycle-member cases

| Case | Construction | Exact consequence |
|---|---|---|
| K07 unequal lifecycle positions | two valid `BindingLifecycleObservation` values have the same owner slot/source but unequal semantic event positions | two distinct `BindingLifecycleObservationNativeCoordinate` members; both retained; not duplicates |
| K08 accepted concurrency | two valid concurrent lifecycle observations share owner slot/source but affect unequal exact semantic subject/object/relation sets | two distinct members retained with accepted H-13 explicit concurrency; neither collapses or wins |
| K09 unequal content at one event coordinate | two representations have the same event-native coordinate but unequal before/after semantic content | `contradictory` with `conflicting-duplicate-occurrence`; before/after content cannot split the key |
| K10 equal content at one event coordinate | the same exact event-native coordinate and complete semantic value are represented twice | raw member multiplicity two; `indeterminate` with `equal-duplicate-occurrence` |
| K11 aggregate contains two observations | one exact `BindingLifecycleCoverageStatement` record contains two valid raw observations | outer aggregate record occurs once; its complete inner occurrence family remains cardinality two; no aggregate-key collapse |
| K12 two lifecycle direct attributions | one source/owner pair attributes two valid observations having unequal event-native coordinates | two distinct `BindingLifecycleAttributedSubjectCoordinate` members; no attribution recursion or collision |
| K13 representation identity splitter | database row ID, proof ID, digest, arrival order, provider, signature, or storage identity is added to split one member | invalid coordinate with `source-native-coordinate-extra`; creates no source slot or member |
| K14 aggregate flattened and also consumed | implementation consumes one coverage record and also treats its flattened inner family as copies under the aggregate record coordinate | `failed` with `aggregate-family-double-counting` and incomplete/nonexact population; no verified result |
| K15 caller chooses atomic versus aggregate | two implementations model the same source family differently despite Table 2-C | the implementation whose class differs from Table 2-C is nonconforming and `failed` with `source-cardinality-class-mismatch`; caller choice is impossible |
| K16 activation birth | accepted raw family states that activation A and Producer incarnation P are born at position X | exactly one `activation(... birth(A,P), X)` member; no generic assertion-kind selection |
| K17 activation restart | accepted raw family uniquely relates old activation/incarnation A1/P1 to new A2/P2 at X | exactly one `activation(... restart(A1,A2,P1,P2), X)` member; old/new projections cannot be omitted or reordered |
| K18 activation end | accepted raw family ends A/P at interval/position X | exactly one `activation(... end(A,P), X)` member; unequal A/P content at the same coordinate is contradictory |
| K19 observation mechanism replacement | accepted unique order relates old observation mechanism O1 to O2 for exact continuing capability-coordinate set S | exactly one `observation-mechanism(... replacement(O1,O2,S), X)` member |
| K20 concurrent mechanisms without replacement relation | O1 and O2 are concurrent and no unique accepted old-to-new replacement relation exists | no invented replacement member; preserve the accepted H-13 indeterminate/concurrent evidence and both raw events |
| K21 report mechanism birth/end/replacement | accepted raw report-mechanism event supplies one closed change tag and exact affected subjects | exactly one matching `report-mechanism` branch; another branch is `intrinsic-lifecycle-branch-mismatch` |
| K22 capability binding add/remove/change | accepted raw event supplies exact binding, or capability coordinate plus before/after bindings for change | exactly one matching `capability-binding` branch; before/after inequality at one equal coordinate is contradictory, not a key split |
| K23 attribution wrapper over raw member | one raw member occurs once and its exact direct-attribution wrapper occurs once | raw member multiplicity one; wrapper multiplicity one separately; wrapper authenticates but does not copy the raw event |
| K24 duplicate attribution wrapper | one raw member occurs once and the same wrapper is supplied twice | raw member multiplicity remains one; wrapper family multiplicity two and indeterminate with `equal-duplicate-occurrence` |
| K25 wrapper/raw double count | implementation counts a raw lifecycle member again because its direct-attribution wrapper exists | failed with `intrinsic-lifecycle-double-counting`; the wrapper is separately auditable and nonrecursive |

## 10.8 Revision 12 H-13-S3 classifier, reference, and multiplicity cases

| Case | Construction | Exact consequence |
|---|---|---|
| PREF01 one source occurrence, two candidates | one Organization-authored registration occurrence is referenced by two unequal H-13 applicability candidates | owner-native source multiplicity one; two `H13SourceProjectionReference` records retained at their unequal candidate coordinates |
| PREF02 one source occurrence, ten provenance nodes | ten accepted provenance-node records reference the same owner-native occurrence | owner-native source multiplicity unchanged; all ten H-13 reference/record occurrences remain separately auditable |
| PREF03 two actual equal owner occurrences | the Organization source family itself supplies two equal occurrences at the exact slot and each is referenced once | owner-native multiplicity two; equal-duplicate rule applies independently of the two reference records |
| PREF04 two actual unequal owner occurrences | owner-native family supplies two unequal occurrences at one exact-once slot | source family contradictory regardless of zero, one, or many H-13 references; no reference wins |
| PREF05 wrong projection coordinate | one H-13 projection points to a wrong owner-native coordinate or unequal source value | projection `failed` with `projection-reference-mismatch`; no second source occurrence is manufactured |
| PREF06 expected projection omitted | one required H-13 projection/reference record is absent while the owner-native occurrence remains established | H-13 provenance/population incomplete and reference unavailable with `projection-reference-missing`; owner-native multiplicity itself does not change |
| PREF07 candidate plus provenance representation | the same owner occurrence appears through a Stage-A candidate and an accepted provenance record | one owner-native source occurrence plus two distinct H-13 records/references at their accepted container coordinates |
| REFGEN01 Stage-A candidate plus direct-source provenance node | one owner-native Stage-A source occurs once and is directly represented by one candidate and its direct-source provenance node | exactly two references for those two named containers at unequal coordinates; any enclosing Stage-A population adds only its separately prescribed Table 2-D3 reference; source multiplicity remains one |
| REFGEN02 source only transitive to aggregate | aggregate node A reaches source node S only through one or more `RequiredDependencies` edges and A's own represented value contains no direct source | A generates zero source references; S generates only its own direct reference |
| REFGEN03 direct record carries two raw occurrences | one accepted semantic record's declared direct represented value contains an occurrence family with exactly two raw source occurrences | exactly two reference occurrences with their complete inner multiplicity; no set collapse |
| REFGEN04 aggregate inner family plus source-bearing child dependency | aggregate directly carries inner source family F and also declares a dependency on child source node S representing those sources | aggregate generates exactly its closed Table 2-D2 or 2-D3 direct F references; the dependency edge generates none; S separately generates its direct-node references, so no implementation-selected double projection exists |
| REFGEN05 same source in two unequal containers | one owner-native source occurrence is directly repeated by two unequal accepted containers | exactly two references at unequal container/slot coordinates; owner-native multiplicity remains one |
| REFGEN06 owner-native-only source | a source value exists in its owner-native family but accepted H-13 grammar requires no container in this evaluation to represent/reference it | zero H-13 references are invented; the owner-native occurrence remains retained under its own complete source boundary |
| REFGEN07 required closed-container reference omitted | Tables 2-D1 through 2-D4 generate one direct reference but the retained projection family contains zero | projection/reference population is `unavailable`/incomplete with `projection-reference-missing`; source multiplicity remains unchanged |
| REFGEN08 extra nonrequired reference injected | retained family includes a path that Tables 2-D1 through 2-D4 do not generate | `failed` with `projection-reference-unexpected`; injected reference allocates no source occurrence |
| REFGEN09 identical complete derivation populations | two clean-room implementations receive identical complete accepted `DerivationPopulation` and identical accepted container population | they produce exactly equal reference occurrence families; the derivation-record row itself generates the exact empty family and cannot trigger recursive traversal |
| REFGEN10 literal top-level source | one H-02 applicability candidate directly carries its authoritative source at A | exactly the Table 2-D1 `h02-applicability-candidate-direct-content(A)` reference; no representation field name participates |
| REFGEN11 multiplicity-bearing inner family | one source-bearing node directly carries three raw lifecycle occurrences at three exact `ProducerIntrinsicLifecycleMemberCoordinate` values | exactly three unequal node path coordinates with preserved occurrence multiplicity; no set collapse |
| REFGEN12 aggregate boundary | one direct `BindingLifecycleCoverageStatement` carries a two-member raw observation family | exactly one aggregate-statement reference from that path; zero recursive observation references from its inner family |
| REFGEN13 nested separate container | a Stage-B record contains its required nested `StageAResolvedPopulation` but no separately direct Stage-B source member | the nested Stage-A value emits zero in the Stage-B container; its own Stage-A record is evaluated independently |
| REFGEN14 dependency-only reachability | derived node D depends on direct-source node S but D's own Table 2-D2 row is exact empty | D emits zero; the dependency and reachability generate zero; S emits only its own direct path |
| REFGEN15 provenance direct source | an `authoritative-h02-input` node directly represents one source content occurrence and its distinct owner attribution | exactly the two prescribed closed node paths; no free-form represented-value path exists |
| REFGEN16 provenance derived-only | a `semantic-reason-set` node represents a complete reason set and depends transitively on sources | exact empty reference family for the node |
| REFGEN17 accepted Stage-B raw member | exact `raw-input-family(raw-node-family(qualified-time-input(scope,position)),F)` with one occurrence | `DIRECT`; exactly one raw-family-member path from constructor/subtype only; rule/pass and caller tags are irrelevant |
| REFGEN18 accepted Stage-B question wrapper | exact `semantic-question(N)` whose dependencies reach a direct source | question-wrapper exact empty; no dependency is traversed and the source's own member/path remains separate |
| REFGEN19 unknown Stage-B member | implementation invents `U`, a closest constructor, or a future-member branch not supplied by accepted H-13 | `failed` with protected `unsupported-required-semantics`; no fallback tag or caller classification is invented |
| REFGEN20 four-container fanout including Stage B | one owner-native source occurs once and is directly repeated in a candidate, its direct-source provenance node, the Stage-A population, and one accepted Stage-B raw-family member | exactly four references at their exact unequal paths; owner-native multiplicity remains one |
| REFGEN21 equal content at unequal paths | byte/semantic-equal source content appears at two unequal closed direct path coordinates | two distinct references remain; content equality does not collapse path equality or source-coordinate rules |
| REFGEN22 equal duplicate reference | the same complete reference occurs twice at one exact container/path/owner coordinate | reference multiplicity two; `indeterminate` with `equal-duplicate-occurrence`; no first/reference-wins rule |
| REFGEN23 conflicting reference | two unequal reference contents occur at one exact container/path/owner coordinate | `contradictory` with `projection-reference-contradictory` and `conflicting-duplicate-occurrence`; neither wins |

Revision 12 retains the prior SB identifiers with their repaired accepted-native results:

| Case | Construction | Exact consequence |
|---|---|---|
| SB01 accepted raw-family member | exact `raw-input-family(D,F)` | cardinality zero yields the neutral raw-family exact-empty result; positive cardinality yields references whose coordinate/role/class come from the single typed D/x dispatch; no English category participates |
| SB02 question-wrapper member | exact `semantic-question(f-predicate(...))` | exact question-wrapper empty from the accepted outer constructor; the answer is not a member |
| SB03 nested Stage-A container | exact `stage-a-resolved-population(C,A)` | nested-container exact empty; outer Stage-B does not flatten A; A's separately accepted Stage-A record remains independently classified by Table 2-D3 |
| SB04 dependency or inventory value | `RequiredDependencies`, an edge, `RequiredRecordSet`, or `RequiredDerivationInventory` is offered as a source path | exactly zero dependency traversal; no direct reference is generated through that value |
| SB05 implementations disagree direct versus empty | two implementations receive one equal accepted constructor/value but produce unequal classifications | at least one is nonconforming; Table 2-D4 supplies exactly one result |
| SB06 caller supplies output tag | caller supplies `stage-b-direct(...)` as classification authority | owning component is `failed` with `unsupported-required-semantics`; the output-only token creates no reference |
| SB07 malformed or future member | implementation invents an unaccepted `U` branch or closest-match constructor | `failed` with `unsupported-required-semantics`; no heuristic, reflection, or caller class |
| SB08 inner multiplicity-bearing family | one accepted `raw-input-family(D,F)` carries N occurrences | top-level set membership remains one; F retains N; Table 2-D4 emits N references without claiming N top-level members |
| SB09 dependency points to source | a set member's accepted dependency reaches a closed direct-source node | dependency traversal emits zero and cannot promote the member; the direct node's own Table 2-D2 path is separate |
| SB10 identical complete populations | two implementations receive equal accepted `H13EvaluationPopulation` values | equal top-level sets, equal carried inner families, equal lifecycle resolutions, equal classifications, and equal Table 2-D4 reference families |

The accepted-set and multiplicity cases are separately normative:

| Case | Construction | Exact consequence |
|---|---|---|
| SM01 fixed-point rediscovery | one equal Stage-B set member is discovered on two expansion passes | one accepted top-level set member; no source or reference duplicate is invented |
| SM02 one member, inner multiplicity three | one accepted `raw-input-family(D,F)` carries an accepted inner occurrence family of multiplicity three | one top-level member, three inner occurrences, and three Table 2-D4 reference occurrences; none changes another level |
| SM03 equal raw owner occurrences | one accepted multiplicity-bearing inner family carries two equal raw owner occurrences | owner family retains count two while the enclosing top-level set has one member/value |
| SM04 discovery converted to multiplicity | implementation turns two fixed-point discoveries of one equal value into two raw source occurrences | `failed`/nonconforming with `source-cardinality-class-mismatch`; no invented multiplicity survives |
| SM05 inner family set-deduplicated | implementation reduces two equal accepted raw occurrences inside one multiplicity-bearing family to one | `failed`/nonconforming with `source-cardinality-class-mismatch`; accepted inner count two remains |
| SM06 equal complete populations | two `H13EvaluationPopulation` values are equal | equal top-level member sets, equal separately carried accepted inner occurrence families, and equal Tables 2-D1 through 2-D4 H-02 reference families |

### 10.8.1 All ten accepted outer constructors

| Case | Exact accepted input | Exact classifier/reference result | Boundary and multiplicity consequence |
|---|---|---|---|
| S3M01 | `connection-evaluation-key(C)` | structural exact empty | stop at C; no source inferred |
| S3M02 | `side-evaluation-key(S)` | structural exact empty | stop at S; no side-output traversal |
| S3M03 | `stage-a-resolved-population(C,A)` | nested-container exact empty | A remains one member; separate Table 2-D3 Stage-A processing remains usable |
| S3M04 | exact `selected-catalogue(C,release,profile,matrix)` | structural exact empty | no representation/configuration/resource inspection |
| S3M05a | `pre-freeze-literal-input(stage-b-applicable-input(row,projection))` | structural exact empty | applicability projection is not recounted as an owner source |
| S3M05b | `pre-freeze-literal-input(authoritative-h07-input(row,input))` | direct; exactly one authoritative-H-07 literal reference | source and reference multiplicities remain separately exactly once |
| S3M06a | `raw-input-family(D,F)` with inner multiplicity zero | `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` | one top-level set member; zero inner occurrences and zero H-02 references |
| S3M06b | `raw-input-family(D,F)` with inner multiplicity N greater than zero | direct; exactly N typed-dispatch raw-family-member reference occurrences | one top-level set member; F retains N; H-02 retains N references independently |
| S3M07a | `q-scoped-producer-lifecycle-reference(R)` with unique exact owner O | direct; exactly one lifecycle-owner reference | R carries no payload and does not increment O's family |
| S3M07b | same constructor with zero/duplicate/multiple owner matches | retained failure exact empty with the exact lifecycle failure-table disposition/reasons | C, R, node, and all match evidence retained; no owner guessed |
| S3M08 | `pre-freeze-placeholder(D,V)` with exact accepted D/V | direct; exactly one accepted-placeholder reference; V remains adverse evidence | one semantic placeholder value; no generic null/error branch |
| S3M09 | `semantic-question(N)` | question-wrapper exact empty | dependencies, provenance, and answer are not traversed |
| S3M10 | `required-dependencies-question(N)` | question-wrapper exact empty | `RequiredDependencies` is not traversed |

### 10.8.2 Every raw-family and raw-node subtype

| Case | Exact D branch | Exact result |
|---|---|---|
| RF11 | `raw-node-family(historical-currentness-qualification-input(subject,cut))` | one direct reference per F occurrence at the exact D/member coordinate |
| RF12 | `raw-node-family(iaa-runtime-correspondence-input(Q))` | same exact per-occurrence rule |
| RF13 | `raw-node-family(iaa-local-separation-input(L))` | same exact per-occurrence rule |
| RF14 | `raw-node-family(q-producer-candidate-occurrence-input(Q,non-lifecycle-use,C))` | same exact per-occurrence rule; lifecycle use rejected as wrong alias |
| RF15 | `raw-node-family(producer-lifecycle-owner-native-input(enrollment(...)))` | same exact per-occurrence rule |
| RF16 | `raw-node-family(producer-lifecycle-owner-native-input(producer-class(...)))` | same exact per-occurrence rule |
| RF17 | `raw-node-family(producer-lifecycle-owner-native-input(q-local-observation-scope(...)))` | same exact per-occurrence rule; never intrinsic |
| RF18 | `raw-node-family(producer-lifecycle-owner-native-input(source-enumeration(...)))` | same exact per-occurrence rule |
| RF19 | `raw-node-family(baseline-direct-input(slot,source))` | same exact per-occurrence rule |
| RF20 | `raw-node-family(lifecycle-direct-input(slot,source))` | same exact per-occurrence rule |
| RF21 | `raw-node-family(iaa-binding-continuity-input(Q,P,B,U))` | same exact per-occurrence rule |
| RF22 | `raw-node-family(direct-producer-fact-input(D,P))` | same exact per-occurrence rule |
| RF23 | `raw-node-family(iaa-absence-source-control-input(A))` | same exact per-occurrence rule |
| RF24 | `raw-node-family(iaa-producer-independence-input(PI))` | same exact per-occurrence rule |
| RF25 | `raw-node-family(protected-detector-source-input(K,D,O,S))` | same exact per-occurrence rule with protected status retained |
| RF26 | `raw-node-family(observation-occurrence-input(O))` | same exact per-occurrence rule |
| RF27 | `raw-node-family(producer-closure-assertion-input(PC))` | same exact per-occurrence rule |
| RF28 | `raw-node-family(relation-edge-input(R,O,PC))` | same exact per-occurrence rule, including accepted retained malformed candidates |
| RF29 | `raw-node-family(event-coverage-assertion-input(EA))` | same exact per-occurrence rule |
| RF30 | `raw-node-family(qualified-time-input(scope,position))` | same exact per-occurrence rule |
| RF31 | `producer-intrinsic-family(PU,class)` | one per intrinsic occurrence; Q and ObservationScope absent from D |
| RF32 | `baseline-enumeration-family(member,boundary)` | one per accepted enumeration occurrence; no lifecycle/bootstrap alias |
| RF33 | `lifecycle-enumeration-family(member,boundary)` | one per accepted enumeration occurrence; no baseline/bootstrap alias |
| RF34 | `bootstrap-source-family(slot,boundary)` | one per accepted bootstrap candidate; exact matching slot/boundary |
| RF35 | `baseline-direct-observation-family(slot,source)` | one per accepted baseline observation; no lifecycle alias |
| RF36 | `lifecycle-direct-observation-family(slot,source,E)` | one per accepted lifecycle observation; E exactly one of E07/E11/E14/E15/E17 |
| RF37 | `event-policy-token-family(slot)` | one per received token occurrence, including retained noncatalogue occurrence; no policy authority |

For RF11-RF37, F multiplicity zero produces `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` with no disposition, reason, source occurrence, reference, or authority; multiplicity one produces one dispatched reference; multiplicity N produces N dispatched references. Each nonempty x obtains its existing-native or generic-native coordinate and its Table 2-C class from the same Table 2-A1 record. An equal duplicate at an exact member coordinate is retained and classified by that carried class; unequal content at one exact member coordinate is contradictory. D/F mismatch, invented generic placeholder, or wrong family alias is invalid and failed. A separately accepted placeholder remains one separately classified member. Several semantic questions or several accepted projection paths may cite the same source occurrence without changing F. No raw family is classified from a property name, table order, or discovery pass.

### 10.8.3 Lifecycle and owner resolution

| Case | Accepted facts | Required result |
|---|---|---|
| LCR01 | valid Q-independent intrinsic lifecycle C | R exists; unique intrinsic owner; one reference; Q absent from raw identity |
| LCR02 | valid Q-local ObservationScope C | R exists; unique Q-local owner-native family; no intrinsic alias |
| LCR03 | enrollment C | R exists; exact enrollment owner-native family; accepted tag remains `lifecycle` |
| LCR04 | ProducerClass C | R exists; exact class owner-native family; accepted tag remains `lifecycle` |
| LCR05 | source-enumeration C | R exists; exact enumeration owner-native family; accepted tag remains `lifecycle` |
| LCR06 | bootstrap lifecycle overlap | lifecycle and bootstrap branch coordinates coexist; one source occurrence; reference fanout does not copy it |
| LCR07 | zero-owner malformed C | retain C/R/node; no owner; failed with `unsupported-required-semantics` and `projection-reference-mismatch` |
| LCR08 | two unequal owners | retain both matches; no selected owner; contradictory with projection-reference and conflict reasons |
| LCR09 | two equal duplicate owner matches | retain duplicate match multiplicity; no selected owner; indeterminate with `equal-duplicate-occurrence` |
| LCR10 | unavailable or indeterminate accepted placeholder C | retain C/R/node; use the exact owning placeholder when unique; otherwise its exact tag selects the unavailable or indeterminate failure branch; no generic or Q-specific placeholder |
| LCR11 | same intrinsic C consumed by Q1 and Q2 | two unequal R values where applicable; one Q-independent intrinsic source family |
| LCR12 | Q1 disappears while Q2 remains | Q2 R remains; intrinsic D/F and multiplicity unchanged |
| LCR13 | same C participates in lifecycle and surface | both exact branch coordinates; one underlying source occurrence |
| LCR14 | same C participates in lifecycle, bootstrap, and K49 | three exact branch coordinates; one underlying source occurrence |
| LCR15 | owner resolution changes unique to ambiguous while Q/tag/C remain | R, node, C, and raw identity unchanged; only later classification changes to no-selected-owner failure |

### 10.8.4 Fixed point, discovery order, and Stage-A nesting

| Case | Accepted facts | Required result |
|---|---|---|
| FP01 | equal accepted populations discovered in different orders | equal member sets, classifications, paths, reference families, reasons, and Trust consequences |
| FP02 | repeated rediscovery of one equal top-level member | one set member; no new source or reference multiplicity |
| FP03 | one raw family has inner multiplicity N greater than zero | one top-level member; inner N; exactly N per-occurrence typed-dispatch references |
| FP04 | several H-02 references cite one source occurrence | source multiplicity one; every unequal reference retained |
| FP05 | both question wrappers for N are present | both exact empty; co-emission does not add direct references |
| FP06 | implementation traverses a required-dependencies wrapper | failed with `unsupported-required-semantics`; traversal produces zero references |
| FP07 | implementation uses rule/pass/order as classifier | invalid-input failure; accepted classifier result remains constructor-derived |
| FP08 | late accepted C is already in the frozen population | classify its accepted constructor normally; lateness/result timing adds no member or identity field |
| FP09 | post-freeze answer changes with identical frozen population | classifications and reference families remain identical |
| SAN01 | StageAResolvedPopulation is nested in one Stage-B member | one outer member; nested-container exact empty |
| SAN02 | implementation exposes Organization/Workspace/permission/attribution/currentness/applicability/rejected children | no outer paths; flattening is failed aggregate double-counting/unsupported semantics |
| SAN03 | separate Stage-A record is processed by Table 2-D3 | its exact Stage-A references remain independently generated |
| SAN04 | outer Stage-B and separate Stage-A processing both occur | no double counting: unequal containers and exact paths remain separate; outer nested member emits zero |

### 10.8.5 Questions, dependencies, and invalid constructors

| Case | Input or attempt | Required result |
|---|---|---|
| QD01 | `semantic-question(raw-source-node)` | exact empty |
| QD02 | `semantic-question(derived-node)` | exact empty |
| QD03 | `required-dependencies-question(raw-source-node)` | exact empty |
| QD04 | `required-dependencies-question(derived-node)` | exact empty |
| QD05 | direct dependency edge reaches a source | edge creates zero references |
| QD06 | transitive dependency reaches a source | reachability creates zero references |
| QD07 | provenance edge reaches a source | reachability creates zero references |
| QD08 | caller claims direct because a dependency reaches a source | invalid-input failure; only the source member's own exact path may emit |
| INV01 | caller injects `stage-b-direct(...)` | failed invalid input; exact empty family |
| INV02 | caller invents an eleventh outer constructor | failed invalid input; exact empty family |
| INV03 | implementation supplies an unknown future tag | failed invalid input until accepted authority changes |
| INV04 | implementation uses JSON/property name | failed invalid input; representation cannot classify |
| INV05 | implementation uses database/storage row | failed invalid input; storage cannot classify |
| INV06 | implementation uses discovery rule/pass | failed invalid input |
| INV07 | implementation reflects object type | failed invalid input |
| INV08 | implementation flattens an aggregate exposed by its object graph | failed with `aggregate-family-double-counting` and `unsupported-required-semantics` |
| INV09 | implementation treats invalid outer constructor as accepted malformed candidate | failed; invalid outer input is not inserted into an accepted family |
| INV10 | implementation silently ignores unknown constructor | failed; exact invalid-input result is mandatory |

### 10.8.6 Exact clean-room determinism matrix

| Dimension | Equal accepted facts require equal result |
|---|---|
| valid | exact outer/dependent branch, direct/empty result, paths, references, reasons, and Trust consequence |
| malformed | retained accepted candidate stays in its owner family; invalid outer value follows the fixed failed result |
| unavailable | exact primary `UNAVAILABLE`, exact additive reason set, and exact-empty/direct-placeholder reference consequence |
| indeterminate | exact primary `INDETERMINATE`, retained ambiguity/duplicates, and no owner guess |
| contradictory | exact primary `CONTRADICTORY`, all incompatible evidence, and no winner |
| equal duplicate | exact retained multiplicity and `equal-duplicate-occurrence`; never set-deduplicated |
| unequal duplicate | exact retained conflict and `conflicting-duplicate-occurrence` |
| multi-Q | equal R set per Q; Q-independent intrinsic family remains one |
| multi-branch | equal branch-tagged reference set; owner occurrence not copied |
| late/frozen | equal frozen set gives equal results regardless of later answers |
| different discovery order | equal mathematical set, owner match family, classification, and reference family |
| wrong alias | fixed failed invalid-input result; no source substitution |
| unknown constructor | fixed failed invalid-input result; no default/future acceptance |
| nested aggregate | exact outer empty and independent inner-container rule; no flattening |
| dependency traversal attempt | exact zero traversal plus fixed failure for the attempt |
| representation/storage variation | no semantic change; illegal extra equality component is rejected |
| Table or Markdown row reorder | identical D/x dispatch record, source key, direct role, and Table 2-C class |
| empty raw family | identical `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` with empty references, no disposition/reasons, and authority none |
| empty raw family plus accepted placeholder | raw member stays neutral empty; placeholder alone emits its exact one reference and adverse disposition |

Two independent clean-room implementations receiving identical accepted facts must agree on exact outer and dependent classification, direct/empty/invalid result, `H13DirectSourceReferencePath`, `H13SourceProjectionReferenceFamily`, source/reference membership, all three cardinality levels, lifecycle reference and owner-resolution result, placeholder class, protected primary disposition, complete protected reason set, and resulting Trust status. An implementation-dependent distinction is nonconforming.

### 10.8.7 Revision 12 specific/generic dispatch boundary vectors

| Case | Exact legal D/x boundary | Required source-coordinate and cardinality result |
|---|---|---|
| SG01 | historical-currentness raw node / `HistoricalCurrentnessQualification` | existing `h13-historical-currentness`; exact-once atomic |
| SG02 | runtime-correspondence raw node / conclusion or distinct authoritative attribution | corresponding existing authoritative content or attribution coordinate; exact-once atomic |
| SG03 | local-separation raw node / conclusion or distinct authoritative attribution | corresponding existing authoritative content or attribution coordinate; exact-once atomic |
| SG04 | Q-scoped non-lifecycle Producer candidate member | generic D/member coordinate; multiplicity-bearing atomic |
| SG05 | owner-native enrollment member | generic D/member coordinate; multiplicity-bearing atomic |
| SG06 | owner-native ProducerClass member | generic D/member coordinate; multiplicity-bearing atomic |
| SG07 | owner-native Q-local ObservationScope member | generic D/member coordinate; multiplicity-bearing atomic; never intrinsic |
| SG08 | owner-native source-enumeration member | generic D/member coordinate; multiplicity-bearing atomic |
| SG09 | baseline-direct raw node / attribution or owner observation | corresponding existing baseline coordinate and exact Table 2-A0 class |
| SG10 | lifecycle-direct raw node / attribution, coverage, or observation | corresponding existing lifecycle coordinate and exact Table 2-A0 class; coverage alone is aggregate |
| SG11 | binding-continuity raw node / conclusion or distinct authoritative attribution | corresponding existing authoritative coordinate; exact-once atomic |
| SG12 | direct-fact raw node / fact or distinct ordinary attribution | corresponding existing direct-content or source-attribution coordinate; exact-once atomic |
| SG13 | absence-source-control raw node / conclusion or distinct authoritative attribution | corresponding existing authoritative coordinate; exact-once atomic |
| SG14 | ProducerIndependence raw node / conclusion or distinct authoritative attribution | corresponding existing authoritative coordinate; exact-once atomic |
| SG15 | protected-detector raw node / assertion | existing protected-source coordinate; exact-once atomic and protection retained |
| SG16 | observation raw node / occurrence or distinct ordinary attribution | corresponding existing observation or source-attribution coordinate; exact-once atomic |
| SG17 | producer-closure raw node / assertion | generic D/member coordinate; multiplicity-bearing atomic |
| SG18 | relation-edge raw node / accepted candidate | generic D/member coordinate; multiplicity-bearing atomic, including accepted malformed candidate |
| SG19 | event-coverage raw node / assertion candidate | generic D/member coordinate; multiplicity-bearing atomic |
| SG20 | qualified-time raw node / input | existing semantic-position coordinate; exact-once atomic |
| SG21 | intrinsic activation class / raw member | existing producer-intrinsic lifecycle member coordinate; multiplicity-bearing atomic |
| SG22 | intrinsic observation-mechanism class / raw member | existing producer-intrinsic lifecycle member coordinate; multiplicity-bearing atomic |
| SG23 | intrinsic report-mechanism class / raw member | existing producer-intrinsic lifecycle member coordinate; multiplicity-bearing atomic |
| SG24 | intrinsic capability-binding class / raw member | existing producer-intrinsic lifecycle member coordinate; multiplicity-bearing atomic |
| SG25 | intrinsic O09 allocation class / allocation member | generic D/member coordinate; multiplicity-bearing atomic |
| SG26 | intrinsic O10 allocation class / allocation member | generic D/member coordinate; multiplicity-bearing atomic |
| SG27 | intrinsic direct-attribution class / wrapper | existing producer-intrinsic attribution coordinate; multiplicity-bearing atomic and separate from raw member multiplicity |
| SG28 | baseline enumeration member | generic D/member coordinate; multiplicity-bearing atomic |
| SG29 | lifecycle enumeration member | generic D/member coordinate; multiplicity-bearing atomic |
| SG30 | bootstrap source candidate or accepted owner-native unavailable-source occurrence | existing `BindingBootstrapSourceCoordinate`; exact-once atomic |
| SG31 | baseline-direct-observation family / attribution or observation | same corresponding existing coordinates/classes as SG09; D does not split the key |
| SG32 | lifecycle-direct-observation family / attribution, coverage, or observation | same corresponding existing coordinates/classes as SG10; D does not split the key |
| SG33 | received noncatalogue event-policy token | generic D/member coordinate; multiplicity-bearing atomic; no policy authority |
| SG34 | exact D paired with an x type outside its Table 2-A1 domain | invalid input; no generic fallback, existing-coordinate fallback, key, role, or class |
| SG35 | Tables 2-A0, 2-A1, 2-A, and 2-C are reordered or their Markdown rows are rendered differently | identical `R12H13RawSourceDispatchOf(D,x)` and therefore identical key, role, and class |
| SG36 | implementation requests generic for a Table 2-A0 source type | nonconforming; the typed result is existing-native and cannot be selected |
| SG37 | implementation requests an existing coordinate for a generic-only Table 2-A1 row | nonconforming; the typed result is generic-native and cannot be selected |
| SG38 | one existing-native baseline or lifecycle source is represented through both of its legal H-13 path forms | both references carry the same existing-native source coordinate; one owner-native key and no D-created alias |
| SG39 | two implementations receive equal D/x but use different local type names, storage, providers, discovery order, or reflection layouts | exact accepted constructor/type equality yields identical combined dispatch, source key, Table 2-C class, path, and reasons |

SG01-SG33 exhaust the Table 2-A1 rows. SG34 proves a mismatch cannot be coerced across the boundary. SG35 proves textual order is nonsemantic. SG36-SG37 prove the branch is not implementation-selectable. SG38 proves source aliases do not split one semantic source. SG39 proves clean-room equality.

### 10.8.8 Revision 12 raw-family 0/1/N vectors

In every row below, `Z(D)` means `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` with exact empty references, no primary disposition, empty protected reasons, and authority none. `R1(D,x)` means exactly one reference whose path is `raw-family-member(D,member-coordinate(x))` and whose role/native coordinate/Table 2-C class come from `R12H13RawSourceDispatchOf(D,x)`. `RN(D,F)` means the exact accepted multiplicity function of those references for every occurrence in nonempty F, including equal repetitions.

| Case | Exact raw-family branch or dependent subtype | F=0 | F=1 | F=N greater than one |
|---|---|---|---|---|
| EF01 | raw node: historical-currentness qualification | `Z(D)` | one existing-native `R1` | exact existing-native `RN` |
| EF02 | raw node: runtime correspondence | `Z(D)` | one exact typed existing-native `R1` | exact typed existing-native `RN` |
| EF03 | raw node: IAA local separation | `Z(D)` | one exact typed existing-native `R1` | exact typed existing-native `RN` |
| EF04 | raw node: Q Producer candidate, non-lifecycle use | `Z(D)` | one generic-native `R1` | exact generic-native `RN` |
| EF05 | raw node: owner-native enrollment | `Z(D)` | one generic-native `R1` | exact generic-native `RN` |
| EF06 | raw node: owner-native ProducerClass | `Z(D)` | one generic-native `R1` | exact generic-native `RN` |
| EF07 | raw node: Q-local ObservationScope | `Z(D)` | one generic-native `R1` | exact generic-native `RN` |
| EF08 | raw node: owner-native source enumeration | `Z(D)` | one generic-native `R1` | exact generic-native `RN` |
| EF09 | raw node: baseline direct input | `Z(D)` | one exact typed existing-native `R1` | exact typed existing-native `RN` |
| EF10 | raw node: lifecycle direct input | `Z(D)` | one exact typed existing-native `R1` | exact typed existing-native `RN` |
| EF11 | raw node: binding-continuity IAA input | `Z(D)` | one exact typed existing-native `R1` | exact typed existing-native `RN` |
| EF12 | raw node: direct Producer fact | `Z(D)` | one exact typed existing-native `R1` | exact typed existing-native `RN` |
| EF13 | raw node: absence-source-control IAA input | `Z(D)` | one exact typed existing-native `R1` | exact typed existing-native `RN` |
| EF14 | raw node: ProducerIndependence IAA input | `Z(D)` | one exact typed existing-native `R1` | exact typed existing-native `RN` |
| EF15 | raw node: protected detector source | `Z(D)` | one protected existing-native `R1` | exact protected existing-native `RN` |
| EF16 | raw node: ObservationOccurrence | `Z(D)` | one exact typed existing-native `R1` | exact typed existing-native `RN` |
| EF17 | raw node: ProducerClosureAssertion | `Z(D)` | one generic-native `R1` | exact generic-native `RN` |
| EF18 | raw node: RelationEdge candidate | `Z(D)` | one generic-native `R1` | exact generic-native `RN`, retaining accepted malformed occurrences |
| EF19 | raw node: EventCoverageAssertion candidate | `Z(D)` | one generic-native `R1` | exact generic-native `RN` |
| EF20 | raw node: qualified physical time | `Z(D)` | one existing-native `R1` | exact existing-native `RN` |
| EF21 | producer-intrinsic family, each of seven exact class branches | `Z(D)` | one Table 2-A1-selected `R1` | exact Table 2-A1-selected `RN` |
| EF22 | baseline enumeration family | `Z(D)` | one generic-native `R1` | exact generic-native `RN` |
| EF23 | lifecycle enumeration family | `Z(D)` | one generic-native `R1` | exact generic-native `RN` |
| EF24 | bootstrap source family | `Z(D)` | one existing-native `R1` | exact existing-native `RN` |
| EF25 | baseline direct-observation family | `Z(D)` | one exact typed existing-native `R1` | exact typed existing-native `RN` |
| EF26 | lifecycle direct-observation family | `Z(D)` | one exact typed existing-native `R1` | exact typed existing-native `RN` |
| EF27 | event-policy-token family | `Z(D)` | one generic-native received-token `R1` | exact generic-native received-token `RN` |
| EF28 | any one of the eight outer D branches with legal F | exactly the row's `Z(D)` | exactly the row's `R1` | exactly the row's multiplicity-preserving `RN` |

The separate empty/placeholder attack cases are:

| Case | Accepted facts or attempt | Required result |
|---|---|---|
| EF29 required dynamic source unresolved and accepted H-13 emits its exact placeholder alongside empty F | empty raw family is `Z(D)`; placeholder alone emits one direct placeholder reference and its exact adverse disposition |
| EF30 optional or complete-zero family has empty F and no placeholder | `Z(D)` only; no fabricated missing-source failure |
| EF31 event-policy family has no received noncatalogue token and no placeholder branch exists | exact event-policy `Z(D)`; constant `independently-complete-source` is unchanged |
| EF32 real placeholder plus empty raw family is counted as two source occurrences | nonconforming; there is one placeholder source occurrence and zero raw x occurrences |
| EF33 implementation creates a placeholder solely because F is empty | invalid invented member; empty F remains `Z(D)` |
| EF34 implementation suppresses a real accepted placeholder solely because F is nonempty | nonconforming; constructors are independent and the real placeholder remains classified once |
| EF35 accepted population was required to co-emit a placeholder but omits it | enclosing population-completeness/required-member defect; the separately present empty raw-family member remains `Z(D)` |
| EF36 implementation assumes an H-13 nonempty invariant for any raw-family branch | nonconforming; accepted Sections 6.2 and 8.2 provide no such invariant |
| EF37 equal accepted empty families are discovered on different rules or passes | one equal top-level set member and equal `Z(D)`; discovery creates no multiplicity |
| EF38 two clean-room implementations receive equal F of cardinality 0, 1, or N | identical zero/positive branch, combined D/x dispatch, path family, multiplicity, failure class, reasons, and authority |

EF01-EF20 audit every dependent raw-node subtype. EF21-EF27 audit every remaining raw-family constructor, including all seven producer-intrinsic classes through the exact Table 2-A1 subdispatch. EF28 states the eight-branch outer totality. EF29-EF38 separate required-source representation, optional-valid emptiness, explicit-placeholder coexistence, and the no-placeholder event-policy branch without asserting equivalence between any of them.

### 10.8.9 Revision 13 current authentication-subject population vectors

| Case | Exact construction | Required consequence |
|---|---|---|
| CR13-01 | a valid Stage-B record contains one nonempty `raw-input-family(D,F)` | Table 2-D4 is applied once to the frozen member; one direct reference is emitted per retained x occurrence in F through `R12H13RawSourceDispatchOf(D,x)`; the record is not forced unsupported |
| CR13-02 | a valid Stage-B record contains `raw-input-family(D,empty)` | exactly `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)`; zero references, no primary failure, empty protected reasons, and no fabricated placeholder |
| CR13-03 | a valid Stage-B record contains one accepted `pre-freeze-placeholder(D,V)` | Table 2-D4 emits exactly the placeholder's direct reference and retains V's accepted adverse disposition; no raw-family member or second source is invented |
| CR13-04 | a valid lifecycle-reference member has exactly one mechanically matching owner and target | exactly one lifecycle-owner reference is retained; its source stays owner-native and non-duplicated |
| CR13-05 | a valid lifecycle-reference member has zero owner matches | the member, R, node, and C remain retained; the exact Table 2-D4 no-owner lifecycle failure row applies; no owner is guessed and no Stage-B-wide unsupported failure is added |
| CR13-06 | a valid lifecycle-reference member has duplicate equal owner matches | `multiple-owner-candidates` with one distinct owner remains indeterminate and exact-empty with `equal-duplicate-occurrence`; equal matches are not set-deduplicated into unique ownership |
| CR13-07 | a valid Stage-B population contains structural, nested Stage-A, semantic-question, or required-dependencies-question members | each member receives its prescribed structural/nested/wrapper exact-empty result; there is zero traversal and no blanket Stage-B failure |
| CR13-08 | classifier input is an invented eleventh outer constructor or has a D/F, D/V, or dependent-type mismatch | exactly `H13StageBInvalidInputResult`; failed invalid-input reasons are reserved for this truly invalid input and no accepted member is silently created |
| CR13-09 | an implementation generates the current reference population only through Tables 2-D1 through 2-D3 | nonconforming: it omits the mandatory Table 2-D4 classification and reference consequences from `TrustIsolationCurrentRequiredReferencePopulation(E)` |
| CR13-10 | an implementation marks every Stage-B population reference component failed with `unsupported-required-semantics` | nonconforming: valid Stage-B reference generation is supported and only exact Table 2-D4 branch facts can produce an adverse result |
| CR13-11 | two clean-room implementations receive extensionally equal complete E values | they produce extensionally equal owner-native source families, Tables 2-D1 through 2-D4 reference populations, component coordinates, dispositions, reasons, and Trust consequences |
| CR13-12 | one owner-native source is represented through multiple legal H-13 paths | each legal generated reference remains separately retained at its container/path coordinate while the source occurrence count and owner-native multiplicity remain unchanged |

CR13-01 through CR13-12 jointly prove the Section 5.4 formal/prose equality, Section 5.5 population identity, valid Stage-B support, neutral empty-family result, lifecycle retained-failure boundary, invalid-input boundary, source/reference multiplicity separation, and clean-room determinism.

```text
CR13_01_THROUGH_CR13_12=PASS
```

## 10.9 Revision 9 presentation-mapping singular-event and scope cases

| Case | Construction | Exact consequence |
|---|---|---|
| MAP01 mapping wholly during appointment | the exact controller materializes the mapping wholly inside one favorable appointment and every class/scope/context/namespace/subject/audience/target projection is coherent | mapping creation may be `authorized-at-creation`, subject to all other predicates |
| MAP02 mapping before appointment | C creates the mapping before appointment and is appointed later | old mapping creation remains `failed`; later appointment cannot repair it; `retroactive-mapping-authorization-attempt` if treated as repaired |
| MAP03 mapping after vacancy | C materializes the mapping after the authoritative vacancy/removal begins | `failed` with `mapping-created-outside-appointment` |
| MAP04 mapping crosses boundary | exact evidence proves mapping materialization crosses appointment, vacancy, removal, or replacement | `failed` with `mapping-creation-known-boundary-crossing` |
| MAP05 H-11 creation qualification absent | the exact required H-11 qualification/result semantic occurrence is absent/unobtainable | Trust mapping-creation wrapper is `unavailable` with `mapping-creation-h11-qualification-unavailable`; no H-11 outcome or interval object is invented |
| MAP06 H-11 creation qualification indeterminate | exact H-11 result is literally `historically_indeterminate` | Trust mapping creation is `indeterminate`; the H-11 token and ownership remain unchanged |
| MAP07 creation evidence conflict | retained H-11 result occurrences or H-02 role/event records at the same exact coordinate are mutually incompatible | Trust population is `contradictory` with `mapping-creation-event-or-role-evidence-contradictory` plus the exact duplicate reason where applicable; no H-11 reclassification or winner |
| MAP08 old valid mapping under C1 | C1 created the mapping wholly while appointed; C2 later replaces C1 | historical assessment may succeed with present-authority false; current use independently requires favorable current role, creation authorization, mapping currentness, and privacy |
| MAP09 current mapping, unauthorized creation | H-11 reports the exact mapping current but its creation was unauthorized | no consumable mapping; currentness cannot repair creation |
| MAP10 valid proof, unauthorized mapping | result proof is valid, current, and authorized, but presentation mapping creation is not | no consumable presentation or side evidence; proof validity does not repair mapping authority |
| MAP11A same M, equal event representations | M has two structurally equal complete event representations, one claimed later | `indeterminate` duplicate representation family with `equal-duplicate-occurrence`; claim time creates no second event and cannot rehabilitate M |
| MAP11B same M, unequal event values | M has two structurally unequal values at its one event coordinate | `contradictory` with `mapping-creation-event-or-role-evidence-contradictory`; neither value is a selectable later event |
| MAP11C same M, one pre-appointment event | M's one singular event has one qualification definitively proving creation before appointment | mapping creation authorization is `failed` permanently for M; later appointment cannot change that event or interval |
| MAP11D genuine later creation | after appointment, a new nonrecycled context-safe carrier yields unequal immutable mapping M2 | M2 has its own singular event question and independent qualification/authorization; no M2 fact repairs M |
| MAP12 zero mapping-creation events | immutable mapping M is supplied with no event occurrence at its exact event coordinate | mapping creation authorization unavailable; M is not consumable |
| MAP13 exactly one mapping-creation event | M has exactly one raw event containing only its coordinate, M, semantic author/controller, and occurrence fact; its separate matching relation has favorable H-11 qualification, H-02 appointment, field-total scope, and coherence | the relation disposition is `authorized-at-creation`; the event has no authorization disposition; other current-use predicates remain independently required |
| MAP14 equal duplicate mapping events | two equal complete event representations occur at M's exact event coordinate | event family indeterminate with `equal-duplicate-occurrence`; no first/latest selection |
| MAP15 unequal duplicate mapping events | two unequal complete event values occur at M's exact event coordinate | event family contradictory with `conflicting-duplicate-occurrence`; neither wins |
| MAP16A genuine later reissue after failed M | prior M has exactly one singular event whose creation authorization is `failed`; an appointed controller creates new nonrecycled M2 | M remains exactly `failed`; M2 has its own singular event question and is evaluated independently |
| MAP16B genuine later reissue after contradictory M | prior M has contradictory retained event/authorization evidence; an appointed controller creates new nonrecycled M2 | M remains exactly `contradictory`; M2 is evaluated independently and cannot repair or select evidence for M |
| MAP17 current-use event binding missing | M is present but the event, matching authorization relation, or H-11 mapping-currentness/history semantic subject bound to that event/lineage is absent | current-use binding unavailable; M is not consumable |
| MAP18 current-use event binding nonunique | present binding evidence cannot resolve exactly one event, one matching `authorized-at-creation` relation, and one event-bound H-11 lineage | current-use binding indeterminate; no event or relation selection heuristic |
| MAP19 current-use event bindings conflict | retained bindings disagree about event coordinate, mapping, lineage, or currentness | current-use binding contradictory; no binding wins |
| MAP20 controller replacement | C1 created M while appointed; C2 now occupies the same role and H-11 lineage says M's exact event remains current | C2 may consume M without reauthoring it when every scope/use predicate satisfies; if C2 authors a new mapping it requires a new nonrecycled carrier M2 and new event coordinate |
| MAP21 clean event then favorable qualification | result precedes M; M precedes coordinate; one raw event occurs; only afterward H-11, appointment, scope, and coherence are favorable | one separate authorization relation may receive `authorized-at-creation`; forward causal order is satisfied |
| MAP22 event exists, H-11 missing | one valid raw event exists but the required H-11 qualification occurrence for it is absent | the event remains an existing fact; authorization relation is `unavailable` with `mapping-creation-h11-qualification-unavailable` |
| MAP23 event exists, appointment failed | one valid raw event and favorable H-11 result exist, but the controller was wholly outside appointment or crossed a known boundary | event remains unchanged; separate authorization relation is `failed` with the exact outside/crossing reason |
| MAP24 event exists, scope failed | one valid raw event exists but one field-total role/namespace/R8-34/H-07 predicate is resolved false | event remains unchanged; separate authorization relation is `failed`; no scope value is inserted into the event |
| MAP25 attempted H-11-before-event | the creation-event tuple includes or is constructed from `TrustHistoricalQualificationInput` or an H-11 outcome | structurally invalid self-qualified event; `failed` with `retroactive-mapping-authorization-attempt`; no conforming event occurrence is supplied by that tuple |
| MAP26 currentness fed into creation | mapping currentness/history is used to create, alter, select, or authorize the raw event | `failed` under FBE10 with `retroactive-mapping-authorization-attempt`; the event family is not repaired |
| MAP27 authorization disposition inserted into event | raw event is extended with `mappingCreationAuthorizationDisposition=authorized-at-creation` | invalid event type and backward edge; the disposition belongs only to the separate relation |
| MAP28 wrong authorization relation at current use | binding names the correct M/event but a relation for another event/controller/revision | `contradictory` binding; no relation is selected by favorable disposition |
| MAP29 M relation replayed against M2 | an `authorized-at-creation` relation for M/event e is offered with new immutable mapping M2/event e2 | `contradictory` mapping/event/relation coherence; M2 needs its own relation |
| MAP30 singular-event later-appointment rule | M's one qualified event occurred before appointment; later appointment or a later same-M materialization claim is fed into M's old relation | M remains `failed`; attempted repair adds `retroactive-mapping-authorization-attempt`; an equal later record is duplicate/indeterminate, an unequal value is contradictory, and only new nonrecycled M2 with its own singular event may be independently authorized |

Revision 9 singular mapping-event cases are additional and normative:

| Case | Construction | Exact consequence |
|---|---|---|
| ME01 one M, one event representation | M has one conforming complete representation of its singular event | evaluate the one event normally through separate H-11 qualification and creation authorization |
| ME02 one M, two identical representations | two equal complete event representations occupy M's one event coordinate | `indeterminate` with `equal-duplicate-occurrence`; no record wins |
| ME03 one M, two unequal values | two unequal event values occupy M's one event coordinate | `contradictory` with `mapping-creation-event-or-role-evidence-contradictory`; no event selection |
| ME04 old failed event plus identical later claim | M's event failed pre-appointment; an identical event record is later claimed after appointment | duplicate/`indeterminate` representation family and no later-event selection; the original failed creation fact is not repaired |
| ME05 one pre-appointment qualification | one H-11 qualification of M's singular event proves creation before appointment | creation authorization is `failed` forever for M |
| ME06 conflicting qualifications for same event | a later retained H-11 qualification for M's same event claims an incompatible post-appointment interval | Trust qualification/history is `contradictory`; both answers remain attached to the one historical/event question and no e2 is allocated |
| ME07 genuine new M2 | a new context-safe nonrecycled carrier creates immutable mapping M2 | M2 receives one new singular event question and independent qualification/authorization; M remains unchanged |
| ME08 representation discriminator added | implementation adds timestamp, UUID, sequence, checkpoint, proof ID, database row, arrival order, or storage location to split M's event | `failed` with `unsupported-required-semantics`; the event identity is invalid, and attempted repair also adds `retroactive-mapping-authorization-attempt` |

## 10.10 Preserved H-13/Trust separation cases

| Case | Construction | Exact consequence |
|---|---|---|
| HT01 favorable Trust, adverse H-13 | both Trust sides are fully favorable/coherent; H-13 is nonauthorizing | Trust aggregate `favorable`; H-13 independently nonauthorizing; final authority absent |
| HT02 favorable Trust, policy deny | both Trust sides are fully favorable/coherent; policy denies | Trust aggregate `favorable`; final authority absent under policy owner |
| HT03 favorable Trust, Approval missing | both Trust sides are fully favorable/coherent; required Approval is missing | Trust aggregate `favorable`; action authority absent |
| HT04 H-13 pass, one Trust side unavailable | H-13 passes; one exact side is missing or unavailable | Trust aggregate `unavailable`; no authority |
| HT05 H-13 pass, one Trust side failed | H-13 passes; one exact side definitively fails a Trust predicate | Trust aggregate `failed`; no authority |
| HT06 unequal retained H-13 evaluations | otherwise favorable side bodies carry unequal complete H-13 evaluations or decisions | Trust aggregate `contradictory`; no side wins; no authority |

## 10.11 Preserved proof/appointment interval cases

| Case | Construction | Exact consequence |
|---|---|---|
| I01 wholly inside appointment | the entire proof-materialization interval is proved inside one favorable appointment of the exact controller | `authorized-at-creation` if every other prerequisite passes |
| I02 wholly before appointment | complete evidence proves the entire interval precedes the controller's appointment | `failed` with `proof-created-outside-appointment` |
| I03 wholly after vacancy/removal | complete evidence proves the entire interval follows vacancy or removal | `failed` with `proof-created-outside-appointment` |
| I04 begins inside and ends after vacancy | complete evidence proves the interval crosses from appointment into vacancy | `failed` with `proof-creation-known-boundary-crossing` |
| I05 begins before and ends inside | complete evidence proves the interval crosses into appointment | `failed` with `proof-creation-known-boundary-crossing` |
| I06 crosses C1-to-C2 replacement | complete compatible evidence proves the interval spans replacement; neither C1 nor C2 occupied the whole interval | `failed` with `proof-creation-known-boundary-crossing` absent independently conflicting evidence |
| I07 interval evidence unavailable | a required interval, boundary, or appointment evidence source is absent or unobtainable | `unavailable` with `proof-creation-interval-evidence-unavailable` |
| I08 order unresolved | required evidence exists but exact order to the appointment boundary cannot be uniquely resolved | `indeterminate` with `proof-creation-interval-order-indeterminate` |
| I09 histories conflict | retained authoritative histories make mutually incompatible claims about interval, controller, revision, or boundary | `contradictory` with `proof-creation-interval-evidence-contradictory` |
| I10 later appointment after failed old proof | an earlier proof failed I02-I06; the controller is later favorably appointed | the old event remains `failed`; `retroactive-proof-authorization-attempt` applies if it is treated as repaired |
| I11 reissued proof in later appointment | a new proof event over unchanged content is created wholly inside the later appointment | the new event is independently evaluated and may be `authorized-at-creation`; the old event remains failed |

## 10.12 Preserved dependency-cycle cases

| Case | Construction | Exact consequence |
|---|---|---|
| CYC01 direct component/source cycle | a raw occurrence key directly contains its verifier component coordinate | `failed` with `component-source-recursion` |
| CYC02 transitive component/source cycle | raw occurrence creation depends transitively on a component that depends on that occurrence | `failed` with `component-source-recursion` |
| CYC03 result self-verification | result body contains its own proof/currentness/mapping result as a prerequisite | `failed` with `self-dependency` |
| CYC04 host depends on agent | host side result derivation depends on the agent result | `failed` with `self-dependency` |
| CYC05 agent depends on host | agent side result derivation depends on the host result | `failed` with `self-dependency` |
| CYC06 Trust/H-13 feedback | Trust aggregate feeds H-13 and consumes the resulting altered H-13 evaluation | `failed` with `self-dependency` |
| CYC07 peer gate feedback | policy, Approval, or another peer gate feeds Trust and later consumes the same Trust outcome in a semantic cycle | `failed` with `forbidden-peer-gate-dependency` |
| CYC08 dependency evidence absent | a required dependency graph or edge source is absent or unobtainable | `unavailable` with `dependency-evidence-unavailable` |
| CYC09 edge direction unresolved | dependency information exists but an exact required edge direction or acyclicity cannot be resolved | `indeterminate` with `dependency-direction-indeterminate` |
| CYC10 authoritative graphs conflict | retained authoritative dependency graphs require mutually incompatible edge directions/presence | `contradictory` with `dependency-graphs-contradictory` and every independently established owning edge reason |
| CYC11 component failure deletes raw source | a component's failure suppresses or reduces its already fixed raw occurrence family | `failed` with exact set `{component-source-recursion, component-population-incomplete}` |
| CYC12 component selects source-native coordinate | component identity or outcome is inserted into or selects `SourceNativeOccurrenceCoordinate` | `failed` with exact set `{component-source-recursion, source-native-coordinate-extra}` |
| CYC13 reference count drives source count | H-13 reference multiplicity increments, deletes, or deduplicates owner-native source multiplicity | `failed` with exact set `{source-cardinality-class-mismatch, projection-reference-mismatch}` |
| CYC14 wrapper count drives raw lifecycle count | Producer intrinsic attribution-wrapper multiplicity allocates or increments raw lifecycle members | `failed` with `{intrinsic-lifecycle-double-counting}` |
| CYC15 later appointment repairs proof | a later appointment is fed backward into an earlier proof-creation authorization | `failed` with `{retroactive-proof-authorization-attempt}` |
| CYC16 later appointment repairs mapping | a later appointment is fed backward into an earlier mapping-creation authorization | `failed` with `{retroactive-mapping-authorization-attempt}` |
| CYC17 mapping currentness creates event | mapping currentness/history is used to create, replace, or authorize its mapping-creation event | `failed` with `{retroactive-mapping-authorization-attempt}` |
| CYC18 proof repairs mapping | proof validity/currentness is used to authorize mapping creation | `failed` with `{proof-to-mapping-authority-substitution}` |
| CYC19 mapping repairs proof | mapping validity/currentness is used to authorize proof creation | `failed` with `{mapping-to-proof-authority-substitution}` |
| CYC20 H-13 result drives Trust verification | H-13 pass/fail determines Trust-verification success/failure | `failed` with `{h13-result-to-trust-verification-dependency}` even without a return edge |
| CYC21 Trust creates permission | Trust result or aggregate determines Organization/Workspace permission | `failed` with `{trust-to-permission-authority-substitution}` |
| CYC22 Trust creates measured fact | Trust result or aggregate determines an IAA measured conclusion | `failed` with `{trust-to-measurement-authority-substitution}` |
| CYC23 Trust creates Connection authority | Trust result or aggregate determines H-07 Connection authority | `failed` with `{trust-to-connection-authority-substitution}` |
| CYC24 Trust creates policy authority | Trust result or aggregate determines Invocation authorization or policy `ALLOW` | `failed` with `{trust-to-policy-authority-substitution}` |
| CYC25 proof creates appointment | result proof is used to create or select the controller appointment/role authorization that authorizes that proof | `failed` with `{self-dependency}` |
| CYC26 new count-edge evidence missing | the dependency source needed to establish whether H-13 reference count drives source count is absent/unobtainable and no FBE04 edge is independently proved | `unavailable` with `{dependency-evidence-unavailable}`; no FBE04 owning set is guessed |
| CYC27 new authority-edge direction ambiguous | present graph evidence cannot resolve whether proof currentness feeds mapping authorization or merely joins later at a consumer, and no FBE11 edge is independently proved | `indeterminate` with `{dependency-direction-indeterminate}`; no direction is selected |
| CYC28 new mapping-edge graphs conflict | retained authoritative graphs disagree on whether mapping currentness feeds mapping creation | `contradictory` with `{dependency-graphs-contradictory}`; add `{retroactive-mapping-authorization-attempt}` only if FBE10 is independently proved by all compatible evidence |
| CYC29 self-qualified mapping event | H-11 qualification, appointment, scope, authorization disposition, mapping currentness/history, proof state, downstream Trust verification disposition/status, or consumer outcome constructs or alters the raw mapping event | `failed` with `{retroactive-mapping-authorization-attempt}`; the pre-qualification event must already exist |
| CYC30 historical answer rekeys question/source | H-11 result, availability, returned scope, duplicate/conflict state, or Trust disposition changes the historical question, population boundary, logical source domain, raw source key, or grouping | `failed` under FBE22 with `{historical-answer-to-question-identity-feedback}`; the answer remains input to one already-fixed question |

## 10.13 Revision 8 security/privacy nonregression cases

| Case | Construction | Exact consequence |
|---|---|---|
| PRV01 same physical Trust service | one physical service is used for unequal `ExactTenantContext` values | two unequal context-private controller identities and role coordinates are mandatory; physical equality creates no semantic equality |
| PRV02 same key across contexts | one key/thumbprint is exposed or used as a protected tenant-visible carrier in unequal contexts | privacy failure with `cross-context-carrier-reuse`; cryptographic validity remains nonauthorizing |
| PRV03 same proof bytes across contexts | byte-identical valid proof carriers are returned in unequal contexts | privacy failure; proof equality waives no R8-30 through R8-36 predicate and cannot merge subjects |
| PRV04 same digest/reference across contexts | one digest, commitment, or reference is reused as a protected carrier in unequal contexts | privacy failure unless the exact field/value/authority-specific R8-36 exception already applies |
| PRV05 controller replacement | C2 replaces C1 in one context | C2 receives a new nonrecyclable identity; C1 history remains; C1 cannot author new current proof events |
| PRV06 proof replay after replacement | a C1 proof is offered for current C2 use | current use `failed`; historical verification, if favorable for the old interval, has present-authority `false` |
| PRV07 result replay to another Connection | a current result for C1 is offered to unequal C2 | `failed` with `wrong-connection`; no rebinding or current reconstruction |
| PRV08 host/agent carrier substitution | a valid host carrier/result is offered for the agent subject or conversely | `failed` with wrong side/key; expected opposite slot remains unavailable |
| PRV09 same-context host/agent carrier collision | equal contexts have two side subjects but one carrier maps to both | `contradictory` mapping collision; two injective carriers remain mandatory |
| PRV10 tenant/Connection presentation-class substitution | governance and current-result presentations are exchanged | `failed` wrong class/namespace; authentic content cannot change its presentation class |
| PRV11 historical proof as present authority | historically verified proof/result is offered for current authority | present-authority `false`; current occupancy/proof/mapping and exact two-side use remain mandatory |
| PRV12 Trust result as permission | Trust result or aggregate is placed in Organization/Workspace permission | `failed` type/authority substitution; permission remains absent or independently owned |
| PRV13 Trust result as measurement truth | Trust result replaces IAA/direct-owner fact | `failed`; measured fact remains missing under its accepted owner |
| PRV14 Trust result as H-13 evaluation | Trust result replaces, edits, or reruns `ConnectionIsolationEvaluation` | `failed` substitution or `contradictory` when retained authoritative projections conflict; H-13 remains unchanged |
| PRV15 Trust result as policy/Approval | Trust result creates policy `ALLOW` or required Approval | `failed` authority substitution; policy/Approval remains independently required |
| PRV16 mapping replay across contexts | one mapping or carrier created for context X is replayed in unequal `ExactTenantContext` Y | failed privacy/context binding; creation authorization and same provider/key do not permit cross-context reuse |
| PRV17 equal-context side mapping alias | host and agent subjects share one context but are mapped to one carrier | contradictory `mapping-collision`; distinct side subjects require two injective carriers |
| PRV18 mapping after controller replacement | old controller C1 materializes a new mapping after C2 replaces it | creation `failed`; C1 history and key validity create no present mapping authority |
| PRV19 mapping replay to another Connection | a current-result mapping bound to Connection C1 is offered for unequal C2 | failed with `wrong-connection`, audience/target mismatch, and no rebinding |
| PRV20 retired mapping carrier reused | a carrier from a retired/revoked mapping is allocated to another result subject | failed with `carrier-reassigned-or-recycled`; historical reservation remains |
| PRV21 historically valid old mapping reused now | an old mapping was validly created under C1 but is offered as current after replacement | historical success has present-authority false; current use requires independent current qualification and prohibits carrier recycling |
| PRV22 same provider/key, unequal controller/context | mapping author proof uses the same provider or key as the appointed controller but controller identity or context is unequal | failed `controller-substitution`/context mismatch; provider/key equality creates neither semantic equality nor authority |
| PRV23 invented mapping-purpose field | an implementation adds `mappingPurpose` and uses it to pass scope | failed with `unsupported-required-semantics`; purpose is the accepted namespace value `experiment-isolation`, not a mapping field |
| PRV24 governance mapping in Connection namespace | a governance-result mapping uses `ConnectionPresentationNamespace` or adds Connection/audience/target dimensions | failed `wrong-presentation-namespace`; governance uses the exact tenant namespace and no Connection dimensions |
| PRV25 current mapping in tenant namespace | a current-result mapping omits the exact Connection/audience/target namespace dimensions | failed `wrong-presentation-namespace`, with independently true connection/audience/target reasons retained |
| PRV26 wrong R8-34 owner | an otherwise coherent mapping claims an owner other than the exact Trust role selected by R8-34 | failed `wrong-source-authority`; proof/key/provider equality cannot repair ownership |
| PRV27 wrong R8-34 source subject | the mapping's R8-34 source subject differs from the exact governance/current result subject | failed `wrong-subject`; carrier equality cannot rebind the subject |
| PRV28 creation event rebound to another mapping | the exact tagged creation-event-question coordinate wrapping immutable mapping M is offered as M2's event | failed coordinate/binding mismatch; the event coordinate's injective M projection cannot migrate to M2 |
| PRV29 currentness subject omits event coordinate | mapping-currentness evidence names only carrier/namespace/result and not M's exact creation-event coordinate | current-use event binding unavailable; no tuple heuristic or latest-event rule is permitted |
| PRV30 replacement controller claims reauthorship | current controller C2 consumes current old mapping M created by C1 and rewrites its author/event as C2 | contradictory with immutable M/event history; C2 may consume qualifying M but a C2-authored mapping requires a new nonrecycled carrier and M2 coordinate |

# 11. Nonauthoritative Revision 13 cross-section and nonregression audit

| Audit topic | Revision 13 result |
|---|---|
| structural authority equality | exact role/context, controller, authorization slot/revision, proof-creation event, side scope, and result tuples; no representation identity |
| Trust result authorship | one Organization-authored role slot names one concrete controller; common creation authority and external authorship bind its exact proof event to the completed result |
| governance/current proof symmetry | both result classes use Section 1.6; neither later appointment nor historical success repairs unauthorized creation |
| vacancy/replacement | known authoritative vacancy is failed and distinct from missing evidence; history remains; replacement uses a new identity; old controller cannot author new proof events |
| raw occurrence causality | exact owner-defined source-native coordinate, key, value, and multiplicity precede components; components only reference immutable raw subfamilies |
| raw key equality/cardinality | closed tagged union plus Tables 2-A0/2-A1/2-A/2-B/2-C; one combined D/x coordinate/class/role record; four closed Producer intrinsic lifecycle branches; no caller-selected coordinate/class/kind, row order, enclosing context, or proof/storage/component identity |
| lifecycle attribution | raw lifecycle members and direct-attribution wrappers are separate accepted H-13 families; wrapper authenticates the wrapper-omitted member and cannot allocate, recursively wrap, or double-count it |
| source versus H-13 reference | owner-native occurrence family alone fixes source multiplicity; Tables 2-D1 through 2-D4 generate exact closed-container reference families; dependency/nested-container traversal is zero; references cannot allocate, consume, merge, or delete source occurrences |
| current authentication-subject population | Section 5.4 formally and textually consumes `TrustIsolationCurrentRequiredReferencePopulation(E)` from Tables 2-D1 through 2-D4; Table 2-D4 is applied once per frozen Stage-B member; Section 5.5 consumes the identical population; valid Stage-B membership never creates a blanket unsupported failure |
| Stage-B top-level equality | exact accepted `H13EvaluationPopulationMembers` mathematical set; no H-02 multiplicity wrapper; fixed-point rediscovery cannot create a member/source/reference duplicate |
| accepted inner multiplicity | only accepted owning occurrence/candidate families retain their own counts; top-level set projection cannot deduplicate them; H-02 reference multiplicity remains a third independent level |
| Stage-B classifier | exact accepted ten-constructor total/disjoint dispatch plus closed literal, raw-family, raw-node, lifecycle-resolution, and placeholder subdispatch; zero/positive F is total; empty F is neutral and placeholder-independent; no caller tag, discovery pass, reflection, dependency path, storage, or prose catch-all |
| raw multiplicity invariance | component addition/removal/failure/count cannot change raw source cardinality |
| two-result non-substitutability | tenant governance and side-specific Connection classes remain distinct and hostile-tested |
| side result cardinality | exactly one host subject and one agent subject per H-13 evaluation, including equal-context cases |
| Connection consumption | exact two-slot evidence set; both fully favorable/coherent members required; no implementation side selection; peer gates are absent from the Trust type |
| H-13 ownership | one complete shared evaluation and literal decision are structurally verified; decision value does not determine Trust favorability; Trust never creates or rewrites isolation truth |
| enforcer handoff | outside H-02-S2, the enforcer independently requires Trust favorable, H-13 pass, H-07/current Connection authority, and all other applicable gates |
| current versus historical | current H-13 use cut and accepted H-11 historical assessment remain separate; all five H-11 outcome tokens stay literal; absent/duplicate/conflicting Trust-consumption states are wrapper states, not new H-11 outcomes; historical success creates no current authority |
| six-status precedence | unchanged and total; full protected reasons additive |
| H-11 historical classifications | consumed exactly; never authored or upgraded by Trust |
| H-13 reason ownership | every exact H-13 reason remains H-13-owned and protected |
| currentness ownership | H-11/H-13 outcomes consumed; content proof, claimed interval, local status, or aggregate cannot create currentness |
| population completeness | exact raw source-stream and temporal-branch generation before components; no target/provider/verdict-selected extent |
| side/tenant privacy | context-local controllers/carriers; two injective side carriers; R8-30 through R8-36 unchanged |
| result's own proof exclusion | retained for both bodies and provenance graphs; creation authorization/authorship remain external |
| result's own mapping exclusion | retained; one distinct tagged event-question coordinate injectively wraps each immutable mapping; the minimal raw event precedes and excludes qualification/appointment/scope/authorization/currentness; the separate authorization relation and event-bound current use remain downstream, separate from proof creation/currentness, and nonretroactive |
| circular authentication | FBE01-FBE22 enumerate every prohibited component/source, count, proof/mapping, historical-answer/source-identity, cross-side, H-13/Trust, peer-gate, and Trust-to-authority back edge with an exact mandatory reason set; a proved edge is failed, missing graph evidence is unavailable, unresolved direction is indeterminate, and incompatible retained graphs are contradictory |
| Trust-created authority | impossible for Organization, Workspace, IAA, H-07 Connection, Invocation, policy, and enforcement authority |
| tenant-visible projection | exactly the five R8-35 categories; no tenant-visible `authorityEffect` or underlying-pass field |
| H-10 semantic invention | forbidden; no result domain/profile/key purpose/algorithm/bytes/schema/carrier allocated here |
| H-11 mechanism invention | forbidden; no records, sequences, checkpoints, clock mechanics, storage, or implementation allocated here |

All previously valid Revision 1 through Revision 12 architecture remains intact except for the one stale Section 5.4 rule repaired here. Tables 2-A0/2-A1 and Table 2-D4 consume accepted H-13-S3 without changing H-13's grammar, equality, fixed point, `RequiredNodeCoordinateSet`, `ConnectionIsolationEvaluation`, status/reason semantics, currentness, inner occurrence identity/multiplicity, lifecycle meaning, or gate decision. `R11_B_001`, `R11_B_002`, and `R3_B_001` remain closed. The R6/R7/R8/R9 Stage-B-dependent findings are closed again because Section 5.4 now consumes, rather than contradicts, the combined dispatch, total empty-family result, and Tables 2-D1 through 2-D4 reference population.

## 11.1 Cross-section consistency audit

For each row, the canonical definition, every corresponding hostile case, the decision matrix, finding ledger, and self-review were compared. "Consistent" means no example or explanatory sentence changes the canonical consequence.

The Revision 13 cross-comparison followed the complete chain: Section 2.1 and Tables 2-D1 through 2-D4 define `H13RequiredSourceProjectionReferenceFamily(container)` and the total Stage-B classifier; Section 4.4 verifies that total family; Section 5.4 constructs `TrustIsolationCurrentRequiredReferencePopulation(E)` from it; Section 5.5 consumes that same named value; Section 8.1 preserves the forward-only DAG; CR13-01 through CR13-12 exercise the operative boundaries; and this audit, the Section 13 ledger, and Section 14 self-review record the same consequences. No link substitutes a Tables 2-D1 through 2-D3-only family or a blanket Stage-B failure.

| Normative topic | Canonical definition | Case/audit coverage | Result |
|---|---|---|---|
| closed Producer intrinsic lifecycle member projection | Section 2.1/Table 2-C | K16-K25, matrix, and R5/R4 ledger rows | consistent: four literal family branches, closed event tags |
| attribution wrapper versus raw lifecycle event | Sections 2.1/2.3 | K23-K25, DAG, and R5/R4 ledger rows | consistent: separate families, no raw double count |
| closed historical caller/subject/question identity | Sections 1.5/2.1/3.1-3.7/8.1 | HQ01-HQ14, FBE22, CYC30, matrix, ledger, self-review Q1-Q7 | consistent: one of seven exact caller branches maps through one total H-02 function; answer/input/scope cannot rekey the raw domain |
| Stage-B accepted-set and multiplicity levels | Section 2.1/Table 2-D4/8.1 | SM01-SM06, SB08/SB10, matrix, ledger, self-review Q8-Q11/Q20-Q21 | consistent: accepted top-level mathematical set, separate inner occurrence families, separate H-02 reference family |
| accepted-native Stage-B classifier | Section 2.1/Table 2-D4/8.1 | S3M01-S3M10, RF11-RF37, LCR01-LCR15, FP01-FP09, SAN01-SAN04, QD01-QD08, INV01-INV10, SB01-SB10, matrix, ledger, self-review | consistent: total/disjoint constructor and dependent dispatch; no prose/caller/reflection/traversal fallback |
| current Stage-B reference consumption | Sections 2.1/4.4/5.4/5.5/8.1 | CR13-01 through CR13-12, Tables 2-D1 through 2-D4, matrix, ledger, self-review | consistent: the formal tuple, prose, component population, and DAG consume one extensionally equal total reference population; valid Stage-B membership is supported and never a blanket failure |
| owner-native occurrence versus H-13 reference | Sections 2.1/2.3/3.7/5.4 and Tables 2-D1 through 2-D4 | R3K01, PREF01-PREF07, REFGEN01-REFGEN23, RF11-RF37, LCR01-LCR15, SM01-SM06, matrix, ledger, self-review | consistent: independent multiplicities, exact direct paths and empty outcomes, explicit traversal stops, no guessed source or owner |
| singular mapping event versus representation/authorization relation | Sections 1.5/1.7/7.4/8.1 | MAP01-MAP30, ME01-ME08, PRV16-PRV30, CYC16-CYC19/CYC29, matrix, ledger, self-review Q22-Q24 | consistent: one event question per M, total representation cardinality, raw pre-qualification event, separate relation, nonretroactivity |
| literal H-11 historical outcomes and reasons | Sections 1.6/3.2/3.4/3.5/4.1/4.2/6.1/7.3 | E19-E22, H11H01-H11H11, HQ01-HQ05, MAP05-MAP07/MAP22-MAP23, matrix, ledger, self-review Q25-Q27 | consistent: five tokens unchanged; protected H-11 reason and optional safe category are distinct |
| Trust favorable plus H-13 nonauthorizing | Sections 5.6/5.7 and 6.3 | S15, T24, R3G01, HT01, matrix, ledger, self-review Q28 | consistent |
| exact two-side requirement | Sections 5.3/5.7 | S01-S20, HT04-HT06, self-review Q29 | consistent |
| known vacant current role | Sections 1.5/1.9 and 4.1 | A09, matrix, and safe mapping | consistent: failed |
| proof before appointment | Section 1.6 | A11/A12, I02, I10 | consistent: failed |
| known proof/mapping appointment crossing | Sections 1.6/7.4 | A15, I04-I06, H11H08, MAP04/MAP23, and matrix | consistent: failed without rewriting H-11 |
| absent H-11 historical input | Sections 3.2/3.4/7.4 | E20/H11H01/HQ01/MAP05/MAP22, matrix, self-review Q3-Q6 | consistent: fixed question/domain, later Trust unavailable, no invented H-11 token |
| literal H-11 indeterminate and unsupported outcomes | Sections 3.2/4.2/6.1/7.3 | E19/H11H02-H11H05/HQ04/MAP06, matrix, self-review Q25-Q27 | consistent: Trust indeterminate; `historically_unsupported` has exact protected H-11 reason and optional safe category |
| conflicting H-11 or event occurrence family | Sections 3.2/7.4 | E21/H11H06/HQ05/MAP07/MAP15/ME03/ME06, matrix, self-review Q5-Q6/Q22-Q24 | consistent: Trust contradictory; upstream values and single question/event remain unchanged |
| proved forbidden edge | Sections 2.5/8.3 | E14, T26, HQ06-HQ08, CYC01-CYC07/CYC11-CYC25/CYC29-CYC30, self-review Q7/Q10/Q15-Q17/Q21-Q24 | consistent: failed with row-exact mandatory reasons |
| missing/unresolved/conflicting dependency evidence | Section 8.3 | CYC08-CYC10/CYC26-CYC28 and matrix | consistent |
| equal duplicate exact-once/member coordinate | Sections 2.3/2.4 | E06/E10/K10 | consistent: indeterminate |
| unequal duplicate exact-once/member coordinate | Sections 2.3/2.4 | E07/K09/R3K05 | consistent: contradictory |
| legitimate multiplicity-bearing family members | Sections 2.1/2.3 | K07-K12 | consistent: retained independently |
| source-native coordinate equality | Section 2.1 | R3K01-R3K06/K13/K15 | consistent |
| specific versus generic D/x dispatch | Section 2.1/Tables 2-A0 and 2-A1 | SG01-SG39 and EF01-EF28 | consistent: accepted type fixes one coordinate, role, and cardinality class in one record; textual order is irrelevant |
| empty raw-family classification | Section 2.1/Table 2-D4 | EF01-EF38, S3M06a/S3M06b, SB01, FP03 | consistent: every legal F is zero or positive; zero is neutral exact empty; placeholders remain independent |
| cross-context carrier reuse | Sections 1.3/5/7 | S04/S07/T16-T20/P07 | consistent: privacy failure |
| historical success present-authority false | Sections 1.7/4.2/6.3 | A13/T14/H11H10-H11H11 | consistent |
| proof reissuance | Sections 1.6/1.7 | A17/I10-I11 | consistent: new event |
| H-10 validity versus semantic authority | Sections 1.6/1.7/9.1 | A03/A16/T13/T30 | consistent: validity creates no authority |
| H-11 history versus present authority | Sections 1.5/1.7/9.2 | A13/I10/T14/T28 | consistent |
| Workspace narrowing-only | constitutional boundary | T02/T32, matrix, ledger | consistent |
| Trust distinct from IAA | constitutional boundary | T03/T33 | consistent |
| Trust distinct from enforcer | Sections 5.7/6.3/8.2 | T04/T31/R3G02-R3G05/HT01-HT03 | consistent |

```text
CROSS_SECTION_CONTRADICTION_COUNT=0
UPSTREAM_CONFLICT_COUNT=0
UPSTREAM_DEPENDENCY_COUNT=0
OPEN_AS_APPLICABLE_PRIMARY_OUTCOME_COUNT=0
```

## 11.2 Production-grade source, failure, security, and privacy audit

The complete source-model audit closes the historical grammar, top-level multiplicity, source-coordinate overlap, Stage-B classifier, and current-population-consumer defects: every historical caller is in one closed tagged union and maps through one total H-02-owned question function; answers remain outside identity; the combined D/x record classifies coordinate, cardinality, and role before verification; accepted top-level H-13 set membership is distinct from accepted inner occurrence multiplicity and H-02 reference multiplicity; fixed-point rediscovery cannot create duplicates; inner families cannot be set-deduplicated; Producer lifecycle and source-native closures remain intact; and Tables 2-D1 through 2-D4 are exact with dependency/nested traversal stopped. Sections 4.4, 5.4, and 5.5 consume that same total population. Accepted H-13-S3 supplies all ten outer constructors, both literal branches, eight raw-family branches, twenty raw-node rows including the four dependent owner-native branches, three lifecycle resolution outcomes, and nine placeholder branches. Every legal finite F is classified through the disjoint zero/positive split, without treating placeholder existence as equivalent to emptiness. CR13-01 through CR13-12 confirm that valid Stage-B records are supported, invalid-input failure remains outside the legal domain, and source multiplicity is invariant under reference fan-out. The audit found no uncovered or overlapping legal branch and no upstream conflict.

Every construction whose facts fix a failure has exactly one primary `failed`, `unavailable`, `indeterminate`, or `contradictory` disposition. H-11's five historical outcomes remain literal; H-02 adds only qualification availability and occurrence-family consequences without a substitute interval verdict. Mapping creation has one exact event question per immutable mapping, a field-total scope predicate, exact-once event-representation cardinality, and a current-use binding to that same singular event. Table 8.3 assigns an exact mandatory protected-reason set to every forbidden edge. The complete semantic scan has zero unqualified open primary-outcome alternatives. Conditional prose remains only where an exact prior predicate selects the branch.

R8-30 through R8-36 remain exact for `ExactTenantContext`, `ParticipantSide`, and one exact Connection. The hostile cases preserve rejection of: one physical Trust service, key, proof bytes, digest/reference, mapping, or protected carrier reused across unequal contexts; controller replacement and proof/mapping replay; result or mapping replay to another Connection; host/agent substitution or carrier collision; retired/historical carrier recycling; same-provider/key substitution across unequal controller/context; tenant/Connection presentation-class substitution; historical proof/mapping as present authority; and Trust substitution for permission, measurement truth, H-13 evaluation, policy, Approval, or final authority. Cryptographic validity, mapping currentness, or historical verification waives none of these authority/privacy predicates.

The Revision 13 repair adds no authority and exposes no new tenant-safe field. Source substitution is blocked by the combined exact D/x coordinate/class/role dispatch; owner substitution by total no-guess lifecycle resolution; cross-Q intrinsic duplication by Q-independent intrinsic identity; malformed-owner guessing by retained zero/multiple resolution; reference/source aliasing by distinct objects and multiplicities; duplicate hiding by occurrence-family retention; dependency-based source promotion by exact-empty wrappers; empty-family failure fabrication by the neutral zero-member constructor; representation-based classification by the invalid-input guard; aggregate flattening by traversal stops; unknown constructors by fixed failure; stale/post-freeze result feedback by frozen-population classification; and the stale Section 5.4 Table 2-D1 through 2-D3-only consumer by the exact `TrustIsolationCurrentRequiredReferencePopulation(E)` definition. Trust widening remains blocked by the unchanged evidence-only type law, and privacy leakage remains blocked by retaining every classifier/reason detail solely in the protected result domain. No new tenant-visible category exists.

# 12. Human decision matrix, consequences, and residual risks

The following is the only Revision 13 proposal. Alternatives remain nonaccepted rationale. The first matrix makes the bounded current-population repair and every preserved semantic boundary explicit; none is delegated to implementation.

| Material choice | Security consequence | Privacy consequence | Clean-room consequence | Operability consequence | Implementation consequence | Conformance-test consequence | Recommendation | Exact reason |
|---|---|---|---|---|---|---|---|---|
| Producer intrinsic lifecycle member model | prevents generic-tag divergence, event collision, wrapper recursion, and double counting | excludes proof/key/provider/process/transport correlators | four family branches and literal accepted change tags give one projection | retains unique order, concurrency, and actual event multiplicity | dispatch by accepted raw-family field and closed change tag; wrapper verified separately | K16-K25 and Table 2-C are mandatory | accept newly proposed H-02-S2 closed projection | accepted H-13 supplies four distinct raw families and a separate direct-attribution wrapper family, but no caller-defined taxonomy |
| historical caller/subject/question versus H-11 answer/input | prevents an answer or caller-selected tag from defining its own question/source grouping | returned scope/result stays protected and outside identity | seven exact caller branches map one-to-one through an H-02-owned coordinate; accepted H-11 supplies no competing coordinate | result availability may change later resolution but never question/source keys | construct caller, subject, question, and domain first; consume `TrustHistoricalQualificationInput` second | HQ01-HQ14/FBE22/CYC30 are mandatory | accept closed H-02 subject/question grammar | an answer is evidence supplied to a question, never part of question equality |
| accepted H-13 top-level set and inner multiplicity | prevents discovery passes from manufacturing source duplicates and set projection from erasing raw repetitions | adds no identity/correlation field | top-level mathematical set, accepted inner occurrence family, and H-02 reference family are three distinct levels | preserves owner-native counts without repeated fixed-point artifacts | retain exact accepted set; read counts only from accepted inner owner fields; derive closed-container references separately | SM01-SM06 are mandatory | accept literal H-13 set semantics and delete Revision 9 wrapper/multiset | accepted H-13 Section 4 makes finite-set multiplicity absent |
| Stage-B member classification | fail-closes caller tags, type heuristics, discovery provenance, owner guessing, and dependency promotion | invents no H-13 or carrier identity and exposes no new safe category | accepted H-13-S3's ten constructors plus exact dependent unions give one total/disjoint result | direct sources/placeholders/unique lifecycle owners are referenced; structural, nested, and wrapper members are exact empty; malformed ownership is retained fail-closed | dispatch only on accepted constructor/value and exact subtype; never reflect or traverse | S3M01-S3M10, RF11-RF37, LCR01-LCR15, FP/SAN/QD/INV cases are mandatory | accept the closed H-02 Table 2-D4 classifier | H-13-S3 now supplies the exact structural prerequisite while leaving Trust classification to H-02 |
| specific/generic source-coordinate and cardinality dispatch | prevents source aliases, row-order changes, and independent coordinate/class decisions | adds no identity or visible field | exact D plus accepted x type selects one combined record | clean rooms cannot select legacy versus generic or atomic versus aggregate | implement Tables 2-A0/2-A1 as one typed function returning coordinate, role, and class | SG01-SG39 are mandatory | accept the combined dispatch | accepted semantic source type, not textual position, owns the branch |
| legal empty raw family | prevents fallthrough, fabricated missing-source failure, and placeholder double counting | adds no source or carrier | finite-family cardinality is exactly zero or positive; zero has one neutral constructor | complete-empty families remain representable; real placeholders remain separately adverse | return `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` for zero and never synthesize a placeholder | EF01-EF38 are mandatory | accept neutral authority-free exact empty for every legal D | accepted H-13 specifies no nonempty invariant and defines placeholders as separate members |
| owner-native occurrence versus H-13 projection reference | prevents candidate/provenance fan-out from manufacturing duplicates or hiding real source conflicts | adds no new carrier identity | source count comes only from owner family; Tables 2-D1 through 2-D4 produce exact reference families | preserves closed direct provenance without changing source throughput | retain all three cardinality levels separately; never reflect or traverse dependencies/nested containers | PREF01-PREF07, REFGEN01-REFGEN23, RF11-RF37, LCR01-LCR15, SM01-SM06, and repaired R3K01 are mandatory | accept strict source/reference separation and exact Stage-B dispatch | a reference is evidence about an existing source value, not a source issuance; accepted H-13 grammar remains unchanged |
| presentation-mapping scope/singular event/creation authority | prevents self-qualified events, retroactive controller authority, same-M later-event selection, post-vacancy mapping, and proof-to-mapping repair | preserves exact context/class/side/Connection scope and nonrecycling | one M has one event question; representation family and authorization relation are separate total types | genuine later creation requires new nonrecycled M2; same-M duplicate/conflict never repairs | retain singular event plus representation cardinality, separate literal H-11 input, independent H-02 appointment/scope/coherence, and event-bound current-use relation | MAP01-MAP30/ME01-ME08/PRV16-PRV30/CYC29 are mandatory | require one evaluable event representation plus one matching `authorized-at-creation` relation and satisfied binding before use | no timestamp/UUID/sequence/record identity can split M's semantic event |
| literal H-11 historical outcome consumption | prevents H-02 from relabeling missing bytes, unsupported profiles, invalidity, or H-11 uncertainty | safe projection reveals only existing coarse categories when disclosure is allowed | all five H-11 tokens are literal; protected `h11-history(...)`, optional safe category, and structural `unsupported-required-semantics` are disjoint | missing result may be retried without new H-11 vocabulary | consume `TrustHistoricalQualificationInput`; map `historically_unsupported` to Trust indeterminate plus exact protected H-11 reason; project the safe category only with permission | E19-E22, H11H01-H11H11, and MAP05-MAP07 are mandatory | preserve H-11 semantics and reason typing exactly | H-11 owns historical conclusions; H-02 owns only its separate wrapper/appointment and its structural grammar failures |
| forbidden-edge reason classification | prevents generic cycle labels from hiding authority substitution, historical-answer feedback, or count feedback | reveals no graph detail in safe output | every FBE01-FBE22 row has one exact mandatory reason set | proved edges reject deterministically; absent, ambiguous, and conflicting graph evidence remains separately classified | dispatch on the closed edge-family table and union only independently proved row sets | CYC01-CYC30 are mandatory | accept Table 8.3 as total | edge ownership, not caller choice, fixes the reason set |
| exact-once atomic versus multiplicity-bearing atomic versus exact-once aggregate representation | prevents event collapse, artificial duplicates, and double counting | adds no carrier or cross-context identity | every family receives one Table 2-C class | preserves legitimate H-13 source throughput and exposes real duplication | dispatch by closed source-family tag before verification | K07-K15 and every Table 2-C row are mandatory | accept closed three-class rule | accepted H-13 distinguishes atomic members from records carrying complete families |
| lifecycle observation member coordinate | preserves distinct ordered/concurrent changes and makes same-event content conflict visible | excludes provider/proof/storage correlators | same event facts produce the same member grouping | supports valid multi-event intervals without winner selection | project owner slot, source, event family, affected set, and semantic position only | K07-K10/K13 | accept `BindingLifecycleObservationNativeCoordinate` | before/after are content under validation; accepted position/affected semantics supply identity |
| lifecycle direct-attribution member coordinate | prevents several attributed lifecycle subjects from colliding and prevents attribution recursion | excludes authentication verdict and proof identity | wrapper-omitted subject deterministically keys attribution | permits one source to attribute several valid members | use the closed observation/coverage tagged subject projection | K12/K13 | accept `BindingLifecycleAttributedSubjectCoordinate` | accepted direct attribution explicitly carries asserted content with its wrapper omitted |
| definitively known appointment-boundary crossing | denies proof creation when no controller occupied the entire interval | no new disclosure; protected reason only | one resolved crossing always has one disposition | may reject proofs spanning rotations/vacancy; reissue is available | return `failed`, never uncertainty | I04-I06/A15 | classify `failed` | appointed-throughout-entire-interval is definitively false |
| unavailable interval evidence | prevents assumed appointment | safe projection may reveal only evidence-unavailable | absence/unobtainability is distinct from ambiguity | fail-closed availability cost | return `unavailable` | I07 | classify `unavailable` | required source is absent or unobtainable |
| unresolved interval ordering | prevents arbitrary boundary ordering | no raw order detail exposed | present-but-nonunique order is deterministic | retry/add evidence may resolve | return `indeterminate` | I08 | classify `indeterminate` | evidence exists but cannot uniquely resolve the relation |
| contradictory interval evidence | retains competing authoritative histories and forbids winner selection | conflict detail stays protected | incompatible claims always select one class | requires authority/history repair outside H-02-S2 | return `contradictory` and all reasons | I09 | classify `contradictory` | retained authoritative evidence is mutually incompatible |
| structurally proven dependency cycle | rejects a definitively invalid construction | no new visible graph disclosure | any proved forbidden cycle is failed | immediate deterministic rejection | return `failed` with owning cycle reason | CYC01-CYC07/E14/T26 | classify `failed` | structural acyclicity predicate is definitively false |
| missing dependency evidence | prevents assuming acyclicity | graph absence remains protected | missing graph is distinct from unresolved direction | evidence must be obtained before use | return `unavailable` | CYC08 | classify `unavailable` | required dependency source is absent or unobtainable |
| ambiguous dependency graph | prevents verifier-chosen edge direction | no protected edge leak | present unresolved graph always maps identically | may require better provenance | return `indeterminate` | CYC09 | classify `indeterminate` | evidence exists but acyclicity cannot be uniquely resolved |
| conflicting dependency graphs | prevents authoritative graph winner selection | conflict detail remains protected | incompatible retained graphs always map identically | requires upstream reconciliation | return `contradictory` plus owning reasons | CYC10 | classify `contradictory` | retained authoritative structures are mutually incompatible |
| authoritative-current known vacant Trust role | rejects use when positive occupant predicate is definitively false and separates it from missing history | safe output exposes at most governance-nonauthorizing | known vacancy and missing evidence cannot diverge | deliberate outage until Organization appoints a controller | return `failed` with `role-occupancy-vacant`; zero/missing evidence remains unavailable | A02/A09 plus safe-projection test | classify known vacancy `failed` | authoritative evidence resolves that no positive verifier occupant exists |

The vacancy choice is a proposal-level semantic decision, not an inference hidden in code. It uses the six-status vocabulary consistently: protected result/current-use disposition `failed`, safe status `verification-failed`, optional safe reason `underlying-governance-nonauthorizing`, and no current-use authority. Missing or unobtainable role revision/history evidence remains `unavailable`/`verification-unavailable`.

The preserved architecture matrix follows.

| Material choice | Rejected alternatives | Security/privacy/operability consequence | Revision 13 proposal |
|---|---|---|---|
| Trust role occupant | infer from key/provider; multiple winner-selected services | lets crypto create authority or hides conflict | one Organization-authored context-private role slot/controller |
| Appointment owner | H-10; H-11; Workspace; provider | would invent semantic authority or violate narrowing-only | exact Organization authority, bounded to R8-05 role appointment |
| Controller identity | key/provider/global identity; recyclable alias | substitutes mechanics and correlates contexts | context-private nonrecyclable H-02 lineage; replacement gets a new identity |
| Vacancy/replacement | treat known vacancy as missing evidence; delete history; reuse identity; revoke unrelated authority | conflates definitive absence with unavailable evidence, hides proof intervals, or overreaches Trust role | known authoritative vacancy is failed; missing evidence unavailable; immutable history retained; replacement identity nonrecycled; unrelated authority untouched |
| Proof-creation authority | current-result-only rule; signature validity; retroactive appointment | permits unauthorized governance proofs or history repair | one common whole-materialization-interval rule for both result families |
| Current use | creation authority alone; historical success | replays old proof/controller state | separately require authoritative-current occupant, usable proof/key/history, current mapping, and exact cut |
| Raw occurrence key/cardinality | component coordinate; raw bytes; record identity; caller-selected necessary fields, textual row priority, or atomic/aggregate class | causes recursion, representation leakage, aliasing, event collapse, false duplicates, or grouping divergence | closed `SourceNativeOccurrenceCoordinate`, `TrustSourceCardinalityClass`, and one exact Table 2-A0/2-A1 source/member dispatch record |
| Producer intrinsic lifecycle grouping | generic assertion kind; proof/wrapper identity; caller tags | permits clean-room divergence, wrapper recursion, event collision, or duplicate raw count | four closed H-02-S2 projection branches, exact change tags/subjects/position, and separately counted attribution wrapper |
| H-13 source references | use H-13 reference count as source count; caller-supplied direct tag; duplicate fixed-point discoveries; discard accepted inner duplicates; reference-wins matching; reflection; recursive or caller-selected dependency/nested traversal | manufactures/erases occurrences or produces divergent required sets | owner-native family fixes source multiplicity; accepted Stage-B top-level remains a set; Tables 2-D1 through 2-D4 emit exact references and exact-empty results; invalid inputs and malformed ownership fail closed |
| Current authentication-subject reference population | stop at Tables 2-D1 through 2-D3; mark every Stage-B component unsupported; let Section 5.5 derive a different family | omits valid references, fabricates failures, and permits tuple/component divergence | Sections 5.4 and 5.5 consume the identical Tables 2-D1 through 2-D4 population; Table 2-D4 runs once per frozen Stage-B member; only exact branch facts can be adverse |
| Mapping creation authority | self-qualified event; same-M later-event claim; currentness alone; proof validity; later appointment; same provider/key; reusable carrier; invented event ID or purpose/authorization field | permits causal cycles, retroactive authority, event/relation selection, and privacy replay | one singular raw pre-qualification event question per M; retained records are representations; separate field-total authorization relation; new creation requires M2 |
| Historical assessment question | returned input/scope/outcome in question/source identity; H-02-owned interval outcome; generic unresolved tag; low-level H-11 cause inspection; current reconstruction | answer-dependent rekeying, accepted-H-11 reinterpretation, or collapsed owner distinctions | answer-independent question and raw domain first; separate literal five-token H-11 input/post-question scope resolution; independent H-02 appointment consequences |
| Multi-predicate inspection | copy one raw occurrence per component | multiplies cardinality as verification evolves | shared references to one immutable raw family; component-count invariance |
| Missing, malformed, unavailable, and empty inputs | generic/fabricated placeholder; equate empty F with placeholder; silent drop; raw bytes in body | fabricates content, double counts, or fails open | neutral exact-empty raw-family result; owner-typed explicit placeholder only when accepted H-13 supplies it; H-10 failure observation outside raw content |
| Source population | component/provider/status-selected extent | permits omission attacks and divergent counts | exact complete raw domain/family before component generation |
| Current result cardinality | one Connection result; implementation-selected side | invents one tenant context or enables side substitution | exactly two subjects, host and agent, each bound to its exact side key/context |
| Connection consumption | either side sufficient; side result cross-dependency; winner selection | permits unilateral evidence or cycles | later exact two-member evidence set; both sides independently favorable and coherent |
| Shared H-13 value | one side edits/recalculates; aggregate chooses | creates competing isolation truth | both bodies carry the same exact complete H-13 evaluation; H-13 alone owns it |
| Trust aggregate scope | open set of peer/enforcer gates; policy/Approval/H-13-value input | couples stable Trust semantics to an evolving authority intersection and creates cycles | closed Trust-specific evidence set/reasons/disposition only |
| H-13 decision and Trust favorability | require H-13 pass for Trust success; allow Trust to rewrite H-13 | conflates verification success with independently owned isolation authorization | exact H-13 value is structurally verified but does not determine Trust favorability |
| Aggregate authority | Connection permission/ALLOW; H-13 override | transfers authority to Trust | evidence-only narrowing input; external enforcer independently requires Trust favorable, literal H-13 pass, and every other applicable gate |
| Equal side contexts | collapse to one result/carrier | erases accepted `ParticipantSide` | retain two unequal subjects and two injective carriers |
| Tenant-safe projection | extra disposition/authority/pass fields | exceeds R8-35 and increases correlation | exactly five categories; nonauthority is type law; H-13 nonauthority only as safe reason |
| Status/reasons | Boolean; first failure | hides uncertainty and simultaneous faults | six statuses plus full protected reasons and exact aggregate precedence |
| H-10/H-11 boundary | allocate mechanisms here | conflates semantic owner with representation/history | exact semantic handoffs only; later supplements remain separately authorized |

Security improves where local semantics are closed: historical caller/question identity is neither answer- nor implementation-selectable; top-level H-13 set membership cannot create multiplicity; accepted inner counts cannot be silently deduplicated; Tables 2-D1 through 2-D4 remain closed; accepted H-13-S3 constructors determine every Stage-B result; lifecycle owners are never guessed; and dependency, storage, representation, rule, pass, and unknown-tag inputs cannot promote sources. Creation authorization, the singular pre-qualification mapping event, literal H-11 outcome/reason consumption, row-exact forbidden-edge reasons, and two-side Trust consumption remain intact. Final authority remains absent and separately fail-closed on literal H-13 pass and every other applicable enforcer gate.

Privacy remains bounded by context-private controller identities, side-local protected presentations, two injective carriers, and exactly five safe categories. Protected raw populations and role/proof history can still reveal governance, runtime, source, incident, and timing relationships to authorized evaluators. H-12/H-14 access, minimization, retention, disclosure, and operational controls remain necessary and unauthorized here.

Residual risks are not claimed solved:

1. a correctly appointed and authenticated Trust controller can lie about verification work;
2. Organization appointment governance or controller allocation can be compromised;
3. H-10/H-11 realizations can authenticate, order, or history-qualify incorrectly;
4. a source can suppress evidence despite a declared finite boundary;
5. a faulty realization can accidentally reuse context-private references or carriers;
6. coarse safe status/reason categories can reveal incident state;
7. two-side and fail-closed dependencies can cause outages;
8. tenant-governance observation remains unavailable until a reviewed semantic cut exists; and
9. no operational exact-controller-authenticated result exists until separately accepted H-10/H-11 isolation semantics realize the handoffs; and
10. independent hostile review may still find a defect in this proposed H-02 classification or source projection; this self-review is not acceptance evidence.

None permits weakening, silent inference, retroactive authority, unilateral-side success, or implementation-defined fallthrough.

# 13. Revision 13 exact finding and nonregression ledger

## 13.0 `R12_B_001_CURRENT_AUTHENTICATION_SUBJECT_POPULATION_STALE_STAGE_B_FAILURE_RULE`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Revision 12 defect: Section 5.4's operative formal tuple generated current required references only through Tables 2-D1 through 2-D3 and retained the Stage-B population reference component as failed with `unsupported-required-semantics` under Table 2-D4. That contradicted the total Tables 2-D1 through 2-D4 generation rule already stated by Sections 2.1, 4.4, 5.4 prose, and 5.5.
- Revision 13 repair: `TrustIsolationCurrentRequiredReferencePopulation(E)` is the exact multiplicity-preserving union of every supported container's `H13RequiredSourceProjectionReferenceFamily(container)` under Tables 2-D1 through 2-D4. For an accepted Stage-B record, Table 2-D4 is applied exactly once to every member of the frozen mathematical set. The Section 5.4 tuple and prose, Section 5.5 component set, and Section 8.1 DAG consume that same named population.
- Valid-member consequences: nonempty raw families emit their exact direct references; zero-member raw families remain `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY`; structural, nested, and question-wrapper members remain exact empty; lifecycle direct and retained-failure rows remain exact; and no valid Stage-B member is forced unsupported merely because it is Stage B.
- Invalid boundary: only input outside the accepted ten-constructor/dependent grammar, including an invented eleventh constructor or D/value mismatch, receives `H13StageBInvalidInputResult`. Invalid-input failure is not applied to a valid Stage-B record or member.
- Multiplicity and mechanism boundary: references remain separately retained and cannot change owner-native source multiplicity. Dependency traversal, reflection, storage shape, discovery order, caller choice, and provider mechanisms remain nonsemantic.
- Hostile proof: CR13-01 through CR13-12 cover nonempty/empty raw families, placeholders, lifecycle unique/zero/duplicate-equal ownership, structural/nested/question empties, invalid input, obsolete subset and blanket-failure implementations, clean-room equality, and multi-path reference fan-out.
- Dependent closure: `R9_B_002`, `R8_B_003`, the `R7_B_002` Stage-B remainder, and the `R6_B_003` Stage-B remainder are closed again because their total classifier/reference construction now has a matching operative current-population consumer. `R11_B_001`, `R11_B_002`, and `R3_B_001` remain closed and are not weakened.
- Final disposition: `R12_B_001=CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.0.1 `R11_B_001_SPECIFIC_VS_GENERIC_SOURCE_COORDINATE_PRECEDENCE_NOT_CLOSED`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Revision 11 defect: `SpecificTable2ASourceCoordinateMatchFamily` named a finite family through prose predicates, while the generic Table 2-A and 2-C rows depended on textual specificity relationships. The accepted source type did not mechanically identify membership.
- Revision 12 repair: the former match family is deleted. `R12H13RawSourceDispatchOf(D,x)` is one typed function over the exact legal accepted domain and returns exactly one tagged record carrying coordinate, cardinality class, and role. Tables 2-A0 and 2-A1 enumerate every legal existing-native and generic-native outcome.
- Totality/disjointness: the accepted D outer/dependent tag selects one Table 2-A1 row; in a mixed row the accepted semantic x type selects one Table 2-A0 record. A D/x type mismatch is invalid input. No priority, complement, table position, ranking, or implementation preference exists.
- Alias law: existing-native sources always return their existing tag/coordinate even through multiple H-13 paths; generic-only sources use the unique accepted Section 7.1 owner D. Thus one semantic source cannot acquire both an existing and generic raw key.
- Shared cardinality law: `H13S3SourceCoordinateResolution`, `H13S3SourceCardinalityClassOf`, and `H13S3DirectSourceSemanticRoleOf` are projections of the same dispatch record. They cannot disagree on overlap.
- Hostile proof: SG01-SG39 and EF01-EF28 cover every Table 2-A1 boundary, table reordering, both forbidden implementation choices, aliases, and equal-input clean-room equality.
- Final disposition: `R11_B_001=STILL_CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.0.2 `R11_B_002_EMPTY_RAW_FAMILY_CLASSIFIER_NOT_TOTAL`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Revision 11 defect: Table 2-D4 defined the positive-cardinality case and one placeholder-associated empty case, but it did not classify every legal empty F and improperly linked raw-family emptiness to placeholder existence.
- Accepted-domain audit: H-13-S3 Sections 6.2 and 8.2 define exact complete finite occurrence/candidate families without a nonempty invariant. Sections 7.2, 8, 9.1, and 9.3 define raw-family and placeholder members independently. Revision 12 invents no contrary H-13 premise.
- Revision 12 repair: `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` has exact empty references, no primary disposition, empty reasons, and authority none. The natural-number split `cardinality(F)=0` versus `cardinality(F)>0` is disjoint and total.
- Complete audit: the eight D rows, twenty raw-node subtypes, seven producer-intrinsic classes, and event-policy no-placeholder branch are explicit. EF01-EF38 cover F=0, F=1, F=N, required unresolved input with a real placeholder, optional/complete-zero input, real-placeholder coexistence, no-placeholder input, and fabrication/suppression attacks.
- Independence: empty F never creates a placeholder; a real accepted placeholder remains classified once; empty F plus a real placeholder yields zero raw references and one placeholder reference. A missing required co-emitted member remains an enclosing population-completeness defect.
- Final disposition: `R11_B_002=STILL_CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.1 `R9_B_001_HISTORICAL_QUESTION_SUBJECT_AND_EXPECTED_H11_COORDINATE_GRAMMAR_UNCLOSED`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Accepted H-11 audit: no generic historical question/result coordinate exists; its Section 13 `Question` cells are descriptive and it contains no `coordinate` type.
- Exact repair: Section 3.2 defines seven exhaustive `TrustIsolationHistoricalCaller` and `TrustIsolationHistoricalSemanticSubject` branches, the total same-position `TrustIsolationHistoricalSubjectOf` function, and one H-02-owned fixed-purpose `TrustIsolationHistoricalQualificationQuestionCoordinate` through `TrustIsolationHistoricalQuestionFor`.
- Answer independence: input availability, result occurrences/outcomes, returned scope, duplicate/conflict state, Trust state, current row, proof/verifier result, record ID, and timestamp remain outside equality. FBE22/CYC30 remain exact.
- Hostile cases: HQ01-HQ14 prove branch totality, clean-room equality, non-retyping, invented-coordinate rejection, and one-question answer conflict.
- Upstream ownership: H-11 retains current-head/history mechanics, materialization evidence, revocation/compromise/rollback/fork, trusted-time mechanics, and its five outcomes; H-02 owns only the bounded semantic question.
- Final disposition: `R9_B_001=STILL_CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.2 `R9_B_002_STAGE_B_ACTUAL_MEMBER_CLASSIFIER_STILL_NOT_AN_EXACT_ACCEPTED_H13_MEMBER_GRAMMAR`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Original defect: Revision 10 could not classify actual Stage-B members because accepted H-13-S2 did not provide an exhaustive top-level constructor grammar; the only conforming result was the recorded upstream stop.
- Exact accepted prerequisite now available: accepted H-13-S3 Section 8 defines the exact ten-constructor `H13EvaluationPopulationMember` union, componentwise equality, top-level set semantics, inner multiplicity boundary, exact seed/expansion codomain, malformed/unknown boundary, eight raw-family branches, twenty raw-node rows including the dependent four-way owner-native branch, total lifecycle reference/owner resolution, and nine placeholder branches.
- Exact Revision 12 construction: Section 2.1/Table 2-D4 defines one H-02-owned, closed, total, disjoint classifier over that exact union; every dependent union has an explicit subdispatch; Tables 2-A0/2-A1 jointly fix source coordinate, role, and class; the zero/positive F split fixes every empty and nonempty family; direct paths, lifecycle failure outcomes, invalid-input failure, multiplicity, and traversal boundaries are fixed.
- Hostile proof: S3M01-S3M10, RF11-RF37, SG01-SG39, EF01-EF38, LCR01-LCR15, FP01-FP09, SAN01-SAN04, QD01-QD08, INV01-INV10, SB01-SB10, REFGEN17-REFGEN20, and the determinism matrix cover every legal/invalid branch and representation/order/dependency attack.
- New H-02 semantic choice: **YES, bounded.** H-02 chooses which accepted H-13-S3 structures produce Trust source-projection references or exact-empty results and fixes failure consequences. This creates evidence/reference semantics only and authority `none`.
- Accepted H-13 meaning changed: **NO.** No member, equality rule, source occurrence, owner, fixed-point step, wrapper, `RequiredNodeCoordinateSet`, result, reason, or authority is modified.
- Revision 13 dependent re-audit: Sections 5.4 and 5.5 now consume the total Table 2-D4 classifier for every frozen Stage-B member through the same named Tables 2-D1 through 2-D4 population. CR13-01 through CR13-11 prove that no valid accepted member is rejected by a stale consumer.
- Final disposition after the Revision 13 consumer repair: `R9_B_002=CLOSED_IN_REVISION_13_PROPOSAL`; `UPSTREAM_CONFLICT_COUNT=0`.

## 13.3 `R9_B_003_ACCEPTED_H13_STAGE_B_FIXED_POINT_SET_RECAST_AS_MULTIPLICITY_FUNCTION`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Exact repair: `H13EvaluationPopulationMembers` is retained literally as the accepted mathematical set/least fixed point. No H-02 type is declared equal to it as a multiplicity function; no discovery order/count enters equality.
- Separate levels: top-level set cardinality, accepted inner occurrence/candidate-family multiplicity, and `H13SourceProjectionReferenceFamily` multiplicity remain distinct and cannot allocate or deduplicate one another.
- Stage-A nesting: the accepted nested `StageAResolvedPopulation` is an outer traversal stop; its inner Organization/Workspace governance sources are not flattened into invented Stage-B members.
- Hostile cases: SM01-SM06 cover rediscovery, inner count three, equal raw repetitions, discovery-to-count conversion, inner set-deduplication, and equal-population clean-room consequences.
- Final disposition: `R9_B_003=STILL_CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.4 `R8_B_001_HISTORICAL_QUESTION_IDENTITY_CONTAINS_H11_RESULT_INPUT`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Original defect: Revision 8 placed the complete `TrustHistoricalQualificationInput`—including availability, returned H-11 result occurrences, and returned evidence scope—inside historical-question equality and then reused that question in the population boundary and logical source domain.
- Exact repair: Sections 1.5/1.6 and 3.1-3.7 define one answer-independent H-02-owned question through the closed caller/subject function. The separate `TrustHistoricalQualificationInput` is supplied afterward; its returned evidence scope is used only by `TrustIsolationHistoricalPopulationResolution` after question, boundary, logical domain, and raw grouping are fixed. Competing results remain answers to one question.
- Forbidden edge and hostile cases: FBE22/CYC30 assign exact protected reason `historical-answer-to-question-identity-feedback`; HQ01-HQ14 cover the closed domain, missing/literal/conflicting results, availability/scope embedding, source rekeying, branch retyping, and invented coordinate rejection.
- Why bounded: no H-11 outcome, evidence scope, interval, record, or mechanism changes. Only H-02 question/input/source-domain causal placement is corrected.
- Prior accepted semantic meaning changed: **NO.**
- Final disposition: `R8_B_001_ORIGINAL_CAUSAL_DEFECT=STILL_CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.5 `R8_B_002_MAPPING_CREATION_EVENT_CANNOT_DISTINGUISH_REPEATED_SAME_MAPPING_MATERIALIZATION`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Original defect: Revision 8 correctly defined a minimal event tuple and one coordinate per immutable M, but then said a same-M later claim was automatically an unequal event despite having no semantic discriminator.
- Exact repair: Section 7.4 states that M has one singular semantic creation-event question. Retained records are representations of that event: zero is unavailable, one evaluates, equal duplicates are indeterminate, and unequal values at the coordinate are contradictory. Claim time, later appointment, currentness, and H-11 outcome cannot split or select an event. Conflicting H-11 qualifications remain one-event/one-question evidence conflicts.
- New creation: only a new context-safe nonrecycled carrier can yield M2, its own singular event question, and independent qualification/authorization. M2 never repairs M.
- Hostile cases: MAP11A-MAP11D, MAP16A-MAP16B, MAP30, and ME01-ME08.
- Why bounded: the Revision 8 minimal pre-qualification event and separate authorization relation remain intact; only inconsistent repeated-materialization prose is closed.
- Prior accepted semantic meaning changed: **NO.**
- Final disposition: `R8_B_002=STILL_CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.6 `R8_B_003_STAGE_B_MEMBER_TO_DIRECT_SOURCE_CLASSIFICATION_FUNCTION_UNCLOSED`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Original defect: Revision 8 closed the output tag/path algebra but used derived H-02 `stage-b-direct(...)` tags as input authority instead of deriving classification from actual accepted H-13 members.
- Exact accepted prerequisite: H-13-S3 supplies the ten legal outer constructors and every dependent structural type required to inspect them without reflection or discovery provenance.
- Exact Revision 12 construction: `H13StageBMemberReferenceClassificationOf` accepts only an exact `H13EvaluationPopulationMember`; `stage-b-direct(...)` exists only in the closed derived-output path union. Table 2-D4 fixes all direct, structural-empty, nested-empty, wrapper-empty, neutral raw-family-empty, retained-failure-empty, and invalid consequences. The one D/x dispatch fixes the direct source branch without caller choice.
- Hostile proof: S3M01-S3M10, SB01-SB10, SG01-SG39, EF01-EF38, QD01-QD08, INV01-INV10, REFGEN01-REFGEN23, and PREF01-PREF07 prove caller-tag nonauthority, totality, traversal stops, empty-family closure, and source/reference separation.
- New H-02 semantic choice: **YES, bounded to reference classification.** Accepted H-13 did not choose Trust directness; H-02 now does so without granting authority.
- Accepted H-13 meaning changed: **NO.** Population construction, equality, multiplicity, provenance, dependencies, and result meaning remain unchanged.
- Revision 13 dependent re-audit: the Table 2-D4 classifier remains accepted-member-driven, and the repaired Section 5.4 current population now invokes it once for every frozen Stage-B member instead of replacing all Stage-B outcomes with one unsupported failure. CR13-01 through CR13-10 prove the input/output boundary.
- Final disposition after the Revision 13 consumer repair: `R8_B_003=CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.7 `R8_m_001_MAP16_NONDETERMINISTIC_AS_APPLICABLE_AND_FALSE_AUDIT_CLAIM`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Original defect: MAP16 left prior M at an open failed-or-contradictory outcome while Section 11.2 claimed no open primary alternatives.
- Exact repair: MAP16A fixes a prior failed M and preserves `failed`; MAP16B fixes prior contradictory evidence and preserves `contradictory`. New M2 is independently evaluated in both. The complete artifact scan contains no open primary-outcome phrase.
- Why bounded: only fixed-fact case dispatch and audit accuracy change.
- Prior accepted semantic meaning changed: **NO.**
- Final disposition: `R8_m_001=STILL_CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.8 `R7_B_001_MAPPING_CREATION_EVENT_SELF_QUALIFICATION_AND_TYPE_CYCLE`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Original defect: Revision 7 put H-11 qualification, role revision, field-total scope, and the H-02 appointment predicate inside `TrustIsolationResultPresentationMappingCreationEvent`, then spoke of an event “whose creation disposition is authorized-at-creation.” The event was constructed from downstream facts that were supposed to qualify it, and the event type contained no disposition.
- Exact repair: Section 7.4 makes the raw event contain only its exact coordinate, immutable mapping, semantic author/controller, and intrinsic occurrence fact. A separate authorization relation consumes that already-existing singular event, exact controller/authorized-controller coordinate, role revision, scope, exact H-02-owned mapping-creation historical question, separately supplied `TrustHistoricalQualificationInput`, appointment predicate, coherence predicate, and derived disposition. Current use separately binds M, the event, one matching relation whose disposition is `authorized-at-creation`, event-bound H-11 lineage, and the cut.
- Canonical sections: 1.5/1.7, 7.4, 8.1/8.3, 9.1/9.2.
- Hostile cases: MAP01-MAP30, ME01-ME08, PRV28-PRV30, and CYC16-CYC19/CYC29.
- Why bounded: the repair changes only causal/type placement required by the finding. It preserves one coordinate per immutable M, exact-once event semantics, nonrecycling, nonretroactivity, field-total scope, controller replacement consumption, and proof/mapping independence.
- Prior accepted semantic meaning changed: **NO.** No accepted H-02-S1, H-10, H-11, H-13, H-07, D1, or D2 meaning changes; no mechanism is allocated.
- Final disposition: `R7_B_001=STILL_CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.9 `R7_B_002_H13_SOURCE_REFERENCE_DIRECT_PATH_GRAMMAR_UNCLOSED`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Original defect: Revision 7 used open prose such as “represented-value field/inner-occurrence path,” “directly contains,” and “accepted Stage-B source-bearing member tag,” leaving directness, traversal, member classification, and aggregate boundaries implementation-selectable.
- Exact accepted prerequisite: H-13-S3 closes the actual member, raw-family, raw-node, lifecycle-reference, placeholder, equality, and aggregate grammars.
- Exact Revision 12 construction: Tables 2-D1 through 2-D3 remain unchanged for candidates, Stage A, and all seventy-one `ProvenanceNodeType` records. Table 2-D4 provides every exact Stage-B path and empty result. Tables 2-A0/2-A1 fix native coordinates/classes/roles, including all specific/generic boundaries, while the zero/positive F split closes every empty family. Output tags, row order, reflection, dependencies, representation, and discovery pass cannot classify or promote sources.
- Hostile proof: PREF01-PREF07, REFGEN01-REFGEN23, S3M01-S3M10, RF11-RF37, SG01-SG39, EF01-EF38, LCR01-LCR15, SAN01-SAN04, QD01-QD08, INV01-INV10, and SB01-SB10.
- New H-02 semantic choice: **YES, only the formerly missing Stage-B direct/empty/reference partition.**
- Accepted H-13 meaning changed: **NO.** Owner-native multiplicity, source/reference distinction, H-13 grammar, fixed point, and dependencies are preserved literally.
- Revision 13 dependent re-audit: the exact Table 2-D4 path/empty/failure partition is now consumed by Section 5.4, Section 5.5, and the DAG through one extensionally equal Tables 2-D1 through 2-D4 population. CR13-01 through CR13-12 prove direct paths, traversal stops, invalid input, and reference/source separation at the operative consumer.
- Final disposition after the Revision 13 consumer repair: `R7_B_002=CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.10 `R7_B_003_H11_UNSUPPORTED_PROTECTED_REASON_TYPE_INCONSISTENT`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Original defect: Revision 7 inconsistently treated safe `unsupported-profile-or-history` and structural `unsupported-required-semantics` as reasons for literal H-11 `historically_unsupported`.
- Exact repair: the upstream token remains `historically_unsupported`; Trust primary disposition is `indeterminate`; protected internal reason is exactly `h11-history(historically_unsupported)`; optional tenant-safe category is `unsupported-profile-or-history` only when disclosure is allowed. `unsupported-required-semantics` is reserved for an H-02-S2 missing/unrecognized structural class or closed projection/path rule.
- Canonical sections: 1.6, 4.1/4.2, 6.1, 7.3/7.4, and 9.2.
- Hostile cases: E19-E22, H11H01-H11H11, MAP05-MAP07/MAP22-MAP23.
- Why bounded: no H-11 token or meaning changes; only H-02 protected-versus-safe reason typing is corrected.
- Prior accepted semantic meaning changed: **NO.**
- Final disposition: `R7_B_003=STILL_CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.11 `R7_m_001_CROSS_SECTION_AUDIT_REFERENCES_STALE_OR_MISINDEXED`

**CLOSED IN THIS PROPOSAL; INDEPENDENT REVIEW STILL REQUIRED.**

- Original defect: the Revision 7 audit cited `H11H06` for absent H-11 input and `H11H08` for conflicting H-11/event occurrences, and several self-review number references no longer matched their questions.
- Exact repair: Section 11.1 cites absent input to E20/H11H01/HQ01/MAP05/MAP22, conflicts to E21/H11H06/HQ05/MAP07/MAP15/ME06, appointment crossing to A15/I04-I06/H11H08/MAP04/MAP23, mapping causality to MAP21-MAP30/ME01-ME08/CYC29, historical domain/feedback to HQ01-HQ14/CYC30, Stage-B classifier and multiplicity behavior to S3M/RF/LCR/FP/SAN/QD/INV/SB/SM cases, exact FBE cases, and the explicit Revision 11 self-review.
- Canonical sections: 10.1-10.13, 11.1, 12, 13, and 14.
- Hostile cases: all cited case families, especially E19-E22, H11H01-H11H11, HQ01-HQ14, MAP01-MAP30, ME01-ME08, CYC01-CYC30, PREF01-PREF07, REFGEN01-REFGEN23, SB01-SB10, and SM01-SM06.
- Why bounded: only trace/cross-reference correctness changes; no substantive accepted or previously closed consequence is reopened.
- Prior accepted semantic meaning changed: **NO.**
- Final disposition: `R7_m_001=STILL_CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.12 `R6_B_001_H11_HISTORICAL_OUTCOME_SEMANTICS_REINTERPRETED`

**CLOSED.**

- Sections 3.2/3.4/3.5 and 4.1/4.2 consume H-11-owned qualification/result occurrences supplied for the exact H-02-owned question coordinate and retain, without renaming, all five accepted outcomes: `historically_verified`, `historically_verified_with_current_revocation`, `historically_invalid`, `historically_indeterminate`, and `historically_unsupported`.
- The answer-independent historical question is fixed before the separate `TrustHistoricalQualificationInput` occurrence-family availability wrapper. Zero occurrence is unavailable; equal duplicate occurrence is Trust-indeterminate; unequal retained occurrences are Trust-contradictory at the same question/result coordinate. None is a new H-11 outcome or question identity.
- H-02 no longer defines a historical interval-result union, converts missing H-11 evidence to an H-11 indeterminate conclusion, inspects a low-level H-11 cause, or changes unsupported into invalid or unavailable.
- H11H01-H11H11, E19-E22, MAP05-MAP07/MAP22-MAP23, safe projection, handoffs, matrix, and self-review all preserve the same literal token/disposition/protected-reason/safe-category layering.

## 13.13 `R6_B_002_MAPPING_APPOINTMENT_SCOPE_AND_CREATION_EVENT_BINDING_UNCLOSED`

**CLOSED.**

- Section 7.4 defines the field-total scope predicate from the exact role revision, result class, R8-34 positive-owner/source-subject row, R8-31 namespace, and current-class H-07 Connection/audience/target values. Governance has an explicit no-Connection-dimensions branch. No mapping-purpose field exists.
- Every immutable mapping M has exactly one distinct tagged singular semantic creation-event-question coordinate whose projection to M is injective. Retained event records are representations of that event; equal duplicates are indeterminate and unequal values are contradictory. The minimal raw event and separate authorization relation have distinguishable cardinality. A same-M claim cannot rehabilitate M; genuine later creation requires a new nonrecycled carrier and M2 coordinate.
- Current use binds separately to M, its event, one matching relation whose disposition is `authorized-at-creation`, H-11 event lineage, and the cut. Missing, nonunique, conflicting, or noncurrent bindings have total consequences. Current controller C2 may consume qualifying C1-authored M without reauthorship; a C2-authored mapping is M2.
- MAP01-MAP30, ME01-ME08, CYC29, and PRV16-PRV30 cover scope, event/relation cardinality, pre-qualification causality, same-M duplicate/conflict semantics, M2 reissue, event binding, controller replacement, namespace, R8-34/H-07, and privacy cases.

## 13.14 `R6_B_003_H13_SOURCE_REFERENCE_REQUIRED_SET_GENERATION_UNCLOSED`

**CLOSED IN FULL, INCLUDING THE STAGE-B-DEPENDENT REMAINDER; INDEPENDENT REVIEW STILL REQUIRED.**

- Original defect: required reference-set generation was not total for Stage-B actual members even though Tables 2-D1 through 2-D3 had closed the candidate, Stage-A, and provenance-node scopes.
- Exact accepted prerequisite: H-13-S3 provides the exact member and dependent grammars required to enumerate Stage-B direct/empty consequences.
- Exact Revision 12 construction: `H13RequiredSourceProjectionReferenceFamily(container)` plus Tables 2-D1 through 2-D4 is a closed total function over protocol-defined path tokens, exact accepted member constructors, the common D/x coordinate/class/role dispatch, the neutral empty-family constructor, owner-native inner coordinates, lifecycle resolution, and placeholders. Every supported container and all seventy-one `ProvenanceNodeType` values retain one exact rule; every legal Stage-B member now has one exact rule.
- `RequiredDependencies(node)`, declared dependency sets, nested aggregates, selected aggregates, question wrappers, and transitive provenance edges generate zero references. Derived direct tags are outputs only.
- Failure/reference proof: missing required reference is unavailable; unexpected reference failed; equal generated duplicate indeterminate; unequal retained reference contradictory; zero/multiple lifecycle owners use the exact total table; an empty raw family has no generated reference and no fabricated failure. REFGEN01-REFGEN23, S3M01-S3M10, RF11-RF37, SG01-SG39, EF01-EF38, LCR01-LCR15, and SB01-SB10 cover the complete construction.
- New H-02 semantic choice: **YES, bounded to the Stage-B required reference family.** Accepted H-13 meaning changed: **NO.**
- Revision 13 dependent re-audit: `TrustIsolationCurrentRequiredReferencePopulation(E)` is exactly the Tables 2-D1 through 2-D4 required family, the Section 5.4 tuple and prose are extensionally equal, and Section 5.5 consumes the same value. CR13-01 through CR13-12 close the last stale Stage-B consumer.
- Final disposition after the Revision 13 consumer repair: `R6_B_003=CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.15 `R6_B_004_NEW_FORBIDDEN_BACK_EDGE_REASON_CLASSIFICATION_NOT_TOTAL`

**CLOSED.**

- Section 8.3 enumerates FBE01-FBE22. Every proved forbidden direct or transitive edge maps to `failed` and one exact mandatory protected-reason set; no generic “owning edge” choice remains.
- Separate literal reasons cover reference/source count feedback, wrapper/raw count feedback, historical-answer-to-question/source-identity feedback, retroactive proof/mapping repair, proof-to-mapping and mapping-to-proof substitution, H-13-result-to-Trust verification, and Trust-to-permission/measurement/Connection/policy substitution.
- Missing dependency evidence is unavailable, unresolved direction indeterminate, and incompatible graphs contradictory; row reasons are added only for independently proved edges.
- CYC01-CYC30 exercise every edge family, the raw-event pre-qualification rule, historical answer-to-question feedback, and new-family missing, ambiguous, and conflicting evidence states.

## 13.16 `R5_B_001_PRODUCER_INTRINSIC_LIFECYCLE_MEMBER_COORDINATE_UNCLOSED`

**CLOSED.**

- Section 2.1 deletes the undefined `intrinsic-lifecycle assertion kind` and defines one newly proposed H-02-S2 tagged projection with exactly four branches derived from the literal accepted H-13 raw family fields.
- Every branch fixes owner, evaluation coordinate, closed event/change tag, exact affected semantic subjects, exact semantic state position or interval, equality, multiplicity, duplicate meaning, and conflict meaning.
- Raw members and `ProducerIntrinsicLifecycleDirectAttribution` wrapper occurrences remain separate accepted families. The wrapper authenticates the wrapper-omitted member and cannot allocate, recursively contain, or double-count it.
- Tables 2-A/2-C, Section 5.4, DAG rules, and K16-K25 make caller-defined tags and representation identity impossible.

## 13.17 `R5_B_002_H13_PROJECTION_REFERENCE_VS_OWNER_NATIVE_OCCURRENCE_MULTIPLICITY_UNCLOSED`

**CLOSED.**

- Section 2.1 separately defines `OwnerNativeSemanticOccurrence`, its owner-fixed multiplicity family, `H13SourceProjectionReference`, Tables 2-D1 through 2-D4's required-family function, and a deterministic projection-to-source membership relation for every closed container.
- Only the owning accepted source family fixes source multiplicity. H-13 candidates, nodes, semantic records, and provenance references remain separately auditable at their accepted coordinates but allocate, consume, merge, and delete no source occurrence.
- Actual equal or unequal owner-native duplicates remain duplicates regardless of reference count. Reference mismatch/omission/ambiguity/conflict affects projection/provenance verification, not source count.
- Repaired R3K01, PREF01-PREF07, and REFGEN01-REFGEN23 cover one-to-many references, actual duplicates, wrong targets, omissions/extras, closed direct-path generation, and Stage-A/Stage-B/provenance representation.

## 13.18 `R5_B_003_TRUST_PRESENTATION_MAPPING_CREATION_AUTHORITY_UNCLOSED`

**CLOSED.**

- Section 7.4 defines a minimal raw pre-qualification mapping event and one separate external mapping-creation authorization relation for both Trust result classes with exact immutable mapping/event, class/subject, class-tagged namespace/context, R8-34 owner/source, current-class H-07 Connection/audience/target, controller, role revision, literal H-11 qualification, independent H-02 appointment predicate, coherence, and disposition.
- The exact controller must be favorably appointed for the creation question and every field-total scope projection must cohere. A missing H-11 result or event is unavailable; a literal H-11 indeterminate or unsupported outcome or an equal event duplicate is indeterminate; incompatible result or event evidence is contradictory; resolved outside or crossing appointment is failed.
- Proof creation, mapping creation, current proof use, mapping currentness, and historical verification are separate questions. None repairs another, later appointment is nonretroactive, and historical success creates no present authority or carrier recycling.
- Sections 1, 4-9, MAP01-MAP30, CYC29, and PRV16-PRV30 close current-use event/relation binding, handoff, safe-projection, replay, replacement, Connection, namespace, retired-carrier, and same-provider/key cases.

## 13.19 `R5_B_004_HISTORICAL_ASSESSMENT_UNRESOLVED_TAG_COLLAPSES_FAILURE_CLASSES`

**CLOSED.**

- Revision 8 preserves Revision 7's correction of Revision 6's overreach: Section 3.2 consumes the exact H-11 five-token result domain and adds no H-02 interval-result taxonomy.
- Absence or unobtainability of the required result is Trust-local unavailable; literal H-11 `historically_indeterminate` and `historically_unsupported` are Trust-indeterminate; unequal retained result occurrences are Trust-contradictory; literal invalid and favorable outcomes retain their accepted meanings.
- Sections 3.4/3.5, 4.1/4.2, protected reasons, safe projection, E19-E22, H11H01-H11H11, matrix, audit, ledger, and self-review preserve exact owner semantics without inventing H-11 storage, time, interval, or cause mechanics.
- R4_B_003 remains closed through H-02's total proof-appointment predicate and mapping creation predicate while H-11 historical conclusions remain independently owned.

## 13.20 `R4_B_001_MULTIPLICITY_BEARING_SOURCE_NATIVE_KEY_COLLISION`

**CLOSED.**

- `TrustSourceCardinalityClass` has exactly three tags and no default or caller selection.
- Table 2-C assigns every consumed source family one class, exact member/record coordinate, duplicate rule, conflict rule, and inner-multiplicity rule.
- Raw `BindingLifecycleObservation` uses the accepted owner slot, concrete bootstrap source, EventFamily projection, affected semantic subject/object/relation set, and semantic event position. Before/after content cannot split a conflicting member.
- Producer intrinsic lifecycle raw members use the closed H-02-S2 four-branch projection, while direct attribution uses its exact wrapper-omitted member under a distinct source tag. Verdict, proof, key, and wrapper cannot key or double-count the raw member.
- `BindingLifecycleCoverageStatement` is one exact aggregate record whose complete inner occurrence family/order/concurrency remains unchanged. Flatten-and-double-count is invalid.
- Cases K07-K15 cover legitimate unequal positions, concurrency, equal/unequal same-member duplicates, aggregate retention, attribution multiplicity, representation splitters, double counting, and caller-selected class.

## 13.21 `R4_B_002_T24_CONTRADICTS_H13_INDEPENDENT_TRUST_FAVORABILITY`

**CLOSED.**

- T24 now exactly agrees with Sections 5.6/5.7: fully favorable two-side Trust evidence plus H-13 `non-authorizing` yields `connectionTrustDisposition=favorable`.
- H-13 remains independently nonauthorizing and the external enforcer therefore yields no final authority.
- HT01-HT06 cover adverse H-13, policy, Approval, missing or failed Trust side, and unequal retained H-13 evaluations.
- The complete semantic scan contains no remaining statement making Trust favorability depend on H-13 pass.

## 13.22 `R4_B_003_PROOF_AND_APPOINTMENT_INTERVAL_DISPOSITION_NOT_TOTAL`

**CLOSED.**

- Sections 1.5/1.6 define the closed inside/outside/crossing/absent/present-nonunique/conflicting mapping for occupancy/proof creation. Section 7.4 defines mapping creation through the literal H-11 result plus the independent H-02 creation-appointment predicate, without redefining H-11 historical semantics.
- A definitively known crossing is `failed`; absent evidence is `unavailable`; unresolved order is `indeterminate`; mutually incompatible evidence is `contradictory`.
- The mapping applies to current/historical occupancy where relevant, proof creation, and result authorship. Later appointment never repairs an old event; reissuance is independently evaluated.
- Cases I01-I11 and revised A15 make every required construction deterministic.

## 13.23 `R4_B_004_STRUCTURAL_CYCLE_FAILURE_CLASSIFICATION_NOT_TOTAL`

**CLOSED.**

- Sections 2.5 and 8.3 define a proved forbidden dependency as `failed`, missing dependency information as `unavailable`, unresolved edge direction/acyclicity as `indeterminate`, and incompatible retained graphs as `contradictory`.
- FBE01-FBE22 assign an exact mandatory owning-reason set for each edge, including every Revision 6 back edge and Revision 9 historical-answer feedback; evidence-state reasons are separately additive.
- E14 and T26 say `failed`, and CYC01-CYC30 cover every required direct, transitive, side, count, proof/mapping, historical-question, pre-qualification event, H-13/Trust, peer-gate, authority-substitution, missing, ambiguous, and conflicting construction.

## 13.24 `R3_B_001_RAW_OCCURRENCE_KEY_NATIVE_PROJECTION_UNCLOSED`

**CLOSED AGAIN OVER THE COMPLETE REVISION 12 SOURCE DOMAIN; INDEPENDENT REVIEW STILL REQUIRED.**

- `TrustSemanticEvidenceOccurrenceKey` contains exactly the logical source domain and one closed tagged `SourceNativeOccurrenceCoordinate`; the caller-selected "necessary coordinate set" remains deleted.
- Tables 2-A0/2-A1 map every legal H-13-S3 D/x to one combined record carrying its literal owner-defined or generic owner-native coordinate, exact Table 2-C class, and direct role. Tables 2-A/2-B retain every other accepted source and ownerless slot; Tables 2-D1 through 2-D4 fix all direct-reference paths and exact-empty outcomes independently.
- Existing-native source content keeps its existing tagged coordinate even when repeated through multiple legal H-13 paths. Generic-only x uses its unique accepted Section 7.1 owner D. Every H-13 candidate/structural/provenance reference remains separately retained at its accepted candidate/`SemanticRecordCoordinate`; no reference allocates or consumes a source occurrence. No caller or table position chooses between those rules.
- Exact key equality is tag/component equality. Optional redundant/enclosing, inferred, storage, proof/key, component, result, arrival-order, provider, or representation coordinates are forbidden.
- Cases R3K01-R3K06, PREF01-PREF07, and SG01-SG39 prove redundant-context non-splitting, exact source/reference multiplicity separation, extra-coordinate invalidity, omitted-coordinate unkeyability, equal-content distinct slots, same-slot contradiction, component/proof invariance, complete existing/generic coverage, table-order invariance, and no dual key for one semantic source.
- Final disposition: `R3_B_001=STILL_CLOSED_IN_REVISION_13_PROPOSAL`.

## 13.25 `R3_B_002_CONNECTION_TRUST_GATE_ABSORBS_UNCLOSED_ENFORCER_GATE_SET`

**CLOSED.**

- `TrustIsolationConnectionCurrentUseNarrowingGate` contains only the exact two-side Trust evidence set, complete Trust-specific aggregate reasons, Trust disposition, and invariant evidence-only effect.
- The field `exact independently owned accepted authority-gate outcome set` and every equivalent dynamic peer-gate collection are deleted.
- Organization/Workspace permission, H-07 authority, capability, consent, policy, Approval, Invocation, action authorization, final enforcement, and future gates cannot determine Trust favorability.
- The external enforcer handoff is prose/DAG only and is explicitly not a new H-02-S2 object or tuple.
- Cases R3G02-R3G05 prove policy/Approval independence, forbidden backward input, and future-gate semantic stability.

## 13.26 `R3_M_001_H13_PASS_CONFLATED_WITH_TRUST_GATE_FAVORABILITY`

**CLOSED.**

- Both side bodies and the aggregate structurally retain and verify the same exact H-13 evaluation/decision, but the decision's value is absent from the Trust favorability predicate.
- `Trust favorable` plus H-13 `non-authorizing` is explicitly representable and means successful current Trust verification of an independently nonauthorizing H-13 evaluation.
- The enclosing enforcer independently requires H-13 `pass`; therefore separation weakens no final authority floor.
- Cases S15-S16 and R3G01/R3G06-R3G08 prove coexistence, mismatch contradiction, and that H-13 cannot repair either unavailable Trust evidence or failed Trust evidence.

## 13.27 `R3_m_001_TITLE_MOJIBAKE`

**CLOSED.**

- The title uses the actual Unicode U+2014 EM DASH.
- The complete artifact is audited as strict UTF-8 without BOM and for the listed common double-decoding sequences.

## 13.28 Revision 2 findings remain closed

**YES.**

- `R2_B_001_EVIDENCE_OCCURRENCE_COMPONENT_RECURSION` remains closed and is strengthened: the owner-native coordinate and raw population precede all components; Sections 2.3-2.5 and 8.1/8.3 forbid every component-to-key back edge; E09-E14 and R3K06 preserve component-count invariance.
- `R2_B_002_GOVERNANCE_RESULT_PROOF_CREATION_AUTHORITY_GAP` remains closed: Section 1.6 still applies one whole-materialization-interval creation rule to both result families; Sections 1.7, 4.5, 5.6, 8.1, 9.1, and 9.2 preserve creation/use/history separation and H-10/H-11 boundaries; A11-A17 preserve nonretroactivity.
- `R2_B_003_TWO_SIDE_CURRENT_RESULT_CONSUMPTION_RULE_UNCLOSED` remains closed: Sections 5.3 and 5.7 still require exactly one independently derived host member and one independently derived agent member, exact shared projections, exact precedence, and no side substitution. Removing peer gates and the H-13 decision-value test narrows only what Trust favorability means; it does not remove either side or any Trust verification predicate. S09-S20 and R3G06-R3G08 preserve every missing/failure/ambiguity/conflict/coherence case.

## 13.29 Revision 1 findings remain closed

**YES.**

- `R1_B_001_TRUST_ROLE_OCCUPANCY_AND_AUTHORSHIP_AUTHORITY_UNCLOSED` remains closed by Sections 1.1 through 1.9, exact Organization allocation/appointment, stable single slot, immutable revision history, external creation/authorship relations, and A01-A17.
- `R1_B_002_CURRENT_RESULT_PARTICIPANT_SIDE_TENANT_CONTEXT_BINDING_MISSING` remains closed by Sections 5.1 through 5.7, exact two-subject cardinality, side-specific role/context/mapping rules, and S01-S20.
- `R1_B_003_EVIDENCE_OCCURRENCE_POPULATION_NOT_STRUCTURALLY_CLOSED` remains closed and strengthened by the exact source-type/native-coordinate mapping, complete raw family closure, and E01-E19/R3K01-R3K06.
- `R1_M_001_TENANT_SAFE_PROJECTION_EXCEEDS_R8_35_CLOSED_EXPOSURE_SET` remains closed by unchanged Section 7 and P01-P07: exactly five categories, no tenant-visible `authorityEffect`, no separate underlying disposition, and no underlying-pass exposure.

No finding is hidden as H-10/H-11 work: H-02 decides answer-independent historical question/source identity, source-native equality, Tables 2-D1 through 2-D4 reference generation, accepted-native Stage-B classification, source causality, semantic proof-creation authority, singular minimal mapping-event facts and representation cardinality, the separate mapping-authorization relation, mapping scope/event/relation binding, Trust-local consumption consequences for literal H-11 results, exact two-side Trust consumption, Trust-specific aggregate scope, and nonauthority now. H-13-S3 supplies structural input grammar only. H-10/H-11 receive only their representation, authentication, accepted qualification/currentness, and lifecycle handoffs.

Exact nonregression status:

```text
R1_B_001=CLOSED
R1_B_002=CLOSED
R1_B_003=CLOSED
R1_M_001=CLOSED

R2_B_001=CLOSED
R2_B_002=CLOSED
R2_B_003=CLOSED

R3_B_001=STILL_CLOSED_IN_REVISION_13_PROPOSAL
R3_B_002=CLOSED
R3_M_001=CLOSED
R3_m_001=CLOSED

R4_B_001=CLOSED
R4_B_002=CLOSED
R4_B_003=CLOSED
R4_B_004=CLOSED

R5_B_001=CLOSED
R5_B_002=CLOSED
R5_B_003=CLOSED
R5_B_004=CLOSED

R6_B_001=CLOSED
R6_B_002=CLOSED
R6_B_003_STAGE_B_REMAINDER=CLOSED_IN_REVISION_13_PROPOSAL
R6_B_004=CLOSED

R7_B_001=STILL_CLOSED_IN_REVISION_13_PROPOSAL
R7_B_002_STAGE_B_REMAINDER=CLOSED_IN_REVISION_13_PROPOSAL
R7_B_003=STILL_CLOSED_IN_REVISION_13_PROPOSAL
R7_m_001=STILL_CLOSED_IN_REVISION_13_PROPOSAL

R8_B_001_ORIGINAL_CAUSAL_DEFECT=STILL_CLOSED_IN_REVISION_13_PROPOSAL
R8_B_002=STILL_CLOSED_IN_REVISION_13_PROPOSAL
R8_B_003=CLOSED_IN_REVISION_13_PROPOSAL
R8_m_001=STILL_CLOSED_IN_REVISION_13_PROPOSAL

R9_B_001=STILL_CLOSED_IN_REVISION_13_PROPOSAL
R9_B_002=CLOSED_IN_REVISION_13_PROPOSAL
R9_B_003=STILL_CLOSED_IN_REVISION_13_PROPOSAL

R11_B_001=STILL_CLOSED_IN_REVISION_13_PROPOSAL
R11_B_002=STILL_CLOSED_IN_REVISION_13_PROPOSAL
SPECIFIC_GENERIC_DISPATCH_TOTAL=YES
SPECIFIC_GENERIC_DISPATCH_DISJOINT=YES
EMPTY_RAW_FAMILY_DOMAIN_TOTAL=YES

R12_B_001=CLOSED_IN_REVISION_13_PROPOSAL
CURRENT_POPULATION_USES_D1_D4=YES
STAGE_B_REFERENCE_GENERATION_SUPPORTED=YES
STAGE_B_FORCED_UNSUPPORTED_FAILURE=NO
SECTION_5_4_FORMAL_PROSE_EQUIVALENT=YES
SECTION_5_5_CONSUMES_SAME_REFERENCE_POPULATION=YES
VALID_STAGE_B_DIRECT_REFERENCE_RETAINED=YES
ZERO_MEMBER_EXACT_EMPTY_PRESERVED=YES
LIFECYCLE_RETAINED_FAILURE_PRESERVED=YES
INVALID_INPUT_FAILURE_RESERVED_FOR_INVALID_INPUT=YES
D1_D3_ONLY_OPERATIVE_RULE_REMAINS=NO
CR13_01_THROUGH_CR13_12=PASS

R10_INDEPENDENT_DISPOSITION=BLOCKED_UPSTREAM
R10_LOCAL_BLOCKERS=0
R10_LOCAL_MAJORS=0
R10_LOCAL_MINORS=0
R10_UPSTREAM_BLOCKERS=1
H13_S3_DEPENDENCY_SATISFIED=YES
```

# 14. Self-review

This self-review is nonauthoritative and is not human acceptance or independent review.

## 14.1 Required Revision 13 blocker questions

1. Was Revision 13 derived from the exact independently reviewed Revision 12 artifact? **Yes.** The source SHA-256, byte count, LF-line count, encoding, and hygiene values in the baseline match the controlling brief exactly.
2. Does the operative Section 5.4 formal population use Tables 2-D1 through 2-D4? **Yes.** It contains exactly `TrustIsolationCurrentRequiredReferencePopulation(E)`, whose definition names the complete Tables 2-D1 through 2-D4 union.
3. Is Table 2-D4 applied exactly once to every accepted member of the frozen Stage-B mathematical set? **Yes.** The formal definition, prose theorem, DAG, and CR13-01 through CR13-08 all state the same one-application-per-member rule.
4. Are Section 5.4's formal tuple and prose extensionally equal? **Yes.** Both contain the same owner-native source family and named required reference population, with the same direct, exact-empty, lifecycle retained-failure, and invalid-input boundaries.
5. Does Section 5.5 consume exactly the Section 5.4 reference population? **Yes.** Item 5 names `TrustIsolationCurrentRequiredReferencePopulation(E)` directly and forbids a Tables 2-D1 through 2-D3 subset or synthetic Stage-B-wide failure.
6. Does a valid nonempty raw family retain every exact direct reference? **Yes.** Each retained x occurrence is dispatched once through `R12H13RawSourceDispatchOf(D,x)` without changing owner-native multiplicity.
7. Does a valid zero-member raw family remain neutral exact empty? **Yes.** `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)` has zero references, no primary failure, empty protected reasons, and no fabricated placeholder.
8. Do structural, nested, semantic-question, and required-dependencies-question members remain exact empty and traversal stops? **Yes.** They are classified by their Table 2-D4 branches and never inherit a blanket unsupported failure.
9. Does a uniquely owned valid lifecycle member retain exactly its direct reference? **Yes.** The exact owner and target determine one non-owning lifecycle reference; CR13-04 forbids duplication or source rekeying.
10. Are lifecycle zero-owner, missing-target, mismatch, and duplicate/conflicting-owner outcomes preserved? **Yes.** Their exact Table 2-D4 retained-failure rows remain unchanged; Stage-B support neither erases nor broadens those fact-specific failures.
11. Is `H13StageBInvalidInputResult` reserved for truly invalid classifier input? **Yes.** An invented eleventh constructor, D/value mismatch, wrong dependent type, or representation-driven classification is invalid; a legal Stage-B member is not.
12. Can dependency traversal, reflection, storage, discovery order, provider metadata, or caller choice alter the current population? **No.** They are absent from equality and classification; any attempted classification from them is nonconforming or invalid input as already defined.
13. Can reference fan-out change source occurrence multiplicity? **No.** CR13-12 and the DAG retain each legal path reference separately while source cardinality remains solely owner-native.
14. Are `R9_B_002`, `R8_B_003`, the `R7_B_002` Stage-B remainder, and the `R6_B_003` Stage-B remainder closed without reopening `R11_B_001`, `R11_B_002`, or `R3_B_001`? **Yes.** The ledger re-audits each dependent closure against the repaired current consumer and explicitly preserves all three prior closures.
15. Must two clean-room implementations receiving extensionally equal complete E values produce equal source families, reference populations, component coordinates, failure classes, reasons, and Trust consequences? **Yes.** The accepted typed values and closed Tables 2-D1 through 2-D4 functions are the only operands; CR13-11 fixes equality of every output.

## 14.2 Preserved Revision 12 blocker questions re-evaluated under Revision 13

1. Is specific-versus-generic source-coordinate selection a closed typed dispatch with no specificity, row-order, or prose-precedence operation? **Yes.** `R12H13RawSourceDispatchOf` returns one tagged record from Tables 2-A0/2-A1, whose membership is exact D and accepted semantic x type.
2. Can changing Table 2-A textual row order change any source key? **No.** No order or position is an operand; SG35 fixes identical output under any table or Markdown reorder.
3. Does every legal D/x select exactly one source-native coordinate? **Yes.** The D outer/dependent tag and exact accepted x type identify one Table 2-A1 result; a mismatched x is outside the legal domain rather than a competing legal branch.
4. Does every legal D/x select exactly one Table 2-C cardinality class through the same closed semantic dispatch? **Yes.** The class and coordinate are fields of the same result record; Table 2-C only restates that field.
5. Can an implementation choose generic versus existing-native? **No.** SG36 and SG37 make either contrary choice nonconforming.
6. Is `R3_B_001` closed again over the complete Revision 12 source domain? **Yes.** Table 2-A0 enumerates every existing-native raw source type, Table 2-A1 enumerates all generic-only types, and SG01-SG39 prove no dual raw key or implementation-selected grouping.
7. Is `cardinality(F)=0` classified for every legal raw-family branch? **Yes.** All eight D branches, all twenty raw-node subtypes, and all seven producer-intrinsic classes yield `RAW_FAMILY_ZERO_MEMBER_EXACT_EMPTY(D)`.
8. Is every impossible-empty invariant proved from accepted H-13 rather than assumed? **Yes.** Revision 12 asserts none: accepted H-13-S3 declares finite families without a nonempty constraint, so every legal emitted empty F is classified rather than rejected.
9. Is explicit-placeholder existence independent from raw-family emptiness unless accepted H-13 explicitly relates the concrete members? **Yes.** The constructors are classified separately; neither creates, suppresses, or converts the other.
10. Is event-policy-token-family empty behavior mechanically closed? **Yes.** Zero received noncatalogue tokens yields its neutral exact-empty result; accepted H-13 defines no event-policy placeholder, and the constant policy remains unchanged.
11. Can any legal `raw-input-family(D,F)` fall through? **No.** Finite cardinality is exactly zero or positive; both branches have one result, and positive F dispatches every x once.
12. Are F=0, F=1, and F=N clean-room outcomes deterministic? **Yes.** EF01-EF38 fix the exact classification, path multiplicity, coordinate, class, placeholder independence, disposition, reasons, and authority.
13. Are `R9_B_002`, `R8_B_003`, the `R7_B_002` Stage-B remainder, and the `R6_B_003` Stage-B remainder actually closed after both repairs? **Yes.** Their ledger rows re-prove total member classification and required-reference generation using both the common D/x dispatch and neutral empty-family branch.
14. Did either repair reopen any previously valid R1-R10 or Revision 11 architecture? **No.** The repairs change only coordinate/class dispatch and empty-family classification; the ten constructors, fixed point, multiplicities, paths, lifecycle resolution, placeholders, Trust boundaries, privacy, and mechanism boundaries are unchanged.
15. Can two clean-room implementations still disagree on source key, cardinality class, empty-family classification, reference family, failure class, or protected reasons for equal accepted facts? **No.** Every listed output is an exact projection of accepted typed facts through closed functions; implementation metadata and table layout are absent.

## 14.3 Preserved Revision 11 hostile questions re-evaluated under Revision 13

1. Is `H13EvaluationPopulationMember` consumed exactly as the accepted ten-constructor H-13-S3 union? **Yes.** Table 2-D4 reproduces and dispatches exactly those ten outer tags.
2. Does the Revision 12 classifier cover every legal outer constructor? **Yes.** S3M01-S3M10 audit all ten; the two literal subbranches and lifecycle outcomes are dependent subdispatches, not extra outer constructors.
3. Can any legal outer constructor match two Revision 12 classification rows? **No.** Outer tags are disjoint; each dependent tagged union is componentwise disjoint.
4. Is there any legal-member `other`, `as applicable`, reflection, or implementation catch-all? **No.** The legal domain is enumerated; invalid input has a separate fixed failure result.
5. Can caller-supplied `stage-b-direct(...)` determine input classification? **No.** It is derived output only; INV01 fixes injected input as failed.
6. Can discovery rule, pass, or order determine classification? **No.** Only accepted constructor/value equality participates.
7. Can `RequiredDependencies` or provenance traversal promote a value to direct source status? **No.** Both question wrappers and all reachability alone are exact empty.
8. Can representation, storage, or object structure determine classification? **No.** Such attempts enter the invalid-input failure boundary.
9. Is `stage-a-resolved-population` kept nested? **Yes.** It is nested-container exact empty in Stage B; Table 2-D3 remains separate.
10. Is `selected-catalogue` classified without implementation/configuration storage semantics? **Yes.** Its exact accepted aggregate constructor is structural exact empty and a traversal stop.
11. Are both `pre-freeze-literal-input` branches handled exactly? **Yes.** Applicable projection is structural exact empty; authoritative H-07 input emits exactly one direct reference.
12. Are all `H13RawInputFamilyCoordinate` branches handled exactly? **Yes.** The eight accepted outer D branches each have one row, a total zero/positive cardinality split, and one common positive-member dispatch.
13. Is every raw-node-family subtype mechanically dispatched? **Yes.** Twenty exact rows cover the accepted raw-input node subset, including all four producer-lifecycle owner-native branches.
14. Is source multiplicity still owner-native? **Yes.** F alone supplies it.
15. Can H-02 reference count alter source multiplicity? **No.** Reference multiplicity is independently derived and non-owning.
16. Can top-level set rediscovery create multiplicity? **No.** Equal rediscovery leaves one mathematical-set member and creates no source/reference occurrence.
17. Can Q enter `H13ProducerIntrinsicRawFamilyCoordinate`? **No.** Its exact grammar contains only producer lifecycle evaluation coordinate and intrinsic input class.
18. Can ObservationScope enter intrinsic identity? **No.** Q-local ObservationScope remains in its exact owner-native raw-node branch.
19. Can a Q lifecycle reference become a raw family? **No.** R is a distinct non-owning constructor carrying no F.
20. Can zero-owner C lose R or its node? **No.** C, R, and node are retained before and independently of resolution.
21. Can multi-owner C select an owner? **No.** All matches remain and selection is forbidden.
22. Can duplicate equal owner matches become unique owner? **No.** Match-family occurrence cardinality exceeds one; the result remains multiple-owner-candidates and indeterminate.
23. Can the same C in multiple Rule-7 branches duplicate the source? **No.** Branch-tagged references remain distinct while one owner-native occurrence remains one.
24. Are all accepted placeholders handled without generic null/error semantics? **Yes.** Nine exact coordinate rows constrain V; generic null/parser/storage/transport/error branches are invalid.
25. Can an unknown eleventh top-level constructor be accepted? **No.** It receives the fixed failed invalid-input result.
26. Does `semantic-question(N)` create source authority by itself? **No.** Exact empty.
27. Does `required-dependencies-question(N)` create source authority by itself? **No.** Exact empty with zero traversal.
28. Is historical question identity still answer-independent? **Yes.** The exact seven-branch caller/subject function and H-02 question precede all H-11 answers.
29. Is one immutable mapping M still one semantic creation event? **Yes.** Representations do not allocate another event.
30. Can later same-M evidence create another favorable event? **No.** Equal repetitions are duplicates; unequal representations conflict; genuine later creation requires M2.
31. Is Trust favorability still independent from H-13 pass? **Yes.** H-13 is structurally retained but the Trust favorability predicate excludes its decision value.
32. Are exactly two independent host/agent current Trust results required? **Yes.** Neither side substitutes for or derives from the other.
33. Are the five tenant-safe categories unchanged? **Yes.** No Revision 12 category was added.
34. Has privacy been weakened? **No.** Classifier details and reasons remain protected; R8-30 through R8-36 and R8-35 remain unchanged.
35. Has any H-10/H-11 mechanism entered H-02? **No.** No bytes, algorithms, keys, clocks, checkpoints, persistence, carriers, or storage mechanisms were added.
36. Has any D1/D2/schema/implementation rule entered H-02? **No.** The proposal is semantic governance only.
37. Is `R9_B_002` actually closed by a total accepted-native classifier? **Yes.** Exact outer and dependent totality, the two-branch D/x dispatch, zero/positive F closure, invalid-input handling, vectors, and determinism proof close it.
38. Is `R8_B_003` actually closed? **Yes.** Input authority is the accepted member; `stage-b-direct` is output only.
39. Is `R7_B_002`'s Stage-B remainder actually closed? **Yes.** Table 2-D4, the common D/x dispatch, and the neutral zero-member result close direct paths, empties, native coordinates, and traversal boundaries.
40. Is `R6_B_003`'s Stage-B remainder actually closed? **Yes.** The required reference-family function is total through Tables 2-D1 through 2-D4, including every empty raw family.
41. Did any previously valid R1-R10 or sound Revision 11 closure reopen? **No.** The complete ledger and cross-section audit retain every prior sound construction.
42. Can two clean-room implementations with equal accepted facts produce different Stage-B classification? **No.** Exact tagged outer dispatch, typed D/x dispatch, zero/positive cardinality, and exact owner-resolution predicates determine one result.
43. Can they produce different reference families? **No.** Each direct, exact-empty, and retained-failure branch fixes its complete multiplicity function.
44. Can they disagree on source/reference multiplicity? **No.** Top-level set cardinality, F multiplicity, and H-02 reference multiplicity have separate fixed owners.
45. Can they disagree on lifecycle malformed-owner handling? **No.** Match-family cardinality and distinct-owner set cardinality select one exact failure row.
46. Can they disagree on failure classification or protected reasons? **No.** Each adverse fixed fact pattern has one primary class and complete additive reason rule; a neutral empty raw family has no primary disposition and the exact empty reason set.
47. Does any remaining semantic distinction depend on implementation interpretation? **No.** Every in-scope distinction is accepted-native or fixed by an H-02 rule; implementation-dependent distinctions are nonconforming.

The complete cross-section scan found no contradiction, open branch, implementation-selectable primary outcome, upstream conflict, or reopened finding.

```text
CROSS_SECTION_CONTRADICTION_COUNT=0
UPSTREAM_CONFLICT_COUNT=0
SELF_REVIEW_BLOCKERS=0
SELF_REVIEW_MAJORS=0
SELF_REVIEW_MINORS=0
```

The artifact is ready for independent hostile review. This self-review does not recommend or create human acceptance, integration, implementation, conformance, interoperability, production readiness, or release authorization.

# 15. Accepted governance flags

STATUS=ACCEPTED
DECISION=H-02-S2
REVISION=13
SUPPLEMENTS=H-02-S1

ACCEPTED=YES
INTEGRATED=NO
ACCEPTANCE_DATE=2026-09-06
APPROVER=Lakshya Sharma (`lakshyasharma21103-crypto`)
ACCEPTED_REVISION=13

INDEPENDENT_HOSTILE_REVIEW=PASS
INDEPENDENT_REVIEW_BLOCKERS=0
INDEPENDENT_REVIEW_MAJORS=0
INDEPENDENT_REVIEW_MINORS=0
HUMAN_ACCEPTANCE_RECOMMENDED=YES
REVISION_14_REQUIRED=NO

H02_S2_HUMAN_ACCEPTANCE=YES
H02_S2_INTEGRATED=NO

H13_S3_DEPENDENCY_SATISFIED=YES

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
