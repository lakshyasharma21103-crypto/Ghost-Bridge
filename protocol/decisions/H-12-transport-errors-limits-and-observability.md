# H-12 — Transport, errors, limits, and observability

## Decision ID

`H-12`

## Status

**ACCEPTED**

Rudra explicitly accepted Option B — Strict portable HTTP profile with
semantic/HTTP separation — together with the complete corrected Option B
semantics, all 25 human dispositions, zero redirects, HTTP-V1, TLS-B, NET-B,
all recorded residual risks, compatibility and migration impact, privacy
consequences, threat analysis, and security impact. Option B now has H-12
protocol-governance decision authority.

## Date prepared

2026-08-10

## Approval record

- **Approval date:** 2026-08-10
- **Approver:** Rudra
- **Approved option:** Option B — Strict portable HTTP profile with
  semantic/HTTP separation
- **Approval source:** `H-12-human-approval-rudra-2026-08-10.txt`
- **Verified SHA-256:**
  `4D5B771935555A0DF83ECADC07FBE854434E36C2E8568FCB9233489EA193403E`

## Governance boundary

This is an accepted protocol-governance decision. It is not a normative HTTP
specification, schema, OpenAPI document, executable state machine, fixture,
vector, conformance case, implementation instruction, migration authorization,
deployment instruction, publication, release, or Protocol 1.0 claim.

The selected Option B paths, status mappings, limits, algorithms, and subchoices
state accepted H-12 governance semantics that separately authorized future work
must consume. They do not directly create normative or executable requirements.
The unselected alternatives remain decision rationale and have no decision
authority.

This record:

- changes no accepted H-01 through H-11 decision;
- closes no `GB-*` gap;
- changes no Core, Trust, Issuer, Agent, Client, Platform, SDK, middleware,
  route, storage, test, or deployment behavior;
- creates no wire schema or executable artifact;
- records explicit human acceptance from the identified durable source; and
- resolves neither H-13 nor H-14.

## Accepted decision scope

H-12 establishes the accepted governance choice for the HTTP
resource/version/status/media-type contract,
authentication and security-sensitive header placement, redirect policy,
TLS/DNS/network-target rules, streaming support, transport abort versus H-09
Task cancellation, retry treatment, compressed/decompressed and other resource
limits, timeout behavior, error identity/precedence/detail/retry classes, cache
behavior, intermediary behavior, and the minimum safe observability floor.

H-12 owns wire transport and public error/observability representation. It does
not own the authority or state semantics represented on that wire. In
particular, it cannot turn transport success into authority, reinterpret an
H-03 release, add a fallback negotiation path, weaken H-05 authentication,
change H-06/H-08/H-09 retry identity or atomicity, redefine H-10 canonical
bytes, or turn an H-11 denial or indeterminate result into success.

## Affected gaps and Phase work

| Kind | Identifiers | H-12 relationship |
| --- | --- | --- |
| Correlation, deadlines, cancellation, idempotency | `GB-014`–`GB-017` | Wire correlation, timeout/abort distinctions, explicit cancellation transport, and retry representation are incomplete or divergent |
| Error and transport contract | `GB-034`–`GB-041` | Error vocabulary, status/detail/precedence, transport abstraction, resources, redirects, limits, and media handling lack one governed contract |
| Security requirements | `GB-047` | Transport and observability security properties remain prose or implementation policy rather than accepted requirements |
| Observability | `GB-049` | No protocol-wide safe logging, metrics, and tracing floor exists |
| Requirements work | `D1-03`, `D1-07` | May consume an accepted H-12 decision only in separately authorized normative work |
| Schema/machine/case work | `D2-01`, `D2-04`, `D2-05` | May encode later approved requirements; not authorized here |
| Implementation and review | `E-02`, `P1-03` | Implementation and independent security review remain separate gates |

Every affected gap remains open.

## Accepted-decision dependency and conflict ledger

Every complete H-01 through H-11 record was inspected. Their accepted options,
qualifications, risks, and deferred boundaries are binding inputs.

| Accepted record | Binding H-12 input | Conflict H-12 must not introduce |
| --- | --- | --- |
| H-01 | Discovery and preview are non-authoritative; authority starts only at the accepted durable Connection boundary; restart uses durable history | Treating a 2xx response, cache entry, redirect, or reconstructed transport session as authority |
| H-02 | Authentication, Connection authority, Trust, authorization, policy, Approval, and evidence are distinct; the Agent is the final enforcement point | Treating authenticated HTTP, TLS, Trust evidence, or a gateway response as authorization; creating Agent-to-Agent authority |
| H-03 | Exact release identity and historical meaning are immutable; compatibility is explicit and non-transitive; downgrade is prohibited | Silent path/media/header fallback, aliasing one release to another, or interpreting historical objects under the current release |
| H-04 | Selection is a monotonic intersection bound to the Connection; unknown required items fail | Using `Accept`, redirects, or HTTP fallback as a second negotiation mechanism or enabling an unselected feature |
| H-05 | Authentication binds exact profile, principal, issuer, audience/target, tenant, and purpose; governed remote use requires current proof | Forwarding credentials across origins, ambient-cookie authority, weak-profile fallback, or accepting proof for the proxy instead of the bound target |
| H-06 | Install Grant redemption is one durable transaction with exact-intent replay convergence and non-disclosing conflict behavior | Retry that creates a second Connection, exposes whether a secret was used, or changes the accepted intent |
| H-07 | Connection lifecycle and scoped authority are explicit; current evidence is required; transport failure is not a lifecycle transition | Reviving closed/revoked/replaced authority, widening scope, or treating reachability as active authority |
| H-08 | Approval is exact-action, single-use, and atomically consumed only at the accepted final-acceptance point | Consuming Approval during HTTP parsing, duplicating consumption on retry, or broadening action identity |
| H-09 | Task/Result/cancellation/retention semantics, immutable terminal history, retry identity, and cancellation race are fixed | Mapping disconnect/abort to cancellation, adding Task states, re-running work after ambiguity, or treating a polling result as a transition |
| H-10 | Canonical semantic bytes, domains, profiles, key purposes, and verification order are fixed | Signing compressed/chunk framing, changing canonical bytes through content encoding, or introducing verification fallback |
| H-11 | Current freshness/revocation is fail-closed; durable floors resist rollback; historical classification is distinct and non-authoritative | Serving stale cached evidence as current authority, collapsing indeterminate history into success, or exposing sensitive Trust causes publicly |

## Repository evidence inspected

The audit covered:

- `docs/protocol/phase-15d-plan.md`, the normative gap analysis, and the
  conformance architecture;
- this decision register and every accepted H-01 through H-11 record;
- protocol threat-model material and the Phase 15D.0 external-reference
  register/benchmark;
- relevant 0.1-draft prose for transport, discovery, authentication,
  authorization, installation, invocation, Approval, Task, Receipt, error,
  replay, security, Trust, and revocation;
- relevant 0.1-draft schemas for common values, discovery, errors, Install
  Grant, Connection-related exchanges, Invocation, Approval, Task, Receipt,
  Passport, issuer metadata, keys, and revocation;
- Protocol Core parsing, serialization, limits, error construction, and
  redaction;
- Native Client request construction, URL handling, bounded response reading,
  redirect/content-type checks, timeouts, abort mapping, retry classification,
  polling, and cancellation;
- Native Agent routes, authentication/authorization order, body parsing,
  status mapping, lifecycle/idempotency/cancellation handling, audit logging,
  metrics, and server behavior;
- Trust and Issuer URL validation, DNS resolution/address pinning, TLS,
  redirect/media/size/time limits, strict JSON handling, cache/revocation
  behavior, and public errors;
- Platform middleware, platform-native routes, generic safe-fetch behavior,
  compression/CORS/error/logging policy, and external-agent adapters;
- tests covering network safety, redirect behavior, body limits, media types,
  abort/timeout/cancellation, retry/idempotency, authentication, logging,
  redaction, malformed input, and error/status behavior; and
