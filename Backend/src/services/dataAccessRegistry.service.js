const crypto = require('node:crypto');
const { AppError } = require('../utils/AppError');
const {
  CONSISTENCY_CLASSES,
  DATA_ACCESS_LIMITS,
  QUERY_OPERATION_TYPES,
  QUERY_SHAPES,
} = require('../constants/dataAccessPerformance');

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const SAFE_FIELD = /^[A-Za-z_][A-Za-z0-9_.]{0,127}$/;
const ALLOWED_FILTER_OPERATORS = new Set(['$eq', '$gt', '$gte', '$in', '$lt', '$lte', '$ne', '$nin']);
const FORBIDDEN_OPERATORS = new Set([
  '$accumulator', '$expr', '$function', '$graphLookup', '$regex', '$regexFind', '$regexFindAll',
  '$regexMatch', '$text', '$where',
]);
const ALLOWED_AGGREGATION_STAGES = new Set([
  '$addFields', '$count', '$group', '$limit', '$lookup', '$match', '$project', '$set', '$skip',
  '$sort', '$unwind',
]);
const SENSITIVE_KEY = /(authorization|bearer|credential|secret|token|api.?key|install.?key|password|private.?context|hidden.?reasoning|delegation.?reference|connection.?string|mongodb.?uri|redis.?url)/i;

function dataAccessError(code, message, details = [], statusCode = 400) {
  return new AppError(statusCode, code, message, details);
}

function boundedInteger(value, path, minimum, maximum, fallback) {
  const candidate = value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw dataAccessError('QUERY_LIMIT_EXCEEDED', `${path} is outside its governed bounds.`, [
      { path, message: `${path} must be an integer between ${minimum} and ${maximum}.` },
    ]);
  }
  return candidate;
}

function staticRegistry(shapes = QUERY_SHAPES) {
  const registry = new Map();
  for (const entry of shapes) {
    if (!SAFE_IDENTIFIER.test(entry.queryShapeId) || registry.has(entry.queryShapeId)) {
      throw new Error(`Invalid or duplicate query shape: ${entry.queryShapeId}`);
    }
    if (!QUERY_OPERATION_TYPES.includes(entry.operationType)) {
      throw new Error(`Unsupported operation type for ${entry.queryShapeId}`);
    }
    if (!Object.values(CONSISTENCY_CLASSES).includes(entry.consistencyClass)) {
      throw new Error(`Unsupported consistency class for ${entry.queryShapeId}`);
    }
    registry.set(entry.queryShapeId, Object.freeze({ ...entry }));
  }
  return registry;
}

const queryShapeRegistry = staticRegistry();

function getQueryShape(queryShapeId) {
  const id = String(queryShapeId || '').trim();
  const entry = queryShapeRegistry.get(id);
  if (!entry) {
    throw dataAccessError('QUERY_SHAPE_NOT_REGISTERED', 'The requested query shape is not registered.', [
      { path: 'queryShapeId', message: 'Use a bounded code-defined query shape.' },
    ]);
  }
  return entry;
}

function listQueryShapes() {
  return [...queryShapeRegistry.values()].map((entry) => ({ ...entry }));
}

function assertSafeValue(value, path = 'filter', depth = 0) {
  if (depth > 6) throw dataAccessError('QUERY_FILTER_NOT_ALLOWED', 'The query filter is too deeply nested.');
  if (value == null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw dataAccessError('QUERY_FILTER_NOT_ALLOWED', 'The query filter contains a non-finite number.');
    return;
  }
  if (value instanceof Date) return;
  if (Array.isArray(value)) {
    if (value.length > DATA_ACCESS_LIMITS.maximumBatchSize) {
      throw dataAccessError('QUERY_LIMIT_EXCEEDED', 'The query filter contains too many values.');
    }
    value.forEach((item, index) => assertSafeValue(item, `${path}.${index}`, depth + 1));
    return;
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw dataAccessError('QUERY_FILTER_NOT_ALLOWED', 'The query filter contains an unsupported value.');
  }
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_OPERATORS.has(key) || (key.startsWith('$') && !ALLOWED_FILTER_OPERATORS.has(key))) {
      throw dataAccessError('QUERY_FILTER_NOT_ALLOWED', 'The query filter contains an unsupported operator.', [
        { path, message: 'Only bounded comparison operators are supported.' },
      ]);
    }
    assertSafeValue(item, `${path}.${key}`, depth + 1);
  }
}

function validateFilter(queryShapeId, filter = {}) {
  const shape = getQueryShape(queryShapeId);
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
    throw dataAccessError('QUERY_FILTER_NOT_ALLOWED', 'The query filter must be an object.');
  }
  const entries = Object.entries(filter);
  if (entries.length > Math.min(shape.maximumFilterFields, DATA_ACCESS_LIMITS.maximumFilterFields)) {
    throw dataAccessError('QUERY_LIMIT_EXCEEDED', 'The query filter has too many fields.');
  }
  if (Buffer.byteLength(JSON.stringify(filter), 'utf8') > Math.min(shape.maximumEncodedFilterBytes, DATA_ACCESS_LIMITS.maximumEncodedFilterBytes)) {
    throw dataAccessError('QUERY_LIMIT_EXCEEDED', 'The encoded query filter is too large.');
  }
  for (const [field, value] of entries) {
    if (!SAFE_FIELD.test(field) || !shape.allowedFilterFields.includes(field)) {
      throw dataAccessError('QUERY_FILTER_NOT_ALLOWED', 'The query filter field is not allowed.', [
        { path: field, message: 'Filter field is not allowlisted for this query shape.' },
      ]);
    }
    assertSafeValue(value, field);
  }
  return Object.fromEntries(entries);
}

