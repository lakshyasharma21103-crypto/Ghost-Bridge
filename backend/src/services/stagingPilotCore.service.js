const crypto = require('node:crypto');
const {
  CAPABILITY_KEYS, KILL_SWITCH_KEYS, SAFETY_CAPABILITIES, SMOKE_TEST_KEYS,
  STAGING_DEPLOYMENT_TRANSITIONS,
} = require('../constants/stagingPilot');
const { validateStagingConfiguration } = require('../config/stagingProfile');
const releaseCore = require('./releaseReadinessCore.service');

const SECRET_KEY = /(?:authorization|cookie|password|secret|token|credential|privatekey|connectionstring|databaseuri|runtimekey|installkey|rawprompt|rawresponse|hiddenreasoning|customerpayload)/i;
const SECRET_VALUE = /(?:bearer\s+[A-Za-z0-9._~+/-]{8,}|mongodb(?:\+srv)?:\/\/[^\s]+|redis(?:s)?:\/\/[^\s]+|AIza[0-9A-Za-z_-]{16,}|(?:api[_ -]?key|authorization|cookie|password)\s*[:=]\s*\S+|-----BEGIN [^-]*PRIVATE KEY-----|[?&](?:signature|sig|token)=[^&\s]+)/gi;
const DATA_CLASSIFICATION_RANK = Object.freeze({ public: 0, internal: 1, confidential: 2, restricted: 3 });

