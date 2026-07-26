const crypto = require('node:crypto');
const { AppError } = require('../utils/AppError');
const { CONSISTENCY_CLASSES } = require('../constants/dataAccessPerformance');
const {
  CRITICALITIES,
  DEGRADED_MODES,
  EMERGENCY_FAILOVER_STEPS,
  FAILOVER_STATES,
  FAILOVER_TRANSITIONS,
  FAILOVER_TRIGGERS,
  FAILOVER_TYPES,
  HEALTH_STATUSES,
  LAG_CATEGORIES,
  PLANNED_SWITCHOVER_STEPS,
  REGIONAL_LIMITS,
  REGIONAL_ROLES,
  REGIONAL_SCOPES,
  REGIONAL_STATES,
  REPLICATION_DOMAINS,
  REPLICATION_STATUSES,
  RESTORE_STATES,
  RESTORE_TRANSITIONS,
  VERSION_STATUSES,
} = require('../constants/regionalResilience');

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const SAFE_REASON = /^[A-Z][A-Z0-9_]{0,127}$/;
const SENSITIVE_KEY = /(authorization|bearer|credential|password|secret|token|api.?key|connection.?string|database.?uri|signed.?url|private.?host|environment.?variable|process.?arg)/i;

function validationError(path, message) {
  return new AppError(400, 'REGIONAL_RESILIENCE_VALIDATION_FAILED', 'Regional resilience validation failed.', [{ path, message }]);
}

function assertNoSensitiveData(value, path = '$', depth = 0, seen = new Set()) {
  if (value == null || typeof value !== 'object') return true;
  if (depth > 12 || seen.has(value)) return true;
  seen.add(value);
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) throw validationError(`${path}.${key}`, 'Sensitive infrastructure or credential data is not allowed.');
    if (typeof nested === 'string' && /(mongodb(?:\+srv)?:\/\/|redis:\/\/|bearer\s+[a-z0-9._-]+|-----BEGIN .*PRIVATE KEY-----)/i.test(nested)) {
      throw validationError(`${path}.${key}`, 'Sensitive infrastructure or credential data is not allowed.');
    }
    assertNoSensitiveData(nested, `${path}.${key}`, depth + 1, seen);
  }
  return true;
}

function safeIdentifier(value, path, required = true) {
  if (value == null || value === '') {
    if (!required) return undefined;
    throw validationError(path, `${path} is required.`);
  }
  const candidate = String(value).trim();
  if (!SAFE_IDENTIFIER.test(candidate)) throw validationError(path, `${path} must be a bounded safe identifier.`);
  return candidate;
}

function safeText(value, maximum = 1_000) {
  return String(value || '').trim().slice(0, maximum);
}

function enumValue(value, values, path, fallback) {
  const candidate = value == null || value === '' ? fallback : String(value).trim();
  if (!values.includes(candidate)) throw validationError(path, `${path} is not supported.`);
  return candidate;
}

function boundedInteger(value, path, minimum, maximum, fallback) {
  const candidate = value == null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw validationError(path, `${path} must be an integer between ${minimum} and ${maximum}.`);
  }
  return candidate;
}

function uniqueIdentifiers(values, path, maximum = REGIONAL_LIMITS.maximumSafeListEntries) {
  const result = [...new Set((values || []).map((value) => safeIdentifier(value, path)))].sort();
  if (result.length > maximum) throw validationError(path, `${path} exceeds its bounded entry limit.`);
  return result;
}

function normalizeRegion(region = {}, index = 0) {
  const path = `regions[${index}]`;
  return {
    regionId: safeIdentifier(region.regionId, `${path}.regionId`),
    displayName: safeText(region.displayName || region.regionId, 120),
    regionGroup: safeIdentifier(region.regionGroup || 'default', `${path}.regionGroup`),
    role: enumValue(region.role, REGIONAL_ROLES, `${path}.role`),
    state: enumValue(region.state, REGIONAL_STATES, `${path}.state`, 'initializing'),
    priority: boundedInteger(region.priority, `${path}.priority`, 1, REGIONAL_LIMITS.maximumRegionPriority, index + 1),
    safeProviderCategory: safeIdentifier(region.safeProviderCategory || 'provider_neutral', `${path}.safeProviderCategory`),
    dataResidencyTags: uniqueIdentifiers(region.dataResidencyTags, `${path}.dataResidencyTags`),
    allowedDataClassifications: [...new Set(region.allowedDataClassifications || ['public', 'internal'])].map((classification) => enumValue(classification, ['public', 'internal', 'confidential', 'restricted'], `${path}.allowedDataClassifications`)).sort(),
    supportsWriteAuthority: region.supportsWriteAuthority === true,
    supportsWorkerExecution: region.supportsWorkerExecution === true,
    supportsRecoveryExecution: region.supportsRecoveryExecution === true,
    supportsControlPlaneProjections: region.supportsControlPlaneProjections === true,
    supportsReadOnlyTraffic: region.supportsReadOnlyTraffic === true,
    supportsBackupRestore: region.supportsBackupRestore === true,
    maximumStalenessMs: boundedInteger(region.maximumStalenessMs, `${path}.maximumStalenessMs`, 0, 86_400_000, 60_000),
    enabled: region.enabled !== false,
  };
}

