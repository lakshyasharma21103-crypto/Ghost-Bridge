const assert = require('node:assert/strict');
const { DeterministicScaleHarness } = require('./productionScaleHarness.service');
const { DeterministicMultiRegionHarness } = require('./regionalResilienceHarness.service');
const core = require('./performanceCapacityCore.service');
const metrics = require('./performanceCapacityMetrics.service');

const MULTI_INSTANCE_HARNESS_LIMITS = Object.freeze({
  maximumBackendInstances: 8,
  maximumExecutionWorkers: 16,
  maximumRecoveryWorkers: 8,
  maximumControlPlaneWorkers: 8,
  maximumRegionalWorkerGroups: 4,
  maximumWorkersPerRegionalGroup: 4,
  maximumProcessCount: 32,
  maximumWorkloadCount: 500,
  maximumTimeoutMs: 120_000,
});

const SAFE_HARNESS_EVENTS = new Set([
  'harness_started',
  'requests_generated',
  'workloads_enqueued',
  'worker_draining',
  'cache_invalidated',
  'signal_received',
  'timeout_reached',
  'cleanup_completed',
]);

const SAFE_HARNESS_LOG_FIELDS = new Set([
  'backendInstanceCount',
  'cancelledWorkloadCount',
  'eventCount',
  'processCount',
  'requestCount',
  'sequence',
  'signalCategory',
  'version',
  'workerId',
  'workloadCount',
]);

function boundedInteger(value, fallback, { minimum = 0, maximum, limitName }) {
  const resolved = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(resolved) || resolved < minimum || resolved > maximum) {
    throw Object.assign(new Error(`Deterministic harness ${limitName} is outside the allowed bound.`), {
      code: 'PERFORMANCE_HARNESS_LIMIT_EXCEEDED',
      limitName,
      maximum,
    });
  }
  return resolved;
}

function safeHarnessToken(value, fieldName) {
  const token = String(value || '');
  if (!/^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(token)) {
    throw Object.assign(new Error(`Deterministic harness ${fieldName} must be a safe identifier.`), {
      code: 'PERFORMANCE_HARNESS_UNSAFE_IDENTIFIER',
      fieldName,
    });
  }
  return token;
}

function seeded(seed) {
  let state = Number(seed) >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000; };
}

function regionalConfiguration() {
  return {
    name: 'Synthetic performance regions', version: 1,
    regions: [
      { regionId: 'perf-primary', displayName: 'Synthetic Primary', regionGroup: 'synthetic', role: 'primary', state: 'healthy', priority: 1, dataResidencyTags: ['synthetic-local'], allowedDataClassifications: ['public', 'internal', 'confidential'], supportsWriteAuthority: true, supportsWorkerExecution: true, supportsRecoveryExecution: true, supportsControlPlaneProjections: true, supportsReadOnlyTraffic: true, supportsBackupRestore: true },
      { regionId: 'perf-standby', displayName: 'Synthetic Standby', regionGroup: 'synthetic', role: 'warm_standby', state: 'healthy', priority: 2, dataResidencyTags: ['synthetic-local'], allowedDataClassifications: ['public', 'internal', 'confidential'], supportsWriteAuthority: true, supportsWorkerExecution: true, supportsRecoveryExecution: true, supportsControlPlaneProjections: true, supportsReadOnlyTraffic: true, supportsBackupRestore: true },
    ],
    preferredPrimaryRegionId: 'perf-primary', defaultStandbyRegionId: 'perf-standby', permittedFailoverRegionIds: ['perf-primary', 'perf-standby'], prohibitedFailoverRegionIds: [],
    maximumReplicationLagForPromotionMs: 30_000, maximumDataLossWindowMs: 60_000, regionalHealthTimeoutMs: 120_000, regionalHeartbeatIntervalMs: 30_000,
    authorityLeaseDurationMs: 60_000, authorityHeartbeatIntervalMs: 15_000, failoverApprovalPolicy: 'always', failbackApprovalPolicy: 'always', degradedModePolicy: 'read_only', cacheIsolationMode: 'region_local', projectionRecoveryPolicy: 'catch_up',
  };
}

function regionalPolicy() {
  return {
    name: 'Synthetic performance DR', version: 1, criticality: 'critical', recoveryPointObjectiveMs: 30_000, recoveryTimeObjectiveMs: 300_000,
    maximumPromotionReplicationLagMs: 10_000, maximumUnknownReplicationWindowMs: 0, maximumDegradedModeDurationMs: 3_600_000,
    preferredRecoveryRegionId: 'perf-standby', permittedRecoveryRegionIds: ['perf-primary', 'perf-standby'], prohibitedRecoveryRegionIds: [],
    automaticFailoverAllowed: false, automaticFailoverConditions: [], requireApprovalForFailover: true, requireApprovalForFailback: true, requireApprovalForDataLossAcceptance: true,
    backupRequired: false, backupFrequencyMs: 86_400_000, backupRetentionMs: 2_592_000_000, restoreVerificationFrequencyMs: 604_800_000,
    minimumHealthyServiceCount: 1, minimumHealthyWorkerCount: 1, minimumHealthyDatabaseCategory: 'healthy', degradedMode: 'read_only', protectedOperationCategories: ['recovery', 'compensation', 'cancellation'],
  };
}

