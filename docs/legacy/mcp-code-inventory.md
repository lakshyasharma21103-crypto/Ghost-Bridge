# Legacy integration code inventory

Status: quarantined for historical Platform compatibility. It is not part of
Ghost Bridge Native, is absent from public protocol navigation and the Native
installation experience, and receives no Phase 15B features.

| Classification | File/module | Current purpose and dependencies | UI/default/test state | Removal reason or required evidence | Target |
| --- | --- | --- | --- | --- | --- |
| B — quarantine | `Backend/src/services/adapters/mcp.adapter.js` | Historical Runtime Gateway adapter imported by the legacy adapter registry | No public protocol UI; stored legacy runtime types and regression tests may reach it | Retained because no stored-record migration, rollback analysis, or compatibility window has been approved | Phase 15C migration design |
| B — quarantine | `Backend/src/services/adapters/index.js` (`mcp` registry entry) | Registers the historical adapter beside the active Platform adapter | Not imported by Native packages | Split only after stored Passport and Connection readers no longer select the legacy value | Phase 15C |
| C — human review | `Backend/src/models/AgentPassport.js`, `PassportConnection.js`, `Invocation.js`, `InvocationAttempt.js`, `CredentialBinding.js`, and `CircuitBreaker.js` legacy enum values | Preserve already-persisted Platform records and operational evidence | Hidden from Native public projections; migrations and rollback may depend on the values | Applied persistence cannot be renamed or removed without record inventory and a backward-compatible migration | Future destructive phase only |
| B — quarantine | `Backend/src/services/passportValidator.js` legacy runtime allowance | Validates historical Passport v1 payloads | Authenticated legacy Console only; regression tests depend on it | Retained until legacy creation is deprecated and stored records have a projection | Phase 15C |
| B — quarantine | `Backend/src/controllers/invocationController.js`, `routes/connectionRoutes.js`, and `services/runtimeGateway.service.js` historical tool-import branch | Preserves an authenticated Platform route and service behavior | Not present in public protocol navigation or Native install flow; authorization checks remain | Retained because removal would change customer-facing authenticated behavior and security regression coverage | Phase 15C with explicit owner approval |
| B — quarantine | `frontend/src/pages/CreatePassport.jsx`, `ConnectionDetail.jsx`, `PassportDetail.jsx`, `TestInvocation.jsx`, and `Settings.jsx` legacy Platform views | Display and operate historical runtime records in the authenticated Console | Not imported into public docs content or the Native primary installation page | Retained pending an approved customer migration; ordinary Native install asks for a one-time grant only | Phase 15C |
| B — quarantine | `Backend/src/tests/mcpAdapter.test.js` and related Runtime Gateway regression assertions | Prevent accidental historical behavior and authorization regressions | Test-only | Remove only with the behavior and after replacement migration/security coverage exists | With quarantined runtime path |
| C — human review | historical error codes and external-provider response-shape allowlists | Preserve compatibility and safe response parsing | No Native dependency | Ambiguous stored evidence and provider response compatibility; no automatic deletion | Future review |

Quarantine rules:

1. Native workspace packages must contain no import, dependency, URL field, or
   runtime path from this inventory.
2. No legacy item appears in public protocol navigation.
3. No ordinary native installation asks for an endpoint URL.
4. New feature work is prohibited; only backward-compatible safety fixes are
   permitted before removal.

## Phase 15B result

- Deleted: no legacy component. No item met every static, dynamic, route,
  export, test, persistence, migration, and rollback removal condition.
- Retained: all items above, for the explicit compatibility reasons recorded.
- Native package dependency: none.
- Public protocol route dependency: none.
- Native installation field dependency: none; the primary flow uses an Install
  Grant and scoped connection data.

This inventory does not claim that the historical Platform contains no other
dead code. Ambiguous behavior remains marked for human review.
