const crypto = require('node:crypto');
const mongoose = require('mongoose');
const QueuePartition = require('../models/QueuePartition');
const WorkerRegistration = require('../models/WorkerRegistration');
const WorkloadAdmissionDecision = require('../models/WorkloadAdmissionDecision');
const WorkloadBackpressureState = require('../models/WorkloadBackpressureState');
const WorkloadDeadLetter = require('../models/WorkloadDeadLetter');
const WorkloadQuotaPolicy = require('../models/WorkloadQuotaPolicy');
const WorkloadQuotaReservation = require('../models/WorkloadQuotaReservation');
const WorkloadScaleConfiguration = require('../models/WorkloadScaleConfiguration');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const OrchestrationCompensationRun = require('../models/OrchestrationCompensationRun');
const OrchestrationRun = require('../models/OrchestrationRun');
const OrchestrationInterventionRequest = require('../models/OrchestrationInterventionRequest');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  ADMISSION_DECISIONS,
  BACKPRESSURE_STATES,
  DATABASE_PRESSURE_CATEGORIES,
  PRODUCTION_SCALE_LIMITS,
  WORKER_POOLS,
  WORKLOAD_CATEGORIES,
  WORKLOAD_DEFINITIONS,
} = require('../constants/productionScale');
const core = require('./productionScale.service');
const scaleMetrics = require('./productionScaleMetrics.service');
const { canonicalize } = require('../utils/idempotency');
const { enforceAdministrativeApproval } = require('./enterpriseOperations.service');

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function plain(value) {
  return value && (typeof value.toObject === 'function' ? value.toObject() : { ...value });
}

function validationError(path, message) {
  return new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Production scale validation failed.', [{ path, message }]);
}

function safeIdentifier(value, path, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (!required) return undefined;
    throw validationError(path, `${path} is required.`);
  }
  const candidate = String(value).trim();
  if (!SAFE_IDENTIFIER_PATTERN.test(candidate)) throw validationError(path, `${path} must be a safe identifier.`);
  return candidate;
}

function boundedInteger(value, path, minimum, maximum, fallback) {
  const candidate = value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw validationError(path, `${path} must be an integer between ${minimum} and ${maximum}.`);
  }
  return candidate;
}

function enumValue(value, values, path, fallback) {
  const candidate = String(value || fallback || '').trim();
  if (!values.includes(candidate)) throw validationError(path, `${path} is not supported.`);
  return candidate;
}

function scopeFrom(input = {}, caller = {}, workspaceRequired = true) {
  const partnerId = idOf(caller.partner?._id);
  const organizationId = safeIdentifier(input.organizationId || partnerId, 'organizationId');
  if (partnerId && organizationId !== partnerId) {
    throw new AppError(403, ErrorCodes.AUTHORIZATION_DENIED, 'Authorization denied.');
  }
  return {
    organizationId,
    workspaceId: safeIdentifier(input.workspaceId || input.receivingWorkspaceId, 'workspaceId', { required: workspaceRequired }),
    actorId: `partner:${partnerId}`,
    actorType: 'service_account',
    requestId: safeIdentifier(caller.requestId || input.requestId || `req_${crypto.randomUUID()}`, 'requestId'),
    traceId: safeIdentifier(caller.traceId || input.traceId || `trace_${crypto.randomUUID()}`, 'traceId'),
    platformAuthorized: caller.platformAuthorized === true,
  };
}

function scopeKey(scope) {
  return scope.workspaceId ? `organization:${scope.organizationId}:workspace:${scope.workspaceId}` : `organization:${scope.organizationId}`;
}

function paging(input = {}) {
  const limit = boundedInteger(input.limit, 'limit', 1, PRODUCTION_SCALE_LIMITS.maximumPageSize, 50);
  const page = boundedInteger(input.page, 'page', 1, 100_000, 1);
  return { limit, page, skip: (page - 1) * limit };
}

function dependencies(overrides = {}) {
  return core.productionScaleDependencies({
    QueuePartition,
    WorkerRegistration,
    WorkloadAdmissionDecision,
    WorkloadBackpressureState,
    WorkloadDeadLetter,
    WorkloadQuotaPolicy,
    WorkloadQuotaReservation,
    WorkloadScaleConfiguration,
    OrchestrationNodeRun,
    OrchestrationCompensationRun,
    OrchestrationRun,
    OrchestrationInterventionRequest,
    RuntimeWorkItem,
    enforceAdministrativeApproval,
    ...overrides,
  });
}

function mutationDigests(input = {}, purpose, scope) {
  if (!input.idempotencyKey) return {};
  const idempotencyKey = String(input.idempotencyKey).trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    throw validationError('idempotencyKey', 'Idempotency key must contain between 1 and 200 characters.');
  }
  const material = { ...input };
  for (const key of ['idempotencyKey', 'requestId', 'traceId', 'requestedBy']) delete material[key];
  return {
    idempotencyKeyHash: `sha256:${core.stableHash(`${purpose}:${scope}:${idempotencyKey}`)}`,
    requestFingerprint: `sha256:${core.stableHash(canonicalize(material))}`,
  };
}

function assertMutationReplay(record, digests) {
  if (record.requestFingerprint !== digests.requestFingerprint) {
    throw new AppError(409, ErrorCodes.IDEMPOTENCY_CONFLICT, 'Idempotency key is bound to another production-scale mutation.');
  }
  return record;
}

async function assertRetiredRoutingVersionsAreDrained(candidate, previous, deps) {
  if (!previous) return;
  const retired = previous.routingVersions.filter((route) => {
    const next = candidate.routingVersions.find((entry) => entry.version === route.version);
    return next?.status === 'retired' && route.status !== 'retired';
  });
  for (const route of retired) {
    const scope = candidate.organizationId
      ? { organizationId: candidate.organizationId, ...(candidate.workspaceId ? { workspaceId: candidate.workspaceId } : {}) }
      : {};
    const runtimeScope = candidate.organizationId
      ? { organizationId: candidate.organizationId, ...(candidate.workspaceId ? { receivingWorkspaceId: candidate.workspaceId } : {}) }
      : {};
    const [nodes, compensations, runtimeWork] = await Promise.all([
      deps.OrchestrationNodeRun.countDocuments({ ...scope, routingVersion: route.version, status: { $in: ['blocked', 'ready', 'queued', 'retry_wait', 'waiting_approval', 'running', 'recovery_pending', 'compensation_pending'] } }),
      deps.OrchestrationCompensationRun.countDocuments({ ...scope, routingVersion: route.version, status: { $in: ['pending', 'queued', 'running', 'retry_wait', 'waiting_approval', 'waiting_intervention'] } }),
      deps.RuntimeWorkItem.countDocuments({ ...runtimeScope, routingVersion: route.version, status: { $nin: ['completed', 'failed', 'cancelled', 'dead_lettered'] } }),
    ]);
    if (nodes + compensations + runtimeWork > 0) {
      throw new AppError(409, 'ROUTING_VERSION_NOT_DRAINED', 'A routing version cannot be retired while accepted work remains.', [], { routingVersion: route.version });
    }
  }
}

async function enforcePlatformConfigurationGovernance(recordOrScopeKey, scope, input, caller, authorizationDecision, deps, operation) {
  const key = typeof recordOrScopeKey === 'string' ? recordOrScopeKey : recordOrScopeKey?.scopeKey;
  if (key !== 'platform') return;
  if (scope.platformAuthorized !== true) {
    throw new AppError(403, ErrorCodes.AUTHORIZATION_DENIED, 'Authorization denied.');
  }
  const partnerId = idOf(caller.partner?._id);
  await deps.enforceAdministrativeApproval(
    {
      ...scope,
      partnerId,
      actorId: `partner:${partnerId}`,
      actorType: 'service_account',
      authorizationDecision,
    },
    input,
    `productionScaleConfiguration.${operation}`,
    'WorkloadScaleConfiguration',
    idOf(recordOrScopeKey) || 'platform',
    'PRODUCTION_SCALE_CONFIGURATION',
  );
}

