# Capability Discovery and Governed Agent Selection

Phase 13D2 adds tenant-safe discovery and deterministic selection for installed Agent Passports. It derives a bounded `CapabilityCatalogEntry` from canonical `AgentPassport`, `Capability`, and `PassportConnection` records plus cached health/circuit signals and administrator-verified attributes. It does not crawl external marketplaces, contact candidate runtimes, duplicate credentials, or create a second invocation path.

## Security and trust boundaries

Catalog materialization has a strict safe-field allowlist. It excludes runtime endpoints, credentials and ciphertext, install keys, provider keys, tokens, prompts, source, private memory, and hidden reasoning. Passport descriptions and claims never set trust, cost, latency, residency, reliability, or administrative preference. Those values remain conservative until a caller with `agentTrust.manage` records bounded workspace-scoped metadata; all changes are audited.

Discovery performs organization/workspace scoping before policy visibility checks. Inaccessible references return the same safe not-found/unavailable result, and excluded candidate details are aggregated. Normal APIs return only counts such as `policyDenied`, `schemaIncompatible`, `unhealthy`, and `trustInsufficient`.

Operational signals are cached from existing connection health and circuit-breaker state. `AGENT_SELECTION_HEALTH_FRESHNESS_MS` defaults to five minutes. Older snapshots are marked stale and fail policies requiring current health; discovery never probes runtimes.

## Models and versioning

- `CapabilityCatalogEntry`: idempotent materialization keyed by tenant/workspace/connection, with normalized structural schemas, availability, verified administrative metadata, and cached operational state.
- `AgentSelectionPolicy`: draft/active/archived name/version records. Editing active policy creates a new draft. Activation requires RBAC, central policy authorization, operational guards, reference validation, bounded integer weights, and the fixed tie breaker.
- `AgentSelectionDecision`: immutable request constraints, policy version, canonical candidate-snapshot digest, aggregate counts, selected safe identifiers/score, deterministic fallbacks, reason codes, and operational timestamp. Only orchestration/approval linkage and terminal approval status are mutable.

Indexes cover unique catalog connections, capability/operation lookup, trust, health/readiness, refresh scheduling, policy tenant/status/version, decision tenant/status, run/node linkage, and selected IDs. `npm run migrate:agent-selection` creates indexes and idempotently marks legacy Phase 13D1 orchestration records as pinned.

## Compatibility and deterministic selection

Capability normalization accepts bounded safe keys, unique operation keys, semantic versions, structural schemas, and bounded categories/descriptions. It rejects duplicate declarations, unsafe prototypes and protected fields, executable-looking metadata, invalid schemas, and oversized input. Schema annotations are removed from the catalog.

Compatibility conservatively supports JSON Schema types/nullability, objects and required properties, `additionalProperties`, arrays/items, enums/const, nested structures, and numeric/string/array bounds. `$ref`, combinators, conditionals, regex patterns, formats, tuple/contains, pattern/dependent/unevaluated properties, or missing type evidence return `uncertain`. Uncertain is excluded unless the active policy explicitly allows it. The implementation does not claim full formal schema equivalence.

Selection applies mandatory filters before any scoring: tenant/workspace, lifecycle and connection state, capability/operation, schema result, central policy, allow/deny, trust/verification, data classification, region/residency, cost/latency, health/readiness freshness, circuit, and rate limit. The scorer then uses integer component scores from 0–10,000 and bounded integer weights for schema, trust, health, readiness, latency, cost, publisher verification, administrative preference, and reliability.

The final integer score is `floor(sum(component * weight) / sum(weights))`. No random values, floating ranker, LLM, description text, or agent-provided confidence participates. Ties resolve by score descending, trust descending, verification descending, passport ID ascending, then connection ID ascending. Candidate snapshot digest input is sorted by connection ID and remains stable across process restarts.

## Orchestration and approval

Nodes support exactly one target:

- `pinned`: existing `connectionId` plus `passportId` behavior remains unchanged.
- `governed_selection`: `selectionPolicyId`, capability/operation, constraints, preferences/exclusions, and bounded fallback count.

Phase 13D2 selects only at run creation. The selected connection, passport/version, policy version, decision ID, and recorded fallbacks enter the immutable run snapshot. Node retries use those frozen IDs and never replace a candidate. Before every invocation the worker rechecks the connection, passport/version, enabled capability, active frozen selection-policy version, central execution policy, and operational state, then calls only the existing Runtime Gateway.

If normal approval workflows or selection-policy triggers require review, the decision links a standard `ApprovalRequest`, the node waits without invocation, and approval resolution durably resumes it. Rejection/expiry produces a terminal rejected decision and failed node. Approval summaries contain safe identifiers and categories only.

## API and console

All routes use Partner authentication and existing RBAC/policy conventions under `/api/v1`:

- discovery: `GET /agent-discovery/capabilities`, `GET /agent-discovery/agents`, `GET /agent-discovery/agents/:connectionId`, `POST /agent-discovery/compatibility/check`;
- policies: create/list/get/update/validate/activate/archive under `/agent-selection/policies`;
- decisions: `POST /agent-selection/evaluate`, list/get under `/agent-selection/decisions`;
- trust: verify and trust-tier administration under `/agent-selection/agents/:connectionId`.

Permission Registry v7 adds separate discovery, evaluate, policy read/create/update/activate, decision read/details, and trust-management permissions. Normal orchestration operators do not receive trust management.

The compact console includes Agent Discovery and safe detail, Selection Policies and editor, Selection Decisions and detail, plus pinned/governed target information in orchestration definitions.

## Verification and deferred work

`npm run verify:agent-selection` is deterministic and non-billed. It proves normalization, trust filtering, compatibility, lower verified-cost selection, repeatability, tie/fallback ordering, governed snapshot freezing, retry retention, secret exclusion, no-candidate, approval-required, isolation, and cleanup. It does not call Gemini, an external agent, or any runtime.

Reserved for Phase 13D3 or later: live external marketplace discovery, automatic retry reselection, explicit governed reselection workflows, full JSON Schema subsumption, runtime probing during discovery, global cross-tenant ranking, learned/LLM scoring, and graphical marketplace or drag-and-drop design.
