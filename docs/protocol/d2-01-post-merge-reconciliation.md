# D2-01 post-merge reconciliation

**NON-NORMATIVE PHASE 15D.2 EVIDENCE / BOOKKEEPING RECORD**

This document records repository and evidence state. It is not protocol law,
introduces no new H-* decision or D1 REQ-*, defines no wire semantics, and does
not approve any future implementation slice. Executable assets remain
subordinate to accepted protocol authority.

## A. Snapshot

| Item | Recorded value |
| --- | --- |
| Branch baseline | `main` |
| Baseline merge | `df2cfeca478cffb60ece4ccbd6609c5adac587ef` |
| Reconciliation classification | `D2_01_RECONCILIATION_COMPLETE_MORE_IMPLEMENTATION_REQUIRED` |
| Reconciliation/bookkeeping date | 2026-08-19 |
| Candidate | `ghostbridge/e1.r0-draft.1` — draft/prerelease |

The date above is the date of this repository reconciliation and bookkeeping
record. It is not a human semantic approval date. The classification records a
reviewed evidence conclusion; it is not normative authority.

## B. Integrated D2-01 evidence

D2-RP-01 remains the accepted representation authority. D2-BG-01 and D2-BG-02
are accepted and integrated. D2-BG-01's approval-provenance correction is
integrated. D2-BG-02's actual human approval date is 2026-08-18, and its
provenance-only correction is integrated.

D2-01A is an integrated workflow sub-slice. PR #29 merged it at
`69e535b37ad50699fdca320dfbfb165a937dc778`. Its status is partial/foundation
only; its evidence includes:

- foundation schema infrastructure;
- immutable schema IDs;
- primitives and foundation objects;
- foundation fixtures;
- the semantic-constraint inventory; and
- neutral validation machinery.

D2-01B is an integrated workflow sub-slice. PR #34 merged it at
`df2cfeca478cffb60ece4ccbd6609c5adac587ef`. Its evidence includes:

- seven release-data registry classes;
- an atomic manifest;
- a maintained semantic source and deterministic generated artifacts;
- integrity bindings;
- release-data schemas and fixtures;
- semantic checkers;
- a conformance lock; and
- deterministic generation and reproduction.

The integrated scanner correction is an engineering correction and is not
additional D2-01 semantic coverage. D2-01A + D2-01B != complete D2-01.

### Reproduced trace counts

Independent counting from this checkout found 324 authoritative accepted D1
REQ IDs, 75 unique REQ IDs referenced in schema, registry, and wire-fixture JSON
assets, and 249 accepted REQ IDs not referenced in those JSON assets. Asset
reference count is not a D2-01 completion count: requirements may belong to
D2-02 through D2-05 or may express prose-only semantics.

## C. Current D2-01 completion blockers

The reviewed missing classes are:

- top-level wire schemas for the remaining D1 wire families;
- canonical examples;
- a complete positive, boundary, and negative schema corpus;
- remaining raw-input structural enforcement;
- remaining executable cross-field constraint coverage;
- exact request, response, and operation dispatch;
- a canonical Error envelope and error-code registry;
- exhaustive D1 REQ ↔ schema ↔ evidence classification;
- implementation-neutral schema/type trace evidence;
- a final non-partial bundle/completeness manifest; and
- evidence from a second genuinely independent Draft 2020-12 validator.

This blocker inventory summarizes reviewed evidence and does not create a new
semantic specification.

## D. Wire-family remainder

At a high level, the remaining wire families already established by the
reconciliation are:

- participant metadata;
- Discovery;
- Agent, Passport, and capability metadata;
- negotiation;
- authentication;
- installation;
- portable authorization evidence where D1 requires it;
- Connection;
- Invocation;
- Approval;
- cancellation;
- Task and polling;
- Result;
- Receipt;
- Trust and revocation;
- extensions and experiments;
- Errors; and
- transport-visible dispatch and bindings.

Exact member names and layouts remain subject to accepted bounded D2
representation authority and the STOP rule.

## E. Second-validator status

`SECOND_VALIDATOR_EVIDENCE_PENDING`

Current qualifying schema-engine evidence is Ajv Draft 2020-12. The committed
lockfile resolves Ajv `8.20.0`, and the current locked environment reports Ajv
`8.20.0`.

