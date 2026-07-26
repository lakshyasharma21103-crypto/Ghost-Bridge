const mongoose = require('mongoose');
const IndexDriftRecord = require('../models/IndexDriftRecord');
const { env } = require('../config/env');
const { connectionPoolSummary, databaseStatus } = require('../config/db');
const { CACHE_NAMESPACES, DATA_ACCESS_LIMITS, QUERY_SHAPES } = require('../constants/dataAccessPerformance');
const { assertOperationalAccess } = require('./operationalState.service');
const { assertAuthorized } = require('./authorization.service');
const { createAuditLog } = require('./auditService');
const metrics = require('./dataAccessMetrics.service');
const {
  BoundedMemoryCacheAdapter,
  CacheAsideService,
  NoopCacheAdapter,
  OptionalDistributedCacheAdapter,
  listCacheNamespaces,
} = require('./dataAccessCache.service');
const {
  INDEX_MANIFEST,
  classifySlowQuery,
  compareIndexManifest,
  dataAccessError,
  getQueryShape,
  listQueryShapes,
  reconcileIndex,
  validateTimeoutHierarchy,
} = require('./dataAccessRegistry.service');

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const cacheAdapter = env.CACHE_ADAPTER === 'noop'
  ? new NoopCacheAdapter()
  : env.CACHE_ADAPTER === 'distributed'
    ? new OptionalDistributedCacheAdapter(null, { commandTimeoutMs: env.CACHE_COMMAND_TIMEOUT_MS })
    : new BoundedMemoryCacheAdapter({ maximumEntries: env.CACHE_MEMORY_MAX_ENTRIES, maximumBytes: env.CACHE_MEMORY_MAX_BYTES });
const cacheAside = new CacheAsideService({ adapter: cacheAdapter, keySecret: env.CACHE_KEY_DIGEST_SECRET, metrics });

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function safeIdentifier(value, path, required = true) {
  if (value == null || value === '') {
    if (!required) return undefined;
    throw dataAccessError('VALIDATION_ERROR', `${path} is required.`);
  }
  const candidate = String(value).trim();
  if (!SAFE_IDENTIFIER.test(candidate)) throw dataAccessError('VALIDATION_ERROR', `${path} is invalid.`);
  return candidate;
}

function actor(scope, caller = {}) {
  const partnerId = idOf(caller.partner?._id);
  return { type: 'service_account', id: scope.actorId || `partner:${partnerId}`, partnerId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, requestId: scope.requestId, traceId: scope.traceId };
}

function resource(type, value, scope) {
  return { type, id: idOf(value) || undefined, organizationId: scope.organizationId, workspaceId: scope.workspaceId, partnerId: scope.organizationId };
}

function scopeFrom(input = {}, caller = {}, workspaceRequired = true) {
  const partnerId = idOf(caller.partner?._id);
  const organizationId = safeIdentifier(input.organizationId || partnerId, 'organizationId');
  if (partnerId && organizationId !== partnerId) throw dataAccessError('AUTHORIZATION_DENIED', 'Authorization denied.', [], 403);
  return {
    organizationId,
    workspaceId: safeIdentifier(input.workspaceId || input.receivingWorkspaceId, 'workspaceId', workspaceRequired),
    actorId: `partner:${partnerId}`,
    actorType: 'service_account',
    requestId: safeIdentifier(caller.requestId || input.requestId || `req_${Date.now()}`, 'requestId'),
    traceId: safeIdentifier(caller.traceId || input.traceId || `trace_${Date.now()}`, 'traceId'),
    platformAuthorized: caller.platformAuthorized === true,
  };
}

async function authorize(permission, type, value, scope, caller, context = {}) {
  return assertAuthorized(actor(scope, caller), permission, resource(type, value, scope), {
    requestId: scope.requestId,
    traceId: scope.traceId,
    dataAccessPerformance: context,
  });
}

async function audit(action, type, value, scope, metadata = {}) {
  return createAuditLog(scope.actorType, scope.actorId, action, type, idOf(value), {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    ...metadata,
  }, { requestId: scope.requestId, traceId: scope.traceId });
}

