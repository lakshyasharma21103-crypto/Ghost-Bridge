# Phase 15B.1 completion report

Date: 2026-07-24

## Executive summary

Phase 15B.1 realigns Ghost Bridge around the primary relationship:

`Host Application → External Agent`

The active compatibility model now has two explicit profiles:

- Core, with C1-C3 conformance.
- Governed Execution, with G1-G3 conformance.

Agent Coordination is explicitly Experimental/Deferred. Existing delegation,
two-agent, orchestration, migration, and security regression code remains
intact, but none of it is required by Core or Governed Execution.

The implementation includes a generic resolver-backed Host Client flow,
profile/extension/authentication negotiation, bounded input/output contracts,
safe installation previews, capability approval, typed standard failures,
independent CodeForge/FlowDesk fixtures, and a direct governed
LedgerWorks/OpsCanvas fixture. No provider-specific adapter or provider-name
branch is used by either Host fixture.

## Inventory and cleanup

The pre-change decision inventory is
[`engineering/phase-15b1-realignment-inventory.md`](engineering/phase-15b1-realignment-inventory.md).
It covers homepage, documentation, SDK, schemas, conformance, Inspector,
Registry, search/Ask, generated indexes, examples, coordination code,
migrations, and MCP quarantine.

Phase 15B.1 deleted no working coordination implementation, schema, migration,
or historical compatibility file. Public content was replaced or moved through
the canonical documentation manifest. Generated `llms.txt` files were rebuilt
from that manifest.

## Protocol Core and schema changes

`@ghostbridge/protocol-core` now defines:

- `ghostbridge.core` — active, C1-C3.
- `ghostbridge.governed-execution` — active, G1-G3.
- `ghostbridge.agent-coordination.experimental` — deferred and unsupported by
  default.
- Authentication modes: `none`, `oauth`, `mutual_tls`, `signed_request`,
  `managed_credential`, `delegated_credential`, and `platform_brokered`.
- Profile declaration validation.
- Authentication-mode negotiation without provider branching.
- Compatibility results: compatible, compatible with limitations, or
  incompatible, with bounded reasons.
- Safe installation-preview projection.
- Bounded JSON input/output contract validation.
- Profile-aware Extension Declarations.

The public discovery, Passport, Connection Offer, Capability, common, and
extension Schemas accept the new declarations while preserving existing
message shapes.

New safe error codes include:

- `NO_COMMON_PROTOCOL_VERSION`
- `CORE_PROFILE_REQUIRED`
- `GOVERNED_PROFILE_REQUIRED`
- `NO_COMPATIBLE_AUTHENTICATION_MODE`
- `REQUIRED_EXTENSION_UNSUPPORTED`
- `INPUT_CONTRACT_VIOLATION`
- `OUTPUT_CONTRACT_VIOLATION`
- `AUTHENTICATION_REQUIRED`
- `AUTHORIZATION_DENIED`
- `IDEMPOTENCY_REQUIRED`
- `TASK_FAILED`

## Generic Host Client and Native Agent

The Native Client accepts an `installGrantResolver` instead of requiring a
user-entered endpoint. It supports issuer-key resolution, Host-supported
profiles, authentication modes and extensions, safe `previewInstall`, and an
object-form `install` operation with an approved capability subset.

The legacy base-URL and `(grant, scope)` overloads remain available for
technical backward compatibility. The public beginner path uses the generic
resolver-backed API.

Install processing now:

1. resolves an opaque grant through Host infrastructure;
2. validates discovery and Passport data;
3. negotiates a protocol version;
4. checks Core/Governed/profile and extension compatibility;
5. negotiates authentication;
6. shows a public-only preview;
7. enables only approved capabilities;
8. creates one idempotent scoped Connection.

The Native Agent advertises profile and authentication support, validates
bounded input/output contracts, enforces enabled capabilities, supports
connection revocation, and maps authorization, contract, and idempotency
failures to safe protocol errors.

## Independent compatibility fixtures

### CodeForge Provider and FlowDesk Host

- Provider package: `protocol/examples/codeforge-agent-provider`
- Host package: `protocol/examples/flowdesk-host`
- Verifier: `scripts/verifyUniversalAgentCompatibility.js`

The Host does not import CodeForge, branch on its name, use a provider adapter,
or use Backend/Platform DTOs. Communication is serialized through local HTTP.
The verifier proves discovery, Passport and Capability validation, profile and
extension compatibility, opaque grant resolution, safe preview,
authentication negotiation, idempotent installation, capability search,
Invocation, Task, output validation, Receipt verification, standard failure,
revocation, absence of user endpoint/credential input, absence of Native MCP,
and fixture cleanup.

### LedgerWorks Provider and OpsCanvas Host

- Provider: `protocol/examples/governed-host-agent/ledgerworks-provider.js`
- Host: `protocol/examples/governed-host-agent/opscanvas-host.js`
- Verifier: `scripts/verifyGovernedHostAgentCompatibility.js`

