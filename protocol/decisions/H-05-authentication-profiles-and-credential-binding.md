# H-05 — Authentication profiles and credential binding

## Decision ID

`H-05`

## Status

**ACCEPTED**

Option B — Layered establishment plus per-request authentication, Baseline 2 —
Role/context-scoped concrete baseline, fixture/testing-only `none`, Binding 2 —
Hybrid semantic result plus secret-free immutable evidence, the hybrid
current-evidence request-authentication model, the mixed Core/Governed
bearer-versus-PoP rule, and the graduated deterministic reauthentication and
failure model were approved by rudra on 2026-07-31.

The complete legacy-mode disposition, establishment and final-consent rules,
principal and purpose-specific audience rules, credential-custody boundary,
downgrade prohibitions, historical-treatment rules, qualifications, accepted
risks, compatibility impact, and security impact recorded in this decision are
part of the approval.

This acceptance records a protocol-governance decision only. It does not create
normative requirements, authorize schemas or runtime changes, close a `GB-*`
gap, authorize migration or publication, publish a release, or claim Protocol
1.0 conformance.

Current code and tests remain historical evidence inputs; they did not approve
or define this decision. H-01 through H-04 remain `ACCEPTED`, and H-06 through
H-14 remain deferred.

## Date prepared

2026-07-30

## Scope

This record preserves the accepted human decision about the interoperable
meaning of Ghost Bridge authentication profiles after H-04 selects one exact
common eligible authentication-mode identifier. Its retained decision analysis
compares:

- profile architecture and release-scoped identity;
- mandatory local, remote Core, and remote Governed baselines;
- the disposition of `none`;
- establishment, user interaction, and credential handling;
- authenticated Host principal, issuer, authentication audience,
  Agent/resource target, Connection, organization, and workspace binding;
- credential reference, presentation, proof, transport, and channel binding;
- request freshness, replay, expiry, refresh, rotation, revocation, and
  reauthentication;
- Connection suspension, replacement, and authentication failure;
- legacy authentication-mode names;
- secret handling, privacy, downgrade, compatibility, migration, and
  independent implementation; and
- consequences for later normative, schema, state-machine, error, fixture, and
  conformance work.

The packet is deployment-neutral. It does not assume a browser, cloud identity
provider, operating system, container platform, centralized broker, official
TypeScript SDK, Ghost Bridge Platform, or managed control plane.

## Out of scope

This packet does not:

- write normative specification requirements or assign normative requirement
  IDs;
- create or change schemas, registries, state machines, fixtures, vectors,
  conformance cases, packages, SDKs, Native Client, Native Agent, Trust,
  Platform, tests, examples, or runtime behavior;
- implement an identity provider, credential broker, signer, verifier, token
  service, or migration;
- select exact HTTP header names, routes, statuses, public error codes, retry
  values, limits, or logging fields;
- select canonical bytes, digest or signature algorithms, encodings, key
  formats, or cryptographic domain labels;
- decide Install Grant replay, concurrency, consumed-grant, lost-response, or
  exact transaction semantics;
- complete the Connection, Approval, Task, revocation, support, or release
  lifecycle;
- make a legacy mode name, callback, proof object, Platform provider, or test
  expectation authoritative;
- close a `GB-*` gap; or
- declare, publish, or imply Protocol 1.0.

## Accepted-decision dependencies

### H-01 — lifecycle initialization and ordering

H-01 is `ACCEPTED` and controlling. Discovery and preview are
non-authoritative. Authentication or credential setup before redemption grants
no Connection authority. The final selected authentication information stays
inside the immutable preview and consent envelope; material change requires a
new preview and new human consent. Required authentication and validation
complete before the accepted H-01 authority-creation commit. Successful Install
Grant redemption and durable Connection creation is the authority
initialization point. Restart resumes the durable Connection rather than
renegotiating authentication from current discovery
(`protocol/decisions/H-01-lifecycle-initialization-and-ordering.md:714-753`).

H-05 may select authentication lifecycle consequences, but H-06 retains grant
consumption, replay, concurrency, and lost-response outcomes.

### H-02 — roles, trust boundaries, and authorization floor

H-02 is `ACCEPTED` and controlling. Protocol authentication answers which Host
principal or peer presented a request. It grants no Connection or action
authority. Connection authority, structured authorization, deployment policy,
Trust verification, and exact-action Approval remain separate. Effective
authority is their intersection, never their union. The Agent remains the
mandatory final protocol-floor enforcement point. An authenticated principal is
derived from trusted transport/profile evidence, never from a request-body
claim. Direct or inherited Agent-to-Agent authority remains prohibited
(`protocol/decisions/H-02-roles-trust-boundaries-and-authorization-floor.md:893-1011`).

H-05 does not redefine policy internals, structured authorization evidence,
Trust, or Approval.

### H-03 — release identity and history

H-03 is `ACCEPTED` and controlling. Authentication-profile identifiers and
semantic evidence are evaluated under one exact selected protocol release.
Profile identity, profile revision, protocol release, SDK version, package
version, deployment version, and credential version are separate. Mutable
`latest` or current pointers cannot define historical meaning. Active and
historical Connections retain their exact selected authentication profile and
relevant immutable evidence. Compatibility and numeric release order remain
separate
(`protocol/decisions/H-03-protocol-version-identity-and-history.md:155-314,
245-291`).

H-05 does not reopen release syntax, ordering, compatibility, errata, or
historical-release identity.

### H-04 — capability/profile negotiation and exact authentication selection

H-04 is `ACCEPTED` and controlling. The Host explicitly selects exactly one
authentication-mode identifier from the exact common eligible set, and the
Agent independently verifies that exact choice. There is no first-common
selection, array-order selection, ranking input, nearest-mode substitution, or
automatic weaker-mode fallback. The selected identifier binds through preview,
consent, and the durable Connection
(`protocol/decisions/H-04-capability-profile-and-optional-feature-negotiation.md:886-902,
1810-1814`).

H-04 selected identifier eligibility only. H-05 retains establishment, proof,
authentication-audience and proof-purpose-audience handling, credential
handling, expiry, refresh, revocation, reauthentication, and concrete security
semantics. This packet does not reopen H-04's selection algorithm.

H-04 also accepted Binding Alternative 3's direct/reference division: the
durable Connection directly retains authority-critical safe semantic results,
including immutable evidence-bundle identities or future H-10-qualified
digests, while bulky immutable safe evidence may remain externally and
historically resolvable. H-05 preserves that direct binding and does not hide
the identity/digest behind another lookup. H-05 separates the authenticated
Host principal from the Agent/resource authentication audience without
weakening H-04's binding
(`protocol/decisions/H-04-capability-profile-and-optional-feature-negotiation.md:1295-1345,1838-1844`).

## Deferred-decision boundaries

| Decision | Boundary preserved by H-05 |
| --- | --- |
| H-06 | Retains Install Grant replay, concurrent redemption, consumed-grant outcomes, lost redemption response, and exact transaction commit semantics. H-05 only requires authentication validation before the H-01 commit. |
| H-07 | Retains the complete Connection state machine, exact suspension/replacement/recovery transition encoding, persistence atomicity, and reauthentication implementation. H-05 selects the semantic consequence H-07 must represent; H-07 cannot make terminal compromise/revocation recoverable. |
| H-08 | Retains Approval lifecycle, eligibility, exact action, and consumption. Authentication never satisfies Approval. |
| H-09 | Retains Task behavior when authentication changes during accepted durable work, including cancellation, compensation, and terminal Receipt outcomes. |
| H-10 | Retains canonical bytes, digest/signature algorithms, encodings, cryptographic domain labels, key formats, and exact signed-request preimages. H-05 may select the semantic fields that a proof must bind. |
| H-11 | Retains revocation-set sequencing, freshness, anti-rollback, key-rotation overlap governance, compromise history, and historical Receipt verification. H-05 selects credential-invalidity consequences without inventing H-11 mechanics; H-11 cannot change the recovery-versus-terminal class. |
| H-12 | Retains public error identifiers, HTTP statuses, error precedence, header placement, redirects, retries, limits, timeouts, and logging fields. H-05 defines semantic failure categories and secret-handling constraints. |
| H-13 | Retains schema openness, unknown profile fields, extension namespaces, profile-extension evolution, and experimental graduation. |
| H-14 | Retains registry publisher, profile publication/signing authority, support windows, deprecation, withdrawal, release governance, and Protocol 1.0 graduation. |

Where H-05 needs a semantic result whose wire form or transition belongs to a
later decision, this record states the dependency rather than inventing that
later answer.

## Affected GB gap IDs

Primary gaps:

- `GB-007` — mode strings exist without interoperable establishment, proof,
  principal, audience, lifecycle, or failure semantics
  (`docs/protocol/normative-specification-gap-analysis.md:58`);
- `GB-009` — authentication validation interacts with Install Grant redemption
  and authority creation (`docs/protocol/normative-specification-gap-analysis.md:60`);
- `GB-039` — credential placement and forwarding across redirects is a
  transport and leakage concern
  (`docs/protocol/normative-specification-gap-analysis.md:105`); and
- `GB-047` — security-profile assumptions, lifetimes, storage, and fail-closed
  behavior are incomplete
  (`docs/protocol/normative-specification-gap-analysis.md:118`).

Closely coupled but separately governed:

| Gap IDs | H-05 relationship and retained boundary |
| --- | --- |
| `GB-004` | Discovery advertises profile support, setup metadata, and freshness, but discovery caching/origin rules remain separate. |
| `GB-008` | Authentication supplies principal/context to H-02 structured authorization; it does not replace authorization. |
| `GB-010` | Preview must be secret-free and bind selected authentication consequences; preview schema and cache lifecycle remain separate. |
| `GB-011` | The final Connection needs authentication semantics and evidence; the complete Connection schema/state machine remains separate. |
| `GB-012`, `GB-013` | Principal, audience, organization/workspace, Connection, and request proof must agree; reusable scope and Invocation contracts remain separate. |
| `GB-027` | Request and evidence digests need H-10 canonicalization; H-05 decides semantic coverage only. |
| `GB-028`–`GB-033` | Credential/key history, rotation, revocation, freshness, and rollback are coupled to authentication validity but remain H-11-governed. |
| `GB-034`–`GB-041` | Authentication failures, HTTP challenge/credential placement, redirects, limits, content types, and logging need H-12 outcomes. |
| `GB-043`–`GB-045` | Authentication profile schemas and historical revisions need release-scoped backward/forward evolution rules already bounded by H-03/H-13. |
| `GB-049` | Authentication audit must be secret-free and commit-ordered; the audit schema and required fields remain separate. |
| `GB-052`, `GB-053` | PoP, replay, downgrade, mutation, and redaction need portable vectors and malicious fixtures after H-10 and normative work. |
| `GB-055` | Platform credential providers and sealed sessions must project a deployment-neutral protocol result. |
| `GB-058` | Bidirectional cross-language profile interoperability is required evidence, not supplied by current tests. |
| `GB-059` | Authentication, credential handling, broker/proxy boundaries, replay, and lifecycle need independent security review. |
| `GB-060` | A mandatory authentication baseline is a prerequisite to, but not a declaration of, Protocol 1.0. |

H-05 acceptance alone closes no gap. Closure requires later normative
requirements, canonical schemas, state machines, malicious fixtures, vectors,
conformance cases, a second independent implementation, and bidirectional
interoperability evidence.

## Affected Phase work items

H-05 maps directly to:

- `D1-03` — authentication, installation, Connection, and Invocation semantics;
- `D1-07` — security, privacy, error, and downgrade requirements;
- `D2-01` — authentication, binding, proof, and Connection schemas;
- `D2-04` — positive, negative, malicious, lifecycle, and transport fixtures;
- `E-02` — deployment-neutral SDK authentication interfaces and Platform
  separation; and
- `P1-03` — external security review, malicious testing, and remediation.

These mappings appear in the Phase plan's H-05 row and work-item descriptions
(`docs/protocol/phase-15d-plan.md:28,83-87`). This packet authorizes none of
that later work.

## Terminology and distinctions

| Term | Meaning for this decision | Must not be confused with |
| --- | --- | --- |
| Authentication mode | Historical or user-facing category such as OAuth or mTLS. A name alone has no complete semantics. | A concrete profile or proof |
| Authentication profile | Release-scoped, independently implementable contract for establishment, principal derivation, proof/channel use, authentication-audience/tenant binding, lifecycle, failure, and storage. | Deployment configuration or code callback |
| Profile identifier | Exact identifier for one registered authentication profile under one protocol release. | Display name, array position, or transport name |
| Profile version/revision | Immutable revision of profile semantics, separately identified where the protocol release permits it. | Protocol release, credential version, SDK version, or key version |
| Profile advertisement | Bounded claim that a role implements a profile and can resolve its immutable semantic evidence. | Eligibility, selection, or successful authentication |
| Profile eligibility | H-03/H-04 result that a profile may be selected in the exact release/context. | Authentication or authority |
| Selected profile | The one exact H-04-selected identifier bound to preview, consent, and Connection. | Established credential or successful proof |
| Credential | An issuer-recognized means of authenticating a subject or authorized presenter. | Connection, authorization, Trust, or Approval |
| Credential material | Secret or sensitive bytes usable to present, refresh, or control a credential. A selected profile may leave it durably in a designated secure provider or non-exporting service while excluding it from Ghost Bridge protocol artifacts and evidence. | Safe metadata or historical verification evidence |
| Credential reference | Opaque, secret-free locator or handle for credential material or provider state. | Proof that the presenter possesses or may use it |
| Credential custodian | Profile-designated credential provider, operating-system credential store, secure vault, hardware signer, identity provider, or non-exporting key service that may retain material under deployment-private controls. | A Ghost Bridge Connection, evidence bundle, or protocol authority |
| Credential issuer | Authority that creates or vouches for a credential. | Passport issuer unless explicitly the same separately assigned role |
| Credential subject | Person, service, workload, or Host identity named by the credential. | Automatically the authenticated Host principal |
| Authenticated Host principal | Canonical Host-side principal derived only from verified selected-profile evidence for the request. | Body `initiatingSubject`, OAuth resource owner, or Agent identity |
| Peer identity | Verified identity of the transport/request peer. | User identity or Connection authority |
| User identity | Person identity involved in setup, consent, or credential issuance. | Necessarily the Host principal |
| Service identity | Non-human service or workload identity. | A user or Agent Passport identity |
| Agent identity | Agent identifier bound by the selected release and Connection. | Host principal or credential subject |
| Passport identity | Exact Passport ID/version/issuer evidence for the Agent. | Host-request authentication |
| Credential establishment | Issuance, lookup, enrollment, or binding process that makes a credential usable. | H-04 selection or Connection creation |
| User interaction | Human authorization, login, administrator action, or device interaction during establishment. | Ghost Bridge authorization or Approval |
| Credential presentation | Supplying credential material or provider-controlled evidence through the selected channel. | A credential reference alone |
| Bearer credential | Credential whose possession is sufficient for use unless other controls intervene. | Proof-of-possession credential |
| Proof-of-possession credential | Credential whose use also proves control of a bound key or channel. | A signed Passport |
| Request proof | Fresh evidence cryptographically or channel-authentically bound to the exact request context. | Transport reachability |
| Transport binding | Authenticated relationship to a transport/session or its verified peer identity. | Connection authority |
| Channel binding | Evidence tying authentication or proof to one exact protected channel/session. | A reusable session ID without proof |
| Authentication context | Common semantic result: profile, issuer, credential subject, authenticated Host principal, authentication audience, Agent/resource target, tenant, validity, proof/channel category, and safe evidence identity. | Raw credential material |
| Authentication binding | Connection-linked, secret-free record of the authentication context, direct immutable evidence identity or future H-10-qualified digest, and references to external bulky safe verification evidence. | The credential itself or a route to retrieve it |
| Host application or Host identity | Host-side application/workload identity when a concrete profile separately requires it in addition to the authenticated Host principal. | Authentication audience or Agent identity |
| Authentication audience | For Host-to-Agent request authentication, the exact Agent/resource target for which the credential or proof is valid. | Authenticated Host principal, Host application identity, or generic signed-object audience |
| Proof-purpose audience | Audience interpreted only within the domain and purpose of one signed object or proof. | An audience silently reusable across authentication, Offer, grant, authorization, Approval, or Receipt domains |
| Receipt audience | Intended verifier or recipient of an Execution Receipt under the Receipt proof purpose. | Host-to-Agent authentication audience |
| Issuer | Canonical credential-issuing authority identity. | Subject or audience |
| Subject | Credential identity claim evaluated through profile-specific mapping. | Automatically the request principal |
| Organization scope | Exact organization bound to authentication and Connection. | A body-supplied assertion |
| Workspace scope | Exact value or explicit absence state under the organization. | Empty string or wildcard |
| Issuance time | Time at which credential/evidence was issued. | Establishment or Connection creation time |
| Not-before time | Earliest instant credential/evidence may be accepted, subject to bounded skew. | Issuance time |
| Expiry | Exclusive upper validity boundary; equality at the boundary is invalid. | Revocation |
| Refresh | Obtaining renewed credential validity through an authenticated refresh authority. | In-place principal/profile/scope change |
| Rotation | Replacing a credential/key/reference while preserving approved identity and scope invariants. | Credential refresh or Connection replacement |
| Revocation | Authoritative invalidation before ordinary expiry. | Suspension or deletion of historical evidence |
| Reauthentication | Re-establishing and verifying the selected profile for the same bound identity and scope. | Automatic fallback or profile change |
| Suspension | Temporary denial of Connection-governed use pending an allowed recovery. | Revocation or closure |
| Replacement Connection | New authority object created with new preview/consent and applicable grant flow. | Mutation of the old Connection |
| Request replay | Reuse of authenticated request evidence outside its single accepted presentation. | Business idempotent retry |
| Nonce | Bounded, unpredictable or server-provided replay value used by a profile. | Idempotency or correlation ID |
| Credential downgrade | Substitution of weaker credential/proof semantics inside a selected profile. | Approved refresh |
| Profile downgrade | Replacement of the selected profile with another, especially `none` or bearer. | H-04 exact selection |
| Unauthenticated fixture mode | Explicit non-production test context with no authenticated peer and no production Connection authority. | Local production |
| Local authenticated peer | Peer identity verified through a defined OS/process/channel mechanism with exact user/service, endpoint, and freshness semantics. | Loopback, same machine, same container, or `none` |
| Connection authority | Durable installed boundary created by successful grant redemption. | Authentication |
| Authorization | H-02 structured current `ALLOW`/`DENY` for an exact action inside the Connection. | Authentication |
| Trust | Verification of Agent/issuer/Passport/revocation evidence and policy acceptance. | Host authentication |
| Approval | Additional exact-action human decision when policy requires it. | Login, user authorization, or authentication |

