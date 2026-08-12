# Connections

This chapter defines the durable installed Connection authority bundle, tenant
scope, lifecycle, and current-use boundary for `ghostbridge/e1.r0-draft.1`. It
binds the reviewed lifecycle and D1-02 selection requirements without defining a
wire schema, storage implementation, or new replacement coordinator algorithm.

## REQ-CONN-0001 - Connection authority root and visible states

**Requirement.** A Connection MUST be the durable, scoped installed authority
root created only by the complete H-06 transaction. It MUST be created directly
as `active`, and its authority MUST begin only when that entire transaction is
durably committed and observable. Grant possession or resolution,
authentication, Trust verification, negotiation, preview, consent, candidate
creation, locks, response construction or delivery, audit, and metrics MUST NOT
create a Connection or Connection authority.

The exact visible Connection state inventory MUST be:

| State       | Authority for new Connection-governed work                                                                                    | Terminal |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| `active`    | Eligible to participate in the full narrowing intersection; never sufficient alone                                            | No       |
| `suspended` | None; only bounded status, source-owned same-invariant recovery, closure, revocation, and replacement initiation are eligible | No       |
| `expired`   | None                                                                                                                          | Yes      |
| `closed`    | None                                                                                                                          | Yes      |
| `revoked`   | None                                                                                                                          | Yes      |
| `replaced`  | None                                                                                                                          | Yes      |

No other protocol authority state is permitted. Pending, creating,
reauthenticating, recovering, replacing, unknown, corrupt, indeterminate,
locks, leases, and candidates MAY exist only as internal non-authorizing
conditions and MUST NOT be projected or used as Connection authority.

**Applies to.** Connection creation, storage, lifecycle projection, restart,
recovery, status, and every Connection-governed request.

**Lifecycle/state impact.** H-06 creates `active`; subsequent state changes are
limited to the legal rules in this chapter. Internal conditions have no state
or authority effect.

**Semantic failure.** A Connection created outside H-06, a partial creation, an
unknown state, or an internal condition treated as authority is invalid or
indeterminate and MUST fail closed.

**Sources:** H-01, H-06, H-07, H-09, H-11, H-12. **Gaps:** GB-009, GB-011,
GB-013.

## REQ-CONN-0002 - Immutable Connection authority bundle

**Requirement.** Every Connection MUST directly retain or bind an immutable,
secret-free authority bundle sufficient to enforce current use and reconstruct
history independently of mutable defaults. As applicable, it MUST include:

- immutable Connection identity; H-06 creation, transaction, intent, result,
  and commit identities; creation time; and current semantic state;
- exact selected protocol release and immutable release, specification, schema-
  bundle, compatibility, and conformance-evidence identities;
- the complete D1-02 selected result, including profiles/facets, enabled and
  disabled capabilities and exact versions, capability-local restrictions,
  extensions, experiments, omissions, limitations, and evidence identities;
- the exact selected authentication profile/revision and secret-free H-05
  result, typed owner principal, separately required Host identity, issuer,
  credential subject as permitted, proof/channel class, safe key/reference
  identities, and authentication limitations;
- exact Agent, Passport and issuer evidence, authentication audience, and
  Agent/resource target;
- exact organization and tagged workspace value or explicit absence;
- immutable final consent envelope/identity and applicable Offer/grant issuer,
  purpose, ceiling, and restriction identities;
- explicit Connection expiry policy and immutable exclusive `expiresAt` when a
  finite Connection lifetime was selected, or an explicit indication that no
  independent Connection expiry was selected;
- direct immutable evidence identities or H-10-qualified transcript/digest
  slots for authority-critical material, with bulky safe evidence referenced
  only by an immutable, release-bound, historically resolvable identity;
- monotonically ordered lifecycle state/transition identity, predecessor
  evidence, active suspension-cause identities, terminal evidence and
  tombstone, storage-integrity/anti-rollback identity; and
- replacement coordinator, predecessor, and successor identities when
  replacement applies.

Current authentication, Trust/revocation, authorization, policy, Approval,
clock, capability-availability, and storage-health evidence MUST remain current
narrowing inputs and MUST NOT rewrite the bundle. Raw grant or credential
secrets, private keys, bearer/PoP material, provider secrets, private policy,
mutable URLs or pointers, package/deployment defaults, caches, body principals,
and inferred workspace MUST NOT enter or supply the authority bundle. This
inventory defines semantic fields, not final schema member names or H-10 bytes.

