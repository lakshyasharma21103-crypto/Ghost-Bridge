# Roles and trust boundaries

The roles below are logical roles. A deployment can use fewer or more processes,
but process topology does not change the authority allocation.

## REQ-ROLE-0001 - Logical separation and trusted-input meaning

**Requirement.** Implementations MUST preserve the logical separation of Client,
Host Application, authenticated Host principal, Agent, Agent operator, Approver,
authorization policy authority, Passport issuer, Trust verification service,
Organization authority, and Workspace authority. Co-location MUST NOT merge or
transfer authority. A "trusted input" MUST mean input authenticated, verified,
or loaded from a configured authority through the defined interface; it MUST NOT
mean that all data supplied by that participant is inherently safe. Role-service
unavailability, ambiguity, or unverifiable evidence MUST fail closed wherever
that role supplies a required gate.

**Sources:** H-02, H-14. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0002 - Client implementation responsibilities

**Requirement.** A Client implementation:

- MUST trust only defined Host configuration and authenticated-principal context,
  accepted tenant constraints, durable Connection records, and verified Trust
  or policy evidence;
- MUST treat discovery, Agent responses, unverified Passports, capability
  metadata, redirects, errors, payloads, body scope, Tasks, Results, and Receipts
  as untrusted until their applicable checks pass;
- MAY issue protocol requests and local correlation or idempotency identifiers,
  but MUST NOT treat an Invocation request as newly issued authority;
- MAY verify Agent/issuer proofs through the Trust interface and verify
  Connection, authorization, Approval, Task, Result, and Receipt bindings;
- MAY enforce Host-side preflight, selected Connection, tenant, release,
  capability, data-contract, deadline, Trust, and safe-retry checks only as
  defense in depth;
- MUST NOT possess issuer signing authority, Approver identity, unrestricted
  policy-authority credentials, ambient Agent authority, or direct
  Agent-to-Agent authority;
- MUST durably retain the Connection and correlation/idempotency state required
  for the Host's supported restart and recovery behavior and MUST use durable
  anti-rollback/revocation continuity for production use;
- MUST protect authentication references, verify or delegate signed-material
  verification, and MUST NOT invent verification success;
- MUST audit safe request, decision, Connection, and outcome correlation without
  protected material; and
- MUST fail closed on absent, ambiguous, stale, mismatched, or denied authority
  evidence and MUST NOT convert transport uncertainty into success.

**Sources:** H-02, H-03, H-05, H-07, H-09, H-11, H-12. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0003 - Host Application responsibilities

**Requirement.** A Host Application:

- MUST trust only its configured principal/session service, accepted
  organization/workspace configuration, durable Connection ownership, and
  reviewed Client, policy, and Trust interfaces;
- MUST treat user-entered targets, opaque grants, Agent display data, mutable UI
  data, payloads, callbacks, and product integrations as untrusted;
- MAY issue user intent, installation consent, capability selection, Invocation,
  cancellation, closure, or revocation requests only within the authenticated
  principal's authority;
- MUST verify principal session context and safe presentation of preview and
  Approval data before recording consent;
- MAY enforce product access, data minimization, UI, and stricter deployment
  policy as defense in depth;
- MUST NOT manufacture Passports, Trust results, policy `ALLOW` evidence,
  Approver Decisions, Connections, Tasks, Results, or Receipts;
- MUST durably retain consent, principal-to-scope, Connection ownership, and
  product audit records required by its supported lifecycle;
- MUST protect session and binding material and use reviewed Client/Trust
  interfaces rather than UI-side cryptographic conclusions;
- MUST audit who requested an installation or action, the safe preview shown,
  consent outcome, scope, and safe correlation; and
- MUST fail closed on ambiguous principal, scope, or consent and MUST NOT retry a
  high-impact action across an ambiguous outcome without accepted exact
  idempotency evidence.

**Sources:** H-01, H-02, H-05, H-08. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0004 - Authenticated Host principal responsibilities

**Requirement.** An authenticated Host principal:

- MUST derive its trusted identity and membership attributes from the selected
  authentication authority and MUST treat self-asserted body identity, tenant,
  role, permission, and Approval claims as untrusted;
- MAY request operations only inside assigned scope and MAY issue an Approval
  Decision only when separately authenticated and eligible in the Approver role;
- MAY verify its current session and the exact preview or action presented for
  consent, but possesses no protocol execution-enforcement authority merely by
  existing;
- MUST NOT obtain request-field-derived scope, automatic Approver or policy
  authority, issuer keys, or authority outside the installed Connection;
- has no independent protocol durable-store duty, while its configured
  authentication authority MUST preserve the identity lifecycle needed by the
  selected profile;
- MUST protect credentials and complete required authentication or Approval
  proof without placing reusable credentials in protocol bodies;
