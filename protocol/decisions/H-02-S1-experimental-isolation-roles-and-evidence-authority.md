# H-02-S1 — Experimental Isolation Roles and Evidence Authority

## Bounded Finalization of the Scope-Compressed Experimental-Isolation Authority Decision

```text
STATUS=ACCEPTED
DECISION=H-02-S1
REVISION=8
SUPPLEMENTS=H-02

ACCEPTED=YES
INTEGRATED=NO
ACCEPTANCE_DATE=2026-08-27
APPROVER=Lakshya Sharma (`lakshyasharma21103-crypto`)
ACCEPTED_REVISION=8
HOSTILE_REVIEW_DISPOSITION=READY_WITH_NONBLOCKING_FINDINGS
REVISION_9_REQUIRED=NO
IMPLEMENTATION_AUTHORIZED=NO
SCHEMA_WORK_AUTHORIZED=NO
D2_AUTHORIZED=NO

BASELINE=main@0907b7a905890126120cb5460dfc66053789d6e7

SELF_CONTAINED_WITHIN_H02_SCOPE=YES
IMPORTS_PROPOSED_R1_R7_SEMANTICS=NO

H13_S2_REQUIRED=YES
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

- **Decision ID:** `H-02-S1`
- **Parent:** H-02 — Roles, trust boundaries, and protocol authorization floor
- **Title:** Experimental Isolation Roles and Evidence Authority
- **Status:** `ACCEPTED`
- **Human acceptance date:** 2026-08-27
- **Approver:** Lakshya Sharma (`lakshyasharma21103-crypto`)
- **Accepted revision / option:** Revision 8
- **Resulting status:** `ACCEPTED`
- **Review evidence/reference:** Final independent hostile review of H-02-S1 Revision 8, disposition `READY_WITH_NONBLOCKING_FINDINGS`, followed by the explicit human disposition recorded below.
- **Revision 9:** Not required and not created.

### Exact human disposition

> I APPROVE PROPOSED-H-02-S1 REVISION 8 — Experimental Isolation Roles and Evidence Authority, including the three bounded Revision 8 corrections: universal projection coherence and contradiction rejection; the explicit Workspace-absent current-use branch; and privacy across every unequal ExactTenantContext. I accept the four identified downstream-only findings as intentionally owned by H-13-S2, H-10, H-11, and D1 and not as H-02 defects. I authorize only the non-semantic R8-NB-001 stale-reference cleanup described by the hostile review when the accepted decision is durably recorded. This approval does not authorize implementation, D2 work, or Protocol 1.0 conformance.

That statement is recorded as immutable human-governance evidence. It is not broadened into approval of H-13-S2, an H-10 isolation supplement, an H-11 isolation supplement, a D1 Experimental Isolation normative supplement, D2 work, or implementation.

### Final hostile-review disposition

```text
READY_WITH_NONBLOCKING_FINDINGS

BLOCKERS = 0
MAJORS = 0
MINORS = 0
NONBLOCKING = 5

H02_BLOCKERS = 0
H02_MAJORS = 0
DOWNSTREAM_ONLY_FINDINGS = 4

HUMAN_ACCEPTANCE_RECOMMENDED = YES
IMPLEMENTATION_AUTHORIZED_BY_THIS_REVIEW = NO
REPOSITORY_MUTATION_PERFORMED = NO

H02-R7-001 = CLOSED
H02-R7-002 = CLOSED
H02-R7-003 = CLOSED

R7-DS-001 = DOWNSTREAM_H13_S2
R7-DS-002 = DOWNSTREAM_H10
R7-DS-003 = DOWNSTREAM_H11
R7-DS-004 = DOWNSTREAM_D1

R8-NB-001 = WORDING_ONLY
REVISION_9_REQUIRED = NO
```

The four downstream findings are not H-02 defects, are not waived security requirements, and remain owned as follows:

- **H-13-S2:** runtime identity, producer ontology, measurement vocabulary, correspondence, coverage, and currentness semantics.
- **H-10:** isolation-specific canonical payloads, domains, algorithms, proof identities, and commitment mechanics.
- **H-11:** current-head, predecessor/history, fork, rollback, revocation, materialization, trusted-time, and historical-verification mechanics.
- **D1:** the future Experimental Isolation normative `REQ-*` supplement.

Unresolved downstream work cannot authorize implementation and cannot be filled in by implementation discretion.

### Accepted qualifications

Acceptance is limited to the self-contained Revision 8 H-02 constitutional scope and its three bounded corrections: universal projection coherence and contradiction rejection, the explicit Workspace-absent current-use branch, and privacy across every unequal `ExactTenantContext`. Revisions 1–7 remain review history and contribute no semantic rule by reference. The R8-NB-001 changes recorded here are non-semantic wording cleanup only. All four downstream-only findings remain deferred to their named owners rather than being treated as H-02 defects or waived requirements.

### Accepted risks and dependencies

H-13-S2, the H-10 isolation supplement, the H-11 isolation supplement, and the D1 Experimental Isolation normative supplement remain required and unresolved. Until those decisions are separately accepted, no implementation may invent their semantics or claim conformance. If a downstream owner cannot realize the accepted H-02-S1 invariants without changing them, that owner must stop and escalate explicitly. Required authority or evidence that is missing, ambiguous, contradictory, stale, or historically unresolvable remains fail-closed and may make current use non-authorizing.

### Compatibility impact

Revision 8 fixes the H-02 authority, identity/equality direction, Workspace-presence distinction, privacy floor, Connection equality-only direction, and non-transfer constraints that every later H-13-S2, H-10, H-11, D1, D2, and implementation artifact must preserve. It does not define representation, wire format, schemas, algorithms, runtime behavior, or migration mechanics. Existing implementations, tests, schemas, local configuration, provider directories, and deployment defaults cannot supply or override missing protocol semantics.

### Security impact

The accepted decision separates Organization permission, Workspace narrowing, IAA measured-fact authority, Trust verification evidence, Connection authority, and Invocation authorization. It rejects contradictory projections without repair; prohibits protected-carrier reuse across unequal `ExactTenantContext` values except for the closed accepted-upstream-field exception; requires exact equality against authoritative Connection-owned values; and prohibits permission, measurement truth, Trust results, and Connection authority from substituting for one another.

### Explicit nonclaims and implementation boundary

This acceptance does not authorize implementation, schemas, fixtures, vectors, state machines, runtime or SDK changes, Platform changes, conformance work, publication, release, production-readiness claims, D2 work, or Protocol 1.0. It does not define final runtime/producer ontology, measurement vocabulary or correspondence/coverage/currentness, a final isolation attestation payload, cryptographic domain/payload/signature/digest mechanics, H-11 currentness/history materialization, D1 normative `REQ-*` wording, or D2 representation.

---

# R8-00 — Purpose, full-restatement rule, and bounded correction scope

Revision 8 is a complete self-contained restatement of the accepted H-02-S1 authority model.

```text
NO SEMANTIC RULE FROM PROPOSED REVISIONS 1–7 IS INCORPORATED BY REFERENCE.
```

Revisions 1–7 are review history only.

Revision 8 preserves the scope-compressed H-02 boundary established by Revision 7 and makes **exactly three bounded H-02 corrections**:

```text
A. UNIVERSAL PROJECTION COHERENCE
   Every repeated, embedded, referenced, or derivable H-02 identity/scope
   component must agree exactly; contradiction is invalid and non-authorizing.

