const assert = require('node:assert/strict');
const test = require('node:test');
const {
  PERFORMANCE_LIMITS,
  PERFORMANCE_TEST_MODES,
  TRAFFIC_MODELS,
  WORKLOAD_DOMAIN_IDS,
} = require('../constants/performanceCapacity');
const core = require('../services/performanceCapacityCore.service');

function scenario(overrides = {}) {
  return {
    organizationId: 'perf-org-unit',
    workspaceId: 'perf-workspace-unit',
    workloadDomain: 'interactive_api',
    testMode: 'simulation',
    targetId: 'local-in-process-v1',
    performanceBudgetPolicyId: 'perf-budget-unit',
    trafficModel: 'closed_loop',
    durationMs: 7_000,
    warmupDurationMs: 1_000,
    steadyStateDurationMs: 5_000,
    cooldownDurationMs: 1_000,
    targetConcurrency: 4,
    maximumConcurrency: 8,
    targetRequestsPerSecond: 10,
    maximumRequestsPerSecond: 20,
    tenantCount: 2,
    workspaceCount: 4,
    userCount: 4,
    workerCount: 3,
    mockAgentCount: 2,
    orchestrationDefinitionCount: 2,
    fixtureSeed: 13_004,
    ...overrides,
  };
}

function budget(overrides = {}) {
  const defaults = core.defaultBudget({
    organizationId: 'perf-org-unit',
    workspaceId: 'perf-workspace-unit',
    workloadDomain: 'interactive_api',
  });
  return { ...defaults, ...overrides };
}

function passingSummary() {
  return {
    requestCount: 20,
    successfulRequestCount: 20,
    unexpectedFailureCount: 0,
    timeoutCount: 0,
    retryCount: 0,
    overloadRejectionCount: 0,
    quotaRejectionCount: 0,
    unknownOutcomeCount: 0,
    correctnessViolationCount: 0,
    securityViolationCount: 0,
    latencyPercentiles: { p50Ms: 20, p90Ms: 30, p95Ms: 40, p99Ms: 50, maximumMs: 60 },
    queueSummary: { p50Ms: 2, p95Ms: 4, p99Ms: 5, oldestQueueAgeMs: 5 },
    workerSummary: { utilizationBasisPoints: 6_000, leaseExpiryRateBasisPoints: 0 },
    fairnessSummary: { maximumTenantServiceSkewBasisPoints: 500, maximumTenantStarvationWindowMs: 100 },
    regionalSummary: { failoverRtoMs: 1_000, failoverRpoMs: 100 },
  };
}

test('performance registries expose only bounded static workloads, modes, traffic models, and targets', () => {
  assert.equal(WORKLOAD_DOMAIN_IDS.length, 22);
  assert.ok(PERFORMANCE_TEST_MODES.includes('production_observation_only'));
  assert.ok(TRAFFIC_MODELS.includes('spike'));
  assert.ok(core.listWorkloadDomains().every((entry) => entry.requestGeneratorId && entry.maximumConcurrency <= PERFORMANCE_LIMITS.maximumConcurrency));
  const targets = core.listTargets();
  assert.deepEqual(targets.map((entry) => entry.targetId), [
    'local-in-process-v1',
    'local-http-v1',
    'integration-http-v1',
    'staging-http-v1',
    'production-observation-v1',
  ]);
  assert.equal(targets.some((entry) => Object.keys(entry).some((key) => /url|host|header/i.test(key))), false);
  assert.throws(() => core.getTarget('https://untrusted.invalid'), (error) => error.code === 'LOAD_SCENARIO_TARGET_NOT_ALLOWED');
});