function normalizeRegionalConfiguration(input = {}, current = {}) {
  assertNoSensitiveData(input);
  const source = { ...current, ...input };
  const regions = (source.regions || []).map(normalizeRegion);
  if (!regions.length || regions.length > REGIONAL_LIMITS.maximumRegions) throw validationError('regions', 'Between 1 and 16 regions are required.');
  const result = {
    name: safeText(source.name || 'Regional deployment', 120),
    description: safeText(source.description, 1_000),
    version: boundedInteger(source.version, 'version', 1, 1_000_000, 1),
    status: enumValue(source.status, VERSION_STATUSES, 'status', 'draft'),
    regions,
    preferredPrimaryRegionId: safeIdentifier(source.preferredPrimaryRegionId, 'preferredPrimaryRegionId'),
    defaultStandbyRegionId: safeIdentifier(source.defaultStandbyRegionId, 'defaultStandbyRegionId', false),
    permittedFailoverRegionIds: uniqueIdentifiers(source.permittedFailoverRegionIds, 'permittedFailoverRegionIds', REGIONAL_LIMITS.maximumRegions),
    prohibitedFailoverRegionIds: uniqueIdentifiers(source.prohibitedFailoverRegionIds, 'prohibitedFailoverRegionIds', REGIONAL_LIMITS.maximumRegions),
    maximumReplicationLagForPromotionMs: boundedInteger(source.maximumReplicationLagForPromotionMs, 'maximumReplicationLagForPromotionMs', 0, 86_400_000, 30_000),
    maximumDataLossWindowMs: boundedInteger(source.maximumDataLossWindowMs, 'maximumDataLossWindowMs', 0, 86_400_000, 60_000),
    regionalHealthTimeoutMs: boundedInteger(source.regionalHealthTimeoutMs, 'regionalHealthTimeoutMs', 5_000, 3_600_000, 120_000),
    regionalHeartbeatIntervalMs: boundedInteger(source.regionalHeartbeatIntervalMs, 'regionalHeartbeatIntervalMs', 1_000, 300_000, 30_000),
    authorityLeaseDurationMs: boundedInteger(source.authorityLeaseDurationMs, 'authorityLeaseDurationMs', REGIONAL_LIMITS.minimumLeaseMs, REGIONAL_LIMITS.maximumLeaseMs, 60_000),
    authorityHeartbeatIntervalMs: boundedInteger(source.authorityHeartbeatIntervalMs, 'authorityHeartbeatIntervalMs', 1_000, 300_000, 15_000),
    failoverApprovalPolicy: enumValue(source.failoverApprovalPolicy, ['always', 'policy_governed', 'emergency_automatic'], 'failoverApprovalPolicy', 'always'),
    failbackApprovalPolicy: enumValue(source.failbackApprovalPolicy, ['always', 'policy_governed'], 'failbackApprovalPolicy', 'always'),
    degradedModePolicy: enumValue(source.degradedModePolicy, DEGRADED_MODES, 'degradedModePolicy', 'disabled'),
    cacheIsolationMode: enumValue(source.cacheIsolationMode, ['region_local', 'explicit_distributed'], 'cacheIsolationMode', 'region_local'),
    projectionRecoveryPolicy: enumValue(source.projectionRecoveryPolicy, ['rebuild', 'catch_up', 'manual'], 'projectionRecoveryPolicy', 'catch_up'),
  };
  validateNormalizedConfiguration(result);
  return result;
}

