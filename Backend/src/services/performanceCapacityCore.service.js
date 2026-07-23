const crypto = require('node:crypto');
const { AppError } = require('../utils/AppError');
const { canonicalize } = require('../utils/idempotency');
const {
  AUTOSCALING_RECOMMENDATIONS,
  HISTOGRAM_BUCKETS_MS,
  PERFORMANCE_LIMITS,
  PERFORMANCE_TARGETS,
  PERFORMANCE_TEST_MODES,
  RUN_TRANSITIONS,
  TRAFFIC_MODELS,
  WORKLOAD_DOMAINS,
  WORKLOAD_DOMAIN_IDS,
} = require('../constants/performanceCapacity');

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const SAFE_HASH = /^sha256:[a-f0-9]{64}$/;
const SENSITIVE_KEY = /(authorization|cookie|credential|secret|password|token|api.?key|install.?key|connection.?string|database.?uri|redis.?uri|raw.?request|raw.?response|request.?body|response.?body|hidden.?reasoning|environment.?value|hostname|user.?name|ip.?address|file.?path)/i;
const EXECUTABLE_KEY = /(^|_)(script|javascript|code|command|shell|executable|url|headers?|methods?|body|function)(_|$)|(script|javascript|command|shell|executable|url|headers?|methods?|body|function)$/i;
const SECRET_VALUE = /(bearer\s+[A-Za-z0-9._~+/=-]+|mongodb(?:\+srv)?:\/\/|redis:\/\/|-----BEGIN [A-Z ]+PRIVATE KEY-----|(?:api|install|runtime)[_-]?key\s*[:=])/i;
const ALLOWED_ABORT_CONDITIONS = new Set([
  'correctness_violation', 'security_violation', 'cross_tenant_response',
  'credential_pattern', 'unexpected_failure_rate', 'database_unavailable',
  'queue_depth_hard_limit', 'lease_expiry_hard_limit', 'memory_critical',
  'target_unavailable', 'manual_cancellation', 'regional_split_brain_risk',
  'cleanup_failure_risk',
]);
const ALLOWED_CLEANUP_POLICIES = new Set(['delete_fixture_set', 'archive_evidence', 'retain_summary']);
const ALLOWED_SCOPE = new Set(['platform', 'organization', 'workspace']);
const ALLOWED_BUDGET_SCOPE = new Set([...ALLOWED_SCOPE, 'orchestration_definition', 'workload_domain']);
const ALLOWED_ENVIRONMENT = new Set(['local', 'ci', 'integration', 'staging', 'production_observation']);
const ALLOWED_CATEGORIES = Object.freeze({
  operatingSystemCategory: new Set(['windows', 'linux', 'macos', 'other', 'unknown']),
  architectureCategory: new Set(['x64', 'arm64', 'other', 'unknown']),
  databaseAdapterCategory: new Set(['memory', 'mongodb', 'mongodb_atlas', 'mock', 'unknown']),
  databaseTopologyCategory: new Set(['none', 'single', 'replica_set', 'sharded', 'simulated', 'unknown']),
  cacheAdapterCategory: new Set(['noop', 'memory', 'distributed', 'mock', 'unknown']),
  regionalSimulationCategory: new Set(['none', 'local_simulation', 'integration_simulation', 'unknown']),
  cpuCapacityCategory: new Set(['small', 'standard', 'large', 'unknown']),
  memoryCapacityCategory: new Set(['small', 'standard', 'large', 'unknown']),
  networkCategory: new Set(['in_process', 'local', 'integration', 'staging', 'production_observation', 'unknown']),
});

function performanceError(code, message, details = [], statusCode = 400) {
  return new AppError(statusCode, code, message, details);
}

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function safeIdentifier(value, path, required = true) {
  if (value == null || value === '') {
    if (!required) return undefined;
    throw performanceError('VALIDATION_ERROR', `${path} is required.`);
  }
  const candidate = String(value).trim();
  if (!SAFE_IDENTIFIER.test(candidate)) throw performanceError('VALIDATION_ERROR', `${path} is invalid.`);
  return candidate;
}

function safeText(value, maximum = 1_000) {
  const candidate = String(value || '').trim();
  if (SECRET_VALUE.test(candidate)) throw performanceError('PERFORMANCE_DATA_UNSAFE', 'Performance data contains a prohibited value.');
  return candidate.slice(0, maximum);
}

function boundedInteger(value, path, minimum, maximum, fallback) {
  const candidate = value == null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw performanceError('LOAD_SCENARIO_INVALID', 'A bounded integer is invalid.', [{ path, message: `Must be between ${minimum} and ${maximum}.` }]);
  }
  return candidate;
}

function boundedNumber(value, path, minimum, maximum, fallback) {
  const candidate = value == null || value === '' ? fallback : Number(value);
  if (!Number.isFinite(candidate) || candidate < minimum || candidate > maximum) {
    throw performanceError('PERFORMANCE_VALUE_INVALID', 'A bounded number is invalid.', [{ path, message: `Must be between ${minimum} and ${maximum}.` }]);
  }
  return Math.round(candidate * 1_000) / 1_000;
}

function allowlistedValue(value, allowed, path, fallback, code = 'LOAD_SCENARIO_INVALID') {
  if (value === undefined || value === null || value === '') return fallback;
  if (!allowed.includes(value)) throw performanceError(code, `${path} is not allowlisted.`, [{ path, message: 'Use a registered bounded value.' }]);
  return value;
}

function assertSafeObject(value, options = {}, path = 'value', depth = 0, seen = new WeakSet()) {
  const maximumDepth = options.maximumDepth || 8;
  const maximumEntries = options.maximumEntries || PERFORMANCE_LIMITS.maximumSafeArray;
  if (depth > maximumDepth) throw performanceError('PERFORMANCE_DATA_UNSAFE', 'Performance data exceeds the maximum depth.');
  if (value == null || typeof value === 'boolean') return true;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw performanceError('PERFORMANCE_DATA_UNSAFE', 'Performance data contains a non-finite number.');
    return true;
  }
  if (typeof value === 'string') {
    if (value.length > 16_384 || SECRET_VALUE.test(value)) throw performanceError('PERFORMANCE_DATA_UNSAFE', 'Performance data contains a prohibited value.');
    return true;
  }
  if (typeof value !== 'object' || typeof value === 'function') throw performanceError('PERFORMANCE_DATA_UNSAFE', 'Performance data contains an unsupported value.');
  if (seen.has(value)) throw performanceError('PERFORMANCE_DATA_UNSAFE', 'Performance data must not contain cycles.');
  seen.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some((entry) => entry.get || entry.set)) throw performanceError('PERFORMANCE_DATA_UNSAFE', 'Performance data must not contain accessors.');
  const entries = Object.entries(descriptors);
  if (entries.length > maximumEntries) throw performanceError('PERFORMANCE_DATA_UNSAFE', 'Performance data exceeds the entry limit.');
  for (const [key, descriptor] of entries) {
    const executableKey = EXECUTABLE_KEY.test(key) || (/code$/i.test(key) && !/^safeReasonCodes?$/i.test(key));
    if (SENSITIVE_KEY.test(key) || (options.rejectExecutable !== false && executableKey)) {
      throw performanceError(options.executableCode || 'PERFORMANCE_DATA_UNSAFE', `The field ${path}.${key} is prohibited.`);
    }
    assertSafeObject(descriptor.value, options, `${path}.${key}`, depth + 1, seen);
  }
  seen.delete(value);
  return true;
}

function safeClone(value, options = {}) {
  assertSafeObject(value, options);
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function safeRedact(value, depth = 0, seen = new WeakSet()) {
  if (depth > 8) return '[TRUNCATED]';
  if (value == null || ['number', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'string') return SECRET_VALUE.test(value) ? '[REDACTED]' : value.slice(0, 16_384);
  if (typeof value !== 'object' || seen.has(value)) return '[REDACTED]';
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.slice(0, PERFORMANCE_LIMITS.maximumSafeArray).map((item) => safeRedact(item, depth + 1, seen));
    seen.delete(value);
    return result;
  }
  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, PERFORMANCE_LIMITS.maximumSafeArray)) {
    if (SENSITIVE_KEY.test(key) || EXECUTABLE_KEY.test(key)) continue;
    result[key] = safeRedact(item, depth + 1, seen);
  }
  seen.delete(value);
  return result;
}

function stableHash(value) {
  return `sha256:${crypto.createHash('sha256').update(canonicalize(value)).digest('hex')}`;
}

function getWorkloadDomain(workloadDomain) {
  const definition = WORKLOAD_DOMAINS[String(workloadDomain || '')];
  if (!definition) throw performanceError('LOAD_SCENARIO_INVALID', 'The workload domain is not registered.', [{ path: 'workloadDomain', message: 'Unsupported workload domain.' }]);
  return { workloadDomain: String(workloadDomain), ...definition };
}

function listWorkloadDomains() {
  return WORKLOAD_DOMAIN_IDS.map(getWorkloadDomain);
}

function listTargets() {
  return PERFORMANCE_TARGETS.map((target) => ({ ...target, allowedModes: [...target.allowedModes], allowedWorkloadDomains: [...target.allowedWorkloadDomains], residencyTags: [...target.residencyTags] }));
}

function getTarget(targetId) {
  const target = PERFORMANCE_TARGETS.find((entry) => entry.targetId === String(targetId || ''));
  if (!target) throw performanceError('LOAD_SCENARIO_TARGET_NOT_ALLOWED', 'The performance target is not allowlisted.');
  return { ...target };
}

function normalizeRequestMix(entries, primaryDomain) {
  const source = entries?.length ? entries : [{ workloadDomain: primaryDomain, weightBasisPoints: 10_000 }];
  if (!Array.isArray(source) || source.length > PERFORMANCE_LIMITS.maximumRequestMixEntries) throw performanceError('LOAD_SCENARIO_INVALID', 'The request mix is invalid.');
  const normalized = source.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw performanceError('LOAD_SCENARIO_INVALID', 'The request mix is invalid.');
    const keys = Object.keys(entry);
    if (keys.some((key) => !['workloadDomain', 'weightBasisPoints'].includes(key))) throw performanceError('LOAD_SCENARIO_INVALID', 'Request mix entries may only reference registered workloads and weights.');
    getWorkloadDomain(entry.workloadDomain);
    return {
      workloadDomain: entry.workloadDomain,
      weightBasisPoints: boundedInteger(entry.weightBasisPoints, `requestMix.${index}.weightBasisPoints`, 1, 10_000, 1),
    };
  });
  if (normalized.reduce((sum, entry) => sum + entry.weightBasisPoints, 0) !== 10_000) throw performanceError('LOAD_SCENARIO_INVALID', 'Request mix weights must total 10,000 basis points.');
  return normalized;
}

function normalizeConditions(entries, path) {
  if (entries == null) return [];
  if (!Array.isArray(entries) || entries.length > PERFORMANCE_LIMITS.maximumStopConditions) throw performanceError('LOAD_SCENARIO_INVALID', `${path} is invalid.`);
  return entries.map((entry, index) => {
    const category = typeof entry === 'string' ? entry : entry?.category || entry?.conditionType;
    if (!ALLOWED_ABORT_CONDITIONS.has(category)) throw performanceError('LOAD_SCENARIO_INVALID', `${path}.${index} is not an allowlisted condition.`);
    const threshold = typeof entry === 'object' && entry.threshold != null ? boundedInteger(entry.threshold, `${path}.${index}.threshold`, 0, 1_000_000, 0) : undefined;
    return {
      conditionType: category,
      ...(threshold == null ? {} : { threshold }),
      safeReasonCode: `PERFORMANCE_${category.toUpperCase()}`,
      enabled: true,
    };
  });
}

