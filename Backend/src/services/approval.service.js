const crypto = require('node:crypto');
const mongoose = require('mongoose');
const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const ApprovalRequest = require('../models/ApprovalRequest');
const ApprovalDecision = require('../models/ApprovalDecision');
const ApprovalGrant = require('../models/ApprovalGrant');
const ComplianceNotification = require('../models/ComplianceNotification');
const EnterpriseUser = require('../models/EnterpriseUser');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const Invocation = require('../models/Invocation');
const { createAuditLog } = require('./auditService');
const { actorFromPartner, assertAuthorized, authorize } = require('./authorization.service');
const { getPermission, hasPermission } = require('../constants/permissionRegistry');
const {
  APPROVAL_REASON_CODES,
  DEFAULT_APPROVAL_EXPIRY_MS,
  MAX_APPROVAL_EXPIRY_MS,
  MAX_APPROVAL_STAGES,
} = require('../constants/compliance');
const { approvalFingerprint, canonicalDigest } = require('../utils/complianceCanonical');
const { redactString } = require('../utils/redact');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { assertOperationalAccess } = require('./operationalState.service');
const metrics = require('./complianceMetrics.service');
const notificationDeliveryAdapters = new Set();

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function cleanString(value, maximum = 256) {
  return String(value || '')
    .trim()
    .slice(0, maximum);
}

function safeText(value, maximum = 1_000) {
  return redactString(cleanString(value, maximum));
}

function normalizeArray(value) {
  if (!Array.isArray(value)) return undefined;
  const values = [...new Set(value.map((item) => cleanString(item)).filter(Boolean))];
  return values.length ? values : undefined;
}

function scopeFromCaller(input = {}, caller = {}) {
  const partnerId = idOf(caller.partner?._id || caller.partnerId || input.organizationId);
  if (!partnerId) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      'Partner authentication is required.',
    );
  }
  const organizationId = partnerId;
  if (input.organizationId && idOf(input.organizationId) !== organizationId) {
    throw approvalError(
      403,
      ErrorCodes.APPROVAL_TENANT_MISMATCH,
      APPROVAL_REASON_CODES.TENANT_MISMATCH,
    );
  }
  return {
    partnerId,
    organizationId,
    workspaceId: cleanString(input.workspaceId || input.receivingWorkspaceId) || undefined,
    actorId: idOf(caller.actorId || `partner:${partnerId}`),
    actor: caller.actor || actorFromPartner(caller.partner || { _id: partnerId }),
    requestId: caller.requestId,
    traceId: caller.traceId,
  };
}

function approvalError(
  status,
  code,
  reasonCode,
  message = 'Approval validation failed.',
  metadata = {},
) {
  return new AppError(status, code, message, [], { reasonCode, ...metadata });
}

function workflowResource(scope, id = 'approval-workflows') {
  return {
    type: 'ApprovalWorkflow',
    id,
    organizationId: scope.organizationId,
    partnerId: scope.partnerId,
    workspaceId: scope.workspaceId,
  };
}

async function authorizeWorkflowAction(permission, input, caller, id) {
  const scope = scopeFromCaller(input, caller);
  await assertAuthorized(scope.actor, permission, workflowResource(scope, id), {
    requestId: caller.requestId,
    traceId: caller.traceId,
    workspaceId: scope.workspaceId,
  });
  return scope;
}

function normalizeTarget(target = {}) {
  return Object.fromEntries(
    [
      'permissionIds',
      'resourceTypes',
      'resourceIds',
      'organizationIds',
      'workspaceIds',
      'environments',
      'passportIds',
      'connectionIds',
      'capabilityIds',
      'capabilityClassifications',
      'capabilityCategories',
      'sideEffects',
      'operationTypes',
    ]
      .map((key) => [key, normalizeArray(target[key])])
      .filter(([, values]) => values),
  );
}

function normalizeStages(stages = []) {
  return stages.map((stage, index) => ({
    stageId: cleanString(stage.stageId || `stage_${index + 1}`, 128),
    sequence: Number(stage.sequence || index + 1),
    name: cleanString(stage.name || `Stage ${index + 1}`, 200),
    description: safeText(stage.description),
    requiredDecisionCount: Number(stage.requiredDecisionCount || 1),
    eligibleApprovers: {
      permissionIds: normalizeArray(stage.eligibleApprovers?.permissionIds),
      roleIds: normalizeArray(stage.eligibleApprovers?.roleIds),
      roleKeys: normalizeArray(stage.eligibleApprovers?.roleKeys)?.map((value) =>
        value.toLowerCase(),
      ),
      teamIds: normalizeArray(stage.eligibleApprovers?.teamIds),
      requireOrganizationMembership:
        stage.eligibleApprovers?.requireOrganizationMembership !== false,
      requireWorkspaceMembership: stage.eligibleApprovers?.requireWorkspaceMembership !== false,
      requireHuman: stage.eligibleApprovers?.requireHuman !== false,
      requireResourceOwnership: stage.eligibleApprovers?.requireResourceOwnership === true,
    },
    distinctApprovers: stage.distinctApprovers !== false,
    excludeRequester: stage.excludeRequester !== false,
    excludePreviousStageApprovers: stage.excludePreviousStageApprovers === true,
    timeoutMs: stage.timeoutMs ? Number(stage.timeoutMs) : undefined,
    rejectionBehavior: 'REJECT_REQUEST',
  }));
}

function validateWorkflowDefinition(workflow) {
  const errors = [];
  if (!workflow.name) errors.push({ path: 'name', message: 'name is required.' });
  const stages = workflow.stages || [];
  if (!stages.length || stages.length > MAX_APPROVAL_STAGES) {
    errors.push({
      path: 'stages',
      message: `stages must contain between 1 and ${MAX_APPROVAL_STAGES} entries.`,
    });
  }
  const ids = new Set();
  stages.forEach((stage, index) => {
    if (stage.sequence !== index + 1)
      errors.push({
        path: `stages.${index}.sequence`,
        message: 'stage sequences must be contiguous and ordered.',
      });
    if (!stage.stageId || ids.has(stage.stageId))
      errors.push({ path: `stages.${index}.stageId`, message: 'stage IDs must be unique.' });
    ids.add(stage.stageId);
    if (
      !Number.isInteger(stage.requiredDecisionCount) ||
      stage.requiredDecisionCount < 1 ||
      stage.requiredDecisionCount > 20
    ) {
      errors.push({
        path: `stages.${index}.requiredDecisionCount`,
        message: 'requiredDecisionCount must be between 1 and 20.',
      });
    }
    for (const permission of stage.eligibleApprovers?.permissionIds || []) {
      if (!hasPermission(permission))
        errors.push({
          path: `stages.${index}.eligibleApprovers.permissionIds`,
          message: `Unknown permission: ${permission}.`,
        });
    }
  });
  for (const permission of workflow.target?.permissionIds || []) {
    if (!hasPermission(permission))
      errors.push({ path: 'target.permissionIds', message: `Unknown permission: ${permission}.` });
  }
  if (
    (workflow.target?.organizationIds || []).some(
      (organizationId) => String(organizationId) !== String(workflow.organizationId),
    )
  ) {
    errors.push({
      path: 'target.organizationIds',
      message: 'Cross-organization workflow targets are forbidden.',
    });
  }
  if (
    workflow.workspaceId &&
    (workflow.target?.workspaceIds || []).some(
      (workspaceId) => String(workspaceId) !== String(workflow.workspaceId),
    )
  ) {
    errors.push({
      path: 'target.workspaceIds',
      message: 'A workspace workflow cannot target another workspace.',
    });
  }
  const allowedTriggerKeys = new Set([
    'permission',
    'resourceType',
    'operationType',
    'environment',
    'capabilityClassification',
    'capabilityCategory',
    'sideEffect',
    'requesterActorType',
  ]);
  for (const [key, value] of Object.entries(workflow.triggerConditions || {})) {
    if (!allowedTriggerKeys.has(key)) {
      errors.push({
        path: `triggerConditions.${key}`,
        message: 'Trigger condition is not registered.',
      });
    }
    if (Array.isArray(value) && (value.length < 1 || value.length > 100)) {
      errors.push({
        path: `triggerConditions.${key}`,
        message: 'Trigger condition list is outside the supported bounds.',
      });
    }
    if (!(typeof value === 'string' || typeof value === 'boolean' || Array.isArray(value))) {
      errors.push({
        path: `triggerConditions.${key}`,
        message: 'Trigger condition must use a bounded literal or list.',
      });
    }
  }
  if (
    !Number.isInteger(workflow.expirationMs) ||
    workflow.expirationMs < 1_000 ||
    workflow.expirationMs > MAX_APPROVAL_EXPIRY_MS
  ) {
    errors.push({ path: 'expirationMs', message: 'expirationMs is outside the supported range.' });
  }
  return { valid: errors.length === 0, errors };
}

