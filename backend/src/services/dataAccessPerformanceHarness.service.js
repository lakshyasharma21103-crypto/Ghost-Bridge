const assert = require('node:assert/strict');
const {
  BoundedMemoryCacheAdapter,
  CacheAsideService,
  NoopCacheAdapter,
  createCacheKey,
  deserializeCacheValue,
  serializeCacheValue,
} = require('./dataAccessCache.service');
const {
  INDEX_MANIFEST,
  compareIndexManifest,
  createCursorFromRecord,
  decodeCursor,
  getQueryShape,
  listQueryShapes,
  reconcileIndex,
  safeQuerySample,
} = require('./dataAccessRegistry.service');
const {
  createInvalidationEvent,
  processInvalidationBatch,
  rebuildProjection,
} = require('./dataAccessProjection.service');
const { CONSISTENCY_CLASSES } = require('../constants/dataAccessPerformance');
const metrics = require('./dataAccessMetrics.service');

const SECRET = 'deterministic-data-access-harness-secret';

function same(left, right) { return String(left) === String(right); }

function matches(record, filter) {
  if (!filter) return true;
  if (filter.$and) return filter.$and.every((entry) => matches(record, entry));
  if (filter.$or) return filter.$or.some((entry) => matches(record, entry));
  return Object.entries(filter).every(([key, expected]) => {
    const actual = record[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if (expected.$in && !expected.$in.some((value) => same(actual, value))) return false;
      if (expected.$lte !== undefined && !(new Date(actual).getTime() <= new Date(expected.$lte).getTime())) return false;
      if (expected.$ne !== undefined && same(actual, expected.$ne)) return false;
      return true;
    }
    return same(actual, expected);
  });
}

function applyUpdate(record, update) {
  for (const [key, value] of Object.entries(update.$set || {})) {
    if (value === undefined) delete record[key]; else record[key] = value;
  }
  for (const [key, value] of Object.entries(update.$inc || {})) record[key] = Number(record[key] || 0) + Number(value);
  for (const key of Object.keys(update.$unset || {})) delete record[key];
  return record;
}

class InMemoryInvalidationModel {
  constructor() { this.records = []; this.nextId = 1; }
  async findOne(filter) { return this.records.find((record) => matches(record, filter)) || null; }
  async create(input) {
    const many = Array.isArray(input) ? input : [input];
    const records = many.map((entry) => ({ ...entry, _id: `invalidation-${this.nextId++}`, createdAt: entry.createdAt || new Date(), updatedAt: entry.updatedAt || new Date() }));
    this.records.push(...records);
    return Array.isArray(input) ? records : records[0];
  }
  async findOneAndUpdate(filter, update, options = {}) {
    let candidates = this.records.filter((record) => matches(record, filter));
    if (options.sort?.sequence) candidates = candidates.sort((left, right) => left.sequence - right.sequence);
    const record = candidates[0];
    if (!record) return null;
    applyUpdate(record, update);
    record.updatedAt = new Date();
    return { ...record };
  }
  async updateOne(filter, update) {
    const record = this.records.find((entry) => matches(entry, filter));
    if (!record) return { matchedCount: 0, modifiedCount: 0 };
    applyUpdate(record, update);
    return { matchedCount: 1, modifiedCount: 1 };
  }
}

class FailingCacheAdapter extends NoopCacheAdapter {
  constructor() { super(); this.adapterType = 'failing_test_adapter'; }
  async get() { throw new Error('CACHE_UNAVAILABLE'); }
  async set() { throw new Error('CACHE_UNAVAILABLE'); }
  async acquireLease() { throw new Error('CACHE_UNAVAILABLE'); }
  async invalidateTags() { throw new Error('CACHE_UNAVAILABLE'); }
  async health() { return { adapterType: this.adapterType, status: 'degraded' }; }
}

