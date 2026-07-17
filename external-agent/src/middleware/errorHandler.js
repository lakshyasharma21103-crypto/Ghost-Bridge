const { RuntimeError } = require('../utils/errors');
const { safeLogPayload } = require('../utils/logger');
const { isRetryableError } = require('../utils/retryability');

const SAFE_GEMINI_OPERATIONS = new Set(['grounded_research', 'structured_formatting']);
const SAFE_GEMINI_API_MODES = new Set(['models.generateContent', 'interactions.create']);
const SAFE_GEMINI_STEP_TYPES = new Set([
  '[unavailable]',
  'code_execution_call',
  'code_execution_result',
  'file_search_call',
  'file_search_result',
  'function_call',
  'function_result',
  'google_maps_call',
  'google_maps_result',
  'google_search_call',
  'google_search_result',
  'mcp_server_tool_call',
  'mcp_server_tool_result',
  'model_output',
  'thought',
  'url_context_call',
  'url_context_result',
  'user_input',
]);
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
const SAFE_RETRY_REASONS = new Set([
  'GROUNDING_EVIDENCE_MISSING',
  'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
  'NOT_RETRYABLE',
  'PROVIDER_DEADLINE_EXCEEDED',
  'PROVIDER_UNAVAILABLE',
  'TRANSIENT_TRANSPORT_FAILURE',
]);
const SAFE_FINAL_PROVIDER_STATUSES = new Set([
  'ABORTED',
  'ALREADY_EXISTS',
  'CANCELLED',
  'DATA_LOSS',
  'DEADLINE_EXCEEDED',
  'FAILED_PRECONDITION',
  'INTERNAL',
  'INVALID_ARGUMENT',
  'LOCAL_DEADLINE_EXCEEDED',
  'NOT_FOUND',
  'OK',
  'OUT_OF_RANGE',
  'PERMISSION_DENIED',
  'RESOURCE_EXHAUSTED',
  'TRANSIENT_TRANSPORT_FAILURE',
  'UNAUTHENTICATED',
  'UNAVAILABLE',
  'UNIMPLEMENTED',
  'UNKNOWN',
]);

function safeConfiguredTimeoutMs(value) {
  return Number.isInteger(value) && value >= 1_000 && value <= 600_000 ? value : undefined;
}

function safeOperationTimeoutMs(value) {
  return Number.isInteger(value) && value >= 1_000 && value <= 1_800_000 ? value : undefined;
}

function safeAttemptDurations(value) {
  return Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 2 &&
    value.every((duration) => Number.isInteger(duration) && duration >= 0 && duration <= 600_000)
    ? value
    : undefined;
}

