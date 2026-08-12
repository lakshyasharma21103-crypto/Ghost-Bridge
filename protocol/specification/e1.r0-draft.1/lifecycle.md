# Lifecycle

This chapter defines the complete high-level ordering and authority boundaries
for D1-01. Later chapters own detailed wire fields, schemas, errors, algorithms,
and serialized state-machine assets.

## REQ-LIFE-0001 - Ordering and authority invariant

**Requirement.** A Connection-establishment lifecycle SHOULD begin with public
discovery when the target is not already supplied by a trusted out-of-band
resolver. It MUST complete every Trust gate required by the applicable release,
profile, or operation, an advisory installation preview, authentication, a final
post-authentication preview and immutable human consent, Install Grant redemption
with final deterministic validation, and one atomic durable active-Connection
commit before governed authority exists. The lifecycle MUST preserve the required
relative ordering of every phase it uses. Discovery, either preview, consent,
authentication, Trust verification, Passport possession, negotiation, Approval,
locks, candidates, transaction entry, response delivery, and audit delivery
independently grant no Connection authority. Connection authority begins only at
the complete H-06 transaction's durable and durably observable commit.

**Sources:** H-01, H-06, H-07. **Gaps:** GB-001, GB-003.

## REQ-LIFE-0002 - Complete high-level sequence

**Requirement.** The following table is the primary establishment and admission
spine. Every applicable phase MUST preserve the listed relative order. Public
discovery remains recommended and conditional rather than a universal first-
request gate. Beginning or evaluating a governed request MUST NOT mean that the
operation has committed, and separately bounded status, exact replay, recovery,
and historical-read paths are not new-work admission phases.

| Order | Primary phase | Required boundary and authority effect |
| ---: | --- | --- |
| 1 | Recommended public discovery and metadata observation, when applicable | Candidate metadata only; no authority or initialization |
| 2 | Applicable required Trust verification | Required candidate evidence is verified under its release/profile/operation gate; no authority |
| 3 | Advisory installation preview | Safe candidate meanings may be presented; no consent envelope or authority |
| 4 | Authentication establishment | One eligible profile yields a typed authenticated principal and binding; no Connection authority |
| 5 | Final preview and immutable human consent | Exact post-authentication material meanings are bound in immutable consent; no Connection authority |
| 6 | Install Grant redemption attempt | Exact intent enters bounded validation and serialization; no authority |
| 7 | Final deterministic negotiation and revalidation | One selection remains within consent and every applicable precommit gate passes, or redemption fails before commit |
| 8 | Atomic durable active-Connection commit | The grant becomes redeemed and exactly one Connection becomes directly `active`; Connection authority begins only here |
| 9 | Governed-request evaluation and admission checks | New-work admission requires the active Connection and all current applicable gates; evaluation and preliminary checks commit nothing |
| 10 | Approval gate, when required | The exact Decision and available authority are verified before final acceptance; neither alone authorizes work, and consumption is reserved for the acceptance transaction |
| 11 | Final Invocation and Task acceptance | All raceable gates are revalidated; required Approval consumption and exactly one Task commit atomically; no Task or new external effect may begin before this boundary |
| 12 | Task, Result, and Receipt execution lifecycle | Accepted work progresses and terminal evidence forms under its later owning lifecycle without widening the accepted authority |

The following events are conditional and orthogonal to that spine. They MUST
NOT be interpreted as occurring after the primary phases in one fixed sequence
or in the order listed here. Each event occurs only when its applicable trigger
or context exists and MUST preserve its own accepted serialization, durability,
and authority boundary.

| Conditional or orthogonal event | Trigger/context and required boundary |
| --- | --- |
| Connection suspension | An applicable recoverable Connection-wide cause serializes; new-work authority pauses without changing immutable bounds |
| Connection expiry | The accepted expiry boundary is reached and terminally serializes against competing work or transitions |
| Connection closure | A separately authorized closure transition commits without being inferred from transport shutdown |
| Connection revocation | An applicable authoritative security trigger serializes without rewriting committed history |
| Connection replacement | A material change invokes the predecessor/successor ordering and exclusivity invariant |
| Restart and durable recovery | Process or transport continuity is lost; exact committed state is restored and verified or remains non-authorizing |
| Historical retrieval or verification | Live disclosure follows its read boundary, while applicable retained proof verification may occur offline; neither creates current authority |
| Transport shutdown or failure | Byte-delivery continuity ends or becomes ambiguous; no protocol lifecycle transition occurs merely for that reason |