function throwIfInvalidWorkflow(workflow) {
  const validation = validateWorkflowDefinition(workflow);
  if (!validation.valid) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Approval workflow validation failed.',
      validation.errors,
    );
  }
  return validation;
}

function workflowPayload(input, scope, metadata = {}) {
  const stages = normalizeStages(input.stages || metadata.stages || []);
  return {
    stableWorkflowId: metadata.stableWorkflowId || `awf_${crypto.randomUUID()}`,
    version: Number(metadata.version || 1),
    organizationId: scope.organizationId,
    workspaceId: input.scope === 'organization' ? undefined : scope.workspaceId,
    name: cleanString(input.name, 200),
    description: safeText(input.description, 2_000),
    status: 'DRAFT',
    target: normalizeTarget(input.target),
    triggerConditions: input.triggerConditions || {},
    stages,
    expirationMs: Number(input.expirationMs || DEFAULT_APPROVAL_EXPIRY_MS),
    escalation: input.escalation || {},
    singleUseGrant: input.singleUseGrant !== false,
    invalidateWhenRetired: input.invalidateWhenRetired !== false,
    createdBy: scope.actorId,
    updatedBy: scope.actorId,
    schemaVersion: 1,
    revision: 0,
    revisionMetadata: {
      ...(metadata.parentVersion ? { parentVersion: metadata.parentVersion } : {}),
      ...(input.changeSummary ? { changeSummary: safeText(input.changeSummary) } : {}),
    },
  };
}

function serializeWorkflow(workflowInput) {
  const workflow =
    typeof workflowInput?.toObject === 'function' ? workflowInput.toObject() : workflowInput;
  if (!workflow) return null;
  return {
    id: idOf(workflow),
    stableWorkflowId: workflow.stableWorkflowId,
    version: workflow.version,
    organizationId: workflow.organizationId,
    workspaceId: workflow.workspaceId,
    name: workflow.name,
    description: workflow.description,
    status: workflow.status,
    target: workflow.target || {},
    triggerConditions: workflow.triggerConditions || {},
    stages: workflow.stages || [],
    expirationMs: workflow.expirationMs,
    escalation: workflow.escalation || {},
    singleUseGrant: workflow.singleUseGrant,
    invalidateWhenRetired: workflow.invalidateWhenRetired,
    createdBy: workflow.createdBy,
    updatedBy: workflow.updatedBy,
    activatedAt: workflow.activatedAt,
    retiredAt: workflow.retiredAt,
    schemaVersion: workflow.schemaVersion,
    revision: workflow.revision,
    revisionMetadata: workflow.revisionMetadata,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
  };
}

async function audit(action, entityType, entityId, scope, metadata = {}) {
  await createAuditLog(
    scope.actorType || (scope.actor?.type === 'user' ? 'user' : 'partner'),
    scope.actorId,
    action,
    entityType,
    entityId,
    { organizationId: scope.organizationId, workspaceId: scope.workspaceId, ...metadata },
    { requestId: scope.requestId, traceId: scope.traceId, invocationId: metadata.invocationId },
  );
}

async function createWorkflowDraft(input = {}, caller = {}) {
  const scope = await authorizeWorkflowAction('approval.workflow.create', input, caller);
  const payload = workflowPayload(input, scope);
  throwIfInvalidWorkflow(payload);
  const workflow = await ApprovalWorkflow.create(payload);
  await audit(
    'approval.workflow.draft.created',
    'ApprovalWorkflow',
    workflow.stableWorkflowId,
    scope,
    { version: workflow.version, status: workflow.status },
  );
  return serializeWorkflow(workflow);
}

async function createWorkflowVersion(stableWorkflowId, input = {}, caller = {}) {
  const scope = await authorizeWorkflowAction(
    'approval.workflow.update',
    input,
    caller,
    stableWorkflowId,
  );
  const latest = await ApprovalWorkflow.findOne({
    organizationId: scope.organizationId,
    stableWorkflowId,
  })
    .sort({ version: -1 })
    .lean();
  if (!latest)
    throw approvalError(
      404,
      ErrorCodes.APPROVAL_REQUEST_NOT_FOUND,
      'APPROVAL_WORKFLOW_NOT_FOUND',
      'Approval workflow was not found.',
    );
  const payload = workflowPayload(
    {
      ...latest,
      ...input,
      target: input.target || latest.target,
      stages: input.stages || latest.stages,
    },
    { ...scope, workspaceId: input.scope === 'organization' ? undefined : latest.workspaceId },
    {
      stableWorkflowId,
      version: Number(latest.version) + 1,
      parentVersion: Number(latest.version),
    },
  );
  throwIfInvalidWorkflow(payload);
  const workflow = await ApprovalWorkflow.create(payload);
  await audit('approval.workflow.version.created', 'ApprovalWorkflow', stableWorkflowId, scope, {
    version: workflow.version,
    parentVersion: latest.version,
  });
  return serializeWorkflow(workflow);
}

