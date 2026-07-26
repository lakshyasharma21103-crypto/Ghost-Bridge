const service = require('../services/orchestration.service');

function caller(request) {
  return {
    partner: request.partner,
    requestId: request.requestId,
    traceId: request.traceId,
    observer: request.observer,
  };
}

function input(request, extra = {}) {
  return { ...request.query, ...request.body, ...extra };
}

function handler(operation, statusCode = 200) {
  return async (request, response, next) => {
    try {
      const data = await operation(request);
      response.status(statusCode).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  createDefinition: handler(
    (request) => service.createDefinition(input(request), caller(request)),
    201,
  ),
  listDefinitions: handler((request) => service.listDefinitions(input(request), caller(request))),
  getDefinition: handler((request) =>
    service.getDefinition(request.params.definitionId, input(request), caller(request)),
  ),
  updateDefinition: handler((request) =>
    service.updateDefinition(request.params.definitionId, input(request), caller(request)),
  ),
  validateDefinition: handler((request) =>
    service.validateDefinition(request.params.definitionId, input(request), caller(request)),
  ),
  activateDefinition: handler((request) =>
    service.activateDefinition(request.params.definitionId, input(request), caller(request)),
  ),
  archiveDefinition: handler((request) =>
    service.archiveDefinition(request.params.definitionId, input(request), caller(request)),
  ),
  startRun: handler(
    (request) =>
      service.startRun(
        request.params.definitionId,
        input(request, { idempotencyKey: request.get('Idempotency-Key') }),
        caller(request),
      ),
    201,
  ),
  listRuns: handler((request) => service.listRuns(input(request), caller(request))),
  getRun: handler((request) =>
    service.getRun(request.params.runId, input(request), caller(request)),
  ),
  listRunNodes: handler((request) =>
    service.listRunNodes(request.params.runId, input(request), caller(request)),
  ),
  cancelRun: handler((request) =>
    service.cancelRun(request.params.runId, input(request), caller(request)),
  ),
};