function validateNormalizedConfiguration(configuration) {
  const ids = configuration.regions.map((region) => region.regionId);
  if (new Set(ids).size !== ids.length) throw validationError('regions', 'Region IDs must be unique.');
  const primary = configuration.regions.find((region) => region.regionId === configuration.preferredPrimaryRegionId);
  if (!primary || !primary.enabled || !primary.supportsWriteAuthority) throw validationError('preferredPrimaryRegionId', 'Preferred primary must be enabled and write-authority capable.');
  if (configuration.defaultStandbyRegionId) {
    const standby = configuration.regions.find((region) => region.regionId === configuration.defaultStandbyRegionId);
    if (!standby || !standby.enabled || !standby.supportsWriteAuthority || standby.regionId === primary.regionId) throw validationError('defaultStandbyRegionId', 'Default standby must be a distinct enabled write-authority capable region.');
  }
  for (const id of [...configuration.permittedFailoverRegionIds, ...configuration.prohibitedFailoverRegionIds]) {
    if (!ids.includes(id)) throw validationError('permittedFailoverRegionIds', 'Failover region IDs must reference configured regions.');
  }
  if (configuration.permittedFailoverRegionIds.some((id) => configuration.prohibitedFailoverRegionIds.includes(id))) throw validationError('prohibitedFailoverRegionIds', 'Permitted and prohibited failover regions must not overlap.');
  if (configuration.authorityHeartbeatIntervalMs * 2 >= configuration.authorityLeaseDurationMs) throw validationError('authorityHeartbeatIntervalMs', 'Authority heartbeat interval must be less than half the lease duration.');
  if (configuration.regionalHeartbeatIntervalMs >= configuration.regionalHealthTimeoutMs) throw validationError('regionalHeartbeatIntervalMs', 'Regional heartbeat interval must be less than the health timeout.');
  return true;
}

function validateRegionalConfiguration(input = {}) {
  try {
    return { valid: true, safeReasonCodes: [], configuration: normalizeRegionalConfiguration(input) };
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    return { valid: false, safeReasonCodes: ['REGIONAL_CONFIGURATION_INVALID'], errors: error.details || [] };
  }
}

function normalizeDisasterRecoveryPolicy(input = {}, current = {}) {
  assertNoSensitiveData(input);
  const source = { ...current, ...input };
  const result = {
    name: safeText(source.name || 'Disaster recovery policy', 120),
    description: safeText(source.description, 1_000),
    version: boundedInteger(source.version, 'version', 1, 1_000_000, 1),
    status: enumValue(source.status, VERSION_STATUSES, 'status', 'draft'),
    criticality: enumValue(source.criticality, CRITICALITIES, 'criticality', 'important'),
    recoveryPointObjectiveMs: boundedInteger(source.recoveryPointObjectiveMs, 'recoveryPointObjectiveMs', 1_000, REGIONAL_LIMITS.maximumDurationMs, 60_000),
    recoveryTimeObjectiveMs: boundedInteger(source.recoveryTimeObjectiveMs, 'recoveryTimeObjectiveMs', 1_000, REGIONAL_LIMITS.maximumDurationMs, 300_000),
    maximumPromotionReplicationLagMs: boundedInteger(source.maximumPromotionReplicationLagMs, 'maximumPromotionReplicationLagMs', 0, 86_400_000, 30_000),
    maximumUnknownReplicationWindowMs: boundedInteger(source.maximumUnknownReplicationWindowMs, 'maximumUnknownReplicationWindowMs', 0, 86_400_000, 0),
    maximumDegradedModeDurationMs: boundedInteger(source.maximumDegradedModeDurationMs, 'maximumDegradedModeDurationMs', 1_000, REGIONAL_LIMITS.maximumDurationMs, 3_600_000),
    preferredRecoveryRegionId: safeIdentifier(source.preferredRecoveryRegionId, 'preferredRecoveryRegionId'),
    permittedRecoveryRegionIds: uniqueIdentifiers(source.permittedRecoveryRegionIds, 'permittedRecoveryRegionIds', REGIONAL_LIMITS.maximumRegions),
    prohibitedRecoveryRegionIds: uniqueIdentifiers(source.prohibitedRecoveryRegionIds, 'prohibitedRecoveryRegionIds', REGIONAL_LIMITS.maximumRegions),
    automaticFailoverAllowed: source.automaticFailoverAllowed === true,
    automaticFailoverConditions: [...new Set(source.automaticFailoverConditions || [])].map((condition) => enumValue(condition, ['source_unavailable', 'source_isolated', 'replication_eligible', 'target_healthy', 'authority_store_reachable'], 'automaticFailoverConditions')).sort(),
    requireApprovalForFailover: source.requireApprovalForFailover !== false,
    requireApprovalForFailback: source.requireApprovalForFailback !== false,
    requireApprovalForDataLossAcceptance: source.requireApprovalForDataLossAcceptance !== false,
    backupRequired: source.backupRequired !== false,
    backupFrequencyMs: boundedInteger(source.backupFrequencyMs, 'backupFrequencyMs', 60_000, REGIONAL_LIMITS.maximumDurationMs, 86_400_000),
    backupRetentionMs: boundedInteger(source.backupRetentionMs, 'backupRetentionMs', 60_000, REGIONAL_LIMITS.maximumDurationMs * 10, 2_592_000_000),
    restoreVerificationFrequencyMs: boundedInteger(source.restoreVerificationFrequencyMs, 'restoreVerificationFrequencyMs', 60_000, REGIONAL_LIMITS.maximumDurationMs, 2_592_000_000),
    minimumHealthyServiceCount: boundedInteger(source.minimumHealthyServiceCount, 'minimumHealthyServiceCount', 1, 10_000, 1),
    minimumHealthyWorkerCount: boundedInteger(source.minimumHealthyWorkerCount, 'minimumHealthyWorkerCount', 0, 10_000, 1),
    minimumHealthyDatabaseCategory: enumValue(source.minimumHealthyDatabaseCategory, ['healthy', 'elevated'], 'minimumHealthyDatabaseCategory', 'healthy'),
    degradedMode: enumValue(source.degradedMode, DEGRADED_MODES, 'degradedMode', 'disabled'),
    protectedOperationCategories: uniqueIdentifiers(source.protectedOperationCategories, 'protectedOperationCategories'),
  };
  if (!result.permittedRecoveryRegionIds.includes(result.preferredRecoveryRegionId)) throw validationError('preferredRecoveryRegionId', 'Preferred recovery region must be permitted.');
  if (result.permittedRecoveryRegionIds.some((id) => result.prohibitedRecoveryRegionIds.includes(id))) throw validationError('prohibitedRecoveryRegionIds', 'Permitted and prohibited recovery regions must not overlap.');
  if (result.backupRetentionMs < result.backupFrequencyMs) throw validationError('backupRetentionMs', 'Backup retention must be at least the backup frequency.');
  if (result.automaticFailoverAllowed && !result.automaticFailoverConditions.includes('authority_store_reachable')) throw validationError('automaticFailoverConditions', 'Automatic failover must require the durable authority store.');
  return result;
}

