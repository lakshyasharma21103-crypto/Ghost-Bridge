const express = require('express');
const { env } = require('../config/env');
const { healthRouter } = require('./healthRoutes');
const { passportRouter } = require('./passportRoutes');
const { partnerRouter } = require('./partnerRoutes');
const { connectionRouter } = require('./connectionRoutes');
const { invocationRouter } = require('./invocationRoutes');
const { demoRouter } = require('./demoRoutes');
const { auditLogRouter } = require('./auditLogRoutes');
const { developerSandboxRouter } = require('./developerSandboxRoutes');

const API_PREFIX = '/api/v1';
const router = express.Router();

router.get('/', (_request, response) => {
  response.json({
    success: true,
    data: {
      product: 'Agent Passport Runtime Gateway',
      line: 'One key to discover, connect, and invoke any compatible AI agent.',
      apiVersion: 'v1',
    },
  });
});

router.use('/health', healthRouter);
router.use(`${API_PREFIX}/health`, healthRouter);
router.use(`${API_PREFIX}/passports`, passportRouter);
router.use(`${API_PREFIX}/partner`, partnerRouter);
router.use(`${API_PREFIX}/connections`, connectionRouter);
router.use(`${API_PREFIX}/invocations`, invocationRouter);
router.use(`${API_PREFIX}/audit-logs`, auditLogRouter);
if (env.NODE_ENV === 'development') {
  router.use(`${API_PREFIX}/demo`, demoRouter);
  router.use(`${API_PREFIX}/developer-sandbox`, developerSandboxRouter);
}

module.exports = {
  API_PREFIX,
  router,
};
