const assert = require('node:assert/strict');
const test = require('node:test');
const Invocation = require('../models/Invocation');
const AuditLog = require('../models/AuditLog');
const OperationalAlert = require('../models/OperationalAlert');
const PassportConnection = require('../models/PassportConnection');
const PassportInstallKey = require('../models/PassportInstallKey');
const DurableEventOutbox = require('../models/DurableEventOutbox');
const durableWork = require('../services/durableWork.service');
const {
  parseWindow,
  rate,
  percentile,
  latencyStatistics,
  invocationSummary,
  invocationControlSummary,
  safeFailure,
  alertAuditSignals,
  alertRulesFromSignals,
  durableAlertSignals,
  syncOperationalAlerts,
  getLatency,
  getErrors,
  getPassportFunnel,
  listAlerts,
  acknowledgeAlert,
} = require('../services/operationsService');
const { stageMetricCollector } = require('../services/runtimeGateway.service');
const { OPERATION_STAGE_NAMES, MAX_INVOCATION_STAGE_METRICS } = require('../constants/operations');
const { env } = require('../config/env');

function chainResult(value) {
  const chain = {
    select() {
      return chain;
    },
    sort() {
      return chain;
    },
    skip() {
      return chain;
    },
    limit() {
      return chain;
    },
    lean: async () => value,
  };
  return chain;
}

test('operations windows are fixed and reject arbitrary ranges', () => {
  const now = new Date('2026-07-13T12:00:00.000Z');
  for (const key of ['1h', '24h', '7d', '30d']) {
    const parsed = parseWindow(key, now);
    assert.equal(parsed.key, key);
    assert.equal(parsed.until.toISOString(), now.toISOString());
    assert.ok(parsed.since < parsed.until);
  }
  assert.throws(
    () => parseWindow('2h', now),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.details[0].path, 'window');
      return true;
    },
  );
});

test('latency statistics use deterministic linear-interpolated percentiles and handle zero data', () => {
  assert.equal(rate(7, 10), 70);
  assert.equal(rate(0, 0), 0);
  assert.equal(percentile([10, 20, 30, 40], 0.5), 25);
  assert.equal(percentile([10, 20, 30, 40], 0.95), 38.5);
  assert.deepEqual(latencyStatistics([]), {
    count: 0,
    averageMs: null,
    minMs: null,
    maxMs: null,
    p50Ms: null,
    p95Ms: null,
    p99Ms: null,
  });
  const stats = latencyStatistics([40, 10, 30, 20]);
  assert.equal(stats.averageMs, 25);
  assert.equal(stats.minMs, 10);
  assert.equal(stats.maxMs, 40);
  assert.equal(stats.p99Ms, 39.7);
});

test('persisted invocation stage metrics are allow-listed, bounded, and contain no payload fields', () => {
  const metrics = [];
  const collect = stageMetricCollector(metrics);
  collect({ stage: 'request_validation', status: 'completed', durationMs: 4, token: 'secret' });
  for (let index = 0; index < MAX_INVOCATION_STAGE_METRICS + 5; index += 1) {
    collect({
      stage: OPERATION_STAGE_NAMES[index % OPERATION_STAGE_NAMES.length],
      status: 'completed',
      durationMs: index + 0.123,
      input: { apiKey: 'must-not-persist' },
    });
  }
  assert.equal(metrics.length, MAX_INVOCATION_STAGE_METRICS);
  assert.ok(metrics.every((metric) => OPERATION_STAGE_NAMES.includes(metric.stage)));
  assert.ok(
    metrics.every((metric) => Object.keys(metric).sort().join(',') === 'durationMs,stage,status'),
  );
  assert.doesNotMatch(JSON.stringify(metrics), /secret|apiKey|must-not-persist/);
});