function validateDisasterRecoveryPolicy(input = {}) {
  try {
    return { valid: true, safeReasonCodes: [], policy: normalizeDisasterRecoveryPolicy(input) };
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    return { valid: false, safeReasonCodes: ['DISASTER_RECOVERY_POLICY_INVALID'], errors: error.details || [] };
  }
}

function lagCategory(lagMs) {
  if (lagMs == null || !Number.isFinite(Number(lagMs))) return 'unknown';
  const value = Math.max(0, Number(lagMs));
  if (value === 0) return 'none';
  if (value <= 5_000) return 'low';
  if (value <= 30_000) return 'moderate';
  if (value <= 300_000) return 'high';
  return 'critical';
}

function assessReplicationHealth(input = {}) {
  const domain = enumValue(input.dataDomain, REPLICATION_DOMAINS, 'dataDomain', 'authority');
  if (input.available === false) return { dataDomain: domain, status: 'unavailable', lagCategory: 'unknown', promotionEligible: false, safeReasonCodes: ['REPLICATION_UNAVAILABLE'] };
  if (input.lagMs == null || !Number.isFinite(Number(input.lagMs))) return { dataDomain: domain, status: 'unknown', lagCategory: 'unknown', promotionEligible: false, safeReasonCodes: ['REPLICATION_LAG_UNKNOWN'] };
  const measured = Math.max(0, Number(input.lagMs));
  const maximum = Math.max(0, Number(input.maximumPromotionLagMs ?? 30_000));
  const category = lagCategory(measured);
  const promotionEligible = measured <= maximum && input.sequenceVerified !== false;
  return {
    dataDomain: domain,
    status: promotionEligible ? (category === 'none' || category === 'low' ? 'healthy' : 'elevated') : 'delayed',
    lagMs: measured,
    lagCategory: category,
    promotionEligible,
    safeReasonCodes: promotionEligible ? ['REPLICATION_PROMOTION_ELIGIBLE'] : [input.sequenceVerified === false ? 'REPLICATION_SEQUENCE_UNVERIFIED' : 'REPLICATION_LAG_EXCEEDED'],
  };
}

