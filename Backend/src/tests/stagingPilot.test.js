const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const core = require('../services/stagingPilotCore.service');
const metrics = require('../services/stagingPilotMetrics.service');
const pilotModels = require('../models/stagingPilotModels');
const stagingPilotService = require('../services/stagingPilot.service');
const { getPermission, PERMISSION_REGISTRY_VERSION } = require('../constants/permissionRegistry');
const { permissionsForBuiltInRole } = require('../constants/builtInRoles');

const validStaging = {
  NODE_ENV: 'staging', CLIENT_URL: 'https://staging.example.invalid',
  CORS_ORIGINS: 'https://staging.example.invalid', MONGODB_URI: 'mongodb://staging.example.invalid',
  MONGODB_DB_NAME: 'ghost_bridge_staging', JWT_SECRET: 'strong-staging-secret-with-unique-chars-123',
  CREDENTIAL_ENCRYPTION_KEY: 'a'.repeat(64), EXTERNAL_TEST_AGENT_RUNTIME_TOKEN: 'strong-runtime-token-with-unique-chars-456',
  SERVICE_REGION_ID: 'staging-primary', RELEASE_CANDIDATE_ID: 'rc-test',
  RELEASE_MANIFEST_VERSION: '14A.1', TRUST_PROXY: '1', COOKIE_SECURE: 'true',
  LOG_REDACTION_ENABLED: 'true', DETAILED_HEALTH_AUTH_REQUIRED: 'true',
  OUTBOUND_PROVIDER_MODE: 'disabled', CACHE_ADAPTER: 'memory',
};

test('staging profile validates safe configuration without exposing values', () => {
  assert.equal(core.validateStagingConfiguration(validStaging).valid, true);
  const bad = core.validateStagingConfiguration({ ...validStaging, MONGODB_DB_NAME: 'ghost_bridge_production', CORS_ORIGINS: '*', LOG_REDACTION_ENABLED: 'false' });
  assert.equal(bad.valid, false);
  assert.ok(bad.issues.some((issue) => issue.code === 'STAGING_PRODUCTION_DATABASE_FORBIDDEN'));
  assert.equal(JSON.stringify(bad).includes(validStaging.JWT_SECRET), false);
});

test('staging deployment state machine and external evidence fail closed', () => {
  assert.equal(core.transitionStagingDeployment('draft', 'validating'), 'validating');
  assert.throws(() => core.transitionStagingDeployment('draft', 'healthy'), /TRANSITION_INVALID/);
  assert.equal(core.validateExternalDeploymentEvidence({
    providerExecutionMode: 'manual_external', manualExecutionReference: 'render-change-14a',
    approvalRequestId: 'approval-1', observedInstanceVersions: ['14.0.0'],
  }).valid, true);
  assert.equal(core.validateExternalDeploymentEvidence({ providerExecutionMode: 'manual_external', authorization: 'Bearer synthetic-token-value' }).valid, false);
});

test('preflight requires all release, operations, and live-provider evidence', () => {
  const result = core.evaluateStagingPreflight({ releaseCandidate: 'passed' });
  assert.equal(result.state, 'insufficient_evidence');
  assert.ok(result.requiredChecks.includes('workerVersions'));
  assert.ok(result.requiredChecks.includes('liveProviderGates'));
});

test('smoke plans are bounded, code-defined, and prohibit grounded research', () => {
  const valid = {
    testDefinitions: ['liveness', 'readiness', 'tenant_isolation'],
    maximumRequestCount: 20, maximumMutationCount: 5, maximumDurationMs: 10000,
    maximumConcurrency: 2, prohibitedCapabilities: ['external.grounded_research'],
  };
  assert.equal(core.validateSmokeTestPlan(valid).valid, true);
  assert.equal(core.executeDeterministicSmokeTests(valid).status, 'passed');
  assert.equal(core.validateSmokeTestPlan({ ...valid, testDefinitions: [{ key: 'liveness', url: 'https://evil.invalid' }] }).valid, false);
  assert.equal(core.validateSmokeTestPlan({ ...valid, headers: { authorization: 'x' } }).valid, false);
  assert.equal(core.validateSmokeTestPlan({ ...valid, script: 'do anything' }).valid, false);
});

