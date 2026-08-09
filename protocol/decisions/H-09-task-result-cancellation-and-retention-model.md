# H-09 — Task, result, cancellation, and retention model

## Decision ID

H-09

## Status

**ACCEPTED**

Option B has H-09 protocol-governance decision authority through Rudra's
verified approval dated 2026-08-09. Acceptance is decision authority only; it
is not normative specification, schema, executable state machine, fixture,
test vector, implementation change, conformance result, release decision, or
Protocol 1.0 claim, and it creates no authority for any of those activities.

## Date prepared

Date prepared: 2026-08-07

Approval date: 2026-08-09

## Decision scope

H-09 selects one coherent semantic model for accepted durable work. It decides,
at protocol-governance level only:

- when an H-07-accepted Task exists and which identity remains stable;
- the complete accepted Task lifecycle and terminal set;
- the disposition of historical Task and Receipt values, especially
  `rejected`, `waiting_for_approval`, `waiting_for_dependency`,
  `recovery_required`, `compensation_required`, and `revoked`;
- the distinction between lifecycle, progress, cancellation intent, execution
  attempts, effects, Result, Receipt, transport response, and audit evidence;
- cancellation support, request acceptance, checkpoints, guarantees, and race
  winners;
- deadline and timeout serialization, including equality;
- the one-Result model, partial-effect representation, and compensation links;
- terminal Task/Result atomicity and downstream Receipt recovery;
- retry, restart, stale-worker, rollback, corruption, and split-brain outcomes;
- polling authority and historical retrieval boundaries; and
- semantic retention layers and the minimum terminal tombstone.

H-09 does not choose public routes, methods, HTTP status codes, media types,
error names, header names, wire fields, canonical bytes, cryptographic
algorithms, schema openness, concrete retention durations, deployment storage,
or release policy. Those subjects remain assigned below.

## Gap and work-item mapping

The canonical Phase 15D.0 register assigns H-09 to `GB-016`, `GB-020`,
`GB-021`, `GB-022`, `GB-023`, `GB-024`, `GB-025`, `GB-034`, and `GB-035`, and
to `D1-05`, `D2-01`, `D2-02`, `D2-04`, and `P1-03`
(`docs/protocol/phase-15d-plan.md:18-37,83-115,155-195`).

Recording and accepting this decision closes none of those gaps. They remain pending until
separately authorized normative, executable-asset, implementation-neutral
conformance, and interoperability work supplies the evidence required by the
plan.

## Concepts kept distinct

The accepted Option B decision keeps these concepts separate even when an existing implementation
stores or returns them together:

1. Invocation admission and pre-Task rejection.
2. H-07 Task acceptance and immutable Task identity.
3. Task lifecycle state.
4. Safe progress or dependency substatus.
5. Worker attempt, lease, fence, and retry mechanics.
6. Cancellation request, durable cancellation intent, and cancellation winner.
7. Execution deadline and timeout winner.
8. External-effect checkpoint and committed effect.
9. Recovery or integrity condition.
10. Immutable terminal Result and expirable Result content.
11. Compensation-required fact and separately governed compensation work.
12. Receipt semantic evidence and later proof materialization.
13. Public transport response and transport abort.
14. Audit event, telemetry, and operational history.
15. Retention expiry, disclosure authorization, and replay-prevention
    tombstone.

None of authentication, Connection authority, Trust, authorization, deployment
policy, Approval, Task state, Result, or Receipt substitutes for another.

## Accepted-decision dependencies

H-09 is subordinate to H-01 through H-08. The accepted decision fills only the
post-acceptance boundary delegated to it and does not silently amend any
accepted decision.

### H-01 — lifecycle initialization and ordering

Durable Connection authority starts only after the complete H-01/H-06
establishment transaction commits. Discovery, preview, authentication, Trust,
and negotiation do not independently grant governed authority. Governed
objects bind the selected Connection and release, material authority changes
require explicit new consent and replacement, and restart loads durable history
rather than reconstructing it from discovery or defaults
(`protocol/decisions/H-01-lifecycle-initialization-and-ordering.md:714-753,779-798`).

H-09 therefore cannot create a Task through polling, queue publication,
Receipt generation, retry, or recovery, and cannot reconstruct missing Task
authority from historical side effects.

### H-02 — roles, trust boundaries, and authorization floor

Authentication, Connection authority, current Trust, structured authorization,
deployment policy, exact-action Approval, and execution consequence are
distinct. Effective authority is their narrowing intersection, and the Agent is
the final enforcement point before Task creation or external effect
(`protocol/decisions/H-02-roles-trust-boundaries-and-authorization-floor.md:893-1008`).

H-09 therefore introduces no new authority path. Cancellation, Result access,
Receipt access, and historical disclosure require their own authenticated,
purpose-bound, scope-bound authorization, without making a Receipt or Task ID
proof of authority.

### H-03 — protocol version identity and history

The selected release, its artifacts, and historical object meaning are
immutable. Current schemas, current defaults, package constants, later
implementations, or fresh discovery cannot reinterpret stored Tasks, Results,
or Receipts. Missing historical negotiation or evidence cannot be invented
(`protocol/decisions/H-03-protocol-version-identity-and-history.md:245-296,1724-1757,1796-1814`).

H-09 must classify ambiguous legacy objects rather than relabel them as though
they were created under a future Option B model.

### H-04 — capability, profile, and optional-feature negotiation

H-04 selected layered monotonic intersection. Capability, profile, scope,
consent, and limitations can only narrow; material changes require a new or
replacement Connection, and restart cannot reinterpret a stored result
(`protocol/decisions/H-04-capability-profile-and-optional-feature-negotiation.md:1702-1750,1752-1854`).

Task execution, cancellation support, output access, Receipt selection, and
retention class cannot silently widen the immutable capability/profile bundle
accepted for the Task.

### H-05 — authentication profiles and credential binding

Every Connection-governed request requires current selected-profile evidence,
proof purpose and audience remain distinct, and reusable secrets remain outside
Connection, Task, Result, Receipt, history, and observability artifacts
(`protocol/decisions/H-05-authentication-profiles-and-credential-binding.md:1643-1739,1759-1809`).

Authentication failure is not Task failure. H-05 leaves post-acceptance behavior
during authentication suspension, expiry, or revocation to H-09
(`:1863-1884`).

### H-06 — Install Grant comparison boundary

H-06 defines exact-intent convergent redemption for a purpose-bound Install
Grant. Its durable commit, retry, expiry, tombstone, and fail-closed recovery
principles are useful comparison evidence, but H-06 explicitly separates
Install Grant replay from Invocation idempotency and does not automatically
govern Tasks (`protocol/decisions/H-06-install-grant-redemption-and-retry-semantics.md:683-781,1127-1200`).

H-09 may adopt comparable safety properties only through an explicit H-09
choice, not by treating a Task as a Grant.

### H-07 — Invocation acceptance and scoped authority

A protocol Task first exists only after the final serialized durable
Invocation-acceptance commit reloads every raceable authority input and
atomically commits one Task identity plus idempotency evidence
(`protocol/decisions/H-07-connection-lifecycle-and-scoped-authority.md:865-914`).
If acceptance wins a race with a Connection transition, the accepted Task is
not erased or automatically completed, failed, cancelled, revoked, or
compensated; H-09 owns the consequence
(`:826-843,1038-1079`).

H-09 cannot move the acceptance point, create pre-acceptance Task authority, or
let a later Connection event rewrite the authority facts observed at
acceptance.

### H-08 — exact-action Approval consumption

Where Approval is required, the Approval consumption and H-07 acceptance bind
in the same final durable outcome. Exact retry after that commit converges on
the same Task; nothing after it restores consumed Approval
(`protocol/decisions/H-08-exact-action-approval-lifecycle-and-consumption.md:1120-1188`).
Challenge issuance or Decision waiting creates no accepted Task, and the
historical name `waiting_for_approval` cannot supply Task authority merely by
naming a UI/workflow record (`:1004-1014,1133-1136`).

Task execution, side effects, cancellation, Result, Receipt, polling,
retention, and post-acceptance recovery begin after that accepted boundary.

### Accepted-decision conflict ledger

| ID | Candidate H-09 behavior | Accepted-decision conflict | Accepted disposition |
|---|---|---|---|
| C-01 | Create an authoritative Task before the H-07 final commit | H-01, H-02, H-07 | Reject; a candidate or workflow request grants no Task authority |
| C-02 | Treat `waiting_for_approval` as an accepted Task | H-02, H-07, H-08 | Reject; represent pre-admission workflow separately |
| C-03 | Restore consumed Approval after failure, timeout, cancellation, crash, or no effect | H-08 | Reject; postcommit outcome never restores Approval |
| C-04 | Let Task retry create a new Task identity | H-07 and H-08 exact retry | Reject; distinguish attempts beneath one immutable Task |
| C-05 | Let cancellation, Result access, or Receipt possession widen Connection/capability/scope | H-02 and H-04 | Reject; every operation remains bounded by exact inherited scope and disclosure authority |
| C-06 | Treat authentication failure as Task failure or proof that execution stopped | H-02 and H-05 | Reject; preserve separate gate and execution evidence |
| C-07 | Put reusable credentials, bearer material, private prompts, or hidden reasoning in Task/Result/Receipt/tombstone | H-05 | Reject; retain only safe semantic evidence |
| C-08 | Reconstruct legacy Task/Result/Receipt facts from current schema or code | H-03 | Reject; classify, quarantine, or explicitly migrate without invention |
| C-09 | Allow a terminal Task to return to queued/running after restart or retry | H-01/H-03 durable history and H-07 acceptance identity | Reject; terminality is irreversible |
| C-10 | Make a later Connection transition erase accepted work or restore Approval | H-07 and H-08 | Reject; retain acceptance history and resolve only remaining interruptible execution |
| C-11 | Make a Receipt retroactively authorize Invocation acceptance or external effect | H-02, H-07, H-08 | Reject; Receipt is downstream evidence |
| C-12 | Let a current capability setting silently add cancellation or Receipt support to an accepted Task | H-04 | Reject; bind the selected policy at acceptance |
| C-13 | Treat transport abort or polling cancellation as semantic Task cancellation | H-07/H-09 boundary and H-12 ownership | Reject; only a separately authenticated cancellation operation may record intent |
| C-14 | Change a deadline in place based on current defaults or poll timing | H-03/H-04 immutable binding and H-07 acceptance evidence | Reject; require pre-bound extension semantics or separately authorized new work |
| C-15 | Rewrite original outcome after compensation | H-03 immutable history and H-02 new-work authority | Reject; compensation is linked evidence and, when executable, a separate authorized Task |
| C-16 | Treat deletion as evidence that a Task never existed or its identity is reusable | H-03 history and H-07 idempotency | Reject; retain the minimum tombstone through every supported horizon |

Option B below is constructed to avoid these conflicts. Any alternative that
retains one requires a separately identified human-approved supersession; H-09
cannot silently supersede H-01 through H-08.

## Repository evidence inspected

### Governance/planning evidence

- The canonical register states the exact H-09 question, affected gaps, work,
  and required decision evidence (`docs/protocol/phase-15d-plan.md:18-37` and
  `docs/protocol/normative-specification-gap-analysis.md:246-265`).
- D1-05 requires states, triggers, guards, effects, terminality, expiry,
  polling, Result availability, restart, and Task/Receipt atomicity; D2-01,
  D2-02, and D2-04 retain schema, state-machine, and hostile/failure asset work
  (`docs/protocol/phase-15d-plan.md:83-115`).
- The gap register keeps every H-09 gap pending and separately assigns Task
  creation, states, polling, Result retrieval, retention, Receipt parity, and
  error/status work (`docs/protocol/phase-15d-plan.md:155-195`).
- The gap analysis identifies the `rejected` terminality contradiction and the
  absence of portable Task, polling, Result, retention, Receipt, and error
  contracts (`docs/protocol/normative-specification-gap-analysis.md:72-83,133-145`).
- The conformance architecture requires legal/illegal edges, competing
  triggers, commit failures, restart at every state, clock boundaries, and a
  transport-abort/Task-cancellation distinction
  (`docs/protocol/conformance-architecture.md:124-159,180-190,253-284`).
- The decision register states that implementation or tests cannot approve a
  decision and that missing approval information leaves a record proposed
  (`protocol/decisions/README.md:3-31,89-105`).

### Historical protocol/schema evidence

- Historical Task prose lists twelve states and exposes progress, deadline,
  cancellation, retry, safe failure, Receipt, and checkpoint references without
  transition or race semantics (`protocol/specification/0.1-draft/tasks.md:1-10`).
- The historical Task schema repeats those twelve states, requires a deadline
  and `cancellationSupported`, and has a Receipt reference but no Result field
  or retention/tombstone model (`protocol/schemas/0.1-draft/task.schema.json:7-31`).
- Historical Invocation prose and schema carry a deadline, idempotency key, and
  requested Receipt profile, but do not define accepted-Task atomicity or
  execution-deadline races (`protocol/specification/0.1-draft/invocation.md:1-11`;
  `protocol/schemas/0.1-draft/invocation.schema.json:7-30`).
- Historical Receipt prose calls Receipt evidence, prohibits unrestricted
  content, and lists broad bindings (`protocol/specification/0.1-draft/execution-receipt.md:1-10`;
  `protocol/specification/0.1-draft/receipt-proof.md:1-7`).
- The Receipt schema has outcomes `completed`, `failed`, `cancelled`,
  `timed_out`, `rejected`, `revoked`, `partially_completed`, and `compensated`,
  which do not equal the Task states
  (`protocol/schemas/0.1-draft/execution-receipt.schema.json:7-42`).
- Capability history declares asynchronous, cancellation, timeout, and Receipt
  settings but supplies no accepted-Task race semantics
  (`protocol/specification/0.1-draft/capability.md:1-10`;
  `protocol/schemas/0.1-draft/capability.schema.json:20-38`).
- Replay prose distinguishes message replay from business idempotency and says
  a fresh authenticated request may receive an existing result, but does not
  define Result identity (`protocol/specification/0.1-draft/replay-protection.md:1-7`).
- Historical error/schema text supplies retry fields without stable triggers or
  state effects (`protocol/specification/0.1-draft/errors.md:1-10`;
  `protocol/schemas/0.1-draft/error.schema.json:7-17`).
- Historical revocation text requires checks before Invocation and separately
  describes historical Receipt status; it does not decide already accepted
  work (`protocol/specification/0.1-draft/revocation.md:1-10`;
  `protocol/specification/0.1-draft/revocation-set.md:5-9`).
- Historical privacy and Data Contract prose recommends minimization and
  retention declarations but fixes no Task/Result/tombstone relationship
  (`protocol/specification/0.1-draft/privacy-considerations.md:1-8`;
  `protocol/specification/0.1-draft/data-contract.md:1-10`).

### Core/Agent/Client/Trust evidence