async function updateWorkflowDraft(stableWorkflowId, version, input = {}, caller = {}) {
  const scope = await authorizeWorkflowAction(
    'approval.workflow.update',
    input,
    caller,
    stableWorkflowId,
  );
  const expectedRevision = Number(input.expectedRevision);
  const current = await ApprovalWorkflow.findOne({
    organizationId: scope.organizationId,
    stableWorkflowId,
    version: Number(version),
  }).lean();
  if (!current)
    throw approvalError(
      404,
      ErrorCodes.APPROVAL_REQUEST_NOT_FOUND,
      'APPROVAL_WORKFLOW_NOT_FOUND',
      'Approval workflow was not found.',
    );
  if (current.status !== 'DRAFT')
    throw approvalError(
      409,
      ErrorCodes.CONFLICT,
      'APPROVAL_WORKFLOW_IMMUTABLE',
      'Activated workflow versions are immutable.',
    );
  const candidate = {
    ...current,
    ...input,
    name: cleanString(input.name ?? current.name, 200),
    description: safeText(input.description ?? current.description, 2_000),
    target: normalizeTarget(input.target || current.target),
    stages: normalizeStages(input.stages || current.stages),
    expirationMs: Number(input.expirationMs || current.expirationMs),
  };
  throwIfInvalidWorkflow(candidate);
  const updated = await ApprovalWorkflow.findOneAndUpdate(
    {
      _id: current._id,
      organizationId: scope.organizationId,
      status: 'DRAFT',
      revision: expectedRevision,
    },
    {
      $set: {
        name: candidate.name,
        description: candidate.description,
        target: candidate.target,
        triggerConditions: candidate.triggerConditions || {},
        stages: candidate.stages,
        expirationMs: candidate.expirationMs,
        escalation: candidate.escalation || {},
        singleUseGrant: candidate.singleUseGrant !== false,
        invalidateWhenRetired: candidate.invalidateWhenRetired !== false,
        updatedBy: scope.actorId,
      },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!updated)
    throw approvalError(
      409,
      ErrorCodes.CONFLICT,
      'APPROVAL_WORKFLOW_REVISION_CONFLICT',
      'Approval workflow changed before the update.',
    );
  await audit('approval.workflow.draft.updated', 'ApprovalWorkflow', stableWorkflowId, scope, {
    version: updated.version,
    revision: updated.revision,
  });
  return serializeWorkflow(updated);
}

async function activateWorkflow(stableWorkflowId, version, input = {}, caller = {}) {
  const scope = await authorizeWorkflowAction(
    'approval.workflow.activate',
    input,
    caller,
    stableWorkflowId,
  );
  const expectedRevision = Number(input.expectedRevision);
  const current = await ApprovalWorkflow.findOne({
    organizationId: scope.organizationId,
    stableWorkflowId,
    version: Number(version),
    status: 'DRAFT',
  }).lean();
  if (!current)
    throw approvalError(
      404,
      ErrorCodes.APPROVAL_REQUEST_NOT_FOUND,
      'APPROVAL_WORKFLOW_NOT_FOUND',
      'Draft approval workflow was not found.',
    );
  throwIfInvalidWorkflow(current);
  let activated;
  await mongoose.connection.transaction(async (session) => {
    const now = new Date();
    await ApprovalWorkflow.updateMany(
      { organizationId: scope.organizationId, stableWorkflowId, status: 'ACTIVE' },
      {
        $set: { status: 'RETIRED', retiredAt: now, updatedBy: scope.actorId },
        $inc: { revision: 1 },
      },
      { session },
    );
    activated = await ApprovalWorkflow.findOneAndUpdate(
      {
        _id: current._id,
        organizationId: scope.organizationId,
        status: 'DRAFT',
        revision: expectedRevision,
      },
      {
        $set: { status: 'ACTIVE', activatedAt: now, updatedBy: scope.actorId },
        $inc: { revision: 1 },
      },
      { new: true, runValidators: true, session },
    );
    if (!activated)
      throw approvalError(
        409,
        ErrorCodes.CONFLICT,
        'APPROVAL_WORKFLOW_REVISION_CONFLICT',
        'Approval workflow changed before activation.',
      );
  });
  await audit('approval.workflow.activated', 'ApprovalWorkflow', stableWorkflowId, scope, {
    version: activated.version,
    status: 'ACTIVE',
  });
  return serializeWorkflow(activated);
}

async function retireWorkflow(stableWorkflowId, version, input = {}, caller = {}) {
  const scope = await authorizeWorkflowAction(
    'approval.workflow.retire',
    input,
    caller,
    stableWorkflowId,
  );
  const retired = await ApprovalWorkflow.findOneAndUpdate(
    {
      organizationId: scope.organizationId,
      stableWorkflowId,
      version: Number(version),
      status: 'ACTIVE',
      revision: Number(input.expectedRevision),
    },
    {
      $set: { status: 'RETIRED', retiredAt: new Date(), updatedBy: scope.actorId },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!retired)
    throw approvalError(
      409,
      ErrorCodes.CONFLICT,
      'APPROVAL_WORKFLOW_REVISION_CONFLICT',
      'Approval workflow changed before retirement.',
    );
  await audit('approval.workflow.retired', 'ApprovalWorkflow', stableWorkflowId, scope, {
    version: retired.version,
    status: 'RETIRED',
  });
  return serializeWorkflow(retired);
}

async function listWorkflows(input = {}, caller = {}) {
  const scope = await authorizeWorkflowAction('approval.workflow.read', input, caller);
  const filter = { organizationId: scope.organizationId };
  if (scope.workspaceId)
    filter.$or = [
      { workspaceId: scope.workspaceId },
      { workspaceId: { $exists: false } },
      { workspaceId: null },
      { workspaceId: '' },
    ];
  if (input.status) filter.status = cleanString(input.status).toUpperCase();
  const items = await ApprovalWorkflow.find(filter)
    .sort({ stableWorkflowId: 1, version: -1 })
    .lean();
  return { items: items.map(serializeWorkflow) };
}

async function getWorkflow(stableWorkflowId, input = {}, caller = {}) {
  const scope = await authorizeWorkflowAction(
    'approval.workflow.read',
    input,
    caller,
    stableWorkflowId,
  );
  const items = await ApprovalWorkflow.find({
    organizationId: scope.organizationId,
    stableWorkflowId,
  })
    .sort({ version: -1 })
    .lean();
  if (!items.length)
    throw approvalError(
      404,
      ErrorCodes.APPROVAL_REQUEST_NOT_FOUND,
      'APPROVAL_WORKFLOW_NOT_FOUND',
      'Approval workflow was not found.',
    );
  return { stableWorkflowId, items: items.map(serializeWorkflow) };
}

function valuesMatch(expected, actual) {
  return !expected?.length || expected.map(String).includes(String(actual || ''));
}

function workflowMatches(workflow, action = {}) {
  const target = workflow.target || {};
  const targetMatched =
    valuesMatch(target.permissionIds, action.permission) &&
    valuesMatch(target.resourceTypes, action.resourceType) &&
    valuesMatch(target.resourceIds, action.resourceId) &&
    valuesMatch(target.organizationIds, action.organizationId) &&
    valuesMatch(target.workspaceIds, action.workspaceId) &&
    valuesMatch(target.environments, action.environment) &&
    valuesMatch(target.passportIds, action.passportId) &&
    valuesMatch(target.connectionIds, action.connectionId) &&
    valuesMatch(target.capabilityIds, action.capabilityId) &&
    valuesMatch(target.capabilityClassifications, action.capabilityClassification) &&
    valuesMatch(target.capabilityCategories, action.capabilityCategory) &&
    valuesMatch(target.sideEffects, action.sideEffect) &&
    valuesMatch(target.operationTypes, action.operationType);
  if (!targetMatched) return false;
  return Object.entries(workflow.triggerConditions || {}).every(([key, expected]) =>
    Array.isArray(expected)
      ? expected.map(String).includes(String(action[key] ?? ''))
      : String(expected) === String(action[key] ?? ''),
  );
}

async function evaluateApprovalRequirement(action = {}, options = {}) {
  const started = Date.now();
  try {
    if (!action.organizationId)
      return { required: false, decision: 'NOT_REQUIRED', requirements: [] };
    if (!options.workflowLoader && mongoose.connection.readyState !== 1) {
      return { required: false, decision: 'ALLOW', requirements: [], workflows: [] };
    }
    const query = options.workflowLoader
      ? await options.workflowLoader(action)
      : await ApprovalWorkflow.find({
          organizationId: String(action.organizationId),
          status: 'ACTIVE',
          $or: [
            { workspaceId: action.workspaceId },
            { workspaceId: { $exists: false } },
            { workspaceId: null },
            { workspaceId: '' },
          ],
        }).lean();
    const workflows = query.filter(
      (workflow) => workflow.status === 'ACTIVE' && workflowMatches(workflow, action),
    );
    return {
      required: workflows.length > 0,
      decision: workflows.length ? 'ALLOW_WITH_APPROVAL' : 'ALLOW',
      requirements: workflows.map((workflow) => ({
        workflowId: workflow.stableWorkflowId,
        workflowVersion: workflow.version,
        workspaceId: workflow.workspaceId,
        stageCount: workflow.stages.length,
        expiresInMs: workflow.expirationMs,
      })),
      workflows,
    };
  } finally {
    metrics.observe('approval_requirement_evaluation', Date.now() - started);
  }
}

function actionFingerprint(action, workflow) {
  return approvalFingerprint({
    ...action,
    workflowId: workflow.stableWorkflowId,
    workflowVersion: workflow.version,
    policySnapshotRevision: action.policySnapshotRevision,
    safeRequestAttributes: action.safeRequestAttributes,
    safeAttributesDigest: action.safeAttributesDigest,
  });
}

async function findRequester(action) {
  const requestedId = cleanString(action.requesterActorId);
  if (action.requesterActorType !== 'user') return null;
  const identityFilter = mongoose.isValidObjectId(requestedId)
    ? { _id: requestedId }
    : { externalUserId: requestedId };
  return EnterpriseUser.findOne({
    ...identityFilter,
    partnerId: action.organizationId,
    status: 'active',
  }).lean();
}

async function createNotification(input) {
  let notification;
  try {
    notification = await ComplianceNotification.create({
      notificationId: `ntf_${crypto.randomUUID()}`,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      recipientActorId: input.recipientActorId,
      type: input.type,
      approvalRequestId: input.approvalRequestId,
      title: cleanString(input.title, 200),
      safeSummary: safeText(input.safeSummary, 500),
      deliveryStatus: 'PENDING',
    });
  } catch (error) {
    metrics.increment('approval_notification_failures', {
      reason: error.code || 'NOTIFICATION_STORAGE_FAILED',
    });
    return null;
  }
  for (const adapter of notificationDeliveryAdapters) {
    Promise.resolve(
      adapter({
        notificationId: notification.notificationId,
        organizationId: notification.organizationId,
        workspaceId: notification.workspaceId,
        recipientActorId: notification.recipientActorId,
        type: notification.type,
        title: notification.title,
        safeSummary: notification.safeSummary,
      }),
    ).catch(() => undefined);
  }
  return notification;
}

function registerNotificationDeliveryAdapter(adapter) {
  if (typeof adapter !== 'function')
    throw new TypeError('Notification delivery adapter must be a function.');
  notificationDeliveryAdapters.add(adapter);
  return () => notificationDeliveryAdapters.delete(adapter);
}

async function createApprovalRequest(input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  const requesterActorId = cleanString(input.requesterActorId || input.receivingUserId);
  const requesterActorType = cleanString(input.requesterActorType || 'user');
  const action = {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    requesterActorId,
    requesterActorType,
    permission: cleanString(input.permission),
    resourceType: cleanString(input.resourceType),
    resourceId: cleanString(input.resourceId),
    operationType: cleanString(input.operationType || input.permission),
    connectionId: cleanString(input.connectionId) || undefined,
    capabilityId: cleanString(input.capabilityId) || undefined,
    passportId: cleanString(input.passportId) || undefined,
    capabilityClassification: cleanString(input.capabilityClassification) || undefined,
    capabilityCategory: cleanString(input.capabilityCategory) || undefined,
    sideEffect: cleanString(input.sideEffect) || undefined,
    environment: cleanString(input.environment) || undefined,
    invocationId: cleanString(input.invocationId) || undefined,
    safeRequestAttributes: input.safeRequestAttributes,
  };
  if (
    !getPermission(action.permission) ||
    !action.resourceType ||
    !action.resourceId ||
    !requesterActorId
  ) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Approval request validation failed.');
  }
  const requester = await findRequester(action);
  const requesterActor = requester
    ? {
        type: 'user',
        id: idOf(requester),
        userId: requester.externalUserId,
        enterpriseUserId: idOf(requester),
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
      }
    : requesterActorType === 'service_account' && requesterActorId === `partner:${scope.partnerId}`
      ? actorFromPartner(caller.partner || { _id: scope.partnerId }, {
          workspaceId: scope.workspaceId,
        })
      : {
          type: requesterActorType,
          id: requesterActorId,
          organizationId: scope.organizationId,
          workspaceId: scope.workspaceId,
        };
  const authorizationDecision = await assertAuthorized(
    requesterActor,
    action.permission,
    {
      type: action.resourceType,
      id: action.resourceId,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    },
    { requestId: caller.requestId, traceId: caller.traceId, workspaceId: scope.workspaceId },
  );
  action.policySnapshotRevision = authorizationDecision.policySnapshotRevision;
  const evaluation = await evaluateApprovalRequirement(action);
  const workflow = evaluation.workflows.find(
    (item) => !input.workflowId || item.stableWorkflowId === input.workflowId,
  );
  if (!workflow)
    throw approvalError(
      409,
      ErrorCodes.APPROVAL_REQUIRED,
      APPROVAL_REASON_CODES.REQUIRED,
      'No active approval workflow matches the requested action.',
    );
  const fingerprint = actionFingerprint(action, workflow);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + Number(workflow.expirationMs));
  const idempotencyKeyHash = input.idempotencyKey
    ? canonicalDigest({
        organizationId: scope.organizationId,
        idempotencyKey: cleanString(input.idempotencyKey, 200),
      })
    : undefined;
  if (idempotencyKeyHash) {
    const existing = await ApprovalRequest.findOne({
      organizationId: scope.organizationId,
      idempotencyKeyHash,
    });
    if (existing) {
      if (existing.requestFingerprint !== fingerprint.digest) {
        throw new AppError(
          409,
          ErrorCodes.CONFLICT,
          'The idempotency key is already bound to a different approval request.',
        );
      }
      const [decisions, grant] = await Promise.all([
        ApprovalDecision.find({
          organizationId: scope.organizationId,
          approvalRequestId: existing.approvalRequestId,
        })
          .sort({ decidedAt: 1 })
          .lean(),
        ApprovalGrant.findOne({
          organizationId: scope.organizationId,
          approvalRequestId: existing.approvalRequestId,
        }).lean(),
      ]);
      return serializeApprovalRequest(existing, decisions, grant);
    }
  }
  const requestPayload = {
    approvalRequestId: `apr_${crypto.randomUUID()}`,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    workflowId: workflow.stableWorkflowId,
    workflowVersion: workflow.version,
    requesterActorId,
    requesterActorType,
    permission: action.permission,
    resourceType: action.resourceType,
    resourceId: action.resourceId,
    operationType: action.operationType,
    capabilityId: action.capabilityId,
    connectionId: action.connectionId,
    invocationId: action.invocationId,
    environment: action.environment,
    requestFingerprint: fingerprint.digest,
    fingerprintSummary: fingerprint.selected,
    authorizationSnapshot: {
      decision: authorizationDecision.decision,
      reasonCode: authorizationDecision.reasonCode,
      roleKeys: authorizationDecision.roleKeys,
      permission: action.permission,
    },
    policySnapshot: {
      decision: authorizationDecision.policyDecision,
      revision: authorizationDecision.policySnapshotRevision,
      matchedPolicyIds: (authorizationDecision.matchedPolicies || []).map(
        (item) => item.stablePolicyId,
      ),
    },
    requestedAt: now,
    expiresAt,
    status: 'PENDING',
    currentStageSequence: 1,
    revision: 0,
    traceId: caller.traceId,
    requestId: caller.requestId,
    idempotencyKeyHash,
    reason: safeText(input.reason || input.justification),
    metadataSchemaVersion: 1,
  };
  let request;
  try {
    request = await ApprovalRequest.create(requestPayload);
  } catch (error) {
    if (error?.code !== 11000 || !idempotencyKeyHash) throw error;
    const existing = await ApprovalRequest.findOne({
      organizationId: scope.organizationId,
      idempotencyKeyHash,
    });
    if (!existing || existing.requestFingerprint !== fingerprint.digest) {
      throw new AppError(
        409,
        ErrorCodes.CONFLICT,
        'The idempotency key is already bound to a different approval request.',
      );
    }
    const [decisions, grant] = await Promise.all([
      ApprovalDecision.find({
        organizationId: scope.organizationId,
        approvalRequestId: existing.approvalRequestId,
      })
        .sort({ decidedAt: 1 })
        .lean(),
      ApprovalGrant.findOne({
        organizationId: scope.organizationId,
        approvalRequestId: existing.approvalRequestId,
      }).lean(),
    ]);
    return serializeApprovalRequest(existing, decisions, grant);
  }
  metrics.increment('approval_requests_created');
  await audit(
    'approval.request.created',
    'ApprovalRequest',
    request.approvalRequestId,
    { ...scope, actorId: requesterActorId, actorType: requesterActorType },
    {
      permission: action.permission,
      resourceType: action.resourceType,
      resourceId: action.resourceId,
      workflowId: workflow.stableWorkflowId,
      workflowVersion: workflow.version,
      requestFingerprint: fingerprint.digest,
      status: 'PENDING',
    },
  );
  await createNotification({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    type: 'APPROVAL_REQUESTED',
    approvalRequestId: request.approvalRequestId,
    title: 'Approval requested',
    safeSummary: `${action.permission} on ${action.resourceType}`,
  });
  return serializeApprovalRequest(request, [], null);
}