test('operational alert rules are deterministic and expose only safe aggregate values', () => {
  const signals = {
    readiness: { status: 'not_ready', database: 'unavailable', runtimeConfiguration: 'valid' },
    invocations: {
      total: 100,
      successful: 0,
      failed: 98,
      recoveryRequired: 2,
      failureRatePercent: 100,
      attempts: { repeatedTransientFailures: 1 },
    },
    connections: { active: 2, health: { healthy: 0, unhealthy: 2, unknown: 0 } },
    errors: { credentialFailures: 1, providerErrors: 10 },
    audit: { authFailures: 10 },
    latency: { p95Ms: 999999 },
    funnel: {
      totals: { resolutionAttempts: 10, resolutionFailures: 8, resolutionSuccessRatePercent: 20 },
    },
  };
  const first = alertRulesFromSignals(signals);
  const second = alertRulesFromSignals(signals);
  assert.deepEqual(first, second);
  assert.ok(
    first.some((rule) => rule.type === 'gateway_not_ready' && rule.severity === 'critical'),
  );
  assert.ok(first.some((rule) => rule.type === 'high_p95_latency' && rule.severity === 'warning'));
  assert.ok(
    first.some(
      (rule) => rule.type === 'invocations_recovery_required' && rule.severity === 'critical',
    ),
  );
  assert.ok(first.some((rule) => rule.type === 'repeated_transient_invocation_failures'));
  assert.doesNotMatch(JSON.stringify(first), /payload|bearer\s|api[_-]?key|runtimeEndpoint/i);
});

test('durable queue and worker alerts cover bounded critical, warning and information conditions', () => {
  const signals = {
    readiness: { status: 'ready', database: 'connected', runtimeConfiguration: 'valid' },
    invocations: {
      total: 0,
      successful: 0,
      failed: 0,
      recoveryRequired: 0,
      failureRatePercent: 0,
      attempts: {},
    },
    connections: {
      active: 0,
      health: { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 },
    },
    errors: { credentialFailures: 0, providerErrors: 0, timeoutFailures: 0 },
    audit: { stuckByConnection: [] },
    latency: { p95Ms: null },
    funnel: {
      totals: {
        resolutionAttempts: 0,
        resolutionFailures: 0,
        resolutionSuccessRatePercent: 0,
        reusedKeyRejections: 0,
      },
    },
    protection: {
      circuits: { open: 0, halfOpen: 0 },
      rateLimitedConnections: 0,
      capacity: {
        activeInvocations: env.RUNTIME_MAX_CONCURRENT_PER_WORKSPACE,
        activeSlots: env.RUNTIME_MAX_CONCURRENT_PER_WORKSPACE,
        rejections: 3,
      },
      service: { phase: 'ready', draining: false },
    },
    durable: {
      queue: {
        counts: {
          pending: 1,
          retry_scheduled: Math.max(3, env.DURABLE_WORKER_BATCH_SIZE),
          recovery_required: 1,
          dead_lettered: 1,
        },
        dueExecutableCount: 1 + Math.max(3, env.DURABLE_WORKER_BATCH_SIZE),
        abandonedLeaseCount: env.OPS_ALERT_LEASE_EXPIRY_COUNT,
        oldestPendingAgeMs: Math.max(60_000, env.DURABLE_WORK_LEASE_MS),
      },
      workers: { activeWorkers: 0, readyWorkers: 0, drainingWorkers: 0, staleWorkers: 1 },
      events: {
        remoteExecutionLeaseLoss: env.OPS_ALERT_LEASE_EXPIRY_COUNT,
        finalizationConsistencyFailure: 1,
        reconciliationCreated: env.OPS_ALERT_RECOVERY_GROWTH_COUNT,
        abandonedPreTransmissionRecovered: 1,
        scheduledRetryCompleted: 1,
      },
    },
  };
  const rules = alertRulesFromSignals(signals);
  const byType = new Map(rules.map((rule) => [rule.type, rule]));
  for (const type of [
    'durable_work_no_healthy_worker',
    'durable_work_abandoned_leases_high',
    'durable_remote_execution_lease_loss',
    'durable_work_dead_letter_backlog',
    'durable_work_finalization_consistency_failure',
  ]) {
    assert.equal(byType.get(type)?.severity, 'critical', type);
  }
  for (const type of [
    'durable_work_oldest_pending_high',
    'durable_worker_heartbeat_stale',
    'durable_retry_backlog_elevated',
    'durable_reconciliation_repeatedly_created_work',
    'runtime_capacity_continuously_saturated',
  ]) {
    assert.equal(byType.get(type)?.severity, 'warning', type);
  }
  assert.equal(byType.get('durable_abandoned_work_safely_recovered')?.severity, 'info');
  assert.equal(byType.get('durable_scheduled_retry_completed')?.severity, 'info');
  assert.doesNotMatch(
    JSON.stringify(rules),
    /private prompt|private output|secret value|leaseToken|workerId|runtimeEndpoint|https?:\/\//i,
  );
});

