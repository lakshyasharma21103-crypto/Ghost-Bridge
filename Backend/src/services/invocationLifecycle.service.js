const crypto = require('node:crypto');
const Invocation = require('../models/Invocation');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { redactSecrets } = require('../utils/redact');
const { OPERATION_STAGE_NAMES, MAX_INVOCATION_STAGE_METRICS } = require('../constants/operations');
const {
  ALLOWED_INVOCATION_TRANSITIONS,
  INVOCATION_RETRY_STATES,
  INVOCATION_STATES,
  LIFECYCLE_STATE_TO_LEGACY_STATUS,
  LIFECYCLE_TIMESTAMP_FIELDS,
  MAX_INVOCATION_STATE_HISTORY,
  TERMINAL_INVOCATION_STATES,
} = require('../constants/invocationLifecycle');

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/;
const OUTCOME_FIELDS = new Set([
  'attemptCount',
  'durationMs',
  'error',
  'output',
  'retryDecisionReason',
  'retryScheduledAt',
  'retryState',
  'runtimeStatus',
  'stageMetrics',
]);

function lifecycleError(code, message, metadata = {}) {
  return new AppError(
    code === ErrorCodes.INVOCATION_NOT_FOUND ? 404 : 409,
    code,
    message,
    [],
    metadata,
  );
}

function assertKnownState(state, path = 'lifecycleState') {
  if (!INVOCATION_STATES.includes(state)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Invocation lifecycle validation failed.',
      [{ path, message: `${path} must be a recognized invocation state.` }],
    );
  }
  return state;
}

function allowedTransitionsFrom(state) {
  assertKnownState(state);
  return ALLOWED_INVOCATION_TRANSITIONS[state];
}

function canTransition(fromState, toState) {
  return (
    INVOCATION_STATES.includes(fromState) &&
    INVOCATION_STATES.includes(toState) &&
    ALLOWED_INVOCATION_TRANSITIONS[fromState].includes(toState)
  );
}

function assertTransition(fromState, toState) {
  assertKnownState(fromState, 'fromState');
  assertKnownState(toState, 'toState');
  if (!canTransition(fromState, toState)) {
    throw lifecycleError(
      ErrorCodes.INVOCATION_STATE_TRANSITION_INVALID,
      'Invocation state transition is not allowed.',
      { fromState, toState },
    );
  }
}

function isTerminalState(state) {
  return TERMINAL_INVOCATION_STATES.includes(state);
}

function legacyStatusForState(state) {
  assertKnownState(state);
  return LIFECYCLE_STATE_TO_LEGACY_STATUS[state];
}

function safeOptionalIdentifier(value, path, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (!required) return undefined;
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Invocation lifecycle validation failed.',
      [{ path, message: `${path} is required.` }],
    );
  }
  const normalized = String(value).trim();
  if (!SAFE_IDENTIFIER_PATTERN.test(normalized)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Invocation lifecycle validation failed.',
      [{ path, message: `${path} must be a safe identifier.` }],
    );
  }
  return normalized;
}

function safeReasonCode(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (!required) return undefined;
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Invocation lifecycle validation failed.',
      [{ path: 'reasonCode', message: 'reasonCode is required.' }],
    );
  }
  const normalized = String(value).trim().toUpperCase();
  if (!SAFE_CODE_PATTERN.test(normalized)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Invocation lifecycle validation failed.',
      [{ path: 'reasonCode', message: 'reasonCode must be a safe machine-readable code.' }],
    );
  }
  return normalized;
}

function transitionHistoryEntry(fromState, toState, options = {}) {
  const at = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const attemptNumber = options.attemptNumber;
  if (attemptNumber !== undefined && (!Number.isInteger(attemptNumber) || attemptNumber < 1)) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Invocation lifecycle validation failed.',
      [{ path: 'attemptNumber', message: 'attemptNumber must be a positive integer.' }],
    );
  }
  return {
    fromState,
    toState,
    at,
    ...(options.reasonCode ? { reasonCode: safeReasonCode(options.reasonCode) } : {}),
    ...(attemptNumber ? { attemptNumber } : {}),
    ...(options.traceId ? { traceId: safeOptionalIdentifier(options.traceId, 'traceId') } : {}),
    ...(options.requestId
      ? { requestId: safeOptionalIdentifier(options.requestId, 'requestId') }
      : {}),
  };
}

