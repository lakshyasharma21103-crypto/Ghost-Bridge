# Privacy considerations and safe observability

This chapter defines the privacy, minimization, ordinary telemetry, tracing,
and protected-audit floor for `ghostbridge/e1.r0-draft.1`. It defines semantic
collection and disclosure limits, not a telemetry backend, legal regime,
universal data-subject API, retention schedule, region, or operator-access
policy.

## REQ-PRIV-0001 - Purpose-limited minimization across every surface

**Requirement.** Every implementation MUST minimize collection, processing,
retention, and disclosure at request and response boundaries, public errors,
ordinary logs, metrics, traces, events, crash reporting, protected audit,
historical storage, and extension handling. It MUST collect or expose only the
bounded semantic values necessary for the selected operation and accepted
purpose. Unrestricted prompts, inputs, outputs, provider payloads, memory,
reasoning, policy, signed objects, canonical bytes, or other semantic content
MUST NOT be retained or emitted merely because it may help debugging,
analytics, support, or observability.

Minimization MUST preserve the exact evidence and durable facts another
accepted requirement requires for authority enforcement, convergence, replay
prevention, effect truth, historical verification, audit/dispute, or recovery.
It MUST NOT delete a required dependency early, fabricate absence, rewrite
history, or weaken a current gate. Where a digest, immutable reference, safe
category, bucket, or tombstone satisfies the accepted purpose, implementations
SHOULD prefer it over raw content.

**Applies to.** Clients, Hosts, Agents, Trust services, gateways, SDKs, stores,
telemetry, audit, archives, support tooling, errors, and extensions.

**Lifecycle/state impact.** Collection, redaction, minimization, and disclosure
cause no protocol lifecycle transition and MUST NOT create or remove authority.

**Semantic failure.** Unnecessary, unbounded, purpose-incompatible, or
secret-bearing collection/export MUST be blocked or minimized before emission.
Loss of required history instead makes the dependent operation unavailable or
indeterminate and MUST NOT be interpreted as permission or nonexistence.

**Sources:** H-02, H-05, H-07, H-09, H-10, H-11, H-12, H-14. **Gaps:**
GB-024, GB-028, GB-036, GB-048, GB-049.

## REQ-PRIV-0002 - Disclosure authorization and identifier possession

**Requirement.** Possession of a Grant, Connection, Challenge, Approval, Task,
Result, Receipt, request, correlation, trace, key, or other identifier MUST NOT
authenticate a caller or authorize existence, state, content, timing, tenant,
scope, lifecycle, policy, Trust, or retention disclosure. Every protected read
MUST apply current authentication appropriate to that disclosure operation,
exact organization and tagged workspace relationship, purpose-bound
authorization, and the owning object's disclosure rules.

An undisclosed absent, cross-tenant, cross-workspace, wrong-principal,
wrong-Connection, or hidden object MUST use the same bounded 404 public shape
and treatment. A disclosed action denial MAY expose only the coarse 403 class;
lifecycle or idempotency detail MAY appear only after disclosure authorization.
Public request IDs and safe opaque links MUST NOT reveal tenant topology or
provide cross-scope lookup authority. Constant-shape safe errors, coarse
latency treatment, and other bounded controls MUST be applied as residual
mitigations against timing inference. They MUST NOT deliberately introduce a
cause-dependent protected-existence distinction. They do not claim or require
perfect response-time or response-size equalization.

**Applies to.** Every protected lookup, status/poll, Result/Receipt/history
read, public error, support lookup, identifier, and multi-tenant deployment.

**Lifecycle/state impact.** Disclosure checks and reads are observations only
and grant no current or historical lifecycle authority.

**Semantic failure.** Missing or indeterminate disclosure authority, cross-
scope access, or identifier-as-authority use MUST fail without mutation and
without a deliberate cause-dependent protected-existence or tenant disclosure.
Residual timing inference remains subject to the accepted H-12 boundary.

**Sources:** H-02, H-05, H-07, H-09, H-11, H-12. **Gaps:** GB-012,
GB-022, GB-023, GB-028, GB-036, GB-048.