function evaluateRpo(input = {}) {
  const objectiveMs = Math.max(0, Number(input.objectiveMs || 0));
  if (input.replicationStatus === 'unknown' || input.replicationLagMs == null) return { status: 'unknown', measuredRpoMs: null, objectiveMs, safeReasonCodes: ['RPO_REPLICATION_UNKNOWN'] };
  const candidates = [input.replicationLagMs];
  if (input.incidentAt && input.lastConfirmedDurableWriteAt) candidates.push(Math.max(0, new Date(input.incidentAt) - new Date(input.lastConfirmedDurableWriteAt)));
  if (input.incidentAt && input.lastVerifiedBackupAt) candidates.push(Math.max(0, new Date(input.incidentAt) - new Date(input.lastVerifiedBackupAt)));
  const measuredRpoMs = Math.max(...candidates.map(Number).filter(Number.isFinite));
  if (!Number.isFinite(measuredRpoMs)) return { status: 'insufficient_data', measuredRpoMs: null, objectiveMs, safeReasonCodes: ['RPO_INSUFFICIENT_DATA'] };
  return { status: measuredRpoMs <= objectiveMs ? 'compliant' : 'breached', measuredRpoMs, objectiveMs, safeReasonCodes: [measuredRpoMs <= objectiveMs ? 'RPO_COMPLIANT' : 'RPO_BREACHED'] };
}

function evaluateRto(input = {}) {
  const objectiveMs = Math.max(0, Number(input.objectiveMs || 0));
  if (!input.incidentStartedAt || !input.admissionResumedAt) return { status: 'insufficient_data', measuredRtoMs: null, objectiveMs, safeReasonCodes: ['RTO_INSUFFICIENT_DATA'] };
  const measuredRtoMs = Math.max(0, new Date(input.admissionResumedAt) - new Date(input.incidentStartedAt));
  return { status: measuredRtoMs <= objectiveMs ? 'compliant' : 'breached', measuredRtoMs, objectiveMs, safeReasonCodes: [measuredRtoMs <= objectiveMs ? 'RTO_COMPLIANT' : 'RTO_BREACHED'] };
}

function residencyDecision(input = {}, region = {}) {
  const requiredTags = new Set(input.residencyTags || []);
  const regionTags = new Set(region.dataResidencyTags || []);
  if ([...requiredTags].some((tag) => !regionTags.has(tag))) return { allowed: false, code: 'REGION_RESIDENCY_DENIED' };
  const classification = input.dataClassification || 'internal';
  if (!(region.allowedDataClassifications || []).includes(classification)) return { allowed: false, code: 'REGION_CLASSIFICATION_DENIED' };
  return { allowed: true, code: 'REGION_RESIDENCY_ALLOWED' };
}

