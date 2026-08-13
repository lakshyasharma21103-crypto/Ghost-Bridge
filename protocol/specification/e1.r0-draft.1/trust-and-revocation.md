# Trust and revocation

This chapter defines Trust continuity, governed bootstrap, issuer metadata and
key lifecycle, revocation snapshots and point status, freshness, durable
anti-rollback floors, recovery, and historical verification for
`ghostbridge/e1.r0-draft.1`. It defines implementation-neutral semantic
requirements, not wire/schema member names, executable state machines,
transport or public-error behavior, concrete retention windows, deployment, or
release work.

## REQ-TRUST-0001 - Current authority and historical evidence validity are distinct

**Requirement.** Current authority validity MUST answer only whether one
present operation may proceed after the full applicable H-01 through H-11
intersection and final serialized check. Historical evidence validity MUST
instead assess immutable earlier evidence under its exact original release,
profiles, bytes, key and revocation history, compromise interval, trusted time
evidence, and historical semantic context.

Trust or revocation evidence MAY narrow or deny current authority but MUST NOT
supply authentication, Connection authority, structured authorization, policy,
Approval, Task authority, execution permission, or disclosure permission.
Historical verification MUST NEVER create, restore, or transfer any present
authority. A Trust service MUST NOT receive or exercise Agent-to-Agent,
Connection, Invocation, Approval, Task, execution, or effect authority merely
by evaluating, retaining, or publishing Trust evidence.

**Applies to.** Trust evaluation, current operation gates, historical Receipt
verification, archives, recovery, and every authority decision using Trust
evidence.

**Lifecycle/state impact.** Current Trust participates only as one narrowing
gate; historical assessment creates no current lifecycle or authority
transition.

**Semantic failure.** Collapsing the two assessments, treating evidence as
authority, or using historical success as a current gate MUST fail closed for
the present operation without rewriting historical facts.

**Sources:** H-01, H-02, H-03, H-05, H-07, H-08, H-09, H-10, H-11.
**Gaps:** GB-028, GB-029, GB-031.

## REQ-TRUST-0002 - One non-resettable semantic continuity domain

**Requirement.** One enrolled issuer and administrator-approved security
authority MUST have one semantic continuity domain across protocol releases,
Trust profiles, H-10 profiles, revocation namespace representations, origin
aliases, epochs, chain identifiers, and equivalent continuity identifiers.
Changing a representation MUST NOT create a first-seen enrollment, fresh
bootstrap, lower anti-rollback floor, `kid` reuse, tombstone deletion,
compromise-history erasure, or weaker/nearby-profile fallback.

Each representation chain MUST preserve its own immutable original semantics.
A successor representation MUST be joined by an exact, approved, immutable
transition link naming the continuity domain; prior and successor release,
Trust profile, H-10 profile, and namespace; exact prior terminal snapshot and
metadata/key heads; new genesis checkpoint; reason, approver, approval time, and
sign-off. It MUST carry forward every independently retained lower bound and
all surviving terminal subject/key tombstones, `kid` mappings, revocation and
compromise history, recovery records, and supported historical dependencies.
A successor-local sequence 1 MAY be used only with that complete link and MUST
NOT represent empty history.

**Applies to.** Issuer enrollment, release/profile/namespace transitions,
upgrade, downgrade, migration assessment, restart, restore, and recovery.

**Lifecycle/state impact.** An approved transition changes representation but
does not reset or weaken the semantic-domain history or authority floor.

**Semantic failure.** A missing, unapproved, incomplete, mismatched, or weaker
transition MUST deny current use and cause quarantine, explicit recovery, or
historical indeterminate/unsupported treatment as applicable; it MUST NOT
bootstrap a new domain.

**Sources:** H-03, H-04, H-10, H-11, H-13, H-14. **Gaps:** GB-029,
GB-030, GB-031, GB-033.

## REQ-TRUST-0003 - Remote Governed bootstrap requires an independent anchor

**Requirement.** Remote production or Governed Trust bootstrap MUST NOT use
Trust On First Use. First enrollment MUST have an independently human- or
administrator-approved anchor binding semantic equivalents of the continuity-
domain identity and proof of no prior enrollment; normalized issuer identity;
exact release, Trust profile, H-10 identity/profile, and revocation namespace;
approved root thumbprint or thumbprints; exact genesis or approved later
checkpoint sequence and digest; exact issuer-metadata identity/digest
authorizing the snapshot key; enrollment identity and applicable tenant/policy
scope; approver or governance identity, approval time, immutable sign-off
reference; and enrollment generation distinct from recovery generations.

Genesis MUST be sequence 1. A later checkpoint MAY bootstrap a genuinely new
enrollment only when its approval names the exact sequence/digest and the full
current snapshot and key-authorization proof chain resolves to the approved
root. The bootstrap floor and durable enrollment marker MUST commit, including
rollback protection, before the issuer may contribute to a production/Governed
Connection or Invocation decision. A root or origin change requires new human
review or recovery and MUST NOT be accepted from self-signature alone.

Any retained enrollment, Connection, Task, Receipt, key, audit, or tombstone
evidence proves that a missing floor is a recovery condition, not bootstrap.

**Applies to.** First issuer enrollment, approved checkpoint enrollment, root
selection, restored installations, and production/Governed authority.

**Lifecycle/state impact.** Only the durable approved enrollment commit may
move a genuinely unenrolled domain to eligible current evaluation; all
candidate evidence before it is non-authorizing.

**Semantic failure.** A first signed snapshot without the exact anchor,
unproven no-prior-enrollment claim, missing checkpoint, self-approved root, or
missing prior floor MUST deny authority and quarantine or enter recovery without
automatic rebootstrap.

**Sources:** H-01, H-02, H-03, H-10, H-11. **Gaps:** GB-029, GB-030,
GB-031, GB-033.

## REQ-TRUST-0004 - Complete committed snapshots are the authoritative revocation baseline

**Requirement.** The authoritative baseline revocation representation MUST be
the complete signed snapshot chain. A snapshot MUST be a complete current-state
statement plus retained terminal/history commitments, not a delta, and the
baseline namespace MUST cover all subject types for its issuer. Separate feeds
MUST NOT be assumed complete or non-overlapping unless a later accepted release
expressly defines and binds their combined coverage.

Absence of a subject MAY mean active only when a fresh, complete, successfully
committed snapshot declares coverage of that exact subject type and namespace
and retained terminal history proves no effective terminal state. Omission,
unknown status, a partial feed, or absence from current storage MUST NOT
independently mean active.

A snapshot source that is itself authoritatively suspended or invalid MUST NOT
assert current usable status. The verifier MUST deny source-dependent current
authority and apply the applicable source-owned suspension or quarantine; it
MUST NOT fabricate revocation of every covered subject.

**Applies to.** Revocation publication, snapshot verification, current subject
status, historical coverage, subject omission, and authority gates.

**Lifecycle/state impact.** Only a fresh committed complete snapshot may update
the authoritative baseline; absence creates no transition and cannot reverse a
terminal subject state.

**Semantic failure.** Incomplete or undeclared coverage, duplicate subjects,
missing terminal history, delta treatment, or unsupported feed composition
MUST deny the affected current use and MUST NOT infer an active subject.

**Sources:** H-02, H-05, H-07, H-08, H-10, H-11. **Gaps:** GB-029,
GB-031, GB-032, GB-033.

## REQ-TRUST-0005 - Point status is a bound non-authoritative projection