function outcomeValidationError(path, message) {
  return new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invocation outcome validation failed.', [
    { path, message },
  ]);
}

function safeMachineValue(value, path, { code = false } = {}) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim();
  const candidate = code ? normalized.toUpperCase() : normalized;
  const pattern = code ? SAFE_CODE_PATTERN : SAFE_NAME_PATTERN;
  if (!pattern.test(candidate)) {
    throw outcomeValidationError(path, `${path} must be a safe machine-readable value.`);
  }
  return candidate;
}

function safeStoredError(error) {
  if (error === undefined) return undefined;
  if (error === null) return null;
  if (!error || typeof error !== 'object' || Array.isArray(error)) {
    throw outcomeValidationError('outcome.error', 'outcome.error must be an object or null.');
  }
  const providerHttpStatus =
    error.providerHttpStatus === undefined ? undefined : Number(error.providerHttpStatus);
  if (
    providerHttpStatus !== undefined &&
    (!Number.isInteger(providerHttpStatus) || providerHttpStatus < 100 || providerHttpStatus > 599)
  ) {
    throw outcomeValidationError(
      'outcome.error.providerHttpStatus',
      'providerHttpStatus must be an HTTP status code.',
    );
  }
  const durationMs = error.durationMs === undefined ? undefined : Number(error.durationMs);
  if (durationMs !== undefined && (!Number.isFinite(durationMs) || durationMs < 0)) {
    throw outcomeValidationError(
      'outcome.error.durationMs',
      'durationMs must be a non-negative number.',
    );
  }
  return {
    ...(safeMachineValue(error.code, 'outcome.error.code', { code: true })
      ? { code: safeMachineValue(error.code, 'outcome.error.code', { code: true }) }
      : {}),
    ...(safeMachineValue(error.internalCode, 'outcome.error.internalCode', { code: true })
      ? {
          internalCode: safeMachineValue(error.internalCode, 'outcome.error.internalCode', {
            code: true,
          }),
        }
      : {}),
    ...(safeMachineValue(error.operation, 'outcome.error.operation')
      ? { operation: safeMachineValue(error.operation, 'outcome.error.operation') }
      : {}),
    ...(safeMachineValue(error.stage, 'outcome.error.stage')
      ? { stage: safeMachineValue(error.stage, 'outcome.error.stage') }
      : {}),
    ...(typeof error.retryable === 'boolean' ? { retryable: error.retryable } : {}),
    ...(safeMachineValue(error.timeoutReason, 'outcome.error.timeoutReason', { code: true })
      ? {
          timeoutReason: safeMachineValue(error.timeoutReason, 'outcome.error.timeoutReason', {
            code: true,
          }),
        }
      : {}),
    ...(safeMachineValue(error.causeCode, 'outcome.error.causeCode', { code: true })
      ? { causeCode: safeMachineValue(error.causeCode, 'outcome.error.causeCode', { code: true }) }
      : {}),
    ...(safeMachineValue(error.causeName, 'outcome.error.causeName')
      ? { causeName: safeMachineValue(error.causeName, 'outcome.error.causeName') }
      : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(providerHttpStatus !== undefined ? { providerHttpStatus } : {}),
    ...(safeMachineValue(error.retryDecisionReason, 'outcome.error.retryDecisionReason', {
      code: true,
    })
      ? {
          retryDecisionReason: safeMachineValue(
            error.retryDecisionReason,
            'outcome.error.retryDecisionReason',
            { code: true },
          ),
        }
      : {}),
  };
}

function safeStageMetrics(metrics) {
  if (metrics === undefined) return undefined;
  if (!Array.isArray(metrics) || metrics.length > MAX_INVOCATION_STAGE_METRICS) {
    throw outcomeValidationError(
      'outcome.stageMetrics',
      `stageMetrics must contain at most ${MAX_INVOCATION_STAGE_METRICS} entries.`,
    );
  }
  return metrics.map((metric, index) => {
    if (!OPERATION_STAGE_NAMES.includes(metric?.stage)) {
      throw outcomeValidationError(
        `outcome.stageMetrics.${index}.stage`,
        'stage must be an approved operational stage.',
      );
    }
    if (!['completed', 'failed'].includes(metric?.status)) {
      throw outcomeValidationError(
        `outcome.stageMetrics.${index}.status`,
        'status must be completed or failed.',
      );
    }
    if (!Number.isFinite(metric?.durationMs) || metric.durationMs < 0) {
      throw outcomeValidationError(
        `outcome.stageMetrics.${index}.durationMs`,
        'durationMs must be a non-negative number.',
      );
    }
    return {
      stage: metric.stage,
      status: metric.status,
      durationMs: Math.round(metric.durationMs * 100) / 100,
    };
  });
}

function safeOutcomeSet(outcome) {
  if (outcome === undefined) return {};
  if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) {
    throw outcomeValidationError('outcome', 'outcome must be an object.');
  }
  const unsupported = Object.keys(outcome).filter((key) => !OUTCOME_FIELDS.has(key));
  if (unsupported.length) {
    throw outcomeValidationError(
      `outcome.${unsupported[0]}`,
      `${unsupported[0]} is not an approved invocation outcome field.`,
    );
  }
  const set = {};
  if (outcome.durationMs !== undefined) {
    const durationMs = Number(outcome.durationMs);
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      throw outcomeValidationError('outcome.durationMs', 'durationMs must be non-negative.');
    }
    set.durationMs = durationMs;
  }
  if (outcome.attemptCount !== undefined) {
    const attemptCount = Number(outcome.attemptCount);
    if (!Number.isInteger(attemptCount) || attemptCount < 0) {
      throw outcomeValidationError(
        'outcome.attemptCount',
        'attemptCount must be a non-negative integer.',
      );
    }
    set.attemptCount = attemptCount;
  }
  if (outcome.retryState !== undefined) {
    if (!INVOCATION_RETRY_STATES.includes(outcome.retryState)) {
      throw outcomeValidationError('outcome.retryState', 'retryState is not recognized.');
    }
    set.retryState = outcome.retryState;
  }
  if (outcome.retryDecisionReason !== undefined) {
    set.retryDecisionReason = safeReasonCode(outcome.retryDecisionReason, { required: true });
  }
  if (outcome.retryScheduledAt !== undefined) {
    const retryScheduledAt = new Date(outcome.retryScheduledAt);
    if (Number.isNaN(retryScheduledAt.getTime())) {
      throw outcomeValidationError(
        'outcome.retryScheduledAt',
        'retryScheduledAt must be a valid date.',
      );
    }
    set.retryScheduledAt = retryScheduledAt;
  }
  if (outcome.runtimeStatus !== undefined) {
    const runtimeStatus = Number(outcome.runtimeStatus);
    if (!Number.isInteger(runtimeStatus) || runtimeStatus < 100 || runtimeStatus > 599) {
      throw outcomeValidationError(
        'outcome.runtimeStatus',
        'runtimeStatus must be an HTTP status code.',
      );
    }
    set.runtimeStatus = runtimeStatus;
  }
  if (Object.prototype.hasOwnProperty.call(outcome, 'output')) {
    set.output = redactSecrets(outcome.output);
  }
  if (Object.prototype.hasOwnProperty.call(outcome, 'error')) {
    set.error = safeStoredError(outcome.error);
  }
  if (Object.prototype.hasOwnProperty.call(outcome, 'stageMetrics')) {
    set.stageMetrics = safeStageMetrics(outcome.stageMetrics);
  }
  return set;
}

