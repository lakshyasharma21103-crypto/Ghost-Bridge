# H-07 — Connection lifecycle and scoped authority

## Decision ID

`H-07`

## Status

**ACCEPTED**

Option B — Explicit monotonic lifecycle with recoverable suspension, including
the complete state and authority model, immutable Connection binding, exact
organization/workspace equality, durable multi-cause suspension, graduated
reauthentication consequences, expiry, closure, revocation, staged replacement,
persistence and recovery, final serialized Invocation acceptance, Task/H-09
boundary, privacy boundary, qualifications, compatibility consequences,
security consequences, and residual risks recorded in this decision were
approved by rudra on 2026-08-02.

All qualifications, matrices, illegal-transition rules, recovery restrictions,
replacement restrictions, deferred boundaries, compatibility consequences,
security consequences, residual risks, and the verbatim human approval are
part of the accepted decision.

This acceptance records a protocol-governance decision only. It creates no
normative requirement, schema, executable state machine, fixture, vector,
conformance case, storage contract, SDK or runtime behavior, Agent or Client
behavior, Trust or Platform behavior, migration, deployment, publication,
release, gap closure, or Protocol 1.0 conformance.

H-01 through H-07 are `ACCEPTED`. H-08 through H-14 remain deferred. No
Protocol 1.0 claim is made.

## Date prepared

2026-08-01

## Exact scope

The canonical H-07 question is:

> “Decide the complete Connection state machine, selected-version/profile/
> capability binding, organization/workspace equality and inheritance, expiry,
> suspension, revocation, closure, replacement, reauthentication, and recovery
> semantics.”

### Primary gaps

* GB-008
* GB-011
* GB-012
* GB-013
* GB-015
* GB-017
* GB-029

### Primary Phase work items

* D1-03
* D1-06
* D2-01
* D2-02
* E-02
* P1-03

This record supplies decision evidence for a complete state/authority matrix,
scope-equality rules, legal and illegal transitions, transition guards, atomic
effects, persistence and restart, corruption and rollback recovery, semantic
failure precedence, threats, compatibility, rejected alternatives, and the
approver/date recorded below. Acceptance of H-07 alone closes no `GB-*` gap.

## Accepted-decision dependencies

H-07 is subordinate to the accepted choices below. The accepted H-07 decision
fills its delegated lifecycle details but does not silently amend them.

### H-01 — lifecycle initialization and ordering

H-01 makes discovery and preview non-authoritative; requires Trust,
authentication, scope, consent, capability, and negotiation validation before
the H-06 commit; makes the complete durable commit the instant an `active`
Connection becomes authoritative; binds governed objects to that Connection;
and requires restart to resume durable records without current-discovery
renegotiation (`protocol/decisions/H-01-lifecycle-initialization-and-ordering.md:714-753`).
Consent is immutable, and a material change requires a new preview, consent,
and new or replacement Connection (`:725-750,836-878`).

### H-02 — roles, trust boundaries, and authorization floor

Authentication proves the caller but grants no Connection or action authority.
Connection authority, current Trust, tenant scope, authorization, deployment
policy, and Approval remain distinct narrowing inputs; effective authority is
their intersection (`protocol/decisions/H-02-roles-trust-boundaries-and-authorization-floor.md:893-939`).
The Agent is the final protocol-floor enforcement point, the principal comes
from verified evidence rather than a body, authorization cannot widen a
Connection, and no Agent-to-Agent authority transfer is permitted (`:947-1008,1031-1055`).

### H-03 — protocol version identity and history

The selected exact release is immutable and ordering does not imply
compatibility. Headers, bodies, package constants, deployment defaults, fresh
discovery, restart, or replacement cannot reinterpret a historical Connection
(`protocol/decisions/H-03-protocol-version-identity-and-history.md:194-217,245-270`).
Release and artifact evidence must remain immutable and historically
resolvable; unavailable evidence yields an explicit indeterminate result rather
than use of current defaults (`:272-296,1724-1757`).

### H-04 — capability, profile, and optional-feature negotiation

H-04 accepted layered monotonic intersection, role-scoped Core facets, a hybrid
direct/reference Connection binding, and classified capability-scoped failure
(`protocol/decisions/H-04-capability-profile-and-optional-feature-negotiation.md:1702-1745`).
The Connection directly retains the exact selected release, profiles/facets,
authentication identifier, enabled capabilities and versions, restrictions,
omissions, limitations, extensions, experiments, consented subset, participant
and tenant bindings, and evidence identities; only bulky immutable historically
resolvable evidence may be referenced (`:1295-1346`). Later layers narrow but
never widen, no fallback or array-order selection is allowed, and material
negotiation change requires replacement (`:1752-1854`).

### H-05 — authentication profiles and credential binding

Every Connection-governed request requires current selected-profile evidence.
The accepted graduated model denies an isolated proof failure, suspends
recoverable authentication unavailability, permits only same-invariant planned
rotation, requires replacement for material principal/profile/issuer/target/
audience/organization/workspace change, and makes compromise or authoritative
revocation terminal (`protocol/decisions/H-05-authentication-profiles-and-credential-binding.md:1041-1105,1643-1673`).
No weaker-profile, bearer-for-PoP, provider-default, cached-success,
broker-failure, or `none` fallback is allowed (`:1699-1709,1796-1805`).

### H-06 — redemption, authority creation, and replay

H-06 creates a Connection directly as authoritative `active` authority only
when the complete grant/Connection/intent/result/replay transaction is durably
committed and durably observable. Validation, a candidate, a lock, transaction
entry, adapter return, telemetry, response construction, and response delivery
do not create authority (`protocol/decisions/H-06-install-grant-redemption-and-retry-semantics.md:683-719`).
Exact replay returns the same Connection; retry cannot create a second one;
restart loads committed history; and partial or inconsistent durable state
fails closed (`:720-768,886-918`). Grant expiry or revocation after commit does
not retroactively change the Connection. H-07 owns later lifecycle effects but
may not move or weaken the H-06 commit point (`:745-759,1206-1238`).

### Accepted-decision conflict ledger

| Candidate H-07 rule | Conflict | Required disposition |
| --- | --- | --- |
| Create into `pending`, `creating`, or `suspended` | Moves H-06's direct-to-`active` authority commit | Reject unless a separately approved superseding decision amends H-06. |
| Treat authentication, Trust, policy, or Approval as Connection authority | Merges authority types rejected by H-02 | Reject; intersect them as current narrowing evidence. |
| Change release, profile, capability ceiling, owner, target, or tenant in place | Reinterprets immutable H-03/H-04/H-05 binding | Reject; require preview, consent, and a distinct replacement Connection. |
| Restore a compromised or authoritatively revoked authentication binding | Makes H-05 terminal evidence recoverable | Reject; only a new Connection may be considered where governance permits. |
| Treat post-commit grant expiry/revocation as Connection expiry/revocation | Retroactively changes H-06 authority | Reject; a separate Connection-qualified trigger and evidence are required. |
| Fully atomic old/new replacement inside the H-06 creation transaction | Adds old-Connection mutation to H-06's accepted transaction | Treat as an H-06 amendment; do not recommend silently. |
| Reconstruct a historical Connection from current defaults | Violates H-01, H-03, and H-04 restart/history rules | Fail closed or classify the historical record without invented evidence. |
| Make Connection termination decide an accepted Task outcome | Preempts H-09 | H-07 decides only new Invocation acceptance; retain historical binding and defer Task outcome. |

The proposal-time recommendation below avoided these conflicts. Any future
change introducing a conflicting rule requires a separately identified
superseding decision rather than an unnoticed H-07 qualification.

## Repository evidence inspected

The following paths and ranges were inspected as evidence, not authority.

### Governance and accepted records

* `docs/protocol/phase-15d-plan.md:22-37,84-112` assigns H-07 its exact
  question, gaps, Phase items, evidence, and future schema/state-machine work.
* `docs/protocol/normative-specification-gap-analysis.md:53-68,88-96,194-200`
  records missing Connection authority, scope, Invocation, idempotency, Trust,
  and lifecycle rules.
* `protocol/decisions/README.md:1-111` separates decisions from normative and
  implementation artifacts and records H-01 through H-06.
* H-01 through H-06 were inspected at the accepted-decision, qualification,
  approval, consequence, and final-status ranges cited in the dependency
  section; H-03's binding inventory at `:1638-1757`, H-04's direct/reference
  inventory at `:1274-1350`, H-05's binding/reauthentication rules at
  `:974-1105,1222-1283`, and H-06's state/transaction matrices at `:783-1013`
  were also inspected.

### Historical prose and schemas

* `protocol/specification/0.1-draft/connection.md:1-10` describes a Connection
  Offer, not an installed authoritative Connection.
* `protocol/specification/0.1-draft/audience-binding.md:1-7` calls for exact
  audience and tenant binding but does not define equality or inheritance.
* `protocol/specification/0.1-draft/invocation.md:1-11` names scope, deadline,
  capability, idempotency, and pre-execution failures without an acceptance
  transaction.
* `protocol/specification/0.1-draft/request-integrity.md:1-9` binds signed
  requests to Connection/version/audience/scope but leaves profile lifecycle
  experimental.
* `protocol/specification/0.1-draft/security-considerations.md:1-13`,
  `tasks.md:1-10`, `versioning.md:1-9`, and `profiles.md:1-36` provide short,
  incomplete historical constraints.
* `protocol/schemas/0.1-draft/connection-offer.schema.json:1-42` has Offer
  expiry, scope, authentication, capabilities, audience, and revocation fields,
  but no installed-Connection schema exists.
* `protocol/schemas/0.1-draft/invocation.schema.json:1-32` requires body scope
  and initiating subject but has no `connectionId` or request-proof field.
* `protocol/schemas/0.1-draft/capability.schema.json:7-40` gives capabilities
  their own active/deprecated/suspended/revoked status, not Connection state.
* `protocol/schemas/0.1-draft/task.schema.json:7-31` and
  `execution-receipt.schema.json:7-42` make Connection/scope bindings optional
  or inconsistent and do not settle inherited authority.
* `protocol/schemas/0.1-draft/error.schema.json:7-17` accepts a broad error code
  and retry/detail shape without semantic precedence.
* Scope/status/expiry/authentication/revocation/audience fields were also
  inspected in `approval-challenge.schema.json:7-21`,
  `capability-manifest.schema.json:7-32`, `delegation.schema.json:7-24`,
  `discovery.schema.json:7-22`, `install-grant-resolution.schema.json:7-32`,
  `issuer-metadata.schema.json:7-23`, `key-metadata.schema.json:7-27`,
  `passport.schema.json:7-33`, `request-challenge.schema.json:7-15`,
  `request-proof.schema.json:12-27`, `revocation-entry.schema.json:7-15`,
  `revocation-set.schema.json:7-18`, `revocation-status.schema.json:7-15`, and
  `signed-envelope.schema.json:7-16`. Their enums and absence rules disagree
  and none becomes a Connection state machine.

### Protocol Core, Agent, Client, Trust, Platform, and storage

* Protocol Core chooses the first common version, derives profiles and
  authentication from defaults, and builds a truthiness-based scope preview at
  `packages/ghostbridge-protocol-core/src/index.js:481-646`; its Invocation
  validator has no Connection parameter at `:1002-1032`; Task/Receipt bindings
  are separate at `:1291-1375`. Public declarations likewise define an Offer
  and Invocation without an authoritative Connection type at
  `packages/ghostbridge-protocol-core/src/index.d.ts:170-232,306-340`.
* Native Agent loads one Connection and checks `status === 'active'` near the
  start of Invocation, then performs proof, revocation, scope, authorization,
  capability, deadline, Task, and effect work without a final serialized state
  check (`packages/ghostbridge-native-agent/src/index.js:587-723,765-965`).
* Agent scope matching treats a Connection with absent workspace as matching a
  supplied workspace at `:650-655,1283-1300`; principal normalization also
  supports deployment wildcards at `:2529-2598`.
* Agent creation records a thin `active` object at `:1551-1660,1745-1778`;
  public projection injects the current package protocol constant at
  `:2088-2104`; revocation is a direct overwrite at `:1118-1147`; and its public
  revocation view reduces every non-revoked state to active at `:2121-2140`.
* Agent capability authorization, Task/Approval/Receipt bindings, and Trust
  freshness were inspected at `:1190-1340,2143-2260,2369-2401,2627-2643,2685-2718`.
* Native Client keeps Connections, previews, authentication bindings, and Trust
  records in process-local maps (`packages/ghostbridge-native-client/src/index.js:130-168`),
  caches installation inputs at `:510-734`, constructs Invocation from the
  cached Connection and current capability lookup at `:742-820`, polls/cancels
  Tasks at `:823-875`, and deletes its local Connection after revocation at
  `:942-955`. `close()` clears local state at `:995-998`.
* Client timeouts and retry classification are transport/SDK behavior at
  `:1000-1145`; scope/authentication helpers use truthiness and a cache key that
  encodes absent workspace as `null` at `:1417-1489`; agent-only lookup can use
  any sole cached Connection at `:1541-1559`.
* Trust issuer, review, key, revocation, cache, rollback, request, and historical
  Receipt behavior was inspected at `packages/ghostbridge-trust/src/index.js:60-94,399-471,986-1063,1131-1257,1280-1335,1380-1430,1531-1689`.
  Restricted/retired issuer metadata is not mapped to a Connection lifecycle;
  revocation and anti-rollback defaults are in-memory.
* Platform requires a workspace and derives organization from the authenticated
  principal at `backend/src/services/platformNativeClient.service.js:102-169`,
  while discovery/install/invoke use sealed Platform bindings and current Trust
  checks at `:420-944`. Platform authorization is stricter and exact-action
  bound at `:1012-1133`; its current authentication material is reconstructed
  per session at `:1491-1592`.
* Agent public store declarations were inspected at
  `packages/ghostbridge-native-agent/src/index.d.ts:17-149,201-272`. The JSON
  file adapter loads missing collections as empty, has no Connection transition
  journal, and provides generic put/delete/CAS at
  `packages/ghostbridge-native-agent/src/fileProtocolStores.js:10-175`; only
  Install Grant and terminal Task/Receipt writes get dedicated transactions at
  `:209-377`.
* Agent, Client, Trust, and Platform tests were inspected, including
  `packages/ghostbridge-native-agent/test/agent.test.js:66-148`,
  `security15c1a.test.js:912-1016,1147-1233,1553-1729,1879-1906`,
  `packages/ghostbridge-native-client/test/client.test.js:13-204`,
  `packages/ghostbridge-trust/test/trust.test.js:170-360`, and
  `backend/src/tests/platformNativeClient.test.js:256-835` plus
  `platformNativeClientAuthority.test.js:28-166` and
  `platformInstallationAuth.test.js:95-220`.
* Black-box evidence checks active creation, body Connection IDs, scope,
  idempotency, cancellation, Trust, and revocation at
  `scripts/verifyGhostBridgeBlackBoxConformance.mjs:245-332,415-625,629-812`.
  These expectations remain evidence only.

## Contradictions and undefined behavior

