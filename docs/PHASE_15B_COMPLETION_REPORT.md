# Phase 15B completion report

Date: 2026-07-24

Phase 15B delivers the Ghost Bridge Native production-draft TypeScript SDK
surface, a repository-owned developer documentation system, progressive
Capability Discovery, typed client failures, a local-only Inspector,
Extensions, Registry Preview, GBEP governance, an agent-development skill
pack, and deterministic verification. It preserves the experimental
`ghostbridge/0.1-draft` status and the Phase 15A Protocol/Platform boundary.

No package was published, no production environment was deployed, no live
provider verifier was run, and no performance load command was run.

## Source and workspace changes

This report describes Phase 15B changes, not every pre-existing Phase 15A
working-tree change.

### Workspaces

| Workspace | Result |
| --- | --- |
| `@ghostbridge/inspector` | Added as a private, unpublished workspace |
| `@ghostbridge/protocol-core` | Explicit exports, extension contracts and negotiation, cancellation code, declarations, tests |
| `@ghostbridge/native-client` | High-level lifecycle APIs, typed errors, Tasks, abort/deadline support, Receipt verification |
| `@ghostbridge/native-agent` | Governed handler context, Capability search/details, hooks, timeout/cancellation behavior |
| `@ghostbridge/conformance` | Explicit package boundary retained and verified |
| TypeScript examples | Added and compiled under `protocol/examples/typescript-sdk` |
| frontend | Replaced duplicated public documentation scaffolding with one manifest-driven system |
| backend | Phase 15A Native projection remains mapped through protocol-core; no portable SDK dependency on backend internals |

### Files created

- Inspector package source, declarations, CLI, UI, and tests under
  `packages/ghostbridge-inspector`.
- Canonical documentation metadata and engine under `frontend/src/docs`.
- Shared documentation components and dialogs under
  `frontend/src/components/docs`.
- Public documentation layouts and the manifest renderer.
- Generated deployable `frontend/public/llms.txt` and
  `frontend/public/llms-full.txt`.
- Phase 15B SDK, documentation, Inspector, aggregate, and cleanup verifiers in
  `scripts`.
- Extension JSON Schema at
  `protocol/schemas/0.1-draft/extension.schema.json`.
- Compilable Native agent/client TypeScript examples.
- GBEP process, template, index, GBEP-0001, and GBEP-0002 under `gbeps`.
- Portable agent-development skill and nine focused references under
  `skills/ghostbridge-agent-dev`.
- Cleanup baseline, cleanup inventory, and this completion report.

### Files modified

- Root package scripts, workspace configuration, build/test orchestration,
  lockfile, ignore rules, and README.
- Protocol-core, Native client, Native agent, and conformance package
  manifests, implementation files, declarations, and tests.
- Frontend route composition, public layouts/pages, styles, CSP metadata,
  optional repository-link configuration, and contract tests.
- Phase 15A backend Native routes/mapping remain the Platform projection and
  are covered by the aggregate verifier.
- The legacy MCP inventory was expanded with quarantine classifications and
  exact retention reasons.

## Public documentation system

The canonical manifest contains 79 public pages. Authenticated Console routes
are deliberately absent from it.

| Route family | Pages | Navigation purpose |
| --- | ---: | --- |
| `/docs/*` | 44 | Get started, learn, develop, core concepts, security, tools, examples |
| `/sdks/*` | 6 | TypeScript SDK overview and five package API references |
| `/extensions/*` | 8 | Framework, authoring, negotiation, lifecycle, and support |
| `/specification/*` | 3 | Specification landing, `0.1-draft`, and latest alias |
| `/registry/*` | 8 | Preview metadata, two reference agents, publishing boundary |
| `/gbeps/*` | 3 | Process index and two initial proposals |
| `/community/*` | 7 | Governance, contributing, reporting, roadmap, lifecycle |

The top navigation is Documentation, Extensions, Specification, Registry
Preview, GBEPs, and Community. Legacy public paths are preserved as explicit
redirects to canonical manifest routes. Console routing and authentication
remain separate.

### Components and accessibility

The shared library includes titles and descriptions, state/version badges,
callouts, steps, keyboard-accessible tabs, code groups and copy controls,
cards, definition/support tables, protocol/schema examples, safe diagrams,
notices, breadcrumbs, on-page navigation, and previous/next navigation.

The public shell provides a skip link, visible focus states, semantic
navigation, responsive three-column layout, mobile navigation and TOC,
focus-trapped dialogs, Escape handling, keyboard search, reduced-motion
support, and light/dark themes. Documentation content is rendered as typed
React data; it does not inject untrusted HTML.

### Search, Ask, copy, and generated indexes

- Search uses deterministic weighted token, prefix, and bounded typo-tolerant
  matching over the canonical manifest. Results remain grouped and link to
  exact pages.
