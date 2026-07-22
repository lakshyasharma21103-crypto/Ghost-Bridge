const { CONSISTENCY_CLASSES, DATA_ACCESS_LIMITS } = require('../constants/dataAccessPerformance');
const metrics = require('./dataAccessMetrics.service');
const {
  buildCursorFilter,
  createCursorFromRecord,
  dataAccessError,
  decodeCursor,
  durationCategory,
  getQueryShape,
  resultCountCategory,
  safeQuerySample,
  validateAggregation,
  validateQueryRequest,
} = require('./dataAccessRegistry.service');

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

function safeIdentifier(value, path, required = true) {
  if (value == null || value === '') {
    if (!required) return undefined;
    throw dataAccessError('VALIDATION_ERROR', `${path} is required.`, [{ path, message: 'A bounded trusted context value is required.' }]);
  }
  const candidate = String(value).trim();
  if (!SAFE_IDENTIFIER.test(candidate)) throw dataAccessError('VALIDATION_ERROR', `${path} is invalid.`);
  return candidate;
}

function trustedRequestContext(input = {}) {
  const shape = getQueryShape(input.queryShapeId);
  const context = {
    organizationId: safeIdentifier(input.organizationId, 'organizationId', shape.requiredTenantScope),
    workspaceId: safeIdentifier(input.workspaceId, 'workspaceId', shape.requiredWorkspaceScope),
    actorId: safeIdentifier(input.actorId, 'actorId'),
    requestId: safeIdentifier(input.requestId, 'requestId'),
    traceId: safeIdentifier(input.traceId, 'traceId'),
    allowedVisibilityScope: safeIdentifier(input.allowedVisibilityScope || 'tenant', 'allowedVisibilityScope'),
    queryShapeId: shape.queryShapeId,
    repositoryBudgetMs: Number(input.repositoryBudgetMs || shape.maximumExecutionMs + 1_000),
  };
  if (context.repositoryBudgetMs <= shape.maximumExecutionMs) {
    throw dataAccessError('DATABASE_TIMEOUT_HIERARCHY_INVALID', 'Repository budget must exceed the database operation timeout.');
  }
  return Object.freeze(context);
}

function scopedFilter(shape, context, filter = {}) {
  return {
    ...(shape.requiredTenantScope ? { organizationId: context.organizationId } : {}),
    ...(shape.requiredWorkspaceScope ? { workspaceId: context.workspaceId } : {}),
    ...filter,
  };
}

function applyQueryOptions(query, options) {
  let configured = query;
  if (typeof configured.select === 'function') configured = configured.select(options.projection);
  if (typeof configured.sort === 'function' && options.sort) configured = configured.sort(options.sort);
  if (typeof configured.limit === 'function' && options.limit) configured = configured.limit(options.limit);
  if (typeof configured.maxTimeMS === 'function') configured = configured.maxTimeMS(options.maximumTimeMS);
  if (typeof configured.comment === 'function') configured = configured.comment(options.queryShapeId);
  if (typeof configured.lean === 'function') configured = configured.lean();
  return configured;
}

class QueryCountProbe {
  constructor(maximum = 100) { this.maximum = maximum; this.counts = new Map(); }
  record(queryShapeId) {
    const value = (this.counts.get(queryShapeId) || 0) + 1;
    this.counts.set(queryShapeId, value);
    if (value > this.maximum) throw dataAccessError('QUERY_N_PLUS_ONE_SUSPECTED', 'The bounded query-count budget was exceeded.');
  }
  count(queryShapeId) { return this.counts.get(queryShapeId) || 0; }
  total() { return [...this.counts.values()].reduce((total, value) => total + value, 0); }
}

class GovernedRepository {
  constructor(options = {}) {
    this.modelsByCollection = options.modelsByCollection || {};
    this.cursorSecret = String(options.cursorSecret || 'development-cursor-secret');
    this.sampleWriter = options.sampleWriter;
    this.queryCountProbe = options.queryCountProbe;
    this.clock = options.clock || (() => Date.now());
  }

  modelFor(shape) {
    const model = this.modelsByCollection[shape.collectionName];
    if (!model) throw dataAccessError('QUERY_SHAPE_NOT_REGISTERED', 'No governed repository model is bound to this query shape.');
    return model;
  }

