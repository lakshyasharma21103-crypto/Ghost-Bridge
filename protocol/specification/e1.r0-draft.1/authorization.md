# Authorization

This chapter defines the portable protocol authorization floor for
`ghostbridge/e1.r0-draft.1`. It defines the semantic decision and enforcement
contract, not a policy language, Platform role model, authorization-service API,
wire schema, or Approval lifecycle.

## REQ-AUTHZ-0001 - Authentication and authorization separation

**Requirement.** Authentication MUST identify the typed principal presenting
an operation under the selected profile. Authorization MUST separately decide
whether that exact authenticated principal may perform one exact protocol
operation/action under one exact active Connection, target, and tenant context.
Neither result MUST substitute for the other, Connection authority, Trust,
deployment policy, or Approval. Authorization `ALLOW` MUST be only one narrowing
input to effective authority and MUST NOT manufacture or transfer authority to
an Agent or another principal.

**Applies to.** Every Agent-executed governed operation, including Invocation
admission and any separately governed action whose accepted rules require the
H-02 floor.

**Lifecycle/state impact.** None by itself. A decision can permit or deny
consideration at a later controlling commit but cannot create a Connection,
Task, Approval, or lifecycle transition.

**Semantic failure.** Conflating authentication and authorization, or treating
either as another authority source, is unauthorized and MUST fail before new
work or external effect.

**Sources:** H-01, H-02, H-05, H-07, H-08. **Gaps:** GB-007, GB-008, GB-013.

## REQ-AUTHZ-0002 - Authoritative decision inputs

**Requirement.** An authorization policy authority MUST evaluate only bounded,
verified, or authoritative inputs. Its input set MUST include, as applicable:

- the typed principal and authentication context derived from current verified
  selected-profile evidence;
- authoritative organization membership and, when a workspace is present,
  authoritative workspace membership and parent organization;
- the integrity-verified active Connection projection and exact owner binding;
- exact Agent, Passport, authentication audience, and target/resource;
- the selected protocol release and exact capability key/version;
- exact operation/action and verified action attributes, including
  authority/effect-relevant target, contract, input identity, limits, and
  restrictions;
- authorization-policy authority identity and exact policy revision;
- evaluation time and finite validity boundary; and
- all current Connection, capability, tenant, consent, and deployment ceilings
  applicable to the action.

Request bodies, query values, mutable labels, Agent-supplied roles or scope,
body-selected policy references, correlation identifiers, database identifiers,
and unverified provider or middleware objects MUST remain untrusted assertions.
Their presence inside a signed or authenticated request MUST NOT make their
content authoritative unless the accepted proof and policy inputs independently
verify the same semantics.

**Applies to.** Construction and evaluation of every structured authorization
request or local equivalent.

**Lifecycle/state impact.** Evaluation has no lifecycle effect and cannot
reserve, accept, or consume authority.

**Semantic failure.** A missing, stale, ambiguous, unbounded, unverified, or
wrong-provenance authority-critical input requires DENY or no ALLOW; it MUST NOT
be filled from current defaults or caller assertions.

**Sources:** H-02, H-05, H-07, H-10, H-11, H-12. **Gaps:** GB-008, GB-012,
GB-013.

## REQ-AUTHZ-0003 - Bounded structured ALLOW or DENY evidence

**Requirement.** The protocol authorization result MUST be a bounded structured
`ALLOW` or `DENY` decision, or an exact immutable reference to evidence carrying
that result, for one exact:

- decision identity and authorization policy authority identity;
- authenticated principal and bound authentication context;
- Connection;
- organization and tagged workspace value or explicit absence;
- Agent, Passport, authentication audience, and target/resource;
- selected protocol release;
- capability key/version and selected restrictions;
- operation and authorization-action semantic identity or H-10 digest slot;
- policy identity and revision;
- evaluation time and exclusive validity boundary; and
- applicable restrictions, with an optional bounded safe reason category and
  retry classification.

The evidence MUST be sufficient for the Agent to authenticate its issuing
policy authority and verify every binding independently. It MUST preserve value
and presence equality, including explicit workspace absence, and MUST NOT rely
on a mutable policy alias, current default, opaque callback boolean, or
unverifiable reference. This inventory defines semantic meaning and MUST NOT be
treated as a final wire schema or as approval of exact H-10 bytes.

**Applies to.** Every portable authorization decision supplied to or obtained by
the final Agent enforcement point.

**Lifecycle/state impact.** The decision remains current narrowing evidence
only; it does not mutate Connection or Task state.

**Semantic failure.** An unbounded boolean, absent proof/provenance, unresolved
reference, wrong or missing binding, non-final action identity, or expired
decision is malformed, unverifiable, or mismatched and MUST NOT produce ALLOW.

**Sources:** H-02, H-07, H-10, H-12, H-13. **Gaps:** GB-008, GB-012, GB-013.

## REQ-AUTHZ-0004 - Agent is the final protocol enforcement point

**Requirement.** An external policy service MAY evaluate policy, and a Host MAY
obtain a decision as defense in depth, but the Agent MUST be the final protocol
enforcement point for every Agent-executed governed action. Before Task creation
or external effect, the Agent MUST independently:

1. authenticate the issuing authorization authority or decision provenance;
2. verify `ALLOW` and the exact principal/authentication context, Connection,
   organization and tagged workspace, Agent/Passport, audience/target, release,
   capability/version, operation/action, action identity, restrictions, policy
   authority/revision, evaluation time, and current validity;
3. compare those bindings with the authoritative active Connection, verified
   current request, and exact action; and
4. recheck the decision and every raceable governing input at the final
   operation serialization boundary.

