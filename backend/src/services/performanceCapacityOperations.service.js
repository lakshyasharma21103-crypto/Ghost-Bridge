const crypto = require('node:crypto');
const PerformanceLoadScenario = require('../models/PerformanceLoadScenario');
const PerformanceBudgetPolicy = require('../models/PerformanceBudgetPolicy');
const PerformanceBaseline = require('../models/PerformanceBaseline');
const PerformanceEnvironmentFingerprint = require('../models/PerformanceEnvironmentFingerprint');
const PerformanceTestRun = require('../models/PerformanceTestRun');
const PerformanceMeasurementWindow = require('../models/PerformanceMeasurementWindow');
const PerformanceFixtureSet = require('../models/PerformanceFixtureSet');
const PerformanceRegressionEvaluation = require('../models/PerformanceRegressionEvaluation');
const CapacityModel = require('../models/CapacityModel');
const CapacityPlan = require('../models/CapacityPlan');
const { assertAuthorized } = require('./authorization.service');
const { assertOperationalAccess } = require('./operationalState.service');
const { createAuditLog } = require('./auditService');
const { enforceApproval, consumeApprovalGrants } = require('./approval.service');
const { canonicalize } = require('../utils/idempotency');
const core = require('./performanceCapacityCore.service');
const metrics = require('./performanceCapacityMetrics.service');
const { executeScenarioSimulation } = require('./performanceCapacityHarness.service');

function idOf(value) { return String(value?._id || value?.id || value || '').trim(); }
function plain(value) { return value && (typeof value.toObject === 'function' ? value.toObject({ depopulate: true }) : { ...value }); }

function dependencies(overrides = {}) {
  return {
    PerformanceLoadScenario, PerformanceBudgetPolicy, PerformanceBaseline,
    PerformanceEnvironmentFingerprint, PerformanceTestRun, PerformanceMeasurementWindow,
    PerformanceFixtureSet, PerformanceRegressionEvaluation, CapacityModel, CapacityPlan,
    assertAuthorized, assertOperationalAccess, createAuditLog, enforceApproval,
    consumeApprovalGrants, executeScenarioSimulation, ...overrides,
  };
}

function scopeFrom(input = {}, caller = {}, workspaceRequired = false) {
  const partnerId = idOf(caller.partner?._id);
  if (!partnerId) throw core.performanceError('AUTHENTICATION_REQUIRED', 'Partner authentication is required.', [], 401);
  const organizationId = core.safeIdentifier(input.organizationId || partnerId, 'organizationId');
  if (organizationId !== partnerId) throw core.performanceError('AUTHORIZATION_DENIED', 'Authorization denied.', [], 403);
  const workspaceId = core.safeIdentifier(input.workspaceId || input.receivingWorkspaceId, 'workspaceId', workspaceRequired);
  return {
    organizationId, workspaceId, partnerId,
    actorId: `partner:${partnerId}`, actorType: 'service_account',
    requestId: core.safeIdentifier(caller.requestId || input.requestId || `perf-req-${Date.now()}`, 'requestId'),
    traceId: core.safeIdentifier(caller.traceId || input.traceId || `perf-trace-${Date.now()}`, 'traceId'),
    platformAuthorized: caller.platformAuthorized === true,
  };
}

function actor(scope) {
  return { type: scope.actorType, id: scope.actorId, partnerId: scope.partnerId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, requestId: scope.requestId, traceId: scope.traceId };
}

function resource(type, value, scope) {
  return { type, id: idOf(value) || undefined, partnerId: scope.partnerId, organizationId: scope.organizationId, workspaceId: scope.workspaceId };
}

async function authorize(permission, type, value, scope, caller, context = {}) {
  return (dependencies(context.dependencies)).assertAuthorized(actor(scope), permission, resource(type, value, scope), {
    requestId: scope.requestId, traceId: scope.traceId, workspaceId: scope.workspaceId,
    performanceTesting: core.safeRedact({ requestedAction: permission, ...context.policyContext }),
  });
}

async function audit(action, type, value, scope, metadata = {}, deps = dependencies()) {
  return deps.createAuditLog(scope.actorType, scope.actorId, action, type, idOf(value), {
    organizationId: scope.organizationId, workspaceId: scope.workspaceId,
    ...core.safeRedact(metadata),
  }, { requestId: scope.requestId, traceId: scope.traceId });
}

function mutationDigests(input, purpose, scopeKey) {
  const idempotencyKey = String(input.idempotencyKey || '').trim();
  if (!idempotencyKey || idempotencyKey.length > 200) throw core.performanceError('IDEMPOTENCY_KEY_INVALID', 'A bounded Idempotency-Key is required.');
  const body = { ...input };
  for (const key of ['idempotencyKey', 'requestId', 'traceId', 'approvalRequestId', 'approvalRequestIds']) delete body[key];
  core.assertSafeObject(body, { rejectExecutable: true }, 'mutation');
  return {
    idempotencyKeyHash: `sha256:${crypto.createHash('sha256').update(`${purpose}:${scopeKey}:${idempotencyKey}`).digest('hex')}`,
    requestFingerprint: `sha256:${crypto.createHash('sha256').update(canonicalize(body)).digest('hex')}`,
  };
}

function assertReplay(record, digests) {
  if (record.requestFingerprint && record.requestFingerprint !== digests.requestFingerprint) throw core.performanceError('IDEMPOTENCY_CONFLICT', 'The idempotency key is bound to another mutation.', [], 409);
  return record;
}

function safeRecord(record) {
  if (!record) return record;
  const value = plain(record);
  for (const key of ['idempotencyKeyHash', 'requestFingerprint', '__v']) delete value[key];
  value.id = idOf(record);
  delete value._id;
  return core.safeRedact(value);
}

function scopeDefinition(input, scope, allowed = ['platform', 'organization', 'workspace']) {
  const type = allowed.includes(input.scope) ? input.scope : 'workspace';
  if (type === 'platform' && !scope.platformAuthorized) throw core.performanceError('AUTHORIZATION_DENIED', 'Platform scope requires platform authorization.', [], 403);
  return {
    scope: type,
    organizationId: type === 'platform' ? undefined : scope.organizationId,
    workspaceId: type === 'workspace' ? core.safeIdentifier(input.workspaceId || scope.workspaceId, 'workspaceId') : undefined,
    key: type === 'platform' ? 'platform' : type === 'organization' ? `organization:${scope.organizationId}` : `organization:${scope.organizationId}:workspace:${input.workspaceId || scope.workspaceId}`,
  };
}

function tenantFilter(scope, workspaceOptional = true) {
  const organization = [{ organizationId: scope.organizationId }, { scope: 'platform' }];
  const filter = { $or: organization };
  if (scope.workspaceId) filter.$and = [{ $or: [{ workspaceId: scope.workspaceId }, { workspaceId: { $exists: false } }, { workspaceId: null }] }];
  return filter;
}

function exactTenantFilter(scope) {
  return { organizationId: scope.organizationId, ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}) };
}

async function page(Model, filter, input = {}, sort = { createdAt: -1, _id: -1 }) {
  const limit = core.boundedInteger(input.limit, 'limit', 1, 100, 25);
  if (input.cursor && !/^[A-Za-z0-9_-]{1,200}$/.test(String(input.cursor))) throw core.performanceError('QUERY_CURSOR_INVALID', 'The cursor is invalid.');
  const queryFilter = { ...filter };
  if (input.cursor) queryFilter._id = { $lt: input.cursor };
  const items = await Model.find(queryFilter).sort(sort).limit(limit + 1).lean();
  const hasMore = items.length > limit;
  const selected = items.slice(0, limit);
  return { items: selected.map(safeRecord), nextCursor: hasMore ? idOf(selected.at(-1)) : null, limit };
}

async function guard(scope, deps, operation) {
  return deps.assertOperationalAccess({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, operation });
}

async function enforceGovernedApproval(input, scope, permission, resourceType, resourceId, operationType, safeRequestAttributes, deps) {
  const enforcement = await deps.enforceApproval({
    organizationId: scope.organizationId, workspaceId: scope.workspaceId,
    requesterActorId: scope.actorId, requesterActorType: scope.actorType,
    permission, resourceType, resourceId: idOf(resourceId), operationType,
    environment: process.env.NODE_ENV, safeRequestAttributes: core.safeRedact(safeRequestAttributes),
    approvalRequestId: input.approvalRequestId, approvalRequestIds: input.approvalRequestIds,
  });
  return deps.consumeApprovalGrants(enforcement, { actorId: scope.actorId, actorType: scope.actorType, requestId: scope.requestId, traceId: scope.traceId });
}

async function findScoped(Model, recordId, scope, code, options = {}) {
  let query = Model.findOne({ _id: recordId, ...tenantFilter(scope, options.workspaceOptional !== false) });
  if (options.includeDigests) query = query.select('+idempotencyKeyHash +requestFingerprint');
  const record = await query;
  if (!record || record.workspaceId && scope.workspaceId && String(record.workspaceId) !== scope.workspaceId) throw core.performanceError(code, 'The requested performance record was not found.', [], 404);
  return record;
}

function policyContext(record, action) {
  return {
    workloadDomain: record?.workloadDomain,
    testMode: record?.testMode || record?.mode,
    trafficModel: record?.trafficModel,
    targetCategory: record?.targetId ? core.getTarget(record.targetId).category : undefined,
    criticality: record?.criticality,
    requestedAction: action,
  };
}

