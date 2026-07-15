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
const PassportConnection = require('../models/PassportConnection');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');

async function assertOperationsAccess(input, partner) {
  const receivingWorkspaceId = String(input?.receivingWorkspaceId || '').trim();
  const receivingUserId = String(input?.receivingUserId || '').trim();
  if (!receivingWorkspaceId || !receivingUserId) return;
  const ownedConnection = await PassportConnection.exists({
    partnerId: partner?._id,
    receivingWorkspaceId,
    receivingUserId,
  });
  if (!ownedConnection) {
    throw new AppError(404, ErrorCodes.CONNECTION_NOT_FOUND, 'Operations scope was not found.');
  }
}

function handler(operation, source = 'query') {
  return async (request, response, next) => {
    try {
      const input = source === 'body' ? request.body : request.query;
      await assertOperationsAccess(input, request.partner);
      const data = await operation(input, { partner: request.partner });
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

async function acknowledge(request, response, next) {
  try {
    await assertOperationsAccess(request.body, request.partner);
    const data = await acknowledgeAlert(request.params.id, request.body, {
      partner: request.partner,
    });
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function recoveryQueue(request, response, next) {
  try {
    const data = await listRecoveryQueue(request.query, {
      partner: request.partner,
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
    const data = await scanStuckInvocations(request.body, {
      partner: request.partner,
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
};
