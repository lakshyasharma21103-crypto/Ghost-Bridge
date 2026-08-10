# H-11 — Revocation, anti-rollback, and historical verification

## Decision ID

`H-11`

## Status

**ACCEPTED**

Rudra explicitly accepted Option B — Anchored contiguous issuer chain with
transactional durable floors — together with the complete corrected Option B
semantics, all 29 human dispositions, all listed residual risks, compatibility
and migration impact, privacy consequences, and security impact. Option B now
has H-11 protocol-governance decision authority.

## Date prepared

2026-08-10

## Approval record

- **Approval date:** 2026-08-10
- **Approver:** Rudra
- **Approved option:** Option B — Anchored contiguous issuer chain with
  transactional durable floors
- **Approval source:** `H-11-human-approval-rudra-2026-08-10.txt`
- **Verified SHA-256:**
  `62C52D94C7C93F7B15595567FE96796A00540CFAF146D066548F69EBDD8D999D`

## Governance boundary

This is an accepted protocol-governance decision. Governance authority is not
normative specification, a schema, executable state machine, fixture, vector,
conformance result, implementation instruction, migration authorization,
deployment instruction, publication, release, or a Protocol 1.0 claim.

The accepted Option B semantics state the approved H-11 governance decision
that separately authorized downstream work must consume. They have no direct
normative, executable, implementation, migration, deployment, conformance,
publication, release, or Protocol 1.0 force. The unselected alternative
sections are retained as decision rationale and have no decision authority.

This record:

- records explicit human acceptance of H-11 Option B from the identified
  durable approval source;
- closes no `GB-*` gap;
- changes no accepted H-01 through H-10 decision;
- creates no normative schema, vector, fixture, or executable state machine;
- changes no Core, Trust, Issuer, Agent, Client, Platform, or storage behavior;
- performs no migration, deployment, publication, or release action; and
- establishes no conformance or Protocol 1.0 claim.

## Decision scope

H-11 establishes the accepted protocol-governance mechanics and historical
meaning of:

- issuer and revocation bootstrap;
- revocation snapshot, status, sequence, checkpoint, and digest-chain rules;
- a restart-safe and rollback-detecting durable verification floor;
- freshness, future-time tolerance, clock rollback, equality boundaries, and
  offline behavior;
- application of revocation to authentication keys, Connections, Approval
  sources, proof-purpose keys, subordinate credentials, and accepted work;
- planned key rotation, overlap, retirement, key-ID immutability, and emergency
  replacement;
- prospective revocation and known or unknown compromise history;
- issuer, root, revocation-source, and Trust-source compromise;
- current authority validity as distinct from historical evidence validity;
- historical Receipt parsing, cryptographic validity, key eligibility,
  revocation/compromise classification, semantic binding, disclosure, and
  non-authority;
- bootstrap, recovery, corruption, backup restore, split brain, and storage
  failure; and
- semantic failure policy and privacy-safe internal classification.

## Out of scope

- Reopening any accepted H-01 through H-10 choice.
- Changing H-10 canonical bytes, profile identifiers, algorithms, domain
  labels, key-purpose assignments, verification ordering, or no-fallback rule.
- HTTP resources, status codes, media types, headers, retry transport, public
  error vocabulary, redaction, and wire delivery, which remain H-12.
- Object openness, unknown fields/enums, extension namespaces, and schema
  evolution, which remain H-13.
- Concrete release support windows, archival service levels, operational
  retention dates, evidence gates, external-review thresholds, publication,
  release, and Protocol 1.0 graduation, which remain H-14.
- Normative schemas, executable state machines, static vectors, malicious
  fixtures, black-box cases, or conformance assets, which remain separately
  authorized D2/P1 work.
- Selecting a database, HSM, quorum system, cloud, transport, or deployment
  topology as protocol law.
- Treating Trust evidence as authorization or creating direct or inherited
  Agent-to-Agent authority.

## Affected gaps and Phase work

| Kind | Identifiers | H-11 relationship |
| --- | --- | --- |
| Primary gaps | `GB-028`–`GB-033`, `GB-047` | Historical Receipt verification, Trust bootstrap, key rotation, revocation documents/freshness, anti-rollback, and security requirements remain incomplete or contradictory |
| Requirements work | `D1-06` | May consume this accepted H-11 decision in separately authorized future Trust/Receipt requirements |
| Machine/schema/vector work | `D2-01`, `D2-02`, `D2-03`, `D2-04` | Would encode separately approved requirements; not authorized by this decision |
| Independent review | `P1-03` | Must later review bootstrap, storage, compromise, recovery, and historical-verification behavior |

Every affected gap remains open.

## Accepted-decision dependency and conflict ledger

Every complete H-01 through H-10 record was inspected. Their accepted options,
qualifications, risks, conflict ledgers, deferred boundaries, and consequences
are binding inputs. H-11 may fill only the mechanics expressly delegated to it.

| Accepted record | Binding H-11 dependency | Conflict H-11 must not introduce |
| --- | --- | --- |
| H-01 | Discovery and preview are non-authoritative; authority begins only at the durable Connection commit; restart uses durable history; replay/revocation and anti-rollback state are durable | Treating discovery, a signed checkpoint, or Trust bootstrap as Connection/action authority; reconstructing authority from fresh discovery after restart |
| H-02 | Authentication, Connection authority, Trust, structured authorization, policy, Approval, and evidence are distinct; effective authority is their intersection; the Agent is the final enforcement point | Treating trusted/recent/revocation evidence as authorization, bypassing the Agent, widening an active Connection, or creating Agent-to-Agent authority |
| H-03 | Release/profile meaning and historical objects are immutable; missing evidence is not invented; unavailable historical evidence is indeterminate rather than interpreted with current defaults | Re-signing, relabeling, backfilling, or interpreting old evidence under a current release/profile/checkpoint rule |
| H-04 | Negotiation is layered monotonic intersection; unknown required items fail; no fallback; the exact stored result is not reinterpreted after restart | Using a current Trust profile or nearby key/profile as fallback; letting a revocation update expand negotiated authority |
| H-05 | Every governed request has current selected-profile evidence; planned same-invariant rotation may preserve a binding; material change requires replacement; compromise or authoritative revocation is terminal for the affected binding and existing Connection | Making compromise/revocation recoverable in place, permitting bearer/weaker/`none` fallback, or changing principal/issuer/target/tenant/profile invariants during rotation |
| H-06 | Redemption, expiry, and authoritative revocation serialize against one grant state; successful commit is never retroactively reinterpreted; partial state fails closed | Moving the redemption commit, reviving a terminal grant, or using later grant revocation to erase a committed Connection |
| H-07 | `active` is necessary but insufficient; suspension blocks new Invocation; revoked Connections are terminal; Invocation acceptance performs a final serialized current-evidence check; missing/rollback/split-brain state fails closed | Reactivating a terminal Connection, treating stale/unavailable evidence as success, or erasing an accepted Task when a later transition occurs |
| H-08 | Approval is exact-action and single-use; Approval-purpose evidence is distinct; available authority may be purpose-specifically revoked; consumed history cannot be restored | Restoring consumed Approval, using ordinary policy denial as revocation, or treating historical Approval proof as present action authority |
| H-09 | Task acceptance and terminal Result history are permanent; Receipt is downstream evidence only; later authority withdrawal may stop remaining work only through the pre-bound stop-trigger model | Rewriting Task/Result outcome, rerunning effects after Receipt failure, making a Receipt authoritative, or silently adding a stop source after acceptance |
| H-10 | Approved profiles, domains, single-purpose key rules, exact key ID plus thumbprint, strict verification order, original-profile history, and no fallback are immutable | Reusing current generic `revocation_signing` as an alias; inventing a crypto domain; trying multiple profiles/serializations; letting cryptographic validity become authorization |

### Explicit conflict dispositions

| Candidate H-11 rule | Conflict | Required disposition in every viable option |
| --- | --- | --- |
| A fresh signed snapshot authorizes an Invocation | H-02/H-07 | Reject; it is one current narrowing input only |
| Historical cryptographic validity restores a Connection or Approval | H-02/H-07/H-08/H-09 | Reject; historical verification never grants current authority |
| Current revocation automatically invalidates every earlier Receipt | H-03/H-09 | Reject; evaluate the relevant historical time and compromise semantics separately |
| Later revocation erases an accepted Task or terminal Result | H-07/H-09 | Reject; retain history and apply only an accepted stop/disclosure/historical classification |
| Rotation silently changes issuer, principal, purpose, audience, target, tenant, profile, or authority ceiling | H-04/H-05/H-07 | Reject; material change requires preview, consent, and replacement |
| Current H-10 profile repairs a legacy proof or checkpoint | H-03/H-10 | Reject; classify legacy evidence without invention or fallback |
| Recovery resets the sequence or deletes terminal evidence | H-06/H-07/H-08/H-09 | Reject; recover the exact proven history or quarantine it |
| Point status and snapshot disagree, so the verifier selects the more convenient answer | H-02/H-07/H-10 | Reject; the selected option must define one authority and fail closed on conflict |
| Release/profile/namespace change creates a fresh floor for an enrolled security authority | H-01/H-03/H-04/H-05/H-10 | Reject; retain one semantic continuity domain, exact original meanings, both prior floors, terminal history, and no fallback/downgrade |
| Snapshot becomes current under metadata/key history that has not passed its durable floor | H-01/H-05/H-07/H-10 | Reject; verify and atomically cross-bind both contiguous heads before current use |
| Within-skew future `generatedAt` grants immediate or retroactive authority | H-05/H-07/H-08/H-09 | Reject; skew admits only a non-authorizing pending candidate and cannot invent an earlier subject fact |
| H-09 terminal commit or signer Receipt timestamp is treated as exact proof-materialization time by default | H-03/H-09/H-10 | Reject; preserve distinct digest-bound time sources and return interval indeterminacy when required |
| Historical verification of an old proof makes the proof usable for current authority | H-02/H-04/H-05/H-07/H-09 | Reject; current proof use, new creation, and historical verification are separate and history has present-authority value `false` |

## Repository evidence inspected

All implementation, historical draft, schema, test, fixture, and Platform
material below is **evidence only**. None automatically becomes protocol law.

### Governance, planning, and accepted decisions

- `docs/protocol/phase-15d-plan.md`, including the canonical H-11 definition,
  D1-06, D2-01 through D2-04, P1-03, and downstream ownership.
- `docs/protocol/normative-specification-gap-analysis.md`, especially
  `GB-028` through `GB-033`, `GB-047`, the contradiction register, the
  implementation-only behavior inventory, and independent-implementation
  blockers.
- `docs/protocol/conformance-architecture.md`, including lifecycle, restart,
  clock, checkpoint, malicious rollback, durability, and independent-vector
  planning.
- `protocol/decisions/README.md` and every accepted H-01 through H-10 record.
- `protocol/threat-model/phase-15c-trust.md` and
  `protocol/threat-model/README.md`.

### Historical `0.1-draft` prose

- `trust-model.md`, `trust-profile.md`, `trust-errors.md`.
- `issuer-discovery.md`, `issuer-identity.md`.
- `key-discovery.md`, `key-lifecycle.md`, `key-rotation.md`.
- `revocation.md`, `revocation-set.md`.
- `execution-receipt.md`, `receipt-proof.md`, `proof-profile.md`.
- `replay-protection.md`, `security-considerations.md`.

### Historical `0.1-draft` schemas

- `revocation-status.schema.json`, `revocation-entry.schema.json`, and
  `revocation-set.schema.json`.
- `issuer-metadata.schema.json`, `key-metadata.schema.json`, and
  `trust-result.schema.json`.
- `execution-receipt.schema.json`, `receipt-proof.schema.json`,
  `proof.schema.json`, and `signed-envelope.schema.json`.
- `passport.schema.json`, `agent-execution-key.schema.json`, and relevant
  timestamp/proof/profile definitions in `common.schema.json`.

### Protocol, Trust, Issuer, Agent, Client, Platform, and persistence

- Protocol Core implementation and declarations in
  `packages/ghostbridge-protocol-core/src/`.
- Trust implementation and declarations in `packages/ghostbridge-trust/src/`.
- Issuer toolkit in `packages/ghostbridge-issuer/src/index.js`.
- Native Client in `packages/ghostbridge-native-client/src/index.js`.
- Native Agent, production-store checks, and local file adapter in
  `packages/ghostbridge-native-agent/src/`.
- Platform adapter in
  `backend/src/services/platformNativeClient.service.js`.
- Platform models `IssuerTrustRecord.js`, `ConnectionTrustRecord.js`, and
  `TrustReplayRecord.js`.

### Tests, fixtures, and conformance planning

- Trust and Issuer unit tests in `packages/ghostbridge-trust/test/` and
  `packages/ghostbridge-issuer/test/`.
- Native Client tests and Native Agent `agent.test.js` and
  `security15c1a.test.js`.
- Platform Native Client and Trust-storage tests under `backend/src/tests/`.
- `packages/ghostbridge-conformance/src/index.js`,
  `scripts/verifyGhostBridgeBlackBoxConformance.mjs`, and
  `scripts/black-box/raw-agent.mjs`.
- Current examples and TypeScript SDK examples where they expose Receipt or
  revocation behavior.

## Repository evidence ledger

### Current behavior

