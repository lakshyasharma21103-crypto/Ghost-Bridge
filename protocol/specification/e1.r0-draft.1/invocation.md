# Invocation

This chapter defines Invocation admission, correlation, admission deadlines,
idempotency and retry, and the cancellation-request handoff boundary for
`ghostbridge/e1.r0-draft.1`. It does not define post-acceptance Task execution,
terminal Task/Result/Receipt behavior, an HTTP mapping, or canonical digest
bytes.

## REQ-INV-0001 - Invocation claims are untrusted until verified

**Requirement.** An Invocation request MUST be treated as untrusted input until
the final acceptance commit. Every supplied Connection ID, principal or actor,
organization/workspace, Agent, Passport, audience/target, release, selected
profile, capability/version, authentication or credential reference,
authorization reference, Approval reference, deadline, request/message/
correlation/trace/parent identifier, Invocation/idempotency identifier,
operation/action, body, data-contract claim, extension, and restriction is only
a consistency claim. It MUST NOT establish authority, identity, scope,
selection, semantic equality, or durable state until verified against the exact
owning authoritative evidence.

Bounded structural validity or an authenticated transport MUST NOT make body
claims authoritative. A body Connection ID, credential or policy reference,
correlation match, or prior response MUST NOT select the principal, Connection,
tenant, Task, or result.

**Applies to.** Every new Invocation, retry, Approval-bearing continuation, and
admission recovery attempt.

**Lifecycle/state impact.** None before final acceptance. Parsing, candidates,
and preliminary validation do not create a Task or reserve work.

**Semantic failure.** An unverified, missing, ambiguous, or mismatched required
claim is invalid, unauthenticated, unauthorized, wrong-scope, conflict, or
indeterminate as applicable and MUST fail before acceptance or effect.

**Sources:** H-02, H-05, H-07, H-08, H-09, H-12, H-13. **Gaps:** GB-013,
GB-014, GB-015, GB-017.

## REQ-INV-0002 - Sender, receiver, and one-Connection binding

**Requirement.** The Host/Client side MUST create an Invocation request for one
exact operation under a currently authenticated typed Host principal and one
existing Connection. The Agent named by that Connection MUST be the final
admission and protocol-enforcement receiver. Co-located Client, Host, policy,
Trust, Approval, Platform, gateway, or worker components MUST NOT replace the
Agent's enforcement responsibility or inherit direct Agent authority.

The Invocation MUST bind exactly one Connection identity. The Agent MUST treat
the supplied identity only as a lookup claim, load the authoritative durable
Connection through a disclosure-safe path, and compare every repeated release,
profile, authentication context, owner principal, Agent/Passport,
audience/target, organization/tagged workspace, capability/version,
restriction, extension, and consent-bound value for exact equality. The request
MUST NOT move between Connections or use a body value, broader principal
membership, current discovery, or default to override the durable bundle.

**Applies to.** Invocation creation, routing, validation, retries, and final
admission.

**Lifecycle/state impact.** None until the one-Connection admission commit.
Binding to a Connection does not itself accept work.

**Semantic failure.** Unknown, hidden, inactive, corrupt, wrong-owner,
wrong-target, cross-scope, or mismatched immutable binding is non-authorizing and
MUST NOT create a Task, disclose a protected Connection, or fall back to another
Connection.

**Sources:** H-01, H-02, H-04, H-05, H-07, H-12. **Gaps:** GB-011, GB-012,
GB-013.

## REQ-INV-0003 - Final serialized admission algorithm

**Requirement.** Before accepting new governed work, the Agent MUST execute the
following semantic admission algorithm:

1. perform bounded framing, parsing, size/depth, type, duplicate, and structural
   validation sufficient to process the request safely;
2. verify current evidence under the exact selected authentication profile and
   deny weaker or fallback proof;
3. derive the typed caller principal solely from verified profile evidence;
4. treat the supplied Connection identity as untrusted and load the
   authoritative durable Connection through a disclosure-safe lookup;
5. verify the complete immutable bundle, referenced evidence, state/transition
   sequence, replacement chain, storage integrity, and anti-rollback state;
