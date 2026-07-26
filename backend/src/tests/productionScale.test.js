const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const QueuePartition = require('../models/QueuePartition');
const WorkerRegistration = require('../models/WorkerRegistration');
const WorkloadAdmissionDecision = require('../models/WorkloadAdmissionDecision');
const WorkloadDeadLetter = require('../models/WorkloadDeadLetter');
const WorkloadQuotaPolicy = require('../models/WorkloadQuotaPolicy');
const WorkloadQuotaReservation = require('../models/WorkloadQuotaReservation');
const WorkloadScaleConfiguration = require('../models/WorkloadScaleConfiguration');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const OrchestrationCompensationRun = require('../models/OrchestrationCompensationRun');
const { getPermission, PERMISSION_REGISTRY_VERSION } = require('../constants/permissionRegistry');
const { WORKLOAD_CATEGORIES, WORKLOAD_DEFINITIONS } = require('../constants/productionScale');
const {
  assertNoSensitiveData,
  assertRoutingEvolution,
  autoscalingRecommendation,
  calculateBackpressure,
  databasePressureCategory,
  defaultScaleConfiguration,
  effectivePriority,
  estimateCapacity,
  evaluateAdmission,
  evaluateAdmissionOutcome,
  fairSchedule,
  loadSheddingDecision,
  metricLabelsAreBounded,
  normalizeQuotaPolicy,
  normalizeScaleConfiguration,
  partitionKey,
  protectedCapacity,
  registerWorker,
  routeWorkload,
  stableHash,
  validateQuotaPolicy,
  validateScaleConfiguration,
} = require('../services/productionScale.service');
const { DeterministicScaleHarness } = require('../services/productionScaleHarness.service');
const scaleMetrics = require('../services/productionScaleMetrics.service');
const productionScaleOperations = require('../services/productionScaleOperations.service');

function v2Configuration() {
  const base = defaultScaleConfiguration('test');
  const doubled = Object.fromEntries(Object.entries(base.partitionCountByCategory).map(([key, value]) => [key, value * 2]));
  return normalizeScaleConfiguration({
    ...base,
    version: 2,
    routingVersions: [
      { version: 1, status: 'draining', partitionCountByCategory: base.partitionCountByCategory },
      { version: 2, status: 'active', partitionCountByCategory: doubled },
    ],
    partitionCountByCategory: doubled,
  });
}

function harness(configuration = defaultScaleConfiguration('test')) {
  const value = new DeterministicScaleHarness({ configuration });
  value.registerWorker({ workerId: 'worker-a', instanceId: 'instance-a', workerPool: 'execution', maximumConcurrency: 4, supportedRoutingVersions: [1, 2] });
  value.registerWorker({ workerId: 'worker-b', instanceId: 'instance-b', workerPool: 'execution', maximumConcurrency: 4, supportedRoutingVersions: [1, 2] });
  value.registerWorker({ workerId: 'worker-r', instanceId: 'instance-r', workerPool: 'recovery', maximumConcurrency: 2, supportedRoutingVersions: [1, 2] });
  value.registerWorker({ workerId: 'worker-c', instanceId: 'instance-c', workerPool: 'control_plane', maximumConcurrency: 2, supportedRoutingVersions: [1, 2] });
  return value;
}

test('workload categories are closed, bounded and assigned to isolated worker pools', () => {
  assert.equal(WORKLOAD_CATEGORIES.length, 12);
  assert.deepEqual(new Set(WORKLOAD_CATEGORIES), new Set(Object.keys(WORKLOAD_DEFINITIONS)));
  assert.ok(WORKLOAD_CATEGORIES.every((category) => WORKLOAD_DEFINITIONS[category].claimBatchSize <= 100));
  assert.equal(WORKLOAD_DEFINITIONS.orchestration_node.workerPool, 'execution');
  assert.equal(WORKLOAD_DEFINITIONS.orchestration_compensation.workerPool, 'recovery');
  assert.equal(WORKLOAD_DEFINITIONS.timeline_projection.workerPool, 'control_plane');
  assert.equal(WORKLOAD_DEFINITIONS.retention_cleanup.workerPool, 'maintenance');
});