test('capability gates and waivers never convert provider failure to passed', () => {
  const result = core.evaluateGroundedResearchGate({
    compatibleProtocol: true, runtimeGatewayConfigured: true, timeoutHierarchyValid: true,
    authenticationConfigured: true, googleSearchGroundingRequired: true, killSwitchAvailable: true,
    outageRunbookAvailable: true, supportOwnerAssigned: true,
    geminiGateStatus: 'failed_transient', externalFlowStatus: 'not_run',
  });
  assert.equal(result.enabled, false);
  assert.equal(result.passed, false);
  const waiver = { owner: 'operator', mitigation: 'feature hidden', scope: 'pilot', approvalRequestId: 'approval', expiresAt: '2099-01-01T00:00:00.000Z', restrictedMode: true };
  const waived = core.evaluateGroundedResearchGate({
    compatibleProtocol: true, runtimeGatewayConfigured: true, timeoutHierarchyValid: true,
    authenticationConfigured: true, googleSearchGroundingRequired: true, killSwitchAvailable: true,
    outageRunbookAvailable: true, supportOwnerAssigned: true,
    geminiGateStatus: 'blocked_provider_unavailable', externalFlowStatus: 'not_run', waiver,
  });
  assert.equal(waived.status, 'waived_restricted_mode');
  assert.equal(waived.passed, false);
  assert.equal(waived.enabled, false);
  assert.equal(core.validateGateWaiver({ ...waiver, expiresAt: '2020-01-01T00:00:00.000Z' }).valid, false);
});

test('provider outage returns safe bounded denial while core work remains available', () => {
  const response = core.providerOutageResponse({ status: 'blocked_provider_unavailable' });
  assert.equal(response.code, 'GROUNDED_RESEARCH_PROVIDER_UNAVAILABLE');
  assert.equal(response.allowed, false);
  assert.match(response.safeMessage, /Core orchestration remains available/);
});

test('pilot quotas select stricter limits and grounded research stays zero', () => {
  assert.deepEqual(core.resolvePilotQuotas({ runs: 20, groundedResearch: 5 }, { runs: 5, groundedResearch: 1 }), { groundedResearch: 0, runs: 5 });
  const policy = {
    maximumOrganizations: 2, maximumWorkspaces: 4, maximumUsers: 10,
    maximumConcurrentRunsPerWorkspace: 2, maximumDailyRunsPerWorkspace: 20,
    maximumConcurrentNodes: 4, maximumDelegationDepth: 2, maximumDelegationInvocations: 4,
    maximumRunDurationMs: 60000, maximumInputBytes: 1024, maximumOutputBytes: 1024,
    allowedCapabilityKeys: ['orchestration.basic'], groundedResearchQuota: 0, groundedResearchGateStatus: 'blocked',
  };
  assert.equal(core.validatePilotPolicy(policy, { ...policy, maximumOrganizations: 10 }).valid, true);
  assert.equal(core.validatePilotPolicy({ ...policy, maximumOrganizations: 20 }, { ...policy, maximumOrganizations: 10 }).valid, false);
});

test('pilot admission enforces enrollment, gates, quota, residency and classification', () => {
  const base = {
    programStatus: 'active', tenantStatus: 'active', workspaceStatus: 'active', userStatus: 'active',
    capabilityEnabled: true, gateStatus: 'passed', pilotQuotaAvailable: true, platformQuotaAvailable: true,
    residencyAllowed: true, classificationAllowed: true, regionHealthy: true, writeAuthorityValid: true,
  };
  assert.equal(core.evaluatePilotAdmission(base).outcome, 'accepted');
  assert.equal(core.evaluatePilotAdmission({ ...base, userStatus: 'withdrawn' }).outcome, 'rejected_not_enrolled');
  assert.equal(core.evaluatePilotAdmission({ ...base, gateStatus: 'blocked' }).outcome, 'rejected_gate_blocked');
  assert.equal(core.evaluatePilotAdmission({ ...base, pilotQuotaAvailable: false }).outcome, 'rejected_pilot_quota');
  assert.equal(core.evaluatePilotAdmission({ ...base, residencyAllowed: false }).outcome, 'rejected_residency');
  assert.equal(core.evaluatePilotAdmission({ ...base, classificationAllowed: false }).outcome, 'rejected_classification');
  assert.equal(core.evaluatePilotAdmission({ ...base, suspended: true }).outcome, 'rejected_operational_state');
});

test('feature flags cannot bypass RBAC, policy, or capability gates', () => {
  const base = { rbacAllowed: true, policyAllowed: true, programActive: true, enrolled: true, gateStatus: 'passed', operational: true };
  assert.equal(core.evaluateFeatureEnablement(base).enabled, true);
  assert.equal(core.evaluateFeatureEnablement({ ...base, rbacAllowed: false }).enabled, false);
  assert.equal(core.evaluateFeatureEnablement({ ...base, policyAllowed: false }).enabled, false);
  assert.equal(core.evaluateFeatureEnablement({ ...base, gateStatus: 'blocked' }).enabled, false);
});

