const assert = require('node:assert/strict');
const test = require('node:test');
const CapacityModel = require('../models/CapacityModel');
const PerformanceBaseline = require('../models/PerformanceBaseline');
const operations = require('../services/performanceCapacityOperations.service');

function caller(organizationId = 'perf-org-contract') {
  return {
    partner: { _id: organizationId },
    requestId: 'perf-request-contract',
    traceId: 'perf-trace-contract',
  };
}

function query(resolveValue) {
  let limitValue;
  const api = {
    select() { return api; },
    sort() { return api; },
    limit(value) { limitValue = value; return api; },
    lean() { return Promise.resolve(value()); },
    then(resolve, reject) { return Promise.resolve(value()).then(resolve, reject); },
  };
  function value() {
    const resolved = typeof resolveValue === 'function' ? resolveValue() : resolveValue;
    return Array.isArray(resolved) && Number.isInteger(limitValue)
      ? resolved.slice(0, limitValue)
      : resolved;
  }
  return api;
}

function record(value) {
  return {
    ...value,
    toObject() { return { ...value }; },
  };
}

function baseDependencies(overrides = {}) {
  return {
    assertAuthorized: async () => undefined,
    assertOperationalAccess: async () => undefined,
    createAuditLog: async () => undefined,
    enforceApproval: async () => ({ grants: [] }),
    consumeApprovalGrants: async () => undefined,
    ...overrides,
  };
}

function activeScenario(overrides = {}) {
  return record({
    _id: 'scenario-contract',
    scope: 'workspace',
    organizationId: 'perf-org-contract',
    workspaceId: 'workspace-a',
    status: 'active',
    version: 1,
    performanceBudgetPolicyId: 'budget-contract',
    workloadDomain: 'interactive_api',
    testMode: 'simulation',
    trafficModel: 'closed_loop',
    targetId: 'local-in-process-v1',
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
    workerCount: 2,
    mockAgentCount: 2,
    orchestrationDefinitionCount: 2,
    fixtureSeed: 13_004,
    ...overrides,
  });
}

function activeBudget(overrides = {}) {
  return record({
    _id: 'budget-contract',
    organizationId: 'perf-org-contract',
    workspaceId: 'workspace-a',
    status: 'active',
    version: 1,
    regressionToleranceBasisPoints: 1_000,
    absoluteRegressionToleranceMs: 25,
    ...overrides,
  });
}

function passingRun(overrides = {}) {
  return record({
    _id: 'run-contract',
    organizationId: 'perf-org-contract',
    workspaceId: 'workspace-a',
    scenarioId: 'scenario-contract',
    scenarioVersion: 1,
    budgetPolicyId: 'budget-contract',
    budgetPolicyVersion: 1,
    environmentFingerprintId: 'sha256:environment-contract',
    status: 'passed',
    mode: 'simulation',
    workloadDomain: 'interactive_api',
    trafficModel: 'closed_loop',
    targetId: 'local-in-process-v1',
    configuredDurationMs: 10_000,
    actualDurationMs: 10_000,
    achievedConcurrency: 2,
    requestCount: 100,
    successfulRequestCount: 100,
    expectedRejectionCount: 0,
    unexpectedFailureCount: 0,
    timeoutCount: 0,
    unknownOutcomeCount: 0,
    latencyPercentiles: {
      p50Ms: 50,
      p90Ms: 75,
      p95Ms: 90,
      p99Ms: 110,
      maximumMs: 150,
    },
    throughputSummary: { requestsPerSecond: 10 },
    queueSummary: { p95Ms: 5, depth: 0 },
    databaseSummary: { pressureCategory: 'healthy' },
    cacheSummary: { hitRateBasisPoints: 8_000 },
    workerSummary: { utilizationBasisPoints: 5_000, activeWorkers: 2 },
    fairnessSummary: { maximumTenantServiceSkewBasisPoints: 500 },
    recoverySummary: {},
    regionalSummary: {},
    safeFailureCodes: [],
    ...overrides,
  });
}