class DeterministicPerformanceHarness {
  constructor(options = {}) {
    this.nowMs = new Date(options.now || '2026-01-01T00:00:00.000Z').getTime();
    this.scenario = core.normalizeScenario(options.scenario || {
      organizationId: 'perf-org-root', workspaceId: 'perf-workspace-root',
      workloadDomain: 'interactive_api', testMode: 'local_smoke', targetId: 'local-in-process-v1',
      performanceBudgetPolicyId: 'perf-budget-default', warmupDurationMs: 1_000,
      steadyStateDurationMs: 4_000, cooldownDurationMs: 1_000, durationMs: 6_000,
      targetConcurrency: 4, maximumConcurrency: 8, targetRequestsPerSecond: 10,
      maximumRequestsPerSecond: 20, tenantCount: 2, workspaceCount: 4, userCount: 4,
      mockAgentCount: 4, orchestrationDefinitionCount: 2, workerCount: 3, fixtureSeed: 13_004,
    });
    this.random = seeded(this.scenario.fixtureSeed);
    this.fixtures = core.generateFixtureManifest(this.scenario);
    this.scale = new DeterministicScaleHarness({ now: new Date(this.nowMs) });
    this.cache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.samples = [];
    this.acceptedLogicalIds = new Set();
    this.completedLogicalIds = new Set();
    this.requestIds = new Set();
    this.traceIds = new Set();
    this.workerCrashResult = null;
    this.regionalResult = null;
  }

  now() { return new Date(this.nowMs); }
  advance(milliseconds) { this.nowMs += Math.max(0, Number(milliseconds) || 0); this.scale.advance(milliseconds); return this.now(); }

  registerWorkers() {
    const count = Math.max(2, Math.min(8, this.scenario.workerCount || 2));
    for (let index = 0; index < count; index += 1) this.scale.registerWorker({ workerId: `perf-execution-${index + 1}`, instanceId: `perf-instance-${index + 1}`, workerPool: 'execution', maximumConcurrency: Math.max(1, Math.ceil(this.scenario.maximumConcurrency / count)), status: 'idle' });
    this.scale.registerWorker({ workerId: 'perf-recovery-1', instanceId: 'perf-recovery-instance-1', workerPool: 'recovery', maximumConcurrency: 2, status: 'idle' });
    this.scale.registerWorker({ workerId: 'perf-control-1', instanceId: 'perf-control-instance-1', workerPool: 'control_plane', maximumConcurrency: 2, status: 'idle' });
    return [...this.scale.workers.values()];
  }

  generateTraffic(options = {}) {
    const stages = core.deterministicStages(this.scenario, this.nowMs);
    const schedule = core.deterministicArrivalSchedule(this.scenario, { maximumEvents: 750 });
    const scheduleStartMs = this.nowMs;
    const samples = [];
    let sequence = 0;
    for (const stage of stages) {
      const stageCategory = stage.stageName === 'warmup' ? 'warmup' : stage.stageName === 'cooldown' ? 'cooldown' : 'steady_state';
      const stageEvents = schedule.filter((event) => event.stageOrder === stage.order);
      const requestCount = stageCategory === 'cooldown' ? 0 : stageEvents.length;
      metrics.increment('performance_stage_count', { stage: stageCategory, mode: this.scenario.testMode });
      for (let index = 0; index < requestCount; index += 1) {
        const arrival = stageEvents[index];
        sequence += 1;
        const organization = this.fixtures.organizations[index % this.fixtures.organizations.length];
        const workspace = this.fixtures.workspaces.find((item) => item.organizationId === organization.organizationId) || this.fixtures.workspaces[index % this.fixtures.workspaces.length];
        const requestId = `perf-request-${this.scenario.fixtureSeed}-${sequence}`;
        const traceId = `perf-trace-${this.scenario.fixtureSeed}-${sequence}`;
        const baseLatency = options.baseLatencyMs || (this.scenario.workloadDomain.includes('orchestration') ? 120 : this.scenario.workloadDomain.includes('database') ? 45 : 30);
        const latencyMs = Math.round(baseLatency + this.random() * baseLatency * 0.5 + (stageCategory === 'warmup' ? baseLatency : 0));
        const queueWaitMs = Math.round(this.random() * Math.max(2, baseLatency / 3));
        const spikeOverload = (options.forceSpike || this.scenario.trafficModel === 'spike') && stageCategory === 'steady_state' && index >= Math.floor(requestCount * 0.75);
        const sample = {
          stage: stageCategory, organizationId: organization.organizationId, workspaceId: workspace.workspaceId,
          requestId, traceId, authenticated: true, policyEvaluated: true, quotaEvaluated: true, residencyEvaluated: true,
          statusCode: spikeOverload ? 503 : 200, reasonCode: spikeOverload ? 'OVERLOAD_BACKPRESSURE_ACTIVE' : 'SUCCESS',
          expected: spikeOverload, latencyMs, queueWaitMs, admissionMs: 2, claimMs: 1,
          executionMs: Math.max(1, latencyMs - queueWaitMs - 3), databaseMs: Math.round(latencyMs * 0.2),
          cacheMs: Math.round(latencyMs * 0.05), policyMs: 2,
          arrivalClass: arrival.arrivalClass,
          virtualUserIndex: arrival.virtualUserIndex,
          startedAtMs: scheduleStartMs + arrival.scheduledOffsetMs,
          completedAtMs: scheduleStartMs + arrival.scheduledOffsetMs + latencyMs,
        };
        samples.push(sample); this.requestIds.add(requestId); this.traceIds.add(traceId);
        metrics.increment('performance_test_request_count', { workloadDomain: this.scenario.workloadDomain, outcome: core.classifyOutcome(sample), mode: this.scenario.testMode });
        metrics.observe('performance_latency_ms', { workloadDomain: this.scenario.workloadDomain, latencyType: 'api', stage: stageCategory }, latencyMs);
      }
      this.nowMs += stage.durationMs; this.scale.advance(stage.durationMs);
    }
    this.samples.push(...samples);
    return samples;
  }

  enqueueOrchestration(count = 24) {
    const bounded = Math.max(1, Math.min(200, Number(count) || 1));
    for (let index = 0; index < bounded; index += 1) {
      const organization = this.fixtures.organizations[index % this.fixtures.organizations.length];
      const workspaces = this.fixtures.workspaces.filter((workspace) => workspace.organizationId === organization.organizationId);
      const workspace = workspaces[index % workspaces.length];
      const logicalId = `perf-run-${this.scenario.fixtureSeed}-${index + 1}:node-1`;
      const admission = this.scale.admit({ organizationId: organization.organizationId, workspaceId: workspace.workspaceId, idempotencyKey: logicalId, tenantMaximum: 1_000, workspaceMaximum: 500 });
      assert.equal(admission.accepted, true);
      const job = this.scale.enqueue({ organizationId: organization.organizationId, workspaceId: workspace.workspaceId, logicalId, workloadCategory: 'orchestration_node', priorityClass: index % 7 === 0 ? 'high' : 'standard' });
      this.acceptedLogicalIds.add(job.logicalId);
    }
    return [...this.scale.jobs.values()];
  }