function transitionUpdate(fromState, toState, options = {}) {
  assertTransition(fromState, toState);
  const entry = transitionHistoryEntry(fromState, toState, options);
  const timestampField = LIFECYCLE_TIMESTAMP_FIELDS[toState];
  const update = {
    $set: {
      lifecycleState: toState,
      status: legacyStatusForState(toState),
      lastTransitionAt: entry.at,
      [`lifecycleTimestamps.${timestampField}`]: entry.at,
      ...safeOutcomeSet(options.outcome),
    },
    $push: {
      stateHistory: { $each: [entry], $slice: -MAX_INVOCATION_STATE_HISTORY },
    },
  };

  if (isTerminalState(toState)) update.$set.terminalAt = entry.at;
  if (toState === 'succeeded') update.$set.retryState = 'completed';
  if (toState === 'recovery_required') {
    update.$set.retryState = 'recovery_required';
    update.$set.recoveryReasonCode = safeReasonCode(options.reasonCode, { required: true });
  }
  if (fromState === 'recovery_required' && toState !== 'recovery_required') {
    update.$unset = { recoveryReasonCode: 1 };
  }
  if (isTerminalState(toState) || toState === 'recovery_required') {
    update.$unset = {
      ...(update.$unset || {}),
      executionLeaseId: 1,
      executionLeaseExpiresAt: 1,
      executionOwner: 1,
    };
  }
  return update;
}

