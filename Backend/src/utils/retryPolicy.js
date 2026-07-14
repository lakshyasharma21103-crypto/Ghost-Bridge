const { env } = require('../config/env');
const { isRetryableError, statusOf } = require('./retryability');

const RetryDecisionReasons = Object.freeze({
  AUTHENTICATION_FAILURE: 'AUTHENTICATION_FAILURE',
  CAPABILITY_RETRY_NOT_ENABLED: 'CAPABILITY_RETRY_NOT_ENABLED',
  CLIENT_IDEMPOTENCY_NOT_PROVIDED: 'CLIENT_IDEMPOTENCY_NOT_PROVIDED',
  CONNECTION_CREATION_NOT_RETRYABLE: 'CONNECTION_CREATION_NOT_RETRYABLE',
  CREDENTIAL_FAILURE: 'CREDENTIAL_FAILURE',
  GROUNDED_RESEARCH_NOT_AUTOMATICALLY_RETRIED: 'GROUNDED_RESEARCH_NOT_AUTOMATICALLY_RETRIED',
  INSTALL_KEY_OPERATION_NOT_RETRYABLE: 'INSTALL_KEY_OPERATION_NOT_RETRYABLE',
  MALFORMED_PROVIDER_RESPONSE: 'MALFORMED_PROVIDER_RESPONSE',
  MAX_ATTEMPTS_REACHED: 'MAX_ATTEMPTS_REACHED',
  NON_RETRYABLE_ERROR: 'NON_RETRYABLE_ERROR',
  POLICY_DENIAL: 'POLICY_DENIAL',
  REMOTE_IDEMPOTENCY_NOT_CONFIRMED: 'REMOTE_IDEMPOTENCY_NOT_CONFIRMED',
  RETRY_SAFETY_NOT_PROVEN: 'RETRY_SAFETY_NOT_PROVEN',
  SCHEMA_VALIDATION_FAILURE: 'SCHEMA_VALIDATION_FAILURE',
  SOURCE_EXTRACTION_FAILURE: 'SOURCE_EXTRACTION_FAILURE',
  TRANSIENT_FAILURE_NOT_CONFIRMED: 'TRANSIENT_FAILURE_NOT_CONFIRMED',
  TRANSIENT_IDEMPOTENT_FAILURE: 'TRANSIENT_IDEMPOTENT_FAILURE',
  UNSAFE_URL: 'UNSAFE_URL',
});

const AUTHENTICATION_CODES = new Set([
  'AUTHENTICATION_REQUIRED',
  'RUNTIME_AUTHENTICATION_FAILED',
  'GEMINI_AUTHENTICATION_FAILED',
]);
const POLICY_CODES = new Set(['FORBIDDEN', 'POLICY_DENIED', 'CAPABILITY_DISABLED']);
const SCHEMA_CODES = new Set([
  'VALIDATION_ERROR',
  'CAPABILITY_INPUT_INVALID',
  'CAPABILITY_SCHEMA_INVALID',
]);
const MALFORMED_RESPONSE_CODES = new Set([
  'RUNTIME_OUTPUT_INVALID',
  'RUNTIME_OUTPUT_MISSING',
  'GEMINI_INVALID_STRUCTURED_OUTPUT',
]);
const CREDENTIAL_CODES = new Set([
  'CREDENTIAL_REQUIRED',
  'CREDENTIAL_EXPIRED',
  'CREDENTIAL_VALIDATION_FAILED',
  'ENCRYPTION_CONFIGURATION_INVALID',
]);
const SOURCE_EXTRACTION_CODES = new Set([
  'GEMINI_SOURCE_EXTRACTION_FAILED',
  'GEMINI_GROUNDING_METADATA_MISSING',
  'GEMINI_SOURCE_PARSING_FAILED',
]);
const TRANSIENT_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'SAFE_FETCH_TIMEOUT',
  'SAFE_FETCH_FAILED',
  'GEMINI_RATE_LIMITED',
  'GEMINI_REQUEST_TIMEOUT',
  'GEMINI_UPSTREAM_UNAVAILABLE',
]);
const IDEMPOTENT_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SAFE_RETRY_OPERATIONS = new Set([
  'database_read',
  'connection_health_check',
  'passport_metadata_retrieval',
  'provider_readiness_check',
]);

