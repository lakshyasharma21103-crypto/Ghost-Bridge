# Receipts

This chapter defines the semantic identity, terminal binding, evidence
commitment, proof materialization, verification, time evidence, and historical
use of an Execution Receipt for `ghostbridge/e1.r0-draft.1`. It defines neither
wire or schema member names nor transport, public-error, executable-state-
machine, concrete retention-window, deployment, or release behavior.

## REQ-RCPT-0001 - Receipt is downstream evidence only

**Requirement.** An Execution Receipt MUST be downstream cryptographic and
evidentiary representation of one already terminal, immutable H-09 Task/Result
snapshot. Task MUST remain authoritative for lifecycle state, and Result MUST
remain authoritative for terminal outcome, output, and effect truth. A Receipt
MUST NOT create a Task or terminal state; authorize execution, retry,
cancellation, compensation, retrieval, or another effect; create or restore a
Connection, authorization, or Approval; consume Approval; repeat work or an
external effect; or change Result truth.

A definitely rejected pre-Task Invocation MUST create no Execution Receipt for
accepted work. Receipt disagreement with a Task or Result MUST NOT select,
synthesize, or repair a different lifecycle or terminal truth.

**Applies to.** Receipt creation, storage, delivery, retrieval, verification,
recovery, and every Task/Result/Receipt comparison.

**Lifecycle/state impact.** Receipt operations create no Task, Result,
Connection, Approval, or execution transition and leave the terminal Task and
Result unchanged.

**Semantic failure.** A Receipt presented as authority, terminality, or a
competing truth MUST be rejected or quarantined as Receipt evidence without
reopening, rerunning, or rewriting the provable Task/Result outcome.

**Sources:** H-01, H-02, H-07, H-08, H-09, H-11. **Gaps:** GB-025, GB-028.

## REQ-RCPT-0002 - Receipt policy, identity, and input snapshot are fixed at terminal commit

**Requirement.** Receipt policy MUST be fixed in the accepted H-09 Task bundle.
For each terminal Task whose accepted policy selects or requires a Receipt, the
terminal Task/Result transaction MUST already bind exactly one canonical
semantic Receipt identity, one issuance/materialization intent, and one
immutable Receipt-input snapshot. For every other terminal Task, that
transaction MUST bind the explicit semantic no-Receipt disposition.

Receipt identity MUST NOT originate at signer execution, proof generation,
delivery, polling, retrieval, or verification. Final proof bytes MAY
materialize after terminal commit. Materialization, delivery, restart, and
acknowledgement retries MUST derive from the same immutable snapshot and
converge on the same semantic Receipt identity; they MUST NOT create another
semantic Receipt or weaken the accepted Receipt policy.

**Applies to.** Task acceptance policy, terminal Task/Result commit, Receipt
identity allocation, materialization intent, recovery, and retry.

**Lifecycle/state impact.** Terminal commit fixes one Receipt identity and
intent or the no-Receipt disposition; later Receipt activity changes only
Receipt proof-availability evidence and never Task or Result state.

**Semantic failure.** Missing or conflicting identity, intent, snapshot, or
no-Receipt disposition MUST make the coupling invalid or indeterminate and MUST
NOT be repaired by signer choice, current defaults, new Task execution, or a
replacement Result.

**Sources:** H-03, H-04, H-09, H-10, H-11. **Gaps:** GB-025, GB-026.

## REQ-RCPT-0003 - Complete immutable Receipt semantic projection

**Requirement.** The complete semantic Receipt projection MUST derive only
from the immutable terminal Task/Result snapshot. As applicable to the accepted
Task, selected profile, and terminal outcome, it MUST bind directly or through
immutable historically resolvable identities or commitments:

- the canonical Receipt, Task, Invocation, and Result identities;
- the exact terminal Task state, terminal Result semantic commitment, Result
  output commitment, and `zero`, `partial`, or `complete` effect
  classification;
- the exact bounded execution/effect evidence commitment, terminal
  serialization identity and time evidence, bounded attempt/checkpoint summary,
  and cancellation, timeout, or authority-withdrawal winner category;
- the exact original Connection, protocol release, selected profiles,
  capability/version, organization, tagged workspace absence or value,
  audience, and target;
- the exact Agent identity, Passport identity and immutable historical Passport
  identity, Receipt policy/profile semantic identity, and accepted action,
  Result, and output-contract references needed for interpretation;
- the Approval and authorization references where historically applicable, the
  required immutable Trust/history references, and every applicable selected
  authority- or effect-critical extension.

