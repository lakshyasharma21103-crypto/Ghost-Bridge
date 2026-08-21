# D2-01 post-R1 reconciliation

**NON-NORMATIVE PHASE 15D.2 EVIDENCE / BOOKKEEPING RECORD**

This record captures repository and evidence state after PR #41. It is not
protocol law. It introduces no `H-*` decision, no D1 `REQ-*`, and no D2
representation decision. It neither accepts nor authorizes a future
implementation slice. Executable assets remain subordinate to accepted
protocol authority.

The previous
[`d2-01-post-merge-reconciliation.md`](./d2-01-post-merge-reconciliation.md)
remains immutable historical evidence for its earlier baseline and is not
rewritten by this record.

## Record identity and exact post-R1 baseline

| Item                           | Recorded value                                                      |
| ------------------------------ | ------------------------------------------------------------------- |
| Branch/reference               | `main`                                                              |
| Integrated merge               | `8552e7fa51ebb8605d037460616e237b8cc5a096`                          |
| Tree                           | `6bd2d20b4ed702529482e022790276672eaaf756`                          |
| Parent 1                       | `c2c87dab881e86d3fd1a0aaeaac308c01149bdf2`                          |
| Parent 2                       | `97605d760d3941f206cda25ce3456ff50cb46b29`                          |
| Pull request                   | #41 — Implement D2-01R1 Revision 2 shared canonical wire vocabulary |
| R1 implementation commit       | `c62e3c9fe5f174d21899bc767d5d7dc877b9ba37`                          |
| R1 CI scanner follow-up commit | `97605d760d3941f206cda25ce3456ff50cb46b29`                          |
| Bookkeeping record date        | 2026-08-21                                                          |

The record date is repository bookkeeping evidence only. It is not a human
semantic-approval date.

## Authority and evidence boundary

This reconciliation reads the accepted H/D1 authority through the accepted
D2-RP-01 Revision 5, D2-BG-01, D2-BG-02, and D2-01R1 Revision 2 records. It
also observes the integrated R1 implementation evidence, foundation manifest,
semantic-constraint inventory, validation machinery, fixtures, generated
Unicode evidence, and dependency metadata. None of those executable or
bookkeeping assets may replace accepted protocol semantics.

This record does not modify any accepted authority, schema, fixture, validator,
registry, generated asset, source file, package manifest, or lockfile. In
particular, the semantic-constraint inventory remains unchanged.

## Relationship to the prior reconciliation

The prior post-merge reconciliation was correct for its baseline at merge
`df2cfeca478cffb60ece4ccbd6609c5adac587ef`. It predates integrated R1. Its
then-current descriptions of the 17 D2-01-owned constraints therefore must not
be silently interpreted as the current post-R1 executable-evidence state.

The evidence classification for that difference is:

`BOOKKEEPING_METADATA_LAGS_INTEGRATED_EVIDENCE`

That label identifies timing between committed bookkeeping and later
integrated evidence. It does not make the older record incorrect and does not
authorize rewriting it.

The committed semantic-constraint inventory likewise remains both historical
and current committed metadata. This bookkeeping record does not rewrite it.
Where its earlier `structuralCoverage` values do not describe later integrated
R1 evidence, the same evidence label applies:

`BOOKKEEPING_METADATA_LAGS_INTEGRATED_EVIDENCE`

## Post-R1 17-constraint reconciliation

The classifications in this section are evidence/bookkeeping classifications
only. They are not protocol statuses, conformance statuses, or accepted slice
names. Generic executable coverage does not prove that every future owner or
network ingress path invokes the machinery correctly.