**Requirement.** A point-status response MUST be only a convenience projection
of one exact committed snapshot and MUST bind the exact namespace, sequence,
snapshot digest, subject, and status under the accepted H-10 point-status
profiles. It MUST NOT advance either durable chain floor, override a committed
snapshot, replace missing predecessor or coverage history, reverse terminal
history, or turn unknown or omitted status into active.

**Applies to.** Targeted status lookup, refresh, caching, current gates,
historical checks, and point-status/snapshot comparison.

**Lifecycle/state impact.** Point status causes no independent subject,
snapshot, metadata/key, or anti-rollback transition.

**Semantic failure.** Point-status disagreement with its bound snapshot or
missing exact binding MUST be treated as an integrity failure, fail closed, and
quarantine the response or source as applicable without choosing the more
permissive value.

**Sources:** H-02, H-10, H-11. **Gaps:** GB-031, GB-033.

## REQ-TRUST-0006 - Revocation domains and signing purposes are exact

**Requirement.** Revocation evidence MUST use only these exact,
case-sensitive H-10 mappings:

| Semantic operation                | H-10 domain                       | Key purpose when signed       |
| --------------------------------- | --------------------------------- | ----------------------------- |
| Point-status semantic digest      | `gb.revocation.status.v1`         | none                          |
| Point-status proof                | `gb.revocation.status-proof.v1`   | `revocation_status_signing`   |
| Snapshot semantic digest          | `gb.revocation.snapshot.v1`       | none                          |
| Snapshot proof                    | `gb.revocation.snapshot-proof.v1` | `revocation_snapshot_signing` |
| Predecessor/checkpoint commitment | `gb.revocation.checkpoint.v1`     | none                          |

Digest operations MUST use `gb-c14n-jcs-ijson-v1` and
`gb-digest-jcs-sha256-v1`; signed proofs MUST use
`gb-c14n-jcs-ijson-v1`, `gb-signature-jcs-ed25519-v1`, and
`gb-proof-jcs-ed25519-v1`; public-key identity MUST use
`jwk-thumbprint-rfc7638-sha256-v1`. Current generic
`revocation_signing`, a generic Trust digest or proof, and historical
revocation-set/JWS behavior MUST NOT alias either accepted proof purpose or
domain. Every revocation digest/proof envelope MUST protect the exact protocol
release and registered purpose. A signed envelope MUST also protect the exact
key ID, JWK thumbprint, single key purpose, and proof purpose. H-10 audience,
target, organization, and workspace context MUST be forbidden and absent for
these revocation domains; the exact issuer, namespace, subject, and coverage
semantics instead belong to the registered payload projection.

**Applies to.** Point status, snapshots, predecessor commitments, signing,
verification, historical dispatch, and migration assessment.

**Lifecycle/state impact.** Correct cryptography is a prerequisite to a later
floor commit but creates no authority or floor advance by itself.

**Semantic failure.** An unknown, mismatched, inferred, generic, legacy,
unselected, or substituted profile, domain, key purpose, or proof purpose MUST
fail closed with no algorithm trial, alias, fallback, or floor mutation.

**Sources:** H-03, H-04, H-10, H-11. **Gaps:** GB-029, GB-031, GB-033.

## REQ-TRUST-0007 - Snapshot chains are contiguous and fork-intolerant

**Requirement.** A snapshot chain MUST obey these exact sequence and
predecessor semantics:

| Candidate condition                                                                                                         | Required treatment                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| sequence 1                                                                                                                  | Genesis only, using the later D2-defined profiled genesis predecessor representation                      |
| sequence `n > 1` equals committed predecessor plus exactly one and binds its exact `gb.revocation.checkpoint.v1` commitment | Eligible for the remaining checks and atomic commit                                                       |
| same sequence and same digest                                                                                               | Idempotent duplicate; no state change, and freshness remains that of the signed snapshot                  |
| same sequence and different digest                                                                                          | Fork/equivocation; quarantine and retain both proofs                                                      |
| lower sequence                                                                                                              | Rollback/replay; reject without floor change                                                              |
| sequence skip greater than one                                                                                              | Missing history; deny until every predecessor is proven or approved recovery completes                    |
| correct increment with wrong predecessor                                                                                    | Chain substitution/fork; reject and quarantine                                                            |
| duplicate subject key                                                                                                       | Reject the complete snapshot as ambiguous                                                                 |
| two successors to one predecessor                                                                                           | Fork; quarantine even if one has a higher later sequence                                                  |
| terminal subject later absent or active                                                                                     | Reject terminal reversal unless accepted subject semantics prove the prior state was explicitly temporary |

A fork MUST NOT be resolved by higher sequence, timestamp, arrival order,
freshness, newest response, process preference, or unapproved majority. Sequence
MUST be an unsigned-integer semantic domain whose concrete upper bound remains
later normative representation work. A negative or noninteger sequence MUST be
rejected, and overflow MUST NOT wrap, reset, infer a new epoch, or reuse
history.

**Applies to.** Snapshot ingestion, duplicates, concurrency, replication,
restart, transition, restore, and recovery.

**Lifecycle/state impact.** Only one exact contiguous successor may advance the
snapshot floor; duplicates are no-ops, and fork/rollback/missing-history
conditions make the domain non-authorizing.

**Semantic failure.** Every invalid row above MUST have its stated fail-closed
treatment and MUST NOT advance the floor, clear terminal history, or authorize
from a selected branch.

**Sources:** H-03, H-10, H-11. **Gaps:** GB-031, GB-033.

## REQ-TRUST-0008 - Metadata/key history is separately contiguous and cross-bound

**Requirement.** Issuer metadata and key authorization MUST form a separate
contiguous chain in the same semantic continuity domain and representation as
the revocation snapshot chain. It MUST preserve complete ordered root and
single-purpose operational-key authorization history, not merely a latest key
set. Genesis, exact successor, duplicate, lower, skipped, wrong-predecessor,
same-sequence conflict, fork, and unauthorized-root-change semantics MUST follow
the corresponding strict rules of REQ-TRUST-0007.

Every snapshot MUST bind the exact metadata/key sequence and digest authorizing
its signing key. Every metadata/key successor MUST bind the exact current
snapshot head from which it advances. Neither independently newer head MAY
authorize when those cross-bindings disagree. A snapshot MAY become current
only when its bound metadata/key head is already durably valid or when the
exact metadata/key successor, snapshot successor, subject/key effects, fence,
and external generation are verified and committed as one linearizable
cross-bound transition. A metadata-only prepublication MAY advance against the
unchanged snapshot head because it creates no active key; it MUST NOT activate a
pending or stale snapshot. Snapshot-key activation and the first snapshot using
that key MUST commit as one cross-bound pair.

Issuer-metadata semantic commitments and proofs MUST use the exact H-10 domains
`gb.issuer-metadata.semantic.v1` and
`gb.issuer-metadata.signature.v1`, respectively, with the accepted H-10
canonicalization/digest/signature/proof profiles and signing key purpose
`issuer_metadata`. Their H-10 context MUST contain exact release and purpose and
MUST omit audience, target, organization, and workspace as required for the
issuer-metadata family. Generic metadata digests, generic proofs, current key
sets, and self-signatures MUST NOT alias this chain or replace its history.
Root addition, change, or removal MUST use the approved governance or recovery
record, bind the prior root and both exact chain heads, and carry forward all
surviving subordinate history. Ordinary metadata signing MUST NOT replace its
own Trust anchor.