function defaultPerformancePolicy(scopeKey = 'platform') {
  return {
    scopeKey,
    name: 'Default data-access performance',
    description: 'Bounded database, cache, query, and projection defaults.',
    version: 1,
    status: 'draft',
    maximumPageSize: 100,
    maximumBatchSize: 100,
    maximumQueryExecutionMs: env.DATABASE_OPERATION_TIMEOUT_MS,
    maximumAggregationExecutionMs: Math.min(8_000, env.DATABASE_REPOSITORY_BUDGET_MS),
    maximumAggregationStages: 8,
    maximumLookupStages: 1,
    maximumResultBytes: 2_097_152,
    maximumDocumentBytes: DATA_ACCESS_LIMITS.maximumDocumentBytes,
    maximumCacheValueBytes: DATA_ACCESS_LIMITS.maximumCacheValueBytes,
    cacheEnabled: env.CACHE_ADAPTER !== 'noop',
    distributedCacheEnabled: env.CACHE_ADAPTER === 'distributed',
    allowedCacheNamespaces: CACHE_NAMESPACES.map((entry) => entry.namespace),
    namespaceTtlOverrides: {},
    staleWhileRevalidateNamespaces: CACHE_NAMESPACES.filter((entry) => entry.staleReadAllowance === 'bounded').map((entry) => entry.namespace),
    negativeCacheNamespaces: CACHE_NAMESPACES.filter((entry) => entry.negativeCachePolicy !== 'none').map((entry) => entry.namespace),
    querySamplingRateBasisPoints: 100,
    slowQueryThresholdMs: 500,
    highDocumentsExaminedRatioThreshold: 100,
    projectionLagThresholdMs: 60_000,
    connectionPoolCategory: 'standard',
    timeoutProfile: 'standard',
  };
}

function boundedNumber(value, path, minimum, maximum, fallback) {
  const candidate = value == null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < minimum || candidate > maximum) throw dataAccessError('DATA_ACCESS_POLICY_INVALID', 'The data-access performance policy is invalid.', [{ path, message: `Must be between ${minimum} and ${maximum}.` }]);
  return candidate;
}

function normalizePerformancePolicy(input = {}, previous = {}) {
  const base = { ...defaultPerformancePolicy(input.scopeKey || previous.scopeKey), ...previous, ...input };
  const allowed = [...new Set((base.allowedCacheNamespaces || []).map(String))];
  const governed = new Set(CACHE_NAMESPACES.map((entry) => entry.namespace));
  if (allowed.some((namespace) => !governed.has(namespace))) throw dataAccessError('CACHE_NAMESPACE_NOT_ALLOWED', 'The policy contains an unsupported cache namespace.');
  const stale = [...new Set((base.staleWhileRevalidateNamespaces || []).map(String))];
  const negative = [...new Set((base.negativeCacheNamespaces || []).map(String))];
  if (stale.some((namespace) => !allowed.includes(namespace) || CACHE_NAMESPACES.find((entry) => entry.namespace === namespace)?.staleReadAllowance !== 'bounded')) throw dataAccessError('DATA_ACCESS_POLICY_INVALID', 'Stale reads are enabled for an ineligible namespace.');
  if (negative.some((namespace) => !allowed.includes(namespace) || CACHE_NAMESPACES.find((entry) => entry.namespace === namespace)?.negativeCachePolicy === 'none')) throw dataAccessError('DATA_ACCESS_POLICY_INVALID', 'Negative caching is enabled for an ineligible namespace.');
  const ttlOverrides = { ...(base.namespaceTtlOverrides || {}) };
  for (const [namespace, ttl] of Object.entries(ttlOverrides)) {
    const definition = CACHE_NAMESPACES.find((entry) => entry.namespace === namespace);
    if (!definition || !allowed.includes(namespace) || !Number.isInteger(Number(ttl)) || Number(ttl) < 1_000 || Number(ttl) > definition.maximumTtlMs) throw dataAccessError('DATA_ACCESS_POLICY_INVALID', 'A namespace TTL override is invalid.');
    ttlOverrides[namespace] = Number(ttl);
  }
  return {
    scopeKey: safeIdentifier(base.scopeKey, 'scopeKey'),
    name: String(base.name || '').trim().slice(0, 120),
    description: String(base.description || '').trim().slice(0, 1_000),
    version: boundedNumber(base.version, 'version', 1, 1_000_000, 1),
    status: ['draft', 'active', 'archived'].includes(base.status) ? base.status : 'draft',
    maximumPageSize: boundedNumber(base.maximumPageSize, 'maximumPageSize', 1, 100, 100),
    maximumBatchSize: boundedNumber(base.maximumBatchSize, 'maximumBatchSize', 1, 250, 100),
    maximumQueryExecutionMs: boundedNumber(base.maximumQueryExecutionMs, 'maximumQueryExecutionMs', 100, 10_000, env.DATABASE_OPERATION_TIMEOUT_MS),
    maximumAggregationExecutionMs: boundedNumber(base.maximumAggregationExecutionMs, 'maximumAggregationExecutionMs', 100, 15_000, 8_000),
    maximumAggregationStages: boundedNumber(base.maximumAggregationStages, 'maximumAggregationStages', 1, 12, 8),
    maximumLookupStages: boundedNumber(base.maximumLookupStages, 'maximumLookupStages', 0, 2, 1),
    maximumResultBytes: boundedNumber(base.maximumResultBytes, 'maximumResultBytes', 1_024, 8_388_608, 2_097_152),
    maximumDocumentBytes: boundedNumber(base.maximumDocumentBytes, 'maximumDocumentBytes', 1_024, 8_388_608, DATA_ACCESS_LIMITS.maximumDocumentBytes),
    maximumCacheValueBytes: boundedNumber(base.maximumCacheValueBytes, 'maximumCacheValueBytes', 1_024, 524_288, DATA_ACCESS_LIMITS.maximumCacheValueBytes),
    cacheEnabled: base.cacheEnabled !== false,
    distributedCacheEnabled: base.distributedCacheEnabled === true,
    allowedCacheNamespaces: allowed,
    namespaceTtlOverrides: ttlOverrides,
    staleWhileRevalidateNamespaces: stale,
    negativeCacheNamespaces: negative,
    querySamplingRateBasisPoints: boundedNumber(base.querySamplingRateBasisPoints, 'querySamplingRateBasisPoints', 0, 10_000, 100),
    slowQueryThresholdMs: boundedNumber(base.slowQueryThresholdMs, 'slowQueryThresholdMs', 10, 60_000, 500),
    highDocumentsExaminedRatioThreshold: boundedNumber(base.highDocumentsExaminedRatioThreshold, 'highDocumentsExaminedRatioThreshold', 1, 10_000, 100),
    projectionLagThresholdMs: boundedNumber(base.projectionLagThresholdMs, 'projectionLagThresholdMs', 1_000, 86_400_000, 60_000),
    connectionPoolCategory: ['small', 'standard', 'large'].includes(base.connectionPoolCategory) ? base.connectionPoolCategory : 'standard',
    timeoutProfile: ['interactive', 'standard', 'worker'].includes(base.timeoutProfile) ? base.timeoutProfile : 'standard',
  };
}

