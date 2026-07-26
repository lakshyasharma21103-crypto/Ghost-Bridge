const express = require('express');
const { validatePassport, resolvePassportInstallKey } = require('../controllers/passportController');
const { authenticateHostPrincipal } = require('../middleware/authenticateHostPrincipal');

const passportRouter = express.Router();

passportRouter.post('/validate', validatePassport);
passportRouter.post('/resolve', authenticateHostPrincipal, resolvePassportInstallKey);

module.exports = {
  passportRouter,
};
