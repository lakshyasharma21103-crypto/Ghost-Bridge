const express = require('express');
const { SERVICE_NAME, SERVICE_VERSION } = require('../constants');

function healthRouter(provider, config) {
  const router = express.Router();

  router.get('/', (request, response) => {
    response.json({
      success: true,
      data: {
        service: SERVICE_NAME,
        status: 'healthy',
        version: SERVICE_VERSION,
        ai: provider.checkConfiguration(),
      },
      meta: {
        traceId: request.traceId,
        requestId: request.requestId,
      },
    });
  });

  return router;
}

function readinessHandler(provider, config) {
  return function readiness(request, response) {
    const ai = provider.checkConfiguration();
    const runtimeAuthenticationConfigured = Boolean(config?.runtimeToken);
    const ready = ai.configured === true && runtimeAuthenticationConfigured;
    response.status(ready ? 200 : 503).json({
      success: ready,
      data: {
        service: SERVICE_NAME,
        status: ready ? 'ready' : 'not_ready',
        version: SERVICE_VERSION,
        ai: {
          provider: ai.provider,
          configured: ai.configured === true,
        },
        runtimeAuthentication: { configured: runtimeAuthenticationConfigured },
      },
      meta: { traceId: request.traceId, requestId: request.requestId },
    });
  };
}

module.exports = {
  healthRouter,
  readinessHandler,
};
