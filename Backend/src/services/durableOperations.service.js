const mongoose = require('mongoose');
const PassportConnection = require('../models/PassportConnection');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const durableWork = require('./durableWork.service');
const { createAuditLog } = require('./auditService');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { actorFromPartner, assertAuthorized } = require('./authorization.service');
const { assertOperationalAccess } = require('./operationalState.service');

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_WORK_STATUSES = new Set([
  'pending',
  'claimed',
  'running',
  'retry_preparing',
  'retry_scheduled',
  'cancellation_requested',
  'cancelled',
  'completed',
  'failed',
  'recovery_required',
  'dead_lettered',
]);
const SAFE_WORK_TYPES = new Set(['runtime_invocation', 'recovery_retry']);
const SAFE_WORK_STAGES = new Set([
  'work_claimed',
  'validation_completed',
  'credentials_loaded',
  'outbound_transmission_started',
  'outbound_response_received',
  'response_validated',
  'finalization_started',
  'invocation_persisted',
]);
const SAFE_RECOVERY_REASONS = new Set([
  'WORKER_TERMINATED_BEFORE_TRANSMISSION',
  'LEASE_EXPIRED_BEFORE_TRANSMISSION',
  'LEASE_EXPIRED_AFTER_TRANSMISSION',
  'WORKER_LOST_DURING_REMOTE_EXECUTION',
  'WORKER_LOST_DURING_FINALIZATION',
  'RESULT_PERSISTENCE_UNCERTAIN',
  'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
]);
const SAFE_WORKER_HEALTH_STATUSES = new Set([
  'healthy',
  'draining',
  'worker_heartbeat_stale',
  'no_active_worker',
]);

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function safeObjectId(value) {
  const normalized = idOf(value);
  return mongoose.isValidObjectId(normalized) ? normalized : '';
}

function safeDate(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function safeCode(value) {
  return SAFE_CODE_PATTERN.test(String(value || '')) ? String(value) : undefined;
}

function validationError(path, message) {
  return new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
    { path, message },
  ]);
}

function requiredIdentityText(value, path) {
  const normalized = String(value || '').trim();
  if (!normalized) throw validationError(path, `${path} is required.`);
  return normalized;
}

function optionalObjectId(value, path) {
  if (value === undefined || value === null || value === '') return undefined;
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(404, ErrorCodes.CONNECTION_NOT_FOUND, 'Operations scope was not found.');
  }
  return String(value);
}

function positiveInteger(value, path, { fallback, maximum = 100 } = {}) {
  const normalized =
    value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > maximum) {
    throw validationError(path, `${path} must be an integer between 1 and ${maximum}.`);
  }
  return normalized;
}

function nonNegativeInteger(value, path) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw validationError(path, `${path} must be a non-negative integer.`);
  }
  return normalized;
}

function partnerIdFrom(actor = {}) {
  return actor?.partner?._id || actor?.partnerId;
}

async function authorizeDurableOperationsScope(input = {}, actor = {}) {
  const partnerId = partnerIdFrom(actor);
  if (!partnerId || !mongoose.isValidObjectId(partnerId)) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      'Authenticated Partner access is required.',
    );
  }
  const receivingWorkspaceId = requiredIdentityText(
    input.receivingWorkspaceId,
    'receivingWorkspaceId',
  );
  const receivingUserId = requiredIdentityText(input.receivingUserId, 'receivingUserId');
  const connectionId = optionalObjectId(input.connectionId, 'connectionId');
  const filter = {
    partnerId,
    receivingWorkspaceId,
    receivingUserId,
    ...(connectionId ? { _id: connectionId } : {}),
  };
  const connections = await PassportConnection.find(filter).select('_id').lean();
  if (!connections.length) {
    throw new AppError(404, ErrorCodes.CONNECTION_NOT_FOUND, 'Operations scope was not found.');
  }
  await assertAuthorized(
    actorFromPartner(actor.partner || { _id: partnerId }, { workspaceId: receivingWorkspaceId }),
    'operations.read',
    {
      type: 'Operations',
      id: receivingWorkspaceId,
      partnerId,
      organizationId: partnerId,
      workspaceId: receivingWorkspaceId,
    },
    {
      requestId: actor.requestId,
      traceId: actor.traceId,
      workspaceId: receivingWorkspaceId,
      auditDecision: false,
    },
  );
  return {
    partnerId: idOf(partnerId),
    receivingWorkspaceId,
    receivingUserId,
    connectionId,
    connectionIds: connections.map((connection) => idOf(connection)),
  };
}