test('run listing applies exact organization and workspace isolation before pagination', async () => {
  const rows = [
    { _id: 'visible', organizationId: 'perf-org-contract', workspaceId: 'workspace-a', status: 'passed' },
    { _id: 'other-workspace', organizationId: 'perf-org-contract', workspaceId: 'workspace-b', status: 'passed' },
    { _id: 'other-organization', organizationId: 'other-org', workspaceId: 'workspace-a', status: 'passed' },
  ];
  let receivedFilter;
  const PerformanceTestRun = {
    find(filter) {
      receivedFilter = filter;
      const matching = rows.filter((row) => Object.entries(filter).every(([key, expected]) => row[key] === expected));
      return query(matching);
    },
  };

  const result = await operations.listRuns(
    { workspaceId: 'workspace-a', status: 'passed' },
    caller(),
    { dependencies: baseDependencies({ PerformanceTestRun }) },
  );

  assert.deepEqual(receivedFilter, {
    organizationId: 'perf-org-contract',
    workspaceId: 'workspace-a',
    status: 'passed',
  });
  assert.deepEqual(result.items.map((item) => item.id), ['visible']);

  await assert.rejects(
    operations.listRuns(
      { organizationId: 'other-org', workspaceId: 'workspace-a' },
      caller(),
      { dependencies: baseDependencies({ PerformanceTestRun }) },
    ),
    (error) => error.code === 'AUTHORIZATION_DENIED' && error.statusCode === 403,
  );
});

test('run creation invokes service authorization and the execution operational guard', async () => {
  const calls = [];
  const scenario = activeScenario();
  const budget = activeBudget();
  let createdRun;
  const dependencies = baseDependencies({
    assertAuthorized: async (actor, permission, resource, context) => {
      calls.push({ kind: 'authorization', actor, permission, resource, context });
    },
    assertOperationalAccess: async (input) => {
      calls.push({ kind: 'operational', input });
    },
    PerformanceLoadScenario: { findOne: () => query(scenario) },
    PerformanceBudgetPolicy: { findOne: () => query(budget) },
    PerformanceTestRun: {
      findOne: () => query(null),
      create: async (payload) => {
        createdRun = payload;
        return record({ _id: 'created-run', ...payload });
      },
    },
    PerformanceEnvironmentFingerprint: {
      findOne: () => query(null),
      create: async (payload) => payload,
    },
  });

  const result = await operations.createRun(
    { scenarioId: 'scenario-contract', workspaceId: 'workspace-a', idempotencyKey: 'create-run-contract' },
    caller(),
    { dependencies },
  );

  assert.equal(result.id, 'created-run');
  assert.equal(createdRun.organizationId, 'perf-org-contract');
  assert.equal(createdRun.workspaceId, 'workspace-a');
  assert.equal(calls[0].kind, 'authorization');
  assert.equal(calls[0].permission, 'performanceRun.create');
  assert.equal(calls[0].actor.workspaceId, 'workspace-a');
  assert.equal(calls[0].resource.organizationId, 'perf-org-contract');
  assert.deepEqual(calls[1], {
    kind: 'operational',
    input: {
      organizationId: 'perf-org-contract',
      workspaceId: 'workspace-a',
      operation: 'EXECUTION',
    },
  });
});

test('a reused run idempotency key with a different request fingerprint fails closed', async () => {
  let createCalls = 0;
  const dependencies = baseDependencies({
    PerformanceLoadScenario: { findOne: () => query(activeScenario()) },
    PerformanceBudgetPolicy: { findOne: () => query(activeBudget()) },
    PerformanceTestRun: {
      findOne: () => query(record({
        _id: 'prior-run',
        requestFingerprint: 'sha256:a-different-request',
        idempotencyKeyHash: 'sha256:existing-key',
      })),
      create: async () => { createCalls += 1; },
    },
  });

  await assert.rejects(
    operations.createRun(
      { scenarioId: 'scenario-contract', workspaceId: 'workspace-a', idempotencyKey: 'reused-key' },
      caller(),
      { dependencies },
    ),
    (error) => error.code === 'IDEMPOTENCY_CONFLICT' && error.statusCode === 409,
  );
  assert.equal(createCalls, 0);
});