- MUST be represented in audit by a privacy-safe accountable subject and
  authentication context; and
- MUST be denied when expired, revoked, unverified, or scope-ineligible.

**Sources:** H-02, H-05, H-07, H-08. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0005 - Agent responsibilities

**Requirement.** An Agent:

- MUST trust only configured Passport/capability material, verified current
  authentication, Trust and policy evidence, and authoritative durable grant,
  Connection, Approval, idempotency, Task, Result, Receipt, revocation, and
  anti-rollback state;
- MUST treat every network message, body principal or scope, payload, grant
  presentation, Approval/policy reference, and Client assertion as untrusted;
- MAY issue bounded grants only under separately delegated issuing authority,
  MAY issue one active Connection only through H-06, and MAY issue Challenges,
  Tasks, Results, and purpose-signed Receipts within their accepted lifecycles;
- MUST verify current authentication, active Connection, exact scope/release/
  capability, Trust/revocation, structured authorization, Approval where
  required, integrity, deadline, idempotency, and data-contract gates;
- MUST enforce operation ordering, the Connection bounds, protocol authorization
  floor, Approval consumption, Task transitions, cancellation checkpoints,
  revocation, and pre-effect failure;
- MUST NOT possess ambient Host authority, unilateral tenant expansion,
  Approver identity, Passport-issuer root authority, or direct authority to
  invoke another Agent;
- MUST durably preserve grants, Connections, Approvals, accepted Tasks, Results,
  Receipt inputs/evidence, replay/idempotency outcomes, revocation floors, and
  atomic transition outcomes required by the selected production profile;
- MUST use purpose-scoped keys and proofs, enforce exact key/proof purpose, and
  protect private or reusable credential material;
- MUST audit authority and lifecycle transitions in an order consistent with
  their durable commits, without logging protected material; and
- MUST fail closed before a new Task or external effect on missing, malformed,
  stale, unavailable, mismatched, denied, timed-out, corrupt, or rolled-back
  required evidence.

**Sources:** H-01, H-02, H-05, H-06, H-07, H-08, H-09, H-10, H-11, H-12.
**Gaps:** GB-002, GB-003, GB-015, GB-016.

## REQ-ROLE-0006 - Agent operator responsibilities

**Requirement.** An Agent operator:

- MUST trust only reviewed deployment configuration, capability code, key
  providers, issuer relationships, durable stores, audiences, and operational
  policy and MUST treat remote requests, environment overrides, logs, plugin or
  provider output, and user-supplied keys as untrusted;
- MAY issue administrative configuration, operational enable/disable actions,
  and incident suspension, and MAY exercise grant issuance or Connection closure
  only when a separate governing authority explicitly delegates that power;
- MUST verify deployment health, key-purpose separation, store durability,
  policy/Trust service identity, and audit integrity;
- MAY enforce stricter capability availability and deployment limits without
  expanding a Connection or rewriting historical state;
- MUST NOT obtain Host-principal, Approver, organization-owner, Passport-issuer,
  or cross-tenant authority merely by operating the Agent;
- MUST preserve secure configuration, key references, recovery material,
  incident state, audit retention, and service continuity;
- MUST keep Agent execution keys purpose-scoped and issuer keys separate unless
  the issuer role is separately and explicitly assigned;
- MUST audit configuration, key, capability, incident, and recovery changes; and
- MUST prevent governed startup or operation when production configuration or
  durable integrity is unsafe, and MUST NOT fabricate protocol evidence through
  operator override.

**Sources:** H-02, H-07, H-11, H-14. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0007 - Approver responsibilities

**Requirement.** An Approver:

- MUST trust only its verified identity and eligibility plus the exact safe
  action, digest, scope, limits, requester, policy requirement, and expiry, and
  MUST treat mutable display text, hidden payloads, stale Challenges, and
  self-asserted eligibility as untrusted;
- for each Challenge for which it is separately eligible, MAY issue exactly one
  immutable Decision within the Challenge's bound role, scope, limits, and
  validity, and MUST NOT issue a second conflicting Decision for that Challenge;
- MUST verify the Challenge/action presentation, requester/scope, policy
  reference, its eligibility, and the Decision preview;
- MAY enforce only consent or refusal and MUST NOT execute, activate, widen, or
  transfer Connection authority;
- MUST NOT bypass authentication, Trust, authorization, exact-action equality,
  or separation-of-duty policy;
- MUST cause Decision, actor, time, reason category, exact semantic identity,
  expiry, and later consumption linkage to be durably retained;
- MUST use the selected Approval-purpose authentication/proof and protect its
  credentials;
- MUST audit eligibility, presentation identity, Decision, reason, and
  consumption outcome without sensitive payloads; and