| Surface | Observed behavior | Evidence classification |
| --- | --- | --- |
| Historical issuer discovery | Metadata names a monotonic `metadataSequence`, expiry, root thumbprints, JWKS URI, and revocation URI; prose says the Host persists the highest sequence | Directional historical prose; bootstrap and recovery authority are not complete |
| Native Client metadata | Keeps metadata in a process `Map`; compares the cached minimum sequence; observes sequence/digest through `AntiRollbackStore` | Process-local current behavior; restart loses the floor unless an external store is injected |
| Native Client root verification | Verifies metadata with a key from the metadata-declared JWKS, checks that key's thumbprint is in metadata's self-declared root list, then applies organization policy pins if configured | A configured pin can anchor trust; an allowlisted issuer with an empty pin list remains circularly self-declared |
| Trust `AntiRollbackStore` | A `Map` keyed by `namespace:issuer`; lower sequence and changed same-sequence digest are rejected; optional contiguous and predecessor checks exist | In-memory only; no async/atomic/durable contract, enrollment marker, corruption detection, recovery epoch, or cross-process coordination |
| Trust `RevocationCache` | One latest set per issuer in a `Map`; equality is idempotent only with equal digest; every advance must be `+1` and match predecessor | In-memory cache; eviction/restart loses continuity and subject history |
| Revocation validation | Requires positive sequence, unique subject keys, proof, issuer binding, and exact predecessor when supplied; a non-initial set may be accepted with `allowSignedCheckpoint` | The checkpoint permission has no anchor or recovery semantics and can make a later first-seen set sufficient |
| Freshness | `generatedAt < nextUpdate`; `now > nextUpdate` is stale; the final 20% or 60 seconds is `nearing_expiry`; no skew is applied in this helper | Equality at `nextUpdate` is still accepted, unlike accepted half-open authority validity elsewhere; maximum age and future generation are not bounded here |
| General time validation | Default 60-second skew, configurable up to five minutes; future issuance/not-before uses skew; expiration currently allows skew after expiry | Current code conflicts with accepted H-05's rule that skew never extends expiry and with H-08 half-open equality |
| Issuer revocation production | Issuer sequence and previous set live in object memory; a caller-supplied higher sequence may skip; first previous digest is literal `none` | Restart can reset issuer chain head; skips and the sentinel are not accepted H-10 semantics |
| Key lifecycle | `kid` reuse and changed thumbprint are rejected by the local provider; transition table allows prepublish/active/retiring/retired/suspended/revoked/expired/compromised | Useful evidence; transition authority, durable ordering, overlap time, and distributed consistency are not defined |
| Rotation | Toolkit prepublishes, activates new, moves old to retiring, later retires old; metadata sequence increases | No minimum prepublication/overlap duration, no atomic old/new event, no persistent chain head, and no distributed cache rule |
| Receipt verification | Verifies Passport-authorized execution key, historical key usability, signature, selected bindings/digests, and returns one of four historical strings | Current algorithm uses current JWKS state and one optional entry; it does not require retained historical snapshots or a trustworthy signature-time interval |
| Historical compromise | Known compromised entry returns `indeterminate_due_to_compromise` before compromise time and invalid at/after; unknown time is indeterminate | It never returns valid before a known compromise time, collapses several evidence axes, and uses Receipt completion/issuance as signing time |
| Native Agent current use | Production requires a resolver and accepts only active `fresh`/`nearing_expiry` status; sequence, if present, only needs to be positive | The resolver contract does not require proof, issuer chain, durable floor, predecessor, effective time, or atomic floor/state application |
| Native Agent local revocation | Connection status is stored on the Connection; non-Connection subjects default to active; production declares a durable `revocation` collection but the main path delegates to the resolver | Distributed issuer revocation and local Connection revocation are different, unjoined authorities |
| Native Agent storage | Production demands capable durable adapters; bundled JSON file adapter is explicitly not production eligible | Store capability flags do not define H-11 checkpoint data, rollback resistance, restore behavior, or shared verifier serialization |
| Local file adapter | Writes a complete JSON snapshot to a temporary file, fsyncs the file, and renames it; revocation is a general collection | No digest/journal/generation/external anchor; restoring an older valid file is not detected; directory durability and multi-process exclusion are not established |
| Platform current trust | Re-verifies Passport and fresh snapshot, checks relevant snapshot entries and separate point status, then stores sequence/digest evidence in a sealed binding | Snapshot and point status can disagree; point status has no signed continuity proof in this path |
| Platform continuity helper | `PlatformTrustContinuityStore` rejects lower/equal-different data and requires contiguous advances, but stores records in a process `Map` | Not durable across adapter restart and not shared across nodes |
| Platform SDK floor/cache | Defaults to the same in-memory Trust `AntiRollbackStore` and `RevocationCache`; instances created by one adapter share them | Tests cover new Client instances within one adapter, not loss/restart of the adapter-level Maps |
| Platform durable models | Mongo models retain sequences/freshness and selected trust fields | They do not retain revocation/metadata digests or predecessor, do not provide an atomic highest-floor CAS, and are not wired as the adapter's continuity store |
| Current black-box verifier | Instantiates the official in-memory store, artificially observes a higher sequence, then confirms a lower one is rejected; stale freshness is a direct helper call | Official implementation is the oracle; no process restart, storage rollback, fork, recovery, or independent historical corpus is tested |

### Contradictions and missing semantics

1. Historical prose requires persisted highest sequences, but the default SDK,
   cache, Issuer toolkit, and Platform continuity helper are process memory.
2. The gap analysis describes Platform continuity as durable, while the active
   helper is a `Map`; sealed prior evidence improves per-binding continuity but
   is not a shared durable issuer floor.
3. The revocation schema requires a predecessor for sequence 1 but supplies no
   typed genesis rule; the Issuer emits the unprofiled literal `none`.
4. Trust validation normally requires a predecessor for a non-initial set, but
   `allowSignedCheckpoint` accepts one without defining who anchored it or
   whether this is bootstrap or recovery.
5. The Issuer accepts any higher sequence while the Client/cache/Platform paths
   require strict contiguity.
6. The historical point-status and snapshot schemas have different subject and
   state vocabularies and different proof requirements. Runtime point status is
   not tied to the signed snapshot that Platform also checks.
7. Snapshot absence currently means active in the cache even though coverage,
   historical retention, and proof that the subject was in scope are absent.
8. Freshness equality at `nextUpdate` is currently non-stale, while accepted
   authority expiry rules are half-open and equality-expired.
9. Generic time validation permits post-expiry skew, contrary to accepted H-05;
   snapshot freshness has no skew or maximum-age rule at all.
10. `nearing_expiry` is accepted for Governed operation without a protocol
    definition of its security effect.
11. Current key states come from the latest JWKS. There is no signed, retained,
    contiguous key-history record proving that the same `kid`/thumbprint/purpose
    was eligible at an earlier time.
12. Current generic multi-purpose keys and `revocation_signing` conflict with
    accepted H-10 single-purpose keys and distinct status/snapshot purposes.
13. Rotation overlap is present as a concept and a toolkit flow, but its start,
    duration, serialization, old/new signing boundary, and crash behavior are
    not fixed.
14. A current revoked key is rejected even for historical proof unless the
    caller supplies only a separate entry and current metadata remains
    favorable. A later revocation can therefore collapse history incorrectly.
15. Missing revocation evidence returns `valid_at_issuance`; absence of an entry
    is treated as proof despite no retained historical set or coverage evidence.
16. Known compromise before a Receipt returns indeterminate rather than a
    clearly separated eligible-before-compromise result; execution time,
    terminal time, and actual proof materialization time are collapsed.
17. Receipt `completedAt` or `issuedAt` is used as signing time even though the
    signer itself may be compromised and H-09 permits later materialization.
18. `revocationStateAtExecution` is a self-contained Receipt field and current
    Agent code hard-codes it active; it is a claim, not retained authority proof.
19. Platform rejects both historically invalid and compromise-indeterminate
    Receipts as a generic invalid signature, collapsing cryptographic validity,
    history, and public representation.
20. No current store defines the atomic point at which verified snapshot state
    becomes safe to use or the outcome of a crash between verification, floor
    persistence, cache update, subject-state update, and authorization.
21. No current behavior detects a complete backup restore that rolls the
    snapshot and local floor back together.
22. No current behavior establishes a shared floor for concurrent processes or
    nodes, prevents stale replicas from authorizing, or resolves split brain.
23. No current recovery authority, recovery package, recovery epoch, quarantine
    rule, or bootstrap-versus-recovery distinction exists.
24. Current tests cover local lower/equal-different sequences, one skipped
    sequence, simple freshness, planned rotation, and one happy historical
    Receipt. They do not cover process restart of the floor, backup rollback,
    forked valid signatures, corrupt floor, multi-node concurrency, unknown
    compromise start, or retained historical snapshots.

## Ownership ledger

| Topic | Owner | H-11 boundary |
| --- | --- | --- |
| Current Trust/revocation as one authority gate | H-02/H-07 | H-11 authenticates and orders evidence; it never authorizes by itself |
| Authentication invalidity and terminal compromise consequence | H-05/H-07 | H-11 supplies proof/effective time; it cannot make a terminal binding recoverable |
| Grant/revocation serialization | H-06 | H-11 supplies authoritative revocation evidence; H-06 transaction result is unchanged |
| Approval purpose/source consequence | H-08 | H-11 supplies purpose-specific history; consumed authority is never restored |
| Task/Result and stop-trigger consequence | H-09 | H-11 orders the trigger; it cannot erase acceptance, terminal truth, or effects |
| Bytes, profiles, algorithms, domains, key identity/purpose | H-10 | H-11 consumes the exact accepted profiles and may not add aliases or algorithms |
| Bootstrap, sequences, freshness, floor, recovery, rotation, compromise, historical validity | H-11 | Accepted H-11 human decision recorded here |
| Wire/status/error/redaction/delivery | H-12 | H-11 defines internal semantics only |
| Schema fields/openness/extensions/evolution | H-13 | Future schema work represents accepted semantics |
| Support/retention windows, operations, release evidence, review gates, Protocol 1.0 | H-14 | H-11 defines dependency relationships, not release policy |
| Normative schemas/state machines/vectors/fixtures/cases | D2/P1 | Separate authorization after accepted requirements |

## Terms and non-equivalences

### Current authority validity

Whether a new Connection, Invocation, Approval use, effect checkpoint, or other
present action may proceed after all current H-01 through H-10 gates, including
fresh committed H-11 evidence. It is evaluated at the operation's accepted
serialization boundary. Historical evidence can never supply it.

### Historical evidence validity

A structured assessment of an immutable earlier object using its original
release/profile, bytes, semantic context, key history, and the authoritative
revocation/compromise evidence applicable to one or more historical times. It
does not grant present authority and does not rewrite Task/Result history.

### Snapshot

A signed statement covering a declared revocation namespace at one sequence.
An option must say whether it is a complete authoritative state, a delta, or a
log head; the historical draft's word “snapshot” alone is insufficient.

### Point status

A response about one subject. It is not automatically equivalent to or more
authoritative than a snapshot merely because it is newer, signed, or easier to
query.

### Durable anti-rollback floor

The least trusted continuity state below which a verifier must never accept
current authority. A cache is not a floor. A floor without restore/rollback and
concurrency semantics is incomplete.

### Semantic continuity domain

The non-resettable security history for one enrolled issuer/security authority,
including every linked release-, Trust-profile-, cryptographic-profile-, and
snapshot-namespace-specific representation of that authority. A representation
identifier may change; the independently retained lower bounds, terminal
effects, key identities, and compromise history do not.

### Bootstrap

First enrollment of a previously unknown semantic continuity domain under a
trusted external anchor. A new release, profile, chain, or namespace for an
already enrolled authority is a transition, not bootstrap. Bootstrap is never
“the floor is missing.”

### Recovery

Restoration or reclassification after prior enrollment, state loss,
corruption, rollback, fork, or compromise. Recovery never uses first-seen rules
and never creates authority from absence.

### Signing time, execution time, and verification time

- **H-07 Invocation acceptance time** concerns the serialized authority used to
  accept the Task and establishes neither Result completion nor Receipt-proof
  creation.
- **H-09 terminal Result commit time** concerns the immutable Result/effect
  snapshot. It may be a prerequisite or lower bound for a later Receipt proof,
  but it is not automatically that proof's exact materialization time.
- **Receipt proof materialization time** concerns eligibility of the signing key
  that produced one particular immutable proof.
- **Signer-asserted Receipt `issuedAt`/`completedAt`** is a signed claim, not an
  independent trusted-time source.
- **First trusted observation and retained monotonic audit/checkpoint time** may
  establish ordering or an upper/lower bound when they bind the exact digest;
  they do not inherently establish exact wall time.
- **External trusted-time anchors** may establish an exact time or bounded
  interval only to the extent of their authenticated guarantee.
- **Verification time** concerns the time of the present assessment, current
  freshness, disclosure, and support; it is not proof materialization time.

These times may differ and must not be collapsed into a self-asserted Receipt
timestamp.

### Retirement, revocation, and compromise

Retirement normally prevents new signing but may preserve historical
eligibility. Prospective revocation ends authority at an authoritative time.
Compromise states that adversarial use may have begun at a known time, within a
known interval, or at an unknown time. Their historical consequences differ.

## Decision dimensions

The accepted Option B disposition covers all of these dimensions as one
coherent decision:

1. Trusted bootstrap anchor and first enrollment.
2. Bootstrap/recovery distinction.
3. Snapshot authority and point-status relationship.
4. Namespace granularity and coverage.
5. Sequence start, equality, increment, skip, duplicate, fork, and predecessor.
6. Exact durable floor, subject/key history, and commit point.
7. Store concurrency, restore, rollback, corruption, and split brain.
8. Generated/effective/next-update time, future skew, equality, maximum age,
   and clock rollback.
