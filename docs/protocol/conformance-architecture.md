# Black-box conformance architecture

## Status and purpose

This document designs a future Ghost Bridge conformance system. It does not implement a harness, add fixtures, change a protocol requirement, or certify the current JavaScript packages.

The system's purpose is to determine whether any implementation—including the official TypeScript implementation—conforms to the published Ghost Bridge specification from observable protocol behavior alone. Its authorities will be the versioned normative specification, canonical schemas, registered state machines, and reviewed fixture/vector corpus. Source code, private helpers, Platform behavior, and snapshots captured from the official implementation are not authorities.

The architecture preserves Ghost Bridge's own authority model: trusted installation, Install Grants, scoped Connections, governed Invocation, exact-action Approvals, durable Tasks, signed Receipts, Trust verification, revocation, and anti-rollback. It introduces no MCP dependency or alternate authority path.

## Authority hierarchy

If conformance assets disagree, resolution must follow this order:

1. Normative, requirement-numbered protocol specification for the tested version.
2. Canonical wire schemas and registered state-machine definitions for that version.
3. Reviewed cryptographic vectors and black-box fixture manifests derived from those requirements.
4. Non-normative examples and SDK documentation.
5. Implementation behavior.

An inconsistency among the first three levels is a suite defect. The affected case must be quarantined as `SUITE_ERROR`, not changed to match TypeScript output. A specification change requires protocol governance, compatibility analysis, and a new versioned asset; it cannot be made implicitly by changing a test.

Every executable case must cite one or more stable requirement IDs and all applicable schema/state-machine/vector IDs. A case without a normative citation cannot contribute to a conformance claim.

## Implementation-under-test boundary

The implementation under test (IUT) is a process, service, command-line program, or public library package reached only through the standardized conformance boundary. The runner and expected-result/oracle logic are separate from the IUT and its adapter. They **MUST NOT** import official implementation helpers or use implementation behavior to calculate an expected result.

The runner **MAY** test any IUT, including the official TypeScript implementation, by communicating with it only through the published wire contract or process-adapter contract. Subprocess and network communication are permitted only as transports for that standardized boundary; they do not permit private control endpoints, helper calls, or additional implementation-specific observations.

Through the standardized boundary, the harness may observe:

- Ghost Bridge wire requests and responses;
- declared startup readiness and shutdown completion;
- adapter-supplied test configuration;
- documented process exit status and standard diagnostic streams;
- test-control events for deterministic time, identifiers, and network faults;
- durable externally observable state when a case explicitly restarts the IUT.

The runner and expected-result/oracle logic must not:

- import the IUT package, private or public implementation helpers, or any official Ghost Bridge runtime package;
- read an IUT database, memory, cache, private filesystem, or internal event bus;
- call Platform services to determine the expected result;
- derive expected bytes by executing TypeScript canonicalization, signing, validation, or state-transition code;
- invoke hidden implementation-specific subprocesses, network endpoints, or callbacks as oracle services;
- use an implementation-specific endpoint to bypass authentication, authorization, Connection authority, Approval, or Trust verification;
- depend on a JavaScript stack trace, class identity, object property order, or undocumented diagnostic text.

Two adapter forms are permitted:

- **Wire adapter:** exposes the published HTTP or future registered transport directly.
- **Process adapter:** translates a small, versioned, language-neutral conformance control protocol to a library IUT while leaving all Ghost Bridge messages unchanged. It may import the public package that is itself the IUT.

The process adapter may start, stop, reset an isolated test instance, inject deterministic test dependencies, and return captured wire messages. It may use the public IUT API only to expose the standardized boundary. It **MUST NOT** import unrelated official packages or helpers to validate, canonicalize, sign, verify, calculate transitions, determine expected results, or repair IUT output. It must contain no independent Ghost Bridge validation, state-transition, cryptographic, policy, or oracle logic. Its source and dependency graph are reviewable suite artifacts.

No hidden implementation-specific oracle call is permitted. If the official TypeScript public package is the IUT, importing that package inside its process adapter is IUT construction, not an oracle dependency; importing protocol-core, Trust, Client, Agent, Platform, or another official package solely to judge that IUT's behavior remains prohibited.

## System components

The future `protocol/conformance/` tree should contain:

| Component | Responsibility | Prohibited responsibility |
| --- | --- | --- |
| `manifest/` | Declares suite version, protocol versions, profiles, cases, requirement mappings, and asset hashes | Selecting expected behavior from an implementation |
| `schemas/` | Pins canonical schemas used by cases | Repairing or coercing invalid messages |
| `state-machines/` | Pins machine-readable legal states, transitions, guards, and invariants | Calling IUT transition helpers |
| `fixtures/` | Stores canonical requests, responses, malicious inputs, and compatibility transcripts | Golden-recording an official implementation |
| `vectors/` | Stores byte-exact canonicalization, digest, signature, key, revocation, and Receipt vectors | Computing expected values at test time with an official SDK |
| `runner/` | Executes cases, compares observations, redacts evidence, and emits results | Importing official packages or Platform code |
| `adapters/` | Starts and controls an IUT through the minimal adapter contract | Implementing protocol semantics |
| `reports/` | Defines machine-readable results and human summaries | Treating skipped cases as passes |

The suite distribution must be usable without Node.js. At least one reference runner may use any language, but the fixtures, schemas, vectors, manifest, and result format must be plain versioned data. A second runner written without official runtime dependencies should reproduce the same suite decisions before 1.0.

## Role-specific conformance

### Client conformance

Client cases place a scripted Agent and Trust peer opposite the Client IUT. They verify that the Client:

- performs required discovery/initialization before governed operations;
- negotiates and then respects version, profiles, features, authentication, and limits;
- verifies installation preview and Trust material before consent or redemption;
- protects Install Grants and authentication values from redirects, logs, and unrelated origins;
- binds all governed Invocations to the correct active Connection, organization, workspace, Passport, capability, scope, deadline, and idempotency key;
- obtains and uses exact-action Approval without widening action, resource, parameters, scope, expiry, or actor;
- handles durable Task polling, cancellation races, expiry, terminality, result retrieval, and Receipt verification;
- rejects malformed, oversized, replayed, rolled-back, incorrectly signed, or incompatible peer data;
- exposes stable protocol errors without unsafe peer detail.

The scripted peer must be able to deviate maliciously after a valid earlier exchange. A Client does not pass merely because it succeeds against the official Agent.

### Agent/server conformance

Agent cases place a scripted Client, Approver, and Trust environment opposite the Agent IUT. They verify that the Agent:

- publishes conformant discovery and installation metadata;
- authenticates the correct caller and enforces Connection authority, tenant/workspace isolation, capability and scope;
- issues, resolves, expires, and atomically redeems single-use Install Grants;
- treats retries according to the normative idempotency contract without duplicating Connections or Tasks;
- validates exact-action Approval and consumes it with the required atomicity and replay semantics;
- applies Task transitions, cancellation, expiry, persistence, restart recovery, and terminal Receipt creation exactly;
- signs Receipts and binds them to Task, Invocation, Connection, Passport, scope, result, and historical Trust material as required;
- maps all failures to the normative protocol error and transport status;
- fails closed on storage, clock, Trust, revocation, and cryptographic uncertainty.

Production-profile cases must use durable test stores and include restart/concurrency cases. An in-memory development profile cannot satisfy a production claim.

### Trust Node conformance

Trust cases test issuer discovery, proof verification, key selection, rotation overlap, revocation documents, freshness, historical verification, and anti-rollback. They must include:

- valid and invalid canonical JSON;
- unknown, missing, duplicate, and incorrectly typed fields;
- key identifiers that are absent, ambiguous, revoked, rotated, or outside validity;
- signatures with altered protected fields, algorithms, encodings, or byte representations;
- revocation documents that are stale, expired, skipped, replayed, rolled back, or inconsistently signed;
- restart tests proving that the highest accepted sequence survives;
- historical Receipt verification at before/during/after rotation and revocation boundaries.

The Trust profile must distinguish cryptographic validity, current authorization, and historical validity. Expected answers come from reviewed vectors, not the Trust JavaScript package.

## Cross-cutting conformance domains

### Transport conformance

For every registered transport binding, cases cover methods, path templates, parameter encoding, headers, protocol-version header, authentication placement, media types and parameters, charset, body framing, empty bodies, compression, redirect policy, DNS/address changes, TLS requirements, timeouts, cancellation, maximum request/response sizes, connection closure, and error status mapping.

Transport cases must distinguish request abort from protocol Task cancellation. If 1.0 does not support streaming, cases must prove that streaming claims or frames are rejected consistently. Alternate transports may be tested only after their own normative binding exists.

### Schema conformance

Each message kind has positive, boundary, and negative instances. Validation covers required fields, closed versus extensible objects, string formats, numeric bounds, Unicode, null/omitted distinctions, duplicate JSON member policy, unknown extension registration, and cross-field invariants that JSON Schema cannot express.

A schema-valid message may still fail a normative semantic constraint; a schema-invalid message must never be accepted as the corresponding protocol object. Both directions are tested.

### Lifecycle conformance

