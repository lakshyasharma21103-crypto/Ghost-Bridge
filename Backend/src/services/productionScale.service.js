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
const OrchestrationDefinition = require('../models/OrchestrationDefinition');
const OrchestrationRun = require('../models/OrchestrationRun');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const OrchestrationCompensationRun = require('../models/OrchestrationCompensationRun');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const { assertAuthorized } = require('./authorization.service');
const { assertOperationalAccess } = require('./operationalState.service');
const { createAuditLog } = require('./auditService');
const scaleMetrics = require('./productionScaleMetrics.service');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  ADMISSION_CLASSES,
  ADMISSION_DECISIONS,
  AUTOSCALING_RECOMMENDATIONS,
  BACKPRESSURE_STATES,
  DATABASE_PRESSURE_CATEGORIES,
  DEFAULT_BACKPRESSURE_THRESHOLDS,
  DEFAULT_QUOTA_POLICY,
  PRIORITY_CLASSES,
  PRIORITY_RANK,
  PRODUCTION_SCALE_LIMITS,
  WORKER_POOLS,
  WORKLOAD_CATEGORIES,
  WORKLOAD_DEFINITIONS,
} = require('../constants/productionScale');

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const FORBIDDEN_DATA_KEY = /(authorization|bearer|credential|secret|token|api.?key|password|raw.?payload|payload)/i;
const SAFE_PAYLOAD_METADATA_KEYS = new Set(['payloadBytesEstimate', 'maximumPayloadBytesPerJob']);
const ACTIVE_RESERVATION_STATUSES = ['reserved', 'consumed'];
const ACTIVE_RUN_STATUSES = [
  'queued', 'running', 'waiting_approval', 'waiting_intervention', 'recovery_pending',
  'recovering', 'compensation_pending', 'compensating', 'cancel_requested', 'cancelling',
];

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function plain(value) {
  if (!value) return value;
  return typeof value.toObject === 'function' ? value.toObject() : { ...value };
}

function validationError(path, message) {
  return new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Production scale validation failed.', [
    { path, message },
  ]);
}

function boundedInteger(value, path, minimum, maximum, fallback) {
  const candidate = value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw validationError(path, `${path} must be an integer between ${minimum} and ${maximum}.`);
  }
  return candidate;
}

function safeIdentifier(value, path, { required = true, maximum = 200 } = {}) {
  if (value === undefined || value === null || value === '') {
    if (!required) return undefined;
    throw validationError(path, `${path} is required.`);
  }
  const candidate = String(value).trim();
  if (candidate.length > maximum || !SAFE_IDENTIFIER_PATTERN.test(candidate)) {
    throw validationError(path, `${path} must be a safe identifier.`);
  }
  return candidate;
}

function enumValue(value, values, path, fallback) {
  const candidate = String(value || fallback || '').trim();
  if (!values.includes(candidate)) throw validationError(path, `${path} is not supported.`);
  return candidate;
}

function safeReasonCode(value, fallback = 'CAPACITY_POLICY_APPLIED') {
  const candidate = String(value || fallback).trim().toUpperCase();
  return SAFE_CODE_PATTERN.test(candidate) ? candidate : fallback;
}

function assertNoSensitiveData(value, path = '$', depth = 0) {
  if (depth > 12) throw validationError(path, `${path} exceeds the safe nesting depth.`);
  if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) return true;
  if (Array.isArray(value)) {
    if (value.length > 1_000) throw validationError(path, `${path} exceeds the bounded array size.`);
    value.forEach((item, index) => assertNoSensitiveData(item, `${path}[${index}]`, depth + 1));
    return true;
  }
  if (typeof value !== 'object') throw validationError(path, `${path} contains an unsupported value.`);
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_DATA_KEY.test(key) && !SAFE_PAYLOAD_METADATA_KEYS.has(key)) {
      throw validationError(`${path}.${key}`, `${key} is not permitted in scale-control metadata.`);
    }
    assertNoSensitiveData(item, `${path}.${key}`, depth + 1);
  }
  return true;
}

function stableHash(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function stableHashInteger(value) {
  return BigInt(`0x${stableHash(value).slice(0, 16)}`);
}

function routingInput(input, routingVersion) {
  const values = [
    safeIdentifier(input.organizationId, 'organizationId'),
    safeIdentifier(input.workspaceId, 'workspaceId'),
    safeIdentifier(input.routingKey, 'routingKey'),
    enumValue(input.workloadCategory, WORKLOAD_CATEGORIES, 'workloadCategory'),
    String(routingVersion),
  ];
  return values.map((value) => `${Buffer.byteLength(value, 'utf8')}:${value}`).join('|');
}

function partitionKey(workloadCategory, routingVersion, partitionNumber) {
  return `${workloadCategory}:v${routingVersion}:p${partitionNumber}`;
}

function defaultScaleConfiguration(scopeKey = 'platform') {
  const byCategory = Object.fromEntries(
    WORKLOAD_CATEGORIES.map((category) => [category, WORKLOAD_DEFINITIONS[category].partitionCount]),
  );
  const workerPoolConfiguration = Object.fromEntries(
    WORKER_POOLS.map((pool) => {
      const definitions = Object.values(WORKLOAD_DEFINITIONS).filter((item) => item.workerPool === pool);
      return [pool, {
        minimumWorkers: definitions.some((item) => item.minimumConcurrency > 0) ? 1 : 0,
        maximumWorkers: 50,
        perWorkerConcurrency: Math.min(20, Math.max(1, ...definitions.map((item) => item.maximumConcurrency))),
        claimBatchSize: Math.min(20, Math.max(1, ...definitions.map((item) => item.claimBatchSize))),
        leaseDurationMs: Math.max(...definitions.map((item) => item.leaseDurationMs)),
        heartbeatIntervalMs: Math.min(...definitions.map((item) => item.heartbeatIntervalMs)),
        queueAgeTargetMs: Math.min(...definitions.map((item) => item.queueAgeThresholdMs)),
        overloadThreshold: 9000,
      }];
    }),
  );
  return {
    scopeKey,
    version: 1,
    status: 'active',
    routingVersions: [{ version: 1, status: 'active', partitionCountByCategory: byCategory }],
    partitionCountByCategory: byCategory,
    workerPoolConfiguration,
    claimBatchSizeByCategory: Object.fromEntries(WORKLOAD_CATEGORIES.map((category) => [category, WORKLOAD_DEFINITIONS[category].claimBatchSize])),
    leaseDurationByCategory: Object.fromEntries(WORKLOAD_CATEGORIES.map((category) => [category, WORKLOAD_DEFINITIONS[category].leaseDurationMs])),
    heartbeatIntervalByCategory: Object.fromEntries(WORKLOAD_CATEGORIES.map((category) => [category, WORKLOAD_DEFINITIONS[category].heartbeatIntervalMs])),
    maximumConcurrencyByCategory: Object.fromEntries(WORKLOAD_CATEGORIES.map((category) => [category, WORKLOAD_DEFINITIONS[category].maximumConcurrency])),
    reservedCapacityByCategory: {
      orchestration_recovery: 5,
      orchestration_compensation: 5,
      approval_resume: 2,
      intervention_expiry: 2,
    },
    backpressureThresholds: { ...DEFAULT_BACKPRESSURE_THRESHOLDS },
    overloadBehavior: 'reject',
    autoscalingTargets: {
      targetUtilizationBasisPoints: 7000,
      scaleUpQueuePerWorker: 25,
      scaleDownQueuePerWorker: 2,
      minimumObservationWindowMs: 60_000,
    },
  };
}

function normalizeCategoryMap(input, field, selector) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const result = {};
  for (const category of WORKLOAD_CATEGORIES) result[category] = selector(source[category], category, `${field}.${category}`);
  const unknown = Object.keys(source).find((key) => !WORKLOAD_CATEGORIES.includes(key));
  if (unknown) throw validationError(`${field}.${unknown}`, `${unknown} is not a supported workload category.`);
  return result;
}

function normalizeWorkerPools(input, defaults) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const unknownPool = Object.keys(source).find((key) => !WORKER_POOLS.includes(key));
  if (unknownPool) throw validationError(`workerPoolConfiguration.${unknownPool}`, 'Unsupported worker pool.');
  const allowed = new Set(['minimumWorkers', 'maximumWorkers', 'perWorkerConcurrency', 'claimBatchSize', 'leaseDurationMs', 'heartbeatIntervalMs', 'queueAgeTargetMs', 'overloadThreshold']);
  return Object.fromEntries(WORKER_POOLS.map((pool) => {
    const value = { ...defaults[pool], ...(source[pool] || {}) };
    const unknown = Object.keys(value).find((key) => !allowed.has(key));
    if (unknown) throw validationError(`workerPoolConfiguration.${pool}.${unknown}`, 'Unsupported worker-pool setting.');
    const normalized = {
      minimumWorkers: boundedInteger(value.minimumWorkers, `workerPoolConfiguration.${pool}.minimumWorkers`, 0, 1_000, defaults[pool].minimumWorkers),
      maximumWorkers: boundedInteger(value.maximumWorkers, `workerPoolConfiguration.${pool}.maximumWorkers`, 1, 1_000, defaults[pool].maximumWorkers),
      perWorkerConcurrency: boundedInteger(value.perWorkerConcurrency, `workerPoolConfiguration.${pool}.perWorkerConcurrency`, 1, PRODUCTION_SCALE_LIMITS.maximumWorkerConcurrency, defaults[pool].perWorkerConcurrency),
      claimBatchSize: boundedInteger(value.claimBatchSize, `workerPoolConfiguration.${pool}.claimBatchSize`, 1, PRODUCTION_SCALE_LIMITS.maximumClaimBatchSize, defaults[pool].claimBatchSize),
      leaseDurationMs: boundedInteger(value.leaseDurationMs, `workerPoolConfiguration.${pool}.leaseDurationMs`, 5_000, 3_600_000, defaults[pool].leaseDurationMs),
      heartbeatIntervalMs: boundedInteger(value.heartbeatIntervalMs, `workerPoolConfiguration.${pool}.heartbeatIntervalMs`, 1_000, 300_000, defaults[pool].heartbeatIntervalMs),
      queueAgeTargetMs: boundedInteger(value.queueAgeTargetMs, `workerPoolConfiguration.${pool}.queueAgeTargetMs`, 0, 86_400_000, defaults[pool].queueAgeTargetMs),
      overloadThreshold: boundedInteger(value.overloadThreshold, `workerPoolConfiguration.${pool}.overloadThreshold`, 0, 10_000, defaults[pool].overloadThreshold),
    };
    if (normalized.minimumWorkers > normalized.maximumWorkers) throw validationError(`workerPoolConfiguration.${pool}.minimumWorkers`, 'Minimum workers must not exceed maximum workers.');
    if (normalized.heartbeatIntervalMs * 3 > normalized.leaseDurationMs) throw validationError(`workerPoolConfiguration.${pool}.heartbeatIntervalMs`, 'Heartbeat interval must be at most one third of the lease duration.');
    return [pool, normalized];
  }));
}

