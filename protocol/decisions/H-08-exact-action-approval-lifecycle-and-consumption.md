# H-08 — Exact-action Approval lifecycle and consumption

## Decision ID

`H-08`

## Status

**ACCEPTED**

Rudra approved H-08 on 2026-08-07 and selected Option B — Single-use
exact-action Approval consumed atomically at the H-07 Invocation-acceptance
boundary. Approval Challenge, immutable Approval Decision, and exact-action
Approval authority are separate concepts; exact-action authority is
single-use, with final consumption occurring atomically at the H-07 final
durable Invocation-acceptance boundary.

Exact retries converge on the same accepted Invocation and Task result.
Failure after the commit never restores Approval. All complete approved
qualifications, risks, compatibility consequences, security consequences, and
deferred boundaries recorded in this decision are part of the accepted
decision.

This acceptance is a protocol-governance decision only. It creates no
normative requirement, schema, executable state machine, fixture, vector,
conformance case, implementation behavior, migration, deployment,
publication, release, gap closure, or Protocol 1.0 claim.

H-01 through H-08 are `ACCEPTED`. H-09 through H-14 remain deferred.

## Date prepared

2026-08-03

## Decision scope

This record documents the completed human decision for the lifecycle and
consumption semantics of an exact-action Approval. It does not change
protocol behavior, define wire bytes, update a schema or state machine,
authorize implementation, or close a specification gap.

The accepted decision determines:

1. what protocol objects participate in an Approval;
2. which facts are bound to the approved action;
3. how a human Decision creates, denies, or withholds authority;
4. when exact-action authority is available, expired, revoked, or consumed;
5. which event is the single authoritative consumption point;
6. how retries, races, restarts, and indeterminate commits behave;
7. how Approval interacts with authentication, Connection authority, Trust, authorization, policy, Invocation acceptance, Task creation, and later execution;
8. what durable evidence must survive restart and retention boundaries; and
9. which details remain assigned to H-09 through H-14.

Before human disposition, this packet compared the alternatives and recorded
the complete Option B bundle. Existing schemas, implementations, tests,
examples, and product workflows remain evidence of current behavior only;
they did not decide H-08. The verbatim human approval recorded below is the
authoritative disposition.

## Gap and work-item mapping

This record completes the phase 15 D.1G H-08 governance decision identified
by `docs/protocol/phase-15d-plan.md`. It directly addresses the open
approval-lifecycle and consumption gaps described in:

- `GB-018`: the exact action has a helper representation but no accepted action profile;
- `GB-019`: Approval lifecycle and consumption are implicit and vary across implementations;
- `GB-034`: failure triggers, precedence, retry classification, and safe fields are not normative; and
- `GB-047`: Approval threats are not yet connected to normative requirements and malicious conformance fixtures.

The primary phase work items are `D1-04`, `D2-02`, `D2-03`, `D2-04`, and
`P1-03`. Only the D.1G governance-decision recording is in scope here; naming
later work does not authorize it.

H-08 acceptance does not authorize normative specification, schema,
state-machine, vector, conformance, implementation, migration, deployment,
publication, or release work. Each remains separately authorized. This record
performs none of that work.

## Concepts kept distinct

H-08 uses the following separations throughout:

- an **Approval Challenge** asks for a human or authorized approver Decision about one exact action;
- an **Approval Decision** is an immutable recorded outcome from an authenticated and eligible approver;
- **exact-action Approval authority** exists only when a valid approved Decision satisfies all current gates and has not expired, been revoked, or been consumed;
- an **Approval continuation request** presents the Decision while requesting acceptance of the bound Invocation;
- **Invocation acceptance** is the H-07 durable serialization event that admits new work and binds a Task identity;
- **Task execution**, side effects, Result production, Receipt production, cancellation, and recovery after acceptance are H-09 and later concerns;
- request authentication, Connection authority, Trust, authorization evidence, deployment policy, install consent, idempotency, and Approval are independent controls and are not substitutes for one another.

An approved Decision is therefore not a bearer credential with standalone authority. Effective authority remains the intersection required by H-02, evaluated at the H-07 acceptance boundary.

## Accepted-decision dependencies

### H-01 — Connection establishment and lifecycle authority

H-01 is accepted and controls these constraints:

- discovery and preview are non-authoritative;
- consent is immutable and contains the complete selected result;
- a material difference requires a new preview and consent;
- authority begins only with atomic creation of an active Connection;
- Connection-governed objects bind the selected protocol and capability versions; and
- durable lifecycle truth must survive restart.

H-08 must not treat Approval as a replacement for Connection authority. An Approval bound to a Connection that is not admissible at acceptance cannot authorize an Invocation.

### H-02 — Authority boundaries and enforcement

H-02 is accepted and is the primary authority dependency for H-08:

- authentication, Connection authority, Trust, authorization, policy, and Approval are distinct gates;
- Approval is exact-action human consent, not general authorization;
- the Agent is the final enforcement point;
- the Agent treats Approval references, bodies, scopes, and limits as untrusted until verified;
- approver identity and eligibility derive from verified evidence, never from an untrusted body assertion;
- Approval must not widen capability, scope, authorization, policy, or Connection authority;
- Approval cannot be transferred as Agent-to-Agent authority;
- stale, ineligible, mismatched, expired, revoked, or replayed Approval fails closed; and
- where Approval is required, the Agent verifies and atomically consumes it before creating a new Task or permitting an external effect.

H-02 expressly assigns the detailed consumption lifecycle to H-08. H-08 may make that boundary precise but may not weaken it without explicitly superseding H-02.

### H-03 — Version history and non-reinterpretation

H-03 is accepted and requires exact selected release and artifact history to remain immutable. Current schemas, current defaults, fresh discovery, or a newer implementation cannot reinterpret an historical Approval. Missing historical evidence cannot be invented. Migration of active legacy Approvals is a separate, explicit operation.

### H-04 — Capability, scope, and monotonic narrowing

H-04 is accepted and requires layered effective authority to narrow monotonically. Exact capability key and version are non-substitutable. Omitted fields do not imply broader defaults. Material changes require replacement authority. Approval limits can narrow the otherwise effective action but cannot widen any upstream layer.

### H-05 — Authentication and proof profiles

H-05 is accepted and requires every Connection-governed request to use the current selected-profile authentication. The authenticated principal derives from verified evidence. Audience and proof purpose are exact; proof profiles do not substitute for one another. Authentication failure is isolated from Approval failure. Recoverable authentication unavailability can suspend authority, while compromise or revocation can terminate it under the accepted lifecycle.

H-10 still owns the Approval-specific byte representation, digest, signature, algorithm, key-purpose, and domain-separation profile.

### H-06 — Grant lifecycle comparison boundary

H-06 is accepted for a purpose-bound Connection-creation grant. It expressly leaves Approval consumption to H-08. Its replay and atomicity principles are useful comparison evidence, but its secret, state, transaction, expiry, and recovery rules do not automatically govern Approval.

The accepted decision below is therefore derived from H-02's exact-action
requirement and H-07's accepted Invocation boundary, not from mechanical reuse
of H-06.

### H-07 — Invocation acceptance and Connection-state effect

H-07 is accepted and controls admission of new work. A new Invocation is accepted only by a final serialized durable commit that reloads and verifies immutable Connection evidence, current principal and target bindings, audience, tenant and workspace scope, lifecycle state and expiry, capability, Trust, authorization, policy, Approval where required, deadline, and idempotency. Raceable facts are rechecked at that boundary. The same commit binds durable Task and idempotency evidence.

If Connection termination commits first, the Invocation is denied. If acceptance commits first, the later work becomes an H-09 concern. H-07 does not decide post-acceptance cancellation, continuation, external-effect recovery, terminal Task state, Result, Receipt, or their races.

For H-08, this means the consumption event must either join the H-07 acceptance transaction or define a stronger compatible serialization protocol. A separate earlier burn creates an unrecoverable gap; a later consumption violates H-02's consume-before-Task rule.

### Accepted-decision conflict ledger

| ID | Candidate H-08 rule or observed behavior | Accepted-decision conflict | Required disposition |
|---|---|---|---|
| C-01 | Treat an approved Decision as sufficient authority | H-02 requires the full authority intersection | Reject; re-evaluate every current gate at acceptance |
| C-02 | Treat Approval as Connection authority | H-01 and H-02 keep them distinct | Reject |
| C-03 | Reuse Approval across different Invocation identities by default | H-02 requires exact action; H-04 forbids widening | Reject unless a future decision explicitly supersedes those constraints |
| C-04 | Consume after Task creation or first effect | H-02 requires consumption before Task/effect | Reject |
| C-05 | Burn Approval in a separate commit before H-07 acceptance | H-07 requires a final atomic admission boundary and durable Task/idempotency binding | Reject; join the acceptance commit |
| C-06 | Restore Approval after the H-07 commit because later execution failed | H-07 assigns accepted work to H-09 and H-02 requires single-use protection | Reject |
| C-07 | Use current schema defaults to fill an historical binding | H-03 prohibits reinterpretation | Reject; fail closed or perform an approved migration |
| C-08 | Substitute a compatible-looking capability version | H-03 and H-04 require exact selected versions | Reject |
| C-09 | Let Approval widen tenant, workspace, capability, limits, authorization, or policy | H-02 and H-04 require monotonic narrowing | Reject |
| C-10 | Take requester, approver, or effective actor identity from message bodies | H-02 and H-05 derive identity from verified evidence | Reject |
| C-11 | Accept a Decision with request-signing proof as Approval proof | H-05 requires purpose and audience separation | Reject; H-10 must define Approval proof |
| C-12 | Reinterpret a historical `ghostbridge/0.1-draft` label as the current release | H-03 forbids aliasing and historical invention | Reject |
| C-13 | Let an expired or terminal Connection accept a continuation because the Decision was earlier | H-07 requires current Connection admissibility | Reject |
| C-14 | Return a second Task on an exact concurrent retry | H-07 requires durable idempotency binding at acceptance | Reject; converge on the accepted identity when equality is proven |
| C-15 | Import H-06 grant states and secrets as Approval rules | H-06 expressly delegates Approval to H-08 | Reject automatic import; decide Approval on its own threat model |
| C-16 | Define post-acceptance Task/effect/Receipt behavior in H-08 | H-07 assigns that boundary to H-09 and later decisions | Defer |

No accepted decision is superseded by H-08. Rudra's selection is consistent
with the ledger. Any future change that conflicts with the ledger must name
the affected accepted decision and approve an explicit superseding change.

## Repository evidence inspected

### Decision and planning evidence

| Evidence | Observation | Authority treatment |
|---|---|---|
| `protocol/decisions/H-01-lifecycle-initialization-and-ordering.md:714-753` | Accepted Connection authority and immutable consent boundary | Controlling accepted decision |
| `protocol/decisions/H-02-roles-trust-boundaries-and-authorization-floor.md:442-764,947-1008` | Exact-action Approval, Agent enforcement, separate gates, and atomic consumption requirement | Controlling accepted decision |
| `protocol/decisions/H-03-protocol-version-identity-and-history.md:194-296` | Exact historical versioning and non-reinterpretation | Controlling accepted decision |
| `protocol/decisions/H-04-capability-profile-and-optional-feature-negotiation.md:1702-1918` | Monotonic narrowing and exact capability binding | Controlling accepted decision |
| `protocol/decisions/H-05-authentication-profiles-and-credential-binding.md:1984-2012` | Current authentication, purpose, audience, and principal derivation | Controlling accepted decision |
| `protocol/decisions/H-06-install-grant-redemption-and-retry-semantics.md:112-120,1292-1360` | Purpose-bound grant lifecycle; Approval expressly excluded | Controlling only for the stated non-equivalence |
| `protocol/decisions/H-07-connection-lifecycle-and-scoped-authority.md:1541-1575` | Final serialized Invocation acceptance with Task/idempotency evidence | Controlling accepted decision |
| `docs/protocol/phase-15d-plan.md:31,88,112-114,151` | Assigns H-08 preparation and later normative/conformance work items | Planning evidence only |
| `docs/protocol/normative-specification-gap-analysis.md:69-70,95,118,180-201` | Records Approval action, lifecycle, error, and threat gaps | Gap evidence only |
| `docs/protocol/conformance-architecture.md:1-23,151-190,251-266` | Defines future authority hierarchy and expected Approval vectors | Architecture guidance; not H-08 acceptance |

### Historical protocol and schema evidence

| Evidence | Observation | Why it is insufficient as authority |
|---|---|---|
| `protocol/specification/0.1-draft/approval.md:3-10` | Describes a Challenge, safe summary, exact scope, Decision, and single use | Historical draft; does not fully define lifecycle, atomic boundary, or recovery |
| `protocol/specification/0.1-draft/invocation.md:3-10`, `tasks.md:3-9`, `execution-receipt.md:3-10`, `audience-binding.md:3-7`, `replay-protection.md:3-7` | Relates Approval to Invocation, Task, Receipt, audience, replay, and idempotency | Historical prose leaves the cross-object transaction undefined |
| `protocol/schemas/0.1-draft/approval-challenge.schema.json:7-21` | Contains challenge, Invocation, tenant, action digest, summary, roles, limits, requester, policy, expiry, and a status enum | Omits required Connection/release/capability/principal/audience/history bindings and mixes lifecycle choices into a draft schema |
| `protocol/schemas/0.1-draft/approval-decision.schema.json:7-18` | Contains Decision ID/outcome, digest, limits, approver assertion, time, reason, and proof | Does not normatively derive approver identity, define proof purpose, authority state, expiry, consumption, or atomicity |
| `protocol/schemas/0.1-draft/invocation.schema.json:7-30` | Carries an Approval reference, idempotency key, and deadline | A reference does not prove exact binding or consumption |
| `protocol/schemas/0.1-draft/task.schema.json:7-30` | Carries an Approval reference and `waiting_for_approval` state | Does not define the acceptance transaction or Approval ownership |
| `protocol/schemas/0.1-draft/execution-receipt.schema.json:7-39` | Carries an Approval reference and policy reference | A later Receipt cannot retroactively authorize acceptance or be the consumption point |
| `protocol/schemas/0.1-draft/request-proof.schema.json:7-29`, `signed-envelope.schema.json:7-20`, and `error.schema.json:7-18` | Describe other proof and failure surfaces | Request integrity is not Approval proof, and retry/error semantics remain incomplete |

### Core, Agent, Client, Trust, and Platform evidence

| Evidence | Current behavior observed | Evidence-only consequence |
|---|---|---|
| `packages/ghostbridge-protocol-core/src/index.js:1141-1289` and `index.d.ts:278-302,445-474` | Builds and checks an action digest over a useful but incomplete field set; validates pending challenge, equality, limits, and expiry | Shows implementable inputs, but not an accepted canonical profile or complete state machine |
| `packages/ghostbridge-protocol-core/test/approvalAction15c1aR1.test.js:12-115` | Exercises digest mutation and object-key reordering | Useful regression evidence; not an independent cross-language oracle |
| `packages/ghostbridge-native-agent/src/index.js:587-850,1460-1470,2666-2683` | Checks an approved Decision and consumes it before creating a Task | Supports single-use intent but separates consumption from Task/idempotency commit |
| `packages/ghostbridge-native-agent/src/index.js:1342-1384` | Persists Decision and Challenge changes and collapses non-approved outcomes | Exposes outcome/state ambiguity and possible partial-write behavior |
| `packages/ghostbridge-native-agent/src/fileProtocolStores.js:10-36,177-205,379-395` | File-backed store marks Decision used with a timestamp | Survives restart, but is not one transaction with H-07 acceptance evidence |
| `packages/ghostbridge-native-agent/test/security15c1a.test.js:1193-1233,1281-1429,1553-1628` | Covers mutation, malformed digests, concurrency, and restart | Reveals that a losing concurrent use can receive a new waiting Task instead of converging |
| `packages/ghostbridge-native-client/src/index.js:752-884,1000-1145` | Submits Decision and Invocation as separate requests and provides general retry classification | Has no dedicated Approval continuation recovery contract |
| `packages/ghostbridge-trust/src/index.js:37-48,1531-1622` | Supports general proof verification but has no accepted Approval-specific key purpose/profile | Confirms H-10 remains open |
| `backend/src/services/platformNativeClient.service.js:368-419,731-832,1160-1250,1335-1460` | Consumes a separate replay digest before Decision submission and Invocation continuation | Creates a pre-acceptance burn window and split authority with the Agent |
| `backend/src/models/NativeClientApprovalReplay.js:5-16` | Stores replay digest with TTL expiry | TTL removal can erase a tombstone and does not prove Agent consumption |
| `backend/src/tests/platformNativeClient.test.js:332-397` and `platformNativeClientAuthority.test.js:145-165` | Cover binding mutation, success, and duplicate replay | Demonstrate Platform policy, not protocol authority or crash-complete recovery |
| `backend/src/services/approval.service.js:1660-1828`, `models/ApprovalRequest.js:1-95`, `ApprovalDecision.js:1-34`, `ApprovalGrant.js:1-41`, and `ApprovalWorkflow.js:1-133` | Model product workflows, stages, grants, and consumption | Separate business-compliance semantics; not Ghost Bridge H-08 authority |

### Fixture and conformance evidence

| Evidence | Observation | Limitation |
|---|---|---|
| `scripts/black-box/raw-agent.mjs:509-550,590-616` | Marks a Decision used before Task/effect | In-memory fixture with simplified state |
| `scripts/verifyGhostBridgeBlackBoxConformance.mjs:448-593` | Tests Challenge, bad binding, Decision, success, idempotent replay, and second use | Imports the Core helper, so it is not an independent digest oracle |
| `scripts/verifyGovernedHostAgentCompatibility.js:162-266` | Exercises continuation, cross-Invocation reuse, expiry, and replay | Compatibility evidence, not normative lifecycle authority |
| `packages/ghostbridge-conformance/src/index.js:162-166` | Validates Challenge and Decision shapes | Does not yet test the complete lifecycle or consumption transaction |

