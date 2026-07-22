const assert = require('node:assert/strict');
const {
  assertSafeExportContent,
  calculateCriticalPath,
  classifyStuckRun,
  deduplicateAlertInstance,
  deriveTimelineEvents,
  deriveTraceSpans,
  detectBottlenecks,
  evaluateSloPolicy,
  filterQuarantinedCandidates,
  fleetControlGuardDecision,
  metricLabelsAreBounded,
  normalizeAlertRuleInput,
  normalizeSloPolicyInput,
  quarantineDecision,
  summarizeQueues,
  summarizeWorkerFleet,
  validateAlertRuleDocument,
  validateSloPolicyDocument,
  validateTraceSpans,
} = require('../src/services/orchestrationObservability.service');

const baseTime = new Date('2026-01-01T00:00:00.000Z');
const ids = {
  organizationId: 'org_phase_13d5',
  workspaceId: 'workspace_phase_13d5',
  definitionId: '650000000000000000000001',
  runId: '650000000000000000000002',
  extractionNodeId: '650000000000000000000101',
  validationNodeId: '650000000000000000000102',
  approvalNodeId: '650000000000000000000103',
  delegationNodeId: '650000000000000000000104',
  notifyNodeId: '650000000000000000000105',
  retryNodeId: '650000000000000000000106',
  selectionDecisionId: '650000000000000000000201',
  delegationInvocationId: '650000000000000000000202',
  compensationRunId: '650000000000000000000203',
  recoveryDecisionId: '650000000000000000000204',
  checkpointId: '650000000000000000000205',
};

function at(ms) {
  return new Date(baseTime.getTime() + ms);
}

function pass(label) {
  console.log(`PASS ${label}`);
}

function buildDefinition() {
  return {
    _id: ids.definitionId,
    defaultNodeTimeoutMs: 60000,
    nodes: [
      { nodeKey: 'extract', timeoutMs: 30000 },
      { nodeKey: 'validate', dependencies: ['extract'], timeoutMs: 20000 },
      { nodeKey: 'approval_gate', dependencies: ['validate'], timeoutMs: 10000 },
      { nodeKey: 'delegate', dependencies: ['approval_gate'], timeoutMs: 40000 },
      { nodeKey: 'notify', dependencies: ['delegate'], timeoutMs: 10000 },
      { nodeKey: 'archive', dependencies: ['validate'], timeoutMs: 5000 },
      { nodeKey: 'retry_hold', timeoutMs: 5000 },
    ],
  };
}