| # | Area | Current disagreement or omission | Consequence |
| --- | --- | --- | --- |
| 1 | Offer versus Connection | Historical prose and schema define a Connection Offer, while Agent code invents an installed record and response. No complete authoritative installed-Connection schema exists. | Peers cannot reproduce the authority bundle or validate stored history. |
| 2 | Status surface | Agent creation and lookup recognize `active`; revocation writes `revoked`. Suspension, Connection expiry, closure, replacement, source-bound resumption, and terminality are absent. | Implementations can deny, retain, or revive authority differently. |
| 3 | Authority source | Agent Invocation reloads by a body/route `connectionId`, but Client and Platform retain process-local or sealed copies; capability browsing finds any active scope match; a bare Platform binding may outlive Agent state. | A reference, cache, or nearby active Connection can be mistaken for current authority. |
| 4 | Scope | Scope is duplicated across Offer, grant, Connection, Invocation, proof, Task, Receipt, Approval, Trust, and Platform binding. Agent checks workspace only when the stored workspace is truthy; Client/Agent projections omit falsy values; Platform always requires workspace; deployment principals may carry `*`. | Absent can act as wildcard, while null/empty/present behavior and inheritance diverge. |
| 5 | Capability authority | Offer/grant ceilings, preview capabilities, Connection key arrays, live registry contracts/status, discovery features, Client live details, Trust manifest, Platform approved keys, and policy may differ. | A key-only Connection can be widened or reinterpreted by live capability data. |
| 6 | Version/profile binding | Stored Connections omit the selected release, profiles/facets, full authentication binding, immutable consent, omissions, restrictions, and evidence; projection inserts `PROTOCOL_VERSION`. | Restart or upgrade can reinterpret historical authority contrary to H-03–H-05. |
| 7 | Authentication failure | Generic HTTP authentication and optional request-integrity reject a request, install-time binding stays cached, Platform may reacquire provider material, and no code durably suspends/resumes a Connection. | The same provider/credential event can be request-local, indefinite, or operationally terminal. |
| 8 | Trust changes | Trust defines active/restricted/suspended/compromised/retired metadata, key states, freshness, and issuer review states; Agent/Platform mostly collapse them to deny/`REVOKED` errors without Connection transitions. | Temporary outage, stale evidence, retirement, restriction, compromise, and revocation lack deterministic lifecycle consequences. |
| 9 | Expiry | Offer, grant, credentials, Passport, keys, proofs, and Receipts have expiries; the Connection does not. No clock or serialization point controls Connection expiry. | Credential/grant expiry may be mistaken for Connection expiry or ignored indefinitely. |
| 10 | Closure/replacement | Runtime exposes revocation only. No close or replace route, cutover record, predecessor/successor link, no-dual-authority guard, or crash rule exists. | Voluntary end and material renegotiation are implementation-local. |
| 11 | Restart | Agent file state may survive; Client maps are cleared; Platform reconstructs sessions from sealed bindings; default Trust cache/checkpoint state is in memory; policy/authentication state is current deployment data. | Restart can lose, reconstruct, or reinterpret narrowing evidence without a protocol rule. |
| 12 | Missing/corrupt state | Missing collections become empty in the file adapter, JSON corruption throws, missing Connection becomes not-active, and no Connection journal/integrity inventory distinguishes never-created, deleted, rolled back, or partial. | Absence can be treated as not found, revoked, active elsewhere, or eligible for reinstall. |
| 13 | Invocation race | Agent checks active state once before authorization and Task creation; revocation can overwrite the record concurrently, with no final state serialization. | A state transition can win in storage while the Invocation still commits work. |
| 14 | Idempotency | Agent namespace binds organization/workspace/capability/key; digest binds capability/version/payload. It omits Connection, selected release/profile, owner principal, target, deadline, operation/action, authorization/Approval, and state sequence. | Reuse across Connections or authority changes can produce false replay or duplicate effects. |
| 15 | Task boundary | Connection revocation neither aborts nor deterministically preserves an executing Task; Task and Receipt store Connection/scope inconsistently; status/cancel routes use task context. | Connection termination may be wrongly treated as automatic Task cancellation or ignored history. |
| 16 | Errors/privacy | Agent and Platform map the same failures differently; Trust failures are collapsed; existence and state checks occur at observable positions; no multi-fault precedence or safe status-disclosure rule exists. | Codes, retry decisions, and timing can leak Connection/tenant existence or trigger unsafe retries. |

Current implementation tests cannot settle any contradiction above.

## Terminology

| Term | Meaning for this decision packet |
| --- | --- |
| Connection | The durable, scoped installed relationship created directly as `active` by the accepted H-06 commit; it is a necessary boundary for considering governed requests, not a credential or blanket permission. |
| Connection identity | The stable opaque Connection ID plus its immutable creation identity; IDs are never reused or moved between authority bundles. |
| Authoritative Connection record | The latest integrity-verified committed record and transition history loaded from the authoritative durable storage boundary. |
| Connection authority bundle | The immutable H-01–H-06 semantics, direct fields, evidence references, state/tombstone, and current narrowing inputs needed to decide eligibility. |
| Immutable Connection binding | The non-substitutable owner, target, tenant, release, profile, authentication, capability, consent, restriction, and evidence identities fixed at creation. |
| Current eligibility evidence | Fresh authentication, Trust/revocation, authorization, policy, Approval, time, and storage-integrity facts that may narrow but never rewrite the immutable bundle. |
| Connection owner principal | The typed authenticated Host principal fixed by H-05/H-06 as the Connection caller/owner identity, distinct from a body subject. |
| Target Agent/resource | The exact Agent, Passport, authentication audience, and resource target fixed in the immutable bundle. |
| Tenant scope | An exact organization plus a tagged workspace component that is either absent or one validated value. |
| Organization | A validated, case-sensitive opaque tenant identifier; equality rules cannot be inferred from display names or deployment database IDs. |
| Workspace absence | An explicit tagged condition meaning no workspace value was selected; it is neither wildcard, null, empty, nor permission to choose later. |
| Workspace value | One validated non-empty opaque workspace identifier stored with the `present` tag. |
| Exact scope equality | Equal validated organization and equal workspace tags, and, when present, equal workspace values under the selected release's identifier rules. |
| Inherited scope | A child object's mandatory use of the Connection scope by immutable reference and/or exact snapshot; inheritance never permits override. |
| Enabled capability | An exact capability key/version and its selected authority/safety restrictions in the immutable H-04 result. |
| Current effective authority | The narrowing intersection of active Connection bounds, current authentication, exact scope, capability eligibility, Trust/revocation, authorization, policy, and Approval where required. |
| Active | A nonterminal Connection state eligible to participate in the narrowing intersection; it is necessary but never sufficient for new Invocation acceptance. |
| Suspended | A durable non-authorizing state with one or more recoverable, source-owned, reason-bound conditions; only bounded status/recovery/termination actions are eligible. |
| Expired | A terminal non-authorizing outcome observed at or after an immutable Connection expiry boundary. |
| Closed | A terminal voluntary non-authorizing outcome requested by an authorized owner/Agent/operator. |
| Revoked | A terminal non-authorizing security outcome based on an authoritative Connection, credential, principal, Agent/Passport/key, or later H-11 revocation source. |
| Replaced | A terminal non-authorizing outcome linking the old Connection to a distinct committed successor after safe cutover. |
| Terminal state | `expired`, `closed`, `revoked`, or `replaced` in the recommendation; it never transitions to active or suspended. |
| Recoverable condition | A cause proven temporary and same-invariant whose owning source defines evidence that can clear it without widening authority. |
| Material change | Any change to release, profile/facet, authentication profile/issuer/subject/principal, target/audience, tenant, capability authority, consent, experiment, extension, omission, limitation, or restriction that H-01–H-05 make non-substitutable. |
| Same-invariant reauthentication | Fresh authentication that changes only a permitted key/reference/validity instance while every H-05 identity, target, profile, tenant, limitation, and authority invariant remains equal. |
| Replacement Connection | A distinct H-06-created Connection with its own ID, preview, consent, grant, authority bundle, and history. |
| Replacement cutover | The serialized sequence ensuring the old Connection cannot exercise authority before the new one becomes active and linking both histories without mutating the old bundle. |
| Durable transition sequence | A per-Connection strictly monotonic sequence binding predecessor state/digest, trigger, source, reason, evidence, time, and resulting state. |
| Transition serialization point | The authoritative logical instant at which current state, guards, competing triggers, and atomic effects are rechecked and one outcome commits. |
| Connection tombstone | The minimum safe terminal record retaining ID, immutable historical evidence references, first terminal reason/state/time/sequence, and replacement links without reusable secrets. |
| Indeterminate/corrupt durable state | An internal fail-closed condition where the authoritative record, transition, checkpoint, or immutable evidence cannot be proved complete and consistent; it is not an authority state. |
| Invocation acceptance commit | The serialized durable point at which all current guards are rechecked and a new Invocation is bound to committed Task/idempotency evidence; preliminary checks do not accept it. |
| In-flight Task | Work already durably accepted at the Invocation acceptance commit, whether queued, running, waiting, or terminal. |
| Safe status disclosure | Authentication-, scope-, purpose-, and privacy-bounded disclosure that reveals no more existence, state, linkage, or reason than H-12 later permits. |

### Controlling non-equivalences

* Authenticated is not active.
* Active is not sufficient authorization.
* Connection possession/reference is not authority.
* An Offer is not a Connection.
* A body `connectionId` is not an authoritative Connection.
* Absent workspace is not a wildcard.
* Absent is not null or empty.
* Current policy denial is not automatically revocation.
* Isolated authentication failure is not automatically suspension.
* Suspension is not revocation.
* Closure is not revocation.
* Replacement is not mutation of the old Connection.
* Credential expiry is not automatically Connection expiry.
* Grant expiry after commit is not Connection expiry.
* A cached Connection is not authoritative after restart.
* Task existence is not proof that the Connection remains active.
* An internal lock or recovery mode is not Connection authority.

## Human decision questions

Every row required an explicit human selection during proposal review.
“Recommended” identified the then-unapproved proposal, not a default approval.
The completed approval later in this record supplies the disposition.

| Area | Selectable question | Choices requiring explicit selection | Proposal-time recommendation |
| --- | --- | --- | --- |
| A. State model | Which states exist, how is creation represented, which are terminal, and what is expiry? | A1 binary; A2 explicit monotonic; A3 lease; A4 derived. Separately choose whether any `pending`/`creating`/`reauthenticating`/`recovering`/`replacing` state is visible and whether terminal return is possible. | Direct H-06 `active`; visible `active`, `suspended`, `expired`, `closed`, `revoked`, `replaced`; no authority-bearing work states; last four terminal; expiry derived at time and materialized as a tombstone. |
| B. Authority by state | Which operations may each state perform? | Choose governed Invocation, status/replay, recovery, closure/revocation, replacement, and discovery rights independently. | New Invocation only from active after full intersection; bounded recovery/status/termination from suspended; terminal states only safe historical/status/replay disclosure; public discovery remains authority-free. |
| C. Immutable binding | What is direct, referenced, refreshable, or immutable? | Inline-all, reference-all, or H-04/H-05 hybrid; enumerate refreshable evidence. | Accepted hybrid inventory; only same-invariant current evidence refreshes. |
| D. Tenant scope | How are organization/workspace values compared and inherited? | Exact, hierarchical, or policy-defined; select null/empty/case/Unicode behavior and child overrides. | Exact tagged equality; absent/absent only; null/empty/malformed reject; case-sensitive validated identifiers; H-10 decides canonical bytes, not equality semantics; children cannot override. |
| E. Suspension | Who may suspend, is it durable/source-owned, what resumes it, and does it affect Tasks/expiry? | Request-local only; single reason; multi-cause durable; operator-only; automatic timeout. | Durable multi-cause, source-owned/reason-bound; all causes must clear with fresh proof; no authority widening; no expiry pause; existing Task outcome deferred to H-09. |
| F. Reauthentication | How are isolated failure, unavailability, rotation, material change, and compromise handled? | Deny, suspend, mutate, replace, or revoke by class; choose fallback policy. | Preserve the five H-05 classes exactly; never fall back. |
| G. Expiry | Is Connection expiry mandatory, optional, or profile-dependent, and what boundary applies? | Mandatory finite; selected-profile/consent dependent; optional untyped; none. Choose mutability, pause, equality, and tombstone. | Explicit selected expiry policy; finite only when selected release/profile/consent requires it; immutable `expiresAt` when finite; half-open; equality expired; serialization controls; no pause/extension; change requires replacement. |
| H. Closure | Who may close, is it terminal/idempotent/reversible, and how does it race? | Owner, Agent, operator, policy, or combinations; reversible or terminal. | Authenticated and authorized owner/Agent/operator; voluntary terminal; exact repeat idempotent; serialized against acceptance; safe tombstone only. |
| I. Revocation | Which sources revoke, what evidence remains, and what happens to accepted Tasks? | Owner-only; Trust-only; enumerated multi-source; policy-derived. | Enumerated authoritative Connection/security sources; terminal; retain safe evidence; serialize against acceptance; Task outcome remains H-09. |
| J. Replacement | What changes require replacement and how is cutover sequenced? | Fully atomic; suspend-old/create-new/finalize; new-first overlap; old-first terminal. Choose replay, rollback, links, and old resumption. | Distinct records; suspend-old/create-new-through-H-06/finalize; no active-active overlap; old may resume only after proven precommit failure, no successor, and unchanged eligibility; never after successor commit. |
| K. Persistence/recovery | What is durable, how is rollback/corruption handled, and may recovery create authority? | Snapshot; journal; event log; external transaction coordinator; protocol-visible unknown/recovering or internal fail-closed. | Complete record plus monotonic transition journal/checkpoint and replacement coordinator; internal indeterminate only; exact restore/quarantine/operator classification; no implicit Connection. |
| L. Invocation binding | What is trusted, ordered, and serialized at acceptance? | Early active check; final compare-and-set; state lease; global transaction. Choose idempotency fields and Task boundary. | Authoritative reload/integrity verification, full intersection, and final per-Connection serialized recheck/commit; body fields are claims only; already committed work is H-09. |
| M. Failure/privacy | What internal precedence, disclosure, and retry consequences apply? | Detailed errors; collapsed existence-safe errors; operation/profile-specific. | Stable internal semantic order; externally collapse existence/scope/state where needed; H-12 selects wire errors/status/retry; bounded safe status only. |

## High-level alternatives

### Option A — Binary active/revoked model

* **Exact states:** `active`, `revoked`; H-06 creates `active`; `revoked` is
  terminal. Expiry, closure, and replacement live outside Connection state.
* **Authority model:** active is necessary, current failures deny individual
  requests, and only revocation removes Connection eligibility.
* **Restart:** reload the binary record; recompute every other condition.
* **Scope:** exact tagged equality can be added, but binary state does not make
  scope inheritance durable by itself.
* **Reauthentication:** isolated and recoverable failures are request-local;
  material change requires a separately tracked replacement; compromise maps to
  revocation.
* **Replacement:** external coordinator or administrative convention; no
  first-class `replaced` tombstone.
* **Privacy:** small status surface, but external reason stores can leak or
  disagree.
* **Storage complexity:** low for Connection records, displaced into external
  expiry/closure/replacement/recovery stores.
* **Current-code compatibility:** highest superficial compatibility with
  active/revoked Agent code.
* **H-01–H-06 compatibility:** direct active and terminal compromise fit, but
  recoverable suspension required by H-05 is not durably represented and
  material-change history is weak.
* **Security strengths:** simple terminal revocation and fewer transition bugs.
* **Residual risks:** indefinite active authority, outage ambiguity, missing
  closure/replacement history, and restart reconstruction.
* **Operational cost:** low code-state cost, high cross-system coordination.
* **Rejected/unresolved subchoices:** whether an external suspension flag is
  merely another hidden Connection state; how expiry and closure race; how old
  Connections are proved non-authorizing.

### Option B — Explicit monotonic lifecycle with recoverable suspension

* **Exact states:** `active`, `suspended`, `expired`, `closed`, `revoked`,
  `replaced`; H-06 creates `active`; the last four are terminal.
* **Authority model:** active is necessary but insufficient; suspended and
  terminal states accept no new Invocation; suspended permits only bounded
  source-owned recovery/status/termination actions.
* **Restart:** reload immutable bundle, latest monotonic transition, active
  causes, checkpoints, and evidence; never infer active.
* **Scope:** exact immutable tagged organization/workspace equality inherited
  without override.
* **Reauthentication:** the H-05 graduated classes map to request denial,
  suspend/resume, replacement, or terminal revocation.
* **Replacement:** a distinct successor and durable cutover/link are first-class.
* **Privacy:** more states require H-12 disclosure collapsing and access control.
* **Storage complexity:** moderate/high: transition sequence, tombstones,
  multi-cause suspension, integrity, and replacement coordinator.
* **Current-code compatibility:** requires substantial future changes; current
  active/revoked records are incomplete evidence.
* **H-01–H-06 compatibility:** directly represents every delegated consequence
  without changing H-06 when replacement uses the recommended staged model.
* **Security strengths:** fail-closed restart, terminality, exact history,
  no-widening recovery, deterministic races.
* **Residual risks:** state-machine/storage bugs, stuck suspensions, evidence
  availability, and operator-recovery abuse.
* **Operational cost:** richer monitoring, evidence retention, recovery tooling,
  and transition serialization.
