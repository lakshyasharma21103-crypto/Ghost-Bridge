const assert = require('node:assert/strict');
const test = require('node:test');

const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  createDurableWorker,
  executeClaimedWork,
  safeWorkerError,
} = require('../services/durableWorker.service');

const LEASE_TOKEN = 'lease-token-that-is-at-least-thirty-two-characters';

function leaseLost() {
  return new AppError(409, ErrorCodes.DURABLE_WORK_LEASE_LOST, 'Ownership is no longer active.');
}

function claim(number = 1) {
  return {
    workItem: {
      _id: `64a00000000000000000000${number}`,
      invocationId: `64b00000000000000000000${number}`,
      connectionId: `64c00000000000000000000${number}`,
      receivingWorkspaceId: 'workspace-safe',
      traceId: `trace-${number}`,
      attemptNumber: 1,
      executionGeneration: 1,
      maximumAttempts: 2,
    },
    ownership: { leaseOwner: `worker:${number}`, leaseToken: LEASE_TOKEN },
  };
}

function quietLogger() {
  return {
    error() {},
    info() {},
    warn() {},
  };
}

function nonUnrefTimers() {
  return {
    clearTimeout(timer) {
      clearTimeout(timer.handle);
    },
    setTimeout(callback, durationMs) {
      return { handle: setTimeout(callback, durationMs) };
    },
  };
}

test('worker IDs are unique opaque values and contain no host identity', () => {
  const first = createDurableWorker({ autoPoll: false }).snapshot().workerId;
  const second = createDurableWorker({ autoPoll: false }).snapshot().workerId;

  assert.match(first, /^worker:[0-9a-f-]{36}$/);
  assert.match(second, /^worker:[0-9a-f-]{36}$/);
  assert.notEqual(first, second);
  assert.equal(first.includes(process.env.COMPUTERNAME || '\0'), false);
});

test('claimed work invokes the gateway with durable ownership and a fresh abort signal', async () => {
  const signals = [];

  for (const number of [1, 2]) {
    let completed = false;
    const current = claim(number);
    const result = await executeClaimedWork(current, {
      workerId: current.ownership.leaseOwner,
      dependencies: {
        databaseStatus: () => 'connected',
        async startWork() {},
        async getOwnedWorkControlState() {
          if (completed) throw leaseLost();
          return { status: 'running', cancellationRequested: false };
        },
        async loadInvocation() {
          return { capability: 'research', requestId: `request-${number}` };
        },
        async invoke(connectionId, capability, input, actor) {
          signals.push(actor.signal);
          assert.equal(connectionId, current.workItem.connectionId);
          assert.equal(capability, 'research');
          assert.equal(input, undefined);
          assert.equal(actor.durableInvocationId, current.workItem.invocationId);
          assert.equal(actor.durableWorkItemId, current.workItem._id);
          assert.deepEqual(actor.durableWorkOwnership, current.ownership);
          assert.equal(actor.durableHeartbeatManaged, true);
          assert.equal(actor.requireDurablePersistence, true);
          assert.deepEqual(actor.runtimeProtectionOptions, { forcePersistence: true });
          completed = true;
          return { status: 'succeeded' };
        },
      },
    });
    assert.equal(result.status, 'succeeded');
  }

  assert.notEqual(signals[0], signals[1]);
  assert.equal(
    signals.every((signal) => signal instanceof AbortSignal),
    true,
  );
});

test('active work heartbeat renews work, invocation, attempt, and capacity ownership', async () => {
  const calls = [];
  let completed = false;
  let heartbeatObserved;
  const observed = new Promise((resolve) => {
    heartbeatObserved = resolve;
  });

  await executeClaimedWork(claim(3), {
    workerId: 'worker:3',
    heartbeatMs: 5,
    leaseMs: 1_000,
    timers: nonUnrefTimers(),
    onHeartbeat: heartbeatObserved,
    dependencies: {
      databaseStatus: () => 'connected',
      async startWork() {},
      async getOwnedWorkControlState() {
        if (completed) throw leaseLost();
        return { status: 'running', cancellationRequested: false };
      },
      async heartbeatWork() {
        calls.push('work');
        return { workItem: {}, cancellationRequested: false };
      },
      async renewRuntimeExecutionOwnership(ownership) {
        calls.push('runtime');
        return { ...ownership, renewed: true };
      },
      async loadInvocation() {
        return { capability: 'research' };
      },
      async invoke(connectionId, capability, input, actor) {
        await actor.onExecutionClaimed({
          invocationId: 'invocation',
          receivingWorkspaceId: 'workspace-safe',
          executionOwner: 'worker:3',
          executionLeaseId: 'execution-lease',
          attemptId: 'attempt',
          capacityLease: { leaseId: 'capacity' },
        });
        await observed;
        completed = true;
        return { status: 'succeeded' };
      },
    },
  });

  assert.deepEqual(calls.slice(0, 2), ['work', 'runtime']);
});