9. Offline current operation versus offline historical verification.
10. Subject-specific current consequences.
11. Planned rotation and old/new overlap.
12. Known, bounded, and unknown compromise history.
13. Historical Receipt axes and result categories.
14. Semantic failure and quarantine policy.
15. Privacy, interoperability, migration, and operational burden.

## Genuine alternatives

### Option A — Anchored first observation with a bounded local cache

An administrator pins the issuer root, but the first correctly signed snapshot
observed for a namespace becomes the local sequence floor even if it is not
genesis and no separately approved checkpoint digest exists. Thereafter each
Host retains a local durable latest sequence/digest, permits signed sequence
skips, rejects lower or equal-different snapshots, and may use a bounded stale
grace for selected low-risk operation. Historical verification uses the
Receipt, current/archived JWKS where available, and the latest known revocation
entry.

**Security properties.** This blocks ordinary replay after a successful first
observation on one Host, but it is vulnerable to eclipse at enrollment,
divergent first observation, missed intermediate revocations, and full local
state rollback. Root pinning authenticates the issuer, not which of two validly
signed histories is complete.

**Replay/rollback and crash safety.** A correctly durable per-Host record
survives a normal process restart. Restoring an older record and older signed
snapshot together can succeed. A skipped sequence cannot prove what was missed.

**Multi-process/node behavior.** Each process must at least share the local
floor. Independent Hosts may settle on different first sequences or branches;
there is no interoperability rule that reconciles them.

**Bootstrap/recovery.** Bootstrap is operationally simple but weak: pinned root
plus first signed snapshot. Missing state after prior use is difficult to
distinguish from first use and needs an operator marker to avoid accidental
rebootstrap.

**Sequence/chain.** Positive monotonic sequence, equal digest idempotency, lower
rejection, but gaps allowed. Previous digest is checked when the predecessor is
available and otherwise informational.

**Freshness/offline.** A profile may permit a short stale grace. Offline current
operation is possible until the grace ends, improving availability but causing
different effective authority by profile/Host.

**Durable storage.** One issuer/namespace latest record plus optional archived
sets. Atomic write is needed, but independent rollback-resistant anchoring is
not required.

**Corruption/split brain.** Corruption fails closed if detected. A valid older
backup may not be detected. Same-sequence conflict quarantines one Host, while
different higher branches may remain undetected.

**Rotation/compromise.** Planned rotation is accepted from the latest signed
metadata. Missed intermediate state and divergent caches can accept different
old/new keys. Unknown compromise makes affected history indeterminate.

**Historical Receipts.** Can preserve a pre-revocation validity distinction,
but incomplete archived evidence frequently yields indeterminate results and
the latest-known-entry shortcut may overstate validity.

**Privacy/compatibility/operations.** Lowest disclosure and operating cost;
closest to current code; easiest migration. Its weaker bootstrap and rollback
model is the principal reason not to recommend it for Governed authority.

### Option B — Anchored contiguous issuer chain with transactional durable floors

Each enrolled issuer/security authority has one semantic continuity domain
with an explicitly approved bootstrap anchor and one shared linearizable
durable floor. Exact release/profile/namespace representations use explicitly
linked contiguous chains and cannot reset that domain. Revocation snapshots
and issuer-metadata/key authorization use separate contiguous chains that are
atomically cross-bound. A new snapshot is usable only after its proof, exact
predecessors on both chains, time bounds, coverage, key transitions, and
subject effects are verified and its floor plus affected durable state are
atomically committed. Missing/corrupt/rolled-back state is recovery, never
bootstrap. Current authority has no stale grace; offline use is
historical/read-only. Historical verification uses retained immutable evidence
and returns a multi-axis result.

**Security properties.** Strong local replay/rollback protection, deterministic
fork detection, fail-closed restart, exact key/subject history, and clear
separation of current authority from history. Security still depends on the
approved bootstrap anchor, the issuer/revocation keys before detected
compromise, and a storage backend whose rollback-detection claim is real.

**Replay/rollback and crash safety.** Exact `+1` sequencing, predecessor digest,
same-sequence digest equality, atomic compare-and-advance, and an external
store-generation anchor prevent ordinary replay and detect restored backups.
Crash before commit cannot use the new snapshot; crash after commit reloads it.

**Multi-process/node behavior.** All verifiers for one authority domain share a
linearizable floor or a single fenced writer plus linearizable reads. A stale
replica cannot authorize. Partitions fail closed for new current authority.

**Bootstrap/recovery.** First enrollment requires an approved root and exact
genesis or later checkpoint. Enrollment identity is retained outside ordinary
checkpoint state. State loss enters quarantine and requires exact restoration
or a human-approved recovery anchor no lower than an independently retained
floor.

**Sequence/chain.** One issuer-wide coverage model avoids selective subject
feeds. Snapshot and metadata/key chains each begin at sequence 1 and advance by
exact predecessor `+1`; they cross-bind their committed heads. Gaps, forks,
terminal reversal, cross-chain races, and key-ID material change fail.

**Freshness/offline.** Half-open `nextUpdate`; equality stale; future generation
bounded; no expiry-extending skew; a profile maximum lifetime is enforced.
Offline verification of retained historical evidence is allowed, but new
Connection/Invocation authority is not.

**Durable storage.** Semantic-domain identity, linked representation history,
highest snapshot and metadata/key floors, enrollment/recovery epoch, store
generation anchor, current subject effects, terminal subject tombstones, key
ID/thumbprint/purpose history, active suspensions, and required historical
evidence indexes are durable.

**Corruption/split brain.** Missing or corrupt floor, backup-generation
regression, inconsistent subject application, or divergent chain head
quarantines the namespace. No timestamp or unapproved majority chooses a
winner.

**Rotation/compromise.** Rotation is an ordered key-history event: prepublish,
one activation/old-retiring cutover, verification-only overlap, then retirement.
Known and unknown compromise intervals produce distinct historical results.

**Historical Receipts.** Separates structural, original-profile crypto,
historical key eligibility, compromise interval, H-03/H-09 semantic binding,
current disclosure, and present non-authority. Missing evidence is explicit,
never presumed active.

**Privacy/compatibility/operations.** More retained security metadata and a
strong shared store increase cost. It remains implementable without a public
global log and leaks less cross-organization information than Option C.

### Option C — Witnessed transparency log and quorum-consistent checkpoints

Revocation and key events are an append-only public or consortium transparency
log. Verifiers accept signed tree/checkpoint heads only with inclusion and
consistency proofs plus a configured witness quorum. The durable local floor is
the greatest witnessed head. Forked issuer views are detectable through gossip
or witnesses. Historical verification uses log inclusion and consistency
proofs.

**Security properties.** Best equivocation and cross-Host fork detection;
strong global auditability; historical events are naturally retained. Security
depends on witness diversity, log availability, quorum governance, and
anti-collusion assumptions beyond the issuer.

**Replay/rollback and crash safety.** A witnessed higher head prevents local and
issuer rollback. Local loss can recover from witnesses, but only if witness
history and quorum remain available and authenticated.

**Multi-process/node behavior.** Naturally supports many verifiers, but split
view, witness lag, quorum change, and regional partition rules become protocol
semantics. Quorum unavailability blocks current authority.

**Bootstrap/recovery.** Bootstrap pins issuer root, log identity, witness set,
and initial witnessed head. Recovery obtains consistency proofs from the
retained/witnessed floor. Witness-set rotation itself needs governed history.

**Sequence/chain.** An append-only event index/tree replaces a full linear
snapshot chain. Equality and fork behavior follow tree-head and consistency
proof rules rather than only `sequence + previousDigest`.

**Freshness/offline.** Current authority needs a recent witnessed head. Offline
historical verification works well with retained proofs; offline current use is
limited by a witnessed-head freshness lease.

**Durable storage.** Local head, witness/quorum configuration, consistency
proofs, and evidence bundles; less subject-state replay locally but more proof
material.

**Corruption/split brain.** Quorum/gossip detects issuer equivocation. A witness
split or governance dispute can halt all current use. Choosing a quorum after
the fact is unsafe.

**Rotation/compromise.** Key events and compromise intervals are logged and
historically queryable. Emergency response can be slower if quorum publication
is required.

**Historical Receipts.** Strongest portable history where inclusion proof and
log archive survive. A public log may disclose issuer relationships, subject
identifiers, timing, and incident information.

**Privacy/compatibility/operations.** Highest interoperability and disclosure,
largest ecosystem/governance requirement, least compatible with the current
repository, and substantially greater operational complexity.

### Option D — Online authoritative Trust service with short current-validity leases

A Host pins an issuer and an independently operated Trust service. The service
holds the durable sequence/key/revocation state and returns short-lived,
purpose-bound current-status attestations. Hosts do not independently advance a
full snapshot chain for current use; they verify a current attestation and keep
only a lease replay floor. Historical verification queries or exports an
archival evidence package from the service.

**Security properties.** Centralizes difficult storage and recovery, but makes
service availability and compromise a first-class dependency. The Trust
service remains evidence-only under H-02 and cannot issue action authorization.

**Replay/rollback and crash safety.** Short attestation lifetimes bound replay.
The service needs durable anti-rollback internally; Host restart needs a small
lease floor or waits for a new attestation. A compromised service can misstate
status within its authority.

**Multi-process/node behavior.** Simple for Hosts; the service must solve
multi-region consensus, stale replicas, and split brain. Client requests leak
which issuers/subjects are being evaluated.

**Bootstrap/recovery.** Bootstrap pins both issuer and Trust-service identity.
Service recovery is governed centrally; Host state loss causes online
revalidation rather than local chain replay.

**Sequence/chain.** Service-internal model may be contiguous; the portable Host
contract is an attestation epoch/sequence and expiry. Independent
implementations cannot audit missed events without exported history.

**Freshness/offline.** Very strong current freshness while online. No new
current authority when offline after the short lease. Historical offline use
requires a previously exported complete package.

**Durable storage.** Heavy service-side, light Host-side. Service corruption or
tenant mix-up has broad impact.

**Rotation/compromise.** The service can apply emergency state quickly, but
historical conclusions depend on its archived evidence and governance.

**Historical Receipts.** Potentially complete with signed exports; potentially
unverifiable if the service or retention contract disappears. The service
cannot make the Receipt currently authoritative.

**Privacy/compatibility/operations.** Central operational simplicity for small
Hosts, high concentration and metadata-disclosure risk, and a new required
logical participant/dependency not present in current portable SDK behavior.

## Comparative analysis

| Dimension | Option A | Option B | Option C | Option D |
| --- | --- | --- | --- | --- |
| Bootstrap strength | Root pin + first signed observation | Root + explicit exact checkpoint enrollment | Root + log/witness set + witnessed head | Root + Trust-service pin |
| Missed event detection | Weak when gaps allowed | Strong contiguous chain | Strong consistency proofs | Service-dependent |
| Issuer equivocation detection | Local same-sequence only | Per shared authority domain; cross-organization limited | Strong global/witnessed | Service-dependent |
| Restart safety | Durable local latest record | Transactional shared floor + external generation anchor | Local witnessed head recoverable from log | New online lease/service floor |
| Backup rollback | Often undetected | Detected or enters recovery | Detected by witnesses | Service responsibility |
| Offline current authority | Bounded grace possible | No | Only within witnessed lease if selected | Only within short lease |
| Offline historical verification | Partial | Yes with retained bundle | Strong with proofs | Only with exported package |
| Multi-node interoperability | Divergent floors possible | Shared linearizable authority domain | Native global/quorum model | Central service model |
| Historical precision | Moderate/indeterminate | High within retained horizons | Highest if log persists | High if service export persists |
| Privacy | Best | Moderate | Weakest/public metadata risk | Query metadata concentrated at service |
| Compatibility cost | Lowest | High | Very high | High/topology change |
| Operational complexity | Low | Medium-high | Very high | Medium for Hosts, very high for service |
| Main residual risk | Eclipse/state rollback | Bootstrap/storage-anchor compromise | Witness/log governance and privacy | Trust-service compromise/availability |

## Decision — Option B

**ACCEPTED: Option B — Anchored contiguous issuer chain with transactional
durable floors.**

Option B was selected because it directly addresses the restart and divergent
checkpoint failure identified by the repository audit without requiring a new
global transparency ecosystem or making an online Trust service a mandatory
protocol participant. It preserves H-02's authority separation, H-05/H-07
terminal consequences, H-09 historical truth, and H-10's immutable profiles.
It also gives an independent implementation a deterministic store and recovery
contract.

The accepted decision intentionally accepts availability and operational cost:
current governed authority fails closed when freshness, clock, floor, chain, or
storage cannot be established. The decision chose Option B over Option C despite
Option C's stronger cross-organization equivocation detection because of its
privacy and governance cost. It chose Option B over Option D because Option D
adds a mandatory independent Trust-service dependency, and excluded Option A
because first observation and backup rollback remain materially weak.

The complete corrected Option B semantics below and the complete 29-item human
disposition bundle are approved as H-11 protocol-governance authority.

## Complete accepted Option B semantics

Everything in this section is part of the accepted H-11 protocol-governance
decision. It retains the governance boundary above and is not itself normative
or executable authority.

### 1. Trust continuity namespace and authority

1. One **semantic continuity domain** covers the same normalized issuer and
   administrator-approved security authority across protocol releases, Trust
   profiles, cryptographic profiles, snapshot namespace names, and equivalent
   continuity identifiers. Changing any representation identifier never
   permits first-seen enrollment, automatic fresh bootstrap, or a lower floor.