- MUST fail closed on absent, stale, conflicted, ineligible, prohibited
  self-approval, malformed, or replayed Decision evidence.

**Sources:** H-02, H-08, H-10, H-11. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0008 - Authorization policy authority responsibilities

**Requirement.** An authorization policy authority:

- MUST trust only verified principal evidence, authoritative tenant membership,
  an active Connection projection, verified action attributes, current policy
  revision, and trusted time and MUST treat request assertions, mutable labels,
  Agent-supplied role/scope, and unbounded payloads as untrusted;
- MAY issue a bounded structured `ALLOW` or `DENY` for one exact principal,
  Connection, scope, Agent/Passport, capability/version, operation/action,
  policy revision, and validity window;
- MUST verify caller/service authentication, attribute provenance, policy
  revision, and exact authorization-action identity;
- MAY enforce policy evaluation, while the Agent MUST independently enforce the
  returned decision and bindings;
- MUST NOT create a Connection, issue Passport or Trust evidence, act as
  Approver, sign a Receipt, or widen any grant or Connection bound;
- MUST durably preserve versioned policy, decision/audit evidence required by
  the selected profile, revocation, and availability state;
- MUST authenticate or purpose-sign decision evidence using credentials separate
  from Approval and other proof purposes;
- MUST audit safe action identity, decision, authority, subject/scope, revision,
  time, validity, and safe reason; and
- MUST default deny so that timeout, unavailability, malformed input, stale
  revision, or unverifiable evidence never produces `ALLOW`.

**Sources:** H-02, H-07, H-08, H-10, H-12. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0009 - Passport issuer responsibilities

**Requirement.** A Passport issuer:

- MUST trust only reviewed Agent/provider identity, authorized purpose keys,
  approved declarations/manifests, issuer policy, current key/revocation state,
  and trusted time and MUST treat provider claims, arbitrary URLs, Host requests,
  and runtime output as untrusted;
- MAY issue purpose-signed Passport, capability-manifest, issuer-metadata,
  key-history, and authoritative revocation evidence within its assigned scope;
- MUST verify provider registration, key purpose/state, issuer, audience, time,
  and publication integrity;
- MAY enforce issuer publication, key lifecycle, Passport status, and revocation
  but MUST NOT enforce a Host Invocation merely because it trusts the Agent;
- MUST NOT possess Host-principal, per-action policy, Approver, Connection-use,
  or Invocation authority;
- MUST durably preserve issuer identity, Passport versions, key history,
  revocation continuity, signing audit, and compromise recovery;
- MUST use protected purpose-separated signing and safe public-key publication;
- MUST audit issuance, purpose/key identity, version/status, rotation,
  revocation, and recovery; and
- MUST fail closed on invalid, unavailable, wrong-purpose, or incomplete
  issuance evidence and MUST handle compromise through revocation and approved
  recovery rather than silent key replacement.

**Sources:** H-02, H-10, H-11. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0010 - Trust verification service responsibilities

**Requirement.** A Trust verification service:

- MUST trust only configured roots/pins, organization/workspace Trust policy,
  exact accepted profiles, trusted time, bounded transport, and a durable
  anti-rollback floor and MUST treat discovery, issuer metadata, keys,
  Passports, revocation documents, signed messages, endpoints, and peer hints as
  untrusted;
- MAY issue a bounded verification result or evidence statement only, which MUST
  NOT be Connection, authorization, Approval, or Invocation authority;
- MUST verify issuer origin/root, canonical proof, key identity/purpose/history,
  audience/time/scope, revocation coverage/freshness/sequence, rollback, and
  applicable request or Receipt bindings;
- MAY enforce Trust acceptance only when an enforcer explicitly delegates that
  gate and MUST NOT evaluate capability authorization merely from issuer Trust;
- MUST NOT issue policy `ALLOW`, create Connections, act as Approver or Passport
  issuer, or supply direct Agent authority;
- MUST durably retain enrollment roots, issuer/key history, highest accepted
  metadata and revocation checkpoints, digests, safe cache evidence, recovery,
  and review decisions required by the selected production profile;
- MUST perform strict canonical and cryptographic verification, safe key
  selection, exact algorithm/purpose enforcement, and no signature fabrication;
- MUST audit verification category, issuer/key, freshness/rollback, policy
  revision, and safe evidence references; and
- MUST reject invalid proof and MUST classify unavailable, stale, missing,
  forked, or rolled-back state as non-authorizing and fail closed wherever the
  Trust gate is required.

**Sources:** H-02, H-05, H-07, H-10, H-11, H-12, H-14. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0011 - Organization authority responsibilities

**Requirement.** An Organization authority:

- MUST trust only authenticated organization governance, membership sources,
  approved workspace delegations, issuer/Trust policy, and policy-authority
  registrations and MUST treat self-asserted membership, Agent/provider claims,
  workspace expansion, and remote policy references as untrusted;