**Applies to.** Issuer metadata, root and key history, snapshot verification,
key prepublication/activation, restart, restore, replication, and recovery.

**Lifecycle/state impact.** The chains advance independently only where no
authority is created and remain atomically cross-bound before any new current
authority can use either head.

**Semantic failure.** Missing history, head mismatch, stale key authorization,
partial pair, fork, skipped event, or unauthorized root change MUST deny and
fence or quarantine current use without choosing either newer head.

**Sources:** H-03, H-05, H-10, H-11. **Gaps:** GB-029, GB-030, GB-031,
GB-033.

## REQ-TRUST-0009 - Key identity is immutable and single-purpose

**Requirement.** A key ID (`kid`) MUST be scoped to one semantic continuity
domain, case-sensitive, immutable, and never reused across any release,
profile, namespace, transition, recovery, or replacement. Each key record MUST
bind its exact `kid`, recomputed `jwk-thumbprint-rfc7638-sha256-v1` value,
exactly one H-10 signing purpose, issuer, validity bounds, lifecycle history,
source sequence, and predecessor/transition evidence.

The same public-key thumbprint MUST NOT serve more than one Ghost Bridge signing
purpose. A retained `kid` with changed material, thumbprint, or purpose, or a
thumbprint appearing under another purpose, MUST be treated as substitution and
MUST quarantine every affected current and historical dependency. Key addition
or publication alone MUST NOT confer active signing or current authority.

**Applies to.** Root and operational keys, metadata publication, key lookup,
proof creation/use, rotation, history, migration, and recovery.

**Lifecycle/state impact.** Key identity remains fixed through prepublication,
activation, retiring, retirement, revocation, compromise, and representation
transition; lifecycle can only narrow or change permitted use monotonically.

**Semantic failure.** Collision, reuse, changed mapping, cross-purpose reuse,
unknown history, or lookup by `kid` without matching thumbprint and purpose MUST
fail closed and MUST NOT select alternate material.

**Sources:** H-03, H-05, H-10, H-11. **Gaps:** GB-029, GB-030, GB-031,
GB-033.

## REQ-TRUST-0010 - Planned rotation uses prepublication and one cutover

**Requirement.** A planned signing-key rotation MUST durably prepublish the new
key under fresh committed metadata/key history for at least one full maximum
snapshot interval plus maximum future skew; the baseline minimum is therefore
6 minutes. A prepublished key MUST NOT sign, create a proof, verify as an active
current key, or establish current authority.

One ordered cutover at time `T` MUST atomically activate the new key and move
the old key to `retiring`, binding both key IDs, thumbprints, the one purpose,
issuer, predecessor, and `T`. Ordinary dual-signing overlap MUST NOT exist. At
`T`, all new signing for that purpose MUST use the new key; the old key MUST be
verification-only for already-existing objects whose protected signing
interval ends before `T`. The old key MUST remain published in `retiring`,
verification-only treatment through the greatest applicable surviving
requirement: the greatest remaining validity of objects it could lawfully have
signed plus 60 seconds, and any longer H-14 publication, support, or historical-
verification dependency. Once that greatest bound is satisfied and no
surviving accepted dependency requires `retiring` treatment, the key MUST
transition monotonically to `retired`.

Neither `retiring` nor `retired` treatment permits new signing or reactivation.
Retirement MUST NOT erase the exact historical public verification material or
its immutable resolvable reference required by REQ-TRUST-0028, historical
eligibility, cutover or lifecycle history, or applicable source history, and
MUST NOT shorten an H-14 requirement. Metadata rollback MUST NOT make the old
key active again.

Rotation MAY preserve a pre-bound H-05 binding only when issuer, subject,
principal, profile, purpose, audience, target, Agent/Passport, tenant,
limitations, and authority ceiling are unchanged and the selected profile
permits that rotation class; otherwise a replacement Connection is required.

**Applies to.** Planned root/operational-key publication, activation, signing,
verification, current use, historical support, and Connection binding.

**Lifecycle/state impact.** One committed cutover changes new signing from old
to new key without transferring unrelated authority; the old key proceeds
monotonically toward retirement.

**Semantic failure.** Short prepublication, premature signing, dual-signing
overlap, old-key post-cutover signing, rollback activation, or material
authority change without replacement MUST deny or quarantine affected use.

**Sources:** H-03, H-05, H-07, H-10, H-11, H-14. **Gaps:** GB-030,
GB-031, GB-032, GB-033.

## REQ-TRUST-0011 - Emergency rotation starts by fencing authority

**Requirement.** Emergency rotation MAY omit normal prepublication only after
current authority is durably fenced, authoritative compromise or revocation
evidence is published, the accepted recovery flow is entered, required
out-of-band human approval is obtained, and replacement key/history, both
cross-bound heads, subject effects, and anti-rollback generation are atomically
committed. No old-key, unlinked-root, stale-history, or weaker-profile fallback
MAY be used to preserve availability.

**Applies to.** Root, issuer, snapshot, and other operational-key compromise;
urgent replacement; recovery; and authority reactivation.

**Lifecycle/state impact.** The affected domain becomes non-authorizing before
replacement and can return to current evaluation only through a complete
approved recovery commit.

**Semantic failure.** Replacement without prior fencing, authoritative
incident evidence, required approval, exact history, or atomic commit MUST
remain quarantined and MUST NOT activate the new or old key.

**Sources:** H-05, H-07, H-10, H-11. **Gaps:** GB-030, GB-031, GB-033.

## REQ-TRUST-0012 - Durable floors preserve complete anti-rollback evidence

**Requirement.** For every semantic continuity domain, the durable
anti-rollback floor MUST retain at least the enrollment/sign-off and stable
domain identity; every representation and transition link; highest snapshot
sequence, digest, predecessor, identity, signed times, and proof key identity;
highest metadata/key sequence, digest, predecessor, cross-bound snapshot head,
approved root and key-authorization history; store and recovery generations;
an anti-rollback generation anchor outside the ordinary restorable snapshot
domain; maximum trusted wall-clock observation and clock-health evidence;
current temporary subject states and clearing boundaries; terminal subject
tombstones, effective times, reason category, replacement reference,
compromise interval, source sequence, and evidence commitment; immutable
`kid`/thumbprint/purpose and key-lifecycle/cutover history; exact historical
public verification-key bytes or an immutable historically resolvable
exact-byte reference for each surviving supported dependency; active source,
Connection, suspension, and application-fence causes; required supported
historical evidence indexes; and bounded safe forensic fork/rollback/recovery
evidence.

An evictable cache MUST NOT be a floor. A normal database record restored in
the same ordinary backup domain as all other floor state MUST NOT alone satisfy
rollback detection. A protected monotonic counter, append-only control record,
independently administered linearizable store, or equivalent qualified
mechanism MAY implement the external anchor; no particular product is required.

**Applies to.** Enrollment, chain advancement, current evaluation, cache,
backup, restore, replication, restart, retention, history, and recovery.

**Lifecycle/state impact.** Every accepted transition monotonically advances or
preserves the complete floor and independent generation lower bound; no cache
or restore may lower it.

**Semantic failure.** Missing, corrupt, rolled-back, partially restored, or
unconfirmed floor/anchor evidence MUST make the domain non-authorizing and
enter quarantine or recovery without cache fallback or reset.

**Sources:** H-01, H-03, H-05, H-07, H-09, H-10, H-11, H-14.
**Gaps:** GB-029, GB-030, GB-031, GB-032, GB-033.