The following non-equivalences are controlling:

- selection is not authentication;
- authentication is not Connection authority or authorization;
- authentication is not Trust verification or Approval;
- a credential reference is not proof by itself;
- an Agent Passport signature is not Host-request authentication;
- a valid Host credential does not expand the Connection;
- user authorization to an external provider is not automatically Ghost Bridge
  protocol authorization;
- delegated credentials do not transfer another Agent's Connection authority;
  and
- managed or platform-brokered authentication cannot make Platform internals
  protocol law.

For Host-to-Agent request authentication, the authenticated Host principal is
the caller and the authentication audience is the exact Agent/resource target.
They are not aliases. A Host can be an audience for another signed object only
under that object's distinct proof purpose.

An audience used for authentication proof, a Connection Offer, an Install Grant
resolution, authorization evidence, Approval, Execution Receipt, or any other
signed object is purpose-specific. Implementations cannot silently copy,
compare, or reuse an audience across those domains. Exact audience wire fields
and canonicalization remain H-10/H-12 work.

## Existing Ghost Bridge evidence

All observations below are historical prose, schema, implementation, test, or
deployment evidence. None approves an H-05 option.

### Governance and planning evidence

- The Phase plan names authentication profiles and credential binding as H-05,
  requiring local/remote constraints, lifecycle, security analysis, and test
  obligations (`docs/protocol/phase-15d-plan.md:28`).
- The audit classifies authentication as `NO` for independent implementation:
  mode strings, SDK callbacks, Agent hooks, and Platform providers do not define
  establishment, proof, audience, refresh, expiry, revocation, failure, or
  downgrade (`docs/protocol/normative-specification-gap-analysis.md:58`).
- H-01 through H-04 provide the controlling authority, role, release, and exact
  identifier-selection boundaries cited above. The decision register itself
  states that code, schemas, tests, Platform policy, and external practice
  cannot approve a decision (`protocol/decisions/README.md:3-31`).

### Historical prose

- The authentication overview lists safe-local `none`, OAuth, mTLS, signed
  request, managed/delegated credential, and platform-brokered categories and
  claims every profile defines discovery, interaction, storage, audience,
  refresh/revocation, proof, and errors. Those complete definitions do not
  exist (`docs/security/authentication-profiles.md:1-5`).
- Historical Install Grant prose says grants contain no credentials and
  resolution returns a secret-free Offer, but its atomic/idempotent redemption
  sentence does not settle H-06 concurrency or lost-response behavior
  (`protocol/specification/0.1-draft/install-grant.md:3-11`).
- Historical Connection prose calls the Offer secret-free and says credentials
  are provisioned out of band or through a broker, but does not define how a
  reference proves authentication
  (`protocol/specification/0.1-draft/connection.md:3-10`).
- Historical Invocation prose carries an initiating subject, tenant, optional
  Delegation, and optional Approval without defining how request
  authentication derives or confirms that subject
  (`protocol/specification/0.1-draft/invocation.md:3-11`).
- Historical Approval prose binds requester and scope to a single-use decision;
  it supports keeping Approval distinct from authentication rather than making
  an authenticated identity sufficient
  (`protocol/specification/0.1-draft/approval.md:3-10`).
- Historical signed-request prose binds method, path, content digest,
  creation/expiry, Connection, protocol, Invocation, nonce, audience, and
  tenant. It is experimental and explicitly not mandatory for Core
  (`protocol/specification/0.1-draft/request-integrity.md:3-9`;
  `docs/security/request-integrity.md:1-5`).
- Audience prose rejects missing/wildcard high-impact audience,
  cross-environment, cross-tenant, and cross-Connection use, but does not define
  authentication-principal mapping
  (`protocol/specification/0.1-draft/audience-binding.md:3-7`).
- Transport reachability alone is not Trust, and Trust begins with issuer and
  Passport evidence rather than an arbitrary endpoint
  (`protocol/specification/0.1-draft/trust-model.md:3-12`).
- Historical security prose calls for bounded inputs, expiry/audience/scope
  checks, replay prevention, rotation, revocation, and redaction while
  explicitly leaving a production trust profile and review for later
  (`protocol/specification/0.1-draft/security-considerations.md:3-13`).
- The experimental trust profile separately evaluates cryptographic validity,
  issuer authenticity, Host policy, and operational validity; its production
  language and concrete algorithms remain historical evidence, not H-05
  authentication authority
  (`protocol/specification/0.1-draft/trust-profile.md:1-20,24-36`).

### Historical schema evidence

- Passport `authenticationDeclarations` is structurally only a list of strings;
  it carries no establishment, proof, issuer, principal, audience, lifecycle,
  or credential-binding definition
  (`protocol/schemas/0.1-draft/passport.schema.json:20-35`).
- Connection Offer requires `authenticationMode` and
  `authenticationSetupReference`, optionally carries `authenticationModes`, and
  enumerates `none`, `oauth`, `mutual_tls`, `signed_request`,
  `managed_credential`, `delegated_credential`, and `platform_brokered`
  (`protocol/schemas/0.1-draft/connection-offer.schema.json:7-23`).
- The Offer also has optional audience and proof fields, but no rule ties them
  to Host authentication (`protocol/schemas/0.1-draft/connection-offer.schema.json:24-40`).
- Install Grant resolution contains an untyped Connection Offer and issuer
  verification object but no authentication establishment/result schema
  (`protocol/schemas/0.1-draft/install-grant-resolution.schema.json:7-34`).
- Invocation has body `initiatingSubject`, tenant fields, and no required
  Connection or authentication proof
  (`protocol/schemas/0.1-draft/invocation.schema.json:7-30`).
- Request proof binds several useful fields, but fixes one historical profile
  and leaves operation semantics, principal derivation, credential lifecycle,
  and profile mandatory status unresolved
  (`protocol/schemas/0.1-draft/request-proof.schema.json:7-30`).
- Common proof is an open object and error details are open, so neither provides
  an authentication contract
  (`protocol/schemas/0.1-draft/common.schema.json:55-59`;
  `protocol/schemas/0.1-draft/error.schema.json:7-17`).
- There is no public final Connection authentication schema. Current Task and
  Receipt schemas cannot reconstruct the authentication context
  (`protocol/schemas/0.1-draft/task.schema.json:7-31`;
  `protocol/schemas/0.1-draft/execution-receipt.schema.json:7-42`).

### Protocol Core and type evidence

- Core exports the seven legacy names and defaults both Host and Agent
  authentication support to `none`
  (`packages/ghostbridge-protocol-core/src/index.js:16-24,453-456,524-531`).
- When a preferred value is absent or unavailable, selection uses the first
  common Host-array item (`packages/ghostbridge-protocol-core/src/index.js:453-473`).
  H-04 has rejected this as future authority.
- Explanations provide only prose labels, not mode semantics
  (`packages/ghostbridge-protocol-core/src/index.js:668-677`).
- Connection Offer validation checks enum membership and preferred-in-array
  consistency, not establishment or proof
  (`packages/ghostbridge-protocol-core/src/index.js:966-999`).
- TypeScript declarations repeat the seven-string union and expose only
  selected/compatible names
  (`packages/ghostbridge-protocol-core/src/index.d.ts:10-20,410-430`).

### Native Client evidence

- Native Client configuration defaults to `['none']`
  (`packages/ghostbridge-native-client/src/index.js:121-143`).
- For non-`none`, it delegates setup to an implementation callback, caches an
  opaque result by a grant/scope-derived key, and sends that binding at
  redemption (`packages/ghostbridge-native-client/src/index.js:635-692`).
- Normalization requires only `credentialReference` or
  `transportBindingReference`, adds mode and tenant scope, and rejects obvious
  token/header/cookie fields. It does not validate profile-specific proof,
  issuer, principal, audience, Agent, Connection, refresh, rotation, or
  revocation semantics
  (`packages/ghostbridge-native-client/src/index.js:1443-1472`).
- The public callback type exposes the same opaque shape
  (`packages/ghostbridge-native-client/src/index.d.ts:48-75`).
- A Client Trust record stores selected mode and audience/scope, but not full
  authentication evidence; it is implementation state, not protocol law
  (`packages/ghostbridge-native-client/src/index.js:715-737`).

### Native Agent evidence

- Agent configuration also defaults to `none`
  (`packages/ghostbridge-native-agent/src/index.js:143-150`).
- When redemption omits a mode, Agent uses its first configured mode. For
  non-`none`, it checks only the small opaque reference/mode/tenant shape
  (`packages/ghostbridge-native-agent/src/index.js:1565-1606,1674-1707`).
- Current Connection records store mode, a coarse state, and one reference, but
  not establishment, proof, principal, issuer, audience, expiry, refresh,
  rotation, or revocation semantics
  (`packages/ghostbridge-native-agent/src/index.js:1608-1636,1745-1777`).
- The public Connection projection omits even that opaque binding reference
  (`packages/ghostbridge-native-agent/src/index.js:2088-2104`).
- Production HTTP requires a deployment authentication callback. The callback
  returns subject/method/scope/reference; body-supplied principal fields are
  rejected. This is useful implementation evidence, not a profile contract
  (`packages/ghostbridge-native-agent/src/index.js:1190-1220,2527-2624`;
  `packages/ghostbridge-native-agent/src/index.d.ts:17-26,298-304`).
- Signed-request verification can bind payload, Connection, Invocation, tenant,
  audience, time, and replay for Invocation, but it is optional/configuration
  driven and does not define every operation or mandatory profile
  (`packages/ghostbridge-native-agent/src/index.js:587-638`).

### Trust, Platform, tests, and examples

- Trust request descriptors bind method, path, body digest, audience,
  Connection, protocol, Invocation, message, time, nonce, and tenant; replay
  keys bind issuer, key, message, audience, nonce, and Connection
  (`packages/ghostbridge-trust/src/index.js:1259-1297,1531-1621`). Exact bytes
  and algorithms remain H-10 work.
- Platform production sessions advertise `signed_request` and `oauth`, accept
  an opaque credential reference, and use a provider to place an
  `authorization` header
  (`backend/src/services/platformNativeClient.service.js:1516-1578`). These are
  product choices, not a protocol profile.
- Platform's safe-reference syntax and sealed bindings are deployment evidence,
  not a portable credential-reference authority
  (`backend/src/services/platformNativeClient.service.js:498-511,1732-1742`).
- Core tests encode first-common selection and secret-free preview expectations
  (`packages/ghostbridge-protocol-core/test/core.test.js:211-282`).
- Native Agent tests use a synthetic bearer callback and prove current
  fail-before-mutation behavior, not OAuth or bearer interoperability
  (`packages/ghostbridge-native-agent/test/security15c1a.test.js:196-285`).
- Examples and fixture principals are synthetic. Existing tests cannot
  retroactively define authentication profiles.

## Contradictions and ambiguities

1. Both Core participants default to `none`, while production Agent HTTP
   requires a callback and Platform production excludes `none`.
2. Current selection uses first-common Host order, while accepted H-04 requires
   one explicit Host choice and independent Agent verification.
3. Passport authentication declarations are strings; Connection Offer uses a
   seven-value enum; no immutable profile definition connects the two.
4. `authenticationMode` looks preferred in the Offer while runtime can treat it
   as the sole or first mode.
5. `authenticationSetupReference` is required even for `none`, but its security,
   origin, redirect, expiry, and credential-leak behavior are undefined.
6. A credential or transport reference is currently treated as enough to label
   a Connection `verified_and_bound`, although a reference proves neither
   possession nor presenter authority.
7. Install-time authentication binding and per-request HTTP authentication are
   separate implementation paths with no required identity equality.
8. Request-integrity proof is Invocation-specific and optional; other
   Connection-governed operations use only the HTTP callback.
9. `initiatingSubject`, callback subject, OAuth user/resource owner, credential
   subject, and Host principal have no canonical relationship.
10. Audience may mean Host, Agent, HTTP resource, issuer recipient, or Receipt
    recipient in different artifacts.
11. Organization/workspace is repeated but absence, empty value, wildcard, and
    cross-credential reuse are not uniformly defined.
12. OAuth, mTLS, managed, delegated, and brokered labels do not state bearer
    versus PoP, proxy trust, principal derivation, or revocation semantics.
13. Signed-request code is concrete enough to appear authoritative but remains
    experimental, optional, TypeScript-derived, and H-10-incomplete.
14. Current Connections cannot determine whether authentication remains fresh
    after restart, provider deletion, credential expiry, rotation, or
    revocation.
15. Platform injects credential material into transport headers, while protocol
    prose only says credentials are out of band. Neither defines safe redirect,
    logging, or broker failure behavior.
16. The same legacy name can hide different issuer, audience, subject mapping,
    proof, and lifecycle semantics, producing name agreement with semantic
    disagreement.
17. Authentication, Agent Passport proof, Trust, Connection, authorization, and
    Approval checks exist in adjacent code and can be collapsed into one
    misleading “authenticated” state.

## Decision questions

The alternatives in later sections answer the following selectable questions.
The final column records the accepted H-05 choice.

### Profile architecture

| Question | Selectable answers | Accepted H-05 choice |
| --- | --- | --- |
| Complete monolithic mode or common envelope plus modules? | Option A monolithic; Option B layered; Option C external/broker dominant | Option B: common semantic authentication context plus complete release-scoped concrete profiles composed from establishment and proof/channel modules |
| May transport/broker define the result? | Fully; only through opaque reference; or only if it exposes Ghost Bridge minimum semantics | External systems may perform establishment, but the selected profile must expose and verify the minimum context; broker internals remain private |
| Profile identifier scope | Global mutable name; release-scoped immutable ID; or deployment-local label | Exact release-scoped immutable ID |
| Profile revision versus protocol release | Same identifier; implicit provider version; or separately identified immutable profile revision | Separate identities; a profile revision is usable only where the selected release explicitly identifies its semantics |

