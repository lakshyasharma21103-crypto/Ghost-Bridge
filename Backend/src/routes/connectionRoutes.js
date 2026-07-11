const express = require('express');
const {
  listConnections,
  getConnection,
  addConnectionCredential,
  checkConnectionHealth,
} = require('../controllers/connectionController');
const { invokeConnection, importConnectionMcpTools } = require('../controllers/invocationController');

const connectionRouter = express.Router();

connectionRouter.get('/', listConnections);
connectionRouter.get('/:id', getConnection);
connectionRouter.post('/:id/credentials', addConnectionCredential);
connectionRouter.post('/:id/health', checkConnectionHealth);
connectionRouter.post('/:id/invoke', invokeConnection);
connectionRouter.post('/:id/import-mcp-tools', importConnectionMcpTools);

module.exports = {
  connectionRouter,
};
