const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function integerFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function integerInRangeFromEnv(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function booleanFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  return String(raw).toLowerCase() === 'true';
}

function validateEncryptionKey(raw, nodeEnv) {
  if (!raw) {
    if (nodeEnv === 'development') return '';
    throw new Error('CREDENTIAL_ENCRYPTION_KEY is required outside development.');
  }

  const trimmed = raw.trim();
  const base64Bytes = Buffer.from(trimmed, 'base64');
  const looksBase64 = /^[A-Za-z0-9+/=_-]+$/.test(trimmed);
  const looksHex = /^[a-f0-9]{64}$/i.test(trimmed);
  if (
    looksHex ||
    (looksBase64 && base64Bytes.length === 32) ||
    Buffer.byteLength(trimmed, 'utf8') >= 32
  ) {
    return trimmed;
  }

  throw new Error(
    'CREDENTIAL_ENCRYPTION_KEY must be a 32-byte base64 value, a 64-character hex value, or at least 32 UTF-8 bytes.',
  );
}

const nodeEnv = process.env.NODE_ENV || 'development';
const allowPrivateRuntimeUrlsInDev =
  nodeEnv === 'development' && booleanFromEnv('ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV', false);
const runtimeInvocationTimeoutMs = integerFromEnv('RUNTIME_INVOCATION_TIMEOUT_MS', 330_000);
const runtimeRetryMaxAttempts = integerInRangeFromEnv('RUNTIME_RETRY_MAX_ATTEMPTS', 2, 1, 5);
const runtimeRetryBaseDelayMs = integerInRangeFromEnv(
  'RUNTIME_RETRY_BASE_DELAY_MS',
  1_000,
  1,
  60_000,
);
const runtimeRetryMaxDelayMs = integerInRangeFromEnv(
  'RUNTIME_RETRY_MAX_DELAY_MS',
  10_000,
  1,
  300_000,
);
const runtimeRetryJitterPercent = integerInRangeFromEnv('RUNTIME_RETRY_JITTER_PERCENT', 20, 0, 100);
const runtimeExecutionLeaseMs = integerInRangeFromEnv(
  'RUNTIME_EXECUTION_LEASE_MS',
  Math.min(1_800_000, runtimeInvocationTimeoutMs + 30_000),
  1_000,
  1_800_000,
);
const circuitFailureWindowMs = integerInRangeFromEnv(
  'CIRCUIT_FAILURE_WINDOW_MS',
  60_000,
  1_000,
  3_600_000,
);
const circuitOpenDurationMs = integerInRangeFromEnv(
  'CIRCUIT_OPEN_DURATION_MS',
  30_000,
  1_000,
  3_600_000,
);
const runtimeMaxConcurrentPerConnection = integerInRangeFromEnv(
  'RUNTIME_MAX_CONCURRENT_PER_CONNECTION',
  3,
  1,
  100,
);
const runtimeMaxConcurrentPerWorkspace = integerInRangeFromEnv(
  'RUNTIME_MAX_CONCURRENT_PER_WORKSPACE',
  20,
  1,
  1_000,
);
const durableWorkerPollIntervalMs = integerInRangeFromEnv(
  'DURABLE_WORKER_POLL_INTERVAL_MS',
  1_000,
  100,
  60_000,
);
const durableWorkerBatchSize = integerInRangeFromEnv('DURABLE_WORKER_BATCH_SIZE', 5, 1, 100);
const durableWorkerConcurrency = integerInRangeFromEnv(
  'DURABLE_WORKER_CONCURRENCY',
  3,
  1,
  50,
);
const durableWorkLeaseMs = integerInRangeFromEnv(
  'DURABLE_WORK_LEASE_MS',
  Math.min(3_600_000, runtimeInvocationTimeoutMs + 30_000),
  1_000,
  3_600_000,
);
const durableWorkHeartbeatMs = integerInRangeFromEnv(
  'DURABLE_WORK_HEARTBEAT_MS',
  30_000,
  1_000,
  300_000,
);
const durableWorkMaxAttempts = integerInRangeFromEnv('DURABLE_WORK_MAX_ATTEMPTS', 2, 1, 10);
const durableWorkDeadLetterAfterAttempts = integerInRangeFromEnv(
  'DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS',
  3,
  1,
  20,
);

if (runtimeRetryMaxDelayMs < runtimeRetryBaseDelayMs) {
  throw new Error(
    'RUNTIME_RETRY_MAX_DELAY_MS must be greater than or equal to RUNTIME_RETRY_BASE_DELAY_MS',
  );
}

if (runtimeExecutionLeaseMs <= runtimeInvocationTimeoutMs) {
  throw new Error('RUNTIME_EXECUTION_LEASE_MS must be greater than RUNTIME_INVOCATION_TIMEOUT_MS');
}