- MAY issue organization membership, workspace ceilings, issuer/Trust-root
  approval, policy delegation, and installation policy within that Organization;
- MUST verify administrator identity, workspace parentage, policy revision,
  issuer approval, and delegated authority;
- MAY enforce top-level tenant isolation, policy ceilings, issuer allow/block,
  and workspace delegation/revocation;
- MUST NOT obtain Passport-issuer keys, Approver identity, Agent execution keys,
  or another Organization's authority by default;
- MUST durably preserve membership, delegation, policy versions, Trust choices,
  administration audit, and revocations;
- MUST protect administrative credentials and authenticated governance records;
- MUST audit membership, policy, issuer, workspace, effective-time, and
  administrator changes; and
- MUST fail closed on missing or ambiguous organization parentage or scope;
  Workspace policy MUST NOT fill the missing authority.

**Sources:** H-02, H-07, H-11. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0012 - Workspace authority responsibilities

**Requirement.** A Workspace authority:

- MUST trust only its exact parent Organization delegation, Workspace identity,
  authenticated administrators/members, and current Organization-policy base and
  MUST treat cross-workspace IDs, request-supplied parentage, Agent claims, and
  over-ceiling policy as untrusted;
- MAY issue workspace membership and stricter local Trust, authorization, or
  Approval policy only within delegated bounds;
- MUST verify parent binding, member/administrator identity, base-policy
  revision, and exact Connection workspace equality;
- MAY enforce workspace isolation and stricter local controls;
- MUST NOT weaken Organization policy, authorize another Workspace, expand a
  Connection, or issue Passport, Connection, Approval, or direct Agent authority
  outside separately delegated roles;
- MUST durably preserve membership, local policy versions, parent revision,
  delegations/approvals, and audit;
- MUST protect administration credentials and local policy integrity;
- MUST audit local membership/policy/issuer/Approval changes and their parent
  reference; and
- MUST fail closed on unknown or mismatched parentage, stale base policy, or
  absent membership.

**Sources:** H-02, H-07, H-11. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0013 - Distinct authority gates and effective authority

**Requirement.** Authentication MUST prove a caller and request context only.
Trust verification MUST establish bounded evidence only. Passport possession
MUST establish neither installation nor Invocation authority. Connection
authority MUST bound the installed relationship but MUST NOT by itself permit an
action. A structured authorization `ALLOW` MUST be exact and non-transferable
and MUST NOT widen the Connection. Approval MUST remain an additional exact-
action condition and MUST NOT replace authentication, Trust, Connection, tenant,
or authorization checks. Effective governed authority MUST be only the
intersection of the authenticated principal, active immutable Connection bounds,
exact tenant scope, current Trust and revocation validity, structured `ALLOW`,
current time and operation constraints, and exact-action Approval when required.
No input MAY expand another input.

**Sources:** H-02, H-07, H-08, H-11. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0014 - Final enforcement and defense in depth

**Requirement.** For every Agent-executed governed operation, the Agent MUST be
the final enforcement point for the complete applicable protocol floor before
Task creation or external effect. Client and Host checks SHOULD reject unsafe
requests earlier as defense in depth, but their success MUST NOT substitute for
Agent verification. If the Agent accepts Host-obtained authorization or Approval
evidence, the Agent MUST independently authenticate its issuing authority and
every required binding; an opaque reference or boolean is insufficient.

**Sources:** H-02, H-07, H-08, H-09. **Gaps:** GB-002, GB-003, GB-016.

## REQ-ROLE-0015 - Deployment topology and Platform policy

**Requirement.** Embedded Host enforcement, separated logical services, and
managed Platform aggregation MAY be deployment topologies only when they expose
the same logical responsibilities and authority boundaries. Platform-specific
roles, permission identifiers, policy models, evidence versions, sealed
bindings, status mappings, and product release decisions MUST remain
non-normative. Platform MAY be stricter but MUST NOT weaken the floor or serve as
the normative expected-result oracle.

**Sources:** H-02, H-04, H-05, H-12, H-14. **Gaps:** GB-002, GB-003.

## REQ-ROLE-0016 - Prohibited authority transfer

**Requirement.** Authentication, a Passport, Trust verification, cryptographic
validity, policy evidence, Approval, coordination metadata, MCP participation,
transport success, and role co-location MUST NOT transfer direct authority to an
Agent. Direct Agent-to-Agent authority is prohibited. Any future coordination
feature MUST be explicit, experimental unless separately graduated, default-off,
Connection-bounded, and incapable of creating, inheriting, or widening authority
between Agents.

**Sources:** H-01, H-02, H-04, H-10. **Gaps:** GB-001, GB-002, GB-003.