6. require `active` and strict pre-expiry time, and compare exact principal,
   target/audience, Agent/Passport, organization/tagged workspace, release,
   selected authentication/profile result, and every repeated inherited value;
7. require the exact capability key/version in the immutable enabled set and
   enforce every selected restriction, limit, extension, experiment, omission,
   and data contract without current-source expansion;
8. verify fresh current Trust, revocation, key/issuer, and anti-rollback evidence
   for the exact Connection, Agent, Passport, and authority inputs;
9. obtain and independently verify current structured authorization for the
   exact principal, Connection, scope, target, capability/version, operation/
   action, policy revision, time, validity, and restrictions;
10. enforce every stricter deployment policy without weakening the protocol
    floor;
11. when required, independently verify the exact-action Approval and its exact
    Invocation/action binding without treating it as authorization;
12. verify the Invocation admission deadline under REQ-INV-0011;
13. establish the exact Invocation/idempotency identity under REQ-INV-0007 and
    apply prior-result equality, conflict, and disclosure rules;
14. enter one Connection/idempotency acceptance serialization boundary and
    reload or protect with validated authoritative versions every raceable
    state, sequence, expiry, suspension/terminal/replacement trigger, immutable
    binding, authentication, scope, capability restriction, Trust/revocation,
    authorization/policy, Approval, deadline, and idempotency fact; and
15. atomically commit exactly one durable Invocation acceptance, Task identity,
    idempotency outcome, accepted authority/deadline/cancellation/Receipt
    context, Approval consumption when required, and non-authorizing audit
    intent.

Only step 15 accepts new work. Preliminary checks, policy ALLOW, Approval proof,
locks, leases, cache entries, Task candidates, queue publication, audit events,
network success, and response delivery MUST NOT accept an Invocation. A
raceable gate checked before step 14 MUST be rechecked there; it MUST NOT be
assumed unchanged.

**Applies to.** Every first-time or definitely precommit Invocation admission
attempt.

**Lifecycle/state impact.** The complete step-15 commit creates the one accepted
work identity. No preceding step has a Task or lifecycle effect.

**Semantic failure.** Failure of any applicable guard before commit rejects the
new work with no Task, Approval consumption, authority, or external effect. An
indeterminate commit outcome enters REQ-INV-0010 recovery and MUST NOT be
reported as definite precommit rejection.

**Sources:** H-02, H-05, H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-007,
GB-008, GB-011, GB-012, GB-013, GB-015, GB-017.

## REQ-INV-0004 - Task birth and Approval-consumption boundary

**Requirement.** A protocol execution Task MUST first exist only as part of the
durable final Invocation-acceptance outcome in REQ-INV-0003. That outcome MUST
create exactly one stable Task identity bound to the exact Invocation and
idempotency identity, Connection/release/profile/scope, capability/action,
admission and execution deadline semantics as applicable, cancellation and
Receipt policy, and accepted authority context. Validation, an Approval
Challenge or Decision, a waiting UI object, candidate construction, transaction
entry, lock/lease, queue message, worker attempt, response, or audit event MUST
NOT create a Task.

When exact-action Approval is required, transition of that Approval to its H-08
consumed outcome, creation of the one durable acceptance and Task identity,
binding of the exact idempotency outcome, and durable audit intent MUST commit
atomically as one result. If any component cannot commit, the acceptance MUST
abort and Approval MUST remain unconsumed unless an independent serialized
Approval expiry or revocation won. An already committed Approval consumption
MUST NOT be restored by later queue, worker, execution, effect, Result, Receipt,
audit, delivery, transport, or client failure.

D1-05 owns Task states, dispatch, execution attempts, cancellation races,
terminality, Result and Receipt coupling, effects, polling, and retention after
this birth boundary; this requirement MUST NOT be used to invent those details.

**Applies to.** Final admission with and without Approval and recovery of an
ambiguous acceptance commit.

**Lifecycle/state impact.** Exactly one acceptance commit creates one Task
identity; otherwise no Task exists. Approval consumption, when applicable,
shares that atomic boundary.

**Semantic failure.** A Task without complete acceptance/idempotency evidence,
or consumed Approval without its one Task/admission outcome, is an integrity
violation and MUST fail closed without inventing the missing linkage or creating
another Task.