  executeQueued() {
    const workers = [...this.scale.workers.values()].filter((worker) => worker.workerPool === 'execution');
    let progress = true; let guard = 0;
    while (progress && guard < 2_000) {
      progress = false; guard += 1;
      for (const worker of workers) {
        const claim = this.scale.claim(worker.workerId, 5_000);
        if (!claim) continue;
        assert.equal(this.completedLogicalIds.has(claim.job.logicalId), false);
        const completed = this.scale.complete(claim);
        this.completedLogicalIds.add(completed.logicalId);
        progress = true;
      }
      if (!progress && [...this.scale.jobs.values()].some((job) => job.status === 'queued')) {
        this.scale.advance(5_001); this.nowMs += 5_001; progress = true;
      }
    }
    return { completed: this.completedLogicalIds.size, duplicateLogicalExecution: this.scale.completions.length !== new Set(this.scale.completions.map((item) => item.logicalId)).size };
  }

  simulateWorkerCrash() {
    const logicalId = `perf-crash-${this.scenario.fixtureSeed}:node-1`;
    const organization = this.fixtures.organizations[0]; const workspace = this.fixtures.workspaces[0];
    this.scale.enqueue({ organizationId: organization.organizationId, workspaceId: workspace.workspaceId, logicalId, workloadCategory: 'orchestration_node' });
    const executionWorkers = [...this.scale.workers.values()].filter((item) => item.workerPool === 'execution');
    let first;
    for (const worker of executionWorkers) { first = this.scale.claim(worker.workerId, 1_000); if (first) break; }
    if (!first) {
      this.scale.advance(5_001); this.nowMs += 5_001;
      for (const worker of executionWorkers) { first = this.scale.claim(worker.workerId, 1_000); if (first) break; }
    }
    assert.ok(first); this.scale.crash(first.workerId); this.scale.advance(1_001); this.nowMs += 1_001;
    assert.equal(this.scale.recoverExpired(), 1);
    let recovered;
    for (const worker of [...this.scale.workers.values()].filter((item) => item.workerPool === 'execution' && item.workerId !== first.workerId)) {
      recovered = this.scale.claim(worker.workerId, 5_000);
      if (recovered) break;
    }
    assert.ok(recovered); this.scale.complete(recovered);
    let staleWorkerFenced = false;
    try { this.scale.complete(first); } catch (error) { staleWorkerFenced = ['STALE_WORKER_LEASE', 'PARTITION_OWNERSHIP_LOST'].includes(error.code); }
    this.workerCrashResult = { leaseRecovered: true, staleWorkerFenced, executionCount: this.scale.completions.filter((item) => item.logicalId === logicalId).length };
    return this.workerCrashResult;
  }

  cacheRead(key, loader) {
    if (this.cache.has(key)) { this.cacheHits += 1; return { outcome: 'hit', value: this.cache.get(key) }; }
    this.cacheMisses += 1; const value = loader(); this.cache.set(key, value); return { outcome: 'miss', value };
  }

  cacheSummary() {
    const total = this.cacheHits + this.cacheMisses;
    return { hitCount: this.cacheHits, missCount: this.cacheMisses, hitRateBasisPoints: total ? Math.round((this.cacheHits / total) * 10_000) : 0, healthCategory: 'healthy' };
  }

  fairnessScenario() {
    const noisy = this.fixtures.organizations[0].organizationId; const normal = this.fixtures.organizations[1]?.organizationId || noisy;
    const counts = { noisy: 55, normal: 45 };
    const result = core.calculateFairness(counts, { noisy: 100, normal: 250 });
    return { ...result, noisyTenantCategory: 'high_volume', normalTenantServiceCount: counts.normal, normalTenantContinuedService: counts.normal > 0, tenantIdsExposedInMetrics: JSON.stringify(metrics.snapshot()).includes(noisy) || JSON.stringify(metrics.snapshot()).includes(normal) };
  }