Cases traverse initialization/discovery, trust establishment, preview, authentication, Install Grant issuance/redemption, Connection creation, governed operation, revocation/closure, and shutdown. They test every allowed start state and illegal reordering, repeated interaction, peer restart, resumed state, expired authority, and operation after terminal/revoked state.

### State-machine conformance

Machine-readable definitions enumerate states, triggers, guards, effects, atomicity points, terminality, and stable error for every illegal transition. Generated transition coverage must include:

- every legal edge at least once;
- every state paired with each inapplicable trigger;
- concurrent duplicate and competing triggers;
- persistence failure before and after the defined commit point;
- restart at every externally observable state;
- clock boundaries for expiry and deadlines.

Install Grant, Connection, Approval, Task, key lifecycle, and revocation checkpoint machines are independently reported.

### Error conformance

Each negative case asserts the protocol error code, transport status where applicable, retry classification, required machine-readable detail schema, safe message rules, and absence of secrets. It also asserts state effects: whether authority was consumed, whether a Task was created, and whether retry with the same idempotency key is legal.

Free-form message text must not determine PASS unless the normative specification explicitly fixes it. Unknown internal exceptions must map to a stable safe error.

## Deterministic and hostile test assets

### Cryptographic test vectors

Vectors are static, independently reviewed records containing:

- exact UTF-8 input octets, with hex or base64url representation;
- parsed semantic object where applicable;
- canonical octets;
- domain-separation label and complete digest preimage;
- digest algorithm and exact digest bytes;
- signature algorithm, public key, test-only private key where needed, key ID, signature bytes, and expected verification result;
- applicable protocol version/profile and requirement IDs;
- one-field mutation vectors and expected error classification.

Vectors must cover Install Grants, Approval action digests, signed Invocation descriptors, Passports, Trust metadata, revocation sets, and Receipts. Private keys are generated solely for published test use and must never resemble production material.

At least two independent cryptographic implementations must reproduce every positive vector before the vector is normative. The official TypeScript code may be one participant but never the sole generator or reviewer.

### Deterministic clocks and identifiers

Every case declares a fixed UTC instant, permitted skew, deadline, expiry boundaries, and a deterministic sequence of opaque IDs/nonces. The IUT receives these through dependency injection or the process-adapter control channel before it starts; they are never carried in production Ghost Bridge messages unless the protocol normally carries them.

Clock movement cases include exact-boundary, one unit before/after, forward jump, backward jump, and restart. Identifier cases include collision, replay, wrong ownership, malformed value, and exhaustion/error. A production endpoint that lets a remote peer set server time, IDs, signatures, or authorization is forbidden.

### Malicious-peer fixtures

Fixtures must include malformed JSON, duplicate members, oversized/compressed bodies, content-type confusion, invalid Unicode, unknown fields, downgrade attempts, inconsistent capability claims, redirect credential theft, DNS rebinding, replayed grants/approvals/requests, cross-tenant identifiers, stale/rollback revocation, signature substitution, key-ID confusion, Task transition races, late results after cancellation, and misleading unsafe error detail.

A malicious fixture begins from a valid baseline and changes one identified property where possible. Multi-fault fixtures are additional robustness cases and must not obscure which requirement failed.

### Compatibility fixtures and version matrix

The suite publishes transcripts for every supported client/server protocol-version pair, profile pair, capability combination, and schema/extension boundary:

| Client claim | Server claim | Required suite outcome |
| --- | --- |
| Same supported version/profile | Compatible capabilities | Complete applicable suite |
| Overlapping versions | Negotiated version is used on every later operation | Complete suite at selected version |
| No version overlap | Stable incompatibility before governed operation | No authority or durable state created |
| Required capability/profile absent | Stable unsupported/incompatible result | No silent downgrade |
| Optional registered extension unknown | Behavior follows the extension/evolution rule | Core behavior remains valid |
| Required extension unknown | Stable incompatibility | No partial operation |
| Supported old/new pair | Outcome follows published compatibility ledger | No undocumented coercion |

Before 1.0, the matrix must include every supported release, the immediately preceding supported draft if claimed, official Client against independent Agent, independent Client against official Agent, and both Clients against the same Trust fixtures. Unsupported pairs remain explicit and do not count as failures.

## Test case and result format

Each case manifest is immutable for a suite release and includes:

```json
{
  "caseId": "GB-CONF-TASK-0042",
  "suiteVersion": "1.0.0",
  "protocolVersions": ["1.0"],
  "profiles": ["governed"],
  "roles": ["agent"],
  "requirements": ["GB-TASK-021", "GB-ERR-014"],
  "assets": [{"id": "task-cancel-race-01", "sha256": "<digest>"}],
  "initialState": "running",
  "stimulus": "cancel-and-complete-concurrently",
  "expected": "one-normative-winner"
}
```