function serializeDecision(decision) {
  return {
    decisionId: decision.decisionId,
    stageId: decision.stageId,
    stageSequence: decision.stageSequence,
    approverActorId: decision.approverActorId,
    approverActorType: decision.approverActorType,
    decision: decision.decision,
    comment: safeText(decision.comment),
    decidedAt: decision.decidedAt,
    authorizationEvidence: decision.authorizationEvidence,
    policyEvidence: decision.policyEvidence,
    traceId: decision.traceId,
    requestId: decision.requestId,
  };
}

function serializeGrant(grant) {
  if (!grant) return null;
  return {
    approvalGrantId: grant.approvalGrantId,
    approvalRequestId: grant.approvalRequestId,
    organizationId: grant.organizationId,
    workspaceId: grant.workspaceId,
    permission: grant.permission,
    resourceType: grant.resourceType,
    resourceId: grant.resourceId,
    operationType: grant.operationType,
    requestFingerprint: grant.requestFingerprint,
    issuedAt: grant.issuedAt,
    expiresAt: grant.expiresAt,
    consumedAt: grant.consumedAt,
    revokedAt: grant.revokedAt,
    status: grant.status,
    workflowId: grant.workflowId,
    workflowVersion: grant.workflowVersion,
    decisionIds: grant.decisionIds,
  };
}

