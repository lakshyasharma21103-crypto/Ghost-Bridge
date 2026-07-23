# Pilot Analytics, Product Feedback, and Adoption Optimization

Phase 14B adds a deterministic, privacy-safe product-learning layer to the Phase 14A closed-pilot system. Analytics are evidence only: they are never an authentication, authorization, admission, scheduling, capability-gate, experiment, quota, rollout, or graduation authority. Missing analytics cannot weaken or block core correctness controls.

## Trust boundaries and classification

Event names, versions, properties, classifications, consent categories, sampling categories, projection targets, metrics, and funnel references come from the code-defined registry in `Backend/src/constants/pilotAnalytics.js`. Public clients cannot register events or set authoritative organization, workspace, release, gate, actor, or trusted outcome state.

The bounded classifications are `operational_metadata`, `product_usage`, `onboarding_progress`, `capability_usage`, `performance_summary`, `reliability_summary`, `support_summary`, `feedback_summary`, `experiment_exposure`, `experiment_outcome`, `sensitive_restricted`, and `prohibited`. Prohibited data includes credentials, tokens, cookies, connection strings, prompts, model responses, hidden reasoning, complete orchestration inputs or outputs, private rules, unrestricted support transcripts, and signed URLs.

Events use authenticated organization and workspace scope. Authorized internal subject references can be transformed into tenant-and-workspace-scoped HMAC pseudonyms. Email addresses are never analytics keys, pseudonyms are not authentication credentials, and infrastructure metric labels never include tenant, workspace, subject, event, experiment, request, or trace identifiers.

## Tracking plans, ingestion, and deduplication

`AnalyticsTrackingPlan` is durable and versioned. Drafts define a static event allowlist, required instrumentation, collection mode, retention/consent/redaction references, allowed classifications, size limits, property limits, and a bounded sampling policy. Active versions are immutable. Activation requires RBAC, policy authorization, and a governed approval.

Ingestion authenticates the source, resolves trusted scope, verifies Phase 14A program/tenant/workspace enrollment, resolves an active tracking plan, validates the code-defined event and version, enforces collection state and classification, validates plain-data properties, rejects prototype and executable objects, rejects secret material, derives a scoped deduplication key, inserts idempotently, and emits only safe audit and low-cardinality metric metadata. Duplicate retries return the existing event and never double-count projections.

Supported collection states are `disabled`, `minimal_operational`, `pilot_standard`, `enhanced_opt_in`, and `withdrawn`. Minimal collection accepts only necessary provider, gate, and quota metadata. Withdrawal stops optional analytics; required security and audit evidence remains governed separately. Enhanced collection requires the configured approval state. These controls are technical governance and do not claim legal compliance.

Raw bounded events expire earlier than aggregates by default. Tenant, workspace, and subject deletion is idempotent, legal holds preserve records, immutable audit evidence is separate, caches are invalidated by existing infrastructure, and affected projections must be corrected or rebuilt.

## Definitions, funnels, cohorts, and privacy

Metric definitions are versioned, have allowlisted aggregation functions, disclose numerator and denominator events, define eligible population and exclusions, and represent `unknown` and `insufficient_data` distinctly from zero. Rate and percentage metrics require a denominator.

Code-defined funnels cover onboarding, activation, orchestration value, and capability adoption. Evaluations disclose entered/completed counts, conversion denominator, duration category, and separate platform, gate, quota, provider, and voluntary drop-off categories. Provider-blocked grounded-research attempts are never treated as voluntary abandonment and usage alone is not presented as business ROI.

Cohorts are behavioral—not demographic—and use bounded dimensions such as onboarding week, release, workspace category, capability category, region category, and support-assistance category. Day 1, 7, 14, 30, and configured retention periods disclose cohort size and denominator. Breakdowns below the configured minimum are `suppressed_small_cohort`; missing evidence is `insufficient_data`. Dimensions that permit re-identification are prohibited.

Instrumentation coverage compares required definitions with observed valid events; definitions alone do not count as observations. Data-quality checks cover schema validity, duplicates, source-sequence gaps, time sanity, release consistency, tenant/workspace scope, capability validity, consent state, projection lag, and backfill status.

## Projections and backfills

Phase 14B registers daily usage, daily reliability, capability adoption, onboarding funnel, retention cohort, feedback theme, support trend, experiment, and readiness projections with the Phase 13E2 projection registry. Projection records are tenant-scoped, resumable from source-sequence checkpoints, fenced through the existing projection infrastructure, bounded by batch size, safe under replay, residency-aware, and explicitly non-authoritative.

Backfills accept only code-defined safe mappings from pilot enrollment, onboarding, orchestration transitions, gate/quota decisions, support, feedback, and incident records. They require bounded tenant and time scope, idempotency, policy evaluation, approval, audit, checkpoints, cancellation, and no unrestricted payload copying.