- Protocol Core implements rich Task adjacency, treats only five listed states
  as terminal timestamps, and separately validates the wider Receipt outcome
  vocabulary (`packages/ghostbridge-protocol-core/src/index.js:1291-1379`).
- The public Receipt declaration mirrors the historical outcome vocabulary but
  omits several runtime/schema bindings
  (`packages/ghostbridge-protocol-core/src/index.d.ts:306-340`).
- The Native Agent creates a `waiting_for_approval` Task before an approved
  continuation, then otherwise persists `accepted` and immediately moves to
  `running`; those are current code paths, not accepted H-07/H-08 semantics
  (`packages/ghostbridge-native-agent/src/index.js:732-867,2143-2168`).
- The Agent races handler completion against an abort signal, writes output in
  the direct Invocation response, and creates Receipt before its terminal
  Task/Receipt transaction (`packages/ghostbridge-native-agent/src/index.js:869-1019,1473-1548`).
- Agent cancellation reads current Task state, constructs `cancelled` and a
  Receipt, commits that terminal pair, and then aborts the handler; this ordering
  does not by itself define cancel-versus-effect semantics
  (`packages/ghostbridge-native-agent/src/index.js:1028-1080`).
- Production Agent code requires a terminal Task and Receipt to commit together,
  while fixture mode performs compensating two-write behavior
  (`packages/ghostbridge-native-agent/src/index.js:1387-1458`;
  `packages/ghostbridge-native-agent/src/fileProtocolStores.js:209-273`).
- The Native Client derives output from the Invocation response, fetches Receipt
  by Task reference after polling, uses local exponential polling limits, and
  calls watch-abort `TASK_CANCELLED`
  (`packages/ghostbridge-native-client/src/index.js:790-875,1392-1405`).
- The Client terminal helper alone includes `rejected`, although Core Task
  validation and the schema omit it
  (`packages/ghostbridge-native-client/src/index.js:1388-1390`).
- Trust verification binds Receipt to Passport, output/evidence digests,
  Invocation context, and a changing historical-status calculation, but does
  not define Task/Result source-of-truth semantics
  (`packages/ghostbridge-trust/src/index.js:1624-1689`).

### Platform evidence

- The Platform adapter defines its own terminal set including `rejected`, maps
  Task state one-to-one to Receipt outcome, gives task status/result,
  cancellation, and Receipt retrieval separate permissions, and has error
  mappings different from the Native Agent
  (`backend/src/services/platformNativeClient.service.js:28-88`).
- It calls a terminal Task lookup a "result", requires cancellation to return
  `cancelled`, and requires every terminal Task to expose a verifiable Receipt
  (`backend/src/services/platformNativeClient.service.js:831-1008`).
- It returns output from the immediate Invocation result while sealing Task and
  Receipt references into Platform bindings
  (`backend/src/services/platformNativeClient.service.js:1135-1246`).
- It rejects Task/Receipt mismatch and checks exact scope, Connection,
  capability, Invocation, and proof bindings
  (`backend/src/services/platformNativeClient.service.js:1356-1468`).
- Separate Platform lifecycle code has a richer Invocation state machine,
  orthogonal cancellation and recovery states, and lossy legacy status mapping
  (`backend/src/constants/invocationLifecycle.js:1-210`).
- Platform durable-work records add pending, blocked, claimed, retry,
  cancellation-requested, recovery, dead-letter, lease, attempt, milestone, and
  outbox concepts that are operational mechanics rather than protocol authority
  (`backend/src/constants/durableWork.js:1-79`;
  `backend/src/models/RuntimeWorkItem.js:49-197`).

### Fixture/conformance evidence

- Native Agent tests encode signed terminal Receipts for cancellation and
  timeout, current `waiting_for_approval` Tasks, and concurrent Approval behavior
  (`packages/ghostbridge-native-agent/test/security15c1a.test.js:1147-1233`).
- Tests require cancellation of accepted and waiting Tasks to create one signed
  terminal pair and require terminal persistence to fail without a Receipt
  (`packages/ghostbridge-native-agent/test/security15c1a.test.js:1431-1551`).
- The file-store test proves current terminal Task/Receipt restart persistence
  but not Result identity, partial effects, rollback detection, or split-brain
  fencing (`packages/ghostbridge-native-agent/test/security15c1a.test.js:1553-1625`).
- The current conformance package imports official Client, Core, and Trust code
  and performs only a shallow Task/Receipt check
  (`packages/ghostbridge-conformance/src/index.js:1-18,128-178`).
- The so-called black-box verifier also imports official validators and Client,
  asserts a `waiting_for_approval` Task, and tests cancellation only as an
  immediate `cancelled` response
  (`scripts/verifyGhostBridgeBlackBoxConformance.mjs:9-38,580-625`).
- Its raw Agent creates in-memory Tasks, returns immediate output/Receipt for
  completion, and rewrites any found Task directly to `cancelled`, without a
  Result object or race/effect model (`scripts/black-box/raw-agent.mjs:203-283,464-588`).
- Governed compatibility fixtures likewise treat `waiting_for_approval` as a
  Task and immediate output plus Receipt as the result
  (`scripts/verifyGovernedHostAgentCompatibility.js:155-205,254-290`).

### Evidence conclusion

Repository evidence does not supply one coherent H-09 answer. It demonstrates
at least four competing models: historical rich Task states, Core adjacency,
Agent terminal Task/Receipt atomicity with direct output, and Platform's own
Invocation/durable-work lifecycle. Tests preserve those implementations but do
not elevate them to protocol law. Accepted H-07 and H-08 eliminate
pre-acceptance Task authority and therefore require deliberate disposition of
several historical values.

## Contradictions and undefined behavior

| ID | Evidence or undefined point | Accepted Option B disposition |
|---|---|---|
| U-01 | Historical prose exposes twelve Task states | Retain only seven lifecycle states; classify the remainder orthogonally |
| U-02 | Historical Task schema repeats that vocabulary | Preserve it as legacy schema history; do not use it as the successor state registry |
| U-03 | Receipt has eight different outcomes | Bind Receipt outcome to terminal Result semantics; historical extras become evidence facts or legacy-only values |
| U-04 | `rejected` is Receipt-only historically but Client treats it as terminal Task state | Make rejection a pre-Task admission outcome; issue no accepted-work Receipt |
| U-05 | H-07 creates Task only at accepted admission | Make the H-07 commit the sole Task birth point |
| U-06 | H-08 makes Approval pre-admission | Remove `waiting_for_approval` from Task lifecycle |
| U-07 | Dependency waiting may not change authority | Represent it as safe progress under `queued` or `running` |
| U-08 | Recovery may describe integrity rather than lifecycle | Keep `recovery_required` as a fail-closed condition over the last proven state |
| U-09 | Compensation may be follow-up work | Record a Result/effect fact and link a separately authorized Task when work is performed |
| U-10 | `revoked` conflates authority with execution outcome | Do not use it as original Task state; record an authority-withdrawal trigger/reason |
| U-11 | Cancellation acceptance, guarantee, stop, and no-effect meanings are conflated | Define durable intent separately and enumerate its exact guarantees |
| U-12 | Cancel/start, cancel/effect, cancel/complete, timeout, revocation, and crash races differ | Use authoritative checkpoints and one serialized terminal compare-and-commit |
| U-13 | Partial effects and `cancelled` are ambiguous | Permit `cancelled` with immutable partial-effect Result; never claim undo |
| U-14 | Compensation may rewrite original outcome | Prohibit rewriting; link follow-up evidence/work |
| U-15 | Number and location of Results are undefined | Define exactly one logical immutable terminal Result per accepted Task |
| U-16 | Task, Receipt, immediate response, and Platform each expose output differently | Make Result authoritative for terminal output; transports may project it later |
| U-17 | Task/Result/Receipt disagreement has no authority rule | Task controls lifecycle, Result controls terminal outcome/output/effects, Receipt proves the same snapshot |
| U-18 | Current production Task terminality waits for signed Receipt | Atomically bind Task and Result plus Receipt intent; proof bytes may materialize later |
| U-19 | Crash before Receipt materialization is undefined | Regenerate the same semantic Receipt from immutable terminal snapshot without execution |
| U-20 | Poll backoff is a Client constant | Make hints advisory and read-only, leaving wire form to H-12 |
| U-21 | Result retention and Task retention are merged or absent | Separate full content, semantic record, proof material, and minimum tombstone |
| U-22 | Deletion can erase replay truth | Retain idempotency/terminal tombstone through every applicable support horizon |
| U-23 | Restart, stale cache, lease loss, duplicate worker, and split brain have no shared rule | Durable store and current fence win; indeterminate state fails closed |
| U-24 | Later Connection lifecycle impact on accepted work is deferred | Preserve acceptance; apply only an accepted profile's stop trigger at cancellation/effect checkpoints |
| U-25 | Transport abort is labeled Task cancellation by Client code | Keep transport abort semantically separate; H-12 maps wire behavior |
| U-26 | Agent writes Task and context separately before running | Future work must make the H-07 accepted semantic bundle atomic; current code is evidence only |
| U-27 | Agent cancellation constructs terminal data before aborting the handler | Require cancellation/effect fencing before the terminal `cancelled` commit |
| U-28 | Agent may return failure while terminal persistence remains unresolved | Classify as indeterminate recovery, never a clean terminal claim or permission to retry effects |
| U-29 | Platform maps cancelled/timed-out/recovery to legacy `failed` | Treat that mapping as lossy product compatibility, not semantic equality |
| U-30 | Receipt signer outage can prevent current terminal commit | Decouple semantic terminal commit from proof-byte materialization while preserving immutable Receipt input |
| U-31 | Current idempotency is stored after execution response assembly | Require acceptance idempotency at H-07 and keep terminal Result recovery under the same Task |
| U-32 | No artifact defines effects begun before timeout but observed afterward | Record effect checkpoint/order and keep state indeterminate until further effects are fenced and evidence is reconciled |

## Terminology

### Task

The durable protocol identity for one Invocation accepted by the H-07 final
commit. It represents accepted work, not a request candidate, Approval workflow,
HTTP request, worker process, or attempt.

### Task acceptance

The single H-07 serialization outcome that durably binds Task identity,
Invocation identity, idempotency identity, accepted authority context, deadline,
cancellation/Receipt policy, and Approval consumption where required.

### Task state

The authoritative lifecycle category of accepted work. It does not encode
Approval availability, current Connection authority, worker lease, result
content availability, Receipt proof availability, or recovery health.

### Execution attempt

One fenced worker effort under an existing Task. Attempts have distinct
identities and ordering evidence but never create or replace Task identity.

### Progress

Safe advisory execution information under a nonterminal Task, such as waiting
for a dependency. Progress grants no authority and cannot change terminality,
deadline, retention, or idempotency.

### Cancellation intent

An authenticated, authorized, durably recorded request to stop remaining
interruptible work. Intent is not itself the `cancelled` terminal outcome.

### Cancellation checkpoint

An authoritative fenced serialization point at which the executor reloads
cancellation and applicable stop triggers before continuing execution.

### Effect checkpoint

The authoritative fenced serialization point immediately before an external
effect may begin. It records ordering sufficient to decide whether cancellation
or timeout prevented that effect.

### Terminal Task

A Task in `completed`, `failed`, `cancelled`, or `timed_out`, committed with its
one immutable Result. It cannot transition again.

### Result

The one logical immutable terminal semantic record for a Task. It binds outcome,
safe output or its immutable reference, effect facts, failure category, attempt
summary, and terminal context.

### Partial effect

One or more externally visible effects committed while the complete intended
effect set did not. Partial does not mean undone, harmless, or compensated.

### Compensation

Evidence or separately authorized work intended to address an earlier effect.
It does not mutate the original Task or Result.

### Receipt

Downstream evidence about an already terminal Task/Result snapshot. It does not
create Task authority, authorize execution, or control terminality.

### Terminal commit

The unique durable compare-and-commit that atomically binds terminal Task state,
the immutable Result, effect/attempt summary, and the selected Receipt policy's
semantic identity or explicit no-Receipt marker.

### Poll

An authenticated, authorized, read-only observation of durable Task, Result,
Receipt, or tombstone state. It never creates or advances work.

### Retention expiry

The selected boundary after which a specified content layer is no longer
available. It is distinct from Invocation, Task, Approval, Connection, or proof
validity.

### Tombstone

The minimum safe immutable terminal record retained to preserve identity,
terminality, idempotency, replay prevention, effect classification, and
historical interpretation after fuller content expires.

### Indeterminate Task state

An internal fail-closed integrity/recovery classification applied when the last
authoritative lifecycle state or effect outcome cannot be proven. It is not an
additional Task lifecycle state and grants no permission to execute, retry an
effect, terminalize, or disclose protected content.

## Human decision questions

The table records the questions presented during human review and the Option B
answer approved by Rudra on 2026-08-09.

