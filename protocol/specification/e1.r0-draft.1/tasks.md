# Tasks

This chapter defines durable Task acceptance, lifecycle, attempts, progress,
cancellation, deadlines, terminal Result coupling, Task-side Receipt coupling,
polling, retrieval, retention, and recovery for `ghostbridge/e1.r0-draft.1`.
It does not define wire/schema member names, HTTP mappings, executable state
machines, concrete retention durations, or Receipt proof and key-history
semantics.

## REQ-TASK-0001 - Task birth is the final acceptance commit

**Requirement.** A protocol Task MUST first exist only when the H-07 final
durable Invocation-acceptance commit succeeds. That commit MUST create exactly
one immutable Task identity in `accepted` and, when H-08 Approval is required,
MUST consume the exact Approval in the same indivisible acceptance outcome. No
validation, authentication, authorization, Approval Challenge or pending
Decision, candidate construction, transaction entry, lock, lease, queue
publication attempt, worker allocation, response, audit event, or UI placeholder
MAY create a Task or execution authority.

Install Grant issuance, possession, redemption, retry, or terminal evidence
MUST NOT create a Task or import Install Grant lifecycle, retry, cancellation,
or retention semantics into an accepted Task.

**Applies to.** Invocation acceptance, Task creation, Approval consumption, and
recovery of their shared durable boundary.

**Lifecycle/state impact.** The one successful commit creates the Task directly
in `accepted`; every precommit observation has no Task lifecycle state.

**Semantic failure.** A Task without one provable complete H-07 acceptance
history, or Approval consumption without that same acceptance and Task, MUST be
treated as an integrity violation and MUST fail closed without execution,
repair from current defaults, Approval restoration, or replacement Task.

**Sources:** H-01, H-02, H-06, H-07, H-08, H-09, H-11. **Gaps:** GB-020,
GB-021.

## REQ-TASK-0002 - Immutable acceptance bundle and opaque Task identity

**Requirement.** The accepted Task MUST retain or immutably bind, as
applicable, its receiver-generated opaque Task identity; exact Invocation
identity; exact Invocation/idempotency identity; Connection identity and
accepted authority bundle; exact protocol release and selected profiles; exact
organization and tagged workspace state/value; capability key/version;
accepted action identity; immutable execution deadline; fixed cancellation and
recognized-stop policy; selected Receipt policy; Approval-consumption evidence
when applicable; acceptance sequence/version/fence; and every historical
semantic reference required to interpret those facts. The Task identity MUST
remain stable across caller retries, attempts, internal retries, cancellation,
restart, recovery, terminalization, and Receipt materialization.

The acceptance transaction MUST bind the complete `gb.task.acceptance.v1`
semantic commitment defined by REQ-TASK-0024 to that same Task and acceptance
history.

Task ID possession MUST NOT authenticate a caller, authorize access or
execution, reveal tenant scope, or establish Result or Receipt access. Task ID
MUST remain distinct from Invocation, attempt, Result, Receipt, response, and
audit identities.

**Applies to.** The accepted Task semantic object and every operation that
stores, addresses, executes, reads, or recovers it.

**Lifecycle/state impact.** The bundle is fixed at `accepted` and survives
every later lifecycle state without widening or identity replacement.

**Semantic failure.** Collision, conflicting content for one identity, identity
substitution, missing required binding, or inability to prove one acceptance
history MUST quarantine the Task and MUST NOT authorize execution, disclosure,
or creation of another Task.

**Sources:** H-02, H-03, H-04, H-07, H-08, H-09, H-10, H-11, H-13.
**Gaps:** GB-020, GB-021, GB-023.

## REQ-TASK-0003 - Pre-Task rejection and exact accepted retry

**Requirement.** `rejected` MUST be a pre-Task admission outcome. A definitely
rejected admission MUST create no Task, Result, accepted-work Execution Receipt,
or execution/effect authority.

When an exact retry of an already accepted Invocation proves the original exact
Invocation/idempotency identity, exact authority- and effect-critical equality,
current caller authentication, exact tenant/scope relationship, current
disclosure authorization to learn the outcome, and a complete and internally
consistent durable accepted Task/idempotency linkage, the retry MUST converge
on and return or reference the same existing Task at its current authoritative
state. It MUST NOT create another Task, repeat Approval consumption, restart
execution, create a new attempt merely because the caller retried, or
reinterpret the accepted outcome as a new admission. H-12/D1-07 retains
ownership of the public success, replay, and error representation.

A conflicting retry MUST NOT mutate or disclose the accepted outcome.

**Applies to.** Definite admission rejection, exact and conflicting Invocation
retry, lost acceptance responses, and idempotency recovery.

**Lifecycle/state impact.** Rejection has no Task state; an accepted exact retry
observes the existing Task at its authoritative current state without a
transition.

**Semantic failure.** An ambiguous acceptance outcome MUST enter fail-closed
recovery rather than be called rejected. If exact equality, current
authentication, complete linkage, exact scope, current disclosure authorization,
or integrity cannot be proven, the retry MUST fail closed, MUST NOT create or
restart work, and MUST NOT reveal protected Task facts.

**Sources:** H-05, H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-020, GB-021.

## REQ-TASK-0004 - Closed Task lifecycle and terminality

**Requirement.** The complete protocol-visible Task lifecycle state inventory
MUST be exactly:

| Class       | States                                          |
| ----------- | ----------------------------------------------- |
| Nonterminal | `accepted`, `queued`, `running`                 |
| Terminal    | `completed`, `failed`, `cancelled`, `timed_out` |

No other protocol-visible Task lifecycle state MAY exist. Every terminal state
MUST have no exit and MUST remain the same terminal state on every later retry,
poll, retrieval, restart, recovery, Connection event, Receipt event, or policy
change.

**Applies to.** Task lifecycle storage, projections, transitions, recovery, and
all protocol-visible Task representations.

**Lifecycle/state impact.** This requirement closes the state inventory and
terminal set; it does not itself perform a transition.

**Semantic failure.** An unknown, hidden, reopened, or additional lifecycle
state, or conflicting terminal facts, MUST be rejected or quarantined and MUST
NOT be mapped to a convenient valid state.

**Sources:** H-03, H-09, H-11, H-13. **Gaps:** GB-021.

## REQ-TASK-0005 - Exact legal lifecycle transitions

**Requirement.** Legal lifecycle edges MUST be exactly the rows below. Each
state-changing operation MUST use the authoritative current Task version/fence
and the stated trigger and guards; its durable effect MUST preserve the
immutable acceptance bundle.