**Sources:** H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-013, GB-016, GB-017.

## REQ-INV-0005 - Definite pre-execution rejection

**Requirement.** A definite semantic failure before the final durable
acceptance commit MUST reject only the request candidate. It MUST create no
Task, begin no external effect, consume no Approval merely because validation
was attempted, grant no Connection or action authority, and produce no Result
or Receipt for accepted work. `rejected` MUST remain a pre-Task admission
outcome and MUST NOT be represented or interpreted as a Task state.

A provisional workflow or UI representation such as waiting for Approval MUST
remain non-authoritative and MUST NOT imply Task existence, accepted work,
reserved effect, or cancellation eligibility. Audit of an attempted rejection
MAY occur only as a safe non-authorizing event and MUST NOT change the semantic
outcome.

**Applies to.** Structural, authentication, Connection, scope, capability,
Trust, authorization, policy, Approval, deadline, and idempotency failures known
before commit.

**Lifecycle/state impact.** None. The candidate ceases without a Task or
governed state transition.

**Semantic failure.** Any implementation that persists or exposes a rejected
candidate as accepted work has violated the Task-birth boundary and MUST
quarantine the inconsistent state rather than execute or repair it from current
defaults.

**Sources:** H-07, H-08, H-09, H-12. **Gaps:** GB-013, GB-015, GB-016.

## REQ-INV-0006 - Opaque correlation and parent/child linkage

**Requirement.** Request, message, correlation, trace, and parent identifiers
MUST be bounded opaque correlation metadata only. The participant that generates
an identifier owns its namespace and bytes. A receiver MUST generate a fresh
opaque request identifier for each request it observes at an external boundary;
that identifier is scoped to the generating receiver's observation of that one
boundary request and MUST NOT be assumed globally unique. A Host/Client or
other sender MAY generate a local message or correlation identifier and MAY
repeat that exact value solely to correlate its own attempts and evidence.

At each new trust boundary or child operation, the receiver or child MUST keep
its own newly generated identifier distinct from a peer or parent identifier. A
peer identifier MAY be retained or propagated only as a separately labeled,
bounded, non-authoritative link under the applicable privacy policy. A child-
to-parent link states correlation only: it MUST NOT inherit the parent's
principal, tenant, Connection, authority, idempotency, acceptance, deadline, or
outcome, and the child MUST have its own identifier. An unresolved parent is not
proof that the parent did or did not exist.

An optional malformed, duplicate, conflicting, or mismatched correlation link
MUST be discarded as invalid correlation and MUST NOT alter the owning semantic
operation. If the exact selected authentication profile or a registered
operation expressly protects a correlation value as request context, mismatch
MUST instead invalidate that proof/operation under its owning rule; the receiver
MUST NOT choose one conflicting value or repair it. Internal and peer IDs MUST
NOT overwrite one another, and prohibited trace state or baggage MUST NOT be
propagated across a trust boundary.

Correlation identifiers MUST be non-secret where exposed, MUST NOT contain raw
principal, tenant, Connection, Task, Approval, credential, proof, or protected
payload data, and MUST NOT serve as authentication, principal or tenant
identity, Connection authority, Trust proof, authorization, Approval,
idempotency identity, result-disclosure authority, or retry permission. Matching
correlation alone MUST NOT converge a state-changing retry.

**Applies to.** Sender- and receiver-generated request/message IDs, correlation
links, trace links, parent/child operations, logs, audit references, retries,
and error association.

**Lifecycle/state impact.** None. Correlation never creates, advances,
deduplicates, cancels, or discloses work.

**Semantic failure.** Collision, mismatch, malformed parentage, unauthorized
propagation, or use as authority/idempotency is invalid correlation or an owning
proof failure and MUST NOT mutate or disclose protocol state.

**Sources:** H-02, H-06, H-07, H-08, H-09, H-12. **Gaps:** GB-014, GB-017.

## REQ-INV-0007 - Complete Invocation and idempotency identity