async function createScenario(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, input.scope !== 'organization' && input.scope !== 'platform');
  await authorize('performanceScenario.create', 'PerformanceLoadScenario', null, scope, caller, { dependencies: deps, policyContext: policyContext(input, 'scenario_create') });
  await guard(scope, deps, 'PRIVILEGED_CONFIGURATION');
  const targetScope = scopeDefinition(input, scope); const digests = mutationDigests(input, 'performance-scenario-create', targetScope.key);
  const replay = await deps.PerformanceLoadScenario.findOne({ ...exactTenantFilter({ ...scope, workspaceId: targetScope.workspaceId }), idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint');
  if (replay) return safeRecord(assertReplay(replay, digests));
  const name = core.safeText(input.name || 'Performance scenario', 120);
  const latest = await deps.PerformanceLoadScenario.findOne({ scope: targetScope.scope, organizationId: targetScope.organizationId, workspaceId: targetScope.workspaceId, name }).sort({ version: -1 }).lean();
  const normalized = core.normalizeScenario({ ...input, ...targetScope, name, version: Number(input.version || latest?.version + 1 || 1), status: 'draft' });
  const record = await deps.PerformanceLoadScenario.create({ ...normalized, ...digests, createdBy: scope.actorId, updatedBy: scope.actorId });
  await audit('performance.scenario.created', 'PerformanceLoadScenario', record, scope, { scenarioVersion: record.version, workloadDomain: record.workloadDomain, testMode: record.testMode }, deps);
  return safeRecord(record);
}

async function listScenarios(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false);
  await authorize('performanceScenario.read', 'PerformanceLoadScenario', null, scope, caller, { dependencies: deps });
  const filter = tenantFilter(scope); for (const key of ['status', 'workloadDomain', 'testMode']) if (input[key]) filter[key] = String(input[key]);
  return page(deps.PerformanceLoadScenario, filter, input);
}

async function getScenario(scenarioId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false);
  await authorize('performanceScenario.read', 'PerformanceLoadScenario', scenarioId, scope, caller, { dependencies: deps });
  return safeRecord(await findScoped(deps.PerformanceLoadScenario, scenarioId, scope, 'LOAD_SCENARIO_NOT_FOUND'));
}

async function updateScenario(scenarioId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false);
  const current = await findScoped(deps.PerformanceLoadScenario, scenarioId, scope, 'LOAD_SCENARIO_NOT_FOUND');
  await authorize('performanceScenario.update', 'PerformanceLoadScenario', current, scope, caller, { dependencies: deps, policyContext: policyContext(current, 'scenario_update') });
  await guard(scope, deps, 'PRIVILEGED_CONFIGURATION');
  if (current.status !== 'draft') throw core.performanceError('LOAD_SCENARIO_IMMUTABLE', 'Active and archived scenario versions are immutable.', [], 409);
  mutationDigests(input, 'performance-scenario-update', scenarioId);
  const normalized = core.normalizeScenario({ ...plain(current), ...input, status: 'draft', version: current.version }, plain(current));
  const updated = await deps.PerformanceLoadScenario.findOneAndUpdate({ _id: current._id, status: 'draft' }, { $set: { ...normalized, updatedBy: scope.actorId }, $unset: { validation: 1 } }, { new: true, runValidators: true });
  if (!updated) throw core.performanceError('LOAD_SCENARIO_IMMUTABLE', 'The scenario changed concurrently.', [], 409);
  await audit('performance.scenario.updated', 'PerformanceLoadScenario', updated, scope, { scenarioVersion: updated.version, workloadDomain: updated.workloadDomain }, deps);
  return safeRecord(updated);
}

async function validateScenario(scenarioId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false);
  const record = await findScoped(deps.PerformanceLoadScenario, scenarioId, scope, 'LOAD_SCENARIO_NOT_FOUND');
  await authorize('performanceScenario.validate', 'PerformanceLoadScenario', record, scope, caller, { dependencies: deps, policyContext: policyContext(record, 'scenario_validate') });
  await guard(scope, deps, 'MUTATION');
  const budget = await deps.PerformanceBudgetPolicy.findOne({ _id: record.performanceBudgetPolicyId, ...tenantFilter(scope) }).lean();
  const result = core.validateScenario(plain(record), { budget, requireBudget: true });
  if (record.status === 'draft') await deps.PerformanceLoadScenario.updateOne({ _id: record._id, status: 'draft' }, { $set: { validation: { valid: result.valid, safeReasonCodes: result.safeReasonCodes, validatedAt: new Date() } } });
  await audit('performance.scenario.validated', 'PerformanceLoadScenario', record, scope, { resultStatus: result.valid ? 'valid' : 'invalid', safeReasonCodes: result.safeReasonCodes }, deps);
  return { scenarioId: idOf(record), valid: result.valid, safeReasonCodes: result.safeReasonCodes, requiresApproval: result.requiresApproval, manualOnly: result.manualOnly, targetCategory: result.targetCategory };
}

async function activateScenario(scenarioId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false);
  const record = await findScoped(deps.PerformanceLoadScenario, scenarioId, scope, 'LOAD_SCENARIO_NOT_FOUND');
  await authorize('performanceScenario.activate', 'PerformanceLoadScenario', record, scope, caller, { dependencies: deps, policyContext: policyContext(record, 'scenario_activate') });
  await guard(scope, deps, 'PRIVILEGED_CONFIGURATION'); mutationDigests(input, 'performance-scenario-activate', scenarioId);
  if (record.status === 'active') return safeRecord(record);
  if (record.status !== 'draft') throw core.performanceError('LOAD_SCENARIO_IMMUTABLE', 'Archived scenarios cannot be activated.', [], 409);
  const budget = await deps.PerformanceBudgetPolicy.findOne({ _id: record.performanceBudgetPolicyId, status: 'active', ...tenantFilter(scope) }).lean();
  const validation = core.validateScenario(plain(record), { budget, requireBudget: true });
  if (!validation.valid) throw core.performanceError(validation.safeReasonCodes[0] || 'LOAD_SCENARIO_INVALID', 'The load scenario cannot be activated.', validation.safeReasonCodes.map((code) => ({ path: 'scenario', message: code })));
  await deps.PerformanceLoadScenario.updateMany({ scope: record.scope, organizationId: record.organizationId, workspaceId: record.workspaceId, name: record.name, status: 'active', _id: { $ne: record._id } }, { $set: { status: 'archived', archivedBy: scope.actorId, archivedAt: new Date() } });
  const activated = await deps.PerformanceLoadScenario.findOneAndUpdate({ _id: record._id, status: 'draft' }, { $set: { status: 'active', validation: { valid: true, safeReasonCodes: [], validatedAt: new Date() }, activatedBy: scope.actorId, activatedAt: new Date(), updatedBy: scope.actorId } }, { new: true, runValidators: true });
  await audit('performance.scenario.activated', 'PerformanceLoadScenario', activated, scope, { scenarioVersion: activated.version, workloadDomain: activated.workloadDomain, testMode: activated.testMode }, deps);
  return safeRecord(activated);
}

async function archiveScenario(scenarioId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false);
  const record = await findScoped(deps.PerformanceLoadScenario, scenarioId, scope, 'LOAD_SCENARIO_NOT_FOUND');
  await authorize('performanceScenario.archive', 'PerformanceLoadScenario', record, scope, caller, { dependencies: deps }); await guard(scope, deps, 'PRIVILEGED_CONFIGURATION'); mutationDigests(input, 'performance-scenario-archive', scenarioId);
  if (record.status === 'archived') return safeRecord(record);
  const archived = await deps.PerformanceLoadScenario.findOneAndUpdate({ _id: record._id, status: { $in: ['draft', 'active'] } }, { $set: { status: 'archived', archivedBy: scope.actorId, archivedAt: new Date(), updatedBy: scope.actorId } }, { new: true });
  await audit('performance.scenario.archived', 'PerformanceLoadScenario', archived, scope, { scenarioVersion: archived.version }, deps); return safeRecord(archived);
}

async function createBudget(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const workspaceRequired = ['workspace', 'orchestration_definition'].includes(input.scope); const scope = scopeFrom(input, caller, workspaceRequired);
  await authorize('performanceBudget.create', 'PerformanceBudgetPolicy', null, scope, caller, { dependencies: deps, policyContext: { workloadDomain: input.workloadDomain, requestedAction: 'budget_create' } }); await guard(scope, deps, 'PRIVILEGED_CONFIGURATION');
  const targetScope = scopeDefinition(input, scope, ['platform', 'organization', 'workspace', 'orchestration_definition', 'workload_domain']);
  if (['orchestration_definition', 'workload_domain'].includes(input.scope)) { targetScope.scope = input.scope; targetScope.organizationId = scope.organizationId; targetScope.workspaceId = scope.workspaceId; targetScope.key = `${input.scope}:${scope.organizationId}:${scope.workspaceId || 'all'}:${input.workloadDomain || input.orchestrationDefinitionId || 'all'}`; }
  const digests = mutationDigests(input, 'performance-budget-create', targetScope.key);
  const replay = await deps.PerformanceBudgetPolicy.findOne({ organizationId: targetScope.organizationId, workspaceId: targetScope.workspaceId, idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint');
  if (replay) return safeRecord(assertReplay(replay, digests));
  const name = core.safeText(input.name || 'Performance budget', 120); const latest = await deps.PerformanceBudgetPolicy.findOne({ scope: targetScope.scope, organizationId: targetScope.organizationId, workspaceId: targetScope.workspaceId, name }).sort({ version: -1 }).lean();
  const normalized = core.normalizeBudget({ ...input, ...targetScope, name, version: Number(input.version || latest?.version + 1 || 1), status: 'draft' });
  const record = await deps.PerformanceBudgetPolicy.create({ ...normalized, ...digests, createdBy: scope.actorId, updatedBy: scope.actorId });
  await audit('performance.budget.created', 'PerformanceBudgetPolicy', record, scope, { budgetVersion: record.version, workloadDomain: record.workloadDomain }, deps); return safeRecord(record);
}

async function listBudgets(input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); await authorize('performanceBudget.read', 'PerformanceBudgetPolicy', null, scope, caller, { dependencies: deps }); const filter = tenantFilter(scope); for (const key of ['status', 'workloadDomain', 'scope']) if (input[key]) filter[key] = String(input[key]); return page(deps.PerformanceBudgetPolicy, filter, input); }
async function getBudget(budgetId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); await authorize('performanceBudget.read', 'PerformanceBudgetPolicy', budgetId, scope, caller, { dependencies: deps }); return safeRecord(await findScoped(deps.PerformanceBudgetPolicy, budgetId, scope, 'PERFORMANCE_BUDGET_NOT_FOUND')); }