* **Rejected/unresolved subchoices:** exact H-11 evidence mechanics, H-12 public
  errors, H-14 retention, and H-09 Task consequences remain deferred.

### Option C — Renewable lease model

* **Exact states:** `active`, `renewal_due`, `expired`, `closed`, `revoked`,
  `replaced`; H-06 creates `active`; `renewal_due` is non-authorizing or
  grace-authorizing only by an additional explicit choice; terminal states are
  expiry, closure, revocation, and replacement.
* **Authority model:** every Connection needs a bounded lease and renewal proof;
  expiry/reauthentication are the dominant lifecycle controls.
* **Restart:** reload lease deadline and renewal evidence; no renewal from
  cached provider success.
* **Scope:** exact immutable scope; a renewal cannot change it.
* **Reauthentication:** same-invariant renewal can extend lease; material change
  replaces; compromise revokes.
* **Replacement:** distinct successor, usually old-first or staged cutover.
* **Privacy:** renewal timing and failure reasons create additional oracles.
* **Storage complexity:** high-frequency atomic renewal and clock/checkpoint
  state, but fewer suspension-reason types if every outage becomes nonrenewal.
* **Current-code compatibility:** low; current Connections have no lease.
* **H-01–H-06 compatibility:** can preserve direct active, but an in-place lease
  extension risks mutating immutable consent/validity semantics unless already
  selected in the authority bundle.
* **Security strengths:** bounds stale authority and forces periodic current
  proof.
* **Residual risks:** clock and availability dependence, mass expiry, renewal
  replay, and accidental authority extension.
* **Operational cost:** continuous renewal infrastructure and outage planning.
* **Rejected/unresolved subchoices:** mandatory durations, grace, renewal
  authority, whether `renewal_due` authorizes, and historical lease migration.

### Option D — Fully derived eligibility model

* **Exact states:** durable `active`, `closed`, `revoked`, `replaced`; expiry is
  derived; no durable suspended state. H-06 creates `active`; the other listed
  states are terminal.
* **Authority model:** authentication, Trust, policy, scope, capability, time,
  and evidence availability dynamically decide every request.
* **Restart:** reload identity/binding, then recompute eligibility entirely from
  current external systems.
* **Scope:** exact immutable scope is possible, but current external tenant data
  can narrow eligibility.
* **Reauthentication:** recoverable failure causes dynamic denial; same-invariant
  success resumes without a state transition; material change replaces;
  compromise revokes when observed.
* **Replacement:** distinct records and an external/durable cutover coordinator.
* **Privacy:** fewer visible states, but timing differences across dependencies
  can disclose the failing source.
* **Storage complexity:** lower Connection state complexity, higher dependency
  freshness/consistency complexity.
* **Current-code compatibility:** resembles current Agent/Platform behavior but
  current code still lacks complete immutable binding and final serialization.
* **H-01–H-06 compatibility:** preserves narrowing intersection, but fails to
  durably represent H-05 Connection-wide recoverable suspension and can silently
  reconstruct eligibility after restart.
* **Security strengths:** always consults current narrowing evidence and avoids
  stale suspension cleanup.
* **Residual risks:** split-brain eligibility, outage oscillation, no durable
  cause/history, and provider defaults becoming authority.
* **Operational cost:** high availability and consistency demands on every
  dependency.
* **Rejected/unresolved subchoices:** cache freshness, outage policy, evidence
  snapshotting, and how a derived expiry becomes a permanent tombstone.

### Comparative conclusion

Option A is operationally simple but externalizes most of H-07. Option C gives
strong bounded freshness but introduces a lease not evidenced by current
Connections and risks in-place semantic extension. Option D resembles current
dynamic checks but lacks durable H-05 suspension and deterministic restart.
Option B best preserves accepted immutable binding, recoverable-versus-terminal
classification, auditability, and no-widening recovery, at the cost of the
largest explicit lifecycle/storage contract.

## Proposal-time recommendation — subsequently accepted

At proposal time, this record recommended Option B with the qualifications
below. Rudra subsequently approved Option B and the complete qualified decision
bundle on 2026-08-02. The verbatim approval later in this record is the
authoritative human disposition.

### Recommended state and authority model

1. H-06 creates the Connection directly as `active`; no `pending`, `creating`,
   `reauthenticating`, `recovering`, or `replacing` state grants or represents
   protocol authority.
2. The visible state inventory is `active`, `suspended`, `expired`, `closed`,
   `revoked`, and `replaced`.
3. `expired`, `closed`, `revoked`, and `replaced` are terminal and never return
   to active or suspended. `suspended` may return to active only by a serialized
   source-bound same-invariant resumption.
4. Active is necessary but never sufficient. Current effective authority is
   the H-02 intersection; every later input can deny or narrow and none can
   widen the immutable bundle.
5. Suspended admits no new Invocation. It admits only authenticated,
   purpose-bound, scope-bound safe status, same-invariant recovery, closure,
   revocation, and replacement initiation selected by the final approval.
6. Terminal Connections admit no Connection-governed action. Authenticated safe
   historical status or exact replay lookup of work already accepted may be
   disclosed without accepting a new Invocation, subject to H-09/H-12.
7. Public discovery remains non-authoritative and may continue regardless of a
   Connection state.

### Recommended immutable binding

Use the accepted H-04/H-05/H-06 hybrid inventory. Directly retain the authority-
critical semantics listed later in this record. Bulky safe evidence may be
referenced only by immutable release-bound identity or future H-10-qualified
digest and must remain historically resolvable. Current authentication, Trust,
authorization, Approval, policy, time, and revocation evidence may narrow use;
only an expressly same-invariant credential/key/reference refresh can update its
permitted current evidence without replacing the Connection. No in-place
release/profile/capability expansion, tenant move, owner substitution, target
change, consent change, or authority widening is permitted.

### Recommended scope equality and inheritance

Organization is required. Workspace is a tagged union: `absent` or `present`
with one non-empty validated value. Exact equality requires equal validated
organization values, equal workspace tags, and equal workspace values when
present. Comparison is case-sensitive and performs no display-name, locale,
database-object, prefix, hierarchy, or wildcard inference. H-10 may define
canonical bytes and identifier validation but may not turn unequal semantic
identifiers into equal scope. Null, empty string, whitespace-only, malformed,
or untagged ambiguous workspace input is invalid, not absent.

Invocation, Task, Result, Receipt, Approval, authorization, and audit evidence
inherit the Connection scope through an immutable reference and/or exact
snapshot. A supplied child scope is a consistency claim and must equal the
Connection; it can never override or fill an absent workspace.

### Recommended suspension and resumption

Use a durable set of suspension causes. Each cause binds a registered source,
reason category, safe evidence identity, first-observed time, transition
sequence, and explicit clearing guard. Recoverable selected-profile
authentication unavailability and current Trust/revocation unavailability or
staleness may suspend when their accepted profile says the condition is
Connection-wide. Isolated bad proof and ordinary current policy denial remain
request-local. Compromise and authoritative revocation are terminal, not
suspension.

The Connection remains suspended while any cause is active. Only the source
that owns a cause, or a narrowly authorized recovery authority defined for that
source, may supply fresh clearing proof. Resumption rechecks the complete
immutable bundle, all active causes, time/expiry, current authentication,
Trust/revocation, scope, and storage integrity at one serialization point. It
removes no restriction, pauses no expiry, creates no Connection, and cannot
resume after any terminal outcome.

### Recommended reauthentication consequences

* Isolated malformed, stale, replayed, wrong-body, or wrong-operation proof:
  deny the request, no state change when the durable binding is otherwise
  current and uncompromised.
* Provider transient failure within permitted freshness: deny the request, no
  state change; beyond the profile bound or for Connection-wide binding loss:
  durably suspend.
* Planned rotation preserving exact profile, issuer, subject, owner principal,
  Agent, Passport, target/audience, tenant, limitations, and authority bounds:
  preserve active or resume suspended after serialized proof and retain safe
  old/new evidence.
* Principal, profile, issuer, subject, Agent, Passport, target/audience,
  organization, workspace, limitation, or authority change: require a distinct
  replacement with preview and consent.
* Credential/principal/Agent/Passport/key compromise or authoritative selected-
  binding revocation: terminally revoke the existing Connection.
* No weaker, bearer-for-PoP, provider-default, cached-success, broker-failure,
  adjacent-profile, or `none` fallback is permitted.

### Recommended expiry, closure, and revocation

A Connection has an explicit immutable expiry policy selected inside preview,
consent, and the H-06 result. A finite `expiresAt` is required when the selected
release/profile/consent requires finite Connection lifetime; otherwise the
bundle explicitly records that no independent Connection expiry was selected.
Finite validity is half-open: a new Invocation may serialize only while
`now < expiresAt`; equality is expired. The authoritative clock at the final
serialization point controls. Suspension never pauses or extends expiry, and
expiry cannot be extended in place. The first authoritative observation at or
after the boundary materializes terminal `expired` evidence and a tombstone.

Closure is a voluntary terminal transition initiated by an authenticated,
exact-scope, authorized owner principal, target Agent authority, or explicitly
designated operator authority. The exact same closure repeats idempotently;
conflicting closure data cannot rewrite history. Closure is irreversible and is
serialized against Invocation acceptance and other terminal triggers.

Revocation is a terminal security transition from an enumerated authoritative
Connection, selected authentication, principal-compromise, Agent/Passport/key,
or future H-11-qualified source. It retains safe source/reason/evidence/time and
the immutable history, discloses only an H-12-safe result, and serializes against
Invocation acceptance, closure, expiry, suspension, and replacement. Policy
denial, issuer retirement, Trust staleness, and provider outage are not
automatically revocation without an accepted authoritative mapping.

### Recommended replacement sequencing

Use suspend-old/create-new/finalize-old:

1. Validate that the proposed change is material and requires a new preview,
   consent, grant, and distinct Connection.
2. Durably add a replacement-owned suspension cause to the old Connection and
   create a coordinator record before creating the successor. This removes old
   authority without making it terminal.
3. Create the new Connection through the unchanged H-06 transaction. The H-06
   commit still creates only the new Connection directly as `active`; it does
   not mutate the old Connection.
4. Resolve the exact H-06 result after every ambiguity. Once the successor is
   durably committed, atomically bind predecessor/successor history in the
   coordinator and terminally finalize the old Connection as `replaced`.
5. Before successor commit, a proven terminal replacement failure may clear the
   replacement suspension and resume the old Connection only if no successor
   exists, every old invariant/current guard remains valid, and no terminal
   trigger won. After successor commit the old Connection can never resume,
   even if finalization or response delivery failed.

This model guarantees no active-active overlap but accepts a temporary authority
gap. Exact successor-grant replay returns the H-06 successor ID. Recovery uses
the coordinator and exact H-06 result; it never guesses or creates another
Connection.

### Recommended persistence and Invocation boundary

Persist the complete immutable bundle, current state, monotonic transition
sequence and predecessor digest, active suspension causes, terminal evidence,
replacement coordinator/link, integrity/anti-rollback checkpoint, and minimum
safe audit/tombstone history. Restart loads and verifies these records; it does
not infer active from an absent state, a cached binding, current defaults, or a
successful prior request.

Missing, partial, rolled-back, duplicate, split-brain, or evidence-unresolvable
state is internal indeterminate/corrupt state and fails closed. `unknown` and
`recovering` are not protocol authority states. Operator recovery may restore
only the exact proven committed history, attach a non-authorizing external
classification, or quarantine it. Recovery may not widen, reactivate a
terminal Connection, or create a replacement implicitly.

A new Invocation is accepted only when a final serialized check reloads the
authoritative Connection, verifies immutable integrity and current state/time,
rechecks all raceable narrowing inputs, and atomically binds the acceptance to
durable Task/idempotency evidence. A preliminary active check, lock, lease,
cache, authorization result, or Task candidate grants no acceptance.

### Recommended safe disclosure and retention

Internally preserve precise semantic causes, but expose only authenticated,
purpose-bound, exact-scope status needed for recovery or history. Unknown,
cross-scope, unauthorized, missing, corrupt, and privacy-sensitive state
failures should be externally collapsible; H-12 owns exact routes, codes,
statuses, messages, detail fields, retry labels, and timing defenses.

Retain terminal tombstones and immutable evidence for at least the resulting
historical-support period and for every surviving Task/Receipt/replay dependency.
H-14 must select exact retention and deletion policy. Tombstones exclude raw
credentials, grant secrets, provider secrets, private keys, private policy, and
unbounded reason detail.

## Authoritative Connection inventory

This inventory records the accepted H-07 governance semantics and is not a
schema.

| Class | Proposed contents | Authority rule |
| --- | --- | --- |
| Directly retained authority-critical semantics | Connection ID and H-06 creation/commit identity; current lifecycle state; transition sequence/predecessor digest; creation time; explicit expiry policy and immutable `expiresAt` when finite; typed owner principal; Host identity where separately required; Agent, Passport, issuer, authentication audience, and target; tagged organization/workspace; exact release and release/spec/schema/compatibility manifest identities; selected profiles/facets/conformance claims; selected authentication profile/revision and safe binding semantics; exact enabled/disabled capability keys and versions; capability-local restrictions; extension/experiment/omission/limitation results; consent and Offer/grant/redemption identities; immutable evidence identities/digests; active suspension-cause identities; replacement coordinator/predecessor/successor references; state/result semantic status. | These values define the immutable maximum and lifecycle. No current input may substitute, infer, or widen them. |
| Immutable referenced evidence | Full Host/discovery advertisements; Passport and capability manifest; exact capability contracts; Offer/grant context; complete final consent envelope; negotiation transcript; profile/facet/extension/experiment registries; H-03 release/spec/schema/compatibility manifests; bulky safe authentication/Trust verification evidence. | Reference must be immutable, release-bound, secret-free, historically resolvable, and integrity-qualified. Unavailability fails closed. |
| Current external/narrowing evidence | Current selected-profile proof or bounded channel evidence; provider/key/reference availability; current Trust metadata, revocation set, freshness and checkpoint; current policy and authorization decision; Approval; clock; storage health; deployment restrictions. | Reevaluate for each governed request as applicable. It may deny, suspend, terminate under an accepted mapping, or narrow; never widen or reinterpret. |
| Transient values | Raw per-request proof; designated transient bearer presentation; response buffers; sockets; timers; database sessions; locks/leases; candidates; uncommitted transition objects; in-memory cache; retry counters; unredacted provider response within its verification boundary. | Grants no authority and must not be used after restart as authoritative evidence. |
| Prohibited values/inferences | Raw grant or credential secrets; access/refresh tokens; passwords; private keys; session cookies; reusable bearer/PoP material; body principal as truth; mutable URL/current pointer/package constant/default; storage-vendor handle as authority; inferred workspace wildcard; current live capability as automatic expansion; private policy internals; invented historical evidence. | Never enter durable protocol artifacts, tombstones, public status, logs, metrics, or audit evidence and never establish authority. |
| Historical tombstone fields | Connection ID; immutable bundle identity/digest; creation and terminal sequence/time; terminal state and safe reason/source category; terminal evidence identity; explicit expiry policy; predecessor/successor/coordinator links; minimum accepted-Task/Receipt/replay references; retention/classification metadata. | Non-authorizing historical proof only. It cannot authenticate, resume, widen, or create a Connection. |

## State and authority matrix

“Replay” below means safe lookup of an already committed Connection result or
already accepted work; it is not acceptance of a new Invocation and remains
subject to H-06, H-09, and H-12.