test('a draining-only worker fleet is not treated as able to claim pending work', () => {
  const rules = alertRulesFromSignals({
    readiness: { status: 'ready', database: 'connected', runtimeConfiguration: 'valid' },
    invocations: { total: 0, failed: 0, recoveryRequired: 0, failureRatePercent: 0, attempts: {} },
    connections: { active: 0, health: { healthy: 0, unhealthy: 0 } },
    errors: { credentialFailures: 0, providerErrors: 0, timeoutFailures: 0 },
    audit: { stuckByConnection: [] },
    latency: { p95Ms: null },
    funnel: { totals: {} },
    protection: {
      circuits: { open: 0, halfOpen: 0 },
      rateLimitedConnections: 0,
      service: { phase: 'ready', draining: false },
      capacity: { activeInvocations: 0, activeSlots: 0, rejections: 0 },
    },
    durable: {
      queue: { counts: { pending: 1 }, dueExecutableCount: 1 },
      workers: { activeWorkers: 1, readyWorkers: 0, drainingWorkers: 1, staleWorkers: 0 },
      events: {},
    },
  });
  const types = new Set(rules.map((rule) => rule.type));
  assert.equal(types.has('durable_work_no_healthy_worker'), true);
  assert.equal(types.has('durable_worker_available'), false);
  assert.equal(types.has('durable_worker_draining'), true);
});

test('future scheduled retries do not trigger a no-worker alert before they are due', () => {
  const rules = alertRulesFromSignals({
    readiness: { status: 'ready', database: 'connected', runtimeConfiguration: 'valid' },
    invocations: { total: 0, failed: 0, recoveryRequired: 0, failureRatePercent: 0, attempts: {} },
    connections: { active: 0, health: { healthy: 0, unhealthy: 0 } },
    errors: { credentialFailures: 0, providerErrors: 0, timeoutFailures: 0 },
    audit: { stuckByConnection: [] },
    latency: { p95Ms: null },
    funnel: { totals: {} },
    protection: {
      circuits: { open: 0, halfOpen: 0 },
      rateLimitedConnections: 0,
      service: { phase: 'ready', draining: false },
      capacity: { activeInvocations: 0, activeSlots: 0, rejections: 0 },
    },
    durable: {
      queue: { counts: { retry_scheduled: 4 }, dueExecutableCount: 0 },
      workers: { activeWorkers: 0, readyWorkers: 0, drainingWorkers: 0, staleWorkers: 0 },
      events: {},
    },
  });

  assert.equal(
    rules.some((rule) => rule.type === 'durable_work_no_healthy_worker'),
    false,
  );
});

test('durable alert signals query only the authenticated partner and workspace', async () => {
  const originalMetrics = durableWork.durableWorkMetrics;
  const originalWorkers = durableWork.aggregateWorkerHealth;
  const originalAggregate = DurableEventOutbox.aggregate;
  const partnerId = '64b000000000000000000001';
  let metricsInput;
  let pipeline;
  try {
    durableWork.durableWorkMetrics = async (input) => {
      metricsInput = input;
      return {
        counts: { pending: 1 },
        dueExecutableCount: 1,
        abandonedLeaseCount: 0,
        oldestPendingAgeMs: 0,
      };
    };
    durableWork.aggregateWorkerHealth = async () => ({
      status: 'healthy',
      activeWorkers: 1,
      readyWorkers: 1,
      drainingWorkers: 0,
      staleWorkers: 0,
    });
    DurableEventOutbox.aggregate = async (value) => {
      pipeline = value;
      return [{ reconciliationCreated: 1, scheduledRetryCompleted: 1 }];
    };
    const window = parseWindow('24h', new Date('2030-01-01T00:00:00Z'));
    const result = await durableAlertSignals('workspace-a', window, {
      partner: { _id: partnerId },
    });
    assert.deepEqual(metricsInput, { partnerId, receivingWorkspaceId: 'workspace-a' });
    assert.equal(String(pipeline[0].$match.partnerId), partnerId);
    assert.equal(pipeline[0].$match.receivingWorkspaceId, 'workspace-a');
    assert.deepEqual(pipeline[0].$match.createdAt, { $gte: window.since });
    assert.equal(result.workers.activeWorkers, 1);
    assert.equal(result.events.reconciliationCreated, 1);
    assert.equal(result.events.scheduledRetryCompleted, 1);
  } finally {
    durableWork.durableWorkMetrics = originalMetrics;
    durableWork.aggregateWorkerHealth = originalWorkers;
    DurableEventOutbox.aggregate = originalAggregate;
  }
});