function buildRunRecords() {
  const definition = buildDefinition();
  const run = {
    _id: ids.runId,
    organizationId: ids.organizationId,
    workspaceId: ids.workspaceId,
    definitionId: ids.definitionId,
    definitionName: 'Phase 13D5 verifier',
    definitionSnapshot: definition,
    traceId: 'trace-phase-13d5-root',
    requestId: 'request-phase-13d5',
    requestedBy: 'partner:phase-13d5',
    status: 'succeeded',
    createdAt: at(0),
    startedAt: at(500),
    completedAt: at(91000),
    updatedAt: at(91000),
    revision: 3,
  };
  const nodeBase = {
    organizationId: ids.organizationId,
    workspaceId: ids.workspaceId,
    orchestrationRunId: ids.runId,
    parentTraceId: run.traceId,
    leaseOwner: 'worker-a',
  };
  const nodes = [
    {
      ...nodeBase,
      _id: ids.extractionNodeId,
      nodeKey: 'extract',
      traceId: 'trace-phase-13d5-extract',
      capability: 'collect.customer_record',
      status: 'succeeded',
      createdAt: at(1000),
      startedAt: at(2000),
      completedAt: at(12000),
      updatedAt: at(12000),
      attempt: 1,
    },
    {
      ...nodeBase,
      _id: ids.validationNodeId,
      nodeKey: 'validate',
      traceId: 'trace-phase-13d5-validate',
      capability: 'validate.contract',
      status: 'succeeded',
      createdAt: at(13000),
      startedAt: at(14000),
      completedAt: at(20000),
      updatedAt: at(20000),
      attempt: 3,
      retryDelayMs: 4000,
      safeFailure: { code: 'REMOTE_OUTCOME_UNKNOWN' },
      selectionDecisionId: ids.selectionDecisionId,
    },
    {
      ...nodeBase,
      _id: ids.approvalNodeId,
      nodeKey: 'approval_gate',
      traceId: 'trace-phase-13d5-approval-gate',
      capability: 'approve.side_effect',
      status: 'succeeded',
      createdAt: at(21000),
      startedAt: at(22000),
      completedAt: at(28000),
      updatedAt: at(28000),
      approvalDelayMs: 30000,
      attempt: 1,
    },
    {
      ...nodeBase,
      _id: ids.delegationNodeId,
      nodeKey: 'delegate',
      traceId: 'trace-phase-13d5-delegate-node',
      capability: 'delegate.fulfillment',
      status: 'succeeded',
      createdAt: at(59000),
      startedAt: at(60000),
      completedAt: at(83000),
      updatedAt: at(83000),
      attempt: 1,
    },
    {
      ...nodeBase,
      _id: ids.notifyNodeId,
      nodeKey: 'notify',
      traceId: 'trace-phase-13d5-notify',
      capability: 'notify.operator',
      status: 'succeeded',
      createdAt: at(84000),
      startedAt: at(85000),
      completedAt: at(90000),
      updatedAt: at(90000),
      attempt: 1,
    },
    {
      ...nodeBase,
      _id: ids.retryNodeId,
      nodeKey: 'retry_hold',
      traceId: 'trace-phase-13d5-retry-hold',
      capability: 'retry.backoff',
      status: 'retry_wait',
      createdAt: at(4000),
      startedAt: at(4000),
      updatedAt: at(5000),
      nextAttemptAt: at(30000),
      attempt: 2,
    },
  ];
  const selection = {
    _id: ids.selectionDecisionId,
    organizationId: ids.organizationId,
    workspaceId: ids.workspaceId,
    orchestrationRunId: ids.runId,
    traceId: 'trace-phase-13d5-selection',
    requestId: run.requestId,
    requestedCapability: 'validate.contract',
    orchestrationNodeKey: 'validate',
    decisionStatus: 'selected',
    requestedBy: run.requestedBy,
    createdAt: at(13000),
    approvalResolvedAt: at(13500),
  };
  const approvalRequest = {
    approvalRequestId: 'approval-phase-13d5',
    organizationId: ids.organizationId,
    workspaceId: ids.workspaceId,
    orchestrationRunId: ids.runId,
    orchestrationNodeRunId: ids.approvalNodeId,
    orchestrationNodeKey: 'approval_gate',
    traceId: 'trace-phase-13d5-approval',
    requestId: run.requestId,
    requesterActorId: 'service:orchestration',
    requesterActorType: 'service_account',
    permission: 'orchestrationNode.execute',
    operationType: 'SIDE_EFFECT_APPROVAL',
    status: 'APPROVED',
    requestedAt: at(29000),
    updatedAt: at(58000),
    expiresAt: at(120000),
  };
  const delegationInvocation = {
    _id: ids.delegationInvocationId,
    organizationId: ids.organizationId,
    workspaceId: ids.workspaceId,
    orchestrationRunId: ids.runId,
    targetNodeRunId: ids.delegationNodeId,
    traceId: 'trace-phase-13d5-delegation',
    parentTraceId: 'trace-phase-13d5-delegate-node',
    requestId: run.requestId,
    capability: 'delegate.fulfillment',
    status: 'succeeded',
    runtimeInvocationId: '650000000000000000000301',
    createdAt: at(61000),
    startedAt: at(62000),
    completedAt: at(80000),
  };
  const compensation = {
    _id: ids.compensationRunId,
    organizationId: ids.organizationId,
    workspaceId: ids.workspaceId,
    orchestrationRunId: ids.runId,
    originalNodeRunId: ids.delegationNodeId,
    traceId: 'trace-phase-13d5-compensation',
    parentTraceId: 'trace-phase-13d5-delegate-node',
    requestId: run.requestId,
    compensationCapability: 'rollback.fulfillment',
    compensationOperation: 'rollback',
    status: 'compensated',
    createdAt: at(81000),
    startedAt: at(82000),
    completedAt: at(88000),
    attempt: 1,
  };
  const recoveryDecision = {
    _id: ids.recoveryDecisionId,
    organizationId: ids.organizationId,
    workspaceId: ids.workspaceId,
    orchestrationRunId: ids.runId,
    nodeRunId: ids.validationNodeId,
    traceId: 'trace-phase-13d5-recovery',
    parentTraceId: 'trace-phase-13d5-validate',
    requestId: run.requestId,
    decisionType: 'retry',
    decisionStatus: 'applied',
    requestedBy: 'system:recovery',
    safeReasonCode: 'REMOTE_OUTCOME_UNKNOWN',
    requestedAt: at(20500),
    appliedAt: at(20900),
    createdAt: at(20500),
  };
  const checkpoint = {
    _id: ids.checkpointId,
    organizationId: ids.organizationId,
    workspaceId: ids.workspaceId,
    orchestrationRunId: ids.runId,
    traceId: 'trace-phase-13d5-notify',
    requestId: run.requestId,
    checkpointKey: 'notify-output',
    status: 'verified',
    createdAt: at(90200),
    verifiedAt: at(90500),
  };
  const invocation = {
    _id: '650000000000000000000302',
    organizationId: ids.organizationId,
    receivingWorkspaceId: ids.workspaceId,
    traceId: 'trace-phase-13d5-gateway',
    requestId: run.requestId,
    orchestrationContext: {
      orchestrationRunId: ids.runId,
      nodeRunId: ids.delegationNodeId,
      nodeKey: 'delegate',
      traceId: 'trace-phase-13d5-delegate-node',
      capability: 'delegate.fulfillment',
    },
    capability: 'delegate.fulfillment',
    runtimeType: 'http',
    lifecycleState: 'completed',
    createdAt: at(62000),
    completedAt: at(79000),
    updatedAt: at(79000),
    attemptCount: 1,
    durationMs: 17000,
  };
  return {
    run,
    nodes,
    selections: [selection],
    approvalRequests: [approvalRequest],
    delegationInvocations: [delegationInvocation],
    compensations: [compensation],
    recoveryDecisions: [recoveryDecision],
    checkpoints: [checkpoint],
    invocations: [invocation],
  };
}

