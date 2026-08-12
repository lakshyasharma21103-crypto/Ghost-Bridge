# Authentication

This chapter defines the common authentication semantics for
`ghostbridge/e1.r0-draft.1`. It defines selected-profile results, proof and
lifecycle behavior, not a wire schema, credential-provider API, cryptographic
encoding, or source of Connection or action authority.

## REQ-AUTH-0001 - Authentication proves identity, not authority

**Requirement.** Authentication MUST prove the typed Host principal that
presented an operation under the one selected authentication profile. An
authentication result, credential, proof, channel, provider session, or safe
credential reference MUST NOT by itself create a Connection, select a release
or capability, authorize an Invocation, create Approval authority, create Trust,
widen tenant scope, grant direct Agent-to-Agent authority, or replace structured
authorization, deployment policy, or Approval. Effective authority MUST remain
the narrowing intersection of the authenticated identity, active Connection
bounds, exact tenant scope, current Trust and revocation validity, structured
authorization, deployment policy, and exact-action Approval when required.

**Applies to.** Every authentication establishment, reauthentication, and
Connection-governed request.

**Lifecycle/state impact.** Authentication before the H-06 commit grants no
Connection authority. Authentication after that commit is only a current
narrowing input and MUST NOT create or widen lifecycle state.

**Semantic failure.** Treating authentication as any listed authority is a
non-authorizing authority-confusion failure; no Connection, Task, Approval
consumption, or external effect may result.

**Sources:** H-01, H-02, H-05, H-07. **Gaps:** GB-007, GB-008, GB-011, GB-013.

## REQ-AUTH-0002 - Exact selected-profile binding

**Requirement.** The H-04 selection process MUST bind exactly one eligible,
immutable, release-scoped authentication profile identity and revision to the
final installation context and resulting Connection. Both peers MUST use that
exact selection. They MUST NOT select or replace it through first-common or
array order, object enumeration, provider, package, Platform, or deployment
default, a nearest or apparently compatible profile, a weaker profile,
bearer-for-PoP substitution, cached prior success, or fallback to `none`.
Profile values MUST NOT be case-folded, locale-compared, aliased, or inferred
from a mutable `latest` or `current` reference. A selected-profile failure MUST
NOT trigger automatic retry under another profile.

H-05 did not assign final wire identifier spellings. This draft therefore uses
the semantic profile descriptions in REQ-AUTH-0003; D2 registry and schema work
MUST assign only exact identifiers approved for this release and MUST NOT infer
them from those descriptions.

**Applies to.** Profile eligibility, final preview and consent, redemption,
Connection creation, restart, and every Connection-governed request.

**Lifecycle/state impact.** Selection is non-authorizing until H-06 commits it.
After commit, the selected identity/revision is immutable; a material profile
change requires replacement rather than an in-place transition.

**Semantic failure.** No eligible exact profile, a selection mismatch, an
unknown or unsupported profile, or any listed substitution is incompatible or
non-selectable and creates no authority; on an existing Connection the request
is denied without changing the selected profile.

**Sources:** H-01, H-04, H-05, H-07, H-13. **Gaps:** GB-007, GB-009, GB-011.

## REQ-AUTH-0003 - Production profile floor

**Requirement.** A production deployment MUST use a complete concrete profile
registered for the exact selected release. Applicable local production MUST use
an authenticated local-peer profile that defines its exact operating-system,
process, endpoint, protected-channel, freshness, principal-mapping, and threat
evidence, or MUST use an eligible remote profile. Loopback, co-location in one
process, container or machine, transport reachability, and possession of a
reference MUST NOT count as authentication unless the selected concrete profile
defines verified evidence for that fact.

