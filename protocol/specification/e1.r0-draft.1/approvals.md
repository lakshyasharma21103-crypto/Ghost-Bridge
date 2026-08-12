# Approvals

This chapter defines exact-action Approval Challenge, Decision, conditional
authority, continuation, consumption, replay prevention, and recovery semantics
for `ghostbridge/e1.r0-draft.1`. It does not define wire schemas, HTTP
operations or errors, an executable state machine, post-acceptance Task/Result/
Receipt behavior, migration, or release status.

## REQ-APPR-0001 - Distinct Approval and acceptance concepts

**Requirement.** An Approval Challenge MUST remain a durable request for an
eligible human or authorized approver to decide one exact action. An Approval
Decision MUST remain one immutable authenticated outcome for one Challenge.
Exact-action Approval authority MUST remain the single-use conditional
authority that can arise only from one valid approved Decision. An Approval
continuation MUST remain a currently authenticated request to resume admission
of the originally bound Invocation. Invocation acceptance MUST remain the H-07
final durable serialized authority boundary, and Task execution, effects,
Result, and Receipt MUST remain downstream H-09 facts.

Creating, viewing, authenticating access to, presenting, or deciding a
Challenge MUST NOT by itself authenticate or authorize an Invocation, establish
Trust or Connection authority, satisfy policy, accept work, create a Task, or
cause an effect. An approved Decision MUST NOT be a bearer credential,
standalone action authority, or general authorization. The Agent MUST remain
the final enforcer of every applicable gate.

**Applies to.** Challenge, Decision, Approval authority, continuation,
Invocation acceptance, and the handoff to Task processing.

**Lifecycle/state impact.** Each concept retains its own lifecycle; only the
final acceptance transaction can both consume authority and create a Task.

**Semantic failure.** Any collapsed or inferred authority relationship is
non-authorizing and MUST fail before Task creation or effect.

**Sources:** H-01, H-02, H-07, H-08, H-09. **Gaps:** GB-018, GB-019.

## REQ-APPR-0002 - Independently authorized Challenge issuance

**Requirement.** Challenge issuance MUST be independently authorized for the
verified requester, exact active Connection, Agent and Passport, tenant scope,
capability/version, target, and action. Issuance MUST bind a new Challenge
identity, an unpredictable Challenge nonce under the selected profile, the
complete exact action, issuance identity and time, strict submission expiry,
and safe presentation evidence. An exact issuance retry MAY converge on an
existing Challenge only after complete semantic equality and disclosure
authorization are proven.

Issuance MUST NOT consume authority, grant Approval authority, create a Task,
reserve an external effect, bypass authentication, authorization, Trust,
Connection or policy checks, or make a UI waiting record authoritative.

**Applies to.** Creation and exact retry of an Approval Challenge.

**Lifecycle/state impact.** A successful issuance commit creates one `open`
Challenge and no Approval authority or Task.

**Semantic failure.** Unauthorized, mismatched, duplicate-conflicting,
indeterminate, or incompletely bound issuance MUST create no Challenge or
authority; a partial record MUST be quarantined as non-authorizing.

**Sources:** H-01, H-02, H-04, H-05, H-07, H-08, H-11, H-12. **Gaps:**
GB-018, GB-019.

## REQ-APPR-0003 - Closed Challenge lifecycle

**Requirement.** The complete protocol-visible Challenge state inventory MUST
be exactly `open`, `decided`, `expired`, `cancelled`, and `superseded`. The only
legal transitions MUST be `open -> decided`, `open -> expired`,
`open -> cancelled`, and `open -> superseded`. Each destination state MUST be
terminal for that Challenge, and no other protocol-visible Challenge state MAY
be introduced. Historical `pending` material MUST NOT automatically be treated
as equivalent to `open`.

**Applies to.** Approval Challenge state validation, transition, recovery, and
historical interpretation.

**Lifecycle/state impact.** One serialized transition terminates an `open`
Challenge; a terminal Challenge never reopens or receives another transition.

**Semantic failure.** An unknown state, illegal transition, stale transition,
or attempted Decision against a terminal Challenge MUST fail without Decision,
Approval authority, Task, or mutation.

**Sources:** H-03, H-08, H-11. **Gaps:** GB-018, GB-019.

## REQ-APPR-0004 - Material change and Challenge supersession

**Requirement.** An authority- or effect-critical change to an exact action or
binding MUST NOT mutate an existing Challenge. The changed action MUST undergo
independently authorized issuance as a new Challenge with a new identity,
nonce, action digest, validity, and presentation binding. If the old Challenge
is still `open`, supersession MUST durably order its terminal transition against
Decision, cancellation, and expiry; no Decision or Approval authority MAY
transfer automatically to the replacement.

**Applies to.** Replacement of a Challenge after any material action or binding
change.

**Lifecycle/state impact.** The old `open` Challenge may become `superseded`;
the separately committed replacement begins as `open` and has no inherited
Decision or authority.

**Semantic failure.** In-place editing, identity/nonce reuse, transfer of a
Decision, or an indeterminate old/new ordering MUST fail closed and authorize
neither action until one complete history is proven.

**Sources:** H-01, H-03, H-04, H-08, H-11. **Gaps:** GB-018, GB-019.

## REQ-APPR-0005 - Closed Decision outcome vocabulary

**Requirement.** The complete human Decision outcome inventory MUST be exactly
`approved`, `denied`, and `more_information_required`. Only `approved` MAY
create `available` Approval authority, and only after the complete Decision and
authority-creation commit succeeds. `denied` and
`more_information_required` MUST create no Approval authority. Revised facts
after `more_information_required` MUST use a new Challenge and MUST NOT mutate
the original exact action. Challenge or Approval-authority lifecycle terms MUST
NOT be used as Decision outcomes.

**Applies to.** Decision validation, commit, storage, and interpretation.

**Lifecycle/state impact.** A valid Decision commit terminates the Challenge as
`decided`; only the approved outcome can atomically introduce conditional
`available` authority.

**Semantic failure.** An unknown outcome, non-approved authority creation, or
partial Decision/authority commit MUST fail closed without usable authority.

**Sources:** H-02, H-08, H-11. **Gaps:** GB-018, GB-019.

## REQ-APPR-0006 - One immutable Decision and submission convergence

**Requirement.** One Challenge MUST receive at most one immutable Decision, and
its outcome, actor, proof, limits, time, action binding, and historical evidence
MUST NOT later change. An exact repeat of the same authenticated Decision
submission MAY converge on the same immutable Decision only after complete
value-and-presence equality, approver identity, proof, and disclosure
authorization are verified. A second differing Decision for the same Challenge
MUST be a conflict and MUST NOT overwrite, merge with, or reinterpret the first.

**Applies to.** Decision submission, retry, concurrency, and recovery.

**Lifecycle/state impact.** At most one Decision commit wins the transition
from `open` to `decided`; retries cause no further transition.

**Semantic failure.** A differing, ineligible, late, ambiguous, or partial
submission MUST create no Decision or authority and MUST NOT disclose protected
contents of an existing Decision.

