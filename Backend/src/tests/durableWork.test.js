const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');
const { env } = require('../config/env');
const DurableEventOutbox = require('../models/DurableEventOutbox');
const Invocation = require('../models/Invocation');
const InvocationAttempt = require('../models/InvocationAttempt');
const PassportConnection = require('../models/PassportConnection');
const RuntimeWorkerHeartbeat = require('../models/RuntimeWorkerHeartbeat');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  aggregateWorkerHealth,
  appendOutboxEvent,
  claimNextWork,
  claimWorkById,
  classifyAbandonedWork,
  deterministicDedupeKey,
  durableWorkMetrics,
  enqueueWork,
  ensureDurableIndexes,
  finalizeWork,
  getOwnedWorkControlState,
  heartbeatWork,
  reconcileAcceptedInvocations,
  prepareInvocationForSafeReplay,
  recordMilestone,
  requestWorkCancellation,
  requeueDeadLetter,
  scanAbandonedWork,
  scheduleRetry,
  serializeWorkItem,
  upsertWorkerHeartbeat,
  withDurableTransaction,
} = require('../services/durableWork.service');

const IDS = Object.freeze({
  partner: '507f1f77bcf86cd799439011',
  connection: '507f1f77bcf86cd799439012',
  invocation: '507f1f77bcf86cd799439013',
  work: '507f1f77bcf86cd799439014',
});

function patch(object, key, replacement) {
  const original = object[key];
  object[key] = replacement;
  return () => {
    object[key] = original;
  };
}

function work(overrides = {}) {
  const now = new Date('2030-01-01T00:00:00.000Z');
  return {
    _id: IDS.work,
    partnerId: IDS.partner,
    receivingWorkspaceId: 'workspace-a',
    connectionId: IDS.connection,
    invocationId: IDS.invocation,
    attemptNumber: 1,
    executionGeneration: 1,
    workType: 'runtime_invocation',
    status: 'pending',
    priority: 0,
    availableAt: now,
    retryCount: 0,
    maximumAttempts: 2,
    safeOperation: 'runtime_invocation',
    milestones: [],
    version: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function queryResult(value) {
  const query = {
    select() {
      return query;
    },
    sort() {
      return query;
    },
    skip() {
      return query;
    },
    limit() {
      return query;
    },
    lean: async () => value,
  };
  return query;
}

test('durable schemas have strict data-minimized fields and multi-instance indexes', async () => {
  const dedupeIndexes = RuntimeWorkItem.schema.indexes();
  assert.ok(
    dedupeIndexes.some(
      ([keys, options]) => keys.dedupeKey === 1 && options.unique === true,
    ),
  );
  assert.ok(
    dedupeIndexes.some(
      ([keys, options]) =>
        keys.partnerId === 1 &&
        keys.receivingWorkspaceId === 1 &&
        keys.invocationId === 1 &&
        keys.executionGeneration === 1 &&
        options.unique === true,
    ),
  );
  assert.ok(
    dedupeIndexes.some(
      ([keys]) => keys.status === 1 && keys.priority === -1 && keys.availableAt === 1,
    ),
  );

  assert.throws(
    () =>
      new RuntimeWorkItem({
        ...work(),
        dedupeKey: `sha256:${'a'.repeat(64)}`,
        prompt: 'never persist this prompt',
      }),
    /prompt|strict mode/i,
  );
  await assert.rejects(
    () =>
      new DurableEventOutbox({
        eventKey: `sha256:${'b'.repeat(64)}`,
        eventType: 'work.enqueued',
        partnerId: IDS.partner,
        receivingWorkspaceId: 'workspace-a',
        invocationId: IDS.invocation,
        workItemId: IDS.work,
        connectionId: IDS.connection,
        safeMetadata: { prompt: 'secret input' },
      }).validate(),
    /prompt|strict mode/i,
  );
  const numericLeaseAttempt = new InvocationAttempt({
    invocationId: IDS.invocation,
    receivingWorkspaceId: 'workspace-a',
    connectionId: IDS.connection,
    attemptNumber: 1,
    executionOwner: 'worker:opaque',
    executionLeaseId: '1b6f7a92-ff90-4e2c-a1a0-8896f26c3850',
    executionLeaseExpiresAt: new Date('2030-01-01T00:06:00.000Z'),
    status: 'started',
    startedAt: new Date('2030-01-01T00:00:00.000Z'),
    runtimeType: 'rest',
  });
  assert.equal(numericLeaseAttempt.validateSync(), undefined);
});

test('dedupe identity is deterministic, globally scoped, and rejects payload-shaped input', async () => {
  const input = {
    partnerId: IDS.partner,
    receivingWorkspaceId: 'workspace-a',
    invocationId: IDS.invocation,
    connectionId: IDS.connection,
    executionGeneration: 1,
    workType: 'runtime_invocation',
  };
  const first = deterministicDedupeKey(input);
  assert.equal(first, deterministicDedupeKey({ ...input }));
  assert.match(first, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(first, deterministicDedupeKey({ ...input, receivingWorkspaceId: 'workspace-b' }));

  await assert.rejects(
    () => enqueueWork({ ...input, prompt: 'secret prompt' }, { outbox: false }),
    { code: ErrorCodes.VALIDATION_ERROR },
  );
});

test('idempotent enqueue inserts once and returns the existing work without raw idempotency data', async () => {
  const saved = work({ dedupeKey: `sha256:${'c'.repeat(64)}` });
  const updates = [];
  let call = 0;
  const restoreUpdate = patch(RuntimeWorkItem, 'updateOne', async (filter, update) => {
    updates.push({ filter, update });
    call += 1;
    return call === 1 ? { upsertedCount: 1 } : { upsertedCount: 0 };
  });
  const restoreFind = patch(RuntimeWorkItem, 'findOne', async () => saved);
  try {
    const input = {
      partnerId: IDS.partner,
      receivingWorkspaceId: 'workspace-a',
      invocationId: IDS.invocation,
      connectionId: IDS.connection,
      executionGeneration: 1,
      workType: 'runtime_invocation',
    };
    const first = await enqueueWork(input, { outbox: false });
    const second = await enqueueWork(input, { outbox: false });
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(updates[0].filter.dedupeKey, updates[1].filter.dedupeKey);
    assert.equal(JSON.stringify(updates).includes('idempotencyKey'), false);
    assert.equal(JSON.stringify(updates).includes('prompt'), false);
  } finally {
    restoreFind();
    restoreUpdate();
  }
});

test('inline enqueue atomically inserts claimed work so a polling worker has no steal window', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  let insertedDocument;
  const saved = work({
    status: 'claimed',
    claimedAt: now,
    leaseExpiresAt: new Date(now.getTime() + env.DURABLE_WORK_LEASE_MS),
    safeStage: 'work_claimed',
  });
  const restoreUpdate = patch(RuntimeWorkItem, 'updateOne', async (_filter, update) => {
    insertedDocument = update.$setOnInsert;
    return { upsertedCount: 1 };
  });
  const restoreFind = patch(RuntimeWorkItem, 'findOne', async () => saved);
  try {
    const result = await enqueueWork(
      {
        partnerId: IDS.partner,
        receivingWorkspaceId: 'workspace-a',
        invocationId: IDS.invocation,
        connectionId: IDS.connection,
        executionGeneration: 1,
        workType: 'runtime_invocation',
      },
      {
        now,
        outbox: false,
        initialClaim: { leaseOwner: 'api:inline-safe', leaseMs: env.DURABLE_WORK_LEASE_MS },
      },
    );
    assert.equal(insertedDocument.status, 'claimed');
    assert.equal(insertedDocument.leaseOwner, 'api:inline-safe');
    assert.match(insertedDocument.leaseTokenHash, /^sha256:[a-f0-9]{64}$/);
    assert.equal(insertedDocument.milestones[0].name, 'work_claimed');
    assert.equal(result.ownership.leaseOwner, 'api:inline-safe');
    assert.ok(result.ownership.leaseToken.length >= 32);
    assert.equal(JSON.stringify(insertedDocument).includes(result.ownership.leaseToken), false);
  } finally {
    restoreFind();
    restoreUpdate();
  }
});

test('atomic claiming is deterministic, persists only a token hash, and excludes future or cancelled work', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const calls = [];
  const claimed = work({ status: 'claimed', claimedAt: now, leaseExpiresAt: new Date(now.getTime() + 360_000) });
  const withMilestone = work({
    ...claimed,
    safeStage: 'work_claimed',
    milestones: [
      { name: 'work_claimed', at: now, attemptNumber: 1, safeStatus: 'completed' },
    ],
    version: 2,
  });
  const responses = [claimed, withMilestone, null];
  const restore = patch(RuntimeWorkItem, 'findOneAndUpdate', async (filter, update, options) => {
    calls.push({ filter, update, options });
    return responses.shift();
  });
  try {
    const first = await claimNextWork(
      { workerId: 'worker:test-a', now },
      { verifyInvocation: false, outbox: false },
    );
    const second = await claimNextWork(
      { workerId: 'worker:test-b', now },
      { verifyInvocation: false, outbox: false },
    );
    assert.ok(first);
    assert.equal(second, null);
    assert.equal(first.ownership.leaseOwner, 'worker:test-a');
    assert.equal(first.ownership.leaseToken, first.leaseToken);
    assert.ok(first.leaseToken.length >= 32);
    assert.match(calls[0].update.$set.leaseTokenHash, /^sha256:[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(calls[0].update).includes(first.leaseToken), false);
    assert.deepEqual(calls[0].filter.status.$in, ['pending', 'retry_scheduled']);
    assert.deepEqual(calls[0].filter.availableAt, { $lte: now });
    assert.deepEqual(calls[0].filter.cancellationRequestedAt, { $exists: false });
    assert.deepEqual(calls[0].options.sort, {
      priority: -1,
      availableAt: 1,
      createdAt: 1,
      _id: 1,
    });
    assert.equal(calls[1].update.$push.milestones.attemptNumber, 1);
  } finally {
    restore();
  }
});

test('specific-item claim uses the same atomic predicates and ownership shape', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const calls = [];
  const responses = [
    work({ status: 'claimed', leaseExpiresAt: new Date(now.getTime() + 360_000) }),
    work({
      status: 'claimed',
      safeStage: 'work_claimed',
      leaseExpiresAt: new Date(now.getTime() + 360_000),
      milestones: [
        { name: 'work_claimed', at: now, attemptNumber: 1, safeStatus: 'completed' },
      ],
    }),
  ];
  const restore = patch(RuntimeWorkItem, 'findOneAndUpdate', async (filter, update) => {
    calls.push({ filter, update });
    return responses.shift();
  });
  try {
    const result = await claimWorkById(
      IDS.work,
      { workerId: 'worker:inline', now },
      { verifyInvocation: false, outbox: false },
    );
    assert.equal(result.safe.workItemId, IDS.work);
    assert.equal(result.ownership.leaseOwner, 'worker:inline');
    assert.equal(calls[0].filter._id, IDS.work);
    assert.deepEqual(calls[0].filter.availableAt, { $lte: now });
    assert.equal(JSON.stringify(calls[0].update).includes(result.leaseToken), false);
  } finally {
    restore();
  }
});

test('real claim verification accepts only a linked protected Invocation with aligned attempt state', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  let state = work({ status: 'pending', version: 0 });
  let invocationReads = 0;
  const restoreWorkUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (_filter, update) => {
    state = {
      ...state,
      ...update.$set,
      milestones: update.$push?.milestones
        ? [...state.milestones, update.$push.milestones]
        : state.milestones,
      version: state.version + Number(update.$inc?.version || 0),
    };
    return state;
  });
  const restoreInvocationFind = patch(Invocation, 'findOne', () => {
    invocationReads += 1;
    return queryResult({
      _id: IDS.invocation,
      connectionId: IDS.connection,
      receivingWorkspaceId: 'workspace-a',
      lifecycleState: 'authorized',
      cancellationState: 'not_requested',
      recoveryState: 'not_required',
      protectedReplayAvailable: true,
      executionGeneration: 1,
      currentWorkItemId: IDS.work,
      attemptCount: 0,
      retryState: 'not_evaluated',
    });
  });
  try {
    const claimed = await claimWorkById(
      IDS.work,
      { workerId: 'worker:verified', now },
      { outbox: false },
    );
    assert.ok(claimed);
    assert.equal(claimed.safe.status, 'claimed');
    assert.equal(invocationReads, 1);
  } finally {
    restoreInvocationFind();
    restoreWorkUpdate();
  }
});