function canonical(value) {
  return releaseCore.canonical(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function codes(values = []) {
  return [...new Set(values.filter(Boolean).map(String))].sort();
}

function transitionStagingDeployment(current, target) {
  if (!STAGING_DEPLOYMENT_TRANSITIONS[current]?.includes(target)) {
    throw new Error(`STAGING_DEPLOYMENT_TRANSITION_INVALID:${current}:${target}`);
  }
  return target;
}

function validateExternalDeploymentEvidence(input = {}) {
  const safeReasonCodes = [];
  if (input.providerExecutionMode !== 'manual_external') safeReasonCodes.push('EXTERNAL_DEPLOYMENT_MODE_REQUIRED');
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(String(input.manualExecutionReference || ''))) {
    safeReasonCodes.push('EXTERNAL_DEPLOYMENT_REFERENCE_INVALID');
  }
  if (!input.approvalRequestId) safeReasonCodes.push('EXTERNAL_DEPLOYMENT_APPROVAL_REQUIRED');
  if (!Array.isArray(input.observedInstanceVersions) || !input.observedInstanceVersions.length) {
    safeReasonCodes.push('EXTERNAL_DEPLOYMENT_VERSION_EVIDENCE_REQUIRED');
  }
  if (SECRET_VALUE.test(JSON.stringify(input))) safeReasonCodes.push('EXTERNAL_DEPLOYMENT_EVIDENCE_SENSITIVE');
  SECRET_VALUE.lastIndex = 0;
  return { valid: !safeReasonCodes.length, executionState: safeReasonCodes.length ? 'manual_action_required' : 'observed', safeReasonCodes };
}

function evaluateStagingPreflight(checks = {}) {
  const required = [
    'releaseCandidate', 'releaseEvidence', 'secretScan', 'environmentExamples', 'startupConfiguration',
    'lockfileIntegrity', 'buildArtifacts', 'compatibility', 'migrations', 'rollbackReadiness',
    'indexes', 'cacheCompatibility', 'projectionCompatibility', 'workerVersions', 'routingVersions',
    'regionalConfiguration', 'disasterRecovery', 'performance', 'capacity', 'operationalOwners',
    'runbooks', 'smokeTestPlan', 'capabilityGateDefinitions', 'liveProviderGates',
  ];
  const normalized = Object.fromEntries(required.map((key) => [key, checks[key] || 'insufficient_evidence']));
  return { ...releaseCore.evaluatePreflight(normalized), requiredChecks: required };
}

function validateSmokeTestPlan(input = {}) {
  const safeReasonCodes = [];
  const definitions = Array.isArray(input.testDefinitions) ? input.testDefinitions : [];
  if (!definitions.length) safeReasonCodes.push('SMOKE_TEST_DEFINITIONS_REQUIRED');
  if (definitions.some((item) => !SMOKE_TEST_KEYS.includes(typeof item === 'string' ? item : item.key))) {
    safeReasonCodes.push('SMOKE_TEST_DEFINITION_NOT_CODE_DEFINED');
  }
  if (JSON.stringify(input).match(/https?:\/\/|authorization|headers|script|requestBody/i)) {
    safeReasonCodes.push('SMOKE_TEST_ARBITRARY_INPUT_FORBIDDEN');
  }
  const bounds = {
    maximumRequestCount: [1, 200],
    maximumMutationCount: [0, 50],
    maximumDurationMs: [100, 300_000],
    maximumConcurrency: [1, 10],
  };
  for (const [key, [minimum, maximum]] of Object.entries(bounds)) {
    const value = Number(input[key]);
    if (!Number.isInteger(value) || value < minimum || value > maximum) safeReasonCodes.push(`SMOKE_TEST_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}_INVALID`);
  }
  if ((input.prohibitedCapabilities || []).includes('external.grounded_research') === false) {
    safeReasonCodes.push('SMOKE_TEST_GROUNDED_RESEARCH_MUST_BE_PROHIBITED');
  }
  return { valid: !safeReasonCodes.length, safeReasonCodes: codes(safeReasonCodes) };
}

function executeDeterministicSmokeTests(plan = {}, fixtures = {}) {
  const validation = validateSmokeTestPlan(plan);
  if (!validation.valid) return { status: 'failed', ...validation, testResults: [], cleanupStatus: 'not_required' };
  const testResults = plan.testDefinitions.map((definition) => {
    const key = typeof definition === 'string' ? definition : definition.key;
    const fixture = fixtures[key];
    const outcome = fixture === false ? 'failed' : fixture === 'warning' ? 'warning' : 'passed';
    return { key, outcome, safeReasonCodes: outcome === 'failed' ? [`SMOKE_${key.toUpperCase()}_FAILED`] : [] };
  });
  const failedCount = testResults.filter((item) => item.outcome === 'failed').length;
  const warningCount = testResults.filter((item) => item.outcome === 'warning').length;
  return {
    status: failedCount ? 'failed' : warningCount ? 'passed_with_warnings' : 'passed',
    testResults,
    passedCount: testResults.filter((item) => item.outcome === 'passed').length,
    warningCount,
    failedCount,
    skippedCount: 0,
    cleanupStatus: 'cleaned_up',
  };
}

function validateGateWaiver(waiver = {}, now = Date.now()) {
  const safeReasonCodes = [];
  if (!waiver.owner) safeReasonCodes.push('CAPABILITY_WAIVER_OWNER_REQUIRED');
  if (!waiver.mitigation) safeReasonCodes.push('CAPABILITY_WAIVER_MITIGATION_REQUIRED');
  if (!waiver.scope) safeReasonCodes.push('CAPABILITY_WAIVER_SCOPE_REQUIRED');
  if (!waiver.approvalRequestId) safeReasonCodes.push('CAPABILITY_WAIVER_APPROVAL_REQUIRED');
  if (!waiver.expiresAt || new Date(waiver.expiresAt).getTime() <= new Date(now).getTime()) safeReasonCodes.push('CAPABILITY_WAIVER_EXPIRED');
  return { valid: !safeReasonCodes.length, safeReasonCodes };
}

function evaluateCapabilityGate(gate = {}, context = {}) {
  const now = new Date(context.now || Date.now());
  if (gate.expiresAt && new Date(gate.expiresAt) <= now) {
    return { status: 'expired', enabled: false, passed: false, safeReasonCodes: ['CAPABILITY_GATE_EXPIRED'] };
  }
  if (gate.status === 'disabled') return { status: 'disabled', enabled: false, passed: false, safeReasonCodes: ['CAPABILITY_DISABLED'] };
  const required = (gate.requiredGateKeys || []).map((key) => context.gates?.[key] || 'not_run');
  const failed = required.some((status) => !['passed', 'passed_with_warnings'].includes(status));
  const passed = ['passed', 'passed_with_warnings'].includes(gate.status) && !failed;
  if (passed) return { status: gate.status, enabled: gate.defaultEnabledState === true, passed: true, safeReasonCodes: [] };
  const waiver = context.waiver ? validateGateWaiver(context.waiver, now) : { valid: false };
  if (gate.waiverAllowed && waiver.valid) {
    return { status: 'waived', enabled: context.waiver.restrictedMode === true, passed: false, safeReasonCodes: ['CAPABILITY_RESTRICTED_WAIVER'] };
  }
  return { status: failed ? 'blocked' : gate.status || 'not_evaluated', enabled: false, passed: false, safeReasonCodes: codes([...(gate.safeReasonCodes || []), failed && 'CAPABILITY_REQUIRED_GATE_UNRESOLVED']) };
}

function evaluateGroundedResearchGate(input = {}) {
  const gemini = input.geminiGateStatus || 'blocked_provider_unavailable';
  const external = input.externalFlowStatus || 'not_run';
  const evidence = {
    compatibleProtocol: input.compatibleProtocol === true,
    runtimeGatewayConfigured: input.runtimeGatewayConfigured === true,
    timeoutHierarchyValid: input.timeoutHierarchyValid === true,
    authenticationConfigured: input.authenticationConfigured === true,
    googleSearchGroundingRequired: input.googleSearchGroundingRequired === true,
    killSwitchAvailable: input.killSwitchAvailable === true,
    outageRunbookAvailable: input.outageRunbookAvailable === true,
    supportOwnerAssigned: input.supportOwnerAssigned === true,
  };
  const livePassed = gemini === 'passed' && external === 'passed';
  const safeReasonCodes = [];
  if (!Object.values(evidence).every(Boolean)) safeReasonCodes.push('GROUNDED_RESEARCH_CONFIGURATION_INCOMPLETE');
  if (!livePassed) safeReasonCodes.push(gemini === 'blocked_provider_unavailable' || gemini === 'failed_transient' ? 'GROUNDED_RESEARCH_PROVIDER_UNAVAILABLE' : 'GROUNDED_RESEARCH_LIVE_GATE_REQUIRED');
  const waiver = input.waiver ? validateGateWaiver(input.waiver, input.now) : { valid: false };
  const restricted = !livePassed && waiver.valid && input.waiver.restrictedMode === true;
  return {
    status: livePassed && !safeReasonCodes.length ? 'passed' : restricted ? 'waived_restricted_mode' : gemini,
    enabled: livePassed && !safeReasonCodes.length,
    passed: livePassed && !safeReasonCodes.length,
    restrictedMode: restricted,
    providerHealthCategory: input.providerHealthCategory || 'unavailable',
    manualGates: { 'verify:gemini-agent': gemini, 'verify:external-flow': external },
    safeReasonCodes: codes(safeReasonCodes),
  };
}

function providerOutageResponse(gate = {}, retryAfterMs = 60_000) {
  return {
    allowed: false,
    status: 503,
    code: gate.status === 'blocked_provider_unavailable' ? 'GROUNDED_RESEARCH_PROVIDER_UNAVAILABLE' : 'CAPABILITY_GATE_BLOCKED',
    retryable: true,
    retryAfterMs: Math.min(300_000, Math.max(1_000, Number(retryAfterMs) || 60_000)),
    safeMessage: 'Grounded research is temporarily unavailable. Core orchestration remains available.',
  };
}

function validatePilotPolicy(policy = {}, hardLimits = {}) {
  const safeReasonCodes = [];
  const limitKeys = [
    'maximumOrganizations', 'maximumWorkspaces', 'maximumUsers',
    'maximumConcurrentRunsPerWorkspace', 'maximumDailyRunsPerWorkspace',
    'maximumConcurrentNodes', 'maximumDelegationDepth', 'maximumDelegationInvocations',
    'maximumRunDurationMs', 'maximumInputBytes', 'maximumOutputBytes',
  ];
  for (const key of limitKeys) {
    const value = Number(policy[key]);
    if (!Number.isInteger(value) || value < 0) safeReasonCodes.push(`PILOT_POLICY_${key.toUpperCase()}_INVALID`);
    if (Number.isFinite(Number(hardLimits[key])) && value > Number(hardLimits[key])) safeReasonCodes.push(`PILOT_POLICY_${key.toUpperCase()}_EXCEEDS_PLATFORM`);
  }
  if ((policy.allowedCapabilityKeys || []).some((key) => !CAPABILITY_KEYS.includes(key))) safeReasonCodes.push('PILOT_POLICY_CAPABILITY_INVALID');
  if (Number(policy.groundedResearchQuota || 0) !== 0 && policy.groundedResearchGateStatus !== 'passed') safeReasonCodes.push('PILOT_POLICY_GROUNDED_RESEARCH_QUOTA_MUST_BE_ZERO');
  return { valid: !safeReasonCodes.length, safeReasonCodes: codes(safeReasonCodes) };
}

function resolvePilotQuotas(...profiles) {
  const result = {};
  for (const profile of profiles.filter(Boolean)) {
    for (const [key, value] of Object.entries(profile)) {
      if (Number.isFinite(Number(value)) && Number(value) >= 0) result[key] = result[key] == null ? Number(value) : Math.min(result[key], Number(value));
    }
  }
  result.groundedResearch = 0;
  return canonical(result);
}

function evaluatePilotEligibility(input = {}) {
  const restrictions = [];
  const blockers = [];
  if (input.organizationStatus !== 'active' || input.workspaceStatus !== 'active' || input.suspended) blockers.push('PILOT_OPERATIONAL_STATE_BLOCKED');
  if (input.residencyAllowed === false) blockers.push('PILOT_RESIDENCY_BLOCKED');
  if (input.classificationAllowed === false) blockers.push('PILOT_CLASSIFICATION_BLOCKED');
  if (!input.supportOwnerAssigned) blockers.push('PILOT_SUPPORT_OWNER_REQUIRED');
  if (!input.onboardingReady || !input.acknowledgementsComplete) blockers.push('PILOT_ONBOARDING_INCOMPLETE');
  if (!input.releaseApproved || !input.stagingHealthy) blockers.push('PILOT_RELEASE_NOT_READY');
  if (input.criticalIncidentOpen) blockers.push('PILOT_CRITICAL_INCIDENT_OPEN');
  if (input.providerGateBlocked) restrictions.push('external.grounded_research');
  const status = blockers.length ? (input.insufficientEvidence ? 'insufficient_evidence' : 'blocked') : input.approvalRequired ? 'approval_required' : restrictions.length ? 'eligible_with_restrictions' : 'eligible';
  return { status, restrictions: codes(restrictions), safeReasonCodes: codes(blockers) };
}

function evaluateFeatureEnablement(input = {}) {
  const checks = [
    ['FEATURE_RBAC_DENIED', input.rbacAllowed !== false],
    ['FEATURE_POLICY_DENIED', input.policyAllowed !== false],
    ['FEATURE_PROGRAM_INACTIVE', input.programActive === true],
    ['FEATURE_NOT_ENROLLED', input.enrolled === true],
    ['FEATURE_GATE_BLOCKED', ['passed', 'passed_with_warnings'].includes(input.gateStatus)],
    ['FEATURE_CLASSIFICATION_BLOCKED', input.classificationAllowed !== false],
    ['FEATURE_RESIDENCY_BLOCKED', input.residencyAllowed !== false],
    ['FEATURE_OPERATIONAL_STATE_BLOCKED', input.operational === true],
    ['FEATURE_QUOTA_EXHAUSTED', input.quotaAvailable !== false],
  ];
  if (input.killSwitchActive) checks.push(['FEATURE_KILL_SWITCH_ACTIVE', false]);
  const failed = checks.filter(([, okay]) => !okay).map(([code]) => code);
  return { outcome: failed.length ? 'blocked' : 'enabled', enabled: !failed.length, safeReasonCodes: failed };
}

function evaluatePilotAdmission(input = {}) {
  if (input.programStatus !== 'active' || input.tenantStatus !== 'active' || input.workspaceStatus !== 'active' || input.userStatus !== 'active') return { outcome: 'rejected_not_enrolled', accepted: false };
  if (input.suspended || input.maintenance || input.releaseFreeze || input.backpressure === 'reject') return { outcome: 'rejected_operational_state', accepted: false };
  if (input.capabilityEnabled !== true) return { outcome: 'rejected_capability_disabled', accepted: false };
  if (!['passed', 'passed_with_warnings'].includes(input.gateStatus)) return { outcome: input.providerUnavailable ? 'rejected_provider_unavailable' : 'rejected_gate_blocked', accepted: false };
  if (input.pilotQuotaAvailable === false) return { outcome: 'rejected_pilot_quota', accepted: false };
  if (input.platformQuotaAvailable === false) return { outcome: 'rejected_platform_quota', accepted: false };
  if (input.residencyAllowed === false || input.regionHealthy === false || input.writeAuthorityValid === false) return { outcome: 'rejected_residency', accepted: false };
  if (input.classificationAllowed === false) return { outcome: 'rejected_classification', accepted: false };
  return { outcome: input.defer ? 'accepted_deferred' : 'accepted', accepted: true };
}

function evaluateOnboarding(items = [], acknowledgements = []) {
  const required = items.filter((item) => item.required !== false);
  const incomplete = required.filter((item) => item.status !== 'completed').map((item) => item.key);
  const missingAcknowledgements = acknowledgements.filter((item) => item.required !== false && item.status !== 'acknowledged').map((item) => item.key);
  return { status: incomplete.length || missingAcknowledgements.length ? 'incomplete' : 'completed', complete: !incomplete.length && !missingAcknowledgements.length, incompleteItems: codes(incomplete), missingAcknowledgements: codes(missingAcknowledgements) };
}

function evaluateSuccessCriteria(summary = {}, criteria = {}) {
  const safeFailureCodes = [];
  if (Number(summary.crossTenantViolations || 0) > 0) safeFailureCodes.push('PILOT_CROSS_TENANT_VIOLATION');
  if (Number(summary.credentialExposureFindings || 0) > 0) safeFailureCodes.push('PILOT_CREDENTIAL_EXPOSURE');
  if (Number(summary.residencyViolations || 0) > 0) safeFailureCodes.push('PILOT_RESIDENCY_VIOLATION');
  if (Number(summary.successfulOrchestrationRate || 0) < Number(criteria.minimumSuccessfulOrchestrationRate || 0)) safeFailureCodes.push('PILOT_SUCCESS_RATE_BELOW_TARGET');
  if (Number(summary.recoverySuccessRate || 0) < Number(criteria.minimumRecoverySuccessRate || 0)) safeFailureCodes.push('PILOT_RECOVERY_RATE_BELOW_TARGET');
  return { passed: !safeFailureCodes.length, status: safeFailureCodes.length ? 'failed' : 'passed', safeFailureCodes };
}

function evaluateExitCriteria(input = {}) {
  const blockers = codes([
    input.openCriticalSecurityIssue && 'PILOT_CRITICAL_SECURITY_ISSUE',
    input.crossTenantLeakage && 'PILOT_CROSS_TENANT_LEAKAGE',
    input.credentialExposure && 'PILOT_CREDENTIAL_EXPOSURE',
    input.staleWriterFailure && 'PILOT_STALE_WRITER_FAILURE',
    input.residencyViolation && 'PILOT_RESIDENCY_VIOLATION',
    input.sloReady === false && 'PILOT_SLO_EVIDENCE_UNACCEPTABLE',
    input.performanceReady === false && 'PILOT_PERFORMANCE_EVIDENCE_UNACCEPTABLE',
    input.capacityReady === false && 'PILOT_CAPACITY_EVIDENCE_UNACCEPTABLE',
    input.supportReady === false && 'PILOT_SUPPORT_NOT_READY',
    input.runbooksReady === false && 'PILOT_RUNBOOKS_NOT_READY',
    input.releaseReady === false && 'PILOT_RELEASE_NOT_READY',
  ]);
  return { outcome: blockers.length ? 'remediate' : input.approvalGranted ? 'graduate' : 'extend', eligible: !blockers.length && input.approvalGranted === true, safeFailureCodes: blockers };
}

function createObservationWindow(input = {}) {
  const allowed = [
    'enrollmentSummary', 'usageSummary', 'reliabilitySummary', 'latencySummary', 'queueSummary',
    'workerSummary', 'databaseSummary', 'cacheSummary', 'recoverySummary', 'compensationSummary',
    'incidentSummary', 'supportSummary', 'feedbackSummary', 'capabilitySummary', 'gateSummary', 'capacitySummary',
  ];
  return canonical({
    pilotProgramId: input.pilotProgramId,
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
    releaseCandidateId: input.releaseCandidateId,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    sequence: Number(input.sequence || 1),
    ...Object.fromEntries(allowed.map((key) => [key, redactPilotContent(input[key] || {})])),
    safeWarnings: codes(input.safeWarnings),
    safeFailureCodes: codes(input.safeFailureCodes),
    generatedAt: input.generatedAt || new Date(0).toISOString(),
  });
}

function evaluatePilotHealth(input = {}) {
  if (input.suspended) return { status: 'suspended', safeReasonCodes: ['PILOT_SUSPENDED'] };
  const critical = [
    ['PILOT_STAGING_UNHEALTHY', ['healthy', 'healthy_with_warnings'].includes(input.stagingHealth)],
    ['PILOT_RELEASE_UNAPPROVED', input.releaseApproved === true],
    ['PILOT_TENANCY_VIOLATION', !input.tenancyViolation],
    ['PILOT_CRITICAL_INCIDENT', !input.criticalIncident],
    ['PILOT_AUDIT_UNAVAILABLE', input.auditAvailable !== false],
  ];
  const unknown = critical.some(([, okay]) => okay == null);
  const failed = critical.filter(([, okay]) => okay === false).map(([code]) => code);
  const warnings = codes([
    input.providerUnavailable && 'PILOT_PROVIDER_UNAVAILABLE',
    input.quotaPressure && 'PILOT_QUOTA_PRESSURE',
    input.backpressure && 'PILOT_BACKPRESSURE',
    input.supportReady === false && 'PILOT_SUPPORT_DEGRADED',
  ]);
  return { status: failed.length ? 'blocked' : unknown ? 'unknown' : warnings.length ? 'healthy_with_warnings' : 'healthy', safeReasonCodes: codes([...failed, ...warnings]) };
}

function evaluateLaunchReadiness(dimensions = {}, blockers = []) {
  const open = blockers.filter((item) => ['open', 'investigating', 'mitigation_in_progress'].includes(item.status));
  const nonAcceptable = open.filter((item) => ['security', 'tenancy', 'authorization', 'secret_exposure'].includes(item.category));
  const providerOnly = open.length > 0 && open.every((item) => item.category === 'external_provider');
  const missing = Object.entries(dimensions).filter(([, value]) => value === 'unknown' || value === 'insufficient_evidence').map(([key]) => key);
  const failed = Object.entries(dimensions).filter(([, value]) => ['blocked', 'failed', 'not_ready'].includes(value)).map(([key]) => key);
  const status = nonAcceptable.length ? 'blocked' : missing.length ? 'insufficient_evidence' : providerOnly && !failed.filter((key) => key !== 'liveProvider').length ? 'ready_with_restrictions' : failed.length || open.length ? 'not_ready' : 'ready';
  return { status, blockingDimensions: codes(failed), insufficientEvidenceDimensions: codes(missing), restrictions: providerOnly ? ['external.grounded_research'] : [], blockerCount: open.length };
}

function validateLaunchDecision(decision = {}) {
  const safeReasonCodes = [];
  if (decision.decision === 'approve_restricted' && !(decision.disabledCapabilities || []).length) safeReasonCodes.push('RESTRICTED_DECISION_DISABLED_CAPABILITIES_REQUIRED');
  if ((decision.enabledCapabilities || []).some((key) => (decision.disabledCapabilities || []).includes(key))) safeReasonCodes.push('LAUNCH_DECISION_CAPABILITY_CONFLICT');
  if (decision.readinessStatus === 'ready_with_restrictions' && decision.decision === 'approve') safeReasonCodes.push('RESTRICTED_READINESS_CANNOT_BE_UNRESTRICTED');
  return { valid: !safeReasonCodes.length, safeReasonCodes };
}

function redactPilotContent(value, key = '') {
  if (SECRET_KEY.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactPilotContent(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, redactPilotContent(child, childKey)]));
  if (typeof value === 'string') return value.replace(SECRET_VALUE, '[REDACTED]').slice(0, 4_000);
  return value;
}

