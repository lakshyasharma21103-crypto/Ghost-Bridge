const assert = require('node:assert/strict');
const test = require('node:test');
const core = require('../services/performanceCapacityCore.service');
const {
  DeterministicPerformanceHarness,
  executeScenarioSimulation,
} = require('../services/performanceCapacityHarness.service');

function scenario(overrides = {}) {
  return {
    organizationId: 'perf-org-integration',
    workspaceId: 'perf-workspace-integration',
    workloadDomain: 'orchestration_execution',
    testMode: 'simulation',
    targetId: 'local-in-process-v1',
    performanceBudgetPolicyId: 'perf-budget-integration',
    trafficModel: 'closed_loop',
    durationMs: 6_000,
    warmupDurationMs: 1_000,
    steadyStateDurationMs: 4_000,
    cooldownDurationMs: 1_000,
    targetConcurrency: 4,
    maximumConcurrency: 8,
    targetRequestsPerSecond: 10,
    maximumRequestsPerSecond: 20,
    tenantCount: 2,
    workspaceCount: 4,
    userCount: 4,
    workerCount: 3,
    mockAgentCount: 4,
    orchestrationDefinitionCount: 2,
    fixtureSeed: 13_004,
    ...overrides,
  };
}

function budget() {
  return core.defaultBudget({
    organizationId: 'perf-org-integration',
    workspaceId: 'perf-workspace-integration',
    workloadDomain: 'orchestration_execution',
  });
}

test('deterministic simulation exercises warmup, steady state, cooldown, auth, policy, quota, residency, and lineage', () => {
  const result = executeScenarioSimulation(scenario(), { orchestrationCount: 32 });
  assert.deepEqual(result.windows.map((window) => window.stage), ['warmup', 'steady_state', 'cooldown']);
  assert.ok(result.samples.some((sample) => sample.stage === 'warmup'));
  assert.ok(result.samples.some((sample) => sample.stage === 'steady_state'));
  assert.equal(result.samples.some((sample) => sample.stage === 'cooldown'), false);
  assert.equal(result.invariants.authenticated, true);
  assert.equal(result.invariants.tenantIsolation, true);
  assert.equal(result.invariants.requestTraceLineage, true);
  assert.equal(result.invariants.acceptedWorkDurable, true);
  assert.equal(result.invariants.noDuplicateExecution, true);
  assert.equal(result.invariants.protectedRecoveryCapacity, true);
  assert.equal(result.summary.queueSummary.acceptedWorkDurable, true);
  assert.equal(result.harness.acceptedLogicalIds.size, 32);
  assert.equal(result.harness.completedLogicalIds.size, 32);
});

test('multiple workers complete each accepted logical item exactly once', () => {
  const harness = new DeterministicPerformanceHarness({ scenario: scenario({ fixtureSeed: 13_005 }) });
  const workers = harness.registerWorkers();
  assert.equal(workers.filter((worker) => worker.workerPool === 'execution').length, 3);
  harness.enqueueOrchestration(60);
  const result = harness.executeQueued();
  assert.equal(result.completed, 60);
  assert.equal(result.duplicateLogicalExecution, false);
  assert.equal(harness.scale.completions.length, 60);
  assert.equal(new Set(harness.scale.completions.map((entry) => entry.logicalId)).size, 60);
});

test('spike traffic sheds expected overload without converting rejections to internal failures', () => {
  const result = executeScenarioSimulation(scenario({ trafficModel: 'spike', fixtureSeed: 13_006 }), {
    forceSpike: true,
    orchestrationCount: 24,
  });
  assert.ok(result.summary.overloadRejectionCount > 0);
  assert.equal(result.summary.unexpectedFailureCount, 0);
  assert.equal(result.invariants.acceptedWorkDurable, true);
  assert.equal(result.invariants.noDuplicateExecution, true);
  assert.equal(result.windows[1].backpressureState, 'shedding');

  const accepted = core.evaluateBudget(result.summary, budget(), {
    intentionalOverload: true,
    acceptedWorkPreserved: result.invariants.acceptedWorkDurable,
    protectedCapacityAvailable: result.invariants.protectedRecoveryCapacity,
  });
  assert.equal(accepted.status, 'passed_with_warnings');
  const unprotected = core.evaluateBudget(result.summary, budget(), {
    intentionalOverload: true,
    acceptedWorkPreserved: true,
    protectedCapacityAvailable: false,
  });
  assert.equal(unprotected.status, 'failed');
  assert.ok(unprotected.safeReasonCodes.includes('PERFORMANCE_OVERLOAD_INVARIANT_FAILED'));
});

test('fair scheduling protects a normal tenant and does not expose tenant identifiers in metric labels', () => {
  const harness = new DeterministicPerformanceHarness({ scenario: scenario({ fixtureSeed: 13_007 }) });
  const result = harness.fairnessScenario();
  assert.equal(result.normalTenantContinuedService, true);
  assert.equal(result.normalTenantServiceCount, 45);
  assert.equal(result.category, 'bounded_skew');
  assert.equal(result.tenantIdsExposedInMetrics, false);
});

test('cache-aside behavior records deterministic misses and hits without changing values', () => {
  const harness = new DeterministicPerformanceHarness({ scenario: scenario({ fixtureSeed: 13_008 }) });
  let loads = 0;
  const first = harness.cacheRead('definition:v1', () => { loads += 1; return { version: 1 }; });
  const second = harness.cacheRead('definition:v1', () => { loads += 1; return { version: 2 }; });
  assert.equal(first.outcome, 'miss');
  assert.equal(second.outcome, 'hit');
  assert.deepEqual(second.value, { version: 1 });
  assert.equal(loads, 1);
  assert.deepEqual(harness.cacheSummary(), { hitCount: 1, missCount: 1, hitRateBasisPoints: 5_000, healthCategory: 'healthy' });
});

test('worker crash recovery reclaims the lease and fences the stale worker', () => {
  const harness = new DeterministicPerformanceHarness({ scenario: scenario({ fixtureSeed: 13_009 }) });
  harness.registerWorkers();
  const recovery = harness.simulateWorkerCrash();
  assert.deepEqual(recovery, { leaseRecovered: true, staleWorkerFenced: true, executionCount: 1 });
});

test('regional failover transfers authority and ownership, fences stale writers, and resumes exactly once', () => {
  const harness = new DeterministicPerformanceHarness({ scenario: scenario({
    workloadDomain: 'regional_failover_simulation',
    fixtureSeed: 13_010,
  }) });
  const regional = harness.simulateRegionalFailover();
  assert.equal(regional.admissionFrozen, true);
  assert.equal(regional.authorityTransferred, true);
  assert.equal(regional.queueOwnershipTransferred, true);
  assert.equal(regional.targetWorkerActivated, true);
  assert.equal(regional.staleWriterRejected, true);
  assert.equal(regional.resumedExactlyOnce, true);
  assert.equal(regional.failoverRpoMs, 4_000);
  assert.ok(regional.failoverRtoMs <= 120_000);
  assert.equal(regional.routingErrorRateBasisPoints, 0);
});

test('the same fixture seed and clock reproduce traffic and window evidence', () => {
  const options = { now: '2026-01-01T00:00:00.000Z', orchestrationCount: 20 };
  const first = executeScenarioSimulation(scenario({ fixtureSeed: 13_011 }), options);
  const second = executeScenarioSimulation(scenario({ fixtureSeed: 13_011 }), options);
  assert.deepEqual(first.fixtures, second.fixtures);
  assert.deepEqual(first.samples, second.samples);
  assert.deepEqual(first.windows, second.windows);
  assert.deepEqual(first.summary, second.summary);
});