### Evidence conclusion

The repository contains at least three materially different behaviors:

1. Core and Agent code model a Decision-local `used` condition and burn it before Task creation;
2. the Platform burns an additional replay record before remote Decision submission and Invocation continuation; and
3. the Client provides no Approval-specific recovery protocol for ambiguity between those operations.

None is sufficient as normative authority. The divergence is precisely why H-08 requires a human decision.

## Contradictions and undefined behavior

| # | Contradiction or undefined behavior | Consequence if unresolved | Affected decision boundary |
|---:|---|---|---|
| 1 | Challenge, human Decision, and Approval authority are sometimes represented as one mutable object | Outcome, authority, and audit provenance cannot be reconstructed reliably | H-08 object/state model; H-11 persistence |
| 2 | `approved`, `denied`/`rejected`, `pending`, `expired`, `consumed`, `cancelled`, and `revoked` are variously outcomes, states, or flags | Illegal transitions and cross-implementation mismatch | H-08 state/outcome semantics; H-12 encoding/error; future schema work |
| 3 | Historical prose says single-use while no accepted rule excludes reusable Approval | Approval can become open-ended authorization | H-02 exact-action boundary; H-08 reuse decision |
| 4 | It is undefined whether one Approval covers one Invocation, Task, effect, bounded effects, or an action class | Authority scope and replay meaning vary | H-02/H-04 exactness; H-08 options; H-09 effects |
| 5 | Candidate consumption points range from Decision creation and authentication through Invocation/Task/effect/Receipt events | Early burn loses authority; late burn permits unauthorized work | H-02 consume-before-Task; H-07 acceptance; H-09–H-11 later boundaries |
| 6 | Failed or crashed continuation may or may not restore Approval | Implementations either lose legitimate authority or enable duplicate work/effects | H-08 rollback; H-09 post-acceptance recovery |
| 7 | A response can be lost after successful consumption | Client cannot distinguish noncommit from accepted work | H-08 exact recovery; H-12 transport/errors |
| 8 | Exact retry and conflicting retry are not normatively separated | Replay rejection can break recovery; permissive retry can widen action | H-07 idempotency; H-08 equality; H-12 disclosure |
| 9 | Two concurrent exact continuations can currently yield a winner plus a new waiting Task | One action gains multiple observable work identities | H-07 atomic Task/idempotency; H-08 concurrency; D2-03/P1-03 vectors |
| 10 | Concurrent materially different continuations have no one-winner/conflict rule | One Approval can be raced across changed semantics | H-08 serialization/equality; D2-03/P1-03 malicious fixtures |
| 11 | Expiry equality and the authoritative clock/serialization point are implicit | Boundary decisions vary with process and request arrival | H-05 time profile; H-08 expiry; H-10 representation |
| 12 | Challenge expiry, Decision/authority expiry, Connection expiry, proof expiry, and Invocation deadline are conflated | One passing clock can mask another expired gate | H-05/H-07 current checks; H-08 authority lifetime |
| 13 | Scope is duplicated and workspace is sometimes truthiness-checked | absent, null, empty, whitespace, and present scopes can collapse | H-04/H-07 exact scope; H-10 encoding |
| 14 | Requester/effective actor fields may be taken from bodies | Principal substitution can obtain or use Approval | H-02/H-05 verified identity; H-08 actor binding |
| 15 | Approver identity, authentication, eligibility source, and eligibility time are incomplete | Forged or ineligible Decisions can create authority | H-02/H-05; H-08 issuance; H-10/H-11 proof/history |
| 16 | Requester, beneficiary, effective actor, target Agent, and Approver are not consistently distinct | Delegation and self-approval policy cannot be evaluated | H-02 roles; H-08 bindings |
| 17 | Capability key/version and operation/action comparison are incomplete | Approval can cross capability or operation meaning | H-03/H-04; H-08 inventory; H-10 digest |
| 18 | Resource, amount, currency, destination, recipient, account, parameters, limits, and effect class can change after Decision | Human consent can be widened materially | H-02/H-04; H-08 equality; H-10 vectors |
| 19 | Safe or redacted display can omit security-critical action context | Approver may consent to a misleading presentation | H-08 presentation binding; H-10 rendering profile; H-12 privacy |
| 20 | Core, Agent, Platform, fixtures, and languages have no accepted common canonical action profile | Equal actions can hash differently or mutations can hash the same | H-08 semantics; H-10 bytes; D2-04/P1-03 conformance; H-14 reproduction |
| 21 | Approval audience and key purpose are not accepted or consistently verified | Valid proof can be replayed across purpose or verifier | H-05 separation; H-10 proof profile |
| 22 | Connection may suspend, expire, close, revoke, or be replaced after Decision but before continuation | Historical Approval may bypass current lifecycle | H-01/H-07 current state; H-08 interaction |
| 23 | Current authorization or deployment policy can narrow after Decision | Historical allow can be mistaken for frozen authority | H-02/H-04 current intersection; H-08 recheck |
| 24 | Current Trust, authentication, proof freshness, or revocation can fail after Decision | Approval possession can bypass current identity/trust gates | H-02/H-05/H-07; H-08 recheck |
| 25 | Replay across Connection, organization, workspace, capability, release, Agent, resource, requester, or tenant is not fully bound | Authority transfers across security domains | H-01–H-05; H-08 inventory; H-10 proof |
| 26 | Approval and business idempotency namespaces and equality are incomplete | Collisions can disclose or duplicate accepted work | H-07 idempotency; H-08 continuation identity; H-12 privacy |
| 27 | Approval state may be missing, corrupt, rolled back, duplicated, or split-brain | Agent cannot prove whether authority remains | H-08 fail-closed recovery; H-11 durability; H-14 operations |
| 28 | Some Challenge/Decision behavior is local-memory or process-cache dependent | Restart can forget a Decision, revive a Challenge, or permit replay | H-07 durable admission; H-08 persistence; H-11 restart |
| 29 | Approval/replay deletion can prevent safe exact retry and erase terminal truth | Recovery may create new work or deny a committed result indefinitely | H-08 tombstone; H-12 retry; H-14 retention |
| 30 | Public errors and timing can reveal Approval, Connection, tenant, action, Task, or approver existence | Cross-scope probing becomes an oracle | H-08 semantic precedence; H-12 public privacy/error policy |
| 31 | Current `waiting_for_approval` Task behavior blurs pre-acceptance workflow and H-07 Task acceptance | Task existence can be mistaken for admitted work | H-07 acceptance; H-08 consumption; H-09 Task outcomes |
| 32 | Receipt references can be treated as Approval proof or consumption completion | Later evidence retroactively authorizes an earlier effect | H-08 consume-before-work; H-10 Receipt proof; H-11 history |
| 33 | Historical `ghostbridge/0.1-draft` objects lack complete bindings and accepted mappings | Migration can invent authority or reinterpret status | H-03 history; H-08 compatibility; H-14 release support |
| 34 | Production Agent, Platform, Client, file-store, and black-box fixtures materially diverge | A passing test can certify only one local behavior | H-08 decision; D2-04/P1-03 conformance; H-13 extension/evolution cases; H-14 independent reproduction |

Publication alone resolved none of these contradictions. Rudra's approval
makes the selected governance semantics authoritative, while protocol
requirements and executable behavior still require separately authorized
normative and implementation work.

## Terminology

### Approval Challenge

A durable request for an eligible human or authorized approver to decide one exact action. It contains safe presentation material and authority-critical bindings. Creating, viewing, or authenticating access to a Challenge grants no execution authority.

### Approval Decision

An immutable, authenticated record of an eligible approver's outcome for one
Challenge. The accepted outcome vocabulary is:

- `approved`: permits exact-action authority to become available, subject to all current gates;
- `denied`: records a final human refusal and creates no authority; and
- `more_information_required`: records that approval was not given and creates no authority; a materially revised action requires a new Challenge.

Under the accepted decision, `expired` and `cancelled` are lifecycle
transitions, not assertions that a human chose those outcomes. The final wire
vocabulary remains future schema work.

### Exact-action Approval authority

The narrow, conditional authority derived from a valid `approved` Decision. It is not a new principal and is not standalone authorization. It is usable only for the exact bound action while every independent current authority gate also passes.

### Available

The accepted Approval-authority state after an approved Decision is durably
committed and before the strict expiry boundary, revocation, or consumption.
Available does not mean that the Connection, Trust, authorization, policy,
deadline, or other gates currently permit acceptance.

### Consumed

The accepted terminal state recorded in the same durable serialization
outcome as H-07 Invocation acceptance. It means new work was accepted and
bound to durable Task/idempotency evidence. It does not mean a Task started,
an external effect occurred, a Result succeeded, or a Receipt was delivered.

### Exact retry

A later request that presents the same authenticated requester context, continuation/idempotency identity, Approval identity, Invocation identity, and complete action semantics. It is a read of the already serialized outcome, not another authority consumption.

### Conflicting retry or replay

A request that reuses some identity or Approval evidence but differs in any bound semantic, actor, target, scope, capability, limit, policy, deadline, or idempotency fact. It must not consume authority, create work, disclose an existing Task to an ineligible caller, or alter the accepted record.

### Tombstone

Durable minimum evidence that an Approval reached a terminal state, including the authority and action identities, terminal state, serialization time, reason category, and, for consumption, the accepted Invocation/Task/idempotency binding. A tombstone is protocol evidence, not merely a cache entry.

### Serialization time

The authoritative clock sample and ordering point at which the storage authority commits a transition. Local request-arrival time, UI display time, and response-delivery time are not substitutes.

### Requester principal

The authenticated principal asking the Agent to create or continue the exact Invocation. It is derived from current verified authentication and is not an `requestedBy` body claim.

### Effective actor and beneficiary

The effective actor is the principal whose delegated authority is exercised. A beneficiary is the principal on whose behalf the result or effect is requested. Either may equal the requester only when verified evidence and policy say so; both remain separately bound where present.

### Approver principal

The authenticated human or authorized principal whose eligible Decision is recorded. Approver authority comes from verified identity plus an approved authority source and role/policy evaluation, not from a display name or `decidedBy` field.

### Action descriptor and action semantic identity

The action descriptor is the complete structured set of authority-critical meanings shown in the bound-field inventory. Its semantic identity is exact equality of all those meanings and presence states under the future H-10-qualified profile; it is not merely matching display text or a current helper digest.

### Continuation

A currently authenticated request that presents a Decision and asks the Agent to continue admission of the original exact Invocation. It remains a new H-07 acceptance attempt until the atomic commit wins.

### Reservation and final consumption

A reservation is an internal concurrency mechanism that may temporarily exclude competitors but grants no protocol authority and is not a durable lifecycle transition under Option B. Final consumption is the irreversible `available -> consumed` transition in the same H-07 acceptance outcome.

### Indeterminate Approval state

A fail-closed integrity condition in which authoritative storage cannot prove either a complete precommit available state or a complete consumed/accepted outcome. It is not `available`, `consumed`, or permission to retry blindly.

### Approval-purpose audience and key

The audience identifies the exact intended Approval verifier/Agent/resource. The Approval-purpose key is authorized specifically for the future Approval proof profile. Neither is interchangeable with authentication, request-signing, authorization, grant, or Receipt audiences and keys.

### Decision expiry

The accepted Approval-authority expiry derived when an approved Decision
commits. It limits when that Decision can contribute authority and is distinct
from the Challenge submission expiry and all other clocks.

### Consumption serialization point

The authoritative final H-07 commit ordering Approval consumption with current
gates, accepted Invocation, Task identity, and idempotency evidence. This is
the accepted final consumption point.

### Non-equivalences

The following pairs are explicitly non-equivalent:

- Challenge issuance is not Decision issuance;
- an approved Decision is not consumed authority;
- authenticated is not approved;
- authorized is not approved;
- installation consent is not exact-action Approval;
- policy permission is not Approval;
- Challenge existence is not Approval;
- an `approved` body field is not Approval;
- Approver identity is not requester identity;
- matching display text is not action semantic identity;
- possession of Approval evidence is not sufficient authority;
- Approval is not capability authority and cannot widen a Connection;
- Approval is not authentication;
- Approval is not Connection authority;
- Approval is not Trust;
- Approval is not authorization or deployment policy;
- Approval limits are not capability grants;
- request integrity proof is not Approval proof;
- Approval expiry is not Connection expiry, proof expiry, Invocation deadline, or Task timeout;
- an internal lock or reservation is not protocol consumption;
- idempotent replay is not reusable Approval;
- deletion is not proof of consumption;
- Task existence is not proof of valid unconsumed Approval;
- Task creation is not Task execution;
- Task success is not Approval validity;
- a Receipt reference is not the authorization event;
- H-06 Connection-creation grant consumption is not H-08 Approval consumption; and
- Platform business-compliance approval is not Ghost Bridge exact-action Approval.

## Human decision questions resolved by approval

### A. Object and state model

Should Challenge, immutable Decision, and Approval authority be separate conceptual objects, one mutable record, or an append-only event stream projecting all three? Which values are lifecycle states, human outcomes, or storage flags? Separation aids audit; a combined record reduces storage objects but risks ambiguous authority.

### B. Exact bound-field inventory

Which fields in the inventory below are mandatory direct semantics, immutable references, current narrowing evidence, transient data, prohibited inference, or tombstone evidence? Can any authority-critical fact be omitted? A smaller binding improves compatibility but expands substitution risk.

### C. Action representation and semantic equality

Is equality a future H-10 canonical digest over complete structured semantics, direct field-by-field equality plus references, or another qualified profile? How are presence, numbers, Unicode, units, aliases, rendering versions, and historical schemas treated? Current helper equality cannot be presumed normative.

### D. Requester, actor, Approver, target, and audience binding

Must requester, effective actor, beneficiary, Approver, target Agent/resource, Passport, and Approval audience all be separately derived and bound? When may identities coincide, when is delegation allowed, and is self-approval categorically forbidden or explicitly policy-gated?

### E. Tenant and Connection binding

Must authority bind exact Connection ID/bundle/sequence, organization, and tagged workspace? Does suspension temporarily block use while terminal/replaced state permanently prevents it? Can any Approval migrate to a replacement Connection? H-01/H-07 indicate no implicit transfer.

### F. Capability, operation, resource, parameter, and effect binding

Which capability key/version, operation, resource type/identity, destination/recipient/account, effect parameters, numeric units/limits, payload identity, and side-effect class must be non-substitutable? Are output/data-release semantics also authority-critical?

### G. Approval issuance and decision authority

Who may issue a Challenge, who may decide it, what current authentication and role source proves eligibility, when is eligibility checked, and what outcome vocabulary applies? Does `more_information_required` terminate the Challenge? Silence and body assertions cannot grant authority.

### H. Expiry and time boundaries

Does Challenge expiry constrain submission while a distinct Decision/authority expiry constrains consumption, or is there one timestamp? Which clock and serialization point govern, is equality expired, and how do Connection expiry, proof expiry, policy freshness, and Invocation deadline remain independent?

### I. Consumption point

Does consumption occur at Decision creation, continuation authentication, H-07 final Invocation acceptance, Task creation/start, first irreversible effect, successful effect, or Receipt commit? Earlier choices burn without accepted work; later choices may violate H-02 or decide H-09.

### J. Reservation and rollback

Is reservation protocol-visible or internal only? What fencing and crash rules apply? Does definite precommit failure leave authority available, and can any postcommit Task/effect/Receipt failure restore it? Restoration risks duplicate effects.

### K. Exact retry and lost-response recovery

Does a fully equal retry converge on the same accepted Invocation/Task identity or fail as replay? Which authentication/disclosure checks apply after consumption, and how is storage success followed by response loss distinguished from noncommit?

### L. Conflicting replay

What happens when Approval, Invocation, or idempotency identity is reused with any changed semantic or caller? Must it fail without mutation and protected disclosure, or may it generate a new Challenge? The latter creates workflow and oracle risk.

### M. Concurrent continuation

How are two exact attempts, two different attempts, expiry, revocation, and Connection termination serialized? Must exact losers converge and conflicts fail? What storage guarantees or equivalent single-writer/fencing design are mandatory?

### N. Connection/Trust/authentication/policy changes after approval

Which current gates are re-evaluated at consumption, and can any historical allow remain sufficient? How do suspension, terminal state, authentication unavailability/compromise, Trust revocation, authorization withdrawal, and policy narrowing affect available authority?

### O. Persistence, restart, corruption, and anti-rollback

Which immutable Decision, action, state, Task/idempotency, audit, clock, sequence, and tombstone facts survive restart? How must missing, partial, corrupt, duplicated, stale-cache, rolled-back, or split-brain state fail and recover?

### P. Task/H-09 boundary

Is the accepted Task identity created in the consumption commit? Is `waiting_for_approval` a non-authoritative workflow record? Which queue, execution, cancellation, retry, effect, Result, and post-acceptance Connection outcomes remain wholly H-09?

### Q. Receipt/H-10/H-11 boundary

May a Receipt ever be the consumption point or proof that Approval was valid, or is it downstream linkage only? Which Receipt semantic outcome, retention, polling, and Task/Receipt atomicity rules belong to H-09, which canonical bindings/proofs belong to H-10, which historical verification/compromise conclusions belong to H-11, and which wire delivery/disclosure rules belong to H-12?