function serializeApprovalRequest(requestInput, decisions = [], grant = null) {
  const request =
    typeof requestInput?.toObject === 'function' ? requestInput.toObject() : requestInput;
  return {
    approvalRequestId: request.approvalRequestId,
    organizationId: request.organizationId,
    workspaceId: request.workspaceId,
    workflowId: request.workflowId,
    workflowVersion: request.workflowVersion,
    requesterActorId: request.requesterActorId,
    requesterActorType: request.requesterActorType,
    permission: request.permission,
    resourceType: request.resourceType,
    resourceId: request.resourceId,
    operationType: request.operationType,
    capabilityId: request.capabilityId,
    connectionId: request.connectionId,
    invocationId: request.invocationId,
    environment: request.environment,
    requestFingerprint: request.requestFingerprint,
    fingerprintSummary: request.fingerprintSummary,
    authorizationSnapshot: request.authorizationSnapshot,
    policySnapshot: request.policySnapshot,
    requestedAt: request.requestedAt,
    expiresAt: request.expiresAt,
    status: request.status,
    currentStageSequence: request.currentStageSequence,
    revision: request.revision,
    traceId: request.traceId,
    requestId: request.requestId,
    reason: safeText(request.reason),
    invalidationReasonCode: request.invalidationReasonCode,
    decisions: decisions.map(serializeDecision),
    grant: serializeGrant(grant),
  };
}

async function expireIfNeeded(request) {
  if (
    !['PENDING', 'PARTIALLY_APPROVED'].includes(request.status) ||
    new Date(request.expiresAt) > new Date()
  )
    return request;
  const expired = await ApprovalRequest.findOneAndUpdate(
    {
      _id: request._id,
      status: { $in: ['PENDING', 'PARTIALLY_APPROVED'] },
      expiresAt: { $lte: new Date() },
      revision: request.revision,
    },
    {
      $set: { status: 'EXPIRED', invalidationReasonCode: APPROVAL_REASON_CODES.EXPIRED },
      $inc: { revision: 1 },
    },
    { new: true },
  );
  if (expired) {
    metrics.increment('approval_requests_expired');
    await createNotification({
      organizationId: expired.organizationId,
      workspaceId: expired.workspaceId,
      recipientActorId: expired.requesterActorId,
      type: 'APPROVAL_EXPIRED',
      approvalRequestId: expired.approvalRequestId,
      title: 'Approval expired',
      safeSummary: `Approval expired for ${expired.permission}`,
    });
  }
  return expired || request;
}

async function approverIdentity(organizationId, actorId) {
  const filter = mongoose.isValidObjectId(actorId) ? { _id: actorId } : { externalUserId: actorId };
  return EnterpriseUser.findOne({ ...filter, partnerId: organizationId, status: 'active' }).lean();
}

function bindingMatchesWorkspace(binding, workspaceId) {
  if (binding.scopeType === 'organization') return true;
  return (
    String(binding.externalWorkspaceId || binding.workspaceId || '') === String(workspaceId || '')
  );
}

async function assertStageEligibility({ request, workflow, stage, approver, decision, caller }) {
  if (!approver || (stage.eligibleApprovers?.requireHuman !== false && !approver.externalUserId)) {
    throw approvalError(
      403,
      ErrorCodes.APPROVER_NOT_ELIGIBLE,
      APPROVAL_REASON_CODES.APPROVER_NOT_ELIGIBLE,
      'Approver is not eligible.',
    );
  }
  const approverId = idOf(approver);
  if (
    stage.excludeRequester &&
    [approverId, approver.externalUserId].includes(request.requesterActorId)
  ) {
    metrics.increment('approval_decision_conflicts', {
      reason: APPROVAL_REASON_CODES.SELF_APPROVAL,
    });
    throw approvalError(
      403,
      ErrorCodes.REQUESTER_SELF_APPROVAL_FORBIDDEN,
      APPROVAL_REASON_CODES.SELF_APPROVAL,
      'Requester self-approval is forbidden.',
    );
  }
  if (stage.eligibleApprovers?.requireWorkspaceMembership !== false && request.workspaceId) {
    const direct = (approver.externalWorkspaceIds || [])
      .map(String)
      .includes(String(request.workspaceId));
    const bound = (approver.roleBindings || []).some((binding) =>
      bindingMatchesWorkspace(binding, request.workspaceId),
    );
    if (!direct && !bound)
      throw approvalError(
        403,
        ErrorCodes.APPROVER_NOT_ELIGIBLE,
        APPROVAL_REASON_CODES.APPROVER_NOT_ELIGIBLE,
        'Approver is not a workspace member.',
      );
  }
  const roleKeys = (approver.roleBindings || [])
    .filter((binding) => bindingMatchesWorkspace(binding, request.workspaceId))
    .map((binding) => binding.roleKey)
    .filter(Boolean);
  const requiredRoleKeys = stage.eligibleApprovers?.roleKeys || [];
  if (requiredRoleKeys.length && !requiredRoleKeys.some((role) => roleKeys.includes(role))) {
    throw approvalError(
      403,
      ErrorCodes.APPROVER_NOT_ELIGIBLE,
      APPROVAL_REASON_CODES.APPROVER_NOT_ELIGIBLE,
      'Approver role constraint was not met.',
    );
  }
  const requiredTeamIds = (stage.eligibleApprovers?.teamIds || []).map(String);
  if (
    requiredTeamIds.length &&
    !requiredTeamIds.some((teamId) => (approver.teamIds || []).map(String).includes(teamId))
  ) {
    throw approvalError(
      403,
      ErrorCodes.APPROVER_NOT_ELIGIBLE,
      APPROVAL_REASON_CODES.APPROVER_NOT_ELIGIBLE,
      'Approver team constraint was not met.',
    );
  }
  const actor = {
    type: 'user',
    id: approverId,
    userId: approver.externalUserId,
    enterpriseUserId: approverId,
    organizationId: request.organizationId,
    workspaceId: request.workspaceId,
  };
  const permission =
    decision === 'APPROVE' ? 'approval.request.approve' : 'approval.request.reject';
  const evidence = await assertAuthorized(
    actor,
    permission,
    {
      type: 'ApprovalRequest',
      id: request.approvalRequestId,
      organizationId: request.organizationId,
      workspaceId: request.workspaceId,
    },
    { requestId: caller.requestId, traceId: caller.traceId, workspaceId: request.workspaceId },
  );
  for (const requiredPermission of stage.eligibleApprovers?.permissionIds || []) {
    await assertAuthorized(
      actor,
      requiredPermission,
      {
        type: request.resourceType,
        id: request.resourceId,
        organizationId: request.organizationId,
        workspaceId: request.workspaceId,
      },
      { requestId: caller.requestId, traceId: caller.traceId, workspaceId: request.workspaceId },
    );
  }
  return { actor, evidence, approverId };
}

async function issueGrant(request, workflow, decisions, options = {}) {
  const existingQuery = ApprovalGrant.findOne({ approvalRequestId: request.approvalRequestId });
  if (options.session) existingQuery.session(options.session);
  const existing = await existingQuery.lean();
  if (existing) return existing;
  const payload = {
    approvalGrantId: `apg_${crypto.randomUUID()}`,
    approvalRequestId: request.approvalRequestId,
    organizationId: request.organizationId,
    workspaceId: request.workspaceId,
    requesterActorId: request.requesterActorId,
    permission: request.permission,
    resourceType: request.resourceType,
    resourceId: request.resourceId,
    operationType: request.operationType,
    requestFingerprint: request.requestFingerprint,
    issuedAt: new Date(),
    expiresAt: request.expiresAt,
    status: 'ACTIVE',
    singleUse: workflow.singleUseGrant !== false,
    workflowId: request.workflowId,
    workflowVersion: request.workflowVersion,
    decisionIds: decisions.map((item) => item.decisionId),
    policySnapshotRevision: request.policySnapshot?.revision,
    authorizationSnapshotReference: canonicalDigest(request.authorizationSnapshot),
    schemaVersion: 1,
  };
  if (!options.session) return ApprovalGrant.create(payload);
  return ApprovalGrant.create([payload], { session: options.session }).then((items) => items[0]);
}

