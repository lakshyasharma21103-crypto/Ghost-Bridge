const express = require('express');
const controller = require('../controllers/dataAccessPerformanceController');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');

const dataAccessPerformanceRouter = express.Router();
dataAccessPerformanceRouter.use(authenticatePartner);

function protect(method, path, permission, resourceType, handler) {
  dataAccessPerformanceRouter[method](path, requiresPermission(permission, { resourceType }), handler);
}

protect('get', '/', 'dataAccessPerformance.read', 'DataAccessPerformance', controller.performanceOverview);
protect('post', '/policies', 'dataAccessPerformancePolicy.create', 'DataAccessPerformancePolicy', controller.createPolicy);
protect('get', '/policies', 'dataAccessPerformancePolicy.read', 'DataAccessPerformancePolicy', controller.listPolicies);
protect('get', '/policies/:policyId', 'dataAccessPerformancePolicy.read', 'DataAccessPerformancePolicy', controller.getPolicy);
protect('patch', '/policies/:policyId', 'dataAccessPerformancePolicy.update', 'DataAccessPerformancePolicy', controller.updatePolicy);
protect('post', '/policies/:policyId/validate', 'dataAccessPerformancePolicy.validate', 'DataAccessPerformancePolicy', controller.validatePolicy);
protect('post', '/policies/:policyId/activate', 'dataAccessPerformancePolicy.activate', 'DataAccessPerformancePolicy', controller.activatePolicy);
protect('post', '/policies/:policyId/archive', 'dataAccessPerformancePolicy.archive', 'DataAccessPerformancePolicy', controller.archivePolicy);

protect('get', '/query-shapes', 'dataAccessPerformance.readDetails', 'QueryShape', controller.listQueryShapes);
protect('get', '/query-shapes/:queryShapeId', 'dataAccessPerformance.readDetails', 'QueryShape', controller.getQueryShape);
protect('get', '/query-samples', 'queryPerformance.read', 'QueryPerformanceSample', controller.listQuerySamples);
protect('get', '/slow-queries', 'queryPerformance.readDetails', 'QueryPerformanceSample', controller.listSlowQueries);
protect('post', '/query-shapes/:queryShapeId/explain', 'queryPerformance.explain', 'QueryShape', controller.explainQueryShape);

protect('get', '/indexes', 'databaseIndex.read', 'DatabaseIndex', controller.listIndexes);
protect('get', '/indexes/drift', 'databaseIndex.readDrift', 'DatabaseIndex', controller.listIndexDrift);
protect('post', '/indexes/:indexName/reconcile', 'databaseIndex.reconcile', 'DatabaseIndex', controller.reconcileIndex);

protect('get', '/cache', 'cacheOperations.read', 'CacheOperations', controller.cacheSummary);
protect('get', '/cache/namespaces', 'cacheOperations.read', 'CacheOperations', controller.cacheNamespaces);
protect('get', '/cache/invalidation-events', 'cacheOperations.read', 'CacheInvalidationEvent', controller.listInvalidationEvents);
protect('post', '/cache/invalidate', 'cacheOperations.invalidate', 'CacheOperations', controller.invalidateCache);
protect('post', '/cache/warm', 'cacheOperations.warm', 'CacheOperations', controller.warmCache);

protect('get', '/projections', 'projectionOperations.read', 'ProjectionMetadata', controller.listProjections);
protect('get', '/projections/:projectionName', 'projectionOperations.read', 'ProjectionMetadata', controller.getProjection);
protect('post', '/projections/:projectionName/rebuild', 'projectionOperations.rebuild', 'ProjectionMetadata', controller.rebuildProjection);
protect('post', '/projections/:projectionName/pause', 'projectionOperations.pause', 'ProjectionMetadata', controller.pauseProjection);
protect('post', '/projections/:projectionName/resume', 'projectionOperations.resume', 'ProjectionMetadata', controller.resumeProjection);

protect('get', '/database', 'dataAccessPerformance.read', 'DatabaseHealth', controller.databaseSummary);
protect('get', '/connection-pool', 'databasePool.read', 'DatabasePool', controller.connectionPool);

module.exports = { dataAccessPerformanceRouter };