- Ask Ghost Bridge is retrieval-only. It returns cited documentation sections
  and an explicit low-confidence result; it does not call a model or invent an
  answer.
- `Ctrl/Cmd+K` opens search. The search and Ask dialogs trap focus and restore
  it when closed.
- Copy Page serializes the current manifest page to Markdown. Code blocks have
  separate copy controls.
- The version selector exposes the only supported protocol revision and does
  not imply silent negotiation or stability.
- `npm run generate:docs-index` validates the manifest and deterministically
  creates the deployable `/llms.txt` and `/llms-full.txt` assets from the same
  source. Duplicate generated copies were removed.

## SDK and protocol

### Protocol core

- Added explicit public export maps and retained one canonical protocol
  boundary.
- Added extension identifiers, declarations, lifecycle states, validation, and
  deterministic negotiation.
- Added `TASK_CANCELLED` and typed declaration coverage.
- Added the sixteenth public Schema for extension declarations.
- Kept portable validation independent of backend models, persistence,
  queues, UI, providers, and legacy adapters.

### Native client

- Added version negotiation, progressive Capability search/details,
  high-level invoke options, `invokeAndWait`, bounded task polling,
  `watchTask` as an async iterable, cancellation through `AbortSignal`,
  Receipt verification, retry classification, and explicit `close()`.
- Preserved the Phase 15A direct invocation shape for compatibility.
- Corrected nested revocation endpoint construction.
- Maps bounded protocol responses to specific errors:
  `ProtocolValidationError`, `UnsupportedProtocolVersionError`,
  `PassportValidationError`, `InstallGrantError`,
  `CapabilityNotFoundError`, `ScopeMismatchError`, `DelegationError`,
  `DataContractViolationError`, `ApprovalRequiredError`,
  `DeadlineExceededError`, `TaskCancelledError`, `RevokedError`,
  `RateLimitedError`, and `ProviderUnavailableError`.
- Error objects retain safe codes, retry guidance, and correlation data
  without exposing credentials or unrestricted remote details.

### Native agent and progressive Capability Discovery

- Supports capability registration through the production-draft API and a
  backward-compatible shorthand.
- Performs Organization/Workspace scope filtering before ranking.
- Provides bounded `searchCapabilities` and `getCapabilityDetails` routes with
  pagination/cursors, enabling Catalog -> Inspect -> Authorize -> Invoke.
- Handler context includes scope, invocation/task IDs, initiating subject,
  deadline, idempotency, trace, approval/delegation references,
  `AbortSignal`, and a redacting logger.
- Adds authorization, approval, logger, and metrics hooks plus bounded handler
  timeout and `close()`.

### Tutorials and examples

The docs include build-agent, build-client, connect-two-agents, Agent Skills,
discovery, orchestration, typed-error, authentication, authorization,
Inspector, and debugging tutorials. The new Native agent and client
TypeScript examples compile with the repository compiler configuration.

## Inspector

`@ghostbridge/inspector` provides a local CLI/API and loopback-only UI for
discovery, Passport, Capability, installation, Invocation, Task, Data
Contract, approval, Receipt, and revocation inspection.

Inspector sanitizes timelines and logs, rejects credentials embedded in target
URLs, listens on loopback, and rejects remote targets unless both explicit
unsafe-remote acknowledgements are supplied. Its UI uses a restrictive CSP.
The workspace is private and unpublished; session artifacts are ignored.

## Extensions, Registry Preview, and governance

- Extensions have namespaced identifiers, independent versions, explicit
  negotiation, compatibility rules, and Experimental, Candidate, Official,
  Deprecated, and Removed states.
- The support matrix is generated from canonical manifest metadata. Phase 15B
  includes one reference official-namespace entry and makes no stability
  claim.
- Registry Preview projects public, non-secret metadata for the deterministic
  Invoice and Accounting reference agents. Publishing is documentation-only:
  there is no self-service publishing, DNS verification, marketplace, or
  checkout.
- GBEP-0001 defines the initial proposal process. GBEP-0002 defines extension
  lifecycle governance. Community pages state the current repository-owned
  governance boundary without claiming neutral-standard status.
- `ghostbridge-agent-dev` is a concise SKILL.md with progressive disclosure
  through nine one-level references covering Passports, capabilities, data,
  delegation, approvals, Receipts, security, and testing. Manual structural
  checks passed. The optional upstream `quick_validate.py` could not start
  because PyYAML is not installed on the host; no global dependency was added.

## Verification

| Verification | Result |
| --- | --- |
| Root `npm test` | PASS: 943 tests, 0 failures |
| Root `npm run build` | PASS; TypeScript examples compiled |
| Frontend production build | PASS: 1,685 modules transformed |
| `verify:ghostbridge-sdk` | PASS |
| `verify:ghostbridge-docs` | PASS |
| `verify:ghostbridge-inspector` | PASS |
| `verify:ghostbridge-native-protocol` | PASS |
| `verify:phase-15b-cleanup` | PASS |
| `verify:ghostbridge-phase-15b` | PASS |
| 14 deterministic legacy governance/orchestration/scale verifiers | PASS |
| `verify:release-readiness` | PASS |
| `verify:staging-pilot-readiness` | PASS |