function normalizeSort(queryShapeId, requestedSort) {
  const shape = getQueryShape(queryShapeId);
  const sort = requestedSort && typeof requestedSort === 'object' && !Array.isArray(requestedSort)
    ? requestedSort
    : shape.defaultSort;
  const entries = Object.entries(sort || {});
  if (!entries.length) return {};
  if (entries.length > Math.min(shape.maximumSortFields, DATA_ACCESS_LIMITS.maximumSortFields)) {
    throw dataAccessError('QUERY_SORT_NOT_ALLOWED', 'The query sort has too many fields.');
  }
  const normalized = {};
  for (const [field, direction] of entries) {
    if (field !== '_id' && !shape.allowedSortFields.includes(field)) {
      throw dataAccessError('QUERY_SORT_NOT_ALLOWED', 'The query sort field is not allowed.', [
        { path: field, message: 'Sort field is not allowlisted for this query shape.' },
      ]);
    }
    if (![1, -1, 'asc', 'desc'].includes(direction)) {
      throw dataAccessError('QUERY_SORT_NOT_ALLOWED', 'The query sort direction is not allowed.');
    }
    normalized[field] = direction === 1 || direction === 'asc' ? 1 : -1;
  }
  if (!Object.hasOwn(normalized, '_id')) normalized._id = Object.values(normalized).at(-1) || 1;
  return normalized;
}

function validateQueryRequest(queryShapeId, input = {}) {
  const shape = getQueryShape(queryShapeId);
  const maximumPageSize = Math.min(shape.maximumPageSize, DATA_ACCESS_LIMITS.maximumPageSize);
  const maximumExecutionMs = Math.min(shape.maximumExecutionMs, DATA_ACCESS_LIMITS.maximumExecutionMs);
  const limit = boundedInteger(input.limit, 'limit', 1, maximumPageSize, Math.min(50, maximumPageSize));
  const maximumTimeMS = boundedInteger(input.maximumTimeMS, 'maximumTimeMS', 1, maximumExecutionMs, maximumExecutionMs);
  const filter = validateFilter(queryShapeId, input.filter || {});
  const sort = normalizeSort(queryShapeId, input.sort);
  return { shape, filter, sort, limit, maximumTimeMS };
}

function digestScope(value, secret) {
  return crypto.createHmac('sha256', secret).update(String(value || 'none')).digest('base64url').slice(0, 24);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value instanceof Date ? value.toISOString() : value);
}

function encodeCursor(claims, options = {}) {
  const secret = String(options.secret || '');
  if (Buffer.byteLength(secret, 'utf8') < 16) throw new Error('Cursor signing secret must contain at least 16 bytes.');
  const shape = getQueryShape(claims.queryShapeId);
  const sort = normalizeSort(shape.queryShapeId, claims.sort);
  const issuedAt = Number(claims.issuedAt || Date.now());
  const expiresAt = Number(claims.expiresAt || issuedAt + Math.min(Number(options.ttlMs || 900_000), 3_600_000));
  const payload = {
    v: 1,
    queryShapeId: shape.queryShapeId,
    sort,
    lastValues: claims.lastValues || {},
    lastRecordId: String(claims.lastRecordId || ''),
    organizationScopeHash: digestScope(claims.organizationId, secret),
    workspaceScopeHash: digestScope(claims.workspaceId, secret),
    filterHash: digestScope(stableJson(claims.filter || {}), secret),
    issuedAt,
    expiresAt,
  };
  if (!payload.lastRecordId || !SAFE_IDENTIFIER.test(payload.lastRecordId)) {
    throw dataAccessError('QUERY_CURSOR_INVALID', 'The cursor record identifier is invalid.');
  }
  if (Object.keys(payload.lastValues).length > Object.keys(sort).length) {
    throw dataAccessError('QUERY_CURSOR_INVALID', 'The cursor contains too many sort values.');
  }
  assertSafeValue(payload.lastValues, 'lastValues');
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const token = `${encoded}.${signature}`;
  if (Buffer.byteLength(token, 'utf8') > Math.min(shape.maximumCursorBytes, DATA_ACCESS_LIMITS.maximumCursorBytes)) {
    throw dataAccessError('QUERY_CURSOR_INVALID', 'The encoded cursor is too large.');
  }
  return token;
}

function decodeCursor(token, expected, options = {}) {
  const secret = String(options.secret || '');
  if (typeof token !== 'string' || !token || Buffer.byteLength(token, 'utf8') > DATA_ACCESS_LIMITS.maximumCursorBytes) {
    throw dataAccessError('QUERY_CURSOR_INVALID', 'The query cursor is malformed.');
  }
  const parts = token.split('.');
  if (parts.length !== 2) throw dataAccessError('QUERY_CURSOR_INVALID', 'The query cursor is malformed.');
  const [encoded, suppliedSignature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secret).update(encoded).digest();
  let supplied;
  try {
    supplied = Buffer.from(suppliedSignature, 'base64url');
  } catch {
    throw dataAccessError('QUERY_CURSOR_INVALID', 'The query cursor is malformed.');
  }
  if (supplied.length !== expectedSignature.length || !crypto.timingSafeEqual(supplied, expectedSignature)) {
    throw dataAccessError('QUERY_CURSOR_INVALID', 'The query cursor failed integrity validation.');
  }
  let claims;
  try {
    claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw dataAccessError('QUERY_CURSOR_INVALID', 'The query cursor is malformed.');
  }
  const shape = getQueryShape(expected.queryShapeId);
  if (claims.v !== 1 || claims.queryShapeId !== shape.queryShapeId) {
    throw dataAccessError('QUERY_CURSOR_INVALID', 'The query cursor belongs to another query shape.');
  }
  if (claims.expiresAt <= Number(options.now || Date.now())) {
    throw dataAccessError('QUERY_CURSOR_INVALID', 'The query cursor has expired.');
  }
  const expectedSort = normalizeSort(shape.queryShapeId, expected.sort);
  const mismatched =
    stableJson(claims.sort) !== stableJson(expectedSort) ||
    claims.organizationScopeHash !== digestScope(expected.organizationId, secret) ||
    claims.workspaceScopeHash !== digestScope(expected.workspaceId, secret) ||
    claims.filterHash !== digestScope(stableJson(expected.filter || {}), secret);
  if (mismatched) throw dataAccessError('QUERY_CURSOR_INVALID', 'The query cursor is not valid for this scoped query.');
  return claims;
}

