# Phase 15D.0 external reference register

## Scope and provenance

This register records only the four reference observations supplied to Phase 15D.0. Each entry is a **Verified external reference observation supplied by independent review.**

Codex did not directly inspect any external MCP repository. Repository names and paths below identify the supplied observations; they do not represent local checkout, network access, or first-hand inspection. No inference about unlisted MCP files or behavior is made.

The comparison is limited to reusable protocol-engineering practices. It does not import MCP product semantics, authority, Trust, lifecycle, transport, or package design into Ghost Bridge. Ghost Bridge remains a distinct protocol whose authority continues to flow through trusted installation, Install Grants, scoped Connections, governed Invocations, exact-action Approvals, durable Tasks, signed Receipts, Trust verification, and revocation.

## Reference A — lifecycle and negotiation

- **Repository:** `modelcontextprotocol/modelcontextprotocol`
- **File:** `docs/specification/2025-11-25/basic/lifecycle.mdx`
- **Provenance:** Verified external reference observation supplied by independent review.

| Observation | Why it matters to protocol independence | Ghost Bridge equivalent | Limitation of comparison |
| --- | --- | --- | --- |
| The protocol defines separate initialization, operation, and shutdown phases. | A non-JavaScript implementer needs to know when authority and negotiated state begin and end. | `protocol/README.md:50-53` lists a lifecycle; `packages/ghostbridge-native-client/src/index.js:192-207,992-998` implements discovery and local close; `packages/ghostbridge-native-agent/src/index.js:1159-1187` implements server listen/close. | The supplied observation does not establish that Ghost Bridge should copy MCP phase names or shutdown mechanics. |
| Initialization must be the first interaction. | A deterministic first-message rule prevents peers from using features before version, capability, and trust state are established. | Native Client methods call `ensureDiscovery`; for example `getPassport` and `invoke` do so at `packages/ghostbridge-native-client/src/index.js:414-417,801-809`. No Ghost Bridge document normatively makes discovery or initialization the first interaction. | Ghost Bridge installation and Connection authority require their own lifecycle, not an MCP initialization clone. |
| Protocol version compatibility and capabilities are exchanged explicitly. | Independent implementations need a wire-visible compatibility decision instead of an SDK-local assumption. | Discovery advertises versions/features in `protocol/schemas/0.1-draft/discovery.schema.json:7-33`; profile and authentication compatibility is calculated by `checkCompatibility` in `packages/ghostbridge-protocol-core/src/index.js:476-575`. | Ghost Bridge capabilities include governed authority and installation semantics that are not described by the supplied reference. |
| The peer must respect the negotiated version and capabilities. | Negotiation has no value unless every later message is constrained by its result. | `validateProtocolVersion` and `negotiateVersion` exist at `packages/ghostbridge-protocol-core/src/index.js:205-255`; the client nevertheless sends the hard-coded draft version at `packages/ghostbridge-native-client/src/index.js:1017-1033`. | The observation supplies a practice, not Ghost Bridge downgrade or profile policy. |
| Normative MUST, MUST NOT, SHOULD, SHOULD NOT and MAY language is used. | Standards language lets independent teams distinguish required behavior from guidance. | `protocol/specification/0.1-draft/overview.md:22-23` declares ordinary standards meanings, but most topic files use descriptive prose and few explicit requirements. | This does not authorize importing any MCP requirement into Ghost Bridge. |

## Reference B — durable Tasks

- **Repository:** `modelcontextprotocol/modelcontextprotocol`
- **File:** `docs/specification/2025-11-25/basic/utilities/tasks.mdx`
- **Provenance:** Verified external reference observation supplied by independent review.

