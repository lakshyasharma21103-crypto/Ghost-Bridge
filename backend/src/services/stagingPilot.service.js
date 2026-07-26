const crypto = require('node:crypto');
const models = require('../models/stagingPilotModels');
const core = require('./stagingPilotCore.service');
const metrics = require('./stagingPilotMetrics.service');
const { createAuditLog } = require('./auditService');
const { consumeApprovalGrants, enforceApproval } = require('./approval.service');
const { MockDeploymentAdapter, NoopDeploymentAdapter } = require('./releaseReadinessCore.service');
const { AppError } = require('../utils/AppError');
const OrchestrationRun = require('../models/OrchestrationRun');
const ReleaseFeatureFlag = require('../models/ReleaseFeatureFlag');

function deps(overrides = {}) {
  return { ...models, OrchestrationRun, ReleaseFeatureFlag, consumeApprovalGrants, createAuditLog, enforceApproval, metrics, ...overrides };
}

function id(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function plain(value) {
  if (!value) return value;
  const output = typeof value.toObject === 'function' ? value.toObject({ depopulate: true }) : { ...value };
  output.id = id(value);
  delete output._id;
  delete output.__v;
  delete output.idempotencyKeyHash;
  delete output.requestFingerprint;
  return core.redactPilotContent(output);
}

function pick(input, keys) {
  return Object.fromEntries(keys.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]));
}

function scope(input = {}, caller = {}) {
  const organizationId = id(input.organizationId || caller.partner?.organizationId || caller.partner?._id);
  if (!organizationId) throw new AppError(400, 'PILOT_SCOPE_REQUIRED', 'Organization scope is required.');
  const requested = id(input.organizationId);
  if (requested && requested !== organizationId && caller.platformAuthorized !== true) {
    throw new AppError(403, 'AUTHORIZATION_DENIED', 'Pilot data is not available.');
  }
  return {
    organizationId,
    workspaceId: id(input.workspaceId || input.receivingWorkspaceId) || undefined,
    actorId: id(caller.partner?._id || caller.authorization?.actorId || 'system'),
    actorType: caller.partner ? 'partner' : 'system',
    requestId: caller.requestId,
    traceId: caller.traceId,
  };
}

function filterFor(value) {
  return { organizationId: value.organizationId, ...(value.workspaceId ? { workspaceId: value.workspaceId } : {}) };
}

function mutationFields(input, purpose, value) {
  if (!input.idempotencyKey) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required.');
  const hash = (text) => `sha256:${crypto.createHash('sha256').update(text).digest('hex')}`;
  return {
    idempotencyKeyHash: hash(`${purpose}:${value.organizationId}:${input.idempotencyKey}`),
    requestFingerprint: hash(JSON.stringify(core.redactPilotContent(input))),
    requestId: value.requestId,
    traceId: value.traceId,
  };
}

async function audit(action, type, record, value, metadata, dependencies) {
  await dependencies.createAuditLog(value.actorType, value.actorId, action, type, id(record), {
    organizationId: value.organizationId,
    workspaceId: record?.workspaceId || value.workspaceId,
    ...core.redactPilotContent(metadata || {}),
  }, { requestId: value.requestId, traceId: value.traceId });
}

async function page(Model, query, input = {}) {
  const limit = Math.min(100, Math.max(1, Number(input.limit || 50)));
  const records = await Model.find(query).sort({ createdAt: -1, _id: -1 }).limit(limit).lean();
  return { items: records.map(plain), limit, nextCursor: records.length === limit ? id(records.at(-1)) : null };
}

async function one(Model, query, code) {
  const record = await Model.findOne(query);
  if (!record) throw new AppError(404, code, 'The requested launch record was not found.');
  return record;
}

function approval(input, code = 'PILOT_APPROVAL_REQUIRED') {
  if (!input.approvalRequestId) throw new AppError(409, code, 'A governed approval reference is required.');
}

async function governedApproval(input, value, permission, resourceType, record, dependencies) {
  approval(input);
  const enforcement = await dependencies.enforceApproval({
    organizationId: value.organizationId,
    workspaceId: record?.workspaceId || value.workspaceId,
    requesterActorId: value.actorId,
    requesterActorType: value.actorType,
    permission,
    resourceType,
    resourceId: id(record),
    operationType: permission.replaceAll('.', '_').toUpperCase(),
    environment: process.env.NODE_ENV,
    safeRequestAttributes: {
      requestedAction: permission,
      environmentCategory: 'staging',
      releaseVersion: record?.releaseVersion,
      deploymentStatus: record?.status,
      pilotProgramStatus: record?.status,
      capabilityKey: record?.capabilityKey,
    },
    approvalRequestId: input.approvalRequestId,
    approvalRequestIds: input.approvalRequestIds,
  });
  return dependencies.consumeApprovalGrants(enforcement, {
    actorId: value.actorId,
    actorType: value.actorType,
    requestId: value.requestId,
    traceId: value.traceId,
  });
}

async function createStagingDeployment(input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies);
  const s = scope(input, caller);
  const targetCategory = input.targetCategory || 'staging';
  if (targetCategory === 'production') throw new AppError(403, 'PRODUCTION_DEPLOYMENT_DISABLED', 'Production deployment is disabled.');
  const record = await d.StagingDeployment.create({
    deploymentId: input.deploymentId || `stg-${crypto.randomUUID()}`,
    releaseCandidateId: input.releaseCandidateId,
    rolloutPlanId: input.rolloutPlanId,
    deploymentTargetId: input.deploymentTargetId,
    releaseVersion: input.releaseVersion,
    sourceRevision: input.sourceRevision,
    manifestVersion: input.manifestVersion,
    status: 'validation_required',
    deploymentAdapterType: input.deploymentAdapterType || 'mock',
    providerExecutionMode: input.providerExecutionMode || 'mock',
    executionState: input.providerExecutionMode === 'manual_external' ? 'manual_action_required' : 'not_requested',
    regionIds: input.regionIds || [],
    serviceCategories: input.serviceCategories || [],
    workerPoolCategories: input.workerPoolCategories || [],
    expectedInstanceVersions: input.expectedInstanceVersions || [],
    ...filterFor(s), ...mutationFields(input, 'staging-deployment-create', s),
    requestedBy: s.actorId, requestedAt: new Date(),
  });
  d.metrics.increment('staging_deployment', { status: record.status });
  await audit('staging.deployment.created', 'StagingDeployment', record, s, { status: record.status }, d);
  return plain(record);
}