**Sources:** H-01, H-03, H-04, H-05, H-06, H-07, H-08, H-09, H-10, H-11,
H-12. **Gaps:** GB-001, GB-003, GB-014, GB-015, GB-016.

## Operation classes

## REQ-LIFE-0003 - Public pre-Connection operations

**Requirement.** Public pre-Connection operations MAY include bootstrap
discovery, candidate-release metadata, and issuer metadata/key/revocation
evidence whose candidate release or release-defined Trust profile permits public
access. Agent Passport and capability metadata MAY be public only when the
applicable candidate-release rules so classify them. These operations MUST
remain read-only and non-authoritative; HTTP success, caching, freshness
metadata, or possession of returned material MUST NOT create Trust,
installation, Connection, or Invocation authority.

**Sources:** H-01, H-11, H-12. **Gaps:** GB-001, GB-003.

## REQ-LIFE-0004 - Authenticated pre-Connection operations

**Requirement.** Authenticated pre-Connection operations MAY include protected
Passport/capability observation, authentication establishment or refresh,
administratively authorized grant issuance, grant resolution and preview, and
grant redemption/Connection creation. Each operation MUST enforce its own exact
authentication, disclosure, tenant, target, purpose, validity, and retry rules.
Successful authentication or pre-Connection access MUST NOT activate a
Connection.

**Sources:** H-01, H-05, H-06, H-12. **Gaps:** GB-001, GB-003.

## REQ-LIFE-0005 - Connection-governed operations

**Requirement.** Connection read or transition, Invocation acceptance, Approval
Challenge/Decision activity bound to an installed action, Task cancellation, and
current Task/Result/Receipt access MUST be Connection-governed whenever their
accepted context contains a Connection. A new Invocation or any other operation
that accepts new governed work or begins a new external effect MUST require an
active Connection and every current applicable gate. Status, exact replay, safe
recovery, terminal-object access, and historical reads MAY remain available for
suspended or terminal Connections only under their separately bounded rules;
they MUST NOT restore or create current Connection authority.

**Sources:** H-02, H-07, H-08, H-09, H-12. **Gaps:** GB-001, GB-003, GB-015, GB-016.

## REQ-LIFE-0006 - Historical-evidence operations

**Requirement.** Live retrieval or disclosure of tenant- or scope-bound
historical material, including a committed Connection result, terminal
Connection tombstone, already accepted Task, immutable Result, Receipt,
Approval-consumption record, or audit material, MUST enforce the applicable
current authentication, exact-scope purpose-bound disclosure authority,
retention, and privacy rules. Issuer metadata, key-history material, revocation
snapshots/history, and other Trust evidence MUST instead follow their applicable
H-11 and H-12 disclosure classification and MAY be public when the applicable
accepted profile classifies them as public. Public retrieval or HTTP success
MUST NOT create Trust, Connection, authorization, Approval, Invocation, or other
authority. Separately, H-11-governed historical proof verification of already-
retained immutable evidence, including applicable Receipt/proof evidence, MAY
occur offline without a current Connection or live authentication. It MUST use
the original release, profiles, evidence, and applicable history and MUST use
the H-11 classification semantics defined by REQ-LIFE-0027. Ordinary historical
retrieval need not produce that classification, and verification contracts not
expressly governed by H-11 remain owned by their applicable later chapter. All
historical verification MUST remain read-only and MUST NOT create, restore, or
extend current authority or authorize a new Connection, Invocation, Approval,
or external effect.

**Sources:** H-03, H-07, H-09, H-10, H-11, H-12, H-14. **Gaps:** GB-001, GB-003.

## REQ-LIFE-0007 - Correlation is not authority or idempotency

**Requirement.** Request, message, correlation, parent, and trace identifiers
MAY correlate lifecycle evidence only within their defined scope. They MUST NOT
serve as credentials, principal or tenant identity, Connection authority,
Approval, proof, or idempotency identity. A state-changing retry MUST use the
exact semantic identity required by H-06, H-08, or H-09; a matching correlation
identifier alone MUST NOT cause replay convergence or disclose an existing
result.