The direct Host-to-Agent proof covers organization and workspace isolation,
synthetic employee authorization, least-capability installation, Data Contract
enforcement, prohibited-field rejection, action-bound and expiring approval,
approval non-reuse, mandatory idempotency, one side effect on replay, durable
Task state, Receipt verification, revocation, and rejection after revocation.
It uses no agent-to-agent delegation.

## Conformance and Inspector

Conformance exposes `verify-core-c1`, `verify-core-c2`, `verify-core-c3`,
`verify-core`, `verify-governed-g1`, `verify-governed-g2`,
`verify-governed-g3`, and `verify-governed`. Old Level 1-3 commands remain
deprecated aliases. Delegation is absent from both active profile
requirements.

Inspector now prioritizes Connection, Passport, Profiles, Capabilities,
Install Preview, Authentication, Invocation, Tasks, Receipts, Revocation,
Messages, and Logs. Agent Coordination appears only in a separately labeled
Experimental section. Existing loopback restrictions, unsafe-remote
acknowledgement, URL credential rejection, message bounds, and redaction remain.

## Public product and documentation realignment

The homepage, North Star, root and protocol READMEs, specification overview,
participants, profiles, conformance, delegation status, SDK examples, Registry,
search, Ask Ghost Bridge, and generated `llms.txt`/`llms-full.txt` now lead with
universal Host-to-External-Agent integration.

The 98-page manifest begins with:

1. Get Started
2. Learn
3. Build with Ghost Bridge
4. Governed Execution
5. Reference

Two-agent, delegation, and orchestration content is retained under Future and
Experimental. The Registry shows profile and authentication compatibility,
Task/Approval/Receipt/revocation support, and “Add to Compatible Host” as the
primary action.

Safe route behavior:

- `/docs/build/client` redirects to `/docs/develop/build-host`.
- `/docs/develop/build-client` redirects to `/docs/develop/build-host`.
- `/examples` redirects to the CodeForge/FlowDesk example.
- Historical two-agent pages remain addressable in the Experimental group.
- All other Phase 15B public redirects remain.

## Migration and MCP status

All 17 `Backend/scripts/migrate*.js` files remain present and unchanged by
Phase 15B.1. The realignment verifier checks the migration diff and fails if a
historical migration changes.

Historical MCP compatibility remains quarantined as documented in
`docs/legacy/mcp-code-inventory.md`. No MCP file was deleted. Native packages
and the two new Host/Provider proofs have no MCP dependency or MCP URL input.

## Verification results

Passed:

- Root `npm test` across all workspaces.
- Root `npm run build`.
- `npm run build --workspace frontend` (1,685 modules).
- `verify:policy-engine`
- `verify:secret-governance`
- `verify:compliance-governance`
- `verify:orchestration`
- `verify:agent-selection`
- `verify:inter-agent-delegation` (retained experimental regression)
- `verify:orchestration-recovery`
- `verify:orchestration-observability`
- `verify:production-scale`
- `verify:data-access-performance`
- `verify:multi-region-dr`
- `verify:performance-capacity`
- `verify:release-readiness`
- `verify:staging-pilot-readiness`
- `verify:pilot-analytics-adoption`
- `verify:ga-commercial-readiness`
- `verify:ghostbridge-native-protocol`
- `verify:ghostbridge-sdk`
- `verify:ghostbridge-docs`
- `verify:ghostbridge-inspector`
- `verify:phase-15b-cleanup`
- `verify:ghostbridge-phase-15b`
- `verify:universal-agent-compatibility`
- `verify:governed-host-agent-compatibility`
- `verify:phase-15b-realignment`

Environment-bound results, not reported as passing:

- `verify:demo` failed with MongoDB `ETIMEOUT`.
- `verify:sandbox` did not complete in the 120-second validation batch while
  the configured MongoDB endpoint remained unreachable.
- `verify:enterprise-operations` did not complete within its 60-second
  validation window against the same unavailable database dependency.

No database assertion was removed or weakened. The same dependency was already
recorded in the Phase 15B completion report.

Per instruction, `verify:gemini-agent`, `verify:external-flow`, all performance
commands, migrations, deployment, and package publication were not run.
Grounded research remains disabled and non-billable.

The frontend build still emits a non-failing large-chunk warning; the current
main JavaScript chunk is approximately 902 kB before gzip.

## Known limitations and follow-up

- The protocol remains `ghostbridge/0.1-draft` and Experimental.
- No independent implementation or external security review is complete.
- The production issuer and cryptographic trust profile remain draft.
- Registry is a preview using deterministic public fixtures; public publishing
  is not enabled.
- Ask Ghost Bridge is deterministic local retrieval, not a live model.
- Packages remain private and unpublished.
- The configured MongoDB endpoint must be restored to complete the demo,
  sandbox, and enterprise-operations verification.
- Phase 15C should harden production trust and issuer behavior.
- Later phases should add independent implementation, certification hardening,
  external preview, security review, benchmarks, and approved migration/removal
  of historical compatibility code.