  async execute(shape, context, operation) {
    this.queryCountProbe?.record(shape.queryShapeId);
    metrics.increment('database_query_count', { queryShapeId: shape.queryShapeId, operationType: shape.operationType });
    const startedAt = this.clock();
    let success = true;
    let safeFailureCode;
    let result;
    try {
      result = await operation();
      return result;
    } catch (error) {
      success = false;
      safeFailureCode = error?.code === 50 || error?.name === 'MongoServerError' && error?.codeName === 'MaxTimeMSExpired'
        ? 'DATABASE_OPERATION_TIMEOUT'
        : /^[A-Z][A-Z0-9_]{0,127}$/.test(error?.code) ? error.code : 'DATABASE_UNAVAILABLE';
      if (safeFailureCode === 'DATABASE_OPERATION_TIMEOUT') {
        metrics.increment('database_timeout_count', { queryShapeId: shape.queryShapeId });
        throw dataAccessError('DATABASE_OPERATION_TIMEOUT', 'The governed database operation timed out.', [], 503);
      }
      throw error;
    } finally {
      const durationMs = Math.max(0, this.clock() - startedAt);
      const count = Array.isArray(result) ? result.length : result ? 1 : 0;
      metrics.observe('database_query_latency', { queryShapeId: shape.queryShapeId, durationCategory: durationCategory(durationMs) }, durationMs);
      if (this.sampleWriter) {
        const sample = safeQuerySample({
          organizationId: context.organizationId || 'platform',
          workspaceId: context.workspaceId || 'platform',
          queryShapeId: shape.queryShapeId,
          durationMs,
          resultCount: count,
          success,
          safeFailureCode,
          requestId: context.requestId,
          traceId: context.traceId,
        });
        try {
          await this.sampleWriter(sample);
        } catch {
          metrics.increment('database_query_sample_failure_count', { queryShapeId: shape.queryShapeId, safeFailureCode: 'QUERY_SAMPLE_WRITE_FAILED' });
        }
      }
    }
  }

  async findMany(contextInput, request = {}) {
    const context = trustedRequestContext(contextInput);
    const validated = validateQueryRequest(context.queryShapeId, request);
    const { shape, filter, sort, limit, maximumTimeMS } = validated;
    if (shape.operationType !== 'find_many') throw dataAccessError('QUERY_SHAPE_NOT_REGISTERED', 'The query shape is not registered for list access.');
    if (!request.projection || typeof request.projection !== 'object' || !Object.keys(request.projection).length) {
      throw dataAccessError('QUERY_FILTER_NOT_ALLOWED', 'Governed repositories require an explicit projection.');
    }
    let authoritativeFilter = scopedFilter(shape, context, filter);
    if (request.cursor) {
      const claims = decodeCursor(request.cursor, { queryShapeId: shape.queryShapeId, organizationId: context.organizationId, workspaceId: context.workspaceId, sort, filter }, { secret: this.cursorSecret, now: this.clock() });
      authoritativeFilter = { $and: [authoritativeFilter, buildCursorFilter(claims)] };
    }
    const Model = this.modelFor(shape);
    const records = await this.execute(shape, context, async () => {
      const query = Model.find(authoritativeFilter);
      return applyQueryOptions(query, { projection: request.projection, sort, limit: limit + 1, maximumTimeMS, queryShapeId: shape.queryShapeId });
    });
    const items = records.slice(0, limit);
    const hasMore = records.length > limit;
    const nextCursor = hasMore && items.length
      ? createCursorFromRecord(shape.queryShapeId, items.at(-1), { organizationId: context.organizationId, workspaceId: context.workspaceId, sort, filter }, { secret: this.cursorSecret })
      : null;
    metrics.increment('database_query_result', { queryShapeId: shape.queryShapeId, resultCountCategory: resultCountCategory(items.length) });
    return { items, pageSize: items.length, hasMore, nextCursor, queryShapeId: shape.queryShapeId, consistencyClass: shape.consistencyClass };
  }

