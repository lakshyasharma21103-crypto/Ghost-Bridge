const INVOCATION_STATES = Object.freeze([
  'accepted',
  'validating',
  'authorized',
  'retry_scheduled',
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
  accepted: Object.freeze(['validating', 'retry_scheduled', 'recovery_required', 'cancelled']),
  validating: Object.freeze([
    'authorized',
    'retry_scheduled',
    'failed',
    'recovery_required',
    'cancelled',
  ]),
  authorized: Object.freeze([
    'running',
    'retry_scheduled',
    'failed',
    'recovery_required',
    'cancelled',
  ]),
  retry_scheduled: Object.freeze(['authorized', 'failed', 'recovery_required', 'cancelled']),
  running: Object.freeze([
    'waiting_for_runtime',
    'retry_scheduled',
    'failed',
    'timed_out',
    'recovery_required',
    'cancelled',
  ]),
  waiting_for_runtime: Object.freeze([
    'succeeded',
    'retry_scheduled',
    'failed',
    'timed_out',
    'recovery_required',
    'cancelled',
  ]),
  succeeded: Object.freeze([]),
  failed: Object.freeze([]),
  cancelled: Object.freeze([]),
  timed_out: Object.freeze([]),
  recovery_required: Object.freeze(['authorized', 'running', 'failed', 'cancelled']),
});

const INVOCATION_ATTEMPT_STATUSES = Object.freeze([
  'started',
  'succeeded',
  'failed',
  'cancelled',
  'timed_out',
  'recovery_required',
]);

const INVOCATION_CANCELLATION_STATES = Object.freeze([
  'not_requested',
  'requested',
  'aborting',
  'confirmed',
  'rejected',
  'outcome_unknown',
]);

const INVOCATION_CANCELLATION_OUTCOMES = Object.freeze([
  'not_applicable',
  'local_confirmed',
  'remote_confirmed',
  'remote_unconfirmed',
]);

const INVOCATION_CANCEL_REASON_CODES = Object.freeze([
  'USER_REQUESTED',
  'ADMIN_REQUESTED',
  'CLIENT_DISCONNECTED',
  'SERVICE_SHUTDOWN',
  'EXECUTION_TIMEOUT',
  'STUCK_INVOCATION',
  'REMOTE_OUTCOME_UNKNOWN',
  'OPERATOR_CONFIRMED_CANCELLED',
]);

const INVOCATION_RECOVERY_STATES = Object.freeze([
  'not_required',
  'required',
  'retrying',
  'resolved',
]);

const INVOCATION_RECOVERY_DECISIONS = Object.freeze([
  'not_evaluated',
  'retry_allowed',
  'retry_denied',
  'resolve_as_failed_allowed',
  'resolve_as_cancelled_allowed',
  'mark_succeeded_allowed',
  'operator_review_required',
]);

const INVOCATION_PROGRESS_STAGES = Object.freeze([
  'accepted',
  'validation_started',
  'authorized',
  'execution_claimed',
  'request_mapped',
  'outbound_request_started',
  'remote_response_received',
  'response_validation_started',
  'finalization_started',
  'terminalized',
]);

const INVOCATION_STUCK_CLASSIFICATIONS = Object.freeze([
  'not_stuck',
  'stale_before_runtime',
  'external_runtime_overdue',
  'lease_expired',
  'finalization_stalled',
  'shutdown_interrupted',
  'outcome_ambiguous',
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
  retry_scheduled: 'retryScheduledAt',
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
  retry_scheduled: 'queued',
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
  INVOCATION_CANCELLATION_OUTCOMES,
  INVOCATION_CANCELLATION_STATES,
  INVOCATION_CANCEL_REASON_CODES,
  INVOCATION_PROGRESS_STAGES,
  INVOCATION_RECOVERY_DECISIONS,
  INVOCATION_RECOVERY_STATES,
  INVOCATION_RETRY_DECISIONS,
  INVOCATION_RETRY_STATES,
  INVOCATION_STUCK_CLASSIFICATIONS,
  INVOCATION_STATES,
  LEGACY_STATUS_TO_LIFECYCLE_STATE,
  LIFECYCLE_STATE_TO_LEGACY_STATUS,
  LIFECYCLE_TIMESTAMP_FIELDS,
  MAX_INVOCATION_STATE_HISTORY,
  SAFE_INVOCATION_ATTEMPT_STAGES,
  TERMINAL_INVOCATION_STATES,
};
