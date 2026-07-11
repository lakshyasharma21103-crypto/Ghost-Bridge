const { RuntimeError } = require('../utils/errors');
const { safeLogPayload } = require('../utils/logger');

function normalizeError(error) {
  if (error instanceof RuntimeError) return error;
  if (error?.type === 'entity.too.large') {
    return new RuntimeError(413, 'PAYLOAD_TOO_LARGE', 'Request payload is too large.');
  }
  if (error?.type === 'entity.parse.failed') {
    return new RuntimeError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
  return new RuntimeError(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred.');
}

function errorHandler(logger) {
  return function handleError(error, request, response, _next) {
    if (response.headersSent) {
      response.end();
      return;
    }

    const normalized = normalizeError(error);
    if (!(error instanceof RuntimeError) || normalized.statusCode >= 500) {
      logger.error(
        {
          requestId: request.requestId,
          error: safeLogPayload(error),
        },
        'External agent request failed',
      );
    }

    if (normalized.code === 'RUNTIME_AUTHENTICATION_FAILED') {
      response.setHeader('WWW-Authenticate', 'Bearer realm="external-research-agent"');
    }

    response.status(normalized.statusCode).json({
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
        requestId: request.requestId,
      },
    });
  };
}

module.exports = {
  errorHandler,
  normalizeError,
};