Neither `ajv-formats`, custom semantic JavaScript, the official runtime, nor
another wrapper around Ajv is an independent second validator. Closure requires
a genuinely separately implemented Draft 2020-12 engine operating over the
same immutable final schema-applicable corpus, with reproducible pinned
evidence. No such engine is installed or claimed by this task.

## F. Semantic-authority finding

No current unavoidable `SEMANTIC-AUTHORITY-STOP` item was identified by the
post-merge reconciliation.

This is not blanket authorization for all remaining layouts. Future
implementation must STOP if a representation choice would alter or invent:

- semantic distinctions;
- field presence or absence meaning;
- null semantics;
- equality;
- authority;
- lifecycle;
- compatibility;
- security;
- privacy;
- canonical bytes;
- extension meaning;
- error semantics; or
- Trust semantics.

## G. D2-02 workflow boundary

`D2_02_MAY_START_IN_PARALLEL`

D2-02 may model only D1-approved semantic states, triggers, guards, effects,
persistence, atomicity, and illegal transitions. D2-02 cannot create wire,
member-name, or schema authority and must STOP if it requires a new wire
semantic distinction.

**Workflow recommendation, not a protocol requirement:** Complete or stabilize
the first bounded shared-wire D2-01 remainder slice before actively beginning
D2-02, to reduce cross-slice coordination risk.

## H. Historical slice-label clarification

No durable accepted document currently defines D2-01C, D2-01D, D2-01E, or
D2-01F as accepted implementation contracts. Any future remaining-work slice
labels must be explicitly introduced as `PROPOSED` workflow-planning labels and
independently reviewed before use. This record does not claim those historical
labels were previously approved and does not introduce replacement accepted
labels.

## I. Nonclaims

This record makes all of the following explicit:

- D2-01 is not complete;
- D2-02 through D2-05 are not complete;
- no GB-* gap is closed, and all 60 remain `PENDING`;
- an independent second implementation is not established;
- interoperability is not established;
- external security review is not established;
- Phase 15E is not complete;
- publication and release readiness are not established; and
- Protocol 1.0 is not claimed.

## Appendix — remaining registered D2-01 semantic constraints

This appendix accounts for the exact 17 records whose committed inventory
`downstreamOwner` is `D2-01`. Each expected owner family below is a
**non-normative planning classification**, not an accepted slice or work-item
assignment. `Structural coverage` reproduces the inventory's current status;
none of these records is assigned to the integrated D2-01A or D2-01B workflow
sub-slices.

### 1. `FND-DUPLICATE-RAW-JSON-MEMBERS`

- Registered purpose: Reject duplicate raw JSON member names before or during
  lossless parsing; first-wins and last-wins behavior are prohibited.
- Normative references: `REQ-APPR-0018`, `REQ-TRAN-0013`, `REQ-EXT-0001`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: shared canonical vocabulary.

### 2. `FND-STRICT-UTF8-AND-RAW-BYTE-LIMITS`

- Registered purpose: Decode strict UTF-8 and enforce applicable raw-octet and
  complete-message limits before lossy parsing or normalization.
- Normative references: `REQ-APPR-0018`, `REQ-TRAN-0013`, `REQ-ERR-0004`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: shared canonical vocabulary.

### 3. `FND-SAFE-SOURCE-TOKEN-NUMBERS`

- Registered purpose: Validate the original JSON number token for the accepted
  finite-binary64 and safe-exact-integer rules without coercion, rounding,
  clamping, or lossy reparsing.
- Normative references: `REQ-APPR-0018`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: shared canonical vocabulary.

### 4. `FND-NEGATIVE-ZERO-REJECTION`

- Registered purpose: Reject a source token that represents negative zero
  before a parser erases the distinction.
- Normative references: `REQ-APPR-0018`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: shared canonical vocabulary.

### 5. `FND-PATH-DECODE-REENCODE-EQUALITY`

- Registered purpose: Validate the raw route, decode an eligible identifier
  segment exactly once, validate its owning identifier type, canonically
  re-encode, and require exact raw textual equality.
- Normative references: `REQ-TRAN-0003`, `REQ-TRAN-0004`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: transport-visible dispatch and bindings.

### 6. `FND-TENANT-EXACT-EQUALITY`

- Registered purpose: Compare exact code units case-sensitively with no
  trimming, case folding, Unicode normalization, aliases, coercion, truthiness,
  or punctuation interpretation.
