const { databaseStatus } = require('../config/db');
const { env } = require('../config/env');

function getHealth(_request, response) {
  response.json({
    success: true,
    data: {
      service: 'agent-passport-runtime-gateway',
      environment: env.NODE_ENV,
      status: 'ok',
      timestamp: new Date().toISOString(),
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
  const ready = database === 'connected' && runtimeConfiguration === 'valid';
  response.status(ready ? 200 : 503).json({
    success: ready,
    data: {
      service: 'agent-passport-runtime-gateway',
      status: ready ? 'ready' : 'not_ready',
      database: { status: database },
      runtimeConfiguration: { status: runtimeConfiguration },
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = {
  getHealth,
  getReadiness,
  runtimeConfigurationStatus,
};
