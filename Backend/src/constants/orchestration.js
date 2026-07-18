const ORCHESTRATION_DEFINITION_STATUSES = Object.freeze(['draft', 'active', 'archived']);
const ORCHESTRATION_RUN_STATUSES = Object.freeze([
  'queued',
  'running',
  'waiting_approval',
  'succeeded',
  'failed',
  'cancel_requested',
  'cancelled',
  'partial_failure',
]);
const ORCHESTRATION_NODE_STATUSES = Object.freeze([
  'blocked',
  'ready',
  'queued',
  'running',
  'retry_wait',
  'waiting_approval',
  'succeeded',
  'failed',
  'cancelled',
  'skipped',
]);

const TERMINAL_RUN_STATUSES = Object.freeze([
  'succeeded',
  'failed',
  'cancelled',
  'partial_failure',
]);
const TERMINAL_NODE_STATUSES = Object.freeze(['succeeded', 'failed', 'cancelled', 'skipped']);

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
  blocked: Object.freeze(['ready', 'retry_wait', 'cancelled', 'skipped']),
  ready: Object.freeze(['blocked', 'queued', 'running', 'cancelled', 'skipped']),
  queued: Object.freeze(['running', 'cancelled', 'skipped']),
  running: Object.freeze([
    'ready',
    'retry_wait',
    'waiting_approval',
    'succeeded',
    'failed',
    'cancelled',
  ]),
  retry_wait: Object.freeze(['blocked', 'ready', 'running', 'cancelled', 'skipped']),
  waiting_approval: Object.freeze(['ready', 'failed', 'cancelled']),
  succeeded: Object.freeze([]),
  failed: Object.freeze([]),
  cancelled: Object.freeze([]),
  skipped: Object.freeze([]),
});

const RUN_TRANSITIONS = Object.freeze({
  queued: Object.freeze(['running', 'waiting_approval', 'failed', 'cancel_requested', 'cancelled']),
  running: Object.freeze([
    'waiting_approval',
    'succeeded',
    'failed',
    'cancel_requested',
    'cancelled',
    'partial_failure',
  ]),
  waiting_approval: Object.freeze([
    'running',
    'failed',
    'cancel_requested',
    'cancelled',
    'partial_failure',
  ]),
  cancel_requested: Object.freeze(['cancelled']),
  succeeded: Object.freeze([]),
  failed: Object.freeze([]),
  cancelled: Object.freeze([]),
  partial_failure: Object.freeze([]),
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