test('claim verification projects a succeeded Invocation onto stale claimable Work', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  let state = work({ status: 'pending', version: 0 });
  const updates = [];
  const restoreWorkUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (_filter, update) => {
    updates.push(update);
    state = {
      ...state,
      ...update.$set,
      version: state.version + Number(update.$inc?.version || 0),
    };
    return state;
  });
  const restoreInvocationFind = patch(Invocation, 'findOne', () =>
    queryResult({
      _id: IDS.invocation,
      connectionId: IDS.connection,
      receivingWorkspaceId: 'workspace-a',
      lifecycleState: 'succeeded',
      cancellationState: 'not_requested',
      recoveryState: 'not_required',
      protectedReplayAvailable: true,
      executionGeneration: 1,
      currentWorkItemId: IDS.work,
      attemptCount: 1,
      retryState: 'completed',
    }),
  );
  try {
    const claimed = await claimWorkById(
      IDS.work,
      { workerId: 'worker:terminal-reconcile', now },
      { outbox: false },
    );
    assert.equal(claimed, null);
    assert.equal(updates.at(-1).$set.status, 'completed');
    assert.equal(updates.at(-1).$set.completedAt.getTime(), now.getTime());
    assert.equal(Object.hasOwn(updates.at(-1).$set, 'lastErrorCode'), false);
    assert.equal(updates.at(-1).$unset.lastErrorCode, 1);
  } finally {
    restoreInvocationFind();
    restoreWorkUpdate();
  }
});

test('safe replay preparation preserves terminal denial and narrowly reauthorizes scheduled retry', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const availableAt = new Date(now.getTime() + 5_000);
  let retryState = 'not_allowed';
  let invocationUpdates = 0;
  let capturedUpdate;
  const restoreFind = patch(Invocation, 'findOne', () =>
    queryResult({
      _id: IDS.invocation,
      connectionId: IDS.connection,
      receivingWorkspaceId: 'workspace-a',
      lifecycleState: 'failed',
      cancellationState: 'not_requested',
      recoveryState: 'not_required',
      protectedReplayAvailable: true,
      executionGeneration: 1,
      currentWorkItemId: IDS.work,
      attemptCount: 1,
      retryState,
      traceId: 'trace-safe',
    }),
  );
  const restoreUpdate = patch(Invocation, 'findOneAndUpdate', async (_filter, update) => {
    invocationUpdates += 1;
    capturedUpdate = update;
    return {
      _id: IDS.invocation,
      lifecycleState: 'authorized',
      attemptCount: 1,
      retryState: 'scheduled',
    };
  });
  const restoreAttempts = patch(InvocationAttempt, 'updateMany', async () => ({ modifiedCount: 1 }));
  try {
    const denied = await prepareInvocationForSafeReplay(
      work({ status: 'retry_preparing', attemptNumber: 2 }),
      { now, availableAt, reasonCode: 'TRANSIENT_IDEMPOTENT_FAILURE' },
    );
    assert.equal(denied.allowed, false);
    assert.equal(denied.reasonCode, 'INVOCATION_RETRY_NOT_SCHEDULED');
    assert.equal(invocationUpdates, 0);

    retryState = 'scheduled';
    const prepared = await prepareInvocationForSafeReplay(
      work({ status: 'retry_preparing', attemptNumber: 2 }),
      { now, availableAt, reasonCode: 'TRANSIENT_IDEMPOTENT_FAILURE' },
    );
    assert.equal(prepared.allowed, true);
    assert.equal(prepared.nextAttemptNumber, 2);
    assert.equal(capturedUpdate.$set.lifecycleState, 'authorized');
    assert.equal(capturedUpdate.$set.retryState, 'scheduled');
    assert.equal(capturedUpdate.$push.stateHistory.$each[0].fromState, 'failed');
  } finally {
    restoreAttempts();
    restoreUpdate();
    restoreFind();
  }
});