**Sources:** H-06, H-07, H-08, H-09, H-12. **Gaps:** GB-014.

## Establishment

## REQ-LIFE-0008 - Discovery and metadata observation

**Requirement.** Public discovery SHOULD be the normal first Agent interaction
when the target is not already known. A trusted out-of-band resolver MAY identify
the target before that interaction. An out-of-band target, discovery result,
candidate-release metadata, capability description, or current endpoint is a
candidate input only. When used, discovery MUST remain non-authoritative and
MUST NOT create a server session, initialize authority, select a Connection
release, override Passport or consent ceilings, or reinterpret an existing
Connection. This recommendation creates no universal discovery-first authority
gate. Later D1-02 and D1-03 requirements MUST define operation-specific
prerequisites while preserving this boundary. Stale or changed metadata MUST be
revalidated at the later controlling boundary.

**Sources:** H-01, H-03, H-04, H-12. **Gaps:** GB-001, GB-003.

## REQ-LIFE-0009 - Applicable required Trust verification

**Requirement.** When an applicable release, profile, or operation requires a
Trust gate for an Agent, Passport, issuer, key, release artifact, or revocation
statement, the applicable Trust verification service or enforcer MUST validate
its exact profile, issuer/root, purpose, target/audience, scope, time, key
history, revocation coverage/freshness, and durable anti-rollback floor before
the material contributes at that gate.
Remote production use MUST NOT bootstrap Trust from first observation. Missing,
stale, unavailable, forked, rolled-back, or unverifiable required Trust evidence
MUST be non-authorizing and MUST fail closed at the applicable gate.

**Sources:** H-01, H-02, H-05, H-10, H-11. **Gaps:** GB-001, GB-002, GB-003.

## REQ-LIFE-0010 - Preview and immutable human consent

**Requirement.** Installation MUST present an advisory safe preview and, after
authentication establishment, a final secret-free preview that binds the exact
Agent/Passport, release, authentication result, organization and tagged
workspace, profiles/facets, capability versions, extensions, experiments,
omissions, restrictions, limits, and other material selection meanings. The
human consent envelope MUST be immutable and integrity-bound. A material change
MUST require a new preview and new explicit consent; no secret or reusable
credential MAY enter the preview or consent envelope.

**Sources:** H-01, H-04, H-05, H-10. **Gaps:** GB-001, GB-003.

## REQ-LIFE-0011 - Authentication establishment

**Requirement.** Authentication establishment MUST select one exact eligible
H-05 profile and derive the typed Host principal from verified evidence bound to
the exact Agent/resource target, purpose-specific audience, tenant, and intended
Connection context. A credential reference alone MUST NOT be proof. No
first-common, array-order, weaker-profile, bearer-for-Governed-PoP, provider-
default, cached-success, broker-failure, or `none` fallback is permitted.
Authentication success MUST NOT by itself grant Connection or action authority.

**Sources:** H-01, H-02, H-05. **Gaps:** GB-002, GB-003.

## REQ-LIFE-0012 - Redemption intent and validation

**Requirement.** Install Grant redemption MUST bind one exact authority-critical
intent to the grant, authenticated principal, target, tenant, final consent,
candidate selection, and stable attempt identity. Every applicable gate MUST be
validated before transaction entry and every raceable gate MUST be revalidated
at the atomic authority-activation boundary. The request body and grant
possession MUST NOT establish principal identity or replay-result eligibility.
The later owning chapter MUST define the complete intent and validation contract
while preserving these bindings and boundaries.

**Sources:** H-01, H-04, H-05, H-06, H-11. **Gaps:** GB-001, GB-003.

## REQ-LIFE-0013 - Final deterministic negotiation

**Requirement.** Final deterministic negotiation MUST occur within redemption
before the authority commit and MUST produce exactly one result within immutable
consent. Negotiation alone MUST grant no authority, and its result becomes an
immutable Connection bound only through the atomic commit. There MUST be no
silent downgrade, default, cross-release evidence reuse, or selection outside
consent. The later owning chapter MUST preserve H-03 deterministic eligible
bilateral selection and the H-04 monotonic, non-widening intersection invariant
while defining the complete algorithm and evidence contract.