## REQ-TRUST-0013 - Floor advancement is linearizable, atomic, and fenced

**Requirement.** Before candidate Trust evidence may contribute to current
authority, a verifier MUST in order: safely bound and parse it; resolve the
semantic continuity domain and exact release, profiles, domains, approved
bootstrap/root/key, and representation transition; read both current chain
heads, cross-binding, and generation; verify signatures and semantic digests,
complete coverage, exact sequences and predecessors, freshness and time,
key/root and subject transitions, and absence of fork, reversal, reset, or
substitution; compute the complete next floors, lineage, subject/key effects,
application fences, and external generation; atomically compare-and-advance
against the exact old generation and both exact old heads; and durably confirm
the floor and external generation anchor.

Only after that confirmation MAY the candidate become a current-authority
input. If all affected Connection or subject projections cannot change in the
same physical transaction, the floor commit MUST first install a durable
non-authorizing fence, projections MUST apply idempotently, and only a second
verified commit MAY clear the fence. A floor MUST NOT advance while any stale
projection can authorize.

A domain is current only while its complete floor and verified snapshot are
fresh and all fences are clear. Stale, unavailable, quarantined, or recovery-
pending conditions MUST be non-authorizing for new current authority; cache
presence and an uncommitted candidate MUST NOT constitute an authority state.

**Applies to.** Snapshot and metadata/key successor processing, subject effects,
Connection projections, floor storage, fencing, and current reads.

**Lifecycle/state impact.** One linearizable commit is the sole activation
boundary for new Trust evidence; partial work remains fenced and
non-authorizing.

**Semantic failure.** Failed or ambiguous validation, comparison, write, or
confirmation MUST yield no permissive advance; the verifier MUST reread exact
state or quarantine and MUST NOT return cached success.

**Sources:** H-01, H-02, H-05, H-07, H-10, H-11. **Gaps:** GB-029,
GB-031, GB-032, GB-033.

## REQ-TRUST-0014 - Multi-process and multi-node current reads share one authority floor

**Requirement.** All verifiers for one semantic continuity domain MUST use
either one shared linearizable durable floor or one fenced writer with
equivalent linearizable current reads at least at the committed external
generation. A stale replica, minority partition, isolated process, stale cache,
or unconfirmed local winner MUST NOT authorize new current work.

For concurrent exact same successors, one compare-and-advance MUST win and each
loser MUST reread both heads; exact sequence, digest, cross-binding, and
generation equality MUST converge idempotently. Concurrent different valid
successors MUST establish attempted equivocation and quarantine the domain even
if one local compare-and-advance committed. The committed winner MUST NOT
continue to authorize after the conflicting proof is known.

**Applies to.** Multiple processes, nodes, regions, replicas, partitions,
concurrent publication, and failover.

**Lifecycle/state impact.** One authority floor and generation order all
current use; fork evidence durably fences every candidate branch.

**Semantic failure.** Stale/minority authorization, divergent successor
selection, unconfirmed winner use, or non-linearizable reads MUST fail closed
and quarantine affected current authority.

**Sources:** H-01, H-02, H-07, H-11. **Gaps:** GB-031, GB-033.

## REQ-TRUST-0015 - Crash, restart, and restore preserve the floor

**Requirement.** A crash before floor commit MUST leave the candidate
non-authorizing. If a candidate floor compare-and-advance may have committed but
its acknowledgement was lost, recovery MUST reread the authoritative external
generation, snapshot sequence/digest, metadata/key sequence/digest, exact
cross-binding, and applicable transition and fence state. If that reread proves
exact equality with the intended complete committed successor, the operation
MUST be treated as already committed. It MUST NOT submit another competing
successor, increment again, choose a new branch, reset the floor, downgrade to
an old snapshot, or reinterpret the exact successful commit as noncommit. If
exact complete equality cannot be proven, the domain MUST fail closed and
quarantine or recover under the existing rules.

A crash after floor/fence commit but before projections MUST leave the domain
non-authorizing and resume idempotent application.

Before current use after restart, the verifier MUST load enrollment, continuity
lineage, external generation anchor, both cross-bound floors, key/subject
history, clock evidence, and application/fence state. Cache loss MUST NOT change
authority. Store unavailability MUST deny current use with no cached-success
fallback. A missing enrolled floor or corrupt floor MUST quarantine. Backup
generation regression, backup ahead of its external anchor, partial restore,
mismatched heads, or split brain MUST quarantine until exact state is proven or
approved recovery commits; branch choice by timestamp or arrival MUST NOT
occur.

**Applies to.** Crash boundaries, lost acknowledgement, process restart, cache
loss, backup/restore, replicas, partial writes, corruption, and split brain.

**Lifecycle/state impact.** Durable committed evidence alone survives restart;
an exact lost-ack reread converges idempotently on the already committed
successor, while ambiguous or incomplete application remains fenced and
non-authorizing.

**Semantic failure.** Any inability to prove the exact complete committed
generation and both heads MUST deny current authority and MUST NOT reset,
bootstrap, prefer a branch, or reconstruct from cache.

**Sources:** H-01, H-03, H-07, H-10, H-11. **Gaps:** GB-029, GB-031,
GB-033.

## REQ-TRUST-0016 - Freshness and clock bounds are exact

**Requirement.** Current production/Governed snapshot use MUST enforce these
baseline limits exactly:

- maximum future snapshot generation/issuance skew is 60 seconds;
- maximum snapshot interval is 5 minutes from signed `generatedAt` to exclusive
  `nextUpdate`, with `generatedAt` strictly before `nextUpdate`;
- current use requires `now < nextUpdate`; `now >= nextUpdate` is stale;
- current use also requires the selected profile's independent maximum age not
  to be reached;
- there is no post-`nextUpdate` or expiry grace and skew MUST NOT extend either;
- there is no offline new Governed authority; and
- trusted wall-clock movement backward by more than 60 seconds relative to the
  durable maximum trusted observation creates clock ambiguity and quarantine
  until trusted time is restored.

The verifier MUST use a trusted wall clock, MAY use a monotonic elapsed-time
source within one process lifetime, and MUST durably retain the maximum trusted
wall-clock observation. A monotonic source MUST NOT be assumed to bridge
restart. `nearing_expiry` or an equivalent operational indication MAY trigger
refresh but MUST NOT create weaker freshness, grace, or authority.
Key `notBefore` MUST be an inclusive eligibility start, but future-skew
tolerance MUST NOT create authority before the authoritative serialization
boundary. Key `expiresAt` MUST be exclusive, and equality MUST be expired.

**Applies to.** Snapshot generation, current evaluation, expiry, refresh,
restart, clock rollback, and offline operation.

**Lifecycle/state impact.** Reaching `nextUpdate` makes the snapshot stale and
non-authorizing; clock ambiguity quarantines current use without changing
historical facts or manufacturing revocation.

**Semantic failure.** Stale, overlong, beyond-skew, offline, or clock-ambiguous
evidence MUST deny new current authority without configurable weakening,
cached-success fallback, or automatic subject revocation.

**Sources:** H-05, H-07, H-10, H-11. **Gaps:** GB-032, GB-033.

## REQ-TRUST-0017 - Future-dated candidates remain non-authorizing until rechecked and committed