function normalizeStages(stages, scenario) {
  const source = stages?.length ? stages : [
    ...(scenario.warmupDurationMs ? [{ stageName: 'warmup', durationMs: scenario.warmupDurationMs }] : []),
    { stageName: 'steady_state', durationMs: scenario.steadyStateDurationMs },
    ...(scenario.cooldownDurationMs ? [{ stageName: 'cooldown', durationMs: scenario.cooldownDurationMs, targetConcurrency: 0, targetRequestsPerSecond: 0 }] : []),
  ];
  if (!Array.isArray(source) || source.length < 1 || source.length > PERFORMANCE_LIMITS.maximumStages) throw performanceError('LOAD_SCENARIO_INVALID', 'Traffic stages are invalid.');
  return source.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw performanceError('LOAD_SCENARIO_INVALID', 'Traffic stages are invalid.');
    const allowed = new Set(['stageName', 'order', 'durationMs', 'targetConcurrency', 'targetRequestsPerSecond', 'workloadMixOverrides', 'expectedBackpressureState', 'expectedAdmissionOutcomeCategory']);
    if (Object.keys(entry).some((key) => !allowed.has(key))) throw performanceError('LOAD_SCENARIO_INVALID', 'Traffic stages contain an unsupported field.');
    const stage = {
      stageName: safeIdentifier(entry.stageName || `stage-${index + 1}`, `stageDefinitions.${index}.stageName`),
      order: boundedInteger(entry.order, `stageDefinitions.${index}.order`, 1, PERFORMANCE_LIMITS.maximumStages, index + 1),
      durationMs: boundedInteger(entry.durationMs, `stageDefinitions.${index}.durationMs`, 1, PERFORMANCE_LIMITS.maximumStageDurationMs, scenario.steadyStateDurationMs),
      targetConcurrency: boundedInteger(entry.targetConcurrency, `stageDefinitions.${index}.targetConcurrency`, 0, scenario.maximumConcurrency, scenario.targetConcurrency),
      targetRequestsPerSecond: boundedInteger(entry.targetRequestsPerSecond, `stageDefinitions.${index}.targetRequestsPerSecond`, 0, scenario.maximumRequestsPerSecond, scenario.targetRequestsPerSecond),
      expectedBackpressureState: allowlistedValue(entry.expectedBackpressureState, ['normal', 'elevated', 'saturated', 'shedding', 'paused', 'any'], `stageDefinitions.${index}.expectedBackpressureState`, 'any'),
      expectedAdmissionOutcomeCategory: allowlistedValue(entry.expectedAdmissionOutcomeCategory, ['accepted', 'deferred', 'rejected', 'mixed', 'any'], `stageDefinitions.${index}.expectedAdmissionOutcomeCategory`, 'any'),
    };
    if (entry.workloadMixOverrides) stage.workloadMixOverrides = normalizeRequestMix(entry.workloadMixOverrides, scenario.workloadDomain);
    return stage;
  }).sort((left, right) => left.order - right.order);
}

function scenarioModeLimits(mode) {
  if (mode === 'local_smoke') return { duration: PERFORMANCE_LIMITS.smokeMaximumDurationMs, concurrency: PERFORMANCE_LIMITS.smokeMaximumConcurrency, rate: PERFORMANCE_LIMITS.smokeMaximumRequestsPerSecond, fixtures: 500 };
  if (['simulation', 'integration_load'].includes(mode)) return { duration: PERFORMANCE_LIMITS.automatedMaximumDurationMs, concurrency: PERFORMANCE_LIMITS.automatedMaximumConcurrency, rate: PERFORMANCE_LIMITS.automatedMaximumRequestsPerSecond, fixtures: PERFORMANCE_LIMITS.automatedMaximumFixtureCount };
  return { duration: PERFORMANCE_LIMITS.maximumDurationMs, concurrency: PERFORMANCE_LIMITS.maximumConcurrency, rate: PERFORMANCE_LIMITS.maximumRequestsPerSecond, fixtures: PERFORMANCE_LIMITS.maximumFixtureCount };
}

function normalizeScenario(input = {}, previous = {}) {
  assertSafeObject(input, { rejectExecutable: true, executableCode: 'LOAD_SCENARIO_INVALID' }, 'scenario');
  const merged = { ...previous, ...input };
  const mode = allowlistedValue(merged.testMode, PERFORMANCE_TEST_MODES, 'testMode', 'simulation', 'LOAD_SCENARIO_MODE_NOT_ALLOWED');
  const domain = getWorkloadDomain(merged.workloadDomain || 'interactive_api');
  const limits = scenarioModeLimits(mode);
  const observationOnly = mode === 'production_observation_only';
  const targetConcurrency = boundedInteger(merged.targetConcurrency, 'targetConcurrency', observationOnly ? 0 : 1, limits.concurrency, observationOnly ? 0 : 1);
  const concurrencyCeiling = observationOnly ? 0 : Math.min(limits.concurrency, domain.maximumConcurrency);
  const maximumConcurrency = boundedInteger(merged.maximumConcurrency, 'maximumConcurrency', targetConcurrency, concurrencyCeiling, observationOnly ? 0 : Math.max(targetConcurrency, concurrencyCeiling));
  const targetRequestsPerSecond = boundedInteger(merged.targetRequestsPerSecond, 'targetRequestsPerSecond', observationOnly ? 0 : 1, limits.rate, observationOnly ? 0 : 1);
  const rateCeiling = observationOnly ? 0 : Math.min(limits.rate, domain.maximumRequestsPerSecond);
  const maximumRequestsPerSecond = boundedInteger(merged.maximumRequestsPerSecond, 'maximumRequestsPerSecond', targetRequestsPerSecond, rateCeiling, observationOnly ? 0 : Math.max(targetRequestsPerSecond, rateCeiling));
  const warmupDurationMs = boundedInteger(merged.warmupDurationMs, 'warmupDurationMs', 0, limits.duration, observationOnly ? 0 : 1_000);
  const steadyStateDurationMs = boundedInteger(merged.steadyStateDurationMs, 'steadyStateDurationMs', 1, limits.duration, observationOnly ? 5_000 : 5_000);
  const cooldownDurationMs = boundedInteger(merged.cooldownDurationMs, 'cooldownDurationMs', 0, limits.duration, observationOnly ? 0 : 1_000);
  const durationMs = boundedInteger(merged.durationMs, 'durationMs', 1, limits.duration, warmupDurationMs + steadyStateDurationMs + cooldownDurationMs);
  const scenario = {
    scope: allowlistedValue(merged.scope, [...ALLOWED_SCOPE], 'scope', 'workspace'),
    organizationId: safeIdentifier(merged.organizationId, 'organizationId', merged.scope === 'platform' ? false : true),
    workspaceId: safeIdentifier(merged.workspaceId, 'workspaceId', !['platform', 'organization'].includes(merged.scope)),
    name: safeText(merged.name || 'Performance scenario', 120),
    description: safeText(merged.description, 1_000),
    version: boundedInteger(merged.version, 'version', 1, 1_000_000, 1),
    status: allowlistedValue(merged.status, ['draft', 'active', 'archived'], 'status', 'draft'),
    testMode: mode,
    workloadDomain: domain.workloadDomain,
    criticality: allowlistedValue(merged.criticality, ['low', 'standard', 'high', 'critical'], 'criticality', 'standard'),
    trafficModel: allowlistedValue(merged.trafficModel, TRAFFIC_MODELS, 'trafficModel', 'closed_loop'),
    durationMs,
    warmupDurationMs,
    steadyStateDurationMs,
    cooldownDurationMs,
    targetConcurrency,
    maximumConcurrency,
    targetRequestsPerSecond,
    maximumRequestsPerSecond,
    tenantCount: boundedInteger(merged.tenantCount, 'tenantCount', 1, PERFORMANCE_LIMITS.maximumTenantCount, 1),
    workspaceCount: boundedInteger(merged.workspaceCount, 'workspaceCount', 1, PERFORMANCE_LIMITS.maximumWorkspaceCount, 1),
    userCount: boundedInteger(merged.userCount, 'userCount', 1, PERFORMANCE_LIMITS.maximumUserCount, 1),
    orchestrationDefinitionCount: boundedInteger(merged.orchestrationDefinitionCount, 'orchestrationDefinitionCount', 0, limits.fixtures, 0),
    mockAgentCount: boundedInteger(merged.mockAgentCount, 'mockAgentCount', 0, limits.fixtures, 0),
    workerCount: boundedInteger(merged.workerCount, 'workerCount', 0, 100, 1),
    fixtureProfile: allowlistedValue(merged.fixtureProfile, ['minimal', 'standard', 'orchestration', 'regional'], 'fixtureProfile', 'minimal'),
    fixtureSeed: boundedInteger(merged.fixtureSeed, 'fixtureSeed', 1, 2_147_483_647, 13_004),
    performanceBudgetPolicyId: safeIdentifier(merged.performanceBudgetPolicyId, 'performanceBudgetPolicyId', false),
    performanceBudgetPolicyVersion: boundedInteger(merged.performanceBudgetPolicyVersion, 'performanceBudgetPolicyVersion', 1, 1_000_000, 1),
    failureInjectionProfileId: safeIdentifier(merged.failureInjectionProfileId, 'failureInjectionProfileId', false),
    regionalSimulationProfileId: safeIdentifier(merged.regionalSimulationProfileId, 'regionalSimulationProfileId', false),
    targetId: safeIdentifier(merged.targetId || (observationOnly ? 'production-observation-v1' : 'local-in-process-v1'), 'targetId'),
    dataClassification: allowlistedValue(merged.dataClassification, ['synthetic', 'internal_test'], 'dataClassification', 'synthetic'),
    residencyTag: safeIdentifier(merged.residencyTag || (observationOnly ? 'production-observation' : 'synthetic-local'), 'residencyTag'),
    cleanupPolicy: allowlistedValue(merged.cleanupPolicy, [...ALLOWED_CLEANUP_POLICIES], 'cleanupPolicy', 'delete_fixture_set'),
  };
  scenario.requestMix = normalizeRequestMix(merged.requestMix, scenario.workloadDomain);
  scenario.abortConditions = normalizeConditions(merged.abortConditions || ['correctness_violation', 'security_violation', 'cross_tenant_response', 'credential_pattern'], 'abortConditions');
  scenario.stopConditions = normalizeConditions(merged.stopConditions || [], 'stopConditions');
  scenario.stageDefinitions = normalizeStages(merged.stageDefinitions || merged.rampProfile, scenario);
  let offsetMs = 0;
  scenario.rampProfile = scenario.stageDefinitions.map((stage) => {
    const point = { offsetMs, targetConcurrency: stage.targetConcurrency, targetRequestsPerSecond: stage.targetRequestsPerSecond };
    offsetMs += stage.durationMs;
    return point;
  });
  return scenario;
}

