const crypto = require('node:crypto');

const RECOVERY_POLICY_STATUSES = Object.freeze(['draft', 'active', 'archived']);
const FAILURE_STRATEGIES = Object.freeze([
  'fail',
  'retry',
  'pause',
  'request_intervention',
  'compensate_then_fail',
  'compensate_then_pause',
  'compensate_then_cancel',
]);
const RECOVERABILITIES = Object.freeze([
  'retryable',
  'compensatable',
  'non_reversible',
  'manual_only',
]);
const COMPENSATION_ORDERINGS = Object.freeze(['reverse_completion', 'reverse_topological']);
const EXPECTED_IDEMPOTENCY_BEHAVIORS = Object.freeze([
  'provider_supported',
  'ghost_bridge_keyed',
  'non_idempotent',
]);

const FAILURE_CATEGORIES = Object.freeze([
  'transient_network',
  'timeout',
  'rate_limited',
  'circuit_open',
  'provider_unavailable',
  'malformed_output',
  'schema_validation',
  'policy_denied',
  'authorization_denied',
  'runtime_authentication',
  'connection_revoked',
  'passport_revoked',
  'approval_rejected',
  'data_contract_denied',
  'residency_denied',
  'classification_denied',
  'cancellation',
  'operator_terminated',
  'non_reversible_failure',
  'outcome_unknown',
  'unknown_safe_failure',
]);

const NON_AUTOMATIC_RECOVERY_CATEGORIES = Object.freeze([
  'runtime_authentication',
  'authorization_denied',
  'policy_denied',
  'connection_revoked',
  'passport_revoked',
  'malformed_output',
  'schema_validation',
  'approval_rejected',
  'data_contract_denied',
  'residency_denied',
  'classification_denied',
  'cancellation',
  'operator_terminated',
  'non_reversible_failure',
  'outcome_unknown',
]);

const RECOVERY_DECISION_TYPES = Object.freeze([
  'automatic_retry',
  'operator_retry',
  'skip',
  'resume',
  'compensate',
  'replace_agent',
  'correct_input',
  'terminate',
  'waive_compensation',
]);
const RECOVERY_DECISION_STATUSES = Object.freeze([
  'pending',
  'approval_required',
  'approved',
  'rejected',
  'applied',
  'failed',
  'expired',
  'cancelled',
]);
const COMPENSATION_PLAN_STATUSES = Object.freeze([
  'planned',
  'active',
  'paused',
  'succeeded',
  'partial',
  'failed',
  'cancelled',
  'terminated',
]);
const COMPENSATION_RUN_STATUSES = Object.freeze([
  'pending',
  'queued',
  'running',
  'retry_wait',
  'waiting_approval',
  'waiting_intervention',
  'succeeded',
  'failed',
  'waived',
  'cancelled',
  'terminated',
]);
const INTERVENTION_TYPES = Object.freeze([
  'retry',
  'skip',
  'compensate',
  'waive_compensation',
  'replace_agent',
  'correct_input',
  'resume',
  'terminate',
  'inspect_failure',
]);
const INTERVENTION_STATUSES = Object.freeze([
  'pending',
  'approval_required',
  'resolved',
  'rejected',
  'expired',
  'cancelled',
]);
const CHECKPOINT_STATUSES = Object.freeze(['created', 'verified', 'superseded', 'invalidated']);

const RECOVERY_LIMITS = Object.freeze({
  maximumNameLength: 200,
  maximumDescriptionLength: 2_000,
  maximumRecoveryAttempts: 20,
  maximumCompensationAttempts: 10,
  maximumParallelCompensations: 20,
  minimumDeadlineMs: 1_000,
  maximumDeadlineMs: 30 * 24 * 60 * 60 * 1_000,
  maximumBackoffMs: 24 * 60 * 60 * 1_000,
  maximumInterventionMs: 30 * 24 * 60 * 60 * 1_000,
  maximumPlanSteps: 1_000,
  maximumCorrectedInputBytes: 1_000_000,
  maximumChangedFields: 200,
  maximumAssignedPrincipals: 100,
  maximumSafeSummaryLength: 1_000,
  maximumSafeReasonLength: 500,
  maximumListLimit: 100,
  maximumTimelineEntries: 200,
  maximumLeaseMs: 30 * 60 * 1_000,
});

