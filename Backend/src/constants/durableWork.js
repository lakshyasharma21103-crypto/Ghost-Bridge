const DURABLE_WORK_TYPES = Object.freeze(['runtime_invocation', 'recovery_retry']);

const DURABLE_WORK_STATUSES = Object.freeze([
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

const CLAIMABLE_DURABLE_WORK_STATUSES = Object.freeze(['pending', 'retry_scheduled']);
const OWNED_DURABLE_WORK_STATUSES = Object.freeze([
  'claimed',
  'running',
  'retry_preparing',
  'cancellation_requested',
]);
const TERMINAL_DURABLE_WORK_STATUSES = Object.freeze([
  'cancelled',
  'completed',
  'failed',
  'recovery_required',
  'dead_lettered',
]);

const DURABLE_WORK_OPERATIONS = Object.freeze(['runtime_invocation', 'recovery_retry']);

const DURABLE_WORK_MILESTONES = Object.freeze([
  'work_claimed',
  'validation_completed',
  'credentials_loaded',
  'outbound_transmission_started',
  'outbound_response_received',
  'response_validated',
  'finalization_started',
  'invocation_persisted',
]);

const DURABLE_MILESTONE_STATUSES = Object.freeze(['completed', 'failed']);
// A bounded WorkItem may be configured for up to twenty attempts and each attempt can persist all
// eight allowlisted milestones. Keep the validation ceiling aligned with that supported bound so
// valid retry history cannot fail schema validation on later attempts.
const MAX_DURABLE_WORK_MILESTONES = 160;

const DURABLE_RECOVERY_REASONS = Object.freeze([
  'WORKER_TERMINATED_BEFORE_TRANSMISSION',
  'LEASE_EXPIRED_BEFORE_TRANSMISSION',
  'LEASE_EXPIRED_AFTER_TRANSMISSION',
  'WORKER_LOST_DURING_REMOTE_EXECUTION',
  'WORKER_LOST_DURING_FINALIZATION',
  'RESULT_PERSISTENCE_UNCERTAIN',
  'SAFE_RETRY_ATTEMPTS_EXHAUSTED',
]);

const DURABLE_OUTBOX_EVENT_TYPES = Object.freeze([
  'invocation.accepted',
  'work.enqueued',
  'work.reconciled',
  'work.claimed',
  'work.started',
  'work.cancellation_requested',
  'work.cancelled',
  'work.retry_scheduled',
  'work.abandoned_recovered',
  'work.recovery_required',
  'work.dead_lettered',
  'work.requeued',
  'work.completed',
  'work.failed',
  'invocation.terminalized',
]);

const RUNTIME_WORKER_STATUSES = Object.freeze(['starting', 'ready', 'draining', 'stopped']);
const RUNTIME_WORKER_HEARTBEAT_RETENTION_MS = 24 * 60 * 60 * 1000;

const PRE_TRANSMISSION_MILESTONES = Object.freeze([
  'work_claimed',
  'validation_completed',
  'credentials_loaded',
]);

const POST_TRANSMISSION_MILESTONES = Object.freeze([
  'outbound_transmission_started',
  'outbound_response_received',
  'response_validated',
  'finalization_started',
  'invocation_persisted',
]);

module.exports = {
  CLAIMABLE_DURABLE_WORK_STATUSES,
  DURABLE_MILESTONE_STATUSES,
  DURABLE_OUTBOX_EVENT_TYPES,
  DURABLE_RECOVERY_REASONS,
  DURABLE_WORK_MILESTONES,
  DURABLE_WORK_OPERATIONS,
  DURABLE_WORK_STATUSES,
  DURABLE_WORK_TYPES,
  MAX_DURABLE_WORK_MILESTONES,
  OWNED_DURABLE_WORK_STATUSES,
  POST_TRANSMISSION_MILESTONES,
  PRE_TRANSMISSION_MILESTONES,
  RUNTIME_WORKER_STATUSES,
  RUNTIME_WORKER_HEARTBEAT_RETENTION_MS,
  TERMINAL_DURABLE_WORK_STATUSES,
};