**Sources:** H-03, H-05, H-08, H-11, H-12. **Gaps:** GB-018, GB-019.

## REQ-APPR-0007 - Verified Approver identity and proof

**Requirement.** At Decision commit, the Approver's exact typed principal MUST
be derived from current verified evidence under the selected authentication and
Approval-proof mechanisms. Identity MUST NOT derive from a request-body
assertion, display name, requester-supplied role string, Challenge claim,
Connection ID, policy reference alone, Approval reference, or shared
organization membership. The operation MUST verify the exact Approval purpose,
audience, target, organization, tagged workspace, Challenge, action digest, and
applicable proof time and nonce context.

**Applies to.** Authentication and cryptographic verification of a Decision
submission.

**Lifecycle/state impact.** Successful verification is a necessary guard to a
Decision commit but grants no authority and causes no state transition by
itself.

**Semantic failure.** Missing, malformed, unsupported, stale, wrong-purpose,
wrong-audience, wrong-target, wrong-tenant, substituted, or untrusted identity
evidence MUST fail before Decision or authority creation.

**Sources:** H-02, H-05, H-08, H-10, H-11, H-12. **Gaps:** GB-018, GB-019.

## REQ-APPR-0008 - Approver eligibility, self-approval, and delegation

**Requirement.** Decision commit MUST verify and immutably retain the exact
eligible authority source, eligibility evaluation, relationship between
requester and Approver, and applicable policy/authorization constraints.
Identity equality MUST NOT by itself permit or prohibit self-approval. Where
self-approval is relevant, the exact accepted or stricter deployment
eligibility policy MUST explicitly dispose of it while preserving the protocol
floor; absence or ambiguity MUST NOT create eligibility. Delegation MUST keep
requester, beneficiary, effective actor, Approver, Agent, and target identities
distinct and MUST NOT transfer authority among them by implication.

**Applies to.** Approver eligibility evaluation at Decision commit and
verification of its immutable evidence at consumption.

**Lifecycle/state impact.** Eligibility can permit a Decision commit but is not
itself a Decision, Approval authority, or Invocation acceptance.

**Semantic failure.** Ineligible, ambiguous, body-claimed, or conflated
identity/authority evidence MUST create no Decision or authority; no universal
Platform role rule may be invented as a fallback.

**Sources:** H-02, H-05, H-08, H-11. **Gaps:** GB-018, GB-019.

## REQ-APPR-0009 - Applicable fields, presence, and absence

**Requirement.** The selected release MUST determine which exact-action
semantics are applicable. Every applicable value MUST be present in the
complete action projection, and every non-applicable value MUST follow its
exact registered absence rule. Value and presence MUST both be bound.
Omission, explicit null, empty value, zero, false, and tagged absence MUST
remain distinct where the owning semantic contract permits them. An optional
omission MUST NOT mean wildcard, unlimited, inherited scope, current default,
or broader authority. Every other authority- or effect-critical semantic that
the selected release defines as applicable MUST also participate.

**Applies to.** Challenge creation, Decision verification, action digest,
continuation comparison, consumption, and historical verification.

**Lifecycle/state impact.** No state transition may commit unless the complete
applicable projection and its presence states are valid and immutable.

**Semantic failure.** Missing required meaning, forbidden presence, ambiguous
absence, default insertion, or value/presence mismatch MUST fail closed without
Decision, consumption, or Task creation.

**Sources:** H-03, H-04, H-08, H-10, H-13. **Gaps:** GB-018, GB-019.

## REQ-APPR-0010 - Protocol and authority-context binding

**Requirement.** As applicable, the exact action MUST directly and immutably
bind the exact selected protocol release and profiles; Connection identity and
immutable authority context; Connection authority epoch or replacement
identity when defined; Agent identity; governed target/resource or Host
identity; Passport identity and version; Approval purpose and audience; exact
organization; and tagged workspace state with either explicit absence or the
exact present value. Each value MUST be verified against its authoritative
source and MUST NOT be redirected, aliased, inherited, or replaced by a current
default.

**Applies to.** Exact-action construction, Decision, continuation, consumption,
and recovery.

**Lifecycle/state impact.** These immutable bindings constrain the Challenge,
Decision, and any resulting authority for their complete lifetimes; they do not
create authority independently.

**Semantic failure.** Wrong release/profile, Connection, Agent, Passport,
target, audience, organization, workspace state/value, or authority epoch MUST
deny the operation without mutation or cross-scope disclosure.

**Sources:** H-01, H-03, H-04, H-07, H-08, H-10, H-11. **Gaps:** GB-018,
GB-019.

## REQ-APPR-0011 - Actor, beneficiary, and policy-context binding

**Requirement.** At Challenge issuance, the exact action MUST directly and
immutably bind, as applicable, the verified requester principal type and stable
identity, effective actor, beneficiary, target principal/resource, Approval
class or risk class, complete requested scope, exact authorization and policy
references/identities/revisions required by H-08, and every other H-08
Challenge-time authority- or effect-critical semantic. That complete action
projection and its `gb.approval.action.v1` semantic identity/digest MUST be
fixed before Decision submission and MUST NOT gain, lose, or mutate fields when
a Decision is created.

The later Approver identity and authentication/proof, Decision identity,
outcome and time, approved narrowing, exact approver eligibility/authority
source and immutable evaluation evidence, requester/Approver relationship,
self-approval disposition, safe reason category, and every other applicable
Decision-time fact MUST instead be immutable Decision/history evidence bound to
the already fixed Challenge and action identity. Those facts MUST NOT rewrite,
extend, or produce a new `gb.approval.action.v1` action under the same
Challenge. No principal, relationship, scope, policy, or eligibility fact MAY
be derived from display text, shared membership, body claims, or a later
default.

**Applies to.** Exact-action and Decision evidence construction, comparison,
and historical verification.

**Lifecycle/state impact.** Challenge-time action semantics are immutable from
Challenge issuance; Decision-time evidence becomes immutable at Decision
commit and binds to, but never changes, that action. Current policy and
authorization remain separate narrowing gates at use.

**Semantic failure.** Actor/beneficiary substitution, scope inheritance,
policy laundering, missing historical identity/evaluation evidence, or any
Decision-time mutation of the action MUST fail closed without authority or
protected disclosure. A material action change requires a new Challenge.

**Sources:** H-02, H-03, H-05, H-07, H-08, H-11, H-12. **Gaps:** GB-018,
GB-019.

## REQ-APPR-0012 - Invocation, capability, target, and effect binding

**Requirement.** As applicable, the exact action MUST directly and immutably
bind the original Invocation identity; continuation and exact Invocation
idempotency identity and namespace; exact continuation semantics; exact
capability key and version; operation/action; resource type and identity;
destination, recipient, account, repository, project, or analogous
effect-relevant target; every parameter and its presence; exact semantic
payload identity; selected input/data-contract identity; output/data-release
contract or authority where action-relevant; effect or side-effect class; and
authority-relevant lineage or delegation identity. Compatible versions, nearby
capabilities, renamed operations, type-compatible resources, redirection, and a
different Invocation or idempotency identity MUST NOT substitute.