function validateScenario(input = {}, options = {}) {
  try {
    const scenario = normalizeScenario(input, input);
    const reasons = [];
    const target = getTarget(scenario.targetId);
    const domain = getWorkloadDomain(scenario.workloadDomain);
    if (!target.enabled) reasons.push('LOAD_SCENARIO_TARGET_NOT_ALLOWED');
    if (!target.allowedModes.includes(scenario.testMode) || !domain.supportedModes.includes(scenario.testMode)) reasons.push('LOAD_SCENARIO_MODE_NOT_ALLOWED');
    if (!target.allowedWorkloadDomains.includes(scenario.workloadDomain)) reasons.push('LOAD_SCENARIO_TARGET_NOT_ALLOWED');
    if (scenario.durationMs > target.maximumDurationMs || scenario.warmupDurationMs + scenario.steadyStateDurationMs + scenario.cooldownDurationMs > scenario.durationMs) reasons.push('LOAD_SCENARIO_DURATION_EXCEEDED');
    if (scenario.maximumConcurrency > target.maximumConcurrency || scenario.maximumConcurrency > domain.maximumConcurrency) reasons.push('LOAD_SCENARIO_CONCURRENCY_EXCEEDED');
    if (scenario.maximumRequestsPerSecond > target.maximumRequestRate || scenario.maximumRequestsPerSecond > domain.maximumRequestsPerSecond) reasons.push('LOAD_SCENARIO_RATE_EXCEEDED');
    const fixtureCount = scenario.tenantCount + scenario.workspaceCount + scenario.userCount + scenario.orchestrationDefinitionCount + scenario.mockAgentCount;
    if (fixtureCount > scenarioModeLimits(scenario.testMode).fixtures || fixtureCount > domain.maximumFixtureCount) reasons.push('LOAD_SCENARIO_FIXTURE_LIMIT_EXCEEDED');
    if (scenario.stageDefinitions.some((stage, index) => stage.order !== index + 1)) reasons.push('LOAD_SCENARIO_INVALID');
    if (!scenario.performanceBudgetPolicyId && options.requireBudget !== false) reasons.push('LOAD_SCENARIO_BUDGET_MISSING');
    if (options.budget && (options.budget.workloadDomain && options.budget.workloadDomain !== scenario.workloadDomain)) reasons.push('LOAD_SCENARIO_BUDGET_MISSING');
    if (options.allowedResidencyTags && !options.allowedResidencyTags.includes(scenario.residencyTag)) reasons.push('LOAD_SCENARIO_RESIDENCY_DENIED');
    if (options.policyAllowed === false) reasons.push('LOAD_SCENARIO_MODE_NOT_ALLOWED');
    if (options.operationalStateAllowed === false) reasons.push('LOAD_SCENARIO_OPERATIONAL_STATE_DENIED');
    if (scenario.testMode === 'production_observation_only' && (scenario.targetConcurrency !== 0 || scenario.targetRequestsPerSecond !== 0 || target.category !== 'production_metrics_only')) reasons.push('LOAD_SCENARIO_TARGET_NOT_ALLOWED');
    if (target.category === 'production_metrics_only' && scenario.testMode !== 'production_observation_only') reasons.push('LOAD_SCENARIO_TARGET_NOT_ALLOWED');
    if (['soak', 'stress'].includes(scenario.trafficModel) && !['simulation', 'staging_stress', 'staging_soak'].includes(scenario.testMode)) reasons.push('LOAD_SCENARIO_MODE_NOT_ALLOWED');
    const uniqueReasons = [...new Set(reasons)];
    return {
      valid: uniqueReasons.length === 0,
      safeReasonCodes: uniqueReasons,
      requiresApproval: target.requiresApproval || ['staging_stress', 'staging_soak'].includes(scenario.testMode) || scenario.maximumConcurrency > PERFORMANCE_LIMITS.automatedMaximumConcurrency || Boolean(scenario.failureInjectionProfileId),
      manualOnly: target.requiresManualExecution || ['local_load', 'staging_load', 'staging_stress', 'staging_soak'].includes(scenario.testMode),
      scenario,
      targetCategory: target.category,
    };
  } catch (error) {
    return { valid: false, safeReasonCodes: [error.code || 'LOAD_SCENARIO_INVALID'] };
  }
}

function defaultBudget(input = {}) {
  return {
    scope: input.scope || 'workspace',
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
    orchestrationDefinitionId: input.orchestrationDefinitionId,
    workloadDomain: input.workloadDomain,
    name: input.name || 'Standard performance budget',
    description: input.description || 'Deterministic bounded performance expectations.',
    version: input.version || 1,
    status: input.status || 'draft',
    minimumSampleSize: 20,
    maximumErrorRateBasisPoints: 500,
    maximumUnexpectedFailureRateBasisPoints: 100,
    maximumTimeoutRateBasisPoints: 100,
    maximumRetryRateBasisPoints: 1_000,
    maximumOverloadRejectionRateBasisPoints: 2_500,
    maximumQuotaRejectionRateBasisPoints: 1_000,
    latencyBudgets: { p50Ms: 500, p90Ms: 1_000, p95Ms: 2_000, p99Ms: 5_000, maximumMs: 10_000 },
    queueBudgets: { p50QueueWaitMs: 500, p95QueueWaitMs: 2_000, p99QueueWaitMs: 5_000, maximumOldestQueueAgeMs: 30_000 },
    executionBudgets: { p95NodeExecutionMs: 5_000, p95GatewayExecutionMs: 5_000, p95DatabaseOperationMs: 2_000, p95CacheOperationMs: 500, p95PolicyEvaluationMs: 1_000 },
    orchestrationBudgets: { p95RunDurationMs: 30_000, p99RunDurationMs: 60_000, maximumStuckRunRateBasisPoints: 100, maximumUnknownOutcomeRateBasisPoints: 100 },
    capacityBudgets: { maximumWorkerUtilizationBasisPoints: 9_000, minimumHeadroomBasisPoints: 1_500, maximumDatabasePressureCategory: 'elevated', maximumBackpressureState: 'elevated', maximumLeaseExpiryRateBasisPoints: 100 },
    fairnessBudgets: { maximumTenantServiceSkewBasisPoints: 2_500, maximumTenantStarvationWindowMs: 10_000 },
    recoveryBudgets: { p95RecoveryDurationMs: 30_000, p95CompensationDurationMs: 30_000, minimumRecoverySuccessRateBasisPoints: 9_500 },
    regionalBudgets: { maximumFailoverRtoMs: 120_000, maximumFailoverRpoMs: 30_000, maximumRegionalRoutingErrorRateBasisPoints: 100 },
    regressionToleranceBasisPoints: 1_000,
    absoluteRegressionToleranceMs: 50,
  };
}

function normalizeBudget(input = {}, previous = {}) {
  assertSafeObject(input, { rejectExecutable: true }, 'budget');
  const merged = { ...defaultBudget({ ...previous, ...input }), ...previous, ...input };
  const basisPoint = (key, fallback) => boundedInteger(merged[key], key, 0, 10_000, fallback);
  const latency = { ...defaultBudget().latencyBudgets, ...(previous.latencyBudgets || {}), ...(input.latencyBudgets || {}) };
  const queue = { ...defaultBudget().queueBudgets, ...(previous.queueBudgets || {}), ...(input.queueBudgets || {}) };
  const execution = { ...defaultBudget().executionBudgets, ...(previous.executionBudgets || {}), ...(input.executionBudgets || {}) };
  const orchestration = { ...defaultBudget().orchestrationBudgets, ...(previous.orchestrationBudgets || {}), ...(input.orchestrationBudgets || {}) };
  const capacity = { ...defaultBudget().capacityBudgets, ...(previous.capacityBudgets || {}), ...(input.capacityBudgets || {}) };
  const fairness = { ...defaultBudget().fairnessBudgets, ...(previous.fairnessBudgets || {}), ...(input.fairnessBudgets || {}) };
  const recovery = { ...defaultBudget().recoveryBudgets, ...(previous.recoveryBudgets || {}), ...(input.recoveryBudgets || {}) };
  const regional = { ...defaultBudget().regionalBudgets, ...(previous.regionalBudgets || {}), ...(input.regionalBudgets || {}) };
  const ms = (object, key, maximum = 86_400_000) => boundedInteger(object[key], key, 1, maximum, defaultBudget()[Object.keys(defaultBudget()).find((name) => defaultBudget()[name] && defaultBudget()[name][key] != null)]?.[key] || 1_000);
  return {
    scope: allowlistedValue(merged.scope, [...ALLOWED_BUDGET_SCOPE], 'scope', 'workspace', 'PERFORMANCE_BUDGET_INVALID'),
    organizationId: safeIdentifier(merged.organizationId, 'organizationId', merged.scope === 'platform' ? false : true),
    workspaceId: safeIdentifier(merged.workspaceId, 'workspaceId', ['workspace', 'orchestration_definition'].includes(merged.scope || 'workspace')),
    orchestrationDefinitionId: safeIdentifier(merged.orchestrationDefinitionId, 'orchestrationDefinitionId', false),
    workloadDomain: merged.workloadDomain ? getWorkloadDomain(merged.workloadDomain).workloadDomain : undefined,
    name: safeText(merged.name, 120), description: safeText(merged.description, 1_000),
    version: boundedInteger(merged.version, 'version', 1, 1_000_000, 1),
    status: allowlistedValue(merged.status, ['draft', 'active', 'archived'], 'status', 'draft', 'PERFORMANCE_BUDGET_INVALID'),
    minimumSampleSize: boundedInteger(merged.minimumSampleSize, 'minimumSampleSize', 1, 1_000_000, 20),
    maximumErrorRateBasisPoints: basisPoint('maximumErrorRateBasisPoints', 500),
    maximumUnexpectedFailureRateBasisPoints: basisPoint('maximumUnexpectedFailureRateBasisPoints', 100),
    maximumTimeoutRateBasisPoints: basisPoint('maximumTimeoutRateBasisPoints', 100),
    maximumRetryRateBasisPoints: basisPoint('maximumRetryRateBasisPoints', 1_000),
    maximumOverloadRejectionRateBasisPoints: basisPoint('maximumOverloadRejectionRateBasisPoints', 2_500),
    maximumQuotaRejectionRateBasisPoints: basisPoint('maximumQuotaRejectionRateBasisPoints', 1_000),
    latencyBudgets: { p50Ms: ms(latency, 'p50Ms'), p90Ms: ms(latency, 'p90Ms'), p95Ms: ms(latency, 'p95Ms'), p99Ms: ms(latency, 'p99Ms'), maximumMs: ms(latency, 'maximumMs') },
    queueBudgets: { p50QueueWaitMs: ms(queue, 'p50QueueWaitMs'), p95QueueWaitMs: ms(queue, 'p95QueueWaitMs'), p99QueueWaitMs: ms(queue, 'p99QueueWaitMs'), maximumOldestQueueAgeMs: ms(queue, 'maximumOldestQueueAgeMs') },
    executionBudgets: { p95NodeExecutionMs: ms(execution, 'p95NodeExecutionMs'), p95GatewayExecutionMs: ms(execution, 'p95GatewayExecutionMs'), p95DatabaseOperationMs: ms(execution, 'p95DatabaseOperationMs'), p95CacheOperationMs: ms(execution, 'p95CacheOperationMs'), p95PolicyEvaluationMs: ms(execution, 'p95PolicyEvaluationMs') },
    orchestrationBudgets: { p95RunDurationMs: ms(orchestration, 'p95RunDurationMs'), p99RunDurationMs: ms(orchestration, 'p99RunDurationMs'), maximumStuckRunRateBasisPoints: boundedInteger(orchestration.maximumStuckRunRateBasisPoints, 'maximumStuckRunRateBasisPoints', 0, 10_000, 100), maximumUnknownOutcomeRateBasisPoints: boundedInteger(orchestration.maximumUnknownOutcomeRateBasisPoints, 'maximumUnknownOutcomeRateBasisPoints', 0, 10_000, 100) },
    capacityBudgets: { maximumWorkerUtilizationBasisPoints: boundedInteger(capacity.maximumWorkerUtilizationBasisPoints, 'maximumWorkerUtilizationBasisPoints', 1, 10_000, 9_000), minimumHeadroomBasisPoints: boundedInteger(capacity.minimumHeadroomBasisPoints, 'minimumHeadroomBasisPoints', 0, 10_000, 1_500), maximumDatabasePressureCategory: allowlistedValue(capacity.maximumDatabasePressureCategory, ['healthy', 'elevated', 'degraded', 'unavailable'], 'maximumDatabasePressureCategory', 'elevated', 'PERFORMANCE_BUDGET_INVALID'), maximumBackpressureState: allowlistedValue(capacity.maximumBackpressureState, ['normal', 'elevated', 'saturated', 'shedding', 'paused'], 'maximumBackpressureState', 'elevated', 'PERFORMANCE_BUDGET_INVALID'), maximumLeaseExpiryRateBasisPoints: boundedInteger(capacity.maximumLeaseExpiryRateBasisPoints, 'maximumLeaseExpiryRateBasisPoints', 0, 10_000, 100) },
    fairnessBudgets: { maximumTenantServiceSkewBasisPoints: boundedInteger(fairness.maximumTenantServiceSkewBasisPoints, 'maximumTenantServiceSkewBasisPoints', 0, 10_000, 2_500), maximumTenantStarvationWindowMs: ms(fairness, 'maximumTenantStarvationWindowMs') },
    recoveryBudgets: { p95RecoveryDurationMs: ms(recovery, 'p95RecoveryDurationMs'), p95CompensationDurationMs: ms(recovery, 'p95CompensationDurationMs'), minimumRecoverySuccessRateBasisPoints: boundedInteger(recovery.minimumRecoverySuccessRateBasisPoints, 'minimumRecoverySuccessRateBasisPoints', 0, 10_000, 9_500) },
    regionalBudgets: { maximumFailoverRtoMs: ms(regional, 'maximumFailoverRtoMs'), maximumFailoverRpoMs: ms(regional, 'maximumFailoverRpoMs'), maximumRegionalRoutingErrorRateBasisPoints: boundedInteger(regional.maximumRegionalRoutingErrorRateBasisPoints, 'maximumRegionalRoutingErrorRateBasisPoints', 0, 10_000, 100) },
    regressionToleranceBasisPoints: boundedInteger(merged.regressionToleranceBasisPoints, 'regressionToleranceBasisPoints', 0, 10_000, 1_000),
    absoluteRegressionToleranceMs: boundedInteger(merged.absoluteRegressionToleranceMs, 'absoluteRegressionToleranceMs', 0, 86_400_000, 50),
  };
}

