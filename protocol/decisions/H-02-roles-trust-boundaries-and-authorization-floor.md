# H-02 — Roles, trust boundaries, and protocol authorization floor

## Decision ID

`H-02`

## Title

Roles, trust boundaries, and protocol authorization floor

## Status

**ACCEPTED**

Authorization Option B, logical role model R2, the permitted R1/R3 deployment
topologies, and the qualifications recorded in the approval block were approved
by the identified human approver on 2026-07-28. The alternatives and analysis
remain immutable decision history.

## Date prepared

2026-07-27

## Deferred decisions

H-03 through H-13 remain deferred. Acceptance of H-01 and H-02 does not
implicitly decide version negotiation details, capability precedence,
authentication profiles, Install Grant retry semantics, the complete Connection
state machine, Approval lifecycle, Task lifecycle, canonicalization, revocation,
transport/errors, or schema evolution.

## Scope

This record asks humans to approve:

- canonical logical participant roles and their responsibilities;
- the boundary between Client implementation, Host Application, authenticated
  Host principal, Agent, operator, Approver, authorization policy authority,
  Passport issuer, Trust verification, organization authority, and workspace
  authority;
- authority each role may issue, verify, and enforce;
- authority transfers that are always prohibited;
- the minimum protocol authorization evidence required in addition to
  authentication and active Connection authority;
- the boundary between that protocol floor, deployment-specific policy such as
  Platform policy, and exact-action Approval.

Logical roles may be implemented in one process or split across services, but
co-location must not merge their authority semantics.

## Out of scope

- Authentication profile protocols and credential lifecycle governed by H-05.
- Install Grant transaction/retry behavior and final issuer rules governed by
  H-06.
- Complete Connection states and scope inheritance governed by H-07.
- Exact Approval action bytes and consumption governed by H-08 and H-10.
- Trust bootstrap, revocation, and anti-rollback detail governed by H-11.
- Transport placement, errors, timeouts, and logging detail governed by H-12.
- A complete deployment policy language or implementation.
- Making Ghost Bridge Platform policy normative by observation.
- Direct Agent-to-Agent authority, MCP authority, or MCP Trust semantics.

## Affected GB gap IDs

Primary: `GB-001`, `GB-002`, `GB-003`, `GB-008`, `GB-012`, `GB-013`, and
`GB-055`.

Closely coupled: `GB-007`, `GB-011`, `GB-018`, `GB-029`, `GB-047`, and
`GB-049`.

## Affected Phase work items

Primary: `D1-01`, `D1-03`, `D1-07`, `E-01`, `E-02`, and `P1-03`.

Downstream: `D1-04`, `D1-06`, `D2-01`, `D2-04`, `D2-05`, and `P1-01`.

## Existing Ghost Bridge evidence

All observations in this section describe repository state. They do not make
the observed behavior normative.

### Draft role and authority prose

- The participant list names Agent Provider, Passport Issuer, External Native
  Agent, Host Application, Host Client, Operator, Organization, Workspace,
  Approver, Registry, and Platform. It does not define an authenticated Host
  principal, authorization policy authority, Agent operator, or Trust Node
  responsibility
  (`protocol/specification/0.1-draft/participants.md`).
- Terminology defines Install Grant, Agent Connection, Invocation, Approval,
  Task, Receipt, and Revocation, but does not allocate their validation or
  enforcement to roles
  (`protocol/specification/0.1-draft/terminology.md`).
- Architecture says implementations choose their database, identity provider,
  policy engine, and topology; internal storage records are not wire messages
  (`protocol/specification/0.1-draft/architecture.md`).
- The Trust model starts with issuer/Passport verification, while explicitly
  warning that transport reachability is not Trust
  (`protocol/specification/0.1-draft/trust-model.md`).
- The threat model identifies Connection authority, tenant scope, Approval
  decisions, execution integrity, Receipts, and revocation freshness as
  separate assets
  (`protocol/threat-model/README.md`).
- The Phase 15C Trust threat model places the protected flow at
  Provider/Issuer → Host Application → External Agent and excludes direct
  autonomous coordination from the Core/Governed acceptance boundary
  (`protocol/threat-model/phase-15c-trust.md`).
- An Approval Decision is single-use and bound to an exact Invocation/action/
  scope/limit/expiry; the draft does not say that it transfers Connection
  authority
  (`protocol/specification/0.1-draft/approval.md`).

### Schemas

- `trust-result.schema.json` carries `trusted` and
  `cryptographicallyValid` as separate fields, demonstrating that successful
  cryptographic verification and an accepted Trust decision are not identical
  (`protocol/schemas/0.1-draft/trust-result.schema.json:7-13`).
- A Passport declares identity, capability references, supported versions,
  transports, and Trust material. It contains no Connection or per-Invocation
  authorization decision
  (`protocol/schemas/0.1-draft/passport.schema.json`).
- The Invocation schema requires organization and initiating subject, makes
  workspace optional, and allows a `policyDecisionReference`, but it does not
  carry `connectionId`, an authorization decision, decision freshness, policy
  revision, or exact authorization-action digest
  (`protocol/schemas/0.1-draft/invocation.schema.json:7-30`).
- The Approval Decision schema identifies the exact Approval action digest and
  approver, but not Connection authority or general policy authorization
  (`protocol/schemas/0.1-draft/approval-decision.schema.json`).
- No authorization decision/evidence schema exists.

### Native Client

- The Client owns discovery, configured Trust verification, installation
  preview, authentication callback use, local Connection records, Invocation,
  Task/Receipt access, and revocation calls
  (`packages/ghostbridge-native-client/src/index.js:121-998`).
- The default Client offers authentication mode `none`
  (`packages/ghostbridge-native-client/src/index.js:133-143`), while Platform
  production sessions offer only `signed_request` and `oauth`
  (`backend/src/services/platformNativeClient.service.js:1531-1541`).
- The Client requires explicit approved capability keys during governed
  installation, but this is SDK behavior rather than a wire-schema rule
  (`packages/ghostbridge-native-client/src/index.js:674-692`).
- The Client checks that requested organization/workspace overrides match its
  local Connection
  (`packages/ghostbridge-native-client/src/index.js:1541-1563`).

### Native Agent

- Production construction requires authorization, revocation, Receipt issuance,
  HTTP authentication, verifiable signatures, and durable authority stores
  (`packages/ghostbridge-native-agent/src/index.js:60-125`).
- The operator configures authorization, revocation, Receipt issuer, Passport,
  discovery, capability handlers, logger, and metrics through
  `createGhostBridgeAgent` and its configuration methods
  (`packages/ghostbridge-native-agent/src/index.js:130-303`).
- `authenticateProtocolHttpRequest` obtains a Host principal from transport
  authentication; request bodies are forbidden from supplying that principal,
  and scope is checked against the authenticated result
  (`packages/ghostbridge-native-agent/src/index.js:1190-1220,2527-2624`).
- Invocation requires an active Connection, current revocation, exact
  Connection scope, an authorization callback result, Agent/Passport binding,
  an enabled capability, capability version, and input contract
  (`packages/ghostbridge-native-agent/src/index.js:587-705`).
- Non-fixture authorization accepts a decision containing only
  `allowed:true`, `principalId`, `policyDecisionId`, canonical `evaluatedAt`,
  and `policyVersion`. It does not validate an action digest, Connection,
  organization/workspace, capability, expiry, or policy authority identifier
  (`packages/ghostbridge-native-agent/src/index.js:1283-1340,2627-2643`).
- The Agent creates an Approval Challenge and stores/validates an Approval
  Decision separately from the capability authorization callback
  (`packages/ghostbridge-native-agent/src/index.js:535-585,1342-1470`).
- Direct Agent coordination on the Native Agent Invocation surface is rejected
  as unavailable
  (`packages/ghostbridge-native-agent/src/index.js:725-729`).
- The Agent's public Connection projection carries scope, authentication state,
  status, enabled/disabled capabilities, and revocation reference
  (`packages/ghostbridge-native-agent/src/index.js:2088-2104`).

### Passport issuer and Trust implementation

