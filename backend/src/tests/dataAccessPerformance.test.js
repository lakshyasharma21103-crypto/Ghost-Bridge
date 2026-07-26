const assert = require('node:assert/strict');
const test = require('node:test');
const CacheInvalidationEvent = require('../models/CacheInvalidationEvent');
const DataAccessPerformancePolicy = require('../models/DataAccessPerformancePolicy');
const IndexDriftRecord = require('../models/IndexDriftRecord');
const ProjectionMetadata = require('../models/ProjectionMetadata');
const QueryPerformanceSample = require('../models/QueryPerformanceSample');
const { getPermission } = require('../constants/permissionRegistry');
const { CONSISTENCY_CLASSES } = require('../constants/dataAccessPerformance');
const { mongoClientOptions } = require('../config/db');
const cache = require('../services/dataAccessCache.service');
const metrics = require('../services/dataAccessMetrics.service');
const core = require('../services/dataAccessPerformance.service');
const {
  DeterministicDataAccessHarness,
  FailingCacheAdapter,
  runHarnessVerification,
} = require('../services/dataAccessPerformanceHarness.service');
const {
  GovernedRepository,
  QueryCountProbe,
  trustedRequestContext,
} = require('../services/dataAccessRepository.service');
const registry = require('../services/dataAccessRegistry.service');
const { ensureModelIndexes } = require('../../scripts/migrateDataAccessPerformance');

const SECRET = 'unit-test-data-access-secret';

test('query-shape registry is static, bounded, unique, and index-backed', () => {
  const shapes = registry.listQueryShapes();
  assert.ok(shapes.length >= 20);
  assert.equal(new Set(shapes.map((shape) => shape.queryShapeId)).size, shapes.length);
  assert.ok(shapes.every((shape) => shape.maximumPageSize <= 100));
  assert.ok(shapes.every((shape) => shape.expectedIndexNames.length || shape.boundedScanStrategy));
  assert.throws(() => registry.staticRegistry([shapes[0], shapes[0]]), /duplicate/i);
  assert.equal(registry.getQueryShape('orchestration_runs_list').consistencyClass, CONSISTENCY_CLASSES.STRONG_AUTHORITY);
});

test('unregistered query shapes and unbounded filters are rejected', () => {
  assert.throws(() => registry.getQueryShape('user-defined-shape'), (error) => error.code === 'QUERY_SHAPE_NOT_REGISTERED');
  assert.throws(() => registry.validateFilter('orchestration_runs_list', { unrestricted: 'value' }), (error) => error.code === 'QUERY_FILTER_NOT_ALLOWED');
  assert.throws(() => registry.validateFilter('orchestration_runs_list', { status: { $where: 'return true' } }), (error) => error.code === 'QUERY_FILTER_NOT_ALLOWED');
  assert.throws(() => registry.validateFilter('orchestration_runs_list', { status: { $regex: '.*' } }), (error) => error.code === 'QUERY_FILTER_NOT_ALLOWED');
  assert.throws(() => registry.assertNoDangerousOperators({ $function: { body: 'return 1' } }), (error) => error.code === 'QUERY_FILTER_NOT_ALLOWED');
});

test('sort fields, page sizes, and operation timeouts are bounded', () => {
  assert.deepEqual(registry.normalizeSort('orchestration_runs_list', { createdAt: -1 }), { createdAt: -1, _id: -1 });
  assert.throws(() => registry.normalizeSort('orchestration_runs_list', { credential: 1 }), (error) => error.code === 'QUERY_SORT_NOT_ALLOWED');
  assert.throws(() => registry.validateQueryRequest('orchestration_runs_list', { limit: 101 }), (error) => error.code === 'QUERY_LIMIT_EXCEEDED');
  assert.throws(() => registry.validateQueryRequest('orchestration_runs_list', { maximumTimeMS: 5_001 }), (error) => error.code === 'QUERY_LIMIT_EXCEEDED');
});