## REQ-PRIV-0003 - Values prohibited from ordinary telemetry and public errors

**Requirement.** Ordinary logs, metrics, traces, events, crash annotations,
analytics, and public errors MUST NOT contain:

- `Authorization`, cookies, proxy credentials, bearer or session material,
  private or client signing keys, raw H-05 proofs, private signature material,
  or complete headers;
- Install Grant secrets, Approval secrets or proofs, reset or recovery secrets,
  secret idempotency material, or secret-bearing request/response bodies;
- unrestricted prompts, inputs, outputs, provider payloads, memory, reasoning,
  private policy, or protected Receipt content;
- raw signed sensitive objects or canonical bytes containing tenant/security
  data; a separately required protected audit MAY retain only the necessary
  digest or immutable reference;
- raw query strings, URL userinfo, redirect `Location`, full origin or
  hostname, arbitrary path segments, raw network metadata targets, or
  unredacted IP addresses;
- stack traces, internal exception or cause text, database/storage errors,
  policy rule names, Trust or revocation floor values, hidden object-existence
  causes, or rejected raw input;
- raw tenant, workspace, principal, Connection, Task, Result, Receipt, or
  Approval identifiers; or
- peer `tracestate`, `baggage`, cross-tenant-linkable values, or values linkable
  across a forbidden scope or telemetry purpose.

The prohibition MUST apply before serialization, formatting, sampling,
aggregation, buffering, crash capture, or export. Public error safe-detail rules
MUST remain a stricter per-identity allowlist and MUST NOT be widened by a
telemetry field.

**Applies to.** Every ordinary observability pipeline, public error, crash
reporter, analytics exporter, logger, metric, trace, and intermediary hop.

**Lifecycle/state impact.** Suppression changes observability representation
only and cannot change semantic state, commit evidence, or authority.

**Semantic failure.** A prohibited value MUST be removed before ordinary
telemetry/export; if safe removal cannot be proven, the event MUST be dropped
or reduced to an allowed coarse event without weakening the semantic operation.

**Sources:** H-05, H-08, H-09, H-10, H-11, H-12. **Gaps:** GB-010,
GB-018, GB-025, GB-028, GB-036, GB-048, GB-049.

## REQ-PRIV-0004 - Allowlist-first recursive redaction and log sanitization

**Requirement.** Redaction MUST be allowlist-first, recursive, and complete
before serialization or export. Deny-key or substring patterns MAY be used
only as defense in depth and MUST NOT replace typed allowlisting. Every emitted
string MUST remove or safely escape C0 and C1 controls, CR/LF, terminal escape
sequences, and unsafe directionality characters. Truncation MUST occur on valid
UTF-8 boundaries and MUST respect the 1-KiB field, 2-KiB message, 16-KiB event,
and 32-application-field ceilings.

One attacker-controlled string MUST NOT create multiple log records, fields,
metric samples, span events, or terminal output records. Ordinary telemetry
SHOULD use typed structured fields instead of interpolated free text. A safe
event MUST NOT echo a rejected value, parser path, alternative, redirect
target, host, tenant, or object identifier.

**Applies to.** Log/event construction, error handling, structured and text
sinks, terminals, crash reporters, metrics exemplars, traces, and exporters.

**Lifecycle/state impact.** Sanitization and truncation have no protocol state
effect and MUST NOT become semantic evidence or a commit boundary.

**Semantic failure.** Unsanitized controls, recursive secret leakage,
invalid-UTF-8 truncation, record injection, or over-limit output MUST be blocked
before the sink; the semantic transaction MUST remain independent of telemetry
delivery.

**Sources:** H-05, H-12, H-13. **Gaps:** GB-036, GB-042, GB-048, GB-049.

## REQ-PRIV-0005 - Safe ordinary telemetry and metric cardinality

**Requirement.** Ordinary baseline telemetry MAY contain only:

