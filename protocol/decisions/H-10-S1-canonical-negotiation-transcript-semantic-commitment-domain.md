# H-10-S1 — Canonical Negotiation Transcript Semantic Commitment Domain

## Decision ID

H-10-S1

## Parent decision

H-10 — Canonical bytes, digests, signatures, and proof profiles

## Status

**ACCEPTED**

Human acceptance date: 2026-08-26

Accepted option: **Option A — Dedicated negotiation-transcript Digest domain**

Exact human disposition:

> I accept H-10-S1 Revision 2 with that qualification

This record is the repository integration of the accepted H-10-S1 Revision 2
decision. It is governance evidence, not the normative specification, and does
not authorize implementation, schemas, fixtures, vectors, conformance,
interoperability, publication, release, production readiness, or Protocol 1.0.

## Acceptance qualification

The following qualification is part of the acceptance and controls any
shorthand in Revision 2:

> H/D1/H-13 supply semantic authority. Human-accepted D2-BG-03 closes the
> transcript representation and projection consistently with that authority.
> D2-01 realizes the accepted schema/assets without semantic discretion and
> MUST STOP if any participation, presence, equality, set, identity, security,
> privacy, or graph decision remains unresolved.

D2-01 therefore has no independent semantic-definition or field-participation
authority.

## Authority gap resolved by this supplement

Accepted D1 requires a successful negotiated result to retain a future H-10/D2
canonical negotiation-transcript identity and digest.

Before H-10-S1, H-10 had no negotiation-transcript domain.
`gb.connection.selection.v1` already meant the exact final selected result
before authority commit and could not be reinterpreted as the canonical
negotiation transcript.

H-10-S1 resolves only that H-10 semantic-purpose/domain gap.

The following remain distinct:

```text
CANONICAL NEGOTIATION TRANSCRIPT
!=
FINAL SELECTED RESULT
!=
CONNECTION AUTHORITY BUNDLE
```

## Accepted domain allocation

The following H-10 domain is accepted:

```text
gb.negotiation.transcript.v1
```

Operation:

```text
Digest
```

Semantic purpose:

> The exact canonical semantic transcript of one successful,
> selected-release-bound Ghost Bridge negotiation, containing only the
> accepted semantic inputs, accepted selection-algorithm identity,
> immutable/time-bound evidence identities or safe commitments actually
> consumed by the accepted negotiation projection, and the selected semantic
> outcome core needed to reproduce the accepted deterministic negotiation
> result.

The domain is distinct from `gb.connection.selection.v1` and
`gb.connection.authority.v1`. No commitment under one of these domains
validates as another.

## Successful negotiations only

`gb.negotiation.transcript.v1` applies only when negotiation has selected one
exact `ProtocolRelease`.

```text
successful selected negotiation
→ transcript commitment required by the later accepted representation

no-compatible-release
→ no gb.negotiation.transcript.v1 commitment defined by H-10-S1
```

An implementation MUST NOT fabricate a release for a failed negotiation from
`preferredVersion`, a failed candidate, the current deployment, package/SDK
version, or transport context.

A future committed failed-negotiation transcript requires separate governance.

## H-10 context-presence classification

The accepted domain uses the H-10 consent/selection context family:

```text
context.protocolRelease    REQUIRED
context.audience           REQUIRED
context.target             REQUIRED
context.organization       REQUIRED
context.workspace          REQUIRED as tagged present/absent
purpose                    REQUIRED
```

`purpose` is exactly `gb.negotiation.transcript.v1`.

No alias, omitted tenant context, current-request inference, deployment
default, package default, `null` workspace substitute, or other inferred value
is permitted.

## Semantic-purpose boundary

The canonical negotiation transcript is protocol semantic evidence, not an
implementation trace. Debug traces, evaluation logs, failed-candidate
diagnostics, loop order, error-message ordering, network sequencing, transport
retry history, runtime timing, database/cache behavior, SDK/Platform/UI state,
private policy reasoning, mutable current lookups, and implementation-specific
explanations do not become transcript semantics.

The exact closed transcript inventory remains for human-accepted D2-BG-03 and
H-13-consistent representation work. D2-01 may only realize accepted
decisions.

## Secret-free and privacy-minimized participation

The canonical negotiation transcript MUST NOT contain reusable or unnecessary
secret material, including Grant presentation secrets, bearer credentials,
passwords, API secrets, private keys, reusable authentication tokens, raw PoP
secret material, provider-private authentication payloads, raw policy or Trust
reasoning, recovery secrets, unnecessary signed/request bodies, or a
low-entropy secret merely transformed into a plain hash.

