const mongoose = require('mongoose');
const { CAPABILITY_KEYS, KILL_SWITCH_KEYS, SMOKE_TEST_KEYS, STAGING_DEPLOYMENT_STATUSES } = require('../constants/stagingPilot');
const { requestFields, safeCodes, safeId, safeText, safeVersion, schema, tenantFields } = require('./releaseModelFields');

const limitedMixed = { type: mongoose.Schema.Types.Mixed, default: () => ({}) };
const actor = { type: String, trim: true, maxlength: 200 };
const boundedDate = Date;
const capabilityList = [{ type: String, enum: CAPABILITY_KEYS }];
const tenantOptional = {
  organizationId: { type: String, trim: true, maxlength: 200, index: true },
  workspaceId: { type: String, trim: true, maxlength: 200, index: true },
};

function model(name, definition, indexes = [], options = {}) {
  const value = schema(definition, options);
  for (const [fields, indexOptions] of indexes) value.index(fields, indexOptions);
  value.pre('validate', function rejectSensitiveFields(next) {
    const serialized = JSON.stringify(this.toObject({ depopulate: true }));
    if (/(?:bearer\s+[A-Za-z0-9._~+/-]{8,}|mongodb(?:\+srv)?:\/\/[^\s"]+|-----BEGIN [^-]*PRIVATE KEY-----|"(?:authorization|password|runtimeToken|providerKey|installKey|rawPrompt|rawResponse|hiddenReasoning|customerPayload)"\s*:)/i.test(serialized)) {
      next(new Error('PILOT_RECORD_SENSITIVE_DATA_FORBIDDEN'));
      return;
    }
    next();
  });
  return mongoose.models[name] || mongoose.model(name, value);
}

const StagingDeployment = model('StagingDeployment', {
  deploymentId: { ...safeId(true), unique: true }, releaseCandidateId: safeId(true),
  rolloutPlanId: safeId(), deploymentTargetId: safeId(true), releaseVersion: safeVersion(true),
  sourceRevision: safeText(64), manifestVersion: safeVersion(true),
  status: { type: String, enum: STAGING_DEPLOYMENT_STATUSES, default: 'draft', required: true },
  deploymentAdapterType: { type: String, enum: ['mock', 'noop', 'manual_external'], required: true },
  providerExecutionMode: { type: String, enum: ['mock', 'noop', 'manual_external'], required: true },
  executionState: { type: String, enum: ['not_requested', 'manual_action_required', 'externally_requested', 'externally_completed', 'observed', 'verification_failed', 'verified'], default: 'not_requested' },
  regionIds: [safeId()], serviceCategories: [safeId()], workerPoolCategories: [safeId()],
  expectedInstanceVersions: [safeVersion()], observedInstanceVersions: [safeVersion()],
  migrationStatus: safeId(), indexStatus: safeId(), cacheCompatibilityStatus: safeId(),
  projectionCompatibilityStatus: safeId(), readinessStatus: safeId(), healthStatus: safeId(),
  smokeTestStatus: safeId(), liveGateStatus: safeId(), observationStatus: safeId(),
  manualExecutionReference: safeText(256), approvalRequestId: safeId(), incidentId: safeId(),
  ...tenantFields, ...requestFields, requestedBy: actor, approvedBy: actor, verifiedBy: actor,
  requestedAt: boundedDate, deployedAt: boundedDate, verifiedAt: boundedDate, completedAt: boundedDate,
}, [
  [{ releaseCandidateId: 1, status: 1 }, { name: 'staging_deployment_release_status' }],
  [{ deploymentTargetId: 1, status: 1 }, { name: 'staging_deployment_target_status' }],
  [{ createdAt: -1 }, { name: 'staging_deployment_created' }],
  [{ organizationId: 1, idempotencyKeyHash: 1 }, { unique: true, sparse: true, name: 'staging_deployment_idempotency' }],
]);

const StagingSmokeTestPlan = model('StagingSmokeTestPlan', {
  name: safeText(120), description: safeText(1_000), version: { ...safeVersion(true) },
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  releaseCandidateId: safeId(true), deploymentTargetId: safeId(true),
  testDefinitions: [{ key: { type: String, enum: SMOKE_TEST_KEYS, required: true }, mutation: { type: Boolean, default: false } }],
  executionMode: { type: String, enum: ['simulation', 'local', 'staging_manual'], required: true },
  syntheticTenantProfile: limitedMixed, syntheticWorkspaceProfile: limitedMixed,
  cleanupPolicy: { type: String, enum: ['always', 'on_success', 'manual'], default: 'always' },
  maximumRequestCount: { type: Number, min: 1, max: 200, required: true },
  maximumMutationCount: { type: Number, min: 0, max: 50, required: true },
  maximumDurationMs: { type: Number, min: 100, max: 300000, required: true },
  maximumConcurrency: { type: Number, min: 1, max: 10, required: true },
  requireApproval: { type: Boolean, default: true }, requiredCapabilities: capabilityList,
  prohibitedCapabilities: capabilityList, ...tenantFields, ...requestFields, createdBy: actor, activatedBy: actor,
}, [
  [{ status: 1, version: 1 }, { name: 'staging_smoke_plan_status_version' }],
  [{ releaseCandidateId: 1 }, { name: 'staging_smoke_plan_release' }],
  [{ deploymentTargetId: 1 }, { name: 'staging_smoke_plan_target' }],
  [{ organizationId: 1, name: 1, version: 1 }, { unique: true, name: 'staging_smoke_plan_version' }],
]);

const StagingSmokeTestRun = model('StagingSmokeTestRun', {
  smokeTestPlanId: safeId(true), smokeTestPlanVersion: safeVersion(true),
  stagingDeploymentId: safeId(true), releaseCandidateId: safeId(true),
  status: { type: String, enum: ['requested', 'validating', 'approval_required', 'approved', 'preparing', 'running', 'passed', 'passed_with_warnings', 'failed', 'aborted', 'cleanup_required', 'cleaned_up'], default: 'requested' },
  testResults: [{ key: safeId(true), outcome: { type: String, enum: ['passed', 'warning', 'failed', 'skipped'] }, safeReasonCodes: safeCodes }],
  passedCount: { type: Number, min: 0, default: 0 }, warningCount: { type: Number, min: 0, default: 0 },
  failedCount: { type: Number, min: 0, default: 0 }, skippedCount: { type: Number, min: 0, default: 0 },
  syntheticTenantId: safeId(), syntheticWorkspaceId: safeId(), cleanupStatus: safeId(),
  safeFailureCodes: safeCodes, safeWarnings: safeCodes, ...tenantFields, ...requestFields,
  requestedBy: actor, startedAt: boundedDate, completedAt: boundedDate,
}, [
  [{ stagingDeploymentId: 1, status: 1 }, { name: 'staging_smoke_run_deployment_status' }],
  [{ releaseCandidateId: 1, createdAt: -1 }, { name: 'staging_smoke_run_release_created' }],
]);

const CapabilityLaunchGate = model('CapabilityLaunchGate', {
  capabilityKey: { type: String, enum: CAPABILITY_KEYS, required: true }, displayName: safeText(120),
  version: safeVersion(true), scope: { type: String, enum: ['platform', 'environment', 'pilot_program', 'pilot_tenant', 'pilot_workspace'], required: true },
  environmentCategory: safeId(), pilotProgramId: safeId(), ...tenantOptional,
  status: { type: String, enum: ['not_evaluated', 'evaluating', 'passed', 'passed_with_warnings', 'blocked', 'failed', 'waived', 'expired', 'disabled'], default: 'not_evaluated' },
  providerGateStatus: { type: String, enum: ['not_run', 'passed', 'failed_transient', 'failed_configuration', 'failed_authentication', 'blocked_provider_unavailable', 'waived_restricted_mode', 'expired', 'disabled'] },
  requiredGateKeys: [safeId()], requiredEvidenceTypes: [safeId()], requiredReleaseCandidateId: safeId(),
  requiredMinimumVersion: safeVersion(), waiverAllowed: { type: Boolean, default: false },
  waiverPolicy: limitedMixed, defaultEnabledState: { type: Boolean, default: false },
  enabled: { type: Boolean, default: false }, safeReasonCodes: safeCodes,
  evaluatedAt: boundedDate, expiresAt: boundedDate, createdBy: actor, evaluatedBy: actor, approvedBy: actor,
}, [
  [{ capabilityKey: 1, scope: 1, environmentCategory: 1, pilotProgramId: 1, organizationId: 1, workspaceId: 1, version: 1 }, { unique: true, name: 'capability_gate_scope_version' }],
  [{ pilotProgramId: 1 }, { name: 'capability_gate_program' }],
  [{ organizationId: 1, workspaceId: 1 }, { name: 'capability_gate_tenant_workspace' }],
  [{ status: 1 }, { name: 'capability_gate_status' }],
  [{ expiresAt: 1 }, { name: 'capability_gate_expiry' }],
]);

const PilotPolicy = model('PilotPolicy', {
  scope: { type: String, enum: ['platform', 'pilot_program'], required: true }, name: safeText(120),
  description: safeText(1_000), version: safeVersion(true),
  status: { type: String, enum: ['draft', 'validating', 'active', 'archived'], default: 'draft' },
  maximumOrganizations: { type: Number, min: 1, max: 100 }, maximumWorkspaces: { type: Number, min: 1, max: 1000 },
  maximumUsers: { type: Number, min: 1, max: 10000 }, maximumConcurrentRunsPerWorkspace: { type: Number, min: 1, max: 100 },
  maximumDailyRunsPerWorkspace: { type: Number, min: 1, max: 10000 }, maximumConcurrentNodes: { type: Number, min: 1, max: 1000 },
  maximumDelegationDepth: { type: Number, min: 0, max: 16 }, maximumDelegationInvocations: { type: Number, min: 0, max: 1000 },
  maximumRunDurationMs: { type: Number, min: 1000, max: 86400000 }, maximumInputBytes: { type: Number, min: 1, max: 10485760 },
  maximumOutputBytes: { type: Number, min: 1, max: 10485760 }, allowedDataClassifications: [safeId()],
  prohibitedDataClassifications: [safeId()], permittedRegions: [safeId()], prohibitedRegions: [safeId()],
  allowedCapabilityKeys: capabilityList, approvalRequiredCapabilityKeys: capabilityList, disabledCapabilityKeys: capabilityList,
  supportHoursCategory: safeId(), incidentSeverityThreshold: safeId(), feedbackRetentionMs: Number,
  pilotEvidenceRetentionMs: Number, ...tenantFields, createdBy: actor, activatedBy: actor, archivedBy: actor,
}, [
  [{ status: 1, name: 1, version: 1 }, { unique: true, name: 'pilot_policy_name_version' }],
  [{ scope: 1, organizationId: 1 }, { name: 'pilot_policy_scope' }],
]);

const PilotProgram = model('PilotProgram', {
  programId: { ...safeId(true), unique: true }, name: safeText(120), description: safeText(1_000),
  version: safeVersion(true), status: { type: String, enum: ['draft', 'validating', 'approval_required', 'approved', 'onboarding', 'active', 'paused', 'expansion_blocked', 'graduating', 'completed', 'cancelled', 'archived'], default: 'draft' },
  releaseCandidateId: safeId(true), stagingDeploymentId: safeId(true), pilotPolicyId: safeId(true),
  maximumOrganizations: { type: Number, min: 1, max: 100 }, maximumWorkspacesPerOrganization: { type: Number, min: 1, max: 100 },
  maximumUsersPerWorkspace: { type: Number, min: 1, max: 1000 }, startAt: boundedDate, expectedEndAt: boundedDate,
  observationWindowMs: { type: Number, min: 60000, max: 2592000000 }, allowedCapabilities: capabilityList,
  prohibitedCapabilities: capabilityList, requiredCapabilityGateKeys: capabilityList, dataClassificationLimit: safeId(),
  residencyTags: [safeId()], allowedRegions: [safeId()], supportModel: safeId(),
  escalationPolicyReference: safeText(256), onboardingChecklistId: safeId(), successCriteriaId: safeId(), exitCriteriaId: safeId(),
  approvalRequestId: safeId(), ...tenantFields, ...requestFields, requestedBy: actor, approvedBy: actor,
  startedAt: boundedDate, completedAt: boundedDate,
}, [
  [{ status: 1, createdAt: -1 }, { name: 'pilot_program_status_created' }],
  [{ releaseCandidateId: 1 }, { name: 'pilot_program_release' }],
  [{ organizationId: 1, name: 1, version: 1 }, { unique: true, name: 'pilot_program_name_version' }],
]);

const PilotTenantEnrollment = model('PilotTenantEnrollment', {
  pilotProgramId: safeId(true), organizationId: { type: String, required: true, trim: true, maxlength: 200 },
  status: { type: String, enum: ['invited', 'eligibility_review', 'approval_required', 'approved', 'onboarding', 'active', 'paused', 'suspended', 'withdrawal_requested', 'withdrawn', 'graduated', 'rejected'], default: 'invited' },
  homeRegionId: safeId(true), residencyTags: [safeId()], approvedDataClassifications: [safeId()],
  enabledCapabilityKeys: capabilityList, disabledCapabilityKeys: capabilityList, pilotQuotaProfile: limitedMixed,
  supportOwnerReference: safeText(256), eligibilityDecisionId: safeId(), approvalRequestId: safeId(),
  onboardingChecklistRunId: safeId(), ...requestFields, requestedBy: actor, approvedBy: actor, activatedBy: actor,
  invitedAt: boundedDate, approvedAt: boundedDate, activatedAt: boundedDate, suspendedAt: boundedDate,
  withdrawnAt: boundedDate, graduatedAt: boundedDate,
}, [
  [{ pilotProgramId: 1, organizationId: 1 }, { unique: true, name: 'pilot_tenant_program_org' }],
  [{ status: 1 }, { name: 'pilot_tenant_status' }],
  [{ homeRegionId: 1 }, { name: 'pilot_tenant_home_region' }],
]);

const PilotWorkspaceEnrollment = model('PilotWorkspaceEnrollment', {
  pilotProgramId: safeId(true), ...tenantFields,
  status: { type: String, enum: ['invited', 'approved', 'onboarding', 'active', 'paused', 'suspended', 'withdrawn', 'graduated', 'rejected'], default: 'invited' },
  allowedCapabilities: capabilityList, disabledCapabilities: capabilityList, quotaOverrides: limitedMixed,
  dataClassificationLimit: safeId(), residencyTags: [safeId()], onboardingStatus: safeId(),
  supportOwnerReference: safeText(256), ...requestFields,
}, [
  [{ pilotProgramId: 1, organizationId: 1, workspaceId: 1 }, { unique: true, name: 'pilot_workspace_program_org_workspace' }],
  [{ status: 1 }, { name: 'pilot_workspace_status' }],
]);

const PilotUserMembership = model('PilotUserMembership', {
  pilotProgramId: safeId(true), ...tenantFields, userId: { type: String, required: true, trim: true, maxlength: 200 },
  pilotRole: { type: String, enum: ['pilot_admin', 'pilot_operator', 'pilot_builder', 'pilot_viewer', 'pilot_support'], required: true },
  status: { type: String, enum: ['invited', 'active', 'suspended', 'withdrawn'], default: 'invited' },
  acknowledgementStatus: safeId(), onboardingStatus: safeId(), invitedAt: boundedDate,
  activatedAt: boundedDate, withdrawnAt: boundedDate, ...requestFields,
}, [
  [{ pilotProgramId: 1, organizationId: 1, workspaceId: 1, userId: 1 }, { unique: true, name: 'pilot_user_membership_unique' }],
  [{ status: 1 }, { name: 'pilot_user_membership_status' }],
]);

const PilotOnboardingChecklist = model('PilotOnboardingChecklist', {
  name: safeText(120), version: safeVersion(true), status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  items: [{ key: safeId(true), label: safeText(200), required: { type: Boolean, default: true }, evidenceCategory: safeId() }],
  ...tenantFields, createdBy: actor, activatedBy: actor,
}, [[{ organizationId: 1, name: 1, version: 1 }, { unique: true, name: 'pilot_onboarding_checklist_version' }]]);

const PilotOnboardingRun = model('PilotOnboardingRun', {
  checklistId: safeId(true), checklistVersion: safeVersion(true), pilotProgramId: safeId(true), ...tenantFields,
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'approval_required', 'approved', 'rejected'], default: 'not_started' },
  items: [{ key: safeId(true), status: { type: String, enum: ['pending', 'completed', 'not_applicable'] }, safeEvidenceReference: safeText(256), completedBy: actor, completedAt: boundedDate }],
  startedBy: actor, approvedBy: actor, startedAt: boundedDate, completedAt: boundedDate, approvedAt: boundedDate,
}, [[{ pilotProgramId: 1, organizationId: 1, workspaceId: 1, status: 1 }, { name: 'pilot_onboarding_run_scope' }]]);