function normalizeAutoscalingTargets(input, defaults) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const allowed = new Set(['targetUtilizationBasisPoints', 'scaleUpQueuePerWorker', 'scaleDownQueuePerWorker', 'minimumObservationWindowMs']);
  const unknown = Object.keys(source).find((key) => !allowed.has(key));
  if (unknown) throw validationError(`autoscalingTargets.${unknown}`, 'Unsupported autoscaling target.');
  const result = {
    targetUtilizationBasisPoints: boundedInteger(source.targetUtilizationBasisPoints, 'autoscalingTargets.targetUtilizationBasisPoints', 1, 10_000, defaults.targetUtilizationBasisPoints),
    scaleUpQueuePerWorker: boundedInteger(source.scaleUpQueuePerWorker, 'autoscalingTargets.scaleUpQueuePerWorker', 1, 1_000_000, defaults.scaleUpQueuePerWorker),
    scaleDownQueuePerWorker: boundedInteger(source.scaleDownQueuePerWorker, 'autoscalingTargets.scaleDownQueuePerWorker', 0, 1_000_000, defaults.scaleDownQueuePerWorker),
    minimumObservationWindowMs: boundedInteger(source.minimumObservationWindowMs, 'autoscalingTargets.minimumObservationWindowMs', 1_000, 86_400_000, defaults.minimumObservationWindowMs),
  };
  if (result.scaleDownQueuePerWorker > result.scaleUpQueuePerWorker) throw validationError('autoscalingTargets.scaleDownQueuePerWorker', 'Scale-down queue target must not exceed the scale-up target.');
  return result;
}

function normalizeScaleConfiguration(input = {}, current = {}) {
  assertNoSensitiveData(input);
  const defaults = defaultScaleConfiguration(input.scopeKey || current.scopeKey || 'platform');
  const merged = { ...defaults, ...current, ...input };
  const topPartitions = normalizeCategoryMap(
    merged.partitionCountByCategory,
    'partitionCountByCategory',
    (value, category, path) => boundedInteger(value, path, 1, PRODUCTION_SCALE_LIMITS.maximumPartitionsPerCategory, WORKLOAD_DEFINITIONS[category].partitionCount),
  );
  const rawRoutingVersions = Array.isArray(merged.routingVersions) ? merged.routingVersions : defaults.routingVersions;
  if (!rawRoutingVersions.length || rawRoutingVersions.length > PRODUCTION_SCALE_LIMITS.maximumRoutingVersions) {
    throw validationError('routingVersions', `routingVersions must contain between 1 and ${PRODUCTION_SCALE_LIMITS.maximumRoutingVersions} entries.`);
  }
  const seenVersions = new Set();
  const routingVersions = rawRoutingVersions.map((entry, index) => {
    const version = boundedInteger(entry?.version, `routingVersions.${index}.version`, 1, 1_000);
    if (seenVersions.has(version)) throw validationError(`routingVersions.${index}.version`, 'Routing versions must be unique.');
    seenVersions.add(version);
    const status = enumValue(entry?.status, ['active', 'draining', 'retired'], `routingVersions.${index}.status`, 'draining');
    const partitionCounts = normalizeCategoryMap(
      entry?.partitionCountByCategory || (status === 'active' ? topPartitions : undefined),
      `routingVersions.${index}.partitionCountByCategory`,
      (value, category, path) => boundedInteger(value, path, 1, PRODUCTION_SCALE_LIMITS.maximumPartitionsPerCategory, topPartitions[category]),
    );
    return { version, status, partitionCountByCategory: partitionCounts };
  });
  if (routingVersions.filter((entry) => entry.status === 'active').length !== 1) {
    throw validationError('routingVersions', 'Exactly one routing version must be active.');
  }
  const activeRoute = routingVersions.find((entry) => entry.status === 'active');
  for (const category of WORKLOAD_CATEGORIES) {
    if (activeRoute.partitionCountByCategory[category] !== topPartitions[category]) {
      throw validationError(`routingVersions.${routingVersions.indexOf(activeRoute)}.partitionCountByCategory.${category}`, 'Active routing-version partition counts must match the top-level category counts.');
    }
  }
  const claimBatchSizeByCategory = normalizeCategoryMap(
    merged.claimBatchSizeByCategory,
    'claimBatchSizeByCategory',
    (value, category, path) => boundedInteger(value, path, 1, PRODUCTION_SCALE_LIMITS.maximumClaimBatchSize, WORKLOAD_DEFINITIONS[category].claimBatchSize),
  );
  const leaseDurationByCategory = normalizeCategoryMap(
    merged.leaseDurationByCategory,
    'leaseDurationByCategory',
    (value, category, path) => boundedInteger(value, path, 5_000, 3_600_000, WORKLOAD_DEFINITIONS[category].leaseDurationMs),
  );
  const heartbeatIntervalByCategory = normalizeCategoryMap(
    merged.heartbeatIntervalByCategory,
    'heartbeatIntervalByCategory',
    (value, category, path) => boundedInteger(value, path, 1_000, 300_000, WORKLOAD_DEFINITIONS[category].heartbeatIntervalMs),
  );
  const maximumConcurrencyByCategory = normalizeCategoryMap(
    merged.maximumConcurrencyByCategory,
    'maximumConcurrencyByCategory',
    (value, category, path) => boundedInteger(value, path, 1, PRODUCTION_SCALE_LIMITS.maximumWorkerConcurrency, WORKLOAD_DEFINITIONS[category].maximumConcurrency),
  );
  for (const category of WORKLOAD_CATEGORIES) {
    if (heartbeatIntervalByCategory[category] * 3 > leaseDurationByCategory[category]) {
      throw validationError(`heartbeatIntervalByCategory.${category}`, 'Heartbeat interval must be at most one third of the lease duration.');
    }
  }
  const reservedCapacityByCategory = {};
  for (const [category, raw] of Object.entries(merged.reservedCapacityByCategory || {})) {
    if (!WORKLOAD_CATEGORIES.includes(category)) throw validationError(`reservedCapacityByCategory.${category}`, 'Unsupported workload category.');
    reservedCapacityByCategory[category] = boundedInteger(raw, `reservedCapacityByCategory.${category}`, 0, PRODUCTION_SCALE_LIMITS.maximumReservedSlots, 0);
  }
  if (Object.values(reservedCapacityByCategory).reduce((sum, value) => sum + value, 0) > PRODUCTION_SCALE_LIMITS.maximumReservedSlots) {
    throw validationError('reservedCapacityByCategory', `Total reserved capacity must not exceed ${PRODUCTION_SCALE_LIMITS.maximumReservedSlots}.`);
  }
  const thresholds = { ...DEFAULT_BACKPRESSURE_THRESHOLDS, ...(merged.backpressureThresholds || {}) };
  for (const [key, raw] of Object.entries(thresholds)) {
    thresholds[key] = boundedInteger(raw, `backpressureThresholds.${key}`, 0, key.includes('BasisPoints') ? 10_000 : 86_400_000, DEFAULT_BACKPRESSURE_THRESHOLDS[key] || 0);
  }
  return {
    scopeKey: safeIdentifier(merged.scopeKey || defaults.scopeKey, 'scopeKey', { maximum: 200 }),
    version: boundedInteger(merged.version, 'version', 1, 1_000_000, 1),
    status: enumValue(merged.status, ['draft', 'active', 'archived'], 'status', 'draft'),
    routingVersions,
    partitionCountByCategory: topPartitions,
    workerPoolConfiguration: normalizeWorkerPools(merged.workerPoolConfiguration, defaults.workerPoolConfiguration),
    claimBatchSizeByCategory,
    leaseDurationByCategory,
    heartbeatIntervalByCategory,
    maximumConcurrencyByCategory,
    reservedCapacityByCategory,
    backpressureThresholds: thresholds,
    overloadBehavior: enumValue(merged.overloadBehavior, ['reject', 'defer', 'approval_required'], 'overloadBehavior', 'reject'),
    autoscalingTargets: normalizeAutoscalingTargets(merged.autoscalingTargets, defaults.autoscalingTargets),
  };
}

function assertRoutingEvolution(candidateInput, previousInput) {
  if (!previousInput) return true;
  const candidate = normalizeScaleConfiguration(candidateInput);
  const previous = normalizeScaleConfiguration(previousInput);
  for (const previousRoute of previous.routingVersions) {
    const currentRoute = candidate.routingVersions.find((entry) => entry.version === previousRoute.version);
    if (!currentRoute) throw validationError('routingVersions', `Routing version ${previousRoute.version} must be retained until explicitly retired.`);
    if (WORKLOAD_CATEGORIES.some((category) => currentRoute.partitionCountByCategory[category] !== previousRoute.partitionCountByCategory[category])) {
      throw validationError('routingVersions', `Routing version ${previousRoute.version} partition counts are immutable.`);
    }
  }
  const previousActive = activeRoutingVersion(previous);
  const candidateActive = activeRoutingVersion(candidate);
  const partitionCountsChanged = WORKLOAD_CATEGORIES.some((category) => candidate.partitionCountByCategory[category] !== previous.partitionCountByCategory[category]);
  if (partitionCountsChanged && candidateActive.version === previousActive.version) {
    throw validationError('routingVersions', 'Partition-count changes require a new active routing version.');
  }
  if (candidateActive.version !== previousActive.version) {
    if (candidateActive.version <= previousActive.version) throw validationError('routingVersions', 'A new active routing version must increase monotonically.');
    const retainedPrevious = candidate.routingVersions.find((entry) => entry.version === previousActive.version);
    if (!['draining', 'retired'].includes(retainedPrevious.status)) throw validationError('routingVersions', 'The previous active routing version must become draining or retired.');
  }
  return true;
}

function validateScaleConfiguration(input = {}) {
  try {
    const configuration = normalizeScaleConfiguration(input, {});
    return { valid: true, safeReasonCodes: [], configuration };
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    return { valid: false, safeReasonCodes: ['SCALE_CONFIGURATION_INVALID'], errors: error.details || [] };
  }
}

function activeRoutingVersion(configuration = {}) {
  const versions = Array.isArray(configuration.routingVersions) ? configuration.routingVersions : [];
  return versions.find((entry) => entry.status === 'active') || { version: 1, partitionCountByCategory: configuration.partitionCountByCategory || {} };
}