async function updateBudget(budgetId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); const current = await findScoped(deps.PerformanceBudgetPolicy, budgetId, scope, 'PERFORMANCE_BUDGET_NOT_FOUND');
  await authorize('performanceBudget.update', 'PerformanceBudgetPolicy', current, scope, caller, { dependencies: deps }); await guard(scope, deps, 'PRIVILEGED_CONFIGURATION');
  if (current.status !== 'draft') throw core.performanceError('PERFORMANCE_BUDGET_IMMUTABLE', 'Active and archived budgets are immutable.', [], 409); mutationDigests(input, 'performance-budget-update', budgetId);
  const normalized = core.normalizeBudget({ ...plain(current), ...input, status: 'draft', version: current.version }, plain(current));
  const updated = await deps.PerformanceBudgetPolicy.findOneAndUpdate({ _id: current._id, status: 'draft' }, { $set: { ...normalized, updatedBy: scope.actorId }, $unset: { validation: 1 } }, { new: true, runValidators: true });
  await audit('performance.budget.updated', 'PerformanceBudgetPolicy', updated, scope, { budgetVersion: updated.version }, deps); return safeRecord(updated);
}

async function validateBudget(budgetId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); const record = await findScoped(deps.PerformanceBudgetPolicy, budgetId, scope, 'PERFORMANCE_BUDGET_NOT_FOUND');
  await authorize('performanceBudget.validate', 'PerformanceBudgetPolicy', record, scope, caller, { dependencies: deps }); await guard(scope, deps, 'MUTATION'); const result = core.validateBudget(plain(record));
  if (record.status === 'draft') await deps.PerformanceBudgetPolicy.updateOne({ _id: record._id }, { $set: { validation: { valid: result.valid, safeReasonCodes: result.safeReasonCodes, validatedAt: new Date() } } });
  await audit('performance.budget.validated', 'PerformanceBudgetPolicy', record, scope, { resultStatus: result.valid ? 'valid' : 'invalid', safeReasonCodes: result.safeReasonCodes }, deps); return { budgetId: idOf(record), valid: result.valid, safeReasonCodes: result.safeReasonCodes };
}

async function activateBudget(budgetId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); const record = await findScoped(deps.PerformanceBudgetPolicy, budgetId, scope, 'PERFORMANCE_BUDGET_NOT_FOUND');
  await authorize('performanceBudget.activate', 'PerformanceBudgetPolicy', record, scope, caller, { dependencies: deps, policyContext: { workloadDomain: record.workloadDomain, requestedAction: 'budget_activate' } }); await guard(scope, deps, 'PRIVILEGED_CONFIGURATION'); mutationDigests(input, 'performance-budget-activate', budgetId);
  if (record.status === 'active') return safeRecord(record); if (record.status !== 'draft') throw core.performanceError('PERFORMANCE_BUDGET_IMMUTABLE', 'Archived budgets cannot be activated.', [], 409);
  const validation = core.validateBudget(plain(record)); if (!validation.valid) throw core.performanceError('PERFORMANCE_BUDGET_INVALID', 'The budget cannot be activated.', validation.safeReasonCodes.map((code) => ({ path: 'budget', message: code })));
  await deps.PerformanceBudgetPolicy.updateMany({ scope: record.scope, organizationId: record.organizationId, workspaceId: record.workspaceId, name: record.name, status: 'active', _id: { $ne: record._id } }, { $set: { status: 'archived', archivedBy: scope.actorId, archivedAt: new Date() } });
  const activated = await deps.PerformanceBudgetPolicy.findOneAndUpdate({ _id: record._id, status: 'draft' }, { $set: { status: 'active', activatedBy: scope.actorId, activatedAt: new Date(), updatedBy: scope.actorId, validation: { valid: true, safeReasonCodes: [], validatedAt: new Date() } } }, { new: true, runValidators: true });
  await audit('performance.budget.activated', 'PerformanceBudgetPolicy', activated, scope, { budgetVersion: activated.version, workloadDomain: activated.workloadDomain }, deps); return safeRecord(activated);
}

async function archiveBudget(budgetId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); const record = await findScoped(deps.PerformanceBudgetPolicy, budgetId, scope, 'PERFORMANCE_BUDGET_NOT_FOUND'); await authorize('performanceBudget.archive', 'PerformanceBudgetPolicy', record, scope, caller, { dependencies: deps }); await guard(scope, deps, 'PRIVILEGED_CONFIGURATION'); mutationDigests(input, 'performance-budget-archive', budgetId); if (record.status === 'archived') return safeRecord(record); const archived = await deps.PerformanceBudgetPolicy.findOneAndUpdate({ _id: record._id }, { $set: { status: 'archived', archivedBy: scope.actorId, archivedAt: new Date(), updatedBy: scope.actorId } }, { new: true }); await audit('performance.budget.archived', 'PerformanceBudgetPolicy', archived, scope, { budgetVersion: archived.version }, deps); return safeRecord(archived); }

async function ensureFingerprint(input, deps) {
  const fingerprint = core.createEnvironmentFingerprint(input || {});
  const existing = await deps.PerformanceEnvironmentFingerprint.findOne({ fingerprintId: fingerprint.fingerprintId });
  return existing || deps.PerformanceEnvironmentFingerprint.create(fingerprint);
}

async function createRun(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, true);
  const scenario = await findScoped(deps.PerformanceLoadScenario, core.safeIdentifier(input.scenarioId, 'scenarioId'), scope, 'LOAD_SCENARIO_NOT_FOUND');
  await authorize('performanceRun.create', 'PerformanceTestRun', null, scope, caller, { dependencies: deps, policyContext: policyContext(scenario, 'run_create') }); await guard(scope, deps, scenario.testMode === 'production_observation_only' ? 'SAFE_READ' : 'EXECUTION');
  if (scenario.status !== 'active') throw core.performanceError('LOAD_SCENARIO_INVALID', 'Only an active scenario can create a run.', [], 409);
  const budget = await deps.PerformanceBudgetPolicy.findOne({ _id: scenario.performanceBudgetPolicyId, status: 'active', ...tenantFilter(scope) }); if (!budget) throw core.performanceError('LOAD_SCENARIO_BUDGET_MISSING', 'An active performance budget is required.');
  const digests = mutationDigests(input, 'performance-run-create', `${scope.organizationId}:${scope.workspaceId}`);
  const replay = await deps.PerformanceTestRun.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint'); if (replay) return safeRecord(assertReplay(replay, digests));
  const fingerprint = await ensureFingerprint({ ...(input.environmentFingerprint || {}), environmentCategory: input.environmentFingerprint?.environmentCategory || (scenario.testMode === 'integration_load' ? 'integration' : scenario.testMode.startsWith('staging_') ? 'staging' : scenario.testMode === 'production_observation_only' ? 'production_observation' : 'local'), executionWorkerCount: scenario.workerCount }, deps);
  const run = await deps.PerformanceTestRun.create({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, scenarioId: idOf(scenario), scenarioVersion: scenario.version, budgetPolicyId: idOf(budget), budgetPolicyVersion: budget.version, baselineId: input.baselineId, environmentFingerprintId: fingerprint.fingerprintId, mode: scenario.testMode, workloadDomain: scenario.workloadDomain, status: 'requested', trafficModel: scenario.trafficModel, targetId: scenario.targetId, configuredDurationMs: scenario.durationMs, targetConcurrency: scenario.targetConcurrency, targetRequestsPerSecond: scenario.targetRequestsPerSecond, cleanupStatus: 'pending', requestId: scope.requestId, traceId: scope.traceId, requestedBy: scope.actorId, ...digests });
  await audit('performance.run.requested', 'PerformanceTestRun', run, scope, { scenarioVersion: scenario.version, workloadDomain: run.workloadDomain, testMode: run.mode, targetCategory: core.getTarget(run.targetId).category }, deps); metrics.increment('performance_runs', { mode: run.mode, status: run.status, workloadDomain: run.workloadDomain }); return safeRecord(run);
}

async function listRuns(input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, true); await authorize('performanceRun.read', 'PerformanceTestRun', null, scope, caller, { dependencies: deps }); const filter = exactTenantFilter(scope); for (const key of ['status', 'workloadDomain', 'mode']) if (input[key]) filter[key] = String(input[key]); return page(deps.PerformanceTestRun, filter, input); }
async function getRun(runId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, true); await authorize('performanceRun.read', 'PerformanceTestRun', runId, scope, caller, { dependencies: deps }); return safeRecord(await findScoped(deps.PerformanceTestRun, runId, scope, 'PERFORMANCE_RUN_NOT_FOUND', { workspaceOptional: false })); }

async function setRunStatus(run, nextStatus, deps, fields = {}) {
  core.transitionRun(run.status, nextStatus); const updated = await deps.PerformanceTestRun.findOneAndUpdate({ _id: run._id, status: run.status }, { $set: { status: nextStatus, ...fields } }, { new: true, runValidators: true });
  if (!updated) throw core.performanceError('PERFORMANCE_RUN_TRANSITION_CONFLICT', 'The performance run changed concurrently.', [], 409); return updated;
}

function measurementHistogram(value) { return value && Array.isArray(value.buckets) && Array.isArray(value.counts) ? { buckets: value.buckets, counts: value.counts, count: value.count, sum: value.sum, maximum: value.maximum } : core.createHistogram([]); }