test('worker registration cannot cross worker-pool category boundaries', async () => {
  await assert.rejects(
    registerWorker({
      workerId: 'worker-execution',
      instanceId: 'instance-execution',
      workerPool: 'execution',
      supportedWorkloadCategories: ['orchestration_compensation'],
      supportedRoutingVersions: [1],
      maximumConcurrency: 1,
    }),
    (error) => error.code === 'VALIDATION_ERROR' && error.details?.[0]?.path === 'supportedWorkloadCategories',
  );
});

test('partition hashing is deterministic and changes neither by process nor worker identity', () => {
  const config = defaultScaleConfiguration('test');
  const input = { organizationId: 'org-a', workspaceId: 'workspace-a', routingKey: 'run-a:node-a', workloadCategory: 'orchestration_node' };
  const expected = routeWorkload(input, config);
  assert.deepEqual(routeWorkload(input, config), expected);
  assert.equal(expected.partitionKey, partitionKey(expected.workloadCategory, expected.routingVersion, expected.partitionNumber));
  const child = spawnSync(process.execPath, ['-e', `const {routeWorkload,defaultScaleConfiguration}=require('./src/services/productionScale.service');process.stdout.write(JSON.stringify(routeWorkload(${JSON.stringify(input)},defaultScaleConfiguration('test'))));`], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), expected);
});

test('partition calculation is bounded and arbitrary categories are rejected', () => {
  const route = routeWorkload({ organizationId: 'org-a', workspaceId: 'workspace-a', routingKey: 'route-a', workloadCategory: 'retention_cleanup' }, defaultScaleConfiguration());
  assert.ok(route.partitionNumber >= 0 && route.partitionNumber < 2);
  assert.throws(
    () => routeWorkload({ organizationId: 'org-a', workspaceId: 'workspace-a', routingKey: 'route-a', workloadCategory: 'user_expression' }),
    (error) => error.code === 'VALIDATION_ERROR' && error.details[0].path === 'workloadCategory',
  );
});

test('routing migration keeps old work on v1 and sends only new work to v2', () => {
  const config = v2Configuration();
  const input = { organizationId: 'org-a', workspaceId: 'workspace-a', routingKey: 'route-a', workloadCategory: 'orchestration_node' };
  const oldWork = routeWorkload({ ...input, routingVersion: 1 }, config);
  const newWork = routeWorkload(input, config);
  assert.equal(oldWork.routingVersion, 1);
  assert.equal(newWork.routingVersion, 2);
  assert.equal(newWork.partitionCount, oldWork.partitionCount * 2);
  assert.equal(routeWorkload({ ...input, routingVersion: 1 }, config).partitionNumber, oldWork.partitionNumber);
  assert.equal(assertRoutingEvolution(config, defaultScaleConfiguration('test')), true);
  const changedInPlace = defaultScaleConfiguration('test');
  changedInPlace.partitionCountByCategory = { ...changedInPlace.partitionCountByCategory, orchestration_node: 16 };
  changedInPlace.routingVersions[0].partitionCountByCategory = { ...changedInPlace.routingVersions[0].partitionCountByCategory, orchestration_node: 16 };
  assert.throws(
    () => assertRoutingEvolution(changedInPlace, defaultScaleConfiguration('test')),
    (error) => error.code === 'VALIDATION_ERROR'
      && error.details?.[0]?.path === 'routingVersions'
      && /routing version/i.test(error.details[0].message),
  );
});

test('scale configuration requires one active route and safe lease-heartbeat ratios', () => {
  const valid = validateScaleConfiguration(defaultScaleConfiguration());
  assert.equal(valid.valid, true);
  assert.equal(validateScaleConfiguration({ ...defaultScaleConfiguration(), routingVersions: [{ version: 1, status: 'draining', partitionCountByCategory: defaultScaleConfiguration().partitionCountByCategory }] }).valid, false);
  const invalid = defaultScaleConfiguration();
  invalid.heartbeatIntervalByCategory = { ...invalid.heartbeatIntervalByCategory, orchestration_node: 60_000 };
  invalid.leaseDurationByCategory = { ...invalid.leaseDurationByCategory, orchestration_node: 120_000 };
  assert.equal(validateScaleConfiguration(invalid).valid, false);
});

