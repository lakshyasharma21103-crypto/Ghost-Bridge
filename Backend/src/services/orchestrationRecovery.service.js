const crypto = require('node:crypto');
const mongoose = require('mongoose');
const OrchestrationRecoveryPolicy = require('../models/OrchestrationRecoveryPolicy');
const OrchestrationRecoveryDecision = require('../models/OrchestrationRecoveryDecision');
const OrchestrationCompensationPlan = require('../models/OrchestrationCompensationPlan');
const OrchestrationCompensationRun = require('../models/OrchestrationCompensationRun');
const OrchestrationInterventionRequest = require('../models/OrchestrationInterventionRequest');
const OrchestrationCheckpoint = require('../models/OrchestrationCheckpoint');
const OrchestrationCorrectedInput = require('../models/OrchestrationCorrectedInput');
const OrchestrationRun = require('../models/OrchestrationRun');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const AgentSelectionDecision = require('../models/AgentSelectionDecision');
const CapabilityCatalogEntry = require('../models/CapabilityCatalogEntry');
const InterAgentDataContract = require('../models/InterAgentDataContract');
const InterAgentDelegationGrant = require('../models/InterAgentDelegationGrant');
const OperationalIncident = require('../models/OperationalIncident');
const ApprovalRequest = require('../models/ApprovalRequest');
const Invocation = require('../models/Invocation');
const { actorFromPartner, assertAuthorized } = require('./authorization.service');
const { assertOperationalAccess } = require('./operationalState.service');
const { createAuditLog } = require('./auditService');
const {
  createApprovalRequest,
  evaluateApprovalRequirement,
  expireIfNeeded,
} = require('./approval.service');
const { evaluateSelection } = require('./agentSelection.service');
const {
  createGrantRecord,
  executeDelegatedInvocation,
  revokeGrantRecord,
  selectorMatchesCandidate,
} = require('./interAgentDelegation.service');
const { invoke: invokeThroughRuntimeGateway } = require('./runtimeGateway.service');
const {
  applyMapping,
  applyMinimization,
  approximateBytes,
  assertClassificationAllowed,
  assertRegionResidency,
  highestClassification,
  safeClone,
  schemaHash,
} = require('./interAgentData.service');
const {
  assertSafePayload,
  safeFailure,
  validateAgainstSchema,
} = require('./orchestrationValidation.service');
const {
  checkpointHash,
  checkpointSnapshot,
  compensationEligible,
  correctedInputRecord,
  decryptCorrectedInput,
  deterministicCompensationBatches,
  deterministicCompensationSteps,
  normalizeRecoveryPolicyInput,
  stableHash,
  validateCheckpoint,
  validateRecoveryPolicyDocument,
} = require('./orchestrationRecoveryValidation.service');
const {
  COMPENSATION_PLAN_TRANSITIONS,
  COMPENSATION_RUN_TRANSITIONS,
  FAILURE_CATEGORIES,
  INTERVENTION_STATUSES,
  INTERVENTION_TRANSITIONS,
  INTERVENTION_TYPES,
  RECOVERY_DECISION_TRANSITIONS,
  RECOVERY_LIMITS,
  RECOVERY_POLICY_STATUSES,
  assertRecoveryTransition,
  automaticRetryEligible,
  classifyRecoveryFailure,
  compensationIdempotencyKey,
  recoveryBackoff,
  safeCode,
} = require('../constants/orchestrationRecovery');
const {
  ORCHESTRATION_NODE_STATUSES,
  TERMINAL_RUN_STATUSES,
  assertNodeTransition,
  assertRunTransition,
} = require('../constants/orchestration');
const {
  canonicalize,
  hashesEqual,
  isDuplicateKeyError,
  normalizeClientKey,
  secureDigest,
} = require('../utils/idempotency');
const { decryptPayload } = require('../utils/crypto');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const metrics = require('./orchestrationMetrics.service');

const ACTION_PERMISSIONS = Object.freeze({
  operator_retry: 'orchestrationNode.retry',
  retry: 'orchestrationNode.retry',
  skip: 'orchestrationNode.skip',
  correct_input: 'orchestrationNode.correctInput',
  replace_agent: 'orchestrationNode.replaceAgent',
  compensate: 'orchestrationNode.compensate',
  waive_compensation: 'orchestrationNode.waiveCompensation',
  resume: 'orchestrationRecovery.resume',
  terminate: 'orchestrationRecovery.terminate',
});

const POLICY_FLAGS = Object.freeze({
  operator_retry: 'allowOperatorRetry',
  retry: 'allowOperatorRetry',
  skip: 'allowOperatorSkip',
  correct_input: 'allowOperatorInputCorrection',
  replace_agent: 'allowOperatorAgentReplacement',
  compensate: 'allowOperatorCompensate',
  resume: 'allowOperatorResume',
  terminate: 'allowOperatorTerminate',
});

const APPROVAL_FLAGS = Object.freeze({
  operator_retry: 'requireApprovalForRetry',
  retry: 'requireApprovalForRetry',
  skip: 'requireApprovalForSkip',
  correct_input: 'requireApprovalForInputCorrection',
  replace_agent: 'requireApprovalForAgentReplacement',
  compensate: 'requireApprovalForCompensation',
  waive_compensation: 'requireApprovalForCompensation',
  terminate: 'requireApprovalForForceTermination',
});

const ACTION_STATES = Object.freeze({
  retry: new Set(['failed', 'waiting_intervention', 'recovery_pending']),
  skip: new Set(['blocked', 'failed', 'waiting_intervention', 'recovery_pending']),
  correct_input: new Set(['failed', 'waiting_intervention', 'recovery_pending']),
  replace_agent: new Set(['failed', 'waiting_intervention', 'recovery_pending']),
  compensate: new Set(['succeeded', 'failed', 'waiting_intervention', 'compensation_pending', 'compensation_failed']),
  waive_compensation: new Set(['succeeded', 'compensation_pending', 'compensation_failed', 'waiting_intervention']),
});

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function plain(value) {
  return typeof value?.toObject === 'function'
    ? value.toObject({ depopulate: true, flattenMaps: true, virtuals: false })
    : value || {};
}

function callerScope(input = {}, caller = {}) {
  const organizationId = idOf(caller.partner);
  if (!organizationId) {
    throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Partner API key is required.');
  }
  const workspaceId = String(input.workspaceId || input.receivingWorkspaceId || '').trim();
  if (!workspaceId) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'workspaceId is required.');
  }
  return {
    organizationId,
    partnerId: organizationId,
    workspaceId,
    actorId: `partner:${organizationId}`,
    actorType: 'partner',
    requestId:
      caller.requestId ||
      `req_${secureDigest('orchestration-recovery-request', `${organizationId}:${workspaceId}:${Date.now()}`).slice(-48)}`,
    traceId:
      caller.traceId ||
      `trace_${secureDigest('orchestration-recovery-trace', `${organizationId}:${workspaceId}:${Date.now()}`).slice(-48)}`,
  };
}

function systemScope(input = {}) {
  const organizationId = idOf(input.organizationId || input.partnerId);
  const workspaceId = String(input.workspaceId || '').trim();
  if (!organizationId || !workspaceId) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Recovery worker tenant scope is required.');
  }
  return {
    organizationId,
    partnerId: organizationId,
    workspaceId,
    actorId: input.actorId || 'system:orchestration-recovery-worker',
    actorType: input.actorType || 'system',
    requestId: input.requestId,
    traceId: input.traceId,
  };
}

function resource(type, value, scope) {
  return {
    type,
    id: idOf(value) || `${type.toLowerCase()}:${scope.workspaceId}`,
    organizationId: scope.organizationId,
    partnerId: scope.partnerId,
    workspaceId: scope.workspaceId,
  };
}

function actor(scope, caller = {}) {
  if (caller.partner) {
    return actorFromPartner(caller.partner, {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      requestId: scope.requestId,
      traceId: scope.traceId,
    });
  }
  return {
    type: 'system',
    id: scope.actorId,
    actorType: 'system',
    actorId: scope.actorId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    trustedSystem: true,
    skipPersistentRoles: true,
  };
}

async function authorize(permission, type, value, scope, caller = {}, context = {}) {
  return assertAuthorized(actor(scope, caller), permission, resource(type, value, scope), {
    workspaceId: scope.workspaceId,
    requestId: scope.requestId,
    traceId: scope.traceId,
    ...context,
  });
}

async function audit(action, type, value, scope, metadata = {}) {
  assertSafePayload(metadata, '$audit');
  return createAuditLog(
    scope.actorType,
    scope.actorId,
    action,
    type,
    idOf(value),
    {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      receivingWorkspaceId: scope.workspaceId,
      ...metadata,
    },
    { requestId: scope.requestId, traceId: scope.traceId },
  );
}

function paging(input = {}) {
  const page = Number(input.page || 1);
  const limit = Number(input.limit || 25);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > RECOVERY_LIMITS.maximumListLimit) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Pagination is invalid.');
  }
  return { page, limit, skip: (page - 1) * limit };
}

function safeSearch(value) {
  const normalized = String(value || '').trim().slice(0, 100);
  return normalized ? normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
}

function recoveryPolicySnapshot(policyInput) {
  const policy = plain(policyInput);
  const normalized = normalizeRecoveryPolicyInput(
    Object.fromEntries(
      Object.entries(policy).filter(([key]) =>
        [
          'name', 'description', 'defaultFailureStrategy', 'maximumRecoveryAttempts',
          'maximumCompensationAttempts', 'recoveryBackoffPolicy', 'compensationBackoffPolicy',
          'recoveryDeadlineMs', 'compensationDeadlineMs', 'allowOperatorRetry',
          'allowOperatorSkip', 'allowOperatorResume', 'allowOperatorCompensate',
          'allowOperatorTerminate', 'allowOperatorAgentReplacement', 'allowOperatorInputCorrection',
          'requireApprovalForRetry', 'requireApprovalForSkip', 'requireApprovalForCompensation',
          'requireApprovalForAgentReplacement', 'requireApprovalForInputCorrection',
          'requireApprovalForForceTermination', 'permittedFailureCategories',
          'nonRecoverableFailureCategories', 'automaticCompensation', 'compensateOnCancellation',
          'compensateOnTimeout', 'compensateOnPolicyRevocation',
          'compensateOnConnectionRevocation', 'compensationOrdering',
          'continueCompensationAfterFailure', 'maximumParallelCompensations',
        ].includes(key),
      ),
    ),
  );
  return Object.freeze({
    policyId: idOf(policy),
    version: Number(policy.version),
    ...normalized,
    status: 'active',
    activatedAt: policy.activatedAt || null,
  });
}