  simulateRegionalFailover() {
    const regional = new DeterministicMultiRegionHarness({ now: this.now() });
    regional.activateConfiguration(regionalConfiguration()); regional.activatePolicy(regionalPolicy());
    for (const service of [
      { serviceId: 'perf-backend-a', instanceId: 'perf-backend-instance-a', regionId: 'perf-primary', serviceType: 'backend', maximumConcurrency: 20 },
      { serviceId: 'perf-worker-a', instanceId: 'perf-worker-instance-a', regionId: 'perf-primary', serviceType: 'execution_worker', maximumConcurrency: 4, supportedWorkloadCategories: ['orchestration_node'] },
      { serviceId: 'perf-backend-b', instanceId: 'perf-backend-instance-b', regionId: 'perf-standby', serviceType: 'backend', maximumConcurrency: 20 },
      { serviceId: 'perf-worker-b', instanceId: 'perf-worker-instance-b', regionId: 'perf-standby', serviceType: 'execution_worker', maximumConcurrency: 4, supportedWorkloadCategories: ['orchestration_node'] },
    ]) regional.registerService(service);
    regional.acquireAuthority({ authorityKey: 'organization:perf:workspace:perf', regionId: 'perf-primary', serviceId: 'perf-backend-a' });
    regional.ensurePartition({ partitionKey: 'orchestration_node:v1:p0', workloadCategory: 'orchestration_node', activeRegionId: 'perf-primary', homeRegionId: 'perf-primary', fallbackRegionIds: ['perf-standby'] });
    const first = regional.enqueue({ logicalId: 'perf-regional-run:node-complete', runId: 'perf-regional-run', nodeKey: 'node-complete', partitionKey: 'orchestration_node:v1:p0' });
    const second = regional.enqueue({ logicalId: 'perf-regional-run:node-resume', runId: 'perf-regional-run', nodeKey: 'node-resume', partitionKey: 'orchestration_node:v1:p0' });
    const claim = regional.claim({ regionId: 'perf-primary', serviceId: 'perf-worker-a', authorityEpoch: 1, authorityLeaseEpoch: 1 });
    regional.complete({ logicalId: claim.logicalId, regionId: 'perf-primary', serviceId: 'perf-worker-a', authorityEpoch: 1, authorityLeaseEpoch: 1, traceId: 'perf-regional-trace' });
    const checkpoint = regional.createCheckpoint({ runId: 'perf-regional-run', sourceRegionId: 'perf-primary', authorityEpoch: 1, queueOwnershipEpoch: 1, routingVersion: 1, lastDurableSequence: 10, projectionSequence: 8, completedNodeKeys: ['node-complete'] });
    const stale = { regionId: 'perf-primary', authorityEpoch: 1, authorityLeaseEpoch: 1 };
    regional.stopRegionHeartbeats('perf-primary'); regional.advance(121_000); regional.isolateRegion('perf-primary');
    const incident = regional.createIncident({ sourceRegionId: 'perf-primary', category: 'regional_outage' });
    regional.setReplication('perf-primary', 'perf-standby', { dataDomain: 'authority', lagMs: 4_000, sequenceVerified: true });
    const plan = regional.createFailoverPlan({ idempotencyKey: 'perf-failover-a-b', sourceRegionId: 'perf-primary', targetRegionId: 'perf-standby', failoverType: 'emergency_failover', triggerType: 'regional_outage', incidentId: incident.incidentId, approved: true, sourceFencePossible: true });
    const failover = regional.executeFailover(plan.planId, { targetServiceId: 'perf-backend-b', sourceSequence: 10 });
    const resumed = regional.resumeCheckpoint({ checkpointId: checkpoint.checkpointId, regionId: 'perf-standby', serviceId: 'perf-worker-b', authorityEpoch: 2, authorityLeaseEpoch: 2, traceId: 'perf-regional-trace', failoverPlanId: plan.planId });
    const claimB = regional.claim({ regionId: 'perf-standby', serviceId: 'perf-worker-b', authorityEpoch: 2, authorityLeaseEpoch: 2 });
    regional.complete({ logicalId: claimB.logicalId, regionId: 'perf-standby', serviceId: 'perf-worker-b', authorityEpoch: 2, authorityLeaseEpoch: 2, traceId: 'perf-regional-trace', failoverPlanId: plan.planId });
    let staleWriterRejected = false; try { regional.assertWrite(stale); } catch (error) { staleWriterRejected = error.code === 'REGION_NOT_WRITE_AUTHORITY'; }
    this.regionalResult = {
      admissionFrozen: true, authorityTransferred: regional.authority.activeRegionId === 'perf-standby', queueOwnershipTransferred: regional.partitions.get('orchestration_node:v1:p0').activeRegionId === 'perf-standby',
      targetWorkerActivated: regional.services.get('perf-worker-b:perf-worker-instance-b').state === 'idle', staleWriterRejected,
      resumedExactlyOnce: resumed.completedWorkDuplicated === false && regional.jobs.get(first.logicalId).executionCount === 1 && regional.jobs.get(second.logicalId).executionCount === 1,
      failoverRpoMs: 4_000, failoverRtoMs: Number(failover.measuredRtoMs || 1_000), routingErrorRateBasisPoints: 0,
    };
    return this.regionalResult;
  }

  execute(options = {}) {
    this.registerWorkers();
    const samples = this.generateTraffic(options);
    this.enqueueOrchestration(options.orchestrationCount || 24);
    const execution = this.executeQueued();
    const fairness = this.fairnessScenario();
    this.cacheRead('definition:v1', () => ({ version: 1 })); this.cacheRead('definition:v1', () => ({ version: 1 }));
    const cacheSummary = this.cacheSummary();
    const steadyDuration = this.scenario.steadyStateDurationMs;
    const summary = {
      ...core.summarizeMeasurements(samples, { steadyStateDurationMs: steadyDuration }),
      workerSummary: { utilizationBasisPoints: 6_500, leaseExpiryRateBasisPoints: 0, activeWorkers: this.scale.workers.size },
      databaseSummary: { pressureCategory: 'healthy', indexedReadCategory: 'expected_index', operationP95Ms: 12 },
      cacheSummary,
      fairnessSummary: fairness,
      regionalSummary: options.includeRegional ? this.simulateRegionalFailover() : { failoverRpoMs: 0, failoverRtoMs: 0, routingErrorRateBasisPoints: 0 },
      queueSummary: { ...core.summarizeMeasurements(samples, { steadyStateDurationMs: steadyDuration }).queueSummary, depth: 0, acceptedWorkDurable: this.acceptedLogicalIds.size === this.completedLogicalIds.size },
    };
    summary.correctnessViolationCount += execution.duplicateLogicalExecution ? 1 : 0;
    const warmup = core.summarizeMeasurements(samples.filter((sample) => sample.stage === 'warmup'), { includeWarmup: true, steadyStateDurationMs: this.scenario.warmupDurationMs });
    const windows = [
      { sequence: 1, stage: 'warmup', requestCount: warmup.requestCount, latencyHistogram: warmup.latencyPercentiles.histogram, throughput: warmup.throughputSummary.requestsPerSecond },
      { sequence: 2, stage: 'steady_state', requestCount: summary.requestCount, successCount: summary.successfulRequestCount, expectedRejectionCount: summary.expectedRejectionCount, unexpectedFailureCount: summary.unexpectedFailureCount, timeoutCount: summary.timeoutCount, retryCount: summary.retryCount, latencyHistogram: summary.latencyPercentiles.histogram, queueWaitHistogram: summary.queueSummary.histogram, throughput: summary.throughputSummary.requestsPerSecond, activeConcurrency: this.scenario.targetConcurrency, workerUtilizationCategory: 'balanced', databasePressureCategory: 'healthy', cacheHealthCategory: 'healthy', backpressureState: summary.overloadRejectionCount ? 'shedding' : 'normal', queueDepthCategory: 'empty', oldestQueueAgeCategory: 'low', tenantFairnessSummary: fairness, safeFailureCounts: {} },
      { sequence: 3, stage: 'cooldown', requestCount: 0, throughput: 0, activeConcurrency: 0, backpressureState: 'normal', queueDepthCategory: 'empty' },
    ];
    const invariants = {
      authenticated: samples.every((sample) => sample.authenticated && sample.policyEvaluated && sample.quotaEvaluated && sample.residencyEvaluated),
      acceptedWorkDurable: this.acceptedLogicalIds.size === this.completedLogicalIds.size,
      noDuplicateExecution: !execution.duplicateLogicalExecution,
      tenantIsolation: samples.every((sample) => this.fixtures.workspaces.some((workspace) => workspace.workspaceId === sample.workspaceId && workspace.organizationId === sample.organizationId)),
      requestTraceLineage: this.requestIds.size === samples.length && this.traceIds.size === samples.length,
      protectedRecoveryCapacity: this.scale.workers.has('perf-recovery-1'),
    };
    return { scenario: this.scenario, fixtures: this.fixtures, samples, windows, summary, invariants, scale: this.scale };
  }
}