**Applies to.** The authoritative Connection record, its immutable referenced
evidence, lifecycle journal, tombstone, and current-use projection.

**Lifecycle/state impact.** The bundle is fixed at H-06 commit. Only expressly
same-invariant current authentication evidence, lifecycle state/sequence,
suspension causes, terminal evidence, and replacement links may advance under
their accepted transitions; immutable authority bounds cannot change in place.

**Semantic failure.** A missing, mutable, secret-bearing, unresolvable,
internally inconsistent, or substituted authority-critical binding is
indeterminate and non-authorizing; current defaults MUST NOT repair it.

**Sources:** H-01, H-03, H-04, H-05, H-06, H-07, H-10, H-11, H-13, H-14.
**Gaps:** GB-011, GB-012.

## REQ-CONN-0003 - Exact organization and workspace scope

**Requirement.** Every Connection MUST bind exactly one validated,
case-sensitive opaque organization and exactly one tagged workspace class:
either `absent`, or `present` with one validated non-empty opaque workspace
value. Exact scope equality MUST require equal organization values, equal
workspace tags, and, for `present`, equal workspace values under this selected
release. Workspace `absent` MUST NOT mean wildcard, null, empty, inherited,
default, later selectable, or permission to use every workspace.

For this release, null, empty string, whitespace-only, malformed,
omitted/untagged ambiguous, or input that fails the exact selected-release
workspace identifier validation or bound is invalid and MUST NOT be coerced to
explicit absence. Scope comparison MUST NOT use truthiness, case folding,
locale behavior, display names, database IDs, prefix or hierarchy inference,
parent/child substitution, or ad hoc Unicode normalization. Organization and
workspace body fields are untrusted consistency claims: they MUST exactly equal
the authoritative Connection and verified principal membership and MUST NOT
override, fill, move, or widen the stored scope.

Invocation, authorization, Approval, Task, Result, Receipt, cancellation, and
audit evidence MUST inherit this exact scope by immutable reference and/or exact
snapshot as owned by their chapters. Principal, Connection, Agent, Passport,
organization, and workspace identities MUST remain separate; permission in two
scopes MUST NOT move a Connection from one to the other.

**Applies to.** Connection creation and every child governed object, request,
decision, lifecycle action, protected read, and historical record.

**Lifecycle/state impact.** Scope is immutable at H-06 commit. Scope change has
no legal in-place transition and requires replacement.

**Semantic failure.** Invalid representation, absent/value mismatch,
cross-organization/workspace substitution, missing required child binding, or
body override is wrong-scope and MUST fail closed without existence disclosure
or mutation.

**Sources:** H-02, H-05, H-06, H-07, H-08, H-09, H-10, H-12. **Gaps:** GB-008,
GB-011, GB-012, GB-013, GB-016.

## REQ-CONN-0004 - Active is necessary and never sufficient

**Requirement.** Only an authoritative `active` Connection MAY participate in
acceptance of new Connection-governed work. Even when active, new work MUST pass
the current narrowing intersection of:

- exact selected-profile authentication and typed principal/owner binding;
- exact Agent, Passport, authentication audience, resource target,
  organization, and tagged workspace;
- immutable selected release, authentication profile, capability key/version,
  data contract, restrictions, limits, extensions, and consent/Offer/grant
  ceilings;
- strict Connection expiry and operation deadline boundaries;
- current integrity-qualified Trust, revocation, freshness, and anti-rollback
  evidence;
- exact structured authorization and any stricter deployment policy;
- exact-action Approval when required; and
- the operation's exact idempotency, race, and final-admission gates.

Every current input MAY narrow or deny and MUST NOT widen or reinterpret the
immutable bundle. Fresh discovery, provider state, package constants, schemas,
support records, implementation behavior, deployment configuration, and
defaults MUST NOT renegotiate, upgrade, expand, or repair an existing
Connection.

**Applies to.** Every new Invocation and every other operation that exercises
current Connection authority.

**Lifecycle/state impact.** Preliminary checks have no state effect. Only the
owning operation's complete serialized commit may accept work or perform its
defined transition.

**Semantic failure.** Any absent, stale, denied, mismatched, race-lost, or
indeterminate gate is non-authorizing; no new Task or external effect may begin.

**Sources:** H-01, H-02, H-04, H-05, H-07, H-08, H-09, H-11, H-12. **Gaps:**
GB-007, GB-008, GB-011, GB-012, GB-013, GB-015, GB-017.