B. WORKSPACE-ABSENT CURRENT-USE BRANCH
   Workspace absence is a distinct Connection-scope branch and is not an
   inferred Workspace no-overlay state.

C. EXACT-TENANT-CONTEXT PRIVACY
   Protected IAA-specific carrier equality is prohibited across every unequal
   exact (Organization, tagged Workspace) tenant context, not merely across
   different present Workspace values.
```

Nothing else is reopened by this revision.

Revision 8 answers only H-02 constitutional questions:

```text
WHO may assert WHICH class of fact;

WHICH authority is positive versus narrowing-only;

WHICH isolation identities and equality boundaries exist at the
permission/governance layer;

WHICH tenant/privacy distinctions are constitutional;

WHICH Connection-owned semantics are equality-only;

WHAT must never be inferred, transferred, defaulted, repaired, or reconstructed;

WHICH unresolved semantic families belong to H-13, H-10, H-11, and D1.
```

It intentionally does NOT define:

```text
final producer/runtime ontology
final measurement evidence vocabulary
final measurement-time evidence type
final canonical attestation payload
canonical bytes
digest/signature domains
key formats or signature algorithms
H-11 snapshot/current-head wire format
revalidation cadence
D1 REQ-* wording
D2 JSON member names
transport placement
```

Those remain downstream-owner decisions.

The rule remains:

```text
EXPLICIT DOWNSTREAM OWNERSHIP IS NOT AN H-02 GAP
WHEN H-02 HAS ALREADY FIXED THE SOURCE-AUTHORITY,
EQUALITY DIRECTION, PRIVACY BOUNDARY, AND NON-TRANSFER INVARIANTS
THAT THE DOWNSTREAM OWNER MUST PRESERVE.
```

If a downstream owner later cannot realize these invariants without changing them, it must STOP and escalate explicitly.

---

# R8-01 — Authority hierarchy

```text
accepted H-01..H-14
>
accepted D1 REQ-*
>
accepted H-02-S1 Revision 8
>
future accepted H-13-S2 / H-10 isolation / H-11 isolation decisions
>
future accepted D1 Experimental Isolation normative requirements
>
future accepted D2 governance/representation
>
implementation/tests
```

No implementation, SDK, schema, local configuration, provider directory, cloud API, deployment default, or database record may create protocol semantics.

---

# R8-01A — Universal projection coherence and contradiction rejection

This invariant applies to **every** H-02-S1 isolation object, semantic occurrence,
reference, presentation mapping, and authority check.

```text
Every repeated, embedded, nested, referenced, or derivable H-02
identity/scope component MUST exactly agree with every other occurrence
of the same semantic component.
```

Any disagreement is:

```text
invalid
non-authorizing
non-repairable
```

There is:

```text
no outer-wins rule
no inner-wins rule
no first-wins rule
no latest-wins rule
no trusted-field precedence
no normalization to force equality
no defaulting
no inference
no substitution
no reconciliation
```

A cryptographically valid proof over contradictory H-02 projections remains
non-authorizing.

At minimum, all of the following must agree exactly wherever they co-occur:

```text
revision identity
    -> exact separately named stable subject identity

IsolationAttestationAuthorityIdentity
    -> exact Organization

Organization registration subject/revision
    -> exact IAA identity
    -> exact Organization

Workspace IAA state subject/revision
    -> exact Organization
    -> exact Workspace
    -> exact Organization registration subject

Workspace overlay subject/revision
    -> exact Workspace IAA state subject
    -> exact Organization registration subject
    -> exact Organization
    -> exact Workspace

GovernedBoundaryLineageKey
    -> exact Organization
    -> exact tagged Workspace permission scope

IsolationBoundaryPermissionSubjectIdentity
    -> exact GovernedBoundaryLineageKey
    -> exact IAA identity
    -> exact participant side

IsolationBoundaryPermissionRevisionIdentity
    -> exact permission subject

BoundaryPermissionSemantics explicit fields
    -> exact permission subject/revision
    -> exact key
    -> exact IAA
    -> exact Organization
    -> exact tagged Workspace permission scope
    -> exact participant side
    -> exact registration subject/revision

presentation namespace
    -> exact mapped source Organization
    -> exact tagged Workspace context
    -> exact Connection/audience/target when Connection-scoped

repeated Connection-owned isolation semantics
    -> exact authoritative H-07 Connection values
```

If a value is derivable from an embedded identity and is also carried explicitly,
the two values must be exactly equal.

If a subject identity contains a parent identity and the parent is also carried
or referenced elsewhere, those parent identities must be exactly equal.

No downstream H-10 commitment may choose between contradictory H-02 values.
The contradiction must be rejected before any authority is granted.

---

# PART I — LOGICAL ROLE AND SOURCE AUTHORITY

## R8-02 — Isolation Attestation Authority role

Define one new logical role:

```text
Isolation Attestation Authority
abbreviation: IAA
```

The IAA is the source of only:

```text
profile-governed measured isolation facts
about a runtime/boundary subject that is already permission-authorized.
```

IAA is NOT the source of:

```text
Organization identity or membership
Workspace identity, membership, or parentage
Organization governance
Workspace governance
Host principal authority
Agent execution authority
Passport issuance
Trust policy
policy ALLOW
human consent
experiment selection
Connection creation
Connection selected semantics
Connection authority
Approval
```

Co-location does not merge roles or authorities.

A provider, Host, Agent operator, TEE service, hypervisor service, runtime monitor, or cloud service may physically implement an IAA only by separately occupying this logical role.

---

## R8-03 — Organization authority in isolation governance

Organization authority is the positive source of:

```text
1. IAA semantic lineage allocation for that Organization;
2. Organization IAA registration;
3. the Organization-declared isolation permission-target lineage;
4. positive authorization permitting a registered IAA to attest that
   permission-target lineage;
5. tenant-scoped presentation of Organization-owned IAA and registration
   authority.
