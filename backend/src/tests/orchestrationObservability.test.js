const assert = require('node:assert/strict');
const test = require('node:test');

const OrchestrationDiagnosticExport = require('../models/OrchestrationDiagnosticExport');
const OrchestrationTimelineEvent = require('../models/OrchestrationTimelineEvent');
const OrchestrationTraceSpan = require('../models/OrchestrationTraceSpan');
const {
  assertSafeExportContent,
  calculateCriticalPath,
  classifyStuckRun,
  computeRunHealth,
  deduplicateAlertInstance,
  deriveTimelineEvents,
  deriveTraceSpans,
  detectBottlenecks,
  evaluateSloPolicy,
  filterQuarantinedCandidates,
  fleetControlGuardDecision,
  idempotencyDiagnostic,
  metricLabelsAreBounded,
  normalizeAlertRuleInput,
  normalizeSloPolicyInput,
  quarantineDecision,
  summarizeQueues,
  summarizeWorkerFleet,
  validateAlertRuleDocument,
  validateSloPolicyDocument,
  validateTraceSpans,
} = require('../services/orchestrationObservability.service');

const t0 = new Date('2026-02-01T00:00:00.000Z');
const at = (ms) => new Date(t0.getTime() + ms);
const objectId = (suffix) => `66d0000000000000000000${String(suffix).padStart(2, '0')}`;

function fixture() {
  const run = {
    _id: objectId(1),
    organizationId: 'org_obs_test',
    workspaceId: 'ws_obs_test',
    definitionId: objectId(2),
    definitionName: 'Observability unit',
    traceId: 'trace-obs-root',
    requestId: 'request-obs',
    requestedBy: 'partner:test',
    status: 'succeeded',
    createdAt: at(0),
    startedAt: at(500),
    completedAt: at(60000),
    updatedAt: at(60000),
    definitionSnapshot: {
      defaultNodeTimeoutMs: 10000,
      nodes: [
        { nodeKey: 'a', timeoutMs: 10000 },
        { nodeKey: 'b', dependencies: ['a'], timeoutMs: 10000 },
        { nodeKey: 'c', dependencies: ['b'], timeoutMs: 10000 },
      ],
    },
  };
  const nodeBase = {
    organizationId: run.organizationId,
    workspaceId: run.workspaceId,
    orchestrationRunId: run._id,
    parentTraceId: run.traceId,
  };
  const nodes = [
    {
      ...nodeBase,
      _id: objectId(10),
      nodeKey: 'a',
      traceId: 'trace-obs-a',
      status: 'succeeded',
      capability: 'capability.a',
      createdAt: at(1000),
      startedAt: at(2000),
      completedAt: at(12000),
      updatedAt: at(12000),
      attempt: 1,
      leaseOwner: 'worker-a',
    },
    {
      ...nodeBase,
      _id: objectId(11),
      nodeKey: 'b',
      traceId: 'trace-obs-b',
      status: 'succeeded',
      capability: 'capability.b',
      createdAt: at(13000),
      startedAt: at(14000),
      completedAt: at(25000),
      updatedAt: at(25000),
      attempt: 2,
      retryDelayMs: 3000,
      approvalDelayMs: 5000,
      leaseOwner: 'worker-a',
    },
    {
      ...nodeBase,
      _id: objectId(12),
      nodeKey: 'c',
      traceId: 'trace-obs-c',
      status: 'succeeded',
      capability: 'capability.c',
      createdAt: at(26000),
      startedAt: at(27000),
      completedAt: at(58000),
      updatedAt: at(58000),
      compensationDelayMs: 3000,
      leaseOwner: 'worker-b',
    },
  ];
  return {
    run,
    nodes,
    selections: [
      {
        _id: objectId(20),
        organizationId: run.organizationId,
        workspaceId: run.workspaceId,
        orchestrationRunId: run._id,
        requestedCapability: 'capability.b',
        orchestrationNodeKey: 'b',
        decisionStatus: 'selected',
        traceId: 'trace-obs-selection',
        requestId: run.requestId,
        createdAt: at(13000),
      },
    ],
    approvalRequests: [
      {
        approvalRequestId: 'approval-obs',
        organizationId: run.organizationId,
        workspaceId: run.workspaceId,
        orchestrationRunId: run._id,
        orchestrationNodeRunId: objectId(11),
        orchestrationNodeKey: 'b',
        traceId: 'trace-obs-approval',
        requestId: run.requestId,
        requesterActorId: 'service:test',
        requesterActorType: 'service_account',
        operationType: 'APPROVE_NODE',
        status: 'APPROVED',
        requestedAt: at(15000),
        updatedAt: at(19000),
        expiresAt: at(120000),
      },
    ],
    delegationInvocations: [
      {
        _id: objectId(21),
        organizationId: run.organizationId,
        workspaceId: run.workspaceId,
        orchestrationRunId: run._id,
        targetNodeRunId: objectId(12),
        traceId: 'trace-obs-delegation',
        parentTraceId: 'trace-obs-c',
        capability: 'capability.c',
        status: 'succeeded',
        createdAt: at(30000),
        startedAt: at(31000),
        completedAt: at(45000),
      },
    ],
    recoveryDecisions: [
      {
        _id: objectId(22),
        organizationId: run.organizationId,
        workspaceId: run.workspaceId,
        orchestrationRunId: run._id,
        nodeRunId: objectId(11),
        traceId: 'trace-obs-recovery',
        parentTraceId: 'trace-obs-b',
        decisionType: 'retry',
        decisionStatus: 'applied',
        requestedBy: 'system:recovery',
        safeReasonCode: 'REMOTE_OUTCOME_UNKNOWN',
        requestedAt: at(20000),
        appliedAt: at(21000),
        createdAt: at(20000),
      },
    ],
    compensations: [
      {
        _id: objectId(23),
        organizationId: run.organizationId,
        workspaceId: run.workspaceId,
        orchestrationRunId: run._id,
        originalNodeRunId: objectId(12),
        traceId: 'trace-obs-compensation',
        parentTraceId: 'trace-obs-c',
        compensationOperation: 'rollback',
        compensationCapability: 'capability.rollback',
        status: 'compensated',
        createdAt: at(50000),
        startedAt: at(51000),
        completedAt: at(56000),
      },
    ],
    checkpoints: [
      {
        _id: objectId(24),
        organizationId: run.organizationId,
        workspaceId: run.workspaceId,
        orchestrationRunId: run._id,
        checkpointKey: 'final',
        status: 'verified',
        traceId: 'trace-obs-c',
        createdAt: at(58000),
        verifiedAt: at(59000),
      },
    ],
  };
}

