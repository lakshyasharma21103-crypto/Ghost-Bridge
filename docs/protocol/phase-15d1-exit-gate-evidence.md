# Phase 15D.1 exit-gate evidence record

> **NON-NORMATIVE PHASE EVIDENCE**

This record reports the completed Phase 15D.1 exit-gate reconciliation. It is
status and evidence only: it creates no protocol semantics, changes no
`REQ-*` requirement or accepted `H-*` decision, closes no `GB-*` gap, creates
no D2 executable asset, and authorizes no downstream phase, release, or claim.

## Purpose and scope

The purpose of this record is to preserve the identities, provenance, review
results, mechanical checks, reconciliation dispositions, limitations, and final
state of the Phase 15D.1 normative-writing exit gate. The reconciled protocol
candidate remains exactly `ghostbridge/e1.r0-draft.1`, a draft/prerelease.

## Frozen inputs and evidence identities

| Evidence | Identity |
| --- | --- |
| Frozen repository baseline | `6fdf37a7193c28b6aed446d7ca6b22987eed3d22` |
| Clean-room source bundle SHA-256 | `8A7A43E64A5F7AF06EA36CA4AE67780D04F76D08D00CE1BD1F5A3B789F72FF8A` |
| Completed Go review SHA-256 | `DEB5A8D49017D3DB91535F6621B7FF731FF5DC80C88A5A73897201314FDD3556` |
| Completed Python review SHA-256 | `20BF77A6CE81332684DC79EFFE989684228D048EB8390871ACC713ACF63E1528` |
| Completed security/privacy review SHA-256 | `B5DB57DD169AD7EBBF316CDCB401E9F43D65D119B3FD13DEF076AE21887C055D` |
| Expected evidence ZIP SHA-256 | `0AD6C45ABFDC0EA9EC03C4D85C2A38E6777D8A30EECB464D0D67C0AB93EC9213` |

During final reconciliation, the ZIP container identity was
`HASH_NOT_RECOMPUTABLE`: the attachment layer did not expose the raw ZIP
container. The expected ZIP digest above is therefore preserved as an expected
identity, not reported as independently recomputed.

The attachment system did expose all three extracted report byte streams. The
reconciler independently computed each inner SHA-256 value, every value matched
the corresponding report digest above exactly, and the included
`SHA256SUMS.txt` contained the same three values. The reconciliation therefore
accepted the three individual report identities while retaining the explicit
ZIP-container limitation.

## Reviewer provenance and isolation

| Review | Reviewer role | Nature and isolation | Claim boundary |
| --- | --- | --- | --- |
| Go | Independent Go implementation-design reviewer | AI review performed from the clean-room normative source bundle, isolated from prohibited implementation sources | Not a human review, not human independence, and not P1-01 |
| Python | Independent Python implementation-design reviewer | AI review performed from the clean-room normative source bundle, isolated from prohibited implementation sources | Not a human review, not human independence, and not P1-01 |
| Security/privacy | Independent Phase 15D.1 security/privacy authority-path reviewer | AI review performed under the clean-room source boundary for authority paths and protected-value flows | Not P1-03 and not a claim of human or external independence |

The clean-room boundary prohibited official implementation source, runtime
code, tests, schemas, packages, Platform behavior, package metadata, CI, and
external standards from becoming protocol authority or an answer to a design
question. The reviewers could reason from the supplied normative corpus and its
governing accepted decisions; implementation advice and proposed package
architecture remained non-normative and were not imported into requirements.

## Review verdicts

| Review | Verdict | `CLEAN_ROOM_QUESTIONS` | Blocking result |
| --- | --- | --- | --- |
| Go | `DESIGNABLE_WITH_NONBLOCKING_FINDINGS` | None | No blocker |
| Python | `DESIGNABLE_WITH_NONBLOCKING_FINDINGS` | None | No `BLOCKER`, `MAJOR_NONBLOCKING`, or `MINOR_EDITORIAL` finding |
| Security/privacy | `SECURITY_PRIVACY_REVIEW_PASS_WITH_NONBLOCKING_FINDINGS` | None | No `BLOCKER_UNDOCUMENTED_AUTHORITY_PATH`; no `BLOCKER_UNDOCUMENTED_PROTECTED_VALUE_FLOW` |

Final reconciliation found that none of the reported findings requires a D1
normative correction and none blocks D1 exit.