```

Organization authority is NOT the source of runtime measurement truth.

Organization authority cannot make an unmeasured runtime fact true by governance declaration.

---

## R8-04 — Workspace authority in isolation governance

Workspace authority is narrowing-only.

Within exact Organization delegation and exact Workspace scope it may:

```text
deny current use of an Organization-permitted IAA;
require a stricter local isolation profile from the already eligible set;
narrow permitted participant side;
narrow the set of Organization-authorized boundary permission subjects;
narrow the effective local time window;
affirm that no additional IAA-specific Workspace narrowing applies.
```

Workspace authority MUST NOT:

```text
create Organization IAA registration;
create Organization parentage;
create a positive boundary permission subject;
widen an Organization ceiling;
change Connection identity/scope;
supply human consent;
supply experiment identity;
supply Agent/Passport identity;
create Connection authority.
```

---

## R8-05 — Trust verification service in isolation governance

Trust verification service may issue only:

```text
bounded verification result/evidence statements
about roots, proofs, keys, purpose, currentness, rollback/history,
and context binding.
```

A Trust result is evidence for an enforcer.

It is NOT:

```text
Organization permission
Workspace permission
IAA measurement truth
Connection authority
Invocation authorization
policy ALLOW
```

A tenant-facing Trust result for isolation must obey the privacy/context rules in Part VI.

---

## R8-06 — Human consent, policy, and deployment state

Human consent:

```text
may permit the experiment where accepted semantics require it;
never proves isolation.
```

Policy:

```text
may deny or narrow only dimensions already assigned to it by accepted authority;
never manufactures positive isolation evidence.
```

Deployment state, discovery, provider inventory, runtime configuration, and implementation support:

```text
may supply evidence to their owning downstream semantic process;
never create H-02 permission authority.
```

---

# PART II — IAA IDENTITY AND ORGANIZATION REGISTRATION

## R8-07 — IsolationAttestationAuthorityIdentity

Define:

```text
IsolationAttestationAuthorityIdentity =
(
  Organization,
  organizationLocalIAALineageIdentity
)
```

Allocator:

```text
exact Organization authority.
```

Allocation namespace:

```text
unique within that exact Organization.
```

Equality:

```text
exact tuple equality only.
```

Safety:

```text
normalization/aliasing forbidden
reassignment forbidden
reuse/recycling forbidden
current-pointer repointing forbidden
```

A collision between two distinct IAA lineages fails closed.

A retired identity remains permanently reserved in history.

The same physical provider serving two Organizations has two distinct semantic IAA identities.

Provider-global identity does not create protocol semantic equality.

---

## R8-08 — OrganizationIAARegistrationSubjectIdentity

Define one stable registration subject per exact Organization IAA and purpose:

```text
OrganizationIAARegistrationSubjectIdentity =
(
  IsolationAttestationAuthorityIdentity,
  purpose = experiment-isolation
)
```

Allocator:

```text
exact Organization authority.
```

Equality:

```text
exact tuple equality.
```

There may be only one stable registration subject for the same tuple.

A duplicate stable subject is a governance fork and fails closed.

---

## R8-09 — OrganizationIAARegistrationRevisionIdentity

Each immutable Organization registration revision is:

```text
OrganizationIAARegistrationRevisionIdentity =
(
  OrganizationIAARegistrationSubjectIdentity,
  organizationLocalRegistrationRevisionIdentity
)
```

Allocator:

```text
exact Organization authority.
```

The local revision identity is unique within the subject stream.

No reuse, reassignment, alias, or repointing is allowed.

Historical revision identity is immutable.

H-11 isolation governance will later define authoritative predecessor/current-head/fork/rollback mechanics.

---

## R8-10 — Closed Organization registration ceiling

Each registration revision semantically carries exactly:

```text
OrganizationIAARegistrationRevisionSemantics {
  registrationSubject
  registrationRevision

  permittedParticipantSides
  permittedIsolationProfileClasses
  permittedReleaseScope
  permittedWorkspaceScope

  purpose = experiment-isolation

  claimedEffectiveStart
  claimedEffectiveEnd

  predecessorRevision
}
```

No final schema member names are implied.

### participant sides

Exact finite subset of:

```text
host-side
agent-side
```

Empty set means no participant side is authorized.

Duplicates reject.

Order is nonsemantic.

### isolation profile classes

An exact finite set of future H-13-S2-defined isolation profile identities/classes.

At H-02 level the only rule is:

```text
Organization may narrow which H-13-defined profiles are eligible;
Organization may not define profile meaning.
```

Empty set means no profile is authorized.

### release scope

Exact finite set of ProtocolRelease identities.

Empty set means no release is authorized.

No range, wildcard, latest, compatibility inference, or fallback is implied.

### permittedWorkspaceScope

Closed tagged union:

```text
organization-wide
| workspace-absent-only
| exact-workspaces(nonempty exact set of Workspace)
```

Meaning:

```text
organization-wide
    may apply to Workspace-absent or Workspace-present Connections,
    subject to all other exact scope and current Workspace rules;

workspace-absent-only
    applies only when Connection Workspace tag is absent;

exact-workspaces(S)
    applies only when Connection Workspace tag is present and exact Workspace
    value is a member of S.
```

`exact-workspaces(empty)` is invalid.

Duplicate Workspace entries reject.

No omitted/null/empty-string value means absence.

### effective time

```text
claimedEffectiveStart = one claimed inclusive time
claimedEffectiveEnd =
    open
    | finite(exclusive time)
```

Claimed time does not itself create authority before H-11-qualified authoritative application/materialization.

### predecessor

```text
absent
| present(exact OrganizationIAARegistrationRevisionIdentity)
```

No implicit latest/current pointer is allowed.

---

## R8-11 — Registration provenance boundary

H-02 fixes the provenance authority meaning:

```text
the exact Organization authority must be the source of the immutable
registration action for one exact registration revision.
```

The registration action semantically binds:

```text
action class = register-isolation-attestation-authority
Organization
IAA identity
registration subject/revision
all exact registration ceilings
claimed effective interval
predecessor
```

H-02 does NOT invent generic Organization-governance identity/revision types.

H-10 isolation governance must later define the proof/commitment domain for this exact action.

H-11 isolation governance must later define the authoritative application/materialization/history evidence.

Local configuration cannot substitute for either.

---

## R8-12 — Registration lifecycle authority

The positive registration revision is immutable.

Organization authority owns ordinary:

```text
retirement
supersession
```

of its positive registration stream.

H-11 isolation governance owns:

```text
authoritative current-head resolution
revocation
compromise
rollback
fork/equivocation handling
historical eligibility
terminal history
```

A mutable implementation `status` field is never authority.

---

# PART III — WORKSPACE NARROWING WITHOUT GENERIC GOVERNANCE TYPES

## R8-13 — WorkspaceIAAStateSubjectIdentity

For exact Workspace-present use define:

```text
WorkspaceIAAStateSubjectIdentity =
(
  OrganizationIAARegistrationSubjectIdentity,
  Organization,
  Workspace
)
```

Allocator:

```text
exact Workspace authority operating within accepted parent Organization delegation.
```

Equality:

```text
exact tuple equality.
```

Only one stable Workspace IAA state subject may exist for this exact tuple.

Duplicate stable subjects fail closed.

This H-02 object does NOT attempt to define a generic Organization delegation identity system.

Accepted H-02 parentage/delegation authority remains an independent prerequisite.

If exact Organization parentage/delegation cannot be verified, use fails closed.

---

## R8-14 — WorkspaceIAAStateRevisionIdentity

```text
WorkspaceIAAStateRevisionIdentity =
(
  WorkspaceIAAStateSubjectIdentity,
  workspaceLocalStateRevisionIdentity
)
```

Allocator:

```text
exact Workspace authority.
```

Unique within the stable subject stream.

No alias, reassignment, reuse, or repointing.

H-11 isolation governance later owns predecessor/current-head/fork/rollback mechanics.

---

## R8-15 — Closed Workspace IAA state outcome

Each immutable Workspace IAA state revision has exactly one:

```text
no-stricter-overlay