function ingestPilotFeedback(input = {}) {
  const source = `${input.title || ''}\n${input.safeSummary || ''}`;
  const redacted = redactPilotContent(source);
  const changed = redacted !== source;
  return {
    category: input.category || 'other',
    severity: input.severity || 'low',
    title: redactPilotContent(input.title || '').slice(0, 160),
    safeSummary: redactPilotContent(input.safeSummary || '').slice(0, 2_000),
    containsSensitiveData: changed,
    redactionStatus: changed ? 'redacted' : 'not_required',
    status: 'submitted',
  };
}

const SUPPORT_TRANSITIONS = Object.freeze({
  open: ['acknowledged', 'cancelled'], acknowledged: ['investigating', 'escalated', 'resolved'],
  investigating: ['escalated', 'resolved'], escalated: ['investigating', 'resolved'],
  resolved: ['closed'], closed: [], cancelled: [],
});

function transitionSupportCase(current, target) {
  if (!SUPPORT_TRANSITIONS[current]?.includes(target)) throw new Error(`PILOT_SUPPORT_TRANSITION_INVALID:${current}:${target}`);
  return target;
}

function applyPilotPause(input = {}) {
  return {
    newAdmissionsAllowed: false,
    acceptedWorkPreserved: true,
    availableControls: ['authentication', 'audit', 'incident_response', 'support', 'cancellation', 'recovery', 'compensation', 'evidence'],
    status: input.scope === 'workspace' ? 'workspace_paused' : input.scope === 'tenant' ? 'tenant_paused' : 'pilot_paused',
  };
}