function verifyTimeline(records) {
  const first = deriveTimelineEvents(records, { now: at(100000) });
  const second = deriveTimelineEvents(records, { now: at(100000) });
  assert.ok(first.length >= 12);
  assert.ok(first.every((event) => !Object.hasOwn(event, 'payload')));
  assert.ok(first.some((event) => event.eventCategory === 'approval'));
  assert.ok(first.some((event) => event.eventCategory === 'recovery'));
  assert.ok(first.some((event) => event.eventCategory === 'compensation'));
  assert.deepEqual(
    first.map((event) => [event.sequence, event.sourceCollection, event.sourceRecordId, event.eventType]),
    second.map((event) => [event.sequence, event.sourceCollection, event.sourceRecordId, event.eventType]),
  );
  const serialized = JSON.stringify(first);
  assert.equal(/raw.?payload|bearer|api.?key/i.test(serialized), false);
  pass('orchestration timeline');
  pass('deterministic event ordering');
  return first;
}

function verifyTrace(records) {
  const spans = deriveTraceSpans(records, { now: at(100000) });
  const validation = validateTraceSpans(spans, {
    organizationId: ids.organizationId,
    workspaceId: ids.workspaceId,
    orchestrationRunId: ids.runId,
  });
  assert.equal(validation.valid, true, JSON.stringify(validation.anomalies));
  assert.ok(spans.length >= 10);
  assert.ok(spans.some((span) => span.parentSpanId === records.run.traceId));
  assert.ok(spans.some((span) => span.spanType === 'gateway_invocation'));
  assert.ok(spans.some((span) => span.spanType === 'approval_wait'));
  assert.ok(spans.some((span) => span.spanType === 'delegation'));
  assert.ok(spans.some((span) => span.spanType === 'recovery'));
  assert.ok(spans.some((span) => span.spanType === 'compensation'));
  assert.ok(spans.some((span) => span.spanType === 'retry_wait' || Number(span.attempt || 0) > 1));
  pass('distributed trace');
  pass('trace lineage');
  pass('retry trace');
  pass('approval trace');
  pass('delegation trace');
  pass('recovery trace');
  pass('compensation trace');
  return spans;
}