## REQ-CONN-0005 - Durable suspension and source-owned resumption

**Requirement.** Suspension MUST be durable, nonterminal, and non-authorizing
for new governed work. A Connection MAY have multiple simultaneous suspension
causes. Each cause MUST bind its registered owning source, bounded safe reason
category, immutable evidence identity, first-observed time, transition sequence,
and explicit same-invariant clearing guard. The H-05 Class B authentication
conditions of ordinary credential expiry, refresh failure after credential
validity is exhausted, provider unavailability beyond the selected permitted
freshness bound, loss of a required channel binding, and unresolved
non-compromise key ambiguity MUST durably suspend authentication-dependent
Connection use. These conditions MUST NOT remain request-local merely because a
concrete profile fails to label them Connection-wide.

A transient provider or channel condition MAY remain request-local only while
every applicable credential, proof, session/channel, provider/cache, and other
selected-profile freshness or validity bound remains valid, the durable
authentication binding remains current and uncompromised, and the exact
concrete profile expressly permits that request-local treatment. An isolated
malformed, stale, replayed, or wrong-request proof and ordinary current policy
DENY MUST remain request-local when the durable authentication binding is
otherwise current and uncompromised. Current Trust/revocation evidence
unavailability or staleness remains separately governed by H-07/H-11 and MAY
create a durable suspension cause only under its accepted Connection-wide
source/profile classification. Compromise or authoritative revocation remains
terminal and MUST NOT be downgraded to suspension.

Only the cause's owning source or an explicitly defined narrowly authorized
recovery authority MAY present its fresh clearing proof. The Connection MUST
remain `suspended` while any cause remains. Resumption to `active` MUST occur at
one serialization boundary that rechecks the complete immutable bundle, every
cause and clearing proof, state and sequence, storage integrity, authoritative
clock and expiry, exact current authentication, Trust/revocation, scope,
capability restrictions, and absence of any terminal or committed successor
winner.

Resumption MUST NOT create a Connection, clear another source's cause, pause or
extend expiry, change an immutable field, selected release/profile, principal,
target, tenant, consent, capability or restriction, widen authority, use weaker
proof or cached success, or revive a terminal Connection.

**Applies to.** Connection-wide recoverable authentication and Trust conditions,
same-invariant recovery, planned rotation, and restart with suspended state.

**Lifecycle/state impact.** Legal effects are `active` to `suspended`, updates
to the durable cause set while remaining `suspended`, and `suspended` to
`active` only after every guard passes. Failed recovery leaves the Connection
non-authorizing.

**Semantic failure.** Unknown source, nonrecoverable cause, partial clearing,
wrong evidence, material change, stale sequence, terminal winner, or
indeterminate integrity MUST remain suspended or become the separately required
terminal outcome; it MUST NOT resume.

**Sources:** H-05, H-07, H-11, H-12. **Gaps:** GB-007, GB-011, GB-015.

## REQ-CONN-0006 - Expiry, closure, and terminality

**Requirement.** `expired`, `closed`, `revoked`, and `replaced` MUST be
irreversible terminal states with no Connection-governed authority for new work
and no transition to `active` or `suspended`. A terminal Connection MUST retain
its immutable authority meaning and first serialized terminal winner; later
evidence MAY be appended where its owning rule requires but MUST NOT rewrite,
weaken, or erase the winner.

A finite Connection expiry MUST be half-open. A new acceptance may serialize
only while the authoritative time is strictly earlier than immutable
`expiresAt`; at or after equality, expiry wins unless another terminal
transition committed first. Suspension MUST NOT pause or extend expiry, clock
rollback MUST NOT revive it, and expiry MUST NOT be extended in place. The first
authoritative observation at or after the boundary MUST durably materialize the
`expired` terminal evidence/tombstone.

Closure MUST be an explicitly authenticated, exact-scope, authorized voluntary
operation by the bound owner principal, target Agent authority, or designated
operator authority. The exact close repeat MUST converge without mutation;
conflicting closure data MUST NOT rewrite history. Closure MUST serialize
against Invocation acceptance, suspension, expiry, revocation, and replacement.
A terminal transition committed before new-work acceptance denies that work; an
acceptance committed strictly first remains an H-09 accepted historical fact.

**Applies to.** Connection expiry, voluntary closure, all terminal races,
restart, and terminal status projection.

**Lifecycle/state impact.** `active` or `suspended` may transition once to the
serialized terminal winner. Every terminal state has no exits.