Each execution emits one append-only result:

```json
{
  "caseId": "GB-CONF-TASK-0042",
  "suiteVersion": "1.0.0",
  "protocolVersion": "1.0",
  "profile": "governed",
  "role": "agent",
  "implementation": {"name": "<name>", "version": "<version>", "artifactDigest": "<digest>"},
  "status": "PASS",
  "durationMs": 0,
  "observations": [{"kind": "response", "sha256": "<digest>", "safeSummary": "<redacted>"}],
  "environment": {"adapterVersion": "<version>", "fixtureSetDigest": "<digest>"}
}
```

Allowed statuses are:

- `PASS`: every assertion completed and matched.
- `FAIL`: the IUT produced a contrary observable result.
- `SKIP`: the case is inapplicable to an unclaimed optional profile/capability, with a machine-readable reason.
- `SUITE_ERROR`: the case or harness could not make a reliable determination.

Raw secrets, authentication material, Install Grants, Approval tokens, private keys, and disclosed payloads must not appear in reports. Evidence is limited to reviewed safe summaries and hashes of bounded canonical captures. Reports must record suite, fixture-set, adapter, IUT artifact, protocol version, profile, platform, and configuration digests so results are reproducible.

## Minimum PASS criteria

An implementation may claim conformance only for a named role, protocol version, profile, transport, and declared optional-feature set. For that claim:

1. Every mandatory applicable case is `PASS`.
2. No applicable case is `FAIL`, `SKIP`, or `SUITE_ERROR`.
3. All published positive schemas/vectors are accepted and all required negative schemas/vectors are rejected with the normative error.
4. Every claimed state machine achieves legal-edge, illegal-trigger, concurrency, persistence, and restart coverage required by the suite.
5. Every claimed supported version pair passes its compatibility fixtures.
6. Production profiles pass durable storage, anti-rollback, restart, security-transport, and failure-atomicity cases.
7. Report redaction tests show no protected values.
8. The IUT artifact and complete result are reproducibly identified and independently reviewable.

A partial run may be reported, but it must say `NOT A CONFORMANCE CLAIM`. Passing unit tests, the current JavaScript black-box verifier, or official-to-official interoperability cannot substitute for this result.

## Preventing a hidden TypeScript oracle

The following controls are mandatory:

- Specification requirement IDs and byte-level vectors are reviewed before executable case code.
- Expected fixtures are hand-reviewed or produced by at least two independent implementations; they are never recorded from the official SDK as golden output.
- The runner and expected-result/oracle dependency graph contain no official implementation helper or runtime package used to validate, canonicalize, sign, verify, calculate transitions, or select expected behavior.
- The runner may start or contact an official TypeScript IUT only through the same published process-adapter or wire contract used for an independent IUT; every subprocess or network exchange is part of that standardized boundary.
- A process adapter may import the public package that is itself the IUT, but may not import unrelated official packages to calculate or validate expected behavior. Dependency-lock review and a build-time forbidden-import scan enforce this adapter-specific allowlist.
- Neither runner nor adapter may make hidden implementation-specific oracle calls, use private endpoints, or branch expected results by implementation identity.
- The same immutable manifest and assets run against official and independent IUTs. There are no implementation-name branches, waivers, or “compatibility modes.”
- Test authors can distinguish suite defects from IUT defects only through the published authority hierarchy and protocol governance.
- A language other than TypeScript independently validates schemas/vectors and reproduces the case-selection/result logic.
- Differential testing may reveal ambiguity, but majority or official behavior never decides correctness; ambiguity returns to specification governance.
- Conformance releases are versioned independently from SDK releases and signed with an auditable asset manifest.

The existing verifier in `scripts/verifyGhostBridgeBlackBoxConformance.mjs:9-38` imports the official protocol-core, Native Client, and Trust packages, and `packages/ghostbridge-conformance/src/index.js:3-18,74-178` exercises the official Client. Those tools remain useful implementation regression evidence, but cannot be the future independent conformance authority.

## Delivery gates

This architecture can be implemented only after Phase 15D.1 fixes the normative lifecycle, wire behavior, state machines, compatibility rules, cryptographic inputs, and errors. Phase 15D.2 must then:

1. publish canonical schemas and machine definitions;
2. review deterministic and malicious fixture inventories;
3. obtain independent reproduction of cryptographic vectors;
4. implement the language-neutral adapter and at least two independent runners/validators;
5. run the same suite against official and independent IUTs;
6. publish safe, reproducible reports and resolve every suite ambiguity.

Until those gates pass, Ghost Bridge has implementation tests—not production-protocol conformance evidence.