**Applies to.** Action projection, Challenge, Decision, continuation,
consumption, exact retry, and conflict detection.

**Lifecycle/state impact.** These values define the one action to which any
resulting `available` authority is limited and the one accepted work identity to
which `consumed` authority can bind.

**Semantic failure.** Any mismatch or missing applicable binding is a material
change requiring a new Challenge and MUST NOT consume authority or create a
Task.

**Sources:** H-03, H-04, H-07, H-08, H-09, H-10. **Gaps:** GB-018, GB-019.

## REQ-APPR-0013 - Numeric semantics, limits, and validity binding

**Requirement.** At Challenge issuance, the exact action MUST directly and
immutably bind, as applicable, amount, currency, quantity, rate, range, units,
precision, aggregation semantics, locale semantics, complete requested limits,
applicable action validity boundaries, Challenge submission expiry, Invocation
admission deadline where part of the challenged action, and the applicable
selected authoritative clock/profile identity. These Challenge-time semantics
MUST be part of the already-fixed `gb.approval.action.v1` projection.

When a valid `approved` Decision commits, the complete approved narrowing and
limits MUST become immutable Decision and Approval-authority bindings to the
already-fixed Challenge and action, and the explicit Approval-authority
consumption expiry MUST become immutable Decision and authority-lifecycle
evidence. Neither the approved narrowing/limits nor the Approval-authority
expiry MAY add, remove, or mutate a field in the existing
`gb.approval.action.v1` projection. Approved narrowing MUST NOT widen the
challenged requested limits or any upstream authority. Approval-authority
expiry MUST be explicit and no later than every applicable governing maximum
under REQ-APPR-0024.

Numeric rounding, numeric/string coercion, currency substitution, unit
conversion, aggregate reset, precision loss, a longer derived expiry, and
omitted limits interpreted as unlimited MUST NOT occur. A material change to a
challenged action semantic MUST require a new Challenge.

**Applies to.** Challenge presentation and binding, approved narrowing,
Decision and consumption comparison, expiry, and historical verification.

**Lifecycle/state impact.** Requested limits and applicable Challenge-time
validity semantics are immutable from Challenge issuance. Approved narrowing
and Approval-authority expiry become immutable only at the approved Decision
and authority-creation boundary, bind to but do not change the action, and cap
later consumption eligibility independently of other proof, Connection,
policy, and Task clocks.

**Semantic failure.** A numeric, unit, limit, validity, or clock mismatch MUST
deny without consumption. Invalid approved narrowing or Approval-authority
expiry MUST prevent the complete Decision and authority-creation commit; an
attempt to alter a challenged action semantic requires a new Challenge.

**Sources:** H-04, H-05, H-07, H-08, H-10, H-11. **Gaps:** GB-018, GB-019.

## REQ-APPR-0014 - Challenge, Decision, and recovery binding

**Requirement.** As applicable, the exact protected Approval history MUST bind
the Challenge identity, nonce, issuer identity and issuance time; immutable
full action digest; safe presentation evidence; Decision identity, outcome and
serialization time; verified Approver identity; Decision proof/profile/key
evidence; approved narrowing limits; Approval-authority identity, availability
time, state/version, expiry and terminal evidence; and, after consumption, the
accepted Invocation, Task, idempotency identity/digest, H-07 sequence or fence,
transaction/log identity, audit intent, and historical anchors. Each identity
MUST retain its own semantic type and MUST NOT substitute for another.

**Applies to.** Decision, Approval-authority creation, consumption, exact retry,
recovery, and audit history.

**Lifecycle/state impact.** Decision-time fields become immutable on Decision
commit; consumption fields become immutable only in the final acceptance
commit.

**Semantic failure.** Missing, cross-linked, duplicated with different content,
or internally inconsistent lifecycle evidence MUST be non-authorizing and
quarantined rather than repaired from current state.

**Sources:** H-03, H-07, H-08, H-09, H-10, H-11, H-14. **Gaps:** GB-018,
GB-019.

## REQ-APPR-0015 - Immutable referenced evidence

**Requirement.** Where direct inclusion is not required and immutable reference
is permitted, the Approval history MUST bind the exact historical identity and
integrity digest of each applicable Connection bundle/history, selected release
artifact, input/output contract, approver eligibility and authority evaluation,
Decision authentication/proof, authorization decision, policy decision/revision,
Trust/revocation evidence, complete action descriptor, H-10 profile, H-11
anchor, and presentation/rendering profile. A reference MUST resolve to the
exact historical semantic object and integrity identity originally bound.

Current defaults, current schemas, newer release metadata, current Platform
state, or current implementation behavior MUST NOT reconstruct missing
historical meaning.

**Applies to.** Challenge and Decision validation, consumption, retry,
recovery, and historical verification.

**Lifecycle/state impact.** References and their historical meanings remain
immutable through every lifecycle state and terminal tombstone.

**Semantic failure.** Missing, changed, ambiguous, inaccessible when required,
substituted, corrupt, or rolled-back authority-critical evidence MUST fail
closed without Decision, consumption, Task, or restoration.

**Sources:** H-03, H-07, H-08, H-10, H-11, H-14. **Gaps:** GB-018, GB-019.

## REQ-APPR-0016 - Presentation is not action truth

**Requirement.** An approver-facing safe summary MAY redact or transform
sensitive material only under the selected presentation/rendering contract.
The Challenge MUST bind sufficient presentation evidence to detect
substitution, including, as applicable, the safe-summary digest,
presentation/rendering profile identity, omission/redaction manifest, rendering
version, and immutable full action-binding digest. Safe text, UI state, or a
visual match MUST NOT define the action or override the immutable action
projection.

If presentation and immutable action differ, no Decision or Approval authority
MAY be used. A hidden change to target, recipient, amount, currency, quantity,
resource, account, payload, capability/version, scope, effect, limits, actor, or
output/data-release meaning MUST require a new accurate Challenge.

**Applies to.** Challenge creation, presentation, Decision, and consumption.

**Lifecycle/state impact.** Presentation evidence is immutable Challenge
history and grants no authority; mismatch prevents Decision or consumption.

**Semantic failure.** Missing or mismatched presentation evidence MUST fail
closed, record only disclosure-safe audit information, and MUST NOT expose the
full protected action through an error.

**Sources:** H-08, H-10, H-12. **Gaps:** GB-018, GB-019.

## REQ-APPR-0017 - Exact H-10 Approval mappings

**Requirement.** Approval cryptographic processing MUST use the complete
approved H-10 profiles without alias or inference: canonicalization profile
`gb-c14n-jcs-ijson-v1`, digest profile `gb-digest-jcs-sha256-v1`, signature
profile `gb-signature-jcs-ed25519-v1`, proof profile
`gb-proof-jcs-ed25519-v1`, and key-thumbprint profile
`jwk-thumbprint-rfc7638-sha256-v1`. The Invocation payload commitment included
by the exact action MUST use digest domain `gb.invocation.payload.v1`; the
complete exact-action commitment MUST use digest domain
`gb.approval.action.v1`; and the Approval Decision proof MUST use signature
domain and proof purpose `gb.approval.proof.v1` with signing-key purpose
`approval_signing`.

