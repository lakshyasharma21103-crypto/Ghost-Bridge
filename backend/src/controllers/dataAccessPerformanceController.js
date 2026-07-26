const core = require('../services/dataAccessPerformance.service');
const operations = require('../services/dataAccessPerformanceOperations.service');
const { getQueryShape } = require('../services/dataAccessRegistry.service');

function caller(request) {
  return {
    partner: request.partner,
    requestId: request.requestId,
    traceId: request.traceId,
    observer: request.observer,
    platformAuthorized: request.platformAuthorized === true,
  };
}

function input(request, extra = {}) {
  return {
    ...request.query,
    ...request.body,
    ...extra,
    idempotencyKey: request.get('Idempotency-Key') || request.body?.idempotencyKey,
  };
}

function handler(operation, statusCode = 200) {
  return async (request, response, next) => {
    try {
      response.status(statusCode).json({ success: true, data: await operation(request) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  activatePolicy: handler((request) => operations.activatePolicy(request.params.policyId, input(request), caller(request))),
  archivePolicy: handler((request) => operations.archivePolicy(request.params.policyId, input(request), caller(request))),
  cacheNamespaces: handler((request) => operations.cacheNamespaces(input(request), caller(request))),
  cacheSummary: handler((request) => operations.cacheSummary(input(request), caller(request))),
  connectionPool: handler((request) => operations.connectionPool(input(request), caller(request))),
  createPolicy: handler((request) => operations.createPolicy(input(request), caller(request)), 201),
  databaseSummary: handler((request) => operations.databaseSummary(input(request), caller(request))),
  explainQueryShape: handler((request) => operations.explainQueryShape(request.params.queryShapeId, input(request), caller(request))),
  getPolicy: handler((request) => operations.getPolicy(request.params.policyId, input(request), caller(request))),
  getProjection: handler((request) => operations.getProjection(request.params.projectionName, input(request), caller(request))),
  getQueryShape: handler((request) => getQueryShape(request.params.queryShapeId)),
  invalidateCache: handler((request) => operations.invalidateCache(input(request), caller(request)), 202),
  listIndexDrift: handler((request) => operations.listIndexDrift(input(request), caller(request))),
  listIndexes: handler((request) => operations.listIndexes(input(request), caller(request))),
  listInvalidationEvents: handler((request) => operations.listInvalidationEvents(input(request), caller(request))),
  listPolicies: handler((request) => operations.listPolicies(input(request), caller(request))),
  listProjections: handler((request) => operations.listProjections(input(request), caller(request))),
  listQuerySamples: handler((request) => operations.listQuerySamples(input(request), caller(request))),
  listQueryShapes: handler(() => ({ items: core.listQueryShapes() })),
  listSlowQueries: handler((request) => operations.listSlowQueries(input(request), caller(request))),
  pauseProjection: handler((request) => operations.projectionAction(request.params.projectionName, 'pause', input(request), caller(request))),
  performanceOverview: handler((request) => operations.performanceOverview(input(request), caller(request))),
  rebuildProjection: handler((request) => operations.projectionAction(request.params.projectionName, 'rebuild', input(request), caller(request)), 202),
  reconcileIndex: handler((request) => operations.reconcileIndex(request.params.indexName, input(request), caller(request)), 202),
  resumeProjection: handler((request) => operations.projectionAction(request.params.projectionName, 'resume', input(request), caller(request))),
  updatePolicy: handler((request) => operations.updatePolicy(request.params.policyId, input(request), caller(request))),
  validatePolicy: handler((request) => operations.validatePolicyRecord(request.params.policyId, input(request), caller(request))),
  warmCache: handler((request) => operations.warmCache(input(request), caller(request)), 202),
};