A digest of a low-entropy secret is not automatically safe.

Sensitive sources may participate only through accepted bounded secret-free
semantic results, safe categories, typed immutable references,
purpose-qualified commitments, or other explicitly authorized minimized
projections.

## Identity and digest separation

These remain distinct:

```text
gb.negotiation.transcript.v1
!= NegotiationTranscriptIdentity/Reference
!= transcript digest value
!= immutable transcript-artifact identity
```

H-10-S1 owns only the transcript Digest purpose/domain.

Human-accepted D2-BG-03 must separately define the typed transcript
identity/reference, creation rule, equality, determinism, historical
resolution, and relationship to the transcript commitment.

No random UUID or content-addressing fallback is implied.

## Mandatory acyclic commitment construction

Conceptually:

```text
O =
selected semantic outcome core
without transcript commitment
without selection commitment
without Connection-authority commitment

T_payload =
canonical successful negotiation semantic inputs
+ exact SelectionAlgorithmIdentity
+ O

T =
Digest(
    purpose = gb.negotiation.transcript.v1,
    payload = T_payload
)

R =
O
+ typed transcript identity/reference
+ T

S =
Digest(
    purpose = gb.connection.selection.v1,
    payload = R
)
```

The accepted invariant is:

```text
T_payload contains neither T nor S.
T does not depend on S.
R may contain the already-materialized T.
S may commit R.
Neither T nor its projected payload may contain S.
The transcript projection may not contain T.
```

`ConnectionAuthorityCommitment` is downstream and excluded from `O` and
`T_payload`. The complete concrete reference graph remains D2-BG-03-owned and
MUST remain acyclic.

## Existing H-10 domains remain unchanged

`gb.connection.selection.v1` remains the exact final selected result before
authority commit.

`gb.connection.authority.v1` remains the immutable Connection
authority/context bundle.

```text
T != S != ConnectionAuthorityCommitment
```

## Accepted cryptographic profiles

`gb.negotiation.transcript.v1` uses:

```text
canonicalization: gb-c14n-jcs-ijson-v1
digest:            gb-digest-jcs-sha256-v1
```

No new hash, canonicalization profile, digest encoding, signature algorithm,
signature domain, or signing-key purpose is created.

## Cryptographic verification claim

Given an independently trusted expected commitment and the exact required
domain, profile, `ProtocolRelease`, audience, target, Organization, Workspace
state, and other accepted context, a matching
`gb.negotiation.transcript.v1` digest establishes equality of the supplied
canonical semantic projection to that expected commitment only.

It does not establish producer/observer identity, observation time,
authentication, Trust, authorization, consent validity, current release
support, current deployment availability, or Connection authority.

## Ownership boundary

- **H/D1:** semantic authority and required negotiation distinctions.
- **H-13:** schema participation, openness, and extension participation.
- **Human-accepted D2-BG-03:** closed transcript representation, typed
  identity/reference, presence, equality, semantic sets, safe references, and
  complete acyclic graph consistent with H/D1/H-13.
- **D2-01:** realization of accepted schema/assets only, without semantic
  discretion; MUST STOP when semantic authority is incomplete.
- **H-10/H-10-S1:** cryptographic purpose/domain, context family, profile,
  domain separation, and self-field/acyclic constraints.
- **D2-03:** canonical byte/framing application, digest outputs, vectors, and
  independent reproduction evidence.

D2-03 cannot decide semantic field participation by publishing a vector.

## Cross-release reuse

The same `.v1` domain may be reused under another exact `ProtocolRelease` only
while domain purpose, operation class, semantic distinctions, context
presence, projection participation, presence/absence meaning, equality,
set/list behavior, self-field exclusion, verifier semantics, privacy boundary,
and acyclic relationship all remain unchanged.

A changed cryptographic meaning requires new H-10 governance and the applicable
H-03/H-13 release consequence. Old `.v1` meaning never changes.

## Historical treatment

Do not backfill transcript commitments, invent historical transcript
identities, infer `T` from `S`, rehash reconstructed modern state, map generic
SHA-256 into this domain, relabel legacy runtime digests, or reinterpret
`gb.connection.selection.v1`.

Historical verification requires the original identity/reference, projection,
domain, release, profile, context, and required evidence. Missing required
facts yield unsupported or historically indeterminate verification, never
current-default reconstruction.

## Domain-substitution failures