function requireAuthorizedScope(actor = {}) {
  const scope = actor.operationsScope;
  if (
    !scope ||
    !mongoose.isValidObjectId(scope.partnerId) ||
    !String(scope.receivingWorkspaceId || '').trim() ||
    !String(scope.receivingUserId || '').trim()
  ) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      'Authenticated operations scope is required.',
    );
  }
  return scope;
}

async function requireOperationsPermission(permission, actor = {}) {
  const scope = requireAuthorizedScope(actor);
  await assertAuthorized(
    actorFromPartner(actor.partner || { _id: scope.partnerId }, {
      workspaceId: scope.receivingWorkspaceId,
    }),
    permission,
    {
      type: 'Operations',
      id: scope.connectionId || scope.receivingWorkspaceId,
      partnerId: scope.partnerId,
      organizationId: scope.partnerId,
      workspaceId: scope.receivingWorkspaceId,
    },
    {
      requestId: actor.requestId,
      traceId: actor.traceId,
      workspaceId: scope.receivingWorkspaceId,
      auditDecision: false,
    },
  );
  return scope;
}

function safeWorkItem(value = {}) {
  return {
    workItemId: safeObjectId(value.workItemId || value),
    invocationId: safeObjectId(value.invocationId),
    connectionId: safeObjectId(value.connectionId),
    workType: SAFE_WORK_TYPES.has(value.workType) ? value.workType : 'unknown',
    status: SAFE_WORK_STATUSES.has(value.status) ? value.status : 'unknown',
    safeStage: SAFE_WORK_STAGES.has(value.safeStage) ? value.safeStage : undefined,
    attemptNumber: Number(value.attemptNumber || 0),
    executionGeneration: Number(value.executionGeneration || 0),
    retryCount: Number(value.retryCount || 0),
    maximumAttempts: Number(value.maximumAttempts || 0),
    availableAt: safeDate(value.availableAt),
    claimedAt: safeDate(value.claimedAt),
    startedAt: safeDate(value.startedAt),
    completedAt: safeDate(value.completedAt),
    failedAt: safeDate(value.failedAt),
    cancelledAt: safeDate(value.cancelledAt),
    deadLetteredAt: safeDate(value.deadLetteredAt),
    leaseExpiresAt: safeDate(value.leaseExpiresAt),
    recoveryReasonCode: SAFE_RECOVERY_REASONS.has(value.recoveryReasonCode)
      ? value.recoveryReasonCode
      : undefined,
    cancellationReasonCode: safeCode(value.cancellationReasonCode),
    createdAt: safeDate(value.createdAt),
    updatedAt: safeDate(value.updatedAt),
    version: Number(value.version || 0),
  };
}

function durableIdentity(input, actor) {
  const scope = requireAuthorizedScope(actor);
  return {
    partnerId: scope.partnerId,
    receivingWorkspaceId: scope.receivingWorkspaceId,
    ...(scope.connectionId ? { connectionId: scope.connectionId } : {}),
    ...(input?.connectionId ? { connectionId: scope.connectionId } : {}),
  };
}

function listInput(input, actor) {
  const identity = durableIdentity(input, actor);
  const page = positiveInteger(input?.page, 'page', { fallback: 1, maximum: 1_000_000 });
  const limit = positiveInteger(input?.limit, 'limit', { fallback: 25, maximum: 100 });
  const result = { ...identity, page, limit };
  if (input?.invocationId) {
    if (!mongoose.isValidObjectId(input.invocationId)) {
      throw validationError('invocationId', 'invocationId must be a valid identifier.');
    }
    result.invocationId = String(input.invocationId);
  }
  if (input?.status) {
    const statuses = Array.isArray(input.status) ? input.status : String(input.status).split(',');
    if (!statuses.length || statuses.some((status) => !SAFE_WORK_STATUSES.has(status))) {
      throw validationError('status', 'status contains an unapproved work state.');
    }
    result.status = statuses;
  }
  return result;
}