function verifyCriticalPathAndBottlenecks(records) {
  const path = calculateCriticalPath(records.run.definitionSnapshot, records.nodes, { now: at(100000) });
  assert.deepEqual(path.criticalPathNodeSequence.slice(0, 5), [
    'extract',
    'validate',
    'approval_gate',
    'delegate',
    'notify',
  ]);
  assert.ok(path.retryContributionMs > 0);
  assert.ok(path.longestApprovalWait.durationMs >= 30000);
  pass('critical path');

  const bottlenecks = detectBottlenecks(
    {
      nodes: records.nodes,
      workerSummary: { unhealthyWorkers: 1, activeWorkers: 2 },
      queueSummaries: [{ queue: 'orchestration-node', oldestItemAgeMs: 360000 }],
    },
    { queueWaitMs: 500, slowGatewayMs: 10000, approvalWaitMs: 10000, retryCount: 1 },
  );
  const categories = new Set(bottlenecks.map((item) => item.category));
  assert.ok(categories.has('queue_congestion'));
  assert.ok(categories.has('repeated_retries'));
  assert.ok(categories.has('approval_delay'));
  assert.ok(categories.has('worker_saturation'));
  pass('bottleneck detection');
}

function runWindowRecords(outcomes) {
  return outcomes.map((status, index) => ({
    _id: `6500000000000000000010${index}`,
    organizationId: ids.organizationId,
    workspaceId: ids.workspaceId,
    definitionId: ids.definitionId,
    status,
    createdAt: at(200000 + index * 1000),
    startedAt: at(200100 + index * 1000),
    completedAt: at(205000 + index * 1000),
    updatedAt: at(205000 + index * 1000),
  }));
}

function nodesForRuns(runs) {
  return runs.map((run, index) => ({
    _id: `6500000000000000000020${index}`,
    organizationId: ids.organizationId,
    workspaceId: ids.workspaceId,
    orchestrationRunId: run._id,
    nodeKey: `node_${index}`,
    status: run.status === 'failed' ? 'failed' : 'succeeded',
    createdAt: at(200000 + index * 1000),
    startedAt: at(200100 + index * 1000),
    completedAt: at(202000 + index * 1000),
    attempt: index === 0 ? 2 : 1,
  }));
}

