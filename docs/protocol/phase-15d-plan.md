# Phase 15D through protocol 1.0 plan

## Plan basis and boundaries

This is the bounded implementation plan produced by the Phase 15D.0 audit. It does not implement any item below and does not claim that Phase 15D, Phase 15E, or Ghost Bridge 1.0 is complete.

The plan resolves the 60 findings in `normative-specification-gap-analysis.md` in dependency order:

- **Phase 15D.1:** normative core specification—43 primary gap targets.
- **Phase 15D.2:** canonical schemas, state machines, fixtures, test vectors, and black-box conformance—10 primary gap targets plus executable proof for 15D.1 requirements.
- **Phase 15E:** production TypeScript SDK separation from Platform internals—1 primary gap target and packaging corrections that depend on 15D.
- **Pre-1.0:** independent implementation, interoperability, external security review, compatibility evidence, and release policy—6 primary gap targets.

No phase may convert Ghost Bridge into an MCP wrapper, add an MCP runtime dependency, adopt MCP authority or Trust semantics, allow direct Agent-to-Agent authority, or elevate Platform policy to protocol law. All work must preserve trusted installation, Install Grants, scoped Connection authority, organization/workspace isolation, governed Invocation, exact-action Approvals, durable Tasks, signed Receipts, Trust verification, and revocation/anti-rollback.

External comparison remains limited to the observations recorded in `phase-15d0-reference-register.md`, each labeled **Verified external reference observation supplied by independent review.** Codex did not directly inspect the external MCP repositories, and no external product semantics determine a Ghost Bridge requirement.

## Human Protocol Decision Register

This is the canonical Phase 15D.0 Human Protocol Decision Register. It is duplicated verbatim in `normative-specification-gap-analysis.md` and `phase-15d-plan.md`; a later revision must update both copies together. These decisions cannot be inferred from current JavaScript, schemas, tests, Platform policy, or external reference practices.