This requirement creates no universal member for a semantic that is only
applicable conditionally. Every required applicable semantic MUST be present.
Permitted absence MUST remain exact absence and MUST NOT mean wildcard,
current default, latest, unlimited, inherited authority, or a value recovered
from a current object.

**Applies to.** Receipt semantic identity, projection, digest input, proof
input, materialization, comparison, and historical interpretation.

**Lifecycle/state impact.** The projection is fixed by terminal commit and
remains immutable across materialization, rotation, delivery, retention, and
verification.

**Semantic failure.** A missing, extra where forbidden, mutable, substituted,
defaulted, or historically unresolvable required binding MUST invalidate or
make indeterminate the Receipt evidence and MUST NOT choose another Task,
Result, Connection, tenant, Agent, Passport, or effect fact.

**Sources:** H-02, H-03, H-04, H-07, H-08, H-09, H-10, H-11, H-13.
**Gaps:** GB-025, GB-027, GB-028.

## REQ-RCPT-0004 - Exact H-10 Receipt domains and profiles

**Requirement.** Receipt cryptography MUST use the following exact,
case-sensitive H-10 mappings and no aliases:

| Semantic operation                           | H-10 domain               | Required H-10 profiles                                                           | Signing key purpose         |
| -------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------- | --------------------------- |
| Receipt semantic commitment                  | `gb.receipt.semantic.v1`  | `gb-c14n-jcs-ijson-v1`, `gb-digest-jcs-sha256-v1`                                | none                        |
| Bounded execution/effect evidence commitment | `gb.receipt.evidence.v1`  | `gb-c14n-jcs-ijson-v1`, `gb-digest-jcs-sha256-v1`                                | none                        |
| Receipt signature/proof                      | `gb.receipt.signature.v1` | `gb-c14n-jcs-ijson-v1`, `gb-signature-jcs-ed25519-v1`, `gb-proof-jcs-ed25519-v1` | `execution_receipt_signing` |

Referenced commitments MUST retain their own exact domains:
`gb.result.output.v1`, `gb.result.semantic.v1`, and, where referenced,
`gb.task.acceptance.v1` and `gb.invocation.intent.v1`. Public-key identity MUST
use `jwk-thumbprint-rfc7638-sha256-v1`.

A generic or historical JWS, generic Trust proof, current generic
`revocation_signing` purpose, request proof, Approval proof, Passport proof,
Result digest, authorization digest, or similar bytes or key material MUST NOT
be accepted as, aliased to, or trial-verified as Receipt proof. Receipt policy
or profile names MUST NOT imply a cryptographic algorithm or H-10 profile.

**Applies to.** Receipt and nested commitment construction, selection,
signing, verification, migration assessment, and historical dispatch.

**Lifecycle/state impact.** Profiles and domains identify immutable evidence
semantics only; their validation creates no Task, Result, or authority
transition.

**Semantic failure.** An unknown, unselected, unsupported, malformed,
mismatched, inferred, substituted, downgraded, or legacy-only domain, profile,
purpose, or commitment MUST fail closed without alias, algorithm trial,
fallback, or current-default reinterpretation.

**Sources:** H-03, H-04, H-09, H-10, H-11. **Gaps:** GB-026, GB-027,
GB-028.

## REQ-RCPT-0005 - Receipt cryptographic context is exact and protected

**Requirement.** Each Receipt H-10 digest or signature semantic envelope MUST
protect the exact immutable protocol release, registered purpose, audience,
target, organization, and tagged workspace state and value. A signature
envelope MUST additionally protect the exact key ID, key purpose
`execution_receipt_signing`, approved JWK thumbprint, and proof purpose
`gb.receipt.signature.v1`. Required context MUST be present, forbidden context
MUST be absent, and values MUST compare exactly under the selected H-10 profile.

No URL, case, locale, tenant, parent, deployment, schema, or current-database
normalization or inference MAY change protected context. `null`, empty, absent,
and present values MUST remain distinct according to the registered semantic
projection. A verifier MUST NOT infer a domain, algorithm, profile, key,
purpose, or context from object shape, hash or signature length, key type,
current release, implementation helper, or a nearby supported profile.

**Applies to.** Receipt semantic and evidence digests, signature construction,
proof verification, tenant binding, key resolution, and historical
reproduction.

**Lifecycle/state impact.** Protected context binds evidence to one immutable
terminal scope; it cannot widen, transfer, or recreate that scope.

**Semantic failure.** Missing, forbidden, conflicting, normalized,
substituted, or inferred context or signer data MUST stop verification and MUST
NOT be cured by a later valid signature, key lookup, Task match, or
authorization result.