| Edge                    | Trigger and actor                                                  | Required guards                                                                                                                 | Durable effect                                                                                                 |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `accepted -> queued`    | Agent/task authority records eligible or awaiting dispatch intent  | Current version; no cancellation/stop, timeout, or terminal winner                                                              | Store `queued`, advanced version, and durable dispatch intent                                                  |
| `accepted -> running`   | Fenced executor directly starts                                    | Current Task and attempt fence; deadline, cancellation/stop, accepted restrictions, and effect checkpoint pass                  | Store `running` and distinct attempt/start/fence evidence                                                      |
| `accepted -> failed`    | Accepted work cannot start and no safe retry remains               | Current version; attempts fenced; zero-effect fact proven; no other terminal winner                                             | Atomically store `failed` and its one terminal Result bundle                                                   |
| `accepted -> cancelled` | Committed supported cancellation/recognized stop wins              | Current version; no terminal winner; attempts and effects fenced; zero-effect fact proven                                       | Atomically store `cancelled`, intent/order evidence, and Result                                                |
| `accepted -> timed_out` | Authoritative deadline wins                                        | No earlier terminal commit; current version; attempts fenced; zero-effect fact proven                                           | Atomically store `timed_out`, order evidence, and Result                                                       |
| `queued -> running`     | Fenced executor claims queued work                                 | Current Task/dispatch version and attempt fence; deadline, cancellation/stop, accepted restrictions, and effect checkpoint pass | Store `running` and distinct attempt/start/fence evidence                                                      |
| `queued -> failed`      | Queued work cannot execute and no safe retry remains               | Current version; claims fenced; zero-effect fact proven; no other terminal winner                                               | Atomically store `failed` and Result                                                                           |
| `queued -> cancelled`   | Committed supported cancellation/recognized stop wins              | Current version; claims/effects fenced; zero-effect fact proven; no terminal winner                                             | Atomically store `cancelled`, intent/order evidence, and Result                                                |
| `queued -> timed_out`   | Authoritative deadline wins                                        | No earlier terminal commit; claims/effects fenced; zero-effect fact proven                                                      | Atomically store `timed_out`, order evidence, and Result                                                       |
| `running -> queued`     | Current attempt ends with one durably selected safe internal retry | Prior attempt fenced; no terminal/cancellation/timeout winner; selected action/profile and proven effect history permit retry   | Store `queued`, bounded prior-attempt/effect evidence, advanced fence, and dispatch intent under the same Task |
| `running -> completed`  | Execution contract and intended effect set are proven successful   | Current attempt/fence; output contract; no earlier terminal/cancellation/timeout winner; effects reconciled                     | Atomically store `completed` and one Result                                                                    |
| `running -> failed`     | Non-timeout, non-cancellation failure wins with no safe retry      | Current attempt/fence; effects reconciled; no earlier terminal winner                                                           | Atomically store `failed` and one Result                                                                       |
| `running -> cancelled`  | Committed supported cancellation/recognized stop wins              | Current fence; remaining effects blocked; begun effects reconciled; no earlier terminal winner                                  | Atomically store `cancelled`, intent/order/effect evidence, and one Result                                     |
| `running -> timed_out`  | Authoritative deadline wins                                        | No earlier terminal commit; current/stale attempts and later effects fenced; begun effects reconciled                           | Atomically store `timed_out`, order/effect evidence, and one Result                                            |

All other edges MUST be illegal. In particular, `running -> queued` MUST NOT be
Task recreation, terminal rollback, caller replay, or Approval reuse.

**Applies to.** Every Task lifecycle transition, including dispatch, direct
start, retry, cancellation, timeout, failure, and completion.

**Lifecycle/state impact.** Only the fourteen listed edges MAY change the Task
lifecycle state; terminal edges also invoke the indivisible terminal
Task/Result outcome.

**Semantic failure.** A failed guard, stale version, unlisted edge, or partial
terminal bundle MUST perform no transition and MUST fail closed or enter
indeterminate recovery without inventing a state or Result.

**Sources:** H-01, H-02, H-07, H-08, H-09, H-11. **Gaps:** GB-020, GB-021.

## REQ-TASK-0006 - Non-lifecycle values remain orthogonal

**Requirement.** The following values MUST retain exactly these dispositions:

| Value                    | Disposition                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `waiting_for_approval`   | Pre-Task, non-authoritative workflow/UI state                                                     |
| `waiting_for_dependency` | Safe progress category beneath `queued` or `running`; no automatic deadline pause                 |
| `recovery_required`      | Orthogonal fail-closed integrity/recovery condition over the last proven lifecycle state          |
| `compensation_required`  | Result/effect/recovery fact                                                                       |
| `compensated`            | Linked evidence about separately authorized follow-up work; original Task/Result unchanged        |
| `revoked`                | Non-lifecycle authority-withdrawal evidence or recognized stop source only under pre-bound policy |
| `rejected`               | Pre-Task admission outcome                                                                        |
| `partially_completed`    | Result/effect evidence fact, never a Task state                                                   |

None of these values MAY be introduced as another Task state or used to grant
authority. Historical `ghostbridge/0.1-draft` labels MUST NOT be silently
mapped to the current dispositions without complete H-03/H-09 evidence.

**Applies to.** Workflow, progress, recovery, effect, compensation, revocation,
rejection, legacy classification, and lifecycle projection.

**Lifecycle/state impact.** These values cause no lifecycle transition by
themselves and cannot reopen, pause, or terminalize a Task.

**Semantic failure.** An unproven historical mapping or use of an orthogonal
value as lifecycle authority MUST be preserved as unsupported, ambiguous, or
quarantined and MUST NOT authorize execution or terminal invention.

**Sources:** H-03, H-09, H-11, H-13. **Gaps:** GB-020, GB-021, GB-024.

## REQ-TASK-0007 - Task version, attempt identity, and fencing

**Requirement.** Task lifecycle truth MUST be protected by a monotonic
authoritative Task version/fence or a proven equivalent serialized authority.
Every execution attempt MUST have a distinct subordinate attempt identity, a
sequence/order identity, the current fence, and a durable relationship to the
immutable Task. Attempt identity MUST NOT be Task identity.

A stale or losing attempt MUST NOT mutate lifecycle state, update authoritative
progress, begin another external effect, terminalize, create or replace Result,
or alter Receipt semantic truth. Locks, queue handles, process IDs, lease IDs,
threads, workers, and scheduler records MUST remain implementation mechanics
and MUST NOT grant protocol authority; a process-local mutex alone MUST NOT
establish distributed correctness.

**Applies to.** Task writers, attempts, workers, schedulers, progress updates,
effects, and terminal writers.

**Lifecycle/state impact.** Only the current fenced authority MAY perform a
legal transition or authoritative subordinate update.

**Semantic failure.** A missing, stale, duplicate, or conflicting fence or
attempt identity MUST reject the write and MUST NOT be repaired by worker,
lease, process, or arrival-time preference.

**Sources:** H-02, H-09, H-11. **Gaps:** GB-021.

## REQ-TASK-0008 - Queue, delivery, and start semantics

**Requirement.** `accepted -> queued` MUST mean only that durable dispatch
intent is eligible or awaiting execution. Queue publication, delivery,
acknowledgement, lease acquisition, or worker presence MUST NOT prove Task
acceptance, `running`, execution authority, or effect occurrence. A Task MAY
start directly from `accepted` or from `queued` only after the executor proves
the current Task version/fence, distinct attempt identity, cancellation/stop
state, execution deadline, applicable effect checkpoint, and accepted bundle
restrictions.

Duplicate delivery MUST converge under the same Task and fencing model. Lease
loss alone MUST NOT mean failure, cancellation, timeout, or retry safety.

**Applies to.** Dispatch intent, queue publication/delivery, worker claim,
direct start, queued start, duplicate delivery, and lease loss.

**Lifecycle/state impact.** Only the durable guarded queue/start transitions in
REQ-TASK-0005 change `accepted` or `queued`; mechanics alone change no state.

**Semantic failure.** A stale or duplicate claim, failed checkpoint, or queue
record without accepted Task authority MUST begin no effect and MUST NOT create,
advance, fail, cancel, or time out a Task.

**Sources:** H-02, H-07, H-09, H-11. **Gaps:** GB-020, GB-021.

## REQ-TASK-0009 - Progress is bounded and advisory

**Requirement.** Safe progress MAY exist only as bounded, privacy-safe metadata
under a proven `queued` or `running` state. Progress MUST NOT create authority
or a Task; imply a lifecycle transition, terminality, or effect occurrence;
extend the deadline; alter cancellation policy; authorize retry; or substitute
for Task, Result, or effect-checkpoint truth. A progress update MUST carry or
be protected by the current Task version/fence, and stale progress MUST lose to
authoritative state/version.

**Applies to.** Progress production, storage, projection, polling, caching, and
recovery, including `waiting_for_dependency`.

**Lifecycle/state impact.** Progress causes no lifecycle transition and remains
subordinate to the current nonterminal state.

**Semantic failure.** Unbounded, unsafe, stale, terminal-claiming, or
authority-bearing progress MUST be rejected or omitted without mutating the
Task or disclosing protected execution detail.

**Sources:** H-09, H-12. **Gaps:** GB-021, GB-022.

## REQ-TASK-0010 - External-effect checkpoints and indeterminate outcomes

**Requirement.** Every external effect MUST require current fenced execution
authority. Before each later external effect, the valid executor MUST observe,
as applicable, current Task state/version/fence, attempt identity, committed
cancellation intent, mandatory authority-withdrawal stop intent, immutable
execution deadline, prior effect checkpoint/evidence, and selected
action/profile retry restrictions. Once cancellation or timeout wins, no later
effect MAY begin. An already begun or committed effect MUST NOT be represented
as undone.

