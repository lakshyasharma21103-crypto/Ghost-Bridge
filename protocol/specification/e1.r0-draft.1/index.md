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
`ROLE`, or `LIFE`, and `NNNN` is a zero-padded chapter-local sequence. IDs are
unique and permanent once reviewed. A later insertion allocates a new number in
its own chapter; it does not renumber or reuse another ID. The syntax is an
editorial locator only and encodes no protocol semantics.

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

## Chapters in this D1-01 slice

- [Terminology](./terminology.md)
- [Roles and trust boundaries](./roles-and-trust-boundaries.md)
- [Lifecycle](./lifecycle.md)

These chapters establish the D1-01 candidate only. They do not make the overall
draft complete.

## Planned later chapters and assets

Later D1 work is expected to cover discovery/version/capability negotiation;
authentication, authorization, installation, Connections, and Invocation;
Approvals; Tasks; Receipts and Trust/revocation; and transport, errors, security,
privacy, and observability. Those chapters are not created by D1-01.

Later D2 work is expected to create canonical wire schemas, explicit
machine-readable state machines, deterministic fixtures and cryptographic
vectors, malicious/failure/compatibility corpora, and implementation-neutral
black-box conformance. None of those assets exists by virtue of this index, and
this draft assigns no future asset ID or digest.

## D1-01 traceability table

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
