# Transport

This chapter defines the transport-independent delivery boundary and the exact
HTTP binding for `ghostbridge/e1.r0-draft.1`. It defines observable transport
semantics, not JSON member names, OpenAPI, a transport implementation, a new
authority source, or an executable route registry.

## REQ-TRAN-0001 - Transport and protocol semantics remain non-equivalent

**Requirement.** Implementations MUST preserve all of these non-equivalences:
HTTP success is not authentication, authorization, Connection authority, Task
success, or Trust validity; transport failure is not proof of noncommit; a
client wait abort or TCP/HTTP disconnect is not Task cancellation; HTTP
transfer chunking is not application streaming; HTTP cache freshness is not
H-11 freshness; a request, trace, or correlation identifier is not idempotency
or authority; HTTP status is not Task lifecycle state; and transferred bytes
are not H-10 canonical semantic bytes. Transport MUST NOT create, widen,
restore, transfer, consume, revoke, or prove protocol authority.

**Applies to.** Every Ghost Bridge request, response, transport adapter,
intermediary, cache, retry, timeout, disconnect, and protocol-version binding.

**Lifecycle/state impact.** Transport observations cause no protocol lifecycle
transition. Only an owning semantic operation's accepted durable boundary may
change state.

**Semantic failure.** An implementation that derives authority, Task outcome,
commit state, cancellation, idempotency, Trust, or H-10 meaning from transport
alone MUST fail closed and MUST NOT perform a new effect or state transition.

**Sources:** H-01, H-02, H-05, H-07, H-09, H-10, H-11, H-12. **Gaps:**
GB-037, GB-038.

## REQ-TRAN-0002 - Exact origin and release binding

**Requirement.** Remote Governed resources MUST use authenticated HTTPS. Plain
HTTP MAY be used only in an explicitly enabled test/development mode when the
configured hostname and every resolved and connected address are loopback;
that mode MUST NOT issue, create, recover, or exercise production or Governed
authority.

The transport origin MUST be the exact scheme, canonical host, and effective
port from integrity-protected authenticated or preapproved configuration and
the applicable H-05/H-07 binding. `Host`, `:authority`, `Forwarded`,
`X-Forwarded-*`, discovery, DNS, a redirect, or an environment proxy MUST NOT
independently create or change that origin. Remote default port is 443; a
nondefault port MUST be an exact preconfigured and authenticated target value.
Configured origins MUST NOT contain URL userinfo or fragments, and MUST NOT
contain a query unless a later exact read operation expressly defines
non-authority query members.

Bootstrap discovery MUST be exactly `GET /.well-known/ghostbridge`.
Release-specific resources MUST use exactly
`/ghostbridge/releases/{release-token}`, where `{release-token}` is the exact
H-03 release identity after removal of the leading `ghostbridge/`. Thus
`ghostbridge/e1.r0-draft.1` maps one-to-one to `e1.r0-draft.1`. A release token
MUST NOT be selected through an alias, `latest`, case folding, Unicode
lookalike, percent-encoded alternate, redirect, compatible-release inference,
or handler fallback. The path release, media release, and any immutable
Connection-bound release MUST agree exactly. One origin MAY serve several
releases only at disjoint exact bases.

**Applies to.** Bootstrap discovery, every release resource, configured Agent
and issuer origins, reverse-proxy deployments, and Connection-bound requests.

**Lifecycle/state impact.** Origin and release validation selects a candidate
handler only. It creates no Connection or negotiation transition and MUST NOT
reinterpret an existing Connection.

**Semantic failure.** An unknown safe-to-disclose pre-Connection release base
uses the accepted 404/`UNSUPPORTED_RELEASE` mapping. An already disclosed
Connection release mismatch uses the accepted 409/
`RELEASE_BINDING_CONFLICT` mapping. Either failure MUST NOT negotiate,
downgrade, redirect, retry automatically, or move authority.

**Sources:** H-01, H-03, H-05, H-07, H-12. **Gaps:** GB-004, GB-005,
GB-037, GB-038, GB-039.

## REQ-TRAN-0003 - Canonical raw request target and routing

**Requirement.** A raw request target exceeding 8 KiB, including path, a
literal query delimiter, and query, MUST be rejected. For an accepted target at
or below 8 KiB, the receiver MUST validate the complete raw received target
before percent decoding, Unicode decoding, routing, logging, or framework
normalization. It MUST NOT validate only an accepted prefix and ignore or
reinterpret trailing target bytes. The baseline accepts one origin-form
target. A literal first `?` MAY separate path and query only for an operation
that expressly permits query; additional literal or percent-encoded `?` or `#`
delimiter forms and fragments MUST be rejected. Query values MUST NOT carry
credentials, secrets, release/profile selection, principal, tenant,
Connection, scope, Approval, idempotency, or other authority-changing values.

Every static component MUST be exact case-sensitive ASCII with `/` as the only
separator and no percent escapes. A receiver MUST reject raw non-ASCII path
octets, literal backslash, percent-encoded slash or backslash, invalid or
incomplete escapes, encoded NUL or control bytes, recursive or double decoding,
`.` or `..` segments and encoded equivalents, repeated separators, empty
segments, trailing empty segments, and any normalization into another route.
It MUST validate route structure and raw segment boundaries before decoding an
eligible data segment and MUST match static components without decoding.

