# Errors

This chapter defines the stable public error taxonomy, HTTP status mapping,
retry classes, failure precedence, and disclosure boundary for
`ghostbridge/e1.r0-draft.1`. It defines logical envelope semantics, not final
JSON member names, an OpenAPI contract, private diagnostic codes, or Task and
historical-verification states.

## REQ-ERR-0001 - Transport, protocol, authority, and resource outcomes remain distinct

**Requirement.** An implementation MUST keep these eight classes distinct:

1. a transport failure with no complete trustworthy HTTP response and a
   possibly ambiguous state-changing outcome;
2. an HTTP-layer framing, target, method, media, size, gateway, or negotiation
   failure;
3. a Ghost Bridge protocol error carrying one stable release-defined error
   identity;
4. an authorization denial by an authenticated evaluation;
5. a disclosed lifecycle or immutable-binding conflict;
6. a temporary condition whose retry is bounded by the operation's semantic
   idempotency;
7. an H-09 Task/Result terminal state represented as an authorized successful
   semantic resource; and
8. an H-11 historical-verification classification represented as an authorized
   semantic resource.

A failed, cancelled, or timed-out Task MUST NOT be converted to HTTP failure
merely because its semantic outcome is unfavorable. An invalid, indeterminate,
unsupported, or non-authoritative historical classification MUST NOT be
converted to transport failure merely because it is unfavorable and MUST never
become current authority. HTTP or protocol errors MUST NOT rewrite an already
committed Task, Result, Receipt, Approval, Connection, or Trust-history fact.

**Applies to.** Every transport adapter, HTTP response, error consumer,
authorized Task/Result resource, and H-11 historical-verification resource.

**Lifecycle/state impact.** Classification and representation cause no
lifecycle transition. An underlying semantic operation retains only the state
effect defined by its owning chapter.

**Semantic failure.** Collapsing these classes in a way that creates retry,
authority, cancellation, terminality, disclosure, or changed historical truth
MUST fail closed without another state-changing attempt.

**Sources:** H-02, H-07, H-09, H-11, H-12. **Gaps:** GB-021, GB-028,
GB-034, GB-035, GB-037.

## REQ-ERR-0002 - Exact accepted HTTP status registry

**Requirement.** The baseline MUST use only the accepted status meanings and
default retry treatments in this table:

| HTTP status | Accepted use                                                                           | Default retry treatment                                                 |
| ----------: | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
|         200 | Completed bounded read, Decision, or convergent redemption response                    | Not authority by itself; reads may repeat                               |
|         201 | Newly issued administrative resource such as an Install Grant                          | No blind replay without exact issuance idempotency                      |
|         202 | Invocation or cancellation-intent acceptance                                           | Read authoritative Task; exact semantic retry only after ambiguity      |
|         400 | Unambiguous target/header/JSON/protocol validation failure after safe framing          | `after_correction`                                                      |
|         401 | Missing or invalid current authentication; at most one selected-profile safe challenge | `reauthenticate_or_reconnect`; never negotiation or weaker fallback     |
|         403 | Authenticated, disclosure-safe denial of action or authority                           | `never` until authority or policy changes                               |
|         404 | Resource or release absent, or deliberately collapsed non-disclosure                   | `never` for an unchanged target; hidden causes indistinguishable        |
|         405 | Known release resource with unsupported method; safe `Allow` only                      | `after_correction`                                                      |
|         406 | Exact response media or release unacceptable before the bound operation                | `after_correction`; no fallback negotiation                             |
|         408 | Server or intermediary abandoned an incomplete HTTP request                            | Mutations are ambiguous; authoritative read or exact convergence        |
|         409 | Disclosed lifecycle, binding, exact-intent, or immutable-Decision conflict             | `authoritative_read_required` or `after_correction` only as registered  |
|         413 | Encoded or decoded body/representation exceeds its bound                               | `after_correction`; never unchanged retry                               |
|         414 | Raw request target exceeds its bound                                                   | `after_correction`; never unchanged retry                               |
|         415 | Unsupported request media, charset, or content encoding                                | `after_correction`; no decoding fallback                                |
|         429 | Rate or resource pressure                                                              | Exact safe retry only with bounded delay and semantic idempotency       |
|         431 | Header count, line, or aggregate bytes exceed their bound                              | `after_correction`; never unchanged retry                               |
|         500 | Undisclosed internal failure                                                           | Fail closed; mutation ambiguous unless precommit evidence exists        |
|         502 | Trusted gateway received an invalid or unavailable upstream response                   | Mutation ambiguous; exact read/retry rules only                         |
|         503 | Temporary service, storage, or current-evidence unavailability, publicly collapsed     | Delayed same request only when semantically safe; never stale authority |
|         504 | Trusted gateway attempt timed out                                                      | Mutation ambiguous; authoritative read or exact retry only              |

