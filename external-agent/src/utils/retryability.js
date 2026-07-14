const RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'GEMINI_RATE_LIMITED',
  'GEMINI_REQUEST_TIMEOUT',
  'GEMINI_UPSTREAM_UNAVAILABLE',
]);
const NON_RETRYABLE_CODES = new Set([
  'RUNTIME_AUTHENTICATION_FAILED',
  'VALIDATION_ERROR',
  'INVALID_JSON',
  'GEMINI_AUTHENTICATION_FAILED',
  'GEMINI_CONFIGURATION_ERROR',
  'GEMINI_WEB_SEARCH_FAILED',
  'GEMINI_UNKNOWN_ERROR',
  'GEMINI_RESPONSE_BLOCKED',
  'GEMINI_INVALID_STRUCTURED_OUTPUT',
  'GEMINI_SOURCE_EXTRACTION_FAILED',
]);

function isRetryableError(error) {
  const code = String(error?.code || error?.cause?.code || '').toUpperCase();
  if (NON_RETRYABLE_CODES.has(code)) return false;
  if (RETRYABLE_CODES.has(code)) return true;
  const status = Number(error?.providerHttpStatus ?? error?.statusCode ?? error?.status);
  if (status === 429 || [502, 503, 504].includes(status)) return true;
  if (status >= 400 && status < 500) return false;
  return false;
}

module.exports = { isRetryableError };