### Mandatory baseline

| Question | Selectable answers | Accepted H-05 choice |
| --- | --- | --- |
| Concrete universal remote profile? | Legacy seven-name set; one role/context-scoped concrete baseline; abstract “at least one” class | One universally implemented remote signed-request PoP profile |
| Governed remote profile? | Any bearer/PoP; PoP-capable profile; signed-request only | Any selected registered profile satisfying the Governed PoP/request-context floor; universal signed-request PoP guarantees overlap |
| Governed per-request PoP? | Optional; mandatory; profile-specific | Mandatory semantic floor |
| Local production | `none`; remote profile; distinct authenticated local-peer profile | Distinct authenticated local-peer profile |
| Is “at least one registered profile” sufficient? | Yes; only with registry coordination; no | No: two otherwise valid peers could have disjoint profiles |
| Role facets | Every role implements all; only Host; or producer/verifier facets by claimed role | Host implements establishment/presentation; Agent implements verification/principal derivation; brokers implement only claimed provider facets; both implement common binding/failure semantics |

### Disposition of `none`

“Local” does not mean loopback IP, same machine, same user, same process, same
container, trusted local peer, or authenticated OS peer. These properties are
not interchangeable.

| Alternative | Meaning | Accepted H-05 disposition |
| --- | --- | --- |
| Local-production `none` | Permit production Connection authority under bounded “local” conditions | Reject: if OS/process/channel identity is relied on, that is an authenticated local-peer profile, not `none` |
| Fixture-only `none` | Explicit non-production tests only; incapable of production Connection authority | Accepted |
| Remove `none` | No unauthenticated profile even in portable fixtures | Rejected; deterministic negative/fixture testing benefits from an explicit non-production mode |

### Establishment and setup

| Question | Selectable answers | Accepted H-05 choice |
| --- | --- | --- |
| Sequence | Selection itself authenticates; setup before preview; or selected setup followed by validation and redemption revalidation | Use the deterministic initial-establishment sequence below |
| Authority before commit | Setup/interaction may grant temporary authority; verified credential may grant authority; or no pre-commit step grants authority | No advertisement, selection, setup resolution, interaction, issuance, presentation, validation, preview, or consent grants Connection authority |
| Setup-reference trust | Follow deployment callback; follow redirects; or resolve under selected-profile origin/authentication-audience/redirect policy | Resolve only under selected profile and H-12 policy; revalidate returned semantics and never forward credentials to a changed origin |

### Per-request authentication

| Question | Selectable answers | Accepted H-05 choice |
| --- | --- | --- |
| Is installation authentication enough? | Yes; no; hybrid by operation/profile | No for any Connection-governed request |
| Current evidence on Governed requests? | Optional; every request; session only | Every request must have current selected-profile evidence |
| Session/channel reuse? | Unbounded; prohibited; bounded with explicit freshness/channel binding | Bounded reuse permitted only when the request remains cryptographically/channel bound and freshness/revocation are checked |
| Bound request fields | Profile chooses freely; minimal Connection only; common full request-context floor | Governed proof covers method, operation, Connection, authentication audience and Agent/resource target, tenant, body/digest, timestamp/expiry, and replay value; exact bytes remain H-10 |
| Per-operation strength | Same for all; arbitrary downgrade; stricter operation-specific requirements | A Connection may require stronger proof for an operation, but never weaker than its selected profile/Governed floor |
| Profile change in place | Permitted; reauthenticate; or replace | Profile change requires replacement Connection |

### Principal, authentication audience, and proof purpose

| Question | Selectable answers | Accepted H-05 choice |
| --- | --- | --- |
| Canonical principal | Body subject; provider user; or verified profile-derived Host principal | Verified selected-profile evidence produces a canonical typed Host principal |
| Credential subject types | Person only; service only; or typed person/service/workload/Host | All typed forms allowed when the profile defines deterministic mapping |
| OAuth resource owner relation | Always Host principal; never; or profile mapping input only | Mapping input only; never automatic |
| Caller and target binding | Issuer/authentication audience only; Connection only; or issuer, subject/principal, Host application identity when required, authentication audience, Agent/Passport, tenant, and Connection | Bind the complete set applicable at establishment/request time; caller principal and Agent/resource target remain separate |
| Wildcard/multiple audience | Always; never; or profile-limited exact set | No wildcard for production authority; multiple audiences only as a canonical exact bounded set with an exact selected member/resource rule |
| Comparison | URL normalization/provider behavior; string equality; or profile-defined canonical form | Profile-defined canonical form and exact comparison; no deployment guess |
| Cross-purpose audience reuse | Reuse one audience everywhere; map implicitly; or require a distinct proof-purpose interpretation | Require purpose-specific audiences; authentication, Offer, grant resolution, authorization, Approval, Receipt, and other signed-object domains cannot be silently interchanged |
| Body principal authoritative? | Yes; confirmation; never | Never authoritative; it may only confirm the derived principal |

### Credential storage and references

| Question | Selectable answers | Accepted H-05 choice |
| --- | --- | --- |
| Raw material in protocol artifacts | Allowed; references only; or designated transport presentation only | Never in Ghost Bridge JSON/body/query or durable protocol artifacts; a bearer profile may use only its H-12-designated protected transient presentation location |
| Storage owner | Agent always; Host always; or profile/provider-defined least-privilege custodian | A selected secure provider, OS store, vault, hardware signer, identity provider, or non-exporting service may retain material outside Ghost Bridge artifacts; minimize access and participants |
| May Agent receive bearer material? | Always; never; or only selected direct bearer verifier | Only when the selected bearer profile requires the Agent to verify it directly; never persist/echo it |
| Reference-only cases | Optional; managed/brokered only; or whenever secret material need not cross boundary | Prefer opaque reference whenever a trusted provider can resolve and authenticate its use |
| Reference authentication | Reference is enough; signed reference; or provider resolution plus presenter/use authorization and proof | Reference is never enough; resolve through trusted provider and verify presenter, target, scope, freshness, and proof |
| Historical meaning | Keep secret; mutable provider lookup; or direct semantic result plus immutable safe evidence identity/digest | Direct safe semantics and direct immutable evidence identity/future H-10-qualified digest; bulky safe verification evidence may remain externally resolvable, but credential material is never historically retrievable |
| Never exposed | Deployment-defined; tokens only; or comprehensive protocol-artifact exclusion | Raw access/refresh tokens, private keys, client secrets, passwords, cookies, reusable bearer material, and secret provider responses never enter durable Connections, previews/consent, grants/Offers, Tasks, Receipts, evidence bundles, governance/conformance records, URLs, errors, logs, traces, metrics, or audit fields |

Provider custody remains deployment-private rather than protocol authority. It
must be access-controlled and least-privilege, expose only a safe opaque
reference or verification result to Ghost Bridge, never make reference
possession sufficient proof, and never make the secret retrievable through a
historical evidence reference.

### Expiry, refresh, rotation, and revocation

| Question | Selectable answers | Accepted H-05 choice |
| --- | --- | --- |
| Time boundary | Provider behavior; inclusive expiry; or half-open validity with bounded skew | Valid at/after not-before within allowed skew and strictly before expiry; skew never extends expiry |
| Refresh before/after expiry | Always transparent; before only; or same-invariant refresh plus separately authenticated reauth after expiry | Refresh before expiry is allowed; after expiry ordinary requests fail and only a separately authenticated reauthentication path may recover |
| May refresh change identity/scope/profile? | Yes; some; or no | No. Issuer, subject/principal, authentication audience, Agent/Passport, tenant, and profile changes require replacement |
| Rotation | Replace Connection; transparent; or same-invariant rotation with history | Same-invariant key/credential rotation may keep the Connection, with new reference/validity and immutable replaced evidence |
| Revocation | Best effort; cached; or profile check with H-11 freshness | Profile-specific check under H-11 freshness/anti-rollback; no stale-success fallback |
| Consequence | Request-only; always revoke; or graduated model | Graduated deny/suspend/reauthenticate/replace/revoke model below |
| Restart/history | Rediscover; reload current provider; or resume durable semantic binding and preserve history | Resume exact durable binding; current discovery/provider defaults cannot reinterpret history |

### Candidate legacy modes

The profile matrix and accepted decision give the required minimum semantics for
OAuth bearer/PoP, mTLS, signed request, managed, delegated, and brokered
candidates. No legacy name survives automatically.

### Failure and downgrade

The failure-granularity and downgrade sections below select whole-attempt
failure for shared identity/profile/issuer/authentication-audience/tenant/
Connection errors, request-only rejection for isolated invalid or replayed
proof while the underlying binding remains valid, suspension for recoverable
authentication unavailability, replacement for material identity/target change,
and a terminal binding for compromise or authoritative revocation. H-12 retains
exact public error representation.

### Privacy and observability

The accepted decision selects secret-free protocol artifacts and public/historical
surfaces: Connections, previews, consent, grants/Offers, protocol messages
outside designated transient presentation, evidence bundles, Tasks, Receipts,
governance and conformance records, URLs, errors, logs, traces, metrics, and
audit fields. It also selects bounded/redacted issuer and subject data, opaque
references, safe correlation IDs unrelated to raw identity, direct immutable
safe evidence identities/digests, and external bulky safe evidence without
reusable secrets. Secure provider/vault custody may persist required material
outside those surfaces under the selected profile.

### Compatibility and conformance

Independent implementations must reproduce advertisement, exact selection
verification, informational and final-consented establishment results,
principal derivation, purpose-specific authentication-audience/tenant binding,
request proof, expiry boundaries, refresh/rotation invariant checks,
revocation reaction, reauthentication, downgrade rejection, restart behavior,
secret redaction, and semantic failure categories. Official helpers cannot be
the oracle.

## Inherited invariants

Every viable option and sub-alternative is constrained by these invariants:

1. H-04 exact selection is preserved. Selection is never authentication.
2. Advertisement, setup, credential issuance, presentation, validation,
   informational preview, final preview, and consent grant no Connection
   authority.
3. Authentication completes and is revalidated before the H-01 authority
   commit.
4. Successful credential establishment does not substitute for a final
   secret-free preview and explicit human consent to the exact validated result.
5. The final authentication result stays within the immutable final preview and
   consent envelope.
6. Material profile, principal, issuer, authentication audience, Agent,
   Passport, tenant, proof-category, validity, or limitation change requires an
   updated final preview and new human consent.
7. The active durable Connection remains the installed authority root.
8. Authentication grants no capability, action, Trust, policy, or Approval
   authority.
9. Effective authority remains an intersection.
10. Principal derives only from verified selected-profile evidence, never a body
    assertion.
11. The authenticated Host principal is the caller; the authentication audience
    is the exact Agent/resource target. Agent/Passport identity, Host application
    identity when separately required, and Host-request principal remain
    distinct.
12. Authentication, Offer, grant-resolution, authorization, Approval, Receipt,
    and other signed-object audiences are purpose-specific and never silently
    interchangeable.
13. Exact Agent, Passport, authentication audience, organization, workspace,
    and Connection bindings cannot be widened by a credential.
14. Workspace absence is explicit and non-wildcard.
15. Credential/reference/profile substitution fails closed.
16. A credential reference alone is never accepted as proof.
17. Reusable credential material is absent from durable Ghost Bridge protocol
    artifacts and public/historical evidence surfaces. A selected secure
    provider may retain it under deployment-private least-privilege custody and
    expose only a safe reference or verification result.
18. The Connection directly retains each H-04 authority-critical safe result,
    including the immutable evidence identity or future H-10-qualified digest;
    no mutable lookup or object containing credential material substitutes for
    it.
19. Array order, SDK defaults, package defaults, Platform defaults, provider
    defaults, and current discovery cannot select or reinterpret a profile.
20. No automatic fallback to a weaker profile or `none` exists.
21. Restart loads the original binding and history; it does not silently
    re-establish from current provider behavior.
22. A compromised or authoritatively revoked authentication binding is terminal
    for the existing Connection and cannot be revived by ordinary
    reauthentication.
23. Delegated credentials cannot transfer another Agent's Connection authority.
24. Direct and inherited Agent-to-Agent authority remain prohibited.
25. Platform/broker internals remain deployment policy and implementation.
26. Failure precedes Task creation, Approval consumption, and external side
    effects at the applicable request-acceptance boundary.
27. Exact wire errors, crypto bytes, and state transition mechanics remain with
    their deferred decisions.

## Option A — Mode-specific monolithic profiles

Each selected profile completely defines setup, interaction, credential form,
principal derivation, request proof, purpose-specific authentication audience,
tenant/Connection binding, storage, lifecycle, revocation, and failure.

Benefits:

- one identifier resolves to a self-contained contract;
- a single-mode implementation has little module-composition logic; and
- conformance can test one complete profile at a time.

Costs and risks:

- issuer, principal, authentication-audience, time, tenant, secret, and failure rules are
  duplicated;
- modes can develop inconsistent authentication-context meaning;
- profile evolution has a broad blast radius;
- migrating across profiles requires translating monolithic state; and
- a shared legacy name can still hide incompatible semantics unless every
  revision is immutable and complete.

Independent implementations would need every profile definition in full.
Common security fixes must be applied consistently to each profile.

## Option B — Layered establishment plus per-request authentication

Define one transport-independent authentication-context and lifecycle floor.
Each concrete release-scoped profile then defines its establishment mechanism,
credential/reference form, profile-specific proof, transport dependency,
principal mapping, and any stronger restrictions.

The common result can bind:

- exact profile identifier/revision and selected protocol release;
- issuer, credential subject, authenticated Host principal, and principal type;
- Host application identity when separately required, authentication audience,
  Agent/resource target, Passport, Connection, organization, and workspace;
- establishment/not-before/expiry and last reauthentication time;
- credential/key or transport reference;
- bearer/PoP, request-proof, transport, and channel-binding category;
- directly stored immutable evidence identity or future H-10-qualified digest,
  plus any reference to external bulky safe verification evidence; and
- authentication state and limitations.

Benefits:

- common deterministic principal/authentication-audience/tenant/failure
  semantics;
- one secret-handling and history floor;
- profile-specific establishment without Platform capture;
- explicit connection-time establishment and current request proof;
- reusable channel/session handling without treating transport continuity as
  authority;
- consistent refresh, rotation, revocation, and reauthentication;
- local-peer and remote profiles can share one safe result; and
- cross-language implementations can compare semantic outputs even when
  credential providers differ.

Costs and risks:

- module composition and profile registration are more complex;
- the common context can become over-general or omit profile-specific risk;
- exact profile identifiers must name approved compositions, not arbitrary
  runtime module mixtures;
- bearer and PoP paths need different conformance branches; and
- H-10/H-11/H-12 dependencies are substantial.

## Option C — Transport- or broker-dominant authentication

TLS, OAuth middleware, operating-system identity, a managed credential
provider, or Platform broker authenticates externally. Ghost Bridge stores an
opaque reference or session result.

Benefits:

- easiest integration with existing deployment identity systems;
- minimal new Ghost Bridge wire surface; and
- credential material can remain in specialized providers.

Costs and risks:

- transport/broker behavior becomes de facto protocol semantics;
- reference possession can be mistaken for authentication;
- principal, authentication-audience, and tenant mapping remains ambiguous;
- proxy termination and broker/session failure differ across deployments;
- historical evidence may become indeterminate after provider deletion;
- standalone and cross-language implementations cannot reproduce the result;
  and
- Platform sessions, RBAC, databases, or binding tokens risk becoming protocol
  law.

## Comparative decision matrix

| Criterion | Option A — monolithic | Option B — layered | Option C — external dominant |
| --- | --- | --- | --- |
| Complete semantics | Complete per profile | Common floor plus complete concrete profile | Often hidden in provider |
| Principal consistency | Duplicated | Common typed result | Deployment-specific |
| Audience/tenant consistency | Duplicated | Common exact binding | Provider mapping |
| Transport independence | Medium | Highest | Lowest |
| Bearer/PoP distinction | Per profile | Explicit common category plus profile rule | Often implicit |
| Request freshness | Per profile | Common floor, profile mechanism | Session/provider-defined |
| Secret minimization | Possible | Explicit common prohibition | Possible but unverifiable |
| Historical meaning | Large self-contained profiles | Hybrid safe semantics/evidence | Provider availability dependent |
| Independent implementation | Medium burden | Medium/high but deterministic | Poor |
| Cross-language determinism | Profile-by-profile | Strongest common result | Weak |
| Platform-coupling risk | Medium | Lowest | Highest |
| Evolution blast radius | High within profile | Common-floor plus module review | Provider drift |
| Main compatibility risk | Same name, duplicated semantics | Composition/registry mismatch | Opaque deployment differences |
| Main security risk | Inconsistent shared controls | Common floor incorrectly specified | Reference/session accepted without proof |
| H-05 decision status | Rejected | **Accepted** | Rejected |