test('scenario validation enforces bounds, request mix, modes, targets, and residency', () => {
  const valid = core.validateScenario(scenario(), { allowedResidencyTags: ['synthetic-local'] });
  assert.equal(valid.valid, true);
  assert.equal(valid.requiresApproval, false);
  assert.equal(valid.manualOnly, false);
  assert.equal(valid.scenario.requestMix.reduce((sum, entry) => sum + entry.weightBasisPoints, 0), 10_000);

  assert.equal(core.validateScenario(scenario({ maximumConcurrency: 51 })).valid, false);
  assert.equal(core.validateScenario(scenario({ requestMix: [
    { workloadDomain: 'interactive_api', weightBasisPoints: 6_000 },
    { workloadDomain: 'cache_read', weightBasisPoints: 3_000 },
  ] })).valid, false);
  assert.ok(core.validateScenario(scenario(), { allowedResidencyTags: ['configured-staging'] }).safeReasonCodes.includes('LOAD_SCENARIO_RESIDENCY_DENIED'));
  assert.ok(core.validateScenario(scenario({ testMode: 'staging_load', targetId: 'staging-http-v1' })).safeReasonCodes.includes('LOAD_SCENARIO_TARGET_NOT_ALLOWED'));
});

test('production observation scenarios cannot generate traffic', () => {
  const result = core.validateScenario(scenario({
    testMode: 'production_observation_only',
    targetId: 'production-observation-v1',
    targetConcurrency: 0,
    maximumConcurrency: 0,
    targetRequestsPerSecond: 0,
    maximumRequestsPerSecond: 0,
    warmupDurationMs: 0,
    steadyStateDurationMs: 5_000,
    cooldownDurationMs: 0,
    durationMs: 5_000,
    residencyTag: 'production-observation',
  }));
  assert.equal(result.valid, true);
  assert.equal(result.targetCategory, 'production_metrics_only');
  assert.ok(result.scenario.stageDefinitions.every((stage) => stage.targetConcurrency === 0 && stage.targetRequestsPerSecond === 0));
  assert.equal(core.validateScenario(scenario({ targetId: 'production-observation-v1' })).valid, false);
});

test('scenario payloads reject executable, credential, and arbitrary request fields', () => {
  for (const unsafe of [
    { script: 'run arbitrary work' },
    { targetUrl: 'https://untrusted.invalid' },
    { authorization: 'Bearer sample-secret' },
    { requestMix: [{ workloadDomain: 'interactive_api', weightBasisPoints: 10_000, requestBody: 'x' }] },
  ]) {
    const result = core.validateScenario(scenario(unsafe));
    assert.equal(result.valid, false);
    assert.ok(result.safeReasonCodes.includes('LOAD_SCENARIO_INVALID') || result.safeReasonCodes.includes('PERFORMANCE_DATA_UNSAFE'));
  }
});

test('deterministic stages preserve the configured order and monotonic timing', () => {
  const normalized = core.normalizeScenario(scenario({
    stageDefinitions: [
      { stageName: 'steady_state', order: 2, durationMs: 5_000, targetConcurrency: 4, targetRequestsPerSecond: 10 },
      { stageName: 'warmup', order: 1, durationMs: 1_000, targetConcurrency: 2, targetRequestsPerSecond: 5 },
      { stageName: 'cooldown', order: 3, durationMs: 1_000, targetConcurrency: 0, targetRequestsPerSecond: 0 },
    ],
  }));
  const stages = core.deterministicStages(normalized, 10_000);
  assert.deepEqual(stages.map((entry) => entry.stageName), ['warmup', 'steady_state', 'cooldown']);
  assert.deepEqual(stages.map((entry) => [entry.startsAtMonotonicMs, entry.endsAtMonotonicMs]), [
    [10_000, 11_000],
    [11_000, 16_000],
    [16_000, 17_000],
  ]);
});