function routeWorkload(input = {}, configuration = defaultScaleConfiguration()) {
  const workloadCategory = enumValue(input.workloadCategory, WORKLOAD_CATEGORIES, 'workloadCategory');
  const routeVersion = input.routingVersion
    ? (configuration.routingVersions || []).find((entry) => Number(entry.version) === Number(input.routingVersion))
    : activeRoutingVersion(configuration);
  if (!routeVersion || routeVersion.status === 'retired') {
    throw new AppError(409, 'INVALID_ROUTING_VERSION', 'The requested routing version is unavailable.');
  }
  const routingVersion = boundedInteger(routeVersion.version, 'routingVersion', 1, 1_000);
  const partitionCount = boundedInteger(
    routeVersion.partitionCountByCategory?.[workloadCategory] ?? configuration.partitionCountByCategory?.[workloadCategory],
    `partitionCountByCategory.${workloadCategory}`,
    1,
    PRODUCTION_SCALE_LIMITS.maximumPartitionsPerCategory,
    WORKLOAD_DEFINITIONS[workloadCategory].partitionCount,
  );
  const partitionNumber = Number(stableHashInteger(routingInput({ ...input, workloadCategory }, routingVersion)) % BigInt(partitionCount));
  return {
    workloadCategory,
    routingVersion,
    partitionCount,
    partitionNumber,
    partitionKey: partitionKey(workloadCategory, routingVersion, partitionNumber),
    workerPool: WORKLOAD_DEFINITIONS[workloadCategory].workerPool,
  };
}

function priorityAgeBoost(item = {}, options = {}) {
  const now = new Date(options.now || Date.now()).getTime();
  const createdAt = new Date(item.availableAt || item.nextAttemptAt || item.createdAt || now).getTime();
  const age = Math.max(0, now - createdAt);
  const interval = boundedInteger(options.agingIntervalMs, 'agingIntervalMs', 1_000, 86_400_000, PRODUCTION_SCALE_LIMITS.priorityAgingIntervalMs);
  return Math.min(PRODUCTION_SCALE_LIMITS.maximumPriorityAgeBoost, Math.floor(age / interval));
}

function effectivePriority(item = {}, options = {}) {
  const priorityClass = PRIORITY_CLASSES.includes(item.priorityClass) ? item.priorityClass : 'standard';
  return PRIORITY_RANK[priorityClass] + priorityAgeBoost(item, options);
}

function fairSchedule(items = [], options = {}) {
  const now = options.now || new Date();
  const groups = new Map();
  for (const item of items) {
    const organizationId = safeIdentifier(item.organizationId, 'item.organizationId');
    const workspaceId = safeIdentifier(item.workspaceId || item.receivingWorkspaceId, 'item.workspaceId');
    const key = `${organizationId}\u0000${workspaceId}`;
    if (!groups.has(key)) groups.set(key, { key, weight: 1, items: [] });
    const group = groups.get(key);
    group.weight = boundedInteger(item.tenantWeight || item.workspaceWeight, 'tenantWeight', 1, PRODUCTION_SCALE_LIMITS.maximumTenantWeight, group.weight);
    group.items.push(item);
  }
  const serviceCounts = options.tenantServiceCounts || new Map();
  const lastServed = options.tenantLastServedAt || new Map();
  const orderedGroups = [...groups.values()].sort((a, b) => {
    const aQuantum = Math.min(4, Math.max(1, Math.ceil(a.weight / 25)));
    const bQuantum = Math.min(4, Math.max(1, Math.ceil(b.weight / 25)));
    const serviceDifference = Number(serviceCounts.get(a.key) || 0) / aQuantum - Number(serviceCounts.get(b.key) || 0) / bQuantum;
    if (serviceDifference) return serviceDifference;
    const timeDifference = new Date(lastServed.get(a.key) || 0) - new Date(lastServed.get(b.key) || 0);
    if (timeDifference) return timeDifference;
    return a.key.localeCompare(b.key);
  });
  for (const group of orderedGroups) {
    group.items.sort((a, b) => {
      const priority = effectivePriority(b, { now }) - effectivePriority(a, { now });
      if (priority) return priority;
      const available = new Date(a.availableAt || a.nextAttemptAt || a.createdAt || 0) - new Date(b.availableAt || b.nextAttemptAt || b.createdAt || 0);
      if (available) return available;
      return idOf(a).localeCompare(idOf(b));
    });
  }
  const result = [];
  while (orderedGroups.some((group) => group.items.length)) {
    for (const group of orderedGroups) {
      const boundedQuantum = Math.min(4, Math.max(1, Math.ceil(group.weight / 25)));
      result.push(...group.items.splice(0, boundedQuantum));
    }
  }
  return result;
}

function selectFairCandidate(items = [], options = {}) {
  return fairSchedule(items, options)[0] || null;
}

function severityForThreshold(value, thresholds) {
  if (value >= thresholds.shedding) return 4;
  if (value >= thresholds.saturated) return 3;
  if (value >= thresholds.elevated) return 2;
  return 1;
}

function calculateBackpressure(signals = {}, thresholdInput = DEFAULT_BACKPRESSURE_THRESHOLDS) {
  const thresholds = { ...DEFAULT_BACKPRESSURE_THRESHOLDS, ...thresholdInput };
  if (signals.paused === true) return 'paused';
  let severity = 1;
  severity = Math.max(severity, severityForThreshold(Math.max(0, Number(signals.queueDepth || 0)), {
    elevated: thresholds.elevatedQueueDepth, saturated: thresholds.saturatedQueueDepth, shedding: thresholds.sheddingQueueDepth,
  }));
  severity = Math.max(severity, severityForThreshold(Math.max(0, Number(signals.oldestQueueAgeMs || 0)), {
    elevated: thresholds.elevatedOldestAgeMs, saturated: thresholds.saturatedOldestAgeMs, shedding: thresholds.sheddingOldestAgeMs,
  }));
  severity = Math.max(severity, severityForThreshold(Math.max(0, Number(signals.workerUtilizationBasisPoints || 0)), {
    elevated: thresholds.elevatedUtilizationBasisPoints, saturated: thresholds.saturatedUtilizationBasisPoints, shedding: thresholds.sheddingUtilizationBasisPoints,
  }));
  severity = Math.max(severity, severityForThreshold(Math.max(0, Number(signals.leaseExpiryRateBasisPoints || 0)), {
    elevated: thresholds.elevatedLeaseExpiryRateBasisPoints, saturated: thresholds.saturatedLeaseExpiryRateBasisPoints, shedding: thresholds.sheddingLeaseExpiryRateBasisPoints,
  }));
  const databasePressure = DATABASE_PRESSURE_CATEGORIES.includes(signals.databasePressureCategory) ? signals.databasePressureCategory : 'healthy';
  if (databasePressure === 'unavailable') severity = Math.max(severity, 4);
  if (databasePressure === 'degraded') severity = Math.max(severity, 3);
  if (databasePressure === 'elevated') severity = Math.max(severity, 2);
  return ({ 1: 'normal', 2: 'elevated', 3: 'saturated', 4: 'shedding' })[severity];
}

function loadSheddingDecision(input = {}) {
  const state = enumValue(input.backpressureState, BACKPRESSURE_STATES, 'backpressureState', 'normal');
  const priorityClass = enumValue(input.priorityClass, PRIORITY_CLASSES, 'priorityClass', 'standard');
  const admissionClass = enumValue(input.admissionClass, ADMISSION_CLASSES, 'admissionClass', 'standard');
  const protectedWork = admissionClass === 'protected' || priorityClass === 'critical_recovery';
  if (state === 'paused') {
    return protectedWork && input.controlOperation === true
      ? { action: 'accept_reserved', code: 'PROTECTED_CONTROL_CAPACITY' }
      : { action: 'reject', code: 'SYSTEM_CAPACITY_PAUSED', httpStatus: 503, retryable: true };
  }
  if (state === 'shedding') {
    return protectedWork
      ? { action: 'accept_reserved', code: 'PROTECTED_CAPACITY_USED' }
      : { action: 'reject', code: 'SYSTEM_OVER_CAPACITY', httpStatus: 503, retryable: true };
  }
  if (state === 'saturated') {
    if (protectedWork) return { action: 'accept_reserved', code: 'PROTECTED_CAPACITY_USED' };
    if (priorityClass === 'maintenance') return { action: 'reject', code: 'WORKER_POOL_SATURATED', httpStatus: 503, retryable: true };
    if (priorityClass === 'low' || input.overloadBehavior === 'defer') return { action: 'defer', code: 'ORCHESTRATION_ADMISSION_DEFERRED', httpStatus: 202, retryable: true };
    if (input.overloadBehavior === 'approval_required') return { action: 'approval_required', code: 'OVERLOAD_BYPASS_APPROVAL_REQUIRED', httpStatus: 202, retryable: false };
    return { action: 'reject', code: 'WORKER_POOL_SATURATED', httpStatus: 503, retryable: true };
  }
  if (state === 'elevated' && ['low', 'maintenance'].includes(priorityClass)) {
    return priorityClass === 'maintenance'
      ? { action: 'reject', code: 'OPTIONAL_MAINTENANCE_PAUSED', httpStatus: 503, retryable: true }
      : { action: 'defer', code: 'ORCHESTRATION_ADMISSION_DEFERRED', httpStatus: 202, retryable: true };
  }
  return { action: 'accept', code: 'CAPACITY_AVAILABLE', httpStatus: 201, retryable: false };
}

function protectedCapacity(input = {}) {
  const totalSlots = boundedInteger(input.totalSlots, 'totalSlots', 0, 1_000_000, 0);
  const configured = boundedInteger(input.reservedSlots, 'reservedSlots', 0, PRODUCTION_SCALE_LIMITS.maximumReservedSlots, 0);
  const reservedSlots = Math.min(totalSlots, configured);
  const usedReservedSlots = Math.min(reservedSlots, Math.max(0, Number(input.usedReservedSlots || 0)));
  return {
    reservedSlots,
    usedReservedSlots,
    availableReservedSlots: reservedSlots - usedReservedSlots,
    protectedQueueDepth: Math.max(0, Number(input.protectedQueueDepth || 0)),
  };
}