function evaluateRegionalRouting(input = {}) {
  assertNoSensitiveData(input);
  const configuration = input.configuration;
  if (!configuration?.regions?.length) throw validationError('configuration', 'An active regional configuration is required.');
  const consistencyClass = enumValue(input.consistencyClass, Object.values(CONSISTENCY_CLASSES), 'consistencyClass', CONSISTENCY_CLASSES.STRONG_AUTHORITY);
  const requested = configuration.regions.find((region) => region.regionId === input.requestedRegionId);
  const active = configuration.regions.find((region) => region.regionId === input.authority?.activeRegionId);
  const home = configuration.regions.find((region) => region.regionId === input.homeRegionId);
  const authorityEpoch = Number(input.authority?.authorityEpoch || 0);
  if (consistencyClass === CONSISTENCY_CLASSES.STRONG_AUTHORITY) {
    if (!active || input.authority?.status !== 'active') return { outcome: 'reject_write_fenced', selectedRegionId: null, activeWriteRegionId: active?.regionId || null, authorityEpoch, safeReasonCodes: ['REGION_WRITE_FROZEN'] };
    const residency = residencyDecision(input, active);
    if (!residency.allowed) return { outcome: 'reject_residency', selectedRegionId: null, activeWriteRegionId: active.regionId, authorityEpoch, safeReasonCodes: [residency.code] };
    if (!['healthy', 'elevated', 'degraded', 'promoted'].includes(active.state)) return { outcome: 'reject_region_unavailable', selectedRegionId: null, activeWriteRegionId: active.regionId, authorityEpoch, safeReasonCodes: ['REGION_UNAVAILABLE'] };
    return { outcome: requested && requested.regionId !== active.regionId && input.allowQueueForPrimary === true ? 'queue_for_primary' : 'route_primary', selectedRegionId: active.regionId, activeWriteRegionId: active.regionId, authorityEpoch, safeReasonCodes: ['STRONG_AUTHORITY_ROUTED'] };
  }
  for (const candidate of [requested, home, active].filter(Boolean)) {
    if (!candidate.enabled || !candidate.supportsReadOnlyTraffic || ['unavailable', 'isolated', 'disabled'].includes(candidate.state)) continue;
    const residency = residencyDecision(input, candidate);
    if (!residency.allowed) continue;
    const stale = Number(input.projectionStalenessMs || 0) > Number(candidate.maximumStalenessMs || 0);
    if (!stale) return { outcome: candidate === requested ? 'route_read_replica' : candidate === home ? 'route_home_region' : 'route_primary', selectedRegionId: candidate.regionId, activeWriteRegionId: active?.regionId || null, authorityEpoch, safeReasonCodes: ['EVENTUAL_READ_ROUTED'], generatedAt: input.generatedAt || new Date(), sourceRegion: candidate.regionId, stalenessCategory: 'bounded', maximumExpectedStalenessMs: candidate.maximumStalenessMs };
  }
  if (input.degradedMode === 'read_only' && requested?.supportsReadOnlyTraffic && residencyDecision(input, requested).allowed) return { outcome: 'degraded_read_only', selectedRegionId: requested.regionId, activeWriteRegionId: active?.regionId || null, authorityEpoch, safeReasonCodes: ['DEGRADED_READ_ONLY'], generatedAt: input.generatedAt || new Date(), sourceRegion: requested.regionId, stalenessCategory: 'stale', maximumExpectedStalenessMs: requested.maximumStalenessMs };
  return { outcome: requested && !residencyDecision(input, requested).allowed ? 'reject_residency' : 'reject_region_unavailable', selectedRegionId: null, activeWriteRegionId: active?.regionId || null, authorityEpoch, safeReasonCodes: [requested && !residencyDecision(input, requested).allowed ? residencyDecision(input, requested).code : 'REGION_READ_UNAVAILABLE'] };
}

function evaluateWorkerRegionalEligibility(input = {}) {
  const reasons = [];
  if (!input.worker || !['active', 'idle'].includes(input.worker.status) || ['fenced', 'isolated'].includes(input.worker.regionalStatus)) reasons.push('REGION_WORKER_INACTIVE');
  if (input.worker?.regionId !== input.partition?.activeRegionId) reasons.push('REGION_QUEUE_OWNERSHIP_MISMATCH');
  if (Number(input.worker?.writeAuthorityEpoch || 0) !== Number(input.authority?.authorityEpoch || 0)) reasons.push('REGION_AUTHORITY_EPOCH_STALE');
  if (Number(input.partition?.regionalOwnershipEpoch || 0) !== Number(input.requestedRegionalOwnershipEpoch ?? input.partition?.regionalOwnershipEpoch ?? 0)) reasons.push('REGION_QUEUE_OWNERSHIP_EPOCH_STALE');
  if (!(input.worker?.supportedRoutingVersions || []).includes(Number(input.routingVersion))) reasons.push('INVALID_ROUTING_VERSION');
  if (input.dataClassification && !(input.region?.allowedDataClassifications || []).includes(input.dataClassification)) reasons.push('REGION_CLASSIFICATION_DENIED');
  if (!residencyDecision(input, input.region || {}).allowed) reasons.push(residencyDecision(input, input.region || {}).code);
  return { eligible: reasons.length === 0, safeReasonCodes: [...new Set(reasons)] };
}