function validateKillSwitch(input = {}) {
  const safeReasonCodes = [];
  if (!KILL_SWITCH_KEYS.includes(input.switchKey)) safeReasonCodes.push('PILOT_KILL_SWITCH_UNKNOWN');
  if (!input.reasonCode) safeReasonCodes.push('PILOT_KILL_SWITCH_REASON_REQUIRED');
  if (!input.policyAllowed) safeReasonCodes.push('PILOT_KILL_SWITCH_POLICY_DENIED');
  if (!input.rbacAllowed) safeReasonCodes.push('PILOT_KILL_SWITCH_RBAC_DENIED');
  return { valid: !safeReasonCodes.length, safeReasonCodes, preservedCapabilities: [...SAFETY_CAPABILITIES, 'orchestration.cancellation', 'secret.redaction', 'stale_writer.fencing', 'tenant.isolation'] };
}

class NoopNotificationAdapter {
  async prepare(input = {}) { return { status: 'manual_delivery_required', communicationId: input.communicationId }; }
  async send() { return { status: 'manual_delivery_required', code: 'AUTOMATED_NOTIFICATION_DISABLED' }; }
  async recordExternalDelivery(input = {}) { return { status: input.manualReference ? 'delivered_externally' : 'manual_delivery_required' }; }
}