Every remote Host and Agent for this release MUST implement the release-scoped
signed-request proof-of-possession semantic baseline. Remote Governed operation
MUST use current PoP evidence satisfying REQ-AUTH-0007. An optional, fully
specified bearer profile MAY be selected only for Core-only production and MUST
NOT satisfy the remote Governed floor. Stronger or environment-specific local,
OAuth PoP, certificate-bound, managed, or broker-backed behavior MAY implement
authentication only through a complete, exactly registered release-scoped
profile; a provider or broker category alone is not a profile.

Every concrete production authentication profile MUST declare finite,
release-scoped bounds, as applicable, for credential validity; individual
request-proof lifetime or maximum age; reusable authenticated session or channel
lifetime and freshness; authentication, provider, and cache freshness; and
reauthentication or recovery freshness or maximum interval. Each applicable
bound MUST be an exact parameter of the release-scoped profile; omission MUST
NOT be filled by a provider, SDK, Platform, package, deployment, or runtime
default. H-05 selected no universal numeric values, so the exact concrete values
MUST remain owned by the release-scoped profile registry and D2 assets rather
than be invented by this chapter.

`none` MAY be used only in an explicitly labeled non-production fixture or test
harness. It MUST NOT create, recover, reactivate, or exercise a production
Connection and MUST NOT be a production default or fallback.

**Applies to.** Authentication-profile implementations and claims for local,
remote Core, remote Governed, managed, brokered, fixture, and test contexts.

**Lifecycle/state impact.** An eligible concrete production profile is required
before H-06 may create an active production Connection. Fixture `none` has no
production lifecycle effect.

**Semantic failure.** An incomplete category, unauthenticated local assumption,
bearer proof for Governed operation, unregistered composition, or fixture
`none` in production is unsupported and non-authorizing; it creates no
production Connection or Task.

**Sources:** H-04, H-05, H-12, H-14. **Gaps:** GB-007, GB-009, GB-013.

## REQ-AUTH-0004 - Common secret-free authentication result

**Requirement.** Every selected profile MUST produce one bounded, secret-free
semantic authentication result sufficient for independent enforcement and
restart. As applicable to that profile and operation, the result MUST bind:

- the exact selected protocol release and profile identity/revision;
- issuer, privacy-bounded credential subject, typed authenticated Host
  principal, and separately required Host application identity;
- the purpose-specific authentication audience and exact Agent/resource target;
- the exact Agent and Passport;
- organization and the tagged workspace value or explicit absence;
- the intended Connection context;
- establishment time, not-before, exclusive expiry, and last successful
  reauthentication where applicable;
- a safe credential, key, transport, refresh-authority, and revocation-authority
  reference only where the profile requires and permits retention;
- bearer, PoP, request-proof, transport-binding, and channel-binding classes as
  applicable;
- the direct immutable safe verification-evidence identity or H-10-qualified
  digest slot, plus any immutable historically resolvable safe evidence
  reference; and
- authentication state, the applicable finite credential, request-proof,
  session/channel, provider/cache, and reauthentication/recovery bounds from
  REQ-AUTH-0003, limitations, and recovery or terminal consequences.

The result MUST distinguish absence from a value and MUST preserve each
authority-relevant value without relying on current provider state, discovery,
package constants, defaults, or mutable labels. This inventory assigns semantic
meaning only and MUST NOT be treated as final schema member names.

**Applies to.** Establishment results, final preview/consent input, H-06
redemption intent, durable Connection authentication bindings, and current
request verification.

**Lifecycle/state impact.** The result remains non-authorizing until atomically
bound into an active Connection by H-06. Once bound, its identity and authority
semantics are immutable except for the same-invariant evidence refresh permitted
by REQ-AUTH-0008.

**Semantic failure.** A missing, ambiguous, mutable, secret-bearing, or
unresolvable authority-critical result is invalid or indeterminate and MUST fail
closed; it MUST NOT be reconstructed from a current provider, schema, or
default.

**Sources:** H-01, H-04, H-05, H-06, H-07, H-10, H-11. **Gaps:** GB-007,
GB-009, GB-010, GB-011.

## REQ-AUTH-0005 - Principal derivation and audience separation