test('cursor pagination is signed and bound to shape, tenant, workspace, filter, and sort', () => {
  const input = { queryShapeId: 'orchestration_runs_list', organizationId: 'tenant-a', workspaceId: 'workspace-a', sort: { createdAt: -1, _id: -1 }, filter: { status: 'running' }, lastValues: { createdAt: '2026-01-01T00:00:00.000Z' }, lastRecordId: 'record-a', issuedAt: 1_000, expiresAt: 10_000 };
  const token = registry.encodeCursor(input, { secret: SECRET });
  assert.equal(registry.decodeCursor(token, input, { secret: SECRET, now: 2_000 }).lastRecordId, 'record-a');
  for (const expected of [
    { ...input, organizationId: 'tenant-b' },
    { ...input, workspaceId: 'workspace-b' },
    { ...input, queryShapeId: 'agent_selection_decisions_list' },
    { ...input, filter: { status: 'queued' } },
  ]) assert.throws(() => registry.decodeCursor(token, expected, { secret: SECRET, now: 2_000 }), (error) => error.code === 'QUERY_CURSOR_INVALID');
  assert.throws(() => registry.decodeCursor(`${token}x`, input, { secret: SECRET, now: 2_000 }), (error) => error.code === 'QUERY_CURSOR_INVALID');
  assert.throws(() => registry.decodeCursor(token, input, { secret: SECRET, now: 10_001 }), (error) => error.code === 'QUERY_CURSOR_INVALID');
});

test('aggregation governance requires early scope, bounded results, and bounded lookups', () => {
  const context = { organizationId: 'tenant-a', workspaceId: 'workspace-a', allowedLookupCollections: ['orchestrationruns'] };
  const pipeline = registry.validateAggregation('observability_summary_aggregate', [
    { $match: { organizationId: 'tenant-a', workspaceId: 'workspace-a' } },
    { $project: { snapshotAt: 1, runSummary: 1 } },
    { $limit: 20 },
  ], context);
  assert.equal(pipeline.length, 3);
  assert.throws(() => registry.validateAggregation('observability_summary_aggregate', [{ $match: { organizationId: 'tenant-b', workspaceId: 'workspace-a' } }, { $limit: 1 }], context), (error) => error.code === 'QUERY_PIPELINE_NOT_ALLOWED');
  assert.throws(() => registry.validateAggregation('observability_summary_aggregate', [{ $match: { organizationId: 'tenant-a', workspaceId: 'workspace-a' } }, { $function: { body: 'x' } }, { $limit: 1 }], context), (error) => error.code === 'QUERY_PIPELINE_NOT_ALLOWED');
  assert.throws(() => registry.validateAggregation('observability_summary_aggregate', [{ $match: { organizationId: 'tenant-a', workspaceId: 'workspace-a' } }], context), (error) => error.code === 'QUERY_RESULT_LIMIT_EXCEEDED');
  assert.throws(() => registry.validateAggregation('observability_summary_aggregate', [{ $match: { organizationId: 'tenant-a', workspaceId: 'workspace-a', unrestricted: true } }, { $limit: 1 }], context), (error) => error.code === 'QUERY_FILTER_NOT_ALLOWED');
  assert.throws(() => registry.validateAggregation('observability_summary_aggregate', [{ $match: { organizationId: 'tenant-a', workspaceId: 'workspace-a' } }, { $skip: 51 }, { $limit: 1 }], context), (error) => error.code === 'QUERY_RESULT_LIMIT_EXCEEDED');
  assert.throws(() => registry.validateAggregation('observability_summary_aggregate', [{ $match: { organizationId: 'tenant-a', workspaceId: 'workspace-a' } }, { $sort: { credential: 1 } }, { $limit: 1 }], context), (error) => error.code === 'QUERY_SORT_NOT_ALLOWED');
});

test('index manifest drift comparison and additive reconciliation never drop indexes', async () => {
  const expected = registry.INDEX_MANIFEST.find((entry) => entry.indexName === 'dap_orchestration_runs_scope_created');
  const actual = {};
  const calls = [];
  const adapter = {
    async listIndexes(collectionName) { return actual[collectionName] || []; },
    async createIndex(collectionName, key, options) { calls.push({ operation: 'create', collectionName, key, options }); actual[collectionName] = [{ name: options.name, key }]; },
    async dropIndex() { calls.push({ operation: 'drop' }); },
  };
  assert.equal(registry.compareIndexManifest(actual, [expected])[0].status, 'missing');
  assert.equal((await registry.reconcileIndex(expected, adapter)).action, 'created');
  assert.equal(registry.compareIndexManifest(actual, [expected])[0].status, 'healthy');
  assert.equal(calls.some((call) => call.operation === 'drop'), false);
  actual[expected.collectionName][0].key = { organizationId: 1 };
  assert.equal(registry.compareIndexManifest(actual, [expected])[0].status, 'mismatched');
  assert.equal((await registry.reconcileIndex(expected, adapter)).action, 'recorded_drift');
});