| State | Connection authority | Capability eligibility | Allowed recovery/status actions | New Invocation accepted? | Exact replay/status lookup? | Reauthentication may resume? | Replacement may begin? | Terminal? | Restart behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `active` | Boundary may participate in effective authority | Yes, exact enabled capability/version only, then all current narrowing checks | Safe status, same-invariant refresh, close, revoke, begin replacement | Yes, only at final serialized full-intersection commit | Yes, authenticated and disclosure-bounded | Same-invariant refresh may preserve active; no material rebind | Yes; old is suspended before successor creation | No | Load and integrity-verify active record; reevaluate current evidence; never infer from cache |
| `suspended` | No current governed authority | No | Safe status; clear owned cause; same-invariant reauthentication; close; revoke; begin/continue replacement; operator diagnosis | No | Yes, only historical/already-accepted lookup | Yes, only after all causes clear and complete guard recheck | Yes, subject to cause and material-change guards | No | Remain suspended with every cause; missing cause/evidence fails closed |
| `expired` | None | No | Safe tombstone/status and historical replay only | No | Yes, disclosure-bounded | No | A distinct new installation may be considered, but old cannot authorize it | Yes | Reload terminal tombstone; never recompute active or extend expiry |
| `closed` | None | No | Safe tombstone/status and historical replay only | No | Yes, disclosure-bounded | No | A distinct new installation may be considered with new consent/grant | Yes | Reload terminal tombstone; exact close replay is idempotent |
| `revoked` | None | No | Safe tombstone/status and historical replay only; operator evidence dispute cannot restore authority | No | Yes, disclosure-bounded | No | Only a distinct new installation if the revocation source and governance permit; never under old authority | Yes | Reload terminal evidence; current defaults or renegotiation cannot reverse it |
| `replaced` | None | No | Safe tombstone/status, successor-link disclosure, and historical replay only | No | Yes, disclosure-bounded | No | No; recorded successor already controls. A later material change starts from that successor | Yes | Reload terminal predecessor/successor link; never activate old record |

Indeterminate/corrupt durable state is deliberately absent from this candidate
state inventory: it grants no authority and is handled as a storage/recovery
failure, not projected as a lifecycle state.

## Legal transition table

| Source | Trigger | Guard at serialization | Destination | Atomic durable effects | Authority effect | Audit requirement | Race dependencies | Deferred dependency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| none | Complete H-06 redemption commit | Every H-06 guard and durable observability succeeds | `active` | H-06 atomically creates the complete Connection/result; lifecycle sequence begins at its accepted initial value | Authority begins exactly at H-06 commit | Commit-before-success audit intent/evidence | Grant expiry/revocation/redemption | H-10/H-11/H-12 representation only |
| `active` | Recoverable Connection-wide authentication or Trust condition | Registered source; recoverable class; current cause evidence; no terminal trigger | `suspended` | Increment sequence; bind source/reason/evidence/time; add cause; set state | New acceptance stops at commit | Safe cause category and transition identity after commit | Concurrent acceptance, expiry, close, revoke, replacement | H-11 freshness/evidence; H-12 errors |
| `suspended` | Additional cause or one cause clears while others remain | Cause source/clear proof is authentic; at least one cause remains | `suspended` | Increment sequence and atomically update cause set/history | Remains non-authorizing | Cause add/clear without private provider detail | Concurrent cause updates and terminal triggers | H-10/H-11 evidence form |
| `suspended` | Resume | Every cause has source-owned clearing proof; complete immutable/current/state/time/integrity guards pass; no successor committed | `active` | Increment sequence; retain cause history; clear current cause set; bind recovery evidence/time | Authority becomes eligible, not sufficient | Recovery source(s), evidence identities, resulting sequence | Expiry, revocation, close, replacement, concurrent resume | H-10/H-11/H-12 |
| `active` or `suspended` | Finite expiry observed | Authoritative clock at/after immutable `expiresAt`; no earlier terminal transition | `expired` | Increment sequence; store first terminal reason/time and tombstone | Permanently none | Boundary, clock source/profile, sequence | Acceptance equality, suspension, close/revoke | H-10 time form; H-12 projection |
| `active` or `suspended` | Authorized voluntary close | Exact owner/Agent/operator authority; exact scope; request valid; no earlier terminal state | `closed` | Increment sequence; store safe actor/purpose/request identity, time, reason, tombstone | Permanently none | Safe closer category and exact request identity | Acceptance, expiry, revocation, replacement | H-12 operation/error; H-10 request binding |
| `active` or `suspended` | Authoritative revocation/compromise | Enumerated source/evidence valid under selected binding and H-11; no earlier terminal state | `revoked` | Increment sequence; bind safe source/reason/evidence/effective/observed time and tombstone | Permanently none | Security event after commit, privacy-bounded | Acceptance, close, expiry, replacement, multiple sources | H-11 sequencing/freshness; H-12 disclosure |
| `active` | Replacement begins | Material change; new preview/consent/grant plan; coordinator unique; old otherwise valid | `suspended` | Create coordinator and replacement cause; increment old sequence atomically | Old loses eligibility before successor creation | Coordinator and material-change category | Concurrent acceptance, terminal trigger, another replacement | H-06 successor creation; H-10/H-12 |
| `suspended` | Successor H-06 commit is proven | Coordinator matches; exact successor result durably observable; old has replacement cause; no active-active condition | `replaced` | Atomically finalize old tombstone and predecessor/successor/coordinator links; retain successor H-06 evidence | Old permanently none; successor independently active | Cutover/result/finalization evidence | Revocation, crash, duplicate coordinator | H-06 replay; H-11 shared compromise |
| `suspended` | Replacement fails before successor commit | Authoritative proof no successor committed; coordinator terminally failed; all old guards and causes clear | `active` | Close failed coordinator; remove replacement cause; increment sequence; retain failure history | Old eligibility may return | Proof of noncommit and resumption guards | Ambiguous H-06 outcome, expiry, revoke | H-06 result recovery; H-12 retry |
| any terminal | Exact repeat/status observation | Same authenticated request or safe lookup eligibility; no conflicting fields | same terminal | No state change; optionally record bounded access audit | None | Access/result category only | Competing disclosure attempts | H-12 privacy/rate/response |

## Illegal transition table

| Attempted transition/mutation | Why illegal | Required fail-closed handling |
| --- | --- | --- |
| Any terminal state → `active` | Resurrects ended authority and rewrites history | Reject; require a distinct H-06 Connection if permitted. |
| `revoked` → `suspended` | Downgrades terminal security evidence to recoverable | Retain revoked tombstone; disclose safely. |
| `expired` → `active` | Extends immutable validity after equality/boundary | Retain expired; distinct Connection only. |
| `closed` → `active` | Reverses voluntary terminal closure | Retain closed; new preview/consent/grant. |
| `replaced` → `active` | Creates dual or predecessor authority | Retain replaced; use the successor. |
| `active` in-place organization/workspace change | Tenant scope is immutable; can cross tenants | Reject without mutation; replacement required. |
| `active` in-place owner principal/profile/issuer/subject/target/audience/Agent/Passport change | Violates H-03–H-05 non-substitutability | Reject; replacement with preview/consent. |
| `active` capability widening or version/profile/extension/experiment expansion | Later layers cannot widen H-04 result | Reject; current policy may only narrow; material addition replaces. |
| `suspended` → `active` by a different source, partial cause clearing, operator assertion alone, or weaker proof | Recovery is source-owned and all-cause/same-invariant | Remain suspended; record safe failed recovery evidence. |
| `active` → `replaced` before old suspension or before proven successor commit | Bypasses no-overlap/cutover sequence or creates terminal gap without result | Reject/repair coordinator; never infer successor. |
| Restart with missing/unknown state → `active` | Absence/cache/default is not authority | Mark internal indeterminate; quarantine and recover exact history. |
| Recovery creates a second Connection or assigns a new ID to recovered history | Circumvents H-06 and duplicate-authority guard | Reject; restore one exact record or use separately authorized new grant. |
| Replace old record contents with successor contents | Replacement is a distinct record | Preserve both immutable bundles and links. |
| Credential/grant expiry → Connection expiry without selected Connection expiry trigger | Conflates separate validity domains and retroactively changes H-06 | Deny/suspend as applicable; transition only on Connection-qualified expiry. |
| Policy denial → `revoked` without an enumerated authoritative source | Current policy narrowing is not terminal security evidence | Deny request; no state change unless a separately accepted mapping applies. |
| Internal lock/lease/recovery mode → protocol-visible authority state | Internal coordination does not grant authority | Keep internal; project only the last verified committed state when safe. |

## Scope equality truth table

All request/body scope fields are untrusted consistency claims until the
authenticated principal and authoritative Connection have been loaded.

| Connection organization/workspace | Authenticated/request/child claim | Equality | Recommended result |
| --- | --- | --- | --- |
| organization `A`, any workspace tag | organization `A`, matching workspace case below | Possible | Continue only after authenticated principal is authorized for exact `A`. |
| organization `A`, any workspace tag | organization `B` | No | Deny; no Connection/state disclosure; never use policy hierarchy or alias. |
| organization `A`, workspace absent | organization `A`, workspace absent | Yes | Exact scope match. |
| organization `A`, workspace absent | organization `A`, workspace present `W` | No | Deny; absent is not wildcard and cannot inherit `W`. |
| organization `A`, workspace present `W` | organization `A`, workspace absent | No | Deny; required workspace was omitted. |
| organization `A`, workspace present `W` | organization `A`, workspace present `W` | Yes | Exact scope match. |
| organization `A`, workspace present `W1` | organization `A`, workspace present `W2` | No | Deny even if policy says related or one is a parent. |
| any valid scope | workspace `null` | Invalid, not equal | Reject structural scope; do not coerce to absent. |
| any valid scope | workspace `""` or whitespace-only | Invalid, not equal | Reject; do not omit by truthiness. |
| any valid scope | malformed/overlong/noncanonical organization or workspace | Invalid | Reject before semantic equality; H-10/H-13 later define exact encoding. |
| case-sensitive identifier `OrgA` | `orga` | No unless the selected release defines those exact values equal | Do not locale-fold or deployment-normalize. |
| one validated Unicode identifier | a different byte/code-point spelling | No before an accepted canonical identifier rule | Do not normalize ad hoc; H-10 may define validation/canonical bytes prospectively. |
| authoritative scope `A/W` | body claims `A/W`, authenticated principal authorizes `A/W` | Claim matches | Body still supplies no authority; continue with authoritative values. |
| authoritative scope `A/W` | body claims `A/W`, authenticated principal does not authorize it | No effective match | Deny; a matching body cannot override authenticated scope. |
| authoritative scope `A/W` | body claims different scope but authenticated principal permits both | No | Deny; broad principal permission cannot move this Connection. |
| authoritative scope `A/W` | Task/Result/Receipt/Approval/audit child omits a mandatory binding | Invalid/indeterminate | Fail closed or recover exact inherited binding; never infer from current caller alone. |
| authoritative scope `A/W` | child attempts `A/X` override | No | Reject substitution; retain original object/history. |

## Authentication and Trust consequence matrix

“Conditional” means the selected profile/evidence policy must already define
the Connection-wide threshold; deployment improvisation is insufficient.

| Condition | Deny request | Suspend | Resume | Replace | Revoke | Operator recovery | No state change | Recommended classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Isolated bad proof | Yes | No | No | No | No | No | Yes | H-05 class A; binding otherwise current/uncompromised. |
| Expired request proof | Yes | No | No | No | No | No | Yes | Request-local proof expiry; distinct from credential/Connection expiry. |
| Provider transient failure within permitted freshness | Yes | No | No | No | No | No | Yes | Retry may be considered by H-12 without cached-success fallback. |
| Provider failure beyond freshness / recoverable credential unavailability | Yes | Yes | After same-invariant proof | No | No | Conditional | No | H-05 class B, durable source-owned cause. |
| Same-invariant planned rotation while active | If proof invalid during cutover | No ordinarily | Can clear a prior matching cause | No | No | No | Yes, with safe evidence refresh | H-05 class C; retain old/new evidence; no bound identity change. |
| Principal or credential-subject change | Yes | No | No | Yes | No unless compromise | No | No | H-05 class D; new preview/consent/Connection. |
| Authentication profile or issuer change | Yes | No | No | Yes | No unless revoked/compromised | No | No | No in-place fallback or alias. |
| Target/Agent/Passport/audience change | Yes | No | No | Yes | No unless target compromise/revocation | No | No | Exact target is immutable. |
| Organization/workspace change | Yes | No | No | Yes | No | No | No | Exact tenant is immutable. |
| Authoritative selected credential/binding revocation | Yes | No | No | New Connection only if permitted | Yes | Evidence dispute only | No | H-05 class E terminal for existing Connection. |
| Principal compromise | Yes | No | No | New Connection only after governance permits | Yes | Incident handling, not reactivation | No | Terminal; compromise cannot be reauthenticated away. |
| Stale Trust/revocation evidence | Yes | Conditional/yes when threshold is Connection-wide | After fresh monotonic evidence | No | No | Conditional for checkpoint repair | No | Never interpret stale as active; H-11 controls evidence. |
| Unavailable Trust/revocation evidence | Yes | Conditional/yes beyond bounded availability | After fresh evidence | No | No | Conditional | No | Outage is not success or automatic revocation. |
| Restricted issuer | Yes when current floor/policy disallows use | Conditional if recoverable/Connection-wide | Only if accepted restriction clears without invariant change | Replacement may be needed for new issuer | No automatically | Conditional | Yes when still allowed under stricter narrowing | Restriction narrows; exact mapping needs H-11/H-14. |
| Retired issuer/key for current authorization | Yes | Conditional | Only if retirement policy still permits same-invariant current evidence | Usually required to change issuer/key outside allowed rotation | No automatically | Conditional | No if current use is prohibited | Historical verification is distinct; H-14 support policy applies. |
| Authoritative Agent/Passport/key revocation or compromise | Yes | No | No | New Connection only if safe/governed | Yes | Incident/evidence handling only | No | Terminal for every affected binding. |
| Current policy denial | Yes | No ordinarily | No | Only if desired authority materially changes | No | Policy administration external | Yes | H-02 narrowing decision; not a lifecycle event by itself. |

## Expiry, closure, revocation, and replacement race matrix

| Race/boundary | Serialization rule and outcome | Crash/restart rule | Deferred dependency |
| --- | --- | --- | --- |
| Invocation acceptance vs suspension | Whichever commits first controls new acceptance. Acceptance first binds an in-flight Task; suspension first denies the new Invocation. | Reload Task acceptance and transition sequence; never infer winner from response delivery. | H-09 accepted Task outcome; H-12 response. |
| Acceptance vs expiry equality | Final acceptance uses authoritative time. At `now >= expiresAt`, expiry wins and materializes terminal state; strictly earlier acceptance may commit. | Retain the serialized Task or expired tombstone; no clock-based reversal. | H-10 time encoding/skew; H-09. |
| Acceptance vs closure | First serialized commit wins. Closure after acceptance blocks later Invocations but does not decide accepted work. | Exact close replay returns terminal result; lost acceptance response recovers through idempotency/H-09. | H-09/H-12. |
| Acceptance vs revocation | First serialized commit controls whether a new Invocation exists. Effective-time/retroactivity mechanics remain H-11; already accepted outcome remains H-09. | Retain both ordered evidence; never erase a committed Task. | H-09/H-11/H-12. |
| Acceptance vs replacement | Old-Connection acceptance may commit only before replacement suspension. Once suspended, old denies; successor is evaluated under its own state. | Coordinator plus transition/Task records prove winner. | H-06/H-09. |
| Suspension vs expiry | Suspension never pauses time. At/after equality, `expired` terminally wins. | Restart recomputes/observes immutable boundary but never resumes expired. | H-10/H-12. |
| Closure vs revocation | First serialized terminal state remains primary; later security evidence may be appended without changing authority or erasing the first reason. | Reload terminal sequence and append-only evidence. | H-11 evidence/history; H-12 disclosure. |
| Replacement vs revocation | Revocation of old before successor commit prevents old resume and requires coordinator decision; affected successor creation must fail if shared compromise applies. After successor commit, old remains non-authorizing; revocation evidence may become primary if it wins finalization. | Coordinator and H-06 exact result prevent dual authority and preserve both reasons/links. | H-11 affected-subject semantics. |
| Replacement crash before new commit | Old remains suspended; recover exact H-06 outcome. If proven no successor committed, retry or guarded old resume is possible. | Never create a second candidate on ambiguity. | H-06 replay/recovery; H-12. |
| Replacement crash after new commit | New is active; old is suspended and can never resume. Recovery finalizes old as replaced or retains a competing earlier terminal reason with successor link. | Exact H-06 replay discovers successor; finalize idempotently. | H-06/H-11. |
| Replacement finalization loss | Same as postcommit crash: one active successor, non-authorizing old, incomplete coordinator requiring finalization. | Restart must finish/repair exact coordinator, not roll back successor. | Storage contract/H-12. |
| Restart at every boundary | Load immutable bundles, transition sequences, coordinator, acceptance/idempotency records, and anti-rollback checkpoints; verify before action. | Missing/partial/rolled-back state is indeterminate and non-authorizing. | H-10/H-11/H-14. |

