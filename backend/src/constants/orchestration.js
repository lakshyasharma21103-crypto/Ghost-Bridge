const ORCHESTRATION_DEFINITION_STATUSES = Object.freeze(['draft', 'active', 'archived']);
const ORCHESTRATION_RUN_STATUSES = Object.freeze([
  'queued',
  'running',
  'waiting_approval',
  'waiting_intervention',
  'recovery_pending',
  'recovering',
  'compensation_pending',
  'compensating',
  'compensation_failed',
  'recovered',
  'succeeded',
  'failed',
  'cancel_requested',
  'cancelling',
  'cancelled',
  'partial_failure',
  'termination_requested',
  'terminated',
  'terminated_with_accepted_risk',
]);
const ORCHESTRATION_NODE_STATUSES = Object.freeze([
  'blocked',
  'ready',
  'queued',
  'running',
  'retry_wait',
  'waiting_approval',
  'waiting_intervention',
  'recovery_pending',
  'recovering',
  'succeeded',
  'failed',
  'cancelled',
  'skipped',
  'cancel_requested',
  'compensation_pending',
  'compensating',
  'compensated',
  'compensation_failed',
  'non_reversible',
  'terminated',
]);

const TERMINAL_RUN_STATUSES = Object.freeze([
  'succeeded',
  'failed',
  'cancelled',
  'partial_failure',
  'terminated',
  'terminated_with_accepted_risk',
]);
const TERMINAL_NODE_STATUSES = Object.freeze([
  'succeeded',
  'failed',
  'cancelled',
  'skipped',
  'compensated',
  'compensation_failed',
  'non_reversible',
  'terminated',
]);

const ORCHESTRATION_LIMITS = Object.freeze({
  maximumNodes: 100,
  maximumEdges: 500,
  maximumConcurrency: 50,
  maximumRunDurationMs: 24 * 60 * 60 * 1_000,
  minimumRunDurationMs: 1_000,
  maximumNodeExecutions: 1_000,
  minimumNodeTimeoutMs: 100,
  maximumNodeTimeoutMs: 30 * 60 * 1_000,
  maximumRetryAttempts: 5,
  maximumPayloadBytes: 1_000_000,
  maximumMappingEntries: 500,
  maximumPathDepth: 16,
  maximumDefinitionNameLength: 200,
  maximumDescriptionLength: 2_000,
});

const DEFAULT_ORCHESTRATION_SETTINGS = Object.freeze({
  concurrencyLimit: 4,
  maxRunDurationMs: 30 * 60 * 1_000,
  maxNodeExecutions: 100,
  defaultNodeTimeoutMs: 60_000,
  retryPolicy: Object.freeze({ maxAttempts: 1, baseDelayMs: 1_000, maxDelayMs: 30_000 }),
});

const NODE_TRANSITIONS = Object.freeze({
  blocked: Object.freeze(['ready', 'retry_wait', 'waiting_intervention', 'cancel_requested', 'cancelled', 'skipped', 'terminated']),
  ready: Object.freeze(['blocked', 'queued', 'running', 'waiting_intervention', 'cancel_requested', 'cancelled', 'skipped', 'terminated']),
  queued: Object.freeze(['running', 'waiting_intervention', 'cancel_requested', 'cancelled', 'skipped', 'terminated']),
  running: Object.freeze([
    'ready',
    'retry_wait',
    'waiting_approval',
    'waiting_intervention',
    'recovery_pending',
    'succeeded',
    'failed',
    'cancel_requested',
    'cancelled',
    'terminated',
  ]),
  retry_wait: Object.freeze(['blocked', 'ready', 'running', 'waiting_intervention', 'cancel_requested', 'cancelled', 'skipped', 'terminated']),
  waiting_approval: Object.freeze(['blocked', 'ready', 'failed', 'waiting_intervention', 'cancel_requested', 'cancelled', 'terminated']),
  waiting_intervention: Object.freeze(['recovery_pending', 'compensation_pending', 'retry_wait', 'skipped', 'failed', 'cancel_requested', 'cancelled', 'terminated']),
  recovery_pending: Object.freeze(['recovering', 'retry_wait', 'waiting_intervention', 'compensation_pending', 'failed', 'terminated']),
  recovering: Object.freeze(['ready', 'retry_wait', 'waiting_intervention', 'compensation_pending', 'succeeded', 'failed', 'terminated']),
  succeeded: Object.freeze(['compensation_pending', 'non_reversible', 'terminated']),
  failed: Object.freeze(['recovery_pending', 'waiting_intervention', 'compensation_pending', 'retry_wait', 'skipped', 'terminated']),
  cancel_requested: Object.freeze(['cancelled', 'compensation_pending', 'terminated']),
  cancelled: Object.freeze([]),
  skipped: Object.freeze([]),
  compensation_pending: Object.freeze(['compensating', 'waiting_intervention', 'compensated', 'compensation_failed', 'terminated']),
  compensating: Object.freeze(['compensation_pending', 'waiting_intervention', 'compensated', 'compensation_failed', 'terminated']),
  compensated: Object.freeze([]),
  compensation_failed: Object.freeze(['waiting_intervention', 'compensation_pending', 'terminated']),
  non_reversible: Object.freeze(['waiting_intervention', 'terminated']),
  terminated: Object.freeze([]),
});