| ID | Decision question | Accepted Option B answer |
|---|---|---|
| A | When does a Task first exist? | Only when the H-07 final durable Invocation-acceptance commit succeeds |
| B | Is `rejected` a Task state, Receipt outcome, pre-Task failure, or something else? | A pre-Task admission outcome; no Task, execution authority, or accepted-work Receipt is created |
| C | What are the exact lifecycle states? | Nonterminal `accepted`, `queued`, `running`; terminal `completed`, `failed`, `cancelled`, `timed_out` |
| D | How are historical values classified? | By the disposition matrix below: lifecycle, progress, intent/condition, Result fact, follow-up work, pre-Task outcome, or rejected legacy behavior |
| E | Which states are terminal? | `completed`, `failed`, `cancelled`, and `timed_out` |
| F | Can terminal become nonterminal? | No; repair can restore only the exact same proven terminal history |
| G | Is Task identity immutable through retry/recovery? | Yes |
| H | How are worker attempts distinguished? | By subordinate attempt identity, monotonic attempt sequence, and fencing evidence under the same Task |
| I | How is `waiting_for_approval` treated after H-08? | As pre-admission workflow/UI state with no accepted Task authority |
| J | How is dependency waiting represented? | As safe progress under `queued` or `running`, never as authority-bearing lifecycle |
| K | How is recovery-required represented? | As an orthogonal fail-closed recovery/integrity condition over the last proven state |
| L | How is compensation represented? | As immutable Result/effect evidence plus, when work occurs, a separately authorized Invocation/Task |
| M | What does later Connection suspension/termination/revocation do? | It preserves acceptance/history and affects remaining work only through a profile-bound authoritative stop trigger at checkpoints |
| N | What is cancellation support and when is it fixed? | A semantic capability/policy fixed in the acceptance bundle; it cannot silently widen later |
| O | What does accepted cancellation guarantee? | Durable intent, required checkpoint observation, no new effect after the cancellation winner, and no claim that earlier effects were undone |
| P | What wins cancel versus complete? | The first valid terminal or cancellation-winner serialization; a committed terminal outcome cannot be rewritten |
| Q | What wins cancel versus effect? | The effect may begin only if its authoritative checkpoint serializes before cancellation/timeout wins; later effects are fenced |
| R | Can cancellation succeed after partial effects? | Yes; `cancelled` means execution stopped, while Result records partial committed effects |
| S | How are deadline races ordered? | By authoritative Task/effect/terminal serialization times, never arrival time or client clock |
| T | Is equality at the deadline timed out? | Yes, unless a terminal commit serialized strictly earlier |
| U | Can deadline extend in place? | No silent extension; only pre-bound extension semantics or separately authorized new work may change the plan |
| V | What is a Result? | The one immutable terminal semantic record binding outcome, output, effects, failure, attempts, and terminal context |
| W | Is Result part of Task or separate? | Logically separate and separately identified, though a transport may embed or project it |
| X | Is there exactly one terminal Result per Task? | Yes |
| Y | How are partial effects represented? | As explicit immutable zero/partial/complete effect classification and bounded effect evidence in Result |
| Z | How are failure details represented? | Safe semantic failure category in Result; H-12 later defines public vocabulary, detail, privacy, and redaction |
| AA | What is authoritative on disagreement? | Task for lifecycle; Result for outcome/output/effects; Receipt is evidence and mismatch is invalid/indeterminate evidence |
| AB | Must terminal Task and Result commit atomically? | Yes, as one durable semantic outcome |
| AC | Must final Receipt bytes commit atomically too? | No; the selected Receipt identity/intent and immutable input snapshot do, while proof bytes may materialize later |
| AD | What semantic evidence commits if proof creation is separate? | Terminal state/time/reason, Result identity/commitment, effect and attempt summaries, Receipt policy/identity/intent, and immutable Receipt-input snapshot |
| AE | Can Receipt issuance retry after crash? | Yes, idempotently from the same immutable snapshot, without executing work |
| AF | Does every accepted Task have a Receipt identity? | Every accepted Task binds a Receipt policy; each terminal Task whose policy selects/requires Receipt binds one semantic Receipt identity; an explicit no-Receipt marker is used otherwise |
| AG | Do pre-Task rejected Invocations get Execution Receipts? | No |
| AH | Which polling facts are authoritative? | Durable state, Result availability/expiry, Receipt status, and tombstone are authoritative; scheduling hints are advisory |
| AI | Can history be queried after Connection terminality? | Yes only as a separately authenticated, scope-bound, disclosure-authorized historical read; it grants no new work authority |
| AJ | What survives full Result-content expiry? | The minimum Task/Result/Receipt/idempotency/effect tombstone below |
| AK | What minimum tombstone prevents resurrection/replay? | Task/Invocation/idempotency identities, terminal state/time, context, Result/Receipt identities and commitments, effect class, replay evidence, provenance, and retention boundary |
| AL | Which durations are selected here? | No concrete durations; H-09 selects relationships and minimum evidence, H-14 selects support and retention windows |
| AM | What restart state is required? | Acceptance bundle, lifecycle/version/fence, deadline, cancellation/stop intent, attempt/effect checkpoints, terminal bundle if any, and idempotency history |
| AN | What happens on corrupt, missing, rolled-back, duplicate, or split-brain state? | Quarantine and fail closed; do not create replacement Task, replay effect, restore Approval, or infer terminality |
| AO | What may survive privacy minimization? | Only the bounded safe tombstone and required immutable commitments; no raw credentials, unrestricted prompts/outputs, hidden reasoning, private memory, private policy, or unnecessary provider payload |
| AP | What remains deferred? | H-10 canonical/proof bytes; H-11 revocation/history/anti-rollback; H-12 wire/errors/privacy; H-13 openness/evolution; H-14 durations/support/release; D2/P1 executable assets and evidence |

## High-level alternatives

### Option A — Preserve the historical rich Task-state vocabulary

This option promotes most `0.1-draft` values to protocol lifecycle states,
including waiting, recovery, compensation, and revocation.

Benefits:

- closest surface compatibility with historical Task prose/schema and current
  Core transition names;
- product UIs can display current labels without immediate translation; and
- operational pauses and recovery appear in one object.

Costs and risks:

- state explosion couples authority, workflow, execution, integrity, and
  follow-up work;
- `waiting_for_approval` conflicts with accepted H-08 unless H-07/H-08 are
  explicitly superseded;
- `revoked` suggests that accepted work or committed effects were retroactively
  invalidated;
- `recovery_required` and `compensation_required` have unclear terminality and
  legal exits;
- each language must reproduce a large transition graph whose values do not
  align with Receipt outcomes; and
- migration still cannot prove that similarly named historical values had the
  same semantics.

This option is viable only with a much larger state machine and explicit
supersession of the Approval conflict. It is not recommended.

### Option B — Minimal durable Task lifecycle with orthogonal intents/evidence

This option uses three nonterminal and four terminal Task states, moves
Approval waiting, dependency progress, recovery, compensation, revocation, and
partial effects into their correct independent concepts, defines one immutable
terminal Result, and makes Receipt generation downstream and recoverable.

Benefits:

- preserves the H-07 Task birth point and H-08 pre-admission Approval model;
- gives one small cross-language lifecycle with explicit terminality;
- separates cancellation intent from outcome and makes race winners testable;
- represents partial effects without lying about undo or adding a lifecycle
  state;
- permits semantic terminalization during signer outage while retaining a
  deterministic Receipt recovery input; and
- separates content expiry from the tombstone needed for idempotency/history.

Costs and risks:

- intentionally differs from historical schema and current JavaScript labels;
- requires explicit progress, recovery, effect, Result, Receipt-policy, and
  tombstone structures in future work;
- depends on strong terminal compare-and-commit, attempt fencing, effect
  checkpoints, and durable immutable evidence; and
- cannot eliminate an indeterminate condition when storage/effect history is
  genuinely unprovable.

This was the recommended option during human review and is now the accepted
H-09 disposition.

### Option C — Receipt-led terminality

Under this option, a Task cannot become terminal until the final Receipt is
durably created and, when selected, signed.

Benefits:

- Task and Receipt are always jointly available at terminal observation; and
- a simple consumer can treat Receipt existence as terminal evidence.

Costs and risks:

- Task terminality becomes coupled to H-10/H-11 cryptography and signer/key
  availability;
- signer outage can leave completed effects represented as running;
- crash recovery must distinguish execution retry from proof retry while both
  block the same lifecycle;
- slow or remote proof generation extends Task nonterminality; and
- operators may rerun work to repair evidence, creating duplicate effects.

This option offers strong presentation consistency at unacceptable execution
coupling and deadlock risk. It is not recommended.

### Option D — Append-only event ledger with projected Task state

This option makes an event stream the only source of truth and derives Task,
Result, and Receipt projections by replay.

Benefits:

- strong audit trail and race ordering;
- deterministic reconstruction when the ledger and projection rules are
  complete; and
- useful rollback-detection and stale-projection opportunities.

Costs and risks:

- every event version and projection rule becomes protocol-critical;
- independent languages must reproduce replay and migration exactly;
- privacy deletion conflicts with complete replay history;
- event gaps, forks, compaction, and schema evolution need another large
  governance model; and
- it mandates a storage architecture when H-09 needs semantic invariants only.

An implementation may use an event ledger to satisfy Option B, but H-09 should
not require that architecture. Option D is not recommended as the universal
model.

## Recommendation and accepted disposition

**OPTION B ACCEPTED**

Option B was recommended during proposal review because it best preserves H-01
through H-08, gives independent implementations a bounded state model, defines
race and atomicity truth without coupling execution to cryptographic proof
availability, and preserves replay/history after content minimization. Rudra's
verified approval dated 2026-08-09 makes Option B the accepted H-09 governance
decision.

The earlier recommendation did not itself constitute approval; the verified
human disposition recorded below supplies that authority.

## Accepted Option B semantic model

The accepted governance semantics are:

1. A Task first exists at the H-07 final durable Invocation-acceptance commit.
2. That commit creates exactly one immutable Task identity in `accepted` and
   binds the exact Invocation/idempotency, Connection/release/profile/scope,
   capability, deadline, cancellation policy, Receipt policy, and Approval
   consumption evidence.
3. Validation, Approval workflow, candidate construction, a lock, queue
   publication attempt, worker lease, response, and audit event cannot create a
   Task.
4. The lifecycle states are exactly `accepted`, `queued`, `running`,
   `completed`, `failed`, `cancelled`, and `timed_out`.
5. The last four states are terminal and have no exits.
6. `rejected` is a pre-Task admission outcome. It creates no Task, Result, or
   Execution Receipt for accepted work.
7. `waiting_for_approval` is a non-authoritative workflow/UI representation,
   not a Task state.
8. Dependency waiting is progress under `queued` or `running`.
9. Recovery-required is an orthogonal fail-closed condition over the last
   proven Task state.
10. Compensation-required and compensated are Result/effect/follow-up facts;
    compensation work requires a separate authorized Invocation/Task.
11. `revoked` is not a Task lifecycle outcome. A later authoritative change may
    submit a stop trigger for remaining work but cannot rewrite acceptance or
    effects.
12. Task identity is stable across caller retry, worker attempts, restart,
    recovery, cancellation, terminalization, and Receipt materialization.
13. Each worker attempt has a distinct subordinate identity, sequence, and
    current fence. A stale attempt cannot change Task state or begin an effect.
14. Cancellation support and the recognized requester/source policy are fixed
    by the accepted Task bundle.
15. An unsupported cancellation request creates no cancellation intent and no
    Task transition.
16. A durably accepted cancellation request means intent is stored with Task,
    requester/source, safe reason, time, and ordering/fence evidence.
17. The executor must observe committed cancellation intent at the next
    cancellation checkpoint and before each later effect checkpoint.
18. Once cancellation wins, no later external effect may begin. Effects already
    committed are not represented as undone.
19. A terminal commit that serializes first wins over cancellation. Later
    cancellation returns the existing terminal semantic outcome without
    mutation, subject to H-12 disclosure rules.
20. Cancellation before any effect yields `cancelled` with zero effects after
    the active attempt is fenced against later effects.
21. Cancellation after committed effects may yield `cancelled` with partial
    effects after remaining effects and stale attempts are fenced.
22. If effect status cannot be proven, the Task remains at its last proven
    nonterminal state under an indeterminate recovery condition; it is not
    falsely terminalized and no effect retry is authorized.
23. The execution deadline is distinct from Invocation admission, Approval,
    authentication/proof, Connection, retention, and Receipt horizons.
24. Deadline equality is timed out unless a valid terminal commit serialized
    strictly earlier.
25. Timeout wins at an authoritative checkpoint, prevents later effects, and
    terminalizes only after active/stale attempts are fenced and the Result can
    state the proven effect classification.
26. No poll, restart, retry, queue delay, signer delay, or current default
    extends the Task deadline.
27. Internal retry uses the same Task and new fenced attempt. It cannot bypass
    effect idempotency or return a terminal Task to nonterminal.
28. Each Task has exactly one logical immutable terminal Result.
29. Result is separately identified from Task even when a wire response later
    embeds both.
30. Partial completion is a Result/effect fact, not a Task state.
31. The terminal commit atomically binds terminal Task state, terminal time and
    reason, immutable Result identity and semantic commitment, output/effect
    summary, attempt summary, selected Receipt policy, Receipt semantic identity
    or no-Receipt marker, and immutable Receipt-generation input snapshot.
32. Task state is authoritative for lifecycle; Result is authoritative for
    terminal outcome, output, failure, and effects.
33. Receipt is downstream evidence about the terminal snapshot and cannot
    change Task or Result.
34. Final signed/proved Receipt bytes need not be created in the terminal
    storage transaction.
35. When Receipt is selected, materialization, signing, and delivery retry from
    the same immutable snapshot and converge on the same semantic Receipt.
36. Receipt failure never causes Task execution, an external effect, or Approval
    consumption to repeat.
37. Receipt mismatch is invalid/indeterminate evidence; it does not select a
    different terminal truth.
38. Polling and Result/Receipt retrieval are read-only and grant no work
    authority.
39. Poll hints are advisory scheduling information; they do not change state,
    deadline, validity, retention, or retry permission.
40. Historical retrieval may remain available after Connection terminality
    only through current authenticated, exact-scope, purpose-bound disclosure
    authorization.
41. Live Task truth remains durable until terminal or fail-closed recovery of
    the exact accepted history.
42. Terminal truth cannot roll back because of restart, cache loss, restore,
    worker failover, or projection rebuild.
43. Missing, corrupt, rolled-back, duplicate, stale-authority, or split-brain
    state cannot create replacement work, replay an effect, restore Approval,
    reuse Task identity, or infer a terminal outcome.
44. Locks, leases, queue handles, process IDs, and fencing implementations are
    mechanics, not protocol authority.
45. Retention has separate live-state, full terminal material, Receipt
    proof/materialization, idempotency, audit, and minimum tombstone layers.
46. Full Result content may expire before the terminal tombstone.
47. Result expiry does not erase identity, terminality, safe effect class,
    semantic commitments, replay prevention, or historical release/profile
    interpretation.
48. H-09 selects no arbitrary duration; H-14 later selects concrete windows
    that satisfy the H-09 dependency horizons.
49. These are accepted governance semantics only. Later normative text,
    schemas, state machines, fixtures, implementation, and conformance require
    their own authorization.

## Accepted Task state table

| State | Meaning | Terminal? | Authority/effect meaning | Permitted exits |
|---|---|---:|---|---|
| `accepted` | H-07 commit created one durable Task; dispatch has not been durably queued or started | No | Accepted authority is historical and fixed; no effect is implied | `queued`, `running`, `failed`, `cancelled`, `timed_out` |
| `queued` | Task is eligible for or awaiting a fenced execution attempt | No | Queue position/lease grants no authority; no new effect is implied | `running`, `failed`, `cancelled`, `timed_out` |
| `running` | At least one current fenced attempt may execute under required checkpoints | No | Effects may begin only after current effect checkpoint; prior effects are separately recorded | `queued`, `completed`, `failed`, `cancelled`, `timed_out` |
| `completed` | Intended execution contract reached successful terminal outcome | Yes | Result states whether effect set is zero or complete; partial success alone is not enough for this state | None |
| `failed` | Execution stopped with a non-timeout, non-cancellation failure | Yes | Result exposes safe failure and zero/partial effect fact; no later effect may begin | None |
| `cancelled` | Cancellation/recognized stop winner halted remaining execution | Yes | No later effect may begin; Result may record zero or partial committed effects | None |
| `timed_out` | Task deadline winner halted remaining execution | Yes | No later effect may begin; Result may record zero or partial committed effects | None |

`queued` after `running` is permitted only for a durably selected internal retry
under a new attempt/fence after the prior attempt is proven unable to produce
another effect. It is not a new Task or a rollback of terminal state.

## Accepted legal transition table

Every state-changing row uses a monotonic Task version/fence. "Terminal
snapshot" below means the complete atomic semantic bundle defined in the Result
and Receipt sections.

