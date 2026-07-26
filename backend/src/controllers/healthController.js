const { databaseStatus } = require('../config/db');
const { env, startupConfiguration } = require('../config/env');
const { serviceLifecycle } = require('../services/serviceLifecycle.service');

function getHealth(_request, response) {
  response.json({
    success: true,
    data: {
      service: 'agent-passport-runtime-gateway',
      status: serviceLifecycle.snapshot().phase === 'stopped' ? 'fatal' : 'ok',
      liveness: serviceLifecycle.snapshot().phase === 'stopped' ? 'fatal' : 'live',
      protocolVersion: '1',
      generatedAt: new Date().toISOString(),
    },
  });
}

function runtimeConfigurationStatus() {
  return Number.isInteger(env.RUNTIME_INVOCATION_TIMEOUT_MS) &&
    env.RUNTIME_INVOCATION_TIMEOUT_MS > 0
    ? 'valid'
    : 'invalid';
}

function getReadiness(_request, response) {
  const database = databaseStatus();
  const runtimeConfiguration = runtimeConfigurationStatus();
  const lifecycle =
    _request?.app?.locals?.serviceLifecycle?.snapshot?.() || serviceLifecycle.snapshot();
  const ready =
    lifecycle.ready &&
    !lifecycle.draining &&
    database === 'connected' &&
    runtimeConfiguration === 'valid' &&
    startupConfiguration.valid;
  response.status(ready ? 200 : 503).json({
    success: ready,
    data: {
      service: 'agent-passport-runtime-gateway',
      status: ready ? 'ready' : 'not_ready',
      database: { status: database },
      runtimeConfiguration: { status: runtimeConfiguration },
      startupConfiguration: {
        status: startupConfiguration.valid ? 'valid' : 'invalid',
        safeReasonCodes: startupConfiguration.issues.map((issue) => issue.code),
      },
      lifecycle: { status: lifecycle.phase },
      orchestrationWorker: {
        status: env.ORCHESTRATION_WORKER_ENABLED ? 'external_worker_required' : 'disabled',
        enabled: env.ORCHESTRATION_WORKER_ENABLED,
      },
      regionId: env.SERVICE_REGION_ID,
      protocolVersion: '1',
      generatedAt: new Date().toISOString(),
    },
  });
}

module.exports = {
  getHealth,
  getReadiness,
  runtimeConfigurationStatus,
};