An unknown remote-effect outcome MUST NOT be treated as zero effects. If effect
status cannot be proven safely, the Task MUST remain at its last proven
nonterminal state with an orthogonal indeterminate/fail-closed recovery
condition; no blind effect retry or guessed terminal Result MAY occur.

**Applies to.** External-effect initiation, multi-effect execution,
cancellation/timeout checkpoints, effect reconciliation, and crash recovery.

**Lifecycle/state impact.** A checkpoint MAY permit remaining work but creates
no transition by itself; unresolved effect truth prevents terminalization.

**Semantic failure.** Missing/stale authority, a won stop/deadline, or ambiguous
effect evidence MUST block the effect and, when unresolved, MUST preserve the
last proven state without a favorable effect or terminal claim.

**Sources:** H-02, H-07, H-09, H-11. **Gaps:** GB-021.

## REQ-TASK-0011 - Internal execution retry remains one Task

**Requirement.** Internal execution retry MUST occur beneath the same immutable
Task using a new attempt identity and fence. It MUST NOT re-admit the
Invocation, create another Task, restore or reconsume Approval, reset or extend
the deadline, erase prior attempt/effect evidence, or blindly retry an
indeterminate effect. Retry MAY occur only when the selected accepted
action/profile permits it, the prior attempt is fenced, no terminal,
cancellation, or timeout winner exists, and effect history proves retry safety.
The prior attempt MUST be proven unable to produce another effect. Attempt
failure MUST NOT automatically mean Task failure.

**Applies to.** `running -> queued`, subsequent start, worker loss, safe effect-
free recovery, and any implementation-level execution retry.

**Lifecycle/state impact.** A safe retry uses only `running -> queued -> running`
under REQ-TASK-0005; a terminal Task never returns to `queued` or `running`.

**Semantic failure.** If any retry guard or effect proof is missing, retry MUST
NOT be scheduled or started; the Task MUST remain at its proven state, fail
through a separately valid terminal edge, or enter fail-closed recovery.

**Sources:** H-07, H-08, H-09, H-11. **Gaps:** GB-020, GB-021.

## REQ-TASK-0012 - Cancellation support is fixed at acceptance

**Requirement.** Cancellation support and every recognized requester/source
policy MUST be fixed by the accepted Task bundle. Current deployment defaults,
new policy, Connection replacement, or implementation capability MUST NOT
silently add support to an existing Task. An unsupported cancellation request
MUST create no cancellation intent, change no Task state, and alter no execution
policy.

Cancellation MUST remain distinct from transport abort, socket close, process
shutdown, polling cancellation, queue acknowledgement, lease expiration,
authentication failure, and client timeout; none of those events MAY be treated
as a cancellation request or success.

**Applies to.** Cancellation capability discovery, request handling, executor
behavior, transport loss, and post-acceptance policy change.

**Lifecycle/state impact.** Unsupported or non-semantic events cause no Task
transition or intent; supported requests proceed only under later cancellation
requirements.

**Semantic failure.** Unsupported, inferred, or retroactively added support
MUST fail without storing intent, fencing work, or disclosing protected Task
facts.

**Sources:** H-03, H-09, H-12. **Gaps:** GB-021, GB-022.

## REQ-TASK-0013 - Authorized convergent cancellation intent

**Requirement.** A cancellation operation MUST target one exact Task and its
inherited scope and MUST require current authentication plus exact purpose- and
scope-bound authorization under the accepted profile. A recognized
authority-withdrawal source MUST be verified under its own accepted H-11/H-09
source rules and MUST NOT be treated as an ordinary Host requester.

When a supported request is durably accepted, exactly one convergent
cancellation intent MUST be retained with, as applicable, Task identity,
authenticated requester or recognized source, purpose, safe reason category,
ordering time, and sequence/version/fence evidence. Intent acceptance MUST NOT
promise terminal `cancelled`. Exact cancellation retries MUST converge on the
same intent/current outcome after fresh authentication, equality, scope, and
disclosure checks. A conflicting requester, source, reason, purpose, or scope
MUST NOT mutate the valid intent or leak protected facts.

**Applies to.** Requester cancellation, recognized stop requests, duplicate and
conflicting retries, intent persistence, and cancellation acknowledgement.

**Lifecycle/state impact.** Intent commitment is orthogonal to lifecycle until
it wins the required serialization/checkpoint; it does not itself assert
terminal success.

**Semantic failure.** Unknown, unauthorized, wrong-scope, unsupported,
conflicting, stale, or indeterminate requests MUST cause no mutation or
execution-policy change and MUST follow the H-12 disclosure boundary.

**Sources:** H-02, H-05, H-07, H-09, H-11, H-12. **Gaps:** GB-021, GB-022.

## REQ-TASK-0014 - Cancellation checkpoint guarantee and effect truth

**Requirement.** Every current or later valid executor MUST observe a committed
cancellation intent at the next required cancellation checkpoint and before
each later external-effect checkpoint. When cancellation wins, current and
stale attempts MUST be fenced, no later effect MAY begin, and every already
begun effect MUST be reconciled before terminalization. The Task MAY become
`cancelled` only when the Result can state the proven zero or partial effect
classification.

Cancellation MUST NOT guarantee that no effect occurred, that an in-flight
remote operation was reversed, that an earlier terminal commit is undone, or
that Approval is restored.

**Applies to.** Running and future executors, effect checkpoints, cancellation
processing, partial effects, and terminal cancellation.

**Lifecycle/state impact.** A winning intent permits only the applicable
nonterminal-to-`cancelled` edge after fencing and effect reconciliation; unknown
effect status leaves the last proven nonterminal state indeterminate.

**Semantic failure.** Failure to fence attempts or prove effect status MUST
block terminal `cancelled`, later effects, and blind retry; it MUST NOT be
reported as zero-effect cancellation.

**Sources:** H-07, H-08, H-09, H-11. **Gaps:** GB-021, GB-023.

## REQ-TASK-0015 - Cancellation and terminal races have one winner

**Requirement.** Cancellation before queue, while queued, versus running start,
before an effect, after a partial effect, versus completion, failure, or timeout,
duplicate exact cancellation, conflicting cancellation, crash after intent, and
authority-withdrawal stop versus requester cancellation MUST each be ordered by
one authoritative serialization/checkpoint winner.

If a valid terminal commit wins first, the Task MUST retain that terminal state
and Result and later cancellation MUST cause no rewrite. If cancellation wins,
remaining effects MUST be fenced and the Task MUST terminalize `cancelled` only
after safe effect classification. In a start/cancel race, the first valid start
or cancellation checkpoint controls; a start winner remains subject to every
later cancellation/effect checkpoint. In a cancellation/timeout race, the first
authoritative winner checkpoint fixes the safe category and the unique terminal
commit binds it. Duplicate exact cancellation MUST converge; a conflicting or
unauthorized request MUST have no winner and no mutation.

**Applies to.** Every cancellation/start/effect/terminal race, duplicate
request, conflicting request, crash, restart, and recognized stop source.

**Lifecycle/state impact.** Only the winning guarded edge in REQ-TASK-0005 MAY
transition the Task; losing operations reread the authoritative state and cause
no later transition.

**Semantic failure.** If the winner cannot be proven, the Task MUST remain at
its last proven state under fail-closed recovery; implementations MUST NOT pick
by response arrival, client time, worker preference, or guessed effect outcome.

**Sources:** H-01, H-09, H-11, H-12. **Gaps:** GB-021.

## REQ-TASK-0016 - Later Connection events preserve accepted history

**Requirement.** Later Connection suspension, expiry, closure, revocation, or
replacement MUST NOT erase the accepted Task, restore Approval, rewrite prior
effects, or automatically change the Task to another lifecycle state. Remaining
work MAY be affected only when the exact release/profile accepted for that Task
pre-bound the event and source as an authoritative stop trigger. A valid trigger
MUST enter the cancellation/stop ordering model with the safe
`authority_withdrawal` category; current defaults or unrelated policy changes
MUST NOT add a trigger retroactively.

If required current stop-trigger evidence cannot be validated before another
effect checkpoint, no new effect MAY begin. That condition MUST remain
fail-closed recovery and MUST NOT be treated as automatic proof of revocation.
H-11 retains ownership of source authority, freshness, effective time,
anti-rollback, and historical verification.