denied

positive-overlay(WorkspaceIAAOverlayRevisionIdentity)
```

Meaning:

```text
no-stricter-overlay
    affirmative Workspace-authority statement that no additional
    IAA-specific local narrowing applies;

denied
    current use is denied in this Workspace;

positive-overlay(X)
    exact immutable overlay revision X supplies the additional
    Workspace-local narrowing.
```

Omission never means `no-stricter-overlay`.

The IAA cannot choose which state revision is current.

---

## R8-16 — WorkspaceIAAOverlaySubjectIdentity

Use exactly one overlay subject stream per Workspace IAA state subject:

```text
WorkspaceIAAOverlaySubjectIdentity =
(
  WorkspaceIAAStateSubjectIdentity,
  overlay
)
```

This removes the undefined concept of an "intended overlay policy lineage."

Allocator:

```text
exact Workspace authority.
```

Equality:

```text
exact tuple equality.
```

There is exactly one stable overlay subject for one Workspace IAA state subject.

---

## R8-17 — WorkspaceIAAOverlayRevisionIdentity

```text
WorkspaceIAAOverlayRevisionIdentity =
(
  WorkspaceIAAOverlaySubjectIdentity,
  workspaceLocalOverlayRevisionIdentity
)
```

Allocator:

```text
exact Workspace authority.
```

Unique in that subject stream.

No alias, reassignment, reuse, or repointing.

Historical revision identity is immutable.

---

## R8-18 — Closed overlay semantics

Each positive overlay revision semantically carries exactly:

```text
WorkspaceIAAOverlaySemantics {
  overlaySubject
  overlayRevision
  exactRegistrationSubject
  exactWorkspaceStateSubject

  participantSideNarrowing
  profileNarrowing
  boundaryPermissionSubjectNarrowing
  isolationUseDisposition
  effectiveIntervalNarrowing

  predecessorRevision
  claimedEffectiveInterval
}
```

Every narrowing field is a required tagged union.

### participantSideNarrowing

```text
no-claim
| exact-set(subset of {host-side, agent-side})
```

Present empty set means permit none.

### profileNarrowing

```text
no-claim
| exact-set(future H-13-S2 isolation profile identities/classes)
```

Present empty set means permit none.

### boundaryPermissionSubjectNarrowing

```text
no-claim
| exact-set(IsolationBoundaryPermissionSubjectIdentity)
```

Present empty set means permit none.

### isolationUseDisposition

```text
no-claim
| permit-within-other-ceilings
| deny
```

`permit-within-other-ceilings` creates no positive authority.

### effectiveIntervalNarrowing

```text
no-claim
| exact-interval(inclusive-start, exclusive-end)
```

Malformed/nonordered interval is invalid.

### predecessorRevision

```text
absent
| present(exact prior WorkspaceIAAOverlayRevisionIdentity)
```

### claimedEffectiveInterval

Same claimed-start / open-or-exclusive-end semantics as Organization registration.

Unknown authority-affecting overlay members fail closed.

---

## R8-19 — Workspace overlay authority limit

Workspace overlay may narrow only:

```text
participant side
already H-13-defined isolation profile set
already Organization-authorized boundary permission subject set
current experiment-isolation use in this Workspace
effective local time window
```

It cannot author or change:

```text
Organization identity/parentage
IAA identity
Organization registration source authority
positive boundary permission
AgentIdentity
PassportReference
ConnectionIdentity
human consent
experiment identity/definition
Connection authority
```

---

## R8-20 — Workspace current-use intersection

For Workspace-present current use:

```text
effective isolation permission =
    current Organization registration ceiling
    INTERSECT
    current Workspace IAA state
    INTERSECT
    exact positive overlay, if selected
    INTERSECT
    exact current boundary permission
    INTERSECT
    other accepted current Trust/policy narrowing
```

Outcome handling:

```text
no-stricter-overlay
    no overlay object is required;

denied
    current use denied;

positive-overlay(X)
    X must exist, validate, be current/historically resolvable,
    and bind the exact Workspace IAA state subject.
```

No fallback source exists.

---


## R8-20A — Workspace-absent current-use branch

Workspace absence is an exact Connection scope branch.

It is **not**:

```text
an inferred Workspace;
a default Workspace;
a null Workspace;
an empty Workspace;
a wildcard Workspace;
or an affirmative Workspace `no-stricter-overlay` decision.
```

The Workspace-absent branch is eligible only when all are true:

```text
1. authoritative Connection Workspace tag = absent;

2. current Organization registration `permittedWorkspaceScope` is exactly:
       organization-wide
       OR
       workspace-absent-only;

3. current boundary permission tagged Workspace scope = workspace-absent;

4. no WorkspaceIAAStateSubjectIdentity participates;

5. no WorkspaceIAAStateRevisionIdentity participates;

6. no WorkspaceIAAOverlaySubjectIdentity participates;

7. no WorkspaceIAAOverlayRevisionIdentity participates;

8. no Workspace-present, inferred, defaulted, null, empty, or wildcard
   Workspace value participates in any authority projection.
```

For Workspace-absent current use:

```text
effective isolation permission =
    current Organization IAA registration
    INTERSECT
    current boundary permission
    INTERSECT
    future H-13 measurement correspondence/currentness
    INTERSECT
    authoritative Connection equality
    INTERSECT
    current Trust/policy narrowing
    INTERSECT
    consent/experiment and every other independently required accepted gate
