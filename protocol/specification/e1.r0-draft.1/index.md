# Ghost Bridge `e1.r0-draft.1`

## Status

This directory is the normative-writing candidate for
`ghostbridge/e1.r0-draft.1`. It is a draft/prerelease. It is incomplete, has not
been published as a final protocol release, is not independently conformant, and
is not Protocol 1.0.

## Normative boundary

Only text explicitly labeled with a `REQ-*` identifier is a normative
requirement in this draft candidate. Definitions and tables contained inside a
labeled requirement are part of that requirement. Status notices, rationale,
chapter introductions, navigation, planning inventories, and traceability tables
are non-normative unless a labeled requirement expressly incorporates them.

Accepted `H-*` decisions are the governing sources for this draft. Existing
software, schemas, tests, Platform behavior, package metadata, historical
`0.1-draft` prose, and external standards are evidence only. If draft text
conflicts with an accepted decision, the accepted decision controls until the
draft is corrected through review.

## Requirement-ID and traceability convention

Requirement IDs use `REQ-<CHAPTER>-NNNN`, where `<CHAPTER>` is `IDX`, `TERM`,
`ROLE`, `LIFE`, `DISC`, `VERS`, `COMP`, `EXT`, `AUTH` (authentication), `AUTHZ`
(authorization), `INST` (installation), `CONN` (Connections), or `INV`
(Invocation, correlation, deadline, cancellation, and idempotency admission),
or `APPR` (Approval Challenge, Decision, exact-action authority, lifecycle,
consumption, replay, and recovery), or `TASK` (Task acceptance, lifecycle,
attempts, progress, cancellation, deadlines, Result, polling, retention,
recovery, and terminal Receipt coupling), or `RCPT` (Receipt semantic identity,
terminal binding, evidence commitment, proof/materialization, verification, and
historical evidence), or `TRUST` (Trust continuity, bootstrap, metadata, key
lifecycle, revocation, freshness, durable floors, anti-rollback, recovery, and
historical verification), or `TRAN` (transport-independent and HTTP binding),
`ERR` (errors and status mapping), `SEC` (cross-cutting security), or `PRIV`
(privacy and safe observability), and `NNNN` is a zero-padded chapter-local sequence.
IDs are unique and permanent once reviewed. A later insertion allocates a new
number in its own chapter; it does not renumber or reuse another ID. The syntax
is an editorial locator only and encodes no protocol semantics.

Every requirement records its accepted `H-*` sources and the applicable audited
`GB-*` gaps. Those citations establish derivation and planning traceability; they
do not close a gap. Later schemas, state machines, fixtures, vectors, and
conformance cases are expected to cite the requirement IDs from which they are
derived.

The uppercase key words `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY`
express requirement force. `MUST` and `MUST NOT` are unconditional for an
applicable claim; `SHOULD` and `SHOULD NOT` require a documented, security-safe
reason to deviate; `MAY` identifies a permitted choice and never grants authority
that another requirement withholds.

## Governing decision set

The governing inputs are the accepted decisions
[`H-01`](../../decisions/H-01-lifecycle-initialization-and-ordering.md),
[`H-02`](../../decisions/H-02-roles-trust-boundaries-and-authorization-floor.md),
[`H-03`](../../decisions/H-03-protocol-version-identity-and-history.md),
[`H-04`](../../decisions/H-04-capability-profile-and-optional-feature-negotiation.md),
[`H-05`](../../decisions/H-05-authentication-profiles-and-credential-binding.md),
[`H-06`](../../decisions/H-06-install-grant-redemption-and-retry-semantics.md),
[`H-07`](../../decisions/H-07-connection-lifecycle-and-scoped-authority.md),
[`H-08`](../../decisions/H-08-exact-action-approval-lifecycle-and-consumption.md),
[`H-09`](../../decisions/H-09-task-result-cancellation-and-retention-model.md),
[`H-10`](../../decisions/H-10-canonical-bytes-digests-signatures-and-proof-profiles.md),
[`H-11`](../../decisions/H-11-revocation-anti-rollback-and-historical-verification.md),
[`H-12`](../../decisions/H-12-transport-errors-limits-and-observability.md),
[`H-13`](../../decisions/H-13-schema-openness-extensions-and-evolution.md), and
[`H-14`](../../decisions/H-14-release-support-review-and-1-0-graduation-authority.md).
Their acceptance is input to this draft, not a claim that this draft or any
downstream asset has passed its later gate.

## Draft requirements

### REQ-IDX-0001 - Draft identity and status

**Requirement.** The protocol release identity of this draft candidate MUST be
exactly `ghostbridge/e1.r0-draft.1`, and its specification directory component
MUST be exactly `e1.r0-draft.1`. Every reference to this candidate MUST preserve
its draft/prerelease status and MUST NOT describe it as final or Protocol 1.0.

**Sources:** H-03, H-14. **Gaps:** GB-001.

### REQ-IDX-0002 - Governing sources and requirement boundary

**Requirement.** Normative requirements in this candidate MUST derive from
accepted H-01 through H-14. Implementation behavior, schemas, tests, historical
draft prose, package metadata, CI behavior, Platform behavior, and external
standards MUST NOT independently create, override, or fill a protocol
requirement. Untagged planning and traceability text MUST NOT be treated as a
source of protocol meaning.

**Sources:** H-01, H-02, H-03, H-04, H-05, H-06, H-07, H-08, H-09, H-10, H-11,
H-12, H-13, H-14. **Gaps:** GB-001, GB-002, GB-003.

### REQ-IDX-0003 - Implementation neutrality

**Requirement.** A protocol requirement MUST describe observable protocol
semantics and logical responsibility without requiring a particular language,
process count, database, queue, network library, SDK, official runtime, or
managed service. A conforming deployment MAY co-locate logical roles only while
preserving their separate authority and observable responsibilities.

**Sources:** H-02, H-06, H-07, H-09, H-14. **Gaps:** GB-001, GB-002, GB-003.

### REQ-IDX-0004 - Protocol law and deployment policy

**Requirement.** Platform, Host, organization, workspace, and other deployment
policy MAY impose stricter controls. Such policy MUST NOT weaken the protocol
floor, widen a Connection, redefine a wire or lifecycle meaning, or become a
required protocol behavior merely because one implementation enforces it.

**Sources:** H-02, H-04, H-05, H-12, H-14. **Gaps:** GB-002, GB-003.

### REQ-IDX-0005 - Distinct identities

**Requirement.** Implementations and specifications MUST keep the following
identities distinct and MUST NOT infer one from another:

| Identity | Meaning |
| --- | --- |
| Protocol release identity | The exact immutable H-03 identity selecting protocol semantics and compatibility treatment |
| Package identity | The name and version of a distributed SDK, library, server, tool, or other package |
| Implementation version | The build or release of software that implements one or more protocol releases |
| Schema identity | The immutable identity of an individual schema or its release-bound schema bundle; it is not independently negotiated |
| Proof profile identity | The exact H-10 identifier fixing canonicalization, digest, signature, or proof behavior for one purpose |
| Deployment version | The build, configuration, rollout, or product release of a particular deployment, including Platform |

**Sources:** H-03, H-10, H-13, H-14. **Gaps:** GB-001.

### REQ-IDX-0006 - No MCP or direct Agent authority

**Requirement.** Ghost Bridge MUST NOT require an MCP runtime, import MCP
lifecycle or authority semantics, or treat MCP participation as protocol
authority. An Agent MUST NOT obtain direct or inherited authority to invoke
another Agent merely from Agent identity, Passport, Trust evidence, Approval,
coordination metadata, or role co-location.

**Sources:** H-01, H-02, H-04. **Gaps:** GB-001, GB-002, GB-003.

### REQ-IDX-0007 - Immutable history

**Requirement.** `ghostbridge/0.1-draft` MUST remain an immutable legacy
historical identity outside the epoch/revision grammar. It MUST NOT be aliased to
this draft, rewritten, backfilled, or interpreted with current defaults. Missing
historical negotiation, consent, authentication, authority, schema, or proof
evidence MUST NOT be fabricated.

**Sources:** H-03, H-04, H-05, H-06, H-09, H-10, H-11, H-13, H-14.
**Gaps:** GB-001.

### REQ-IDX-0008 - Claim boundary

**Requirement.** No implementation, schema, state machine, fixture, vector,
conformance result, package, deployment, release manifest, publication, or
Protocol 1.0 status MAY be claimed solely because this draft text exists. Every
such claim MUST pass its separately governed downstream gate and retain its exact
release, profile, role, artifact, and evidence scope.

**Sources:** H-03, H-10, H-13, H-14. **Gaps:** GB-001.

## Chapters in the current D1 draft

- [Terminology](./terminology.md)
- [Roles and trust boundaries](./roles-and-trust-boundaries.md)
- [Lifecycle](./lifecycle.md)
- [Discovery](./discovery.md)
- [Versioning and capabilities](./versioning-and-capabilities.md)
- [Compatibility](./compatibility.md)
- [Extensions](./extensions.md)
- [Authentication](./authentication.md)
- [Authorization](./authorization.md)
- [Installation](./installation.md)
- [Connections](./connections.md)
- [Invocation](./invocation.md)
- [Approvals](./approvals.md)
- [Tasks](./tasks.md)
- [Receipts](./receipts.md)
- [Trust and revocation](./trust-and-revocation.md)
- [Transport](./transport.md)
- [Errors](./errors.md)
- [Security considerations](./security-considerations.md)
- [Privacy considerations and safe observability](./privacy-considerations.md)