|   # | Constraint                              | Evidence classification                       | Post-R1 evidence and remaining boundary                                                                                                                                                                                  |
| --: | --------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   1 | `FND-DUPLICATE-RAW-JSON-MEMBERS`        | `GENERIC_EXECUTABLE_CLOSED_BY_R1`             | Generic lossless/source validation exists and rejects duplicate raw JSON member names after escape decoding. This is reusable machinery, not proof of binding at every future ingress.                                   |
|   2 | `FND-STRICT-UTF8-AND-RAW-BYTE-LIMITS`   | `GENERIC_EXECUTABLE_CLOSED_BY_R1`             | Generic strict UTF-8, BOM, raw-byte-ceiling, and materialized-buffer validation exists. R1 does not prove prevention of network allocation before buffering and does not complete transport receive/framing enforcement. |
|   3 | `FND-SAFE-SOURCE-TOKEN-NUMBERS`         | `GENERIC_EXECUTABLE_CLOSED_BY_R1`             | Validation of the original lexical number token exists, preserving the source spelling needed for finite-binary64 and safe-exact-integer rules. This does not prove use by every future owner.                           |
|   4 | `FND-NEGATIVE-ZERO-REJECTION`           | `GENERIC_EXECUTABLE_CLOSED_BY_R1`             | Both lexical negative zero and a post-binary64 negative-zero result, including negative underflow such as `-1e-400`, reject. This is not a transport-completion claim.                                                   |
|   5 | `FND-PATH-DECODE-REENCODE-EQUALITY`     | `DEFERRED_CONTEXTUAL_CONSTRAINT_REMAINS_OPEN` | Protocol-route validation that decodes an eligible segment exactly once, validates it, canonically re-encodes it, and requires exact raw textual equality remains absent.                                                |
|   6 | `FND-TENANT-EXACT-EQUALITY`             | `PARTIAL_GENERIC_OR_OWNER_BINDING_REMAINS`    | Generic semantic exact-equality machinery existed before R1 and remains partial. Authentication, installation, and Connection owner-family binding remains unimplemented.                                                |
|   7 | `FND-TENANT-TYPE-NONINTERCHANGEABILITY` | `DEFERRED_CONTEXTUAL_CONSTRAINT_REMAINS_OPEN` | Distinct Organization and Workspace primitive schema IDs do not make their semantic noninterchangeability owner-level executable. Equal underlying strings still cannot authorize type substitution.                     |
|   8 | `FND-INTERVAL-ORDERING`                 | `PARTIAL_GENERIC_OR_OWNER_BINDING_REMAINS`    | Generic `TimeEvidence` lower/upper ordering behavior exists. Receipt and Trust owner/context binding remains later work.                                                                                                 |
|   9 | `FND-INTERVAL-NONEMPTY`                 | `PARTIAL_GENERIC_OR_OWNER_BINDING_REMAINS`    | Generic `TimeEvidence` nonempty-interval behavior exists. Receipt and Trust owner/context binding remains later work.                                                                                                    |
|  10 | `FND-IDNA2008-VALIDATION`               | `PARTIAL_GENERIC_OR_OWNER_BINDING_REMAINS`    | Frozen Unicode 17.0.0 IDNA2008 generic validation exists. Transport and consuming-owner binding remains later work.                                                                                                      |
|  11 | `FND-CANONICAL-IPV4`                    | `PARTIAL_GENERIC_OR_OWNER_BINDING_REMAINS`    | Canonical IPv4 generic validation exists. Transport and consuming-owner binding remains later work.                                                                                                                      |
|  12 | `FND-CANONICAL-RFC5952-IPV6`            | `PARTIAL_GENERIC_OR_OWNER_BINDING_REMAINS`    | Generic IPv6 validation follows accepted D2R-017B lowercase hexadecimal-only parse-and-exact-reencode representation. Contextual network and owner binding remains later work.                                           |
|  13 | `FND-IPV4-MAPPED-IPV6-REJECTION`        | `PARTIAL_GENERIC_OR_OWNER_BINDING_REMAINS`    | Generic IPv4-mapped IPv6 rejection exists. Transport and consuming-owner binding remains later work.                                                                                                                     |
|  14 | `FND-HTTP-LOOPBACK-CONTEXT`             | `DEFERRED_CONTEXTUAL_CONSTRAINT_REMAINS_OPEN` | Structural `Origin` support for `http` does not authorize plain HTTP. The H-12 loopback-only test/development context remains unimplemented.                                                                             |
|  15 | `FND-NETB-DNS-REDIRECT-REBINDING`       | `DEFERRED_CONTEXTUAL_CONSTRAINT_REMAINS_OPEN` | Canonical hostname/IP parsing does not implement NET-B DNS, redirect, rebinding, proxy, address, coalescing, or connected-target enforcement.                                                                            |
|  16 | `FND-ARTIFACT-EXACT-BYTE-HASH`          | `PARTIAL_GENERIC_OR_OWNER_BINDING_REMAINS`    | Exact artifact `byteLength` and SHA-256 verification over the exact bytes exists. It remains distinct from H-10 semantic commitment domains, and consuming-owner binding remains later work.                             |
|  17 | `FND-EXTENSION-IDENTITY-BOUNDARIES`     | `PARTIAL_GENERIC_OR_OWNER_BINDING_REMAINS`    | Generic `ExtensionIdentity` representation and exact equality exist. Support, selection, dependencies, authority, lifecycle, object-local placement, and extension-family integration remain later work.                 |