**Requirement.** Every Invocation that may create work MUST have a stable
Host-generated Invocation identity and idempotency namespace/key retained for
the exact semantic intent. The Agent MUST establish a complete semantic
Invocation/idempotency identity that binds, as applicable:

- exact Invocation identity, idempotency namespace/key, and owning operation;
- authoritative Connection and immutable creation/authority identity;
- authenticated typed principal, separately bound actor/beneficiary context,
  selected authentication profile/context, and exact Agent/Passport/audience/
  resource target;
- exact selected release, organization, and tagged workspace;
- capability key/version, operation/action, effect class, resource/destination,
  restrictions, limits, selected extensions/experiments, and output authority
  where effect-relevant;
- selected input/data-contract identity and normalized semantic input identity
  or H-10 body-digest slot, including every authority/effect-critical value and
  presence distinction;
- structured authorization identity, policy revision and restrictions, plus
  exact Approval/action/consumption binding when Approval applies;
- admission deadline semantics and immutable Task execution deadline semantics
  where applicable; and
- every other selected-release authority, disclosure, or effect-critical field
  needed to distinguish one exact retry from different work.

The Client MUST repeat the same Invocation/idempotency values only for this
complete exact intent and MUST durably retain them across ambiguous outcomes and
restart for its supported recovery horizon. The Agent MUST compare semantic
equality in both value and presence and durably bind the accepted identity to the
one Task/admission outcome. A request, message, correlation, trace, parent,
transport, Approval, or Task identifier alone MUST NOT be substituted for this
identity. H-10 owns canonical representation and digest bytes and MUST NOT
redefine this semantic inventory.

**Applies to.** First admission, exact retry, concurrent retry, conflict
detection, Approval-bearing continuation, restart, and durable result recovery.

**Lifecycle/state impact.** Construction has none. The complete identity becomes
durable at acceptance and thereafter prevents second Task creation for the same
identity.

**Semantic failure.** Missing or reused identifier, incomplete intent binding,
ambiguous equality, or a differing authority/effect-critical field is invalid
or conflict and MUST NOT create work.

**Sources:** H-07, H-08, H-09, H-10, H-12. **Gaps:** GB-013, GB-015, GB-017.

## REQ-INV-0008 - Exact retry and concurrent convergence

**Requirement.** An exact Invocation retry MUST present the same complete
REQ-INV-0007 identity and current evidence required for authentication and
result disclosure. If the first attempt definitely failed before commit, the
exact request MAY attempt admission again only after every current gate is
fully reevaluated and while the admission deadline remains valid. If the one
acceptance already committed, every exact authorized sequential or concurrent
retry MUST converge on the same durable Task/admission identity and MUST NOT
create another Task, consume Approval again, restart execution, or repeat an
external effect.

Concurrent exact attempts MUST permit at most one state-changing acceptance
commit. A losing exact attempt MUST verify complete equality and current
disclosure authority before learning the winner's result. Durable idempotency,
Task, Approval-consumption, and transaction evidence MUST survive restart,
failover, and response loss and MUST preserve the same outcome independently of
caches, queues, workers, transport attempts, and current defaults.

An already accepted exact retry is recovery/read of existing work, not a new
Invocation acceptance. Expiry of the original admission deadline after commit
MUST NOT create new work or erase the accepted outcome; current authentication
and disclosure authorization remain required to return it.

**Applies to.** Definite precommit retry, committed replay, concurrent exact
requests, response loss, restart, and failover.

**Lifecycle/state impact.** At most one acceptance and Task creation. Exact
postcommit retries perform no Task, Approval, deadline, or effect transition.

**Semantic failure.** Inability to prove full equality, durable winner, or
current disclosure authority MUST fail closed without convergence disclosure or
new work.

**Sources:** H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-013, GB-015, GB-017.

## REQ-INV-0009 - Conflicting idempotency reuse

**Requirement.** Reuse of an Invocation identity, idempotency namespace/key,
Approval, or accepted-work identity with any different value or presence for an
authority-, disclosure-, or effect-critical semantic MUST be a conflict. This
includes a different principal or actor, Connection, Agent/Passport/target,
release/profile, organization/workspace, capability/version, operation/action,
resource/destination, data contract or input, restriction/limit, authorization/
policy revision, Approval binding, deadline semantic, extension/experiment, or
other REQ-INV-0007 input.