test('timeline projection is deterministic, safe and includes orchestration observability categories', () => {
  const records = fixture();
  const first = deriveTimelineEvents(records, { now: at(70000) });
  const second = deriveTimelineEvents(records, { now: at(70000) });
  assert.deepEqual(
    first.map((event) => [event.sequence, event.eventCategory, event.sourceCollection, event.sourceRecordId]),
    second.map((event) => [event.sequence, event.eventCategory, event.sourceCollection, event.sourceRecordId]),
  );
  assert.equal(first[0].eventType, 'orchestration.run.created');
  assert.ok(first.some((event) => event.eventCategory === 'approval'));
  assert.ok(first.some((event) => event.eventCategory === 'delegation'));
  assert.ok(first.some((event) => event.eventCategory === 'recovery'));
  assert.ok(first.some((event) => event.eventCategory === 'compensation'));
  assert.equal(/raw.?payload|bearer|api.?key/i.test(JSON.stringify(first)), false);
});

test('trace projection validates lineage and detects tenant, parent and cycle anomalies', () => {
  const records = fixture();
  const spans = deriveTraceSpans(records);
  const validation = validateTraceSpans(spans, {
    organizationId: records.run.organizationId,
    workspaceId: records.run.workspaceId,
    orchestrationRunId: records.run._id,
  });
  assert.equal(validation.valid, true, JSON.stringify(validation.anomalies));
  assert.ok(spans.some((span) => span.spanType === 'approval_wait'));
  assert.ok(spans.some((span) => span.spanType === 'recovery'));
  assert.ok(spans.some((span) => span.spanType === 'compensation'));

  const missingParent = spans.map((span) =>
    span.spanType === 'delegation' ? { ...span, parentSpanId: 'trace-missing-parent' } : span,
  );
  assert.ok(validateTraceSpans(missingParent).anomalies.some((item) => item.code === 'TRACE_PARENT_MISSING'));

  const wrongTenant = spans.map((span, index) =>
    index === 1 ? { ...span, organizationId: 'org_other' } : span,
  );
  assert.ok(validateTraceSpans(wrongTenant, { organizationId: records.run.organizationId }).anomalies.some((item) => item.code === 'TRACE_TENANT_MISMATCH'));

  const cycle = [
    spans[0],
    { ...spans[1], spanId: 'trace-cycle-a', parentSpanId: 'trace-cycle-b' },
    { ...spans[2], spanId: 'trace-cycle-b', parentSpanId: 'trace-cycle-a' },
  ];
  assert.ok(validateTraceSpans(cycle).anomalies.some((item) => item.code === 'TRACE_CYCLE_DETECTED'));
});

