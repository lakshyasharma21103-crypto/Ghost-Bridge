const { RuntimeError } = require('../utils/errors');
const { safeLogPayload } = require('../utils/logger');
const { isRetryableError } = require('../utils/retryability');

const SAFE_GEMINI_OPERATIONS = new Set(['grounded_research', 'structured_formatting']);
const SAFE_TIMEOUT_REASONS = new Set([
  'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
  'GEMINI_DEADLINE_EXCEEDED',
]);
const SAFE_RECOVERY_REASONS = new Set([
  'FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH',
  'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
]);
const SAFE_LIFECYCLE_REASONS = Object.freeze({
  REQUEST_CANCELLED: 'CLIENT_DISCONNECTED',
  SERVICE_SHUTDOWN: 'SERVICE_SHUTDOWN',
});

function safeConfiguredTimeoutMs(value) {
  return Number.isInteger(value) && value >= 1_000 && value <= 600_000 ? value : undefined;
}

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
      if (!response.destroyed && !response.writableEnded) response.end();
      return;
    }

    const normalized = normalizeError(error);
    normalized.retryable = isRetryableError(normalized);
    request.observer?.emit('error', 'request.failed', {
      status: 'failed',
      statusCode: normalized.statusCode,
      errorCode: normalized.code,
      stage: normalized.stage,
      retryable: normalized.retryable,
    });
    if (!(error instanceof RuntimeError) || normalized.statusCode >= 500) {
      logger.error(
        {
          requestId: request.requestId,
          traceId: request.traceId,
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
    const recoveryReason =
      normalized.recoveryRequired === true && SAFE_RECOVERY_REASONS.has(normalized.recoveryReason)
        ? normalized.recoveryReason
        : undefined;
    const timeoutReason =
      normalized.code === 'GEMINI_REQUEST_TIMEOUT' &&
      SAFE_TIMEOUT_REASONS.has(normalized.timeoutReason || normalized.reason)
        ? normalized.timeoutReason || normalized.reason
        : undefined;
    const configuredTimeoutMs =
      normalized.code === 'GEMINI_REQUEST_TIMEOUT'
        ? safeConfiguredTimeoutMs(normalized.configuredTimeoutMs)
        : undefined;
    const lifecycleReason =
      SAFE_LIFECYCLE_REASONS[normalized.code] === normalized.reason ? normalized.reason : undefined;

    if (
      response.destroyed === true ||
      response.writableEnded === true ||
      response.writable === false
    ) {
      return;
    }

    response.status(normalized.statusCode).json({
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
        traceId: request.traceId,
        requestId: request.requestId,
        retryable: normalized.retryable,
        ...(normalized.stage ? { stage: normalized.stage } : {}),
        ...(SAFE_GEMINI_OPERATIONS.has(normalized.operation)
          ? { operation: normalized.operation }
          : {}),
        ...(timeoutReason ? { reason: timeoutReason, timeoutReason } : {}),
        ...(lifecycleReason ? { reason: lifecycleReason } : {}),
        ...(configuredTimeoutMs !== undefined ? { configuredTimeoutMs } : {}),
        ...(recoveryReason ? { recoveryRequired: true, recoveryReason } : {}),
        ...(Number.isInteger(normalized.retryAfterMs) && normalized.retryAfterMs >= 0
          ? { retryAfterMs: normalized.retryAfterMs }
          : {}),
        ...sourceDiagnostics,
      },
    });
  };
}

module.exports = {
  errorHandler,
  normalizeError,
};