function validateBudget(input = {}) {
  try {
    const budget = normalizeBudget(input, input);
    const reasons = [];
    const latency = budget.latencyBudgets;
    if (!(latency.p50Ms <= latency.p90Ms && latency.p90Ms <= latency.p95Ms && latency.p95Ms <= latency.p99Ms && latency.p99Ms <= latency.maximumMs)) reasons.push('PERFORMANCE_BUDGET_LATENCY_ORDER_INVALID');
    if (!(budget.queueBudgets.p50QueueWaitMs <= budget.queueBudgets.p95QueueWaitMs && budget.queueBudgets.p95QueueWaitMs <= budget.queueBudgets.p99QueueWaitMs && budget.queueBudgets.p99QueueWaitMs <= budget.queueBudgets.maximumOldestQueueAgeMs)) reasons.push('PERFORMANCE_BUDGET_QUEUE_ORDER_INVALID');
    if (budget.scope === 'workload_domain' && !budget.workloadDomain) reasons.push('PERFORMANCE_BUDGET_SCOPE_INVALID');
    if (budget.scope === 'orchestration_definition' && !budget.orchestrationDefinitionId) reasons.push('PERFORMANCE_BUDGET_SCOPE_INVALID');
    return { valid: reasons.length === 0, safeReasonCodes: reasons, budget };
  } catch (error) {
    return { valid: false, safeReasonCodes: [error.code || 'PERFORMANCE_BUDGET_INVALID'] };
  }
}

function createHistogram(values = [], buckets = HISTOGRAM_BUCKETS_MS) {
  if (!Array.isArray(values) || values.length > 1_000_000) throw performanceError('PERFORMANCE_MEASUREMENT_INVALID', 'Histogram samples are invalid.');
  const safeBuckets = [...new Set(buckets.map(Number))].filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b).slice(0, PERFORMANCE_LIMITS.maximumHistogramBuckets);
  const counts = Array(safeBuckets.length + 1).fill(0);
  let sum = 0; let maximum = 0;
  for (const raw of values) {
    const value = Math.max(0, Number(raw) || 0);
    const index = safeBuckets.findIndex((upperBound) => value <= upperBound);
    counts[index === -1 ? safeBuckets.length : index] += 1;
    sum += value; maximum = Math.max(maximum, value);
  }
  return { buckets: safeBuckets, counts, count: values.length, sum: Math.round(sum * 1_000) / 1_000, maximum: Math.round(maximum * 1_000) / 1_000 };
}

function mergeHistograms(histograms = []) {
  if (!histograms.length) return createHistogram([]);
  const buckets = histograms[0].buckets;
  if (histograms.some((entry) => JSON.stringify(entry.buckets) !== JSON.stringify(buckets))) throw performanceError('PERFORMANCE_HISTOGRAM_INCOMPATIBLE', 'Histogram buckets are incompatible.');
  return histograms.reduce((result, entry) => ({
    buckets,
    counts: result.counts.map((count, index) => count + Number(entry.counts[index] || 0)),
    count: result.count + Number(entry.count || 0),
    sum: result.sum + Number(entry.sum || 0),
    maximum: Math.max(result.maximum, Number(entry.maximum || 0)),
  }), { buckets, counts: Array(buckets.length + 1).fill(0), count: 0, sum: 0, maximum: 0 });
}

function percentileFromValues(values = [], percentile) {
  if (!values.length) return 0;
  const sorted = values.map((value) => Math.max(0, Number(value) || 0)).sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((Number(percentile) / 100) * sorted.length));
  return sorted[Math.min(sorted.length - 1, rank - 1)];
}

function percentileFromHistogram(histogram, percentile) {
  if (!histogram?.count) return 0;
  const rank = Math.max(1, Math.ceil((Number(percentile) / 100) * histogram.count));
  let cumulative = 0;
  for (let index = 0; index < histogram.counts.length; index += 1) {
    cumulative += histogram.counts[index];
    if (cumulative >= rank) return index < histogram.buckets.length ? histogram.buckets[index] : histogram.maximum;
  }
  return histogram.maximum;
}

function percentileSummary(input = []) {
  const exact = Array.isArray(input);
  const histogram = exact ? createHistogram(input) : input;
  const percentile = (value) => exact ? percentileFromValues(input, value) : percentileFromHistogram(histogram, value);
  return { p50Ms: percentile(50), p90Ms: percentile(90), p95Ms: percentile(95), p99Ms: percentile(99), maximumMs: histogram?.maximum || 0, sampleSize: histogram?.count || 0, histogram };
}

function classifyOutcome(input = {}) {
  if (input.correctnessViolation) return 'correctness_failure';
  if (input.securityViolation || input.credentialLeak || input.crossTenantData) return 'security_failure';
  if (input.cancelled) return 'cancelled';
  if (input.timeout) return 'timeout';
  if (input.retry) return 'retry';
  if (input.unknownOutcome) return 'unknown_outcome';
  if (input.statusCode >= 200 && input.statusCode < 300) return 'success';
  if (input.statusCode === 429 && input.reasonCode?.includes('QUOTA')) return 'quota_rejection';
  if ([429, 503].includes(input.statusCode) && ['OVERLOAD', 'CAPACITY', 'BACKPRESSURE', 'RATE_LIMIT'].some((code) => String(input.reasonCode || '').includes(code))) return 'overload_rejection';
  if (input.expected === true || [403, 409].includes(input.statusCode)) return 'expected_rejection';
  return 'internal_failure';
}

function rateBasisPoints(count, total) {
  return total > 0 ? Math.round((Math.max(0, Number(count) || 0) / total) * 10_000) : 0;
}