test('health, stuck detection and critical path account for retries, waits and intentional waits', () => {
  const records = fixture();
  const criticalPath = calculateCriticalPath(records.run.definitionSnapshot, records.nodes, { now: at(70000) });
  assert.deepEqual(criticalPath.criticalPathNodeSequence, ['a', 'b', 'c']);
  assert.ok(criticalPath.retryContributionMs > 0);
  assert.ok(criticalPath.compensationContributionMs > 0);

  const health = computeRunHealth(records.run, records.nodes, { now: at(70000) });
  assert.equal(health.healthCategory, 'terminal');
  assert.equal(health.progressPercent, 100);

  const stuck = classifyStuckRun(
    { status: 'running', createdAt: at(0), startedAt: at(1000), updatedAt: at(2000) },
    [{ status: 'running', updatedAt: at(2000), heartbeatAt: at(2000), leaseExpiresAt: at(3000) }],
    { now: at(900000), noProgressMs: 60000, leaseToleranceMs: 1000 },
  );
  assert.equal(stuck.stuck, true);
  assert.ok(stuck.reasons.includes('RUN_NO_PROGRESS'));
  assert.ok(stuck.reasons.includes('NODE_LEASE_EXPIRED'));

  const waiting = classifyStuckRun(
    { status: 'waiting_approval', updatedAt: at(2000), approvalDeadlineAt: at(3600000) },
    [{ status: 'waiting_approval', updatedAt: at(2000) }],
    { now: at(900000), noProgressMs: 60000 },
  );
  assert.equal(waiting.stuck, false);
});

test('bottlenecks, queues and workers summarize safe operational signals', () => {
  const records = fixture();
  const bottlenecks = detectBottlenecks(
    {
      nodes: records.nodes,
      workerSummary: { unhealthyWorkers: 1, activeWorkers: 2 },
      queueSummaries: [{ queue: 'orchestration-node', oldestItemAgeMs: 120000 }],
    },
    { queueWaitMs: 500, slowGatewayMs: 10000, approvalWaitMs: 1000, retryCount: 1 },
  );
  const categories = new Set(bottlenecks.map((item) => item.category));
  assert.ok(categories.has('queue_congestion'));
  assert.ok(categories.has('slow_runtime_gateway_invocation'));
  assert.ok(categories.has('repeated_retries'));
  assert.ok(categories.has('worker_saturation'));

  const workers = summarizeWorkerFleet(
    [
      { status: 'ready', lastHeartbeatAt: at(890000), activeWorkCount: 1 },
      { status: 'unhealthy', lastHeartbeatAt: at(0), activeWorkCount: 0 },
    ],
    records.nodes,
    records.compensations,
    { now: at(900000), staleMs: 300000 },
  );
  assert.equal(workers.configuredWorkers, 2);
  assert.equal(workers.unhealthyWorkers, 1);
  assert.equal(workers.claimedNodeCount, 3);

  const queues = summarizeQueues({ nodes: records.nodes, runtimeWork: [{ status: 'pending', createdAt: at(0) }] }, { now: at(900000) });
  assert.ok(queues.some((queue) => queue.queue === 'runtime-work' && queue.depth === 1));
});

