'use strict';

const express = require('express');
const controller = require('../controllers/platformNativeClientController');
const { authenticateHostPrincipal } = require('../middleware/authenticateHostPrincipal');

function createPlatformNativeClientRouter(options = {}) {
  const router = express.Router();
  router.use(options.authenticate || authenticateHostPrincipal);
  router.post('/discovery', controller.discover);
  router.post('/install', controller.install);
  router.post('/invoke', controller.invoke);
  router.post('/tasks/status', controller.getTask);
  router.post('/tasks/result', controller.getTaskResult);
  router.post('/tasks/cancel', controller.cancelTask);
  router.post('/approvals/continue', controller.continueApproval);
  router.post('/receipts/get', controller.getReceipt);
  router.post('/receipts/verify', controller.verifyReceipt);
  router.post('/revocations/check', controller.checkRevocation);
  return router;
}

const platformNativeClientRouter = createPlatformNativeClientRouter();

module.exports = {
  createPlatformNativeClientRouter,
  platformNativeClientRouter,
};