async function listStagingDeployments(input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  return page(d.StagingDeployment, { ...filterFor(s), ...(input.status ? { status: input.status } : {}) }, input);
}

async function getStagingDeployment(deploymentId, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  return plain(await one(d.StagingDeployment, { deploymentId, ...filterFor(s) }, 'STAGING_DEPLOYMENT_NOT_FOUND'));
}

async function stagingDeploymentAction(deploymentId, action, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const record = await one(d.StagingDeployment, { deploymentId, ...filterFor(s) }, 'STAGING_DEPLOYMENT_NOT_FOUND');
  if (action === 'validate') {
    record.status = core.transitionStagingDeployment(record.status, 'validating');
    const preflight = core.evaluateStagingPreflight(input.checks || {});
    record.status = core.transitionStagingDeployment(record.status, preflight.state === 'blocked' || preflight.state === 'insufficient_evidence' ? 'blocked' : 'approval_required');
    record.readinessStatus = preflight.state;
  } else if (action === 'approve') {
    await governedApproval(input, s, 'stagingDeployment.approve', 'StagingDeployment', record, d); record.status = core.transitionStagingDeployment(record.status, 'approved');
    record.approvalRequestId = input.approvalRequestId; record.approvedBy = s.actorId;
  } else if (action === 'recordExternal') {
    await governedApproval(input, s, 'stagingDeployment.recordExternal', 'StagingDeployment', record, d);
    const evidence = core.validateExternalDeploymentEvidence({ ...input, providerExecutionMode: record.providerExecutionMode });
    if (!evidence.valid) throw new AppError(400, evidence.safeReasonCodes[0], 'External deployment evidence is incomplete.');
    if (record.status === 'approved') record.status = core.transitionStagingDeployment(record.status, 'deployment_requested');
    record.status = core.transitionStagingDeployment(record.status, 'deployed');
    record.executionState = 'observed'; record.manualExecutionReference = input.manualExecutionReference;
    record.observedInstanceVersions = input.observedInstanceVersions; record.deployedAt = new Date();
  } else if (action === 'deployMock') {
    if (record.providerExecutionMode !== 'mock') throw new AppError(409, 'STAGING_MOCK_MODE_REQUIRED', 'Mock execution mode is required.');
    if (record.status === 'approved') record.status = core.transitionStagingDeployment(record.status, 'deployment_requested');
    record.status = core.transitionStagingDeployment(record.status, 'deployment_in_progress');
    const adapter = options.adapter || new MockDeploymentAdapter();
    await adapter.beginRollout({ targetVersion: record.releaseVersion });
    const observed = await adapter.inspectInstanceVersions();
    record.observedInstanceVersions = observed.instances.map((item) => item.version);
    record.status = core.transitionStagingDeployment(record.status, 'deployed');
    record.executionState = 'observed'; record.deployedAt = new Date();
  } else if (action === 'verify') {
    record.status = core.transitionStagingDeployment(record.status, 'verification_in_progress');
    const expected = new Set(record.expectedInstanceVersions.map(String));
    const observed = record.observedInstanceVersions.map(String);
    const versionsMatch = observed.length > 0 && observed.every((version) => expected.has(version));
    record.status = core.transitionStagingDeployment(record.status, versionsMatch && input.healthStatus !== 'degraded' ? (input.warnings?.length ? 'healthy_with_warnings' : 'healthy') : 'degraded');
    record.healthStatus = input.healthStatus || (versionsMatch ? 'healthy' : 'degraded');
    record.readinessStatus = versionsMatch ? 'ready' : 'not_ready'; record.executionState = versionsMatch ? 'verified' : 'verification_failed';
    record.verifiedBy = s.actorId; record.verifiedAt = new Date();
  } else if (action === 'rollback') {
    await governedApproval(input, s, 'stagingDeployment.rollback', 'StagingDeployment', record, d);
    if (record.status !== 'rollback_required') record.status = core.transitionStagingDeployment(record.status, 'rollback_required');
    record.status = core.transitionStagingDeployment(record.status, 'rolled_back'); record.completedAt = new Date();
  } else if (action === 'archive') {
    record.status = core.transitionStagingDeployment(record.status, 'archived');
  }
  await record.save();
  d.metrics.increment('staging_deployment', { status: record.status });
  await audit(`staging.deployment.${action === 'recordExternal' ? 'external_recorded' : action + 'd'}`, 'StagingDeployment', record, s, { status: record.status }, d);
  return plain(record);
}

async function createSmokePlan(input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const validation = core.validateSmokeTestPlan(input);
  if (!validation.valid) throw new AppError(400, validation.safeReasonCodes[0], 'Smoke-test plan validation failed.');
  const record = await d.StagingSmokeTestPlan.create({
    name: input.name, description: input.description, version: input.version || '1', status: 'draft',
    releaseCandidateId: input.releaseCandidateId, deploymentTargetId: input.deploymentTargetId,
    testDefinitions: input.testDefinitions.map((item) => typeof item === 'string' ? { key: item } : item),
    executionMode: input.executionMode || 'simulation', syntheticTenantProfile: input.syntheticTenantProfile || {},
    syntheticWorkspaceProfile: input.syntheticWorkspaceProfile || {}, cleanupPolicy: input.cleanupPolicy || 'always',
    maximumRequestCount: input.maximumRequestCount, maximumMutationCount: input.maximumMutationCount,
    maximumDurationMs: input.maximumDurationMs, maximumConcurrency: input.maximumConcurrency,
    requireApproval: input.requireApproval !== false, requiredCapabilities: input.requiredCapabilities || [],
    prohibitedCapabilities: input.prohibitedCapabilities || ['external.grounded_research'],
    ...filterFor(s), ...mutationFields(input, 'smoke-plan-create', s), createdBy: s.actorId,
  });
  await audit('staging.smoke_plan.created', 'StagingSmokeTestPlan', record, s, {}, d);
  return plain(record);
}

