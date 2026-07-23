import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (relative) => readFileSync(join(root, relative), 'utf8');

test('Operations exposes every Phase 13E4 performance and capacity page', () => {
  const app = read('src/App.jsx');
  const sidebar = read('src/components/Sidebar.jsx');
  const navigation = read('src/components/PerformanceCapacityNav.jsx');
  for (const route of [
    '/operations/load-tests',
    '/operations/performance-budgets',
    '/operations/baselines',
    '/operations/capacity-planning',
  ]) {
    assert.ok(app.includes(`path="${route}"`));
    assert.ok(navigation.includes(route));
  }
  assert.ok(app.includes('path="/operations/load-tests/:runId"'));
  for (const label of ['Load Tests', 'Performance Budgets', 'Baselines', 'Capacity Planning']) {
    assert.ok(sidebar.includes(`label: '${label}'`));
  }
});

test('load-test inventory exposes summaries, required columns, and a bounded scenario editor', () => {
  const source = read('src/pages/LoadTests.jsx');
  for (const label of [
    'Active tests',
    'Recent pass rate',
    'Recent regressions',
    'Current throughput category',
    'Current latency category',
    'Queue behavior',
    'Database pressure',
    'Cache health',
    'Cleanup status',
  ]) assert.match(source, new RegExp(label));
  for (const column of [
    'Run',
    'Scenario',
    'Mode',
    'Workload',
    'Status',
    'Duration',
    'Concurrency',
    'Throughput',
    'Budget',
    'Regression',
    'Environment',
    'Started',
    'Actions',
  ]) assert.match(source, new RegExp(`>${column}<`, 'i'));
  for (const field of [
    'workloadDomain',
    'testMode',
    'trafficModel',
    'warmupDurationMs',
    'steadyStateDurationMs',
    'cooldownDurationMs',
    'maximumConcurrency',
    'maximumRequestsPerSecond',
    'tenantCount',
    'workspaceCount',
    'mockAgentCount',
    'requestMix',
    'failureInjectionProfileId',
    'performanceBudgetPolicyId',
    'cleanupPolicy',
    'abortConditions',
  ]) assert.match(source, new RegExp(field));
  assert.match(source, /production_observation_only/);
  assert.match(source, new RegExp('/performance/targets'));
  assert.doesNotMatch(source, /JsonEditor|eval\(|new Function|script editor|targetUrl|customMethod|customHeaders/);
});

test('load-test detail uses safe compact sections and guarded high-impact actions', () => {
  const source = read('src/pages/LoadTestDetail.jsx');
  for (const section of [
    'Summary',
    'Stages',
    'Latency',
    'Throughput',
    'Queue',
    'Workers',
    'Database',
    'Cache',
    'Fairness',
    'Recovery',
    'Regional',
    'Budget',
    'Regression',
    'Capacity',
    'Timeline',
    'Audit',
  ]) assert.match(source, new RegExp(`title="${section}"|>${section}<`));
  for (const context of [
    'Target display',
    'Duration display',
    'Concurrency display',
    'Request-rate display',
    'Cleanup-plan display',
    'Reason code',
    'Approval state',
  ]) assert.match(source, new RegExp(context));
  assert.match(source, /<ConfirmationDialog/);
  assert.match(source, /production_observation_only/);
  assert.match(source, /traffic generation is disabled/i);
  assert.match(source, /expectedRejectionCount/);
  assert.match(source, /unexpectedFailureCount/);
  assert.doesNotMatch(source, /authorizationHeader|requestBody|responseBody|providerKey|databaseUri|connectionString|environmentValue/);
});

test('performance budget page exposes versioned limits and governed lifecycle controls', () => {
  const source = read('src/pages/PerformanceBudgets.jsx');
  for (const field of [
    'minimumSampleSize',
    'maximumUnexpectedFailureRateBasisPoints',
    'maximumTimeoutRateBasisPoints',
    'maximumOverloadRejectionRateBasisPoints',
    'latencyBudgets',
    'queueBudgets',
    'capacityBudgets',
    'fairnessBudgets',
    'recoveryBudgets',
    'regionalBudgets',
    'regressionToleranceBasisPoints',
    'absoluteRegressionToleranceMs',
  ]) assert.match(source, new RegExp(field));
  for (const column of ['Name', 'Version', 'Scope', 'Workload', 'Status', 'p95', 'p99', 'Error budget', 'Queue budget', 'Headroom', 'Updated', 'Actions']) assert.match(source, new RegExp(`>${column}<`, 'i'));
  assert.match(source, /validate/);
  assert.match(source, /activate/);
  assert.match(source, /archive/);
});

test('baseline page preserves immutable history and environment compatibility context', () => {
  const source = read('src/pages/PerformanceBaselines.jsx');
  for (const column of ['Baseline', 'Workload', 'Scenario', 'Environment', 'Status', 'Latency', 'Throughput', 'Error rate', 'Created', 'Promoted', 'Actions']) assert.match(source, new RegExp(`>${column}<`, 'i'));
  assert.match(source, /sourceRunId/);
  assert.match(source, /environmentFingerprintId/);
  assert.match(source, /Promote compatible baseline/);
  assert.match(source, /Existing baseline history is retained/);
  assert.doesNotMatch(source, /deleteBaseline|replaceBaseline|environmentValue|providerKey/);
});

test('capacity planning labels estimates honestly and keeps recommendations provider-neutral', () => {
  const source = read('src/pages/CapacityPlanning.jsx');
  for (const label of [
    'Sustainable throughput estimate',
    'Safe concurrency estimate',
    'Worker requirement',
    'Partition recommendation',
    'Headroom',
    'Database capacity category',
    'Cache capacity category',
    'Failover capacity',
    'Recommendation confidence',
  ]) assert.match(source, new RegExp(label));
  for (const column of ['Plan', 'Version', 'Scope', 'Workload', 'Status', 'Forecast', 'Worker recommendation', 'Headroom', 'Regional capacity', 'Updated', 'Actions']) assert.match(source, new RegExp(`>${column}<`, 'i'));
  assert.match(source, /Advisory estimates only/);
  assert.match(source, /Local results do not prove production capacity/);
  assert.match(source, /Provider-neutral autoscaling recommendations/);
  assert.match(source, /no_provider_mutation/);
  assert.doesNotMatch(source, /setReplicaCount|changeAtlasTier|updateDns|providerCredential|cloudToken/);
});

test('performance requests are authenticated, scoped, and mutations are idempotent', () => {
  const api = read('src/api/apiClient.js');
  assert.match(api, /path\.startsWith\('\/performance'\)/);
  for (const page of [
    'LoadTests.jsx',
    'LoadTestDetail.jsx',
    'PerformanceBudgets.jsx',
    'PerformanceBaselines.jsx',
    'CapacityPlanning.jsx',
  ]) {
    const source = read(`src/pages/${page}`);
    assert.match(source, /workspaceId/);
    assert.match(source, /Idempotency-Key/);
  }
});