const PilotAcknowledgement = model('PilotAcknowledgement', {
  pilotProgramId: safeId(true), ...tenantFields, userId: actor,
  acknowledgementKey: safeId(true), acknowledgementVersion: safeVersion(true),
  status: { type: String, enum: ['pending', 'acknowledged', 'withdrawn', 'expired'], default: 'pending' },
  acknowledgedAt: boundedDate, expiresAt: boundedDate,
}, [[{ pilotProgramId: 1, organizationId: 1, workspaceId: 1, userId: 1, acknowledgementKey: 1, acknowledgementVersion: 1 }, { unique: true, name: 'pilot_acknowledgement_unique' }]]);

const PilotSuccessCriteria = model('PilotSuccessCriteria', {
  name: safeText(120), version: safeVersion(true), status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  thresholds: limitedMixed, mandatoryZeroViolationKeys: [safeId()], ...tenantFields, createdBy: actor, activatedBy: actor,
}, [[{ organizationId: 1, name: 1, version: 1 }, { unique: true, name: 'pilot_success_criteria_version' }]]);

const PilotExitCriteria = model('PilotExitCriteria', {
  name: safeText(120), version: safeVersion(true), status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  requiredEvidenceTypes: [safeId()], allowedOutcomes: [{ type: String, enum: ['graduate', 'extend', 'pause', 'restrict_capabilities', 'remediate', 'terminate'] }],
  ...tenantFields, createdBy: actor, activatedBy: actor,
}, [[{ organizationId: 1, name: 1, version: 1 }, { unique: true, name: 'pilot_exit_criteria_version' }]]);

