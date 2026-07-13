const { AppError } = require('./AppError');
const { ErrorCodes } = require('./errorCodes');
const { redactSecrets, redactString } = require('./redact');
const { isRetryableError } = require('./retryability');

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