### R. Error precedence, disclosure, and retry classification

Which semantic failure wins when several apply, which details may be public, and which failures are safely retryable? How are unknown, cross-scope, consumed, mismatched, expired, revoked, corrupt, unavailable, and indeterminate cases prevented from becoming timing/existence oracles?

### S. Retention and tombstones

What minimum terminal evidence is retained, for how long, and against which offline replay, idempotency, audit, migration, and support horizons? Can privacy erasure reduce data to a non-reversible tombstone without restoring practical replayability?

### T. Historical and migration treatment

Are legacy records preserved historically, restricted, status-only, operator-classified, quarantined, denied governed use, or replaced by a new Approval? Which mappings can be proven without inventing missing fields, and how do upgrades, downgrades, backup restore, and rollback remain safe?

## High-level alternatives

Before human disposition, the packet compared Options A, B, C, and D. Rudra
selected Option B on 2026-08-07. Options A, C, and D were not selected and
remain rejected-alternative history; they have no protocol authority.

### Option A — Reusable exact-action Approval until expiry or revocation

**Object and state model.** A Challenge produces an immutable approved Decision and available authority. Successful acceptances do not consume it; expiry or revocation ends it.

**Exact binding.** The Approval would need to bind an action class or explicitly omit Invocation identity to be useful more than once. If it binds one Invocation, reuse can only be duplicate recovery and collapses into idempotency rather than reusable authority.

**Issuance.** Eligible approver authentication, explicit validity, action class, use policy, and every current upstream gate are required.

**Consumption.** There is no single-use consumption transition. Each Invocation records that it relied on the Approval.

**Retry and replay.** Exact retry converges by Invocation idempotency. A new Invocation satisfying the same class is a new authorized use, not replay.

**Rollback.** No restoration issue arises, but compromise remains effective until revocation/expiry.

**Concurrency.** Arbitrarily many matching acceptances can race unless policy adds rate or count limits.

**Expiry.** Strict expiry at each H-07 serialization boundary. Revocation races require an accepted ordering rule.

**Restart and retention.** The reusable authority record and all use audit references must survive. Deleting older uses impairs investigation but does not itself restore authority.

**Privacy.** A longer-lived action-class record increases exposure and correlation risk.

**Compatibility.** Existing single-use stores and tests would require material change. Draft “single-use” language would be superseded.

**Strengths.** Fewer prompts and simpler repeated operations.

**Risks.** Converts human consent toward durable authorization; increases replay and compromise blast radius; ambiguous exact-action meaning.

**Operational cost.** Moderate for storage, high for revocation distribution, current-policy evaluation, and audit volume.

**Accepted-decision effect.** Likely conflicts with H-02 exact-action intent and H-04 monotonic specificity if it crosses Invocation identity. Human approval would need explicit superseding language.

**Later-decision effect.** H-09 must handle multiple accepted Tasks, H-10 must bind an action-class profile, H-11 must distribute revocation, H-12 must expose safe reuse errors, D2-02/D2-03/D2-04/P1-03 must cover count and concurrency conformance, H-13 owns extension/evolution effects only, and H-14 must define retention/support.

### Option B — Single-use at the H-07 atomic Invocation-acceptance boundary

**Object and state model.** A Challenge is separately open or terminal; an immutable Decision records the approver outcome; approved authority becomes available and transitions once to consumed, expired, or revoked.

**Exact binding.** The Approval binds one exact Connection-governed Invocation action, identities, target, selected release, capability, scope, payload/contract, limits, policy reference, validity, and continuation identity.

**Issuance.** An authenticated eligible approver submits a Decision while the Challenge is open and unexpired. Only `approved` can create available authority.

**Consumption.** `available -> consumed` commits in the same final serialized durable outcome as H-07 Invocation acceptance, Task identity, and idempotency evidence.

**Retry and replay.** A proven exact retry reads and returns the existing accepted identity without another transition. A mismatch fails without mutation or disclosure beyond H-12 policy.

**Rollback.** Any failure before commit leaves authority available. Nothing after commit restores it. Post-acceptance recovery belongs to H-09.

**Concurrency.** All candidates serialize against the authority and acceptance identity. One matching acceptance can commit; exact losers converge; conflicts fail.

**Expiry.** Challenge and available-authority expiry are checked strictly at their respective serialization points; equality is expired.

**Restart and retention.** Immutable Decision, state, tombstone, action binding, accepted Task/idempotency identity, and transition evidence survive restart and every possible replay horizon.

**Privacy.** Safe summaries are separate from action truth. Public errors need not disclose whether an Approval or Task exists.

**Compatibility.** Preserves the repository's single-use intent while requiring Agent/Platform storage consolidation, stronger fields, and recovery behavior.

**Strengths.** Aligns exact human consent, H-02 consume-before-Task, and H-07 atomic acceptance; smallest replay and compromise window; deterministic ambiguous retry.

**Risks.** Requires cross-record transactional storage or an equivalent serialized log. A consumed Approval cannot be reused after a legitimate post-acceptance failure.

**Operational cost.** High implementation rigor, moderate steady-state cost, lower incident ambiguity.

**Accepted-decision effect.** Compatible with H-01 through H-07 and does not supersede them.

**Later-decision effect.** H-09 owns accepted-work recovery and Result/Receipt semantics; H-10 owns bytes/proofs; H-11 owns historical proof/revocation evidence; H-12 owns transport/errors; D2-02/D2-03/D2-04/P1-03 own base conformance fixtures; H-13 owns extension/evolution effects only; H-14 owns support and retention.

### Option C — Reservation at acceptance, final consumption at execution or effect

**Object and state model.** Available authority enters a reserved state during admission and becomes consumed at Task start, first effect, successful effect, or Receipt.

**Exact binding.** It can preserve the Option B inventory, plus reservation owner, lease, fencing token, and finalization event.

**Issuance.** Same as Option B.

**Consumption.** Delayed until a post-acceptance event. If reservation is declared final for authorization purposes, the option collapses to Option B with an internal implementation label.

**Retry and replay.** Retry must discover and recover or steal reservations without authorizing duplicate execution.

**Rollback.** Pre-finalization failures may release reservations, creating a risk that partially executed work regains authority.

**Concurrency.** Requires leases, fencing, ownership transfer, clock rules, and duplicate-effect suppression.

**Expiry.** Must decide whether expiry terminates a live reservation and how lease time relates to Approval validity and Task deadline.

**Restart and retention.** Reservation journal and fencing state must survive all participants and reconcile after partial failure.

**Privacy.** Reservation existence can disclose active operations.

**Compatibility.** Does not match current simple used flags and requires major Task-execution integration.

**Strengths.** May avoid permanently spending authority when no work was admitted or begun.

**Risks.** Crosses H-09, creates ambiguous partial-effect recovery, and can violate H-02 consume-before-Task.

**Operational cost.** Very high distributed-systems and operational complexity.

**Accepted-decision effect.** Conflicts with H-02 unless reservation is the true irreversible consumption; then it is semantically Option B.

**Later-decision effect.** Prematurely decides H-09 recovery and demands H-10 through H-14 support for leases, fencing, errors, vectors, and retention.

### Option D — Bounded multi-use quota Approval

**Object and state model.** Approved authority holds a durable remaining-use, amount, time, or aggregate budget and becomes exhausted, expired, or revoked.

**Exact binding.** It binds a narrowly defined action class plus a quantitative budget and aggregation rules. A single exact Invocation binding cannot provide meaningful multiple uses.

**Issuance.** The approver sees the full maximum aggregate authority, beneficiary, time window, count/amount units, and policy.

**Consumption.** Each H-07 acceptance atomically decrements the budget and binds a Task/idempotency record. Exhaustion is terminal.

**Retry and replay.** Exact retries do not decrement again. Conflicts and concurrent distinct uses require atomic budget accounting.

**Rollback.** A decrement committed with acceptance is not restored; otherwise duplicate effects are possible. H-09 still owns later failure.

**Concurrency.** Requires serialized arithmetic, unit normalization, overflow protection, and aggregate-policy enforcement.

**Expiry.** Strict time expiry competes with budget exhaustion at one serialized boundary.

**Restart and retention.** The full mutation ledger and tombstone survive; snapshots alone need rollback protection.

**Privacy.** Remaining budget and aggregate history can reveal sensitive volume.

**Compatibility.** No existing Ghost Bridge Approval schema or store provides complete quota semantics.

**Strengths.** Reduces repeated prompts while bounding maximum authority.

**Risks.** Resembles delegated authorization more than exact-action consent; unit and aggregation bugs can widen authority.

**Operational cost.** Highest schema, storage, audit, migration, and conformance cost.

**Accepted-decision effect.** Likely requires explicit H-02/H-04 refinement or supersession because the approved object is an action class, not one exact action.

**Later-decision effect.** Substantially expands every H-09 through H-14 work item.

## Accepted decision

Human approval on 2026-08-07 selected **Option B: single-use exact-action
Approval consumed atomically at the H-07 Invocation-acceptance boundary**,
including every approved qualification, risk, consequence, and deferred
boundary recorded in this decision.

The accepted rationale is:

1. it preserves H-02's separation between Approval and all other authority gates;
2. it makes “consume before Task or effect” precise without creating a pre-acceptance burn window;
3. it uses H-07's already accepted serialization boundary instead of inventing a competing authority point;
4. it gives exact retries a deterministic recovery path after an ambiguous response without granting a second use;
5. it prevents post-acceptance Task or effect outcomes from restoring human authority and causing duplicate effects;
6. it gives restart, rollback, split-brain, and retention tests one durable truth to examine; and
7. it has materially smaller authority and compromise scope than reusable or quota Approvals.

The accepted decision is not based on assuming H-06 grant semantics apply. It
independently reaches a similar single-commit safety property because Approval
faces replay, double-use, and ambiguous-commit threats while H-02 and H-07
constrain its legal boundary.

Under selected Option B, “single-use” means one new-work acceptance, not one
HTTP request, one proof verification, one Decision submission, one Task poll,
one execution attempt, or one response delivery.

## Exact bound-field inventory

The following inventory is accepted semantic governance content. H-10 must
later define canonical field names, types, presence rules, encoding, digest
construction, proof suites, and domain separation. A binding may be stored
directly or through an immutable, content-addressed historical reference only
where identified. Failure to resolve any authority-critical reference exactly
is a closed failure, never permission to use current defaults.

### Accepted field-classification matrix

| Required classification | Accepted contents | Acceptance treatment |
|---|---|---|
| 1. Directly retained authority-critical semantics | Approval/Challenge/Decision identities; release/profile IDs; Connection ID; requester/effective actor/beneficiary/Approver/target identities; Agent/Passport/resource/audience; org/tagged workspace; capability key/version; operation; resource/destination/recipient/account; parameters, payload identity, amount/currency/quantity/rate/range, limits, effect class; nonce; Decision outcome/time; validity; Invocation and continuation identity | Stored immutably and compared for exact value and presence; no lookup default or widening transformation |
| 2. Immutable referenced evidence | Connection bundle/history; selected release artifacts; input/output contract; approver authority evaluation; decision authentication/proof; authorization and policy Decision identity; Trust/revocation evidence; full action descriptor; H-10 profile; H-11 history anchors; rendering profile | Resolve exact historical bytes/semantics and digest; missing, changed, ambiguous, or corrupt evidence fails closed |
| 3. Current narrowing evidence | Current authentication/principal, Connection state/expiry, Trust/revocation, authorization, deployment policy, capability availability, tenant scope, deadline, authoritative compromise/revocation and explicitly bound revocable eligibility-source status, and disclosure authorization | Reload/re-evaluate at the controlling commit; can narrow or deny only and cannot reconstruct or mutate decision-time eligibility or the approved action |
| 4. Transient values | HTTP connection, transport message ID where not bound by profile, local cache entry, parser object, lock, lease, reservation, worker/queue handle, trace span, response object, metric, and delivery acknowledgement | May support operation but grants no authority and is not consumption evidence |
| 5. Prohibited values and inferences | Body-claimed requester/Approver as identity; current default for omitted historical data; display text as action truth; compatible version alias; null/truthiness scope collapse; request proof as Approval proof; Receipt as retroactive Approval; cache presence/absence or deletion as consumption; current schema as legacy meaning | Never used to create, widen, restore, transfer, or prove Approval authority |
| 6. Historical tombstone fields | Approval/Decision/action IDs and safe digests; final state/reason/time; Connection/release/tenant scope; accepted Invocation/Task/idempotency/Result/Receipt linkage where available; transaction sequence/fence; audit/history anchor; retention boundary; migration provenance | Retained durably for exact retry, replay denial, investigation, and historical verification; linkage is evidence, never retroactive authorization |

The next six domain inventories expand those classifications. A field can have both a direct semantic identifier and an immutable evidence reference, but its security meaning must be assigned to one of the six classifications above.

### 1. Protocol and authority context

| Field or fact | Binding rule | Reason |
|---|---|---|
| Approval profile identifier and version | Direct | Prevents cross-profile interpretation |
| exact selected Ghost Bridge protocol release | Direct plus historical artifact reference | Prevents current-release reinterpretation |
| Connection ID | Direct | Anchors authority to one Connection |
| immutable Connection-consent/history reference and digest | Immutable reference plus digest | Proves the accepted authority context |
| Connection authority epoch or replacement identity, if the accepted lifecycle defines one | Direct | Prevents use after replacement or rollback |
| exact Agent identity | Direct, verified | Prevents cross-Agent replay |
| exact governed resource/host identity | Direct where distinct from Agent | Prevents confused-deputy routing |
| exact Agent Passport ID and version | Direct plus immutable Passport/history reference | Prevents target identity or Passport substitution |
| Approval proof audience | Direct | Prevents proof use for another verifier/resource |
| tenant organization scope | Direct, normalized exact value | Prevents cross-tenant replay |
| workspace scope | Direct tagged union: absent or exact present value | Prevents null/empty/absent collapse |

### 2. Actor and policy context

| Field or fact | Binding rule | Reason |
|---|---|---|
| authenticated requester principal type and stable ID | Derived from verified evidence, then bound | Prevents body spoofing |
| effective actor principal, if delegated | Derived and bound separately | Makes delegation auditable |
| beneficiary/on-behalf-of principal, if any | Derived or policy-validated and bound | Prevents beneficiary substitution |
| target principal or resource | Direct and verified | Prevents target substitution |
| authenticated approver principal type and stable ID | Derived from Decision authentication | Prevents `decidedBy` spoofing |
| approver authority source, role, or eligibility rule reference | Immutable evaluated reference plus decision-time result | Proves why the Decision was accepted |
| requester/approver relationship and self-approval disposition | Direct evaluated fact | Makes separation-of-duty explicit |
| current policy namespace, rule ID/version, and immutable Decision reference | Immutable reference and digest | Prevents policy-result substitution |
| authorization Decision ID/version and immutable evaluated evidence | Immutable reference and digest | Prevents authorization laundering or substitution |
| Trust and revocation evidence identity/sequence at Decision and acceptance | Immutable issuance evidence plus current narrowing recheck | Supports historical explanation without freezing current Trust |
| required approval class/risk class | Direct | Prevents low-risk Approval reuse for higher risk |
| safe reason code | Direct, non-authoritative | Supports audit without exposing sensitive free text |

### 3. Exact Invocation and capability context

| Field or fact | Binding rule | Reason |
|---|---|---|
| Invocation ID | Direct | Defines the one exact new-work identity |
| continuation/idempotency identity and namespace | Direct | Enables safe exact-retry convergence |
| capability key | Direct | Prevents capability substitution |
| capability version | Direct | Prevents version substitution |
| exact operation/action key | Direct | Prevents operation substitution |
| selected input-contract reference and digest | Immutable reference plus digest | Prevents schema reinterpretation |
| normalized payload digest | Direct | Prevents parameter mutation |
| side-effect category and declared effect class | Direct | Prevents read/write or risk-class substitution |
| target object/resource selector | Direct or content-addressed exact reference | Prevents target mutation |
| resource type and exact resource identity | Direct | Prevents type-compatible target substitution |
| destination, recipient, account, repository, project, or comparable effect target | Direct when applicable | Prevents redirection after human review |
| effect parameters and numeric amount/currency/quantity/rate/range | Direct with explicit units and precision | Prevents value and unit widening |
| requested output/return contract when authority-relevant | Direct | Prevents data-exfiltration widening |
| parent/delegation/correlation identity when authority-relevant | Direct | Prevents lineage substitution |

### 4. Scope, limits, and validity

| Field or fact | Binding rule | Reason |
|---|---|---|
| requested org/workspace/action scope | Direct | States requested authority exactly |
| current effective capability/authorization/policy limits at Challenge issuance | Immutable evidence reference | Explains presentation, but never replaces current checks |
| approved limits | Direct, complete, no omitted widening defaults | Defines the human narrowing |
| units, currency, locale, precision, and aggregation semantics for numeric limits | Direct where applicable | Prevents unit or rounding substitution |
| action validity start, if permitted | Direct | Prevents early use |
| Challenge submission expiry | Direct | Bounds human Decision submission |
| Approval-authority expiry | Direct and no later than any governing maximum | Bounds authority use |
| Invocation deadline | Direct when part of the action | Prevents deadline extension |
| clock/profile identifier | Direct | Prevents mixed-clock interpretation |

### 5. Challenge and Decision evidence