## Seven exit-criterion results

| Criterion | Result | Reconciled evidence |
| ---: | --- | --- |
| 1 | **PASS** | `GB-001` through `GB-060` each have requirement-numbered D1 disposition or an explicit justified executable/later-phase disposition. Every `GB-*` row remains `PENDING`; this result closes none. |
| 2 | **PASS** | Phase 15D.0 contains two distinct ten-item contradiction inventories. Their 13-class union has accepted human-governed D1 resolution or explicit downstream disposition for every class. This conservative result is stronger than evaluation against either inventory alone. |
| 3 | **PASS** | All 324 normative requirements have D1-to-D2 traceability to D2-01 canonical representations, D2-02 executable lifecycle/state/atomicity models, D2-03 canonical-byte/crypto/golden evidence, D2-04 malicious/failure/race/parser/privacy/compatibility fixtures, or D2-05 implementation-neutral conformance/claim-scope checks, as applicable. |
| 4 | **PASS** | Isolated Go and Python reviewers produced coherent implementation designs from the normative corpus without implementation source; final comparison found no material semantic disagreement. This is D1 designability evidence only, not P1-01. |
| 5 | **PASS** | Security/privacy review found no undocumented authority path and no undocumented protected-value flow. This is not P1-03. |
| 6 | **PASS** | The implementation-as-law audit found no protocol rule sourced merely from implementation code, tests, schemas, Platform behavior, package metadata, CI, or external standards. |
| 7 | **PASS** | Version/history integrity remains intact, including immutable historical `ghostbridge/0.1-draft` meaning and the exact H-03-governed `ghostbridge/e1.r0-draft.1` identity. |

## Mechanical reconciliation evidence

The frozen-baseline reconciliation established:

- 21 normative Markdown files in the `e1.r0-draft.1` candidate;
- 324 `REQ-*` definitions and 324 unique requirement IDs;
- 324 D1 trace rows;
- no duplicate requirement ID and no duplicate trace row;
- no missing or extra trace row;
- no requirement missing accepted `H-*` source attribution;
- no trace row missing a D2 destination class; and
- no `H-*` or `GB-*` mismatch between a requirement and its trace row.

These counts and comparisons are evidence about the frozen corpus; they create
no normative meaning and do not establish executable conformance.

## Phase 15D.0 contradiction-inventory reconciliation

Phase 15D.0 contains two separate historical bookkeeping inventories that each
contain ten items but are not identical:

- The audit matrix marks exactly `GB-005`, `GB-009`, `GB-021`, `GB-025`,
  `GB-027`, `GB-031`, `GB-033`, `GB-040`, `GB-042`, and `GB-050` as
  `CONTRADICTORY`.
- The separate **Contradictions found** list records Task terminal `rejected`,
  Install Grant retry/concurrency, anti-rollback persistence, version choice,
  Passport validation declarations, Receipt declarations, extension bounds,
  size negotiation, `CONNECTION_NOT_ACTIVE` HTTP status, and missing normative
  authentication-profile definitions.

This is an audit-inventory discrepancy about historical enumeration. It is not
a new protocol contradiction and creates no new semantics. Criterion 2 is
conservatively evaluated against both inventories: their union contains 13
distinct conflict classes. The source-membership column below prevents an item
unique to either inventory from being silently omitted.

