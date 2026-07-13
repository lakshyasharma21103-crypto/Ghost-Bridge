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
  RUNTIME_INVOCATION_TIMEOUT_MS: integerFromEnv('RUNTIME_INVOCATION_TIMEOUT_MS', 330_000),
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
};

if (!['development', 'test', 'production'].includes(env.NODE_ENV)) {
  throw new Error('NODE_ENV must be development, test, or production');
}

if (env.NODE_ENV === 'production' && !env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required in production');
}

module.exports = {
  env,
};