test('expired waiting_for_runtime is replayable only with pre-transmission Work evidence', async () => {
  const now = new Date('2030-01-01T00:10:00.000Z');
  const expiredAt = new Date('2030-01-01T00:00:00.000Z');
  const base = work({
    status: 'retry_preparing',
    attemptNumber: 1,
    leaseExpiresAt: expiredAt,
    milestones: [
      { name: 'credentials_loaded', at: expiredAt, attemptNumber: 1, safeStatus: 'completed' },
    ],
  });
  const restoreFind = patch(Invocation, 'findOne', () =>
    queryResult({
      _id: IDS.invocation,
      connectionId: IDS.connection,
      receivingWorkspaceId: 'workspace-a',
      lifecycleState: 'waiting_for_runtime',
      cancellationState: 'not_requested',
      recoveryState: 'not_required',
      protectedReplayAvailable: true,
      executionGeneration: 1,
      currentWorkItemId: IDS.work,
      attemptCount: 1,
      retryState: 'not_evaluated',
      executionLeaseExpiresAt: expiredAt,
    }),
  );
  let invocationUpdates = 0;
  const restoreUpdate = patch(Invocation, 'findOneAndUpdate', async (_filter, update) => {
    invocationUpdates += 1;
    return { _id: IDS.invocation, ...update.$set };
  });
  const restoreAttempts = patch(InvocationAttempt, 'updateMany', async () => ({ modifiedCount: 1 }));
  try {
    const prepared = await prepareInvocationForSafeReplay(base, {
      now,
      availableAt: now,
      reasonCode: 'LEASE_EXPIRED_BEFORE_TRANSMISSION',
    });
    assert.equal(prepared.allowed, true);
    assert.equal(prepared.nextAttemptNumber, 2);

    const denied = await prepareInvocationForSafeReplay(
      {
        ...base,
        milestones: [
          {
            name: 'outbound_transmission_started',
            at: expiredAt,
            attemptNumber: 1,
            safeStatus: 'completed',
          },
        ],
      },
      {
        now,
        availableAt: now,
        reasonCode: 'LEASE_EXPIRED_BEFORE_TRANSMISSION',
      },
    );
    assert.equal(denied.allowed, false);
    assert.equal(denied.reasonCode, 'INVOCATION_SAFE_REPLAY_NOT_PROVEN');
    assert.equal(invocationUpdates, 1);
  } finally {
    restoreAttempts();
    restoreUpdate();
    restoreFind();
  }
});

test('heartbeat and control reads require current hashed ownership and surface durable cancellation', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const raw = crypto.randomBytes(32).toString('base64url');
  let heartbeatCall;
  const restoreUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (filter, update) => {
    heartbeatCall = { filter, update };
    return work({
      status: 'cancellation_requested',
      cancellationReasonCode: 'USER_REQUESTED',
      leaseExpiresAt: update.$set.leaseExpiresAt,
    });
  });
  const restoreFind = patch(RuntimeWorkItem, 'findOne', () =>
    queryResult(
      work({
        status: 'cancellation_requested',
        cancellationReasonCode: 'USER_REQUESTED',
        leaseExpiresAt: new Date(now.getTime() + 360_000),
      }),
    ),
  );
  try {
    const ownership = { leaseOwner: 'worker:test-a', leaseToken: raw };
    const heartbeat = await heartbeatWork(IDS.work, ownership, { now });
    assert.equal(heartbeat.cancellationRequested, true);
    assert.match(heartbeatCall.filter.leaseTokenHash, /^sha256:[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(heartbeatCall).includes(raw), false);
    assert.ok(heartbeatCall.update.$set.leaseExpiresAt > now);
    const control = await getOwnedWorkControlState(IDS.work, ownership, { now });
    assert.deepEqual(
      {
        status: control.status,
        cancellationRequested: control.cancellationRequested,
        cancellationReasonCode: control.cancellationReasonCode,
      },
      {
        status: 'cancellation_requested',
        cancellationRequested: true,
        cancellationReasonCode: 'USER_REQUESTED',
      },
    );
  } finally {
    restoreFind();
    restoreUpdate();
  }
});

test('milestones are allowlisted and stale owners cannot write or finalize', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const ownership = { leaseOwner: 'worker:stale', leaseToken: crypto.randomBytes(32).toString('base64url') };
  const restore = patch(RuntimeWorkItem, 'findOneAndUpdate', async () => null);
  const restoreFind = patch(RuntimeWorkItem, 'findOne', async () => null);
  try {
    await assert.rejects(
      () =>
        recordMilestone(
          IDS.work,
          ownership,
          { name: 'outbound_transmission_started', attemptNumber: 1 },
          { now, outbox: false },
        ),
      { code: ErrorCodes.DURABLE_WORK_LEASE_LOST },
    );
    await assert.rejects(
      () =>
        finalizeWork(
          IDS.work,
          ownership,
          { status: 'completed' },
          { now, outbox: false },
        ),
      { code: ErrorCodes.DURABLE_WORK_FINALIZATION_CONFLICT },
    );
    await assert.rejects(
      () =>
        recordMilestone(
          IDS.work,
          ownership,
          { name: 'provider_prompt_saved', attemptNumber: 1 },
          { now },
        ),
      { code: ErrorCodes.VALIDATION_ERROR },
    );
  } finally {
    restoreFind();
    restore();
  }
});

test('abandoned classification never blindly replays transmission or finalization uncertainty', () => {
  assert.deepEqual(classifyAbandonedWork(work()).classification, 'pre_transmission');
  assert.equal(
    classifyAbandonedWork(
      work({
        milestones: [
          {
            name: 'outbound_transmission_started',
            at: new Date(),
            attemptNumber: 1,
            safeStatus: 'completed',
          },
        ],
      }),
    ).replayAllowed,
    false,
  );
  assert.equal(
    classifyAbandonedWork(
      work({
        milestones: [
          {
            name: 'finalization_started',
            at: new Date(),
            attemptNumber: 1,
            safeStatus: 'completed',
          },
        ],
      }),
    ).recoveryReasonCode,
    'WORKER_LOST_DURING_FINALIZATION',
  );
  assert.equal(
    classifyAbandonedWork(
      work({
        attemptNumber: 2,
        milestones: [
          {
            name: 'outbound_transmission_started',
            at: new Date(),
            attemptNumber: 1,
            safeStatus: 'completed',
          },
        ],
      }),
    ).replayAllowed,
    true,
  );
});