A future authority-bearing resource identifier MAY be decoded exactly once
only after its raw segment passes the D2-defined canonical encoding and
reencode-equality rule. This chapter MUST NOT invent that identifier syntax.
Canonical target validation selects a resource only; path bytes, query,
framing, and router parameters MUST NOT replace H-10 semantic projection or
the later exact object binding. An intermediary that normalizes first MUST NOT
serve the baseline unless it preserves and validates the original target and
proves identical rejection at every hop.

**Applies to.** HTTP/1.1 request targets, HTTP/2 or later `:path`, proxies,
routers, framework adapters, release bases, static routes, and resource-ID
segments.

**Lifecycle/state impact.** Target validation occurs before semantic lookup or
state use and causes no lifecycle transition.

**Semantic failure.** Noncanonical, ambiguous, over-limit, or normalized input
MUST be rejected before authentication, disclosure, state mutation, or effect;
if a safe response is available it uses the accepted target/framing error,
otherwise the connection is closed.

**Sources:** H-03, H-10, H-12, H-13. **Gaps:** GB-038, GB-040, GB-041,
GB-042.

## REQ-TRAN-0004 - Accepted operation and resource matrix

**Requirement.** `{b}` MUST mean the exact release base from REQ-TRAN-0002.
The baseline HTTP operation set MUST be exactly this matrix. Each listed
success MUST carry the required bounded body; status, retry treatment, and a
resource identifier MUST NOT independently confer authority or disclosure.

| Operation class                             | Exact method and resource                                                                                                          | Success and body                                     | Retry and ambiguity                                                                                                                    | Required authority                                                                          | Principal public status classes         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------- |
| Bootstrap discovery                         | `GET /.well-known/ghostbridge`                                                                                                     | 200; body required                                   | Safe reread; cached data non-authoritative                                                                                             | None; no Connection                                                                         | 400, 404, 406, 429, 5xx                 |
| Release metadata                            | `GET {b}`                                                                                                                          | 200; body required                                   | Safe reread                                                                                                                            | None; non-authoritative                                                                     | 404/406, 429, 5xx                       |
| Agent Passport                              | `GET {b}/passport`                                                                                                                 | 200; body required                                   | Safe reread; H-11 verification still required                                                                                          | As selected by release; no authority from read                                              | 401/403/404, 429, 5xx                   |
| Capability collection/item                  | `GET {b}/capabilities` or `GET {b}/capabilities/{id}`                                                                              | 200; body required                                   | Safe reread; preview non-authoritative                                                                                                 | Authentication if profile requires; no Connection for preview                               | 400, 401/403/404, 429, 5xx              |
| Authentication establishment                | `POST {b}/authentications`                                                                                                         | 200; body required                                   | Only the selected H-05 profile's exact transcript/replay rule; otherwise restart without fallback                                      | Exact H-05 target/profile/principal binding                                                 | 400/401/403, 409, 429, 5xx              |
| Authentication refresh                      | `POST {b}/authentications/{id}/refreshes`                                                                                          | 200; body required                                   | Same exact refresh intent only; failure grants no extension                                                                            | Current profile evidence; target bound                                                      | 401/403/404, 409, 429, 5xx              |
| Install Grant issue                         | `POST {b}/install-grants`                                                                                                          | 201; secret-bearing body required                    | No blind retry; exact administrative idempotency required                                                                              | Issuer/admin authority, not a Connection shortcut                                           | 400/401/403/404, 409, 429, 5xx          |
| Install Grant resolution/preview            | `POST {b}/install-grant-resolutions`                                                                                               | 200; body required                                   | Exact safe reread; non-authoritative                                                                                                   | H-06 disclosure/authentication; no Connection authority                                     | 400/401/403/404, 409, 429, 5xx          |
| Grant redemption/Connection creation        | `POST {b}/connections`                                                                                                             | 200; body required for first commit and exact replay | Exact H-06 intent only; after ambiguity use exact convergence or an authenticated read by a returned/prebound identity where available | Exact H-05 evidence and H-06 Grant; no prior Connection                                     | 400/401/403/404, 409, 429, 5xx          |
| Connection read                             | `GET {b}/connections/{id}`                                                                                                         | 200; body required                                   | Safe authenticated reread                                                                                                              | Exact principal/tenant disclosure scope and current evidence                                | 401/403/404, 409, 429, 5xx              |
| Connection transition/close/replace request | `POST {b}/connections/{id}/transitions`                                                                                            | 200; body required                                   | Exact H-07 transition intent only; after ambiguity authoritative reread                                                                | Current Connection/principal/authorization as H-07 requires                                 | 400/401/403/404, 409, 429, 5xx          |
| Invocation acceptance                       | `POST {b}/invocations`                                                                                                             | 202; acceptance body required                        | Exact H-08/H-09 identity; after ambiguity read Task or repeat exact request, never create a new identity                               | Active H-07 Connection, current H-05/H-11 evidence, authorization, and Approval if required | 400/401/403/404, 409, 413/415, 429, 5xx |
| Approval Challenge read                     | `GET {b}/approval-challenges/{id}`                                                                                                 | 200; body required                                   | Safe authorized reread                                                                                                                 | Exact principal/tenant/disclosure scope                                                     | 401/403/404, 409, 429, 5xx              |
| Approval Decision                           | `PUT {b}/approval-challenges/{id}/decision`                                                                                        | 200; body required                                   | Same exact Decision may converge; conflict is 409; not Approval consumption                                                            | Exact Decision authority and Challenge binding                                              | 400/401/403/404, 409, 429, 5xx          |
| Approval-bearing Invocation                 | `POST {b}/invocations`                                                                                                             | 202; acceptance body required                        | Exact H-08/H-09 retry; consumption atomic at final acceptance                                                                          | All Invocation gates plus exact unconsumed Approval                                         | 400/401/403/404, 409, 429, 5xx          |
| Task retrieval                              | `GET {b}/tasks/{id}`                                                                                                               | 200; body required                                   | Safe authorized reread; polling hints advisory                                                                                         | Exact disclosure authorization and current evidence                                         | 401/403/404, 409, 429, 5xx              |
| Task cancellation intent                    | `POST {b}/tasks/{id}/cancellation-intents`                                                                                         | 202; acknowledgement body required                   | Exact intent retry may converge; status does not promise cancellation won                                                              | H-09 cancellation authority and current evidence                                            | 400/401/403/404, 409, 429, 5xx          |
| Result retrieval                            | `GET {b}/results/{id}`                                                                                                             | 200; body required                                   | Safe authorized reread; immutable once created                                                                                         | Exact disclosure authorization and current evidence                                         | 401/403/404, 409, 429, 5xx              |
| Receipt retrieval                           | `GET {b}/receipts/{id}`                                                                                                            | 200; body required                                   | Safe authorized reread; proof may materialize idempotently under H-09/H-10                                                             | Exact disclosure authorization; historical read is not current authority                    | 401/403/404, 409, 429, 5xx              |
| Issuer metadata                             | `GET /.well-known/ghostbridge-issuer` on the exact issuer origin                                                                   | 200; body required                                   | Safe fetch with H-11 freshness/rollback evaluation; transport cache insufficient                                                       | Public or H-11 disclosure; no Connection authority                                          | 404/406, 429, 5xx                       |
| Keys/revocation evidence                    | Exact same-origin resources selected by verified issuer metadata, such as `{issuer-base}/keys` and `/revocation-snapshots/current` | 200; body required                                   | Conditional/safe reread only; H-11 chain, freshness, and floor decide usability                                                        | H-11 verification; HTTP success grants no authority                                         | 401/403/404, 409, 429, 5xx              |

