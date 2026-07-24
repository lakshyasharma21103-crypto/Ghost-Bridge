# Phase 15B.1 realignment inventory

Created: 2026-07-24

This inventory was recorded before Phase 15B.1 realignment. It maps every
active public surface found to present direct agent-to-agent coordination as a
primary Ghost Bridge use case. Working coordination code, schemas, historical
Platform behavior, migrations, and regression tests are retained unless this
table contains complete removal evidence.

| Category | File or module | Current wording or behavior | Current placement | Replacement or placement | Code behavior changes | Migration risk | Tests affected | Action | Final status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| homepage wording | `frontend/src/pages/ProtocolHome.jsx` | Hero leads with connecting agents, limiting delegation, and agent-to-agent communication | primary | Host Application installs and invokes External Agent; Core and Governed profiles lead | presentation only | low | frontend Phase 15B/15B.1 contracts | replace | approved |
| homepage diagram | `frontend/src/pages/ProtocolHome.jsx` | Lifecycle places Delegation in the primary sequence | primary | Agent Provider -> Passport/Contracts/Grant -> Host -> User install -> host invocation | presentation only | low | frontend build and route contracts | replace | approved |
| homepage cards | `frontend/src/pages/ProtocolHome.jsx` | Start Building points to Build Client and the copy promotes orchestration/delegation | primary | Build an Agent, Build a Host, Add an External Agent, conformance | presentation only | low | frontend contracts | rename | approved |
| documentation opening | `frontend/src/docs/docsManifest.js` What is Ghost Bridge | Delegation and agent coordination are core opening concepts | primary | Universal host-to-external-agent compatibility and CodeForge/FlowDesk synthetic flow | content and search ranking | low | docs verifier, search, Ask, llms | replace | approved |
| quickstart | `frontend/src/docs/docsManifest.js` Quickstart | Runs the Invoice-to-Accounting two-agent workflow | Get Started | Generic CodeForge provider and FlowDesk host installation/invocation | example path changes | medium | docs and example verification | replace | approved |
| sidebar entry | `frontend/src/docs/docsManifest.js` groups | Two-Agent Tutorial is in Get Started; Connect Two Agents and Orchestration are primary development entries | primary | Move coordination pages under Future and Experimental with deferred notices | navigation/search category | low | manifest and redirect tests | move_to_experimental | approved |
| beginner terminology | `/docs/develop/build-client` | Beginner title is Build a Client | primary | Canonical `/docs/develop/build-host`; preserve redirect from build-client | route/content | low | route and redirect tests | redirect | approved |
| flagship tutorial | documentation manifest | No Add External Agent tutorial | absent | `/docs/get-started/add-external-agent` using the real generic fixture path | new content | none | docs/realignment verifier | keep_primary | approved |
| provider guide | documentation manifest | No canonical publish-compatibility guide | absent | `/docs/develop/publish-agent-compatibility` | new content | none | docs verifier | keep_primary | approved |
| governed documentation | documentation manifest | Governed controls are split across Core/Security and include Delegation in authorization steps | mixed | Dedicated Governed Execution group with no agent-to-agent requirement | content/navigation | low | docs/search/Ask | keep_governed | approved |
| tutorial | `/docs/develop/connect-two-agents`, `/docs/examples/two-agent-workflow` | Direct delegation workflow is presented as an ordinary development path | primary | Experimental Agent Coordination pages with prominent Deferred status | no runtime deletion | medium | existing compilation and Native verifier | move_to_experimental | approved |
| SDK examples | `protocol/examples/typescript-sdk/*` | Native agent/client roles use Invoice/Accounting context | primary | Explicit Agent Provider and Host Application examples; retain experimental two-agent example | example code changes | low | TypeScript compilation | rename | approved |
| protocol README | `protocol/README.md` | Primary lifecycle includes DELEGATE before invocation | primary | Core/Governed lifecycle; coordination listed separately as Experimental/Deferred | content only | low | realignment verifier | replace | approved |
| specification wording | `protocol/specification/0.1-draft/{overview,architecture,conformance,terminology}.md` | Delegation is described alongside required base behavior and Level 3 | primary | Core C1-C3, Governed G1-G3, Experimental A1-A3 | normative profile metadata/content | medium | conformance tests | replace | approved |
| public schema description | discovery, Passport, capability, invocation, Receipt, revocation, and Delegation schemas | Delegation support is a required discovery feature and coordination fields lack explicit status | primary/mixed | Add bounded profile declarations; keep optional experimental coordination fields/schemas | backward-compatible schema additions | medium | schema compilation and existing fixtures | move_to_experimental | approved |
| protocol-core API | `@ghostbridge/protocol-core` | No profile parser, authentication negotiation, or generic compatibility checker | absent | Canonical profiles, compatibility diagnostics, install preview, safe standard errors | additive public API | medium | core/client/conformance tests | keep_primary | approved |
| Native client | `@ghostbridge/native-client` | Base URL is user-supplied and install takes `(grant, scope)` only | technical primary | Add resolver-backed generic `previewInstall` and object-form `install`; preserve old overload | additive, backward compatible | high | client, SDK, universal fixture | keep_primary | approved |
| Native agent discovery | `@ghostbridge/native-agent` | Discovery advertises delegation as a top-level required feature | primary | Advertise Core/Governed support and Experimental/Deferred coordination | backward-compatible discovery field | medium | agent/schema/native verifier | replace | approved |
| conformance level | `@ghostbridge/conformance` and `protocol/specification/0.1-draft/conformance.md` | Level 3 requires Delegation, Data Contract, and Approval together | primary | Core C1-C3 and Governed G1-G3; old levels become deprecation aliases | command routing changes with aliases | medium | conformance unit/integration tests | deprecate | approved |
| Inspector workflow | `@ghostbridge/inspector` | Default tab list includes Delegation; no Profiles or Authentication step | primary | Host-to-agent workflow; Profiles and Authentication primary; coordination under Experimental | API/UI additions | low | Inspector verifier/tests | move_to_experimental | approved |
| Registry wording | manifest Registry fixtures and `ProtocolDocs.jsx` | Conformance is one draft level and pages do not answer host compatibility | primary | Profile/authentication/extension support, deterministic compatibility summary, Add to Compatible Host action | public projection/content | low | docs/Registry tests | replace | approved |
| extension documentation | manifest and specification extensions pages | Extensions do not declare applicable profiles | active | Require applicable profile metadata; optional coordination extensions degrade safely | validation/schema addition | medium | core/schema tests | keep_primary | approved |
| llms.txt content | generated from manifest | Agent coordination and two-agent tutorial rank in primary documentation | primary index | Host-to-external-agent definition first; coordination under Future and Experimental | generated output | low | docs/realignment verifier | replace | approved |
| search aliases | manifest metadata | Connect-agent searches emphasize two-agent coordination | primary index | Add External Agent ranks first; experimental result remains distinguishable | metadata/search | low | search tests | replace | approved |
| Ask Ghost Bridge | deterministic manifest retrieval | Cross-company host question has no canonical high-confidence page | absent | Flagship universal-install page supplies exact generic sequence | retrieval content | low | Ask tests | keep_primary | approved |
| roadmap wording | public Community roadmap, README, and internal North Star | Phase 15B direction does not identify the Core/Governed realignment | active | Mark Phase 15B.1 current, Phase 15C next, Agent Coordination future | content only | low | docs verifier | replace | approved |
| verifier output | Native/SDK verifier | Scoped Delegation Grant is in the headline Native proof | primary verifier | Retain as experimental regression; new universal and governed verifiers define active promise | new verifiers; old behavior retained | medium | root verifier matrix | move_to_experimental | approved |
| coordination implementation | Delegation schema, Native agent registration, two-agent workflow, backend orchestration/delegation services | Working experimental and historical functionality | runtime/test | Quarantine in `docs/experimental/agent-coordination.md`; exclude from Core/Governed requirements | no deletion | critical | security, migration, historical tests | human_review_required | retained |
| database migrations | `Backend/scripts/migrate*.js` (17 files) | Applied migration and rollback-compatible operational history | internal | Preserve byte-for-byte | none | critical | release/operations verifiers | human_review_required | retained |
| MCP quarantine | `docs/legacy/mcp-code-inventory.md` and named compatibility modules | Historical Platform compatibility | internal | No Phase 15B.1 feature work; remain absent from Native packages and public install path | none | critical | legacy runtime/security tests | human_review_required | retained |
| screenshots/assets | public docs/frontend | No agent-coordination screenshot or bitmap asset was found | none | No action | none | none | none | keep_primary | not_applicable |

## Canonical mappings

| Previous primary concept | Phase 15B.1 placement |
| --- | --- |
| Client | Host Client in technical APIs; Host Application in beginner content |
| Agent vendor | Agent Provider |
| Installed agent | External Agent installed by a Host Application |
| Level 1 | Deprecated alias for Core C1 |
| Level 2 | Deprecated alias covering Core C1-C3 |
| Level 3 | Deprecated legacy aggregate; not evidence of Governed conformance |
| Delegation / two-agent workflow | Experimental Agent Coordination |
| Data Contract and Approval | Governed Execution G2 |
| Tasks, Receipt, idempotency, cancellation | Core C3 where basic/declared; Governed G3 for durable/evidence requirements |

## Safety boundary

- No migration, historical audit structure, coordination schema, approval,
  idempotency, Receipt, revocation, Organization, or Workspace test is approved
  for deletion.
- No provider-specific adapter was found in the Native packages; the new proof
  must preserve that boundary.
- Generated docs may be replaced only through the canonical generator.
- Manual live-provider and performance commands remain excluded.