test('onboarding, success, exit, health and readiness are deterministic', () => {
  assert.equal(core.evaluateOnboarding([{ key: 'a', status: 'completed' }], [{ key: 'b', status: 'acknowledged' }]).complete, true);
  assert.equal(core.evaluateSuccessCriteria({ crossTenantViolations: 1 }, {}).passed, false);
  assert.equal(core.evaluateExitCriteria({ crossTenantLeakage: true }).eligible, false);
  assert.equal(core.evaluatePilotHealth({ stagingHealth: 'healthy', releaseApproved: true, tenancyViolation: false, criticalIncident: false, auditAvailable: true }).status, 'healthy');
  assert.equal(core.evaluatePilotHealth({ stagingHealth: 'healthy', releaseApproved: true, tenancyViolation: true, criticalIncident: false, auditAvailable: true }).status, 'blocked');
  assert.equal(core.evaluateLaunchReadiness({ security: 'passed', liveProvider: 'blocked' }, [{ category: 'external_provider', status: 'open' }]).status, 'ready_with_restrictions');
  assert.equal(core.evaluateLaunchReadiness({ security: 'blocked' }, [{ category: 'security', status: 'open' }]).status, 'blocked');
});

test('feedback, support, evidence and metrics never expose secrets or high-cardinality IDs', () => {
  const token = `Bearer ${'x'.repeat(40)}`;
  const feedback = core.ingestPilotFeedback({ safeSummary: `authorization: ${token}\nmongodb+srv://user:password@example.invalid/db` });
  assert.equal(feedback.redactionStatus, 'redacted');
  assert.equal(feedback.safeSummary.includes(token), false);
  assert.throws(() => core.transitionSupportCase('open', 'resolved'), /TRANSITION_INVALID/);
  const evidence = core.createPilotEvidencePackage({ pilotProgramId: 'pilot', rawPrompt: 'customer', authorization: token, feedbackSummary: feedback });
  const serialized = JSON.stringify(evidence);
  assert.equal(serialized.includes(token), false);
  assert.equal(serialized.includes('customer'), false);
  metrics.reset();
  metrics.increment('pilot_admission', { outcome: 'accepted', organizationId: 'org-secret' });
  assert.deepEqual(metrics.snapshot()[0].labels, { outcome: 'accepted' });
});

test('kill switches preserve authentication, audit, cancellation, recovery and compensation', () => {
  const result = core.validateKillSwitch({ switchKey: 'disable_grounded_research', reasonCode: 'OUTAGE', rbacAllowed: true, policyAllowed: true });
  assert.equal(result.valid, true);
  for (const capability of ['core.authentication', 'core.audit', 'orchestration.cancellation', 'orchestration.recovery', 'orchestration.compensation']) assert.ok(result.preservedCapabilities.includes(capability));
  assert.equal(core.applyPilotPause().acceptedWorkPreserved, true);
});

test('graduation can preserve the grounded research restriction', () => {
  const result = core.validateGraduation({
    sloReady: true, performanceReady: true, capacityReady: true, supportReady: true,
    runbooksReady: true, releaseReady: true, approvalGranted: true, evidencePackageApproved: true,
    groundedResearchGateStatus: 'blocked',
  });
  assert.equal(result.eligible, true);
  assert.deepEqual(result.preservedRestrictions, ['external.grounded_research']);
});

test('Phase 14A RBAC exists and ordinary developers cannot approve launch operations', () => {
  assert.equal(PERMISSION_REGISTRY_VERSION, 16);
  for (const permission of ['stagingDeployment.approve', 'capabilityLaunchGate.waive', 'pilotProgram.approve', 'pilotEnrollment.approve', 'pilotKillSwitch.activate', 'pilotLaunchDecision.create', 'pilotEvidence.export']) assert.ok(getPermission(permission));
  const developer = permissionsForBuiltInRole('developer');
  for (const permission of ['stagingDeployment.approve', 'capabilityLaunchGate.waive', 'pilotProgram.approve', 'pilotKillSwitch.activate']) assert.equal(developer.includes(permission), false);
});