test('abandoned scan safely requeues pre-transmission work and quarantines post-transmission work with CAS', async () => {
  const now = new Date('2030-01-01T00:10:00.000Z');
  const expiredAt = new Date('2030-01-01T00:00:00.000Z');
  const pre = work({
    _id: '507f1f77bcf86cd799439021',
    status: 'running',
    leaseExpiresAt: expiredAt,
    version: 4,
    milestones: [
      { name: 'credentials_loaded', at: expiredAt, attemptNumber: 1, safeStatus: 'completed' },
    ],
  });
  const post = work({
    _id: '507f1f77bcf86cd799439022',
    status: 'running',
    leaseExpiresAt: expiredAt,
    version: 8,
    milestones: [
      {
        name: 'outbound_transmission_started',
        at: expiredAt,
        attemptNumber: 1,
        safeStatus: 'completed',
      },
    ],
  });
  let scanFilter;
  const updates = [];
  const restoreFind = patch(RuntimeWorkItem, 'find', (filter) => {
    scanFilter = filter;
    return queryResult([pre, post]);
  });
  const restoreUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (filter, update) => {
    updates.push({ filter, update });
    const source = filter._id === pre._id ? pre : post;
    return { ...source, ...update.$set, version: source.version + 1 };
  });
  try {
    const result = await scanAbandonedWork(
      {
        now,
        graceMs: 1_000,
        partnerId: IDS.partner,
        receivingWorkspaceId: 'workspace-a',
      },
      {
        outbox: false,
        updateInvocation: false,
        invocationTerminalState: async () => null,
        prepareInvocationForSafeReplay: async () => ({
          allowed: true,
          nextAttemptNumber: 2,
        }),
      },
    );
    assert.deepEqual(
      { safelyRecovered: result.safelyRecovered, recoveryRequired: result.recoveryRequired },
      { safelyRecovered: 1, recoveryRequired: 1 },
    );
    assert.equal(scanFilter.partnerId, IDS.partner);
    assert.equal(scanFilter.receivingWorkspaceId, 'workspace-a');
    assert.equal(updates[0].filter.version, 4);
    assert.deepEqual(updates[0].filter.leaseExpiresAt, {
      $lte: new Date(now.getTime() - 1_000),
    });
    assert.equal(updates[0].update.$set.status, 'retry_preparing');
    assert.equal(updates[0].update.$set.attemptNumber, 2);
    assert.equal(updates[1].update.$set.status, 'pending');
    assert.equal(updates[2].update.$set.status, 'recovery_required');
    assert.equal(
      updates[2].update.$set.recoveryReasonCode,
      'WORKER_LOST_DURING_REMOTE_EXECUTION',
    );
    assert.equal(JSON.stringify(updates).includes('leaseToken'), true);
    assert.equal(JSON.stringify(updates).includes('prompt'), false);
  } finally {
    restoreUpdate();
    restoreFind();
  }
});

test('abandoned post-transmission work trusts an already persisted terminal Invocation', async () => {
  const now = new Date('2030-01-01T00:10:00.000Z');
  const candidate = work({
    status: 'running',
    leaseExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
    version: 2,
    milestones: [
      {
        name: 'finalization_started',
        at: new Date('2030-01-01T00:00:00.000Z'),
        attemptNumber: 1,
        safeStatus: 'completed',
      },
    ],
  });
  const restoreFind = patch(RuntimeWorkItem, 'find', () => queryResult([candidate]));
  let applied;
  const restoreUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (_filter, update) => {
    applied = update;
    return { ...candidate, ...update.$set, version: 3 };
  });
  try {
    const result = await scanAbandonedWork(
      { now, graceMs: 1_000 },
      {
        outbox: false,
        invocationTerminalState: async () => 'succeeded',
      },
    );
    assert.equal(result.terminalReconciled, 1);
    assert.equal(result.recoveryRequired, 0);
    assert.equal(applied.$set.status, 'completed');
  } finally {
    restoreUpdate();
    restoreFind();
  }
});

test('abandoned replay denial terminalizes expired Work instead of leaving ownership stranded', async () => {
  const now = new Date('2030-01-01T00:10:00.000Z');
  const candidate = work({
    status: 'running',
    leaseExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
    version: 2,
  });
  const restoreWorkFind = patch(RuntimeWorkItem, 'find', () => queryResult([candidate]));
  const restoreInvocationFind = patch(Invocation, 'findOne', () =>
    queryResult({
      _id: IDS.invocation,
      connectionId: IDS.connection,
      receivingWorkspaceId: 'workspace-a',
      lifecycleState: 'failed',
      cancellationState: 'not_requested',
      recoveryState: 'not_required',
      protectedReplayAvailable: true,
      executionGeneration: 1,
      currentWorkItemId: IDS.work,
      attemptCount: 1,
      retryState: 'not_allowed',
    }),
  );
  let applied;
  const restoreWorkUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (_filter, update) => {
    applied = update;
    return { ...candidate, ...update.$set, status: 'failed', version: 3 };
  });
  try {
    const result = await scanAbandonedWork(
      { now, graceMs: 1_000 },
      { outbox: false },
    );
    assert.equal(result.terminalReconciled, 1);
    assert.equal(result.conflicts, 0);
    assert.equal(applied.$set.status, 'failed');
    assert.equal(applied.$set.retryDecisionReason, 'INVOCATION_RETRY_NOT_SCHEDULED');
    assert.equal(applied.$unset.leaseTokenHash, 1);
  } finally {
    restoreWorkUpdate();
    restoreInvocationFind();
    restoreWorkFind();
  }
});

test('simultaneous abandoned scanners are idempotent because only one version-and-expiry CAS wins', async () => {
  const now = new Date('2030-01-01T00:10:00.000Z');
  const candidate = work({
    status: 'running',
    leaseExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
    version: 7,
  });
  const restoreFind = patch(RuntimeWorkItem, 'find', () => queryResult([candidate]));
  let winningPreparationHash;
  const restoreUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (filter, update) => {
    if (filter.status === 'running') {
      if (winningPreparationHash) return null;
      winningPreparationHash = update.$set.leaseTokenHash;
      return { ...candidate, ...update.$set, version: 8 };
    }
    if (
      filter.status === 'retry_preparing' &&
      filter.leaseTokenHash === winningPreparationHash
    ) {
      return { ...candidate, status: 'pending', version: 9 };
    }
    return null;
  });
  try {
    const [first, second] = await Promise.all([
      scanAbandonedWork(
        { now, graceMs: 1_000 },
        {
          outbox: false,
          updateInvocation: false,
          invocationTerminalState: async () => null,
          prepareInvocationForSafeReplay: async () => ({
            allowed: true,
            nextAttemptNumber: 2,
          }),
        },
      ),
      scanAbandonedWork(
        { now, graceMs: 1_000 },
        {
          outbox: false,
          updateInvocation: false,
          invocationTerminalState: async () => null,
          prepareInvocationForSafeReplay: async () => ({
            allowed: true,
            nextAttemptNumber: 2,
          }),
        },
      ),
    ]);
    assert.equal(first.safelyRecovered + second.safelyRecovered, 1);
    assert.equal(first.conflicts + second.conflicts, 1);
  } finally {
    restoreUpdate();
    restoreFind();
  }
});