class DeterministicMultiInstancePerformanceHarness {
  constructor(options = {}) {
    this.nowMs = new Date(options.now || '2026-01-01T00:00:00.000Z').getTime();
    this.configuration = {
      backendInstanceCount: boundedInteger(options.backendInstanceCount, 2, {
        minimum: 2,
        maximum: MULTI_INSTANCE_HARNESS_LIMITS.maximumBackendInstances,
        limitName: 'backendInstanceCount',
      }),
      executionWorkerCount: boundedInteger(options.executionWorkerCount, 3, {
        minimum: 2,
        maximum: MULTI_INSTANCE_HARNESS_LIMITS.maximumExecutionWorkers,
        limitName: 'executionWorkerCount',
      }),
      recoveryWorkerCount: boundedInteger(options.recoveryWorkerCount, 2, {
        minimum: 2,
        maximum: MULTI_INSTANCE_HARNESS_LIMITS.maximumRecoveryWorkers,
        limitName: 'recoveryWorkerCount',
      }),
      controlPlaneWorkerCount: boundedInteger(options.controlPlaneWorkerCount, 2, {
        minimum: 2,
        maximum: MULTI_INSTANCE_HARNESS_LIMITS.maximumControlPlaneWorkers,
        limitName: 'controlPlaneWorkerCount',
      }),
      regionalWorkerGroupCount: boundedInteger(options.regionalWorkerGroupCount, 0, {
        minimum: 0,
        maximum: MULTI_INSTANCE_HARNESS_LIMITS.maximumRegionalWorkerGroups,
        limitName: 'regionalWorkerGroupCount',
      }),
      workersPerRegionalGroup: boundedInteger(options.workersPerRegionalGroup, 1, {
        minimum: 1,
        maximum: MULTI_INSTANCE_HARNESS_LIMITS.maximumWorkersPerRegionalGroup,
        limitName: 'workersPerRegionalGroup',
      }),
      maximumWorkloadCount: boundedInteger(options.maximumWorkloadCount, 200, {
        minimum: 1,
        maximum: MULTI_INSTANCE_HARNESS_LIMITS.maximumWorkloadCount,
        limitName: 'maximumWorkloadCount',
      }),
      timeoutMs: boundedInteger(options.timeoutMs, 60_000, {
        minimum: 1,
        maximum: MULTI_INSTANCE_HARNESS_LIMITS.maximumTimeoutMs,
        limitName: 'timeoutMs',
      }),
    };
    const regionalWorkerCount = this.configuration.regionalWorkerGroupCount * this.configuration.workersPerRegionalGroup;
    const processCount = this.configuration.backendInstanceCount
      + this.configuration.executionWorkerCount
      + this.configuration.recoveryWorkerCount
      + this.configuration.controlPlaneWorkerCount
      + regionalWorkerCount;
    if (processCount > MULTI_INSTANCE_HARNESS_LIMITS.maximumProcessCount) {
      throw Object.assign(new Error('Deterministic harness process count exceeds the allowed bound.'), {
        code: 'PERFORMANCE_HARNESS_PROCESS_LIMIT_EXCEEDED',
        maximum: MULTI_INSTANCE_HARNESS_LIMITS.maximumProcessCount,
      });
    }
    this.configuredProcessCount = processCount;
    this.scale = new DeterministicScaleHarness({ now: new Date(this.nowMs) });
    this.processes = new Map();
    this.backendCaches = new Map();
    this.cacheInvalidationVersions = new Map();
    this.requestEvidence = [];
    this.logs = [];
    this.generatedRequestCount = 0;
    this.workloadSequence = 0;
    this.lifecycleState = 'created';
    this.startedAtMs = null;
    this.interrupted = false;
    this.terminationReason = null;
    this.cleanupSummary = null;
    this.signalSource = null;
    this.lifecycleHandlers = null;
  }

  now() { return new Date(this.nowMs); }

  appendSafeLog(event, fields = {}) {
    if (!SAFE_HARNESS_EVENTS.has(event)) throw new Error('Unsupported deterministic harness event.');
    const safeFields = {};
    for (const [key, value] of Object.entries(fields)) {
      if (!SAFE_HARNESS_LOG_FIELDS.has(key)) continue;
      safeFields[key] = typeof value === 'string' ? safeHarnessToken(value, key) : value;
    }
    const entry = Object.freeze({ sequence: this.logs.length + 1, event, at: this.now().toISOString(), ...safeFields });
    this.logs.push(entry);
    return entry;
  }