**Applies to.** Accepted Tasks observed after Connection suspension,
terminality, revocation, replacement, or stop-source evidence change.

**Lifecycle/state impact.** A Connection event alone causes no Task transition;
only a valid pre-bound trigger can compete for a cancellation-class winner.

**Semantic failure.** Missing, stale, rolled-back, unrecognized, or
retroactively configured trigger evidence MUST block later effects when its
validation is required but MUST NOT rewrite acceptance, effects, or lifecycle.

**Sources:** H-03, H-07, H-09, H-11. **Gaps:** GB-021, GB-023, GB-024.

## REQ-TASK-0017 - Execution deadline is immutable and distinct

**Requirement.** The accepted Task execution deadline MUST remain immutable and
distinct from the Invocation admission deadline, Approval expiry,
authentication/proof validity, Connection expiry, cancellation timing, Result
retention, Receipt verification horizon, and transport timeout. The
authoritative storage/checkpoint clock MUST control execution-deadline ordering;
request arrival, client time, worker-local cached time, response time, and poll
time MUST NOT control it.

No poll, restart, retry, queue or worker delay, signer delay, suspension,
outage, transport event, or current default MAY reset or extend the deadline.
Any future extension mechanism MUST have been explicitly selected and pre-bound
with separately defined authority and semantics; otherwise more time requires
separately authorized new work and MUST NOT mutate the existing Task. This
chapter defines no numeric skew or extension mechanism.

**Applies to.** Task acceptance, scheduling, attempts, checkpoints, retry,
restart, polling, cancellation, Receipt processing, and recovery.

**Lifecycle/state impact.** The deadline is fixed in `accepted` and carried
unchanged through every later state; it gates starts, effects, and terminal
ordering without itself changing state before the boundary wins.

**Semantic failure.** Missing or ambiguous authoritative time/deadline evidence
MUST block new effects and MUST NOT be replaced by another clock, inferred
grace, or updated deadline.

**Sources:** H-03, H-07, H-09, H-10, H-11, H-12. **Gaps:** GB-021, GB-024.

## REQ-TASK-0018 - Deadline equality and safe timeout terminalization

**Requirement.** A valid terminal Task/Result commit serialized strictly before
the execution deadline MUST win. At authoritative time `now >= execution
deadline`, timeout MUST win unless such an earlier terminal commit exists.
Before terminal `timed_out` commits, every current and stale attempt MUST be
fenced, no later effect MAY begin, and begun effects MUST be reconciled so the
Result can prove `zero` or `partial`. Timeout before execution/effect MUST
produce a zero-effect timeout; timeout after proven partial effects MAY produce
`timed_out` with partial effects.

Transport timeout, socket abort, client timeout, or signer delay MUST NOT
substitute for Task timeout. If effect truth cannot be proven, the Task MUST
remain at its last proven nonterminal state under indeterminate recovery rather
than terminalize.

**Applies to.** Deadline checkpoints, start/effect boundaries, terminal races,
restart, and timeout Result construction.

**Lifecycle/state impact.** Timeout MAY use only `accepted`, `queued`, or
`running` to `timed_out` under REQ-TASK-0005; equality belongs to timeout absent
an earlier valid terminal commit.

**Semantic failure.** Late completion, guessed zero effects, local-clock
timeout, or timeout terminalization with an unfenced attempt MUST be rejected
and MUST NOT overwrite an earlier winner.

**Sources:** H-01, H-07, H-09, H-11, H-12. **Gaps:** GB-021, GB-023.

## REQ-TASK-0019 - Unique terminal compare-and-commit winner

**Requirement.** Every terminal Task transition MUST use one unique serialized
compare-and-commit or proven equivalent over the current Task version/fence and
the complete terminal Task/Result bundle. Completion versus cancellation,
failure versus cancellation, timeout versus completion/failure/cancellation,
duplicate or stale terminal workers, crashes before or after commit, and split-
brain terminal attempts MUST resolve to at most one provable terminal winner.
Every later retry, reader, cache, worker, and recovery process MUST observe that
same winner.

**Applies to.** All four terminal states, terminal writers, duplicate/stale
attempts, crash recovery, projections, and readers.

**Lifecycle/state impact.** The unique winner performs one nonterminal-to-
terminal edge; every terminal state has no exit and every loser causes no
transition.

**Semantic failure.** A partial, duplicate, conflicting, rolled-back, or
unprovable terminal outcome MUST be quarantined as indeterminate and MUST NOT be
merged, guessed, timestamp-selected, or retried into execution.

**Sources:** H-01, H-09, H-11. **Gaps:** GB-021, GB-023.

## REQ-TASK-0020 - One separately identified immutable Result

**Requirement.** Each accepted Task MUST have exactly one logical, separately
identified, immutable terminal Result. Result identity MUST remain distinct
from Task, Invocation, Receipt, response, and audit identities. A Result MAY be
transported embedded with Task, through a separate resource, or as a safe
projection, but those representations MUST NOT create another semantic Result
or another source of terminal truth.

Task lifecycle state MUST be authoritative for Task state. Result MUST be
authoritative for terminal semantic outcome, output, failure category, effect
classification, and terminal evidence. Result possession MUST NOT grant
authority or disclosure.

**Applies to.** Terminal Result creation, storage, embedding, referencing,
projection, retrieval, and recovery.

**Lifecycle/state impact.** Result first exists only in the one terminal
Task/Result commit and remains immutable after terminalization.

**Semantic failure.** Multiple Results, Result substitution, identity
collision, a Result without its matching terminal Task, or competing lifecycle
truth MUST fail closed and MUST NOT select or synthesize a winner.

**Sources:** H-02, H-03, H-09, H-10, H-11, H-12. **Gaps:** GB-021, GB-023.

## REQ-TASK-0021 - Complete Result semantic inventory

**Requirement.** The one Result MUST bind directly or through immutable,
historically resolvable references, as applicable: Result identity; Task and
Invocation identities; terminal Task outcome; output-contract identity; safe
output/result classification; permitted output content or one immutable output
reference; output semantic commitment; effect occurrence classification;
bounded effect summary and evidence/commitment; safe terminal reason category;
bounded attempt count and attempt/effect-checkpoint summary;
cancellation/timeout/authority-withdrawal winner category; terminal
serialization time; monotonic Task version/fence; exact release, selected
profiles, capability/version, and output-contract context; immutable
Connection, scope, authorization, and Approval references required for
historical interpretation; selected Receipt policy; and downstream Receipt
semantic identity/reference or an explicit no-Receipt marker.

Reusable credentials, bearer material, and private keys MUST NOT appear in a
Result. H-10 owns exact canonical bytes, and H-12 owns the public disclosure
shape; this requirement MUST NOT be interpreted as D2 wire member names.

**Applies to.** Result semantic construction, terminal commitment, storage,
retrieval, minimization, Receipt input, and historical interpretation.

**Lifecycle/state impact.** The complete applicable inventory is fixed in the
terminal transaction and does not change afterward.

**Semantic failure.** A missing, mutable, mismatched, unsafe, or historically
unresolvable required semantic MUST prevent a clean terminal claim or make the
evidence indeterminate; it MUST NOT be reconstructed from current defaults.

**Sources:** H-03, H-07, H-08, H-09, H-10, H-11, H-12, H-14.
**Gaps:** GB-021, GB-023, GB-024.

## REQ-TASK-0022 - Result effect classification preserves reality

**Requirement.** Result effect occurrence MUST distinguish exactly `zero`,
`partial`, and `complete` as Result/evidence facts, not Task states.

- For `completed`, effect-free/read work MAY be `zero`; intended effectful
  success MUST be `complete`; partial effect alone MUST NOT justify completion.
- For `failed`, the effect fact MUST be `zero` or `partial` unless the complete
  intended external effect is explicitly proven and the execution contract
  failed afterward. Only in that exact post-effect-failure case, `complete` MUST
  be retained as the effect fact. The Task MUST remain `failed`, and its safe
  reason and effect evidence MUST preserve that it is a post-effect execution-
  contract failure. `complete` MUST NOT be used for an ordinary failure merely
  because an implementation documents another reason, and complete effect
  evidence MUST NOT relabel the Task `completed`.