function evaluateRegionalAdmission(input = {}) {
  if (!input.authority || input.authority.status !== 'active') {
    if (input.degradedMode === 'queue_only' && input.durablePrimaryStorageAvailable === true) return { decision: 'accepted_deferred', safeReasonCodes: ['REGION_QUEUE_ONLY_DEGRADED'] };
    return { decision: 'rejected_no_write_authority', safeReasonCodes: ['REGION_WRITE_FROZEN'] };
  }
  if (input.failoverInProgress && !input.protectedOperation) return { decision: 'rejected_failover_in_progress', safeReasonCodes: ['REGION_FAILOVER_IN_PROGRESS'] };
  const residency = residencyDecision(input, input.targetRegion || {});
  if (!residency.allowed) return { decision: 'rejected_residency', safeReasonCodes: [residency.code] };
  if (['unavailable', 'isolated', 'unknown'].includes(input.regionHealthStatus)) {
    if (input.degradedMode === 'queue_only' && input.durablePrimaryStorageAvailable === true) return { decision: 'accepted_deferred', safeReasonCodes: ['REGION_QUEUE_ONLY_DEGRADED'] };
    return { decision: 'rejected_region_unavailable', safeReasonCodes: ['REGION_UNAVAILABLE'] };
  }
  if (input.replicationStatus === 'unknown' && input.failoverInProgress) return { decision: 'approval_required', safeReasonCodes: ['REPLICATION_LAG_UNKNOWN'] };
  if (input.regionalBackpressure === 'shedding' || input.workerCapacityAvailable === false) return { decision: 'accepted_deferred', safeReasonCodes: ['REGIONAL_CAPACITY_DEFERRED'] };
  return { decision: input.degradedMode && input.degradedMode !== 'disabled' ? 'accepted_degraded' : 'accepted_primary', safeReasonCodes: ['REGIONAL_ADMISSION_ACCEPTED'] };
}

function orderedFailoverSteps(failoverType) {
  const keys = failoverType === 'planned_switchover' ? PLANNED_SWITCHOVER_STEPS : EMERGENCY_FAILOVER_STEPS;
  return keys.map((stepKey, index) => ({ stepKey, order: index + 1, actionType: stepKey, dependencyStepKeys: index ? [keys[index - 1]] : [], status: 'pending' }));
}

function validateFailoverPlan(input = {}) {
  assertNoSensitiveData(input);
  const failoverType = enumValue(input.failoverType, FAILOVER_TYPES, 'failoverType');
  enumValue(input.triggerType, FAILOVER_TRIGGERS, 'triggerType');
  if (input.sourceRegionId === input.targetRegionId) throw validationError('targetRegionId', 'Source and target regions must differ.');
  if (!input.targetRegion?.enabled || !input.targetRegion?.supportsWriteAuthority) throw validationError('targetRegionId', 'Target region is not eligible for write authority.');
  const targetHealthStatus = input.targetHealthStatus || input.targetRegion.healthStatus || input.targetRegion.state || 'unknown';
  if (!['healthy', 'elevated', 'promoted', 'failover_candidate'].includes(targetHealthStatus)) {
    throw new AppError(409, 'REGION_TARGET_NOT_READY', 'Failover target health is not acceptable for promotion.');
  }
  const residency = residencyDecision(input, input.targetRegion);
  if (!residency.allowed) throw new AppError(409, residency.code, 'Regional failover was denied by residency policy.');
  if (input.authorityStoreReachable !== true || input.sourceFencePossible !== true) throw new AppError(409, 'REGION_SPLIT_BRAIN_PREVENTION_UNAVAILABLE', 'Failover cannot proceed because fencing cannot be proven.', [], { interventionRequired: true });
  if (failoverType === 'emergency_failover' && !['unavailable', 'isolated'].includes(input.sourceHealthStatus)) throw validationError('sourceHealthStatus', 'Emergency failover requires an unavailable or isolated source.');
  if (input.replication?.promotionEligible !== true && input.dataLossAccepted !== true) throw new AppError(409, input.replication?.status === 'unknown' ? 'REGION_REPLICATION_UNKNOWN' : 'REGION_DATA_LOSS_ACCEPTANCE_REQUIRED', 'Replication freshness does not satisfy promotion policy.', [], { approvalRequired: true });
  if (input.requireApproval && input.approved !== true) throw new AppError(409, 'REGION_FAILOVER_APPROVAL_REQUIRED', 'Failover approval is required.', [], { approvalRequired: true });
  return { valid: true, failoverType, sourceAuthorityEpoch: Number(input.authorityEpoch || 0), targetAuthorityEpoch: Number(input.authorityEpoch || 0) + 1, orderedSteps: orderedFailoverSteps(failoverType), potentialDataLoss: input.replication?.promotionEligible !== true, safeReasonCodes: ['REGION_FAILOVER_VALIDATED'] };
}

function transitionFailover(current, next) {
  enumValue(current, FAILOVER_STATES, 'current');
  enumValue(next, FAILOVER_STATES, 'next');
  if (!(FAILOVER_TRANSITIONS[current] || []).includes(next)) throw new AppError(409, 'REGION_FAILOVER_TRANSITION_INVALID', 'Regional failover transition is invalid.', [], { current, next });
  return next;
}