- `IssuerToolkit.signPassport`, `createCapabilityManifest`,
  `signInstallResolution`, `signConnectionOffer`, and `signRevocationSet`
  create purpose-scoped signed issuer material
  (`packages/ghostbridge-issuer/src/index.js:245-328`).
- Scoped issuer signing requires exact issuer, audience, issuance, expiry, and
  message identifiers
  (`packages/ghostbridge-issuer/src/index.js:413-424`).
- `evaluateTrustPolicy` combines organization and optional workspace issuer
  policy and can return cryptographically valid but untrusted/review-required
  results
  (`packages/ghostbridge-trust/src/index.js:1066-1096`).
- `AntiRollbackStore` verifies monotonic document sequences but is in-memory
  unless a deployment supplies durable continuity
  (`packages/ghostbridge-trust/src/index.js:1304-1335`).
- `verifyReceipt` verifies Agent execution-key purpose, Passport binding,
  signature, output/evidence digests when supplied, Invocation scope, and
  Connection Trust context
  (`packages/ghostbridge-trust/src/index.js:1624-1675`).
- The Trust package exports verification, policy, cache, replay, and
  anti-rollback functions but does not itself establish a protocol role called
  Trust Node
  (`packages/ghostbridge-trust/src/index.js:1768-1827`).

### Platform policy and role combination

- `authenticatedScope` derives authoritative organization, workspace, user,
  subject, and authentication method from the Host principal and treats request
  identifiers only as confirmations
  (`backend/src/services/platformNativeClient.service.js:102-169`;
  `backend/src/tests/platformNativeClientAuthority.test.js:28-67`).
- Platform maps each Native Client operation to a Platform permission
  (`backend/src/services/platformNativeClient.service.js:28-38`).
- `productionAuthorizationProvider` invokes Platform RBAC/policy with trusted
  principal, scope, Passport, Connection, capability, environment, and exact
  action digest, then returns Platform-specific evidence
  (`backend/src/services/platformNativeClient.service.js:202-280`).
- `#authorizeOperation` requires authoritative Platform evidence, `ALLOW`
  decisions from RBAC and policy, exact permission/scope/action digest, and a
  safe policy decision reference
  (`backend/src/services/platformNativeClient.service.js:1012-1132`).
- Platform rechecks current Trust and revocation, enforces sealed bindings, and
  binds the policy decision reference into Invocation/Receipt verification
  (`backend/src/services/platformNativeClient.service.js:631-727,1249-1488`).
- Tests reject membership-only/missing/fixture policy evidence and mutations of
  Agent, capability, Connection, input digest, organization, or workspace;
  they also verify the policy reference reaches the Receipt
  (`backend/src/tests/platformNativeClient.test.js:651-781`).
- The underlying Platform authorization service combines tenant equality,
  role permissions, active policy evaluation, policy revision, and audit
  (`backend/src/services/authorization.service.js:90-130,292-429`).

### Current test evidence

- Production Native Agent tests reject boolean, `{allowed:true}`, and incomplete
  authorization results but accept the five-field verified shape
  (`packages/ghostbridge-native-agent/test/security15c1a.test.js:912-974`).
- The same tests fail closed on missing, stale, unknown, malformed, or revoked
  Connection revocation evidence
  (`packages/ghostbridge-native-agent/test/security15c1a.test.js:976-1015`).
- The basic Agent test confirms that current Invocation succeeds through an
  active scoped Connection and fails after revocation
  (`packages/ghostbridge-native-agent/test/agent.test.js:114-148`).

Tests demonstrate current implementation expectations only. They do not choose
the protocol authorization floor.

## Current contradictions and ambiguities

1. Participant prose uses “Host Client” and “Client” but does not distinguish
   Client implementation from Host Application or authenticated Host principal.
2. “Operator” is ambiguous between Agent operator, Platform/control-plane
   operator, and organization administrator.
3. “Trust Node” appears in Phase planning and conformance design but has no
   canonical draft definition, deployment boundary, or authority limits.
4. The Native Agent exposes public discovery/Passport/capability metadata,
   while Platform applies authentication and Platform authorization to its
   discovery product operation.
5. The Native Agent's production authorization decision is materially weaker
   than Platform's exact-action, scope, permission, and policy-revision
   evidence.
6. Workspace is optional in the Invocation schema and Agent scope checks when a
   Connection has no workspace; Platform requires a permitted workspace.
7. The Agent can issue Install Grants and create Connections, while the draft
   does not identify whose administrative authority permits issuance.
8. A Passport Issuer signs identity and installation material, but the boundary
   between signing validity, Host Trust policy, and Invocation authorization is
   not explicit.
9. Trust policy evaluation can decide an issuer is trusted, but that result
   does not say the Host principal may invoke any capability.
10. Approval is a separate exact-action object, but no normative rule explains
    how an authorization decision requires it and how the Agent enforces both
    without transferring authority to the Agent or Approver.
11. The Invocation schema omits `connectionId` while the HTTP wrapper and
    runtime authorization use it.
12. Platform combines Host, Client, Trust verification, authorization policy,
    organization/workspace authority, and binding services in one adapter.
    That topology can be mistaken for a required protocol role or policy model.
13. Audit events exist in Agent and Platform implementations, but no role owns
    protocol audit ordering/durability or distinguishes protocol-required from
    deployment-only events.
14. Direct coordination examples exist as experimental fixtures, while the
    active Native Agent path rejects direct Agent coordination. The prohibited
    authority flow must be explicit.

## Security properties that must be preserved

- Authentication establishes a principal or peer identity; it does not by
  itself authorize a governed action.
- A scoped active Connection is necessary for governed authority, but its
  existence does not authorize capabilities, actions, or scopes outside its
  immutable bounds.
- Trust verification establishes cryptographic/issuer/revocation conclusions;
  it is not capability authorization.
- A Passport is identity and declaration evidence, not Invocation authority.
- An Approval is exact-action human consent and never directly transfers
  authority to an Agent.
- For every Agent-executed governed operation, the Agent is the mandatory final
  authorization-floor enforcement point; Client and Host checks are defense in
  depth, and an untrusted or opaque decision reference is never sufficient.
- An authorization decision is non-transferable, cannot expand its active
  Connection, and is usable only when all required identity, tenant, Agent/
  Passport, capability/version, operation, exact-action, policy, and validity
  bindings match.
- Organization and workspace scope are derived from trusted authority data and
  compared exactly; request-supplied scope is a confirmation, never the source
  of authority.
- Missing, malformed, stale, timed-out, wrong-action, wrong-scope, or denied
  authorization evidence fails closed before Task creation, Approval
  consumption, or side effects.
- No participant may create ambient or direct Agent-to-Agent authority.
- Passport signing, Agent execution signing, authorization decisions,
  Approvals, and Connection issuance remain distinct key/authority purposes;
  H-10 defines separate canonical cryptographic domains/purposes for
  authorization action binding and Approval action binding.
- Platform may enforce stricter policy but may not weaken the protocol floor or
  turn Platform-only fields into mandatory protocol semantics by accident.
- Protected credentials, grants, Approval tokens, private keys, raw policy, and
  sensitive payloads are minimized and excluded from unsafe audit output.

## Compatibility properties that must be preserved

- Independent deployments can implement the protocol without Platform RBAC,
  database models, permission registry, policy DSL, sealed-token format, or
  error translation.
- A simple deployment can satisfy the authorization floor using a small,
  deterministic policy authority rather than a complete enterprise engine.
- A managed Platform deployment can add stricter identity, RBAC, ABAC,
  residency, risk, approval, and audit policy without changing protocol object
  meaning.
- Logical roles remain distinguishable even when co-located.
- A policy authority's private rule representation is not exposed on the wire;
  cross-implementation evidence uses stable, deployment-neutral fields.
- Authorization policy revision and decision freshness have interoperable
  meanings without prescribing one storage engine.
- Receipts can bind safe decision evidence without disclosing Platform policy
  internals.
- Historical objects remain governed by their original protocol version and
  recorded decision evidence.

## Viable role and trust-boundary models

These are deployment topologies, not authorization-floor options.

### Role model R1 — Embedded Host enforcement

The Host Application, Client implementation, Trust verifier, and authorization
policy authority run in one Host trust boundary. The Agent remains separate.
Organization/workspace administrators configure the embedded policy.