The first three chapters are the reviewed and integrated D1-01 slice. Discovery
through Extensions are the reviewed and integrated D1-02 slice. Authentication
through Invocation are the reviewed and integrated D1-03 slice. Approvals is
the reviewed and integrated D1-04 slice. Tasks is the reviewed and integrated
D1-05 slice. Receipts and Trust/revocation are the reviewed and integrated
D1-06 slice. Transport, Errors, Security considerations, and Privacy
considerations are the reviewed and integrated D1-07 slice. All D1-01 through
D1-07 normative-writing work items have therefore been reviewed and integrated.

This status does not by itself satisfy the Phase 15D.1 exit criteria. Phase
15D.1 is currently `READY_FOR_REQUIRED_INDEPENDENT_REVIEWS`, not complete. The
independent Go implementation-design review, independent Python implementation-
design review, and independent security/privacy authority-path and protected-
value-flow review remain required. Findings from those reviews may require
governed corrections before the Phase 15D.1 exit gate can pass. This status
update authorizes no D2 work, closes no `GB-*` gap, and does not change this
draft's prerelease status or make it Protocol 1.0.

## Planned later assets

Later D2 work is expected to create canonical wire schemas, explicit
machine-readable state machines, deterministic fixtures and cryptographic
vectors, malicious/failure/compatibility corpora, and implementation-neutral
black-box conformance. None of those assets exists by virtue of this index, and
this draft assigns no future asset ID or digest.

## D1 traceability table

This table is non-normative planning traceability. "Expected asset" means a
later asset class, not an existing artifact. No listed gap is closed here.