class MockNotificationAdapter {
  constructor() { this.records = []; }
  async prepare(input = {}) { const record = { communicationId: input.communicationId, status: 'approved' }; this.records.push(record); return record; }
  async send(input = {}) { const record = { communicationId: input.communicationId, status: 'delivered_externally', simulated: true }; this.records.push(record); return record; }
}

function createPilotEvidencePackage(input = {}) {
  const safe = redactPilotContent(input);
  const packageContent = canonical({
    pilotProgramId: safe.pilotProgramId,
    releaseCandidate: safe.releaseCandidate,
    stagingDeployment: safe.stagingDeployment,
    smokeTestSummary: safe.smokeTestSummary,
    capabilityGateSummary: safe.capabilityGateSummary,
    onboardingSummary: safe.onboardingSummary,
    enrollmentSummary: safe.enrollmentSummary,
    usageSummary: safe.usageSummary,
    reliabilitySummary: safe.reliabilitySummary,
    performanceSummary: safe.performanceSummary,
    capacitySummary: safe.capacitySummary,
    incidentSummary: safe.incidentSummary,
    supportSummary: safe.supportSummary,
    feedbackSummary: safe.feedbackSummary,
    securitySummary: safe.securitySummary,
    sloSummary: safe.sloSummary,
    disasterRecoverySummary: safe.disasterRecoverySummary,
    liveProviderSummary: safe.liveProviderSummary,
    blockerSummary: safe.blockerSummary,
    approvalSummary: safe.approvalSummary,
    waiverSummary: safe.waiverSummary,
    restrictedLaunchDecision: safe.restrictedLaunchDecision,
    generatedBy: safe.generatedBy,
    generatedAt: safe.generatedAt || new Date(0).toISOString(),
  });
  return Object.freeze({ ...packageContent, evidenceDigest: digest(packageContent), immutable: true });
}

