const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Invocation = require('../models/Invocation');
const InvocationAttempt = require('../models/InvocationAttempt');
const PassportConnection = require('../models/PassportConnection');
const RuntimeCapacitySlot = require('../models/RuntimeCapacitySlot');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { decryptPayload } = require('../utils/crypto');
const { createAuditLog } = require('./auditService');
const { serviceLifecycle } = require('./serviceLifecycle.service');
const { requestWorkCancellation } = require('./durableWork.service');
const { transitionUpdate } = require('./invocationLifecycle.service');
const { classifyStuckInvocation } = require('../utils/stuckInvocation');
const { recoveryPolicyDecision } = require('../utils/recoveryPolicy');
const {
  controlContext,
  serializeOperationalInvocation,
} = require('../utils/invocationControlView');
const {
  INVOCATION_CANCEL_REASON_CODES,
  TERMINAL_INVOCATION_STATES,
} = require('../constants/invocationLifecycle');

const RESOLUTION_REASON_CODES = new Set([
  'OPERATOR_CONFIRMED_REMOTE_FAILURE',
  'OPERATOR_CONFIRMED_CANCELLED',
]);
const PRE_TRANSMISSION_STAGES = new Set([
  undefined,
  null,
  'accepted',
  'validation_started',
  'authorized',
  'execution_claimed',
  'request_mapped',
]);

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function requiredString(value, path) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path, message: `${path} is required.` },
    ]);
  }
  return value.trim();
}

function identityFrom(input) {
  return {
    receivingWorkspaceId: requiredString(input?.receivingWorkspaceId, 'receivingWorkspaceId'),
    receivingUserId: requiredString(input?.receivingUserId, 'receivingUserId'),
  };
}

function requiredVersion(input) {
  if (!Number.isInteger(input?.version) || input.version < 0) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path: 'version', message: 'version must be a non-negative integer.' },
    ]);
  }
  return input.version;
}

function assertPartner(partner) {
  if (!partner?._id) {
    throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Partner API key is required.');
  }
}

function notFound() {
  return new AppError(404, ErrorCodes.INVOCATION_NOT_FOUND, 'Invocation was not found.');
}

function safeCode(value, fallback) {
  const normalized = String(value || fallback || '')
    .trim()
    .toUpperCase();
  return /^[A-Z][A-Z0-9_]{0,127}$/.test(normalized) ? normalized : fallback;
}

function privateInvocationQuery(filter, options = {}) {
  let query = Invocation.findOne(filter).select(
    '+executionLeaseId +executionLeaseExpiresAt +executionOwner +idempotencyKeyHash +requestFingerprint +idempotencyScope +recoveryClaimId +executionPayload',
  );
  if (options.sort && typeof query?.sort === 'function') query = query.sort(options.sort);
  return query;
}

async function authorizedContext(invocationId, input, partner) {
  assertPartner(partner);
  const identity = identityFrom(input);
  if (!mongoose.isValidObjectId(invocationId)) throw notFound();
  const invocation = await privateInvocationQuery({
    _id: invocationId,
    receivingWorkspaceId: identity.receivingWorkspaceId,
  });
  if (!invocation) throw notFound();
  const connection = await PassportConnection.findOne({
    _id: invocation.connectionId,
    partnerId: partner._id,
    receivingWorkspaceId: identity.receivingWorkspaceId,
    receivingUserId: identity.receivingUserId,
  });
  if (!connection) throw notFound();
  return { identity, invocation, connection };
}

async function audit(action, context, actor, metadata = {}) {
  try {
    await createAuditLog(
      'partner',
      idOf(actor.partner),
      action,
      'Invocation',
      idOf(context.invocation),
      {
        receivingWorkspaceId: context.identity.receivingWorkspaceId,
        receivingUserId: context.identity.receivingUserId,
        invocationId: idOf(context.invocation),
        connectionId: idOf(context.connection),
        lifecycleState: context.invocation.lifecycleState,
        actorId: idOf(actor.partner),
        ...metadata,
      },
      {
        requestId: actor.requestId,
        traceId: actor.traceId,
        invocationId: idOf(context.invocation),
      },
    );
  } catch (error) {
    actor.observer?.emit?.('warn', 'persistence.audit.failed', {
      action,
      invocationId: idOf(context.invocation),
      errorCode: safeCode(error?.code, ErrorCodes.INTERNAL_SERVER_ERROR),
      status: 'failed',
    });
  }
}

function cancellationResponse(invocation, connection) {
  const view = serializeOperationalInvocation(invocation, connection);
  return {
    invocationId: view.invocationId,
    status: view.status,
    lifecycleState: view.lifecycleState,
    cancellationState: view.cancellationState,
    cancellationOutcome: view.cancellationOutcome,
    recoveryRequired: view.recoveryRequired,
    traceId: view.traceId,
    requestId: view.requestId,
  };
}

async function propagateDurableCancellation(context, invocation, reasonCode, actor = {}) {
  const workItemId = invocation?.currentWorkItemId;
  if (!workItemId) return { attempted: false, persisted: false };
  try {
    await requestWorkCancellation({
      partnerId: context.connection.partnerId,
      receivingWorkspaceId: context.identity.receivingWorkspaceId,
      connectionId: context.connection._id,
      invocationId: invocation._id,
      workItemId,
      reasonCode,
    });
    return { attempted: true, persisted: true };
  } catch (error) {
    // The Invocation transition above is already authoritative. Do not convert a durably
    // accepted cancellation into an API failure or skip the local AbortController merely
    // because the Work projection/outbox raced or is temporarily unavailable. Claim and
    // execution admission also re-check the Invocation before any safe replay.
    actor.observer?.emit?.('warn', 'invocation.cancel.durable_notification_deferred', {
      invocationId: idOf(invocation),
      errorCode: safeCode(error?.code, 'DURABLE_WORK_NOTIFICATION_FAILED'),
    });
    return { attempted: true, persisted: false };
  }
}