function serializeConfiguration(recordInput) {
  const record = plain(recordInput);
  return record && {
    id: idOf(record),
    scopeKey: record.scopeKey,
    organizationId: record.organizationId,
    workspaceId: record.workspaceId,
    version: record.version,
    status: record.status,
    routingVersions: record.routingVersions,
    partitionCountByCategory: record.partitionCountByCategory,
    workerPoolConfiguration: record.workerPoolConfiguration,
    claimBatchSizeByCategory: record.claimBatchSizeByCategory,
    leaseDurationByCategory: record.leaseDurationByCategory,
    heartbeatIntervalByCategory: record.heartbeatIntervalByCategory,
    maximumConcurrencyByCategory: record.maximumConcurrencyByCategory,
    reservedCapacityByCategory: record.reservedCapacityByCategory,
    backpressureThresholds: record.backpressureThresholds,
    overloadBehavior: record.overloadBehavior,
    autoscalingTargets: record.autoscalingTargets,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    activatedBy: record.activatedBy,
    activatedAt: record.activatedAt,
    archivedAt: record.archivedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function createScaleConfiguration(input = {}, caller = {}, options = {}) {
  core.assertNoSensitiveData(input);
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, input.platformScope !== true);
  const authorizationDecision = await deps.authorize('productionScaleConfiguration.create', 'WorkloadScaleConfiguration', null, scope, caller, { requestedOperationalAction: 'scale_configuration_create' });
  const key = input.platformScope === true ? 'platform' : scopeKey(scope);
  await enforcePlatformConfigurationGovernance(key, scope, input, caller, authorizationDecision, deps, 'create');
  const digests = mutationDigests(input, 'scale-configuration', key);
  if (digests.idempotencyKeyHash) {
    const replay = await deps.WorkloadScaleConfiguration.findOne({ scopeKey: key, idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint');
    if (replay) return serializeConfiguration(assertMutationReplay(replay, digests));
  }
  const [latest, previousActive] = await Promise.all([
    deps.WorkloadScaleConfiguration.findOne({ scopeKey: key }).sort({ version: -1 }).lean(),
    deps.WorkloadScaleConfiguration.findOne({ scopeKey: key, status: 'active' }).lean(),
  ]);
  const normalized = core.normalizeScaleConfiguration({ ...input, scopeKey: key, version: Number(input.version || latest?.version + 1 || 1), status: 'draft' });
  core.assertRoutingEvolution(normalized, previousActive);
  let record;
  try {
    record = await deps.WorkloadScaleConfiguration.create({
      ...normalized,
      ...digests,
      organizationId: input.platformScope === true ? undefined : scope.organizationId,
      workspaceId: input.platformScope === true ? undefined : scope.workspaceId,
      createdBy: scope.actorId,
      updatedBy: scope.actorId,
    });
  } catch (error) {
    if (error?.code !== 11000 || !digests.idempotencyKeyHash) throw error;
    const replay = await deps.WorkloadScaleConfiguration.findOne({ scopeKey: key, idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint');
    if (!replay) throw error;
    record = assertMutationReplay(replay, digests);
  }
  await deps.audit('production_scale.configuration.created', 'WorkloadScaleConfiguration', record, scope, { version: record.version, status: record.status });
  return serializeConfiguration(record);
}

async function listScaleConfigurations(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('productionScaleConfiguration.read', 'WorkloadScaleConfiguration', null, scope, caller);
  const { limit, page, skip } = paging(input);
  const allowedKeys = [scopeKey(scope), `organization:${scope.organizationId}`];
  const filter = { scopeKey: { $in: String(input.includePlatform) === 'true' ? [...allowedKeys, 'platform'] : allowedKeys } };
  if (input.status) filter.status = enumValue(input.status, ['draft', 'active', 'archived'], 'status');
  const [items, total] = await Promise.all([
    deps.WorkloadScaleConfiguration.find(filter).sort({ scopeKey: 1, version: -1 }).skip(skip).limit(limit).lean(),
    deps.WorkloadScaleConfiguration.countDocuments(filter),
  ]);
  return { items: items.map(serializeConfiguration), page, limit, total };
}

async function scopedConfiguration(configurationId, scope, deps) {
  if (!mongoose.isValidObjectId(configurationId)) throw validationError('configurationId', 'configurationId must be valid.');
  const record = await deps.WorkloadScaleConfiguration.findOne({
    _id: configurationId,
    $or: [
      { organizationId: scope.organizationId, workspaceId: scope.workspaceId },
      { organizationId: scope.organizationId, workspaceId: { $exists: false } },
      { scopeKey: 'platform' },
    ],
  });
  if (!record) throw new AppError(404, 'SCALE_CONFIGURATION_NOT_FOUND', 'Scale configuration was not found.');
  return record;
}

async function getScaleConfiguration(configurationId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('productionScaleConfiguration.read', 'WorkloadScaleConfiguration', configurationId, scope, caller);
  return serializeConfiguration(await scopedConfiguration(configurationId, scope, deps));
}

async function updateScaleConfiguration(configurationId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  const authorizationDecision = await deps.authorize('productionScaleConfiguration.update', 'WorkloadScaleConfiguration', configurationId, scope, caller, { requestedOperationalAction: 'scale_configuration_update' });
  const current = await scopedConfiguration(configurationId, scope, deps);
  await enforcePlatformConfigurationGovernance(current, scope, input, caller, authorizationDecision, deps, 'update');
  if (current.status !== 'draft') throw new AppError(409, 'SCALE_CONFIGURATION_IMMUTABLE', 'Only draft scale configurations may be updated.');
  const normalized = core.normalizeScaleConfiguration({ ...plain(current), ...input, status: 'draft', version: current.version, scopeKey: current.scopeKey });
  const previousActive = await deps.WorkloadScaleConfiguration.findOne({ scopeKey: current.scopeKey, status: 'active', _id: { $ne: current._id } }).lean();
  core.assertRoutingEvolution(normalized, previousActive);
  const updated = await deps.WorkloadScaleConfiguration.findOneAndUpdate(
    { _id: current._id, status: 'draft', updatedAt: current.updatedAt },
    { $set: { ...normalized, updatedBy: scope.actorId } },
    { new: true, runValidators: true },
  );
  if (!updated) throw new AppError(409, 'SCALE_CONFIGURATION_CONFLICT', 'Scale configuration changed concurrently.');
  await deps.audit('production_scale.configuration.updated', 'WorkloadScaleConfiguration', updated, scope, { version: updated.version, status: updated.status });
  return serializeConfiguration(updated);
}

async function validateScaleConfigurationRecord(configurationId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('productionScaleConfiguration.validate', 'WorkloadScaleConfiguration', configurationId, scope, caller, { requestedOperationalAction: 'scale_configuration_validate' });
  const record = await scopedConfiguration(configurationId, scope, deps);
  const validation = core.validateScaleConfiguration(plain(record));
  await deps.audit('production_scale.configuration.validated', 'WorkloadScaleConfiguration', record, scope, { version: record.version, valid: validation.valid, safeReasonCodes: validation.safeReasonCodes });
  return validation;
}

async function activateScaleConfiguration(configurationId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  const authorizationDecision = await deps.authorize('productionScaleConfiguration.activate', 'WorkloadScaleConfiguration', configurationId, scope, caller, { requestedOperationalAction: 'scale_configuration_activate' });
  const record = await scopedConfiguration(configurationId, scope, deps);
  await enforcePlatformConfigurationGovernance(record, scope, input, caller, authorizationDecision, deps, 'activate');
  if (record.status === 'active') return serializeConfiguration(record);
  if (record.status !== 'draft') throw new AppError(409, 'SCALE_CONFIGURATION_IMMUTABLE', 'Only draft configurations may be activated.');
  const validation = core.validateScaleConfiguration(plain(record));
  if (!validation.valid) throw new AppError(409, 'SCALE_CONFIGURATION_INVALID', 'Scale configuration is invalid.', validation.errors);
  const previousActive = await deps.WorkloadScaleConfiguration.findOne({ scopeKey: record.scopeKey, status: 'active', _id: { $ne: record._id } }).lean();
  core.assertRoutingEvolution(plain(record), previousActive);
  await assertRetiredRoutingVersionsAreDrained(plain(record), previousActive, deps);
  const now = new Date();
  const session = await mongoose.startSession();
  let activated;
  try {
    await session.withTransaction(async () => {
      await deps.WorkloadScaleConfiguration.updateMany(
        { scopeKey: record.scopeKey, status: 'active', _id: { $ne: record._id } },
        { $set: { status: 'archived', archivedAt: now, archivedBy: scope.actorId } },
        { session },
      );
      activated = await deps.WorkloadScaleConfiguration.findOneAndUpdate(
        { _id: record._id, status: 'draft' },
        { $set: { status: 'active', activatedAt: now, activatedBy: scope.actorId, updatedBy: scope.actorId } },
        { new: true, runValidators: true, session },
      );
      if (!activated) throw new AppError(409, 'SCALE_CONFIGURATION_CONFLICT', 'Scale configuration activation conflicted.');
    });
  } finally {
    await session.endSession();
  }
  await core.ensurePartitions(plain(activated), { dependencies: deps });
  await deps.audit('production_scale.configuration.activated', 'WorkloadScaleConfiguration', activated, scope, { version: activated.version, status: activated.status, activeRoutingVersion: core.activeRoutingVersion(activated).version });
  return serializeConfiguration(activated);
}

async function archiveScaleConfiguration(configurationId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  const authorizationDecision = await deps.authorize('productionScaleConfiguration.archive', 'WorkloadScaleConfiguration', configurationId, scope, caller);
  const record = await scopedConfiguration(configurationId, scope, deps);
  await enforcePlatformConfigurationGovernance(record, scope, input, caller, authorizationDecision, deps, 'archive');
  if (record.status === 'archived') return serializeConfiguration(record);
  if (record.status === 'active') {
    throw new AppError(409, 'SCALE_CONFIGURATION_IMMUTABLE', 'Activate a replacement before archiving an active scale configuration.');
  }
  const archived = await deps.WorkloadScaleConfiguration.findOneAndUpdate(
    { _id: record._id, status: record.status },
    { $set: { status: 'archived', archivedAt: new Date(), archivedBy: scope.actorId, updatedBy: scope.actorId } },
    { new: true, runValidators: true },
  );
  await deps.audit('production_scale.configuration.archived', 'WorkloadScaleConfiguration', archived, scope, { version: archived.version, status: archived.status });
  return serializeConfiguration(archived);
}

function serializeQuotaPolicy(recordInput) {
  const record = plain(recordInput);
  if (!record) return record;
  return {
    id: idOf(record), organizationId: record.organizationId, workspaceId: record.workspaceId,
    ...core.normalizeQuotaPolicy(record, record),
    createdBy: record.createdBy, updatedBy: record.updatedBy, activatedBy: record.activatedBy,
    activatedAt: record.activatedAt, archivedAt: record.archivedAt,
    createdAt: record.createdAt, updatedAt: record.updatedAt,
  };
}

async function createQuotaPolicy(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, input.organizationWide !== true);
  await deps.authorize('workloadQuotaPolicy.create', 'WorkloadQuotaPolicy', null, scope, caller, { requestedOperationalAction: 'quota_policy_create' });
  const workspaceId = input.organizationWide === true ? undefined : scope.workspaceId;
  const quotaScope = `${scope.organizationId}:${workspaceId || 'organization'}`;
  const digests = mutationDigests(input, 'quota-policy', quotaScope);
  if (digests.idempotencyKeyHash) {
    const replay = await deps.WorkloadQuotaPolicy.findOne({ organizationId: scope.organizationId, workspaceId, idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint');
    if (replay) return serializeQuotaPolicy(assertMutationReplay(replay, digests));
  }
  const name = String(input.name || 'Default workload quota').trim();
  const latest = await deps.WorkloadQuotaPolicy.findOne({ organizationId: scope.organizationId, workspaceId, name }).sort({ version: -1 }).lean();
  const normalized = core.normalizeQuotaPolicy({ ...input, version: Number(input.version || latest?.version + 1 || 1), status: 'draft' });
  let record;
  try {
    record = await deps.WorkloadQuotaPolicy.create({ organizationId: scope.organizationId, workspaceId, ...normalized, ...digests, createdBy: scope.actorId, updatedBy: scope.actorId });
  } catch (error) {
    if (error?.code !== 11000 || !digests.idempotencyKeyHash) throw error;
    const replay = await deps.WorkloadQuotaPolicy.findOne({ organizationId: scope.organizationId, workspaceId, idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint');
    if (!replay) throw error;
    record = assertMutationReplay(replay, digests);
  }
  await deps.audit('production_scale.quota_policy.created', 'WorkloadQuotaPolicy', record, scope, { version: record.version, status: record.status });
  return serializeQuotaPolicy(record);
}

async function listQuotaPolicies(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('workloadQuotaPolicy.read', 'WorkloadQuotaPolicy', null, scope, caller);
  const { limit, page, skip } = paging(input);
  const filter = {
    organizationId: scope.organizationId,
    $or: scope.workspaceId ? [{ workspaceId: scope.workspaceId }, { workspaceId: { $exists: false } }] : [{ workspaceId: { $exists: false } }],
  };
  if (input.status) filter.status = enumValue(input.status, ['draft', 'active', 'archived'], 'status');
  const [items, total] = await Promise.all([
    deps.WorkloadQuotaPolicy.find(filter).sort({ workspaceId: -1, name: 1, version: -1 }).skip(skip).limit(limit).lean(),
    deps.WorkloadQuotaPolicy.countDocuments(filter),
  ]);
  return { items: items.map(serializeQuotaPolicy), page, limit, total };
}

async function scopedQuotaPolicy(policyId, scope, deps) {
  if (!mongoose.isValidObjectId(policyId)) throw validationError('policyId', 'policyId must be valid.');
  const record = await deps.WorkloadQuotaPolicy.findOne({
    _id: policyId,
    organizationId: scope.organizationId,
    $or: scope.workspaceId ? [{ workspaceId: scope.workspaceId }, { workspaceId: { $exists: false } }] : [{ workspaceId: { $exists: false } }],
  });
  if (!record) throw new AppError(404, 'WORKLOAD_QUOTA_POLICY_NOT_FOUND', 'Workload quota policy was not found.');
  return record;
}

async function getQuotaPolicy(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('workloadQuotaPolicy.read', 'WorkloadQuotaPolicy', policyId, scope, caller);
  return serializeQuotaPolicy(await scopedQuotaPolicy(policyId, scope, deps));
}

async function updateQuotaPolicy(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('workloadQuotaPolicy.update', 'WorkloadQuotaPolicy', policyId, scope, caller, { requestedOperationalAction: 'quota_policy_update', tenantWeight: input.tenantWeight, workspaceWeight: input.workspaceWeight });
  const record = await scopedQuotaPolicy(policyId, scope, deps);
  if (record.status !== 'draft') throw new AppError(409, 'WORKLOAD_QUOTA_POLICY_IMMUTABLE', 'Only draft quota policies may be updated.');
  const normalized = core.normalizeQuotaPolicy({ ...plain(record), ...input, version: record.version, status: 'draft' });
  const updated = await deps.WorkloadQuotaPolicy.findOneAndUpdate(
    { _id: record._id, status: 'draft', updatedAt: record.updatedAt },
    { $set: { ...normalized, updatedBy: scope.actorId } },
    { new: true, runValidators: true },
  );
  if (!updated) throw new AppError(409, 'WORKLOAD_QUOTA_POLICY_CONFLICT', 'Quota policy changed concurrently.');
  await deps.audit('production_scale.quota_policy.updated', 'WorkloadQuotaPolicy', updated, scope, { version: updated.version, status: updated.status });
  return serializeQuotaPolicy(updated);
}

async function validateQuotaPolicyRecord(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('workloadQuotaPolicy.validate', 'WorkloadQuotaPolicy', policyId, scope, caller);
  return core.validateQuotaPolicy(plain(await scopedQuotaPolicy(policyId, scope, deps)));
}

async function activateQuotaPolicy(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('workloadQuotaPolicy.activate', 'WorkloadQuotaPolicy', policyId, scope, caller, { requestedOperationalAction: 'quota_policy_activate' });
  const record = await scopedQuotaPolicy(policyId, scope, deps);
  if (record.status === 'active') return serializeQuotaPolicy(record);
  if (record.status !== 'draft') throw new AppError(409, 'WORKLOAD_QUOTA_POLICY_IMMUTABLE', 'Only draft quota policies may be activated.');
  const validation = core.validateQuotaPolicy(plain(record));
  if (!validation.valid) throw new AppError(409, 'WORKLOAD_QUOTA_POLICY_INVALID', 'Quota policy is invalid.', validation.errors);
  const now = new Date();
  const session = await mongoose.startSession();
  let active;
  try {
    await session.withTransaction(async () => {
      await deps.WorkloadQuotaPolicy.updateMany(
        { organizationId: record.organizationId, workspaceId: record.workspaceId, status: 'active', _id: { $ne: record._id } },
        { $set: { status: 'archived', archivedAt: now, archivedBy: scope.actorId } },
        { session },
      );
      active = await deps.WorkloadQuotaPolicy.findOneAndUpdate(
        { _id: record._id, status: 'draft' },
        { $set: { status: 'active', activatedAt: now, activatedBy: scope.actorId, updatedBy: scope.actorId } },
        { new: true, runValidators: true, session },
      );
      if (!active) throw new AppError(409, 'WORKLOAD_QUOTA_POLICY_CONFLICT', 'Quota policy activation conflicted.');
    });
  } finally {
    await session.endSession();
  }
  await deps.audit('production_scale.quota_policy.activated', 'WorkloadQuotaPolicy', active, scope, { version: active.version, status: active.status });
  return serializeQuotaPolicy(active);
}

async function archiveQuotaPolicy(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('workloadQuotaPolicy.archive', 'WorkloadQuotaPolicy', policyId, scope, caller);
  const record = await scopedQuotaPolicy(policyId, scope, deps);
  if (record.status === 'archived') return serializeQuotaPolicy(record);
  const archived = await deps.WorkloadQuotaPolicy.findOneAndUpdate(
    { _id: record._id, status: record.status },
    { $set: { status: 'archived', archivedAt: new Date(), archivedBy: scope.actorId, updatedBy: scope.actorId } },
    { new: true, runValidators: true },
  );
  return serializeQuotaPolicy(archived);
}

function serializePartition(recordInput, detailed = true) {
  const record = plain(recordInput);
  return {
    partitionKey: record.partitionKey,
    workloadCategory: record.workloadCategory,
    routingVersion: record.routingVersion,
    partitionNumber: record.partitionNumber,
    status: record.status,
    ownershipEpoch: record.ownershipEpoch,
    owner: detailed ? record.ownerWorkerId : record.ownerWorkerId ? 'assigned' : 'unassigned',
    queuedCountEstimate: record.queuedCountEstimate,
    activeCountEstimate: record.activeCountEstimate,
    oldestQueuedAt: record.oldestQueuedAt,
    leaseExpiresAt: record.leaseExpiresAt,
    heartbeatAt: record.heartbeatAt,
    lastClaimAt: record.lastClaimAt,
    lastCompletionAt: record.lastCompletionAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function refreshPartitionEstimates(records, deps) {
  const keys = records.map((record) => record.partitionKey).filter(Boolean);
  if (!keys.length) return records;
  const definitions = [
    {
      Model: deps.OrchestrationNodeRun,
      queued: ['blocked', 'ready', 'queued', 'retry_wait', 'waiting_approval', 'recovery_pending', 'compensation_pending'],
      active: ['running'],
    },
    {
      Model: deps.OrchestrationCompensationRun,
      queued: ['pending', 'queued', 'retry_wait', 'waiting_approval', 'waiting_intervention'],
      active: ['running'],
    },
    {
      Model: deps.RuntimeWorkItem,
      queued: ['pending', 'waiting_for_approval', 'blocked', 'retry_preparing', 'retry_scheduled'],
      active: ['claimed', 'running', 'cancellation_requested'],
    },
  ];
  const grouped = new Map(keys.map((key) => [key, { queuedCountEstimate: 0, activeCountEstimate: 0, oldestQueuedAt: null }]));
  for (const definition of definitions) {
    const [queued, active] = await Promise.all([
      definition.Model.aggregate([
        { $match: { partitionKey: { $in: keys }, status: { $in: definition.queued } } },
        { $group: { _id: '$partitionKey', count: { $sum: 1 }, oldestQueuedAt: { $min: '$createdAt' } } },
      ]),
      definition.Model.aggregate([
        { $match: { partitionKey: { $in: keys }, status: { $in: definition.active } } },
        { $group: { _id: '$partitionKey', count: { $sum: 1 } } },
      ]),
    ]);
    for (const item of queued) {
      const estimate = grouped.get(item._id);
      if (!estimate) continue;
      estimate.queuedCountEstimate += Number(item.count || 0);
      if (item.oldestQueuedAt && (!estimate.oldestQueuedAt || new Date(item.oldestQueuedAt) < estimate.oldestQueuedAt)) estimate.oldestQueuedAt = new Date(item.oldestQueuedAt);
    }
    for (const item of active) {
      const estimate = grouped.get(item._id);
      if (estimate) estimate.activeCountEstimate += Number(item.count || 0);
    }
  }
  await deps.QueuePartition.bulkWrite([...grouped].map(([partitionKey, estimate]) => ({
    updateOne: { filter: { partitionKey }, update: { $set: estimate } },
  })), { ordered: false });
  return records.map((record) => Object.assign(record, grouped.get(record.partitionKey)));
}

async function listPartitions(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('queuePartition.read', 'QueuePartition', null, scope, caller);
  let detailed = false;
  if (input.details !== 'false') {
    try {
      await deps.authorize('productionScale.readDetails', 'QueuePartition', null, scope, caller);
      detailed = true;
    } catch {
      detailed = false;
    }
  }
  const { limit, page, skip } = paging(input);
  const filter = {};
  if (input.workloadCategory) filter.workloadCategory = enumValue(input.workloadCategory, WORKLOAD_CATEGORIES, 'workloadCategory');
  if (input.routingVersion) filter.routingVersion = boundedInteger(input.routingVersion, 'routingVersion', 1, 1_000);
  if (input.status) filter.status = enumValue(input.status, ['active', 'draining', 'paused', 'recovering', 'disabled'], 'status');
  const [items, total] = await Promise.all([
    deps.QueuePartition.find(filter).sort({ workloadCategory: 1, routingVersion: 1, partitionNumber: 1 }).skip(skip).limit(limit).lean(),
    deps.QueuePartition.countDocuments(filter),
  ]);
  await refreshPartitionEstimates(items, deps);
  return { items: items.map((item) => serializePartition(item, detailed)), page, limit, total };
}

async function getPartition(key, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('queuePartition.read', 'QueuePartition', key, scope, caller);
  let detailed = false;
  try {
    await deps.authorize('productionScale.readDetails', 'QueuePartition', key, scope, caller);
    detailed = true;
  } catch {
    detailed = false;
  }
  const record = await deps.QueuePartition.findOne({ partitionKey: key });
  if (!record) throw new AppError(404, 'QUEUE_PARTITION_NOT_FOUND', 'Queue partition was not found.');
  await refreshPartitionEstimates([record], deps);
  return serializePartition(record, detailed);
}

async function controlPartition(key, action, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  const permission = `queuePartition.${action === 'drain' ? 'drain' : action}`;
  await deps.authorize(permission, 'QueuePartition', key, scope, caller, { requestedOperationalAction: `partition_${action}` });
  const transitions = { pause: 'paused', resume: 'active', drain: 'draining' };
  const status = transitions[action];
  if (!status) throw validationError('action', 'Unsupported partition action.');
  const current = await deps.QueuePartition.findOne({ partitionKey: key });
  if (!current) throw new AppError(404, 'QUEUE_PARTITION_NOT_FOUND', 'Queue partition was not found.');
  if (current.status === status) return serializePartition(current);
  const update = { $set: { status } };
  if (action === 'pause') {
    update.$inc = { ownershipEpoch: 1 };
    update.$unset = { ownerWorkerId: 1, ownerInstanceId: 1, leaseExpiresAt: 1, heartbeatAt: 1 };
  }
  let record = await deps.QueuePartition.findOneAndUpdate({ partitionKey: key, status: current.status }, update, { new: true, runValidators: true });
  if (!record) {
    record = await deps.QueuePartition.findOne({ partitionKey: key });
    if (record?.status === status) return serializePartition(record);
    throw new AppError(409, 'QUEUE_PARTITION_TRANSITION_CONFLICT', 'Queue partition changed concurrently.');
  }
  const event = action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'draining';
  await deps.audit(`production_scale.partition.${event}`, 'QueuePartition', key, scope, { workloadCategory: record.workloadCategory, routingVersion: record.routingVersion, partitionNumber: record.partitionNumber, status });
  return serializePartition(record);
}

function serializeWorker(recordInput, detailed = true) {
  const record = plain(recordInput);
  return {
    workerId: detailed ? record.workerId : core.stableHash(record.workerId).slice(0, 12),
    instanceId: detailed ? record.instanceId : undefined,
    workerPool: record.workerPool,
    supportedWorkloadCategories: record.supportedWorkloadCategories,
    supportedRoutingVersions: record.supportedRoutingVersions,
    status: record.status,
    maximumConcurrency: record.maximumConcurrency,
    activeClaimCount: record.activeClaimCount,
    availableCapacity: record.availableCapacity,
    startedAt: record.startedAt,
    heartbeatAt: record.heartbeatAt,
    drainRequestedAt: record.drainRequestedAt,
    stoppedAt: record.stoppedAt,
    softwareVersion: record.softwareVersion,
    protocolVersion: record.protocolVersion,
    safeRegion: record.safeRegion,
    safeZone: record.safeZone,
  };
}

async function listWorkers(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('workerFleet.read', 'WorkerRegistration', null, scope, caller);
  let detailed = false;
  if (input.details !== 'false') {
    try {
      await deps.authorize('productionScale.readDetails', 'WorkerRegistration', null, scope, caller);
      detailed = true;
    } catch {
      detailed = false;
    }
  }
  const { limit, page, skip } = paging(input);
  const filter = {};
  if (input.workerPool) filter.workerPool = enumValue(input.workerPool, WORKER_POOLS, 'workerPool');
  if (input.status) filter.status = enumValue(input.status, ['starting', 'active', 'idle', 'draining', 'unhealthy', 'stopped'], 'status');
  const [items, total] = await Promise.all([
    deps.WorkerRegistration.find(filter).sort({ workerPool: 1, status: 1, workerId: 1 }).skip(skip).limit(limit).lean(),
    deps.WorkerRegistration.countDocuments(filter),
  ]);
  return { items: items.map((item) => serializeWorker(item, detailed)), page, limit, total };
}

async function getWorker(workerId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize('workerFleet.read', 'WorkerRegistration', workerId, scope, caller);
  let detailed = false;
  try {
    await deps.authorize('productionScale.readDetails', 'WorkerRegistration', workerId, scope, caller);
    detailed = true;
  } catch {
    detailed = false;
  }
  const record = await deps.WorkerRegistration.findOne({ workerId });
  if (!record) throw new AppError(404, 'WORKER_NOT_FOUND', 'Worker registration was not found.');
  return serializeWorker(record, detailed);
}

async function setWorkerDraining(workerId, input, caller, options, permission) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller, false);
  await deps.authorize(permission, 'WorkerRegistration', workerId, scope, caller, { requestedOperationalAction: permission.endsWith('stopClaims') ? 'worker_stop_claims' : 'worker_drain' });
  const current = await deps.WorkerRegistration.findOne({ workerId });
  if (!current) throw new AppError(404, 'WORKER_NOT_FOUND', 'Worker registration was not found.');
  if (['draining', 'stopped', 'unhealthy'].includes(current.status)) return serializeWorker(current);
  const record = await deps.WorkerRegistration.findOneAndUpdate(
    { workerId, instanceId: current.instanceId, status: current.status },
    { $set: { status: 'draining', drainRequestedAt: new Date(), availableCapacity: 0 } },
    { new: true, runValidators: true },
  );
  if (!record) throw new AppError(409, 'WORKER_IDENTITY_CONFLICT', 'Worker registration changed concurrently.');
  await deps.audit('production_scale.worker.draining', 'WorkerRegistration', workerId, scope, { workerPool: record.workerPool, status: record.status });
  return serializeWorker(record);
}

function drainWorker(workerId, input = {}, caller = {}, options = {}) {
  return setWorkerDraining(workerId, input, caller, options, 'workerFleet.drain');
}

function stopWorkerClaims(workerId, input = {}, caller = {}, options = {}) {
  return setWorkerDraining(workerId, input, caller, options, 'workerFleet.stopClaims');
}

function serializeDecision(item) {
  const value = plain(item);
  return { ...value, id: idOf(value), _id: undefined };
}

async function listAdmissionDecisions(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await deps.authorize('workloadAdmission.read', 'WorkloadAdmissionDecision', null, scope, caller);
  const { limit, page, skip } = paging(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.decision) filter.decision = enumValue(input.decision, ADMISSION_DECISIONS, 'decision');
  if (input.workloadCategory) filter.workloadCategory = enumValue(input.workloadCategory, WORKLOAD_CATEGORIES, 'workloadCategory');
  const [items, total] = await Promise.all([
    deps.WorkloadAdmissionDecision.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    deps.WorkloadAdmissionDecision.countDocuments(filter),
  ]);
  return { items: items.map(serializeDecision), page, limit, total };
}

async function getAdmissionDecision(decisionId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await deps.authorize('workloadAdmission.read', 'WorkloadAdmissionDecision', decisionId, scope, caller);
  const record = await deps.WorkloadAdmissionDecision.findOne({ _id: decisionId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean();
  if (!record) throw new AppError(404, 'WORKLOAD_ADMISSION_DECISION_NOT_FOUND', 'Admission decision was not found.');
  return serializeDecision(record);
}

async function activeConfiguration(scope, deps) {
  const keys = [scopeKey(scope), `organization:${scope.organizationId}`, 'platform'];
  const record = await deps.WorkloadScaleConfiguration.findOne({ scopeKey: { $in: keys }, status: 'active' }).sort({ workspaceId: -1, organizationId: -1, version: -1 }).lean();
  return record ? core.normalizeScaleConfiguration(record) : core.defaultScaleConfiguration(scopeKey(scope));
}

async function evaluateAndPersistBackpressure(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await deps.authorize('backpressureControl.read', 'WorkloadBackpressureState', null, scope, caller);
  const configuration = await activeConfiguration(scope, deps);
  const pools = input.workerPool ? [enumValue(input.workerPool, WORKER_POOLS, 'workerPool')] : WORKER_POOLS;
  const states = [];
  for (const pool of pools) {
    const signals = input.signalsByPool?.[pool] || input.signals || {};
    const state = core.calculateBackpressure(signals, configuration.backpressureThresholds);
    const previous = await deps.WorkloadBackpressureState.findOne({ scopeKey: scopeKey(scope), workerPool: pool }).lean();
    const record = await deps.WorkloadBackpressureState.findOneAndUpdate(
      { scopeKey: scopeKey(scope), workerPool: pool },
      { $set: {
        state,
        queueDepth: Math.max(0, Number(signals.queueDepth || 0)),
        oldestQueueAgeMs: Math.max(0, Number(signals.oldestQueueAgeMs || 0)),
        workerUtilizationBasisPoints: Math.min(10_000, Math.max(0, Number(signals.workerUtilizationBasisPoints || 0))),
        claimLatencyCategory: enumValue(signals.claimLatencyCategory, ['low', 'elevated', 'high', 'unknown'], 'claimLatencyCategory', 'unknown'),
        completionThroughput: Math.max(0, Number(signals.completionThroughput || 0)),
        databasePressureCategory: enumValue(signals.databasePressureCategory, DATABASE_PRESSURE_CATEGORIES, 'databasePressureCategory', 'healthy'),
        leaseExpiryRateBasisPoints: Math.min(10_000, Math.max(0, Number(signals.leaseExpiryRateBasisPoints || 0))),
        failureRateBasisPoints: Math.min(10_000, Math.max(0, Number(signals.failureRateBasisPoints || 0))),
        retryRateBasisPoints: Math.min(10_000, Math.max(0, Number(signals.retryRateBasisPoints || 0))),
        sloBurnRateCategory: enumValue(signals.sloBurnRateCategory, ['normal', 'elevated', 'critical', 'unknown'], 'sloBurnRateCategory', 'unknown'),
        configurationVersion: configuration.version || 1,
        evaluatedAt: new Date(),
      } },
      { upsert: true, new: true, runValidators: true },
    );
    if (previous?.state !== state) {
      await deps.audit(`production_scale.backpressure.${state === 'normal' ? 'recovered' : state}`, 'WorkloadBackpressureState', `${scopeKey(scope)}:${pool}`, scope, { workerPool: pool, loadCategory: state });
      scaleMetrics.increment('production_scale_backpressure_transitions', { workerPool: pool, loadCategory: state });
    }
    scaleMetrics.gauge('production_scale_backpressure_state', { workerPool: pool, loadCategory: state }, BACKPRESSURE_STATES.indexOf(state));
    scaleMetrics.gauge('production_scale_queue_depth', { workerPool: pool }, record.queueDepth);
    states.push(plain(record));
  }
  return { states };
}

async function queueRecords(scope, deps) {
  const fields = 'workloadCategory routingVersion partitionNumber partitionKey priorityClass workerPool status createdAt nextAttemptAt';
  const [nodes, compensations, runtimeWork] = await Promise.all([
    deps.OrchestrationNodeRun.find({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      status: { $in: ['ready', 'queued', 'retry_wait', 'running', 'recovery_pending', 'compensation_pending'] },
    }).select(fields).lean(),
    deps.OrchestrationCompensationRun.find({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      status: { $in: ['pending', 'queued', 'running', 'retry_wait', 'waiting_approval', 'waiting_intervention'] },
    }).select(fields).lean(),
    deps.RuntimeWorkItem.find({
      organizationId: scope.organizationId,
      receivingWorkspaceId: scope.workspaceId,
      status: { $in: ['pending', 'waiting_for_approval', 'blocked', 'claimed', 'running', 'retry_preparing', 'retry_scheduled', 'cancellation_requested'] },
    }).select(fields).lean(),
  ]);
  return [...nodes, ...compensations, ...runtimeWork].map((record) => ({
    ...record,
    status: ['claimed', 'running'].includes(record.status) ? 'running' : record.status,
  }));
}

function summarizeQueueRecords(records = [], now = new Date()) {
  const groups = new Map();
  for (const record of records) {
    const category = WORKLOAD_CATEGORIES.includes(record.workloadCategory) ? record.workloadCategory : 'orchestration_node';
    if (!groups.has(category)) groups.set(category, { workloadCategory: category, workerPool: WORKLOAD_DEFINITIONS[category].workerPool, depth: 0, active: 0, oldestQueuedAt: null, routingVersions: new Set(), partitions: new Set() });
    const group = groups.get(category);
    group.depth += record.status === 'running' ? 0 : 1;
    group.active += record.status === 'running' ? 1 : 0;
    group.routingVersions.add(Number(record.routingVersion || 1));
    group.partitions.add(Number(record.partitionNumber || 0));
    if (record.status !== 'running' && (!group.oldestQueuedAt || new Date(record.createdAt) < group.oldestQueuedAt)) group.oldestQueuedAt = new Date(record.createdAt);
  }
  return [...groups.values()].map((group) => ({
    workloadCategory: group.workloadCategory,
    workerPool: group.workerPool,
    depth: group.depth,
    active: group.active,
    oldestQueuedAt: group.oldestQueuedAt,
    oldestQueueAgeMs: group.oldestQueuedAt ? Math.max(0, now - group.oldestQueuedAt) : 0,
    routingVersions: [...group.routingVersions].sort((a, b) => a - b),
    partitionCount: group.partitions.size,
  })).sort((a, b) => a.workloadCategory.localeCompare(b.workloadCategory));
}

async function getQueueSummary(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await deps.authorize('productionScale.read', 'QueueSummary', null, scope, caller);
  const queues = summarizeQueueRecords(await queueRecords(scope, deps));
  for (const queue of queues) {
    scaleMetrics.gauge('production_scale_queue_depth', { workloadCategory: queue.workloadCategory, workerPool: queue.workerPool }, queue.depth);
    scaleMetrics.gauge('production_scale_queue_age_ms', { workloadCategory: queue.workloadCategory, queueAgeCategory: queue.oldestQueueAgeMs >= 900_000 ? 'critical' : queue.oldestQueueAgeMs >= 300_000 ? 'stale' : queue.oldestQueueAgeMs >= 60_000 ? 'aging' : 'fresh' }, queue.oldestQueueAgeMs);
  }
  return { queues };
}

async function getCapacity(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  if (!options.skipAuthorize) await deps.authorize('productionScale.read', 'CapacitySummary', null, scope, caller);
  const [workers, records, configuration, states] = await Promise.all([
    deps.WorkerRegistration.find({ status: { $in: ['active', 'idle', 'draining'] } }).lean(),
    queueRecords(scope, deps),
    activeConfiguration(scope, deps),
    deps.WorkloadBackpressureState.find({ scopeKey: scopeKey(scope) }).lean(),
  ]);
  const queues = summarizeQueueRecords(records);
  const queueDepth = queues.reduce((sum, queue) => sum + queue.depth, 0);
  const protectedQueueDepth = queues.filter((queue) => ['orchestration_recovery', 'orchestration_compensation', 'approval_resume', 'intervention_expiry'].includes(queue.workloadCategory)).reduce((sum, queue) => sum + queue.depth, 0);
  const reservedSlots = Object.values(configuration.reservedCapacityByCategory || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const completionRatePerMinute = Math.max(0, Number(input.completionRatePerMinute || states.reduce((sum, state) => sum + Number(state.completionThroughput || 0), 0)));
  const capacity = core.estimateCapacity({ workers, queueDepth, protectedQueueDepth, reservedSlots, completionRatePerMinute, incomingWorkRatePerMinute: input.incomingWorkRatePerMinute });
  const backpressureState = states.reduce((result, item) => BACKPRESSURE_STATES.indexOf(item.state) > BACKPRESSURE_STATES.indexOf(result) ? item.state : result, 'normal');
  const result = {
    ...capacity,
    backpressureState,
    databasePressureCategory: states.some((state) => state.databasePressureCategory === 'unavailable') ? 'unavailable' : states.some((state) => state.databasePressureCategory === 'degraded') ? 'degraded' : states.some((state) => state.databasePressureCategory === 'elevated') ? 'elevated' : 'healthy',
    queues,
    workerPools: WORKER_POOLS.map((pool) => {
      const poolWorkers = workers.filter((worker) => worker.workerPool === pool);
      return {
        workerPool: pool,
        activeWorkers: poolWorkers.filter((worker) => worker.status === 'active').length,
        idleWorkers: poolWorkers.filter((worker) => worker.status === 'idle').length,
        drainingWorkers: poolWorkers.filter((worker) => worker.status === 'draining').length,
        unhealthyWorkers: poolWorkers.filter((worker) => worker.status === 'unhealthy').length,
        capacity: poolWorkers.reduce((sum, worker) => sum + Number(worker.maximumConcurrency || 0), 0),
        activeClaims: poolWorkers.reduce((sum, worker) => sum + Number(worker.activeClaimCount || 0), 0),
      };
    }),
  };
  for (const pool of result.workerPools) {
    scaleMetrics.gauge('production_scale_active_workers', { workerPool: pool.workerPool, status: 'active' }, pool.activeWorkers);
    scaleMetrics.gauge('production_scale_draining_workers', { workerPool: pool.workerPool, status: 'draining' }, pool.drainingWorkers);
    scaleMetrics.gauge('production_scale_worker_capacity', { workerPool: pool.workerPool }, pool.capacity);
  }
  scaleMetrics.gauge('production_scale_estimated_drain_time_ms', { capacityCategory: result.saturationCategory }, result.estimatedDrainTimeMs || 0);
  return result;
}

async function getAutoscalingSignals(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await deps.authorize('autoscalingSignal.read', 'AutoscalingSignal', null, scope, caller, { requestedOperationalAction: 'autoscaling_recommendation_access' });
  const capacity = await getCapacity(input, caller, { ...options, dependencies: deps, skipAuthorize: true });
  const recommendation = core.autoscalingRecommendation({ capacity, backpressureState: capacity.backpressureState, databasePressureCategory: capacity.databasePressureCategory });
  scaleMetrics.increment('production_scale_autoscaling_recommendations', { recommendation: recommendation.recommendation, pressureCategory: capacity.databasePressureCategory });
  return {
    ...recommendation,
    signals: {
      queueDepth: capacity.queueDepth,
      oldestQueueAgeMs: Math.max(0, ...capacity.queues.map((queue) => queue.oldestQueueAgeMs)),
      workerUtilizationCategory: capacity.saturationCategory,
      activeClaimCount: capacity.currentlyUsedSlots,
      completionRatePerMinute: capacity.completionRatePerMinute,
      protectedQueueDepth: capacity.protectedQueueDepth,
      saturatedPartitionCount: 0,
    },
  };
}

async function getBackpressure(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await deps.authorize('backpressureControl.read', 'WorkloadBackpressureState', null, scope, caller);
  const configuration = await activeConfiguration(scope, deps);
  const states = await Promise.all(WORKER_POOLS.map((pool) => core.currentBackpressure(scope, pool, configuration, deps)));
  return { states: states.sort((left, right) => left.workerPool.localeCompare(right.workerPool)) };
}

async function createDeadLetter(input = {}, options = {}) {
  core.assertNoSensitiveData(input);
  const deps = dependencies(options.dependencies);
  const workloadCategory = enumValue(input.workloadCategory, WORKLOAD_CATEGORIES, 'workloadCategory');
  const payload = {
    organizationId: safeIdentifier(input.organizationId, 'organizationId'),
    workspaceId: safeIdentifier(input.workspaceId, 'workspaceId'),
    safeJobId: safeIdentifier(input.safeJobId || `${input.sourceType}:${input.sourceRecordId}`, 'safeJobId'),
    sourceType: enumValue(input.sourceType, ['orchestration_node', 'runtime_work', 'control_job'], 'sourceType'),
    sourceRecordId: safeIdentifier(input.sourceRecordId, 'sourceRecordId'),
    workloadCategory,
    priorityClass: enumValue(input.priorityClass, ['critical_recovery', 'high', 'standard', 'low', 'maintenance'], 'priorityClass', WORKLOAD_DEFINITIONS[workloadCategory].defaultPriority),
    routingVersion: boundedInteger(input.routingVersion, 'routingVersion', 1, 1_000, 1),
    partitionNumber: boundedInteger(input.partitionNumber, 'partitionNumber', 0, 255, 0),
    status: 'dead_lettered',
    safeFailureCode: String(input.safeFailureCode || 'UNRECOVERABLE_WORKLOAD_FAILURE').toUpperCase(),
    attemptCount: boundedInteger(input.attemptCount, 'attemptCount', 0, 1_000, 0),
    requestId: safeIdentifier(input.requestId, 'requestId'),
    traceId: safeIdentifier(input.traceId, 'traceId'),
    lastAttemptAt: input.lastAttemptAt || new Date(),
  };
  try {
    const record = await deps.WorkloadDeadLetter.create(payload);
    scaleMetrics.increment('production_scale_dead_letters', { workloadCategory, safeReasonCode: payload.safeFailureCode, status: 'dead_lettered' });
    return record;
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return deps.WorkloadDeadLetter.findOne({ sourceType: payload.sourceType, sourceRecordId: payload.sourceRecordId });
  }
}

async function listDeadLetters(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await deps.authorize('deadLetter.read', 'WorkloadDeadLetter', null, scope, caller);
  const { limit, page, skip } = paging(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) filter.status = enumValue(input.status, ['dead_lettered', 'retry_requested', 'archived', 'terminated'], 'status');
  if (input.workloadCategory) filter.workloadCategory = enumValue(input.workloadCategory, WORKLOAD_CATEGORIES, 'workloadCategory');
  const [items, total] = await Promise.all([
    deps.WorkloadDeadLetter.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    deps.WorkloadDeadLetter.countDocuments(filter),
  ]);
  return { items: items.map(serializeDecision), page, limit, total };
}

async function scopedDeadLetter(jobId, scope, deps) {
  const record = await deps.WorkloadDeadLetter.findOne({ _id: jobId, organizationId: scope.organizationId, workspaceId: scope.workspaceId });
  if (!record) throw new AppError(404, 'DEAD_LETTER_NOT_FOUND', 'Dead-letter record was not found.');
  return record;
}

async function retryDeadLetter(jobId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await deps.authorize('deadLetter.retry', 'WorkloadDeadLetter', jobId, scope, caller, { requestedOperationalAction: 'dead_letter_retry' });
  const record = await scopedDeadLetter(jobId, scope, deps);
  if (record.status === 'retry_requested') return serializeDecision(record);
  if (record.status !== 'dead_lettered') throw new AppError(409, 'DEAD_LETTER_RETRY_INVALID', 'Only dead-lettered work may be retried.');
  if (record.sourceType === 'orchestration_node') {
    await deps.OrchestrationNodeRun.updateOne(
      { _id: record.sourceRecordId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, status: { $in: ['failed', 'recovery_pending'] } },
      { $set: { status: 'ready', nextAttemptAt: new Date() }, $unset: { safeFailure: 1, leaseOwner: 1, leaseToken: 1, leaseExpiresAt: 1, heartbeatAt: 1 } },
    );
  } else if (record.sourceType === 'runtime_work') {
    await deps.RuntimeWorkItem.updateOne(
      { _id: record.sourceRecordId, organizationId: scope.organizationId, receivingWorkspaceId: scope.workspaceId, status: 'dead_lettered' },
      { $set: { status: 'pending', availableAt: new Date() }, $unset: { leaseOwner: 1, leaseTokenHash: 1, leaseExpiresAt: 1, lastHeartbeatAt: 1 } },
    );
  }
  let updated = await deps.WorkloadDeadLetter.findOneAndUpdate(
    { _id: record._id, status: 'dead_lettered' },
    { $set: { status: 'retry_requested', retryRequestedAt: new Date() } },
    { new: true, runValidators: true },
  );
  if (!updated) {
    updated = await deps.WorkloadDeadLetter.findOne({ _id: record._id, status: 'retry_requested' });
    if (updated) return serializeDecision(updated);
    throw new AppError(409, 'DEAD_LETTER_RETRY_INVALID', 'Dead-letter retry state changed concurrently.');
  }
  await deps.audit('production_scale.dead_letter.retry_requested', 'WorkloadDeadLetter', updated, scope, { workloadCategory: updated.workloadCategory, safeReasonCode: updated.safeFailureCode });
  scaleMetrics.increment('production_scale_dead_letter_actions', { workloadCategory: updated.workloadCategory, operation: 'retry', status: updated.status });
  return serializeDecision(updated);
}

async function archiveDeadLetter(jobId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await deps.authorize('deadLetter.archive', 'WorkloadDeadLetter', jobId, scope, caller);
  const current = await scopedDeadLetter(jobId, scope, deps);
  if (current.status === 'archived') return serializeDecision(current);
  const updated = await deps.WorkloadDeadLetter.findOneAndUpdate(
    { _id: jobId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, status: { $in: ['dead_lettered', 'retry_requested'] } },
    { $set: { status: 'archived', archivedAt: new Date() } },
    { new: true, runValidators: true },
  );
  if (!updated) throw new AppError(404, 'DEAD_LETTER_NOT_FOUND', 'Dead-letter record was not found.');
  await deps.audit('production_scale.dead_letter.archived', 'WorkloadDeadLetter', updated, scope, { workloadCategory: updated.workloadCategory, safeReasonCode: updated.safeFailureCode });
  scaleMetrics.increment('production_scale_dead_letter_actions', { workloadCategory: updated.workloadCategory, operation: 'archive', status: updated.status });
  return serializeDecision(updated);
}

async function createDeadLetterIntervention(jobId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await deps.authorize('deadLetter.createIntervention', 'WorkloadDeadLetter', jobId, scope, caller, { requestedOperationalAction: 'dead_letter_create_intervention' });
  const record = await scopedDeadLetter(jobId, scope, deps);
  if (record.sourceType !== 'orchestration_node') {
    throw new AppError(409, 'DEAD_LETTER_INTERVENTION_UNSUPPORTED', 'This dead-letter source does not have an orchestration intervention target.');
  }
  const node = await deps.OrchestrationNodeRun.findOne({
    _id: record.sourceRecordId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  });
  if (!node) throw new AppError(404, 'DEAD_LETTER_SOURCE_NOT_FOUND', 'The dead-letter source record was not found.');
  const run = await deps.OrchestrationRun.findOne({
    _id: node.orchestrationRunId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  });
  if (!run) throw new AppError(404, 'DEAD_LETTER_SOURCE_NOT_FOUND', 'The dead-letter orchestration run was not found.');
  const idempotencyKeyHash = `sha256:${core.stableHash(`dead-letter-intervention:${scope.organizationId}:${scope.workspaceId}:${idOf(record)}`)}`;
  let intervention = await deps.OrchestrationInterventionRequest.findOne({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    idempotencyKeyHash,
  });
  if (!intervention) {
    try {
      intervention = await deps.OrchestrationInterventionRequest.create({
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        orchestrationRunId: run._id,
        nodeRunId: node._id,
        interventionType: 'inspect_failure',
        status: 'pending',
        title: 'Dead-letter workload requires intervention',
        safeSummary: 'A bounded recovery decision is required after workload attempts were exhausted.',
        safeFailureCode: record.safeFailureCode,
        safeFailureCategory: 'unknown_safe_failure',
        allowedActions: ['inspect_failure', 'retry', 'terminate'],
        requiredPermission: 'orchestrationIntervention.resolve',
        assignedRoleIds: [],
        assignedUserIds: [],
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
        idempotencyKeyHash,
        requestId: scope.requestId || record.requestId,
        traceId: scope.traceId || record.traceId,
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      intervention = await deps.OrchestrationInterventionRequest.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, idempotencyKeyHash });
    }
    await Promise.all([
      deps.OrchestrationNodeRun.updateOne({ _id: node._id }, { $set: { interventionRequestId: intervention._id } }),
      deps.OrchestrationRun.updateOne({ _id: run._id }, { $set: { interventionRequestId: intervention._id } }),
    ]);
  }
  await deps.audit('production_scale.dead_letter.intervention_requested', 'WorkloadDeadLetter', record, scope, { workloadCategory: record.workloadCategory, safeReasonCode: record.safeFailureCode, interventionId: idOf(intervention) });
  scaleMetrics.increment('production_scale_dead_letter_actions', { workloadCategory: record.workloadCategory, operation: 'create_intervention', status: record.status });
  return { deadLetterId: idOf(record), interventionId: idOf(intervention), interventionRequested: true, safeReasonCode: record.safeFailureCode };
}

async function ensureProductionScaleIndexes() {
  const models = [QueuePartition, WorkerRegistration, WorkloadAdmissionDecision, WorkloadBackpressureState, WorkloadDeadLetter, WorkloadQuotaPolicy, WorkloadQuotaReservation, WorkloadScaleConfiguration, OrchestrationNodeRun, OrchestrationCompensationRun, RuntimeWorkItem];
  await Promise.all(models.map((Model) => Model.createIndexes()));
  return models.map((Model) => Model.modelName);
}

module.exports = {
  activateQuotaPolicy,
  activateScaleConfiguration,
  archiveDeadLetter,
  archiveQuotaPolicy,
  archiveScaleConfiguration,
  controlPartition,
  createDeadLetter,
  createDeadLetterIntervention,
  createQuotaPolicy,
  createScaleConfiguration,
  drainWorker,
  ensureProductionScaleIndexes,
  evaluateAndPersistBackpressure,
  getAdmissionDecision,
  getAutoscalingSignals,
  getBackpressure,
  getCapacity,
  getPartition,
  getQuotaPolicy,
  getScaleConfiguration,
  getWorker,
  listAdmissionDecisions,
  listDeadLetters,
  listPartitions,
  listQuotaPolicies,
  listScaleConfigurations,
  listWorkers,
  retryDeadLetter,
  stopWorkerClaims,
  summarizeQueueRecords,
  getQueueSummary,
  updateQuotaPolicy,
  updateScaleConfiguration,
  validateQuotaPolicyRecord,
  validateScaleConfigurationRecord,
};