Each option would drive different later artifacts. This comparison is planning
analysis only:

| Later consequence | Option A — monolithic | Option B — layered | Option C — external dominant |
| --- | --- | --- | --- |
| Normative prose | Repeat complete establishment, context, lifecycle, storage, and failure rules per profile | Define one common context/lifecycle floor plus complete concrete profile rules | Define minimum portable projection from each external authenticator or accept deployment-specific behavior |
| Schemas | One large descriptor/result family per profile | Common context/binding schemas plus profile-specific establishment/proof variants | Opaque provider/session reference plus a portable result schema sufficient to avoid reference-as-proof |
| State machines | Separate establishment and recovery paths per profile | Common semantic states with profile-specific interaction and proof substates | Broker/transport availability and session state become explicit protocol-facing inputs |
| Error contract | Profile-specific categories mapped to shared H-12 outcomes | Shared semantic categories with bounded profile details | Provider errors require deterministic normalization and secret redaction |
| Fixtures and conformance | Full positive, negative, lifecycle, and migration set for every retained mode | Common invariant suite plus complete suites for every registered composition | Cross-provider, outage, deletion, proxy, and standalone reproducibility cases dominate |

The accepted decision's later consequences are Option B's column together with
the concrete schemas, machines, errors, and conformance cases listed below.
Acceptance does not create them; each requires separate authorization.

## Mandatory-profile baseline alternatives

### Baseline 1 — Legacy mode-set retention

Retain the seven current names as the primary taxonomy, define complete
semantics for every retained name, and choose one as universally mandatory.

Benefits: maximum name-level continuity and easier initial migration for current
configuration. Costs: several names are not authentication mechanisms
(`managed_credential`, `delegated_credential`, `platform_brokered`), `oauth`
hides bearer versus PoP, and defining all seven before interoperability creates
a large security and conformance burden.

### Baseline 2 — Role/context-scoped concrete baseline

Define:

- a distinct authenticated local-peer profile for local production;
- one concrete universally implemented remote profile;
- a Governed PoP/request-context floor;
- optional stronger/environment-specific profiles; and
- legacy `ghostbridge/0.1-draft` names as historical claims unless a reviewed
  migration explicitly maps them.

The accepted universal remote baseline is a release-scoped signed-request PoP
profile. It requires an establishment-time public-key/credential binding and
current proof on every Connection-governed request. The proof semantically
binds request method, operation, Agent, Connection, audience, tenant, body
digest, creation/expiry, and replay value. H-10 must later select exact bytes,
algorithms, key formats, and cryptographic domains.

Benefits: two independent remote implementations always share a concrete mode;
local production does not pretend to be unauthenticated; Governed operation has
a PoP floor; optional OAuth/mTLS/broker integrations remain possible.

Costs: every remote role needs signing/verification support; key distribution,
rotation, revocation, replay durability, canonicalization, and clock handling
are mandatory work; embedded Core implementations have a higher entry cost.

### Baseline 3 — Abstract mandatory class without one concrete profile

Require the common authentication context and “at least one registered concrete
profile,” but no universally implemented profile.

Benefits: maximum deployment choice and no favored credential ecosystem.
Cost: two conformant implementations can implement disjoint concrete profiles,
have no common mode, and fail to interoperate. Registry membership does not
guarantee overlap. This is insufficient for an interoperability baseline.

### Baseline comparison

| Criterion | Baseline 1 | Baseline 2 | Baseline 3 |
| --- | --- | --- | --- |
| Guaranteed remote overlap | Only after choosing one of seven | Yes, signed-request PoP | No |
| Legacy compatibility | Highest names, lowest semantic clarity | Explicit historical treatment | Names optional |
| Local production | Ambiguous `none` | Authenticated local peer | Deployment-defined |
| Governed PoP | Must retrofit each mode | Explicit floor | Not guaranteed |
| Independent implementation | Large seven-profile burden | One concrete baseline plus optional profiles | Simple abstractly, fragmented concretely |
| H-05 decision | Rejected | **Accepted** | Rejected |

## `none` alternatives

| Alternative | Production Connection authority | Security consequence | Compatibility consequence |
| --- | --- | --- | --- |
| `none` for bounded local production | Allowed under a definition of local | Loopback/same-host/container assumptions can be spoofed or crossed; any real OS/channel check means it is not `none` | Appears easy but produces incompatible local assumptions |
| Fixture/testing-only `none` | Prohibited | Explicitly models absence of authentication without being mistaken for production | Current fixtures need labeling; production defaults break |
| Remove `none` | Prohibited everywhere | Smallest accidental unauthenticated surface | Portable negative/fixture testing needs another explicit harness mechanism |

**Accepted H-05 disposition:** fixture/testing-only. `none` can never create a
production Connection. A local production deployment that relies on
authenticated OS peer credentials, a protected local socket, process identity,
or a non-exporting channel must use a distinct authenticated local-peer profile
that defines the exact evidence and threat boundary.

## Credential-binding alternatives

### Binding 1 — Opaque reference only

The Connection stores mode/profile and credential or transport reference.
Benefits are compact records and provider encapsulation. Risks are semantic
indeterminacy, mutable provider results, unverifiable principal/
authentication-audience/scope, and reference-as-proof confusion.

### Binding 2 — Hybrid semantic result plus secret-free immutable evidence

Store authority-relevant authentication semantics and the immutable evidence
identity or future H-10-qualified digest directly in the Connection. Bulky safe
verification evidence may remain external under an immutable, historically
resolvable identity. Reusable credential material remains solely under
profile-designated provider custody when needed; it is excluded from the
Connection and protocol evidence and is never historically retrievable through
the evidence identity.

Benefits are deterministic enforcement, restart continuity, minimized secrets,
and historically meaningful safe records that prove which profile, issuer,
principal, target, tenant, validity, key identity, and verification result
applied. Costs are richer records and long-term resolution of external safe
evidence.

### Binding 3 — Fully inline credential descriptor

Store all safe credential and proof metadata directly, while still prohibiting
reusable secrets. Benefits are self-contained history. Costs are record size,
identity/privacy exposure, duplication, rotation churn, and a temptation to
inline material that should remain provider-controlled.

### Connection-binding inventory

Classification values describe Ghost Bridge protocol artifacts, not private
credential-provider storage. They are **stored directly in the Connection**,
**safe reference stored directly with an external safe object**, **transient
only at the profile-designated presentation location**, and **prohibited from
durable Ghost Bridge protocol artifacts**.

| Item | Binding 1 — opaque only | Binding 2 — hybrid | Binding 3 — safe inline |
| --- | --- | --- | --- |
| Selected protocol release | Stored directly | Stored directly | Stored directly |
| Selected authentication profile identifier | Stored directly | Stored directly | Stored directly |
| Profile revision | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Issuer | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Credential subject | Stored by immutable/historically resolvable reference | Stored directly, privacy-bounded | Stored directly, privacy-bounded |
| Authenticated Host principal | Stored by immutable/historically resolvable reference | Stored directly as canonical safe identity/reference | Stored directly as canonical safe identity/reference |
| Principal type | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Agent identity | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Passport identity | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Host application/identity when separately required | Stored by immutable/historically resolvable safe reference | Stored directly as safe identity/reference | Stored directly as safe identity/reference |
| Authentication audience | Stored by immutable/historically resolvable safe reference | Stored directly as the exact Agent/resource target | Stored directly as the exact Agent/resource target |
| Organization | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Workspace with explicit absence semantics | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Credential/key reference | Stored directly as a safe opaque reference | Safe reference stored directly; referenced credential/provider state remains external and deployment-private | Stored directly as safe descriptor/reference; no material |
| Transport-binding reference | Stored directly as a safe opaque reference | Safe reference stored directly; referenced external safe transport-binding object may remain historically resolvable | Stored directly as safe descriptor/reference |
| Proof-of-possession category | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Channel-binding category | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Establishment time | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Not-before | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Expiry/maximum validity | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Refresh authority/reference | Stored by immutable/historically resolvable safe reference | Safe authority/reference stored directly; provider object remains external; no refresh credential | Stored directly as safe non-secret descriptor |
| Revocation authority/reference | Stored by immutable/historically resolvable safe reference | Safe authority/reference stored directly; external safe status object may remain historically resolvable | Stored directly as safe non-secret descriptor |
| Key identifier | Stored by immutable/historically resolvable reference | Stored directly when PoP applies | Stored directly |
| Evidence identity or future H-10-qualified digest | Stored directly | Stored directly; external bulky safe evidence object may be resolved by this immutable identity/digest | Stored directly |
| Authentication state | Stored directly | Stored directly | Stored directly |
| Last successful reauthentication | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Profile limitations | Stored by immutable/historically resolvable reference | Stored directly | Stored directly |
| Consent binding | Stored by immutable/historically resolvable safe reference | Safe final-consent identity/digest and material limits stored directly; external safe consent object may remain historically resolvable | Stored directly as safe descriptor/digest |
| Offer/grant binding | Stored by immutable/historically resolvable safe reference | Safe Offer/grant identity or digest stored directly; external safe object may remain historically resolvable | Stored directly as safe descriptor/digest |
| Raw access token | Prohibited from durable Ghost Bridge protocol artifacts; transient only at designated presentation; secure provider/identity-provider custody permitted | Prohibited from durable Ghost Bridge protocol artifacts; transient only at designated presentation; secure provider/identity-provider custody permitted | Prohibited from durable Ghost Bridge protocol artifacts; transient only at designated presentation; secure provider/identity-provider custody permitted |
| Refresh token | Prohibited from durable Ghost Bridge protocol artifacts; secure provider/vault custody permitted | Prohibited from durable Ghost Bridge protocol artifacts; secure provider/vault custody permitted | Prohibited from durable Ghost Bridge protocol artifacts; secure provider/vault custody permitted |
| Private key | Prohibited from durable Ghost Bridge protocol artifacts; secure vault/hardware/non-exporting signer custody permitted | Prohibited from durable Ghost Bridge protocol artifacts; secure vault/hardware/non-exporting signer custody permitted | Prohibited from durable Ghost Bridge protocol artifacts; secure vault/hardware/non-exporting signer custody permitted |
| Client secret | Prohibited from durable Ghost Bridge protocol artifacts; secure provider/vault custody permitted | Prohibited from durable Ghost Bridge protocol artifacts; secure provider/vault custody permitted | Prohibited from durable Ghost Bridge protocol artifacts; secure provider/vault custody permitted |
| Password | Prohibited from durable Ghost Bridge protocol artifacts; secure provider/OS-store/vault custody permitted | Prohibited from durable Ghost Bridge protocol artifacts; secure provider/OS-store/vault custody permitted | Prohibited from durable Ghost Bridge protocol artifacts; secure provider/OS-store/vault custody permitted |
| Session cookie or session credential | Prohibited from durable Ghost Bridge protocol artifacts; secure provider custody and profile-designated transient channel presentation permitted | Prohibited from durable Ghost Bridge protocol artifacts; secure provider custody and profile-designated transient channel presentation permitted | Prohibited from durable Ghost Bridge protocol artifacts; secure provider custody and profile-designated transient channel presentation permitted |
| Reusable bearer material | Prohibited from durable Ghost Bridge protocol artifacts; secure provider/vault custody and designated transient presentation permitted | Prohibited from durable Ghost Bridge protocol artifacts; secure provider/vault custody and designated transient presentation permitted | Prohibited from durable Ghost Bridge protocol artifacts; secure provider/vault custody and designated transient presentation permitted |

Binding 1's compactness makes authority-relevant meaning depend almost entirely
on external evidence availability. Binding 3's “fully inline” descriptor still
does not justify storing secrets in protocol artifacts.

The prohibition covers durable Connections, previews, consent envelopes,
Install Grants, Connection Offers, Tasks, Receipts, protocol messages except a
profile-designated transient presentation location, immutable evidence bundles,
governance records, URLs, errors, logs, traces, metrics, audit fields, and
conformance reports. Any alternative placing reusable material on one of those
surfaces carries a **severe security risk** and is not recommended.

A selected profile may designate a credential provider, operating-system
credential store, secure vault, hardware signer, identity provider, or
non-exporting key service for durable private custody. That custodian must be
access-controlled and least-privilege, remain outside the Connection and
protocol evidence, expose only a safe opaque reference or verification result,
require proof beyond possession of that reference, and never make the secret
retrievable from a historical evidence identity. Its internal storage remains
deployment-private and has no protocol authority.

## Request-authentication alternatives

| Alternative | Semantics | Main risk |
| --- | --- | --- |
| Installation-only | Credential is validated at Connection creation; later requests rely on Connection reference | Stolen Connection/reference or expired/revoked credential can be used without current proof |
| Installation plus every governed request proof | Every governed request carries fresh selected-profile evidence | Signing/verification, replay, time, and payload-binding cost |
| Reusable authenticated channel/session | Requests reuse verified channel evidence with explicit freshness and channel binding | Resumption/proxy/channel confusion and request-context omission |
| Hybrid by profile | Every Connection-governed request needs current evidence; the profile may use per-request proof or bounded channel/session proof while satisfying a common context floor | More conformance branches and risk of calling an opaque session “current evidence” |

**Accepted H-05 choice:** hybrid by profile with a non-negotiable semantic
floor. Every request exercising Connection authority, and every Governed
request, requires current selected-profile evidence. A reusable session is
acceptable only if the profile binds the resumed session/channel to the exact
authenticated Host principal, authentication audience, Agent/resource target,
tenant, Connection, freshness, and revocation state and binds the individual
request context. For Governed operation, the proof must cover method, operation,
Connection, authentication audience, Agent/resource target, organization,
workspace, body/digest, creation/expiry, and replay value. Stricter
operation-specific proof may be required; weaker proof may not.

## Reauthentication alternatives

| Alternative | Ordinary proof failure | Binding expiry/loss | Identity/profile/scope change | Compromise/revocation |
| --- | --- | --- | --- | --- |
| Deny request only | Deny | Continue active | Mutate in place | Continue until Connection action |
| Suspend until reauthentication | Deny | Suspend | Tempting in-place rebind | Suspend |
| Replace Connection | Replace broadly | Replace | Replace | Replace/revoke |
| Revoke Connection | Revoke broadly | Revoke | Revoke | Revoke |
| Graduated model | Deny isolated request; suspend recoverable authentication unavailability; preserve planned same-invariant rotation; replace material identity/target changes; terminate compromise/authoritative revocation | Recoverable failures suspend and admit only defined same-invariant recovery | Explicit replacement with final preview/consent | Terminal for affected binding and existing Connection |

**Accepted H-05 choice:** the graduated model has five deterministic
semantic classes:

A. **Isolated request-proof failure.** Malformed, stale, or replayed proof, or
   wrong request body/operation binding, denies that request before Task
   creation, Approval consumption, or external side effect. The underlying
   Connection may remain eligible only when its durable authentication binding
   is otherwise current and uncompromised.
B. **Recoverable authentication unavailability.** Ordinary credential expiry,
   refresh failure, provider unavailability beyond permitted freshness, lost
   channel binding, or unresolved non-compromise key ambiguity denies current
   governed use and suspends authentication-dependent Connection use. Only an
   explicitly defined same-invariant reauthentication or recovery may restore
   it; no weaker profile or `none` fallback is possible.
C. **Planned same-invariant rotation.** Rotation may preserve the Connection
   only when exact profile, issuer, credential subject, authenticated Host
   principal, Agent, Passport, authentication audience, organization,
   workspace, limitations, and authority bounds remain unchanged. Immutable
   safe evidence of the replaced key/reference is retained; H-11 retains
   overlap and freshness mechanics.
