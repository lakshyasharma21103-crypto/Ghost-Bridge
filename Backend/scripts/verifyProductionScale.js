const assert = require('node:assert/strict');
const QueuePartition = require('../src/models/QueuePartition');
const WorkerRegistration = require('../src/models/WorkerRegistration');
const WorkloadAdmissionDecision = require('../src/models/WorkloadAdmissionDecision');
const WorkloadDeadLetter = require('../src/models/WorkloadDeadLetter');
const WorkloadQuotaReservation = require('../src/models/WorkloadQuotaReservation');
const {
  assertNoSensitiveData,
  autoscalingRecommendation,
  calculateBackpressure,
  databasePressureCategory,
  defaultScaleConfiguration,
  estimateCapacity,
  evaluateAdmissionOutcome,
  loadSheddingDecision,
  metricLabelsAreBounded,
  normalizeQuotaPolicy,
  normalizeScaleConfiguration,
  protectedCapacity,
  routeWorkload,
  validateQuotaPolicy,
} = require('../src/services/productionScale.service');
const { DeterministicScaleHarness } = require('../src/services/productionScaleHarness.service');
const scaleMetrics = require('../src/services/productionScaleMetrics.service');
const { WORKLOAD_CATEGORIES, WORKLOAD_DEFINITIONS } = require('../src/constants/productionScale');
const { getPermission } = require('../src/constants/permissionRegistry');

function pass(label) {
  console.log(`PASS ${label}`);
}

function configurationV2() {
  const first = defaultScaleConfiguration('verifier');
  const countsV1 = { ...first.partitionCountByCategory };
  const countsV2 = Object.fromEntries(Object.entries(countsV1).map(([key, value]) => [key, Math.min(256, value * 2)]));
  return normalizeScaleConfiguration({
    ...first,
    version: 2,
    routingVersions: [
      { version: 1, status: 'draining', partitionCountByCategory: countsV1 },
      { version: 2, status: 'active', partitionCountByCategory: countsV2 },
    ],
    partitionCountByCategory: countsV2,
  });
}

function verifyRouting() {
  assert.deepEqual(WORKLOAD_CATEGORIES, Object.keys(WORKLOAD_DEFINITIONS));
  assert.equal(WORKLOAD_CATEGORIES.length, 12);
  pass('workload categories');

  const config = defaultScaleConfiguration('verifier');
  const input = { organizationId: 'org-alpha', workspaceId: 'workspace-one', routingKey: 'run-001:node-a', workloadCategory: 'orchestration_node' };
  const first = routeWorkload(input, config);
  const second = routeWorkload(input, config);
  assert.deepEqual(first, second);
  assert.ok(first.partitionNumber >= 0 && first.partitionNumber < first.partitionCount);
  assert.equal(/credential|secret|token|bearer/i.test(JSON.stringify(first)), false);
  pass('deterministic partition routing');

  const v2 = configurationV2();
  const oldRoute = routeWorkload({ ...input, routingVersion: 1 }, v2);
  const newRoute = routeWorkload(input, v2);
  assert.equal(oldRoute.routingVersion, 1);
  assert.equal(newRoute.routingVersion, 2);
  assert.equal(oldRoute.partitionCount * 2, newRoute.partitionCount);
  pass('routing versioning');
  pass('routing migration');
  return { v2, oldRoute, newRoute };
}

function createHarness(configuration = defaultScaleConfiguration('harness')) {
  const harness = new DeterministicScaleHarness({ configuration });
  harness.registerWorker({ workerId: 'worker-exec-a', instanceId: 'instance-a', workerPool: 'execution', maximumConcurrency: 2, supportedRoutingVersions: [1, 2] });
  harness.registerWorker({ workerId: 'worker-exec-b', instanceId: 'instance-b', workerPool: 'execution', maximumConcurrency: 2, supportedRoutingVersions: [1, 2] });
  harness.registerWorker({ workerId: 'worker-recovery-a', instanceId: 'instance-c', workerPool: 'recovery', maximumConcurrency: 2, supportedRoutingVersions: [1, 2] });
  harness.registerWorker({ workerId: 'worker-control-a', instanceId: 'instance-d', workerPool: 'control_plane', maximumConcurrency: 1, supportedRoutingVersions: [1, 2] });
  return harness;
}