The baseline MUST NOT emit 204 because every successful accepted operation has
a bounded evidence or acknowledgement representation. A 3xx response MUST NOT
be a success path, and 425 MUST NOT be used by the baseline. HTTP status MUST
NOT replace the stable protocol error identity, provide retry permission,
prove authority, override an accepted semantic denial, or prove commit state.

**Applies to.** Every baseline HTTP success and failure response, gateway,
Client retry decision, and public adapter.

**Lifecycle/state impact.** Status represents an already determined transport
or semantic result and causes no protocol state transition by itself.

**Semantic failure.** An unregistered status meaning or status-derived retry,
authority, Task state, or commit conclusion MUST be rejected and MUST NOT
trigger fallback or a new mutation.

**Sources:** H-06, H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-020,
GB-022, GB-034, GB-035, GB-038.

## REQ-ERR-0003 - Exact stable public error registry

**Requirement.** The public registry MUST contain exactly the following stable
identities with the stated trigger, HTTP mapping, maximum retry class, maximum
safe detail, producing layer, and state effect. The retry class is a maximum;
the operation's exact idempotency MAY narrow it to
`authoritative_read_required` or `never` and MUST NOT widen it.

| Stable identity                | Normative trigger after precedence                                           | HTTP | Maximum retry class                                            | Maximum safe public detail                                                     | Producing layer/role                        | State effect                                                         |
| ------------------------------ | ---------------------------------------------------------------------------- | ---: | -------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------- |
| `MALFORMED_HTTP`               | Safely reportable framing, header, or target defect                          |  400 | `after_correction`                                             | Coarse class only; otherwise close                                             | Transport recipient before release dispatch | None                                                                 |
| `INVALID_MESSAGE`              | Strict UTF-8, JSON, or registered semantic validation fails                  |  400 | `after_correction`                                             | Registered field class; never value or path                                    | Bounded release handler/validator           | None                                                                 |
| `METHOD_NOT_ALLOWED`           | Known disclosed resource does not support method                             |  405 | `after_correction`                                             | Safe `Allow` set only                                                          | Exact release router                        | None                                                                 |
| `UNSUPPORTED_RELEASE`          | Exact pre-Connection release resource unavailable and disclosure safe        |  404 | `after_correction`                                             | None; discovery may be reread, no fallback                                     | Origin/release router                       | None                                                                 |
| `NOT_ACCEPTABLE`               | Exact response release media is not accepted                                 |  406 | `after_correction`                                             | None                                                                           | Content negotiation before operation        | None                                                                 |
| `UNSUPPORTED_MEDIA`            | Request media, charset, or content encoding unsupported                      |  415 | `after_correction`                                             | Coarse media/charset/encoding class; no alternatives oracle                    | Transport/media validator                   | None                                                                 |
| `REQUEST_TARGET_TOO_LARGE`     | Raw target exceeds 8 KiB                                                     |  414 | `after_correction`                                             | Limit class only                                                               | Raw-target validator                        | None                                                                 |
| `HEADERS_TOO_LARGE`            | Header count, line, or aggregate bound exceeded                              |  431 | `after_correction`                                             | Limit class only                                                               | HTTP framing validator                      | None                                                                 |
| `MESSAGE_TOO_LARGE`            | Encoded/decoded body or representation bound exceeded                        |  413 | `after_correction`                                             | Limit class and accepted bound only when safe                                  | Streaming body/parser limiter               | None                                                                 |
| `AUTHENTICATION_REQUIRED`      | Required selected-profile evidence absent or invalid                         |  401 | `reauthenticate_or_reconnect`                                  | No missing/invalid axis; one selected-profile challenge only if safely defined | H-05 verifier/final receiver                | None unless an independent H-05/H-07 event already owns a transition |
| `ACCESS_DENIED`                | Authenticated disclosed caller lacks effective authority                     |  403 | `never`                                                        | Coarse operation class only                                                    | Agent final enforcement/policy intersection | None                                                                 |
| `RESOURCE_NOT_FOUND`           | Object absent or caller lacks disclosure authority                           |  404 | `never`                                                        | None; identical collapsed treatment                                            | Disclosure-safe owning resource layer       | None                                                                 |
| `RELEASE_BINDING_CONFLICT`     | Disclosed Connection/request release differs from immutable binding          |  409 | `never`                                                        | Bound-versus-request detail only if already authorized; default none           | H-03/H-07 binding verifier                  | None                                                                 |
| `LIFECYCLE_CONFLICT`           | Disclosed H-07/H-09 state cannot accept exact action                         |  409 | `authoritative_read_required`                                  | Coarse resource/state category; no history or policy                           | Owning Connection/Task lifecycle layer      | None unless a separate winner already committed                      |
| `IDEMPOTENCY_CONFLICT`         | Same identity is used for non-identical semantic intent                      |  409 | `never`                                                        | None; no competing fingerprint or object                                       | H-06/H-08/H-09 idempotency owner            | None                                                                 |
| `APPROVAL_REQUIRED`            | Exact authorized action requires a separately disclosed Challenge            |  409 | `after_correction`                                             | Challenge reference only when disclosure-authorized                            | H-08 admission gate                         | None; no Task or Approval consumption                                |
| `CURRENT_EVIDENCE_UNAVAILABLE` | Required H-11/current durable evidence temporarily unavailable before effect |  503 | `same_request_after_delay`                                     | None; exact Trust/storage cause private                                        | Current-evidence gate                       | None; stale evidence cannot authorize                                |
| `REQUEST_TIMEOUT`              | Server/gateway stopped receiving a complete request                          |  408 | `authoritative_read_required` for mutations                    | None                                                                           | HTTP recipient/gateway                      | None inferred; mutation may be ambiguous                             |
| `RATE_LIMITED`                 | Fixed policy/resource pressure rejects before effect                         |  429 | `same_request_after_delay` only when semantic replay safe      | Bounded retry delay; no quota/tenant                                           | Ingress/resource policy                     | None                                                                 |
| `SERVICE_UNAVAILABLE`          | Temporary local dependency/service failure proven before effect              |  503 | `same_request_after_delay`                                     | Optional bounded retry delay only                                              | Owning service before side effect           | None                                                                 |
| `COMMIT_STATUS_UNKNOWN`        | Local/gateway failure leaves durable commit publicly ambiguous               |  503 | `authoritative_read_required`                                  | None                                                                           | Semantic transaction/gateway boundary       | Existing durable truth, if any, is unchanged and must be read        |
| `UPSTREAM_FAILURE`             | Trusted gateway cannot obtain a valid upstream response                      |  502 | `authoritative_read_required` for mutations                    | None; origin and cause hidden                                                  | Trusted gateway                             | None inferred                                                        |
| `UPSTREAM_TIMEOUT`             | Trusted gateway attempt expires                                              |  504 | `authoritative_read_required` for mutations                    | None                                                                           | Trusted gateway                             | None inferred                                                        |
| `INTERNAL_FAILURE`             | Unknown or unsafe internal cause                                             |  500 | `authoritative_read_required` for mutations; otherwise `never` | None                                                                           | Receiving component after safe collapse     | None inferred                                                        |