| Observation | Why it matters to protocol independence | Ghost Bridge equivalent | Limitation of comparison |
| --- | --- | --- | --- |
| Tasks are durable state machines. | Durable work cannot be interoperable if state, persistence, and terminality are SDK-private. | Ghost Bridge names states in `protocol/specification/0.1-draft/tasks.md:3-5`; adjacency is only in `TASK_TRANSITIONS` at `packages/ghostbridge-protocol-core/src/index.js:1291-1304`; production durable stores are enforced at `packages/ghostbridge-native-agent/src/index.js:89-125`. | Ghost Bridge Task states and governed Receipt coupling remain Ghost Bridge-specific. |
| Task support is capability-negotiated. | A client must not poll or cancel a peer that did not advertise Task support. | Discovery has `features.tasks` in `protocol/schemas/0.1-draft/discovery.schema.json:13-23`; capability contracts declare async/cancellation support at `protocol/schemas/0.1-draft/capability.schema.json:22-24`. | The supplied reference does not determine Ghost Bridge profile or capability semantics. |
| Unsupported Task behavior must not be assumed. | Safe degradation requires an explicit unsupported path. | `checkCompatibility` rejects required Task support at `packages/ghostbridge-protocol-core/src/index.js:550-555`, but client Task methods do not normatively define behavior for an unsupported peer. | This is a reusable negotiation lesson only. |
| Task creation is distinct from Task polling and result retrieval. | Separate operations permit durable asynchronous execution across runtimes. | Invocation returns a Task; polling and Receipt retrieval are separate client methods at `packages/ghostbridge-native-client/src/index.js:742-891`. The HTTP contract is only in JavaScript routes at `packages/ghostbridge-native-agent/src/index.js:2837-2867`. | Ghost Bridge uses signed Receipts and Connection authority, which the observation does not address. |
| Task IDs are receiver-generated. | Collision ownership and correlation need one normative allocator. | Native Agent generates `task_${crypto.randomUUID()}` at `packages/ghostbridge-native-agent/src/index.js:2143-2148`; no normative text assigns ID generation to the receiver. | The exact Ghost Bridge ID syntax must be decided independently. |
| Polling, terminal states, and cancellation have explicit protocol semantics. | Clients in different languages otherwise disagree about completion and legal cancellation. | Polling/backoff and terminal detection are JavaScript-only at `packages/ghostbridge-native-client/src/index.js:834-875,1388-1406`; cancellation rules are JavaScript-only at `packages/ghostbridge-native-agent/src/index.js:1028-1080`. | The supplied practice does not select Ghost Bridge states or cancellation guarantees. |
| Result retrieval has explicit protocol semantics. | A Task and its result/Receipt need an unambiguous binding. | The client derives a Receipt from `task.receiptReference` at `packages/ghostbridge-native-client/src/index.js:823-831`; runtime binding checks are at `packages/ghostbridge-native-agent/src/index.js:2369-2401`. No result message schema exists. | Ghost Bridge may define result retrieval around signed Receipts rather than copy another protocol. |

## Reference C — transport contract

- **Repository:** `modelcontextprotocol/modelcontextprotocol`
- **File:** `docs/specification/draft/basic/transports/streamable-http.mdx`
- **Provenance:** Verified external reference observation supplied by independent review.

| Observation | Why it matters to protocol independence | Ghost Bridge equivalent | Limitation of comparison |
| --- | --- | --- | --- |
| Transport behavior is specified independently from higher-level feature semantics. | Independent implementations can replace HTTP without changing installation, authority, or Task meaning. | Ghost Bridge has transport code in `packages/ghostbridge-native-client/src/index.js:1148-1306` and `packages/ghostbridge-trust/src/nodeTransport.js`, but no normative transport document. | No MCP transport framing or runtime dependency is proposed. |
| HTTP method, content type, headers, and response framing are explicit. | Wire compatibility cannot depend on reading the official HTTP handler. | Methods/routes are only in `packages/ghostbridge-native-agent/src/index.js:2720-2929`; client headers/content type are only in `packages/ghostbridge-native-client/src/index.js:1000-1075`. | Ghost Bridge must define its own resources and envelopes. |
| Transport security requirements are normative. | SSRF, redirect, TLS, and size behavior must match across clients. | Issuer guidance exists in `protocol/specification/0.1-draft/issuer-discovery.md:5-9`; enforcement exists in `packages/ghostbridge-trust/src/nodeTransport.js:92-188`. General Agent HTTP transport is not specified. | The supplied observation does not confer MCP security policy on Ghost Bridge. |
| Request-scoped streaming and cancellation behavior are explicitly described. | A cancelled request needs clear effects on the underlying Task and transport stream. | Client abort and Agent Task cancellation are implemented separately at `packages/ghostbridge-native-client/src/index.js:1000-1106` and `packages/ghostbridge-native-agent/src/index.js:1028-1080`; their relationship is not normative. | Ghost Bridge may choose no streaming in 1.0, but must say so. |
| Backward compatibility changes are documented by protocol version. | Peers need to know which wire behavior applies after evolution. | `protocol/specification/0.1-draft/versioning.md:3-9` requires a new version for breaking wire changes but gives no compatibility matrix or change history. | The external version format and compatibility policy are not adopted. |

