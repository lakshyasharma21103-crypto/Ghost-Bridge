const crypto = require('node:crypto');
const { PROJECTION_DEFINITIONS } = require('../constants/dataAccessPerformance');
const { namespaceDefinition } = require('./dataAccessCache.service');
const { assertDocumentSize, assertNoSensitiveFields, dataAccessError } = require('./dataAccessRegistry.service');
const metrics = require('./dataAccessMetrics.service');

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

function safeIdentifier(value, path) {
  const candidate = String(value || '').trim();
  if (!SAFE_IDENTIFIER.test(candidate)) throw dataAccessError('VALIDATION_ERROR', `${path} is invalid.`);
  return candidate;
}

function idempotencyHash(value) {
  return `sha256:${crypto.createHash('sha256').update(String(value || '')).digest('hex')}`;
}

function assertInvalidationReplay(record, expected) {
  if (!record) throw dataAccessError('IDEMPOTENCY_CONFLICT', 'The cache invalidation replay could not be resolved safely.', [], 409);
  const same =
    String(record.organizationId) === expected.organizationId &&
    String(record.workspaceId || '') === String(expected.workspaceId || '') &&
    String(record.namespace) === expected.namespace &&
    String(record.entityType) === expected.entityType &&
    String(record.entityId) === expected.entityId &&
    String(record.entityVersion || '') === String(expected.entityVersion || '') &&
    String(record.invalidationReasonCode) === expected.invalidationReasonCode &&
    JSON.stringify([...(record.invalidationTags || [])].map(String).sort()) === JSON.stringify([...expected.invalidationTags].sort());
  if (!same) throw dataAccessError('IDEMPOTENCY_CONFLICT', 'The idempotency key is bound to another cache invalidation.', [], 409);
  return record;
}

function projectionDefinition(name) {
  const definition = PROJECTION_DEFINITIONS.find((entry) => entry.projectionName === name);
  if (!definition) throw dataAccessError('PROJECTION_NOT_FOUND', 'The requested projection is not registered.', [], 404);
  return definition;
}

function lagCategory(lagMs, thresholdMs = 60_000) {
  const ratio = Math.max(0, Number(lagMs) || 0) / Math.max(1, Number(thresholdMs) || 60_000);
  if (ratio === 0) return 'none';
  if (ratio <= 0.5) return 'low';
  if (ratio <= 1) return 'moderate';
  if (ratio <= 5) return 'high';
  return 'critical';
}

async function createInvalidationEvent(input, options = {}) {
  const Model = options.CacheInvalidationEvent;
  if (!Model) throw new Error('CacheInvalidationEvent model is required.');
  const namespace = namespaceDefinition(input.namespace).namespace;
  const organizationId = safeIdentifier(input.organizationId, 'organizationId');
  const workspaceId = input.workspaceId ? safeIdentifier(input.workspaceId, 'workspaceId') : undefined;
  const entityType = safeIdentifier(input.entityType, 'entityType');
  const entityId = safeIdentifier(input.entityId, 'entityId');
  const entityVersion = input.entityVersion ? safeIdentifier(input.entityVersion, 'entityVersion') : undefined;
  const invalidationTags = [...new Set((input.invalidationTags || []).slice(0, 32).map((tag) => safeIdentifier(tag, 'invalidationTag')))];
  const invalidationReasonCode = safeIdentifier(input.invalidationReasonCode || 'ENTITY_CHANGED', 'invalidationReasonCode');
  const requestId = input.requestId ? safeIdentifier(input.requestId, 'requestId') : undefined;
  const traceId = input.traceId ? safeIdentifier(input.traceId, 'traceId') : undefined;
  const idempotencyKeyHash = idempotencyHash(input.idempotencyKey || `${namespace}:${organizationId}:${workspaceId || 'none'}:${entityType}:${entityId}:${input.entityVersion || 'unversioned'}:${input.invalidationReasonCode}`);
  const expected = { organizationId, workspaceId, namespace, entityType, entityId, entityVersion, invalidationTags, invalidationReasonCode };
  const existing = await Model.findOne({ organizationId, idempotencyKeyHash });
  if (existing) return assertInvalidationReplay(existing, expected);
  const sequence = Number(input.sequence || Date.now());
  try {
    return await Model.create([{
      organizationId,
      workspaceId,
      namespace,
      entityType,
      entityId,
      entityVersion,
      invalidationTags,
      invalidationReasonCode,
      sequence: Math.max(1, Math.floor(sequence)),
      status: 'pending',
      attempt: 0,
      nextAttemptAt: input.now || new Date(),
      idempotencyKeyHash,
      requestId,
      traceId,
      expiresAt: new Date(new Date(input.now || Date.now()).getTime() + Math.max(86_400_000, Number(input.retentionMs || 7 * 86_400_000))),
    }], options.session ? { session: options.session } : undefined).then((records) => records[0]);
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return assertInvalidationReplay(await Model.findOne({ organizationId, idempotencyKeyHash }), expected);
  }
}