function serializeRecoveryPolicy(policyInput) {
  const policy = plain(policyInput);
  return {
    policyId: idOf(policy),
    organizationId: policy.organizationId,
    workspaceId: policy.workspaceId,
    name: policy.name,
    description: policy.description || '',
    version: Number(policy.version),
    status: policy.status,
    defaultFailureStrategy: policy.defaultFailureStrategy,
    maximumRecoveryAttempts: policy.maximumRecoveryAttempts,
    maximumCompensationAttempts: policy.maximumCompensationAttempts,
    recoveryBackoffPolicy: policy.recoveryBackoffPolicy,
    compensationBackoffPolicy: policy.compensationBackoffPolicy,
    recoveryDeadlineMs: policy.recoveryDeadlineMs,
    compensationDeadlineMs: policy.compensationDeadlineMs,
    allowOperatorRetry: policy.allowOperatorRetry === true,
    allowOperatorSkip: policy.allowOperatorSkip === true,
    allowOperatorResume: policy.allowOperatorResume === true,
    allowOperatorCompensate: policy.allowOperatorCompensate === true,
    allowOperatorTerminate: policy.allowOperatorTerminate === true,
    allowOperatorAgentReplacement: policy.allowOperatorAgentReplacement === true,
    allowOperatorInputCorrection: policy.allowOperatorInputCorrection === true,
    requireApprovalForRetry: policy.requireApprovalForRetry === true,
    requireApprovalForSkip: policy.requireApprovalForSkip === true,
    requireApprovalForCompensation: policy.requireApprovalForCompensation === true,
    requireApprovalForAgentReplacement: policy.requireApprovalForAgentReplacement === true,
    requireApprovalForInputCorrection: policy.requireApprovalForInputCorrection === true,
    requireApprovalForForceTermination: policy.requireApprovalForForceTermination === true,
    permittedFailureCategories: policy.permittedFailureCategories || [],
    nonRecoverableFailureCategories: policy.nonRecoverableFailureCategories || [],
    automaticCompensation: policy.automaticCompensation === true,
    compensateOnCancellation: policy.compensateOnCancellation === true,
    compensateOnTimeout: policy.compensateOnTimeout === true,
    compensateOnPolicyRevocation: policy.compensateOnPolicyRevocation === true,
    compensateOnConnectionRevocation: policy.compensateOnConnectionRevocation === true,
    compensationOrdering: policy.compensationOrdering,
    continueCompensationAfterFailure: policy.continueCompensationAfterFailure === true,
    maximumParallelCompensations: policy.maximumParallelCompensations,
    validatedAt: policy.validatedAt || null,
    activatedAt: policy.activatedAt || null,
    archivedAt: policy.archivedAt || null,
    createdBy: policy.createdBy,
    updatedBy: policy.updatedBy,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
}

async function scopedPolicy(policyId, scope, options = {}) {
  if (!mongoose.isValidObjectId(policyId)) {
    throw new AppError(404, 'ORCHESTRATION_RECOVERY_POLICY_NOT_FOUND', 'Recovery policy was not found.');
  }
  const query = OrchestrationRecoveryPolicy.findOne({
    _id: policyId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  });
  if (options.privateFields) query.select('+validationDigest');
  if (options.lean) query.lean();
  const policy = await query;
  if (!policy) {
    throw new AppError(404, 'ORCHESTRATION_RECOVERY_POLICY_NOT_FOUND', 'Recovery policy was not found.');
  }
  return policy;
}

async function createRecoveryPolicy(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationRecoveryPolicy.create', 'OrchestrationRecoveryPolicy', null, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  assertSafePayload(input, '$recoveryPolicy');
  const normalized = normalizeRecoveryPolicyInput(input);
  const validation = validateRecoveryPolicyDocument(normalized);
  if (!validation.valid) {
    throw new AppError(400, 'ORCHESTRATION_RECOVERY_POLICY_INVALID', 'Recovery policy validation failed.', validation.errors);
  }
  const policy = await OrchestrationRecoveryPolicy.create({
    ...normalized,
    status: 'draft',
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    version: 1,
    createdBy: scope.actorId,
    updatedBy: scope.actorId,
  });
  metrics.increment('orchestration_recovery_policies', { status: 'draft' });
  await audit('orchestration.recovery.policy.created', 'OrchestrationRecoveryPolicy', policy, scope, {
    version: policy.version,
    status: policy.status,
  });
  return serializeRecoveryPolicy(policy);
}

async function listRecoveryPolicies(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationRecoveryPolicy.read', 'OrchestrationRecoveryPolicy', null, scope, caller);
  const pagination = paging(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) {
    const status = String(input.status).toLowerCase();
    if (!RECOVERY_POLICY_STATUSES.includes(status)) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Recovery-policy status is invalid.');
    }
    filter.status = status;
  }
  const search = safeSearch(input.search || input.q);
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }];
  const [items, total] = await Promise.all([
    OrchestrationRecoveryPolicy.find(filter).sort({ updatedAt: -1, _id: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    OrchestrationRecoveryPolicy.countDocuments(filter),
  ]);
  return { items: items.map(serializeRecoveryPolicy), pagination: { page: pagination.page, limit: pagination.limit, total } };
}

async function getRecoveryPolicy(policyId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationRecoveryPolicy.read', 'OrchestrationRecoveryPolicy', policyId, scope, caller);
  return serializeRecoveryPolicy(await scopedPolicy(policyId, scope, { lean: true }));
}

async function updateRecoveryPolicy(policyId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationRecoveryPolicy.update', 'OrchestrationRecoveryPolicy', policyId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  assertSafePayload(input, '$recoveryPolicy');
  const current = await scopedPolicy(policyId, scope);
  if (current.status === 'archived') {
    throw new AppError(409, 'ORCHESTRATION_RECOVERY_POLICY_IMMUTABLE', 'Archived recovery policies are immutable.');
  }
  const normalized = normalizeRecoveryPolicyInput(
    input,
    current.status === 'active'
      ? { ...current.toObject(), status: 'draft' }
      : current.toObject(),
  );
  const validation = validateRecoveryPolicyDocument(normalized);
  if (!validation.valid) {
    throw new AppError(400, 'ORCHESTRATION_RECOVERY_POLICY_INVALID', 'Recovery policy validation failed.', validation.errors);
  }
  let updated;
  if (current.status === 'active') {
    const latest = await OrchestrationRecoveryPolicy.findOne({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      name: current.name,
    }).sort({ version: -1 }).select('version').lean();
    updated = await OrchestrationRecoveryPolicy.create({
      ...normalized,
      status: 'draft',
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      version: Number(latest?.version || current.version) + 1,
      createdBy: scope.actorId,
      updatedBy: scope.actorId,
    });
  } else {
    Object.assign(current, normalized, {
      status: 'draft',
      updatedBy: scope.actorId,
      validationDigest: undefined,
      validatedAt: undefined,
    });
    updated = await current.save();
  }
  await audit('orchestration.recovery.policy.updated', 'OrchestrationRecoveryPolicy', updated, scope, {
    version: updated.version,
    status: updated.status,
  });
  return serializeRecoveryPolicy(updated);
}

async function validateRecoveryPolicy(policyId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationRecoveryPolicy.validate', 'OrchestrationRecoveryPolicy', policyId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  const policy = await scopedPolicy(policyId, scope);
  const validation = validateRecoveryPolicyDocument(policy.toObject());
  if (validation.valid && policy.status === 'draft') {
    policy.validationDigest = validation.validationDigest;
    policy.validatedAt = new Date();
    policy.updatedBy = scope.actorId;
    await policy.save();
  }
  await audit('orchestration.recovery.policy.validated', 'OrchestrationRecoveryPolicy', policy, scope, {
    version: policy.version,
    valid: validation.valid,
    reasonCode: validation.errors[0]?.code,
  });
  return {
    valid: validation.valid,
    errors: validation.errors,
    validationDigest: validation.valid ? validation.validationDigest : null,
    validatedAt: validation.valid ? policy.validatedAt : null,
  };
}

async function activateRecoveryPolicy(policyId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationRecoveryPolicy.activate', 'OrchestrationRecoveryPolicy', policyId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  const policy = await scopedPolicy(policyId, scope);
  if (policy.status === 'active') return serializeRecoveryPolicy(policy);
  if (policy.status !== 'draft') {
    throw new AppError(409, 'ORCHESTRATION_RECOVERY_POLICY_IMMUTABLE', 'Only draft recovery policies may be activated.');
  }
  const validation = validateRecoveryPolicyDocument(policy.toObject());
  if (!validation.valid) {
    throw new AppError(400, 'ORCHESTRATION_RECOVERY_POLICY_INVALID', 'Recovery policy validation failed.', validation.errors);
  }
  policy.status = 'active';
  policy.validationDigest = validation.validationDigest;
  policy.validatedAt = new Date();
  policy.activatedAt = new Date();
  policy.activatedBy = scope.actorId;
  policy.updatedBy = scope.actorId;
  const activated = await policy.save();
  await OrchestrationRecoveryPolicy.updateMany(
    {
      _id: { $ne: activated._id },
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      name: activated.name,
      status: 'active',
    },
    { $set: { status: 'archived', archivedAt: new Date(), archivedBy: scope.actorId, updatedBy: scope.actorId } },
  );
  metrics.increment('orchestration_recovery_policies', { status: 'active' });
  await audit('orchestration.recovery.policy.activated', 'OrchestrationRecoveryPolicy', activated, scope, {
    version: activated.version,
    status: 'active',
  });
  return serializeRecoveryPolicy(activated);
}

async function archiveRecoveryPolicy(policyId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationRecoveryPolicy.archive', 'OrchestrationRecoveryPolicy', policyId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  const policy = await scopedPolicy(policyId, scope);
  if (policy.status === 'archived') return serializeRecoveryPolicy(policy);
  policy.status = 'archived';
  policy.archivedBy = scope.actorId;
  policy.archivedAt = new Date();
  policy.updatedBy = scope.actorId;
  const archived = await policy.save();
  await audit('orchestration.recovery.policy.archived', 'OrchestrationRecoveryPolicy', archived, scope, {
    version: archived.version,
    status: archived.status,
  });
  return serializeRecoveryPolicy(archived);
}

function serializeRecoveryDecision(decisionInput) {
  const decision = plain(decisionInput);
  return {
    decisionId: idOf(decision),
    orchestrationRunId: idOf(decision.orchestrationRunId),
    nodeRunId: idOf(decision.nodeRunId) || null,
    compensationRunId: idOf(decision.compensationRunId) || null,
    decisionType: decision.decisionType,
    decisionStatus: decision.decisionStatus,
    requestedBy: decision.requestedBy,
    requestedAt: decision.requestedAt,
    approvedBy: decision.approvedBy || null,
    approvedAt: decision.approvedAt || null,
    approvalRequestId: decision.approvalRequestId || null,
    safeReasonCode: decision.safeReasonCode,
    safeReasonMessage: decision.safeReasonMessage || null,
    policyDecisionCategory: decision.policyDecisionCategory || null,
    recoveryPolicyId: idOf(decision.recoveryPolicyId) || null,
    recoveryPolicyVersion: decision.recoveryPolicyVersion || null,
    previousState: decision.previousState,
    requestedState: decision.requestedState || null,
    resultingState: decision.resultingState || null,
    requestId: decision.requestId,
    traceId: decision.traceId,
    safeChangeSummary: decision.safeChangeSummary || {},
    replacementSelectionDecisionId: idOf(decision.replacementSelectionDecisionId) || null,
    correctedInputId: idOf(decision.correctedInputId) || null,
    correctedInputSchemaHash: decision.correctedInputSchemaHash || null,
    appliedAt: decision.appliedAt || null,
    failedAt: decision.failedAt || null,
    expiredAt: decision.expiredAt || null,
    createdAt: decision.createdAt,
  };
}

function serializeCompensationPlan(planInput) {
  const plan = plain(planInput);
  return {
    planId: idOf(plan),
    orchestrationRunId: idOf(plan.orchestrationRunId),
    recoveryPolicyId: idOf(plan.recoveryPolicyId) || null,
    recoveryPolicyVersion: plan.recoveryPolicyVersion || null,
    triggerNodeRunId: idOf(plan.triggerNodeRunId) || null,
    triggerFailureCategory: plan.triggerFailureCategory || null,
    triggerReasonCode: plan.triggerReasonCode,
    status: plan.status,
    orderedSteps: (plan.orderedSteps || []).map((step) => ({
      stepKey: step.stepKey,
      order: step.order,
      originalNodeRunId: idOf(step.originalNodeRunId),
      compensationRunId: idOf(step.compensationRunId) || null,
      nodeKey: step.nodeKey,
      dependencyStepKeys: step.dependencyStepKeys || [],
      recoverability: step.recoverability,
      compensationRequired: step.compensationRequired === true,
      approvalRequired: step.approvalRequired === true,
      parallelSafe: step.parallelSafe === true,
      safeReasonCode: step.safeReasonCode,
      compensationDefinitionHash: step.compensationDefinitionHash || null,
    })),
    completedStepCount: plan.completedStepCount || 0,
    failedStepCount: plan.failedStepCount || 0,
    nonReversibleStepCount: plan.nonReversibleStepCount || 0,
    skippedStepCount: plan.skippedStepCount || 0,
    maximumParallelCompensations: plan.maximumParallelCompensations,
    continueAfterFailure: plan.continueAfterFailure === true,
    planDigest: plan.planDigest,
    createdBy: plan.createdBy,
    startedAt: plan.startedAt || null,
    completedAt: plan.completedAt || null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

function serializeCompensationRun(compensationInput) {
  const compensation = plain(compensationInput);
  return {
    compensationRunId: idOf(compensation),
    orchestrationRunId: idOf(compensation.orchestrationRunId),
    compensationPlanId: idOf(compensation.compensationPlanId),
    compensationStepOrdinal: compensation.compensationStepOrdinal,
    originalNodeRunId: idOf(compensation.originalNodeRunId),
    recoveryDecisionId: idOf(compensation.recoveryDecisionId) || null,
    compensationConnectionId: idOf(compensation.compensationConnectionId),
    compensationPassportId: idOf(compensation.compensationPassportId),
    compensationPassportVersion: compensation.compensationPassportVersion,
    compensationCapability: compensation.compensationCapability,
    compensationOperation: compensation.compensationOperation,
    dataContractId: idOf(compensation.dataContractId) || null,
    dataContractVersion: compensation.dataContractVersion || null,
    status: compensation.status,
    attempt: compensation.attempt,
    maximumAttempts: compensation.maximumAttempts,
    nextAttemptAt: compensation.nextAttemptAt || null,
    deadlineAt: compensation.deadlineAt,
    inputClassification: compensation.inputClassification,
    outputClassification: compensation.outputClassification || null,
    approximateInputBytes: compensation.approximateInputBytes || 0,
    approximateOutputBytes: compensation.approximateOutputBytes || 0,
    invocationId: idOf(compensation.invocationId) || null,
    approvalRequestId: compensation.approvalRequestId || null,
    interventionRequestId: idOf(compensation.interventionRequestId) || null,
    requestId: compensation.requestId,
    traceId: compensation.traceId,
    parentTraceId: compensation.parentTraceId,
    safeFailureCode: compensation.safeFailureCode || null,
    safeFailureMessage: compensation.safeFailureMessage || null,
    safeFailureCategory: compensation.safeFailureCategory || null,
    retryability: compensation.retryability === true,
    outcomeUnknown: compensation.outcomeUnknown === true,
    startedAt: compensation.startedAt || null,
    completedAt: compensation.completedAt || null,
    createdAt: compensation.createdAt,
    updatedAt: compensation.updatedAt,
  };
}

function serializeCheckpoint(checkpointInput) {
  const checkpoint = plain(checkpointInput);
  return {
    checkpointId: idOf(checkpoint),
    orchestrationRunId: idOf(checkpoint.orchestrationRunId),
    checkpointKey: checkpoint.checkpointKey,
    sequence: checkpoint.sequence,
    status: checkpoint.status,
    runStatus: checkpoint.runStatus,
    completedNodeKeys: checkpoint.completedNodeKeys || [],
    activeNodeKeys: checkpoint.activeNodeKeys || [],
    compensatedNodeKeys: checkpoint.compensatedNodeKeys || [],
    skippedNodeKeys: checkpoint.skippedNodeKeys || [],
    failedNodeKeys: checkpoint.failedNodeKeys || [],
    definitionSnapshotHash: checkpoint.definitionSnapshotHash,
    selectionSnapshotHash: checkpoint.selectionSnapshotHash || null,
    contractSnapshotHash: checkpoint.contractSnapshotHash || null,
    recoveryPolicySnapshotHash: checkpoint.recoveryPolicySnapshotHash || null,
    safeStateHash: checkpoint.safeStateHash,
    traceId: checkpoint.traceId,
    requestId: checkpoint.requestId,
    createdBy: checkpoint.createdBy,
    verifiedAt: checkpoint.verifiedAt || null,
    invalidatedAt: checkpoint.invalidatedAt || null,
    invalidationReasonCode: checkpoint.invalidationReasonCode || null,
    resumedAt: checkpoint.resumedAt || null,
    resumedByDecisionId: idOf(checkpoint.resumedByDecisionId) || null,
    createdAt: checkpoint.createdAt,
  };
}

function serializeIntervention(interventionInput, availableActions = []) {
  const intervention = plain(interventionInput);
  return {
    interventionId: idOf(intervention),
    orchestrationRunId: idOf(intervention.orchestrationRunId),
    nodeRunId: idOf(intervention.nodeRunId) || null,
    compensationRunId: idOf(intervention.compensationRunId) || null,
    interventionType: intervention.interventionType,
    status: intervention.status,
    title: intervention.title,
    safeSummary: intervention.safeSummary,
    safeFailureCode: intervention.safeFailureCode || null,
    safeFailureCategory: intervention.safeFailureCategory || null,
    requiredPermission: intervention.requiredPermission,
    requiredApprovalType: intervention.requiredApprovalType || null,
    assignedRoleIds: intervention.assignedRoleIds || [],
    assignedUserIds: intervention.assignedUserIds || [],
    expiresAt: intervention.expiresAt,
    resolvedBy: intervention.resolvedBy || null,
    resolvedAt: intervention.resolvedAt || null,
    resolutionAction: intervention.resolutionAction || null,
    safeResolutionReason: intervention.safeResolutionReason || null,
    approvalRequestId: intervention.approvalRequestId || null,
    recoveryDecisionId: idOf(intervention.recoveryDecisionId) || null,
    requestId: intervention.requestId,
    traceId: intervention.traceId,
    availableActions,
    createdAt: intervention.createdAt,
    updatedAt: intervention.updatedAt,
  };
}

async function scopedRun(runId, scope, options = {}) {
  if (!mongoose.isValidObjectId(runId)) {
    throw new AppError(404, ErrorCodes.ORCHESTRATION_RUN_NOT_FOUND, 'Orchestration run was not found.');
  }
  const query = OrchestrationRun.findOne({
    _id: runId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  });
  if (options.privateFields) query.select('+input +finalOutput +definitionSnapshot +recoveryPolicySnapshot');
  if (options.lean) query.lean();
  const run = await query;
  if (!run) throw new AppError(404, ErrorCodes.ORCHESTRATION_RUN_NOT_FOUND, 'Orchestration run was not found.');
  return run;
}

async function scopedNode(runId, nodeRunId, scope, options = {}) {
  if (!mongoose.isValidObjectId(nodeRunId)) {
    throw new AppError(404, 'ORCHESTRATION_NODE_RUN_NOT_FOUND', 'Orchestration node run was not found.');
  }
  const query = OrchestrationNodeRun.findOne({
    _id: nodeRunId,
    orchestrationRunId: runId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  });
  if (options.privateFields) query.select('+resolvedInput +validatedOutput +recoveryTargetSnapshot');
  if (options.lean) query.lean();
  const node = await query;
  if (!node) throw new AppError(404, 'ORCHESTRATION_NODE_RUN_NOT_FOUND', 'Orchestration node run was not found.');
  return node;
}

function nodeDefinition(run, node) {
  return (run.definitionSnapshot?.nodes || []).find((item) => item.nodeKey === node.nodeKey);
}

function effectivePolicy(run) {
  return run.recoveryPolicySnapshot || {
    policyId: idOf(run.recoveryPolicyId) || undefined,
    version: run.recoveryPolicyVersion,
    defaultFailureStrategy: run.definitionSnapshot?.failureStrategy || 'fail',
    maximumRecoveryAttempts: Number(run.maximumRecoveryAttempts || 0),
    maximumCompensationAttempts: Number(run.maximumCompensationAttempts || 0),
    recoveryBackoffPolicy: { baseDelayMs: 1_000, maxDelayMs: 30_000, multiplier: 2, jitterRatio: 0.2 },
    compensationBackoffPolicy: { baseDelayMs: 1_000, maxDelayMs: 30_000, multiplier: 2, jitterRatio: 0.2 },
    allowOperatorRetry: false,
    allowOperatorSkip: false,
    allowOperatorResume: false,
    allowOperatorCompensate: false,
    allowOperatorTerminate: false,
    allowOperatorAgentReplacement: false,
    allowOperatorInputCorrection: false,
    permittedFailureCategories: [],
    nonRecoverableFailureCategories: [],
    automaticCompensation: false,
    compensateOnCancellation: run.definitionSnapshot?.compensateOnCancellation === true,
    compensationOrdering: 'reverse_topological',
    continueCompensationAfterFailure: false,
    maximumParallelCompensations: 1,
  };
}

function safeReason(input, fallback) {
  const raw = String(input?.safeReasonCode || input?.reasonCode || '').trim().toUpperCase();
  if (!raw && fallback) return fallback;
  if (!/^[A-Z][A-Z0-9_]{0,127}$/.test(raw)) {
    throw new AppError(400, 'ORCHESTRATION_RECOVERY_REASON_INVALID', 'A safe reason code is required.');
  }
  return raw;
}

async function transitionNodeState(node, toState, update = {}) {
  if (node.status === toState) return node;
  assertNodeTransition(node.status, toState);
  const changed = await OrchestrationNodeRun.findOneAndUpdate(
    { _id: node._id, status: node.status },
    { $set: { status: toState, ...update } },
    { new: true, runValidators: true },
  ).select('+resolvedInput +validatedOutput +recoveryTargetSnapshot');
  if (!changed) {
    throw new AppError(409, ErrorCodes.ORCHESTRATION_NODE_TRANSITION_INVALID, 'Node state changed before recovery action.');
  }
  return changed;
}

async function transitionRunState(run, toState, update = {}) {
  if (run.status === toState) return run;
  assertRunTransition(run.status, toState);
  const changed = await OrchestrationRun.findOneAndUpdate(
    { _id: run._id, status: run.status },
    { $set: { status: toState, ...update } },
    { new: true, runValidators: true },
  ).select('+input +finalOutput +definitionSnapshot +recoveryPolicySnapshot');
  if (!changed) {
    return scopedRun(run._id, systemScope(run), { privateFields: true });
  }
  return changed;
}

async function createDecisionRecord({ run, node, compensationRun, type, input, scope, previousState, requestedState, safeChangeSummary = {} }) {
  const normalizedKey = normalizeClientKey(input.idempotencyKey);
  const idempotencyKeyHash = secureDigest('orchestration-recovery-decision-key', normalizedKey.value);
  const requestMaterial = {
    orchestrationRunId: idOf(run),
    nodeRunId: idOf(node) || null,
    compensationRunId: idOf(compensationRun) || null,
    type,
    safeReasonCode: safeReason(input, type === 'automatic_retry' ? 'AUTOMATIC_RECOVERY' : 'OPERATOR_RECOVERY'),
    requestedState,
    safeChangeSummary,
    correctionHash: input.correction ? stableHash(input.correction, 'recovery-correction-request') : null,
    selectionPolicyId: idOf(input.selectionPolicyId) || null,
  };
  const requestFingerprint = secureDigest('orchestration-recovery-decision-request', canonicalize(requestMaterial));
  const existing = await OrchestrationRecoveryDecision.findOne({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    idempotencyKeyHash,
  }).select('+idempotencyKeyHash +requestFingerprint');
  if (existing) {
    if (!hashesEqual(existing.requestFingerprint, requestFingerprint)) {
      throw new AppError(409, ErrorCodes.IDEMPOTENCY_CONFLICT, 'Idempotency key is bound to another recovery action.');
    }
    return { decision: existing, replayed: true };
  }
  const decision = await OrchestrationRecoveryDecision.create({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: run._id,
    ...(node ? { nodeRunId: node._id } : {}),
    ...(compensationRun ? { compensationRunId: compensationRun._id } : {}),
    decisionType: type,
    decisionStatus: 'pending',
    requestedBy: scope.actorId,
    requestedAt: new Date(),
    safeReasonCode: requestMaterial.safeReasonCode,
    safeReasonMessage: String(input.safeReasonMessage || input.safeResolutionReason || '').slice(0, RECOVERY_LIMITS.maximumSafeReasonLength),
    policyDecisionCategory: 'allow',
    ...(run.recoveryPolicyId ? { recoveryPolicyId: run.recoveryPolicyId } : {}),
    ...(run.recoveryPolicyVersion ? { recoveryPolicyVersion: run.recoveryPolicyVersion } : {}),
    previousState,
    requestedState,
    idempotencyKeyHash,
    requestFingerprint,
    requestId: scope.requestId || run.requestId,
    traceId: scope.traceId || node?.traceId || run.traceId,
    safeChangeSummary,
  });
  return { decision, replayed: false };
}

async function markDecision(decision, status, update = {}) {
  if (decision.decisionStatus === status) return decision;
  assertRecoveryTransition(
    RECOVERY_DECISION_TRANSITIONS,
    decision.decisionStatus,
    status,
    'ORCHESTRATION_RECOVERY_DECISION_TRANSITION_INVALID',
  );
  return OrchestrationRecoveryDecision.findOneAndUpdate(
    { _id: decision._id, decisionStatus: decision.decisionStatus },
    { $set: { decisionStatus: status, ...update } },
    { new: true, runValidators: true },
  );
}

function allowedByPolicy(policy, actionName) {
  if (actionName === 'waive_compensation') return policy.allowOperatorTerminate === true;
  const flag = POLICY_FLAGS[actionName];
  return !flag || policy[flag] === true;
}

async function availableActionsFor(run, node, intervention, scope, caller = {}) {
  const policy = effectivePolicy(run);
  const declared = new Set(intervention?.allowedActions || INTERVENTION_TYPES.filter((value) => value !== 'inspect_failure'));
  const results = [];
  for (const actionName of [...declared].sort()) {
    const permission = ACTION_PERMISSIONS[actionName];
    if (!permission) continue;
    let allowed = allowedByPolicy(policy, actionName);
    let reasonCode = allowed ? 'ACTION_ALLOWED' : 'RECOVERY_POLICY_ACTION_DENIED';
    if (allowed && node && ACTION_STATES[actionName] && !ACTION_STATES[actionName].has(node.status)) {
      allowed = false;
      reasonCode = 'ORCHESTRATION_NODE_STATE_INELIGIBLE';
    }
    if (allowed) {
      try {
        await authorize(permission, 'OrchestrationRecoveryAction', node || run, scope, caller, {
          proposedOperatorAction: actionName,
          failureCategory: node?.failureCategory,
          recoverability: node?.recoverability,
          compensationAvailability: Boolean(nodeDefinition(run, node)?.compensationDefinition),
        });
      } catch (error) {
        allowed = false;
        reasonCode = error.code || ErrorCodes.AUTHORIZATION_DENIED;
      }
    }
    results.push({ action: actionName, permission, allowed, reasonCode });
  }
  return results;
}

async function createIntervention({ run, node, compensationRun, type = 'inspect_failure', allowedActions, safeFailureCode, failureCategory, scope, title, summary, expiresAt }) {
  const actions = [...new Set((allowedActions || ['inspect_failure']).filter((value) => INTERVENTION_TYPES.includes(value)))].sort();
  const keyHash = secureDigest(
    'orchestration-intervention-key',
    `${idOf(run)}:${idOf(node)}:${idOf(compensationRun)}:${type}:${safeFailureCode || 'UNKNOWN'}:${node?.recoveryAttempt || compensationRun?.attempt || 0}`,
  );
  let intervention = await OrchestrationInterventionRequest.findOne({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    idempotencyKeyHash: keyHash,
  });
  if (intervention) return intervention;
  const timeout = Number(
    nodeDefinition(run, node)?.interventionRequirement?.timeoutMs ||
      run.definitionSnapshot?.interventionTimeoutMs ||
      Math.max(RECOVERY_LIMITS.minimumDeadlineMs, 24 * 60 * 60 * 1_000),
  );
  intervention = await OrchestrationInterventionRequest.create({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: run._id,
    ...(node ? { nodeRunId: node._id } : {}),
    ...(compensationRun ? { compensationRunId: compensationRun._id } : {}),
    interventionType: type,
    status: 'pending',
    title: String(title || 'Orchestration recovery requires intervention').slice(0, 200),
    safeSummary: String(summary || 'A safe recovery decision is required.').slice(0, RECOVERY_LIMITS.maximumSafeSummaryLength),
    ...(safeFailureCode ? { safeFailureCode: safeCode(safeFailureCode) } : {}),
    ...(failureCategory && FAILURE_CATEGORIES.includes(failureCategory) ? { safeFailureCategory: failureCategory } : {}),
    allowedActions: actions,
    requiredPermission: ACTION_PERMISSIONS[actions[0]] || 'orchestrationIntervention.resolve',
    assignedRoleIds: nodeDefinition(run, node)?.interventionRequirement?.assignedRoleIds || [],
    assignedUserIds: [],
    expiresAt: expiresAt || run.interventionDeadlineAt || new Date(Date.now() + timeout),
    idempotencyKeyHash: keyHash,
    requestId: scope.requestId || node?.requestId || run.requestId,
    traceId: scope.traceId || node?.traceId || run.traceId,
  });
  await OrchestrationRun.updateOne(
    { _id: run._id },
    { $set: { interventionRequestId: intervention._id } },
  );
  if (node) {
    await OrchestrationNodeRun.updateOne(
      { _id: node._id },
      { $set: { interventionRequestId: intervention._id } },
    );
  }
  metrics.increment('orchestration_recovery_interventions', { status: 'pending' });
  await audit('orchestration.intervention.created', 'OrchestrationInterventionRequest', intervention, scope, {
    orchestrationRunId: idOf(run),
    nodeRunId: idOf(node) || undefined,
    interventionType: type,
    failureCategory,
    allowedActionCount: actions.length,
  });
  return intervention;
}

async function requestActionApproval({ run, node, compensationRun, decision, actionName, permission, policy, scope, caller }) {
  const action = {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    requesterActorId: scope.actorId,
    requesterActorType: scope.actorType === 'partner' ? 'service_account' : scope.actorType,
    permission,
    resourceType: node ? 'OrchestrationNodeRun' : compensationRun ? 'OrchestrationCompensationRun' : 'OrchestrationRun',
    resourceId: idOf(node || compensationRun || run),
    operationType: `ORCHESTRATION_RECOVERY_${String(actionName).toUpperCase()}`,
    connectionId: idOf(node?.connectionId || compensationRun?.compensationConnectionId) || undefined,
    passportId: idOf(node?.passportId || compensationRun?.compensationPassportId) || undefined,
    capabilityId: node?.capability || compensationRun?.compensationCapability,
    capabilityClassification:
      nodeDefinition(run, node)?.policyContext?.dataClassification ||
      compensationRun?.inputClassification ||
      'restricted',
    sideEffect: actionName === 'skip' ? 'STATE_TRANSITION' : 'EXTERNAL_SIDE_EFFECT',
    safeRequestAttributes: {
      orchestrationRunId: idOf(run),
      nodeRunId: idOf(node) || undefined,
      compensationRunId: idOf(compensationRun) || undefined,
      failureCategory: node?.failureCategory,
      proposedAction: actionName,
      recoverability: node?.recoverability,
      compensationAvailable: Boolean(node && nodeDefinition(run, node)?.compensationDefinition),
      unresolvedSideEffectCount: run.unresolvedSideEffects?.length || 0,
      safeReasonCode: decision.safeReasonCode,
    },
  };
  assertSafePayload(action.safeRequestAttributes, '$approval');
  const evaluated = await evaluateApprovalRequirement(action);
  const forced =
    policy?.[APPROVAL_FLAGS[actionName]] === true ||
    (actionName === 'compensate' && nodeDefinition(run, node)?.compensationDefinition?.approvalRequirement?.required === true);
  if (!forced && !evaluated.required) return null;
  const approval = await createApprovalRequest(
    {
      ...action,
      workspaceId: scope.workspaceId,
      reason: `Approval is required for orchestration recovery action ${actionName}.`,
      idempotencyKey: `orchestration-recovery:${idOf(decision)}`,
    },
    caller.partner
      ? caller
      : {
          partner: { _id: new mongoose.Types.ObjectId(scope.organizationId) },
          requestId: scope.requestId,
          traceId: scope.traceId,
        },
  );
  await ApprovalRequest.updateOne(
    { approvalRequestId: approval.approvalRequestId, organizationId: scope.organizationId },
    {
      $set: {
        orchestrationRunId: idOf(run),
        ...(node ? { orchestrationNodeRunId: idOf(node), orchestrationNodeKey: node.nodeKey } : {}),
        orchestrationRecoveryDecisionId: decision._id,
        ...(compensationRun ? { orchestrationCompensationRunId: compensationRun._id } : {}),
      },
    },
  );
  return approval;
}

async function authorizeNodeAction(run, node, actionName, scope, caller) {
  const permission = ACTION_PERMISSIONS[actionName];
  const policy = effectivePolicy(run);
  if (!allowedByPolicy(policy, actionName)) {
    throw new AppError(403, 'ORCHESTRATION_RECOVERY_POLICY_DENIED', 'Frozen recovery policy does not permit this action.');
  }
  if (!ACTION_STATES[actionName]?.has(node.status)) {
    throw new AppError(409, ErrorCodes.ORCHESTRATION_NODE_TRANSITION_INVALID, 'Node state is not eligible for this recovery action.');
  }
  await authorize(permission, 'OrchestrationNodeRun', node, scope, caller, {
    proposedOperatorAction: actionName,
    failureCategory: node.failureCategory,
    recoverability: node.recoverability,
    compensationAvailability: Boolean(nodeDefinition(run, node)?.compensationDefinition),
    recoveryAttemptCount: node.recoveryAttempt,
    compensationAttemptCount: node.compensationAttempt,
    unresolvedSideEffectCount: run.unresolvedSideEffects?.length || 0,
  });
  await assertOperationalAccess({
    ...scope,
    connectionId: node.recoveryTargetSnapshot?.connectionId || node.connectionId,
    operation: actionName === 'terminate' ? 'LIFECYCLE_CONTROL' : 'MUTATION',
  });
  return { permission, policy };
}

async function ensureCurrentNodeTarget(run, node) {
  const target = node.recoveryTargetSnapshot || node;
  const PassportConnection = require('../models/PassportConnection');
  const AgentPassport = require('../models/AgentPassport');
  const [connection, passport] = await Promise.all([
    PassportConnection.findOne({
      _id: target.connectionId,
      receivingWorkspaceId: run.workspaceId,
      status: 'connected',
      installScope: 'invoke',
      $or: [{ organizationId: run.organizationId }, { partnerId: run.organizationId }],
    }).lean(),
    AgentPassport.findOne({ _id: target.passportId, status: 'valid' }).lean(),
  ]);
  if (!connection) throw new AppError(409, 'ORCHESTRATION_RECOVERY_CONNECTION_REVOKED', 'Recovery target connection is unavailable.');
  if (!passport || idOf(connection.passportId) !== idOf(passport)) {
    throw new AppError(409, 'ORCHESTRATION_RECOVERY_PASSPORT_REVOKED', 'Recovery target passport is unavailable.');
  }
  if (String(passport.agent?.version || '') !== String(target.passportVersion || '')) {
    throw new AppError(409, 'ORCHESTRATION_RECOVERY_PASSPORT_REVOKED', 'Recovery target passport version changed.');
  }
  return { connection, passport, target };
}

async function applyOperatorRetry(run, node, decision, scope) {
  await ensureCurrentNodeTarget(run, node);
  const maximum = Number(node.maximumRecoveryAttempts || run.maximumRecoveryAttempts || 0);
  if (maximum < 1 || Number(node.recoveryAttempt || 0) >= maximum) {
    throw new AppError(409, 'ORCHESTRATION_RECOVERY_ATTEMPTS_EXHAUSTED', 'Recovery retry limit has been reached.');
  }
  const updated = await transitionNodeState(node, 'retry_wait', {
    recoveryAttempt: Number(node.recoveryAttempt || 0) + 1,
    recoveryDecisionId: decision._id,
    nextAttemptAt: new Date(),
  });
  let currentRun = run;
  if (['waiting_intervention', 'recovery_pending'].includes(currentRun.status)) {
    if (currentRun.status === 'waiting_intervention') currentRun = await transitionRunState(currentRun, 'recovery_pending', {});
    currentRun = await transitionRunState(currentRun, 'recovering', {
      currentRecoveryDecisionId: decision._id,
      recoveryAttempt: Number(currentRun.recoveryAttempt || 0) + 1,
    });
  }
  const applied = await markDecision(decision, 'applied', {
    resultingState: updated.status,
    appliedAt: new Date(),
  });
  metrics.increment('orchestration_recovery_operator_retries');
  await audit('orchestration.node.retry_applied', 'OrchestrationNodeRun', updated, scope, {
    orchestrationRunId: idOf(run),
    decisionId: idOf(applied),
    recoveryAttempt: updated.recoveryAttempt,
    fromState: node.status,
    toState: updated.status,
  });
  await createCheckpointForRun(run._id, `recovery-decision-${idOf(applied)}`, scope, {
    createdBy: scope.actorId,
  });
  return { decision: applied, node: updated, run: currentRun };
}

async function retryNode(runId, nodeRunId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  const run = await scopedRun(runId, scope, { privateFields: true });
  const node = await scopedNode(runId, nodeRunId, scope, { privateFields: true });
  const { permission, policy } = await authorizeNodeAction(run, node, 'retry', scope, caller);
  const created = await createDecisionRecord({
    run,
    node,
    type: 'operator_retry',
    input,
    scope,
    previousState: node.status,
    requestedState: 'retry_wait',
    safeChangeSummary: { recoveryAttempt: Number(node.recoveryAttempt || 0) + 1 },
  });
  if (created.replayed) {
    return { decision: serializeRecoveryDecision(created.decision), nodeStatus: node.status, idempotencyReplayed: true };
  }
  const approval = await requestActionApproval({ run, node, decision: created.decision, actionName: 'retry', permission, policy, scope, caller });
  if (approval) {
    const waiting = await markDecision(created.decision, 'approval_required', { approvalRequestId: approval.approvalRequestId });
    const intervention = await createIntervention({
      run,
      node,
      type: 'retry',
      allowedActions: ['retry', 'terminate'],
      safeFailureCode: node.safeFailure?.code,
      failureCategory: node.failureCategory,
      scope,
      title: 'Retry approval required',
      summary: 'An operator retry is awaiting approval.',
    });
    intervention.status = 'approval_required';
    intervention.approvalRequestId = approval.approvalRequestId;
    intervention.recoveryDecisionId = waiting._id;
    await intervention.save();
    return { decision: serializeRecoveryDecision(waiting), intervention: serializeIntervention(intervention), approvalRequired: true, idempotencyReplayed: false };
  }
  const result = await applyOperatorRetry(run, node, created.decision, scope);
  return { decision: serializeRecoveryDecision(result.decision), nodeStatus: result.node.status, runStatus: result.run.status, idempotencyReplayed: false };
}

function assertSkipSafe(run, node) {
  const definition = nodeDefinition(run, node);
  if (
    definition?.policyContext?.mandatory === true ||
    definition?.policyContext?.mandatoryCompliance === true ||
    definition?.policyContext?.mandatorySecurity === true ||
    definition?.approvalRequirement?.required === true
  ) {
    throw new AppError(403, 'ORCHESTRATION_NODE_SKIP_PROHIBITED', 'Mandatory compliance, security, or approval work cannot be skipped.');
  }
  const downstream = (run.definitionSnapshot?.nodes || []).filter((candidate) =>
    (candidate.dependencies || []).includes(node.nodeKey),
  );
  if (downstream.some((candidate) => candidate.continueOnFailure !== true)) {
    throw new AppError(409, 'ORCHESTRATION_NODE_SKIP_DEPENDENCY_INVALID', 'Required downstream work depends on this node output.');
  }
}

async function applySkip(run, node, decision, scope) {
  assertSkipSafe(run, node);
  const updated = await transitionNodeState(node, 'skipped', {
    recoveryDecisionId: decision._id,
    skippedAt: new Date(),
    completedAt: new Date(),
    validatedOutput: undefined,
  });
  await OrchestrationNodeRun.updateOne({ _id: updated._id }, { $unset: { validatedOutput: 1 } });
  const applied = await markDecision(decision, 'applied', { resultingState: 'skipped', appliedAt: new Date() });
  metrics.increment('orchestration_recovery_skipped_nodes');
  await audit('orchestration.node.skipped', 'OrchestrationNodeRun', updated, scope, {
    orchestrationRunId: idOf(run),
    decisionId: idOf(applied),
    fromState: node.status,
    toState: 'skipped',
  });
  await createCheckpointForRun(run._id, `recovery-decision-${idOf(applied)}`, scope, { createdBy: scope.actorId });
  return { decision: applied, node: updated };
}

async function skipNode(runId, nodeRunId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  const run = await scopedRun(runId, scope, { privateFields: true });
  const node = await scopedNode(runId, nodeRunId, scope, { privateFields: true });
  const { permission, policy } = await authorizeNodeAction(run, node, 'skip', scope, caller);
  assertSkipSafe(run, node);
  const created = await createDecisionRecord({ run, node, type: 'skip', input, scope, previousState: node.status, requestedState: 'skipped', safeChangeSummary: { outputFabricated: false } });
  if (created.replayed) return { decision: serializeRecoveryDecision(created.decision), nodeStatus: node.status, idempotencyReplayed: true };
  const approval = await requestActionApproval({ run, node, decision: created.decision, actionName: 'skip', permission, policy, scope, caller });
  if (approval) {
    const waiting = await markDecision(created.decision, 'approval_required', { approvalRequestId: approval.approvalRequestId });
    return { decision: serializeRecoveryDecision(waiting), approvalRequired: true, idempotencyReplayed: false };
  }
  const result = await applySkip(run, node, created.decision, scope);
  return { decision: serializeRecoveryDecision(result.decision), nodeStatus: result.node.status, idempotencyReplayed: false };
}

async function correctNodeInput(runId, nodeRunId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  const run = await scopedRun(runId, scope, { privateFields: true });
  const node = await scopedNode(runId, nodeRunId, scope, { privateFields: true });
  const { permission, policy } = await authorizeNodeAction(run, node, 'correct_input', scope, caller);
  const definition = nodeDefinition(run, node);
  if (node.resolvedInput === undefined) {
    throw new AppError(409, 'ORCHESTRATION_CORRECTED_INPUT_BASE_UNAVAILABLE', 'The validated original node input is unavailable.');
  }
  const classification = String(
    definition.policyContext?.dataClassification || definition.inputSchema?.['x-data-classification'] || 'restricted',
  ).toLowerCase();
  let dataContract;
  let contractTarget;
  if (node.dataContractId) {
    dataContract = await InterAgentDataContract.findOne({
      _id: node.dataContractId,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      version: Number(node.dataContractVersion),
      status: 'active',
      validFrom: { $lte: new Date() },
      expiresAt: { $gt: new Date() },
    }).lean();
    if (!dataContract) throw new AppError(409, 'DATA_CONTRACT_INACTIVE', 'Corrected input requires the frozen active data-contract version.');
    const target = node.recoveryTargetSnapshot || node;
    contractTarget = await CapabilityCatalogEntry.findOne({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      passportId: target.passportId,
      connectionId: target.connectionId,
      availabilityStatus: 'available',
      lifecycleStatus: 'valid',
      connectionStatus: 'connected',
    }).lean();
    if (!contractTarget) throw new AppError(409, 'INTER_AGENT_IDENTITY_UNAVAILABLE', 'Corrected input target is unavailable.');
  }
  const patch = input.correction || input.patch;
  const corrected = correctedInputRecord(node.resolvedInput, patch, {
    inputSchema: definition.inputSchema,
    allowedCorrectionFields: definition.recoveryOverrides?.allowedCorrectionFields,
    originalClassification: classification,
    dataClassification: String(input.dataClassification || classification).toLowerCase(),
    ...(dataContract
      ? {
          dataContract,
          target: contractTarget,
          contractContext: {
            target: contractTarget,
            runInput: run.input,
            metadata: {
              runId: idOf(run),
              nodeKey: node.nodeKey,
              requestId: scope.requestId,
              traceId: scope.traceId,
            },
            residencyRequirements: definition.policyContext?.residencyRequirements,
          },
        }
      : {}),
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: run._id,
    nodeRunId: node._id,
    version: Number(node.correctedInputVersion || 0) + 1,
    baseVersion: Number(node.correctedInputVersion || 0),
    requestedBy: scope.actorId,
    requestId: scope.requestId,
    traceId: scope.traceId,
    expiresAt: run.recoveryDeadlineAt,
  });
  const created = await createDecisionRecord({
    run,
    node,
    type: 'correct_input',
    input,
    scope,
    previousState: node.status,
    requestedState: 'retry_wait',
    safeChangeSummary: { changedFieldNames: corrected.changedFieldNames, changedFieldCount: corrected.changedFieldCount, classification: corrected.dataClassification },
  });
  if (created.replayed) return { decision: serializeRecoveryDecision(created.decision), nodeStatus: node.status, idempotencyReplayed: true };
  corrected.recoveryDecisionId = created.decision._id;
  const record = await OrchestrationCorrectedInput.create(corrected);
  created.decision.correctedInputId = record._id;
  created.decision.correctedInputSchemaHash = record.inputSchemaHash;
  await created.decision.save();
  const approval = await requestActionApproval({ run, node, decision: created.decision, actionName: 'correct_input', permission, policy, scope, caller });
  if (approval) {
    const waiting = await markDecision(created.decision, 'approval_required', { approvalRequestId: approval.approvalRequestId });
    return { decision: serializeRecoveryDecision(waiting), correctedInputVersion: record.version, approvalRequired: true, idempotencyReplayed: false };
  }
  const retry = await applyOperatorRetry(run, node, created.decision, scope);
  await OrchestrationNodeRun.updateOne(
    { _id: node._id, recoveryDecisionId: created.decision._id },
    { $set: { correctedInputId: record._id, correctedInputVersion: record.version, correctedInputSchemaHash: record.inputSchemaHash } },
  );
  metrics.increment('orchestration_recovery_input_corrections');
  await audit('orchestration.node.input_corrected', 'OrchestrationCorrectedInput', record, scope, {
    orchestrationRunId: idOf(run),
    nodeRunId: idOf(node),
    changedFieldNames: record.changedFieldNames,
    changedFieldCount: record.changedFieldCount,
    classification: record.dataClassification,
  });
  return { decision: serializeRecoveryDecision(retry.decision), correctedInputVersion: record.version, changedFieldNames: record.changedFieldNames, nodeStatus: retry.node.status, idempotencyReplayed: false };
}

async function replacementGrant(run, node, definition, selected, scope, caller) {
  const edge = (run.definitionSnapshot?.edges || []).find(
    (item) => item.to === node.nodeKey && item.mappingMode === 'contract',
  );
  if (!edge) return null;
  const contract = await InterAgentDataContract.findOne({
    _id: edge.dataContractId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    version: Number(edge.dataContractVersion),
    status: 'active',
    validFrom: { $lte: new Date() },
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!contract) {
    throw new AppError(409, 'DATA_CONTRACT_INACTIVE', 'Replacement requires the frozen active data-contract version.');
  }
  const targetCatalog = await CapabilityCatalogEntry.findOne({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    passportId: selected.passportId,
    connectionId: selected.connectionId,
    availabilityStatus: 'available',
    lifecycleStatus: 'valid',
    connectionStatus: 'connected',
  }).lean();
  if (
    !targetCatalog ||
    !selectorMatchesCandidate(contract.targetSelector, targetCatalog, {
      orchestrationDefinitionId: run.definitionId,
      selectionPolicyId: definition.selectionPolicyId,
      orchestrationNodeKey: node.nodeKey,
    })
  ) {
    throw new AppError(403, 'DATA_CONTRACT_SELECTOR_INVALID', 'Replacement candidate does not satisfy the frozen data contract.');
  }
  const sourceNode = await OrchestrationNodeRun.findOne({
    orchestrationRunId: run._id,
    nodeKey: edge.from,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  }).lean();
  if (!sourceNode) throw new AppError(409, 'INTER_AGENT_SOURCE_IDENTITY_MISMATCH', 'Contract source node is unavailable.');
  return createGrantRecord(
    {
      workspaceId: scope.workspaceId,
      contractId: edge.dataContractId,
      contractVersion: edge.dataContractVersion,
      orchestrationDefinitionId: run.definitionId,
      orchestrationRunId: run._id,
      sourceNodeRunId: sourceNode._id,
      targetNodeRunId: node._id,
      targetPassportId: selected.passportId,
      targetPassportVersion: selected.passportVersion,
      targetConnectionId: selected.connectionId,
      targetSelectionPolicyId: definition.selectionPolicyId,
      invocationLimit: 1,
      expiresAt: run.recoveryDeadlineAt || new Date(Date.now() + run.maxRunDurationMs),
      traceId: node.traceId,
      requestId: node.requestId,
    },
    scope,
    caller,
  );
}

async function applyReplacement(run, node, decision, selectionDecision, scope, caller) {
  if (!['selected', 'selected_with_fallback'].includes(selectionDecision.decisionStatus)) {
    throw new AppError(409, 'AGENT_SELECTION_APPROVAL_REQUIRED', 'Replacement selection is not approved.');
  }
  const definition = nodeDefinition(run, node);
  const selected = {
    connectionId: selectionDecision.selectedConnectionId,
    passportId: selectionDecision.selectedPassportId,
    passportVersion: selectionDecision.selectedPassportVersion,
    selectionPolicyId: selectionDecision.selectionPolicyId,
    selectionPolicyVersion: selectionDecision.selectionPolicyVersion,
    selectionDecisionId: selectionDecision._id,
    capability: node.capability,
    operation: node.operation,
  };
  const newGrant = await replacementGrant(run, node, definition, selected, scope, caller);
  const oldGrantId = node.delegationGrantId;
  const maximum = Number(node.maximumRecoveryAttempts || run.maximumRecoveryAttempts || 0);
  if (maximum < 1 || Number(node.recoveryAttempt || 0) >= maximum) {
    throw new AppError(409, 'ORCHESTRATION_RECOVERY_ATTEMPTS_EXHAUSTED', 'Recovery retry limit has been reached.');
  }
  const updated = await transitionNodeState(node, 'retry_wait', {
    recoveryTargetSnapshot: selected,
    replacementSelectionDecisionId: selectionDecision._id,
    replacementAppliedAt: new Date(),
    recoveryDecisionId: decision._id,
    recoveryAttempt: Number(node.recoveryAttempt || 0) + 1,
    nextAttemptAt: new Date(),
    ...(newGrant
      ? {
          delegationGrantId: newGrant._id,
          dataContractId: newGrant.contractId,
          dataContractVersion: newGrant.contractVersion,
          ...(newGrant.approvalRequestId ? { approvalRequestId: newGrant.approvalRequestId } : {}),
        }
      : {}),
  });
  if (oldGrantId && (!newGrant || idOf(oldGrantId) !== idOf(newGrant))) {
    await revokeGrantRecord(oldGrantId, scope, 'AGENT_REPLACED');
  }
  const applied = await markDecision(decision, 'applied', {
    resultingState: updated.status,
    replacementSelectionDecisionId: selectionDecision._id,
    appliedAt: new Date(),
  });
  metrics.increment('orchestration_recovery_agent_replacements');
  await audit('orchestration.node.agent_replaced', 'OrchestrationNodeRun', updated, scope, {
    orchestrationRunId: idOf(run),
    decisionId: idOf(applied),
    replacementSelectionDecisionId: idOf(selectionDecision),
    originalSelectionDecisionId: idOf(node.selectionDecisionId) || undefined,
    originalHistoryPreserved: true,
    contractRevalidated: Boolean(newGrant),
    oldGrantRevoked: Boolean(oldGrantId),
  });
  await createCheckpointForRun(run._id, `recovery-decision-${idOf(applied)}`, scope, { createdBy: scope.actorId });
  return { decision: applied, node: updated, selectionDecision, newGrant };
}

async function replaceNodeAgent(runId, nodeRunId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  const run = await scopedRun(runId, scope, { privateFields: true });
  const node = await scopedNode(runId, nodeRunId, scope, { privateFields: true });
  const { permission, policy } = await authorizeNodeAction(run, node, 'replace_agent', scope, caller);
  const definition = nodeDefinition(run, node);
  const selectionPolicyId = input.selectionPolicyId || definition.selectionPolicyId;
  if (!selectionPolicyId) {
    throw new AppError(400, 'AGENT_SELECTION_POLICY_REQUIRED', 'Explicit governed selection policy is required for replacement.');
  }
  const created = await createDecisionRecord({
    run,
    node,
    type: 'replace_agent',
    input,
    scope,
    previousState: node.status,
    requestedState: 'retry_wait',
    safeChangeSummary: { originalHistoryPreserved: true, selectionPolicyId: idOf(selectionPolicyId) },
  });
  if (created.replayed) {
    return { decision: serializeRecoveryDecision(created.decision), replacementSelectionDecisionId: idOf(created.decision.replacementSelectionDecisionId) || null, nodeStatus: node.status, idempotencyReplayed: true };
  }
  let selection;
  try {
    selection = await evaluateSelection(
      {
        workspaceId: scope.workspaceId,
        capability: node.capability,
        operation: node.operation,
        inputSchema: definition.inputSchema,
        requiredOutputSchema: definition.outputSchema,
        constraints: { ...(definition.selectionConstraints || {}), ...(input.selectionConstraints || {}) },
        preferredPassportIds: input.preferredPassportIds || definition.preferredPassportIds || [],
        excludedPassportIds: [...new Set([idOf(node.passportId), ...(definition.excludedPassportIds || []).map(idOf), ...(input.excludedPassportIds || []).map(idOf)])],
        selectionPolicyId,
        fallbackCandidateCount: 0,
        orchestrationDefinitionId: run.definitionId,
        orchestrationRunId: run._id,
        orchestrationNodeKey: `${node.nodeKey}:replacement`,
      },
      caller,
    );
  } catch (error) {
    await markDecision(created.decision, 'failed', { failedAt: new Date(), resultingState: node.status });
    throw error;
  }
  if (!selection.selectedCandidate) {
    await markDecision(created.decision, 'failed', { failedAt: new Date(), resultingState: node.status });
    throw new AppError(409, 'AGENT_SELECTION_NO_CANDIDATE', 'No eligible replacement agent is available.');
  }
  await AgentSelectionDecision.updateOne(
    { _id: selection.decisionId, organizationId: scope.organizationId, workspaceId: scope.workspaceId },
    { $set: { orchestrationRunId: run._id } },
  );
  created.decision.replacementSelectionDecisionId = selection.decisionId;
  await created.decision.save();
  const selectionRecord = await AgentSelectionDecision.findOne({ _id: selection.decisionId });
  const approval = await requestActionApproval({ run, node, decision: created.decision, actionName: 'replace_agent', permission, policy, scope, caller });
  if (approval || selectionRecord.decisionStatus === 'approval_required') {
    const approvalRequestId = approval?.approvalRequestId || selectionRecord.approvalRequestId;
    const waiting = await markDecision(created.decision, 'approval_required', { approvalRequestId });
    return { decision: serializeRecoveryDecision(waiting), replacementSelectionDecisionId: idOf(selectionRecord), approvalRequired: true, idempotencyReplayed: false };
  }
  const result = await applyReplacement(run, node, created.decision, selectionRecord, scope, caller);
  return { decision: serializeRecoveryDecision(result.decision), replacementSelectionDecisionId: idOf(selectionRecord), nodeStatus: result.node.status, newDelegationGrantId: idOf(result.newGrant) || null, idempotencyReplayed: false };
}

function checkpointSelectionMaterial(nodes) {
  return nodes
    .map((node) => ({
      nodeKey: node.nodeKey,
      connectionId: idOf(node.connectionId),
      passportId: idOf(node.passportId),
      passportVersion: node.passportVersion,
      selectionDecisionId: idOf(node.selectionDecisionId) || null,
      replacementSelectionDecisionId: idOf(node.replacementSelectionDecisionId) || null,
      recoveryTargetSnapshotHash: node.recoveryTargetSnapshot
        ? stableHash(node.recoveryTargetSnapshot, 'checkpoint-recovery-target')
        : null,
    }))
    .sort((left, right) => left.nodeKey.localeCompare(right.nodeKey));
}

function checkpointContractMaterial(run, nodes) {
  return {
    edges: (run.definitionSnapshot?.edges || [])
      .filter((edge) => edge.mappingMode === 'contract')
      .map((edge) => ({
        from: edge.from,
        to: edge.to,
        contractId: idOf(edge.dataContractId),
        version: Number(edge.dataContractVersion),
        inputSchemaHash: edge.inputSchemaHash,
        outputSchemaHash: edge.outputSchemaHash,
      }))
      .sort((left, right) => `${left.from}:${left.to}`.localeCompare(`${right.from}:${right.to}`)),
    grants: nodes
      .filter((node) => node.delegationGrantId)
      .map((node) => ({ nodeKey: node.nodeKey, grantIdHash: stableHash(idOf(node.delegationGrantId), 'checkpoint-grant-reference') }))
      .sort((left, right) => left.nodeKey.localeCompare(right.nodeKey)),
  };
}

async function createCheckpointForRun(runId, checkpointKey, scopeInput, options = {}) {
  const scope = scopeInput.partnerId || scopeInput.organizationId
    ? systemScope({ ...scopeInput, actorId: options.createdBy || scopeInput.actorId })
    : scopeInput;
  const run = await scopedRun(runId, scope, { privateFields: true });
  const key = String(checkpointKey || `manual-${Date.now()}`).trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(key)) {
    throw new AppError(400, 'ORCHESTRATION_CHECKPOINT_KEY_INVALID', 'Checkpoint key is invalid.');
  }
  const existing = await OrchestrationCheckpoint.findOne({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: run._id,
    checkpointKey: key,
  }).lean();
  if (existing) return serializeCheckpoint(existing);
  const nodes = await OrchestrationNodeRun.find({ orchestrationRunId: run._id })
    .select('+recoveryTargetSnapshot')
    .lean();
  const counter = await OrchestrationRun.findOneAndUpdate(
    { _id: run._id },
    { $inc: { checkpointSequence: 1 } },
    { new: true },
  ).select('checkpointSequence');
  const snapshot = checkpointSnapshot(run, nodes, {
    definitionSnapshot: run.definitionSnapshot,
    selectionSnapshot: checkpointSelectionMaterial(nodes),
    contractSnapshot: checkpointContractMaterial(run, nodes),
    recoveryPolicySnapshotHash:
      run.recoveryPolicySnapshotHash ||
      (run.recoveryPolicySnapshot
        ? stableHash(run.recoveryPolicySnapshot, 'checkpoint-recovery-policy')
        : undefined),
  });
  const checkpoint = await OrchestrationCheckpoint.create({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: run._id,
    checkpointKey: key,
    sequence: counter.checkpointSequence,
    status: 'created',
    runStatus: snapshot.runStatus,
    completedNodeKeys: snapshot.completedNodeKeys,
    activeNodeKeys: snapshot.activeNodeKeys,
    compensatedNodeKeys: snapshot.compensatedNodeKeys,
    skippedNodeKeys: snapshot.skippedNodeKeys,
    failedNodeKeys: snapshot.failedNodeKeys,
    definitionSnapshotHash: snapshot.definitionSnapshotHash,
    ...(snapshot.selectionSnapshotHash ? { selectionSnapshotHash: snapshot.selectionSnapshotHash } : {}),
    ...(snapshot.contractSnapshotHash ? { contractSnapshotHash: snapshot.contractSnapshotHash } : {}),
    ...(snapshot.recoveryPolicySnapshotHash ? { recoveryPolicySnapshotHash: snapshot.recoveryPolicySnapshotHash } : {}),
    safeStateHash: checkpointHash(snapshot),
    traceId: options.traceId || scope.traceId || run.traceId,
    requestId: options.requestId || scope.requestId || run.requestId,
    createdBy: options.createdBy || scope.actorId,
  });
  const validation = validateCheckpoint(checkpoint);
  if (!validation.valid) {
    checkpoint.status = 'invalidated';
    checkpoint.invalidatedAt = new Date();
    checkpoint.invalidationReasonCode = validation.errors[0]?.code || 'CHECKPOINT_VALIDATION_FAILED';
    await checkpoint.save();
    metrics.increment('orchestration_checkpoint_validation_failures', { reason: checkpoint.invalidationReasonCode });
    throw new AppError(409, 'ORCHESTRATION_CHECKPOINT_INVALID', 'Checkpoint validation failed.', validation.errors);
  }
  checkpoint.status = 'verified';
  checkpoint.verifiedAt = new Date();
  await checkpoint.save();
  await OrchestrationCheckpoint.updateMany(
    {
      _id: { $ne: checkpoint._id },
      orchestrationRunId: run._id,
      status: 'verified',
      sequence: { $lt: checkpoint.sequence },
    },
    { $set: { status: 'superseded' } },
  );
  metrics.increment('orchestration_checkpoints_created', { status: 'verified' });
  await audit('orchestration.checkpoint.created', 'OrchestrationCheckpoint', checkpoint, scope, {
    orchestrationRunId: idOf(run),
    checkpointKey: key,
    sequence: checkpoint.sequence,
    status: 'created',
  });
  await audit('orchestration.checkpoint.verified', 'OrchestrationCheckpoint', checkpoint, scope, {
    orchestrationRunId: idOf(run),
    checkpointKey: key,
    sequence: checkpoint.sequence,
    status: 'verified',
  });
  return serializeCheckpoint(checkpoint);
}

async function createCheckpoint(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationCheckpoint.create', 'OrchestrationCheckpoint', runId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'MUTATION' });
  return createCheckpointForRun(runId, input.checkpointKey || `manual-${normalizeClientKey(input.idempotencyKey).value}`, scope, {
    createdBy: scope.actorId,
    requestId: scope.requestId,
    traceId: scope.traceId,
  });
}

async function listCheckpoints(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationCheckpoint.read', 'OrchestrationCheckpoint', runId, scope, caller);
  await scopedRun(runId, scope);
  const pagination = paging(input);
  const [items, total] = await Promise.all([
    OrchestrationCheckpoint.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: runId })
      .sort({ sequence: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    OrchestrationCheckpoint.countDocuments({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: runId }),
  ]);
  return { items: items.map(serializeCheckpoint), pagination: { page: pagination.page, limit: pagination.limit, total } };
}

async function assertCheckpointAccessCurrent(run, nodes) {
  const PassportConnection = require('../models/PassportConnection');
  const AgentPassport = require('../models/AgentPassport');
  const pending = nodes.filter((node) => !['succeeded', 'compensated', 'skipped', 'cancelled', 'terminated'].includes(node.status));
  for (const node of pending) {
    const target = node.recoveryTargetSnapshot || node;
    const [connection, passport] = await Promise.all([
      PassportConnection.findOne({ _id: target.connectionId, receivingWorkspaceId: run.workspaceId, status: 'connected', installScope: 'invoke' }).lean(),
      AgentPassport.findOne({ _id: target.passportId, status: 'valid' }).lean(),
    ]);
    if (!connection || !passport || idOf(connection.passportId) !== idOf(passport) || String(passport.agent?.version || '') !== String(target.passportVersion || '')) {
      throw new AppError(409, 'ORCHESTRATION_CHECKPOINT_ACCESS_REVOKED', 'Checkpoint resume cannot restore revoked or changed agent access.');
    }
    if (node.delegationGrantId) {
      const grant = await InterAgentDelegationGrant.findOne({ _id: node.delegationGrantId, organizationId: run.organizationId, workspaceId: run.workspaceId }).lean();
      if (!grant || !['active', 'pending', 'completed', 'exhausted'].includes(grant.status)) {
        throw new AppError(409, 'ORCHESTRATION_CHECKPOINT_ACCESS_REVOKED', 'Checkpoint resume cannot restore a revoked delegation grant.');
      }
    }
  }
}

async function resumeCheckpoint(runId, checkpointId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationCheckpoint.resume', 'OrchestrationCheckpoint', checkpointId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'LIFECYCLE_CONTROL' });
  const run = await scopedRun(runId, scope, { privateFields: true });
  const checkpoint = await OrchestrationCheckpoint.findOne({ _id: checkpointId, orchestrationRunId: run._id, organizationId: scope.organizationId, workspaceId: scope.workspaceId });
  if (!checkpoint) throw new AppError(404, 'ORCHESTRATION_CHECKPOINT_NOT_FOUND', 'Checkpoint was not found.');
  const validation = validateCheckpoint(checkpoint);
  if (!validation.valid || !['verified', 'superseded'].includes(checkpoint.status)) {
    if (checkpoint.status !== 'invalidated') {
      checkpoint.status = 'invalidated';
      checkpoint.invalidatedAt = new Date();
      checkpoint.invalidationReasonCode = validation.errors[0]?.code || 'CHECKPOINT_NOT_VERIFIED';
      await checkpoint.save();
    }
    throw new AppError(409, 'ORCHESTRATION_CHECKPOINT_INVALID', 'Checkpoint is invalid or inconsistent.', validation.errors);
  }
  if (checkpoint.definitionSnapshotHash !== stableHash(run.definitionSnapshot, 'checkpoint-definition')) {
    throw new AppError(409, 'ORCHESTRATION_CHECKPOINT_DEFINITION_MISMATCH', 'Frozen definition no longer matches the checkpoint.');
  }
  const nodes = await OrchestrationNodeRun.find({ orchestrationRunId: run._id }).select('+recoveryTargetSnapshot');
  const currentSnapshot = checkpointSnapshot(run, nodes, {
    definitionSnapshot: run.definitionSnapshot,
    selectionSnapshot: checkpointSelectionMaterial(nodes),
    contractSnapshot: checkpointContractMaterial(run, nodes),
    recoveryPolicySnapshotHash:
      run.recoveryPolicySnapshotHash ||
      (run.recoveryPolicySnapshot
        ? stableHash(run.recoveryPolicySnapshot, 'checkpoint-recovery-policy')
        : undefined),
  });
  const currentValidation = validateCheckpoint(checkpoint, currentSnapshot);
  if (!currentValidation.valid) {
    checkpoint.status = 'invalidated';
    checkpoint.invalidatedAt = new Date();
    checkpoint.invalidationReasonCode = currentValidation.errors[0]?.code || 'CHECKPOINT_STATE_MISMATCH';
    await checkpoint.save();
    metrics.increment('orchestration_checkpoint_validation_failures', { reason: checkpoint.invalidationReasonCode });
    throw new AppError(409, 'ORCHESTRATION_CHECKPOINT_INVALID', 'Checkpoint no longer matches current durable state.', currentValidation.errors);
  }
  await assertCheckpointAccessCurrent(run, nodes);
  const created = await createDecisionRecord({ run, type: 'resume', input, scope, previousState: run.status, requestedState: 'running', safeChangeSummary: { checkpointId: idOf(checkpoint), completedWorkPreserved: true } });
  if (created.replayed) return { decision: serializeRecoveryDecision(created.decision), checkpoint: serializeCheckpoint(checkpoint), idempotencyReplayed: true };
  const policy = effectivePolicy(run);
  if (!policy.allowOperatorResume) throw new AppError(403, 'ORCHESTRATION_RECOVERY_POLICY_DENIED', 'Frozen recovery policy does not permit resume.');
  for (const node of nodes.filter((item) => ['waiting_intervention', 'recovery_pending', 'recovering'].includes(item.status))) {
    let current = node;
    if (current.status === 'waiting_intervention') current = await transitionNodeState(current, 'recovery_pending', { recoveryDecisionId: created.decision._id });
    if (current.status === 'recovery_pending') current = await transitionNodeState(current, 'recovering', { recoveryDecisionId: created.decision._id });
    await transitionNodeState(current, 'ready', { recoveryDecisionId: created.decision._id });
  }
  let resumedRun = run;
  if (resumedRun.status === 'waiting_intervention') resumedRun = await transitionRunState(resumedRun, 'recovery_pending', {});
  if (resumedRun.status === 'recovery_pending') resumedRun = await transitionRunState(resumedRun, 'recovering', {});
  if (resumedRun.status === 'recovering') resumedRun = await transitionRunState(resumedRun, 'running', { currentRecoveryDecisionId: created.decision._id, recoveredAt: new Date() });
  const applied = await markDecision(created.decision, 'applied', { resultingState: resumedRun.status, appliedAt: new Date() });
  checkpoint.resumedAt = new Date();
  checkpoint.resumedByDecisionId = applied._id;
  await checkpoint.save();
  metrics.increment('orchestration_checkpoint_resumes', { outcome: 'success' });
  await audit('orchestration.checkpoint.resumed', 'OrchestrationCheckpoint', checkpoint, scope, { orchestrationRunId: idOf(run), decisionId: idOf(applied), completedWorkPreserved: true });
  return { decision: serializeRecoveryDecision(applied), checkpoint: serializeCheckpoint(checkpoint), runStatus: resumedRun.status, completedWorkDuplicated: false, idempotencyReplayed: false };
}

function compensationClassification(definition) {
  return highestClassification(
    [
      definition.inputSchema?.['x-data-classification'],
      definition.outputSchema?.['x-data-classification'],
      definition.policyContext?.dataClassification,
      definition.compensationDefinition?.inputSchema?.['x-data-classification'],
    ].filter(Boolean),
    'restricted',
  );
}

async function createCompensationPlanForRun(runInput, triggerNodeInput, input = {}, scopeInput, options = {}) {
  const run = plain(runInput).definitionSnapshot
    ? runInput
    : await scopedRun(idOf(runInput), scopeInput, { privateFields: true });
  const scope = systemScope({
    organizationId: run.organizationId,
    workspaceId: run.workspaceId,
    actorId: scopeInput?.actorId || options.createdBy || 'system:orchestration-recovery-worker',
    requestId: scopeInput?.requestId || run.requestId,
    traceId: scopeInput?.traceId || run.traceId,
  });
  const triggerNode = triggerNodeInput
    ? plain(triggerNodeInput).nodeKey
      ? triggerNodeInput
      : await scopedNode(run._id, idOf(triggerNodeInput), scope, { privateFields: true })
    : null;
  const existing = run.compensationPlanId
    ? await OrchestrationCompensationPlan.findOne({
        _id: run.compensationPlanId,
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
      })
    : null;
  if (existing && !['cancelled', 'terminated'].includes(existing.status)) {
    return { run, plan: existing, compensationRuns: await OrchestrationCompensationRun.find({ compensationPlanId: existing._id }), idempotencyReplayed: true };
  }
  const policy = effectivePolicy(run);
  const nodes = await OrchestrationNodeRun.find({ orchestrationRunId: run._id })
    .select('+resolvedInput +validatedOutput +recoveryTargetSnapshot')
    .sort({ completedSideEffectAt: -1, completedAt: -1, nodeKey: 1 });
  const orderedSteps = deterministicCompensationSteps(run.definitionSnapshot, nodes, {
    ordering: policy.compensationOrdering || 'reverse_topological',
    assumeSucceededSideEffects: true,
  });
  if (!orderedSteps.length) {
    return { run, plan: null, compensationRuns: [], idempotencyReplayed: false };
  }
  const planKey = input.idempotencyKey || `compensation-plan:${idOf(run)}:${idOf(triggerNode) || 'run'}:${input.safeReasonCode || triggerNode?.safeFailure?.code || 'RECOVERY'}`;
  const idempotencyKeyHash = secureDigest('orchestration-compensation-plan-key', planKey);
  let plan;
  try {
    plan = await OrchestrationCompensationPlan.create({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      orchestrationRunId: run._id,
      ...(run.recoveryPolicyId ? { recoveryPolicyId: run.recoveryPolicyId } : {}),
      ...(run.recoveryPolicyVersion ? { recoveryPolicyVersion: run.recoveryPolicyVersion } : {}),
      ...(triggerNode ? { triggerNodeRunId: triggerNode._id } : {}),
      ...(triggerNode?.failureCategory ? { triggerFailureCategory: triggerNode.failureCategory } : {}),
      triggerReasonCode: safeReason(input, safeCode(triggerNode?.safeFailure?.code, 'ORCHESTRATION_COMPENSATION_REQUESTED')),
      status: 'planned',
      orderedSteps,
      completedStepCount: 0,
      failedStepCount: 0,
      nonReversibleStepCount: orderedSteps.filter((step) => step.safeReasonCode === 'NON_REVERSIBLE_SIDE_EFFECT').length,
      skippedStepCount: orderedSteps.filter(
        (step) =>
          !step.compensationRequired &&
          !['NON_REVERSIBLE_SIDE_EFFECT', 'COMPENSATION_NOT_DECLARED', 'MANUAL_INTERVENTION_REQUIRED'].includes(step.safeReasonCode),
      ).length,
      maximumParallelCompensations: Math.max(1, Number(policy.maximumParallelCompensations || 1)),
      continueAfterFailure: policy.continueCompensationAfterFailure === true,
      planDigest: stableHash(orderedSteps, 'compensation-plan'),
      idempotencyKeyHash,
      createdBy: options.createdBy || scope.actorId,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    plan = await OrchestrationCompensationPlan.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, idempotencyKeyHash });
    if (!plan) throw error;
    return { run, plan, compensationRuns: await OrchestrationCompensationRun.find({ compensationPlanId: plan._id }), idempotencyReplayed: true };
  }
  const definitions = new Map((run.definitionSnapshot?.nodes || []).map((definition) => [definition.nodeKey, definition]));
  const nodesById = new Map(nodes.map((node) => [idOf(node), node]));
  const compensationRuns = [];
  const unresolved = [];
  for (const step of orderedSteps) {
    const node = nodesById.get(idOf(step.originalNodeRunId));
    const definition = definitions.get(step.nodeKey);
    const compensation = definition?.compensationDefinition;
    if (!step.compensationRequired || !compensation || !node) {
      if (['NON_REVERSIBLE_SIDE_EFFECT', 'COMPENSATION_NOT_DECLARED', 'MANUAL_INTERVENTION_REQUIRED'].includes(step.safeReasonCode) && node) {
        unresolved.push({
          nodeRunId: node._id,
          nodeKey: node.nodeKey,
          recoverability: node.recoverability,
          status: step.safeReasonCode === 'NON_REVERSIBLE_SIDE_EFFECT' ? 'non_reversible' : 'non_compensatable',
          safeReasonCode: step.safeReasonCode,
          classification: compensationClassification(definition),
          acceptedRisk: false,
        });
        if (step.safeReasonCode === 'NON_REVERSIBLE_SIDE_EFFECT' && node.status === 'succeeded') await transitionNodeState(node, 'non_reversible', { compensationStatus: 'non_reversible' });
        else await OrchestrationNodeRun.updateOne({ _id: node._id }, { $set: { compensationStatus: 'non_reversible' } });
      }
      continue;
    }
    const maximumAttempts = Number(node.maximumCompensationAttempts || run.maximumCompensationAttempts || policy.maximumCompensationAttempts || 0);
    if (maximumAttempts < 1) {
      unresolved.push({ nodeRunId: node._id, nodeKey: node.nodeKey, recoverability: node.recoverability, status: 'compensation_unavailable', safeReasonCode: 'COMPENSATION_ATTEMPTS_DISABLED', classification: compensationClassification(definition), acceptedRisk: false });
      continue;
    }
    const rawIdempotencyKey = compensationIdempotencyKey({
      orchestrationRunId: idOf(run),
      originalNodeRunId: idOf(node),
      compensationDefinitionVersion: step.compensationDefinitionHash,
      compensationPlanId: idOf(plan),
      compensationStepOrdinal: step.order,
      logicalCompensationAttempt: 1,
    });
    const classification = compensationClassification(definition);
    const compensationRun = await OrchestrationCompensationRun.create({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      orchestrationRunId: run._id,
      compensationPlanId: plan._id,
      compensationStepOrdinal: step.order,
      originalNodeRunId: node._id,
      ...(options.recoveryDecisionId ? { recoveryDecisionId: options.recoveryDecisionId } : {}),
      compensationDefinitionSnapshot: compensation,
      compensationDefinitionHash: step.compensationDefinitionHash,
      compensationDefinitionVersion: step.compensationDefinitionHash,
      compensationConnectionId: compensation.connectionId,
      compensationPassportId: compensation.passportId,
      compensationPassportVersion: compensation.passportVersion,
      compensationCapability: compensation.capability,
      compensationOperation: compensation.operation,
      ...(compensation.dataContractId ? { dataContractId: compensation.dataContractId, dataContractVersion: compensation.dataContractVersion } : {}),
      status:
        (step.approvalRequired || policy.requireApprovalForCompensation) && !options.approvalSatisfied
          ? 'waiting_approval'
          : 'queued',
      attempt: 0,
      logicalCompensationAttempt: 1,
      maximumAttempts,
      deadlineAt: run.compensationDeadlineAt || new Date(Date.now() + Number(policy.compensationDeadlineMs || 60 * 60 * 1_000)),
      inputClassification: classification,
      inputSchemaHash: schemaHash(compensation.inputSchema),
      outputSchemaHash: schemaHash(compensation.outputSchema),
      idempotencyKeyHash: secureDigest('orchestration-compensation-logical-key', rawIdempotencyKey),
      remoteIdempotencyKeyHash: secureDigest('orchestration-compensation-remote-key', rawIdempotencyKey),
      requestId: `req_${secureDigest('orchestration-compensation-request', `${idOf(run)}:${step.order}`).slice(-48)}`,
      traceId: `trace_${secureDigest('orchestration-compensation-trace', `${run.traceId}:${step.order}`).slice(-48)}`,
      parentTraceId: triggerNode?.traceId || run.traceId,
      createdBy: options.createdBy || scope.actorId,
    });
    compensationRuns.push(compensationRun);
    if (['succeeded', 'failed', 'waiting_intervention', 'compensation_failed'].includes(node.status)) {
      const transitioned = await transitionNodeState(node, 'compensation_pending', {
        compensationStatus: 'pending',
        compensationRunId: compensationRun._id,
        ...(options.recoveryDecisionId ? { recoveryDecisionId: options.recoveryDecisionId } : {}),
      });
      nodesById.set(idOf(node), transitioned);
    }
  }
  if (unresolved.length) {
    await OrchestrationRun.updateOne({ _id: run._id }, { $addToSet: { unresolvedSideEffects: { $each: unresolved } } });
  }
  plan.status = 'active';
  plan.startedAt = new Date();
  await plan.save();
  let currentRun = run;
  if (currentRun.status !== 'compensation_pending' && currentRun.status !== 'compensating') {
    currentRun = await transitionRunState(currentRun, 'compensation_pending', { compensationPlanId: plan._id });
  } else {
    await OrchestrationRun.updateOne({ _id: run._id }, { $set: { compensationPlanId: plan._id } });
  }
  metrics.increment('orchestration_compensation_plans', { status: 'active' });
  metrics.increment('orchestration_compensation_steps', {}, orderedSteps.length);
  await audit('orchestration.compensation.plan.created', 'OrchestrationCompensationPlan', plan, scope, {
    orchestrationRunId: idOf(run),
    triggerNodeRunId: idOf(triggerNode) || undefined,
    stepCount: orderedSteps.length,
    compensationRunCount: compensationRuns.length,
    nonReversibleStepCount: unresolved.length,
    ordering: policy.compensationOrdering,
  });
  if (unresolved.length) {
    await createIntervention({
      run: currentRun,
      node: triggerNode,
      type: 'inspect_failure',
      allowedActions: ['waive_compensation', 'terminate'],
      safeFailureCode: 'NON_REVERSIBLE_SIDE_EFFECT',
      failureCategory: 'non_reversible_failure',
      scope,
      title: 'Non-reversible side effect requires intervention',
      summary: 'Complete compensation is impossible because one or more completed actions are non-reversible.',
    });
  }
  if (compensationRuns.some((item) => item.status === 'waiting_approval')) {
    await createIntervention({
      run: currentRun,
      node: triggerNode,
      type: 'compensate',
      allowedActions: ['compensate', 'terminate'],
      safeFailureCode: 'COMPENSATION_APPROVAL_REQUIRED',
      failureCategory: triggerNode?.failureCategory,
      scope,
      title: 'Compensation approval required',
      summary: 'One or more declared compensation steps require an approved human recovery decision.',
    });
  }
  return { run: currentRun, plan, compensationRuns, idempotencyReplayed: false };
}

async function planRunRecovery(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationRecovery.plan', 'OrchestrationRun', runId, scope, caller, { proposedOperatorAction: 'compensate' });
  await assertOperationalAccess({ ...scope, operation: 'MUTATION' });
  const run = await scopedRun(runId, scope, { privateFields: true });
  const triggerNode = input.nodeRunId ? await scopedNode(runId, input.nodeRunId, scope, { privateFields: true }) : null;
  const result = await createCompensationPlanForRun(run, triggerNode, input, scope, { createdBy: scope.actorId });
  return {
    plan: result.plan ? serializeCompensationPlan(result.plan) : null,
    compensations: result.compensationRuns.map(serializeCompensationRun),
    runStatus: result.run.status,
    idempotencyReplayed: result.idempotencyReplayed,
  };
}

async function compensateNode(runId, nodeRunId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  const run = await scopedRun(runId, scope, { privateFields: true });
  const node = await scopedNode(runId, nodeRunId, scope, { privateFields: true });
  const definition = nodeDefinition(run, node);
  const eligibility = compensationEligible(node, definition);
  if (!eligibility.eligible) {
    throw new AppError(409, 'ORCHESTRATION_COMPENSATION_INELIGIBLE', 'Node is not eligible for compensation.', [{ path: 'nodeRunId', code: eligibility.reasonCode, message: 'Compensation eligibility failed.' }]);
  }
  const { permission, policy } = await authorizeNodeAction(run, node, 'compensate', scope, caller);
  const created = await createDecisionRecord({ run, node, type: 'compensate', input, scope, previousState: node.status, requestedState: 'compensation_pending', safeChangeSummary: { compensationDeclared: true } });
  if (created.replayed) {
    const plan = run.compensationPlanId ? await OrchestrationCompensationPlan.findById(run.compensationPlanId) : null;
    return { decision: serializeRecoveryDecision(created.decision), plan: plan ? serializeCompensationPlan(plan) : null, idempotencyReplayed: true };
  }
  const approval = await requestActionApproval({ run, node, decision: created.decision, actionName: 'compensate', permission, policy, scope, caller });
  if (approval) {
    const waiting = await markDecision(created.decision, 'approval_required', { approvalRequestId: approval.approvalRequestId });
    const intervention = await createIntervention({ run, node, type: 'compensate', allowedActions: ['compensate', 'terminate'], safeFailureCode: node.safeFailure?.code, failureCategory: node.failureCategory, scope, title: 'Compensation approval required', summary: 'Declared compensation is awaiting approval.' });
    intervention.status = 'approval_required';
    intervention.approvalRequestId = approval.approvalRequestId;
    intervention.recoveryDecisionId = waiting._id;
    await intervention.save();
    return { decision: serializeRecoveryDecision(waiting), intervention: serializeIntervention(intervention), approvalRequired: true, idempotencyReplayed: false };
  }
  const result = await createCompensationPlanForRun(run, node, input, scope, { createdBy: scope.actorId, recoveryDecisionId: created.decision._id, approvalSatisfied: true });
  const applied = await markDecision(created.decision, 'applied', { resultingState: result.run.status, appliedAt: new Date() });
  await OrchestrationRun.updateOne({ _id: run._id }, { $set: { currentRecoveryDecisionId: applied._id } });
  await audit('orchestration.node.compensation_requested', 'OrchestrationNodeRun', node, scope, { orchestrationRunId: idOf(run), decisionId: idOf(applied), planId: idOf(result.plan) });
  return { decision: serializeRecoveryDecision(applied), plan: result.plan ? serializeCompensationPlan(result.plan) : null, compensations: result.compensationRuns.map(serializeCompensationRun), idempotencyReplayed: false };
}

async function beginCancellationCompensation(runInput, scopeInput, options = {}) {
  const run = plain(runInput).definitionSnapshot ? runInput : await scopedRun(idOf(runInput), scopeInput, { privateFields: true });
  const nodes = await OrchestrationNodeRun.find({ orchestrationRunId: run._id }).select('+resolvedInput +validatedOutput');
  const eligible = nodes.find((node) => compensationEligible(node, nodeDefinition(run, node)).eligible);
  if (!eligible) return null;
  const result = await createCompensationPlanForRun(run, eligible, { idempotencyKey: `cancellation-compensation:${idOf(run)}`, safeReasonCode: options.safeReasonCode || 'ORCHESTRATION_CANCELLED' }, scopeInput, { createdBy: scopeInput.actorId });
  return result.plan ? result : null;
}

async function linkRecoveryIncident(run, scope, reasonCode, options = {}) {
  if (run.recoveryIncidentId) return run.recoveryIncidentId;
  const incidentId = `inc_${crypto.randomUUID()}`;
  const incident = await OperationalIncident.create({
    incidentId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    severity: options.severity || 'HIGH',
    category: 'ORCHESTRATION_RECOVERY',
    title: String(options.title || 'Orchestration recovery requires attention').slice(0, 200),
    safeDescription: String(options.safeDescription || 'Recovery left unresolved external side effects.').slice(0, 2_000),
    status: 'OPEN',
    detectedAt: new Date(),
    affectedScopes: [{ orchestrationRunId: idOf(run), reasonCode: safeCode(reasonCode) }],
    traceReferences: [run.traceId].filter(Boolean),
    invocationReferences: (options.invocationIds || []).map(idOf).filter(Boolean).slice(0, 100),
    timeline: [{ at: new Date(), actorId: scope.actorId, action: 'CREATED', safeNote: 'Linked by orchestration recovery.', reasonCode: safeCode(reasonCode) }],
    revision: 0,
    schemaVersion: 1,
  });
  await OrchestrationRun.updateOne({ _id: run._id }, { $set: { recoveryIncidentId: incident.incidentId } });
  await audit('orchestration.recovery.incident_linked', 'OperationalIncident', incident.incidentId, scope, { orchestrationRunId: idOf(run), incidentId: incident.incidentId, reasonCode: safeCode(reasonCode) });
  return incident.incidentId;
}

async function applyWaiver(run, node, decision, scope) {
  if (node.compensationRunId) {
    const compensation = await OrchestrationCompensationRun.findOne({ _id: node.compensationRunId });
    if (compensation && ['pending', 'waiting_intervention'].includes(compensation.status)) {
      assertRecoveryTransition(COMPENSATION_RUN_TRANSITIONS, compensation.status, 'waived', 'ORCHESTRATION_COMPENSATION_TRANSITION_INVALID');
      compensation.status = 'waived';
      compensation.completedAt = new Date();
      await compensation.save();
    }
  }
  await OrchestrationNodeRun.updateOne(
    { _id: node._id, compensationStatus: { $ne: 'succeeded' } },
    { $set: { compensationStatus: 'waived', compensationWaivedAt: new Date(), compensationWaiverReasonCode: decision.safeReasonCode, recoveryDecisionId: decision._id } },
  );
  await OrchestrationRun.updateOne(
    { _id: run._id },
    {
      $addToSet: {
        unresolvedSideEffects: {
          nodeRunId: node._id,
          nodeKey: node.nodeKey,
          recoverability: node.recoverability,
          status: 'compensation_waived',
          safeReasonCode: decision.safeReasonCode,
          classification: compensationClassification(nodeDefinition(run, node)),
          acceptedRisk: true,
        },
      },
    },
  );
  let terminalRun = run;
  if (!['termination_requested', 'terminated_with_accepted_risk'].includes(terminalRun.status)) {
    terminalRun = await transitionRunState(terminalRun, 'termination_requested', { terminationRequestedAt: new Date(), terminationReasonCode: decision.safeReasonCode });
  }
  if (terminalRun.status === 'termination_requested') {
    terminalRun = await transitionRunState(terminalRun, 'terminated_with_accepted_risk', { terminatedAt: new Date(), completedAt: new Date(), terminationReasonCode: decision.safeReasonCode });
  }
  const applied = await markDecision(decision, 'applied', { resultingState: terminalRun.status, appliedAt: new Date() });
  await linkRecoveryIncident(terminalRun, scope, 'COMPENSATION_WAIVED', { title: 'Compensation waived with accepted risk', safeDescription: 'A privileged operator accepted an unresolved compensating action.' });
  metrics.increment('orchestration_compensation_waivers');
  await audit('orchestration.compensation.waived', 'OrchestrationNodeRun', node, scope, { orchestrationRunId: idOf(run), decisionId: idOf(applied), safeReasonCode: decision.safeReasonCode, status: 'waived', acceptedRisk: true });
  await createCheckpointForRun(run._id, `compensation-waiver-${idOf(applied)}`, scope, { createdBy: scope.actorId });
  return { decision: applied, run: terminalRun };
}

async function waiveNodeCompensation(runId, nodeRunId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  const run = await scopedRun(runId, scope, { privateFields: true });
  const node = await scopedNode(runId, nodeRunId, scope, { privateFields: true });
  const { permission, policy } = await authorizeNodeAction(run, node, 'waive_compensation', scope, caller);
  const reasonCode = safeReason(input);
  const created = await createDecisionRecord({ run, node, type: 'waive_compensation', input: { ...input, safeReasonCode: reasonCode }, scope, previousState: node.status, requestedState: 'terminated_with_accepted_risk', safeChangeSummary: { compensationOutcome: 'waived', acceptedRisk: true } });
  if (created.replayed) return { decision: serializeRecoveryDecision(created.decision), runStatus: run.status, idempotencyReplayed: true };
  const approval = await requestActionApproval({ run, node, decision: created.decision, actionName: 'waive_compensation', permission, policy, scope, caller });
  if (approval) {
    const waiting = await markDecision(created.decision, 'approval_required', { approvalRequestId: approval.approvalRequestId });
    return { decision: serializeRecoveryDecision(waiting), approvalRequired: true, idempotencyReplayed: false };
  }
  const result = await applyWaiver(run, node, created.decision, scope);
  return { decision: serializeRecoveryDecision(result.decision), runStatus: result.run.status, compensationStatus: 'waived', idempotencyReplayed: false };
}

async function forceTerminate(run, decision, scope, caller = {}) {
  let currentRun = run;
  if (!['termination_requested', 'terminated', 'terminated_with_accepted_risk'].includes(currentRun.status)) {
    currentRun = await transitionRunState(currentRun, 'termination_requested', { terminationRequestedAt: new Date(), terminationReasonCode: decision.safeReasonCode });
  }
  const nodes = await OrchestrationNodeRun.find({ orchestrationRunId: run._id }).select('+validatedOutput');
  const unresolved = [];
  for (const node of nodes) {
    if (node.completedSideEffectAt && !['succeeded', 'waived'].includes(node.compensationStatus)) {
      unresolved.push({ nodeRunId: node._id, nodeKey: node.nodeKey, recoverability: node.recoverability, status: node.compensationStatus || node.status, safeReasonCode: 'FORCE_TERMINATED_UNRESOLVED', classification: compensationClassification(nodeDefinition(run, node)), acceptedRisk: false });
    }
    if (!['succeeded', 'compensated', 'compensation_failed', 'non_reversible', 'cancelled', 'skipped', 'terminated'].includes(node.status)) {
      assertNodeTransition(node.status, 'terminated');
      await OrchestrationNodeRun.findOneAndUpdate({ _id: node._id, status: node.status }, { $set: { status: 'terminated', terminatedAt: new Date(), completedAt: new Date(), recoveryDecisionId: decision._id }, $unset: { leaseOwner: 1, leaseToken: 1, leaseExpiresAt: 1, heartbeatAt: 1, nextAttemptAt: 1 } });
    }
  }
  await OrchestrationCompensationRun.updateMany(
    { orchestrationRunId: run._id, status: { $in: ['pending', 'queued', 'retry_wait', 'waiting_approval', 'waiting_intervention'] } },
    { $set: { status: 'terminated', completedAt: new Date(), safeFailureCode: 'OPERATOR_TERMINATED', safeFailureCategory: 'operator_terminated' }, $unset: { leaseOwner: 1, leaseTokenHash: 1, leaseExpiresAt: 1, heartbeatAt: 1, nextAttemptAt: 1 } },
  );
  const { closeRunGrants } = require('./interAgentDelegation.service');
  await closeRunGrants(run._id, 'terminated', scope);
  if (unresolved.length) {
    await OrchestrationRun.updateOne({ _id: run._id }, { $addToSet: { unresolvedSideEffects: { $each: unresolved } } });
  }
  if (currentRun.status === 'termination_requested') {
    currentRun = await transitionRunState(currentRun, 'terminated', { terminatedAt: new Date(), completedAt: new Date(), terminationReasonCode: decision.safeReasonCode, activeNodeCount: 0, ...(unresolved.length ? { unresolvedSideEffects: [...(run.unresolvedSideEffects || []), ...unresolved] } : {}) });
  }
  const applied = await markDecision(decision, 'applied', { resultingState: currentRun.status, appliedAt: new Date() });
  await linkRecoveryIncident(currentRun, scope, 'ORCHESTRATION_FORCE_TERMINATED', { title: 'Orchestration force terminated', safeDescription: 'A privileged recovery action terminated scheduling while preserving evidence.', invocationIds: nodes.map((node) => node.invocationId).filter(Boolean) });
  metrics.increment('orchestration_recovery_force_terminations');
  await audit('orchestration.run.force_terminated', 'OrchestrationRun', currentRun, scope, { decisionId: idOf(applied), safeReasonCode: decision.safeReasonCode, unresolvedSideEffectCount: unresolved.length, evidencePreserved: true });
  await createCheckpointForRun(run._id, `force-termination-${idOf(applied)}`, scope, { createdBy: scope.actorId });
  return { decision: applied, run: currentRun };
}

async function terminateRunRecovery(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  const run = await scopedRun(runId, scope, { privateFields: true });
  if (['terminated', 'terminated_with_accepted_risk'].includes(run.status)) return { runStatus: run.status, idempotencyReplayed: true };
  await authorize('orchestrationRecovery.terminate', 'OrchestrationRun', run, scope, caller, { proposedOperatorAction: 'terminate', unresolvedSideEffectCount: run.unresolvedSideEffects?.length || 0 });
  await assertOperationalAccess({ ...scope, operation: 'LIFECYCLE_CONTROL' });
  const policy = effectivePolicy(run);
  if (!policy.allowOperatorTerminate) throw new AppError(403, 'ORCHESTRATION_RECOVERY_POLICY_DENIED', 'Frozen recovery policy does not permit force termination.');
  const reasonCode = safeReason(input);
  const created = await createDecisionRecord({ run, type: 'terminate', input: { ...input, safeReasonCode: reasonCode }, scope, previousState: run.status, requestedState: 'terminated', safeChangeSummary: { evidencePreserved: true, unresolvedSideEffectCount: run.unresolvedSideEffects?.length || 0 } });
  if (created.replayed) return { decision: serializeRecoveryDecision(created.decision), runStatus: run.status, idempotencyReplayed: true };
  const approval = await requestActionApproval({ run, decision: created.decision, actionName: 'terminate', permission: 'orchestrationRecovery.terminate', policy, scope, caller });
  if (approval) {
    const waiting = await markDecision(created.decision, 'approval_required', { approvalRequestId: approval.approvalRequestId });
    return { decision: serializeRecoveryDecision(waiting), approvalRequired: true, idempotencyReplayed: false };
  }
  const result = await forceTerminate(run, created.decision, scope, caller);
  return { decision: serializeRecoveryDecision(result.decision), runStatus: result.run.status, unresolvedSideEffects: result.run.unresolvedSideEffects || [], idempotencyReplayed: false };
}

async function listInterventions(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationIntervention.read', 'OrchestrationInterventionRequest', null, scope, caller);
  const pagination = paging(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) {
    const status = String(input.status).toLowerCase();
    if (!INTERVENTION_STATUSES.includes(status)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Intervention status is invalid.');
    filter.status = status;
  }
  if (input.runId) filter.orchestrationRunId = input.runId;
  const [items, total] = await Promise.all([
    OrchestrationInterventionRequest.find(filter).sort({ createdAt: -1, _id: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    OrchestrationInterventionRequest.countDocuments(filter),
  ]);
  return { items: items.map((item) => serializeIntervention(item)), pagination: { page: pagination.page, limit: pagination.limit, total } };
}

async function scopedIntervention(interventionId, scope) {
  if (!mongoose.isValidObjectId(interventionId)) throw new AppError(404, 'ORCHESTRATION_INTERVENTION_NOT_FOUND', 'Intervention was not found.');
  const intervention = await OrchestrationInterventionRequest.findOne({ _id: interventionId, organizationId: scope.organizationId, workspaceId: scope.workspaceId });
  if (!intervention) throw new AppError(404, 'ORCHESTRATION_INTERVENTION_NOT_FOUND', 'Intervention was not found.');
  return intervention;
}

async function getIntervention(interventionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationIntervention.read', 'OrchestrationInterventionRequest', interventionId, scope, caller);
  const intervention = await scopedIntervention(interventionId, scope);
  const run = await scopedRun(intervention.orchestrationRunId, scope, { privateFields: true });
  const node = intervention.nodeRunId ? await scopedNode(run._id, intervention.nodeRunId, scope, { privateFields: true }) : null;
  const available = await availableActionsFor(run, node, intervention, scope, caller);
  return serializeIntervention(intervention, available);
}

async function resolveApprovedDecision(run, node, decision, actionName, scope, caller) {
  let current = decision;
  if (current.decisionStatus === 'approval_required') {
    const request = await ApprovalRequest.findOne({ approvalRequestId: current.approvalRequestId, organizationId: scope.organizationId });
    if (!request) throw new AppError(409, ErrorCodes.APPROVAL_REQUEST_NOT_FOUND, 'Recovery approval request is unavailable.');
    const resolved = await expireIfNeeded(request);
    if (resolved.status !== 'APPROVED') {
      if (['REJECTED', 'EXPIRED', 'INVALIDATED'].includes(resolved.status)) {
        await markDecision(current, resolved.status === 'EXPIRED' ? 'expired' : 'rejected', { failedAt: new Date(), resultingState: node?.status || run.status });
      }
      throw new AppError(403, resolved.status === 'EXPIRED' ? ErrorCodes.APPROVAL_EXPIRED : ErrorCodes.APPROVAL_REJECTED, 'Recovery action approval was not granted.');
    }
    current = await markDecision(current, 'approved', { approvedBy: scope.actorId, approvedAt: new Date() });
  }
  if (actionName === 'retry') return applyOperatorRetry(run, node, current, scope);
  if (actionName === 'skip') return applySkip(run, node, current, scope);
  if (actionName === 'correct_input') {
    const record = await OrchestrationCorrectedInput.findOne({ recoveryDecisionId: current._id }).select('+encryptedPayload +payloadHash');
    if (!record) throw new AppError(409, 'ORCHESTRATION_CORRECTED_INPUT_PAYLOAD_UNAVAILABLE', 'Approved corrected input is unavailable.');
    decryptCorrectedInput(record);
    await OrchestrationNodeRun.updateOne({ _id: node._id }, { $set: { correctedInputId: record._id, correctedInputVersion: record.version, correctedInputSchemaHash: record.inputSchemaHash } });
    return applyOperatorRetry(run, node, current, scope);
  }
  if (actionName === 'replace_agent') {
    const selection = await AgentSelectionDecision.findOne({ _id: current.replacementSelectionDecisionId, organizationId: scope.organizationId, workspaceId: scope.workspaceId });
    if (!selection) throw new AppError(409, 'AGENT_SELECTION_DECISION_NOT_FOUND', 'Replacement selection decision is unavailable.');
    return applyReplacement(run, node, current, selection, scope, caller);
  }
  if (actionName === 'compensate') {
    if (run.compensationPlanId) {
      await OrchestrationCompensationRun.updateMany(
        { compensationPlanId: run.compensationPlanId, status: 'waiting_approval' },
        { $set: { status: 'queued', recoveryDecisionId: current._id, approvalRequestId: current.approvalRequestId } },
      );
    }
    const result = await createCompensationPlanForRun(run, node, { idempotencyKey: `approved-compensation:${idOf(current)}`, safeReasonCode: current.safeReasonCode }, scope, { createdBy: scope.actorId, recoveryDecisionId: current._id, approvalSatisfied: true });
    const applied = await markDecision(current, 'applied', { resultingState: result.run.status, appliedAt: new Date() });
    return { decision: applied, run: result.run, plan: result.plan };
  }
  if (actionName === 'waive_compensation') return applyWaiver(run, node, current, scope);
  if (actionName === 'terminate') return forceTerminate(run, current, scope, caller);
  throw new AppError(400, 'ORCHESTRATION_INTERVENTION_ACTION_INVALID', 'Intervention action is invalid.');
}

async function resolveIntervention(interventionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationIntervention.resolve', 'OrchestrationInterventionRequest', interventionId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'LIFECYCLE_CONTROL' });
  const intervention = await scopedIntervention(interventionId, scope);
  if (intervention.status === 'resolved') return { intervention: serializeIntervention(intervention), idempotencyReplayed: true };
  if (!['pending', 'approval_required'].includes(intervention.status)) throw new AppError(409, 'ORCHESTRATION_INTERVENTION_TERMINAL', 'Intervention is already terminal.');
  if (new Date(intervention.expiresAt) <= new Date()) {
    assertRecoveryTransition(INTERVENTION_TRANSITIONS, intervention.status, 'expired', 'ORCHESTRATION_INTERVENTION_TRANSITION_INVALID');
    intervention.status = 'expired';
    intervention.expiredAt = new Date();
    await intervention.save();
    throw new AppError(409, 'ORCHESTRATION_INTERVENTION_EXPIRED', 'Intervention has expired.');
  }
  const actionName = String(input.resolutionAction || input.action || '').trim();
  if (!intervention.allowedActions.includes(actionName)) throw new AppError(403, 'ORCHESTRATION_INTERVENTION_ACTION_DENIED', 'Intervention does not permit the requested action.');
  const run = await scopedRun(intervention.orchestrationRunId, scope, { privateFields: true });
  const node = intervention.nodeRunId ? await scopedNode(run._id, intervention.nodeRunId, scope, { privateFields: true }) : null;
  const permission = ACTION_PERMISSIONS[actionName];
  await authorize(permission, 'OrchestrationRecoveryAction', node || run, scope, caller, { proposedOperatorAction: actionName, failureCategory: node?.failureCategory, recoverability: node?.recoverability });
  let result;
  if (intervention.recoveryDecisionId) {
    const decision = await OrchestrationRecoveryDecision.findOne({ _id: intervention.recoveryDecisionId, organizationId: scope.organizationId, workspaceId: scope.workspaceId });
    if (!decision) throw new AppError(409, 'ORCHESTRATION_RECOVERY_DECISION_NOT_FOUND', 'Recovery decision is unavailable.');
    result = await resolveApprovedDecision(run, node, decision, actionName, scope, caller);
  } else {
    const actionInput = { ...input, workspaceId: scope.workspaceId, idempotencyKey: input.idempotencyKey || `intervention:${idOf(intervention)}:${actionName}`, safeReasonCode: safeReason(input, 'INTERVENTION_RESOLVED') };
    if (actionName === 'retry') result = await retryNode(run._id, node._id, actionInput, caller);
    else if (actionName === 'skip') result = await skipNode(run._id, node._id, actionInput, caller);
    else if (actionName === 'correct_input') result = await correctNodeInput(run._id, node._id, actionInput, caller);
    else if (actionName === 'replace_agent') result = await replaceNodeAgent(run._id, node._id, actionInput, caller);
    else if (actionName === 'compensate') result = await compensateNode(run._id, node._id, actionInput, caller);
    else if (actionName === 'waive_compensation') result = await waiveNodeCompensation(run._id, node._id, actionInput, caller);
    else if (actionName === 'terminate') result = await terminateRunRecovery(run._id, actionInput, caller);
    else throw new AppError(400, 'ORCHESTRATION_INTERVENTION_ACTION_INVALID', 'This intervention requires an existing durable decision.');
  }
  const latestDecision = result?.decision?.decisionId
    ? await OrchestrationRecoveryDecision.findById(result.decision.decisionId)
    : result?.decision?._id
      ? result.decision
      : null;
  assertRecoveryTransition(INTERVENTION_TRANSITIONS, intervention.status, 'resolved', 'ORCHESTRATION_INTERVENTION_TRANSITION_INVALID');
  intervention.status = 'resolved';
  intervention.resolvedBy = scope.actorId;
  intervention.resolvedAt = new Date();
  intervention.resolutionAction = actionName;
  intervention.safeResolutionReason = String(input.safeResolutionReason || input.safeReasonMessage || 'Resolved through an authorized recovery action.').slice(0, RECOVERY_LIMITS.maximumSafeReasonLength);
  if (latestDecision) intervention.recoveryDecisionId = latestDecision._id;
  await intervention.save();
  metrics.observe('orchestration_intervention_resolution_duration', Date.now() - new Date(intervention.createdAt).getTime());
  await audit('orchestration.intervention.resolved', 'OrchestrationInterventionRequest', intervention, scope, { orchestrationRunId: idOf(run), nodeRunId: idOf(node) || undefined, action: actionName, decisionId: idOf(latestDecision) || undefined });
  return { intervention: serializeIntervention(intervention), result, idempotencyReplayed: false };
}

async function getRunRecovery(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationRecovery.read', 'OrchestrationRun', runId, scope, caller);
  const run = await scopedRun(runId, scope, { privateFields: true });
  const [nodes, decisions, plan, compensations, intervention, checkpoints] = await Promise.all([
    OrchestrationNodeRun.find({ orchestrationRunId: run._id }).sort({ nodeKey: 1 }).lean(),
    OrchestrationRecoveryDecision.find({ orchestrationRunId: run._id, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).sort({ createdAt: -1 }).limit(RECOVERY_LIMITS.maximumTimelineEntries).lean(),
    run.compensationPlanId ? OrchestrationCompensationPlan.findOne({ _id: run.compensationPlanId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean() : null,
    OrchestrationCompensationRun.find({ orchestrationRunId: run._id, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).sort({ compensationStepOrdinal: 1 }).lean(),
    run.interventionRequestId ? OrchestrationInterventionRequest.findOne({ _id: run.interventionRequestId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }) : null,
    OrchestrationCheckpoint.find({ orchestrationRunId: run._id, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).sort({ sequence: -1 }).limit(20).lean(),
  ]);
  const failedNode = nodes.find((node) => ['failed', 'waiting_intervention', 'recovery_pending', 'compensation_failed', 'non_reversible'].includes(node.status)) || null;
  const availableActions = await availableActionsFor(run, failedNode, intervention, scope, caller);
  const compensationProgress = {
    total: compensations.length,
    pending: compensations.filter((item) => ['pending', 'queued', 'retry_wait', 'waiting_approval', 'waiting_intervention'].includes(item.status)).length,
    running: compensations.filter((item) => item.status === 'running').length,
    succeeded: compensations.filter((item) => item.status === 'succeeded').length,
    failed: compensations.filter((item) => item.status === 'failed').length,
    waived: compensations.filter((item) => item.status === 'waived').length,
  };
  const timeline = [
    ...decisions.map((decision) => ({
      at: decision.createdAt,
      type: 'recovery_decision',
      id: idOf(decision),
      action: decision.decisionType,
      status: decision.decisionStatus,
      safeReasonCode: decision.safeReasonCode,
      requestId: decision.requestId,
      traceId: decision.traceId,
    })),
    ...compensations.map((compensation) => ({
      at: compensation.updatedAt || compensation.createdAt,
      type: 'compensation',
      id: idOf(compensation),
      action: compensation.compensationOperation,
      status: compensation.status,
      safeReasonCode: compensation.safeFailureCode,
      requestId: compensation.requestId,
      traceId: compensation.traceId,
    })),
  ]
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
    .slice(0, RECOVERY_LIMITS.maximumTimelineEntries);
  return {
    orchestrationRunId: idOf(run),
    recoveryStatus: run.status,
    recoveryPolicy: run.recoveryPolicySnapshot
      ? {
          policyId: idOf(run.recoveryPolicyId),
          version: run.recoveryPolicyVersion,
          name: run.recoveryPolicySnapshot.name,
          defaultFailureStrategy: run.recoveryPolicySnapshot.defaultFailureStrategy,
          compensationOrdering: run.recoveryPolicySnapshot.compensationOrdering,
          automaticCompensation: run.recoveryPolicySnapshot.automaticCompensation === true,
        }
      : null,
    recoveryPolicySnapshotHash: run.recoveryPolicySnapshotHash || null,
    recoveryAttempt: run.recoveryAttempt || 0,
    maximumRecoveryAttempts: run.maximumRecoveryAttempts || 0,
    recoveryDeadlineAt: run.recoveryDeadlineAt || null,
    compensationDeadlineAt: run.compensationDeadlineAt || null,
    currentFailure: failedNode
      ? {
          nodeRunId: idOf(failedNode),
          nodeKey: failedNode.nodeKey,
          status: failedNode.status,
          category: failedNode.failureCategory || null,
          safeFailureCode: failedNode.safeFailure?.code || failedNode.lastSafeFailure?.code || null,
          safeFailureMessage: failedNode.safeFailure?.message || failedNode.lastSafeFailure?.message || null,
          recoverability: failedNode.recoverability,
        }
      : null,
    availableActions,
    compensationPlan: plan ? serializeCompensationPlan(plan) : null,
    compensationProgress,
    compensations: compensations.map(serializeCompensationRun),
    unresolvedSideEffects: run.unresolvedSideEffects || [],
    intervention: intervention ? serializeIntervention(intervention, availableActions) : null,
    checkpoints: checkpoints.map(serializeCheckpoint),
    timeline,
    incidentId: run.recoveryIncidentId || null,
    traceId: run.traceId,
    requestId: run.requestId,
  };
}

async function getCompensationPlan(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationCompensation.read', 'OrchestrationCompensationPlan', runId, scope, caller);
  const run = await scopedRun(runId, scope);
  if (!run.compensationPlanId) return null;
  const plan = await OrchestrationCompensationPlan.findOne({ _id: run.compensationPlanId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean();
  return plan ? serializeCompensationPlan(plan) : null;
}

async function listCompensations(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationCompensation.read', 'OrchestrationCompensationRun', runId, scope, caller);
  await scopedRun(runId, scope);
  const pagination = paging(input);
  const filter = { orchestrationRunId: runId, organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  const [items, total] = await Promise.all([
    OrchestrationCompensationRun.find(filter).sort({ compensationStepOrdinal: 1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    OrchestrationCompensationRun.countDocuments(filter),
  ]);
  return { items: items.map(serializeCompensationRun), pagination: { page: pagination.page, limit: pagination.limit, total } };
}

async function getCompensation(compensationRunId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationCompensation.read', 'OrchestrationCompensationRun', compensationRunId, scope, caller);
  if (!mongoose.isValidObjectId(compensationRunId)) throw new AppError(404, 'ORCHESTRATION_COMPENSATION_NOT_FOUND', 'Compensation run was not found.');
  const compensation = await OrchestrationCompensationRun.findOne({ _id: compensationRunId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean();
  if (!compensation) throw new AppError(404, 'ORCHESTRATION_COMPENSATION_NOT_FOUND', 'Compensation run was not found.');
  return serializeCompensationRun(compensation);
}

async function resumeRunRecovery(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestrationRecovery.resume', 'OrchestrationRun', runId, scope, caller, { proposedOperatorAction: 'resume' });
  await assertOperationalAccess({ ...scope, operation: 'LIFECYCLE_CONTROL' });
  if (input.checkpointId) return resumeCheckpoint(runId, input.checkpointId, input, caller);
  const run = await scopedRun(runId, scope, { privateFields: true });
  const policy = effectivePolicy(run);
  if (!policy.allowOperatorResume) throw new AppError(403, 'ORCHESTRATION_RECOVERY_POLICY_DENIED', 'Frozen recovery policy does not permit resume.');
  if (!['waiting_intervention', 'recovery_pending', 'recovering', 'recovered'].includes(run.status)) {
    throw new AppError(409, ErrorCodes.ORCHESTRATION_RUN_TRANSITION_INVALID, 'Run is not in a resumable recovery state.');
  }
  const nodes = await OrchestrationNodeRun.find({ orchestrationRunId: run._id }).select('+recoveryTargetSnapshot');
  await assertCheckpointAccessCurrent(run, nodes);
  const created = await createDecisionRecord({ run, type: 'resume', input, scope, previousState: run.status, requestedState: 'running', safeChangeSummary: { completedWorkPreserved: true } });
  if (created.replayed) return { decision: serializeRecoveryDecision(created.decision), runStatus: run.status, idempotencyReplayed: true };
  let currentRun = run;
  if (currentRun.status === 'waiting_intervention') currentRun = await transitionRunState(currentRun, 'recovery_pending', {});
  if (currentRun.status === 'recovery_pending') currentRun = await transitionRunState(currentRun, 'recovering', {});
  if (currentRun.status === 'recovering') currentRun = await transitionRunState(currentRun, 'running', { recoveredAt: new Date(), currentRecoveryDecisionId: created.decision._id });
  if (currentRun.status === 'recovered') currentRun = await transitionRunState(currentRun, 'running', { currentRecoveryDecisionId: created.decision._id });
  const applied = await markDecision(created.decision, 'applied', { resultingState: currentRun.status, appliedAt: new Date() });
  await audit('orchestration.recovery.completed', 'OrchestrationRun', currentRun, scope, { decisionId: idOf(applied), fromState: run.status, toState: currentRun.status, completedWorkPreserved: true });
  return { decision: serializeRecoveryDecision(applied), runStatus: currentRun.status, completedWorkDuplicated: false, idempotencyReplayed: false };
}

function automaticRecoveryDirective(runInput, nodeInput, definitionInput, error, options = {}) {
  const run = plain(runInput);
  const node = plain(nodeInput);
  const definition = plain(definitionInput);
  const policy = effectivePolicy(run);
  const enabled = Boolean(run.recoveryPolicySnapshot || run.definitionSnapshot?.recoveryPolicyId);
  if (!enabled) return { enabled: false, action: 'legacy', failureCategory: classifyRecoveryFailure(error) };
  const failureCategory = classifyRecoveryFailure(error);
  const strategy = definition.failureStrategy || run.definitionSnapshot?.failureStrategy || policy.defaultFailureStrategy || 'fail';
  const recoveryAttempt = Number(node.recoveryAttempt || 0);
  const maximumAttempts = Number(node.maximumRecoveryAttempts || run.maximumRecoveryAttempts || policy.maximumRecoveryAttempts || 0);
  const deadlineExpired = Boolean(run.recoveryDeadlineAt && new Date(run.recoveryDeadlineAt) <= new Date(options.now || Date.now()));
  const idempotencySafe =
    definition.policyContext?.idempotencySafe !== false &&
    !(failureCategory === 'outcome_unknown' && definition.policyContext?.providerIdempotencySupported !== true);
  if (failureCategory === 'outcome_unknown') {
    return { enabled: true, action: 'intervention', reasonCode: 'OUTCOME_UNKNOWN', failureCategory, strategy, idempotencySafe: false };
  }
  if (
    strategy === 'retry' &&
    automaticRetryEligible({
      policy,
      failureCategory,
      attempt: recoveryAttempt,
      maximumAttempts,
      deadlineExpired,
      idempotencySafe,
      error,
    })
  ) {
    return {
      enabled: true,
      action: 'retry',
      reasonCode: 'AUTOMATIC_RETRY_ELIGIBLE',
      failureCategory,
      strategy,
      nextRecoveryAttempt: recoveryAttempt + 1,
      delayMs: recoveryBackoff(policy.recoveryBackoffPolicy, recoveryAttempt + 1, options.random || Math.random),
    };
  }
  if (
    ['compensate_then_fail', 'compensate_then_pause', 'compensate_then_cancel'].includes(strategy) ||
    (policy.automaticCompensation === true && compensationEligible(node, definition).completedSideEffect)
  ) {
    return { enabled: true, action: 'compensate', reasonCode: 'AUTOMATIC_COMPENSATION_REQUIRED', failureCategory, strategy };
  }
  if (
    ['pause', 'request_intervention'].includes(strategy) ||
    definition.interventionRequirement?.required === true ||
    deadlineExpired
  ) {
    return { enabled: true, action: 'intervention', reasonCode: deadlineExpired ? 'RECOVERY_DEADLINE_EXPIRED' : 'RECOVERY_INTERVENTION_REQUIRED', failureCategory, strategy };
  }
  return { enabled: true, action: 'fail', reasonCode: 'RECOVERY_NOT_PERMITTED', failureCategory, strategy };
}

async function recordAutomaticRetry(runInput, nodeInput, directive, failure) {
  const run = await scopedRun(idOf(runInput), systemScope(runInput), { privateFields: true });
  const node = await scopedNode(run._id, idOf(nodeInput), systemScope(runInput), { privateFields: true });
  const scope = systemScope({ organizationId: run.organizationId, workspaceId: run.workspaceId, requestId: node.requestId, traceId: node.traceId });
  const created = await createDecisionRecord({
    run,
    node,
    type: 'automatic_retry',
    input: { idempotencyKey: `automatic-retry:${idOf(run)}:${idOf(node)}:${directive.nextRecoveryAttempt}`, safeReasonCode: directive.reasonCode },
    scope,
    previousState: 'running',
    requestedState: 'retry_wait',
    safeChangeSummary: { failureCategory: directive.failureCategory, recoveryAttempt: directive.nextRecoveryAttempt, delayMs: directive.delayMs },
  });
  let decision = created.decision;
  if (!created.replayed && decision.decisionStatus === 'pending') {
    decision = await markDecision(decision, 'applied', { resultingState: 'retry_wait', appliedAt: new Date() });
  }
  await OrchestrationNodeRun.updateOne(
    { _id: node._id, status: 'retry_wait' },
    { $set: { recoveryDecisionId: decision._id, failureCategory: directive.failureCategory, recoveryAttempt: directive.nextRecoveryAttempt, lastSafeFailure: failure } },
  );
  await OrchestrationRun.updateOne(
    { _id: run._id },
    { $set: { currentRecoveryDecisionId: decision._id }, $inc: { recoveryAttempt: created.replayed ? 0 : 1 } },
  );
  metrics.increment('orchestration_recovery_automatic_retries', { category: directive.failureCategory });
  await audit('orchestration.recovery.started', 'OrchestrationRecoveryDecision', decision, scope, { orchestrationRunId: idOf(run), nodeRunId: idOf(node), action: 'automatic_retry', failureCategory: directive.failureCategory, recoveryAttempt: directive.nextRecoveryAttempt });
  await createCheckpointForRun(run._id, `automatic-retry-${idOf(node)}-${directive.nextRecoveryAttempt}`, scope, { createdBy: scope.actorId });
  return decision;
}

async function pauseForAutomaticIntervention(runInput, nodeInput, directive, failure) {
  let run = await scopedRun(idOf(runInput), systemScope(runInput), { privateFields: true });
  const node = await scopedNode(run._id, idOf(nodeInput), systemScope(runInput), { privateFields: true });
  const scope = systemScope({ organizationId: run.organizationId, workspaceId: run.workspaceId, requestId: node.requestId, traceId: node.traceId });
  if (run.status !== 'waiting_intervention') {
    run = await transitionRunState(run, 'waiting_intervention', {
      failureSummary: {
        code: safeCode(failure.code),
        message: String(failure.message || 'Recovery requires intervention.').slice(0, 500),
        category: directive.failureCategory,
        requestId: node.requestId,
        traceId: node.traceId,
        occurredAt: new Date(),
      },
    });
  }
  const allowedActions = directive.failureCategory === 'outcome_unknown'
    ? ['compensate', 'terminate', 'inspect_failure']
    : nodeDefinition(run, node)?.interventionRequirement?.allowedActions?.length
      ? nodeDefinition(run, node).interventionRequirement.allowedActions
      : ['retry', 'skip', 'correct_input', 'replace_agent', 'compensate', 'terminate', 'inspect_failure'];
  const intervention = await createIntervention({
    run,
    node,
    type: 'inspect_failure',
    allowedActions,
    safeFailureCode: failure.code,
    failureCategory: directive.failureCategory,
    scope,
    title: directive.failureCategory === 'outcome_unknown' ? 'External outcome is unknown' : 'Node recovery requires intervention',
    summary: directive.failureCategory === 'outcome_unknown' ? 'Ghost Bridge cannot safely determine whether the external side effect completed. Automatic replay is blocked.' : 'Automatic recovery cannot proceed without an authorized human decision.',
  });
  await OrchestrationNodeRun.updateOne({ _id: node._id }, { $set: { interventionRequestId: intervention._id, failureCategory: directive.failureCategory, lastSafeFailure: failure } });
  if (directive.reasonCode === 'RECOVERY_DEADLINE_EXPIRED' || directive.failureCategory === 'outcome_unknown') {
    await linkRecoveryIncident(run, scope, directive.reasonCode, { title: directive.failureCategory === 'outcome_unknown' ? 'Unknown external orchestration outcome' : 'Orchestration recovery deadline expired', safeDescription: 'Automatic replay was stopped and durable human intervention was requested.', invocationIds: [node.invocationId].filter(Boolean) });
  }
  metrics.increment('orchestration_recovery_unknown_outcomes', { category: directive.failureCategory === 'outcome_unknown' ? 'outcome_unknown' : 'known' });
  await createCheckpointForRun(run._id, `intervention-${idOf(intervention)}`, scope, { createdBy: scope.actorId });
  return intervention;
}

async function startAutomaticCompensation(runInput, nodeInput, directive) {
  const run = await scopedRun(idOf(runInput), systemScope(runInput), { privateFields: true });
  const node = await scopedNode(run._id, idOf(nodeInput), systemScope(runInput), { privateFields: true });
  const scope = systemScope({ organizationId: run.organizationId, workspaceId: run.workspaceId, requestId: node.requestId, traceId: node.traceId });
  const created = await createDecisionRecord({
    run,
    node,
    type: 'compensate',
    input: { idempotencyKey: `automatic-compensation:${idOf(run)}:${idOf(node)}:${node.recoveryAttempt || 0}`, safeReasonCode: directive.reasonCode },
    scope,
    previousState: node.status,
    requestedState: 'compensation_pending',
    safeChangeSummary: { automatic: true, failureCategory: directive.failureCategory },
  });
  if (created.replayed) return created.decision;
  const result = await createCompensationPlanForRun(run, node, { idempotencyKey: `automatic-compensation-plan:${idOf(run)}:${idOf(node)}`, safeReasonCode: directive.reasonCode }, scope, { createdBy: scope.actorId, recoveryDecisionId: created.decision._id });
  const decision = await markDecision(created.decision, 'applied', { resultingState: result.run.status, appliedAt: new Date() });
  await OrchestrationRun.updateOne({ _id: run._id }, { $set: { currentRecoveryDecisionId: decision._id } });
  return decision;
}

async function expireRecoveryWork(options = {}) {
  const now = options.now || new Date();
  const limit = Math.max(1, Math.min(Number(options.limit || 100), 500));
  const interventions = await OrchestrationInterventionRequest.find({ status: { $in: ['pending', 'approval_required'] }, expiresAt: { $lte: now } }).sort({ expiresAt: 1 }).limit(limit);
  let expiredInterventions = 0;
  for (const intervention of interventions) {
    const changed = await OrchestrationInterventionRequest.findOneAndUpdate(
      { _id: intervention._id, status: intervention.status, expiresAt: { $lte: now } },
      { $set: { status: 'expired', expiredAt: now } },
      { new: true },
    );
    if (!changed) continue;
    expiredInterventions += 1;
    const scope = systemScope(changed);
    const run = await scopedRun(changed.orchestrationRunId, scope, { privateFields: true });
    await linkRecoveryIncident(run, scope, 'INTERVENTION_EXPIRED', { title: 'Orchestration intervention expired', safeDescription: 'A durable intervention expired without an approved resolution.' });
    await audit('orchestration.intervention.expired', 'OrchestrationInterventionRequest', changed, scope, { orchestrationRunId: idOf(run), interventionType: changed.interventionType });
  }
  const deadlineRuns = await OrchestrationRun.find({
    status: { $in: ['recovery_pending', 'recovering', 'waiting_intervention'] },
    recoveryDeadlineAt: { $lte: now },
  }).sort({ recoveryDeadlineAt: 1 }).limit(limit).select('+definitionSnapshot +recoveryPolicySnapshot');
  let expiredRuns = 0;
  for (let run of deadlineRuns) {
    if (run.status !== 'waiting_intervention') run = await transitionRunState(run, 'waiting_intervention', {});
    const scope = systemScope(run);
    const node = await OrchestrationNodeRun.findOne({ orchestrationRunId: run._id, status: { $in: ['failed', 'waiting_intervention', 'recovery_pending', 'recovering'] } });
    await createIntervention({ run, node, type: 'inspect_failure', allowedActions: ['compensate', 'terminate', 'inspect_failure'], safeFailureCode: 'RECOVERY_DEADLINE_EXPIRED', failureCategory: 'timeout', scope, title: 'Recovery deadline expired', summary: 'Automatic recovery reached its durable deadline and was paused.' });
    await linkRecoveryIncident(run, scope, 'RECOVERY_DEADLINE_EXPIRED', { title: 'Orchestration recovery deadline expired', safeDescription: 'The recovery process reached its configured durable deadline.' });
    expiredRuns += 1;
  }
  return { expiredInterventions, expiredRuns };
}

function translateCompensationMapping(mapping = {}) {
  return Object.fromEntries(
    Object.entries(mapping).map(([target, descriptor]) => {
      if (typeof descriptor !== 'string') return [target, descriptor];
      if (descriptor.startsWith('$original.')) return [target, descriptor.replace('$original.', '$source.')];
      if (descriptor.startsWith('$invocation.')) return [target, descriptor.replace('$invocation.', '$metadata.invocation.')];
      if (descriptor.startsWith('$orchestration.')) return [target, descriptor.replace('$orchestration.', '$metadata.orchestration.')];
      if (descriptor.startsWith('$compensations.')) return [target, descriptor.replace('$compensations.', '$dependency.compensations.')];
      return [target, descriptor];
    }),
  );
}

async function priorCompensationOutputs(run, compensation, definition) {
  const dependencies = definition.compensationDefinition?.dependencies || [];
  if (!dependencies.length) return {};
  const plan = await OrchestrationCompensationPlan.findById(compensation.compensationPlanId).lean();
  if (!plan) return {};
  const requested = new Set(dependencies.map(String));
  const steps = (plan.orderedSteps || []).filter((step) => requested.has(step.nodeKey));
  const runs = await OrchestrationCompensationRun.find({
    compensationPlanId: plan._id,
    originalNodeRunId: { $in: steps.map((step) => step.originalNodeRunId) },
    status: 'succeeded',
  }).lean();
  const invocations = await Invocation.find({ _id: { $in: runs.map((item) => item.invocationId).filter(Boolean) } }).select('output').lean();
  const outputByInvocation = new Map(invocations.map((item) => [idOf(item), item.output]));
  const stepByNodeRun = new Map(steps.map((step) => [idOf(step.originalNodeRunId), step]));
  const result = {};
  for (const item of runs) {
    const step = stepByNodeRun.get(idOf(item.originalNodeRunId));
    const output = outputByInvocation.get(idOf(item.invocationId));
    if (step && output !== undefined) result[step.nodeKey] = { output };
  }
  return result;
}

async function compensationExecutionContext(compensation) {
  const PassportConnection = require('../models/PassportConnection');
  const AgentPassport = require('../models/AgentPassport');
  const Capability = require('../models/Capability');
  const [connection, passport, capability, catalog] = await Promise.all([
    PassportConnection.findOne({
      _id: compensation.compensationConnectionId,
      receivingWorkspaceId: compensation.workspaceId,
      status: 'connected',
      installScope: 'invoke',
      $or: [{ organizationId: compensation.organizationId }, { partnerId: compensation.organizationId }],
    }).lean(),
    AgentPassport.findOne({ _id: compensation.compensationPassportId, status: 'valid' }).lean(),
    Capability.findOne({ passportId: compensation.compensationPassportId, name: compensation.compensationCapability, enabled: true }).lean(),
    CapabilityCatalogEntry.findOne({
      organizationId: compensation.organizationId,
      workspaceId: compensation.workspaceId,
      passportId: compensation.compensationPassportId,
      connectionId: compensation.compensationConnectionId,
      availabilityStatus: 'available',
      lifecycleStatus: 'valid',
      connectionStatus: 'connected',
    }).lean(),
  ]);
  if (!connection) throw new AppError(409, 'ORCHESTRATION_COMPENSATION_CONNECTION_REVOKED', 'Compensation connection is unavailable.');
  if (!passport || idOf(connection.passportId) !== idOf(passport)) throw new AppError(409, 'ORCHESTRATION_COMPENSATION_PASSPORT_REVOKED', 'Compensation passport is unavailable.');
  if (String(passport.agent?.version || '') !== String(compensation.compensationPassportVersion || '')) throw new AppError(409, 'ORCHESTRATION_COMPENSATION_PASSPORT_REVOKED', 'Compensation passport version changed.');
  const declaredOperation = capability?.runtimeToolName || capability?.name;
  if (!capability || ![capability.name, declaredOperation].includes(compensation.compensationOperation)) throw new AppError(409, 'ORCHESTRATION_COMPENSATION_CAPABILITY_REVOKED', 'Compensation capability or operation is unavailable.');
  if (!catalog) throw new AppError(409, 'ORCHESTRATION_COMPENSATION_TARGET_UNAVAILABLE', 'Compensation target is unavailable in the governed catalog.');
  return { connection, passport, capability, catalog };
}

async function prepareCompensationInput(run, node, compensation, definition, execution) {
  const compensationDefinition = compensation.compensationDefinitionSnapshot;
  const prior = await priorCompensationOutputs(run, compensation, definition);
  const mapping = translateCompensationMapping(compensationDefinition.inputMapping || {});
  const mapped = applyMapping(
    mapping,
    {
      source: { input: node.resolvedInput || {}, output: node.validatedOutput || {} },
      runInput: run.input || {},
      metadata: {
        invocation: {
          requestId: node.requestId,
          traceId: node.traceId,
          invocationId: idOf(node.invocationId) || undefined,
          attempt: node.attempt,
          completedAt: node.completedAt,
          safeResultCode: node.safeFailure?.code,
        },
        orchestration: {
          runId: idOf(run),
          definitionId: idOf(run.definitionId),
          definitionVersion: run.definitionVersion,
          nodeKey: node.nodeKey,
          workspaceId: run.workspaceId,
        },
      },
      dependency: { compensations: prior },
    },
    { maximumPayloadBytes: RECOVERY_LIMITS.maximumCorrectedInputBytes },
  );
  if (compensationDefinition.dataContractId) {
    return { mapped, input: undefined, dataContract: true };
  }
  const syntheticContract = {
    allowedDataClassifications: [compensation.inputClassification],
    maximumDataClassification: compensation.inputClassification,
    allowedRegions: definition.policyContext?.allowedRegions || [],
    residencyRequirements: definition.policyContext?.residencyRequirements || [],
  };
  assertClassificationAllowed(compensation.inputClassification, syntheticContract, execution.catalog);
  assertRegionResidency(syntheticContract, execution.catalog, {
    residencyRequirements: definition.policyContext?.residencyRequirements,
  });
  const minimized = applyMinimization(mapped, compensationDefinition.inputSchema, [], {
    maximumPayloadBytes: RECOVERY_LIMITS.maximumCorrectedInputBytes,
  }).payload;
  const input = validateAgainstSchema(compensationDefinition.inputSchema, minimized, {
    path: '$compensation.input',
    code: 'ORCHESTRATION_COMPENSATION_INPUT_INVALID',
    message: 'Compensation input does not match its frozen schema.',
  });
  return { mapped, input: safeClone(input), dataContract: false };
}

function compensationRemoteKey(compensation) {
  return compensationIdempotencyKey({
    orchestrationRunId: idOf(compensation.orchestrationRunId),
    originalNodeRunId: idOf(compensation.originalNodeRunId),
    compensationDefinitionVersion: compensation.compensationDefinitionVersion,
    compensationPlanId: idOf(compensation.compensationPlanId),
    compensationStepOrdinal: compensation.compensationStepOrdinal,
    logicalCompensationAttempt: compensation.logicalCompensationAttempt,
  });
}

async function recoverExpiredCompensationLeases(options = {}) {
  const now = options.now || new Date();
  const limit = Math.max(1, Math.min(Number(options.limit || 100), 500));
  const expired = await OrchestrationCompensationRun.find({ status: 'running', leaseExpiresAt: { $lte: now } })
    .select('+compensationDefinitionSnapshot +leaseTokenHash')
    .sort({ leaseExpiresAt: 1 })
    .limit(limit);
  let requeued = 0;
  let uncertain = 0;
  for (const compensation of expired) {
    const nonIdempotent = compensation.compensationDefinitionSnapshot?.expectedIdempotencyBehavior === 'non_idempotent';
    const unknown = nonIdempotent && Boolean(compensation.invocationId);
    const nextStatus = unknown ? 'waiting_intervention' : 'retry_wait';
    assertRecoveryTransition(COMPENSATION_RUN_TRANSITIONS, compensation.status, nextStatus, 'ORCHESTRATION_COMPENSATION_TRANSITION_INVALID');
    const changed = await OrchestrationCompensationRun.findOneAndUpdate(
      { _id: compensation._id, status: 'running', leaseExpiresAt: { $lte: now } },
      {
        $set: {
          status: nextStatus,
          ...(unknown
            ? { outcomeUnknown: true, safeFailureCode: 'OUTCOME_UNKNOWN', safeFailureMessage: 'Compensation lease expired after possible external execution.', safeFailureCategory: 'outcome_unknown', retryability: false }
            : { nextAttemptAt: now, safeFailureCode: 'COMPENSATION_LEASE_EXPIRED', safeFailureMessage: 'Expired compensation lease was recovered.', retryability: true }),
        },
        $unset: { leaseOwner: 1, leaseTokenHash: 1, leaseExpiresAt: 1, heartbeatAt: 1 },
      },
      { new: true },
    );
    if (!changed) continue;
    if (unknown) {
      uncertain += 1;
      const run = await OrchestrationRun.findById(changed.orchestrationRunId).select('+definitionSnapshot +recoveryPolicySnapshot');
      const node = await OrchestrationNodeRun.findById(changed.originalNodeRunId);
      const scope = systemScope(changed);
      const intervention = await createIntervention({ run, node, compensationRun: changed, type: 'inspect_failure', allowedActions: ['compensate', 'waive_compensation', 'terminate'], safeFailureCode: 'OUTCOME_UNKNOWN', failureCategory: 'outcome_unknown', scope, title: 'Compensation outcome is unknown', summary: 'A worker lease expired after possible non-idempotent compensation. Automatic replay is blocked.' });
      await OrchestrationCompensationRun.updateOne({ _id: changed._id }, { $set: { interventionRequestId: intervention._id } });
      await linkRecoveryIncident(run, scope, 'OUTCOME_UNKNOWN', { title: 'Unknown compensation outcome', safeDescription: 'A non-idempotent compensation may have completed before its worker lease expired.', invocationIds: [changed.invocationId].filter(Boolean) });
    } else requeued += 1;
  }
  if (requeued) metrics.increment('orchestration_recovery_expired_leases', { outcome: 'requeued' }, requeued);
  if (uncertain) metrics.increment('orchestration_recovery_expired_leases', { outcome: 'intervention' }, uncertain);
  return { scanned: expired.length, requeued, uncertain };
}

async function claimNextCompensation(options = {}) {
  const now = options.now || new Date();
  const workerId = String(options.workerId || `orchestration-recovery-worker:${crypto.randomUUID()}`);
  const leaseMs = Math.max(1_000, Math.min(Number(options.leaseMs || 120_000), RECOVERY_LIMITS.maximumLeaseMs));
  const candidates = await OrchestrationCompensationRun.find({
    status: { $in: ['queued', 'retry_wait'] },
    deadlineAt: { $gt: now },
    $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: now } }],
  }).sort({ nextAttemptAt: 1, createdAt: 1, _id: 1 }).limit(50);
  for (const candidate of candidates) {
    const plan = await OrchestrationCompensationPlan.findOne({ _id: candidate.compensationPlanId, status: 'active' }).lean();
    if (!plan) continue;
    const activeCount = await OrchestrationCompensationRun.countDocuments({ compensationPlanId: plan._id, status: 'running' });
    if (activeCount >= Number(plan.maximumParallelCompensations || 1)) continue;
    const step = (plan.orderedSteps || []).find((item) => Number(item.order) === Number(candidate.compensationStepOrdinal));
    const dependencySteps = (plan.orderedSteps || []).filter((item) => (step?.dependencyStepKeys || []).includes(item.stepKey));
    if (dependencySteps.length) {
      const dependencies = await OrchestrationCompensationRun.find({ compensationPlanId: plan._id, originalNodeRunId: { $in: dependencySteps.map((item) => item.originalNodeRunId) } }).select('status').lean();
      if (dependencies.length !== dependencySteps.length || dependencies.some((item) => !['succeeded', 'waived'].includes(item.status))) continue;
    }
    const leaseToken = crypto.randomUUID();
    const filter = { _id: candidate._id, status: candidate.status, deadlineAt: { $gt: now } };
    if (candidate.status === 'retry_wait') filter.nextAttemptAt = { $lte: now };
    const claimed = await OrchestrationCompensationRun.findOneAndUpdate(
      filter,
      {
        $set: { status: 'running', leaseOwner: workerId, leaseTokenHash: secureDigest('orchestration-compensation-lease', leaseToken), leaseExpiresAt: new Date(now.getTime() + leaseMs), heartbeatAt: now, startedAt: candidate.startedAt || now },
        $inc: { attempt: 1 },
        $unset: { nextAttemptAt: 1 },
      },
      { new: true, runValidators: true },
    ).select('+compensationDefinitionSnapshot +leaseTokenHash');
    if (!claimed) {
      metrics.increment('orchestration_recovery_claim_conflicts', { reason: 'compensation_claim' });
      continue;
    }
    const run = await OrchestrationRun.findById(claimed.orchestrationRunId).select('+input +definitionSnapshot +recoveryPolicySnapshot');
    if (!run || TERMINAL_RUN_STATUSES.includes(run.status)) {
      await OrchestrationCompensationRun.updateOne({ _id: claimed._id, status: 'running' }, { $set: { status: 'terminated', completedAt: now }, $unset: { leaseOwner: 1, leaseTokenHash: 1, leaseExpiresAt: 1, heartbeatAt: 1 } });
      continue;
    }
    let currentRun = run;
    if (currentRun.status === 'compensation_pending') currentRun = await transitionRunState(currentRun, 'compensating', {});
    const node = await OrchestrationNodeRun.findById(claimed.originalNodeRunId).select('+resolvedInput +validatedOutput +recoveryTargetSnapshot');
    if (node?.status === 'compensation_pending') await transitionNodeState(node, 'compensating', { compensationStatus: 'running', compensationAttempt: claimed.attempt });
    return { compensation: claimed, run: currentRun, node, plan, workerId, leaseToken };
  }
  return null;
}

async function renewCompensationLease(claim, options = {}) {
  const now = options.now || new Date();
  const leaseMs = Math.max(1_000, Math.min(Number(options.leaseMs || 120_000), RECOVERY_LIMITS.maximumLeaseMs));
  const tokenHash = secureDigest('orchestration-compensation-lease', claim.leaseToken);
  const updated = await OrchestrationCompensationRun.findOneAndUpdate(
    { _id: claim.compensation._id, status: 'running', leaseOwner: claim.workerId, leaseTokenHash: tokenHash, leaseExpiresAt: { $gt: now } },
    { $set: { heartbeatAt: now, leaseExpiresAt: new Date(now.getTime() + leaseMs) } },
    { new: true },
  ).select('+compensationDefinitionSnapshot +leaseTokenHash');
  if (!updated) throw new AppError(409, 'ORCHESTRATION_COMPENSATION_LEASE_LOST', 'Compensation worker lease was lost.');
  claim.compensation = updated;
  return updated;
}

async function transitionClaimedCompensation(claim, toState, update = {}) {
  const tokenHash = secureDigest('orchestration-compensation-lease', claim.leaseToken);
  assertRecoveryTransition(COMPENSATION_RUN_TRANSITIONS, claim.compensation.status, toState, 'ORCHESTRATION_COMPENSATION_TRANSITION_INVALID');
  const changed = await OrchestrationCompensationRun.findOneAndUpdate(
    { _id: claim.compensation._id, status: claim.compensation.status, leaseOwner: claim.workerId, leaseTokenHash: tokenHash },
    { $set: { status: toState, ...update }, $unset: { leaseOwner: 1, leaseTokenHash: 1, leaseExpiresAt: 1, heartbeatAt: 1, ...(toState !== 'retry_wait' ? { nextAttemptAt: 1 } : {}) } },
    { new: true, runValidators: true },
  ).select('+compensationDefinitionSnapshot');
  if (!changed) throw new AppError(409, 'ORCHESTRATION_COMPENSATION_LEASE_LOST', 'Compensation worker lease was lost.');
  return changed;
}

async function ensureCompensationGrant(run, node, compensation, definition, scope) {
  if (!compensation.dataContractId) return null;
  if (compensation.delegationGrantId) {
    const existing = await InterAgentDelegationGrant.findOne({
      _id: compensation.delegationGrantId,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      status: { $in: ['active', 'pending', 'exhausted', 'completed'] },
    });
    if (existing) return existing;
  }
  const contract = await InterAgentDataContract.findOne({
    _id: compensation.dataContractId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    version: compensation.dataContractVersion,
    status: 'active',
  }).lean();
  if (!contract) throw new AppError(409, 'DATA_CONTRACT_INACTIVE', 'Compensation data contract is unavailable.');
  const grant = await createGrantRecord(
    {
      workspaceId: scope.workspaceId,
      contractId: contract._id,
      contractVersion: contract.version,
      orchestrationDefinitionId: run.definitionId,
      orchestrationRunId: run._id,
      sourceNodeRunId: node._id,
      sourcePassportId: node.passportId,
      sourcePassportVersion: node.passportVersion,
      sourceConnectionId: node.connectionId,
      targetPassportId: compensation.compensationPassportId,
      targetPassportVersion: compensation.compensationPassportVersion,
      targetConnectionId: compensation.compensationConnectionId,
      targetSelectionPolicyId: definition.compensationDefinition?.selectionPolicyId,
      invocationLimit: 1,
      expiresAt: compensation.deadlineAt,
      traceId: compensation.traceId,
      requestId: compensation.requestId,
    },
    scope,
    {},
  );
  await OrchestrationCompensationRun.updateOne({ _id: compensation._id }, { $set: { delegationGrantId: grant._id, ...(grant.approvalRequestId ? { approvalRequestId: grant.approvalRequestId } : {}) } });
  return grant;
}

function validateCompensationSuccess(output, criteria = {}) {
  if (!criteria || !Object.keys(criteria).length) return true;
  if (criteria.requiredBooleanField) {
    const field = String(criteria.requiredBooleanField);
    if (output?.[field] !== true) throw new AppError(409, 'ORCHESTRATION_COMPENSATION_CRITERIA_FAILED', 'Compensation success criteria were not satisfied.');
  }
  if (criteria.statusEquals !== undefined && output?.status !== criteria.statusEquals) {
    throw new AppError(409, 'ORCHESTRATION_COMPENSATION_CRITERIA_FAILED', 'Compensation success criteria were not satisfied.');
  }
  return true;
}

async function reconcileCompensationPlan(planId, options = {}) {
  const plan = await OrchestrationCompensationPlan.findById(planId);
  if (!plan || !['active', 'paused'].includes(plan.status)) return plan;
  const compensationRuns = await OrchestrationCompensationRun.find({ compensationPlanId: plan._id });
  const succeeded = compensationRuns.filter((item) => item.status === 'succeeded').length;
  const failed = compensationRuns.filter((item) => item.status === 'failed').length;
  const waived = compensationRuns.filter((item) => item.status === 'waived').length;
  const active = compensationRuns.filter((item) => ['pending', 'queued', 'running', 'retry_wait', 'waiting_approval', 'waiting_intervention'].includes(item.status)).length;
  plan.completedStepCount = succeeded;
  plan.failedStepCount = failed;
  plan.skippedStepCount = Number(plan.skippedStepCount || 0) + waived;
  if (active) {
    await plan.save();
    return plan;
  }
  const run = await OrchestrationRun.findById(plan.orchestrationRunId).select('+definitionSnapshot +recoveryPolicySnapshot');
  if (!run) return plan;
  const scope = systemScope(run);
  const unresolved = (run.unresolvedSideEffects || []).length + waived;
  let planStatus;
  if (failed && !plan.continueAfterFailure) planStatus = 'failed';
  else if (failed || unresolved || waived) planStatus = 'partial';
  else planStatus = 'succeeded';
  assertRecoveryTransition(COMPENSATION_PLAN_TRANSITIONS, plan.status, planStatus, 'ORCHESTRATION_COMPENSATION_PLAN_TRANSITION_INVALID');
  plan.status = planStatus;
  plan.completedAt = new Date();
  await plan.save();
  let currentRun = run;
  if (planStatus === 'succeeded') {
    const strategy = run.definitionSnapshot?.failureStrategy || effectivePolicy(run).defaultFailureStrategy;
    const target = run.cancelRequestedAt || strategy === 'compensate_then_cancel'
      ? 'cancelled'
      : strategy === 'compensate_then_pause'
        ? 'waiting_intervention'
        : 'failed';
    if (target === 'waiting_intervention') {
      currentRun = await transitionRunState(currentRun, 'waiting_intervention', {});
      await createIntervention({ run: currentRun, type: 'inspect_failure', allowedActions: ['resume', 'terminate'], safeFailureCode: 'COMPENSATION_COMPLETED_REVIEW_REQUIRED', failureCategory: plan.triggerFailureCategory, scope, title: 'Compensation completed', summary: 'Declared compensating actions succeeded and the run is paused for an explicit disposition.' });
    } else {
      currentRun = await transitionRunState(currentRun, target, { completedAt: new Date(), ...(target === 'cancelled' ? { cancelledAt: new Date() } : {}) });
    }
  } else if (planStatus === 'failed') {
    currentRun = await transitionRunState(currentRun, 'compensation_failed', {});
    currentRun = await transitionRunState(currentRun, 'waiting_intervention', {});
    await createIntervention({ run: currentRun, type: 'inspect_failure', allowedActions: ['compensate', 'waive_compensation', 'terminate'], safeFailureCode: 'COMPENSATION_FAILED', failureCategory: 'unknown_safe_failure', scope, title: 'Compensation failed', summary: 'One or more declared compensating actions failed and require intervention.' });
    await linkRecoveryIncident(currentRun, scope, 'COMPENSATION_FAILED', { title: 'Orchestration compensation failed', safeDescription: 'Declared compensating actions exhausted their bounded attempts.' });
  } else {
    currentRun = await transitionRunState(currentRun, 'waiting_intervention', {});
    await createIntervention({ run: currentRun, type: 'inspect_failure', allowedActions: ['waive_compensation', 'terminate'], safeFailureCode: 'COMPENSATION_PARTIAL', failureCategory: 'non_reversible_failure', scope, title: 'Compensation is partial', summary: 'Compensation completed with unresolved, failed, or waived side effects.' });
  }
  metrics.increment('orchestration_compensation_plans_completed', { outcome: planStatus });
  await audit(planStatus === 'succeeded' ? 'orchestration.recovery.completed' : 'orchestration.recovery.failed', 'OrchestrationCompensationPlan', plan, scope, { orchestrationRunId: idOf(run), planStatus, succeeded, failed, waived, unresolvedSideEffectCount: unresolved });
  await createCheckpointForRun(run._id, `compensation-plan-${idOf(plan)}-${planStatus}`, scope, { createdBy: scope.actorId });
  return plan;
}

async function processCompensationClaim(claim, options = {}) {
  let { compensation, run, node } = claim;
  const definition = nodeDefinition(run, node);
  if (!definition?.compensationDefinition) throw new AppError(409, 'ORCHESTRATION_COMPENSATION_DEFINITION_MISSING', 'Frozen compensation definition is unavailable.');
  const scope = systemScope({ organizationId: run.organizationId, workspaceId: run.workspaceId, requestId: compensation.requestId, traceId: compensation.traceId });
  const heartbeatMs = Math.max(1_000, Number(options.heartbeatMs || 30_000));
  const leaseMs = Number(options.leaseMs || 120_000);
  let heartbeatError;
  const heartbeat = setInterval(() => {
    renewCompensationLease(claim, { leaseMs }).catch((error) => {
      heartbeatError = error;
    });
  }, heartbeatMs);
  try {
    const execution = await compensationExecutionContext(compensation);
    await authorize('orchestrationNode.compensate', 'OrchestrationCompensationRun', compensation, scope, {}, {
      trustedConnection: execution.connection,
      trustedPassport: execution.passport,
      trustedCapability: execution.capability,
      proposedOperatorAction: 'compensate',
      classification: compensation.inputClassification,
      compensationAttemptCount: compensation.attempt,
    });
    await assertOperationalAccess({ ...scope, connectionId: compensation.compensationConnectionId, operation: 'EXECUTION', existingClaim: true });
    const prepared = await prepareCompensationInput(run, node, compensation, definition, execution);
    const inputForHash = prepared.input || prepared.mapped;
    await OrchestrationCompensationRun.updateOne(
      { _id: compensation._id, status: 'running', leaseOwner: claim.workerId },
      { $set: { inputPayloadHash: stableHash(inputForHash, 'compensation-input'), approximateInputBytes: approximateBytes(inputForHash) } },
    );
    const remoteKey = compensationRemoteKey(compensation);
    const context = {
      orchestrationRunId: idOf(run),
      originalNodeRunId: idOf(node),
      compensationPlanId: idOf(compensation.compensationPlanId),
      compensationRunId: idOf(compensation),
      recoveryDecisionId: idOf(compensation.recoveryDecisionId) || undefined,
      compensationStepOrdinal: compensation.compensationStepOrdinal,
      logicalCompensationAttempt: compensation.logicalCompensationAttempt,
      expectedIdempotencyBehavior: compensation.compensationDefinitionSnapshot.expectedIdempotencyBehavior,
      inputClassification: compensation.inputClassification,
      traceId: compensation.traceId,
      parentTraceId: compensation.parentTraceId,
      requestId: compensation.requestId,
    };
    let invocation;
    if (prepared.dataContract) {
      const grant = await ensureCompensationGrant(run, node, compensation, definition, scope);
      if (grant.status === 'pending') {
        const waiting = await transitionClaimedCompensation(claim, 'waiting_approval', { approvalRequestId: grant.approvalRequestId });
        await OrchestrationNodeRun.updateOne({ _id: node._id, status: 'compensating' }, { $set: { status: 'compensation_pending', compensationStatus: 'pending' } });
        return waiting;
      }
      invocation = await executeDelegatedInvocation({
        organizationId: run.organizationId,
        partnerId: run.organizationId,
        workspaceId: run.workspaceId,
        grantId: grant._id,
        sourceNodeRunId: node._id,
        sourceOutput: prepared.mapped,
        runInput: run.input,
        metadata: { runId: idOf(run), nodeKey: node.nodeKey, compensationRunId: idOf(compensation) },
        dataClassification: compensation.inputClassification,
        residencyRequirements: definition.policyContext?.residencyRequirements,
        idempotencyKey: remoteKey,
        requestedBy: run.requestedBy,
        requestId: compensation.requestId,
        traceId: compensation.traceId,
        parentTraceId: compensation.parentTraceId,
        outputSchema: compensation.compensationDefinitionSnapshot.outputSchema,
        retry: compensation.attempt > 1,
        compensationContext: context,
        onInvocationCreated: async (invocationId) => {
          await OrchestrationCompensationRun.updateOne({ _id: compensation._id, status: 'running', leaseOwner: claim.workerId }, { $set: { invocationId } });
        },
      });
    } else {
      let processedOutput;
      invocation = await invokeThroughRuntimeGateway(
        idOf(compensation.compensationConnectionId),
        compensation.compensationCapability,
        prepared.input,
        {
          actorType: 'service_account',
          actorId: run.requestedBy,
          type: 'service_account',
          id: run.requestedBy,
          partnerId: run.organizationId,
          organizationId: run.organizationId,
          workspaceId: run.workspaceId,
          receivingWorkspaceId: run.workspaceId,
          skipPersistentRoles: true,
          requestId: compensation.requestId,
          traceId: compensation.traceId,
          idempotencyKey: remoteKey,
          compensationContext: context,
          orchestrationContext: { orchestrationRunId: idOf(run), nodeRunId: idOf(node), nodeKey: `${node.nodeKey}:compensation`, parentTraceId: compensation.parentTraceId, traceId: compensation.traceId, requestId: compensation.requestId, attempt: compensation.attempt, capability: compensation.compensationCapability, operation: compensation.compensationOperation },
          async onInvocationCreated(invocationId) {
            await OrchestrationCompensationRun.updateOne({ _id: compensation._id, status: 'running', leaseOwner: claim.workerId }, { $set: { invocationId } });
          },
          transformValidatedOutput(output) {
            const validated = validateAgainstSchema(compensation.compensationDefinitionSnapshot.outputSchema, output, { path: '$compensation.output', code: 'ORCHESTRATION_COMPENSATION_OUTPUT_INVALID', message: 'Compensation output does not match its frozen schema.' });
            processedOutput = applyMinimization(validated, compensation.compensationDefinitionSnapshot.outputSchema, [], { maximumPayloadBytes: RECOVERY_LIMITS.maximumCorrectedInputBytes }).payload;
            return processedOutput;
          },
        },
      );
      if (processedOutput === undefined && invocation.output !== undefined) {
        processedOutput = validateAgainstSchema(compensation.compensationDefinitionSnapshot.outputSchema, invocation.output, { path: '$compensation.output', code: 'ORCHESTRATION_COMPENSATION_OUTPUT_INVALID', message: 'Compensation output does not match its frozen schema.' });
      }
      invocation.output = processedOutput;
    }
    if (heartbeatError) throw heartbeatError;
    if (!['succeeded', 'completed'].includes(invocation.lifecycleState) && invocation.status !== 'completed') {
      const uncertain = compensation.compensationDefinitionSnapshot.expectedIdempotencyBehavior === 'non_idempotent';
      if (uncertain) {
        const error = new AppError(503, 'REMOTE_OUTCOME_UNKNOWN', 'Non-idempotent compensation outcome is unknown.');
        error.outcomeUnknown = true;
        throw error;
      }
      const retrying = await transitionClaimedCompensation(claim, 'retry_wait', { invocationId: invocation.invocationId, nextAttemptAt: new Date(Date.now() + 1_000), safeFailureCode: 'COMPENSATION_INVOCATION_IN_PROGRESS', safeFailureMessage: 'Durable runtime invocation is still in progress.', retryability: true });
      await OrchestrationNodeRun.updateOne({ _id: node._id, status: 'compensating' }, { $set: { status: 'compensation_pending', compensationStatus: 'pending' } });
      return retrying;
    }
    validateCompensationSuccess(invocation.output, compensation.compensationDefinitionSnapshot.successCriteria);
    const succeeded = await transitionClaimedCompensation(claim, 'succeeded', {
      invocationId: invocation.invocationId,
      outputClassification: compensation.inputClassification,
      outputPayloadHash: stableHash(invocation.output, 'compensation-output'),
      approximateOutputBytes: approximateBytes(invocation.output),
      retryability: false,
      outcomeUnknown: false,
      completedAt: new Date(),
      safeFailureCode: undefined,
      safeFailureMessage: undefined,
      safeFailureCategory: undefined,
    });
    const currentNode = await OrchestrationNodeRun.findById(node._id);
    if (currentNode.status === 'compensating') {
      await transitionNodeState(currentNode, 'compensated', { compensationStatus: 'succeeded', compensatedAt: new Date(), compensationRunId: succeeded._id, compensationAttempt: succeeded.attempt });
    }
    metrics.increment('orchestration_compensation_successes');
    await audit('orchestration.compensation.succeeded', 'OrchestrationCompensationRun', succeeded, scope, { orchestrationRunId: idOf(run), originalNodeRunId: idOf(node), attempt: succeeded.attempt, classification: succeeded.inputClassification });
    await createCheckpointForRun(run._id, `compensation-${idOf(succeeded)}-succeeded`, scope, { createdBy: scope.actorId });
    await reconcileCompensationPlan(succeeded.compensationPlanId);
    return succeeded;
  } catch (error) {
    if (error.code === 'ORCHESTRATION_COMPENSATION_LEASE_LOST') throw error;
    const category = classifyRecoveryFailure(error);
    const outcomeUnknown = category === 'outcome_unknown';
    const retryable = !outcomeUnknown && error.retryable === true;
    const latest = await OrchestrationCompensationRun.findById(compensation._id).select('+compensationDefinitionSnapshot +leaseTokenHash');
    if (!latest || latest.status !== 'running') throw error;
    claim.compensation = latest;
    const deadlineExpired = new Date(latest.deadlineAt) <= new Date();
    if (retryable && !deadlineExpired && latest.attempt < latest.maximumAttempts) {
      const delay = recoveryBackoff(effectivePolicy(run).compensationBackoffPolicy, latest.attempt);
      const retrying = await transitionClaimedCompensation(claim, 'retry_wait', { nextAttemptAt: new Date(Date.now() + delay), safeFailureCode: safeCode(error.code, 'COMPENSATION_FAILED'), safeFailureMessage: String(error.message || 'Compensation failed safely.').slice(0, 500), safeFailureCategory: category, retryability: true, outcomeUnknown: false });
      await OrchestrationNodeRun.updateOne({ _id: node._id, status: 'compensating' }, { $set: { status: 'compensation_pending', compensationStatus: 'pending' } });
      metrics.increment('orchestration_compensation_retries', { category });
      await audit('orchestration.compensation.retried', 'OrchestrationCompensationRun', retrying, scope, { orchestrationRunId: idOf(run), originalNodeRunId: idOf(node), attempt: retrying.attempt, failureCategory: category });
      return retrying;
    }
    const targetStatus = outcomeUnknown ? 'waiting_intervention' : 'failed';
    const failed = await transitionClaimedCompensation(claim, targetStatus, { completedAt: outcomeUnknown ? undefined : new Date(), safeFailureCode: safeCode(error.code, outcomeUnknown ? 'OUTCOME_UNKNOWN' : 'COMPENSATION_FAILED'), safeFailureMessage: String(error.message || 'Compensation failed safely.').slice(0, 500), safeFailureCategory: category, retryability: false, outcomeUnknown });
    const currentNode = await OrchestrationNodeRun.findById(node._id);
    if (currentNode?.status === 'compensating') {
      await transitionNodeState(currentNode, outcomeUnknown ? 'waiting_intervention' : 'compensation_failed', { compensationStatus: 'failed', compensationRunId: failed._id });
    }
    if (outcomeUnknown) {
      const intervention = await createIntervention({ run, node: currentNode || node, compensationRun: failed, type: 'inspect_failure', allowedActions: ['compensate', 'waive_compensation', 'terminate'], safeFailureCode: 'OUTCOME_UNKNOWN', failureCategory: category, scope, title: 'Compensation outcome is unknown', summary: 'Automatic replay is blocked because the external compensation outcome cannot be proven.' });
      await OrchestrationCompensationRun.updateOne({ _id: failed._id }, { $set: { interventionRequestId: intervention._id } });
      if (run.status === 'compensating') await transitionRunState(run, 'waiting_intervention', {});
      await linkRecoveryIncident(run, scope, 'OUTCOME_UNKNOWN', { title: 'Unknown compensation outcome', safeDescription: 'The external compensation outcome could not be determined and automatic replay was blocked.', invocationIds: [failed.invocationId].filter(Boolean) });
    } else {
      metrics.increment('orchestration_compensation_failures', { category });
      await audit('orchestration.compensation.failed', 'OrchestrationCompensationRun', failed, scope, { orchestrationRunId: idOf(run), originalNodeRunId: idOf(node), attempt: failed.attempt, failureCategory: category });
      await reconcileCompensationPlan(failed.compensationPlanId);
    }
    return failed;
  } finally {
    clearInterval(heartbeat);
  }
}

async function reconcileCompensationApprovals(options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 100), 500));
  const runs = await OrchestrationCompensationRun.find({ status: 'waiting_approval', approvalRequestId: { $exists: true, $ne: null } }).sort({ createdAt: 1 }).limit(limit);
  let updated = 0;
  for (const compensation of runs) {
    const request = await ApprovalRequest.findOne({ approvalRequestId: compensation.approvalRequestId, organizationId: compensation.organizationId });
    if (!request) continue;
    const current = await expireIfNeeded(request);
    if (current.status === 'APPROVED') {
      await OrchestrationCompensationRun.updateOne({ _id: compensation._id, status: 'waiting_approval' }, { $set: { status: 'queued' } });
      updated += 1;
    } else if (['REJECTED', 'EXPIRED', 'INVALIDATED'].includes(current.status)) {
      await OrchestrationCompensationRun.updateOne({ _id: compensation._id, status: 'waiting_approval' }, { $set: { status: 'failed', completedAt: new Date(), safeFailureCode: current.status === 'EXPIRED' ? 'APPROVAL_EXPIRED' : 'APPROVAL_REJECTED', safeFailureCategory: 'approval_rejected', retryability: false } });
      updated += 1;
      await reconcileCompensationPlan(compensation.compensationPlanId);
    }
  }
  return { scanned: runs.length, updated };
}

async function ensureOrchestrationRecoveryIndexes() {
  const models = [
    OrchestrationRecoveryPolicy,
    OrchestrationRecoveryDecision,
    OrchestrationCompensationPlan,
    OrchestrationCompensationRun,
    OrchestrationInterventionRequest,
    OrchestrationCheckpoint,
    OrchestrationCorrectedInput,
  ];
  for (const Model of models) await Model.createIndexes();
  return { models: models.map((Model) => Model.modelName) };
}

module.exports = {
  activateRecoveryPolicy,
  archiveRecoveryPolicy,
  automaticRecoveryDirective,
  beginCancellationCompensation,
  claimNextCompensation,
  compensateNode,
  createCheckpoint,
  createCheckpointForRun,
  createCompensationPlanForRun,
  createRecoveryPolicy,
  correctNodeInput,
  ensureOrchestrationRecoveryIndexes,
  expireRecoveryWork,
  getCompensation,
  getCompensationPlan,
  getIntervention,
  getRecoveryPolicy,
  getRunRecovery,
  listCheckpoints,
  listCompensations,
  listInterventions,
  listRecoveryPolicies,
  pauseForAutomaticIntervention,
  planRunRecovery,
  processCompensationClaim,
  reconcileCompensationApprovals,
  reconcileCompensationPlan,
  recordAutomaticRetry,
  recoverExpiredCompensationLeases,
  replaceNodeAgent,
  resolveIntervention,
  resumeCheckpoint,
  resumeRunRecovery,
  retryNode,
  serializeCheckpoint,
  serializeCompensationPlan,
  serializeCompensationRun,
  serializeIntervention,
  serializeRecoveryDecision,
  serializeRecoveryPolicy,
  skipNode,
  startAutomaticCompensation,
  terminateRunRecovery,
  updateRecoveryPolicy,
  validateRecoveryPolicy,
  waiveNodeCompensation,
};