function validatePerformancePolicy(input = {}) {
  try {
    const policy = normalizePerformancePolicy(input, input);
    const reasons = [];
    if (policy.maximumAggregationExecutionMs < policy.maximumQueryExecutionMs) reasons.push('AGGREGATION_TIMEOUT_BELOW_QUERY_TIMEOUT');
    if (policy.maximumCacheValueBytes > policy.maximumResultBytes) reasons.push('CACHE_VALUE_EXCEEDS_RESULT_BOUND');
    if (policy.distributedCacheEnabled && !policy.cacheEnabled) reasons.push('DISTRIBUTED_CACHE_REQUIRES_CACHE');
    return { valid: reasons.length === 0, safeReasonCodes: reasons, policy };
  } catch (error) {
    return { valid: false, safeReasonCodes: [error.code || 'DATA_ACCESS_POLICY_INVALID'] };
  }
}

function timeoutHierarchy() {
  return validateTimeoutHierarchy({
    databaseOperationMs: env.DATABASE_OPERATION_TIMEOUT_MS,
    repositoryBudgetMs: env.DATABASE_REPOSITORY_BUDGET_MS,
    serviceBudgetMs: env.DATABASE_SERVICE_BUDGET_MS,
    httpRequestMs: env.DATA_ACCESS_HTTP_TIMEOUT_MS,
    leaseSafetyMarginMs: env.DATABASE_LEASE_SAFETY_MARGIN_MS,
    workerOperationMs: env.DATA_ACCESS_WORKER_OPERATION_TIMEOUT_MS,
    jobLeaseMs: env.DURABLE_WORK_LEASE_MS,
  });
}

function databaseHealth() {
  const pool = connectionPoolSummary();
  const status = databaseStatus();
  return {
    status: status === 'connected' ? 'healthy' : status === 'not_configured' ? 'unavailable' : 'degraded',
    poolUsageCategory: pool.poolUsageCategory,
    poolWaitCategory: pool.poolWaitCategory,
    queryLatencyCategory: 'normal',
    timeoutCategory: 'none',
    transactionRetryCategory: 'none',
    recentErrorCategory: status === 'connected' ? 'none' : 'database_unavailable',
    timeoutHierarchy: timeoutHierarchy(),
  };
}

async function cacheHealth() {
  const health = await cacheAdapter.health();
  const hits = Number(health.statistics?.hits || 0);
  const misses = Number(health.statistics?.misses || 0);
  const total = hits + misses;
  const hitRate = total ? hits / total : 0;
  return {
    adapterType: health.adapterType,
    status: health.status,
    hitRateCategory: !total ? 'none' : hitRate >= 0.8 ? 'high' : hitRate >= 0.4 ? 'moderate' : 'low',
    missRateCategory: !total ? 'none' : hitRate >= 0.8 ? 'low' : hitRate >= 0.4 ? 'moderate' : 'high',
    invalidationLagCategory: 'none',
    memoryUsageCategory: health.memoryUsageCategory || 'none',
    distributedCacheLatencyCategory: health.adapterType === 'distributed' ? 'unknown' : 'not_applicable',
    refreshContentionCategory: 'low',
    entryCategory: health.entryCategory || 'none',
  };
}

