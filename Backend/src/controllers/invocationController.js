const {
  invoke,
  importMcpTools,
  listInvocations: listGatewayInvocations,
  getInvocation: getGatewayInvocation,
} = require('../services/runtimeGateway.service');

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
      onInvocationCreated(invocationId) {
        response.setHeader('X-Invocation-Id', invocationId);
      },
    });
    response.json({ success: true, data });
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
    const data = await listGatewayInvocations(request.query);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getInvocation(request, response, next) {
  try {
    const data = await getGatewayInvocation(request.params.id, request.query);
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
};