**Benefits:** small deployment, low latency, no remote policy dependency.

**Risks:** one compromise crosses several logical roles; policy and Trust
results can be confused; durable audit and anti-rollback are easy to omit.

**Viability condition:** interfaces and evidence remain logically distinct, and
the Agent independently validates protocol-floor evidence rather than trusting
an undocumented in-process boolean.

### Role model R2 — Separated logical services

The Host Application uses a Client; authentication, authorization policy,
Trust verification, Approval, and organization/workspace administration are
separate logical services. The Agent enforces Connection and action bindings.

**Benefits:** clearest least-privilege boundaries, independent audit, replaceable
policy/Trust implementations, and precise conformance roles.

**Risks:** more availability dependencies, authenticated service-to-service
channels, freshness/timeout decisions, and distributed audit ordering.

**Viability condition:** timeout and unavailable results fail closed, decisions
are exact-action/freshness bound, and services cannot mint Connection or
Approval authority outside their roles.

### Role model R3 — Managed Platform aggregation

Platform implements several Host-side logical roles behind one product
boundary, while external Agents and Passport issuers remain independent.

**Benefits:** centralized tenant identity, policy, Trust continuity, secrets,
audit, and operations.

**Risks:** Platform-specific permissions, evidence versions, sealed bindings,
and status mappings can become a de facto protocol; reviewers may mistake
co-location for authority equivalence.

**Viability condition:** Platform documents its stricter deltas, maintains
logical role separation, and passes the same protocol-floor conformance cases
as a non-Platform deployment.

### Accepted logical role model

**ACCEPTED DECISION:** standardize the logical separation of R2 while allowing
R1 and R3 as deployment topologies. Conformance judges observable
responsibilities, not process count. Co-located components do not inherit each
other's authority.

## Accepted logical trust-boundary model

This diagram describes the accepted R2 logical role model. It does not decide
the downstream wire, schema, lifecycle, or deployment details deferred to other
records.

```text
 Organization authority --------> organization policy / issuer bounds
             |                                  |
 Workspace authority -----------> workspace policy / membership
                                                |
 Authenticated Host principal -> Host Application -> Client implementation
                                                |             |
                                                |             +--> Trust verification service
                                                |                        ^
                                                |                        |
                                                |              signed material
                                                |                        |
                                                |                 Passport issuer
                                                |
                                                +--> authorization policy authority
                                                |        |
                                                |        +--> structured ALLOW / DENY evidence
                                                |
                                                +--> exact-action Approval workflow <--- Approver
                                                |
                                                v
                                 authenticated request + active Connection
                                                |
                                                v
                                              Agent <--- Agent operator configuration
                                                |
                                                +--> durable Task
                                                +--> signed Receipt

 Prohibited: Agent authentication, Passport, Trust result, or Approval
             becoming direct Agent authority.
 Prohibited: Agent ----------------------------------------------> Agent authority.
```

## Accepted logical participant responsibility allocation

This section records the accepted logical allocation. “Trusted input” means
input already authenticated, verified, or loaded from an authority the role is
configured to trust; it does not mean that all data from that participant is
inherently safe.

### Client implementation

- **Trusted inputs:** Host configuration; authenticated Host principal context
  supplied through a defined interface; accepted organization/workspace
  constraints; durable Connection records; verified Trust and policy evidence.
- **Untrusted inputs:** discovery, Agent responses, Passports before
  verification, capability metadata, errors, redirects, Tasks, Receipts before
  verification, user payloads, and request-supplied scope.
- **Authority it may issue:** protocol requests and locally generated
  correlation/idempotency identifiers. An Invocation is an exercise request
  within existing authority, not newly issued authority.
- **Authority it may verify:** Agent/issuer proofs through the Trust interface;
  Connection response bindings; authorization decision bindings; Approval
  references; Task/Receipt bindings.
- **Authority it may enforce:** Host-side preflight, selected Connection,
  tenant scope, capability/version, data contract, deadline, Trust, and safe
  retry constraints. These checks are defense in depth and never replace the
  Agent's final enforcement for an Agent-executed governed operation.
- **Authority it must never possess:** issuer signing authority, Approver
  identity, unrestricted policy-authority credentials, ambient Agent authority,
  or direct Agent-to-Agent authority.
- **Durable state responsibilities:** active Connection references and selected
  bindings when the Host relies on restart; idempotency/outcome correlation;
  production anti-rollback/revocation continuity through a durable service.
- **Cryptographic responsibilities:** verify or delegate verification of signed
  installation and Receipt material; protect authentication references; never
  invent verification success.
- **Audit responsibilities:** record safe request/decision/Connection
  correlation and rejection categories without protected material.
- **Failure behavior:** fail closed on absent/ambiguous Connection, scope,
  Trust, policy, proof, version, or capability; do not convert transport
  uncertainty into success.

### Host Application

- **Trusted inputs:** its authenticated session/principal service,
  organization/workspace configuration, accepted Connection records, and
  reviewed policy/Trust services.
- **Untrusted inputs:** user-entered Agent targets, opaque grants, Agent display
  data, payloads, UI parameters, callback results, and product integrations.
- **Authority it may issue:** user intent, installation consent, approved
  capability selection, Invocation requests, cancellation requests, and
  revocation/closure requests within the principal's authority.
- **Authority it may verify:** principal session, user consent context, safe
  presentation of preview/Approval data, and Client results.
- **Authority it may enforce:** product access, consent UI, data minimization,
  deployment policy, and which Client operations are exposed. These Host checks
  are defense in depth and never replace the Agent's protocol-floor
  enforcement.
- **Authority it must never possess:** the ability to manufacture Passports,
  Trust results, policy ALLOW evidence, Approver Decisions, Connections, or
  Receipts without the responsible role.
- **Durable state responsibilities:** installation/user-consent records,
  Connection ownership references, principal-to-scope binding, and product
  audit as deployment policy requires.
- **Cryptographic responsibilities:** protect session and binding material; use
  reviewed Client/Trust interfaces rather than UI-side verification.
- **Audit responsibilities:** who requested installation/action, what safe
  preview was shown, consent result, scope, and correlation references.
- **Failure behavior:** deny ambiguous principal/scope/consent, do not retry
  high-impact actions across ambiguous outcomes without idempotency evidence.

### Authenticated Host principal

- **Trusted inputs:** identity attributes and permitted organization/workspace
  membership established by the configured authentication authority.
- **Untrusted inputs:** self-asserted organization/workspace/user IDs, roles,
  permissions, approval status, and Agent-provided identity claims.
- **Authority it may issue:** requests within assigned scope and, if separately
  eligible, a human Approval Decision in the Approver role.
- **Authority it may verify:** the action/preview presented for consent and its
  own authenticated session context.
- **Authority it may enforce:** no protocol execution enforcement merely by
  existing; it may refuse consent or cancel/revoke where authorized.
- **Authority it must never possess:** scope derived only from request fields,
  automatic Approver authority, policy-authority identity, issuer keys, or
  Connection authority outside installed scope.
- **Durable state responsibilities:** none mandated for the person/service
  identity itself; its authentication authority maintains identity lifecycle.
- **Cryptographic responsibilities:** protect credentials and complete required
  authentication/Approval proof; never send credentials in protocol bodies.
- **Audit responsibilities:** accountable subject reference and authentication
  method, with privacy-safe handling.
- **Failure behavior:** expired, revoked, unverified, or scope-ineligible
  identity yields authentication/authorization denial.

### Agent

- **Trusted inputs:** configured Passport/capabilities; durable grant,
  Connection, Task, Approval, replay, revocation, and Receipt stores;
  authenticated Host principal; verified policy and Trust evidence.
- **Untrusted inputs:** all network messages, request bodies, grants before
  lookup, principal fields in bodies, payloads, Approval references, policy
  references, and Client-provided scope.
- **Authority it may issue:** bounded Install Grants when configured by the
  approved issuing authority; an active Connection only upon valid redemption;
  Tasks; protocol challenges; and signed Receipts using a purpose-authorized
  Agent execution key. H-06 must confirm grant-issuance authority.
- **Authority it may verify:** transport/request authentication, active
  Connection, exact scope/capability/version, policy decision, Approval,
  request integrity, Trust/revocation, idempotency, and data contracts.