test('unique index reconciliation requires an explicit privileged preflight', async () => {
  const expected = registry.INDEX_MANIFEST.find((entry) => entry.unique && !entry.automaticReconciliationAllowed);
  const adapter = { listIndexes: async () => [], createIndex: async () => assert.fail('must not create without preflight'), findDuplicate: async () => null };
  const result = await registry.reconcileIndex(expected, adapter);
  assert.equal(result.status, 'migration_required');
});

test('additive migration reports a named index mismatch without changing it', async () => {
  let createCalls = 0;
  const Model = {
    collection: {
      async indexes() { return [{ name: 'stable_name', key: { organizationId: 1 } }]; },
      async createIndex() { createCalls += 1; },
    },
    schema: { indexes() { return [[{ organizationId: 1, workspaceId: 1 }, { name: 'stable_name' }]]; } },
  };
  const result = await ensureModelIndexes(Model);
  assert.equal(result[0].action, 'migration_required');
  assert.equal(result[0].safeReasonCode, 'INDEX_DEFINITION_MISMATCH');
  assert.equal(createCalls, 0);
});

test('cache keys are versioned, tenant isolated, workspace isolated, and contain no raw identifiers', () => {
  const base = { namespace: 'passport_version', organizationId: 'tenant-secret', workspaceId: 'workspace-secret', entityType: 'passport', entityId: 'passport-secret', entityVersion: '7', visibilityScope: 'reader' };
  const key = cache.createCacheKey(base, { secret: SECRET });
  assert.match(key, /^ghostbridge:v1:passport_version:/);
  assert.equal(key.includes('tenant-secret'), false);
  assert.equal(key.includes('workspace-secret'), false);
  assert.equal(key.includes('passport-secret'), false);
  assert.notEqual(key, cache.createCacheKey({ ...base, organizationId: 'tenant-b' }, { secret: SECRET }));
  assert.notEqual(key, cache.createCacheKey({ ...base, workspaceId: 'workspace-b' }, { secret: SECRET }));
});

test('cache namespace, classification, values, depth, getters, and serialized bytes are governed', () => {
  assert.throws(() => cache.createCacheKey({ namespace: 'arbitrary', organizationId: 'a', entityId: 'b' }, { secret: SECRET }), (error) => error.code === 'CACHE_NAMESPACE_NOT_ALLOWED');
  assert.throws(() => cache.serializeCacheValue({ namespace: 'passport_version', classification: 'restricted', scopeBinding: 'scope', value: { id: 'a' } }), (error) => error.code === 'CACHE_CLASSIFICATION_NOT_ALLOWED');
  for (const value of [
    { authorization: 'Bearer abc.def.ghi' },
    { decryptedCredential: 'value' },
    { installKey: 'install-secret' },
    { runtimeToken: 'runtime-secret' },
    { hiddenReasoning: 'private' },
    { nested: { providerApiKey: 'provider-secret' } },
  ]) assert.throws(() => cache.serializeCacheValue({ namespace: 'passport_version', classification: 'internal', scopeBinding: 'scope', value }), (error) => error.code === 'CACHE_VALUE_REJECTED');
  let getterCalled = false;
  const accessor = {};
  Object.defineProperty(accessor, 'unsafe', { enumerable: true, get() { getterCalled = true; return 'value'; } });
  assert.throws(() => cache.serializeCacheValue({ namespace: 'passport_version', classification: 'internal', scopeBinding: 'scope', value: accessor }), (error) => error.code === 'CACHE_VALUE_REJECTED');
  assert.equal(getterCalled, false);
  const circular = {}; circular.self = circular;
  assert.throws(() => cache.serializeCacheValue({ namespace: 'passport_version', classification: 'internal', scopeBinding: 'scope', value: circular }), (error) => error.code === 'CACHE_VALUE_REJECTED');
  assert.throws(() => cache.serializeCacheValue({ namespace: 'passport_version', classification: 'internal', scopeBinding: 'scope', value: { data: 'x'.repeat(300_000) } }), (error) => error.code === 'CACHE_VALUE_LIMIT_EXCEEDED');
});

test('bounded memory cache applies deterministic LRU eviction and TTL expiry', async () => {
  const adapter = new cache.BoundedMemoryCacheAdapter({ maximumEntries: 2, maximumBytes: 10_000 });
  await adapter.set('a', '1', { ttlMs: 1_000, now: 1_000 });
  await adapter.set('b', '2', { ttlMs: 1_000, now: 1_000 });
  await adapter.get('a', { now: 1_100 });
  await adapter.set('c', '3', { ttlMs: 1_000, now: 1_100 });
  assert.equal(await adapter.get('b', { now: 1_100 }), null);
  assert.equal((await adapter.get('a', { now: 1_100 })).value, '1');
  assert.equal(await adapter.get('a', { now: 2_001 }), null);
});

