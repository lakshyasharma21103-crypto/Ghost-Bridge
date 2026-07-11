const express = require('express');
const { validatePassport, resolvePassportInstallKey } = require('../controllers/passportController');

const passportRouter = express.Router();

passportRouter.post('/validate', validatePassport);
passportRouter.post('/resolve', resolvePassportInstallKey);

module.exports = {
  passportRouter,
};
