const { TERMINAL_INVOCATION_STATES } = require('../constants/invocationLifecycle');

const PRE_TRANSMISSION_STAGES = new Set([
  undefined,
  null,
  'accepted',
  'validation_started',
  'authorized',
  'execution_claimed',
  'request_mapped',
]);
const FINALIZATION_STAGES = new Set([
  'remote_response_received',
  'response_validation_started',
  'finalization_started',
]);

function milliseconds(value) {
  if (!value) return undefined;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : undefined;
}

function classifyStuckInvocation(invocation, options = {}) {
  const nowMs = milliseconds(options.now) ?? Date.now();
  const stuckGraceMs = Number(options.stuckGraceMs);
  const finalizationGraceMs = Number(options.finalizationGraceMs);
  if (!Number.isInteger(stuckGraceMs) || stuckGraceMs < 1) {
    throw new TypeError('stuckGraceMs must be a positive integer.');
  }
  if (!Number.isInteger(finalizationGraceMs) || finalizationGraceMs < 1) {
    throw new TypeError('finalizationGraceMs must be a positive integer.');
  }

  const lifecycleState = invocation?.lifecycleState;
  if (
    !lifecycleState ||
    TERMINAL_INVOCATION_STATES.includes(lifecycleState) ||
    lifecycleState === 'recovery_required'
  ) {
    return { classification: 'not_stuck', reasonCode: 'INVOCATION_NOT_ACTIVE' };
  }
  if (
    invocation?.shutdownInterrupted === true ||
    invocation?.recoveryReasonCode === 'SHUTDOWN_DURING_EXTERNAL_INVOCATION'
  ) {
    return { classification: 'shutdown_interrupted', reasonCode: 'SERVICE_SHUTDOWN' };
  }

  const progressAt =
    milliseconds(invocation?.lastProgressAt) ||
    milliseconds(invocation?.updatedAt) ||
    milliseconds(invocation?.createdAt);
  const leaseExpiresAt = milliseconds(invocation?.executionLeaseExpiresAt);
  const runtimeDeadlineAt = milliseconds(invocation?.runtimeDeadlineAt);
  const stage = invocation?.lastProgressStage;

  if (FINALIZATION_STAGES.has(stage) && progressAt + finalizationGraceMs <= nowMs) {
    return {
      classification: 'finalization_stalled',
      reasonCode: 'FINALIZATION_STALLED',
      transmitted: true,
    };
  }
  if (leaseExpiresAt && leaseExpiresAt <= nowMs) {
    return {
      classification: 'lease_expired',
      reasonCode: 'EXECUTION_LEASE_EXPIRED',
      transmitted: !PRE_TRANSMISSION_STAGES.has(stage),
    };
  }
  if (
    lifecycleState === 'waiting_for_runtime' &&
    runtimeDeadlineAt &&
    runtimeDeadlineAt + stuckGraceMs <= nowMs
  ) {
    return {
      classification: 'external_runtime_overdue',
      reasonCode: 'RUNTIME_DEADLINE_EXCEEDED',
      transmitted: true,
    };
  }
  if (
    lifecycleState !== 'waiting_for_runtime' &&
    PRE_TRANSMISSION_STAGES.has(stage) &&
    progressAt &&
    progressAt + stuckGraceMs <= nowMs
  ) {
    return {
      classification: 'stale_before_runtime',
      reasonCode: 'STALE_BEFORE_REMOTE_TRANSMISSION',
      transmitted: false,
    };
  }
  return { classification: 'not_stuck', reasonCode: 'WITHIN_CONFIGURED_DEADLINE' };
}

module.exports = {
  FINALIZATION_STAGES,
  PRE_TRANSMISSION_STAGES,
  classifyStuckInvocation,
};