test('cache-aside authorizes first, bypasses authority data, survives outages, and prevents stampedes', async () => {
  const adapter = new cache.BoundedMemoryCacheAdapter({ maximumEntries: 20, maximumBytes: 100_000 });
  const service = new cache.CacheAsideService({ adapter, keySecret: SECRET, metrics });
  let loads = 0;
  const input = { namespace: 'passport_version', organizationId: 'tenant-a', workspaceId: 'workspace-a', entityType: 'passport', entityId: 'passport-a', entityVersion: '1', visibilityScope: 'reader', classification: 'internal', consistencyClass: CONSISTENCY_CLASSES.VERSIONED_IMMUTABLE, authorize: async () => {} };
  const results = await Promise.all(Array.from({ length: 20 }, () => service.read(input, async () => { loads += 1; await Promise.resolve(); return { id: 'passport-a', version: '1' }; })));
  assert.equal(loads, 1);
  assert.ok(results.every((result) => result.value.version === '1'));
  await assert.rejects(() => service.read({ ...input, authorize: async () => { throw Object.assign(new Error('denied'), { code: 'AUTHORIZATION_DENIED' }); } }, async () => null), (error) => error.code === 'AUTHORIZATION_DENIED');
  const authority = await service.read({ ...input, consistencyClass: CONSISTENCY_CLASSES.STRONG_AUTHORITY }, async () => ({ active: true }));
  assert.equal(authority.cacheOutcome, 'cache_bypass');
  const failing = new cache.CacheAsideService({ adapter: new FailingCacheAdapter(), keySecret: SECRET, metrics });
  assert.deepEqual((await failing.read(input, async () => ({ id: 'authoritative' }))).value, { id: 'authoritative' });
});

test('negative caching is restricted to explicit not-found results', async () => {
  const adapter = new cache.BoundedMemoryCacheAdapter({ maximumEntries: 20, maximumBytes: 100_000 });
  const service = new cache.CacheAsideService({ adapter, keySecret: SECRET, metrics });
  const base = { namespace: 'passport_version', organizationId: 'tenant-a', workspaceId: 'workspace-a', entityType: 'passport', entityId: 'missing', entityVersion: '1', visibilityScope: 'reader', classification: 'internal', consistencyClass: CONSISTENCY_CLASSES.VERSIONED_IMMUTABLE, authorize: async () => {} };
  let loads = 0;
  assert.equal((await service.read({ ...base, negativeReason: 'not_found' }, async () => { loads += 1; return null; })).negative, true);
  assert.equal((await service.read({ ...base, negativeReason: 'not_found' }, async () => { loads += 1; return null; })).negative, true);
  assert.equal(loads, 1);
  const denied = { ...base, entityId: 'denied', negativeReason: 'authorization_denied' };
  await service.read(denied, async () => { loads += 1; return null; });
  await service.read(denied, async () => { loads += 1; return null; });
  assert.equal(loads, 3);
});

test('trusted repository context enforces tenant and workspace scope', () => {
  const context = trustedRequestContext({ organizationId: 'tenant-a', workspaceId: 'workspace-a', actorId: 'actor-a', requestId: 'request-a', traceId: 'trace-a', allowedVisibilityScope: 'tenant', queryShapeId: 'orchestration_runs_list', repositoryBudgetMs: 6_000 });
  assert.equal(context.organizationId, 'tenant-a');
  assert.throws(() => trustedRequestContext({ organizationId: 'tenant-a', actorId: 'actor-a', requestId: 'request-a', traceId: 'trace-a', queryShapeId: 'orchestration_runs_list', repositoryBudgetMs: 6_000 }), (error) => error.code === 'VALIDATION_ERROR');
});

test('query-count instrumentation detects suspected N+1 access', () => {
  const probe = new QueryCountProbe(2);
  probe.record('orchestration_runs_list');
  probe.record('orchestration_runs_list');
  assert.throws(() => probe.record('orchestration_runs_list'), (error) => error.code === 'QUERY_N_PLUS_ONE_SUSPECTED');
});