  addProcess({ processId, processType, groupId, workerPool, workerId }) {
    const process = {
      processId,
      processType,
      groupId,
      workerPool: workerPool || null,
      workerId: workerId || null,
      state: 'running',
      simulated: true,
    };
    this.processes.set(processId, process);
    if (processType === 'backend') this.backendCaches.set(processId, new Map());
    if (workerId) {
      this.scale.registerWorker({
        workerId,
        instanceId: processId,
        workerPool,
        maximumConcurrency: workerPool === 'execution' ? 2 : 1,
        status: 'idle',
      });
    }
    return process;
  }

  start() {
    if (this.lifecycleState === 'running') return this.safeSnapshot();
    if (this.lifecycleState !== 'created') {
      throw Object.assign(new Error('A cleaned deterministic harness cannot be restarted.'), {
        code: 'PERFORMANCE_HARNESS_NOT_RESTARTABLE',
      });
    }
    for (let index = 1; index <= this.configuration.backendInstanceCount; index += 1) {
      this.addProcess({ processId: `perf-backend-${index}`, processType: 'backend', groupId: 'backend' });
    }
    for (let index = 1; index <= this.configuration.executionWorkerCount; index += 1) {
      this.addProcess({
        processId: `perf-execution-instance-${index}`,
        processType: 'execution_worker',
        groupId: 'execution',
        workerPool: 'execution',
        workerId: `perf-execution-${index}`,
      });
    }
    for (let index = 1; index <= this.configuration.recoveryWorkerCount; index += 1) {
      this.addProcess({
        processId: `perf-recovery-instance-${index}`,
        processType: 'recovery_worker',
        groupId: 'recovery',
        workerPool: 'recovery',
        workerId: `perf-recovery-${index}`,
      });
    }
    for (let index = 1; index <= this.configuration.controlPlaneWorkerCount; index += 1) {
      this.addProcess({
        processId: `perf-control-instance-${index}`,
        processType: 'control_plane_worker',
        groupId: 'control-plane',
        workerPool: 'control_plane',
        workerId: `perf-control-${index}`,
      });
    }
    for (let group = 1; group <= this.configuration.regionalWorkerGroupCount; group += 1) {
      for (let index = 1; index <= this.configuration.workersPerRegionalGroup; index += 1) {
        this.addProcess({
          processId: `perf-region-${group}-instance-${index}`,
          processType: 'regional_execution_worker',
          groupId: `synthetic-region-${group}`,
          workerPool: 'execution',
          workerId: `perf-region-${group}-worker-${index}`,
        });
      }
    }
    this.startedAtMs = this.nowMs;
    this.lifecycleState = 'running';
    this.appendSafeLog('harness_started', {
      backendInstanceCount: this.configuration.backendInstanceCount,
      processCount: this.processes.size,
    });
    return this.safeSnapshot();
  }

  assertOperational() {
    if (this.lifecycleState !== 'running') {
      throw Object.assign(new Error('Deterministic harness is not running.'), {
        code: 'PERFORMANCE_HARNESS_NOT_RUNNING',
      });
    }
    if ((this.nowMs - this.startedAtMs) > this.configuration.timeoutMs) {
      this.appendSafeLog('timeout_reached');
      this.cleanup('timeout');
      throw Object.assign(new Error('Deterministic harness reached its bounded timeout.'), {
        code: 'PERFORMANCE_HARNESS_TIMEOUT',
      });
    }
  }

  advance(milliseconds) {
    const bounded = boundedInteger(milliseconds, 0, {
      minimum: 0,
      maximum: MULTI_INSTANCE_HARNESS_LIMITS.maximumTimeoutMs,
      limitName: 'advanceMilliseconds',
    });
    this.nowMs += bounded;
    this.scale.advance(bounded);
    return this.now();
  }

  currentWorkloadCount() {
    return this.generatedRequestCount + this.scale.jobs.size;
  }

  assertWorkloadCapacity(additionalCount) {
    const count = boundedInteger(additionalCount, 1, {
      minimum: 1,
      maximum: this.configuration.maximumWorkloadCount,
      limitName: 'workloadCount',
    });
    if ((this.currentWorkloadCount() + count) > this.configuration.maximumWorkloadCount) {
      throw Object.assign(new Error('Deterministic harness workload count exceeds the configured bound.'), {
        code: 'PERFORMANCE_HARNESS_WORKLOAD_LIMIT_EXCEEDED',
        maximum: this.configuration.maximumWorkloadCount,
      });
    }
    return count;
  }

  generateConcurrentRequests(requestCount, options = {}) {
    this.assertOperational();
    const count = this.assertWorkloadCapacity(requestCount);
    const concurrency = boundedInteger(options.concurrency, this.configuration.backendInstanceCount, {
      minimum: 1,
      maximum: this.configuredProcessCount,
      limitName: 'requestConcurrency',
    });
    const backendIds = [...this.backendCaches.keys()].sort();
    const requests = [];
    const countsByBackend = {};
    for (let index = 0; index < count; index += 1) {
      const backendInstanceId = backendIds[index % backendIds.length];
      countsByBackend[backendInstanceId] = Number(countsByBackend[backendInstanceId] || 0) + 1;
      requests.push(Object.freeze({
        sequence: this.generatedRequestCount + index + 1,
        backendInstanceId,
        concurrencyLane: index % concurrency,
        startTick: Math.floor(index / concurrency),
        completionTick: Math.floor(index / concurrency) + 1,
        outcome: 'completed',
      }));
    }
    this.generatedRequestCount += count;
    this.requestEvidence.push(...requests);
    this.appendSafeLog('requests_generated', { requestCount: count });
    return {
      requestCount: count,
      peakConcurrency: Math.min(count, concurrency),
      backendInstanceCount: backendIds.length,
      countsByBackend,
      requests,
    };
  }