| Transition | Source | Trigger | Actor | Guards | Serialization/checkpoint | Durable effects | Result effect | Receipt effect | Retry/restart behavior |
|---|---|---|---|---|---|---|---|---|---|
| Create accepted Task | none | H-07 admission succeeds | Agent final enforcement point | All H-07 gates; exact idempotency; H-08 consumption where required | H-07 final acceptance commit | Create Task ID, `accepted`, immutable acceptance bundle and idempotency link | None | Bind selected Receipt policy, not a terminal Receipt | Exact caller retry reads same Task; restart loads same bundle |
| Queue | `accepted` | Durable dispatch intent becomes eligible | Agent/task scheduler | Current Task version; deadline/cancel/stop not won | Task-state commit | Set `queued`; retain queue intent and Task version | None | None | Duplicate queue publication converges; queue handle is not authority |
| Direct start | `accepted` | Fenced worker attempt starts without queue stage | Agent/executor | Current fence; deadline/cancel/stop checks; attempt identity | Start/effect checkpoint commit | Set `running`; record attempt/start/fence | None | None | Lost response reloads running attempt; duplicate worker rejected |
| Start queued work | `queued` | Fenced worker claims Task | Agent/executor | Current Task/queue version; valid fence; deadline/cancel/stop checks | Start/effect checkpoint commit | Set `running`; record attempt/start/fence | None | None | Lease loss alone does not change state; stale claim cannot start effect |
| Schedule internal retry | `running` | Current attempt ends with a classified safe retry | Agent/executor | Prior attempt fenced; no terminal/cancel/timeout winner; effect idempotency permits retry | Attempt-close and queue commit | Set `queued`; append bounded attempt summary and new dispatch intent | None | None | Restart resumes the same queued Task; no new Task/Approval |
| Fail before start | `accepted` or `queued` | Accepted work cannot execute and no safe retry remains | Agent/task authority | Current version; all attempts fenced; effect facts proven | Unique terminal compare-and-commit | Set `failed` plus terminal snapshot | Create one failed Result with zero effects | Bind Receipt identity/intent or no-Receipt marker | Exact retries read terminal outcome; proof retry only |
| Complete | `running` | Contract success and intended effect set proven | Agent/executor | Current attempt/fence; output contract; no earlier terminal/cancel/timeout winner; effects reconciled | Unique terminal compare-and-commit | Set `completed` plus terminal snapshot | Create one completed Result | Bind Receipt identity/intent or marker | Duplicate/stale terminal attempts lose and read winner |
| Fail running | `running` | Non-timeout execution failure and no safe retry | Agent/executor | Current attempt/fence; effects reconciled; no earlier terminal winner | Unique terminal compare-and-commit | Set `failed` plus terminal snapshot | Create failed Result with zero/partial effect fact | Bind Receipt identity/intent or marker | Restart reads terminal; no execution retry |
| Cancel before start | `accepted` or `queued` | Committed cancellation/stop intent wins | Agent/task authority | Cancellation supported or recognized mandatory stop; current version; no terminal winner; attempts/effects fenced | Cancellation checkpoint then terminal commit | Set `cancelled`; retain intent/order | Create cancelled Result with zero effects | Bind Receipt identity/intent or marker | Duplicate cancellation reads same intent/outcome |
| Cancel running | `running` | Committed cancellation/stop intent wins | Agent/executor | Current fence; no earlier terminal winner; no later effect can begin; begun effects reconciled | Cancellation/effect checkpoint then terminal commit | Set `cancelled`; retain intent/order/effect summary | Create cancelled Result with zero/partial effects | Bind Receipt identity/intent or marker | Crash resumes intent processing; stale worker rejected |
| Timeout before start | `accepted` or `queued` | Authoritative time is at/after deadline | Agent/task authority | No terminal serialized earlier; no active effect; current version | Deadline checkpoint then terminal commit | Set `timed_out`; retain deadline/order | Create timed-out Result with zero effects | Bind Receipt identity/intent or marker | Restart preserves original deadline and same outcome |
| Timeout running | `running` | Deadline winner observed | Agent/executor | No earlier terminal; later effects fenced; begun effects reconciled | Deadline/effect checkpoint then terminal commit | Set `timed_out`; retain order/effect summary | Create timed-out Result with zero/partial effects | Bind Receipt identity/intent or marker | Crash reloads timeout intent; no new execution after winner |
| Record cancellation intent | `accepted`, `queued`, or `running` | Authorized supported cancel request | Agent/task authority | Exact Task/scope/requester; policy fixed at acceptance; no terminal winner | Cancellation-intent commit | Store one convergent intent; lifecycle may remain unchanged until fenced | None until terminal | None until terminal | Exact retries read same intent; conflicting/unauthorized attempts do not mutate |
| Update progress | `queued` or `running` | Safe progress observation | Current fenced executor | Bounded safe category; no authority or terminal mutation | Progress-version commit | Update advisory progress only | None | None | Stale progress ignored; cache cannot override lifecycle |
| Materialize Receipt | any terminal state | Selected Receipt pending | Receipt issuer | Immutable terminal snapshot and semantic Receipt identity; eligible signing evidence | Receipt-materialization commit | No Task mutation except read-only availability projection | No Result mutation | Store/prove same semantic Receipt | Retry regenerates/redelivers same evidence; never executes Task |
| Read/poll/retrieve | any durable state/tombstone | Authorized query | Authenticated reader | Exact scope/purpose/disclosure; retained layer available | Authoritative read snapshot | No mutation | Return available Result layer only | Return status/proof only if selected and available | Repeats are read-only; hints do not change semantics |

All other lifecycle transitions are illegal. In particular, a terminal state has
no exit; `accepted` cannot be recreated; `queued` cannot overwrite a running
attempt without fencing it; and a progress, recovery, cancellation-intent, or
Receipt event cannot directly choose another lifecycle state outside the rows
above.

## Historical-state disposition matrix

| Historical value | Option B category | Accepted disposition | Legacy caution |
|---|---|---|---|
| `accepted` | Task state | Initial state at H-07 commit | Historical value is provably mappable only with acceptance/idempotency evidence |
| `queued` | Task state | Eligible/awaiting fenced attempt | Queue record alone cannot prove Task acceptance |
| `running` | Task state | Current fenced attempt may execute | Worker/process activity alone cannot prove authoritative state |
| `waiting_for_approval` | Pre-Task workflow | Not a Task state | Historical objects require classification; do not invent H-08 consumption |
| `waiting_for_dependency` | Progress category | Safe substatus under `queued` or `running` | Does not grant authority or pause deadline automatically |
| `completed` | Task state and aligned Result/Receipt category | Terminal successful outcome | Must have sufficient terminal/effect evidence before mapping |
| `failed` | Task state and aligned Result/Receipt category | Terminal failure | Preserve historical failure detail/absence without invention |
| `cancelled` | Task state and aligned Result/Receipt category | Terminal stopped execution; Result states effects | Historical name alone does not prove no effect |
| `timed_out` | Task state and aligned Result/Receipt category | Terminal deadline winner | Historical timestamps may be insufficient to prove winner |
| `recovery_required` | Recovery/integrity condition | Orthogonal to last proven lifecycle state | Quarantine ambiguous history; do not map automatically to `failed` |
| `compensation_required` | Result/effect/recovery fact | Original outcome immutable; follow-up work separate | Do not imply compensation was authorized or performed |
| `revoked` | Authority-withdrawal evidence / rejected original Task state | Not a Task state | Preserve legacy value; do not claim effects were invalidated |
| `rejected` | Pre-Task admission outcome / rejected new Receipt outcome | No accepted Task or accepted-work Receipt | Preserve historical Receipt outcome bytes as legacy evidence only |
| `partially_completed` | Result and Receipt evidence fact | Map to terminal state's partial-effect classification when proven | Never invent which effects occurred |
| `compensated` | Linked Result/Receipt evidence about follow-up | Original Task/Result unchanged | Requires proof of separate authorized compensation work |

## Result model

Option B defines one logical, separately identified, immutable terminal Result
per accepted Task. A transport may embed the Result beside Task, return its
content through a separate resource, or project a safe subset, but those wire
choices cannot create multiple semantic Results or multiple sources of truth.

### Object separation

| Concept | Purpose | Authoritative facts | Must not be used as |
|---|---|---|---|
| Task lifecycle metadata | Track accepted work and current/terminal lifecycle | Task ID, accepted binding, current state/version, deadline, terminal Result reference | Output body, Approval workflow, worker lease, proof |
| Safe progress | Advise a reader about nonterminal progress | Bounded category and observation version/time | Authority, deadline extension, terminal fact |
| Terminal Result | Record the one terminal semantic outcome | Outcome, output/reference, effect status, safe failure, attempts, terminal context | Authorization, mutable log, proof by itself |
| External-effect evidence | State what effects are proven | Zero/partial/complete classification and bounded immutable evidence/commitments | Claim that cancellation undid an effect |
| Execution Receipt | Provide selected evidence/proof of terminal snapshot | Semantic receipt identity, snapshot commitment, proof/materialization status | Task acceptance, execution authorization, terminality source |
| Public transport response | Carry a safe projection | Only fields authorized by the selected H-12 mapping | Durable truth merely because it was delivered |
| Audit log | Record security/operational events | Append-only safe observations and commit references | Task/Result source of truth or substitute for missing commit |

### Accepted Result semantic inventory

The one Result binds, directly or through immutable historically resolvable
references:

- Result identity;
- Task ID and Invocation ID;
- terminal Task outcome;
- output contract identity;
- safe output/result classification;
- output content or one immutable output reference when retention and access
  policy permit;
- output semantic commitment, with exact digest form deferred to H-10;
- effect occurrence classification: `zero`, `partial`, or `complete`;
- bounded effect summary and immutable evidence/commitments sufficient to avoid
  concealment or substitution;
- safe failure/reason category without private exception/provider detail;
- attempt count and bounded attempt/effect-checkpoint summary;
- cancellation, timeout, or authority-withdrawal winner category where
  applicable;
- terminal serialization time and monotonic Task version/fence;
- exact selected release/profile/capability/output-contract context;
- immutable Connection/scope/authorization/Approval references required for
  interpretation, never reusable secret material;
- selected Receipt policy; and
- downstream Receipt semantic identity/reference or explicit no-Receipt marker.

H-10 decides exact canonical names, bytes, commitments, digests, signatures, and
cryptographic linkage. H-12 decides which content is exposed on which wire
operation.

### Accepted Result contract matrix

| Terminal Task state | Result outcome | Effect classification | Output rule | Safe reason rule | Receipt consistency |
|---|---|---|---|---|---|
| `completed` | Completed contract result | `zero` for effect-free/read work or `complete` for the intended effect set | Contract-valid output or immutable reference; absence only when output contract permits | No failure reason; bounded completion category may exist | Receipt outcome/evidence must represent completed Result |
| `failed` | Failed result | `zero` or `partial`; never silently `complete` unless failure is explicitly post-effect and the complete effect fact is retained | No success output; bounded diagnostic/result evidence may be referenced | Required safe failure category; H-12 controls public detail | Receipt must preserve failure and effect facts |
| `cancelled` with zero effects | Cancelled result | `zero` | No success output; optional safe cancellation summary | Cancellation/stop winner and safe reason | Receipt must not imply an effect occurred or was undone |
| `cancelled` with partial effects | Cancelled result | `partial` | No complete-success output; bounded partial evidence/reference | Cancellation/stop winner plus partial-effect fact | Receipt must expose the partial-effect fact without changing state to `partially_completed` |
| `timed_out` with zero effects | Timed-out result | `zero` | No success output | Deadline winner and boundary evidence category | Receipt must represent timeout, not transport abort |
| `timed_out` with partial effects | Timed-out result | `partial` | No complete-success output; bounded partial evidence/reference | Deadline winner plus partial-effect fact | Receipt must preserve both timeout and partial effects |

A failed Task whose complete intended external effect is already committed is a
high-risk outcome that must retain that complete-effect fact; the state still
records execution-contract failure. Future normative work must define the
allowed safe classifications without collapsing failure into completion.

### Accepted semantic failure and H-12 mapping constraints

H-09 defines state effects and disclosure boundaries, not public code strings
or HTTP statuses.

| Semantic category | Task may exist? | State mutation | Retry/recovery meaning | Disclosure constraint | H-12 obligation |
|---|---:|---|---|---|---|
| Pre-Task admission rejection | No new Task | None | Correct/re-authorize a new admission attempt; exact committed retry still resolves H-07 identity | Do not imply Task existence | Choose public error/status and precedence |
| Exact accepted Invocation retry | Yes | None | Return/reference same Task | Reauthenticate and authorize disclosure | Choose success/replay representation |
| Conflicting idempotency retry | Original may exist | None | No new Task or effect | Do not disclose protected original | Choose conflict/status mapping |
| Task not found/unknown/unauthorized | Unknown to caller | None | No execution permission | Existence and scope may be collapsed | Choose privacy-safe status/detail |
| Cancellation unsupported | Yes | None | Do not record accepted intent; capability remains unchanged | Safe bounded response only | Choose cancellation error/status |
| Cancellation intent accepted | Yes | Record intent only | Exact retries converge; terminal outcome may still be pending | Do not promise zero effects | Choose accepted/pending representation |
| Cancellation loses to terminal | Yes, terminal | None | Read existing terminal outcome | Disclose only authorized terminal layer | Choose conflict/success representation |
| Terminal persistence indeterminate | Yes or unknown after acceptance | Quarantine; no clean terminal transition | Recovery inspection only; no effect retry | Do not assert uncommitted failure or success | Choose safe unavailable/retry mapping |
| Result content expired | Terminal tombstone exists | None | Read tombstone; no execution retry | Do not reconstruct output | Distinguish expired content from absent Task safely |
| Receipt materialization pending | Terminal Task/Result exists | None | Retry proof/materialization only | Do not imply Task is nonterminal | Choose pending/unavailable representation |
| Receipt/Result mismatch | Terminal Task/Result remains authoritative | Quarantine Receipt evidence | Regenerate only from proven snapshot; no Task execution | Avoid leaking mismatch internals | Choose proof/error/status mapping |
| Corrupt/rolled-back/split-brain history | Indeterminate | Quarantine | Operator/integrity recovery only | Collapse sensitive existence and topology | Choose stable safe failure/status |

H-09 does not fix the numeric status, public error identifier,
retry header, message, or detail schema. H-12 must map every semantic row without
changing its state effects.

## Cancellation and race model

### Accepted cancellation guarantees

Cancellation is supported only when the accepted Task bundle says so or when a
separately accepted profile mandates an authority-withdrawal stop trigger. An
authorized cancellation operation targets one exact Task and scope.

Durable acceptance of a cancellation request guarantees all of the following:

1. One convergent cancellation intent is stored with authenticated requester or
   recognized source, purpose, safe reason, time, and ordering evidence.
2. Every current or later valid executor observes it at the next required
   cancellation checkpoint and before any later effect checkpoint.
3. When cancellation wins, current attempts are fenced so no later external
   effect may begin.