function transitionRestore(current, next) {
  enumValue(current, RESTORE_STATES, 'current');
  enumValue(next, RESTORE_STATES, 'next');
  if (!(RESTORE_TRANSITIONS[current] || []).includes(next)) throw new AppError(409, 'REGION_RESTORE_TRANSITION_INVALID', 'Restore transition is invalid.', [], { current, next });
  return next;
}

function projectionStaleness(input = {}) {
  if (!input.generatedAt) return { stalenessMs: null, stalenessCategory: 'unknown' };
  const age = Math.max(0, new Date(input.now || Date.now()) - new Date(input.generatedAt));
  const maximum = Math.max(0, Number(input.maximumStalenessMs || 0));
  const category = age <= maximum ? 'fresh' : age <= maximum * 2 ? 'bounded' : age <= Math.max(maximum * 10, 60_000) ? 'stale' : 'critical';
  return { stalenessMs: age, stalenessCategory: category, maximumExpectedStalenessMs: maximum, generatedAt: new Date(input.generatedAt), sourceRegion: input.sourceRegionId };
}

function createRegionalCacheKey(input = {}) {
  const regionId = safeIdentifier(input.regionId, 'regionId');
  const namespace = safeIdentifier(input.namespace, 'namespace');
  const tenant = safeIdentifier(input.organizationId, 'organizationId');
  const workspace = safeIdentifier(input.workspaceId, 'workspaceId', false) || 'organization';
  const material = JSON.stringify(input.identity || {});
  return `gb:region:${regionId}:${namespace}:${crypto.createHash('sha256').update(`${tenant}:${workspace}:${material}`).digest('hex')}`;
}

function integrityDigest(value, secret) {
  if (!secret || Buffer.byteLength(String(secret)) < 16) throw validationError('integritySecret', 'A keyed integrity secret of at least 16 bytes is required.');
  return `hmac-sha256:${crypto.createHmac('sha256', String(secret)).update(JSON.stringify(value)).digest('hex')}`;
}

function validateIntegrityManifest(manifest = {}, expected = {}, secret) {
  const actual = new Map((manifest.collectionSummaries || []).map((entry) => [entry.collectionName, entry]));
  const reasons = [];
  for (const expectedEntry of expected.collectionSummaries || []) {
    const entry = actual.get(expectedEntry.collectionName);
    if (!entry) { reasons.push('BACKUP_COLLECTION_MISSING'); continue; }
    if (entry.safeDocumentCount !== expectedEntry.safeDocumentCount) reasons.push('BACKUP_DOCUMENT_COUNT_MISMATCH');
    if (expectedEntry.integrityMaterial && entry.keyedIntegrityDigest !== integrityDigest(expectedEntry.integrityMaterial, secret)) reasons.push('BACKUP_INTEGRITY_MISMATCH');
  }
  return { valid: reasons.length === 0, overallIntegrityStatus: reasons.length ? 'mismatch' : 'verified', safeReasonCodes: [...new Set(reasons.length ? reasons : ['BACKUP_INTEGRITY_VERIFIED'])] };
}

function metricLabelsAreBounded(snapshot = {}) {
  const forbidden = /(organization|workspace|run|node|plan|backup|restore|service|worker|request|trace|provider|hostname).*id|private.?host/i;
  const keys = [...Object.keys(snapshot.counters || {}), ...Object.keys(snapshot.gauges || {}), ...Object.keys(snapshot.durations || {})];
  return { safe: keys.every((key) => !forbidden.test(key)), unsafeLabels: keys.filter((key) => forbidden.test(key)) };
}

module.exports = {
  assessReplicationHealth,
  assertNoSensitiveData,
  boundedInteger,
  createRegionalCacheKey,
  evaluateRegionalAdmission,
  evaluateRegionalRouting,
  evaluateRpo,
  evaluateRto,
  evaluateWorkerRegionalEligibility,
  integrityDigest,
  lagCategory,
  metricLabelsAreBounded,
  normalizeDisasterRecoveryPolicy,
  normalizeRegionalConfiguration,
  orderedFailoverSteps,
  projectionStaleness,
  residencyDecision,
  safeIdentifier,
  transitionFailover,
  transitionRestore,
  validateDisasterRecoveryPolicy,
  validateFailoverPlan,
  validateIntegrityManifest,
  validateRegionalConfiguration,
};