const RECOVERY_DECISION_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['approval_required', 'approved', 'applied', 'failed', 'cancelled', 'expired']),
  approval_required: Object.freeze(['approved', 'rejected', 'cancelled', 'expired']),
  approved: Object.freeze(['applied', 'failed', 'cancelled', 'expired']),
  rejected: Object.freeze([]),
  applied: Object.freeze([]),
  failed: Object.freeze([]),
  expired: Object.freeze([]),
  cancelled: Object.freeze([]),
});
const COMPENSATION_PLAN_TRANSITIONS = Object.freeze({
  planned: Object.freeze(['active', 'cancelled', 'terminated']),
  active: Object.freeze(['paused', 'succeeded', 'partial', 'failed', 'cancelled', 'terminated']),
  paused: Object.freeze(['active', 'partial', 'failed', 'cancelled', 'terminated']),
  succeeded: Object.freeze([]),
  partial: Object.freeze([]),
  failed: Object.freeze([]),
  cancelled: Object.freeze([]),
  terminated: Object.freeze([]),
});
const COMPENSATION_RUN_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['queued', 'waiting_approval', 'waiting_intervention', 'waived', 'cancelled', 'terminated']),
  queued: Object.freeze(['running', 'waiting_intervention', 'cancelled', 'terminated']),
  running: Object.freeze(['retry_wait', 'waiting_intervention', 'succeeded', 'failed', 'cancelled', 'terminated']),
  retry_wait: Object.freeze(['queued', 'running', 'waiting_intervention', 'failed', 'cancelled', 'terminated']),
  waiting_approval: Object.freeze(['queued', 'waiting_intervention', 'failed', 'cancelled', 'terminated']),
  waiting_intervention: Object.freeze(['queued', 'retry_wait', 'waived', 'failed', 'cancelled', 'terminated']),
  succeeded: Object.freeze([]),
  failed: Object.freeze([]),
  waived: Object.freeze([]),
  cancelled: Object.freeze([]),
  terminated: Object.freeze([]),
});
const INTERVENTION_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['approval_required', 'resolved', 'rejected', 'expired', 'cancelled']),
  approval_required: Object.freeze(['resolved', 'rejected', 'expired', 'cancelled']),
  resolved: Object.freeze([]),
  rejected: Object.freeze([]),
  expired: Object.freeze([]),
  cancelled: Object.freeze([]),
});
const CHECKPOINT_TRANSITIONS = Object.freeze({
  created: Object.freeze(['verified', 'invalidated']),
  verified: Object.freeze(['superseded', 'invalidated']),
  superseded: Object.freeze([]),
  invalidated: Object.freeze([]),
});

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;

function safeCode(value, fallback = 'UNKNOWN_SAFE_FAILURE') {
  const normalized = String(value || '').trim().toUpperCase();
  return SAFE_CODE_PATTERN.test(normalized) ? normalized : fallback;
}

function classifyRecoveryFailure(error = {}) {
  const code = safeCode(error.code || error.errorCode || error.safeFailureCode);
  const hint = String(error.failureCategory || error.category || '').toLowerCase();
  if (FAILURE_CATEGORIES.includes(hint)) return hint;
  if (
    error.outcomeAmbiguous === true ||
    error.outcomeUnknown === true ||
    ['INVOCATION_RECOVERY_REQUIRED', 'SHUTDOWN_INTERRUPTED_INVOCATION', 'REMOTE_OUTCOME_UNKNOWN'].includes(code)
  ) return 'outcome_unknown';
  if (/CANCEL/.test(code)) return 'cancellation';
  if (/OPERATOR_TERMINAT|FORCE_TERMINAT/.test(code)) return 'operator_terminated';
  if (/NON_REVERSIBLE/.test(code)) return 'non_reversible_failure';
  if (/RESIDENCY/.test(code)) return 'residency_denied';
  if (/CLASSIFICATION/.test(code)) return 'classification_denied';
  if (/DATA_CONTRACT|INTER_AGENT_.*(DENIED|INVALID)|MAPPING/.test(code)) return 'data_contract_denied';
  if (/APPROVAL_(REJECTED|EXPIRED|INVALIDATED)/.test(code)) return 'approval_rejected';
  if (/PASSPORT_(REVOKED|UNAVAILABLE)/.test(code)) return 'passport_revoked';
  if (/CONNECTION_(REVOKED|DISABLED|NOT_FOUND)/.test(code)) return 'connection_revoked';
  if (/AUTHENTICATION|CREDENTIAL_(REQUIRED|EXPIRED|REVOKED|VALIDATION_FAILED)|SECRET_(REVOKED|EXPIRED)/.test(code)) return 'runtime_authentication';
  if (/AUTHORIZATION|FORBIDDEN|PERMISSION/.test(code)) return 'authorization_denied';
  if (/POLICY/.test(code)) return 'policy_denied';
  if (/SCHEMA|INPUT_INVALID|OUTPUT_INVALID|MAPPING_INVALID/.test(code)) return 'schema_validation';
  if (/MALFORMED|OUTPUT_MISSING/.test(code)) return 'malformed_output';
  if (/RATE_LIMIT|RESOURCE_EXHAUSTED/.test(code)) return 'rate_limited';
  if (/CIRCUIT/.test(code)) return 'circuit_open';
  if (/TIMEOUT|DEADLINE/.test(code)) return 'timeout';
  if (/UNAVAILABLE|SERVICE_UNAVAILABLE|PROVIDER/.test(code)) return 'provider_unavailable';
  if (/NETWORK|CONNECTION_RESET|SAFE_FETCH_FAILED/.test(code)) return 'transient_network';
  return 'unknown_safe_failure';
}