4. Terminalization waits until no stale/current attempt can begin another
   effect and all already begun effects are classified or the Task is placed in
   an indeterminate recovery condition.
5. Already committed effects remain visible and are never claimed to have been
   undone.
6. The cancellation request does not guarantee that no effect occurred, that an
   in-flight remote operation was reversed, or that cancellation beats an
   earlier terminal commit.

### Accepted cancellation race matrix

| Race/event | Winner rule | Task outcome | Effect/Result rule | Retry/restart rule |
|---|---|---|---|---|
| Cancellation before queue | Intent commit wins before queue/start | `cancelled` after fencing | Zero effects | Queue publication must observe terminal/intent; exact cancel retry reads same outcome |
| Cancellation while queued | Intent/checkpoint wins before worker start | `cancelled` | Zero effects | Stale queue delivery cannot start; restart reloads intent |
| Cancellation before running transition | First valid start checkpoint or cancel winner serializes | Cancel winner: `cancelled`; start winner: `running` until later resolution | Start winner still must check before effect | Losing operation reloads authoritative Task version |
| Running cancellation before effect | Cancel intent wins first effect checkpoint | `cancelled` | Zero effects | Attempt fenced; handler abort signal is only a mechanism |
| Cancellation after one partial effect | Cancel wins next effect checkpoint | `cancelled` | Partial effects immutably recorded; no remaining effect | Restart must retain effect checkpoint and intent |
| Cancellation versus terminal completion | First unique terminal/cancellation-winner serialization controls | Completion first: `completed`; cancel first: `cancelled` after fencing | Winner's Result records proven effects | Loser reads existing terminal snapshot; no rewrite |
| Duplicate exact cancellation | Existing intent/outcome controls | No new transition | Same safe intent/effect facts | Converges on same intent and terminal outcome |
| Conflicting cancellation reason/requester | Original valid intent remains; authorization/equality checked | No mutation from conflict | No added effect claim | H-12 may hide existing intent |
| Unauthorized cancellation | No winner; request rejected | Unchanged | No effect claim | Repetition requires valid authority; cannot infer Task existence |
| Cancellation unsupported | No intent accepted | Unchanged | Execution policy unchanged | Retry cannot silently enable support |
| Crash after cancel intent | Durable intent remains pending checkpoint | Last proven state until fenced, then `cancelled` or indeterminate | Preserve begun/committed effect evidence | Recovery processes same intent; never creates new Task |
| Timeout versus cancellation | First authoritative winner checkpoint controls safe reason; terminal compare-and-commit remains unique | `timed_out` or `cancelled` | Same zero/partial effect requirements | Repeats read winner; no reason rewrite |
| Connection/revocation stop trigger versus cancellation | Both use the same intent/checkpoint ordering; earliest valid trigger category retained | Usually `cancelled` if stop wins; `failed` only for a distinct proven execution/integrity failure | Result records `authority_withdrawal` or requester cancellation reason and effects | H-11 evidence may be recovered; no acceptance rewrite |
| Restart during cancellation | Reload intent, Task version, attempts, fences, effect checkpoints | Resume stop processing; do not infer terminality | No new effect until safe check proves eligibility | Same Task and intent; stale workers rejected |

### Accepted terminal race table

| Race/boundary | Serialization rule | Result rule | Crash/restart rule |
|---|---|---|---|
| Completion vs cancellation | Earlier valid unique terminal/cancellation-winner commit controls | Completed or cancelled with exact effect classification | Reload winner; loser cannot overwrite |
| Failure vs cancellation | Earlier valid terminal/cancellation-winner commit controls | Preserve failure or cancellation reason and effect facts | No reason/state mutation on replay |
| Timeout vs completion | Terminal commit strictly before deadline wins completion; at/after deadline timeout wins unless timeout cannot safely terminalize due unresolved effect | Result binds order and effects | Preserve original deadline and terminal sequence |
| Timeout vs failure | Earlier valid terminal commit/winner controls | Preserve timeout or failure category | Reload winner; no clock-based reinterpretation |
| Timeout vs cancellation | Earlier authoritative winner checkpoint selects category; unique terminal commit binds it | Same zero/partial effect model | No later reason substitution |
| Crash before terminal commit | No terminal state is asserted | Recover/fence attempt and reconcile effects; terminalize only from proof | Same Task; no blind effect retry |
| Crash after terminal commit before response | Terminal outcome exists | Same immutable Result | Exact caller retry/read returns same outcome |
| Crash after terminal commit before Receipt | Terminal outcome exists; Receipt may be pending | Result unchanged | Materialize same semantic Receipt from snapshot |
| Duplicate worker terminal attempts | Current Task version/fence and first unique commit win | One Result only | Losing worker reads winner and stops |
| Split-brain terminal attempts | Only authoritative serialized store/checkpoint may select one; inability to prove one is indeterminate | Never merge or invent Result | Quarantine, fence both sides, recover exact winner under H-11/H-14 |

An abort signal, socket close, process exit, queue acknowledgement, or lease
expiry is not itself a cancellation or timeout winner. It is evidence used by
the fenced recovery process.

## Deadline and timeout model

The accepted decision separates these clocks and boundaries:

| Boundary | Purpose | H-09 effect | Owner of remaining mechanics |
|---|---|---|---|
| Invocation admission deadline | Limits creation of new accepted work | H-07 checks before acceptance; rejection creates no Task | H-07 semantics; H-12 wire |
| Task execution deadline | Limits remaining Task execution/effects | Immutable in accepted Task; equality times out absent earlier terminal commit | H-09 semantics; H-10 time encoding; H-12 wire |
| Cancellation-request timing | Orders intent against terminal/effect checkpoints | Does not extend deadline | H-09 semantics; H-12 transport |
| Proof/authentication freshness | Validates current request/proof | Separate from Task failure and deadline | H-05/H-10/H-11 |
| Connection expiry | Controls new Connection authority/stop trigger policy | Does not erase accepted Task | H-07/H-11 plus H-09 stop consequence |
| Approval expiry | Controls H-08 pre-admission consumption | No post-acceptance restoration/change | H-08 |
| Result-content retention expiry | Removes allowed full content | Leaves terminal tombstone | H-09 relationship; H-14 duration |
| Task-tombstone retention expiry | Bounds minimum historical record | Must cover every surviving idempotency/replay/support dependency | H-14 duration/support |
| Receipt verification horizon | Bounds proof/history availability | Does not change terminal Task/Result | H-10/H-11/H-14 |

For the Task execution deadline, the authoritative storage/checkpoint clock is
used. Request arrival, client time, worker-local cached time, response time, and
poll timing do not control. At `now >= deadline`, timeout wins unless a valid
terminal Task/Result commit serialized strictly before the boundary. Restart
preserves the original deadline. No in-place extension is inferred from delay,
retry, recovery, suspension, or outage.

If the accepted action/profile explicitly binds an extension mechanism, future
normative work must define its maximum, actor, consent, serialization, effect
checkpoint interaction, and evidence. Without that pre-bound mechanism, more
time requires separately authorized new work; the old Task is not edited.

## Retry and execution-attempt model

| Operation | Identity | May create/advance work? | Convergence rule | Required safety property |
|---|---|---:|---|---|
| Caller exact Invocation retry | Original Invocation/idempotency and Task | No new Task | Return/reference same accepted Task under H-07 | Full equality and current disclosure authorization |
| Task polling | Task | No | Read current authoritative snapshot | No state/deadline/retention change |
| Internal execution retry | New attempt under same Task | Yes, only remaining authorized work | Attempt sequence/fence under unchanged Task | Effect idempotency/checkpoint proof; stale attempt blocked |
| Cancellation retry | Same Task and cancellation intent identity/equality | May complete processing of existing intent, not create work | Return same intent/current terminal outcome | No reason/state rewrite; authorization rechecked |
| Result retrieval retry | Same Result | No | Return same available content or tombstone | Scope/disclosure and retention boundary enforced |
| Receipt materialization/delivery retry | Same Receipt semantic identity | No Task execution | Regenerate/redeliver same semantic evidence | Immutable snapshot; proof/history policy; no new Result |

Attempt failure is not automatically Task failure. A retry is permitted only
when the selected action/profile and the proven effect history make another
attempt safe. A terminal Task never returns to `running`; a retry request after
terminality is a read/replay of the existing terminal result.

## Polling and retrieval model

Polling is read-only. An authoritative response reflects a durable snapshot;
cache metadata and scheduling hints may help a client choose its next read but
cannot grant authority or promise a future state.

### Accepted polling matrix

| Durable condition | Authoritative facts available | Advisory facts permitted | Required semantic behavior |
|---|---|---|---|
| Nonterminal Task | Task ID/state/version, deadline, safe progress, cancellation-intent acknowledgement if disclosure permits | Suggested delay/backoff category, safe next-action category | No Result; Receipt policy may be named but no terminal Receipt claim |
| Terminal with full Result | Terminal Task, full authorized Result, Receipt state/reference | Cache/revalidation hint | Return same immutable Result; never resume work |
| Terminal with Result content expired | Terminal Task and minimum Result tombstone/commitment | Archival-support hint | Do not reconstruct output; distinguish content expiry internally |
| Receipt pending materialization | Terminal Task/Result and Receipt semantic identity/intent | Suggested proof-retry delay | Do not report Task nonterminal or rerun execution |
| Terminal tombstone only | Minimum safe terminal/idempotency/effect/provenance facts | Support contact/archive category | No content resurrection; no Task ID reuse |
| Connection suspended | Same retained layer if separately authorized | Reauthentication/recovery hint | Polling does not resume Connection or Task |
| Connection terminal | Same retained historical layer if separately authorized | None required | Historical read grants no new work/cancellation authority |
| Caller no longer disclosure-authorized | No protected Task/Result/Receipt facts | Generic safe retry/authentication hint if H-12 permits | Do not reveal existence, tenant, state, timing, or retention detail |

An advisory poll hint does not extend the Task deadline, authentication proof,
Connection, Approval, Result retention, Receipt horizon, or tombstone horizon.
Polling before or after the hint has identical authority semantics.

## Task/Result/Receipt coupling

### Accepted authority table

| Fact | Authoritative object/source | Task role | Result role | Receipt role |
|---|---|---|---|---|
| Task identity | H-07 acceptance bundle / Task | Primary | Must bind same Task | Must bind same Task |
| Lifecycle state | Task durable state | Primary | Terminal Result must agree | Evidence must agree |
| Execution outcome | Atomic terminal Task/Result commit | Names terminal category | Primary semantic detail | Evidence only |
| Output | Result or immutable Result content reference | Reference only | Primary | Commitment/evidence only |
| Effect summary | Result and terminal snapshot | May expose safe projection | Primary | Evidence must preserve it |
| Attempt evidence | Terminal snapshot/Result bounded summary | Current attempt metadata only | Primary bounded terminal summary | May prove commitment |
| Cryptographic proof | Receipt proof under H-10/H-11 | None | May carry commitment | Primary proof carrier when selected |
| Historical verification | Immutable terminal context plus H-10/H-11 history | Supplies release/Task context | Supplies semantic snapshot | Supplies proof and key/revocation history |

### Accepted terminal transaction

The terminal commit atomically and durably stores or binds:

- final Task state and monotonic Task version/fence;
- terminal serialization time and safe reason/outcome category;
- immutable Result identity and complete semantic Result commitment;
- permitted Result content or immutable content reference;
- zero/partial/complete effect classification and bounded effect commitment;
- bounded attempt and checkpoint summary;
- cancellation/timeout/authority-withdrawal ordering evidence where applicable;
- selected Receipt policy;
- one canonical Receipt semantic identity/issuance intent when selected, or an
  explicit no-Receipt marker;
- immutable Receipt-input snapshot sufficient for deterministic generation;
- idempotency/Invocation/Task linkage; and
- durable audit-intent reference that cannot substitute for the transaction.

The semantic outcome is indivisible even if physically stored across records.
A storage adapter that exposes some components without a provable single
outcome leaves the Task indeterminate and cannot claim terminal success or
failure.

### Accepted Receipt model

- Task terminality comes from the terminal Task/Result commit, not Receipt
  bytes or delivery.
- Receipt records evidence about the already terminal snapshot and supplies no
  Invocation, Approval, cancellation, or execution authority.
- The Receipt policy is fixed at Task acceptance and cannot be weakened later.
- If the policy selects/requires Receipt, the terminal transaction binds the
  semantic identity and immutable generation snapshot.
- Final proof bytes, signatures, algorithms, digest encoding, canonicalization,
  and historical proof verification remain H-10/H-11.
- Postcommit materialization is idempotent. A crash, signer outage, key-service
  outage, delivery failure, or acknowledgement loss cannot rerun the Task.
- A later Receipt cannot change terminal state, Result, effect summary, attempt
  facts, or terminal time.
- Receipt outcome must agree with Task/Result. Partial-effect and compensation
  evidence may supplement it but cannot replace the original outcome.
- A pre-Task rejected Invocation receives no Execution Receipt for accepted
  work. H-12 may define a safe signed error or admission evidence object, but it
  is not an Execution Receipt unless a later human decision explicitly changes
  this boundary.

## Retention and tombstone model

Option B defines semantic retention relationships, not numeric deployment
durations. The retained layer for any object must last through the greatest
applicable idempotency, replay-prevention, Result-support, Receipt-verification,
historical-release, audit/dispute, and surviving-reference horizon selected by
H-14.

### Accepted retention matrix

| Layer | Minimum semantic contents | Earliest permissible expiry relationship | Behavior after expiry | Concrete policy owner |
|---|---|---|---|---|
| Live Task | Complete acceptance bundle, current lifecycle/version, deadline, progress, attempts/fences, cancel/stop intent, effect checkpoints, idempotency link | Not before terminal commit or exact fail-closed recovery of accepted history | Cannot be deleted to escape terminalization or replay checks | H-14 reliability/storage profile |
| Terminal Task | Task identity, terminal state/time/version, Result reference, Receipt policy/reference, accepted context | Full projection may minimize only after minimum tombstone is durable | Reads fall back to tombstone; never nonterminal | H-14 duration |
| Full Result | Authorized output/reference, full bounded effect/failure/attempt details, terminal context | May expire before Task/Result tombstone if Data Contract/profile and H-14 allow | Output/detail unavailable; semantic commitment and safe effect class remain | H-14 plus Data Contract/privacy policy |
| Receipt semantic record | Receipt policy, identity/intent, immutable input snapshot/commitment, materialization status | Must survive every selected materialization/delivery and verification dependency | No new Receipt semantics may be invented | H-10/H-11/H-14 |
| Receipt proof/materialization | Signed/proved bytes, key/proof references, delivery evidence | May have a distinct archival/verification horizon; cannot expire before required support | Historical verification may become explicit indeterminate, never semantic Task change | H-10/H-11/H-14 |
| Idempotency record | Invocation/idempotency identity, equality/commitment, Task ID, conflict-safe evidence | Must cover every supported retry and Task identity reuse-prevention horizon | Expiry cannot make surviving Task identity reusable | H-14 support policy |
| Effect summary | Zero/partial/complete class and immutable safe effect commitment/reference | At least as long as terminal tombstone and any surviving Receipt/dispute dependency | Never convert partial/complete to zero by deletion | H-14/privacy policy |
| Minimum tombstone | Inventory below | Last layer to expire; only after every supported dependency ends and no surviving reference can be misread | Deletion still is not proof work never existed | H-14 governance |
| Audit/history reference | Safe commit/event IDs, ordering/provenance needed for verification | May differ from Task/Result content but cannot be shorter than a dependency it alone proves | Loss makes verification indeterminate, not permission | H-11/H-12/H-14 |

