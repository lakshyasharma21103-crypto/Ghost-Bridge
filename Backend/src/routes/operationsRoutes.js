const express = require('express');
const {
  summary,
  latency,
  errors,
  passportFunnel,
  alerts,
  acknowledge,
} = require('../controllers/operationsController');

const operationsRouter = express.Router();

operationsRouter.get('/summary', summary);
operationsRouter.get('/latency', latency);
operationsRouter.get('/errors', errors);
operationsRouter.get('/passport-funnel', passportFunnel);
operationsRouter.get('/alerts', alerts);
operationsRouter.post('/alerts/:id/acknowledge', acknowledge);
operationsRouter.post('/alerts/:id/ack', acknowledge);

module.exports = { operationsRouter };