test('an expired retry_preparing fence is deterministically resumed without consuming another retry', async () => {
  const now = new Date('2030-01-01T00:10:00.000Z');
  const candidate = work({
    status: 'retry_preparing',
    attemptNumber: 2,
    retryCount: 1,
    retryDecisionReason: 'TRANSIENT_IDEMPOTENT_FAILURE',
    availableAt: new Date('2030-01-01T00:05:00.000Z'),
    leaseExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
    version: 7,
  });
  const restoreFind = patch(RuntimeWorkItem, 'find', () => queryResult([candidate]));
  const updates = [];
  const restoreUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (_filter, update) => {
    updates.push(update);
    return {
      ...candidate,
      ...update.$set,
      status: update.$set.status,
      version: 7 + updates.length,
    };
  });
  try {
    const result = await scanAbandonedWork(
      { now, graceMs: 1_000 },
      {
        outbox: false,
        invocationTerminalState: async () => null,
        prepareInvocationForSafeReplay: async () => ({
          allowed: true,
          nextAttemptNumber: 2,
        }),
      },
    );
    assert.equal(result.safelyRecovered, 1);
    assert.equal(updates[0].$set.status, 'retry_preparing');
    assert.deepEqual(updates[0].$inc, { retryCount: 0, version: 1 });
    assert.equal(updates[1].$set.status, 'pending');
  } finally {
    restoreUpdate();
    restoreFind();
  }
});

test('durable retry uses Phase 13B1 approval, persists due time, and enforces maximum attempts', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const raw = crypto.randomBytes(32).toString('base64url');
  const current = work({
    status: 'running',
    leaseExpiresAt: new Date(now.getTime() + 360_000),
    version: 3,
  });
  const updateCalls = [];
  const restoreFind = patch(RuntimeWorkItem, 'findOne', () => queryResult(current));
  const restoreUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (filter, update) => {
    updateCalls.push({ filter, update });
    return {
      ...current,
      ...update.$set,
      retryCount: update.$inc?.retryCount ? 1 : 1,
      version: 3 + updateCalls.length,
    };
  });
  try {
    const result = await scheduleRetry(
      IDS.work,
      { leaseOwner: 'worker:retry', leaseToken: raw },
      { errorCode: 'SAFE_FETCH_TIMEOUT', operation: 'database_read', retryable: true },
      {
        now,
        outbox: false,
        retryDecisionEvaluator: () => ({
          allowed: true,
          reason: 'TRANSIENT_IDEMPOTENT_FAILURE',
          delayMs: 5_000,
        }),
        prepareInvocationForSafeReplay: async () => ({
          allowed: true,
          nextAttemptNumber: 2,
        }),
      },
    );
    assert.equal(result.safe.status, 'retry_scheduled');
    assert.equal(updateCalls[0].update.$set.availableAt.getTime(), now.getTime() + 5_000);
    assert.equal(updateCalls[0].update.$set.status, 'retry_preparing');
    assert.equal(updateCalls[0].update.$set.attemptNumber, 2);
    assert.equal(Object.hasOwn(updateCalls[0].filter, 'version'), false);
    assert.deepEqual(updateCalls[0].update.$inc, { retryCount: 1, version: 1 });
    assert.equal(updateCalls[1].update.$set.status, 'retry_scheduled');
    assert.deepEqual(updateCalls[1].filter.leaseExpiresAt, { $gt: now });
    assert.equal(JSON.stringify(updateCalls).includes(raw), false);

    await assert.rejects(
      () =>
        scheduleRetry(
          IDS.work,
          { leaseOwner: 'worker:retry', leaseToken: raw },
          { errorCode: 'UNSAFE_URL' },
          {
            now,
            outbox: false,
            retryDecisionEvaluator: () => ({ allowed: false, reason: 'UNSAFE_URL' }),
          },
        ),
      { code: ErrorCodes.DURABLE_WORK_RETRY_DENIED },
    );
  } finally {
    restoreUpdate();
    restoreFind();
  }
});

test('retry fencing loses safely before mutating Invocation when ownership changes', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const raw = crypto.randomBytes(32).toString('base64url');
  const current = work({
    status: 'running',
    leaseExpiresAt: new Date(now.getTime() + 360_000),
    version: 3,
  });
  let preparationCalls = 0;
  const restoreFind = patch(RuntimeWorkItem, 'findOne', () => queryResult(current));
  const restoreUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async () => null);
  try {
    await assert.rejects(
      () =>
        scheduleRetry(
          IDS.work,
          { leaseOwner: 'worker:retry-race', leaseToken: raw },
          { errorCode: 'SAFE_FETCH_TIMEOUT', retryable: true },
          {
            now,
            outbox: false,
            retryDecisionEvaluator: () => ({
              allowed: true,
              reason: 'TRANSIENT_IDEMPOTENT_FAILURE',
              delayMs: 5_000,
            }),
            prepareInvocationForSafeReplay: async (_work, input) => {
              preparationCalls += 1;
              assert.equal(input.dryRun, true);
              return { allowed: true, nextAttemptNumber: 2 };
            },
          },
        ),
      { code: ErrorCodes.DURABLE_WORK_LEASE_LOST },
    );
    assert.equal(preparationCalls, 1);
  } finally {
    restoreUpdate();
    restoreFind();
  }
});

test('pending cancellation is terminal and running cancellation remains durable across restart', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  let mode = 'pending';
  const restoreUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (filter, update) => {
    if (mode === 'pending' && filter.status.$in.includes('pending')) {
      return work({ ...update.$set, version: 1 });
    }
    if (mode === 'running' && filter.status.$in.includes('pending')) return null;
    if (mode === 'running' && filter.status.$in.includes('running')) {
      return work({ status: 'cancellation_requested', ...update.$set, version: 1 });
    }
    if (mode === 'preparing' && filter.status.$in.includes('retry_preparing')) {
      return work({ status: 'cancellation_requested', ...update.$set, version: 2 });
    }
    return null;
  });
  try {
    const base = {
      partnerId: IDS.partner,
      receivingWorkspaceId: 'workspace-a',
      connectionId: IDS.connection,
      workItemId: IDS.work,
      reasonCode: 'USER_REQUESTED',
    };
    const pending = await requestWorkCancellation(base, { now, outbox: false });
    assert.equal(pending.safe.status, 'cancelled');
    mode = 'running';
    const running = await requestWorkCancellation(base, { now, outbox: false });
    assert.equal(running.safe.status, 'cancellation_requested');
    assert.equal(running.safe.cancellationReasonCode, 'USER_REQUESTED');
    mode = 'preparing';
    const preparing = await requestWorkCancellation(base, { now, outbox: false });
    assert.equal(preparing.safe.status, 'cancellation_requested');
  } finally {
    restoreUpdate();
  }
});

test('idempotent cancellation retry heals a missing deterministic outbox event', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const cancelled = work({
    status: 'cancelled',
    cancellationRequestedAt: now,
    cancellationReasonCode: 'USER_REQUESTED',
    cancelledAt: now,
  });
  const restoreUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async () => null);
  const restoreFind = patch(RuntimeWorkItem, 'findOne', () => ({
    sort: async () => cancelled,
  }));
  let outboxInsert;
  const restoreOutbox = patch(DurableEventOutbox, 'updateOne', async (_filter, update) => {
    outboxInsert = update.$setOnInsert;
    return { upsertedCount: 1 };
  });
  try {
    const result = await requestWorkCancellation(
      {
        partnerId: IDS.partner,
        receivingWorkspaceId: 'workspace-a',
        connectionId: IDS.connection,
        workItemId: IDS.work,
        reasonCode: 'USER_REQUESTED',
      },
      { now },
    );
    assert.equal(result.alreadyRequested, true);
    assert.equal(outboxInsert.eventType, 'work.cancelled');
    assert.equal(outboxInsert.safeMetadata.cancellationReasonCode, 'USER_REQUESTED');
  } finally {
    restoreOutbox();
    restoreFind();
    restoreUpdate();
  }
});