- **Authority it may enforce:** Connection bounds, protocol authorization
  floor, exact-action Approval, operation ordering, Task transitions,
  revocation, and pre-execution failure. For every Agent-executed governed
  operation, the Agent is the mandatory final enforcement point for the
  protocol authorization floor before Task creation or any external side
  effect. Client and Host checks are defense in depth, not substitutes.
- **Authority it must never possess:** ambient Host principal authority,
  unilateral organization/workspace expansion, Approver identity, Passport
  issuer root authority, or direct authority to invoke another Agent.
- **Durable state responsibilities:** grants, Connections, Tasks/context,
  Approvals/consumption, idempotency/replay, Receipts, revocation, and atomic
  transition outcomes for production profiles.
- **Cryptographic responsibilities:** verify required request/decision/Approval/
  Trust proofs; use purpose-scoped execution keys for Receipts; protect key
  references and never accept wrong-purpose keys.
- **Audit responsibilities:** authentication/authorization outcome, grant and
  Connection transition, Invocation acceptance/rejection, Approval
  consumption, Task transition, Receipt issuance, and revocation, ordered
  relative to durable commits.
- **Failure behavior:** fail closed before side effects on unavailable,
  malformed, stale, mismatched, denied, or timed-out authority evidence.

### Agent operator

- **Trusted inputs:** approved Agent deployment configuration, capability
  implementation, key providers, issuer relationship, durable stores, Host
  audience, and operational policy.
- **Untrusted inputs:** remote requests, unreviewed capability code/config,
  environment overrides, logs, plugin/provider output, and user-supplied keys.
- **Authority it may issue:** administrative configuration and operational
  enable/disable actions within the Agent deployment; grant issuance policy
  only if organization/issuer governance delegates it.
- **Authority it may verify:** deployment health, key-purpose configuration,
  store durability, policy/Trust service identity, and audit integrity.
- **Authority it may enforce:** capability availability, deployment limits,
  incident suspension, and operational shutdown, without expanding existing
  Connection scope.
- **Authority it must never possess:** automatic Host principal, Approver,
  organization owner, Passport issuer, or cross-tenant authority merely by
  operating the Agent.
- **Durable state responsibilities:** secure configuration, key references,
  backups/recovery, audit retention, incident state, and service continuity.
- **Cryptographic responsibilities:** protect Agent execution keys or connect a
  non-exporting signer; keep issuer keys separate unless the same organization
  explicitly assigns that separate role.
- **Audit responsibilities:** configuration/key/capability changes, deployment
  identity, incidents, and recovery actions.
- **Failure behavior:** unsafe or incomplete production configuration prevents
  startup or governed operation; operator override cannot fabricate protocol
  evidence.

### Approver

- **Trusted inputs:** an authenticated approver identity, verified safe action
  summary, exact action digest, scope, limits, requester, policy requirement,
  and expiry.
- **Untrusted inputs:** free-form requester/Agent summaries, mutable UI fields,
  hidden payloads, stale challenges, and self-asserted eligibility.
- **Authority it may issue:** one exact Approval Decision within its eligible
  role, scope, limits, and validity.
- **Authority it may verify:** challenge/action presentation, requester/scope,
  policy reference, own eligibility, and decision preview.
- **Authority it may enforce:** consent or refusal only. The Approver does not
  execute or activate Connection authority.
- **Authority it must never possess:** ability to widen Connection/capability/
  tenant bounds, bypass authentication/policy, approve a different action, or
  directly command an Agent.
- **Durable state responsibilities:** append-only decision, actor, time, reason,
  exact digest, expiry, and consumption/audit references.
- **Cryptographic responsibilities:** authenticate strongly; sign or prove the
  Decision when the accepted profile requires it; protect credentials.
- **Audit responsibilities:** eligibility evaluation, presentation digest,
  decision, reason code, and consumption outcome, without sensitive payloads.
- **Failure behavior:** absent, stale, conflicted, ineligible, self-approved
  where forbidden, malformed, or replayed Decision does not satisfy the
  Approval condition.

### Authorization policy authority

- **Trusted inputs:** authenticated principal evidence; authoritative
  organization/workspace membership; active Connection projection; verified
  capability/action attributes; current policy revision; trusted time.
- **Untrusted inputs:** raw request assertions, Agent-supplied role/scope,
  mutable labels, policy references from the request, and unbounded payloads.
- **Authority it may issue:** bounded `ALLOW` or `DENY` evidence for one exact
  action, principal, Connection, scope, policy revision, and validity window.
- **Authority it may verify:** caller/service authentication, trusted attribute
  provenance, policy version, and action digest.
- **Authority it may enforce:** policy evaluation. The execution boundary must
  independently enforce the returned binding and decision.
- **Authority it must never possess:** Connection creation, Passport/Trust
  issuance, Approval identity, Receipt signing, or permission to widen grant/
  Connection bounds.
- **Durable state responsibilities:** versioned policy, revision history,
  decision/audit evidence as required, revocation, and availability state.
- **Cryptographic responsibilities:** authenticate or sign decision evidence;
  protect policy service credentials/keys; use a distinct proof purpose.
- **Audit responsibilities:** safe action reference/digest, decision, policy
  revision, authority ID, subject/scope, timing, and reason category.
- **Failure behavior:** default deny; timeout/unavailable/malformed/stale inputs
  produce no `ALLOW`.

### Passport issuer

- **Trusted inputs:** approved Agent/provider identity, authorized signing keys,
  capability manifests, issuer policy, key/revocation state, and trusted time.
- **Untrusted inputs:** provider-supplied declarations before review, arbitrary
  URLs, Host requests, Agent runtime claims, and unverified execution output.
- **Authority it may issue:** signed Passport identity/declarations,
  capability manifests, installation/Connection-offer proofs where assigned,
  issuer metadata, key material, and authoritative revocation documents.
- **Authority it may verify:** provider registration/evidence, signing-key
  purpose/state, object issuer/audience/time, and publication integrity.
- **Authority it may enforce:** issuer publication, key lifecycle, Passport
  status, and revocation. It does not enforce Host Invocation.
- **Authority it must never possess:** Host principal authority, per-action
  policy `ALLOW`, exact-action Approval, or direct Invocation/Connection use.
- **Durable state responsibilities:** issuer identity, Passport versions, key
  lifecycle/history, revocation sequence/chain, signed-object audit, and
  compromise recovery.
- **Cryptographic responsibilities:** purpose-separated signing, protected key
  custody, rotation/revocation, and safe public-key publication.
- **Audit responsibilities:** issuance, signing purpose/key ID, version/status,
  rotation, revocation, and recovery.
- **Failure behavior:** invalid/wrong-purpose/unavailable key or incomplete
  audience/time/binding prevents issuance; compromise triggers revocation and
  recovery, not silent replacement.

### Trust Node or Trust verification service

- **Trusted inputs:** configured Trust roots/pins and organization/workspace
  Trust policy, accepted algorithms/profiles, durable anti-rollback checkpoint,
  trusted time, and bounded transport.
- **Untrusted inputs:** discovery, issuer metadata/JWKS/revocation documents,
  Passports, signed messages, key identifiers, endpoints, and peer-supplied
  verification hints.
- **Authority it may issue:** a bounded verification result/evidence statement.
  This is evidence for an enforcer, not Connection or Invocation authority.
- **Authority it may verify:** issuer origin/root, signatures, key purpose/
  lifecycle, audience/time/scope, revocation freshness/sequence, rollback,
  request and Receipt bindings.
- **Authority it may enforce:** Trust acceptance only when the Host/Agent
  explicitly delegates that enforcement; it does not evaluate capability
  authorization.
- **Authority it must never possess:** policy `ALLOW` for an Invocation,
  Connection creation, Approval, Passport issuer signing, or direct Agent
  authority.
- **Durable state responsibilities:** approved roots/issuers, key history,
  highest accepted metadata/revocation sequences and digests, cache evidence,
  and review decisions for production profiles.
- **Cryptographic responsibilities:** strict verification and canonicalization,
  safe key selection, algorithm/purpose enforcement, and no signature
  fabrication.
