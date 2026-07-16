const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { env } = require('../config/env');
const { MAX_INVOCATION_STATE_HISTORY } = require('../constants/invocationLifecycle');
const {
  CLAIMABLE_DURABLE_WORK_STATUSES,
  DURABLE_MILESTONE_STATUSES,
  DURABLE_OUTBOX_EVENT_TYPES,
  DURABLE_RECOVERY_REASONS,
  DURABLE_WORK_MILESTONES,
  DURABLE_WORK_OPERATIONS,
  DURABLE_WORK_STATUSES,
  DURABLE_WORK_TYPES,
  OWNED_DURABLE_WORK_STATUSES,
  RUNTIME_WORKER_HEARTBEAT_RETENTION_MS,
  RUNTIME_WORKER_STATUSES,
  TERMINAL_DURABLE_WORK_STATUSES,
} = require('../constants/durableWork');
const DurableEventOutbox = require('../models/DurableEventOutbox');
const Invocation = require('../models/Invocation');
const InvocationAttempt = require('../models/InvocationAttempt');
const PassportConnection = require('../models/PassportConnection');
const RuntimeWorkerHeartbeat = require('../models/RuntimeWorkerHeartbeat');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { retryPolicyDecision } = require('../utils/retryPolicy');
const { logger } = require('../utils/logger');
const {
  canTransition,
  legacyStatusForState,
  transitionHistoryEntry,
} = require('./invocationLifecycle.service');

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_METADATA_KEYS = new Set([
  'reasonCode',
  'recoveryReasonCode',
  'cancellationReasonCode',
  'workStatus',
  'safeStage',
  'attemptNumber',
  'executionGeneration',
  'retryCount',
]);
const ENQUEUE_KEYS = new Set([
  'partnerId',
  'organizationId',
  'receivingWorkspaceId',
  'workspaceId',
  'invocationId',
  'connectionId',
  'credentialBindingId',
  'credentialRequirement',
  'attemptNumber',
  'workType',
  'executionGeneration',
  'traceId',
  'priority',
  'availableAt',
  'maximumAttempts',
  'safeOperation',
  'status',
  'approvalRequestId',
  'retryCount',
  'retryDecisionReason',
  'recoveryReasonCode',
]);
const FINALIZE_KEYS = new Set([
  'status',
  'lastErrorCode',
  'retryDecisionReason',
  'recoveryReasonCode',
]);
const OUTBOX_KEYS = new Set([
  'eventType',
  'partnerId',
  'organizationId',
  'receivingWorkspaceId',
  'workspaceId',
  'invocationId',
  'workItemId',
  'connectionId',
  'traceId',
  'safeMetadata',
  'dedupeQualifier',
]);
const RETRY_INPUT_KEYS = new Set([
  'errorCode',
  'code',
  'operation',
  'httpMethod',
  'method',
  'providerHttpStatus',
  'statusCode',
  'retryable',
  'errorName',
  'capabilityRetryPolicy',
  'clientIdempotencyProvided',
  'idempotencySupported',
  'remoteIdempotencyAcknowledged',
  'mayCreateExternalSideEffects',
]);
const FINALIZE_STATUSES = new Set([
  'cancelled',
  'completed',
  'failed',
  'recovery_required',
  'dead_lettered',
]);
const INVOCATION_TERMINAL_STATES = new Set(['succeeded', 'failed', 'cancelled', 'timed_out']);

function validationError(path, message) {
  return new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Durable work validation failed.', [
    { path, message },
  ]);
}

function assertAllowedKeys(value, allowed, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError(path, `${path} must be an object.`);
  }
  const unsupported = Object.keys(value).find((key) => !allowed.has(key));
  if (unsupported) {
    throw validationError(`${path}.${unsupported}`, `${unsupported} is not an approved field.`);
  }
}

function safeIdentifier(value, path, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (!required) return undefined;
    throw validationError(path, `${path} is required.`);
  }
  const normalized = String(value).trim();
  if (!SAFE_IDENTIFIER_PATTERN.test(normalized)) {
    throw validationError(path, `${path} must be a safe identifier.`);
  }
  return normalized;
}

function requiredIdentityString(value, path) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw validationError(path, `${path} is required.`);
  return normalized;
}

function objectId(value, path) {
  if (!mongoose.isValidObjectId(value)) {
    throw validationError(path, `${path} must be a valid identifier.`);
  }
  return value;
}

function safeCode(value, path, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (!required) return undefined;
    throw validationError(path, `${path} is required.`);
  }
  const normalized = String(value).trim().toUpperCase();
  if (!SAFE_CODE_PATTERN.test(normalized)) {
    throw validationError(path, `${path} must be a safe reason code.`);
  }
  return normalized;
}

function integer(value, path, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < minimum || normalized > maximum) {
    throw validationError(path, `${path} must be an integer between ${minimum} and ${maximum}.`);
  }
  return normalized;
}