test('all traffic models produce bounded deterministic arrival schedules', () => {
  for (const trafficModel of TRAFFIC_MODELS) {
    const configured = scenario({ trafficModel });
    const first = core.deterministicArrivalSchedule(configured, { maximumEvents: 120, maximumEventsPerStage: 60 });
    const second = core.deterministicArrivalSchedule(configured, { maximumEvents: 120, maximumEventsPerStage: 60 });
    assert.deepEqual(first, second);
    assert.ok(first.length > 0 && first.length <= 120);
    assert.ok(first.every((event, index) => event.sequence === index + 1 && event.scheduledOffsetMs >= 0 && event.scheduledOffsetMs < configured.durationMs));
  }
  assert.ok(core.deterministicArrivalSchedule(scenario({ trafficModel: 'closed_loop' })).every((event) => Number.isInteger(event.virtualUserIndex)));
  assert.ok(core.deterministicArrivalSchedule(scenario({ trafficModel: 'open_loop' })).every((event) => event.virtualUserIndex === undefined));
  assert.ok(core.deterministicArrivalSchedule(scenario({ trafficModel: 'stress' })).every((event) => event.arrivalClass === 'increasing'));
});

test('performance budgets enforce percentile order and produce pass, failure, and insufficient-data states', () => {
  assert.equal(core.validateBudget(budget()).valid, true);
  const invalid = core.validateBudget(budget({ latencyBudgets: { p50Ms: 500, p90Ms: 100 } }));
  assert.equal(invalid.valid, false);
  assert.ok(invalid.safeReasonCodes.includes('PERFORMANCE_BUDGET_LATENCY_ORDER_INVALID'));

  assert.equal(core.evaluateBudget(passingSummary(), budget()).status, 'passed');
  const failed = core.evaluateBudget({ ...passingSummary(), latencyPercentiles: { p50Ms: 20, p90Ms: 30, p95Ms: 2_001, p99Ms: 5_001, maximumMs: 10_001 } }, budget());
  assert.equal(failed.status, 'failed');
  assert.ok(failed.safeReasonCodes.includes('PERFORMANCE_BUDGET_LATENCY_P95_EXCEEDED'));
  assert.equal(core.evaluateBudget({ requestCount: 19 }, budget()).status, 'insufficient_data');
});

test('intentional overload passes only when accepted work and protected capacity are preserved', () => {
  const summary = { ...passingSummary(), successfulRequestCount: 15, overloadRejectionCount: 5 };
  const accepted = core.evaluateBudget(summary, budget(), {
    intentionalOverload: true,
    acceptedWorkPreserved: true,
    protectedCapacityAvailable: true,
  });
  assert.equal(accepted.status, 'passed_with_warnings');
  assert.ok(accepted.safeWarnings.includes('EXPECTED_OVERLOAD_REJECTION_OBSERVED'));
  const unsafe = core.evaluateBudget(summary, budget(), { intentionalOverload: true, acceptedWorkPreserved: false });
  assert.equal(unsafe.status, 'failed');
  assert.ok(unsafe.safeReasonCodes.includes('PERFORMANCE_OVERLOAD_INVARIANT_FAILED'));
});

test('histograms, percentiles, outcome classification, and steady-state summaries are deterministic', () => {
  const first = core.createHistogram([1, 10, 11, 20, 21], [10, 20]);
  assert.deepEqual(first.counts, [2, 2, 1]);
  assert.equal(core.percentileFromHistogram(first, 50), 20);
  const second = core.createHistogram([5, 25], [10, 20]);
  const merged = core.mergeHistograms([first, second]);
  assert.equal(merged.count, 7);
  assert.deepEqual(merged.counts, [3, 2, 2]);
  assert.throws(() => core.mergeHistograms([first, core.createHistogram([1], [5])]), (error) => error.code === 'PERFORMANCE_HISTOGRAM_INCOMPATIBLE');

  const summary = core.summarizeMeasurements([
    { stage: 'warmup', statusCode: 500, latencyMs: 1_000, queueWaitMs: 100 },
    { stage: 'steady_state', statusCode: 200, latencyMs: 20, queueWaitMs: 2 },
    { stage: 'steady_state', statusCode: 503, reasonCode: 'OVERLOAD_BACKPRESSURE_ACTIVE', expected: true, latencyMs: 30, queueWaitMs: 3 },
    { stage: 'cooldown', statusCode: 500, latencyMs: 2_000, queueWaitMs: 200 },
  ], { steadyStateDurationMs: 1_000 });
  assert.equal(summary.requestCount, 2);
  assert.equal(summary.successfulRequestCount, 1);
  assert.equal(summary.overloadRejectionCount, 1);
  assert.equal(summary.throughputSummary.requestsPerSecond, 2);
});