**Semantic failure.** Equality accepted as unexpired, unauthorized closure,
terminal reactivation, in-place expiry extension, or terminal-reason rewrite is
invalid and MUST fail closed without new authority.

**Sources:** H-07, H-09, H-10, H-11, H-12. **Gaps:** GB-011, GB-015.

## REQ-CONN-0007 - Authoritative revocation and compromise only

**Requirement.** A Connection MAY transition to terminal `revoked` only from an
enumerated authoritative Connection, selected-authentication, principal-
compromise, Agent/Passport/key, issuer/Trust, or H-11-qualified revocation or
compromise source whose proven scope covers that Connection. The transition MUST
serialize current source/evidence validity, subject scope, effective/observed
time as applicable, state/sequence, competing acceptance and lifecycle
triggers, and safe source/reason/evidence identity. It MUST retain the immutable
history and disclose only the later H-12-safe projection.

Ordinary authorization or deployment-policy denial, issuer retirement, Trust
staleness or unavailability, provider/storage/deployment outage, transport
failure, unauthenticated operator assertion, and an isolated bad proof MUST NOT
be converted into revocation unless an accepted rule explicitly maps that
exact event and scope to an authoritative revocation source. Staleness or
unavailability fails closed and MAY suspend under REQ-CONN-0005; it is not proof
of revocation. Authoritative selected credential/binding, principal,
Agent/Passport/key, or Connection compromise/revocation MUST NOT be downgraded
to suspension or ordinary reauthentication.

**Applies to.** Current revocation evaluation, compromise response, acceptance
races, lifecycle transitions, recovery, and historical evidence.

**Lifecycle/state impact.** A valid covered source may transition `active` or
`suspended` to terminal `revoked`. No other condition does so through this
requirement.

**Semantic failure.** Unverified, stale, wrong-purpose, wrong-subject,
wrong-scope, ambiguous, rolled-back, or unavailable revocation evidence is
non-authorizing but MUST NOT fabricate a terminal reason; it fails closed under
its accepted suspension/recovery classification.

**Sources:** H-05, H-07, H-09, H-11, H-12. **Gaps:** GB-007, GB-011, GB-015.

## REQ-CONN-0008 - Material change requires replacement

**Requirement.** A material change to protocol release, selected profile/facet,
authentication profile, issuer, credential subject or owner principal,
Agent/Passport/audience/target, organization or workspace, capability authority,
consent, Offer/grant ceiling, extension, experiment, omission, limitation, or
restriction MUST NOT mutate an existing Connection. It MUST use a new final
preview, explicit consent, applicable Install Grant, and distinct successor
Connection created only by H-06.

Replacement MUST preserve every ordering, ambiguity-recovery, terminal-race,
and exclusivity invariant of REQ-LIFE-0025. In particular, the predecessor MUST
be durably non-authorizing before successor creation; predecessor and successor
MUST NEVER be active concurrently; an ambiguous successor outcome MUST be
resolved through exact H-06 recovery; a proven committed successor permanently
prevents predecessor resumption; and durable predecessor, successor, coordinator,
and any competing terminal-winner links MUST remain in history. This chapter
MUST NOT treat replacement as renaming, moving, or overwriting the predecessor.

**Applies to.** Every proposed immutable Connection change, migration,
reauthentication material change, capability expansion, and replacement
recovery.

**Lifecycle/state impact.** The existing Connection follows the reviewed
replacement transitions; the successor begins independently as `active` only at
its H-06 commit. No active-active overlap is legal.

**Semantic failure.** In-place mutation, implicit replacement, ambiguous old
resumption, duplicate successor creation, or active-active overlap is an
integrity conflict and MUST fail closed for the affected chain.

**Sources:** H-04, H-05, H-06, H-07, H-11. **Gaps:** GB-009, GB-011, GB-012.

## REQ-CONN-0009 - Durable restart, integrity, and recovery

**Requirement.** Restart and every authoritative operation MUST load and verify
the exact durable Connection bundle and history: creation/commit result,
immutable evidence, current state, monotonic transition sequence and
predecessor identity, suspension causes, terminal evidence and tombstone,
replacement coordinator/links, accepted-work/idempotency dependencies, and
integrity/anti-rollback checkpoint. The implementation MUST NOT infer `active`
or reconstruct authority from discovery, current package constants, code or
provider behavior, defaults, cache, process memory, a previous request or
response, current schema, missing fields, current capability advertisements,
or successful historical use.