test('cancellation propagation treats a concurrently terminal Work item as already settled', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const completed = work({ status: 'completed', completedAt: now });
  const restoreUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async () => null);
  const restoreFind = patch(RuntimeWorkItem, 'findOne', () => ({
    sort: async () => completed,
  }));
  let outboxCalls = 0;
  const restoreOutbox = patch(DurableEventOutbox, 'updateOne', async () => {
    outboxCalls += 1;
    return { upsertedCount: 1 };
  });
  try {
    const result = await requestWorkCancellation(
      {
        partnerId: IDS.partner,
        receivingWorkspaceId: 'workspace-a',
        connectionId: IDS.connection,
        workItemId: IDS.work,
        reasonCode: 'USER_REQUESTED',
      },
      { now },
    );
    assert.equal(result.alreadyRequested, true);
    assert.equal(result.alreadySettled, true);
    assert.equal(result.safe.status, 'completed');
    assert.equal(outboxCalls, 0);
  } finally {
    restoreOutbox();
    restoreFind();
    restoreUpdate();
  }
});

test('dead-letter requeue is workspace-authorized, versioned, pre-transmission only, and bounded once', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const dead = work({ status: 'dead_lettered', version: 5, requeueCount: 0 });
  const restoreFind = patch(RuntimeWorkItem, 'findOne', () => queryResult(dead));
  const captured = [];
  const restoreUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (filter, update) => {
    captured.push({ filter, update });
    return {
      ...dead,
      ...update.$set,
      requeueCount: 1,
      version: 5 + captured.length,
    };
  });
  try {
    const result = await requeueDeadLetter(
      {
        partnerId: IDS.partner,
        receivingWorkspaceId: 'workspace-a',
        connectionId: IDS.connection,
        workItemId: IDS.work,
        version: 5,
      },
      {
        now,
        outbox: false,
        prepareInvocationForSafeReplay: async () => ({
          allowed: true,
          nextAttemptNumber: 2,
        }),
      },
    );
    assert.equal(result.safe.status, 'pending');
    assert.equal(captured[0].filter.partnerId, IDS.partner);
    assert.equal(captured[0].filter.receivingWorkspaceId, 'workspace-a');
    assert.equal(captured[0].filter.version, 5);
    assert.deepEqual(captured[0].filter.requeueCount, { $lt: 1 });
    assert.equal(captured[0].update.$set.status, 'retry_preparing');
    assert.equal(captured[0].update.$set.maximumAttempts, 2);
    assert.equal(captured[0].update.$inc.requeueCount, 1);
    assert.equal(captured[1].update.$set.status, 'pending');
    assert.deepEqual(captured[1].filter.leaseExpiresAt, { $gt: now });
  } finally {
    restoreUpdate();
    restoreFind();
  }
});

test('reconciliation creates only safe executable missing work and is idempotent', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  let invocationFilter;
  const accepted = {
    _id: IDS.invocation,
    connectionId: IDS.connection,
    receivingWorkspaceId: 'workspace-a',
    lifecycleState: 'accepted',
    cancellationState: 'not_requested',
    attemptCount: 0,
    executionGeneration: 1,
    protectedReplayAvailable: true,
    traceId: 'trace-safe',
    inputSummary: { prompt: 'must never be copied into work' },
  };
  const restoreInvocations = patch(Invocation, 'find', (filter) => {
    invocationFilter = filter;
    return queryResult([accepted]);
  });
  const restoreConnection = patch(PassportConnection, 'findOne', () =>
    queryResult({
      _id: IDS.connection,
      partnerId: IDS.partner,
      receivingWorkspaceId: 'workspace-a',
      status: 'connected',
    }),
  );
  let created = true;
  let enqueuedDocument;
  const restoreUpdate = patch(RuntimeWorkItem, 'updateOne', async (_filter, update) => {
    enqueuedDocument = update.$setOnInsert;
    const result = { upsertedCount: created ? 1 : 0 };
    created = false;
    return result;
  });
  const restoreWorkFind = patch(RuntimeWorkItem, 'findOne', (filter) =>
    filter.dedupeKey
      ? Promise.resolve(work({ ...enqueuedDocument, traceId: 'trace-safe' }))
      : queryResult(null),
  );
  const restoreInvocationUpdate = patch(Invocation, 'findOneAndUpdate', async () => ({
    ...accepted,
    currentWorkItemId: IDS.work,
  }));
  const restoreWorkUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (_filter, update) =>
    work({ ...enqueuedDocument, ...update.$set, status: 'pending', version: 2 }),
  );
  try {
    const scope = {
      now,
      partnerId: IDS.partner,
      receivingWorkspaceId: 'workspace-a',
      connectionId: IDS.connection,
    };
    const first = await reconcileAcceptedInvocations(scope, { outbox: false });
    const second = await reconcileAcceptedInvocations(scope, { outbox: false });
    assert.equal(first.created, 1);
    assert.equal(second.existing, 1);
    assert.deepEqual(invocationFilter.lifecycleState.$in, ['accepted', 'validating', 'authorized']);
    assert.equal(invocationFilter.receivingWorkspaceId, 'workspace-a');
    assert.equal(invocationFilter.protectedReplayAvailable, true);
    assert.equal(JSON.stringify(enqueuedDocument).includes('prompt'), false);
    assert.equal(JSON.stringify(enqueuedDocument).includes('inputSummary'), false);
  } finally {
    restoreWorkUpdate();
    restoreInvocationUpdate();
    restoreWorkFind();
    restoreUpdate();
    restoreConnection();
    restoreInvocations();
  }
});

test('reconciliation repairs an enqueue-before-link crash under a reserved Work fence', async () => {
  const now = new Date('2030-01-01T00:10:00.000Z');
  const accepted = {
    _id: IDS.invocation,
    connectionId: IDS.connection,
    receivingWorkspaceId: 'workspace-a',
    lifecycleState: 'accepted',
    cancellationState: 'not_requested',
    recoveryState: 'not_required',
    attemptCount: 0,
    executionGeneration: 1,
    protectedReplayAvailable: true,
    createdAt: new Date('2030-01-01T00:00:00.000Z'),
  };
  const existing = work({ status: 'pending', version: 4, currentWorkItemId: undefined });
  const order = [];
  const restoreInvocations = patch(Invocation, 'find', () => queryResult([accepted]));
  const restoreConnection = patch(PassportConnection, 'findOne', () =>
    queryResult({
      _id: IDS.connection,
      partnerId: IDS.partner,
      receivingWorkspaceId: 'workspace-a',
      status: 'connected',
    }),
  );
  const restoreFind = patch(RuntimeWorkItem, 'findOne', () => queryResult(existing));
  const restoreInvocationUpdate = patch(Invocation, 'findOneAndUpdate', async () => {
    order.push('link');
    return { ...accepted, currentWorkItemId: IDS.work };
  });
  let reserved;
  const restoreWorkUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (filter, update) => {
    if (filter.status === 'pending') {
      order.push('reserve');
      reserved = {
        ...existing,
        ...update.$set,
        status: 'claimed',
        version: 5,
      };
      return reserved;
    }
    order.push('release');
    assert.deepEqual(filter.status.$in, ['claimed']);
    return { ...reserved, status: 'pending', version: 6 };
  });
  try {
    const result = await reconcileAcceptedInvocations({ now }, { outbox: false });
    assert.deepEqual(order, ['reserve', 'link', 'release']);
    assert.equal(result.existing, 1);
    assert.equal(result.linked, 1);
    assert.equal(result.skipped, 0);
  } finally {
    restoreWorkUpdate();
    restoreInvocationUpdate();
    restoreFind();
    restoreConnection();
    restoreInvocations();
  }
});