**Sources:** H-01, H-03, H-04, H-06. **Gaps:** GB-001, GB-003.

## REQ-LIFE-0014 - Atomic authority activation

**Requirement.** One indivisible H-06 transaction MUST durably transition the
grant to `redeemed` and create exactly one complete `active` Connection bound to
the exact intent and result. No intermediate, partial, lock, candidate, response,
or audit state MAY carry authority. The Connection becomes authoritative only
after the complete outcome is durably committed and observable. The later owning
chapter and state machine MUST preserve this single authority-activation
boundary and define its complete transaction contract.

**Sources:** H-01, H-06, H-07. **Gaps:** GB-001, GB-003.

## REQ-LIFE-0015 - Redemption retry, concurrency, and crash recovery

**Requirement.** Exact authenticated redemption repeats, concurrent submissions,
and retries after a lost response MUST converge on the same committed result.
A conflicting principal or authority-critical intent MUST cause no mutation or
disclosure. A precommit crash creates no authority; a postcommit crash preserves
the committed result; indeterminate state MUST fail closed. The later owning
chapter MUST define the complete retry, conflict, and recovery contract while
preserving these convergence and commit-boundary invariants.

**Sources:** H-06, H-07, H-12. **Gaps:** GB-003, GB-014.

## Governed operation and work

## REQ-LIFE-0016 - Governed operation admission

**Requirement.** A new Invocation or other request whose acceptance creates new
governed work or permits a new external effect MUST require an `active`
Connection and every current applicable authentication, identity/binding,
tenant, scope, Trust/revocation, structured-authorization, time, idempotency,
and exact-action Approval gate. Every raceable gate MUST be revalidated at the
final serialized acceptance boundary before a Task or external effect can begin.
Preliminary checks, caches, candidates, locks, policy results, and Approval
evidence grant no acceptance. This active-state admission rule MUST NOT by itself
prohibit separately bounded status, exact replay or recovery, terminal-object
access, or historical reads, and none of those paths MAY restore or create
current Connection authority. The later owning chapters MUST preserve this
final-enforcement invariant while defining each operation-specific admission or
read/recovery contract.

**Sources:** H-02, H-05, H-07, H-08, H-10, H-11. **Gaps:** GB-002, GB-003, GB-015.

## REQ-LIFE-0017 - Approval flow

**Requirement.** When current policy requires Approval, the Challenge, Decision,
and any `available` exact-action Approval authority MUST remain pre-Task and
non-authorizing by themselves. Only an approved Decision for the exact Challenge
MAY satisfy this additional gate, subject to every other current gate. Its
single-use transition to `consumed` MUST be atomic with final Invocation
acceptance and Task creation; definite precommit failure MUST NOT consume it
unless a terminal Approval event wins, and postcommit failure MUST NOT restore
it. Exact retry MUST create no new Task. The later owning chapter MUST preserve
these state and serialization boundaries while defining the complete Approval
contract.

**Sources:** H-02, H-07, H-08. **Gaps:** GB-002, GB-003.

## REQ-LIFE-0018 - Task birth and lifecycle

**Requirement.** A Task MUST first exist as `accepted` at the final durable
Invocation-acceptance commit; every candidate, validation, or wait before that
boundary is pre-Task. A Task MUST use exactly the states `accepted`, `queued`,
`running`, `completed`, `failed`, `cancelled`, and `timed_out`; the final four are
terminal and have no exits. `rejected` MUST remain a pre-Task outcome, and Task
identity MUST remain stable through its lifecycle. The later owning chapter and
state machine MUST preserve this state inventory, birth boundary, identity, and
terminality while defining detailed transitions and execution attempts.

**Sources:** H-07, H-08, H-09. **Gaps:** GB-003, GB-016.

## REQ-LIFE-0019 - Result and Receipt lifecycle

**Requirement.** Each terminal Task MUST have exactly one separately identified
immutable Result. The terminal Task state, Result, effect truth, and selected
Receipt semantic input or explicit no-Receipt marker MUST become consistent at
one atomic terminal boundary. Later Receipt materialization MUST converge from
that immutable input without rerunning execution. A Receipt MUST NOT change
terminal truth, authorize work, or restore Approval. The later owning chapters
MUST preserve these identity, atomicity, and non-authority invariants while
defining the complete Result and Receipt contracts.