- Normative references: `REQ-CONN-0003`, `REQ-INV-0001`, `REQ-APPR-0014`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `PARTIAL`.
- Expected future owner family: authentication, installation, and Connection.

### 7. `FND-TENANT-TYPE-NONINTERCHANGEABILITY`

- Registered purpose: Keep Organization and Workspace as separate semantic
  types; equal underlying strings never authorize conversion or substitution
  between them.
- Normative references: `REQ-CONN-0003`, `REQ-INV-0001`, `REQ-APPR-0014`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: authentication, installation, and Connection.

### 8. `FND-INTERVAL-ORDERING`

- Registered purpose: Require lower time to be no later than upper time after
  canonical timestamp parsing.
- Normative references: `REQ-RCPT-0009`, `REQ-TRUST-0022`, `REQ-TRUST-0023`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: governed work and Receipt.

### 9. `FND-INTERVAL-NONEMPTY`

- Registered purpose: Require a represented interval to be nonempty; equal
  endpoints are valid only when both edges are inclusive.
- Normative references: `REQ-RCPT-0009`, `REQ-TRUST-0022`, `REQ-TRUST-0023`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: governed work and Receipt.

### 10. `FND-IDNA2008-VALIDATION`

- Registered purpose: Accept only validated lowercase IDNA2008 A-label form
  with the accepted label bounds and round-trip behavior; raw U-label input is
  invalid.
- Normative references: `REQ-TRAN-0002`, `REQ-TRAN-0003`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: transport-visible dispatch and bindings.

### 11. `FND-CANONICAL-IPV4`

- Registered purpose: Require exactly four decimal octets from 0 through 255
  with no leading zero except the literal 0.
- Normative references: `REQ-TRAN-0002`, `REQ-TRAN-0003`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: transport-visible dispatch and bindings.

### 12. `FND-CANONICAL-RFC5952-IPV6`

- Registered purpose: Require canonical lowercase RFC-5952-style text without
  brackets or a zone identifier.
- Normative references: `REQ-TRAN-0002`, `REQ-TRAN-0003`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: transport-visible dispatch and bindings.

### 13. `FND-IPV4-MAPPED-IPV6-REJECTION`

- Registered purpose: Reject IPv4-mapped IPv6 textual origin representations
  so they cannot alias the IPv4 branch.
- Normative references: `REQ-TRAN-0002`, `REQ-TRAN-0003`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: transport-visible dispatch and bindings.

### 14. `FND-HTTP-LOOPBACK-CONTEXT`

- Registered purpose: Permit plain HTTP only in an explicitly enabled test or
  development context when the configured hostname and every resolved and
  connected address are loopback; it creates no production or Governed
  authority.
- Normative references: `REQ-TRAN-0002`, `REQ-AUTH-0003`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: transport-visible dispatch and bindings.

### 15. `FND-NETB-DNS-REDIRECT-REBINDING`

- Registered purpose: Apply the accepted H-12 NET-B DNS, address, redirect,
  rebinding, proxy, and connected-target checks after canonical parsing and
  before authority use.
- Normative references: `REQ-TRAN-0002`, `REQ-TRAN-0003`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: transport-visible dispatch and bindings.

### 16. `FND-ARTIFACT-EXACT-BYTE-HASH`

- Registered purpose: Compute SHA-256 over the exact artifact byte stream,
  compare the canonical digest and exact byte length, and do not parse,
  normalize, or substitute an H-10 semantic commitment.
- Normative references: `REQ-DISC-0003`, `REQ-VERS-0004`, `REQ-COMP-0007`,
  `REQ-COMP-0009`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `NONE`.
- Expected future owner family: discovery and negotiation.

### 17. `FND-EXTENSION-IDENTITY-BOUNDARIES`

- Registered purpose: Compare exact code units without normalization or
  aliases; treat owner and name punctuation as opaque identity content, enforce
  duplicate rejection, and never infer support, selection, authority, or DNS
  structure from the extension-name dots.
- Normative references: `REQ-EXT-0004`, `REQ-EXT-0005`, `REQ-EXT-0006`.
- Current implementation status: remaining generic D2-01 constraint;
  structural coverage `PARTIAL`.
- Expected future owner family: extensions and experiments.

All 17/17 records are accounted for. No owner-family mapping required a new
semantic decision, so no `SEMANTIC-AUTHORITY-STOP-CANDIDATE` is recorded. No
accepted D2-01R1/R2 or other replacement work-item label is assigned.