function estimateCapacity(input = {}) {
  const workers = Array.isArray(input.workers) ? input.workers : [];
  const currentExecutionSlots = workers
    .filter((worker) => ['active', 'idle', 'draining'].includes(worker.status))
    .reduce((total, worker) => total + Math.max(0, Number(worker.maximumConcurrency || 0)), 0);
  const currentlyUsedSlots = workers.reduce((total, worker) => total + Math.max(0, Number(worker.activeClaimCount || 0)), 0);
  const reserved = protectedCapacity({
    totalSlots: currentExecutionSlots,
    reservedSlots: input.reservedSlots,
    usedReservedSlots: input.usedReservedSlots,
    protectedQueueDepth: input.protectedQueueDepth,
  });
  const queueDepth = Math.max(0, Number(input.queueDepth || 0));
  const completionRatePerMinute = Math.max(0, Number(input.completionRatePerMinute || 0));
  const estimatedDrainTimeMs = queueDepth === 0 ? 0 : completionRatePerMinute > 0 ? Math.ceil((queueDepth / completionRatePerMinute) * 60_000) : null;
  const utilizationBasisPoints = currentExecutionSlots
    ? Math.min(10_000, Math.round((currentlyUsedSlots / currentExecutionSlots) * 10_000))
    : 0;
  return {
    estimate: true,
    currentExecutionSlots,
    currentlyUsedSlots,
    availableSlots: Math.max(0, currentExecutionSlots - currentlyUsedSlots),
    ...reserved,
    queueDepth,
    incomingWorkRatePerMinute: Math.max(0, Number(input.incomingWorkRatePerMinute || 0)),
    completionRatePerMinute,
    estimatedDrainTimeMs,
    utilizationBasisPoints,
    saturationCategory: currentExecutionSlots === 0 && queueDepth > 0 ? 'unavailable' : utilizationBasisPoints >= 9_000 ? 'saturated' : utilizationBasisPoints >= 7_500 ? 'elevated' : 'normal',
  };
}

function autoscalingRecommendation(input = {}) {
  const state = BACKPRESSURE_STATES.includes(input.backpressureState) ? input.backpressureState : 'normal';
  const capacity = input.capacity || estimateCapacity(input);
  let recommendation = 'hold';
  const safeReasonCodes = [];
  if (input.databasePressureCategory === 'unavailable' || input.databasePressureCategory === 'degraded') {
    recommendation = 'investigate';
    safeReasonCodes.push('DATABASE_PRESSURE_HIGH');
  } else if (['saturated', 'shedding'].includes(state) || capacity.saturationCategory === 'saturated' || Number(capacity.queueDepth) > Math.max(10, Number(capacity.currentExecutionSlots) * 25)) {
    recommendation = 'scale_up';
    safeReasonCodes.push('QUEUE_OR_UTILIZATION_HIGH');
  } else if (state === 'normal' && capacity.utilizationBasisPoints < 2_500 && Number(capacity.queueDepth) <= Math.max(1, Number(capacity.currentExecutionSlots) * 2)) {
    recommendation = 'scale_down';
    safeReasonCodes.push('SUSTAINED_CAPACITY_AVAILABLE');
  } else safeReasonCodes.push('CAPACITY_WITHIN_TARGET');
  return { recommendation: enumValue(recommendation, AUTOSCALING_RECOMMENDATIONS, 'recommendation'), safeReasonCodes, providerNeutral: true };
}

function databasePressureCategory(input = {}) {
  if (input.available === false) return 'unavailable';
  const latency = Math.max(0, Number(input.queryLatencyMs || 0));
  const pool = Math.max(0, Number(input.connectionPoolUsageBasisPoints || 0));
  const failures = Math.max(0, Number(input.timeoutCount || 0) + Number(input.writeConflictCount || 0) + Number(input.transactionRetryCount || 0));
  if (latency >= 2_000 || pool >= 9_500 || failures >= 100) return 'degraded';
  if (latency >= 500 || pool >= 8_000 || failures >= 20) return 'elevated';
  return 'healthy';
}

function metricLabelsAreBounded(snapshot = {}) {
  const forbidden = /(run.?id|node.?id|tenant.?id|organization.?id|workspace.?id|passport.?id|connection.?id|worker.?id|partition.?key|trace.?id|request.?id)/i;
  const keys = [
    ...Object.keys(snapshot.counters || {}),
    ...Object.keys(snapshot.gauges || {}),
    ...Object.keys(snapshot.histograms || {}),
  ];
  const unsafeLabels = keys.filter((key) => forbidden.test(key));
  return { safe: unsafeLabels.length === 0, unsafeLabels };
}

function normalizeQuotaPolicy(input = {}, current = {}) {
  assertNoSensitiveData(input);
  const source = { ...DEFAULT_QUOTA_POLICY, ...current, ...input };
  const result = {
    name: String(source.name || 'Default workload quota').trim().slice(0, 120),
    description: String(source.description || '').trim().slice(0, 1_000),
    version: boundedInteger(source.version, 'version', 1, 1_000_000, 1),
    status: enumValue(source.status, ['draft', 'active', 'archived'], 'status', 'draft'),
    overloadBehavior: enumValue(source.overloadBehavior, ['reject', 'defer', 'approval_required'], 'overloadBehavior', 'reject'),
  };
  for (const field of [
    'maximumQueuedRuns', 'maximumActiveRuns', 'maximumQueuedNodes', 'maximumActiveNodes',
    'maximumConcurrentInvocations', 'maximumConcurrentCompensations', 'maximumConcurrentRecoveries',
    'maximumRunsPerMinute', 'maximumInvocationsPerMinute', 'maximumRetriesPerMinute',
  ]) result[field] = boundedInteger(source[field], field, 1, PRODUCTION_SCALE_LIMITS.maximumQuota, DEFAULT_QUOTA_POLICY[field]);
  result.maximumQueueBytesEstimate = boundedInteger(source.maximumQueueBytesEstimate, 'maximumQueueBytesEstimate', 1, PRODUCTION_SCALE_LIMITS.maximumQueueBytes, DEFAULT_QUOTA_POLICY.maximumQueueBytesEstimate);
  result.maximumPayloadBytesPerJob = boundedInteger(source.maximumPayloadBytesPerJob, 'maximumPayloadBytesPerJob', 1, PRODUCTION_SCALE_LIMITS.maximumPayloadBytes, DEFAULT_QUOTA_POLICY.maximumPayloadBytesPerJob);
  result.tenantWeight = boundedInteger(source.tenantWeight, 'tenantWeight', 1, PRODUCTION_SCALE_LIMITS.maximumTenantWeight, 1);
  result.workspaceWeight = boundedInteger(source.workspaceWeight, 'workspaceWeight', 1, PRODUCTION_SCALE_LIMITS.maximumTenantWeight, 1);
  result.burstCapacity = boundedInteger(source.burstCapacity, 'burstCapacity', 0, 100_000, 0);
  result.burstWindowMs = boundedInteger(source.burstWindowMs, 'burstWindowMs', 1_000, 3_600_000, 60_000);
  return result;
}

function validateQuotaPolicy(input = {}) {
  try {
    const policy = normalizeQuotaPolicy(input, {});
    if (policy.maximumActiveRuns > policy.maximumQueuedRuns + policy.burstCapacity) {
      throw validationError('maximumActiveRuns', 'maximumActiveRuns must not exceed queued run capacity plus bounded burst capacity.');
    }
    if (policy.maximumActiveNodes > policy.maximumQueuedNodes + policy.burstCapacity) {
      throw validationError('maximumActiveNodes', 'maximumActiveNodes must not exceed queued node capacity plus bounded burst capacity.');
    }
    return { valid: true, safeReasonCodes: [], policy };
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    return { valid: false, safeReasonCodes: ['QUOTA_POLICY_INVALID'], errors: error.details || [] };
  }
}

function evaluateAdmissionOutcome(input = {}) {
  const priorityClass = enumValue(input.priorityClass, PRIORITY_CLASSES, 'priorityClass', 'standard');
  const admissionClass = enumValue(input.admissionClass, ADMISSION_CLASSES, 'admissionClass', 'standard');
  if (input.operationalAllowed === false) {
    return { decision: 'rejected_operational_state', safeReasonCodes: [safeReasonCode(input.operationalReasonCode, 'OPERATIONAL_STATE_BLOCKED')], httpStatus: 409 };
  }
  if (Number(input.payloadBytesEstimate || 0) > Number(input.policy?.maximumPayloadBytesPerJob || DEFAULT_QUOTA_POLICY.maximumPayloadBytesPerJob)) {
    return { decision: 'rejected_quota', safeReasonCodes: ['WORKLOAD_PAYLOAD_QUOTA_EXCEEDED'], httpStatus: 429 };
  }
  if (Number(input.tenantQueuedCount || 0) >= Number(input.tenantMaximumQueuedRuns || input.policy?.maximumQueuedRuns || DEFAULT_QUOTA_POLICY.maximumQueuedRuns)) {
    return { decision: 'rejected_quota', safeReasonCodes: ['TENANT_QUEUE_QUOTA_EXCEEDED'], httpStatus: 429 };
  }
  if (Number(input.workspaceQueuedCount || 0) >= Number(input.workspaceMaximumQueuedRuns || input.policy?.maximumQueuedRuns || DEFAULT_QUOTA_POLICY.maximumQueuedRuns)) {
    return { decision: 'rejected_quota', safeReasonCodes: ['WORKSPACE_QUEUE_QUOTA_EXCEEDED'], httpStatus: 429 };
  }
  if (Number(input.tenantActiveCount || 0) >= Number(input.tenantMaximumActiveRuns || input.policy?.maximumActiveRuns || DEFAULT_QUOTA_POLICY.maximumActiveRuns)) {
    return { decision: 'rejected_quota', safeReasonCodes: ['TENANT_ACTIVE_RUN_QUOTA_EXCEEDED'], httpStatus: 429 };
  }
  if (Number(input.workspaceActiveCount || 0) >= Number(input.workspaceMaximumActiveRuns || input.policy?.maximumActiveRuns || DEFAULT_QUOTA_POLICY.maximumActiveRuns)) {
    return { decision: 'rejected_quota', safeReasonCodes: ['WORKSPACE_ACTIVE_RUN_QUOTA_EXCEEDED'], httpStatus: 429 };
  }
  const databaseProtectionUsed =
    (input.databasePressureCategory === 'unavailable' || input.databasePressureCategory === 'degraded') &&
    (admissionClass === 'protected' || priorityClass === 'critical_recovery');
  if (input.databasePressureCategory === 'unavailable' || input.databasePressureCategory === 'degraded') {
    if (!(admissionClass === 'protected' || priorityClass === 'critical_recovery')) {
      return { decision: 'rejected_capacity', safeReasonCodes: ['DATABASE_PRESSURE_HIGH'], httpStatus: 503 };
    }
    if (input.protectedCapacityAvailable === false) {
      return { decision: 'rejected_capacity', safeReasonCodes: ['PROTECTED_CAPACITY_EXHAUSTED'], httpStatus: 503 };
    }
  }
  const shedding = loadSheddingDecision({
    backpressureState: input.backpressureState,
    priorityClass,
    admissionClass,
    overloadBehavior: input.policy?.overloadBehavior,
    controlOperation: input.controlOperation,
  });
  if (shedding.action === 'accept_reserved' && input.protectedCapacityAvailable === false) {
    return { decision: 'rejected_capacity', safeReasonCodes: ['PROTECTED_CAPACITY_EXHAUSTED'], httpStatus: 503 };
  }
  if (shedding.action === 'reject') return { decision: 'rejected_capacity', safeReasonCodes: [shedding.code], httpStatus: shedding.httpStatus };
  if (shedding.action === 'defer') return { decision: 'accepted_deferred', safeReasonCodes: [shedding.code], httpStatus: 202 };
  if (shedding.action === 'approval_required') return { decision: 'approval_required', safeReasonCodes: [shedding.code], httpStatus: 202 };
  return {
    decision: 'accepted',
    safeReasonCodes: [databaseProtectionUsed ? 'PROTECTED_CAPACITY_USED' : shedding.code],
    httpStatus: 201,
    protectedCapacityUsed: databaseProtectionUsed || shedding.action === 'accept_reserved',
  };
}