test('reconciliation does not strand an active Invocation linked to terminal Work', async () => {
  const now = new Date('2030-01-01T00:10:00.000Z');
  const accepted = {
    _id: IDS.invocation,
    connectionId: IDS.connection,
    receivingWorkspaceId: 'workspace-a',
    lifecycleState: 'accepted',
    cancellationState: 'not_requested',
    recoveryState: 'not_required',
    attemptCount: 0,
    executionGeneration: 1,
    protectedReplayAvailable: true,
    currentWorkItemId: IDS.work,
    createdAt: new Date('2030-01-01T00:00:00.000Z'),
  };
  const restoreInvocations = patch(Invocation, 'find', () => queryResult([accepted]));
  const restoreConnection = patch(PassportConnection, 'findOne', () =>
    queryResult({
      _id: IDS.connection,
      partnerId: IDS.partner,
      receivingWorkspaceId: 'workspace-a',
      status: 'connected',
    }),
  );
  const restoreWorkFind = patch(RuntimeWorkItem, 'findOne', () =>
    queryResult(
      work({
        status: 'completed',
        completedAt: now,
        currentWorkItemId: IDS.work,
      }),
    ),
  );
  let invocationUpdate;
  const restoreInvocationUpdate = patch(Invocation, 'findOneAndUpdate', async (_filter, update) => {
    invocationUpdate = update;
    return { ...accepted, lifecycleState: 'recovery_required' };
  });
  const restoreAttempts = patch(InvocationAttempt, 'updateMany', async () => ({ modifiedCount: 0 }));
  try {
    const result = await reconcileAcceptedInvocations({ now }, { outbox: false });
    assert.equal(result.terminalReconciled, 1);
    assert.equal(result.skipped, 0);
    assert.equal(invocationUpdate.$set.lifecycleState, 'recovery_required');
    assert.equal(invocationUpdate.$set.currentWorkItemId, IDS.work);
    assert.deepEqual(
      invocationUpdate.$push.stateHistory.$each.map((entry) => [entry.fromState, entry.toState]),
      [
        ['accepted', 'validating'],
        ['validating', 'authorized'],
        ['authorized', 'running'],
        ['running', 'waiting_for_runtime'],
        ['waiting_for_runtime', 'recovery_required'],
      ],
    );
  } finally {
    restoreAttempts();
    restoreInvocationUpdate();
    restoreWorkFind();
    restoreConnection();
    restoreInvocations();
  }
});

test('reconciliation never creates a new generation while any work item already exists', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const accepted = {
    _id: IDS.invocation,
    connectionId: IDS.connection,
    receivingWorkspaceId: 'workspace-a',
    lifecycleState: 'authorized',
    cancellationState: 'not_requested',
    attemptCount: 1,
    executionGeneration: 1,
    protectedReplayAvailable: true,
    currentWorkItemId: IDS.work,
  };
  const restoreInvocations = patch(Invocation, 'find', () => queryResult([accepted]));
  const restoreConnection = patch(PassportConnection, 'findOne', () =>
    queryResult({
      _id: IDS.connection,
      partnerId: IDS.partner,
      receivingWorkspaceId: 'workspace-a',
      status: 'connected',
    }),
  );
  const restoreFind = patch(RuntimeWorkItem, 'findOne', () =>
    queryResult(
      work({
        status: 'claimed',
        executionGeneration: 1,
        leaseExpiresAt: new Date(now.getTime() - 1),
      }),
    ),
  );
  let enqueueCalls = 0;
  const restoreUpdate = patch(RuntimeWorkItem, 'updateOne', async () => {
    enqueueCalls += 1;
    return { upsertedCount: 1 };
  });
  try {
    const result = await reconcileAcceptedInvocations({ now }, { outbox: false });
    assert.equal(result.existing, 1);
    assert.equal(result.created, 0);
    assert.equal(enqueueCalls, 0);
  } finally {
    restoreUpdate();
    restoreFind();
    restoreConnection();
    restoreInvocations();
  }
});

test('simultaneous missing-work reconciliation dedupes on Invocation executionGeneration', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const accepted = {
    _id: IDS.invocation,
    connectionId: IDS.connection,
    receivingWorkspaceId: 'workspace-a',
    lifecycleState: 'accepted',
    cancellationState: 'not_requested',
    attemptCount: 0,
    executionGeneration: 2,
    protectedReplayAvailable: true,
  };
  const restoreInvocations = patch(Invocation, 'find', () => queryResult([accepted]));
  const restoreConnection = patch(PassportConnection, 'findOne', () =>
    queryResult({
      _id: IDS.connection,
      partnerId: IDS.partner,
      receivingWorkspaceId: 'workspace-a',
      status: 'connected',
    }),
  );
  let persisted;
  const restoreFind = patch(RuntimeWorkItem, 'findOne', (filter) => {
    if (!filter.dedupeKey) return queryResult(null);
    return Promise.resolve(persisted);
  });
  let firstInsert = true;
  const restoreUpdate = patch(RuntimeWorkItem, 'updateOne', async (_filter, update) => {
    const created = firstInsert;
    if (created) persisted = work({ ...update.$setOnInsert, executionGeneration: 2 });
    firstInsert = false;
    return { upsertedCount: created ? 1 : 0 };
  });
  const restoreInvocationUpdate = patch(Invocation, 'findOneAndUpdate', async () => ({
    ...accepted,
    currentWorkItemId: IDS.work,
  }));
  const restoreWorkUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async (_filter, update) => {
    persisted = work({ ...persisted, ...update.$set, status: 'pending', version: 2 });
    return persisted;
  });
  try {
    const [first, second] = await Promise.all([
      reconcileAcceptedInvocations({ now }, { outbox: false }),
      reconcileAcceptedInvocations({ now }, { outbox: false }),
    ]);
    assert.equal(first.created + second.created, 1);
    assert.equal(first.existing + second.existing, 1);
    assert.equal(persisted.executionGeneration, 2);
  } finally {
    restoreWorkUpdate();
    restoreInvocationUpdate();
    restoreUpdate();
    restoreFind();
    restoreConnection();
    restoreInvocations();
  }
});

test('repeated milestone delivery is idempotent only for the current valid owner', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const raw = crypto.randomBytes(32).toString('base64url');
  const existing = work({
    status: 'running',
    attemptNumber: 1,
    leaseExpiresAt: new Date(now.getTime() + 360_000),
    safeStage: 'credentials_loaded',
    milestones: [
      { name: 'credentials_loaded', at: now, attemptNumber: 1, safeStatus: 'completed' },
    ],
  });
  const restoreUpdate = patch(RuntimeWorkItem, 'findOneAndUpdate', async () => null);
  const restoreFind = patch(RuntimeWorkItem, 'findOne', async () => existing);
  try {
    const result = await recordMilestone(
      IDS.work,
      { leaseOwner: 'worker:owner', leaseToken: raw },
      { name: 'credentials_loaded', attemptNumber: 1 },
      { now },
    );
    assert.equal(result.alreadyRecorded, true);
    assert.equal(result.safe.safeStage, 'credentials_loaded');
  } finally {
    restoreFind();
    restoreUpdate();
  }
});

test('safe serializers and outbox reject secrets, payloads, lease identities, and raw URLs', async () => {
  const secret = 'agentpass_partner_super-secret-value';
  const serialized = serializeWorkItem(
    work({
      leaseOwner: 'worker:private',
      leaseTokenHash: `sha256:${'d'.repeat(64)}`,
      dedupeKey: `sha256:${'e'.repeat(64)}`,
      prompt: `prompt ${secret}`,
      output: `output ${secret}`,
      sourceUrl: `https://example.test/?token=${secret}`,
    }),
  );
  const json = JSON.stringify(serialized);
  assert.equal(json.includes(secret), false);
  assert.equal(json.includes('leaseOwner'), false);
  assert.equal(json.includes('leaseToken'), false);
  assert.equal(json.includes('dedupeKey'), false);
  assert.equal(json.includes('sourceUrl'), false);

  await assert.rejects(
    () =>
      appendOutboxEvent({
        eventType: 'work.failed',
        partnerId: IDS.partner,
        receivingWorkspaceId: 'workspace-a',
        invocationId: IDS.invocation,
        workItemId: IDS.work,
        connectionId: IDS.connection,
        safeMetadata: { prompt: secret },
      }),
    { code: ErrorCodes.VALIDATION_ERROR },
  );
});