```

A missing Workspace state is therefore correct for this branch and is not an
implicit `no-stricter-overlay`.

Conversely, any Workspace state or overlay presented for a Workspace-absent
Connection is wrong-scope and non-authorizing.

---

# PART IV — ORGANIZATION-DECLARED BOUNDARY PERMISSION

## R8-21 — Explicit human choice on physical uniqueness

Define:

```text
GovernedBoundaryLineageKey
```

as an **Organization-declared permission-target lineage identifier only**.

It does NOT establish:

```text
physical runtime identity
physical uniqueness
runtime deduplication
measurement equivalence
isolation-coverage uniqueness
```

This is an explicit H-02 choice.

Physical/runtime subject identity and equality belong to H-13-S2.

Therefore:

```text
two different GovernedBoundaryLineageKey values are two different H-02
permission subjects even if future H-13 measurement evidence concludes that
they map to the same physical/runtime subject.
```

Any consequence of that physical duplication for isolation coverage is H-13-S2-owned.

---

## R8-22 — GovernedBoundaryLineageKey

Define:

```text
GovernedBoundaryLineageKey =
(
  Organization,
  tagged Workspace permission scope,
  purpose = experiment-isolation,
  organizationLocalBoundaryPermissionLineageIdentity
)
```

`tagged Workspace permission scope` is exactly:

```text
workspace-absent
| workspace-present(exact Workspace)
```

Allocator:

```text
exact Organization authority.
```

Equality:

```text
exact tuple equality only.
```

No alias, reassignment, reuse, or recycling.

A retired key remains permanently reserved historically.

The key is hidden from tenant-facing protocol carriers unless a later human-accepted H-02 privacy decision explicitly allows disclosure.

The Organization is authoritative for declaring the permission lineage represented by the key.

The Organization is NOT thereby authoritative for physical/runtime equality.

---

## R8-23 — IsolationBoundaryPermissionSubjectIdentity

Define:

```text
IsolationBoundaryPermissionSubjectIdentity =
(
  GovernedBoundaryLineageKey,
  IsolationAttestationAuthorityIdentity,
  participantSide
)
```

`participantSide` is exactly:

```text
host-side
| agent-side
```

Allocator:

```text
exact Organization authority.
```

Equality:

```text
exact tuple equality.
```

No alias, reassignment, reuse, or recycling.

One stable permission subject exists for one exact tuple.

---

## R8-24 — IsolationBoundaryPermissionRevisionIdentity

```text
IsolationBoundaryPermissionRevisionIdentity =
(
  IsolationBoundaryPermissionSubjectIdentity,
  organizationLocalBoundaryPermissionRevisionIdentity
)
```

Allocator:

```text
exact Organization authority.
```

Unique within the subject stream.

No alias, reassignment, reuse, or repointing.

H-11 isolation governance later owns authoritative current-head/fork/rollback/history.

---

## R8-25 — Exact H-02 boundary permission semantics

Each permission revision semantically binds exactly:

```text
BoundaryPermissionSemantics {
  permissionSubject
  permissionRevision

  Organization
  tagged Workspace permission scope

  OrganizationIAARegistrationSubjectIdentity
  exact OrganizationIAARegistrationRevisionIdentity used as the positive ceiling

  IsolationAttestationAuthorityIdentity
  participantSide

  GovernedBoundaryLineageKey

  permittedIsolationProfileCeiling

  purpose = experiment-isolation

  predecessorRevision
  claimedEffectiveInterval
}
```

No `opaque boundary descriptor` participates.

`permittedIsolationProfileCeiling` is an exact finite set of future H-13-S2 profile identities/classes.

Empty set means no profile is permitted.

Duplicates reject.

Order is nonsemantic.

The permission semantic identity/equality is the exact tuple of these H-02 fields.

---

## R8-26 — Boundary permission commitment boundary

H-02 fixes the exact semantic field participation in R8-25.

Future H-10 isolation governance may define:

```text
canonical bytes
domain separation
digest profile
proof profile
context-safe tenant-visible commitment carrier
```

for these exact semantics.

H-10 MUST NOT:

```text
add/remove H-02 permission fields;
change H-02 equality;
treat hidden GovernedBoundaryLineageKey as tenant-visible;
or merge permission authority with measurement truth.
```

Thus:

```text
H-02 chooses semantics.
H-10 chooses cryptographic commitment mechanics.
```

---

# PART V — MEASUREMENT/TRUTH OWNER BOUNDARY

## R8-27 — H-13-S2 owns runtime/producer semantics

H-02 intentionally does not define the physical/runtime measurement ontology.

H-13-S2 MUST later define the exact semantic objects for:

```text
runtime subject identity/equality
physical/runtime equivalence
producer classes
named versus anonymous producer semantics
producer evidence identity/equality
measurement evidence vocabulary
measurement-result vocabulary
measurement-time semantic object
runtime substitution/misbinding detection
duplicate-runtime detection when coverage depends on uniqueness
coverage consequence when two H-02 permission lineages map to one runtime
freshness/revalidation cadence
```

Until H-13-S2 is accepted, no implementation may invent those semantics.

---

## R8-28 — Non-transfer invariant between permission and measurement

Regardless of H-13-S2's future representation:

```text
Organization permission evidence
    MUST NOT substitute for runtime measurement evidence.

IAA/producer measurement evidence
    MUST NOT create Organization permission.

Trust verification
    MUST NOT create either permission or measurement truth.

Workspace narrowing
    MUST NOT create positive permission.
```

A usable isolation result requires both:

```text
1. a valid H-02 boundary permission subject/revision; and
2. valid future H-13-S2 measurement evidence proving that the runtime evidence
   corresponds to the permission target under H-13's exact semantics.
```

The exact runtime-binding object is H-13-S2-owned.

---

## R8-29 — IAA source authority over measured facts

The IAA may assert only the measured facts allowed by the exact H-13-S2 profile selected for the Connection.

IAA cannot:

```text
choose a different profile;
weaken the selected profile;
invent a permission target;
replace Connection scope;
claim Organization/Workspace authority;
convert measurement success into policy ALLOW.
```

---

# PART VI — PRIVACY AND PRESENTATION FRAMEWORK

## R8-30 — Privacy property over exact tenant contexts

Adopt:

```text
IAA-SPECIFIC PROTOCOL-CARRIER UNLINKABILITY
ACROSS UNEQUAL EXACT TENANT CONTEXTS
```

Define:

```text
ExactTenantContext =
(
  Organization,
  tagged Workspace presence/value
)
```

Two exact tenant contexts are equal only when:

```text
Organization values are exactly equal;
Workspace presence/absence tags are exactly equal; and
when present, Workspace values are exactly equal.
```

Therefore all of these are unequal contexts:

```text
Organization A / Workspace absent
!= Organization A / Workspace X

Organization A / Workspace absent
!= Organization B / Workspace absent

Organization A / Workspace X
!= Organization A / Workspace Y

