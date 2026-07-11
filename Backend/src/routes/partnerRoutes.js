const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const {
  createOrUpdateAgentPassport,
  listAgents,
  getAgent,
  createInstallKey,
  revokeAgent,
  revokeKey,
} = require('../controllers/partnerController');

const partnerRouter = express.Router();

partnerRouter.use(authenticatePartner);

partnerRouter.post('/agents', createOrUpdateAgentPassport);
partnerRouter.get('/agents', listAgents);
partnerRouter.get('/agents/:passportId', getAgent);
partnerRouter.post('/agents/:passportId/keys', createInstallKey);
partnerRouter.post('/agents/:passportId/revoke', revokeAgent);
partnerRouter.post('/keys/:keyId/revoke', revokeKey);

module.exports = {
  partnerRouter,
};
