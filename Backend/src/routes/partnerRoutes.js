const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');
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

partnerRouter.post(
  '/agents',
  requiresPermission('passport.create', { resourceType: 'Passport' }),
  createOrUpdateAgentPassport,
);
partnerRouter.get(
  '/agents',
  requiresPermission('passport.read', { resourceType: 'Passport' }),
  listAgents,
);
partnerRouter.get(
  '/agents/:passportId',
  requiresPermission('passport.read', { resourceType: 'Passport' }),
  getAgent,
);
partnerRouter.post(
  '/agents/:passportId/keys',
  requiresPermission('passport.create', { resourceType: 'PassportInstallKey' }),
  createInstallKey,
);
partnerRouter.post(
  '/agents/:passportId/revoke',
  requiresPermission('passport.delete', { resourceType: 'Passport' }),
  revokeAgent,
);
partnerRouter.post(
  '/keys/:keyId/revoke',
  requiresPermission('passport.delete', { resourceType: 'PassportInstallKey' }),
  revokeKey,
);

module.exports = {
  partnerRouter,
};