| Field or fact | Binding rule | Reason |
|---|---|---|
| Challenge ID | Direct, unique in authority namespace | Prevents Decision reassignment |
| Challenge nonce | Direct, unique and unpredictable under the future profile | Prevents cross-Challenge Decision replay |
| Challenge issuance time and issuer identity | Direct, authenticated | Supports ordering and audit |
| safe summary digest and presentation profile | Direct | Detects UI/presentation substitution |
| omissions/redactions manifest and rendering version | Direct where display omits or transforms context | Makes security-relevant presentation loss detectable |
| immutable full action-binding digest | Direct | Connects display and authority truth |
| Decision ID | Direct, unique | Supports immutable outcome and replay protection |
| Decision outcome | Direct | Determines whether authority can exist |
| Decision time from serialization authority | Direct | Enforces Challenge validity |
| Decision proof/profile/key ID | Direct or immutable proof reference | Enables purpose-specific verification |
| approver-authentication evidence reference | Immutable protected reference | Supports eligibility audit without body trust |
| approved limits and any permitted narrowing | Direct | Prevents limits substitution |
| Decision reason category | Direct, safe vocabulary | Supports audit and H-12 mapping |

### 6. Consumption and durable recovery evidence

| Field or fact | Binding rule | Reason |
|---|---|---|
| Approval authority ID | Direct, unique | Identifies serialized consumable authority |
| authority state and state version | Durable authoritative record | Prevents stale compare-and-set |
| authority creation/availability time | Durable | Supports lifecycle reconstruction |
| terminal time and terminal reason | Durable | Supports expiry/revocation/consumption proof |
| consumed-by Invocation ID | Durable for consumed state | Links one use |
| accepted Task ID | Durable for consumed state | Enables exact retry and investigation |
| accepted idempotency record and semantic digest | Durable for consumed state | Prevents duplicate new work |
| H-07 acceptance serialization sequence/fencing token | Durable | Orders races and detects rollback |
| transaction/log record identifier | Durable | Reconciles ambiguous commits |
| audit-intent/event identity | Durable in the same outcome | Makes eventual audit delivery recoverable |
| previous-state hash or append-only chain reference, where selected by H-11 | Future immutable reference | Detects deletion or rollback |
| Result and Receipt identities/digests, when later produced | Downstream immutable linkage only | Supports history without making either the consumption event |
| future H-10 digest/profile and H-11 historical-verification identifiers | Direct/profile references | Prevents later verifier reinterpretation |
| retention class and not-before-delete boundary | Durable metadata | Prevents premature tombstone loss |

### Required equality rule

At acceptance, every direct field must equal the authoritative current request or verified identity in both value and presence. Every immutable reference must resolve to its exact historical content and digest. No case folding, Unicode normalization, numeric conversion, null/absent conversion, unit conversion, alias, default, current-version lookup, or “compatible” substitution is permitted unless the future H-10 profile explicitly performs that transformation before both issuance and comparison.

Safe summary text is never the source of action truth. If the summary and bound action disagree, acceptance fails and the discrepancy is audited.

## Approval state and authority matrix

### Accepted Challenge lifecycle

| State | Meaning | Grants authority? | Terminal? | Permitted exits |
|---|---|---:|---:|---|
| `open` | Durable Challenge can receive one valid Decision before expiry | No | No | `decided`, `expired`, `cancelled`, `superseded` |
| `decided` | One immutable Decision committed for this Challenge | No by itself | Yes | None |
| `expired` | Serialization clock reached/passed Challenge expiry before a Decision committed | No | Yes | None |
| `cancelled` | Authorized cancellation committed before a Decision | No | Yes | None |
| `superseded` | A material action change caused a replacement Challenge | No | Yes | None |

`pending` in current draft schemas is treated as a legacy encoding candidate for `open`, not as automatically equivalent. Migration must prove equivalence.

### Accepted Decision outcomes

| Outcome | Human meaning | Creates available authority? | Challenge result |
|---|---|---:|---|
| `approved` | Eligible approver affirmatively approves the exact bound action and limits | Yes, only after durable commit and subject to all independent gates | `decided` |
| `denied` | Eligible approver refuses the exact action | No | `decided` |
| `more_information_required` | Approval is withheld; revised facts require a new Challenge | No | `decided` |

A Decision outcome is immutable and is not later changed to consumed, expired, cancelled, or revoked. Those words describe other state machines.

### Accepted Approval-authority lifecycle

| State | Meaning | Can authorize new acceptance? | Terminal? | Permitted exits |
|---|---|---:|---:|---|
| `available` | Approved Decision exists; authority is not yet terminal | Only if every current gate passes | No | `consumed`, `expired`, `revoked` |
| `consumed` | H-07 acceptance and Task/idempotency binding committed atomically | No; exact retry may read existing outcome | Yes | None |
| `expired` | Strict authority-expiry boundary won before acceptance | No | Yes | None |
| `revoked` | Authorized revocation/compromise response won before acceptance | No | Yes | None |

There is no protocol `reserved` state in the accepted decision. Storage may
use locks, compare-and-set versions, leases, or fencing internally, but crash
recovery must resolve them to one of the listed authoritative states without
widening authority.

### Approval state and effective authority

| Approval fact | Other gates | Acceptance result |
|---|---|---|
| No Challenge | Any | No Approval authority; issue a Challenge only if independently authorized and safe |
| Open Challenge, no Decision | Any | No Approval authority |
| Denied or information-required Decision | Any | Deny; no authority exists |
| Available authority | Any required gate fails | Deny without consumption |
| Available authority | All required gates pass and atomic commit wins before expiry/revocation | Accept once and record consumed |
| Expired or revoked authority | All other gates pass | Deny |
| Consumed authority, exact authorized retry | Existing acceptance evidence matches completely | Return/read existing accepted identity; no new Task or transition |
| Consumed authority, mismatch or ineligible caller | Any | Deny without mutation or existence disclosure beyond H-12 policy |

## Legal transition table

The table records the accepted governance semantics. It does not create an
executable state machine or authorize implementation.

| Transition | Source | Trigger | Authenticated actor | Mandatory guards | Clock/ordering point | Serialized durable effects | Authority after commit | Task effect | Audit and retry/restart behavior | Dependencies |
|---|---|---|---|---|---|---|---|---|---|---|
| Issue Challenge | none | Independently authorized exact Invocation requires Approval | Agent acting for verified requester | Active admissible Connection; exact scope/capability; Trust/authz/policy permit challenge; safe presentation; no equivalent live Challenge/idempotency result | Challenge-issuance commit | Create immutable binding, safe summary digest, issuer, expiry, state `open` | None | No accepted Task; a UI/waiting representation is non-authoritative | Idempotent issue retries return same Challenge only on full equality; survives restart | H-01–H-05, H-07; H-10/H-12 later |
| Submit approved Decision | Challenge `open` | Approver chooses approve | Verified eligible approver | Exact Challenge/action digest; Decision proof purpose/audience; role and self-approval policy; strict pre-expiry; no prior Decision; limits only narrow | Decision commit | Append immutable Decision; set Challenge `decided`; create authority `available`; audit intent | Available, conditional | None | Exact submission retry may return same Decision after verified equality; conflict fails | H-02/H-05; H-10/H-11/H-12 later |
| Submit denied Decision | Challenge `open` | Approver chooses deny | Verified eligible approver | Same identity, proof, expiry, and single-Decision guards | Decision commit | Append immutable Decision; set Challenge `decided`; no authority; audit intent | None | None | Exact retry reads same outcome; no revised action under same Challenge | H-02/H-05; H-10/H-12 later |
| Submit information-required Decision | Challenge `open` | Approver withholds approval pending changed facts | Verified eligible approver | Same guards | Decision commit | Append immutable Decision; set Challenge `decided`; no authority | None | None | New facts require a new Challenge and identity | H-02/H-04; H-12 later |
| Expire Challenge | Challenge `open` | Decision attempt or sweeper observes time at/after expiry | Storage authority or Agent | Authoritative state still open; serialization clock `>=` expiry | State-transition commit | Set Challenge `expired`; audit intent | None | None | Lazy transition and sweeper must converge; restart derives same result | H-05 clock rules; H-11/H-14 later |
| Cancel Challenge | Challenge `open` | Authorized requester/Agent/operator cancellation | Verified actor permitted by policy | Still open; exact scope; no Decision committed | State-transition commit | Set Challenge `cancelled`; reason category; audit intent | None | None | Race with Decision has one winner | H-02; H-12 later |
| Supersede Challenge | Challenge `open` | Material action/binding change creates replacement | Agent for verified requester | Old Challenge still open; new Challenge independently valid | Ordered old/new commit or recoverable log | Old becomes `superseded`; new Challenge gets new ID/digest | None from old | None | Never mutate old action in place | H-01/H-03/H-04 |
| Consume available authority | Authority `available` | Exact continuation requests new-work acceptance | Agent for verified requester/effective actor | Full H-07 gates; exact fields; approved Decision and immutable decision-time eligibility/proof evidence; authoritative compromise/revocation and explicitly bound revocable-source rechecks without current-default reinterpretation; strict pre-expiry; not revoked; exact idempotency; race rechecks | H-07 final acceptance commit | Authority `consumed` plus tombstone, accepted Invocation/Task/idempotency evidence, fencing/sequence, audit intent | Terminal consumed | Exactly one accepted Task identity becomes durable | Ambiguous response rereads; exact retry converges; restart cannot restore | H-01–H-07; H-09 after commit; H-10–H-14 later |
| Expire available authority | Authority `available` | Acceptance attempt or sweeper observes time at/after authority expiry | Storage authority or Agent | State still available; serialization clock `>=` expiry | State-transition commit ordered against consumption | Set `expired`; terminal tombstone; audit intent | Terminal expired | None | Consumption/expiry race has one winner; no clock rollback restoration | H-05/H-07; H-11/H-14 later |
| Revoke available authority | Authority `available` | An enumerated purpose-specific revocation source from the Approval revocation-source matrix | Authenticated exact-scope revocation authority | Immutable evidence identity; state still `available`; source is purpose-bound and authorized; ordinary policy denial is not revocation; serialize against consumption and expiry | State-transition commit ordered against consumption and expiry | Set `revoked`; terminal tombstone; source/evidence identity; reason; audit intent | Terminal revoked | None | Acceptance/revocation/expiry race has one winner; delivery failure does not undo; exact mechanics remain H-11 | H-02/H-05; H-11/H-12 later |
| Read exact consumed retry | Authority `consumed` | Same continuation is retried | Same currently authenticated requester/effective actor authorized to learn result | Full semantic/idempotency equality; privacy authorization; durable accepted evidence intact | Read at authoritative snapshot; no transition | None | Remains consumed | No new Task; reference existing identity | If evidence corrupt/missing, fail closed and alert; never recreate | H-07; H-09/H-12 later |

## Illegal transition table

| Attempt | Why illegal | Required behavior |
|---|---|---|
| `expired`, `cancelled`, or `superseded` Challenge to any Decision | Challenge terminal | Fail without authority or mutation |
| `decided` Challenge to a second Decision | One immutable Decision per Challenge | Exact duplicate may read same Decision; conflict fails |
| denied or information-required Decision to available authority | Human approval was not given | No authority object may be created |
| change an approved Decision to denied or vice versa | Decision immutable | Create no replacement under same Challenge |
| mutate action, scope, limits, actors, expiry, or proof on an existing Challenge/Decision | Would reinterpret consent | Create a new Challenge after independent authorization |
| `available -> consumed` outside H-07 acceptance serialization | Creates burn or double-commit window | Abort; leave available unless another terminal transition won |
| `available -> available` while creating a Task | Hides consumption | Reject transaction |
| `consumed -> available` | Enables duplicate accepted work | Fail closed; H-09 handles accepted work |
| `expired -> available` after clock correction or extension | Revives terminal authority | New Challenge and Decision required |
| `revoked -> available` | Revives compromised/withdrawn authority | New Challenge and Decision required |
| consumed authority to a different Invocation, action, requester, target, or idempotency identity | Replay/widening | Deny without mutation |
| create Task before consumption commit | Violates H-02/H-07 | Abort Task creation |
| consume because Task started, effect occurred, Result succeeded, or Receipt arrived | Too late; crosses H-09 | Treat as protocol violation; do not infer prior authority |
| delete tombstone while replay remains possible | Can restore practical replayability | Retain or cryptographically archive according to H-14 |
| accept on missing/corrupt/rollbacked state | Cannot prove authority | Fail closed, raise integrity incident |

### Legal-transition audit and recovery supplement

| Legal transition | Required audit evidence | Retry result | Crash/restart behavior | Deferred dependencies |
|---|---|---|---|---|
| Issue Challenge | Issuer/requester IDs, action/safe-summary digests, exact scope, issuance/expiry, policy/authz references | Exact equal retry may read same Challenge; conflict creates nothing | Either complete open Challenge exists or no Challenge; partial state quarantined | H-10 proof/bytes; H-11 durability; H-12 errors |
| Submit approved Decision | Derived Approver/authority source, proof/profile, action digest, limits, Decision time/outcome | Exact same authenticated submission reads immutable Decision; conflict fails | Complete Decision and available authority exist together; partial state indeterminate | H-10 proof; H-11 identity history; H-12 disclosure |
| Submit denied/information-required Decision | Same provenance plus non-authorizing outcome/reason | Exact retry reads same Decision; changed outcome fails | Complete terminal Decision or provable noncommit; never infer authority | H-11 audit; H-12 errors |
| Expire/cancel/supersede Challenge | Prior version, actor or clock trigger, reason, winner sequence, replacement ID if any | Reads terminal state; cannot revive | Terminal tombstone survives and defeats stale cache | H-11 rollback; H-14 retention |
| Consume available authority | Every H-07 evaluated gate/version, exact action/equality digest, Decision proof, sequence/fence, accepted Invocation/Task/idempotency, audit intent | Exact authorized retry converges; conflict fails | Complete consumed/accepted outcome survives; ambiguity is reread or quarantine, never restore | H-09 execution; H-10 proof; H-11 durability; H-12 response; D2-02/D2-03/D2-04/P1-03 tests; H-13 extension/evolution; H-14 support |
| Expire/revoke available authority | Prior version, clock or authenticated revoker, reason, race winner | Reads terminal state; no use/revival | Tombstone survives restart/restore; rollback detected | H-11 revocation/history; H-12 disclosure; H-14 retention |
| Read exact consumed retry | Current authenticated reader, disclosure decision, equality result, existing acceptance reference | Same accepted identity; no state change | Missing/corrupt linkage fails closed and raises integrity incident | H-09 result view; H-12 response/privacy |

## Exact-action field-equality matrix

| Field class | Required equality | Prohibited substitution | Failure effect |
|---|---|---|---|
| IDs: Challenge, Decision, Approval, Connection, Invocation, continuation/idempotency | Exact namespace, value, and presence | Alias, case fold, new ID, different namespace | Deny without consumption |
| Protocol/profile/release/history | Exact selected identifiers and immutable artifact digests | “Latest,” ordered-newer, compatible, current default | Fail closed; missing history is integrity failure |
| Principals and target | Exact verified type, stable ID, delegation/beneficiary relationship, Agent/Passport/resource/audience | Body claim, display name, same organization assumption, shared key alone | Deny; audit safe mismatch |
| Tenant scope | Exact organization plus tagged workspace absent/present and value | null/empty/whitespace truthiness, parent/child override | Deny without existence disclosure |
| Capability/action/resource/effect | Exact capability key/version, operation, resource type/ID, destination/recipient/account/project, side-effect class | Compatible capability, renamed operation, same resource type, redirect | Deny; material change needs new Challenge |
| Parameters/payload/contracts | Exact semantic digest, contract reference/digest, presence, units, precision, amount/currency/quantity/rate/range | Re-encoding not allowed by profile, omitted default, rounding, unit conversion | Deny; H-10 defines qualified representation |
| Limits | Requested values within complete approved limits and all current narrower limits | Missing as unlimited, alternate unit, aggregate reset | Deny; Approval cannot widen |
| Policy/authz/Trust evidence | Exact immutable issuance references plus required current evaluated versions | Cached success, body reference, current default replacing history | Deny/unavailable; never consume |
| Time | Exact stored timestamps/profile and current strict comparisons | Local arrival/display time, rounded equality, longer derived expiry | Deny/expire according to serialized winner |
| Presentation | Full action identity plus safe-summary, omissions/redactions, rendering profile digests | Matching text alone, hidden material target/amount/effect | Deny Decision/use; new accurate Challenge required |

## Expiry truth table

| Object/action | Serialization clock relative to boundary | Other state | Accepted result |
|---|---|---|---|
| Submit Decision | before Challenge expiry | Challenge open | Decision may commit if every other guard passes |
| Submit Decision | equal to Challenge expiry | Challenge open | Challenge expires; Decision does not commit |
| Submit Decision | after Challenge expiry | Challenge open or expired | No Decision authority; converge on expired |
| Consume Approval | before Approval expiry and Invocation deadline | Authority available; all gates pass | Atomic acceptance may commit |
| Consume Approval | equal to either Approval expiry or Invocation deadline | Authority available | No acceptance; expiry/deadline boundary wins as applicable |
| Consume Approval | after Approval expiry | Authority available or expired | Transition/read expired; no Task |
| Consume Approval | before Approval expiry | Connection/proof/policy/Trust independently expired or invalid | Deny without consumption; one clock cannot substitute for another |
| Exact retry | after Approval expiry | Complete consumed acceptance committed earlier | May read existing result after current authentication/disclosure; no new authority |
| Clock rolls backward | any | Terminal Challenge/authority | Never revive; detect rollback or fail closed |
| Sweeper has not run | at/after expiry | Record still encoded open/available | Request path enforces authoritative expiry before Decision/acceptance |

## Retry and replay matrix