| Requirement ID | Accepted H-* source | Applicable GB-* gap | Chapter | Expected later D2 asset class |
| --- | --- | --- | --- | --- |
| REQ-IDX-0001 | H-03, H-14 | GB-001 | Index | D2-05 requirement/claim conformance |
| REQ-IDX-0002 | H-01-H-14 | GB-001, GB-002, GB-003 | Index | D2-05 traceability and oracle-independence checks |
| REQ-IDX-0003 | H-02, H-06, H-07, H-09, H-14 | GB-001, GB-002, GB-003 | Index | D2-05 multi-topology conformance |
| REQ-IDX-0004 | H-02, H-04, H-05, H-12, H-14 | GB-002, GB-003 | Index | D2-05 Platform-policy delta cases |
| REQ-IDX-0005 | H-03, H-10, H-13, H-14 | GB-001 | Index | D2-01 identity schemas; D2-05 substitution cases |
| REQ-IDX-0006 | H-01, H-02, H-04 | GB-001, GB-002, GB-003 | Index | D2-04 prohibited-flow fixtures; D2-05 conformance |
| REQ-IDX-0007 | H-03-H-06, H-09-H-11, H-13, H-14 | GB-001 | Index | D2-04 historical-compatibility fixtures |
| REQ-IDX-0008 | H-03, H-10, H-13, H-14 | GB-001 | Index | D2-05 claim-scope conformance |
| REQ-TERM-0001 | H-03, H-13, H-14 | GB-001 | Terminology | D2-01 identity schemas; D2-05 glossary assertions |
| REQ-TERM-0002 | H-01, H-02, H-05, H-07 | GB-001, GB-002, GB-003 | Terminology | D2-05 role/participant assertions |
| REQ-TERM-0003 | H-02, H-07, H-08, H-11 | GB-001, GB-002, GB-003 | Terminology | D2-01 evidence and tenant schemas; D2-05 role assertions |
| REQ-TERM-0004 | H-01, H-03, H-04, H-05, H-06, H-07 | GB-001, GB-003 | Terminology | D2-01 authority-object schemas; D2-02 state machines |
| REQ-TERM-0005 | H-02, H-07, H-08, H-09, H-10, H-11 | GB-001, GB-003, GB-016 | Terminology | D2-01 work/evidence schemas; D2-02 state machines |
| REQ-TERM-0006 | H-04, H-05, H-12 | GB-001, GB-003 | Terminology | D2-05 profile/facet conformance |
| REQ-TERM-0007 | H-01, H-07, H-09, H-11, H-12 | GB-001, GB-003, GB-014, GB-015, GB-016 | Terminology | D2-01 operation schemas; D2-05 operation-class cases |
| REQ-TERM-0008 | H-01, H-02, H-03, H-12, H-14 | GB-001, GB-002, GB-003 | Terminology | D2-04 confusion fixtures; D2-05 boundary cases |
| REQ-ROLE-0001 | H-02, H-14 | GB-002, GB-003 | Roles and trust boundaries | D2-05 embedded/separated/managed topology cases |
| REQ-ROLE-0002 | H-02, H-03, H-05, H-07, H-09, H-11, H-12 | GB-002, GB-003 | Roles and trust boundaries | D2-05 Client responsibility cases |
| REQ-ROLE-0003 | H-01, H-02, H-05, H-08 | GB-002, GB-003 | Roles and trust boundaries | D2-05 Host responsibility cases |
| REQ-ROLE-0004 | H-02, H-05, H-07, H-08 | GB-002, GB-003 | Roles and trust boundaries | D2-05 principal/scope cases |
| REQ-ROLE-0005 | H-01, H-02, H-05-H-12 | GB-002, GB-003, GB-015, GB-016 | Roles and trust boundaries | D2-01 enforcement evidence; D2-05 Agent cases |
| REQ-ROLE-0006 | H-02, H-07, H-11, H-14 | GB-002, GB-003 | Roles and trust boundaries | D2-05 operator-boundary cases |
| REQ-ROLE-0007 | H-02, H-08, H-10, H-11 | GB-002, GB-003 | Roles and trust boundaries | D2-01 Approval evidence; D2-05 Approver cases |
| REQ-ROLE-0008 | H-02, H-07, H-08, H-10, H-12 | GB-002, GB-003 | Roles and trust boundaries | D2-01 authorization evidence; D2-05 policy cases |
| REQ-ROLE-0009 | H-02, H-10, H-11 | GB-002, GB-003 | Roles and trust boundaries | D2-01 Passport/issuer evidence; D2-05 issuer cases |
| REQ-ROLE-0010 | H-02, H-05, H-07, H-10, H-11, H-12, H-14 | GB-002, GB-003 | Roles and trust boundaries | D2-01 Trust evidence; D2-02 checkpoint model; D2-05 Trust cases |
| REQ-ROLE-0011 | H-02, H-07, H-11 | GB-002, GB-003 | Roles and trust boundaries | D2-01 tenant evidence; D2-05 organization cases |
| REQ-ROLE-0012 | H-02, H-07, H-11 | GB-002, GB-003 | Roles and trust boundaries | D2-01 tenant evidence; D2-05 workspace cases |
| REQ-ROLE-0013 | H-02, H-07, H-08, H-11 | GB-002, GB-003 | Roles and trust boundaries | D2-04 authority-confusion fixtures; D2-05 cases |
| REQ-ROLE-0014 | H-02, H-07, H-08, H-09 | GB-002, GB-003, GB-016 | Roles and trust boundaries | D2-05 omitted-check/final-enforcement cases |
| REQ-ROLE-0015 | H-02, H-04, H-05, H-12, H-14 | GB-002, GB-003 | Roles and trust boundaries | D2-05 Platform delta/topology cases |
| REQ-ROLE-0016 | H-01, H-02, H-04, H-10 | GB-001, GB-002, GB-003 | Roles and trust boundaries | D2-04 prohibited-transfer fixtures; D2-05 cases |
| REQ-LIFE-0001 | H-01, H-06, H-07 | GB-001, GB-003 | Lifecycle | D2-02 lifecycle state machines; D2-05 ordering cases |
| REQ-LIFE-0002 | H-01, H-03-H-12 | GB-001, GB-003, GB-014, GB-015, GB-016 | Lifecycle | D2-02 integrated lifecycle; D2-05 trace cases |
| REQ-LIFE-0003 | H-01, H-11, H-12 | GB-001, GB-003 | Lifecycle | D2-01 metadata schemas; D2-05 public-operation cases |
| REQ-LIFE-0004 | H-01, H-05, H-06, H-12 | GB-001, GB-003 | Lifecycle | D2-01 pre-Connection schemas; D2-05 ordering cases |
| REQ-LIFE-0005 | H-02, H-07-H-09, H-12 | GB-001, GB-003, GB-015, GB-016 | Lifecycle | D2-01 governed-operation schemas; D2-05 authority cases |
| REQ-LIFE-0006 | H-03, H-07, H-09-H-12, H-14 | GB-001, GB-003 | Lifecycle | D2-01 historical-read schemas; D2-03 proof vectors; D2-04 history fixtures |
| REQ-LIFE-0007 | H-06-H-09, H-12 | GB-014 | Lifecycle | D2-01 correlation/idempotency schemas; D2-05 confusion cases |
| REQ-LIFE-0008 | H-01, H-03, H-04, H-12 | GB-001, GB-003 | Lifecycle | D2-01 discovery schemas; D2-04 stale/downgrade fixtures |
| REQ-LIFE-0009 | H-01, H-02, H-05, H-10, H-11 | GB-001, GB-002, GB-003 | Lifecycle | D2-02 Trust checkpoint model; D2-04 stale/rollback fixtures |
| REQ-LIFE-0010 | H-01, H-04, H-05, H-10 | GB-001, GB-003 | Lifecycle | D2-01 preview/consent schemas; D2-04 mutation fixtures |
| REQ-LIFE-0011 | H-01, H-02, H-05 | GB-002, GB-003 | Lifecycle | D2-01 authentication schemas; D2-05 authentication-order cases |
| REQ-LIFE-0012 | H-01, H-04-H-06, H-11 | GB-001, GB-003 | Lifecycle | D2-02 Install Grant machine; D2-04 race fixtures |
| REQ-LIFE-0013 | H-01, H-03, H-04, H-06 | GB-001, GB-003 | Lifecycle | D2-01 negotiation schemas; D2-04 downgrade fixtures |
| REQ-LIFE-0014 | H-01, H-06, H-07 | GB-001, GB-003 | Lifecycle | D2-02 atomic authority transition; D2-05 commit cases |
| REQ-LIFE-0015 | H-06, H-07, H-12 | GB-003, GB-014 | Lifecycle | D2-02 redemption machine; D2-04 crash/retry fixtures |
| REQ-LIFE-0016 | H-02, H-05, H-07, H-08, H-10, H-11 | GB-002, GB-003, GB-015 | Lifecycle | D2-02 Invocation acceptance; D2-05 gate cases |
| REQ-LIFE-0017 | H-02, H-07, H-08 | GB-002, GB-003 | Lifecycle | D2-02 Approval machine; D2-04 replay/race fixtures |
| REQ-LIFE-0018 | H-07, H-08, H-09 | GB-003, GB-016 | Lifecycle | D2-02 Task machine; D2-05 Task-birth cases |
| REQ-LIFE-0019 | H-09, H-10, H-11 | GB-001, GB-003, GB-016 | Lifecycle | D2-01 Result/Receipt schemas; D2-02 terminal transaction |
| REQ-LIFE-0020 | H-09, H-12 | GB-003, GB-016 | Lifecycle | D2-02 cancellation transitions; D2-04 race fixtures |
| REQ-LIFE-0021 | H-07-H-09, H-12 | GB-003, GB-015, GB-016 | Lifecycle | D2-02 time-boundary transitions; D2-04 clock fixtures |
| REQ-LIFE-0022 | H-07 | GB-001, GB-003, GB-015 | Lifecycle | D2-02 Connection state machine |
| REQ-LIFE-0023 | H-05, H-07, H-11 | GB-002, GB-003, GB-015 | Lifecycle | D2-02 suspension/resumption model; D2-04 recovery fixtures |
| REQ-LIFE-0024 | H-07, H-11, H-14 | GB-001, GB-003, GB-015 | Lifecycle | D2-02 terminal transitions; D2-04 terminal-race fixtures |
| REQ-LIFE-0025 | H-04-H-07, H-11 | GB-001, GB-003 | Lifecycle | D2-02 replacement coordinator model; D2-04 crash fixtures |
| REQ-LIFE-0026 | H-01, H-06, H-07, H-09, H-11 | GB-001, GB-003 | Lifecycle | D2-02 restart/recovery invariants; D2-04 corruption fixtures |
| REQ-LIFE-0027 | H-03, H-09-H-11, H-14 | GB-001, GB-003 | Lifecycle | D2-03 proof vectors; D2-04 historical fixtures |
| REQ-LIFE-0028 | H-01, H-07, H-09, H-11, H-12 | GB-003, GB-015, GB-016 | Lifecycle | D2-04 transport-ambiguity fixtures; D2-05 cases |
| REQ-LIFE-0029 | H-01-H-12 | GB-001, GB-002, GB-003, GB-014, GB-015, GB-016 | Lifecycle | D2-04 illegal-order fixtures; D2-05 conformance |
| REQ-LIFE-0030 | H-01, H-06-H-09, H-11, H-12 | GB-003, GB-014, GB-015, GB-016 | Lifecycle | D2-02 durability invariants; D2-04 restart fixtures |
| REQ-DISC-0001 | H-01, H-12 | GB-004 | Discovery | D2-01 discovery schemas; D2-05 authority-boundary cases |
| REQ-DISC-0002 | H-01, H-03, H-12 | GB-004, GB-005 | Discovery | D2-01 bootstrap schema; D2-04 route/origin cases |
| REQ-DISC-0003 | H-01, H-03, H-04, H-10, H-13 | GB-004, GB-005, GB-006, GB-042 | Discovery | D2-01 release-record schema; D2-04 missing-artifact cases |
| REQ-DISC-0004 | H-01, H-04, H-07 | GB-004, GB-006 | Discovery | D2-04 Passport/discovery/Offer intersection fixtures |
| REQ-DISC-0005 | H-03, H-04 | GB-004, GB-005, GB-006 | Discovery | D2-04 duplicate/conflict/permutation fixtures |
| REQ-DISC-0006 | H-01, H-03, H-04, H-11, H-12 | GB-004, GB-005, GB-006 | Discovery | D2-04 cache/freshness/revalidation fixtures |
| REQ-DISC-0007 | H-01, H-03, H-04, H-06, H-10 | GB-004, GB-005, GB-006 | Discovery | D2-04 preview/consent mutation fixtures |
| REQ-DISC-0008 | H-01, H-03, H-04, H-07, H-11, H-14 | GB-004, GB-005, GB-006, GB-044 | Discovery | D2-04 active-Connection rediscovery/restart fixtures |
| REQ-DISC-0009 | H-01, H-05, H-07, H-11, H-12 | GB-004, GB-045 | Discovery | D2-04 origin/redirect/credential-forwarding fixtures |
| REQ-DISC-0010 | H-01, H-04, H-13 | GB-004, GB-042, GB-045 | Discovery | D2-04 unknown-field/extension-advertisement fixtures |
| REQ-DISC-0011 | H-01, H-03, H-04, H-06, H-12, H-13 | GB-004, GB-005, GB-006, GB-042, GB-045 | Discovery | D2-04 discovery semantic-failure corpus |
| REQ-VERS-0001 | H-03, H-13 | GB-005, GB-043, GB-044, GB-045 | Versioning and capabilities | D2-01 release-identity schema; D2-04 grammar corpus |
| REQ-VERS-0002 | H-03 | GB-005, GB-044 | Versioning and capabilities | D2-04 ordering and language-portability matrix |
| REQ-VERS-0003 | H-03, H-10, H-13, H-14 | GB-005, GB-043, GB-044 | Versioning and capabilities | D2-04 identity-confusion and legacy fixtures |
| REQ-VERS-0004 | H-01, H-03, H-04, H-10, H-13 | GB-005, GB-006, GB-042, GB-045 | Versioning and capabilities | D2-01 negotiation-input schemas; D2-04 metadata corpus |
| REQ-VERS-0005 | H-03 | GB-005 | Versioning and capabilities | D2-04 preferredVersion consistency matrix |
| REQ-VERS-0006 | H-03, H-04 | GB-005, GB-044, GB-045 | Versioning and capabilities | D2-04 intersection/unknown/unsupported matrix |
| REQ-VERS-0007 | H-03, H-04, H-10, H-13 | GB-005, GB-006, GB-043, GB-044, GB-045 | Versioning and capabilities | D2-04 cross-release evidence-isolation fixtures |
| REQ-VERS-0008 | H-03, H-11, H-14 | GB-005, GB-044 | Versioning and capabilities | D2-04 status/security/withdrawal matrix |
| REQ-VERS-0009 | H-04 | GB-006, GB-044 | Versioning and capabilities | D2-04 role/facet Cartesian fixtures |
| REQ-VERS-0010 | H-01, H-04, H-07 | GB-006, GB-042, GB-045 | Versioning and capabilities | D2-04 source-ownership/absence fixtures |
| REQ-VERS-0011 | H-04 | GB-006 | Versioning and capabilities | D2-04 profile/feature/capability Cartesian fixtures |
| REQ-VERS-0012 | H-04, H-05, H-13 | GB-006, GB-042, GB-046 | Versioning and capabilities | D2-04 authentication/extension/experiment fixtures |
| REQ-VERS-0013 | H-04, H-07, H-13 | GB-006, GB-042, GB-045 | Versioning and capabilities | D2-04 failure-granularity and isolation matrix |
| REQ-VERS-0014 | H-01, H-03, H-04, H-06, H-13 | GB-005, GB-006, GB-042, GB-044, GB-045, GB-046 | Versioning and capabilities | D2-04 permutation/downgrade/selection matrix |
| REQ-VERS-0015 | H-01, H-03, H-04, H-06, H-07 | GB-005, GB-006 | Versioning and capabilities | D2-04 post-selection narrowing/no-reorder fixtures |
| REQ-VERS-0016 | H-01, H-03, H-04, H-05, H-07, H-10, H-13 | GB-005, GB-006, GB-042, GB-044, GB-045, GB-046 | Versioning and capabilities | D2-01 negotiated-result schema; D2-04 binding fixtures |
| REQ-VERS-0017 | H-01, H-03, H-04, H-06, H-07, H-10 | GB-005, GB-006, GB-044 | Versioning and capabilities | D2-02 atomic binding; D2-04 mixed-version fixtures |
| REQ-VERS-0018 | H-01, H-03, H-04, H-05, H-07, H-11, H-14 | GB-005, GB-006, GB-043, GB-044, GB-046 | Versioning and capabilities | D2-04 restart/default/replacement fixtures |
| REQ-COMP-0001 | H-03, H-13, H-14 | GB-005, GB-043, GB-044, GB-045 | Compatibility | D2-04 version-class confusion matrix |
| REQ-COMP-0002 | H-03, H-10, H-13 | GB-005, GB-043, GB-044, GB-045 | Compatibility | D2-04 directed/non-transitive compatibility matrix |
| REQ-COMP-0003 | H-03, H-04, H-12 | GB-005, GB-044, GB-045 | Compatibility | D2-04 candidate-versus-fallback fixtures |
| REQ-COMP-0004 | H-03, H-07, H-09, H-10, H-11, H-13, H-14 | GB-043, GB-044 | Compatibility | D2-04 stored-object backward-compatibility matrix |
| REQ-COMP-0005 | H-03, H-04, H-10, H-13 | GB-042, GB-045 | Compatibility | D2-04 forward-compatibility safe-mode fixtures |
| REQ-COMP-0006 | H-09, H-11, H-12, H-13 | GB-042, GB-045 | Compatibility | D2-04 unknown-enum/message/discriminator corpus |
| REQ-COMP-0007 | H-03, H-10, H-13 | GB-005, GB-043, GB-044 | Compatibility | D2-01 schema-bundle manifest; D2-04 substitution cases |
| REQ-COMP-0008 | H-03, H-07, H-10, H-12, H-13 | GB-043, GB-044, GB-045 | Compatibility | D2-04 schema-evolution compatibility matrix |
| REQ-COMP-0009 | H-03, H-07, H-09, H-10, H-11, H-13 | GB-043, GB-044 | Compatibility | D2-01 version-bound object schemas; D2-04 storage fixtures |
| REQ-COMP-0010 | H-03, H-07, H-11, H-14 | GB-005, GB-044 | Compatibility | D2-04 support/deprecation/withdrawal matrix |
| REQ-COMP-0011 | H-03, H-04, H-05, H-07, H-10, H-11, H-13, H-14 | GB-043, GB-044 | Compatibility | D2-04 immutable legacy/history fixtures |
| REQ-EXT-0001 | H-03, H-10, H-13 | GB-042, GB-043, GB-045 | Extensions | D2-01 closed-Core schemas; D2-04 unknown-field corpus |
| REQ-EXT-0002 | H-03-H-13 | GB-042, GB-043, GB-045 | Extensions | D2-01 per-object openness schemas; D2-04 registry matrix |
| REQ-EXT-0003 | H-09, H-11-H-13 | GB-042, GB-045 | Extensions | D2-04 unknown-value/dispatch fixtures |
| REQ-EXT-0004 | H-03, H-13, H-14 | GB-042, GB-043, GB-046 | Extensions | D2-01 extension-identity schema; D2-04 identity corpus |
| REQ-EXT-0005 | H-03-H-05, H-12, H-13 | GB-042, GB-043, GB-045 | Extensions | D2-04 location/channel-confusion fixtures |
| REQ-EXT-0006 | H-04, H-07, H-13 | GB-006, GB-042, GB-045 | Extensions | D2-04 required/optional/selection occurrence matrix |
| REQ-EXT-0007 | H-02, H-04, H-07, H-10, H-13 | GB-006, GB-042, GB-045 | Extensions | D2-04 authority-widening/criticality fixtures |
| REQ-EXT-0008 | H-03, H-04, H-13 | GB-005, GB-006, GB-042, GB-046 | Extensions | D2-04 dependency/conflict/cycle fixtures |
| REQ-EXT-0009 | H-10, H-13 | GB-042, GB-043, GB-045 | Extensions | D2-03 protected-extension vectors; D2-04 claim cases |
| REQ-EXT-0010 | H-03, H-10, H-13 | GB-042, GB-043, GB-044, GB-045 | Extensions | D2-04 lossless round-trip/mutation fixtures |
| REQ-EXT-0011 | H-05, H-10, H-12, H-13 | GB-042, GB-045 | Extensions | D2-04 context-forwarding/privacy fixtures |
| REQ-EXT-0012 | H-03, H-04, H-07, H-10, H-13 | GB-043, GB-044, GB-045, GB-046 | Extensions | D2-04 extension-evolution compatibility matrix |
| REQ-EXT-0013 | H-01, H-04, H-07, H-13 | GB-006, GB-042, GB-046 | Extensions | D2-04 experiment opt-in/isolation fixtures |
| REQ-EXT-0014 | H-03, H-04, H-07, H-10, H-13, H-14 | GB-043, GB-044, GB-046 | Extensions | D2-04 graduation/migration/proof-reuse fixtures |
| REQ-EXT-0015 | H-03, H-07, H-11, H-13, H-14 | GB-043, GB-044, GB-046 | Extensions | D2-04 extension lifecycle/support-state matrix |
| REQ-AUTH-0001 | H-01, H-02, H-05, H-07 | GB-007, GB-008, GB-011, GB-013 | Authentication | D2-05 authentication/authority-confusion cases |
| REQ-AUTH-0002 | H-01, H-04, H-05, H-07, H-13 | GB-007, GB-009, GB-011 | Authentication | D2-01 profile identity; D2-04 selection/downgrade fixtures |
| REQ-AUTH-0003 | H-04, H-05, H-12, H-14 | GB-007, GB-009, GB-013 | Authentication | D2-01 concrete profile registry; D2-04 local/remote/none cases |
| REQ-AUTH-0004 | H-01, H-04-H-07, H-10, H-11 | GB-007, GB-009, GB-010, GB-011 | Authentication | D2-01 authentication-context/binding schema; D2-04 persistence cases |
| REQ-AUTH-0005 | H-02, H-05-H-08, H-12 | GB-007, GB-008, GB-009, GB-012, GB-013, GB-016 | Authentication | D2-04 principal/audience/purpose substitution fixtures |
| REQ-AUTH-0006 | H-05-H-09, H-12 | GB-007, GB-009, GB-010, GB-011, GB-013 | Authentication | D2-04 secret-leak/reference-as-proof fixtures |
| REQ-AUTH-0007 | H-02, H-05, H-07, H-10-H-12 | GB-007, GB-013, GB-016, GB-017 | Authentication | D2-01 request-proof schema; D2-03 proof vectors; D2-04 replay cases |
| REQ-AUTH-0008 | H-05, H-07, H-09, H-11, H-12 | GB-007, GB-011, GB-015 | Authentication | D2-02 auth-loss transitions; D2-04 reauthentication/rotation fixtures |
| REQ-AUTH-0009 | H-02, H-05-H-07, H-11, H-12 | GB-007, GB-009, GB-011, GB-013, GB-015, GB-016 | Authentication | D2-04 authentication failure/downgrade corpus |
| REQ-AUTHZ-0001 | H-01, H-02, H-05, H-07, H-08 | GB-007, GB-008, GB-013 | Authorization | D2-05 authentication/authorization/Approval separation cases |
| REQ-AUTHZ-0002 | H-02, H-05, H-07, H-10-H-12 | GB-008, GB-012, GB-013 | Authorization | D2-01 authorization-input schema; D2-04 provenance cases |
| REQ-AUTHZ-0003 | H-02, H-07, H-10, H-12, H-13 | GB-008, GB-012, GB-013 | Authorization | D2-01 authorization-evidence schema; D2-04 binding matrix |
| REQ-AUTHZ-0004 | H-02, H-07-H-09, H-11, H-12 | GB-008, GB-013 | Authorization | D2-05 final-Agent enforcement/recheck cases |
| REQ-AUTHZ-0005 | H-02, H-04, H-07, H-08, H-11 | GB-008, GB-011, GB-012, GB-013 | Authorization | D2-04 non-transferability/non-widening fixtures |
| REQ-AUTHZ-0006 | H-02, H-05, H-07, H-11, H-12 | GB-008, GB-013, GB-015 | Authorization | D2-04 deny/stale/unavailable/timeout cases |
| REQ-AUTHZ-0007 | H-02, H-07, H-08, H-12, H-14 | GB-008, GB-013 | Authorization | D2-05 Platform-policy delta and Approval-boundary cases |
| REQ-INST-0001 | H-01, H-05-H-07, H-10, H-12 | GB-009, GB-010, GB-017 | Installation | D2-01 Install Grant object-class schemas; D2-04 confusion cases |
| REQ-INST-0002 | H-01, H-02, H-05-H-07 | GB-009, GB-010, GB-012 | Installation | D2-01 grant issuance schema; D2-04 issuer/scope cases |
| REQ-INST-0003 | H-01, H-05, H-06, H-12 | GB-009, GB-010 | Installation | D2-01 resolution/tombstone schema; D2-04 disclosure cases |
| REQ-INST-0004 | H-01, H-04-H-06, H-10 | GB-009, GB-010 | Installation | D2-01 preview/consent schema; D2-04 mutation/secret fixtures |
| REQ-INST-0005 | H-01, H-03-H-06, H-10, H-13 | GB-009, GB-010, GB-011, GB-012 | Installation | D2-01 redemption-intent schema; D2-04 semantic-equality cases |
| REQ-INST-0006 | H-05-H-07, H-10, H-12 | GB-009, GB-012, GB-017 | Installation | D2-04 exact replay/conflict/disclosure fixtures |
| REQ-INST-0007 | H-01, H-02, H-04-H-07, H-11, H-12 | GB-009, GB-010, GB-011 | Installation | D2-02 H-06 transaction machine; D2-04 atomicity cases |
| REQ-INST-0008 | H-06, H-07, H-10-H-12 | GB-009, GB-011, GB-017 | Installation | D2-04 concurrency/crash/lost-response fixtures |
| REQ-INST-0009 | H-06, H-07, H-11, H-12 | GB-009, GB-011, GB-015 | Installation | D2-02 grant state machine; D2-04 expiry/revocation races |
| REQ-INST-0010 | H-05-H-07, H-10-H-12, H-14 | GB-009, GB-010, GB-011, GB-017 | Installation | D2-01 replay/tombstone evidence; D2-04 restart/retention cases |
| REQ-CONN-0001 | H-01, H-06, H-07, H-09, H-11, H-12 | GB-009, GB-011, GB-013 | Connections | D2-01 Connection state schema; D2-02 H-07 state machine |
| REQ-CONN-0002 | H-01, H-03-H-07, H-10, H-11, H-13, H-14 | GB-011, GB-012 | Connections | D2-01 Connection authority-bundle schema; D2-04 binding cases |
| REQ-CONN-0003 | H-02, H-05-H-10, H-12 | GB-008, GB-011, GB-012, GB-013, GB-016 | Connections | D2-01 reusable tenant-scope schema; D2-04 substitution matrix |
| REQ-CONN-0004 | H-01, H-02, H-04, H-05, H-07-H-09, H-11, H-12 | GB-007, GB-008, GB-011, GB-012, GB-013, GB-015, GB-017 | Connections | D2-05 effective-authority intersection cases |
| REQ-CONN-0005 | H-05, H-07, H-11, H-12 | GB-007, GB-011, GB-015 | Connections | D2-02 suspension/resumption machine; D2-04 cause cases |
| REQ-CONN-0006 | H-07, H-09-H-12 | GB-011, GB-015 | Connections | D2-02 terminal transitions; D2-04 equality/race fixtures |
| REQ-CONN-0007 | H-05, H-07, H-09, H-11, H-12 | GB-007, GB-011, GB-015 | Connections | D2-02 revocation transition; D2-04 source/scope fixtures |
| REQ-CONN-0008 | H-04-H-07, H-11 | GB-009, GB-011, GB-012 | Connections | D2-02 replacement coordinator; D2-04 no-overlap/recovery cases |
| REQ-CONN-0009 | H-01, H-03, H-06, H-07, H-09-H-11, H-14 | GB-011, GB-017 | Connections | D2-04 restart/rollback/corruption/split-brain fixtures |
| REQ-CONN-0010 | H-07, H-09-H-12, H-14 | GB-011, GB-012, GB-013, GB-017 | Connections | D2-01 historical-read/tombstone schemas; D2-04 disclosure cases |
| REQ-INV-0001 | H-02, H-05, H-07-H-09, H-12, H-13 | GB-013, GB-014, GB-015, GB-017 | Invocation | D2-01 Invocation schema; D2-04 untrusted-claim fixtures |
| REQ-INV-0002 | H-01, H-02, H-04, H-05, H-07, H-12 | GB-011, GB-012, GB-013 | Invocation | D2-04 one-Connection/binding substitution cases |
| REQ-INV-0003 | H-02, H-05, H-07-H-09, H-11, H-12 | GB-007, GB-008, GB-011, GB-012, GB-013, GB-015, GB-017 | Invocation | D2-02 admission machine; D2-04 final-recheck race fixtures |
| REQ-INV-0004 | H-07-H-09, H-11, H-12 | GB-013, GB-016, GB-017 | Invocation | D2-02 Task-birth/Approval atomicity; D2-04 partial-state cases |
| REQ-INV-0005 | H-07-H-09, H-12 | GB-013, GB-015, GB-016 | Invocation | D2-04 pre-Task rejection/workflow-placeholder cases |
| REQ-INV-0006 | H-02, H-06-H-09, H-12 | GB-014, GB-017 | Invocation | D2-01 correlation schema; D2-04 collision/mismatch/parentage cases |
| REQ-INV-0007 | H-07-H-10, H-12 | GB-013, GB-015, GB-017 | Invocation | D2-01 idempotency identity schema; D2-03 digest vectors |
| REQ-INV-0008 | H-07-H-09, H-11, H-12 | GB-013, GB-015, GB-017 | Invocation | D2-04 exact/concurrent/restart convergence fixtures |
| REQ-INV-0009 | H-07-H-10, H-12 | GB-012, GB-013, GB-017 | Invocation | D2-04 conflict/non-disclosure fixtures |
| REQ-INV-0010 | H-06-H-09, H-12 | GB-013, GB-015, GB-017 | Invocation | D2-04 ambiguous-commit/recovery fixtures |
| REQ-INV-0011 | H-07-H-10, H-12 | GB-013, GB-015, GB-017 | Invocation | D2-04 admission-deadline equality/clock cases |
| REQ-INV-0012 | H-02, H-05, H-07, H-09, H-11, H-12 | GB-012, GB-013, GB-014, GB-015, GB-016, GB-017 | Invocation | D2-01 cancellation-request schema; D2-04 admission/retry cases |
| REQ-INV-0013 | H-07-H-09, H-12 | GB-013, GB-015, GB-016, GB-017 | Invocation | D2-05 response/read boundary cases |
| REQ-INV-0014 | H-02, H-05, H-07-H-09, H-11, H-12 | GB-008, GB-012, GB-013, GB-014, GB-015, GB-016, GB-017 | Invocation | D2-04 multi-fault/privacy-order fixtures; D2-05 conformance |
| REQ-APPR-0001 | H-01, H-02, H-07, H-08, H-09 | GB-018, GB-019 | Approvals | D2-02 lifecycle boundaries; D2-05 authority-confusion cases |
| REQ-APPR-0002 | H-01, H-02, H-04, H-05, H-07, H-08, H-11, H-12 | GB-018, GB-019 | Approvals | D2-01 Challenge schema; D2-04 issuance/retry cases |
| REQ-APPR-0003 | H-03, H-08, H-11 | GB-018, GB-019 | Approvals | D2-02 Challenge state machine; D2-04 legacy-state cases |
| REQ-APPR-0004 | H-01, H-03, H-04, H-08, H-11 | GB-018, GB-019 | Approvals | D2-02 supersession ordering; D2-04 mutation cases |
| REQ-APPR-0005 | H-02, H-08, H-11 | GB-018, GB-019 | Approvals | D2-01 Decision schema; D2-04 outcome cases |
| REQ-APPR-0006 | H-03, H-05, H-08, H-11, H-12 | GB-018, GB-019 | Approvals | D2-04 duplicate/conflicting Decision cases |
| REQ-APPR-0007 | H-02, H-05, H-08, H-10, H-11, H-12 | GB-018, GB-019 | Approvals | D2-03 Approval-proof vectors; D2-04 identity-substitution cases |
| REQ-APPR-0008 | H-02, H-05, H-08, H-11 | GB-018, GB-019 | Approvals | D2-04 eligibility/self-approval/delegation matrix |
| REQ-APPR-0009 | H-03, H-04, H-08, H-10, H-13 | GB-018, GB-019 | Approvals | D2-01 action projection; D2-03 presence vectors |
| REQ-APPR-0010 | H-01, H-03, H-04, H-07, H-08, H-10, H-11 | GB-018, GB-019 | Approvals | D2-03 context vectors; D2-04 authority-substitution cases |
| REQ-APPR-0011 | H-02, H-03, H-05, H-07, H-08, H-11, H-12 | GB-018, GB-019 | Approvals | D2-04 actor/beneficiary/policy mutation cases |
| REQ-APPR-0012 | H-03, H-04, H-07, H-08, H-09, H-10 | GB-018, GB-019 | Approvals | D2-03 action vectors; D2-04 target/capability mutation cases |
| REQ-APPR-0013 | H-04, H-05, H-07, H-08, H-10, H-11 | GB-018, GB-019 | Approvals | D2-03 numeric/unit vectors; D2-04 limit/time cases |
| REQ-APPR-0014 | H-03, H-07, H-08, H-09, H-10, H-11, H-14 | GB-018, GB-019 | Approvals | D2-01 authority/recovery schema; D2-04 linkage cases |
| REQ-APPR-0015 | H-03, H-07, H-08, H-10, H-11, H-14 | GB-018, GB-019 | Approvals | D2-04 historical-reference substitution cases |
| REQ-APPR-0016 | H-08, H-10, H-12 | GB-018, GB-019 | Approvals | D2-03 presentation digests; D2-04 mismatch cases |
| REQ-APPR-0017 | H-08, H-10, H-11 | GB-018, GB-019 | Approvals | D2-03 cross-language Approval vectors |
| REQ-APPR-0018 | H-03, H-08, H-10, H-13 | GB-018, GB-019 | Approvals | D2-01 semantic projections; D2-03 context/signer vectors |
| REQ-APPR-0019 | H-02, H-03, H-05, H-08, H-10, H-11 | GB-018, GB-019 | Approvals | D2-03 wrong-domain/profile vectors; D2-04 downgrade cases |
| REQ-APPR-0020 | H-03, H-04, H-08, H-10, H-12 | GB-018, GB-019 | Approvals | D2-03 one-field mutations; D2-04 equality cases |
| REQ-APPR-0021 | H-01, H-02, H-04, H-07, H-08 | GB-018, GB-019 | Approvals | D2-04 nested-limit/intersection cases |
| REQ-APPR-0022 | H-02, H-08, H-11 | GB-018, GB-019 | Approvals | D2-02 Approval-authority state machine |
| REQ-APPR-0023 | H-07, H-08, H-11 | GB-019 | Approvals | D2-02 internal-coordination recovery; D2-04 crash cases |
| REQ-APPR-0024 | H-05, H-07, H-08, H-11 | GB-018, GB-019 | Approvals | D2-02 expiry ordering; D2-04 equality/clock cases |
| REQ-APPR-0025 | H-02, H-04, H-05, H-07, H-08, H-11, H-12, H-13 | GB-018, GB-019 | Approvals | D2-04 current-gate withdrawal/intersection cases |
| REQ-APPR-0026 | H-07, H-08, H-09, H-11, H-12 | GB-018, GB-019 | Approvals | D2-02 atomic consumption machine; D2-04 partial-commit cases |
| REQ-APPR-0027 | H-02, H-07, H-08, H-09, H-12 | GB-019 | Approvals | D2-04 non-consumption event corpus |
| REQ-APPR-0028 | H-07, H-08, H-09, H-11, H-12 | GB-019 | Approvals | D2-04 precommit/postcommit failure cases |
| REQ-APPR-0029 | H-05, H-07, H-08, H-09, H-11, H-12 | GB-018, GB-019 | Approvals | D2-04 exact retry/lost-response convergence cases |
| REQ-APPR-0030 | H-04, H-07, H-08, H-10, H-12 | GB-018, GB-019 | Approvals | D2-04 conflict/privacy mutation corpus |
| REQ-APPR-0031 | H-05, H-07, H-08, H-11, H-12 | GB-019 | Approvals | D2-02 race machine; D2-04 concurrency/failover cases |
| REQ-APPR-0032 | H-02, H-05, H-08, H-11, H-12 | GB-018, GB-019 | Approvals | D2-02 revocation ordering; D2-04 source/race cases |
| REQ-APPR-0033 | H-02, H-05, H-08, H-09, H-12 | GB-018, GB-019 | Approvals | D2-02 cancellation race; D2-04 scope cases |
| REQ-APPR-0034 | H-03, H-08, H-10, H-11, H-12, H-14 | GB-018, GB-019 | Approvals | D2-01 durable evidence/tombstone schemas; D2-04 restart cases |
| REQ-APPR-0035 | H-03, H-08, H-09, H-11, H-14 | GB-018, GB-019 | Approvals | D2-04 rollback/split-brain/retention cases |
| REQ-APPR-0036 | H-07, H-08, H-11, H-12 | GB-019 | Approvals | D2-04 ambiguous-commit/reconciliation cases |
| REQ-APPR-0037 | H-03, H-08, H-10, H-11, H-13, H-14 | GB-018, GB-019 | Approvals | D2-04 immutable-history/legacy cases |
| REQ-APPR-0038 | H-02, H-07, H-08, H-09, H-10, H-11 | GB-018, GB-019 | Approvals | D2-05 Task/Receipt authority-boundary cases |
| REQ-APPR-0039 | H-02, H-05, H-08, H-10, H-11, H-12 | GB-018, GB-019 | Approvals | D2-04 failure/disclosure cases; D2-05 conformance |
| REQ-APPR-0040 | H-03, H-04, H-08, H-10, H-13 | GB-018, GB-019 | Approvals | D2-01 closed-Core schemas; D2-04 extension cases |
| REQ-TASK-0001 | H-01, H-02, H-06, H-07, H-08, H-09, H-11 | GB-020, GB-021 | Tasks | D2-02 atomic Task-birth machine; D2-04 partial-commit cases |
| REQ-TASK-0002 | H-02, H-03, H-04, H-07, H-08, H-09, H-10, H-11, H-13 | GB-020, GB-021, GB-023 | Tasks | D2-01 Task acceptance schema; D2-04 identity-substitution cases |
| REQ-TASK-0003 | H-05, H-07, H-08, H-09, H-11, H-12 | GB-020, GB-021 | Tasks | D2-02 idempotent birth model; D2-04 rejection/retry cases |
| REQ-TASK-0004 | H-03, H-09, H-11, H-13 | GB-021 | Tasks | D2-02 closed state inventory and terminal-no-exit assertions |
| REQ-TASK-0005 | H-01, H-02, H-07, H-08, H-09, H-11 | GB-020, GB-021 | Tasks | D2-02 legal/illegal transition corpus; D2-04 guard cases |
| REQ-TASK-0006 | H-03, H-09, H-11, H-13 | GB-020, GB-021, GB-024 | Tasks | D2-01 non-lifecycle classifications; D2-04 legacy cases |
| REQ-TASK-0007 | H-02, H-09, H-11 | GB-021 | Tasks | D2-02 attempt/fence model; D2-04 stale-writer cases |
| REQ-TASK-0008 | H-02, H-07, H-09, H-11 | GB-020, GB-021 | Tasks | D2-02 queue/start model; D2-04 duplicate-delivery cases |
| REQ-TASK-0009 | H-09, H-12 | GB-021, GB-022 | Tasks | D2-01 progress representation; D2-04 stale/privacy cases |
| REQ-TASK-0010 | H-02, H-07, H-09, H-11 | GB-021 | Tasks | D2-02 effect-checkpoint model; D2-04 ambiguous-effect cases |
| REQ-TASK-0011 | H-07, H-08, H-09, H-11 | GB-020, GB-021 | Tasks | D2-02 fenced internal-retry machine; D2-04 worker-loss cases |
| REQ-TASK-0012 | H-03, H-09, H-12 | GB-021, GB-022 | Tasks | D2-01 cancellation-support representation; D2-04 unsupported cases |
| REQ-TASK-0013 | H-02, H-05, H-07, H-09, H-11, H-12 | GB-021, GB-022 | Tasks | D2-01 cancellation intent/request schemas; D2-04 equality/privacy cases |
| REQ-TASK-0014 | H-07, H-08, H-09, H-11 | GB-021, GB-023 | Tasks | D2-02 cancellation/effect-checkpoint machine; D2-04 partial-effect cases |
| REQ-TASK-0015 | H-01, H-09, H-11, H-12 | GB-021 | Tasks | D2-02 cancellation race machine; D2-04 winner cases |
| REQ-TASK-0016 | H-03, H-07, H-09, H-11 | GB-021, GB-023, GB-024 | Tasks | D2-02 authority-withdrawal stop model; D2-04 Connection-event cases |
| REQ-TASK-0017 | H-03, H-07, H-09, H-10, H-11, H-12 | GB-021, GB-024 | Tasks | D2-02 deadline machine; D2-04 immutable-clock cases |
| REQ-TASK-0018 | H-01, H-07, H-09, H-11, H-12 | GB-021, GB-023 | Tasks | D2-02 timeout terminalization; D2-04 equality/effect cases |
| REQ-TASK-0019 | H-01, H-09, H-11 | GB-021, GB-023 | Tasks | D2-02 terminal compare-and-commit; D2-04 race/crash cases |
| REQ-TASK-0020 | H-02, H-03, H-09, H-10, H-11, H-12 | GB-021, GB-023 | Tasks | D2-01 Result identity/schema; D2-04 substitution cases |
| REQ-TASK-0021 | H-03, H-07, H-08, H-09, H-10, H-11, H-12, H-14 | GB-021, GB-023, GB-024 | Tasks | D2-01 Result schema; D2-04 semantic inventory cases |
| REQ-TASK-0022 | H-03, H-09, H-11, H-14 | GB-021, GB-023, GB-024 | Tasks | D2-01 effect classification; D2-04 terminal/effect matrix |
| REQ-TASK-0023 | H-01, H-03, H-09, H-10, H-11 | GB-021, GB-023, GB-025 | Tasks | D2-02 atomic terminal Task/Result model; D2-04 partial-write cases |
| REQ-TASK-0024 | H-03, H-07, H-09, H-10, H-13 | GB-020, GB-023, GB-025 | Tasks | D2-01 semantic projections; D2-03 commitment vectors |
| REQ-TASK-0025 | H-02, H-03, H-09, H-10, H-11 | GB-021, GB-023, GB-025 | Tasks | D2-01 Receipt linkage representation; D2-04 coupling cases |
| REQ-TASK-0026 | H-03, H-09, H-10, H-11, H-12, H-14 | GB-023, GB-025 | Tasks | D2-04 Receipt outage/mismatch cases; D1-06 proof semantics |
| REQ-TASK-0027 | H-02, H-05, H-09, H-11, H-12 | GB-022, GB-023 | Tasks | D2-01 polling representation; D2-04 read-only cases |
| REQ-TASK-0028 | H-05, H-09, H-12, H-14 | GB-022, GB-024 | Tasks | D2-01 hint representation; D2-04 deadline/retention cases |
| REQ-TASK-0029 | H-02, H-05, H-07, H-09, H-11, H-12 | GB-022, GB-023, GB-024 | Tasks | D2-04 cross-scope retrieval corpus; D2-05 disclosure cases |
| REQ-TASK-0030 | H-02, H-03, H-07, H-09, H-11, H-12 | GB-023, GB-024, GB-025 | Tasks | D2-04 historical Connection/read cases; D1-06 offline verification |
| REQ-TASK-0031 | H-03, H-09, H-11, H-12, H-14 | GB-023, GB-024 | Tasks | D2-01 expired-content projection; D2-04 expiry cases |
| REQ-TASK-0032 | H-03, H-09, H-10, H-11, H-12, H-14 | GB-023, GB-024, GB-025 | Tasks | D2-01 retention classes; D2-04 dependency-horizon cases |
| REQ-TASK-0033 | H-03, H-05, H-09, H-10, H-11, H-12, H-14 | GB-023, GB-024, GB-025 | Tasks | D2-01 tombstone schema; D2-04 replay/privacy cases |
| REQ-TASK-0034 | H-01, H-03, H-07, H-08, H-09, H-11, H-14 | GB-020, GB-021, GB-024 | Tasks | D2-02 restart invariants; D2-04 restart-from-every-state cases |
| REQ-TASK-0035 | H-01, H-07, H-08, H-09, H-11, H-12 | GB-020, GB-021, GB-023, GB-024 | Tasks | D2-02 recovery model; D2-04 ambiguous-commit cases |
| REQ-TASK-0036 | H-01, H-03, H-09, H-11, H-14 | GB-020, GB-021, GB-023, GB-024 | Tasks | D2-02 fencing/terminal invariants; D2-04 rollback/split-brain cases |
| REQ-TASK-0037 | H-03, H-09, H-10, H-11, H-13, H-14 | GB-020, GB-021, GB-023, GB-024, GB-025 | Tasks | D2-04 immutable-history and legacy-classification cases |
| REQ-TASK-0038 | H-02, H-03, H-07, H-08, H-09, H-12 | GB-021, GB-023, GB-024 | Tasks | D2-04 compensation-separation cases; D2-05 authority cases |
| REQ-TASK-0039 | H-02, H-05, H-09, H-11, H-12 | GB-020, GB-021, GB-022, GB-023, GB-024, GB-025 | Tasks | D2-04 semantic failure corpus; D2-05 public-boundary conformance |
| REQ-TASK-0040 | H-03, H-04, H-09, H-10, H-13 | GB-020, GB-021, GB-023, GB-024, GB-025 | Tasks | D2-01 closed-Core schemas; D2-04 extension/downgrade cases |
| REQ-RCPT-0001 | H-01, H-02, H-07, H-08, H-09, H-11 | GB-025, GB-028 | Receipts | D2-04 authority-boundary and pre-Task rejection cases |
| REQ-RCPT-0002 | H-03, H-04, H-09, H-10, H-11 | GB-025, GB-026 | Receipts | D2-01 Receipt linkage; D2-04 materialization retry cases |
| REQ-RCPT-0003 | H-02, H-03, H-04, H-07, H-08, H-09, H-10, H-11, H-13 | GB-025, GB-027, GB-028 | Receipts | D2-01 semantic projection; D2-04 binding mutations |
| REQ-RCPT-0004 | H-03, H-04, H-09, H-10, H-11 | GB-026, GB-027, GB-028 | Receipts | D2-03 Receipt domain/profile vectors; D2-04 downgrade cases |
| REQ-RCPT-0005 | H-02, H-03, H-04, H-07, H-09, H-10, H-11 | GB-025, GB-026, GB-027 | Receipts | D2-03 context/signer vectors; D2-04 substitution cases |
| REQ-RCPT-0006 | H-02, H-05, H-09, H-10, H-11, H-12, H-14 | GB-025, GB-027, GB-028 | Receipts | D2-01 bounded evidence projection; D2-04 effect-mutation cases |
| REQ-RCPT-0007 | H-03, H-05, H-07, H-08, H-09, H-10, H-11 | GB-026, GB-028, GB-030, GB-031 | Receipts | D2-02 key lifecycle; D2-04 signer/rotation cases |
| REQ-RCPT-0008 | H-02, H-03, H-04, H-05, H-07, H-09, H-10, H-11, H-12, H-13, H-14 | GB-025, GB-026, GB-027, GB-028 | Receipts | D2-03 mutation vectors; D2-04 ordered-verification corpus |
| REQ-RCPT-0009 | H-03, H-07, H-09, H-10, H-11 | GB-026, GB-028, GB-030, GB-031 | Receipts | D2-01 time-evidence result; D2-04 interval cases |
| REQ-RCPT-0010 | H-02, H-03, H-05, H-07, H-09, H-11, H-12, H-14 | GB-025, GB-028 | Receipts | D2-04 offline/history/disclosure cases; D2-05 read boundary |
| REQ-TRUST-0001 | H-01, H-02, H-03, H-05, H-07, H-08, H-09, H-10, H-11 | GB-028, GB-029, GB-031 | Trust and revocation | D2-05 current-vs-historical authority cases |
| REQ-TRUST-0002 | H-03, H-04, H-10, H-11, H-13, H-14 | GB-029, GB-030, GB-031, GB-033 | Trust and revocation | D2-01 continuity transition; D2-04 reset cases |
| REQ-TRUST-0003 | H-01, H-02, H-03, H-10, H-11 | GB-029, GB-030, GB-031, GB-033 | Trust and revocation | D2-01 enrollment representation; D2-04 bootstrap cases |
| REQ-TRUST-0004 | H-02, H-05, H-07, H-08, H-10, H-11 | GB-029, GB-031, GB-032, GB-033 | Trust and revocation | D2-01 snapshot/coverage schema; D2-04 omission cases |
| REQ-TRUST-0005 | H-02, H-10, H-11 | GB-031, GB-033 | Trust and revocation | D2-01 point status; D2-04 projection-conflict cases |
| REQ-TRUST-0006 | H-03, H-04, H-10, H-11 | GB-029, GB-031, GB-033 | Trust and revocation | D2-03 status/snapshot/checkpoint vectors |
| REQ-TRUST-0007 | H-03, H-10, H-11 | GB-031, GB-033 | Trust and revocation | D2-02 snapshot chain; D2-04 rollback/fork cases |
| REQ-TRUST-0008 | H-03, H-05, H-10, H-11 | GB-029, GB-030, GB-031, GB-033 | Trust and revocation | D2-02 cross-bound chains; D2-04 head-race cases |
| REQ-TRUST-0009 | H-03, H-05, H-10, H-11 | GB-029, GB-030, GB-031, GB-033 | Trust and revocation | D2-01 key history; D2-04 identity-substitution cases |
| REQ-TRUST-0010 | H-03, H-05, H-07, H-10, H-11, H-14 | GB-030, GB-031, GB-032, GB-033 | Trust and revocation | D2-02 rotation lifecycle; D2-04 cutover cases |
| REQ-TRUST-0011 | H-05, H-07, H-10, H-11 | GB-030, GB-031, GB-033 | Trust and revocation | D2-02 emergency rotation; D2-04 recovery cases |
| REQ-TRUST-0012 | H-01, H-03, H-05, H-07, H-09, H-10, H-11, H-14 | GB-029, GB-030, GB-031, GB-032, GB-033 | Trust and revocation | D2-01 durable floor; D2-04 backup/restore cases |
| REQ-TRUST-0013 | H-01, H-02, H-05, H-07, H-10, H-11 | GB-029, GB-031, GB-032, GB-033 | Trust and revocation | D2-02 atomic floor model; D2-04 partial-commit cases |
| REQ-TRUST-0014 | H-01, H-02, H-07, H-11 | GB-031, GB-033 | Trust and revocation | D2-02 multi-node model; D2-04 concurrency cases |
| REQ-TRUST-0015 | H-01, H-03, H-07, H-10, H-11 | GB-029, GB-031, GB-033 | Trust and revocation | D2-04 crash/restart/restore corpus |
| REQ-TRUST-0016 | H-05, H-07, H-10, H-11 | GB-032, GB-033 | Trust and revocation | D2-02 freshness model; D2-04 equality/clock cases |
| REQ-TRUST-0017 | H-02, H-05, H-07, H-10, H-11 | GB-031, GB-032, GB-033 | Trust and revocation | D2-02 pending activation; D2-04 future-time cases |
| REQ-TRUST-0018 | H-03, H-05, H-07, H-08, H-10, H-11 | GB-031, GB-032, GB-033 | Trust and revocation | D2-02 subject-effect model; D2-04 boundary cases |
| REQ-TRUST-0019 | H-02, H-05, H-06, H-07, H-08, H-09, H-10, H-11 | GB-030, GB-031, GB-033 | Trust and revocation | D2-01 subject effects; D2-04 consequence cases |
| REQ-TRUST-0020 | H-02, H-03, H-05, H-09, H-10, H-11 | GB-026, GB-028, GB-030, GB-031 | Trust and revocation | D2-02 key-use model; D2-04 operation-separation cases |
| REQ-TRUST-0021 | H-01, H-05, H-07, H-08, H-09, H-11 | GB-031, GB-033 | Trust and revocation | D2-02 shared authority epoch; D2-04 race cases |
| REQ-TRUST-0022 | H-03, H-05, H-07, H-09, H-10, H-11 | GB-028, GB-030, GB-031 | Trust and revocation | D2-01 compromise evidence; D2-04 interval cases |
| REQ-TRUST-0023 | H-02, H-03, H-09, H-10, H-11, H-12, H-14 | GB-028 | Trust and revocation | D2-01 historical-result representation; D2-04 axis cases |
| REQ-TRUST-0024 | H-03, H-09, H-10, H-11, H-14 | GB-028 | Trust and revocation | D2-01 classification representation; D2-05 vocabulary cases |
| REQ-TRUST-0025 | H-02, H-03, H-09, H-10, H-11, H-14 | GB-028, GB-031, GB-033 | Trust and revocation | D2-04 historical Receipt corpus |
| REQ-TRUST-0026 | H-01, H-03, H-05, H-07, H-08, H-09, H-10, H-11 | GB-028, GB-029, GB-030, GB-031, GB-032, GB-033 | Trust and revocation | D2-02 recovery model; D2-04 recovery/rollback cases |
| REQ-TRUST-0027 | H-02, H-03, H-05, H-07, H-09, H-10, H-11, H-12 | GB-028, GB-029, GB-030, GB-031, GB-032, GB-033 | Trust and revocation | D2-04 failure corpus; D2-05 public-boundary conformance |
| REQ-TRUST-0028 | H-03, H-05, H-08, H-09, H-10, H-11, H-12, H-14 | GB-028, GB-029, GB-030, GB-031, GB-033 | Trust and revocation | D2-01 history references; D2-04 retention/privacy cases |
| REQ-TRUST-0029 | H-03, H-04, H-10, H-11, H-13 | GB-025, GB-028, GB-029, GB-030, GB-031, GB-033 | Trust and revocation | D2-01 closed-Core schemas; D2-04 extension cases |
| REQ-TRUST-0030 | H-03, H-04, H-09, H-10, H-11, H-13, H-14 | GB-028, GB-029, GB-030, GB-031, GB-032, GB-033 | Trust and revocation | D2-04 immutable legacy/history cases |