- For `cancelled` and `timed_out`, the effect fact MUST be `zero` or `partial`,
  and no complete-success output MAY be invented.

Effects already begun or committed MUST remain visible, and partial completion
MUST NOT create a `partially_completed` Task state.

**Applies to.** Effect evidence, all terminal Result categories, cancellation,
timeout, failure after effect, content minimization, and compensation decisions.

**Lifecycle/state impact.** Effect classification constrains which terminal
edge MAY commit but is never a lifecycle state or independent transition.

**Semantic failure.** Unknown effect status MUST prevent terminalization;
concealed, downgraded, or inconsistent effect facts MUST invalidate the
terminal candidate without authorizing retry or compensation.

**Sources:** H-03, H-09, H-11, H-14. **Gaps:** GB-021, GB-023, GB-024.

## REQ-TASK-0023 - Terminal Task and Result commit atomically

**Requirement.** A terminal commit MUST atomically and durably store or bind
one indivisible semantic outcome containing, as applicable: final Task state;
monotonic Task version/fence; terminal serialization time; safe reason/winner
category; immutable Result identity; complete `gb.result.semantic.v1`
commitment; permitted Result content/reference; effect classification and
bounded effect commitment; bounded attempt/checkpoint summary;
cancellation/timeout/withdrawal ordering evidence; selected Receipt policy;
one canonical Receipt semantic identity and issuance intent when selected or an
explicit no-Receipt marker; and the immutable Receipt-generation input
snapshot; exact linkage among the accepted Task, original Invocation, and exact
idempotency identity or accepted `gb.invocation.intent.v1` commitment; and the
applicable durable audit-intent reference associated with the committed semantic
outcome.

The terminal linkage MUST preserve the original H-07/D1-03 acceptance and MUST
NOT create a new idempotency identity or reinterpret the accepted Task,
Invocation, or idempotency outcome as new admission. The durable audit-intent
reference MUST identify the applicable audit intent, but final audit-event
delivery or materialization MUST NOT be required in the terminal transaction
unless another accepted requirement separately requires it.

Task terminal state MUST NOT commit cleanly without the Result commitment, and
Result MUST NOT commit as a competing terminal truth without the terminal Task
outcome. The semantic outcome MUST remain indivisible even if physical records
differ. An audit event, response, or Receipt MUST NOT substitute for this
transaction. Audit intent, event delivery, log writes, and observability systems
MUST NOT become sources of terminal truth. D1-07/H-12 retains ownership of audit
event schemas and names, transport fields, logging backends, public HTTP and
redaction behavior, observability cardinality, and final materialization
details; this requirement MUST NOT impose a durability architecture.

**Applies to.** Every terminal transition, storage adapter, transaction,
projection, crash boundary, and terminal recovery.

**Lifecycle/state impact.** Exactly one terminal edge and exactly one Result
become durable together; neither MAY precede or outlive the other's semantic
truth.

**Semantic failure.** A crash or partial write that prevents proof of the
complete outcome MUST remain indeterminate and MUST NOT be repaired by guessed
state, output, effect facts, Result, or Receipt.

**Sources:** H-01, H-03, H-09, H-10, H-11. **Gaps:** GB-021, GB-023, GB-025.

## REQ-TASK-0024 - Accepted H-10 Task and Result commitments

**Requirement.** Task/Result semantic commitments MUST use only the accepted
H-10 canonicalization and digest profiles `gb-c14n-jcs-ijson-v1` and
`gb-digest-jcs-sha256-v1` with their exact case-sensitive profile identities,
framing, failure rules, and applicable semantic envelope.

Every one of these Task/Result/output digest envelopes MUST contain the exact
immutable protocol release and registered purpose plus the exact required
audience, target, organization, and tagged workspace state/value; required
context MUST be present and forbidden context MUST be absent. The
Task-acceptance projection under `gb.task.acceptance.v1` MUST contain the
complete immutable acceptance semantics in REQ-TASK-0002, including exact
presence states and all applicable selected authority-critical extensions. The
terminal Result projection under `gb.result.semantic.v1` MUST contain the
complete immutable terminal semantics in REQ-TASK-0021 through REQ-TASK-0023.
The output projection under `gb.result.output.v1` MUST commit the exact retained
or referenced output semantics, output-contract identity, presence state, and
applicable protected extensions without importing unrestricted private data.
The Invocation/idempotency linkage MUST remain the accepted
`gb.invocation.intent.v1` semantic identity; the Task commitment MUST bind it
without redefining it.

No algorithm, domain, profile, encoding, semantic projection, equality, or
historical meaning MAY be inferred from hash length, an implementation helper,
current code/defaults, object shape, legacy Receipt values, or trial
verification. This chapter defines semantic projections, not final D2 schema
member names, and MUST NOT create another H-10 domain or profile.

**Applies to.** Task acceptance commitments, Result and output commitments,
idempotency linkage, terminal transaction, verification, and history.

**Lifecycle/state impact.** A valid commitment protects existing acceptance or
terminal truth but creates no authority or transition by itself.

**Semantic failure.** Noncanonical, missing, extra where forbidden, mismatched,
unknown, substituted, downgraded, legacy-only, or unregistered commitment
semantics MUST fail closed without fallback, Task creation, transition, Result
substitution, or protected disclosure.

**Sources:** H-03, H-07, H-09, H-10, H-13. **Gaps:** GB-020, GB-023, GB-025.

## REQ-TASK-0025 - Task-side terminal Receipt coupling

**Requirement.** Receipt selection policy MUST be fixed at Task acceptance. At
terminal Task/Result commit, a selected Receipt MUST cause the terminal bundle
to bind one canonical semantic Receipt identity, issuance/materialization
intent, and immutable Receipt-input snapshot sufficient to reproduce the same
semantic Receipt. When no Receipt is selected, the terminal bundle MUST bind an
explicit semantic no-Receipt marker.

Final signed or proved Receipt bytes MUST NOT be required to exist in the
terminal transaction.
Receipt MUST remain downstream evidence and MUST NOT create Task acceptance or
terminality, change Result truth, restore Approval, authorize execution or
retrieval, or trigger external-effect retry.

**Applies to.** Accepted Receipt policy, every terminal Task/Result outcome,
Receipt identity/intent creation, and no-Receipt disposition.

**Lifecycle/state impact.** The terminal transaction fixes Receipt intent or
the marker without adding a Task state; later Receipt activity cannot transition
the terminal Task.

**Semantic failure.** Missing selected intent/snapshot, missing no-Receipt
marker, conflicting Receipt identity, or Receipt used as terminal authority MUST
invalidate or quarantine the coupling while leaving provable Task/Result truth
unchanged.

**Sources:** H-02, H-03, H-09, H-10, H-11. **Gaps:** GB-021, GB-023, GB-025.

## REQ-TASK-0026 - Receipt materialization is idempotent evidence work

**Requirement.** When Receipt is selected, later materialization, signing, and
delivery MUST derive only from the immutable terminal snapshot and MUST
converge on the same semantic Receipt identity. A crash, signer or key-service
outage, proof failure, delivery failure, acknowledgement loss, or mismatch MUST
NOT change Task state or Result; rerun Task or an effect; create another Result;
or restore Approval. Receipt/Result mismatch MUST be invalid or indeterminate
evidence, while the matching terminal Task/Result outcome remains authoritative.

This chapter MUST NOT specify Receipt signing, signer/key lifecycle, proof
verification, cryptographic historical classification, key rotation,
revocation history, or proof-material availability horizon. Those semantics
remain D1-06 under H-10/H-11.

**Applies to.** Postcommit Receipt status, materialization, proof generation,
delivery/retry, mismatch handling, and the D1-06 boundary.

**Lifecycle/state impact.** Receipt work is read/evidence-side only and causes
no Task or Result transition, including while materialization is pending.

**Semantic failure.** Unavailable, invalid, mismatched, stale, or indeterminate
Receipt evidence MUST remain a Receipt-side condition and MUST NOT select,
repair, or reopen terminal execution truth.