function cursorValue(value) {
  if (value && typeof value === 'object' && typeof value.toHexString === 'function') return value.toHexString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function createCursorFromRecord(queryShapeId, record, context, options = {}) {
  const sort = normalizeSort(queryShapeId, context.sort);
  const lastValues = {};
  for (const field of Object.keys(sort)) {
    if (field !== '_id') lastValues[field] = cursorValue(record[field]);
  }
  return encodeCursor({
    queryShapeId,
    sort,
    filter: context.filter,
    lastValues,
    lastRecordId: cursorValue(record._id || record.id),
    organizationId: context.organizationId,
    workspaceId: context.workspaceId,
  }, options);
}

function buildCursorFilter(claims) {
  const sortEntries = Object.entries(claims.sort);
  const values = Object.fromEntries(sortEntries.map(([field]) => [field, field === '_id' ? claims.lastRecordId : claims.lastValues[field]]));
  const branches = [];
  for (let index = 0; index < sortEntries.length; index += 1) {
    const branch = {};
    for (let prefix = 0; prefix < index; prefix += 1) branch[sortEntries[prefix][0]] = values[sortEntries[prefix][0]];
    const [field, direction] = sortEntries[index];
    branch[field] = { [direction === 1 ? '$gt' : '$lt']: values[field] };
    branches.push(branch);
  }
  return { $or: branches };
}

function validateAggregation(queryShapeId, pipeline, context = {}) {
  const shape = getQueryShape(queryShapeId);
  if (shape.operationType !== 'aggregate') {
    throw dataAccessError('QUERY_PIPELINE_NOT_ALLOWED', 'This query shape does not permit aggregation.');
  }
  if (!Array.isArray(pipeline) || !pipeline.length || pipeline.length > Math.min(shape.maximumAggregationStages, DATA_ACCESS_LIMITS.maximumAggregationStages)) {
    throw dataAccessError('QUERY_PIPELINE_NOT_ALLOWED', 'The aggregation pipeline is empty or exceeds its stage bound.');
  }
  const first = pipeline[0];
  if (!first?.$match || (shape.requiredTenantScope && first.$match.organizationId !== context.organizationId) || (shape.requiredWorkspaceScope && first.$match.workspaceId !== context.workspaceId)) {
    throw dataAccessError('QUERY_PIPELINE_NOT_ALLOWED', 'Tenant and workspace scope must be matched in the first aggregation stage.');
  }
  const externalMatch = { ...first.$match };
  delete externalMatch.organizationId;
  delete externalMatch.workspaceId;
  validateFilter(shape.queryShapeId, externalMatch);
  let lookupCount = 0;
  let boundedOutput = false;
  for (const stage of pipeline) {
    if (!stage || typeof stage !== 'object' || Array.isArray(stage) || Object.keys(stage).length !== 1) {
      throw dataAccessError('QUERY_PIPELINE_NOT_ALLOWED', 'Every aggregation stage must be a single governed operation.');
    }
    const [operator, value] = Object.entries(stage)[0];
    if (!ALLOWED_AGGREGATION_STAGES.has(operator) || FORBIDDEN_OPERATORS.has(operator)) {
      throw dataAccessError('QUERY_PIPELINE_NOT_ALLOWED', 'The aggregation pipeline contains an unsupported stage.');
    }
    assertNoDangerousOperators(value, `pipeline.${operator}`);
    if (operator === '$lookup') {
      lookupCount += 1;
      if (lookupCount > Math.min(shape.maximumLookupStages, DATA_ACCESS_LIMITS.maximumLookupStages)) {
        throw dataAccessError('QUERY_PIPELINE_NOT_ALLOWED', 'The aggregation contains too many lookup stages.');
      }
      if (!context.allowedLookupCollections?.includes(value?.from) || !Array.isArray(value?.pipeline) || !value.pipeline.some((nested) => Number(nested?.$limit) > 0 && Number(nested.$limit) <= shape.maximumResultCount)) {
        throw dataAccessError('QUERY_PIPELINE_NOT_ALLOWED', 'Lookup collection and cardinality must be explicitly bounded.');
      }
    }
    if (operator === '$skip') {
      const skip = Number(value);
      if (!Number.isInteger(skip) || skip < 0 || skip > shape.maximumResultCount) {
        throw dataAccessError('QUERY_RESULT_LIMIT_EXCEEDED', 'Aggregation offset is outside its bounded allowance.');
      }
    }
    if (operator === '$sort') normalizeSort(shape.queryShapeId, value);
    if (operator === '$limit') {
      const limit = Number(value);
      if (!Number.isInteger(limit) || limit < 1 || limit > shape.maximumResultCount) {
        throw dataAccessError('QUERY_RESULT_LIMIT_EXCEEDED', 'Aggregation result limit is invalid.');
      }
      boundedOutput = true;
    }
  }
  if (!boundedOutput && !pipeline.some((stage) => stage.$count)) {
    throw dataAccessError('QUERY_RESULT_LIMIT_EXCEEDED', 'Aggregation output must be explicitly bounded.');
  }
  return pipeline.map((stage) => ({ ...stage }));
}

function assertNoDangerousOperators(value, path = 'query', depth = 0) {
  if (depth > 12) throw dataAccessError('QUERY_FILTER_NOT_ALLOWED', 'Query input is too deeply nested.');
  if (!value || typeof value !== 'object') return true;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_OPERATORS.has(key)) {
      throw dataAccessError(key === '$where' || key === '$function' ? 'QUERY_FILTER_NOT_ALLOWED' : 'QUERY_PIPELINE_NOT_ALLOWED', 'Executable or unbounded MongoDB operators are not allowed.', [{ path, message: `${key} is prohibited.` }]);
    }
    assertNoDangerousOperators(nested, `${path}.${key}`, depth + 1);
  }
  return true;
}

