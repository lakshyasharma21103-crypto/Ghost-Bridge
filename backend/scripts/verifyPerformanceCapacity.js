const assert = require('node:assert/strict');
const models = require('../src/models');
const core = require('../src/services/performanceCapacityCore.service');
const metrics = require('../src/services/performanceCapacityMetrics.service');
const { DeterministicPerformanceHarness } = require('../src/services/performanceCapacityHarness.service');
const { performanceCapacityRouter } = require('../src/routes/performanceCapacityRoutes');
const { getPermission, PERMISSION_REGISTRY_VERSION } = require('../src/constants/permissionRegistry');

function pass(label) { process.stdout.write(`PASS ${label}\n`); }

function scenario(overrides = {}) {
  return core.normalizeScenario({
    scope: 'workspace', organizationId: 'perf-org-root', workspaceId: 'perf-workspace-root',
    name: 'Bounded local smoke', version: 1, status: 'draft', testMode: 'local_smoke',
    workloadDomain: 'orchestration_submission', criticality: 'standard', trafficModel: 'closed_loop',
    targetId: 'local-in-process-v1', durationMs: 6_000, warmupDurationMs: 1_000,
    steadyStateDurationMs: 4_000, cooldownDurationMs: 1_000, targetConcurrency: 4,
    maximumConcurrency: 8, targetRequestsPerSecond: 10, maximumRequestsPerSecond: 20,
    tenantCount: 2, workspaceCount: 4, userCount: 4, orchestrationDefinitionCount: 2,
    mockAgentCount: 4, workerCount: 3, fixtureProfile: 'orchestration', fixtureSeed: 13_004,
    performanceBudgetPolicyId: 'perf-budget-1', performanceBudgetPolicyVersion: 1,
    cleanupPolicy: 'delete_fixture_set', residencyTag: 'synthetic-local', ...overrides,
  });
}

function budget(overrides = {}) {
  return core.normalizeBudget({ scope: 'workspace', organizationId: 'perf-org-root', workspaceId: 'perf-workspace-root', workloadDomain: 'orchestration_submission', name: 'Local smoke budget', version: 1, status: 'draft', ...overrides });
}

function baselineFrom(result, fingerprint, policy) {
  const latency = result.summary.latencyPercentiles;
  return {
    scope: 'workspace', organizationId: 'perf-org-root', workspaceId: 'perf-workspace-root',
    workloadDomain: result.scenario.workloadDomain, scenarioId: 'perf-scenario-1', scenarioVersion: result.scenario.version,
    baselineName: 'Compatible local baseline', baselineVersion: 1,
    environmentFingerprintId: fingerprint.fingerprintId, softwareVersion: '0.1.0', protocolVersion: '1',
    schemaVersion: '13E4', migrationVersion: '1304', routingVersion: '1', cacheSerializationVersion: '1',
    sampleSize: result.summary.requestCount, errorRateBasisPoints: 0,
    regressionToleranceBasisPoints: policy.regressionToleranceBasisPoints,
    absoluteRegressionToleranceMs: policy.absoluteRegressionToleranceMs,
    summaryMetrics: { requestCount: result.summary.requestCount }, latencyPercentiles: { p50Ms: latency.p50Ms, p90Ms: latency.p90Ms, p95Ms: latency.p95Ms, p99Ms: latency.p99Ms, maximumMs: latency.maximumMs },
    throughputSummary: result.summary.throughputSummary, queueSummary: result.summary.queueSummary,
    databaseSummary: result.summary.databaseSummary, cacheSummary: result.summary.cacheSummary,
    workerSummary: result.summary.workerSummary, fairnessSummary: result.summary.fairnessSummary,
    recoverySummary: {}, regionalSummary: result.summary.regionalSummary, sourceRunId: 'perf-run-1', status: 'candidate',
  };
}

