# Phase 13C2 Enterprise Policy Engine

## Authorization flow

Every protected operation uses the existing central authorization service:

1. authenticate the actor;
2. resolve organization/workspace ownership;
3. evaluate Phase 13C1 RBAC;
4. load the current tenant policy revision and active policy snapshot;
5. resolve registered attributes from trusted backend data;
6. evaluate applicable policies;
7. audit the safe final decision;
8. continue to business logic or the Runtime Gateway only after ALLOW.

RBAC is mandatory. A policy cannot grant a permission absent from RBAC. RBAC denial is final, an explicit matching `DENY` wins over all `ALLOW` policies, and an applicable conditional `ALLOW` set requires at least one successful match. With no applicable policy, the prior RBAC result is preserved.

Unknown permissions, active malformed policies, unregistered attributes, missing required attributes, evaluator failures, and production policy-storage failures deny safely. Error responses contain a reason code and no policy document, credentials, request payload, or sensitive resolved attributes.

Malformed active snapshots and evaluator/storage failures also raise a deduplicated critical operational alert when the alert store is available; alert failure never changes the fail-closed decision.

## Model and lifecycle

`Policy` stores a stable policy ID and immutable numbered versions. It includes organization and optional workspace scope, `DRAFT`/`ACTIVE`/`RETIRED` status, `ALLOW`/`DENY` effect, target, condition, priority, author fields, activation/retirement timestamps, optimistic `revision`, revision metadata, and schema version.

- Drafts are editable only with `expectedRevision`.
- Updating an active version is rejected; `POST /versions` creates the next draft.
- Activation retires the preceding active version and activates the draft in one MongoDB transaction.
- Retirement and policy-generation increment also use one transaction.
- History is retained. There is no API that physically deletes active or audited history.
- Deployment MongoDB must support transactions (replica set or sharded cluster).

Indexes enforce tenant/version uniqueness, one active version per stable tenant policy, active workspace lookup, and history lookup. `PolicyRevision` holds the authoritative per-organization generation.

## Condition language

Conditions are JSON data, never executable expressions. Logical nodes use `ALL`, `ANY`, and unary `NOT`. Leaves specify a registered `attribute`, an `operator`, and (except `EXISTS`/`NOT_EXISTS`) a typed `value`.

Supported comparisons are `EQUALS`, `NOT_EQUALS`, `IN`, `NOT_IN`, `EXISTS`, `NOT_EXISTS`, `LESS_THAN`, `LESS_THAN_OR_EQUAL`, `GREATER_THAN`, `GREATER_THAN_OR_EQUAL`, `STARTS_WITH`, `ENDS_WITH`, and `CONTAINS`.

Types are strict: numeric strings are not numbers. Date values must be valid date strings. Policy validation limits nesting to 8 levels, 100 nodes, 100 array entries, 2,048-character condition strings, 100 target values per field, and 128 KiB per policy document.

Business-hour rules combine the server-derived `request.weekday` and timezone-aware numeric `request.hour` attributes.

## Trusted attribute registry

The versioned registry is available at `GET /api/v1/policies/attributes`. It includes actor identity/type/service-account/team/role data; organization and workspace identity/environment/production approval; resource identity/owner workspace; server timestamp/weekday/hour/source IP; process environment; capability identity/category/classification/side effect; connection identity/status; and passport identity/version.

Each entry declares its type, permitted operators, sensitivity, audit-display safety, and trusted backend resolver. Arbitrary object paths are rejected. Client input can locate a resource, but runtime and simulation flows load authoritative connection, passport, capability, and workspace records or stored verified snapshots.

## Determinism and cache

Policy order is workspace scope before organization scope, specific resource targets before broad targets, descending explicit priority, stable policy ID, then version. Explicit deny precedence does not depend on this display/evidence order.

The bounded local cache is keyed by encoded organization and workspace. MongoDB remains authoritative: every lookup reads the tenant generation and reuses a cached snapshot only when its revision matches. Activation and retirement increment that generation transactionally and invalidate local entries. A cache miss reloads with explicit organization and workspace scope. The cache stores no payloads, credentials, or resolved request attributes.

## Simulation and lockout protection

Draft simulation evaluates the authenticated caller and an authoritative tenant resource. It cannot accept a different actor ID, enqueue work, load credentials, call an adapter, send a network request, or mutate runtime state. Results compare the current active snapshot with the snapshot in which the draft replaces its stable policy ID and identify RBAC versus policy decisions with safe condition evidence.

Before activating a policy that can affect policy, organization, or role administration, the service evaluates critical permissions for every known organization owner (including the authenticated partner owner). Activation is rejected if every owner would be denied. Phase 13C2 intentionally has no override header, universal bypass, or break-glass route.

## Runtime and durable revalidation

Synchronous and asynchronous invocation preflight loads connection/passport/capability governance metadata, then authorizes before invocation creation, durable enqueue, credential resolution, capacity acquisition, adapter execution, or outbound traffic. An optional capability `requiredPermission` adds another central RBAC-plus-policy check.

Invocations persist bounded authorization evidence: permission, actor identity/type, tenant, resolved role keys, decision/reason, policy revision, and evaluation time. They never store credentials or the invocation body in that evidence.