async function requestCancellation(invocationId, input, actor = {}) {
  const context = await authorizedContext(invocationId, input, actor.partner);
  const { invocation, connection, identity } = context;
  const reasonCode =
    input?.reasonCode === undefined ? 'USER_REQUESTED' : safeCode(input.reasonCode);
  if (reasonCode !== 'USER_REQUESTED') {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path: 'reasonCode', message: 'reasonCode is not an approved cancellation reason.' },
    ]);
  }
  if (TERMINAL_INVOCATION_STATES.includes(invocation.lifecycleState)) {
    if (invocation.lifecycleState === 'cancelled' && invocation.cancellationState === 'confirmed') {
      await propagateDurableCancellation(context, invocation, reasonCode, actor);
      return { ...cancellationResponse(invocation, connection), idempotent: true };
    }
    await audit('invocation.cancel.rejected', context, actor, {
      reasonCode: 'INVOCATION_ALREADY_TERMINAL',
    });
    throw new AppError(
      409,
      ErrorCodes.INVOCATION_CANCELLATION_REJECTED,
      'Terminal invocation cancellation was rejected.',
      [],
      {
        invocationId: idOf(invocation),
        cancellationState: 'rejected',
        lifecycleState: invocation.lifecycleState,
        reasonCode: 'INVOCATION_ALREADY_TERMINAL',
      },
    );
  }
  if (['confirmed', 'outcome_unknown'].includes(invocation.cancellationState)) {
    await propagateDurableCancellation(context, invocation, reasonCode, actor);
    return { ...cancellationResponse(invocation, connection), idempotent: true };
  }
  if (
    invocation.lifecycleState === 'recovery_required' &&
    invocation.recoveryState === 'retrying'
  ) {
    await audit('invocation.cancel.rejected', context, actor, {
      reasonCode: 'RECOVERY_RETRY_IN_PROGRESS',
    });
    throw new AppError(
      409,
      ErrorCodes.INVOCATION_CANCELLATION_REJECTED,
      'The active recovery child must be reviewed or cancelled directly.',
      [],
      {
        invocationId: idOf(invocation),
        cancellationState: 'rejected',
        lifecycleState: invocation.lifecycleState,
        reasonCode: 'RECOVERY_RETRY_IN_PROGRESS',
      },
    );
  }

  const now = new Date();
  const requestFields = {
    cancellationState: 'requested',
    cancelRequestedAt: now,
    cancelRequestedBy: `partner:${idOf(actor.partner)}`,
    cancelReasonCode: reasonCode,
    cancellationRequestId: actor.requestId,
    cancellationTraceId: actor.traceId,
  };
  await audit('invocation.cancel.requested', context, actor, { reasonCode });

  const cancellationOwnership = {
    workspaceId: identity.receivingWorkspaceId,
    connectionId: idOf(connection),
    executionLeaseId: invocation.executionLeaseId,
    executionOwner: invocation.executionOwner,
    reasonCode,
    requestId: actor.requestId,
    traceId: actor.traceId,
  };

  if (invocation.lifecycleState === 'recovery_required') {
    if (invocation.recoveryState === 'resolved') {
      await audit('invocation.cancel.rejected', context, actor, {
        reasonCode: 'RECOVERY_ALREADY_RESOLVED',
      });
      throw new AppError(
        409,
        ErrorCodes.INVOCATION_CANCELLATION_REJECTED,
        'Resolved recovery history cannot be rewritten by cancellation.',
        [],
        {
          invocationId: idOf(invocation),
          cancellationState: 'rejected',
          lifecycleState: invocation.lifecycleState,
          reasonCode: 'RECOVERY_ALREADY_RESOLVED',
        },
      );
    }
    const updated = await Invocation.findOneAndUpdate(
      {
        _id: invocation._id,
        receivingWorkspaceId: identity.receivingWorkspaceId,
        lifecycleState: 'recovery_required',
        cancellationState: { $nin: ['confirmed', 'outcome_unknown'] },
        recoveryState: { $in: ['required', 'not_required'] },
      },
      {
        $set: {
          ...requestFields,
          cancellationState: 'outcome_unknown',
          cancellationOutcome: 'remote_unconfirmed',
          recoveryState: 'required',
          recoveryEligible: true,
          recoveryDecision: 'retry_denied',
          recoveryDecisionReason: 'REMOTE_OUTCOME_UNKNOWN',
        },
        $inc: { __v: 1 },
      },
      { new: true, runValidators: true },
    );
    const current = updated || (await privateInvocationQuery({ _id: invocation._id }));
    if (!updated && current.recoveryState === 'retrying') {
      await audit('invocation.cancel.rejected', { ...context, invocation: current }, actor, {
        reasonCode: 'RECOVERY_RETRY_IN_PROGRESS',
      });
      throw new AppError(
        409,
        ErrorCodes.INVOCATION_CANCELLATION_REJECTED,
        'The active recovery child must be reviewed or cancelled directly.',
        [],
        {
          invocationId: idOf(invocation),
          cancellationState: 'rejected',
          lifecycleState: current.lifecycleState,
          reasonCode: 'RECOVERY_RETRY_IN_PROGRESS',
        },
      );
    }
    if (
      !updated &&
      (TERMINAL_INVOCATION_STATES.includes(current.lifecycleState) ||
        current.recoveryState === 'resolved')
    ) {
      const rejectionReason =
        current.recoveryState === 'resolved'
          ? 'RECOVERY_ALREADY_RESOLVED'
          : 'INVOCATION_ALREADY_TERMINAL';
      await audit('invocation.cancel.rejected', { ...context, invocation: current }, actor, {
        reasonCode: rejectionReason,
      });
      throw new AppError(
        409,
        ErrorCodes.INVOCATION_CANCELLATION_REJECTED,
        'Invocation recovery completed before cancellation could be recorded.',
        [],
        {
          invocationId: idOf(invocation),
          cancellationState: 'rejected',
          lifecycleState: current.lifecycleState,
          reasonCode: rejectionReason,
        },
      );
    }
    if (
      !updated &&
      actor.cancellationRaceRetry !== true &&
      ['accepted', 'validating', 'authorized', 'running', 'waiting_for_runtime'].includes(
        current.lifecycleState,
      )
    ) {
      return requestCancellation(invocationId, input, {
        ...actor,
        cancellationRaceRetry: true,
      });
    }
    await audit('invocation.cancel.outcome_unknown', { ...context, invocation: current }, actor, {
      reasonCode: 'REMOTE_OUTCOME_UNKNOWN',
    });
    return { ...cancellationResponse(current, connection), idempotent: !updated };
  }

  const transmitted =
    invocation.lifecycleState === 'waiting_for_runtime' ||
    !PRE_TRANSMISSION_STAGES.has(invocation.lastProgressStage);
  if (transmitted) {
    const update = transitionUpdate(invocation.lifecycleState, 'recovery_required', {
      reasonCode: 'REMOTE_OUTCOME_UNKNOWN',
      traceId: actor.traceId,
      requestId: actor.requestId,
      now,
    });
    Object.assign(update.$set, requestFields, {
      cancellationState: 'outcome_unknown',
      cancellationOutcome: 'remote_unconfirmed',
      recoveryState: 'required',
      recoveryEligible: true,
      recoveryDecision: 'retry_denied',
      recoveryDecisionReason: 'REMOTE_OUTCOME_UNKNOWN',
      stuckClassification: 'outcome_ambiguous',
    });
    update.$inc = { __v: 1 };
    const updated = await Invocation.findOneAndUpdate(
      {
        _id: invocation._id,
        receivingWorkspaceId: identity.receivingWorkspaceId,
        lifecycleState: invocation.lifecycleState,
      },
      update,
      { new: true, runValidators: true },
    );
    const current = updated || (await privateInvocationQuery({ _id: invocation._id }));
    if (
      !updated &&
      (TERMINAL_INVOCATION_STATES.includes(current.lifecycleState) ||
        current.recoveryState === 'resolved')
    ) {
      await audit('invocation.cancel.rejected', { ...context, invocation: current }, actor, {
        reasonCode: 'INVOCATION_ALREADY_TERMINAL',
      });
      throw new AppError(
        409,
        ErrorCodes.INVOCATION_CANCELLATION_REJECTED,
        'Invocation completed before cancellation could be applied.',
        [],
        {
          invocationId: idOf(invocation),
          cancellationState: 'rejected',
          lifecycleState: current.lifecycleState,
          reasonCode: 'INVOCATION_ALREADY_TERMINAL',
        },
      );
    }
    if (
      !updated &&
      actor.cancellationRaceRetry !== true &&
      ['accepted', 'validating', 'authorized', 'running', 'waiting_for_runtime'].includes(
        current.lifecycleState,
      )
    ) {
      return requestCancellation(invocationId, input, {
        ...actor,
        cancellationRaceRetry: true,
      });
    }
    const registryResult = serviceLifecycle.requestCancellation?.(
      idOf(invocation),
      cancellationOwnership,
    ) || { found: false, requested: false };
    if (updated) {
      await propagateDurableCancellation(context, current, reasonCode, actor);
    }
    if (registryResult.requested === true) {
      await audit('invocation.cancel.aborting', { ...context, invocation: current }, actor, {
        reasonCode,
      });
    }
    await audit('invocation.cancel.outcome_unknown', { ...context, invocation: current }, actor, {
      reasonCode: 'REMOTE_OUTCOME_UNKNOWN',
      fromState: invocation.lifecycleState,
      toState: current.lifecycleState,
    });
    if (updated) {
      await audit('invocation.recovery.eligible', { ...context, invocation: current }, actor, {
        reasonCode: 'REMOTE_OUTCOME_UNKNOWN',
      });
    }
    return {
      ...cancellationResponse(current, connection),
      idempotent: !updated,
      localAbortRequested: registryResult.requested === true,
    };
  }

  const update = transitionUpdate(invocation.lifecycleState, 'cancelled', {
    reasonCode,
    traceId: actor.traceId,
    requestId: actor.requestId,
    now,
  });
  Object.assign(update.$set, requestFields, {
    cancellationState: 'confirmed',
    cancellationOutcome: 'local_confirmed',
    cancellationConfirmedAt: now,
    recoveryState: 'not_required',
    recoveryEligible: false,
    recoveryDecision: 'not_evaluated',
  });
  update.$inc = { __v: 1 };
  const updated = await Invocation.findOneAndUpdate(
    {
      _id: invocation._id,
      receivingWorkspaceId: identity.receivingWorkspaceId,
      lifecycleState: invocation.lifecycleState,
    },
    update,
    { new: true, runValidators: true },
  );
  const current = updated || (await privateInvocationQuery({ _id: invocation._id }));
  if (!updated && TERMINAL_INVOCATION_STATES.includes(current.lifecycleState)) {
    if (current.lifecycleState === 'cancelled') {
      return { ...cancellationResponse(current, connection), idempotent: true };
    }
    await audit('invocation.cancel.rejected', { ...context, invocation: current }, actor, {
      reasonCode: 'INVOCATION_ALREADY_TERMINAL',
    });
    throw new AppError(
      409,
      ErrorCodes.INVOCATION_CANCELLATION_REJECTED,
      'Invocation completed before cancellation could be applied.',
      [],
      {
        invocationId: idOf(invocation),
        cancellationState: 'rejected',
        lifecycleState: current.lifecycleState,
        reasonCode: 'INVOCATION_ALREADY_TERMINAL',
      },
    );
  }
  if (current.lifecycleState !== 'cancelled' && current.lifecycleState !== 'recovery_required') {
    if (
      actor.cancellationRaceRetry !== true &&
      ['accepted', 'validating', 'authorized', 'running', 'waiting_for_runtime'].includes(
        current.lifecycleState,
      )
    ) {
      return requestCancellation(invocationId, input, {
        ...actor,
        cancellationRaceRetry: true,
      });
    }
    throw new AppError(
      409,
      ErrorCodes.INVOCATION_RECOVERY_CONFLICT,
      'Invocation state changed before cancellation could be applied.',
      [],
      { invocationId: idOf(invocation), lifecycleState: current.lifecycleState },
    );
  }
  const registryResult = serviceLifecycle.requestCancellation?.(
    idOf(invocation),
    cancellationOwnership,
  ) || { found: false, requested: false };
  if (updated) {
    await propagateDurableCancellation(context, current, reasonCode, actor);
  }
  if (registryResult.requested === true) {
    await audit('invocation.cancel.aborting', { ...context, invocation: current }, actor, {
      reasonCode,
    });
  }
  await audit('invocation.cancel.confirmed', { ...context, invocation: current }, actor, {
    reasonCode,
    fromState: invocation.lifecycleState,
    toState: current.lifecycleState,
  });
  return {
    ...cancellationResponse(current, connection),
    idempotent: !updated,
    localAbortRequested: registryResult.requested === true,
  };
}

