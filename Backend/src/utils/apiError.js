const { AppError } = require('./AppError');
const { ErrorCodes } = require('./errorCodes');
const { redactSecrets, redactString } = require('./redact');

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

function toApiErrorResponse(error, requestId) {
  const appError = normalizeError(error);
  return {
    statusCode: appError.statusCode,
    body: {
      success: false,
      error: {
        code: appError.code,
        message: redactString(appError.message),
        details: redactSecrets(normalizeDetails(appError.details)),
        ...(requestId ? { requestId: redactString(requestId) } : {}),
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