function summarizeMeasurements(samples = [], options = {}) {
  const steady = samples.filter((sample) => options.includeWarmup === true || sample.stage !== 'warmup').filter((sample) => sample.stage !== 'cooldown');
  const counts = { success: 0, expected_rejection: 0, overload_rejection: 0, quota_rejection: 0, timeout: 0, retry: 0, cancelled: 0, unknown_outcome: 0, internal_failure: 0, correctness_failure: 0, security_failure: 0 };
  for (const sample of steady) counts[classifyOutcome(sample)] += 1;
  const durationMs = Math.max(1, Number(options.steadyStateDurationMs || steady.reduce((maximum, sample) => Math.max(maximum, Number(sample.completedAtMs || 0)), 0) - steady.reduce((minimum, sample) => Math.min(minimum, Number(sample.startedAtMs || Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER) || 1));
  const latencies = steady.map((sample) => Number(sample.latencyMs || 0));
  const queueWaits = steady.map((sample) => Number(sample.queueWaitMs || 0));
  return {
    requestCount: steady.length,
    successfulRequestCount: counts.success,
    expectedRejectionCount: counts.expected_rejection + counts.overload_rejection + counts.quota_rejection,
    overloadRejectionCount: counts.overload_rejection,
    quotaRejectionCount: counts.quota_rejection,
    unexpectedFailureCount: counts.internal_failure + counts.correctness_failure + counts.security_failure,
    timeoutCount: counts.timeout,
    retryCount: counts.retry,
    cancelledCount: counts.cancelled,
    unknownOutcomeCount: counts.unknown_outcome,
    correctnessViolationCount: counts.correctness_failure,
    securityViolationCount: counts.security_failure,
    latencyPercentiles: percentileSummary(latencies),
    queueSummary: { ...percentileSummary(queueWaits), oldestQueueAgeMs: Math.max(0, ...queueWaits) },
    throughputSummary: { requestsPerSecond: Math.round((steady.length / (durationMs / 1_000)) * 1_000) / 1_000, durationMs },
    outcomeCounts: counts,
  };
}

function evaluateBudget(summary = {}, budgetInput = {}, context = {}) {
  const validation = validateBudget(budgetInput);
  if (!validation.valid) return { status: 'failed', safeReasonCodes: validation.safeReasonCodes, checks: [] };
  const budget = validation.budget;
  if (context.aborted) return { status: 'aborted', safeReasonCodes: [context.abortReasonCode || 'PERFORMANCE_RUN_ABORTED'], checks: [] };
  if (context.environmentCompatible === false) return { status: 'incompatible_environment', safeReasonCodes: ['PERFORMANCE_ENVIRONMENT_INCOMPATIBLE'], checks: [] };
  const sampleSize = Number(summary.requestCount || summary.sampleSize || 0);
  if (sampleSize < budget.minimumSampleSize) return { status: 'insufficient_data', safeReasonCodes: ['PERFORMANCE_SAMPLE_SIZE_INSUFFICIENT'], checks: [{ metric: 'sample_size', actual: sampleSize, budget: budget.minimumSampleSize, passed: false }] };
  const checks = [];
  const checkMaximum = (metric, actual, limit, reasonCode) => checks.push({ metric, actual: Number(actual || 0), budget: limit, passed: Number(actual || 0) <= limit, reasonCode });
  const checkMinimum = (metric, actual, limit, reasonCode) => checks.push({ metric, actual: Number(actual || 0), budget: limit, passed: Number(actual || 0) >= limit, reasonCode });
  const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);
  const totalFailures = Number(summary.unexpectedFailureCount || 0) + Number(summary.timeoutCount || 0) + Number(summary.unknownOutcomeCount || 0);
  checkMaximum('error_rate_basis_points', rateBasisPoints(totalFailures, sampleSize), budget.maximumErrorRateBasisPoints, 'PERFORMANCE_BUDGET_ERROR_RATE_EXCEEDED');
  checkMaximum('unexpected_failure_rate_basis_points', rateBasisPoints(summary.unexpectedFailureCount, sampleSize), budget.maximumUnexpectedFailureRateBasisPoints, 'PERFORMANCE_BUDGET_UNEXPECTED_FAILURE_RATE_EXCEEDED');
  checkMaximum('timeout_rate_basis_points', rateBasisPoints(summary.timeoutCount, sampleSize), budget.maximumTimeoutRateBasisPoints, 'PERFORMANCE_BUDGET_TIMEOUT_RATE_EXCEEDED');
  checkMaximum('retry_rate_basis_points', rateBasisPoints(summary.retryCount, sampleSize), budget.maximumRetryRateBasisPoints, 'PERFORMANCE_BUDGET_RETRY_RATE_EXCEEDED');
  checkMaximum('overload_rejection_rate_basis_points', rateBasisPoints(summary.overloadRejectionCount, sampleSize), budget.maximumOverloadRejectionRateBasisPoints, 'PERFORMANCE_BUDGET_OVERLOAD_RATE_EXCEEDED');
  checkMaximum('quota_rejection_rate_basis_points', rateBasisPoints(summary.quotaRejectionCount, sampleSize), budget.maximumQuotaRejectionRateBasisPoints, 'PERFORMANCE_BUDGET_QUOTA_RATE_EXCEEDED');
  for (const [key, limit] of Object.entries(budget.latencyBudgets)) checkMaximum(`latency_${key}`, summary.latencyPercentiles?.[key], limit, `PERFORMANCE_BUDGET_LATENCY_${key.replace('Ms', '').toUpperCase()}_EXCEEDED`);
  checkMaximum('queue_p50_ms', summary.queueSummary?.p50Ms, budget.queueBudgets.p50QueueWaitMs, 'PERFORMANCE_BUDGET_QUEUE_P50_EXCEEDED');
  checkMaximum('queue_p95_ms', summary.queueSummary?.p95Ms, budget.queueBudgets.p95QueueWaitMs, 'PERFORMANCE_BUDGET_QUEUE_P95_EXCEEDED');
  checkMaximum('queue_p99_ms', summary.queueSummary?.p99Ms, budget.queueBudgets.p99QueueWaitMs, 'PERFORMANCE_BUDGET_QUEUE_P99_EXCEEDED');
  checkMaximum('oldest_queue_age_ms', summary.queueSummary?.oldestQueueAgeMs, budget.queueBudgets.maximumOldestQueueAgeMs, 'PERFORMANCE_BUDGET_QUEUE_AGE_EXCEEDED');
  checkMaximum('node_execution_p95_ms', firstDefined(summary.executionSummary?.p95NodeExecutionMs, summary.nodeSummary?.p95Ms), budget.executionBudgets.p95NodeExecutionMs, 'PERFORMANCE_BUDGET_NODE_EXECUTION_EXCEEDED');
  checkMaximum('gateway_execution_p95_ms', firstDefined(summary.executionSummary?.p95GatewayExecutionMs, summary.gatewaySummary?.p95Ms), budget.executionBudgets.p95GatewayExecutionMs, 'PERFORMANCE_BUDGET_GATEWAY_EXECUTION_EXCEEDED');
  checkMaximum('database_operation_p95_ms', firstDefined(summary.executionSummary?.p95DatabaseOperationMs, summary.databaseSummary?.p95Ms, summary.databaseSummary?.operationP95Ms), budget.executionBudgets.p95DatabaseOperationMs, 'PERFORMANCE_BUDGET_DATABASE_OPERATION_EXCEEDED');
  checkMaximum('cache_operation_p95_ms', firstDefined(summary.executionSummary?.p95CacheOperationMs, summary.cacheSummary?.p95Ms, summary.cacheSummary?.operationP95Ms), budget.executionBudgets.p95CacheOperationMs, 'PERFORMANCE_BUDGET_CACHE_OPERATION_EXCEEDED');
  checkMaximum('policy_evaluation_p95_ms', firstDefined(summary.executionSummary?.p95PolicyEvaluationMs, summary.policySummary?.p95Ms), budget.executionBudgets.p95PolicyEvaluationMs, 'PERFORMANCE_BUDGET_POLICY_EVALUATION_EXCEEDED');
  checkMaximum('run_duration_p95_ms', firstDefined(summary.orchestrationSummary?.p95RunDurationMs, summary.runDurationSummary?.p95Ms, summary.actualDurationMs), budget.orchestrationBudgets.p95RunDurationMs, 'PERFORMANCE_BUDGET_RUN_DURATION_P95_EXCEEDED');
  checkMaximum('run_duration_p99_ms', firstDefined(summary.orchestrationSummary?.p99RunDurationMs, summary.runDurationSummary?.p99Ms, summary.actualDurationMs), budget.orchestrationBudgets.p99RunDurationMs, 'PERFORMANCE_BUDGET_RUN_DURATION_P99_EXCEEDED');
  checkMaximum('stuck_run_rate_basis_points', summary.orchestrationSummary?.stuckRunRateBasisPoints, budget.orchestrationBudgets.maximumStuckRunRateBasisPoints, 'PERFORMANCE_BUDGET_STUCK_RUN_RATE_EXCEEDED');
  checkMaximum('unknown_outcome_rate_basis_points', rateBasisPoints(summary.unknownOutcomeCount, sampleSize), budget.orchestrationBudgets.maximumUnknownOutcomeRateBasisPoints, 'PERFORMANCE_BUDGET_UNKNOWN_OUTCOME_RATE_EXCEEDED');
  checkMaximum('worker_utilization_basis_points', summary.workerSummary?.utilizationBasisPoints, budget.capacityBudgets.maximumWorkerUtilizationBasisPoints, 'PERFORMANCE_BUDGET_WORKER_UTILIZATION_EXCEEDED');
  checkMaximum('lease_expiry_rate_basis_points', summary.workerSummary?.leaseExpiryRateBasisPoints, budget.capacityBudgets.maximumLeaseExpiryRateBasisPoints, 'PERFORMANCE_BUDGET_LEASE_EXPIRY_EXCEEDED');
  const headroom = firstDefined(summary.capacitySummary?.headroomBasisPoints, summary.workerSummary?.headroomBasisPoints, summary.headroomBasisPoints);
  if (headroom !== undefined) checkMinimum('headroom_basis_points', headroom, budget.capacityBudgets.minimumHeadroomBasisPoints, 'PERFORMANCE_BUDGET_HEADROOM_BELOW_MINIMUM');
  const databasePressure = firstDefined(summary.databaseSummary?.pressureCategory, summary.databasePressureCategory);
  if (databasePressure !== undefined) {
    const rank = { healthy: 0, elevated: 1, degraded: 2, unavailable: 3, unknown: 4 };
    checks.push({ metric: 'database_pressure_category', actual: databasePressure, budget: budget.capacityBudgets.maximumDatabasePressureCategory, passed: (rank[databasePressure] ?? 4) <= (rank[budget.capacityBudgets.maximumDatabasePressureCategory] ?? 0), reasonCode: 'PERFORMANCE_BUDGET_DATABASE_PRESSURE_EXCEEDED' });
  }
  const backpressureState = firstDefined(summary.queueSummary?.backpressureState, summary.backpressureState);
  if (backpressureState !== undefined) {
    const rank = { normal: 0, elevated: 1, saturated: 2, shedding: 3, paused: 4 };
    checks.push({ metric: 'backpressure_state', actual: backpressureState, budget: budget.capacityBudgets.maximumBackpressureState, passed: (rank[backpressureState] ?? 5) <= (rank[budget.capacityBudgets.maximumBackpressureState] ?? 0), reasonCode: 'PERFORMANCE_BUDGET_BACKPRESSURE_STATE_EXCEEDED' });
  }
  checkMaximum('tenant_service_skew_basis_points', summary.fairnessSummary?.maximumTenantServiceSkewBasisPoints, budget.fairnessBudgets.maximumTenantServiceSkewBasisPoints, 'PERFORMANCE_BUDGET_FAIRNESS_EXCEEDED');
  checkMaximum('tenant_starvation_window_ms', summary.fairnessSummary?.maximumTenantStarvationWindowMs, budget.fairnessBudgets.maximumTenantStarvationWindowMs, 'PERFORMANCE_BUDGET_STARVATION_EXCEEDED');
  checkMaximum('recovery_duration_p95_ms', summary.recoverySummary?.p95RecoveryDurationMs, budget.recoveryBudgets.p95RecoveryDurationMs, 'PERFORMANCE_BUDGET_RECOVERY_DURATION_EXCEEDED');
  checkMaximum('compensation_duration_p95_ms', summary.recoverySummary?.p95CompensationDurationMs, budget.recoveryBudgets.p95CompensationDurationMs, 'PERFORMANCE_BUDGET_COMPENSATION_DURATION_EXCEEDED');
  if (summary.recoverySummary?.successRateBasisPoints !== undefined) checkMinimum('recovery_success_rate_basis_points', summary.recoverySummary.successRateBasisPoints, budget.recoveryBudgets.minimumRecoverySuccessRateBasisPoints, 'PERFORMANCE_BUDGET_RECOVERY_SUCCESS_RATE_BELOW_MINIMUM');
  checkMaximum('failover_rto_ms', summary.regionalSummary?.failoverRtoMs, budget.regionalBudgets.maximumFailoverRtoMs, 'PERFORMANCE_BUDGET_FAILOVER_RTO_EXCEEDED');
  checkMaximum('failover_rpo_ms', summary.regionalSummary?.failoverRpoMs, budget.regionalBudgets.maximumFailoverRpoMs, 'PERFORMANCE_BUDGET_FAILOVER_RPO_EXCEEDED');
  checkMaximum('regional_routing_error_rate_basis_points', summary.regionalSummary?.routingErrorRateBasisPoints, budget.regionalBudgets.maximumRegionalRoutingErrorRateBasisPoints, 'PERFORMANCE_BUDGET_REGIONAL_ROUTING_ERROR_RATE_EXCEEDED');
  if (Number(summary.correctnessViolationCount || 0) > 0) checks.push({ metric: 'correctness', actual: summary.correctnessViolationCount, budget: 0, passed: false, reasonCode: 'PERFORMANCE_CORRECTNESS_VIOLATION' });
  if (Number(summary.securityViolationCount || 0) > 0) checks.push({ metric: 'security', actual: summary.securityViolationCount, budget: 0, passed: false, reasonCode: 'PERFORMANCE_SECURITY_VIOLATION' });
  if (context.acceptedWorkPreserved === false) checks.push({ metric: 'accepted_work_preserved', actual: 0, budget: 1, passed: false, reasonCode: 'PERFORMANCE_ACCEPTED_WORK_LOST' });
  if (context.duplicateExecution === true) checks.push({ metric: 'duplicate_execution', actual: 1, budget: 0, passed: false, reasonCode: 'PERFORMANCE_DUPLICATE_EXECUTION' });
  if (context.staleWriterSucceeded === true) checks.push({ metric: 'stale_writer_fencing', actual: 1, budget: 0, passed: false, reasonCode: 'PERFORMANCE_STALE_WRITER_SUCCEEDED' });
  const overload = Number(summary.overloadRejectionCount || 0) > 0;
  if (overload && (!context.intentionalOverload || context.acceptedWorkPreserved !== true || context.protectedCapacityAvailable !== true)) checks.push({ metric: 'overload_correctness', actual: 1, budget: 0, passed: false, reasonCode: 'PERFORMANCE_OVERLOAD_INVARIANT_FAILED' });
  const failures = checks.filter((check) => !check.passed);
  const warnings = [...new Set(context.safeWarnings || [])];
  return {
    status: failures.length ? 'failed' : warnings.length || overload ? 'passed_with_warnings' : 'passed',
    safeReasonCodes: [...new Set(failures.map((check) => check.reasonCode).filter(Boolean))],
    safeWarnings: warnings.length ? warnings : overload && !failures.length ? ['EXPECTED_OVERLOAD_REJECTION_OBSERVED'] : [],
    checks,
    sampleSize,
  };
}

function normalizeHash(value, source) {
  if (value && SAFE_HASH.test(String(value))) return String(value);
  return stableHash(source || 'not_configured');
}

function createEnvironmentFingerprint(input = {}, now = new Date()) {
  assertSafeObject(input, { rejectExecutable: false }, 'environmentFingerprint');
  for (const key of Object.keys(input)) if (SENSITIVE_KEY.test(key)) throw performanceError('PERFORMANCE_ENVIRONMENT_UNSAFE', 'Environment fingerprint contains a prohibited field.');
  const configurationHashes = input.configurationHashes || {};
  const fingerprint = {
    environmentCategory: ALLOWED_ENVIRONMENT.has(input.environmentCategory) ? input.environmentCategory : 'local',
    operatingSystemCategory: ALLOWED_CATEGORIES.operatingSystemCategory.has(input.operatingSystemCategory) ? input.operatingSystemCategory : 'unknown',
    architectureCategory: ALLOWED_CATEGORIES.architectureCategory.has(input.architectureCategory) ? input.architectureCategory : 'unknown',
    runtimeVersion: safeText(input.runtimeVersion || process.versions.node.split('.').slice(0, 2).join('.'), 40),
    applicationVersion: safeText(input.applicationVersion || '0.1.0', 80),
    schemaVersion: safeText(input.schemaVersion || '13E4', 80),
    migrationVersion: safeText(input.migrationVersion || '1304', 80),
    backendProcessCount: boundedInteger(input.backendProcessCount, 'backendProcessCount', 0, 1_000, 1),
    executionWorkerCount: boundedInteger(input.executionWorkerCount, 'executionWorkerCount', 0, 10_000, 1),
    recoveryWorkerCount: boundedInteger(input.recoveryWorkerCount, 'recoveryWorkerCount', 0, 10_000, 1),
    controlPlaneWorkerCount: boundedInteger(input.controlPlaneWorkerCount, 'controlPlaneWorkerCount', 0, 10_000, 1),
    databaseAdapterCategory: ALLOWED_CATEGORIES.databaseAdapterCategory.has(input.databaseAdapterCategory) ? input.databaseAdapterCategory : 'mock',
    databaseTopologyCategory: ALLOWED_CATEGORIES.databaseTopologyCategory.has(input.databaseTopologyCategory) ? input.databaseTopologyCategory : 'simulated',
    cacheAdapterCategory: ALLOWED_CATEGORIES.cacheAdapterCategory.has(input.cacheAdapterCategory) ? input.cacheAdapterCategory : 'memory',
    regionalSimulationCategory: ALLOWED_CATEGORIES.regionalSimulationCategory.has(input.regionalSimulationCategory) ? input.regionalSimulationCategory : 'local_simulation',
    cpuCapacityCategory: ALLOWED_CATEGORIES.cpuCapacityCategory.has(input.cpuCapacityCategory) ? input.cpuCapacityCategory : 'unknown',
    memoryCapacityCategory: ALLOWED_CATEGORIES.memoryCapacityCategory.has(input.memoryCapacityCategory) ? input.memoryCapacityCategory : 'unknown',
    networkCategory: ALLOWED_CATEGORIES.networkCategory.has(input.networkCategory) ? input.networkCategory : 'in_process',
    configurationHashes: {
      scaleConfigurationHash: normalizeHash(configurationHashes.scaleConfigurationHash, input.scaleConfiguration || 'default-scale'),
      performancePolicyHash: normalizeHash(configurationHashes.performancePolicyHash, input.performancePolicy || 'default-performance'),
      routingConfigurationHash: normalizeHash(configurationHashes.routingConfigurationHash, input.routingConfiguration || 'default-routing'),
      regionalConfigurationHash: normalizeHash(configurationHashes.regionalConfigurationHash, input.regionalConfiguration || 'default-regional'),
    },
    generatedAt: new Date(now),
  };
  fingerprint.fingerprintId = `perf-env-${stableHash(fingerprint).slice(7, 31)}`;
  return fingerprint;
}

function environmentCompatibility(left = {}, right = {}) {
  if (!left || !right) return { compatible: false, safeReasonCodes: ['PERFORMANCE_ENVIRONMENT_MISSING'] };
  const fields = ['environmentCategory', 'operatingSystemCategory', 'architectureCategory', 'runtimeVersion', 'schemaVersion', 'migrationVersion', 'backendProcessCount', 'executionWorkerCount', 'recoveryWorkerCount', 'controlPlaneWorkerCount', 'databaseAdapterCategory', 'databaseTopologyCategory', 'cacheAdapterCategory', 'regionalSimulationCategory', 'cpuCapacityCategory', 'memoryCapacityCategory', 'networkCategory'];
  const mismatches = fields.filter((field) => String(left[field]) !== String(right[field]));
  for (const key of ['scaleConfigurationHash', 'performancePolicyHash', 'routingConfigurationHash', 'regionalConfigurationHash']) if (String(left.configurationHashes?.[key]) !== String(right.configurationHashes?.[key])) mismatches.push(`configurationHashes.${key}`);
  return { compatible: mismatches.length === 0, safeReasonCodes: mismatches.map((field) => `PERFORMANCE_ENVIRONMENT_${field.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}_MISMATCH`), mismatches };
}

function metricChange(current, baseline, direction, relativeToleranceBasisPoints, absoluteTolerance) {
  const actual = Number(current || 0); const reference = Number(baseline || 0); const delta = actual - reference;
  const absoluteDelta = Math.abs(delta); const relativeChangeBasisPoints = reference === 0 ? (actual === 0 ? 0 : 10_000) : Math.round((delta / reference) * 10_000);
  const materiallyChanged = absoluteDelta > absoluteTolerance && Math.abs(relativeChangeBasisPoints) > relativeToleranceBasisPoints;
  const regressed = materiallyChanged && (direction === 'lower_is_better' ? delta > 0 : delta < 0);
  const improved = materiallyChanged && (direction === 'lower_is_better' ? delta < 0 : delta > 0);
  return { baseline: reference, current: actual, delta, absoluteDelta, relativeChangeBasisPoints, materiallyChanged, regressed, improved };
}

function optionalMetricChange(current, baseline, direction, relativeToleranceBasisPoints, absoluteTolerance) {
  if (current === undefined || current === null || baseline === undefined || baseline === null) {
    return { baseline: baseline ?? null, current: current ?? null, delta: 0, absoluteDelta: 0, relativeChangeBasisPoints: 0, materiallyChanged: false, regressed: false, improved: false, comparable: false };
  }
  return { ...metricChange(current, baseline, direction, relativeToleranceBasisPoints, absoluteTolerance), comparable: true };
}

function compareRegression(input = {}) {
  const baseline = input.baseline || {};
  const run = input.run || {};
  if (Number(run.sampleSize || run.requestCount || 0) < Number(input.minimumSampleSize || baseline.minimumSampleSize || 20)) return { status: 'insufficient_data', environmentCompatibility: 'unknown', sampleCompatibility: false, safeReasonCodes: ['PERFORMANCE_SAMPLE_SIZE_INSUFFICIENT'] };
  const baselineMode = baseline.mode || baseline.summaryMetrics?.mode;
  const baselineBudgetPolicyVersion = baseline.budgetPolicyVersion || baseline.summaryMetrics?.budgetPolicyVersion;
  const baselineFixtureScale = baseline.fixtureScale || baseline.summaryMetrics?.fixtureScale;
  const runFixtureScale = run.fixtureScale || run.summaryMetrics?.fixtureScale;
  const fixtureScaleMismatch = baselineFixtureScale && runFixtureScale && canonicalize(baselineFixtureScale) !== canonicalize(runFixtureScale);
  if (baseline.workloadDomain !== run.workloadDomain || Number(baseline.scenarioVersion) !== Number(run.scenarioVersion) || baselineMode && run.mode && baselineMode !== run.mode || baselineBudgetPolicyVersion && run.budgetPolicyVersion && Number(baselineBudgetPolicyVersion) !== Number(run.budgetPolicyVersion) || fixtureScaleMismatch) return { status: 'incompatible', environmentCompatibility: 'unknown', sampleCompatibility: false, safeReasonCodes: [fixtureScaleMismatch ? 'PERFORMANCE_FIXTURE_SCALE_INCOMPATIBLE' : 'PERFORMANCE_BASELINE_INCOMPATIBLE'] };
  const environment = environmentCompatibility(input.baselineEnvironment, input.runEnvironment);
  if (!environment.compatible) return { status: 'incompatible', environmentCompatibility: 'incompatible', sampleCompatibility: true, safeReasonCodes: environment.safeReasonCodes };
  const relative = Number(input.regressionToleranceBasisPoints ?? baseline.regressionToleranceBasisPoints ?? 1_000);
  const absolute = Number(input.absoluteRegressionToleranceMs ?? baseline.absoluteRegressionToleranceMs ?? 50);
  const changes = {
    latencyP50: metricChange(run.latencyPercentiles?.p50Ms, baseline.latencyPercentiles?.p50Ms, 'lower_is_better', relative, absolute),
    latencyP95: metricChange(run.latencyPercentiles?.p95Ms, baseline.latencyPercentiles?.p95Ms, 'lower_is_better', relative, absolute),
    latencyP99: metricChange(run.latencyPercentiles?.p99Ms, baseline.latencyPercentiles?.p99Ms, 'lower_is_better', relative, absolute),
    throughput: metricChange(run.throughputSummary?.requestsPerSecond, baseline.throughputSummary?.requestsPerSecond, 'higher_is_better', relative, 0.1),
    errorRate: metricChange(run.errorRateBasisPoints, baseline.errorRateBasisPoints, 'lower_is_better', relative, 10),
    queueP95: metricChange(run.queueSummary?.p95Ms, baseline.queueSummary?.p95Ms, 'lower_is_better', relative, absolute),
    databaseP95: optionalMetricChange(run.databaseSummary?.operationP95Ms ?? run.databaseSummary?.p95Ms, baseline.databaseSummary?.operationP95Ms ?? baseline.databaseSummary?.p95Ms, 'lower_is_better', relative, absolute),
    cacheHitRate: optionalMetricChange(run.cacheSummary?.hitRateBasisPoints, baseline.cacheSummary?.hitRateBasisPoints, 'higher_is_better', relative, 50),
    workerUtilization: optionalMetricChange(run.workerSummary?.utilizationBasisPoints, baseline.workerSummary?.utilizationBasisPoints, 'lower_is_better', relative, 50),
    fairnessSkew: optionalMetricChange(run.fairnessSummary?.maximumTenantServiceSkewBasisPoints, baseline.fairnessSummary?.maximumTenantServiceSkewBasisPoints, 'lower_is_better', relative, 50),
    recoveryP95: optionalMetricChange(run.recoverySummary?.p95RecoveryDurationMs, baseline.recoverySummary?.p95RecoveryDurationMs, 'lower_is_better', relative, absolute),
    regionalRto: optionalMetricChange(run.regionalSummary?.failoverRtoMs, baseline.regionalSummary?.failoverRtoMs, 'lower_is_better', relative, absolute),
    regionalRpo: optionalMetricChange(run.regionalSummary?.failoverRpoMs, baseline.regionalSummary?.failoverRpoMs, 'lower_is_better', relative, absolute),
  };
  const values = Object.values(changes);
  const warning = values.some((change) => !change.materiallyChanged && (change.absoluteDelta > absolute || Math.abs(change.relativeChangeBasisPoints) > relative));
  const status = values.some((change) => change.regressed) ? 'regressed' : warning ? 'warning' : values.some((change) => change.improved) ? 'improved' : 'unchanged';
  return {
    status, environmentCompatibility: 'compatible', sampleCompatibility: true,
    latencyChanges: { p50: changes.latencyP50, p95: changes.latencyP95, p99: changes.latencyP99 },
    throughputChanges: changes.throughput, errorRateChanges: changes.errorRate,
    queueChanges: { p95: changes.queueP95 }, databaseChanges: { p95: changes.databaseP95 },
    cacheChanges: { hitRate: changes.cacheHitRate }, workerChanges: { utilization: changes.workerUtilization },
    fairnessChanges: { serviceSkew: changes.fairnessSkew }, recoveryChanges: { p95: changes.recoveryP95 },
    regionalChanges: { rto: changes.regionalRto, rpo: changes.regionalRpo },
    safeReasonCodes: status === 'regressed' ? ['PERFORMANCE_REGRESSION_DETECTED'] : status === 'warning' ? ['PERFORMANCE_REGRESSION_WARNING'] : [],
  };
}

function calculateThroughput(completed, durationMs) {
  return durationMs > 0 ? Math.round((Math.max(0, Number(completed) || 0) / (durationMs / 1_000)) * 1_000) / 1_000 : 0;
}

function calculateSafeConcurrency(arrivalRate, averageServiceTimeMs, utilizationTargetBasisPoints = 8_000) {
  const littleLawConcurrency = Math.max(0, Number(arrivalRate) || 0) * (Math.max(0, Number(averageServiceTimeMs) || 0) / 1_000);
  return Math.max(1, Math.ceil(littleLawConcurrency / Math.max(0.01, utilizationTargetBasisPoints / 10_000)));
}

function calculateQueueDrain(queueDepth, completionRate, arrivalRate = 0) {
  const drainRatePerSecond = Math.max(0, Number(completionRate) - Number(arrivalRate));
  return { drainRatePerSecond: Math.round(drainRatePerSecond * 1_000) / 1_000, estimatedDrainMs: drainRatePerSecond > 0 ? Math.ceil((Math.max(0, Number(queueDepth) || 0) / drainRatePerSecond) * 1_000) : null };
}

function calculateHeadroom(input = {}) {
  const capacity = Number(input.capacity || 0); const demand = Number(input.demand || 0);
  if (capacity <= 0 || input.sufficientData === false) return { headroomBasisPoints: null, category: 'unknown' };
  const basisPoints = Math.max(-100_000, Math.min(10_000, Math.round(((capacity - demand) / capacity) * 10_000)));
  return { headroomBasisPoints: basisPoints, category: basisPoints >= 3_000 ? 'ample' : basisPoints >= 1_500 ? 'adequate' : basisPoints >= 500 ? 'limited' : 'critical' };
}

function calculateFairness(serviceCounts = {}, starvationWindowsMs = {}) {
  const values = Object.values(serviceCounts).map(Number).filter((value) => Number.isFinite(value) && value >= 0);
  if (values.length < 2 || values.reduce((sum, value) => sum + value, 0) === 0) return { maximumTenantServiceSkewBasisPoints: 0, maximumTenantStarvationWindowMs: Math.max(0, ...Object.values(starvationWindowsMs).map(Number)), category: 'unknown' };
  const maximum = Math.max(...values); const minimum = Math.min(...values); const expected = values.reduce((sum, value) => sum + value, 0) / values.length;
  const skew = Math.round(((maximum - minimum) / Math.max(1, expected)) * 10_000);
  return { maximumTenantServiceSkewBasisPoints: skew, maximumTenantStarvationWindowMs: Math.max(0, ...Object.values(starvationWindowsMs).map(Number)), category: skew <= 1_000 ? 'fair' : skew <= 2_500 ? 'bounded_skew' : 'unfair' };
}

function estimateCapacity(input = {}) {
  const durationMs = Math.max(1, Number(input.durationMs || 1));
  const completionRate = Math.max(0, Number(input.observedCompletionRate ?? calculateThroughput(input.completedCount, durationMs)) || 0);
  const arrivalRate = Math.max(0, Number(input.observedArrivalRate ?? calculateThroughput(input.requestCount, durationMs)) || 0);
  const serviceTimeMs = Math.max(0, Number(input.averageServiceTimeMs || (input.observedExecutionTime?.averageMs) || 0));
  const utilization = Math.max(0, Math.min(10_000, Number(input.observedWorkerUtilizationBasisPoints || 0)));
  const utilizationRatio = utilization > 0 ? Math.max(0.01, utilization / 10_000) : 0;
  const saturationPointEstimate = utilizationRatio ? Math.round((completionRate / utilizationRatio) * 1_000) / 1_000 : completionRate;
  const headroomTarget = Math.max(0, Math.min(9_500, Number(input.minimumHeadroomBasisPoints ?? 1_500) || 0));
  const sustainableThroughputEstimate = Math.round(saturationPointEstimate * (1 - headroomTarget / 10_000) * 1_000) / 1_000;
  const safeConcurrencyEstimate = calculateSafeConcurrency(Math.max(arrivalRate, sustainableThroughputEstimate), serviceTimeMs, 10_000 - headroomTarget);
  const queueDrain = calculateQueueDrain(input.queueDepth || 0, completionRate, input.postTestArrivalRate || 0);
  const perWorker = Number(input.workerCount || 0) > 0 ? completionRate / Number(input.workerCount) : 0;
  const requiredExecutionWorkers = perWorker > 0 ? Math.max(1, Math.ceil(Math.max(arrivalRate, Number(input.expectedPeakRequestsPerSecond || arrivalRate)) / (perWorker * (1 - headroomTarget / 10_000)))) : null;
  const headroom = calculateHeadroom({ capacity: saturationPointEstimate, demand: arrivalRate, sufficientData: Number(input.requestCount || 0) >= Number(input.minimumSampleSize || 20) });
  const confidenceCategory = Number(input.requestCount || 0) >= 1_000 && input.multipleWindows ? 'high' : Number(input.requestCount || 0) >= 20 ? 'medium' : 'low';
  return {
    observedArrivalRate: arrivalRate, observedCompletionRate: completionRate,
    observedConcurrency: Number(input.observedConcurrency || 0), observedQueueWait: Number(input.observedQueueWait || 0),
    observedExecutionTime: serviceTimeMs, observedWorkerUtilization: utilization,
    observedDatabasePressure: input.observedDatabasePressure || 'unknown', observedCacheHitRate: Math.max(0, Math.min(10_000, Number(input.observedCacheHitRate || 0))),
    saturationPointEstimate, sustainableThroughputEstimate, safeConcurrencyEstimate,
    queueDrainRateEstimate: queueDrain.drainRatePerSecond, queueDrainTimeEstimateMs: queueDrain.estimatedDrainMs,
    reservedCapacityEstimate: Math.max(0, Number(input.reservedCapacity || 0)), minimumHeadroomBasisPoints: headroomTarget,
    headroomCategory: headroom.category, headroomBasisPoints: headroom.headroomBasisPoints,
    requiredExecutionWorkers, recommendedPartitionCount: requiredExecutionWorkers == null ? null : Math.max(1, Math.ceil(requiredExecutionWorkers / 4)),
    confidenceCategory,
    assumptions: ['Observed completion rate is representative.', 'Little\'s Law approximation uses average service time.', 'Worker efficiency remains stable within the tested range.'],
    limitations: [input.environmentCategory === 'local' ? 'Local results do not prove production capacity.' : 'Capacity values remain estimates.', 'Recommendations are advisory and do not change provider capacity.'],
  };
}

function calculateFailoverCapacity(input = {}) {
  const normalCapacity = Math.max(0, Number(input.normalRegionalCapacity || 0));
  const failoverCapacity = Math.max(0, Number(input.failoverCapacity || 0));
  const primaryLoad = Math.max(0, Number(input.primaryLoad || 0));
  const protectedRecoveryCapacity = Math.max(0, Number(input.protectedRecoveryCapacity || 0));
  const available = Math.max(0, failoverCapacity - protectedRecoveryCapacity);
  const queueGrowthPerSecond = Math.max(0, primaryLoad - available);
  const drain = calculateQueueDrain(input.projectedQueueDepth || 0, available, primaryLoad);
  return { normalCapacity, failoverCapacity, protectedRecoveryCapacity, availableFailoverCapacity: available, canAbsorbFullLoad: available >= primaryLoad, projectedQueueGrowthPerSecond: queueGrowthPerSecond, estimatedDrainMs: drain.estimatedDrainMs, policy: input.policy || 'degraded_mode' };
}

function autoscalingRecommendations(input = {}) {
  if (input.sufficientData === false || input.headroomCategory === 'unknown') return [{ recommendation: 'insufficient_data', safeReasonCodes: ['CAPACITY_DATA_INSUFFICIENT'], evidenceWindow: input.evidenceWindow || 'unknown', confidenceCategory: 'low', currentCapacityCategory: 'unknown', projectedCapacityCategory: 'unknown', expectedEffect: 'Collect compatible bounded performance evidence.', limitations: ['No provider changes are performed.'] }];
  const recommendations = [];
  const add = (recommendation, reason, effect) => recommendations.push({ recommendation, safeReasonCodes: [reason], evidenceWindow: input.evidenceWindow || 'steady_state', confidenceCategory: input.confidenceCategory || 'medium', currentCapacityCategory: input.headroomCategory || 'unknown', projectedCapacityCategory: input.headroomCategory === 'critical' ? 'limited' : 'adequate', expectedEffect: effect, limitations: ['Advisory only; validate in a compatible environment.', 'No cloud or provider API calls are made.'] });
  if (['critical', 'limited'].includes(input.headroomCategory) || Number(input.workerUtilizationBasisPoints || 0) >= 8_500) add('scale_up_execution_workers', 'EXECUTION_HEADROOM_LOW', 'Increase provider-neutral execution slots.');
  if (Number(input.recoveryUtilizationBasisPoints || 0) >= 8_000) add('scale_up_recovery_workers', 'RECOVERY_HEADROOM_LOW', 'Increase protected recovery throughput.');
  if (Number(input.controlPlaneUtilizationBasisPoints || 0) >= 8_000) add('scale_up_control_plane_workers', 'CONTROL_PLANE_HEADROOM_LOW', 'Increase control-plane throughput.');
  if (Number(input.queueDepth || 0) > Number(input.partitionCapacity || Number.MAX_SAFE_INTEGER)) add('increase_partition_count', 'QUEUE_PARTITION_PRESSURE', 'Distribute claims across more logical partitions.');
  if (['degraded', 'unavailable'].includes(input.databasePressureCategory)) add('investigate_database_pressure', 'DATABASE_PRESSURE_HIGH', 'Investigate governed query, index, and connection-pool evidence.');
  if (['degraded', 'contended'].includes(input.cacheHealthCategory)) add('investigate_cache_contention', 'CACHE_CONTENTION_HIGH', 'Investigate cache stampede, invalidation, and adapter evidence.');
  if (Number(input.protectedRecoveryHeadroomBasisPoints ?? 10_000) < 1_500) add('increase_reserved_recovery_capacity', 'PROTECTED_RECOVERY_CAPACITY_LOW', 'Preserve critical recovery capacity during overload.');
  if (!recommendations.length) add('hold', 'CAPACITY_WITHIN_BUDGET', 'Keep current provider-neutral capacity settings.');
  return recommendations.filter((entry) => AUTOSCALING_RECOMMENDATIONS.includes(entry.recommendation));
}

function bottleneckSummary(input = {}) {
  const findings = [];
  const add = (type, evidence, reason) => findings.push({ type, evidence, safeReasonCode: reason });
  if (Number(input.queueSummary?.p95Ms || 0) > Number(input.executionSummary?.p95Ms || Infinity)) add('queue_bottleneck', 'likely', 'QUEUE_WAIT_DOMINATES');
  if (Number(input.workerSummary?.utilizationBasisPoints || 0) >= 9_000) add('worker_bottleneck', 'confirmed', 'WORKER_UTILIZATION_SATURATED');
  if (['degraded', 'unavailable'].includes(input.databaseSummary?.pressureCategory)) add('database_bottleneck', 'likely', 'DATABASE_PRESSURE_HIGH');
  if (['degraded', 'contended'].includes(input.cacheSummary?.healthCategory)) add('cache_bottleneck', 'possible', 'CACHE_CONTENTION_HIGH');
  if (Number(input.policySummary?.p95Ms || 0) > Number(input.latencyPercentiles?.p95Ms || Infinity) * 0.5) add('policy_bottleneck', 'possible', 'POLICY_TIME_SIGNIFICANT');
  if (input.regionalSummary?.routingErrorRateBasisPoints > 100) add('regional_bottleneck', 'likely', 'REGIONAL_ROUTING_ERRORS');
  return findings.slice(0, 20);
}

function transitionRun(currentStatus, nextStatus) {
  if (!RUN_TRANSITIONS[currentStatus]?.includes(nextStatus)) throw performanceError('PERFORMANCE_RUN_TRANSITION_INVALID', `Cannot transition a performance run from ${currentStatus} to ${nextStatus}.`, [], 409);
  return nextStatus;
}

function deterministicStages(scenarioInput = {}, startMs = 0) {
  const scenario = normalizeScenario(scenarioInput, scenarioInput);
  let cursor = Number(startMs || 0);
  return scenario.stageDefinitions.map((stage) => {
    const result = { ...stage, startsAtMonotonicMs: cursor, endsAtMonotonicMs: cursor + stage.durationMs };
    cursor += stage.durationMs;
    return result;
  });
}

function deterministicArrivalSchedule(scenarioInput = {}, options = {}) {
  const scenario = normalizeScenario(scenarioInput, scenarioInput);
  const maximumEvents = boundedInteger(options.maximumEvents, 'maximumEvents', 1, 10_000, 1_000);
  const maximumEventsPerStage = boundedInteger(options.maximumEventsPerStage, 'maximumEventsPerStage', 1, 1_000, 250);
  const stages = deterministicStages(scenario, 0);
  const events = [];
  for (const stage of stages) {
    if (events.length >= maximumEvents || stage.targetRequestsPerSecond <= 0) continue;
    let effectiveRate = stage.targetRequestsPerSecond;
    if (scenario.trafficModel === 'stress') effectiveRate = Math.max(effectiveRate, Math.round((effectiveRate + scenario.maximumRequestsPerSecond) / 2));
    if (['burst', 'spike'].includes(scenario.trafficModel)) effectiveRate = scenario.maximumRequestsPerSecond;
    const requestedCount = Math.max(0, Math.ceil((effectiveRate * stage.durationMs) / 1_000));
    const count = Math.min(requestedCount, maximumEventsPerStage, maximumEvents - events.length);
    for (let index = 0; index < count; index += 1) {
      const progress = count <= 1 ? 0 : index / count;
      let stageOffsetMs = Math.floor(progress * stage.durationMs);
      if (scenario.trafficModel === 'burst') stageOffsetMs = Math.floor(progress * Math.max(1, stage.durationMs / 4));
      if (scenario.trafficModel === 'spike') stageOffsetMs = Math.floor(progress < 0.2 ? progress * stage.durationMs : stage.durationMs * 0.2 + (progress - 0.2) * stage.durationMs * 0.25);
      if (scenario.trafficModel === 'stress') stageOffsetMs = Math.floor(Math.sqrt(progress) * stage.durationMs);
      events.push({
        sequence: events.length + 1,
        stageName: stage.stageName,
        stageOrder: stage.order,
        scheduledOffsetMs: stage.startsAtMonotonicMs + Math.min(stage.durationMs - 1, stageOffsetMs),
        virtualUserIndex: scenario.trafficModel === 'closed_loop' ? index % Math.max(1, stage.targetConcurrency) : undefined,
        arrivalClass: scenario.trafficModel === 'closed_loop' ? 'completion_gated' : ['burst', 'spike'].includes(scenario.trafficModel) ? 'front_loaded' : scenario.trafficModel === 'stress' ? 'increasing' : 'independent',
      });
    }
  }
  return events;
}

function seededRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000; };
}