**Requirement.** Let `G` be signed `generatedAt` and `O` the first trusted local
observation of the exact candidate. If `G > O + 60 seconds`, the verifier MUST
reject the candidate without advancing either floor. If
`O < G <= O + 60 seconds`, the verifier MAY retain the exact bytes only as
non-authorizing pending evidence or MAY conservatively reject and refetch. A
pending candidate MUST NOT become current, advance the active snapshot floor,
create Connection authority, authorize Invocation or Approval use, begin an
effect, or block/displace a valid emergency successor.

At or after `G`, trusted time and both heads MUST be reread, and signature/key
authorization, predecessor, fork evidence, freshness and maximum age, coverage,
subject transitions, application fence, and intervening successor state MUST be
fully rechecked. Only the later linearizable commit establishes activation
boundary `A`, where `A` is no earlier than both supported `G` and `O` bounds.

**Applies to.** Future-dated snapshots, pending storage, delayed activation,
refresh, emergency succession, and historical time analysis.

**Lifecycle/state impact.** Within-skew evidence remains pending or rejected;
only a fresh complete recheck and commit can make it current.

**Semantic failure.** Immediate use, early floor advance, skipped recheck, or
manufactured earlier authority/effect from future skew MUST fail closed and
MUST NOT create historical time evidence.

**Sources:** H-02, H-05, H-07, H-10, H-11. **Gaps:** GB-031, GB-032,
GB-033.

## REQ-TRUST-0018 - Subject effect begins only at supported boundaries

**Requirement.** Current subject revocation, suspension, or other narrowing
effect MUST begin no earlier than both current activation boundary `A` and the
subject's inclusive effective boundary `E`. A claimed `E` before `A` MUST apply
to current narrowing at commit when otherwise valid but MUST NOT retroactively
prove that the verifier possessed or applied the event earlier. Earlier
historical effect MUST require independently retained authoritative chain,
event, or approved compromise evidence; without it, that earlier boundary MUST
be historically indeterminate.

An explicitly temporary suspension end MUST be exclusive. At that boundary the
suspension MAY clear only from fresh committed evidence plus a complete current
authority recheck. Terminal revocation or compromise MUST NOT expire, clear by
omission, or reverse automatically.

**Applies to.** Subject entries, snapshot activation, suspension expiry,
revocation/compromise history, and current Connection gates.

**Lifecycle/state impact.** Current effect is serialized at supported `A` and
`E` boundaries; temporary clearing requires a new verified commit, while
terminal effects remain monotonic.

**Semantic failure.** Backdated application without independent evidence,
automatic terminal expiry, omission-based clearing, or equality treated as
still suspended/active contrary to the boundary MUST fail closed.

**Sources:** H-03, H-05, H-07, H-08, H-10, H-11. **Gaps:** GB-031,
GB-032, GB-033.

## REQ-TRUST-0019 - Current revocation consequences are subject- and scope-specific

**Requirement.** Current revocation processing MUST preserve at least these
distinct subjects and consequences:

- issuer, root, or Trust-source compromise MUST quarantine the authenticated
  affected scope and deny its new Connection/Invocation authority;
- snapshot-signing-key compromise MUST stop acceptance of that feed and require
  an approved anchor/recovery source;
- authentication key or credential-binding revocation/compromise MUST deny the
  current request and terminally revoke affected Connection bindings under
  H-05/H-07;
- Passport, Agent, or execution-identity revocation/compromise MUST deny new
  authority and terminally revoke affected Connection bindings;
- Connection revocation MUST create the terminal H-07 consequence and deny new
  Invocation;
- Install Grant revocation MUST follow the H-06 redemption/revocation winner;
- Approval-purpose principal, key, issuer, or revocable-source
  revocation/compromise MUST make affected available Approval unusable or
  terminally revoked as H-08 permits, without changing consumed Approval;
- another proof-purpose key event MUST deny its affected current proof use and
  prohibit new proof creation at or after the boundary without cross-purpose
  fallback;
- retirement MUST prohibit current authority and new proof creation while
  preserving eligible earlier verification;
- replacement MUST NOT transfer old authority automatically; and
- suspension MUST deny current use and create the applicable source-owned H-07
  suspension without rewriting its historical interval.

Subordinate consequences MUST follow authenticated declared scope and MUST NOT
be inferred from name similarity, key adjacency, common issuer, or shared
storage.

**Applies to.** Current subject evaluation, Connection/Invocation gates,
Approval use, Install Grant races, proof keys, replacement, and suspension.

**Lifecycle/state impact.** Each authoritative event applies only its accepted
subject-specific current transition or fence; existing Task/Result history and
unrelated subjects remain unchanged.

**Semantic failure.** Unknown scope, inferred subordinate effect, missing
authority, or subject confusion MUST deny the affected operation without
fabricating broader revocation or permissive fallback.

**Sources:** H-02, H-05, H-06, H-07, H-08, H-09, H-10, H-11.
**Gaps:** GB-030, GB-031, GB-033.

## REQ-TRUST-0020 - Current proof use, new proof creation, and historical verification are separate

**Requirement.** A verifier MUST keep separate: current use of proof bytes as
one input to a present authority intersection; creation/materialization of new
proof bytes as a signing act; and historical verification of already-existing
immutable proof bytes. A retired, revoked, compromised, expired, or otherwise
ineligible key MUST NOT establish current proof use or create new proof bytes at
or after its applicable boundary. Already-existing proof bytes MAY be assessed
only under their original release/profile, actual key identity, trusted
historical interval, retained key/revocation history, and compromise rules.

Historical success MUST NOT establish present authority, and the ability to
verify an earlier proof MUST NOT make its key active or eligible to sign now.

**Applies to.** Every Ghost Bridge proof purpose, Receipt materialization,
current request checks, key retirement/revocation, archives, and historical
verification.

**Lifecycle/state impact.** Current ineligibility narrows present use and new
signing; historical classification observes old evidence without changing any
key, authority, Task, Result, or Approval state.

**Semantic failure.** Treating the three operations as equivalent, using a
verification-only key to sign, or importing historical validity into current
authority MUST fail closed without key/profile fallback.

**Sources:** H-02, H-03, H-05, H-09, H-10, H-11. **Gaps:** GB-026,
GB-028, GB-030, GB-031.

## REQ-TRUST-0021 - Revocation application and Invocation acceptance share an order

**Requirement.** The durable Trust floor/application fence and H-07 Invocation
acceptance MUST serialize through one shared authority epoch or a proven
equivalent fence. If application of an effective revocation or compromise
commits first, the new Invocation MUST be denied. If H-07 Task acceptance
commits first using then-current fresh evidence, the Task MUST remain
permanently accepted history and later evidence MUST NOT delete it, restore
Approval, rewrite Result, deny that a proven effect occurred, or fabricate a
different acceptance order.

A later-discovered event with an earlier effective boundary MAY change the
historical classification and MAY submit only the pre-bound H-09 authority-
withdrawal stop trigger for remaining work. It MUST NOT rewrite Task/Result
truth. An ordinary prospective revocation SHOULD use its actual authoritative
commit boundary; backdated compromise treatment MUST use REQ-TRUST-0022 rather
than pretend earlier verifier observation.

**Applies to.** Revocation/compromise commit, final Invocation acceptance,
Task birth, Approval consumption, remaining-work stop triggers, and recovery.

**Lifecycle/state impact.** Exactly one serialized winner controls new Task
birth; later evidence may narrow remaining work or history classification but
cannot reverse a committed Task or Result.

**Semantic failure.** Unordered or stale acceptance, post hoc Task deletion,
Approval restoration, Result rewrite, or retroactive observation MUST fail
closed and preserve the provable committed order.