The 14-verifier compatibility group covered policy, secrets, compliance,
orchestration, agent selection, delegation, recovery, observability,
production scale, data access, multi-region DR, capacity, pilot analytics, and
GA commercial readiness.

`verify:enterprise-operations` passed all product assertions and then failed
its required database health assertion because the configured MongoDB endpoint
timed out. `verify:demo` failed at the same prerequisite. The grouped
`verify:sandbox` attempt could not complete before the command timeout because
the same endpoint was unreachable. These are not reported as passing. No
assertion was removed and no database requirement was weakened.

`verify:gemini-agent` and `verify:external-flow` remain manual-only and were
not run. Grounded research remains disabled and non-billable. No performance
or load command was run.

### Security and package-boundary evidence

The Phase 15B verifiers cover local Inspector restrictions, URL credential
rejection, redaction, Organization/Workspace filtering, extension validation,
explicit package exports, absence of Native MCP imports/dependencies/URL
installation fields, public-link integrity, placeholder-action detection,
tracked environment files, generated artifacts, and grounded-research state.
The repository secret-shaped scan found no tracked real `.env` file or exposed
credential artifact. Its seven matches were the placeholder-only
`Backend/.env.example` URI and synthetic credential/private-key strings in
redaction and unsafe-input tests.

## Safe cleanup

The baseline and approval inventory were created before restructuring.

| Measure | Result |
| --- | --- |
| Files deleted | 3 |
| Named source/package files consolidated or refactored | 10, plus the manifest-driven documentation corpus |
| Risk-sensitive files intentionally retained | 35: 18 named historical MCP compatibility files and 17 migration scripts |
| Inventory categories requiring human review/owner approval | 4 |
| MCP files deleted | 0 |
| MCP inventory categories quarantined/retained | 8 |

Deleted:

1. `frontend/src/pages/ProtocolProjectPage.jsx`: no remaining import, route,
   export consumer, or test after canonical manifest routing.
2. `docs/generated/llms.txt`: unconsumed duplicate of the deployable generated
   public asset.
3. `docs/generated/llms-full.txt`: unconsumed duplicate of the deployable
   generated public asset.

Canonical replacements:

- `docsManifest.js` owns public routes, metadata, navigation, search, copy
  output, generated indexes, extensions, Registry Preview, and GBEP entries.
- Protocol-core owns portable protocol and extension validation.
- Native client owns client response-to-error mapping.
- Native agent owns transport/runtime handler behavior.
- Backend Native mapping remains the only Platform projection from persistent
  records to portable DTOs.

Retained MCP compatibility:

- Adapter and registry entry: stored Runtime Gateway records may still select
  the historical runtime.
- Model enum values: persisted Passports, Connections, Invocations, attempts,
  bindings, and circuit-breaker evidence require migration and rollback
  analysis.
- Passport validator allowance: historical v1 records still require safe
  validation.
- Tool-import controller, route, and Runtime Gateway branch: authenticated
  customer behavior and security regression coverage still exist.
- Five authenticated Console views: they operate historical Platform records
  and are not part of the Native public installation flow.
- MCP regression test: it protects the quarantined behavior until removal.
- Historical error/response allowlists: compatibility evidence is ambiguous
  and requires human review.

All 17 `Backend/scripts/migrate*.js` files were intentionally preserved.
Backward-compatible public redirects were preserved. Native package-boundary
checks, public-link checks, secret checks, and `verify:phase-15b-cleanup`
passed. This cleanup does not claim that the entire historical Platform has
zero dead code.

## Known limitations and Phase 15C

- The protocol, SDK, extensions, and GBEP process remain experimental.
- There is no independent implementation or external security review.
- The production cryptographic trust profile remains draft.
- Registry is preview-only and has no public publishing workflow.
- Ask Ghost Bridge is local deterministic retrieval, not a live model.
- Packages are private/unpublished and no production deployment occurred.
- The frontend build emits a non-failing 879.25 kB chunk warning; route-level
  public/Console splitting remains future work.
- `npm install` reported six dependency-audit findings (1 low, 2 moderate,
  3 high). They require scoped dependency triage; no broad automatic audit fix
  was applied.
- The configured MongoDB endpoint must be restored before the demo, sandbox,
  and complete enterprise-operations database verifiers can pass.
- Phase 15C should address independent implementation, security review,
  cryptographic trust-profile hardening, Registry publishing governance,
  package publication readiness, frontend chunk splitting, dependency audit
  triage, and any approved legacy MCP data migration/removal.