**Applies to.** Payload commitment, exact-action digest creation and
verification, Decision proof creation and verification, retry, and historical
verification.

**Lifecycle/state impact.** Cryptographic validity is a necessary guard to a
Decision or consumption transition and creates no authority by itself.

**Semantic failure.** An absent, malformed, unknown, unsupported, unselected,
historical-only, or mismatched profile/domain/key-purpose mapping MUST fail
closed and MUST NOT trigger another algorithm or profile.

**Sources:** H-08, H-10, H-11. **Gaps:** GB-018, GB-019.

## REQ-APPR-0018 - Approval semantic-envelope and signer context

**Requirement.** The `gb.invocation.payload.v1` and
`gb.approval.action.v1` digests and the `gb.approval.proof.v1` Decision proof
MUST protect the H-10 semantic envelope with the exact protocol release,
purpose, audience, target, organization, and tagged workspace state/value. The
Approval-action payload MUST be the complete H-08 action projection, including
all applicable authority-critical selected extensions.

The semantic payload protected by the `gb.approval.proof.v1` Decision proof
MUST be the complete immutable H-08 Decision projection applicable to that
Decision. It MUST include at minimum the exact Decision identity; exact
Challenge identity; already-fixed `gb.approval.action.v1` action
identity/digest and its exact profile/domain identity; Decision outcome;
authoritative Decision serialization time; verified Approver principal identity
and type; exact approver eligibility/authority-source identity and immutable
evaluation evidence required by H-08; requester/Approver relationship and
self-approval disposition where applicable; complete approved narrowing and
limits with their presence states; safe Decision reason category where
applicable; and every other H-08 Decision-semantic value that the selected
release classifies as proof-covered.

For that Decision proof, the H-10 signer context MUST additionally bind the
exact key ID, exact `approval_signing` key purpose, exact approved JWK
thumbprint, and proof purpose equal to `gb.approval.proof.v1`. Context or signer
semantics MUST NOT be duplicated to invent wire fields.

Required context MUST be present; forbidden context MUST be absent. The exact
workspace-absence tag MUST be protected and MUST NOT be treated as a wildcard.

**Applies to.** Construction and verification of Approval-related digests and
proofs.

**Lifecycle/state impact.** The protected envelope fixes immutable action and
Decision meaning but does not by itself change Challenge or authority state.
Decision proof creation MUST NOT mutate the already-fixed action projection.

**Semantic failure.** The Decision proof MUST be invalid if any proof-covered
Decision semantic, exact Challenge identity, or exact approved-action
commitment has changed. Missing, extra where forbidden, unprotected, or
mismatched payload, context, or signer evidence MUST invalidate the commitment
or proof and prevent Decision or consumption. A signature over only an action
digest, outcome, display text, or implementation-specific subset MUST NOT be
sufficient.

**Sources:** H-03, H-08, H-10, H-13. **Gaps:** GB-018, GB-019.

## REQ-APPR-0019 - Cryptographic domain and profile non-substitution

**Requirement.** An authorization digest under
`gb.authorization.action.v1`, request proof under
`gb.authentication.request.v1`, Receipt proof, generic JWS, current Core or
Trust helper, legacy digest or proof, alias, fallback, nearest profile, or
claim of equal payload bytes MUST NOT substitute for an Approval action digest
or Decision proof. Algorithm, domain, profile, encoding, key purpose, and
semantic projection MUST NOT be inferred from a digest/signature length, key
type, proof carrier, object shape, current release, implementation default, or
trial verification.

**Applies to.** Decision proof and action/payload commitment verification,
negotiation, retry, and historical verification.

**Lifecycle/state impact.** Only evidence verified under every exact selected
H-10 identifier can guard a Decision or consumption transition; substituted
evidence causes no transition.

**Semantic failure.** Every substitution, downgrade, ambiguous carrier,
noncanonical input, unsupported profile, wrong purpose, or wrong key binding
MUST fail closed without fallback, mutation, Task, or authority.

**Sources:** H-02, H-03, H-05, H-08, H-10, H-11. **Gaps:** GB-018, GB-019.

## REQ-APPR-0020 - Exact value-and-presence equality

**Requirement.** At Decision and consumption boundaries, every applicable
direct semantic MUST compare for exact value and presence equality after the
registered H-10 projection. Comparison MUST NOT perform case folding, locale
comparison, ad hoc Unicode normalization, null/absence conversion,
omitted-field defaulting, numeric rounding or numeric/string coercion, unit or
currency conversion, aliasing, compatible-version substitution,
current/latest lookup, nearby capability substitution, target redirection,
Invocation or idempotency replacement, actor/beneficiary substitution, or
scope inheritance beyond the exact binding.

**Applies to.** Challenge/Decision matching, continuation, consumption, retry,
conflict detection, and history.

**Lifecycle/state impact.** Equality can permit later guard evaluation but
never creates authority; any material inequality requires a new Challenge and
Decision.

**Semantic failure.** A mismatch in one field or presence state MUST fail
before consumption and Task creation and MUST NOT disclose the protected
competing value.

**Sources:** H-03, H-04, H-08, H-10, H-12. **Gaps:** GB-018, GB-019.

## REQ-APPR-0021 - Complete limit intersection and narrowing

**Requirement.** Approved limits MAY narrow upstream authority but MUST NOT
widen Connection bounds, capability restrictions, consent, tenant scope,
Trust, structured authorization, deployment policy, action parameters, or any
other applicable limit. Decision commit MUST reject approved limits that widen
the challenged action or effective upstream bounds. Consumption MUST enforce
the complete intersection of challenged values, approved narrowing, and every
current narrower gate; later widening of another gate MUST NOT expand the
Approval.

**Applies to.** Decision limit validation and continuation/consumption limit
evaluation.

**Lifecycle/state impact.** Valid approved limits become immutable Decision and
authority bindings; a current denial or narrower limit leaves authority
unconsumed unless a separate terminal transition wins.

**Semantic failure.** Missing, partially compared, widened, reset, converted,
or incompatible limits MUST deny Decision creation or consumption as applicable
without mutation or Task.

**Sources:** H-01, H-02, H-04, H-07, H-08. **Gaps:** GB-018, GB-019.

## REQ-APPR-0022 - Closed Approval-authority lifecycle

**Requirement.** The complete protocol-visible Approval-authority state
inventory MUST be exactly `available`, `consumed`, `expired`, and `revoked`.
The only legal transitions MUST be `available -> consumed`,
`available -> expired`, and `available -> revoked`. Each destination state MUST
be terminal and MUST never return to `available`. Only the complete commit of a
valid `approved` Decision MAY create `available` authority, and `available`
MUST mean conditional single-use authority rather than sufficient permission.

**Applies to.** Approval-authority creation, state transition, validation,
recovery, and historical interpretation.