- the receiver-generated bounded opaque request identifier;
- operation class, never a raw route;
- exact protocol release;
- coarse outcome, status, and retry class;
- latency bucket;
- bounded request and response byte buckets;
- a safe registered public error identity;
- retry-count bucket; and
- a deployment/component identifier that exposes neither tenant nor host
  origin.

Local diagnostic subject identifiers MAY use tenant-scoped, purpose-specific
keyed digests under deployment policy. The same key or digest MUST NOT link
subjects across tenants or telemetry purposes and MUST NOT act as a protocol
identifier, credential, disclosure authority, or public field.

Metric labels MUST be fixed low-cardinality enums such as component, operation
class, release, outcome, status class, retry class, and bounded size/latency
buckets. A metric label MUST NOT contain a request/object identifier, origin,
IP address, tenant, workspace, principal, capability, user input, exception,
free-form cause, or error text. Cardinality and event rate MUST be bounded
before export so attacker-selected input cannot exhaust the telemetry system.

**Applies to.** Ordinary logs, metrics, traces, events, dashboards, exporters,
diagnostic correlations, and rate/cardinality controls.

**Lifecycle/state impact.** Safe telemetry is observational and creates no
authority, retry permission, disclosure right, or lifecycle transition.

**Semantic failure.** A non-allowlisted field, cross-tenant digest, free-form
label, or unbounded cardinality/rate MUST be rejected, bucketed, or omitted
before export without changing the underlying protocol result.

**Sources:** H-02, H-05, H-12, H-14. **Gaps:** GB-014, GB-036, GB-048,
GB-049.

## REQ-PRIV-0006 - External trace boundary

**Requirement.** At each external trust boundary, the receiver MUST start its
own tenant-scoped trace with a receiver-controlled identity. A validated peer
`traceparent` MAY be retained only as a separately labeled non-authoritative
link under explicit bilateral observability policy. A receiver MUST NOT import,
propagate, or make authority decisions from peer `tracestate` or `baggage`.

Spans and links MUST NOT contain credentials, semantic request or response
bodies, raw protocol/object/tenant/principal identifiers, URLs, full origins,
network targets, protected error causes, policy details, Trust floors, or
canonical sensitive bytes. Parent/child or linked traces MUST NOT inherit
principal, tenant, Connection, authority, idempotency, acceptance, deadline,
or outcome.

**Applies to.** Distributed tracing across Client, Host, Agent, gateway, proxy,
Trust, provider, worker, and telemetry-export boundaries.

**Lifecycle/state impact.** Trace creation and linkage perform no semantic
operation and cause no lifecycle, idempotency, authority, or Task transition.

**Semantic failure.** Unsafe peer state, cross-tenant linkage, raw identifiers,
or trace-derived authority MUST be discarded before propagation; a required
semantic operation MUST continue or fail only under its owning rules, not from
trace state.

**Sources:** H-02, H-05, H-09, H-12. **Gaps:** GB-014, GB-048, GB-049.

## REQ-PRIV-0007 - Protected audit is separate evidence, not semantic truth

**Requirement.** A protected security/audit store MUST be separate from
ordinary logs, metrics, traces, events, and public errors. It MAY retain exact
semantic references, Decisions, commitments, digests, lifecycle cause
categories, and H-11 classifications only when another accepted requirement
requires them for enforcement, convergence, replay prevention, recovery,
historical verification, audit, or dispute.

Protected audit MUST be tenant-isolated, access-controlled, integrity-
protected, purpose-limited, and bounded. It MUST NOT retain raw reusable
credentials, bearer/session material, Grant secrets, Approval proof, reset or
recovery secrets, private keys, unnecessary signed bodies, or unnecessary
unrestricted prompts, inputs, outputs, provider payloads, memory, reasoning,
or policy merely for observability.

The semantic transaction or durable object MUST remain the source of truth.
Audit intent, event construction, delivery, storage, acknowledgement, loss, or
replay MUST NOT create, complete, roll back, repair, duplicate, or substitute
for a Connection, Approval, Invocation, Task, Result, Receipt, revocation, or
other semantic transition.

**Applies to.** Security ledgers, audit trails, incident evidence, semantic
transactions, durable audit intents, operators, and audit exporters.