Each of the exact 17 records appears once above. The reconciled totals are:

| Evidence classification                       | Count |
| --------------------------------------------- | ----: |
| `GENERIC_EXECUTABLE_CLOSED_BY_R1`             |     4 |
| `PARTIAL_GENERIC_OR_OWNER_BINDING_REMAINS`    |     9 |
| `DEFERRED_CONTEXTUAL_CONSTRAINT_REMAINS_OPEN` |     4 |

R1 contractually owns only reusable generic primitive or predicate coverage for
rows 8–13, 16, and 17. Their consuming object families still must prove exact
placement, authority, context, failure behavior, and owner binding.

## Wire-family evidence state

No top-level D2-01 wire family is complete. The reconciled evidence state is:

| Wire family                            | Evidence state       |
| -------------------------------------- | -------------------- |
| Participant metadata                   | `FOUNDATION_ONLY`    |
| Discovery                              | `PARTIAL_EXECUTABLE` |
| Agent / Passport / capability metadata | `PARTIAL_EXECUTABLE` |
| Negotiation                            | `PARTIAL_EXECUTABLE` |
| Authentication                         | `PARTIAL_EXECUTABLE` |
| Installation                           | `FOUNDATION_ONLY`    |
| Portable authorization evidence        | `FOUNDATION_ONLY`    |
| Connection                             | `FOUNDATION_ONLY`    |
| Invocation                             | `FOUNDATION_ONLY`    |
| Approval                               | `FOUNDATION_ONLY`    |
| Cancellation                           | `FOUNDATION_ONLY`    |
| Task / polling                         | `FOUNDATION_ONLY`    |
| Result                                 | `FOUNDATION_ONLY`    |
| Receipt                                | `FOUNDATION_ONLY`    |
| Trust / revocation                     | `FOUNDATION_ONLY`    |
| Extensions / experiments               | `PARTIAL_EXECUTABLE` |
| Errors                                 | `FOUNDATION_ONLY`    |
| Transport-visible dispatch / bindings  | `PARTIAL_EXECUTABLE` |

These are evidence labels, not conformance claims. In particular:

- no top-level request schema exists;
- no top-level response schema exists;
- no top-level Error envelope exists;
- no complete Discovery schema exists;
- no complete Connection, Invocation, Approval, Task, Receipt, or Trust schema
  exists; and
- no exact operation dispatcher exists.

No family listed above is called conformant.

## Traceability state

The reproducible pre-R1 conceptual JSON-asset-reference metric remains:

```text
TOTAL_ACCEPTED_D1_REQ        324
JSON_ASSET_REFERENCED_REQ     75
JSON_ASSET_UNREFERENCED_REQ  249
```

R1 did not expand that JSON-reference count. The metric is not a completion
percentage. Requirements may belong to D2-02 through D2-05 or may express
prose-only semantics.