Generic `PATCH`, query-string action names, secret-bearing path segments, and
unlisted baseline operations MUST NOT be introduced. Resource-ID possession
MUST NOT authorize access. Connection replacement still follows the complete
H-07 workflow and MUST NOT be inferred to be one standalone transition.

**Applies to.** Every baseline Client, Agent, issuer, Trust-resource server,
gateway, and HTTP adapter.

**Lifecycle/state impact.** Only the owning operation's accepted semantic
commit has its previously defined state effect. HTTP dispatch and success have
none independently.

**Semantic failure.** An unlisted method/resource, missing or unexpected body,
unsafe resource lookup, or operation whose authority guards fail MUST be
rejected under the accepted precedence without fallback, state mutation, or
protected existence disclosure.

**Sources:** H-01, H-05, H-06, H-07, H-08, H-09, H-10, H-11, H-12.
**Gaps:** GB-004, GB-009, GB-013, GB-018, GB-020, GB-022, GB-023, GB-025,
GB-029, GB-031, GB-038.

## REQ-TRAN-0005 - Exact media, UTF-8, and finite JSON bodies

**Requirement.** Bootstrap discovery MUST use
`application/vnd.ghostbridge.discovery+json`. Release resources in this draft
MUST use exactly
`application/vnd.ghostbridge+json; release="ghostbridge/e1.r0-draft.1"`.
Every request with a body MUST carry the exact applicable `Content-Type`; a
bodyless request MUST omit `Content-Type`. `Accept` MUST include the exact
selected response media type and release. Wildcards and `application/json`
MUST NOT act as fallback. An unacceptable response media/release uses 406;
unsupported request media uses 415.

JSON MUST be strict UTF-8 without a byte-order mark or transcoding fallback. An
emitter MUST omit `charset`; a recipient MAY accept exactly one case-
insensitive `charset=utf-8` parameter and MUST reject every other charset or
duplicate/conflicting parameter. Baseline `Content-Encoding` MUST be identity;
baseline compression and runtime automatic decompression are prohibited. The
baseline has no application streaming. HTTP transfer chunking MAY carry one
finite, bounded JSON document but MUST NOT create application frames, events,
partial semantic success, or another body.

A future compression or application-stream feature is eligible only through
an exact H-04-selected feature/profile with release-specific limits, H-13
framing and evolution rules, later D2 executable assets, and independent
review. HTTP `TE`, `Accept-Encoding`, runtime capability, proxy behavior, and
implementation defaults MUST NOT implicitly select such a feature. A future
compression profile MUST independently bound compressed bytes, decompressed
bytes, expansion ratio, CPU/time, and nested payloads before parsing; this
release defines no future numeric value for those bounds. The absence of
baseline compression or streaming MUST NOT prohibit such an explicitly
selected and independently reviewed future feature.

**Applies to.** Every request, success response, safe error response, JSON
parser, content decoder, and transfer adapter.

**Lifecycle/state impact.** Media and body validation precedes semantic state
use. Transfer completion does not commit or stream protocol state.

**Semantic failure.** Wrong or missing required media, unacceptable response
media, unsupported encoding/charset, BOM, invalid UTF-8, malformed or multiple
JSON values, or trailing bytes MUST reject before semantic effect. Unsupported
compression MUST return 415 when safely frameable without decompression.

**Sources:** H-03, H-10, H-12, H-13. **Gaps:** GB-038, GB-040, GB-041.

## REQ-TRAN-0006 - Authentication and security-sensitive headers

