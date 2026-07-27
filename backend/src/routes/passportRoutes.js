const express = require('express');
const { validatePassport, resolvePassportInstallKey } = require('../controllers/passportController');
const { authenticateHostPrincipal } = require('../middleware/authenticateHostPrincipal');
const { requireLegacyProtocolFixture } = require('../middleware/requireLegacyProtocolFixture');

const passportRouter = express.Router();

passportRouter.post('/validate', validatePassport);
passportRouter.post(
  '/resolve',
  authenticateHostPrincipal,
  requireLegacyProtocolFixture,
  resolvePassportInstallKey,
);

module.exports = {
  passportRouter,
};