**Sources:** H-03, H-09, H-10, H-11, H-12, H-14. **Gaps:** GB-023, GB-025.

## REQ-TASK-0027 - Polling is an authorized read-only snapshot

**Requirement.** Polling MUST be a currently authenticated, authorized,
read-only observation of an authoritative durable snapshot. It MUST NOT create
or advance work, change Task state/version or deadline, acknowledge execution,
create cancellation intent, create Result or Receipt, change retention, grant
retry permission, or resume Connection authority.

For a nonterminal Task, an authorized snapshot MAY semantically expose Task
identity, current lifecycle state/version, immutable deadline, safe progress,
and cancellation-intent acknowledgement when disclosure permits. It MUST NOT
claim a terminal Result before the complete terminal transaction exists. For a
terminal Task it MUST return only the authorized retained Result/Receipt/tombstone
layer and MUST NOT resume work.

**Applies to.** Task polling, repeated reads, cached projections, nonterminal
and terminal snapshots, and cancellation acknowledgement.

**Lifecycle/state impact.** Polling performs no lifecycle or subordinate
authoritative mutation in any state.

**Semantic failure.** A stale cache MUST lose to durable version/terminal truth;
an unavailable, unauthorized, or inconsistent snapshot MUST NOT be repaired by
advancing the Task or fabricating Result/Receipt facts.

**Sources:** H-02, H-05, H-09, H-11, H-12. **Gaps:** GB-022, GB-023.

## REQ-TASK-0028 - Polling and backoff hints are advisory

**Requirement.** Polling/backoff hints MAY provide a suggested delay category,
safe next-action category, or cache/revalidation category. They MUST NOT change
authority; promise a future state; extend Task deadline, authentication
validity, Connection validity, Result retention, Receipt horizon, or tombstone
horizon; alter cancellation or retry semantics; or create a scheduling
obligation. Polling before or after a hint MUST have identical authority
semantics.

No numeric interval, header, or other H-12 wire expression is defined by this
requirement.

**Applies to.** Poll responses, scheduling advice, backoff, cache/revalidation,
Receipt-pending advice, and support/archive advice.

**Lifecycle/state impact.** Hints cause no Task, Result, Receipt, cancellation,
deadline, or retention transition.

**Semantic failure.** A hint that becomes authority, a deadline/retention
extension, or a promised state MUST be ignored or rejected without mutation;
unsafe hint detail MUST be withheld under H-12.

**Sources:** H-05, H-09, H-12, H-14. **Gaps:** GB-022, GB-024.

## REQ-TASK-0029 - Retrieval requires current exact-scope disclosure authority

**Requirement.** Every Task, Result, Receipt-status, and tombstone retrieval
MUST require current authentication appropriate to the disclosure operation,
exact tenant/scope relationship, purpose-bound authorization, and disclosure
authorization for the requested retained layer. Task, Result, or Receipt ID
possession alone MUST NOT authorize retrieval. Cross-tenant, cross-workspace,
wrong-principal, wrong-Connection, and wrong-purpose access MUST NOT reveal
protected existence, state, content, timing, cancellation support or intent,
retention status, or Receipt status.

H-12/D1-07 MUST define the final public response collapse, timing defenses,
routes, methods, statuses, public errors, details, retry headers, and media
types without changing these state and disclosure effects.

**Applies to.** Live and historical Task/Result reads, Receipt-status reads,
tombstone reads, lookup by opaque identity, and cross-scope attempts.

**Lifecycle/state impact.** Retrieval is read-only and grants no lifecycle,
cancellation, execution, Result, Receipt, or Connection authority.

**Semantic failure.** Missing, invalid, stale, wrong-scope, wrong-purpose, or
indeterminate disclosure authority MUST fail without mutation or protected
existence leakage; final public collapse remains H-12/D1-07 work.

**Sources:** H-02, H-05, H-07, H-09, H-11, H-12. **Gaps:** GB-022, GB-023,
GB-024.

## REQ-TASK-0030 - Connection terminality does not erase historical reads

**Requirement.** Connection suspension or terminality MUST NOT erase already
accepted Task history. Historical Task, Result, or Receipt retrieval MAY remain
available only through the currently applicable authenticated, exact-scope,
purpose-bound disclosure operation. A historical read MUST NOT grant new Task
authority, resume a Connection, cancel terminal work, alter Task or Result, or
move work to a replacement Connection.

Offline historical Receipt proof verification MUST remain distinct from live
retrieval and remains a D1-06/H-11 concern.

**Applies to.** Historical reads after Connection suspension, expiry, closure,
revocation, or replacement and offline proof verification boundaries.

**Lifecycle/state impact.** Connection state MAY change disclosure eligibility
but cannot change the accepted Task or terminal Result lifecycle/history.

**Semantic failure.** An unauthorized historical read MUST reveal no protected
fact; unavailable proof history MUST NOT create present authority or rewrite
the historical Task/Result.

**Sources:** H-02, H-03, H-07, H-09, H-11, H-12. **Gaps:** GB-023, GB-024,
GB-025.

## REQ-TASK-0031 - Result content expiry preserves terminal truth

**Requirement.** Full Result content MAY expire before the minimum terminal
history when the selected Data Contract/profile, privacy policy, and H-14
window permit. Content expiry MUST NOT erase Result identity, terminal Task
state, Task/Result semantic commitment, safe effect classification, replay
prevention, accepted Task identity, historical release/profile interpretation,
or the Receipt semantic relationship required by a surviving dependency.

Expired content MUST NOT be reconstructed from current defaults, a current
provider response, logs, cache, latest schema, current code, or current Platform
state. Retrieval MUST internally distinguish unavailable expired content from
unknown Task, authorization failure, and corrupt history while H-12 controls
safe public collapse.

**Applies to.** Result minimization/expiry, terminal reads, archival support,
tombstone creation, replay handling, and Receipt dependencies.

**Lifecycle/state impact.** Content expiry causes no lifecycle or Result-
semantic transition; the Task remains terminal and the surviving commitment and
effect facts remain immutable.

**Semantic failure.** Premature deletion of required evidence, content
resurrection, or reinterpretation after expiry MUST fail closed and MUST NOT
authorize retry, Task-ID reuse, or a changed Result.

**Sources:** H-03, H-09, H-11, H-12, H-14. **Gaps:** GB-023, GB-024.

## REQ-TASK-0032 - Retention layers follow the greatest dependency horizon

**Requirement.** Implementations MUST keep semantically separate retention
layers for live Task state, full terminal Result material, Receipt semantic and
proof/materialization support, Invocation/idempotency replay evidence,
audit/dispute evidence, effect summary, and the minimum Task/Result tombstone.
Each retained layer MUST survive through the greatest applicable selected
idempotency, replay-prevention, Result-support, Receipt materialization and
verification, historical-release, audit/dispute, and surviving-reference
horizon that depends on that layer.

Live Task truth MUST survive until terminal commit or exact fail-closed recovery
of the accepted history. Receipt materialization and proof layers MAY have
distinct horizons but MUST NOT change terminal semantics when unavailable.
This chapter MUST NOT invent concrete durations; H-14 owns those windows and
service qualifications.

**Applies to.** Storage, minimization, deletion eligibility, support windows,
replay prevention, proof support, audit, and historical references.

**Lifecycle/state impact.** Retention operations do not transition a Task or
Result and cannot delete live truth to escape terminalization or recovery.

**Semantic failure.** A layer MUST NOT expire while a surviving supported
dependency requires it; loss makes the dependent operation unavailable or
indeterminate and MUST NOT become permission, nonexistence, or changed history.

**Sources:** H-03, H-09, H-10, H-11, H-12, H-14. **Gaps:** GB-023, GB-024,
GB-025.

## REQ-TASK-0033 - Minimum terminal tombstone is bounded and secret-free

