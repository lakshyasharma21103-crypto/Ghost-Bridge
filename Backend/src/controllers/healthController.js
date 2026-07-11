const { databaseStatus } = require('../config/db');
const { env } = require('../config/env');

function getHealth(_request, response) {
  const db = databaseStatus();
  response.json({
    success: true,
    data: {
      service: 'agent-passport-runtime-gateway',
      environment: env.NODE_ENV,
      status: db === 'unavailable' ? 'degraded' : 'ok',
      database: {
        status: db,
      },
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = {
  getHealth,
};