**Requirement.** The receiver MUST derive the typed authenticated Host
principal solely from verified evidence produced under the exact selected
profile. Request-body assertions, Agent-provided user or role fields, mutable
labels, query parameters, grant or credential references, Connection IDs,
correlation or idempotency identifiers, and prior successful requests MUST NOT
establish or replace that principal. A credential subject MUST NOT be treated as
the principal unless the selected profile's verified principal-mapping rule
derives that exact typed principal.

The authenticated Host principal is the caller; the authentication audience is
the exact Agent/resource target. They MUST remain distinct. Authentication,
Offer, grant-resolution, authorization, Approval, Receipt, and other signed-
object audiences are purpose-specific and MUST NOT be silently copied, compared
as interchangeable, or reused across proof purposes.

**Applies to.** Establishment, redemption and replay eligibility,
Connection-governed requests, authorization input, Approval continuations,
cancellation, and authorized reads.

**Lifecycle/state impact.** Principal derivation has no state effect by itself.
A mismatch before Connection creation prevents commit; a mismatch on an
existing Connection denies the request, and a proposed principal or target
change requires replacement.

**Semantic failure.** Missing verified derivation, wrong principal type or
identity, wrong purpose/audience, or untrusted-field substitution is
unauthenticated and non-authorizing before Task creation or external effect.

**Sources:** H-02, H-05, H-06, H-07, H-08, H-12. **Gaps:** GB-007, GB-008,
GB-009, GB-012, GB-013, GB-016.

## REQ-AUTH-0006 - Credential material and reference safety

**Requirement.** Raw access or refresh tokens, passwords, private or client
keys, session credentials, reusable bearer or PoP material, provider secrets,
and other reusable credential material MUST NOT enter durable Connections,
Install Grants or replay records, Offers, previews, consent envelopes, Tasks,
Results, Receipts, public or historical evidence, governance or conformance
records, URLs, errors, logs, traces, metrics, or audit fields. A profile-
designated transient presentation location MAY carry only the material required
by that profile and MUST apply its protected transport, lifetime, redirect, and
redaction rules.

A selected credential provider, operating-system store, vault, identity
provider, hardware signer, or non-exporting service MAY retain reusable material
privately under access-controlled, least-privilege custody. Ghost Bridge
protocol artifacts MUST retain only the safe semantic result and immutable
evidence identities permitted by REQ-AUTH-0004. A credential, provider, key,
transport, or evidence reference alone MUST NEVER count as proof of identity,
presenter control, freshness, or authority, and a historical evidence identity
MUST NOT provide a route to retrieve reusable material.

**Applies to.** Credential establishment and custody, every protocol object,
durable store, public response, historical surface, and observability sink.

**Lifecycle/state impact.** None. Secret custody and safe references do not
create or preserve authority.

**Semantic failure.** Secret leakage or reference-as-proof is invalid and
non-authorizing. Verification MUST fail closed before commit or effect, while
incident handling and public disclosure remain governed separately.

**Sources:** H-05, H-06, H-07, H-08, H-09, H-12. **Gaps:** GB-007, GB-009,
GB-010, GB-011, GB-013.

## REQ-AUTH-0007 - Current selected-profile request proof

**Requirement.** Every request exercising Connection authority MUST present and
satisfy current evidence under that Connection's exact selected profile. A
reusable channel or session MAY provide evidence only when its complete profile
binds the exact authenticated Host principal, authentication audience,
Agent/resource target, tenant, Connection, individual request context,
freshness, and revocation state. A prior successful authentication or cached
provider result MUST NOT satisfy a later request.

For remote Governed operation, the current signed-request PoP semantics MUST
bind, as applicable, the request method and exact operation, Agent/resource
target, Connection, purpose-specific audience, organization and tagged
workspace, request/body semantic identity or digest slot, creation time,
exclusive expiry, single-use replay value, and exact profile, key, and proof
purpose. The verifier MUST validate presenter control, not-before and expiry,
freshness, request binding, replay status, current credential/key status, and
every repeated immutable Connection value. H-10 owns the exact canonical bytes,
digest and signature algorithms, encoding, key format, and cryptographic domain;
this requirement MUST NOT be used to invent them.

