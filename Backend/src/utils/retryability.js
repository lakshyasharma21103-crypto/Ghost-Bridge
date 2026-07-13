const RETRYABLE_CODES = new Set([
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

const NON_RETRYABLE_CODES = new Set([
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
  'CAPABILITY_INPUT_INVALID',
  'CAPABILITY_SCHEMA_INVALID',
  'RUNTIME_OUTPUT_INVALID',
  'RUNTIME_OUTPUT_MISSING',
  'INSTALL_KEY_INVALID',
  'INSTALL_KEY_USED',
  'INSTALL_KEY_ALREADY_USED',
  'INSTALL_KEY_EXPIRED',
  'INSTALL_KEY_REVOKED',
  'RUNTIME_CONFIGURATION_INVALID',
]);

function statusOf(error) {
  for (const value of [
    error?.providerHttpStatus,
    error?.remoteStatus,
    error?.statusCode,
    error?.status,
  ]) {
    const status = Number(value);
    if (Number.isInteger(status) && status >= 100 && status <= 599) return status;
  }
  return undefined;
}

function isRetryableError(error) {
  const code = String(error?.code || error?.cause?.code || '').toUpperCase();
  if (NON_RETRYABLE_CODES.has(code)) return false;
  if (RETRYABLE_CODES.has(code)) return true;
  const status = statusOf(error);
  if (status === 429 || [502, 503, 504].includes(status)) return true;
  if (status && status >= 400 && status < 500) return false;
  return /Mongo(Network|ServerSelection|Timeout)Error/i.test(
    `${String(error?.name || '')} ${String(error?.cause?.name || '')}`,
  );
}

module.exports = { isRetryableError, statusOf };