async function persistWindows(run, windows, scenario, deps) {
  let cursor = new Date(run.startedAt || Date.now()).getTime();
  for (const window of windows.slice(0, 100)) {
    const duration = window.stage === 'warmup' ? scenario.warmupDurationMs : window.stage === 'cooldown' ? scenario.cooldownDurationMs : scenario.steadyStateDurationMs;
    const fairness = window.tenantFairnessSummary || {};
    const safeFairness = Object.fromEntries(Object.entries(fairness).filter(([, value]) => typeof value === 'string' || Number.isFinite(value)).slice(0, 32));
    await deps.PerformanceMeasurementWindow.create({ performanceRunId: idOf(run), windowStart: new Date(cursor), windowEnd: new Date(cursor + duration), sequence: window.sequence, stage: window.stage, stageCategory: window.stage, requestCount: window.requestCount || 0, successCount: window.successCount || 0, expectedRejectionCount: window.expectedRejectionCount || 0, unexpectedFailureCount: window.unexpectedFailureCount || 0, timeoutCount: window.timeoutCount || 0, retryCount: window.retryCount || 0, latencyHistogram: measurementHistogram(window.latencyHistogram), queueWaitHistogram: measurementHistogram(window.queueWaitHistogram), executionHistogram: core.createHistogram([]), databaseHistogram: core.createHistogram([]), cacheHistogram: core.createHistogram([]), policyHistogram: core.createHistogram([]), throughput: window.throughput || 0, activeConcurrency: window.activeConcurrency || 0, workerUtilizationCategory: window.workerUtilizationCategory || 'unknown', databasePressureCategory: window.databasePressureCategory || 'healthy', cacheHealthCategory: window.cacheHealthCategory || 'unknown', backpressureState: window.backpressureState || 'normal', queueDepthCategory: window.queueDepthCategory === 'empty' ? 'none' : window.queueDepthCategory || 'unknown', oldestQueueAgeCategory: window.oldestQueueAgeCategory || 'unknown', tenantFairnessSummary: safeFairness, safeFailureCounts: window.safeFailureCounts || {} });
    cursor += duration;
  }
}

async function executeRun(runId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, true); let run = await findScoped(deps.PerformanceTestRun, runId, scope, 'PERFORMANCE_RUN_NOT_FOUND', { workspaceOptional: false });
  const permission = run.mode === 'integration_load' ? 'performanceRun.executeIntegration' : run.mode.startsWith('staging_') ? 'performanceRun.executeStaging' : 'performanceRun.executeLocal';
  await authorize(permission, 'PerformanceTestRun', run, scope, caller, { dependencies: deps, policyContext: policyContext(run, 'run_execute') });
  const heavyExecution = run.mode === 'local_load' || run.mode.startsWith('staging_') || ['spike', 'stress', 'soak', 'burst'].includes(run.trafficModel) || ['regional_failover_simulation', 'backup_restore_simulation'].includes(run.workloadDomain);
  if (heavyExecution) await authorize('performanceRun.executeHeavy', 'PerformanceTestRun', run, scope, caller, { dependencies: deps, policyContext: policyContext(run, 'heavy_run_execute') });
  await guard(scope, deps, run.mode === 'production_observation_only' ? 'SAFE_READ' : 'EXECUTION'); mutationDigests(input, 'performance-run-execute', runId);
  if (!['requested', 'approval_required'].includes(run.status)) return safeRecord(run);
  const scenario = await findScoped(deps.PerformanceLoadScenario, run.scenarioId, scope, 'LOAD_SCENARIO_NOT_FOUND'); const budget = await findScoped(deps.PerformanceBudgetPolicy, run.budgetPolicyId, scope, 'PERFORMANCE_BUDGET_NOT_FOUND');
  if (run.status === 'requested') run = await setRunStatus(run, 'validating', deps);
  const validation = core.validateScenario(plain(scenario), { budget: plain(budget), requireBudget: true });
  if (!validation.valid) { run = await setRunStatus(run, 'failed', deps, { safeFailureCodes: validation.safeReasonCodes, completedAt: new Date(), budgetEvaluationStatus: 'failed' }); await audit('performance.run.failed', 'PerformanceTestRun', run, scope, { safeReasonCodes: validation.safeReasonCodes }, deps); return safeRecord(run); }
  await audit('performance.run.validated', 'PerformanceTestRun', run, scope, { workloadDomain: run.workloadDomain, testMode: run.mode }, deps);
  if (validation.manualOnly && input.manualConfirmation !== true) throw core.performanceError('PERFORMANCE_RUN_MANUAL_CONFIRMATION_REQUIRED', 'This performance mode requires explicit manual confirmation.', [], 409);
  if (run.mode.startsWith('staging_') && !input.reasonCode) throw core.performanceError('LOAD_SCENARIO_APPROVAL_REQUIRED', 'Staging execution requires a bounded reason code.', [], 409);
  if (validation.requiresApproval) {
    if (run.status === 'validating') run = await setRunStatus(run, 'approval_required', deps, { approvalRequestId: input.approvalRequestId });
    if (!input.approvalRequestId) throw core.performanceError('LOAD_SCENARIO_APPROVAL_REQUIRED', 'The load scenario requires an approval.', [], 409);
    await enforceGovernedApproval(input, scope, permission, 'PerformanceTestRun', run, 'PERFORMANCE_TEST_EXECUTION', { workloadDomain: run.workloadDomain, mode: run.mode, trafficModel: run.trafficModel, targetCategory: validation.targetCategory, concurrency: run.targetConcurrency, requestRate: run.targetRequestsPerSecond, durationMs: run.configuredDurationMs }, deps);
    run = await setRunStatus(run, 'approved', deps, { approvalRequestId: input.approvalRequestId });
  }
  run = await setRunStatus(run, 'preparing', deps, { startedAt: new Date() });
  await audit('performance.run.started', 'PerformanceTestRun', run, scope, { workloadDomain: run.workloadDomain, testMode: run.mode }, deps);
  let simulation; let fixture;
  if (run.mode === 'production_observation_only') {
    const observation = core.safeClone(input.observationSummary || {}, { rejectExecutable: true });
    simulation = { summary: { requestCount: 0, successfulRequestCount: 0, expectedRejectionCount: 0, unexpectedFailureCount: 0, timeoutCount: 0, retryCount: 0, cancelledCount: 0, latencyPercentiles: core.percentileSummary([]), throughputSummary: {}, queueSummary: {}, workerSummary: {}, databaseSummary: {}, cacheSummary: {}, fairnessSummary: {}, recoverySummary: {}, regionalSummary: {}, ...observation }, windows: [], invariants: { acceptedWorkDurable: true, noDuplicateExecution: true, tenantIsolation: true, requestTraceLineage: true, protectedRecoveryCapacity: true } };
  } else {
    const manifest = core.generateFixtureManifest(plain(scenario));
    fixture = await deps.PerformanceFixtureSet.create({ fixtureSetId: manifest.fixtureSetId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, scenarioId: idOf(scenario), scenarioVersion: scenario.version, seed: Number(scenario.fixtureSeed), status: 'in_use', entityCounts: manifest.entityCounts, safeSizeCategory: Object.values(manifest.entityCounts).reduce((sum, value) => sum + value, 0) > 1_000 ? 'large' : 'small', testOrigin: true, cleanupTag: manifest.cleanupTag, createdBy: scope.actorId });
    run.fixtureSetId = fixture.fixtureSetId;
    simulation = deps.executeScenarioSimulation(plain(scenario), { includeRegional: scenario.workloadDomain === 'regional_failover_simulation' || input.includeRegionalSimulation === true, forceSpike: scenario.trafficModel === 'spike' });
  }
  run = await setRunStatus(run, 'warming_up', deps, { fixtureSetId: fixture?.fixtureSetId, cleanupStatus: fixture ? 'pending' : 'not_required' }); await audit('performance.run.stage_started', 'PerformanceTestRun', run, scope, { stage: 'warmup' }, deps);
  run = await setRunStatus(run, 'running', deps); await audit('performance.run.stage_completed', 'PerformanceTestRun', run, scope, { stage: 'warmup' }, deps); await audit('performance.run.stage_started', 'PerformanceTestRun', run, scope, { stage: 'steady_state' }, deps);
  if (simulation.windows.length) await persistWindows(run, simulation.windows, plain(scenario), deps);
  const abort = core.evaluateAbortConditions(simulation.summary, scenario.abortConditions || []);
  if (abort.abort) { run = await setRunStatus(run, 'aborted', deps, { safeFailureCodes: abort.safeReasonCodes, completedAt: new Date(), budgetEvaluationStatus: 'aborted' }); await audit('performance.run.aborted', 'PerformanceTestRun', run, scope, { safeReasonCodes: abort.safeReasonCodes }, deps); return safeRecord(run); }
  const stop = core.evaluateAbortConditions(simulation.summary, scenario.stopConditions || []);
  run = await setRunStatus(run, 'cooling_down', deps); await audit('performance.run.stage_completed', 'PerformanceTestRun', run, scope, { stage: 'steady_state' }, deps); await audit('performance.run.stage_started', 'PerformanceTestRun', run, scope, { stage: 'cooldown' }, deps); run = await setRunStatus(run, 'analyzing', deps); await audit('performance.run.stage_completed', 'PerformanceTestRun', run, scope, { stage: 'cooldown' }, deps);
  const evaluation = core.evaluateBudget(simulation.summary, plain(budget), { intentionalOverload: ['spike', 'stress', 'burst'].includes(scenario.trafficModel), acceptedWorkPreserved: simulation.invariants.acceptedWorkDurable, protectedCapacityAvailable: simulation.invariants.protectedRecoveryCapacity, duplicateExecution: !simulation.invariants.noDuplicateExecution, safeWarnings: stop.abort ? stop.safeReasonCodes.map((code) => `STOP_${code}`) : [] });
  let regressionStatus; if (run.baselineId) {
    const baseline = await findScoped(deps.PerformanceBaseline, run.baselineId, scope, 'PERFORMANCE_BASELINE_NOT_FOUND'); const [baselineEnvironment, runEnvironment] = await Promise.all([deps.PerformanceEnvironmentFingerprint.findOne({ fingerprintId: baseline.environmentFingerprintId }).lean(), deps.PerformanceEnvironmentFingerprint.findOne({ fingerprintId: run.environmentFingerprintId }).lean()]);
    const regression = core.compareRegression({ baseline: plain(baseline), run: { ...simulation.summary, sampleSize: simulation.summary.requestCount, workloadDomain: run.workloadDomain, scenarioVersion: run.scenarioVersion, mode: run.mode, budgetPolicyVersion: run.budgetPolicyVersion, fixtureScale: { tenantCount: scenario.tenantCount, workspaceCount: scenario.workspaceCount, userCount: scenario.userCount, orchestrationDefinitionCount: scenario.orchestrationDefinitionCount, mockAgentCount: scenario.mockAgentCount, workerCount: scenario.workerCount }, errorRateBasisPoints: core.rateBasisPoints(simulation.summary.unexpectedFailureCount + simulation.summary.timeoutCount + simulation.summary.unknownOutcomeCount, simulation.summary.requestCount) }, baselineEnvironment, runEnvironment, regressionToleranceBasisPoints: budget.regressionToleranceBasisPoints, absoluteRegressionToleranceMs: budget.absoluteRegressionToleranceMs, minimumSampleSize: budget.minimumSampleSize });
    regressionStatus = regression.status; await deps.PerformanceRegressionEvaluation.findOneAndUpdate({ performanceRunId: idOf(run) }, { $setOnInsert: { performanceRunId: idOf(run), baselineId: idOf(baseline), environmentCompatibility: regression.environmentCompatibility || 'unknown', sampleCompatibility: regression.sampleCompatibility === true, status: regression.status, latencyChanges: regression.latencyChanges || {}, throughputChanges: regression.throughputChanges || {}, errorRateChanges: regression.errorRateChanges || {}, queueChanges: regression.queueChanges || {}, databaseChanges: regression.databaseChanges || {}, cacheChanges: regression.cacheChanges || {}, workerChanges: regression.workerChanges || {}, fairnessChanges: regression.fairnessChanges || {}, recoveryChanges: regression.recoveryChanges || {}, regionalChanges: regression.regionalChanges || {}, safeReasonCodes: regression.safeReasonCodes || [], generatedAt: new Date() } }, { upsert: true, new: true, runValidators: true });
    await audit(regression.status === 'regressed' ? 'performance.regression.detected' : 'performance.regression.cleared', 'PerformanceRegressionEvaluation', run, scope, { regressionStatus: regression.status, safeReasonCodes: regression.safeReasonCodes }, deps);
  }
  const finalStatus = evaluation.status === 'passed' ? 'passed' : evaluation.status === 'passed_with_warnings' ? 'passed_with_warnings' : 'failed';
  const latency = simulation.summary.latencyPercentiles || {}; const update = { actualDurationMs: scenario.durationMs, achievedConcurrency: scenario.targetConcurrency, achievedRequestsPerSecond: simulation.summary.throughputSummary?.requestsPerSecond || 0, requestCount: simulation.summary.requestCount || 0, successfulRequestCount: simulation.summary.successfulRequestCount || 0, expectedRejectionCount: simulation.summary.expectedRejectionCount || 0, overloadRejectionCount: simulation.summary.overloadRejectionCount || 0, quotaRejectionCount: simulation.summary.quotaRejectionCount || 0, unexpectedFailureCount: simulation.summary.unexpectedFailureCount || 0, timeoutCount: simulation.summary.timeoutCount || 0, retryCount: simulation.summary.retryCount || 0, cancelledCount: simulation.summary.cancelledCount || 0, unknownOutcomeCount: simulation.summary.unknownOutcomeCount || 0, correctnessViolationCount: simulation.summary.correctnessViolationCount || 0, securityViolationCount: simulation.summary.securityViolationCount || 0, errorRateBasisPoints: core.rateBasisPoints((simulation.summary.unexpectedFailureCount || 0) + (simulation.summary.timeoutCount || 0) + (simulation.summary.unknownOutcomeCount || 0), simulation.summary.requestCount), outcomeCounts: simulation.summary.outcomeCounts || {}, latencyPercentiles: { p50Ms: latency.p50Ms || 0, p90Ms: latency.p90Ms || 0, p95Ms: latency.p95Ms || 0, p99Ms: latency.p99Ms || 0, maximumMs: latency.maximumMs || 0 }, throughputSummary: simulation.summary.throughputSummary || {}, queueSummary: simulation.summary.queueSummary || {}, workerSummary: simulation.summary.workerSummary || {}, databaseSummary: simulation.summary.databaseSummary || {}, cacheSummary: simulation.summary.cacheSummary || {}, fairnessSummary: simulation.summary.fairnessSummary || {}, recoverySummary: simulation.summary.recoverySummary || {}, regionalSummary: simulation.summary.regionalSummary || {}, budgetEvaluationStatus: evaluation.status, regressionEvaluationStatus: regressionStatus, safeFailureCodes: evaluation.safeReasonCodes || [], safeWarnings: evaluation.safeWarnings || [], completedAt: new Date() };
  run = await setRunStatus(run, finalStatus, deps, update); metrics.increment('performance_runs', { mode: run.mode, status: finalStatus, workloadDomain: run.workloadDomain }); metrics.increment('performance_budget_evaluations', { budgetEvaluationState: evaluation.status, workloadDomain: run.workloadDomain });
  if (update.correctnessViolationCount > 0) await audit('performance.correctness.violation_detected', 'PerformanceTestRun', run, scope, { safeReasonCodes: ['PERFORMANCE_CORRECTNESS_VIOLATION'] }, deps);
  if (update.securityViolationCount > 0) await audit('performance.security.violation_detected', 'PerformanceTestRun', run, scope, { safeReasonCodes: ['PERFORMANCE_SECURITY_VIOLATION'] }, deps);
  await audit(`performance.budget.${evaluation.status === 'passed_with_warnings' ? 'warning' : evaluation.status}`, 'PerformanceTestRun', run, scope, { budgetStatus: evaluation.status, safeReasonCodes: evaluation.safeReasonCodes }, deps); await audit(finalStatus === 'failed' ? 'performance.run.failed' : 'performance.run.completed', 'PerformanceTestRun', run, scope, { resultStatus: finalStatus, budgetStatus: evaluation.status, regressionStatus }, deps);
  return safeRecord(run);
}