| Conflict class | Source inventory membership | Applicable GB ID | Accepted H-* authority | Current D1 `REQ-*` realization | Downstream owner | Resolution result |
| --- | --- | --- | --- | --- | --- | --- |
| Version selection | Both | `GB-005` | H-03, H-04 | `REQ-VERS-0002`, `REQ-VERS-0014`, `REQ-VERS-0016` | D2-01, D2-04 | Total preference and one deterministic selection algorithm are fixed in D1; canonical result representation and permutation/downgrade cases remain D2-owned |
| Install Grant retry/concurrency | Both | `GB-009` | H-06 | `REQ-INST-0006`–`REQ-INST-0008` | D2-02, D2-04 | Exact replay eligibility, atomic authority creation, and convergence on one committed result are fixed in D1; machine/race evidence remains D2-owned |
| Task `rejected`-state disagreement | Both | `GB-021` | H-09 | `REQ-TASK-0003`–`REQ-TASK-0006` | D2-01, D2-02, D2-04 | `rejected` is a pre-Task admission outcome and the Task lifecycle is closed in D1; executable state and rejection cases remain D2-owned |
| Receipt structure/declarations | Both | `GB-025` | H-09, H-10, H-11, H-13 | `REQ-RCPT-0003`, `REQ-RCPT-0005` | D2-01, D2-03, D2-04 | Complete immutable semantic projection and protected cryptographic context are fixed in D1; schema parity, vectors, and mutations remain D2-owned |
| Canonicalization/digest implementations | Matrix `CONTRADICTORY` inventory only | `GB-027` | H-10 | `REQ-RCPT-0003`–`REQ-RCPT-0006`, `REQ-RCPT-0008` | D2-03, D2-04 | D1 fixes purpose-specific projection, domains, profiles, context, and verification; byte-exact cross-language vectors and negative differentials remain D2-owned |
| Revocation point status versus authoritative snapshot/set | Matrix `CONTRADICTORY` inventory only | `GB-031` | H-10, H-11 | `REQ-TRUST-0004`–`REQ-TRUST-0007` | D2-01, D2-02, D2-04 | D1 distinguishes the authoritative complete snapshot from a bound non-authoritative point projection and fixes chain rules; representations and equivalence/chain cases remain D2-owned |
| Anti-rollback persistence | Both | `GB-033` | H-11 | `REQ-TRUST-0012`–`REQ-TRUST-0015`, `REQ-TRUST-0026` | D2-01, D2-02, D2-04 | Durable floors, atomic advancement, restart/restore preservation, and governed recovery are fixed in D1; executable persistence and recovery evidence remains D2-owned |
| Response-size negotiation/bounds | Both | `GB-040` | H-12 | `REQ-TRAN-0005`, `REQ-TRAN-0013` | D2-01, D2-04 | Encoded/decoded media and baseline streaming/parser bounds are fixed in D1 without adopting an implementation default; canonical carriers and boundary corpora remain D2-owned |
| Extension bounds/openness | Both | `GB-042` | H-04, H-13 | `REQ-EXT-0001`–`REQ-EXT-0006` | D2-01, D2-04 | Closed-Core defaults, the per-object openness registry, exact identities/locations, and required/optional behavior are fixed in D1; schemas and boundary fixtures remain D2-owned |
| Conformance oracle dependence | Matrix `CONTRADICTORY` inventory only | `GB-050` | H-14 | `REQ-IDX-0002`, `REQ-IDX-0003`, `REQ-IDX-0008` | D2-05 | D1 prohibits implementation behavior from becoming law and preserves implementation neutrality and claim boundaries; the implementation-neutral runner/oracle remains D2-05-owned and does not yet exist |
| Passport validation/declaration requirements | Explicit **Contradictions found** inventory only | No distinct GB row assigned by that list | H-02, H-04, H-10, H-13 | `REQ-TERM-0004`, `REQ-ROLE-0009`, `REQ-DISC-0003`, `REQ-VERS-0004`, `REQ-VERS-0010` | D2-01, D2-04, D2-05 | D1 fixes Passport identity/declaration ownership, Trust, source-required presence, and monotonic ceilings; exact canonical representation and validation cases remain D2-owned |
| `CONNECTION_NOT_ACTIVE` HTTP-status mapping | Explicit **Contradictions found** inventory only | `GB-035` | H-07, H-12 | `REQ-ERR-0002`, `REQ-ERR-0003` | D2-04, D2-05 | Accepted HTTP meanings and stable public error mappings are fixed in D1; status matrix and raw equivalence cases remain D2-owned |
| Authentication-profile documentation/normative-definition gap | Explicit **Contradictions found** inventory only | `GB-007` | H-05 | `REQ-AUTH-0002`–`REQ-AUTH-0005`, `REQ-AUTH-0007`–`REQ-AUTH-0009` | D2-01, D2-02, D2-03, D2-04 | D1 fixes selected-profile identity, production floor, binding, proof, lifecycle, and failure boundaries; concrete registry assets and executable cases remain D2-owned |

All 13 union classes therefore have accepted governed D1 realization or an
explicit downstream disposition. Criterion 2 remains **PASS** on that stronger
union basis. No implementation behavior involved in either inventory was
selected as protocol law merely because it already existed.

## Combined finding reconciliation