function actorFor(scope, caller = {}) {
  if (scope.trustedSystem) {
    return { type: 'system', id: scope.actorId, actorId: scope.actorId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, trustedSystem: true, skipPersistentRoles: true };
  }
  const partnerId = caller.partner?._id;
  return {
    type: 'service_account',
    id: partnerId ? `partner:${idOf(partnerId)}` : scope.actorId,
    actorId: scope.actorId,
    partnerId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  };
}

function scopeFrom(input = {}, caller = {}, options = {}) {
  const partnerId = idOf(caller.partner?._id);
  const organizationId = safeIdentifier(input.organizationId || partnerId || options.organizationId, 'organizationId');
  if (!options.trustedSystem && partnerId && organizationId !== partnerId) {
    throw new AppError(403, ErrorCodes.AUTHORIZATION_DENIED, 'Authorization denied.');
  }
  const workspaceId = safeIdentifier(input.workspaceId || input.receivingWorkspaceId || options.workspaceId, 'workspaceId', { required: options.workspaceRequired !== false });
  return {
    organizationId,
    workspaceId,
    actorId: String(options.trustedSystem ? 'system:production-scale' : `partner:${partnerId}`).slice(0, 200),
    actorType: options.trustedSystem ? 'system' : 'partner',
    requestId: safeIdentifier(caller.requestId || input.requestId || `req_${crypto.randomUUID()}`, 'requestId', { maximum: 128 }),
    traceId: safeIdentifier(caller.traceId || input.traceId || `trace_${crypto.randomUUID()}`, 'traceId', { maximum: 128 }),
    trustedSystem: options.trustedSystem === true,
  };
}

function resource(type, value, scope) {
  return { type, id: idOf(value), organizationId: scope.organizationId, workspaceId: scope.workspaceId };
}

async function authorize(permission, type, value, scope, caller, context = {}) {
  return assertAuthorized(actorFor(scope, caller), permission, resource(type, value, scope), {
    requestId: scope.requestId,
    traceId: scope.traceId,
    trustedSystem: scope.trustedSystem,
    productionScale: context,
  });
}

async function audit(action, type, value, scope, metadata = {}) {
  return createAuditLog(scope.actorType, scope.actorId, action, type, idOf(value), {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    ...metadata,
  }, { requestId: scope.requestId, traceId: scope.traceId });
}

function productionScaleDependencies(overrides = {}) {
  return {
    QueuePartition,
    WorkerRegistration,
    WorkloadAdmissionDecision,
    WorkloadBackpressureState,
    WorkloadDeadLetter,
    WorkloadQuotaPolicy,
    WorkloadQuotaReservation,
    WorkloadScaleConfiguration,
    OrchestrationDefinition,
    OrchestrationRun,
    OrchestrationNodeRun,
    OrchestrationCompensationRun,
    RuntimeWorkItem,
    readDatabasePressureCategory: () => mongoose.connection.readyState === 1 ? 'healthy' : 'unavailable',
    assertOperationalAccess,
    authorize,
    audit,
    ...overrides,
  };
}

function duplicateKey(error) {
  return error?.code === 11000 || error?.name === 'MongoServerError' && error?.code === 11000;
}

function scopeKey(scope) {
  return scope.workspaceId ? `organization:${scope.organizationId}:workspace:${scope.workspaceId}` : `organization:${scope.organizationId}`;
}

async function activeConfiguration(scope, dependencies) {
  const keys = [scopeKey(scope), `organization:${scope.organizationId}`, 'platform'];
  const record = await dependencies.WorkloadScaleConfiguration.findOne({ scopeKey: { $in: keys }, status: 'active' }).sort({ workspaceId: -1, organizationId: -1, version: -1 }).lean();
  return record ? normalizeScaleConfiguration(record) : defaultScaleConfiguration(scopeKey(scope));
}

async function resolveWorkloadRoute(input = {}, options = {}) {
  const dependencies = productionScaleDependencies(options.dependencies);
  const scope = {
    organizationId: safeIdentifier(input.organizationId, 'organizationId'),
    workspaceId: safeIdentifier(input.workspaceId, 'workspaceId'),
  };
  const configuration = await activeConfiguration(scope, dependencies);
  const route = routeWorkload(input, configuration);
  await dependencies.QueuePartition.updateOne(
    { workloadCategory: route.workloadCategory, routingVersion: route.routingVersion, partitionNumber: route.partitionNumber },
    { $setOnInsert: {
      partitionKey: route.partitionKey,
      workloadCategory: route.workloadCategory,
      routingVersion: route.routingVersion,
      partitionNumber: route.partitionNumber,
      status: 'active',
      ownershipEpoch: 0,
      queuedCountEstimate: 0,
      activeCountEstimate: 0,
    } },
    { upsert: true, runValidators: true },
  );
  return route;
}

async function activeQuotaPolicies(scope, dependencies) {
  const policies = await dependencies.WorkloadQuotaPolicy.find({
    organizationId: scope.organizationId,
    status: 'active',
    $or: [{ workspaceId: scope.workspaceId }, { workspaceId: { $exists: false } }, { workspaceId: null }, { workspaceId: '' }],
  }).sort({ workspaceId: -1, version: -1 }).lean();
  const workspacePolicy = policies.find((policy) => policy.workspaceId === scope.workspaceId);
  const tenantPolicy = policies.find((policy) => !policy.workspaceId);
  const selected = workspacePolicy || tenantPolicy;
  return {
    selected: selected ? normalizeQuotaPolicy(selected, selected) : { ...DEFAULT_QUOTA_POLICY, name: 'Default workload quota', version: 1, status: 'active' },
    selectedRecord: selected,
    tenant: tenantPolicy ? normalizeQuotaPolicy(tenantPolicy, tenantPolicy) : { ...DEFAULT_QUOTA_POLICY },
    workspace: workspacePolicy ? normalizeQuotaPolicy(workspacePolicy, workspacePolicy) : (tenantPolicy ? normalizeQuotaPolicy(tenantPolicy, tenantPolicy) : { ...DEFAULT_QUOTA_POLICY }),
  };
}

async function quotaUsage(scope, dependencies) {
  const [tenantQueuedCount, workspaceQueuedCount, tenantActiveCount, workspaceActiveCount] = await Promise.all([
    dependencies.WorkloadQuotaReservation.countDocuments({ organizationId: scope.organizationId, reservationType: 'queued_run', status: { $in: ACTIVE_RESERVATION_STATUSES } }),
    dependencies.WorkloadQuotaReservation.countDocuments({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, reservationType: 'queued_run', status: { $in: ACTIVE_RESERVATION_STATUSES } }),
    dependencies.OrchestrationRun.countDocuments({ organizationId: scope.organizationId, status: { $in: ACTIVE_RUN_STATUSES } }),
    dependencies.OrchestrationRun.countDocuments({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, status: { $in: ACTIVE_RUN_STATUSES } }),
  ]);
  return { tenantQueuedCount, workspaceQueuedCount, tenantActiveCount, workspaceActiveCount };
}

async function firstFreeSlot(Model, filter, field, maximum) {
  const occupied = await Model.distinct(field, { ...filter, status: { $in: ACTIVE_RESERVATION_STATUSES } });
  const used = new Set(occupied.map(Number));
  for (let slot = 1; slot <= maximum; slot += 1) if (!used.has(slot)) return slot;
  return null;
}

async function reserveQuota(input = {}, options = {}) {
  const dependencies = productionScaleDependencies(options.dependencies);
  const scope = input.scope;
  const idempotencyKey = String(input.idempotencyKey || '');
  if (!/^sha256:[a-f0-9]{64}$/.test(idempotencyKey)) throw validationError('idempotencyKey', 'idempotencyKey must be a safe SHA-256 digest.');
  const existing = await dependencies.WorkloadQuotaReservation.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, idempotencyKey });
  if (existing) return { reservation: existing, replayed: true };
  const tenantMaximum = boundedInteger(input.tenantMaximum, 'tenantMaximum', 1, PRODUCTION_SCALE_LIMITS.maximumQuota);
  const workspaceMaximum = boundedInteger(input.workspaceMaximum, 'workspaceMaximum', 1, PRODUCTION_SCALE_LIMITS.maximumQuota);
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const [tenantSlotNumber, workspaceSlotNumber] = await Promise.all([
      firstFreeSlot(dependencies.WorkloadQuotaReservation, { organizationId: scope.organizationId, reservationType: input.reservationType }, 'tenantSlotNumber', tenantMaximum),
      firstFreeSlot(dependencies.WorkloadQuotaReservation, { organizationId: scope.organizationId, workspaceId: scope.workspaceId, reservationType: input.reservationType }, 'workspaceSlotNumber', workspaceMaximum),
    ]);
    if (!tenantSlotNumber) {
      scaleMetrics.increment('production_scale_quota_rejections', { safeReasonCode: 'TENANT_QUEUE_QUOTA_EXCEEDED' });
      throw new AppError(429, 'TENANT_QUEUE_QUOTA_EXCEEDED', 'Tenant workload quota is exhausted.', [], { retryable: true });
    }
    if (!workspaceSlotNumber) {
      scaleMetrics.increment('production_scale_quota_rejections', { safeReasonCode: 'WORKSPACE_QUEUE_QUOTA_EXCEEDED' });
      throw new AppError(429, 'WORKSPACE_QUEUE_QUOTA_EXCEEDED', 'Workspace workload quota is exhausted.', [], { retryable: true });
    }
    try {
      const reservation = await dependencies.WorkloadQuotaReservation.create({
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        reservationType: input.reservationType,
        workloadCategory: input.workloadCategory,
        quotaPolicyId: input.quotaPolicyId,
        quotaPolicyVersion: input.quotaPolicyVersion,
        tenantSlotNumber,
        workspaceSlotNumber,
        orchestrationRunId: input.orchestrationRunId,
        nodeRunId: input.nodeRunId,
        units: 1,
        status: 'reserved',
        idempotencyKey,
        expiresAt: input.expiresAt || new Date(Date.now() + 30 * 60_000),
      });
      scaleMetrics.increment('production_scale_quota_reservations', { workloadCategory: input.workloadCategory, status: 'reserved' });
      return { reservation, replayed: false };
    } catch (error) {
      if (!duplicateKey(error)) throw error;
      const replay = await dependencies.WorkloadQuotaReservation.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, idempotencyKey });
      if (replay) return { reservation: replay, replayed: true };
    }
  }
  scaleMetrics.increment('production_scale_quota_rejections', { safeReasonCode: 'QUOTA_RESERVATION_CONFLICT' });
  throw new AppError(503, 'QUOTA_RESERVATION_CONFLICT', 'Quota reservation is temporarily contended.', [], { retryable: true, retryAfterMs: 250 });
}