async function terminalRunAction(action, runId, input, caller, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, true); let run = await findScoped(deps.PerformanceTestRun, runId, scope, 'PERFORMANCE_RUN_NOT_FOUND', { workspaceOptional: false }); const permission = action === 'cancelled' ? 'performanceRun.cancel' : 'performanceRun.abort';
  await authorize(permission, 'PerformanceTestRun', run, scope, caller, { dependencies: deps }); mutationDigests(input, `performance-run-${action}`, runId);
  if ([action, 'cleanup_required', 'cleaned_up'].includes(run.status)) return safeRecord(run); run = await setRunStatus(run, action, deps, { completedAt: new Date(), safeFailureCodes: [action === 'aborted' ? core.safeIdentifier(input.reasonCode || 'PERFORMANCE_RUN_MANUAL_ABORT', 'reasonCode') : 'PERFORMANCE_RUN_CANCELLED'] });
  await audit(`performance.run.${action}`, 'PerformanceTestRun', run, scope, { safeReasonCodes: run.safeFailureCodes }, deps); return safeRecord(run);
}
function cancelRun(runId, input = {}, caller = {}, options = {}) { return terminalRunAction('cancelled', runId, input, caller, options); }
function abortRun(runId, input = {}, caller = {}, options = {}) { return terminalRunAction('aborted', runId, input, caller, options); }

async function cleanupRun(runId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, true); let run = await findScoped(deps.PerformanceTestRun, runId, scope, 'PERFORMANCE_RUN_NOT_FOUND', { workspaceOptional: false });
  await authorize('performanceRun.cleanup', 'PerformanceTestRun', run, scope, caller, { dependencies: deps, policyContext: policyContext(run, 'cleanup') }); await guard(scope, deps, 'MUTATION'); mutationDigests(input, 'performance-run-cleanup', runId);
  if (run.status === 'cleaned_up') return safeRecord(run); if (!['passed', 'passed_with_warnings', 'failed', 'aborted', 'cancelled', 'cleanup_required'].includes(run.status)) throw core.performanceError('PERFORMANCE_RUN_TRANSITION_INVALID', 'The run is not ready for cleanup.', [], 409);
  if (run.status !== 'cleanup_required') run = await setRunStatus(run, 'cleanup_required', deps, { cleanupStatus: 'in_progress' });
  try {
    if (run.fixtureSetId) {
      const fixture = await deps.PerformanceFixtureSet.findOneAndUpdate({ fixtureSetId: run.fixtureSetId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, testOrigin: true }, { $set: { status: 'cleaned', cleanupStartedAt: new Date(), cleanedAt: new Date() }, $inc: { cleanupAttempt: 1 } }, { new: true });
      if (!fixture) throw core.performanceError('PERFORMANCE_FIXTURE_NOT_FOUND', 'The scoped performance fixture set was not found.', [], 404);
    }
  } catch (error) {
    await deps.PerformanceTestRun.updateOne({ _id: run._id, status: 'cleanup_required' }, { $set: { cleanupStatus: 'failed' }, $addToSet: { safeFailureCodes: 'PERFORMANCE_FIXTURE_CLEANUP_FAILED' } });
    metrics.increment('performance_fixture_cleanup', { cleanupResult: 'failed' });
    await audit('performance.fixture.cleanup_failed', 'PerformanceTestRun', run, scope, { safeReasonCodes: ['PERFORMANCE_FIXTURE_CLEANUP_FAILED'] }, deps);
    throw error;
  }
  run = await setRunStatus(run, 'cleaned_up', deps, { cleanupStatus: 'completed' }); metrics.increment('performance_fixture_cleanup', { cleanupResult: 'completed' }); await audit('performance.run.cleaned_up', 'PerformanceTestRun', run, scope, { cleanupResult: 'completed' }, deps); return safeRecord(run);
}