**Sources:** H-01, H-05, H-07, H-08, H-09, H-11. **Gaps:** GB-031,
GB-033.

## REQ-TRUST-0022 - Compromise evidence preserves interval and knowledge quality

**Requirement.** Every compromise claim MUST bind an authenticated source,
affected scope, knowledge quality, and interval, and MUST have these exact
semantic consequences:

| Evidence                                                   | Current consequence                           | Historical proof consequence                                                                                     |
| ---------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Prospective revocation at `R` without compromise assertion | affected authority ineligible at or after `R` | proof interval wholly before `R` may remain eligible; at or after `R` is ineligible                              |
| Known compromise start `C`                                 | affected authority terminal or quarantined    | interval wholly before `C` may remain eligible; wholly at or after `C` is invalid; crossing `C` is indeterminate |
| Bounded possible compromise `[C1,C2)`                      | affected authority invalid or quarantined     | before `C1` may remain eligible; at or after `C2` is invalid; overlap is indeterminate                           |
| Unknown compromise start                                   | affected authority invalid or quarantined     | dependent proofs are indeterminate unless independent evidence places them outside affected scope                |

Issuer, root, or Trust-source compromise MUST apply the interval only to
authenticated dependent scope; independently anchored facts remain separately
assessable. A timestamp asserted solely by the potentially compromised signer
MUST NOT prove that proof creation preceded compromise.

**Applies to.** Key, issuer, root, Trust-source, Agent/Passport, and other
subject compromise; Receipt history; current fencing; and incident recovery.

**Lifecycle/state impact.** Authenticated compromise immediately narrows or
fences affected current authority; historical bytes and Task/Result facts remain
immutable while interval classifications may change.

**Semantic failure.** Missing source/scope/quality/interval, boundary-crossing
evidence, or reliance on signer-only time MUST produce the applicable invalid or
indeterminate result and MUST NOT be resolved by optimistic inference.

**Sources:** H-03, H-05, H-07, H-09, H-10, H-11. **Gaps:** GB-028,
GB-030, GB-031.

## REQ-TRUST-0023 - Historical Receipt verification is multi-axis

**Requirement.** Historical Receipt verification MUST return distinct
conclusions for at least: bounded structural parse; exact original release,
profile, purpose, and semantic context; cryptographic validity; exact `kid`,
thumbprint, purpose, issuer and Passport/key authorization identity; proof
materialization-time eligibility; execution and terminal authority history;
semantic Task/Result/output/effect binding; historical revocation/compromise
relationship; current retrievability/disclosure; and present authority.

The present-authority axis MUST always be false for the historical-verification
result itself. The axes MUST NOT be collapsed to one boolean, and failure or
indeterminacy on one axis MUST NOT be hidden by success on another.

**Applies to.** Receipt archives, offline and online historical analysis,
verification results, support tooling, and disclosure assessment.

**Lifecycle/state impact.** The result records evidence conclusions only and
creates no current or historical object transition.

**Semantic failure.** A single overloaded valid result, omitted required axis,
or inferred present authority MUST be rejected as an inadequate historical
assessment.

**Sources:** H-02, H-03, H-09, H-10, H-11, H-12, H-14. **Gaps:** GB-028.

## REQ-TRUST-0024 - Aggregate historical classifications use the accepted vocabulary

**Requirement.** The aggregate historical assessment MUST use exactly these
accepted semantic classifications:

- `historically_verified` means original context, cryptography, key
  eligibility, semantic binding, and relevant history are complete and
  favorable;
- `historically_verified_with_current_revocation` means evidence was valid at
  the relevant historical times but its key or subject is not valid for current
  authority;
- `historically_invalid` means a definitive signature, binding, eligibility,
  or effective-time failure exists;
- `historically_indeterminate` means required bytes, trusted time, key history,
  snapshot coverage, compromise interval, terminal evidence, or chain evidence
  is incomplete or crosses an uncertainty interval; and
- `historically_unsupported` means the original immutable release/profile is
  known but unsupported under the applicable H-14 support window.

These names MUST remain governance semantic names and MUST NOT be claimed by
D1-06 as final schema enumeration or wire spellings. None MUST grant present
authority.

**Applies to.** Aggregate historical Receipt results, retained evidence,
support-window dispatch, and later D2 representation work.

**Lifecycle/state impact.** Classification annotates assessment only and does
not mutate evidence, keys, revocation state, Task, Result, or current authority.

**Semantic failure.** Unknown invented classifications, one-boolean collapse,
favorable classification without all required evidence, or current authority
derived from any classification MUST fail closed.

**Sources:** H-03, H-09, H-10, H-11, H-14. **Gaps:** GB-028.

## REQ-TRUST-0025 - Historical Receipt conclusions preserve immutable proof and history boundaries

**Requirement.** Historical Receipt verification MUST preserve all of the
following: a current revocation alone does not invalidate a Receipt proven
valid before a prospective revocation; later known compromise follows
REQ-TRUST-0022; a Receipt's revocation-state claim is a consistency claim and
not independent Trust proof; signer issue/completion time alone is not proof
creation time; every separately materialized proof has its own key/time
eligibility; a retired key MAY verify an eligible earlier proof but MUST NOT
create a later proof; missing historical revocation entry MUST NOT mean valid or
active unless complete retained snapshot coverage proves absence for the
relevant interval; current disclosure denial or minimization does not make the
Task/Result false; and historical success never restores current authority.

A mismatch MUST classify Receipt evidence without changing the authoritative
Task/Result. Missing original evidence MUST NOT be inferred from a current key
set, current snapshot, current schema, current defaults, or a neighboring
object.

**Applies to.** Every historical Receipt proof, current revocation discovered
after proof creation, rotation, incomplete archives, disclosure changes, and
Task/Result comparison.

**Lifecycle/state impact.** Later Trust evidence may change the supported
historical classification but never proof bytes, semantic Receipt identity,
Task acceptance, Result, effect truth, or present authority.

**Semantic failure.** Retroactive invalidation without interval evidence,
optimistic absence, current-state backfill, proof overwrite, or authority
restoration MUST fail closed as invalid, indeterminate, or unsupported as the
evidence requires.

**Sources:** H-02, H-03, H-09, H-10, H-11, H-14. **Gaps:** GB-028,
GB-031, GB-033.

## REQ-TRUST-0026 - Recovery restores or appends proven continuity without reset

**Requirement.** Recovery MUST either restore the exact proven continuity
domain, representation lineage, both cross-bound floors, external generation
anchor, subject/key history, and application state from a verified source, or
use a human/administrator-approved recovery record that binds the semantic
domain and affected representations, cause, last independently retained heads,
exact successor heads, root and recovery evidence, lineage, affected historical
classification, new recovery generation, approver, approval time, and immutable
sign-off.

Recovery MUST start non-authorizing, preserve every independently retained
floor, record and classify any fork and rejected branch, use a new recovery
generation, and commit through the anti-rollback anchor before authority can be
reevaluated. Neither recovered head MAY be below any independently retained
trusted lower bound. Issuer or root compromise recovery MUST require
out-of-band human approval.

Recovery MUST NOT reset a sequence; create an unlinked namespace, release, or
profile; reuse `kid`; delete terminal evidence; erase a fork; revive a revoked
Connection; restore consumed Approval; recreate a missing Task; reinterpret a
Result; create an implicit replacement Connection; or convert missing state
into bootstrap.