**Sources:** H-02, H-03, H-04, H-07, H-09, H-10, H-11. **Gaps:** GB-025,
GB-026, GB-027.

## REQ-RCPT-0006 - Bounded execution and effect evidence commitment

**Requirement.** The `gb.receipt.evidence.v1` commitment MUST cover the exact
bounded execution and effect evidence selected by H-09 and the accepted Task
bundle. Its projection MUST be sufficient to detect effect concealment or
substitution, `zero`/`partial`/`complete` reclassification, attempt or
checkpoint substitution, and cancellation, timeout, or authority-withdrawal
winner substitution.

The evidence projection MUST remain bounded and secret-minimized. It MUST NOT
include unnecessary credentials, bearer material, private keys, unrestricted
prompts, hidden reasoning, private memory, private policy, unrestricted provider
payloads, implementation stack traces, or unrestricted Result content merely
to make evidence verifiable. This requirement MUST NOT be interpreted as a
public evidence-detail schema; D2 owns later representation and H-12/D1-07 owns
public disclosure and redaction behavior.

**Applies to.** Receipt evidence projection, evidence commitment, terminal
snapshot, storage, archive, disclosure, and verification.

**Lifecycle/state impact.** The commitment preserves already committed effect
truth and winner evidence; it creates no effect and authorizes no retry or
compensation.

**Semantic failure.** Missing, unbounded, secret-bearing, substituted, or
reclassified evidence MUST invalidate or make indeterminate the Receipt while
leaving the authoritative terminal Task/Result and proven effects unchanged.

**Sources:** H-02, H-05, H-09, H-10, H-11, H-12, H-14. **Gaps:** GB-025,
GB-027, GB-028.

## REQ-RCPT-0007 - Proof creation is a separately eligible signing act

**Requirement.** Receipt proof creation or materialization MUST be a distinct
signing operation performed only after the immutable terminal semantic snapshot
exists. Before creating each new proof, the signer MUST establish, as
applicable, the exact semantic Receipt identity and snapshot; exact H-10 domain
and selected profiles; exact current key ID, thumbprint, and single purpose;
issuer, Passport, and key authorization history; signing-key lifecycle,
validity, revocation, and compromise eligibility at the applicable signing-time
boundary; exact organization, workspace, audience, and target context; and the
absence of a prior conflicting semantic Receipt.

A prepublished but inactive, retiring after cutover, retired, revoked,
compromised, expired, or otherwise ineligible key MUST NOT create a new Receipt
proof at or after its applicable boundary. After a permitted rotation, an
eligible active key MAY create a new proof for the same immutable semantic
Receipt. Each such proof MUST be additional immutable evidence with its own
key/time eligibility; it MUST NOT overwrite, repair, mutate, relabel, or erase
an earlier proof and MUST NOT rerun the Task, consume Approval again, create
another Result, or repeat an effect.

**Applies to.** Receipt signing, materialization retry, key rotation,
proof persistence, acknowledgement recovery, and conflicting-proof detection.

**Lifecycle/state impact.** A successful operation adds proof evidence to the
fixed Receipt identity only; failure or retry leaves Task, Result, effects,
Approval, and prior proofs unchanged.

**Semantic failure.** Unproven snapshot identity, wrong purpose or key,
ineligible signing interval, conflicting Receipt semantics, or ambiguous prior
commit MUST deny proof creation and MUST NOT fall back to another key/profile or
execution path.

**Sources:** H-03, H-05, H-07, H-08, H-09, H-10, H-11. **Gaps:** GB-026,
GB-028, GB-030, GB-031.

## REQ-RCPT-0008 - Receipt verification is ordered and fail-closed

**Requirement.** A verifier MUST apply the following semantic order to one
Receipt and MUST NOT allow success at a later phase to cure failure at an
earlier phase:

1. Bound and structurally and semantically parse the object without repair,
   coercion, deletion, normalization, or defaults.
2. Resolve independently and require the exact expected original protocol
   release, selected H-10 profiles, registered domain, proof purpose, and
   required extension semantics. No untrusted proof-supplied value MAY select
   or change an expected purpose, release, profile, context, object, or key.
3. Reconstruct the exact Receipt semantic projection, semantic envelope,
   canonical bytes, GBCF frame, and every referenced semantic, output, and
   evidence commitment/digest, then require their exact H-10 validity.
4. Before Ed25519 verification, require every applicable protected proof
   binding: proof purpose; audience; target; Receipt/object, Task, Result, and
   Connection identities; exact tenant context comprising organization and
   tagged workspace state/value; Agent and Passport identities; release/profile;
   key ID; recomputed and exactly matched JWK thumbprint; and key purpose
   `execution_receipt_signing`.