**Sources:** H-09, H-10, H-11. **Gaps:** GB-001, GB-003, GB-016.

## REQ-LIFE-0020 - Cancellation

**Requirement.** Cancellation MUST be a separately authenticated, authorized,
durable intent to stop remaining interruptible work, not proof that execution
aborted or that no effect occurred. Cancellation, effect checkpoints, and the
terminal boundary MUST serialize so the winning committed facts and effects are
preserved. Unknown effect status MUST remain fail-closed and MUST NOT authorize
a blind retry or false `cancelled` result. The later owning chapter MUST preserve
these intent, race, and effect-truth invariants while defining the complete
cancellation contract.

**Sources:** H-09, H-12. **Gaps:** GB-003, GB-016.

## REQ-LIFE-0021 - Deadlines and transport timeouts

**Requirement.** Invocation admission deadline, Task execution deadline,
Approval expiry, Connection expiry, authentication/proof validity, policy
validity, Trust freshness, retention horizon, and transport timeout MUST remain
distinct. Every semantic boundary MUST use its accepted authoritative
serialization clock; where H-07 through H-09 specify strict validity, equality
is expired or timed out. A client, proxy, handler, or network timeout MUST NOT
prove that a state-changing request failed to commit, cancel a Task, extend a
deadline, or make a blind retry safe. After ambiguity, the caller MUST perform
an authorized durable read or repeat only an exact convergent request.

**Sources:** H-07, H-08, H-09, H-12. **Gaps:** GB-003, GB-015, GB-016.

## Connection lifecycle

## REQ-LIFE-0022 - Connection state inventory and authority

**Requirement.** A Connection MUST be created directly as `active`. Its visible
states MUST be exactly `active`, `suspended`, `expired`, `closed`, `revoked`, and
`replaced`. Active is necessary but not sufficient for a new Invocation.
Suspended has no current governed authority and admits no new Invocation.
Expired, closed, revoked, and replaced are terminal, carry no Connection-
governed authority, have no exit, and MUST NOT be reactivated. Pending,
creating, reauthenticating, recovering, replacing, unknown, and corrupt MAY be
internal conditions only and MUST NOT be protocol authority states.

**Sources:** H-07. **Gaps:** GB-001, GB-003, GB-015.

## REQ-LIFE-0023 - Suspension and resumption

**Requirement.** An applicable Connection-wide recoverable authentication or
Trust condition MAY durably suspend a Connection; isolated request failure or
ordinary policy denial MUST remain request-local unless an accepted profile
defines otherwise. A suspended Connection MUST admit no new Invocation and MUST
remain suspended while any cause is active. Resumption MUST serialize only after
every owning source clears its cause and all current gates pass. It MUST NOT
pause expiry, widen authority, change immutable bounds, create a Connection, or
revive a terminal Connection. The later owning chapter and state machine MUST
preserve these cause-ownership and authority boundaries while defining the
complete suspension contract.

**Sources:** H-05, H-07, H-11. **Gaps:** GB-002, GB-003, GB-015.

## REQ-LIFE-0024 - Expiry, closure, and revocation

**Requirement.** Finite Connection expiry MUST be immutable, MUST be checked at
serialization, and MUST terminally win at its accepted boundary; suspension MUST
NOT pause or extend it. Closure and revocation MUST be distinct irreversible
terminal transitions. Policy denial, issuer retirement, support loss, Trust
staleness, and provider outage MUST NOT become revocation without an accepted
mapping. Competing acceptance, expiry, closure, revocation, and suspension
triggers MUST serialize, preserve the winning committed facts, and retain later
relevant security evidence. The later owning chapter and state machine MUST
preserve these terminal distinctions and race invariants while defining their
complete transition contracts.

**Sources:** H-07, H-11, H-14. **Gaps:** GB-001, GB-003, GB-015.

## REQ-LIFE-0025 - Connection replacement

