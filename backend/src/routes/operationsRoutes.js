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
  durableWorkItems,
  durableWorkMetrics,
  runtimeWorkers,
  durableAbandonedScan,
  durableReconciliation,
  durableDeadLetterRequeue,
} = require('../controllers/operationsController');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');

const operationsRouter = express.Router();

operationsRouter.use(authenticatePartner);
operationsRouter.get('/summary', requiresPermission('operations.read'), summary);
operationsRouter.get('/latency', requiresPermission('operations.read'), latency);
operationsRouter.get('/errors', requiresPermission('operations.read'), errors);
operationsRouter.get('/passport-funnel', requiresPermission('operations.read'), passportFunnel);
operationsRouter.get('/alerts', requiresPermission('operations.read'), alerts);
operationsRouter.get('/recovery', requiresPermission('invocation.read'), recoveryQueue);
operationsRouter.get('/work-items', requiresPermission('worker.read'), durableWorkItems);
operationsRouter.get('/work-items/metrics', requiresPermission('worker.read'), durableWorkMetrics);
operationsRouter.get('/workers', requiresPermission('worker.read'), runtimeWorkers);
operationsRouter.post('/recovery/scan', requiresPermission('worker.manage'), recoveryScan);
operationsRouter.post(
  '/work-items/abandoned/scan',
  requiresPermission('worker.manage'),
  durableAbandonedScan,
);
operationsRouter.post(
  '/work-items/reconcile',
  requiresPermission('worker.manage'),
  durableReconciliation,
);
operationsRouter.post(
  '/work-items/:id/requeue',
  requiresPermission('worker.manage', { resourceType: 'RuntimeWorkItem' }),
  durableDeadLetterRequeue,
);
operationsRouter.post('/alerts/:id/acknowledge', requiresPermission('operations.manage'), acknowledge);
operationsRouter.post('/alerts/:id/ack', requiresPermission('operations.manage'), acknowledge);

module.exports = { operationsRouter };