### Accepted minimum tombstone inventory

The minimum tombstone retains sufficient immutable, bounded, secret-free
evidence for:

- Task identity;
- Invocation identity;
- idempotency identity or future H-10-qualified commitment;
- terminal state, terminal time, terminal Task version, and winner category;
- exact selected protocol release and profile/capability/output-contract
  context needed for interpretation;
- immutable Connection, organization, explicit workspace absence/value, Agent,
  Passport, and scope bindings needed for historical interpretation;
- safe Result identity and semantic commitment;
- safe Result effect classification;
- Receipt policy and Receipt identity/commitment where selected;
- replay-prevention and conflict evidence;
- historical migration/provenance classification;
- retention class, expiry boundary, and minimization version; and
- immutable references to required audit/history anchors.

It excludes raw credentials, bearer material, private keys, unrestricted
inputs/outputs, prompts, hidden reasoning, private memory, private policy rules,
stack traces, queue/lease/process identifiers, and unnecessary provider
payloads.

Full Result deletion must not erase the Result identity/commitment or change the
effect class. Tombstone deletion must never by itself prove that work did not
exist. An old Task or idempotency identity cannot become reusable while any
supported replay, history, Result, Receipt, audit, or reference horizon remains.

## Restart, crash, rollback, and split-brain recovery

### Accepted restart/integrity matrix

| Observation | Classification | Permitted recovery | Prohibited behavior |
|---|---|---|---|
| Clean restart with complete `accepted` | Known accepted work | Reload bundle/deadline/intents; queue or start under current fence | Re-admit Invocation or restore Approval |
| Clean restart with complete `queued` | Known queued work | Reconcile durable dispatch; claim under new fence | Treat queue message as a second Task |
| Running worker disappeared before any effect | Attempt ended/lease lost, effect-free proven | Fence old attempt; apply retry policy under same Task | Reuse old fence or create new Task |
| Running worker disappeared after effect began | Effect outcome may be unknown | Mark indeterminate recovery; reconcile authoritative effect evidence | Blind retry, terminal zero-effect claim |
| Queue lease lost | Operational lease event | Current Task/fence controls; safe requeue only after old claim fenced | Infer cancellation or failure from lease alone |
| Terminal write acknowledged but response lost | Known terminal if durable reread matches | Return same Task/Result; deliver/materialize Receipt as selected | Execute again or create another Result |
| Terminal call returned ambiguous | Commit outcome unknown | Reread by Task/transaction/Result IDs and verify complete bundle | Assert clean failure or start replacement work |
| Result committed, Receipt not materialized | Known terminal with pending Receipt | Materialize same Receipt from immutable snapshot | Keep Task running or rerun Task |
| Stale cache says nonterminal | Stale projection | Durable current Task version/terminal bundle wins; invalidate cache | Serve cache as authority or revive worker |
| Duplicate worker | Competing attempts | Current fence alone may proceed; stale attempt stops before effect/terminal write | Merge outputs or allow duplicate effect |
| Rollback detected | Integrity violation | Quarantine; recover exact monotonic history under H-11/H-14 | Accept lower version, reuse identity, restore Approval |
| Split brain | Conflicting authoritative candidates | Fence both domains until one committed history is proven; quarantine namespace if not provable | Pick by timestamp, response arrival, or majority without approved mechanism |
| Corrupt Task | Integrity violation | Restore exact verified record or retain non-authorizing external classification | Guess state or synthesize Result/Receipt |
| Missing Task with existing idempotency record | Inconsistent accepted history | Quarantine and recover referenced Task/transaction | Delete idempotency record or create replacement Task |
| Task exists without H-07 acceptance evidence | Integrity violation/legacy ambiguity | Stop governed execution; classify/migrate only with proof | Invent acceptance, Approval, or Connection history |
| Terminal Task without Result commitment | Invalid partial terminal state | Recover exact terminal transaction from durable evidence; otherwise indeterminate | Publish terminal output or create a guessed Result |
| Tombstone only | Valid minimized terminal history | Serve authorized tombstone projection; preserve replay prevention | Rehydrate deleted content from current defaults |

The minimum safe restart state therefore includes the complete H-07 acceptance
bundle, current Task state/version, original deadline, idempotency binding,
cancel/stop intent, attempt/fence and effect-checkpoint summaries, terminal
bundle when present, Receipt policy/snapshot, retention metadata, and integrity
anchor. Process memory, queue delivery, cache state, and worker identity cannot
replace it.

An indeterminate condition may clear only when recovery proves one exact
committed history and restores its original semantic facts. Recovery may not
change a terminal Task, erase partial effects, restore Approval, add capability,
extend deadline, or authorize another effect.

## Connection/revocation after acceptance

The accepted Option B decision defines the following explicit resolution of the H-07 deferred
boundary:

1. H-07 acceptance is permanent historical fact. Later Connection suspension,
   expiry, closure, revocation, or replacement does not make the Task disappear
   and does not restore H-08 Approval.
2. A Connection event affects remaining work only if the exact selected
   release/profile accepted for the Task defines that event/source as an
   authoritative stop trigger. Current defaults or an unrelated policy change
   cannot add the trigger afterward.
3. A valid stop trigger records cancellation-class intent with an immutable
   `authority_withdrawal` reason category and competes at the same
   cancellation/effect checkpoints.
4. If the stop trigger wins before an effect checkpoint, that effect and every
   later effect are prohibited. Once attempts are fenced, the Task becomes
   `cancelled` and Result records zero or partial effects.
5. If a terminal Task/Result commit wins first, the existing outcome remains.
   Later Connection evidence may affect disclosure or historical verification,
   never the Task outcome.
6. An effect begun under a valid earlier checkpoint is not claimed undone by a
   later stop trigger. Its outcome must be reconciled before terminalization or
   the Task remains indeterminate.
7. If the executor cannot validate required current stop-trigger evidence at a
   checkpoint, it must not begin another external effect. This is a fail-closed
   execution/recovery condition, not automatic proof of revocation.
8. H-11 retains source authority, effective time, checkpoint, freshness,
   anti-rollback, compromise, key history, and historical Receipt verification.
9. Ordinary loss of polling/disclosure access, client disconnection, transport
   abort, or Agent process shutdown is not semantic Task cancellation unless a
   separately authenticated recognized stop request commits.

Compatibility cost is that current implementations that automatically continue
all accepted work or automatically rewrite it `revoked` cannot claim this model
without later migration and conformance work. Security benefit is that later
authority withdrawal can fence remaining effects without erasing evidence or
inventing retroactive invalidity. Residual risk is an already begun irreversible
effect; H-09 can preserve and expose that fact but cannot undo it.

## Compatibility and legacy migration

H-03 controls every migration. Historical bytes, labels, and meanings remain
unchanged. A migration record may append provenance and a successor projection,
but it cannot backfill acceptance, Approval consumption, Result content,
effect checkpoints, Receipt bindings, or terminal evidence that the source did
not contain.

### Accepted classification vocabulary

| Classification | Meaning | Permitted treatment |
|---|---|---|
| Provably mappable | Source evidence proves every Option B semantic invariant needed for the target | Create an append-only successor projection retaining original identity/provenance |
| Status-only historical | A label is known but its transition/effect/authority proof is incomplete | Preserve label and expose bounded historical status, not full Option B semantics |
| Migration-required | Safe continuation needs explicit operator/human-approved migration and new durable evidence | Do not execute until migration is authorized and completed |
| Quarantined | Integrity, scope, authority, or effect evidence conflicts | No execution, effect, Result invention, or protected disclosure |
| Ambiguous/fail-closed | Evidence cannot distinguish two safety-relevant histories | Retain ambiguity and deny authority; do not choose a favorable interpretation |

### Legacy-value migration analysis

| Legacy value/object | Default classification | Evidence required for stronger mapping | Fail-closed treatment when absent |
|---|---|---|---|
| `accepted` Task | Status-only historical | H-07-equivalent durable acceptance/idempotency/Connection context | Do not queue/execute under Option B authority |
| `queued` Task | Status-only historical | Accepted Task plus durable queue/attempt fence and deadline | Quarantine execution; preserve status |
| `running` Task | Migration-required or ambiguous | Accepted Task, current fence, attempt/effect checkpoints, deadline | Stop new effects and reconcile |
| `waiting_for_approval` Task | Ambiguous/fail-closed | Proof it is merely a workflow record, or complete later H-07/H-08 accepted commit | Treat as non-authorizing; never synthesize consumed Approval |
| `waiting_for_dependency` | Status-only historical | Proven accepted Task and last authoritative lifecycle state | Preserve as progress note only |
| `recovery_required` | Quarantined/recovery-required | Exact last committed state and reconciled effect history | No retry or terminal invention |
| `compensation_required` | Status-only historical | Original terminal Result/effect evidence and separate authorization plan | Do not perform compensation or rewrite original |
| `revoked` Task | Ambiguous/fail-closed | Exact legacy meaning, revocation source/time, accepted Task and effect history | Preserve legacy label; no automatic `cancelled` mapping |
| `rejected` Task observed outside schema | Quarantined | Proof it is a non-authoritative admission record rather than accepted Task | No Task/Result authority; preserve anomaly |
| `rejected` Receipt | Status-only historical Receipt | Exact historical schema/release and evidence | Do not reinterpret as Option B Execution Receipt or accepted Task |
| `partially_completed` Receipt | Status-only historical evidence | Proven original Task state, effects, and output commitments | Preserve partial claim without inventing specific effects |
| `compensated` Receipt | Status-only historical evidence | Proven original outcome plus separately authorized compensation Task/Result | Do not mark original completed/undone |
| Terminal Task without Result | Migration-required/ambiguous | Existing immutable output/effect/failure evidence sufficient for one Result | Tombstone/quarantine; do not synthesize missing Result facts |
| Receipt without exact Task/Connection binding | Quarantined proof | Historical verification under its original release | Do not attach to a convenient current Task |

Rolling upgrade support must keep old and new semantics release-bound. A new
implementation may read a legacy object only through an explicit legacy path;
it cannot pass it through the Option B state machine as though the object had
selected the new release. H-14 later decides supported combinations and
deprecation windows.

## Privacy considerations

The accepted model applies data minimization by semantic layer:

- Task exposes only identity, safe lifecycle/progress, deadline, policy
  capabilities, and safe references required for the authorized reader.
- Result content is separately access-controlled and may expire earlier than
  the Task/Result tombstone.
- Effect evidence is bounded to what is needed to distinguish zero, partial,
  and complete effects and to prevent concealment/substitution.
- Safe failure category excludes stack traces, private provider responses,
  internal topology, and unrestricted policy detail.
- Receipt carries commitments and bounded evidence, not unrestricted inputs,
  outputs, prompts, hidden reasoning, or private memory.
- Polling and lookup require exact tenant/Connection/Task scope and must resist
  existence, timing, cancellation, and retention oracles.
- Audit/metrics are separate projections with bounded identifiers and cannot
  duplicate Result content merely for convenience.
- Tombstones retain only the minimum safe inventory and never reusable
  credentials, bearer tokens, cookies, API keys, private keys, credential
  references usable as proof, unrestricted prompts/output, hidden reasoning,
  private memory, source code, private policy, or unnecessary provider payload.
- Privacy deletion removes the selected content layer, not historical truth,
  effect classification, or replay prevention.

H-12 owns public redaction, error detail, timing defenses, and disclosure shape.
H-14 owns concrete retention and deletion operations. Neither may remove the
minimum evidence while a supported H-09 dependency survives.

## Threat analysis