async function listSmokePlans(input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); return page(d.StagingSmokeTestPlan, filterFor(s), input);
}
async function getSmokePlan(planId, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); return plain(await one(d.StagingSmokeTestPlan, { _id: planId, ...filterFor(s) }, 'SMOKE_PLAN_NOT_FOUND'));
}
async function smokePlanAction(planId, action, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const record = await one(d.StagingSmokeTestPlan, { _id: planId, ...filterFor(s) }, 'SMOKE_PLAN_NOT_FOUND');
  if (record.status !== 'draft' && ['update', 'validate'].includes(action)) throw new AppError(409, 'ACTIVE_SMOKE_PLAN_IMMUTABLE', 'Active smoke-test plans are immutable.');
  if (action === 'update') {
    for (const key of ['description', 'maximumRequestCount', 'maximumMutationCount', 'maximumDurationMs', 'maximumConcurrency']) if (input[key] != null) record[key] = input[key];
  } else if (action === 'validate') {
    const result = core.validateSmokeTestPlan(plain(record)); if (!result.valid) throw new AppError(400, result.safeReasonCodes[0], 'Smoke-test plan validation failed.');
  } else if (action === 'activate') {
    await governedApproval(input, s, 'stagingSmokeTest.activate', 'StagingSmokeTestPlan', record, d); record.status = 'active'; record.activatedBy = s.actorId;
  } else if (action === 'archive') record.status = 'archived';
  await record.save(); await audit(`staging.smoke_plan.${action}d`, 'StagingSmokeTestPlan', record, s, {}, d); return plain(record);
}

async function createSmokeRun(input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const plan = await one(d.StagingSmokeTestPlan, { _id: input.smokeTestPlanId, status: 'active', ...filterFor(s) }, 'ACTIVE_SMOKE_PLAN_NOT_FOUND');
  const record = await d.StagingSmokeTestRun.create({
    smokeTestPlanId: id(plan), smokeTestPlanVersion: plan.version, stagingDeploymentId: input.stagingDeploymentId,
    releaseCandidateId: plan.releaseCandidateId, status: plan.requireApproval ? 'approval_required' : 'requested',
    syntheticTenantId: input.syntheticTenantId, syntheticWorkspaceId: input.syntheticWorkspaceId,
    cleanupStatus: 'not_started', ...filterFor(s), ...mutationFields(input, 'smoke-run-create', s), requestedBy: s.actorId,
  });
  return plain(record);
}
async function listSmokeRuns(input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return page(d.StagingSmokeTestRun, filterFor(s), input); }
async function getSmokeRun(runId, input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return plain(await one(d.StagingSmokeTestRun, { _id: runId, ...filterFor(s) }, 'SMOKE_RUN_NOT_FOUND')); }
async function smokeRunAction(runId, action, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const record = await one(d.StagingSmokeTestRun, { _id: runId, ...filterFor(s) }, 'SMOKE_RUN_NOT_FOUND');
  if (action === 'execute') {
    if (record.status === 'approval_required') await governedApproval(input, s, 'stagingSmokeTest.execute', 'StagingSmokeTestRun', record, d);
    const plan = await one(d.StagingSmokeTestPlan, { _id: record.smokeTestPlanId, status: 'active', ...filterFor(s) }, 'ACTIVE_SMOKE_PLAN_NOT_FOUND');
    record.status = 'running'; record.startedAt = new Date(); const result = core.executeDeterministicSmokeTests(plain(plan), input.fixtures || {});
    Object.assign(record, result, { completedAt: new Date() });
  } else if (action === 'abort') record.status = 'aborted';
  else if (action === 'cleanup') { record.status = 'cleaned_up'; record.cleanupStatus = 'cleaned_up'; }
  await record.save(); d.metrics.increment('staging_smoke_run', { outcome: record.status });
  await audit(`staging.smoke_run.${action === 'execute' ? record.status : action}`, 'StagingSmokeTestRun', record, s, {}, d);
  return plain(record);
}

async function listCapabilityGates(input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  return page(d.CapabilityLaunchGate, { $or: [{ organizationId: s.organizationId }, { organizationId: { $exists: false } }], ...(input.status ? { status: input.status } : {}) }, input);
}
async function getCapabilityGate(capabilityKey, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  return plain(await one(d.CapabilityLaunchGate, { capabilityKey, $or: [{ organizationId: s.organizationId }, { organizationId: { $exists: false } }] }, 'CAPABILITY_GATE_NOT_FOUND'));
}
async function capabilityGateAction(capabilityKey, action, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  let record = await d.CapabilityLaunchGate.findOne({ capabilityKey, scope: input.scope || 'pilot_program', pilotProgramId: input.pilotProgramId, organizationId: input.scope === 'platform' ? { $exists: false } : s.organizationId });
  if (!record) record = new d.CapabilityLaunchGate({
    capabilityKey, displayName: input.displayName || capabilityKey, version: input.version || '1',
    scope: input.scope || 'pilot_program', environmentCategory: input.environmentCategory || 'staging',
    pilotProgramId: input.pilotProgramId, ...(input.scope === 'platform' ? {} : filterFor(s)),
    requiredGateKeys: input.requiredGateKeys || [], requiredEvidenceTypes: input.requiredEvidenceTypes || [],
    requiredReleaseCandidateId: input.requiredReleaseCandidateId, requiredMinimumVersion: input.requiredMinimumVersion,
    waiverAllowed: input.waiverAllowed === true, defaultEnabledState: input.defaultEnabledState === true, status: 'not_evaluated',
    createdBy: s.actorId,
  });
  if (action === 'evaluate') {
    const result = capabilityKey === 'external.grounded_research' ? core.evaluateGroundedResearchGate(input) : core.evaluateCapabilityGate({ ...plain(record), status: input.status || record.status }, input);
    record.status = ({
      blocked_provider_unavailable: 'blocked', failed_transient: 'failed',
      failed_configuration: 'failed', failed_authentication: 'failed',
      waived_restricted_mode: 'waived', not_run: 'blocked',
    })[result.status] || result.status;
    record.providerGateStatus = capabilityKey === 'external.grounded_research' ? result.status : undefined;
    record.enabled = result.enabled; record.safeReasonCodes = result.safeReasonCodes || []; record.evaluatedAt = new Date(); record.evaluatedBy = s.actorId;
  } else if (action === 'waive') {
    await governedApproval(input, s, 'capabilityLaunchGate.waive', 'CapabilityLaunchGate', record, d); const waiver = core.validateGateWaiver(input.waiver || input);
    if (!record.waiverAllowed || !waiver.valid) throw new AppError(400, waiver.safeReasonCodes?.[0] || 'CAPABILITY_WAIVER_NOT_ALLOWED', 'Capability waiver is not valid.');
    record.status = 'waived'; record.enabled = input.restrictedMode === true; record.safeReasonCodes = ['CAPABILITY_RESTRICTED_WAIVER'];
  } else if (action === 'disable') { record.status = 'disabled'; record.enabled = false; record.safeReasonCodes = ['CAPABILITY_DISABLED']; }
  await record.save(); d.metrics.increment('capability_gate', { status: record.status, capability_category: capabilityKey.split('.')[0] });
  await audit(`capability.gate.${action}`, 'CapabilityLaunchGate', record, s, { status: record.status, capabilityKey }, d); return plain(record);
}

