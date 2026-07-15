const { availableRecoveryActions, recoveryPolicyDecision } = require('./recoveryPolicy');
const { createInvocationIdempotency, hashesEqual } = require('./idempotency');
const { SAFE_INVOCATION_ATTEMPT_STAGES } = require('../constants/invocationLifecycle');

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_OPERATION_PATTERN = /^[a-z][a-z0-9_.:-]{0,127}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function safeError(error) {
  if (!error || typeof error !== 'object') return null;
  const code = SAFE_CODE_PATTERN.test(error.code || '') ? error.code : null;
  const stage = SAFE_INVOCATION_ATTEMPT_STAGES.includes(error.stage) ? error.stage : null;
  const operation = SAFE_OPERATION_PATTERN.test(error.operation || '') ? error.operation : null;
  const timeoutReason = SAFE_CODE_PATTERN.test(error.timeoutReason || '')
    ? error.timeoutReason
    : null;
  return {
    code,
    stage,
    operation,
    retryable: error.retryable === true,
    timeoutReason,
    providerHttpStatus: Number.isInteger(error.providerHttpStatus)
      ? error.providerHttpStatus
      : null,
  };
}

function controlContext(invocation, connection) {
  const runtimeControl = connection?.runtimeControl || {};
  const transmissionEvidence =
    (Array.isArray(invocation.stateHistory) &&
      invocation.stateHistory.some((entry) => entry?.toState === 'waiting_for_runtime')) ||
    [
      'outbound_request_started',
      'remote_response_received',
      'response_validation_started',
      'finalization_started',
    ].includes(invocation.lastProgressStage)
      ? 'transmitted'
      : 'not_transmitted';
  let replayInputAvailable = invocation.protectedReplayAvailable === true;
  if (!replayInputAvailable && invocation.requestFingerprint && invocation.inputSummary !== undefined) {
    try {
      const replayFingerprint = createInvocationIdempotency({
        clientKey: 'recovery-fingerprint-verification',
        connectionId: idOf(invocation.connectionId),
        capability: invocation.capability,
        input: invocation.inputSummary,
      }).requestFingerprint;
      replayInputAvailable = hashesEqual(invocation.requestFingerprint, replayFingerprint);
    } catch {
      replayInputAvailable = false;
    }
  }
  return {
    invocation,
    transmissionEvidence,
    connectionStatus: connection?.status,
    connectionHealthState: connection?.healthStatus,
    remoteIdempotencySupported: runtimeControl.remoteIdempotencySupported === true,
    remoteIdempotencyAcknowledged: runtimeControl.remoteIdempotencySupported === true,
    replayInputAvailable,
    idempotencyIdentityAvailable: /^(?:sha256|hmac-sha256):[a-f0-9]{64}$/.test(
      invocation.idempotencyKeyHash || '',
    ),
  };
}

function serializeOperationalInvocation(invocation, connection) {
  const context = controlContext(invocation, connection);
  const decision = recoveryPolicyDecision(context);
  const recoveryRequired =
    invocation.lifecycleState === 'recovery_required' && invocation.recoveryState !== 'resolved';
  return {
    invocationId: idOf(invocation),
    connectionId: idOf(invocation.connectionId),
    passportId: idOf(invocation.passportId),
    capability: invocation.capability,
    status: invocation.status,
    lifecycleState: invocation.lifecycleState,
    cancellationState: invocation.cancellationState || 'not_requested',
    cancellationOutcome: invocation.cancellationOutcome || 'not_applicable',
    cancelReasonCode: invocation.cancelReasonCode || null,
    cancelRequestedAt: invocation.cancelRequestedAt || null,
    cancellationConfirmedAt: invocation.cancellationConfirmedAt || null,
    recoveryRequired,
    recoveryState:
      invocation.recoveryState ||
      (invocation.lifecycleState === 'recovery_required' ? 'required' : 'not_required'),
    recoveryReason: invocation.recoveryReasonCode || null,
    recoveryEligible:
      !['retrying', 'resolved'].includes(invocation.recoveryState) &&
      (invocation.recoveryEligible === true || recoveryRequired),
    recoveryDecision:
      ['retrying', 'resolved'].includes(invocation.recoveryState) && invocation.recoveryDecision
        ? invocation.recoveryDecision
        : decision.action,
    recoveryDecisionReason:
      ['retrying', 'resolved'].includes(invocation.recoveryState) &&
      invocation.recoveryDecisionReason
        ? invocation.recoveryDecisionReason
        : decision.reason || null,
    recoveryChildInvocationId: invocation.recoveryChildInvocationId
      ? idOf(invocation.recoveryChildInvocationId)
      : null,
    stuckClassification: invocation.stuckClassification || 'not_stuck',
    stuckDetectedAt: invocation.stuckDetectedAt || null,
    lastProgressStage: invocation.lastProgressStage || null,
    lastProgressAt: invocation.lastProgressAt || null,
    runtimeDeadlineAt: invocation.runtimeDeadlineAt || null,
    terminalizedAt: invocation.terminalizedAt || invocation.terminalAt || null,
    attemptCount: Number(invocation.attemptCount || 0),
    runtimeType: invocation.runtimeType || null,
    runtimeStatus: Number.isInteger(invocation.runtimeStatus) ? invocation.runtimeStatus : null,
    durationMs: Number.isFinite(invocation.durationMs) ? invocation.durationMs : null,
    safeError: safeError(invocation.error),
    traceId: SAFE_IDENTIFIER_PATTERN.test(invocation.traceId || '') ? invocation.traceId : null,
    requestId: SAFE_IDENTIFIER_PATTERN.test(invocation.requestId || '')
      ? invocation.requestId
      : null,
    version: Number.isInteger(invocation.__v) ? invocation.__v : 0,
    availableActions: availableRecoveryActions(context),
    createdAt: invocation.createdAt,
    updatedAt: invocation.updatedAt,
  };
}

module.exports = { controlContext, safeError, serializeOperationalInvocation };
