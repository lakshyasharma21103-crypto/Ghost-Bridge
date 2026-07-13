const OPERATION_WINDOWS = Object.freeze({
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
});

const OPERATION_STAGE_NAMES = Object.freeze([
  'connection_lookup',
  'capability_resolution',
  'policy_check',
  'credential_load',
  'request_mapping',
  'external_runtime_invocation',
  'response_validation',
  'invocation_persistence',
  'audit_persistence',
]);

const MAX_INVOCATION_STAGE_METRICS = 16;
const MAX_LATENCY_SAMPLE_SIZE = 10000;

module.exports = {
  OPERATION_WINDOWS,
  OPERATION_STAGE_NAMES,
  MAX_INVOCATION_STAGE_METRICS,
  MAX_LATENCY_SAMPLE_SIZE,
};
