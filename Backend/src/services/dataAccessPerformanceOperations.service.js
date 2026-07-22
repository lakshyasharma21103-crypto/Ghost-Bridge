const crypto = require('node:crypto');
const DataAccessPerformancePolicy = require('../models/DataAccessPerformancePolicy');
const CacheInvalidationEvent = require('../models/CacheInvalidationEvent');
const QueryPerformanceSample = require('../models/QueryPerformanceSample');
const ProjectionMetadata = require('../models/ProjectionMetadata');
const IndexDriftRecord = require('../models/IndexDriftRecord');
const { env } = require('../config/env');
const { PROJECTION_DEFINITIONS } = require('../constants/dataAccessPerformance');
const core = require('./dataAccessPerformance.service');
const metrics = require('./dataAccessMetrics.service');
const { GovernedRepository } = require('./dataAccessRepository.service');
const { createInvalidationEvent, lagCategory, projectionDefinition } = require('./dataAccessProjection.service');
const { classifySlowQuery, dataAccessError, getQueryShape } = require('./dataAccessRegistry.service');
const { canonicalize } = require('../utils/idempotency');

function idOf(value) { return String(value?._id || value?.id || value || '').trim(); }
function plain(value) { return value && (typeof value.toObject === 'function' ? value.toObject() : { ...value }); }

function dependencies(overrides = {}) {
  return {
    DataAccessPerformancePolicy,
    CacheInvalidationEvent,
    QueryPerformanceSample,
    ProjectionMetadata,
    IndexDriftRecord,
    authorize: core.authorize,
    audit: core.audit,
    assertOperationalAccess: core.assertOperationalAccess,
    inspectIndexDrift: core.inspectIndexDrift,
    reconcileGovernedIndex: core.reconcileGovernedIndex,
    databaseHealth: core.databaseHealth,
    cacheHealth: core.cacheHealth,
    cacheAside: core.cacheAside,
    ...overrides,
  };
}

function mutationDigests(input, purpose, scope) {
  const idempotencyKey = String(input.idempotencyKey || '').trim();
  if (!idempotencyKey || idempotencyKey.length > 200) throw dataAccessError('IDEMPOTENCY_KEY_INVALID', 'A bounded Idempotency-Key is required.');
  const body = { ...input };
  for (const key of ['idempotencyKey', 'requestId', 'traceId']) delete body[key];
  return {
    idempotencyKeyHash: `sha256:${crypto.createHash('sha256').update(`${purpose}:${scope}:${idempotencyKey}`).digest('hex')}`,
    requestFingerprint: `sha256:${crypto.createHash('sha256').update(canonicalize(body)).digest('hex')}`,
  };
}

function assertReplay(record, digests) {
  if (record.requestFingerprint !== digests.requestFingerprint) throw dataAccessError('IDEMPOTENCY_CONFLICT', 'The idempotency key is bound to another mutation.', [], 409);
  return record;
}

function policyScope(input, scope) {
  const type = input.scope || 'workspace';
  if (!['platform', 'organization', 'workspace'].includes(type)) throw dataAccessError('DATA_ACCESS_POLICY_INVALID', 'The policy scope is invalid.');
  if (type === 'platform' && !scope.platformAuthorized) throw dataAccessError('AUTHORIZATION_DENIED', 'Authorization denied.', [], 403);
  return {
    type,
    scopeKey: type === 'platform' ? 'platform' : type === 'organization' ? `organization:${scope.organizationId}` : `organization:${scope.organizationId}:workspace:${scope.workspaceId}`,
    organizationId: type === 'platform' ? undefined : scope.organizationId,
    workspaceId: type === 'workspace' ? scope.workspaceId : undefined,
  };
}