**Requirement.** Per-request authentication MUST use exactly one
`Authorization` occurrence under the already selected H-05 profile plus only
that profile's registered proof fields. Authentication material MUST NOT occur
in query, path, URL userinfo, cookies, traces, or logs. `WWW-Authenticate` MUST
have zero or one field occurrence and MAY contain exactly one safe challenge
only when the already selected H-05 profile defines it. It MUST NOT advertise
or negotiate another profile, issuer, target, weaker mode, or `none`. If
multiple or conflicting `WWW-Authenticate` occurrences or challenges are
received, the recipient MUST ignore and discard every challenge value, MUST
treat the challenge representation as invalid, and MUST retain only the safely
parsed generic 401/`AUTHENTICATION_REQUIRED` outcome. It MUST NOT select,
negotiate, retry, or fall back to any authentication profile from those values.

`Proxy-Authenticate` and `Proxy-Authorization` MUST NOT be Ghost Bridge
authority. Ambient cookies, browser credentials, client certificates, and
environment proxy credentials MUST NOT provide baseline authority. Every
release/profile-defined security-relevant singleton field MUST occur exactly
once when required and at most once when optional or present. It MUST NOT be
joined, selected first/last, or repaired. HTTP field names use HTTP case-
insensitive comparison. Profile and security values MUST NOT be case-folded,
rewritten, trimmed into a different value, or otherwise normalized into
another semantic binding. `Host`/`:authority`, the TLS server name, the
requested origin, and the H-05 target MUST remain consistent with the one exact
configured origin. This requirement does not define H-05 challenge syntax.

At each external request boundary the receiver MUST generate a fresh bounded
opaque `Ghostbridge-Request-Id`. A peer correlation value is separate,
untrusted correlation only. If a later D2 representation places an
`Idempotency-Key` in HTTP, it MUST exactly equal the authoritative semantic
identity; mismatch MUST be 400, and the header MUST NOT become the source of
idempotency truth or authority. A receiver MUST NOT accept peer `tracestate` or
`baggage`; it MAY retain a validated `traceparent` only as a non-authoritative
link under explicit bilateral observability policy.

**Applies to.** Authentication establishment and current requests, responses,
proxies, browsers, correlation, idempotency carriers, and tracing boundaries.

**Lifecycle/state impact.** Header validation and correlation create no
authentication result, Connection, idempotency outcome, Task, or trace
authority.

**Semantic failure.** Missing required authentication follows the safe 401
mapping. Duplicate, conflicting, misplaced, or fallback-driving security
fields MUST fail before disclosure or effect; values MUST NOT be echoed or
forwarded to another authority.

**Sources:** H-02, H-05, H-07, H-09, H-12. **Gaps:** GB-007, GB-013,
GB-014, GB-036, GB-038.

## REQ-TRAN-0007 - Zero redirects and no credential forwarding

**Requirement.** The redirect count for every baseline operation MUST be zero.
Every 3xx response, including 301, 302, 303, 307, and 308, MUST be a terminal
HTTP-layer failure for that attempt, MUST be `no-store`, MUST NOT be followed,
and MUST NOT be cached, regardless of origin equality or method preservation.
The Client or intermediary MUST NOT forward the request body, `Authorization`,
Grant, Approval, proof, cookie, credential, Connection context, or other
protected material to the `Location`. A redirect `Location` MUST NOT appear in
public error detail.

A different origin MAY be considered only as a new non-authoritative candidate
through the normal H-01 target, H-05 authentication, preview/consent, and H-07
new/replacement Connection process. It MUST NOT move an existing Connection or
reuse its credentials or release binding.

**Applies to.** Agent discovery and operations, issuer metadata, key and
revocation resources, clients, gateways, proxies, caches, and browser adapters.

**Lifecycle/state impact.** Redirect rejection changes no protocol state and
does not prove noncommit or cancellation.

**Semantic failure.** Any 3xx MUST stop the attempt without continuation,
credential forwarding, downgrade, or public `Location` disclosure. If bytes of
a mutation were already transmitted, its semantic outcome remains ambiguous.

**Sources:** H-01, H-05, H-07, H-11, H-12. **Gaps:** GB-004, GB-037,
GB-039.

## REQ-TRAN-0008 - Authenticated TLS-B floor

**Requirement.** Remote Governed HTTPS MUST validate the certificate chain
against the selected trust configuration, the exact bound hostname and SNI,
and certificate not-before/not-after time. Insecure verification, hostname
suppression, plaintext or opportunistic-TLS fallback, automatic scheme or
target change, HTTPS downgrade, unconfigured CA acceptance, and fallback to a
weaker H-05 profile, trust configuration, or origin are prohibited.

Public CA or administrator-approved private CA roots MUST be an explicit
deployment/release-profile choice. Under accepted TLS-B, exact TLS versions,
ciphers, trust-root distribution, termination topology, and any additional
certificate status or pinning mechanism and its missing/stale/unavailable
treatment MUST be declared by the exact release profile or H-14 support
commitment. A declared hard-fail status or pin policy MUST fail closed and MUST
NOT fall back to chain-only validation. A profile selecting no additional
status mechanism MUST NOT opportunistically change identity, authority, or
retry based on optional status evidence.

**Applies to.** Every remote Governed direct or proxied TLS connection,
certificate validation, private PKI, profile claim, and TLS termination point.

**Lifecycle/state impact.** TLS establishes authenticated byte transport only
and causes no protocol authority or lifecycle transition.