A separate conservative post-R1 evidence review maps current direct executable
evidence to 66 accepted requirements, with 258 accepted requirements outside
that conservative mapping.

The 66/258 mapping uses a different evidence view from the 75/249 JSON-reference
metric. The two views must not be presented as directly interchangeable, and
neither is a completion percentage.

## Bundle and final-corpus status

| Item                                   | Reconciled value     |
| -------------------------------------- | -------------------- |
| Foundation manifest status             | `foundation-partial` |
| `FINAL_D2_01_SCHEMA_APPLICABLE_CORPUS` | `NO`                 |

The current R1 corpus is immutable and reproducible, but it is not the final
D2-01 corpus. Final-corpus status remains `NO` because:

- complete top-level wire schemas do not exist;
- the final request, response, Error, and dispatch corpus does not exist;
- owner/context binding is incomplete;
- canonical examples are incomplete;
- the complete positive, boundary, and negative family corpus is incomplete;
- one deferred representation type remains;
- no final non-partial completeness manifest exists; and
- no qualifying second-validator final evidence exists.

## Second-validator state and sequencing

| Item                               | Reconciled value                    |
| ---------------------------------- | ----------------------------------- |
| `PRIMARY_VALIDATOR`                | Ajv Draft 2020-12                   |
| `PRIMARY_VERSION`                  | `8.20.0`                            |
| `SECOND_VALIDATOR_PRESENT`         | `no`                                |
| `QUALIFYING_SECOND_VALIDATOR`      | `none`                              |
| `SECOND_VALIDATOR_EVIDENCE_STATUS` | `SECOND_VALIDATOR_EVIDENCE_PENDING` |

None of the following qualifies as a second independent Draft 2020-12
validator:

- `ajv-formats`;
- another Ajv instance;
- another wrapper around Ajv;
- Ghost Bridge semantic JavaScript;
- official runtime validation;
- parser-only validation; or
- meta-schema-only validation.

Early independent-validator parity engineering may be useful before D2-01
final corpus completion. However, final D2-01 exit evidence must be rerun and
frozen against the eventual complete immutable schema-applicable corpus. This
is an engineering sequencing observation, not new protocol law.

## Primary-validator dependency provenance

This is an engineering and reproducibility finding. It is not a semantic
failure and is not a current-R1-validity failure.

The protocol schema-validation tooling imports Ajv, but the root
`package.json` does not directly declare Ajv. The backend workspace declares
`ajv: ^8.17.1`, and the current lock/install resolves the working engine to Ajv
`8.20.0`. The current protocol-validation toolchain therefore depends on
workspace dependency/hoisting behavior for its primary validator.

| Item                                 | Classification                             |
| ------------------------------------ | ------------------------------------------ |
| Finding                              | `PROTOCOL_VALIDATOR_DEPENDENCY_PROVENANCE` |
| Current R1 semantic blocker          | `NO`                                       |
| Current R1 integration blocker       | `NO`                                       |
| Engineering/reproducibility debt     | `YES`                                      |
| Required before final D2-01 evidence | `YES`                                      |

This record does not solve the finding or choose a dependency-packaging
mechanism. Possible later engineering choices include an explicit tooling/root
dependency or a dedicated validation workspace, but neither is accepted here.

## KeyThumbprintReference correction

`KeyThumbprintReference` remains deferred. The correct distinction is:

**Already fixed by accepted authority:** the relevant H-10 key-purpose
vocabulary and semantic distinctions.

**Still unresolved:** the exact bounded lexical representation of `keyId` and
downstream contextual `keyId` binding.

The accepted R1 contract expressly states that R1 is not waiting for
key-purpose semantics and must not invent `keyId` grammar. This record therefore
does not describe key-purpose vocabulary as unresolved and does not reopen
key-purpose semantics.

`SEMANTIC-AUTHORITY-STOP-CANDIDATE — KeyThumbprintReference keyId representation`

Affected requirements:

- `REQ-RCPT-0005`;
- `REQ-RCPT-0007`;
- `REQ-RCPT-0008`;
- `REQ-TRUST-0006`; and
- `REQ-TRUST-0009`.