test('repeated-stuck alerts are evaluated independently for each safe connection scope', () => {
  const signals = {
    readiness: { status: 'ready', database: 'connected', runtimeConfiguration: 'valid' },
    invocations: {
      total: 0,
      successful: 0,
      failed: 0,
      recoveryRequired: 0,
      failureRatePercent: 0,
      attempts: {},
    },
    connections: {
      active: 0,
      health: { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 },
    },
    errors: { credentialFailures: 0, providerErrors: 0, timeoutFailures: 0 },
    audit: {
      stuckByConnection: [
        { connectionId: 'connection-below', count: env.OPS_ALERT_STUCK_INVOCATION_COUNT - 1 },
        { connectionId: 'connection-over', count: env.OPS_ALERT_STUCK_INVOCATION_COUNT },
      ],
    },
    latency: { p95Ms: null },
    funnel: {
      totals: {
        resolutionAttempts: 0,
        resolutionFailures: 0,
        resolutionSuccessRatePercent: 0,
        reusedKeyRejections: 0,
      },
    },
  };

  const stuckRules = alertRulesFromSignals(signals).filter(
    (rule) => rule.type === 'repeated_stuck_invocations',
  );
  assert.equal(stuckRules.length, 1);
  assert.equal(stuckRules[0].scopeKey, 'connection-over');
  assert.deepEqual(stuckRules[0].safeValues, {
    connectionId: 'connection-over',
    count: env.OPS_ALERT_STUCK_INVOCATION_COUNT,
  });
});

test('runtime recovery ambiguity contributes to the critical ambiguous-outcome alert', () => {
  const signals = {
    readiness: { status: 'ready', database: 'connected', runtimeConfiguration: 'valid' },
    invocations: {
      total: 0,
      successful: 0,
      failed: 0,
      recoveryRequired: 0,
      failureRatePercent: 0,
      attempts: {},
    },
    connections: {
      active: 0,
      health: { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 },
    },
    errors: { credentialFailures: 0, providerErrors: 0, timeoutFailures: 0 },
    audit: {
      ambiguousRemoteOutcomes: env.OPS_ALERT_AMBIGUOUS_OUTCOME_COUNT,
      cancellationOutcomeUnknown: 0,
      stuckByConnection: [],
    },
    latency: { p95Ms: null },
    funnel: {
      totals: {
        resolutionAttempts: 0,
        resolutionFailures: 0,
        resolutionSuccessRatePercent: 0,
        reusedKeyRejections: 0,
      },
    },
  };

  const alert = alertRulesFromSignals(signals).find(
    (rule) => rule.type === 'high_ambiguous_remote_outcomes',
  );
  assert.equal(alert.severity, 'critical');
  assert.equal(alert.safeValues.count, env.OPS_ALERT_AMBIGUOUS_OUTCOME_COUNT);
});

test('ambiguous-outcome aggregation includes runtime and response-persistence recovery reasons', async () => {
  const originalAggregate = AuditLog.aggregate;
  let pipeline;
  try {
    AuditLog.aggregate = async (value) => {
      pipeline = value;
      return [{ totals: [], stuckByConnection: [], ambiguousInvocations: [] }];
    };
    await alertAuditSignals(
      'workspace-a',
      ['connection-a'],
      parseWindow('24h', new Date('2026-07-13T12:00:00Z')),
    );
    const reasons =
      pipeline[1].$facet.ambiguousInvocations[0].$match.$or[1]['metadata.reasonCode'].$in;
    assert.ok(reasons.includes('AMBIGUOUS_REMOTE_OUTCOME'));
    assert.ok(reasons.includes('RESPONSE_PERSISTENCE_UNCERTAIN'));
  } finally {
    AuditLog.aggregate = originalAggregate;
  }
});