The registry MUST NOT add aliases, merge identities, rename an entry, create an
unregistered public cause, or assign an H-09 terminal outcome or H-11
historical classification an error identity. Finer internal cause codes MAY
exist only in protected audit and MUST NOT be accepted by a Client as public
retry or authority evidence.

**Applies to.** Every safely dispatched Ghost Bridge error, error producer,
gateway, Client, SDK, public adapter, and protected diagnostic mapping.

**Lifecycle/state impact.** Public error emission normally has no state effect;
it reports the semantic outcome already selected by the producing layer. It
MUST NOT roll back or manufacture an owning commit.

**Semantic failure.** An unknown, aliased, mismapped, widened-retry, or unsafe-
detail error MUST fail closed for authority and retry. A Client MUST NOT infer
success, compatibility, or another registered identity.

**Sources:** H-05, H-06, H-07, H-08, H-09, H-11, H-12, H-13. **Gaps:**
GB-034, GB-035, GB-036, GB-042.

## REQ-ERR-0004 - Logical error envelope and safe detail boundary

**Requirement.** The future D2 error representation MUST logically carry the
exact protocol release identity, one stable public error identity, one coarse
public outcome class, one retry class, an optional bounded retry delay, the
receiver-generated request identifier, and only the safe detail registered for
that error identity. This semantic inventory MUST NOT be treated as final JSON
member names.

A public error MUST NOT contain an internal exception or cause, stack trace,
SQL or storage text, provider payload, policy rule, credential, tenant or
workspace identity, hidden object-existence cause, raw rejected input, Trust or
anti-rollback floor, network target, redirect location, secret, canonical
sensitive bytes, or an unregistered alternative. Display text MAY be localized
or changed and MUST NOT be used as a stable machine identity. The complete
error response MUST remain within the 16-KiB transport bound.

**Applies to.** Error construction, safe details, localization, serialization,
gateways, public APIs, logs, SDK exposure, and future D2 schemas.