**Lifecycle/state impact.** One serialized terminal transition can win for an
`available` authority; terminal states have no exits.

**Semantic failure.** Unknown state, illegal transition, resurrection,
non-approved creation, or multiple terminal outcomes MUST fail closed without
new work.

**Sources:** H-02, H-08, H-11. **Gaps:** GB-018, GB-019.

## REQ-APPR-0023 - Internal coordination is not protocol authority

**Requirement.** No protocol-visible `reserved` state MAY exist. An
implementation MAY use locks, leases, compare-and-set markers, fencing records,
reservations, or worker ownership internally, but those mechanisms MUST grant
no authority, MUST NOT consume Approval, and MUST recover to one proven
authoritative lifecycle state without widening authority. An indeterminate or
corrupt condition MUST remain an internal fail-closed integrity classification
and MUST NOT be interpreted as an Approval-authority state or permission to
retry blindly.

**Applies to.** Concurrent Decision and consumption coordination, crashes,
failover, and storage recovery.

**Lifecycle/state impact.** Internal coordination causes no protocol state
transition; only an authoritative serialized commit changes lifecycle state.

**Semantic failure.** An abandoned, stale, ambiguous, or conflicting internal
marker MUST NOT authorize, consume, restore, or create a Task and MUST be
reconciled or quarantined.

**Sources:** H-07, H-08, H-11. **Gaps:** GB-019.

## REQ-APPR-0024 - Independent strict time boundaries

**Requirement.** Challenge submission expiry, Approval-authority consumption
expiry, approver-proof validity, requester-authentication validity, Connection
expiry, Trust/revocation freshness, authorization and policy validity,
Invocation admission deadline, Task execution timeout, and transport timeout
MUST remain independent. A Decision commit is eligible only when authoritative
serialization time is strictly before Challenge expiry. New-work consumption is
eligible only when serialization time is strictly before both Approval expiry
and the applicable Invocation admission deadline. At equality, the applicable
expiry or deadline wins.

An Approval expiry MUST be explicit and no later than every governing maximum.
A request path MUST enforce time even if no sweeper materialized a transition.
Clock rollback, restart, cache, stale process state, or local grace MUST NOT
revive terminal authority or extend validity, and no new skew allowance MAY be
invented.

**Applies to.** Decision, authority creation, expiry, continuation,
consumption, retry, and recovery.

**Lifecycle/state impact.** Challenge expiry can commit only from `open`, and
Approval expiry only from `available`; each transition serializes against its
competitors.

**Semantic failure.** Equality, unsafe/unavailable authoritative time, expired
proof or gate, rollback, or missed sweep MUST deny new Decision or acceptance
as applicable without Task creation or authority revival.

**Sources:** H-05, H-07, H-08, H-11. **Gaps:** GB-018, GB-019.

## REQ-APPR-0025 - Available authority is necessary but insufficient

**Requirement.** Before any new-work continuation can consume available
authority, the Agent MUST re-evaluate the complete current H-07 authority
intersection, including as applicable: current requester authentication and
typed actor derivation; exact active and strictly unexpired Connection; Agent,
Passport, target and audience; exact organization and tagged workspace;
selected release and profiles; capability/version and exact action; Trust,
revocation and key history; structured authorization; stricter deployment
policy; Approval state, expiry, Decision proof and history; authoritative
approver/key compromise or revocation and explicitly bound revocable
eligibility sources; Invocation deadline; idempotency; extensions; and every
other raceable admission gate.

Historical Decision-time eligibility MUST remain immutable evidence and MUST
NOT be reconstructed from current defaults. An old authentication success,
Trust result, authorization ALLOW, or policy ALLOW MUST NOT freeze current
authority. Approval MUST NOT override a suspended, expired, closed, revoked, or
replaced Connection or move to a replacement Connection.

**Applies to.** Every new-work Approval continuation and consumption attempt,
including a fresh attempt after recovery proves a definite noncommit. Read-only
convergence of an already consumed exact retry remains governed by
REQ-APPR-0029 and H-09/H-12 disclosure rules.

**Lifecycle/state impact.** Failed current gates cause no consumption; only a
separately serialized expiry or authoritative revocation may terminally change
the Approval.

**Semantic failure.** Any unavailable, stale, mismatched, withdrawn, or
non-authorizing current gate MUST deny before Task creation, without using
cached ALLOW evidence or converting ordinary denial into revocation.

**Sources:** H-02, H-04, H-05, H-07, H-08, H-11, H-12, H-13. **Gaps:**
GB-018, GB-019.

## REQ-APPR-0026 - Atomic consumption and Invocation acceptance

**Requirement.** The `available -> consumed` transition MUST occur only in the
same final serialized durable H-07 Invocation-acceptance outcome that creates
and binds exactly one accepted Invocation identity, one Task identity, the
exact Invocation/idempotency outcome and accepted action, the consumed Approval
authority and Decision proof, Connection/release/profile/scope, acceptance
sequence/fence/version, transaction/log identity, terminal tombstone, and
applicable durable audit intent. All raceable guards and authoritative versions
MUST be reloaded or protected and rechecked inside that boundary.

The transaction or proven equivalent authoritative log operation MUST commit
all effects as one outcome. If Task acceptance, idempotency evidence, Approval
consumption, tombstone, or required durable linkage cannot commit together, the
new-work acceptance MUST abort.

**Applies to.** Final admission of an exact Approval-bearing Invocation.

**Lifecycle/state impact.** One commit atomically makes authority `consumed`
and creates one accepted Task; before that commit no Task exists and authority
is not consumed.

**Semantic failure.** Partial commit, stale writer, failed raceable gate, or
incomplete linkage MUST create no accepted work and MUST fail closed or enter
indeterminate recovery; missing pieces MUST NOT be synthesized.

**Sources:** H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-018, GB-019.

## REQ-APPR-0027 - Events that do not consume Approval

**Requirement.** Issuing, opening, displaying, polling, cancelling, or
superseding a Challenge; authenticating a requester or Approver; evaluating
Trust, authorization, eligibility, or policy; constructing, signing,
submitting, verifying, or storing a Decision before final acceptance; computing
or comparing a digest; acquiring a lock, lease, reservation, fence, or database
transaction; creating a workflow placeholder or candidate Task; publishing to
a queue; starting, attempting, or completing execution or an external effect;
creating a Result or Receipt; emitting telemetry; delivering a response; or
receiving an acknowledgement MUST NOT consume Approval authority.

Single use MUST mean one new-work acceptance, not one request, proof
verification, Decision submission, retry, read, poll, execution attempt, effect,
or response delivery.

**Applies to.** Every operation before, during, and after Approval-bearing
Invocation admission.

**Lifecycle/state impact.** None of the listed events changes Approval state;
only REQ-APPR-0026 can commit consumption.

**Semantic failure.** Any early burn or late inferred consumption MUST be
treated as an integrity violation and MUST NOT be used to create, restore, or
justify a Task.

**Sources:** H-02, H-07, H-08, H-09, H-12. **Gaps:** GB-019.

