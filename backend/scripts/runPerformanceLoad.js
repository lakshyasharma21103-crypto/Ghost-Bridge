const core = require('../src/services/performanceCapacityCore.service');
const { DeterministicPerformanceHarness } = require('../src/services/performanceCapacityHarness.service');

function argumentsMap(argv) {
  return Object.fromEntries(argv.filter((item) => item.startsWith('--')).map((item) => {
    const [key, ...rest] = item.slice(2).split('=');
    return [key, rest.length ? rest.join('=') : true];
  }));
}

function line(label, value) { process.stdout.write(`${label}: ${value}\n`); }

function main() {
  const args = argumentsMap(process.argv.slice(2));
  const mode = String(args.mode || 'simulation');
  const traffic = String(args.traffic || 'closed_loop');
  if (mode === 'production_observation_only') throw core.performanceError('LOAD_SCENARIO_TARGET_NOT_ALLOWED', 'Production traffic generation is disabled.');
  const staging = mode.startsWith('staging_');
  const scenario = core.normalizeScenario({
    organizationId: 'perf-manual-org', workspaceId: 'perf-manual-workspace',
    performanceBudgetPolicyId: 'perf-manual-budget', testMode: mode,
    targetId: staging ? 'staging-http-v1' : 'local-in-process-v1',
    workloadDomain: traffic === 'regional' ? 'regional_failover_simulation' : 'orchestration_submission',
    trafficModel: traffic === 'regional' ? 'spike' : traffic,
    durationMs: Number(args.duration || 6_000), warmupDurationMs: 1_000,
    steadyStateDurationMs: Number(args.duration || 6_000) - 2_000, cooldownDurationMs: 1_000,
    targetConcurrency: Number(args.concurrency || 8), maximumConcurrency: Number(args.concurrency || 8),
    targetRequestsPerSecond: Number(args.rate || 20), maximumRequestsPerSecond: Number(args.rate || 20),
    tenantCount: 2, workspaceCount: 4, userCount: 4, mockAgentCount: 4,
    orchestrationDefinitionCount: 2, workerCount: 4, fixtureSeed: 13_004,
    residencyTag: staging ? 'configured-staging' : 'synthetic-local',
  });
  const validation = core.validateScenario(scenario, { requireBudget: false });
  line('Performance target', core.getTarget(scenario.targetId).safeDisplayName);
  line('Mode', scenario.testMode);
  line('Maximum concurrency', scenario.maximumConcurrency);
  line('Maximum request rate', `${scenario.maximumRequestsPerSecond}/s`);
  line('Duration', `${scenario.durationMs}ms`);
  line('Cleanup', scenario.cleanupPolicy);
  if (staging && args.confirm !== 'STAGING_LOAD') throw core.performanceError('LOAD_SCENARIO_APPROVAL_REQUIRED', 'Staging load requires --confirm=STAGING_LOAD and an approved allowlisted target.');
  if (!validation.valid) throw core.performanceError(validation.safeReasonCodes[0], 'The manual performance scenario was rejected by safety validation.');
  const harness = new DeterministicPerformanceHarness({ scenario });
  const result = harness.execute({ forceSpike: traffic === 'spike', includeRegional: traffic === 'regional' });
  line('Requests', result.summary.requestCount);
  line('Throughput', result.summary.throughputSummary.requestsPerSecond);
  line('Backpressure', result.summary.overloadRejectionCount ? 'shedding' : 'normal');
  line('Accepted work durable', result.invariants.acceptedWorkDurable);
  line('Cleanup instructions', `remove only fixtureSetId ${result.fixtures.fixtureSetId}`);
}

try { main(); } catch (error) { process.stderr.write(`${error.code || 'PERFORMANCE_RUN_FAILED'}: ${error.message}\n`); process.exitCode = 1; }