function projectionStores(sourceRecords) {
  const metadata = new Map();
  const target = new Map();
  const keyOf = (input) => `${input.organizationId}:${input.workspaceId}:${input.projectionName}`;
  return {
    metadata: {
      async claim(input) {
        const key = keyOf(input);
        const current = metadata.get(key);
        if (current?.status === 'rebuilding' && new Date(current.leaseExpiresAt).getTime() > input.now.getTime()) return null;
        const record = {
          projectionName: input.projectionName,
          projectionVersion: input.projectionVersion,
          organizationId: input.organizationId,
          workspaceId: input.workspaceId,
          status: 'rebuilding',
          rebuildCheckpoint: current?.rebuildCheckpoint || 0,
          sourceSequence: current?.sourceSequence || 0,
          leaseOwner: input.workerId,
          leaseEpoch: Number(current?.leaseEpoch || 0) + 1,
          leaseExpiresAt: new Date(input.now.getTime() + input.leaseMs),
        };
        metadata.set(key, record);
        return { ...record };
      },
      async checkpoint(input) {
        const key = keyOf(input); const current = metadata.get(key);
        if (!current || current.leaseOwner !== input.workerId || current.leaseEpoch !== input.leaseEpoch) return null;
        Object.assign(current, { rebuildCheckpoint: input.checkpoint, sourceSequence: input.checkpoint, lastProcessedAt: input.lastProcessedAt });
        return { ...current };
      },
      async complete(input) {
        const key = keyOf(input); const current = metadata.get(key);
        if (!current || current.leaseOwner !== input.workerId || current.leaseEpoch !== input.leaseEpoch) return null;
        Object.assign(current, { status: 'active', rebuildCheckpoint: input.checkpoint, sourceSequence: input.checkpoint, lastRebuildAt: input.completedAt });
        delete current.leaseOwner;
        return { ...current };
      },
      async fail(input) {
        const current = metadata.get(keyOf(input));
        if (current && current.leaseOwner === input.workerId && current.leaseEpoch === input.leaseEpoch) Object.assign(current, { status: 'failed', safeFailureCode: input.safeFailureCode });
      },
    },
    source: {
      async readBatch(input) { return sourceRecords.filter((record) => record.organizationId === input.organizationId && record.workspaceId === input.workspaceId && record.sequence > input.afterSequence).sort((left, right) => left.sequence - right.sequence).slice(0, input.limit); },
    },
    target: {
      async bulkUpsert(writes, options) {
        assert.ok(writes.length <= options.maximumBatchSize);
        for (const write of writes) target.set(write.idempotencyKey, write);
      },
    },
    metadataRecords: metadata,
    targetRecords: target,
  };
}

class DeterministicDataAccessHarness {
  constructor() {
    this.now = new Date('2026-01-01T00:00:00.000Z');
    this.records = [];
    this.invalidationModel = new InMemoryInvalidationModel();
    this.sharedCache = new BoundedMemoryCacheAdapter({ maximumEntries: 100, maximumBytes: 2_000_000 });
    this.processA = new CacheAsideService({ adapter: this.sharedCache, keySecret: SECRET, metrics });
    this.processB = new CacheAsideService({ adapter: this.sharedCache, keySecret: SECRET, metrics });
    this.aliases = new Map();
    this.authoritativeLoads = 0;
    this.actualIndexes = {};
  }

  seed() {
    const tenants = ['tenant-a', 'tenant-b'];
    for (const organizationId of tenants) {
      for (const workspaceId of [`${organizationId}-workspace-1`, `${organizationId}-workspace-2`]) {
        for (let index = 0; index < 17; index += 1) {
          this.records.push({ _id: `${organizationId}-${workspaceId}-${String(index).padStart(2, '0')}`, organizationId, workspaceId, createdAt: new Date(this.now.getTime() + index * 1_000).toISOString(), status: index % 2 ? 'running' : 'queued', definitionId: `definition-${index % 3}` });
        }
      }
    }
    return { tenants, recordCount: this.records.length };
  }

