# Security considerations

This chapter makes the accepted cross-cutting security floor explicit for
`ghostbridge/e1.r0-draft.1`. It composes the owning requirements; it does not
invent a cryptographic algorithm, authentication profile, authority source,
network operation, lifecycle transition, or deployment product.

## REQ-SEC-0001 - Authority separation and final Agent enforcement

**Requirement.** Authentication, Trust verification, a Passport, transport
success, cryptographic validity, policy evidence, Approval, resource-ID
possession, caching, correlation, role co-location, and protocol participation
MUST remain distinct and MUST NOT independently create, widen, restore,
transfer, or consume authority. For every Agent-executed governed operation,
the Agent MUST be the final protocol enforcement point before Task creation or
external effect.

At that boundary the Agent MUST require the exact active Connection and current
selected-profile authentication, exact principal and tenant scope, exact
origin/release/profile/Agent/Passport/target/capability bindings, current Trust
and revocation evidence, structured protocol authorization, any applicable and
configured stricter deployment policy when such policy exists, exact Approval
when required, deadline, idempotency, integrity, and every applicable operation
gate. Each input MAY narrow or deny and MUST NOT expand another. Deployment or
Platform policy MAY narrow or deny but MUST NOT become a universal protocol
requirement. Client, Host, gateway, policy, Trust, and Platform checks MAY
reject earlier as defense in depth but MUST NOT replace the Agent's independent
verification and final raceable-gate recheck.

**Applies to.** Every governed Invocation, cancellation, Connection transition,
protected read, exact retry, and deployment topology.

**Lifecycle/state impact.** Preliminary evidence and checks cause no state
change. Only the owning complete durable semantic transaction may create or
transition an object.

**Semantic failure.** Missing, stale, unavailable, mismatched, denied,
ambiguous, corrupt, or rolled-back required evidence MUST fail closed before
Task, Approval consumption, disclosure, or effect and MUST NOT be replaced by
another evidence class.

**Sources:** H-01, H-02, H-05, H-07, H-08, H-09, H-11, H-12. **Gaps:**
GB-002, GB-003, GB-007, GB-008, GB-011, GB-013, GB-015, GB-016, GB-047.

## REQ-SEC-0002 - Exact security bindings and no credential or profile fallback

**Requirement.** Every applicable security decision MUST bind and compare the
exact configured origin, protocol release, selected authentication and proof
profiles, principal, audience, Agent/resource target, Connection, organization,
tagged workspace, purpose, capability/action, key purpose, and semantic object
identity. A mismatch MUST NOT be normalized, redirected, aliased, inferred from
proximity, repaired from a current default, or retried under another binding.

Credentials and reusable secrets MUST occur only in their selected H-05
profile locations and custody. A credential reference, prior authentication,
transport channel, cookie, ambient client certificate, proxy credential,
browser session, bearer where Governed PoP is required, weaker profile, or
`none` MUST NOT substitute for current exact proof. Authentication or TLS
failure MUST NOT trigger a different issuer, origin, target, trust
configuration, authentication profile, or proof purpose.

HTTP framing, transfer bytes, path encoding, object-member order, and transport
compression MUST NOT define H-10 semantic bytes. H-10 canonicalization,
digest, signature, proof, key-purpose, and domain rules remain independently
selected and verified; this chapter MUST NOT add or infer cryptography.

**Applies to.** Authentication establishment/current proof, Connection use,
Approval, Receipt, Trust evidence, retries, transport, and H-10 processing.

**Lifecycle/state impact.** Binding verification is a guard only. A material
bound-value change requires the owning new/replacement lifecycle and MUST NOT
mutate an existing object in place.

**Semantic failure.** Any fallback, substitution, wrong-purpose reuse,
credential-reference-as-proof, or transport-bytes-as-canonical-bytes behavior
MUST fail closed without negotiation, authority, signing, Task, or effect.

**Sources:** H-03, H-04, H-05, H-07, H-08, H-10, H-11, H-12. **Gaps:**
GB-005, GB-006, GB-007, GB-009, GB-013, GB-026, GB-027, GB-047.

## REQ-SEC-0003 - Network-origin, TLS, DNS, SSRF, and proxy security floor

