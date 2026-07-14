const INVOCATION_STATES = Object.freeze([
  'accepted',
  'validating',
  'authorized',
  'running',
  'waiting_for_runtime',
  'succeeded',
  'failed',
  'cancelled',
  'timed_out',
  'recovery_required',
]);

const TERMINAL_INVOCATION_STATES = Object.freeze(['succeeded', 'failed', 'cancelled', 'timed_out']);

const ALLOWED_INVOCATION_TRANSITIONS = Object.freeze({
  accepted: Object.freeze(['validating', 'cancelled']),
  validating: Object.freeze(['authorized', 'failed', 'cancelled']),
  authorized: Object.freeze(['running', 'failed', 'cancelled']),
  running: Object.freeze([
    'waiting_for_runtime',
    'failed',
    'timed_out',
    'recovery_required',
    'cancelled',
  ]),
  waiting_for_runtime: Object.freeze([
    'succeeded',
    'failed',
    'timed_out',
    'recovery_required',
    'cancelled',
  ]),
  succeeded: Object.freeze([]),
  failed: Object.freeze([]),
  cancelled: Object.freeze([]),
  timed_out: Object.freeze([]),
  recovery_required: Object.freeze(['running', 'failed', 'cancelled']),
});

const INVOCATION_ATTEMPT_STATUSES = Object.freeze([
  'started',
  'succeeded',
  'failed',
  'timed_out',
  'recovery_required',
]);

const INVOCATION_RETRY_STATES = Object.freeze([
  'not_evaluated',
  'not_allowed',
  'scheduled',
  'exhausted',
  'recovery_required',
  'completed',
]);

const INVOCATION_RETRY_DECISIONS = Object.freeze([
  'not_evaluated',
  'allowed',
  'denied',
  'scheduled',
]);

const SAFE_INVOCATION_ATTEMPT_STAGES = Object.freeze([
  'connection_lookup',
  'capability_resolution',
  'policy_check',
  'credential_load',
  'credential_decryption',
  'request_mapping',
  'external_runtime_invocation',
  'grounded_research',
  'grounding_source_extraction',
  'structured_formatting',
  'response_validation',
  'invocation_persistence',
  'audit_persistence',
]);

const MAX_INVOCATION_STATE_HISTORY = 32;

const LIFECYCLE_TIMESTAMP_FIELDS = Object.freeze({
  accepted: 'acceptedAt',
  validating: 'validatingAt',
  authorized: 'authorizedAt',
  running: 'runningAt',
  waiting_for_runtime: 'waitingForRuntimeAt',
  succeeded: 'succeededAt',
  failed: 'failedAt',
  cancelled: 'cancelledAt',
  timed_out: 'timedOutAt',
  recovery_required: 'recoveryRequiredAt',
});

const LEGACY_STATUS_TO_LIFECYCLE_STATE = Object.freeze({
  queued: 'accepted',
  running: 'running',
  completed: 'succeeded',
  failed: 'failed',
});

const LIFECYCLE_STATE_TO_LEGACY_STATUS = Object.freeze({
  accepted: 'queued',
  validating: 'queued',
  authorized: 'queued',
  running: 'running',
  waiting_for_runtime: 'running',
  succeeded: 'completed',
  failed: 'failed',
  cancelled: 'failed',
  timed_out: 'failed',
  recovery_required: 'failed',
});

module.exports = {
  ALLOWED_INVOCATION_TRANSITIONS,
  INVOCATION_ATTEMPT_STATUSES,
  INVOCATION_RETRY_DECISIONS,
  INVOCATION_RETRY_STATES,
  INVOCATION_STATES,
  LEGACY_STATUS_TO_LIFECYCLE_STATE,
  LIFECYCLE_STATE_TO_LEGACY_STATUS,
  LIFECYCLE_TIMESTAMP_FIELDS,
  MAX_INVOCATION_STATE_HISTORY,
  SAFE_INVOCATION_ATTEMPT_STAGES,
  TERMINAL_INVOCATION_STATES,
};
