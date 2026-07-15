const assert = require('node:assert/strict');
const test = require('node:test');
const AuditLog = require('../models/AuditLog');
const PassportConnection = require('../models/PassportConnection');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const durableWork = require('../services/durableWork.service');
const {
  authorizeDurableOperationsScope,
  getDurableWorkOverview,
  getRuntimeWorkerHealth,
  scanDurableAbandonedWork,
  reconcileDurableWork,
  requeueDurableDeadLetter,
  safeWorkItem,
} = require('../services/durableOperations.service');

const IDS = {
  partner: '64b000000000000000000001',
  otherPartner: '64b000000000000000000002',
  connection: '64b000000000000000000011',
  invocation: '64b000000000000000000021',
  work: '64b000000000000000000031',
};

function patch(target, key, replacement, patches) {
  patches.push([target, key, target[key]]);
  target[key] = replacement;
}

function restore(patches) {
  for (const [target, key, original] of patches.reverse()) target[key] = original;
}

function queryResult(value) {
  const query = {
    select() {
      return query;
    },
    lean: async () => value,
  };
  return query;
}

function scope(overrides = {}) {
  return {
    partnerId: IDS.partner,
    receivingWorkspaceId: 'workspace-a',
    receivingUserId: 'user-a',
    connectionId: undefined,
    connectionIds: [IDS.connection],
    ...overrides,
  };
}

function actor(overrides = {}) {
  return {
    partner: { _id: IDS.partner },
    operationsScope: scope(),
    requestId: 'req_operations_test',
    traceId: 'trace_operations_test',
    ...overrides,
  };
}

test('durable operations reject incomplete tenant identity before querying connections', async () => {
  const patches = [];
  let queried = false;
  patch(
    PassportConnection,
    'find',
    () => {
      queried = true;
      return queryResult([]);
    },
    patches,
  );
  try {
    await assert.rejects(
      () =>
        authorizeDurableOperationsScope(
          { receivingWorkspaceId: 'workspace-a' },
          { partner: { _id: IDS.partner } },
        ),
      (error) => error.code === 'VALIDATION_ERROR' && error.details[0].path === 'receivingUserId',
    );
    assert.equal(queried, false);
  } finally {
    restore(patches);
  }
});

test('durable operations authorize the exact partner, workspace, user and connection scope', async () => {
  const patches = [];
  let filter;
  patch(
    PassportConnection,
    'find',
    (value) => {
      filter = value;
      return queryResult([{ _id: IDS.connection }]);
    },
    patches,
  );
  try {
    const result = await authorizeDurableOperationsScope(
      {
        receivingWorkspaceId: 'workspace-a',
        receivingUserId: 'user-a',
        connectionId: IDS.connection,
      },
      { partner: { _id: IDS.partner } },
    );
    assert.equal(String(filter.partnerId), IDS.partner);
    assert.equal(filter.receivingWorkspaceId, 'workspace-a');
    assert.equal(filter.receivingUserId, 'user-a');
    assert.equal(filter._id, IDS.connection);
    assert.deepEqual(result.connectionIds, [IDS.connection]);
    assert.equal(result.connectionId, IDS.connection);
  } finally {
    restore(patches);
  }
});

test('a partner cannot authorize another partner or workspace durable scope', async () => {
  const patches = [];
  let filter;
  patch(
    PassportConnection,
    'find',
    (value) => {
      filter = value;
      return queryResult([]);
    },
    patches,
  );
  try {
    await assert.rejects(
      () =>
        authorizeDurableOperationsScope(
          { receivingWorkspaceId: 'workspace-b', receivingUserId: 'user-b' },
          { partner: { _id: IDS.otherPartner } },
        ),
      { code: 'CONNECTION_NOT_FOUND' },
    );
    assert.equal(String(filter.partnerId), IDS.otherPartner);
    assert.equal(filter.receivingWorkspaceId, 'workspace-b');
    assert.equal(filter.receivingUserId, 'user-b');
  } finally {
    restore(patches);
  }
});

test('work overview is tenant-scoped and uses a strict safe response allowlist', async () => {
  const patches = [];
  let listQuery;
  let metricQuery;
  patch(
    durableWork,
    'listWorkItems',
    async (input) => {
      listQuery = input;
      return {
        items: [
          {
            workItemId: IDS.work,
            invocationId: IDS.invocation,
            connectionId: IDS.connection,
            status: 'running',
            safeStage: 'validation_completed',
            workType: 'runtime_invocation',
            attemptNumber: 1,
            version: 3,
            leaseOwner: 'secret-worker-host',
            leaseTokenHash: 'sha256:secret',
            payload: 'private prompt',
            result: 'private output',
            runtimeEndpoint: 'https://secret.example/private',
            error: { message: 'provider secret' },
          },
        ],
        pagination: { page: 1, limit: 25, total: 1 },
      };
    },
    patches,
  );
  patch(
    durableWork,
    'durableWorkMetrics',
    async (input) => {
      metricQuery = input;
      return {
        counts: { running: 1 },
        dueExecutableCount: 2,
        abandonedLeaseCount: 0,
        oldestPendingAgeMs: 20,
        averageQueueWaitMs: 10,
      };
    },
    patches,
  );
  try {
    const result = await getDurableWorkOverview({}, actor());
    assert.equal(listQuery.partnerId, IDS.partner);
    assert.equal(listQuery.receivingWorkspaceId, 'workspace-a');
    assert.equal(Object.hasOwn(listQuery, 'connectionId'), false);
    assert.equal(metricQuery.partnerId, IDS.partner);
    assert.equal(metricQuery.receivingWorkspaceId, 'workspace-a');
    assert.equal(result.items[0].status, 'running');
    assert.equal(result.metrics.dueExecutableCount, 2);
    assert.deepEqual(Object.keys(result.items[0]).sort(), Object.keys(safeWorkItem({})).sort());
    assert.doesNotMatch(
      JSON.stringify(result),
      /secret-worker|leaseToken|private prompt|private output|secret\.example|provider secret|payload|result|runtimeEndpoint/i,
    );
  } finally {
    restore(patches);
  }
});