test('Phase 14A durable models expose tenant, state, expiry, and idempotency indexes', () => {
  const indexes = (Model) => Model.schema.indexes().map(([fields, options]) => ({ fields, options }));
  assert.ok(indexes(pilotModels.StagingDeployment).some(({ fields }) => fields.releaseCandidateId === 1 && fields.status === 1));
  assert.ok(indexes(pilotModels.StagingDeployment).some(({ fields, options }) => fields.idempotencyKeyHash === 1 && options.unique));
  assert.ok(indexes(pilotModels.CapabilityLaunchGate).some(({ fields }) => fields.capabilityKey === 1 && fields.scope === 1));
  assert.ok(indexes(pilotModels.PilotTenantEnrollment).some(({ fields, options }) => fields.pilotProgramId === 1 && fields.organizationId === 1 && options.unique));
  assert.ok(indexes(pilotModels.PilotWorkspaceEnrollment).some(({ fields, options }) => fields.workspaceId === 1 && options.unique));
  assert.ok(indexes(pilotModels.PilotUserMembership).some(({ fields, options }) => fields.userId === 1 && options.unique));
  assert.ok(indexes(pilotModels.PilotObservationWindow).some(({ fields }) => fields.pilotProgramId === 1 && fields.windowStart === -1));
  assert.ok(indexes(pilotModels.PilotFeedback).some(({ fields }) => fields.category === 1 && fields.severity === 1));
  assert.ok(indexes(pilotModels.PilotSupportCase).some(({ fields }) => fields.pilotProgramId === 1 && fields.status === 1));
  assert.equal(pilotModels.PilotEvidencePackage.schema.path('evidenceDigest').options.immutable, true);
});

test('Phase 14A route surface is authenticated, permission protected, and has no deployment provider call', () => {
  const routeSource = fs.readFileSync(path.resolve(__dirname, '../routes/stagingPilotRoutes.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.resolve(__dirname, '../services/stagingPilot.service.js'), 'utf8');
  assert.match(routeSource, /stagingPilotRouter\.use\(authenticatePartner\)/);
  for (const route of [
    '/staging-deployments', '/smoke-test-plans', '/capability-gates',
    '/pilot-programs', '/pilot-policies', '/onboarding', '/feedback',
    '/support-cases', '/kill-switches', '/operational-reviews', '/communications',
  ]) assert.match(routeSource, new RegExp(route.replaceAll('/', '\\/')));
  assert.match(routeSource, /requiresPermission/);
  assert.match(serviceSource, /enforceApproval/);
  assert.match(serviceSource, /MockDeploymentAdapter/);
  assert.doesNotMatch(serviceSource, /render\.com|api\.render|aws-sdk|@google-cloud/);
});

test('existing workload admission receives durable pilot enrollment, gate, and quota evidence', async () => {
  const lean = (value) => ({ lean: async () => value });
  const sortedLean = (value) => ({ sort: () => ({ lean: async () => value }) });
  const dependencies = {
    PilotProgram: { findOne: () => lean({ programId: 'pilot-a', status: 'active' }) },
    PilotTenantEnrollment: {
      findOne: () => lean({
        status: 'active',
        enabledCapabilityKeys: ['orchestration.basic'],
        disabledCapabilityKeys: ['external.grounded_research'],
        pilotQuotaProfile: { maximumConcurrentRunsPerWorkspace: 2 },
        approvedDataClassifications: ['internal'],
        residencyTags: ['india'],
      }),
    },
    PilotWorkspaceEnrollment: {
      findOne: () => lean({
        status: 'active',
        allowedCapabilities: ['orchestration.basic'],
        disabledCapabilities: ['external.grounded_research'],
        quotaOverrides: { maximumConcurrentRunsPerWorkspace: 1 },
        residencyTags: ['india'],
      }),
    },
    PilotUserMembership: { findOne: () => lean({ status: 'active' }) },
    CapabilityLaunchGate: {
      findOne: () => sortedLean({ status: 'passed', enabled: true }),
    },
    ReleaseFeatureFlag: {
      findOne: () => sortedLean({
        status: 'active',
        defaultState: true,
        rolloutPercentageBasisPoints: 10_000,
        killSwitch: false,
        allowedEnvironmentCategories: ['staging'],
      }),
    },
    OrchestrationRun: { countDocuments: async () => 0 },
    metrics: { increment() {} },
  };
  const result = await stagingPilotService.evaluatePilotAdmissionBoundary({
    pilotProgramId: 'pilot-a',
    organizationId: 'org-a',
    workspaceId: 'workspace-a',
    pilotUserId: 'pilot-user-a',
    capabilityKey: 'orchestration.basic',
    dataClassification: 'internal',
    residencyTag: 'india',
  }, { partner: { _id: 'org-a' } }, { dependencies });
  assert.equal(result.applies, true);
  assert.equal(result.outcome, 'accepted');
  assert.equal(result.maximumConcurrentRuns, 1);
  const denied = await stagingPilotService.evaluatePilotAdmissionBoundary({
    pilotProgramId: 'pilot-a',
    organizationId: 'org-a',
    workspaceId: 'workspace-a',
    pilotUserId: 'pilot-user-a',
    capabilityKey: 'orchestration.basic',
    dataClassification: 'restricted',
    residencyTag: 'india',
  }, { partner: { _id: 'org-a' } }, { dependencies });
  assert.equal(denied.outcome, 'rejected_classification');
});