D. **Material identity or target change.** Profile, issuer, credential subject,
   authenticated-principal, Agent, Passport, authentication-audience,
   organization, or workspace change requires a replacement Connection with a
   new final preview and explicit human consent. In-place reauthentication is
   prohibited.
E. **Compromise or authoritative revocation.** A selected credential, key, or
   binding marked compromised; authoritative revocation of the selected
   authentication binding; or explicit Connection revocation makes the affected
   binding terminal. The existing Connection cannot return to active use
   through ordinary reauthentication, and there is no fallback. A replacement
   requires a new Connection where governance permits.

H-07 retains exact state names and transition encoding. H-11 retains revocation
evidence, sequencing, freshness, anti-rollback, overlap, and compromise-time
mechanics. Neither may change these H-05 recovery-versus-terminal consequences.
H-09 retains accepted durable Task behavior.

## Bearer/PoP alternatives

| Alternative | Core remote | Governed remote | Main tradeoff |
| --- | --- | --- | --- |
| Bearer permitted with strict controls | Permitted | Permitted | Broad compatibility but theft/replay blast radius |
| PoP required for Governed | Bearer may be permitted for Core-only | PoP required | Mixed complexity; protects high-impact use |
| Bearer prohibited | PoP only | PoP only | Strongest theft resistance; highest integration cost |
| Deployment-defined mix | Any | Any | No interoperable security floor |

**Accepted H-05 choice:** mixed Core/Governed treatment. A fully specified
bearer profile may create a remote **Core-only** production Connection under
strict protected-transport, issuer, authentication-audience, subject/principal,
tenant, time, storage, redirect, and revocation rules. Bearer authentication
cannot satisfy the remote Governed floor. Remote Governed operation requires
PoP and current request-context evidence. Because the universal remote baseline
is signed request PoP, independent peers still have one common concrete
profile.

## Profile matrix

Candidate status does not imply approval or survival into a future registry.

| Candidate | Candidate status | Intended context | Identity source | Principal derivation | Credential type | Bearer/PoP | Establishment interaction | Per-request evidence | Authentication-audience binding | Agent/Connection binding | Org/workspace binding | Replay protection | Expiry | Refresh | Rotation | Revocation | Credential storage boundary | Proxy/broker concerns | Independent feasibility | Platform coupling | Core suitability | Governed suitability | Main compatibility risk | Main security risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unauthenticated fixture `none` | Retain only as explicit non-production fixture candidate | Deterministic tests/negative cases | None | No authenticated principal | None | Neither | Explicit fixture opt-in | None | None | Fixture labels only | Fixture labels only | None | Test-run bound | None | None | None | No credential | Accidental exposure outside harness | High for tests | Low | Test only | Never | Production code may silently enable fixture mode | Unauthenticated production authority |
| Authenticated local peer | New concrete production candidate | Same-host/local-channel production | Verified OS/process/channel peer evidence | Canonical service/user/Host mapping defined by profile | OS credential or channel identity | Channel-bound PoP | Local endpoint enrollment/configuration | Current authenticated peer plus request/channel context | Exact local service endpoint | Exact Agent and Connection | Exact org/workspace | Session/request replay rule | Finite session/binding | Reauthenticate; no identity change | OS/key rotation with invariant checks | OS/provider and binding revocation | OS/provider holds material; Connection stores safe result | Containers, namespace crossing, socket forwarding | Medium across operating systems; profile may need platform variants | Low | Yes for local | Yes only if Governed request floor is met | “Local” mechanisms differ across OSes | Same-machine/loopback mistaken for authenticated peer |
| OAuth bearer | New split profile candidate; legacy `oauth` not enough | Remote Core-only production and compatibility integrations | Token issuer | Profile-defined token subject/claims to typed Host principal | Access token | Bearer | Authorization/client credential/device/admin flow as profile permits | Protected credential presentation plus exact request target checks | Exact issuer/resource audience; no wildcard | Agent/resource and Connection context required | Exact org/workspace claims or trusted mapping | Token replay only through bounded transport/provider controls | Finite token expiry | Before expiry; after expiry via reauth path | Signing-key/token rotation | Issuer introspection/status under H-11 freshness | Secure provider/Host custodian may retain outside protocol artifacts; Agent receives transiently only if verifier | Redirect/header forwarding, reverse proxy logs | High if exact OAuth subset is specified | Medium | Optional | No | OAuth dialect/scope/subject disagreement | Token theft; scope confused with Ghost Bridge authority |
| OAuth PoP | New candidate with distinct identifier | Remote Core and Governed | Token issuer plus bound key | Token subject mapping plus PoP key authorization | PoP access token | PoP | OAuth issuance with bound key | Token plus proof bound to request/channel and common Governed fields | Exact issuer/resource | Exact Agent/resource, Connection, and key | Exact org/workspace | Nonce/time/proof replay | Finite token/proof expiry | Same-invariant refresh | Bound-key/token rotation with overlap rules | Token/key revocation | Secure provider may retain refresh material; non-exporting key preferred; neither enters protocol artifacts | Proxy must preserve proof target/channel semantics | Medium; exact standard subset required | Medium | Optional | Candidate | PoP variants differ and may not bind Ghost Bridge context | Token/key substitution or proof target ambiguity |
| Mutual TLS | Optional concrete candidate only after full definition | Remote service/workload | Certificate chain and SAN/profile mapping | Verified certificate identity to typed Host principal | Client certificate/private key | Channel PoP | Certificate enrollment and mutual handshake | Current channel plus per-request context proof for Governed use | Exact Agent service identity and certificate name | Channel/exporter plus Connection | Exact tenant mapping outside untrusted body | TLS/session plus request replay for Governed | Certificate/session validity | Reauthenticate handshake; no subject change | Certificate/key rotation | Certificate/issuer revocation under H-11 | Private key remains in secure/non-exporting custody outside protocol artifacts | Untrusted TLS terminator, load balancer, resumption | Medium; proxy deployment is difficult | Low | Optional | Only with request-context module | End-to-end versus proxy-terminated mTLS disagreement | Trusted proxy or name/channel confusion |
| Signed request | Accepted H-05 universal remote baseline candidate; legacy ID historical | Remote Core and Governed | Established Host signing key credential | Key subject/issuer maps to typed Host principal | Signing key/public credential | PoP | Key enrollment/challenge/provider authorization | Signature/MAC over common request-context floor | Exact Agent/resource audience | Exact Agent, Connection, protocol/profile | Exact org/workspace | Nonce, time, single-use proof | Short proof; finite key credential | Reauthenticate/renew credential | Key rotation preserving identity/scope | Key/credential revocation under H-11 | Private key stays in secure Host/provider/non-exporting custody; Connection stores safe identity/evidence only | Proxy path normalization and body transformation | High after H-10 vectors | Low | Mandatory under accepted H-05 | Mandatory under accepted H-05 | Canonical request target/bytes across languages | Key theft, replay, omitted field, rotation ambiguity |
| Managed credential | Establishment/provider category, not sufficient proof alone | Enterprise-managed deployment | Managed credential issuer/provider | Provider evidence maps to Host principal | Reference to managed credential | Bearer or PoP only through named concrete composition | Admin/provider provisioning | Must use a registered bearer/PoP/channel module | Exact provider issuer/resource | Presenter authorization plus Agent/Connection | Exact tenant | Inherited from proof module | Provider-defined bounded validity exposed semantically | Provider refresh under invariants | Provider rotation with evidence history | Provider status with H-11 freshness | Provider holds material; reference only elsewhere | Guessed/substituted reference, provider outage | Medium if provider-neutral result is required | Medium/high | Optional composition | Only with PoP module | Same reference semantics differ by provider | Reference accepted without presenter proof |
| Delegated credential | Do not retain as standalone profile; possible bounded establishment attribute | Explicit credential-use delegation inside one Host authority path | Credential issuer plus delegator evidence | Delegate principal remains explicit; no Agent authority transfer | Bounded delegated credential/reference | Must use named bearer/PoP composition; Governed requires PoP | Delegator grants exact use bounds | Concrete proof plus delegation bounds | Exact audience | Exact Agent/Connection; non-transferable | Exact tenant | Proof replay plus delegation use bounds | Short and no longer than parent | No widening; refresh requires delegator authority | Separate delegated key/reference | Parent/delegation revocation | Delegator/provider holds parent secret | Broker may overstate delegation | Medium/low until authorization boundary is specified | Medium | Optional only | Candidate only with PoP and H-02 bounds | Confused with authorization/delegation object | Delegation expansion or Agent-to-Agent authority transfer |
| Platform-brokered credential | Do not retain as standalone protocol profile | Managed product deployment | Platform session/provider | Platform maps to Host principal but must project portable context | Broker session/reference | Undefined until concrete composition | Product session/broker setup | Must use registered proof/channel module | Exact Agent resource | Exact Connection in portable result | Exact tenant | Broker plus protocol proof | Exposed finite validity | Broker refresh | Broker rotation | Broker/provider revocation | Platform holds material; protocol gets safe result | Broker outage, session opacity, insecure fallback | Low as standalone; high as implementation of another profile | Highest | Not standalone | Not standalone | Standalone peer cannot reproduce Platform session | Platform session treated as protocol authority |

## Establishment sequence alternatives

Alternative shortcuts—selection as authentication, accepting a setup reference
as proof, or creating the Connection before final validation—are rejected by
the accepted decision.

### Accepted initial establishment sequence

1. Resolve and verify Agent, Passport, and applicable discovery/Offer evidence.
2. Evaluate exact release-scoped authentication-profile eligibility.
3. Host explicitly selects one exact profile under H-04; Agent will
   independently verify it.
4. Produce an initial secret-free **informational preview** of interaction type,
   principal category, issuer and authentication-audience/tenant expectations,
   credential holder, proof type, expiry, refresh/rotation/revocation
   consequences, and limitations. It is non-final whenever exact validated
   identity or binding information is not yet known.
5. Resolve the setup reference under selected-profile and H-12 origin/redirect
   policy, then perform required user/admin/credential-provider interaction.
6. Issue or locate the credential/reference and present required challenge,
   transport, or request proof.
7. Validate exact profile/revision, issuer, credential subject, typed
   authenticated Host principal, Host application identity when separately
   required, authentication audience and Agent/resource target, Passport,
   organization, workspace, validity, revocation, presenter authority,
   PoP/channel binding, limitations, and downgrade state.
8. Generate a final secret-free authentication preview containing the exact
   selected profile/revision, issuer, safe credential subject or subject
   reference, typed authenticated Host principal, authentication audience,
   Agent/Passport, organization, workspace, validity boundary, proof/channel
   category, credential holder, refresh/rotation/revocation consequences,
   limitations, and direct immutable evidence identity or future
   H-10-qualified digest.
9. Present that exact final safe result to the human and obtain explicit human
   consent to it. If establishment produced any material result different from
   the informational preview, generate the updated final preview and obtain new
   consent; the earlier preview cannot be reused.
10. Create the immutable consent envelope only from the exact final consented
    result and its safe evidence identity/digest. Credential material and
    secret provider responses remain excluded.
11. Only after final consent, revalidate at redemption the profile selection,
    credential/reference and presenter proof, authenticated Host principal,
    authentication audience, tenant, freshness, revocation, final consent,
    Offer/grant, Agent/Passport, limitations, and evidence identity bindings.
12. Only the successful H-01 atomic redemption/Connection commit binds the
    authentication result into the durable Connection.
13. Any failure creates no Connection authority and does not trigger weaker
    profile or `none` fallback.

Neither the informational preview nor successful credential establishment
substitutes for final human consent. Steps 1 through 11 grant no Connection or
action authority. H-06 decides the exact grant-consumption transaction outcome.

## Governed-request sequence alternatives

### Accepted governed-request sequence

1. Receive current evidence through the selected profile/channel.
2. Derive the authenticated Host principal only from verified profile evidence.
3. Verify exact selected profile/revision, credential/presenter, proof or
   channel, and Connection binding.
4. Verify the authenticated Host principal as caller; the distinct
   authentication audience as the exact Agent/resource target; Agent/Passport;
   any separately required Host application identity; and organization/
   workspace, including explicit workspace absence.
5. Verify not-before/expiry, bounded freshness, nonce/replay, revocation, and
   profile-specific PoP/channel requirements; verify method, operation,
   body/digest, and request identifiers required by the Governed floor.
6. Load the exact active Connection and compare its immutable authentication
   result. Current discovery or provider defaults cannot replace it.
7. Verify current Trust/revocation evidence required for the Agent and
   Connection.
8. Obtain and verify H-02 structured authorization for the exact action.
9. Separately verify and consume exact-action Approval when required.
10. Only then create/accept a Task or begin an external side effect.

Authentication failure before step 10 creates no Task, consumes no Approval,
and performs no external side effect. Exact multi-fault error precedence remains
H-12.

## Refresh, rotation, and revocation analysis

### Accepted refresh or rotation sequence

1. Authenticate the refresh/rotation authority independently of the expiring
   ordinary request credential.
2. Confirm exact profile, issuer, credential subject, authenticated principal,
   authentication audience, Agent, Passport, organization, workspace,
   Connection, limitations, authority bounds, and proof/channel category
   invariants.
3. Reject widening, identity substitution, bearer substitution for a PoP
   binding, or profile downgrade.
4. Validate new not-before/expiry, key/reference, revocation authority, and
   proof of control.
5. Bind the new safe reference/validity/key identity and directly store its
   immutable evidence identity or future H-10-qualified digest.
6. Retain immutable safe historical evidence of the replaced key/reference
   without retaining or making retrievable any reusable credential material.
7. Keep the Connection active only for an ordinary pre-expiry refresh or
   planned rotation that preserves every invariant. Recoverable unavailability
   suspends pending defined same-invariant recovery; material identity/target
   change requires replacement; compromise or authoritative revocation is
   terminal for the affected binding and existing Connection.

Time validity is half-open: after bounded allowed skew for not-before, evidence
is invalid when `now >= expiresAt`; skew never extends expiry. Every concrete
profile must declare finite credential, proof, session, cache, and
reauthentication bounds. Exact durations are future normative profile
parameters, not provider defaults.

Refresh may occur before expiry. After expiry, ordinary Connection-governed
requests fail; when the binding is neither compromised nor authoritatively
revoked, recovery may use a separately authenticated same-invariant
reauthentication path.
Refresh or rotation cannot change issuer, credential subject, authenticated
Host principal, authentication audience, Agent, Passport, organization,
workspace, profile, proof category, limitations, authority bounds, or
Connection. Such a change requires replacement with a new final preview and
explicit human consent.

### Accepted revocation/authentication-loss sequence

1. Classify the event as isolated request-proof failure, recoverable
   authentication unavailability, planned same-invariant rotation, material
   identity/target change, or compromise/authoritative revocation.
2. Fail the current request before Task creation, Approval consumption, or
   external side effect.
3. For recoverable unavailability, suspend authentication-dependent Connection
   use and permit only explicitly defined same-invariant recovery.
4. For material identity/target change, require a replacement Connection with a
   new final preview and explicit consent; prohibit in-place reauthentication.
5. For compromise, authoritative authentication-binding revocation, or explicit
   Connection revocation, make the affected binding terminal for the existing
   Connection. Ordinary reauthentication cannot restore it; any permitted
   replacement is a new Connection.
6. Prevent fallback to bearer, weaker proof, another profile, or `none`.
7. Preserve the safe historical Connection and authentication-binding meaning
   without preserving retrievable credential material.
8. Leave H-07 exact state/transition encoding and H-11 evidence sequencing,
   freshness, anti-rollback, overlap, compromise-time, and historical Receipt
   mechanics deferred without deferring the semantic consequence.

## Failure-granularity analysis