test('environment fingerprints are stable, comparable, and omit unsafe configuration', () => {
  const input = {
    environmentCategory: 'integration',
    operatingSystemCategory: 'windows',
    architectureCategory: 'x64',
    executionWorkerCount: 3,
    databaseAdapterCategory: 'mock',
    databaseTopologyCategory: 'simulated',
    cacheAdapterCategory: 'memory',
    regionalSimulationCategory: 'integration_simulation',
    networkCategory: 'integration',
    scaleConfiguration: { workers: 3 },
  };
  const first = core.createEnvironmentFingerprint(input, '2026-01-01T00:00:00.000Z');
  const second = core.createEnvironmentFingerprint(input, '2026-01-02T00:00:00.000Z');
  assert.equal(first.fingerprintId, second.fingerprintId);
  assert.equal(core.environmentCompatibility(first, second).compatible, true);
  const changed = core.createEnvironmentFingerprint({ ...input, executionWorkerCount: 4 }, '2026-01-01T00:00:00.000Z');
  assert.equal(core.environmentCompatibility(first, changed).compatible, false);
  assert.throws(() => core.createEnvironmentFingerprint({ ...input, databaseUri: 'mongodb://user:pass@host/db' }), (error) => ['PERFORMANCE_DATA_UNSAFE', 'PERFORMANCE_ENVIRONMENT_UNSAFE'].includes(error.code));
});

test('regression comparison requires compatible scenarios, samples, and environments', () => {
  const environment = core.createEnvironmentFingerprint({}, '2026-01-01T00:00:00.000Z');
  const baseline = {
    workloadDomain: 'interactive_api', scenarioVersion: 1, mode: 'simulation',
    budgetPolicyVersion: 1, minimumSampleSize: 20,
    latencyPercentiles: { p50Ms: 100, p95Ms: 200, p99Ms: 300 },
    throughputSummary: { requestsPerSecond: 100 }, errorRateBasisPoints: 0,
    queueSummary: { p95Ms: 20 },
  };
  const unchanged = core.compareRegression({
    baseline,
    run: { ...baseline, requestCount: 100 },
    baselineEnvironment: environment,
    runEnvironment: environment,
  });
  assert.equal(unchanged.status, 'unchanged');
  const regressed = core.compareRegression({
    baseline,
    run: { ...baseline, requestCount: 100, latencyPercentiles: { p50Ms: 100, p95Ms: 400, p99Ms: 600 }, throughputSummary: { requestsPerSecond: 70 } },
    baselineEnvironment: environment,
    runEnvironment: environment,
  });
  assert.equal(regressed.status, 'regressed');
  assert.ok(regressed.safeReasonCodes.includes('PERFORMANCE_REGRESSION_DETECTED'));
  assert.equal(core.compareRegression({ baseline, run: { ...baseline, requestCount: 5 }, baselineEnvironment: environment, runEnvironment: environment }).status, 'insufficient_data');
  assert.equal(core.compareRegression({ baseline, run: { ...baseline, requestCount: 100, scenarioVersion: 2 }, baselineEnvironment: environment, runEnvironment: environment }).status, 'incompatible');
});