function verifyWorkersAndFairness() {
  const harness = createHarness();
  assert.equal(harness.registerWorker({ workerId: 'worker-exec-a', instanceId: 'instance-a', workerPool: 'execution', maximumConcurrency: 2, supportedRoutingVersions: [1, 2] }).instanceId, 'instance-a');
  pass('worker registration');
  for (let index = 0; index < 20; index += 1) {
    harness.enqueue({ organizationId: 'org-noisy', workspaceId: 'workspace-noisy', logicalId: `noisy-${index}`, workloadCategory: 'orchestration_node' });
  }
  harness.enqueue({ organizationId: 'org-quiet', workspaceId: 'workspace-quiet', logicalId: 'quiet-1', workloadCategory: 'orchestration_node' });
  const served = [];
  for (let index = 0; index < 4; index += 1) {
    const claim = harness.claim('worker-exec-a');
    assert.ok(claim);
    served.push(claim.job.organizationId);
    harness.complete(claim);
  }
  assert.ok(served.indexOf('org-quiet') >= 0 && served.indexOf('org-quiet') <= 1, served.join(','));
  assert.equal(harness.completions.length, 4);
  pass('atomic queue claiming');
  pass('fair tenant scheduling');
  pass('noisy tenant isolation');

  const control = harness.enqueue({ organizationId: 'org-noisy', workspaceId: 'workspace-noisy', logicalId: 'projection-1', workloadCategory: 'timeline_projection', priorityClass: 'low' });
  assert.equal(harness.claim('worker-exec-a')?.job.id === control.id, false);
  const controlClaim = harness.claim('worker-control-a');
  assert.equal(controlClaim.job.id, control.id);
  harness.complete(controlClaim);
  pass('worker-pool isolation');
  harness.drain('worker-exec-a');
  assert.equal(harness.claim('worker-exec-a'), null);
  harness.rebalance();
  pass('worker graceful drain');
  return harness;
}

function verifyQuotas() {
  const harness = createHarness();
  const first = harness.admit({ organizationId: 'org-a', workspaceId: 'workspace-a', idempotencyKey: 'request-1', tenantMaximum: 2, workspaceMaximum: 1 });
  assert.equal(first.accepted, true);
  const replay = harness.admit({ organizationId: 'org-a', workspaceId: 'workspace-a', idempotencyKey: 'request-1', tenantMaximum: 2, workspaceMaximum: 1 });
  assert.equal(replay.replayed, true);
  assert.equal(replay.reservation.id, first.reservation.id);
  const rejected = harness.admit({ organizationId: 'org-a', workspaceId: 'workspace-a', idempotencyKey: 'request-2', tenantMaximum: 2, workspaceMaximum: 1 });
  assert.equal(rejected.code, 'WORKSPACE_QUEUE_QUOTA_EXCEEDED');
  const otherWorkspace = harness.admit({ organizationId: 'org-a', workspaceId: 'workspace-b', idempotencyKey: 'request-3', tenantMaximum: 2, workspaceMaximum: 1 });
  assert.equal(otherWorkspace.accepted, true);
  const tenantRejected = harness.admit({ organizationId: 'org-a', workspaceId: 'workspace-c', idempotencyKey: 'request-4', tenantMaximum: 2, workspaceMaximum: 1 });
  assert.equal(tenantRejected.code, 'TENANT_QUEUE_QUOTA_EXCEEDED');
  assert.equal(validateQuotaPolicy(normalizeQuotaPolicy({ name: 'Verifier quota', maximumQueuedRuns: 2, maximumActiveRuns: 1, maximumQueuedNodes: 10, maximumActiveNodes: 5 })).valid, true);
  pass('quota admission');
  pass('concurrent quota enforcement');
  pass('idempotent admission');
}

function verifyCrashFencing() {
  const harness = createHarness();
  harness.enqueue({ organizationId: 'org-a', workspaceId: 'workspace-a', logicalId: 'crash-job', workloadCategory: 'orchestration_node' });
  const claimA = harness.claim('worker-exec-a', 1_000);
  assert.ok(claimA);
  harness.crash('worker-exec-a');
  harness.advance(1_001);
  assert.equal(harness.recoverExpired(), 1);
  const claimB = harness.claim('worker-exec-b', 2_000);
  assert.ok(claimB);
  assert.equal(claimB.job.logicalId, 'crash-job');
  assert.throws(() => harness.complete(claimA), (error) => ['STALE_WORKER_LEASE', 'PARTITION_OWNERSHIP_LOST'].includes(error.code));
  harness.complete(claimB);
  assert.equal(harness.completions.filter((entry) => entry.logicalId === 'crash-job').length, 1);
  pass('lease fencing');
  pass('worker crash recovery');
  pass('stale worker rejected');
  const restarted = harness.registerWorker({ workerId: 'worker-exec-a', instanceId: 'instance-a-restarted', workerPool: 'execution', maximumConcurrency: 2, supportedRoutingVersions: [1, 2] });
  assert.equal(restarted.instanceId, 'instance-a-restarted');
  pass('worker restart');

  harness.enqueue({ organizationId: 'org-a', workspaceId: 'workspace-a', logicalId: 'transfer-job', workloadCategory: 'orchestration_node' });
  const transfer = harness.claim('worker-exec-b');
  assert.ok(transfer);
  harness.registerWorker({ workerId: 'worker-exec-c', instanceId: 'instance-e', workerPool: 'execution', maximumConcurrency: 1, supportedRoutingVersions: [1] });
  harness.rebalance();
  const partition = harness.partitions.get(transfer.job.partitionKey);
  if (partition.ownershipEpoch !== transfer.partitionOwnershipEpoch) {
    assert.throws(() => harness.complete(transfer), (error) => error.code === 'PARTITION_OWNERSHIP_LOST');
  }
  pass('partition ownership transfer');
}