## Reference D — SDK/specification separation

- **Repository:** `modelcontextprotocol/typescript-sdk`
- **File:** `README.md`
- **Provenance:** Verified external reference observation supplied by independent review.

| Observation | Why it matters to protocol independence | Ghost Bridge equivalent | Limitation of comparison |
| --- | --- | --- | --- |
| Client and server libraries are separate published packages. | Separate role packages and release artifacts make implementation boundaries testable. | `@ghostbridge/native-client` and `@ghostbridge/native-agent` are separate workspaces, but both package manifests are `private: true`, `UNLICENSED`, and unpublished. | This does not prescribe MCP package APIs or naming. |
| Runtime/framework middleware is intentionally thin. | Middleware must not become a second, hidden protocol definition. | Native Agent HTTP dispatch and protocol business logic share `packages/ghostbridge-native-agent/src/index.js`; Platform policy lives in `backend/src/services/platformNativeClient.service.js`. | Ghost Bridge may expose convenience middleware, but protocol semantics must remain specification-owned. |
| Middleware must not introduce protocol business logic. | Two middleware stacks must not produce different approval, Task, or error semantics. | `handleHttp` maps routes/statuses at `packages/ghostbridge-native-agent/src/index.js:2720-2970`; the Platform adapter adds binding, authorization, and error translation at `backend/src/services/platformNativeClient.service.js:24-88,420-944`. The distinction between protocol and Platform policy is not fully normative. | Platform governance may legitimately be stricter; it must be labeled as Platform policy. |
| Runnable client/server examples are maintained separately. | Examples help implementers without becoming the specification. | Client and Agent examples exist under `protocol/examples/typescript-sdk`, while CodeForge/FlowDesk fixtures import the official JavaScript packages. They are examples, not an independent implementation. | No claim is made about the external examples beyond the supplied observation. |
| Versioned SDK documentation and migration guidance exist. | SDK consumers need support windows independent of wire-version rules. | Package versions are `0.1.0-draft`; `protocol/specification/0.1-draft/versioning.md` covers only a minimal wire rule. There is no SDK migration or support policy. | Ghost Bridge should define its own lifecycle and release cadence. |
| The SDK is described as an implementation of the specification, not as the specification itself. | This is the central guard against the TypeScript implementation becoming the hidden oracle. | `protocol/README.md:10-12` says the Platform is one implementation, but `packages/ghostbridge-protocol-core/src/index.js`, Native packages, Trust code, and tests currently contain essential semantics absent from the prose. | The correction is specification completeness, not adopting MCP semantics or dependencies. |

## Comparison boundary

The observations support only these reusable conclusions:

1. Ghost Bridge needs normative lifecycle, version/capability, Task, transport, compatibility, and role contracts.
2. Schemas, fixtures, and black-box tests must be specification-derived and language-neutral.
3. Official TypeScript packages and the Platform must be implementations and policy consumers, never the normative oracle.
4. None of these practices changes Ghost Bridge Connection authority into direct Agent-to-Agent authority or introduces MCP as a wrapper, dependency, or trust source.