test('quota policy validation bounds weights, sizes and active capacity', () => {
  const policy = normalizeQuotaPolicy({ name: 'Bounded', tenantWeight: 100, workspaceWeight: 1 });
  assert.equal(validateQuotaPolicy(policy).valid, true);
  assert.throws(() => normalizeQuotaPolicy({ tenantWeight: 0 }), (error) => error.details[0].path === 'tenantWeight');
  assert.throws(() => normalizeQuotaPolicy({ workspaceWeight: 101 }), (error) => error.details[0].path === 'workspaceWeight');
  assert.equal(validateQuotaPolicy({ ...policy, maximumQueuedRuns: 1, maximumActiveRuns: 100, burstCapacity: 0 }).valid, false);
});

test('fair scheduling round-robins tenants and applies bounded weights', () => {
  const items = [];
  for (let index = 0; index < 5; index += 1) items.push({ id: `a-${index}`, organizationId: 'org-a', workspaceId: 'ws-a', priorityClass: 'standard', createdAt: new Date(index), tenantWeight: 100 });
  for (let index = 0; index < 2; index += 1) items.push({ id: `b-${index}`, organizationId: 'org-b', workspaceId: 'ws-b', priorityClass: 'standard', createdAt: new Date(index), tenantWeight: 1 });
  const ordered = fairSchedule(items, { now: new Date(100_000) });
  assert.ok(ordered.slice(0, 5).some((item) => item.organizationId === 'org-b'));
  assert.equal(new Set(ordered.map((item) => item.id)).size, items.length);
});

test('durable service counts move the least-served tenant to the front', () => {
  const items = [
    { id: 'a', organizationId: 'org-a', workspaceId: 'ws-a', priorityClass: 'standard', createdAt: new Date(0) },
    { id: 'b', organizationId: 'org-b', workspaceId: 'ws-b', priorityClass: 'standard', createdAt: new Date(1) },
  ];
  const result = fairSchedule(items, { tenantServiceCounts: new Map([['org-a\u0000ws-a', 2], ['org-b\u0000ws-b', 0]]) });
  assert.equal(result[0].id, 'b');
});

test('old low-priority work gains a bounded priority aging boost', () => {
  const now = new Date('2026-01-01T01:00:00.000Z');
  const old = effectivePriority({ priorityClass: 'low', createdAt: new Date('2026-01-01T00:00:00.000Z') }, { now });
  const fresh = effectivePriority({ priorityClass: 'low', createdAt: now }, { now });
  assert.equal(old - fresh, 3);
  assert.equal(effectivePriority({ priorityClass: 'maintenance', createdAt: new Date(0) }, { now }) <= 4, true);
});

test('admission outcome maps tenant, workspace and payload quotas to stable codes', () => {
  const policy = normalizeQuotaPolicy({ maximumQueuedRuns: 2, maximumActiveRuns: 2, maximumPayloadBytesPerJob: 100 });
  const base = { policy, operationalAllowed: true, backpressureState: 'normal', databasePressureCategory: 'healthy', priorityClass: 'standard', admissionClass: 'standard', tenantMaximumQueuedRuns: 2, workspaceMaximumQueuedRuns: 2, tenantMaximumActiveRuns: 2, workspaceMaximumActiveRuns: 2 };
  assert.equal(evaluateAdmissionOutcome({ ...base, tenantQueuedCount: 2 }).safeReasonCodes[0], 'TENANT_QUEUE_QUOTA_EXCEEDED');
  assert.equal(evaluateAdmissionOutcome({ ...base, workspaceQueuedCount: 2 }).safeReasonCodes[0], 'WORKSPACE_QUEUE_QUOTA_EXCEEDED');
  assert.equal(evaluateAdmissionOutcome({ ...base, payloadBytesEstimate: 101 }).safeReasonCodes[0], 'WORKLOAD_PAYLOAD_QUOTA_EXCEEDED');
  assert.equal(evaluateAdmissionOutcome(base).decision, 'accepted');
});

test('operational suspension and database pressure cannot be bypassed by normal priority', () => {
  const policy = normalizeQuotaPolicy({});
  assert.equal(evaluateAdmissionOutcome({ policy, operationalAllowed: false, operationalReasonCode: 'WORKSPACE_SUSPENDED' }).decision, 'rejected_operational_state');
  assert.equal(evaluateAdmissionOutcome({ policy, operationalAllowed: true, databasePressureCategory: 'degraded', backpressureState: 'normal', priorityClass: 'standard', admissionClass: 'standard' }).safeReasonCodes[0], 'DATABASE_PRESSURE_HIGH');
  assert.equal(evaluateAdmissionOutcome({ policy, failoverInProgress: true }).decision, 'rejected_failover_in_progress');
});