**Semantic failure.** Any failed, unavailable where hard-fail, mismatched,
expired, not-yet-valid, or undeclared-varying TLS requirement MUST stop the
connection without plaintext, origin, profile, or trust fallback.

**Sources:** H-05, H-07, H-12, H-14. **Gaps:** GB-007, GB-037, GB-038,
GB-047.

## REQ-TRAN-0009 - NET-B target provenance, DNS pinning, and intermediaries

**Requirement.** An attacker- or discovery-derived target MUST receive only
public-target checks and MUST NOT opt into private reachability. Accepted NET-B
MAY permit a production private/on-prem origin only when its exact scheme,
canonical host, effective port, CA/trust configuration, and narrow approved
private IPv4/IPv6 scope were integrity-protected and administrator-approved
before discovery or use and are then bound under H-05/H-07. Discovery, DNS,
requests, redirects, environment proxies, wildcard hosts/ports, or an
unconstrained private-network approval MUST NOT create or widen NET-B.
Loopback is test/development only and MUST NOT be a NET-B production scope.
Link-local and metadata-service, multicast, broadcast, unspecified,
documentation/benchmark, unsafe transition/special-use, and equivalent
non-peer destinations MUST remain prohibited.

For every new connection, the Client MUST resolve all A and AAAA answers within
the DNS budget and classify each binary address, including IPv4-mapped IPv6.
Every answer MUST be permitted public unicast for a public target or inside the
exact approved NET-B scope and outside prohibited classes. A mixed invalid,
public/private, or approved/unapproved answer set not entirely covered by the
binding MUST fail the resolution. The Client MUST pin one already validated
candidate through connect, MUST NOT permit an unvalidated second lookup, and
MUST repeat validation for every new connection. Parallel racing MAY use only
already validated candidates; losing attempts receive no application
credentials or data.

HTTP/2 cross-origin coalescing is prohibited. Baseline clients MUST ignore
`Alt-Svc`; HTTPS/SVCB MAY assist framing selection only while exact host and
port remain unchanged and every actual address passes the same policy.
Connection pools MUST be keyed by exact origin, release transport profile,
proxy policy, tenant credential-isolation context, and security context.
Ambient proxies MUST be disabled for Governed transport. An explicitly trusted
proxy MAY tunnel only the exact bound host/port, MUST enforce the selected
address policy when it resolves, and MUST preserve end-to-end TLS; its address
MUST NOT become the H-05 target. Untrusted forwarding metadata MUST be
discarded for authority decisions.

A trusted HTTP/1.1/HTTP/2 translator MUST preserve the exact method, original
and canonical-target rejection and routing result, origin and authority,
security singleton fields, body and media bytes and bounds, status and stable
error identity, credential isolation, and `no-store` behavior. Subject only to
legitimate hop-by-hop processing, it MUST NOT normalize a rejected target,
combine security fields, retry a mutation, coalesce origins, synthesize
success, or create another release, profile, or authentication negotiation
path. Translation MUST preserve H-10 semantic-byte independence; HTTP framing
bytes MUST NOT replace or alter the registered semantic projection.

**Applies to.** Agent and issuer targets, public and private/on-prem origins,
DNS, Happy Eyeballs, pools, proxies, reverse proxies, HTTPS/SVCB, and transport
optimizations.

**Lifecycle/state impact.** Target and connection validation transports bytes
only. It MUST NOT create or move a Connection, Trust result, tenant scope, or
authority.

**Semantic failure.** Resolution failure, no result, one disallowed answer,
connected-address mismatch, second-resolution bypass, unsafe proxy, or
authority-moving optimization MUST fail the attempt without fallback or
credential transmission to the unsafe target.

**Sources:** H-02, H-05, H-07, H-11, H-12. **Gaps:** GB-004, GB-037,
GB-038, GB-047.

## REQ-TRAN-0010 - HTTP-V1 baseline and framing-only ALPN

**Requirement.** The accepted baseline transport profile MUST be HTTP-V1.
Baseline Clients and servers MUST implement HTTP/1.1. HTTP/2 MAY be implemented
only with identical same-origin authority, security, release, credential, and
semantic bindings. HTTP/3 MUST NOT be inferred or used as baseline and requires
a separately selected future transport profile. Remote Governed `h2c` is not
baseline.

ALPN MUST select transport framing only and MUST NOT select a protocol release,
capability or profile, authentication profile, principal, tenant, Connection,
or authority. An optional HTTP/2 attempt MUST offer `h2` and `http/1.1` for the
same exact origin. Selection of `h2` MUST carry the identical Ghost Bridge
operation, and selection of `http/1.1` MUST use the mandatory HTTP/1.1 binding.
When no ALPN protocol is selected, HTTP/1.1 MAY be used only for an otherwise-
valid endpoint explicitly configured for the mandatory HTTP/1.1 binding. An
unknown ALPN result MUST fail the attempt.

An optional HTTP/2-to-HTTP/1.1 fallback MAY occur only for the same exact
origin, release, profile, tenant, credential, and Connection binding and before
any Ghost Bridge `Authorization`, proof, body, or other application bytes are
transmitted. The fallback connection MUST independently repeat the same DNS,
TLS, and origin checks before credentials or request body are sent. After
transmission begins, failure MUST be treated as ordinary ambiguity and MUST
NOT automatically replay the request over HTTP/1.1.

HTTP/3 is not baseline. It requires exact H-04 and release transport-profile
selection and MUST continue to consume H-12 origin, DNS, TLS, credential-
isolation, retry, timeout, size, cache, canonical-target, and authority rules.
Its accepted initial QUIC migration rule is that peer-address migration MUST
be disabled unless the selected future profile explicitly defines
revalidation. Any new address MUST pass the same provenance and scope policy
before further protected traffic, and failed or unverifiable revalidation MUST
terminate the connection.