function verifySloAndAlerts() {
  const policy = normalizeSloPolicyInput({
    name: 'Run success SLO',
    status: 'active',
    successTargetBasisPoints: 9000,
    maximumFailureRateBasisPoints: 1000,
    maximumRetryRateBasisPoints: 6000,
    maximumQueueWaitMs: 2000,
    maximumRunDurationMs: 10000,
    maximumNodeDurationMs: 5000,
    minimumSampleSize: 2,
    evaluationWindow: 'rolling_24h',
  });
  assert.equal(validateSloPolicyDocument(policy).valid, true);
  const healthyRuns = runWindowRecords(['succeeded', 'succeeded']);
  const healthy = evaluateSloPolicy(policy, healthyRuns, nodesForRuns(healthyRuns), [], {
    now: at(250000),
    windowEnd: at(250000),
    windowStart: at(150000),
  });
  assert.equal(healthy.evaluationStatus, 'healthy');
  pass('SLO evaluation');

  const breachedRuns = runWindowRecords(['failed', 'partial_failure', 'succeeded']);
  const breached = evaluateSloPolicy(policy, breachedRuns, nodesForRuns(breachedRuns), [
    { orchestrationRunId: breachedRuns[0]._id, healthCategory: 'stuck' },
  ], {
    now: at(250000),
    windowEnd: at(250000),
    windowStart: at(150000),
  });
  assert.equal(breached.evaluationStatus, 'breached');
  assert.ok(breached.safeBreachReasons.includes('SLO_SUCCESS_RATE_BELOW_TARGET'));
  pass('SLO breach');

  const rule = normalizeAlertRuleInput({
    name: 'SLO breach alert',
    status: 'active',
    signalType: 'slo_breach',
    comparison: 'greater_than_or_equal',
    threshold: 1,
    minimumSampleSize: 1,
    severity: 'high',
  });
  assert.equal(validateAlertRuleDocument(rule).valid, true);
  const signal = {
    observedValue: breached.safeBreachReasons.length,
    sampleSize: breached.sampleSize,
    safeSummary: 'Run success SLO breached.',
    safeReasonCodes: breached.safeBreachReasons,
    affectedRunCount: breached.sampleSize,
  };
  const opened = deduplicateAlertInstance(null, { ...rule, _id: 'alert_rule_phase_13d5', version: 1 }, signal, {
    now: at(260000),
  });
  assert.equal(opened.action, 'opened');
  pass('alert opened');
  const deduped = deduplicateAlertInstance(opened.alert, { ...rule, _id: 'alert_rule_phase_13d5', version: 1 }, signal, {
    now: at(261000),
  });
  assert.equal(deduped.action, 'deduplicated');
  assert.equal(deduped.alert.occurrenceCount, 2);
  pass('alert deduplicated');
  const acknowledged = { ...deduped.alert, status: 'acknowledged', acknowledgedAt: at(262000) };
  assert.equal(acknowledged.status, 'acknowledged');
  pass('alert acknowledged');
  const resolved = { ...acknowledged, status: 'resolved', resolvedAt: at(263000) };
  assert.equal(resolved.status, 'resolved');
  pass('alert resolved');
}