if (runtimeMaxConcurrentPerWorkspace < runtimeMaxConcurrentPerConnection) {
  throw new Error(
    'RUNTIME_MAX_CONCURRENT_PER_WORKSPACE must be greater than or equal to RUNTIME_MAX_CONCURRENT_PER_CONNECTION',
  );
}

if (durableWorkLeaseMs <= runtimeInvocationTimeoutMs) {
  throw new Error('DURABLE_WORK_LEASE_MS must be greater than RUNTIME_INVOCATION_TIMEOUT_MS');
}

if (durableWorkHeartbeatMs * 3 > durableWorkLeaseMs) {
  throw new Error('DURABLE_WORK_HEARTBEAT_MS must be at most one third of DURABLE_WORK_LEASE_MS');
}

if (durableWorkerBatchSize < durableWorkerConcurrency) {
  throw new Error('DURABLE_WORKER_BATCH_SIZE must be greater than or equal to DURABLE_WORKER_CONCURRENCY');
}

if (durableWorkDeadLetterAfterAttempts < durableWorkMaxAttempts) {
  throw new Error(
    'DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS must be greater than or equal to DURABLE_WORK_MAX_ATTEMPTS',
  );
}

const env = {
  NODE_ENV: nodeEnv,
  PORT: integerFromEnv('PORT', 5001),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5174',
  MONGODB_URI: process.env.MONGODB_URI || '',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'agent_passport_runtime_gateway',
  MONGODB_AUTH_SOURCE: process.env.MONGODB_AUTH_SOURCE || 'admin',
  CREDENTIAL_ENCRYPTION_KEY: validateEncryptionKey(process.env.CREDENTIAL_ENCRYPTION_KEY, nodeEnv),
  DEV_PARTNER_API_KEY: process.env.DEV_PARTNER_API_KEY || '',
  DEV_PARTNER_NAME: process.env.DEV_PARTNER_NAME || 'Development Partner',
  DEV_PARTNER_SLUG: process.env.DEV_PARTNER_SLUG || 'dev-partner',
  REQUEST_BODY_LIMIT: process.env.REQUEST_BODY_LIMIT || '1mb',
  RUNTIME_REQUEST_TIMEOUT_MS: integerFromEnv('RUNTIME_REQUEST_TIMEOUT_MS', 15_000),
  RUNTIME_INVOCATION_TIMEOUT_MS: runtimeInvocationTimeoutMs,
  RUNTIME_RETRY_MAX_ATTEMPTS: runtimeRetryMaxAttempts,
  RUNTIME_RETRY_BASE_DELAY_MS: runtimeRetryBaseDelayMs,
  RUNTIME_RETRY_MAX_DELAY_MS: runtimeRetryMaxDelayMs,
  RUNTIME_RETRY_JITTER_PERCENT: runtimeRetryJitterPercent,
  RUNTIME_EXECUTION_LEASE_MS: runtimeExecutionLeaseMs,
  CIRCUIT_BREAKER_ENABLED: booleanFromEnv('CIRCUIT_BREAKER_ENABLED', true),
  CIRCUIT_FAILURE_THRESHOLD: integerInRangeFromEnv('CIRCUIT_FAILURE_THRESHOLD', 5, 1, 100),
  CIRCUIT_FAILURE_WINDOW_MS: circuitFailureWindowMs,
  CIRCUIT_OPEN_DURATION_MS: circuitOpenDurationMs,
  CIRCUIT_HALF_OPEN_MAX_PROBES: integerInRangeFromEnv('CIRCUIT_HALF_OPEN_MAX_PROBES', 1, 1, 10),
  CIRCUIT_SUCCESS_THRESHOLD_TO_CLOSE: integerInRangeFromEnv(
    'CIRCUIT_SUCCESS_THRESHOLD_TO_CLOSE',
    1,
    1,
    100,
  ),
  RUNTIME_MAX_CONCURRENT_PER_CONNECTION: runtimeMaxConcurrentPerConnection,
  RUNTIME_MAX_CONCURRENT_PER_WORKSPACE: runtimeMaxConcurrentPerWorkspace,
  SHUTDOWN_DRAIN_TIMEOUT_MS: integerInRangeFromEnv(
    'SHUTDOWN_DRAIN_TIMEOUT_MS',
    30_000,
    1_000,
    300_000,
  ),
  DURABLE_WORKER_ENABLED: booleanFromEnv('DURABLE_WORKER_ENABLED', true),
  DURABLE_WORKER_POLL_INTERVAL_MS: durableWorkerPollIntervalMs,
  DURABLE_WORKER_BATCH_SIZE: durableWorkerBatchSize,
  DURABLE_WORKER_CONCURRENCY: durableWorkerConcurrency,
  DURABLE_WORK_LEASE_MS: durableWorkLeaseMs,
  DURABLE_WORK_HEARTBEAT_MS: durableWorkHeartbeatMs,
  DURABLE_WORK_ABANDONED_GRACE_MS: integerInRangeFromEnv(
    'DURABLE_WORK_ABANDONED_GRACE_MS',
    60_000,
    1_000,
    3_600_000,
  ),
  DURABLE_WORK_MAX_ATTEMPTS: durableWorkMaxAttempts,
  DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS: durableWorkDeadLetterAfterAttempts,
  DURABLE_WORK_SHUTDOWN_DRAIN_MS: integerInRangeFromEnv(
    'DURABLE_WORK_SHUTDOWN_DRAIN_MS',
    30_000,
    1_000,
    300_000,
  ),
  INVOCATION_STUCK_SCAN_LIMIT: integerInRangeFromEnv('INVOCATION_STUCK_SCAN_LIMIT', 100, 1, 100),
  INVOCATION_STUCK_GRACE_MS: integerInRangeFromEnv(
    'INVOCATION_STUCK_GRACE_MS',
    60_000,
    1_000,
    3_600_000,
  ),
  INVOCATION_FINALIZATION_GRACE_MS: integerInRangeFromEnv(
    'INVOCATION_FINALIZATION_GRACE_MS',
    30_000,
    1_000,
    3_600_000,
  ),
  EXTERNAL_TEST_AGENT_BASE_URL: process.env.EXTERNAL_TEST_AGENT_BASE_URL || 'http://127.0.0.1:5002',
  EXTERNAL_TEST_AGENT_RUNTIME_TOKEN: process.env.EXTERNAL_TEST_AGENT_RUNTIME_TOKEN || '',
  ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV: allowPrivateRuntimeUrlsInDev,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  COOKIE_SECURE: booleanFromEnv('COOKIE_SECURE', false),
  OPS_ALERT_FAILURE_RATE_MIN_INVOCATIONS: integerFromEnv(
    'OPS_ALERT_FAILURE_RATE_MIN_INVOCATIONS',
    10,
  ),
  OPS_ALERT_FAILURE_RATE_PERCENT: integerFromEnv('OPS_ALERT_FAILURE_RATE_PERCENT', 25),
  OPS_ALERT_P95_LATENCY_MS: integerFromEnv('OPS_ALERT_P95_LATENCY_MS', 300000),
  OPS_ALERT_PROVIDER_ERROR_COUNT: integerFromEnv('OPS_ALERT_PROVIDER_ERROR_COUNT', 5),
  OPS_ALERT_INSTALL_FAILURE_PERCENT: integerFromEnv('OPS_ALERT_INSTALL_FAILURE_PERCENT', 25),
  OPS_ALERT_AUTH_FAILURE_COUNT: integerFromEnv('OPS_ALERT_AUTH_FAILURE_COUNT', 3),
  OPS_ALERT_AMBIGUOUS_OUTCOME_COUNT: integerInRangeFromEnv(
    'OPS_ALERT_AMBIGUOUS_OUTCOME_COUNT',
    3,
    1,
    10_000,
  ),
  OPS_ALERT_FINALIZATION_STALL_COUNT: integerInRangeFromEnv(
    'OPS_ALERT_FINALIZATION_STALL_COUNT',
    2,
    1,
    10_000,
  ),
  OPS_ALERT_RECOVERY_GROWTH_COUNT: integerInRangeFromEnv(
    'OPS_ALERT_RECOVERY_GROWTH_COUNT',
    5,
    1,
    10_000,
  ),
  OPS_ALERT_LEASE_EXPIRY_COUNT: integerInRangeFromEnv('OPS_ALERT_LEASE_EXPIRY_COUNT', 3, 1, 10_000),
  OPS_ALERT_RETRY_DENIAL_COUNT: integerInRangeFromEnv('OPS_ALERT_RETRY_DENIAL_COUNT', 3, 1, 10_000),
  OPS_ALERT_STUCK_INVOCATION_COUNT: integerInRangeFromEnv(
    'OPS_ALERT_STUCK_INVOCATION_COUNT',
    3,
    1,
    10_000,
  ),
};

if (!['development', 'test', 'production'].includes(env.NODE_ENV)) {
  throw new Error('NODE_ENV must be development, test, or production');
}

if (env.NODE_ENV === 'production' && !env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required in production');
}

module.exports = {
  booleanFromEnv,
  env,
  integerFromEnv,
  integerInRangeFromEnv,
};
