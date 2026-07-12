const { RuntimeError } = require('../utils/errors');
const { safeLogPayload } = require('../utils/logger');

const SAFE_GEMINI_OPERATIONS = new Set(['grounded_research', 'structured_formatting']);
const SAFE_TIMEOUT_REASONS = new Set([
  'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
  'GEMINI_DEADLINE_EXCEEDED',
]);

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

    const sourceDiagnostics =
      normalized.code === 'GEMINI_SOURCE_EXTRACTION_FAILED'
        ? {
            ...(typeof normalized.groundingMetadataPresent === 'boolean'
              ? { groundingMetadataPresent: normalized.groundingMetadataPresent }
              : {}),
            ...(Number.isInteger(normalized.groundingChunkCount) &&
            normalized.groundingChunkCount >= 0
              ? { groundingChunkCount: normalized.groundingChunkCount }
              : {}),
            ...(Number.isInteger(normalized.webSearchQueryCount) &&
            normalized.webSearchQueryCount >= 0
              ? { webSearchQueryCount: normalized.webSearchQueryCount }
              : {}),
          }
        : {};

    response.status(normalized.statusCode).json({
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
        requestId: request.requestId,
        ...(SAFE_GEMINI_OPERATIONS.has(normalized.operation)
          ? { operation: normalized.operation }
          : {}),
        ...(SAFE_TIMEOUT_REASONS.has(normalized.reason) ? { reason: normalized.reason } : {}),
        ...sourceDiagnostics,
      },
    });
  };
}

module.exports = {
  errorHandler,
  normalizeError,
};