**Applies to.** Client/server protocol negotiation, ALPN, HTTP/1.1, HTTP/2,
future HTTP/3, h2c, gateways, and fallback.

**Lifecycle/state impact.** HTTP version selection changes framing only and has
no protocol lifecycle or authority effect.

**Semantic failure.** Unsupported or unsafe framing, cross-origin HTTP/2,
remote h2c, silent HTTP/3, or post-transmission fallback MUST stop or enter
ambiguity without downgrade, new identity, or automatic mutation replay.

**Sources:** H-03, H-05, H-07, H-12. **Gaps:** GB-037, GB-038, GB-039.

## REQ-TRAN-0011 - Abort, ambiguity, retry classes, and Retry-After

**Requirement.** Transport behavior MUST use exactly these retry classes:
`never`, `after_correction`, `same_request_after_delay`,
`authoritative_read_required`, and `reauthenticate_or_reconnect`, with exactly
these meanings:

- `never`: unchanged repetition is prohibited or cannot succeed;
- `after_correction`: the caller may submit newly corrected valid input, which
  is not replay of the rejected request;
- `same_request_after_delay`: the exact same request may repeat after the
  bounded delay only when the owning semantic idempotency permits repetition;
- `authoritative_read_required`: commit is ambiguous, so the caller MUST first
  read durable authoritative state or use only the exact H-06, H-08, or H-09
  convergent request; and
- `reauthenticate_or_reconnect`: the caller MUST obtain current authentication
  evidence or a new Connection through accepted semantics and MUST NOT revive
  old authority.

A DNS, connect, TLS, reset, incomplete or truncated response, local wait
timeout, caller abort, response-write failure, proxy failure, or no-complete-
response condition MUST be treated as ambiguous for a state-changing operation
unless authoritative durable evidence proves the semantic result. Abort or
disconnect MUST NOT create a cancellation intent or terminal Task state.

After ambiguity the caller MUST preserve the exact origin, release, profile,
principal, tenant, Connection, request semantic identity, idempotency,
Invocation, Approval, deadline, and other bindings. It MUST perform an
authorized authoritative read where available or repeat only the exact
convergent request permitted by H-06, H-08, or H-09. It MUST NOT create a new
idempotency key, Invocation, Approval, Connection, cancellation intent, origin,
or release. HTTP status alone MUST NOT make a mutation retryable.

`Retry-After`, when permitted, MUST be a non-negative integral delta-seconds
value no greater than 3600 and MUST NOT be an HTTP date. A future logical retry
delay MUST represent the same duration in milliseconds. An invalid,
mismatched, or excessive delay MUST be ignored and MUST NOT weaken a safer
local backoff, semantic retry restriction, or authority gate.

Permitted retry MUST use exponential backoff with jitter within a bounded
attempt and elapsed-time budget supplied by the applicable release profile.
Neither an HTTP status nor `Retry-After` MAY widen semantic idempotency or the
registered retry class. H-14 owns concrete operational rate limits.

**Applies to.** All transport failures, safe reads, state-changing operations,
exact replay, backoff, polling, and retry metadata.

**Lifecycle/state impact.** Retry classification and delay cause no lifecycle
transition. Only exact semantic convergence may observe or perform an owning
commit.

**Semantic failure.** Blind, identity-changing, status-only, or unsafe delayed
retry MUST be prohibited. An unresolved commit remains indeterminate and
non-authorizing; it MUST NOT be labeled cancelled, timed out, or uncommitted.

**Sources:** H-06, H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-014,
GB-015, GB-017, GB-037, GB-038.

## REQ-TRAN-0012 - Monotonic transport time budgets

**Requirement.** The HTTP-V1 baseline MUST apply these maximum elapsed-time
budgets:

| Phase                                                                     |             Maximum |
| ------------------------------------------------------------------------- | ------------------: |
| DNS resolution                                                            |           3 seconds |
| TCP/QUIC connect                                                          |           5 seconds |
| TLS handshake                                                             |           5 seconds |
| Request write                                                             |          10 seconds |
| Request-write idle submaximum                                             |           5 seconds |
| Server synchronous acknowledgement after complete bounded request receipt |          10 seconds |
| Response idle/read                                                        |     10 seconds idle |
| Whole Client attempt                                                      | 30 seconds absolute |

Elapsed transport budgets MUST use a monotonic clock. The 30-second whole-
attempt maximum is shared and MUST NOT be computed as the sum of phase maxima.
Wall-clock changes MUST NOT extend a monotonic elapsed budget. The server's
10-second acknowledgement obligation starts only after complete, otherwise-
acceptable bounded request receipt. Within that budget the server MUST emit
the first byte of the complete bounded synchronous response, durable 202
acceptance, or safe temporary error. It MUST NOT hold the transport open while
waiting for long-running Task execution. Response-idle time resets only when
actual bounded response bytes are received, not on local polling, timer, or
application events.

A caller-local shorter wait MAY release local resources but proves neither peer
nonconformance nor semantic failure, cancellation, timeout, commit, or
noncommit. A deployment claiming baseline support MUST NOT silently undercut
these budgets. A deliberately different support commitment requires its
separately governed explicit release or profile treatment.

These budgets MUST remain distinct from Invocation admission deadline, Task
execution deadline, cancellation, proof/authentication validity, Trust
freshness, Connection expiry, retention, and proof of commit or noncommit.