function safeUsageCount(value, maximum = 10_000_000) {
  return Number.isInteger(value) && value >= 0 && value <= maximum ? value : undefined;
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
            ...(SAFE_GEMINI_API_MODES.has(normalized.apiMode)
              ? { apiMode: normalized.apiMode }
              : {}),
            ...(Number.isInteger(normalized.candidateCount) && normalized.candidateCount >= 0
              ? { candidateCount: normalized.candidateCount }
              : {}),
            ...(safeUsageCount(normalized.configuredMaxOutputTokens, 8_192) !== undefined
              ? { configuredMaxOutputTokens: normalized.configuredMaxOutputTokens }
              : {}),
            ...(safeUsageCount(normalized.promptCharacterCount, 100_000) !== undefined
              ? { promptCharacterCount: normalized.promptCharacterCount }
              : {}),
            ...(safeUsageCount(normalized.promptTokenCount) !== undefined
              ? { promptTokenCount: normalized.promptTokenCount }
              : {}),
            ...(safeUsageCount(normalized.candidatesTokenCount) !== undefined
              ? { candidatesTokenCount: normalized.candidatesTokenCount }
              : {}),
            ...(safeUsageCount(normalized.thoughtsTokenCount) !== undefined
              ? { thoughtsTokenCount: normalized.thoughtsTokenCount }
              : {}),
            ...(safeUsageCount(normalized.totalTokenCount) !== undefined
              ? { totalTokenCount: normalized.totalTokenCount }
              : {}),
            ...(Array.isArray(normalized.responseStepTypes) &&
            normalized.responseStepTypes.every((type) => SAFE_GEMINI_STEP_TYPES.has(type))
              ? { responseStepTypes: normalized.responseStepTypes }
              : {}),
            ...(Number.isInteger(normalized.googleSearchCallCount) &&
            normalized.googleSearchCallCount >= 0
              ? { googleSearchCallCount: normalized.googleSearchCallCount }
              : {}),
            ...(Number.isInteger(normalized.googleSearchResultCount) &&
            normalized.googleSearchResultCount >= 0
              ? { googleSearchResultCount: normalized.googleSearchResultCount }
              : {}),
            ...(Number.isInteger(normalized.citationAnnotationCount) &&
            normalized.citationAnnotationCount >= 0
              ? { citationAnnotationCount: normalized.citationAnnotationCount }
              : {}),
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
            ...(Number.isInteger(normalized.groundingMetadataCount) &&
            normalized.groundingMetadataCount >= 0
              ? { groundingMetadataCount: normalized.groundingMetadataCount }
              : {}),
            ...(normalized.finishReason === '[unavailable]' ||
            (typeof normalized.finishReason === 'string' &&
              /^[A-Z][A-Z0-9_]{0,63}$/.test(normalized.finishReason))
              ? { finishReason: normalized.finishReason }
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
    const operationTimeoutMs =
      normalized.code === 'GEMINI_REQUEST_TIMEOUT'
        ? safeOperationTimeoutMs(normalized.operationTimeoutMs)
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
        ...(operationTimeoutMs !== undefined ? { operationTimeoutMs } : {}),
        ...(Number.isInteger(normalized.providerAttemptCount) &&
        normalized.providerAttemptCount >= 1 &&
        normalized.providerAttemptCount <= 2
          ? { providerAttemptCount: normalized.providerAttemptCount }
          : {}),
        ...(Number.isInteger(normalized.providerMaxAttempts) &&
        normalized.providerMaxAttempts >= 1 &&
        normalized.providerMaxAttempts <= 2
          ? { providerMaxAttempts: normalized.providerMaxAttempts }
          : {}),
        ...(Number.isInteger(normalized.retryDelayMs) &&
        normalized.retryDelayMs >= 0 &&
        normalized.retryDelayMs <= 10_000
          ? { retryDelayMs: normalized.retryDelayMs }
          : {}),
        ...(SAFE_RETRY_REASONS.has(normalized.retryReason)
          ? { retryReason: normalized.retryReason }
          : {}),
        ...(normalized.retryBudgetExhausted === true ? { retryBudgetExhausted: true } : {}),
        ...(Number.isInteger(normalized.researchAttemptCount) &&
        normalized.researchAttemptCount >= 1 &&
        normalized.researchAttemptCount <= 2
          ? { researchAttemptCount: normalized.researchAttemptCount }
          : {}),
        ...(safeAttemptDurations(normalized.researchAttemptDurationsMs)
          ? { researchAttemptDurationsMs: normalized.researchAttemptDurationsMs }
          : {}),
        ...(typeof normalized.fallbackResearchProfileUsed === 'boolean'
          ? { fallbackResearchProfileUsed: normalized.fallbackResearchProfileUsed }
          : {}),
        ...(typeof normalized.groundingFallbackUsed === 'boolean'
          ? { groundingFallbackUsed: normalized.groundingFallbackUsed }
          : {}),
        ...(SAFE_FINAL_PROVIDER_STATUSES.has(normalized.finalProviderStatus)
          ? { finalProviderStatus: normalized.finalProviderStatus }
          : {}),
        ...(Number.isInteger(normalized.groundingMetadataCount) &&
        normalized.groundingMetadataCount >= 0
          ? { groundingMetadataCount: normalized.groundingMetadataCount }
          : {}),
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