const PilotObservationWindow = model('PilotObservationWindow', {
  pilotProgramId: safeId(true), ...tenantOptional, releaseCandidateId: safeId(true),
  windowStart: { type: Date, required: true }, windowEnd: { type: Date, required: true }, sequence: { type: Number, min: 1, required: true },
  enrollmentSummary: limitedMixed, usageSummary: limitedMixed, reliabilitySummary: limitedMixed, latencySummary: limitedMixed,
  queueSummary: limitedMixed, workerSummary: limitedMixed, databaseSummary: limitedMixed, cacheSummary: limitedMixed,
  recoverySummary: limitedMixed, compensationSummary: limitedMixed, incidentSummary: limitedMixed, supportSummary: limitedMixed,
  feedbackSummary: limitedMixed, capabilitySummary: limitedMixed, gateSummary: limitedMixed, capacitySummary: limitedMixed,
  safeWarnings: safeCodes, safeFailureCodes: safeCodes, generatedAt: boundedDate,
}, [
  [{ pilotProgramId: 1, windowStart: -1 }, { name: 'pilot_observation_program_window' }],
  [{ organizationId: 1, workspaceId: 1, windowStart: -1 }, { name: 'pilot_observation_scope_window' }],
]);

const PilotOperationalReview = model('PilotOperationalReview', {
  pilotProgramId: safeId(true), reviewDate: { type: Date, required: true }, reviewPeriodStart: boundedDate, reviewPeriodEnd: boundedDate,
  healthStatus: safeId(), launchBlockers: [safeId()], incidentsReviewed: [safeId()], supportCasesReviewed: [safeId()],
  feedbackReviewed: [safeId()], quotaFindings: safeCodes, capacityFindings: safeCodes, gateFindings: safeCodes,
  actions: [{ actionKey: safeId(true), status: safeId(), ownerReference: safeText(256) }],
  ownerReferences: [safeId()], nextReviewAt: boundedDate, ...tenantFields, createdBy: actor, approvedBy: actor,
}, [[{ pilotProgramId: 1, reviewDate: -1 }, { unique: true, name: 'pilot_operational_review_date' }]]);