Organization A / Workspace X
!= Organization B / Workspace X
```

The protected rule applies to every tenant-visible IAA-specific value whose:

```text
equality,
repeated byte pattern,
decryption-independent comparison,
reference resolution,
or deterministic derivation
```

can function as a cross-context correlator.

It explicitly includes:

```text
identity values
aliases
handles
references
tokens
ciphertexts
envelopes
commitments
digests
stable proof/signature bytes
key IDs/thumbprints
Trust result/evidence references
boundary/registration/IAA presentation carriers
nested evidence carriers with equivalent correlation behavior
```

For any two unequal `ExactTenantContext` values, a protected IAA-specific
tenant-visible carrier MUST NOT have the same stable value in both contexts,
unless R8-36's exact accepted-upstream-field exception applies.

This does NOT claim universal protection against statistical inference from
legitimate latency, availability, or experiment output.

---

## R8-31 — Exact presentation namespaces

Every presentation namespace embeds one exact `ExactTenantContext`.

Define:

```text
TenantPresentationNamespace =
(
  ExactTenantContext,
  purpose = experiment-isolation,
  presentationClass
)
```

and:

```text
ConnectionPresentationNamespace =
(
  ExactTenantContext,
  purpose = experiment-isolation,
  presentationClass,
  ConnectionIdentity,
  audience,
  target
)
```

No implementation may dynamically omit a tuple member.

Projection coherence under R8-01A requires that the namespace's Organization
and tagged Workspace projection exactly equal the mapped source/context.

For ConnectionPresentationNamespace, ConnectionIdentity, audience, and target
must also exactly equal the authoritative H-07 Connection context.

The cross-context privacy rule in R8-30 applies even when two raw presentation
values live in different namespaces: namespace inequality alone does not make
equal repeated bytes safe.

---

## R8-32 — H-02-owned presentation classes

The H-02-owned presentation classes are exactly:

Tenant namespace:

```text
iaa-authority
iaa-registration
boundary-permission
workspace-isolation-governance
trust-isolation-governance-result
```

Connection namespace:

```text
boundary-permission-for-connection
trust-isolation-current-result
```

Future H-13/H-10-owned measurement/proof carrier classes MUST be explicitly assigned by their owning accepted decision to either the exact Tenant or Connection namespace shape above before becoming tenant-visible.

They cannot invent a weaker privacy context.

Unknown IAA-specific presentation class fails closed.

---

## R8-33 — Namespace-wide injectivity and cross-context nonreuse

Within one exact presentation namespace:

```text
one tenant-visible presentation value
    may resolve to exactly one stable semantic source subject
    across current and historical revisions.
```

A presentation value:

```text
cannot map to two subjects simultaneously;
cannot be reassigned later;
cannot be recycled after retirement;
cannot be repaired by current alias configuration.
```

Collision or ambiguous resolution fails closed.

Additionally, for any two unequal `ExactTenantContext` values:

```text
the same protected tenant-visible carrier value MUST NOT be allocated,
returned, or reused across both contexts
```

unless the exact accepted-upstream-field exception in R8-36 applies.

This cross-context nonreuse applies even when the two carriers belong to
different TenantPresentationNamespace or ConnectionPresentationNamespace values.

---

## R8-34 — H-02 presentation mapping ownership matrix

```text
presentationClass
    positive mapping owner
    source subject

iaa-authority
    Organization authority
    IsolationAttestationAuthorityIdentity

iaa-registration
    Organization authority
    OrganizationIAARegistrationSubjectIdentity

boundary-permission
    Organization authority
    IsolationBoundaryPermissionSubjectIdentity

workspace-isolation-governance
    Workspace authority
    WorkspaceIAAStateSubjectIdentity

trust-isolation-governance-result
    Trust verification service
    exact verified governance-evidence subject/context

boundary-permission-for-connection
    Organization authority
    exact IsolationBoundaryPermissionRevisionIdentity + Connection context

trust-isolation-current-result
    Trust verification service
    exact current isolation verification context
```

H-02 requires immutable, historically resolvable mapping evidence.

H-10 isolation governance later owns proof/commitment mechanics.

H-11 isolation governance later owns mapping currentness/history/revocation/rollback mechanics.

---

## R8-35 — Non-disclosing Trust result

A tenant-facing Trust result must bind its exact R8-31 namespace.

It may expose only:

```text
context
safe verification category/status
safe reason category where allowed
context-safe presentation/reference
safe historical/current evidence commitment/reference
```

It MUST NOT expose as a stable carrier across unequal `ExactTenantContext` values:

```text
provider-global Trust root identity
provider-global IAA identity
hidden GovernedBoundaryLineageKey
private physical/runtime identity
proof-key identity/thumbprint shared across unequal ExactTenantContext values
```

unless a later human-accepted H-02 privacy decision explicitly changes the floor.

---

## R8-36 — Upstream-equality exception is closed

A protected IAA-specific carrier may be equal across two unequal
`ExactTenantContext` values **only** when:

```text
an already-accepted upstream protocol requirement explicitly requires
that exact object field/value to be equal across those exact tenant contexts.
```

The exception is:

```text
field-specific
value-specific
authority-specific
```

It is not a class-wide or provider-wide exemption.

Similarity, convenience, same provider, same physical runtime, same IAA,
same Trust root, same algorithm, same public key, or future profile preference
is not enough.

H-13/H-10/H-11 cannot widen this exception.

---

# PART VII — CONNECTION AUTHORITY IS EQUALITY-ONLY

## R8-37 — One exact Connection

A protocol isolation attestation/evidence result used for current experiment-bearing authority is bound to one exact authoritative `ConnectionIdentity`.

It MUST NOT be replayed as the authority-bearing isolation result for a different Connection.

Lower measurement evidence reuse may be permitted only by future H-13-S2 semantics and still requires a fresh Connection-specific isolation result/proof.

---

## R8-38 — Connection-owned fields are not IAA source claims

IAA has zero positive source authority for:

```text
ConnectionIdentity
ProtocolRelease
AgentIdentity
Passport binding
Host identity where the accepted Connection requires it
audience
target
Organization
Workspace tag/value
ExperimentIdentity
release-owned experiment definition
final consent/opt-in
selected isolation profile
any accepted H-10 Connection-bound semantic commitment
```

If repeated in isolation evidence, each is an exact consistency/equality claim only.

---

## R8-39 — Mandatory verifier direction

The verifier MUST independently load the authoritative H-07 Connection bundle and exact historically resolvable selected semantics.

It then exact-compares every repeated Connection-owned isolation field.

The verifier MUST NOT:

```text
populate a missing Connection field from IAA evidence;
repair history from current defaults;
select a profile from IAA preference;
infer Workspace;
replace Passport/Host/audience/target;
or treat IAA signature validity as Connection authority.
```

Any required disagreement or unresolvable authoritative Connection binding is non-authorizing.

---

## R8-40 — Compact H-10 commitments may not outrun their owners

H-02 does NOT claim that every future Connection commitment projection is already closed.

Rule:

```text
A compact H-10 semantic commitment may substitute for/directly bind a
Connection-owned semantic set only after its owning accepted H decision has
closed the exact semantic projection and equality required for that use.
```

Until then, H-02 requires direct equality to the authoritative Connection-owned semantics.

H-10 domain allocation alone does not make an unresolved semantic projection complete.

This applies particularly to any future use of:

```text
negotiation transcript commitment
final selected-result commitment
Connection authority commitment
```

The accepted separation among those concepts must be preserved.

---

# PART VIII — PROOF, HISTORY, AND DOWNSTREAM OWNER CONTRACT

## R8-41 — H-10 isolation supplement must preserve H-02

After H-02-S1 and required H-13-S2 measurement semantics are accepted, H-10 isolation governance must define the cryptographic realization.

It must preserve:

```text
Organization permission != IAA measurement truth
Workspace narrowing-only authority
exact Connection equality-only direction
exact boundary permission H-02 semantic fields
R8 privacy namespaces
no protected-carrier reuse across unequal ExactTenantContext values
no direct or transitive self-reference
```

H-10 may define:

```text
canonical proof-excluded payload
domain-separated semantic commitments
signature/proof domains
key purposes
canonical bytes
digest profiles
proof instance identity
```

H-10 may not change H-02 source authority or H-13 measurement meaning.

---

## R8-42 — Acyclic proof requirement

The future H-10 isolation construction MUST be acyclic.

At minimum:

```text
all semantic inputs must exist before the semantic commitment;

