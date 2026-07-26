const express = require('express');
const {
  status,
  createPartner,
  createPassport,
  issueInstallKey,
  externalAgentStatus,
  externalAgentHealth,
  createExternalAgentPassport,
  createExternalAgentInstallKey,
} = require('../controllers/developerSandboxController');
const { authenticatePartner } = require('../middleware/authenticatePartner');

const developerSandboxRouter = express.Router();

developerSandboxRouter.get('/status', status);
developerSandboxRouter.post('/partners', createPartner);
developerSandboxRouter.post('/partners/:partnerId/passport', authenticatePartner, createPassport);
developerSandboxRouter.post('/passports/:passportId/keys', authenticatePartner, issueInstallKey);
developerSandboxRouter.get('/external-agent/status', authenticatePartner, externalAgentStatus);
developerSandboxRouter.get('/external-agent/health', authenticatePartner, externalAgentHealth);
developerSandboxRouter.post(
  '/external-agent/passport',
  authenticatePartner,
  createExternalAgentPassport,
);
developerSandboxRouter.post(
  '/external-agent/install-key',
  authenticatePartner,
  createExternalAgentInstallKey,
);

module.exports = {
  developerSandboxRouter,
};