test('capacity math reports throughput, concurrency, drain time, headroom, fairness, and failover limits', () => {
  assert.equal(core.calculateThroughput(200, 2_000), 100);
  assert.equal(core.calculateSafeConcurrency(100, 100, 8_000), 13);
  assert.deepEqual(core.calculateQueueDrain(100, 50, 40), { drainRatePerSecond: 10, estimatedDrainMs: 10_000 });
  assert.deepEqual(core.calculateHeadroom({ capacity: 100, demand: 70 }), { headroomBasisPoints: 3_000, category: 'ample' });
  assert.equal(core.calculateFairness({ tenantA: 55, tenantB: 45 }, { tenantA: 100, tenantB: 250 }).category, 'bounded_skew');

  const estimate = core.estimateCapacity({
    requestCount: 1_000, durationMs: 10_000, observedArrivalRate: 90,
    observedCompletionRate: 80, averageServiceTimeMs: 100,
    observedWorkerUtilizationBasisPoints: 8_000, workerCount: 4,
    queueDepth: 100, postTestArrivalRate: 20, multipleWindows: true,
    environmentCategory: 'local',
  });
  assert.equal(estimate.saturationPointEstimate, 100);
  assert.equal(estimate.sustainableThroughputEstimate, 85);
  assert.equal(estimate.confidenceCategory, 'high');
  assert.ok(estimate.limitations.some((entry) => entry.includes('do not prove production capacity')));

  const failover = core.calculateFailoverCapacity({ failoverCapacity: 100, primaryLoad: 90, protectedRecoveryCapacity: 20 });
  assert.equal(failover.canAbsorbFullLoad, false);
  assert.equal(failover.projectedQueueGrowthPerSecond, 10);
});

test('autoscaling and bottleneck findings are provider-neutral advisory evidence', () => {
  const recommendations = core.autoscalingRecommendations({
    sufficientData: true,
    headroomCategory: 'critical',
    workerUtilizationBasisPoints: 9_000,
    recoveryUtilizationBasisPoints: 8_500,
    queueDepth: 100,
    partitionCapacity: 50,
    databasePressureCategory: 'degraded',
    cacheHealthCategory: 'contended',
    protectedRecoveryHeadroomBasisPoints: 1_000,
  });
  assert.ok(recommendations.some((entry) => entry.recommendation === 'scale_up_execution_workers'));
  assert.ok(recommendations.some((entry) => entry.recommendation === 'increase_reserved_recovery_capacity'));
  assert.ok(recommendations.every((entry) => entry.limitations.some((item) => item.includes('No cloud or provider API'))));
  const bottlenecks = core.bottleneckSummary({
    queueSummary: { p95Ms: 200 }, executionSummary: { p95Ms: 100 },
    workerSummary: { utilizationBasisPoints: 9_500 }, databaseSummary: { pressureCategory: 'degraded' },
  });
  assert.deepEqual(bottlenecks.map((entry) => entry.type), ['queue_bottleneck', 'worker_bottleneck', 'database_bottleneck']);
});

test('run lifecycle permits only explicit state transitions', () => {
  const path = [
    'requested', 'validating', 'preparing', 'warming_up', 'running',
    'cooling_down', 'analyzing', 'passed', 'cleanup_required', 'cleaned_up',
  ];
  for (let index = 1; index < path.length; index += 1) assert.equal(core.transitionRun(path[index - 1], path[index]), path[index]);
  assert.throws(() => core.transitionRun('requested', 'running'), (error) => error.code === 'PERFORMANCE_RUN_TRANSITION_INVALID' && error.statusCode === 409);
  assert.throws(() => core.transitionRun('cleaned_up', 'running'), (error) => error.code === 'PERFORMANCE_RUN_TRANSITION_INVALID');
});