function comparisonRun(result) {
  return {
    sampleSize: result.summary.requestCount, requestCount: result.summary.requestCount,
    workloadDomain: result.scenario.workloadDomain, scenarioVersion: result.scenario.version,
    mode: result.scenario.testMode, budgetPolicyVersion: 1,
    latencyPercentiles: result.summary.latencyPercentiles,
    throughputSummary: result.summary.throughputSummary,
    queueSummary: result.summary.queueSummary, errorRateBasisPoints: 0,
  };
}

async function main() {
  metrics.reset();
  const targets = core.listTargets();
  assert.equal(targets.length, 5);
  assert.equal(targets.find((item) => item.category === 'production_metrics_only').allowedModes[0], 'production_observation_only');
  assert.throws(() => core.getTarget('https://arbitrary.invalid'), (error) => error.code === 'LOAD_SCENARIO_TARGET_NOT_ALLOWED');
  pass('performance target registry');

  const policy = budget();
  assert.equal(core.validateBudget(policy).valid, true);
  assert.equal(new models.PerformanceBudgetPolicy({ ...policy, createdBy: 'perf-operator' }).validateSync(), undefined);
  pass('performance budget policy');

  const configured = scenario();
  assert.equal(core.validateScenario(configured, { budget: policy }).valid, true);
  assert.equal(new models.PerformanceLoadScenario({ ...configured, createdBy: 'perf-operator' }).validateSync(), undefined);
  assert.throws(() => core.normalizeScenario({ ...configured, arbitraryScript: 'while(true){}' }), (error) => error.code === 'LOAD_SCENARIO_INVALID');
  const productionTraffic = core.validateScenario(core.normalizeScenario({ scope: 'workspace', organizationId: 'perf-org-root', workspaceId: 'perf-workspace-root', name: 'Rejected production traffic', testMode: 'production_observation_only', workloadDomain: 'orchestration_submission', targetId: 'local-in-process-v1', targetConcurrency: 0, maximumConcurrency: 0, targetRequestsPerSecond: 0, maximumRequestsPerSecond: 0, durationMs: 5_000, warmupDurationMs: 0, steadyStateDurationMs: 5_000, cooldownDurationMs: 0, performanceBudgetPolicyId: 'perf-budget-1', performanceBudgetPolicyVersion: 1, residencyTag: 'production-observation' }), { budget: policy });
  assert.equal(productionTraffic.valid, false);
  pass('load scenario validation');

  const manifestA = core.generateFixtureManifest(configured);
  const manifestB = core.generateFixtureManifest(configured);
  assert.deepEqual(manifestA, manifestB);
  assert.equal(manifestA.organizations.length, 2);
  assert.equal(JSON.stringify(manifestA).includes('credential'), false);
  pass('deterministic fixture generation');

  const harness = new DeterministicPerformanceHarness({ scenario: configured });
  const result = harness.execute({ includeRegional: true });
  assert.equal(result.windows[0].stage, 'warmup'); pass('warmup stage');
  assert.equal(result.windows[1].stage, 'steady_state'); pass('steady-state stage');
  assert.equal(result.windows[2].stage, 'cooldown'); pass('cooldown stage');
  assert.equal(result.invariants.authenticated, true); pass('authenticated API load');
  assert.ok(result.summary.requestCount >= 20); pass('orchestration load');
  assert.ok(result.scale.workers.size >= 3); pass('multi-worker execution');
  assert.equal(result.invariants.acceptedWorkDurable, true); pass('accepted work durable');
  assert.equal(result.invariants.noDuplicateExecution, true); pass('no duplicate execution');
  assert.equal(result.invariants.requestTraceLineage, true); pass('request and trace lineage');

  assert.ok(result.summary.latencyPercentiles.p50Ms <= result.summary.latencyPercentiles.p95Ms);
  assert.ok(result.summary.latencyPercentiles.p95Ms <= result.summary.latencyPercentiles.p99Ms);
  pass('latency percentiles');
  assert.ok(result.summary.throughputSummary.requestsPerSecond > 0); pass('throughput summary');
  assert.equal(result.summary.queueSummary.acceptedWorkDurable, true); pass('queue summary');
  assert.ok(result.summary.workerSummary.activeWorkers >= 3); pass('worker summary');
  assert.equal(result.summary.databaseSummary.indexedReadCategory, 'expected_index'); pass('database summary');
  assert.equal(result.summary.cacheSummary.hitCount, 1); pass('cache summary');

  const passing = core.evaluateBudget(result.summary, policy, { acceptedWorkPreserved: true, protectedCapacityAvailable: true });
  assert.equal(passing.status, 'passed'); pass('performance budget pass');
  const breached = core.evaluateBudget({ ...result.summary, latencyPercentiles: { ...result.summary.latencyPercentiles, p95Ms: policy.latencyBudgets.p95Ms + 1_000 } }, policy, { acceptedWorkPreserved: true, protectedCapacityAvailable: true });
  assert.equal(breached.status, 'failed');
  assert.ok(breached.safeReasonCodes.includes('PERFORMANCE_BUDGET_LATENCY_P95_EXCEEDED'));
  pass('performance budget failure');

  const fingerprint = core.createEnvironmentFingerprint({ environmentCategory: 'local', operatingSystemCategory: 'windows', architectureCategory: 'x64', backendProcessCount: 2, executionWorkerCount: 3, recoveryWorkerCount: 1, controlPlaneWorkerCount: 1, databaseAdapterCategory: 'mock', databaseTopologyCategory: 'simulated', cacheAdapterCategory: 'memory', regionalSimulationCategory: 'local_simulation', cpuCapacityCategory: 'standard', memoryCapacityCategory: 'standard', networkCategory: 'in_process' });
  assert.equal(new models.PerformanceEnvironmentFingerprint(fingerprint).validateSync(), undefined);
  const baseline = baselineFrom(result, fingerprint, policy);
  assert.equal(new models.PerformanceBaseline(baseline).validateSync(), undefined);
  pass('baseline created');
  const compatible = core.compareRegression({ baseline, run: comparisonRun(result), baselineEnvironment: fingerprint, runEnvironment: { ...fingerprint }, minimumSampleSize: policy.minimumSampleSize });
  assert.ok(['unchanged', 'improved'].includes(compatible.status)); pass('compatible baseline comparison');
  const regressedRun = comparisonRun(result);
  regressedRun.latencyPercentiles = { ...regressedRun.latencyPercentiles, p50Ms: regressedRun.latencyPercentiles.p50Ms + 500, p95Ms: regressedRun.latencyPercentiles.p95Ms + 1_000, p99Ms: regressedRun.latencyPercentiles.p99Ms + 1_500 };
  const regression = core.compareRegression({ baseline, run: regressedRun, baselineEnvironment: fingerprint, runEnvironment: fingerprint, minimumSampleSize: policy.minimumSampleSize });
  assert.equal(regression.status, 'regressed'); pass('regression detected');
  const incompatibleEnvironment = core.createEnvironmentFingerprint({ ...fingerprint, cpuCapacityCategory: 'large' });
  const incompatible = core.compareRegression({ baseline, run: comparisonRun(result), baselineEnvironment: fingerprint, runEnvironment: incompatibleEnvironment, minimumSampleSize: policy.minimumSampleSize });
  assert.equal(incompatible.status, 'incompatible'); pass('incompatible environment rejected');

  const fairness = harness.fairnessScenario();
  assert.equal(fairness.normalTenantContinuedService, true); pass('tenant fairness');
  assert.equal(fairness.tenantIdsExposedInMetrics, false); pass('noisy tenant isolation');

  const spikeScenario = scenario({ name: 'Bounded spike', trafficModel: 'spike', fixtureSeed: 13_005 });
  const spikeHarness = new DeterministicPerformanceHarness({ scenario: spikeScenario });
  const spike = spikeHarness.execute({ forceSpike: true });
  assert.ok(spike.summary.overloadRejectionCount > 0); pass('spike backpressure');
  assert.equal(spike.windows[1].backpressureState, 'shedding'); pass('load shedding');
  assert.equal(spike.invariants.protectedRecoveryCapacity, true); pass('protected recovery capacity');

  const crash = harness.simulateWorkerCrash();
  assert.equal(crash.leaseRecovered, true); pass('worker crash recovery');
  assert.equal(crash.staleWorkerFenced, true); pass('stale worker fenced');
  assert.equal(crash.executionCount, 1);

  assert.equal(result.summary.cacheSummary.missCount, 1);
  assert.equal(result.summary.cacheSummary.hitCount, 1); pass('cache cold and warm behavior');
  assert.equal(result.summary.regionalSummary.authorityTransferred, true); pass('regional failover under load');
  assert.equal(result.summary.regionalSummary.staleWriterRejected, true); pass('stale regional writer rejected');
  assert.equal(result.summary.regionalSummary.resumedExactlyOnce, true); pass('resumed work exactly once');

  const capacity = core.estimateCapacity({ durationMs: configured.steadyStateDurationMs, requestCount: result.summary.requestCount, completedCount: result.summary.successfulRequestCount, observedArrivalRate: result.summary.throughputSummary.requestsPerSecond, observedCompletionRate: result.summary.throughputSummary.requestsPerSecond, averageServiceTimeMs: result.summary.latencyPercentiles.p50Ms, observedConcurrency: configured.targetConcurrency, observedQueueWait: result.summary.queueSummary.p95Ms, observedWorkerUtilizationBasisPoints: result.summary.workerSummary.utilizationBasisPoints, observedDatabasePressure: 'healthy', observedCacheHitRate: result.summary.cacheSummary.hitRateBasisPoints, queueDepth: 20, workerCount: 3, minimumHeadroomBasisPoints: 1_500, expectedPeakRequestsPerSecond: 15, minimumSampleSize: 20, environmentCategory: 'local' });
  const capacityRecord = new models.CapacityModel({ scope: 'workspace', organizationId: 'perf-org-root', workspaceId: 'perf-workspace-root', workloadDomain: configured.workloadDomain, scenarioId: 'perf-scenario-1', scenarioVersion: 1, environmentFingerprintId: fingerprint.fingerprintId, status: 'candidate', modelVersion: 1, ...capacity, sourcePerformanceRunIds: ['perf-run-1'], createdBy: 'perf-operator' });
  assert.equal(capacityRecord.validateSync(), undefined); pass('capacity model');
  assert.ok(capacity.safeConcurrencyEstimate >= 1); pass('safe concurrency estimate');
  assert.ok(capacity.queueDrainRateEstimate >= 0); pass('queue drain estimate');
  assert.notEqual(capacity.headroomCategory, 'unknown'); pass('headroom category');

  const planRecord = new models.CapacityPlan({ scope: 'workspace', organizationId: 'perf-org-root', workspaceId: 'perf-workspace-root', workloadDomain: configured.workloadDomain, name: 'Advisory local capacity', version: 1, status: 'draft', forecastWindow: 'thirty_days', expectedPeakRequestsPerSecond: 15, expectedPeakConcurrentRuns: 20, expectedPeakConcurrentNodes: 40, expectedQueueDepth: 100, expectedDataGrowthCategory: 'moderate', requiredExecutionWorkers: capacity.requiredExecutionWorkers || 3, requiredRecoveryWorkers: 1, requiredControlPlaneWorkers: 1, recommendedWorkerConcurrency: capacity.safeConcurrencyEstimate, recommendedPartitionCount: capacity.recommendedPartitionCount || 1, recommendedDatabaseCapacityCategory: 'standard', recommendedCacheCapacityCategory: 'standard', reservedRecoveryCapacity: 1, minimumHeadroomBasisPoints: 1_500, regionalCapacityRequirements: [{ regionCategory: 'standby', failoverPolicy: 'full_primary_load', requiredCapacityBasisPoints: 10_000, requiredExecutionWorkers: 3, requiredRecoveryWorkers: 1, headroomCategory: 'adequate' }], failoverCapacityRequirementBasisPoints: 10_000, sourceCapacityModelIds: ['perf-capacity-model-1'], assumptions: capacity.assumptions, limitations: capacity.limitations, createdBy: 'perf-operator' });
  assert.equal(planRecord.validateSync(), undefined); pass('capacity plan');
  const recommendations = core.autoscalingRecommendations({ sufficientData: true, headroomCategory: capacity.headroomCategory, confidenceCategory: capacity.confidenceCategory, workerUtilizationBasisPoints: 9_000, databasePressureCategory: 'healthy', cacheHealthCategory: 'healthy', protectedRecoveryHeadroomBasisPoints: 2_000, evidenceWindow: 'steady_state' });
  assert.ok(recommendations.every((item) => item.limitations.some((text) => text.includes('provider')))); pass('autoscaling recommendations');

  const exported = core.createSafeExport({ scenario: configured, environmentFingerprint: fingerprint, budgetPolicy: policy, performanceSummary: result.summary, budgetEvaluation: passing, regressionEvaluation: compatible, capacityModel: capacity, recommendations, bottleneckSummary: core.bottleneckSummary(result.summary), generatedAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(exported.exportVersion, 'performance-capacity.v1'); pass('safe performance export');
  const exportText = JSON.stringify(exported);
  for (const forbidden of ['authorization', 'bearer ', 'runtimeToken', 'installKey', 'providerApiKey', 'mongodb://', 'requestBody', 'responseBody', 'hiddenReasoning']) assert.equal(exportText.toLowerCase().includes(forbidden.toLowerCase()), false);
  metrics.assertBoundedMetricLabels(metrics.snapshot()); pass('bounded metrics');
  assert.equal(/mongodb(?:\+srv)?:\/\/|bearer\s+|private.?key|provider.?key/i.test(exportText), false); pass('no credentials leaked');

  const records = [...manifestA.organizations, ...manifestA.workspaces, { organizationId: 'real-org', testOrigin: false, fixtureSetId: manifestA.fixtureSetId }];
  const cleaned = core.cleanupFixtureRecords(records, manifestA.fixtureSetId);
  assert.equal(cleaned.retained.some((item) => item.organizationId === 'real-org'), true);
  assert.equal(core.cleanupFixtureRecords(cleaned.retained, manifestA.fixtureSetId).removedCount, 0); pass('fixture cleanup');
  assert.equal(result.invariants.tenantIsolation, true); pass('tenant isolation');

  assert.equal(core.transitionRun('requested', 'validating'), 'validating');
  assert.throws(() => core.transitionRun('passed', 'running'), (error) => error.code === 'PERFORMANCE_RUN_TRANSITION_INVALID');
  assert.ok(performanceCapacityRouter.stack.length >= 40);
  assert.ok(PERMISSION_REGISTRY_VERSION >= 13);
  for (const permissionId of ['performanceRun.executeLocal', 'performanceRun.executeStaging', 'performanceBaseline.promote', 'capacityPlan.activate', 'performanceTesting.export']) {
    const permission = getPermission(permissionId); assert.ok(permission); assert.equal(permission.defaultRoles.includes('viewer'), false); assert.equal(permission.defaultRoles.includes('developer'), false);
  }
  assert.ok(['PerformanceLoadScenario', 'PerformanceBudgetPolicy', 'PerformanceTestRun', 'PerformanceMeasurementWindow', 'PerformanceBaseline', 'CapacityModel', 'CapacityPlan'].every((name) => models[name].schema.indexes().every(([, options]) => options.name)));
  pass('performance-capacity verification');
}

main().catch((error) => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; });