test('governed repository applies scope, projection, timeout, and cursor without missing rows', async () => {
  const values = [
    { _id: 'run-3', organizationId: 'tenant-a', workspaceId: 'workspace-a', createdAt: '2026-01-03T00:00:00.000Z', status: 'running', secret: 'never-return' },
    { _id: 'run-2', organizationId: 'tenant-a', workspaceId: 'workspace-a', createdAt: '2026-01-02T00:00:00.000Z', status: 'running', secret: 'never-return' },
    { _id: 'run-1', organizationId: 'tenant-a', workspaceId: 'workspace-a', createdAt: '2026-01-01T00:00:00.000Z', status: 'running', secret: 'never-return' },
    { _id: 'run-cross-tenant', organizationId: 'tenant-b', workspaceId: 'workspace-a', createdAt: '2026-01-04T00:00:00.000Z', status: 'running', secret: 'never-return' },
  ];
  function match(record, filter) {
    if (filter.$and) return filter.$and.every((entry) => match(record, entry));
    if (filter.$or) return filter.$or.some((entry) => match(record, entry));
    return Object.entries(filter).every(([key, expected]) => {
      const actual = record[key];
      if (expected && typeof expected === 'object') {
        if (expected.$in) return expected.$in.includes(actual);
        if (expected.$lt !== undefined) return actual < expected.$lt;
        if (expected.$gt !== undefined) return actual > expected.$gt;
      }
      return actual === expected;
    });
  }
  class FakeQuery {
    constructor(filter) { this.filter = filter; this.sortValue = {}; this.limitValue = 100; this.projection = {}; }
    select(value) { this.projection = value; return this; }
    sort(value) { this.sortValue = value; return this; }
    limit(value) { this.limitValue = value; return this; }
    maxTimeMS(value) { this.timeout = value; return this; }
    comment(value) { this.queryShapeId = value; return this; }
    lean() { return this; }
    execute() {
      const entries = Object.entries(this.sortValue);
      return values.filter((record) => match(record, this.filter)).sort((left, right) => {
        for (const [field, direction] of entries) { const compared = String(left[field]).localeCompare(String(right[field])); if (compared) return compared * direction; }
        return 0;
      }).slice(0, this.limitValue).map((record) => Object.fromEntries(Object.entries(record).filter(([key]) => this.projection[key] !== 0)));
    }
    then(resolve, reject) { return Promise.resolve(this.execute()).then(resolve, reject); }
  }
  const Model = { lastQuery: null, find(filter) { this.lastQuery = new FakeQuery(filter); return this.lastQuery; } };
  const repository = new GovernedRepository({ modelsByCollection: { orchestrationruns: Model }, cursorSecret: SECRET, sampleWriter: async () => { throw new Error('diagnostic store unavailable'); } });
  const context = { organizationId: 'tenant-a', workspaceId: 'workspace-a', actorId: 'actor-a', requestId: 'request-a', traceId: 'trace-a', allowedVisibilityScope: 'tenant', queryShapeId: 'orchestration_runs_list', repositoryBudgetMs: 6_000 };
  const first = await repository.findMany(context, { filter: { status: 'running' }, limit: 2, projection: { secret: 0 } });
  const second = await repository.findMany(context, { filter: { status: 'running' }, limit: 2, cursor: first.nextCursor, projection: { secret: 0 } });
  assert.deepEqual([...first.items, ...second.items].map((item) => item._id), ['run-3', 'run-2', 'run-1']);
  assert.ok([...first.items, ...second.items].every((item) => item.organizationId === 'tenant-a' && item.secret === undefined));
  assert.equal(Model.lastQuery.timeout, 5_000);
  assert.equal(Model.lastQuery.queryShapeId, 'orchestration_runs_list');
});

test('timeout hierarchy, document size, and safe diagnostics are deterministic', () => {
  assert.equal(core.timeoutHierarchy().valid, true);
  assert.throws(() => registry.validateTimeoutHierarchy({ databaseOperationMs: 5_000, repositoryBudgetMs: 4_000, serviceBudgetMs: 10_000, httpRequestMs: 20_000, leaseSafetyMarginMs: 10_000, workerOperationMs: 20_000, jobLeaseMs: 30_000 }), (error) => error.code === 'DATABASE_TIMEOUT_HIERARCHY_INVALID');
  assert.equal(registry.documentSizeCategory({ value: 'small' }, 1_000).sizeCategory, 'small');
  assert.throws(() => registry.assertDocumentSize({ value: 'x'.repeat(2_000) }, 1_000), (error) => error.code === 'DOCUMENT_SIZE_LIMIT_EXCEEDED');
  const sample = registry.safeQuerySample({ organizationId: 'tenant-a', workspaceId: 'workspace-a', queryShapeId: 'orchestration_runs_list', durationMs: 900, resultCount: 5, documentsExamined: 5_000, rawFilter: { password: 'secret' }, searchText: 'private' });
  assert.equal(JSON.stringify(sample).includes('rawFilter'), false);
  assert.equal(JSON.stringify(sample).includes('private'), false);
  assert.ok(sample.expiresAt > sample.sampledAt);
  assert.equal(registry.classifySlowQuery({ durationMs: 900, documentsExamined: 5_000, resultCount: 5, indexUsageCategory: 'collection_scan' }, { slowQueryThresholdMs: 500 }).slow, true);
});