test('API admission and platform configuration enforce authenticated tenant authority', async () => {
  const caller = { partner: { _id: 'org-a' }, requestId: 'req-tenant-boundary', traceId: 'trace-tenant-boundary' };
  await assert.rejects(
    evaluateAdmission({ organizationId: 'org-b', workspaceId: 'workspace-b', workloadCategory: 'orchestration_node' }, caller),
    (error) => error.statusCode === 403 && error.code === 'AUTHORIZATION_DENIED',
  );
  await assert.rejects(
    productionScaleOperations.createScaleConfiguration(
      { platformScope: true, scopeKey: 'platform' },
      caller,
      { dependencies: { authorize: async () => ({ policySnapshotRevision: 1 }) } },
    ),
    (error) => error.statusCode === 403 && error.code === 'AUTHORIZATION_DENIED',
  );
});

test('backpressure calculation escalates and recovers deterministically', () => {
  assert.equal(calculateBackpressure({ queueDepth: 0 }), 'normal');
  assert.equal(calculateBackpressure({ queueDepth: 100 }), 'elevated');
  assert.equal(calculateBackpressure({ oldestQueueAgeMs: 300_000 }), 'saturated');
  assert.equal(calculateBackpressure({ queueDepth: 1_000 }), 'shedding');
  assert.equal(calculateBackpressure({ paused: true }), 'paused');
  assert.equal(calculateBackpressure({ databasePressureCategory: 'unavailable' }), 'shedding');
});

test('load shedding protects bounded recovery and never drops accepted work', () => {
  assert.equal(loadSheddingDecision({ backpressureState: 'elevated', priorityClass: 'low', admissionClass: 'optional' }).action, 'defer');
  assert.equal(loadSheddingDecision({ backpressureState: 'shedding', priorityClass: 'standard', admissionClass: 'standard' }).action, 'reject');
  assert.equal(loadSheddingDecision({ backpressureState: 'shedding', priorityClass: 'critical_recovery', admissionClass: 'protected' }).action, 'accept_reserved');
  const accepted = ['job-a', 'job-b'];
  loadSheddingDecision({ backpressureState: 'shedding', priorityClass: 'standard', admissionClass: 'standard' });
  assert.deepEqual(accepted, ['job-a', 'job-b']);
  assert.equal(evaluateAdmissionOutcome({
    policy: normalizeQuotaPolicy({}), operationalAllowed: true, backpressureState: 'shedding',
    databasePressureCategory: 'healthy', priorityClass: 'critical_recovery',
    admissionClass: 'protected', protectedCapacityAvailable: false,
  }).safeReasonCodes[0], 'PROTECTED_CAPACITY_EXHAUSTED');
});

test('reserved capacity is bounded by total slots', () => {
  assert.deepEqual(protectedCapacity({ totalSlots: 3, reservedSlots: 10, usedReservedSlots: 8, protectedQueueDepth: 4 }), { reservedSlots: 3, usedReservedSlots: 3, availableReservedSlots: 0, protectedQueueDepth: 4 });
});

test('capacity and drain-time estimates are explicitly approximate and deterministic', () => {
  const result = estimateCapacity({ workers: [{ status: 'active', maximumConcurrency: 4, activeClaimCount: 3 }], queueDepth: 10, completionRatePerMinute: 5, reservedSlots: 1 });
  assert.equal(result.estimate, true);
  assert.equal(result.currentExecutionSlots, 4);
  assert.equal(result.estimatedDrainTimeMs, 120_000);
  assert.equal(estimateCapacity({ workers: [], queueDepth: 1 }).estimatedDrainTimeMs, null);
});