**Requirement.** After permitted content minimization, enough bounded,
secret-free, immutable evidence MUST remain to prevent replay and preserve
terminal truth. As applicable and as required for historical interpretation,
the minimum tombstone MUST separately retain exact Task identity; exact
Invocation identity; exact idempotency identity or the accepted future H-10-
qualified semantic commitment that preserves that exact idempotency identity
and equality meaning; terminal Task state, serialization time, version/fence,
and winner category; exact selected release; selected profiles;
capability/version; output-contract context where applicable; immutable
Connection identity/context; exact organization; tagged workspace with an
explicit absent state or exact present value; Agent identity; Passport
identity/version or an immutable historical Passport reference; applicable
accepted scope bindings; Result identity and semantic commitment; safe effect
classification; Receipt policy and semantic Receipt identity/commitment when
selected; replay/conflict evidence; provenance/migration classification;
retention class/boundary; and required immutable audit/history references.

This is a semantic retention inventory and MUST NOT make every item a
universally present wire field. Generic unspecified evidence MUST NOT substitute
for exact Invocation identity or the qualified idempotency identity/commitment.

The tombstone MUST NOT retain unnecessary reusable credentials, bearer
material, private keys, unrestricted input/output, prompts, hidden reasoning,
private memory, private policy, stack traces, queue/lease/process identifiers,
or provider payload. Deletion MUST NOT make Task or idempotency identity
reusable while any supported dependency or surviving reference remains.

**Applies to.** Terminal minimization, tombstone storage and retrieval, replay
prevention, privacy deletion, archival support, and final deletion eligibility.

**Lifecycle/state impact.** Tombstoning preserves the same terminal state and
Result semantics as a minimized projection; it never reopens or erases work.

**Semantic failure.** Missing replay/history evidence, retained unnecessary
secret/private material, or premature identity reuse MUST quarantine the
history and MUST NOT be repaired from current data or interpreted as no prior
work.

**Sources:** H-03, H-05, H-09, H-10, H-11, H-12, H-14. **Gaps:** GB-023,
GB-024, GB-025.

## REQ-TASK-0034 - Restart loads durable authoritative Task truth

**Requirement.** Restart MUST load durable authoritative Task truth. Minimum
safe recovery state MUST include the H-07 acceptance bundle, current Task
state/version, original deadline, idempotency binding, cancellation/stop
intent, attempt/fence summary, effect checkpoints, terminal bundle when
present, Receipt policy/snapshot, retention metadata, and integrity/history
anchor. Process memory, a queue message, cache, worker state, lease, audit
event, or HTTP response MUST NOT replace that truth.

Recovery MUST NOT re-admit Invocation, create a replacement Task, restore
Approval, reset deadline, erase partial effects, add capability, revive a
terminal Task, or authorize another effect merely because a worker disappeared.
An effect-free disappeared attempt MAY be fenced and retried only under
REQ-TASK-0011; an attempt that MAY have begun an effect MUST remain
indeterminate until reconciled.

**Applies to.** Process/storage restart, queue reconciliation, accepted/queued/
running/terminal recovery, worker disappearance, cache rebuild, and projection
rebuild.

**Lifecycle/state impact.** Restart itself causes no transition; any resumed
transition uses the same Task, immutable deadline, current version/fence, and
legal edge.

**Semantic failure.** Missing or inconsistent minimum recovery state MUST block
execution and terminal invention and MUST NOT be reconstructed from operational
mechanics or current defaults.

**Sources:** H-01, H-03, H-07, H-08, H-09, H-11, H-14. **Gaps:** GB-020,
GB-021, GB-024.

## REQ-TASK-0035 - Ambiguous commit recovery proves one history

**Requirement.** For an ambiguous state-changing call, recovery MUST reread
authoritative Task, transaction, idempotency, and Result identities and prove
one complete history. If the terminal commit definitely exists, recovery MUST
return/read that same Task/Result and MAY materialize the selected Receipt from
the bound snapshot. If authoritative evidence proves definite noncommit,
recovery MAY resume only the already accepted Task under valid state, attempt,
deadline, cancellation, and effect rules.

If evidence is partial, corrupt, rolled back, split-brain, unavailable, or
cannot distinguish commit from noncommit, recovery MUST fail closed and
quarantine; it MUST NOT guess terminality, retry effects blindly, delete
idempotency evidence, or create a new Task or Result.

**Applies to.** Ambiguous queue/start/cancel/effect/terminal operations, lost
responses, crashes before/after commit, missing Task with idempotency evidence,
and terminal Task without a provable Result bundle.

**Lifecycle/state impact.** Recovery observes or continues the one proven
history; it creates no replacement edge and cannot mutate a proven terminal
state.

**Semantic failure.** An unprovable commit boundary MUST remain indeterminate
until exact evidence is restored and MUST NOT be collapsed to success, failure,
zero effects, or nonexistence.

**Sources:** H-01, H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-020, GB-021,
GB-023, GB-024.

## REQ-TASK-0036 - Stale writers, rollback, and split brain fail closed

**Requirement.** Authoritative Task version/fence MUST reject every stale
worker or writer. Duplicate workers MUST NOT merge outputs or effects. A stale
cache or snapshot MUST NOT revive a terminal Task. Rollback or split-brain
candidates MUST NOT be resolved by wall-clock latest timestamp, response
arrival, arbitrary majority, process preference, current cache, or a lower
version accepted after restore. Only the accepted authoritative serialization
and H-11 history/checkpoint mechanism MAY prove the winner.

If no winner can be proven, all conflicting execution authority MUST be fenced
and the Task/namespace MUST remain indeterminate and quarantined. H-11 owns
checkpoint, continuity, freshness, and anti-rollback mechanics; this chapter
owns the prohibition on Task/Result mutation while proof is absent.

**Applies to.** Duplicate/stale workers, stale progress/terminal writes, cache
rollback, backup restore, partitions, split brain, conflicting terminal
candidates, and integrity recovery.

**Lifecycle/state impact.** A losing or unproven writer causes no transition;
proven durable terminal truth has no exit after rollback or restart.

**Semantic failure.** Failure to prove one authoritative history MUST block
effects, terminalization, merging, Result creation, identity reuse, and
Approval restoration.

**Sources:** H-01, H-03, H-09, H-11, H-14. **Gaps:** GB-020, GB-021, GB-023,
GB-024.

## REQ-TASK-0037 - Historical Task and Result meaning is immutable

**Requirement.** Every Task/Result history MUST retain its original release,
selected profiles, capability/version, Connection/scope, acceptance identity,
deadline, cancellation/stop policy, lifecycle transitions, Result semantics,
effect evidence, Receipt selection/coupling, and retention/provenance facts.
Current schema, code, queue, provider result, Platform state, or implementation
defaults MUST NOT reinterpret those semantics.

Historical `ghostbridge/0.1-draft` objects MUST remain legacy evidence and MUST
NOT be silently upgraded, relabeled, passed through the current Task machine,
or supplied missing acceptance, Approval, effect, Result, Receipt, checkpoint,
or profile facts. An append-only successor projection MAY exist only when H-03
evidence proves every mapped semantic and preserves source identity and
provenance.

**Applies to.** Historical reads, support, migration assessment, legacy values,
recovery, retention, and newer implementation processing of older objects.

**Lifecycle/state impact.** History cannot gain current authority or a new
state; an unproven legacy object remains status-only, migration-required,
ambiguous, or quarantined.

**Semantic failure.** Missing original semantics or attempted current-default
reinterpretation MUST fail closed without execution, terminal invention,
content reconstruction, or upgraded proof claim.

**Sources:** H-03, H-09, H-10, H-11, H-13, H-14. **Gaps:** GB-020, GB-021,
GB-023, GB-024, GB-025.

## REQ-TASK-0038 - Compensation is separate governed work

**Requirement.** Compensation MUST NOT rewrite the original Task, Result,
effect classification, terminal reason, or Receipt relationship.
`compensation_required` MUST remain only a Result/effect/recovery fact. Actual
compensation work MUST require a separately authenticated and authorized new
Invocation and Task and, where applicable, a new Approval. `compensated` MAY be
linked later as historical evidence but MUST NOT mean the original effect never
occurred or grant authority to conceal it.

**Applies to.** Partial or complete effects, failure/cancellation/timeout
handling, remediation workflows, linked evidence, and historical reads.

**Lifecycle/state impact.** Compensation causes no transition in the original
terminal Task; separately governed work has its own independent Task lifecycle.

**Semantic failure.** In-place compensation, inferred authority, original-
Result mutation, or effect erasure MUST be rejected and MUST NOT be represented
as a successful undo.