test('durable metrics count and age only tenant-scoped work that is executable now', async () => {
  const now = new Date('2030-01-01T00:10:00.000Z');
  const oldestAvailableAt = new Date('2030-01-01T00:08:00.000Z');
  let pipeline;
  const restoreAggregate = patch(RuntimeWorkItem, 'aggregate', (value) => {
    pipeline = value;
    return {
      option: async () => [
        {
          byStatus: [{ _id: 'pending', count: 4 }],
          dueExecutable: [{ count: 2, oldestAvailableAt }],
          abandoned: [{ count: 1 }],
          queueWait: [{ averageMs: 25 }],
        },
      ],
    };
  });
  try {
    const metrics = await durableWorkMetrics({
      partnerId: IDS.partner,
      receivingWorkspaceId: 'workspace-a',
      connectionId: IDS.connection,
      now,
    });
    assert.equal(metrics.dueExecutableCount, 2);
    assert.equal(metrics.oldestPendingAgeMs, 120_000);
    assert.equal(metrics.counts.pending, 4);
    assert.equal(pipeline[0].$match.partnerId, IDS.partner);
    assert.equal(pipeline[0].$match.receivingWorkspaceId, 'workspace-a');
    assert.equal(pipeline[0].$match.connectionId, IDS.connection);
    const dueMatch = pipeline[1].$facet.dueExecutable[0].$match;
    assert.deepEqual(dueMatch.status.$in, ['pending', 'retry_scheduled']);
    assert.deepEqual(dueMatch.availableAt, { $lte: now });
    assert.deepEqual(dueMatch.cancellationRequestedAt, { $exists: false });
    assert.equal(
      JSON.stringify(pipeline[1].$facet.dueExecutable).includes('$createdAt'),
      false,
    );
    assert.equal(
      JSON.stringify(pipeline[1].$facet.queueWait).includes('$availableAt'),
      true,
    );
    assert.equal(
      JSON.stringify(pipeline[1].$facet.queueWait).includes('$createdAt'),
      false,
    );
  } finally {
    restoreAggregate();
  }
});

test('worker heartbeat records are safe and aggregate readiness distinguishes healthy, draining, stale, and absent', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  let heartbeatUpdate;
  const restoreHeartbeat = patch(
    RuntimeWorkerHeartbeat,
    'findOneAndUpdate',
    async (_filter, update) => {
      heartbeatUpdate = update;
      return {
        ...update.$setOnInsert,
        ...update.$set,
      };
    },
  );
  try {
    const heartbeat = await upsertWorkerHeartbeat({
      workerId: 'worker:health-a',
      status: 'ready',
      startedAt: now,
      lastHeartbeatAt: now,
      activeWorkCount: 2,
      draining: false,
      version: '0.1.0',
    });
    assert.equal(heartbeat.status, 'ready');
    assert.equal(JSON.stringify(heartbeatUpdate).includes('hostname'), false);
    assert.equal(JSON.stringify(heartbeatUpdate).includes('MONGODB_URI'), false);
  } finally {
    restoreHeartbeat();
  }

  let aggregateValue = [
    {
      readyWorkers: 1,
      drainingWorkers: 0,
      staleWorkers: 2,
      activeWorkCount: 3,
      lastHeartbeatAt: now,
    },
  ];
  const restoreAggregate = patch(RuntimeWorkerHeartbeat, 'aggregate', () => ({
    option: async () => aggregateValue,
  }));
  try {
    assert.equal((await aggregateWorkerHealth({ now })).status, 'healthy');
    aggregateValue = [
      { readyWorkers: 0, drainingWorkers: 1, staleWorkers: 0, activeWorkCount: 1 },
    ];
    assert.equal((await aggregateWorkerHealth({ now })).status, 'draining');
    aggregateValue = [{ readyWorkers: 0, drainingWorkers: 0, staleWorkers: 1 }];
    assert.equal((await aggregateWorkerHealth({ now })).status, 'worker_heartbeat_stale');
    aggregateValue = [];
    assert.equal((await aggregateWorkerHealth({ now })).status, 'no_active_worker');
  } finally {
    restoreAggregate();
  }
});

test('explicit durable index creation fails closed and covers all coordination models', async () => {
  const called = [];
  const restoreWork = patch(RuntimeWorkItem, 'createIndexes', async () => called.push('work'));
  const restoreOutbox = patch(DurableEventOutbox, 'createIndexes', async () => called.push('outbox'));
  const restoreWorker = patch(RuntimeWorkerHeartbeat, 'createIndexes', async () => called.push('worker'));
  const restoreInvocation = patch(Invocation, 'createIndexes', async () => called.push('invocation'));
  const restoreAttempt = patch(InvocationAttempt, 'createIndexes', async () => called.push('attempt'));
  try {
    const result = await ensureDurableIndexes();
    assert.deepEqual(called, ['work', 'outbox', 'worker', 'invocation', 'attempt']);
    assert.equal(result.ready, true);
  } finally {
    restoreAttempt();
    restoreInvocation();
    restoreWorker();
    restoreOutbox();
    restoreWork();
  }

  const restoreFailure = patch(RuntimeWorkItem, 'createIndexes', async () => {
    throw new Error('index unavailable');
  });
  try {
    await assert.rejects(() => ensureDurableIndexes(), /index unavailable/);
  } finally {
    restoreFailure();
  }
});

test('transaction helper uses Mongo transactions and falls back only when unsupported', async () => {
  const events = [];
  const session = {
    async withTransaction(callback) {
      events.push('transaction');
      await callback();
    },
    async endSession() {
      events.push('end');
    },
  };
  const value = await withDurableTransaction(
    async ({ transactional, reconciliationRequired }) => {
      events.push('operation');
      return { transactional, reconciliationRequired };
    },
    { connection: { startSession: async () => session } },
  );
  assert.deepEqual(value, { transactional: true, reconciliationRequired: false });
  assert.deepEqual(events, ['transaction', 'operation', 'end']);

  const fallbackSession = {
    async withTransaction() {
      const error = new Error('Transaction numbers are only allowed on a replica set member');
      error.code = 20;
      throw error;
    },
    async endSession() {},
  };
  const fallback = await withDurableTransaction(
    async (context) => context,
    { connection: { startSession: async () => fallbackSession } },
  );
  assert.deepEqual(fallback, {
    session: null,
    transactional: false,
    reconciliationRequired: true,
  });
});

test('durable worker configuration keeps heartbeat below lease and lease above runtime deadline', () => {
  assert.equal(env.DURABLE_WORKER_ENABLED, true);
  assert.ok(env.DURABLE_WORKER_POLL_INTERVAL_MS >= 100);
  assert.ok(env.DURABLE_WORKER_BATCH_SIZE >= env.DURABLE_WORKER_CONCURRENCY);
  assert.ok(env.DURABLE_WORK_HEARTBEAT_MS * 3 <= env.DURABLE_WORK_LEASE_MS);
  assert.ok(env.DURABLE_WORK_LEASE_MS > env.RUNTIME_INVOCATION_TIMEOUT_MS);
  assert.ok(env.DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS >= env.DURABLE_WORK_MAX_ATTEMPTS);
});