## Persistence and corruption matrix

| Durable condition | Authority interpretation | Required recovery/handling | May create a new Connection? |
| --- | --- | --- | --- |
| Complete record, journal, checkpoint, evidence, and coordinator | Latest verified committed state controls | Resume that exact state; reevaluate current narrowing evidence | Only through an explicit new H-06 flow when otherwise permitted |
| Missing Connection for a known H-06 committed result | Authority may have existed; absence is not proof of no commit | Fail closed; restore the one exact committed record/result or quarantine | No until exact history is established; never as recovery |
| Unknown ID with no authenticated historical evidence | No authority may be assumed; existence remains private | Return H-12-safe non-disclosure outcome | Only via unrelated valid new grant, never by reusing ID |
| Missing transition record or sequence gap | Latest state cannot be trusted | Quarantine; recover exact journal/checkpoint; retain all surviving evidence | No |
| Stale snapshot behind a valid newer journal | Snapshot is not authoritative | Replay/restore verified journal and checkpoint; detect rather than serve stale active | No |
| Storage rollback/checkpoint regression | Rolled-back state grants no authority | Fail closed, preserve forensic evidence, use H-11-qualified recovery authority | No |
| Immutable referenced evidence unavailable | Historical/authority meaning indeterminate | Deny new use; restore exact immutable evidence or classify/quarantine without invention | Explicit replacement only, never implicit |
| State and immutable evidence mismatch | Neither component can be selected opportunistically | Fail closed; recover exact committed bundle and transition | No |
| Duplicate Connection IDs with different bundles | Identity collision/split authority | Quarantine all colliding records; establish one proven commit or none | No reuse; a later distinct ID requires explicit H-06 |
| Two active replacement-linked Connections | No-dual-authority invariant violated | Immediately fail closed for the affected chain; prove serialization history; terminally classify only with authorized recovery | No third Connection as recovery |
| Partial replacement/coordinator missing | Old/new outcome ambiguous | Resolve exact H-06 result; old remains non-authorizing until repaired; never resume after successor commit | No duplicate successor |
| Corrupt or ambiguous organization/workspace | Scope cannot be safely inferred | Quarantine; no wildcard, null coercion, or Platform backfill | Explicit replacement may be chosen after new consent |
| Corrupt capability/profile/version/authentication bundle | Maximum authority is unknown | Quarantine; restore immutable evidence; do not use live discovery/defaults | Explicit replacement only |
| Malicious/mutating storage adapter return | Commit may have occurred despite verification failure | Reread authoritative storage, compare full expected transaction, fail closed and require operator/storage recovery | No until outcome proven |

Recovery never silently deletes a tombstone, resets a sequence, changes a
terminal reason to recoverable, or treats missing as install eligibility.

## Invocation authorization and acceptance sequence

This is the recommended internal semantic order, not a public error-precedence
or HTTP-status decision.

1. Perform bounded framing, parsing, size/depth, type, and structural validation
   sufficient to process the request safely. Do not perform unbounded work or
   reveal Connection existence.
2. Verify current evidence under the exact selected authentication profile (or
   load enough trusted routing context to select that profile without trusting
   body claims). Deny weaker/fallback proof.
3. Derive the typed owner/caller principal solely from verified evidence.
4. Treat the supplied Connection ID as an untrusted lookup claim and load the
   authoritative durable Connection through a disclosure-safe path.
5. Verify complete record, immutable bundle/evidence identities, transition
   sequence/checkpoint, replacement chain, and storage integrity.
6. Compare principal/owner, target Agent/Passport/resource/audience, exact
   organization/workspace tags/values, protocol release, and every supplied
   inherited field. Body principal/scope/capability cannot override the record.
7. Check state and immutable Connection expiry. Only active proceeds toward a
   new acceptance; status/replay paths remain separately bounded.
8. Verify the exact capability key/version is enabled in the immutable result,
   its selected restrictions are satisfied, and current sources only narrow.
9. Verify current Trust/revocation/freshness/anti-rollback evidence for the
   exact Agent, Passport, issuer, keys, capability evidence, and Connection.
10. Obtain and verify the H-02 structured authorization decision for the exact
    principal, Connection, scope, target, capability/version, operation/action,
    policy revision, time, and validity boundary.
11. Where required, independently verify/consume exact-action Approval under
    H-08/H-10 without merging it with authorization.
12. Check the Invocation deadline under the selected time rules before any new
    acceptance. A transport timeout is not proof that acceptance failed.
13. Resolve Invocation idempotency using an identity that binds at least the
    exact Connection, release/profile, owner principal, target/audience, tagged
    scope, capability/version, operation/action, payload/input contract,
    deadline semantics, authorization/Approval identities, and selected
    authentication context. An exact prior committed acceptance is recovery,
    not a new acceptance; a conflict mutates nothing.
14. Enter the Connection/idempotency acceptance serialization boundary. Reload
    and reverify every raceable item: state/sequence/expiry, suspension and
    terminal triggers, immutable integrity, owner/target/scope, authentication,
    capability narrowing, Trust/revocation, authorization/Approval validity,
    deadline, and idempotency. Atomically commit the one acceptance with durable
    Task/idempotency/audit-intent evidence. Only this commit accepts the new
    Invocation.

H-12 may collapse, reorder the observable representation of, or withhold detail
about internal failures to prevent existence, scope, state, policy, and timing
oracles. It may not weaken the guards or make a later semantic failure appear
to have accepted authority.

## Semantic failure categories

| State/category | Authority may exist? | Retry safe? | Reauthentication appropriate? | Replacement required? | Safe result/status disclosure? | Operator recovery? | New Connection may be created? | H-12 may later call retryable? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active but one request fails | Connection boundary exists; request authority did not | Only exact safe retry under idempotency/profile rules | For authentication-class failures only | Only for material change | Authenticated/scope-bounded | Usually no | Only via explicit material replacement, not retry | Yes for selected transient categories |
| `suspended` recoverable | No current governed authority | Recovery/status retry only; no new Invocation | Yes, when same-invariant and source-owned | If recovery would change an invariant | Safe state/recovery category only | Conditional | Explicit staged replacement may begin | Yes for bounded availability/recovery |
| `expired` | No | Exact status/replay only | No | Distinct Connection required for future use | Safe tombstone/historical result | No ordinarily | Yes through new preview/consent/grant | No for old authority; transport lookup may retry |
| `closed` | No | Exact close/status/replay only | No | Distinct Connection required for future use | Safe tombstone/historical result | No ordinarily | Yes through new preview/consent/grant | No for old authority |
| `revoked` | No | Status/evidence lookup only | No | A distinct Connection only if revocation governance permits | Highly bounded safe tombstone | Evidence dispute/incident only; no reactivation | Conditional, never from old authority | No for old authority |
| `replaced` | No | Status/successor/replay only | No | Already replaced; future change begins from successor | Safe link/status if authorized | Only link/finalization repair | Not from old; use successor | No for old authority |
| Missing authoritative record | Unknown if a known commit exists; otherwise none may be assumed | Lookup/recovery only | No | Not until history classified | Usually collapsed/no existence disclosure | Yes when known history exists | No as recovery | Conditional for storage availability |
| Corrupt/rollback/split-brain | Unknown; fail closed | Diagnosis/exact restore only | No | Not a substitute for recovery | No detailed public disclosure | Yes | No until exact outcome established; later explicit replacement separate | Conditional |
| Isolated bad/expired request proof | Connection may remain active | Yes with a fresh exact proof and safe idempotency | Fresh request proof, not lifecycle rebind | No | Generic authentication failure | No | No reason to create one | Yes/conditional |
| Material owner/profile/target/tenant/capability change | Old Connection may remain active only before staged replacement begins | Mismatched request is not retryable as-is | No in-place | Yes | Generic mismatch without existence leakage | No | Yes through explicit replacement | No as same request |
| Compromise/authoritative revocation | Existing becomes terminal on serialization | No authority retry | No | New Connection only after governance permits | Highly bounded | Incident/evidence handling | Conditional | No |
| State changes after preliminary checks | Depends on final serialization winner | Exact idempotent recovery is safe after winner is known | Only if resulting state permits | Conditional | H-12-safe race outcome | Only on ambiguous durable outcome | Never implicitly | Conditional |

## Focused lifecycle alternatives

These subchoices make the high-level options independently selectable. Rules
already fixed by H-01 through H-06 are constraints, not reopenings.

### Suspension/resumption alternatives

| Alternative | Model | Advantages | Risks/compatibility | Recommendation |
| --- | --- | --- | --- | --- |
| S1 — Request-local denial only | No durable suspension; every temporary condition denies one request | Simple; resembles current code | Cannot represent H-05 Connection-wide recoverable unavailability; restart loses cause | Do not select |
| S2 — Single durable suspension reason | One state/reason and one resumer | Easier storage and UI | A second cause can be overwritten; wrong source may clear another source's denial | Do not select |
| S3 — Durable source-owned cause set | State is suspended while any registered cause remains; each cause has source/evidence/clear guard | Preserves H-05 classes, prevents partial or cross-source resumption, auditable restart | More storage, race, privacy, and stuck-state complexity | Proposal-time recommendation; subsequently accepted |
| S4 — Fully derived external suspension | No transition; current provider/Trust/policy dynamically denies | Always consults current inputs | Split-brain and restart reconstruction; no durable lifecycle history | Do not select |

Regardless of selection, suspension cannot broaden authority, pause expiry,
reactivate terminal state, or itself decide an in-flight Task outcome.

### Reauthentication encoding alternatives

| Alternative | Isolated proof | Recoverable unavailability | Same-invariant rotation | Material change | Compromise/revocation | Compatibility |
| --- | --- | --- | --- | --- | --- | --- |
| R1 — All request-local | Deny | Deny indefinitely | Refresh | In-place mutation | Deny | Conflicts with H-05 suspension/replacement/terminal consequences |
| R2 — All suspend | Suspend | Suspend | Suspend/resume | Suspend/rebind | Suspend | Conflicts with H-05 isolated and terminal classes |
| R3 — H-05 graduated mapping | Deny/no state | Suspend/resume | Preserve or resume with exact invariants | Replacement | Terminal revocation | Required to preserve H-05; recommended encoding |
| R4 — All replace/revoke | Replace/revoke | Replace/revoke | Replace | Replace | Revoke | Overly destructive and changes H-05 availability consequences |

H-07 may select only state encoding and atomic mechanics consistent with R3;
it cannot reopen H-05's five semantic classes.

### Expiry alternatives

| Alternative | Boundary/mutation | Security/availability | Compatibility | Recommendation |
| --- | --- | --- | --- | --- |
| X1 — Mandatory finite Connection lifetime | Immutable finite `expiresAt`; half-open; no extension | Strong universal bound; mass-expiry and clock/provider burden | Legacy Connections lack the field; new mandatory lifetime was not selected by H-01–H-06 | Viable human choice, not recommended |
| X2 — Selected expiry policy | Release/profile/consent explicitly chooses finite or no independent expiry; finite is immutable/half-open | Preserves profile needs without confusing credential/grant expiry | Requires explicit representation and legacy classification | Proposal-time recommendation; subsequently accepted |
| X3 — No Connection expiry | Only closure/revocation/replacement end authority | Simple; avoids clock cutover | Indefinite stale authority and does not suit profiles needing bounded installation | Not recommended |
| X4 — Renewable lease | Finite lease extended by same-invariant renewal | Strong current-evidence pressure | Risks in-place authority extension and outage-driven expiry; substantial new mechanism | Option C only; not recommended |

Every alternative must keep credential expiry and post-commit grant expiry
separate from Connection expiry.

### Closure alternatives

| Alternative | Authority and effect | Risk | Recommendation |
| --- | --- | --- | --- |
| C1 — No closure; use revocation | Every end is security revocation | Destroys voluntary/security distinction and reason semantics | Reject |
| C2 — Owner-only terminal close | Exact authenticated owner closes irreversibly | Target/operator cannot safely retire orphaned authority | Viable but narrow |
| C3 — Enumerated owner/Agent/operator close | Each actor needs exact purpose, scope, authorization, and serialized idempotent request; terminal tombstone | More authorization/disclosure design | Proposal-time recommendation; subsequently accepted |
| C4 — Reversible deactivate/reactivate | Close can return active | Enables resurrection and confuses suspension | Reject |

### Revocation alternatives

| Alternative | Sources | Risk | Recommendation |
| --- | --- | --- | --- |
| V1 — Explicit Connection owner only | Owner request is the sole terminal source | Misses credential, principal, Agent, Passport, and key compromise | Reject |
| V2 — Enumerated authoritative security sources | Explicit Connection revocation plus selected-binding/principal/target Trust compromise or revocation | Requires H-11 source/effective-time registry | Proposal-time recommendation; subsequently accepted |
| V3 — Any Trust or policy denial | Every deny may revoke | Temporary outage/restriction/policy change becomes irreversible | Reject |
| V4 — Dynamic denial, no durable revocation | Current checks deny but record remains active | Restart/rollback can resurrect compromised authority | Reject |

### Persistence/recovery alternatives

| Alternative | Durable model | Corruption/restart | Cost/risk | Recommendation |
| --- | --- | --- | --- | --- |
| P1 — Latest snapshot only | One mutable Connection object | Digest snapshot and reload | Simple but rollback/sequence/replacement races are weak | Do not select alone |
| P2 — Snapshot plus monotonic transition journal/checkpoint | Fast snapshot plus append-only semantic transitions, cause set, coordinator, anti-rollback checkpoint | Verify/replay exact latest state; quarantine gaps/mismatch | Moderate/high storage and recovery tooling | Proposal-time recommendation; subsequently accepted |
| P3 — Event log only | State fully derived from immutable events | Replay all events after restart | Strong history, expensive replay/snapshot governance, split-log risk | Viable if same semantics proven |
| P4 — External coordinator/current systems | Minimal Connection state; provider/database transaction is authority | Reconstruct on restart | Vendor/deployment semantics can become protocol authority | Reject as protocol model |

## Dedicated replacement analysis

Replacement always requires a distinct immutable successor with its own H-06
creation transaction. It never edits the old authority bundle into a new one.

| Model | H-06 compatibility | No dual authority | Authority gap | Crash/restart and replay | Revocation race | Storage/history | Failure rollback | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Fully atomic cutover | Would require old `replaced`, new `active`, link, and new H-06 authority commit in one semantic transaction. That silently adds old-state mutation to H-06 unless a superseding decision approves composition. | Yes | No | One transaction can recover cleanly; exact replay returns successor | Can serialize inside one transaction if H-11 evidence is included | Requires cross-record/grant/coordinator atomic transaction; strongest history | Entire transaction rolls back before commit | Do not recommend under H-07 alone because it would amend accepted H-06 |
| B. Suspend old, create new, finalize old | Preserves H-06 unchanged: old suspension is earlier; H-06 independently creates successor directly active; finalization is later | Yes, because old is non-authorizing before new commit | Yes, from old suspension until successor commit | Coordinator resolves exact H-06 result. Precommit crash leaves old suspended; postcommit crash leaves new active/old non-authorizing; replay returns same successor; finalization is idempotent | Old revocation before commit prevents resume; shared compromise must affect successor through H-11; first terminal reason retained | Requires old transition, coordinator, new H-06 result, and predecessor/successor links | Old may resume only after proven no successor commit and full old eligibility; never after commit | Proposal-time recommendation; subsequently accepted |
| C. New-first overlap | H-06 itself is unchanged | No; both may be active until old finalizes | No | Crash after new commit can preserve two active Connections indefinitely; replay confirms new but not old cutoff | Revocation can hit either while both authorize | Simple successor creation but unsafe cutover history | Old can be ended later, but overlap already occurred | Reject due to unintended dual authority |
| D. Old-first terminal cutover | H-06 itself is unchanged | Yes | Yes, potentially permanent | Old becomes terminal before successor outcome; crash/rejection leaves no resumable authority; replay may later find successor | Revocation of old is mostly redundant; shared compromise still gates successor | Simpler than B but records permanent gap/failure | No old rollback without illegal terminal resurrection | Viable high-assurance choice when permanent gap is acceptable; not recommended for general model |