test('baseline creation emits a payload accepted by the strict baseline schema', async () => {
  const run = passingRun();
  let baselineFindCount = 0;
  let captured;
  const dependencies = baseDependencies({
    PerformanceTestRun: { findOne: () => query(run) },
    PerformanceBudgetPolicy: { findOne: () => query(activeBudget()) },
    PerformanceLoadScenario: { findOne: () => query(activeScenario()) },
    PerformanceBaseline: {
      findOne: () => {
        baselineFindCount += 1;
        return query(null);
      },
      create: async (payload) => {
        captured = payload;
        const document = new PerformanceBaseline(payload);
        const validationError = document.validateSync();
        assert.equal(validationError, undefined, validationError?.message);
        return document;
      },
    },
  });

  const result = await operations.createBaseline(
    { sourceRunId: 'run-contract', workspaceId: 'workspace-a', baselineName: 'Contract baseline', idempotencyKey: 'baseline-contract' },
    caller(),
    { dependencies },
  );

  assert.equal(baselineFindCount, 2);
  assert.equal(result.baselineName, 'Contract baseline');
  assert.deepEqual(captured.latencyPercentiles, run.latencyPercentiles);
  assert.equal(captured.summaryMetrics.mode, 'simulation');
  assert.equal(captured.summaryMetrics.fixtureScale.workspaceCount, 4);
});

test('capacity-model creation emits a payload accepted by the strict capacity schema', async () => {
  const run = passingRun();
  let capacityFindCount = 0;
  let captured;
  const dependencies = baseDependencies({
    PerformanceTestRun: { findOne: () => query(run) },
    PerformanceEnvironmentFingerprint: {
      findOne: () => query({ environmentCategory: 'local' }),
    },
    CapacityModel: {
      findOne: () => {
        capacityFindCount += 1;
        return query(null);
      },
      create: async (payload) => {
        captured = payload;
        const document = new CapacityModel(payload);
        const validationError = document.validateSync();
        assert.equal(validationError, undefined, validationError?.message);
        return document;
      },
    },
  });

  const result = await operations.createCapacityModel(
    'run-contract',
    { workspaceId: 'workspace-a', expectedPeakRequestsPerSecond: 8, idempotencyKey: 'capacity-contract' },
    caller(),
    { dependencies },
  );

  assert.equal(capacityFindCount, 2);
  assert.equal(result.workloadDomain, 'interactive_api');
  assert.equal(captured.scope, 'workspace');
  assert.deepEqual(captured.sourcePerformanceRunIds, ['run-contract']);
  assert.ok(captured.sustainableThroughputEstimate <= captured.saturationPointEstimate);
  assert.ok(captured.limitations.some((item) => item.includes('do not prove production capacity')));
});

test('staging and other heavy executions require both mode-specific and heavy permissions', async () => {
  const cases = [
    {
      run: passingRun({ status: 'requested', mode: 'staging_load', trafficModel: 'closed_loop' }),
      firstPermission: 'performanceRun.executeStaging',
    },
    {
      run: passingRun({ status: 'requested', mode: 'simulation', trafficModel: 'spike' }),
      firstPermission: 'performanceRun.executeLocal',
    },
  ];

  for (const current of cases) {
    const permissions = [];
    let guardCalls = 0;
    const dependencies = baseDependencies({
      PerformanceTestRun: { findOne: () => query(current.run) },
      assertAuthorized: async (_actor, permission) => {
        permissions.push(permission);
        if (permission === 'performanceRun.executeHeavy') {
          const error = new Error('heavy execution denied');
          error.code = 'AUTHORIZATION_DENIED';
          error.statusCode = 403;
          throw error;
        }
      },
      assertOperationalAccess: async () => { guardCalls += 1; },
    });

    await assert.rejects(
      operations.executeRun(
        'run-contract',
        { workspaceId: 'workspace-a' },
        caller(),
        { dependencies },
      ),
      (error) => error.code === 'AUTHORIZATION_DENIED' && error.statusCode === 403,
    );
    assert.deepEqual(permissions, [current.firstPermission, 'performanceRun.executeHeavy']);
    assert.equal(guardCalls, 0);
  }
});
