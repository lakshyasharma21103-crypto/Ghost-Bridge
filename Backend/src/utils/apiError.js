const { AppError } = require('./AppError');
const { ErrorCodes } = require('./errorCodes');
const { redactSecrets, redactString } = require('./redact');
const { isRetryableError } = require('./retryability');

const SAFE_GEMINI_OPERATIONS = new Set(['grounded_research', 'structured_formatting']);
const SAFE_TIMEOUT_REASONS = new Set([
  'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
  'GEMINI_DEADLINE_EXCEEDED',
]);

function safeConfiguredTimeoutMs(value) {
  return Number.isInteger(value) && value >= 1_000 && value <= 600_000 ? value : undefined;
}

function normalizeDetails(details) {
  if (details == null) return [];
  return Array.isArray(details) ? details : [details];
}

function normalizeError(error) {
  if (error instanceof AppError) return error;
  if (error?.type === 'entity.parse.failed') {
    return new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request body must be valid JSON.');
  }
  return new AppError(500, ErrorCodes.INTERNAL_SERVER_ERROR, 'An unexpected error occurred');
}

function toApiErrorResponse(error, identifiers = {}) {
  const context = typeof identifiers === 'string' ? { requestId: identifiers } : identifiers;
  const appError = normalizeError(error);
  appError.retryable = isRetryableError(appError);
  const isGeminiTimeout = appError.code === 'GEMINI_REQUEST_TIMEOUT';
  const timeoutReason =
    isGeminiTimeout && SAFE_TIMEOUT_REASONS.has(appError.timeoutReason || appError.reason)
      ? appError.timeoutReason || appError.reason
      : undefined;
  const configuredTimeoutMs = isGeminiTimeout
    ? safeConfiguredTimeoutMs(appError.configuredTimeoutMs)
    : undefined;
  return {
    statusCode: appError.statusCode,
    body: {
      success: false,
      error: {
        code: appError.code,
        message: redactString(appError.message),
        details: redactSecrets(normalizeDetails(appError.details)),
        ...(context.traceId ? { traceId: redactString(context.traceId) } : {}),
        ...(context.requestId ? { requestId: redactString(context.requestId) } : {}),
        retryable: appError.retryable,
        ...(appError.invocationId ? { invocationId: redactString(appError.invocationId) } : {}),
        ...(appError.lifecycleState
          ? { lifecycleState: redactString(appError.lifecycleState) }
          : {}),
        ...(Number.isInteger(appError.attemptCount) ? { attemptCount: appError.attemptCount } : {}),
        ...(appError.retryState ? { retryState: redactString(appError.retryState) } : {}),
        ...(appError.retryReason ? { retryReason: redactString(appError.retryReason) } : {}),
        ...(appError.recoveryRequired === true ? { recoveryRequired: true } : {}),
        ...(appError.connectionId ? { connectionId: redactString(appError.connectionId) } : {}),
        ...(Number.isInteger(appError.retryAfterMs) && appError.retryAfterMs >= 0
          ? { retryAfterMs: appError.retryAfterMs }
          : {}),
        ...(isGeminiTimeout && SAFE_GEMINI_OPERATIONS.has(appError.operation)
          ? { operation: appError.operation }
          : {}),
        ...(timeoutReason ? { timeoutReason } : {}),
        ...(configuredTimeoutMs !== undefined ? { configuredTimeoutMs } : {}),
        ...(['closed', 'open', 'half_open'].includes(appError.circuitState)
          ? { circuitState: appError.circuitState }
          : {}),
        ...(appError.reasonCode ? { reasonCode: redactString(appError.reasonCode) } : {}),
      },
    },
    appError,
  };
}

module.exports = {
  normalizeDetails,
  normalizeError,
  toApiErrorResponse,
};