**Applies to.** Every Connection-governed operation, including Invocation,
cancellation, lifecycle recovery or termination, and protected reads according
to each operation's profile.

**Lifecycle/state impact.** An isolated bad proof denies only that request when
the durable binding remains current and uncompromised. It creates no Task,
consumes no Approval, and begins no external effect.

**Semantic failure.** Missing, malformed, stale, replayed, wrong-body,
wrong-operation, wrong-profile, wrong-key, wrong-audience, wrong-target,
wrong-Connection, wrong-principal, or wrong-scope proof is unauthenticated and
non-authorizing; no fallback is permitted.

**Sources:** H-02, H-05, H-07, H-10, H-11, H-12. **Gaps:** GB-007, GB-013,
GB-016, GB-017.

## REQ-AUTH-0008 - Freshness, reauthentication, rotation, and terminal loss

**Requirement.** Credential validity, individual request-proof lifetime or
maximum age, reusable authenticated session/channel lifetime and freshness,
authentication/provider/cache freshness, and reauthentication/recovery
freshness or maximum interval MUST each use the finite release-scoped bounds in
REQ-AUTH-0003. Those authentication bounds MUST remain distinct from Connection
expiry, Invocation admission deadline, authorization validity, Approval expiry,
Task execution timeout, and transport timeout. Authentication evidence is
invalid at its exclusive boundary; an expired or stale credential, proof,
session, channel, provider result, or cache result MUST NOT be refreshed by
cached prior success, grace, clock skew that extends expiry, or a provider,
SDK, Platform, package, deployment, or runtime default.

The authentication consequence MUST be classified as follows:

| Condition                                                                                                                                                                                                | Required consequence                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isolated malformed, expired, stale, replayed, wrong-body, or wrong-operation request proof                                                                                                               | Deny the request without lifecycle change when the durable credential/binding is otherwise current and uncompromised                                                                                                                                                                     |
| Ordinary credential expiry, refresh failure after credential validity is exhausted, provider unavailability beyond permitted freshness, lost channel binding, or unresolved non-compromise key ambiguity | Deny governed use and durably suspend authentication-dependent Connection use; only exact same-invariant recovery may restore eligibility                                                                                                                                                |
| Planned same-invariant rotation                                                                                                                                                                          | Preserve or resume the Connection only after serialized proof that profile, issuer, credential subject, authenticated principal, Agent, Passport, audience/target, tenant, proof class, limitations, consent, and authority bounds are unchanged; retain immutable safe old/new evidence |
| Material identity, profile, issuer, subject, principal, Agent, Passport, audience/target, tenant, limitation, consent, or authority change                                                               | Prohibit in-place reauthentication and require a new final preview, explicit consent, applicable grant, and replacement Connection                                                                                                                                                       |
| Credential, key, principal, Agent, Passport, or binding compromise, authoritative selected-binding revocation, or explicit Connection revocation                                                         | Terminally revoke the affected existing Connection; ordinary reauthentication MUST NOT restore it                                                                                                                                                                                        |

Reauthentication or rotation MUST NOT change immutable Connection identity,
selected release, profile category, principal, tenant, Agent, Passport,
audience, capability authority, limitations, consent meaning, or restrictions.
Suspension MUST NOT pause expiry, and no recovery class permits a weaker,
bearer-for-PoP, adjacent-profile, provider-default, broker-failure, or `none`
fallback.

A concrete profile MAY keep a transient provider or channel condition
request-local only while all applicable credential, session/channel, provider,
cache, and proof bounds remain valid and the durable binding remains current and
uncompromised. It MUST NOT reclassify ordinary credential expiry or exhausted
refresh validity as continued active governed use, and it MUST NOT add grace
after an exclusive validity boundary.