test('SLO policies, evaluations and alert deduplication use bounded safe fields', () => {
  const policy = normalizeSloPolicyInput({
    name: 'Observable success',
    status: 'active',
    successTargetBasisPoints: 9000,
    maximumFailureRateBasisPoints: 1000,
    maximumRetryRateBasisPoints: 5000,
    maximumQueueWaitMs: 2000,
    maximumRunDurationMs: 10000,
    maximumNodeDurationMs: 5000,
    minimumSampleSize: 2,
  });
  assert.equal(validateSloPolicyDocument(policy).valid, true);
  const runs = ['succeeded', 'failed', 'partial_failure'].map((status, index) => ({
    _id: objectId(40 + index),
    definitionId: objectId(2),
    status,
    createdAt: at(100000 + index * 1000),
    startedAt: at(100100 + index * 1000),
    completedAt: at(104000 + index * 1000),
    updatedAt: at(104000 + index * 1000),
  }));
  const nodes = runs.map((run, index) => ({
    _id: objectId(50 + index),
    orchestrationRunId: run._id,
    status: run.status === 'failed' ? 'failed' : 'succeeded',
    createdAt: at(100000 + index * 1000),
    startedAt: at(100500 + index * 1000),
    completedAt: at(102000 + index * 1000),
    attempt: index === 0 ? 2 : 1,
  }));
  const evaluation = evaluateSloPolicy(policy, runs, nodes, [], {
    now: at(200000),
    windowEnd: at(200000),
    windowStart: at(90000),
  });
  assert.equal(evaluation.evaluationStatus, 'breached');
  assert.ok(evaluation.safeBreachReasons.includes('SLO_SUCCESS_RATE_BELOW_TARGET'));

  const rule = normalizeAlertRuleInput({
    name: 'Breach alert',
    status: 'active',
    signalType: 'slo_breach',
    threshold: 1,
    comparison: 'greater_than_or_equal',
    severity: 'high',
  });
  assert.equal(validateAlertRuleDocument(rule).valid, true);
  const opened = deduplicateAlertInstance(null, { ...rule, _id: objectId(70), version: 1 }, { observedValue: 2, safeReasonCodes: evaluation.safeBreachReasons }, { now: at(210000) });
  const deduped = deduplicateAlertInstance(opened.alert, { ...rule, _id: objectId(70), version: 1 }, { observedValue: 2, safeReasonCodes: evaluation.safeBreachReasons }, { now: at(211000) });
  assert.equal(opened.action, 'opened');
  assert.equal(deduped.action, 'deduplicated');
  assert.equal(deduped.alert.occurrenceCount, 2);
});

test('fleet controls, diagnostic exports, idempotency and metric labels enforce safe operations', () => {
  assert.equal(quarantineDecision('conn_b', ['conn_b']).allowed, false);
  assert.deepEqual(filterQuarantinedCandidates([{ connectionId: 'conn_a' }, { connectionId: 'conn_b' }], ['conn_b']).map((item) => item.connectionId), ['conn_a']);
  assert.equal(fleetControlGuardDecision({ workspacePaused: true }).reasonCode, 'ORCHESTRATION_WORKSPACE_PAUSED');
  assert.equal(fleetControlGuardDecision({}).allowed, true);

  const safe = assertSafeExportContent({ timeline: [{ eventType: 'orchestration.run.created' }], statuses: { healthCategory: 'healthy' } });
  assert.equal(safe.statuses.healthCategory, 'healthy');
  assert.throws(() => assertSafeExportContent({ note: 'Bearer abcdefghijklmnop' }), /Diagnostic export contained unsafe data/);

  assert.equal(idempotencyDiagnostic({ idempotencyReplayed: true }).category, 'idempotent_replay');
  assert.equal(idempotencyDiagnostic({ outcomeUnknown: true }).category, 'outcome_unknown');
  assert.equal(metricLabelsAreBounded({ counters: { 'orchestration_runs{status=succeeded,category=terminal}': 1 } }).safe, true);
  assert.equal(metricLabelsAreBounded({ counters: { 'orchestration_runs{runId=abc}': 1 } }).safe, false);
});

test('observability models expose indexes and never store raw diagnostic content', () => {
  assert.ok(OrchestrationTimelineEvent.schema.path('recoveryDecisionId'));
  assert.ok(OrchestrationTraceSpan.schema.path('approvalRequestId'));
  assert.ok(OrchestrationTraceSpan.schema.path('recoveryDecisionId'));
  assert.equal(Boolean(OrchestrationDiagnosticExport.schema.path('content')), false);
  const traceIndexes = OrchestrationTraceSpan.schema.indexes().map(([fields, options]) => ({ fields, options }));
  assert.ok(traceIndexes.some((index) => index.options?.unique && index.options?.name === 'unique_tenant_trace_span'));
  const timelineIndexes = OrchestrationTimelineEvent.schema.indexes().map(([fields, options]) => ({ fields, options }));
  assert.ok(timelineIndexes.some((index) => index.options?.unique && index.options?.name === 'unique_tenant_timeline_source_event'));
});