function validateGraduation(input = {}) {
  const exit = evaluateExitCriteria(input);
  const groundedResearchRestricted = input.groundedResearchGateStatus !== 'passed';
  return {
    eligible: exit.eligible && input.evidencePackageApproved === true,
    outcome: exit.eligible && input.evidencePackageApproved === true ? 'graduate_restricted' : 'blocked',
    preservedRestrictions: groundedResearchRestricted ? ['external.grounded_research'] : [],
    safeFailureCodes: codes([...exit.safeFailureCodes, !input.evidencePackageApproved && 'PILOT_EVIDENCE_APPROVAL_REQUIRED']),
  };
}

module.exports = {
  MockNotificationAdapter,
  NoopNotificationAdapter,
  applyPilotPause,
  createObservationWindow,
  createPilotEvidencePackage,
  evaluateCapabilityGate,
  evaluateExitCriteria,
  evaluateFeatureEnablement,
  evaluateGroundedResearchGate,
  evaluateLaunchReadiness,
  evaluateOnboarding,
  evaluatePilotAdmission,
  evaluatePilotEligibility,
  evaluatePilotHealth,
  evaluateStagingPreflight,
  evaluateSuccessCriteria,
  executeDeterministicSmokeTests,
  ingestPilotFeedback,
  providerOutageResponse,
  redactPilotContent,
  resolvePilotQuotas,
  transitionStagingDeployment,
  transitionSupportCase,
  validateExternalDeploymentEvidence,
  validateGateWaiver,
  validateGraduation,
  validateKillSwitch,
  validateLaunchDecision,
  validatePilotPolicy,
  validateSmokeTestPlan,
  validateStagingConfiguration,
};