A conflict MUST NOT execute, create a second Task, consume or restore Approval,
mutate the first Invocation/Task/idempotency record, merge two intents, select a
closest or compatible value, or disclose the original Task, result, principal,
tenant, Connection, action digest, competing value, or existence to an
ineligible caller. Repeating the conflict MUST remain non-authorizing.

**Applies to.** Sequential and concurrent conflicting retries, identifier
collision, cross-principal/tenant reuse, and stale-client mutation.

**Lifecycle/state impact.** None. The original committed outcome, if any,
remains unchanged.

**Semantic failure.** The request is conflict/non-authorizing and fails without
new work, effect, mutation, or protected disclosure. H-12 owns the safe public
representation.

**Sources:** H-07, H-08, H-09, H-10, H-12. **Gaps:** GB-012, GB-013, GB-017.

## REQ-INV-0010 - Ambiguous transport and commit outcome

**Requirement.** Client wait timeout, caller abort, connection reset, transport
or proxy failure, truncated or lost response, server response-write failure,
process crash, storage-call timeout, and delivery acknowledgement MUST NOT prove
that Invocation acceptance committed or failed. A transport observation MUST
NOT create semantic cancellation, expire an admission or Task, restore Approval,
roll back a durable commit, or authorize another Invocation/idempotency identity.

After ambiguity, the caller MUST preserve the exact origin/release, principal,
Connection, Invocation/idempotency intent, operation, deadline semantics, and
Approval binding and MUST either perform a separately authenticated and
authorized durable read using the known accepted identity, or repeat only the
exact convergent request permitted by REQ-INV-0008. It MUST NOT blindly create a
new idempotency key, Invocation, Approval, Connection, target, release, or
origin, or assume a local error named cancellation is a terminal result.

The Agent MUST reread by the transaction, Invocation, idempotency, Approval, and
Task identities. A complete internally consistent committed bundle controls; a
proven absence of commit permits only a fresh fully revalidated attempt; partial,
corrupt, rolled-back, split-brain, unavailable, or inconsistent state is
indeterminate and MUST remain non-authorizing until one exact history is
restored. D1-07 owns transport retry representation and timing.

**Applies to.** Every ambiguous state-changing transport, process, storage, or
response-delivery outcome.

**Lifecycle/state impact.** None is inferred from transport. Recovery discovers
the existing commit or may perform the single first commit only after definite
noncommit and complete revalidation.

**Semantic failure.** Guessing commit state, blind retry, or inconsistent
durable evidence is indeterminate and MUST fail closed without a second Task or
effect.

**Sources:** H-06, H-07, H-08, H-09, H-12. **Gaps:** GB-013, GB-015, GB-017.

## REQ-INV-0011 - Admission deadline and independent time boundaries

**Requirement.** An Invocation admission deadline MUST be an immutable absolute
semantic boundary for creation of new accepted work and MUST be bound into the
exact Invocation identity where applicable. The Agent MUST evaluate it using
the authoritative serialization clock at the final acceptance boundary. New
work may commit only while authoritative time is strictly earlier than the
deadline; when time reaches or exceeds the deadline, the request is expired and
MUST create no Task. A preliminary time check or absent sweeper is insufficient.

The admission deadline MUST remain distinct from authentication establishment
or request-proof validity, authorization/policy validity, Approval expiry,
Connection expiry, Task execution timeout, cancellation-request timing, Result
or Receipt retention, and client/server/proxy transport timeout. No transport
wait, retry, response, poll, restart, queue delay, recovery, clock rollback,
cache, or current default MUST extend, pause, replace, or mutate a semantic
deadline. Transport timeout MUST NOT prove semantic expiry, Task timeout,
cancellation, or noncommit.

This chapter defines only Invocation admission. D1-05 owns Task execution
timeout and terminal races; D1-07 owns transport-attempt timeout and wire
representation.

**Applies to.** First or definite-precommit admission and final deadline/idempotency
recheck.