**Lifecycle/state impact.** Protected audit records evidence about an owning
commit and has no independent lifecycle or authority effect.

**Semantic failure.** Audit unavailability or mismatch MUST NOT be interpreted
as commit/noncommit or authorize a retry. Unsafe or overbroad audit content
MUST be minimized or denied without rewriting the semantic fact it observes.

**Sources:** H-02, H-05, H-07, H-08, H-09, H-11, H-12, H-14. **Gaps:**
GB-018, GB-021, GB-028, GB-048, GB-049.

## REQ-PRIV-0008 - Retention ownership, legal workflows, and extension privacy

**Requirement.** Each retained layer MUST remain purpose-specific. Surviving
authority, idempotency, replay-prevention, Result, Receipt, Trust/history,
audit/dispute, recovery, and support dependencies define a minimum dependency
floor: a retained dependency MUST NOT be deleted before its greatest applicable
surviving floor. This chapter does not define the maximum retention period.
Retention beyond a dependency floor remains subject to the exact purpose,
minimization, legal and deployment obligations, and concrete H-14 retention
policy. H-14 MUST own concrete retention periods, regional and storage policy,
operator access, deletion schedules, support/archive windows, and incident
commitments. A deployment or implementation MUST NOT invent those as universal
protocol values, silently shorten a surviving dependency, or use retention as
current authority. Permanent or longer retention MUST be preserved where
another accepted H-14, H-11, or history requirement requires it.

This release defines no universal Native protocol operation for a legal or
data-subject access, correction, export, objection, or deletion request. Such
workflows MUST remain legal/deployment interfaces outside the Native baseline
unless a later accepted governance decision defines a protocol operation. They
MUST NOT be simulated through an unregistered route, query action, extension,
error detail, or lifecycle transition. Deployment workflows MAY act on stored
data only while preserving required immutable facts, non-authority, tenant
isolation, and every surviving dependency.

H-13 rules MUST govern every extension used in transport metadata, errors,
ordinary telemetry, protected audit, or retained objects. An extension MUST NOT
bypass minimization, create a secret channel in an optional field, widen
disclosure, create authority, become an unbounded metric label, add unredacted
public error detail, or authorize logging merely because it is syntactically
optional. Unknown required semantics MUST fail as H-13 specifies; unknown
optional opaque data MUST remain potentially sensitive and non-authoritative.

**Applies to.** Retention and deletion decisions, archives, operator access,
legal/deployment workflows, extensions, telemetry, errors, and support claims.

**Lifecycle/state impact.** Retention and legal/deployment handling create no
Native lifecycle transition unless an existing owning requirement separately
defines one. Extensions create no authority or independent state.

**Semantic failure.** Premature deletion, unbounded retention, invented Native
subject-request behavior, or extension-based privacy bypass MUST fail closed
for the affected operation or claim without fabricating authority, absence, or
historical meaning.

**Sources:** H-03, H-09, H-10, H-11, H-12, H-13, H-14. **Gaps:** GB-024,
GB-028, GB-036, GB-042, GB-048, GB-049, GB-057.

## Non-normative D2 traceability

This chapter creates no telemetry or audit schema, legal workflow, retention
schedule, state machine, vector, malicious corpus, conformance oracle, SDK,
backend, or exporter and closes no `GB-*` gap.

`D2-01` must later encode only required safe transport/error metadata and
protected audit references derived from owning requirements. `D2-03` must cover
canonical extension/error-detail cases where H-10/H-13 participates. `D2-04`
must cover secret injection into every telemetry surface, recursive and control-
character log injection, UTF-8 truncation, metric cardinality/rate attacks,
trace baggage rejection, cross-tenant identifiers and digest linkage, 403/404
existence collapse, audit-versus-commit ambiguity, unsafe retention, and
extension disclosure bypass. `D2-05` must establish minimum privacy,
minimization, ordinary-observability, protected-audit, and safe-public-error
conformance without treating an implementation's current logger or Platform
behavior as normative.