## REQ-APPR-0028 - Precommit and postcommit failure semantics

**Requirement.** A definite failure before the complete final acceptance
commit MUST create no Task or external effect, consume nothing, leave authority
`available` when otherwise valid and when no separately serialized expiry or
revocation won, preserve the immutable Decision, and permit only a fresh fully
revalidated attempt. After the complete commit, response loss, queue or worker
failure, execution or effect failure, cancellation, timeout, Result or Receipt
failure, audit/metric/log delivery failure, and client failure MUST NOT restore,
replace, or reconsume the Approval.

**Applies to.** Admission failure, transaction abort, response ambiguity, and
all failures after Task birth.

**Lifecycle/state impact.** Proven precommit failure has no consumption
transition; a committed `consumed` state is permanent regardless of downstream
outcome.

**Semantic failure.** An indeterminate commit MUST NOT be classified as a
definite precommit failure. Restoration after commit or consumption without the
complete acceptance record MUST fail closed as an integrity incident.

**Sources:** H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-019.

## REQ-APPR-0029 - Exact continuation retry convergence

**Requirement.** An exact continuation retry MUST use the D1-03 Invocation and
idempotency identity and MUST present the same Approval authority, Decision,
Invocation, continuation namespace/key, authenticated requester/effective
actor context, complete exact action and presence states, and durable semantic
digest. If a prior attempt definitely failed before commit and authority
remains valid and `available`, a fresh attempt MAY proceed only after every
current gate is re-evaluated. When Approval authority is `consumed`, the durable
accepted Invocation/Task/idempotency linkage is complete and internally
consistent, the retry is fully exact for every authority- and effect-critical
value and presence state, the requester/effective actor is currently
authenticated, and the caller is currently authorized to learn the accepted
result, the retry MUST converge on or reference the same existing accepted
Invocation/Task identity.

That retry MUST NOT consume again, create another Task, execute another effect,
restore `available`, or return an arbitrary new-work or replay interpretation
instead of the existing accepted identity. D1-05/H-09 owns the eventual
Task/Result view, and D1-07/H-12 owns its public transport and error
representation.

Matching action bytes MUST NOT grant an ineligible or different principal
access to the accepted Task or result.

**Applies to.** Sequential and concurrent exact continuation retries and
lost-response recovery.

**Lifecycle/state impact.** At most one attempt changes `available` to
`consumed`; every exact loser is a read of the one outcome.

**Semantic failure.** Incomplete equality, failed disclosure authorization,
missing accepted linkage, or indeterminate state MUST fail closed without
mutation, blind retry, or protected identity disclosure.

**Sources:** H-05, H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-018, GB-019.

## REQ-APPR-0030 - Conflicting continuation and replay

**Requirement.** Reuse of Approval or Decision evidence with any changed
authority- or effect-critical value or presence state MUST be a conflict. This
includes a different Invocation or idempotency identity, requester, actor,
beneficiary, Agent, Passport, tenant scope, target, payload, parameter, amount,
currency, unit, capability version, operation, effect, limit, deadline, policy
binding, extension, or presence/absence state. Partial equality, a compatible
version, or the same digest length MUST NOT consume the Approval.

**Applies to.** Decision submission, continuation, idempotency lookup,
concurrent admission, retry, and replay.

**Lifecycle/state impact.** A conflict causes no Challenge, Decision,
Approval-authority, Invocation, or Task mutation.

**Semantic failure.** Conflict MUST create no Task, consume nothing, mutate
nothing, and reveal no protected competing action, principal, Task, Result, or
existence fact beyond later H-12 policy.

**Sources:** H-04, H-07, H-08, H-10, H-12. **Gaps:** GB-018, GB-019.

## REQ-APPR-0031 - Distributed concurrency and serialized races

**Requirement.** Approval state/version, expiry and revocation ordering, current
Connection and authority gates, and H-07 acceptance/idempotency evidence MUST
share one serializable authority or a proven equivalent single-writer,
consensus/serializable compare-and-set or fenced durable log. A process-local
mutex alone MUST NOT establish correctness across processes or hosts. Two exact
concurrent attempts MAY produce at most one state-changing acceptance and one
Task; exact losers MUST verify full equality and disclosure authorization
before converging. Conflicting attempts MUST NOT consume by partial match or
produce a second Task.

Consumption MUST serialize against Approval expiry, authoritative Approval
revocation, Connection termination, Trust/authorization/policy withdrawal,
Decision/cancellation races where applicable, competing continuations, and
stale writers after failover. Each race MUST have one authoritative winner.

**Applies to.** Concurrent Decision, terminal transition, continuation,
acceptance, retry, failover, and recovery operations.

**Lifecycle/state impact.** At most one legal transition and one associated
Task identity commit; losers observe the winner without another mutation.

**Semantic failure.** A stale fence, lock timeout, split-brain result, partial
write, dual winner, or uncertain ordering MUST fail closed and MUST NOT prove
consumption or non-consumption until reconciled.

**Sources:** H-05, H-07, H-08, H-11, H-12. **Gaps:** GB-019.

## REQ-APPR-0032 - Purpose-specific Approval revocation

**Requirement.** `available -> revoked` MUST occur only from an exact
registered, purpose-specific authoritative revocation or compromise source
whose authenticated and proven scope covers the Approval. This MAY include an
eligible approver withdrawal only when the selected release/profile permits it,
an authoritative compromise/revocation affecting the Approval-purpose key,
Approver principal, Decision issuer, or explicitly bound revocable eligibility
source, or an exact-scope registered Approval-revocation authority. The event
MUST be immutable, purpose-bound, authorized, and durably ordered against
consumption and expiry without mutating the Decision.

Ordinary policy or authorization denial, Trust unavailability, transport
failure, requester cancellation, role-membership change without a bound
revocable source, or arbitrary operator assertion MUST NOT be converted into
Approval revocation. If revocation commits first no acceptance may consume the
Approval; if acceptance commits first the state remains `consumed`, the Task
remains historical H-09 work, and later evidence MUST NOT restore or erase it.

**Applies to.** Revocation of available Approval authority and its race with
acceptance and expiry.

**Lifecycle/state impact.** One authorized event can terminally transition
`available` to `revoked`; no event changes `consumed` back to another state.

**Semantic failure.** Unsupported source, wrong purpose/scope, unverified
actor, unavailable history, or losing race MUST create no revocation transition
and MUST deny or fail closed under the owning current gate.

**Sources:** H-02, H-05, H-08, H-11, H-12. **Gaps:** GB-018, GB-019.

## REQ-APPR-0033 - Challenge cancellation

**Requirement.** Challenge cancellation MUST remain distinct from Task
cancellation. A currently authenticated and authorized requester, Agent, or
operator MAY cancel only an `open` Challenge under the exact accepted or
stricter deployment policy and scope. Cancellation MUST serialize against
Decision, expiry, and supersession; it loses if a valid Decision commit won
first. It MUST NOT create a Task or Approval authority, cancel an already
accepted Task, mutate a Decision, or transfer to another Challenge.