**Lifecycle/state impact.** Error representation and request correlation are
diagnostic only and create no authority, retry permission, or lifecycle state.

**Semantic failure.** Unsafe, unregistered, unbounded, secret-bearing, or
attacker-derived detail MUST be omitted or collapsed. If a safe envelope cannot
be framed, the transport MUST close rather than expose or guess.

**Sources:** H-02, H-05, H-11, H-12, H-13. **Gaps:** GB-034, GB-036,
GB-041, GB-048, GB-049.

## REQ-ERR-0005 - Exact failure precedence and one primary public error

**Requirement.** A receiver MUST preserve this internal semantic order:

1. framing, raw target, header limits, controls, duplicate singletons, and
   transfer ambiguity;
2. method, length, encoding, media, bounded body, UTF-8, JSON, duplicate-key,
   and release-syntax validation;
3. configured origin, release, profile, and operation binding;
4. authentication profile, proof freshness/replay, principal, issuer,
   audience, target, tenant, and purpose;
5. disclosure authorization before object-existence disclosure;
6. H-11 current evidence, H-07 Connection state/scope, structured
   authorization, and policy;
7. Approval, idempotency, lifecycle, and operation semantic validation; and
8. one accepted atomic semantic side effect or commit, followed by
   representation.

No semantic side effect, Task creation, Approval consumption, external effect,
or state-changing disclosure MAY occur before every applicable gate in steps 1
through 7 succeeds and is rechecked at its owning serialization boundary. One
primary public error MUST be selected by this precedence even when several
private causes exist. Private audit MAY retain bounded safe multi-fault cause
classes only under the protected-audit rules.

**Applies to.** Every request, multi-fault input, lookup, authority evaluation,
state-changing operation, safe error selection, and public adapter.

**Lifecycle/state impact.** Steps 1 through 7 have no state effect. Only the
owning step-8 commit can perform its defined transition.

**Semantic failure.** Reordered or skipped validation that permits an effect,
leaks protected existence, or emits a lower-precedence attacker-selected cause
MUST fail closed without partial commit or additional public errors.

**Sources:** H-02, H-05, H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-008,
GB-012, GB-013, GB-034, GB-035, GB-036.

## REQ-ERR-0006 - Privacy collapse and unknown-error handling

**Requirement.** Missing or invalid current authentication MUST use the same
safe 401 treatment without exposing its private axis. An undisclosed absent,
cross-tenant, wrong-scope, or otherwise hidden object MUST use the same 404
shape and timing class. A disclosed authenticated action denial MAY use only a
coarse 403. A 409 lifecycle or idempotency distinction MAY be exposed only
after the object and conflict class are disclosure-authorized. Trust, storage,
policy, topology, and internal causes MUST remain private. Malformed input MUST
NOT be echoed with values, alternatives, parser internals, or a path oracle.

Authorized H-09 terminal resources and H-11 historical resources MUST remain
semantic resources, not errors. An unknown public error identity MUST NOT be
interpreted as authority, success, retry permission, fallback, or a nearby
known identity. H-13 closed-Core, unknown-value, extension, and evolution rules
MUST control its safe handling; an extension MUST NOT widen detail, disclosure,
or retry.

**Applies to.** Authentication, protected lookup, authorization, conflicts,
multi-tenant resources, malformed messages, unknown errors, extensions, and
Clients.

**Lifecycle/state impact.** Public collapsing changes representation only and
MUST NOT weaken internal enforcement or alter a committed semantic outcome.

**Semantic failure.** Any distinguishable hidden-existence oracle, raw-input
echo, unknown-as-retry behavior, or extension-based widening MUST be rejected
without mutation or protected disclosure.

**Sources:** H-02, H-05, H-07, H-09, H-11, H-12, H-13. **Gaps:** GB-012,
GB-034, GB-036, GB-042, GB-048.

## Non-normative D2 traceability

This chapter creates no schema, OpenAPI contract, executable registry,
fixture, corpus, conformance oracle, SDK, or runtime behavior and closes no
`GB-*` gap.

`D2-01` must later encode the error envelope and each permitted detail
projection without changing the stable registry. `D2-03` must cover H-10/H-13
canonical cases for protected or extension-participating error details where
applicable. `D2-04` must cover every status and stable identity, all five retry
classes, delay boundaries, unknown errors, multi-fault precedence, 401
challenge singularity, 403/404 privacy collapse, stale/current-evidence
unavailability, secret/detail injection, terminal Task resources, and H-11
historical resources. `D2-05` must establish raw status/error equivalence,
safe disclosure behavior, and unknown-extension handling independently of
official implementation code.
