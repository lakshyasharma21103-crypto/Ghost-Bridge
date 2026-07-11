const express = require('express');
const { SERVICE_NAME, SERVICE_VERSION } = require('../constants');

function healthRouter(provider) {
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
        requestId: request.requestId,
      },
    });
  });

  return router;
}

module.exports = {
  healthRouter,
};