test('resolved stuck work emits a distinct tenant-safe information alert', () => {
  const signals = {
    readiness: { status: 'ready', database: 'connected', runtimeConfiguration: 'valid' },
    invocations: {
      total: 0,
      successful: 0,
      failed: 0,
      recoveryRequired: 0,
      failureRatePercent: 0,
      attempts: {},
    },
    connections: {
      active: 0,
      health: { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 },
    },
    errors: { credentialFailures: 0, providerErrors: 0, timeoutFailures: 0 },
    audit: { recoveryResolved: 1, stuckResolved: 1, stuckByConnection: [] },
    latency: { p95Ms: null },
    funnel: {
      totals: {
        resolutionAttempts: 0,
        resolutionFailures: 0,
        resolutionSuccessRatePercent: 0,
        reusedKeyRejections: 0,
      },
    },
  };

  const rules = alertRulesFromSignals(signals);
  assert.ok(rules.some((rule) => rule.type === 'invocation_recovery_completed'));
  assert.ok(
    rules.some(
      (rule) =>
        rule.type === 'stuck_invocation_resolved' &&
        rule.severity === 'info' &&
        rule.safeValues.count === 1,
    ),
  );
});

test('invocation summary includes lifecycle, recovery, and attempt metrics with legacy compatibility', async () => {
  const originalAggregate = Invocation.aggregate;
  const originalAuditCount = AuditLog.countDocuments;
  let pipeline;
  try {
    Invocation.aggregate = async (value) => {
      pipeline = value;
      return [
        {
          totals: [
            {
              total: 8,
              successful: 3,
              failed: 1,
              timedOut: 1,
              cancelled: 1,
              recoveryRequired: 1,
              inProgress: 1,
              running: 1,
              queued: 0,
              retryableFailures: 2,
              totalAttempts: 7,
              additionalAttempts: 1,
              retriedInvocations: 1,
              repeatedTransientFailures: 1,
              retryAllowed: 0,
              retryDenied: 3,
            },
          ],
          runtimes: [{ _id: 'rest', count: 8 }],
        },
      ];
    };
    AuditLog.countDocuments = async () => 2;
    const result = await invocationSummary(
      'workspace-a',
      ['connection-a'],
      parseWindow('24h', new Date('2026-07-13T12:00:00Z')),
    );
    assert.equal(result.successful, 3);
    assert.equal(result.timedOut, 1);
    assert.equal(result.recoveryRequired, 1);
    assert.equal(result.inProgress, 1);
    assert.equal(result.failureRatePercent, 37.5);
    assert.deepEqual(result.attempts, {
      total: 7,
      additional: 1,
      retriedInvocations: 1,
      repeatedTransientFailures: 1,
      retryAllowed: 0,
      retryDenied: 3,
    });
    assert.match(JSON.stringify(pipeline), /effectiveLifecycleState|completed|succeeded/);
    assert.equal(result.controls.manuallyRetried, 2);
    assert.equal(result.controls.retryDenied, 2);
  } finally {
    Invocation.aggregate = originalAggregate;
    AuditLog.countDocuments = originalAuditCount;
  }
});

test('control summary counts child-linked manual resolutions and audit retry denials accurately', async () => {
  const originalAggregate = Invocation.aggregate;
  const originalAuditCount = AuditLog.countDocuments;
  let pipeline;
  const auditFilters = [];
  try {
    Invocation.aggregate = async (value) => {
      pipeline = value;
      return [
        {
          cancellationRequested: 0,
          cancellationConfirmed: 0,
          cancellationOutcomeUnknown: 0,
          stuckDetected: 0,
          recoveryRequired: 0,
          manuallyRetried: 1,
          manuallyResolved: 1,
        },
      ];
    };
    AuditLog.countDocuments = async (filter) => {
      auditFilters.push(filter);
      return filter.action === 'invocation.recovery.retry_allowed' ? 1 : 4;
    };
    const result = await invocationControlSummary(
      'workspace-a',
      ['connection-a'],
      parseWindow('24h', new Date('2026-07-13T12:00:00Z')),
    );
    const manuallyResolvedExpression = pipeline[1].$group.manuallyResolved;
    assert.match(
      JSON.stringify(manuallyResolvedExpression),
      /resolve_as_failed_allowed|resolve_as_cancelled_allowed/,
    );
    assert.doesNotMatch(JSON.stringify(manuallyResolvedExpression), /recoveryChildInvocationId/);
    assert.equal(result.manuallyRetried, 1);
    assert.equal(result.manuallyResolved, 1);
    assert.equal(result.retryDenied, 4);
    assert.deepEqual(
      auditFilters.map((filter) => filter.action),
      ['invocation.recovery.retry_allowed', 'invocation.recovery.retry_denied'],
    );
    assert.ok(
      auditFilters.every(
        (filter) =>
          JSON.stringify(filter.$or[0]['metadata.connectionId']) ===
          JSON.stringify({ $in: ['connection-a'] }),
      ),
    );
  } finally {
    Invocation.aggregate = originalAggregate;
    AuditLog.countDocuments = originalAuditCount;
  }
});