the semantic commitment must exist before its proof;

the proof must exist before proof-materialization evidence;

no direct or transitive semantic dependency may point backward to the same
commitment/proof/materialization chain.
```

A detected or indeterminate cycle fails closed.

This is the H-02/H-10 boundary invariant; final field inventory is downstream-owned after H-13 closes measurement semantics.

---

## R8-43 — Proof reissuance rule

A newly created proof over an older unchanged semantic commitment is:

```text
a new proof-creation event,
not a new semantic meaning.
```

Every new proof creation must satisfy current proof-creation authority at its own H-11-qualified materialization interval.

Later historical verification cannot repair a proof that was unauthorized when created.

Exact proof/time evidence types remain H-10/H-11-owned.

---

## R8-44 — H-11 isolation supplement ownership

H-11 isolation governance MUST later define:

```text
current-head/predecessor/fork/rollback semantics
for registration, Workspace state/overlay, boundary permission,
and presentation mappings;

revocation/compromise;

authoritative materialization/application evidence;

proof-creation eligibility;

trusted time/interval semantics;

historical verification;

terminal history;

anti-rollback and restart behavior.
```

H-02 fixes only:

```text
claimed time is not authority;
current defaults cannot reconstruct history;
later evidence cannot retroactively manufacture earlier authority.
```

---

## R8-45 — H-13-S2 ownership

H-13-S2 MUST later define the measurement/coverage semantics listed in R8-27.

It MUST preserve:

```text
permission != measurement truth;
selected profile cannot be weakened by IAA/provider;
physical/runtime equality does not rewrite H-02 permission-subject equality;
coverage consequences cannot create Organization permission;
privacy carriers must use R8-30 through R8-36.
```

If H-13-S2 requires a new Connection-wide lifecycle state or transition, that requires a separate H-07 supplement.

Revision 8 itself creates no Connection state.

---

## R8-46 — D1 normative gate

Accepted H decisions do not themselves create final normative `REQ-*` text.

After H-02-S1 Revision 8 plus required H-13/H-10/H-11 isolation decisions are accepted, the project MUST create and independently review a D1 Experimental Isolation normative supplement.

Only accepted D1 requirements may then flow into D2 representation/conformance evidence.

D2 cannot be the first layer to invent isolation semantics.

---

# PART IX — FAIL-CLOSED AND HISTORICAL INVARIANTS

## R8-47 — Fail-closed conditions

Current isolation use is non-authorizing when required authority/evidence is:

```text
missing
ambiguous
wrong Organization/Workspace
wrong Connection
wrong Agent/Passport/Host/audience/target
wrong experiment/consent/profile
wrong IAA identity
wrong/ineligible Organization registration
wrong Workspace state
Workspace state = denied
missing selected positive overlay
Workspace state/overlay supplied on Workspace-absent branch
overlay widening an upstream ceiling
wrong boundary permission subject/revision
projection contradiction or repeated-component mismatch
permission scope mismatch
permission and measurement evidence not proven to correspond
Trust result indeterminate
privacy mapping collision
protected-carrier reuse across unequal ExactTenantContext values
stale/revoked/compromised/rolled-back evidence
historically unresolvable
proof created while ineligible
cryptographically invalid
```

No fallback source, weaker profile, current default, provider shortcut, or local alias may authorize.

---

## R8-48 — Historical nonreinterpretation

Historical verification must preserve the original semantic identities/context for:

```text
IAA identity
Organization registration subject/revision
Workspace state revision
positive overlay revision where applicable
boundary permission subject/revision
tenant presentation mapping
Connection identity/scope/selected semantics
future H-13 measurement evidence
future H-10 commitment/proof
future H-11 materialization/history evidence
```

Current configuration or later governance cannot reinterpret an old historical record into a different authority context.

---

# PART X — CLEAN-ROOM TEST

## R8-49 — Clean-room authority questions

Two independent clean-room reviewers must answer identically:

1. What does IAA positively assert?
   **Measured isolation facts only, under the exact selected H-13 profile.**

2. Who positively registers an IAA for an Organization?
   **Organization authority.**

3. Can Workspace create an IAA registration?
   **No.**

4. Can Workspace deny/narrow Organization-permitted IAA use?
   **Yes, within exact Workspace authority.**

5. Is `no-stricter-overlay` omission?
   **No; it is an affirmative Workspace state for Workspace-present scope.**

6. What happens when authoritative Connection Workspace tag is absent?
   **The explicit Workspace-absent branch in R8-20A applies; no Workspace state or overlay participates.**

7. Is Workspace absence equal to `no-stricter-overlay`?
   **No.**

8. When is a positive overlay required?
   **Only when current Workspace-present state explicitly selects its exact revision.**

9. Can Workspace overlay change Connection identity or human consent?
   **No.**

10. What does `GovernedBoundaryLineageKey` identify?
    **An Organization-declared permission-target lineage only.**

11. Does that key prove physical/runtime uniqueness?
    **No.**

12. Who owns physical/runtime identity/equality?
    **H-13-S2.**

13. If two permission keys later map to one runtime, do they become H-02-equal?
    **No. H-13 decides coverage consequence.**

14. What exact H-02 fields define boundary permission semantics?
    **R8-25, and no opaque descriptor.**

15. Can H-10 choose different H-02 permission fields?
    **No.**

16. Can Organization permission substitute for runtime measurement?
    **No.**

17. Can IAA measurement create permission?
    **No.**

18. What is the global projection-coherence rule?
    **Every repeated/embedded/referenced/derivable H-02 component must agree exactly.**

19. If embedded Organization A conflicts with explicit Organization B, which wins?
    **Neither. The object is invalid and non-authorizing.**

20. Can H-10 sign contradictory H-02 projections into authority?
    **No. Cryptographic validity does not repair semantic contradiction.**

21. What privacy comparison unit applies?
    **ExactTenantContext = (Organization, tagged Workspace presence/value).**

22. Is Organization A / Workspace absent unequal to Organization A / Workspace X?
    **Yes.**

23. Is Organization A / Workspace absent unequal to Organization B / Workspace absent?
    **Yes.**

24. May a protected stable ciphertext/token/proof-byte carrier be reused across unequal ExactTenantContext values?
    **No, unless an accepted upstream requirement explicitly mandates equality for that exact field/value.**

25. What are the exact presentation namespace shapes?
    **R8-31 Tenant and Connection namespaces, each embedding ExactTenantContext.**

26. Can a presentation value resolve to two subjects in one namespace?
    **No.**

27. Is a Trust result permission authority?
    **No.**

28. Is one current isolation authority result bound to one exact Connection?
    **Yes.**

29. Can IAA populate Connection-owned semantics?
    **No; equality-only.**

30. Does R8 require an unresolved future H-10 commitment merely because its domain exists?
    **No.**

31. Who owns producer/runtime ontology?
    **H-13-S2.**

32. Who owns final canonical proof payload/domain/bytes?
    **H-10 isolation governance after H-13 semantics are accepted.**

33. Who owns current-head/revocation/materialization/history mechanics?
    **H-11 isolation governance.**

34. Does R8 create a new Connection state?
    **No.**

35. Can D2 implement isolation semantics before D1 normative requirements exist?
    **No.**

Materially different valid H-02 answers mean R8 is not acceptance-ready.

---

# R8-50 — Revision-7 hostile finding disposition

```text
H02-R7-001 projection-coherence / contradiction gap
    CLOSED:
    R8-01A establishes universal exact projection coherence and invalidates
    every contradictory repeated/embedded/derivable H-02 component.