function denied(reason) {
  return { allowed: false, reason, delayMs: null, nextAttemptNumber: null };
}

function retryConfiguration(overrides = {}) {
  const configuration = {
    maxAttempts: overrides.maxAttempts ?? env.RUNTIME_RETRY_MAX_ATTEMPTS,
    baseDelayMs: overrides.baseDelayMs ?? env.RUNTIME_RETRY_BASE_DELAY_MS,
    maxDelayMs: overrides.maxDelayMs ?? env.RUNTIME_RETRY_MAX_DELAY_MS,
    jitterPercent: overrides.jitterPercent ?? env.RUNTIME_RETRY_JITTER_PERCENT,
  };
  if (!Number.isInteger(configuration.maxAttempts) || configuration.maxAttempts < 1) {
    throw new TypeError('maxAttempts must be a positive integer.');
  }
  if (!Number.isInteger(configuration.baseDelayMs) || configuration.baseDelayMs < 1) {
    throw new TypeError('baseDelayMs must be a positive integer.');
  }
  if (
    !Number.isInteger(configuration.maxDelayMs) ||
    configuration.maxDelayMs < configuration.baseDelayMs
  ) {
    throw new TypeError('maxDelayMs must be an integer greater than or equal to baseDelayMs.');
  }
  if (
    !Number.isInteger(configuration.jitterPercent) ||
    configuration.jitterPercent < 0 ||
    configuration.jitterPercent > 100
  ) {
    throw new TypeError('jitterPercent must be an integer between 0 and 100.');
  }
  return configuration;
}

function boundedBackoffDelay(attemptNumber, options = {}) {
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new TypeError('attemptNumber must be a positive integer.');
  }
  const configuration = retryConfiguration(options);
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const randomValue = Math.min(1, Math.max(0, Number(random())));
  const exponentialDelay = Math.min(
    configuration.maxDelayMs,
    configuration.baseDelayMs * 2 ** Math.max(0, attemptNumber - 1),
  );
  const jitterRange = exponentialDelay * (configuration.jitterPercent / 100);
  const jitteredDelay = exponentialDelay - jitterRange + randomValue * jitterRange * 2;
  return Math.max(0, Math.min(configuration.maxDelayMs, Math.round(jitteredDelay)));
}

function normalizedErrorCode(input) {
  return String(input?.errorCode || input?.code || '')
    .trim()
    .toUpperCase();
}

function explicitCapabilityRetryAllowed(policy) {
  return (
    policy === true ||
    policy === 'allow' ||
    policy === 'idempotent' ||
    policy?.automaticRetry === true
  );
}

function transientFailureConfirmed(input, errorCode, providerHttpStatus) {
  if (TRANSIENT_CODES.has(errorCode)) return true;
  if ([429, 502, 503, 504].includes(providerHttpStatus)) return true;
  return /^Mongo(?:Network|ServerSelection|Timeout)Error$/i.test(String(input?.errorName || ''));
}

