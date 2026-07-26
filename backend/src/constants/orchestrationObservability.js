const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const TIMELINE_EVENT_CATEGORIES = Object.freeze([
  'lifecycle',
  'scheduling',
  'execution',
  'policy',
  'approval',
  'selection',
  'delegation',
  'retry',
  'cancellation',
  'recovery',
  'compensation',
  'intervention',
  'checkpoint',
  'incident',
  'operational',
]);

const TRACE_SPAN_TYPES = Object.freeze([
  'orchestration_run',
  'node_execution',
  'gateway_invocation',
  'agent_selection',
  'delegation',
  'policy_evaluation',
  'approval_wait',
  'retry_wait',
  'recovery',
  'compensation',
  'checkpoint',
  'operator_action',
]);

const TRACE_ANOMALY_CODES = Object.freeze([
  'TRACE_PARENT_MISSING',
  'TRACE_CYCLE_DETECTED',
  'TRACE_TENANT_MISMATCH',
  'TRACE_RUN_MISMATCH',
  'TRACE_DUPLICATE_LOGICAL_ROOT',
  'TRACE_SPAN_SEQUENCE_INVALID',
  'TRACE_REPLAY_LINK_MISSING',
  'TRACE_IDENTIFIER_INVALID',
]);

const RUN_HEALTH_CATEGORIES = Object.freeze([
  'healthy',
  'delayed',
  'degraded',
  'stuck',
  'waiting',
  'recovering',
  'terminal',
]);

const STUCK_RUN_REASON_CODES = Object.freeze([
  'RUN_NO_PROGRESS',
  'NODE_LEASE_EXPIRED',
  'QUEUE_WAIT_EXCEEDED',
  'RETRY_SCHEDULE_MISSED',
  'APPROVAL_DEADLINE_EXCEEDED',
  'INTERVENTION_DEADLINE_EXCEEDED',
  'COMPENSATION_HEARTBEAT_MISSING',
  'RECOVERY_DEADLINE_EXCEEDED',
  'CANCELLATION_NOT_COMPLETED',
  'TERMINATION_NOT_COMPLETED',
  'STATE_INCONSISTENCY_DETECTED',
]);

const BOTTLENECK_CATEGORIES = Object.freeze([
  'queue_congestion',
  'worker_saturation',
  'slow_runtime_gateway_invocation',
  'repeated_retries',
  'rate_limit_pressure',
  'circuit_breaker_pressure',
  'approval_delay',
  'intervention_delay',
  'agent_selection_delay',
  'data_contract_processing_delay',
  'compensation_delay',
  'checkpoint_validation_delay',
  'policy_evaluation_delay',
  'unhealthy_connection_concentration',
]);

const BOTTLENECK_CONFIDENCE = Object.freeze(['confirmed', 'likely', 'possible']);

const SLO_POLICY_STATUSES = Object.freeze(['draft', 'active', 'archived']);
const SLO_EVALUATION_STATUSES = Object.freeze([
  'healthy',
  'at_risk',
  'breached',
  'insufficient_data',
]);
const SLO_EVALUATION_WINDOWS = Object.freeze([
  'rolling_1h',
  'rolling_24h',
  'rolling_7d',
  'rolling_30d',
]);

const ALERT_RULE_STATUSES = Object.freeze(['draft', 'active', 'muted', 'archived']);
const ALERT_STATUSES = Object.freeze(['open', 'acknowledged', 'suppressed', 'resolved']);
const ALERT_SIGNAL_TYPES = Object.freeze([
  'slo_breach',
  'error_budget_burn',
  'stuck_runs',
  'queue_congestion',
  'worker_unhealthy',
  'compensation_failure',
  'recovery_failure',
  'high_retry_rate',
  'circuit_open',
  'rate_limit_pressure',
  'approval_backlog',
  'intervention_backlog',
  'security_anomaly',
]);
const ALERT_SEVERITIES = Object.freeze(['info', 'warning', 'high', 'critical']);
const ALERT_COMPARISONS = Object.freeze([
  'greater_than',
  'greater_than_or_equal',
  'less_than',
  'less_than_or_equal',
  'equals',
]);