function generateFixtureManifest(scenarioInput = {}) {
  const scenario = normalizeScenario(scenarioInput, scenarioInput);
  const random = seededRandom(scenario.fixtureSeed);
  const suffix = () => Math.floor(random() * 0xffffff).toString(16).padStart(6, '0');
  const fixtureSetId = `perf-fixture-${scenario.fixtureSeed}-${suffix()}`;
  const organizations = Array.from({ length: scenario.tenantCount }, (_, index) => ({ organizationId: `perf-org-${scenario.fixtureSeed}-${index + 1}-${suffix()}`, name: `Synthetic Performance Org ${index + 1}`, testOrigin: true, fixtureSetId }));
  const workspaces = Array.from({ length: scenario.workspaceCount }, (_, index) => ({ workspaceId: `perf-workspace-${scenario.fixtureSeed}-${index + 1}-${suffix()}`, organizationId: organizations[index % organizations.length].organizationId, name: `Synthetic Performance Workspace ${index + 1}`, testOrigin: true, fixtureSetId }));
  const users = Array.from({ length: scenario.userCount }, (_, index) => ({ userId: `perf-user-${scenario.fixtureSeed}-${index + 1}-${suffix()}`, organizationId: organizations[index % organizations.length].organizationId, workspaceId: workspaces[index % workspaces.length].workspaceId, email: `synthetic-${scenario.fixtureSeed}-${index + 1}@invalid.example`, testOrigin: true, fixtureSetId }));
  const passports = Array.from({ length: scenario.mockAgentCount }, (_, index) => ({ passportId: `perf-passport-${scenario.fixtureSeed}-${index + 1}-${suffix()}`, workspaceId: workspaces[index % workspaces.length].workspaceId, runtimeAdapter: 'deterministic_mock', testOrigin: true, fixtureSetId }));
  const definitions = Array.from({ length: scenario.orchestrationDefinitionCount }, (_, index) => ({ definitionId: `perf-definition-${scenario.fixtureSeed}-${index + 1}-${suffix()}`, workspaceId: workspaces[index % workspaces.length].workspaceId, topology: index % 2 ? 'parallel' : 'sequential', testOrigin: true, fixtureSetId }));
  const manifest = { fixtureSetId, seed: scenario.fixtureSeed, organizations, workspaces, users, passports, definitions, entityCounts: { organizations: organizations.length, workspaces: workspaces.length, users: users.length, passports: passports.length, definitions: definitions.length }, cleanupTag: fixtureSetId };
  assertSafeObject(manifest, { rejectExecutable: false });
  return manifest;
}