async function decideApprovalRequest(approvalRequestId, decision, input = {}, caller = {}) {
  const normalizedDecision = String(decision).toUpperCase();
  if (!['APPROVE', 'REJECT'].includes(normalizedDecision))
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Decision must be APPROVE or REJECT.');
  const scope = scopeFromCaller(input, caller);
  let request = await ApprovalRequest.findOne({
    approvalRequestId,
    organizationId: scope.organizationId,
  });
  if (!request)
    throw approvalError(
      404,
      ErrorCodes.APPROVAL_REQUEST_NOT_FOUND,
      APPROVAL_REASON_CODES.NOT_FOUND,
      'Approval request was not found.',
    );
  request = await expireIfNeeded(request);
  if (request.workspaceId && scope.workspaceId && request.workspaceId !== scope.workspaceId)
    throw approvalError(
      404,
      ErrorCodes.APPROVAL_REQUEST_NOT_FOUND,
      APPROVAL_REASON_CODES.NOT_FOUND,
      'Approval request was not found.',
    );
  if (!['PENDING', 'PARTIALLY_APPROVED'].includes(request.status)) {
    const code =
      request.status === 'EXPIRED'
        ? ErrorCodes.APPROVAL_EXPIRED
        : ErrorCodes.APPROVAL_STAGE_CONFLICT;
    throw approvalError(
      409,
      code,
      request.status === 'EXPIRED'
        ? APPROVAL_REASON_CODES.EXPIRED
        : APPROVAL_REASON_CODES.STAGE_CONFLICT,
      'Approval request is not open for decisions.',
    );
  }
  const workflow = await ApprovalWorkflow.findOne({
    organizationId: request.organizationId,
    stableWorkflowId: request.workflowId,
    version: request.workflowVersion,
  }).lean();
  if (!workflow)
    throw approvalError(
      409,
      ErrorCodes.APPROVAL_INVALIDATED,
      APPROVAL_REASON_CODES.INVALIDATED,
      'Approval workflow is unavailable.',
    );
  const stage = workflow.stages.find((item) => item.sequence === request.currentStageSequence);
  if (!stage)
    throw approvalError(
      409,
      ErrorCodes.APPROVAL_STAGE_CONFLICT,
      APPROVAL_REASON_CODES.STAGE_CONFLICT,
      'Approval stage is inconsistent.',
    );
  if (input.stageId && input.stageId !== stage.stageId)
    throw approvalError(
      409,
      ErrorCodes.APPROVAL_STAGE_CONFLICT,
      APPROVAL_REASON_CODES.STAGE_CONFLICT,
      'Approval stages must be completed in order.',
    );
  const approver = await approverIdentity(
    scope.organizationId,
    cleanString(input.approverActorId || input.approverId),
  );
  const eligibility = await assertStageEligibility({
    request,
    workflow,
    stage,
    approver,
    decision: normalizedDecision,
    caller,
  });
  const priorDecisions = await ApprovalDecision.find({
    organizationId: request.organizationId,
    approvalRequestId,
  })
    .sort({ stageSequence: 1, decidedAt: 1 })
    .lean();
  if (
    priorDecisions.some(
      (item) => item.stageId === stage.stageId && item.approverActorId === eligibility.approverId,
    )
  ) {
    throw approvalError(
      409,
      ErrorCodes.APPROVER_DUPLICATE,
      APPROVAL_REASON_CODES.APPROVER_DUPLICATE,
      'Approver already decided this stage.',
    );
  }
  if (
    stage.excludePreviousStageApprovers &&
    priorDecisions.some(
      (item) => item.decision === 'APPROVE' && item.approverActorId === eligibility.approverId,
    )
  ) {
    throw approvalError(
      409,
      ErrorCodes.APPROVER_DUPLICATE,
      APPROVAL_REASON_CODES.APPROVER_DUPLICATE,
      'Approver cannot approve consecutive stages.',
    );
  }
  const decisionPayload = {
    decisionId: `apd_${crypto.randomUUID()}`,
    approvalRequestId,
    organizationId: request.organizationId,
    workspaceId: request.workspaceId,
    stageId: stage.stageId,
    stageSequence: stage.sequence,
    approverActorId: eligibility.approverId,
    approverActorType: 'user',
    decision: normalizedDecision,
    comment: safeText(input.comment),
    decidedAt: new Date(),
    authorizationEvidence: {
      decision: eligibility.evidence.decision,
      reasonCode: eligibility.evidence.reasonCode,
      permission: eligibility.evidence.permission?.id,
      roleKeys: eligibility.evidence.roleKeys,
    },
    policyEvidence: {
      decision: eligibility.evidence.policyDecision,
      revision: eligibility.evidence.policySnapshotRevision,
      matchedPolicyIds: (eligibility.evidence.matchedPolicies || []).map(
        (item) => item.stablePolicyId,
      ),
    },
    traceId: caller.traceId,
    requestId: caller.requestId,
    requestRevision: request.revision,
    schemaVersion: 1,
  };
  const currentStageApprovals =
    priorDecisions.filter((item) => item.stageId === stage.stageId && item.decision === 'APPROVE')
      .length + (normalizedDecision === 'APPROVE' ? 1 : 0);
  let nextStatus;
  let nextStage = request.currentStageSequence;
  if (normalizedDecision === 'REJECT') nextStatus = 'REJECTED';
  else if (currentStageApprovals >= stage.requiredDecisionCount) {
    if (stage.sequence >= workflow.stages.length) nextStatus = 'APPROVED';
    else {
      nextStatus = 'PARTIALLY_APPROVED';
      nextStage = stage.sequence + 1;
    }
  } else nextStatus = 'PARTIALLY_APPROVED';
  let record;
  let updated;
  let grant;
  let decisions;
  try {
    await mongoose.connection.transaction(async (session) => {
      record = await ApprovalDecision.create([decisionPayload], { session }).then(
        (items) => items[0],
      );
      updated = await ApprovalRequest.findOneAndUpdate(
        {
          _id: request._id,
          organizationId: request.organizationId,
          revision: request.revision,
          status: { $in: ['PENDING', 'PARTIALLY_APPROVED'] },
          currentStageSequence: stage.sequence,
        },
        { $set: { status: nextStatus, currentStageSequence: nextStage }, $inc: { revision: 1 } },
        { new: true, runValidators: true, session },
      );
      if (!updated) {
        throw approvalError(
          409,
          ErrorCodes.APPROVAL_STAGE_CONFLICT,
          APPROVAL_REASON_CODES.STAGE_CONFLICT,
          'Approval request changed before the decision was recorded.',
        );
      }
      decisions = [...priorDecisions, record.toObject ? record.toObject() : record];
      grant =
        nextStatus === 'APPROVED'
          ? await issueGrant(updated, workflow, decisions, { session })
          : null;
    });
  } catch (error) {
    metrics.increment('approval_decision_conflicts', {
      reason:
        error.code === 11000
          ? APPROVAL_REASON_CODES.APPROVER_DUPLICATE
          : APPROVAL_REASON_CODES.STAGE_CONFLICT,
    });
    if (error.code === 11000)
      throw approvalError(
        409,
        ErrorCodes.APPROVER_DUPLICATE,
        APPROVAL_REASON_CODES.APPROVER_DUPLICATE,
        'Approver already decided this stage.',
      );
    throw error;
  }
  metrics.increment(
    nextStatus === 'APPROVED'
      ? 'approval_requests_approved'
      : nextStatus === 'REJECTED'
        ? 'approval_requests_rejected'
        : 'approval_decisions_recorded',
  );
  await audit(
    'approval.decision.recorded',
    'ApprovalRequest',
    approvalRequestId,
    {
      ...scope,
      actorId: eligibility.approverId,
      actorType: 'user',
      workspaceId: request.workspaceId,
    },
    {
      decision: normalizedDecision,
      stageId: stage.stageId,
      status: nextStatus,
      reasonCode: nextStatus === 'REJECTED' ? APPROVAL_REASON_CODES.REJECTED : undefined,
      comment: safeText(input.comment),
    },
  );
  await createNotification({
    organizationId: request.organizationId,
    workspaceId: request.workspaceId,
    recipientActorId: request.requesterActorId,
    type:
      nextStatus === 'APPROVED'
        ? 'APPROVAL_COMPLETED'
        : nextStatus === 'REJECTED'
          ? 'APPROVAL_REJECTED'
          : 'APPROVAL_DECISION_RECORDED',
    approvalRequestId,
    title:
      nextStatus === 'APPROVED'
        ? 'Approval completed'
        : nextStatus === 'REJECTED'
          ? 'Approval rejected'
          : 'Approval decision recorded',
    safeSummary: `${normalizedDecision} recorded for ${request.permission}`,
  });
  if (updated.orchestrationRunId) {
    try {
      const { handleApprovalResolution } = require('./orchestrationScheduler.service');
      await handleApprovalResolution(updated.approvalRequestId);
    } catch {
      // Orchestration approval resumption is durable: the orchestration worker also reconciles
      // approval state, so a transient cross-subsystem notification failure cannot lose work.
    }
  }
  if (updated.agentSelectionDecisionId) {
    try {
      const { handleApprovalResolution } = require('./agentSelection.service');
      await handleApprovalResolution(updated.approvalRequestId);
    } catch {
      // The decision remains linked to the durable approval and can be reconciled safely.
    }
  }
  return serializeApprovalRequest(updated, decisions, grant);
}