The governing-ownership cells below preserve the exact ownership established by
the completed final reconciliation. A finding identifier creates no new
requirement. D2, implementation, later-governance, and residual dispositions
must preserve the cited D1/H authority without turning review advice into
protocol law.

| Review finding | Original classification | Governing requirement/decision ownership | Reconciled disposition | D1 correction required | Blocks exit |
| --- | --- | --- | --- | --- | --- |
| Go F-01 | `D2_OWNED_NOT_A_D1_BLOCKER` | `REQ-IDX-0008`, `REQ-TRAN-0003`–`REQ-TRAN-0006`, `REQ-EXT-0004`, `REQ-TRUST-0007`; D2-01–D2-04 | Preserve D1; carry executable representation/evidence into the assigned D2 class | No | No |
| Go F-02 | `D2_OWNED_NOT_A_D1_BLOCKER` | `REQ-AUTH-0002`–`REQ-AUTH-0004`; release-profile registry / D2-01 | Preserve D1; carry executable representation/evidence into the assigned D2 class | No | No |
| Go F-03 | `LATER_GOVERNANCE` | `REQ-TRAN-0008`–`REQ-TRAN-0009`, `REQ-SEC-0008`; H-12/H-14 | Defer to the existing H-14-governed release/support/evidence process | No | No |
| Go F-04 | `LATER_GOVERNANCE` | `REQ-CONN-0010`, `REQ-TASK-0031`–`REQ-TASK-0033`, `REQ-TRUST-0028`, `REQ-PRIV-0008`; H-14 | Defer to the existing H-14-governed release/support/evidence process | No | No |
| Go F-05 | `MINOR_EDITORIAL` | H-08/H-12; `REQ-APPR-0002`, `REQ-INV-0003`, `REQ-TRAN-0004`, `REQ-ERR-0003` | Record as non-semantic editorial observation; no normative correction | No | No |
| Go F-06 | `IMPLEMENTER_CHOICE` | `REQ-IDX-0003`, `REQ-APPR-0031`, `REQ-TASK-0007`, `REQ-TRUST-0012`–`REQ-TRUST-0015` | Leave architecture/mechanism to implementations while enforcing observable requirements | No | No |
| Go F-07 | `LATER_GOVERNANCE` | `REQ-IDX-0001`, `REQ-IDX-0008`, `REQ-TRUST-0024`; H-14 | Defer to the existing H-14-governed release/support/evidence process | No | No |
| Python PY-01 | `D2_OWNED_NOT_A_D1_BLOCKER` | `REQ-IDX-0005`, `REQ-COMP-0007`, `REQ-EXT-0002`, `REQ-VERS-0016`; D2-01 | Preserve D1; carry executable representation/evidence into the assigned D2 class | No | No |
| Python PY-02 | `D2_OWNED_NOT_A_D1_BLOCKER` | `REQ-TRAN-0003`–`REQ-TRAN-0005`, `REQ-DISC-0003`, `REQ-DISC-0009`; D2-01 | Preserve D1; carry executable representation/evidence into the assigned D2 class | No | No |
| Python PY-03 | `D2_OWNED_NOT_A_D1_BLOCKER` | `REQ-AUTH-0002`–`REQ-AUTH-0004`; release-profile registry / D2-01 | Preserve D1; carry executable representation/evidence into the assigned D2 class | No | No |
| Python PY-04 | `D2_OWNED_NOT_A_D1_BLOCKER` | `REQ-IDX-0008`, `REQ-TASK-0005`, `REQ-TRUST-0007`–`REQ-TRUST-0015`; D2-01–D2-05 | Preserve D1; carry executable representation/evidence into the assigned D2 class | No | No |
| Python PY-05 | `IMPLEMENTER_CHOICE` | `REQ-IDX-0003`, `REQ-INST-0007`, `REQ-APPR-0031`, `REQ-TASK-0019`, `REQ-TRUST-0013`–`REQ-TRUST-0014` | Leave architecture/mechanism to implementations while enforcing observable requirements | No | No |
| Python PY-06 | `IMPLEMENTER_CHOICE` | `REQ-ROLE-0001`, `REQ-ROLE-0015`, `REQ-TRAN-0010` | Leave architecture/mechanism to implementations while enforcing observable requirements | No | No |
| Python PY-07 | `LATER_GOVERNANCE` | `REQ-TRAN-0008`, `REQ-TASK-0032`–`REQ-TASK-0033`, `REQ-TRUST-0028`, `REQ-PRIV-0008`; H-14 | Defer to the existing H-14-governed release/support/evidence process | No | No |
| Security/privacy F-01 | `D2_OWNED_NOT_A_D1_BLOCKER` | D2-01–D2-05; H-10–H-14; affected requirements | Preserve D1; carry executable security/privacy evidence into the assigned D2 class | No | No |
| Security/privacy F-02 | `LATER_GOVERNANCE` | `REQ-TRAN-0008`–`REQ-TRAN-0009`, `REQ-PRIV-0008`; H-14 | Defer to the existing H-14-governed review/risk/evidence process | No | No |
| Security/privacy F-03 | `IMPLEMENTER_HARDENING` | `REQ-TRAN-*`, `REQ-TRUST-*`, `REQ-PRIV-*`; H-12 | Harden implementations without turning the selected technique into protocol architecture | No | No |
| Security/privacy F-04 | `ACCEPTED_RESIDUAL_BOUNDARY` | `REQ-ERR-0005`–`REQ-ERR-0006`, `REQ-PRIV-0002`; H-12 | Preserve the explicit residual boundary; do not rewrite D1 or claim risk elimination | No | No |
| Security/privacy F-05 | `ACCEPTED_RESIDUAL_BOUNDARY` | `REQ-TRUST-*`; H-11 | Preserve the explicit residual boundary; do not rewrite D1 or claim risk elimination | No | No |
| Security/privacy F-06 | `ACCEPTED_RESIDUAL_BOUNDARY` | `REQ-EXT-*`, `REQ-PRIV-*`; H-13 | Preserve the explicit residual boundary; do not rewrite D1 or claim risk elimination | No | No |
| Security/privacy F-07 | `IMPLEMENTER_HARDENING` | `REQ-PRIV-0003`–`REQ-PRIV-0007`; H-12; later P1-03 verification | Harden implementations without turning the selected technique into protocol architecture | No | No |