- **Audit responsibilities:** verification category/reason, issuer/key,
  freshness/rollback, policy version, and safe evidence references.
- **Failure behavior:** invalid proof is rejection; unavailable/stale/rollback
  state is indeterminate or fail-closed according to the accepted profile,
  never authorization success.

Human approval selects the topology-neutral “Trust verification service” as the
canonical logical role term while allowing “Trust Node” to remain a deployment
or product term. Co-location never merges authorization, Trust, Approval,
issuer, or Connection authority.

### Organization authority

- **Trusted inputs:** organization identity/governance, authenticated
  administrators, membership sources, approved workspaces, issuer/Trust policy,
  and authorization-policy registrations.
- **Untrusted inputs:** self-asserted membership, Agent/provider claims,
  workspace attempts to expand organization bounds, and remote policy
  references.
- **Authority it may issue:** organization membership/roles, workspace
  delegation bounds, approved issuer/Trust roots, policy-authority delegation,
  and installation policy within the organization.
- **Authority it may verify:** administrator identity, workspace parentage,
  policy revision, issuer approval, and delegated authority.
- **Authority it may enforce:** top-level tenant isolation, policy ceilings,
  issuer allow/block, and delegation/revocation of workspace authority.
- **Authority it must never possess:** Passport issuer keys by default,
  Approver identity by default, Agent execution key, or authority in another
  organization.
- **Durable state responsibilities:** membership, delegation, policy versions,
  Trust decisions, administration audit, and revocations.
- **Cryptographic responsibilities:** protect administrative credentials and
  sign/version governance records where the deployment requires it.
- **Audit responsibilities:** membership/policy/issuer/workspace changes,
  administrator identity, effective time, and accepted risk.
- **Failure behavior:** missing or ambiguous organization parentage/scope denies
  governed operation; workspace policy cannot supply the missing authority.

### Workspace authority

- **Trusted inputs:** parent organization delegation, workspace identity,
  authenticated administrators/members, and current organization policy
  version.
- **Untrusted inputs:** cross-workspace IDs, request-supplied parent
  organization, Agent claims, and policy that exceeds the organization ceiling.
- **Authority it may issue:** workspace membership/roles and stricter local
  Trust/authorization/Approval policy within delegated bounds.
- **Authority it may verify:** parent organization binding, member/administrator
  identity, policy base version, and Connection workspace equality.
- **Authority it may enforce:** workspace isolation and stricter local controls.
- **Authority it must never possess:** ability to weaken organization policy,
  authorize another workspace, expand a Connection, issue Passport/Connection/
  Approval authority outside delegated roles, or create direct Agent authority.
- **Durable state responsibilities:** workspace membership, local policy
  versions, parent-version reference, approvals/delegations, and audit.
- **Cryptographic responsibilities:** protect administration credentials and
  policy integrity where required.
- **Audit responsibilities:** local membership/policy/issuer/Approval changes
  and parent-organization reference.
- **Failure behavior:** unknown/mismatched parent, stale base policy, or absent
  membership fails closed.

## Minimum protocol authorization-floor options

### Option A — Authenticated Connection authority only

The protocol requires an authenticated Host principal and an active scoped
Connection. It enforces Connection scope/capabilities but leaves all additional
capability/action policy to deployments. No interoperable authorization
decision object is required.

#### Benefits

- Smallest protocol and simplest non-Platform implementation.
- No policy service, revision, freshness, or decision schema on the wire.
- Maximum deployment freedom.

#### Risks

- Different Agents can interpret the same Connection very differently.
- A non-Platform deployment can accept any action within enabled capabilities
  even when a Platform deployment correctly denies it.
- No interoperable proof binds a policy decision to principal, scope,
  Connection, or exact action.
- Receipts cannot reliably state which policy decision authorized execution.

#### Failure scenarios

- Stolen authenticated credentials use an active Connection for a high-impact
  action with no per-action policy check.
- An Agent accepts a capability action that the Host assumed the Agent would
  authorize.
- Policy changes between requests but the Agent cannot detect stale authority.
- Cross-language implementations disagree whether Connection capability
  enablement is sufficient authorization.

### Option B — Minimum structured authorization decision

The protocol defines a small deployment-neutral `ALLOW`/`DENY` decision bound
to authenticated principal, active Connection, operation, exact tenant scope,
capability/action, policy authority/revision, evaluation time, validity, and a
safe decision reference. Deployments may evaluate any policy model and attach
additional private evidence, but the execution boundary enforces the common
fields. The decision is non-transferable and cannot create or expand authority
outside its bound active Connection.

#### Benefits

- Creates one interoperable security floor without standardizing Platform RBAC
  or policy DSL.
- Makes action/scope substitution, stale decisions, and ambiguous policy
  failures testable.
- Is implementable by a simple allowlist or a full enterprise engine.
- Gives Receipts a safe decision reference/digest.

#### Risks

- Requires canonical action binding, schema, policy-authority authentication,
  freshness, timeouts, and error rules.
- A weak action definition can give false confidence.
- Remote policy availability can block execution.
- Platform fields may leak into the minimum if the schema is copied rather than
  designed independently.

#### Failure scenarios

- An `ALLOW` for one capability or payload digest is replayed for another.
- The decision matches Connection but not organization/workspace or principal.
- The policy revision is retired or the decision has expired before Task
  acceptance.
- The policy service times out and an implementation falls back to Connection
  alone.
- A Host reports that policy succeeded, but the Agent receives only an opaque
  or unverified decision reference and proceeds.
- A decision bound to one principal, Connection, organization/workspace,
  Agent/Passport, capability/version, operation, action digest, policy
  authority/revision, or validity boundary is reused after any of those values
  changes.
- An `ALLOW` is treated as expanding a narrower active Connection scope or
  capability bound.
- Authorization action evidence is accepted as an Approval, or Approval action
  evidence is accepted as authorization.
- A Receipt references a decision that was never bound to its Invocation.

### Option C — Complete protocol policy-decision model

The protocol standardizes policy registry, permissions, roles, attributes,
matching, precedence, revisions, explanations, Approval triggers, and decision
evidence.

#### Benefits

- Highest potential consistency across deployments.
- Detailed cross-implementation policy conformance and audit.
- Common policy administration tooling may become possible.

#### Risks

- Large scope and high implementation burden outside Platform.
- Freezes one policy paradigm into protocol law.
- Likely imports Platform-specific role, registry, tenant, or deployment
  semantics.
- Policy-language evolution becomes wire compatibility.
- Implementations may falsely claim conformance while evaluating attributes
  differently.

#### Failure scenarios

- A non-Platform Agent cannot implement Platform registry semantics and becomes
  incompatible despite enforcing a safe local policy.
- A protocol version change is required for ordinary deployment policy
  evolution.
- Platform internal attributes or reason codes leak sensitive policy structure.
- Two engines implement precedence or unknown-attribute behavior differently.

## Authorization-floor option analysis

| Concern | Option A | Option B | Option C |
| --- | --- | --- | --- |
| Interoperability | Connection checks interoperate, but per-action policy behavior does not. | Common decision/evidence and enforcement semantics interoperate; policy internals remain private. | Potentially broad interoperability if every engine exactly implements the same policy model. |
| Security | Strong only if every deployment independently supplies correct policy; weakest shared floor. | Strong action/scope/freshness floor with deployment-specific strengthening. | Potentially strongest uniform semantics, offset by complexity and implementation differentials. |
| Implementability outside Platform | Easiest. | Practical: static allowlist, local callback, or remote service can produce the same minimal decision. | Hardest and likely impractical for small or non-enterprise deployments. |
| Exact-action binding | Not required beyond Connection/capability; Approval remains separate. | Required for authorization decision; exact Approval remains a separate additional condition. | Required and integrated into the complete policy model. |
| Organization/workspace isolation | Enforced only through principal and Connection equality; policy details vary. | Exact scope is a mandatory decision binding in addition to principal/Connection equality. | Scope rules and hierarchy are fully standardized. |
| Policy revision | Deployment-private and not interoperable. | Opaque authority ID plus policy revision/version is mandatory; policy contents remain private. | Full registry and policy version semantics are normative. |
| Decision freshness | No protocol decision freshness. Authentication/Connection freshness only. | `evaluatedAt` plus expiry/validity and current authority/revision validation; no silent cache beyond bounds. | Complete cache/invalidation/freshness rules are normative. |
| Failure and timeout | Deployment-specific; dangerous fallbacks are possible. | Missing/deny/malformed/stale/timeout fail closed before Task/side effect; retry classification is specified. | Same, plus detailed engine failure semantics. |
| Receipt binding | Optional deployment reference, not comparable. | Safe decision reference and action digest/revision binding are required for applicable governed Receipts. | Full policy decision/evidence may be bound, increasing disclosure/size risk. |
| Platform-law risk | Low direct coupling, but Platform and standalone behavior diverge. | Controlled if fields are deployment-neutral and Platform extras are explicitly non-normative. | High; likely codifies Platform permission/role/policy concepts. |