| Threat | Attacker/precondition | Unsafe outcome | Accepted H-09 mitigation | Residual risk | Future dependency |
|---|---|---|---|---|---|
| Duplicate Task creation | Lost response, concurrent exact retry, weak idempotency | Two authorities/effect streams for one Invocation | H-07 commit creates one Task; exact retry returns same identity | Storage serialization failure | D2-02/D2-04, H-11/H-14 |
| Duplicate worker execution | Duplicate delivery, lease loss, failover | Two attempts act concurrently | Attempt identities and authoritative fencing before effects/terminal write | External system may ignore idempotency | D2-02/D2-04, P1-03 |
| Duplicate external effect | Retry after ambiguous remote outcome | Repeated irreversible action | Effect checkpoints, immutable effect evidence, no blind retry under indeterminate state | Remote service lacks idempotency/status API | D1-05, P1-03, H-14 |
| Terminal rollback | Backup restore or malicious storage | Completed Task runs again | Monotonic terminal version, tombstone, fail-closed rollback response | H-11 checkpoint compromise | H-11, D2-02/D2-04 |
| Stale worker completion | Old lease holder returns late | Loser overwrites winner | Terminal compare-and-commit with current Task/attempt fence | Broken storage adapter | D2-02, P1-03 |
| Cancel/complete race | Concurrent user cancel and worker completion | State/effect mismatch | One serialized terminal/cancellation winner; loser reads winner | In-flight effect reconciliation latency | D2-02/D2-04 |
| Cancel/effect race | Cancel arrives around external action | Effect begins after promised stop | Required effect checkpoint and fencing; partial effects explicit | Remote effect may begin before checkpoint result is observable | D2-04, P1-03 |
| Timeout race | Clock/deadline versus terminal write | Late success or false timeout | Authoritative serialization clock; equality timeout; immutable ordering | Clock/checkpoint availability | H-10/H-11, D2-02 |
| Cancellation oracle | Untrusted caller probes Task IDs/states | Existence, tenant, progress leakage | Authenticated exact-scope cancellation and H-12-collapsible responses | Timing side channels | H-12, D2-04 |
| Cross-tenant Task lookup | Guessed/stolen Task ID | Task/progress disclosure | Task ID is untrusted; exact inherited scope and disclosure authorization | Compromised authorized principal | H-12, P1-03 |
| Cross-Connection Result retrieval | Reference substitution | Output/effect disclosure | Result binds Task, Invocation, Connection, release, and tagged scope | Historical authorization policy complexity | H-12/H-14, D2-01/D2-04 |
| Result substitution | Storage or response swaps Result | Wrong output/effects trusted | Atomic Task/Result identity and semantic commitment; mismatch quarantined | H-10 algorithm/profile risk | H-10, D2-03/D2-04 |
| Receipt/Result mismatch | Malicious signer/store/projection | Proof appears to validate another outcome | Receipt must bind immutable terminal snapshot; mismatch never changes truth | Signer/key compromise | H-10/H-11, D2-03/D2-04 |
| Partial-effect concealment | Executor reports cancellation/failure without effects | Duplicate/unsafe remediation | Required zero/partial/complete Result fact and retained commitment | Effects outside observable boundary | D1-05, H-14, P1-03 |
| Compensation laundering | Actor labels follow-up as undo | Original harm/history hidden; unauthorized work | Original Result immutable; compensation is linked separate governed Task | External manual compensation evidence | D2-04, H-12/H-14 |
| `rejected` treated as accepted work | Legacy/client state mismatch | Execution or Receipt authority without H-07 commit | Rejection is pre-Task; no Task/Result/Execution Receipt | Legacy artifacts remain ambiguous | D2-01/D2-04, H-12 |
| Waiting-for-Approval Task used as authority | Current schema/code creates placeholder Task | Work starts before H-08 consumption | No accepted Task before atomic H-07/H-08 commit | Product migration error | D2-02/D2-04, P1-03 |
| Revocation rewrites history | Later authority event applied retroactively | Accepted/effected work disappears or changes outcome | Preserve acceptance/result; stop only remaining effects through bound trigger | H-11 effective-time ambiguity | H-11, D2-04 |
| Restart resurrects terminal Task | Cache/store recovery loses terminal row | New worker runs completed work | Durable terminal bundle/tombstone, monotonic fence, terminal no exits | Catastrophic loss of all anchors | H-11/H-14, D2-02 |
| Tombstone deletion enables replay | Retention job removes identity evidence | Old idempotency/Task ID reused | Minimum tombstone covers every surviving dependency horizon | Misconfigured H-14 policy | H-14, D2-04 |
| Poll timing/existence leakage | Cross-scope requester measures response | Tenant/work existence inferred | Purpose/scope authorization, bounded hints, collapsible error/timing policy | Network-level timing leakage | H-12, P1-03 |
| Result retained too long | Broad storage or logs copy content | Privacy breach | Separate full-content expiry and minimum tombstone; prohibit content duplication | Legal hold/support conflict | H-12/H-14 |
| Result deleted too early | Retention shorter than retrieval/proof support | Client cannot verify outcome; retry truth lost | Dependency-max retention relationship and safe tombstone | Archive outage | H-14, P1-03 |
| Stale cache returns nonterminal | Projection lags terminal store | Client/worker assumes work continues | Durable version/terminal bundle wins; caches non-authoritative | Short stale disclosure window | H-12/H-14, D2-04 |
| Split-brain terminal commits | Partitioned stores each accept writer | Two terminal Results/effects | One authoritative serialization/fence; otherwise quarantine and fail closed | Consensus/checkpoint failure | H-11/H-14, D2-02 |
| Receipt signer outage causes re-execution | Terminality coupled to signature | Duplicate work to obtain Receipt | Commit semantic terminal snapshot first; retry Receipt only | Extended proof unavailability | H-10/H-11/H-14 |
| Malicious worker claims completion | Worker supplies fabricated output/effects | False Result/Receipt | Current fence, output/effect validation, atomic terminal authority, independently verifiable commitments | Agent/storage compromise | H-10/H-11, P1-03 |
| Deadline extension by retry/poll | Client or scheduler delays/retries | Work proceeds beyond consented bound | Immutable accepted deadline; hints and retry cannot extend | Pre-bound extension mechanism may be complex | D2-02, H-12 |
| Deletion interpreted as nonexistence | Missing row after minimization | Replacement Task/effect authorized | Deletion is never proof; idempotency/tombstone lookup fails closed | Total provenance loss | H-11/H-14 |
| Receipt used as authorization | Holder presents valid Receipt | New work or Result access granted | Receipt is evidence only; current authorization and scope still required | Application-level misuse | H-02, H-12, P1-03 |

## Required future vectors/cases

This accepted decision identifies future work; it creates no fixtures, vectors, schemas,
state machines, or tests.

| Future case | Primary later work | Required assertion |
|---|---|---|
| `accepted -> queued -> running -> completed` | D2-02/P1-03 | One Task/Result; legal guards and terminal snapshot |
| `accepted -> running -> completed` | D2-02/P1-03 | Direct dispatch is legal and equivalent in terminal semantics |
| Accepted-state cancellation | D2-02/D2-04 | Zero effects; queue/start fenced |
| Queued cancellation | D2-02/D2-04 | Stale delivery cannot start |
| Running cancellation before effect | D2-02/D2-04 | Zero-effect cancelled Result |
| Running cancellation after partial effect | D2-02/D2-04/P1-03 | Partial effects remain visible; no later effect |
| Cancellation loses to completion | D2-02/D2-04 | Completed terminal snapshot unchanged |
| Failure versus cancellation | D2-02/D2-04 | First serialized winner; safe effect facts |
| Timeout loses/wins by serialization order | D2-02/D2-04 | Exact terminal order, no clock reinterpretation |
| Equality at deadline | D2-02 | `now == deadline` times out absent earlier terminal commit |
| Duplicate exact Invocation retry | D2-02/D2-04 | Same Task identity, no second effect |
| Conflicting idempotency retry | D2-04 | No mutation or protected result disclosure |
| Duplicate worker | D2-02/D2-04 | One current fence; stale attempt cannot effect/terminalize |
| Stale worker terminal write | D2-02/D2-04 | Compare-and-commit rejects loser |
| Restart in `accepted` | D2-02 | Same acceptance/deadline/idempotency, no re-admission |
| Restart in `queued` | D2-02 | Same Task and durable dispatch reconciliation |
| Restart in `running` before effect | D2-02/D2-04 | Old attempt fenced; safe retry only under same Task |
| Restart in `running` after effect began | D2-02/D2-04 | Indeterminate until effect reconciliation; no blind retry |
| Response lost after terminal commit | D2-04/P1-03 | Same terminal Task/Result returned |
| Receipt generation crash/retry | D2-04/P1-03 | Same Receipt semantic identity; no Task execution |
| Receipt signer outage | D2-04 | Task stays terminal; materialization remains pending |
| Result/Receipt mismatch | D2-01/D2-04 | Receipt quarantined; Task/Result unchanged |
| Result content expires with tombstone retained | D2-01/D2-04 | Output unavailable; identity/state/effect/replay truth remains |
| Historical Task retrieval after Connection terminality | D2-04/P1-03 | Authorized read works without new authority; unauthorized read leaks nothing |
| Rollback | D2-02/D2-04 | Lower state/version rejected; terminal not resurrected |
| Split brain | D2-02/D2-04 | No guessed winner or merged Result |
| Corrupt Task | D2-04 | Quarantine; no effect/replacement/Result invention |
| Missing Task with idempotency record | D2-04 | Recovery only; no replacement Task |
| Cross-scope Result lookup | D2-04/P1-03 | No content/existence disclosure |
| Unsupported cancellation | D2-01/D2-04 | No intent/state change; fixed accepted capability |
| Duplicate cancellation retry | D2-02/D2-04 | Same intent/current outcome |
| Pre-Task rejection | D2-01/D2-04 | No Task, Result, or accepted-work Receipt |
| Waiting-for-Approval workflow | D2-02/D2-04 | No Task authority and no execution |
| Dependency waiting | D2-01/D2-02 | Progress only; deadline and state authority unchanged |
| Recovery-required legacy/current condition | D2-02/D2-04 | Orthogonal quarantine; no lifecycle invention |
| Compensation | D2-01/D2-04/P1-03 | Separate authorized work; original outcome immutable |
| Partial effects after cancellation/failure/timeout | D2-01/D2-04 | Effect classification survives content minimization |
| Later Connection stop trigger | D2-02/D2-04 | Acceptance preserved; checkpoint ordering controls remaining effects |
| Transport abort while Task continues | D2-04/P1-03 | No semantic cancellation without cancel intent |
| Terminal Task with Receipt policy `none` | D2-01/D2-04 | Explicit marker; no fabricated Receipt |
| Terminal Task with Receipt pending | D2-01/D2-04 | Terminal Result queryable; proof retry only |

D2-01 owns future wire schemas; D2-02 owns the executable Task state machine and
atomic/race invariants; D2-04 owns malicious, failure, persistence, and
compatibility fixtures; P1-03 owns independent bidirectional interoperability
evidence where the plan applies. H-13 does not own all conformance semantics.

## Residual future-decision ownership

### H-10

H-10 owns:

- canonical JSON and UTF-8;
- Result/Receipt canonical bytes;
- semantic commitment and digest construction;
- signatures and proof profiles;
- domain separation; and
- exact cryptographic linkage.

H-10 may encode the H-09 semantic equality and snapshot but may not redefine
Task birth, state, Result authority, race winners, effects, or retention
relationships.

### H-11

H-11 owns:

- revocation bootstrap and source mechanics;
- key history;
- anti-rollback/checkpoint algorithms;
- historical Receipt verification; and
- compromise-history interpretation.

H-11 may authenticate and order an authority-withdrawal trigger but may not
erase an accepted Task or rewrite its terminal Result.

### H-12

H-12 owns:

- HTTP resources/routes;
- methods and status codes;
- media types;
- transport cancellation/abort mapping;
- public error representation and precedence;
- retry headers;
- polling wire hints;
- streaming;
- public redaction/disclosure; and
- timeout wire behavior.

H-12 may collapse sensitive public outcomes but may not change H-09 state
effects, cancellation guarantees, or authoritative ordering.

### H-13

H-13 owns only:

- schema openness;
- unknown fields/messages/enums;
- extension namespaces;
- required/optional extension semantics;
- canonical extension forwarding; and
- extension/experiment evolution.

H-13 cannot add Task states or weaken the H-09 base model merely by permitting
an extension.

### H-14

H-14 owns:

- concrete support/deprecation windows;
- concrete operational retention durations;
- implementation support matrices;
- archival/support qualification;
- independent reproduction;
- release evidence; and
- Protocol 1.0 graduation.

H-14 selects durations and service qualifications that satisfy H-09's minimum
dependency relationships; H-09 does not select arbitrary numbers.

### D2 and P1 work

`D2-01`, `D2-02`, `D2-04`, and `P1-03` own later executable schema,
state-machine, failure, black-box, and interoperability work as assigned above.
Nothing in this accepted decision authorizes that work.

## Governance boundaries

The dependency chain remains:

- Understanding != proposal
- Proposal != approval
- Approval != normative specification
- Normative specification != schema/state machine
- Schema/state machine != implementation
- Implementation != conformance
- Conformance != release
- Release != Protocol 1.0

H-09 acceptance and this recording step alone:

- closes no `GB-*` gap;
- creates no normative requirement;
- creates no schema or executable state machine;
- creates no fixture or test vector;
- changes no wire format;
- changes no Task, Result, cancellation, Receipt, retention, SDK, Agent, Client,
  Core, Trust, Platform, storage, script, test, or conformance behavior;
- authorizes no migration, deployment, publication, or release; and
- makes no Protocol 1.0 claim.

H-01 through H-08 remain ACCEPTED and are not superseded. H-09 acceptance fills
only the H-09 human-governance decision. H-10 through H-14 remain deferred.
Separate authorization remains required for normative text, schemas,
executable state machines, fixtures, vectors, tests, implementation, migration,
conformance, interoperability, and release.

## Human approval record

The following completed disposition is derived only from the verified approval
source embedded verbatim below:

- Approver: Rudra
- Approval date: 2026-08-09
- Approved option: Option B — Minimal durable Task lifecycle with orthogonal intents/evidence
- Qualifications: The complete qualifications and deferred-authority terms in the embedded verified human approval source.
- Accepted risks: The eight accepted risk categories in the embedded verified human approval source.
- Compatibility impact accepted: The complete compatibility-impact statement in the embedded verified human approval source.
- Security impact accepted: The complete security-impact statement in the embedded verified human approval source.
- Sign-off/reference: H-09-human-approval-rudra-2026-08-09.txt; SHA-256: 403804DE94357364F08EFDD9E3945EBFA70BDFAE9078DE3E52B0DA0B6658E986; and the verbatim block below.
- Resulting status: ACCEPTED

Approval source filename:
`H-09-human-approval-rudra-2026-08-09.txt`

Approval source SHA-256:
`403804DE94357364F08EFDD9E3945EBFA70BDFAE9078DE3E52B0DA0B6658E986`

The standalone approval source remains excluded from the repository working
tree and is not itself committed. The embedded text and digest are the
reviewable governance evidence recorded here.

<!-- H-09 HUMAN APPROVAL SOURCE BEGIN -->
H-09 HUMAN APPROVAL

Decision: H-09 — Task, result, cancellation, and retention model
Approver: Rudra
Approval date: 2026-08-09
Approved option: Option B — Minimal durable Task lifecycle with orthogonal intents/evidence
Resulting status: ACCEPTED

I, Rudra, explicitly approve H-09 Option B as specified in the reviewed H-09 decision record, subject to the qualifications and accepted risks below.

APPROVED SEMANTIC DISPOSITION

1. A protocol Task first exists only at the final H-07 durable Invocation-acceptance commit. Pre-admission validation, Approval workflow, queue publication attempts, locks, worker leases, transport responses, retries, polling, recovery activity, and Receipt generation do not create Task authority.

2. The Task lifecycle is exactly:
   Nonterminal: accepted, queued, running.
   Terminal: completed, failed, cancelled, timed_out.
   Terminal states are irreversible and have no exits.

3. rejected is a pre-Task Invocation admission outcome. A rejected Invocation creates no protocol Task, no terminal Result, and no Execution Receipt for accepted work.

4. waiting_for_approval is not a protocol Task state. Approval remains pre-admission under H-08 and, where required, is consumed atomically with H-07 Task acceptance.

5. waiting_for_dependency is a safe progress/substatus category under accepted work and grants no additional authority.

6. recovery_required is an orthogonal fail-closed integrity/recovery condition over the last proven Task state and is not a lifecycle state.

7. compensation_required and compensated are Result/effect/follow-up facts. Compensation does not rewrite the original Task or Result. Governed compensation work requires a separately authorized Invocation and Task.

8. revoked is not an original Task lifecycle state. Later authoritative withdrawal may stop remaining interruptible work only through a release/profile-bound stop trigger. It cannot erase Task acceptance, restore Approval, or rewrite already committed effects or terminal history.

9. Task identity is immutable across caller retry, worker attempts, restart, cancellation, timeout, recovery, Result retrieval, and Receipt materialization.

10. Worker attempts are subordinate to one Task. Attempts require distinct identity, ordering, and fencing evidence. A stale attempt cannot begin a new external effect or overwrite a terminal winner.

11. Cancellation support and the recognized cancellation/stop policy are fixed in the accepted Task authority bundle and cannot silently widen later.

12. Durable acceptance of cancellation records one convergent cancellation intent. It guarantees checkpoint observation and fencing of later effects once cancellation wins. It does not guarantee that no earlier effect occurred or that an already begun irreversible external action was undone.