  async findOne(contextInput, request = {}) {
    const context = trustedRequestContext(contextInput);
    const validated = validateQueryRequest(context.queryShapeId, { ...request, limit: 1 });
    const { shape, filter, maximumTimeMS } = validated;
    if (shape.operationType !== 'find_one') throw dataAccessError('QUERY_SHAPE_NOT_REGISTERED', 'The query shape is not registered for detail access.');
    if (!request.projection || typeof request.projection !== 'object') throw dataAccessError('QUERY_FILTER_NOT_ALLOWED', 'An explicit projection is required.');
    const Model = this.modelFor(shape);
    return this.execute(shape, context, () => applyQueryOptions(Model.findOne(scopedFilter(shape, context, filter)), { projection: request.projection, maximumTimeMS, queryShapeId: shape.queryShapeId }));
  }

  async aggregate(contextInput, pipeline, options = {}) {
    const context = trustedRequestContext(contextInput);
    const shape = getQueryShape(context.queryShapeId);
    const governed = validateAggregation(shape.queryShapeId, pipeline, { organizationId: context.organizationId, workspaceId: context.workspaceId, allowedLookupCollections: options.allowedLookupCollections || [] });
    const Model = this.modelFor(shape);
    return this.execute(shape, context, async () => {
      let aggregate = Model.aggregate(governed).option({ maxTimeMS: Math.min(Number(options.maximumTimeMS || shape.maximumExecutionMs), shape.maximumExecutionMs), allowDiskUse: options.allowDiskUse === true });
      return aggregate;
    });
  }

  async batchHydrate(contextInput, input = {}) {
    const context = trustedRequestContext(contextInput);
    const shape = getQueryShape(context.queryShapeId);
    const ids = [...new Set((input.ids || []).map(String))];
    if (!ids.length) return new Map();
    if (ids.length > Math.min(shape.maximumBatchSize, DATA_ACCESS_LIMITS.maximumBatchSize)) throw dataAccessError('QUERY_LIMIT_EXCEEDED', 'Hydration batch exceeds its query-shape bound.');
    const idField = input.idField || '_id';
    if (idField !== '_id' && !shape.allowedFilterFields.includes(idField)) throw dataAccessError('QUERY_FILTER_NOT_ALLOWED', 'Hydration identifier field is not allowlisted.');
    if (ids.some((id) => !SAFE_IDENTIFIER.test(id))) throw dataAccessError('QUERY_FILTER_NOT_ALLOWED', 'Hydration identifiers must be bounded safe values.');
    if (!input.projection || typeof input.projection !== 'object' || !Object.keys(input.projection).length) throw dataAccessError('QUERY_FILTER_NOT_ALLOWED', 'Hydration requires an explicit projection.');
    const Model = this.modelFor(shape);
    const filter = scopedFilter(shape, context, { [idField]: { $in: ids } });
    const records = await this.execute(shape, context, () => applyQueryOptions(Model.find(filter), { projection: input.projection, limit: ids.length, maximumTimeMS: shape.maximumExecutionMs, queryShapeId: shape.queryShapeId }));
    return new Map(records.map((record) => [String(record[idField]), record]));
  }
}

async function runBoundedTransaction(connection, operation, options = {}) {
  const maximumAttempts = Math.max(1, Math.min(Number(options.maximumAttempts || 3), 5));
  const session = await connection.startSession();
  try {
    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      try {
        let result;
        await session.withTransaction(async () => {
          result = await operation(session, { attempt, externalCallsAllowed: false });
        }, { maxCommitTimeMS: Math.max(100, Math.min(Number(options.maxCommitTimeMS || 5_000), 10_000)) });
        return result;
      } catch (error) {
        const retryable = error?.hasErrorLabel?.('TransientTransactionError') || error?.hasErrorLabel?.('UnknownTransactionCommitResult');
        if (!retryable || attempt === maximumAttempts) throw error;
        metrics.increment('database_transaction_retry_count', { operation: options.operation || 'bounded_transaction' });
      }
    }
  } finally {
    await session.endSession();
  }
}

module.exports = {
  GovernedRepository,
  QueryCountProbe,
  runBoundedTransaction,
  scopedFilter,
  trustedRequestContext,
};