**Sources:** H-02, H-03, H-07, H-08, H-09, H-12. **Gaps:** GB-021, GB-023,
GB-024.

## REQ-TASK-0039 - Semantic failures remain distinct from H-12 mappings

**Requirement.** Implementations MUST internally distinguish enough semantic
causes to enforce safely, including pre-Task rejection; unknown Task;
unauthorized/cross-scope Task; exact accepted Invocation retry; conflicting
idempotency retry; cancellation unsupported; cancellation intent accepted;
cancellation lost to terminal; timeout; terminal persistence indeterminate;
Result content expired; Receipt materialization pending; Receipt/Result
mismatch; and corrupt, rollback, or split-brain history.

This chapter MUST NOT define final HTTP status, method/path, header, public
error identifier, error detail, retry header, media type, disclosure precedence,
or timing behavior. H-12/D1-07 MUST map those outcomes without changing Task
state effects, authority, retention, or the internal distinction needed for
safe enforcement.

**Applies to.** Task admission handoff, cancellation, polling/retrieval,
terminalization, persistence/recovery, retention, Receipt status, public
adapters, and observability.

**Lifecycle/state impact.** An error or transport outcome causes no transition
unless a separately proven semantic commit under this chapter already exists.

**Semantic failure.** Collapsing internal causes in a way that grants authority,
loses an enforcement distinction, mutates state, or leaks protected facts MUST
fail closed; safe public collapsing remains H-12/D1-07 work.

**Sources:** H-02, H-05, H-09, H-11, H-12. **Gaps:** GB-020, GB-021, GB-022,
GB-023, GB-024, GB-025.

## REQ-TASK-0040 - Closed Core and registered Task extensions

**Requirement.** Task and Result MUST remain closed Core except at extension
points already registered under H-13. An extension affecting Task authority,
state, retry, deadline, cancellation, Result, effects, retention, or Receipt
policy MUST be selected, known, understood, protected by the owning H-10
commitment, and limited to narrowing or expressing already-authorized
semantics. It MUST NOT create a hidden lifecycle state, alternate terminal
truth, authority widening, stripped/downgraded fallback, or current-default
reinterpretation.

Unknown optional extension data MUST NOT create execution authority. Unknown
required semantics MUST make the affected operation unusable without stripping
or fallback.

**Applies to.** Every extension-bearing Task acceptance, transition, attempt,
Result, effect, cancellation, retention, Receipt coupling, and historical
projection.

**Lifecycle/state impact.** Extension processing creates no independent state;
unknown required or authority-widening semantics prevent creation, transition,
effect, terminalization, or retrieval as applicable.

**Semantic failure.** Open-Core acceptance, hidden state/effect meaning,
unknown required semantics, unprotected critical data, or downgrade MUST fail
closed without mutation, execution, Result invention, or fallback.

**Sources:** H-03, H-04, H-09, H-10, H-13. **Gaps:** GB-020, GB-021, GB-023,
GB-024, GB-025.

## Non-normative production-grade attack review

This review is planning evidence only. It adds no requirement and closes no
gap.

| Failure path                                                                                                            | Normative coverage                                         |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Task created before H-07 commit; rejected Invocation or `waiting_for_approval` treated as Task                          | REQ-TASK-0001, REQ-TASK-0003, REQ-TASK-0006                |
| Queue message treated as Task authority; lease loss treated as cancellation/failure                                     | REQ-TASK-0007, REQ-TASK-0008                               |
| Task ID treated as authorization or cross-tenant Task ID leaks state                                                    | REQ-TASK-0002, REQ-TASK-0029                               |
| Exact retry creates a new Task ID; worker attempt confused with Task identity                                           | REQ-TASK-0002, REQ-TASK-0003, REQ-TASK-0007, REQ-TASK-0011 |
| Duplicate delivery/worker begins duplicate effects or merges outputs                                                    | REQ-TASK-0007, REQ-TASK-0008, REQ-TASK-0010, REQ-TASK-0036 |
| Stale worker writes progress or terminal state                                                                          | REQ-TASK-0007, REQ-TASK-0009, REQ-TASK-0019, REQ-TASK-0036 |
| `running -> queued` occurs without fencing; terminal Task returns to running                                            | REQ-TASK-0004, REQ-TASK-0005, REQ-TASK-0011                |
| Unsupported cancellation stores intent; cancellation request is reported as cancellation success                        | REQ-TASK-0012, REQ-TASK-0013, REQ-TASK-0014                |
| Socket/transport abort is treated as cancellation or timeout                                                            | REQ-TASK-0012, REQ-TASK-0018                               |
| Cancellation after partial effect claims zero effects or restores Approval                                              | REQ-TASK-0014, REQ-TASK-0022                               |
| Authority withdrawal rewrites accepted history or later Connection event automatically changes Task state               | REQ-TASK-0016, REQ-TASK-0037                               |
| Client/poll clock controls timeout; equality accepts late completion; retry extends deadline                            | REQ-TASK-0017, REQ-TASK-0018, REQ-TASK-0028                |
| Timeout terminalizes with unknown effect state                                                                          | REQ-TASK-0010, REQ-TASK-0018, REQ-TASK-0022                |
| Partial completion becomes Task state; failed Task hides a committed effect; completed Task lacks intended-effect proof | REQ-TASK-0006, REQ-TASK-0022                               |
| Terminal Task is written without Result; Result without terminal Task; two Results for one Task                         | REQ-TASK-0019, REQ-TASK-0020, REQ-TASK-0023                |
| Receipt becomes terminality source; signer failure reruns Task; mismatch rewrites Result                                | REQ-TASK-0025, REQ-TASK-0026                               |
| Poll advances Task or hint changes deadline                                                                             | REQ-TASK-0027, REQ-TASK-0028                               |
| Result expiry deletes replay evidence; tombstone deletion makes identity reusable                                       | REQ-TASK-0031, REQ-TASK-0032, REQ-TASK-0033                |
| Restart reconstructs authority from queue/cache; worker crash authorizes blind effect retry                             | REQ-TASK-0010, REQ-TASK-0034, REQ-TASK-0035                |
| Stale snapshot revives terminal Task; split brain selects latest timestamp                                              | REQ-TASK-0004, REQ-TASK-0036                               |
| Historical read grants authority                                                                                        | REQ-TASK-0029, REQ-TASK-0030                               |
| Compensation rewrites original Result                                                                                   | REQ-TASK-0038                                              |
| Current schema reinterprets legacy Task                                                                                 | REQ-TASK-0006, REQ-TASK-0037                               |
| Secrets, private prompts, or hidden reasoning enter tombstone                                                           | REQ-TASK-0033                                              |

## Non-normative D2 traceability

This section identifies required later assets; it creates none and closes no
gap.

`D2-01` must later define the Task schema, Result schema, cancellation
intent/request schema, polling and retrieval representations, and Receipt
linkage representations, all derived from the applicable `REQ-TASK-*`
requirements without changing their semantics.

`D2-02` must later define the canonical executable Task state machine, legal
and illegal edge corpus, terminal-no-exit assertions, fenced
`running -> queued` retry, cancellation intent/checkpoint machine,
timeout/deadline machine, and atomic terminal Task/Result transition model.

`D2-04` must later cover at least concurrent exact Invocation retry; duplicate
queue delivery; duplicate and stale workers; cancel/start, cancel/effect, and
cancel/complete races; timeout/completion ordering and deadline equality; crash
before and after terminal commit; lost terminal response; Receipt signer
outage; Result/Receipt mismatch; restart from every state; ambiguous effect;
rollback; split brain; corrupt Task; missing Task with idempotency evidence;
terminal Task without Result; Result-content expiry; tombstone retention;
cross-tenant polling/retrieval; historical Connection terminality; and
compensation separation.

These later schemas, executable machines, fixtures, vectors, malicious/race
cases, conformance assets, and security review do not exist by virtue of this
chapter. Full Receipt proof, signer/key lifecycle, revocation and historical
verification remain D1-06/H-10/H-11. Final routes, methods, statuses, headers,
media types, public errors, redaction, timing, and observability remain
D1-07/H-12. No `GB-*` gap is closed by this prose.