test('recent problem projection includes only safe lifecycle and retry metadata', () => {
  const projected = safeFailure({
    _id: 'invocation-a',
    connectionId: 'connection-a',
    lifecycleState: 'recovery_required',
    status: 'failed',
    attemptCount: 1,
    retryState: 'not_allowed',
    retryDecisionReason: 'AMBIGUOUS_OUTCOME_REQUIRES_RECOVERY',
    runtimeType: 'rest',
    traceId: 'trace-a',
    error: {
      code: 'SAFE_FETCH_TIMEOUT',
      stage: 'external_runtime_invocation',
      retryable: true,
      providerHttpStatus: 504,
      message: 'Authorization: Bearer private-token',
      responseBody: 'private output',
    },
  });
  assert.equal(projected.status, 'recovery_required');
  assert.equal(projected.retryDecision, 'denied');
  assert.equal(projected.retryReason, 'AMBIGUOUS_OUTCOME_REQUIRES_RECOVERY');
  assert.doesNotMatch(
    JSON.stringify(projected),
    /Bearer|private-token|responseBody|private output/,
  );
});

test('alert synchronization is idempotent and increments occurrence only on reactivation', async () => {
  const originalFind = OperationalAlert.find;
  const originalBulkWrite = OperationalAlert.bulkWrite;
  const writes = [];
  const rule = {
    type: 'provider_errors',
    severity: 'warning',
    title: 'Provider errors',
    summary: 'Safe summary',
    safeValues: { count: 3 },
  };
  try {
    OperationalAlert.bulkWrite = async (operations) => writes.push(operations);
    OperationalAlert.find = () =>
      chainResult([
        {
          _id: 'alert-1',
          type: rule.type,
          dedupeKey: 'workspace-a:provider_errors',
          status: 'active',
        },
      ]);
    await syncOperationalAlerts('workspace-a', [rule], new Date('2026-07-13T10:00:00Z'));
    assert.equal(writes[0][0].updateOne.update.$inc, undefined);
    assert.equal(writes[0][0].updateOne.update.$set.status, undefined);

    OperationalAlert.find = () =>
      chainResult([
        {
          _id: 'alert-1',
          type: rule.type,
          dedupeKey: 'workspace-a:provider_errors',
          status: 'resolved',
        },
      ]);
    await syncOperationalAlerts('workspace-a', [rule], new Date('2026-07-13T11:00:00Z'));
    assert.equal(writes[1][0].updateOne.update.$inc.occurrenceCount, 1);
    assert.equal(writes[1][0].updateOne.update.$set.status, 'active');
    assert.equal(writes[1][0].updateOne.update.$unset.acknowledgedByUserId, 1);

    OperationalAlert.find = () =>
      chainResult([
        {
          _id: 'alert-1',
          type: rule.type,
          dedupeKey: 'workspace-a:provider_errors',
          status: 'acknowledged',
        },
      ]);
    await syncOperationalAlerts('workspace-a', [], new Date('2026-07-13T12:00:00Z'));
    assert.equal(writes[2][0].updateOne.update.$set.status, 'resolved');
  } finally {
    OperationalAlert.find = originalFind;
    OperationalAlert.bulkWrite = originalBulkWrite;
  }
});