function scanClassificationOutcome(classification, lifecycleState) {
  if (classification === 'stale_before_runtime') {
    return {
      targetState: lifecycleState === 'accepted' ? 'cancelled' : 'failed',
      reasonCode: 'STALE_BEFORE_REMOTE_TRANSMISSION',
    };
  }
  const reasons = {
    external_runtime_overdue: 'RUNTIME_DEADLINE_EXCEEDED',
    lease_expired: 'EXECUTION_LEASE_EXPIRED',
    finalization_stalled: 'FINALIZATION_STALLED',
    shutdown_interrupted: 'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
    outcome_ambiguous: 'REMOTE_OUTCOME_UNKNOWN',
  };
  return { targetState: 'recovery_required', reasonCode: reasons[classification] };
}

async function connectionIdsForOperator(identity, partner) {
  assertPartner(partner);
  return PassportConnection.find({
    partnerId: partner._id,
    receivingWorkspaceId: identity.receivingWorkspaceId,
  })
    .select('_id receivingWorkspaceId receivingUserId runtimeControl status healthStatus')
    .lean();
}

function scanAuditContext(identity, invocation, connections) {
  const connection = connections.find((item) => idOf(item) === idOf(invocation.connectionId)) || {
    _id: invocation.connectionId,
  };
  return {
    identity: {
      receivingWorkspaceId: connection.receivingWorkspaceId || identity.receivingWorkspaceId,
      receivingUserId: connection.receivingUserId || identity.receivingUserId,
    },
    invocation,
    connection,
  };
}

