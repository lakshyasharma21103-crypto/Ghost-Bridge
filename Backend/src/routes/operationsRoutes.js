const express = require('express');
const {
  summary,
  latency,
  errors,
  passportFunnel,
  alerts,
  acknowledge,
  recoveryQueue,
  recoveryScan,
} = require('../controllers/operationsController');
const { authenticatePartner } = require('../middleware/authenticatePartner');

const operationsRouter = express.Router();

operationsRouter.use(authenticatePartner);
operationsRouter.get('/summary', summary);
operationsRouter.get('/latency', latency);
operationsRouter.get('/errors', errors);
operationsRouter.get('/passport-funnel', passportFunnel);
operationsRouter.get('/alerts', alerts);
operationsRouter.get('/recovery', recoveryQueue);
operationsRouter.post('/recovery/scan', recoveryScan);
operationsRouter.post('/alerts/:id/acknowledge', acknowledge);
operationsRouter.post('/alerts/:id/ack', acknowledge);

module.exports = { operationsRouter };