| ID | Short title | Exact unresolved decision | Why a human decision is required | Affected GB gap IDs | Affected Phase work items | Required decision-record evidence |
| --- | --- | --- | --- | --- | --- | --- |
| H-01 | Lifecycle initialization and ordering | Decide whether discovery itself is initialization or a distinct initialization exchange is required, then define the legal first interaction, phase ordering, restart/resumption behavior, shutdown, and post-revocation operation rules. | The choice changes wire ordering, authority activation, durable state, and compatibility; current implementation sequencing cannot make it normative. | GB-001, GB-003–GB-005, GB-014–GB-016 | D1-01, D1-02, D1-03, D2-02, D2-05 | Approved decision record with lifecycle diagram, legal and illegal sequences, restart/shutdown rules, rejected alternatives, compatibility impact, threat analysis, and approver/date. |
| H-02 | Roles, trust boundaries, and protocol authorization floor | Decide canonical participant names and responsibilities, Trust Node responsibility, the Core/Governed authority boundary, prohibited authority transfers, and the minimum protocol authorization evidence distinct from stricter Platform policy. | Assigning trust or enforcement to the wrong role can create an authority bypass; Platform behavior is one implementation and cannot automatically become protocol law. | GB-001–GB-003, GB-008, GB-012–GB-013, GB-055 | D1-01, D1-03, D1-07, E-01, E-02, P1-03 | Approved decision record with role/authority matrix, trust-boundary diagram, minimum authorization evidence, Platform-policy deltas, prohibited flows, threat analysis, and approver/date. |
| H-03 | Version identity, negotiation, and historical meaning | Decide the authoritative version ordering and downgrade rule, negotiated-version lifetime, supported-version window, the human-approved identifier for the next versioned draft directory, current-version index behavior, errata policy, and how historical protocol objects and evidence retain their original version meaning. | Version identifiers and compatibility promises are public governance choices; silently overwriting `0.1-draft` or reinterpreting stored objects would destroy reproducibility. | GB-005, GB-043–GB-045, GB-057–GB-058, GB-060 | D1-02, D2-01, D2-04, E-03, P1-02, P1-04, P1-05 | Approved decision record naming the next draft directory, ordering/downgrade algorithm, support window, immutable-history and errata rules, historical-object interpretation, migration impact, and approver/date. |
| H-04 | Capability, profile, and optional-feature negotiation | Decide precedence among discovery features, conformance profiles, authentication modes, extensions, and per-capability flags; identify mandatory 1.0 profiles/features and bind the negotiated result to Connection authority. | Different precedence or required-profile choices can cause silent feature use, downgrade, or incompatible Connections. | GB-006, GB-011, GB-042, GB-046, GB-054, GB-060 | D1-02, D1-03, D2-01, D2-04, P1-01, P1-02, P1-05 | Approved decision record with precedence algorithm, mandatory/optional matrix, Connection binding, downgrade behavior, compatibility examples, rejected alternatives, and approver/date. |
| H-05 | Authentication profiles and credential binding | Decide the required Core and Governed authentication profiles, whether `none` is local-only, and each profile's establishment, proof, audience, storage/reference, expiry, refresh, revocation, and downgrade rules. | Authentication profile names without semantics are not interoperable and may create unauthenticated Connection authority. | GB-007, GB-009, GB-039, GB-047 | D1-03, D1-07, D2-01, D2-04, E-02, P1-03 | Approved decision record with profile registry, credential-binding sequence, remote/local constraints, lifecycle and failure rules, security analysis, test obligations, and approver/date. |
| H-06 | Install Grant redemption and retry semantics | Decide lost-response, repeat-redemption, concurrent-redemption, expiry, revocation, and idempotent-success semantics, including the atomic commit point and authoritative Connection result. | Prose, development behavior, and production behavior conflict; choosing either outcome affects authority creation and retry safety. | GB-009–GB-010, GB-017, GB-034–GB-035 | D1-03, D2-02, D2-04, P1-03 | Approved decision record with Grant state machine, transaction/commit boundary, concurrent and lost-response outcomes, error/status mapping, recovery analysis, and approver/date. |
| H-07 | Connection lifecycle and scoped authority | Decide the complete Connection state machine, selected-version/profile/capability binding, organization/workspace equality and inheritance, expiry, suspension, revocation, closure, replacement, reauthentication, and recovery semantics. | Connection is the central Ghost Bridge authority object; incomplete state or scope rules can enable unauthorized or cross-tenant Invocation. | GB-008, GB-011–GB-013, GB-015, GB-017, GB-029 | D1-03, D1-06, D2-01, D2-02, E-02, P1-03 | Approved decision record with state/authority matrix, scope equality rules, transition guards and atomic effects, persistence/recovery rules, error precedence, threat analysis, and approver/date. |
| H-08 | Exact-action Approval lifecycle and consumption | Decide the Approval action field set, actor and scope bindings, Decision statuses, expiry, exact consumption point, retry/failure rollback, replay retention, and concurrent continuation outcome. | Approval is a security boundary; widening the action or consuming at different points can authorize unintended or duplicate effects. | GB-018–GB-019, GB-034, GB-047 | D1-04, D2-02, D2-03, D2-04, P1-03 | Approved decision record with Approval state machine, exact bound-field inventory, consumption transaction, retry/replay rules, mutation threats, required vectors/cases, and approver/date. |
| H-09 | Task, result, cancellation, and retention model | Decide whether `rejected` is a Task state, Receipt outcome, or pre-Task error; define result representation/location, polling hints, expiry/retention, cancellation guarantees and winner, terminality, and Task/Receipt atomicity. | Current schema, prose, and client terminality disagree; durable work and side effects require one race and recovery model. | GB-016, GB-020–GB-025, GB-034–GB-035 | D1-05, D2-01, D2-02, D2-04, P1-03 | Approved decision record with complete Task state machine, result/Receipt contract, race-resolution table, retention/tombstone policy, restart semantics, error/status mapping, and approver/date. |
| H-10 | Canonical bytes, digests, signatures, and proof profiles | Decide canonical JSON and UTF-8 rules, null/absence and numeric handling, digest domains and encodings, signature algorithms and encodings, key-purpose binding, algorithm agility, and the profile used by every digest/proof field. | Cross-language security depends on exact bytes; the current core and Trust digest systems differ and static vectors do not yet establish an answer. | GB-018, GB-025–GB-027, GB-030–GB-031, GB-052 | D1-04, D1-06, D2-01, D2-03, P1-01, P1-03 | Approved decision record with byte-level algorithms, field-to-profile registry, domain labels, algorithm policy, independently reproduced vectors, migration/security analysis, and approver/date. |
| H-11 | Revocation, anti-rollback, and historical verification | Decide revocation bootstrap, sequence/chain rules, freshness and clock skew, durable highest-sequence storage, rollback recovery, key-rotation overlap, fail-closed behavior, and historical Receipt validity semantics. | An in-memory or divergent checkpoint policy can accept revoked authority after restart or make historical evidence unverifiable. | GB-028–GB-033, GB-047 | D1-06, D2-01, D2-02, D2-03, D2-04, P1-03 | Approved decision record with revocation/checkpoint state machine, durable-store contract, bootstrap/recovery and rotation rules, historical-time model, failure policy, threat analysis, and approver/date. |
| H-12 | Transport, errors, limits, and observability | Decide the HTTP resource/version/status/media-type contract, authentication/header placement, redirects, TLS/DNS rules, streaming support, transport abort versus Task cancellation, compressed/decompressed limits, timeout behavior, error precedence/details/retry classes, and safe logging floor. | These choices are wire-visible and security-sensitive; incompatible mappings can leak credentials, duplicate work, or make peers reject valid messages. | GB-014–GB-017, GB-034–GB-041, GB-047, GB-049 | D1-03, D1-07, D2-01, D2-04, D2-05, E-02, P1-03 | Approved decision record with operation/status/error tables, streaming decision, redirect/TLS/DNS policy, size/timeout calculations, redaction rules, compatibility and threat analysis, and approver/date. |
| H-13 | Schema openness, extensions, and evolution | Decide closed versus extensible object boundaries, unknown field/message/enum behavior, extension namespace and required/optional semantics, canonicalization/forwarding of extensions, schema-version rules, and experimental feature graduation/removal. | Schema and runtime openness currently differ; evolution rules determine forward compatibility and signed-object integrity. | GB-025, GB-036, GB-042–GB-046, GB-048, GB-051 | D1-02, D1-07, D2-01, D2-03, D2-04, E-01, P1-04 | Approved decision record with per-object openness registry, extension/evolution policy, signed-field treatment, experimental lifecycle, compatibility examples, migration impact, and approver/date. |
| H-14 | Release, support, review, and 1.0 graduation authority | Decide package ownership/names/license, release artifacts and signing authority, support/deprecation windows, required independent implementation profiles, interoperability matrix, external security-review gate, residual-risk authority, and final 1.0 graduation approval. | Publication, support, and risk acceptance are governance acts that tests or implementation behavior cannot decide. | GB-050–GB-060 | D2-03–D2-05, E-01, E-03, P1-01–P1-05 | Approved decision record with owners and approvers, license/artifact inventory, support/deprecation policy, required evidence matrix, review/remediation threshold, residual-risk process, release checklist, and dated 1.0 sign-off rule. |