| Semantic failure | Scope under accepted decision | State/authority effect | Fallback |
| --- | --- | --- | --- |
| Unknown profile | Whole establishment/request fails | No authority/current request denied | None |
| Unsupported profile | Whole establishment fails | No Connection | None |
| Malformed profile metadata | Containing advertisement/result invalid | No authority | None |
| No common profile | Establishment incompatible | No Connection | None |
| Selected-profile mismatch | Whole attempt/request fails | No commit/current request denied | None |
| Missing setup reference when required | Establishment fails | No Connection | None |
| Missing credential | Establishment/request fails | No commit; active use suspends only when this is recoverable authentication unavailability | None |
| Invalid credential reference | Establishment/request fails | No commit; reject substitution; suspend only when the selected provider cannot resolve an otherwise unchanged binding | None |
| Invalid proof, body binding, or operation binding | Isolated request failure; whole establishment if at setup/redemption | Deny before Task/Approval/effect; otherwise-current uncompromised Connection may remain eligible | No weaker proof |
| Wrong issuer | Proof mismatch or proposed material change | No commit; deny mismatched request; changing the bound issuer requires replacement Connection and final preview/consent | None |
| Wrong subject/principal | Proof mismatch or proposed material change | No commit; deny mismatched request; changing the bound identity requires replacement Connection and final preview/consent | None |
| Wrong authentication audience | Proof mismatch or proposed material target change | No commit; deny mismatched request; changing the bound target requires replacement Connection and final preview/consent | None |
| Wrong Agent/Passport | Proof mismatch or proposed material target change | No commit; deny mismatched request; changing the bound Agent/Passport requires replacement Connection and final preview/consent | None |
| Wrong Connection | Request substitution failure | Request denied | None |
| Wrong organization/workspace | Cross-tenant proof mismatch or proposed material change | Deny mismatched request; changing the bound tenant requires replacement Connection and final preview/consent | None |
| Expired credential | Recoverable authentication unavailability | Deny current use and suspend until explicitly permitted same-invariant reauthentication | None |
| Not-yet-valid credential | Request/establishment denied | No authority | None |
| Stale proof | Request denied | Binding may remain active | Fresh proof only |
| Replay | Request denied and replay evidence retained | No business effect | Fresh proof; idempotency remains separate |
| Revoked credential/key/binding | Authoritative revocation | Terminal for affected binding and existing Connection; ordinary reauthentication cannot restore it | New Connection only where governance permits |
| Compromised credential/key/binding | Compromise | Terminal for affected binding and existing Connection; ordinary reauthentication cannot restore it | New Connection only where governance permits |
| Explicit Connection revocation | Connection revocation | Existing Connection is terminal | New Connection only where governance permits |
| Refresh failure | Binding lifecycle failure | Stay active only until current validity ends; then suspend | No stale success |
| Rotation ambiguity | Recoverable authentication unavailability only when no compromise/revocation evidence exists | Suspend; do not guess key/reference; authoritative compromise/revocation is terminal | None |
| Profile or material result change after final consent | Material-change failure | New final preview/consent and replacement | None |
| Weaker-profile substitution | Downgrade attack | Reject | None |
| Fallback to `none` | Downgrade attack | Reject; production `none` ineligible | None |
| Credential provider unavailable | Recoverable authentication unavailability beyond freshness bound | Deny current use and suspend authentication-dependent Connection use | No cached success beyond bound |
| User interaction cancellation | Establishment cancelled | No Connection authority | Explicit restart only |
| Broker failure | Recoverable provider unavailability | Deny current use and suspend when selected-profile evidence is unavailable | No direct secret or `none` fallback |
| Transport-authentication mismatch | Isolated request failure or recoverable channel-binding loss | Deny request; suspend authentication-dependent use when the channel binding is lost | None |

H-12 must later assign exact public codes, HTTP statuses, safe details,
precedence, and retry categories. Error output must never echo credential
material, a proof secret, secret setup/provider response, raw subject claim, or
sensitive provider detail.

## Downgrade analysis

Downgrade includes:

- first-common or array-order selection;
- removing the selected profile after preview;
- substituting a same-name profile revision;
- replacing PoP with bearer;
- losing a request or channel binding;
- accepting an opaque reference without proof;
- changing issuer, authentication audience, principal mapping, Agent,
  Connection, or tenant;
- widening clock skew or freshness after consent;
- using cached authentication after expiry/revocation;
- falling back on provider/broker/proxy failure;
- using current discovery, SDK defaults, or Platform defaults after restart;
  and
- mapping production local operation to `none`.

Every such change fails closed. If a different eligible profile is offered, it
requires explicit H-04 selection, a new final secret-free preview, explicit new
human consent, and a new/replacement Connection. No selected-profile failure
causes automatic retry under another profile. A current discovery or provider
change can make current use unavailable, but cannot rewrite the historical
Connection.

## Security and threat analysis

Future conformance obligations become requirements only after separate
normative work is authorized.

| Threat/failure | Attacker or failure source; violated assumption; consequence | Required fail-closed outcome | Future conformance obligation |
| --- | --- | --- | --- |
| Fallback to `none` | Peer/provider failure removes selected proof; assumes unauthenticated local equivalence; unauthenticated authority | Reject; production `none` cannot create or recover a Connection | Fail every selected-profile-to-`none` mutation at setup, redemption, request, restart, and broker outage |
| First-common/array-order selection | Reordered arrays choose another mode; violates H-04 exact choice; downgrade/divergence | Reject absent/mismatched explicit Host selection | Permute all advertisements and prove one unchanged explicit choice |
| Name agreement, semantic disagreement | Peers attach different issuer/proof/lifecycle meaning to one string; false interoperability | Require exact release-scoped profile/revision/evidence identity | Same name with one semantic field changed must fail |
| Reference accepted without proof | Guessed/stolen handle is treated as authentication; presenter not verified | Resolve trusted provider and verify use authority, target, scope, freshness, and proof | Guess, swap, replay, and cross-present every reference |
| Bearer-token theft | Log/proxy/client compromise steals token; bearer assumption; impersonation | Deny wrong target/tenant/time; a selected binding authoritatively marked compromised or revoked is terminal for the existing Connection; never broaden authority | Stolen token across Agent, authentication audience, tenant, Connection, and after revocation |
| Token in URL/query/log/error | Client/proxy leaks reusable token | Reject placement; redact; no redirect forwarding | Inject token into every URL/log/error/Receipt/consent surface |
| Wrong OAuth issuer | Attacker token from accepted-looking but wrong issuer | Reject exact issuer mismatch | Cross-issuer token matrix |
| Wrong OAuth authentication audience | Token targets another resource/Agent | Reject exact canonical Agent/resource mismatch | Single/multiple/wildcard/wrong resource cases |
| Audience-purpose confusion | Authentication, Offer, grant, authorization, Approval, Receipt, or other signed-object audience is reused across proof domains | Reject unless the selected proof purpose defines and validates that exact audience independently | Cross-present each valid audience value in every other proof-purpose domain |
| OAuth user confused with Host principal | Resource owner claim is treated as caller | Apply explicit typed mapping; reject missing/ambiguous mapping | User/service/workload mappings and ambiguous resource-owner cases |
| OAuth scope confused with Ghost Bridge authority | Token scope is treated as capability/Connection authorization | Authentication succeeds at most; Connection and H-02 authorization still required | Valid broad token with absent/wrong Connection/ALLOW/Approval |
| Expired token | Cached token passes after exclusive expiry | Deny current use and suspend authentication-dependent use pending permitted same-invariant recovery | Before/at/after expiry with bounded skew |
| Refresh after revocation | Provider refreshes revoked chain or stale cache | Reject; authoritative revocation makes the affected binding terminal for the existing Connection | Revoke before/after refresh and provider rollback |
| Refresh changes subject/tenant | Token refresh silently substitutes identity/scope | Reject; replacement Connection with final preview/consent required | Mutate issuer, subject, principal, authentication audience, Agent, Passport, org, workspace one at a time |
| mTLS at untrusted proxy | Proxy terminates client cert and injects identity | Reject unless a separately authenticated trusted-proxy profile proves end-to-end context | Trusted/untrusted terminator and spoofed forwarded certificate |
| mTLS certificate name mismatch | Wrong service/Host certificate is accepted | Reject SAN/name/authentication-audience mismatch | SAN, chain, purpose, and target-name negatives |
| Channel binding lost on resumption | Session resumes without original peer/channel proof | Deny and suspend authentication-dependent use pending defined same-invariant recovery | Resumption, exporter change, load balancer, and restart cases |
| Signed request omits a required field | Signer/verifier mismatch leaves method/path/body/authentication-audience/Connection/tenant/nonce mutable | Reject incomplete profile proof | Omit/mutate each common request-context field |
| Signed request replay | Captured valid proof reused | Reject atomically before effect; idempotency remains separate | Concurrent and sequential replay across replicas/restart |
| Stale signed request | Old unexpired/cache mishandling | Enforce creation, expiry, maximum age, and revocation | Boundary clocks and stale-cache cases |
| Signing-key ambiguity/rotation | Same `kid`, overlapping keys, or provider drift selects wrong key | Reject ambiguity and preserve old safe evidence; suspend unresolved non-compromise ambiguity; authoritative compromise/revocation is terminal | Same-kid changed key, overlap, retired/revoked/compromised key |
| Managed reference guessed/substituted | Opaque handle leaks or is enumerable | Reference alone fails; verify presenter/target/scope | Enumeration, cross-tenant swap, deleted provider record |
| Delegated credential exceeds bounds | Delegate uses parent/wider credential | Reject outside exact delegated use and underlying Connection | Capability/scope/time/audience/use-count mutations |
| Delegation treated as Agent authority transfer | Another Agent's credential/Connection is presented | Reject direct/inherited Agent-to-Agent authority | Two-Agent credential/Connection substitution |
| Platform session treated as protocol authority | Product session or sealed binding bypasses portable profile proof | Reject without selected-profile context and active Connection | Platform and standalone paths must enforce same floor |
| Broker outage causes fallback | Availability logic sends raw secret, uses cached success, bearer, or `none` | Deny current use and suspend beyond allowed freshness; never fallback | Broker timeout/unavailable/malformed response at each phase |
| Setup redirect leaks credential | Setup/provider redirects to attacker origin | Follow only H-12/profile policy; strip/reject credentials | Same/cross-origin 3xx before/after credential presentation |
| Provider response changes after final consent | Issuer/principal/authentication-audience/tenant/proof changes | Material change requires a new final preview, explicit consent, and replacement rather than redemption under the old result | One-field provider response mutation after final consent and before redemption |
| Principal supplied in body | Caller claims another identity | Ignore as authority; reject reserved principal fields | Body/header/envelope spoof attempts |
| Credential for different Agent | Valid credential targets another Agent/resource | Reject authentication-audience/target binding | Cross-Agent reuse |
| Credential for different Connection | Proof/reference copied to another Connection | Reject Connection binding | Cross-Connection request and restart cache swap |
| Cross-org/workspace reuse | Valid credential reused across tenant | Reject exact scope/absence mismatch | Org/workspace absent/empty/value/cross-parent matrix |
| Post-restart binding loss | Process cache disappears or defaults change | Load durable semantic binding or suspend; never reconstruct | Client/Agent/provider restart with changed defaults/discovery |
| Authentication expires during Task | Binding expires after Task acceptance; unclear continuing effects | No new governed acceptance/Approval continuation after expiry; H-09 decides already accepted work | Expiry before acceptance, during queue/run/Approval, and before side effect |
| Authentication fails after Approval before side effect | Approval exists but caller proof is no longer current | Fail before effect; ordinary expiry suspends, authoritative revocation/compromise is terminal for the binding, and Approval does not replace authentication; H-08/H-09 decide only Approval/Task consequences | Expire/revoke/compromise authentication between Approval and effect |
| Stale cached authentication context | Cache outlives credential/revocation/profile validity | Enforce bounded freshness; deny and suspend recoverable unavailability; authoritative revocation/compromise is terminal | Cache boundary, provider deletion, revocation update |
| Discovery changes support after creation | New deployment advertises different profile | Do not reinterpret Connection; fail current support safely or replace | Add/remove profile after activation and restart |
| SDK/Platform default changes selection | Upgrade reorders modes or switches provider | Stored explicit selected profile wins; no default selection | Rolling upgrade with different defaults |
| Secret on protocol/public evidence surface | Implementation serializes header/token/provider response into Connection, preview/consent, grant/Offer, Task, Receipt, evidence/governance/conformance record, URL, error, log, trace, metric, or audit field | Reject/redact before persistence/output; only the designated transient presentation location may carry selected-profile material | Taint every secret class through every prohibited surface |
| Provider custody confused with protocol storage | Vault/OS store/IdP/hardware signer is treated as evidence authority or exposes retrievable material through a reference | Keep custody least-privilege and deployment-private; expose only safe reference/result and require proof beyond reference possession | Persist provider-held material, delete/guess/swap its reference, and verify protocol artifacts never retrieve or disclose it |
| Historical evidence indeterminate after deletion | Provider/key/reference is removed | Preserve the directly stored immutable safe evidence identity/digest and any external bulky safe evidence; return indeterminate where necessary, never retrieve a secret or invent proof | Delete provider/evidence and verify stable historical outcome |

## Compatibility and migration analysis

### Current artifact impact

- **Current `none` defaults:** incompatible with the accepted H-05 production
  baseline. Fixtures must explicitly label non-production mode; production
  configurations must select authenticated local-peer or remote profiles.
- **First-common selection:** must be removed in later implementation work.
  Existing array order cannot be preserved as selection authority.
- **Passport `authenticationDeclarations`:** historical string claims remain
  evidence only. Future advertisements need exact release-scoped profile and
  evidence references.
- **Connection Offer enum/setup reference:** the seven names remain historical;
  setup references need profile, origin, expiry, redirect, interaction, and
  secret-free semantics.
- **Native Client callback:** can remain a provider integration point only if it
  returns the complete safe semantic result or a verifiable provider result,
  not an opaque reference treated as proof.
- **Opaque binding normalization:** insufficient for issuer, principal,
  authentication audience, Agent, Connection, proof, freshness, and lifecycle.
- **Native Agent binding validation:** insufficient because it checks
  reference/mode/tenant shape rather than interoperable authentication.
- **Connection fields:** require the future safe semantic result and directly
  stored immutable evidence identity or H-10-qualified digest; the current
  mode/state/reference cannot be backfilled.
- **Previews and consent:** setup-time informational previews cannot substitute
  for a final post-establishment authentication preview and explicit consent to
  its exact validated result.
- **HTTP authentication hooks:** remain deployment adapters that must implement
  selected-profile verification and principal derivation.
- **Signed-request experimental profile:** useful evidence and the basis for the
  accepted H-05 baseline candidate, but not automatically graduated; H-10
  vectors and release-scoped review are required.
- **Platform material provider:** can implement access-controlled,
  least-privilege secret custody and designated transient presentation, but
  Platform references, headers, sessions, RBAC, sealed tokens, or retrievable
  secrets are not profile law or historical protocol evidence.
- **Fixtures/tests:** must be reclassified as historical/synthetic and later
  replaced or supplemented by portable profile cases.
- **TypeScript declarations:** need richer profile/result interfaces only in a
  separately authorized implementation phase.

### Deployment impact

- **Local development:** may use explicit fixture `none`; it cannot accidentally
  produce production authority. Authenticated local-peer profiles can also be
  tested.
- **Local production:** must implement a concrete authenticated local-peer
  profile or a remote profile over a local transport. Loopback/same-host is not
  sufficient.
- **Remote Core:** every Host and Agent would implement the signed-request PoP
  baseline. A registered bearer profile may be explicitly selected only for a
  Core-only Connection under its strict semantics.
- **Remote Governed:** requires a PoP-capable selected profile and current
  request-context evidence on every governed request.
- **Reverse proxies:** must not erase client identity/channel binding, rewrite
  signed targets/bodies without a defined canonical boundary, forward
  credentials across origins, or claim mTLS based on untrusted headers.
- **Enterprise identity providers:** can supply OAuth, certificate, workload, or
  managed credentials if the concrete profile defines exact issuer, subject
  mapping, authentication audience, tenant, proof, and lifecycle.
- **Managed deployments:** can retain credentials in a secure provider/vault,
  but must project the same portable safe authentication context, expose only a
  safe reference/result, and cannot weaken proof or make the material
  historically retrievable.
- **Independent Go/Python implementations:** need no Platform provider, but do
  need the universal remote profile, common context, deterministic failure
  rules, and H-10/H-11 assets.

### Existing durable objects

Existing Connections, grants, previews, stored credential references, Tasks,
Receipts, and `ghostbridge/0.1-draft` objects retain their original meaning.
They cannot be backfilled with authentication proof, principal derivation,
authentication-audience or proof-purpose-audience verification, final
post-establishment human consent, PoP, freshness, refresh, rotation, or
revocation evidence that was never exchanged or verified.