async function getApprovalRequest(approvalRequestId, input = {}, caller = {}) {
  const scope = await authorizeWorkflowAction(
    'approval.request.read',
    input,
    caller,
    approvalRequestId,
  );
  let request = await ApprovalRequest.findOne({
    approvalRequestId,
    organizationId: scope.organizationId,
  });
  if (!request)
    throw approvalError(
      404,
      ErrorCodes.APPROVAL_REQUEST_NOT_FOUND,
      APPROVAL_REASON_CODES.NOT_FOUND,
      'Approval request was not found.',
    );
  request = await expireIfNeeded(request);
  const [decisions, grant] = await Promise.all([
    ApprovalDecision.find({ organizationId: scope.organizationId, approvalRequestId })
      .sort({ stageSequence: 1, decidedAt: 1 })
      .lean(),
    ApprovalGrant.findOne({ organizationId: scope.organizationId, approvalRequestId }).lean(),
  ]);
  return serializeApprovalRequest(request, decisions, grant);
}

async function listApprovalRequests(input = {}, caller = {}) {
  const scope = await authorizeWorkflowAction('approval.request.read', input, caller);
  const filter = { organizationId: scope.organizationId };
  if (scope.workspaceId) filter.workspaceId = scope.workspaceId;
  if (input.status) filter.status = String(input.status).toUpperCase();
  if (input.requesterActorId) filter.requesterActorId = cleanString(input.requesterActorId);
  const items = await ApprovalRequest.find(filter).sort({ requestedAt: -1 }).limit(100).lean();
  return { items: items.map((item) => serializeApprovalRequest(item)) };
}

async function cancelApprovalRequest(approvalRequestId, input = {}, caller = {}) {
  const scope = await authorizeWorkflowAction(
    'approval.request.cancel',
    input,
    caller,
    approvalRequestId,
  );
  const request = await ApprovalRequest.findOneAndUpdate(
    {
      approvalRequestId,
      organizationId: scope.organizationId,
      status: { $in: ['PENDING', 'PARTIALLY_APPROVED', 'APPROVED'] },
    },
    {
      $set: { status: 'CANCELLED', invalidationReasonCode: 'APPROVAL_CANCELLED' },
      $inc: { revision: 1 },
    },
    { new: true },
  );
  if (!request)
    throw approvalError(
      404,
      ErrorCodes.APPROVAL_REQUEST_NOT_FOUND,
      APPROVAL_REASON_CODES.NOT_FOUND,
      'Open approval request was not found.',
    );
  await ApprovalGrant.updateOne(
    { approvalRequestId, organizationId: scope.organizationId, status: 'ACTIVE' },
    { $set: { status: 'REVOKED', revokedAt: new Date() } },
  );
  await audit('approval.request.cancelled', 'ApprovalRequest', approvalRequestId, scope, {
    status: 'CANCELLED',
  });
  return serializeApprovalRequest(request);
}

async function invalidateApprovalRequest(approvalRequestId, reasonCode, options = {}) {
  const updated = await ApprovalRequest.findOneAndUpdate(
    {
      approvalRequestId,
      organizationId: options.organizationId,
      status: { $in: ['PENDING', 'PARTIALLY_APPROVED', 'APPROVED'] },
    },
    {
      $set: {
        status: 'INVALIDATED',
        invalidationReasonCode: reasonCode || APPROVAL_REASON_CODES.INVALIDATED,
      },
      $inc: { revision: 1 },
    },
    { new: true },
  );
  if (!updated) return null;
  await ApprovalGrant.updateOne(
    { approvalRequestId, organizationId: options.organizationId, status: 'ACTIVE' },
    { $set: { status: 'INVALIDATED', revokedAt: new Date() } },
  );
  metrics.increment('approval_requests_invalidated', {
    reason: reasonCode || APPROVAL_REASON_CODES.INVALIDATED,
  });
  await createNotification({
    organizationId: updated.organizationId,
    workspaceId: updated.workspaceId,
    recipientActorId: updated.requesterActorId,
    type: 'APPROVAL_INVALIDATED',
    approvalRequestId: updated.approvalRequestId,
    title: 'Approval invalidated',
    safeSummary: `Approval invalidated for ${updated.permission}`,
  });
  await audit(
    'approval.request.invalidated',
    'ApprovalRequest',
    approvalRequestId,
    {
      organizationId: updated.organizationId,
      workspaceId: updated.workspaceId,
      actorId: options.actorId || 'system:approval',
      actorType: options.actorType || 'system',
      requestId: options.requestId,
      traceId: options.traceId,
    },
    { status: 'INVALIDATED', reasonCode },
  );
  return updated;
}

function requestIdsFromAction(action) {
  return [
    ...new Set(
      [...(action.approvalRequestIds || []), action.approvalRequestId].filter(Boolean).map(String),
    ),
  ];
}

async function validateGrantForWorkflow(action, workflow, options = {}) {
  const ids = requestIdsFromAction(action);
  if (!ids.length)
    throw approvalError(
      403,
      ErrorCodes.APPROVAL_REQUIRED,
      APPROVAL_REASON_CODES.REQUIRED,
      'Approval is required for this action.',
      { workflowId: workflow.stableWorkflowId, workflowVersion: workflow.version },
    );
  const request = await ApprovalRequest.findOne({
    approvalRequestId: { $in: ids },
    organizationId: String(action.organizationId),
    workflowId: workflow.stableWorkflowId,
    workflowVersion: workflow.version,
  });
  if (!request)
    throw approvalError(
      403,
      ErrorCodes.APPROVAL_REQUEST_NOT_FOUND,
      APPROVAL_REASON_CODES.NOT_FOUND,
      'A matching approval request was not found.',
    );
  if (request.workspaceId && String(request.workspaceId) !== String(action.workspaceId || ''))
    throw approvalError(
      403,
      ErrorCodes.APPROVAL_TENANT_MISMATCH,
      APPROVAL_REASON_CODES.TENANT_MISMATCH,
      'Approval scope does not match the action.',
    );
  if (new Date(request.expiresAt) <= new Date()) {
    await invalidateApprovalRequest(request.approvalRequestId, APPROVAL_REASON_CODES.EXPIRED, {
      organizationId: request.organizationId,
    });
    throw approvalError(
      403,
      ErrorCodes.APPROVAL_EXPIRED,
      APPROVAL_REASON_CODES.EXPIRED,
      'Approval has expired.',
    );
  }
  if (request.status !== 'APPROVED' && !(options.allowConsumed && request.status === 'CONSUMED')) {
    const reason =
      request.status === 'REJECTED'
        ? APPROVAL_REASON_CODES.REJECTED
        : request.status === 'INVALIDATED'
          ? APPROVAL_REASON_CODES.INVALIDATED
          : APPROVAL_REASON_CODES.PENDING;
    throw approvalError(
      403,
      ErrorCodes[reason] || ErrorCodes.APPROVAL_PENDING,
      reason,
      'Approval is not valid for execution.',
    );
  }
  const fingerprint = actionFingerprint(action, workflow);
  if (request.requestFingerprint !== fingerprint.digest) {
    await invalidateApprovalRequest(
      request.approvalRequestId,
      APPROVAL_REASON_CODES.FINGERPRINT_MISMATCH,
      { organizationId: request.organizationId },
    );
    throw approvalError(
      403,
      ErrorCodes.APPROVAL_FINGERPRINT_MISMATCH,
      APPROVAL_REASON_CODES.FINGERPRINT_MISMATCH,
      'Approval fingerprint does not match the action.',
    );
  }
  const grant = await ApprovalGrant.findOne({
    approvalRequestId: request.approvalRequestId,
    organizationId: request.organizationId,
  });
  if (!grant || grant.requestFingerprint !== fingerprint.digest)
    throw approvalError(
      403,
      ErrorCodes.APPROVAL_INVALIDATED,
      APPROVAL_REASON_CODES.INVALIDATED,
      'Approval grant is unavailable.',
    );
  if (grant.status !== 'ACTIVE' && !(options.allowConsumed && grant.status === 'CONSUMED')) {
    const reason =
      grant.status === 'CONSUMED'
        ? APPROVAL_REASON_CODES.GRANT_CONSUMED
        : APPROVAL_REASON_CODES.INVALIDATED;
    throw approvalError(
      403,
      ErrorCodes[reason] || ErrorCodes.APPROVAL_INVALIDATED,
      reason,
      'Approval grant is not active.',
    );
  }
  if (
    String(grant.requesterActorId) !== String(action.requesterActorId) ||
    grant.resourceId !== action.resourceId ||
    grant.permission !== action.permission
  ) {
    throw approvalError(
      403,
      ErrorCodes.APPROVAL_FINGERPRINT_MISMATCH,
      APPROVAL_REASON_CODES.FINGERPRINT_MISMATCH,
      'Approval grant is bound to another action.',
    );
  }
  const decisions = await ApprovalDecision.find({
    organizationId: request.organizationId,
    approvalRequestId: request.approvalRequestId,
    decision: 'APPROVE',
  }).lean();
  for (const decision of decisions) {
    const activeApprover = await approverIdentity(request.organizationId, decision.approverActorId);
    if (!activeApprover) {
      await invalidateApprovalRequest(
        request.approvalRequestId,
        APPROVAL_REASON_CODES.APPROVER_NOT_ELIGIBLE,
        { organizationId: request.organizationId },
      );
      throw approvalError(
        403,
        ErrorCodes.APPROVAL_INVALIDATED,
        APPROVAL_REASON_CODES.APPROVER_NOT_ELIGIBLE,
        'An approver is no longer eligible.',
      );
    }
  }
  return { request, grant, fingerprint };
}