**Requirement.** Remote Governed transport MUST satisfy the authenticated
HTTPS, exact hostname/SNI, chain, certificate-time, TLS-B, zero-redirect, and
NET-B requirements of the Transport chapter. Discovery, peer input, request
data, query, redirect, DNS, forwarded headers, an environment proxy, certificate
name overlap, HTTP/2 coalescing, `Alt-Svc`, HTTPS/SVCB alternate authority,
pooling, or a second resolver lookup MUST NOT move the bound origin, create
private reachability, change an H-05 target, or carry credentials across
origins.

For each connection, all binary DNS answers, including mapped forms, MUST pass
the exact public or preapproved NET-B scope before one validated candidate is
pinned through connect. Mixed invalid answers, link-local or metadata-service
destinations, multicast, broadcast, unspecified or special-use destinations,
loopback outside explicit test/development, and unapproved private ranges MUST
fail the whole resolution. Explicit proxies and TLS terminators MUST be fixed
trusted deployment boundaries that preserve end-to-end origin authentication,
credential isolation, target policy, and final enforcement; proxy metadata and
address MUST NOT become protocol authority.

**Applies to.** Agent and issuer discovery, every outbound connection, DNS,
private/on-prem deployments, proxies, pools, HTTP/2, and TLS termination.

**Lifecycle/state impact.** Network validation permits only byte delivery and
does not create Trust, Connection, tenant, authentication, or lifecycle state.

**Semantic failure.** An unverifiable, mixed, rebinding-prone, downgraded,
redirected, cross-origin, or policy-bypassing target MUST receive no protected
bytes and MUST fail without another origin/profile attempt or authority change.

**Sources:** H-01, H-05, H-07, H-11, H-12. **Gaps:** GB-004, GB-029,
GB-037, GB-038, GB-039, GB-047.

## REQ-SEC-0004 - Parser, smuggling, desynchronization, and resource-exhaustion defenses

**Requirement.** Every receiver and intermediary MUST apply the canonical raw-
target, security-singleton, framing, transfer, media, UTF-8, JSON, duplicate-
name, and body-presence rules before semantic dispatch. It MUST reject CL/TE
ambiguity, multiple or conflicting lengths, invalid chunks, obsolete folding,
invalid header names, controls and CR/LF injection, `Host`/`:authority`
conflict, invalid HTTP/2 pseudo-headers, encoded separator/dot ambiguity,
automatic normalization, unsupported encoding, automatic decompression,
multiple JSON values, and trailing bytes. It MUST NOT select first/last values
or let a framework transform ambiguous input before validation.

The exact transport byte, header, target, JSON depth/string/member/entry/token,
time, and log bounds MUST be enforced incrementally before unbounded buffering,
allocation, decompression, parsing, canonicalization, logging, or export.
Attacker-controlled errors and telemetry MUST be rate- and cardinality-bounded.
An implementation or dependency default MUST NOT silently lower mandatory
receiver interoperability support or raise the sender maximum.

**Applies to.** HTTP parsers, JSON parsers, routers, proxies, framework
adapters, canonicalizers, loggers, error handling, and resource accounting.

**Lifecycle/state impact.** Rejection occurs before semantic object creation or
state mutation and does not prove noncommit for bytes that may already have
reached an independent downstream semantic boundary.

**Semantic failure.** Ambiguous or over-bound input MUST be rejected before
effect; when no safe response can be framed the connection MUST close. The
receiver MUST NOT echo, repair, retry, or partially process it.

**Sources:** H-05, H-10, H-12, H-13. **Gaps:** GB-036, GB-038, GB-040,
GB-041, GB-042, GB-047, GB-049.

## REQ-SEC-0005 - Ambiguous outcomes, replay, cancellation, and duplicate-effect safety

**Requirement.** Transport abort, disconnect, local timeout, HTTP 408, 429,
500, 502, 503, or 504, response loss, process failure, and audit failure MUST
NOT prove noncommit, cancellation, Task timeout, rollback, or retry safety. A
state-changing operation MUST use the exact H-06, H-08, or H-09 semantic
identity, durable convergence, authority, and effect guards. After ambiguity,
the caller MUST read authoritative state where available or repeat only the
exact convergent request; it MUST NOT create a new Invocation, Connection,
Approval, idempotency identity, Task, cancellation, origin, or release.