An opaque decision reference or an authenticated service response without those
portable verifiable bindings is insufficient. Client, Host, gateway, middleware,
or Platform checks MUST NOT replace Agent enforcement.

**Applies to.** The final admission/enforcement path of every Agent-executed
governed operation.

**Lifecycle/state impact.** Only the later complete serialized operation commit
may accept work. Preliminary policy evaluation, ALLOW evidence, locks, caches,
and response delivery have no lifecycle effect.

**Semantic failure.** Failure to verify any step is unauthorized or
indeterminate and creates no Task, consumes no Approval, and begins no external
effect.

**Sources:** H-02, H-07, H-08, H-09, H-11, H-12. **Gaps:** GB-008, GB-013.

## REQ-AUTHZ-0005 - Non-transferability and non-widening

**Requirement.** An authorization decision MUST be non-transferable and MUST
NOT widen or substitute its active Connection, authenticated principal,
organization or workspace, Agent or Passport, authentication audience or
target, selected release, consent envelope, capability key/version or
restrictions, extension/experiment limitations, Trust or revocation result,
deployment ceiling, or Approval requirement or bounds. Broader principal
membership, policy authority, or deployment permission MUST NOT move one
Connection across tenants, targets, capabilities, operations, or resources.

Effective authority MUST be the intersection of the verified current request,
immutable active Connection bundle, exact tenant and capability restrictions,
current Trust/revocation, current `ALLOW`, stricter deployment policy, admission
time, and exact-action Approval when required. Every input MAY narrow or deny;
none MAY expand another input.

**Applies to.** Decision issuance, transport, verification, caching, reuse, and
final enforcement.

**Lifecycle/state impact.** None. A material desired expansion requires the
separately accepted preview, consent, grant, and Connection replacement path;
authorization cannot perform it.

**Semantic failure.** Any cross-principal, cross-Connection, cross-scope,
cross-target, cross-action, stale-policy, or widening reuse is wrong-scope or
wrong-action and MUST fail closed without mutating or disclosing the original
authority.

**Sources:** H-02, H-04, H-07, H-08, H-11. **Gaps:** GB-008, GB-011, GB-012,
GB-013.

## REQ-AUTHZ-0006 - Default deny and current validity

**Requirement.** Missing, explicit `DENY`, malformed, unavailable, timed out,
stale, expired, mismatched, wrong-principal, wrong-Connection, wrong-scope,
wrong-action, wrong-target, wrong-capability, wrong-policy-revision,
unverifiable, or indeterminate authorization MUST NOT produce or be interpreted
as ALLOW. Policy-service timeout, storage outage, cache disagreement, and
decision-reference resolution failure MUST fail closed for the new governed
action. A cached or historical ALLOW MUST NOT survive its validity boundary,
current policy revision, current Connection state, or a governing narrowing
change.

An authorization failure before the controlling new-work commit MUST create no
Task, consume no Approval merely because policy was checked, begin no external
effect, and grant no authority. An implementation MAY retain a bounded safe
internal reason category, but public distinction, precedence, retry
classification, and privacy collapse remain H-12/D1-07 concerns.

**Applies to.** Authorization evaluation, verification, final recheck, service
unavailability, cache use, and recovery after restart.

**Lifecycle/state impact.** Request-local denial only unless another accepted
H-05, H-07, or H-11 rule independently maps the underlying authoritative event
to suspension or a terminal transition. Ordinary DENY is not revocation.

**Semantic failure.** Every listed condition is unauthorized or indeterminate
and non-authorizing; no permissive default or stale-success fallback is allowed.

**Sources:** H-02, H-05, H-07, H-11, H-12. **Gaps:** GB-008, GB-013, GB-015.

## REQ-AUTHZ-0007 - Deployment-policy and Approval boundaries

**Requirement.** A deployment or Platform MAY use RBAC, ABAC, risk, residency,
cost, rate, middleware, database, service, or other internal policy and MAY
impose stricter controls. Those controls MUST NOT weaken the protocol
authorization floor, redefine its semantic decision, widen effective authority,
or become a universal protocol requirement merely because an official
deployment uses them. The common decision MUST NOT require Platform permission
IDs, role keys, matched-rule lists, database identifiers, binding-token formats,
or implementation evidence versions.

Authorization ALLOW MUST remain distinct from exact-action Approval. When
policy requires Approval, the Agent MUST verify the separate exact-action
Approval and the final Invocation-acceptance transaction MUST consume it under
H-08; ALLOW MUST NOT create, imply, reuse, bypass, widen, or replace Approval.
This chapter MUST NOT be used to define complete Approval fields, eligibility,
states, transitions, or consumption behavior beyond that admission gate.

**Applies to.** Portable and Platform deployments, policy integration, and
actions for which policy requires Approval.

**Lifecycle/state impact.** Stricter deployment denial has no required protocol
lifecycle effect. Approval consumption, where required, occurs only in the
separate final atomic acceptance outcome.

**Semantic failure.** A deployment-floor weakening, Platform-only evidence
substitution, or ALLOW-as-Approval path is unauthorized and MUST fail before
Task creation or effect.

**Sources:** H-02, H-07, H-08, H-12, H-14. **Gaps:** GB-008, GB-013.

## Non-normative D2 traceability

Later D2 work is expected to derive authorization-evidence schemas and cases for
wrong principal, Connection, scope, Agent/Passport, capability, action, target,
policy revision, validity, provenance, Platform substitution, unavailable
policy, non-widening, and Approval separation from these requirements. This
chapter creates none of those assets and closes no `GB-*` gap.