  page(input) {
    const shape = getQueryShape('orchestration_runs_list');
    const sort = shape.defaultSort;
    let records = this.records.filter((record) => record.organizationId === input.organizationId && record.workspaceId === input.workspaceId);
    records.sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right._id.localeCompare(left._id));
    if (input.cursor) {
      const claims = decodeCursor(input.cursor, { queryShapeId: shape.queryShapeId, organizationId: input.organizationId, workspaceId: input.workspaceId, sort, filter: {} }, { secret: SECRET, now: this.now.getTime() });
      const index = records.findIndex((record) => record._id === claims.lastRecordId);
      records = records.slice(index + 1);
    }
    const limit = Math.max(1, Math.min(Number(input.limit || 5), shape.maximumPageSize));
    const items = records.slice(0, limit);
    return {
      items,
      nextCursor: records.length > limit ? createCursorFromRecord(shape.queryShapeId, items.at(-1), { organizationId: input.organizationId, workspaceId: input.workspaceId, sort, filter: {} }, { secret: SECRET }) : null,
    };
  }

  async readImmutable(process, input = {}) {
    return process.read({
      namespace: 'orchestration_definition_version',
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      entityType: 'orchestration_definition',
      entityId: input.entityId,
      entityVersion: input.entityVersion,
      visibilityScope: 'workspace_read',
      classification: 'internal',
      consistencyClass: CONSISTENCY_CLASSES.VERSIONED_IMMUTABLE,
      authorize: async () => { if (input.authorized === false) throw Object.assign(new Error('denied'), { code: 'AUTHORIZATION_DENIED' }); },
      negativeReason: input.negativeReason,
    }, async () => {
      this.authoritativeLoads += 1;
      return input.loader ? input.loader() : { id: input.entityId, version: input.entityVersion, name: `Definition ${input.entityVersion}` };
    });
  }

  async activateVersion(input) {
    this.aliases.set(`${input.organizationId}:${input.workspaceId}:${input.entityId}`, input.entityVersion);
    return createInvalidationEvent({ ...input, now: this.now, namespace: 'active_version_alias', entityType: 'orchestration_definition', invalidationTags: ['active_alias'], invalidationReasonCode: 'VERSION_ACTIVATED', requestId: 'request-harness', traceId: 'trace-harness', sequence: this.invalidationModel.records.length + 1 }, { CacheInvalidationEvent: this.invalidationModel });
  }

  async processInvalidations(workerId = 'worker-b') {
    return processInvalidationBatch({ CacheInvalidationEvent: this.invalidationModel, cacheAdapter: this.sharedCache, workerId, maximumBatchSize: 10, now: this.now });
  }

  indexAdapter() {
    return {
      listIndexes: async (collectionName) => this.actualIndexes[collectionName] || [],
      createIndex: async (collectionName, key, options) => {
        const indexes = this.actualIndexes[collectionName] || [];
        indexes.push({ name: options.name, key, unique: options.unique, sparse: options.sparse, partialFilterExpression: options.partialFilterExpression, expireAfterSeconds: options.expireAfterSeconds, collation: options.collation });
        this.actualIndexes[collectionName] = indexes;
      },
      findDuplicate: async () => null,
    };
  }

  drift(manifest = INDEX_MANIFEST) { return compareIndexManifest(this.actualIndexes, manifest); }
}