Task cancellation MUST remain an independently authenticated, authorized,
durable intent whose checkpoint and terminal race are H-09-owned. No transport
or wait cancellation MAY stand in for it. Execution attempts and external
effects MUST remain fenced so duplicate delivery, stale workers, failover, or
blind retry cannot create a second effect. Status or `Retry-After` MUST NOT
widen the registered retry class or the operation's idempotency.

**Applies to.** Grant redemption, Approval continuation, Invocation,
cancellation, Task execution, gateways, timeouts, retries, crash recovery, and
duplicate delivery.

**Lifecycle/state impact.** Transport and retry advice cause no state change.
Only one proven owning semantic commit may create or transition state; exact
postcommit retries are reads of that outcome.

**Semantic failure.** Unknown commit or effect status MUST remain
non-authorizing and indeterminate. Blind replay, inferred cancellation, or
duplicate-effect execution MUST be blocked through ordinary request-local
denial where owned. Durable suspension MUST occur when an owning H-05, H-07, or
H-11 requirement requires durable suspension. Durable suspension MUST NOT
otherwise be inferred or invented from a request-local, transport, audit, or
indeterminate failure. Indeterminate or unavailable handling remains with its
owning requirement. Request-local denial MUST NOT create another lifecycle
state.

**Sources:** H-06, H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-014,
GB-017, GB-019, GB-020, GB-021, GB-037, GB-047.

## REQ-SEC-0006 - Cache, browser, cross-tenant, and telemetry security boundary

**Requirement.** HTTP cache freshness, stale-if-error, cached authentication,
cached policy, cached Trust evidence, and `Vary: Authorization` MUST NOT create
current authority or replace H-11 freshness and anti-rollback. Every authority-
bearing or protected resource and every error/redirect MUST follow its exact
`no-store` class. Current evidence unavailability MUST fail closed and MUST NOT
fall back to stale success.

Object or identifier possession MUST NOT authorize disclosure. Authentication
MUST precede safe disclosure evaluation, and undisclosed absent, cross-tenant,
wrong-workspace, wrong-principal, and hidden resources MUST share the accepted
404 collapse. Ordinary telemetry MUST NOT carry credentials, secrets, bodies,
raw tenant or object identifiers, Trust floors, private errors, or cross-tenant
trace baggage. Protected audit MUST remain a separate tenant-isolated evidence
domain and MUST NOT become an authority or semantic commit store.

Native browser cookies, credentialed CORS, forms, ambient credential stores,
and CSRF behavior MUST NOT create Ghost Bridge authority. A browser product
adapter MUST preserve the Native floor as a separate boundary.

**Applies to.** Caches, current-evidence gates, protected reads, multi-tenant
deployments, ordinary telemetry, protected audit, browsers, and adapters.

**Lifecycle/state impact.** Cache, disclosure representation, telemetry, and
audit delivery have no protocol lifecycle effect and cannot repair or roll back
a semantic transaction.

**Semantic failure.** Stale-authority use, cross-tenant leakage, ambient
browser authority, or observability-derived authority MUST fail closed without
protected disclosure, state mutation, or secret export.

**Sources:** H-02, H-05, H-07, H-09, H-11, H-12, H-14. **Gaps:** GB-012,
GB-022, GB-028, GB-032, GB-047, GB-048, GB-049.

## REQ-SEC-0007 - Security incidents do not fabricate or rewrite semantic history

**Requirement.** Security, storage, policy, provider, network, clock, or Trust
unavailability MUST NOT be fabricated as revocation, compromise, cancellation,
failure, Task timeout, or proof that an object never existed. Revocation and
compromise effects MUST arise only from the exact authenticated, purpose- and
scope-bound sources and intervals owned by H-05, H-07, and H-11.

Transport or security failure, later compromise evidence, key rotation,
revocation, operator response, audit delivery, and incident recovery MUST NOT
erase or rewrite an already committed Connection, consumed Approval, accepted
Task, terminal Result, Receipt bytes, effect fact, or historical ordering.
Later evidence MAY narrow current authority, stop remaining work when pre-bound,
or change an H-11 historical classification only as its owning rule permits.