async function enforceApproval(action = {}, options = {}) {
  const evaluation = await evaluateApprovalRequirement(action, options);
  if (!evaluation.required) return { required: false, decision: 'ALLOW', approvals: [] };
  const approvals = [];
  for (const workflow of evaluation.workflows)
    approvals.push(await validateGrantForWorkflow(action, workflow, options));
  return { required: true, decision: 'ALLOW_WITH_APPROVAL', approvals };
}

async function consumeApprovalGrants(enforcement, options = {}) {
  if (!enforcement?.required) return enforcement;
  const consumed = [];
  for (const approved of enforcement.approvals) {
    const operationType = String(approved.request.operationType || '').toUpperCase();
    const operation =
      operationType.includes('REACTIVAT') ||
      operationType.includes('SUSPEND') ||
      operationType.includes('ARCHIV')
        ? 'LIFECYCLE_CONTROL'
        : operationType.includes('MAINTENANCE')
          ? 'MAINTENANCE_CONTROL'
          : operationType.includes('DELETION')
            ? 'DELETION_CONTROL'
            : operationType.includes('INVOCATION') || operationType.includes('RECOVERY_RETRY')
              ? 'EXECUTION'
              : 'MUTATION';
    await assertOperationalAccess({
      organizationId: approved.request.organizationId,
      workspaceId: approved.request.workspaceId,
      operation,
      existingClaim: options.allowConsumed === true,
    });
    if (approved.grant.status === 'CONSUMED') {
      consumed.push(approved);
      continue;
    }
    if (!approved.grant.singleUse) {
      consumed.push(approved);
      continue;
    }
    let grant;
    await mongoose.connection.transaction(async (session) => {
      grant = await ApprovalGrant.findOneAndUpdate(
        { _id: approved.grant._id, status: 'ACTIVE', expiresAt: { $gt: new Date() } },
        { $set: { status: 'CONSUMED', consumedAt: new Date() } },
        { new: true, session },
      );
      if (!grant)
        throw approvalError(
          409,
          ErrorCodes.APPROVAL_GRANT_ALREADY_CONSUMED,
          APPROVAL_REASON_CODES.GRANT_CONSUMED,
          'Approval grant was already consumed.',
        );
      const requestUpdate = await ApprovalRequest.updateOne(
        { _id: approved.request._id, status: 'APPROVED' },
        { $set: { status: 'CONSUMED' }, $inc: { revision: 1 } },
        { session },
      );
      if (requestUpdate.modifiedCount !== 1) {
        throw approvalError(
          409,
          ErrorCodes.APPROVAL_GRANT_ALREADY_CONSUMED,
          APPROVAL_REASON_CODES.GRANT_CONSUMED,
          'Approval request was already consumed.',
        );
      }
    });
    await audit(
      'approval.grant.consumed',
      'ApprovalRequest',
      approved.request.approvalRequestId,
      {
        organizationId: approved.request.organizationId,
        workspaceId: approved.request.workspaceId,
        actorId: options.actorId || approved.request.requesterActorId,
        actorType: options.actorType || 'user',
        requestId: options.requestId,
        traceId: options.traceId,
      },
      {
        permission: approved.request.permission,
        resourceType: approved.request.resourceType,
        resourceId: approved.request.resourceId,
      },
    );
    consumed.push({ ...approved, grant });
  }
  return { ...enforcement, approvals: consumed };
}

async function releaseQueuedWorkForApproval(approvalRequestId, options = {}) {
  const request = await ApprovalRequest.findOne({
    approvalRequestId,
    organizationId: options.organizationId,
    status: 'APPROVED',
  }).lean();
  if (!request?.invocationId) return null;
  const workItem = await RuntimeWorkItem.findOneAndUpdate(
    {
      invocationId: request.invocationId,
      organizationId: request.organizationId,
      status: 'waiting_for_approval',
    },
    { $set: { status: 'pending', availableAt: new Date(), approvalRequestId } },
    { new: true },
  );
  if (workItem)
    await Invocation.updateOne(
      { _id: request.invocationId, lifecycleState: 'waiting_for_approval' },
      { $set: { lifecycleState: 'authorized', status: 'queued', approvalRequestId } },
    );
  return workItem;
}

async function markApprovedExecutionFailure(enforcement, options = {}) {
  if (!enforcement?.required) return { updated: 0 };
  let updated = 0;
  for (const approved of enforcement.approvals || []) {
    if (approved.grant?.status !== 'CONSUMED') continue;
    const request = await ApprovalRequest.findOneAndUpdate(
      {
        approvalRequestId: approved.request.approvalRequestId,
        organizationId: approved.request.organizationId,
        status: 'CONSUMED',
      },
      {
        $set: {
          status: options.recoveryRequired ? 'RECOVERY_REQUIRED' : 'EXECUTION_FAILED',
          invalidationReasonCode: options.reasonCode || 'APPROVED_EXECUTION_FAILED',
        },
        $inc: { revision: 1 },
      },
      { new: true },
    );
    if (!request) continue;
    updated += 1;
    await createNotification({
      organizationId: request.organizationId,
      workspaceId: request.workspaceId,
      recipientActorId: request.requesterActorId,
      type: options.recoveryRequired ? 'RECOVERY_REQUIRED' : 'EXECUTION_FAILED_AFTER_APPROVAL',
      approvalRequestId: request.approvalRequestId,
      title: options.recoveryRequired ? 'Recovery required' : 'Execution failed after approval',
      safeSummary: `${request.permission} did not complete after approval`,
    });
    await audit(
      options.recoveryRequired
        ? 'approval.execution.recovery_required'
        : 'approval.execution.failed',
      'ApprovalRequest',
      request.approvalRequestId,
      {
        organizationId: request.organizationId,
        workspaceId: request.workspaceId,
        actorId: options.actorId || request.requesterActorId,
        actorType: options.actorType || request.requesterActorType,
        requestId: options.requestId,
        traceId: options.traceId,
      },
      { reasonCode: options.reasonCode || 'APPROVED_EXECUTION_FAILED' },
    );
  }
  return { updated };
}

async function listNotifications(input = {}, caller = {}) {
  const scope = await authorizeWorkflowAction('approval.request.read', input, caller);
  const filter = { organizationId: scope.organizationId };
  if (scope.workspaceId) filter.workspaceId = scope.workspaceId;
  if (input.recipientActorId) filter.recipientActorId = cleanString(input.recipientActorId);
  const items = await ComplianceNotification.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return { items };
}

module.exports = {
  actionFingerprint,
  activateWorkflow,
  cancelApprovalRequest,
  consumeApprovalGrants,
  createApprovalRequest,
  createWorkflowDraft,
  createWorkflowVersion,
  decideApprovalRequest,
  enforceApproval,
  evaluateApprovalRequirement,
  expireIfNeeded,
  getApprovalRequest,
  getWorkflow,
  invalidateApprovalRequest,
  listApprovalRequests,
  listNotifications,
  listWorkflows,
  markApprovedExecutionFailure,
  releaseQueuedWorkForApproval,
  registerNotificationDeliveryAdapter,
  retireWorkflow,
  serializeApprovalRequest,
  serializeWorkflow,
  updateWorkflowDraft,
  validateGrantForWorkflow,
  validateWorkflowDefinition,
  workflowMatches,
};