async function claimInvalidationEvent(options = {}) {
  const Model = options.CacheInvalidationEvent;
  const workerId = safeIdentifier(options.workerId, 'workerId');
  const now = new Date(options.now || Date.now());
  const leaseMs = Math.max(1_000, Math.min(Number(options.leaseMs || 30_000), 300_000));
  return Model.findOneAndUpdate(
    {
      $and: [
        { nextAttemptAt: { $lte: now } },
        { $or: [{ status: { $in: ['pending', 'failed'] } }, { status: 'processing', leaseExpiresAt: { $lte: now } }] },
      ],
    },
    {
      $set: { status: 'processing', leaseOwner: workerId, leaseExpiresAt: new Date(now.getTime() + leaseMs), safeFailureCode: undefined },
      $inc: { leaseEpoch: 1, attempt: 1 },
    },
    { sort: { sequence: 1, createdAt: 1 }, new: true, runValidators: true },
  );
}

async function processInvalidationEvent(event, options = {}) {
  const Model = options.CacheInvalidationEvent;
  const adapter = options.cacheAdapter;
  const workerId = safeIdentifier(options.workerId, 'workerId');
  const epoch = Number(event.leaseEpoch);
  if (event.leaseOwner !== workerId || !Number.isInteger(epoch)) throw dataAccessError('STALE_WORKER_LEASE', 'The invalidation worker lease is stale.', [], 409);
  try {
    const tags = (event.invalidationTags || []).slice(0, 32);
    await adapter.invalidateTags(tags);
    const completed = await Model.findOneAndUpdate(
      { _id: event._id, status: 'processing', leaseOwner: workerId, leaseEpoch: epoch },
      { $set: { status: 'completed', completedAt: new Date(options.now || Date.now()), leaseExpiresAt: undefined, safeFailureCode: undefined }, $unset: { leaseOwner: 1 } },
      { new: true },
    );
    if (!completed) throw dataAccessError('STALE_WORKER_LEASE', 'The invalidation worker was fenced before completion.', [], 409);
    metrics.increment('cache_invalidation_count', { cacheNamespace: event.namespace, status: 'completed' });
    return completed;
  } catch (error) {
    if (error?.code === 'STALE_WORKER_LEASE') throw error;
    const attempt = Number(event.attempt || 1);
    const terminal = attempt >= Math.max(1, Math.min(Number(options.maximumAttempts || 5), 20));
    await Model.updateOne(
      { _id: event._id, status: 'processing', leaseOwner: workerId, leaseEpoch: epoch },
      {
        $set: {
          status: 'failed',
          safeFailureCode: terminal ? 'CACHE_INVALIDATION_RETRY_EXHAUSTED' : 'CACHE_UNAVAILABLE',
          nextAttemptAt: new Date(new Date(options.now || Date.now()).getTime() + Math.min(60_000, 1_000 * 2 ** Math.min(attempt, 6))),
          leaseExpiresAt: undefined,
        },
        $unset: { leaseOwner: 1 },
      },
    );
    metrics.increment('cache_invalidation_count', { cacheNamespace: event.namespace, status: 'failed' });
    return null;
  }
}