test('seeded fixtures are deterministic, isolated, bounded, and safely cleaned up', () => {
  const first = core.generateFixtureManifest(scenario());
  const second = core.generateFixtureManifest(scenario());
  assert.deepEqual(first, second);
  assert.equal(first.organizations.length, 2);
  assert.equal(first.workspaces.length, 4);
  assert.ok([...first.organizations, ...first.workspaces, ...first.users, ...first.passports, ...first.definitions].every((record) => record.testOrigin === true && record.fixtureSetId === first.fixtureSetId));

  const foreign = { fixtureSetId: 'foreign-fixture', testOrigin: true };
  const protectedRecord = { fixtureSetId: first.fixtureSetId, testOrigin: false };
  const records = [first.organizations[0], first.users[0], foreign, protectedRecord];
  const cleanup = core.cleanupFixtureRecords(records, first.fixtureSetId);
  assert.equal(cleanup.removedCount, 2);
  assert.deepEqual(cleanup.retained, [foreign, protectedRecord]);
  assert.equal(core.cleanupFixtureRecords(cleanup.retained, first.fixtureSetId).removedCount, 0);
});

test('security guards reject secret-shaped values, executable objects, cycles, and unsafe accessors', () => {
  assert.throws(() => core.assertSafeObject({ password: 'not-persisted' }), (error) => error.code === 'PERFORMANCE_DATA_UNSAFE');
  assert.throws(() => core.assertSafeObject({ customCode: 'run' }), (error) => error.code === 'PERFORMANCE_DATA_UNSAFE');
  assert.doesNotThrow(() => core.assertSafeObject({ safeReasonCode: 'PERFORMANCE_ALLOWED' }));
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => core.assertSafeObject(cyclic), (error) => error.code === 'PERFORMANCE_DATA_UNSAFE');
  const accessor = {}; Object.defineProperty(accessor, 'value', { enumerable: true, get() { return 'unsafe'; } });
  assert.throws(() => core.assertSafeObject(accessor), (error) => error.code === 'PERFORMANCE_DATA_UNSAFE');

  const exported = core.createSafeExport({
    generatedAt: '2026-01-01T00:00:00.000Z',
    scenario: { name: 'safe', authorization: 'Bearer sample-secret', nested: { databaseUri: 'mongodb://user:pass@host/db' } },
    performanceSummary: passingSummary(),
  });
  const serialized = JSON.stringify(exported);
  assert.equal(serialized.includes('sample-secret'), false);
  assert.equal(serialized.includes('mongodb://'), false);
  assert.equal(serialized.includes('authorization'), false);
  assert.equal(serialized.includes('databaseUri'), false);
});

test('abort conditions fail closed on correctness, security, failure-rate, and queue evidence', () => {
  const result = core.evaluateAbortConditions({
    correctnessViolationCount: 1,
    securityViolationCount: 1,
    unexpectedFailureCount: 3,
    requestCount: 20,
    queueSummary: { depth: 101 },
    workerSummary: { leaseExpiryCount: 2 },
    memorySummary: { category: 'critical' },
    targetAvailable: false,
    regionalSummary: { splitBrainRisk: true },
    cleanupFailureRisk: true,
  }, [
    'correctness_violation',
    'security_violation',
    { category: 'unexpected_failure_rate', threshold: 1_000 },
    { category: 'queue_depth_hard_limit', threshold: 100 },
    { category: 'lease_expiry_hard_limit', threshold: 1 },
    'memory_critical',
    'target_unavailable',
    'regional_split_brain_risk',
    'cleanup_failure_risk',
  ]);
  assert.equal(result.abort, true);
  assert.deepEqual(result.safeReasonCodes, [
    'PERFORMANCE_CORRECTNESS_VIOLATION',
    'PERFORMANCE_SECURITY_VIOLATION',
    'PERFORMANCE_UNEXPECTED_FAILURE_RATE_ABORT',
    'PERFORMANCE_QUEUE_DEPTH_ABORT',
    'PERFORMANCE_LEASE_EXPIRY_ABORT',
    'PERFORMANCE_MEMORY_CRITICAL',
    'PERFORMANCE_TARGET_UNAVAILABLE',
    'PERFORMANCE_REGIONAL_SPLIT_BRAIN_RISK',
    'PERFORMANCE_CLEANUP_FAILURE_RISK',
  ]);
});