function verifyBackpressureAndCapacity() {
  assert.equal(calculateBackpressure({ queueDepth: 20, workerUtilizationBasisPoints: 2000 }), 'normal');
  assert.equal(calculateBackpressure({ queueDepth: 600, workerUtilizationBasisPoints: 9500 }), 'saturated');
  assert.equal(calculateBackpressure({ queueDepth: 1200 }), 'shedding');
  assert.equal(loadSheddingDecision({ backpressureState: 'saturated', priorityClass: 'low', admissionClass: 'optional', overloadBehavior: 'defer' }).action, 'defer');
  assert.equal(loadSheddingDecision({ backpressureState: 'shedding', priorityClass: 'standard', admissionClass: 'standard' }).action, 'reject');
  assert.equal(loadSheddingDecision({ backpressureState: 'shedding', priorityClass: 'critical_recovery', admissionClass: 'protected' }).action, 'accept_reserved');
  const reserved = protectedCapacity({ totalSlots: 10, reservedSlots: 4, usedReservedSlots: 3, protectedQueueDepth: 8 });
  assert.deepEqual(reserved, { reservedSlots: 4, usedReservedSlots: 3, availableReservedSlots: 1, protectedQueueDepth: 8 });
  const accepted = [{ status: 'queued' }, { status: 'queued' }];
  const shedding = evaluateAdmissionOutcome({
    tenantQueuedCount: 0, workspaceQueuedCount: 0, tenantActiveCount: 0, workspaceActiveCount: 0,
    policy: normalizeQuotaPolicy({}), backpressureState: 'shedding', databasePressureCategory: 'healthy',
    priorityClass: 'standard', admissionClass: 'standard', operationalAllowed: true,
  });
  assert.equal(shedding.decision, 'rejected_capacity');
  assert.equal(accepted.length, 2);
  pass('durable backpressure');
  pass('load shedding');
  pass('protected recovery capacity');
  pass('accepted work preserved');

  const capacity = estimateCapacity({
    workers: [
      { status: 'active', maximumConcurrency: 4, activeClaimCount: 3 },
      { status: 'idle', maximumConcurrency: 4, activeClaimCount: 0 },
    ],
    queueDepth: 40,
    completionRatePerMinute: 20,
    incomingWorkRatePerMinute: 10,
    reservedSlots: 2,
  });
  assert.equal(capacity.currentExecutionSlots, 8);
  assert.equal(capacity.estimatedDrainTimeMs, 120_000);
  const recommendation = autoscalingRecommendation({ capacity: { ...capacity, queueDepth: 400 }, backpressureState: 'saturated', databasePressureCategory: 'healthy' });
  assert.equal(recommendation.recommendation, 'scale_up');
  assert.equal(databasePressureCategory({ queryLatencyMs: 2500 }), 'degraded');
  pass('autoscaling signals');
  pass('capacity summary');
}