function mongooseIndexAdapter(connection = mongoose.connection) {
  return {
    async listIndexes(collectionName) {
      try {
        return await connection.collection(collectionName).indexes();
      } catch (error) {
        if (error?.codeName === 'NamespaceNotFound' || error?.code === 26) return [];
        throw error;
      }
    },
    createIndex(collectionName, keys, options) {
      return connection.collection(collectionName).createIndex(keys, options);
    },
    async findDuplicate(collectionName, keys) {
      const fields = Object.keys(keys);
      const id = Object.fromEntries(fields.map((field) => [field, `$${field}`]));
      const result = await connection.collection(collectionName).aggregate([
        { $group: { _id: id, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 },
      ], { maxTimeMS: env.DATABASE_SERVICE_BUDGET_MS, allowDiskUse: false }).toArray();
      return result[0];
    },
  };
}

async function inspectIndexDrift(options = {}) {
  const adapter = options.adapter || mongooseIndexAdapter();
  const collections = [...new Set(INDEX_MANIFEST.map((entry) => entry.collectionName))];
  const actual = {};
  for (const collectionName of collections) actual[collectionName] = await adapter.listIndexes(collectionName);
  return compareIndexManifest(actual);
}

async function reconcileGovernedIndex(indexName, options = {}) {
  const result = await reconcileIndex(indexName, options.adapter || mongooseIndexAdapter(), {
    dryRun: options.dryRun,
    allowPrivilegedUnique: options.allowPrivilegedUnique,
  });
  metrics.increment('index_reconciliation_count', { status: result.status, operation: result.action });
  return result;
}

async function recordIndexDriftSnapshot(options = {}) {
  const records = await inspectIndexDrift(options);
  const detectedAt = new Date(options.now || Date.now());
  const expiresAt = new Date(detectedAt.getTime() + 7 * 86_400_000);
  if (records.length) {
    await (options.IndexDriftRecord || IndexDriftRecord).bulkWrite(records.slice(0, 250).map((record) => ({
      updateOne: {
        filter: { collectionName: record.collectionName, indexName: record.indexName },
        update: { $set: { status: record.status, safeReasonCode: String(record.reasonCode || 'INDEX_HEALTHY').toUpperCase(), detectedAt, migrationVersion: record.migrationVersion, expiresAt, ...(record.status === 'healthy' ? { resolvedAt: detectedAt } : {}) } },
        upsert: true,
      },
    })), { ordered: false });
  }
  for (const record of records.filter((entry) => entry.status !== 'healthy')) metrics.increment('index_drift_count', { status: record.status });
  return records;
}

function safeQueryPlanSummary(queryShapeId, explain = {}) {
  const shape = getQueryShape(queryShapeId);
  const indexName = String(explain.indexName || '');
  return {
    queryShapeId: shape.queryShapeId,
    winningPlanCategory: explain.collectionScan === true ? 'collection_scan' : shape.expectedIndexNames.includes(indexName) ? 'expected_index' : indexName ? 'alternate_index' : 'unknown',
    indexName: SAFE_IDENTIFIER.test(indexName) ? indexName : undefined,
    executionStageCategory: ['index_scan', 'collection_scan', 'covered_query', 'unknown'].includes(explain.executionStageCategory) ? explain.executionStageCategory : 'unknown',
    resultCount: Math.max(0, Math.min(Number(explain.resultCount || 0), shape.maximumResultCount)),
    documentsExaminedCategory: explain.documentsExaminedCategory || 'unknown',
    keysExaminedCategory: explain.keysExaminedCategory || 'unknown',
    durationCategory: explain.durationCategory || 'unknown',
    warnings: classifySlowQuery({ indexUsageCategory: explain.collectionScan ? 'collection_scan' : 'unknown', expectedIndexMissing: !indexName, durationMs: explain.durationMs }, {}).safeReasonCodes,
  };
}

async function closeCache() {
  await cacheAdapter.close();
}

module.exports = {
  INDEX_MANIFEST,
  QUERY_SHAPES,
  assertOperationalAccess,
  audit,
  authorize,
  cacheAdapter,
  cacheAside,
  cacheHealth,
  closeCache,
  databaseHealth,
  defaultPerformancePolicy,
  inspectIndexDrift,
  listCacheNamespaces,
  listQueryShapes,
  mongooseIndexAdapter,
  normalizePerformancePolicy,
  reconcileGovernedIndex,
  recordIndexDriftSnapshot,
  safeQueryPlanSummary,
  scopeFrom,
  timeoutHierarchy,
  validatePerformancePolicy,
};