**Lifecycle/state impact.** Commit strictly before the boundary may create the
one Task; at or after equality the attempt is pre-Task rejection. An already
committed exact retry reads existing work and creates no new deadline effect.

**Semantic failure.** Missing, malformed, mutable, extended, wrong-clock, or
expired admission deadline is invalid or expired and MUST fail before Task,
Approval consumption, or effect.

**Sources:** H-07, H-08, H-09, H-10, H-12. **Gaps:** GB-013, GB-015, GB-017.

## REQ-INV-0012 - Cancellation-request admission and handoff

**Requirement.** Cancellation MUST be a separate purpose-bound protocol
operation, not an Invocation transport abort. Before accepting a cancellation
request, the Agent MUST:

1. perform bounded structural validation;
2. load the authoritative durable Task acceptance bundle without trusting a
   body identity, determine the source class from verified evidence, and verify
   that the immutable accepted cancellation policy permits that exact class;
3. apply the source-specific verification contract below;
4. bind a stable cancellation-intent identity to the exact Task, original
   Invocation, Connection, accepted release/profile, Agent/Passport,
   organization/tagged workspace, verified requester or stop-source identity and
   scope, cancellation purpose/policy, the safe
   reason semantics, current request purpose/time, and ordering evidence,
   without using correlation as idempotency; and
5. durably serialize one idempotent cancellation-intent handoff under the
   H-09-owned Task version/fence and race boundary.

For **explicit requester cancellation**, the Agent MUST authenticate the
requester using current evidence under the exact applicable H-05 selected
authentication profile, derive the exact typed requester principal solely from
verified evidence, and authorize that principal for cancellation of the exact
Task, Invocation, Connection, Agent/Passport, organization/tagged workspace,
purpose, and accepted cancellation policy.

For a **recognized pre-bound authority-withdrawal or stop source**, the Agent
MUST verify the source under its own accepted issuer, key, purpose, subject,
scope, freshness, revocation, and anti-rollback evidence rules. The verified
source class MUST have been permitted by the immutable Task acceptance/
cancellation policy, and its authoritative subject/scope MUST cover the exact
Task and Connection. Such a source MUST NOT be treated as a Host principal
merely because it may request stopping remaining work and MUST NOT be forced
through the Host's H-05 authentication profile when that is not the owning
evidence contract. An ordinary caller assertion, body field, reference, or
credential MUST NOT impersonate or select an H-11-qualified stop source.

An exact authorized repeat MUST converge on the same cancellation intent and
current authorized outcome and MUST NOT create a duplicate intent, duplicate
effect, new Task, new cancellation authority, or reason/state rewrite. A
conflicting, unsupported, cross-scope, wrong-Task, wrong-Invocation, or
unauthorized attempt MUST mutate nothing and MUST NOT disclose Task existence or
the accepted intent.

Durable request acceptance grants only the bounded attempt to stop remaining
interruptible work. It MUST NOT prove that cancellation won, that no effect
occurred, that an in-flight remote effect was reversed, or that the Task is
terminal, and neither source class MUST create new authority. Caller abort,
socket close, process exit, proxy timeout, queue/lease loss, and response failure
MUST NOT create a cancellation intent. D1-05 owns legal Task states,
checkpoints, cancel-versus-complete/timeout/effect races, fencing, remaining
effects, terminal outcome, Result/Receipt consequences, and post-handoff
recovery.

**Applies to.** Explicit requester cancellation, recognized pre-bound authority-
withdrawal stop requests, exact cancellation retries, and cancellation
admission recovery.

**Lifecycle/state impact.** A successful boundary commits one durable
cancellation intent/handoff only. This chapter does not select a Task state or
terminal winner.

**Semantic failure.** Failed authentication/authorization, unsupported
cancellation, mismatch, conflict, or indeterminate persistence creates no intent
and no Task mutation; response or transport behavior MUST NOT be treated as the
winner.

**Sources:** H-02, H-05, H-07, H-09, H-11, H-12. **Gaps:** GB-012, GB-013,
GB-014, GB-015, GB-016, GB-017.

## REQ-INV-0013 - Admission response and later resource boundary