async function scanStuckInvocations(input, actor = {}) {
  const identity = identityFrom(input);
  const connections = await connectionIdsForOperator(identity, actor.partner);
  const connectionIds = connections.map((item) => item._id);
  if (!connectionIds.length) {
    return {
      scanned: 0,
      detected: 0,
      recoveryRequired: 0,
      failed: 0,
      cancelled: 0,
      recoveryClaimsReleased: 0,
      recoveryClaimsResolved: 0,
    };
  }
  const requestedLimit =
    input?.limit == null ? env.INVOCATION_STUCK_SCAN_LIMIT : Number(input.limit);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path: 'limit', message: 'limit must be a positive integer.' },
    ]);
  }
  const limit = Math.min(requestedLimit, env.INVOCATION_STUCK_SCAN_LIMIT, 100);
  const now = actor.now instanceof Date ? actor.now : new Date();
  const staleCutoff = new Date(now.getTime() - env.INVOCATION_STUCK_GRACE_MS);
  const runtimeDeadlineCutoff = new Date(now.getTime() - env.INVOCATION_STUCK_GRACE_MS);
  const finalizationCutoff = new Date(now.getTime() - env.INVOCATION_FINALIZATION_GRACE_MS);
  const candidates = await Invocation.find({
    receivingWorkspaceId: identity.receivingWorkspaceId,
    connectionId: { $in: connectionIds },
    lifecycleState: {
      $in: ['accepted', 'validating', 'authorized', 'running', 'waiting_for_runtime'],
    },
    $or: [
      { executionLeaseExpiresAt: { $lte: now } },
      { lifecycleState: 'waiting_for_runtime', runtimeDeadlineAt: { $lte: runtimeDeadlineCutoff } },
      {
        lifecycleState: 'waiting_for_runtime',
        lastProgressStage: {
          $in: ['remote_response_received', 'response_validation_started', 'finalization_started'],
        },
        lastProgressAt: { $lte: finalizationCutoff },
      },
      {
        lifecycleState: { $in: ['accepted', 'validating', 'authorized', 'running'] },
        lastProgressAt: { $lte: staleCutoff },
      },
      {
        lifecycleState: { $in: ['accepted', 'validating', 'authorized', 'running'] },
        lastProgressAt: { $exists: false },
        updatedAt: { $lte: staleCutoff },
      },
    ],
  })
    .select('+executionLeaseId +executionLeaseExpiresAt +executionOwner')
    .sort({ lastProgressAt: 1, updatedAt: 1 })
    .limit(limit);
  const result = {
    scanned: candidates.length,
    detected: 0,
    recoveryRequired: 0,
    failed: 0,
    cancelled: 0,
    recoveryClaimsReleased: 0,
    recoveryClaimsResolved: 0,
  };
  for (const candidate of candidates) {
    const stuck = classifyStuckInvocation(candidate, {
      now: actor.now,
      stuckGraceMs: env.INVOCATION_STUCK_GRACE_MS,
      finalizationGraceMs: env.INVOCATION_FINALIZATION_GRACE_MS,
    });
    if (stuck.classification === 'not_stuck') continue;
    const outcome = scanClassificationOutcome(stuck.classification, candidate.lifecycleState);
    if (!outcome.reasonCode) continue;
    const update = transitionUpdate(candidate.lifecycleState, outcome.targetState, {
      reasonCode: outcome.reasonCode,
      traceId: actor.traceId,
      requestId: actor.requestId,
      now,
      outcome:
        outcome.targetState === 'failed'
          ? {
              error: {
                code: 'INVOCATION_STUCK',
                stage: 'invocation_persistence',
                retryable: false,
              },
              retryState: 'not_allowed',
              retryDecisionReason: 'NO_REMOTE_TRANSMISSION',
            }
          : undefined,
    });
    Object.assign(update.$set, {
      stuckDetectedAt: now,
      stuckClassification: stuck.classification,
      ...(outcome.targetState === 'recovery_required'
        ? {
            recoveryState: 'required',
            recoveryEligible: true,
            recoveryDecision: 'operator_review_required',
            recoveryDecisionReason: 'REQUIRES_OPERATOR_REVIEW',
          }
        : { recoveryEligible: false }),
      ...(outcome.targetState === 'cancelled'
        ? {
            cancellationState: 'confirmed',
            cancellationOutcome: 'local_confirmed',
            cancellationConfirmedAt: now,
            cancelRequestedAt: now,
            cancelRequestedBy: 'system:stuck-scan',
            cancelReasonCode: 'STUCK_INVOCATION',
          }
        : {}),
    });
    update.$inc = { __v: 1 };
    const racePredicate = {
      ...(Number.isInteger(candidate.__v) ? { __v: candidate.__v } : {}),
      ...(candidate.lastProgressAt
        ? { lastProgressAt: candidate.lastProgressAt }
        : { lastProgressAt: { $exists: false }, updatedAt: candidate.updatedAt }),
    };
    const updated = await Invocation.findOneAndUpdate(
      {
        _id: candidate._id,
        receivingWorkspaceId: identity.receivingWorkspaceId,
        lifecycleState: candidate.lifecycleState,
        ...racePredicate,
      },
      update,
      { new: true, runValidators: true },
    );
    if (!updated) continue;
    result.detected += 1;
    result[
      outcome.targetState === 'recovery_required' ? 'recoveryRequired' : outcome.targetState
    ] += 1;
    await InvocationAttempt.findOneAndUpdate(
      { invocationId: candidate._id, status: 'started' },
      {
        $set: {
          status:
            outcome.targetState === 'recovery_required' ? 'recovery_required' : outcome.targetState,
          completedAt: now,
          errorCode: 'INVOCATION_STUCK',
          safeStage: 'invocation_persistence',
          retryable: false,
          outcomeAmbiguous: outcome.targetState === 'recovery_required',
          retryDecision: 'denied',
          retryDecisionReason:
            outcome.targetState === 'recovery_required'
              ? 'AMBIGUOUS_OUTCOME_REQUIRES_RECOVERY'
              : 'NO_REMOTE_TRANSMISSION',
        },
      },
      { sort: { attemptNumber: -1 }, runValidators: true },
    );
    if (candidate.executionLeaseId) {
      await RuntimeCapacitySlot.deleteMany({
        workspaceId: identity.receivingWorkspaceId,
        invocationId: candidate._id,
        leaseId: candidate.executionLeaseId,
        leaseExpiresAt: { $lte: now },
      });
    }
    const context = scanAuditContext(identity, updated, connections);
    await audit('invocation.stuck.detected', context, actor, {
      reasonCode: outcome.reasonCode,
      stuckClassification: stuck.classification,
      fromState: candidate.lifecycleState,
      toState: outcome.targetState,
    });
    if (['failed', 'cancelled'].includes(outcome.targetState)) {
      await audit('invocation.stuck.resolved', context, actor, {
        reasonCode: outcome.reasonCode,
        stuckClassification: stuck.classification,
        fromState: candidate.lifecycleState,
        toState: outcome.targetState,
      });
    }
    if (outcome.targetState === 'cancelled') {
      await audit('invocation.cancel.requested', context, actor, {
        reasonCode: 'STUCK_INVOCATION',
      });
      await audit('invocation.cancel.confirmed', context, actor, {
        reasonCode: 'STUCK_INVOCATION',
        fromState: candidate.lifecycleState,
        toState: 'cancelled',
      });
    }
    if (outcome.targetState === 'recovery_required') {
      await audit('invocation.recovery.eligible', context, actor, {
        reasonCode: outcome.reasonCode,
      });
    }
  }
  const remaining = Math.max(0, limit - candidates.length);
  if (remaining > 0) {
    const expiredRecoveryClaims = await Invocation.find({
      receivingWorkspaceId: identity.receivingWorkspaceId,
      connectionId: { $in: connectionIds },
      lifecycleState: 'recovery_required',
      recoveryState: 'retrying',
      recoveryClaimExpiresAt: { $lte: now },
    })
      .select('+recoveryClaimId +requestFingerprint +idempotencyKeyHash')
      .sort({ recoveryClaimExpiresAt: 1 })
      .limit(remaining);
    result.scanned += expiredRecoveryClaims.length;
    for (const parent of expiredRecoveryClaims) {
      const child = parent.recoveryChildInvocationId
        ? await privateInvocationQuery({
            _id: parent.recoveryChildInvocationId,
            receivingWorkspaceId: identity.receivingWorkspaceId,
            connectionId: parent.connectionId,
            recoveryParentInvocationId: parent._id,
          })
        : await privateInvocationQuery(
            {
              receivingWorkspaceId: identity.receivingWorkspaceId,
              connectionId: parent.connectionId,
              recoveryParentInvocationId: parent._id,
            },
            { sort: { createdAt: -1 } },
          );
      const childIsActive =
        child &&
        !TERMINAL_INVOCATION_STATES.includes(child.lifecycleState) &&
        child.lifecycleState !== 'recovery_required';
      if (childIsActive) {
        // The expired parent claim must not be released while its linked child can still
        // produce a result. Keeping recoveryState=retrying prevents a second retry or a
        // contradictory manual resolution; a later bounded scan reconciles terminal state.
        continue;
      }
      if (child?.lifecycleState === 'succeeded') {
        const resolved = await Invocation.findOneAndUpdate(
          {
            _id: parent._id,
            receivingWorkspaceId: identity.receivingWorkspaceId,
            lifecycleState: 'recovery_required',
            recoveryState: 'retrying',
            recoveryClaimId: parent.recoveryClaimId,
            recoveryClaimExpiresAt: parent.recoveryClaimExpiresAt,
            ...(parent.recoveryChildInvocationId
              ? { recoveryChildInvocationId: child._id }
              : {
                  $or: [
                    { recoveryChildInvocationId: { $exists: false } },
                    { recoveryChildInvocationId: null },
                  ],
                }),
            ...(Number.isInteger(parent.__v) ? { __v: parent.__v } : {}),
          },
          {
            $set: {
              recoveryState: 'resolved',
              recoveryEligible: false,
              recoveryDecision: 'retry_allowed',
              recoveryDecisionReason: 'SAFE_RETRY_CHILD_SUCCEEDED',
              recoveryCompletedAt: now,
              recoveryChildInvocationId: child._id,
            },
            $unset: { recoveryClaimId: 1, recoveryClaimExpiresAt: 1 },
            $inc: { __v: 1 },
          },
          { new: true, runValidators: true },
        );
        if (!resolved) continue;
        result.detected += 1;
        result.recoveryClaimsResolved += 1;
        const recoveryContext = scanAuditContext(identity, resolved, connections);
        await audit('invocation.recovery.resolved', recoveryContext, actor, {
          reasonCode: 'SAFE_RETRY_CHILD_SUCCEEDED',
          stuckClassification: resolved.stuckClassification || 'not_stuck',
        });
        continue;
      }
      if (!child) {
        const connection = connections.find((item) => idOf(item) === idOf(parent.connectionId)) || {
          _id: parent.connectionId,
        };
        const parentValue =
          typeof parent.toObject === 'function' ? parent.toObject() : { ...parent };
        const restoredDecision = recoveryPolicyDecision(
          controlContext({ ...parentValue, recoveryState: 'required' }, connection),
        );
        const released = await Invocation.findOneAndUpdate(
          {
            _id: parent._id,
            receivingWorkspaceId: identity.receivingWorkspaceId,
            lifecycleState: 'recovery_required',
            recoveryState: 'retrying',
            recoveryClaimId: parent.recoveryClaimId,
            recoveryClaimExpiresAt: parent.recoveryClaimExpiresAt,
            $or: [
              { recoveryChildInvocationId: { $exists: false } },
              { recoveryChildInvocationId: null },
            ],
            ...(Number.isInteger(parent.__v) ? { __v: parent.__v } : {}),
          },
          {
            $set: {
              recoveryState: 'required',
              recoveryEligible: true,
              recoveryDecision: restoredDecision.action,
              recoveryDecisionReason: restoredDecision.reason,
            },
            $unset: { recoveryClaimId: 1, recoveryClaimExpiresAt: 1 },
            $inc: { __v: 1 },
          },
          { new: true, runValidators: true },
        );
        if (!released) continue;
        result.detected += 1;
        result.recoveryClaimsReleased += 1;
        const recoveryContext = scanAuditContext(identity, released, connections);
        await audit('invocation.recovery.eligible', recoveryContext, actor, {
          reasonCode: 'RECOVERY_CLAIM_EXPIRED_BEFORE_CHILD',
        });
        continue;
      }
      const childControl = controlContext(child);
      if (
        child.lifecycleState !== 'recovery_required' &&
        childControl.transmissionEvidence === 'not_transmitted'
      ) {
        const childReason = safeCode(child.error?.code, 'RECOVERY_CHILD_TERMINATED');
        const released = await Invocation.findOneAndUpdate(
          {
            _id: parent._id,
            receivingWorkspaceId: identity.receivingWorkspaceId,
            lifecycleState: 'recovery_required',
            recoveryState: 'retrying',
            recoveryClaimId: parent.recoveryClaimId,
            recoveryClaimExpiresAt: parent.recoveryClaimExpiresAt,
            ...(parent.recoveryChildInvocationId
              ? { recoveryChildInvocationId: child._id }
              : {
                  $or: [
                    { recoveryChildInvocationId: { $exists: false } },
                    { recoveryChildInvocationId: null },
                  ],
                }),
            ...(Number.isInteger(parent.__v) ? { __v: parent.__v } : {}),
          },
          {
            $set: {
              recoveryState: 'required',
              recoveryEligible: true,
              recoveryDecision: 'retry_denied',
              recoveryDecisionReason: childReason,
              recoveryChildInvocationId: child._id,
            },
            $unset: { recoveryClaimId: 1, recoveryClaimExpiresAt: 1 },
            $inc: { __v: 1 },
          },
          { new: true, runValidators: true },
        );
        if (!released) continue;
        result.detected += 1;
        result.recoveryClaimsReleased += 1;
        const recoveryContext = scanAuditContext(identity, released, connections);
        await audit('invocation.recovery.retry_denied', recoveryContext, actor, {
          reasonCode: childReason,
        });
        continue;
      }
      const interruptedReason =
        child.lifecycleState === 'recovery_required' ||
        childControl.transmissionEvidence === 'transmitted'
          ? 'CHILD_REMOTE_OUTCOME_UNKNOWN'
          : 'RECOVERY_CHILD_TERMINATED';
      const released = await Invocation.findOneAndUpdate(
        {
          _id: parent._id,
          receivingWorkspaceId: identity.receivingWorkspaceId,
          lifecycleState: 'recovery_required',
          recoveryState: 'retrying',
          recoveryClaimId: parent.recoveryClaimId,
          recoveryClaimExpiresAt: parent.recoveryClaimExpiresAt,
          ...(parent.recoveryChildInvocationId
            ? { recoveryChildInvocationId: child._id }
            : {
                $or: [
                  { recoveryChildInvocationId: { $exists: false } },
                  { recoveryChildInvocationId: null },
                ],
              }),
          ...(Number.isInteger(parent.__v) ? { __v: parent.__v } : {}),
        },
        {
          $set: {
            recoveryState: 'required',
            recoveryEligible: true,
            recoveryDecision: 'operator_review_required',
            recoveryDecisionReason: interruptedReason,
            recoveryReasonCode: interruptedReason,
            recoveryChildInvocationId: child._id,
            stuckDetectedAt: now,
            stuckClassification: 'outcome_ambiguous',
          },
          $unset: { recoveryClaimId: 1, recoveryClaimExpiresAt: 1 },
          $inc: { __v: 1 },
        },
        { new: true, runValidators: true },
      );
      if (!released) continue;
      result.detected += 1;
      result.recoveryClaimsReleased += 1;
      const recoveryContext = scanAuditContext(identity, released, connections);
      await audit('invocation.stuck.detected', recoveryContext, actor, {
        reasonCode: interruptedReason,
        stuckClassification: 'outcome_ambiguous',
      });
      await audit('invocation.recovery.eligible', recoveryContext, actor, {
        reasonCode: interruptedReason,
      });
    }
  }
  return { ...result, limit };
}