2. Within that domain, the authoritative current revocation source uses an
   exact representation chain keyed by:
   `(normalized issuer identity, exact protocol release, exact Trust profile,
   exact H-10 cryptographic profile, revocation namespace identity)`.
3. Of the two reviewed transition shapes, accepted Option B uses
   **explicitly linked per-release/profile chains** rather than pretending one
   byte-level chain spans incompatible representations. This preserves H-03
   historical meaning and H-10 profile immutability while a domain-level
   continuity envelope prevents reset.
4. The first accepted checkpoint of a new representation chain binds a signed,
   governance-approved transition record naming the semantic continuity
   domain; predecessor release, Trust profile, cryptographic profile, and
   namespace; exact terminal snapshot sequence/digest; exact terminal
   metadata/key-history sequence/digest; new representation and genesis
   checkpoint; transition reason; approver; approval time; and immutable
   sign-off reference. Normal planned transitions use the applicable governance
   process; transitions after loss, fork, compromise, or unproven history use
   recovery and remain non-authorizing until recovery commits.
5. Every independently retained prior snapshot or metadata/key floor remains a
   lower bound across the transition. The transition carries forward every
   surviving terminal subject/key tombstone, immutable `kid` mapping,
   revocation, compromise interval, recovery record, and supported historical
   dependency. A new chain cannot omit or weaken them.
   This is a lineage lower bound, not a numeric comparison between incompatible
   sequence spaces: a successor representation may use local sequence 1 only
   while its committed transition link preserves the exact prior heads. Removing
   that link or treating the new 1 as an empty history is rollback.
6. Upgrade, downgrade, fallback, namespace rename, epoch change, or profile
   substitution cannot reset a sequence as though the authority were new,
   erase a tombstone, reuse a `kid`, select a weaker/nearby profile, or
   rebootstrap from missing state. Unsupported or unavailable predecessor
   history yields denial, historical indeterminacy/unsupported classification,
   or explicit recovery as applicable; it never creates a fresh authority
   floor.
7. H-03 original-release historical meaning and H-04/H-10 no-fallback, exact
   profile, exact bytes, exact purpose, and immutable key-identity rules remain
   binding on both sides of a transition. Linking chains does not reinterpret
   or re-sign an earlier object.
8. The baseline namespace covers all subject types for that issuer. A separate
   per-purpose or per-subject feed is prohibited unless an accepted future
   release explicitly defines non-overlapping coverage and binds all required
   feeds; omission of a feed never means active.
9. A snapshot declares its coverage. Absence of a subject means active only
   when the verifier has a fresh, committed, complete snapshot whose coverage
   includes that exact subject type and namespace and whose retained terminal
   history does not contain an effective terminal state.
10. A point-status response is a convenience projection only. It may support a
   response or targeted refresh only when it binds the exact committed snapshot
   namespace, sequence, snapshot digest, subject, and status under the H-10
   point-status profile. It cannot advance the snapshot floor, override a
   snapshot, or turn unknown into active.
11. Conflict between point status and its bound snapshot is an integrity failure
   and quarantines the response/source; the verifier never selects the more
   permissive value.
12. Trust/revocation evidence narrows current authority. It never supplies
   authentication, Connection authority, authorization, Approval, or Task
   authority.

### 2. Bootstrap model

The accepted bootstrap record contains safe semantic equivalents of:

- semantic continuity-domain identity and proof that it has no prior enrollment;
- normalized issuer identity;
- exact protocol release and Trust profile;
- revocation namespace identity;
- one or more administrator-approved root-key thumbprints and their original
  H-10 identity/profile;
- the exact sequence and H-10 snapshot/checkpoint digest of genesis or a later
  explicitly approved checkpoint;
- the exact issuer-metadata identity/digest authorizing the snapshot key;
- enrollment identity, organization/workspace policy scope, approving human or
  approved governance identity, approval time, and immutable sign-off
  reference; and
- an enrollment generation distinct from recovery generations.

Accepted rules:

1. A remote production/Governed verifier does not use Trust On First Use. A
   first signed snapshot without the exact approved anchor is insufficient.
2. Genesis is sequence 1. A later checkpoint may bootstrap a newly enrolled
   verifier only when the human/admin approval names its exact sequence/digest
   and the full current snapshot proof/key chain resolves to the approved root.
3. The bootstrap floor is durably committed before the issuer can contribute to
   Connection creation or new Invocation authority.
4. The durable enrollment marker and its sign-off identity are stored outside
   an evictable cache and are included in backup/restore and rollback checks.
5. A missing floor for an issuer with any retained enrollment, Connection,
   Task, Receipt, key, audit, or tombstone evidence is **recovery**, not first
   enrollment.
6. If neither a valid new-enrollment record nor complete prior state exists, the
   namespace is quarantined. Current authority is denied; no automatic
   rebootstrap occurs.
7. A root/origin change is a new human review or recovery action. It is never
   accepted merely because new metadata is correctly self-signed.
8. A different release, Trust profile, cryptographic profile, namespace,
   origin alias, or chain identifier for the same enrolled security authority
   is processed by the explicit transition rules in section 1. It cannot prove
   that the semantic continuity domain is new.

### 3. Snapshot, sequence, and chain semantics

| Condition | Accepted meaning | Accepted handling |
| --- | --- | --- |
| Sequence 1 | Genesis only | Previous commitment uses the H-10-defined genesis representation selected in later schema work; never literal unprofiled `none` |
| Sequence `n > 1` | Immediate successor | Must equal committed floor `n-1` plus one and bind its exact H-10 predecessor/checkpoint digest |
| Same sequence, same digest | Idempotent duplicate | No state change; freshness is evaluated from the signed snapshot, not receipt time |
| Same sequence, different digest | Fork/equivocation | Quarantine namespace; retain both proofs; no current authority |
| Sequence lower than floor | Rollback/replay | Reject, alert, retain safe forensic identity; no floor change |
| Sequence higher by more than one | Missing history | Reject for an enrolled namespace; obtain every predecessor or enter approved recovery |
| Correct `+1`, wrong predecessor | Chain substitution/fork | Reject and quarantine |
| Duplicate subject key | Ambiguous snapshot | Reject entire snapshot |
| Two successors to one predecessor | Fork even if one is later/fresher | Quarantine; no timestamp, arrival order, or unapproved majority selects a branch |
| Snapshot status suspended/invalid | Source cannot assert current usable state | Deny current authority and create a source-owned suspension/quarantine condition, not automatic subject revocation |
| Terminal subject later absent/active | Attempted terminal reversal | Reject chain unless an accepted subject-specific rule made the prior state temporary; terminal revocation/compromise never reverses |

The semantic sequence is an unsigned-integer domain with a future normative
upper bound. Overflow has no wrap, reset, epoch inference, or reuse. A new
representation namespace/epoch requires the explicit cross-representation
transition link and retains the prior floor as a semantic-domain lower bound.

Snapshots are complete current-state statements plus retained terminal/history
commitments, not deltas. Later H-13/D2 work decides their representation, but
cannot change the accepted absence and monotonic-terminal semantics.

### 4. Issuer-metadata and key-authorization continuity

Accepted Option B uses model **B: a separate contiguous
issuer-metadata/key-authorization chain atomically cross-bound to the
revocation-snapshot chain**. The two chains have different cadence and H-10
purposes, so keeping their exact bytes and signatures separate avoids
artificial combined reissuance. Cross-binding both committed heads prevents a
metadata race, stale-key authorization, or rollback on either side.

The metadata/key chain is scoped to the same semantic continuity domain and
exact representation as its snapshot chain. It contains a complete ordered
authorization history for roots and operational single-purpose keys, not only
the latest JWKS projection.

| Metadata/key condition | Accepted meaning | Accepted handling |
| --- | --- | --- |
| Sequence 1 | Metadata/key genesis for the initial enrollment, or representation genesis with an approved section 1 transition link | Commit only with the exact bootstrap/transition anchor; never first-seen for an enrolled domain |
| Sequence `m > 1` | Immediate metadata/key successor | Must equal committed metadata floor `m-1` plus one and bind its exact predecessor digest |
| Same sequence, same digest | Idempotent duplicate | No key/root/history change |
| Same sequence, different digest | Metadata/key fork or equivocation | Quarantine the semantic domain; retain both proofs; no current authority |
| Sequence lower than metadata floor | Metadata/key rollback | Reject; retain the higher floor and forensic identity |
| Sequence higher by more than one | Missing security-relevant history | Reject; obtain every predecessor or enter approved recovery |
| Correct `+1`, wrong predecessor | Substituted history/fork | Reject and quarantine |
| Two successors to one predecessor | Fork regardless of arrival time or higher downstream sequence | Quarantine; no automatic branch choice |
| Changed root without approved transition/recovery | Unauthorized authority replacement | Reject and quarantine; a self-signature or higher sequence is insufficient |
| Existing `kid` with changed thumbprint or purpose | Identity/purpose substitution | Reject and quarantine every affected dependency; never allocate the mapping again |

Accepted key/root lifecycle rules for this chain are:

1. Key addition records exact `kid`, H-10 thumbprint, one purpose, issuer,
   validity bounds, lifecycle state, and predecessor. Addition alone confers no
   active use.
2. Prepublication is a committed `prepublished` event. The key cannot create a
   current proof or establish current authority before the later activation
   event and its effective boundary.
3. Activation is an ordered event from an already committed prepublication.
   For a snapshot-signing key, activation and the first snapshot depending on
   that key use the atomic cross-binding rule below.
4. Moving the old key to `retiring` occurs in the same ordered cutover as new
   activation. It prevents new signing at the cutover while retaining eligible
   historical verification.
5. Retirement is a later monotonic event. It never deletes the key bytes,
   identity, purpose, validity interval, cutover, or supported historical
   references.
6. Revocation and compromise are monotonic terminal security events with an
   effective time or compromise interval and authenticated scope. They cannot
   be cleared by later metadata, a representation transition, or omission.
7. Root addition/change/removal requires the approved governance or recovery
   record, binds the prior root and both chain heads, and carries forward all
   surviving subordinate history. Ordinary metadata signing cannot replace its
   own trust anchor.
8. `kid`, thumbprint, and purpose immutability spans the entire semantic
   continuity domain, including every release/profile/namespace transition.

Accepted cross-chain commit rules are:

1. Every snapshot binds the exact metadata/key sequence and digest authorizing
   its signing key. Every metadata/key successor binds the exact latest
   committed snapshot sequence and digest from which it advances.
2. A snapshot cannot become current-authority evidence unless the bound
   metadata/key head already passed its durable floor or both exact successors
   are verified and committed in one linearizable transaction.
3. A metadata-only prepublication may advance while binding the unchanged
   snapshot head, because it creates no active authority. It cannot make a
   pending or stale snapshot current.
4. Activation of a new snapshot key and the first snapshot signed by it are one
   cross-bound transition pair. The old committed root/metadata authority
   verifies the metadata successor; the candidate snapshot verifies under the
   newly authorized exact key; neither head is exposed as current unless the
   pair, subject/key effects, fence, and external generation commit together.
5. A root/key revocation or compromise that affects current snapshot
   verification first durably fences the semantic domain non-authorizing. Any
   paired snapshot/status change and both floors then commit atomically before
   the fence can clear.
6. A later metadata sequence cannot summarize or skip additions, cutovers,
   retirements, revocations, compromises, roots, or identity/purpose mappings.
   Equivalent complete history is proven only by the contiguous predecessor
   chain or an explicitly approved recovery/transition package; a higher
   integer and current JWKS are insufficient.
7. Crash, restart, cache loss, replica reads, rollback detection, and recovery
   load and compare both chain heads and their cross-bindings. A mismatched pair
   is quarantined; neither independently newer head may authorize.

This section selects decision semantics only. H-10 continues to own exact
cryptographic profiles, while H-13/D2 would own any later authorized field and
artifact representation.

### 5. Accepted checkpoint lifecycle table

This table describes decision semantics only. It is not an executable state
machine artifact.

| Semantic condition | Entry event | Current authority | Permitted progress | Exit |
| --- | --- | --- | --- | --- |
| `unenrolled` | No prior evidence and no anchor | None | Obtain human/admin bootstrap approval | Commit exact bootstrap → `current` |
| `current` | Complete committed floor and fresh verified snapshot | May participate only as one H-02/H-07 gate | Idempotent read or verify exact successor | Successor commit remains `current`; time may make `stale` |
| `stale` | `now >= nextUpdate` or maximum age reached | None for new current authority | Fetch exact successor; historical read may continue | Fresh committed successor → `current` |
| `unavailable` | Source/network unavailable before freshness can be renewed | None after current bound; never cached success | Retry under H-12; historical read from retained evidence | Fresh successor → `current` |
| `quarantined` | Fork, rollback, corruption, missing enrolled floor, clock ambiguity, subject/floor mismatch, or unapproved recovery | None | Forensic read; exact restoration or human-approved recovery | Proven restoration/recovery only |
| `recovery_pending` | Authorized recovery package under review | None | Validate anchor, history, generation, and affected evidence | Atomic recovery commit → `current` or remain quarantined |

`unknown`, `recovering`, and cache presence are never authority states.

### 6. Durable anti-rollback store contract

The accepted store model is deployment-neutral but security-specific. For every
semantic continuity domain it retains at least:

1. enrollment record and immutable sign-off identity;
2. stable semantic-domain identity; every exact
   issuer/release/Trust-profile/H-10-profile/namespace representation key; and
   the complete transition lineage binding prior and successor chain heads;
3. highest committed snapshot sequence, snapshot digest, predecessor digest,
   snapshot identity, signed `generatedAt`, signed `nextUpdate`, and proof key ID
   plus thumbprint;