  enqueueWorkloads(workloadCount, options = {}) {
    this.assertOperational();
    const count = this.assertWorkloadCapacity(workloadCount);
    const workloadCategory = safeHarnessToken(options.workloadCategory || 'orchestration_node', 'workloadCategory');
    const jobs = [];
    for (let index = 0; index < count; index += 1) {
      this.workloadSequence += 1;
      jobs.push(this.scale.enqueue({
        organizationId: `perf-multi-org-${(index % 2) + 1}`,
        workspaceId: `perf-multi-workspace-${(index % 4) + 1}`,
        logicalId: `perf-multi-workload-${this.workloadSequence}`,
        workloadCategory,
        priorityClass: index % 5 === 0 ? 'high' : 'standard',
      }));
    }
    this.appendSafeLog('workloads_enqueued', { workloadCount: count });
    return jobs;
  }

  claim(workerId, leaseMs = 5_000) {
    this.assertOperational();
    const safeWorkerId = safeHarnessToken(workerId, 'workerId');
    const boundedLeaseMs = boundedInteger(leaseMs, 5_000, {
      minimum: 1,
      maximum: this.configuration.timeoutMs,
      limitName: 'leaseMs',
    });
    return this.scale.claim(safeWorkerId, boundedLeaseMs);
  }

  complete(claim, outcome = 'completed') {
    this.assertOperational();
    const completed = this.scale.complete(claim, outcome);
    const worker = this.scale.workers.get(claim.workerId);
    if (worker?.status === 'draining' && worker.activeClaimCount === 0) this.scale.rebalance();
    return completed;
  }

  drainWorker(workerId) {
    this.assertOperational();
    const safeWorkerId = safeHarnessToken(workerId, 'workerId');
    const worker = this.scale.drain(safeWorkerId);
    if (!worker) return null;
    const process = [...this.processes.values()].find((item) => item.workerId === safeWorkerId);
    if (process) process.state = 'draining';
    if (worker.activeClaimCount === 0) this.scale.rebalance();
    this.appendSafeLog('worker_draining', { workerId: safeWorkerId });
    return worker;
  }

  executeUntilDrained() {
    this.assertOperational();
    const workerIds = [...this.scale.workers.values()]
      .filter((worker) => worker.workerPool === 'execution')
      .map((worker) => worker.workerId)
      .sort();
    let completedCount = 0;
    let madeProgress = true;
    let guard = 0;
    while (madeProgress && guard <= this.configuration.maximumWorkloadCount) {
      madeProgress = false;
      guard += 1;
      for (const workerId of workerIds) {
        const claim = this.claim(workerId);
        if (!claim) continue;
        this.complete(claim);
        completedCount += 1;
        madeProgress = true;
      }
    }
    return {
      completedCount,
      queuedCount: [...this.scale.jobs.values()].filter((job) => job.status === 'queued').length,
      duplicateExecution: this.scale.completions.length !== new Set(this.scale.completions.map((item) => item.logicalId)).size,
    };
  }

  assertBackendInstance(instanceId) {
    const safeInstanceId = safeHarnessToken(instanceId, 'backendInstanceId');
    if (!this.backendCaches.has(safeInstanceId)) {
      throw Object.assign(new Error('Unknown deterministic backend instance.'), {
        code: 'PERFORMANCE_HARNESS_BACKEND_NOT_FOUND',
      });
    }
    return safeInstanceId;
  }

  cacheRead(instanceId, cacheKey, loader) {
    this.assertOperational();
    const safeInstanceId = this.assertBackendInstance(instanceId);
    const safeCacheKey = safeHarnessToken(cacheKey, 'cacheKey');
    const cache = this.backendCaches.get(safeInstanceId);
    if (cache.has(safeCacheKey)) return { outcome: 'hit', value: { ...cache.get(safeCacheKey) } };
    const loaded = loader();
    const allowedKeys = ['version', 'valueCategory'];
    if (!loaded || typeof loaded !== 'object' || Object.keys(loaded).some((key) => !allowedKeys.includes(key))) {
      throw Object.assign(new Error('Cache loader returned unsafe deterministic state.'), {
        code: 'PERFORMANCE_HARNESS_UNSAFE_CACHE_VALUE',
      });
    }
    const version = boundedInteger(loaded.version, 1, { minimum: 1, maximum: 1_000_000, limitName: 'cacheVersion' });
    const invalidationVersion = this.cacheInvalidationVersions.get(safeCacheKey) || 0;
    if (version < invalidationVersion) {
      throw Object.assign(new Error('Cache loader returned a stale deterministic version.'), {
        code: 'PERFORMANCE_HARNESS_STALE_CACHE_VERSION',
      });
    }
    const value = Object.freeze({
      version,
      valueCategory: safeHarnessToken(loaded.valueCategory || 'immutable_definition', 'valueCategory'),
    });
    cache.set(safeCacheKey, value);
    return { outcome: 'miss', value: { ...value } };
  }

  invalidateCacheAcrossInstances(cacheKey, version) {
    this.assertOperational();
    const safeCacheKey = safeHarnessToken(cacheKey, 'cacheKey');
    const boundedVersion = boundedInteger(version, 1, { minimum: 1, maximum: 1_000_000, limitName: 'cacheVersion' });
    const currentVersion = this.cacheInvalidationVersions.get(safeCacheKey) || 0;
    if (boundedVersion < currentVersion) {
      throw Object.assign(new Error('Cache invalidation version is stale.'), {
        code: 'PERFORMANCE_HARNESS_STALE_INVALIDATION',
      });
    }
    this.cacheInvalidationVersions.set(safeCacheKey, boundedVersion);
    let invalidatedInstanceCount = 0;
    for (const cache of this.backendCaches.values()) {
      const cached = cache.get(safeCacheKey);
      if (cached && cached.version < boundedVersion) {
        cache.delete(safeCacheKey);
        invalidatedInstanceCount += 1;
      }
    }
    this.appendSafeLog('cache_invalidated', { version: boundedVersion });
    return { version: boundedVersion, invalidatedInstanceCount, backendInstanceCount: this.backendCaches.size };
  }