Migration must distinguish:

- **preserving historical meaning:** retain original bytes, mode claims, and
  known limitations;
- **denying new governed use:** stop new authority exercise when evidence is
  insufficient;
- **reauthentication:** obtain current evidence only for recoverable
  unavailability of the exact same approved profile/identity/target/scope;
  compromise and authoritative revocation remain terminal;
- **Connection replacement:** new final preview, explicit human consent,
  applicable grant flow, and complete binding;
- **migration tooling:** append-only inventory/classification with provenance;
  and
- **invented evidence:** prohibited.

Reconstructing a proof from current provider state, a credential reference,
package defaults, logs, or passing tests is invented evidence and is
prohibited.

## Required future normative consequences

Following this acceptance and only through separate authorization, future
normative prose would need:

1. release-scoped authentication profile registry semantics;
2. common authentication-context and concrete profile definitions;
3. advertisement, H-04 selection verification, setup, challenge, interaction,
   informational preview, credential/reference validation, principal derivation,
   final authentication preview, explicit human consent, and redemption
   revalidation sequences;
4. mandatory authenticated local-peer and universal remote baseline semantics;
5. Core bearer limits and Governed PoP/request-context floor;
6. issuer, credential subject, authenticated Host principal, separately
   required Host application identity, authentication audience as exact
   Agent/resource target, Agent/Passport, Connection, and tenant
   binding/comparison;
7. proof-purpose separation among authentication, Offer, grant-resolution,
   authorization, Approval, Receipt, and other signed-object audiences;
8. designated transient credential-presentation locations, comprehensive
   protocol-artifact secret prohibitions, and permitted deployment-private
   least-privilege provider/vault custody;
9. expiry, skew, freshness, refresh, rotation, revocation, reauthentication,
   suspension, replacement, and compromise semantics;
10. request proof/channel reuse and replay versus idempotency;
11. no-fallback/no-downgrade and material-change behavior;
12. privacy, correlation, redaction, direct immutable safe evidence identities/
    digests, external bulky safe verification evidence, and exclusion of
    retrievable credential material from history; and
13. stable isolated-failure, recoverable-unavailability, same-invariant
    rotation, replacement, and terminal-revocation categories linked to H-12.

The prose must cite accepted H-01 through H-05. It must not copy current
TypeScript, Platform, OAuth-provider, or proxy behavior as the definition.

## Required future schema consequences

No schema is created here. Later canonical schemas would need:

- profile advertisement with exact identifier/revision/evidence;
- exact Host selection and Agent verification result;
- authentication setup/challenge/interaction status;
- informational and final secret-free authentication previews plus exact human
  consent binding;
- secret-free authentication context/binding result;
- credential-reference descriptor with provider/issuer/target semantics but no
  credential material;
- provider-custody descriptor exposing only safe reference/result semantics,
  never retrievable material;
- request proof/channel descriptor;
- typed authenticated principal;
- separately typed authentication audience/Agent-resource target and
  purpose-specific signed-object audiences, plus tenant scope with explicit
  workspace absence;
- validity, refresh, rotation, revocation, and reauthentication descriptors;
- Connection authentication state and directly stored immutable evidence
  identity or future H-10-qualified digest, with an optional external bulky safe
  evidence reference;
- replacement/suspension semantic result hooks for H-07;
- safe error detail variants for H-12; and
- historical/legacy evidence classification outside original object bytes.

## Required future state-machine consequences

No state machine is created here. Later machines would need to represent:

- authentication establishment: advertised → selected → informational-previewed
  → interaction/setup → presented → verified → final-previewed →
  human-consented → redemption-revalidated → Connection-bound;
- interaction pending, cancelled, timed out, and failed;
- credential/binding: not-yet-valid → active → expiring → expired, rotated,
  revoked, or compromised;
- request authentication: evidence received → principal derived → context bound
  → freshness/replay/revocation verified → accepted/rejected;
- Connection authentication: active → suspended → reauthenticated-active, or
  replacement/terminal as the deterministic graduated model requires;
- refresh/rotation with invariant-preserving replacement evidence; and
- restart/recovery without fresh-discovery reinterpretation.

H-07 and H-09 retain exact transitions, commit effects, accepted Task behavior,
and recovery implementation. H-07 cannot convert H-05 terminal compromise or
authoritative revocation into recoverable suspension.

## Required future error-contract consequences

H-12 must define exact public codes, statuses, challenge/header placement,
precedence, safe details, retry classes, limits, timeouts, redirects, and logs
for all failure categories above. It must distinguish at least:

- invalid/unknown/unsupported/no-common profile;
- selection mismatch and downgrade;
- interaction required/cancelled/failed;
- missing/invalid credential or reference;
- invalid/stale/replayed proof;
- wrong issuer/subject/principal/authentication-audience/Agent/Connection/tenant
  or cross-purpose audience use;
- not-yet-valid/expired/revoked credential;
- refresh/rotation/reauthentication required or failed;
- provider/broker/transport/channel unavailable or mismatched;
- Connection suspended/replacement required/terminal binding; and
- historical authentication evidence indeterminate.

Errors must be secret-free, bounded, non-oracular, and clear about whether a
request, Connection state, grant, Approval, Task, or side effect changed.

## Required future conformance cases

Later implementation-neutral cases must include:

1. positive establishment and requests for every registered profile/role facet,
   including informational preview followed by exact final preview/consent;
2. every profile-matrix negative and legacy-name disposition;
3. H-04 exact-selection permutations and no-common results;
4. fixture `none` isolation and every attempted production use;
5. authenticated local-peer identity/namespace/channel negatives;
6. wrong issuer, subject/principal mapping, authentication audience, Agent,
   Passport, Connection, organization, and workspace, plus cross-purpose
   audience reuse;
7. bearer theft, placement, redirects, logs, and revocation;
8. PoP field mutation, omitted fields, key ambiguity, replay, and stale proof;
9. mTLS proxy, certificate-name, channel, and resumption cases;
10. setup-reference origin/redirect/provider mutation;
11. credential-reference guessing, substitution, deletion, and presenter
    authorization;
12. exact expiry/not-before/skew boundaries;
13. refresh before/after expiry and invariant mutation;
14. rotation, overlap, revocation, compromise, and provider failure;
15. isolated deny, recoverable suspend/same-invariant recovery, planned
    same-invariant rotation, material-change replacement, and terminal
    compromise/revocation consequence matrix;
16. restart with changed discovery, provider, SDK, and Platform defaults;
17. secret redaction for every message, Connection, preview/consent, grant/
    Offer, Task, Receipt, evidence/governance/conformance record, error, audit,
    log, trace, metric, and URL surface, while verifying permitted secure
    provider custody remains inaccessible through historical references;
18. historical evidence deletion and stable indeterminate result;
19. authentication loss before Task acceptance, during Task, during Approval,
    and before side effect, with H-08/H-09 outcomes;
20. Core bearer versus Governed PoP enforcement;
21. official Host to independent Agent and independent Host to official Agent;
    and
22. cross-language signed-request vectors and replay behavior after H-10.

Every case must cite future accepted requirements and canonical assets. Current
tests and official helpers are evidence inputs, not expected-result oracles.

## Accepted decision

**ACCEPTED DECISION:** the human approver selected the following complete
bundle:

1. **Top-level architecture:** Option B — layered common authentication context
   plus complete concrete release-scoped profiles. Exact profile identifiers
   name reviewed compositions; arbitrary runtime module mixing is not allowed.
2. **Mandatory baseline:** Baseline 2 — a distinct authenticated local-peer
   production profile and one universally implemented remote signed-request PoP
   profile. “At least one registered profile” is insufficient because two
   peers could have no common mode.
3. **`none`:** fixture/testing-only and incapable of creating or recovering a
   production Connection.
4. **Credential/Connection binding:** Binding 2 — store the safe
   authority-relevant semantic result and immutable evidence identity or future
   H-10-qualified digest directly. Bulky safe verification evidence may remain
   externally and historically resolvable. Reusable credential material remains
   under designated secure provider custody, outside protocol artifacts and
   never retrievable through Connection history.
5. **Request authentication:** hybrid by profile, but every
   Connection-governed request requires current selected-profile evidence and
   every Governed request satisfies the full current request-context floor.
6. **Bearer versus PoP:** bearer may be selected only for a fully specified
   remote Core-only profile; PoP is required for remote Governed operation.
7. **Reauthentication consequence:** the same graduated model, now
   deterministic—deny isolated request-proof failure; suspend recoverable
   authentication unavailability; preserve only planned same-invariant rotation;
   replace on material identity/profile/target/tenant change; and make
   compromise or authoritative revocation terminal for the affected binding and
   existing Connection.
8. **Legacy modes:**
   - `none`: historical name; successor semantics are fixture-only;
   - `oauth`: split into separately identified OAuth bearer and OAuth PoP
     profiles; no automatic alias;
   - `mutual_tls`: retain only as an optional new profile after exact
     certificate, target, proxy, channel, request, lifecycle, and tenant
     semantics are defined;
   - `signed_request`: use as the basis for the new universal remote profile,
     but do not alias or graduate the historical experimental identifier
     without H-10 assets and review;
   - `managed_credential`: treat as an establishment/provider category that
     must be composed into a concrete bearer/PoP/channel profile; not sufficient
     alone;
   - `delegated_credential`: do not retain as a standalone authentication
     profile; any future bounded credential-use delegation remains
     non-transferable and must use a concrete proof profile; and
   - `platform_brokered`: do not retain as a standalone protocol profile;
     Platform/broker behavior may implement another concrete profile only
     through the portable context.
9. **Local production:** require authenticated local-peer semantics or a remote
   profile; loopback/same-host/container/process assumptions alone are
   insufficient.
10. **Remote Core:** every Host and Agent implements signed-request PoP to
     guarantee a common concrete profile; explicitly selected strict OAuth bearer
     may support Core-only production but cannot satisfy Governed requirements.
11. **Remote Governed:** every request requires current PoP evidence bound to
     method, operation, Agent/resource target, Connection, authentication
     audience, tenant, body/digest, time, expiry, and replay value. Other PoP
     profiles may be selected if they meet or strengthen the floor.
12. **Downgrade/fallback:** no first-common, array-order, provider-default,
    nearest-mode, bearer-for-PoP, weaker-profile, cached-success, broker-failure,
     or `none` fallback. A profile change requires new selection, final
     secret-free preview, explicit human consent, and replacement Connection.
13. **Historical/legacy:** preserve `ghostbridge/0.1-draft` names and objects as
    historical claims. Do not backfill proof or alias legacy names to successor
    profiles.
14. **Principal, audience, and storage:** derive a typed authenticated Host
    principal only from verified evidence and treat it as the caller; separately
    bind the authentication audience as the exact Agent/resource target, plus
    issuer/subject, any required Host application identity, Agent/Passport,
    tenant, and Connection. Keep Ghost Bridge protocol artifacts and
    public/historical surfaces free of reusable secrets while permitting
    selected secure provider/vault custody outside them.
15. **Lifecycle:** use the establishment, governed-request,
     refresh/rotation, and revocation sequences in this packet, including a
     final post-establishment preview and explicit human consent before
     redemption revalidation.
16. **Qualifications:** the approval attaches every qualification in the next
    section; in particular, H-10/H-11/H-12 must complete their retained
    mechanics, concrete profiles must remain complete, and independent
    interoperability evidence is required before any stable-release claim.
17. **Residual risks:** the human approver knowingly accepted the residual-risk
    list below; the accepted decision does not silently waive signed-request,
    local-peer, OAuth, proxy, provider, availability, history, migration, or
    cross-language risks.
18. **Compatibility impact:** treat the change as intentionally incompatible
    with current `none` defaults, first-common selection, opaque bindings, and
    insufficient legacy Connections. Preserve historical bytes and meaning,
    prohibit invented evidence, and use restriction, same-invariant
    reauthentication, or replacement according to the migration analysis.
19. **Security impact:** adopt the fail-closed threat outcomes below, including
     exact authentication-audience/target/tenant/Connection binding, current
     Governed PoP, replay and freshness checks, protocol-artifact secret
     exclusion with private provider custody, no reference-as-proof, and no
     downgrade. This improves the semantic floor but does not remove the listed
     residual risks or substitute for H-10/H-11/H-12 and external review.

This accepted decision requires one universal concrete remote profile because a
shared abstract context and “at least one” profile do not guarantee that an
independent Host and Agent have any exact common mechanism. The accepted
signed-request PoP baseline is provider-neutral and can be implemented with
local keys, workload identities, hardware signers, or managed signers while
producing the same observable proof semantics. H-10 must still decide its exact
cryptographic representation before implementation.

The accepted decision explicitly answers:

- `none` can never create a production Connection; and
- every Governed request requires current authentication evidence under the
  selected profile.

The human approver accepted these components as one complete H-05 bundle.
Candidate profile status still does not create a registry entry, identifier,
normative artifact, or implementation authorization.

## Qualifications attached to accepted decision

The human approval attaches all of these qualifications:

1. The universal signed-request profile is semantic only until H-10 defines
   exact bytes, algorithms, key formats, and vectors.
2. Profile identifiers and revisions are immutable and selected-release scoped.
3. The common authentication context is a minimum, not permission for arbitrary
   module composition.
4. Every concrete profile must completely define principal mapping,
   authentication audience/Agent-resource target, purpose-specific audience
   handling, tenant, proof/channel, lifecycle, storage, and failure semantics.
5. External OAuth, OS, TLS, managed, and broker systems may perform
   establishment and retain required credential material only under
   access-controlled, least-privilege, deployment-private provider/vault/
   hardware/non-exporting custody while producing verifiable portable safe
   semantics.
6. A credential reference never counts as proof.
7. The Connection directly stores the immutable evidence identity or future
   H-10-qualified digest. External historically resolvable evidence is bulky
   safe verification evidence only and can never retrieve credential material.
8. No reusable secret enters a durable Connection, preview, consent envelope,
   Install Grant, Connection Offer, Task, Receipt, protocol message outside the
   designated transient presentation location, evidence bundle, governance
   record, conformance report, URL, error, log, trace, metric, or audit field.
9. Provider custody exposes only a safe opaque reference or verification result,
   and possession of that reference is never sufficient proof.
10. A final post-establishment secret-free authentication preview is presented
    to the human and explicitly consented before its exact result forms the
    immutable consent envelope and redemption is revalidated. The earlier
    informational preview and successful establishment are insufficient.
11. Authenticated Host principal and authentication audience are separate. Each
    authentication, Offer, grant-resolution, authorization, Approval, Receipt,
    or other signed-object audience is proof-purpose-specific.
12. Designated bearer transport presentation is transient, direct, protected,
    non-redirectable across origin, and Core-only.
13. Governed PoP proof covers the full request-context floor.
14. Refresh/rotation preserves exact identity, target, tenant, profile, and
    limitations or requires replacement.
15. Isolated proof failure denies only the request when the binding is otherwise
    current; recoverable unavailability suspends; material identity/target
    change replaces; and compromise or authoritative revocation is terminal for
    the affected binding and existing Connection.
16. H-07 state names/transitions and H-11 revocation mechanics cannot weaken or
    change those H-05 recovery-versus-terminal consequences.
17. Legacy objects remain historical and may be restricted or replaced, never
    supplied with invented evidence.
18. Independent conformance and bidirectional interoperability are required
    before any stable-release claim.
19. Platform may enforce stricter policy but cannot redefine the profile or
    weaken the floor.

## Residual risks

- The signed-request baseline adds key enrollment, custody, rotation,
  canonicalization, clock, replay, and verifier availability obligations.
- A common authentication context may become too broad or too narrow as new
  credential systems emerge.
- Authenticated local-peer profiles may fragment by operating system unless
  their variants and equivalence are carefully governed.
- OAuth bearer Core-only support remains vulnerable to token theft and may be
  mistaken for Governed eligibility.
- Reverse proxies can break target/body/channel binding or create trusted-header
  confusion.
- H-10, H-11, and H-12 remain central dependencies; unsafe choices there could
  undermine this semantic model.
- Long-term immutable evidence availability is operationally difficult.
- Provider deletion can still make some historical external facts
  indeterminate, though no proof may be invented.
- Suspension and reauthentication may reduce availability during provider or
  revocation-service outages.