function retryPolicyDecision(input = {}, options = {}) {
  const configuration = retryConfiguration(options);
  const attemptNumber = Number(input.attemptNumber || 1);
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new TypeError('attemptNumber must be a positive integer.');
  }
  if (attemptNumber >= configuration.maxAttempts) {
    return denied(RetryDecisionReasons.MAX_ATTEMPTS_REACHED);
  }

  const errorCode = normalizedErrorCode(input);
  const operation = String(input.operation || '')
    .trim()
    .toLowerCase();
  const method = String(input.httpMethod || input.method || '')
    .trim()
    .toUpperCase();
  const providerHttpStatus = statusOf({
    providerHttpStatus: input.providerHttpStatus,
    statusCode: input.statusCode,
  });

  if (AUTHENTICATION_CODES.has(errorCode)) {
    return denied(RetryDecisionReasons.AUTHENTICATION_FAILURE);
  }
  if (POLICY_CODES.has(errorCode)) return denied(RetryDecisionReasons.POLICY_DENIAL);
  if (SCHEMA_CODES.has(errorCode)) {
    return denied(RetryDecisionReasons.SCHEMA_VALIDATION_FAILURE);
  }
  if (MALFORMED_RESPONSE_CODES.has(errorCode)) {
    return denied(RetryDecisionReasons.MALFORMED_PROVIDER_RESPONSE);
  }
  if (CREDENTIAL_CODES.has(errorCode)) return denied(RetryDecisionReasons.CREDENTIAL_FAILURE);
  if (SOURCE_EXTRACTION_CODES.has(errorCode)) {
    return denied(RetryDecisionReasons.SOURCE_EXTRACTION_FAILURE);
  }
  if (errorCode === 'UNSAFE_URL') return denied(RetryDecisionReasons.UNSAFE_URL);
  if (errorCode.startsWith('INSTALL_KEY_') || operation.includes('install_key')) {
    return denied(RetryDecisionReasons.INSTALL_KEY_OPERATION_NOT_RETRYABLE);
  }
  if (operation === 'connection_creation') {
    return denied(RetryDecisionReasons.CONNECTION_CREATION_NOT_RETRYABLE);
  }
  if (operation === 'grounded_research') {
    return denied(RetryDecisionReasons.GROUNDED_RESEARCH_NOT_AUTOMATICALLY_RETRIED);
  }

  const classifiedRetryable =
    input.retryable === true ||
    (input.retryable === undefined &&
      isRetryableError({
        code: errorCode,
        providerHttpStatus,
        name: input.errorName,
      }));
  if (!classifiedRetryable) return denied(RetryDecisionReasons.NON_RETRYABLE_ERROR);
  if (!transientFailureConfirmed(input, errorCode, providerHttpStatus)) {
    return denied(RetryDecisionReasons.TRANSIENT_FAILURE_NOT_CONFIRMED);
  }

  const explicitlyIdempotentRead =
    IDEMPOTENT_HTTP_METHODS.has(method) || SAFE_RETRY_OPERATIONS.has(operation);
  const runtimeInvocation = operation === 'runtime_invocation';
  const mayCreateExternalSideEffects =
    input.mayCreateExternalSideEffects ?? (runtimeInvocation || !explicitlyIdempotentRead);

  if (runtimeInvocation && !explicitCapabilityRetryAllowed(input.capabilityRetryPolicy)) {
    return denied(RetryDecisionReasons.CAPABILITY_RETRY_NOT_ENABLED);
  }
  if (mayCreateExternalSideEffects && input.clientIdempotencyProvided !== true) {
    return denied(RetryDecisionReasons.CLIENT_IDEMPOTENCY_NOT_PROVIDED);
  }
  if (
    mayCreateExternalSideEffects &&
    (input.idempotencySupported !== true || input.remoteIdempotencyAcknowledged !== true)
  ) {
    return denied(RetryDecisionReasons.REMOTE_IDEMPOTENCY_NOT_CONFIRMED);
  }
  if (!explicitlyIdempotentRead && !mayCreateExternalSideEffects) {
    return denied(RetryDecisionReasons.RETRY_SAFETY_NOT_PROVEN);
  }

  return {
    allowed: true,
    reason: RetryDecisionReasons.TRANSIENT_IDEMPOTENT_FAILURE,
    delayMs: boundedBackoffDelay(attemptNumber, { ...configuration, random: options.random }),
    nextAttemptNumber: attemptNumber + 1,
  };
}

module.exports = {
  RetryDecisionReasons,
  boundedBackoffDelay,
  retryConfiguration,
  retryPolicyDecision,
};