function cleanupFixtureRecords(records = [], fixtureSetId, maximumRecords = PERFORMANCE_LIMITS.maximumFixtureCount) {
  const id = safeIdentifier(fixtureSetId, 'fixtureSetId');
  if (!Array.isArray(records) || records.length > maximumRecords) throw performanceError('PERFORMANCE_FIXTURE_CLEANUP_LIMIT_EXCEEDED', 'Fixture cleanup exceeds the bounded record limit.');
  const removed = records.filter((record) => record?.testOrigin === true && record?.fixtureSetId === id);
  const retained = records.filter((record) => !(record?.testOrigin === true && record?.fixtureSetId === id));
  return { removed, retained, removedCount: removed.length, idempotent: removed.every((record) => record.fixtureSetId === id) };
}

function evaluateAbortConditions(summary = {}, conditions = []) {
  const normalized = normalizeConditions(conditions, 'abortConditions');
  const triggered = [];
  for (const condition of normalized) {
    const category = condition.conditionType || condition.category;
    if (category === 'correctness_violation' && Number(summary.correctnessViolationCount || 0) > 0) triggered.push('PERFORMANCE_CORRECTNESS_VIOLATION');
    if (category === 'security_violation' && Number(summary.securityViolationCount || 0) > 0) triggered.push('PERFORMANCE_SECURITY_VIOLATION');
    if (category === 'cross_tenant_response' && summary.crossTenantResponseDetected) triggered.push('PERFORMANCE_CROSS_TENANT_RESPONSE');
    if (category === 'credential_pattern' && summary.credentialPatternDetected) triggered.push('PERFORMANCE_CREDENTIAL_PATTERN_DETECTED');
    if (category === 'unexpected_failure_rate' && rateBasisPoints(summary.unexpectedFailureCount, summary.requestCount) > Number(condition.threshold ?? 1_000)) triggered.push('PERFORMANCE_UNEXPECTED_FAILURE_RATE_ABORT');
    if (category === 'database_unavailable' && summary.databaseSummary?.pressureCategory === 'unavailable') triggered.push('PERFORMANCE_DATABASE_UNAVAILABLE');
    if (category === 'queue_depth_hard_limit' && Number(summary.queueSummary?.depth || 0) > Number(condition.threshold ?? 10_000)) triggered.push('PERFORMANCE_QUEUE_DEPTH_ABORT');
    if (category === 'lease_expiry_hard_limit' && Number(summary.workerSummary?.leaseExpiryCount || 0) > Number(condition.threshold ?? 0)) triggered.push('PERFORMANCE_LEASE_EXPIRY_ABORT');
    if (category === 'memory_critical' && ['critical', 'unbounded_growth'].includes(summary.memorySummary?.category || summary.memoryGrowthCategory)) triggered.push('PERFORMANCE_MEMORY_CRITICAL');
    if (category === 'target_unavailable' && (summary.targetAvailable === false || summary.targetAvailabilityCategory === 'unavailable')) triggered.push('PERFORMANCE_TARGET_UNAVAILABLE');
    if (category === 'manual_cancellation' && summary.manualCancellation) triggered.push('PERFORMANCE_MANUAL_CANCELLATION');
    if (category === 'regional_split_brain_risk' && (summary.regionalSummary?.splitBrainRisk === true || summary.regionalSummary?.staleWriterSucceeded === true)) triggered.push('PERFORMANCE_REGIONAL_SPLIT_BRAIN_RISK');
    if (category === 'cleanup_failure_risk' && (summary.cleanupFailureRisk === true || ['failed', 'cleanup_failed'].includes(summary.cleanupStatus))) triggered.push('PERFORMANCE_CLEANUP_FAILURE_RISK');
  }
  return { abort: triggered.length > 0, safeReasonCodes: [...new Set(triggered)] };
}