test('worker visibility returns aggregate health and never worker identities', async () => {
  const patches = [];
  patch(
    durableWork,
    'aggregateWorkerHealth',
    async () => ({
      status: 'healthy',
      activeWorkers: 2,
      readyWorkers: 1,
      drainingWorkers: 1,
      staleWorkers: 1,
      activeWorkCount: 3,
      lastHeartbeatAt: new Date('2030-01-01T00:00:00Z'),
      staleAfterMs: 90_000,
      workerId: 'must-not-return',
      environment: 'must-not-return',
    }),
    patches,
  );
  try {
    const result = await getRuntimeWorkerHealth({}, actor());
    assert.equal(result.activeWorkers, 2);
    assert.equal(result.readyWorkers, 1);
    assert.equal(result.drainingWorkers, 1);
    assert.equal(result.staleWorkers, 1);
    assert.doesNotMatch(JSON.stringify(result), /must-not-return|workerId|environment/);
  } finally {
    restore(patches);
  }
});

test('abandoned scan and reconciliation are tenant-scoped and audited before mutation', async () => {
  const patches = [];
  const events = [];
  const calls = [];
  patch(
    AuditLog,
    'create',
    async (payload) => {
      events.push(payload);
      return payload;
    },
    patches,
  );
  patch(
    durableWork,
    'scanAbandonedWork',
    async (input) => {
      calls.push(['scan', input]);
      return { scanned: 2, safelyRecovered: 1, recoveryRequired: 1 };
    },
    patches,
  );
  patch(
    durableWork,
    'reconcileAcceptedInvocations',
    async (input) => {
      calls.push(['reconcile', input]);
      return { scanned: 2, created: 1, existing: 1, skipped: 0 };
    },
    patches,
  );
  try {
    await scanDurableAbandonedWork({ limit: 10 }, actor());
    await reconcileDurableWork({ limit: 11 }, actor());
    assert.equal(events[0].action, 'durable_work.abandoned_scan_requested');
    assert.equal(events[1].action, 'durable_work.reconciliation_requested');
    assert.ok(events.every((entry) => entry.metadata.receivingWorkspaceId === 'workspace-a'));
    assert.ok(events.every((entry) => entry.metadata.receivingUserId === 'user-a'));
    assert.deepEqual(calls[0], [
      'scan',
      { partnerId: IDS.partner, receivingWorkspaceId: 'workspace-a', limit: 10 },
    ]);
    assert.deepEqual(calls[1], [
      'reconcile',
      { partnerId: IDS.partner, receivingWorkspaceId: 'workspace-a', limit: 11 },
    ]);
  } finally {
    restore(patches);
  }
});

test('dead-letter requeue requires owned connection scope, version, safe policy and audit', async () => {
  const patches = [];
  const events = [];
  let requeueInput;
  patch(AuditLog, 'create', async (payload) => events.push(payload), patches);
  patch(RuntimeWorkItem, 'findOne', () => queryResult(null), patches);
  patch(
    durableWork,
    'requeueDeadLetter',
    async (input) => {
      requeueInput = input;
      return {
        safe: {
          workItemId: IDS.work,
          invocationId: IDS.invocation,
          connectionId: IDS.connection,
          status: 'pending',
          version: 5,
          leaseOwner: 'must-not-return',
          payload: 'must-not-return',
        },
      };
    },
    patches,
  );
  try {
    const scopedActor = actor({ operationsScope: scope({ connectionId: IDS.connection }) });
    const result = await requeueDurableDeadLetter(
      IDS.work,
      { connectionId: IDS.connection, version: 4 },
      scopedActor,
    );
    assert.deepEqual(requeueInput, {
      partnerId: IDS.partner,
      receivingWorkspaceId: 'workspace-a',
      connectionId: IDS.connection,
      workItemId: IDS.work,
      version: 4,
    });
    assert.equal(events[0].action, 'durable_work.dead_letter_requeue_requested');
    assert.equal(result.alreadyRequeued, false);
    assert.doesNotMatch(JSON.stringify(result), /must-not-return|leaseOwner|payload/);
  } finally {
    restore(patches);
  }
});

test('repeated dead-letter requeue is idempotent and does not invoke queue mutation twice', async () => {
  const patches = [];
  let queueCalls = 0;
  let idempotencyFilter;
  patch(AuditLog, 'create', async (payload) => payload, patches);
  patch(
    RuntimeWorkItem,
    'findOne',
    (filter) => {
      idempotencyFilter = filter;
      return queryResult({
        _id: IDS.work,
        invocationId: IDS.invocation,
        connectionId: IDS.connection,
        status: 'running',
        requeueCount: 1,
        retryDecisionReason: 'OPERATOR_REQUEUE_PRETRANSMISSION',
        version: 5,
      });
    },
    patches,
  );
  patch(
    durableWork,
    'requeueDeadLetter',
    async () => {
      queueCalls += 1;
    },
    patches,
  );
  try {
    const result = await requeueDurableDeadLetter(
      IDS.work,
      { connectionId: IDS.connection, version: 4 },
      actor({ operationsScope: scope({ connectionId: IDS.connection }) }),
    );
    assert.equal(result.alreadyRequeued, true);
    assert.equal(queueCalls, 0);
    assert.deepEqual(idempotencyFilter.version, { $gt: 4 });
    assert.equal(Object.hasOwn(idempotencyFilter, 'status'), false);
  } finally {
    restore(patches);
  }
});
