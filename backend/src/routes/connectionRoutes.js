const express = require('express');
const {
  listConnections,
  getConnection,
  addConnectionCredential,
  checkConnectionHealth,
} = require('../controllers/connectionController');
const { invokeConnection, importConnectionMcpTools } = require('../controllers/invocationController');
const { env } = require('../config/env');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requireLegacyProtocolFixture } = require('../middleware/requireLegacyProtocolFixture');

const connectionRouter = express.Router();

connectionRouter.get('/', listConnections);
connectionRouter.get('/:id', getConnection);
connectionRouter.post('/:id/credentials', addConnectionCredential);
connectionRouter.post(
  '/:id/health',
  authenticatePartner,
  requireLegacyProtocolFixture,
  checkConnectionHealth,
);
connectionRouter.post(
  '/:id/invoke',
  authenticatePartner,
  requireLegacyProtocolFixture,
  invokeConnection,
);
if (env.LEGACY_MCP_ENABLED) {
  connectionRouter.post(
    '/:id/import-mcp-tools',
    authenticatePartner,
    requireLegacyProtocolFixture,
    importConnectionMcpTools,
  );
}

module.exports = {
  connectionRouter,
};