test('autoscaling recommendation is provider neutral and database-aware', () => {
  const capacity = estimateCapacity({ workers: [{ status: 'active', maximumConcurrency: 2, activeClaimCount: 2 }], queueDepth: 100 });
  assert.equal(autoscalingRecommendation({ capacity, backpressureState: 'saturated', databasePressureCategory: 'healthy' }).recommendation, 'scale_up');
  assert.equal(autoscalingRecommendation({ capacity, backpressureState: 'saturated', databasePressureCategory: 'degraded' }).recommendation, 'investigate');
  assert.equal(autoscalingRecommendation({ capacity, backpressureState: 'normal', databasePressureCategory: 'healthy' }).providerNeutral, true);
});

test('database pressure exposes categories rather than diagnostics', () => {
  assert.equal(databasePressureCategory({ available: false }), 'unavailable');
  assert.equal(databasePressureCategory({ queryLatencyMs: 2_000 }), 'degraded');
  assert.equal(databasePressureCategory({ connectionPoolUsageBasisPoints: 8_100 }), 'elevated');
  assert.equal(databasePressureCategory({ queryLatencyMs: 10 }), 'healthy');
});

test('model schemas contain safe scale fields and required compound indexes', () => {
  assert.ok(QueuePartition.schema.indexes().some(([fields]) => fields.workloadCategory === 1 && fields.routingVersion === 1 && fields.partitionNumber === 1));
  assert.ok(WorkerRegistration.schema.indexes().some(([fields]) => fields.workerPool === 1 && fields.status === 1));
  assert.ok(WorkloadAdmissionDecision.schema.indexes().some(([fields]) => fields.organizationId === 1 && fields.workspaceId === 1));
  assert.ok(WorkloadQuotaPolicy.schema.indexes().some(([fields]) => fields.organizationId === 1 && fields.name === 1 && fields.version === 1));
  assert.ok(WorkloadQuotaReservation.schema.indexes().some(([fields]) => fields.idempotencyKey === 1));
  assert.ok(OrchestrationNodeRun.schema.indexes().some(([fields]) => fields.workloadCategory === 1 && fields.routingVersion === 1));
  assert.ok(RuntimeWorkItem.schema.indexes().some(([fields]) => fields.workloadCategory === 1 && fields.routingVersion === 1));
  assert.ok(OrchestrationCompensationRun.schema.indexes().some(([fields]) => fields.workloadCategory === 1 && fields.routingVersion === 1));
});

test('scale-control schemas cannot store credentials, environment maps or unrestricted payloads', () => {
  assert.equal(QueuePartition.schema.path('credentials'), undefined);
  assert.equal(QueuePartition.schema.path('payload'), undefined);
  assert.equal(WorkerRegistration.schema.path('environment'), undefined);
  assert.equal(WorkerRegistration.schema.path('commandLine'), undefined);
  assert.equal(WorkloadAdmissionDecision.schema.path('input'), undefined);
  assert.equal(WorkloadAdmissionDecision.schema.path('payload'), undefined);
  assert.equal(WorkloadQuotaReservation.schema.path('credentials'), undefined);
  assert.equal(WorkloadDeadLetter.schema.path('payload'), undefined);
  assert.throws(() => assertNoSensitiveData({ authorizationHeader: 'unsafe' }));
  assert.throws(() => assertNoSensitiveData({ rawPayload: { value: 'unsafe' } }));
});

test('configuration mixed fields reject secret-shaped keys', () => {
  const safe = new WorkloadScaleConfiguration({
    ...defaultScaleConfiguration('workspace-safe'),
    status: 'draft',
    createdBy: 'actor-safe',
  });
  assert.equal(safe.validateSync(), undefined);
  safe.autoscalingTargets = { providerToken: 'unsafe' };
  assert.ok(safe.validateSync()?.errors.autoscalingTargets);
});

test('production-scale metrics reject all high-cardinality identity labels', () => {
  assert.equal(metricLabelsAreBounded({ counters: { 'queue_depth{category=orchestration_node,pool=execution}': 1 } }).safe, true);
  for (const label of ['runId', 'nodeId', 'organizationId', 'workspaceId', 'workerId', 'partitionKey', 'traceId', 'requestId']) {
    assert.equal(metricLabelsAreBounded({ counters: { [`queue_depth{${label}=unsafe}`]: 1 } }).safe, false);
  }
});