async function createPilotPolicy(input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); const validation = core.validatePilotPolicy(input, input.platformHardLimits || {});
  if (!validation.valid) throw new AppError(400, validation.safeReasonCodes[0], 'Pilot policy validation failed.');
  const record = await d.PilotPolicy.create({
    ...pick(input, [
      'scope', 'name', 'description', 'version', 'maximumOrganizations', 'maximumWorkspaces',
      'maximumUsers', 'maximumConcurrentRunsPerWorkspace', 'maximumDailyRunsPerWorkspace',
      'maximumConcurrentNodes', 'maximumDelegationDepth', 'maximumDelegationInvocations',
      'maximumRunDurationMs', 'maximumInputBytes', 'maximumOutputBytes',
      'allowedDataClassifications', 'prohibitedDataClassifications', 'permittedRegions',
      'prohibitedRegions', 'allowedCapabilityKeys', 'approvalRequiredCapabilityKeys',
      'disabledCapabilityKeys', 'supportHoursCategory', 'incidentSeverityThreshold',
      'feedbackRetentionMs', 'pilotEvidenceRetentionMs',
    ]),
    status: 'draft', ...filterFor(s), createdBy: s.actorId,
  });
  await audit('pilot.policy.created', 'PilotPolicy', record, s, {}, d); return plain(record);
}
async function listPilotPolicies(input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return page(d.PilotPolicy, filterFor(s), input); }
async function getPilotPolicy(policyId, input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return plain(await one(d.PilotPolicy, { _id: policyId, ...filterFor(s) }, 'PILOT_POLICY_NOT_FOUND')); }
async function pilotPolicyAction(policyId, action, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); const record = await one(d.PilotPolicy, { _id: policyId, ...filterFor(s) }, 'PILOT_POLICY_NOT_FOUND');
  if (record.status !== 'draft' && ['update', 'validate'].includes(action)) throw new AppError(409, 'ACTIVE_PILOT_POLICY_IMMUTABLE', 'Active pilot policies are immutable.');
  if (action === 'update') Object.assign(record, pick(core.redactPilotContent(input), [
    'description', 'maximumOrganizations', 'maximumWorkspaces', 'maximumUsers',
    'maximumConcurrentRunsPerWorkspace', 'maximumDailyRunsPerWorkspace',
    'maximumConcurrentNodes', 'maximumDelegationDepth', 'maximumDelegationInvocations',
    'maximumRunDurationMs', 'maximumInputBytes', 'maximumOutputBytes',
    'allowedDataClassifications', 'prohibitedDataClassifications', 'permittedRegions',
    'prohibitedRegions', 'allowedCapabilityKeys', 'approvalRequiredCapabilityKeys',
    'disabledCapabilityKeys', 'supportHoursCategory', 'incidentSeverityThreshold',
    'feedbackRetentionMs', 'pilotEvidenceRetentionMs',
  ]), { status: 'draft' });
  else if (action === 'validate') { const result = core.validatePilotPolicy(plain(record), input.platformHardLimits || {}); if (!result.valid) throw new AppError(400, result.safeReasonCodes[0], 'Pilot policy validation failed.'); record.status = 'validating'; }
  else if (action === 'activate') { await governedApproval(input, s, 'pilotPolicy.activate', 'PilotPolicy', record, d); record.status = 'active'; record.activatedBy = s.actorId; }
  else if (action === 'archive') record.status = 'archived';
  await record.save(); await audit(`pilot.policy.${action}`, 'PilotPolicy', record, s, {}, d); return plain(record);
}

async function createPilotProgram(input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const record = await d.PilotProgram.create({
    ...pick(core.redactPilotContent(input), [
      'name', 'description', 'version', 'releaseCandidateId', 'stagingDeploymentId',
      'pilotPolicyId', 'maximumOrganizations', 'maximumWorkspacesPerOrganization',
      'maximumUsersPerWorkspace', 'startAt', 'expectedEndAt', 'observationWindowMs',
      'allowedCapabilities', 'prohibitedCapabilities', 'requiredCapabilityGateKeys',
      'dataClassificationLimit', 'residencyTags', 'allowedRegions', 'supportModel',
      'escalationPolicyReference', 'onboardingChecklistId', 'successCriteriaId',
      'exitCriteriaId',
    ]),
    programId: input.programId || `pilot-${crypto.randomUUID()}`,
    version: input.version || '1', status: 'draft', ...filterFor(s), ...mutationFields(input, 'pilot-program-create', s), requestedBy: s.actorId,
  });
  d.metrics.increment('pilot_program', { status: record.status }); await audit('pilot.program.created', 'PilotProgram', record, s, {}, d); return plain(record);
}
async function listPilotPrograms(input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return page(d.PilotProgram, filterFor(s), input); }
async function getPilotProgram(programId, input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return plain(await one(d.PilotProgram, { programId, ...filterFor(s) }, 'PILOT_PROGRAM_NOT_FOUND')); }

const PROGRAM_ACTIONS = Object.freeze({
  validate: ['draft', 'validating'], approve: ['validating', 'approved'], start: ['approved', 'active'],
  pause: ['active', 'paused'], resume: ['paused', 'active'], complete: ['active', 'completed'],
  cancel: ['draft', 'cancelled'], archive: ['completed', 'archived'],
});
async function pilotProgramAction(programId, action, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); const record = await one(d.PilotProgram, { programId, ...filterFor(s) }, 'PILOT_PROGRAM_NOT_FOUND');
  if (action === 'update') {
    if (record.status !== 'draft') throw new AppError(409, 'ACTIVE_PILOT_PROGRAM_IMMUTABLE', 'Active pilot programs are immutable.');
    for (const key of ['description', 'expectedEndAt', 'allowedCapabilities', 'prohibitedCapabilities']) if (input[key] != null) record[key] = input[key];
  } else {
    const transition = PROGRAM_ACTIONS[action]; if (!transition || record.status !== transition[0]) throw new AppError(409, 'PILOT_PROGRAM_TRANSITION_INVALID', 'Pilot-program transition is invalid.');
    if (['approve', 'start', 'resume', 'complete'].includes(action)) await governedApproval(input, s, `pilotProgram.${action}`, 'PilotProgram', record, d);
    if (action === 'start') {
      const research = await d.CapabilityLaunchGate.findOne({ capabilityKey: 'external.grounded_research', pilotProgramId: programId, organizationId: s.organizationId }).lean();
      record.prohibitedCapabilities = [...new Set([...(record.prohibitedCapabilities || []), ...(!research?.enabled ? ['external.grounded_research'] : [])])];
      record.startedAt = new Date();
    }
    record.status = transition[1]; if (action === 'approve') { record.approvedBy = s.actorId; record.approvalRequestId = input.approvalRequestId; } if (action === 'complete') record.completedAt = new Date();
  }
  await record.save(); d.metrics.increment('pilot_program', { status: record.status }); await audit(`pilot.program.${action}`, 'PilotProgram', record, s, { status: record.status }, d); return plain(record);
}