function createSafeExport(input = {}) {
  const output = safeRedact({
    exportVersion: 'performance-capacity.v1',
    generatedAt: input.generatedAt || new Date().toISOString(),
    scenario: input.scenario,
    environmentFingerprint: input.environmentFingerprint,
    budgetPolicy: input.budgetPolicy,
    performanceSummary: input.performanceSummary,
    budgetEvaluation: input.budgetEvaluation,
    regressionEvaluation: input.regressionEvaluation,
    capacityModel: input.capacityModel,
    recommendations: input.recommendations,
    bottleneckSummary: input.bottleneckSummary,
  });
  const serialized = JSON.stringify(output);
  if (SECRET_VALUE.test(serialized) || [...serialized.matchAll(/"([^"]+)"\s*:/g)].some((match) => SENSITIVE_KEY.test(match[1]))) throw performanceError('PERFORMANCE_EXPORT_UNSAFE', 'The performance export failed safe redaction.');
  return output;
}

module.exports = {
  assertSafeObject,
  autoscalingRecommendations,
  bottleneckSummary,
  boundedInteger,
  boundedNumber,
  calculateFailoverCapacity,
  calculateFairness,
  calculateHeadroom,
  calculateQueueDrain,
  calculateSafeConcurrency,
  calculateThroughput,
  classifyOutcome,
  cleanupFixtureRecords,
  compareRegression,
  createEnvironmentFingerprint,
  createHistogram,
  createSafeExport,
  defaultBudget,
  deterministicStages,
  deterministicArrivalSchedule,
  environmentCompatibility,
  estimateCapacity,
  evaluateAbortConditions,
  evaluateBudget,
  generateFixtureManifest,
  getTarget,
  getWorkloadDomain,
  idOf,
  listTargets,
  listWorkloadDomains,
  mergeHistograms,
  normalizeBudget,
  normalizeScenario,
  percentileFromHistogram,
  percentileFromValues,
  percentileSummary,
  performanceError,
  rateBasisPoints,
  safeClone,
  safeIdentifier,
  safeRedact,
  safeText,
  scenarioModeLimits,
  stableHash,
  summarizeMeasurements,
  transitionRun,
  validateBudget,
  validateScenario,
};