## Accepted protocol distinctions

The following distinctions are accepted decision constraints for later
normative work; they are not themselves a complete normative specification:

1. **Protocol authentication** proves the calling Host principal or peer under
   the selected authentication profile and binds that proof to the request. It
   answers “who presented this request?” It grants no Connection or action
   authority.
2. **Connection authority** is the durable installed relationship created by
   valid grant redemption. It bounds Agent/Passport, selected protocol,
   organization/workspace, Host/audience, authentication profile, and enabled
   capabilities. It answers “within what installed boundary may requests be
   considered?” It is necessary but not always sufficient.
3. **Protocol authorization floor** is a current structured `ALLOW` or `DENY`
   for one authenticated principal and exact operation/action inside one active
   Connection and tenant scope. It answers “may this action proceed now under
   the configured policy authority?”
4. **Deployment-specific policy** is how an implementation reaches that
   decision: for example roles, permission registry, risk, residency, rate,
   cost, enterprise policy, or Platform sealed bindings. It may be stricter and
   richer but cannot weaken the protocol floor or redefine wire semantics.
5. **Exact-action Approval** is a human Decision satisfying an additional
   policy condition for one action/digest/scope/limit/expiry. It does not replace
   authentication, Connection authority, authorization, or Trust, and does not
   transfer authority directly to the Agent.

The independent-review non-transferability qualification is that an
authorization decision cannot expand its active Connection and must be bound
to all of the following:

- authenticated principal;
- Connection;
- organization;
- workspace, with explicit absence semantics;
- Agent;
- Passport;
- capability and version;
- operation;
- exact authorization action digest;
- policy authority and revision;
- evaluation time and validity boundary.

Effective authority is only the intersection of authenticated identity, active
Connection bounds, tenant scope, current Trust and revocation validity, an
authorization `ALLOW`, and exact-action Approval when Approval is required.
No individual input expands another input's bounds.

H-10 must define separate canonical cryptographic domains and purposes for
authorization action binding and Approval action binding. An authorization
decision must not be substitutable for an Approval, and an Approval must not be
substitutable for authorization. This record intentionally does not select the
final domain labels.

## Accepted decision

**ACCEPTED DECISION:** **Option B**, combined with logical role separation as
described by role model R2 while permitting R1 and R3 deployment topologies
that preserve the same logical authority separation and observable
protocol-floor behavior.

The accepted minimum structured decision includes stable equivalents of:

- decision and decision/reference IDs;
- `ALLOW` or `DENY`;
- authorization policy authority identifier;
- authenticated principal/subject reference and bound authentication context;
- active Connection ID;
- organization and workspace scope, with explicit absence semantics approved
  under H-07;
- Agent and Passport identity;
- capability and version;
- operation;
- exact authorization-action digest, produced by the H-10 profile;
- policy revision/version;
- `evaluatedAt` and an expiry or maximum-validity boundary;
- optional safe reason category and retry classification;
- evidence/proof sufficient to authenticate the issuing policy authority.

The common decision must not require Platform permission IDs, role keys, RBAC/
ABAC internals, matched policy lists, Mongo identifiers, binding-token format,
or Platform evidence-version strings.

For every Agent-executed governed operation, the Agent is the mandatory final
enforcement point for this protocol floor before Task creation or any external
side effect. Client and Host checks are defense in depth and cannot replace
Agent enforcement. The Agent may obtain the authorization decision directly,
or may accept a Host-obtained decision only when the issuing authorization
authority and every required decision binding are independently authenticatable
by the Agent. An opaque or unverified policy decision reference is
insufficient.

The structured decision is non-transferable. It must not widen its active
Connection, and the effective authority remains the intersection of
authentication, active Connection bounds, tenant scope, Trust/revocation
validity, authorization `ALLOW`, and exact-action Approval where required.

The accepted authorization-floor enforcement sequence is:

1. authenticate the request and derive the Host principal from trusted
   transport/profile evidence, never from the body;
2. load and validate the active Connection and exact tenant/Host/capability/
   version bounds;
3. verify required Trust and revocation state;
4. construct the bounded exact authorization action;
5. obtain a structured decision directly or receive a Host-obtained decision
   within a bounded deadline;
6. independently authenticate the issuing authorization authority and verify
   `ALLOW`, exact action digest, authenticated principal and context,
   Connection, organization, workspace absence/value semantics, Agent,
   Passport, capability, version, operation, policy revision, evaluation time,
   and validity boundary;
7. when policy requires Approval, separately verify and atomically consume the
   exact-action Approval under H-08 using the distinct H-10 cryptographic
   domain/purpose;
8. only then accept/create a Task or begin external side effects.

H-12 must decide precise multi-fault error precedence. Acceptance of the
security ordering above does not approve a status/error contract.

## Reasons supporting the accepted decision

1. Option A leaves the critical gap identified by `GB-008`: official Agent and
   Platform paths accept materially different authorization evidence.
2. Option B makes the minimum security properties interoperable without
   requiring Platform.
3. A small independent implementation can produce the decision from a local
   static policy, while Platform can continue using RBAC and active policy
   evaluation.
4. Exact action/scope/Connection/freshness binding blocks substitution and stale
   policy reuse that a bare boolean cannot.
5. A safe decision reference enables Receipt and audit traceability without
   disclosing private policy.
6. Logical role separation prevents Trust, Approval, authentication, or issuer
   signatures from being mistaken for authorization.
7. Option C would turn deployment-policy evolution into protocol evolution and
   risks copying Platform internals into protocol law.

## Rejected or discouraged approaches

Regardless of the accepted option, the following conclusions are rejected or
strongly discouraged:

- Agent authentication alone creates governed authority.
- A valid Passport alone authorizes installation or Invocation.
- Trust verification is authorization.
- An Approval directly transfers authority to an Agent.
- An active Connection permits any action the Agent can technically execute.
- Request body fields are authoritative principal or tenant scope.
- Platform permission, role, evidence-version, sealed-binding, or error
  semantics automatically define the protocol.
- A callback returning `true` or `{allowed:true}` is sufficient production
  evidence.
- The authorization policy authority may widen Connection, grant, capability,
  organization, or workspace bounds.
- The Trust verification service may issue capability `ALLOW` decisions merely
  because an issuer is trusted.
- The Passport issuer may authorize a Host principal's action merely because it
  signed the Agent's identity.
- The Approver may bypass authentication, policy, Trust, or Connection checks.
- Direct Agent-to-Agent authority is permitted.
- Co-locating roles in Platform or one process merges their authority.
- Copying `platform-native-authorization.v1` as the protocol schema.

## Migration and historical-object impact

### Option A

- The current Native Agent is closest to this option after its existing
  five-field decision check, but deployments remain behaviorally divergent.
- Platform can retain richer evidence privately.
- Existing Receipts without policy evidence need no new interpretation, but no
  cross-deployment authorization claim can be made.

### Option B

- The Native Agent authorization callback/result must gain action, Connection,
  scope, policy-authority, revision, freshness, and proof bindings; the current
  five-field result is insufficient.
- Platform already evaluates most richer fields, but its evidence must be
  projected into a new deployment-neutral protocol DTO. Platform-private
  details remain outside the DTO.
- The Invocation/final Connection/Receipt contracts require explicit,
  versioned bindings. Existing objects must not be backfilled with invented
  decisions.
- Existing active Connections may remain on their historical protocol version
  with restricted claims or require explicit reauthorization/replacement.