## Feedback and product learning

Feedback classification uses explicit submitter categories, bounded operator triage, and deterministic keyword suggestions only. No LLM is used. Final themes contain category keys, count categories, affected-capability keys, severity/trend/confidence categories, and evidence references—never unrestricted feedback text. Frequency is not claimed as root cause.

Triage priority is deterministic from severity, affected scope, recurrence, capability criticality, safety, onboarding/activation/reliability impact, support load, and workaround availability. Security and cross-tenant findings are always urgent.

Product opportunities require evidence links and remain advisory. Hypotheses are versioned, name expected and guardrail metrics, define direction, cohort, observation window, sample size, assumptions, and limitations.

## Experiments and guardrails

Pilot experiments are versioned and support only allowlisted experiment types and environments. Allocations total 10,000 basis points. Pilot execution needs explicit approval. Deterministic assignment uses a tenant-scoped keyed digest containing the experiment version and assignment unit; assignment is stable, not authorization, and not exposure.

Exposure is recorded idempotently only when the subject is eligible, the variant is actually applied, the feature and capability gate permit it, exclusions do not apply, and collection state allows it. Evaluation discloses sample denominator, observation window, variant counts, data quality, guardrails, and environment. It yields `positive`, `negative`, `neutral`, `inconclusive`, `stopped_guardrail`, `insufficient_data`, or `invalid_data` without LLM conclusions or automatic expansion.

Authentication, authorization, tenant isolation, encryption, stale-writer fencing, and residency are not experiment variables. Any core security finding stops an experiment immediately. Provider availability, failure/timeout rates, queue wait, recovery/compensation, support severity, capacity, and SLO degradation are bounded guardrails. Experiments cannot enable `external.grounded_research` while launch gates are blocked.

## Adoption, outage impact, and readiness

Adoption analysis distinguishes incomplete onboarding, discovery gaps, gate/provider/quota/policy blocks, approval wait, connection failures, unavailable agents, queue delay, runtime failure, documentation gaps, support dependency, and unknown causes. Correlation is not presented as causation.

The provider-impact summary records outage windows, bounded affected-request/scope categories, support and feedback counts, recovery time, gate state, and kill-switch state. The deterministic current fixture remains:

- Gemini provider unavailable;
- `external.grounded_research` disabled;
- external-flow verification deferred;
- core orchestration available.

Recommendations include evidence, metrics, funnels, confidence, benefit, risk, limitations, and owner metadata. They never change flags, quotas, capabilities, pilots, or graduation state. Expansion readiness evaluates onboarding, activation, repeat use, reliability, support, incidents, capacity, SLOs, data quality, gates, experiment guardrails, security, and provider availability. Core orchestration may be ready with restrictions while grounded research stays blocked.

## Snapshots, evidence, exports, and API

Analytics snapshots and product-learning evidence packages are canonical, digested, immutable artifacts containing bounded aggregate summaries. Exports contain definition metadata and aggregate usage, reliability, support, themes, experiments, recommendations, and readiness. They never contain event properties, individual identifiers, feedback text, credentials, provider material, prompts, model outputs, hidden reasoning, or customer payloads.

All `/api/pilot-analytics` and `/api/v1/pilot-analytics` routes require partner authentication, tenant/workspace/pilot scope, registered RBAC permission, policy evaluation, bounded input and pagination, safe output projection, mutation idempotency, audit, and approvals for privileged actions.

The console adds Pilot Analytics, Adoption Funnels, Cohorts & Retention, Capability Adoption, Feedback Insights, Experiments, Product Opportunities, and Data Quality views while preserving the compact operations style.

## Operations and verification

The migration is additive, idempotent, restart-safe, backward-compatible, and available as:

```text
npm run migrate:pilot-analytics
```

The deterministic non-billed verifier is:

```text
npm run verify:pilot-analytics-adoption
```

It uses fixed synthetic identities and time, never calls Gemini or another provider, proves tenant isolation and deduplication, rebuilds/resumes projections, exercises privacy suppression and experiment guardrails, and verifies safe artifacts and metrics.

Phase 14B does not enable grounded research, pass the manual Gemini or external-flow gates, deploy code, run a production experiment, invite users, expand a pilot, change quotas, or approve General Availability.

## Known limitations reserved for Phase 14C+

- Live instrumentation rollout coverage depends on future deployed release evidence.
- Advanced statistical inference beyond bounded deterministic comparison is not implemented.
- Real provider recovery and the Gemini/external-flow gates remain manual.
- Automatic product changes, pilot expansion, quota changes, and graduation are intentionally unsupported.
- Cross-pilot benchmarking and production customer analytics are out of scope.