**Requirement.** A material change to immutable Connection meaning MUST require
a new preview, consent, grant, and distinct successor Connection. Replacement
MUST begin by durably suspending the predecessor under a unique replacement
coordinator and replacement-owned cause before successor creation. The successor
MUST be created only through the unchanged H-06 authority commit, and active-
active predecessor/successor overlap MUST be prohibited. Merely observing that
no successor exists yet MUST NOT permit predecessor resumption. Before successor
commit, the predecessor MAY resume only after the replacement attempt is
authoritatively proven to have terminally failed, exact H-06 replay or recovery
proves that no successor committed, the replacement coordinator and cause are
safely resolved or closed, every predecessor invariant and current gate remains
valid, and no terminal trigger won. An ambiguous successor outcome MUST be
resolved through exact H-06 replay or recovery, and the predecessor MUST remain
non-authorizing while the outcome is unresolved. After successor commit, the
predecessor MUST never resume. Successful replacement finalization MUST normally
terminally classify the predecessor as `replaced` and retain predecessor,
successor, and coordinator linkage. If another irreversible terminal transition,
including revocation, closure, or expiry, serialized first under the accepted
H-07 race rules, that winning terminal state MUST NOT be rewritten as `replaced`;
the durable history MUST preserve the winning terminal state, successor/coordinator
linkage, relevant security evidence, and permanent predecessor non-authority.
The later owning chapter and state machine MUST preserve these ordering,
recovery, terminal-race, and exclusivity invariants while defining the complete
replacement contract.

**Sources:** H-04, H-05, H-06, H-07, H-11. **Gaps:** GB-001, GB-003.

## REQ-LIFE-0026 - Restart and durable recovery

**Requirement.** Restart MUST load and verify the exact durable authoritative
lifecycle, authority, work, and historical state required by every surviving
object. It MUST NOT renegotiate from current discovery or defaults, reconstruct
authority from volatile state, reset a terminal object, restore consumed
Approval, or create replacement authority. Missing, partial, corrupt,
rolled-back, conflicting, or unresolved state MUST fail closed. Recovery MAY
restore only one exact proven history or retain a non-authorizing condition. The
later owning chapters MUST define the complete durable inventory while
preserving these recovery invariants.

**Sources:** H-01, H-06, H-07, H-09, H-11. **Gaps:** GB-001, GB-003.

## REQ-LIFE-0027 - Revocation history and historical verification

**Requirement.** Current revocation evidence MUST serialize against new
Connection, Invocation, Approval-use, and effect-checkpoint authority. Later
revocation or discovery of an earlier compromise MUST NOT erase or rewrite an
already committed fact. H-11-governed historical proof verification, including
applicable offline verification of retained Receipt/proof evidence under
REQ-LIFE-0006, MUST use the object's original release, schema/artifact and proof
profiles, exact evidence and context, key and revocation history, and trusted
time interval. It MUST return exactly one of the accepted H-11 semantic
classifications `historically_verified`,
`historically_verified_with_current_revocation`, `historically_invalid`,
`historically_indeterminate`, or `historically_unsupported`, as applicable.
These are accepted semantic classification names for normative prose, not final
JSON Schema enum values or wire spellings. Ordinary historical retrieval MUST
NOT be required merely by this requirement to produce an H-11 proof-verification
classification; verification contracts for other historical objects remain
owned by their applicable later chapter unless H-11 expressly governs them. All
historical verification MUST remain read-only and MUST never grant present
authority. The later owning chapter MUST preserve these classifications, the
original-evidence rule, and the revocation serialization invariant while
defining the complete H-11 verification contract.

**Sources:** H-03, H-09, H-10, H-11, H-14. **Gaps:** GB-001, GB-003.

## Transport and invalid order

## REQ-LIFE-0028 - Transport shutdown is not protocol shutdown

