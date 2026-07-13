const express = require('express');
const { getHealth, getReadiness } = require('../controllers/healthController');

const healthRouter = express.Router();

healthRouter.get('/', getHealth);

const readinessRouter = express.Router();
readinessRouter.get('/', getReadiness);

module.exports = {
  healthRouter,
  readinessRouter,
};