function safeWorkMetrics(metrics = {}) {
  return {
    counts: Object.fromEntries(
      [...SAFE_WORK_STATUSES].map((status) => [
        status,
        Math.max(0, Number(metrics?.counts?.[status] || 0)),
      ]),
    ),
    dueExecutableCount: Math.max(0, Number(metrics?.dueExecutableCount || 0)),
    abandonedLeaseCount: Math.max(0, Number(metrics?.abandonedLeaseCount || 0)),
    oldestPendingAgeMs: Math.max(0, Number(metrics?.oldestPendingAgeMs || 0)),
    averageQueueWaitMs: Math.max(0, Number(metrics?.averageQueueWaitMs || 0)),
  };
}

async function getDurableWorkOverview(input = {}, actor = {}) {
  await requireOperationsPermission('worker.read', actor);
  const query = listInput(input, actor);
  const metricIdentity = durableIdentity(input, actor);
  const [listing, metrics] = await Promise.all([
    durableWork.listWorkItems(query),
    durableWork.durableWorkMetrics(metricIdentity),
  ]);
  return {
    items: (listing.items || []).map(safeWorkItem),
    pagination: listing.pagination,
    metrics: safeWorkMetrics(metrics),
  };
}

async function getDurableWorkMetrics(input = {}, actor = {}) {
  await requireOperationsPermission('worker.read', actor);
  const metrics = await durableWork.durableWorkMetrics(durableIdentity(input, actor));
  return safeWorkMetrics(metrics);
}

async function getRuntimeWorkerHealth(_input = {}, actor = {}) {
  await requireOperationsPermission('worker.read', actor);
  const health = await durableWork.aggregateWorkerHealth();
  return {
    status: SAFE_WORKER_HEALTH_STATUSES.has(health.status) ? health.status : 'unavailable',
    activeWorkers: Math.max(0, Number(health.activeWorkers || 0)),
    readyWorkers: Math.max(0, Number(health.readyWorkers || 0)),
    drainingWorkers: Math.max(0, Number(health.drainingWorkers || 0)),
    staleWorkers: Math.max(0, Number(health.staleWorkers || 0)),
    activeWorkCount: Math.max(0, Number(health.activeWorkCount || 0)),
    lastHeartbeatAt: safeDate(health.lastHeartbeatAt) || null,
    staleAfterMs: Math.max(0, Number(health.staleAfterMs || 0)),
  };
}

async function auditAdminAction(action, entityType, entityId, scope, actor, metadata = {}) {
  return createAuditLog(
    'partner',
    idOf(actor.partner),
    action,
    entityType,
    entityId,
    {
      receivingWorkspaceId: scope.receivingWorkspaceId,
      receivingUserId: scope.receivingUserId,
      ...(scope.connectionId ? { connectionId: scope.connectionId } : {}),
      ...metadata,
    },
    { requestId: actor.requestId, traceId: actor.traceId },
  );
}

async function scanDurableAbandonedWork(input = {}, actor = {}) {
  const scope = await requireOperationsPermission('worker.manage', actor);
  await assertOperationalAccess({
    organizationId: scope.partnerId,
    partnerId: scope.partnerId,
    workspaceId: scope.receivingWorkspaceId,
    connectionId: scope.connectionId,
    operation: 'MUTATION',
  });
  const limit = positiveInteger(input.limit, 'limit', { fallback: 25, maximum: 100 });
  await auditAdminAction(
    'durable_work.abandoned_scan_requested',
    'RuntimeWorkQueue',
    scope.receivingWorkspaceId,
    scope,
    actor,
    { limit },
  );
  const result = await durableWork.scanAbandonedWork({
    ...durableIdentity(input, actor),
    limit,
  });
  return {
    scanned: Math.max(0, Number(result.scanned || 0)),
    safelyRecovered: Math.max(0, Number(result.safelyRecovered || 0)),
    recoveryRequired: Math.max(0, Number(result.recoveryRequired || 0)),
    deadLettered: Math.max(0, Number(result.deadLettered || 0)),
    cancelled: Math.max(0, Number(result.cancelled || 0)),
    terminalReconciled: Math.max(0, Number(result.terminalReconciled || 0)),
    conflicts: Math.max(0, Number(result.conflicts || 0)),
  };
}