5. Resolve the trusted exact public-key record and require it to match the
   protected key ID, recomputed thumbprint, and one key purpose. Profile, key,
   key-material, and purpose fallback or trial MUST NOT occur.
6. Strictly decode the signature and verify Ed25519 over the exact H-10 frame.
7. Only after successful cryptographic verification, apply the proof's trusted
   creation/materialization-time eligibility, key lifecycle and validity,
   revocation and compromise interval, and retained historical Trust evidence.
8. Recheck semantic consistency with the authoritative retained Task, Result,
   output and effect commitments, and Connection, scope, Agent, and Passport
   history.
9. Only when the operation is a live retrieval, finally apply current
   authentication, exact scope, purpose, and disclosure authorization.

Cryptographic validity MUST NOT be treated as authentication, Connection
authority, authorization, Approval, execution permission, disclosure
permission, or historical completeness.

**Applies to.** Current proof validation, offline historical verification,
live retrieval, archive analysis, and mismatch diagnosis.

**Lifecycle/state impact.** Verification classifies evidence only and cannot
transition or restore any current authority or terminal object.

**Semantic failure.** A failure, unavailable prerequisite, or indeterminate
required fact MUST stop clean success at the affected phase and MUST NOT trigger
fallback, alternate context or key selection, alternate Task/Result selection,
disclosure, or execution.

**Sources:** H-02, H-03, H-04, H-05, H-07, H-09, H-10, H-11, H-12,
H-13, H-14. **Gaps:** GB-025, GB-026, GB-027, GB-028.

## REQ-RCPT-0009 - Materialization time uses authenticated exact or interval evidence

**Requirement.** Verification MUST keep H-07 Invocation acceptance time, H-09
terminal Result commit time, Receipt proof materialization time,
signer-asserted Receipt issue or completion time, first trusted observation
time, retained monotonic audit/checkpoint time, external trusted-time anchor,
and present verification time semantically distinct.

For one exact immutable Receipt proof digest, historical verification MUST
derive the narrowest supported exact materialization time or open/closed
interval from authenticated retained evidence. A prerequisite terminal commit
MAY establish only the lower bound its accepted ordering semantics support; a
commit that atomically binds already-created exact proof bytes MAY also provide
the supported upper ordering bound. First trusted observation MAY establish an
upper bound. Monotonic evidence MAY establish order and, with trusted anchors,
an interval. An approved external time anchor MAY establish only the exact or
bounded time its stated inclusion and accuracy semantics support. Supported
interval edges MUST remain exact as `[L,U]`, `(L,U]`, `[L,U)`, or `(L,U)` and
MUST NOT be rounded to a point.

H-09 terminal commit MUST NOT automatically be treated as exact proof creation
time. A signer-asserted timestamp alone MUST NOT establish an independent proof
time or prove that the proof preceded compromise. If a required edge is
missing, sources conflict, restart breaks ordering, the interval crosses a
revocation/compromise boundary, or the interval cannot be narrowed enough, the
affected historical time or eligibility conclusion MUST be indeterminate.

**Applies to.** Every separately materialized Receipt proof, historical key
eligibility, compromise analysis, audit evidence, restart, and archival
verification.

**Lifecycle/state impact.** Time evidence classifies a proof's history only;
it neither changes terminal time nor establishes a new current-authority
boundary.

**Semantic failure.** Invented precision, collapsed timestamps, untrusted
signer time, broken ordering, or a boundary-crossing interval MUST NOT produce a
favorable boundary-sensitive conclusion.

**Sources:** H-03, H-07, H-09, H-10, H-11. **Gaps:** GB-026, GB-028,
GB-030, GB-031.

## REQ-RCPT-0010 - Live retrieval and offline verification remain separate read operations

**Requirement.** Live Receipt retrieval MUST be currently authenticated,
exact-scope, purpose-bound, disclosure-authorized, and read-only. Possession of
Receipt bytes, a Receipt identity, proof, archive, Task identity, or Result
identity MUST NOT authenticate a caller or authorize live retrieval, protected
detail, or another action.

Offline historical verification of already retained immutable evidence MAY
proceed when the original bytes, release/profile, key and Trust history,
terminal evidence, and other required inputs exist. It MUST NOT create current
authentication, Connection, Invocation, authorization, Approval, Task,
execution, effect, retry, or disclosure authority. Current disclosure denial or
minimization MUST NOT make the immutable Task/Result false, although unavailable
required evidence MAY make the verification result unavailable or
indeterminate. Final transport, public error, timing, caching, and redaction
behavior remains H-12/D1-07 work.

