const { statusOf } = require('./retryability');

const EXCLUDED_CODES = new Set([
  'VALIDATION_ERROR',
  'CAPABILITY_INPUT_INVALID',
  'CAPABILITY_SCHEMA_INVALID',
  'POLICY_DENIED',
  'FORBIDDEN',
  'AUTHENTICATION_REQUIRED',
  'RUNTIME_AUTHENTICATION_FAILED',
  'INSTALL_KEY_INVALID',
  'INSTALL_KEY_ALREADY_USED',
  'INSTALL_KEY_EXPIRED',
  'INSTALL_KEY_REVOKED',
  'CREDENTIAL_REQUIRED',
  'CREDENTIAL_EXPIRED',
  'CREDENTIAL_VALIDATION_FAILED',
  'ENCRYPTION_CONFIGURATION_INVALID',
  'CAPABILITY_DISABLED',
  'CAPABILITY_NOT_FOUND',
  'IDEMPOTENCY_CONFLICT',
  'IDEMPOTENCY_KEY_INVALID',
  'UNSAFE_URL',
  'CONNECTION_DISABLED',
  'SERVICE_DRAINING',
  'SHUTDOWN_INTERRUPTED_INVOCATION',
  'CANCELLED',
  'ABORT_ERR',
]);
const NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'SAFE_FETCH_TIMEOUT',
  'SAFE_FETCH_FAILED',
  'GEMINI_REQUEST_TIMEOUT',
  'GEMINI_UPSTREAM_UNAVAILABLE',
  'RUNTIME_UNAVAILABLE',
  'RUNTIME_READINESS_FAILED',
]);
const MALFORMED_RUNTIME_CODES = new Set([
  'RUNTIME_OUTPUT_INVALID',
  'RUNTIME_OUTPUT_MISSING',
  'GEMINI_INVALID_STRUCTURED_OUTPUT',
]);

function safeCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function classifyCircuitFailure(errorMetadata = {}) {
  const errorCode = safeCode(errorMetadata.errorCode || errorMetadata.code);
  const providerHttpStatus = statusOf(errorMetadata);

  if (providerHttpStatus === 429 || errorCode === 'GEMINI_RATE_LIMITED') {
    return {
      countsTowardCircuit: false,
      rateLimited: true,
      category: 'RATE_LIMITED',
      weight: 0,
      reason: 'PROVIDER_429',
    };
  }
  if (EXCLUDED_CODES.has(errorCode) || errorCode.startsWith('INSTALL_KEY_')) {
    return {
      countsTowardCircuit: false,
      rateLimited: false,
      category: 'CALLER_OR_LOCAL_FAILURE',
      weight: 0,
      reason: errorCode || 'NON_RUNTIME_FAILURE',
    };
  }
  if ([502, 503, 504].includes(providerHttpStatus)) {
    return {
      countsTowardCircuit: true,
      rateLimited: false,
      category: 'UPSTREAM_UNAVAILABLE',
      weight: 1,
      reason: `PROVIDER_${providerHttpStatus}`,
    };
  }
  if (NETWORK_CODES.has(errorCode)) {
    return {
      countsTowardCircuit: true,
      rateLimited: false,
      category: errorCode.includes('TIMEOUT') ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
      weight: 1,
      reason: errorCode,
    };
  }
  if (MALFORMED_RUNTIME_CODES.has(errorCode)) {
    return {
      countsTowardCircuit: true,
      rateLimited: false,
      category: 'MALFORMED_RUNTIME_RESPONSE',
      weight: 1,
      reason: errorCode,
    };
  }
  return {
    countsTowardCircuit: false,
    rateLimited: false,
    category: 'UNCLASSIFIED_FAILURE',
    weight: 0,
    reason: errorCode || 'UNCLASSIFIED_FAILURE',
  };
}

module.exports = { classifyCircuitFailure };