  attachLifecycleHandlers(signalSource) {
    if (!signalSource || typeof signalSource.on !== 'function' || (typeof signalSource.off !== 'function' && typeof signalSource.removeListener !== 'function')) {
      throw new TypeError('A removable event source is required for deterministic signal handling.');
    }
    this.detachLifecycleHandlers();
    const onSigint = () => this.interrupt('SIGINT');
    const onSigterm = () => this.interrupt('SIGTERM');
    const onExit = () => this.cleanup('process_exit');
    signalSource.on('SIGINT', onSigint);
    signalSource.on('SIGTERM', onSigterm);
    signalSource.on('exit', onExit);
    this.signalSource = signalSource;
    this.lifecycleHandlers = { SIGINT: onSigint, SIGTERM: onSigterm, exit: onExit };
    return () => this.detachLifecycleHandlers();
  }

  detachLifecycleHandlers() {
    if (!this.signalSource || !this.lifecycleHandlers) return false;
    const remove = typeof this.signalSource.off === 'function'
      ? this.signalSource.off.bind(this.signalSource)
      : this.signalSource.removeListener.bind(this.signalSource);
    for (const [event, handler] of Object.entries(this.lifecycleHandlers)) remove(event, handler);
    this.signalSource = null;
    this.lifecycleHandlers = null;
    return true;
  }

  interrupt(signalCategory = 'SIGTERM') {
    if (!['SIGINT', 'SIGTERM'].includes(signalCategory)) {
      throw Object.assign(new Error('Unsupported deterministic harness signal.'), {
        code: 'PERFORMANCE_HARNESS_SIGNAL_NOT_ALLOWED',
      });
    }
    if (this.lifecycleState === 'cleaned_up') return this.cleanupSummary;
    this.interrupted = true;
    this.appendSafeLog('signal_received', { signalCategory });
    return this.cleanup('signal');
  }

  cleanup(reason = 'normal_exit') {
    if (this.lifecycleState === 'cleaned_up') return this.cleanupSummary;
    const safeReasons = new Set(['normal_exit', 'process_exit', 'signal', 'timeout']);
    this.terminationReason = safeReasons.has(reason) ? reason : 'normal_exit';
    let cancelledWorkloadCount = 0;
    for (const job of this.scale.jobs.values()) {
      if (!['queued', 'running'].includes(job.status)) continue;
      job.status = 'cancelled';
      job.safeReasonCode = this.terminationReason === 'timeout'
        ? 'PERFORMANCE_HARNESS_TIMEOUT'
        : 'PERFORMANCE_HARNESS_INTERRUPTED';
      delete job.leaseOwner;
      delete job.leaseExpiresAt;
      cancelledWorkloadCount += 1;
    }
    for (const worker of this.scale.workers.values()) {
      worker.status = 'stopped';
      worker.activeClaimCount = 0;
    }
    for (const partition of this.scale.partitions.values()) {
      partition.status = 'paused';
      delete partition.ownerWorkerId;
      delete partition.ownerInstanceId;
      delete partition.leaseExpiresAt;
    }
    for (const reservation of this.scale.reservations.values()) reservation.status = 'released';
    this.scale.tenantSlots.clear();
    this.scale.workspaceSlots.clear();
    for (const cache of this.backendCaches.values()) cache.clear();
    for (const process of this.processes.values()) process.state = 'stopped';
    this.lifecycleState = 'cleaned_up';
    this.cleanupSummary = Object.freeze({
      cancelledWorkloadCount,
      cacheEntryCount: 0,
      processCount: this.processes.size,
      stoppedProcessCount: [...this.processes.values()].filter((process) => process.state === 'stopped').length,
      terminationReason: this.terminationReason,
    });
    this.appendSafeLog('cleanup_completed', { cancelledWorkloadCount });
    this.detachLifecycleHandlers();
    return this.cleanupSummary;
  }

  safeSnapshot() {
    const processGroups = {};
    for (const process of this.processes.values()) {
      if (!processGroups[process.groupId]) processGroups[process.groupId] = { processCount: 0, runningCount: 0, drainingCount: 0, stoppedCount: 0 };
      processGroups[process.groupId].processCount += 1;
      const stateKey = `${process.state}Count`;
      if (Object.hasOwn(processGroups[process.groupId], stateKey)) processGroups[process.groupId][stateKey] += 1;
    }
    const workloadStates = {};
    for (const job of this.scale.jobs.values()) workloadStates[job.status] = Number(workloadStates[job.status] || 0) + 1;
    return {
      lifecycleState: this.lifecycleState,
      simulatedOnly: true,
      childProcessCount: 0,
      externalCallCount: 0,
      configuredProcessCount: this.configuredProcessCount,
      processGroups,
      generatedRequestCount: this.generatedRequestCount,
      workloadCount: this.scale.jobs.size,
      workloadStates,
      cacheEntryCount: [...this.backendCaches.values()].reduce((total, cache) => total + cache.size, 0),
      interrupted: this.interrupted,
      terminationReason: this.terminationReason,
      limits: { ...MULTI_INSTANCE_HARNESS_LIMITS, configuredMaximumWorkloadCount: this.configuration.maximumWorkloadCount, configuredTimeoutMs: this.configuration.timeoutMs },
      safeLogs: this.logs.map((entry) => ({ ...entry })),
    };
  }
}

function executeScenarioSimulation(scenario, options = {}) {
  const harness = new DeterministicPerformanceHarness({ scenario, now: options.now });
  return { harness, ...harness.execute(options) };
}

module.exports = {
  DeterministicPerformanceHarness,
  DeterministicMultiInstancePerformanceHarness,
  MULTI_INSTANCE_HARNESS_LIMITS,
  executeScenarioSimulation,
  regionalConfiguration,
  regionalPolicy,
};