- Existing durable Tasks continue under their original accepted authorization
  evidence. Resuming a nonterminal Task after policy revision needs an H-07/
  H-09 rule.
- Historical Receipts without the new decision reference remain historical
  evidence under the old version; they cannot claim Option B authorization
  conformance.

### Option C

- Every deployment must replace or wrap its policy engine with the complete
  normative model.
- Platform internal schemas may still not match the chosen protocol model,
  creating a large two-way migration.
- Small/non-Platform implementations face the largest compatibility break.
- Historical policy evaluations and Receipts require long-lived model/version
  interpretation.

For every option, migration cannot reinterpret authentication, Trust,
Connection, Approval, Task, or Receipt history under a new authority model.

## Required schema consequences

Because Option B is accepted, a separately authorized Phase 15D.2 will need:

- a canonical authenticated-principal reference/binding schema;
- a reusable organization/workspace scope schema with explicit absent/null/
  empty semantics;
- a final Connection schema containing selected authority bounds;
- an authorization-action schema or registered per-operation action variants;
- an authorization decision/evidence schema with authority, decision,
  principal, Connection, scope, action digest, policy revision, time/expiry,
  safe reason, and proof fields;
- separate H-10 canonical digest/proof-purpose identifiers for authorization
  action binding and Approval action binding, without choosing their final
  domain labels in this record;
- an Invocation schema that directly or unambiguously binds `connectionId` and
  authorization evidence rather than relying on an undocumented HTTP wrapper;
- Approval schemas that reference but do not replace authorization evidence;
- Task/Receipt schemas that preserve the applicable Connection, authorization
  decision reference/action digest, and policy revision without exposing policy
  internals;
- a Trust result schema that continues to distinguish cryptographic validity,
  Trust acceptance, and authorization.

Option A does not require an authorization-decision schema but still requires
principal, Connection, scope, and Approval bindings. Option C additionally
requires full policy/registry/role/attribute schemas.

All new schemas must cite accepted decision and requirement IDs and must not be
derived by copying Platform storage models.

## Required state-machine consequences

The authorization portion of each governed operation needs observable states or
guards equivalent to:

```text
request received
    -> authenticated
    -> active Connection and scope validated
    -> Trust/revocation valid
    -> authorization ALLOW valid and fresh
    -> Approval satisfied when required
    -> operation accepted / Task created
```

Required invariants:

- failure at any guard before acceptance creates no Task, consumes no Approval,
  and causes no external side effect;
- for an Agent-executed governed operation, the Agent performs the final guard
  enforcement even if Client or Host checks already succeeded;
- a `DENY`, unavailable, timeout, malformed, stale, wrong-principal,
  wrong-Connection, wrong-scope, wrong-action, or wrong-revision decision never
  transitions to accepted;
- a Host-obtained decision transitions only when the Agent can independently
  authenticate its issuing authority and every required binding; an opaque or
  unverified reference never transitions to accepted;
- an authorization decision cannot expand the active Connection and is usable
  only at the intersection of authentication, Connection bounds, tenant scope,
  Trust/revocation validity, `ALLOW`, and required exact-action Approval;
- policy decision caching cannot outlive its validity or Connection/revision
  binding;
- Connection revocation invalidates later authorization use;
- an Approval transition satisfies only its named policy condition and cannot
  skip earlier guards;
- authorization authority and enforcement responsibility remain distinct even
  when co-located;
- restart preserves decision/Approval consumption and Task acceptance evidence
  required to avoid duplicate effects;
- policy revision effects on active Connections and in-flight Tasks are
  explicit under H-07/H-09.

Option A has no interoperable decision-validation guard beyond deployment
policy. Option C adds the complete policy-evaluation state machine to the
protocol.

## Required error-contract consequences

H-12 must define stable, safe, role-specific trigger conditions and precedence
for at least:

- authentication missing/invalid/expired;
- principal not authorized for organization/workspace;
- Connection missing/inactive/suspended/expired/revoked;
- capability/action outside Connection bounds;
- authorization decision denied;
- authorization authority unavailable or timed out;
- authorization evidence malformed, unauthenticated, stale, wrong revision,
  wrong principal, wrong Connection, wrong scope, or wrong action;
- Host-obtained authorization evidence with an unauthenticated issuer, missing
  binding, opaque-only reference, or unverifiable proof;
- Approval required, invalid, expired, ineligible, or replayed;
- authorization evidence presented for the Approval proof purpose, or Approval
  evidence presented for the authorization proof purpose;
- Trust invalid/untrusted/indeterminate/stale/rollback/revoked;
- wrong-role operation and prohibited authority transfer;
- audit persistence failure where audit is a pre-commit security requirement.

The contract must say whether each error is retryable, whether a new
authentication/decision/Approval/Connection is required, and whether any state
was mutated. Platform may map these to stricter product errors, but the protocol
error meaning cannot differ.

## Required conformance cases

### Role and prohibited-flow cases

1. Attempt every operation under every wrong role.
2. Body-supplied principal, role, organization, workspace, policy decision, or
   Approval identity is rejected as authority.
3. Authenticated Agent without Connection cannot invoke.
4. Valid Passport and valid Trust result without Connection cannot invoke.
5. Active Connection with wrong principal/scope/capability/version cannot
   invoke.
6. Valid Approval without active Connection and current authorization cannot
   invoke.
7. Trust service result cannot be substituted for authorization.
8. Passport issuer signature cannot be substituted for authorization or
   Approval.
9. Authorization policy authority cannot widen Connection or grant bounds.
10. Workspace authority cannot weaken or escape organization bounds.
11. Agent operator cannot impersonate Host principal or Approver.
12. Direct Agent-to-Agent Invocation is rejected on Core/Governed surfaces.
13. Co-located and service-separated deployments produce the same observable
    protocol-floor result.

### Authorization-floor cases

14. Positive decision with every required exact binding.
15. Missing, boolean, `{allowed:true}`, unknown, malformed, or unauthenticated
    decision.
16. `DENY` under every otherwise valid condition.
17. Mutation of principal, authentication context, Connection, Agent/Passport,
    operation, capability/version, organization, workspace, action/input digest,
    policy authority, or revision.
18. Decision just before/at/after validity boundary with deterministic clock
    and permitted skew.
19. Policy timeout, service unavailable, malformed response, and stale cache,
    proving no fallback to Connection alone.
20. Policy revision change before Task acceptance, after acceptance, during
    Approval wait, and after restart.
21. Organization/workspace absent, null, empty, wildcard, mismatched, and
    cross-parent cases.
22. Policy requires Approval: missing, wrong-action, wrong-limit, expired,
    consumed, and concurrent Approval.
23. Receipt contains the correct safe decision reference/action/revision and
    rejects substitution.
24. Platform adapter applies stricter policy while preserving the same
    protocol-floor DTO and errors.
25. Simple non-Platform allowlist authority passes the same floor without
    importing Platform concepts.
26. Safe audit correlation and redaction for allow, deny, timeout, malformed
    evidence, and commit ordering.
27. Restart with cached/current decisions, consumed Approval, accepted Task,
    revoked Connection, and changed policy revision.
28. Client and Host checks report success while the Agent receives a missing,
    denied, stale, or mismatched decision, proving the Agent rejects before Task
    creation and external side effects.
29. Agent-obtained and Host-obtained decisions with identical bindings produce
    the same result; Host-obtained decisions with an unauthenticated authority,
    missing binding, opaque-only reference, or unverifiable proof are rejected.
30. Attempted decision transfer across each authenticated principal,
    Connection, organization, workspace absence/value state, Agent, Passport,
    capability, version, operation, exact authorization action digest, policy
    authority/revision, evaluation time, and validity boundary.
31. An `ALLOW` wider than any authentication, active Connection, tenant,
    Trust/revocation, or required Approval bound is reduced to the intersection
    or rejected and never expands effective authority.
32. Authorization and Approval action proofs are generated and verified under
    separate H-10 canonical cryptographic domains/purposes; cross-purpose
    substitution is rejected in both directions.

Each future case must cite accepted requirements and canonical assets. Current
test fixtures are evidence inputs, not the conformance oracle.

## Review questions retained as decision history