async function listMeasurementWindows(runId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, true); await authorize('performanceRun.read', 'PerformanceMeasurementWindow', runId, scope, caller, { dependencies: deps }); await findScoped(deps.PerformanceTestRun, runId, scope, 'PERFORMANCE_RUN_NOT_FOUND', { workspaceOptional: false }); return page(deps.PerformanceMeasurementWindow, { performanceRunId: runId }, input, { sequence: 1, _id: 1 }); }
async function getBudgetEvaluation(runId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, true); await authorize('performanceRun.read', 'PerformanceTestRun', runId, scope, caller, { dependencies: deps }); const run = await findScoped(deps.PerformanceTestRun, runId, scope, 'PERFORMANCE_RUN_NOT_FOUND', { workspaceOptional: false }); const budget = await findScoped(deps.PerformanceBudgetPolicy, run.budgetPolicyId, scope, 'PERFORMANCE_BUDGET_NOT_FOUND'); return core.evaluateBudget(plain(run), plain(budget), { intentionalOverload: ['spike', 'stress', 'burst'].includes(run.trafficModel), acceptedWorkPreserved: !run.safeFailureCodes.includes('ACCEPTED_WORK_LOST'), protectedCapacityAvailable: !run.safeFailureCodes.includes('PROTECTED_CAPACITY_LOST') }); }
async function getRegressionEvaluation(runId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, true); await authorize('performanceRun.read', 'PerformanceRegressionEvaluation', runId, scope, caller, { dependencies: deps }); await findScoped(deps.PerformanceTestRun, runId, scope, 'PERFORMANCE_RUN_NOT_FOUND', { workspaceOptional: false }); const result = await deps.PerformanceRegressionEvaluation.findOne({ performanceRunId: runId }).lean(); return result ? safeRecord(result) : { status: 'insufficient_data', safeReasonCodes: ['PERFORMANCE_BASELINE_MISSING'] }; }

async function createBaseline(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, true); await authorize('performanceBaseline.create', 'PerformanceBaseline', null, scope, caller, { dependencies: deps, policyContext: { requestedAction: 'baseline_create' } }); await guard(scope, deps, 'MUTATION'); const run = await findScoped(deps.PerformanceTestRun, core.safeIdentifier(input.sourceRunId || input.runId, 'sourceRunId'), scope, 'PERFORMANCE_RUN_NOT_FOUND', { workspaceOptional: false });
  if (!['passed', 'passed_with_warnings', 'cleanup_required', 'cleaned_up'].includes(run.status)) throw core.performanceError('PERFORMANCE_BASELINE_RUN_NOT_ELIGIBLE', 'Only a passing run can become a baseline.', [], 409); const digests = mutationDigests(input, 'performance-baseline-create', `${scope.organizationId}:${scope.workspaceId}`);
  const replay = await deps.PerformanceBaseline.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint'); if (replay) return safeRecord(assertReplay(replay, digests));
  const name = core.safeText(input.baselineName || 'Performance baseline', 120); const latest = await deps.PerformanceBaseline.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, baselineName: name }).sort({ baselineVersion: -1 }).lean(); const [budget, scenario] = await Promise.all([findScoped(deps.PerformanceBudgetPolicy, run.budgetPolicyId, scope, 'PERFORMANCE_BUDGET_NOT_FOUND'), findScoped(deps.PerformanceLoadScenario, run.scenarioId, scope, 'LOAD_SCENARIO_NOT_FOUND')]);
  const latency = run.latencyPercentiles || {};
  const record = await deps.PerformanceBaseline.create({ scope: 'workspace', organizationId: scope.organizationId, workspaceId: scope.workspaceId, workloadDomain: run.workloadDomain, scenarioId: run.scenarioId, scenarioVersion: run.scenarioVersion, baselineName: name, baselineVersion: Number(input.baselineVersion || latest?.baselineVersion + 1 || 1), environmentFingerprintId: run.environmentFingerprintId, softwareVersion: core.safeText(input.softwareVersion || '0.1.0', 128), protocolVersion: core.safeText(input.protocolVersion || '1', 128), schemaVersion: core.safeText(input.schemaVersion || '13E4', 128), migrationVersion: core.safeText(input.migrationVersion || '1304', 128), routingVersion: core.safeText(input.routingVersion || '1', 128), cacheSerializationVersion: core.safeText(input.cacheSerializationVersion || '1', 128), sampleSize: run.requestCount, errorRateBasisPoints: core.rateBasisPoints(run.unexpectedFailureCount + run.timeoutCount + run.unknownOutcomeCount, run.requestCount), regressionToleranceBasisPoints: budget.regressionToleranceBasisPoints, absoluteRegressionToleranceMs: budget.absoluteRegressionToleranceMs, summaryMetrics: { successfulRequestCount: run.successfulRequestCount, expectedRejectionCount: run.expectedRejectionCount, unexpectedFailureCount: run.unexpectedFailureCount, timeoutCount: run.timeoutCount, mode: run.mode, budgetPolicyVersion: run.budgetPolicyVersion, fixtureScale: { tenantCount: scenario.tenantCount, workspaceCount: scenario.workspaceCount, userCount: scenario.userCount, orchestrationDefinitionCount: scenario.orchestrationDefinitionCount, mockAgentCount: scenario.mockAgentCount, workerCount: scenario.workerCount } }, latencyPercentiles: { p50Ms: latency.p50Ms, p90Ms: latency.p90Ms, p95Ms: latency.p95Ms, p99Ms: latency.p99Ms, maximumMs: latency.maximumMs }, throughputSummary: run.throughputSummary, queueSummary: run.queueSummary, databaseSummary: run.databaseSummary, cacheSummary: run.cacheSummary, workerSummary: run.workerSummary, fairnessSummary: run.fairnessSummary, recoverySummary: run.recoverySummary, regionalSummary: run.regionalSummary, sourceRunId: idOf(run), status: 'candidate', ...digests });
  await audit('performance.baseline.created', 'PerformanceBaseline', record, scope, { workloadDomain: record.workloadDomain, baselineVersion: record.baselineVersion }, deps); return safeRecord(record);
}
async function listBaselines(input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); await authorize('performanceBaseline.read', 'PerformanceBaseline', null, scope, caller, { dependencies: deps }); const filter = tenantFilter(scope); for (const key of ['status', 'workloadDomain']) if (input[key]) filter[key] = String(input[key]); return page(deps.PerformanceBaseline, filter, input); }
async function getBaseline(baselineId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); await authorize('performanceBaseline.read', 'PerformanceBaseline', baselineId, scope, caller, { dependencies: deps }); return safeRecord(await findScoped(deps.PerformanceBaseline, baselineId, scope, 'PERFORMANCE_BASELINE_NOT_FOUND')); }
async function promoteBaseline(baselineId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); const record = await findScoped(deps.PerformanceBaseline, baselineId, scope, 'PERFORMANCE_BASELINE_NOT_FOUND'); await authorize('performanceBaseline.promote', 'PerformanceBaseline', record, scope, caller, { dependencies: deps, policyContext: { workloadDomain: record.workloadDomain, requestedAction: 'baseline_promote' } }); await guard(scope, deps, 'PRIVILEGED_CONFIGURATION'); mutationDigests(input, 'performance-baseline-promote', baselineId); await enforceGovernedApproval(input, scope, 'performanceBaseline.promote', 'PerformanceBaseline', record, 'PERFORMANCE_BASELINE_PROMOTION', { workloadDomain: record.workloadDomain, baselineVersion: record.baselineVersion }, deps); if (record.status === 'active') return safeRecord(record); if (record.status !== 'candidate') throw core.performanceError('PERFORMANCE_BASELINE_IMMUTABLE', 'The baseline is not eligible for promotion.', [], 409); const superseded = await deps.PerformanceBaseline.updateMany({ scope: record.scope, organizationId: record.organizationId, workspaceId: record.workspaceId, workloadDomain: record.workloadDomain, status: 'active', _id: { $ne: record._id } }, { $set: { status: 'superseded' } }); if (Number(superseded.modifiedCount || 0) > 0) await audit('performance.baseline.superseded', 'PerformanceBaseline', record, scope, { workloadDomain: record.workloadDomain, supersededCount: superseded.modifiedCount }, deps); const active = await deps.PerformanceBaseline.findOneAndUpdate({ _id: record._id, status: 'candidate' }, { $set: { status: 'active', approvedBy: scope.actorId, approvedAt: new Date() } }, { new: true }); metrics.increment('performance_baseline_promotions', { workloadDomain: record.workloadDomain }); await audit('performance.baseline.promoted', 'PerformanceBaseline', active, scope, { workloadDomain: active.workloadDomain, baselineVersion: active.baselineVersion }, deps); return safeRecord(active); }
async function archiveBaseline(baselineId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); const record = await findScoped(deps.PerformanceBaseline, baselineId, scope, 'PERFORMANCE_BASELINE_NOT_FOUND'); await authorize('performanceBaseline.archive', 'PerformanceBaseline', record, scope, caller, { dependencies: deps }); await guard(scope, deps, 'MUTATION'); mutationDigests(input, 'performance-baseline-archive', baselineId); if (record.status === 'archived') return safeRecord(record); const archived = await deps.PerformanceBaseline.findByIdAndUpdate(record._id, { $set: { status: 'archived' } }, { new: true }); await audit('performance.baseline.archived', 'PerformanceBaseline', archived, scope, { baselineVersion: archived.baselineVersion }, deps); return safeRecord(archived); }

