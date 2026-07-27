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
const { requiresPermission } = require('../middleware/requiresPermission');
const { requireLegacyProtocolFixture } = require('../middleware/requireLegacyProtocolFixture');

const invocationRouter = express.Router();

invocationRouter.use(authenticatePartner);
invocationRouter.use(requireLegacyProtocolFixture);
invocationRouter.get(
  '/',
  requiresPermission('invocation.read', { resourceType: 'Invocation' }),
  listInvocations,
);
invocationRouter.post(
  '/:id/cancel',
  requiresPermission('invocation.cancel', { resourceType: 'Invocation' }),
  cancelInvocation,
);
invocationRouter.post(
  '/:id/retry',
  requiresPermission('invocation.retry', { resourceType: 'Invocation' }),
  retryInvocation,
);
invocationRouter.post(
  '/:id/resolve',
  requiresPermission('invocation.cancel', { resourceType: 'Invocation' }),
  resolveInvocation,
);
invocationRouter.get(
  '/:id/attempts',
  requiresPermission('invocation.read', { resourceType: 'InvocationAttempt' }),
  listInvocationAttempts,
);
invocationRouter.get(
  '/:id',
  requiresPermission('invocation.read', { resourceType: 'Invocation' }),
  getInvocation,
);

module.exports = {
  invocationRouter,
};