test('connection pool settings are bounded and contain no URI or credentials', () => {
  const options = mongoClientOptions();
  assert.ok(options.maxPoolSize >= options.minPoolSize);
  assert.ok(options.waitQueueTimeoutMS > 0);
  assert.equal(JSON.stringify(options).toLowerCase().includes('uri'), false);
  assert.equal(JSON.stringify(options).toLowerCase().includes('password'), false);
});

test('new models use deterministic indexes and contain no raw diagnostic payload fields', () => {
  const schemas = [DataAccessPerformancePolicy, CacheInvalidationEvent, QueryPerformanceSample, ProjectionMetadata, IndexDriftRecord];
  assert.ok(schemas.every((Model) => Model.schema.indexes().every(([, options]) => options.name)));
  assert.ok(CacheInvalidationEvent.schema.indexes().some(([, options]) => options.name === 'dap_cache_invalidation_claim'));
  assert.ok(QueryPerformanceSample.schema.indexes().some(([, options]) => options.name === 'dap_query_sample_expiry'));
  assert.equal(QueryPerformanceSample.schema.path('rawFilter'), undefined);
  assert.equal(QueryPerformanceSample.schema.path('searchText'), undefined);
  assert.equal(CacheInvalidationEvent.schema.path('payload'), undefined);
});

test('privileged data-performance permissions are not granted to normal viewer or developer roles', () => {
  for (const permissionId of ['queryPerformance.explain', 'databaseIndex.reconcile', 'cacheOperations.invalidate', 'cacheOperations.warm', 'projectionOperations.rebuild', 'databasePool.read']) {
    const permission = getPermission(permissionId);
    assert.ok(permission);
    assert.equal(permission.defaultRoles.includes('viewer'), false);
    assert.equal(permission.defaultRoles.includes('developer'), false);
  }
});

test('metrics reject high-cardinality identifier labels', () => {
  metrics.reset();
  metrics.increment('database_query_count', { queryShapeId: 'orchestration_runs_list', organizationId: 'tenant-a', requestId: 'request-a' });
  const snapshot = metrics.snapshot();
  assert.equal(JSON.stringify(snapshot).includes('tenant-a'), false);
  assert.equal(JSON.stringify(snapshot).includes('request-a'), false);
  assert.equal(metrics.assertBoundedMetricLabels(snapshot), true);
});

test('deterministic multi-instance harness verifies pagination, cache, invalidation, projection resume, and drift', async () => {
  const result = await runHarnessVerification();
  assert.equal(result.all.length, 17);
  assert.equal(result.harness.invalidationModel.records[0].status, 'completed');
});

test('cache invalidation idempotency rejects a conflicting replay', async () => {
  const harness = new DeterministicDataAccessHarness();
  const base = { organizationId: 'tenant-a', workspaceId: 'workspace-a', entityId: 'definition-a', entityVersion: '2', idempotencyKey: 'same-activation' };
  const first = await harness.activateVersion(base);
  assert.equal((await harness.activateVersion(base))._id, first._id);
  await assert.rejects(() => harness.activateVersion({ ...base, entityVersion: '3' }), (error) => error.code === 'IDEMPOTENCY_CONFLICT');
});

test('tenant and workspace cursor pages have no duplicates or missing records', () => {
  const harness = new DeterministicDataAccessHarness();
  harness.seed();
  const ids = [];
  let cursor;
  do {
    const page = harness.page({ organizationId: 'tenant-b', workspaceId: 'tenant-b-workspace-2', limit: 4, cursor });
    ids.push(...page.items.map((item) => item._id));
    cursor = page.nextCursor;
  } while (cursor);
  assert.equal(ids.length, 17);
  assert.equal(new Set(ids).size, 17);
  assert.ok(ids.every((id) => id.includes('tenant-b-workspace-2')));
});
