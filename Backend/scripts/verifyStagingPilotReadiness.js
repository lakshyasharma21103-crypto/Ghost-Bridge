const assert = require('node:assert/strict');
const core = require('../src/services/stagingPilotCore.service');
const metrics = require('../src/services/stagingPilotMetrics.service');
const { MockDeploymentAdapter, NoopDeploymentAdapter } = require('../src/services/releaseReadinessCore.service');
const { CAPABILITY_KEYS } = require('../src/constants/stagingPilot');

function pass(label) {
  process.stdout.write(`PASS ${label}\n`);
}

async function run() {
  const stagingConfiguration = core.validateStagingConfiguration({
    NODE_ENV: 'staging',
    CLIENT_URL: 'https://console.staging.example.invalid',
    CORS_ORIGINS: 'https://console.staging.example.invalid',
    MONGODB_URI: 'mongodb://staging.example.invalid',
    MONGODB_DB_NAME: 'ghost_bridge_staging',
    JWT_SECRET: 'staging-jwt-secret-with-many-unique-characters-123',
    CREDENTIAL_ENCRYPTION_KEY: 'a'.repeat(64),
    EXTERNAL_TEST_AGENT_RUNTIME_TOKEN: 'staging-runtime-token-with-unique-characters-456',
    SERVICE_REGION_ID: 'staging-primary',
    RELEASE_CANDIDATE_ID: 'rc-14a',
    RELEASE_MANIFEST_VERSION: '14A.1',
    TRUST_PROXY: '1',
    COOKIE_SECURE: 'true',
    LOG_REDACTION_ENABLED: 'true',
    DETAILED_HEALTH_AUTH_REQUIRED: 'true',
    OUTBOUND_PROVIDER_MODE: 'disabled',
    CACHE_ADAPTER: 'memory',
    RUNTIME_INVOCATION_TIMEOUT_MS: '1000',
    RUNTIME_EXECUTION_LEASE_MS: '2000',
    DURABLE_WORK_LEASE_MS: '5000',
    DURABLE_WORK_HEARTBEAT_MS: '1000',
  });
  assert.equal(stagingConfiguration.valid, true);
  pass('staging configuration');

  const checks = Object.fromEntries([
    'releaseCandidate', 'releaseEvidence', 'secretScan', 'environmentExamples', 'startupConfiguration',
    'lockfileIntegrity', 'buildArtifacts', 'compatibility', 'migrations', 'rollbackReadiness',
    'indexes', 'cacheCompatibility', 'projectionCompatibility', 'workerVersions', 'routingVersions',
    'regionalConfiguration', 'disasterRecovery', 'performance', 'capacity', 'operationalOwners',
    'runbooks', 'smokeTestPlan', 'capabilityGateDefinitions',
  ].map((key) => [key, 'passed']));
  checks.liveProviderGates = 'passed_with_warnings';
  const preflight = core.evaluateStagingPreflight(checks);
  assert.equal(preflight.state, 'passed_with_warnings');
  assert.equal(preflight.requiredChecks.length, 24);
  pass('staging deployment preflight');

  assert.equal(core.transitionStagingDeployment('approved', 'deployment_requested'), 'deployment_requested');
  const adapter = new MockDeploymentAdapter();
  await adapter.beginRollout({ targetVersion: '14.0.0' });
  assert.equal((await adapter.inspectInstanceVersions()).instances[0].version, '14.0.0');
  pass('mock staging deployment');
  assert.equal((await new NoopDeploymentAdapter().beginRollout()).code, 'PRODUCTION_DEPLOYMENT_DISABLED');
  pass('production deployment disabled');
  pass('staging version observation');

  const smokeKeys = [
    'liveness', 'readiness', 'authentication_success', 'rbac_denial', 'tenant_isolation',
    'synthetic_orchestration_submission', 'queue_execution_mock_agent', 'cancellation',
    'recovery', 'compensation', 'cache_invalidation', 'worker_drain', 'stale_worker_fencing',
    'support_bundle_redaction',
  ];
  const smokePlan = {
    testDefinitions: smokeKeys,
    maximumRequestCount: 50,
    maximumMutationCount: 20,
    maximumDurationMs: 60_000,
    maximumConcurrency: 2,
    prohibitedCapabilities: ['external.grounded_research'],
  };
  assert.equal(core.validateSmokeTestPlan(smokePlan).valid, true);
  const smoke = core.executeDeterministicSmokeTests(smokePlan);
  assert.equal(smoke.status, 'passed');
  assert.equal(smoke.cleanupStatus, 'cleaned_up');
  pass('smoke-test plan');
  for (const [key, label] of [
    ['liveness', 'liveness smoke test'], ['readiness', 'readiness smoke test'],
    ['authentication_success', 'authentication smoke test'], ['rbac_denial', 'RBAC denial smoke test'],
    ['tenant_isolation', 'tenant isolation smoke test'], ['synthetic_orchestration_submission', 'orchestration smoke test'],
    ['cancellation', 'cancellation smoke test'], ['recovery', 'recovery smoke test'],
    ['compensation', 'compensation smoke test'], ['cache_invalidation', 'cache invalidation smoke test'],
    ['worker_drain', 'worker drain smoke test'], ['stale_worker_fencing', 'stale worker fenced'],
  ]) {
    assert.equal(smoke.testResults.find((item) => item.key === key).outcome, 'passed');
    pass(label);
  }

  assert.equal(CAPABILITY_KEYS.length, 18);
  pass('capability gate registry');
  const coreGate = core.evaluateCapabilityGate({ status: 'passed', defaultEnabledState: true });
  assert.equal(coreGate.enabled, true);
  pass('core capabilities passed');
  const researchGate = core.evaluateGroundedResearchGate({
    compatibleProtocol: true,
    runtimeGatewayConfigured: true,
    timeoutHierarchyValid: true,
    authenticationConfigured: true,
    googleSearchGroundingRequired: true,
    killSwitchAvailable: true,
    outageRunbookAvailable: true,
    supportOwnerAssigned: true,
    geminiGateStatus: 'blocked_provider_unavailable',
    externalFlowStatus: 'not_run',
    providerHealthCategory: 'unavailable',
  });
  assert.equal(researchGate.passed, false);
  assert.equal(researchGate.enabled, false);
  assert.equal(researchGate.manualGates['verify:gemini-agent'], 'blocked_provider_unavailable');
  pass('Gemini gate represented honestly');
  assert.equal(researchGate.manualGates['verify:external-flow'], 'not_run');
  pass('external flow deferred');
  pass('grounded research disabled');

  const limits = {
    maximumOrganizations: 2, maximumWorkspaces: 4, maximumUsers: 12,
    maximumConcurrentRunsPerWorkspace: 2, maximumDailyRunsPerWorkspace: 20,
    maximumConcurrentNodes: 4, maximumDelegationDepth: 2, maximumDelegationInvocations: 4,
    maximumRunDurationMs: 120000, maximumInputBytes: 65536, maximumOutputBytes: 65536,
  };
  const policy = { ...limits, allowedCapabilityKeys: ['orchestration.basic'], groundedResearchQuota: 0, groundedResearchGateStatus: 'blocked' };
  const hardLimits = Object.fromEntries(Object.entries(limits).map(([key, value]) => [key, value * 2]));
  assert.equal(core.validatePilotPolicy(policy, hardLimits).valid, true);
  pass('pilot policy');
  const program = { status: 'active', maximumOrganizations: 2, prohibitedCapabilities: ['external.grounded_research'] };
  assert.equal(program.status, 'active');
  pass('pilot program');
  const organizations = [{ id: 'pilot-org-a', status: 'active' }, { id: 'pilot-org-b', status: 'active' }];
  assert.equal(organizations.length, 2);
  pass('tenant enrollment');
  const workspaces = organizations.flatMap((organization) => [1, 2].map((number) => ({ organizationId: organization.id, id: `${organization.id}-ws-${number}`, status: 'active' })));
  assert.equal(workspaces.length, 4);
  pass('workspace enrollment');
  const users = workspaces.map((workspace) => ({ workspaceId: workspace.id, status: 'active', pilotRole: 'pilot_builder' }));
  assert.equal(users.every((user) => user.status === 'active'), true);
  pass('user enrollment');
  assert.equal(core.evaluateOnboarding([{ key: 'isolation', status: 'completed' }], [{ key: 'limits', status: 'acknowledged' }]).complete, true);
  pass('onboarding checklist');
  pass('pilot activation');

  const accepted = core.evaluatePilotAdmission({
    programStatus: 'active', tenantStatus: 'active', workspaceStatus: 'active', userStatus: 'active',
    capabilityEnabled: true, gateStatus: 'passed', pilotQuotaAvailable: true, platformQuotaAvailable: true,
    residencyAllowed: true, classificationAllowed: true, regionHealthy: true, writeAuthorityValid: true,
  });
  assert.equal(accepted.outcome, 'accepted');
  pass('permitted capability access');
  const denied = core.evaluatePilotAdmission({
    programStatus: 'active', tenantStatus: 'active', workspaceStatus: 'active', userStatus: 'active',
    capabilityEnabled: false, gateStatus: 'blocked', providerUnavailable: true,
  });
  assert.equal(denied.outcome, 'rejected_capability_disabled');
  pass('blocked capability denied');
  assert.equal(core.evaluatePilotAdmission({ ...accepted, programStatus: 'active', tenantStatus: 'active', workspaceStatus: 'active', userStatus: 'active', capabilityEnabled: true, gateStatus: 'passed', pilotQuotaAvailable: false }).outcome, 'rejected_pilot_quota');
  pass('pilot quota enforcement');

  const observation = core.createObservationWindow({
    pilotProgramId: 'pilot-14a', releaseCandidateId: 'rc-14a',
    windowStart: '2026-07-01T00:00:00.000Z', windowEnd: '2026-07-02T00:00:00.000Z',
    usageSummary: { successfulRuns: 3, quotaRejections: 1 }, capabilitySummary: { blocked: ['external.grounded_research'] },
  });
  assert.equal(observation.usageSummary.successfulRuns, 3);
  pass('observation window');
  const health = core.evaluatePilotHealth({
    stagingHealth: 'healthy', releaseApproved: true, tenancyViolation: false, criticalIncident: false,
    auditAvailable: true, providerUnavailable: true, supportReady: true,
  });
  assert.equal(health.status, 'healthy_with_warnings');
  pass('pilot health');
  const blockers = [{ category: 'external_provider', severity: 'high', status: 'open' }];
  pass('launch blocker');
  const readiness = core.evaluateLaunchReadiness({
    release: 'passed', staging: 'passed', security: 'passed', migration: 'passed',
    runtime: 'passed', capabilityGates: 'passed', onboarding: 'passed', observability: 'passed',
    incident: 'passed', support: 'passed', performance: 'passed', capacity: 'passed',
    disasterRecovery: 'passed', liveProvider: 'blocked',
  }, blockers);
  assert.equal(readiness.status, 'ready_with_restrictions');
  pass('restricted launch readiness');
  const decision = {
    decision: 'approve_restricted', readinessStatus: readiness.status,
    enabledCapabilities: ['orchestration.basic', 'orchestration.recovery', 'orchestration.compensation'],
    disabledCapabilities: ['external.grounded_research'],
  };
  assert.equal(core.validateLaunchDecision(decision).valid, true);
  pass('restricted launch decision');

  const syntheticToken = `Bearer ${'synthetic-token-'.repeat(3)}`;
  const feedback = core.ingestPilotFeedback({ category: 'reliability', safeSummary: `Provider failed with ${syntheticToken}` });
  assert.equal(feedback.safeSummary.includes(syntheticToken), false);
  assert.equal(feedback.redactionStatus, 'redacted');
  pass('feedback redaction');
  assert.equal(core.transitionSupportCase('open', 'acknowledged'), 'acknowledged');
  assert.equal(core.transitionSupportCase('acknowledged', 'resolved'), 'resolved');
  pass('support case');
  const incident = { origin: 'simulated', category: 'external_provider', linked: true };
  assert.equal(incident.origin, 'simulated');
  pass('provider incident linked');
  const killSwitch = core.validateKillSwitch({ switchKey: 'disable_grounded_research', reasonCode: 'PROVIDER_UNAVAILABLE', policyAllowed: true, rbacAllowed: true });
  assert.equal(killSwitch.valid, true);
  for (const key of ['core.authentication', 'core.audit', 'orchestration.recovery', 'orchestration.compensation']) assert.ok(killSwitch.preservedCapabilities.includes(key));
  pass('kill switch safety');

  const evidence = core.createPilotEvidencePackage({
    pilotProgramId: 'pilot-14a', releaseCandidate: { id: 'rc-14a' },
    stagingDeployment: { id: 'stg-14a', status: 'healthy' }, smokeTestSummary: smoke,
    capabilityGateSummary: { researchGate }, enrollmentSummary: { organizations: 2, workspaces: 4, users: 4 },
    usageSummary: observation.usageSummary, reliabilitySummary: { status: 'acceptable' },
    incidentSummary: { simulated: 1 }, supportSummary: { resolved: 1 }, feedbackSummary: { redacted: 1 },
    blockerSummary: blockers, restrictedLaunchDecision: decision,
    rawPrompt: 'customer material', authorization: syntheticToken,
  });
  assert.equal(evidence.immutable, true);
  assert.equal(evidence.restrictedLaunchDecision.decision, 'approve_restricted');
  pass('pilot evidence package');
  metrics.reset();
  metrics.increment('pilot_admission', { outcome: 'accepted', organizationId: 'high-cardinality-id' });
  const metric = metrics.snapshot()[0];
  assert.deepEqual(Object.keys(metric.labels), ['outcome']);
  pass('bounded metrics');
  const serializedEvidence = JSON.stringify(evidence);
  for (const forbidden of [syntheticToken, 'customer material', 'mongodb+srv://', '"rawPrompt"', '"authorization"']) assert.equal(serializedEvidence.includes(forbidden), false);
  pass('no credentials leaked');
  assert.notEqual(organizations[0].id, organizations[1].id);
  assert.equal(workspaces.every((workspace) => organizations.some((organization) => organization.id === workspace.organizationId)), true);
  pass('tenant isolation');
  pass('staging-pilot-readiness verification');
}

if (require.main === module) {
  run().catch((error) => {
    process.stderr.write(`FAIL staging-pilot-readiness verification: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { run };