13. Cancellation before any committed effect may terminalize the Task cancelled with zero effects. Cancellation after committed effects may terminalize the Task cancelled with partial effects, and those effects remain immutably represented.

14. Cancel/complete, cancel/failure, cancel/effect, timeout/complete, timeout/failure, timeout/cancellation, duplicate-worker, crash, and split-brain races are resolved by authoritative serialization/checkpoint ordering and one unique terminal compare-and-commit. A committed terminal outcome cannot be rewritten by a later competing event.

15. Task execution deadline is distinct from Invocation admission deadline, Approval expiry, authentication/proof freshness, Connection expiry, Result retention, Receipt retention, and tombstone retention.

16. For the Task execution deadline, equality is timed out: at authoritative time now >= deadline, timeout wins unless a valid terminal Task/Result commit serialized strictly before the deadline.

17. No poll, retry, restart, suspension, signer outage, queue delay, or current default silently extends a Task deadline. Any permitted extension must already be explicitly bound by the accepted action/profile or require separately authorized new work.

18. Each accepted Task has exactly one logical immutable terminal Result.

19. Result is logically separate from Task, even if a later transport embeds or projects them together.

20. Task is authoritative for lifecycle state. Result is authoritative for terminal outcome details, output or immutable output reference, safe failure category, attempt summary, and zero/partial/complete effect classification. Receipt is downstream evidence about the same terminal snapshot and is not the source of Task terminality.

21. Partial completion is an immutable Result/effect fact, not a separate Task lifecycle state by default.

22. Terminal Task state and the immutable Result identity/semantic commitment must commit as one atomic durable semantic outcome.

23. The terminal transaction also binds the selected Receipt policy, one semantic Receipt identity/issuance intent when selected, or an explicit no-Receipt marker, plus an immutable Receipt-generation input snapshot sufficient for deterministic recovery.

24. Final signed/proved Receipt bytes do not need to be created inside the Task terminal storage transaction. Receipt materialization, signing, and delivery may occur afterward, but only idempotently from the immutable terminal snapshot and without re-executing Task work or repeating Approval consumption.

25. Receipt materialization failure, signer outage, key-service outage, delivery failure, or acknowledgement loss never causes Task execution or external effects to be repeated.

26. Receipt outcome/evidence must remain consistent with the terminal Task/Result snapshot. A Receipt mismatch is invalid or indeterminate evidence and cannot select a different terminal truth.

27. Polling, Result retrieval, Receipt retrieval, and tombstone retrieval are read-only. Polling hints are advisory only and grant no authority, extend no deadline, extend no retention boundary, and change no retry permission.

28. Historical Task/Result/Receipt retrieval after Connection suspension or terminality may occur only through current authenticated, exact-scope, purpose-bound disclosure authorization. Historical read authority grants no authority for new work.

29. H-07 Task acceptance remains permanent historical fact after later Connection suspension, expiry, closure, revocation, or replacement. Such later events affect remaining work only if the exact accepted release/profile defines an authoritative stop trigger.

30. A valid authority-withdrawal stop trigger competes at the same cancellation/effect checkpoints as cancellation. If it wins before remaining effects, no later effect may begin; already committed effects remain visible and are not undone.

31. Active/nonterminal Task truth, idempotency binding, deadline, cancellation/stop intent, attempt/fence state, effect checkpoints, and terminal bundle when present must survive restart as durable authoritative state.

32. Missing, corrupt, rolled-back, stale, duplicate, or split-brain Task state fails closed. It does not authorize replacement work, effect replay, identity reuse, Approval restoration, terminal-state rollback, or reconstruction from current defaults.

33. If effect history or terminal-commit outcome cannot be proven, the Task remains under an indeterminate fail-closed recovery condition. Indeterminacy grants no permission to retry an external effect or invent success/failure evidence.

34. Retention is layered. Live Task state is retained through terminalization or exact fail-closed recovery; full terminal Task/Result/Receipt material may have a shorter content-retention horizon; minimum terminal/idempotency/effect/history tombstone evidence survives every supported replay, Result, Receipt, audit, dispute, migration, and historical-reference dependency.

35. Full Result content may expire before the minimum terminal tombstone. Content deletion does not erase Task identity, Invocation/idempotency binding, terminal state/time, safe effect classification, Result/Receipt identities or commitments, replay-prevention evidence, or historical release/profile interpretation.

36. Deletion is never proof that work never existed and cannot make a Task or idempotency identity reusable while a supported dependency horizon remains.

37. Legacy 0.1-draft Task and Receipt values retain their original historical meaning. New implementations must not silently reinterpret or backfill missing acceptance, Approval, Result, effect, Receipt, or terminal evidence. Ambiguous legacy objects are classified, quarantined, or explicitly migrated without invention.

38. The approved Option B model preserves H-01 through H-08 and does not supersede them.

QUALIFICATIONS AND DEFERRED AUTHORITY

A. H-10 retains exclusive future authority over canonical JSON/UTF-8, exact Result/Receipt bytes, digests, signatures, proof profiles, domain separation, and cryptographic linkage.

B. H-11 retains exclusive future authority over revocation-source mechanics, key history, anti-rollback/checkpoint algorithms, compromise history, and historical Receipt verification.

C. H-12 retains exclusive future authority over routes, HTTP methods/status codes, media types, transport abort/cancellation mapping, public error representation, retry headers, polling wire representation, streaming, public redaction/disclosure, and timeout wire behavior.

D. H-13 retains exclusive future authority over schema openness, unknown fields/messages/enums, extension namespaces, required/optional extension semantics, canonical extension forwarding, and extension/experiment evolution. H-13 may not use extensions to weaken the accepted H-09 base semantics.

E. H-14 retains exclusive future authority over concrete support/deprecation windows, concrete operational retention durations, implementation support matrices, archival/support qualification, independent reproduction, release evidence, and Protocol 1.0 graduation.

F. D2-01, D2-02, D2-04, and P1-03 retain later executable schema, state-machine, malicious/failure/compatibility, black-box, and interoperability work as assigned by the Phase 15D plan. This approval does not authorize that work.

ACCEPTED RISKS

I explicitly accept the following residual risks and costs of Option B:

1. The accepted lifecycle intentionally differs from historical 0.1-draft schemas, current JavaScript labels, existing tests, Platform projections, and some current product behavior, so future migration and compatibility work will be required.

2. Correct implementation requires strong durable serialization, monotonic Task versions/fences, effect checkpoints, idempotent external-effect handling, atomic Task/Result terminal semantics, and fail-closed recovery. Broken storage or fencing implementations can still create severe duplicate-effect or split-brain risk.

3. Cancellation and timeout cannot undo an already committed or already begun irreversible external effect. The protocol can fence later effects and preserve evidence, but it cannot guarantee rollback of external systems.

4. Some failures will remain indeterminate when authoritative effect or storage history cannot be proven. The approved safety response is to fail closed rather than guess or blindly retry.

5. Separating semantic terminality from Receipt proof materialization permits a terminal Task to exist while Receipt proof bytes are temporarily unavailable. The accepted mitigation is immutable Receipt-generation input plus idempotent proof recovery without Task re-execution.

6. Minimum tombstones and effect/history commitments create an intentional retention floor that may outlive full Result content. Privacy minimization therefore cannot erase every historical identifier while replay, verification, dispute, migration, or support dependencies remain.

7. Cross-language interoperability will require later precise normative and executable definitions for state transitions, equality, fencing, effect evidence, Result schema, Receipt linkage, and failure cases. This governance approval by itself does not supply those artifacts.

8. Legacy objects may be impossible to map safely to the new model because historical evidence is incomplete. Quarantine or status-only treatment is an accepted compatibility cost.

COMPATIBILITY IMPACT ACCEPTED

I accept that future H-09-derived work may require changes to historical-schema projections, Agent/Client/Core behavior, Platform adapters, tests, fixtures, polling behavior, cancellation handling, terminal-state handling, Result representation, Receipt coupling, persistence/recovery, and migration tooling.

Historical 0.1-draft artifacts remain immutable and must not be rewritten. A future implementation may support legacy semantics through explicit release-bound compatibility paths, but may not reinterpret legacy objects as though they were originally created under H-09 Option B.

SECURITY IMPACT ACCEPTED

I accept the security model gained by Option B:

- no pre-acceptance Task authority;
- Approval waiting cannot become execution authority;
- no Receipt-based authorization;
- one immutable Task identity under retry/recovery;
- irreversible terminality;
- explicit cancellation/effect race ordering;
- visibility of partial effects;
- no blind effect retry under indeterminate history;
- fail-closed rollback/corruption/split-brain behavior;
- immutable Result/Receipt semantic binding;
- no Task re-execution to repair Receipt proof generation;
- minimum tombstones preserving replay and historical truth;
- current authenticated scope-bound authorization for historical disclosure.

I also accept that these properties depend on later H-10/H-11/H-12/H-13/H-14 and D2/P1 work for exact cryptographic, revocation, wire, extension, retention-duration, executable-state-machine, and conformance details.

GOVERNANCE EFFECT OF THIS APPROVAL

This approval changes H-09 from PROPOSED to ACCEPTED at the protocol-governance decision level only.

It does not by itself:

- close any GB-* gap;
- create or approve normative specification text;
- create or approve schemas;
- create or approve executable state machines;
- create or approve fixtures or test vectors;
- authorize implementation changes;
- authorize migration;
- authorize deployment;
- authorize publication or release;
- establish conformance;
- authorize Protocol 1.0 graduation.

Understanding is not approval.
Approval is not normative specification.
Normative specification is not schema/state-machine work.
Schema/state-machine work is not implementation.
Implementation is not conformance.
Conformance is not release.
Release is not Protocol 1.0.

Approved by: Rudra
Approval date: 2026-08-09
Approved option: Option B — Minimal durable Task lifecycle with orthogonal intents/evidence
Resulting H-09 governance status: ACCEPTED
<!-- H-09 HUMAN APPROVAL SOURCE END -->

## Human approval checklist

- [x] Select Option A, B, C, D, or a fully specified qualified alternative.
- [x] Confirm the H-07 final commit as the sole Task birth point.
- [x] Decide the exact Task identity and acceptance binding inventory.
- [x] Decide the exact nonterminal and terminal Task states.
- [x] Confirm whether terminal states have no exits.
- [x] Decide whether `rejected` is pre-Task and whether it produces any Execution Receipt.
- [x] Decide the disposition of every historical Task/Receipt value in the matrix.
- [x] Confirm that `waiting_for_approval` grants no Task authority under H-08.
- [x] Decide dependency-waiting progress semantics.
- [x] Decide recovery/indeterminate-state semantics and operator limits.
- [x] Decide compensation evidence and separate-work requirements.
- [x] Decide attempt identity, sequencing, fencing, and same-Task retry rules.
- [x] Decide cancellation support and when it becomes immutable.
- [x] Decide cancellation requester/source authority categories.
- [x] Decide the exact guarantees of durably accepted cancellation intent.
- [x] Decide cancellation and effect checkpoint semantics.
- [x] Decide cancellation-before-effect and cancellation-after-partial-effect outcomes.
- [x] Decide every cancellation race in the cancellation matrix.
- [x] Decide every terminal race in the terminal race table.
- [x] Decide Task execution deadline source, serialization clock, and equality.
- [x] Decide whether any pre-bound deadline extension mechanism is permitted.
- [x] Decide the one immutable terminal Result model and identity.
- [x] Decide Result output/reference, failure, effect, and attempt inventory.
- [x] Decide zero/partial/complete effect classification and concealment safeguards.
- [x] Decide Task/Result source-of-truth and disagreement handling.
- [x] Decide atomic terminal Task/Result commit contents.
- [x] Decide whether Receipt is universal or profile-selected and bind that policy at acceptance.
- [x] Decide the atomic Receipt identity/intent and immutable generation snapshot.
- [x] Confirm downstream idempotent Receipt materialization without Task re-execution.
- [x] Decide polling authority, advisory hints, and terminal/content-expired behavior.
- [x] Decide historical retrieval after Connection suspension/terminality.
- [x] Decide post-acceptance Connection/revocation stop-trigger behavior.
- [x] Decide live, terminal, Result, Receipt, idempotency, effect, audit, and tombstone retention relationships.
- [x] Decide the complete minimum tombstone inventory.
- [x] Confirm that deletion cannot authorize identity reuse or prove nonexistence.
- [x] Decide restart requirements for every nonterminal and terminal condition.
- [x] Decide corrupt, missing, rollback, stale-cache, duplicate-worker, and split-brain behavior.
- [x] Decide legacy classification/migration rules without historical invention.
- [x] Accept or revise the privacy minimization and prohibited-content boundaries.
- [x] Accept or revise every threat mitigation and residual risk.
- [x] Confirm H-10, H-11, H-12, H-13, H-14, D2, and P1 ownership boundaries.
- [x] Accept the compatibility impact on historical schemas, current Agent/Client/Core/Platform behavior, and fixtures.
- [x] Confirm that H-01 through H-08 are not superseded.
- [x] Confirm that approval still authorizes no normative/schema/state-machine/fixture/implementation/conformance/release work.
- [x] Supply approver identity, date, approved option, qualifications, accepted risks, compatibility/security impact, and durable sign-off reference.

## Consequences of the accepted Option B decision

Rudra's approval establishes these governance consequences:

1. Future H-09-dependent normative work will use the seven-state lifecycle and
   irreversible terminality.
2. H-07 acceptance remains the only Task birth point, and H-08 Approval
   consumption remains unchanged.
3. `rejected` and Approval waiting remain pre-Task; recovery, compensation,
   revocation, dependency waiting, and partial effects are
   represented orthogonally.
4. Future normative work will define exactly one immutable terminal Result and
   an atomic Task/Result terminal semantic outcome.
5. Receipt proof materialization may follow terminal commit only from the
   immutable selected snapshot and must never rerun execution.
6. Cancellation means durable intent plus checkpoint/fencing guarantees,
   not an unqualified promise that no effect occurred.
7. Partial effects remain visible after failure, cancellation, timeout,
   compensation, content minimization, and historical verification.
8. Restart, stale workers, rollback, corruption, and split brain fail
   closed without new Task/effect authority.
9. Full content may expire before the minimum terminal/idempotency tombstone,
   with concrete windows still selected under H-14.
10. Legacy objects require proof-based classification and cannot be
    silently rewritten.
11. H-10 through H-14 and D2/P1 work remain separately governed.
12. H-09 acceptance itself closes no `GB-*` gap; creates no normative
    requirement, schema, executable state machine, fixture, or vector; changes
    no implementation; authorizes no migration, deployment, or release;
    establishes no conformance; and makes no Protocol 1.0 claim.

## Final accepted status

Rudra supplied verified human approval for Option B on 2026-08-09. H-09 now has
protocol-governance decision authority only. Acceptance does not authorize
normative specification, schema, executable state-machine, fixture/vector,
implementation, migration, deployment, conformance, release, or Protocol 1.0
work.

**H-09 is ACCEPTED.**