**Applies to.** Missing/corrupt floors, backup regression, fork, split brain,
root/issuer compromise, lost predecessors, partial restore, and continuity
transition after incident.

**Lifecycle/state impact.** Recovery remains fenced until one complete
anti-rollback commit restores or appends provable state; it may retain
quarantine when proof is insufficient.

**Semantic failure.** Unapproved, lower, incomplete, reset, authority-reviving,
or history-erasing recovery MUST be rejected and remain non-authorizing.

**Sources:** H-01, H-03, H-05, H-07, H-08, H-09, H-10, H-11.
**Gaps:** GB-028, GB-029, GB-030, GB-031, GB-032, GB-033.

## REQ-TRUST-0027 - Internal failure semantics remain precise and fail-closed

**Requirement.** Implementations MUST preserve enough internal semantic
distinctions to enforce safely, including unknown issuer or current key;
unsupported H-10 profile; unapproved continuity transition; missing bootstrap
checkpoint or enrolled floor; stale, within-skew future, or beyond-skew future
snapshot; snapshot or metadata/key rollback, fork, skip, or wrong predecessor;
cross-bound head mismatch; unauthorized root change; `kid` substitution;
same-sequence changed digest; invalid signature/digest; subject-transition or
point-status/snapshot conflict; floor write or confirmation ambiguity; store
unavailability, corruption, or rollback; clock ambiguity; incomplete historical
evidence; and authoritative revocation or compromise.

Unavailability, staleness, rollback suspicion, clock ambiguity, or storage
failure MUST NOT be fabricated as subject revocation. Each MUST fail closed
using its own integrity, freshness, availability, or recovery classification.
This chapter MUST NOT assign final public routes, HTTP statuses, headers, media
types, error identifiers, retry behavior, redaction vocabulary, timing behavior,
or observability fields; H-12/D1-07 retains that work.

**Applies to.** Validation, storage, current gates, incident response,
historical results, internal diagnostics, and later public-error mapping.

**Lifecycle/state impact.** Each failure produces only its accepted denial,
fence, quarantine, recovery, invalid, indeterminate, or unsupported consequence;
it creates no invented terminal subject transition.

**Semantic failure.** Collapsing distinctions in a way that authorizes,
mutates history, fabricates revocation, or leaks protected facts MUST fail
closed; safe public collapsing remains D1-07/H-12 work.

**Sources:** H-02, H-03, H-05, H-07, H-09, H-10, H-11, H-12.
**Gaps:** GB-028, GB-029, GB-030, GB-031, GB-032, GB-033.

## REQ-TRUST-0028 - Security history retention is dependency-bounded and secret-minimized

**Requirement.** Trust/security history MUST retain all evidence required by
surviving current authority, replay prevention, Receipt verification,
Task/Result and Approval history, key and revocation history, audit/dispute,
recovery, and H-14 support dependencies. It MUST preserve complete surviving
lower bounds, terminal evidence, and historical references while remaining
bounded and secret-minimized.

For every surviving supported historical proof dependency, the retained
evidence MUST include either the exact public verification-key or public JWK
bytes under their original H-10 identity, or an immutable historically
resolvable reference whose retention contract guarantees recovery of those
exact original public bytes throughout the dependency. The evidence MUST also
preserve the exact `kid`, thumbprint, one-purpose binding, issuer, validity
interval, activation/cutover/retirement history, and applicable source sequence
and authorization history. A thumbprint alone MUST NOT be treated as sufficient
material for Ed25519 verification. A current key set, current JWKS, current key
lookup, current schema, or default MUST NOT replace or reconstruct missing
historical public-key bytes.

Concrete durations and service/archive/publication windows MUST remain H-14
decisions and MUST NOT be invented here. Reusable credentials, bearer tokens,
private signing keys, raw grants, unrestricted prompts or inputs, hidden
reasoning, private memory or policy, cross-tenant identifiers beyond necessity,
and unrestricted Result/output content MUST NOT be retained merely to preserve
Trust history. Private signing material or signing secrets MUST NOT be retained
merely to make historical verification possible. Opaque purpose-specific
references or H-10 commitments SHOULD be used where accepted semantics permit,
but a digest or reference MUST NOT become a bearer capability. Deletion or
disclosure denial MUST NOT create authority or prove an event did not exist.

**Applies to.** Floors, tombstones, archives, backups, forensic evidence,
historical Receipt support, disclosure, minimization, and deletion.

**Lifecycle/state impact.** Retention preserves required proof of existing
history without creating a subject, key, Connection, Approval, Task, or Result
transition.

**Semantic failure.** Premature deletion, unbounded secret retention, content
used as authority, or history inferred after evidence loss MUST deny or make the
affected assessment indeterminate without rewriting facts.

**Sources:** H-03, H-05, H-08, H-09, H-10, H-11, H-12, H-14.
**Gaps:** GB-028, GB-029, GB-030, GB-031, GB-033.

## REQ-TRUST-0029 - Trust and Receipt Core objects are closed except at registered extensions

**Requirement.** Receipt, Trust metadata, key, revocation snapshot, point
status, checkpoint, historical-result, continuity-transition, and recovery
semantic objects MUST remain closed Core except at H-13 registered extension
points. An authority- or history-critical extension MUST be selected, known,
understood, included in the applicable H-10 semantic projection, and limited to
narrowing or expressing already-authorized semantics.

Unknown required semantics MUST make the affected object unusable. Unknown
optional extension data MUST NOT create Trust, Connection, Approval, Task,
execution, effect, historical, or disclosure authority. Required or
participating data MUST NOT be stripped, relocated, defaulted, or downgraded to
obtain success, and an extension MUST NOT reset continuity or anti-rollback
history.

**Applies to.** Every extension-bearing Receipt, Trust, key, revocation,
checkpoint, transition, recovery, and historical-verification object.

**Lifecycle/state impact.** Extensions create no independent state or
authority; unsupported required meaning prevents current use or historical
clean success as applicable.

**Semantic failure.** Open-Core acceptance, unknown required semantics,
unprotected critical data, stripping, fallback, widening, or continuity reset
MUST fail closed without floor advance or historical reinterpretation.

**Sources:** H-03, H-04, H-10, H-11, H-13. **Gaps:** GB-025, GB-028,
GB-029, GB-030, GB-031, GB-033.

## REQ-TRUST-0030 - Legacy evidence retains its original semantics

**Requirement.** Historical `ghostbridge/0.1-draft` Trust, Receipt, JWS,
digest, key, and revocation objects MUST retain their exact provable original
meaning. They MUST NOT be silently upgraded, relabeled, rehashed, re-signed,
assigned current H-10 domains or profiles, supplied a missing key purpose,
checkpoint, predecessor, coverage state, trusted timestamp, or continuity
floor, or mapped to a current aggregate historical classification without the
required evidence.

Verification MUST use the original proven release, projection, bytes, profile,
key identity, and history. Where required original meaning or evidence is
absent, unsupported, indeterminate, or migration/recovery-required treatment
MUST remain explicit. Any separately authorized migration MUST create new
evidence referencing the unchanged legacy object and MUST NOT rewrite or
backfill it.

**Applies to.** Legacy archives, migration assessment, compatibility,
historical verification, current implementations, and recovery.

**Lifecycle/state impact.** Legacy evidence remains immutable historical
evidence and cannot acquire current authority or current-profile meaning.