async function enrollOrganization(programId, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  await one(d.PilotProgram, { programId, ...filterFor(s) }, 'PILOT_PROGRAM_NOT_FOUND');
  const record = await d.PilotTenantEnrollment.create({
    pilotProgramId: programId, organizationId: input.enrolledOrganizationId || input.organizationId,
    status: 'eligibility_review', homeRegionId: input.homeRegionId, residencyTags: input.residencyTags || [],
    approvedDataClassifications: input.approvedDataClassifications || [], enabledCapabilityKeys: input.enabledCapabilityKeys || [],
    disabledCapabilityKeys: [...new Set([...(input.disabledCapabilityKeys || []), 'external.grounded_research'])],
    pilotQuotaProfile: core.resolvePilotQuotas(input.platformQuotas, input.programQuotas, input.pilotQuotaProfile),
    supportOwnerReference: input.supportOwnerReference, ...mutationFields(input, 'pilot-tenant-enroll', s),
    requestedBy: s.actorId, invitedAt: new Date(),
  });
  d.metrics.increment('pilot_enrollment', { scope: 'organization', status: record.status }); await audit('pilot.organization.invited', 'PilotTenantEnrollment', record, s, {}, d); return plain(record);
}
async function listOrganizations(programId, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  return page(d.PilotTenantEnrollment, { pilotProgramId: programId, ...(caller.platformAuthorized ? {} : { organizationId: input.enrolledOrganizationId || s.organizationId }) }, input);
}
async function getOrganization(programId, organizationId, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  if (organizationId !== s.organizationId && caller.platformAuthorized !== true) {
    throw new AppError(403, 'AUTHORIZATION_DENIED', 'Pilot enrollment is not available.');
  }
  return plain(await one(d.PilotTenantEnrollment, { pilotProgramId: programId, organizationId }, 'PILOT_ENROLLMENT_NOT_FOUND'));
}
async function organizationAction(programId, organizationId, action, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const record = await one(d.PilotTenantEnrollment, { pilotProgramId: programId, organizationId }, 'PILOT_ENROLLMENT_NOT_FOUND');
  const transitions = { approve: ['eligibility_review', 'approved'], activate: ['approved', 'active'], pause: ['active', 'paused'], resume: ['paused', 'active'], withdraw: ['active', 'withdrawn'], graduate: ['active', 'graduated'] };
  const transition = transitions[action]; if (!transition || record.status !== transition[0]) throw new AppError(409, 'PILOT_ENROLLMENT_TRANSITION_INVALID', 'Pilot enrollment transition is invalid.');
  if (['approve', 'activate', 'resume', 'graduate'].includes(action)) await governedApproval(input, s, `pilotEnrollment.${action}`, 'PilotTenantEnrollment', record, d);
  record.status = transition[1]; if (action === 'approve') record.approvedAt = new Date(); if (action === 'activate') record.activatedAt = new Date(); if (action === 'withdraw') record.withdrawnAt = new Date(); if (action === 'graduate') record.graduatedAt = new Date();
  await record.save(); d.metrics.increment('pilot_enrollment', { scope: 'organization', status: record.status }); await audit(`pilot.organization.${action}`, 'PilotTenantEnrollment', record, s, {}, d); return plain(record);
}
async function enrollWorkspace(programId, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const tenant = await one(d.PilotTenantEnrollment, { pilotProgramId: programId, organizationId: input.organizationId || s.organizationId, status: { $in: ['approved', 'active'] } }, 'ACTIVE_PILOT_TENANT_NOT_FOUND');
  const requested = input.allowedCapabilities || []; const excess = requested.filter((key) => !(tenant.enabledCapabilityKeys || []).includes(key));
  if (excess.length) throw new AppError(400, 'PILOT_WORKSPACE_CAPABILITY_EXCEEDS_TENANT', 'Workspace capabilities cannot exceed tenant enrollment.');
  const record = await d.PilotWorkspaceEnrollment.create({ pilotProgramId: programId, ...filterFor(s), status: input.status || 'active', allowedCapabilities: requested, disabledCapabilities: [...new Set([...(input.disabledCapabilities || []), ...(tenant.disabledCapabilityKeys || [])])], quotaOverrides: core.resolvePilotQuotas(tenant.pilotQuotaProfile, input.quotaOverrides), dataClassificationLimit: input.dataClassificationLimit, residencyTags: input.residencyTags || tenant.residencyTags, onboardingStatus: input.onboardingStatus || 'pending', supportOwnerReference: input.supportOwnerReference || tenant.supportOwnerReference, ...mutationFields(input, 'pilot-workspace-enroll', s) });
  d.metrics.increment('pilot_enrollment', { scope: 'workspace', status: record.status }); await audit('pilot.workspace.enrolled', 'PilotWorkspaceEnrollment', record, s, {}, d); return plain(record);
}
async function listWorkspaces(programId, input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return page(d.PilotWorkspaceEnrollment, { pilotProgramId: programId, ...filterFor(s) }, input); }
async function enrollUser(programId, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  await one(d.PilotWorkspaceEnrollment, { pilotProgramId: programId, ...filterFor(s), status: 'active' }, 'ACTIVE_PILOT_WORKSPACE_NOT_FOUND');
  const record = await d.PilotUserMembership.create({ pilotProgramId: programId, ...filterFor(s), userId: input.userId, pilotRole: input.pilotRole, status: input.status || 'active', acknowledgementStatus: input.acknowledgementStatus || 'pending', onboardingStatus: input.onboardingStatus || 'pending', invitedAt: new Date(), activatedAt: input.status === 'invited' ? undefined : new Date(), ...mutationFields(input, 'pilot-user-enroll', s) });
  d.metrics.increment('pilot_enrollment', { scope: 'user', status: record.status }); await audit('pilot.user.enrolled', 'PilotUserMembership', record, s, {}, d); return plain(record);
}
async function listUsers(programId, input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return page(d.PilotUserMembership, { pilotProgramId: programId, ...filterFor(s) }, input); }