4. highest committed issuer-metadata/key sequence, digest, predecessor digest,
   cross-bound snapshot head, approved root history, and operational-key
   authorization identity needed to reject metadata/JWKS/key-history rollback;
5. store generation and recovery generation, with an anti-rollback anchor
   outside the ordinary restorable snapshot domain;
6. maximum trusted wall-clock observation and clock-health evidence;
7. current temporary subject states and their clearing boundary;
8. terminal subject tombstones, effective times, reason category, replacement
   reference, compromise interval, source sequence, and evidence digest for at
   least every surviving current or historical dependency;
9. immutable `kid` → thumbprint → one H-10 key purpose history, key validity,
   lifecycle cutovers, and source sequence;
10. active source/Connection suspension causes and application progress;
11. evidence/archive references required by supported historical Receipt,
    Task, Approval, and audit horizons; and
12. safe forensic records for rejected fork/rollback/recovery attempts.

The anti-rollback anchor may be a protected monotonic counter, append-only/WORM
control record, independently administered consensus store, or another
qualified mechanism. It is not required to be one product. A normal database
row restored in the same backup as the floor is insufficient by itself.

#### Atomic commit point

1. Bound and parse the candidate safely.
2. Resolve the semantic continuity domain, exact expected release, H-10
   profiles/domains, issuer anchor, key ID/thumbprint/purpose, both current
   committed chain heads, cross-bindings, and any representation-transition
   record.
3. Verify signatures, semantic digests, complete coverage, both sequences and
   predecessors, time, key/root transitions, subject transitions, transition
   linkage, and no fork/reversal/reset.
4. Compute the complete next durable snapshot and metadata/key floors,
   transition lineage, subject/key effects, suspension fencing, and external
   store-generation advance.
5. Perform one linearizable compare-and-advance against the exact old
   generation and both old sequence/digest heads. The commit makes both new
   floors, their cross-binding, and every affected current-state fence
   indivisible.
6. Durably confirm the store and external generation anchor.
7. Only then may the snapshot be used for a current authority decision or
   returned as current success.

If one physical transaction cannot update every affected Connection, the
namespace is first durably fenced non-authorizing in the same floor commit.
Subject/Connection projections are then applied idempotently; no new authority
is admitted until application completes and the fence is cleared through a
second verified commit. A floor may never advance while a stale projection can
still authorize.

#### Crash, restart, concurrency, and restore matrix

| Event | Accepted result |
| --- | --- |
| Crash before floor CAS | Candidate grants no authority; restart loads old floor and re-verifies |
| CAS committed, acknowledgement lost | Reread exact generation/sequence/digest; if equal, treat committed; never submit a competing branch |
| Crash after floor/fence commit before projections | Namespace remains non-authorizing; resume idempotent application |
| Clean restart | Load enrollment, semantic-domain transition lineage, external generation anchor, both cross-bound floors, key/subject state, clock evidence, and application status before use |
| Cache loss | No authority change; repopulate only from durable floor/archive and fresh verified source |
| Store unavailable | Deny current use; apply H-05/H-07 request denial or source-owned suspension; no cached-success fallback |
| Missing floor for enrolled issuer | Quarantine/recovery; never bootstrap |
| Corrupt floor or digest mismatch | Quarantine; preserve safe evidence; no sequence reset |
| Restored backup behind external generation | Detect regression; quarantine; restore exact newer state or approved recovery |
| Backup ahead of external generation / partial restore | Inconsistent; quarantine until exact commit is proven |
| Concurrent exact successor or cross-bound pair | One CAS wins; loser rereads both heads and treats exact equality idempotently |
| Concurrent different successors | At most one local CAS can commit, but both proofs establish attempted equivocation; quarantine and retain both rather than continue on the winner |
| Snapshot head newer than bound metadata/key head, or converse | Inconsistent or partially committed pair; quarantine until the exact atomic commit is proven |
| Release/profile/namespace chain changes without approved predecessor-head link | Continuity reset attempt; quarantine/recovery, never bootstrap |
| Stale read replica | Cannot authorize; current checks require a linearizable read at least at the committed external generation |
| Network partition | Minority/stale domain cannot authorize new work; historical retained reads remain separately disclosure-bound |
| Split brain | Fence all affected branches until one history is proven by pre-approved recovery; no timestamp/arrival-order choice |

### 7. Freshness and time model

Accepted Option B parameters are:

- maximum future issuance/generation skew: **60 seconds**;
- maximum baseline snapshot interval for current Governed authority:
  **5 minutes** from `generatedAt` to `nextUpdate`;
- freshness equality: **stale when `now >= nextUpdate`**;
- no post-expiry or post-`nextUpdate` skew/grace;
- no offline new Governed authority; and
- backward wall-clock movement greater than 60 seconds relative to the durable
  maximum trusted observation causes clock ambiguity and quarantine until a
  trusted clock is restored.

Accepted timestamp meanings:

| Time | Meaning | Boundary |
| --- | --- | --- |
| signed `generatedAt` (`G`) | Issuer's claimed snapshot-commit time | Must not be more than 60 seconds in the verifier's future; must be strictly before `nextUpdate`; it is not independent trusted historical time |
| first trusted local observation (`O`) | Earliest retained trusted-clock observation that binds the exact candidate digest | Establishes that the verifier possessed those bytes no later than `O`; it does not prove issuer signing or subject effect occurred exactly at `O` |
| current activation boundary (`A`) | Trusted time of the successful atomic commit that makes the candidate the active current floor | `A >= max(G, O)` under the baseline and follows a fresh full recheck; no authority exists merely because `G` is within skew |
| `nextUpdate` | Exclusive current-use freshness boundary | `now < nextUpdate` required; equality is stale |
| profile maximum age | Independent cap on stale-but-long-lived issuer claims | `now - generatedAt` must remain below the selected maximum |
| subject `effectiveAt` (`E`) | Issuer's claimed inclusive effect boundary | Current effect cannot begin before both `A` and `E`; an earlier historical effect requires independently retained chain/event or approved compromise evidence and cannot be manufactured by future skew |
| temporary `expiresAt` | Exclusive end of an explicitly temporary suspension only | At equality the suspension may clear only with fresh committed evidence and full H-07 recheck; terminal revocation/compromise never expires |
| key `notBefore` | Inclusive historical/current eligibility start | Future tolerance admits verification only within skew and never creates authority before the authoritative serialization time |
| key `expiresAt` | Exclusive signing/current eligibility end | Equality expired; skew does not extend it |

The verifier uses a trusted wall clock plus a monotonic elapsed-time source
during one process lifetime. It durably retains the maximum trusted wall time.
A monotonic timer cannot bridge restart, and a local clock is not compromise
proof; unsafe/unavailable/rolled-back time fails closed for current authority.

The 60-second allowance tolerates bounded clock disagreement only. The accepted
baseline handles a candidate observed at trusted local time `O` as follows:

1. If `G > O + 60 seconds`, reject it and do not advance either floor.
2. If `O < G <= O + 60 seconds`, cryptographic, chain, metadata/key, and
   coverage checks may run and the exact bytes may be retained as a
   non-authorizing pending candidate. It cannot immediately participate in a
   Connection, Invocation, Approval use, effect, or current Trust result, and
   it cannot advance the active snapshot floor.
3. At or after `G`, re-read trusted time and both durable chain heads, then
   recheck signature/key authorization, predecessor, fork evidence,
   `nextUpdate`, maximum age, subject transitions, application fence, and any
   intervening emergency successor. Only the linearizable commit establishes
   `A` and permits current use. A pending candidate never blocks or displaces a
   valid emergency successor.
4. If `G <= O`, the candidate may proceed directly to the same full recheck and
   commit; its earliest current-use boundary is the commit at `O` or later.
5. A subject effect with `E > A` remains pending until trusted time reaches `E`
   and the committed evidence is still fresh. A claimed `E < A` is applied for
   current narrowing at commit, but does not by itself rewrite history before
   `A`. Earlier historical effect requires a prior committed event/chain
   commitment or approved compromise evidence whose trusted interval supports
   it; otherwise the earlier boundary is indeterminate.
6. For historical analysis, `G` remains a signer assertion, `O` is an
   observation bound, and `A` is the verifier's current-authority boundary.
   Allowed skew does not turn any of them into the exact time a subject event
   or Receipt proof was created.

`nearing_expiry` may remain an operational refresh hint, but it has no weaker
security semantics: the snapshot is either current under all bounds or it is
not. H-12 may expose a safe hint but cannot create grace.

Stale-but-chain-valid snapshots never advance current authority. A
within-skew future candidate follows the pending-and-recheck baseline above;
the verifier may instead reject and refetch as a conservative operational
choice. Neither behavior permits immediate authority before `A`. The explicit
H-11 human approval accepts this baseline.

### 8. Offline behavior

1. Offline parsing and historical verification may use complete retained
   immutable evidence and the original H-10 profile.
2. Offline status/Receipt retrieval remains current authenticated,
   purpose-bound, exact-scope disclosure under H-09/H-12; possession of an
   archive is not disclosure authority.
3. Offline operation cannot create a new production/Governed Connection,
   Invocation, Approval use, or external effect after fresh current revocation
   evidence is unavailable.
4. An already accepted H-09 Task may perform only those remaining steps whose
   accepted profile does not require a fresh stop-source checkpoint. If a
   required checkpoint cannot be verified, it begins no later external effect
   and enters fail-closed recovery; it is not automatically declared revoked.

### 9. Revocation application by subject

| Authoritative subject/effect | Current authority consequence | Historical consequence |
| --- | --- | --- |
| Issuer/root/Trust source compromised | Quarantine issuer; no new Connections/Invocations; affected existing bindings follow H-05/H-07 terminal compromise when scope is established | Evaluate every dependent proof against known/unknown compromise interval and independent anchors |
| Revocation snapshot-signing key compromised | Stop accepting the feed; quarantine; recovery requires approved anchor/source | Earlier snapshots may remain eligible only when signing-time interval is wholly before known compromise and chain evidence is complete |
| Authentication key/credential binding revoked or compromised | Deny current request and terminally revoke affected existing Connection under H-05/H-07; no reauthentication revival | Earlier proofs assessed at their protected proof time; current invalidity does not itself erase accepted Tasks |
| Passport/Agent/execution identity revoked or compromised | No new authority; terminally revoke affected Connection bindings | Receipt/Task history remains; proof/authority classification may be valid, invalid, or indeterminate by time |
| Connection revoked | Terminal H-07 `revoked`; no new Invocation | Earlier accepted Task/Result persists; later stop source applies only under H-09's accepted pre-bound model |
| Install Grant revoked | H-06 serialization decides whether revocation or redemption committed first | A committed Connection is not retroactively erased by later grant revocation |
| Approval-purpose key/principal/issuer/revocable source revoked/compromised | Available affected Approval becomes unusable/terminally revoked as H-08 permits; no consumption | Consumed Approval remains consumed; historical Decision eligibility/proof receives separate classification |
| Other proof-purpose key revoked/compromised | The key and any proof depending on it cannot establish current authority; no proof may be newly created after the effective terminal boundary; no cross-purpose fallback | An already-existing immutable proof is verified under its original H-10 purpose, trusted time interval, retained history, and compromise rules; it may be verified, invalid, indeterminate, or unsupported |
| Retired key | Cannot establish current authority or create a new proof after retirement | An already-existing immutable proof may remain historically verifiable during the historical-support horizon according to its trusted interval and retained history |
| Replaced subject/key | Old authority never transfers automatically to replacement | Preserve predecessor/replacement link; verify each object under its actual identity |
| Suspended subject | Deny current use; H-07 source-owned suspension where Connection-wide | Historical status records interval; clearing does not rewrite what was suspended |

Subordinate effects are explicit, never inferred from name similarity. An issuer
or root compromise affects subordinate evidence because its approved scope says
so; revoking one operational key does not automatically revoke unrelated
single-purpose keys unless the authoritative event declares and proves that
scope.

Three operations remain distinct throughout this record:

1. **Current proof use** asks whether a proof may contribute to a present
   authority intersection. A retired, revoked, or compromised key cannot do so
   after the applicable current boundary.
2. **Proof creation/materialization** is a new signing act. Retirement,
   revocation, or compromise prohibits that act at/after its applicable
   boundary even when the semantic Receipt or Result already exists.
3. **Historical proof verification** evaluates immutable proof bytes that
   already existed. It never creates or accepts present authority; it returns
   `historically_verified`, `historically_verified_with_current_revocation`,
   `historically_invalid`, `historically_indeterminate`, or
   `historically_unsupported` from the original profile, trusted proof-time
   interval, key history, and compromise evidence.

This distinction does not make compromise favorable. A proof interval wholly
at/after known compromise is invalid, an interval crossing the boundary is
indeterminate, and unknown compromise start makes dependent history
indeterminate unless independent evidence proves it outside the affected
scope.

### 10. Revocation and Invocation race

1. The durable snapshot floor/application fence and H-07 Invocation acceptance
   serialize through one shared authority epoch or an equivalent fenced
   protocol.
2. If local application of an effective revocation/compromise commits first,
   the new Invocation is denied.
3. If H-07 acceptance commits first using then-current fresh evidence, the Task
   remains an accepted historical fact. Later evidence cannot delete it or
   restore Approval.
4. A later-discovered event with an earlier `effectiveAt` may classify the
   historical authority state as invalid or indeterminate from that time, but
   it does not rewrite the accepted Task/Result. It may submit the H-09
   pre-bound authority-withdrawal stop trigger for remaining effects.