**Applies to.** Client attempts, servers, DNS, connect, TLS, request writes,
synchronous acknowledgements, response reads, proxies, and adapters.

**Lifecycle/state impact.** Expiration of a transport budget ends or abandons
the transport attempt only and creates no protocol deadline, cancellation, or
state transition.

**Semantic failure.** An exceeded budget MUST stop the relevant attempt safely;
mutations remain ambiguous unless authoritative evidence proves their outcome,
and no semantic clock may be extended or replaced.

**Sources:** H-07, H-08, H-09, H-11, H-12, H-14. **Gaps:** GB-015,
GB-022, GB-037, GB-038.

## REQ-TRAN-0013 - Baseline size, parser, and emission limits

**Requirement.** Octet limits MUST count deterministic UTF-8 bytes and complete
collections, not implementation allocation size. A baseline sender MUST NOT
exceed, and a baseline receiver MUST support an otherwise valid message through,
these exact bounds:

| Resource                            |        Baseline bound | Required enforcement                                 |
| ----------------------------------- | --------------------: | ---------------------------------------------------- |
| Raw request target                  |                 8 KiB | Before decoding, routing, logging, or authentication |
| Request header fields               |                    64 | After safe framing validation                        |
| One request header name/value line  |                 8 KiB | Security singletons never joined                     |
| Aggregate request header section    |                32 KiB | While receiving headers                              |
| Response header fields              |                    64 | After safe framing validation                        |
| One response header name/value line |                 8 KiB | Security singletons never joined                     |
| Aggregate response header section   |                32 KiB | While receiving headers                              |
| Encoded request body                |               256 KiB | While reading, before content decoding               |
| Decoded request body                |               256 KiB | Before JSON parse                                    |
| Ordinary encoded/decoded response   |                 1 MiB | While reading                                        |
| Error response                      |                16 KiB | Entire envelope and safe detail                      |
| JSON nesting                        |         16 containers | During strict tokenization                           |
| One JSON string                     |          64 KiB UTF-8 | Before unescaping allocation exceeds the bound       |
| Array entries                       |                   256 | During tokenization                                  |
| Object members                      |      256 unique names | During tokenization; duplicates rejected             |
| Total JSON tokens                   |                16,384 | During tokenization                                  |
| Application stream frame/cumulative |        Not applicable | No baseline application streaming                    |
| One ordinary log field              | 1 KiB sanitized UTF-8 | Before emission                                      |
| Ordinary log message/event          |        2 KiB / 16 KiB | Before sink/export; at most 32 application fields    |

Every limit MUST be enforced while reading or tokenizing. A recipient MUST NOT
first buffer, decompress, parse, canonicalize, allocate, or log an unbounded
value. Byte and structural limits apply together. Unsupported compression MUST
be rejected with 415 without decompression. A safe over-limit body uses 413;
when no safe unambiguous response can be framed, the connection is closed.

Size alone MUST NOT reject an otherwise valid baseline request or response at
or below the applicable mandatory receiver-support bound. A normal operation,
advertisement, local default, or implementation MUST NOT silently lower the
256-KiB request or 1-MiB ordinary-response baseline. A larger or smaller wire
limit requires an explicit H-04-selected distinct profile specifying both
sender maximum and receiver support; it MUST NOT be an implicit downgrade.

**Applies to.** Senders, receivers, parsers, canonicalizers, loggers,
gateways, discovery metadata, and every operation body.

**Lifecycle/state impact.** Limit enforcement occurs before semantic
construction or state mutation. Log truncation affects only representation.

**Semantic failure.** Over-limit or structurally over-bound input MUST reject
without partial semantic effect, resource amplification, value echo, or silent
profile negotiation. A peer below the support floor MUST NOT claim baseline
interoperability.

**Sources:** H-04, H-10, H-12, H-14. **Gaps:** GB-038, GB-040, GB-041,
GB-047.

## REQ-TRAN-0014 - Cache, proxy, intermediary, and browser boundaries

**Requirement.** Bootstrap discovery and release metadata MAY be publicly
cached only with `max-age` no greater than 60 seconds and revalidation, and
every cached representation MUST remain non-authoritative. Authentication,
Install Grant, Connection, Approval, Invocation, Task, Result, and Receipt
resources MUST be `no-store` and MUST NOT be stored in shared or browser
caches. Errors and redirects MUST be `no-store`. Issuer metadata, keys, and
revocation transport responses MUST be `no-store` by default; only H-11
application retention, freshness, chain, and durable-floor rules can make
their evidence usable. `Vary: Authorization` MUST NOT replace `no-store`, and
`stale-if-error` or stale cache use MUST NOT create authority or H-11 validity.

Public immutable non-authority assets MAY be cached only when a later release
names the immutable asset or digest and proves transformation safety.
Cacheability MUST NOT create Connection or action authority. Cache keys MUST
include the exact origin, release, resource, and every governed representation
dimension and MUST NOT expose credential or tenant information.

An intermediary MAY relay only one exact origin and release request. Subject
only to legitimate hop-by-hop HTTP processing, it MUST preserve the method,
target, security headers, media, body bytes, bounds, status, and response bytes.
It MUST NOT negotiate on behalf of a peer, blindly retry an unsafe mutation,
decompress or recompress protected or signed semantic input, rewrite a stable
error identity, synthesize semantic success, or cache authority. Intermediary
processing MUST preserve H-10 semantic-byte independence.