function pagination(input = {}) {
  const page = Number(input.page || 1);
  const limit = Number(input.limit || 25);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path: 'pagination', message: 'page and limit must be bounded positive integers.' },
    ]);
  }
  return { page, limit, skip: (page - 1) * limit };
}

async function listRecoveryQueue(input, actor = {}) {
  const identity = identityFrom(input);
  const connections = await connectionIdsForOperator(identity, actor.partner);
  const byId = new Map(connections.map((item) => [idOf(item), item]));
  const connectionIds = connections.map((item) => item._id);
  const paging = pagination(input);
  if (!connectionIds.length) {
    return { items: [], pagination: { page: paging.page, limit: paging.limit, total: 0 } };
  }
  const filter = {
    receivingWorkspaceId: identity.receivingWorkspaceId,
    connectionId: { $in: connectionIds },
    lifecycleState: 'recovery_required',
    recoveryState: { $ne: 'resolved' },
  };
  const [items, total] = await Promise.all([
    Invocation.find(filter)
      .select('+requestFingerprint +idempotencyKeyHash')
      .sort({ updatedAt: -1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .lean(),
    Invocation.countDocuments(filter),
  ]);
  return {
    items: items.map((item) =>
      serializeOperationalInvocation(item, byId.get(idOf(item.connectionId))),
    ),
    pagination: { page: paging.page, limit: paging.limit, total },
  };
}

async function manualRetry(invocationId, input, actor = {}) {
  const version = requiredVersion(input);
  const context = await authorizedContext(invocationId, input, actor.partner);
  const decision = recoveryPolicyDecision(controlContext(context.invocation, context.connection));
  await audit('invocation.recovery.retry_requested', context, actor, {
    reasonCode: decision.reason,
  });
  if (
    decision.action !== 'retry_allowed' &&
    (context.invocation.lifecycleState !== 'recovery_required' ||
      context.invocation.recoveryState === 'resolved')
  ) {
    await audit('invocation.recovery.retry_denied', context, actor, {
      reasonCode: decision.reason,
    });
    throw new AppError(
      409,
      ErrorCodes.INVOCATION_RECOVERY_ACTION_DENIED,
      'Manual retry is not proven safe.',
      [],
      {
        invocationId: idOf(context.invocation),
        recoveryDecision: 'retry_denied',
        reasonCode: decision.reason,
      },
    );
  }
  if (decision.action !== 'retry_allowed') {
    const denied = await Invocation.findOneAndUpdate(
      {
        _id: context.invocation._id,
        receivingWorkspaceId: context.identity.receivingWorkspaceId,
        lifecycleState: 'recovery_required',
        recoveryState: { $nin: ['retrying', 'resolved'] },
        __v: version,
      },
      {
        $set: {
          recoveryDecision: 'retry_denied',
          recoveryDecisionReason: decision.reason,
          recoveryRequestedAt: new Date(),
          recoveryRequestedBy: `partner:${idOf(actor.partner)}`,
        },
        $inc: { __v: 1 },
      },
      { new: true, runValidators: true },
    );
    if (!denied) {
      throw new AppError(
        409,
        ErrorCodes.INVOCATION_RECOVERY_CONFLICT,
        'Invocation changed before the retry decision could be recorded.',
        [],
        { invocationId: idOf(context.invocation), reasonCode: 'RECOVERY_VERSION_CONFLICT' },
      );
    }
    await audit('invocation.recovery.retry_denied', { ...context, invocation: denied }, actor, {
      reasonCode: decision.reason,
    });
    throw new AppError(
      409,
      ErrorCodes.INVOCATION_RECOVERY_ACTION_DENIED,
      'Manual retry is not proven safe.',
      [],
      {
        invocationId: idOf(context.invocation),
        recoveryDecision: 'retry_denied',
        reasonCode: decision.reason,
      },
    );
  }
  const now = new Date();
  const recoveryActorId = `partner:${idOf(actor.partner)}`;
  const recoveryClaimId = crypto.randomUUID();
  const claimed = await Invocation.findOneAndUpdate(
    {
      _id: context.invocation._id,
      receivingWorkspaceId: context.identity.receivingWorkspaceId,
      lifecycleState: 'recovery_required',
      $or: [
        { recoveryState: { $in: ['required', 'not_required'] } },
        { recoveryState: { $exists: false } },
      ],
      __v: version,
    },
    {
      $set: {
        recoveryState: 'retrying',
        recoveryEligible: false,
        recoveryDecision: 'retry_allowed',
        recoveryDecisionReason: decision.reason,
        recoveryRequestedAt: now,
        recoveryRequestedBy: recoveryActorId,
        recoveryClaimId,
        recoveryClaimExpiresAt: new Date(
          now.getTime() + env.RUNTIME_EXECUTION_LEASE_MS * 2 + env.INVOCATION_STUCK_GRACE_MS,
        ),
      },
      $unset: { recoveryChildInvocationId: 1 },
      $inc: { __v: 1, recoveryRetrySequence: 1 },
    },
    { new: true, runValidators: true, select: '+recoveryClaimId' },
  );
  if (!claimed) {
    throw new AppError(
      409,
      ErrorCodes.INVOCATION_RECOVERY_CONFLICT,
      'Another recovery action already claimed this invocation.',
      [],
      { invocationId: idOf(context.invocation), reasonCode: 'RECOVERY_ALREADY_CLAIMED' },
    );
  }
  await audit('invocation.recovery.retry_allowed', { ...context, invocation: claimed }, actor, {
    reasonCode: decision.reason,
  });

  let linkedChildInvocationId;
  try {
    const { invoke } = require('./runtimeGateway.service');
    const retrySequence = Number(
      claimed.recoveryRetrySequence || Number(context.invocation.recoveryRetrySequence || 0) + 1,
    );
    let replayInput;
    // The recovery claim update intentionally selects only its private claim token. Reuse the
    // tenant-authorized source document for the protected payload so select:false never causes a
    // durable invocation to fall back to its redacted display summary.
    const protectedExecutionPayload =
      claimed.executionPayload || context.invocation.executionPayload;
    if (protectedExecutionPayload) {
      try {
        replayInput = decryptPayload(protectedExecutionPayload)?.input;
      } catch (error) {
        throw new AppError(
          409,
          ErrorCodes.INVOCATION_RECOVERY_ACTION_DENIED,
          'The protected replay input is unavailable.',
          [],
          {
            cause: error,
            invocationId: idOf(claimed),
            reasonCode: 'REPLAY_INPUT_NOT_AVAILABLE',
          },
        );
      }
    } else {
      // Backward-compatible only for legacy records whose existing fingerprint checks already
      // proved that the redacted summary is byte-for-byte replayable.
      replayInput = context.invocation.inputSummary;
    }
    const child = await invoke(claimed.connectionId, claimed.capability, replayInput, {
      actorType: 'partner',
      actorId: idOf(actor.partner),
      receivingWorkspaceId: context.identity.receivingWorkspaceId,
      receivingUserId: context.identity.receivingUserId,
      enforceConnectionOwnership: true,
      requestId: actor.requestId,
      traceId: actor.traceId,
      observer: actor.observer,
      idempotencyKey: `manual-recovery:${idOf(claimed)}:${retrySequence}`,
      remoteIdempotencyKeyHash: context.invocation.idempotencyKeyHash,
      recoveryParentInvocationId: claimed._id,
      runtimeProtectionOptions: actor.runtimeProtectionOptions,
      async onInvocationCreated(childInvocationId) {
        const linked = await Invocation.findOneAndUpdate(
          {
            _id: claimed._id,
            receivingWorkspaceId: context.identity.receivingWorkspaceId,
            recoveryState: 'retrying',
            recoveryClaimId,
            recoveryClaimExpiresAt: { $gt: new Date() },
          },
          {
            $set: { recoveryChildInvocationId: childInvocationId },
            $inc: { __v: 1 },
          },
          { new: true, runValidators: true, select: '+recoveryClaimId' },
        );
        if (!linked) {
          throw new AppError(
            409,
            ErrorCodes.INVOCATION_RECOVERY_CONFLICT,
            'The recovery claim expired before execution could begin.',
            [],
            {
              invocationId: idOf(claimed),
              childInvocationId,
              reasonCode: 'RECOVERY_CLAIM_EXPIRED',
            },
          );
        }
        linkedChildInvocationId = childInvocationId;
      },
    });
    if (child.lifecycleState !== 'succeeded') {
      throw new AppError(
        409,
        ErrorCodes.INVOCATION_RECOVERY_ACTION_DENIED,
        'The recovery child did not complete successfully.',
        [],
        {
          invocationId: child.invocationId,
          lifecycleState: child.lifecycleState,
          recoveryRequired: child.lifecycleState === 'recovery_required',
          recoveryReason:
            child.lifecycleState === 'recovery_required'
              ? 'CHILD_REMOTE_OUTCOME_UNKNOWN'
              : 'RECOVERY_CHILD_NOT_SUCCEEDED',
          reasonCode: 'RECOVERY_CHILD_NOT_SUCCEEDED',
        },
      );
    }
    const completed = await Invocation.findOneAndUpdate(
      {
        _id: claimed._id,
        recoveryState: 'retrying',
        recoveryClaimId,
        recoveryChildInvocationId: child.invocationId,
      },
      {
        $set: {
          recoveryState: 'resolved',
          recoveryCompletedAt: new Date(),
          recoveryChildInvocationId: child.invocationId,
          recoveryEligible: false,
        },
        $inc: { __v: 1 },
        $unset: { recoveryClaimId: 1, recoveryClaimExpiresAt: 1 },
      },
      { new: true, runValidators: true },
    );
    if (!completed) {
      throw new AppError(
        409,
        ErrorCodes.INVOCATION_RECOVERY_CONFLICT,
        'Recovery completed after its claim was superseded; operator review is required.',
        [],
        {
          invocationId: idOf(claimed),
          childInvocationId: child.invocationId,
          reasonCode: 'RECOVERY_CLAIM_SUPERSEDED',
        },
      );
    }
    await audit('invocation.recovery.resolved', { ...context, invocation: completed }, actor, {
      reasonCode: 'SAFE_RETRY_CREATED',
      stuckClassification: completed.stuckClassification || 'not_stuck',
    });
    return {
      invocationId: idOf(claimed),
      recoveryState: 'resolved',
      recoveryDecision: 'retry_allowed',
      reasonCode: decision.reason,
      childInvocationId: child.invocationId,
      traceId: child.traceId || actor.traceId,
      requestId: child.requestId || actor.requestId,
    };
  } catch (error) {
    const reasonCode = safeCode(error?.code, 'MANUAL_RETRY_FAILED');
    const reportedChildInvocationId = error?.childInvocationId || error?.invocationId;
    const childInvocationId = mongoose.isValidObjectId(reportedChildInvocationId)
      ? reportedChildInvocationId
      : linkedChildInvocationId;
    const childInvocation = childInvocationId
      ? await privateInvocationQuery({
          _id: childInvocationId,
          receivingWorkspaceId: context.identity.receivingWorkspaceId,
        })
      : null;
    const childTransmitted =
      childInvocation &&
      controlContext(childInvocation, context.connection).transmissionEvidence === 'transmitted';
    const ambiguousChild =
      error?.recoveryRequired === true ||
      error?.lifecycleState === 'recovery_required' ||
      childTransmitted;
    const childRecoveryReason =
      error?.recoveryRequired === true || error?.lifecycleState === 'recovery_required'
        ? 'CHILD_REMOTE_OUTCOME_UNKNOWN'
        : 'CHILD_REMOTE_EXECUTION_OCCURRED';
    await Invocation.updateOne(
      { _id: claimed._id, recoveryState: 'retrying', recoveryClaimId },
      {
        $set: {
          recoveryState: 'required',
          recoveryEligible: true,
          recoveryDecision: ambiguousChild ? 'operator_review_required' : 'retry_denied',
          recoveryDecisionReason: ambiguousChild ? childRecoveryReason : reasonCode,
          ...(childInvocationId ? { recoveryChildInvocationId: childInvocationId } : {}),
          ...(ambiguousChild
            ? {
                recoveryReasonCode: childRecoveryReason,
                stuckClassification: 'outcome_ambiguous',
              }
            : {}),
        },
        $unset: { recoveryClaimId: 1, recoveryClaimExpiresAt: 1 },
        $inc: { __v: 1 },
      },
    );
    await audit('invocation.recovery.retry_denied', { ...context, invocation: claimed }, actor, {
      reasonCode,
    });
    throw error;
  }
}

async function manualResolve(invocationId, input, actor = {}) {
  const version = requiredVersion(input);
  const context = await authorizedContext(invocationId, input, actor.partner);
  const resolution = String(input?.resolution || '')
    .trim()
    .toLowerCase();
  const reasonCode = safeCode(input?.reasonCode);
  const expectedReason = {
    failed: 'OPERATOR_CONFIRMED_REMOTE_FAILURE',
    cancelled: 'OPERATOR_CONFIRMED_CANCELLED',
  }[resolution];
  if (!expectedReason || reasonCode !== expectedReason) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path: 'resolution', message: 'resolution must be failed or cancelled.' },
      { path: 'reasonCode', message: 'reasonCode is not an approved resolution reason.' },
    ]);
  }
  if (context.invocation.lifecycleState !== 'recovery_required') {
    throw new AppError(
      409,
      ErrorCodes.INVOCATION_RECOVERY_ACTION_DENIED,
      'Only recovery-required invocations may be manually resolved.',
      [],
      { invocationId: idOf(context.invocation), reasonCode: 'RECOVERY_NOT_REQUIRED' },
    );
  }
  const now = new Date();
  const update = transitionUpdate('recovery_required', resolution, {
    reasonCode,
    traceId: actor.traceId,
    requestId: actor.requestId,
    now,
    // Preserve the original safe error and attempt evidence; resolution only closes review state.
    outcome: { retryState: 'not_allowed', retryDecisionReason: 'MANUALLY_RESOLVED' },
  });
  Object.assign(update.$set, {
    recoveryState: 'resolved',
    recoveryEligible: false,
    recoveryDecision:
      resolution === 'failed' ? 'resolve_as_failed_allowed' : 'resolve_as_cancelled_allowed',
    recoveryDecisionReason: reasonCode,
    recoveryRequestedAt: now,
    recoveryRequestedBy: `partner:${idOf(actor.partner)}`,
    recoveryCompletedAt: now,
    ...(resolution === 'cancelled'
      ? {
          cancellationState: 'confirmed',
          cancellationOutcome: 'remote_confirmed',
          cancellationConfirmedAt: now,
          cancelReasonCode: 'OPERATOR_CONFIRMED_CANCELLED',
        }
      : {}),
  });
  update.$inc = { __v: 1 };
  update.$unset = { ...(update.$unset || {}), recoveryClaimExpiresAt: 1 };
  const resolved = await Invocation.findOneAndUpdate(
    {
      _id: context.invocation._id,
      receivingWorkspaceId: context.identity.receivingWorkspaceId,
      lifecycleState: 'recovery_required',
      recoveryState: { $nin: ['retrying', 'resolved'] },
      __v: version,
    },
    update,
    { new: true, runValidators: true },
  );
  if (!resolved) {
    throw new AppError(
      409,
      ErrorCodes.INVOCATION_RECOVERY_CONFLICT,
      'Invocation changed before the recovery resolution could be applied.',
      [],
      { invocationId: idOf(context.invocation), reasonCode: 'RECOVERY_VERSION_CONFLICT' },
    );
  }
  await audit('invocation.recovery.resolved', { ...context, invocation: resolved }, actor, {
    reasonCode,
    fromState: 'recovery_required',
    toState: resolution,
    stuckClassification: resolved.stuckClassification || 'not_stuck',
  });
  if (resolution === 'cancelled') {
    await audit('invocation.cancel.confirmed', { ...context, invocation: resolved }, actor, {
      reasonCode: 'OPERATOR_CONFIRMED_CANCELLED',
      fromState: 'recovery_required',
      toState: 'cancelled',
    });
  }
  return serializeOperationalInvocation(resolved, context.connection);
}

module.exports = {
  RESOLUTION_REASON_CODES,
  authorizedContext,
  listRecoveryQueue,
  manualResolve,
  manualRetry,
  requestCancellation,
  scanClassificationOutcome,
  scanStuckInvocations,
};