function automaticRetryEligible(input = {}) {
  const policy = input.policy || {};
  const category = FAILURE_CATEGORIES.includes(input.failureCategory)
    ? input.failureCategory
    : classifyRecoveryFailure(input.error || {});
  if (NON_AUTOMATIC_RECOVERY_CATEGORIES.includes(category)) return false;
  if (Array.isArray(policy.nonRecoverableFailureCategories) && policy.nonRecoverableFailureCategories.includes(category)) return false;
  if (Array.isArray(policy.permittedFailureCategories) && policy.permittedFailureCategories.length && !policy.permittedFailureCategories.includes(category)) return false;
  if (input.idempotencySafe === false || input.deadlineExpired === true) return false;
  const maximum = Number(input.maximumAttempts ?? policy.maximumRecoveryAttempts ?? 0);
  const attempt = Number(input.attempt || 0);
  return Number.isInteger(maximum) && maximum > 0 && Number.isInteger(attempt) && attempt < maximum;
}

function recoveryBackoff(policy = {}, attempt = 1, random = Math.random) {
  const base = Math.max(1, Number(policy.baseDelayMs || 1_000));
  const maximum = Math.max(base, Math.min(RECOVERY_LIMITS.maximumBackoffMs, Number(policy.maxDelayMs || 30_000)));
  const multiplier = Math.max(1, Math.min(10, Number(policy.multiplier || 2)));
  const exponential = Math.min(maximum, base * multiplier ** Math.max(0, Number(attempt || 1) - 1));
  const jitterRatio = Math.max(0, Math.min(0.5, Number(policy.jitterRatio ?? 0.2)));
  const randomValue = Math.max(0, Math.min(1, Number(random()) || 0));
  return Math.min(maximum, Math.round(exponential + exponential * jitterRatio * randomValue));
}

function compensationIdempotencyKey(input = {}) {
  const parts = [
    input.orchestrationRunId,
    input.originalNodeRunId,
    input.compensationDefinitionVersion || 1,
    input.compensationPlanId,
    input.compensationStepOrdinal,
    input.logicalCompensationAttempt || 1,
  ].map((value) => String(value ?? ''));
  if (parts.some((value) => !value)) throw new TypeError('Complete compensation identity is required.');
  return `cmp_${crypto.createHash('sha256').update(parts.join('|'), 'utf8').digest('hex')}`;
}

function assertRecoveryTransition(transitions, fromState, toState, code) {
  if (!transitions[fromState]?.includes(toState)) {
    const error = new Error(`Invalid recovery transition from ${fromState} to ${toState}.`);
    error.code = code;
    error.fromState = fromState;
    error.toState = toState;
    throw error;
  }
  return true;
}

module.exports = {
  CHECKPOINT_STATUSES,
  CHECKPOINT_TRANSITIONS,
  COMPENSATION_ORDERINGS,
  COMPENSATION_PLAN_STATUSES,
  COMPENSATION_PLAN_TRANSITIONS,
  COMPENSATION_RUN_STATUSES,
  COMPENSATION_RUN_TRANSITIONS,
  EXPECTED_IDEMPOTENCY_BEHAVIORS,
  FAILURE_CATEGORIES,
  FAILURE_STRATEGIES,
  INTERVENTION_STATUSES,
  INTERVENTION_TRANSITIONS,
  INTERVENTION_TYPES,
  NON_AUTOMATIC_RECOVERY_CATEGORIES,
  RECOVERABILITIES,
  RECOVERY_DECISION_STATUSES,
  RECOVERY_DECISION_TRANSITIONS,
  RECOVERY_DECISION_TYPES,
  RECOVERY_LIMITS,
  RECOVERY_POLICY_STATUSES,
  assertRecoveryTransition,
  automaticRetryEligible,
  classifyRecoveryFailure,
  compensationIdempotencyKey,
  recoveryBackoff,
  safeCode,
};