H02-R7-002 Workspace-absent current-use path
    CLOSED:
    R8-20A defines the exact Workspace-absent branch, its registration and
    boundary-permission scope requirements, and the exclusion of Workspace
    state/overlay objects.

H02-R7-003 privacy boundary limited to distinct Workspaces
    CLOSED:
    R8-30/R8-31/R8-33/R8-36 use ExactTenantContext =
    (Organization, tagged Workspace presence/value) and prohibit protected
    carrier equality across every unequal exact tenant context.

R7-DS-001 H-13-S2 measurement/runtime semantics
    REMAINS DOWNSTREAM ONLY / NONBLOCKING FOR H-02.

R7-DS-002 H-10 cryptographic realization
    REMAINS DOWNSTREAM ONLY / NONBLOCKING FOR H-02.

R7-DS-003 H-11 currentness/history realization
    REMAINS DOWNSTREAM ONLY / NONBLOCKING FOR H-02.

R7-DS-004 D1 normative requirements
    REMAINS DOWNSTREAM ONLY / NONBLOCKING FOR H-02.
```

These closure statements were confirmed by the final hostile review.

Revision 8 does not reopen R7 areas already found PASS:
role/source separation, physical-uniqueness ownership, producer/runtime owner
boundary, Connection equality direction, acyclicity, proof reissuance, no new
Connection state, or downstream governance gates.

---

# R8-51 — Human decision accepted

Human acceptance of Revision 8 approves only:

```text
1. IAA as a narrow measured-fact role;
2. Organization positive IAA registration authority;
3. Workspace narrowing-only isolation authority;
4. Trust verification as evidence-only;
5. exact IAA identity and Organization registration subject/revision semantics;
6. closed Organization registration ceilings and Workspace applicability;
7. closed Workspace state/overlay semantics;
8. universal projection coherence and contradiction rejection for every
   repeated/embedded/derivable H-02 identity/scope component;
9. an explicit Workspace-absent current-use branch with no Workspace
   state/overlay participation;
10. GovernedBoundaryLineageKey as permission-target identity only,
    not physical identity;
11. exact boundary permission subject/revision semantics;
12. exact H-02 boundary permission field participation;
13. permission != measurement truth;
14. H-13-S2 ownership of runtime/producer/measurement ontology;
15. IAA-specific protected-carrier unlinkability across every unequal
    ExactTenantContext=(Organization, tagged Workspace);
16. exact Tenant/Connection presentation namespaces and injectivity;
17. non-disclosing Trust result floor;
18. one-exact-Connection replay boundary;
19. IAA zero source authority over Connection-owned semantics;
20. unresolved compact H-10 commitments cannot substitute for direct semantics;
21. acyclic proof and new-proof-creation invariants;
22. H-11 ownership of currentness/history/materialization;
23. mandatory H-13/H-10/H-11 follow-ons;
24. mandatory D1 normative gate before D2;
25. no new Connection state in H-02-S1.
```

Acceptance does NOT authorize implementation, schemas, D2, conformance,
publication, release, production readiness, or Protocol 1.0.

---

# R8-52 — Downstream order

```text
H-02-S1 Revision 8
    hostile review — completed
    independent adjudication — completed
    explicit human acceptance — completed

then:
    H-13-S2 measurement/coverage semantics

then dependency-ordered:
    H-10 isolation cryptographic/projection supplement
    H-11 isolation history/currentness supplement

then:
    D1 Experimental Isolation normative REQ-* supplement
    independent designability/security/privacy review
    acceptance

then:
    D2-BG-02-S1 Revision 2
    D2-BG-03 Revision 9
    D2 executable evidence
```

No lower layer may consume unresolved higher authority.

---

# R8-53 — H-02 stop rule

After hostile review and independent adjudication:

```text
IF:
    H02_BLOCKERS = 0
    AND
    H02_MAJORS = 0

AND every remaining finding is only:
    DOWNSTREAM_H13_S2
    DOWNSTREAM_H10
    DOWNSTREAM_H11
    DOWNSTREAM_D1
    DOWNSTREAM_D2
    WORDING_ONLY
    NONBLOCKING

THEN:
    H-02-S1 reached READY_FOR_HUMAN_DECISION before acceptance.
    DO NOT issue Revision 9 merely for downstream detail.
```

Another H-02 revision is justified only by a demonstrated remaining:

```text
trusted-source ambiguity
authority transfer/widening
constitutional identity/equality ambiguity
tenant/workspace permission ambiguity
privacy-boundary bypass
Connection equality/replay ambiguity
historical nonreinterpretation ambiguity
```

---

```text
H02_S1_REVISION_8_ACCEPTED
HUMAN_ACCEPTANCE_RECORDED=YES
REVISION_9_REQUIRED=NO
IMPLEMENTATION_AUTHORIZED=NO
SCHEMA_WORK_AUTHORIZED=NO
D2_AUTHORIZED=NO
```