function initialLifecycleFields(options = {}) {
  const state = assertKnownState(options.state || 'accepted', 'state');
  const at = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const entry = transitionHistoryEntry(null, state, {
    ...options,
    now: at,
    reasonCode: options.reasonCode || 'INVOCATION_CREATED',
  });
  return {
    lifecycleState: state,
    status: legacyStatusForState(state),
    lifecycleTimestamps: { [LIFECYCLE_TIMESTAMP_FIELDS[state]]: at },
    stateHistory: [entry],
    lastTransitionAt: at,
    ...(isTerminalState(state) ? { terminalAt: at } : {}),
  };
}

async function leanStateQuery(filter) {
  const query = Invocation.findOne(filter).select(
    'lifecycleState receivingWorkspaceId executionLeaseExpiresAt',
  );
  return typeof query.lean === 'function' ? query.lean() : query;
}

function emitStateChange(observer, invocation, fromState, toState, entry) {
  observer?.emit?.('info', 'invocation.state.changed', {
    invocationId: String(invocation?._id || invocation?.id || ''),
    fromState,
    toState,
    reasonCode: entry.reasonCode,
    attemptNumber: entry.attemptNumber,
    status: 'completed',
  });
}

async function transitionInvocation(options) {
  const invocationId = safeOptionalIdentifier(options?.invocationId, 'invocationId', {
    required: true,
  });
  const receivingWorkspaceId = safeOptionalIdentifier(
    options?.receivingWorkspaceId,
    'receivingWorkspaceId',
    { required: true },
  );
  const fromState = options?.fromState;
  const toState = options?.toState;
  const update = transitionUpdate(fromState, toState, options);
  const invocation = await Invocation.findOneAndUpdate(
    { _id: invocationId, receivingWorkspaceId, lifecycleState: fromState },
    update,
    { new: true, runValidators: true },
  );

  if (!invocation) {
    const current = await leanStateQuery({ _id: invocationId, receivingWorkspaceId });
    if (!current) {
      throw lifecycleError(ErrorCodes.INVOCATION_NOT_FOUND, 'Invocation was not found.', {
        invocationId,
      });
    }
    throw lifecycleError(
      ErrorCodes.INVOCATION_STATE_TRANSITION_INVALID,
      'Invocation state changed before the requested transition could be applied.',
      { invocationId, fromState: current.lifecycleState, toState },
    );
  }

  const entry = update.$push.stateHistory.$each[0];
  emitStateChange(options?.observer, invocation, fromState, toState, entry);
  return invocation;
}

async function markExpiredInvocationLeaseRecovery(options) {
  const invocationId = safeOptionalIdentifier(options?.invocationId, 'invocationId', {
    required: true,
  });
  const receivingWorkspaceId = safeOptionalIdentifier(
    options?.receivingWorkspaceId,
    'receivingWorkspaceId',
    { required: true },
  );
  const now = options?.now instanceof Date ? options.now : new Date(options?.now || Date.now());
  const reasonCode = options?.reasonCode || 'EXECUTION_LEASE_EXPIRED';

  for (const fromState of ['running', 'waiting_for_runtime']) {
    const update = transitionUpdate(fromState, 'recovery_required', {
      ...options,
      now,
      reasonCode,
    });
    const invocation = await Invocation.findOneAndUpdate(
      {
        _id: invocationId,
        receivingWorkspaceId,
        lifecycleState: fromState,
        executionLeaseExpiresAt: { $lte: now },
      },
      update,
      { new: true, runValidators: true },
    );
    if (invocation) {
      const entry = update.$push.stateHistory.$each[0];
      emitStateChange(options?.observer, invocation, fromState, 'recovery_required', entry);
      options?.observer?.emit?.('warn', 'invocation.recovery_required', {
        invocationId,
        fromState,
        toState: 'recovery_required',
        reasonCode,
        status: 'recovery_required',
      });
      return invocation;
    }
  }
  return null;
}