function dateValue(value, path, fallback) {
  const date = value === undefined ? new Date(fallback ?? Date.now()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw validationError(path, `${path} must be a valid date.`);
  return date;
}

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function plain(value) {
  return typeof value?.toObject === 'function' ? value.toObject() : value;
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(String(value)).digest('hex')}`;
}

function leaseTokenHash(rawToken) {
  if (typeof rawToken !== 'string' || rawToken.length < 32 || rawToken.length > 256) {
    throw validationError('leaseToken', 'leaseToken must be the raw token returned by claim.');
  }
  return sha256(rawToken);
}

function tenantIdentity(input) {
  return {
    partnerId: objectId(input.partnerId, 'partnerId'),
    organizationId:
      input.organizationId === undefined ||
      input.organizationId === null ||
      input.organizationId === ''
        ? objectId(input.partnerId, 'partnerId')
        : objectId(input.organizationId, 'organizationId'),
    receivingWorkspaceId: requiredIdentityString(
      input.receivingWorkspaceId ?? input.workspaceId,
      'receivingWorkspaceId',
    ),
    connectionId: objectId(input.connectionId, 'connectionId'),
  };
}

function tenantScope(input) {
  const scope = {
    partnerId: objectId(input.partnerId, 'partnerId'),
    ...(input.organizationId
      ? { organizationId: objectId(input.organizationId, 'organizationId') }
      : {}),
    receivingWorkspaceId: requiredIdentityString(
      input.receivingWorkspaceId ?? input.workspaceId,
      'receivingWorkspaceId',
    ),
  };
  if (
    input.connectionId !== undefined &&
    input.connectionId !== null &&
    input.connectionId !== ''
  ) {
    scope.connectionId = objectId(input.connectionId, 'connectionId');
  }
  return scope;
}

function optionalTenantScope(input) {
  const supplied =
    input.partnerId !== undefined ||
    input.receivingWorkspaceId !== undefined ||
    input.workspaceId !== undefined ||
    input.connectionId !== undefined;
  return supplied ? tenantScope(input) : {};
}

function deterministicDedupeKey(input) {
  const identity = tenantIdentity(input);
  const invocationId = objectId(input.invocationId, 'invocationId');
  const executionGeneration = integer(input.executionGeneration, 'executionGeneration', {
    minimum: 1,
  });
  const workType = String(input.workType || '');
  if (!DURABLE_WORK_TYPES.includes(workType)) {
    throw validationError('workType', 'workType is not approved.');
  }
  return sha256(
    [
      'durable-work-v1',
      idOf(identity.partnerId),
      identity.receivingWorkspaceId,
      idOf(identity.connectionId),
      idOf(invocationId),
      executionGeneration,
      workType,
    ].join('\u0000'),
  );
}

function deterministicOutboxKey(input, safeMetadata) {
  return sha256(
    [
      'durable-outbox-v1',
      input.eventType,
      idOf(input.partnerId),
      input.receivingWorkspaceId,
      idOf(input.invocationId),
      idOf(input.workItemId),
      safeMetadata.attemptNumber || 0,
      safeMetadata.executionGeneration || 0,
      safeMetadata.reasonCode || '',
      safeMetadata.safeStage || '',
      input.dedupeQualifier || '',
    ].join('\u0000'),
  );
}

function safeOutboxMetadata(input = {}) {
  assertAllowedKeys(input, SAFE_METADATA_KEYS, 'safeMetadata');
  const result = {};
  if (input.reasonCode !== undefined) {
    result.reasonCode = safeCode(input.reasonCode, 'safeMetadata.reasonCode', { required: true });
  }
  if (input.recoveryReasonCode !== undefined) {
    result.recoveryReasonCode = safeCode(
      input.recoveryReasonCode,
      'safeMetadata.recoveryReasonCode',
      { required: true },
    );
  }
  if (input.cancellationReasonCode !== undefined) {
    result.cancellationReasonCode = safeCode(
      input.cancellationReasonCode,
      'safeMetadata.cancellationReasonCode',
      { required: true },
    );
  }
  if (input.workStatus !== undefined) {
    if (!DURABLE_WORK_STATUSES.includes(input.workStatus)) {
      throw validationError('safeMetadata.workStatus', 'workStatus is not approved.');
    }
    result.workStatus = input.workStatus;
  }
  if (input.safeStage !== undefined) {
    if (!DURABLE_WORK_MILESTONES.includes(input.safeStage)) {
      throw validationError('safeMetadata.safeStage', 'safeStage is not approved.');
    }
    result.safeStage = input.safeStage;
  }
  for (const key of ['attemptNumber', 'executionGeneration']) {
    if (input[key] !== undefined)
      result[key] = integer(input[key], `safeMetadata.${key}`, { minimum: 1 });
  }
  if (input.retryCount !== undefined) {
    result.retryCount = integer(input.retryCount, 'safeMetadata.retryCount', { minimum: 0 });
  }
  return result;
}

function sessionOption(options) {
  return options?.session ? { session: options.session } : {};
}

async function appendOutboxEvent(input, options = {}) {
  assertAllowedKeys(input, OUTBOX_KEYS, 'outboxEvent');
  if (!DURABLE_OUTBOX_EVENT_TYPES.includes(input.eventType)) {
    throw validationError('eventType', 'eventType is not approved.');
  }
  const identity = tenantIdentity(input);
  const safeMetadata = safeOutboxMetadata(input.safeMetadata || {});
  const traceId = safeIdentifier(input.traceId, 'traceId', { required: false });
  const dedupeQualifier = safeIdentifier(input.dedupeQualifier, 'dedupeQualifier', {
    required: false,
  });
  const document = {
    eventType: input.eventType,
    ...identity,
    invocationId: objectId(input.invocationId, 'invocationId'),
    workItemId: objectId(input.workItemId, 'workItemId'),
    ...(traceId ? { traceId } : {}),
    safeMetadata,
    ...(dedupeQualifier ? { dedupeQualifier } : {}),
  };
  const eventKey = deterministicOutboxKey(document, safeMetadata);
  const result = await DurableEventOutbox.updateOne(
    { eventKey },
    {
      $setOnInsert: {
        eventKey,
        eventType: document.eventType,
        partnerId: document.partnerId,
        receivingWorkspaceId: document.receivingWorkspaceId,
        invocationId: document.invocationId,
        workItemId: document.workItemId,
        connectionId: document.connectionId,
        ...(traceId ? { traceId } : {}),
        safeMetadata,
      },
    },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true, ...sessionOption(options) },
  );
  return { created: Boolean(result?.upsertedCount || result?.upsertedId), eventKey };
}

const DURABLE_OUTBOX_IMMEDIATE_ATTEMPTS = 2;

function safeOutboxFailureCode(error) {
  const candidate = String(error?.code || '')
    .trim()
    .toUpperCase();
  return SAFE_CODE_PATTERN.test(candidate) ? candidate : 'DURABLE_OUTBOX_WRITE_FAILED';
}

function workOutboxInput(work, eventType, metadata = {}) {
  const safeMetadata = safeOutboxMetadata({
    workStatus: work.status,
    attemptNumber: work.attemptNumber,
    executionGeneration: work.executionGeneration,
    retryCount: work.retryCount,
    ...(work.safeStage ? { safeStage: work.safeStage } : {}),
    ...metadata,
  });
  return {
    eventType,
    partnerId: work.partnerId,
    receivingWorkspaceId: work.receivingWorkspaceId,
    invocationId: work.invocationId,
    workItemId: work._id,
    connectionId: work.connectionId,
    traceId: work.traceId,
    safeMetadata,
  };
}

async function deferOutboxRepair(work, outboxInput, error, options = {}) {
  const reasonCode = safeOutboxFailureCode(error);
  const eventKey = deterministicOutboxKey(outboxInput, outboxInput.safeMetadata);
  try {
    await RuntimeWorkItem.updateOne(
      { _id: work._id },
      {
        $set: {
          outboxRepairRequiredAt: new Date(),
          outboxRepairReasonCode: reasonCode,
        },
        $addToSet: {
          outboxRepairEvents: {
            eventKey,
            eventType: outboxInput.eventType,
            ...outboxInput.safeMetadata,
          },
        },
        $inc: { outboxRepairAttempts: 1 },
      },
      { runValidators: true, ...sessionOption(options) },
    );
  } catch {
    // The bounded maintenance scan also examines recently updated work, so a marker write failure
    // cannot make an authoritative Work mutation fail or disclose the underlying database error.
  }
  (options.logger || logger).warn(
    {
      event: 'durable_outbox.write_deferred',
      eventType: outboxInput.eventType,
      workItemId: idOf(work),
      errorCode: reasonCode,
    },
    'Durable outbox persistence was deferred for repair',
  );
  return {
    created: false,
    deferred: true,
    attempts: DURABLE_OUTBOX_IMMEDIATE_ATTEMPTS,
    errorCode: reasonCode,
  };
}

async function outboxForWork(work, eventType, metadata = {}, options = {}) {
  if (options.outbox === false) return { created: false, skipped: true };
  const input = workOutboxInput(work, eventType, metadata);
  let lastError;
  for (let attempt = 1; attempt <= DURABLE_OUTBOX_IMMEDIATE_ATTEMPTS; attempt += 1) {
    try {
      return await appendOutboxEvent(input, options);
    } catch (error) {
      lastError = error;
    }
  }
  return deferOutboxRepair(work, input, lastError, options);
}

function repairRecord(work, eventType, metadata = {}) {
  const input = workOutboxInput(work, eventType, metadata);
  return {
    eventKey: deterministicOutboxKey(input, input.safeMetadata),
    eventType,
    ...input.safeMetadata,
  };
}

function inferredOutboxRepairRecords(work) {
  const records = [];
  const add = (eventType, metadata = {}) => records.push(repairRecord(work, eventType, metadata));
  const initialAttemptNumber =
    Number(work.requeueCount || 0) > 0
      ? 1
      : Math.max(1, Number(work.attemptNumber || 1) - Number(work.retryCount || 0));
  const initialClaimMilestone = (work.milestones || []).find(
    (milestone) =>
      milestone.name === 'work_claimed' && Number(milestone.attemptNumber) === initialAttemptNumber,
  );
  const initialMetadata = {
    workStatus: initialClaimMilestone ? 'claimed' : 'pending',
    attemptNumber: initialAttemptNumber,
    safeStage: initialClaimMilestone ? 'work_claimed' : undefined,
    retryCount: 0,
  };
  add('work.enqueued', initialMetadata);
  add('invocation.accepted', initialMetadata);
  const claimMilestone = (work.milestones || []).find(
    (milestone) =>
      milestone.name === 'work_claimed' &&
      Number(milestone.attemptNumber) === Number(work.attemptNumber),
  );
  if (claimMilestone) add('work.claimed', { safeStage: 'work_claimed' });
  if (
    claimMilestone &&
    work.startedAt &&
    new Date(work.startedAt).getTime() >= new Date(claimMilestone.at).getTime()
  ) {
    add('work.started', { safeStage: 'work_claimed' });
  }
  if (Number(work.requeueCount || 0) > 0) {
    add('work.requeued', { reasonCode: 'OPERATOR_REQUEUE_PRETRANSMISSION' });
  }
  switch (work.status) {
    case 'pending':
      if (Number(work.retryCount || 0) > 0 && work.recoveryReasonCode) {
        add('work.abandoned_recovered', { recoveryReasonCode: work.recoveryReasonCode });
      }
      break;
    case 'claimed':
      break;
    case 'running':
    case 'retry_preparing':
      break;
    case 'retry_scheduled':
      add('work.retry_scheduled', {
        reasonCode: work.retryDecisionReason || 'TRANSIENT_IDEMPOTENT_FAILURE',
      });
      break;
    case 'cancellation_requested':
      add('work.cancellation_requested', {
        cancellationReasonCode: work.cancellationReasonCode || 'INVOCATION_CANCELLED',
      });
      break;
    case 'cancelled':
      add('work.cancelled', {
        cancellationReasonCode: work.cancellationReasonCode || 'INVOCATION_CANCELLED',
      });
      break;
    case 'completed':
      add('work.completed');
      break;
    case 'failed':
      add('work.failed', {
        reasonCode:
          work.lastErrorCode || work.retryDecisionReason || 'DURABLE_WORK_EXECUTION_FAILED',
      });
      break;
    case 'recovery_required':
      add('work.recovery_required', {
        recoveryReasonCode: work.recoveryReasonCode || 'RESULT_PERSISTENCE_UNCERTAIN',
      });
      break;
    case 'dead_lettered':
      add('work.dead_lettered', {
        reasonCode: work.lastErrorCode || 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
      });
      break;
    default:
      break;
  }
  return records;
}

function outboxInputFromRepairRecord(work, record) {
  const { eventKey: _eventKey, eventType, ...safeMetadata } = plain(record);
  return {
    eventType,
    partnerId: work.partnerId,
    receivingWorkspaceId: work.receivingWorkspaceId,
    invocationId: work.invocationId,
    workItemId: work._id,
    connectionId: work.connectionId,
    traceId: work.traceId,
    safeMetadata,
  };
}

async function repairDurableOutbox(input = {}, options = {}) {
  assertAllowedKeys(
    input,
    new Set(['now', 'limit', 'partnerId', 'receivingWorkspaceId', 'workspaceId', 'connectionId']),
    'outboxRepair',
  );
  const now = dateValue(input.now ?? options.now, 'now');
  const limit = integer(input.limit ?? env.DURABLE_WORKER_BATCH_SIZE, 'limit', {
    minimum: 1,
    maximum: 100,
  });
  const tenant = optionalTenantScope(input);
  const recentCutoff = new Date(now.getTime() - RUNTIME_WORKER_HEARTBEAT_RETENTION_MS);
  const marked = await RuntimeWorkItem.find({
    ...tenant,
    'outboxRepairEvents.0': { $exists: true },
  })
    .sort({ outboxRepairRequiredAt: 1, _id: 1 })
    .limit(limit)
    .lean();
  const remainingCapacity = Math.max(0, limit - marked.length);
  const recent = remainingCapacity
    ? await RuntimeWorkItem.find({
        ...tenant,
        'outboxRepairEvents.0': { $exists: false },
        updatedAt: { $gte: recentCutoff },
        ...(marked.length ? { _id: { $nin: marked.map((work) => work._id) } } : {}),
      })
        .sort({ updatedAt: 1, _id: 1 })
        .limit(remainingCapacity)
        .lean()
    : [];
  const candidates = [...marked, ...recent];
  const result = {
    scanned: candidates.length,
    attemptedEvents: 0,
    repairedEvents: 0,
    remainingEvents: 0,
    failures: 0,
  };

  for (const work of candidates) {
    const byKey = new Map();
    for (const record of [
      ...(work.outboxRepairEvents || []),
      ...inferredOutboxRepairRecords(work),
    ]) {
      byKey.set(record.eventKey, plain(record));
    }
    const succeededKeys = [];
    const failedRecords = [];
    for (const record of byKey.values()) {
      result.attemptedEvents += 1;
      try {
        await appendOutboxEvent(outboxInputFromRepairRecord(work, record), options);
        succeededKeys.push(record.eventKey);
        result.repairedEvents += 1;
      } catch {
        failedRecords.push(record);
        result.failures += 1;
      }
    }
    if (succeededKeys.length) {
      await RuntimeWorkItem.updateOne(
        { _id: work._id },
        { $pull: { outboxRepairEvents: { eventKey: { $in: succeededKeys } } } },
        { runValidators: true, ...sessionOption(options) },
      );
    }
    if (failedRecords.length) {
      await RuntimeWorkItem.updateOne(
        { _id: work._id },
        {
          $set: {
            outboxRepairRequiredAt: now,
            outboxRepairReasonCode: 'DURABLE_OUTBOX_WRITE_FAILED',
          },
          $addToSet: { outboxRepairEvents: { $each: failedRecords } },
          $inc: { outboxRepairAttempts: 1 },
        },
        { runValidators: true, ...sessionOption(options) },
      );
      result.remainingEvents += failedRecords.length;
    } else {
      await RuntimeWorkItem.updateOne(
        { _id: work._id, 'outboxRepairEvents.0': { $exists: false } },
        {
          $unset: {
            outboxRepairEvents: 1,
            outboxRepairRequiredAt: 1,
            outboxRepairReasonCode: 1,
          },
        },
        { runValidators: true, ...sessionOption(options) },
      );
    }
  }
  return result;
}

function serializeWorkItem(value) {
  const item = plain(value) || {};
  return {
    workItemId: idOf(item),
    invocationId: idOf(item.invocationId),
    connectionId: idOf(item.connectionId),
    credentialBindingId: idOf(item.credentialBindingId) || undefined,
    credentialRequirement: item.credentialRequirement,
    receivingWorkspaceId: item.receivingWorkspaceId,
    workType: item.workType,
    status: item.status,
    priority: item.priority,
    attemptNumber: item.attemptNumber,
    executionGeneration: item.executionGeneration,
    retryCount: item.retryCount,
    maximumAttempts: item.maximumAttempts,
    safeOperation: item.safeOperation,
    safeStage: item.safeStage,
    lastErrorCode: item.lastErrorCode,
    retryDecisionReason: item.retryDecisionReason,
    recoveryReasonCode: item.recoveryReasonCode,
    cancellationReasonCode: item.cancellationReasonCode,
    availableAt: item.availableAt,
    claimedAt: item.claimedAt,
    startedAt: item.startedAt,
    completedAt: item.completedAt,
    failedAt: item.failedAt,
    cancelledAt: item.cancelledAt,
    deadLetteredAt: item.deadLetteredAt,
    requeuedAt: item.requeuedAt,
    leaseExpiresAt: item.leaseExpiresAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    traceId: item.traceId,
    version: item.version,
  };
}

function enqueueDocument(input, now) {
  assertAllowedKeys(input, ENQUEUE_KEYS, 'workItem');
  const identity = tenantIdentity(input);
  const workType = String(input.workType || 'runtime_invocation');
  if (!DURABLE_WORK_TYPES.includes(workType)) {
    throw validationError('workType', 'workType is not approved.');
  }
  const safeOperation = String(input.safeOperation || workType);
  if (!DURABLE_WORK_OPERATIONS.includes(safeOperation)) {
    throw validationError('safeOperation', 'safeOperation is not approved.');
  }
  const status = input.status || 'pending';
  if (![...CLAIMABLE_DURABLE_WORK_STATUSES, 'waiting_for_approval'].includes(status)) {
    throw validationError(
      'status',
      'New work must be pending, retry_scheduled, or waiting_for_approval.',
    );
  }
  const executionGeneration = integer(input.executionGeneration ?? 1, 'executionGeneration', {
    minimum: 1,
  });
  const maximumAttempts = integer(
    input.maximumAttempts ?? env.DURABLE_WORK_MAX_ATTEMPTS,
    'maximumAttempts',
    { minimum: 1, maximum: env.DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS },
  );
  const retryDecisionReason = safeCode(input.retryDecisionReason, 'retryDecisionReason');
  const recoveryReasonCode = safeCode(input.recoveryReasonCode, 'recoveryReasonCode');
  if (recoveryReasonCode && !DURABLE_RECOVERY_REASONS.includes(recoveryReasonCode)) {
    throw validationError('recoveryReasonCode', 'recoveryReasonCode is not approved.');
  }
  const document = {
    ...identity,
    invocationId: objectId(input.invocationId, 'invocationId'),
    ...(input.credentialBindingId
      ? { credentialBindingId: objectId(input.credentialBindingId, 'credentialBindingId') }
      : {}),
    ...(input.credentialRequirement
      ? {
          credentialRequirement: {
            adapterId: safeIdentifier(
              input.credentialRequirement.adapterId,
              'credentialRequirement.adapterId',
            ),
            purpose: safeIdentifier(
              input.credentialRequirement.purpose,
              'credentialRequirement.purpose',
            ),
          },
        }
      : {}),
    attemptNumber: integer(input.attemptNumber ?? 1, 'attemptNumber', { minimum: 1 }),
    workType,
    executionGeneration,
    dedupeKey: deterministicDedupeKey({ ...input, ...identity, workType, executionGeneration }),
    ...(input.traceId
      ? { traceId: safeIdentifier(input.traceId, 'traceId', { required: false }) }
      : {}),
    ...(input.approvalRequestId
      ? { approvalRequestId: safeIdentifier(input.approvalRequestId, 'approvalRequestId') }
      : {}),
    status,
    priority: integer(input.priority ?? 0, 'priority', { minimum: -100, maximum: 100 }),
    availableAt: dateValue(input.availableAt, 'availableAt', now),
    retryCount: integer(input.retryCount ?? 0, 'retryCount', { minimum: 0 }),
    maximumAttempts,
    safeOperation,
    ...(retryDecisionReason ? { retryDecisionReason } : {}),
    ...(recoveryReasonCode ? { recoveryReasonCode } : {}),
  };
  if (document.attemptNumber > maximumAttempts) {
    throw validationError('attemptNumber', 'attemptNumber cannot exceed maximumAttempts.');
  }
  return document;
}

async function enqueueWork(input, options = {}) {
  const now = dateValue(options.now, 'now');
  let document = enqueueDocument(input, now);
  let initialOwnership;
  if (options.initialClaim) {
    const leaseOwner = safeIdentifier(options.initialClaim.leaseOwner, 'leaseOwner');
    const leaseMs = integer(options.initialClaim.leaseMs ?? env.DURABLE_WORK_LEASE_MS, 'leaseMs', {
      minimum: env.DURABLE_WORK_HEARTBEAT_MS * 3,
      maximum: 3_600_000,
    });
    const leaseToken = rawLeaseToken();
    initialOwnership = { leaseOwner, leaseToken };
    document = {
      ...document,
      status: 'claimed',
      leaseOwner,
      leaseTokenHash: leaseTokenHash(leaseToken),
      leaseAcquiredAt: now,
      leaseExpiresAt: new Date(now.getTime() + leaseMs),
      lastHeartbeatAt: now,
      claimedAt: now,
      safeStage: 'work_claimed',
      milestones: [
        {
          name: 'work_claimed',
          at: now,
          attemptNumber: document.attemptNumber,
          safeStatus: 'completed',
        },
      ],
      version: 1,
    };
  }
  let result;
  try {
    result = await RuntimeWorkItem.updateOne(
      { dedupeKey: document.dedupeKey },
      { $setOnInsert: document },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true, ...sessionOption(options) },
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
    result = { upsertedCount: 0 };
  }
  const item = await RuntimeWorkItem.findOne({ dedupeKey: document.dedupeKey }, null, {
    ...sessionOption(options),
  });
  if (!item) {
    throw new AppError(
      503,
      ErrorCodes.DURABLE_WORK_RECONCILIATION_FAILED,
      'Durable work could not be read after enqueue.',
    );
  }
  const created = Boolean(result?.upsertedCount || result?.upsertedId);
  await outboxForWork(item, 'work.enqueued', {}, options);
  if (created && initialOwnership) {
    await outboxForWork(item, 'work.claimed', {}, options);
  }
  return {
    created,
    workItem: item,
    safe: serializeWorkItem(item),
    ...(created && initialOwnership ? { ownership: initialOwnership } : {}),
  };
}

function generateWorkerId() {
  return `worker:${crypto.randomUUID()}`;
}

function rawLeaseToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function ownershipFilter(workItemId, ownership, now, statuses = OWNED_DURABLE_WORK_STATUSES) {
  return {
    _id: objectId(workItemId, 'workItemId'),
    status: { $in: statuses },
    leaseOwner: safeIdentifier(ownership?.leaseOwner, 'leaseOwner'),
    leaseTokenHash: leaseTokenHash(ownership?.leaseToken),
    leaseExpiresAt: { $gt: now },
  };
}

function leaseLost(workItemId) {
  return new AppError(
    409,
    ErrorCodes.DURABLE_WORK_LEASE_LOST,
    'Durable work ownership is no longer valid.',
    [],
    { workItemId: idOf(workItemId), reasonCode: 'LEASE_OWNERSHIP_MISMATCH' },
  );
}

function replayPreparationOwnership() {
  return {
    leaseOwner: `preparer:${crypto.randomUUID()}`,
    leaseToken: rawLeaseToken(),
  };
}

function replayPreparationLeaseSet(ownership, now) {
  return {
    leaseOwner: ownership.leaseOwner,
    leaseTokenHash: leaseTokenHash(ownership.leaseToken),
    leaseAcquiredAt: now,
    leaseExpiresAt: new Date(now.getTime() + env.DURABLE_WORK_LEASE_MS),
    lastHeartbeatAt: now,
  };
}

function replayPreparationFilter(work, ownership, now) {
  return {
    _id: work._id,
    status: 'retry_preparing',
    version: work.version,
    leaseOwner: ownership.leaseOwner,
    leaseTokenHash: leaseTokenHash(ownership.leaseToken),
    leaseExpiresAt: { $gt: now },
  };
}

const DETERMINISTIC_REPLAY_DENIALS = new Set([
  'INVOCATION_CANCELLED',
  'INVOCATION_SAFE_REPLAY_NOT_PROVEN',
  'INVOCATION_RETRY_NOT_SCHEDULED',
  'INVOCATION_ATTEMPT_LIMIT_REACHED',
]);

function replayDenialStatus(reasonCode) {
  if (reasonCode === 'INVOCATION_CANCELLED') return 'cancelled';
  if (DETERMINISTIC_REPLAY_DENIALS.has(reasonCode)) return 'failed';
  return 'recovery_required';
}

async function terminalizeReplayPreparation(work, ownership, reasonCode, now, options = {}) {
  const status = replayDenialStatus(reasonCode);
  let item = await RuntimeWorkItem.findOneAndUpdate(
    replayPreparationFilter(work, ownership, now),
    {
      $set: {
        status,
        lastErrorCode: safeCode(reasonCode, 'reasonCode', { required: true }),
        retryDecisionReason: safeCode(reasonCode, 'reasonCode', { required: true }),
        ...(status === 'recovery_required'
          ? { recoveryReasonCode: 'RESULT_PERSISTENCE_UNCERTAIN' }
          : finalizeTimestamp(status, now)),
      },
      $unset: leaseUnset(),
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!item) return null;
  await outboxForWork(
    item,
    terminalEvent(status),
    status === 'recovery_required'
      ? { recoveryReasonCode: 'RESULT_PERSISTENCE_UNCERTAIN' }
      : { reasonCode },
    options,
  );
  return item;
}

const SAFE_REPLAY_INVOCATION_STATES = new Set([
  'accepted',
  'validating',
  'authorized',
  'retry_scheduled',
  'running',
  'waiting_for_runtime',
  'recovery_required',
  'failed',
]);

function replayPreparationDenied(reasonCode, invocation) {
  return {
    allowed: false,
    reasonCode,
    ...(invocation ? { invocation } : {}),
  };
}

async function prepareInvocationForSafeReplay(work, input = {}, options = {}) {
  const now = dateValue(input.now ?? options.now, 'now');
  const reasonCode = safeCode(input.reasonCode, 'reasonCode', { required: true });
  const invocationQuery = Invocation.findOne({
    _id: work.invocationId,
    receivingWorkspaceId: work.receivingWorkspaceId,
    connectionId: work.connectionId,
  }).select(
    '+executionLeaseId +executionLeaseExpiresAt +executionOwner lifecycleState cancellationState recoveryState protectedReplayAvailable executionGeneration currentWorkItemId attemptCount retryState traceId',
  );
  const invocation = await chainLean(invocationQuery);
  if (!invocation) return replayPreparationDenied('INVOCATION_NOT_FOUND');
  if (['requested', 'aborting', 'confirmed'].includes(invocation.cancellationState)) {
    return replayPreparationDenied('INVOCATION_CANCELLED', invocation);
  }
  if (invocation.lifecycleState === 'failed') {
    if (invocation.retryState !== 'scheduled') {
      return replayPreparationDenied('INVOCATION_RETRY_NOT_SCHEDULED', invocation);
    }
  } else if (['timed_out', 'succeeded', 'cancelled'].includes(invocation.lifecycleState)) {
    return replayPreparationDenied('INVOCATION_ALREADY_TERMINAL', invocation);
  }
  const fencedRecoveryRequeue =
    invocation.lifecycleState === 'recovery_required' && input.allowTerminalOverride === true;
  if (
    invocation.protectedReplayAvailable !== true ||
    (invocation.recoveryState === 'required' && !fencedRecoveryRequeue) ||
    !SAFE_REPLAY_INVOCATION_STATES.has(invocation.lifecycleState)
  ) {
    return replayPreparationDenied('INVOCATION_SAFE_REPLAY_NOT_PROVEN', invocation);
  }
  if (Number(invocation.executionGeneration || 1) !== Number(work.executionGeneration || 1)) {
    return replayPreparationDenied('INVOCATION_EXECUTION_GENERATION_MISMATCH', invocation);
  }
  if (invocation.currentWorkItemId && idOf(invocation.currentWorkItemId) !== idOf(work)) {
    return replayPreparationDenied('INVOCATION_WORK_LINK_MISMATCH', invocation);
  }
  if (
    ['running', 'waiting_for_runtime'].includes(invocation.lifecycleState) &&
    invocation.executionLeaseExpiresAt &&
    new Date(invocation.executionLeaseExpiresAt).getTime() > now.getTime()
  ) {
    return replayPreparationDenied('INVOCATION_EXECUTION_LEASE_ACTIVE', invocation);
  }
  if (
    invocation.lifecycleState === 'waiting_for_runtime' &&
    classifyAbandonedWork(work).replayAllowed !== true
  ) {
    return replayPreparationDenied('INVOCATION_SAFE_REPLAY_NOT_PROVEN', invocation);
  }
  const nextAttemptNumber = Number(invocation.attemptCount || 0) + 1;
  const permittedMaximumAttempts = Number(
    input.maximumAttempts ?? work.maximumAttempts ?? env.DURABLE_WORK_MAX_ATTEMPTS,
  );
  if (
    !Number.isInteger(nextAttemptNumber) ||
    nextAttemptNumber < 1 ||
    nextAttemptNumber > permittedMaximumAttempts
  ) {
    return replayPreparationDenied('INVOCATION_ATTEMPT_LIMIT_REACHED', invocation);
  }

  if (input.dryRun === true) {
    return { allowed: true, invocation, nextAttemptNumber };
  }

  const retryScheduledAt = dateValue(input.availableAt, 'availableAt', now);
  const replayPath =
    invocation.lifecycleState === 'retry_scheduled' ||
    invocation.lifecycleState === 'recovery_required'
      ? ['authorized']
      : ['retry_scheduled', 'authorized'];
  let fromState = invocation.lifecycleState;
  const entries = replayPath.map((toState) => {
    const entry = transitionHistoryEntry(fromState, toState, {
      now,
      reasonCode,
      attemptNumber: nextAttemptNumber,
      traceId: work.traceId || invocation.traceId,
    });
    fromState = toState;
    return entry;
  });
  const update = {
    $set: {
      lifecycleState: 'authorized',
      status: legacyStatusForState('authorized'),
      lastTransitionAt: now,
      'lifecycleTimestamps.authorizedAt': now,
      ...(replayPath.includes('retry_scheduled')
        ? { 'lifecycleTimestamps.retryScheduledAt': retryScheduledAt }
        : {}),
    },
    $push: {
      stateHistory: { $each: entries, $slice: -MAX_INVOCATION_STATE_HISTORY },
    },
    $inc: { __v: 1 },
  };
  Object.assign(update.$set, {
    currentWorkItemId: work._id,
    retryState: 'scheduled',
    retryDecisionReason: reasonCode,
    retryScheduledAt,
    recoveryState: 'not_required',
    recoveryEligible: false,
    recoveryDecision: 'not_evaluated',
    stuckClassification: 'not_stuck',
    lastProgressAt: now,
    lastProgressStage:
      invocation.lifecycleState === 'accepted'
        ? 'accepted'
        : invocation.lifecycleState === 'validating'
          ? 'validation_started'
          : 'authorized',
  });
  update.$unset = {
    ...(update.$unset || {}),
    executionLeaseId: 1,
    executionLeaseExpiresAt: 1,
    executionOwner: 1,
    terminalAt: 1,
    terminalizedAt: 1,
    error: 1,
    output: 1,
    durationMs: 1,
    runtimeStatus: 1,
    recoveryReasonCode: 1,
    recoveryDecisionReason: 1,
    recoveryRequestedAt: 1,
    recoveryRequestedBy: 1,
    recoveryCompletedAt: 1,
    stuckDetectedAt: 1,
  };

  const currentWorkItemId = work._id;
  const prepared = await Invocation.findOneAndUpdate(
    {
      _id: invocation._id,
      receivingWorkspaceId: work.receivingWorkspaceId,
      connectionId: work.connectionId,
      lifecycleState: invocation.lifecycleState,
      attemptCount: Number(invocation.attemptCount || 0),
      executionGeneration: Number(work.executionGeneration || 1),
      protectedReplayAvailable: true,
      cancellationState: { $nin: ['requested', 'aborting', 'confirmed'] },
      ...(fencedRecoveryRequeue
        ? { recoveryState: 'required' }
        : { recoveryState: { $ne: 'required' } }),
      $and: [
        {
          $or: [
            { currentWorkItemId: currentWorkItemId },
            { currentWorkItemId: { $exists: false } },
            { currentWorkItemId: null },
          ],
        },
        ...(['running', 'waiting_for_runtime'].includes(invocation.lifecycleState)
          ? [
              {
                $or: [
                  { executionLeaseExpiresAt: { $exists: false } },
                  { executionLeaseExpiresAt: null },
                  { executionLeaseExpiresAt: { $lte: now } },
                ],
              },
            ]
          : []),
      ],
    },
    update,
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!prepared) return replayPreparationDenied('INVOCATION_REPLAY_PREPARATION_CONFLICT');

  await InvocationAttempt.updateMany(
    {
      invocationId: invocation._id,
      receivingWorkspaceId: work.receivingWorkspaceId,
      connectionId: work.connectionId,
      status: 'started',
      attemptNumber: { $lt: nextAttemptNumber },
      $or: [
        { executionLeaseExpiresAt: { $exists: false } },
        { executionLeaseExpiresAt: null },
        { executionLeaseExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        status: 'failed',
        completedAt: now,
        safeStage: 'invocation_persistence',
        errorCode: 'DURABLE_WORK_LEASE_EXPIRED',
        retryable: true,
        retryDecision: 'scheduled',
        retryDecisionReason: reasonCode,
        retryScheduledAt,
      },
      $unset: {
        executionOwner: 1,
        executionLeaseId: 1,
        executionLeaseExpiresAt: 1,
      },
    },
    sessionOption(options),
  );
  return { allowed: true, invocation: prepared, nextAttemptNumber };
}

async function invocationPermitsClaim(work) {
  const invocation = await Invocation.findOne({
    _id: work.invocationId,
    receivingWorkspaceId: work.receivingWorkspaceId,
    connectionId: work.connectionId,
  })
    .select(
      'lifecycleState cancellationState recoveryState recoveryParentInvocationId protectedReplayAvailable executionGeneration currentWorkItemId attemptCount retryState',
    )
    .lean();
  if (!invocation) return { allowed: false, reasonCode: 'INVOCATION_NOT_FOUND' };
  if (['requested', 'aborting', 'confirmed'].includes(invocation.cancellationState)) {
    return { allowed: false, cancelled: true, reasonCode: 'INVOCATION_CANCELLED' };
  }
  if (INVOCATION_TERMINAL_STATES.has(invocation.lifecycleState)) {
    return {
      allowed: false,
      cancelled: invocation.lifecycleState === 'cancelled',
      lifecycleState: invocation.lifecycleState,
      workStatus:
        invocation.lifecycleState === 'succeeded'
          ? 'completed'
          : invocation.lifecycleState === 'cancelled'
            ? 'cancelled'
            : 'failed',
      reasonCode: 'INVOCATION_ALREADY_TERMINAL',
    };
  }
  if (work.workType === 'recovery_retry' && !invocation.recoveryParentInvocationId) {
    return { allowed: false, reasonCode: 'RECOVERY_PARENT_NOT_FOUND' };
  }
  const allowedStates = new Set(['accepted', 'validating', 'authorized']);
  if (!allowedStates.has(invocation.lifecycleState)) {
    return { allowed: false, reasonCode: 'INVOCATION_STATE_NOT_EXECUTABLE' };
  }
  if (invocation.protectedReplayAvailable !== true) {
    return { allowed: false, reasonCode: 'INVOCATION_PROTECTED_REPLAY_UNAVAILABLE' };
  }
  if (Number(invocation.executionGeneration || 1) !== Number(work.executionGeneration || 1)) {
    return { allowed: false, reasonCode: 'INVOCATION_EXECUTION_GENERATION_MISMATCH' };
  }
  if (idOf(invocation.currentWorkItemId) !== idOf(work)) {
    return { allowed: false, reasonCode: 'INVOCATION_WORK_LINK_MISMATCH' };
  }
  const expectedAttemptNumber = Number(invocation.attemptCount || 0) + 1;
  if (Number(work.attemptNumber) !== expectedAttemptNumber) {
    return { allowed: false, reasonCode: 'DURABLE_ATTEMPT_MISMATCH' };
  }
  if (expectedAttemptNumber > 1 && invocation.retryState !== 'scheduled') {
    return { allowed: false, reasonCode: 'INVOCATION_RETRY_NOT_SCHEDULED' };
  }
  return { allowed: true };
}

async function rejectInvalidClaim(work, ownership, decision, now, options) {
  const status = decision.workStatus || (decision.cancelled ? 'cancelled' : 'failed');
  const updated = await RuntimeWorkItem.findOneAndUpdate(
    ownershipFilter(work._id, ownership, now, ['claimed']),
    {
      $set: {
        status,
        ...(status === 'completed' ? {} : { lastErrorCode: decision.reasonCode }),
        ...finalizeTimestamp(status, now),
      },
      $unset: {
        ...(status === 'completed' ? { lastErrorCode: 1 } : {}),
        leaseOwner: 1,
        leaseTokenHash: 1,
        leaseAcquiredAt: 1,
        leaseExpiresAt: 1,
        lastHeartbeatAt: 1,
      },
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (updated) {
    await outboxForWork(
      updated,
      terminalEvent(status),
      {
        reasonCode: status === 'completed' ? 'RESULT_PERSISTENCE_RECONCILED' : decision.reasonCode,
      },
      options,
    );
  }
}

async function ensureClaimMilestone(work, ownership, now, options = {}) {
  const attemptNumber = Number(work.attemptNumber);
  let item = await RuntimeWorkItem.findOneAndUpdate(
    {
      ...ownershipFilter(work._id, ownership, now, ['claimed']),
      milestones: {
        $not: { $elemMatch: { name: 'work_claimed', attemptNumber } },
      },
    },
    {
      $push: {
        milestones: {
          name: 'work_claimed',
          at: now,
          attemptNumber,
          safeStatus: 'completed',
        },
      },
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (item) return item;
  item = await RuntimeWorkItem.findOne({
    ...ownershipFilter(work._id, ownership, now, ['claimed']),
    milestones: { $elemMatch: { name: 'work_claimed', attemptNumber } },
  });
  if (!item) throw leaseLost(work._id);
  return item;
}

async function claimNextWork(input, options = {}) {
  assertAllowedKeys(input, new Set(['leaseOwner', 'workerId', 'leaseMs', 'now']), 'claim');
  const leaseOwner = safeIdentifier(input.leaseOwner ?? input.workerId, 'leaseOwner');
  const now = dateValue(input.now ?? options.now, 'now');
  const leaseMs = integer(input.leaseMs ?? env.DURABLE_WORK_LEASE_MS, 'leaseMs', {
    minimum: env.DURABLE_WORK_HEARTBEAT_MS * 3,
    maximum: 3_600_000,
  });
  const verifyInvocation = options.verifyInvocation !== false;
  const maximumCandidates = integer(
    options.maximumCandidates ?? env.DURABLE_WORKER_BATCH_SIZE,
    'maximumCandidates',
    {
      minimum: 1,
      maximum: 100,
    },
  );

  for (let candidate = 0; candidate < maximumCandidates; candidate += 1) {
    const leaseToken = rawLeaseToken();
    let item = await RuntimeWorkItem.findOneAndUpdate(
      {
        status: { $in: CLAIMABLE_DURABLE_WORK_STATUSES },
        availableAt: { $lte: now },
        cancellationRequestedAt: { $exists: false },
        $and: [
          {
            $or: [
              { leaseExpiresAt: { $exists: false } },
              { leaseExpiresAt: null },
              { leaseExpiresAt: { $lte: now } },
            ],
          },
          { $expr: { $lte: ['$attemptNumber', '$maximumAttempts'] } },
        ],
      },
      {
        $set: {
          status: 'claimed',
          leaseOwner,
          leaseTokenHash: leaseTokenHash(leaseToken),
          leaseAcquiredAt: now,
          leaseExpiresAt: new Date(now.getTime() + leaseMs),
          lastHeartbeatAt: now,
          claimedAt: now,
          safeStage: 'work_claimed',
        },
        $inc: { version: 1 },
      },
      {
        new: true,
        runValidators: true,
        sort: { priority: -1, availableAt: 1, createdAt: 1, _id: 1 },
        ...sessionOption(options),
      },
    );
    if (!item) return null;
    const ownership = { leaseOwner, leaseToken };
    item = await ensureClaimMilestone(item, ownership, now, options);
    const decision = verifyInvocation
      ? await (options.invocationPermitsClaim || invocationPermitsClaim)(plain(item))
      : { allowed: true };
    if (!decision.allowed) {
      await rejectInvalidClaim(item, ownership, decision, now, options);
      continue;
    }
    await outboxForWork(item, 'work.claimed', {}, options);
    return { workItem: item, safe: serializeWorkItem(item), leaseToken, ownership };
  }
  return null;
}

async function claimWorkById(workItemId, input, options = {}) {
  assertAllowedKeys(input, new Set(['leaseOwner', 'workerId', 'leaseMs', 'now']), 'claim');
  const leaseOwner = safeIdentifier(input.leaseOwner ?? input.workerId, 'leaseOwner');
  const now = dateValue(input.now ?? options.now, 'now');
  const leaseMs = integer(input.leaseMs ?? env.DURABLE_WORK_LEASE_MS, 'leaseMs', {
    minimum: env.DURABLE_WORK_HEARTBEAT_MS * 3,
    maximum: 3_600_000,
  });
  const leaseToken = rawLeaseToken();
  let item = await RuntimeWorkItem.findOneAndUpdate(
    {
      _id: objectId(workItemId, 'workItemId'),
      status: { $in: CLAIMABLE_DURABLE_WORK_STATUSES },
      availableAt: { $lte: now },
      cancellationRequestedAt: { $exists: false },
      $and: [
        {
          $or: [
            { leaseExpiresAt: { $exists: false } },
            { leaseExpiresAt: null },
            { leaseExpiresAt: { $lte: now } },
          ],
        },
        { $expr: { $lte: ['$attemptNumber', '$maximumAttempts'] } },
      ],
    },
    {
      $set: {
        status: 'claimed',
        leaseOwner,
        leaseTokenHash: leaseTokenHash(leaseToken),
        leaseAcquiredAt: now,
        leaseExpiresAt: new Date(now.getTime() + leaseMs),
        lastHeartbeatAt: now,
        claimedAt: now,
        safeStage: 'work_claimed',
      },
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!item) return null;
  const ownership = { leaseOwner, leaseToken };
  item = await ensureClaimMilestone(item, ownership, now, options);
  const decision =
    options.verifyInvocation === false
      ? { allowed: true }
      : await (options.invocationPermitsClaim || invocationPermitsClaim)(plain(item));
  if (!decision.allowed) {
    await rejectInvalidClaim(item, ownership, decision, now, options);
    return null;
  }
  await outboxForWork(item, 'work.claimed', {}, options);
  return { workItem: item, safe: serializeWorkItem(item), leaseToken, ownership };
}

async function startWork(workItemId, ownership, options = {}) {
  const now = dateValue(options.now, 'now');
  let item = await RuntimeWorkItem.findOneAndUpdate(
    {
      ...ownershipFilter(workItemId, ownership, now, ['claimed']),
      cancellationRequestedAt: { $exists: false },
    },
    {
      $set: { status: 'running', startedAt: now, lastHeartbeatAt: now },
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!item) throw leaseLost(workItemId);
  await outboxForWork(item, 'work.started', {}, options);
  return { workItem: item, safe: serializeWorkItem(item) };
}

async function heartbeatWork(workItemId, ownership, options = {}) {
  const now = dateValue(options.now, 'now');
  const leaseMs = integer(options.leaseMs ?? env.DURABLE_WORK_LEASE_MS, 'leaseMs', {
    minimum: env.DURABLE_WORK_HEARTBEAT_MS * 3,
    maximum: 3_600_000,
  });
  const item = await RuntimeWorkItem.findOneAndUpdate(
    ownershipFilter(workItemId, ownership, now),
    {
      $set: {
        lastHeartbeatAt: now,
        leaseExpiresAt: new Date(now.getTime() + leaseMs),
      },
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!item) throw leaseLost(workItemId);
  return {
    workItem: item,
    safe: serializeWorkItem(item),
    cancellationRequested: item.status === 'cancellation_requested',
  };
}

async function getOwnedWorkControlState(workItemId, ownership, options = {}) {
  const now = dateValue(options.now, 'now');
  const item = await RuntimeWorkItem.findOne(ownershipFilter(workItemId, ownership, now))
    .select('status cancellationRequestedAt cancellationReasonCode leaseExpiresAt')
    .lean();
  if (!item) throw leaseLost(workItemId);
  return {
    workItemId: idOf(item),
    status: item.status,
    cancellationRequested: item.status === 'cancellation_requested',
    cancellationReasonCode: item.cancellationReasonCode,
    leaseExpiresAt: item.leaseExpiresAt,
  };
}

async function recordMilestone(workItemId, ownership, input, options = {}) {
  assertAllowedKeys(input, new Set(['name', 'safeStatus', 'attemptNumber', 'at']), 'milestone');
  const now = dateValue(input.at ?? options.now, 'milestone.at');
  if (!DURABLE_WORK_MILESTONES.includes(input.name)) {
    throw validationError('milestone.name', 'Milestone name is not approved.');
  }
  const safeStatus = input.safeStatus || 'completed';
  if (!DURABLE_MILESTONE_STATUSES.includes(safeStatus)) {
    throw validationError('milestone.safeStatus', 'Milestone status is not approved.');
  }
  const attemptNumber = integer(input.attemptNumber, 'milestone.attemptNumber', { minimum: 1 });
  const stageIndex = DURABLE_WORK_MILESTONES.indexOf(input.name);
  const nonRegressingStages = DURABLE_WORK_MILESTONES.slice(0, stageIndex + 1);
  const item = await RuntimeWorkItem.findOneAndUpdate(
    {
      ...ownershipFilter(workItemId, ownership, now),
      attemptNumber,
      safeStage: { $in: nonRegressingStages },
      milestones: {
        $not: { $elemMatch: { name: input.name, attemptNumber } },
      },
    },
    {
      $set: { safeStage: input.name },
      $push: {
        milestones: { name: input.name, at: now, attemptNumber, safeStatus },
      },
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (item) return { workItem: item, safe: serializeWorkItem(item), alreadyRecorded: false };
  const existing = await RuntimeWorkItem.findOne({
    ...ownershipFilter(workItemId, ownership, now),
    attemptNumber,
    milestones: { $elemMatch: { name: input.name, attemptNumber } },
  });
  if (!existing) throw leaseLost(workItemId);
  return { workItem: existing, safe: serializeWorkItem(existing), alreadyRecorded: true };
}

function finalizeTimestamp(status, now) {
  if (status === 'completed') return { completedAt: now };
  if (status === 'cancelled') return { cancelledAt: now };
  if (status === 'dead_lettered') return { deadLetteredAt: now, failedAt: now };
  return { failedAt: now };
}

function terminalEvent(status) {
  return {
    completed: 'work.completed',
    cancelled: 'work.cancelled',
    failed: 'work.failed',
    recovery_required: 'work.recovery_required',
    dead_lettered: 'work.dead_lettered',
  }[status];
}

async function finalizeWork(workItemId, ownership, input, options = {}) {
  assertAllowedKeys(input, FINALIZE_KEYS, 'finalization');
  const status = String(input.status || '');
  if (!FINALIZE_STATUSES.has(status)) {
    throw validationError('finalization.status', 'Final status is not approved.');
  }
  const now = dateValue(options.now, 'now');
  const lastErrorCode = safeCode(input.lastErrorCode, 'lastErrorCode');
  const retryDecisionReason = safeCode(input.retryDecisionReason, 'retryDecisionReason');
  const recoveryReasonCode = safeCode(input.recoveryReasonCode, 'recoveryReasonCode');
  if (recoveryReasonCode && !DURABLE_RECOVERY_REASONS.includes(recoveryReasonCode)) {
    throw validationError('recoveryReasonCode', 'recoveryReasonCode is not approved.');
  }
  if (status === 'recovery_required' && !recoveryReasonCode) {
    throw validationError(
      'recoveryReasonCode',
      'recoveryReasonCode is required when remote outcome certainty is unavailable.',
    );
  }
  const statuses = status === 'completed' ? ['claimed', 'running'] : OWNED_DURABLE_WORK_STATUSES;
  const filter = ownershipFilter(workItemId, ownership, now, statuses);
  if (status === 'completed') {
    filter.$expr = {
      $anyElementTrue: {
        $map: {
          input: '$milestones',
          as: 'milestone',
          in: {
            $and: [
              { $eq: ['$$milestone.name', 'invocation_persisted'] },
              { $eq: ['$$milestone.attemptNumber', '$attemptNumber'] },
            ],
          },
        },
      },
    };
  }
  const item = await RuntimeWorkItem.findOneAndUpdate(
    filter,
    {
      $set: {
        status,
        ...finalizeTimestamp(status, now),
        ...(lastErrorCode ? { lastErrorCode } : {}),
        ...(retryDecisionReason ? { retryDecisionReason } : {}),
        ...(recoveryReasonCode ? { recoveryReasonCode } : {}),
      },
      $unset: {
        leaseOwner: 1,
        leaseTokenHash: 1,
        leaseAcquiredAt: 1,
        leaseExpiresAt: 1,
        lastHeartbeatAt: 1,
      },
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!item) {
    throw new AppError(
      409,
      ErrorCodes.DURABLE_WORK_FINALIZATION_CONFLICT,
      'Durable work could not be finalized by this owner.',
      [],
      { workItemId: idOf(workItemId), reasonCode: 'FINALIZATION_OWNERSHIP_MISMATCH' },
    );
  }
  await outboxForWork(
    item,
    terminalEvent(status),
    {
      ...(lastErrorCode ? { reasonCode: lastErrorCode } : {}),
      ...(recoveryReasonCode ? { recoveryReasonCode } : {}),
    },
    options,
  );
  return { workItem: item, safe: serializeWorkItem(item) };
}

async function scheduleRetry(workItemId, ownership, retryInput, options = {}) {
  if (!retryInput || typeof retryInput !== 'object' || Array.isArray(retryInput)) {
    throw validationError('retry', 'retry must be an object.');
  }
  assertAllowedKeys(retryInput, RETRY_INPUT_KEYS, 'retry');
  const now = dateValue(options.now, 'now');
  const current = await RuntimeWorkItem.findOne(
    ownershipFilter(workItemId, ownership, now, ['claimed', 'running']),
  )
    .select('+leaseTokenHash +leaseOwner')
    .lean();
  if (!current) throw leaseLost(workItemId);
  const evaluator = options.retryDecisionEvaluator || retryPolicyDecision;
  const decision = await evaluator(
    { ...retryInput, attemptNumber: current.attemptNumber },
    current,
  );
  if (decision?.allowed !== true) {
    throw new AppError(
      409,
      ErrorCodes.DURABLE_WORK_RETRY_DENIED,
      'Durable retry was not approved by retry policy.',
      [],
      {
        workItemId: idOf(workItemId),
        reasonCode: safeCode(decision?.reason, 'reasonCode') || 'RETRY_DENIED',
      },
    );
  }
  if (current.attemptNumber >= current.maximumAttempts) {
    throw new AppError(
      409,
      ErrorCodes.DURABLE_WORK_RETRY_DENIED,
      'Durable retry attempt limit was reached.',
      [],
      { workItemId: idOf(workItemId), reasonCode: 'MAX_ATTEMPTS_REACHED' },
    );
  }
  const reason = safeCode(decision.reason, 'retryDecision.reason', { required: true });
  const delayMs = integer(Math.max(1, Number(decision.delayMs)), 'retryDecision.delayMs', {
    minimum: 1,
    maximum: 3_600_000,
  });
  const availableAt = new Date(now.getTime() + delayMs);
  const lastErrorCode = safeCode(retryInput.errorCode || retryInput.code, 'lastErrorCode');
  const prepareReplay = options.prepareInvocationForSafeReplay || prepareInvocationForSafeReplay;
  const inspected = await prepareReplay(
    current,
    { now, availableAt, reasonCode: reason, dryRun: true },
    options,
  );
  if (
    inspected?.allowed !== true ||
    !Number.isInteger(inspected.nextAttemptNumber) ||
    inspected.nextAttemptNumber <= Number(current.attemptNumber) ||
    inspected.nextAttemptNumber > Number(current.maximumAttempts)
  ) {
    throw new AppError(
      409,
      ErrorCodes.DURABLE_WORK_RETRY_DENIED,
      'Durable retry could not align the invocation and work attempt.',
      [],
      {
        workItemId: idOf(workItemId),
        reasonCode: safeCode(inspected?.reasonCode || 'DURABLE_ATTEMPT_MISMATCH', 'reasonCode', {
          required: true,
        }),
      },
    );
  }
  const preparationOwnership = replayPreparationOwnership();
  const preparing = await RuntimeWorkItem.findOneAndUpdate(
    {
      ...ownershipFilter(workItemId, ownership, now, ['claimed', 'running']),
      attemptNumber: current.attemptNumber,
      maximumAttempts: { $gt: current.attemptNumber },
    },
    {
      $set: {
        status: 'retry_preparing',
        availableAt,
        attemptNumber: inspected.nextAttemptNumber,
        retryDecisionReason: reason,
        ...replayPreparationLeaseSet(preparationOwnership, now),
        ...(lastErrorCode ? { lastErrorCode } : {}),
      },
      $inc: { retryCount: 1, version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!preparing) throw leaseLost(workItemId);

  const preparedInvocation = await prepareReplay(
    plain(preparing),
    { now, availableAt, reasonCode: reason },
    options,
  );
  if (
    preparedInvocation?.allowed !== true ||
    preparedInvocation.nextAttemptNumber !== inspected.nextAttemptNumber
  ) {
    const preparationReason = safeCode(
      preparedInvocation?.reasonCode || 'INVOCATION_REPLAY_PREPARATION_CONFLICT',
      'reasonCode',
      { required: true },
    );
    await terminalizeReplayPreparation(
      plain(preparing),
      preparationOwnership,
      preparationReason,
      now,
      options,
    );
    throw new AppError(
      409,
      ErrorCodes.DURABLE_WORK_RETRY_DENIED,
      'Durable retry could not safely prepare the invocation.',
      [],
      { workItemId: idOf(workItemId), reasonCode: preparationReason },
    );
  }

  const item = await RuntimeWorkItem.findOneAndUpdate(
    replayPreparationFilter(plain(preparing), preparationOwnership, now),
    {
      $set: { status: 'retry_scheduled' },
      $unset: leaseUnset(),
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!item) {
    throw new AppError(
      409,
      ErrorCodes.DURABLE_WORK_FINALIZATION_CONFLICT,
      'Durable retry preparation ownership was lost.',
      [],
      { workItemId: idOf(workItemId), reasonCode: 'RETRY_PREPARATION_FENCE_LOST' },
    );
  }
  await outboxForWork(item, 'work.retry_scheduled', { reasonCode: reason }, options);
  return { decision, workItem: item, safe: serializeWorkItem(item) };
}

function cancellationTenantFilter(input) {
  const identity = tenantIdentity(input);
  return {
    ...identity,
    ...(input.workItemId ? { _id: objectId(input.workItemId, 'workItemId') } : {}),
    ...(input.invocationId ? { invocationId: objectId(input.invocationId, 'invocationId') } : {}),
  };
}

async function requestWorkCancellation(input, options = {}) {
  assertAllowedKeys(
    input,
    new Set([
      'partnerId',
      'receivingWorkspaceId',
      'workspaceId',
      'connectionId',
      'invocationId',
      'workItemId',
      'reasonCode',
    ]),
    'cancellation',
  );
  if (!input.workItemId && !input.invocationId) {
    throw validationError('workItemId', 'workItemId or invocationId is required.');
  }
  const filter = cancellationTenantFilter(input);
  const now = dateValue(options.now, 'now');
  const reasonCode = safeCode(input.reasonCode, 'reasonCode', { required: true });
  let item = await RuntimeWorkItem.findOneAndUpdate(
    { ...filter, status: { $in: CLAIMABLE_DURABLE_WORK_STATUSES } },
    {
      $set: {
        status: 'cancelled',
        cancellationRequestedAt: now,
        cancellationReasonCode: reasonCode,
        cancelledAt: now,
      },
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, sort: { createdAt: -1 }, ...sessionOption(options) },
  );
  let eventType = 'work.cancelled';
  if (!item) {
    item = await RuntimeWorkItem.findOneAndUpdate(
      { ...filter, status: { $in: ['claimed', 'running', 'retry_preparing'] } },
      {
        $set: {
          status: 'cancellation_requested',
          cancellationRequestedAt: now,
          cancellationReasonCode: reasonCode,
        },
        $inc: { version: 1 },
      },
      { new: true, runValidators: true, sort: { createdAt: -1 }, ...sessionOption(options) },
    );
    eventType = 'work.cancellation_requested';
  }
  if (!item) {
    item = await RuntimeWorkItem.findOne({
      ...filter,
      status: {
        $in: Array.from(new Set(['cancellation_requested', ...TERMINAL_DURABLE_WORK_STATUSES])),
      },
    }).sort({ createdAt: -1 });
    if (!item) {
      throw new AppError(
        404,
        ErrorCodes.DURABLE_WORK_NOT_FOUND,
        'Cancellable durable work was not found.',
      );
    }
    if (['cancellation_requested', 'cancelled'].includes(item.status)) {
      await outboxForWork(
        item,
        item.status === 'cancelled' ? 'work.cancelled' : 'work.cancellation_requested',
        { cancellationReasonCode: item.cancellationReasonCode || reasonCode },
        options,
      );
    }
    return {
      alreadyRequested: true,
      alreadySettled: !['cancellation_requested', 'cancelled'].includes(item.status),
      workItem: item,
      safe: serializeWorkItem(item),
    };
  }
  await outboxForWork(item, eventType, { cancellationReasonCode: reasonCode }, options);
  return { alreadyRequested: false, workItem: item, safe: serializeWorkItem(item) };
}

function currentAttemptMilestones(work) {
  return (work.milestones || []).filter(
    (milestone) => Number(milestone.attemptNumber) === Number(work.attemptNumber),
  );
}

function classifyAbandonedWork(work) {
  const names = new Set(currentAttemptMilestones(work).map((milestone) => milestone.name));
  if (names.has('invocation_persisted')) {
    return {
      classification: 'persisted_result',
      replayAllowed: false,
      recoveryReasonCode: 'RESULT_PERSISTENCE_UNCERTAIN',
    };
  }
  if (names.has('finalization_started')) {
    return {
      classification: 'post_transmission',
      replayAllowed: false,
      recoveryReasonCode: 'WORKER_LOST_DURING_FINALIZATION',
    };
  }
  if (names.has('outbound_response_received') || names.has('response_validated')) {
    return {
      classification: 'post_transmission',
      replayAllowed: false,
      recoveryReasonCode: 'RESULT_PERSISTENCE_UNCERTAIN',
    };
  }
  if (names.has('outbound_transmission_started')) {
    return {
      classification: 'post_transmission',
      replayAllowed: false,
      recoveryReasonCode: 'WORKER_LOST_DURING_REMOTE_EXECUTION',
    };
  }
  return {
    classification: 'pre_transmission',
    replayAllowed: true,
    recoveryReasonCode: 'LEASE_EXPIRED_BEFORE_TRANSMISSION',
  };
}

function abandonedRetryDecision(work, classification) {
  if (!classification.replayAllowed) {
    return { allowed: false, reason: classification.recoveryReasonCode };
  }
  if (work.status === 'cancellation_requested' || work.cancellationRequestedAt) {
    return { allowed: false, cancelled: true, reason: 'INVOCATION_CANCELLED' };
  }
  if (work.status === 'retry_preparing') {
    if (work.retryDecisionReason === 'SAFE_RETRY_ATTEMPTS_EXHAUSTED') {
      return {
        allowed: false,
        deadLetter: true,
        reason: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
      };
    }
    return {
      allowed: true,
      reason: work.retryDecisionReason || 'LEASE_EXPIRED_BEFORE_TRANSMISSION',
      delayMs: 1,
    };
  }
  const recoveryLimit = Math.min(
    Number(work.maximumAttempts || env.DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS),
    Number(env.DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS),
  );
  if (Number(work.retryCount || 0) >= recoveryLimit) {
    return { allowed: false, deadLetter: true, reason: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED' };
  }
  if (Number(work.attemptNumber) >= Number(work.maximumAttempts)) {
    return { allowed: false, deadLetter: true, reason: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED' };
  }
  return { allowed: true, reason: 'LEASE_EXPIRED_BEFORE_TRANSMISSION', delayMs: 1 };
}

async function invocationTerminalState(work, options = {}) {
  if (typeof options.invocationTerminalState === 'function') {
    return options.invocationTerminalState(work);
  }
  const invocation = await Invocation.findOne({
    _id: work.invocationId,
    receivingWorkspaceId: work.receivingWorkspaceId,
    connectionId: work.connectionId,
  })
    .select('lifecycleState')
    .lean();
  return invocation?.lifecycleState;
}

async function markInvocationRecoveryForWork(work, reasonCode, now, options = {}) {
  if (options.updateInvocation === false) return false;
  const current = await Invocation.findOne({
    _id: work.invocationId,
    receivingWorkspaceId: work.receivingWorkspaceId,
    connectionId: work.connectionId,
    lifecycleState: { $in: ['running', 'waiting_for_runtime'] },
  })
    .select('lifecycleState')
    .lean();
  if (!current) return false;
  const { transitionUpdate } = require('./invocationLifecycle.service');
  const update = transitionUpdate(current.lifecycleState, 'recovery_required', {
    now,
    reasonCode,
    attemptNumber: work.attemptNumber,
    traceId: work.traceId,
    outcome: {
      retryState: 'recovery_required',
      retryDecisionReason: reasonCode,
    },
  });
  Object.assign(update.$set, {
    recoveryState: 'required',
    recoveryEligible: true,
    recoveryDecision: 'operator_review_required',
    recoveryDecisionReason: reasonCode,
    recoveryReasonCode: reasonCode,
    stuckDetectedAt: now,
    stuckClassification: 'outcome_ambiguous',
  });
  update.$inc = { ...(update.$inc || {}), __v: 1 };
  const result = await Invocation.findOneAndUpdate(
    {
      _id: work.invocationId,
      receivingWorkspaceId: work.receivingWorkspaceId,
      connectionId: work.connectionId,
      lifecycleState: current.lifecycleState,
    },
    update,
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  return Boolean(result);
}

async function terminalizeInvocationForDeadLetter(work, now, options = {}) {
  if (options.updateInvocation === false) return true;
  const query = Invocation.findOne({
    _id: work.invocationId,
    receivingWorkspaceId: work.receivingWorkspaceId,
    connectionId: work.connectionId,
  }).select(
    'lifecycleState cancellationState recoveryState attemptCount currentWorkItemId executionGeneration traceId',
  );
  const invocation = await chainLean(query);
  if (!invocation) return false;
  if (
    ['requested', 'aborting', 'confirmed', 'outcome_unknown'].includes(invocation.cancellationState)
  ) {
    return false;
  }
  if (['succeeded', 'cancelled'].includes(invocation.lifecycleState)) return false;

  if (
    invocation.lifecycleState === 'recovery_required' ||
    invocation.recoveryState === 'required'
  ) {
    return true;
  }

  let update;
  if (['failed', 'timed_out'].includes(invocation.lifecycleState)) {
    update = {
      $set: {
        retryState: 'exhausted',
        retryDecisionReason: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
      },
      $inc: { __v: 1 },
    };
  } else {
    const { transitionUpdate } = require('./invocationLifecycle.service');
    try {
      update = transitionUpdate(invocation.lifecycleState, 'recovery_required', {
        now,
        reasonCode: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
        attemptNumber: Math.max(1, Number(work.attemptNumber || 1)),
        traceId: work.traceId || invocation.traceId,
        outcome: {
          retryState: 'recovery_required',
          retryDecisionReason: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
        },
      });
      Object.assign(update.$set, {
        recoveryState: 'required',
        recoveryEligible: true,
        recoveryDecision: 'operator_review_required',
        recoveryDecisionReason: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
        recoveryReasonCode: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
        lastProgressAt: now,
        lastProgressStage: 'finalization_started',
      });
    } catch {
      return false;
    }
  }

  const terminalized = await Invocation.findOneAndUpdate(
    {
      _id: invocation._id,
      receivingWorkspaceId: work.receivingWorkspaceId,
      connectionId: work.connectionId,
      lifecycleState: invocation.lifecycleState,
      executionGeneration: Number(work.executionGeneration || 1),
      $or: [
        { currentWorkItemId: work._id },
        { currentWorkItemId: { $exists: false } },
        { currentWorkItemId: null },
      ],
    },
    update,
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!terminalized) return false;

  await InvocationAttempt.updateMany(
    {
      invocationId: invocation._id,
      receivingWorkspaceId: work.receivingWorkspaceId,
      connectionId: work.connectionId,
      status: 'started',
      attemptNumber: { $lte: Number(work.attemptNumber || 1) },
    },
    {
      $set: {
        status: ['failed', 'timed_out'].includes(invocation.lifecycleState)
          ? invocation.lifecycleState
          : 'recovery_required',
        completedAt: now,
        safeStage: 'invocation_persistence',
        errorCode: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
        retryable: false,
        retryDecision: 'denied',
        retryDecisionReason: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
      },
      $unset: {
        executionOwner: 1,
        executionLeaseId: 1,
        executionLeaseExpiresAt: 1,
      },
    },
    sessionOption(options),
  );
  return true;
}

async function reconcileTerminalWorkInvocation(invocation, work, now, options = {}) {
  if (work.status === 'dead_lettered') {
    return terminalizeInvocationForDeadLetter(work, now, options);
  }
  const toState =
    work.status === 'cancelled'
      ? 'cancelled'
      : work.status === 'failed'
        ? 'failed'
        : 'recovery_required';
  const reasonCode = safeCode(
    toState === 'cancelled'
      ? work.cancellationReasonCode || 'INVOCATION_CANCELLED'
      : toState === 'failed'
        ? work.lastErrorCode || 'DURABLE_WORK_EXECUTION_FAILED'
        : work.recoveryReasonCode || 'RESULT_PERSISTENCE_UNCERTAIN',
    'reasonCode',
    { required: true },
  );
  const terminalReconciliationPath = {
    accepted: ['validating', 'authorized', 'running', 'waiting_for_runtime'],
    validating: ['authorized', 'running', 'waiting_for_runtime'],
    authorized: ['running', 'waiting_for_runtime'],
    running: ['waiting_for_runtime'],
    waiting_for_runtime: [],
  };
  const path =
    toState === 'recovery_required'
      ? [...(terminalReconciliationPath[invocation.lifecycleState] || []), toState]
      : invocation.lifecycleState === 'accepted' && toState === 'failed'
        ? ['validating', 'failed']
        : [toState];
  let fromState = invocation.lifecycleState;
  const entries = path.map((nextState) => {
    if (!canTransition(fromState, nextState)) {
      throw new AppError(
        409,
        ErrorCodes.INVOCATION_STATE_TRANSITION_INVALID,
        'Terminal work reconciliation found an invalid lifecycle edge.',
        [],
        { fromState, toState: nextState, workItemId: idOf(work) },
      );
    }
    const entry = transitionHistoryEntry(fromState, nextState, {
      now,
      reasonCode,
      attemptNumber: Math.max(1, Number(work.attemptNumber || 1)),
      traceId: work.traceId || invocation.traceId,
    });
    fromState = nextState;
    return entry;
  });
  const stagedLifecycleTimestamps = Object.fromEntries(
    path.map((state) => [
      `lifecycleTimestamps.${
        state === 'waiting_for_runtime'
          ? 'waitingForRuntimeAt'
          : state === 'recovery_required'
            ? 'recoveryRequiredAt'
            : state === 'retry_scheduled'
              ? 'retryScheduledAt'
              : `${state}At`
      }`,
      now,
    ]),
  );
  const update = {
    $set: {
      lifecycleState: toState,
      status: legacyStatusForState(toState),
      lastTransitionAt: now,
      currentWorkItemId: work._id,
      ...stagedLifecycleTimestamps,
      lastProgressAt: now,
      lastProgressStage: ['cancelled', 'failed'].includes(toState)
        ? 'terminalized'
        : 'finalization_started',
      ...(toState === 'cancelled'
        ? {
            terminalAt: now,
            terminalizedAt: now,
            cancellationState: 'confirmed',
            cancellationOutcome: 'local_confirmed',
            cancelReasonCode: reasonCode,
            cancellationConfirmedAt: now,
            cancelledAt: now,
            retryState: 'not_allowed',
            retryDecisionReason: reasonCode,
          }
        : toState === 'failed'
          ? {
              terminalAt: now,
              terminalizedAt: now,
              retryState: 'not_allowed',
              retryDecisionReason: reasonCode,
            }
          : {
              recoveryState: 'required',
              recoveryEligible: true,
              recoveryDecision: 'operator_review_required',
              recoveryDecisionReason: 'REQUIRES_OPERATOR_REVIEW',
              recoveryReasonCode: reasonCode,
              retryState: 'recovery_required',
              retryDecisionReason: reasonCode,
            }),
    },
    $push: {
      stateHistory: { $each: entries, $slice: -MAX_INVOCATION_STATE_HISTORY },
    },
    $unset: {
      executionLeaseId: 1,
      executionLeaseExpiresAt: 1,
      executionOwner: 1,
    },
    $inc: { __v: 1 },
  };
  const reconciled = await Invocation.findOneAndUpdate(
    {
      _id: invocation._id,
      receivingWorkspaceId: invocation.receivingWorkspaceId,
      connectionId: invocation.connectionId,
      lifecycleState: invocation.lifecycleState,
      executionGeneration: Number(work.executionGeneration || 1),
      $or: [
        { currentWorkItemId: work._id },
        { currentWorkItemId: { $exists: false } },
        { currentWorkItemId: null },
      ],
    },
    update,
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!reconciled) return false;
  await InvocationAttempt.updateMany(
    {
      invocationId: invocation._id,
      receivingWorkspaceId: invocation.receivingWorkspaceId,
      connectionId: invocation.connectionId,
      status: 'started',
      attemptNumber: { $lte: Number(work.attemptNumber || 1) },
    },
    {
      $set: {
        status: toState,
        completedAt: now,
        safeStage: 'invocation_persistence',
        errorCode: reasonCode,
        retryable: false,
        retryDecision: 'denied',
        retryDecisionReason: reasonCode,
      },
      $unset: {
        executionOwner: 1,
        executionLeaseId: 1,
        executionLeaseExpiresAt: 1,
      },
    },
    sessionOption(options),
  );
  return true;
}

function abandonedCasFilter(work, cutoff) {
  return {
    _id: work._id,
    status: work.status,
    version: work.version,
    leaseExpiresAt: { $lte: cutoff },
  };
}

function leaseUnset() {
  return {
    leaseOwner: 1,
    leaseTokenHash: 1,
    leaseAcquiredAt: 1,
    leaseExpiresAt: 1,
    lastHeartbeatAt: 1,
  };
}

async function terminalizeAbandonedReplayDenial(work, cutoff, reasonCode, now, options = {}) {
  const status = replayDenialStatus(reasonCode);
  const item = await RuntimeWorkItem.findOneAndUpdate(
    abandonedCasFilter(work, cutoff),
    {
      $set: {
        status,
        lastErrorCode: safeCode(reasonCode, 'reasonCode', { required: true }),
        retryDecisionReason: safeCode(reasonCode, 'reasonCode', { required: true }),
        ...(status === 'recovery_required'
          ? { recoveryReasonCode: 'RESULT_PERSISTENCE_UNCERTAIN' }
          : finalizeTimestamp(status, now)),
      },
      $unset: leaseUnset(),
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!item) return null;
  await outboxForWork(
    item,
    terminalEvent(status),
    status === 'recovery_required'
      ? { recoveryReasonCode: 'RESULT_PERSISTENCE_UNCERTAIN' }
      : { reasonCode },
    options,
  );
  return item;
}

async function scanAbandonedWork(input = {}, options = {}) {
  assertAllowedKeys(
    input,
    new Set([
      'now',
      'graceMs',
      'limit',
      'partnerId',
      'receivingWorkspaceId',
      'workspaceId',
      'connectionId',
    ]),
    'abandonedScan',
  );
  const now = dateValue(input.now ?? options.now, 'now');
  const graceMs = integer(input.graceMs ?? env.DURABLE_WORK_ABANDONED_GRACE_MS, 'graceMs', {
    minimum: 1,
    maximum: 3_600_000,
  });
  const limit = integer(input.limit ?? env.DURABLE_WORKER_BATCH_SIZE, 'limit', {
    minimum: 1,
    maximum: 100,
  });
  const cutoff = new Date(now.getTime() - graceMs);
  const tenant = optionalTenantScope(input);
  const candidates = await RuntimeWorkItem.find({
    ...tenant,
    status: { $in: OWNED_DURABLE_WORK_STATUSES },
    leaseExpiresAt: { $lte: cutoff },
  })
    .sort({ leaseExpiresAt: 1, createdAt: 1, _id: 1 })
    .limit(limit)
    .lean();
  const result = {
    scanned: candidates.length,
    safelyRecovered: 0,
    recoveryRequired: 0,
    deadLettered: 0,
    cancelled: 0,
    terminalReconciled: 0,
    conflicts: 0,
  };

  for (const work of candidates) {
    const classification = classifyAbandonedWork(work);
    const terminalState = await invocationTerminalState(work, options);
    if (
      INVOCATION_TERMINAL_STATES.has(terminalState) &&
      (classification.classification !== 'pre_transmission' ||
        ['succeeded', 'cancelled'].includes(terminalState))
    ) {
      const status =
        terminalState === 'succeeded'
          ? 'completed'
          : terminalState === 'cancelled'
            ? 'cancelled'
            : 'failed';
      const terminal = await RuntimeWorkItem.findOneAndUpdate(
        abandonedCasFilter(work, cutoff),
        {
          $set: { status, ...finalizeTimestamp(status, now) },
          $unset: leaseUnset(),
          $inc: { version: 1 },
        },
        { new: true, runValidators: true, ...sessionOption(options) },
      );
      if (!terminal) {
        result.conflicts += 1;
        continue;
      }
      result.terminalReconciled += 1;
      await outboxForWork(
        terminal,
        terminalEvent(status),
        {
          reasonCode: 'RESULT_PERSISTENCE_RECONCILED',
        },
        options,
      );
      continue;
    }

    const decision = await (options.abandonedRetryDecision || abandonedRetryDecision)(
      work,
      classification,
    );
    if (decision.allowed === true && classification.replayAllowed) {
      const availableAt =
        work.status === 'retry_preparing'
          ? dateValue(work.availableAt, 'availableAt', now)
          : new Date(now.getTime() + Math.max(1, Number(decision.delayMs || 1)));
      const reasonCode = safeCode(decision.reason, 'reasonCode', { required: true });
      const prepareReplay =
        options.prepareInvocationForSafeReplay || prepareInvocationForSafeReplay;
      const inspected = await prepareReplay(
        work,
        {
          now,
          availableAt,
          reasonCode,
          dryRun: true,
          allowTerminalOverride: reasonCode === 'OPERATOR_REQUEUE_PRETRANSMISSION',
        },
        options,
      );
      if (
        inspected?.allowed !== true ||
        !Number.isInteger(inspected.nextAttemptNumber) ||
        inspected.nextAttemptNumber > Number(work.maximumAttempts)
      ) {
        const denialReason = safeCode(
          inspected?.reasonCode || 'INVOCATION_REPLAY_PREPARATION_CONFLICT',
          'reasonCode',
          { required: true },
        );
        const terminal = await terminalizeAbandonedReplayDenial(
          work,
          cutoff,
          denialReason,
          now,
          options,
        );
        if (terminal) {
          if (terminal.status === 'recovery_required') result.recoveryRequired += 1;
          else if (terminal.status === 'cancelled') result.cancelled += 1;
          else result.terminalReconciled += 1;
        } else {
          result.conflicts += 1;
        }
        continue;
      }
      const preparationOwnership = replayPreparationOwnership();
      const preparing = await RuntimeWorkItem.findOneAndUpdate(
        abandonedCasFilter(work, cutoff),
        {
          $set: {
            status: 'retry_preparing',
            availableAt,
            attemptNumber: inspected.nextAttemptNumber,
            retryDecisionReason: reasonCode,
            recoveryReasonCode: classification.recoveryReasonCode,
            ...replayPreparationLeaseSet(preparationOwnership, now),
          },
          $inc: { retryCount: work.status === 'retry_preparing' ? 0 : 1, version: 1 },
        },
        { new: true, runValidators: true, ...sessionOption(options) },
      );
      if (!preparing) {
        result.conflicts += 1;
        continue;
      }

      const preparedInvocation = await prepareReplay(
        plain(preparing),
        {
          now,
          availableAt,
          reasonCode,
          allowTerminalOverride: reasonCode === 'OPERATOR_REQUEUE_PRETRANSMISSION',
        },
        options,
      );
      if (
        preparedInvocation?.allowed !== true ||
        preparedInvocation.nextAttemptNumber !== inspected.nextAttemptNumber
      ) {
        const denialReason = safeCode(
          preparedInvocation?.reasonCode || 'INVOCATION_REPLAY_PREPARATION_CONFLICT',
          'reasonCode',
          { required: true },
        );
        const terminal = await terminalizeReplayPreparation(
          plain(preparing),
          preparationOwnership,
          denialReason,
          now,
          options,
        );
        if (!terminal) result.conflicts += 1;
        else if (terminal.status === 'recovery_required') result.recoveryRequired += 1;
        else if (terminal.status === 'cancelled') result.cancelled += 1;
        else result.terminalReconciled += 1;
        continue;
      }

      const recovered = await RuntimeWorkItem.findOneAndUpdate(
        replayPreparationFilter(plain(preparing), preparationOwnership, now),
        {
          $set: { status: 'pending' },
          $unset: leaseUnset(),
          $inc: { version: 1 },
        },
        { new: true, runValidators: true, ...sessionOption(options) },
      );
      if (!recovered) {
        result.conflicts += 1;
        continue;
      }
      result.safelyRecovered += 1;
      await outboxForWork(
        recovered,
        'work.abandoned_recovered',
        { recoveryReasonCode: classification.recoveryReasonCode },
        options,
      );
      continue;
    }

    if (decision.cancelled && classification.replayAllowed) {
      const cancelled = await RuntimeWorkItem.findOneAndUpdate(
        abandonedCasFilter(work, cutoff),
        {
          $set: {
            status: 'cancelled',
            cancelledAt: now,
            cancellationReasonCode: work.cancellationReasonCode || 'INVOCATION_CANCELLED',
          },
          $unset: leaseUnset(),
          $inc: { version: 1 },
        },
        { new: true, runValidators: true, ...sessionOption(options) },
      );
      if (!cancelled) {
        result.conflicts += 1;
        continue;
      }
      result.cancelled += 1;
      await outboxForWork(
        cancelled,
        'work.cancelled',
        {
          cancellationReasonCode: cancelled.cancellationReasonCode,
        },
        options,
      );
      continue;
    }

    if (decision.deadLetter && classification.replayAllowed) {
      const preparationOwnership = replayPreparationOwnership();
      const preparing = await RuntimeWorkItem.findOneAndUpdate(
        abandonedCasFilter(work, cutoff),
        {
          $set: {
            status: 'retry_preparing',
            lastErrorCode: 'DURABLE_WORK_LEASE_EXPIRED',
            retryDecisionReason: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
            recoveryReasonCode: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
            ...replayPreparationLeaseSet(preparationOwnership, now),
          },
          $inc: { version: 1 },
        },
        { new: true, runValidators: true, ...sessionOption(options) },
      );
      if (!preparing) {
        result.conflicts += 1;
        continue;
      }
      const invocationTerminalized = await terminalizeInvocationForDeadLetter(
        plain(preparing),
        now,
        options,
      );
      if (!invocationTerminalized) {
        const recovery = await RuntimeWorkItem.findOneAndUpdate(
          replayPreparationFilter(plain(preparing), preparationOwnership, now),
          {
            $set: {
              status: 'recovery_required',
              recoveryReasonCode: 'RESULT_PERSISTENCE_UNCERTAIN',
              retryDecisionReason: 'INVOCATION_REPLAY_PREPARATION_CONFLICT',
            },
            $unset: leaseUnset(),
            $inc: { version: 1 },
          },
          { new: true, runValidators: true, ...sessionOption(options) },
        );
        if (!recovery) {
          result.conflicts += 1;
          continue;
        }
        result.recoveryRequired += 1;
        await outboxForWork(
          recovery,
          'work.recovery_required',
          { recoveryReasonCode: 'RESULT_PERSISTENCE_UNCERTAIN' },
          options,
        );
      } else {
        const deadLettered = await RuntimeWorkItem.findOneAndUpdate(
          replayPreparationFilter(plain(preparing), preparationOwnership, now),
          {
            $set: {
              status: 'dead_lettered',
              failedAt: now,
              deadLetteredAt: now,
            },
            $unset: leaseUnset(),
            $inc: { version: 1 },
          },
          { new: true, runValidators: true, ...sessionOption(options) },
        );
        if (!deadLettered) {
          result.conflicts += 1;
          continue;
        }
        result.deadLettered += 1;
        await outboxForWork(
          deadLettered,
          'work.dead_lettered',
          {
            reasonCode: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
          },
          options,
        );
      }
      continue;
    }

    const recoveryReasonCode = classification.recoveryReasonCode;
    const recovery = await RuntimeWorkItem.findOneAndUpdate(
      abandonedCasFilter(work, cutoff),
      {
        $set: {
          status: 'recovery_required',
          failedAt: now,
          lastErrorCode: 'DURABLE_WORK_LEASE_EXPIRED',
          retryDecisionReason: 'REMOTE_OUTCOME_UNKNOWN',
          recoveryReasonCode,
        },
        $unset: leaseUnset(),
        $inc: { version: 1 },
      },
      { new: true, runValidators: true, ...sessionOption(options) },
    );
    if (!recovery) {
      result.conflicts += 1;
      continue;
    }
    result.recoveryRequired += 1;
    await markInvocationRecoveryForWork(recovery, recoveryReasonCode, now, options);
    await outboxForWork(recovery, 'work.recovery_required', { recoveryReasonCode }, options);
  }
  return result;
}

async function deadLetterWork(workItemId, ownership, input = {}, options = {}) {
  assertAllowedKeys(input, new Set(['reasonCode']), 'deadLetter');
  const now = dateValue(options.now, 'now');
  const current = await RuntimeWorkItem.findOne(ownershipFilter(workItemId, ownership, now))
    .select('+leaseOwner +leaseTokenHash')
    .lean();
  if (!current) throw leaseLost(workItemId);
  const classification = classifyAbandonedWork(current);
  if (!classification.replayAllowed) {
    return finalizeWork(
      workItemId,
      ownership,
      {
        status: 'recovery_required',
        lastErrorCode: input.reasonCode || 'DURABLE_WORK_EXECUTION_FAILED',
        retryDecisionReason: 'REMOTE_OUTCOME_UNKNOWN',
        recoveryReasonCode: classification.recoveryReasonCode,
      },
      options,
    );
  }
  return finalizeWork(
    workItemId,
    ownership,
    {
      status: 'dead_lettered',
      lastErrorCode: input.reasonCode || 'DURABLE_WORK_EXECUTION_FAILED',
      retryDecisionReason: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
      recoveryReasonCode: 'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
    },
    options,
  );
}

async function requeueDeadLetter(input, options = {}) {
  assertAllowedKeys(
    input,
    new Set([
      'partnerId',
      'receivingWorkspaceId',
      'workspaceId',
      'connectionId',
      'workItemId',
      'version',
    ]),
    'deadLetterRequeue',
  );
  const identity = tenantIdentity(input);
  const version = integer(input.version, 'version', { minimum: 0 });
  const now = dateValue(options.now, 'now');
  const current = await RuntimeWorkItem.findOne({
    _id: objectId(input.workItemId, 'workItemId'),
    ...identity,
    status: 'dead_lettered',
  }).lean();
  if (!current) {
    throw new AppError(404, ErrorCodes.DURABLE_WORK_NOT_FOUND, 'Dead-letter work was not found.');
  }
  if (
    classifyAbandonedWork(current).replayAllowed !== true ||
    Number(current.requeueCount || 0) >= 1 ||
    Number(current.attemptNumber || 0) >= env.DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS
  ) {
    throw new AppError(
      409,
      ErrorCodes.DURABLE_WORK_REQUEUE_DENIED,
      'Dead-letter work is not eligible for safe requeue.',
      [],
      { workItemId: idOf(current), reasonCode: 'SAFE_PRETRANSMISSION_REQUEUE_NOT_PROVEN' },
    );
  }
  const prepareReplay = options.prepareInvocationForSafeReplay || prepareInvocationForSafeReplay;
  const inspected = await prepareReplay(
    current,
    {
      now,
      availableAt: now,
      maximumAttempts: env.DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS,
      reasonCode: 'OPERATOR_REQUEUE_PRETRANSMISSION',
      allowTerminalOverride: true,
      dryRun: true,
    },
    options,
  );
  if (
    inspected?.allowed !== true ||
    !Number.isInteger(inspected.nextAttemptNumber) ||
    inspected.nextAttemptNumber > env.DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS
  ) {
    throw new AppError(
      409,
      ErrorCodes.DURABLE_WORK_REQUEUE_DENIED,
      'Dead-letter work could not align the invocation and work attempt.',
      [],
      {
        workItemId: idOf(current),
        reasonCode: safeCode(inspected?.reasonCode || 'DURABLE_ATTEMPT_MISMATCH', 'reasonCode', {
          required: true,
        }),
      },
    );
  }
  const preparationOwnership = replayPreparationOwnership();
  const preparing = await RuntimeWorkItem.findOneAndUpdate(
    {
      _id: current._id,
      ...identity,
      status: 'dead_lettered',
      version,
      requeueCount: { $lt: 1 },
    },
    {
      $set: {
        status: 'retry_preparing',
        availableAt: now,
        attemptNumber: inspected.nextAttemptNumber,
        requeuedAt: now,
        retryCount: 0,
        maximumAttempts: Math.max(Number(current.maximumAttempts), inspected.nextAttemptNumber),
        retryDecisionReason: 'OPERATOR_REQUEUE_PRETRANSMISSION',
        recoveryReasonCode: 'WORKER_TERMINATED_BEFORE_TRANSMISSION',
        ...replayPreparationLeaseSet(preparationOwnership, now),
      },
      $unset: {
        cancellationRequestedAt: 1,
        cancellationReasonCode: 1,
        cancelledAt: 1,
      },
      $inc: { requeueCount: 1, version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!preparing) {
    throw new AppError(
      409,
      ErrorCodes.DURABLE_WORK_REQUEUE_DENIED,
      'Dead-letter work changed before safe requeue.',
      [],
      { workItemId: idOf(current), reasonCode: 'DEAD_LETTER_VERSION_CONFLICT' },
    );
  }

  const preparedInvocation = await prepareReplay(
    plain(preparing),
    {
      now,
      availableAt: now,
      maximumAttempts: env.DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS,
      reasonCode: 'OPERATOR_REQUEUE_PRETRANSMISSION',
      allowTerminalOverride: true,
    },
    options,
  );
  if (
    preparedInvocation?.allowed !== true ||
    preparedInvocation.nextAttemptNumber !== inspected.nextAttemptNumber
  ) {
    const preparationReason = safeCode(
      preparedInvocation?.reasonCode || 'INVOCATION_REPLAY_PREPARATION_CONFLICT',
      'reasonCode',
      { required: true },
    );
    await terminalizeReplayPreparation(
      plain(preparing),
      preparationOwnership,
      preparationReason,
      now,
      options,
    );
    throw new AppError(
      409,
      ErrorCodes.DURABLE_WORK_REQUEUE_DENIED,
      'Dead-letter work could not safely prepare the invocation.',
      [],
      { workItemId: idOf(current), reasonCode: preparationReason },
    );
  }

  const requeued = await RuntimeWorkItem.findOneAndUpdate(
    replayPreparationFilter(plain(preparing), preparationOwnership, now),
    {
      $set: { status: 'pending' },
      $unset: leaseUnset(),
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!requeued) {
    throw new AppError(
      409,
      ErrorCodes.DURABLE_WORK_FINALIZATION_CONFLICT,
      'Dead-letter replay preparation ownership was lost.',
      [],
      { workItemId: idOf(current), reasonCode: 'REQUEUE_PREPARATION_FENCE_LOST' },
    );
  }
  await outboxForWork(
    requeued,
    'work.requeued',
    { reasonCode: 'OPERATOR_REQUEUE_PRETRANSMISSION' },
    options,
  );
  return { workItem: requeued, safe: serializeWorkItem(requeued) };
}

function chainLean(query) {
  return typeof query?.lean === 'function' ? query.lean() : query;
}

async function linkReconciledInvocationWork(invocation, workItem, options = {}) {
  const linked = await Invocation.findOneAndUpdate(
    {
      _id: invocation._id,
      receivingWorkspaceId: invocation.receivingWorkspaceId,
      connectionId: invocation.connectionId,
      lifecycleState: { $in: ['accepted', 'validating', 'authorized'] },
      cancellationState: { $nin: ['requested', 'aborting', 'confirmed'] },
      recoveryState: { $ne: 'required' },
      protectedReplayAvailable: true,
      executionGeneration: Number(workItem.executionGeneration || 1),
      $or: [
        { currentWorkItemId: workItem._id },
        { currentWorkItemId: { $exists: false } },
        { currentWorkItemId: null },
      ],
    },
    { $set: { currentWorkItemId: workItem._id } },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  return Boolean(linked);
}

async function reserveWorkForReconciliation(workItem, now, options = {}) {
  if (!CLAIMABLE_DURABLE_WORK_STATUSES.includes(workItem.status)) return null;
  const ownership = {
    leaseOwner: `reconciler:${crypto.randomUUID()}`,
    leaseToken: rawLeaseToken(),
  };
  const item = await RuntimeWorkItem.findOneAndUpdate(
    {
      _id: workItem._id,
      status: workItem.status,
      version: workItem.version,
      cancellationRequestedAt: { $exists: false },
      $or: [
        { leaseExpiresAt: { $exists: false } },
        { leaseExpiresAt: null },
        { leaseExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        status: 'claimed',
        claimedAt: now,
        safeStage: 'work_claimed',
        ...replayPreparationLeaseSet(ownership, now),
      },
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
  if (!item) return null;
  return { item, ownership, releaseStatus: workItem.status };
}

async function releaseReconciledWork(workItem, ownership, releaseStatus, now, options = {}) {
  return RuntimeWorkItem.findOneAndUpdate(
    {
      ...ownershipFilter(workItem._id, ownership, now, ['claimed']),
      version: workItem.version,
    },
    {
      $set: { status: releaseStatus },
      $unset: leaseUnset(),
      $inc: { version: 1 },
    },
    { new: true, runValidators: true, ...sessionOption(options) },
  );
}

async function reconcileAcceptedInvocations(input = {}, options = {}) {
  assertAllowedKeys(
    input,
    new Set(['now', 'limit', 'partnerId', 'receivingWorkspaceId', 'workspaceId', 'connectionId']),
    'reconciliation',
  );
  const now = dateValue(input.now ?? options.now, 'now');
  const limit = integer(input.limit ?? env.DURABLE_WORKER_BATCH_SIZE, 'limit', {
    minimum: 1,
    maximum: 100,
  });
  const cutoff = new Date(now.getTime() - env.DURABLE_WORK_ABANDONED_GRACE_MS);
  const tenant = optionalTenantScope(input);
  const query = Invocation.find({
    ...(tenant.receivingWorkspaceId ? { receivingWorkspaceId: tenant.receivingWorkspaceId } : {}),
    ...(tenant.connectionId ? { connectionId: tenant.connectionId } : {}),
    lifecycleState: { $in: ['accepted', 'validating', 'authorized'] },
    cancellationState: { $nin: ['requested', 'aborting', 'confirmed'] },
    recoveryState: { $ne: 'required' },
    protectedReplayAvailable: true,
    createdAt: { $lte: cutoff },
    $or: [
      { executionLeaseExpiresAt: { $exists: false } },
      { executionLeaseExpiresAt: null },
      { executionLeaseExpiresAt: { $lte: now } },
    ],
    lastProgressStage: {
      $nin: [
        'outbound_request_started',
        'remote_response_received',
        'response_validation_started',
        'finalization_started',
        'terminalized',
      ],
    },
  })
    .select(
      '_id connectionId receivingWorkspaceId lifecycleState cancellationState recoveryState protectedReplayAvailable attemptCount retryState traceId recoveryParentInvocationId createdAt currentWorkItemId executionGeneration +executionLeaseExpiresAt',
    )
    .sort({ createdAt: 1, _id: 1 })
    .limit(limit);
  const invocations = await chainLean(query);
  const result = {
    scanned: invocations.length,
    created: 0,
    existing: 0,
    linked: 0,
    terminalReconciled: 0,
    skipped: 0,
  };
  for (const invocation of invocations) {
    const connectionQuery = PassportConnection.findOne({
      _id: invocation.connectionId,
      receivingWorkspaceId: invocation.receivingWorkspaceId,
      status: 'connected',
      ...(tenant.partnerId ? { partnerId: tenant.partnerId } : {}),
    }).select('partnerId receivingWorkspaceId status');
    const connection = await chainLean(connectionQuery);
    if (!connection) {
      result.skipped += 1;
      continue;
    }
    const existingQuery = RuntimeWorkItem.findOne({
      partnerId: connection.partnerId,
      receivingWorkspaceId: invocation.receivingWorkspaceId,
      connectionId: invocation.connectionId,
      invocationId: invocation._id,
    }).sort({ executionGeneration: -1, createdAt: -1, _id: -1 });
    const existingWork = await chainLean(existingQuery);
    if (existingWork) {
      if (TERMINAL_DURABLE_WORK_STATUSES.includes(existingWork.status)) {
        const reconciled = await reconcileTerminalWorkInvocation(
          invocation,
          existingWork,
          now,
          options,
        );
        if (reconciled) {
          result.existing += 1;
          result.linked += 1;
          result.terminalReconciled += 1;
        } else {
          result.skipped += 1;
        }
        continue;
      }
      if (idOf(invocation.currentWorkItemId) === idOf(existingWork)) {
        result.existing += 1;
        result.linked += 1;
        continue;
      }
      const reservation = await reserveWorkForReconciliation(existingWork, now, options);
      if (!reservation) {
        result.skipped += 1;
        continue;
      }
      if (!(await linkReconciledInvocationWork(invocation, reservation.item, options))) {
        await finalizeWork(
          reservation.item._id,
          reservation.ownership,
          {
            status: 'failed',
            lastErrorCode: 'WORK_LINK_CONFLICT',
            retryDecisionReason: 'WORK_LINK_CONFLICT',
          },
          { ...options, now },
        );
        result.skipped += 1;
        continue;
      }
      const released = await releaseReconciledWork(
        reservation.item,
        reservation.ownership,
        reservation.releaseStatus,
        now,
        options,
      );
      if (!released) {
        result.skipped += 1;
        continue;
      }
      result.existing += 1;
      result.linked += 1;
      await outboxForWork(
        released,
        'work.reconciled',
        { reasonCode: 'EXECUTABLE_INVOCATION_MISSING_WORK' },
        options,
      );
      continue;
    }
    const attemptNumber = Math.max(1, Number(invocation.attemptCount || 0) + 1);
    const executionGeneration = Math.max(1, Number(invocation.executionGeneration || 1));
    const maximumAttempts = Math.max(attemptNumber, env.DURABLE_WORK_MAX_ATTEMPTS);
    if (maximumAttempts > env.DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS) {
      result.skipped += 1;
      continue;
    }
    const reconciliationOwner = `reconciler:${crypto.randomUUID()}`;
    const enqueued = await enqueueWork(
      {
        partnerId: connection.partnerId,
        receivingWorkspaceId: invocation.receivingWorkspaceId,
        connectionId: invocation.connectionId,
        invocationId: invocation._id,
        credentialBindingId: invocation.credentialBindingId,
        credentialRequirement: invocation.credentialRequirement,
        attemptNumber,
        executionGeneration,
        workType: invocation.recoveryParentInvocationId ? 'recovery_retry' : 'runtime_invocation',
        traceId: invocation.traceId,
        availableAt: now,
        maximumAttempts,
      },
      {
        ...options,
        now,
        initialClaim: {
          leaseOwner: reconciliationOwner,
          leaseMs: env.DURABLE_WORK_LEASE_MS,
        },
      },
    );
    // A concurrent reconciler that won the insert owns the reservation and will link/release it.
    // Never mutate the Invocation around a Work item whose fencing token is held elsewhere.
    if (!enqueued.ownership) {
      result.existing += 1;
      continue;
    }
    if (!(await linkReconciledInvocationWork(invocation, enqueued.workItem, options))) {
      await finalizeWork(
        enqueued.workItem._id,
        enqueued.ownership,
        {
          status: 'failed',
          lastErrorCode: 'WORK_LINK_CONFLICT',
          retryDecisionReason: 'WORK_LINK_CONFLICT',
        },
        { ...options, now },
      );
      result.skipped += 1;
      continue;
    }
    const released = await releaseReconciledWork(
      enqueued.workItem,
      enqueued.ownership,
      'pending',
      now,
      options,
    );
    if (!released) {
      result.skipped += 1;
      continue;
    }
    result.linked += 1;
    if (enqueued.created) result.created += 1;
    else result.existing += 1;
    await outboxForWork(
      released,
      'work.reconciled',
      { reasonCode: 'EXECUTABLE_INVOCATION_MISSING_WORK' },
      options,
    );
  }
  return result;
}

function pagination(input = {}) {
  const page = integer(input.page ?? 1, 'page', { minimum: 1, maximum: 1_000_000 });
  const limit = integer(input.limit ?? 25, 'limit', { minimum: 1, maximum: 100 });
  return { page, limit, skip: (page - 1) * limit };
}

async function listWorkItems(input, options = {}) {
  assertAllowedKeys(
    input,
    new Set([
      'partnerId',
      'receivingWorkspaceId',
      'workspaceId',
      'connectionId',
      'invocationId',
      'status',
      'page',
      'limit',
    ]),
    'workList',
  );
  const identity = tenantScope(input);
  const paging = pagination(input);
  const filter = {
    partnerId: identity.partnerId,
    receivingWorkspaceId: identity.receivingWorkspaceId,
    ...(identity.connectionId ? { connectionId: identity.connectionId } : {}),
    ...(input.invocationId ? { invocationId: objectId(input.invocationId, 'invocationId') } : {}),
  };
  if (input.status) {
    const statuses = Array.isArray(input.status) ? input.status : [input.status];
    if (!statuses.length || statuses.some((status) => !DURABLE_WORK_STATUSES.includes(status))) {
      throw validationError('status', 'status contains an unapproved work state.');
    }
    filter.status = { $in: statuses };
  }
  const itemsQuery = RuntimeWorkItem.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(paging.skip)
    .limit(paging.limit);
  const [items, total] = await Promise.all([
    chainLean(itemsQuery),
    RuntimeWorkItem.countDocuments(filter, sessionOption(options)),
  ]);
  return {
    items: items.map(serializeWorkItem),
    pagination: { page: paging.page, limit: paging.limit, total },
  };
}

function metricCountMap(entries = []) {
  return Object.assign(
    Object.fromEntries(DURABLE_WORK_STATUSES.map((status) => [status, 0])),
    Object.fromEntries(entries.map((entry) => [entry._id, Number(entry.count || 0)])),
  );
}

async function durableWorkMetrics(input, options = {}) {
  assertAllowedKeys(
    input,
    new Set(['partnerId', 'receivingWorkspaceId', 'workspaceId', 'connectionId', 'now']),
    'workMetrics',
  );
  const identity = tenantScope(input);
  const now = dateValue(input.now ?? options.now, 'now');
  const match = {
    partnerId: identity.partnerId,
    receivingWorkspaceId: identity.receivingWorkspaceId,
    ...(identity.connectionId ? { connectionId: identity.connectionId } : {}),
  };
  const [facet = {}] = await RuntimeWorkItem.aggregate([
    { $match: match },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        dueExecutable: [
          {
            $match: {
              status: { $in: CLAIMABLE_DURABLE_WORK_STATUSES },
              availableAt: { $lte: now },
              cancellationRequestedAt: { $exists: false },
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              oldestAvailableAt: { $min: '$availableAt' },
            },
          },
        ],
        queueWait: [
          { $match: { claimedAt: { $type: 'date' }, availableAt: { $type: 'date' } } },
          {
            $group: {
              _id: null,
              averageMs: {
                $avg: { $subtract: ['$claimedAt', '$availableAt'] },
              },
            },
          },
        ],
        abandoned: [
          {
            $match: {
              status: { $in: OWNED_DURABLE_WORK_STATUSES },
              leaseExpiresAt: { $lte: now },
            },
          },
          { $count: 'count' },
        ],
      },
    },
  ]).option(sessionOption(options));
  const dueExecutable = facet.dueExecutable?.[0];
  const oldest = dueExecutable?.oldestAvailableAt;
  return {
    counts: metricCountMap(facet.byStatus),
    dueExecutableCount: Number(dueExecutable?.count || 0),
    abandonedLeaseCount: Number(facet.abandoned?.[0]?.count || 0),
    oldestPendingAgeMs: oldest ? Math.max(0, now.getTime() - new Date(oldest).getTime()) : 0,
    averageQueueWaitMs: Math.max(0, Math.round(Number(facet.queueWait?.[0]?.averageMs || 0))),
  };
}

async function upsertWorkerHeartbeat(input, options = {}) {
  assertAllowedKeys(
    input,
    new Set([
      'workerId',
      'status',
      'startedAt',
      'lastHeartbeatAt',
      'activeWorkCount',
      'draining',
      'version',
    ]),
    'workerHeartbeat',
  );
  const workerId = safeIdentifier(input.workerId, 'workerId');
  if (!RUNTIME_WORKER_STATUSES.includes(input.status)) {
    throw validationError('status', 'Worker status is not approved.');
  }
  const now = dateValue(input.lastHeartbeatAt ?? options.now, 'lastHeartbeatAt');
  const startedAt = dateValue(input.startedAt, 'startedAt');
  const activeWorkCount = integer(input.activeWorkCount ?? 0, 'activeWorkCount', {
    minimum: 0,
    maximum: 1_000,
  });
  const draining = input.draining === true || input.status === 'draining';
  const version = safeIdentifier(input.version, 'version', { required: false });
  const item = await RuntimeWorkerHeartbeat.findOneAndUpdate(
    { workerId },
    {
      $set: {
        status: input.status,
        lastHeartbeatAt: now,
        expiresAt: new Date(now.getTime() + RUNTIME_WORKER_HEARTBEAT_RETENTION_MS),
        activeWorkCount,
        draining,
        ...(version ? { version } : {}),
      },
      $setOnInsert: { workerId, startedAt },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      ...sessionOption(options),
    },
  );
  return {
    workerId: item.workerId,
    status: item.status,
    startedAt: item.startedAt,
    lastHeartbeatAt: item.lastHeartbeatAt,
    activeWorkCount: item.activeWorkCount,
    draining: item.draining,
    version: item.version,
  };
}

async function aggregateWorkerHealth(input = {}, options = {}) {
  assertAllowedKeys(input, new Set(['now', 'staleAfterMs']), 'workerHealth');
  const now = dateValue(input.now ?? options.now, 'now');
  const staleAfterMs = integer(
    input.staleAfterMs ?? env.DURABLE_WORK_HEARTBEAT_MS * 3,
    'staleAfterMs',
    { minimum: env.DURABLE_WORK_HEARTBEAT_MS, maximum: env.DURABLE_WORK_LEASE_MS },
  );
  const cutoff = new Date(now.getTime() - staleAfterMs);
  const retirementCutoff = new Date(now.getTime() - RUNTIME_WORKER_HEARTBEAT_RETENTION_MS);
  const [summary = {}] = await RuntimeWorkerHeartbeat.aggregate([
    {
      $match: {
        status: { $in: ['ready', 'draining'] },
        lastHeartbeatAt: { $gte: retirementCutoff },
      },
    },
    {
      $group: {
        _id: null,
        readyWorkers: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'ready'] }, { $gte: ['$lastHeartbeatAt', cutoff] }] },
              1,
              0,
            ],
          },
        },
        drainingWorkers: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'draining'] }, { $gte: ['$lastHeartbeatAt', cutoff] }] },
              1,
              0,
            ],
          },
        },
        staleWorkers: { $sum: { $cond: [{ $lt: ['$lastHeartbeatAt', cutoff] }, 1, 0] } },
        activeWorkCount: {
          $sum: {
            $cond: [{ $gte: ['$lastHeartbeatAt', cutoff] }, '$activeWorkCount', 0],
          },
        },
        lastHeartbeatAt: { $max: '$lastHeartbeatAt' },
      },
    },
  ]).option(sessionOption(options));
  const readyWorkers = Number(summary.readyWorkers || 0);
  const drainingWorkers = Number(summary.drainingWorkers || 0);
  const activeWorkers = readyWorkers + drainingWorkers;
  const staleWorkers = Number(summary.staleWorkers || 0);
  return {
    status:
      readyWorkers > 0
        ? 'healthy'
        : drainingWorkers > 0
          ? 'draining'
          : staleWorkers > 0
            ? 'worker_heartbeat_stale'
            : 'no_active_worker',
    activeWorkers,
    readyWorkers,
    drainingWorkers,
    staleWorkers,
    activeWorkCount: Number(summary.activeWorkCount || 0),
    lastHeartbeatAt: summary.lastHeartbeatAt,
    staleAfterMs,
  };
}

function transactionUnsupported(error) {
  return (
    [20, 303].includes(Number(error?.code)) ||
    /transaction numbers are only allowed|transactions are not supported/i.test(
      String(error?.message || ''),
    )
  );
}

async function withDurableTransaction(operation, options = {}) {
  if (typeof operation !== 'function') {
    throw validationError('operation', 'operation must be a function.');
  }
  const connection = options.connection || mongoose.connection;
  if (!connection || typeof connection.startSession !== 'function') {
    if (options.allowCompensation === false) {
      throw new AppError(
        503,
        ErrorCodes.DURABLE_WORK_RECONCILIATION_FAILED,
        'MongoDB transactions are unavailable.',
      );
    }
    return operation({ session: null, transactional: false, reconciliationRequired: true });
  }
  const session = await connection.startSession();
  try {
    let value;
    await session.withTransaction(async () => {
      value = await operation({ session, transactional: true, reconciliationRequired: false });
    });
    return value;
  } catch (error) {
    if (!transactionUnsupported(error) || options.allowCompensation === false) throw error;
    return operation({ session: null, transactional: false, reconciliationRequired: true });
  } finally {
    await session.endSession();
  }
}

async function ensureDurableIndexes() {
  await RuntimeWorkItem.createIndexes();
  await DurableEventOutbox.createIndexes();
  await RuntimeWorkerHeartbeat.createIndexes();
  await Invocation.createIndexes();
  await InvocationAttempt.createIndexes();
  return {
    ready: true,
    models: [
      'RuntimeWorkItem',
      'DurableEventOutbox',
      'RuntimeWorkerHeartbeat',
      'Invocation',
      'InvocationAttempt',
    ],
  };
}

module.exports = {
  aggregateWorkerHealth,
  appendOutboxEvent,
  claimNextWork,
  claimWorkById,
  classifyAbandonedWork,
  deadLetterWork,
  deterministicDedupeKey,
  durableWorkMetrics,
  enqueueWork,
  ensureDurableIndexes,
  finalizeWork,
  generateWorkerId,
  getOwnedWorkControlState,
  heartbeatWork,
  listWorkItems,
  prepareInvocationForSafeReplay,
  persistWorkOutboxEvent: outboxForWork,
  reconcileAcceptedInvocations,
  recordMilestone,
  repairDurableOutbox,
  requestWorkCancellation,
  requeueDeadLetter,
  scanAbandonedWork,
  scheduleRetry,
  serializeWorkItem,
  startWork,
  upsertWorkerHeartbeat,
  withDurableTransaction,
};
