const express = require('express');
const { SERVICE_NAME, SERVICE_VERSION } = require('../constants');

function healthRouter(_provider, _config) {
  const router = express.Router();

  router.get('/', (request, response) => {
    response.json({
      success: true,
      data: {
        service: SERVICE_NAME,
        status: 'ok',
        version: SERVICE_VERSION,
      },
      meta: {
        traceId: request.traceId,
        requestId: request.requestId,
      },
    });
  });

  return router;
}

function readinessHandler(provider, config, lifecycle) {
  return function readiness(request, response) {
    const ai = provider.checkConfiguration();
    const runtimeAuthenticationConfigured = Boolean(config?.runtimeToken);
    const lifecycleState = lifecycle?.snapshot?.() || { ready: true, phase: 'ready' };
    const ready =
      lifecycleState.ready === true && ai.configured === true && runtimeAuthenticationConfigured;
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
        lifecycle: { status: lifecycleState.phase },
      },
      meta: { traceId: request.traceId, requestId: request.requestId },
    });
  };
}

module.exports = {
  healthRouter,
  readinessHandler,
};
