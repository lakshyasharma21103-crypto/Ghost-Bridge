const {
  invoke,
  importMcpTools,
  listInvocations: listGatewayInvocations,
  getInvocation: getGatewayInvocation,
  listInvocationAttempts: listGatewayInvocationAttempts,
} = require('../services/runtimeGateway.service');
const {
  requestCancellation,
  manualRetry,
  manualResolve,
} = require('../services/invocationControl.service');

async function invokeConnection(request, response, next) {
  try {
    const data = await invoke(request.params.id, request.body?.capability, request.body?.input, {
      actorType: 'user',
      actorId: request.body?.receivingUserId,
      receivingWorkspaceId: request.body?.receivingWorkspaceId,
      receivingUserId: request.body?.receivingUserId,
      enforceConnectionOwnership: true,
      requestId: request.requestId,
      traceId: request.traceId,
      observer: request.observer,
      idempotencyKey: request.get('Idempotency-Key'),
      approvalRequestId: request.body?.approvalRequestId,
      approvalRequestIds: request.body?.approvalRequestIds,
      onInvocationCreated(invocationId) {
        response.setHeader('X-Invocation-Id', invocationId);
      },
    });
    response.status(data.workAccepted === true ? 202 : 200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function importConnectionMcpTools(request, response, next) {
  try {
    const data = await importMcpTools(request.params.id, {
      actorType: 'user',
      actorId: request.body?.receivingUserId,
      receivingWorkspaceId: request.body?.receivingWorkspaceId,
      receivingUserId: request.body?.receivingUserId,
      enforceConnectionOwnership: true,
      requestId: request.requestId,
    });
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function listInvocations(request, response, next) {
  try {
    const data = await listGatewayInvocations(request.query, { partner: request.partner });
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getInvocation(request, response, next) {
  try {
    const data = await getGatewayInvocation(request.params.id, request.query, {
      partner: request.partner,
    });
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function listInvocationAttempts(request, response, next) {
  try {
    const data = await listGatewayInvocationAttempts(request.params.id, request.query, {
      partner: request.partner,
    });
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

function controlActor(request) {
  return {
    partner: request.partner,
    requestId: request.requestId,
    traceId: request.traceId,
    observer: request.observer,
  };
}

async function cancelInvocation(request, response, next) {
  try {
    const data = await requestCancellation(request.params.id, request.body, controlActor(request));
    response.status(data.cancellationState === 'outcome_unknown' ? 202 : 200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function retryInvocation(request, response, next) {
  try {
    const data = await manualRetry(request.params.id, request.body, controlActor(request));
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function resolveInvocation(request, response, next) {
  try {
    const data = await manualResolve(request.params.id, request.body, controlActor(request));
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  invokeConnection,
  importConnectionMcpTools,
  listInvocations,
  getInvocation,
  listInvocationAttempts,
  cancelInvocation,
  retryInvocation,
  resolveInvocation,
};