async function markActiveInvocationRecovery(options) {
  const invocationId = safeOptionalIdentifier(options?.invocationId, 'invocationId', {
    required: true,
  });
  const receivingWorkspaceId = safeOptionalIdentifier(
    options?.receivingWorkspaceId,
    'receivingWorkspaceId',
    { required: true },
  );
  const reasonCode = options?.reasonCode || 'SHUTDOWN_DURING_EXTERNAL_INVOCATION';
  for (const fromState of ['running', 'waiting_for_runtime']) {
    const update = transitionUpdate(fromState, 'recovery_required', {
      ...options,
      reasonCode,
    });
    const invocation = await Invocation.findOneAndUpdate(
      { _id: invocationId, receivingWorkspaceId, lifecycleState: fromState },
      update,
      { new: true, runValidators: true },
    );
    if (invocation) {
      const entry = update.$push.stateHistory.$each[0];
      emitStateChange(options?.observer, invocation, fromState, 'recovery_required', entry);
      return invocation;
    }
  }
  return null;
}

async function claimInvocationExecution(options) {
  const invocationId = safeOptionalIdentifier(options?.invocationId, 'invocationId', {
    required: true,
  });
  const receivingWorkspaceId = safeOptionalIdentifier(
    options?.receivingWorkspaceId,
    'receivingWorkspaceId',
    { required: true },
  );
  const executionOwner = safeOptionalIdentifier(options?.executionOwner, 'executionOwner', {
    required: true,
  });
  const executionLeaseId = safeOptionalIdentifier(
    options?.executionLeaseId || crypto.randomUUID(),
    'executionLeaseId',
  );
  const now = options?.now instanceof Date ? options.now : new Date(options?.now || Date.now());
  const leaseDurationMs = Number(options?.leaseDurationMs || env.RUNTIME_EXECUTION_LEASE_MS);
  if (!Number.isInteger(leaseDurationMs) || leaseDurationMs < 1_000) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Invocation lifecycle validation failed.',
      [{ path: 'leaseDurationMs', message: 'leaseDurationMs must be at least 1000.' }],
    );
  }
  const executionLeaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
  const update = transitionUpdate('authorized', 'running', {
    ...options,
    now,
    reasonCode: options?.reasonCode || 'EXECUTION_CLAIMED',
  });
  Object.assign(update.$set, { executionLeaseId, executionLeaseExpiresAt, executionOwner });

  const invocation = await Invocation.findOneAndUpdate(
    {
      _id: invocationId,
      receivingWorkspaceId,
      lifecycleState: 'authorized',
      $or: [
        { executionLeaseId: { $exists: false } },
        { executionLeaseExpiresAt: { $exists: false } },
        { executionLeaseExpiresAt: { $lte: now } },
      ],
    },
    update,
    { new: true, runValidators: true },
  );
  if (invocation) {
    const entry = update.$push.stateHistory.$each[0];
    emitStateChange(options?.observer, invocation, 'authorized', 'running', entry);
    return { invocation, executionLeaseId, executionLeaseExpiresAt };
  }

  const recovered = await markExpiredInvocationLeaseRecovery({
    ...options,
    invocationId,
    receivingWorkspaceId,
    now,
    reasonCode: 'EXECUTION_LEASE_EXPIRED',
  });
  if (recovered) {
    throw lifecycleError(
      ErrorCodes.INVOCATION_RECOVERY_REQUIRED,
      'The previous execution lease expired with an ambiguous outcome.',
      { invocationId, lifecycleState: 'recovery_required' },
    );
  }

  const current = await leanStateQuery({ _id: invocationId, receivingWorkspaceId });
  if (!current) {
    throw lifecycleError(ErrorCodes.INVOCATION_NOT_FOUND, 'Invocation was not found.', {
      invocationId,
    });
  }
  options?.observer?.emit?.('warn', 'invocation.concurrent_claim_rejected', {
    invocationId,
    lifecycleState: current.lifecycleState,
    reasonCode: 'EXECUTION_ALREADY_CLAIMED',
    status: 'rejected',
  });
  throw lifecycleError(
    ErrorCodes.INVOCATION_CONCURRENT_CLAIM_REJECTED,
    'Invocation execution is already owned or is not claimable.',
    { invocationId, lifecycleState: current.lifecycleState },
  );
}

module.exports = {
  allowedTransitionsFrom,
  assertTransition,
  canTransition,
  claimInvocationExecution,
  initialLifecycleFields,
  isTerminalState,
  legacyStatusForState,
  markExpiredInvocationLeaseRecovery,
  markActiveInvocationRecovery,
  transitionHistoryEntry,
  transitionInvocation,
  transitionUpdate,
};