**Applies to.** Proof expiry, credential refresh, reauthentication, key or
channel rotation, provider outages, compromise, and revocation on an existing
Connection.

**Lifecycle/state impact.** The table deliberately selects request denial,
durable suspension/resumption, replacement, or terminal revocation. H-07 owns
the corresponding serialized state transition and H-11 owns current evidence,
anti-rollback, overlap, and compromise history.

**Semantic failure.** A recovery that cannot prove its exact class and every
same-invariant value is indeterminate and MUST fail closed without reactivation,
fallback, or mutation.

**Sources:** H-05, H-07, H-09, H-11, H-12. **Gaps:** GB-007, GB-011, GB-015.

## REQ-AUTH-0009 - Authentication failure boundary

**Requirement.** Authentication processing MUST distinguish enough internal
semantic cause to apply the following non-authorizing outcome without inventing
public error identifiers or transport mappings:

| Semantic condition                                                                                                                                                              | Required effect                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Missing individual request proof or credential presentation                                                                                                                     | Deny establishment or request; an exhausted or lost durable credential/binding follows REQ-AUTH-0008 class B suspension |
| Unknown, unsupported, wrong, mismatched, or downgraded profile                                                                                                                  | No establishment/commit or current request acceptance; no fallback                                                      |
| Wrong issuer, subject/principal, audience, target, Agent/Passport, Connection, organization, or tagged workspace                                                                | Deny substitution; material bound-value change requires replacement                                                     |
| Malformed, not-yet-valid, expired, stale, wrong-request-bound, or replayed individual request proof                                                                             | Deny before Task, Approval consumption, or effect; retain safe replay evidence where required                           |
| Credential, provider, key, transport, or evidence reference presented without proof                                                                                             | Deny; a reference is not proof                                                                                          |
| Fixture `none` in production or bearer where Governed PoP is required                                                                                                           | Unsupported and non-authorizing                                                                                         |
| Ordinary credential expiry, refresh failure after validity is exhausted, provider unavailable beyond permitted freshness, lost channel binding, or non-compromise key ambiguity | Deny governed use and suspend authentication-dependent Connection use pending exact same-invariant recovery             |
| Transient provider/channel condition while every applicable bound remains valid                                                                                                 | Deny the request; remain request-local only where the concrete profile expressly permits it                             |
| Authoritative revocation or compromise                                                                                                                                          | Apply the terminal consequence in REQ-AUTH-0008, never ordinary recovery                                                |

Every failure before a new-work acceptance commit MUST grant no authority,
create no Task, consume no Approval merely because verification was attempted,
and begin no external effect. Error output and protected audit MUST NOT expose
credential material, proof secrets, raw subject claims, provider internals,
tenant or object existence, or a more specific public distinction than H-12
permits.

**Applies to.** Establishment, redemption, every Connection-governed request,
reauthentication, rotation, recovery, and authenticated disclosure.

**Lifecycle/state impact.** Exactly the request-local, suspended, replacement,
or terminal class defined above; no other authentication-driven state effect is
permitted.

**Semantic failure.** Any unclassified, multi-fault, unavailable, or
verification-indeterminate authentication outcome MUST fail closed and MUST NOT
be treated as successful, retryable, or non-committed merely from transport
behavior. H-12 owns public precedence and collapse.

**Sources:** H-02, H-05, H-06, H-07, H-11, H-12. **Gaps:** GB-007, GB-009,
GB-011, GB-013, GB-015, GB-016.

## Non-normative D2 traceability

Later D2 work is expected to derive common authentication-context and concrete
profile schemas, establishment and request-proof cases, and downgrade,
principal, audience, target, tenant, Connection, freshness, replay, provider,
rotation, revocation, and secret-leak fixtures from these requirements. This
chapter creates none of those assets and closes no `GB-*` gap.
