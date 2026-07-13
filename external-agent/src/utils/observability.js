const { performance } = require('node:perf_hooks');
const { SERVICE_NAME, SERVICE_VERSION } = require('../constants');
const { logger: defaultLogger, safeLogPayload } = require('./logger');
const { isRetryableError } = require('./retryability');

function definedFields(value) {
  return Object.fromEntries(Object.entries(value || {}).filter(([, item]) => item !== undefined));
}

function safeErrorFields(error) {
  return definedFields({
    errorCode: error?.code || 'INTERNAL_SERVER_ERROR',
    internalCode: error?.internalCode,
    operation: error?.operation,
    statusCode: error?.statusCode,
    retryable: isRetryableError(error),
    timeoutReason: error?.timeoutReason || error?.reason,
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