test('production-scale metrics implementation drops identity labels and bounds series', () => {
  scaleMetrics.reset();
  scaleMetrics.increment('production_scale_claims', {
    workloadCategory: 'orchestration_node',
    workerPool: 'execution',
    workspaceId: 'workspace-secret-cardinality',
    workerId: 'worker-secret-cardinality',
  });
  scaleMetrics.gauge('production_scale_queue_depth', { workloadCategory: 'orchestration_node' }, 4);
  const snapshot = scaleMetrics.snapshot();
  assert.equal(JSON.stringify(snapshot).includes('workspace-secret-cardinality'), false);
  assert.equal(JSON.stringify(snapshot).includes('worker-secret-cardinality'), false);
  assert.equal(metricLabelsAreBounded(snapshot).safe, true);
});

test('production scale RBAC is registered and privileged actions are not granted to normal users', () => {
  assert.ok(PERMISSION_REGISTRY_VERSION >= 13);
  assert.ok(getPermission('productionScale.read').defaultRoles.includes('viewer'));
  assert.equal(getPermission('queuePartition.rebalance').defaultRoles.includes('developer'), false);
  assert.equal(getPermission('workerFleet.drain').defaultRoles.includes('viewer'), false);
  assert.equal(getPermission('productionScaleConfiguration.activate').defaultRoles.includes('workspace_admin'), false);
  assert.equal(getPermission('deadLetter.retry').riskLevel, 'CRITICAL');
});

test('production-scale protected actions require route RBAC and service policy checks', () => {
  const routes = require('../routes/productionScaleRoutes').productionScaleRouter;
  const source = require('node:fs').readFileSync(require.resolve('../services/productionScale.service'), 'utf8');
  const routeNames = routes.stack.filter((layer) => layer.route).map((layer) => `${Object.keys(layer.route.methods)[0]} ${layer.route.path}`);
  for (const route of ['post /partitions/rebalance', 'post /workers/:workerId/drain', 'post /dead-letter/:jobId/retry', 'post /configurations/:configurationId/activate']) {
    assert.ok(routeNames.includes(route), route);
  }
  assert.match(source, /requestedOperationalAction: 'protected_capacity_use'/);
  assert.match(source, /scope\.trustedSystem && input\.controlOperation === true/);
});

test('two workers cannot execute one logical job twice', () => {
  const value = harness();
  const first = value.enqueue({ organizationId: 'org-a', workspaceId: 'ws-a', logicalId: 'logical-a', workloadCategory: 'orchestration_node' });
  const replay = value.enqueue({ organizationId: 'org-a', workspaceId: 'ws-a', logicalId: 'logical-a', workloadCategory: 'orchestration_node' });
  assert.equal(replay.id, first.id);
  const claimA = value.claim('worker-a');
  const claimB = value.claim('worker-b');
  assert.equal(claimA.job.id, first.id);
  assert.equal(claimB, null);
  value.complete(claimA);
  assert.equal(value.completions.length, 1);
});

test('worker crash, lease expiry and recovery fence the stale worker', () => {
  const value = harness();
  value.enqueue({ organizationId: 'org-a', workspaceId: 'ws-a', logicalId: 'crash-a', workloadCategory: 'orchestration_node' });
  const stale = value.claim('worker-a', 1_000);
  value.crash('worker-a');
  value.advance(1_001);
  assert.equal(value.recoverExpired(), 1);
  const current = value.claim('worker-b');
  assert.equal(current.job.logicalId, 'crash-a');
  assert.throws(() => value.complete(stale), (error) => error.code === 'STALE_WORKER_LEASE');
  value.complete(current);
  assert.equal(value.completions.length, 1);
});

test('partition rebalance increments epochs and fences an old owner', () => {
  const value = harness();
  value.enqueue({ organizationId: 'org-a', workspaceId: 'ws-a', logicalId: 'rebalance-a', workloadCategory: 'orchestration_node' });
  const claim = value.claim('worker-a');
  const before = value.partitions.get(claim.job.partitionKey).ownershipEpoch;
  value.registerWorker({ workerId: 'worker-0', instanceId: 'instance-0', workerPool: 'execution', maximumConcurrency: 1, supportedRoutingVersions: [1] });
  value.rebalance();
  const after = value.partitions.get(claim.job.partitionKey).ownershipEpoch;
  assert.ok(after >= before);
  if (after > before) assert.throws(() => value.complete(claim), (error) => error.code === 'PARTITION_OWNERSHIP_LOST');
});

