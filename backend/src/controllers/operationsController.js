const {
  getSummary,
  getLatency,
  getErrors,
  getPassportFunnel,
  listAlerts,
  acknowledgeAlert,
} = require('../services/operationsService');
const {
  listRecoveryQueue,
  scanStuckInvocations,
} = require('../services/invocationControl.service');
const {
  authorizeDurableOperationsScope,
  getDurableWorkOverview,
  getDurableWorkMetrics,
  getRuntimeWorkerHealth,
  scanDurableAbandonedWork,
  reconcileDurableWork,
  requeueDurableDeadLetter,
} = require('../services/durableOperations.service');

async function assertOperationsAccess(input, partner) {
  return authorizeDurableOperationsScope(input, { partner });
}

function handler(operation, source = 'query') {
  return async (request, response, next) => {
    try {
      const input = source === 'body' ? request.body : request.query;
      const operationsScope = await assertOperationsAccess(input, request.partner);
      const data = await operation(input, {
        partner: request.partner,
        operationsScope,
        requestId: request.requestId,
        traceId: request.traceId,
        observer: request.observer,
      });
      response.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

const summary = handler(getSummary);
const latency = handler(getLatency);
const errors = handler(getErrors);
const passportFunnel = handler(getPassportFunnel);
const alerts = handler(listAlerts);
const durableWorkItems = handler(getDurableWorkOverview);
const durableWorkMetrics = handler(getDurableWorkMetrics);
const runtimeWorkers = handler(getRuntimeWorkerHealth);
const durableAbandonedScan = handler(scanDurableAbandonedWork, 'body');
const durableReconciliation = handler(reconcileDurableWork, 'body');

async function acknowledge(request, response, next) {
  try {
    const operationsScope = await assertOperationsAccess(request.body, request.partner);
    const data = await acknowledgeAlert(request.params.id, request.body, {
      partner: request.partner,
      operationsScope,
      requestId: request.requestId,
      traceId: request.traceId,
    });
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function recoveryQueue(request, response, next) {
  try {
    const operationsScope = await assertOperationsAccess(request.query, request.partner);
    const data = await listRecoveryQueue(request.query, {
      partner: request.partner,
      operationsScope,
      requestId: request.requestId,
      traceId: request.traceId,
      observer: request.observer,
    });
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function recoveryScan(request, response, next) {
  try {
    const operationsScope = await assertOperationsAccess(request.body, request.partner);
    const data = await scanStuckInvocations(request.body, {
      partner: request.partner,
      operationsScope,
      requestId: request.requestId,
      traceId: request.traceId,
      observer: request.observer,
    });
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function durableDeadLetterRequeue(request, response, next) {
  try {
    const operationsScope = await assertOperationsAccess(request.body, request.partner);
    const data = await requeueDurableDeadLetter(request.params.id, request.body, {
      partner: request.partner,
      operationsScope,
      requestId: request.requestId,
      traceId: request.traceId,
      observer: request.observer,
    });
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
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
};
