const NON_RETRYABLE_CODES = new Set([
  'AUTHENTICATION_REQUIRED',
  'RUNTIME_AUTHENTICATION_FAILED',
  'GEMINI_AUTHENTICATION_FAILED',
  'FORBIDDEN',
  'POLICY_DENIED',
  'CAPABILITY_DISABLED',
  'CAPABILITY_INPUT_INVALID',
  'CAPABILITY_SCHEMA_INVALID',
  'VALIDATION_ERROR',
  'CREDENTIAL_REQUIRED',
  'CREDENTIAL_EXPIRED',
  'CREDENTIAL_VALIDATION_FAILED',
  'ENCRYPTION_CONFIGURATION_INVALID',
  'UNSAFE_URL',
]);

const PRE_TRANSMISSION_REASONS = new Set([
  'STALE_BEFORE_REMOTE_TRANSMISSION',
  'NO_REMOTE_TRANSMISSION',
]);

function recoveryPolicyDecision(input = {}) {
  const invocation = input.invocation || input;
  if (invocation.lifecycleState !== 'recovery_required') {
    return { action: 'retry_denied', reason: 'RECOVERY_NOT_REQUIRED' };
  }
  if (invocation.recoveryState === 'retrying') {
    return { action: 'retry_denied', reason: 'RECOVERY_ALREADY_CLAIMED' };
  }
  if (invocation.recoveryState === 'resolved') {
    return { action: 'retry_denied', reason: 'RECOVERY_ALREADY_RESOLVED' };
  }
  if (invocation.lifecycleState === 'succeeded' || invocation.status === 'completed') {
    return { action: 'retry_denied', reason: 'INVOCATION_ALREADY_SUCCEEDED' };
  }
  if (input.circuitState === 'open' || input.circuitState === 'half_open') {
    return { action: 'retry_denied', reason: 'CIRCUIT_NOT_ACCEPTING_WORK' };
  }
  if (input.connectionStatus && input.connectionStatus !== 'connected') {
    return { action: 'retry_denied', reason: 'CONNECTION_NOT_CONNECTED' };
  }
  if (['unhealthy', 'disabled'].includes(input.connectionHealthState)) {
    return { action: 'retry_denied', reason: 'CONNECTION_NOT_HEALTHY' };
  }

  const recordedDecisionReason = String(invocation.recoveryDecisionReason || '').toUpperCase();
  if (
    invocation.recoveryDecision === 'retry_denied' &&
    NON_RETRYABLE_CODES.has(recordedDecisionReason)
  ) {
    return { action: 'retry_denied', reason: 'FAILURE_CLASS_NOT_RETRYABLE' };
  }

  const errorCode = String(input.errorCode || invocation.error?.code || '').toUpperCase();
  if (NON_RETRYABLE_CODES.has(errorCode)) {
    return { action: 'retry_denied', reason: 'FAILURE_CLASS_NOT_RETRYABLE' };
  }

  const outcomeUnknown =
    invocation.cancellationState === 'outcome_unknown' ||
    invocation.cancellationOutcome === 'remote_unconfirmed' ||
    invocation.recoveryReasonCode === 'REMOTE_OUTCOME_UNKNOWN' ||
    invocation.recoveryReasonCode === 'REMOTE_OUTCOME_AMBIGUOUS' ||
    invocation.recoveryReasonCode === 'REMOTE_TIMEOUT_OUTCOME_AMBIGUOUS' ||
    (Boolean(invocation.recoveryReasonCode) &&
      !PRE_TRANSMISSION_REASONS.has(invocation.recoveryReasonCode)) ||
    input.transmissionEvidence === 'transmitted';
  if (outcomeUnknown) {
    if (
      input.remoteIdempotencySupported === true &&
      invocation.clientIdempotencyProvided === true &&
      input.remoteIdempotencyAcknowledged === true &&
      input.replayInputAvailable === true &&
      input.idempotencyIdentityAvailable === true
    ) {
      return {
        action: 'retry_allowed',
        reason: 'REMOTE_IDEMPOTENCY_CONFIRMED',
        requiresSameIdempotencyKey: true,
      };
    }
    if (input.idempotencyIdentityAvailable !== true) {
      return { action: 'retry_denied', reason: 'IDEMPOTENCY_IDENTITY_NOT_AVAILABLE' };
    }
    if (input.replayInputAvailable !== true) {
      return { action: 'retry_denied', reason: 'REPLAY_INPUT_NOT_AVAILABLE' };
    }
    return { action: 'retry_denied', reason: 'REMOTE_OUTCOME_UNKNOWN' };
  }
  const noRemoteTransmission =
    input.transmissionEvidence === 'not_transmitted' ||
    PRE_TRANSMISSION_REASONS.has(invocation.recoveryReasonCode) ||
    invocation.stuckClassification === 'stale_before_runtime';
  if (noRemoteTransmission) {
    if (input.idempotencyIdentityAvailable !== true) {
      return { action: 'retry_denied', reason: 'IDEMPOTENCY_IDENTITY_NOT_AVAILABLE' };
    }
    if (input.replayInputAvailable !== true) {
      return { action: 'retry_denied', reason: 'REPLAY_INPUT_NOT_AVAILABLE' };
    }
    return {
      action: 'retry_allowed',
      reason: 'NO_REMOTE_TRANSMISSION',
      requiresSameIdempotencyKey: true,
    };
  }
  return { action: 'operator_review_required', reason: 'RETRY_SAFETY_NOT_PROVEN' };
}

function availableRecoveryActions(input = {}) {
  const invocation = input.invocation || input;
  const retry = recoveryPolicyDecision(input);
  const inRecovery =
    invocation.lifecycleState === 'recovery_required' &&
    !['retrying', 'resolved'].includes(invocation.recoveryState);
  return {
    cancel: {
      allowed:
        !['succeeded', 'failed', 'cancelled', 'timed_out'].includes(invocation.lifecycleState) &&
        !(
          invocation.lifecycleState === 'recovery_required' &&
          ['retrying', 'resolved'].includes(invocation.recoveryState)
        ),
      reasonCode: inRecovery ? 'RECOVERY_INTENT_ONLY' : null,
    },
    retry: {
      allowed: retry.action === 'retry_allowed',
      reasonCode: retry.action === 'retry_allowed' ? null : retry.reason,
    },
    resolveFailed: {
      allowed: inRecovery,
      reasonCode: inRecovery ? null : 'RECOVERY_NOT_REQUIRED',
    },
    resolveCancelled: {
      allowed: inRecovery,
      reasonCode: inRecovery ? null : 'RECOVERY_NOT_REQUIRED',
    },
  };
}

module.exports = {
  NON_RETRYABLE_CODES,
  availableRecoveryActions,
  recoveryPolicyDecision,
};
