const {
  listReceivingConnections,
  getReceivingConnection,
  storeConnectionCredential,
  checkConnectionHealth: checkConnectionHealthForConnection,
} = require('../services/connectionService');

async function listConnections(request, response, next) {
  try {
    const data = await listReceivingConnections(request.query);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getConnection(request, response, next) {
  try {
    const data = await getReceivingConnection(request.params.id, request.query);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function addConnectionCredential(request, response, next) {
  try {
    const data = await storeConnectionCredential(request.params.id, request.body, request.requestId);
    response.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function checkConnectionHealth(request, response, next) {
  try {
    const data = await checkConnectionHealthForConnection(
      request.params.id,
      request.body,
      request.requestId,
    );
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listConnections,
  getConnection,
  addConnectionCredential,
  checkConnectionHealth,
};