- non-governing HTTP context from [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)
  (semantics), [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html)
  (caching), [RFC 9112](https://www.rfc-editor.org/rfc/rfc9112.html)
  (HTTP/1.1 framing), [RFC 9205](https://www.rfc-editor.org/rfc/rfc9205.html)
  (HTTP application design),
  [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) (problem details),
  and [RFC 7239](https://www.rfc-editor.org/rfc/rfc7239.html) (`Forwarded`).

Implementation, tests, draft prose, schemas, Platform policy, and external
standards are evidence only. None selected an H-12 option.

## Repository evidence ledger

### HTTP resources, versions, methods, and media

| Evidence area | Observed behavior | Governance significance |
| --- | --- | --- |
| 0.1 discovery | `GET /.well-known/ghostbridge`; discovery advertises versions, features, transports, message size, and endpoints | Bootstrap shape exists, but discovery remains non-authoritative under H-01 and advertised limits conflict with implementations |
| Native Agent | Unversioned `/ghostbridge/...` resources for Passport, capabilities, grant resolution/redemption, invocations, Tasks, Receipts, Approval decisions, and revocations | A useful operation inventory, not a governed release/path model |
| Native Agent methods | `GET` for discovery/read resources; `POST` for resolution, redemption, invocation, Approval decision, cancellation, and revocation | Several action/query conventions are implementation-specific; cancellation uses a query action and empty body |
| Native Client | Hard-codes `ghostbridge/0.1-draft`; generally sends `Accept` and `Content-Type: application/json`, including bodyless reads | Release placement and correct media semantics are unresolved |
| Native Agent media | Emits JSON UTF-8 but does not consistently require request `Content-Type` | Client and server enforcement are asymmetric |
| Trust transport | Per-resource content-type allowlists; issuer/keys/revocation URLs are metadata-driven and constrained by Trust code | Stronger but separate behavior; public Trust resources need H-11-aware cache/freshness treatment |
| Platform-native API | `/api/v1/platform-native/...` routes and a Platform error wrapper | This is a Platform integration surface, not the Native protocol wire contract |
| External-agent API | Separate product-facing Bearer/CORS/rate-limit/error conventions | Product policy only; it cannot decide H-12 |
| Release schemas/prose | Historical `ghostbridge/0.1-draft` grammar conflicts with accepted H-03 exact epoch/revision identity | Future transport must represent `ghostbridge/e<epoch>.r<revision>...` without relabeling legacy objects |

The exact Native Agent inventory observed is:

| Existing method/path | Existing purpose or behavior |
| --- | --- |
| `GET /.well-known/ghostbridge` | Discovery |
| `GET /ghostbridge/passport` | Agent Passport |
| `GET /ghostbridge/capabilities` | Capability collection |
| `GET /ghostbridge/capabilities/search` | Query-based capability search |
| `GET /ghostbridge/capabilities/{capabilityKey}` | Capability detail |
| `POST /ghostbridge/install-grants/resolve` | Non-authoritative Grant resolution/preview |
| `POST /ghostbridge/install-grants/redeem` | Grant redemption and Connection creation; secret in body |
| fixture-only legacy secret path | Optional legacy route can embed the Grant secret in the path |
| `POST /ghostbridge/invocations` | Invocation/Task acceptance |
| `GET /ghostbridge/tasks/{taskId}` | Task read |
| `POST /ghostbridge/tasks/{taskId}?action=cancel` | Explicit cancellation request with an empty JSON object |
| `GET /ghostbridge/receipts/{receiptId}` | Receipt read |
| `POST /ghostbridge/approvals/{challengeId}/decisions` | Approval decision |
| `GET`/`POST /ghostbridge/revocations/{subjectType}/{subjectReference}` | Revocation read/write, including Connection subjects |

Discovery advertises absolute endpoint templates generated from a configured
public base in production, but fixture handling can construct origin context
from the incoming host. There is no path-level release component. The Client
uses advertised templates and appends the current cancellation query action.

The Platform integration separately mounts only a public
`GET /.well-known/ghostbridge` Native discovery document (currently advertising
no implemented public operation endpoints), diagnostic `/api/v1/native/status`
and `/metrics`, and authenticated product routes under
`/api/v1/platform-native`: `POST /discovery`, `/install`, `/invoke`,
`/tasks/status`, `/tasks/result`, `/tasks/cancel`, `/approvals/continue`,
`/receipts/get`, `/receipts/verify`, and `/revocations/check`. Those routes all
use POST as an adapter convention and are not a second Native protocol
inventory. Issuer evidence uses `GET /.well-known/ghostbridge-issuer` plus
metadata-declared same-origin JWKS and revocation resources, commonly
`/.well-known/ghostbridge-jwks.json` and
`/.well-known/ghostbridge-revocations.json`.

### Status and error behavior

| Evidence area | Observed behavior | Divergence or missing semantic |
| --- | --- | --- |
| Native Agent | Success is usually 200; errors commonly map auth 401, authorization 403, not found 404, conflicts/Approval 409, persistence 503, internal 500, remainder 400 | No complete operation/status matrix, limited retry signaling, and multiple semantic causes share ad hoc statuses |
| Platform-native | Uses `{success:false,error:{...}}`; maps some Connection and unsupported cases differently; install can return 201 | Public shape/status differ from Native Agent |
| Core error | Broad uppercase code list, safe message, retry flag/delay, request/trace IDs, and redacted details | Codes and per-code details/precedence are not closed or governed; field policy intersects H-13 |
| Trust error | Separate JSON shape without the complete Core envelope | Trust retrieval failures are not represented uniformly |
| 0.1 schema | Closed outer error object but open-ish code/details contents and historical protocol fields | Schema existence does not settle taxonomy, safe details, or H-03 representation |
| Tests | Assert present implementation mappings and safe-message behavior | Evidence of compatibility cost, not approval |

No source defines a deterministic internal failure ordering separately from a
privacy-collapsed public error. HTTP status alone does not encode H-09 terminal
state or H-11 historical classification safely.

### Authentication and security-sensitive headers

| Evidence area | Observed behavior | Governance significance |
| --- | --- | --- |
| Native Client | Allows a narrow header set including `Authorization`, release, idempotency, trace, and request IDs; rejects CR/LF in values; disables ambient fetch credentials | Useful safety evidence, but exact header roles and duplicate behavior are unresolved |
| Native Agent | Passes incoming headers to an application auth handler; does not establish one protocol header normalization/duplication rule | Parser/middleware differences could affect authentication identity |
| Platform-native | Uses `X-Partner-Api-Key` for its own API | Platform-only credential placement, not Native protocol law |
| Install Grant | Modern Agent route places the secret in a body; an optional fixture legacy route can place it in a path | The legacy form would leak through URL infrastructure and is unsuitable as a governed baseline |
| Proxies/CORS | Platform trusts deployment middleware and enables credentialed CORS in some surfaces; Native transport has no governed proxy/browser model | Untrusted forwarding, cookies, and browser ambient credentials remain unsafe unless explicitly excluded |

### Redirect, TLS, DNS, SSRF, and proxies

| Evidence area | Observed behavior | Divergence or missing semantic |
| --- | --- | --- |
| Native fetch client | Manual redirect mode and rejection of redirects | Strict behavior, but not yet protocol law |
| Trust Node transport | Zero redirects; remote HTTPS; explicit loopback fixture HTTP; normal certificate/hostname validation; DNS resolves all answers, rejects any non-public answer, connects to a pinned result | Strong implementation evidence for a portable fail-closed baseline |
| Platform safe fetch | Controlled redirects up to three, per-hop re-resolution/pinning, no HTTPS downgrade, credential stripping on cross-origin changes, and restrictions on unsafe cross-origin methods | Materially different Platform-only policy |
| URL validation | Trust rejects userinfo, query/fragment by default, unsafe ports/addresses, and private/special-use targets; Agent endpoint normalization is simpler | Network-target invariants are inconsistent by code path |
| TLS ownership | No repository-wide exact minimum TLS version/cipher/pinning policy; server-side TLS can be outside the Native Agent process | H-12 should set authenticated-HTTPS/no-insecure-fallback rules; release/deployment details belong to H-14 |
| Forwarding | Platform middleware can rely on trusted deployment proxy configuration; no protocol rule makes `Forwarded` or `X-Forwarded-*` authoritative | Untrusted proxy headers must not define the H-05 target, origin, principal, or tenant |

### Streaming, abort, cancellation, retries, and idempotency

| Evidence area | Observed behavior | Divergence or missing semantic |
| --- | --- | --- |
| Response reading | Native/Trust clients stream bytes only to enforce an aggregate bound; no application event-stream protocol exists | HTTP transfer chunking is present but is not H-09 streaming semantics |
| Native Client abort | A caller abort may be mapped to `TASK_CANCELLED`; polling abort has similar treatment | Conflicts with accepted H-09: stopping a wait is not durable cancellation |
| Native Agent disconnect | No general rule turns a disconnected request/failed response write into Task cancellation | Closer to H-09, but post-acceptance ambiguity is not fully represented |
| Explicit cancellation | `POST /tasks/{id}?action=cancel` produces an Agent cancellation request | It proves a separate request exists, but path/body/status and convergence are unresolved |
| Client retry classifier | Retries selected transient codes only for safe methods or strong idempotency evidence; does not itself establish all retry behavior | Sound direction, incomplete across every operation/failure/status |
| Grant/Invocation/Approval | Implementation has multiple idempotency and fingerprint mechanisms | Accepted H-06/H-08/H-09 semantics govern identity; transport must only carry and consume them |
| Platform adapters | Have product-specific provider retries, AbortController deadlines, and backoff | They are upstream/product policy, not native retry law |

### Limits, parsing, compression, and timeouts

| Evidence area | Observed behavior | Divergence or missing semantic |
| --- | --- | --- |
| Protocol Core | Default 256 KiB serialized message, 65,536-character string, 256 array entries, depth 16; prechecks bytes before `JSON.parse` | Bounded, but ordinary `JSON.parse` accepts duplicate keys and does not by itself establish cross-runtime character/member accounting |
| Native Agent | Streams and caps raw request bodies at about 256 KiB; uses ordinary JSON parsing; does not consistently reject request content encoding/media type | No governed compressed-versus-decompressed calculation or strict duplicate-key rule |
| Trust | Resource-specific 32/64/128/256 KiB limits, depth 32, larger collection ceilings, strict UTF-8/duplicate-key parsing, and a five-second style network budget | Stronger parser with different numeric limits and semantics |
| Discovery schema | Advertises up to 16 MiB | Contradicts 256 KiB Core/Client bounds and cannot by itself guarantee interoperability |
| Platform middleware | Express JSON/urlencoded body parsing defaults around 1 MiB and application compression can be enabled | Requests may be decoded before application checks; wire behavior differs from Native Agent |
| Platform safe fetch | Often permits about 1 MiB and controlled decompressed response handling | Platform-only, and different from the Native Client 256 KiB cap |
| Headers | Client/Trust constrain individual supplied values near 4 KiB, but no common request-line, total header, field-count, or response-header profile exists | Leaves exhaustion and intermediary mismatch risk |
| Native Client | Default total-style request wait near 10 s, clamped approximately 50 ms–120 s; caller abort and timeout have different internal causes | No DNS/connect/TLS/write/first-byte/idle/overall partition |
| Trust | Roughly five-second total network timeout with Node socket behavior | Different profile and incomplete phase accounting |
| Agent/Platform | Application/handler/deadline/proxy timeouts are separate and sometimes surface 408/5xx | Transport timeouts can be confused with H-09 Task deadlines or execution outcomes |

Baseline request decompression is not consistently implemented or prohibited,
so neither compressed-byte limits nor decompressed-byte limits are portable.
No evidence supports parse-first acceptance: all future options must bound bytes
before allocation and parsing.

### Cache, logging, metrics, tracing, and sensitive data

| Evidence area | Observed behavior | Divergence or missing semantic |
| --- | --- | --- |
| Native Agent | Generally emits `Cache-Control: no-store` | Safe default, but not differentiated for discovery or H-11 public evidence |
| Platform discovery | Can emit a short public cache lifetime | Demonstrates useful discovery caching but cannot make cache authority |
| Trust | Maintains application-level verified caches and freshness/revocation state | H-11 semantics, not generic HTTP freshness, determine current authority |
| Core redaction | Redacts keys matching common secret-name patterns and bounds serialized details | Value-based secrets, control characters, identifier linkability, and nested cardinality are not comprehensively governed |
| Native Agent audit | Uses field allowlisting; structured metrics have coarse categories | Values are not uniformly truncated/control-sanitized; custom data can still create exposure/cardinality risk |
| Platform logs | Record method/path/status/duration and correlation/tenant-like fields with recursive redaction | Path/query and cross-tenant identifier policy differ by surface |
| Tracing | Client accepts common trace/request headers; no protocol-wide trust-boundary rule exists | Peer trace baggage can leak identity or join traces across forbidden scopes |
| Receipts and signed objects | Draft security prose excludes credentials, unrestricted I/O, prompts/reasoning/private policy from ordinary evidence | Signed or durable does not mean safe to place in logs or traces |

## Contradictions and missing semantics

The audit found the following decision-level conflicts:

1. Native redirects are rejected while Platform safe fetch can follow three;
   there is no governed per-hop credential/authority rule.
2. Discovery advertises sizes up to 16 MiB while Core and Native Client commonly
   cap at 256 KiB, Trust uses resource-specific bounds, and Platform middleware
   commonly permits about 1 MiB.
3. Native Client validates response media but Native Agent does not consistently
   validate request media or content encoding.
4. Core/Agent use ordinary JSON parsing while Trust rejects duplicate keys and
   invalid encodings more strictly.
5. Native Agent, Trust, Platform-native, and external-agent surfaces use
   different error envelopes and status mappings.
6. Current paths do not bind the accepted H-03 release, while current headers
   and schemas preserve the historical `ghostbridge/0.1-draft` identity.
7. Caller abort is sometimes reported as Task cancellation even though H-09
   expressly separates the two.
8. There is no common request-line/header count/header byte limit, timeout phase
   model, retry-after rule, malformed-framing rule, or public error precedence.
9. Compression can occur in Platform middleware without one protocol-level
   encoded/decompressed limit or H-10 separation statement.
10. Discovery and verified Trust caches have different semantics; generic HTTP
    caching is not integrated with H-11 durable freshness and anti-rollback.
11. Operational logging and audit logs use different redaction and identifier
    practices, and tracing baggage has no cross-tenant floor.
12. Browser/CORS behavior exists on Platform surfaces but the Native protocol
    has no accepted browser, cookie, Origin, or CSRF contract.

These are not findings that an implementation is necessarily defective. They
show why current behavior cannot be promoted to protocol law without a human
choice.

## Ownership ledger

| Topic | Owner and boundary |
| --- | --- |
| H-09 | Task states, terminal Result, cancellation intent/race, deadlines, retry identity, Receipt relationship, and retention semantics; H-12 only represents requests/results/failures on HTTP |
| H-10 | Semantic projection, canonical bytes, digests, signatures, proof profiles, domains, and verification order; H-12 owns transferred media/encoding/framing only |
| H-11 | Issuer chain, freshness, rollback floors, revocation, compromise, recovery, and historical classifications; H-12 owns retrieval, cache headers, and privacy-safe public representation only |
| H-12 | HTTP resources/methods/status/media, security headers, redirects, baseline network safety, bounded delivery, timeout/abort/retry representation, public errors, cache safety, and observability floor |
| H-13 | Schema openness, unknown fields/enums/messages, extension namespaces, and evolution; H-12 must not decide whether extra members are accepted |
| H-14 | Supported release windows, exact production support commitments, operational retention, deployment evidence, review gates, residual-risk acceptance, publication, release, and Protocol 1.0 graduation |
| D2/P1 | Schemas, state machines, fixtures/vectors/cases, and independent review after accepted decisions and normative requirements exist |

## Terminology and required non-equivalences

- **Transport success** means an HTTP exchange completed. It is not
  authentication, authorization, Connection authority, Task success, or Trust.
- **Transport failure** means no trustworthy complete Ghost Bridge response was
  obtained. It is not proof that a request did not commit.
- **Client wait abort** means the local caller stopped awaiting an exchange. It
  is not an H-09 cancellation intent.
- **HTTP transfer chunking** is byte delivery by HTTP. It is not an application
  event stream and does not add H-09 states.
- **HTTP freshness** is intermediary/cache metadata. It is not H-11 evidence
  freshness or rollback resistance.
- **Request/correlation/trace identifiers** are observability aids, never
  credentials, idempotency identity, principal identity, or authority.
- **HTTP status** classifies the exchange. The Ghost Bridge error identity and
  accepted semantic object remain authoritative for protocol handling.
- **Transferred bytes** include HTTP/content encoding. H-10 canonical semantic
  bytes are produced only by the accepted H-10 process after safe decoding and
  semantic validation.

## Decision dimensions

The human approval selected one coherent combination, not isolated defaults:

1. release-bound origin/path/media identity and operation resources;
2. status and protocol-error separation;
3. credential/header placement and authority binding;
4. redirects, TLS, DNS, proxies, and browser scope;
5. application streaming versus bounded request/response;
6. ambiguous failure, retry, idempotency, and explicit cancellation;
7. phase timeouts and body/header/parser/resource limits;
8. cache interaction with authority and H-11 freshness;
9. internal failure ordering versus deliberately collapsed public detail; and
10. minimum log, metric, trace, audit, identifier, and privacy controls.

## Materially distinct alternatives

### Option A — Minimal bounded HTTP request/response

Option A would keep conventional bounded JSON request/response exchanges,
unversioned operation paths close to 0.1-draft, `application/json`, a small
HTTP status set, no baseline streaming, zero redirects, HTTPS remote use, and a
single application error envelope. It would standardize the safety invariants
but delegate most exact paths, error codes, numeric limits, DNS rules, and
timeouts to each release/deployment profile.

Its strengths are low migration cost, broad runtime/proxy compatibility, and a
small implementation surface. Its weaknesses are weak independent-peer
predictability, likely rejection mismatches at limits/media/status boundaries,
and continuing dependence on profile discovery for security-sensitive
behavior. The sparse status vocabulary reduces status oracles but places more
weight on an envelope that H-13 has not yet governed. It is testable only after
many deferred profile choices are made.

### Option B — Strict portable HTTP profile

Option B would define a deterministic release-bound resource model, a dedicated
JSON media type, a closed status strategy plus logical protocol-error classes,
zero baseline redirects, authenticated HTTPS and origin binding, DNS
resolution/pinning and selected-policy address-scope enforcement with
unconditional class-E unsafe-target rejection, no baseline application
streaming or compression, an explicit mandatory-to-implement HTTP version,
exact portable limits/time budgets, H-06/H-08/H-09-aware retry instructions,
strict ambiguous-input rejection, no-store authority resources, and a
protocol-wide observability floor.

It costs the most near-term migration from all current surfaces, but it yields
the clearest behavior across JavaScript, native, proxy, and independent-peer
implementations. It minimizes credential, SSRF, smuggling, decompression,
duplicate-work, and error-oracle ambiguity. Optional future streaming or
compression would require an H-04-selected release/profile feature and later
H-13/D2 artifacts rather than being inferred from HTTP capabilities.

### Option C — Streaming-first HTTP profile

Option C would make a framed bidirectional or server event stream the baseline
for Invocation progress and Task/Result/Receipt delivery. It would require a
stream media type, frame boundaries and sequencing, per-frame/cumulative limits,
authentication lifetime and authority rechecks, backpressure, resume cursors,
duplicate-event rules, proxy idle handling, and precise partial-stream failure
semantics. Explicit cancellation would still be a separate H-09 intent; stream
closure could not mean cancellation.

This can reduce polling latency and overhead, but it greatly expands runtime,
proxy, load-balancer, browser, retry, replay, and test complexity. The repository
has no application streaming protocol, resume state, or framing schema. Making
it baseline now would invite accidental new Task states and ambiguous Result or
Receipt delivery. It is viable as a future explicitly negotiated feature, not
as the Phase 15D.1K baseline.

### Option D — Transport-abstract semantic core with HTTP as one binding

Option D would first define abstract request, response, failure, retry, and
resource operations independent of HTTP, then register HTTP as one mapping and
allow later transports. The abstraction is architecturally valuable and helps
keep H-09/H-10/H-11 semantics independent of status codes and framing.

As a standalone choice it does not satisfy the current H-12 requirement to
decide an interoperable HTTP wire contract. It also risks leaving precisely the
path/media/redirect/network/error questions blocking D1/D2 work unresolved.
The useful part of D should therefore be combined with B: preserve semantic
non-equivalences while selecting one complete HTTP binding.

## Comparative analysis

| Dimension | A: minimal | B: strict portable | C: streaming-first | D: abstract core alone |
| --- | --- | --- | --- | --- |
| Independent interoperability | Medium-low; many profile choices | High; deterministic baseline | Medium after substantial new framing work | Low until an HTTP binding is selected |
| Authority and credential safety | Good invariant floor, fewer exact controls | Strongest explicit origin, redirect, retry, and input controls | Harder across long-lived authorization changes | Strong abstraction but incomplete wire protection |
| Duplicate-work/cancellation safety | Depends on application envelope | Explicitly consumes H-06/H-08/H-09 | Resume/event replay adds ambiguity | Semantically clear but wire retries remain open |
| SSRF/redirect/DNS safety | Zero redirects but deployment-heavy DNS policy | Per-resolution validation, pinning, zero redirects, no downgrade | Same needs plus reconnect/resume endpoints | Binding-dependent |
| Smuggling/compression exhaustion | Bounded but many exact parser choices deferred | Strict ambiguity rejection; compression absent baseline | Adds frame and cumulative exhaustion surfaces | Binding-dependent |
| Browser/proxy/CDN compatibility | Broadest | Broad request/response compatibility; deliberately no ambient browser credentials | Variable buffering/idle timeout support | Not directly deployable |
| HTTP-version interoperability | Conventional HTTP but no mandatory shared version | One mandatory binding plus explicit optional-version rules | Stream transport/version coupling increases requirements | HTTP binding/version remains unresolved |
| 0.1-draft compatibility | Highest | Requires deliberate migration and dual release endpoints | Lowest | Indeterminate |
| Operational complexity | Low | Medium | High | Medium plus later binding cost |
| Deterministic conformance | Medium-low | High | High only after much larger asset set | Low for HTTP |
| Privacy/observability | Basic floor | Explicit low-cardinality, tenant-isolated floor | Long-lived stream metadata raises leakage | Binding-dependent |

### Cross-cutting failure analysis

- A and B avoid application stream partial-delivery and backpressure semantics;
  C must distinguish every partial frame, duplicated event, resume, and terminal
  object race without changing H-09.
- B has the lowest redirect and DNS-rebinding exposure because no redirect is
  followed and every new connection validates and pins its destination. A may
  be as safe only after deployment profiles independently make the same choices.
- A has lower migration cost but greater status, size, timeout, and parser
  mismatch risk. B deliberately spends compatibility to make those rejection
  boundaries testable.
- C is most sensitive to proxy buffering, idle termination, client disconnect,
  server crash, stale credentials, and high-cardinality per-stream telemetry.
- D best explains that transport is not state, but deferring HTTP would keep the
  requested wire-security decision open.
- No option may safely make a timeout or 5xx alone authorize retry of a
  state-changing operation. H-06/H-08/H-09 identity and authoritative reread
  remain required.

#### Detailed alternative security and operability comparison

| Required concern | A: minimal | B: strict portable | C: streaming-first | D: abstract core alone |
| --- | --- | --- | --- | --- |
| Deterministic behavior | Low until each profile supplies details | Exact wire boundaries and public precedence | Possible, but needs a much larger frame/resume contract | Semantics deterministic; HTTP behavior unresolved |
| Duplicate-work/retry safety | Depends on locally mapped envelopes | Exact semantic retry classes and reread | Reconnect/resume/event duplication adds paths | Abstract identity is safe; binding retry unknown |
| Cancellation safety | Separate request can be required, but representation varies | Explicit request; disconnect never cancels | Stream close temptation is high; still must use explicit intent | Semantic distinction preserved; no wire action chosen |
| Streaming/backpressure | None | None baseline; optional future feature | Baseline frame/queue/backpressure machinery | Deferred to binding |
| Browser/server compatibility | Broad conventional HTTP; browser auth still unsafe | Broad server HTTP; browser deliberately excluded | Browser/server streaming APIs and buffering diverge | No direct compatibility claim |
| Proxies/load balancers/CDNs | Few features but local limits/timeouts vary | Bounded messages fit; strict no-transform/no-store config needed | Buffering and idle termination are frequent hazards | Binding-dependent |
| SSRF/DNS rebinding | Deployment DNS policy can diverge | All-answer validation, selected NET-A/NET-B scope enforcement and class-E denial, pinning | Same controls on every reconnect/resume | Binding-dependent |
| Redirect exposure | Zero in the minimal candidate | Zero and exact failure semantics | Reconnect endpoints can act like redirects if poorly designed | Binding-dependent |
| TLS downgrade/MITM | HTTPS invariant, exact operational profile deferred | Exact origin/hostname/no-fallback floor | Same plus long-lived credential/evidence expiry | Binding-dependent |
| Credential leakage | No redirect, but header/profile details vary | One exact presentation, no ambient/cross-origin forwarding | Long-lived stream and reconnect increase exposure | Binding-dependent |
| Cross-tenant leakage | Basic redaction floor | Disclosure collapse plus tenant-scoped audit/trace | Event streams and resume cursors add linkage | Binding-dependent |
| Smuggling/desync | Parser safety required but exact rejection varies | Raw framing ambiguity rejected before semantics | Initial request plus stream gateways increase parser boundaries | Binding-dependent |
| Compression bombs | Boundedness required; exact encoded/decoded rules delegated | Compression absent baseline | Continuous compression contexts greatly complicate bounds | Binding-dependent |
| Oversized input/output | Bounded but independent peer limits can mismatch | Fixed sender maxima and matching mandatory receiver-support bounds | Per-frame and cumulative limits both required | Binding-dependent |
| Timeout ambiguity | Local budgets vary and failures mismatch | Shared phase model; semantic deadline separation | Idle, heartbeat, lifetime, and resume timeouts multiply ambiguity | Binding-dependent |
| Partial request/response | One-document ambiguity remains | Complete document plus authoritative recovery | Partial frames/events are normal and require resume proof | Binding-dependent |
| Client disconnect/server crash | Durable semantics still govern, but public handling varies | Exact non-equivalence and reread/convergence | Common and operationally harder for long streams | Correct abstract rule; no transport evidence path |
| Stale retry/revoked authority | Current evidence required but retry mapping varies | Current evidence on each request; no revival | Long stream needs recheck schedule and fencing | Binding-dependent |
| Status-code ambiguity | Intentionally small but under-specified | Fixed mapping plus stable protocol identity | Stream terminal frames compete with HTTP status | Entirely unresolved |
| Error-detail oracle | Sparse envelope can collapse detail | Registered allowlist, precedence, 404/403/503 collapse | Frame-level errors can reveal timing/state | Binding-dependent |
| Observability leakage | Minimum rule, local fields differ | Explicit never-log and low-cardinality floor | Per-frame/user event telemetry has larger leakage/cardinality | Binding-dependent |
| 0.1-draft compatibility | Highest | Deliberate path/media/limit migration | Very low | Does not itself change legacy behavior |
| Migration impact | Adapter and profile alignment | Parallel exact-release handlers and client/server changes | New client/server/proxy state machinery | Later binding migration still required |
| Operational complexity | Lowest | Moderate and reviewable | Highest | Moderate now plus unresolved later cost |
| Testability | Safety invariants testable; interop edges incomplete | Highest deterministic raw-wire coverage | Testable only with race/backpressure/resume/fault suite | Core semantics testable; HTTP conformance impossible |

## Accepted decision — Option B with semantic/HTTP separation

Rudra accepted Option B while retaining Option D’s strict separation between
accepted semantic state and its HTTP representation. The selected subchoices
are: **zero redirects**, **HTTP-V1**, **TLS-B**, **NET-B**, no baseline
application streaming, and no baseline compression. The accepted profile uses
bounded request/response JSON, HTTP/1.1 as the mandatory-to-implement binding,
exact release-bound paths/media, authenticated remote HTTPS, per-connection DNS
validation/address pinning, a small deterministic status mapping, and
privacy-collapsed public errors.

This best satisfies the current need for an independently implementable HTTP
contract and minimizes the attack surface around credentials, ambiguous retry,
SSRF, framing, decompression, and long-lived streams. It deliberately breaks
from conflicting 0.1-draft/Platform behavior rather than silently choosing one.

The remainder of this record describes the **accepted Option B semantics**. The
alternative sections are retained as rationale and are not selected.

## Accepted Option B semantics

### 1. HTTP origin, release, and resource model

#### Origin and release binding

- Governed remote resources use `https`. Plain `http` is confined to an
  explicitly enabled loopback-only test/development mode that cannot issue or
  exercise production/Governed authority.
- The exact scheme, host, and effective port form the origin. The origin is
  derived from authenticated configuration and the H-05/H-07 binding, never
  from `Host`, `Forwarded`, `X-Forwarded-*`, discovery, or a redirect alone.
- Bootstrap discovery remains `GET /.well-known/ghostbridge`. It can identify
  candidates but remains non-authoritative under H-01.
- Release-specific resources use the base
  `/ghostbridge/releases/{release-token}`. `{release-token}` is the exact H-03
  release ID with the leading `ghostbridge/` removed. For example, the next
  draft identity `ghostbridge/e1.r0-draft.1` maps one-to-one to
  `e1.r0-draft.1`. Aliases, case folding, percent-encoded equivalents, and
  “latest” paths are not accepted.
- The full H-03 release identity is also carried in the media parameter defined
  below. Path and media release must agree exactly. A Connection-bound request
  must also agree with the release durably bound to that Connection.
- One origin may serve multiple releases only through disjoint exact release
  bases. It cannot reinterpret a request under another handler or redirect it
  to a different release. Cross-release compatibility remains the explicit,
  non-transitive H-03 relationship and is completed before the Connection
  commit, not through HTTP fallback.
- An unknown release base returns the accepted `404` mapping with a generic
  `unsupported_release` protocol identity only where disclosing supported
  releases is safe. A release mismatch on an already disclosure-authorized,
  Connection-bound request is a `409` lifecycle/binding conflict. Neither case
  triggers negotiation, downgrade, redirect, or automatic retry.

Query parameters may filter or paginate public read collections only when a
later normative operation explicitly defines them. They cannot carry
credentials, secrets, release/profile selection, principal/tenant/Connection
identity, scope, Approval, idempotency identity, or any value that changes
authority. Unknown or duplicate query parameters remain H-13/schema questions;
they are never silently authority-bearing.

#### Request-target and path canonicalization

The transport decision needs one routing invariant even though H-13 and later
D1/D2 work still own future object-ID syntax: no intermediary, proxy, router,
framework, or runtime normalization may turn two distinct incoming request-
target byte sequences into different resource or authority interpretations.
Ambiguous or noncanonical input fails before semantic evaluation; it is never
rewritten into a more permissive route.

Under accepted Option B:

- The 8 KiB request-target bound counts raw received octets, including the path,
  literal query delimiter, and query, before percent decoding, Unicode decoding,
  routing, logging, or framework normalization. The HTTP/2/3 `:path` value is
  treated as the corresponding raw request target for this calculation.
- Baseline routing accepts one origin-form target. A literal first `?` separates
  path and query. Additional literal or percent-encoded `?`/`#` delimiter forms,
  a fragment, or delimiter interpretation that differs across hops is rejected.
- The release base and every static route component are exact canonical ASCII
  bytes, case-sensitive, with `/` as the only separator. They contain no percent
  escapes. In particular, `/ghostbridge/releases/e1.r0-draft.1` is not equal to
  a case-folded, Unicode-lookalike, percent-encoded, decoded, or trailing-slash
  form.
- Literal backslash, percent-encoded slash or backslash, invalid/incomplete
  percent escapes, percent-encoded NUL or control bytes, and raw non-ASCII path
  octets are rejected. Percent escapes are never decoded recursively or more
  than once.
- `.` and `..` segments, their percent-encoded equivalents, repeated
  separators, and empty segments—including a trailing empty segment—are
  rejected unless a later exact route definition expressly makes an empty
  segment part of that route. No dot-segment removal or separator collapsing is
  performed.
- Route structure and raw segment boundaries are validated before any eligible
  data segment is decoded. Static components are matched without decoding.
  A future authority-bearing resource ID may be decoded exactly once only after
  its raw segment passes the future canonical encoding rule.
- H-13/D1/D2 must define exactly one canonical ASCII path-segment encoding for
  every future resource-ID syntax before that ID can be authority-bearing. The
  transport invariant does not decide whether an ID’s semantic value may
  contain Unicode or which object fields are extensible; it requires a unique
  raw path representation and reject-on-reencode-mismatch rule once chosen.
- Canonical request-target validation selects one resource only. Raw or decoded
  path bytes, router parameters, framing, and query encoding do not replace or
  alter the H-10 semantic projection/canonical bytes; any semantic ID binding
  must be validated under the future governed representation as a separate step.
- A proxy or router that normalizes before the Ghost Bridge canonical-target
  check cannot serve a baseline endpoint unless it preserves and validates the
  original raw target and proves the same rejection behavior at every hop.

Later malicious and conformance design must include raw-target length before
and after decoding, mixed-case escapes, double encoding, encoded delimiters,
slash/backslash confusion, dot segments, repeated/empty segments, Unicode and
invalid UTF-8, invalid/control escapes, query ambiguity, proxy/router
normalization differences, and route-before/after-decode mismatches. This is a
case-design obligation only; this record creates no fixture or case.

#### Accepted operation/resource matrix

`{b}` below means the exact release base. Names are accepted resource classes,
not implemented routes or schemas.

| Operation class | Accepted method/resource | Success/body | Retry and ambiguity | Required authority | Principal public error classes |
| --- | --- | --- | --- | --- | --- |
| Bootstrap discovery | `GET /.well-known/ghostbridge` | 200, body required | Safe reread; cached data non-authoritative | None; no Connection | 400, 404, 406, 429, 5xx |
| Release metadata | `GET {b}` | 200, body required | Safe reread | None; non-authoritative | 404/406, 429, 5xx |
| Agent Passport | `GET {b}/passport` | 200, body required | Safe reread; H-11 verification still required | As selected by release; no authority from read | 401/403/404, 429, 5xx |
| Capability collection/item | `GET {b}/capabilities` or `GET {b}/capabilities/{id}` | 200, body required | Safe reread; preview non-authoritative | Authentication if profile requires; no Connection for preview | 400, 401/403/404, 429, 5xx |
| Authentication establishment | `POST {b}/authentications` | 200, body required | Retry only under the selected H-05 profile’s exact transcript/replay rule; otherwise restart without fallback | Exact H-05 target/profile/principal binding | 400/401/403, 409, 429, 5xx |
| Authentication refresh | `POST {b}/authentications/{id}/refreshes` | 200, body required | Same exact refresh intent only; failure grants no extension | Current profile evidence; target bound | 401/403/404, 409, 429, 5xx |
| Install Grant issue | `POST {b}/install-grants` | 201, body required and secret-bearing | Not blindly retryable; issuer-defined exact administrative idempotency is required | Issuer/admin authority, not a Connection shortcut | 400/401/403/404, 409, 429, 5xx |
| Install Grant resolution/preview | `POST {b}/install-grant-resolutions` | 200, body required | Exact safe reread permitted; remains non-authoritative | H-06 disclosure/authentication rules; no Connection authority | 400/401/403/404, 409, 429, 5xx |
| Grant redemption and Connection creation | `POST {b}/connections` | 200, body required for both first commit and exact convergent replay | Only exact H-06 intent retry; ambiguous failure requires exact retry or authenticated Connection reread by returned/prebound identity where available | Exact H-05 evidence and H-06 Grant; no prior Connection | 400/401/403/404, 409, 429, 5xx |
| Connection read | `GET {b}/connections/{id}` | 200, body required | Safe authenticated reread | Exact principal/tenant and disclosure scope; current evidence | 401/403/404, 409, 429, 5xx |
| Connection transition/close/replace request | `POST {b}/connections/{id}/transitions` | 200, body required | Only exact H-07 transition intent; ambiguous failure requires authoritative reread | Current Connection/principal/authorization as H-07 requires | 400/401/403/404, 409, 429, 5xx |
| Invocation acceptance | `POST {b}/invocations` | 202, acceptance body required | Exact H-08/H-09 invocation identity only; after ambiguity reread the Task or repeat the exact request, never create a new identity | Active H-07 Connection, current H-05/H-11 evidence, authorization, and Approval if required | 400/401/403/404, 409, 413/415, 429, 5xx |
| Approval challenge read | `GET {b}/approval-challenges/{id}` | 200, body required | Safe authorized reread | Exact principal/tenant/disclosure scope | 401/403/404, 409, 429, 5xx |
| Approval decision | `PUT {b}/approval-challenges/{id}/decision` | 200, body required | Same exact decision may converge; conflicting decision is 409; decision is not Approval consumption | Exact decision authority and challenge binding | 400/401/403/404, 409, 429, 5xx |
| Approval-bearing Invocation | `POST {b}/invocations` | 202, acceptance body required | Exact H-08/H-09 retry only; consumption remains atomic at final acceptance | All Invocation gates plus exact unconsumed Approval | 400/401/403/404, 409, 429, 5xx |
| Task retrieval | `GET {b}/tasks/{id}` | 200, body required | Safe authorized reread; polling hints are advisory | Exact disclosure authorization; current evidence | 401/403/404, 409, 429, 5xx |
| Task cancellation intent | `POST {b}/tasks/{id}/cancellation-intents` | 202, acknowledgement body required | Exact cancellation-intent retry may converge; status does not promise cancellation won | H-09 cancellation authority and current evidence | 400/401/403/404, 409, 429, 5xx |
| Result retrieval | `GET {b}/results/{id}` | 200, body required | Safe authorized reread; immutable once created | Exact disclosure authorization; current evidence | 401/403/404, 409, 429, 5xx |
| Receipt retrieval | `GET {b}/receipts/{id}` | 200, body required | Safe authorized reread; proof may materialize idempotently per H-09/H-10 | Exact disclosure authorization; historical read is not current authority | 401/403/404, 409, 429, 5xx |
| Issuer metadata | `GET /.well-known/ghostbridge-issuer` on the exact issuer origin | 200, body required | Safe fetch with H-11 freshness/rollback evaluation; transport cache never sufficient | Public or H-11-defined disclosure; no Connection authority | 404/406, 429, 5xx |
| Keys and revocation evidence | Exact same-origin resources selected by verified issuer metadata, such as `{issuer-base}/keys` and `/revocation-snapshots/current` | 200, body required | Conditional/safe reread only; H-11 chain, freshness, and floor decide usability | H-11 verification; no authority from HTTP success | 401/403/404, 409, 429, 5xx |

Generic `PATCH`, arbitrary action names in query strings, and secret-bearing
path segments are excluded. Resource IDs in paths select already bounded
objects; they do not prove access. Exact request/response fields remain future
normative/schema work and H-13 governs extensibility.

### 2. Media, charset, transfer, and content encoding

- Discovery uses `application/vnd.ghostbridge.discovery+json`.
- Release resources use `application/vnd.ghostbridge+json` with a mandatory
  `release="ghostbridge/e1.r0-draft.1"`-style exact H-03 identity parameter.
  The example illustrates the grammar, not a release authorization.
- Requests with bodies require that exact `Content-Type`; successful and
  protocol-error responses use the matching type. Bodyless requests omit
  `Content-Type`.
- `Accept` must include the exact selected media type/release. Wildcards,
  `application/json`, or another release cannot silently select a fallback.
  Failure is 406. Unsupported request media is 415.
- JSON text is strict UTF-8. Emitters omit `charset`; recipients may accept a
  single case-insensitive `charset=utf-8` parameter but reject any other
  charset, invalid UTF-8, a byte-order mark, or transcoding fallback.
- Baseline `Content-Encoding` is `identity` only. Request or response
  compression is not a baseline feature, especially for authentication,
  Grants, Approval, Connection, and other secret-bearing exchanges. An
  unsupported encoding is 415 before decompression.
- A future compression or application-stream feature requires an exact
  H-04-selected feature/profile, release-specific limits, H-13 framing rules,
  D2 assets, and independent review. HTTP `TE`, `Accept-Encoding`, or runtime
  auto-decompression cannot negotiate it implicitly.
- Unambiguous HTTP transfer chunking may deliver a bounded ordinary message;
  it creates no application frames. Transfer/content bytes are decoded and
  bounded before strict JSON/semantic processing. H-10 alone then constructs
  canonical semantic bytes. Chunk boundaries, HTTP headers, compression bytes,
  and media formatting are never added to or substituted for H-10 input.

### 3. Authentication and security-sensitive headers

- Per-request authentication evidence appears in exactly one `Authorization`
  field using the selected H-05 profile, plus only profile-registered proof
  fields whose exact purposes are bound by H-05/H-10. It never appears in a
  query string, URL userinfo, cookie, path, generic trace field, or log.
- A 401 response uses `WWW-Authenticate` only when the **already selected**
  H-05 profile defines a safe HTTP challenge representation. The server emits
  exactly one field occurrence containing exactly one challenge for that
  profile. It does not advertise another profile, issuer, target, weaker mode,
  `none`, or any alternative that could trigger negotiation or fallback.
- When the selected H-05 profile defines no safe challenge header, the server
  invents none; the bounded `AUTHENTICATION_REQUIRED` Ghost Bridge error is
  sufficient. A client receiving multiple or conflicting challenge occurrences
  ignores every challenge value, treats the challenge representation as
  invalid, and retains only the safely parsed generic 401/
  `AUTHENTICATION_REQUIRED` outcome; it never selects or retries a profile from
  them. Exact challenge syntax and safe parameters derive from H-05 and later
  normative representation work; H-12 decides only placement, singularity,
  disclosure, and no-fallback behavior.
- `Proxy-Authenticate` and `Proxy-Authorization` are hop/proxy mechanisms and
  never Ghost Bridge authentication, principal, target, Connection, or
  authority evidence. A proxy challenge cannot replace or select the H-05
  profile. Authentication and challenge fields remain prohibited from logs.
- An Install Grant secret is an explicit semantic body value for its H-06
  operation, not ambient HTTP authentication; it still receives credential
  handling and no-store/redaction protection. Approval evidence likewise uses
  its future governed semantic envelope, never URL/query placement.
- Cookies, browser credential mode, `Proxy-Authorization`, environment-proxy
  credentials, and ambient client certificates are not baseline authority.
  A selected H-05 profile could later define certificate-bound proof, but no
  runtime credential may be inferred.
- Security-relevant singleton fields—`Authorization`, `WWW-Authenticate` when
  present, `Host`/`:authority`, `Content-Type`, `Content-Encoding`, release
  identity, content length, idempotency identity, and each proof field—must
  occur exactly once when required. Comma joining or multiple authentication
  presentation values, obsolete folding, whitespace ambiguity, control
  characters, and conflicting normalized names are rejected before
  authentication. Multiple/conflicting response challenges follow the
  discard-and-generic-401 rule above and cannot affect retry/profile selection.
- Field names are compared under HTTP’s case-insensitive rules; profile values
  are not case-folded or rewritten. Intermediary normalization cannot change a
  signed or bound value.
- `Host`/`:authority`, TLS server name, requested origin, and the H-05 target
  must resolve to the one configured exact origin. A proxy-facing internal Host
  can be used for routing only under explicit trusted-proxy configuration and
  never replaces the external bound origin.
- `Origin` and `Referer` are not authentication or authority. Native browser
  use is outside the baseline. A server that exposes an additional browser
  adapter must use a separate origin, deny ambient cookies, implement explicit
  CORS/CSRF policy, and translate only after normal Ghost Bridge enforcement.
- The receiver generates a fresh opaque `Ghostbridge-Request-Id` for each
  boundary request. A bounded peer-supplied correlation value, if later
  allowed, is stored separately and never trusted as an internal trace or
  authority identifier. `Idempotency-Key`, if a future envelope duplicates it
  in a header, must exactly equal the H-06/H-08/H-09 semantic value; the body
  value is authoritative and mismatch is 400.
- Baseline peers do not accept `tracestate` or `baggage` across the trust
  boundary. A valid `traceparent` may be retained only as an untrusted peer
  link under explicit bilateral observability policy; the receiver starts its
  own tenant-scoped trace.

### 4. Redirect policy

Option B follows **zero redirects** for every Ghost Bridge, authentication,
Trust, issuer, key, and revocation operation.

- Every 3xx is a terminal HTTP-layer failure for that attempt, has `no-store`,
  and is not automatically followed or cached.
- This includes 301, 302, 303, 307, and 308; same-origin, method-preserving, and
  cross-origin redirects are all rejected. Consequently no body, Authorization,
  Grant, Approval, proof, cookie, or Connection context is forwarded.
- A loop does not consume a hop because the first redirect fails. HTTPS-to-HTTP
  downgrade and release-path redirect are always rejected.
- A newly discovered origin is a new candidate requiring the normal H-01/H-05
  bootstrap, consent, target binding, DNS/TLS validation, and, where applicable,
  a new Connection. It is never a redirect continuation.
- Redirect targets may be recorded only in access-controlled security telemetry
  after URL redaction; they are not returned in public error detail.

The reviewed bounded one-hop 307/308 same-origin alternative would reduce
deployment friction, but it creates method/body replay, DNS revalidation,
path/release confusion, and intermediary-cache risk without a repository use
case. The accepted redirect count is therefore zero.

### 5. TLS, DNS, SSRF, and network-target policy

#### Mandatory TLS authentication floor and certificate-status choice

- Remote Governed operation uses authenticated HTTPS. Certificate-chain
  validation against the selected trust configuration, exact hostname and SNI
  validation for the bound origin, and certificate not-before/not-after time
  validation are mandatory.
- Insecure verification, hostname suppression, plaintext fallback,
  opportunistic TLS, automatic scheme/target change, and HTTPS downgrade are
  prohibited. Failure never retries with a weaker H-05 profile, trust
  configuration, or different origin.
- Public CA versus administrator-approved private CA roots is an explicit
  deployment/release-profile trust configuration. Either can authenticate an
  exact bound origin; accepting an unconfigured CA or any certificate is not a
  private-network exception.
- Exact TLS versions/ciphers, trust-root distribution, termination topology,
  and certificate-status/pinning behavior must be declared by the exact release
  profile/support commitment before an interoperability claim. They cannot vary
  silently under one profile.

The reviewed certificate-status alternatives were:

| Variant | Proposed rule | Security and portability consequence |
| --- | --- | --- |
| TLS-A — one H-12 status mechanism | H-12 chooses one exact OCSP/CRL/stapling-style mechanism and one hard/soft-fail rule for every baseline peer | Most deterministic status behavior, but current runtimes, private PKIs, offline/on-prem deployments, and responders do not expose one equally portable mechanism |
| TLS-B — authenticated TLS floor plus declared profile status | H-12 fixes chain/hostname/SNI/time validation; H-14 or an exact release profile declares whether OCSP, CRL, stapling, platform revocation APIs, application pins, or no additional status mechanism applies and exactly how missing/stale/unavailable evidence fails | Preserves a portable TLS-authentication floor while making stronger status/pinning behavior explicit rather than opportunistic |

**Accepted subchoice within Option B: TLS-B.** It avoids pretending that one
certificate-status API is portable while prohibiting silent variance. A peer
using a declared hard-fail status or pin policy fails closed when its evidence
is absent; it does not fall back to chain-only authentication. A profile that
does not select an additional status mechanism cannot opportunistically use the
presence or absence of optional status evidence to change identity, authority,
or retry behavior. An implementation with stricter undeclared local rejection
may protect itself, but cannot claim deterministic interoperability for the
exact profile it silently narrowed.

#### Network-target provenance and private/on-prem human choice

Private-network policy is a high-impact security and enterprise-deployment
choice, not an implementation detail. The accepted analysis separates:

| Target class | Source and accepted treatment |
| --- | --- |
| A. Attacker/discovery-derived | Any URL/host/address influenced by discovery, peer data, a request body, query, redirect, or untrusted forwarding is never allowed to opt into private reachability; it receives public-target checks only and remains non-authoritative until normal binding |
| B. Administrator-configured bound origin | Exact scheme, canonical host, effective port, trust configuration, and permitted address scope are integrity-protected and approved before discovery/use, then bound through H-05/H-07 |
| C. Loopback test/development | Plain HTTP is possible only with an explicit test flag when hostname and every resolved/connected address are loopback and artifacts cannot be confused with production/Governed authority |
| D. Private/on-prem production | Allowed only under accepted NET-B for an exact pre-approved administrator-bound private/on-prem origin; authenticated HTTPS and all H-05/H-07 controls still apply |
| E. Non-peer destinations | Link-local, metadata-service, multicast, broadcast, unspecified, documentation/benchmark, unsafe transition/special-use, and equivalent destinations remain prohibited for Governed peers regardless of discovery or private-origin configuration |

Two genuine decision variants are:

| Variant | Proposed rule | Tradeoff |
| --- | --- | --- |
| NET-A — public-address-only baseline | Baseline production origins resolve only to permitted public unicast addresses. Private/on-prem operation requires a future exact H-04-selected transport profile | Smallest SSRF surface and simplest cross-peer rule, but excludes common private enterprise Agents until another profile is governed and implemented |
| NET-B — administrator-bound private-origin exception | Baseline permits an exact pre-approved private/on-prem origin whose scheme/host/port, CA trust, and narrow private IPv4/IPv6 address scope were configured before discovery/use. HTTPS, hostname validation, all-answer fail-closed checking, address pinning, zero redirects, and H-05/H-07 binding remain mandatory. Class E destinations remain prohibited | Supports enterprise/on-prem deployments without making discovery an SSRF oracle, but makes administrator configuration and address-scope review security-critical |

**Accepted subchoice within Option B: NET-B.** On-prem/private deployment is
a material interoperability requirement, and exact prior administrator binding
can distinguish intended private reachability from attacker-selected SSRF. The
exception cannot be created or widened by discovery, DNS alone, an environment
proxy, a request, a redirect, or Platform allowlist. Wildcard hosts, wildcard
ports, and unconstrained “all private networks” approval are not sufficient.
NET-A remains the safer choice for environments that cannot protect and review
the binding configuration.

Loopback is eligible only under class C test/development handling and cannot be
approved as a NET-B production scope. NET-B may name only the exact private or
unique-local ranges needed for the peer; class E and any unenumerated private
range remain denied.

URL userinfo and fragments are prohibited. Query is prohibited in configured
origins and network metadata targets unless a later exact read operation
defines non-authority query members. Remote default port is 443. A nondefault
port must be an exact part of the preconfigured and authenticated H-05 target;
discovery cannot add it. IP literals are not the portable default. A future
explicit binding may allow a permitted literal only with exact target and TLS
identity validation; class E literals are never eligible.

For each new network connection, the client resolves all A and AAAA results
under a finite DNS budget. Resolution failure or no result fails closed. Every
candidate is classified from its binary address, including IPv4-mapped IPv6,
before racing or selection. For a public target, every answer must be permitted
public unicast. For a NET-B origin, every answer must be inside the exact
administrator-approved scope and outside class E; an answer outside that scope,
including a mixed public/private or mixed approved/unapproved set not expressly
covered by the binding, fails the whole resolution. One validated candidate is
pinned through the actual connection so no unvalidated second lookup occurs
between check and connect. Every new connection repeats the check. The eventual
address registry/table must derive from authoritative registries and malicious
review assets, not a Platform allowlist or this prose alone.

#### Non-redirect transport authority movement

Zero 3xx redirects does not permit a transport optimization to move authority.
The exact scheme, canonical host, effective port, H-03 release, H-05 target, and
H-07 Connection binding remain unchanged regardless of the socket, protocol, or
intermediary selected to carry bytes.

- HTTP/2 connection coalescing is not used across origins for Governed traffic,
  even if one certificate covers both names and the runtime considers the
  connection reusable. Pools are keyed by the complete bound origin, release
  transport profile, proxy policy, and credential-isolation context.
- Baseline clients ignore `Alt-Svc` and equivalent alternative-authority hints.
  A future selected profile must prove that an alternative preserves the exact
  bound authority and independently validates its transport target; it cannot
  change host, effective port, release, credentials, or Connection authority.
- DNS HTTPS/SVCB data may assist protocol selection only when the canonical host
  and effective port remain exact and every actual address independently passes
  the selected public or NET-B policy. Alternative target names/ports are
  ignored in the baseline, not treated as discovery or authority.
- Happy-eyeballs/parallel A+AAAA racing may race only candidates already
  validated for the same exact origin. The connected address must be one of
  that validated set; losing attempts receive no application credentials/data.
- Runtime or OS behavior that performs a second DNS resolution after validation
  is disabled or constrained to the validated candidate set. Connection pooling
  cannot reuse a connection for another origin, tenant credential context, or
  release merely because DNS or a certificate overlaps.
- HTTP/3 is not baseline. A future selected HTTP/3 profile initially disables
  QUIC peer-address migration (the accepted initial rule) or explicitly defines
  revalidation: the new address must pass the same exact provenance/scope policy
  before further application traffic is accepted, and failed or unverifiable
  revalidation terminates the connection.
- A proxy `CONNECT` or equivalent tunnel targets only the exact bound host and
  port. The explicitly trusted proxy must enforce the same DNS/address policy
  when it resolves the target, while end-to-end TLS still authenticates the
  bound Ghost Bridge origin. The proxy address never becomes the H-05 target.
- No coalescing, alternative-service hint, resolver optimization, race,
  migration, pool, or tunnel may forward credentials cross-origin or bypass
  DNS, private-scope, special-address, TLS, release, or Connection checks.

Later D2/P1 case design must cover cross-origin certificate coalescing,
`Alt-Svc`, HTTPS/SVCB target/port changes, mixed racing candidates, connected-
address mismatch, pool-key confusion, OS second resolution, proxy-tunnel
resolution, QUIC migration, and credential isolation. These are review
obligations, not executable cases created by this decision.

There are no redirect hops under Option B. An explicitly configured outbound
proxy may be used only when it is trusted to enforce the selected target policy,
TLS hostname validation, origin binding, and credential isolation end to end.
Ambient environment proxies are disabled for Governed transport. Organizations
may apply stricter egress allowlists, ports, regions, roots, or pins; such
Platform/deployment restrictions are not universal protocol authority and
cannot turn an otherwise prohibited target into an eligible peer.

#### TLS termination and forwarding

A reverse proxy may terminate TLS only when explicitly configured as a trusted
deployment component. The server’s external origin is fixed configuration.
`Forwarded`, `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Forwarded-For`, client
IP headers, rewritten `Host`, and peer request IDs from an untrusted source are
discarded for authority decisions. Trusted proxy metadata may support routing
and security audit, but cannot select release, principal, tenant, scope,
Connection, or authorization. Credential forwarding is limited to the exact
internal hop needed for enforcement and protected equivalently; ordinary logs
at every hop still redact it.

### 6. HTTP version, ALPN, translation, and method floor

HTTP transport version is a real mandatory-to-implement interoperability
choice. It changes framing, library/proxy requirements, and test surfaces, but
never Ghost Bridge release, capability, authentication, lifecycle, or authority
semantics.

| Variant | Mandatory and optional behavior | Interoperability/security tradeoff |
| --- | --- | --- |
| HTTP-V1 — HTTP/1.1 floor | HTTP/1.1 mandatory for every baseline client/server; HTTP/2 optional for the identical same-origin binding; HTTP/3 requires a separately selected transport profile | Widest independent-runtime and proxy reach; reuses the bounded request/response model; requires the strict H-12 HTTP/1.1 framing/smuggling controls recorded here |
| HTTP-V2 — HTTP/2 floor | HTTP/2 mandatory; HTTP/1.1 compatibility optional; HTTP/3 separately selected | Avoids HTTP/1.1 framing on the mandatory path, but adds universal ALPN/HTTP/2 implementation and intermediary burden without changing semantic safety |
| HTTP-V3 — dual H1/H2 floor | HTTP/1.1 and HTTP/2 both mandatory; HTTP/3 optional only through an exact selected rule | Broadest H1/H2 interop but doubles the mandatory conformance surface and makes constrained independent implementations harder |

**Accepted subchoice within Option B: HTTP-V1.** Repository behavior is
closest to conventional bounded HTTP request/response, HTTP/1.1 is available
across the widest independent runtimes and proxies, and its ambiguity risks
already require explicit rejection rules. Universal HTTP/2 support adds burden
without granting semantic safety. HTTP/3 adds QUIC discovery, address-migration,
and transport-policy complexity already isolated from the baseline.

Under accepted HTTP-V1:

- Every baseline client and server must implement the same HTTP/1.1 binding
  before claiming baseline interoperability. A server that supports only HTTP/2
  or HTTP/3, or a client unable to perform HTTP/1.1, cannot make that claim.
- TLS ALPN selects only HTTP transport framing. A client that attempts optional
  HTTP/2 offers `h2` and `http/1.1` for the same exact bound origin. Selection
  of `h2` carries the identical Ghost Bridge operation. Selection of
  `http/1.1`, or no ALPN selection on an otherwise valid endpoint explicitly
  configured for the mandatory HTTP/1.1 binding, uses HTTP/1.1. An unknown ALPN
  result fails the attempt.
- ALPN never selects or modifies the H-03 release, H-04 feature/profile set,
  H-05 authentication profile/principal/issuer/target/tenant/purpose, or H-07
  Connection/authority. These remain the exact values already selected and
  bound outside HTTP-version negotiation.
- Failure to negotiate or establish optional HTTP/2 may fall back only to the
  mandatory HTTP/1.1 binding for the **same** scheme, canonical host, effective
  port, release, selected profiles/features, tenant, credentials, and
  Connection. This is transport-version fallback, not Ghost Bridge downgrade or
  renegotiation. Automatic fallback occurs only before any Ghost Bridge
  Authorization/proof/body bytes were sent on the failed attempt. After request
  transmission begins, failure is handled by the ordinary ambiguity and
  H-06/H-08/H-09 retry rules, not by a transport-version replay. Credentials/
  request bodies are sent only after the fallback connection independently
  passes the same DNS/TLS/origin checks.
- HTTP/2 does not enable cross-origin connection coalescing. The origin, pool,
  target validation, credential isolation, limits, errors, cache, and
  non-redirect authority-movement rules above apply unchanged.
- HTTP/3 is not a baseline requirement and is not enabled merely because of
  `Alt-Svc`, HTTPS/SVCB, QUIC availability, browser/runtime preference, CDN, or
  proxy support. A future exact H-04/release transport profile must select it.
  That profile still consumes every H-12 origin, DNS, TLS, credential-isolation,
  QUIC-migration, retry, timeout, size, cache, canonical-target, and authority
  rule; it creates no new H-03/H-04/H-05 negotiation path.
- Cleartext HTTP/2 upgrade/prior-knowledge mechanisms (`h2c`) are not part of
  the baseline and are prohibited for remote Governed operation. The existing
  explicit loopback test/development plaintext exception may use a separately
  identified fixture transport, but it creates no Governed authority or
  baseline `h2c` interoperability claim.
- A trusted proxy/gateway may translate HTTP/1.1 and HTTP/2 framing only when it
  preserves the exact Ghost Bridge method, raw canonical-target rejection and
  routing result, origin/authority, singleton headers, body/media bytes and
  bounds, status/error identity, credential isolation, and no-store behavior.
  Translation cannot normalize an otherwise rejected target, combine security
  fields, retry a mutation, coalesce origins, or create a second release/profile/
  authentication negotiation path. H-10 canonical semantic bytes remain
  independent of the HTTP version and framing on either hop.
- `HEAD` and `OPTIONS` are not baseline Ghost Bridge semantic operations unless
  an exact operation table in later approved work lists them. A known resource
  receiving either unsupported method returns the existing safe 405 behavior;
  `Allow` exposes only the registered safe method set. Native CORS/preflight
  remains outside the baseline and cannot make `OPTIONS` authority-bearing.

Later D2/P1 case design must cover HTTP/1.1-only client/server interoperability,
H1↔H2 ALPN negotiation, failed optional H2 followed by valid same-origin H1
fallback before request transmission, post-transmission H2 failure remaining an
ordinary ambiguous request rather than H1 replay, `h2c` rejection, H2
cross-origin coalescing denial, proxy H1/H2 translation with raw-target/
singleton/body/security preservation, H3 not being silently enabled, and proof
that transport-version selection cannot downgrade or renegotiate H-03/H-04/
H-05/H-07 values. These are case-design obligations only; this decision creates
no executable assets.

### 7. Streaming and backpressure

Option B has no baseline application streaming. Each request and response is
one finite JSON document. Invocation acceptance returns promptly as a bounded
202 acknowledgement naming the one H-09 Task; clients then perform authorized
Task, Result, and Receipt reads. This prevents a handler or proxy connection
from becoming the Task lifetime.

HTTP/1.1 chunked transfer, optionally negotiated same-origin HTTP/2 data frames,
or a future exactly selected HTTP/3 profile may carry the bytes of that one
document, subject to the same cumulative byte and idle/overall limits. They do
not define protocol frames, progress events, resume positions, duplicates,
terminal delivery, or cancellation.

Any future application stream must be an exact H-04-selected feature and define
in later approved work: media/framing, frame and cumulative limits, sequence and
deduplication, authorization recheck points, proof lifetime, backpressure,
partial failure, resume cursor, Result/Receipt reference delivery, proxy idle
behavior, and explicit cancellation. It cannot add an H-09 Task state, make a
disconnect a cancellation intent, or treat a replayed event as new work.

### 8. Transport abort versus Task cancellation

The following events are transport observations only:

| Event | Meaning under accepted Option B | Permitted client conclusion |
| --- | --- | --- |
| Caller stops waiting / local `AbortController` fires | Local wait ended and the implementation should release local network resources | No conclusion about server acceptance, Task state, cancellation, or rollback |
| TCP/QUIC/HTTP disconnect or reset | The exchange did not complete at that peer | No conclusion that a state-changing request did or did not commit |
| Proxy/load-balancer timeout | An intermediary stopped carrying the exchange | No semantic deadline/cancellation conclusion |
| Server fails writing response | The client may not receive the already committed result | Server must not undo a durable commit solely because delivery failed |
| Server process crash | Commit is determined only by accepted durable transaction semantics | Restart reads durable state; it does not infer from socket state |
| Explicit cancellation HTTP request | A separate authenticated request to create/converge an H-09 cancellation intent | A 202 acknowledgement proves only acceptance of the intent, not that cancellation won the race |
| H-09 Task deadline reached | Semantic Task rule evaluated against the accepted deadline boundary | Independent of client/proxy network timeout |

Before a durable acceptance point, an implementation may know internally that
no semantic commit occurred, but a remote client relies on public evidence only.
After an ambiguous failure it must:

1. retain the exact release, origin, principal, Connection, operation intent,
   idempotency identity, and Approval binding;
2. perform an authenticated authoritative read using the known Connection/Task/
   Result/Receipt identity where the accepted semantic model supplies one; or
3. repeat only the exact request permitted to converge by H-06, H-08, or H-09.

It must not invent a new idempotency key, Approval, Invocation, or Connection;
assume cancellation; retry on another origin/release; or treat a local error
named “cancelled” as a terminal Task. A read can report authoritative current
state but cannot itself create a state transition.

### 9. Retry and idempotency model

The accepted error envelope carries one logical retry class; HTTP status alone
is never sufficient:

| Retry class | Meaning |
| --- | --- |
| `never` | Repeating unchanged input is prohibited or cannot succeed |
| `after_correction` | Caller may submit a newly valid request; this is not replay of the rejected request |
| `same_request_after_delay` | Exact request may be retried after the bounded delay, but only if its accepted semantic idempotency makes repetition safe |
| `authoritative_read_required` | Commit is ambiguous; first read durable state or use the exact H-06/H-08/H-09 convergent request |
| `reauthenticate_or_reconnect` | Acquire current evidence or a new Connection through accepted semantics; never revive the old authority |

Safe `GET` metadata/object reads can normally be repeated with current
authorization. Authentication establishment/refresh follows its exact H-05
profile replay rules. Install Grant redemption follows H-06 only. Invocation
and Approval-bearing Invocation follow the exact H-08/H-09 identity and
consumption rules. Cancellation repeats only the same cancellation intent.
Result/Receipt reads are safe but remain disclosure-authorized; Trust refresh
is a safe HTTP read whose returned evidence must pass H-11.

Failure treatment is accepted as follows:

- DNS/connect/TLS reset, no complete response, local timeout, and response
  truncation are ambiguous for state-changing requests. Use
  `authoritative_read_required`; do not assume pre-commit.
- 408 means the server or intermediary stopped receiving the HTTP request. It
  does not prove no commit and is not a blind retry signal.
- 409 represents a disclosed binding/lifecycle/idempotency conflict. Correct or
  authoritatively read; repeating different intent under the same identity is
  prohibited.
- 425 is not used by the baseline. Early data is disabled for state-changing or
  authenticated Ghost Bridge requests; a future TLS profile must separately
  prove replay safety.
- 429 and 503 can carry `same_request_after_delay` only when the operation’s
  accepted semantics permit exact repetition. Otherwise they require read or
  manual recovery.
- 500, 502, 504, connection reset, and timeout never make an unsafe method
  retryable on their own. The envelope may narrow handling but cannot override
  semantic idempotency.
- A server emitting retry delay uses `Retry-After` as a non-negative integral
  delta-second value, not a date, capped at 3,600 seconds. The logical envelope
  repeats the same delay in milliseconds. Mismatch, invalid, or excessive
  values are ignored in favor of the safer longer local backoff capped by
  policy; neither value overrides H-11 freshness or an H-09 deadline.
- Clients use exponential backoff with jitter and a bounded attempt/time budget
  supplied by the release profile. Servers may return no delay. H-14 owns
  concrete operational rate limits, but retry storms are prohibited by the
  H-12 bounded/jittered floor.

Request IDs and trace IDs never provide idempotency. Only the accepted semantic
identity and exact-intent binding do.

### 10. Timeout and deadline model

Every network attempt uses monotonic elapsed time, one absolute attempt maximum,
and shorter phase maxima. Wall-clock changes do not extend a budget. “Maximum”
here limits how long a baseline transport is required or permitted to hold one
attempt; it is not a semantic H-09 deadline and is not evidence that work did or
did not commit.

The accepted first portable release profile is:

| Directional budget | Accepted maximum | Calculation/meaning |
| --- | ---: | --- |
| Client DNS resolution | 3 s | All A/AAAA results, provenance checks, and address classification complete inside the shared attempt |
| Client TCP/QUIC connect | 5 s | One already validated candidate establishes transport |
| Client TLS handshake | 5 s | Chain/hostname/SNI/time and selected certificate-status checks complete |
| Client request write | 10 s | Entire bounded header/body is accepted by local transport; idle sub-maximum 5 s |
| Server synchronous acknowledgement | 10 s after complete bounded request receipt | Server emits the first byte of a complete response, durable 202 acceptance, or safe temporary error instead of waiting for Task execution |
| Client response idle/read | 10 s idle | Reset only by actual bounded response bytes, not local polling events |
| Client whole attempt | 30 s absolute from attempt start | Includes DNS, connect, TLS, write, acknowledgement wait, and bounded read; always wins over a remaining phase budget |

The 30-second maximum is not the sum of the rows. For example, DNS, connect,
and TLS time consume the same absolute attempt budget. A server’s ten-second
acknowledgement obligation starts only after it has received the complete
otherwise acceptable bounded request; configured server/proxy header, read,
write, and handler budgets must let such a request reach that decision point.
Network delay means one client observation alone cannot prove that the server
missed its internal acknowledgement obligation.

The five distinct meanings are:

1. **Protocol network-attempt maximum:** a baseline client is not required to
   keep one attempt open beyond the accepted phase/30-second maxima, and cannot
   silently extend them into a semantic deadline.
2. **Server acknowledgement requirement:** a baseline server does not execute a
   potentially long Task synchronously; within the accepted server budget it
   returns the bounded synchronous result, durable Task acceptance, or a safe
   error.
3. **Caller-local shorter wait:** an application may stop waiting sooner and
   release local resources. That local choice proves neither peer
   nonconformance nor semantic failure, timeout, or cancellation.
4. **Deployment operational timeout:** a claimed baseline deployment and its
   required intermediaries cannot configure shorter cutoffs that systematically
   prevent otherwise conforming baseline exchanges. A deliberately shorter
   support commitment requires a distinct, explicit release/profile rather than
   silent policy.
5. **H-09 semantic deadline:** the immutable Task deadline, execution timing,
   cancellation intent, and terminal race remain H-09 semantics and are never
   derived from DNS/socket/proxy/caller timers.

A cancellation request has its own transport attempt; expiry does not decide
the cancellation race. H-12 would fix the categories, monotonic/shared-budget
algorithm, server acknowledgement model, and numbers for this exact baseline.
H-14 may select different operational numbers only through a different explicit
release/profile/support commitment and may not describe an implementation that
silently undercuts the baseline as baseline-interoperable.

### 11. Size, parser, and resource limits

The accepted portable baseline uses octets after deterministic UTF-8
encoding and counts complete collections, not implementation allocation size.
For each request-wire row below, the number is both the maximum a baseline
client may send and the size through which a baseline server must accept an
otherwise valid request. For each response-wire row, it is both the maximum a
baseline server may send and the size through which a baseline client must
accept an otherwise valid response. Structural bounds apply in both directions.
Local log bounds are absolute emission ceilings, not interoperability sizes.

| Resource | Accepted baseline bound | Enforcement point/direction |
| --- | ---: | --- |
| Raw request target (path plus query) | 8 KiB | Sender maximum/server support through, before decoding, routing, logging, or authentication |
| Request header fields | 64 fields | Sender maximum/server support through, after HTTP framing validation |
| One request header name/value line | 8 KiB | Sender maximum/server support through; security singletons are never joined |
| Aggregate request header section | 32 KiB | Sender maximum/server support through; precise framing overhead awaits normative calculation |
| Response header fields | 64 fields | Server-sender maximum/client support through, after HTTP framing validation |
| One response header name/value line | 8 KiB | Server-sender maximum/client support through; security singletons are never joined |
| Aggregate response header section | 32 KiB | Server-sender maximum/client support through; precise framing overhead awaits normative calculation |
| Encoded request body | 256 KiB | Sender maximum/server support through, while reading and before content decoding |
| Decoded request body | 256 KiB | Sender maximum/server support through, before JSON parse; equal to encoded baseline because only identity is allowed |
| Ordinary encoded/decoded response | 1 MiB | Server-sender maximum/client support through while reading |
| Error response | 16 KiB | Server-sender maximum/client support through, including envelope and safe detail |
| JSON nesting | 16 containers | During strict tokenization, before semantic construction |
| One JSON string | 64 KiB UTF-8 | During tokenization, before unescaping allocation exceeds bound |
| Array entries | 256 | During tokenization |
| Object members | 256 unique names | During tokenization; duplicate names rejected |
| Total JSON tokens | 16,384 | During tokenization; total byte cap still dominates |
| Application stream frame/cumulative | Not applicable | No baseline application streaming |
| One ordinary log field | 1 KiB sanitized UTF-8 | Before emission |
| Ordinary log message/event | 2 KiB / 16 KiB | Before sink/export; at most 32 application fields |

“Otherwise valid” does not require every byte sequence up to a support bound to
pass schema or semantic validation. It means size alone cannot reject a message
that satisfies the applicable release requirements. The byte bound is
independent of structural bounds. Thus 256 members of 64 KiB
cannot produce a multi-megabyte accepted request: the 256 KiB decoded total
wins. A 1 MiB response still uses the same depth/string/collection caps unless
an exact resource schema later sets smaller values. Error bodies use the 16 KiB
cap and cannot echo the rejected input.

Limit checks occur while reading/tokenizing. A recipient does not first buffer,
decompress, parse, canonicalize, or log an unbounded value. An over-limit body
returns 413 only if a safe response can be framed; otherwise the connection is
closed. Unsupported compression returns 415 without decompression. If a future
profile allows compression it must independently cap compressed bytes,
decompressed bytes, expansion ratio, CPU/time, and nested payloads before parse;
the accepted decision does not invent those future numbers.

The 256 KiB request bound means every baseline server accepts an otherwise
valid request through 256 KiB and every baseline client sends no more. The
1 MiB ordinary-response bound means every baseline client accepts an otherwise
valid response through 1 MiB and every baseline server sends no more. A normal
operation or discovery advertisement cannot silently lower either mandatory
receiver-support bound. A local absolute resource ceiling may be higher, but it
does not authorize a baseline peer to send more.

A larger wire limit requires an exact H-04-selected feature/profile that sets
both the new sender maximum and receiver-support requirement. An explicitly
selected constrained profile with smaller limits is a distinct explicit non-
baseline profile; it is never an operation hint, local default, downgrade, or
silent fallback. H-14 may operate a stricter service only under that explicit
support commitment. A deployment that rejects an otherwise
valid message below the baseline support bound cannot claim baseline
interoperability. Historical discovery advertisements up to 16 MiB do not
select a larger profile and are not silently honored.

### 12. Error taxonomy and HTTP status strategy

Option B distinguishes these values without equating them:

1. **Transport failure:** no complete trustworthy HTTP response; there is no
   protocol error body to trust and state-changing commit may be ambiguous.
2. **HTTP-layer failure:** framing, target, method, media, size, gateway, or
   negotiation failure; a safe Ghost Bridge envelope is used only if dispatch
   reached the release handler safely.
3. **Ghost Bridge protocol error:** a stable release-defined semantic error
   identity and outcome/retry class in the matching media type.
4. **Authorization denial:** authenticated evaluation did not grant the action;
   authentication and authority remain distinct.
5. **Lifecycle/binding conflict:** disclosed current state cannot accept the
   exact request; it is not automatically retryable.
6. **Temporary condition:** a bounded-delay class that is safe to retry only
   under the operation’s accepted idempotency semantics.
7. **Task/Result terminal state:** a successful authoritative H-09 resource
   representation, not an HTTP or protocol failure merely because the Task
   failed/cancelled/timed out.
8. **Historical verification result:** an H-11 classification represented in
   an authorized resource; indeterminate/invalid/non-authoritative is not a
   transport error and never becomes current authority.

The future error schema should carry, logically, exact release identity, one
stable error identity, one coarse public outcome class, one retry class,
optional bounded retry delay, receiver-generated request ID, and only the
safe detail registered for that error identity. H-13 still decides outer-object
openness, unknown members/enums, and extensions. Raw internal exception/cause,
stack, policy rule, credential, object existence, tenant identity, Trust floor,
network target, SQL/storage text, or rejected input is never a public field.

Unknown internal failures fail closed as generic internal failure. Unknown
protocol error identities are never interpreted as retryable or authoritative;
their H-13 evolution treatment remains unresolved.

#### Accepted status mapping

| HTTP status | Accepted use | Default retry treatment |
| ---: | --- | --- |
| 200 | Completed bounded read/decision/convergent redemption response | Not a grant of authority by itself; reads may be repeated |
| 201 | Newly issued administrative resource such as Install Grant | No blind replay unless exact issuance idempotency exists |
| 202 | Invocation or cancellation-intent acceptance | Read authoritative Task; exact semantic retry only after ambiguity |
| 400 | Unambiguous target/header/JSON/protocol validation failure after safe framing | `after_correction` |
| 401 | Missing/invalid current authentication; at most one `WWW-Authenticate` challenge only when the selected H-05 profile defines it | `reauthenticate_or_reconnect`; never profile negotiation or weak fallback |
| 403 | Authenticated, disclosure-safe denial of action/authority | `never` until authority/policy changes |
| 404 | Resource absent, release absent, or deliberately collapsed non-disclosure | `never` for unchanged target; must not distinguish hidden existence |
| 405 | Known release resource with unsupported method; safe `Allow` only | `after_correction` |
| 406 | Exact response media/release unacceptable before bound operation | `after_correction`; no fallback negotiation |
| 408 | Server/intermediary abandoned incomplete HTTP request | Ambiguous for mutations; authoritative read/exact convergence |
| 409 | Disclosed lifecycle, binding, exact-intent, or immutable-decision conflict | `authoritative_read_required` or `after_correction`, as registered |
| 413 | Body or decoded representation exceeds selected bound | `after_correction`; never retry unchanged |
| 414 | Request target exceeds the selected bound | `after_correction`; never retry unchanged |
| 415 | Unsupported request media, charset, or content encoding | `after_correction`; no decoding fallback |
| 429 | Rate/resource pressure | Exact safe retry only with bounded delay and semantic idempotency |
| 431 | Header count, line, or aggregate bytes exceed the selected bound | `after_correction`; never retry unchanged |
| 500 | Undisclosed internal failure | Fail closed; mutation ambiguous unless evidence proves pre-commit |
| 502 | Trusted gateway received invalid/unavailable upstream response | Mutation ambiguous; exact read/retry rules only |
| 503 | Temporary service/storage/required-current-evidence unavailability, publicly collapsed | Same-request delay only when semantic retry safe; never use stale authority |
| 504 | Trusted gateway attempt timed out | Mutation ambiguous; authoritative read/exact retry only |

204 is not emitted because every successful Ghost Bridge operation in the
accepted model returns a bounded evidence/acknowledgement representation. 3xx
and 425 are not baseline success paths. HTTP status never replaces the stable
protocol error identity, and a 2xx does not override a denial encoded by an
accepted semantic resource model.

#### Accepted stable public error registry

Names and meanings in this table are part of the accepted Option B decision. The future
schema spelling and extension behavior still require H-13 and D1/D2 work. A
listed retry class is the maximum the error permits; the operation’s accepted
semantic idempotency may narrow it to `authoritative_read_required` or `never`
but can never widen it. “None” means no attacker-derived detail; the receiver
request ID remains.

| Accepted stable identity | Trigger after precedence | HTTP | Retry class | Maximum safe public detail |
| --- | --- | ---: | --- | --- |
| `MALFORMED_HTTP` | A safely reportable framing/header/target defect | 400 | `after_correction` | Coarse class only; otherwise close without an envelope |
| `INVALID_MESSAGE` | Strict UTF-8/JSON or registered semantic validation fails | 400 | `after_correction` | Registered field class, never value/path echo |
| `METHOD_NOT_ALLOWED` | Known disclosed resource does not support method | 405 | `after_correction` | Safe `Allow` set only |
| `UNSUPPORTED_RELEASE` | Exact pre-Connection release resource is unavailable and disclosure is safe | 404 | `after_correction` | None; discovery may be reread, no fallback |
| `NOT_ACCEPTABLE` | Exact response release media is not accepted | 406 | `after_correction` | None |
| `UNSUPPORTED_MEDIA` | Request media, charset, or content encoding is unsupported | 415 | `after_correction` | Coarse media/charset/encoding class, no alternatives oracle |
| `REQUEST_TARGET_TOO_LARGE` | Request target exceeds 8 KiB | 414 | `after_correction` | Limit class only |
| `HEADERS_TOO_LARGE` | Header count/line/aggregate bound exceeded | 431 | `after_correction` | Limit class only |
| `MESSAGE_TOO_LARGE` | Encoded/decoded body or representation bound exceeded | 413 | `after_correction` | Limit class and accepted bound only when safe to disclose |
| `AUTHENTICATION_REQUIRED` | Required profile evidence is absent or invalid | 401 | `reauthenticate_or_reconnect` | No missing/invalid axis; one selected-profile `WWW-Authenticate` challenge only if H-05 defines a safe form |
| `ACCESS_DENIED` | Authenticated caller is disclosed but lacks effective authority | 403 | `never` | Coarse operation class only |
| `RESOURCE_NOT_FOUND` | Object absent or caller lacks disclosure authority | 404 | `never` | None; same shape/treatment for collapsed causes |
| `RELEASE_BINDING_CONFLICT` | Disclosed Connection/request release differs from immutable binding | 409 | `never` | Bound-versus-request detail only if already authorized; default none |
| `LIFECYCLE_CONFLICT` | H-07/H-09 disclosed state cannot accept exact action | 409 | `authoritative_read_required` | Coarse resource/state category, not history/policy |
| `IDEMPOTENCY_CONFLICT` | Same identity is used for non-identical intent | 409 | `never` | None; no competing fingerprint or object detail |
| `APPROVAL_REQUIRED` | Exact authorized action requires a separately disclosed challenge | 409 | `after_correction` | Challenge reference only when its disclosure is authorized |
| `CURRENT_EVIDENCE_UNAVAILABLE` | Required H-11/current durable evidence is temporarily unavailable before side effect | 503 | `same_request_after_delay` | None; exact Trust/storage cause stays private |
| `REQUEST_TIMEOUT` | Server/gateway stopped receiving a complete request | 408 | `authoritative_read_required` for mutations | None |
| `RATE_LIMITED` | Fixed policy/resource-pressure class rejects before side effect | 429 | `same_request_after_delay` only when semantic replay is safe | Bounded retry delay; no quota/tenant detail |
| `SERVICE_UNAVAILABLE` | Temporary local dependency/service failure proven before side effect | 503 | `same_request_after_delay` | Optional bounded retry delay only |
| `COMMIT_STATUS_UNKNOWN` | Local/gateway failure leaves the accepted durable commit publicly ambiguous | 503 | `authoritative_read_required` | None |
| `UPSTREAM_FAILURE` | Trusted gateway cannot obtain a valid upstream response | 502 | `authoritative_read_required` for mutations | None; origin/cause hidden |
| `UPSTREAM_TIMEOUT` | Trusted gateway attempt expires | 504 | `authoritative_read_required` for mutations | None |
| `INTERNAL_FAILURE` | Unknown/unsafe internal cause | 500 | `authoritative_read_required` for mutations, otherwise `never` | None |

H-09 terminal outcomes and H-11 historical classifications do not receive
entries in this error registry: they remain successful authorized semantic
resource representations. An implementation may retain finer private cause
codes in the protected audit domain, but they cannot be accepted by a client as
public retry or authority evidence.

### 13. Failure precedence and disclosure

Internal evaluation order is accepted as:

1. HTTP parser framing validity, target/header count and byte limits, control
   characters, duplicate singleton fields, and transfer-coding ambiguity;
2. route-level method, content length, content encoding, media, bounded body,
   strict UTF-8/JSON syntax, duplicate keys, and release syntax;
3. exact configured origin/release/profile binding and supported operation;
4. authentication profile, proof freshness/replay, principal, issuer, audience,
   target, tenant, and purpose;
5. disclosure authorization before checking or exposing object existence;
6. current H-11 evidence, H-07 Connection state/scope, and structured
   authorization/policy at the Agent;
7. exact Approval, idempotency, lifecycle, and operation semantic validation;
8. one accepted atomic side effect/commit; then bounded representation/delivery.

Steps 1–2 occur before expensive authentication to resist smuggling and
resource exhaustion, but their public details remain generic. No semantic side
effect occurs before all applicable gates in steps 1–7 succeed. Internally, all
applicable causes may be recorded in the protected audit domain; one primary
public result is selected by the order above.

Public collapsing is intentional:

- missing or invalid authentication is 401 without principal/object detail and
  with at most one safe already-selected-profile `WWW-Authenticate` challenge;
- an authenticated caller lacking disclosure authority receives the same 404
  whether the object is absent, belongs to another tenant, or is hidden;
- a disclosed but unauthorized action is a coarse 403 without policy, Trust,
  Approval, scope, or revocation internals;
- stale/rollback-suspect/unavailable required Trust or durable security state
  can appear as generic 503 or 403 according to whether retry is safe, while
  private audit retains the exact H-11 cause;
- lifecycle/idempotency conflict becomes 409 only after disclosure is allowed;
- malformed input never echoes secrets, field values, supported alternatives,
  redirect destinations, or parser internals; and
- a Task terminal `failed`, `cancelled`, or `timed_out` and an H-11 historical
  classification are returned as authorized semantic resources, not rewritten
  as 4xx/5xx transport failures.

This order reduces object/tenant/state enumeration while allowing an authorized
caller to distinguish a correctable binding conflict from network ambiguity.
Timing and response-size equalization cannot be perfect; constant-shape safe
errors and coarse latency controls are residual mitigations, not claims of a
perfect side-channel defense.

### 14. Cache policy

| Resource class | Accepted HTTP cache policy | Authority rule |
| --- | --- | --- |
| Bootstrap discovery/release metadata | Public cache permitted with `max-age` no greater than 60 s and revalidation; response varies only on explicitly governed non-secret dimensions | Always non-authoritative; re-fetch and perform H-03/H-04/H-05/H-01 steps before commitment |
| Authentication, Grant, Connection, Approval, Invocation, Task, Result, Receipt | `Cache-Control: no-store`; no shared or browser cache | Durable authoritative reads go to the bound Agent under current evidence |
| Protocol errors and redirects | `no-store`; redirects are not followed | Cached denial/success never substitutes for current evaluation |
| Issuer metadata, keys, revocation evidence | Transport response uses `no-store` by default; application may retain only verified bytes/evidence under H-11 sequence, freshness, checkpoint, and durable-floor rules | Generic HTTP freshness, 304, CDN age, or stale-on-error never establishes H-11 current validity |
| Public immutable non-authority assets | Cache only when a later release names the asset/digest and proves transformation safety | Still cannot create Connection/action authority |

Cache keys must include exact origin, release, resource, and every later
governed representation dimension without credential or tenant leakage. Shared
caches must not store authenticated responses. `Vary: Authorization` is not a
substitute for `no-store`. Stale-if-error, cache revalidation failure, poisoned
discovery, or replayed revocation evidence never bypasses H-03/H-04/H-05/H-07/
H-11 checks. Intermediaries cannot transform bytes that H-10 later verifies.

### 15. Proxy, intermediary, browser, CORS, and CSRF rules

- Intermediaries may relay only one exact origin/release request and must
  preserve method, target, security headers, media, body bytes, status, and
  response bytes subject to normal hop-by-hop HTTP processing. They cannot
  negotiate, retry unsafe mutations, decompress/recompress signed inputs,
  rewrite semantic error identity, synthesize success, or cache authority.
- Hop-by-hop fields and HTTP/1 connection-specific fields are rejected where
  their presence is invalid for the negotiated HTTP version. Request trailers
  are not a baseline extension and are rejected.
- The external origin is fixed trusted configuration at TLS termination. An
  untrusted Host/forwarding field cannot construct discovery URLs, reset target
  binding, or select tenant/principal. Public base URLs are not derived from
  attacker input.
- A trusted gateway generates or preserves only the receiver-side request ID
  according to explicit hop rules. Peer IDs remain untrusted correlations and
  cannot overwrite internal IDs.
- Native browser operation is not supported by this baseline. Native endpoints
  do not enable credentialed CORS, ambient cookies, form submission, or
  cross-origin redirects. A product browser adapter is a separate same-site
  security boundary with explicit CORS allowlist, Origin/CSRF enforcement, no
  translation of browser session into broader Ghost Bridge authority, and the
  full downstream H-05/H-07 authorization checks.

### 16. Malformed and ambiguous HTTP

The recipient rejects or terminates before semantic evaluation when it sees:

- multiple/conflicting `Content-Length`, `Transfer-Encoding` plus
  `Content-Length`, unsupported transfer coding, invalid chunk syntax, request
  smuggling ambiguity, obsolete folding, invalid field names, embedded NUL/
  CR/LF/control characters, or a body/framing disagreement;
- duplicate security singleton headers, differing normalized Host/authority,
  connection-specific fields forbidden in optional H2 or a future selected H3
  profile, invalid pseudo-header ordering, or an authority that differs from
  the bound origin;
- request target/header/body limits exceeded, unsupported content encoding,
  invalid media/charset, invalid UTF-8, BOM, malformed JSON, duplicate JSON
  member names, multiple JSON values, non-whitespace trailing bytes, or a
  top-level type that the future envelope does not allow;
- any noncanonical target form described by the raw-target rules, including
  encoded delimiters/slashes/backslashes/controls, dot segments, repeated or
  empty separators, multiple decoding, case/Unicode aliases, or a route result
  that differs before and after proxy/runtime normalization;
- a body on a baseline `GET`, a response body where the method/status prohibits
  one, a missing required body, a truncated body, or bytes after the one
  bounded response; or
- decompression performed by a runtime despite baseline identity-only policy.

The connection is closed when an unambiguous safe response cannot be framed.
An unlisted `HEAD` or `OPTIONS` request reaches the safe 405 method rule and is
never normalized into `GET`, CORS/preflight authority, or another operation.
Optional H2 and future selected H3 equivalents are rejected at the stream or
connection level appropriate to their native framing; implementations must not
translate invalid H2/H3 input into an ambiguous HTTP/1.1 request. Error
construction itself observes the 16 KiB bound. Future normative JSON duplicate/
unknown-field interaction must preserve H-10 requirements and await H-13 for
extensibility.

### 17. Observability, redaction, logging, metrics, and tracing floor

#### Values prohibited from ordinary telemetry

Ordinary logs, metrics, traces, events, crash annotations, and public errors
never contain:

- `Authorization`, cookies, proxy credentials, bearer/session material,
  private/client keys, raw H-05 proofs, signature private material, or complete
  headers;
- Install Grant secrets, Approval secrets/proofs, reset/recovery secrets,
  idempotency secret material, or secret-bearing request/response bodies;
- unrestricted prompts, inputs, outputs, provider payloads, memory, reasoning,
  private policy, or protected Receipt content;
- signed objects or canonical bytes containing tenant/security metadata unless
  a separately protected audit requirement records only the necessary digest/
  reference;
- raw query strings, URL userinfo, redirect `Location`, full origin/hostname,
  arbitrary path segments, network metadata targets, or unredacted IP address;
- stack traces, internal exception/cause text, database/storage errors, policy
  rule names, Trust/revocation floor values, object-existence cause, or rejected
  input; or
- raw tenant/workspace/principal/Connection/Task/Result/Receipt/Approval IDs,
  trace baggage, or values linkable across tenants or forbidden scopes.

Redaction is allowlist-first, recursive, and applied before serialization to
the telemetry sink. Key-name deny patterns are defense in depth, not the only
control. Strings remove/escape C0/C1 controls, CR/LF, terminal escapes, and
unsafe directionality characters; fields and events are truncated on valid
UTF-8 boundaries to the limits above. Newlines never create a second record.
Structured sinks receive typed fields rather than interpolated text.

#### Safe ordinary fields

The baseline allowlist is: receiver-generated opaque request ID; operation
class (not raw route); exact protocol release; coarse outcome/status/retry
class; latency bucket; bounded request/response byte buckets; safe registered
error identity; retry count bucket; and a deployment/component identifier that
does not expose tenant or host origin. IDs needed for local diagnosis may use a
tenant-scoped, purpose-specific keyed digest rotated under deployment policy;
the same digest/key cannot link subjects across tenants or telemetry purposes.

Metrics labels are limited to fixed low-cardinality enums such as component,
operation class, release, outcome, status class, retry class, and bounded size/
latency buckets. No request/object ID, origin, IP, exception message, capability,
tenant, free-form error, or user input is a label. Cardinality and event rate
are bounded before export so attacker-selected errors cannot exhaust telemetry.

At an external trust boundary, the receiver starts a new tenant-scoped trace.
It may attach a validated peer `traceparent` as a non-authoritative link only
under explicit bilateral policy. It does not propagate peer `tracestate` or
`baggage`, and never puts credentials, semantic bodies, raw IDs, URLs, or error
causes in spans.

#### Audit versus ordinary operations

A security/audit ledger may retain exact semantic references, decisions,
digests, lifecycle causes, and H-11 classifications only when another accepted
decision/normative requirement requires them. It is tenant-isolated,
access-controlled, integrity-protected, purpose-limited, and separate from
ordinary logs/traces/metrics. It still never stores raw credentials, Grant
secrets, Approval proof, private keys, unrestricted content, or unnecessary
signed bodies. H-14 owns concrete retention periods, regional/storage policy,
operator access, deletion schedules, and incident-review commitments.

Public request IDs are opaque, random, non-authoritative, not user-derived, and
bounded; they can support a user-to-operator lookup without disclosing internal
trace or tenant topology. Security timing is reported only in coarse outcome
and latency buckets outside the protected audit domain.

## Accepted compatibility and migration impact of Option B

Option B is intentionally not wire-compatible with every current behavior:

- current unversioned Native Agent paths would need parallel exact-release
  handlers or an explicitly legacy-only adapter; they cannot be silently
  treated as the new release base;
- `application/json` and the historical version header would not satisfy the
  accepted exact media/path release binding;
- Native Client/Agent abort reporting must stop calling a local wait abort
  `TASK_CANCELLED` unless an authoritative H-09 Task says so;
- Native Agent request media/encoding and duplicate-key handling must become as
  strict as the accepted future contract;
- Native and Trust clients already reject redirects, while Platform safe fetch
  redirect behavior remains a separate Platform policy and cannot be reused for
  Governed protocol exchanges;
- current 256 KiB Native response readers would need to meet the accepted
  1 MiB mandatory response-support bound, while discovery’s historical 16 MiB
  advertisement would no longer imply larger-profile selection;
- proxies/frameworks that decode, case-fold, collapse, or otherwise normalize
  paths before exposing the original target would need a raw-target guard or
  could not claim the baseline route contract;
- clients/runtimes would need origin-keyed pools and control over HTTP/2
  coalescing, `Alt-Svc`, HTTPS/SVCB, resolver reuse, happy-eyeballs candidates,
  proxy tunnels, and QUIC migration;
- clients, servers, and required gateways would need the exact HTTP/1.1 binding
  even if they currently expose only H2/H3; optional H2 would need ALPN and
  same-origin H1 fallback without Ghost Bridge renegotiation; `h2c` and silently
  inferred H3 behavior would not qualify;
- H1/H2 translating proxies would need raw-target, singleton-header, body/media,
  error, limit, credential, and retry-equivalence evidence at both hops;
- 401 handling would need zero or exactly one selected-profile
  `WWW-Authenticate` challenge, while generic middleware that emits multiple
  schemes or proxy challenges would need isolation;
- NET-B deployments would need integrity-protected administrator origin/address/
  CA bindings established outside discovery; NET-A deployments could not label
  current private/on-prem reachability as baseline support;
- TLS status/pinning and its failure behavior would need an exact declared
  profile/support commitment rather than platform-dependent behavior;
- implementations rejecting requests below 256 KiB, ordinary responses below
  1 MiB, or configured baseline time budgets would need a distinct constrained
  profile and could not claim baseline interoperability;
- Express compression/body parsing/CORS, Platform-native error wrappers, API-key
  headers, and external-agent conventions remain outside the Native binding;
- Agent/Platform/Trust error shapes and statuses would need a release-specific
  adapter after H-13 and normative schemas are approved; and
- logging, trace propagation, forwarding, cache, DNS, and timeout configuration
  would require evidence at each implementation-under-test boundary.

Migration cannot rewrite or relabel `ghostbridge/0.1-draft` objects. A legacy
endpoint remains an explicitly identified legacy surface with its original
meaning and risks. A new release uses disjoint paths/media and creates new
Connections through H-01 through H-07; no automatic route, redirect, media
fallback, or stored-object conversion grants authority. Dual serving is allowed
only as isolated handlers with exact release identity and no shared silent
fallback. Rollout order, support windows, adapter retirement, deployed numeric
budgets, and residual-risk acceptance remain H-14 work.

Option A would reduce route/media migration but leave independent peers with
limit and policy mismatch. Option C would require a new streaming engine and
state/evidence assets before any safe migration. Option D alone would postpone
the interoperability migration rather than define it.

## Privacy consequences

Option B prevents ordinary emission of raw network targets, IP addresses,
credentials, URLs/query strings, headers, tenant/workspace/principal IDs,
Connection/Task/Result/Receipt/Approval IDs, unrestricted semantic content,
signed sensitive objects, trace baggage, and internal causes. It also prevents
shared caching of authenticated resources and cross-origin credential forwarding.

An opaque request ID, release, operation class, status/outcome/retry class,
latency/size bucket, and safe error identity remain observable. Even these can
reveal operation timing and service availability. Protected security audit may
retain necessary tenant-scoped semantic references/digests and precise H-11
classifications; that creates access, linkage, and breach risks. Source/destination
IP and external origin may still exist at network/TLS/load-balancer layers even
when absent from application telemetry. Coarse timing, constant-shaped errors,
tenant isolation, purpose-specific keyed digests, and separation of ordinary
telemetry from audit reduce but do not eliminate inference.

H-12 decides the minimum no-secret/no-cross-tenant-emission floor and safe
field/cardinality/sanitization rules. H-14 later decides retention periods,
regional storage, operator access, deletion, legal/privacy policy, security-log
exceptions, and support commitments. H-14 cannot authorize raw credential or
secret logging below the accepted H-12 floor without a superseding human
protocol decision.

## Threat analysis

| Threat | Accepted Option B control | Residual risk / review focus |
| --- | --- | --- |
| Credential leakage through redirects | Zero redirects; no credential forwarding; new origin requires new bootstrap/binding | Misconfigured non-protocol adapters or proxies can still leak credentials |
| HTTPS downgrade or weak fallback | Remote HTTPS only, no scheme/profile fallback, 3xx rejected | TLS termination and legacy adapters require deployment evidence |
| Disjoint HTTP-version support | HTTP-V1 makes the identical HTTP/1.1 binding mandatory for every baseline client/server | H1 support adds parser/framing surface even where an operator prefers H2-only infrastructure |
| ALPN/version confusion | ALPN selects framing only; optional H2 can fall back solely to same-origin H1 with every Ghost Bridge binding unchanged | Runtime/proxy negotiation bugs can misreport the actual protocol or perform an undeclared retry |
| Cleartext upgrade / silent H3 | Remote `h2c` prohibited; H3 requires an exact selected profile and cannot be inferred from hints/runtime/CDN | Loopback fixtures or intermediaries can accidentally expose non-baseline behavior |
| Proxy H1/H2 translation | Trusted translation preserves raw target, singletons, body/media/limits, errors, credentials, and no-retry/no-renegotiation rules | Different front/back parser behavior remains a desync and canonical-target risk |
| Bad certificate / MITM | Mandatory chain, hostname/SNI, and validity-time validation; TLS-B requires exact profile declaration for status/pinning and failure behavior | Trust-root compromise, CA mis-issuance, private-root governance, and selected soft-fail policy remain risks |
| Certificate-status variance | No opportunistic OCSP/CRL/stapling/platform/pin behavior under one claimed profile; selected hard-fail never downgrades | Runtime support can make a declared profile unavailable and status responders can become an availability dependency |
| DNS rebinding / mixed answers | Resolve/classify all, fail outside the selected public or exact NET-B scope, pin through connect, repeat for each connection | Resolver/OS/proxy behavior and address registry changes need vectors/review |
| Private-origin SSRF escape | Only exact integrity-protected prior administrator binding can select NET-B; discovery/requests/DNS cannot widen host/port/address scope | Compromised or overly broad administrator configuration can intentionally expose private services |
| SSRF / metadata service | Exact bound origin; metadata, link-local, multicast, unspecified, and equivalent class E targets always denied; no redirects/userinfo | New special-use ranges and trusted proxy egress implementation can drift |
| Non-redirect authority movement | Origin-keyed pools; no cross-origin coalescing; Alt-Svc ignored; SVCB restricted; validated happy-eyeballs; no baseline QUIC migration; exact CONNECT target | Hidden runtime/OS resolution, pool, QUIC, or proxy behavior may bypass application hooks |
| Host/authority confusion | Fixed external origin, exact Host/:authority/TLS/H-05 match, no attacker-derived public base URL | Incorrect trusted-proxy configuration remains dangerous |
| Proxy-header spoofing | Untrusted forwarding/client-IP/request-ID fields ignored for authority | A mistakenly trusted hop can spoof values |
| Request smuggling/desync | Reject CL duplicates, TE+CL, invalid transfer coding/folding/control, mismatched framing and protocol-version invalid fields | Front end/back end parser differences need malicious cross-hop cases |
| Path normalization/routing confusion | Count raw target; exact ASCII static paths; reject encoded delimiters, dot/repeated/empty segments, controls, aliases, and normalization before semantics | Some frameworks do not expose the original target, so unsuitable stacks may need a raw front-end guard |
| Header duplication/normalization | Security singleton occurrence and normalized-name checks before auth | Library APIs can hide original duplicates unless raw headers are inspected |
| Authentication challenge fallback | Zero/one `WWW-Authenticate` challenge only for the already selected H-05 profile; conflicting/multiple challenges never form a menu | A profile’s later challenge syntax can still leak unsafe parameters if not independently reviewed |
| Compression/decompression bomb | Identity content encoding only; encoded/decoded streaming caps before parse | Intermediary/runtime auto-decompression must be disabled and tested |
| Oversized JSON/parser exhaustion | Byte, depth, string, token, array, and member caps during strict tokenization | Unicode/token accounting and allocator amplification need cross-runtime tests |
| Slowloris/slow response | Shared monotonic attempt maximum, phase maxima, server acknowledgement budget, and bounded bytes | Network delay makes peer conformance hard to attribute; heterogeneous proxies may terminate ambiguously |
| Silent limit/timeout downgrade | Sender maxima equal mandatory receiver support; smaller limits/timeouts require a distinct explicit profile and cannot claim baseline | Constrained devices may be excluded from baseline and misadvertised deployment policy remains possible |
| Retry storm | Explicit retry classes, semantic safety gate, capped `Retry-After`, jitter and attempt/time budgets | Coordinated outages and client bugs still amplify load |
| Duplicate Invocation | Exact H-09 identity; 202 acceptance; ambiguity requires read/exact replay, never new identity | Durable lookup availability is required during incidents |
| Duplicate Approval consumption | H-08 atomic final-acceptance consumption; exact replay only | Implementations must prove conflict/commit atomicity |
| Ambiguous Install Grant redemption | H-06 exact-intent convergence and authoritative Connection read; fixed 200 result | Lost prebound identity or storage unavailability can require manual recovery |
| Disconnect interpreted as cancellation | Explicit non-equivalence and separate cancellation-intent resource | UI/client terminology can still mislead users |
| Status/error oracle | Auth before existence, disclosure gating, 404/403/503 collapsing, bounded safe details | Timing and response length can still reveal coarse distinctions |
| Tenant/object enumeration | No raw IDs in telemetry; non-disclosure 404; tenant-scoped audit/trace | User-selected IDs and traffic analysis remain possible |
| Secret logging | Allowlist-first structured telemetry and explicit never-log list | Third-party runtime/proxy/crash logs need separate verification |
| Log injection/control characters | Pre-emission control stripping/escaping, UTF-8-safe truncation, one structured event | Downstream renderers/exporters may interpret other Unicode unexpectedly |
| High-cardinality metrics attack | Fixed enum/bucket labels, no IDs/free text, bounded event rate | Excess series from release/component configuration still needs budgets |
| Trace propagation leakage | New tenant-scoped trace; baggage/tracestate rejected; peer trace only a governed link | Bilateral linking can correlate organizations and needs privacy review |
| Stale H-11 evidence via cache | Trust responses no-store; only H-11-verified application cache/floors can be used | Offline policy and durable storage failure remain H-11/H-14 risks |
| Cache poisoning | Exact origin/release key, no-store authority resources, discovery non-authoritative | Poisoned discovery can misdirect users before authenticated binding |
| Intermediary transformation of signed material | Exact media/identity encoding; no compression transformation; H-10 verifies semantic canonical bytes | Some proxies rewrite bodies/headers unless configured and tested |
| Partial request/response | Bounded complete document required; mutation remains ambiguous until reread/exact convergence | Response loss after commit remains inherent |
| Client or server crash | Socket state has no semantic meaning; durable accepted decisions govern restart | Durable store corruption/unavailability invokes H-07/H-11 fail-closed paths |
| Stale retry / revoked authority | Every request uses current evidence; closed/revoked/replaced Connection cannot revive | Long queues and clock skew must be included in conformance review |
| Error-detail privacy | Per-identity allowlisted detail, 16 KiB cap, no raw cause/input | A poorly registered “safe” detail can still become an oracle |
| Browser CSRF/CORS | Native browser support absent; no cookies/credentialed CORS | Product adapters remain separate attack surfaces |

## Rejected shortcuts and non-options

- **Copy the Native Agent routes/statuses.** They are incomplete, unversioned,
  and conflict with accepted H-03 and other repository surfaces.
- **Copy Platform safe-fetch or Express defaults.** They are deployment/product
  policies with redirects, compression, CORS, limits, and errors that differ
  from Native behavior.
- **Let HTTP libraries decide.** Automatic redirect, decompression, proxy,
  cookie, retry, duplicate-header, and timeout defaults differ across runtimes
  and can leak credentials or duplicate work.
- **Treat every 2xx as semantic success or every 5xx as retryable.** This breaks
  H-01/H-02/H-06/H-08/H-09/H-11 distinctions.
- **Put version only in an optional header or `Accept`.** Intermediaries can
  rewrite it and it becomes a second fallback negotiation path; the accepted
  exact path/media/Connection agreement is deliberate.
- **Use redirects for discovery or migration.** A redirect cannot transfer
  H-05 target or H-07 Connection authority.
- **Use disconnect as cancellation.** It contradicts H-09 and loses races after
  durable acceptance.
- **Enable generic gzip and bound only compressed bytes.** It admits expansion
  bombs and obscures H-10 input.
- **Log then redact at the sink.** Secrets already cross a boundary; allowlist
  and sanitization must occur before serialization/export.
- **Adopt RFC 9457 or any external convention by reference.** External
  standards inform design but do not decide Ghost Bridge fields, H-13 openness,
  authority, or retry semantics.
- **Select Option D without an exact HTTP binding.** It does not resolve H-12’s
  required wire-visible choices.

## Accepted residual risks of Option B

- Zero redirects, exact media, and release-bound paths impose deployment and
  migration cost and may conflict with commodity SaaS/CDN conventions.
- Mandatory HTTP/1.1 maximizes baseline reach but retains framing/smuggling
  attack surface and prevents H2/H3-only clients, servers, or gateways from
  claiming baseline interoperability.
- Optional H2 negotiation and trusted H1/H2 translation add ALPN, fallback,
  parser-equivalence, and proxy configuration failure modes even though they
  cannot change Ghost Bridge bindings.
- Fixed 256 KiB request and 1 MiB response sender/support bounds may be too small
  for some capabilities and exclude constrained peers that cannot meet the
  baseline; larger or constrained profiles add explicit compatibility branches.
- NET-B makes integrity and review of administrator-bound host/port/private-
  scope/CA configuration security-critical. A compromised administrator or
  overbroad scope can expose on-prem services even though discovery cannot.
- DNS validation and transport pinning remain difficult through proxies,
  happy-eyeballs, HTTP/2 coalescing, HTTPS/SVCB, OS second resolution, HTTP/3
  migration, and pooling; hidden runtime behavior can reopen SSRF/authority
  movement or reduce availability.
- Exact raw-target enforcement can exclude frameworks/proxies that normalize or
  decode before application code sees the original path.
- Certificate trust remains exposed to root-store compromise and termination
  mistakes. Accepted TLS-B makes selected status/pinning policy deterministic
  but can trade revocation assurance against responder/runtime availability.
- Omitting `WWW-Authenticate` for profiles without a safe challenge can reduce
  compatibility with generic HTTP authentication tooling; defining one later
  adds a public-detail surface that must not advertise alternatives or secrets.
- Strict rejection can cause availability failures when intermediaries rewrite
  headers/media or apply shorter limits/timeouts.
- The accepted server acknowledgement and client attempt budgets cannot remove
  network attribution ambiguity; local shorter waits and intermediary failure
  can still look like peer nonconformance.
- Transport ambiguity after a commit is inherent; safe recovery depends on
  durable H-06/H-08/H-09 identity and read availability.
- Public error collapse limits diagnostics and cannot eliminate timing/size
  side channels.
- Telemetry sanitization and tenant isolation can fail in proxies, runtimes,
  crash reporters, or third-party exporters outside the application boundary.
- No baseline streaming increases polling latency/load and delays Result or
  Receipt observation.
- Prohibiting compression increases bandwidth for large responses.
- Exact address-range tables, TLS production profiles, operational retry
  budgets, and retention still require H-14 evidence and ongoing maintenance.
- H-13 could change how unknown error/detail/envelope members are handled; H-12
  cannot complete that compatibility analysis in advance.

## Approved human dispositions

Rudra approved all 25 dispositions below as one coherent Option B decision:

1. Option B — Strict portable HTTP profile, retaining Option D’s strict
   semantic/HTTP separation.
2. Exact HTTPS origin binding, loopback-only plaintext test/development
   exception, exact `/ghostbridge/releases/{release-token}` release base,
   disjoint multi-release handlers, and no alias/downgrade behavior.
3. Raw-octet request-target accounting, exact case-sensitive ASCII static
   paths, single decoding, rejection of encoded delimiters/dot/repeated/empty
   segment ambiguity, route-before-decode handling, and H-13 ownership of future
   canonical authority-bearing resource-ID path-segment syntax.
4. The accepted operation/resource/method matrix and success categories,
   including 200 convergent Grant redemption, 202 Invocation acceptance and
   Task-cancellation-intent acknowledgement, and no generic `PATCH`, authority-
   changing query actions, or secret-bearing path segments.
5. Dedicated Ghost Bridge discovery/release JSON media types, exact H-03 release
   media parameter, strict UTF-8, no silent `application/json` fallback, and
   identity-only baseline `Content-Encoding`.
6. Exactly one selected H-05 `Authorization` presentation; no cookie/query/path/
   proxy/ambient authentication authority; singleton security-header handling;
   receiver-generated request IDs; and restricted trust-boundary trace
   propagation.
7. Zero or one `WWW-Authenticate` challenge only when the already selected H-05
   profile defines a safe representation; no alternative-profile advertisement,
   invented challenge, multiple-challenge fallback, or Ghost Bridge authority
   from proxy authentication.
8. Zero redirects for Ghost Bridge, authentication, Trust, issuer, key, and
   revocation operations; no cross-origin credential forwarding; and no HTTPS
   downgrade.
9. HTTP-V1: HTTP/1.1 is mandatory to implement for baseline clients and servers;
   HTTP/2 is optional through same-binding ALPN negotiation; optional H2 failure
   may fall back to H1 only before Ghost Bridge Authorization/proof/body
   transmission and only for the identical binding; post-request failures use
   normal ambiguity/retry semantics; HTTP/3 requires an explicitly selected
   future transport profile; remote `h2c` is prohibited; H1/H2 proxy translation
   preserves exact Ghost Bridge security and authority semantics; and `HEAD` and
   `OPTIONS` are not baseline semantic operations unless explicitly registered.
10. TLS-B: mandatory certificate-chain, exact hostname/SNI, and validity-time
    validation; no insecure verification, hostname suppression, plaintext
    fallback, or TLS downgrade; and certificate-status/pinning mechanisms plus
    missing/stale/unavailable failure behavior are explicitly declared by the
    selected release/profile/H-14 support commitment rather than varying
    silently.
11. NET-B: exact pre-approved administrator-bound private/on-prem origins with
    exact scheme/host/port/CA/address scope, authenticated HTTPS, all-answer DNS
    validation, connected-address validation/pinning, and H-05/H-07 binding; no
    discovery/request/DNS/proxy widening; permanent denial of class-E metadata,
    link-local, multicast, broadcast, unspecified, unsafe-transition/special-use,
    and equivalent non-peer destinations; and use of only explicitly approved
    private/unique-local ranges.
12. Non-redirect authority-movement controls for HTTP/2 coalescing, `Alt-Svc`,
    HTTPS/SVCB, happy-eyeballs/address racing, actual connected address, second
    resolution, pooling, proxy tunnels, and QUIC migration; none may alter
    H-03/H-04/H-05/H-07 authority.
13. No baseline Ghost Bridge application streaming. HTTP transfer chunking or
    HTTP/2/3 frames are bounded byte delivery only and never create H-09 Task or
    event states.
14. Transport abort, caller `AbortController` stop, TCP/HTTP disconnect, proxy
    timeout, failed response write, and local wait termination remain distinct
    from explicit H-09 Task cancellation. Ambiguous failures require
    authoritative reread or exact convergent retry under H-06/H-08/H-09.
15. The five retry classes and recorded treatment of 408, 409, 425, 429, 5xx,
    bounded delta-seconds `Retry-After`, and the rule that request/trace
    identifiers are never idempotency identity.
16. The accepted timeout model: bounded transport phases, 30-second absolute
    network-attempt maximum, ten-second server acknowledgement for bounded
    synchronous acceptance, shorter local caller waits that are not evidence of
    peer or semantic failure, no silent redefinition of baseline
    interoperability by deployment timeout policy, and separate H-09 deadlines.
17. Directional numeric interoperability limits: 256 KiB baseline request
    sender maximum and mandatory receiver support, 1 MiB ordinary-response
    sender maximum and mandatory client support, explicit H-04 selection for
    larger limits, a distinct explicit non-baseline profile for smaller
    constrained limits, and no baseline claim for silently lower limits.
18. Parse-as-you-limit behavior, bounded allocation/parsing, identity-only
    baseline content encoding, and no baseline compression/application-stream
    capability until an explicit future H-04 profile is governed.
19. The eight-way transport/HTTP/protocol/error taxonomy, deterministic HTTP
    status strategy, logical protocol error identity and fields, fail-closed
    unknown errors, and explicit H-13 schema/evolution ownership.
20. Internal failure evaluation ordering and deliberate public
    401/403/404/409/503 disclosure collapse, while H-09 terminal outcomes and
    H-11 historical verification classifications remain distinct semantic
    results.
21. Short HTTP caching only for explicitly non-authoritative discovery/release
    metadata; `no-store` for authority-bearing resources, errors, redirects,
    and sensitive responses; and H-11 verified freshness/rollback state as the
    only authority for Trust/revocation evidence reuse.
22. Trusted-proxy configuration, denial of authority from untrusted
    `Forwarded`/`X-Forwarded-*`/client-IP/Host-like metadata, no native browser/
    cookie/CORS/CSRF baseline, and separation of product/browser adapters from
    the Native protocol boundary.
23. Strict malformed and ambiguous HTTP rejection including framing, path,
    UTF-8, duplicate-key, duplicate security-header, `Content-Length`/
    `Transfer-Encoding` ambiguity, trailing-body, and unsafe-response framing;
    close without a detailed Ghost Bridge error when a safe error cannot itself
    be framed.
24. The minimum observability/security/privacy floor: never-log credential/
    secret/proof/private-key and sensitive semantic data; allowlist-first
    structured telemetry; sanitization, control-character handling, and bounded
    truncation; low-cardinality metrics; tenant-isolated tracing; trace baggage
    restrictions; protected audit separation; and H-14 ownership of retention
    and operational policy without authority to weaken the H-12 no-secret
    emission floor absent superseding governance.
25. The complete recorded compatibility and migration impact, privacy
    consequences, threat analysis, security impact, and residual risks, while
    preserving that H-12 acceptance creates protocol-governance decision
    authority only.

## Independent-review correction cross-check

| Boundary checked | Correction-pass result |
| --- | --- |
| H-01 through H-11 | All accepted records remain unchanged and binding; the correction adds transport representation choices only |
| Private/on-prem SSRF | NET-B requires exact integrity-protected prior administrator binding and cannot be enabled/widened by discovery, requests, DNS, redirects, proxies, or Platform policy; class E remains denied |
| H-05/H-07 transport authority | Coalescing, alternative-service/DNS hints, racing, resolution, pooling, tunnels, and migration cannot change exact origin, target, credentials, release, or Connection binding |
| HTTP/ALPN floor | HTTP-V1 makes H1 mandatory, confines optional H2 fallback to the identical binding, and requires an explicit future profile for H3; ALPN/translation cannot renegotiate H-03/H-04/H-05/H-07 values |
| 401 challenge placement | `Authorization` stays the single request presentation; zero/one selected-profile `WWW-Authenticate` challenge cannot advertise or negotiate alternatives; proxy auth is non-authoritative |
| Request-target ambiguity | Raw target is bounded and canonicalized by rejection before routing/semantics; no normalization creates a more permissive resource interpretation |
| H-04 limits | Baseline sender/support bounds cannot be lowered by an operation hint; larger and constrained limits require exact distinct selected profiles with no fallback |
| H-09 timeout/cancellation | Network/server/deployment/caller timers remain distinct from Task deadline, terminal state, and explicit cancellation intent |
| H-10 canonical bytes | Raw/decoded path, HTTP version/framing, media, transfer, and content encoding remain outside H-10 semantic projection/canonicalization |
| H-11 Trust/cache | TLS transport choices do not change issuer/revocation freshness, durable floors, cache, rollback, historical classification, or fail-closed authority |
| H-13 | Schema openness, extension/unknown behavior, and future semantic/resource-ID syntax remain unresolved H-13/D1/D2 ownership |
| H-14 | Final support windows, exact deployed profiles, retention, review evidence, risk acceptance, publication, release, and Protocol 1.0 authority remain unresolved |
| Gap status | `GB-014`–`GB-017`, `GB-034`–`GB-041`, `GB-047`, and `GB-049` remain open |

## Deferred work and boundaries

- **H-13 remains unresolved:** schema openness, unknown fields/enums/messages,
  extension namespaces, error-envelope extensibility, and evolution behavior.
- **H-14 remains unresolved:** supported release windows, exact final production
  TLS/timeout/rate profiles, operational retention, rollout/support commitments,
  release evidence, independent-review gates, residual-risk acceptance,
  publication, release, and Protocol 1.0 graduation.
- **D1 work** may express stable normative requirements only in a separately
  authorized normative-specification stage that cites and consumes accepted
  H-12.
- **D2 work** may later create schemas, state machines, fixtures, malicious
  vectors, and conformance cases derived from approved requirements; this record
  creates none.
- **E-02/P1-03** retain implementation and independent-review gates. Required
  review includes raw-header behavior, cross-protocol framing, DNS pinning,
  TLS/proxy topology, decompression disablement, ambiguous commit recovery,
  cache/H-11 integration, and telemetry at every hop.
- **Later D2/P1 target cases** must include NET-A/NET-B provenance and private-
  scope escape, certificate-status mode/failure behavior, HTTP/2 coalescing,
  `Alt-Svc`, HTTPS/SVCB, happy-eyeballs/connected-address mismatch, second DNS
  resolution, pool-key confusion, proxy tunnels, QUIC migration, and the full
  raw-target/path-normalization/smuggling matrix. They must also test both sides
  of sender/receiver support bounds and timeout/caller-abort non-equivalence.
  This decision creates none of those artifacts.
- **HTTP/authentication representation cases** must later cover H1-only baseline
  interop, H1↔H2 ALPN, failed optional H2 with same-binding H1 fallback, `h2c`
  rejection, H2 cross-origin coalescing denial, security-preserving proxy H1/H2
  translation, H3 not silently enabled, and no H-03/H-04/H-05/H-07 change from
  transport negotiation. They must also cover absent/single/multiple/conflicting
  `WWW-Authenticate`, no alternative-profile advertisement, and proxy-auth
  non-authority. This decision creates no case or fixture.

## Human approval checklist

- [x] Confirm the reviewer read the complete accepted H-01 through H-11
      dependency/conflict ledger.
- [x] Approve Option B and every recorded qualification as one coherent
      disposition; the unselected alternatives remain rationale only.
- [x] Approve resource/version/method/status/media and multi-release behavior.
- [x] Select HTTP-V1: mandatory H1, optional same-origin ALPN H2,
      pre-request same-binding H1 fallback, post-request ambiguity, separately
      selected H3, remote `h2c` rejection, H1/H2 proxy translation constraints,
      and unlisted HEAD/OPTIONS 405.
- [x] Approve the raw request-target/path canonicalization and future H-13
      resource-ID encoding boundary.
- [x] Select NET-B and approve the private/on-prem target provenance,
      prior administrator binding, address-scope, and permanent unsafe-target
      exclusions.
- [x] Approve one `Authorization` presentation plus zero/one selected-profile
      `WWW-Authenticate` challenge, with no alternative authentication,
      multiple-challenge fallback, or proxy-auth authority.
- [x] Approve zero redirects and select TLS-B with exact certificate-status/
      pinning declaration ownership.
- [x] Approve non-redirect authority-movement controls for coalescing,
      alternative-service/DNS hints, racing, resolution, pooling, tunnels, and
      QUIC migration.
- [x] Approve DNS/SSRF, trusted-proxy, and browser boundaries without promoting
      a Platform allowlist to protocol law.
- [x] Approve no baseline streaming and the transport-abort versus
      Task-cancellation semantics.
- [x] Approve retry/idempotency and the directional client/server/local/
      deployment/H-09 timeout semantics and exact baseline numbers.
- [x] Approve sender maxima, mandatory receiver-support bounds, local ceilings,
      larger H-04 profiles, and distinct constrained-profile rules; confirm a
      silent lower bound cannot claim baseline interoperability.
- [x] Approve error taxonomy, HTTP mapping, precedence, public collapse, and
      retry classes.
- [x] Approve cache, observability, redaction, privacy, and audit boundaries.
- [x] Accept documented compatibility/migration impact and residual risks.
- [x] Record accountable human approver/governance identity and unambiguous date.
- [x] Record exact approved option/qualifications, accepted risks, compatibility
      impact, security impact, and durable sign-off/reference.
- [x] Confirm every affected `GB-*` gap remains open until separately authorized
      requirements and evidence close it.
- [x] Confirm acceptance does not itself create normative/schema/OpenAPI/state-
      machine/fixture/vector/implementation/migration/deployment/conformance/
      publication/release/Protocol 1.0 authority.

## Human disposition block

- **Approver:** Rudra
- **Approval date:** 2026-08-10
- **Approved option:** Option B — Strict portable HTTP profile with
  semantic/HTTP separation
- **Approved qualifications:** The complete corrected Option B semantics and
  all 25 human dispositions, including zero redirects, HTTP-V1, TLS-B, and
  NET-B.
- **Accepted risks:** The complete accepted residual-risk section recorded in
  H-12.
- **Compatibility impact accepted:** The complete compatibility and migration
  impact recorded in H-12.
- **Privacy consequences accepted:** The complete privacy consequences recorded
  in H-12.
- **Security impact accepted:** The complete security and threat impact recorded
  in H-12.
- **Sign-off/reference:** `H-12-human-approval-rudra-2026-08-10.txt`; SHA-256:
  `4D5B771935555A0DF83ECADC07FBE854434E36C2E8568FCB9233489EA193403E`
- **Resulting status:** `ACCEPTED`

## Durable human-approval evidence

- **Human approval source:** `H-12-human-approval-rudra-2026-08-10.txt`
- **Verified SHA-256:**
  `4D5B771935555A0DF83ECADC07FBE854434E36C2E8568FCB9233489EA193403E`

Exact human approval statement:

```text
I, Rudra, approve H-12 Option B — Strict portable HTTP profile with semantic/HTTP separation — together with the complete corrected Option B semantics and all 25 human dispositions recommended in the final independent review. In particular, I approve zero redirects, HTTP-V1 as the mandatory HTTP/1.1 interoperability floor with the recorded optional H2 and separately selected H3 rules, TLS-B for certificate-status/pinning declaration ownership, and NET-B for exact administrator-bound private/on-prem origins with permanent class-E unsafe-target denial. I also accept all residual risks, compatibility and migration impact, privacy consequences, threat analysis, and security impact recorded in the H-12 proposal. I understand that this approval establishes H-12 protocol-governance decision authority only and does not itself close GB-014–GB-017, GB-034–GB-041, GB-047, or GB-049, or authorize normative specification, OpenAPI, schemas, state machines, fixtures, vectors, implementation, migration, deployment, conformance, publication, release, or a Protocol 1.0 claim.
```

The approval source remains intentionally inside `.git` and outside tracked
repository content. This record stores its filename, verified digest, and exact
human statement without copying or staging the source as a tracked artifact.

## Consequences of acceptance

Acceptance establishes only the selected H-12 protocol-governance decision as
input to separately authorized work. It does not itself:

- close `GB-014`–`GB-017`, `GB-034`–`GB-041`, `GB-047`, or `GB-049`;
- create or modify normative specification, schema, OpenAPI, state machine,
  fixture, vector, conformance case, or implementation;
- change a route, parser, middleware, fetch client, DNS/TLS/proxy setting,
  timeout, retry, cache, telemetry sink, test, or deployed behavior;
- migrate or relabel a legacy release/object or authorize dual-serving;
- prove conformance or complete independent review;
- authorize staging, commit, push, PR, merge, deployment, publication, or
  release; or
- establish Protocol 1.0.

Later normative requirements would need stable IDs and traceability to all
applicable accepted H-01 through H-12 records. Later H-13/H-14 decisions and
separately authorized D2/E/P work would still be required.

## Final decision status

H-01 through H-12 are `ACCEPTED`. H-01 through H-11 are unchanged. H-13 and
H-14 remain unresolved. `GB-014`–`GB-017`, `GB-034`–`GB-041`, `GB-047`, and
`GB-049` remain open. H-12 acceptance creates no normative specification,
OpenAPI, schema, state-machine, fixture, vector, implementation, migration,
deployment, conformance, publication, release, or Protocol 1.0 authority.

**H-12 is ACCEPTED.**