## Proposed normative specification layout

Phase 15D.1 must preserve `protocol/specification/0.1-draft/` as immutable historical material. It must create a new, human-approved versioned draft directory using the identifier selected by H-03; this plan deliberately does not choose that identifier. The proposed future layout is:

```text
protocol/specification/
  index.md                              # non-normative current-version index
  0.1-draft/                            # immutable historical material
  <human-approved-version>/
    index.md
    terminology.md
    roles-and-trust-boundaries.md
    lifecycle.md
    versioning-and-capabilities.md
    discovery.md
    transport.md
    authentication.md
    authorization.md
    installation.md
    connections.md
    invocation.md
    approvals.md
    tasks.md
    receipts.md
    trust-and-revocation.md
    errors.md
    security-considerations.md
    privacy-considerations.md
    compatibility.md
    extensions.md
    conformance.md
  errata/                               # explicit corrections by published version
```

This is a proposed layout only. Phase 15D.0 must not create these files. The root `index.md` must be a non-normative pointer that identifies version status and immutable asset manifests without silently changing the meaning of a versioned requirement. Published version directories must not be edited in place; corrections must use a dated, reviewable erratum under `errata/`, state whether the correction is editorial or normative, cite affected requirement and asset IDs, and follow H-03 compatibility/governance rules. A normative correction that changes interoperable behavior requires a new versioned directory.

Every Connection, Task, Receipt, fixture, vector, conformance result, and interoperability report must retain or reference its original negotiated protocol version and the hashes/identifiers of the applicable versioned schemas and executable assets. Later indices, errata, SDK releases, or Platform migrations must not reinterpret historical records. Migration rules must define how active durable objects continue, upgrade, or fail safely across versions.