async function processInvalidationBatch(options = {}) {
  const maximumBatchSize = Math.max(1, Math.min(Number(options.maximumBatchSize || 25), 100));
  const results = [];
  for (let index = 0; index < maximumBatchSize; index += 1) {
    const event = await claimInvalidationEvent(options);
    if (!event) break;
    results.push(await processInvalidationEvent(event, options));
  }
  return results;
}

async function rebuildProjection(input, dependencies = {}) {
  const definition = projectionDefinition(input.projectionName);
  const organizationId = safeIdentifier(input.organizationId, 'organizationId');
  const workspaceId = safeIdentifier(input.workspaceId, 'workspaceId');
  const workerId = safeIdentifier(input.workerId, 'workerId');
  const batchSize = Math.max(1, Math.min(Number(input.batchSize || definition.maximumBatchSize), definition.maximumBatchSize));
  const now = new Date(input.now || Date.now());
  if (await dependencies.isBackpressured?.({ organizationId, workspaceId, workloadCategory: 'timeline_projection' })) {
    return { status: 'deferred', safeReasonCode: 'PROJECTION_BACKPRESSURE_ACTIVE' };
  }
  const claimed = await dependencies.metadata.claim({
    projectionName: definition.projectionName,
    projectionVersion: definition.version,
    organizationId,
    workspaceId,
    workerId,
    now,
    leaseMs: Math.max(5_000, Math.min(Number(input.leaseMs || 60_000), 300_000)),
    idempotencyKeyHash: idempotencyHash(input.idempotencyKey || `${definition.projectionName}:${organizationId}:${workspaceId}`),
  });
  if (!claimed) throw dataAccessError('PROJECTION_LEASE_CONFLICT', 'The projection rebuild is already owned by another worker.', [], 409);
  const epoch = claimed.leaseEpoch;
  let checkpoint = Number(claimed.rebuildCheckpoint || 0);
  let processed = 0;
  metrics.increment('projection_rebuild_count', { operation: 'started', status: 'rebuilding' });
  try {
    while (true) {
      const source = await dependencies.source.readBatch({ organizationId, workspaceId, afterSequence: checkpoint, limit: batchSize, from: input.from, to: input.to });
      if (!source.length) break;
      const writes = source.map((record) => {
        const value = dependencies.project(record);
        assertNoSensitiveFields(value, 'projection');
        assertDocumentSize(value, Number(input.maximumDocumentBytes || 1_048_576), 'projection');
        return {
          idempotencyKey: `${definition.projectionName}:${organizationId}:${workspaceId}:${record.sequence}`,
          organizationId,
          workspaceId,
          sourceSequence: record.sequence,
          projectionName: definition.projectionName,
          projectionVersion: definition.version,
          generatedAt: now,
          value,
        };
      });
      await dependencies.target.bulkUpsert(writes, { ordered: false, maximumBatchSize: batchSize });
      checkpoint = Math.max(...source.map((record) => Number(record.sequence)));
      processed += source.length;
      const fenced = await dependencies.metadata.checkpoint({ organizationId, workspaceId, projectionName: definition.projectionName, workerId, leaseEpoch: epoch, checkpoint, lastProcessedAt: now });
      if (!fenced) throw dataAccessError('STALE_WORKER_LEASE', 'The projection worker was fenced.', [], 409);
      if (input.maximumBatches && processed >= batchSize * Number(input.maximumBatches)) {
        return { status: 'interrupted', checkpoint, processed, leaseEpoch: epoch };
      }
    }
    const completed = await dependencies.metadata.complete({ organizationId, workspaceId, projectionName: definition.projectionName, workerId, leaseEpoch: epoch, checkpoint, completedAt: now });
    if (!completed) throw dataAccessError('STALE_WORKER_LEASE', 'The projection worker was fenced before completion.', [], 409);
    metrics.increment('projection_rebuild_count', { operation: 'completed', status: 'active' });
    return { status: 'active', checkpoint, processed, leaseEpoch: epoch };
  } catch (error) {
    await dependencies.metadata.fail?.({ organizationId, workspaceId, projectionName: definition.projectionName, workerId, leaseEpoch: epoch, safeFailureCode: error?.code === 'STALE_WORKER_LEASE' ? 'STALE_WORKER_LEASE' : 'PROJECTION_REBUILD_FAILED' });
    metrics.increment('projection_rebuild_failure_count', { status: 'failed', safeFailureCode: error?.code || 'PROJECTION_REBUILD_FAILED' });
    throw error;
  }
}

