const express = require('express');
const {
  listConnections,
  getConnection,
  addConnectionCredential,
  checkConnectionHealth,
} = require('../controllers/connectionController');
const { invokeConnection, importConnectionMcpTools } = require('../controllers/invocationController');
const { env } = require('../config/env');

const connectionRouter = express.Router();

connectionRouter.get('/', listConnections);
connectionRouter.get('/:id', getConnection);
connectionRouter.post('/:id/credentials', addConnectionCredential);
connectionRouter.post('/:id/health', checkConnectionHealth);
connectionRouter.post('/:id/invoke', invokeConnection);
if (env.LEGACY_MCP_ENABLED) {
  connectionRouter.post('/:id/import-mcp-tools', importConnectionMcpTools);
}

module.exports = {
  connectionRouter,
};