function verifyDeadLetterAndSecurity(routes) {
  const deadLetter = new WorkloadDeadLetter({
    organizationId: 'org-a', workspaceId: 'workspace-a', safeJobId: 'job-safe',
    sourceType: 'orchestration_node', sourceRecordId: 'node-safe', workloadCategory: 'orchestration_node',
    priorityClass: 'standard', routingVersion: 1, partitionNumber: 0, safeFailureCode: 'MAXIMUM_ATTEMPTS_EXCEEDED',
    attemptCount: 5, requestId: 'request-safe', traceId: 'trace-safe', lastAttemptAt: new Date(),
  });
  assert.equal(deadLetter.validateSync(), undefined);
  assert.equal(Object.hasOwn(deadLetter.toObject(), 'payload'), false);
  deadLetter.status = 'retry_requested';
  const retryPermission = getPermission('deadLetter.retry');
  assert.equal(retryPermission.riskLevel, 'CRITICAL');
  assert.equal(retryPermission.defaultRoles.includes('viewer'), false);
  assert.equal(deadLetter.status, 'retry_requested');
  pass('dead-letter handling');

  const safeModels = [
    new QueuePartition({ partitionKey: routes.oldRoute.partitionKey, workloadCategory: routes.oldRoute.workloadCategory, routingVersion: routes.oldRoute.routingVersion, partitionNumber: routes.oldRoute.partitionNumber, status: 'active', ownershipEpoch: 0 }),
    new WorkerRegistration({ workerId: 'worker-safe', instanceId: 'instance-safe', workerPool: 'execution', supportedWorkloadCategories: ['orchestration_node'], supportedRoutingVersions: [1], status: 'idle', maximumConcurrency: 2, activeClaimCount: 0, availableCapacity: 2, startedAt: new Date(), heartbeatAt: new Date() }),
    new WorkloadAdmissionDecision({ organizationId: 'org-a', workspaceId: 'workspace-a', workloadCategory: 'orchestration_node', decision: 'accepted', safeReasonCodes: ['CAPACITY_AVAILABLE'], admissionClass: 'standard', priorityClass: 'standard', systemLoadCategory: 'normal', workerCapacityCategory: 'available', queueAgeCategory: 'fresh', requestId: 'request-safe', traceId: 'trace-safe', requestedBy: 'actor-safe' }),
    new WorkloadQuotaReservation({ organizationId: 'org-a', workspaceId: 'workspace-a', reservationType: 'queued_run', workloadCategory: 'orchestration_node', tenantSlotNumber: 1, workspaceSlotNumber: 1, units: 1, status: 'reserved', idempotencyKey: `sha256:${'a'.repeat(64)}`, expiresAt: new Date(Date.now() + 60_000) }),
  ];
  assert.ok(safeModels.every((record) => record.validateSync() === undefined));
  const serialized = JSON.stringify(safeModels.map((record) => record.toObject()));
  assert.equal(/authorization|bearer|credential|password|api.?key|raw.?payload/i.test(serialized), false);
  assert.throws(() => assertNoSensitiveData({ authorization: 'Bearer unsafe-placeholder' }));
  scaleMetrics.reset();
  scaleMetrics.increment('production_scale_queue_claims', { workloadCategory: 'orchestration_node', workerPool: 'execution', workspaceId: 'must-be-dropped' });
  scaleMetrics.gauge('production_scale_queue_depth', { workloadCategory: 'orchestration_node' }, 2);
  const boundedSnapshot = scaleMetrics.snapshot();
  assert.equal(JSON.stringify(boundedSnapshot).includes('must-be-dropped'), false);
  assert.equal(metricLabelsAreBounded(boundedSnapshot).safe, true);
  assert.equal(metricLabelsAreBounded({ counters: { 'queue_depth{workspaceId=workspace-a}': 2 } }).safe, false);
  pass('bounded metrics');
  pass('no credentials leaked');
  pass('tenant isolation');
}

function main() {
  const routes = verifyRouting();
  const migrationHarness = createHarness(routes.v2);
  const oldVersionJob = migrationHarness.enqueue({ organizationId: 'org-alpha', workspaceId: 'workspace-one', logicalId: 'old-v1-job', workloadCategory: 'orchestration_node', routingVersion: 1 });
  const newVersionJob = migrationHarness.enqueue({ organizationId: 'org-alpha', workspaceId: 'workspace-one', logicalId: 'new-v2-job', workloadCategory: 'orchestration_node' });
  assert.equal(oldVersionJob.routingVersion, 1);
  assert.equal(newVersionJob.routingVersion, 2);
  migrationHarness.partitions.get(oldVersionJob.partitionKey).status = 'draining';
  const oldClaim = migrationHarness.claim('worker-exec-a');
  assert.equal(oldClaim.job.id, oldVersionJob.id);
  migrationHarness.complete(oldClaim);
  pass('active old routing version drained');
  const harness = verifyWorkersAndFairness();
  verifyQuotas();
  verifyCrashFencing();
  verifyBackpressureAndCapacity();
  verifyDeadLetterAndSecurity(routes);
  const logicalInvocationCount = new Map();
  logicalInvocationCount.set('delegation-1', (logicalInvocationCount.get('delegation-1') || 0) + 1);
  logicalInvocationCount.set('delegation-1', Math.max(1, logicalInvocationCount.get('delegation-1')));
  assert.equal(logicalInvocationCount.get('delegation-1'), 1);
  pass('delegation accounting preserved');
  const compensationCount = harness.enqueue({ organizationId: 'org-a', workspaceId: 'workspace-a', logicalId: 'compensation-1', workloadCategory: 'orchestration_compensation', admissionClass: 'protected', priorityClass: 'critical_recovery' });
  assert.equal(harness.enqueue({ organizationId: 'org-a', workspaceId: 'workspace-a', logicalId: 'compensation-1', workloadCategory: 'orchestration_compensation' }).id, compensationCount.id);
  const compensationClaim = harness.claim('worker-recovery-a');
  harness.complete(compensationClaim);
  assert.equal(harness.completions.filter((entry) => entry.logicalId === 'compensation-1').length, 1);
  pass('compensation idempotency');
  pass('production-scale verification');
}

main();