function normalizeIndex(entry) {
  if (!entry || !SAFE_IDENTIFIER.test(entry.collectionName) || !SAFE_IDENTIFIER.test(entry.indexName)) {
    throw new Error('Index manifest entries require safe collection and index names.');
  }
  const keys = Object.entries(entry.keySpecification || {});
  if (!keys.length || keys.length > 8 || keys.some(([field, direction]) => !SAFE_FIELD.test(field) || ![1, -1, 'hashed', 'text'].includes(direction))) {
    throw new Error(`Index ${entry.indexName} has an invalid key specification.`);
  }
  return Object.freeze({
    unique: false,
    sparse: false,
    partialFilterExpression: undefined,
    expireAfterSeconds: undefined,
    collation: undefined,
    automaticReconciliationAllowed: true,
    migrationVersion: 1,
    relatedQueryShapeIds: [],
    ...entry,
  });
}

const INDEX_MANIFEST = Object.freeze([
  normalizeIndex({ collectionName: 'orchestrationruns', indexName: 'dap_orchestration_runs_scope_created', keySpecification: { organizationId: 1, workspaceId: 1, createdAt: -1, _id: -1 }, purpose: 'Stable tenant-scoped run pagination.', relatedQueryShapeIds: ['orchestration_runs_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'orchestrationnoderuns', indexName: 'dap_ready_node_claim', keySpecification: { organizationId: 1, workspaceId: 1, status: 1, partitionKey: 1, nextAttemptAt: 1 }, purpose: 'Ready node claims without collection scans.', relatedQueryShapeIds: ['orchestration_ready_node_claim'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'orchestrationnoderuns', indexName: 'dap_node_retry_schedule', keySpecification: { organizationId: 1, workspaceId: 1, status: 1, nextAttemptAt: 1 }, purpose: 'Bounded retry scheduling.', relatedQueryShapeIds: ['orchestration_retry_schedule'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'orchestrationcompensationruns', indexName: 'dap_compensation_claim', keySpecification: { organizationId: 1, workspaceId: 1, status: 1, nextAttemptAt: 1 }, purpose: 'Bounded compensation claims.', relatedQueryShapeIds: ['compensation_claim'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'interagentdelegationinvocations', indexName: 'dap_delegation_lookup', keySpecification: { organizationId: 1, workspaceId: 1, grantId: 1, status: 1 }, purpose: 'Tenant-scoped delegation accounting lookup.', relatedQueryShapeIds: ['delegation_invocation_lookup'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'agentselectiondecisions', indexName: 'dap_selection_decisions_scope_created', keySpecification: { organizationId: 1, workspaceId: 1, createdAt: -1, _id: -1 }, purpose: 'Stable selection decision pagination.', relatedQueryShapeIds: ['agent_selection_decisions_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'approvalrequests', indexName: 'dap_approval_queue', keySpecification: { organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 }, purpose: 'Bounded approval queues.', relatedQueryShapeIds: ['approval_queue_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'orchestrationinterventionrequests', indexName: 'dap_intervention_queue', keySpecification: { organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 }, purpose: 'Bounded human intervention queues.', relatedQueryShapeIds: ['intervention_queue_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'orchestrationtimelineevents', indexName: 'dap_timeline_scope_sequence', keySpecification: { organizationId: 1, workspaceId: 1, runId: 1, sequence: 1, _id: 1 }, purpose: 'Stable timeline pagination.', relatedQueryShapeIds: ['orchestration_timeline_lookup'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'orchestrationtracespans', indexName: 'dap_trace_scope_started', keySpecification: { organizationId: 1, workspaceId: 1, runId: 1, startedAt: -1 }, purpose: 'Bounded trace lookup.', relatedQueryShapeIds: ['orchestration_trace_lookup'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'orchestrationsloevaluations', indexName: 'dap_slo_scope_evaluated', keySpecification: { organizationId: 1, workspaceId: 1, evaluatedAt: -1 }, purpose: 'SLO history pagination.', relatedQueryShapeIds: ['slo_evaluations_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'orchestrationalerts', indexName: 'dap_alert_scope_status_created', keySpecification: { organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 }, purpose: 'Operational alert queues.', relatedQueryShapeIds: ['orchestration_alerts_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'workerregistrations', indexName: 'dap_worker_pool_status_heartbeat', keySpecification: { workerPool: 1, status: 1, heartbeatAt: -1 }, purpose: 'Fleet status summaries.', relatedQueryShapeIds: ['worker_registrations_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'queuepartitions', indexName: 'dap_queue_partition_route', keySpecification: { workloadCategory: 1, routingVersion: 1, partitionNumber: 1 }, unique: true, automaticReconciliationAllowed: false, purpose: 'Unique queue routing partitions.', relatedQueryShapeIds: ['queue_partitions_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'workloadquotareservations', indexName: 'dap_quota_scope_status_created', keySpecification: { organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 }, purpose: 'Strong quota reservation accounting.', relatedQueryShapeIds: ['quota_reservations_lookup'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'workloadadmissiondecisions', indexName: 'dap_admission_scope_created', keySpecification: { organizationId: 1, workspaceId: 1, createdAt: -1, _id: -1 }, purpose: 'Stable admission decision history.', relatedQueryShapeIds: ['admission_decisions_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'orchestrationoperationalsnapshots', indexName: 'dap_operational_snapshot_scope_time', keySpecification: { organizationId: 1, workspaceId: 1, snapshotAt: -1 }, purpose: 'Recent observability projections.', relatedQueryShapeIds: ['observability_summary', 'observability_summary_aggregate'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'queryperformancesamples', indexName: 'dap_query_sample_scope_time', keySpecification: { organizationId: 1, workspaceId: 1, sampledAt: -1 }, purpose: 'Bounded performance sample history.', relatedQueryShapeIds: ['query_performance_samples_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'dataaccessperformancepolicies', indexName: 'dap_policy_scope_status', keySpecification: { scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, purpose: 'Scoped performance policy lookup.', relatedQueryShapeIds: ['data_access_policies_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'cacheinvalidationevents', indexName: 'dap_invalidation_scope_status_retry', keySpecification: { organizationId: 1, workspaceId: 1, status: 1, nextAttemptAt: 1 }, purpose: 'Scoped invalidation history and retries.', relatedQueryShapeIds: ['cache_invalidation_events_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'indexdriftrecords', indexName: 'dap_index_drift_identity', keySpecification: { collectionName: 1, indexName: 1, detectedAt: -1 }, purpose: 'Bounded index drift history.', relatedQueryShapeIds: ['index_drift_records_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'cacheinvalidationevents', indexName: 'dap_cache_invalidation_claim', keySpecification: { status: 1, nextAttemptAt: 1, leaseExpiresAt: 1, sequence: 1 }, purpose: 'Fenced invalidation worker claims.', relatedQueryShapeIds: ['cache_invalidation_claim'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'projectionmetadatas', indexName: 'dap_projection_scope_name', keySpecification: { organizationId: 1, workspaceId: 1, projectionName: 1 }, unique: true, automaticReconciliationAllowed: false, purpose: 'One durable checkpoint per scoped projection.', relatedQueryShapeIds: ['projection_metadata_list'], migrationVersion: 1302 }),
  normalizeIndex({ collectionName: 'performanceloadscenarios', indexName: 'performance_scenario_scope_status', keySpecification: { scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, purpose: 'Bounded scoped performance-scenario lists.', relatedQueryShapeIds: ['performance_scenarios_list'], migrationVersion: 1304 }),
  normalizeIndex({ collectionName: 'performancebudgetpolicies', indexName: 'performance_budget_scope_status', keySpecification: { scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, purpose: 'Bounded scoped performance-budget lists.', relatedQueryShapeIds: ['performance_budgets_list'], migrationVersion: 1304 }),
  normalizeIndex({ collectionName: 'performancetestruns', indexName: 'performance_run_scope_status_created', keySpecification: { organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 }, purpose: 'Recent tenant-scoped performance-run history.', relatedQueryShapeIds: ['performance_runs_list'], migrationVersion: 1304 }),
  normalizeIndex({ collectionName: 'performancemeasurementwindows', indexName: 'performance_window_run_sequence', keySpecification: { performanceRunId: 1, sequence: 1 }, unique: true, automaticReconciliationAllowed: false, purpose: 'Stable ordered measurement windows for a performance run.', relatedQueryShapeIds: ['performance_windows_list'], migrationVersion: 1304 }),
  normalizeIndex({ collectionName: 'performancebaselines', indexName: 'performance_baseline_scope_workload_status', keySpecification: { scope: 1, workloadDomain: 1, status: 1 }, purpose: 'Bounded active performance-baseline lookup.', relatedQueryShapeIds: ['performance_baselines_list'], migrationVersion: 1304 }),
  normalizeIndex({ collectionName: 'capacitymodels', indexName: 'capacity_model_scope_workload_status', keySpecification: { scope: 1, workloadDomain: 1, status: 1 }, purpose: 'Bounded capacity-model lookup by workload and lifecycle.', relatedQueryShapeIds: ['performance_capacity_models_list'], migrationVersion: 1304 }),
  normalizeIndex({ collectionName: 'capacityplans', indexName: 'capacity_plan_scope_status', keySpecification: { scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, purpose: 'Bounded scoped capacity-plan lists.', relatedQueryShapeIds: ['performance_capacity_plans_list'], migrationVersion: 1304 }),
  normalizeIndex({ collectionName: 'performancefixturesets', indexName: 'performance_fixture_scope_status', keySpecification: { organizationId: 1, workspaceId: 1, status: 1 }, purpose: 'Tenant-scoped fixture lifecycle and cleanup lookup.', relatedQueryShapeIds: ['performance_fixture_sets_list'], migrationVersion: 1304 }),
  normalizeIndex({ collectionName: 'releasecandidates', indexName: 'release_candidate_scope_status_created', keySpecification: { organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 }, purpose: 'Bounded tenant-scoped release-candidate inventory.', migrationVersion: 1305 }),
  normalizeIndex({ collectionName: 'releasecandidates', indexName: 'release_candidate_version', keySpecification: { organizationId: 1, version: 1 }, unique: true, automaticReconciliationAllowed: false, purpose: 'Unique organization release version.', migrationVersion: 1305 }),
  normalizeIndex({ collectionName: 'releasemanifests', indexName: 'releaseCandidateId_1', keySpecification: { releaseCandidateId: 1 }, unique: true, automaticReconciliationAllowed: false, purpose: 'One immutable manifest per release candidate.', migrationVersion: 1305 }),
  normalizeIndex({ collectionName: 'buildprovenances', indexName: 'releaseCandidateId_1', keySpecification: { releaseCandidateId: 1 }, unique: true, automaticReconciliationAllowed: false, purpose: 'One provenance record per release candidate.', migrationVersion: 1305 }),
  normalizeIndex({ collectionName: 'releasecompatibilitymatrices', indexName: 'releaseCandidateId_1', keySpecification: { releaseCandidateId: 1 }, unique: true, automaticReconciliationAllowed: false, purpose: 'One compatibility matrix per release candidate.', migrationVersion: 1305 }),
  normalizeIndex({ collectionName: 'releasemigrationplans', indexName: 'release_migration_scope_status', keySpecification: { organizationId: 1, workspaceId: 1, status: 1 }, purpose: 'Bounded migration readiness inventory.', migrationVersion: 1305 }),
  normalizeIndex({ collectionName: 'releaserolloutpolicies', indexName: 'release_rollout_policy_scope_status', keySpecification: { scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, purpose: 'Bounded active rollout-policy selection.', migrationVersion: 1305 }),
  normalizeIndex({ collectionName: 'releaserolloutplans', indexName: 'release_rollout_target_status', keySpecification: { deploymentTargetId: 1, status: 1 }, purpose: 'Bounded rollout inventory by target and state.', migrationVersion: 1305 }),
  normalizeIndex({ collectionName: 'releasefeatureflags', indexName: 'release_feature_flag_scope_status', keySpecification: { scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, purpose: 'Bounded active feature-flag lookup.', migrationVersion: 1305 }),
  normalizeIndex({ collectionName: 'releaseevidencepackages', indexName: 'evidenceDigest_1', keySpecification: { evidenceDigest: 1 }, unique: true, automaticReconciliationAllowed: false, purpose: 'Immutable release-evidence integrity identity.', migrationVersion: 1305 }),
  normalizeIndex({ collectionName: 'releasemanualgates', indexName: 'release_manual_gate_candidate_key', keySpecification: { releaseCandidateId: 1, gateKey: 1, performedAt: -1 }, purpose: 'Bounded manual-gate history.', migrationVersion: 1305 }),
  normalizeIndex({ collectionName: 'releasewaivers', indexName: 'release_waiver_candidate_status', keySpecification: { releaseCandidateId: 1, status: 1 }, purpose: 'Bounded active release-waiver lookup.', migrationVersion: 1305 }),
  normalizeIndex({ collectionName: 'releasefreezes', indexName: 'release_freeze_scope_status', keySpecification: { scope: 1, scopeReference: 1, status: 1 }, purpose: 'Active release-freeze lookup by safe scope.', migrationVersion: 1305 }),
]);

function comparableIndex(entry) {
  return stableJson({
    key: entry.keySpecification || entry.key || {},
    unique: entry.unique === true,
    sparse: entry.sparse === true,
    partialFilterExpression: entry.partialFilterExpression || null,
    expireAfterSeconds: entry.expireAfterSeconds ?? null,
    collation: entry.collation || null,
  });
}

function driftReason(expected, actual) {
  if (stableJson(expected.keySpecification) !== stableJson(actual.key || actual.keySpecification || {})) return 'index_key_mismatch';
  if (Boolean(expected.unique) !== Boolean(actual.unique)) return 'uniqueness_mismatch';
  if (Boolean(expected.sparse) !== Boolean(actual.sparse)) return 'sparse_mismatch';
  if (stableJson(expected.partialFilterExpression || null) !== stableJson(actual.partialFilterExpression || null)) return 'partial_filter_mismatch';
  if ((expected.expireAfterSeconds ?? null) !== (actual.expireAfterSeconds ?? null)) return 'ttl_mismatch';
  if (stableJson(expected.collation || null) !== stableJson(actual.collation || null)) return 'collation_mismatch';
  return null;
}

function compareIndexManifest(actualIndexesByCollection = {}, manifest = INDEX_MANIFEST) {
  const records = [];
  const expectedNames = new Set();
  for (const expected of manifest) {
    expectedNames.add(`${expected.collectionName}:${expected.indexName}`);
    const actual = (actualIndexesByCollection[expected.collectionName] || []).find((entry) => entry.name === expected.indexName);
    if (actual) {
      const reasonCode = driftReason(expected, actual);
      records.push({ ...expected, status: reasonCode ? 'mismatched' : 'healthy', reasonCode });
      continue;
    }
    const equivalent = (actualIndexesByCollection[expected.collectionName] || []).find((entry) => comparableIndex(expected) === comparableIndex(entry));
    records.push({
      ...expected,
      status: equivalent ? 'duplicate' : 'missing',
      reasonCode: equivalent ? 'equivalent_index_has_another_name' : 'expected_index_missing',
      equivalentIndexName: SAFE_IDENTIFIER.test(String(equivalent?.name || '')) ? equivalent.name : undefined,
    });
  }
  for (const [collectionName, actualIndexes] of Object.entries(actualIndexesByCollection)) {
    for (const actual of actualIndexes) {
      if (actual.name === '_id_' || expectedNames.has(`${collectionName}:${actual.name}`)) continue;
      const equivalent = manifest.find((entry) => entry.collectionName === collectionName && comparableIndex(entry) === comparableIndex(actual));
      const safeActualName = SAFE_IDENTIFIER.test(String(actual.name || '')) ? actual.name : 'unsupported_index_name';
      records.push({ collectionName, indexName: safeActualName, status: safeActualName === 'unsupported_index_name' ? 'unsupported' : equivalent ? 'duplicate' : 'unexpected', reasonCode: safeActualName === 'unsupported_index_name' ? 'unsafe_index_name' : equivalent ? 'duplicate_equivalent_index' : 'unexpected_index_present', relatedQueryShapeIds: equivalent?.relatedQueryShapeIds || [] });
    }
  }
  return records;
}

async function reconcileIndex(expected, adapter, options = {}) {
  const entry = typeof expected === 'string' ? INDEX_MANIFEST.find((item) => item.indexName === expected) : normalizeIndex(expected);
  if (!entry) throw dataAccessError('NOT_FOUND', 'The requested index is not in the governed manifest.', [], 404);
  const existing = await adapter.listIndexes(entry.collectionName);
  const drift = compareIndexManifest({ [entry.collectionName]: existing }, [entry])[0];
  if (drift.status === 'healthy') return { action: 'verified', status: 'healthy', indexName: entry.indexName };
  if (drift.status !== 'missing') return { action: 'recorded_drift', status: drift.status, indexName: entry.indexName, reasonCode: drift.reasonCode };
  if (!entry.automaticReconciliationAllowed && options.allowPrivilegedUnique !== true) return { action: 'migration_required', status: 'migration_required', indexName: entry.indexName, reasonCode: entry.unique ? 'unique_index_requires_duplicate_preflight' : 'privileged_migration_required' };
  if (entry.unique) {
    const duplicate = await adapter.findDuplicate?.(entry.collectionName, entry.keySpecification, { limit: 1 });
    if (duplicate) return { action: 'migration_required', status: 'migration_required', indexName: entry.indexName, reasonCode: 'duplicate_preflight_failed' };
  }
  if (options.dryRun === true) return { action: 'create_ready', status: 'migration_required', indexName: entry.indexName };
  await adapter.createIndex(entry.collectionName, entry.keySpecification, {
    name: entry.indexName,
    unique: entry.unique,
    sparse: entry.sparse,
    ...(entry.partialFilterExpression ? { partialFilterExpression: entry.partialFilterExpression } : {}),
    ...(entry.expireAfterSeconds !== undefined ? { expireAfterSeconds: entry.expireAfterSeconds } : {}),
    ...(entry.collation ? { collation: entry.collation } : {}),
  });
  return { action: 'created', status: 'healthy', indexName: entry.indexName };
}

function validateTimeoutHierarchy(input = {}) {
  const values = {
    databaseOperationMs: Number(input.databaseOperationMs),
    repositoryBudgetMs: Number(input.repositoryBudgetMs),
    serviceBudgetMs: Number(input.serviceBudgetMs),
    httpRequestMs: Number(input.httpRequestMs),
    leaseSafetyMarginMs: Number(input.leaseSafetyMarginMs),
    workerOperationMs: Number(input.workerOperationMs),
    jobLeaseMs: Number(input.jobLeaseMs),
  };
  const allBounded = Object.values(values).every((value) => Number.isInteger(value) && value >= 100 && value <= 3_600_000);
  const httpOrdered = values.databaseOperationMs < values.repositoryBudgetMs && values.repositoryBudgetMs < values.serviceBudgetMs && values.serviceBudgetMs < values.httpRequestMs;
  const workerOrdered = values.databaseOperationMs < values.leaseSafetyMarginMs && values.leaseSafetyMarginMs < values.workerOperationMs && values.workerOperationMs < values.jobLeaseMs;
  if (!allBounded || !httpOrdered || !workerOrdered) {
    throw dataAccessError('DATABASE_TIMEOUT_HIERARCHY_INVALID', 'Database timeout hierarchy is invalid.');
  }
  return { valid: true, ...values };
}

function category(value, thresholds) {
  const numeric = Math.max(0, Number(value) || 0);
  if (numeric === 0) return 'none';
  if (numeric <= thresholds[0]) return 'low';
  if (numeric <= thresholds[1]) return 'moderate';
  if (numeric <= thresholds[2]) return 'high';
  return 'critical';
}

function examinedRatioCategory(documentsExamined, resultCount) {
  const examined = Math.max(0, Number(documentsExamined) || 0);
  const results = Math.max(1, Number(resultCount) || 0);
  return category(examined / results, [2, 10, 100]);
}

function durationCategory(durationMs) {
  return category(durationMs, [50, 250, 1_000]);
}

function resultCountCategory(resultCount) {
  return category(resultCount, [10, 50, 250]);
}

function classifySlowQuery(input = {}, policy = {}) {
  const reasons = [];
  if (Number(input.durationMs || 0) >= Number(policy.slowQueryThresholdMs || 500)) reasons.push('QUERY_DURATION_EXCEEDED');
  if (input.indexUsageCategory === 'collection_scan') reasons.push('QUERY_COLLECTION_SCAN');
  if (examinedRatioCategory(input.documentsExamined, input.resultCount) === 'critical') reasons.push('QUERY_EXAMINATION_RATIO_HIGH');
  if (input.expectedIndexMissing === true) reasons.push('QUERY_EXPECTED_INDEX_MISSING');
  if (input.timeout === true) reasons.push('QUERY_TIMEOUT');
  if (Number(input.resultCount || 0) > Number(policy.maximumResultCount || DATA_ACCESS_LIMITS.maximumResultCount)) reasons.push('QUERY_RESULT_SET_LARGE');
  if (Number(input.repeatedCount || 0) > Number(policy.nPlusOneThreshold || 20)) reasons.push('QUERY_N_PLUS_ONE_SUSPECTED');
  return { slow: reasons.length > 0, safeReasonCodes: reasons };
}

function safeQuerySample(input = {}) {
  const shape = getQueryShape(input.queryShapeId);
  const safeFailureCode = input.safeFailureCode && /^[A-Z][A-Z0-9_]{0,127}$/.test(input.safeFailureCode) ? input.safeFailureCode : undefined;
  const requestedSampledAt = new Date(input.sampledAt || Date.now());
  const sampledAt = Number.isFinite(requestedSampledAt.getTime()) ? requestedSampledAt : new Date();
  const defaultRetentionMs = Math.max(3_600_000, Math.min(Number(input.retentionMs || 7 * 86_400_000), 30 * 86_400_000));
  const requestedExpiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  const expiresAt = requestedExpiresAt && Number.isFinite(requestedExpiresAt.getTime()) && requestedExpiresAt > sampledAt && requestedExpiresAt.getTime() <= sampledAt.getTime() + 30 * 86_400_000
    ? requestedExpiresAt
    : new Date(sampledAt.getTime() + defaultRetentionMs);
  return {
    organizationId: String(input.organizationId || ''),
    workspaceId: String(input.workspaceId || ''),
    queryShapeId: shape.queryShapeId,
    operationType: shape.operationType,
    durationMs: Math.max(0, Math.min(Number(input.durationMs) || 0, 3_600_000)),
    resultCount: Math.max(0, Math.min(Number(input.resultCount) || 0, shape.maximumResultCount)),
    documentsExaminedCategory: category(input.documentsExamined, [10, 100, 1_000]),
    keysExaminedCategory: category(input.keysExamined, [10, 100, 1_000]),
    examinationRatioCategory: examinedRatioCategory(input.documentsExamined, input.resultCount),
    indexUsageCategory: ['expected_index', 'alternate_index', 'collection_scan', 'unknown'].includes(input.indexUsageCategory) ? input.indexUsageCategory : 'unknown',
    expectedIndexName: shape.expectedIndexNames[0],
    usedIndexName: SAFE_IDENTIFIER.test(String(input.usedIndexName || '')) ? input.usedIndexName : undefined,
    cacheOutcome: ['cache_hit', 'cache_miss', 'cache_bypass', 'cache_unavailable', 'not_applicable'].includes(input.cacheOutcome) ? input.cacheOutcome : 'not_applicable',
    consistencyClass: shape.consistencyClass,
    timeoutCategory: input.timeout === true ? 'operation_timeout' : 'none',
    success: input.success !== false,
    safeFailureCode,
    requestId: SAFE_IDENTIFIER.test(String(input.requestId || '')) ? input.requestId : undefined,
    traceId: SAFE_IDENTIFIER.test(String(input.traceId || '')) ? input.traceId : undefined,
    sampledAt,
    expiresAt,
  };
}

function estimateJsonBytes(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function documentSizeCategory(value, maximumBytes = DATA_ACCESS_LIMITS.maximumDocumentBytes) {
  const bytes = estimateJsonBytes(value);
  const ratio = bytes / maximumBytes;
  const sizeCategory = ratio > 1 ? 'rejected' : ratio >= 0.85 ? 'near_limit' : ratio >= 0.5 ? 'large' : ratio >= 0.1 ? 'medium' : 'small';
  return { bytes, maximumBytes, sizeCategory, allowed: bytes <= maximumBytes };
}

function assertDocumentSize(value, maximumBytes, path = 'document') {
  const result = documentSizeCategory(value, maximumBytes);
  if (!result.allowed) throw dataAccessError('DOCUMENT_SIZE_LIMIT_EXCEEDED', 'The document exceeds its governed size limit.', [{ path, message: 'Reduce or externalize bounded child records.' }], 413);
  return result;
}

function assertNoSensitiveFields(value, path = 'value', depth = 0) {
  if (depth > 12) throw dataAccessError('CACHE_VALUE_REJECTED', 'The value exceeds the allowed object depth.');
  if (!value || typeof value !== 'object') return true;
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) throw dataAccessError('CACHE_VALUE_REJECTED', 'Sensitive fields are not permitted in data-access artifacts.', [{ path: `${path}.${key}`, message: 'Sensitive field rejected.' }]);
    assertNoSensitiveFields(nested, `${path}.${key}`, depth + 1);
  }
  return true;
}

module.exports = {
  INDEX_MANIFEST,
  assertDocumentSize,
  assertNoDangerousOperators,
  assertNoSensitiveFields,
  buildCursorFilter,
  classifySlowQuery,
  compareIndexManifest,
  createCursorFromRecord,
  dataAccessError,
  decodeCursor,
  documentSizeCategory,
  durationCategory,
  encodeCursor,
  examinedRatioCategory,
  getQueryShape,
  listQueryShapes,
  normalizeIndex,
  normalizeSort,
  reconcileIndex,
  resultCountCategory,
  safeQuerySample,
  staticRegistry,
  validateAggregation,
  validateFilter,
  validateQueryRequest,
  validateTimeoutHierarchy,
};