async function releaseQuotaReservation(reservationId, input = {}, options = {}) {
  const dependencies = productionScaleDependencies(options.dependencies);
  const now = options.now || new Date();
  const updated = await dependencies.WorkloadQuotaReservation.findOneAndUpdate(
    { _id: reservationId, status: { $in: ACTIVE_RESERVATION_STATUSES } },
    { $set: { status: input.status === 'expired' ? 'expired' : 'released', ...(input.status === 'expired' ? { expiredAt: now } : { releasedAt: now }) } },
    { new: true, runValidators: true },
  );
  if (updated) {
    scaleMetrics.increment('production_scale_quota_reservations', { workloadCategory: updated.workloadCategory, status: updated.status });
    if (input.scope) {
      await dependencies.audit('production_scale.quota.released', 'WorkloadQuotaReservation', updated, input.scope, {
        workloadCategory: updated.workloadCategory,
        status: updated.status,
      });
    }
  }
  return updated;
}

async function consumeQuotaReservation(reservationId, options = {}) {
  const dependencies = productionScaleDependencies(options.dependencies);
  return dependencies.WorkloadQuotaReservation.findOneAndUpdate(
    { _id: reservationId, status: 'reserved', expiresAt: { $gt: options.now || new Date() } },
    { $set: { status: 'consumed', consumedAt: options.now || new Date() } },
    { new: true, runValidators: true },
  );
}

async function recoverExpiredQuotaReservations(input = {}, options = {}) {
  const dependencies = productionScaleDependencies(options.dependencies);
  const now = options.now || new Date();
  const result = await dependencies.WorkloadQuotaReservation.updateMany(
    { status: 'reserved', expiresAt: { $lte: now } },
    { $set: { status: 'expired', expiredAt: now } },
  );
  if (result.modifiedCount) scaleMetrics.increment('production_scale_quota_reservations', { status: 'expired' }, result.modifiedCount);
  return { expired: result.modifiedCount || 0 };
}

async function currentBackpressure(scope, workerPool, configuration, dependencies) {
  const key = scopeKey(scope);
  const previous = await dependencies.WorkloadBackpressureState.findOne({ scopeKey: key, workerPool }).lean();
  const now = new Date();
  if (previous?.evaluatedAt && now - new Date(previous.evaluatedAt) < 15_000) return previous;
  const categories = WORKLOAD_CATEGORIES.filter((category) => WORKLOAD_DEFINITIONS[category].workerPool === workerPool);
  const tenant = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  const nodeFilter = { ...tenant, workloadCategory: { $in: categories }, status: { $in: ['blocked', 'ready', 'queued', 'retry_wait', 'waiting_approval', 'recovery_pending', 'compensation_pending'] } };
  const compensationFilter = { ...tenant, workloadCategory: { $in: categories }, status: { $in: ['pending', 'queued', 'retry_wait', 'waiting_approval', 'waiting_intervention'] } };
  const runtimeFilter = { organizationId: scope.organizationId, receivingWorkspaceId: scope.workspaceId, workloadCategory: { $in: categories }, status: { $in: ['pending', 'waiting_for_approval', 'blocked', 'retry_preparing', 'retry_scheduled'] } };
  const [nodeCount, compensationCount, runtimeCount, oldestNode, oldestCompensation, oldestRuntime, workers] = await Promise.all([
    dependencies.OrchestrationNodeRun.countDocuments(nodeFilter),
    dependencies.OrchestrationCompensationRun?.countDocuments(compensationFilter) || 0,
    dependencies.RuntimeWorkItem.countDocuments(runtimeFilter),
    dependencies.OrchestrationNodeRun.findOne(nodeFilter).sort({ createdAt: 1 }).select('createdAt').lean(),
    dependencies.OrchestrationCompensationRun?.findOne(compensationFilter).sort({ createdAt: 1 }).select('createdAt').lean() || null,
    dependencies.RuntimeWorkItem.findOne(runtimeFilter).sort({ createdAt: 1 }).select('createdAt').lean(),
    dependencies.WorkerRegistration.find({ workerPool, status: { $in: ['active', 'idle', 'draining'] } }).select('maximumConcurrency activeClaimCount').lean(),
  ]);
  const queueDepth = Number(nodeCount || 0) + Number(compensationCount || 0) + Number(runtimeCount || 0);
  const oldestAt = [oldestNode?.createdAt, oldestCompensation?.createdAt, oldestRuntime?.createdAt]
    .filter(Boolean)
    .map((value) => new Date(value))
    .sort((left, right) => left - right)[0];
  const totalSlots = workers.reduce((sum, worker) => sum + Number(worker.maximumConcurrency || 0), 0);
  const usedSlots = workers.reduce((sum, worker) => sum + Number(worker.activeClaimCount || 0), 0);
  const databaseCategory = enumValue(
    typeof dependencies.readDatabasePressureCategory === 'function'
      ? await dependencies.readDatabasePressureCategory()
      : dependencies.readDatabasePressureCategory,
    DATABASE_PRESSURE_CATEGORIES,
    'databasePressureCategory',
    'healthy',
  );
  const signals = {
    queueDepth,
    oldestQueueAgeMs: oldestAt ? Math.max(0, now - oldestAt) : 0,
    workerUtilizationBasisPoints: totalSlots ? Math.min(10_000, Math.round(usedSlots / totalSlots * 10_000)) : queueDepth ? 10_000 : 0,
    databasePressureCategory: databaseCategory,
    leaseExpiryRateBasisPoints: Number(previous?.leaseExpiryRateBasisPoints || 0),
  };
  const state = calculateBackpressure(signals, configuration.backpressureThresholds);
  const record = await dependencies.WorkloadBackpressureState.findOneAndUpdate(
    { scopeKey: key, workerPool },
    { $set: {
      state,
      ...signals,
      claimLatencyCategory: previous?.claimLatencyCategory || 'unknown',
      completionThroughput: Number(previous?.completionThroughput || 0),
      failureRateBasisPoints: Number(previous?.failureRateBasisPoints || 0),
      retryRateBasisPoints: Number(previous?.retryRateBasisPoints || 0),
      sloBurnRateCategory: previous?.sloBurnRateCategory || 'unknown',
      configurationVersion: configuration.version || 1,
      evaluatedAt: now,
    } },
    { upsert: true, new: true, runValidators: true },
  );
  if (previous?.state && previous.state !== state) {
    await dependencies.audit(`production_scale.backpressure.${state === 'normal' ? 'recovered' : state}`, 'WorkloadBackpressureState', `${key}:${workerPool}`, scope, { workerPool, loadCategory: state });
  }
  scaleMetrics.gauge('production_scale_backpressure_state', { workerPool, loadCategory: state }, BACKPRESSURE_STATES.indexOf(state));
  return plain(record);
}