Durable workers reload that evidence and repeat central authorization against the current policy generation before decrypting replay input or executing. A newly activated deny therefore blocks queued work. The work item and invocation receive a safe failed authorization outcome. Manual retries enter the same invocation preflight; cancellation/recovery controls pass stored authoritative capability metadata to central authorization. Credential replacement and connection health checks authorize before credential creation/loading or external health requests. MCP tool import authorizes before adapter initialization or tool mutation.

## Capability governance

Agent Passport v1 capability metadata remains backward compatible. Optional fields are:

- `classification`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`, `UNCLASSIFIED`;
- `category`: `SEARCH`, `DOCUMENT`, `DATABASE`, `CRM`, `EMAIL`, `FILESYSTEM`, `FINANCE`, `PAYMENT`, `ADMINISTRATION`, `OTHER`, `UNCLASSIFIED`;
- `sideEffect`: `READ_ONLY`, `LOCAL_CHANGE`, `REMOTE_WRITE`, `IRREVERSIBLE`, `UNKNOWN`;
- `requiredPermission`, `retrySafety`, `cancellationSupport`, and `idempotencySupport`.

Missing classification and side-effect values resolve explicitly to `UNCLASSIFIED` and `UNKNOWN`; the gateway never infers classifications for external agents. Imported MCP tools receive those explicit unknown values.

## API and permissions

All policy routes require Partner authentication and central permissions:

- `GET/POST /api/v1/policies`
- `GET /api/v1/policies/attributes`
- `GET /api/v1/policies/audit`
- `GET /api/v1/policies/capabilities/:passportId/governance`
- `GET /api/v1/policies/:stablePolicyId`
- `GET /api/v1/policies/:stablePolicyId/history`
- `POST /api/v1/policies/:stablePolicyId/versions`
- `PATCH /api/v1/policies/:stablePolicyId/versions/:version`
- `POST .../validate`, `.../simulate`, `.../activate`, and `.../retire`

Permission registry v2 adds `policy.create`, `policy.update`, `policy.validate`, `policy.simulate`, `policy.activate`, `policy.retire`, and `policy.audit.read`, while retaining `policy.read` and the legacy aggregate `policy.manage` ID for compatibility. Metadata includes descriptions, risk, auditing, and built-in role mappings.

## Safe audit and metrics

Authorization audits record decision/reason, RBAC and policy decisions, actor/tenant/resource IDs, matched policy IDs/versions/effects, policy revision, trace/request IDs, simulation flag, and duration. Condition evidence includes expected values only for registry attributes marked display-safe. Existing redaction removes secret-shaped fields.

Metrics count evaluations, allows, denies, explicit denies, errors, simulations, activation failures, cache hits/misses, attribute failures, and duration. Labels are allowlisted low-cardinality values; policy, actor, resource, trace, and request IDs are discarded.

## Migration

Run `npm run migrate:policy-engine` during deployment. It idempotently creates indexes and initializes generation `0` for existing partner/policy organization scopes. It creates no allow-all policy. Organizations with no active policy preserve existing RBAC behavior, existing passports need no governance metadata, and existing queued invocations without evidence remain readable/recoverable under their existing runtime compatibility path.

## Examples

### Deny irreversible capabilities for Developers

```json
{
  "effect": "DENY",
  "target": { "permissionIds": ["connection.invoke"], "sideEffects": ["IRREVERSIBLE"] },
  "condition": { "operator": "CONTAINS", "attribute": "actor.roleKeys", "value": "developer" }
}
```

### Restrict production invocation to approved workspaces

```json
{
  "effect": "ALLOW",
  "target": { "permissionIds": ["connection.invoke"], "environments": ["PRODUCTION"] },
  "condition": { "operator": "EQUALS", "attribute": "workspace.productionApproved", "value": true }
}
```

### High-risk capability roles (still requires RBAC)

```json
{
  "effect": "ALLOW",
  "target": {
    "permissionIds": ["connection.invoke"],
    "capabilityClassifications": ["HIGH", "CRITICAL"]
  },
  "condition": {
    "operator": "ANY",
    "conditions": [
      { "operator": "CONTAINS", "attribute": "actor.roleKeys", "value": "operator" },
      { "operator": "CONTAINS", "attribute": "actor.roleKeys", "value": "workspace_admin" }
    ]
  }
}
```

### Deny administrative actions from service accounts

```json
{
  "effect": "DENY",
  "target": {
    "permissionIds": ["organization.manage", "role.manage", "policy.activate"],
    "actorTypes": ["service_account"]
  },
  "condition": { "operator": "EQUALS", "attribute": "actor.serviceAccount", "value": true }
}
```

## Known limitations and Phase 13C3 handoff

Phase 13C2 deliberately omits approval workflows, multi-person approval, break glass, external policy languages, CIDR conditions, SCIM/SSO, evidence exports, and cross-service distributed cache broadcasts. Generation checks provide multi-instance correctness at database-read cost. Source IP is registered but only available where trusted proxy/server plumbing supplies it. Generic `resourceIds` should be used only with resource types whose service performs authoritative ownership loading.

Recommended Phase 13C3 work: approval and exception workflows, a cryptographically controlled break-glass design, policy change review/diffing, distributed invalidation notifications, richer trusted network/device posture, evidence export/retention, and production policy performance/operational SLOs.