async function evaluatePilotAdmissionBoundary(input = {}, caller = {}, options = {}) {
  if (!input.pilotProgramId) return { applies: false };
  const d = deps(options.dependencies); const s = scope(input, caller);
  const capabilityKey = input.capabilityKey || 'orchestration.basic';
  const [program, tenant, workspace, membership, gate, featureFlag] = await Promise.all([
    d.PilotProgram.findOne({ programId: input.pilotProgramId, organizationId: s.organizationId }).lean(),
    d.PilotTenantEnrollment.findOne({ pilotProgramId: input.pilotProgramId, organizationId: s.organizationId }).lean(),
    d.PilotWorkspaceEnrollment.findOne({ pilotProgramId: input.pilotProgramId, ...filterFor(s) }).lean(),
    d.PilotUserMembership.findOne({
      pilotProgramId: input.pilotProgramId,
      ...filterFor(s),
      userId: id(input.pilotUserId || input.receivingUserId || caller.authorization?.actorId || caller.partner?._id),
    }).lean(),
    d.CapabilityLaunchGate.findOne({
      capabilityKey,
      $or: [
        { pilotProgramId: input.pilotProgramId, organizationId: s.organizationId, workspaceId: s.workspaceId },
        { pilotProgramId: input.pilotProgramId, organizationId: s.organizationId, workspaceId: { $exists: false } },
        { pilotProgramId: input.pilotProgramId, organizationId: { $exists: false } },
      ],
    }).sort({ workspaceId: -1, organizationId: -1, version: -1 }).lean(),
    d.ReleaseFeatureFlag.findOne({
      key: capabilityKey,
      status: 'active',
      $or: [
        { scope: 'workspace', organizationId: s.organizationId, workspaceId: s.workspaceId },
        { scope: 'organization', organizationId: s.organizationId },
        { scope: 'platform' },
      ],
    }).sort({ workspaceId: -1, organizationId: -1, version: -1 }).lean(),
  ]);
  const quota = core.resolvePilotQuotas(
    tenant?.pilotQuotaProfile,
    workspace?.quotaOverrides,
    input.pilotQuotaOverrides,
  );
  const maximumConcurrentRuns = Number(
    quota.maximumConcurrentRunsPerWorkspace ?? quota.concurrentOrchestrationRuns ?? 0,
  );
  const activeRuns = program && tenant && workspace && membership && maximumConcurrentRuns > 0
    ? await d.OrchestrationRun.countDocuments({
        organizationId: s.organizationId,
        workspaceId: s.workspaceId,
        status: { $in: ['queued', 'running', 'waiting_approval', 'cancelling', 'recovering', 'compensating'] },
      })
    : 0;
  const classificationAllowed = !input.dataClassification ||
    (tenant?.approvedDataClassifications || []).includes(input.dataClassification);
  const residencyAllowed = !input.residencyTag ||
    (tenant?.residencyTags || []).includes(input.residencyTag) &&
    (workspace?.residencyTags || []).includes(input.residencyTag);
  const tenantCapabilityEnabled =
    (tenant?.enabledCapabilityKeys || []).includes(capabilityKey) &&
    !(tenant?.disabledCapabilityKeys || []).includes(capabilityKey);
  const workspaceCapabilityEnabled =
    (workspace?.allowedCapabilities || []).includes(capabilityKey) &&
    !(workspace?.disabledCapabilities || []).includes(capabilityKey);
  const featureFlagEnabled =
    featureFlag?.defaultState === true &&
    Number(featureFlag?.rolloutPercentageBasisPoints || 0) > 0 &&
    featureFlag?.killSwitch !== true &&
    (!featureFlag?.expiresAt || new Date(featureFlag.expiresAt) > new Date(options.now || Date.now())) &&
    (!(featureFlag?.allowedEnvironmentCategories || []).length ||
      featureFlag.allowedEnvironmentCategories.includes('staging'));
  const providerUnavailable =
    capabilityKey === 'external.grounded_research' &&
    !['passed', 'passed_with_warnings'].includes(gate?.status);
  const result = core.evaluatePilotAdmission({
    programStatus: program?.status,
    tenantStatus: tenant?.status,
    workspaceStatus: workspace?.status,
    userStatus: membership?.status,
    suspended: ['paused', 'suspended'].includes(tenant?.status) || ['paused', 'suspended'].includes(workspace?.status),
    capabilityEnabled: tenantCapabilityEnabled && workspaceCapabilityEnabled && featureFlagEnabled && gate?.enabled === true,
    gateStatus: gate?.status,
    pilotQuotaAvailable: maximumConcurrentRuns > 0 && activeRuns < maximumConcurrentRuns,
    platformQuotaAvailable: true,
    residencyAllowed,
    classificationAllowed,
    regionHealthy: input.regionHealthy !== false,
    writeAuthorityValid: input.writeAuthorityValid !== false,
    maintenance: input.maintenance === true,
    releaseFreeze: input.releaseFreeze === true,
    backpressure: input.backpressure,
    providerUnavailable,
  });
  d.metrics.increment('pilot_admission', { outcome: result.outcome });
  return {
    applies: true,
    pilotProgramId: input.pilotProgramId,
    capabilityKey,
    activeRuns,
    maximumConcurrentRuns,
    ...result,
    safeReasonCodes: result.accepted ? [] : [result.outcome.toUpperCase()],
  };
}