Missing, partial, corrupt, rolled-back, duplicate-ID, stale-snapshot,
split-brain, evidence-unresolvable, scope-ambiguous, or replacement-inconsistent
state MUST be an internal indeterminate/corrupt non-authorizing condition, not a
new visible lifecycle state. Unknown and recovery mode MUST grant no authority.
An operator or storage recovery MAY restore only one exact proven committed
history, attach a non-authorizing classification, or quarantine it. Recovery
MUST NOT invent evidence, reset a sequence or terminal result, delete a required
tombstone, widen authority, reactivate a terminal Connection, assign recovered
history a new identity, or create replacement authority implicitly.

**Applies to.** Process restart, cache/projection rebuild, backup restore,
failover, storage adapter results, history repair, and every operation after
recovery.

**Lifecycle/state impact.** A verified history resumes in its exact last
committed state and then reevaluates current narrowing evidence. Indeterminate
state stays non-authorizing until exact recovery; no lifecycle transition is
inferred from absence.

**Semantic failure.** Any inability to prove one complete monotonic history
MUST fail closed and prevent new governed use, transition, replacement, or
protected result disclosure.

**Sources:** H-01, H-03, H-06, H-07, H-09, H-10, H-11, H-14. **Gaps:** GB-011,
GB-017.

## REQ-CONN-0010 - Post-terminal status and historical-read boundary

**Requirement.** A suspended or terminal Connection MUST admit no new
Connection-governed work.

For a `suspended` Connection, source-owned same-invariant authentication
recovery MUST use the exact H-05/H-07 selected-profile recovery contract and
MUST prove every immutable authentication, principal, target, tenant,
limitation, and authority invariant. No weaker, replacement, adjacent, bearer-
for-PoP, provider-default, or `none` profile MAY reactivate the Connection.
Safe suspended status and other permitted recovery/termination operations remain
separately authenticated, exact-scope, purpose-bound, and disclosure-bounded.

For a terminal Connection, the historical binding grants no current authority.
Safe status, exact replay recovery of already committed work, and tenant/scope-
bound historical reads MAY exist only as separate operations that authenticate
the current reader using the exact authentication contract applicable to that
disclosure operation; prove the permitted principal and scope relationship to
the retained historical object; apply purpose-bound authorization, disclosure
checks, immutable historical identity, and H-12 privacy controls; and remain
read-only. A terminal read MUST NOT require successful exercise of a
compromised or revoked historical Connection authentication binding merely to
inspect retained history. Use of a different currently applicable
authentication profile for the disclosure operation MUST NOT change, replace,
renegotiate, or reinterpret the historical Connection's selected profile.

Every permitted status, recovery, replay, or historical operation MUST NOT
restore Connection authority, create a Task, widen disclosure, reactivate the
terminal Connection, or reinterpret its history. Historical evidence MUST
continue to record the original selected profile and authentication result.

Terminal tombstones and immutable evidence MUST be retained for at least the
applicable historical-support period and every surviving Task, Result, Receipt,
Approval, grant-replay, Invocation-idempotency, or Trust-history dependency.
They MUST remain secret-free and non-authorizing. Later H-14 work owns concrete
retention/deletion periods. Trust-resource history and historical proof
verification remain separately governed by H-11/H-12 and MUST NOT establish
current authority.

**Applies to.** Suspended/terminal status, exact replay/status lookup,
historical Task/Result/Receipt access, tombstones, and retention.

**Lifecycle/state impact.** Reads have none and cannot reactivate a Connection.
Only an expressly legal suspended recovery, closure, revocation, or replacement
transition may mutate lifecycle state.

**Semantic failure.** Missing current disclosure authority, cross-scope access,
unresolved history, or an attempt to use a read as current authority MUST fail
closed without revealing existence, state, reason, successor, or protected
historical content.

**Sources:** H-07, H-09, H-10, H-11, H-12, H-14. **Gaps:** GB-011, GB-012,
GB-013, GB-017.

## Non-normative D2 traceability

Later D2 work is expected to derive the Connection and tenant-scope schemas,
H-07 lifecycle and replacement state machines, and cases for exact scope,
non-widening, suspension causes, terminal races, expiry equality, revocation,
replacement exclusivity, restart, rollback, corruption, split brain, historical
reads, and immutable selection from these requirements. This chapter creates
none of those assets and closes no `GB-*` gap.
