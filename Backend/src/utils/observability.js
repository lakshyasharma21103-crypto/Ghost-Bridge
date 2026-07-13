const { performance } = require('node:perf_hooks');
const { env } = require('../config/env');
const { logger: defaultLogger, safeLogPayload } = require('./logger');
const { isRetryableError } = require('./retryability');

const SERVICE = 'agent-passport-runtime-gateway';

function definedFields(value) {
  return Object.fromEntries(Object.entries(value || {}).filter(([, item]) => item !== undefined));
}

function errorFields(error) {
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
    service: SERVICE,
    environment: env.NODE_ENV,
    version: '0.1.0',
    traceId: context.traceId,
    requestId: context.requestId,
    invocationId: context.invocationId,
    connectionId: context.connectionId,
    agentId: context.agentId,
    capabilityId: context.capabilityId,
    capabilityName: context.capabilityName,
  });

  function emit(level, event, fields = {}) {
    activeLogger[level](
      safeLogPayload(
        definedFields({ ...base, ...fields, event, timestamp: new Date().toISOString() }),
      ),
      event,
    );
  }

  function child(fields = {}) {
    return createObserver({ ...base, ...definedFields(fields) }, activeLogger);
  }

  async function stage(stageName, operation, fields = {}) {
    const startedAt = performance.now();
    emit('info', 'runtime.stage.started', { ...fields, stage: stageName, status: 'started' });
    try {
      const result = await operation();
      emit('info', 'runtime.stage.completed', {
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
      for (const [key, value] of Object.entries(base)) {
        if (
          error[key] === undefined &&
          ['traceId', 'requestId', 'invocationId', 'connectionId'].includes(key)
        ) {
          error[key] = value;
        }
      }
      emit('warn', 'runtime.stage.failed', {
        ...fields,
        ...errorFields(error),
        stage: stageName,
        status: 'failed',
        durationMs,
      });
      throw error;
    }
  }

  return { base, child, emit, stage };
}

module.exports = { SERVICE, createObserver, definedFields, errorFields };