test('partner and connection alert scopes have independent dedupe keys', async () => {
  const originalFind = OperationalAlert.find;
  const originalBulkWrite = OperationalAlert.bulkWrite;
  let findFilter;
  let writes;
  try {
    OperationalAlert.find = (filter) => {
      findFilter = filter;
      return chainResult([]);
    };
    OperationalAlert.bulkWrite = async (operations) => {
      writes = operations;
    };
    await syncOperationalAlerts(
      'workspace-a',
      [
        {
          type: 'repeated_stuck_invocations',
          scopeKey: 'connection-a',
          severity: 'warning',
          title: 'Stuck A',
          summary: 'Safe A',
          metricName: 'stuck',
          observedValue: 2,
          thresholdValue: 2,
          safeValues: { connectionId: 'connection-a', count: 2 },
        },
        {
          type: 'repeated_stuck_invocations',
          scopeKey: 'connection-b',
          severity: 'warning',
          title: 'Stuck B',
          summary: 'Safe B',
          metricName: 'stuck',
          observedValue: 3,
          thresholdValue: 2,
          safeValues: { connectionId: 'connection-b', count: 3 },
        },
      ],
      new Date('2026-07-13T10:00:00Z'),
      { partner: { _id: 'partner-a' } },
    );
    assert.equal(findFilter.receivingWorkspaceId, 'workspace-a');
    assert.equal(findFilter.partnerId, 'partner-a');
    assert.equal(writes.length, 2);
    const keys = writes.map((operation) => operation.updateOne.filter.dedupeKey).sort();
    assert.deepEqual(keys, [
      'partner-a:workspace-a:repeated_stuck_invocations:connection-a',
      'partner-a:workspace-a:repeated_stuck_invocations:connection-b',
    ]);
  } finally {
    OperationalAlert.find = originalFind;
    OperationalAlert.bulkWrite = originalBulkWrite;
  }
});

test('installation funnel derives safe, internally consistent stages from persisted records', async () => {
  const originals = {
    distinct: PassportConnection.distinct,
    connectionAggregate: PassportConnection.aggregate,
    keyCount: PassportInstallKey.countDocuments,
    invocationAggregate: Invocation.aggregate,
    auditAggregate: AuditLog.aggregate,
  };
  try {
    PassportConnection.distinct = async () => ['connection-a', 'connection-b'];
    PassportInstallKey.countDocuments = async () => 2;
    PassportConnection.aggregate = async () => [
      {
        connectionsCreated: 2,
        passportsValidated: 2,
        capabilityMetadataImported: 2,
        runtimeResolved: 2,
        delegatedApplicable: 1,
        delegatedCredentialConfigured: 1,
        connectionsVerified: 1,
      },
    ];
    Invocation.aggregate = async () => [{ count: 1 }];
    AuditLog.aggregate = async () => [{ _id: 'INSTALL_KEY_ALREADY_USED', count: 1 }];
    const result = await getPassportFunnel({
      receivingWorkspaceId: 'workspace-a',
      receivingUserId: 'user-a',
      window: '7d',
    });
    const counts = Object.fromEntries(result.steps.map((step) => [step.key, step.count]));
    assert.equal(counts.keysResolved, 2);
    assert.equal(counts.connectionsVerified, 1);
    assert.equal(counts.firstSuccessfulInvocation, 1);
    assert.equal(result.totals.resolutionAttempts, 3);
    assert.equal(result.totals.reusedKeyRejections, 1);
    assert.equal(result.unavailable.keysIssued.includes('cannot be attributed'), true);
  } finally {
    PassportConnection.distinct = originals.distinct;
    PassportConnection.aggregate = originals.connectionAggregate;
    PassportInstallKey.countDocuments = originals.keyCount;
    Invocation.aggregate = originals.invocationAggregate;
    AuditLog.aggregate = originals.auditAggregate;
  }
});

test('latency aggregation is tenant-scoped, bounded, and drops unapproved stages', async () => {
  const originalDistinct = PassportConnection.distinct;
  const originalAggregate = Invocation.aggregate;
  const originalCount = Invocation.countDocuments;
  let pipeline;
  let connectionFilter;
  try {
    PassportConnection.distinct = async (_field, filter) => {
      connectionFilter = filter;
      return ['connection-a'];
    };
    Invocation.aggregate = async (value) => {
      pipeline = value;
      return [
        {
          durationMs: 100,
          stageMetrics: [
            { stage: 'external_runtime_invocation', status: 'completed', durationMs: 75 },
            {
              stage: 'credential_decryption',
              status: 'completed',
              durationMs: 10,
              secret: 'hidden',
            },
          ],
        },
      ];
    };
    Invocation.countDocuments = async () => 1;
    const result = await getLatency(
      {
        receivingWorkspaceId: 'workspace-a',
        receivingUserId: 'user-a',
        window: '1h',
      },
      { partner: { _id: 'partner-a' } },
    );
    assert.deepEqual(connectionFilter, {
      receivingWorkspaceId: 'workspace-a',
      partnerId: 'partner-a',
    });
    assert.match(JSON.stringify(pipeline[0].$match), /workspace-a/);
    assert.match(JSON.stringify(pipeline[0].$match), /connection-a/);
    assert.deepEqual(pipeline[0].$match.$and[0], {
      receivingWorkspaceId: 'workspace-a',
      connectionId: { $in: ['connection-a'] },
    });
    assert.equal(pipeline[2].$limit, 10000);
    assert.deepEqual(
      result.stages.map((item) => item.stage),
      ['external_runtime_invocation'],
    );
    assert.doesNotMatch(JSON.stringify(result), /credential_decryption|hidden|secret/);
  } finally {
    PassportConnection.distinct = originalDistinct;
    Invocation.aggregate = originalAggregate;
    Invocation.countDocuments = originalCount;
  }
});