| Observed request | Authoritative state | Equality/authorization | Accepted result | Authority/Task mutation |
|---|---|---|---|---|
| First continuation | available | exact and all gates pass | Attempt atomic H-07 acceptance | One consumption and one Task only on commit |
| Definite precommit failure retry | available | exact; current gates re-pass | May try fresh transaction | None until commit |
| Lost success response | consumed | exact and caller may learn result | Converge on existing accepted identity | None |
| Exact retry by different/ineligible principal | consumed | action bytes match but disclosure fails | Privacy-safe deny | None |
| Same idempotency/Invocation, changed semantic | any | conflict | Deny conflict without protected detail | None |
| Same Approval, different idempotency/Invocation | available or consumed | conflict with exact binding | Deny; new action requires new Challenge | None |
| Same Decision submission | decided | identical verified Decision/actor | Read same immutable outcome | None |
| Second different Decision | decided | conflict | Deny | None |
| Unknown/cross-scope Approval | unknown to authorized view | cannot safely distinguish | H-12-qualified non-oracular failure | None |
| Indeterminate commit | indeterminate | equality insufficient until storage reconciles | Fail closed and reconcile; no blind retry | None until one complete outcome is proven |

## Concurrent continuation matrix

| Attempt A | Attempt B | Serialized winner | Loser behavior | Invariant |
|---|---|---|---|---|
| Exact | Exact | One acceptance commit | Verify equality and converge on same Task | One state transition and Task identity |
| Exact | Conflicting | Whichever valid transition reaches the boundary first; conflicting request can never consume | Conflict fails without Task/existence leak | Consumed action must equal Approval exactly |
| Conflicting | Conflicting | Neither unless one independently equals full binding | Each mismatch fails | No “closest match” or partial consumption |
| Consume | Approval expiry | Commit ordered by authoritative clock/serialization | Later operation reads consumed or expired | One terminal state |
| Consume | Approval revocation | One authoritative commit | Later operation reads winner | No restore or dual terminal states |
| Consume | Connection termination | H-07 ordering controls | Termination-first denies; acceptance-first becomes H-09 work | H-07 boundary preserved |
| Consume | Authorization/policy/Trust withdrawal | Current evidence versions ordered/rechecked | Withdrawal-first denies; accepted-first is durable | Historical allow does not win later |
| Writer | Stale writer after failover | Current fence/sequence only | Stale writer rejected and audited | No split-brain consumption |

## Connection lifecycle versus Approval matrix

| Connection state/event | Available Approval | Consumed Approval/exact retry | Accepted authority effect |
|---|---|---|---|
| `active`, unexpired | May contribute only if every other current gate passes | May read existing outcome if authorized | Active is necessary, not sufficient |
| `suspended` | Cannot accept new Invocation; remains available only as a record and may expire/revoke | Accepted-work view governed by H-09/H-12 | Suspension never widens or consumes |
| `expired` | Cannot be used; no transfer or extension | Existing accepted history remains evidence | Terminal Connection blocks new work |
| `closed` | Cannot be used | Existing accepted history remains evidence | No new Challenge/use |
| `revoked` | Cannot be used; compromise response may also tombstone Approval | Existing history subject to H-11 conclusions | No current authority |
| `replaced` | Cannot move to replacement Connection | Existing result remains bound to old Connection | New Connection/action needs new Challenge |
| termination races acceptance | One serialized winner under H-07 | If acceptance won, postcommit work is H-09 | No retrospective Approval restoration |
| history missing/corrupt | Cannot prove binding | Exact retry cannot invent linkage | Fail closed and raise integrity incident |

## Authentication, Trust, authorization, and policy change matrix

| Current gate at Decision/use | At Decision commit | At consumption commit | Authority consequence |
|---|---|---|---|
| Requester authentication valid | Does not prove Approver | Required for continuation and requester derivation | Failure creates no use and no consumption |
| Approver authentication valid | Required with Approval purpose/audience | Historical proof remains required; recheck authoritative compromise, revocation, and any explicitly bound revocable eligibility source, but do not reinterpret decision-time eligibility using unrelated current defaults | Body claim never substitutes |
| Selected authentication unavailable | Decision cannot safely commit | Acceptance fails/suspends per H-05 profile | Approval stays available unless it expires/revokes |
| Authentication/key compromised or binding revoked | No Decision | No acceptance; terminal accepted H-05 consequences apply | Approval cannot override compromise |
| Trust current | Required as applicable | Reload/recheck required | Failure denies without consumption |
| Authorization allow | Permits Challenge/Decision workflow only within policy | Current structured authorization must still allow exact action | Historical allow cannot manufacture Approval or freeze authority |
| Deployment policy allow/requires Approval | Defines Challenge/eligibility/limits | Current policy must still allow and may narrow | Changed material action requires new Challenge |
| Any gate widens after Decision | No automatic Decision change | Effective authority remains capped by Approval and Connection | Later widening cannot expand consent |

## Persistence, corruption, and restart matrix

| Durable observation | Classification | Accepted recovery | New-work authority |
|---|---|---|---|
| Complete open Challenge | Known | Reload immutable action and current clock | None until valid Decision |
| Complete approved Decision plus available authority | Known | Reverify immutable history and all current gates on use | Conditional available |
| Complete consumed tombstone plus accepted Task/idempotency | Known | Exact authorized retry converges | No new acceptance |
| Complete expired/revoked terminal tombstone | Known | Return privacy-safe terminal result | None |
| Decision exists but Challenge/authority commit incomplete | Indeterminate | Quarantine and reconcile append-only transaction evidence | None |
| Consumed flag without Task/idempotency binding | Indeterminate | Never restore or invent Task; operator/integrity workflow | None |
| Task exists without consumption evidence | Integrity violation | Stop governed execution/recovery as H-09/H-11 later define; never synthesize approval | None |
| State missing after prior reference | Corrupt/deleted | Fail closed; consult retained anchors/backups without rollback | None |
| Lower sequence or restored snapshot | Rollback | Reject stale state, alert, recover from monotonic authority | None |
| Duplicate IDs with different content | Split-brain/collision | Quarantine namespace and deny | None |
| Local cache disagrees with durable store | Stale cache | Durable authority wins; invalidate cache | None based on cache |
| Durable store unavailable | Unavailable | Fail closed; no cache-success fallback | None |

## Task/H-09 boundary matrix

| Event | Approval authority effect | Task effect under H-08 | Owner of later semantics |
|---|---|---|---|
| Challenge issued or Decision pending | None | No H-07 accepted Task; UI placeholder is non-authoritative | H-08 workflow semantics; H-12 representation |
| H-07 acceptance transaction aborts | Remains available unless expiry/revocation won | Candidate Task must not exist durably | H-07/H-08 |
| H-07 acceptance transaction commits | Becomes terminal consumed | Exactly one accepted Task identity becomes durable | Boundary event only |
| Queue publication/start fails | Remains consumed | Accepted Task recovery required | H-09 |
| Task retries, cancels, times out, fails, or succeeds | Remains consumed | No H-08 state change | H-09 |
| Side effect partial/duplicate/compensated | Remains consumed | No restoration | H-09 |
| Result or Receipt creation/delivery fails | Remains consumed | Existing Task identity remains | H-09 owns semantic outcome, retention, and Task/Receipt atomicity; H-10 proof bytes/linkage; H-11 historical consequences; H-12 wire delivery/disclosure |

## Failure and privacy-precedence matrix

| Condition | Internal semantic handling | Mutation rule | Public/disclosure boundary |
|---|---|---|---|
| Malformed or oversized input | Reject before expensive lookup | No Challenge/Decision/Task/consumption | H-12 safe structural failure |
| Authentication failure | Reject before Approval existence disclosure | None | Generic authentication profile result |
| Cross-tenant/scope/Agent/resource caller | Treat as unauthorized to learn object | None | Do not distinguish missing from present |
| Connection/current-gate denial | Deny before consumption | None | H-12 selects safe precedence/detail |
| Approval missing/open/non-approved | No authority | Challenge creation only through separately authorized path | Do not expose Approver or policy internals |
| Approval mismatch/expired/revoked/consumed conflict | Deny; record bounded safe audit | None | Stable non-oracular category under H-12 |
| Exact consumed retry | Authenticate and authorize disclosure, then read accepted evidence | None | Return only safe H-09/H-12 view |
| Storage/clock/history unavailable | Fail closed | None | Retry classification depends on proven noncommit and H-12 |
| Corrupt/rollback/split-brain/indeterminate | Quarantine and integrity response | No restore, delete, or new Task | Avoid confirming protected object facts; operator channel only |
| Audit or metric delivery failure after commit | Recover durable intent asynchronously | Never rollback consumption | Public success/ambiguity follows authoritative commit, not telemetry |

## Issuance and decision matrix

| Condition at Decision commit | Approved outcome | Non-approved outcome |
|---|---|---|
| Challenge open, proof valid, approver eligible, before expiry, exact digest | Create immutable Decision; available authority only for `approved` | Create immutable Decision; no authority |
| At exact Challenge expiry | Reject as expired; no Decision authority | Reject as expired; lifecycle transition wins |
| Challenge terminal | Reject | Reject |
| Different action digest or Challenge ID | Reject and audit mismatch | Reject and audit mismatch |
| Approver body claims eligible but authentication/policy does not | Reject | Reject |
| Approved limits widen requested/effective limits | Reject | Not applicable; still validate shape safely |
| Decision proof uses wrong purpose, audience, key, profile, or release | Reject | Reject |
| Decision storage outcome ambiguous | Reread authoritative record; return exact committed result or indeterminate fail closed | Same |

## Approver eligibility and post-Decision change rules

For the accepted model:

1. Current Approval-purpose authentication and approver eligibility are mandatory at the Decision serialization commit.
2. The Decision durably retains immutable evidence of the approver principal, Approval-purpose proof, authority source, eligibility rule or role source, self-approval disposition, evaluation result, and decision time.
3. Decision-time eligibility is historical evidence and may not later be reconstructed or reinterpreted from current defaults, display names, current role membership, or an untrusted body field.
4. At consumption, the Agent must verify the immutable Decision evidence and check current authoritative compromise or revocation of the Approval-purpose key, approver principal, Decision issuer, or explicitly bound revocable authority source.
5. An ordinary later role-membership change, policy edit, authorization denial, or deployment-policy narrowing does not rewrite the immutable Decision or automatically transition Approval authority to `revoked`. Current action authorization and deployment policy are nevertheless re-evaluated and may deny consumption without consuming or mutating the Approval.
6. A mutable eligibility source affects an already issued available Approval only when the selected release/profile made that source explicitly revocable, the Decision bound its identity and semantics, and an authoritative purpose-specific revocation event exists.
7. Self-approval is denied unless the selected release/profile and current structured authorization or deployment policy explicitly permit it and the Decision immutably binds that evaluated disposition. Absence, ambiguity, or body assertion is denial.
8. Compromise or authoritative revocation may prevent use or terminally revoke available Approval authority, but exact mechanics, sequences, freshness, key history, and historical verification remain H-11.

These rules are part of the accepted H-08 governance decision.

## Approval revocation-source matrix

| Condition or source | Approval-authority state effect | Current-use effect | Required boundary |
|---|---|---|---|
| Explicit purpose-specific withdrawal by the original eligible approver, when the selected release/profile permits withdrawal | `available -> revoked` | Deny | Separate authenticated immutable revocation event; never mutate the Decision |
| Approval-purpose key, approver principal, Decision issuer, or explicitly bound authority source is authoritatively compromised or revoked | `available -> revoked` when the accepted source semantics affect the Approval | Deny | H-11 later defines sequence, freshness, affected-object calculation, and historical treatment |
| Exact-scope security/operator revocation by a registered Approval-revocation authority | `available -> revoked` | Deny | Actor and scope must be authenticated, authorized, purpose-bound, and durably recorded |
| Ordinary current authorization denial or deployment-policy narrowing | No automatic Approval-state change | Deny without consumption | H-02 narrowing gate; not lifecycle revocation |
| Ordinary role-membership change without an explicitly bound revocable source | No automatic Approval-state change | Re-evaluate current action policy; deny where applicable | Never reinterpret historical Decision eligibility from current defaults |
| Authentication or Trust evidence unavailable or stale | No automatic Approval-state change | Deny or apply accepted H-05/H-07 suspension behavior | Unavailability is not revocation |
| Connection suspended | No Approval-state widening or consumption | Deny new Invocation | H-07 controls suspension |
| Connection expired, closed, revoked, or replaced | No transfer to another Connection; Approval cannot be used | Deny permanently under that Connection | Approval may later expire or receive separate authoritative revocation evidence |
| Approval already consumed | Remains `consumed` | Exact authorized retry may read existing result only | Later compromise evidence may be appended but cannot restore or replace the terminal state |
| Body field, current default, cache entry, missing record, deletion, or ordinary policy error claims revocation | No valid transition | Fail closed without mutation | Never treat inference as revocation authority |

## Expiry and clock rules

1. The Challenge expiry governs whether a Decision may commit.
2. The Approval-authority expiry governs whether H-07 acceptance may commit.
3. The Approval-authority expiry must be explicit and no later than any governing Challenge/action/policy maximum selected by the approved profile.
4. Validity is strict: serialization time must be earlier than expiry. Equality is expired.
5. A validity-start field, if allowed, is inclusive only if H-10/H-12 later define it explicitly; otherwise future profiles should omit it.
6. Request-proof expiry, Connection expiry, policy evidence validity, Invocation deadline, Approval expiry, reservation timeout, Task timeout, and Result retention are independent.
7. Sweeper transitions are optimization. An acceptance or Decision path must enforce expiry even if no sweeper ran.
8. Clock rollback never revives a terminal record. An unsafe or unavailable authoritative clock fails closed under the selected profile.
9. H-10 must define timestamp precision and representation; H-11 owns the historical and rollback consequences, while D2-02, D2-03, D2-04, and P1-03 own the corresponding executable skew, equality, rollback, and restart cases.

## Retry, replay, and idempotency rules

An exact retry after an ambiguous response is safe only when the Agent can prove:

- the same Approval authority and approved Decision;
- the same Invocation ID and continuation/idempotency namespace and key;
- the same authenticated requester and effective actor context;
- the same Connection, Agent, resource, tenant, and workspace;
- the same selected release, capability, action, contract, payload digest, limits, policy reference, validity, and target; and
- the same durable accepted semantic digest recorded by the H-07 commit.

If authority remains available because the first attempt definitely failed before commit, the exact retry may attempt the transaction again after re-evaluating all current gates. If authority is consumed, it performs no transition and creates no Task. If the commit outcome is still indeterminate, the Agent fails closed and reconciles authoritative storage before allowing another attempt.

A different idempotency key is not an exact retry. A same idempotency key with different semantics is a conflict. Neither may use a consumed Approval. Public response codes and safe detail fields belong to H-12.

## Concurrency rules

1. The Approval state, its expiry/revocation ordering, and the H-07 acceptance/idempotency record share one serializable authority.
2. Two exact concurrent attempts can produce at most one state-changing commit and one Task identity. The loser reads the winner and converges only after full equality and disclosure authorization.
3. Two different attempts cannot both consume one Approval. The winner must match every bound field; the loser fails without receiving or creating work.
4. Expiry, revocation, Connection termination, authorization withdrawal, and consumption races are ordered at their controlling authoritative commits. Current facts are reloaded inside the transaction or protected by validated versions/fencing.
5. A process mutex alone is insufficient for multiple processes or hosts. Any non-transactional adapter must demonstrate an equivalent single-writer log, consensus/serializable compare-and-set, fencing, durable recovery, and no intermediate authority-visible state.
6. A timeout while waiting for a lock is not proof of consumption or non-consumption.

## Connection and authority-gate interaction

- `active` Connection is necessary but not sufficient.
- `suspended` Connection admits no new Invocation; available Approval remains non-authorizing and may later expire or be revoked. H-07 controls resumption eligibility.
- `expired`, `closed`, `revoked`, or `replaced` Connection admits no new Invocation. Approval cannot override the terminal state or move to another Connection.
- Trust, authorization, and policy are re-evaluated at acceptance. An historical allow is evidence of why the Challenge existed, not a current allow.
- Current gates may narrow or deny the approved action. They cannot widen it.
- If current policy changes the action materially, the old Approval is mismatched and a new Challenge is required.
- Approval does not keep authentication or proof evidence fresh.

## Task and H-09 boundary

The H-07 commit may create the durable Task acceptance identity only if the Approval transition commits with it. After that commit:

- queue publication, worker acquisition, Task start, pause, retry, cancellation, recovery, external effects, Result, Receipt, and response delivery do not alter Approval consumption;
- failure to execute does not restore Approval;
- duplicate execution prevention is not solved by Approval single use;
- whether a Task continues after Connection suspension or termination remains H-09;
- H-09 owns post-acceptance Task execution, continuation, cancellation, terminality, Result semantics and representation, Receipt semantic outcome, polling semantics, retention, duplicate-effect handling, and Task/Receipt atomicity;
- H-10 owns canonical bytes, digests, signatures, proof profiles, and cryptographic linkage for Result and Receipt evidence;
- H-11 owns revocation, anti-rollback, key-history, compromise-history, and historical-verification consequences for that evidence; and
- H-12 owns routes, statuses, media types, public errors, retry representation, redaction, disclosure, and wire-level polling and delivery behavior.

A current `waiting_for_approval` Task may be a product/UI representation, but
it is not an H-07 accepted execution Task under the accepted model unless
future normative work explicitly defines a separate non-authoritative request
record. Naming alone must not imply accepted work.

## Consumption transaction

### Required pre-transaction preparation

The Agent:

1. authenticates the continuation under the current H-05 selected profile;
2. derives requester, effective actor, beneficiary, target, and Agent/resource identities from verified evidence;
3. parses untrusted references with size, type, and namespace limits;
4. loads the immutable Challenge, Decision, action binding, Approval authority, Connection history, selected release artifacts, and relevant policy/authz evidence;
5. verifies Approval-purpose proof, audience, key purpose, algorithm/profile, and full action digest under future H-10 rules;
6. verifies the immutable evidence that the Decision was issued by an eligible approver for an open, unexpired Challenge, with explicit self-approval disposition and non-widening limits, without reconstructing decision-time eligibility from current defaults;
7. checks exact field equality and presence across the continuation, Invocation, Decision, action, and authoritative records; and
8. computes a future-profile semantic/idempotency digest without treating that computation as authorization.

Any failure here creates no Task and does not consume authority. Audit attempts must be rate-limited and privacy-safe.

### Final serialized acceptance algorithm

Within one serializable transaction or a proven equivalent authoritative log operation, the Agent:

1. reloads Approval state/version and rejects any state other than `available`, except that a consumed exact retry is routed to the read-only convergence path;
2. reloads immutable Connection evidence and selected historical artifacts and verifies their digests;
3. reloads current lifecycle state, expiry, principal/target/audience, tenant/workspace scope, capability, Trust, authorization, policy, deadline, and revocation facts;
4. samples the authoritative serialization clock and verifies all strict expiry/deadline boundaries;
5. verifies the Decision and action binding again or verifies protected record versions that make them immutable;
6. checks for an existing idempotency/Invocation record and applies exact equality or conflict rules;
7. rechecks that no revocation, expiry, Connection termination, or competing consumption transition won;
8. creates exactly one durable H-07 acceptance record and Task identity;
9. binds the exact continuation/idempotency identity and semantic digest to that Task;
10. transitions Approval authority from `available` to `consumed` with state version, timestamp, accepted Invocation/Task/idempotency identities, and transaction/fencing identity;
11. creates the terminal tombstone and durable audit-event intent; and
12. commits all state as one outcome.

If the Task acceptance or idempotency evidence cannot commit in that same outcome, the transaction aborts and the Approval stays available unless an independently serialized expiry or revocation wins. A database driver returning success for some records and failure for others is not a conforming implementation of this requirement.

### After the commit

- The Approval remains consumed regardless of queue, worker, Task, effect, Result, Receipt, audit-delivery, metric, logging, network-response, or client failure.
- Queue publication and audit delivery are driven from durable intents/outbox records so restart can continue them without recreating authority.
- An exact retry returns or references the existing accepted identity after current authentication and disclosure checks.
- A conflict fails without mutation.
- H-09 governs the accepted Task from this point.

### Ambiguous commit recovery

If the storage call times out or returns an indeterminate result, the Agent must not guess, restore authority, create another Task, or advise blind retry. It rereads using the Approval, transaction, Invocation, and idempotency identities:

- if the complete consumed/accepted outcome is present and internally consistent, treat the commit as successful;
- if authoritative versions prove no commit occurred and authority is still available, a fresh fully revalidated attempt may proceed;
- if records are partial, corrupt, rolled back, split-brain, or unavailable, fail closed, quarantine the authority, and raise an integrity incident under future H-11/H-14 procedures.

### Events that are not consumption

None of the following consumes Approval authority:

- issuing, opening, displaying, polling, or cancelling a Challenge;
- authenticating requester or approver;
- evaluating Trust, authorization, or policy;
- constructing, signing, submitting, verifying, or storing a Decision before acceptance;
- computing or comparing a digest;
- acquiring a lock, lease, reservation, fencing token, or database transaction;
- creating a non-authoritative UI/workflow placeholder;
- constructing a candidate Task that has not durably committed;
- publishing to a queue, starting or completing Task execution, or attempting an effect;
- producing a Result or Receipt;
- creating a response, delivering it, or receiving a client acknowledgement; or
- emitting a metric, log, or asynchronously delivered audit event.

Only the final serialized H-07 acceptance outcome is consumption under Option B.

## Threat analysis

The controls below are accepted governance semantics. “Detection” never
substitutes for prevention at the acceptance boundary.

| Threat | Prevention requirement | Detection/recovery evidence | Residual risk | Future dependency |
|---|---|---|---|---|
| Approval replay after consumption | Atomic terminal transition and exact retry distinction | Tombstone linked to accepted Invocation/Task/idempotency | Premature retention deletion | H-11/H-14 |
| Double consumption by concurrent requests | Serializable compare-and-transition with one H-07 outcome | State versions, fencing, concurrency vector | Broken adapter isolation | D2-03/P1-03 |
| Same Approval used for a different Invocation | Bind Invocation and continuation identities | Mismatch audit with safe digests | Identifier collision if H-10 weak | H-10/H-12 |
| Payload mutation | Bind canonical payload/contract digest | Independent mutation vectors | Ambiguous canonicalization | H-10/D2-04/P1-03 |
| Capability substitution | Bind exact capability key and version | Negative version/key vectors | Historical artifact loss | H-03/H-11 |
| Cross-tenant replay | Bind exact organization and tagged workspace | Tenant mismatch audit | Unsafe public error leakage | H-12 |
| Cross-Agent or cross-resource replay | Bind Agent, resource, and Approval audience | Audience mismatch evidence | Misconfigured shared keys | H-10/H-14 |
| Protocol-version reinterpretation | Bind exact selected release and immutable artifacts | Historical-resolution audit | Legacy evidence incomplete | H-03/H-11 |
| Requester identity spoofing | Derive principal from verified authentication | Auth evidence reference | Compromised credential | H-05/H-11 |
| Approver identity spoofing | Approval-purpose authentication/proof; never trust body `decidedBy` | Decision proof and identity reference | Compromised approver/key | H-10/H-11 |
| Ineligible approver | Verify role/authority at Decision commit; at consumption check only authoritative compromise/revocation and explicitly bound revocable sources | Immutable eligibility evaluation plus current purpose-specific revocation evidence | Policy or source semantics ambiguity | H-11/H-14 |
| Unauthorized self-approval | Explicit relationship check; default deny unless policy permits | Separation-of-duty audit | Colluding principals | H-12/H-14 |
| Approver confused by false summary | Bind summary digest and full action; approved UI profile | Summary/action mismatch vector | Human misunderstanding within accurate summary | H-10/H-14 |
| Hidden limit widening | Complete explicit limits; monotonic intersection | Limit comparison evidence | Complex unit semantics | H-10/D2-04/P1-03 |
| Null/absent workspace collapse | Tagged union and exact presence equality | null/empty/whitespace/absent vectors | Bad legacy mapping | H-10/D2-04/P1-03 |
| Approval-purpose confusion | Dedicated proof purpose, audience, key usage, and domain | Wrong-purpose vectors | Key-store misconfiguration | H-10/H-14 |
| Digest collision or downgrade | Approved algorithms/profile only; no fallback | Algorithm/key/profile audit | Cryptographic break | H-10/H-11 |
| Unicode/number/canonicalization divergence | One cross-language canonical byte profile | Independent golden vectors | Parser discrepancies | H-10/D2-04/P1-03/H-14 |
| Decision submitted at expiry boundary | Strict serialization time `< expiry` | Equality and skew vectors | Unsafe clock source | H-05/D2-03/P1-03 |
| Approval used at expiry boundary | Strict H-07 serialization time `< expiry` | Race vector against expiry | Distributed clock uncertainty | H-05/D2-03/P1-03 |
| Clock rollback revives authority | Terminal monotonic state; trusted clock/profile | Rollback alarm and persisted last ordering | Clock outage denies service | H-11/H-14 |
| Revocation race | Serialize revocation against consumption | One-winner transition record | Revocation propagation delay before authority receives it | H-11 |
| Connection termination race | H-07 final recheck and accepted ordering | Connection/acceptance sequence evidence | Cross-store consensus error | H-07/D2-03/P1-03 |
| Authorization or policy withdrawal race | Reload/version current evidence inside boundary | Evaluated versions in acceptance record | External authority unavailable | H-02/H-11 |
| Pre-acceptance burn | No separate protocol consumption; atomic acceptance | Absence of consumed state without Task binding | Intermediary private replay cache may still block UX | H-12/H-14 |
| Post-commit restoration | Consumed terminal; H-09 recovery only | Tombstone and append-only transition | Operator manually corrupts state | H-11/H-14 |
| Partial multi-record commit | Transaction/equivalent log required | Integrity reconciliation and outbox | Storage implementation violates advertised guarantees | H-11/D2-03/P1-03 |
| Ambiguous network response | Authoritative reread and exact retry convergence | Transaction/idempotency identifiers | Prolonged storage outage | H-12/H-14 |
| Split-brain storage | Single authority, consensus/fencing, fail closed | Conflicting sequence/fence alert | Consensus implementation failure | H-11/H-14 |
| Snapshot rollback | Monotonic sequence/hash/anchor and retained tombstones | Rollback detection at startup/use | All anchors rolled back together | H-11 |
| Tombstone TTL expiry | Retain through maximum replay and historical support horizon | Retention audits | Unknown copied credentials after supported horizon | H-14 |
| Lost historical evidence | Fail closed; do not use current defaults | Integrity incident | Denial of legitimate recovery | H-03/H-11 |
| Exact retry leaks Task identity | Reauthenticate and authorize disclosure before convergence | Privacy-safe access audit | Timing side channel | H-12/D2-04/P1-03 |
| Conflict creates unsolicited Challenge | Require independently authorized new issuance | Challenge provenance audit | User workflow friction | H-12 |
| Replay floods expensive verification | Size limits, staged validation, rate limits, cached negative cryptographic metadata | Abuse metrics without sensitive values | Denial of service | H-12/H-14 |
| Malformed nested input exhausts parser | Bounded schema/parser before canonicalization | Rejection telemetry | Parser zero-day | H-10/D2-04/P1-03 |
| Decision record deletion | Protected immutable storage/tombstone integrity | Missing-sequence and audit reconciliation | Privileged storage compromise | H-11/H-14 |
| Audit/log failure changes authority | Durable audit intent in commit; async delivery | Outbox backlog alarm | Delayed investigation | H-11/H-14 |
| Receipt forged as proof of approval | Verify Approval before acceptance; Receipt is downstream | Receipt/acceptance cross-check | Separate Receipt-key compromise | H-10/H-11 |
| Platform and Agent disagree on replay | Agent is final authority; intermediaries cannot create/consume protocol authority | Correlation of Platform attempt with Agent outcome | Platform may deny a safe retry locally | H-12/H-14 |
| Business approval confused with protocol Approval | Distinct namespaces, types, audiences, keys, and storage | Cross-type negative vectors | Human/operator naming confusion | H-10/H-14 |
| Reused Challenge for revised facts | Immutable action; material change supersedes with new ID | Lineage record and mutation vectors | Excessive prompt volume | H-04/H-12 |
| Approval used after approver compromise | Verify immutable Decision evidence and authoritative current compromise/revocation of the bound principal, key, issuer, or revocable source | Decision/key/principal/source revocation evidence | Use before revocation commit | H-11 |
| Secret/sensitive data in safe summary or logs | Presentation profile, field allowlist, redaction, digest-only mismatches | Privacy scan and conformance fixtures | Semantic inference from metadata | H-12/D2-04/P1-03 |
| Parameter substitution | Bind every effect parameter and presence state under H-10 equality | One-field mutation audit/vector | Unmodeled semantic parameter | H-10/D2-04/P1-03 |
| Target substitution | Bind Agent, Passport, resource type/ID, destination, recipient, account/project | Target-mismatch audit/vector | Indirection changes behind a stable external ID | H-11/H-14 |
| Principal substitution | Bind verified requester/effective actor/beneficiary/Approver separately | Identity/delegation mismatch evidence | Compromised identity provider | H-05/H-11 |
| Tenant substitution | Exact organization and tagged workspace at Decision/use | Cross-scope attempt audit without existence detail | Tenant-directory compromise | H-12/D2-04/P1-03 |
| Capability/operation substitution | Exact key, version, operation, contract, release | Per-field negative vectors | Semantic drift inside an immutable identifier | H-03/H-10/H-14 |
| Omitted security-critical display context | Bound omissions/redactions manifest and qualified rendering profile | Display/action comparison and UI evidence | Human misses visible context | H-10/H-14 |
| Confused deputy | Exact requester, target Agent/resource, audience, beneficiary, and authority source | Cross-audience/target attempt evidence | Compromised authorized Agent | H-02/H-10/H-11 |
| Approval laundering through authorization | Re-evaluate authorization separately; prohibit conversion of allow evidence into Approval | Decision provenance and gate-specific audit | Policy engine incorrectly labels evidence | H-02/H-11/D2-04/P1-03 |
| Cross-Connection replay | Bind exact Connection/bundle/history/sequence and current state | Connection mismatch vector | Connection ID collision or rollback | H-03/H-11/D2-04/P1-03 |
| Cross-release replay | Bind exact selected release and immutable profile artifacts | Historical version negative vector | Missing legacy verifier | H-03/H-10/H-14 |
| Stale Challenge/Decision cache | Authoritative durable reload at each commit; cache cannot grant success | Cache/store version mismatch metric | Store outage causes fail-closed denial | H-11/H-14 |
| Deletion interpreted as consumption | Terminal state must be explicit; absence is corruption, not consumed | Missing-sequence/tombstone alarm | Destruction of all anchors | H-11/H-14 |
| Clock skew | Use selected authoritative clock at serialization; bound permitted skew only in future profile | Cross-node/equality vectors and clock health | Clock authority compromise/outage | H-05/D2-03/P1-03/H-14 |
| Lost response after commit | Exact idempotency lookup of atomic accepted record | Client/Agent correlation IDs | Long-lived indeterminate outage | H-12/H-14 |
| Retry storm | Stable retry classification, rate limits, backoff, and one cheap authoritative lookup | Rate/duplicate telemetry without sensitive payload | Coordinated denial of service | H-12/H-14 |
| Malicious storage adapter | Qualify advertised isolation/CAS/durability with hostile conformance fixtures | Fence, sequence, transaction, and invariant reconciliation | Privileged adapter can suppress all evidence | H-11/D2-03/D2-04/P1-03/H-14 |
| Malicious Client | Treat all IDs, body actors, Decision bodies, digests, summaries, and retry claims as untrusted | Mutation/replay/rate telemetry | Stolen valid credentials | H-05/H-10/H-12 |
| Compromised Host | Minimize authority, isolate keys/storage, preserve external history anchors | Cross-system audit/revocation correlation | Host can misrepresent UI or suppress enforcement | H-11/H-14 |
| Compromised Agent | No Agent-to-Agent transfer; attested/qualified implementation and durable external evidence where approved | Receipt/history and host-policy reconciliation | Final enforcement point compromise can cause effects | H-11/D2-04/P1-03/H-14 |
| Compromised Approver interface | Bind full action and rendering evidence; strong approver authentication; transaction confirmation | UI/action digest mismatch and device/session audit | Interface can deceive human before signing | H-10/H-11/H-14 |
| Denial of service by Challenge creation | Independently authorize issuance, deduplicate exact requests, rate/size-limit, expire safely | Per-principal/tenant Challenge metrics | Legitimate high-volume prompt pressure | H-12/H-14 |
| Denial of service by reservation | Reservation cannot consume; bounded wait, fencing, crash recovery | Stuck-lock/lease monitoring | Storage contention blocks availability | D2-03/P1-03/H-14 |
| Historical migration invention | Require complete immutable provenance; quarantine gaps; new Approval for material absence | Migration reports, original-byte retention, operator sign-off | Permanent denial for incomplete legacy data | H-03/H-11/H-14 |

### Security properties expected from the accepted decision

If separately implemented correctly, selected Option B is intended to provide:

- **exactness**: no authority for an action differing in any bound semantic;
- **single new-work admission**: at most one durable H-07 acceptance per Approval;
- **no precommit loss**: a definitely failed precommit attempt does not spend authority;
- **no postcommit reuse**: later failure cannot restore authority;
- **recoverable ambiguity**: exact retry discovers the committed outcome without another use;
- **current-gate enforcement**: Approval never freezes or widens independent authority;
- **durable replay resistance**: restart, failover, and ordinary retention do not erase terminal truth; and
- **auditable human provenance**: an accepted use can be connected to an authenticated eligible Decision without trusting body assertions.

It does not by itself provide duplicate-effect suppression, Task recovery, non-repudiation beyond the future proof profile, UI correctness, approver judgment quality, storage-compromise immunity, or indefinite historical retention.

## Required future vectors and conformance cases

No vector or test is authorized by this record. Following H-08 acceptance,
separately authorized future work must create independent normative vectors
and conformance cases at minimum for the following.

### Complete semantic case inventory

