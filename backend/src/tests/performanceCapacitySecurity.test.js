const assert = require('node:assert/strict');
const test = require('node:test');
const core = require('../services/performanceCapacityCore.service');
const CapacityPlan = require('../models/CapacityPlan');
const PerformanceBaseline = require('../models/PerformanceBaseline');
const PerformanceEnvironmentFingerprint = require('../models/PerformanceEnvironmentFingerprint');
const PerformanceFailureInjectionProfile = require('../models/PerformanceFailureInjectionProfile');
const PerformanceTestRun = require('../models/PerformanceTestRun');
const { rejectTestFaultControls } = require('../middleware/rejectTestFaultControls');

test('application request paths reject test fault-injection headers', () => {
  let received;
  rejectTestFaultControls({ headers: { 'x-test-fault-injection': 'synthetic_timeout' } }, {}, (error) => { received = error; });
  assert.equal(received?.code, 'PERFORMANCE_FAULT_INJECTION_DENIED');
  assert.equal(received?.statusCode, 400);
  let passed = false;
  rejectTestFaultControls({ headers: { 'x-request-id': 'safe-request' } }, {}, (error) => { assert.equal(error, undefined); passed = true; });
  assert.equal(passed, true);
});

test('scenario definitions reject arbitrary methods, headers, bodies, and URLs', () => {
  const base = {
    organizationId: 'security-org', workspaceId: 'security-workspace',
    workloadDomain: 'interactive_api', performanceBudgetPolicyId: 'security-budget',
  };
  for (const payload of [
    { method: 'POST' }, { headers: { Authorization: 'value' } },
    { requestBody: { value: true } }, { targetUrl: 'https://example.invalid' },
  ]) assert.throws(() => core.normalizeScenario({ ...base, ...payload }), (error) => error.code === 'LOAD_SCENARIO_INVALID');
  assert.throws(() => core.normalizeScenario({ ...base, testMode: 'production_stress' }), (error) => error.code === 'LOAD_SCENARIO_MODE_NOT_ALLOWED');
  assert.throws(() => core.normalizeScenario({ ...base, trafficModel: 'unbounded' }), (error) => error.code === 'LOAD_SCENARIO_INVALID');
});

test('fault-injection profiles are restricted to mock targets and non-production modes', () => {
  const base = {
    scope: 'workspace', organizationId: 'security-org', workspaceId: 'security-workspace',
    name: 'Synthetic timeout', version: 1, status: 'draft', allowedModes: ['simulation'],
    injectionRules: [{ category: 'synthetic_timeout', probabilityBasisPoints: 100, maximumInjectionCount: 1, targetCategory: 'test_adapter', safeReasonCode: 'SYNTHETIC_TIMEOUT' }],
    createdBy: 'security-operator',
  };
  assert.equal(new PerformanceFailureInjectionProfile(base).validateSync(), undefined);
  const production = new PerformanceFailureInjectionProfile({ ...base, allowedModes: ['production_observation_only'] }).validateSync();
  assert.ok(production?.errors?.allowedModes);
  const realTarget = new PerformanceFailureInjectionProfile({ ...base, injectionRules: [{ ...base.injectionRules[0], targetCategory: 'production_database' }] }).validateSync();
  assert.ok(realTarget?.errors?.['injectionRules.0.targetCategory']);
});

test('durable evidence schemas reject credential-shaped scalar fields', () => {
  const capacityError = new CapacityPlan({ name: 'Plan', description: 'Bearer not-allowed', assumptions: [], limitations: [] }).validateSync();
  assert.ok(capacityError?.errors?.description);
  const baselineError = new PerformanceBaseline({ baselineName: 'mongodb://user:pass@host/db' }).validateSync();
  assert.ok(baselineError?.errors?.baselineName);
  const fingerprint = core.createEnvironmentFingerprint({ environmentCategory: 'local' });
  const fingerprintError = new PerformanceEnvironmentFingerprint({ ...fingerprint, runtimeVersion: 'redis://private-host' }).validateSync();
  assert.ok(fingerprintError?.errors?.runtimeVersion);
  const runError = new PerformanceTestRun({ targetId: 'https://arbitrary.invalid' }).validateSync();
  assert.ok(runError?.errors?.targetId);
});