### Replacement invariants and boundary cases

* A coordinator key identifies one predecessor, one material-change consent/
  preview, one new grant/intent, and at most one successor result.
* No successor candidate ID, lock, adapter result, or response grants authority;
  only its H-06 durable observable commit does.
* Old suspension and coordinator creation are atomic. If either is missing, no
  successor attempt may begin.
* The new Connection's immutable bundle may cite the predecessor/coordinator as
  safe historical context, but the H-06 authority-creation fields and replay
  result remain complete independently.
* Exact replay of the successor grant always returns the same successor ID.
  Replay of the old Connection never redirects an Invocation to the successor.
* A crash before successor commit never proves noncommit by absence alone. The
  exact H-06 outcome must be recovered before retry or old resumption.
* A crash after successor commit permanently forbids old resumption. Missing
  finalization is a repairable non-authorizing coordinator state, not rollback.
* Competing replacements from one predecessor are illegal. A later replacement
  begins from the one committed active successor.
* Revocation, expiry, or closure of the old Connection retains the coordinator
  and any successor link; it does not rewrite or revoke the successor unless
  the authoritative evidence applies to that successor's immutable binding.
* These rules propose storage semantics only. They do not change H-06 or create
  an executable transaction/state-machine artifact.

## Task and Receipt boundary — H-09 remains deferred

H-07 decides whether a **new** Invocation may be accepted under a Connection at
the final serialized acceptance point. It does not decide the lifecycle of work
already durably accepted.

At Invocation acceptance, durable Task/idempotency/history must retain at least:

* Connection ID and immutable authority-bundle/evidence identity;
* Connection state `active` and transition sequence observed at acceptance;
* exact selected release/profile/authentication context;
* owner principal, target Agent/Passport/resource/audience;
* tagged organization/workspace;
* capability key/version and selected restrictions;
* authorization and Approval identities where applicable;
* acceptance time/sequence, deadline semantics, and exact request/idempotency
  identity; and
* the later terminal Connection state/evidence as history without rewriting the
  state at acceptance.

Once the acceptance commit wins, later suspension, expiry, closure, revocation,
or replacement blocks later Invocations but does not automatically cancel,
invalidate, complete, fail, revoke, compensate, or erase the in-flight Task.
Task status/result/Receipt lookup can be a bounded historical operation rather
than a new exercise of Connection authority, but H-09/H-12 must select its
authorization, retention, and disclosure.

H-09 retains all of the following:

* cancellation requester authority and whether a Connection transition requests
  or requires cancellation;
* continuation versus stop after suspension/expiry/closure/revocation/
  replacement;
* cancel/complete/deadline/revocation winner and side-effect handling;
* queued/running/waiting/recovery/compensation and terminal Task transitions;
* Task creation atomicity beyond the H-07 acceptance boundary;
* result representation, retention, expiry, retrieval, and redaction;
* Task/Result/Receipt atomicity and terminal outcome;
* Approval consumption/continuation after a Connection change;
* idempotent replay of an already accepted Invocation and ambiguous responses;
* compensation, late completion, retry, and historical verification; and
* safe behavior for legacy Tasks without the recommended Connection evidence.

No H-07 recommendation claims that a Connection transition determines any of
those H-09 outcomes.

## Security and threat analysis

In the mitigation column, A–D refer to the four high-level options. “B” is the
proposal-time recommendation subsequently accepted as governance; acceptance
does not itself implement a control.

| Threat | Protected asset | Attacker capability | Failure scenario | Proposed mitigation by option | Residual risk | Deferred dependency |
| --- | --- | --- | --- | --- | --- | --- |
| Body-supplied Connection ID substitution | Connection/tenant/capability authority | Modify request body or route ID | Attacker names another Connection and relies on body fields to authorize it | All: treat ID as lookup claim, authenticate first, reload authoritative record, exact-bind request; B: final serialized recheck | Existence/timing oracle; routing may need partial lookup before profile selection | H-10 proof binding; H-12 disclosure/route |
| Stolen Connection reference | Installed authority and status privacy | Read/log/copy opaque ID | Possession alone is accepted without current owner proof | All: reference is never proof; require selected-profile current evidence and full intersection; B: state/sequence check | Compromised legitimate principal can still act within bounds | H-05 profiles; H-10; H-12 |
| Cross-organization Invocation | Tenant data/side effects | Valid principal in another organization | Broad principal or body scope moves a Connection to another organization | All: exact immutable organization equality; B: tagged inheritance and final serialization | Upstream identity mapping errors | H-10 identifier bytes; H-12 privacy |
| Absent workspace treated as wildcard | Workspace isolation | Supply a workspace to an organization-only Connection | Truthiness check accepts any present workspace when stored workspace is absent | A/C/D require explicit equality separately; B directly stores absent tag and rejects present | Legacy records may not distinguish absence | H-10/H-13 schema; migration decision |
| Null/empty workspace confusion | Scope integrity | Send null, empty, whitespace, omitted variants | Different peers coerce variants to absent or another workspace | All: reject null/empty/malformed; B: tagged union and truth-table equality | JSON/schema/library coercion differences | H-10 canonicalization; H-13 openness |
| Capability widening | Least authority and consent | Change live registry/discovery/Platform keys | Key-only Connection uses a newer capability version or removed limitation | All: immutable exact key/version/restrictions; B: direct bundle plus current narrowing only | Referenced evidence availability and registry bugs | H-04 assets; H-10; H-14 registry |
| Version/profile reinterpretation | Historical semantics/anti-downgrade | Restart or deploy new defaults | Projection inserts current package version or selects current profile | All: H-03/H-04 immutable bundle; B: integrity-verified restart and replacement for change | Legacy Connections lack evidence | H-10 manifests; H-14 support/migration |
| Principal substitution | Owner authority | Put another initiating subject in body or replay another proof | Body subject is used instead of authenticated owner | All: derive typed principal from selected-profile proof and exact-compare owner; B: final recheck | Identity-provider account takeover | H-05/H-10; H-12 |
| Target/Agent substitution | Agent/resource authority | Redirect endpoint or alter Agent/Passport/audience | Valid proof/Connection is replayed to another Agent/resource | All: immutable target/audience and request proof; B: exact final binding | Proxy/DNS/TLS confusion | H-10; H-12 transport |
| Stale authentication | Current caller eligibility | Replay old proof/session/cache | Prior success authorizes after proof/session expiry | All: current selected-profile evidence; B: request denial or source-bound suspension; C: lease renewal; D: dynamic check | Clock and revocation-service outages | H-05/H-10/H-11/H-12 |
| Weak-profile fallback | Authentication floor | Trigger provider/profile failure | Implementation falls back from PoP to bearer/`none`/default | All prohibited by H-05; B records exact profile and treats unavailability without fallback | Misclassified profile or broker behavior | H-05 profile registry; H-10 vectors |
| Trust outage interpreted as success | Agent/issuer/Connection integrity | Block Trust/revocation service | Missing current evidence is treated active | A/D need explicit fail-closed external rule; B suspends when Connection-wide; C fails renewal | Availability loss and stuck suspension | H-11 freshness/recovery; H-12 retry |
| Stale Trust metadata | Current issuer/key validity | Replay older signed metadata | Retired/revoked/restricted state is hidden by old valid document | All require anti-rollback/freshness; B persists cause/checkpoint; C renewal checks; D dynamic checks | Distributed equivocation and clock uncertainty | H-11 |
| Compromised credential | Owner authority | Obtain selected credential/key | Attacker produces valid-looking current requests | All require authoritative compromise revocation; B terminal state prevents reauth; C lease cannot renew safely | Detection delay and unknown compromise time | H-11 compromise sequencing; H-12 |
| Compromised Agent/Passport/key | Target identity and Receipt trust | Control target signing/runtime key | Malicious target continues under an active Connection | All require current Trust and authoritative terminal effect; B revokes every affected Connection | Blast-radius mapping and historical Receipt ambiguity | H-11; H-14 incident governance |
| Suspension bypass | Recoverable safety stop | Use another endpoint/cache/instance | One process honors suspension while another sees stale active | B: durable monotonic cause set checked at final commit; A/C/D need equivalent external serialization | Split-brain storage and delayed replication | H-11/checkpoint; future state-machine |
| Terminal-state resurrection | Final authority history | Replay stale snapshot or call recovery | Closed/expired/revoked/replaced record returns active | B: no terminal outgoing transition, checkpoint/journal/tombstone; A protects revoked only; C/D protect their terminals | Operator or storage compromise | H-11 rollback; H-14 retention |
| Restart defaulting to active | Durable authority | Crash/delete state or exploit initialization | Missing state/current cache is treated as active | All should fail closed; B verifies record/journal/evidence; A/C/D otherwise risk recomputation | Availability and manual recovery pressure | H-11; storage contract |
| Storage rollback | State and revocation integrity | Restore older valid database backup | Suspended/terminal state becomes older active | B: monotonic sequence/predecessor digest/anti-rollback checkpoint; C must protect lease; A/D need terminal checkpoint | Checkpoint loss or coordinated rollback | H-11 |
| Split-brain state | Single authority view | Partition writers/regions | Different instances accept different state transitions | B: one logical serialization and monotonic conflict detection; A/C/D also need consensus/CAS | Distributed-system liveness and stale reads | Future normative storage/state machine |
| Two active replacement Connections | No-dual-authority guarantee | Crash/reorder cutover or run concurrent replacements | Old and new both accept work | B: suspend-old before H-06 successor plus unique coordinator; A/D external coordinator weak; C(new-first) vulnerable | Coordinator/storage corruption | H-06 replay; H-11; conformance model |
| Replacement crash | Cutover/history/availability | Crash at any boundary or lose response | Old resumes after new commit or duplicate successor is created | B: coordinator, exact H-06 recovery, old non-authorizing precommit, never resume postcommit; A fully atomic only with H-06 amendment; D old-first permanent gap | Long authority gap and repair availability | H-06/H-12/storage |
| Closure/revocation race | Terminal reason/security history | Send close while revocation arrives | Voluntary close hides compromise or revocation resurrects/rewrites history | B: serialize first terminal reason, append later security evidence without authority change; other options need same ordering | Public reason leakage and effective-time disputes | H-11/H-12 |
| Expiry clock boundary | Time-bounded authority | Exploit skew/equality/replica clocks | Invocation commits at or after expiry | B/C: half-open final serialization and immutable clock profile; A/D need explicit derived boundary | Clock rollback and cross-region disagreement | H-10/H-11/H-12 |
| State change after preliminary authorization | Acceptance authority | Trigger suspension/revocation/close during validation | Task commits after state became non-authorizing | B: final serialized reload/recheck and atomic acceptance; A/C/D need equivalent commit guard | Long external authorization windows | H-08/H-09/H-11/H-12 |
| Idempotency reuse across Connection states | Exactly-once/replay integrity | Reuse key after replacement/scope/principal/state change | Old result is returned or new side effect runs under changed authority | All: bind full identity; B: durable acceptance sequence and old/new distinct namespaces | Retention expiry and ambiguous outcome | GB-017 future requirements; H-09/H-10/H-12 |
| Error/timing oracle | Connection/tenant/policy privacy | Compare code/status/latency across guessed IDs | Attacker distinguishes missing, suspended, revoked, wrong scope, or corrupt | All: authenticate/purpose-bound lookup and public collapse; B retains precise internal causes; H-12 controls timing/errors | Side channels from dependency latency | H-12 |
| Status lookup disclosure | Relationship and replacement history | Query known/stolen IDs | Terminal reason, successor, tenant, or owner is exposed | B: safe status disclosure with exact owner/scope/purpose and minimal tombstone; A fewer states but external stores leak | Authorized insider inference | H-12/H-14 retention |
| Unbounded tombstone retention | Privacy and storage capacity | Generate many Connections or exploit audit data | Indefinite detailed tombstones leak history/exhaust storage | B: minimum secret-free tombstone and bounded H-14 retention while preserving dependencies; all options need quotas | Deletion can harm historical proof | H-14 retention/support; privacy review |
| Malicious storage adapter | Complete state/atomicity | Mutate return, omit write, duplicate IDs, lie about commit | Agent trusts adapter candidate or partial state | B: full durable reread, integrity/journal/checkpoint, fail closed; A/C/D need equivalent verification | Adapter colludes with checkpoint or suppresses reads | Normative storage contract; H-10/H-11 |
| Operator recovery abuse | Immutable/terminal authority | Authorized operator attempts manual repair | Operator widens scope, clears foreign cause, resurrects terminal, or creates successor | B: narrowly scoped recovery authority, two-person/audited policy option, exact restore/quarantine only; A/C/D lack explicit recovery state | Privileged insider and emergency pressure | H-02 operator role; H-10 proof; H-12 audit; H-14 governance |

The accepted model reduces these threats but does not eliminate dependency,
clock, storage, key-custody, privileged-operator, or cross-language risks. No
security mitigation in this table is implemented merely by this record.

## Semantic failure precedence and privacy

The proposed internal precedence is the order in the Invocation acceptance
sequence above: structural and canonicalization failure; current
authentication failure; principal mismatch; authoritative Connection lookup
or integrity failure; owner/target/audience/scope mismatch; state or expiry
failure; immutable capability/version/profile mismatch; Trust failure;
authorization failure; Approval failure; deadline failure; idempotency
conflict; and the final serialized state/authority check. A failure at a later
stage never turns an earlier failure into success. Implementations may perform
independent, side-effect-free checks concurrently only when the observable
result is equivalent to this order and no later check becomes an oracle.

This precedence is internal diagnostic information, not a proposed public
error taxonomy. In particular:

* missing, corrupt, cross-tenant, wrong-owner, suspended, expired, closed,
  revoked, and replaced Connections need not have distinguishable public
  errors;
* authentication must happen before disclosure that a referenced Connection
  exists, except for the minimum routing material that H-12 might permit;
* a retry hint must not imply that suspension, reauthentication, replacement,
  or dependency recovery will succeed;
* a terminal transition or final-check loss always wins over a concurrent
  preliminary success;
* an exact replay of an already committed Invocation is a historical lookup,
  while reuse of its key for a different immutable authority identity is a
  conflict; and
* logs and operator diagnostics may retain precise causes only under the H-12
  audit, redaction, retention, and access rules.

H-12 remains responsible for public status codes, error envelopes, timing and
padding policy, retryability, safe status lookup, logging, and disclosure.
H-07 supplies only the lifecycle facts that such a policy must safely map.

## Compatibility and migration consequences

H-07 is a design decision packet, not a migration plan. Selecting any option
would require later normative and implementation work. The recommendation is
intentionally incompatible with treating today's partial Connection objects,
in-memory caches, or active/revoked views as complete durable authority.

The current historical release identity, `ghostbridge/0.1-draft`, is immutable
under H-03. It must remain exactly identified in history; no migration may
rewrite an old Connection, Invocation, Task, Result, or Receipt to claim a
newer release, profile, capability version, scope, authentication method,
state transition, or evidence that was not actually recorded. Absence of that
evidence is an incompatibility to classify, not permission to synthesize it.