async function listOnboardingChecklists(input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return page(d.PilotOnboardingChecklist, { ...filterFor(s), status: 'active' }, input); }
async function createOnboardingRun(input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); const checklist = await one(d.PilotOnboardingChecklist, { _id: input.checklistId, status: 'active', ...filterFor(s) }, 'ONBOARDING_CHECKLIST_NOT_FOUND');
  const record = await d.PilotOnboardingRun.create({ checklistId: id(checklist), checklistVersion: checklist.version, pilotProgramId: input.pilotProgramId, ...filterFor(s), status: 'in_progress', items: checklist.items.map((item) => ({ key: item.key, status: 'pending' })), startedBy: s.actorId, startedAt: new Date() });
  await audit('pilot.onboarding.started', 'PilotOnboardingRun', record, s, {}, d); return plain(record);
}
async function getOnboardingRun(runId, input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return plain(await one(d.PilotOnboardingRun, { _id: runId, ...filterFor(s) }, 'ONBOARDING_RUN_NOT_FOUND')); }
async function onboardingAction(runId, action, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); const record = await one(d.PilotOnboardingRun, { _id: runId, ...filterFor(s) }, 'ONBOARDING_RUN_NOT_FOUND');
  if (action === 'completeItem') {
    const item = record.items.find((value) => value.key === input.itemKey); if (!item) throw new AppError(404, 'ONBOARDING_ITEM_NOT_FOUND', 'Onboarding item was not found.');
    item.status = 'completed'; item.safeEvidenceReference = input.safeEvidenceReference; item.completedBy = s.actorId; item.completedAt = new Date();
    if (record.items.every((value) => value.status !== 'pending')) { record.status = 'completed'; record.completedAt = new Date(); }
  } else { await governedApproval(input, s, 'pilotOnboarding.approve', 'PilotOnboardingRun', record, d); if (record.status !== 'completed') throw new AppError(409, 'ONBOARDING_INCOMPLETE', 'Onboarding is incomplete.'); record.status = 'approved'; record.approvedBy = s.actorId; record.approvedAt = new Date(); }
  await record.save(); await audit(`pilot.onboarding.${action}`, 'PilotOnboardingRun', record, s, {}, d); return plain(record);
}

async function createObservation(programId, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); const payload = core.createObservationWindow({ ...input, pilotProgramId: programId, organizationId: s.organizationId, workspaceId: s.workspaceId });
  const record = await d.PilotObservationWindow.create(payload); return plain(record);
}
async function listObservations(programId, input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return page(d.PilotObservationWindow, { pilotProgramId: programId, ...filterFor(s) }, input); }
async function pilotHealth(programId, input = {}, caller = {}, options = {}) {
  scope(input, caller); const result = core.evaluatePilotHealth(input); deps(options.dependencies).metrics.increment('pilot_health', { status: result.status }); return { pilotProgramId: programId, ...result };
}
async function pilotReadiness(programId, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const blockers = input.blockers || await d.PilotLaunchBlocker.find({ pilotProgramId: programId, ...filterFor(s) }).lean();
  const result = core.evaluateLaunchReadiness(input.dimensions || {}, blockers); d.metrics.increment('pilot_readiness', { status: result.status }); return { pilotProgramId: programId, ...result };
}
async function listBlockers(programId, input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return page(d.PilotLaunchBlocker, { pilotProgramId: programId, ...filterFor(s) }, input); }
async function createLaunchDecision(programId, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); const validation = core.validateLaunchDecision(input);
  if (!validation.valid) throw new AppError(400, validation.safeReasonCodes[0], 'Launch decision is invalid.');
  await governedApproval(input, s, 'pilotLaunchDecision.create', 'PilotLaunchDecision', { ...input, pilotProgramId: programId }, d);
  const record = await d.PilotLaunchDecision.create({
    ...pick(input, [
      'releaseCandidateId', 'stagingDeploymentId', 'decision', 'readinessStatus',
      'riskCategory', 'enabledCapabilities', 'disabledCapabilities', 'restrictions',
      'launchBlockerIds', 'waiverIds', 'evidencePackageId', 'approvalRequestId',
      'decidedAt', 'expiresAt',
    ]),
    pilotProgramId: programId, ...filterFor(s), decidedBy: s.actorId, decidedAt: input.decidedAt || new Date(),
  });
  await audit('pilot.launch_decision.created', 'PilotLaunchDecision', record, s, { decision: record.decision }, d); return plain(record);
}
async function pilotEvidence(programId, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); const payload = core.createPilotEvidencePackage({ ...input, pilotProgramId: programId, generatedBy: s.actorId });
  const { immutable: _immutable, ...persisted } = payload;
  const record = await d.PilotEvidencePackage.create({ ...persisted, releaseCandidateId: input.releaseCandidateId, stagingDeploymentId: input.stagingDeploymentId, launchDecisionId: input.launchDecisionId, ...filterFor(s) });
  await audit('pilot.evidence.generated', 'PilotEvidencePackage', record, s, { evidenceDigest: record.evidenceDigest }, d); return plain(record);
}
async function getPilotEvidence(programId, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const record = await d.PilotEvidencePackage.findOne({ pilotProgramId: programId, ...filterFor(s) }).sort({ generatedAt: -1, _id: -1 }).lean();
  if (!record) return { pilotProgramId: programId, status: 'not_generated' };
  return plain(record);
}

async function submitFeedback(input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); const safe = core.ingestPilotFeedback(input);
  const record = await d.PilotFeedback.create({ ...safe, pilotProgramId: input.pilotProgramId, ...filterFor(s), submittedBy: s.actorId, affectedCapabilityKey: input.affectedCapabilityKey, relatedRunReference: input.relatedRunReference, relatedRequestReference: input.relatedRequestReference, relatedTraceReference: input.relatedTraceReference, classification: input.classification });
  d.metrics.increment('pilot_feedback', { category: record.category, status: record.status }); await audit('pilot.feedback.submitted', 'PilotFeedback', record, s, { category: record.category, redactionStatus: record.redactionStatus }, d); return plain(record);
}
async function listFeedback(input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return page(d.PilotFeedback, filterFor(s), input); }
async function getFeedback(feedbackId, input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return plain(await one(d.PilotFeedback, { _id: feedbackId, ...filterFor(s) }, 'PILOT_FEEDBACK_NOT_FOUND')); }
async function feedbackAction(feedbackId, action, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); const record = await one(d.PilotFeedback, { _id: feedbackId, ...filterFor(s) }, 'PILOT_FEEDBACK_NOT_FOUND');
  record.status = action === 'triage' ? 'triaged' : 'resolved'; record.assignedOwnerReference = input.assignedOwnerReference || record.assignedOwnerReference;
  if (action === 'triage') record.triagedAt = new Date(); else record.resolvedAt = new Date(); await record.save();
  await audit(`pilot.feedback.${action}d`, 'PilotFeedback', record, s, {}, d); return plain(record);
}