- Consent displays become richer and risk confusing users unless safe
  categories are carefully designed.
- Managed and brokered deployments may expose portable fields while still
  hiding security-critical internal assumptions.
- Deployment-private providers, vaults, OS stores, hardware signers, identity
  providers, and non-exporting services can still be compromised or
  misconfigured; excluding their material from protocol artifacts limits
  exposure but does not prove their custody controls.
- Existing implementations and durable Connections require substantial
  migration or replacement.
- Cross-language signed-request interoperability is unproven.
- A compromised Host signer with a valid Connection still requires H-02
  authorization and Approval defenses; authentication alone cannot contain all
  abuse.

## Accepted H-05 choices

| Choice | Accepted resolution | Approval state |
| --- | --- | --- |
| Architecture | Option B layered context/profiles | `ACCEPTED` |
| Mandatory profile baseline | Baseline 2 | `ACCEPTED` |
| Universal remote profile | Signed-request PoP successor profile | `ACCEPTED` |
| Governed floor | PoP and current request-context evidence | `ACCEPTED` |
| `none` | Fixture/testing-only; no production Connection | `ACCEPTED` |
| Local production | Authenticated local-peer or remote profile | `ACCEPTED` |
| Binding | Binding 2 hybrid secret-free result/evidence | `ACCEPTED` |
| Request model | Hybrid mechanism with current-evidence floor | `ACCEPTED` |
| Bearer | Core-only under strict concrete profile | `ACCEPTED` |
| Reauthentication | Graduated deny/suspend/reauthenticate/replace/revoke | `ACCEPTED` |
| Downgrade | No fallback; material change requires replacement | `ACCEPTED` |
| Legacy names | Historical; split/retain/retire as listed | `ACCEPTED` |
| Historical evidence | Preserve, restrict/replace as needed, never invent | `ACCEPTED` |

## Questions deferred to later decisions

The accepted decision does not decide:

1. H-06 grant replay, concurrency, lost-response, and consumption outcomes.
2. H-07 exact Connection state names, atomic transition encoding, persistence,
   and recovery/replacement wire mechanics; it cannot alter H-05's
   recoverable-versus-terminal classification.
3. H-08 Approval lifecycle/consumption after authentication loss.
4. H-09 accepted Task behavior when authentication expires, is suspended, or is
   revoked during durable work.
5. H-10 exact canonical request bytes, digest/signature algorithms, key formats,
   encodings, and domains.
6. H-11 revocation sequence/freshness/rollback, rotation overlap, compromise
   history, and historical Receipt verification mechanics; it cannot make a
   terminal H-05 binding recoverable.
7. H-12 exact routes, headers, statuses, error precedence, redirects, retries,
   timeouts, limits, challenge fields, and logging keys.
8. H-13 object openness, unknown profile fields, extension namespaces, and
   profile-extension evolution.
9. H-14 registry publisher/signing authority, support/deprecation/withdrawal,
   evidence gates, and Protocol 1.0 graduation.
10. Exact wire field names, schema IDs, and profile identifier spellings.
11. Concrete numeric lifetimes and skew bounds for each profile; later
    normative profiles must choose them rather than inheriting provider
    defaults.
12. Migration disposition of each active legacy Connection and nonterminal
    Task; invented evidence remains prohibited regardless of that disposition.

## Consequences of acceptance

1. H-05 and the decision register now record the human disposition, selected
   bundle, qualifications, risks, compatibility impact, security impact,
   approver, date, and approval reference.
2. H-05 acceptance authorizes only the selected protocol-governance decision.
3. It does not itself create normative requirements, profile registries,
   schemas, state machines, fixtures, vectors, conformance cases, SDK or runtime
   behavior, Platform behavior, migration, deployment, publication, or release.
4. No `GB-*` gap is closed merely by acceptance.
5. Future applicable normative work must cite accepted H-01 through H-05.
6. H-06 through H-14 remain controlling for their deferred subjects.
7. H-07 must encode, but cannot change, H-05's recoverable-versus-terminal
   semantic classification.
8. H-10 must define exact signed-request bytes, algorithms, keys, encodings,
   domains, and independently reproduced vectors.
9. H-11 must define revocation evidence mechanics without making a terminal
   H-05 binding recoverable.
10. H-12 must define exact transport, credential placement, redirects, public
    errors, precedence, retries, limits, and observability.
11. H-13 and H-14 retain profile evolution, registry authority, support,
    deprecation, withdrawal, and graduation.
12. SDK, Agent, Client, Trust, Platform, provider, and migration changes require
    separately authorized implementation work.
13. Independent implementation, bidirectional interoperability, portable
    conformance evidence, and external security review remain required.
14. Existing historical objects cannot be rewritten or backfilled with invented
    authentication evidence.

## Human approval block

Human approval is recorded as follows:

- **Approver:** rudra
- **Approval date:** 2026-07-31
- **Approved architecture option:** Option B — Layered establishment plus
  per-request authentication
- **Approved mandatory-profile baseline:** Baseline 2 —
  Role/context-scoped concrete baseline
- **Approved `none` disposition:** Fixture/testing-only; incapable of creating,
  recovering, or authorizing a production Connection
- **Approved binding alternative:** Binding 2 — Hybrid semantic result plus
  secret-free immutable evidence
- **Approved request-authentication model:** Hybrid by profile with current
  selected-profile evidence required for every request exercising Connection
  authority
- **Approved bearer/PoP rule:** Strict fully defined bearer authentication may
  be Core-only; remote Governed operation requires PoP and full current
  request-context evidence
- **Approved reauthentication model:** Graduated deterministic
  deny/suspend/same-invariant-rotation/replace/terminal-revocation model
- **Approved legacy-mode disposition:** The complete split, retain, retire, and
  historical treatment recorded in this accepted decision
- **Approved qualifications:** All qualifications recorded in the accepted
  H-05 decision and verbatim human approval statement
- **Accepted risks:** All residual risks recorded in the accepted H-05 decision
  and verbatim human approval statement
- **Compatibility impact:** Accepted as recorded in the H-05 compatibility
  analysis and verbatim human approval statement
- **Security impact:** Accepted as recorded in the H-05 security analysis and
  verbatim human approval statement
- **Sign-off/reference:** Explicit human approval supplied by rudra in the
  Phase 15D.1D independent-review conversation on 2026-07-31
- **Resulting status:** `ACCEPTED`

### Verbatim human approval

I, rudra, approve H-05 on July 31, 2026.

Approved H-05 decision bundle:

1. **Architecture:** Option B — Layered establishment plus per-request authentication, using a common transport-independent authentication context and complete release-scoped concrete profiles.

2. **Mandatory-profile baseline:** Baseline 2 — Role/context-scoped concrete baseline:

   * a distinct authenticated local-peer profile for local production;
   * one universally implemented remote signed-request proof-of-possession profile;
   * a current PoP and request-context floor for remote Governed operation;
   * optional stronger or environment-specific profiles; and
   * immutable historical treatment of legacy `ghostbridge/0.1-draft` mode names.

3. **`none` disposition:** `none` is fixture/testing-only. It cannot create, recover, or authorize a production Connection. Local production must use an authenticated local-peer profile or a remote authentication profile.

4. **Credential and Connection binding:** Binding 2 — Hybrid semantic result plus secret-free immutable evidence:

   * authority-relevant safe authentication semantics are stored directly in the durable Connection;
   * the immutable evidence identity or future H-10-qualified digest is stored directly;
   * bulky safe verification evidence may remain externally and historically resolvable;
   * reusable credential material remains under profile-designated secure provider, vault, operating-system store, hardware signer, identity-provider, or non-exporting-service custody;
   * credential material is excluded from Ghost Bridge Connections, previews, consent envelopes, grants, Offers, Tasks, Receipts, evidence bundles, governance and conformance records, URLs, errors, logs, traces, metrics, and audit fields; and
   * a credential reference is never proof by itself and cannot provide historical retrieval of a reusable secret.

5. **Request-authentication model:** Hybrid by profile with a mandatory current-evidence floor. Every request exercising Connection authority requires current evidence under the exact selected profile. Every remote Governed request requires current proof bound to the method, operation, Agent/resource target, Connection, authentication audience, organization, workspace, body or digest, creation and expiry times, and replay value.

6. **Bearer and PoP rule:** A completely defined bearer profile may be used only for remote Core-only production under strict protected-transport, issuer, authentication-audience, principal, tenant, time, storage, redirect, refresh, and revocation rules. Bearer authentication cannot satisfy the remote Governed floor. Remote Governed operation requires proof of possession and current request-context evidence.

7. **Reauthentication and failure model:** The graduated deterministic model:

   * isolated malformed, stale, replayed, or wrongly bound request proof denies only that request when the underlying binding remains current and uncompromised;
   * ordinary expiry, refresh failure, excessive provider unavailability, lost channel binding, or unresolved non-compromise ambiguity suspends authentication-dependent Connection use pending explicitly defined same-invariant recovery;
   * planned rotation may preserve the Connection only when the profile, issuer, credential subject, authenticated Host principal, Agent, Passport, authentication audience, organization, workspace, limitations, and authority bounds remain unchanged;
   * profile, issuer, subject, authenticated-principal, Agent, Passport, authentication-audience, organization, or workspace change requires a replacement Connection with a final preview and explicit human consent; and
   * compromise, authoritative revocation of the selected authentication binding, or explicit Connection revocation is terminal for the existing binding and Connection and cannot be recovered through ordinary reauthentication.

8. **Legacy-mode disposition:**

   * `none`: retained only as an explicit non-production fixture mode;
   * `oauth`: the legacy name remains historical; future bearer and PoP profiles require separate complete identifiers and semantics;
   * `mutual_tls`: may survive only as an optional fully specified concrete profile;
   * `signed_request`: the legacy identifier remains historical; a newly identified signed-request PoP successor is the universal remote baseline;
   * `managed_credential`: not a standalone proof profile; it may be a provider or establishment component of a concrete profile;
   * `delegated_credential`: not a standalone authentication profile; any bounded credential-use delegation remains non-transferable and must use a concrete proof profile; and
   * `platform_brokered`: not a standalone protocol profile; Platform or broker behavior may implement another concrete profile only by producing the portable Ghost Bridge authentication context.

9. **Principal and audience:** The authenticated Host principal is the caller. The authentication audience is the exact Agent/resource target. Authentication, Connection Offer, Install Grant resolution, authorization, Approval, Receipt, and other signed-object audiences are purpose-specific and cannot be silently reused across proof domains.

10. **Establishment and consent:** Initial setup information is non-authoritative. After credential establishment and validation, the exact safe authentication result must be presented through a final secret-free preview and explicitly consented to by the human before redemption revalidation and durable Connection creation. Material differences require an updated preview and new consent.

11. **Downgrade and fallback:** No first-common, array-order, provider-default, nearest-mode, bearer-for-PoP, weaker-profile, cached-success, broker-failure, or `none` fallback is permitted. A profile change requires new selection, final preview, explicit consent, and a replacement Connection.

12. **Historical treatment:** Existing `ghostbridge/0.1-draft` names, objects, Connections, and evidence retain their original historical meaning. No authentication proof, principal binding, validity information, or other evidence may be backfilled or invented. Existing objects may later be restricted, reauthenticated when sufficient verified evidence exists, or replaced according to separately approved migration rules.

I approve all qualifications stated in the reviewed H-05 decision packet, including:

* the signed-request baseline remains semantic until H-10 defines canonical bytes, algorithms, key formats, proof domains, and independently reproduced vectors;
* profile identifiers and revisions are immutable and selected-release scoped;
* every concrete profile must completely define principal mapping, authentication audience, Agent/resource target, purpose-specific audience handling, tenant binding, proof or channel semantics, credential custody, lifecycle, and failure behavior;
* external OAuth, OS, TLS, managed, and broker systems may perform establishment or privately retain credential material only when they produce portable, verifiable, secret-free Ghost Bridge semantics;
* current discovery, SDK defaults, Platform defaults, provider defaults, and mutable references cannot reinterpret an active or historical Connection;
* H-06 through H-14 retain their expressly deferred subjects;
* no `GB-*` gap is closed by this approval alone; and
* independent implementation, bidirectional interoperability, portable conformance evidence, and external security review remain required before any stable-release or Protocol 1.0 claim.

I knowingly accept all residual risks documented in the reviewed H-05 packet, including:

* the complexity and implementation burden of the layered authentication context;
* incomplete H-10 cryptographic and canonicalization decisions;
* key distribution, signing, verification, replay, clock, rotation, and revocation complexity for the universal signed-request profile;
* operating-system and namespace differences affecting authenticated local-peer profiles;
* OAuth dialect, subject-mapping, bearer-theft, redirect, proxy, and provider risks;
* mTLS termination, resumption, name-binding, and channel-binding risks;
* managed-provider and broker opacity, outage, deletion, and portability risks;
* long-term availability and privacy risks for safe historical evidence;
* richer consent and durable Connection records;
* migration or replacement requirements for current implementations and durable Connections;
* unproven cross-language signed-request interoperability; and
* the fact that authentication cannot replace H-02 authorization, Trust verification, deployment policy, or exact-action Approval.

I accept the documented compatibility impact, including:

* intentional incompatibility with current `none` defaults;
* intentional incompatibility with first-common and array-order selection;
* intentional incompatibility with opaque reference-only authentication bindings;
* required replacement or restriction of legacy Connections that lack sufficient verified authentication evidence;
* future changes to wire schemas, Connection records, SDK interfaces, Agent and Client behavior, tests, examples, and Platform adapters through separately authorized work;
* preservation of historical bytes and meaning;
* prohibition on invented or reconstructed evidence; and
* migration through explicit restriction, same-invariant reauthentication, rotation, or replacement rather than silent reinterpretation.

I accept the documented security impact, including:

* explicit separation of authentication from Connection authority, authorization, Trust, policy, and Approval;
* one universally interoperable remote PoP baseline;
* current authentication evidence for all Connection-governed requests;
* PoP and full request-context binding for remote Governed operation;
* exact caller, target, audience, tenant, Agent, Passport, and Connection binding;
* no reference-as-proof;
* purpose-specific audiences;
* final post-establishment human consent;
* secret exclusion from Ghost Bridge protocol artifacts and public or historical evidence surfaces while allowing secure private provider custody;
* fail-closed expiry, replay, revocation, compromise, provider-failure, and downgrade behavior;
* deterministic recovery-versus-terminal consequences; and
* continued dependence on H-10, H-11, H-12, independent implementation, conformance, interoperability, and external security review.

This approval changes H-05 to `ACCEPTED` only after this approval information is recorded in the decision record.

It does not itself approve or authorize normative specification text, registries, schemas, state machines, fixtures, vectors, conformance cases, SDK or runtime implementation, Platform changes, migration execution, deployment, publication, release, or Protocol 1.0.

H-06 through H-14 remain deferred.

## Work unlocked only with separate authorization

Following this acceptance, separately authorized work may:

1. write stable requirement-numbered authentication prose citing accepted
   H-01 through H-05;
2. define profile/context/binding/request/reauthentication schemas;
3. define H-07 authentication and Connection state-machine integration;
4. define H-10 signed-request bytes, algorithms, keys, domains, and vectors;
5. define H-11 credential/key revocation and rotation integration;
6. define H-12 transport placement, errors, redirects, and observability;
7. derive portable positive, negative, malicious, lifecycle, redaction, and
   interoperability cases;
8. implement SDK, Agent, Client, Trust, Platform, and provider changes;
9. create explicit legacy migration inventory/tooling without backfill; and
10. perform independent implementation, bidirectional interoperability, and
    external security review.

Acceptance alone does not authorize or complete those items and does not close
a gap or establish Protocol 1.0.

## Final status

- H-01 is `ACCEPTED`.
- H-02 is `ACCEPTED`.
- H-03 is `ACCEPTED`.
- H-04 is `ACCEPTED`.
- H-05 is `ACCEPTED`.
- H-06 through H-14 remain deferred.
- H-05 acceptance records only the approved protocol-governance decision.
- No normative, schema, registry, state-machine, fixture, vector, conformance,
  SDK, runtime, Platform, package, test, workflow, migration, deployment,
  publication, release, or Protocol 1.0 work is authorized merely by this
  acceptance.

**H-05 is ACCEPTED.**