**Applies to.** Cancellation of an Approval Challenge.

**Lifecycle/state impact.** A winning cancellation transitions `open` to
terminal `cancelled`; every losing or repeated request causes no transition.

**Semantic failure.** Unauthenticated, unauthorized, wrong-scope, terminal,
stale, or losing cancellation MUST fail without mutation or protected
disclosure.

**Sources:** H-02, H-05, H-08, H-09, H-12. **Gaps:** GB-018, GB-019.

## REQ-APPR-0034 - Durable secret-free Approval evidence

**Requirement.** A deployment MUST durably retain enough secret-free immutable
evidence to reconstruct Approval truth after restart. For a Challenge this MUST
include, as applicable, identity, nonce, issuer/requester identity, exact action
digest, safe presentation evidence, issuance time, expiry, lifecycle
state/version, and terminal evidence. For a Decision it MUST include identity,
exact Challenge, immutable outcome/time, Approver identity, eligibility source,
exact proof/profile/key evidence, approved narrowing, safe reason category, and
historical references. For Approval authority it MUST include identity,
state/version, availability and expiry times, revocation/terminal evidence, and
for consumption the exact Invocation, Task and idempotency identities/digest,
H-07 sequence/fence, transaction/log identity, immutable evidence identities,
tombstone, and applicable retention-dependency metadata.

Reusable credentials, private key material, raw secrets, and unbounded
sensitive reason text MUST NOT be retained as Approval replay evidence.

**Applies to.** Durable storage, audit intent, restart, exact retry, replay
denial, investigation, and historical verification.

**Lifecycle/state impact.** Each successful transition durably appends or
updates the evidence needed to prove its one authoritative outcome.

**Semantic failure.** Incomplete, secret-dependent, internally inconsistent,
or non-durable evidence MUST be treated as non-authorizing and MUST NOT be
reconstructed from cache or UI state.

**Sources:** H-03, H-08, H-10, H-11, H-12, H-14. **Gaps:** GB-018, GB-019.

## REQ-APPR-0035 - Restart, anti-rollback, and tombstones

**Requirement.** Restart MUST NOT infer or restore `available` authority from a
cache, current schema or code, current provider result, UI state, old response,
missing tombstone, current package or policy, duplicate record, or stale
replica. Missing, partial, corrupt, rolled-back, split-brain, duplicate, or
indeterminate Approval state MUST remain non-authorizing until one exact
committed history is proven through authoritative sequence, fence, log and
H-11 continuity evidence. A stale writer after failover MUST be rejected.

A consumed, expired, or revoked tombstone MUST NOT be deleted or become
unavailable while any replay, exact-retry, historical-verification, Task,
Result, Receipt, audit, support, or security dependency can survive. Concrete
retention duration MUST remain an H-14 decision and MUST NOT be invented here.

**Applies to.** Crash recovery, restore, failover, replication, retention, and
ambiguous state reconciliation.

**Lifecycle/state impact.** Proven terminal state remains terminal across
restart and rollback; indeterminacy is not a lifecycle state and grants no use.

**Semantic failure.** Missing tombstone, lower sequence, stale snapshot,
duplicate identity with differing content, unavailable durable authority, or
unreconciled partial commit MUST quarantine and deny without cache fallback,
restoration, or new Task.

**Sources:** H-03, H-08, H-09, H-11, H-14. **Gaps:** GB-018, GB-019.

## REQ-APPR-0036 - Ambiguous commit recovery

**Requirement.** When a storage timeout, lost response, crash, or adapter result
cannot prove whether final acceptance committed, the Agent MUST NOT guess,
restore authority, create another Task, advise blind retry, or use transport
success/failure as commit evidence. It MUST reread authoritative state using the
Approval, transaction, Invocation, and idempotency identities. A complete,
internally consistent consumed/accepted outcome MUST be treated as committed;
authoritative versions that prove noncommit MAY permit a fresh fully
revalidated attempt while authority remains valid and `available`; partial,
corrupt, rolled-back, split-brain, or unavailable evidence MUST remain
indeterminate and fail closed.

**Applies to.** Ambiguous Decision/authority creation and H-07
acceptance/consumption outcomes, restart, and lost-response retry.

**Lifecycle/state impact.** Recovery observes or proves one prior outcome; it
does not independently create a Decision, transition authority, or create a
Task.

**Semantic failure.** Until one complete authoritative outcome is proven,
neither success nor definite precommit failure MAY be reported as semantic
truth and no new-work attempt may proceed.

**Sources:** H-07, H-08, H-11, H-12. **Gaps:** GB-019.

## REQ-APPR-0037 - Immutable historical Approval meaning

**Requirement.** Every Approval history MUST retain its original protocol
release, schema-bundle identity when later defined, H-10 profiles and domains,
Challenge action meaning, Decision outcome and Approver proof, scope,
capability/version, Connection, transitions, and terminal outcome. Current
schemas, defaults, code, policy, packages, or release metadata MUST NOT
reinterpret historical meaning.

Historical `ghostbridge/0.1-draft` Approval material MUST NOT be silently
relabeled, upgraded, rehashed, backfilled, assigned missing fields, mapped from
historical `pending` to `open`, or treated as a current approved H-10 proof. Any
future migration MUST independently prove every required semantic,
cryptographic, and historical binding and remains outside this chapter.

**Applies to.** Stored Approval objects, historical verification, compatibility,
support, and any future migration assessment.

**Lifecycle/state impact.** Original lifecycle and terminal facts remain
immutable; historical evidence cannot acquire current authority by
reinterpretation.

**Semantic failure.** Missing original projection/profile/history or an
attempted legacy upgrade MUST be classified as unsupported or indeterminate
history and MUST NOT authorize Decision, consumption, retry, or disclosure.

**Sources:** H-03, H-08, H-10, H-11, H-13, H-14. **Gaps:** GB-018, GB-019.

## REQ-APPR-0038 - Post-acceptance H-09 boundary

**Requirement.** This chapter MUST govern authority only through the final
acceptance/consumption transaction. After that commit, Task states, queueing,
worker attempts, execution, external-effect recovery, Task cancellation,
timeout races, terminality, Result, Receipt, polling, duplicate-effect handling,
and retention beyond Approval dependencies MUST remain H-09/D1-05 concerns and
MUST NOT change Approval consumption. A product MAY display a non-authoritative
`waiting_for_approval` workflow status, but that status MUST NOT be an accepted
Task state or imply Task birth.

A Result or Receipt MUST NOT be proof that consumption occurred unless the
durable acceptance/consumption evidence independently proves it. Receipt is
downstream evidence and MUST NOT act as Approval authority.

**Applies to.** The boundary between Invocation admission and all later Task,
effect, Result, and Receipt behavior.

**Lifecycle/state impact.** The atomic acceptance commit is Task birth and
terminal Approval consumption; all later H-09 transitions leave Approval
`consumed`.

**Semantic failure.** A precommit Task, inferred consumption from downstream
evidence, waiting workflow treated as a Task, or postcommit restoration MUST
fail closed without executing unproven work or creating another Task.