function serializePolicy(recordInput) {
  const record = plain(recordInput);
  if (!record) return record;
  const normalized = core.normalizePerformancePolicy(record, record);
  return {
    id: idOf(record),
    scope: record.scope,
    organizationId: record.organizationId,
    workspaceId: record.workspaceId,
    ...normalized,
    validation: record.validation,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    activatedBy: record.activatedBy,
    archivedBy: record.archivedBy,
    activatedAt: record.activatedAt,
    archivedAt: record.archivedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function repository(scope, deps, probe) {
  return new GovernedRepository({
    modelsByCollection: {
      dataaccessperformancepolicies: deps.DataAccessPerformancePolicy,
      queryperformancesamples: deps.QueryPerformanceSample,
      cacheinvalidationevents: deps.CacheInvalidationEvent,
      projectionmetadatas: deps.ProjectionMetadata,
      indexdriftrecords: deps.IndexDriftRecord,
    },
    cursorSecret: env.DATA_ACCESS_CURSOR_SECRET,
    queryCountProbe: probe,
  });
}

function repositoryContext(scope, queryShapeId) {
  return {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    actorId: scope.actorId,
    requestId: scope.requestId,
    traceId: scope.traceId,
    allowedVisibilityScope: 'tenant',
    queryShapeId,
    repositoryBudgetMs: env.DATABASE_REPOSITORY_BUDGET_MS,
  };
}

async function guardMutation(scope, deps, operation) {
  return deps.assertOperationalAccess({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, operation });
}

async function createPolicy(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, input.scope !== 'organization' && input.scope !== 'platform');
  await deps.authorize('dataAccessPerformancePolicy.create', 'DataAccessPerformancePolicy', null, scope, caller, { performanceAction: 'policy_create' });
  await guardMutation(scope, deps, 'PRIVILEGED_CONFIGURATION');
  const target = policyScope(input, scope);
  const digests = mutationDigests(input, 'data-access-policy-create', target.scopeKey);
  const replay = await deps.DataAccessPerformancePolicy.findOne({ scopeKey: target.scopeKey, idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint');
  if (replay) return serializePolicy(assertReplay(replay, digests));
  const name = String(input.name || 'Data-access performance').trim().slice(0, 120);
  const latest = await deps.DataAccessPerformancePolicy.findOne({ scopeKey: target.scopeKey, name }).sort({ version: -1 }).lean();
  const normalized = core.normalizePerformancePolicy({ ...input, scopeKey: target.scopeKey, name, version: Number(input.version || latest?.version + 1 || 1), status: 'draft' });
  let record;
  try {
    record = await deps.DataAccessPerformancePolicy.create({ organizationId: target.organizationId, workspaceId: target.workspaceId, scope: target.type, ...normalized, ...digests, createdBy: scope.actorId, updatedBy: scope.actorId });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const existing = await deps.DataAccessPerformancePolicy.findOne({ scopeKey: target.scopeKey, idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint');
    if (!existing) throw error;
    record = assertReplay(existing, digests);
  }
  await deps.audit('data_performance.policy.created', 'DataAccessPerformancePolicy', record, scope, { performanceAction: 'policy_create', version: record.version });
  return serializePolicy(record);
}

async function listPolicies(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('dataAccessPerformancePolicy.read', 'DataAccessPerformancePolicy', null, scope, caller);
  const filter = {};
  for (const key of ['scope', 'status', 'name']) if (input[key]) filter[key] = String(input[key]);
  const page = await repository(scope, deps).findMany(repositoryContext(scope, 'data_access_policies_list'), {
    filter,
    sort: { updatedAt: -1, _id: -1 },
    limit: input.limit,
    cursor: input.cursor,
    projection: { idempotencyKeyHash: 0, requestFingerprint: 0 },
  });
  return { ...page, items: page.items.map(serializePolicy) };
}

async function scopedPolicy(policyId, scope, deps, includeDigests = false) {
  let query = deps.DataAccessPerformancePolicy.findOne({ _id: policyId, $or: [{ organizationId: scope.organizationId }, { scope: 'platform' }] });
  if (includeDigests) query = query.select('+idempotencyKeyHash +requestFingerprint');
  const record = await query;
  if (!record) throw dataAccessError('DATA_ACCESS_POLICY_NOT_FOUND', 'Data-access performance policy not found.', [], 404);
  if (record.workspaceId && scope.workspaceId && record.workspaceId !== scope.workspaceId) throw dataAccessError('DATA_ACCESS_POLICY_NOT_FOUND', 'Data-access performance policy not found.', [], 404);
  return record;
}

async function getPolicy(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('dataAccessPerformancePolicy.read', 'DataAccessPerformancePolicy', policyId, scope, caller);
  return serializePolicy(await scopedPolicy(policyId, scope, deps));
}

async function updatePolicy(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('dataAccessPerformancePolicy.update', 'DataAccessPerformancePolicy', policyId, scope, caller, { performanceAction: 'policy_update' });
  await guardMutation(scope, deps, 'PRIVILEGED_CONFIGURATION');
  const current = await scopedPolicy(policyId, scope, deps);
  if (current.status !== 'draft') throw dataAccessError('DATA_ACCESS_POLICY_IMMUTABLE', 'Active and archived policies are immutable.', [], 409);
  const digests = mutationDigests(input, 'data-access-policy-update', idOf(current));
  const normalized = core.normalizePerformancePolicy({ ...plain(current), ...input, scopeKey: current.scopeKey, version: current.version, status: 'draft' }, current);
  const updated = await deps.DataAccessPerformancePolicy.findOneAndUpdate(
    { _id: current._id, status: 'draft' },
    { $set: { ...normalized, updatedBy: scope.actorId, ...digests, validation: undefined } },
    { new: true, runValidators: true },
  );
  if (!updated) throw dataAccessError('DATA_ACCESS_POLICY_IMMUTABLE', 'The policy changed concurrently.', [], 409);
  await deps.audit('data_performance.policy.updated', 'DataAccessPerformancePolicy', updated, scope, { performanceAction: 'policy_update', version: updated.version });
  return serializePolicy(updated);
}

async function validatePolicyRecord(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('dataAccessPerformancePolicy.validate', 'DataAccessPerformancePolicy', policyId, scope, caller, { performanceAction: 'policy_validate' });
  const record = await scopedPolicy(policyId, scope, deps);
  const validation = core.validatePerformancePolicy(plain(record));
  if (record.status === 'draft') await deps.DataAccessPerformancePolicy.updateOne({ _id: record._id, status: 'draft' }, { $set: { validation: { ...validation, policy: undefined, validatedAt: new Date() } } });
  await deps.audit('data_performance.policy.validated', 'DataAccessPerformancePolicy', record, scope, { performanceAction: 'policy_validate', valid: validation.valid, safeReasonCode: validation.safeReasonCodes[0] });
  return { policyId: idOf(record), valid: validation.valid, safeReasonCodes: validation.safeReasonCodes };
}

async function activatePolicy(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('dataAccessPerformancePolicy.activate', 'DataAccessPerformancePolicy', policyId, scope, caller, { performanceAction: 'policy_activate' });
  await guardMutation(scope, deps, 'PRIVILEGED_CONFIGURATION');
  const record = await scopedPolicy(policyId, scope, deps);
  const digests = mutationDigests(input, 'data-access-policy-activate', idOf(record));
  const validation = core.validatePerformancePolicy(plain(record));
  if (!validation.valid) throw dataAccessError('DATA_ACCESS_POLICY_INVALID', 'The policy cannot be activated.', validation.safeReasonCodes.map((code) => ({ path: 'policy', message: code })));
  if (record.status === 'active') return serializePolicy(record);
  if (record.status !== 'draft') throw dataAccessError('DATA_ACCESS_POLICY_IMMUTABLE', 'Archived policies cannot be activated.', [], 409);
  await deps.DataAccessPerformancePolicy.updateMany({ scopeKey: record.scopeKey, status: 'active', _id: { $ne: record._id } }, { $set: { status: 'archived', archivedAt: new Date(), archivedBy: scope.actorId } });
  const activated = await deps.DataAccessPerformancePolicy.findOneAndUpdate(
    { _id: record._id, status: 'draft' },
    { $set: { status: 'active', activatedAt: new Date(), activatedBy: scope.actorId, updatedBy: scope.actorId, validation: { valid: true, safeReasonCodes: [], validatedAt: new Date() }, ...digests } },
    { new: true, runValidators: true },
  );
  if (!activated) throw dataAccessError('DATA_ACCESS_POLICY_CONFLICT', 'The policy changed concurrently.', [], 409);
  await createInvalidationEvent({ organizationId: scope.organizationId, workspaceId: record.workspaceId, namespace: 'active_version_alias', entityType: 'data_access_performance_policy', entityId: idOf(record), entityVersion: String(record.version), invalidationTags: ['active_alias'], invalidationReasonCode: 'POLICY_ACTIVATED', idempotencyKey: input.idempotencyKey, requestId: scope.requestId, traceId: scope.traceId }, { CacheInvalidationEvent: deps.CacheInvalidationEvent });
  await deps.audit('data_performance.policy.activated', 'DataAccessPerformancePolicy', activated, scope, { performanceAction: 'policy_activate', version: activated.version, safeReasonCode: 'POLICY_ACTIVATED' });
  return serializePolicy(activated);
}

async function archivePolicy(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('dataAccessPerformancePolicy.archive', 'DataAccessPerformancePolicy', policyId, scope, caller, { performanceAction: 'policy_archive' });
  await guardMutation(scope, deps, 'PRIVILEGED_CONFIGURATION');
  mutationDigests(input, 'data-access-policy-archive', policyId);
  const record = await scopedPolicy(policyId, scope, deps);
  if (record.status === 'archived') return serializePolicy(record);
  const archived = await deps.DataAccessPerformancePolicy.findOneAndUpdate({ _id: record._id, status: { $in: ['draft', 'active'] } }, { $set: { status: 'archived', archivedAt: new Date(), archivedBy: scope.actorId, updatedBy: scope.actorId } }, { new: true });
  await deps.audit('data_performance.policy.archived', 'DataAccessPerformancePolicy', archived, scope, { performanceAction: 'policy_archive', version: archived.version });
  return serializePolicy(archived);
}

async function listQuerySamples(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, true);
  await deps.authorize('queryPerformance.read', 'QueryPerformanceSample', null, scope, caller);
  const filter = {};
  for (const key of ['queryShapeId', 'operationType', 'safeFailureCode', 'indexUsageCategory']) if (input[key]) filter[key] = String(input[key]);
  if (input.status) filter.success = input.status === 'success';
  return repository(scope, deps).findMany(repositoryContext(scope, 'query_performance_samples_list'), { filter, sort: { sampledAt: -1, _id: -1 }, limit: input.limit, cursor: input.cursor, projection: { organizationId: 0, workspaceId: 0 } });
}

async function listSlowQueries(input = {}, caller = {}, options = {}) {
  const page = await listQuerySamples(input, caller, options);
  const threshold = Number(input.slowQueryThresholdMs || 500);
  return { ...page, items: page.items.filter((item) => classifySlowQuery({ ...item, expectedIndexMissing: item.indexUsageCategory === 'unknown' }, { slowQueryThresholdMs: threshold }).slow).map((item) => ({ ...item, slowClassification: classifySlowQuery(item, { slowQueryThresholdMs: threshold }) })) };
}

async function explainQueryShape(queryShapeId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, true);
  const shape = getQueryShape(queryShapeId);
  await deps.authorize('queryPerformance.explain', 'QueryShape', queryShapeId, scope, caller, { queryShapeId: shape.queryShapeId, consistencyClass: shape.consistencyClass, performanceAction: 'query_plan_inspect' });
  await guardMutation(scope, deps, 'SAFE_READ');
  const drift = await deps.inspectIndexDrift(options.indexOptions);
  const expected = drift.find((entry) => entry.indexName === shape.expectedIndexNames[0]);
  const summary = core.safeQueryPlanSummary(shape.queryShapeId, { indexName: expected?.status === 'healthy' ? expected.indexName : '', collectionScan: false, executionStageCategory: expected?.status === 'healthy' ? 'index_scan' : 'unknown', documentsExaminedCategory: 'unknown', keysExaminedCategory: 'unknown' });
  await deps.audit('data_performance.query.plan_inspected', 'QueryShape', queryShapeId, scope, { queryShapeId: shape.queryShapeId, performanceAction: 'query_plan_inspect', indexName: summary.indexName, safeReasonCode: summary.warnings[0] });
  return summary;
}

async function listIndexes(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('databaseIndex.read', 'DatabaseIndex', null, scope, caller);
  const drift = await deps.inspectIndexDrift(options.indexOptions);
  return { items: drift.slice(0, 250), total: Math.min(drift.length, 250), destructiveActionsAvailable: false };
}

async function listIndexDrift(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('databaseIndex.readDrift', 'DatabaseIndex', null, scope, caller);
  const drift = await deps.inspectIndexDrift(options.indexOptions);
  return { items: drift.filter((entry) => entry.status !== 'healthy').slice(0, 250), total: Math.min(drift.filter((entry) => entry.status !== 'healthy').length, 250), destructiveActionsAvailable: false };
}

async function reconcileIndex(indexName, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('databaseIndex.reconcile', 'DatabaseIndex', indexName, scope, caller, { indexName, performanceAction: 'index_reconcile' });
  await guardMutation(scope, deps, 'PRIVILEGED_CONFIGURATION');
  mutationDigests(input, 'index-reconcile', indexName);
  const result = await deps.reconcileGovernedIndex(indexName, { ...options.indexOptions, dryRun: input.dryRun === true });
  await deps.audit('data_performance.index.reconciliation_requested', 'DatabaseIndex', indexName, scope, { indexName, performanceAction: 'index_reconcile', safeReasonCode: result.reasonCode, status: result.status });
  if (result.action === 'created') await deps.audit('data_performance.index.created', 'DatabaseIndex', indexName, scope, { indexName, performanceAction: 'index_reconcile', status: result.status });
  return result;
}

async function cacheSummary(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('cacheOperations.read', 'CacheOperations', null, scope, caller);
  return deps.cacheHealth();
}

async function cacheNamespaces(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('cacheOperations.read', 'CacheOperations', null, scope, caller);
  const health = await deps.cacheHealth();
  return { items: core.listCacheNamespaces().map((entry) => ({ ...entry, enabled: health.status !== 'disabled', adapter: health.adapterType, hitRateCategory: health.hitRateCategory, missRateCategory: health.missRateCategory, invalidationLagCategory: health.invalidationLagCategory, entryCategory: health.entryCategory })) };
}

async function listInvalidationEvents(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('cacheOperations.read', 'CacheInvalidationEvent', null, scope, caller);
  const filter = {};
  for (const key of ['namespace', 'status']) if (input[key]) filter[key] = String(input[key]);
  return repository(scope, deps).findMany(repositoryContext(scope, 'cache_invalidation_events_list'), { filter, sort: { createdAt: -1, _id: -1 }, limit: input.limit, cursor: input.cursor, projection: { organizationId: 0, workspaceId: 0, entityId: 0, idempotencyKeyHash: 0 } });
}

async function invalidateCache(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('cacheOperations.invalidate', 'CacheOperations', input.namespace, scope, caller, { cacheNamespace: input.namespace, performanceAction: 'cache_invalidate' });
  await guardMutation(scope, deps, 'PRIVILEGED_CONFIGURATION');
  mutationDigests(input, 'cache-invalidate', `${scope.organizationId}:${scope.workspaceId || 'organization'}:${input.namespace}`);
  const event = await createInvalidationEvent({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, namespace: input.namespace, entityType: input.entityType || 'cache_namespace', entityId: input.entityId || input.namespace, entityVersion: input.entityVersion, invalidationTags: input.invalidationTags, invalidationReasonCode: input.reasonCode || 'OPERATOR_INVALIDATION', idempotencyKey: input.idempotencyKey, requestId: scope.requestId, traceId: scope.traceId }, { CacheInvalidationEvent: deps.CacheInvalidationEvent });
  await deps.audit('data_performance.cache.invalidated', 'CacheInvalidationEvent', event, scope, { cacheNamespace: event.namespace, performanceAction: 'cache_invalidate', safeReasonCode: event.invalidationReasonCode });
  return { eventId: idOf(event), namespace: event.namespace, status: event.status };
}

async function warmCache(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, true);
  const shape = getQueryShape(input.queryShapeId);
  if (!shape.cacheNamespace || shape.cacheNamespace !== input.namespace) throw dataAccessError('CACHE_NAMESPACE_NOT_ALLOWED', 'Cache warmup requires a registered immutable query shape.');
  await deps.authorize('cacheOperations.warm', 'CacheOperations', input.namespace, scope, caller, { cacheNamespace: input.namespace, queryShapeId: shape.queryShapeId, performanceAction: 'cache_warm' });
  await guardMutation(scope, deps, 'PRIVILEGED_CONFIGURATION');
  mutationDigests(input, 'cache-warm', `${scope.organizationId}:${scope.workspaceId}:${input.namespace}`);
  await deps.audit('data_performance.cache.warmed', 'CacheOperations', input.namespace, scope, { cacheNamespace: input.namespace, queryShapeId: shape.queryShapeId, performanceAction: 'cache_warm', safeReasonCode: 'CACHE_WARMUP_ACCEPTED' });
  return { status: 'accepted', namespace: input.namespace, queryShapeId: shape.queryShapeId, safeReasonCode: 'CACHE_WARMUP_ACCEPTED' };
}

async function listProjections(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, true);
  await deps.authorize('projectionOperations.read', 'ProjectionMetadata', null, scope, caller);
  const filter = {};
  for (const key of ['projectionName', 'status', 'lagCategory']) if (input[key]) filter[key] = String(input[key]);
  const page = await repository(scope, deps).findMany(repositoryContext(scope, 'projection_metadata_list'), { filter, sort: { updatedAt: -1, _id: -1 }, limit: input.limit, cursor: input.cursor, projection: { leaseOwner: 0, rebuildIdempotencyKeyHash: 0 } });
  const items = page.items.map((item) => ({ ...item, staleness: { generatedAt: item.generatedAt, lagCategory: item.lagCategory } }));
  if (!input.cursor && (!input.status || input.status === 'not_started')) {
    const existing = new Set(items.map((item) => item.projectionName));
    for (const definition of PROJECTION_DEFINITIONS) {
      if (existing.has(definition.projectionName) || input.projectionName && input.projectionName !== definition.projectionName) continue;
      items.push({ projectionName: definition.projectionName, projectionVersion: definition.version, status: 'not_started', sourceSequence: 0, rebuildCheckpoint: 0, lagCategory: 'none', staleness: { generatedAt: null, lagCategory: 'none' } });
    }
  }
  const maximum = Math.max(1, Math.min(Number(input.limit || 50), 100));
  return { ...page, items: items.slice(0, maximum), pageSize: Math.min(items.length, maximum), hasMore: page.hasMore || items.length > maximum };
}

async function getProjection(projectionName, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, true);
  projectionDefinition(projectionName);
  await deps.authorize('projectionOperations.read', 'ProjectionMetadata', projectionName, scope, caller);
  const record = await deps.ProjectionMetadata.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, projectionName }).select('-leaseOwner -rebuildIdempotencyKeyHash').lean();
  if (!record) return { projectionName, status: 'not_started', sourceSequence: 0, lagCategory: 'none' };
  return { ...record, staleness: { generatedAt: record.generatedAt, lagCategory: record.lagCategory } };
}

