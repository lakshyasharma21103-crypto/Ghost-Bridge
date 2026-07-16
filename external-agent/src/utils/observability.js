const { performance } = require('node:perf_hooks');
const { SERVICE_NAME, SERVICE_VERSION } = require('../constants');
const { logger: defaultLogger, safeLogPayload } = require('./logger');
const { isRetryableError } = require('./retryability');

const SAFE_RECOVERY_REASONS = new Set([
  'FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH',
  'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
]);
const SAFE_TIMEOUT_REASONS = new Set([
  'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
  'GEMINI_DEADLINE_EXCEEDED',
]);
const SAFE_LIFECYCLE_REASONS = Object.freeze({
  REQUEST_CANCELLED: 'CLIENT_DISCONNECTED',
  SERVICE_SHUTDOWN: 'SERVICE_SHUTDOWN',
});

function definedFields(value) {
  return Object.fromEntries(Object.entries(value || {}).filter(([, item]) => item !== undefined));
}

function safeErrorFields(error) {
  const timeoutReason =
    error?.code === 'GEMINI_REQUEST_TIMEOUT' &&
    SAFE_TIMEOUT_REASONS.has(error?.timeoutReason || error?.reason)
      ? error.timeoutReason || error.reason
      : undefined;
  const reason = SAFE_LIFECYCLE_REASONS[error?.code] === error?.reason ? error.reason : undefined;
  return definedFields({
    errorCode: error?.code || 'INTERNAL_SERVER_ERROR',
    internalCode: error?.internalCode,
    operation: error?.operation,
    statusCode: error?.statusCode,
    retryable: isRetryableError(error),
    timeoutReason,
    configuredTimeoutMs: error?.configuredTimeoutMs,
    operationTimeoutMs: error?.operationTimeoutMs,
    providerAttemptCount: error?.providerAttemptCount,
    providerMaxAttempts: error?.providerMaxAttempts,
    retryDelayMs: error?.retryDelayMs,
    retryReason: error?.retryReason,
    retryBudgetExhausted: error?.retryBudgetExhausted === true ? true : undefined,
    researchAttemptCount: error?.researchAttemptCount,
    researchAttemptDurationsMs: error?.researchAttemptDurationsMs,
    fallbackResearchProfileUsed:
      typeof error?.fallbackResearchProfileUsed === 'boolean'
        ? error.fallbackResearchProfileUsed
        : undefined,
    finalProviderStatus: error?.finalProviderStatus,
    groundingMetadataCount: error?.groundingMetadataCount,
    reason,
    recoveryRequired: error?.recoveryRequired === true ? true : undefined,
    recoveryReason:
      error?.recoveryRequired === true && SAFE_RECOVERY_REASONS.has(error?.recoveryReason)
        ? error.recoveryReason
        : undefined,
    causeCode: error?.cause?.code,
    causeName: error?.cause?.name,
  });
}

function createObserver(context = {}, activeLogger = defaultLogger) {
  const base = definedFields({
    service: SERVICE_NAME,
    environment: context.environment,
    version: SERVICE_VERSION,
    traceId: context.traceId,
    requestId: context.requestId,
    invocationId: context.invocationId,
    connectionId: context.connectionId,
  });
  function emit(level, event, fields = {}) {
    activeLogger[level](
      safeLogPayload(
        definedFields({ ...base, ...fields, event, timestamp: new Date().toISOString() }),
      ),
      event,
    );
  }
  async function stage(stageName, operation, fields = {}) {
    const startedAt = performance.now();
    emit('info', 'external_agent.stage.started', {
      ...fields,
      stage: stageName,
      status: 'started',
    });
    try {
      const result = await operation();
      emit('info', 'external_agent.stage.completed', {
        ...fields,
        stage: stageName,
        status: 'completed',
        durationMs: Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100),
      });
      return result;
    } catch (error) {
      const durationMs = Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100);
      if (!error.stage) error.stage = stageName;
      if (error.durationMs === undefined) error.durationMs = durationMs;
      emit('warn', 'external_agent.stage.failed', {
        ...fields,
        ...safeErrorFields(error),
        stage: stageName,
        status: 'failed',
        durationMs,
      });
      throw error;
    }
  }
  return { base, emit, stage };
}

module.exports = { createObserver, definedFields, safeErrorFields };