test('durable cancellation is checked before gateway execution and finalized safely', async () => {
  let invoked = false;
  const finalizations = [];

  await assert.rejects(
    executeClaimedWork(claim(4), {
      workerId: 'worker:4',
      dependencies: {
        databaseStatus: () => 'connected',
        async startWork() {},
        async getOwnedWorkControlState() {
          return {
            status: 'cancellation_requested',
            cancellationRequested: true,
            cancellationReasonCode: 'USER_REQUESTED',
          };
        },
        async finalizeWork(workItemId, ownership, input) {
          finalizations.push(input);
        },
        async invoke() {
          invoked = true;
        },
      },
    }),
    (error) => error.code === ErrorCodes.INVOCATION_CANCELLED,
  );

  assert.equal(invoked, false);
  assert.deepEqual(finalizations, [
    {
      status: 'cancelled',
      lastErrorCode: ErrorCodes.INVOCATION_CANCELLED,
      retryDecisionReason: 'INVOCATION_CANCELLED',
    },
  ]);
});

test('database loss aborts local execution and does not finalize without ownership', async () => {
  let statusChecks = 0;
  let finalized = false;

  await assert.rejects(
    executeClaimedWork(claim(5), {
      workerId: 'worker:5',
      heartbeatMs: 5,
      leaseMs: 1_000,
      timers: nonUnrefTimers(),
      dependencies: {
        databaseStatus() {
          statusChecks += 1;
          return statusChecks < 2 ? 'connected' : 'unavailable';
        },
        async startWork() {},
        async getOwnedWorkControlState() {
          return { status: 'running', cancellationRequested: false };
        },
        async loadInvocation() {
          return { capability: 'research' };
        },
        async invoke(connectionId, capability, input, actor) {
          if (actor.signal.aborted) throw actor.signal.reason;
          await new Promise((resolve) =>
            actor.signal.addEventListener('abort', resolve, { once: true }),
          );
          throw actor.signal.reason;
        },
        async finalizeWork() {
          finalized = true;
        },
      },
    }),
    (error) =>
      error.code === ErrorCodes.DURABLE_WORK_LEASE_LOST &&
      error.reasonCode === 'DURABLE_DATABASE_UNAVAILABLE',
  );

  assert.equal(finalized, false);
});

test('worker bounds claims by concurrency, stops claiming on shutdown, and drains active work', async () => {
  const queued = [claim(6), claim(7), claim(8)];
  const releases = new Map();
  const heartbeatStatuses = [];
  let disconnected = 0;
  let databaseState = 'connected';
  const maintenance = [];

  const worker = createDurableWorker({
    autoPoll: false,
    batchSize: 2,
    concurrency: 2,
    dependencies: {
      async connectDatabase() {
        databaseState = 'connected';
      },
      databaseStatus: () => databaseState,
      async disconnectDatabase() {
        disconnected += 1;
        databaseState = 'disconnected';
      },
      async ensureDurableIndexes() {},
      async scanAbandonedWork() {
        maintenance.push('scan');
      },
      async reconcileAcceptedInvocations() {
        maintenance.push('reconcile');
      },
      async upsertWorkerHeartbeat(input) {
        heartbeatStatuses.push(input.status);
      },
      async claimNextWork() {
        return queued.shift() || null;
      },
      async executeClaimedWork(current, options) {
        await new Promise((resolve) => {
          releases.set(current.workItem._id, { resolve, signal: options.controller.signal });
        });
      },
      logger: quietLogger(),
    },
  });

  await worker.start();
  assert.equal(await worker.pollOnce(), 2);
  assert.equal(worker.snapshot().activeWorkCount, 2);
  assert.equal(await worker.pollOnce(), 0);
  assert.deepEqual(maintenance, ['scan', 'reconcile']);

  const stopping = worker.shutdown('test');
  await Promise.resolve();
  assert.equal(worker.snapshot().acceptingClaims, false);
  assert.equal(await worker.pollOnce(), 0);
  for (const entry of releases.values()) entry.resolve();
  const result = await stopping;

  assert.equal(result.drained, true);
  assert.equal(result.forced, false);
  assert.equal(disconnected, 1);
  assert.deepEqual(heartbeatStatuses.slice(0, 2), ['starting', 'ready']);
  assert.equal(heartbeatStatuses.includes('draining'), true);
  assert.equal(heartbeatStatuses.at(-1), 'stopped');
  assert.equal(queued.length, 1);
});