async function projectionAction(projectionName, action, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, true);
  const definition = projectionDefinition(projectionName);
  const permission = action === 'rebuild' ? 'projectionOperations.rebuild' : action === 'pause' ? 'projectionOperations.pause' : 'projectionOperations.resume';
  await deps.authorize(permission, 'ProjectionMetadata', projectionName, scope, caller, { projectionName, performanceAction: `projection_${action}` });
  await guardMutation(scope, deps, 'PRIVILEGED_CONFIGURATION');
  const digests = mutationDigests(input, `projection-${action}`, `${scope.organizationId}:${scope.workspaceId}:${projectionName}`);
  const current = await deps.ProjectionMetadata.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, projectionName });
  let update;
  if (action === 'rebuild') update = { status: 'delayed', rebuildCheckpoint: input.resume === true ? Number(current?.rebuildCheckpoint || 0) : 0, safeFailureCode: 'PROJECTION_REBUILD_QUEUED', rebuildIdempotencyKeyHash: digests.idempotencyKeyHash };
  else if (action === 'pause') update = { status: 'paused', safeFailureCode: 'PROJECTION_PAUSED_BY_OPERATOR', leaseExpiresAt: undefined };
  else update = { status: 'delayed', safeFailureCode: 'PROJECTION_RESUME_QUEUED', leaseExpiresAt: undefined };
  const record = await deps.ProjectionMetadata.findOneAndUpdate(
    { organizationId: scope.organizationId, workspaceId: scope.workspaceId, projectionName },
    { $set: update, $setOnInsert: { organizationId: scope.organizationId, workspaceId: scope.workspaceId, projectionName, projectionVersion: definition.version, sourceSequence: 0, rebuildCheckpoint: 0, lagCategory: lagCategory(0) } },
    { upsert: true, new: true, runValidators: true },
  );
  const auditAction = action === 'rebuild' ? 'data_performance.projection.rebuild_started' : `data_performance.projection.${action}d`;
  await deps.audit(auditAction, 'ProjectionMetadata', record, scope, { projectionName, performanceAction: `projection_${action}`, safeReasonCode: update.safeFailureCode });
  return { projectionName, status: record.status, rebuildCheckpoint: record.rebuildCheckpoint, safeReasonCode: record.safeFailureCode };
}

async function databaseSummary(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('dataAccessPerformance.read', 'DatabaseHealth', null, scope, caller);
  return deps.databaseHealth();
}

async function connectionPool(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = core.scopeFrom(input, caller, false);
  await deps.authorize('databasePool.read', 'DatabasePool', null, scope, caller, { performanceAction: 'database_pool_read' });
  return deps.databaseHealth();
}

async function performanceOverview(input = {}, caller = {}, options = {}) {
  const [database, cache] = await Promise.all([databaseSummary(input, caller, options), cacheSummary(input, caller, options)]);
  return { database, cache, metrics: metrics.snapshot() };
}

module.exports = {
  activatePolicy,
  archivePolicy,
  cacheNamespaces,
  cacheSummary,
  connectionPool,
  createPolicy,
  databaseSummary,
  explainQueryShape,
  getPolicy,
  getProjection,
  invalidateCache,
  listIndexDrift,
  listIndexes,
  listInvalidationEvents,
  listPolicies,
  listProjections,
  listQuerySamples,
  listSlowQueries,
  performanceOverview,
  projectionAction,
  reconcileIndex,
  serializePolicy,
  updatePolicy,
  validatePolicyRecord,
  warmCache,
};