**Requirement.** Invocation acceptance MAY return or reference only the exact
durable Task/admission outcome created by REQ-INV-0003, as the later Task and
transport chapters define. Response construction, status, delivery, client
receipt, or synchronous connection lifetime MUST NOT create, alter, prove,
cancel, complete, or roll back acceptance. This chapter MUST NOT invent
synchronous execution, application streaming, Task progress/state, terminal
outcome, Result, Receipt, polling, or retention semantics beyond the accepted
H-09 boundary.

Task status, Result retrieval, and Receipt retrieval MUST be separate current
authenticated, exact-scope, purpose-bound, disclosure-authorized read
operations. Those reads MUST NOT create or advance work, restore Approval,
change deadlines or terminality, or serve as Invocation retry authority. A
Connection that later becomes suspended or terminal MUST NOT erase an accepted
Task; any continued work and historical disclosure remain D1-05/H-09 concerns.

**Applies to.** Admission acknowledgements, response loss, Task references, and
later Task/Result/Receipt reads.

**Lifecycle/state impact.** Only the durable acceptance commit has a birth
effect. Responses and reads have none.

**Semantic failure.** A response or read represented as authority, Task
transition, cancellation success, or retry permission is invalid and MUST NOT
cause work or disclosure.

**Sources:** H-07, H-08, H-09, H-12. **Gaps:** GB-013, GB-015, GB-016, GB-017.

## REQ-INV-0014 - Internal failure order and privacy boundary

**Requirement.** The Agent MUST preserve this internal semantic security order,
without treating it as a final public error order:

1. bounded framing, parsing, structural, type, duplicate, and resource-limit
   validation;
2. exact configured release/operation routing sufficient to select the already
   bound context safely;
3. selected-profile proof, freshness/replay, principal, issuer, audience,
   target, tenant, and purpose verification;
4. disclosure authorization before exposing Connection, Task, Approval, result,
   lifecycle, tenant, or policy existence;
5. immutable Connection integrity, exact scope/state/expiry, current Trust and
   revocation, capability restrictions, structured authorization, and stricter
   policy;
6. exact Approval, admission deadline, idempotency, and operation semantic
   validation; and
7. one final serialized acceptance or other owning operation commit, followed
   only then by bounded representation and delivery.

Every applicable raceable gate MUST still be rechecked at the final commit even
if this order checked it earlier. No external effect may occur before every
applicable precommit gate succeeds. Internally distinct missing, unknown,
cross-tenant, unauthorized, inactive, expired, revoked, policy-denied,
Trust-stale, corrupt, and conflicting causes MAY be retained only in a protected
safe audit domain; the public response MUST NOT expose tenant or object
existence, principal mismatch, Connection/Task state, Trust or revocation
detail, policy rule/revision, Approval facts, competing idempotency content,
storage topology, or secret input merely because internal processing knows it.

H-12/D1-07 MAY collapse or withhold public distinctions and owns exact transport
order, status, stable public error identity, safe details, retry labels, limits,
timing defenses, and observability. That collapse MUST NOT weaken any guard,
change the semantic commit outcome, or make a rejected request appear accepted.

**Applies to.** Multi-fault Invocation and cancellation validation, protected
lookup, audit, and public failure handling.

**Lifecycle/state impact.** None until the one owning final commit. Public error
selection has no authority or lifecycle effect.

**Semantic failure.** An unsafe disclosure, reordered enforcement that permits
an effect, omitted final recheck, or public response treated as semantic commit
evidence is invalid and non-authorizing.

**Sources:** H-02, H-05, H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-008,
GB-012, GB-013, GB-014, GB-015, GB-016, GB-017.

## Non-normative D2 traceability

Later D2 work is expected to derive Invocation, admission, correlation,
deadline, cancellation-request, idempotency, and durable outcome schemas and
cases for untrusted claims, exact scope, final gate races, Task birth, Approval
atomicity, identifier collision/parentage, exact and conflicting retry,
concurrency, restart, transport ambiguity, deadline equality, cancellation
handoff, and privacy collapse. D1-05 retains post-acceptance Task/cancellation
terminal semantics and D1-07 retains the HTTP/error/limit/observability mapping.
This chapter creates none of those assets and closes no `GB-*` gap.