const PilotLaunchBlocker = model('PilotLaunchBlocker', {
  pilotProgramId: safeId(true), category: { type: String, enum: ['security', 'tenancy', 'authorization', 'policy', 'secret_exposure', 'database', 'queue', 'worker', 'runtime_gateway', 'external_provider', 'observability', 'SLO', 'incident', 'capacity', 'disaster_recovery', 'support', 'onboarding', 'documentation', 'legal_review_required', 'unknown'], required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  status: { type: String, enum: ['open', 'investigating', 'mitigation_in_progress', 'resolved', 'accepted_risk', 'expired', 'superseded'], default: 'open' },
  safeSummary: safeText(1_000), affectedCapability: { type: String, enum: CAPABILITY_KEYS }, mitigationReference: safeText(256),
  ownerReference: safeText(256), expiresAt: boundedDate, ...tenantFields,
}, [
  [{ pilotProgramId: 1, status: 1 }, { name: 'pilot_blocker_program_status' }],
  [{ category: 1, severity: 1 }, { name: 'pilot_blocker_category_severity' }],
  [{ createdAt: -1 }, { name: 'pilot_blocker_created' }],
]);

const PilotLaunchDecision = model('PilotLaunchDecision', {
  pilotProgramId: safeId(true), releaseCandidateId: safeId(true), stagingDeploymentId: safeId(true),
  decision: { type: String, enum: ['approve', 'approve_restricted', 'defer', 'pause', 'reject', 'terminate'], required: true },
  readinessStatus: safeId(true), riskCategory: safeId(true), enabledCapabilities: capabilityList,
  disabledCapabilities: capabilityList, restrictions: [safeText(256)], launchBlockerIds: [safeId()],
  waiverIds: [safeId()], evidencePackageId: safeId(), approvalRequestId: safeId(), decidedBy: actor,
  decidedAt: { type: Date, required: true }, expiresAt: boundedDate, ...tenantFields,
}, [
  [{ pilotProgramId: 1, createdAt: -1 }, { name: 'pilot_launch_decision_program_created' }],
  [{ releaseCandidateId: 1 }, { name: 'pilot_launch_decision_release' }],
  [{ decision: 1 }, { name: 'pilot_launch_decision_type' }],
]);

const PilotFeedback = model('PilotFeedback', {
  pilotProgramId: safeId(true), ...tenantFields, submittedBy: actor,
  category: { type: String, enum: ['onboarding', 'usability', 'orchestration', 'agent_selection', 'delegation', 'recovery', 'performance', 'reliability', 'observability', 'documentation', 'support', 'feature_request', 'other'], required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  title: safeText(160), safeSummary: safeText(2_000), reproductionCategory: safeId(),
  affectedCapabilityKey: { type: String, enum: CAPABILITY_KEYS }, relatedRunReference: safeId(),
  relatedRequestReference: safeId(), relatedTraceReference: safeId(),
  status: { type: String, enum: ['submitted', 'triaged', 'planned', 'in_progress', 'resolved', 'declined', 'duplicate', 'archived'], default: 'submitted' },
  classification: safeId(), containsSensitiveData: { type: Boolean, default: false },
  redactionStatus: { type: String, enum: ['not_required', 'redacted', 'quarantined', 'rejected'], required: true },
  assignedOwnerReference: safeText(256), triagedAt: boundedDate, resolvedAt: boundedDate,
}, [
  [{ pilotProgramId: 1, status: 1, createdAt: -1 }, { name: 'pilot_feedback_program_status_created' }],
  [{ organizationId: 1, workspaceId: 1 }, { name: 'pilot_feedback_scope' }],
  [{ category: 1, severity: 1 }, { name: 'pilot_feedback_category_severity' }],
  [{ relatedTraceReference: 1, relatedRequestReference: 1 }, { name: 'pilot_feedback_references' }],
]);

const PilotSupportCase = model('PilotSupportCase', {
  pilotProgramId: safeId(true), ...tenantFields, caseNumber: { ...safeId(true), unique: true },
  category: safeId(true), severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  status: { type: String, enum: ['open', 'acknowledged', 'investigating', 'escalated', 'resolved', 'closed', 'cancelled'], default: 'open' },
  safeSummary: safeText(1_000), affectedCapability: { type: String, enum: CAPABILITY_KEYS },
  assignedOwnerReference: safeText(256), escalationPolicyReference: safeText(256), linkedIncidentId: safeId(),
  linkedFeedbackIds: [safeId()], responseCategory: safeId(), resolutionCategory: safeId(),
  acknowledgedAt: boundedDate, resolvedAt: boundedDate,
}, [
  [{ pilotProgramId: 1, status: 1, createdAt: -1 }, { name: 'pilot_support_program_status_created' }],
  [{ organizationId: 1, workspaceId: 1 }, { name: 'pilot_support_scope' }],
  [{ severity: 1 }, { name: 'pilot_support_severity' }],
]);

const PilotKillSwitch = model('PilotKillSwitch', {
  pilotProgramId: safeId(true), switchKey: { type: String, enum: KILL_SWITCH_KEYS, required: true },
  scope: { type: String, enum: ['pilot_program', 'pilot_tenant', 'pilot_workspace'], required: true },
  ...tenantOptional, status: { type: String, enum: ['inactive', 'active'], default: 'inactive' },
  reasonCode: safeId(), approvalRequestId: safeId(), activatedBy: actor, deactivatedBy: actor,
  activatedAt: boundedDate, deactivatedAt: boundedDate,
}, [[{ pilotProgramId: 1, switchKey: 1, organizationId: 1, workspaceId: 1 }, { unique: true, name: 'pilot_kill_switch_scope' }]]);

const PilotCommunication = model('PilotCommunication', {
  pilotProgramId: safeId(true), category: { type: String, enum: ['invitation_prepared', 'onboarding_instructions_prepared', 'maintenance_notice_prepared', 'incident_update_prepared', 'provider_outage_notice_prepared', 'pilot_pause_notice_prepared', 'pilot_resume_notice_prepared', 'graduation_notice_prepared'], required: true },
  status: { type: String, enum: ['draft', 'approved', 'manual_delivery_required', 'delivered_externally', 'delivery_failed', 'cancelled'], default: 'draft' },
  safeSubject: safeText(200), safeBodySummary: safeText(2_000), adapterType: { type: String, enum: ['mock', 'noop', 'manual_external'], required: true },
  manualDeliveryReference: safeText(256), ...tenantFields, ...requestFields, createdBy: actor, approvedBy: actor, deliveredAt: boundedDate,
}, [[{ pilotProgramId: 1, status: 1, createdAt: -1 }, { name: 'pilot_communication_program_status' }]]);

const PilotEvidencePackage = model('PilotEvidencePackage', {
  pilotProgramId: safeId(true), releaseCandidateId: safeId(true), stagingDeploymentId: safeId(true),
  launchDecisionId: safeId(), stagingReadinessSummary: limitedMixed, smokeTestSummary: limitedMixed,
  capabilityGateSummary: limitedMixed, onboardingSummary: limitedMixed, enrollmentSummary: limitedMixed,
  usageSummary: limitedMixed, reliabilitySummary: limitedMixed, performanceSummary: limitedMixed,
  capacitySummary: limitedMixed, incidentSummary: limitedMixed, supportSummary: limitedMixed,
  feedbackSummary: limitedMixed, securitySummary: limitedMixed, sloSummary: limitedMixed,
  disasterRecoverySummary: limitedMixed, liveProviderSummary: limitedMixed, blockerSummary: limitedMixed,
  approvalSummary: limitedMixed, waiverSummary: limitedMixed, evidenceDigest: { type: String, required: true, immutable: true },
  generatedBy: actor, generatedAt: boundedDate, approvedAt: boundedDate, ...tenantFields,
}, [[{ pilotProgramId: 1, generatedAt: -1 }, { name: 'pilot_evidence_program_generated' }]]);

module.exports = {
  CapabilityLaunchGate, PilotAcknowledgement, PilotCommunication, PilotEvidencePackage,
  PilotExitCriteria, PilotFeedback, PilotKillSwitch, PilotLaunchBlocker, PilotLaunchDecision,
  PilotObservationWindow, PilotOnboardingChecklist, PilotOnboardingRun, PilotOperationalReview,
  PilotPolicy, PilotProgram, PilotSuccessCriteria, PilotSupportCase, PilotTenantEnrollment,
  PilotUserMembership, PilotWorkspaceEnrollment, StagingDeployment, StagingSmokeTestPlan,
  StagingSmokeTestRun,
};