async function createSupportCase(input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const record = await d.PilotSupportCase.create({ pilotProgramId: input.pilotProgramId, ...filterFor(s), caseNumber: input.caseNumber || `PILOT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, category: input.category, severity: input.severity, safeSummary: core.redactPilotContent(input.safeSummary || ''), affectedCapability: input.affectedCapability, assignedOwnerReference: input.assignedOwnerReference, escalationPolicyReference: input.escalationPolicyReference, linkedIncidentId: input.linkedIncidentId, linkedFeedbackIds: input.linkedFeedbackIds || [] });
  d.metrics.increment('pilot_support_case', { category: record.category, status: record.status }); await audit('pilot.support_case.created', 'PilotSupportCase', record, s, {}, d); return plain(record);
}
async function listSupportCases(input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return page(d.PilotSupportCase, filterFor(s), input); }
async function getSupportCase(caseId, input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return plain(await one(d.PilotSupportCase, { _id: caseId, ...filterFor(s) }, 'PILOT_SUPPORT_CASE_NOT_FOUND')); }
async function supportCaseAction(caseId, action, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller); const record = await one(d.PilotSupportCase, { _id: caseId, ...filterFor(s) }, 'PILOT_SUPPORT_CASE_NOT_FOUND');
  const target = { acknowledge: 'acknowledged', escalate: 'escalated', resolve: 'resolved' }[action]; record.status = core.transitionSupportCase(record.status, target);
  if (action === 'acknowledge') record.acknowledgedAt = new Date(); if (action === 'resolve') { record.resolvedAt = new Date(); record.resolutionCategory = input.resolutionCategory; }
  if (input.linkedIncidentId) record.linkedIncidentId = input.linkedIncidentId; await record.save(); await audit(`pilot.support_case.${target}`, 'PilotSupportCase', record, s, {}, d); return plain(record);
}

async function killSwitchAction(switchKey, action, input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const validation = core.validateKillSwitch({ ...input, switchKey, rbacAllowed: true, policyAllowed: input.policyAllowed !== false });
  if (!validation.valid) throw new AppError(400, validation.safeReasonCodes[0], 'Kill-switch request is invalid.');
  let record = await d.PilotKillSwitch.findOne({ pilotProgramId: input.pilotProgramId, switchKey, ...filterFor(s) });
  if (!record) record = new d.PilotKillSwitch({ pilotProgramId: input.pilotProgramId, switchKey, scope: input.scope || 'pilot_program', ...filterFor(s) });
  await governedApproval(input, s, `pilotKillSwitch.${action}`, 'PilotKillSwitch', record, d);
  record.status = action === 'activate' ? 'active' : 'inactive'; record.reasonCode = input.reasonCode; record.approvalRequestId = input.approvalRequestId;
  if (action === 'activate') { record.activatedBy = s.actorId; record.activatedAt = new Date(); } else { record.deactivatedBy = s.actorId; record.deactivatedAt = new Date(); }
  await record.save(); d.metrics.increment('pilot_kill_switch', { switch_category: switchKey, action }); await audit(`pilot.kill_switch.${action}d`, 'PilotKillSwitch', record, s, { preservedCapabilities: validation.preservedCapabilities }, d); return { ...plain(record), preservedCapabilities: validation.preservedCapabilities };
}
async function listOperationalReviews(input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return page(d.PilotOperationalReview, filterFor(s), input); }
async function createOperationalReview(input = {}, caller = {}, options = {}) {
  const d = deps(options.dependencies); const s = scope(input, caller);
  const record = await d.PilotOperationalReview.create({
    ...pick(core.redactPilotContent(input), [
      'pilotProgramId', 'reviewDate', 'reviewPeriodStart', 'reviewPeriodEnd', 'healthStatus',
      'launchBlockers', 'incidentsReviewed', 'supportCasesReviewed', 'feedbackReviewed',
      'quotaFindings', 'capacityFindings', 'gateFindings', 'actions', 'ownerReferences',
      'nextReviewAt', 'approvedBy',
    ]),
    ...filterFor(s), createdBy: s.actorId,
  });
  return plain(record);
}
async function listCommunications(input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); return page(d.PilotCommunication, filterFor(s), input); }
async function createCommunication(input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); const adapter = input.adapterType === 'mock' ? new core.MockNotificationAdapter() : new core.NoopNotificationAdapter(); const prepared = await adapter.prepare({ communicationId: input.communicationId }); const record = await d.PilotCommunication.create({ pilotProgramId: input.pilotProgramId, category: input.category, status: prepared.status, safeSubject: core.redactPilotContent(input.safeSubject || ''), safeBodySummary: core.redactPilotContent(input.safeBodySummary || ''), adapterType: input.adapterType || 'noop', ...filterFor(s), ...mutationFields(input, 'pilot-communication-create', s), createdBy: s.actorId }); return plain(record); }
async function recordCommunicationDelivery(communicationId, input = {}, caller = {}, options = {}) { const d = deps(options.dependencies); const s = scope(input, caller); const record = await one(d.PilotCommunication, { _id: communicationId, ...filterFor(s) }, 'PILOT_COMMUNICATION_NOT_FOUND'); await governedApproval(input, s, 'pilotCommunication.recordDelivery', 'PilotCommunication', record, d); record.status = 'delivered_externally'; record.manualDeliveryReference = input.manualDeliveryReference; record.deliveredAt = new Date(); await record.save(); return plain(record); }

async function ensureStagingPilotIndexes() {
  await Promise.all(Object.values(models).map((Model) => Model.createIndexes()));
}

module.exports = {
  capabilityGateAction, createCommunication, createLaunchDecision, createObservation,
  createOnboardingRun, createOperationalReview, createPilotPolicy, createPilotProgram,
  createSmokePlan, createSmokeRun, createStagingDeployment, createSupportCase, enrollOrganization,
  enrollUser, enrollWorkspace, ensureStagingPilotIndexes, evaluatePilotAdmissionBoundary, feedbackAction, getCapabilityGate,
  getFeedback, getOnboardingRun, getOrganization, getPilotEvidence, getPilotPolicy, getPilotProgram, getSmokePlan, getSmokeRun,
  getStagingDeployment, getSupportCase, killSwitchAction, listBlockers, listCapabilityGates,
  listCommunications, listFeedback, listObservations, listOnboardingChecklists, listOperationalReviews,
  listOrganizations, listPilotPolicies, listPilotPrograms, listSmokePlans, listSmokeRuns,
  listStagingDeployments, listSupportCases, listUsers, listWorkspaces, onboardingAction,
  organizationAction, pilotEvidence, pilotHealth, pilotPolicyAction, pilotProgramAction,
  pilotReadiness, recordCommunicationDelivery, smokePlanAction, smokeRunAction,
  stagingDeploymentAction, submitFeedback,
};