**Semantic failure.** Current-schema reinterpretation, algorithm trial,
purpose/domain backfill, chain splicing, or fabricated history MUST fail closed
as invalid, indeterminate, unsupported, or recovery-required as the proven
evidence permits.

**Sources:** H-03, H-04, H-09, H-10, H-11, H-13, H-14. **Gaps:** GB-028,
GB-029, GB-030, GB-031, GB-032, GB-033.

## Non-normative production-grade attack review

This review is planning evidence only. It adds no requirement and closes no
gap.

| Failure path                                                                                                                | Normative coverage                                             |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Trust evidence becomes authentication, Connection, authorization, Approval, Task, execution, or Agent-to-Agent authority    | REQ-TRUST-0001, REQ-TRUST-0019, REQ-TRUST-0020                 |
| First signed snapshot is accepted as TOFU; missing enrolled floor becomes new enrollment                                    | REQ-TRUST-0002, REQ-TRUST-0003, REQ-TRUST-0012, REQ-TRUST-0015 |
| Release upgrade, namespace rename, profile change, downgrade, or epoch change resets continuity or sequence                 | REQ-TRUST-0002, REQ-TRUST-0007, REQ-TRUST-0030                 |
| Missing snapshot subject is treated active without complete exact coverage and terminal-history proof                       | REQ-TRUST-0004                                                 |
| Point status overrides snapshot, advances a floor, replaces chain history, or turns unknown active                          | REQ-TRUST-0005                                                 |
| Generic `revocation_signing`, Trust proof, or legacy JWS aliases accepted status/snapshot proof                             | REQ-TRUST-0006, REQ-TRUST-0030                                 |
| Same-sequence changed digest, lower sequence, skipped sequence, or wrong predecessor is accepted                            | REQ-TRUST-0007, REQ-TRUST-0008                                 |
| Higher sequence, timestamp, arrival order, or majority selects a fork branch                                                | REQ-TRUST-0007, REQ-TRUST-0014, REQ-TRUST-0015                 |
| Current key set or independently newer metadata/snapshot head authorizes without complete cross-bound history               | REQ-TRUST-0008, REQ-TRUST-0013                                 |
| Same `kid` changes material; one thumbprint serves multiple purposes; replacement inherits authority                        | REQ-TRUST-0009, REQ-TRUST-0019                                 |
| New key signs before 6-minute prepublication; ordinary dual signing occurs; old key signs at/after cutover                  | REQ-TRUST-0010                                                 |
| Old key becomes active after metadata rollback or emergency rotation uses weaker/old-key fallback                           | REQ-TRUST-0010, REQ-TRUST-0011                                 |
| Backup rolls floor and anchor backward together; normal cache/database row is treated as sufficient floor                   | REQ-TRUST-0012, REQ-TRUST-0015                                 |
| Floor advances before atomic durable confirmation or while stale projections can authorize                                  | REQ-TRUST-0013                                                 |
| Stale replica, minority partition, or local CAS winner authorizes; conflicting successor is ignored                         | REQ-TRUST-0014                                                 |
| Crash/lost acknowledgement causes competing commit; restart/cache loss/recovery revives old state                           | REQ-TRUST-0015                                                 |
| Freshness equality is current, grace extends `nextUpdate`, offline new authority proceeds, or clock rollback revives Trust  | REQ-TRUST-0016                                                 |
| Within-skew future snapshot is used immediately or manufactures earlier subject history                                     | REQ-TRUST-0017, REQ-TRUST-0018                                 |
| Terminal revocation expires or disappears by omission; temporary suspension clears without fresh recheck                    | REQ-TRUST-0018                                                 |
| Revocation of one subject/key is inferred to unrelated subordinates or purposes                                             | REQ-TRUST-0019                                                 |
| Retired/revoked/compromised key establishes current proof use or creates a new proof                                        | REQ-TRUST-0019, REQ-TRUST-0020                                 |
| Revocation/Invocation race deletes accepted Task, restores Approval, rewrites Result, or denies a proven effect             | REQ-TRUST-0021                                                 |
| Signer timestamp proves pre-compromise creation; current revocation retroactively invalidates all prior proof               | REQ-TRUST-0022, REQ-TRUST-0025                                 |
| Historical verification is one boolean or restores present authority                                                        | REQ-TRUST-0023, REQ-TRUST-0024                                 |
| Missing historical snapshot/key/revocation evidence is inferred from current state                                          | REQ-TRUST-0023, REQ-TRUST-0025, REQ-TRUST-0030                 |
| Recovery lowers a floor, erases fork/history, revives Connection, restores Approval, recreates Task, or reinterprets Result | REQ-TRUST-0026                                                 |
| Store/freshness/clock failure is fabricated as subject revocation or falls back to cache                                    | REQ-TRUST-0027                                                 |
| Private keys, credentials, tokens, unrestricted prompts, hidden reasoning, or unrestricted Result content enter history     | REQ-TRUST-0028                                                 |
| Unknown/stripped extension widens authority or resets history                                                               | REQ-TRUST-0029                                                 |
| Current schema, domain, purpose, timestamp, or checkpoint is applied to `0.1-draft` evidence                                | REQ-TRUST-0030                                                 |
| Final route, method, status, header, media type, public error, redaction, timing, or observability rule is invented here    | REQ-TRUST-0027; delegated to H-12/D1-07                        |

## Non-normative D2 traceability

This section identifies required later assets; it creates none and closes no
gap.

`D2-01` must later define Trust bootstrap/enrollment, issuer metadata and key
history, revocation snapshot, point status, checkpoint/predecessor, continuity
transition, durable-floor and recovery evidence, subject-effect, Receipt
proof/signature, and historical-verification result representations derived
from the applicable `REQ-TRUST-*` and `REQ-RCPT-*` requirements.

`D2-02` must later define executable key lifecycle, snapshot/checkpoint,
metadata/key-chain, cross-bound atomic transition, freshness/current/stale/
quarantined/recovery, subject revocation/suspension, and recovery models without
changing these semantic requirements.

`D2-03` must later provide byte-exact static cross-language vectors for JWK
thumbprints; point-status digest/signature; snapshot digest/signature;
predecessor/checkpoint digest; metadata/key proof chains; Unicode; numbers;
null/absence; key ordering; exact contexts; wrong domains, purposes, keys,
tenants, audiences, and targets; and one-field mutations.

`D2-04` must later cover at least first use without an anchor; missing enrolled
floor; lower, duplicate, conflicting, skipped, and wrong-predecessor sequences;
forks; point-status conflict; stale equality; within-skew and beyond-skew future
snapshots; clock rollback; store unavailability; crash before compare-and-
advance; lost acknowledgement; crash after fence; stale replica; concurrent
same and conflicting successors; backup rollback; partial restore; split brain;
key prepublication/cutover/retirement; `kid`/material and thumbprint/purpose
substitution; emergency recovery; continuity transition; revocation versus
Invocation acceptance; proof intervals crossing compromise; missing proof-time
or snapshot history; offline historical verification; and current disclosure
denial with otherwise verifiable retained proof.

Later schemas, executable machines, vectors, fixtures, conformance assets, and
security review do not exist by virtue of this chapter. Final network routes,
URIs, methods, statuses, media types, redirects, caching or polling headers,
retry headers, public error identifiers or detail schemas, TLS/DNS mechanics,
response-size rules, log-field names, redaction, timing, and observability
cardinality remain D1-07/H-12. Concrete retention, archive, publication,
support, and release windows remain H-14. No `GB-*` gap is closed by this
prose.