5. Prospective revocation and compromise are distinct. An ordinary prospective
   revocation should use its actual authoritative commit time; backdating is an
   incident classification and must use the compromise-history rules rather
   than pretending the verifier saw the event earlier.
6. Snapshot publication delay is a residual risk bounded by freshness. A Host
   that accepted under a still-current previous snapshot records that exact
   evidence; history may later show the acceptance occurred after an issuer's
   authoritative effective time without changing the Task facts.

### 11. Key rotation and overlap

Accepted planned-rotation rules:

1. `kid` is semantic-continuity-domain scoped, immutable, case-sensitive, and
   never reused across release/profile/namespace representations.
2. The exact H-10 thumbprint and single key purpose are immutable. A retained
   `kid` with new material, or one thumbprint reused across purposes, is a
   conflict and quarantines affected history/current use.
3. The new key is prepublished under fresh, committed issuer/key history for at
   least one full maximum snapshot interval plus future skew. Under the
   accepted numbers, minimum prepublication is **6 minutes**.
4. Prepublished keys cannot sign or verify as active current keys.
5. One ordered cutover event atomically makes the new key active and the old key
   retiring at sequence `n` and effective time `T`. Both key IDs, thumbprints,
   purpose, issuer, predecessor, and `T` are bound.
6. There is no ordinary dual-signing overlap. At `T`, new signing uses the new
   key; the old key is verification-only for objects whose protected signing
   interval ends before `T`.
7. The old key remains published as retiring for the greatest remaining
   validity of objects it could lawfully have signed plus 60 seconds, subject
   to H-14's longer historical publication/retention requirements. It then
   becomes retired and cannot sign.
8. Use of an old-key proof to establish current authority after `T` is denied
   even if a stale cache still labels it active, and the old key cannot create
   a new proof. Historical verification may classify an already-existing
   earlier proof favorably only with complete history and a trusted interval
   wholly before the applicable cutover/compromise boundary.
9. Rollback to metadata/JWKS that makes the old key active again is rejected by
   the metadata floor and key-history tombstone.
10. Planned rotation preserves an H-05 binding only when issuer, subject,
    principal, profile, purpose, audience/target, Agent/Passport, tenant,
    limitations, and authority ceiling are unchanged and the selected profile
    permits this pre-bound rotation class. Otherwise a replacement Connection
    is required.
11. A compromised old key does not contaminate the new key merely by sequence
    adjacency, but affected objects and bindings follow the declared compromise
    scope and interval.
12. Emergency rotation may omit the prepublication duration only by first
    fencing current authority, publishing authoritative compromise/revocation,
    and completing human-approved recovery. Availability loss is accepted; no
    weaker or old-key fallback occurs.

### 12. Compromise-history model

Every compromise claim has an authenticated source, affected scope, knowledge
quality, and interval. The accepted classifications are:

| Compromise evidence | Current effect | Historical proof interval result |
| --- | --- | --- |
| Prospective revocation at `R` with no compromise assertion | Ineligible at/after `R` | Proof wholly before `R` may remain historically eligible; at/after is ineligible |
| Known compromise start `C` | Immediately terminal/quarantined for affected current binding | Trusted proof interval wholly before `C` may remain eligible; wholly at/after `C` is invalid; interval crossing `C` is indeterminate |
| Bounded possible interval `[C1,C2)` | Current affected binding invalid/quarantined | Before `C1` may remain eligible; at/after `C2` invalid; overlap is indeterminate |
| Unknown compromise start | Current affected binding invalid/quarantined | Every proof depending on that key/source is historically indeterminate unless independently proven outside the affected scope |
| Issuer compromise | No current issuer authority | Apply interval to every subordinate proof whose authority chain depends on the issuer; independently anchored facts may remain separately verifiable |
| Root compromise | Suspend/quarantine issuer and recovery path; no automatic new root | Historical metadata/key authorization depending on the root follows the interval; exact pre-compromise anchors may preserve earlier eligibility |
| Trust-source/service compromise | No current reliance on that source | Historical conclusions that depend solely on the source follow its interval; underlying cryptography and Task/Result facts remain separately classified |

A timestamp asserted only by the compromised signer cannot prove it preceded
compromise. H-07 acceptance, H-09 terminal commit, proof materialization,
signer-asserted Receipt time, first trusted observation, monotonic audit time,
external anchor time, and verification time retain the distinct meanings below.
Where their evidence cannot bound the particular proof on one side of a
compromise boundary, boundary-sensitive history is indeterminate.

### 13. Historical Receipt verification model

Historical Receipt verification returns a structured set of conclusions, not
one overloaded `valid` boolean.

#### Trusted historical time evidence

For one exact immutable Receipt proof digest, accepted verification constructs
the narrowest supported materialization interval from authenticated evidence.
It never substitutes a convenient object timestamp for missing evidence.

| Evidence | What it may establish | What it does not establish by itself |
| --- | --- | --- |
| Durable H-07 Invocation acceptance record | Task acceptance, authority serialization order, and a time bound only to the quality of its bound clock/audit evidence | Result completion or creation time of a later Receipt proof |
| Durable H-09 terminal Result commit | Terminal Result/effect fact and, only when accepted proof-creation semantics require that committed Result as a prerequisite, a materialization lower bound | Exact Receipt proof-materialization time; binding Result bytes alone does not prove the proof was created after commit, and H-09 expressly permits later materialization |
| H-09 commit atomically binding the exact already-created proof digest | Existence of those proof bytes no later than that commit, plus ordering against the Result | Exact wall time unless the commit has an accepted trusted-time guarantee |
| Receipt `issuedAt` or `completedAt` asserted only by its signer | The signer's claimed semantic time, usable as a consistency input | An independently trusted exact, lower, or upper proof-time bound, especially in a compromise dispute |
| First trusted retained observation binding the exact proof digest | An upper bound: the exact proof existed no later than the observation; it may also order the proof against the observing log | When the proof was signed, or whether it existed before an earlier unobserved compromise |
| Retained monotonic audit/checkpoint evidence binding the exact digest or prerequisite | Relative order and, when bracketed by trusted anchors, a bounded interval | Exact wall time without a wall-time anchor; ordering evidence cannot bridge missing restart state by assumption |
| Authenticated external trusted-time anchor binding the exact digest | Exact time or a lower/upper/bounded interval according to the anchor's stated accuracy and inclusion semantics | Authority beyond the anchor's approved scope or reliability guarantee |
| Present verification time | Time of this assessment and, if this is the first retained digest observation, an upper bound | Original proof-materialization time or historical authority |

An **exact materialization time** requires an approved independent time anchor
binding the exact proof digest or an approved atomic creation record whose
trusted-time semantics establish that exact boundary. A **lower bound** may
come from a prerequisite event the accepted creation semantics require the
proof to postdate, such as committed H-09 terminal Result or key activation.
An **upper bound** may come from the first trusted append/observation that binds
the exact proof digest. A
trusted source may define a closed or open edge: `[L,U]`, `(L,U]`, `[L,U)`, or
`(L,U)` is preserved exactly rather than rounded to a point. If either required
edge is unavailable, sources disagree, restart breaks the ordering chain, or
the resulting interval crosses a revocation/compromise boundary, the relevant
time result is indeterminate.

H-09 terminal commit is therefore not automatically the Receipt proof time. If
the proof was materialized later, the terminal event normally supplies only a
lower bound; if the exact proof digest was already atomically included, it may
also supply an upper ordering bound, but wall-time precision still depends on
the commit's trusted-time guarantee. No timestamp asserted solely by the
potentially compromised proof key can resolve a compromise-boundary dispute.

At minimum the verification result distinguishes:

| Axis | Question | Example outcomes |
| --- | --- | --- |
| Structural | Can the original object be boundedly parsed without repair? | parseable / malformed / unsupported container |
| Original context | Are exact H-03 release, schema/artifact identity, semantic projection, and H-10 profile known? | resolved / legacy-ambiguous / unsupported history |
| Cryptographic | Does the exact signature verify under the original immutable profile/bytes/domain/purpose? | valid / invalid / indeterminate bytes |
| Key identity | Do exact `kid`, thumbprint, single purpose, issuer chain, and Passport authorization match? | matched / substituted / missing history |
| Proof materialization time | Was the signing key eligible when this particular Receipt proof was produced? | eligible / ineligible / interval-indeterminate |
| Execution/terminal authority history | What current gates and revocation/compromise evidence applied at H-07 acceptance and H-09 checkpoints? | eligible / later-known-invalid / indeterminate |
| Semantic binding | Does Receipt bind the immutable H-03 release and H-09 Task/Result/effect snapshot? | bound / mismatch / missing terminal evidence |
| Historical revocation/compromise | Did an effective event precede, intersect, or follow the relevant trusted interval? | unaffected / invalid / indeterminate |
| Current retrievability/disclosure | May this caller retrieve the retained Receipt/evidence now? | allowed / denied / minimized / unavailable |
| Present authority | May the result authorize a new Connection/Invocation/Approval/effect? | always **no** |

Accepted aggregate historical classifications are:

- `historically_verified`: original context, cryptography, key eligibility,
  semantic binding, and relevant history are complete and favorable;
- `historically_verified_with_current_revocation`: the evidence was valid at
  the relevant historical times but the key/subject is not valid for current
  authority;
- `historically_invalid`: a definitive signature, binding, eligibility, or
  effective-time failure exists;
- `historically_indeterminate`: required bytes, trusted time, key history,
  snapshot coverage, compromise interval, terminal evidence, or chain evidence
  is incomplete or crosses an uncertainty interval; and
- `historically_unsupported`: the original immutable profile/release is known
  but the verifier does not support it under the applicable H-14 window.

These names are accepted governance vocabulary, not schema enum values.

Additional accepted rules:

1. A current revocation does not by itself invalidate a Receipt whose trusted
   signing and authority intervals ended before a prospective revocation.
2. A later known compromise may make earlier evidence invalid or indeterminate
   according to the interval table; it does not change Receipt bytes or
   Task/Result facts.
3. `revocationStateAtExecution` is a signed claim and consistency field, not
   sufficient historical evidence.
4. Receipt `issuedAt`/`completedAt` alone is not proof materialization time.
5. H-09 permits later materialization. Each proof has its own key/time
   eligibility. A new proof under a rotated active key may reference the same
   immutable semantic Receipt only as an additional proof record; it never
   overwrites or repairs the old proof and never reruns execution.
6. A retired key may verify an earlier eligible proof; it may not create a new
   proof after retirement.
7. Missing historical revocation entry never means `valid_at_issuance` unless a
   complete retained snapshot/coverage chain proves absence for the relevant
   interval.
8. Current retrieval/disclosure denial or content minimization does not make the
   Task/Result false. It may make verification unavailable or indeterminate.
9. Successful historical verification never restores current Connection,
   Approval, authentication, authorization, or Invocation authority.

### 14. Recovery model

Permitted recovery outcomes are deliberately narrow:

1. Restore the exact proven semantic-domain identity, transition lineage, both
   cross-bound committed floors, generation anchor, subject/key history, and
   application state from a verified replica/archive.
2. If exact restoration is impossible, obtain a human/admin-approved recovery
   record naming the semantic domain and every affected representation, cause,
   last independently retained snapshot and metadata/key heads, exact new
   cross-bound sequences/digests, root and recovery evidence, transition
   lineage, affected history classification, recovery generation, approver,
   date, and sign-off.
3. Neither new head is lower than any independently retained trusted floor in
   the semantic domain. If histories fork, recovery explicitly
   selects/classifies one branch and records the rejected branch; it never
   pretends no fork occurred.
4. Recovery commits through the same external generation anchor and starts with
   the namespace non-authorizing until all subject/key/application state is
   reconciled.
5. Recovery may restore exact historical facts, append a non-authorizing
   classification, or keep the namespace quarantined. It cannot reset sequence,
   create an unlinked release/profile/namespace chain, reuse `kid`, delete
   terminal evidence, revive a revoked Connection, restore consumed Approval,
   recreate a missing Task, reinterpret a Result, or create a replacement
   Connection implicitly.
6. Issuer/root compromise recovery requires out-of-band human approval. A new
   self-signed root or higher sequence is insufficient.
7. Missing support for an old release/profile or missing chain history remains
   denial/indeterminate/unsupported until exact restoration or approved
   recovery. A recovery label cannot disguise first-seen bootstrap, a
   downgrade, or a continuity reset.

### 15. Failure policy

H-12 retains public codes/statuses/disclosure. Accepted internal governance
semantics are:

| Condition | Current authority | Durable mutation | Historical result |
| --- | --- | --- | --- |
| Unknown issuer | Deny; require enrollment/review | None except safe review candidate | Untrusted/indeterminate unless original anchor retained |
| Unknown current key | Deny; no alternate lookup/fallback | None; safe diagnostic | Missing key history / unsupported as applicable |
| Unknown H-10 profile | Deny; no algorithm trial | None | `historically_unsupported` or indeterminate per H-10 |
| Release/profile/namespace transition without the exact approved predecessor-head link | Deny and quarantine; never fresh bootstrap | Retain candidate identity only; no floor reset | Prior history remains authoritative/indeterminate as supported |
| Unsupported or unavailable predecessor release/profile history | Deny current transition; recovery if current use is required | No new baseline | `historically_unsupported` or indeterminate; never current authority |
| Missing checkpoint for new enrollment | Deny until exact approved bootstrap | Commit only approved bootstrap | Not applicable |
| Missing checkpoint for prior issuer | Quarantine/recovery | Record incident; no reset | Indeterminate until exact history restored |
| Stale snapshot | Deny new authority; suspend source-dependent Connection use where H-07 threshold is Connection-wide | Retain floor; mark freshness condition | Historical retained evidence may still be evaluated |
| Future-dated snapshot within allowed skew | Pending or reject/refetch; no immediate current use before `A` | Retain only as non-authorizing candidate until full recheck/commit | `generatedAt` remains a signer claim; no earlier historical fact is manufactured |
| Future-dated snapshot beyond skew | Reject | No floor advance | Invalid time evidence |
| Lower, forked, skipped, or wrong-predecessor metadata/key successor | Deny and quarantine as applicable | No metadata/key floor advance; retain safe fork evidence | Missing/forked key history makes affected proof result invalid or indeterminate |
| Snapshot binds metadata/key head not durably committed, or the two heads mismatch | Deny and fence; stale keys cannot authorize | No independent permissive advance; prove atomic pair or quarantine | Affected interval indeterminate until exact pair/history is restored |
| Unauthorized root change or `kid`/thumbprint/purpose substitution | Deny and quarantine | Preserve prior immutable mapping and forensic evidence | Affected proof chain invalid/indeterminate by scope and time |
| Lower sequence | Reject/quarantine | Retain safe forensic identity | Rollback evidence; prior history unchanged |
| Same-sequence different digest | Quarantine fork | Retain both proofs; no advance | Affected interval indeterminate until recovery |
| Skipped sequence | Deny; fetch predecessors or recover | No advance | Missing history |
| Invalid predecessor digest | Quarantine | No advance; retain proof identity | Chain invalid/forked |
| Invalid signature/digest | Deny | No floor advance | Cryptographically invalid |
| Sequence/subject transition conflict | Quarantine | No permissive mutation | Affected history invalid/indeterminate |
| Snapshot/point-status conflict | Deny targeted result and quarantine source response | No floor advance from point status | Indeterminate conflict |
| Storage write/confirmation failure | Deny; no cache success | Reread exact commit; otherwise quarantine | Existing retained history only |
| Store unavailable | Deny current; H-07 suspension if Connection-wide | None | Offline historical result only if complete archive exists |
| Corrupt/rolled-back store | Quarantine/recovery | Preserve safe evidence; no reset | Indeterminate until restored |
| Unsafe/ambiguous clock | Deny current | Record clock condition; no expiry revival | Boundary-sensitive history indeterminate |
| Incomplete key/revocation/compromise history | Deny current where required | No invented evidence | `historically_indeterminate` |
| Authoritative revoked/compromised subject | Apply subject table; terminal where H-05/H-07/H-08 require | Atomic floor/effect or namespace fence | Time-scoped invalid/indeterminate/favorable result |

Unavailability, staleness, rollback suspicion, and storage failure are not
themselves proof that a subject was revoked. They fail closed without fabricating
a terminal reason.

## Threat analysis

| Threat | Accepted Option B control | Detection/recovery | Residual risk |
| --- | --- | --- | --- |
| Enrollment eclipse with an old valid snapshot | Exact admin-approved checkpoint, not first seen | Anchor mismatch; re-enrollment review | Compromised approver/root may approve attacker history |
| Release/profile/namespace change resets history | Stable semantic domain plus approved link to both prior chain heads and carried terminal/key history | Missing/lower predecessor head, reused `kid`, or omitted tombstone quarantines transition | Incorrect authority-domain equivalence or compromised transition approver can join or split domains wrongly |
| Old signed snapshot replay after restart | Durable floor + external generation anchor + half-open freshness | Lower sequence/generation regression | Badly qualified storage may overstate rollback resistance |
| Restore snapshot and floor together | Anchor outside ordinary backup domain | Generation mismatch/quarantine | Common-mode compromise of both stores |
| Same-sequence equivocation | Exact digest equality and retained conflicting proofs | Quarantine; incident recovery | Separate organizations that never exchange evidence may not detect different higher branches |
| Skipped hidden revocation | Strict `+1` chain | Missing predecessor rejection | Availability loss when archive/predecessor unavailable |
| Metadata/key history skips a revocation, root, or rotation event | Separate strict metadata/key chain cross-bound to snapshots | Missing predecessor/cross-binding, fork, or immutable-key conflict | Dual-chain archive loss or implementation complexity can cause prolonged quarantine |
| Point-status false active | Projection-only binding to committed snapshot | Snapshot/status mismatch | Targeted query privacy and endpoint DoS |
| Stale replica authorizes | Linearizable floor read and fencing epoch | Replica generation mismatch | Consensus/store outage blocks availability |
| Concurrent verifier race | Compare-and-advance CAS and exact equality | Loser rereads; fork proof quarantines | Implementation transaction bugs |
| Clock rollback extends trust | Durable max time, monotonic runtime time, no expiry skew | Clock ambiguity/quarantine | Compromise of clock plus durable anchor |
| Within-skew future snapshot is used immediately or backdates a subject fact | Non-authorizing pending candidate, activation at `A`, recheck, and independent evidence for earlier effects | Premature floor/current-use detection and audit comparison of `G`, `O`, `A`, and `E` | Bounded delay can slow urgent changes; a compromised clock plus issuer can still distort the interval |
| Old key rollback during rotation | Immutable key history and metadata/snapshot floor | Old-active transition rejected | Issuer may have signed malicious objects before detection |
| `kid` material/purpose substitution | H-10 ID + thumbprint + single purpose + immutable map | Quarantine identity conflict | Key registry/store compromise |
| Compromised key backdates proof | Trusted time interval not signer timestamp alone | Indeterminate if interval not independently proven | Precise truth may be unrecoverable |
| Terminal Result time is mistaken for later Receipt-proof time | Digest-bound exact/lower/upper interval rules and explicit H-09 separation | Missing or crossing interval becomes indeterminate | External time anchors add availability, privacy, and governance dependencies |
| Unknown compromise start | Explicit unknown interval | All dependent history indeterminate | Large historical blast radius |
| Revocation source compromised | Purpose-specific H-10 proof, chain, root/admin recovery | Quarantine, out-of-band recovery | Valid malicious higher snapshots before detection |
| Receipt becomes authority | H-02/H-09 non-authority axis always false | Authorization path must ignore historical result | Application misuse outside verifier boundary |
| Later revocation erases effects | H-09 Task/Result immutability and multi-axis history | Compare immutable terminal evidence | Business truth may still be disputed |
| Archive privacy leakage | Safe digests/references, scoped retrieval, H-12 redaction, H-14 minimization | Access audit and minimization | Timing/key/incident metadata remains sensitive |
| Denial of service through fail-closed dependency | Bounded parsing, short refresh, idempotent recovery | H-12 retry and H-14 reliability plans | Intentional availability cost |

## Compatibility and migration impact

### Historical `ghostbridge/0.1-draft`

- Historical revocation sets, generic JWS proofs, generic
  `revocation_signing`, current Trust digests, the literal predecessor `none`,
  multi-purpose keys, point status, and `valid_at_issuance` results remain
  legacy evidence.
- None aliases the accepted H-10 snapshot/status profiles, purposes, domains, or
  Option B checkpoint semantics.
- Legacy Receipts keep their original bytes and meaning. Missing original
  profile, key history, signing time, snapshot coverage, or compromise evidence
  produces legacy-ambiguous/indeterminate classification rather than backfill.

### SDK and runtime impact if later authorized

- The current synchronous in-memory `AntiRollbackStore` contract is
  insufficient. A future implementation needs asynchronous linearizable
  compare-and-advance, generation anchoring, subject/key history, and recovery.
- Native Client caches become projections only; process restart cannot reset
  continuity.
- Issuer publication needs separate durable contiguous snapshot and
  metadata/key-authorization state, atomic cross-binding, exact H-10
  profiles/purposes, linked representation transitions, genesis
  representations, and crash-safe signing/publication.
- Native Agent's resolver must return verifiable committed continuity evidence,
  not only `{status, freshness, sequence}`.
- Native Agent's `revocation` collection and Connection transitions need a
  defined atomic/fenced relationship; current production capability flags do
  not prove it.
- Platform needs a real shared continuity adapter. Its current Map, sealed prior
  evidence, and unused/partial Mongo trust models do not satisfy the accepted
  store contract.
- Historical verification must return distinct axes instead of one `valid`
  boolean or generic invalid-signature result.

### Existing durable objects

- Existing active Connections without complete enrollment/floor/immutable
  binding evidence cannot simply be declared Option B current. A later
  human-approved migration may suspend/restrict them, prove and attach new
  prospective evidence without rewriting history, or require replacement.
- Existing available Approvals, nonterminal Tasks, Receipts, and trust records
  are classified from retained proof. No missing sequence, key purpose,
  compromise interval, or timestamp is invented.
- A new prospective checkpoint may govern future current use only through an
  approved transition/recovery record that binds every available prior
  snapshot and metadata/key floor and carries surviving terminal history.
  Unsupported or missing legacy history remains indeterminate/unsupported and
  cannot be treated as a new bootstrap. The new checkpoint does not certify a
  legacy object under H-10 or H-11.

This decision authorizes none of those migrations or changes.

## Privacy and disclosure consequences

Option B retains more key, status, incident, and timing evidence than the
current latest-only cache. That evidence can disclose relationships, affected
subjects, security incidents, and activity timing.

Future work would need to:

- prefer opaque, purpose-specific subject references or H-10 commitments where
  semantics permit, without making a digest a bearer capability;
- keep private keys, credentials, raw grants, private policy, unrestricted
  inputs/outputs, prompts, hidden reasoning, and cross-tenant identifiers out of
  checkpoint/history records;
- authorize historical retrieval independently of cryptographic validity;
- minimize full content while preserving H-09 terminal/replay and H-11
  verification commitments; and
- let H-12 define redaction/public errors and H-14 define concrete retention,
  archive availability, and deletion governance.

Deletion or disclosure denial never creates current authority and never proves
the historical event did not exist.

## Rejected shortcuts and non-options

The following are not viable H-11 alternatives:

- “Use whatever the current JavaScript does.” It is divergent and in-memory.
- “A valid signature is enough.” It does not establish bootstrap, freshness,
  sequence completeness, current authorization, or historical time.
- Trust On First Use for remote Governed authority without explicit human
  selection. It permits enrollment eclipse and divergent first state.
- Store only the highest integer. Same-sequence equivocation, predecessor,
  namespace, key, subject, and restore state remain unprotected.
- Change release, Trust profile, cryptographic profile, namespace, or epoch and
  start at a first-seen floor. Representation change is not a new security
  authority and cannot erase the prior domain history.
- Store sequence/digest only in the same rollbackable backup with no external
  generation anchor. A full restore rolls both back consistently.
- Accept sequence gaps because the latest snapshot is signed. Missed
  compromise/rotation and equivocation cannot be ruled out.
- Accept a snapshot under current JWKS or a higher metadata integer without a
  contiguous, durably committed, cross-bound key-authorization history.
- Treat snapshot absence as active without declared complete coverage and
  retained terminal history.
- Choose the latest fork by timestamp, network arrival, largest sequence, or an
  unapproved majority.
- Allow stale grace for Governed current authority without a separately
  human-approved profile. Availability cannot silently become authority.
- Let clock skew extend expiry or `nextUpdate`.
- Let a within-skew future `generatedAt` participate in current authority before
  its activation boundary or manufacture a subject event in earlier history.
- Let current JWKS state alone decide historical eligibility.
- Treat a retired key as revoked or a current revocation as retroactive by
  default.
- Trust Receipt `completedAt` as proof signing time when the signer may be
  compromised.
- Treat H-09 terminal Result commit as the exact proof-materialization time
  when the exact proof may have been created later.
- Mark every pre-compromise Receipt invalid, or every pre-revocation Receipt
  valid, without evidence-quality and interval analysis.
- Re-sign or overwrite an old Receipt so it appears originally valid under a
  new key/profile.
- Let historical verification restore a Connection, Approval, or Invocation.
- Clear a rollback/fork by deleting local state and calling the next snapshot
  bootstrap.
- Import Platform Map/sealed-token/error behavior as protocol law.
- Add a new H-10 crypto profile/domain/purpose or alias current generic
  `revocation_signing` through H-11.

## Accepted residual risks of Option B

1. Fail-closed freshness and storage requirements can create material outages.
2. A qualified shared linearizable store and external rollback-generation
   anchor are more expensive than an SDK Map.
3. Cross-organization issuer equivocation may remain undetected without the
   witnesses/gossip of Option C.
4. Administrators can approve a malicious bootstrap or recovery checkpoint.
5. Root, issuer, Trust source, storage, and clock can suffer correlated
   compromise.
6. Strict contiguity makes lost predecessor archives an availability and
   recovery event.
7. Snapshot/state retention may grow with terminal subjects and historical
   verification horizons.
8. Short five-minute freshness increases issuer and verifier load.
9. No offline new Governed authority may be unacceptable for some deployments.
10. Trusted historical time intervals may be unavailable, producing many
    indeterminate Receipts.
11. Unknown compromise start can make an entire key/source history
    indeterminate.
12. Applying a new floor and many subject/Connection effects safely may require
    fencing and temporary unavailability.
13. Existing `0.1-draft` evidence will often remain legacy-ambiguous and cannot
    be upgraded by implementation work.
14. Privacy-preserving subject coverage and complete snapshot semantics may be
    difficult to combine without future accumulators or transparency designs.
15. Store/provider claims of durability or linearizability may be incorrect;
    conformance and independent review must test actual failure behavior.
