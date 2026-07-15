const express = require('express');
const {
  listInvocations,
  getInvocation,
  listInvocationAttempts,
  cancelInvocation,
  retryInvocation,
  resolveInvocation,
} = require('../controllers/invocationController');
const { authenticatePartner } = require('../middleware/authenticatePartner');

const invocationRouter = express.Router();

invocationRouter.use(authenticatePartner);
invocationRouter.get('/', listInvocations);
invocationRouter.post('/:id/cancel', cancelInvocation);
invocationRouter.post('/:id/retry', retryInvocation);
invocationRouter.post('/:id/resolve', resolveInvocation);
invocationRouter.get('/:id/attempts', listInvocationAttempts);
invocationRouter.get('/:id', getInvocation);

module.exports = {
  invocationRouter,
};