async function evaluateAdmission(input = {}, caller = {}, options = {}) {
  assertNoSensitiveData(input);
  const dependencies = productionScaleDependencies(options.dependencies);
  const scope = scopeFrom(input, caller, { trustedSystem: options.trustedSystem });
  if (!scope.trustedSystem) await dependencies.authorize('workloadAdmission.evaluate', 'WorkloadAdmissionDecision', null, scope, caller, { requestedOperationalAction: 'admission_evaluate', workloadCategory: input.workloadCategory });
  let operationalAllowed = true;
  let operationalReasonCode;
  try {
    await dependencies.assertOperationalAccess({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, operation: 'QUEUE_SUBMISSION' });
  } catch (error) {
    operationalAllowed = false;
    operationalReasonCode = error.code;
  }
  const workloadCategory = enumValue(input.workloadCategory, WORKLOAD_CATEGORIES, 'workloadCategory', 'orchestration_node');
  const priorityClass = enumValue(input.priorityClass, PRIORITY_CLASSES, 'priorityClass', WORKLOAD_DEFINITIONS[workloadCategory].defaultPriority);
  const admissionClass = enumValue(input.admissionClass, ADMISSION_CLASSES, 'admissionClass', priorityClass === 'critical_recovery' ? 'protected' : 'standard');
  const [configuration, policies, usage] = await Promise.all([
    activeConfiguration(scope, dependencies),
    activeQuotaPolicies(scope, dependencies),
    quotaUsage(scope, dependencies),
  ]);
  const backpressure = await currentBackpressure(scope, WORKLOAD_DEFINITIONS[workloadCategory].workerPool, configuration, dependencies);
  let protectedCapacityAvailable = true;
  if (admissionClass === 'protected' || priorityClass === 'critical_recovery') {
    if (!scope.trustedSystem) {
      await dependencies.authorize('workloadAdmission.evaluate', 'WorkloadAdmissionDecision', null, scope, caller, {
        requestedOperationalAction: 'protected_capacity_use',
        workloadCategory,
        priorityClass,
        admissionClass,
        queueDepthCategory: backpressure.state,
        databasePressureCategory: backpressure.databasePressureCategory,
      });
    }
    const configuredReserved = Math.min(
      Number(configuration.reservedCapacityByCategory?.[workloadCategory] || 0),
      Number(configuration.maximumConcurrencyByCategory?.[workloadCategory] || 0),
    );
    const usedReserved = await dependencies.WorkloadQuotaReservation.countDocuments({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      workloadCategory,
      status: { $in: ACTIVE_RESERVATION_STATUSES },
    });
    protectedCapacityAvailable = configuredReserved > 0 && usedReserved < configuredReserved;
  }
  const outcome = evaluateAdmissionOutcome({
    ...input,
    ...usage,
    policy: policies.selected,
    tenantMaximumQueuedRuns: policies.tenant.maximumQueuedRuns,
    workspaceMaximumQueuedRuns: policies.workspace.maximumQueuedRuns,
    tenantMaximumActiveRuns: policies.tenant.maximumActiveRuns,
    workspaceMaximumActiveRuns: policies.workspace.maximumActiveRuns,
    operationalAllowed,
    operationalReasonCode,
    priorityClass,
    admissionClass,
    backpressureState: backpressure.state,
    databasePressureCategory: backpressure.databasePressureCategory,
    protectedCapacityAvailable,
    controlOperation: scope.trustedSystem && input.controlOperation === true,
  });
  let reservation;
  const idempotencyKey = input.idempotencyKey?.startsWith('sha256:') ? input.idempotencyKey : `sha256:${stableHash(`admission:${scope.organizationId}:${scope.workspaceId}:${input.idempotencyKey || scope.requestId}`)}`;
  if (['accepted', 'accepted_deferred'].includes(outcome.decision)) {
    try {
      const reserved = await reserveQuota({
        scope,
        idempotencyKey,
        reservationType: input.reservationType || 'queued_run',
        workloadCategory,
        tenantMaximum: policies.tenant.maximumQueuedRuns,
        workspaceMaximum: policies.workspace.maximumQueuedRuns,
        quotaPolicyId: policies.selectedRecord?._id,
        quotaPolicyVersion: policies.selected.version,
        orchestrationRunId: input.orchestrationRunId,
        nodeRunId: input.nodeRunId,
        expiresAt: input.reservationExpiresAt,
      }, { dependencies });
      reservation = reserved.reservation;
      if (!reserved.replayed) {
        await dependencies.audit('production_scale.quota.reserved', 'WorkloadQuotaReservation', reservation, scope, {
          workloadCategory,
          status: reservation.status,
          quotaPolicyVersion: policies.selected.version,
        });
      }
    } catch (error) {
      if (!['TENANT_QUEUE_QUOTA_EXCEEDED', 'WORKSPACE_QUEUE_QUOTA_EXCEEDED'].includes(error.code)) throw error;
      await dependencies.audit('production_scale.quota.exceeded', 'WorkloadQuotaReservation', idempotencyKey, scope, {
        workloadCategory,
        safeReasonCode: error.code,
      });
      outcome.decision = 'rejected_quota';
      outcome.safeReasonCodes = [error.code];
      outcome.httpStatus = 429;
    }
  }
  let decision;
  try {
    decision = await dependencies.WorkloadAdmissionDecision.create({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      workloadCategory,
      orchestrationDefinitionId: input.orchestrationDefinitionId,
      orchestrationRunId: input.orchestrationRunId,
      decision: outcome.decision,
      safeReasonCodes: outcome.safeReasonCodes.slice(0, PRODUCTION_SCALE_LIMITS.maximumSafeReasonCodes),
      admissionClass,
      priorityClass,
      ...usage,
      systemLoadCategory: backpressure.state,
      workerCapacityCategory: backpressure.state === 'normal' ? 'available' : backpressure.state === 'elevated' ? 'constrained' : backpressure.state === 'paused' ? 'unavailable' : 'saturated',
      queueAgeCategory: Number(backpressure.oldestQueueAgeMs || 0) >= 900_000 ? 'critical' : Number(backpressure.oldestQueueAgeMs || 0) >= 300_000 ? 'stale' : Number(backpressure.oldestQueueAgeMs || 0) >= 60_000 ? 'aging' : 'fresh',
      quotaPolicyId: policies.selectedRecord?._id,
      quotaPolicyVersion: policies.selected.version,
      quotaReservationId: reservation?._id,
      requestId: scope.requestId,
      traceId: scope.traceId,
      requestedBy: scope.actorId,
    });
  } catch (error) {
    if (reservation) await releaseQuotaReservation(reservation._id, { scope }, { dependencies }).catch(() => undefined);
    throw error;
  }
  const auditAction = outcome.decision === 'accepted' ? 'production_scale.admission.accepted' : outcome.decision === 'accepted_deferred' ? 'production_scale.admission.deferred' : 'production_scale.admission.rejected';
  await dependencies.audit(auditAction, 'WorkloadAdmissionDecision', decision, scope, {
    workloadCategory, priorityClass, admissionClass, decision: outcome.decision, safeReasonCodes: outcome.safeReasonCodes,
    routingVersion: activeRoutingVersion(configuration).version,
  });
  scaleMetrics.increment('production_scale_admission_outcomes', {
    workloadCategory,
    outcome: outcome.decision,
    safeReasonCode: outcome.safeReasonCodes[0] || 'ACCEPTED',
    loadCategory: backpressure.state,
  });
  return {
    decisionId: idOf(decision),
    decision: outcome.decision,
    safeReasonCodes: outcome.safeReasonCodes,
    admissionClass,
    priorityClass,
    workloadCategory,
    quotaReservationId: reservation ? idOf(reservation) : undefined,
    routingVersion: activeRoutingVersion(configuration).version,
    httpStatus: outcome.httpStatus,
    retryable: ['rejected_capacity', 'rejected_quota', 'accepted_deferred'].includes(outcome.decision),
    loadCategory: backpressure.state,
  };
}

async function assertAdmissionAccepted(input = {}, caller = {}, options = {}) {
  const result = await evaluateAdmission(input, caller, options);
  if (['accepted', 'accepted_deferred'].includes(result.decision)) return result;
  const code = result.safeReasonCodes[0] || 'SYSTEM_OVER_CAPACITY';
  throw new AppError(result.httpStatus || 503, code, 'Workload admission was not accepted.', [], {
    retryable: result.retryable,
    retryAfterMs: result.retryable ? 1_000 : undefined,
    loadCategory: result.loadCategory,
    decisionId: result.decisionId,
  });
}

async function ensurePartitions(configurationInput, options = {}) {
  const dependencies = productionScaleDependencies(options.dependencies);
  const configuration = normalizeScaleConfiguration(configurationInput);
  let created = 0;
  for (const version of configuration.routingVersions.filter((entry) => entry.status !== 'retired')) {
    for (const category of WORKLOAD_CATEGORIES) {
      const count = version.partitionCountByCategory[category];
      for (let number = 0; number < count; number += 1) {
        const result = await dependencies.QueuePartition.updateOne(
          { workloadCategory: category, routingVersion: version.version, partitionNumber: number },
          { $setOnInsert: {
            partitionKey: partitionKey(category, version.version, number),
            workloadCategory: category,
            partitionNumber: number,
            status: version.status === 'draining' ? 'draining' : 'active',
            routingVersion: version.version,
            ownershipEpoch: 0,
            queuedCountEstimate: 0,
            activeCountEstimate: 0,
          } },
          { upsert: true, runValidators: true },
        );
        if (result.upsertedCount) created += 1;
      }
    }
  }
  return { created, routingVersions: configuration.routingVersions.map((entry) => entry.version) };
}

async function registerWorker(input = {}, options = {}) {
  assertNoSensitiveData(input);
  const dependencies = productionScaleDependencies(options.dependencies);
  const now = options.now || new Date();
  const workerId = safeIdentifier(input.workerId, 'workerId', { maximum: 128 });
  const instanceId = safeIdentifier(input.instanceId, 'instanceId', { maximum: 128 });
  const workerPool = enumValue(input.workerPool, WORKER_POOLS, 'workerPool');
  const supportedWorkloadCategories = [...new Set(input.supportedWorkloadCategories || WORKLOAD_CATEGORIES.filter((category) => WORKLOAD_DEFINITIONS[category].workerPool === workerPool))];
  supportedWorkloadCategories.forEach((category) => {
    enumValue(category, WORKLOAD_CATEGORIES, 'supportedWorkloadCategories');
    if (WORKLOAD_DEFINITIONS[category].workerPool !== workerPool) {
      throw validationError('supportedWorkloadCategories', 'Worker categories must belong to the registered worker pool.');
    }
  });
  const supportedRoutingVersions = [...new Set((input.supportedRoutingVersions || [1]).map((value) => boundedInteger(value, 'supportedRoutingVersions', 1, 1_000)))].sort((a, b) => a - b);
  const maximumConcurrency = boundedInteger(input.maximumConcurrency, 'maximumConcurrency', 1, PRODUCTION_SCALE_LIMITS.maximumWorkerConcurrency, 1);
  const activeClaimCount = boundedInteger(input.activeClaimCount, 'activeClaimCount', 0, maximumConcurrency, 0);
  const status = enumValue(input.status, ['starting', 'active', 'idle', 'draining', 'unhealthy', 'stopped'], 'status', activeClaimCount ? 'active' : 'idle');
  const existing = await dependencies.WorkerRegistration.findOne({ workerId });
  if (existing && existing.instanceId !== instanceId && !['stopped', 'unhealthy'].includes(existing.status)) {
    throw new AppError(409, 'WORKER_IDENTITY_CONFLICT', 'Worker ID is already registered to another live instance.');
  }
  const update = {
    $set: {
      instanceId, workerPool, supportedWorkloadCategories, supportedRoutingVersions,
      status,
      maximumConcurrency, activeClaimCount, availableCapacity: ['draining', 'unhealthy', 'stopped'].includes(status) ? 0 : maximumConcurrency - activeClaimCount,
      heartbeatAt: now, softwareVersion: input.softwareVersion, protocolVersion: input.protocolVersion || '1',
      safeRegion: input.safeRegion, safeZone: input.safeZone,
      ...(status === 'draining' ? { drainRequestedAt: existing?.drainRequestedAt || now } : {}),
      ...(status === 'stopped' ? { stoppedAt: now } : {}),
    },
    $setOnInsert: { startedAt: input.startedAt || now },
    ...(status === 'draining'
      ? { $unset: { stoppedAt: 1 } }
      : status !== 'stopped'
        ? { $unset: { drainRequestedAt: 1, stoppedAt: 1 } }
        : {}),
  };
  let worker;
  try {
    worker = await dependencies.WorkerRegistration.findOneAndUpdate(
      { workerId },
      update,
      { upsert: true, new: true, runValidators: true },
    );
  } catch (error) {
    if (!duplicateKey(error)) throw error;
    worker = await dependencies.WorkerRegistration.findOne({ workerId, instanceId });
    if (!worker) throw new AppError(409, 'WORKER_IDENTITY_CONFLICT', 'Worker ID is already registered to another live instance.');
  }
  scaleMetrics.increment('production_scale_worker_registrations', { workerPool, status: worker.status });
  return worker;
}