const RUN_TRANSITIONS = Object.freeze({
  queued: Object.freeze(['running', 'waiting_approval', 'waiting_intervention', 'recovery_pending', 'compensation_pending', 'failed', 'cancel_requested', 'cancelled', 'termination_requested', 'terminated']),
  running: Object.freeze([
    'waiting_approval',
    'waiting_intervention',
    'recovery_pending',
    'recovering',
    'compensation_pending',
    'compensating',
    'succeeded',
    'failed',
    'cancel_requested',
    'cancelling',
    'cancelled',
    'partial_failure',
    'termination_requested',
    'terminated',
  ]),
  waiting_approval: Object.freeze([
    'running',
    'waiting_intervention',
    'recovery_pending',
    'compensation_pending',
    'failed',
    'cancel_requested',
    'cancelled',
    'partial_failure',
    'termination_requested',
    'terminated',
  ]),
  waiting_intervention: Object.freeze(['recovery_pending', 'compensation_pending', 'running', 'failed', 'partial_failure', 'cancel_requested', 'termination_requested', 'terminated', 'terminated_with_accepted_risk']),
  recovery_pending: Object.freeze(['recovering', 'waiting_intervention', 'compensation_pending', 'failed', 'termination_requested', 'terminated']),
  recovering: Object.freeze(['running', 'recovery_pending', 'waiting_intervention', 'compensation_pending', 'recovered', 'failed', 'termination_requested', 'terminated']),
  compensation_pending: Object.freeze(['compensating', 'waiting_intervention', 'compensation_failed', 'failed', 'cancelled', 'termination_requested', 'terminated']),
  compensating: Object.freeze(['compensation_pending', 'waiting_intervention', 'compensation_failed', 'failed', 'partial_failure', 'cancelled', 'termination_requested', 'terminated', 'terminated_with_accepted_risk']),
  compensation_failed: Object.freeze(['waiting_intervention', 'failed', 'partial_failure', 'termination_requested', 'terminated', 'terminated_with_accepted_risk']),
  recovered: Object.freeze(['running', 'succeeded', 'partial_failure', 'failed', 'cancel_requested', 'termination_requested']),
  cancel_requested: Object.freeze(['cancelling', 'compensation_pending', 'cancelled', 'termination_requested', 'terminated']),
  cancelling: Object.freeze(['compensation_pending', 'waiting_intervention', 'cancelled', 'termination_requested', 'terminated']),
  termination_requested: Object.freeze(['terminated', 'terminated_with_accepted_risk']),
  succeeded: Object.freeze([]),
  failed: Object.freeze([]),
  cancelled: Object.freeze([]),
  partial_failure: Object.freeze([]),
  terminated: Object.freeze([]),
  terminated_with_accepted_risk: Object.freeze([]),
});

function assertTransition(transitions, fromState, toState, code) {
  if (!transitions[fromState]?.includes(toState)) {
    const error = new Error(`Invalid orchestration transition from ${fromState} to ${toState}.`);
    error.code = code;
    error.fromState = fromState;
    error.toState = toState;
    throw error;
  }
  return true;
}

function assertNodeTransition(fromState, toState) {
  return assertTransition(
    NODE_TRANSITIONS,
    fromState,
    toState,
    'ORCHESTRATION_NODE_TRANSITION_INVALID',
  );
}

function assertRunTransition(fromState, toState) {
  return assertTransition(
    RUN_TRANSITIONS,
    fromState,
    toState,
    'ORCHESTRATION_RUN_TRANSITION_INVALID',
  );
}

module.exports = {
  DEFAULT_ORCHESTRATION_SETTINGS,
  NODE_TRANSITIONS,
  ORCHESTRATION_DEFINITION_STATUSES,
  ORCHESTRATION_LIMITS,
  ORCHESTRATION_NODE_STATUSES,
  ORCHESTRATION_RUN_STATUSES,
  RUN_TRANSITIONS,
  TERMINAL_NODE_STATUSES,
  TERMINAL_RUN_STATUSES,
  assertNodeTransition,
  assertRunTransition,
};