async function createCapacityModel(runId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, true); const run = await findScoped(deps.PerformanceTestRun, runId, scope, 'PERFORMANCE_RUN_NOT_FOUND', { workspaceOptional: false }); await authorize('capacityModel.create', 'CapacityModel', null, scope, caller, { dependencies: deps, policyContext: { workloadDomain: run.workloadDomain, requestedAction: 'capacity_model_create' } }); await guard(scope, deps, 'MUTATION'); const digests = mutationDigests(input, 'capacity-model-create', runId); const replay = await deps.CapacityModel.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint'); if (replay) return safeRecord(assertReplay(replay, digests));
  const estimate = core.estimateCapacity({ durationMs: run.actualDurationMs || run.configuredDurationMs, requestCount: run.requestCount, completedCount: run.successfulRequestCount, observedCompletionRate: run.throughputSummary?.requestsPerSecond, observedArrivalRate: run.throughputSummary?.requestsPerSecond, averageServiceTimeMs: run.latencyPercentiles?.p50Ms, observedConcurrency: run.achievedConcurrency, observedQueueWait: run.queueSummary?.p95Ms, observedWorkerUtilizationBasisPoints: run.workerSummary?.utilizationBasisPoints, observedDatabasePressure: run.databaseSummary?.pressureCategory, observedCacheHitRate: run.cacheSummary?.hitRateBasisPoints, queueDepth: run.queueSummary?.depth, workerCount: run.workerSummary?.activeWorkers || 1, minimumHeadroomBasisPoints: input.minimumHeadroomBasisPoints || 1_500, expectedPeakRequestsPerSecond: input.expectedPeakRequestsPerSecond, minimumSampleSize: 20, environmentCategory: (await deps.PerformanceEnvironmentFingerprint.findOne({ fingerprintId: run.environmentFingerprintId }).lean())?.environmentCategory });
  const latest = await deps.CapacityModel.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, workloadDomain: run.workloadDomain }).sort({ modelVersion: -1 }).lean(); const model = await deps.CapacityModel.create({ scope: 'workspace', organizationId: scope.organizationId, workspaceId: scope.workspaceId, workloadDomain: run.workloadDomain, scenarioId: run.scenarioId, scenarioVersion: run.scenarioVersion, environmentFingerprintId: run.environmentFingerprintId, status: 'candidate', modelVersion: Number(latest?.modelVersion || 0) + 1, ...estimate, sourcePerformanceRunIds: [idOf(run)], createdBy: scope.actorId, ...digests }); metrics.increment('performance_capacity_models', { capacityConfidenceCategory: model.confidenceCategory, headroomCategory: model.headroomCategory, workloadDomain: model.workloadDomain }); await audit('performance.capacity.model_created', 'CapacityModel', model, scope, { workloadDomain: model.workloadDomain, capacityConfidenceCategory: model.confidenceCategory, headroomCategory: model.headroomCategory }, deps); return safeRecord(model);
}
async function listCapacityModels(input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); await authorize('capacityModel.read', 'CapacityModel', null, scope, caller, { dependencies: deps }); const filter = tenantFilter(scope); for (const key of ['status', 'workloadDomain']) if (input[key]) filter[key] = String(input[key]); return page(deps.CapacityModel, filter, input); }
async function getCapacityModel(modelId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); await authorize('capacityModel.read', 'CapacityModel', modelId, scope, caller, { dependencies: deps }); return safeRecord(await findScoped(deps.CapacityModel, modelId, scope, 'CAPACITY_MODEL_NOT_FOUND')); }

function normalizeCapacityPlan(input = {}, previous = {}, scope) {
  core.assertSafeObject(input, { rejectExecutable: true }, 'capacityPlan'); const merged = { ...previous, ...input }; const modelIds = [...new Set((merged.sourceCapacityModelIds || []).map((value) => core.safeIdentifier(value, 'sourceCapacityModelId')))]; if (!modelIds.length || modelIds.length > 128) throw core.performanceError('CAPACITY_PLAN_INVALID', 'At least one bounded capacity model is required.');
  return { scope: ['platform', 'organization', 'workspace'].includes(merged.scope) ? merged.scope : 'workspace', organizationId: merged.scope === 'platform' ? undefined : scope.organizationId, workspaceId: merged.scope === 'workspace' || !merged.scope ? core.safeIdentifier(merged.workspaceId || scope.workspaceId, 'workspaceId') : undefined, workloadDomain: core.getWorkloadDomain(merged.workloadDomain).workloadDomain, name: core.safeText(merged.name || 'Capacity plan', 120), description: core.safeText(merged.description, 2_000), version: core.boundedInteger(merged.version, 'version', 1, 1_000_000, 1), status: ['draft', 'active', 'archived'].includes(merged.status) ? merged.status : 'draft', forecastWindow: ['current', 'seven_days', 'thirty_days', 'ninety_days'].includes(merged.forecastWindow) ? merged.forecastWindow : 'current', expectedPeakRequestsPerSecond: core.boundedInteger(merged.expectedPeakRequestsPerSecond, 'expectedPeakRequestsPerSecond', 0, 1_000_000, 0), expectedPeakConcurrentRuns: core.boundedInteger(merged.expectedPeakConcurrentRuns, 'expectedPeakConcurrentRuns', 0, 1_000_000, 0), expectedPeakConcurrentNodes: core.boundedInteger(merged.expectedPeakConcurrentNodes, 'expectedPeakConcurrentNodes', 0, 10_000_000, 0), expectedQueueDepth: core.boundedInteger(merged.expectedQueueDepth, 'expectedQueueDepth', 0, 1_000_000_000, 0), expectedDataGrowthCategory: ['none', 'low', 'moderate', 'high', 'critical', 'unknown'].includes(merged.expectedDataGrowthCategory) ? merged.expectedDataGrowthCategory : 'unknown', requiredExecutionWorkers: core.boundedInteger(merged.requiredExecutionWorkers, 'requiredExecutionWorkers', 0, 100_000, 1), requiredRecoveryWorkers: core.boundedInteger(merged.requiredRecoveryWorkers, 'requiredRecoveryWorkers', 0, 100_000, 1), requiredControlPlaneWorkers: core.boundedInteger(merged.requiredControlPlaneWorkers, 'requiredControlPlaneWorkers', 0, 100_000, 1), recommendedWorkerConcurrency: core.boundedInteger(merged.recommendedWorkerConcurrency, 'recommendedWorkerConcurrency', 1, 1_000, 1), recommendedPartitionCount: core.boundedInteger(merged.recommendedPartitionCount, 'recommendedPartitionCount', 1, 256, 1), recommendedDatabaseCapacityCategory: core.safeIdentifier(merged.recommendedDatabaseCapacityCategory || 'unknown', 'recommendedDatabaseCapacityCategory'), recommendedCacheCapacityCategory: core.safeIdentifier(merged.recommendedCacheCapacityCategory || 'unknown', 'recommendedCacheCapacityCategory'), reservedRecoveryCapacity: core.boundedInteger(merged.reservedRecoveryCapacity, 'reservedRecoveryCapacity', 0, 100_000, 1), minimumHeadroomBasisPoints: core.boundedInteger(merged.minimumHeadroomBasisPoints, 'minimumHeadroomBasisPoints', 0, 10_000, 1_500), regionalCapacityRequirements: core.safeClone(merged.regionalCapacityRequirements || [], { rejectExecutable: true }), failoverCapacityRequirementBasisPoints: core.boundedInteger(merged.failoverCapacityRequirementBasisPoints, 'failoverCapacityRequirementBasisPoints', 0, 20_000, 10_000), sourceCapacityModelIds: modelIds, assumptions: (merged.assumptions || []).map((value) => core.safeText(value, 512)).slice(0, 64), limitations: [...(merged.limitations || []).map((value) => core.safeText(value, 512)), 'Recommendations are advisory and do not change provider capacity.'].slice(0, 64) };
}
function validateCapacityPlanValue(plan) { const reasons = []; if (plan.expectedPeakRequestsPerSecond > 0 && plan.requiredExecutionWorkers < 1) reasons.push('CAPACITY_PLAN_EXECUTION_CAPACITY_MISSING'); if (plan.minimumHeadroomBasisPoints < 500) reasons.push('CAPACITY_PLAN_HEADROOM_CRITICAL'); if (!plan.sourceCapacityModelIds.length) reasons.push('CAPACITY_PLAN_SOURCE_MISSING'); return { valid: reasons.length === 0, safeReasonCodes: reasons, plan }; }
async function createCapacityPlan(input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, input.scope !== 'organization' && input.scope !== 'platform'); await authorize('capacityPlan.create', 'CapacityPlan', null, scope, caller, { dependencies: deps, policyContext: { workloadDomain: input.workloadDomain, requestedAction: 'capacity_plan_create' } }); await guard(scope, deps, 'MUTATION'); const targetScope = scopeDefinition(input, scope); const digests = mutationDigests(input, 'capacity-plan-create', targetScope.key); const replay = await deps.CapacityPlan.findOne({ organizationId: targetScope.organizationId, workspaceId: targetScope.workspaceId, idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint'); if (replay) return safeRecord(assertReplay(replay, digests)); const latest = await deps.CapacityPlan.findOne({ scope: targetScope.scope, organizationId: targetScope.organizationId, workspaceId: targetScope.workspaceId, name: input.name || 'Capacity plan' }).sort({ version: -1 }).lean(); const normalized = normalizeCapacityPlan({ ...input, ...targetScope, version: Number(input.version || latest?.version + 1 || 1), status: 'draft' }, {}, scope); const record = await deps.CapacityPlan.create({ ...normalized, ...digests, createdBy: scope.actorId, updatedBy: scope.actorId }); await audit('performance.capacity.plan_created', 'CapacityPlan', record, scope, { workloadDomain: record.workloadDomain, planVersion: record.version }, deps); return safeRecord(record); }
async function listCapacityPlans(input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); await authorize('capacityPlan.read', 'CapacityPlan', null, scope, caller, { dependencies: deps }); const filter = tenantFilter(scope); for (const key of ['status', 'workloadDomain']) if (input[key]) filter[key] = String(input[key]); return page(deps.CapacityPlan, filter, input); }
async function getCapacityPlan(planId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); await authorize('capacityPlan.read', 'CapacityPlan', planId, scope, caller, { dependencies: deps }); return safeRecord(await findScoped(deps.CapacityPlan, planId, scope, 'CAPACITY_PLAN_NOT_FOUND')); }
async function updateCapacityPlan(planId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); const current = await findScoped(deps.CapacityPlan, planId, scope, 'CAPACITY_PLAN_NOT_FOUND'); await authorize('capacityPlan.update', 'CapacityPlan', current, scope, caller, { dependencies: deps }); await guard(scope, deps, 'MUTATION'); if (current.status !== 'draft') throw core.performanceError('CAPACITY_PLAN_IMMUTABLE', 'Active and archived plans are immutable.', [], 409); mutationDigests(input, 'capacity-plan-update', planId); const normalized = normalizeCapacityPlan({ ...plain(current), ...input, status: 'draft', version: current.version }, plain(current), scope); const updated = await deps.CapacityPlan.findOneAndUpdate({ _id: current._id, status: 'draft' }, { $set: { ...normalized, updatedBy: scope.actorId }, $unset: { validation: 1 } }, { new: true, runValidators: true }); return safeRecord(updated); }
async function validateCapacityPlan(planId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); const record = await findScoped(deps.CapacityPlan, planId, scope, 'CAPACITY_PLAN_NOT_FOUND'); await authorize('capacityPlan.validate', 'CapacityPlan', record, scope, caller, { dependencies: deps }); await guard(scope, deps, 'MUTATION'); const result = validateCapacityPlanValue(normalizeCapacityPlan(plain(record), plain(record), scope)); if (record.status === 'draft') await deps.CapacityPlan.updateOne({ _id: record._id }, { $set: { validation: { valid: result.valid, safeReasonCodes: result.safeReasonCodes, validatedAt: new Date() } } }); return { planId: idOf(record), valid: result.valid, safeReasonCodes: result.safeReasonCodes }; }
async function activateCapacityPlan(planId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); const record = await findScoped(deps.CapacityPlan, planId, scope, 'CAPACITY_PLAN_NOT_FOUND'); await authorize('capacityPlan.activate', 'CapacityPlan', record, scope, caller, { dependencies: deps, policyContext: { workloadDomain: record.workloadDomain, requestedAction: 'capacity_plan_activate' } }); await guard(scope, deps, 'PRIVILEGED_CONFIGURATION'); mutationDigests(input, 'capacity-plan-activate', planId); if (record.status === 'active') return safeRecord(record); if (record.status !== 'draft') throw core.performanceError('CAPACITY_PLAN_IMMUTABLE', 'Archived plans cannot be activated.', [], 409); const validation = validateCapacityPlanValue(normalizeCapacityPlan(plain(record), plain(record), scope)); if (!validation.valid) throw core.performanceError('CAPACITY_PLAN_INVALID', 'The capacity plan cannot be activated.', validation.safeReasonCodes.map((code) => ({ path: 'capacityPlan', message: code }))); await enforceGovernedApproval(input, scope, 'capacityPlan.activate', 'CapacityPlan', record, 'CAPACITY_PLAN_ACTIVATION', { workloadDomain: record.workloadDomain, forecastWindow: record.forecastWindow, expectedPeakRequestsPerSecond: record.expectedPeakRequestsPerSecond }, deps); await deps.CapacityPlan.updateMany({ scope: record.scope, organizationId: record.organizationId, workspaceId: record.workspaceId, name: record.name, status: 'active', _id: { $ne: record._id } }, { $set: { status: 'archived', archivedBy: scope.actorId, archivedAt: new Date() } }); const active = await deps.CapacityPlan.findOneAndUpdate({ _id: record._id, status: 'draft' }, { $set: { status: 'active', activatedBy: scope.actorId, activatedAt: new Date(), updatedBy: scope.actorId, validation: { valid: true, safeReasonCodes: [], validatedAt: new Date() } } }, { new: true, runValidators: true }); await audit('performance.capacity.plan_activated', 'CapacityPlan', active, scope, { workloadDomain: active.workloadDomain, planVersion: active.version }, deps); return safeRecord(active); }
async function archiveCapacityPlan(planId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); const record = await findScoped(deps.CapacityPlan, planId, scope, 'CAPACITY_PLAN_NOT_FOUND'); await authorize('capacityPlan.archive', 'CapacityPlan', record, scope, caller, { dependencies: deps }); await guard(scope, deps, 'MUTATION'); mutationDigests(input, 'capacity-plan-archive', planId); if (record.status === 'archived') return safeRecord(record); return safeRecord(await deps.CapacityPlan.findByIdAndUpdate(record._id, { $set: { status: 'archived', archivedBy: scope.actorId, archivedAt: new Date(), updatedBy: scope.actorId } }, { new: true })); }