async function heartbeatWorker(input = {}, options = {}) {
  const dependencies = productionScaleDependencies(options.dependencies);
  const now = options.now || new Date();
  const workerHeartbeatTimeoutMs = boundedInteger(input.workerHeartbeatTimeoutMs, 'workerHeartbeatTimeoutMs', 5_000, 3_600_000, 120_000);
  const leaseMs = boundedInteger(input.leaseMs, 'leaseMs', 5_000, 3_600_000, 60_000);
  const activeClaimCount = boundedInteger(input.activeClaimCount, 'activeClaimCount', 0, PRODUCTION_SCALE_LIMITS.maximumWorkerConcurrency, 0);
  const worker = await dependencies.WorkerRegistration.findOneAndUpdate(
    {
      workerId: input.workerId,
      instanceId: input.instanceId,
      status: { $nin: ['stopped', 'unhealthy'] },
      heartbeatAt: { $gt: new Date(now.getTime() - workerHeartbeatTimeoutMs) },
      $expr: { $gte: ['$maximumConcurrency', activeClaimCount] },
    },
    [
      { $set: {
        heartbeatAt: now,
        activeClaimCount,
        availableCapacity: { $max: [0, { $subtract: ['$maximumConcurrency', activeClaimCount] }] },
        status: { $cond: ['$drainRequestedAt', 'draining', { $cond: [{ $gt: [activeClaimCount, 0] }, 'active', 'idle'] }] },
      } },
    ],
    { new: true },
  );
  if (!worker) throw new AppError(409, 'WORKER_FENCED', 'Worker registration is no longer active.');
  return worker;
}

async function claimPartition(input = {}, options = {}) {
  const dependencies = productionScaleDependencies(options.dependencies);
  const now = options.now || new Date();
  const leaseMs = boundedInteger(input.leaseMs, 'leaseMs', 5_000, 3_600_000, 60_000);
  const workerHeartbeatTimeoutMs = boundedInteger(input.workerHeartbeatTimeoutMs, 'workerHeartbeatTimeoutMs', 5_000, 3_600_000, 120_000);
  const worker = await dependencies.WorkerRegistration.findOne({
    workerId: input.workerId,
    instanceId: input.instanceId,
    status: { $in: ['active', 'idle'] },
    supportedWorkloadCategories: input.workloadCategory,
    supportedRoutingVersions: Number(input.routingVersion),
    heartbeatAt: { $gt: new Date(now.getTime() - workerHeartbeatTimeoutMs) },
  }).lean();
  if (!worker) throw new AppError(409, 'WORKER_FENCED', 'Worker is not registered for this partition.');
  const key = input.partitionKey || partitionKey(input.workloadCategory, input.routingVersion, input.partitionNumber);
  let partition = await dependencies.QueuePartition.findOne({ partitionKey: key });
  if (!partition || ['paused', 'disabled'].includes(partition.status)) return null;
  if (partition.ownerWorkerId === input.workerId && partition.ownerInstanceId === input.instanceId && new Date(partition.leaseExpiresAt || 0) > now) {
    const renewed = await dependencies.QueuePartition.findOneAndUpdate(
      { _id: partition._id, ownershipEpoch: partition.ownershipEpoch, ownerWorkerId: input.workerId, ownerInstanceId: input.instanceId, leaseExpiresAt: { $gt: now } },
      { $set: { heartbeatAt: now, leaseExpiresAt: new Date(now.getTime() + leaseMs), lastClaimAt: now } },
      { new: true, runValidators: true },
    );
    if (renewed) scaleMetrics.increment('production_scale_partition_claims', { workloadCategory: renewed.workloadCategory, routingVersion: renewed.routingVersion, status: 'renewed' });
    return renewed;
  }
  partition = await dependencies.QueuePartition.findOneAndUpdate(
    {
      _id: partition._id,
      ownershipEpoch: partition.ownershipEpoch,
      status: { $in: ['active', 'draining', 'recovering'] },
      $or: [{ ownerWorkerId: { $exists: false } }, { leaseExpiresAt: { $lte: now } }, { ownerWorkerId: input.workerId, ownerInstanceId: input.instanceId }],
    },
    {
      $set: {
        ownerWorkerId: input.workerId,
        ownerInstanceId: input.instanceId,
        leaseExpiresAt: new Date(now.getTime() + leaseMs),
        heartbeatAt: now,
        lastClaimAt: now,
        status: partition.status === 'draining' ? 'draining' : 'active',
      },
      $inc: { ownershipEpoch: 1 },
    },
    { new: true, runValidators: true },
  );
  if (partition) {
    scaleMetrics.increment('production_scale_partition_claims', { workloadCategory: partition.workloadCategory, routingVersion: partition.routingVersion, status: 'claimed' });
    scaleMetrics.increment('production_scale_partition_ownership_changes', { workloadCategory: partition.workloadCategory, routingVersion: partition.routingVersion });
  }
  return partition;
}

async function assertPartitionFence(claim = {}, options = {}) {
  if (!claim.partitionKey) return true;
  const dependencies = productionScaleDependencies(options.dependencies);
  const now = options.now || new Date();
  const filter = {
    partitionKey: claim.partitionKey,
    ownerWorkerId: claim.leaseOwner || claim.workerId,
    ownershipEpoch: Number(claim.partitionOwnershipEpoch),
    leaseExpiresAt: { $gt: now },
    status: { $in: ['active', 'draining'] },
  };
  const partition = options.extendLeaseMs
    ? await dependencies.QueuePartition.findOneAndUpdate(
        filter,
        { $set: { heartbeatAt: now, leaseExpiresAt: new Date(now.getTime() + Number(options.extendLeaseMs)) } },
        { new: true, runValidators: true },
      )
    : await dependencies.QueuePartition.findOne(filter).lean();
  if (!partition) {
    scaleMetrics.increment('production_scale_fencing_rejections', { safeReasonCode: 'PARTITION_OWNERSHIP_LOST' });
    throw new AppError(409, 'PARTITION_OWNERSHIP_LOST', 'Partition ownership was lost.', [], { retryable: true });
  }
  return true;
}

async function rebalancePartitions(input = {}, caller = {}, options = {}) {
  const startedAt = Date.now();
  const dependencies = productionScaleDependencies(options.dependencies);
  const scope = scopeFrom(input, caller, { workspaceRequired: false, trustedSystem: options.trustedSystem });
  if (!scope.trustedSystem) await dependencies.authorize('queuePartition.rebalance', 'QueuePartition', null, scope, caller, { requestedOperationalAction: 'partition_rebalance' });
  const now = options.now || new Date();
  const workerHeartbeatTimeoutMs = boundedInteger(input.workerHeartbeatTimeoutMs, 'workerHeartbeatTimeoutMs', 5_000, 3_600_000, 120_000);
  const healthyAfter = new Date(now.getTime() - workerHeartbeatTimeoutMs);
  const unhealthy = await dependencies.WorkerRegistration.updateMany(
    { status: { $in: ['active', 'idle'] }, heartbeatAt: { $lte: healthyAfter } },
    { $set: { status: 'unhealthy', availableCapacity: 0 } },
  );
  if (unhealthy.modifiedCount) scaleMetrics.increment('production_scale_unhealthy_workers', { status: 'unhealthy' }, unhealthy.modifiedCount);
  const registrations = await dependencies.WorkerRegistration.find({ status: { $in: ['active', 'idle', 'draining'] }, heartbeatAt: { $gt: healthyAfter } }).sort({ workerId: 1 }).lean();
  const workers = registrations.filter((worker) => ['active', 'idle'].includes(worker.status));
  const drainingWorkers = registrations.filter((worker) => worker.status === 'draining' && Number(worker.activeClaimCount || 0) > 0);
  const partitions = await dependencies.QueuePartition.find({ status: { $in: ['active', 'recovering', 'draining'] } }).sort({ workloadCategory: 1, routingVersion: 1, partitionNumber: 1 });
  let changed = 0;
  for (const partition of partitions) {
    const drainingOwner = drainingWorkers.find((worker) => worker.workerId === partition.ownerWorkerId && worker.instanceId === partition.ownerInstanceId);
    if (drainingOwner && new Date(partition.leaseExpiresAt || 0) > now) continue;
    const eligible = workers.filter((worker) => worker.supportedWorkloadCategories.includes(partition.workloadCategory) && worker.supportedRoutingVersions.includes(partition.routingVersion));
    if (!eligible.length) continue;
    const owner = eligible[Number(stableHashInteger(partition.partitionKey) % BigInt(eligible.length))];
    if (partition.ownerWorkerId === owner.workerId && partition.ownerInstanceId === owner.instanceId) continue;
    const updated = await dependencies.QueuePartition.findOneAndUpdate(
      { _id: partition._id, ownershipEpoch: partition.ownershipEpoch },
      {
        $set: {
          ownerWorkerId: owner.workerId,
          ownerInstanceId: owner.instanceId,
          status: partition.status === 'draining' ? 'draining' : 'recovering',
          heartbeatAt: now,
          leaseExpiresAt: new Date(now.getTime() + leaseMs),
        },
        $inc: { ownershipEpoch: 1 },
      },
      { new: true, runValidators: true },
    );
    if (updated) changed += 1;
  }
  await dependencies.audit('production_scale.partition.rebalanced', 'QueuePartition', input.idempotencyKey || scope.requestId, scope, { changedPartitionCount: changed, workerCount: workers.length });
  scaleMetrics.increment('production_scale_partition_rebalances', { status: 'completed' });
  scaleMetrics.increment('production_scale_partition_ownership_changes', { status: 'rebalanced' }, changed);
  scaleMetrics.observe('production_scale_partition_rebalance_duration_ms', Date.now() - startedAt);
  return { changedPartitionCount: changed, workerCount: workers.length, partitionCount: partitions.length };
}

module.exports = {
  activeRoutingVersion,
  assertAdmissionAccepted,
  assertNoSensitiveData,
  assertPartitionFence,
  assertRoutingEvolution,
  autoscalingRecommendation,
  calculateBackpressure,
  claimPartition,
  currentBackpressure,
  databasePressureCategory,
  defaultScaleConfiguration,
  effectivePriority,
  ensurePartitions,
  estimateCapacity,
  evaluateAdmission,
  evaluateAdmissionOutcome,
  fairSchedule,
  heartbeatWorker,
  loadSheddingDecision,
  metricLabelsAreBounded,
  normalizeQuotaPolicy,
  normalizeScaleConfiguration,
  partitionKey,
  priorityAgeBoost,
  productionScaleDependencies,
  protectedCapacity,
  rebalancePartitions,
  recoverExpiredQuotaReservations,
  registerWorker,
  releaseQuotaReservation,
  reserveQuota,
  resolveWorkloadRoute,
  routeWorkload,
  selectFairCandidate,
  stableHash,
  stableHashInteger,
  validateQuotaPolicy,
  validateScaleConfiguration,
};
