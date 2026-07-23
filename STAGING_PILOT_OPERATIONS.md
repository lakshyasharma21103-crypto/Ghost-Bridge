# Staging Deployment and Closed Pilot Operations

Phase 14A adds a provider-neutral control plane for preparing a staging deployment and operating a small, closed Ghost Bridge pilot. It does not deploy a cloud service, invite real users, send notifications, enable production flags, invoke Gemini, or approve unrestricted production launch.

## Trust boundaries

The application owns governed records, deterministic validation, approval references, audit events, capability decisions, pilot admission, redacted evidence, and safe operator views. Cloud deployment, DNS, load-balancer changes, Atlas topology, instance counts, real invitations, and real communication delivery remain external operations.

`MockDeploymentAdapter` is the automated staging fixture. `NoopDeploymentAdapter` refuses deployment and returns `PRODUCTION_DEPLOYMENT_DISABLED`. `manual_external` records an externally performed deployment only after an approval reference, bounded manual execution reference, and observed version evidence are supplied. Ghost Bridge reports the execution as external; it never claims to have performed it.

Pilot tenants, workspaces, and users retain the existing identity, RBAC, policy, approval, audit, queue, fencing, recovery, compensation, regional-authority, and release-readiness boundaries. Enrollment records do not provision a customer tenant or store passwords.

## Staging profile and preflight

`Backend/src/config/stagingProfile.js` validates a code-defined `14A.1` profile without returning environment values. A valid profile requires:

- a `staging` or approved `preproduction` category;
- HTTPS console and allowlisted CORS origins, secure cookies, and a valid trusted-proxy category;
- MongoDB configuration whose database name is not production without explicit approval;
- strong JWT, encryption, and runtime-token configuration;
- a service region, release-candidate identity, and manifest version;
- valid runtime timeout, execution lease, durable lease, and heartbeat ordering;
- a supported cache adapter;
- disabled arbitrary runtime URLs, customer-data import, fault injection, outbound-provider access, and load generation;
- authorized detailed health and production-equivalent log redaction.

The deterministic preflight shows every required dimension: approved release candidate, immutable release evidence, tracked-file secret scan, sanitized examples, startup fixture, lockfile, artifacts, compatibility, migrations, rollback, indexes, cache, projections, workers, routing, regions, DR, performance, capacity, ownership, runbooks, smoke plan, capability definitions, and unresolved live-provider gates. Missing evidence is `insufficient_evidence`; it is never inferred as healthy.

## Deployment lifecycle

Staging deployments move through the explicit state graph from `draft` and `validation_required` to validation, approval, observation, verification, health, rollback, and archive states. Invalid transitions fail closed. Request and trace IDs are retained, while credentials, authorization headers, environment values, cloud tokens, private hostnames, and private keys are prohibited.

Accepted orchestration work is not deleted during deployment. Existing durable queue claims, ownership epochs, fencing, routing versions, cancellation, checkpoints, recovery, and compensation remain authoritative. A staging rollback preserves authority epochs and completed external side effects; business side effects use compensation.

## Smoke-test plans

Smoke plans are versioned and active versions are immutable. They reference only the code-defined smoke-test registry. Arbitrary URLs, scripts, methods, headers, and bodies are rejected. Request, mutation, duration, and concurrency bounds are persisted.

The registry covers health, authentication, RBAC denial, tenant/workspace isolation, Agent Passports and Connections, orchestration submission, mock queue execution, cancellation, checkpoints, recovery, compensation, timeline/trace reads, alerts/incidents, cache and projections, worker drain and stale fencing, regional authority, feature flags, pilot denial, and support-bundle redaction. Grounded research is prohibited in automated plans and remains a separate manual, potentially billable gate. Synthetic fixtures use isolated identities and an explicit cleanup state.

## Capability gates and the Gemini outage

Code-defined capabilities include core identity/audit controls, orchestration modes, operational controls, grounded research, regional failover controls, restore controls, and manual performance tests. Code availability never grants pilot access. Gate evaluation also checks RBAC, policy, enrollment, release, region, classification, quotas, operational state, and kill switches.

`external.grounded_research` currently records:

- `verify:gemini-agent`: `blocked_provider_unavailable` or `failed_transient`;
- `verify:external-flow`: `not_run` or deferred;
- capability enabled: `false`.

These states are not passes. A waiver must have an owner, mitigation, scope, approval reference, and future expiration. A restricted waiver may document an outage mode, but it does not convert a failed gate to `passed` and it does not enable grounded research.

During provider outage mode the research control is hidden or denied with a stable safe code, bounded retry guidance, and no automatic retry storm. Core non-research orchestration remains available when its own gates pass. Operators can see provider health, and simulated tests never page real production channels.

## Pilot program lifecycle and policy