16. Incorrectly deciding that two issuer/release/profile/namespace identities
    are the same semantic continuity domain can import unrelated tombstones;
    deciding they are different can permit a security reset. Transition
    governance is therefore a high-impact trust decision.
17. Two contiguous cross-bound chains increase publisher, verifier, archive,
    transaction, and recovery complexity. A lost metadata/key predecessor or
    partially published transition can block an otherwise fresh snapshot.
18. Pending future-dated candidates can delay urgent publication by up to the
    approved skew, while unsafe early activation can create false current or
    historical authority. Clock and issuer compromise remain a correlated risk.
19. Strong proof-time bounds may require external timestamp/audit services,
    creating availability, privacy, retention, and governance dependencies; in
    their absence more historical proofs become indeterminate.
20. Carrying terminal and key history across representation transitions grows
    retained state and may expose release-upgrade, rotation, and incident
    relationships even when content is minimized.

## Accepted human dispositions

Rudra approved the complete 29-item bundle without additional qualification:

1. Accept Option B in full with the corrected semantics.
2. Prohibit TOFU for remote production/Governed enrollment.
3. Permit bootstrap from genesis or an explicitly human-approved later
   checkpoint.
4. Use one semantic continuity domain with explicitly linked
   per-release/profile/namespace chains.
5. Treat representations as one continuity domain only when normalized
   issuer/security-authority identity and approved governance scope remain
   unchanged; planned transitions require accountable governance approval and
   recovery transitions require explicit human security approval.
6. Every representation transition binds both exact prior terminal heads and
   carries surviving terminal/key/compromise history.
7. Baseline authority uses one issuer-wide complete namespace; scoped feeds are
   not baseline authority.
8. Point status is projection-only.
9. Snapshot sequence progression is strict contiguous `+1`.
10. Same-sequence/different-digest fork quarantines even if one candidate was
    already locally committed.
11. Metadata/key history uses a separate contiguous authority chain atomically
    cross-bound to the snapshot chain.
12. Accept metadata/key genesis, exact progression, equality, gaps,
    predecessor, fork, root/key lifecycle, immutable `kid`/thumbprint/purpose,
    and no-summary-skip rules.
13. Permit prepublication-only metadata advancement; activation plus first
    dependent snapshot and required fences/floors commit atomically.
14. Require an external anti-rollback generation anchor outside ordinary
    restorable backup for production.
15. Accept 60-second maximum future skew, five-minute maximum snapshot
    interval, and no post-boundary grace.
16. A within-skew future snapshot remains non-authorizing until `generatedAt`,
    then undergoes full two-chain recheck and atomic activation; skew cannot
    create earlier authority/history.
17. `now == nextUpdate` is stale; expiry equality is invalid.
18. Offline operation is historical/read-only for Governed authority; no new
    Governed authority while fresh revocation evidence is unavailable.
19. Accept six-minute minimum key prepublication and verification-only old-key
    overlap; no ordinary dual-signing overlap.
20. Trusted proof-time sources are authenticated/digest-bound H-07/H-09
    records, trusted retained observations, monotonic audit/checkpoint evidence,
    and separately approved external time anchors according to their exact,
    lower, upper, open, or closed interval guarantees; signer timestamps alone
    are not trusted proof-time evidence.
21. Accept the explicit separation among H-07 acceptance time, H-09 terminal
    Result commit time, Receipt proof materialization time, signer-asserted
    Receipt time, trusted observation, monotonic audit time, external anchor
    time, and verification time.
22. Accept the distinction among current proof use, new proof
    creation/materialization, and immutable historical proof verification.
23. Accept prospective, known, bounded, and unknown compromise interval
    semantics, including historical indeterminacy for unknown compromise start
    unless independent evidence proves otherwise.
24. A newly active key may add an additional proof for the same immutable
    semantic Receipt, but may not overwrite/repair an old proof or rerun
    execution.
25. Accept the five aggregate historical classifications while preserving the
    independent verification axes:

    - `historically_verified`
    - `historically_verified_with_current_revocation`
    - `historically_invalid`
    - `historically_indeterminate`
    - `historically_unsupported`

26. Recovery requires accountable human security/governance approval and a
    durable sign-off; root/issuer/snapshot-key/metadata-key-chain/store/
    Trust-source/transition-authority compromise cannot self-authorize recovery.
27. Cross-organization witness/gossip from Option C is optional strengthening,
    not mandatory baseline.
28. Revocation, compromise, identity substitution, and other explicitly
    terminal H-05/H-07/H-08 effects remain cumulative terminal tombstones.
    Only explicitly temporary suspension classes may clear, and only with fresh
    committed evidence plus the applicable complete authority recheck.
29. Accept every residual risk listed in the corrected Option B proposal,
    including fail-closed availability loss, shared-linearizable-store and
    external-anchor cost, lack of mandatory global equivocation witnesses,
    bootstrap/recovery approver risk, strict-contiguity availability cost,
    historical indeterminacy, retention/privacy growth, semantic-domain
    transition classification risk, two-chain operational complexity,
    future-candidate timing cost, trusted-time dependencies, and transition
    history retention/disclosure cost.

## Deferred downstream ownership

### H-12

Owns transport, endpoint/resource design, media types, HTTP/status/error
representation, retry headers, delivery, redaction, safe disclosure, public
error precedence, and logging/metrics. It may collapse sensitive public detail
but cannot turn an H-11 denial/indeterminate state into authority.

### H-13

Owns schema openness, exact field names, enums, extension participation,
unknown-field behavior, namespace syntax, and evolution. It may represent an
accepted H-11 model but cannot make an optional extension weaken bootstrap,
coverage, chain, floor, key-purpose, or historical semantics.

### H-14

Owns concrete support, archival availability, operational retention and
recovery service levels, algorithm/profile support windows, required
independent evidence, security-review/remediation gates, publication/release,
residual-risk authority, and Protocol 1.0 graduation. It cannot shorten a
retention layer below a surviving H-09/H-11 dependency without making history
explicitly unavailable/indeterminate.

### D2 and P1

After separately approved normative requirements, D2/P1 work owns schemas,
executable checkpoint/key/subject state machines, static H-10/H-11 vectors,
restart/crash/backup/fork/clock/compromise fixtures, black-box conformance,
independent implementation, interoperability, and security review.

Required later case design includes, without creating cases here:

- bootstrap genesis and later approved checkpoint;
- accidental rebootstrap after state loss;
- release/Trust-profile/cryptographic-profile/namespace transition with exact
  prior snapshot and metadata/key heads, omitted terminal history, downgrade,
  rename, unsupported predecessor history, and attempted fresh bootstrap;
- lower, equal-same, equal-different, skipped, forked, and wrong-predecessor
  sequences;
- the same progression/fork cases for the metadata/key chain, including root
  replacement, `kid` substitution, missing prepublication, lifecycle reversal,
  and snapshot use of an uncommitted metadata/key head;
- crash before/after a cross-bound metadata/key activation and first dependent
  snapshot commit;
- crash before/after floor/fence/projection commit;
- process restart, adapter restart, full backup rollback, partial restore,
  corrupt floor, and external-generation mismatch;
- concurrent verifiers, stale replicas, partitions, and split brain;
- future generation beyond skew, within skew before/at `G`, exact `nextUpdate`,
  one unit before/after, first trusted observation, clock jump, and clock
  rollback;
- prepublish/cutover/retire/emergency/old-key rollback and `kid` substitution;
- prospective, known, bounded, and unknown compromise;
- current-revoked but historically eligible Receipt;
- invalid, interval-indeterminate, missing-history, retired-key, late-
  materialized, legacy-profile, and semantically mismatched Receipt;
- exact/lower/upper/open/closed proof-time bounds from H-09, first observation,
  monotonic audit, external anchors, and signer-only timestamps; and
- proof that every historical result has present-authority value `false`.

## Human approval checklist

The explicit human approval completed every applicable H-11 governance item:

- [x] Select one exact top-level option and identify every incorporated
      qualification from another option.
- [x] Confirm H-01 through H-10 conflict/dependency ledger.
- [x] Approve bootstrap anchor and bootstrap/recovery distinction.
- [x] Approve the semantic continuity-domain identity, explicitly linked
      per-release/profile/namespace transition model, both predecessor heads,
      carried terminal/key/compromise history, and no upgrade/downgrade/reset/
      fallback/rebootstrap rule.
- [x] Approve snapshot authority, point-status relationship, namespace, and
      coverage semantics.
- [x] Approve exact sequence/equality/gap/fork/predecessor rules.
- [x] Approve the separate contiguous metadata/key-authorization chain,
      genesis/progression/fork/root/key-lifecycle rules, immutable key mapping,
      and prohibition on silently summarized security history.
- [x] Approve atomic cross-binding of snapshot and metadata/key heads,
      including prepublication, activation/first-snapshot pairing, fencing,
      crash/restart, rollback, and mismatched-head behavior.
- [x] Approve durable floor inventory, external generation anchor, commit
      point, restart, restore, concurrency, and split-brain behavior.
- [x] Approve freshness, future-candidate pending behavior, `G`/`O`/`A`/`E`
      boundaries, full activation recheck, equality, clock rollback, maximum
      interval, and offline behavior.
- [x] Approve subject application and revocation/Invocation race rules.
- [x] Approve key rotation, overlap, `kid` immutability, and emergency recovery.
- [x] Approve prospective/known/bounded/unknown compromise history.
- [x] Approve the trusted historical-time source inventory and exact/lower/
      upper/open/closed interval rules, including that H-09 terminal commit and
      signer timestamps are not automatically exact proof-materialization time.
- [x] Approve the separation of current proof use, new proof creation, and
      immutable historical proof verification for retired, revoked, and
      compromised keys without weakening compromise rules.
- [x] Approve every historical Receipt axis and aggregate classification.
- [x] Confirm historical verification never creates current authority.
- [x] Approve failure/quarantine and privacy consequences.
- [x] Accept compatibility/migration impact and prohibit invented legacy
      evidence.
- [x] Record all accepted residual risks.
- [x] Record security impact.
- [x] Record approver name/governance identity.
- [x] Record unambiguous approval date.
- [x] Record durable sign-off/reference.
- [x] Confirm no normative/schema/state-machine/vector/implementation/migration/
      deployment/release/Protocol 1.0 authority is implied by acceptance.

## Human disposition block

- **Approver:** Rudra
- **Approval date:** 2026-08-10
- **Approved option:** Option B — Anchored contiguous issuer chain with
  transactional durable floors
- **Approved qualifications:** Complete corrected Option B semantics plus the
  complete 29 human dispositions from the final independent review.
- **Accepted risks:** All residual risks listed in the corrected Option B
  proposal.
- **Compatibility impact accepted:** The complete compatibility and migration
  impact recorded in the proposal, including preservation of
  `ghostbridge/0.1-draft` as immutable legacy evidence, no invented historical
  facts, no reclassification of legacy evidence under current H-10/H-11
  semantics, and no automatic migration authority.
- **Security impact accepted:** The complete security impact of Option B,
  including fail-closed current authority, contiguous cross-bound revocation
  and metadata/key history, rollback-resistant durable floors, explicit
  bootstrap/recovery separation, strict compromise-history semantics, and
  historical verification that never creates present authority, together with
  the recorded residual risks.
- **Sign-off/reference:** Human approval source:
  `H-11-human-approval-rudra-2026-08-10.txt`; SHA-256:
  `62C52D94C7C93F7B15595567FE96796A00540CFAF146D066548F69EBDD8D999D`
- **Resulting status:** `ACCEPTED`

## Durable human-approval evidence

- **Human approval source:** `H-11-human-approval-rudra-2026-08-10.txt`
- **Verified SHA-256:**
  `62C52D94C7C93F7B15595567FE96796A00540CFAF146D066548F69EBDD8D999D`

Exact human approval statement:

```text
“I, Rudra, approve H-11 Option B — Anchored contiguous issuer chain with
transactional durable floors — together with the complete corrected Option B
semantics, the 29 human dispositions recommended in the final independent
review, all listed residual risks, compatibility and migration impact, privacy
consequences, and security impact recorded in the H-11 proposal. I understand
that this approval establishes H-11 protocol-governance decision authority only
and does not itself close any GB-* gap or authorize normative specification,
schemas, state machines, fixtures, vectors, implementation, migration,
deployment, conformance, publication, release, or a Protocol 1.0 claim.”
```

The approval source remains intentionally outside tracked repository content
under `.git`. This record stores its filename, verified digest, and exact human
statement without copying or staging the source as a separate tracked artifact.

## Consequences of acceptance

Acceptance authorizes only the selected H-11 protocol-governance decision as an
input to separately authorized work. It does not itself:

- close `GB-028` through `GB-033` or `GB-047`;
- create normative requirements or specification text;
- create or modify schemas, state machines, fixtures, vectors, or cases;
- change implementation, storage, Platform, SDK, Agent, Client, Trust, Issuer,
  Core, or test behavior;
- authorize migration or reinterpret legacy evidence;
- establish conformance;
- authorize deployment, publication, PR/merge, or release; or
- establish Protocol 1.0.

Any later normative requirement needs a stable ID and traceability to the
accepted H-01 through H-11 records. Any later schema/state machine/vector must
derive from those requirements under separate authorization. Implementation,
migration, independent conformance, external review, and release retain their
own gates.

## Final decision status

H-01 through H-11 are `ACCEPTED`. H-01 through H-10 are unchanged. H-12 through
H-14 remain unresolved. Every affected `GB-*` gap remains open. H-11 acceptance
alone creates no normative, implementation, migration, deployment,
conformance, publication, release, or Protocol 1.0 authority.

**H-11 is ACCEPTED.**