**Requirement.** HTTP completion, listener or process shutdown, socket close,
disconnect, reset, proxy timeout, caller wait abort, response-write failure, and
Client object disposal MUST NOT close, revoke, suspend, replace, resume, or
renegotiate a Connection and MUST NOT cancel or terminalize a Task. A transport
failure for a state-changing operation MUST be treated as ambiguous unless
authoritative durable evidence proves the semantic outcome. Voluntary closure
MUST use its applicable authenticated, exact-scope, authorized
closure operation and transition. Cancellation MUST use its separately
authenticated and authorized durable cancellation-intent operation. Replacement
MUST use the governed H-07 workflow and its required preview, consent, grant,
coordinator, and H-06 transitions; it MUST NOT be assumed to be one standalone
request operation. Revocation MUST arise only from an enumerated authoritative
H-07/H-11 revocation or compromise source and evidence and MUST durably serialize
as the applicable terminal security transition. It MUST NOT be required to
originate as a caller-authenticated protocol request when an accepted
authoritative security source supplies the trigger. Policy denial, issuer
retirement, Trust staleness, provider outage, transport failure, or arbitrary
operator assertion MUST NOT become revocation unless an accepted authoritative
mapping permits it. Every state-changing transition MUST retain its applicable
authorization, evidence, serialization, durability, and audit boundary. Live
historical retrieval MUST remain a read-only disclosure operation governed by
REQ-LIFE-0006 and MUST NOT require a state-changing durable commit merely to
perform the read. Polling/status retrieval and Result, Receipt, and tombstone
retrieval MUST likewise remain read-only and MUST grant no authority. Offline
H-11 historical proof verification under REQ-LIFE-0006 and REQ-LIFE-0027
requires neither a live protocol operation nor a new protocol-state commit. HTTP
MAY remain stateless between requests; protocol authority and work state MUST
remain durable.

**Sources:** H-01, H-07, H-09, H-11, H-12. **Gaps:** GB-003, GB-015, GB-016.

## REQ-LIFE-0029 - Invalid ordering and prohibited sequences

**Requirement.** An implementation MUST reject without authority widening the
following invalid sequences:

- treating discovery, preview, consent, authentication, Passport, Trust,
  negotiation, Approval, transport success, a lock, or a candidate as Connection
  authority;
- performing redemption commit before any applicable required Trust gate,
  authentication, consent, scope, eligibility, and final deterministic
  negotiation validation;
- selecting outside the consent envelope or applying a material change without
  a new preview, consent, grant, and Connection;
- creating, exposing, or recovering more than one Connection for one redeemed
  grant or accepting a conflicting replay;
- accepting a new Invocation or other operation that creates new governed work
  or begins a new external effect on an absent, suspended, expired, closed,
  revoked, replaced, corrupt, or unresolved Connection;
- treating authorization `ALLOW` or Approval as widening or replacing another
  gate, or allowing direct Agent-to-Agent authority;
- creating a Task before the final acceptance commit, consuming Approval outside
  that commit, or creating a second Task for an exact retry;
- treating a cancellation request, transport abort, deadline observation, queue
  event, Receipt, or response as a different Task lifecycle event than its
  accepted semantic commit;
- renegotiating an existing Connection on restart or fresh discovery;
- resuming a terminal Connection, clearing a suspension from the wrong source,
  or resuming the predecessor after successor commit; or
- using current schema, code, package, deployment, defaults, or missing evidence
  to reinterpret historical objects.

Every rejection MUST preserve already committed authority and historical facts,
must not begin a new external effect, and must not fabricate a public error or
wire representation not defined by the later owning chapter.

**Sources:** H-01, H-02, H-03, H-04, H-05, H-06, H-07, H-08, H-09, H-10, H-11,
H-12. **Gaps:** GB-001, GB-002, GB-003, GB-014, GB-015, GB-016.

## REQ-LIFE-0030 - Durable state and post-terminal behavior

**Requirement.** Every authoritative lifecycle fact and every dependency needed
to preserve its meaning, convergence, or historical verification MUST remain
durable for its applicable horizon. Live disclosure of a tenant- or scope-bound
post-terminal Connection or work object, including a Connection, Task, Result,
Receipt, Approval history, or related tombstone, MUST enforce the applicable
current authentication, exact-scope, purpose-bound disclosure, retention, and
privacy rules and MAY support only safe status, exact replay, or historical
retrieval. Issuer metadata, key history, revocation evidence, and other Trust-
resource disclosure MUST instead follow REQ-LIFE-0006 and the applicable H-11/
H-12 public or protected classification. Separately, already-retained immutable
proof evidence MAY undergo offline historical verification under REQ-LIFE-0006
and REQ-LIFE-0027 without current Connection authority or live authentication.
Terminal and historical records MUST remain non-authorizing and immutable in
semantic meaning. Later owning chapters and assets MUST preserve these
durability and post-terminal boundaries while defining the complete object
inventory, privacy controls, and retention rules.

**Sources:** H-01, H-06, H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-003, GB-014, GB-015, GB-016.