Each normative requirement must have a stable ID, use `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, or `MAY` deliberately, cite its wire object and state transition, and identify its error behavior. Examples, SDK advice, deployment policy, and Platform policy must be explicitly non-normative.

## Phase 15D.1 — normative core specification

### Work items

| ID | Objective | Files or directories expected | Prerequisites | Acceptance criteria | Tests required | Risks | Dependencies | Blocks protocol 1.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1-01 | Establish scope, terms, roles, trust boundaries, responsibility allocation, and the complete lifecycle | Proposed `index.md`, `terminology.md`, `roles-and-trust-boundaries.md`, `lifecycle.md`; decision records under `protocol/decisions/` | Approve names for Client, Host Application, Agent, Approver, issuer, Trust Node, Connection authority, Core/Governed profiles | Every object and role has one owner and trust boundary; every lifecycle phase has entry/exit conditions; public pre-Connection operations and governed post-Connection operations are enumerated; shutdown, restart, revocation, and invalid ordering are normative; Platform policy is labeled | Requirement lint; lifecycle trace review; role-confusion, first-interaction, illegal-order, restart, and operation-after-revocation case designs | Accidentally transferring authority to an Agent or Trust service; making one deployment topology normative | Human decisions H-01, H-02; gaps GB-001–GB-003, GB-014–GB-016 | Yes |
| D1-02 | Define discovery, version/capability/profile negotiation, compatibility, extensions, and evolution | Proposed `versioning-and-capabilities.md`, `discovery.md`, `compatibility.md`, `extensions.md` | D1-01; decide selected-version ordering, capability precedence, required profile set, supported-version window | One deterministic negotiation algorithm and wire-visible result; selected version/capabilities bind later operations and Connection state; downgrade and unknown feature/field behavior are explicit; closed/extensible boundaries and extension registry rules are defined | Permutation/downgrade matrix; missing/unknown capability and extension cases; old/new schema compatibility design; discovery origin/cache/refresh cases | Silent downgrade; divergent ordering across languages; freezing evolution by closing every object | Human decisions H-01, H-03, H-04, H-13; gaps GB-004–GB-006, GB-042–GB-046 | Yes |
| D1-03 | Specify authentication, authorization, installation, Connections, tenant scope, Invocation, deadlines, cancellation, idempotency, and retry | Proposed `authentication.md`, `authorization.md`, `installation.md`, `connections.md`, `invocation.md`; updates to `security-considerations.md` | D1-01 and D1-02; select 1.0 authentication profiles and storage/atomicity obligations | All request actors, credentials, scopes, guards, commit points, expiry boundaries, correlation fields, retry classes, and stable errors are normative; Install Grant redemption is single-use and atomically yields exactly the decided success/retry outcome; Connection version/profile/scope authority is durable; no Platform-only check is silently required | Cross-tenant/workspace negatives; concurrent grant redemption; inactive/revoked Connection; deadline boundary; cancel/complete race design; idempotency replay/conflict/restart; auth/profile negatives | Authorization bypass; duplicate Connection/Task; irreversible conflict between documented idempotency and production behavior | Human decisions H-01, H-02, H-04–H-07, H-12; gaps GB-007–GB-017 | Yes |
| D1-04 | Specify exact-action Approval and Approval replay prevention | Proposed `approvals.md`; approval portions of `security-considerations.md` and `privacy-considerations.md` | D1-03; approve canonical action representation, domain separation, actor/scope binding, consumption commit point | Exact byte-level approved action and digest are defined; every binding and expiry rule is normative; consumption/replay and cancellation/failure effects are an explicit state machine; widened or mutated action cannot execute | Positive vector outline; one-field mutation suite; double-consume concurrency; expiry/skew; action/resource/parameters/Connection/actor substitution | An Approval authorizes more than presented; valid retries are mistaken for replay | Human decisions H-08, H-10; gaps GB-018–GB-019 | Yes |
| D1-05 | Specify durable Task creation, polling, result retrieval, expiry, cancellation, persistence, and terminal Receipt coupling | Proposed `tasks.md`, relevant portions of `receipts.md` and `conformance.md` | D1-03; resolve `rejected`; decide result object and cancel/complete winner | Receiver-generated opaque Task IDs and correlation are defined; all states, triggers, guards, effects, terminality, expiry, polling hints, result availability, restart recovery, and atomic Receipt rules are normative; unsupported Task behavior fails predictably | Full legal-edge and illegal-trigger design; concurrency, persistence failure, restart, expiry boundary, polling/backoff, cancellation, result/Receipt consistency cases | Lost durable work; split-brain terminal state; result disclosed after cancellation or across tenant | Human decision H-09; gaps GB-020–GB-024 | Yes |
| D1-06 | Specify Receipt semantics, Trust metadata, keys, rotation, revocation, freshness, anti-rollback, and historical verification | Proposed `receipts.md`, `trust-and-revocation.md`, relevant `security-considerations.md` | D1-03 and D1-05; select canonical encoding/digest/signature profiles and durable checkpoint contract | Every signed byte and binding is defined; key ID/rotation overlap and failure behavior are normative; revocation bootstrap, sequence, freshness, rollback, restart, recovery, and historical-time semantics are complete; current authorization is distinguished from historical validity | Byte-vector plan; key ambiguity/rotation cases; stale/skipped/rollback revocation; durable restart; Receipt mutation and historical boundary cases | Signature ambiguity; accepting revoked authority; rollback after restart; unverifiable historical Receipt | Human decisions H-07, H-10, H-11; gaps GB-025–GB-033 | Yes |
| D1-07 | Define transport-independent operations, the HTTP binding, errors, limits, privacy, and safe observability | Proposed `transport.md`, `errors.md`, `security-considerations.md`, `privacy-considerations.md`; operation/status registry | D1-01 through D1-06; decide streaming support, media types, redirect policy, error detail schemas, size-limit negotiation | Every route/method/header/media type/body/framing/status/redirect/timeout/size rule is explicit; transport abort versus Task cancellation is settled; error trigger, retry/state effect, safe text, details, and status are stable; minimum logs are privacy-bounded and secret-free | Raw-wire positive/negative design; content-type/charset/unknown field; oversized/compressed body; redirect/DNS/TLS; exhaustive error/status/state-effect map; log-redaction cases | Credential exfiltration; request smuggling/confusion; unbounded memory; error leakage; incompatible status handling | Human decisions H-02, H-05, H-12, H-13; gaps GB-034–GB-041, GB-047–GB-049 | Yes |

### Phase 15D.1 exit criteria

Phase 15D.1 is complete only when:

1. every one of the 60 audited areas has a requirement-numbered normative disposition or an explicit, justified non-feature decision;
2. all ten recorded contradictions are resolved by human-approved protocol decisions;
3. every required wire object, transition, cryptographic input, error, and compatibility rule is traceable from prose to a planned 15D.2 asset;
4. independent Go and Python reviewers can write an implementation design without consulting JavaScript or Platform source;
5. security and privacy review finds no undocumented authority path or protected-value flow;
6. no implementation behavior is promoted to normative status solely because the current tests pass;
7. `protocol/specification/0.1-draft/` remains byte-for-byte historical, and the H-03-approved new draft, non-normative current-version index, errata mechanism, and historical-object version rules are reviewable.

## Phase 15D.2 — canonical executable protocol assets

### Work items

| ID | Objective | Files or directories expected | Prerequisites | Acceptance criteria | Tests required | Risks | Dependencies | Blocks protocol 1.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D2-01 | Publish complete canonical wire schemas and examples | Versioned `protocol/schemas/`; proposed `protocol/fixtures/wire/`; schema index/manifest | Approved D1 requirements and object/extension decisions | Every request, response, error, Connection, negotiation result, cancellation, Task result, Trust object, and Receipt has a canonical schema; `$id`, version, openness, formats, bounds, and cross-field rules are documented; examples validate | Meta-schema validation; positive/boundary/negative corpus in at least two validators; prose-schema-type trace check | JSON Schema dialect differences; encoding semantics incorrectly delegated to schema | D1-02 through D1-07; human decisions H-03–H-05, H-07, H-09–H-13; gaps GB-021, GB-025–GB-027, GB-050–GB-052 | Yes |
| D2-02 | Publish explicit machine-readable state machines and invariants | Proposed `protocol/state-machines/` plus rendered diagrams | Approved D1 lifecycle and transition tables | Install Grant, Connection, Approval, Task, key lifecycle, and revocation checkpoint definitions include states, triggers, guards, effects, atomicity, persistence, illegal errors, and terminality; rendered docs are generated from canonical data | Edge/illegal-trigger generation; concurrent trigger models; crash/restart and commit-point fault cases | A generated diagram can hide an underspecified guard; model diverges from prose | D1-01, D1-03 to D1-06; human decisions H-01, H-06–H-09, H-11; gap GB-021 and related lifecycle gaps | Yes |
| D2-03 | Create deterministic golden fixtures and cryptographic test vectors | Proposed `protocol/fixtures/`, `protocol/test-vectors/`, signed asset manifest | D2-01; approved canonical bytes/domain labels/algorithms; independent crypto reviewers | Static fixtures cover all operations and boundaries; vectors expose exact UTF-8/canonical/preimage/digest/signature bytes; at least two independent implementations reproduce positives; mutations have stable expected errors; no production secret is present | Fixture schema/hash verification; two-language vector reproduction; mutation and boundary suite | Recording official TypeScript output as truth; unsafe test keys reused; fixture drift | D1-04, D1-06, D1-07; human decisions H-08, H-10, H-11, H-13; gaps GB-051–GB-052 | Yes |
| D2-04 | Create malicious-peer, failure, and compatibility fixtures | Proposed `protocol/fixtures/malicious/`, `failures/`, `compatibility/`, version/profile matrix | D2-01 through D2-03; published support and evolution policy | Corpus covers parser abuse, size/content confusion, downgrade, credential redirects, cross-scope references, replay, stale/rollback Trust, signature/key confusion, transition races, storage failure, and all supported version/profile/feature pairs | Corpus mutation checks; determinism/repeatability; safe-report redaction; old/new pair execution | Multi-fault cases obscure cause; fixtures encode a deployment assumption | D1-02 through D1-07; human decisions H-03–H-06, H-08, H-09, H-11–H-13; gap GB-053 and compatibility gaps | Yes |
| D2-05 | Implement implementation-neutral black-box conformance | Proposed `protocol/conformance/` described in `conformance-architecture.md`; versioned result schema | D2-01 through D2-04; stable requirement IDs; reviewed adapter boundary | Runner and oracle logic import no official implementation helpers; identical immutable cases run against official and independent IUTs solely through the published wire/process-adapter boundary; a process adapter may import only the public package that is the IUT; results cite requirements/assets and use `PASS`, `FAIL`, `SKIP`, `SUITE_ERROR`; all claimed mandatory cases must pass | Forbidden-dependency/build scan; self-tests with deliberately bad IUTs; two independent runner/validator agreement; official package regression run through the standardized boundary | TypeScript becomes hidden oracle; adapter imports unrelated helpers; harness implements business logic; false confidence from official-to-official tests | All D1/D2 items; human decision H-14; gap GB-050 | Yes |

### Phase 15D.2 exit criteria

Phase 15D.2 is complete only when:

1. every normative message and transition maps to a versioned executable asset;
2. canonical schemas pass independent validators and cross-field semantic cases;
3. cryptographic vectors are byte-exact and independently reproduced;
4. malicious and compatibility fixtures cover the published security and version matrix;
5. the runner and expected-result/oracle logic have no official-runtime or Platform dependency, any process-adapter import is allowlisted to the public package that is itself the IUT, and seeded non-conformance is detected;
6. the official TypeScript implementation is treated as an ordinary IUT and its failures are not waived;
7. a safe, reproducible result bundle can be reviewed without repository-private state.

## Phase 15E — production TypeScript SDK separation

### Work items

| ID | Objective | Files or directories expected | Prerequisites | Acceptance criteria | Tests required | Risks | Dependencies | Blocks protocol 1.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E-01 | Separate specification-derived protocol types/validation from Client, Agent/server, Trust, transport, and framework adapters | Reworked `packages/ghostbridge-protocol-core/`, `ghostbridge-native-client/`, `ghostbridge-native-agent/`, `ghostbridge-trust/`; thin adapter packages as decided | Phase 15D complete; canonical schemas and conformance suite stable | Public package boundaries mirror roles; middleware contains no protocol business logic; no package imports Platform; generated types/validators trace to canonical assets; Trust and transport dependencies are explicit | Public API/type tests; package boundary/dependency tests; identical conformance against each role package | Refactor changes wire behavior; circular dependencies; duplicate validation logic | D2-01, D2-05; human decisions H-02, H-13, H-14; gap GB-055 | Yes |
| E-02 | Isolate Platform integration and label stricter Platform policy | `backend/src/services/platformNativeClient.service.js` and focused Platform adapter/docs | E-01; normative minimum authorization/error/storage rules approved | Adapter calls supported SDK APIs only; Platform-only policy is enumerated and cannot change wire semantics or weaken protocol rules; status/error translation is conformant | Conformance through Platform adapter; policy-delta tests; tenant/session/auth/revocation integration tests | Platform remains the de facto oracle; stricter status mapping leaks into SDK | D1-03, D1-07, E-01; human decisions H-02, H-05, H-07, H-12 | Yes |
| E-03 | Prepare supported, publishable SDK artifacts and migration documentation | Package manifests, generated API docs, examples, migration/security guides, build/provenance configuration | E-01/E-02; H-14 decisions on names, license, versions, support, and registries | Client and server/Agent artifacts are separately consumable; versions and wire compatibility are not conflated; exports, runtime support, license, integrity/provenance, changelog, and migrations are explicit; examples remain non-normative | Clean-consumer installs; ESM/CJS/runtime matrix as supported; artifact content/API checks; conformance on packed artifacts | Premature publication; package version implies unsupported wire claim; secret/dev assets included | Human decisions H-03, H-14; gap GB-056 contributes | Yes |

### Phase 15E exit criteria

Phase 15E is complete only when packed SDK artifacts—not workspace source—pass the same applicable conformance suite, framework/Platform adapters are observably thin, package support and migration contracts are documented, and no SDK is described as the specification.

## Pre-1.0 — independent evidence and release readiness

### Work items

| ID | Objective | Files or directories expected | Prerequisites | Acceptance criteria | Tests required | Risks | Dependencies | Blocks protocol 1.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1-01 | Build an independent second implementation in Go, Python, Java, or Rust without reading official implementation source | Separate repository or clearly isolated top-level project; independent design log and dependency inventory | Phase 15D complete; clean-room participation rules and public conformance assets | Implements at least one production Client and Agent/Trust role sufficient for the mandatory 1.0 profile; design questions are answered from specification; no official runtime dependency or source-derived code | Full claimed-role conformance; artifact/reproducibility checks; clean-room audit | Accidental source contamination; implementing only the happy path; shared crypto bug | D2-05; human decisions H-04, H-10, H-14; gap GB-054 | Yes |
| P1-02 | Produce a bidirectional interoperability and compatibility matrix | Versioned `protocol/interoperability/` reports or release evidence repository | P1-01; release-candidate official SDK; frozen suite/fixture set | Official Client↔independent Agent and independent Client↔official Agent pass; both verify common Trust/Receipt vectors; every supported version/profile/feature pair has a result; failures and unsupported pairs are explicit | Repeated cross-runtime runs on declared operating systems; restart/concurrency/network fault runs; report signature/hash validation | Official-to-official success masks ambiguity; environment-specific behavior | P1-01, E-03; human decisions H-03, H-04, H-14; gap GB-058 | Yes |
| P1-03 | Complete independent protocol and implementation security review | Threat model, normative spec, conformance assets, official and independent implementation artifacts, remediation register | Feature and wire freeze; P1-02 evidence; reviewer independence and scope approved | Review covers authority, authentication, tenant isolation, grants, exact-action Approval, Tasks/Receipts, canonicalization, key/revocation/rollback, transport, parser limits, privacy, supply chain; all critical/high findings remediated and retested | Reviewer attack cases added as governed malicious fixtures; remediation regression and conformance; penetration/fuzz evidence as scoped | Review too late to change protocol; narrow implementation-only scope | All D/E items, P1-01/P1-02; human decisions H-02, H-05–H-12, H-14; gap GB-059 | Yes |
| P1-04 | Define support, compatibility, deprecation, release, and supply-chain policy | Version/support policy, compatibility ledger, deprecation policy, release checklist, changelog/migration templates, SBOM/provenance/signing configuration | D1 compatibility decisions; E-03 package design; organization/maintainer decisions | Supported wire/schema/SDK windows are explicit; deprecation notice and removal rules exist; reproducible signed artifacts, SBOM, provenance, vulnerability intake, rollback, key custody, and release authority are documented | Release rehearsal; artifact/signature/SBOM verification; upgrade/downgrade and rollback drill | Unsupported versions linger; release keys or provenance become single point of failure | Human decisions H-03, H-13, H-14; gaps GB-056–GB-057 | Yes |
| P1-05 | Execute and approve the protocol 1.0 graduation checklist | Versioned graduation report and immutable evidence manifest | P1-01 through P1-04; all earlier phase exit criteria | Zero unresolved CRITICAL/HIGH normative gaps; all 60 findings closed with evidence; mandatory conformance/interoperability/security/release gates pass; governance records explicit human approval; residual risks and optional deferrals are published | Independent evidence-hash audit; clean-environment rerun of conformance/interoperability/release checks; documentation link/requirement coverage | Schedule pressure converts unknowns into waivers; “tests pass” substitutes for independent review | Entire plan; human decision H-14; gap GB-060 | Yes |

## Gap closure register

This compact register assigns every audited gap exactly one primary work item and its expected closure artifacts. `PENDING` means no gap is closed by this Phase 15D.0 planning revision. Chapter names are relative to the future H-03-approved versioned specification directory; asset paths are proposed Phase 15D.2 locations and may be refined without removing traceability.

| Gap ID | Primary Phase work item | Applicable Human Decision IDs | Expected normative chapter | Expected Phase 15D.2 executable asset | Closure evidence status |
| --- | --- | --- | --- | --- | --- |
| GB-001 | D1-01 | H-01, H-02 | `index.md`; `terminology.md` | Requirement/object registry and lifecycle role cases | PENDING |
| GB-002 | D1-01 | H-02 | `roles-and-trust-boundaries.md` | Wrong-role and prohibited-authority fixtures | PENDING |
| GB-003 | D1-01 | H-01, H-02 | `roles-and-trust-boundaries.md` | Role-responsibility conformance profile | PENDING |
| GB-004 | D1-02 | H-01 | `discovery.md` | Discovery schemas and origin/cache/refresh fixtures | PENDING |
| GB-005 | D1-02 | H-01, H-03 | `versioning-and-capabilities.md` | Version permutation, downgrade, and binding matrix | PENDING |
| GB-006 | D1-02 | H-04 | `versioning-and-capabilities.md` | Capability/profile Cartesian fixtures | PENDING |
| GB-007 | D1-03 | H-05 | `authentication.md` | Authentication profile schemas and negative fixtures | PENDING |
| GB-008 | D1-03 | H-02 | `authorization.md` | Role/scope authorization decision fixtures | PENDING |
| GB-009 | D1-03 | H-05, H-06 | `installation.md` | Install Grant schemas, state machine, and concurrency fixtures | PENDING |
| GB-010 | D1-03 | H-06 | `installation.md` | Preview schema and preview/redemption mutation fixtures | PENDING |
| GB-011 | D1-03 | H-04, H-07 | `connections.md` | Connection schema and authority state machine | PENDING |
| GB-012 | D1-03 | H-02, H-07 | `authorization.md`; `connections.md` | Organization/workspace isolation fixtures | PENDING |
| GB-013 | D1-03 | H-02, H-07 | `invocation.md` | Invocation request/response schemas and binding fixtures | PENDING |
| GB-014 | D1-03 | H-01, H-12 | `invocation.md`; `transport.md` | Correlation/replay/mismatch fixtures | PENDING |
| GB-015 | D1-03 | H-01, H-12 | `invocation.md`; `transport.md` | Deterministic deadline and timeout clock cases | PENDING |
| GB-016 | D1-03 | H-01, H-09, H-12 | `tasks.md`; `transport.md` | Cancellation schemas and cancel/complete/abort races | PENDING |
| GB-017 | D1-03 | H-06, H-07 | `invocation.md` | Idempotency state machine and lost-response fixtures | PENDING |
| GB-018 | D1-04 | H-08, H-10 | `approvals.md` | Exact-action canonicalization vectors and mutation corpus | PENDING |
| GB-019 | D1-04 | H-08 | `approvals.md` | Approval consumption state machine and replay races | PENDING |
| GB-020 | D1-05 | H-09 | `tasks.md` | Task creation/acceptance schemas and durability cases | PENDING |
| GB-021 | D2-02 | H-09 | `tasks.md` | Canonical Task state machine and transition suite | PENDING |
| GB-022 | D1-05 | H-09 | `tasks.md` | Polling response schemas and timing fixtures | PENDING |
| GB-023 | D1-05 | H-09 | `tasks.md`; `receipts.md` | Result retrieval schemas and authorization fixtures | PENDING |
| GB-024 | D1-05 | H-09 | `tasks.md` | Expiry/retention/tombstone clock fixtures | PENDING |
| GB-025 | D2-01 | H-09, H-10, H-13 | `receipts.md` | Receipt schema/type parity corpus | PENDING |
| GB-026 | D2-03 | H-10 | `receipts.md` | Signed Receipt proof vectors and binding mutations | PENDING |
| GB-027 | D2-03 | H-10 | `receipts.md`; `trust-and-revocation.md` | Canonical-byte and digest vectors for every field | PENDING |
| GB-028 | D1-06 | H-11 | `receipts.md`; `trust-and-revocation.md` | Historical verification timeline fixtures | PENDING |
| GB-029 | D1-06 | H-07, H-11 | `trust-and-revocation.md` | Trust metadata schemas and Connection-binding fixtures | PENDING |
| GB-030 | D1-06 | H-10, H-11 | `trust-and-revocation.md` | Key ID/rotation/ambiguity vectors | PENDING |
| GB-031 | D2-01 | H-10, H-11 | `trust-and-revocation.md` | Revocation document schemas and chain fixtures | PENDING |
| GB-032 | D1-06 | H-11 | `trust-and-revocation.md` | Freshness/skew/expiry deterministic-clock cases | PENDING |
| GB-033 | D2-02 | H-11 | `trust-and-revocation.md` | Anti-rollback checkpoint state machine and restart fixtures | PENDING |
| GB-034 | D1-07 | H-06, H-08, H-09, H-12 | `errors.md` | Error trigger/precedence/state-effect suite | PENDING |
| GB-035 | D1-07 | H-06, H-09, H-12 | `errors.md`; `transport.md` | Protocol-error-to-HTTP-status matrix | PENDING |
| GB-036 | D1-07 | H-12, H-13 | `errors.md`; `privacy-considerations.md` | Error-detail schemas and disclosure/redaction fixtures | PENDING |
| GB-037 | D1-07 | H-12 | `transport.md` | Transport adapter contract cases | PENDING |
| GB-038 | D1-07 | H-12 | `transport.md` | Raw HTTP method/path/header/body/framing corpus | PENDING |
| GB-039 | D1-07 | H-05, H-12 | `transport.md`; `security-considerations.md` | Redirect/origin/DNS/credential-leak fixtures | PENDING |
| GB-040 | D1-07 | H-12 | `transport.md` | Request/response/compression size-boundary corpus | PENDING |
| GB-041 | D1-07 | H-12 | `transport.md` | Media-type/charset/empty-body negative corpus | PENDING |
| GB-042 | D1-02 | H-04, H-13 | `extensions.md` | Unknown-field and required/optional-extension fixtures | PENDING |
| GB-043 | D1-02 | H-03, H-13 | `compatibility.md`; `extensions.md` | Schema-evolution compatibility fixtures | PENDING |
| GB-044 | D1-02 | H-03, H-13 | `compatibility.md` | Supported-version and stored-object matrix | PENDING |
| GB-045 | D1-02 | H-03, H-13 | `compatibility.md` | Forward-compatibility unknown-value fixtures | PENDING |
| GB-046 | D1-02 | H-04, H-13 | `extensions.md` | Experimental opt-in/graduation/removal fixtures | PENDING |
| GB-047 | D1-07 | H-02, H-05, H-08, H-11, H-12 | `security-considerations.md` | Threat-to-malicious-fixture trace matrix | PENDING |
| GB-048 | D1-07 | H-13 | `privacy-considerations.md` | Data-minimization/retention/disclosure fixtures | PENDING |
| GB-049 | D1-07 | H-02, H-12 | `privacy-considerations.md`; `conformance.md` | Safe observability and protected-value redaction cases | PENDING |
| GB-050 | D2-05 | H-14 | `conformance.md` | Suite manifest, adapter contract, and result schema | PENDING |
| GB-051 | D2-03 | H-13 | `conformance.md` | Versioned golden-fixture corpus and signed manifest | PENDING |
| GB-052 | D2-03 | H-10 | `conformance.md` | Independently reproduced cryptographic vector corpus | PENDING |
| GB-053 | D2-04 | H-14 | `conformance.md`; `security-considerations.md` | Versioned malicious-peer and failure corpus | PENDING |
| GB-054 | P1-01 | H-04, H-14 | `conformance.md` | Independent-IUT profile, adapter, and clean-room result | PENDING |
| GB-055 | E-01 | H-02, H-14 | `conformance.md` | Package-boundary profile and dependency-isolation cases | PENDING |
| GB-056 | P1-04 | H-14 | `compatibility.md`; `conformance.md` | Release-bundle manifest schema and integrity checks | PENDING |
| GB-057 | P1-04 | H-03, H-14 | `compatibility.md` | Support/deprecation/EOL compatibility fixtures | PENDING |
| GB-058 | P1-02 | H-03, H-14 | `compatibility.md`; `conformance.md` | Interoperability result schema and version matrix | PENDING |
| GB-059 | P1-03 | H-14 | `security-considerations.md`; `conformance.md` | Review-evidence schema and reviewer-fixture intake | PENDING |
| GB-060 | P1-05 | H-03, H-04, H-14 | `index.md`; `conformance.md` | Machine-readable graduation evidence manifest/checker | PENDING |

### Protocol 1.0 graduation criteria

Ghost Bridge 1.0 may be claimed only after all of the following are true:

- the Phase 15D.1, 15D.2, and 15E exit criteria pass;
- an independently developed second implementation passes its claimed mandatory production profiles;
- official and independent implementations interoperate bidirectionally across the supported matrix;
- external protocol/security review is complete and all blocking findings are closed;
- compatibility, support, deprecation, release, provenance, vulnerability, and rollback policies are approved and rehearsed;
- the exact specification, schemas, vectors, suite, SDK artifacts, reports, and review remediation are tied together by an immutable evidence manifest;
- designated human protocol authorities record the 1.0 decision and accepted residual risks.

No individual package version, passing repository test suite, official-to-official run, or Platform deployment can independently satisfy these criteria.

## Decision sequencing controls

The Human Protocol Decision Register is authoritative for unresolved choices. Changes require the H-ID's specified decision-record evidence, threat/compatibility analysis, requirement and executable-asset updates, and conformance cases before implementation merge. Phase work may overlap only where prerequisites are stable; downstream code must not settle an upstream normative ambiguity.

## Current status

**PHASE 15D.1 EXIT CRITERIA SATISFIED — PHASE 15D.2 STARTED AND INCOMPLETE;
D2-01A EXECUTABLE SCHEMA FOUNDATION INTEGRATED; D2-BG-01 REVISION 3 ACCEPTED**

Phase 15D.0 audit and planning are complete. Human decisions H-01 through H-14
are accepted, and D1-01 through D1-07 are reviewed and integrated. Phase 15D.1
remains `EXIT_CRITERIA_SATISFIED`; its non-normative evidence is recorded in the
[Phase 15D.1 exit-gate evidence record](./phase-15d1-exit-gate-evidence.md).

Phase 15D.2 remains `STARTED` and `INCOMPLETE`. D2-RP-01 Revision 3 remains the
accepted representation authority.

D2-BG-01 Revision 3 is human-approved and `ACCEPTED`. Its durable governance
record is being integrated by this change. D2-BG-01 establishes downstream
representation authority for the exact approved identity and capability
decisions; it does not create executable D2-01B assets.

The D2-01A executable schema foundation is now integrated into main. Evidence:

- PR: #29 — Add D2-01A executable schema foundation
- reviewed branch head: `b34c4c250f0d03b96b58e7a84bf48b00dc299611`
- verified GitHub merge commit: `69e535b37ad50699fdca320dfbfb165a937dc778`

D2-01A established the foundation-level executable schema infrastructure,
including versioned schemas, registry foundation, foundation fixtures,
semantic-constraint inventory, and implementation-neutral validation tooling.
D2-01A is a completed and integrated WORKFLOW SUB-SLICE only; it does not
establish D2-01 completion.

D2-BG-02 is next. Executable D2-01B remains not started and not integrated;
D2-01 overall remains incomplete. D2-01B through D2-01F remain incomplete and
not integrated. D2-02 through D2-05 remain incomplete. The final D2-01
requirement for evidence from two genuinely independent Draft 2020-12
validators remains `SECOND_VALIDATOR_EVIDENCE_PENDING`.

All 60 `GB-*` gaps remain `PENDING`. The candidate remains
`ghostbridge/e1.r0-draft.1` and remains draft/prerelease.

No claim exists of D2-01 completion; D2-02 through D2-05 completion;
conformance; an independent second implementation; interoperability; external
security review; Phase 15E completion; production readiness; publication;
release; or a Protocol 1.0 declaration.