const FLEET_CONTROL_SCOPE_TYPES = Object.freeze([
  'workspace',
  'definition',
  'connection',
  'workers',
]);
const FLEET_CONTROL_STATUSES = Object.freeze([
  'active',
  'paused',
  'draining',
  'quarantined',
  'released',
]);
const FLEET_CONTROL_ACTIONS = Object.freeze([
  'pause_workspace',
  'resume_workspace',
  'drain_workers',
  'resume_workers',
  'pause_definition',
  'resume_definition',
  'quarantine_connection',
  'unquarantine_connection',
]);

const DIAGNOSTIC_EXPORT_STATUSES = Object.freeze([
  'created',
  'downloaded',
  'expired',
  'deleted',
]);

const OBSERVABILITY_LIMITS = Object.freeze({
  maximumListLimit: 200,
  maximumExportRecords: 500,
  maximumSafeSummaryLength: 1000,
  maximumRetentionDays: 365,
  minimumRetentionDays: 1,
  maximumSloDurationMs: 30 * 24 * 60 * 60 * 1000,
  minimumSloDurationMs: 1,
  maximumSuppressionWindowMs: 30 * 24 * 60 * 60 * 1000,
  defaultQueueSloMs: 5 * 60 * 1000,
  defaultNoProgressMs: 15 * 60 * 1000,
  defaultLeaseToleranceMs: 60 * 1000,
  defaultHeartbeatStaleMs: 5 * 60 * 1000,
});

const BOUNDED_METRIC_LABELS = Object.freeze([
  'status',
  'outcome',
  'reason',
  'category',
  'operation',
  'severity',
  'signal',
  'health',
  'window',
]);

function safeCode(value, fallback = 'UNKNOWN_SAFE_REASON') {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128);
  if (SAFE_CODE_PATTERN.test(normalized)) return normalized;
  return fallback;
}

function safeIdentifier(value) {
  const text = String(value || '').trim().slice(0, 128);
  return SAFE_IDENTIFIER_PATTERN.test(text) ? text : '';
}

function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.trunc(number)));
}

function basisPoints(numerator, denominator) {
  const total = Number(denominator);
  if (!Number.isFinite(total) || total <= 0) return 0;
  return boundedInteger((Number(numerator || 0) / total) * 10000, 0, 0, 10000);
}

function windowDurationMs(windowKey) {
  return {
    rolling_1h: 60 * 60 * 1000,
    rolling_24h: 24 * 60 * 60 * 1000,
    rolling_7d: 7 * 24 * 60 * 60 * 1000,
    rolling_30d: 30 * 24 * 60 * 60 * 1000,
  }[windowKey] || 24 * 60 * 60 * 1000;
}

module.exports = {
  ALERT_COMPARISONS,
  ALERT_RULE_STATUSES,
  ALERT_SEVERITIES,
  ALERT_SIGNAL_TYPES,
  ALERT_STATUSES,
  BOTTLENECK_CATEGORIES,
  BOTTLENECK_CONFIDENCE,
  BOUNDED_METRIC_LABELS,
  DIAGNOSTIC_EXPORT_STATUSES,
  FLEET_CONTROL_ACTIONS,
  FLEET_CONTROL_SCOPE_TYPES,
  FLEET_CONTROL_STATUSES,
  OBSERVABILITY_LIMITS,
  RUN_HEALTH_CATEGORIES,
  SAFE_CODE_PATTERN,
  SAFE_IDENTIFIER_PATTERN,
  SLO_EVALUATION_STATUSES,
  SLO_EVALUATION_WINDOWS,
  SLO_POLICY_STATUSES,
  STUCK_RUN_REASON_CODES,
  TIMELINE_EVENT_CATEGORIES,
  TRACE_ANOMALY_CODES,
  TRACE_SPAN_TYPES,
  basisPoints,
  boundedInteger,
  safeCode,
  safeIdentifier,
  windowDurationMs,
};