| Surface or installed assumption | Compatibility consequence under the accepted decision | Work that still requires separate authorization |
| --- | --- | --- |
| Historical Connections that lack a complete H-03/H-04/H-05/H-06 authority bundle | They cannot be proven equivalent to a newly conforming active Connection and cannot silently inherit current defaults | Choose a historical disposition; define evidence inspection and operator tooling |
| Current development and production Connections | Deployment must inventory which records were created by which path and which exact evidence each path persisted | Environment-specific rollout, rollback, quarantine, and observation plan |
| Two-state `active`/`revoked` assumptions | Status readers, projections, filters, metrics, and policy code would need all six states and terminal monotonicity | Normative enum/state machine, storage representation, API compatibility policy |
| Native Client Connection cache | A cached ID/status or local selected version/profile cannot be authority; cache invalidation and status freshness need definition | Client API/cache changes, retry behavior, upgrade guidance, tests |
| Native Agent stores and projections | Thin active records and projections that insert `PROTOCOL_VERSION` would be insufficient; complete immutable evidence, journal, cause set, sequence, and terminal history would be required | Store interfaces, durable format, recovery implementation, migration tooling |
| Production transaction adapters | H-06 creation remains unchanged, but Invocation acceptance and replacement coordination require explicit atomic/CAS semantics and commit recovery | Adapter contract, capability detection, transactional implementation and certification |
| Trust records and caches | Issuer/Agent/key/revocation evidence needs exact status, freshness, anti-rollback, and linkage to each affected Connection; a generic active projection is insufficient | H-11 semantics, Trust schema/API changes, cache/recovery policy |
| Platform session and authorization bindings | Exact authenticated principal, organization, workspace, selected profile, and authorization context must remain sealed through final acceptance | H-10 proof and H-12 error/audit rules; Platform implementation changes |
| Organization/workspace representation | Truthiness and optional-string comparisons cannot implement tagged absence; null/empty/omitted variants need deterministic rejection | Schema/canonicalization changes, stored-data classification, compatibility adapters |
| Invocation schema | It currently lacks an authoritative Connection identity/binding adequate for all transports; adding or locating that identity is a future protocol question | H-10 message binding and H-13 schema/open-content decision |
| Capability checks | A live registry key alone cannot replace the immutable selected key/version/restrictions; current policy may narrow but not widen | Capability evidence schema, registry linkage, narrowing rules, vectors |
| Authentication callbacks | A boolean or generic principal without exact selected-profile/evidence semantics cannot establish the recommended binding | H-05 profile-specific implementation, H-10 proofs, freshness and failure contract |
| Unit, integration, and black-box suites | Tests that assume direct two-state creation, current defaults, truthy workspace, or restart reconstruction would encode conflicting behavior | New fixtures/vectors and cross-component/cross-language conformance suite |
| Restart and recovery | Missing collections, missing records, corrupt journals, and stale snapshots cannot default to empty or active; incomplete commit recovery needs durable evidence | Storage contract, checkpoints, repair/quarantine workflow, disaster-recovery tests |
| Errors and public status | More internal states and precise causes increase enumeration and relationship-disclosure risk | H-12 public mapping, timing, retry, logging, and retention design |
| Independent implementations | Hidden Agent/Client conventions are not a protocol; peers need the same canonical state, transition, evidence, scope, time, race, and failure rules | Normative text, machine-readable artifacts, fixtures, vectors, and separate implementations |

### Historical Connection disposition choices

Approval must select a disposition rather than treating all existing records as
automatically conforming. The available choices are deliberately explicit:

| Choice | Authority after migration | Benefit | Cost and risk |
| --- | --- | --- | --- |
| Grandfather as a restricted historical class | Allow only a specifically enumerated, non-widening subset that can be proven from recorded evidence | May preserve limited continuity | Creates a permanent compatibility class and still cannot invent missing scope/version/profile evidence |
| Force replacement | Suspend the old record and use the selected replacement protocol to create a complete successor | Produces complete evidence under current consent | Creates an authority gap, needs user interaction, and cannot guarantee all owners return |
| Status/closure only | Permit authenticated status inspection and voluntary closure but no new Invocation authority | Preserves user cleanup and audit access without guessing authority | Existing integrations stop invoking immediately |
| Operator classification | Authorized operators classify evidence-complete, restricted, or quarantined records using an auditable procedure | Handles heterogeneous deployments | Privileged process is costly and vulnerable to error/abuse; classification cannot create facts |
| Quarantine | Make every unproven record non-authorizing pending inspection or replacement | Strong fail-closed posture | High availability and support impact |
| No governed authority | Preserve raw history but state that pre-migration records have no H-07-governed Invocation authority | Clearest semantic boundary | Broad breaking change |
| Preserve exact historical-release behavior | Keep only behavior that can be attributed to the object's exact recorded historical release, without calling it H-07 authority | Avoids retroactively changing old release semantics | Requires continued legacy isolation/support and cannot supply evidence or guarantees the historical release never recorded |

Every choice preserves the exact historical release and bytes that actually
exist. None may relabel a legacy object as a conforming H-07 Connection,
backfill fabricated consent or Trust evidence, mutate a terminal history, or
authorize scope/capability/profile facts by inference. A mixed disposition is
possible only if its evidence predicates, precedence, audit, and failure rules
are separately approved. This packet does not select or authorize one.

No data conversion, compatibility adapter, dual-read period, rollout,
fallback, feature flag, or rollback procedure is approved here. In particular,
rollback cannot restore an older active snapshot after any later suspension or
terminal transition.

## Future conformance implications

Following human approval of H-07, conformance will need to demonstrate the same
observable result across Agent, Client, Trust, Platform, storage adapters, and
independent implementations. At minimum, future suites must cover:

* every legal transition, including idempotent same-state requests and
  monotonic suspension-cause addition/removal;
* every illegal transition, especially every attempted transition out of a
  terminal state and direct `active` replacement cutover;
* every state's authority result for new Invocation, status/history access,
  reauthentication, resume, closure, replacement, and recovery;
* all organization/workspace equality and inheritance rows, including absent,
  omitted, explicit null, empty string, whitespace, and malformed identifiers;
* capability equality, current-policy narrowing, attempted widening, removed
  keys, version drift, and restriction-set canonicalization;
* selected release/profile mismatch, default injection, downgrade, unsupported
  profile, and weak-profile fallback attempts;
* request-local authentication freshness, owner-principal equality, proof
  binding, target/audience binding, and credential rotation;
* suspension with one and multiple cause owners, partial cause clearance,
  failed/successful resume, and concurrent cause changes;
* reauthentication success, transient unavailability, expired proof,
  principal change, profile change, and compromised-credential revocation;
* expiry immediately before, exactly at, and immediately after the half-open
  boundary under permitted skew/clock sources;
* closure idempotency and close races against expiry, revocation, acceptance,
  and replacement;
* terminal replay, stale snapshots, resurrection attempts, duplicated or
  reordered transition events, and later security-evidence attachment;
* replacement crashes before old suspension, after suspension, before/after
  H-06 commit, before finalization, during response loss, and on exact replay;
* proof that replacement never produces two authorizing Connections, including
  competing coordinators and a permanently incomplete finalization;
* restart from a complete record/journal/checkpoint at each lifecycle state and
  replacement boundary;
* missing record, missing collection, corrupt record, broken digest chain,
  missing checkpoint, partial transaction, and unverifiable adapter result;
* rollback to every earlier active/suspended snapshot and detection of a
  replayed but otherwise valid Trust or state document;
* each state change during Invocation authentication, authorization, Approval,
  dependency lookup, idempotency lookup, and the final acceptance commit;
* cross-organization and cross-workspace requests, absent-workspace wildcard
  attempts, and authenticated/body principal or scope substitution;
* Connection ID, Agent/Passport/resource, audience, capability, version,
  profile, and idempotency body substitution;
* Trust unavailable, stale, rolled back, restricted, retired, and revoked
  evidence, including recovery without weak fallback;
* each approved historical disposition for an object lacking some or all
  immutable authority evidence;
* public error and timing equivalence for sensitive missing/corrupt/
  cross-tenant/non-authorizing cases; and
* cross-language fixtures for tagged scope, time boundaries, canonical
  restrictions, transition ordering, journal/checkpoint verification, request
  identity, and replacement recovery.

Those cases are implications, not tests added by this phase. Later work must
produce normative requirements, schemas, executable state machines, durable
storage contracts, fixtures and vectors, and conformance assertions. It must
also validate at least one separate implementation rather than declaring the
existing Native Agent/Client behavior to be the specification. H-07 approval
alone would not authorize or complete that work.

## Human approval block

Human approval was explicitly provided by rudra on 2026-08-02.

* **Approver:** rudra
* **Approval date:** 2026-08-02
* **Approved option:** Option B — Explicit monotonic lifecycle with recoverable suspension
* **Approved state model:** `active`, `suspended`, `expired`, `closed`, `revoked`, and `replaced`; the final four are terminal
* **Approved authority matrix:** Active is necessary but insufficient; suspended and terminal Connections accept no new Invocation; bounded recovery and historical operations apply as approved
* **Approved immutable binding:** Complete H-04/H-05/H-06 hybrid immutable authority bundle and evidence model
* **Approved scope-equality rules:** Exact tagged organization/workspace equality; absence is distinct from null, empty, malformed, present, hierarchy, and wildcard
* **Approved suspension/resumption model:** Durable, multi-cause, source-owned, reason-bound suspension with complete same-invariant serialized resumption
* **Approved reauthentication model:** Request denial, suspension, same-invariant refresh, replacement, or terminal revocation under the H-05 classification, without fallback
* **Approved expiry model:** Explicit immutable Connection expiry policy; finite where selected; half-open validity; equality expired; no pause or in-place extension
* **Approved closure model:** Authenticated and authorized voluntary terminal, irreversible, serialized, and idempotent closure
* **Approved revocation model:** Enumerated authoritative terminal security revocation with immutable evidence and no recovery to active
* **Approved replacement model:** Suspend old, create the distinct successor through unchanged H-06, then finalize the old as replaced; no active-active overlap and no old resumption after successor commit
* **Approved persistence/recovery model:** Complete immutable bundle, monotonic transition history, checkpoint and replacement coordination; fail closed on missing, corrupt, rolled-back, duplicate, or split-brain state; no implicit Connection creation
* **Approved Invocation acceptance model:** Authoritative reload and complete final serialized intersection committed atomically with Task and idempotency evidence
* **Approved semantic failure precedence:** Stable internal semantic ordering with privacy-sensitive public representation deferred to H-12
* **Approved qualifications:** Every qualification and boundary in this record and the verbatim approval
* **Accepted risks:** Every residual risk listed in this record and the verbatim approval
* **Compatibility impact accepted:** Yes
* **Security impact accepted:** Yes
* **Sign-off/reference:** Explicit human approval supplied by rudra in the Phase 15D.1F independent-review conversation on 2026-08-02
* **Resulting status:** `ACCEPTED`

### Verbatim human approval

<!-- BEGIN VERBATIM H-07 HUMAN APPROVAL -->
I, rudra, approve H-07 on August 2, 2026.

Approved H-07 decision bundle:

1. **High-level option**

   I approve Option B — Explicit monotonic lifecycle with recoverable suspension, together with all qualifications stated below.

2. **Connection state model**

   The protocol-visible Connection states are:

   * `active`;
   * `suspended`;
   * `expired`;
   * `closed`;
   * `revoked`; and
   * `replaced`.

   H-06 creates a Connection directly as `active` at the complete durable and durably observable H-06 authority-creation commit.

   `pending`, `creating`, `reauthenticating`, `recovering`, and `replacing` are not protocol authority states.

   `expired`, `closed`, `revoked`, and `replaced` are terminal. A terminal Connection never returns to `active` or `suspended`.

3. **State authority matrix**

   `active` is necessary but never sufficient for accepting a new Invocation. Current effective authority remains the narrowing intersection required by H-02, including the immutable Connection bounds, current authentication, exact tenant scope, capability eligibility, Trust and revocation evidence, authorization, deployment policy, time, and Approval where applicable.

   A suspended Connection has no authority to accept a new Invocation. It may perform only authenticated, exact-scope, purpose-bound status, same-invariant recovery, closure, revocation, and replacement actions allowed by the accepted H-07 model.

   Terminal Connections have no Connection-governed authority. They may support only safe historical status and lookup of already committed results or accepted work, subject to H-06, H-09, H-12, and applicable retention rules.

   Public discovery remains non-authoritative and does not depend on Connection authority.

4. **Immutable Connection binding**

   I approve the H-04/H-05/H-06 hybrid binding model.

   The Connection must directly retain or immutably reference the exact authority-critical meanings selected at creation, including:

   * Connection identity and H-06 commit identity;
   * owner principal;
   * Host identity where separately required;
   * Agent, Passport, issuer, authentication audience, and resource target;
   * exact organization and workspace scope;
   * exact protocol release and immutable release evidence;
   * selected profiles, facets, conformance claims, and authentication profile;
   * enabled capability keys, versions, restrictions, omissions, limitations, extensions, and experiments;
   * immutable consent, Offer, grant, redemption, and negotiation identities;
   * lifecycle state, transition sequence, suspension causes, terminal evidence, and replacement links; and
   * immutable evidence identities or future H-10-qualified digests.

   Current evidence may narrow eligibility but may never reinterpret or widen the immutable Connection bundle.

   Release, profile, owner, principal, target, audience, tenant, capability ceiling, consent, experiment, extension, limitation, or restriction changes may not occur in place when they are material. They require a distinct replacement Connection with a new preview, consent, and H-06 creation flow.

5. **Organization and workspace scope**

   Organization is required and is compared by exact validated equality.

   Workspace is a tagged value that is either:

   * explicitly absent; or
   * present with exactly one validated, non-empty value.

   Workspace absence is not a wildcard. It is not equivalent to null, empty string, whitespace, a missing validation result, or permission to select a workspace later.

   Exact tenant-scope equality requires:

   * equal organization values;
   * equal workspace presence tags; and
   * when present, equal workspace values.

   Comparison is case-sensitive and performs no locale folding, hierarchy, prefix, alias, deployment-database, or display-name inference.

   Null, empty, whitespace-only, malformed, or ambiguous workspace values are invalid rather than absent.

   Invocation, Task, Result, Receipt, Approval, authorization, and audit evidence inherit the exact Connection scope. A child object's scope is only a consistency claim and can never override, broaden, replace, or fill the Connection scope.

6. **Suspension and resumption**

   Suspension is durable, non-authorizing, multi-cause, source-owned, and reason-bound.

   Each suspension cause must retain:

   * its registered source;
   * safe reason category;
   * evidence identity;
   * first-observed time;
   * transition sequence; and
   * exact clearing guard.

   The Connection remains suspended until every active cause has been cleared by its owning source or an explicitly authorized recovery authority using fresh evidence.

   Resumption requires one serialized recheck of:

   * the complete immutable bundle;
   * every suspension cause;
   * Connection expiry;
   * current authentication;
   * Trust and revocation evidence;
   * exact scope;
   * storage integrity;
   * replacement status; and
   * every other applicable current narrowing input.

   Resumption cannot broaden authority, pause or extend expiry, create a Connection, restore a terminal Connection, or occur after a successor has committed.

7. **Reauthentication consequences**

   I approve the H-05 graduated classification:

   * an isolated malformed, stale, replayed, wrong-body, wrong-operation, or otherwise invalid request proof denies that request without automatically changing Connection state;
   * a transient provider failure within an approved freshness allowance denies the request without cached-success fallback;
   * recoverable Connection-wide authentication or credential unavailability beyond the approved bound durably suspends the Connection;
   * planned same-invariant rotation may preserve or resume the Connection only when profile, issuer, subject, owner principal, Agent, Passport, target, audience, tenant, limitations, and authority bounds remain equal;
   * a material principal, profile, issuer, subject, Agent, Passport, target, audience, organization, workspace, limitation, or authority change requires replacement; and
   * credential, principal, Agent, Passport, or key compromise, or authoritative selected-binding revocation, terminally revokes the existing Connection.

   No weaker-profile, bearer-for-PoP, provider-default, cached-success, broker-failure, adjacent-profile, or `none` fallback is permitted.

8. **Connection expiry**

   The immutable Connection bundle must explicitly record its expiry policy.

   A finite `expiresAt` is required only when the selected release, profile, or consent requires a finite Connection lifetime. Otherwise, the bundle must explicitly record that no independent Connection expiry was selected.

   When finite:

   * `expiresAt` is immutable;
   * validity is half-open;
   * a new Invocation may serialize only while `now < expiresAt`;
   * equality is expired;
   * the authoritative time at the final serialization point controls;
   * suspension does not pause or extend expiry;
   * expiry cannot be extended in place; and
   * the first authoritative observation at or after the boundary produces terminal `expired` evidence and a safe tombstone.

   Grant expiry or revocation after the H-06 commit is not automatically Connection expiry.

9. **Closure**

   Closure is a voluntary terminal transition.

   It may be requested only by an authenticated, exact-scope, authorized owner principal, target Agent authority, or explicitly designated operator authority.

   Closure is serialized against Invocation acceptance, expiry, revocation, suspension, and replacement.

   An exact repeated closure request is idempotent. Conflicting closure information cannot rewrite the first committed terminal history.

   Closure is irreversible and permits only safe terminal status and historical lookup afterward.

