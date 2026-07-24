# Phase 15B cleanup inventory

Created before Phase 15B deletion or restructuring. Items marked
`human_review_required` must not be deleted automatically.

| Category | File or module | Current purpose / known callers | Dynamic, route, export, test, and migration evidence | Replacement | Action | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| temporary Phase 15A scaffolding | `frontend/src/pages/ProtocolDocs.jsx` | Hard-coded placeholder public documentation selected by pathname | `/docs/*` route; frontend contract tests inspect public route separation; no migration | Canonical Phase 15B documentation manifest and renderer | consolidate | medium | completed |
| duplicate route metadata | `frontend/src/layouts/ProtocolDocsLayout.jsx`, `frontend/src/pages/ProtocolDocs.jsx`, `frontend/src/pages/ProtocolProjectPage.jsx` | Three independent public navigation/content maps | React Router imports; no package export or migration; `ProtocolProjectPage.jsx` had no remaining caller after manifest routing | One public content manifest; obsolete `ProtocolProjectPage.jsx` removed | consolidate | medium | completed |
| placeholder UI | `frontend/src/pages/ConsoleProtocolPlaceholder.jsx` | Honest Console placeholder for approval, receipt, security, and admin routes | Authenticated Console routes depend on it | Future Platform implementation | keep_and_document | low | retained |
| dead public link | `frontend/src/layouts/PublicProtocolLayout.jsx` GitHub link | Points to an unconfigured generic GitHub host | Public header only | Hide unless a real configured repository URL exists | refactor | low | completed |
| package boundary | Native package manifests | Public entry points rely on `main`/`types` without explicit export maps | All workspace consumers import package roots | Explicit `exports` maps and boundary verifier | refactor | medium | completed |
| temporary Phase 15A scaffolding | Native client and agent declaration surfaces | Draft methods omit several Phase 15B APIs and handler-context fields | SDK tests and examples import package roots | Backward-compatible production draft APIs | refactor | high | completed |
| duplicate utility | Protocol error interpretation | Client exposes only the base protocol error and repeats response mapping | Native client request path; no migration | Canonical typed SDK error mapping | consolidate | medium | completed |
| placeholder documentation | `docs/` public protocol material | Phase 15A pages are sparse and route metadata is duplicated in JSX | Public route references; llms index absent | Repository-controlled canonical public manifest and generated indexes | refactor | medium | completed |
| duplicate generated documentation | `docs/generated/llms.txt`, `docs/generated/llms-full.txt` | Duplicated the deployable `/llms.txt` and `/llms-full.txt` outputs | No route, package, script, test, or documentation consumer referenced these copies | Single deterministic build output in `frontend/public` | remove | low | completed |
| MCP-specific legacy code | `Backend/src/services/adapters/mcp.adapter.js` and adapter registry entry | Historical stored Runtime Gateway records | Static adapter registry import, regression tests, rollback and stored-record compatibility | None approved; Native packages are already independent | quarantine | high | retained |
| MCP-specific legacy code | historical runtime model enum fields | Reads existing Passport, Connection, Invocation, credential, and circuit-breaker records | Mongoose schemas and migrations may depend on values | Backward-compatible data migration and deprecation window | human_review_required | high | retained |
| MCP-specific legacy code | historical tool-import controller, route, and Runtime Gateway branch | Authenticated legacy Platform behavior | Route registration, service export, authorization and regression coverage | No fully verified replacement | human_review_required | high | retained |
| stale MCP Console content | historical Passport creation/detail/invocation screens | Authenticated legacy Platform compatibility, separate from Native installation | Console routes and stored runtime DTOs; no Native public route imports them | Future explicitly approved legacy migration | human_review_required | high | retained |
| generated artifact | `frontend/dist` | Local build output | Ignored by Git; not tracked | Recreated by Vite | keep | low | ignored |
| obsolete configuration | Gemini and external-flow configuration | Manual-only verification and external agent runtime | Scripts and tests still read it | None | keep_and_document | high | retained |
| applied migrations | `Backend/scripts/migrate*.js` (17 scripts) | Production-compatible historical schema evolution | Migration commands, checkpoints, and rollback evidence | None | keep | critical | retained |

## Canonical implementation decisions

- Portable protocol validation, versioning, redaction, serialization, extension
  negotiation, and public errors remain owned by
  `@ghostbridge/protocol-core`.
- Native transport/runtime behavior remains owned by the Native client and
  agent packages.
- Platform database, queue, policy, billing, and operations concerns remain
  outside portable packages.
- Public documentation route metadata, navigation, search, copy output,
  generated AI indexes, Registry Preview entries, extension entries, and GBEP
  entries will be derived from one public manifest.
- Authenticated Console routes remain separate and are never indexed as public
  documentation.

## Removal evidence policy

No ambiguous backend, persistence, migration, rollback, or historical
compatibility component is approved for deletion in this phase. Any later
deletion must add caller, route, export, test, migration, and rollback evidence
to this inventory before removal.