Native browser operation MUST NOT be baseline. Ambient cookies, credentialed
CORS, form submission, browser credential stores, and CSRF assumptions MUST
NOT create Native authority. A browser-facing product adapter MUST be a
separate deployment trust boundary and MUST preserve the same authentication,
origin, release, tenant, no-store, disclosure, redirect, and final-Agent
enforcement floor.

A trusted reverse proxy MAY terminate TLS only as explicit fixed deployment
configuration. Untrusted forwarding, client-IP, rewritten-host, and peer
request-ID fields MUST be discarded for authority. Trusted routing/audit
metadata MUST NOT select release, principal, tenant, scope, Connection, or
authorization.

**Applies to.** HTTP caches, CDNs, gateways, reverse and outbound proxies,
browsers, CORS adapters, Trust evidence fetches, and stale-error handling.

**Lifecycle/state impact.** Cache and intermediary behavior creates no
authority or protocol transition and cannot change existing object truth.

**Semantic failure.** A prohibited cache use, stale-authority fallback,
ambient-browser authority, or untrusted forwarding decision MUST fail closed
without disclosure, credential movement, or state mutation.

**Sources:** H-01, H-02, H-05, H-07, H-11, H-12. **Gaps:** GB-004,
GB-022, GB-037, GB-038, GB-039, GB-047.

## REQ-TRAN-0015 - Malformed and ambiguous HTTP rejection

**Requirement.** A baseline recipient MUST reject conflicting or multiple
`Content-Length`; `Transfer-Encoding` with `Content-Length`; unsupported
transfer coding; invalid chunks; request-smuggling ambiguity; obsolete folding;
invalid field names; NUL, CR, LF, or control injection; body/framing
disagreement; duplicate security singleton fields; `Host`/`:authority`
conflict; forbidden HTTP-version-specific fields; target, header, or body over-
limit; unsupported content encoding; wrong media or charset; invalid UTF-8 or
BOM; malformed JSON; duplicate JSON names; multiple JSON values; trailing
bytes; noncanonical paths; a body on a baseline GET; missing, truncated, or
unexpected bodies; request trailers; and runtime automatic decompression.
Hop-by-hop and HTTP-version-specific connection fields MUST be rejected
wherever invalid for the negotiated version.

The HTTP/1.1 malformed and framing rules in this requirement are mandatory for
every baseline recipient. When optional HTTP/2 is implemented or used, the
recipient MUST reject invalid HTTP/2 pseudo-header ordering, duplication, or
values; invalid connection-specific fields; and invalid HTTP/2 framing,
stream, or connection input. HTTP/3 framing, stream, and connection rejection
rules apply only when a future HTTP/3 transport profile has been explicitly
selected and implemented. Invalid implemented or selected HTTP/2 or HTTP/3
input MUST NOT be translated into an ambiguous HTTP/1.1 request. This
applicability does not change HTTP/1.1's mandatory, HTTP/2's optional, or
HTTP/3's future-profile-only status.

`HEAD` and `OPTIONS` are not baseline semantic operations unless an exact
future operation table explicitly lists them. Against a known resource they
MUST use the safe 405 rule and safe `Allow` set. `OPTIONS` or CORS preflight
MUST NOT create Native authority. Request trailers are not a baseline
extension and MUST be rejected.

The baseline MUST NOT use 425. TLS early data MUST be disabled for authenticated
or state-changing Ghost Bridge baseline requests. A future TLS profile MUST
separately prove replay safety before defining any different early-data rule.

The recipient MUST validate framing before release dispatch and MUST NOT let a
framework normalize, join, decompress, or consume ambiguous input before the
Ghost Bridge check. If a safe unambiguous response cannot be framed, it MUST
close the connection rather than guess an error envelope, method, body,
release, principal, or commit outcome.

**Applies to.** Every HTTP/1.1 baseline parser and, when implemented or
selected, HTTP/2 parsers and future HTTP/3 framing; servers, clients, gateways,
proxies, framework adapters, bodies, headers, and safe errors.

**Lifecycle/state impact.** Rejection occurs before semantic dispatch and
causes no protocol state transition, cancellation, or proof of noncommit.

**Semantic failure.** Every listed ambiguity MUST reject or close as required
without parsing alternate interpretations, selecting first/last values,
partial success, public input echo, or semantic side effect.

**Sources:** H-05, H-10, H-12, H-13. **Gaps:** GB-036, GB-038, GB-040,
GB-041, GB-047.

## Non-normative D2 traceability

This chapter creates no schema, OpenAPI document, executable route registry,
state machine, fixture, vector, corpus, conformance oracle, SDK, or runtime
implementation and closes no `GB-*` gap.

`D2-01` must later encode the operation request/response, cancellation
acknowledgement, transport-visible metadata, and exact resource-ID
representations without changing this HTTP binding. `D2-03` must cover any
H-10 media/context boundary vectors. `D2-04` must cover all raw-target
ambiguities; every limit at boundary minus one, boundary, and plus one;
CL/TE and duplicate-singleton smuggling; malformed UTF-8/JSON and duplicate
names; media/charset/encoding; zero redirects and credential leakage; public
and NET-B DNS, rebinding, mixed answers, second resolution and TLS failures;
HTTP/2 coalescing, pre-transmission fallback and post-transmission ambiguity;
h2c and silent HTTP/3 denial; timeout boundaries; cache/no-store; compression;
and disconnect-versus-cancellation. `D2-05` must establish raw HTTP and
transport-adapter equivalence without importing official implementation
internals.