test('error aggregation returns only safe grouped fields and never raw error messages', async () => {
  const originalDistinct = PassportConnection.distinct;
  const originalAggregate = Invocation.aggregate;
  const originalFind = Invocation.find;
  let pipeline;
  try {
    PassportConnection.distinct = async () => ['connection-a'];
    Invocation.aggregate = async (value) => {
      pipeline = value;
      return [
        {
          groups: [
            {
              _id: {
                code: 'SAFE_FETCH_TIMEOUT',
                stage: 'external_runtime_invocation',
                retryable: true,
                providerHttpStatus: 504,
                runtimeType: 'rest',
              },
              count: 2,
              latestAt: new Date('2026-07-13T10:00:00Z'),
              message: 'Authorization: Bearer secret',
            },
          ],
          meta: [{ totalGroups: 1 }],
          totals: [{ failures: 2, retryable: 2, provider429: 0, providerUnavailable: 2 }],
        },
      ];
    };
    Invocation.find = () => chainResult([]);
    const result = await getErrors({
      receivingWorkspaceId: 'workspace-a',
      receivingUserId: 'user-a',
      window: '24h',
    });
    assert.match(JSON.stringify(pipeline[0].$match), /workspace-a/);
    assert.deepEqual(Object.keys(result.groups[0]).sort(), [
      'category',
      'connectionHealthState',
      'count',
      'errorCode',
      'latestAt',
      'percentageOfFailures',
      'providerHttpStatus',
      'retryable',
      'runtimeType',
      'stage',
    ]);
    assert.doesNotMatch(JSON.stringify(result), /Bearer secret|message|Authorization/);
  } finally {
    PassportConnection.distinct = originalDistinct;
    Invocation.aggregate = originalAggregate;
    Invocation.find = originalFind;
  }
});

test('alert acknowledgement always includes the receiving workspace in its update filter', async () => {
  const original = OperationalAlert.findOneAndUpdate;
  let filter;
  try {
    OperationalAlert.findOneAndUpdate = (value) => {
      filter = value;
      return { lean: async () => null };
    };
    await assert.rejects(
      acknowledgeAlert(
        'alert-from-workspace-b',
        {
          receivingWorkspaceId: 'workspace-a',
          receivingUserId: 'user-a',
        },
        { partner: { _id: 'partner-a' } },
      ),
      (error) => error.statusCode === 404,
    );
    assert.equal(filter.receivingWorkspaceId, 'workspace-a');
    assert.equal(filter.partnerId, 'partner-a');
    assert.equal(filter._id, 'alert-from-workspace-b');
  } finally {
    OperationalAlert.findOneAndUpdate = original;
  }
});

test('alert listing cannot return another workspace through the normal workspace filter', async () => {
  const originalFind = OperationalAlert.find;
  const originalCount = OperationalAlert.countDocuments;
  let findFilter;
  let countFilter;
  try {
    OperationalAlert.find = (filter) => {
      findFilter = filter;
      return chainResult([]);
    };
    OperationalAlert.countDocuments = async (filter) => {
      countFilter = filter;
      return 0;
    };
    const result = await listAlerts(
      {
        receivingWorkspaceId: 'workspace-a',
        receivingUserId: 'user-a',
      },
      { partner: { _id: 'partner-a' } },
    );
    assert.deepEqual(result.items, []);
    assert.equal(findFilter.receivingWorkspaceId, 'workspace-a');
    assert.equal(findFilter.partnerId, 'partner-a');
    assert.equal(countFilter.receivingWorkspaceId, 'workspace-a');
    assert.equal(countFilter.partnerId, 'partner-a');
    assert.doesNotMatch(JSON.stringify(findFilter), /workspace-b/);
  } finally {
    OperationalAlert.find = originalFind;
    OperationalAlert.countDocuments = originalCount;
  }
});