Reject T-as-S, S-as-T, Connection-authority-as-T, equal digest bytes under a
different domain, generic SHA-256 or legacy runtime digests presented as T, and
the same payload presented under a different audience, target, Organization,
Workspace state, or `ProtocolRelease`.

Content equality is never purpose/context equality.

## Transcript retention

H-10-S1 creates no blanket requirement to retain raw transcript content
forever.

```text
COMMITMENT RETENTION
!=
UNBOUNDED RAW TRANSCRIPT RETENTION
```

Retention/disclosure/history policy remains with the applicable H-11/H-12/H-14
and D1 privacy/retention owners.

## D2-BG-03 consequence

After integration, D2-BG-03 may consume `gb.negotiation.transcript.v1` as
accepted H-10 authority, but must still define the typed transcript
identity/reference, determinism/equality/history, successful-result presence,
closed semantic inventory, projection membership, typed safe source
references, and complete acyclic `O/T/R/S` graph.

BG03 may not rename the domain, reuse `gb.connection.selection.v1`, introduce a
random transcript identity without accepted authority, put T or S inside
`T_payload`, or permit secret-bearing transcript fields.

## Review and acceptance evidence

Revision 1 received `REVISION_REQUIRED`.

Revision 2 received:

```text
READY_WITH_NONBLOCKING_FINDINGS
```

with:

```text
BLOCKERS      0
MAJORS        0
MINORS        0
NONBLOCKING   1
```

The sole nonblocking finding concerned D2-01 semantic-authority shorthand. The
acceptance qualification in this record resolves that ambiguity.

## Explicit nonclaims

Acceptance/integration of H-10-S1 does not establish complete D2-BG-03,
complete D2-01 schemas, transcript identity representation, canonical
transcript projection/bytes, D2-03 vectors, D2-04 adversarial evidence, D2-05
conformance, independent implementation, interoperability, production
readiness, publication, release, or Protocol 1.0.

No implementation authority is created.

## Accepted classification

```text
H10_S1_REVISION_2                         ACCEPTED
ACCEPTED_OPTION                           OPTION_A

DOMAIN                                    gb.negotiation.transcript.v1
OPERATION                                 Digest
SUCCESS_ONLY                              YES

PROTOCOL_RELEASE_CONTEXT                  REQUIRED
AUDIENCE_CONTEXT                          REQUIRED
TARGET_CONTEXT                            REQUIRED
ORGANIZATION_CONTEXT                      REQUIRED
WORKSPACE_CONTEXT                         REQUIRED_TAGGED
PURPOSE_CONTEXT                           REQUIRED

CANONICALIZATION_PROFILE                  gb-c14n-jcs-ijson-v1
DIGEST_PROFILE                            gb-digest-jcs-sha256-v1

NEW_SIGNATURE_DOMAIN                      NO
NEW_KEY_PURPOSE                           NO

TRANSCRIPT_IDENTITY_REPRESENTATION        DEFERRED_TO_D2_BG03
TRANSCRIPT_PROJECTION                     DEFERRED_TO_HUMAN_ACCEPTED_BG03_H13
SCHEMA_REALIZATION                        DEFERRED_TO_D2_01_WITHOUT_SEMANTIC_DISCRETION
CANONICAL_BYTES                           DEFERRED_TO_D2_03
VECTORS                                   DEFERRED_TO_D2_03

T_PAYLOAD_CONTAINS_T                      NO
T_PAYLOAD_CONTAINS_S                      NO
R_MAY_CONTAIN_T                           YES
S_MAY_COMMIT_R                            YES

SECRET_BEARING_TRANSCRIPT                 FORBIDDEN
FAILED_NEGOTIATION_TRANSCRIPT_DOMAIN      NOT_DEFINED

GB_CONNECTION_SELECTION_MEANING_CHANGED   NO
H06_AUTHORITY_BOUNDARY_CHANGED            NO
H03_ALGORITHM_CHANGED                     NO
H04_NEGOTIATION_CHANGED                   NO
D1_CHANGED                                NO

IMPLEMENTATION_AUTHORIZED                 NO
SCHEMA_WORK_AUTHORIZED                    NO
D2_03_VECTORS_AUTHORIZED                  NO
CONFORMANCE                               NO
INTEROPERABILITY                          NO
PRODUCTION_READINESS                      NO
PUBLICATION_AUTHORIZED                    NO
RELEASE_AUTHORIZED                        NO
PROTOCOL_1_0                              NO
```