10. **Revocation**

    Revocation is a terminal security transition arising only from an enumerated authoritative Connection, authentication, principal-compromise, Agent, Passport, key, or future H-11-qualified revocation source.

    Revocation retains safe source, reason, evidence identity, effective or observed time, transition sequence, and immutable historical binding.

    Revocation is serialized against Invocation acceptance, suspension, expiry, closure, and replacement.

    Current policy denial, Trust staleness, provider outage, issuer restriction, or issuer retirement is not automatically Connection revocation unless a later accepted decision defines that exact authoritative mapping.

    Compromise and authoritative revocation may not be converted into suspension or cleared through reauthentication.

11. **Replacement model**

    I approve the suspend-old, create-new, finalize-old replacement model.

    Replacement requires:

    1. identifying a material change that requires new preview, consent, grant, and a distinct Connection;
    2. durably creating a unique replacement coordinator and a replacement-owned suspension cause on the old Connection before successor creation;
    3. creating the successor through the unchanged H-06 transaction;
    4. resolving every ambiguous successor outcome through exact H-06 replay;
    5. after successor commit, durably linking predecessor, successor, and coordinator and terminally finalizing the old Connection as `replaced`; and
    6. preserving both immutable Connection histories.

    The model must guarantee no active-active overlap.

    A temporary authority gap is accepted.

    Before successor commit, a proven terminal replacement failure may allow the old Connection to resume only when:

    * it is proven that no successor committed;
    * every old invariant remains unchanged;
    * every current guard passes;
    * no other suspension cause remains; and
    * no terminal trigger won.

    After successor commit, the old Connection can never resume, even when finalization or response delivery failed.

    Exact successor-grant replay returns the same successor Connection ID and never creates another successor.

    This replacement model does not amend or move the H-06 authority-creation transaction.

12. **Persistence, restart, corruption, and rollback**

    The authoritative durable model must preserve:

    * the complete immutable Connection bundle;
    * current lifecycle state;
    * a strictly monotonic transition sequence;
    * predecessor state or digest linkage;
    * active suspension causes;
    * terminal evidence;
    * replacement coordinator and predecessor/successor links;
    * integrity and anti-rollback checkpoints; and
    * minimum safe audit and tombstone history.

    Restart loads and verifies the exact committed records. It may not infer active status from missing state, an in-memory cache, current package constants, current discovery, current defaults, or a previous successful request.

    Missing, partial, corrupt, rolled-back, duplicated, split-brain, mismatched, or historically unresolvable state is internally indeterminate and non-authorizing.

    `unknown` and `recovering` are not protocol authority states.

    Operator recovery may only:

    * restore the exact proven committed history;
    * quarantine the Connection;
    * attach a non-authorizing classification; or
    * complete an already proven transition or replacement outcome.

    Recovery may not widen authority, reactivate a terminal Connection, reset transition history, invent evidence, reuse a Connection ID for a different bundle, or implicitly create a new Connection.

13. **Invocation acceptance**

    A supplied Connection ID, principal, scope, capability, version, or other body field is an untrusted claim.

    A new Invocation is accepted only at a final serialized durable commit that:

    * performs bounded structural validation;
    * verifies current selected-profile authentication;
    * derives the principal from verified evidence;
    * loads the authoritative durable Connection;
    * verifies immutable integrity and historical evidence;
    * checks exact owner, target, audience, organization, and workspace binding;
    * checks lifecycle state and expiry;
    * checks the exact enabled capability and applicable restrictions;
    * checks current Trust and revocation evidence;
    * checks authorization and deployment policy;
    * checks Approval where applicable;
    * checks the deadline;
    * checks the complete idempotency identity;
    * rechecks all raceable inputs; and
    * atomically binds acceptance to durable Task and idempotency evidence.

    A preliminary active check, lock, lease, cache, authorization result, successful prior request, or Task candidate does not accept an Invocation.

    If suspension, expiry, closure, revocation, or replacement commits first, the new Invocation is denied. If Invocation acceptance commits first, the accepted work becomes an H-09 concern.

14. **Task, Result, and Receipt boundary**

    H-07 decides whether a new Invocation may be accepted under a Connection.

    H-07 does not decide cancellation, continuation, side-effect completion, terminal Task state, Result representation, Receipt outcome, or Task/Receipt race semantics after durable acceptance.

    Already committed work must retain its exact historical Connection, scope, authority, state-sequence, and acceptance evidence.

    The effect of later suspension, expiry, closure, revocation, or replacement on already accepted work remains deferred to H-09.

15. **Semantic failure precedence and privacy**

    I approve a stable internal semantic validation order while deferring exact public transport representation to H-12.

    Internal records may preserve precise semantic causes, but external responses must be capable of collapsing sensitive distinctions involving:

    * unknown Connection;
    * unauthorized caller;
    * cross-tenant request;
    * wrong scope;
    * non-authorizing state;
    * corrupt or missing durable state;
    * restricted historical evidence; and
    * privacy-sensitive Trust or revocation reasons.

    Status and history disclosure must be authenticated, purpose-bound, exact-scope, and limited to the minimum necessary information.

    H-12 retains authority over routes, HTTP statuses, public error identifiers, messages, details, retry labels, timing defenses, rate limits, and observability representation.

16. **Terminal and race rules**

    State-changing operations and Invocation acceptance must serialize so that one committed outcome controls.

    No terminal state may return to active.

    Closure versus revocation preserves the first committed terminal state while allowing later security evidence to be appended without restoring authority.

    Suspension never pauses expiry.

    Replacement, revocation, closure, and expiry races must preserve ordered immutable evidence and may not erase an already committed Invocation or Task.

17. **Retention and tombstones**

    Terminal tombstones and immutable evidence must be retained for at least:

    * the applicable historical-support period; and
    * the lifetime of every surviving Task, Receipt, replay, audit, or verification dependency.

    H-14 will select exact support, archival, and deletion periods.

    Tombstones must exclude raw grants, reusable credentials, access or refresh tokens, passwords, private keys, session cookies, provider secrets, private policy internals, and unbounded sensitive reason details.

18. **Historical and migration treatment**

    Historical `ghostbridge/0.1-draft` objects retain their original bytes and historical meaning.

    Missing immutable authority, lifecycle, scope, profile, transition, or replacement evidence may not be invented or backfilled.

    Historical Connections may later be:

    * preserved under their exact historical release;
    * restricted;
    * quarantined;
    * limited to status or closure;
    * subjected to operator-assisted classification;
    * denied governed authority; or
    * explicitly replaced through a newly authorized process.

    The exact disposition of each historical class requires separately authorized migration work.

19. **Approved qualifications**

    I approve all qualifications, boundaries, matrices, illegal-transition rules, scope-equality rules, recovery restrictions, replacement restrictions, Task/H-09 deferrals, and no-widening rules recorded in the reviewed H-07 decision packet.

    In particular:

    * H-06 authority creation remains unchanged;
    * H-07 approval alone closes no `GB-*` gap;
    * H-07 approval creates no normative requirement, schema, executable state machine, fixture, vector, conformance case, storage contract, SDK behavior, runtime behavior, Agent behavior, Client behavior, Trust behavior, Platform behavior, migration, deployment, publication, release, or Protocol 1.0 claim;
    * H-08 through H-14 remain separately governed;
    * H-09 retains already accepted Task, Result, cancellation, and Receipt consequences;
    * H-10 retains exact bytes, digests, signatures, encodings, identifier validation, and vectors;
    * H-11 retains revocation sequence, freshness, anti-rollback, effective-time, key-rotation, and historical verification mechanics;
    * H-12 retains transport and public error representation;
    * H-13 retains schema openness and extension evolution;
    * H-14 retains support, retention, independent-evidence, external-review, release, and Protocol 1.0 authority; and
    * future normative and implementation work requires separate authorization.

20. **Accepted residual risks**

    I accept the residual risks recorded in H-07, including:

    * state-machine and transaction defects;
    * transition-journal, checkpoint, and anti-rollback implementation defects;
    * split-brain storage and duplicate-active records;
    * temporary authority gaps during replacement;
    * permanently incomplete replacement finalization;
    * stuck or maliciously induced suspension;
    * source-owner or operator recovery abuse;
    * Trust, authentication, storage, and evidence availability failures;
    * clock and expiry-boundary disagreement before H-10/H-11;
    * privacy and timing oracles before H-12;
    * tombstone retention and deletion tension before H-14;
    * incomplete historical Connection evidence;
    * migration incompatibility;
    * denial-of-service through repeated lifecycle transitions or recovery;
    * current implementation divergence; and
    * unproven cross-language interoperability.

21. **Compatibility impact**

    I accept that H-07 requires substantial future changes to current Agent, Client, Trust, Platform, schema, storage, restart, tenant, capability, authentication, idempotency, and test behavior.

    Current thin active/revoked Connection records are not automatically complete or conformant.

    Current process-local Client caches, truthiness-based workspace handling, current-package version projection, dynamic capability lookup, single early active-state checking, incomplete idempotency binding, and implementation-local Trust and Platform state cannot become protocol law.

    Historical and deployed Connections require an explicit later migration or restricted historical disposition, and no missing evidence may be invented.

22. **Security impact**

    I accept that the approved model strengthens:

    * exact tenant isolation;
    * immutable authority binding;
    * no-widening recovery;
    * compromise finality;
    * restart safety;
    * rollback detection;
    * terminal-state integrity;
    * Invocation race handling;
    * replacement no-overlap guarantees; and
    * historical auditability.

    I also accept that these protections depend on later correctly specified and independently reviewed storage transactions, integrity mechanisms, canonical evidence, revocation freshness, public error privacy, retention policy, conformance assets, and implementations.

23. **Approval boundary**

    This approval records only the H-07 protocol-governance decision.

    It does not authorize normative specification text, schemas, executable state machines, fixtures, vectors, conformance cases, SDK or runtime changes, Agent or Client changes, Trust or Platform changes, storage migrations, deployment, publication, release, closure of a `GB-*` gap, or any Protocol 1.0 claim.

Approved option: Option B — Explicit monotonic lifecycle with recoverable suspension.

Approved state model: `active`, `suspended`, `expired`, `closed`, `revoked`, and `replaced`, with the final four terminal.

Approved authority matrix: active is necessary but insufficient; suspended and terminal states accept no new Invocation; only bounded safe recovery and historical operations are permitted as recorded above.

Approved immutable binding: the complete H-04/H-05/H-06 hybrid immutable authority bundle and evidence model recorded above.

Approved scope-equality rules: exact tagged organization/workspace equality, with absence distinct from null, empty, malformed, present, hierarchy, and wildcard.

Approved suspension/resumption model: durable, multi-cause, source-owned, reason-bound suspension with complete same-invariant serialized resumption.

Approved reauthentication model: request denial, suspension, same-invariant refresh, replacement, or terminal revocation according to the H-05 classification, without fallback.

Approved expiry model: explicit immutable Connection expiry policy; finite expiry where selected; half-open boundary; equality expired; no pause or in-place extension.

Approved closure model: authenticated and authorized voluntary terminal, irreversible, serialized, and idempotent closure.

Approved revocation model: enumerated authoritative terminal security revocation with immutable evidence and no recovery to active.

Approved replacement model: suspend old, create the distinct successor through unchanged H-06, and finalize the old as replaced, with no active-active overlap and no old resumption after successor commit.

Approved persistence/recovery model: complete immutable bundle plus monotonic transition history, checkpoint and replacement coordination; fail closed on missing, corrupt, rolled-back, duplicate, or split-brain state; no implicit Connection creation.

Approved Invocation acceptance model: authoritative reload and full final serialized intersection committed atomically with Task and idempotency evidence.

Approved semantic failure precedence: stable internal semantic ordering with privacy-sensitive public collapse deferred to H-12.

Approved qualifications: all qualifications and boundaries in this statement and the reviewed H-07 packet.

Accepted risks: all residual risks listed in this statement and the reviewed H-07 packet.

Compatibility impact accepted: Yes, as recorded above.

Security impact accepted: Yes, as recorded above.

Sign-off/reference: Explicit human approval supplied by rudra in the Phase 15D.1F independent-review conversation on August 2, 2026.

Resulting status: `ACCEPTED`.
<!-- END VERBATIM H-07 HUMAN APPROVAL -->

### Human approval checklist

Rudra explicitly resolved every item in the verbatim approval above.

* [x] A. Select high-level Option A, B, C, D, or an explicitly specified
  qualified alternative: Option B was selected with every recorded qualification.
* [x] B. Select the complete protocol-visible state set and state meanings.
* [x] C. Select the authority matrix for Invocation, status/history,
  reauthentication, resume, closure, replacement, and recovery.
* [x] D. Select the complete immutable Connection binding and evidence model.
* [x] E. Select organization/workspace representation, equality, inheritance,
  and invalid absent/null/empty behavior.
* [x] F. Select suspension cause ownership, persistence, precedence, clearance,
  and resumption rules.
* [x] G. Select request-local reauthentication outcomes and the boundary
  between denial, suspension, and terminal revocation.
* [x] H. Select whether expiry exists, its source, duration, renewal rule,
  clock/skew rule, boundary, persistence, and terminal effect.
* [x] I. Select closure request authority, idempotency, terminal behavior,
  history, and race precedence.
* [x] J. Select revocation sources, effective time, terminal behavior,
  compromise handling, history, and race precedence.
* [x] K. Select replacement model A, B, C, D, or a fully specified alternative,
  including overlap/gap policy and crash/replay rules: staged Option B was selected.
* [x] L. Select persistence, journal/checkpoint, corruption, rollback,
  split-brain, quarantine, and operator-recovery rules.
* [x] M. Select final Invocation serialization, acceptance identity, failure
  precedence/privacy boundary, historical disposition, compatibility impact,
  accepted residual risks, and all qualifications.
* [x] Confirm that H-06 authority creation remains unchanged.
* [x] Confirm that Task/Result/Receipt consequences remain deferred to H-09.
* [x] Confirm that public errors, retry, status disclosure, and audit remain
  deferred to H-12.
* [x] Confirm that schema openness and extension behavior remain deferred to
  H-13.
* [x] Confirm that retention, registry, release, and support policy remain
  deferred to H-14.
* [x] Select the approved legacy-Connection disposition boundary:
  * missing evidence must never be invented;
  * historical objects preserve their exact historical meaning;
  * exact class-specific migration treatment remains separately authorized;
    and
  * the accepted possible non-authorizing or replacement dispositions are
    those enumerated in the verbatim approval.
* [x] Accept the documented compatibility and security impacts.
* [x] Record approver identity, approval date, qualifications, accepted risks,
  and durable sign-off/reference.

## Consequences of acceptance

* H-07 is an accepted protocol-governance decision.
* Option B and every approved qualification now govern future H-07-dependent
  normative work.
* Active is necessary but insufficient authority.
* Suspended Connections accept no new Invocation.
* Expired, closed, revoked, and replaced Connections are terminal.
* Exact organization/workspace scope is immutable.
* Material changes require a distinct replacement Connection.
* Replacement uses suspend-old, H-06-create-new, finalize-old with no
  active-active overlap.
* Missing, corrupt, rolled-back, duplicate, split-brain, or unresolved durable
  state fails closed.
* Invocation acceptance requires authoritative reload and final serialized
  revalidation.
* Already committed Task, Result, cancellation, and Receipt consequences remain
  H-09.
* H-10 through H-14 retain their expressly deferred authority.
* H-07 acceptance alone closes no `GB-*` gap.
* Separate authorization is required for normative text, schemas, executable
  state machines, fixtures, vectors, conformance cases, implementation,
  migration, deployment, publication, or release.
* No Protocol 1.0 claim is made.

## Final status

* H-01 is `ACCEPTED`.
* H-02 is `ACCEPTED`.
* H-03 is `ACCEPTED`.
* H-04 is `ACCEPTED`.
* H-05 is `ACCEPTED`.
* H-06 is `ACCEPTED`.
* H-07 is `ACCEPTED`.
* H-08 through H-14 remain deferred.
* Option B and the complete approved H-07 qualifications have protocol-
  governance authority.
* No normative, schema, executable state-machine, fixture, vector, conformance,
  SDK, runtime, Agent, Client, Trust, Platform, storage, test, migration,
  deployment, publication, release, gap-closure, or Protocol 1.0 work is
  authorized by this recording.

**H-07 is ACCEPTED.**