- exact successful Approval through one atomic consumption and accepted Task;
- denied Decision and information-required Decision with no authority;
- expired Challenge before Decision;
- expired approved Decision/Approval authority before continuation;
- equality at Challenge expiry, Approval expiry, Connection expiry, proof expiry, and Invocation deadline;
- one-field mutation for every authority-critical direct or referenced field;
- absent versus null versus empty versus whitespace versus explicit-present values;
- requester, effective actor, beneficiary, and Approver mismatch;
- Connection ID/bundle/history/sequence mismatch;
- organization mismatch;
- workspace mismatch and absent/present mismatch;
- target Agent, Passport, resource, and Approval audience mismatch;
- capability key mismatch and capability version mismatch;
- operation mismatch;
- resource type/identity and destination/recipient/account/repository/project mismatch;
- amount, currency, quantity, rate, range, units, precision, and limit mismatch;
- payload, parameter, contract, side-effect class, and requested output mismatch;
- current policy or authorization denial after approval;
- current Trust, authentication, proof freshness, or revocation failure after approval;
- suspended, expired, closed, revoked, and replaced Connection;
- exact continuation retry before known commit and after consumed commit;
- lost success response and authoritative reread;
- concurrent exact continuation and concurrent conflicting continuation;
- crash immediately before consumption commit and immediately after consumption commit;
- storage rollback, stale cache, split-brain, stale writer, and malicious adapter;
- duplicate Approval, Challenge, Decision, Invocation, Task, and idempotency IDs with equal and unequal content;
- missing, partial, deleted, or corrupt state;
- restart/failover in every Challenge and authority state;
- Task failure, cancellation, timeout, and queue failure after consumption;
- Result and Receipt failure after consumption;
- historical Approval verification with exact supported evidence and with missing evidence; and
- privacy-safe unknown, cross-scope, ineligible-reader, and timing-oracle behavior.

### H-10 canonical binding and proof vectors

- one complete positive Challenge/action/Decision/continuation vector with canonical bytes and digests;
- independent reproduction in at least two implementation languages without importing the same helper;
- mutation of every bound field individually, including presence changes;
- object-member reordering, arrays, Unicode normalization, escaped strings, integers, decimals, negative zero, large numbers, null, absent, empty, and duplicate-key rejection;
- exact selected protocol release and historical artifact resolution;
- capability key/version, contract, payload, side-effect class, target, scope, limits, policy, actor, and validity mutations;
- tagged workspace absent versus null, empty, whitespace, and present;
- wrong digest algorithm, canonicalization profile, key purpose, audience, verifier, Agent, resource, tenant, and protocol release;
- valid request proof used as Decision proof and valid Decision proof used for another purpose;
- Decision-proof tampering, unknown key, revoked key, unsupported algorithm, and downgrade attempt;
- safe-summary/action mismatch and presentation-profile mismatch; and
- cross-type replay between H-06 grant, H-08 Approval, request proof, Receipt, and business approval objects.

### H-11 durable authority and recovery vectors

- clean restart in every Challenge and Approval state;
- crash before Decision commit, after Decision commit, before acceptance commit, during ambiguous commit, and after commit before response;
- partial-record write simulation with mandatory fail-closed quarantine;
- state-version rollback, snapshot rollback, deleted tombstone, missing history, corrupt digest, and split-brain sequence;
- single-writer/fencing takeover and stale-writer rejection;
- approver/key/issuer compromise or authoritative revocation before Decision, after Decision but before use, and after consumption, plus ordinary role change that must not reinterpret Decision-time eligibility;
- Approval revocation versus consumption race;
- Connection suspension/termination/replacement versus consumption race;
- authorization, Trust, and policy withdrawal versus consumption race;
- authoritative clock unavailable, skewed, equal to expiry, advanced, and rolled back;
- retention compaction that preserves required tombstone evidence; and
- outbox/audit delivery retry without authority mutation.

### H-12 error, privacy, and retry vectors

- public responses for missing, open, denied, information-required, expired, revoked, consumed, mismatched, ineligible, unavailable, corrupt, and indeterminate Approval;
- a policy matrix showing which callers may learn Challenge, Decision, approver, reason, consumed, Task, and timing facts;
- exact retry by the same authorized caller returning the existing identity;
- exact bytes presented by a different/ineligible caller not disclosing existence;
- same idempotency identity with changed semantics;
- same Approval with different idempotency identity;
- timeout before definite noncommit, timeout after commit, and unresolved ambiguity;
- rate limit and overload behavior that never marks authority consumed;
- redaction of payload, tokens, proof, keys, sensitive summary, free-text reason, policy internals, and approver attributes; and
- stable retry-safe classification without precedence-dependent authority changes.

### D2/P1 conformance cases with H-13 extension and evolution dependencies

The lifecycle, transaction, concurrency, crash, malicious-storage, adapter, and black-box cases in this subsection are future D2-02, D2-03, D2-04, and P1-03 work. H-13 does not own their base semantics. H-13 owns only the portions that depend on schema openness, unknown-field/message/enum behavior, extension namespaces, required-versus-optional extension semantics, canonical extension forwarding, and extension or experiment evolution.

- two exact concurrent attempts produce one commit and one Task identity;
- exact and conflicting attempt race produces one legal outcome and no leaked Task;
- two conflicting exact-action mutations cannot both win;
- Decision versus Challenge cancellation/expiry race;
- consumption versus authority expiry/revocation race;
- consumption versus Connection terminal transition race;
- multi-process, multi-host, and failover storage adapters;
- implementations that falsely advertise atomic compare-and-set or lose tombstones fail conformance;
- Platform pre-burn followed by Agent/network failure demonstrates non-conforming recovery if treated as protocol consumption;
- Agent consumption followed by Task-store failure demonstrates required atomic rollback;
- duplicate Decision submission with identical and conflicting content;
- challenge supersession and old-Decision replay;
- malformed/fuzzed sizes and parser-limit cases;
- fixture independence from production canonicalization helpers; and
- trace assertions for no Task/effect before the authoritative commit;
- an unknown optional extension is handled according to the selected openness rule without silently changing action identity;
- an unknown required extension prevents Decision issuance or consumption;
- an extension namespace collision or unauthorized namespace fails closed;
- every signed or authority-critical extension is included in exact action semantic identity under the future H-10 profile;
- omission, mutation, reordering, or forwarding of an authority-critical extension is detected;
- extension graduation, revision, withdrawal, and experiment removal do not reinterpret an historical Challenge, Decision, or Approval; and
- an implementation that understands the base action but not a required authority-critical extension cannot consume the Approval.

### H-09 accepted-work boundary cases

- queue publication failure after consumption;
- worker crash before start, during execution, and after effect;
- Task cancellation, retry, and terminal status after Connection changes;
- duplicate-effect suppression and reconciliation;
- Result and Receipt semantic outcome, representation, retention, polling, and Task/Receipt atomicity failures under H-09;
- Result and Receipt byte/proof/linkage cases under H-10, historical-verification cases under H-11, and wire polling/delivery/disclosure cases under H-12; and
- proof that none of these transitions restores Approval.

### H-14 operations, compatibility, and retention cases

- supported storage guarantees and configuration validation;
- backup/restore and disaster-recovery rollback detection;
- retention horizon greater than every supported retry, offline-copy, audit, and migration horizon;
- upgrade/downgrade with available and consumed records;
- legacy record quarantine and migration reports;
- compromised approver/key incident response;
- operator tooling that cannot manually reopen terminal authority;
- privacy erasure requests reconciled with minimum replay tombstones; and
- monitoring for corruption, replay, conflict, ambiguity, outbox backlog, and clock failure.

H-10 owns byte-exact and cryptographic vectors. H-11 owns historical verification, durable-state, revocation, and rollback cases. H-12 owns transport, error, retry, redaction, and disclosure cases. D2-02, D2-03, D2-04, and P1-03 own executable state-machine, transaction, malicious-fixture, adapter, black-box, and interoperability conformance work. H-13 owns only the schema-openness, unknown-field/message/enum, extension-namespace, required-versus-optional extension, canonical-forwarding, and extension/experiment-evolution cases that affect those assets. H-14 owns independent reproduction evidence, implementation support matrices, operational qualification, compatibility windows, retention, and release evidence. None of these assignments authorizes the work.

### Required conformance assertions

Every future positive acceptance fixture must assert all of the following, not merely a success response:

1. exactly one immutable approved Decision exists;
2. exactly one legal `available -> consumed` transition exists;
3. the transition and H-07 Task/idempotency acceptance share one serialization outcome;
4. all bound fields and current gates were checked at that outcome;
5. no Task or effect existed before it;
6. the tombstone survives restart;
7. an exact retry creates no new Task and converges safely; and
8. a conflicting replay creates no Task, restores no authority, and leaks no protected identity.

## Compatibility and migration

### Current artifact disposition

| Current artifact/behavior | Accepted compatibility disposition for future work |
|---|---|
| Historical `0.1-draft` Approval prose | Preserve as historical evidence; do not edit or reinterpret in place |
| Protocol Core Challenge/Decision types and draft schemas | Later work would need new profile/version, complete presence/type rules, separate outcome/state fields, and migration-safe validators; do not mutate historical objects in place |
| Draft Challenge `status` values | Map only through an explicit migration with proven meaning; otherwise quarantine |
| Draft Decision `decision` values | `approved` may be a candidate; `rejected` needs approved mapping to `denied`; `expired`/`cancelled` cannot silently become human outcomes; `more_information_required` requires explicit lifecycle treatment |
| Core action digest helper | Retain only as legacy helper until H-10 profile exists; never label it normative |
| Native Agent Decision and consumption paths | Later work would need verified approver proof/eligibility, complete equality, and one atomic acceptance/consumption store boundary |
| Native Client Decision/Invocation routes | Preserve current API as legacy behavior unless a later compatibility profile defines a recoverable continuation and stable identity |
| Platform continuation and replay store | Remove any claim that the local burn is protocol consumption; later flow must reconcile exact Agent outcome without making the Platform authoritative |
| Trust/authentication profiles | Later H-10 work would need an Approval-specific purpose, audience, key-use, signer/verifier, and domain; existing request proof is not upgraded implicitly |
| Database and file stores | Later work would need serializable state/Task/idempotency commitment, tombstones, fencing/version evidence, durable outbox, and retention/rollback protection |
| Agent `used` flag | Migrate to a terminal authority/tombstone only when exact Decision, action, and accepted Task/idempotency linkage can be proven |
| Agent consumed record without accepted Task binding | Treat as indeterminate legacy evidence; do not reopen or invent a Task |
| Agent Task without matching consumption evidence | Integrity exception; do not synthesize Approval after the fact |
| Platform replay digest | Treat as intermediary anti-replay evidence, not protocol consumption or authority truth |
| Platform replay TTL deletion | Must not delete Agent tombstone or imply authority restoration |
| Client raw Decision/invoke sequence | Replace only in future implementation work with a recoverable continuation flow and exact idempotency identity |
| Existing tests and black-box fixture | Preserve as implementation regression evidence; add independent normative vectors later |
| Existing Task and Receipt records | Preserve historically; neither proves consumption alone, and incomplete linkage is status-only or quarantined pending operator classification |
| Business-compliance Approval models | Keep separate namespaces, storage, types, proof purposes, audiences, and documentation |

### Migration requirements

If later migration work is separately authorized:

1. inventory every persisted Challenge, Decision, `used` record, Platform replay entry, waiting Task, accepted Task, idempotency record, and historical Connection reference;
2. freeze the legacy profile identifier and exact interpretation used to create each record;
3. classify records as provably open, decided without authority, available, consumed with complete linkage, terminal for another reason, or indeterminate;
4. never infer omitted tenant/workspace, Connection, version, capability, actor, audience, expiry, limit, or action facts from current defaults;
5. never reopen a legacy used/expired/revoked record;
6. never mark legacy authority consumed solely because a Receipt or later effect exists without accepted linkage;
7. quarantine any record with missing, contradictory, corrupt, rollbacked, or split-brain evidence;
8. require a new Challenge and Decision for materially incomplete available legacy authority;
9. preserve immutable original bytes and migration provenance for every transformed record;
10. use a one-way, resumable, idempotent migration with dry-run counts and human review;
11. keep rollback from reviving authority; application rollback must still understand or fail closed on new terminal tombstones;
12. validate retention and backup restoration before enabling the new profile; and
13. publish compatibility and support windows only under H-14 authority.

No migration is authorized here. A later approved migration must assign each legacy class exactly one evidence-backed disposition: **preserve historically**, **restrict to its historical profile**, **quarantine**, **status-only**, **operator-classify**, **deny governed use**, or **require a new Approval under a future release**. “Upgrade using current defaults” is not a disposition.

### Compatibility promises not made

This accepted governance decision does not promise that:

- a historical Decision will be usable under the future profile;
- old and new action digests will compare equal;
- current `pending`, `approved`, `rejected`, `expired`, `cancelled`, or `used` fields map one-to-one;
- a Platform replay entry proves Agent consumption;
- an old Client can recover an ambiguous continuation safely;
- a stored `waiting_for_approval` Task is an H-07 accepted Task;
- a current test passing implies future conformance; or
- a later implementation will support mixed-profile operation.

## Residual risks and later ownership

| Residual question or risk | Owner after H-08 |
|---|---|
| Task execution, continuation, cancellation, terminality, duplicate effects, Result and Receipt semantic contracts, polling semantics, retention, Task/Receipt atomicity, and post-acceptance recovery | H-09 |
| Canonical bytes, action digest, signature/proof, audience, purpose, algorithms, and key use | H-10 |
| Durable evidence, revocation distribution, rollback protection, audit integrity, and historical verification | H-11 |
| Public error precedence, retry transport, response shape, privacy, redaction, and disclosure | H-12 |
| Executable state-machine assets, transaction and concurrency fixtures, malicious cases, adapter qualification, black-box conformance, and interoperability cases | D2-02, D2-03, D2-04, and P1-03, subject to the later accepted H-* decisions |
| Schema openness, unknown fields/messages/enums, extension namespaces, required/optional extension behavior, forwarding, and extension/experiment evolution | H-13 |
| Operational profiles, support matrix, retention, backup/restore, rollout, compatibility window, and release policy | H-14 |
| Human error despite accurate presentation | Deployment policy, UI assurance, and H-14 operational guidance |
| Approver or storage compromise before detection | H-11 incident/revocation controls and deployment security |
| Availability loss from fail-closed storage/clock/history checks | H-14 reliability and recovery profiles |

## Human approval block

Rudra approved the complete Option B bundle on 2026-08-07. The complete
verbatim approval below is authoritative and preserves every qualification,
accepted risk, compatibility consequence, security consequence, and deferred
boundary.

| Approval field | Accepted value |
|---|---|
| Approver | Rudra |
| Approval date | 2026-08-07 |
| Approved option | Option B — Single-use exact-action Approval consumed atomically at the H-07 Invocation-acceptance boundary |
| Approved object/state model | As recorded in the human approval |
| Approved exact bound-field inventory | As recorded in the human approval |
| Approved action-equality model | As recorded in the human approval |
| Approved actor/Approver/audience model | As recorded in the human approval |
| Approved tenant/Connection binding | As recorded in the human approval |
| Approved issuance/decision model | As recorded in the human approval |
| Approved expiry model | As recorded in the human approval |
| Approved consumption point | Final H-07 serialized durable Invocation-acceptance commit |
| Approved reservation/rollback model | Internal reservation only; definite precommit failure leaves authority available unless another terminal transition wins; postcommit failure never restores consumed Approval |
| Approved retry/replay model | Exact authorized retries converge on the same accepted result; conflicts fail without mutation, duplicate Task creation, or protected disclosure |
| Approved concurrency model | One authoritative serialized outcome; exact losing attempts converge; conflicting losing attempts create no work |
| Approved persistence/recovery model | Durable immutable evidence and fail-closed recovery as approved |
| Approved Task/H-09 boundary | As recorded in the human approval |
| Approved Receipt/H-10/H-11 boundary | As recorded in the human approval |
| Approved failure/privacy boundary | As recorded in the human approval |
| Approved retention/tombstone model | As recorded in the human approval |
| Approved historical/migration treatment | As recorded in the human approval |
| Approved qualifications | Yes — complete verbatim approval below |
| Accepted risks | Yes — complete verbatim approval below |
| Compatibility impact accepted | Yes |
| Security impact accepted | Yes |
| Sign-off/reference | Rudra - 2026-08-07. |
| Resulting status | ACCEPTED |

**Resulting status:** `ACCEPTED`

<!-- BEGIN VERBATIM H-08 HUMAN APPROVAL -->

H-08 HUMAN APPROVAL — EXACT-ACTION APPROVAL LIFECYCLE AND CONSUMPTION

Approver: Rudra
Approval date: 2026-08-07

I have reviewed the complete proposed H-08 decision record, including:

- the accepted-decision dependencies and conflict ledger;
- the repository evidence and 34 identified contradictions;
- the terminology and non-equivalences;
- all 20 human-decision question categories;
- Options A, B, C, and D;
- the complete exact bound-field inventory;
- the Challenge, Decision, and Approval-authority state models;
- the legal and illegal transition tables;
- the issuance, expiry, consumption, retry, replay, concurrency, rollback,
  persistence, restart, corruption, privacy, retention, and migration rules;
- the approver-eligibility and post-Decision change rules;
- the purpose-specific Approval revocation-source matrix;
- all threat and residual-risk analysis;
- all compatibility and historical-object consequences; and
- the boundaries assigned to H-09 through H-14 and D2/P1 work.

I APPROVE:

Option B — Single-use exact-action Approval consumed atomically at the H-07
Invocation-acceptance boundary.

I approve the following complete decision bundle:

1. Object and state model

Approval Challenge, immutable Approval Decision, and exact-action Approval
authority are separate protocol concepts.

The Challenge lifecycle is:

- open;
- decided;
- expired;
- cancelled; and
- superseded.

The Decision outcomes are:

- approved;
- denied; and
- more_information_required.

The Approval-authority lifecycle is:

- available;
- consumed;
- expired; and
- revoked.

Decision outcomes are immutable and are not lifecycle states. There is no
protocol-visible reserved state in this approved model.

2. Exact-action and bound-field model

Approval authority binds one exact Connection-governed Invocation and the
complete authority-critical semantic inventory recorded in H-08.

The binding includes, directly or through immutable historical evidence:

- exact protocol release and Approval profile;
- Connection identity and immutable Connection bundle/history;
- requester, effective actor, beneficiary, Approver, target, Agent, Passport,
  resource, and Approval-purpose audience where applicable;
- exact organization and tagged workspace scope;
- exact capability key and version;
- exact operation, resource, destination, recipient, account, repository,
  project, or comparable target;
- exact payload and parameter semantics;
- amounts, currencies, quantities, units, limits, ranges, precision, and effect
  class where applicable;
- Challenge, Decision, Approval, Invocation, and continuation/idempotency
  identities;
- validity and expiry semantics;
- approver eligibility and authority-source evidence;
- authorization, policy, Trust, and revocation evidence references;
- presentation, omissions, redactions, and rendering-profile evidence;
- durable consumption, Task, idempotency, tombstone, audit, and historical
  linkage evidence; and
- future H-10 and H-11 profile and history identifiers.

No body claim, current default, compatible-looking version, display text,
truthiness conversion, omitted-field default, cache state, deletion, Receipt,
or current schema may substitute for missing authority-critical evidence.

Approval may narrow but never widen Connection authority, capability,
authorization, Trust, policy, tenant scope, or any other controlling layer.

3. Action equality

Exact action equality requires equality of every authority-critical meaning and
presence state.

Safe display text is not action truth.

Canonical bytes, numeric handling, Unicode handling, encodings, digests,
signatures, algorithms, key purposes, and domain separation remain H-10.

Until those normative assets exist, this approval selects semantic
non-substitutability but does not authorize an implementation profile.

4. Actor, Approver, and audience model

Requester, effective actor, beneficiary, Approver, target, Agent, resource,
and audience remain distinct where applicable.

Identity derives from verified evidence and never from an untrusted body
field.

Approval-purpose proofs, audiences, and keys remain distinct from
authentication, request signing, authorization, Install Grant, Trust, and
Receipt proof purposes.

Self-approval is denied unless the selected release/profile and current
structured authorization or deployment policy explicitly permit it and the
Decision immutably binds that evaluated disposition.

5. Tenant and Connection binding

Approval binds exactly one Connection, organization, and tagged workspace
scope.

Workspace absence and workspace presence are distinct.

Approval cannot transfer to a replacement Connection.

A suspended Connection cannot accept the Invocation.

An expired, closed, revoked, or replaced Connection permanently prevents use
of that Approval under the bound Connection.

6. Issuance and Decision model

A Challenge grants no authority.

A Decision is accepted only from a currently authenticated and eligible
Approval-purpose Approver while the Challenge is open and strictly unexpired.

Only an approved Decision creates available Approval authority.

Denied and more_information_required Decisions create no Approval authority.

A material action change requires a new Challenge and new Decision.

7. Approver eligibility and later changes

Approver authentication and eligibility are mandatory at the Decision
serialization commit.

Decision-time eligibility is immutable historical evidence and may not be
reconstructed from later defaults, display names, body claims, or current role
membership.

At consumption, the Agent verifies the immutable Decision evidence and checks
current authoritative compromise or revocation affecting the Approval-purpose
key, approver principal, Decision issuer, or an explicitly bound revocable
authority source.

Ordinary later role changes, policy edits, authorization denials, or deployment
policy narrowing do not rewrite the Decision and do not automatically revoke
Approval authority. They may independently deny current consumption without
consuming or mutating the Approval.

8. Expiry model

Challenge expiry and Approval-authority expiry are distinct.

The authoritative serialization clock controls every boundary.

Validity is half-open: the applicable commit must occur strictly before expiry.

Equality with expiry is expired.

A sweeper is not required for expiry to be authoritative; the request path
must enforce it.

Clock rollback, restart, or delayed cleanup cannot revive terminal authority.

9. Consumption point

The single authoritative consumption point is the final H-07 serialized
durable Invocation-acceptance commit.

The same indivisible authoritative outcome records:

- `available -> consumed`;
- exact accepted Invocation identity;
- exactly one Task identity;
- continuation/idempotency evidence;
- the complete equality result;
- transaction sequence or fencing evidence;
- terminal tombstone evidence; and
- durable audit intent.

Decision creation, Decision submission, authentication, proof verification,
policy evaluation, local replay-store insertion, lock acquisition, internal
reservation, Task polling, Task start, external effect, Result, Receipt,
response construction, response delivery, audit delivery, or metric emission
does not constitute consumption.

10. Reservation and rollback

Reservation is internal concurrency machinery only. It grants no protocol
authority and is not a durable Approval lifecycle state.

A definite failure before the final acceptance commit leaves Approval
authority available unless expiry or an authoritative revocation won the race.

Nothing after the final acceptance commit restores consumed Approval
authority.

Task, execution, effect, Result, Receipt, cancellation, or delivery failure
after acceptance remains H-09 and later work and cannot reopen Approval.

11. Retry and replay

A complete exact retry after an ambiguous or lost response converges on the
same accepted Invocation and Task identity after current authentication,
equality, and disclosure checks.

It performs no new consumption and creates no new Task.

A conflicting retry or replay fails without authority mutation, Task creation,
or protected disclosure.

Deletion, cache absence, or an incomplete record never permits reconstruction
or new consumption.

12. Concurrency

All Decision, consumption, expiry, revocation, Connection-transition, and
conflicting-replay races serialize against authoritative durable state.

For concurrent exact continuation attempts:

- at most one acceptance commits;
- exact losing attempts converge on the same accepted result; and
- no second Task is created.

For conflicting attempts:

- at most one legal result may commit;
- losing conflicts create no work and consume no additional authority; and
- privacy-safe failure behavior applies.

13. Revocation

Only an enumerated, authenticated, exact-scope, purpose-specific revocation
source may transition available Approval authority to revoked.

Permitted candidate sources are:

- explicit purpose-specific withdrawal by the original eligible Approver when
  the selected profile permits it;
- authoritative compromise or revocation of the Approval-purpose key,
  Approver principal, Decision issuer, or explicitly bound authority source;
  and
- exact-scope action by a registered Approval-revocation authority.

Ordinary authorization denial, policy narrowing, role change, stale or
unavailable evidence, Connection suspension, body claims, cache entries,
missing records, deletion, or ordinary policy errors do not themselves create
an Approval revocation transition.

Exact sequence, freshness, affected-object, key-history, rollback, and
historical-verification mechanics remain H-11.

14. Persistence and recovery

The immutable Challenge, Decision, Approval state, action binding, transition
history, accepted Invocation/Task/idempotency linkage, transaction ordering,
audit intent, tombstone, and applicable history evidence must survive restart.

Missing, partial, corrupt, duplicated, stale, rolled-back, split-brain, or
indeterminate authority state fails closed.

An implementation may recover only by proving either complete noncommit or the
complete committed terminal outcome. It may not guess, restore authority, or
invent a Task.

15. Task and Receipt boundaries

H-09 owns post-acceptance Task execution, continuation, cancellation,
terminality, duplicate-effect handling, Result and Receipt semantic contracts,
polling semantics, retention, Task/Receipt atomicity, and post-acceptance
recovery.

H-10 owns canonical bytes, digests, signatures, proof profiles, and
cryptographic linkage.

H-11 owns revocation, anti-rollback, key history, compromise history, and
historical verification.

H-12 owns transport routes, statuses, media types, public errors, retry
representation, redaction, disclosure, polling delivery, and response delivery.

A Result or Receipt is downstream evidence and is never retroactive Approval
or the Approval consumption event.

16. Failure and privacy boundary

All semantic checks fail closed.

Unknown, cross-scope, expired, revoked, consumed, mismatched, corrupt,
unavailable, and indeterminate states must not become existence, tenant,
Approver, action, Connection, Invocation, or Task oracles.

H-12 will later define exact public errors, status mappings, retry classes,
redaction, and disclosure behavior.

17. Retention and tombstones

Terminal Approval evidence must be retained for at least every supported
retry, replay, audit, offline-copy, migration, investigation, and historical
verification horizon.

A consumed tombstone retains enough evidence to deny replay and recover an
exact accepted result without preserving unnecessary secret material.

Deletion cannot restore practical replayability or erase authoritative terminal
truth.

Exact support periods and erasure policy remain H-14.

18. Historical and migration treatment

Historical `ghostbridge/0.1-draft` objects retain their original bytes and
meaning.

Missing authority-critical evidence is never invented from current defaults.

Legacy records must later be classified using evidence-backed dispositions,
including:

- preserve historically;
- restrict to the historical profile;
- quarantine;
- status-only;
- operator-classify;
- deny governed use; or
- require a new Approval under a future release.

No migration, schema change, or implementation work is authorized by this
approval.

19. Future-work ownership

H-10 owns byte-exact and cryptographic vectors.

H-11 owns historical verification, durable-state, revocation, and rollback
cases.

H-12 owns transport, error, retry, redaction, and disclosure cases.

D2-02, D2-03, D2-04, and P1-03 own executable state-machine, transaction,
malicious-fixture, adapter, black-box, interoperability, and independent
conformance work, subject to all applicable accepted H-* decisions.

H-13 owns schema openness, unknown fields/messages/enums, extension namespaces,
required-versus-optional extension behavior, canonical forwarding, and
extension or experiment evolution.

H-14 owns independent reproduction evidence, implementation support matrices,
operational qualification, compatibility windows, retention, and release
evidence.

These assignments do not authorize that work.

APPROVED QUALIFICATIONS

- H-08 approves semantic governance only.
- H-08 does not define H-10 canonical bytes or cryptographic algorithms.
- H-08 does not define H-11 revocation mechanics or historical proof rules.
- H-08 does not define H-12 wire errors or transport behavior.
- H-08 does not define H-13 schemas or extension encodings.
- H-08 does not define H-09 post-acceptance Task outcomes.
- H-08 does not authorize normative specification, schemas, executable state
  machines, fixtures, vectors, conformance cases, implementation, migration,
  deployment, publication, release, gap closure, or Protocol 1.0.
- H-01 through H-07 are not superseded.
- H-09 through H-14 remain deferred.

ACCEPTED RESIDUAL RISKS

I knowingly accept that:

- secure execution requires transactional storage or an equivalently strong
  serialized durable log;
- fail-closed handling may reduce availability during corruption,
  indeterminate commit, clock, history, or storage failures;
- consumed Approval cannot be reused after legitimate post-acceptance Task,
  effect, Result, Receipt, cancellation, or delivery failure;
- exact safe recovery depends on durable Task and idempotency linkage;
- incomplete legacy records may be quarantined or denied governed use;
- tombstone retention creates privacy and operational obligations;
- compromise before detection remains possible;
- later H-09 through H-14 decisions may impose additional restrictions but may
  not silently widen H-08 authority; and
- no current implementation is presumed conformant merely because it resembles
  Option B.

COMPATIBILITY IMPACT ACCEPTED

I accept that future conformance may require material changes to:

- Approval schemas and profile identifiers;
- Protocol Core action helpers and validators;
- Native Agent Decision, state, transaction, and Task-storage behavior;
- Native Client continuation and ambiguous-retry behavior;
- Platform replay and pre-burn behavior;
- Trust and proof-purpose handling;
- database and file-store transaction, tombstone, fencing, rollback, and
  retention support;
- black-box and conformance fixtures; and
- legacy Challenge, Decision, used-record, Task, Receipt, and replay-record
  handling.

Historical objects will not be reinterpreted or upgraded using current
defaults.

SECURITY IMPACT ACCEPTED

I accept that Option B:

- minimizes replay and double-consumption authority;
- binds human Approval to one exact action and one new-work acceptance;
- prevents Approval from widening any upstream authority;
- preserves the Agent as final enforcement point;
- requires current authentication, Connection, Trust, authorization, policy,
  expiry, scope, capability, and Approval checks at acceptance;
- prevents post-acceptance failure from restoring human authority;
- requires purpose-specific Approval proof and revocation treatment;
- fails closed on missing or indeterminate evidence; and
- may trade availability and implementation complexity for stronger authority
  safety.

I confirm that no H-01 through H-07 decision is superseded.

I authorize H-08 to be recorded as ACCEPTED with the exact approved bundle,
qualifications, accepted risks, compatibility impact, and security impact
above.

This approval authorizes the H-08 governance-record update only. It does not
authorize staging, committing, pushing, merging, normative specification,
schemas, implementation, migration, deployment, publication, release, gap
closure, or Protocol 1.0 work except through separately authorized steps.

Sign-off/reference:

Rudra - 2026-08-07.

<!-- END VERBATIM H-08 HUMAN APPROVAL -->

## Human approval checklist

Rudra explicitly resolved every checklist item through the complete verbatim
approval recorded above.

- [x] The human approver has reviewed the accepted-decision dependencies and conflict ledger.
- [x] The human approver has confirmed that Approval remains distinct from authentication, Connection authority, Trust, authorization, and policy.
- [x] The human approver has selected Option A, B, C, D, or an explicitly specified alternative.
- [x] The human approver has approved or replaced the separate Challenge, Decision, and authority concepts.
- [x] The human approver has approved the Decision outcome vocabulary.
- [x] The human approver has approved the Challenge lifecycle states and terminality.
- [x] The human approver has approved the Approval-authority states and terminality.
- [x] The human approver has selected the exact consumption event.
- [x] The human approver has approved whether consumption must join the H-07 acceptance transaction.
- [x] The human approver has approved the exact retry convergence rule.
- [x] The human approver has approved conflicting retry/replay behavior.
- [x] The human approver has approved concurrency, serialization, and one-winner behavior.
- [x] The human approver has approved precommit failure and postcommit non-restoration behavior.
- [x] The human approver has approved ambiguous-commit reconciliation and fail-closed behavior.
- [x] The human approver has approved Challenge and Approval-authority expiry semantics, including equality.
- [x] The human approver has approved revocation and its race ordering.
- [x] The human approver has approved approver authentication and eligibility timing.
- [x] The human approver has approved the self-approval rule.
- [x] The human approver has approved the requester, effective actor, beneficiary, target, and approver distinctions.
- [x] The human approver has approved every category in the exact bound-field inventory.
- [x] The human approver has approved direct versus immutable-reference binding and fail-closed historical resolution.
- [x] The human approver has confirmed that safe summary text is non-authoritative.
- [x] The human approver has confirmed that Approval limits only narrow current effective authority.
- [x] The human approver has confirmed that every current H-07 authority gate is re-evaluated at acceptance.
- [x] The human approver has confirmed the H-09 post-acceptance boundary.
- [x] The human approver has reviewed all listed threats and residual risks.
- [x] The human approver has approved the future H-10 proof and canonicalization assignments.
- [x] The human approver has approved the future H-11 durability and revocation assignments.
- [x] The human approver has approved the future H-12 error, retry, and privacy assignments.
- [x] The human approver has approved the future H-13 schema-openness, extension, and evolution assignments without assigning the entire conformance program to H-13.
- [x] The human approver has approved the future H-14 operations, retention, and compatibility assignments.
- [x] The human approver has approved the legacy migration/quarantine principles.
- [x] The human approver has approved the retention/tombstone model and deletion boundary.
- [x] The human approver has approved the Receipt/H-10/H-11 boundary.
- [x] The human approver has approved the failure/privacy boundary and safe disclosure constraints.
- [x] The human approver has recorded every qualification to the selected option.
- [x] The human approver has explicitly accepted the listed residual risks.
- [x] The human approver has explicitly accepted the compatibility impact.
- [x] The human approver has explicitly accepted the security impact.
- [x] The human approver has explicitly identified any H-01 through H-07 text that must be superseded.
- [x] The human approver has supplied durable approval evidence and identity through the authorized governance process.
- [x] The decision status is authorized to change from PROPOSED to ACCEPTED.

## Consequences of acceptance

- H-08 is an accepted protocol-governance decision.
- Option B and the complete approved qualifications now govern future
  H-08-dependent work.
- Approval Challenge, Decision, and Approval authority remain distinct.
- Approval authority is exact-action and single-use.
- Approval cannot widen any upstream authority.
- Only an approved Decision can create available Approval authority.
- The final H-07 Invocation-acceptance commit is the consumption point.
- The same commit binds one accepted Task and idempotency evidence.
- Definite precommit failure does not burn authority unless expiry or
  revocation won.
- Postcommit Task, effect, Result, Receipt, cancellation, or delivery failure
  cannot restore consumed Approval.
- Exact retry converges without new consumption or Task.
- Conflicting replay creates no work.
- Expiry equality is expired.
- Enumerated purpose-specific revocation sources are distinct from ordinary
  authorization or policy denial.
- Missing, corrupt, rolled-back, split-brain, or indeterminate state fails
  closed.
- Historical evidence is never reconstructed from current defaults.
- H-09 through H-14 retain their separately deferred authority.
- D2/P1 executable conformance work remains separately authorized.
- Acceptance alone closes no `GB-*` gap.
- Normative specification and implementation remain separately authorized.
- No Protocol 1.0 claim is made.

## Final status

- H-01 is `ACCEPTED`.
- H-02 is `ACCEPTED`.
- H-03 is `ACCEPTED`.
- H-04 is `ACCEPTED`.
- H-05 is `ACCEPTED`.
- H-06 is `ACCEPTED`.
- H-07 is `ACCEPTED`.
- H-08 is `ACCEPTED`.
- H-09 through H-14 remain deferred.
- Option B and the complete approved H-08 qualifications now have
  protocol-governance authority.
- H-08 acceptance alone closes no `GB-*` gap.
- No normative requirement, schema, executable state machine, fixture, vector,
  conformance case, SDK or runtime behavior, Agent, Client, Trust, Platform, or
  storage behavior, test, migration, deployment, publication, release, or
  Protocol 1.0 work is authorized by this recording.

**H-08 is ACCEPTED.**