### D1-07 candidate traceability

This table is non-normative planning traceability for the D1-07 candidate. It
creates no later asset and closes no listed gap.

| Requirement ID | Accepted H-* source                      | Applicable GB-* gap                                                                    | Chapter                 | Expected later D2 asset class                                   |
| -------------- | ---------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| REQ-TRAN-0001  | H-01, H-02, H-05, H-07, H-09-H-12        | GB-037, GB-038                                                                         | Transport               | D2-04 semantic non-equivalence cases; D2-05 adapter equivalence |
| REQ-TRAN-0002  | H-01, H-03, H-05, H-07, H-12             | GB-004, GB-005, GB-037-GB-039                                                          | Transport               | D2-01 release binding; D2-04 origin/path cases                  |
| REQ-TRAN-0003  | H-03, H-10, H-12, H-13                   | GB-038, GB-040-GB-042                                                                  | Transport               | D2-01 resource-ID representation; D2-04 raw-target corpus       |
| REQ-TRAN-0004  | H-01, H-05-H-12                          | GB-004, GB-009, GB-013, GB-018, GB-020, GB-022, GB-023, GB-025, GB-029, GB-031, GB-038 | Transport               | D2-01 operation representations; D2-05 raw HTTP matrix          |
| REQ-TRAN-0005  | H-03, H-10, H-12, H-13                   | GB-038, GB-040, GB-041                                                                 | Transport               | D2-01 media-bound schemas; D2-04 media/UTF-8 cases              |
| REQ-TRAN-0006  | H-02, H-05, H-07, H-09, H-12             | GB-007, GB-013, GB-014, GB-036, GB-038                                                 | Transport               | D2-01 header carriers; D2-04 singleton/challenge cases          |
| REQ-TRAN-0007  | H-01, H-05, H-07, H-11, H-12             | GB-004, GB-037, GB-039                                                                 | Transport               | D2-04 redirect and credential-leakage corpus                    |
| REQ-TRAN-0008  | H-05, H-07, H-12, H-14                   | GB-007, GB-037, GB-038, GB-047                                                         | Transport               | D2-04 TLS chain/host/time/status cases                          |
| REQ-TRAN-0009  | H-02, H-05, H-07, H-11, H-12             | GB-004, GB-037, GB-038, GB-047                                                         | Transport               | D2-04 DNS/NET-B/proxy/coalescing corpus                         |
| REQ-TRAN-0010  | H-03, H-05, H-07, H-12                   | GB-037-GB-039                                                                          | Transport               | D2-04 HTTP version/fallback cases; D2-05 equivalence            |
| REQ-TRAN-0011  | H-06-H-09, H-11, H-12                    | GB-014, GB-015, GB-017, GB-037, GB-038                                                 | Transport               | D2-01 retry metadata; D2-04 ambiguity/retry corpus              |
| REQ-TRAN-0012  | H-07-H-09, H-11, H-12, H-14              | GB-015, GB-022, GB-037, GB-038                                                         | Transport               | D2-04 timeout boundary corpus                                   |
| REQ-TRAN-0013  | H-04, H-10, H-12, H-14                   | GB-038, GB-040, GB-041, GB-047                                                         | Transport               | D2-04 size/parser boundary corpus                               |
| REQ-TRAN-0014  | H-01, H-02, H-05, H-07, H-11, H-12       | GB-004, GB-022, GB-037-GB-039, GB-047                                                  | Transport               | D2-04 cache/proxy/browser cases                                 |
| REQ-TRAN-0015  | H-05, H-10, H-12, H-13                   | GB-036, GB-038, GB-040, GB-041, GB-047                                                 | Transport               | D2-04 malformed HTTP/smuggling corpus                           |
| REQ-ERR-0001   | H-02, H-07, H-09, H-11, H-12             | GB-021, GB-028, GB-034, GB-035, GB-037                                                 | Errors                  | D2-01 resource/error separation; D2-05 equivalence              |
| REQ-ERR-0002   | H-06-H-09, H-11, H-12                    | GB-020, GB-022, GB-034, GB-035, GB-038                                                 | Errors                  | D2-04 status matrix; D2-05 raw mapping                          |
| REQ-ERR-0003   | H-05-H-09, H-11-H-13                     | GB-034-GB-036, GB-042                                                                  | Errors                  | D2-01 error/detail schemas; D2-04 complete registry             |
| REQ-ERR-0004   | H-02, H-05, H-11-H-13                    | GB-034, GB-036, GB-041, GB-048, GB-049                                                 | Errors                  | D2-01 error envelope/details; D2-04 leakage cases               |
| REQ-ERR-0005   | H-02, H-05, H-07-H-09, H-11, H-12        | GB-008, GB-012, GB-013, GB-034-GB-036                                                  | Errors                  | D2-04 multi-fault precedence corpus                             |
| REQ-ERR-0006   | H-02, H-05, H-07, H-09, H-11-H-13        | GB-012, GB-034, GB-036, GB-042, GB-048                                                 | Errors                  | D2-04 privacy-collapse/unknown-error cases                      |
| REQ-SEC-0001   | H-01, H-02, H-05, H-07-H-09, H-11, H-12  | GB-002, GB-003, GB-007, GB-008, GB-011, GB-013, GB-015, GB-016, GB-047                 | Security considerations | D2-04 authority-confusion corpus; D2-05 security floor          |
| REQ-SEC-0002   | H-03-H-05, H-07, H-08, H-10-H-12         | GB-005-GB-007, GB-009, GB-013, GB-026, GB-027, GB-047                                  | Security considerations | D2-03 binding vectors; D2-04 fallback cases                     |
| REQ-SEC-0003   | H-01, H-05, H-07, H-11, H-12             | GB-004, GB-029, GB-037-GB-039, GB-047                                                  | Security considerations | D2-04 network/TLS/SSRF/proxy corpus                             |
| REQ-SEC-0004   | H-05, H-10, H-12, H-13                   | GB-036, GB-038, GB-040-GB-042, GB-047, GB-049                                          | Security considerations | D2-04 parser/resource/telemetry attack corpus                   |
| REQ-SEC-0005   | H-06-H-09, H-11, H-12                    | GB-014, GB-017, GB-019-GB-021, GB-037, GB-047                                          | Security considerations | D2-04 retry/cancellation/effect cases                           |
| REQ-SEC-0006   | H-02, H-05, H-07, H-09, H-11, H-12, H-14 | GB-012, GB-022, GB-028, GB-032, GB-047-GB-049                                          | Security considerations | D2-04 cache/browser/disclosure/telemetry cases                  |
| REQ-SEC-0007   | H-05, H-07-H-12                          | GB-015, GB-019, GB-021, GB-028, GB-030, GB-031, GB-033, GB-047, GB-049                 | Security considerations | D2-04 incident/history/audit cases                              |
| REQ-SEC-0008   | H-02-H-05, H-10, H-12-H-14               | GB-002, GB-003, GB-007, GB-037, GB-040-GB-042, GB-047, GB-055                          | Security considerations | D2-04 dependency/extension cases; D2-05 claim checks            |
| REQ-PRIV-0001  | H-02, H-05, H-07, H-09-H-12, H-14        | GB-024, GB-028, GB-036, GB-048, GB-049                                                 | Privacy considerations  | D2-01 bounded representations; D2-05 minimization               |
| REQ-PRIV-0002  | H-02, H-05, H-07, H-09, H-11, H-12       | GB-012, GB-022, GB-023, GB-028, GB-036, GB-048                                         | Privacy considerations  | D2-04 cross-tenant disclosure corpus                            |
| REQ-PRIV-0003  | H-05, H-08-H-12                          | GB-010, GB-018, GB-025, GB-028, GB-036, GB-048, GB-049                                 | Privacy considerations  | D2-04 telemetry secret-injection corpus                         |
| REQ-PRIV-0004  | H-05, H-12, H-13                         | GB-036, GB-042, GB-048, GB-049                                                         | Privacy considerations  | D2-04 recursive redaction/log-injection cases                   |
| REQ-PRIV-0005  | H-02, H-05, H-12, H-14                   | GB-014, GB-036, GB-048, GB-049                                                         | Privacy considerations  | D2-04 metric cardinality/linkability cases                      |
| REQ-PRIV-0006  | H-02, H-05, H-09, H-12                   | GB-014, GB-048, GB-049                                                                 | Privacy considerations  | D2-04 trace boundary/baggage cases                              |
| REQ-PRIV-0007  | H-02, H-05, H-07-H-09, H-11, H-12, H-14  | GB-018, GB-021, GB-028, GB-048, GB-049                                                 | Privacy considerations  | D2-01 audit references; D2-04 audit/commit cases                |
| REQ-PRIV-0008  | H-03, H-09-H-14                          | GB-024, GB-028, GB-036, GB-042, GB-048, GB-049, GB-057                                 | Privacy considerations  | D2-04 retention/extension cases; D2-05 privacy boundary         |