function mongooseProjectionMetadataAdapter(Model) {
  return {
    async claim(input) {
      const expiresAt = new Date(input.now.getTime() + input.leaseMs);
      const existing = await Model.findOne({ organizationId: input.organizationId, workspaceId: input.workspaceId, projectionName: input.projectionName });
      if (!existing) {
        try {
          return await Model.create({ projectionName: input.projectionName, projectionVersion: input.projectionVersion, organizationId: input.organizationId, workspaceId: input.workspaceId, sourceSequence: 0, rebuildCheckpoint: 0, status: 'rebuilding', lagCategory: 'none', leaseOwner: input.workerId, leaseEpoch: 1, leaseExpiresAt: expiresAt, rebuildIdempotencyKeyHash: input.idempotencyKeyHash });
        } catch (error) {
          if (error?.code !== 11000) throw error;
        }
      }
      return Model.findOneAndUpdate(
        { organizationId: input.organizationId, workspaceId: input.workspaceId, projectionName: input.projectionName, $or: [{ status: { $in: ['active', 'failed', 'delayed'] } }, { status: 'rebuilding', leaseExpiresAt: { $lte: input.now } }] },
        { $set: { status: 'rebuilding', leaseOwner: input.workerId, leaseExpiresAt: expiresAt, safeFailureCode: undefined, rebuildIdempotencyKeyHash: input.idempotencyKeyHash }, $inc: { leaseEpoch: 1 } },
        { new: true },
      );
    },
    checkpoint(input) {
      return Model.findOneAndUpdate(
        { organizationId: input.organizationId, workspaceId: input.workspaceId, projectionName: input.projectionName, status: 'rebuilding', leaseOwner: input.workerId, leaseEpoch: input.leaseEpoch },
        { $set: { rebuildCheckpoint: input.checkpoint, sourceSequence: input.checkpoint, lastProcessedAt: input.lastProcessedAt } },
        { new: true },
      );
    },
    complete(input) {
      return Model.findOneAndUpdate(
        { organizationId: input.organizationId, workspaceId: input.workspaceId, projectionName: input.projectionName, status: 'rebuilding', leaseOwner: input.workerId, leaseEpoch: input.leaseEpoch },
        { $set: { status: 'active', rebuildCheckpoint: input.checkpoint, sourceSequence: input.checkpoint, lastRebuildAt: input.completedAt, generatedAt: input.completedAt, lagCategory: 'none', leaseExpiresAt: undefined }, $unset: { leaseOwner: 1 } },
        { new: true },
      );
    },
    fail(input) {
      return Model.updateOne(
        { organizationId: input.organizationId, workspaceId: input.workspaceId, projectionName: input.projectionName, status: 'rebuilding', leaseOwner: input.workerId, leaseEpoch: input.leaseEpoch },
        { $set: { status: 'failed', safeFailureCode: input.safeFailureCode, leaseExpiresAt: undefined }, $unset: { leaseOwner: 1 } },
      );
    },
  };
}

module.exports = {
  claimInvalidationEvent,
  createInvalidationEvent,
  idempotencyHash,
  lagCategory,
  mongooseProjectionMetadataAdapter,
  processInvalidationBatch,
  processInvalidationEvent,
  projectionDefinition,
  rebuildProjection,
};