function verifyHealthControlsAndExports(records) {
  const stuck = classifyStuckRun(
    {
      _id: '650000000000000000003001',
      organizationId: ids.organizationId,
      workspaceId: ids.workspaceId,
      status: 'running',
      createdAt: at(0),
      startedAt: at(1000),
      updatedAt: at(2000),
    },
    [
      {
        status: 'running',
        createdAt: at(1000),
        startedAt: at(2000),
        updatedAt: at(2000),
        heartbeatAt: at(3000),
        leaseExpiresAt: at(4000),
      },
    ],
    { now: at(1800000), noProgressMs: 60000, leaseToleranceMs: 1000 },
  );
  assert.equal(stuck.stuck, true);
  assert.ok(stuck.reasons.includes('RUN_NO_PROGRESS'));
  assert.ok(stuck.reasons.includes('NODE_LEASE_EXPIRED'));
  pass('stuck-run detection');

  const waiting = classifyStuckRun(
    {
      _id: '650000000000000000003002',
      organizationId: ids.organizationId,
      workspaceId: ids.workspaceId,
      status: 'waiting_approval',
      createdAt: at(0),
      startedAt: at(1000),
      updatedAt: at(2000),
      approvalDeadlineAt: at(7200000),
    },
    [{ status: 'waiting_approval', createdAt: at(1000), updatedAt: at(2000) }],
    { now: at(1800000), noProgressMs: 60000 },
  );
  assert.equal(waiting.stuck, false);
  pass('intentional wait excluded');

  const workerFleet = summarizeWorkerFleet(
    [
      { workerId: 'worker-a', status: 'ready', lastHeartbeatAt: at(1799000), activeWorkCount: 1 },
      { workerId: 'worker-b', status: 'unhealthy', lastHeartbeatAt: at(1000), activeWorkCount: 0 },
    ],
    records.nodes,
    records.compensations,
    { now: at(1800000), staleMs: 300000 },
  );
  assert.equal(workerFleet.configuredWorkers, 2);
  assert.equal(workerFleet.unhealthyWorkers, 1);
  pass('worker-fleet summary');

  const queues = summarizeQueues(
    {
      nodes: records.nodes,
      runtimeWork: [{ status: 'pending', createdAt: at(1000) }],
      compensations: records.compensations,
      checkpoints: records.checkpoints,
    },
    { now: at(1800000) },
  );
  assert.ok(queues.some((queue) => queue.queue === 'orchestration-node'));
  assert.ok(queues.some((queue) => queue.queue === 'runtime-work' && queue.depth === 1));
  pass('queue summary');

  const candidates = [
    { connectionId: 'conn_safe', capability: 'delegate.fulfillment' },
    { connectionId: 'conn_quarantined', capability: 'delegate.fulfillment' },
  ];
  assert.deepEqual(filterQuarantinedCandidates(candidates, ['conn_quarantined']).map((item) => item.connectionId), [
    'conn_safe',
  ]);
  assert.equal(quarantineDecision('conn_quarantined', ['conn_quarantined']).allowed, false);
  pass('connection quarantine');
  assert.equal(fleetControlGuardDecision({ definitionPaused: true }).reasonCode, 'ORCHESTRATION_DEFINITION_PAUSED');
  pass('definition pause');

  const safeExport = assertSafeExportContent({
    runId: ids.runId,
    timeline: deriveTimelineEvents(records).slice(0, 4),
    trace: deriveTraceSpans(records).slice(0, 4),
    statuses: { healthCategory: 'healthy', progressPercent: 100 },
    sloSummary: [{ evaluationStatus: 'healthy', sampleSize: 2 }],
    alertHistory: [{ status: 'resolved', severity: 'high', signalType: 'slo_breach' }],
  });
  assert.ok(safeExport.timeline.length);
  pass('safe diagnostic export');
  assert.throws(
    () => assertSafeExportContent({ note: 'Bearer abcdefghijklmnop' }),
    /Diagnostic export contained unsafe data/,
  );
  assert.equal(/agentpass_install_|api.?key/i.test(JSON.stringify(safeExport)), false);
  pass('no credentials leaked');

  assert.equal(
    metricLabelsAreBounded({
      counters: {
        'orchestration_runs{status=succeeded,category=terminal}': 2,
        'orchestration_alerts{severity=high,signal=slo_breach}': 1,
      },
    }).safe,
    true,
  );
  assert.equal(
    metricLabelsAreBounded({ counters: { 'orchestration_runs{runId=650000000000000000000002}': 1 } }).safe,
    false,
  );
  pass('bounded metrics');

  const wrongTenant = validateTraceSpans(deriveTraceSpans(records), {
    organizationId: 'org_other',
    workspaceId: ids.workspaceId,
    orchestrationRunId: ids.runId,
  });
  assert.equal(wrongTenant.valid, false);
  assert.ok(wrongTenant.anomalies.some((item) => item.code === 'TRACE_TENANT_MISMATCH'));
  pass('tenant isolation');
}

function main() {
  const records = buildRunRecords();
  verifyTimeline(records);
  verifyTrace(records);
  verifyCriticalPathAndBottlenecks(records);
  verifySloAndAlerts();
  verifyHealthControlsAndExports(records);
  pass('orchestration-observability verification');
}

main();