test('a claim completing during shutdown is tracked and drained instead of orphaned', async () => {
  let releaseClaim;
  let releaseExecution;
  let claimStarted;
  let executionStarted;
  const claimGate = new Promise((resolve) => {
    releaseClaim = resolve;
  });
  const claimObserved = new Promise((resolve) => {
    claimStarted = resolve;
  });
  const executionGate = new Promise((resolve) => {
    releaseExecution = resolve;
  });
  const executionObserved = new Promise((resolve) => {
    executionStarted = resolve;
  });
  let disconnected = false;

  const worker = createDurableWorker({
    autoPoll: false,
    dependencies: {
      async connectDatabase() {},
      databaseStatus: () => (disconnected ? 'disconnected' : 'connected'),
      async disconnectDatabase() {
        disconnected = true;
      },
      async ensureDurableIndexes() {},
      async scanAbandonedWork() {},
      async reconcileAcceptedInvocations() {},
      async upsertWorkerHeartbeat() {},
      async claimNextWork() {
        claimStarted();
        await claimGate;
        return claim(9);
      },
      async executeClaimedWork() {
        executionStarted();
        await executionGate;
      },
      logger: quietLogger(),
    },
  });

  await worker.start();
  const polling = worker.pollOnce();
  await claimObserved;
  const stopping = worker.shutdown('claim-race');
  releaseClaim();
  await executionObserved;

  assert.equal(worker.snapshot().activeWorkCount, 1);
  releaseExecution();
  assert.equal(await polling, 1);
  const result = await stopping;

  assert.equal(result.drained, true);
  assert.equal(result.forced, false);
  assert.equal(disconnected, true);
});

test('forced shutdown aborts unresolved work after the drain deadline and clears worker timers', async () => {
  let claimed = false;
  let executionSignal;
  let disconnected = false;
  const recoveryCalls = [];
  const timers = {
    clearTimeout(timer) {
      if (timer?.immediate) {
        timer.cancelled = true;
        return;
      }
      clearTimeout(timer);
    },
    setTimeout(callback, durationMs) {
      if (durationMs <= 1_000) {
        const timer = { cancelled: false, immediate: true };
        queueMicrotask(() => {
          if (!timer.cancelled) callback();
        });
        return timer;
      }
      return setTimeout(callback, durationMs);
    },
  };
  const worker = createDurableWorker({
    autoPoll: false,
    shutdownDrainMs: 1_000,
    timers,
    dependencies: {
      async connectDatabase() {},
      databaseStatus: () => (disconnected ? 'disconnected' : 'connected'),
      async disconnectDatabase() {
        disconnected = true;
      },
      async ensureDurableIndexes() {},
      async scanAbandonedWork() {},
      async reconcileAcceptedInvocations() {},
      async upsertWorkerHeartbeat() {},
      async markActiveInvocationRecovery(input) {
        recoveryCalls.push(input);
        return { lifecycleState: 'recovery_required' };
      },
      async claimNextWork() {
        if (claimed) return null;
        claimed = true;
        return claim(10);
      },
      async executeClaimedWork(current, options) {
        executionSignal = options.controller.signal;
        options.onExecutionClaimed({
          invocationId: current.workItem.invocationId,
          receivingWorkspaceId: current.workItem.receivingWorkspaceId,
          executionOwner: 'worker:10',
          executionLeaseId: 'runtime-lease-safe',
        });
        options.onDurableProgress('outbound_request_started');
        await new Promise(() => {});
      },
      logger: quietLogger(),
    },
  });

  await worker.start();
  assert.equal(await worker.pollOnce(), 1);
  const result = await worker.shutdown('test-deadline');

  assert.equal(result.drained, false);
  assert.equal(result.forced, true);
  assert.equal(executionSignal.aborted, true);
  assert.equal(executionSignal.reason.code, ErrorCodes.SHUTDOWN_INTERRUPTED_INVOCATION);
  assert.equal(disconnected, true);
  assert.equal(worker.snapshot().status, 'stopped');
  assert.equal(recoveryCalls.length, 1);
  assert.equal(recoveryCalls[0].invocationId, claim(10).workItem.invocationId);
  assert.equal(recoveryCalls[0].reasonCode, 'SHUTDOWN_DURING_EXTERNAL_INVOCATION');
});

test('worker-safe diagnostics never include provider messages or secret values', () => {
  const error = new Error('prompt=do-not-print token=super-secret');
  error.code = 'SAFE_FAILURE';
  const serialized = JSON.stringify(safeWorkerError(error));

  assert.equal(serialized.includes('do-not-print'), false);
  assert.equal(serialized.includes('super-secret'), false);
  assert.deepEqual(JSON.parse(serialized), { errorCode: 'SAFE_FAILURE', errorName: 'Error' });
});