## Other prospective later-work STOP candidates

The following are prospective review gates for later work. They are not
blockers to the truthfulness of this reconciliation and create no human
decision.

### NET-B exact address-table evidence

- H-12 fixes the policy and algorithmic boundary.
- Exact authoritative address classification must not be silently inherited
  from OS, platform, or library behavior.
- Any semantic policy choice requires human review.

### Per-error detail schemas

- H-12 fixes stable identities, precedence, status/retry meaning, the privacy
  floor, logical envelope content, and applicable bounds.
- Final member names and per-error detail layouts remain bounded D2 work.
- Implementation must stop wherever presence, type, disclosure, authority, or
  privacy meaning is not already fixed.

## Non-authoritative next-work recommendation

`Participant Identity & Capability Object Foundation` is the narrower proposed
workflow direction. It is a recommendation only, not accepted protocol or
implementation authority.

Possible scope is limited to reusable object foundations already completely
determined by accepted D2-BG-01 and D2-RP authority:

- `IssuerIdentity`;
- `AgentIdentity`;
- `PassportIdentity`;
- `PassportVersion`;
- `CapabilityNamespaceIdentity`;
- `CapabilityKey`;
- `CapabilityVersion`; and
- applicable immutable capability/artifact identity and reference object
  foundations.

The recommendation explicitly excludes:

- a full Discovery release-record schema;
- complete participant release metadata;
- negotiation;
- authentication;
- installation;
- Connection;
- Invocation;
- Approval;
- Task;
- Result;
- Receipt;
- Trust and revocation;
- NET-B;
- route dispatch;
- Error detail layouts;
- `KeyThumbprintReference`;
- state machines;
- D2-03 vectors;
- the D2-04 malicious corpus; and
- D2-05 conformance.

A later Discovery/participant-release composition slice should build on these
reusable owner objects. This recommendation is not an accepted D2-01C, D2-01D,
D2-01E, or D2-01F label and is not implementation authorization. A separate
proposal, review, and explicit implementation authorization remain required.

## D2-01 completion blockers

The current blocker picture remains:

- top-level wire schemas remain open;
- canonical examples remain partial;
- the complete positive, boundary, and negative corpus remains partial;
- generic raw validation was materially improved by R1, but network/framing
  enforcement and owner binding remain;
- owner cross-field validation remains partial;
- exact request, response, and operation dispatch remains open;
- the Error envelope and registry remain open;
- exhaustive D1 `REQ-*` to schema/evidence disposition remains open;
- implementation-neutral schema/type trace evidence remains partial;
- a final non-partial completeness manifest remains blocked on the final
  corpus; and
- final evidence from a second independent validator remains blocked on the
  final corpus.

**D2-01 remains incomplete.**

## Historical status text

Older repository documents contain status prose authored before PR #41,
including text describing R1 as a candidate or as not integrated. That prose is
historical/status bookkeeping for the baseline at which it was authored. It
does not negate the later verified integration at merge commit
`8552e7fa51ebb8605d037460616e237b8cc5a096`.

Those documents remain historical evidence and are not silently rewritten by
this record.

## Governance distinctions and nonclaims

- R1 integration does not equal D2-01 completion.
- D2-01 completion does not equal D2-02 completion.
- Schema validity does not equal conformance.
- Conformance does not equal interoperability.
- Interoperability does not equal production readiness.
- CI green does not equal external security review.
- Official implementation behavior does not equal protocol law.
- There is no release authorization.
- There is no production authorization.
- There is no Protocol 1.0 claim.
- There is no D2-01C, D2-01D, D2-01E, or D2-01F acceptance.
- There is no new protocol decision.
- There is no next-slice implementation authorization.
- There is no second-validator claim.
- There is no final D2-01 corpus claim.
- R1 does not automatically close any of the 60 original `GB-*` gaps; the
  current plan continues to record all 60 as `PENDING`.

This record is repository reconciliation evidence only.