async function listTargets(input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); await authorize('performanceTesting.readDetails', 'PerformanceTarget', null, scope, caller, { dependencies: deps }); return { items: core.listTargets() }; }
async function getEnvironment(input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); await authorize('performanceEnvironment.read', 'PerformanceEnvironmentFingerprint', null, scope, caller, { dependencies: deps }); return core.createEnvironmentFingerprint({ environmentCategory: input.environmentCategory || 'local', backendProcessCount: 1, executionWorkerCount: 1, recoveryWorkerCount: 1, controlPlaneWorkerCount: 1, databaseAdapterCategory: 'mongodb', databaseTopologyCategory: 'unknown', cacheAdapterCategory: 'memory', regionalSimulationCategory: 'local_simulation', cpuCapacityCategory: 'unknown', memoryCapacityCategory: 'unknown', networkCategory: 'local' }); }
async function getCapacityOverview(input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); await authorize('performanceTesting.read', 'CapacityModel', null, scope, caller, { dependencies: deps }); const models = await deps.CapacityModel.find(tenantFilter(scope)).sort({ createdAt: -1 }).limit(25).lean(); const runs = await deps.PerformanceTestRun.find(exactTenantFilter(scope)).sort({ createdAt: -1 }).limit(25).lean(); return { latestModel: models[0] ? safeRecord(models[0]) : null, modelCount: models.length, activeRunCount: runs.filter((run) => ['preparing', 'warming_up', 'running', 'cooling_down', 'analyzing'].includes(run.status)).length, recentPassRateBasisPoints: runs.length ? Math.round((runs.filter((run) => ['passed', 'passed_with_warnings', 'cleanup_required', 'cleaned_up'].includes(run.status)).length / runs.length) * 10_000) : 0, metrics: metrics.snapshot(), advisory: true }; }
async function getRecommendations(input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, false); await authorize('performanceRecommendation.read', 'CapacityRecommendation', null, scope, caller, { dependencies: deps }); const model = await deps.CapacityModel.findOne(tenantFilter(scope)).sort({ createdAt: -1 }).lean(); return { advisory: true, items: core.autoscalingRecommendations(model ? { sufficientData: true, headroomCategory: model.headroomCategory, confidenceCategory: model.confidenceCategory, workerUtilizationBasisPoints: model.observedWorkerUtilization, databasePressureCategory: model.observedDatabasePressure, cacheHealthCategory: model.observedCacheHitRate < 4_000 ? 'contended' : 'healthy', protectedRecoveryHeadroomBasisPoints: model.minimumHeadroomBasisPoints, evidenceWindow: 'source_performance_runs' } : { sufficientData: false }) }; }

async function exportRun(runId, input = {}, caller = {}, options = {}) { const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller, true); const run = await findScoped(deps.PerformanceTestRun, runId, scope, 'PERFORMANCE_RUN_NOT_FOUND', { workspaceOptional: false }); await authorize('performanceTesting.export', 'PerformanceTestRun', run, scope, caller, { dependencies: deps, policyContext: { workloadDomain: run.workloadDomain, requestedAction: 'performance_export' } }); const [scenario, budget, fingerprint, regression, capacity] = await Promise.all([deps.PerformanceLoadScenario.findById(run.scenarioId).lean(), deps.PerformanceBudgetPolicy.findById(run.budgetPolicyId).lean(), deps.PerformanceEnvironmentFingerprint.findOne({ fingerprintId: run.environmentFingerprintId }).lean(), deps.PerformanceRegressionEvaluation.findOne({ performanceRunId: runId }).lean(), deps.CapacityModel.findOne({ sourcePerformanceRunIds: runId }).sort({ createdAt: -1 }).lean()]); const recommendations = core.autoscalingRecommendations(capacity ? { sufficientData: true, headroomCategory: capacity.headroomCategory, confidenceCategory: capacity.confidenceCategory, workerUtilizationBasisPoints: capacity.observedWorkerUtilization, databasePressureCategory: capacity.observedDatabasePressure, evidenceWindow: 'performance_run' } : { sufficientData: false }); const exported = core.createSafeExport({ scenario: safeRecord(scenario), environmentFingerprint: safeRecord(fingerprint), budgetPolicy: safeRecord(budget), performanceSummary: safeRecord(run), budgetEvaluation: await getBudgetEvaluation(runId, input, caller, options), regressionEvaluation: safeRecord(regression), capacityModel: safeRecord(capacity), recommendations, bottleneckSummary: core.bottleneckSummary(plain(run)) }); await audit('performance.export.created', 'PerformanceTestRun', run, scope, { workloadDomain: run.workloadDomain, resultStatus: run.status }, deps); return exported; }

module.exports = {
  abortRun, activateBudget, activateCapacityPlan, activateScenario, archiveBaseline,
  archiveBudget, archiveCapacityPlan, archiveScenario, cancelRun, cleanupRun,
  createBaseline, createBudget, createCapacityModel, createCapacityPlan, createRun,
  createScenario, executeRun, exportRun, getBaseline, getBudget, getBudgetEvaluation,
  getCapacityModel, getCapacityOverview, getCapacityPlan, getEnvironment,
  getRecommendations, getRegressionEvaluation, getRun, getScenario, listBaselines,
  listBudgets, listCapacityModels, listCapacityPlans, listMeasurementWindows,
  listRuns, listScenarios, listTargets, promoteBaseline, safeRecord, scopeFrom,
  updateBudget, updateCapacityPlan, updateScenario, validateBudget,
  validateCapacityPlan, validateScenario,
};