**Sources:** H-02, H-07, H-08, H-09, H-10, H-11. **Gaps:** GB-018, GB-019.

## REQ-APPR-0039 - Disclosure-safe semantic failures

**Requirement.** Implementations MUST internally distinguish enough semantic
causes to enforce Approval safely, including unknown Challenge, Decision, or
authority; wrong scope, actor, target, audience, tenant, profile, purpose or
key; malformed or invalid proof; unknown or unsupported proof/profile; denied
or information-required Decision; terminal Challenge; available-authority
mismatch; consumed exact retry or conflict; expiry; revocation; corrupt,
rolled-back or indeterminate state; and current Connection, Trust,
authorization, or policy failure. Public behavior MUST NOT reveal another
tenant's object existence, competing action contents, unsafe Decision reason,
protected Approver details, hidden policy, key history, protected Task/Result
identity, or canonical action/payload bytes. H-12/D1-07 MUST own final routes,
methods, statuses, public error identifiers, details, timing, redaction, and
observability.

**Applies to.** Every Approval operation, internal failure classification, and
public disclosure boundary.

**Lifecycle/state impact.** A failure causes no transition; no error or
transport outcome is semantic commit evidence.

**Semantic failure.** Unsafe disclosure or loss of a required internal
distinction MUST fail closed without mutation or Task; final public mapping
remains deferred to D1-07.

**Sources:** H-02, H-05, H-08, H-10, H-11, H-12. **Gaps:** GB-018, GB-019.

## REQ-APPR-0040 - Closed Core and Approval extensions

**Requirement.** Approval Challenge, Decision, Approval authority, and
continuation objects MUST remain closed Core except at extension points already
registered by H-13/D1-02. An extension affecting Approval authority MUST only
narrow, be authority-critical, be required where applicable, be selected and
understood, and participate in H-10 protection under the owning domain. Unknown
optional extension data MUST NOT create authority; unknown or unsupported
required extension data MUST make the action unusable without stripping,
downgrade, or fallback.

**Applies to.** Every extension-bearing Approval semantic and its selected
release/profile projection.

**Lifecycle/state impact.** Extension processing creates no independent state;
an unknown required or authority-widening extension prevents every Decision or
consumption transition.

**Semantic failure.** Open-Core field acceptance, authority-widening extension,
unknown required meaning, or stripped protected data MUST fail closed without
mutation, Task, downgrade, or fallback.

**Sources:** H-03, H-04, H-08, H-10, H-13. **Gaps:** GB-018, GB-019.

## Non-normative production-grade attack review

This review is planning evidence only. It adds no requirement and closes no
gap.

| Failure path | Normative coverage |
| --- | --- |
| Approval treated as general authorization; approved Decision used without active Connection | REQ-APPR-0001, REQ-APPR-0025 |
| Wrong requester; requester or Approver body claim trusted | REQ-APPR-0007, REQ-APPR-0025, REQ-APPR-0029 |
| Beneficiary/effective-actor confusion or silent delegation | REQ-APPR-0008, REQ-APPR-0011, REQ-APPR-0030 |
| Self-approval inferred allowed or forbidden from identity equality | REQ-APPR-0008 |
| Wrong Agent/Passport/audience or cross-organization/workspace substitution | REQ-APPR-0010, REQ-APPR-0018, REQ-APPR-0020 |
| Workspace absence treated as wildcard | REQ-APPR-0009, REQ-APPR-0018 |
| Compatible-looking capability version accepted | REQ-APPR-0012, REQ-APPR-0020 |
| Payload changed; parameter omitted and default supplied | REQ-APPR-0009, REQ-APPR-0012, REQ-APPR-0020 |
| Amount rounded; unit/currency converted; target or account redirected | REQ-APPR-0012, REQ-APPR-0013, REQ-APPR-0020 |
| Safe summary hides a material action difference | REQ-APPR-0016 |
| Stale authorization, policy ALLOW, or Trust evidence frozen by Approval | REQ-APPR-0025 |
| Request proof, authorization digest, Core digest, generic JWS, or legacy proof accepted for Approval | REQ-APPR-0017, REQ-APPR-0019, REQ-APPR-0037 |
| Old Approval reinterpreted under current schema | REQ-APPR-0015, REQ-APPR-0037 |
| Challenge mutated; second Decision overwrites; Decision outcome changes | REQ-APPR-0004, REQ-APPR-0005, REQ-APPR-0006 |
| Denied or information-required Decision creates authority | REQ-APPR-0005, REQ-APPR-0022 |
| Internal reservation exposed as protocol state | REQ-APPR-0023 |
| Approval burned before acceptance or Task created before consumption | REQ-APPR-0026, REQ-APPR-0027, REQ-APPR-0028 |
| Postcommit failure restores authority | REQ-APPR-0028, REQ-APPR-0038 |
| Exact retry creates a second Task; conflicting retry leaks the winner | REQ-APPR-0029, REQ-APPR-0030, REQ-APPR-0031 |
| Two instances consume concurrently | REQ-APPR-0031 |
| Expiry equality accepted or clock rollback revives authority | REQ-APPR-0024, REQ-APPR-0035 |
| Revocation race ordered incorrectly | REQ-APPR-0031, REQ-APPR-0032 |
| Stale writer consumes after failover | REQ-APPR-0031, REQ-APPR-0035 |
| Missing tombstone restores practical replayability | REQ-APPR-0034, REQ-APPR-0035 |
| Consumed Approval moves to a replacement Connection | REQ-APPR-0025, REQ-APPR-0037 |
| Receipt treated as authority or waiting workflow treated as Task | REQ-APPR-0001, REQ-APPR-0038 |
| H-12 transport behavior treated as semantic commit evidence | REQ-APPR-0036, REQ-APPR-0039 |
| Unknown, stripped, or authority-widening extension affects Approval | REQ-APPR-0040 |

## Non-normative D2 traceability

GB-018 still requires an Approval Challenge schema, Approval Decision schema,
Approval-authority and continuation representation, the exact
`gb.approval.action.v1` semantic projection, exact H-10 Approval digest/proof
mapping, static cross-language positive vectors, and one-field mutation vectors
for every authority/effect-critical field. Those assets must cover
presence/null/absence/default distinctions, nested limit changes,
Unicode/numeric/unit behavior, wrong domain/profile/key purpose/audience/
target/tenant, and presentation/action mismatch.

GB-019 still requires an executable Approval state machine and legal/illegal
transition corpus, two-consumer concurrency, exact retry convergence,
conflicting retry, Challenge/Decision races, consumption races with expiry,
revocation and Connection termination, definite precommit crash, crash or lost
response after commit, restart, stale writer/failover, rollback, split-brain,
corruption, tombstone retention, and ineligible exact-retry disclosure cases.

These later schemas, machines, fixtures, vectors, malicious/race cases,
conformance assets, and security review do not exist by virtue of this chapter.
This normative prose does not change the status of GB-018 or GB-019.