## Cross-review reconciliation

### Go/Python semantic agreement

Both isolated reviewers could produce coherent implementation designs from the
normative corpus. Final comparison found no material semantic disagreement.
Language-specific package layouts, types, storage mechanisms, concurrency
primitives, and other implementation proposals remain implementation choices;
they are not normative architecture. This is designability evidence only and
does not satisfy P1-01 or establish interoperability.

### Security/privacy authority paths

The security/privacy review found no undocumented authority path and no
undocumented protected-value flow. Its nonblocking findings remain assigned to
D2 evidence, implementation hardening, later governance, or accepted residual
boundaries as recorded above. This narrow Phase 15D.1 review is not the external
protocol-and-implementation security review required by P1-03.

### Implementation-as-law audit

The reconciliation found that protocol meaning remains sourced only from
accepted `H-*` decisions as realized in labeled `REQ-*` requirements. Existing
code, tests, schemas, Platform behavior, package metadata, CI, and external
standards remain evidence only and do not independently create or override a
protocol rule.

### Version and history integrity

The historical `ghostbridge/0.1-draft` meaning remains immutable. The exact
candidate identity remains `ghostbridge/e1.r0-draft.1` under H-03. No current
default, later asset, implementation behavior, or status record reinterprets
either identity.

## Final gate state

**`EXIT_CRITERIA_SATISFIED`**

This state applies only to the Phase 15D.1 normative-writing exit criteria.
Phase 15D.2 has not started. All `GB-*` gaps remain `PENDING` until their
existing downstream evidence owners satisfy the plan's closure process. This
evidence act created no schema, state machine, fixture, vector, conformance
case, runner, or other D2 asset.

## Limitations and strict non-equivalences

Phase 15D.1 exit satisfaction does **not** mean:

- any `GB-*` gap is `CLOSED`;
- Phase 15D.2 is complete;
- D2 schemas exist;
- D2 executable state machines exist;
- D2 fixtures or vectors exist;
- D2 conformance exists;
- any official implementation conforms;
- P1-01 independent production implementation exists;
- P1-02 interoperability exists;
- P1-03 external security review exists;
- Phase 15E is complete;
- release readiness exists;
- production readiness exists;
- anything has been published; or
- Ghost Bridge Protocol 1.0 exists.

The exact protocol candidate remains `ghostbridge/e1.r0-draft.1`. It remains a
draft/prerelease.
