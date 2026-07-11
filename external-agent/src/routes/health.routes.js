const express = require('express');

const healthRouter = express.Router();

healthRouter.get('/', (request, response) => {
  response.json({
    success: true,
    data: {
      service: 'external-research-agent',
      status: 'healthy',
      version: '1.0.0',
    },
    meta: {
      requestId: request.requestId,
    },
  });
});

module.exports = {
  healthRouter,
};