These questions were recorded before acceptance. The approval block resolves
the authorization option, logical role model, Trust terminology, and approver
questions; remaining detailed design questions stay deferred to H-03 through
H-13.

1. Is Option B approved, or should Option A or C define the authorization floor?
2. Are the recommended canonical names “Client implementation,” “Host
   Application,” “authenticated Host principal,” “Agent,” “Agent operator,”
   “Approver,” “authorization policy authority,” “Passport issuer,” “Trust
   verification service,” “organization authority,” and “workspace authority”?
3. Should “Host Client” remain the public term for Client implementation?
4. Should “Trust Node” be a canonical role, or should the specification use the
   topology-neutral “Trust verification service”?
5. Which role is authorized to cause Install Grant issuance: Agent, Agent
   operator, Passport issuer, organization authority, or a bounded combination?
6. Must every governed profile include workspace scope, or may an
   organization-only Connection omit it? What do absent/null/empty mean?
7. Which pre-Connection operations require the authorization floor? In
   particular, are discovery, Passport, capability list/search/details, grant
   resolution, preview, and redemption public, authenticated, or authorized?
8. Which exact fields form each authorization action, and which H-10 canonical
   digest profile binds them?
9. How is the authorization policy authority authenticated: signed decision,
   mutually authenticated channel plus opaque evidence, or another approved
   profile?
10. What is the maximum decision lifetime and clock skew, and may decisions be
    cached?
11. Does any policy revision invalidate previously issued but unexpired
    decisions? How are in-flight Tasks and waiting Approvals treated?
12. Which safe authorization fields must a Receipt bind: decision reference,
    authority, action digest, revision, evaluated time, or a subset?
13. Must the Agent independently obtain the decision, or may it accept a
    Host-obtained decision with authenticated proof?
14. Which authorization checks are Client responsibilities, Agent
    responsibilities, or deliberately defense-in-depth at both?
15. Is Platform authorization of its discovery product operation explicitly a
    deployment policy rather than a requirement for public Agent discovery?
16. Which role owns protocol-required audit durability and ordering?
17. What migration is required for active draft Connections and nonterminal
    Tasks that lack Option B evidence?
18. Who is the accountable human approver for H-02?

## Approval block

Human approval is recorded as follows:

- **Approver:** Lakshya Sharma (`lakshyasharma21103-crypto`)
- **Approval date:** 2026-07-28
- **Approved authorization option:** Option B — minimum structured
  authorization decision.
- **Approved logical role model:** R2 — separated logical responsibilities.
- **Permitted deployment topologies:** R1 and R3 remain permitted when they
  preserve the same logical authority separation and observable protocol-floor
  behavior.
- **Approved terminology:** “Trust verification service” is the canonical
  logical role term. “Trust Node” may remain a deployment or product term.
- **Approved qualifications:**
  - the Agent is the mandatory final authorization-floor enforcement point
    before Task creation or external side effects;
  - Client and Host validation is defense in depth and cannot replace Agent
    enforcement;
  - Host-obtained authorization evidence is acceptable only when its issuing
    authority and bindings are independently authenticatable;
  - opaque or unverified policy references are insufficient;
  - authorization evidence is non-transferable;
  - authorization cannot create or expand an active Connection;
  - the decision must bind principal, Connection, organization, workspace with
    explicit absence semantics, Agent, Passport, capability/version, operation,
    exact authorization action digest, policy authority/revision, evaluation
    time, and validity boundary;
  - effective authority is the intersection of authentication, active
    Connection bounds, tenant scope, current Trust/revocation validity,
    authorization `ALLOW`, and Approval where required;
  - authorization and Approval remain separate authority objects;
  - H-10 must define distinct canonical cryptographic purposes for authorization
    action binding and Approval action binding;
  - Platform may enforce stricter policy, but Platform permissions, roles,
    policy storage, evidence formats, and internal models are not protocol law;
  - co-location does not merge Trust, authorization, Approval, issuer,
    Connection, organization, or workspace authority.
- **Accepted risks:**
  - structured authorization evidence adds schemas, verification, freshness,
    timeout, and policy-authority availability requirements;
  - a weak future action-binding definition could create false confidence;
  - policy-authority outages must fail closed and may reduce availability;
  - later decisions must prevent Platform-specific fields from entering the
    minimum protocol floor;
  - exact canonical action and proof definitions remain dependent on H-10.
- **Compatibility impact:**
  - a deployment-neutral authorization decision schema will be required;
  - Agent implementations must enforce the minimum evidence fields;
  - simple deployments may use local allowlists or callbacks;
  - managed deployments may use enterprise policy engines;
  - Platform-specific evidence remains an optional stricter extension;
  - Receipts may bind a safe authorization reference/digest without exposing
    private policy internals.
- **Security impact:**
  - prevents authorization substitution across principals, Connections,
    tenants, Agents, Passports, capabilities, operations, actions, policies, and
    validity periods;
  - prevents Client-only authorization bypass;
  - separates Trust verification, authentication, Connection authority,
    authorization, and Approval;
  - prevents authorization from widening Connection scope;
  - prohibits direct Agent-to-Agent authority;
  - requires fail-closed behavior before Task creation or side effects.
- **Resulting status:** `ACCEPTED`
- **Approval reference:** Explicit human approval recorded in the Phase 15D.1A
  independent-review conversation on 2026-07-28.

## Consequences of acceptance

The governance update in item 1 is complete. Remaining work requires separately
authorized phases:

1. Update this record's status and completed approval block through the
   repository's human-governed review process. **Completed by this update.**
2. Feed the accepted role and authorization decisions into H-05 through H-08,
   H-10 through H-13, without treating details deferred to those decisions as
   law.
3. Create role/trust-boundary, authentication, authorization, Connection,
   Invocation, Approval, Trust, error, security, privacy, compatibility, and
   conformance requirements in the human-approved versioned specification.
4. Give each applicable requirement a stable ID and cite `H-02`.
5. Create deployment-neutral principal, scope, Connection, authorization,
   Invocation, Receipt, error, and audit schemas only after dependent human
   decisions are accepted.
6. Publish protocol-versus-Platform policy deltas. Platform may remain stricter
   but must not become the expected-result oracle.
7. Define role/state conformance profiles and prohibited-authority fixtures,
   then run identical cases against embedded, separated, Platform, and
   independent implementations.
8. Plan migration for current Native Agent callbacks, Platform evidence,
   active Connections, nonterminal Tasks, and historical Receipts without
   rewriting their history.
9. Implement runtime and SDK changes only in a separately authorized phase.

This accepted record does not by itself close any `GB-*` gap. Gap closure
requires separately approved normative requirements and their traced assets.

## Accepted supplement H-02-S1

On 2026-08-27, Lakshya Sharma (`lakshyasharma21103-crypto`) explicitly
human-approved **H-02-S1 Revision 8 — Experimental Isolation Roles and Evidence
Authority**. The accepted supplement is recorded in
[`H-02-S1-experimental-isolation-roles-and-evidence-authority.md`](./H-02-S1-experimental-isolation-roles-and-evidence-authority.md).

Within H-02's constitutional scope, H-02-S1 settles source/role authority
separation for experimental isolation: Organization is the positive authority;
Workspace authority is narrowing-only; the Isolation Attestation Authority has
bounded measured-fact authority; and Trust supplies verification/evidence, not
Connection or Invocation authority. It also settles universal H-02 projection
coherence with contradiction rejection, distinct Workspace-present and
Workspace-absent authority branches, privacy across every unequal
`ExactTenantContext`, equality-only comparison against Connection-owned values,
and the non-transfer rules among permission, measurement truth, Trust evidence,
Workspace narrowing, and Connection authority.

H-02-S1 does **not** define the final runtime or producer ontology; measurement
vocabulary; measurement correspondence, coverage, or currentness; the final
isolation attestation payload; cryptographic domains, payloads, signatures,
digests, algorithms, proof identities, or commitment mechanics; H-11
currentness/history materialization; D1 normative `REQ-*` wording; or D2 schemas
and representation. Those matters remain downstream-owned by H-13-S2, H-10,
H-11, D1, and D2 as assigned in the supplement. Their unresolved work cannot
authorize implementation and cannot be supplied by implementation discretion.