Pilot programs and policies are versioned; active versions are immutable. A program binds one approved release candidate, a healthy staging deployment, strict cohort limits, permitted regions and classifications, operational ownership, onboarding, success criteria, exit criteria, and required capability gates.

Pilot policy limits use the strictest value across platform, program, tenant, and workspace profiles. They cover organizations, workspaces, users, concurrent and daily runs, nodes, delegation, duration, input/output size, classification, residency, capabilities, retention, and support. Grounded-research quota is zero until its live gate passes.

Enrollment is separately durable for organizations, workspaces, and synthetic or existing identities. Workspace permissions and quotas cannot exceed the enrolled organization. Pilot identities cannot use enrollment metadata to access non-pilot tenants. Tenant and workspace scope is enforced on reads and mutations.

Onboarding checklists and operational acknowledgements record bounded status and safe evidence references, not secrets. Acknowledgements support pilot limitations, provider outage behavior, classification limits, non-critical-use expectations, feedback, support windows, and suspension rights; they are operational records, not a claim of legal compliance.

## Admission, pause, and kill switches

Pilot admission requires an active program, tenant, workspace, and membership; an enabled capability with a satisfied gate; pilot and platform quota; allowed classification and residency; a healthy region and valid write authority; and acceptable maintenance, freeze, incident, backpressure, and suspension state.

Stable denials distinguish enrollment, capability, gate, pilot quota, platform quota, residency, classification, operational state, and provider availability. Feature flags never bypass RBAC or policy.

A pilot, tenant, workspace, capability, or user may be paused. New admission stops, while accepted work and authentication, audit, incident response, support, cancellation, recovery, compensation, and evidence remain available. Bounded kill switches can stop new orchestration, external agents, grounded research, new delegations, noncritical projections, mutable pilot UI, or enrollment. They cannot disable authentication, audit, redaction, isolation, stale-writer fencing, incident response, cancellation, recovery, or compensation.

## Observation, readiness, support, and evidence

Observation windows persist bounded enrollment, usage, reliability, latency, queue, worker, database, cache, recovery, compensation, incident, support, feedback, capability, gate, and capacity summaries. They contain no raw customer payloads. Pilot health is `healthy`, `healthy_with_warnings`, `degraded`, `blocked`, `suspended`, or `unknown`; missing critical evidence is never healthy.

Daily reviews reference blockers, incidents, support cases, feedback, quota/capacity/gate findings, owners, actions, and the next review. Launch readiness is deterministic and reports dimensions plus blockers rather than a misleading standalone percentage. Security, tenant-isolation, authorization-bypass, and secret-exposure blockers cannot be accepted as ordinary risk.

Feedback ingestion redacts authorization headers, bearer/runtime/install tokens, API keys, database URIs, cookies, private keys, signed URLs, and credential fields. Support cases retain only a safe summary and tenant-scoped references. Incident origin is explicitly `simulated`, `staging`, or `pilot_real`; automated tests use only `simulated`.

Notification adapters are provider neutral. `MockNotificationAdapter` records synthetic delivery. `NoopNotificationAdapter` returns `manual_delivery_required`. A real email, chat, or SMS is never sent by Phase 14A.

Pilot evidence packages are canonical, redacted, digested, and immutable after approval. They summarize the release, staging deployment, smoke run, gates, onboarding, enrollment, usage, reliability, performance, capacity, incidents, support, feedback, security, SLOs, DR, provider status, blockers, approvals, waivers, and restricted launch decision. Raw prompts, responses, hidden reasoning, credentials, headers, keys, tokens, database URIs, and customer payloads are excluded.

## Graduation

Graduation closes the observation window, evaluates deterministic success and exit criteria, checks security/isolation/residency/stale-writer findings, SLOs, performance, capacity, support, ownership, runbooks, release readiness, and provider-dependent capabilities, then requires an approved evidence package and decision. Phase 14A records a graduation decision; it does not automatically convert tenants to unrestricted production.

Unresolved grounded-research gates do not block graduation of core orchestration when the restricted decision explicitly keeps research disabled. They do block grounded-research graduation.

## Operator commands

The additive index migration is restart safe:

```powershell
npm run migrate:staging-pilot
```

The dedicated verifier is deterministic, bounded, synthetic, and non-billed:

```powershell
npm run verify:staging-pilot-readiness
```

Do not include `verify:gemini-agent`, `verify:external-flow`, `perf:*`, or a real staging deployment in automated verification. Gemini and external-flow verification remain manual and potentially billable.

## Known limitations

- Real staging deployment, cloud version inspection, and real communication delivery remain manual/external boundaries.
- No customer tenant or user is provisioned or invited by this phase.
- The provider-outage fixture intentionally keeps grounded research disabled.
- Pilot dashboards show bounded operational metadata, not raw logs or payloads.
- Passing Phase 14A proves the local control plane and deterministic fixtures; it does not approve unrestricted production launch.