async function reconcileDurableWork(input = {}, actor = {}) {
  const scope = await requireOperationsPermission('worker.manage', actor);
  await assertOperationalAccess({
    organizationId: scope.partnerId,
    partnerId: scope.partnerId,
    workspaceId: scope.receivingWorkspaceId,
    connectionId: scope.connectionId,
    operation: 'MUTATION',
  });
  const limit = positiveInteger(input.limit, 'limit', { fallback: 25, maximum: 100 });
  await auditAdminAction(
    'durable_work.reconciliation_requested',
    'RuntimeWorkQueue',
    scope.receivingWorkspaceId,
    scope,
    actor,
    { limit },
  );
  const result = await durableWork.reconcileAcceptedInvocations({
    ...durableIdentity(input, actor),
    limit,
  });
  return {
    scanned: Math.max(0, Number(result.scanned || 0)),
    created: Math.max(0, Number(result.created || 0)),
    existing: Math.max(0, Number(result.existing || 0)),
    skipped: Math.max(0, Number(result.skipped || 0)),
  };
}

async function findIdempotentlyRequeued(workItemId, identity, version) {
  const item = await RuntimeWorkItem.findOne({
    _id: workItemId,
    ...identity,
    requeueCount: 1,
    version: { $gt: version },
    retryDecisionReason: 'OPERATOR_REQUEUE_PRETRANSMISSION',
  }).lean();
  return item ? safeWorkItem(item) : null;
}

async function requeueDurableDeadLetter(workItemId, input = {}, actor = {}) {
  if (!mongoose.isValidObjectId(workItemId)) {
    throw new AppError(404, ErrorCodes.DURABLE_WORK_NOT_FOUND, 'Dead-letter work was not found.');
  }
  const scope = await requireOperationsPermission('worker.manage', actor);
  await assertOperationalAccess({
    organizationId: scope.partnerId,
    partnerId: scope.partnerId,
    workspaceId: scope.receivingWorkspaceId,
    connectionId: scope.connectionId,
    operation: 'QUEUE_SUBMISSION',
  });
  if (!scope.connectionId) {
    throw validationError('connectionId', 'connectionId is required for dead-letter requeue.');
  }
  const version = nonNegativeInteger(input.version, 'version');
  const identity = durableIdentity(input, actor);
  await auditAdminAction(
    'durable_work.dead_letter_requeue_requested',
    'RuntimeWorkItem',
    String(workItemId),
    scope,
    actor,
    { version },
  );
  const prior = await findIdempotentlyRequeued(workItemId, identity, version);
  if (prior) return { workItem: prior, alreadyRequeued: true };
  try {
    const result = await durableWork.requeueDeadLetter({
      ...identity,
      workItemId: String(workItemId),
      version,
    });
    return { workItem: safeWorkItem(result.safe || result.workItem), alreadyRequeued: false };
  } catch (error) {
    if (
      [ErrorCodes.DURABLE_WORK_NOT_FOUND, ErrorCodes.DURABLE_WORK_REQUEUE_DENIED].includes(
        error?.code,
      )
    ) {
      const concurrent = await findIdempotentlyRequeued(workItemId, identity, version);
      if (concurrent) return { workItem: concurrent, alreadyRequeued: true };
    }
    throw error;
  }
}

module.exports = {
  authorizeDurableOperationsScope,
  getDurableWorkOverview,
  getDurableWorkMetrics,
  getRuntimeWorkerHealth,
  scanDurableAbandonedWork,
  reconcileDurableWork,
  requeueDurableDeadLetter,
  safeWorkItem,
};