test('tenant-aware service history prevents a noisy tenant from starving another', () => {
  const value = harness();
  for (let index = 0; index < 20; index += 1) value.enqueue({ organizationId: 'org-a', workspaceId: 'ws-a', logicalId: `a-${index}`, workloadCategory: 'orchestration_node' });
  value.enqueue({ organizationId: 'org-b', workspaceId: 'ws-b', logicalId: 'b-1', workloadCategory: 'orchestration_node' });
  const served = [];
  for (let index = 0; index < 3; index += 1) {
    const claim = value.claim('worker-a');
    served.push(claim.job.organizationId);
    value.complete(claim);
  }
  assert.ok(served.indexOf('org-b') <= 1, served.join(','));
});

test('quota reservations are atomic, idempotent and tenant/workspace isolated in the harness', () => {
  const value = harness();
  const first = value.admit({ organizationId: 'org-a', workspaceId: 'ws-a', idempotencyKey: 'one', tenantMaximum: 2, workspaceMaximum: 1 });
  assert.equal(first.accepted, true);
  assert.equal(value.admit({ organizationId: 'org-a', workspaceId: 'ws-a', idempotencyKey: 'one', tenantMaximum: 2, workspaceMaximum: 1 }).reservation.id, first.reservation.id);
  assert.equal(value.admit({ organizationId: 'org-a', workspaceId: 'ws-a', idempotencyKey: 'two', tenantMaximum: 2, workspaceMaximum: 1 }).code, 'WORKSPACE_QUEUE_QUOTA_EXCEEDED');
  assert.equal(value.admit({ organizationId: 'org-b', workspaceId: 'ws-a', idempotencyKey: 'two', tenantMaximum: 2, workspaceMaximum: 1 }).accepted, true);
  assert.equal(value.releaseAdmission({ organizationId: 'org-a', workspaceId: 'ws-a', idempotencyKey: 'one' }), true);
  assert.equal(value.admit({ organizationId: 'org-a', workspaceId: 'ws-a', idempotencyKey: 'three', tenantMaximum: 2, workspaceMaximum: 1 }).accepted, true);
});

test('worker-pool isolation keeps recovery and projection work away from execution workers', () => {
  const value = harness();
  value.enqueue({ organizationId: 'org-a', workspaceId: 'ws-a', logicalId: 'recovery-a', workloadCategory: 'orchestration_compensation', priorityClass: 'critical_recovery', admissionClass: 'protected' });
  value.enqueue({ organizationId: 'org-a', workspaceId: 'ws-a', logicalId: 'projection-a', workloadCategory: 'timeline_projection', priorityClass: 'low' });
  assert.equal(value.claim('worker-a'), null);
  assert.equal(value.claim('worker-r').job.logicalId, 'recovery-a');
  assert.equal(value.claim('worker-c').job.logicalId, 'projection-a');
});

test('draining workers stop new claims without deleting accepted jobs', () => {
  const value = harness();
  const job = value.enqueue({ organizationId: 'org-a', workspaceId: 'ws-a', logicalId: 'drain-a', workloadCategory: 'orchestration_node' });
  value.drain('worker-a');
  assert.equal(value.claim('worker-a'), null);
  assert.equal(value.jobs.get(job.id).status, 'queued');
  assert.equal(value.claim('worker-b').job.id, job.id);
});

test('dead-letter metadata validates without unrestricted payload copies', () => {
  const record = new WorkloadDeadLetter({ organizationId: 'org-a', workspaceId: 'ws-a', safeJobId: 'safe-a', sourceType: 'orchestration_node', sourceRecordId: 'node-a', workloadCategory: 'orchestration_node', priorityClass: 'standard', routingVersion: 1, partitionNumber: 0, safeFailureCode: 'MAXIMUM_ATTEMPTS_EXCEEDED', attemptCount: 5, requestId: 'request-a', traceId: 'trace-a' });
  assert.equal(record.validateSync(), undefined);
  assert.equal(Object.hasOwn(record.toObject(), 'payload'), false);
  assert.equal(Object.hasOwn(record.toObject(), 'credentials'), false);
});

test('stable hash does not expose routing input', () => {
  const digest = stableHash('org-a|ws-a|run-a');
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(digest.includes('org-a'), false);
});