**Applies to.** Receipt retrieval, polling projections, archives, offline tools,
historical verification, disclosure decisions, and retained content.

**Lifecycle/state impact.** Both operations are observations only and cause no
Task, Result, Receipt-semantic, Connection, Approval, or execution transition.

**Semantic failure.** Unauthorized live access MUST disclose no protected
Receipt facts; incomplete offline evidence MUST NOT be filled from current
state, and neither condition MAY be converted into authority or denial of the
underlying terminal truth.

**Sources:** H-02, H-03, H-05, H-07, H-09, H-11, H-12, H-14.
**Gaps:** GB-025, GB-028.

## Non-normative production-grade attack review

This review is planning evidence only. It adds no requirement and closes no
gap.

| Failure path                                                                                                                   | Normative coverage                                                  |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Receipt creates Task terminality, execution, retry, cancellation, or effect authority                                          | REQ-RCPT-0001, REQ-RCPT-0002                                        |
| Proof failure or signer retry reruns Task/effect, creates another Result, or restores Approval                                 | REQ-RCPT-0001, REQ-RCPT-0007                                        |
| Receipt ID, bytes, or archive possession grants live disclosure                                                                | REQ-RCPT-0010                                                       |
| Typed Receipt omits or substitutes Connection, Agent, Passport, tenant, audience, or target                                    | REQ-RCPT-0003, REQ-RCPT-0005, REQ-RCPT-0008                         |
| Wrong Result is bound to a valid Task, wrong Task to a valid Result, or mismatch selects another truth                         | REQ-RCPT-0001, REQ-RCPT-0003, REQ-RCPT-0008                         |
| Output changes after terminal commit; effect is concealed or reclassified among zero, partial, and complete                    | REQ-RCPT-0003, REQ-RCPT-0006, REQ-RCPT-0008                         |
| Generic JWS, request proof, Approval proof, Passport proof, Result digest, or another proof purpose is accepted                | REQ-RCPT-0004, REQ-RCPT-0005                                        |
| Wrong key purpose, one key across purposes, or same `kid` with changed material is accepted                                    | REQ-RCPT-0005, REQ-RCPT-0007, REQ-RCPT-0008                         |
| Signer timestamp proves pre-compromise creation or terminal Result time is assumed to equal proof time                         | REQ-RCPT-0009                                                       |
| Retired/revoked/compromised key creates a new proof, or a rotated proof overwrites an old proof                                | REQ-RCPT-0007                                                       |
| Current revocation automatically invalidates all older history, or historical verification restores present authority          | REQ-RCPT-0008, REQ-RCPT-0010; REQ-TRUST-0022 through REQ-TRUST-0025 |
| Legacy `ghostbridge/0.1-draft` proof is reinterpreted under current domains or missing evidence is inferred from current state | REQ-RCPT-0004, REQ-RCPT-0008, REQ-RCPT-0010; REQ-TRUST-0030         |
| Credentials, private keys, unrestricted prompts, hidden reasoning, or unrestricted content enter Receipt evidence              | REQ-RCPT-0006                                                       |
| Network route, status, header, public error, or redaction behavior is invented in D1-06                                        | REQ-RCPT-0006, REQ-RCPT-0010; delegated to H-12/D1-07               |

## Non-normative D2 traceability

This section identifies required later assets; it creates none and closes no
gap.

`D2-01` must later define Receipt semantic/profile representations, Receipt
proof/signature representation, and historical-verification result
representation derived from the applicable `REQ-RCPT-*` and `REQ-TRUST-*`
requirements without changing their semantics.

`D2-03` must later provide byte-exact static cross-language vectors for Receipt
semantic digest, bounded evidence digest, Receipt signature, JWK thumbprint,
Unicode, numbers, null/absence, key ordering, exact contexts, wrong domains and
purposes, wrong keys and tenants, wrong audiences and targets, and one-field
mutations.

`D2-04` must later cover at least Receipt mutation; Task/Result/Receipt
mismatch; signer outage and retry; retired, revoked, or compromised signers;
proof creation before and after rotation cutover; proof-time intervals crossing
compromise; missing trusted proof-time evidence; missing historical snapshots;
offline historical verification; and current disclosure denial with otherwise
verifiable retained evidence.

Later schemas, executable machines, vectors, fixtures, conformance assets, and
security review do not exist by virtue of this chapter. Final routes, methods,
statuses, headers, media types, public errors, retry or caching behavior,
redaction, timing, and observability remain D1-07/H-12. Concrete support,
retention, archive, and publication windows remain H-14. No `GB-*` gap is
closed by this prose.