A security/audit record MUST be evidence about a semantic transaction and MUST
NOT substitute for, create, complete, roll back, or recover that transaction.
Logs and metrics MUST NOT be used as the authority store or sole proof of
commit/noncommit.

**Applies to.** Outages, revocation, compromise, incident response, recovery,
historical verification, audit, and every durable authority/work object.

**Lifecycle/state impact.** Only an owning authenticated security source may
cause its accepted H-05/H-07/H-11 transition. Evidence collection itself has
none; historical facts remain immutable.

**Semantic failure.** An unproven security classification or history rewrite
MUST be rejected. Unavailability remains blocked and non-authorizing or uses
the indeterminate or unavailable handling owned by the applicable requirement.
Durable suspension MUST occur when an owning H-05, H-07, or H-11 requirement
requires durable suspension. Durable suspension MUST NOT otherwise be inferred
or invented from a request-local, transport, audit, or indeterminate failure.
Request-local denial MUST NOT create another lifecycle state. None of these
treatments creates an invented terminal fact, authority, or lifecycle state.

**Sources:** H-05, H-07, H-08, H-09, H-10, H-11, H-12. **Gaps:** GB-015,
GB-019, GB-021, GB-028, GB-030, GB-031, GB-033, GB-047, GB-049.

## REQ-SEC-0008 - Dependencies, deployment policy, and extensions cannot weaken the floor

**Requirement.** Runtime, HTTP library, parser, proxy, resolver, TLS stack,
queue, database, SDK, framework, package, Platform, implementation behavior,
test expectation, environment variable, or deployment default MUST NOT weaken,
silently fill, or redefine the protocol security floor. A deployment MAY
impose stricter controls only while preserving mandatory interoperability
claims, authority separation, exact semantic meaning, immutable history, and
fail-closed behavior.

H-13 closed-Core and registered-extension rules MUST apply to transport
metadata, errors, security evidence, telemetry, and audit. An extension MUST
NOT add an unregistered route, authentication or cryptographic profile,
authority source, lifecycle state, retry permission, secret/public detail
channel, unbounded parser or metric input, or semantic fallback. Unknown
required security meaning MUST fail closed; optional opaque data MUST remain
non-authoritative and undisclosed unless its exact context expressly permits
bounded handling.

Security profile, algorithm, credential lifetime, certificate-status/pinning,
retention, operator, region, support, and incident commitments MUST remain with
their accepted release/profile or H-14 owner and MUST NOT be invented from
implementation capability.

**Applies to.** All implementations, dependencies, deployment configuration,
Platform adapters, extensions, registries, support claims, and conformance
evidence.

**Lifecycle/state impact.** Stricter local rejection may deny use but MUST NOT
mutate protocol meaning or create a new lifecycle transition. Extensions create
no independent authority or state.

**Semantic failure.** Silent weakening, default substitution, implementation-
as-law, or extension bypass MUST prevent the affected interoperability/security
claim and MUST fail closed without fallback, authority, or historical rewrite.

**Sources:** H-02, H-03, H-04, H-05, H-10, H-12, H-13, H-14. **Gaps:**
GB-002, GB-003, GB-007, GB-037, GB-040, GB-041, GB-042, GB-047, GB-055.

## Non-normative D2 traceability

This chapter creates no security profile, schema, state machine, vector,
malicious corpus, conformance oracle, SDK, runtime, audit backend, or security-
review result and closes no `GB-*` gap.

`D2-01` must later encode only the representations selected by the owning
requirements. `D2-03` must provide exact context, purpose, key, and media/H-10
boundary vectors where applicable. `D2-04` must cover every threat above,
including authority confusion, origin/release/profile/tenant substitution,
credential fallback, redirect leakage, DNS rebinding/SSRF, TLS and proxy
failures, smuggling/desynchronization, resource exhaustion, ambiguous commit,
duplicate effects, stale Trust/cache, cross-tenant disclosure, browser ambient
authority, telemetry leakage, audit/commit confusion, dependency defaults, and
extension bypass. `D2-05` must trace each mitigation to implementation-neutral
black-box security conformance. Independent review and remediation remain the
separate H-14/P1 governance gate.