async function runHarnessVerification() {
  metrics.reset();
  const harness = new DeterministicDataAccessHarness();
  harness.seed();
  assert.ok(listQueryShapes().length >= 20);
  assert.ok(listQueryShapes().every((shape) => shape.expectedIndexNames.length || shape.boundedScanStrategy));

  const all = [];
  let cursor;
  do {
    const page = harness.page({ organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', limit: 5, cursor });
    all.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  assert.equal(all.length, 17);
  assert.equal(new Set(all.map((record) => record._id)).size, all.length);
  assert.ok(all.every((record) => record.organizationId === 'tenant-a' && record.workspaceId === 'tenant-a-workspace-1'));
  const first = harness.page({ organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', limit: 5 });
  assert.throws(() => harness.page({ organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', limit: 5, cursor: `${first.nextCursor}tampered` }), (error) => error.code === 'QUERY_CURSOR_INVALID');

  const miss = await harness.readImmutable(harness.processA, { organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', entityId: 'definition-a', entityVersion: '1' });
  const hit = await harness.readImmutable(harness.processA, { organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', entityId: 'definition-a', entityVersion: '1' });
  assert.equal(miss.cacheOutcome, 'cache_refresh_owner');
  assert.equal(hit.cacheOutcome, 'cache_hit');
  const event = await harness.activateVersion({ organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', entityId: 'definition-a', entityVersion: '2', idempotencyKey: 'activate-v2' });
  assert.equal(event.status, 'pending');
  await harness.processInvalidations('worker-b');
  assert.equal(harness.invalidationModel.records[0].status, 'completed');
  assert.equal(harness.aliases.get('tenant-a:tenant-a-workspace-1:definition-a'), '2');
  const historical = await harness.readImmutable(harness.processA, { organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', entityId: 'definition-a', entityVersion: '1' });
  assert.equal(historical.value.version, '1');
  assert.equal(historical.cacheOutcome, 'cache_hit');

  const failing = new CacheAsideService({ adapter: new FailingCacheAdapter(), keySecret: SECRET, metrics });
  const fallback = await harness.readImmutable(failing, { organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', entityId: 'definition-b', entityVersion: '1' });
  assert.equal(fallback.value.version, '1');
  const beforeConcurrent = harness.authoritativeLoads;
  await Promise.all(Array.from({ length: 12 }, () => harness.readImmutable(harness.processB, { organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', entityId: 'definition-concurrent', entityVersion: '1' })));
  assert.equal(harness.authoritativeLoads - beforeConcurrent, 1);
  await assert.rejects(() => harness.readImmutable(harness.processA, { organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', entityId: 'denied', entityVersion: '1', authorized: false }), (error) => error.code === 'AUTHORIZATION_DENIED');

  const negativeKey = createCacheKey({ namespace: 'orchestration_definition_version', organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', entityType: 'orchestration_definition', entityId: 'missing', entityVersion: '1', visibilityScope: 'workspace_read' }, { secret: SECRET });
  const negative = serializeCacheValue({ namespace: 'orchestration_definition_version', classification: 'internal', scopeBinding: 'scope', negative: true, ttlMs: 1_000, value: { status: 'not_found' } }, { now: 1_000 });
  await harness.sharedCache.set(negativeKey, negative, { ttlMs: 1_000, now: 1_000 });
  assert.equal(deserializeCacheValue((await harness.sharedCache.get(negativeKey, { now: 1_500 })).value, { namespace: 'orchestration_definition_version', scopeBinding: 'scope' }, { now: 1_500 }).negative, true);
  assert.equal(await harness.sharedCache.get(negativeKey, { now: 2_001 }), null);

  const source = Array.from({ length: 7 }, (_, index) => ({ organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', sequence: index + 1, eventType: 'run_updated' }));
  const stores = projectionStores(source);
  const interrupted = await rebuildProjection({ projectionName: 'orchestration_timeline', organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', workerId: 'projection-a', batchSize: 3, maximumBatches: 1, leaseMs: 1_000, now: new Date(1_000), idempotencyKey: 'rebuild-a' }, { ...stores, project: (record) => ({ eventType: record.eventType, sequence: record.sequence }) });
  assert.equal(interrupted.status, 'interrupted');
  const resumed = await rebuildProjection({ projectionName: 'orchestration_timeline', organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', workerId: 'projection-b', batchSize: 3, leaseMs: 1_000, now: new Date(7_000), idempotencyKey: 'rebuild-b' }, { ...stores, project: (record) => ({ eventType: record.eventType, sequence: record.sequence }) });
  assert.equal(resumed.status, 'active');
  assert.equal(stores.targetRecords.size, 7);

  const targetManifest = [INDEX_MANIFEST.find((entry) => entry.indexName === 'dap_orchestration_runs_scope_created')];
  assert.equal(harness.drift(targetManifest)[0].status, 'missing');
  await reconcileIndex(targetManifest[0], harness.indexAdapter());
  assert.equal(harness.drift(targetManifest)[0].status, 'healthy');
  const sample = safeQuerySample({ organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', queryShapeId: 'orchestration_runs_list', durationMs: 900, resultCount: 5, documentsExamined: 5_000, indexUsageCategory: 'collection_scan', rawFilter: { secret: 'must-not-appear' } });
  assert.equal(JSON.stringify(sample).includes('rawFilter'), false);
  assert.equal(JSON.stringify(sample).includes('must-not-appear'), false);

  return { harness, all, sample, metrics: metrics.snapshot() };
}

module.exports = {
  DeterministicDataAccessHarness,
  FailingCacheAdapter,
  InMemoryInvalidationModel,
  projectionStores,
  runHarnessVerification,
};
