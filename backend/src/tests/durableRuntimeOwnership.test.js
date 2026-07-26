const assert = require('node:assert/strict');
const test = require('node:test');
const Invocation = require('../models/Invocation');
const InvocationAttempt = require('../models/InvocationAttempt');
const RuntimeCapacitySlot = require('../models/RuntimeCapacitySlot');
const {
  ambiguousRuntimeOutcome,
  renewRuntimeExecutionOwnership,
} = require('../services/runtimeGateway.service');
const { ErrorCodes } = require('../utils/errorCodes');

function patch(object, key, replacement) {
  const original = object[key];
  object[key] = replacement;
  return () => {
    object[key] = original;
  };
}

function terminalAttemptQuery(value) {
  const query = {
    select() {
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
  return query;
}

test('ownership heartbeat accepts a same-owner attempt that terminalized during finalization', async () => {
  const expiresAt = new Date('2030-01-01T00:06:00.000Z');
  const restoreInvocation = patch(Invocation, 'findOneAndUpdate', async () => ({
    executionLeaseExpiresAt: expiresAt,
  }));
  const restoreAttemptUpdate = patch(InvocationAttempt, 'findOneAndUpdate', async () => null);
  const restoreAttemptFind = patch(InvocationAttempt, 'findOne', () =>
    terminalAttemptQuery({ status: 'succeeded' }),
  );
  const restoreCapacity = patch(RuntimeCapacitySlot, 'updateMany', async () => ({
    matchedCount: 2,
  }));
  try {
    const renewed = await renewRuntimeExecutionOwnership(
      {
        invocationId: '507f1f77bcf86cd799439011',
        receivingWorkspaceId: 'workspace-a',
        executionOwner: 'worker:opaque',
        executionLeaseId: '1b6f7a92-ff90-4e2c-a1a0-8896f26c3850',
        attemptId: '507f1f77bcf86cd799439012',
        capacityLease: {
          workspaceId: 'workspace-a',
          invocationId: '507f1f77bcf86cd799439011',
          connectionId: '507f1f77bcf86cd799439013',
          leaseId: '1b6f7a92-ff90-4e2c-a1a0-8896f26c3850',
        },
      },
      { now: new Date('2030-01-01T00:00:00.000Z'), leaseDurationMs: 360_000 },
    );
    assert.ok(renewed);
    assert.equal(renewed.executionLeaseExpiresAt.toISOString(), expiresAt.toISOString());
  } finally {
    restoreCapacity();
    restoreAttemptFind();
    restoreAttemptUpdate();
    restoreInvocation();
  }
});

test('ownership heartbeat rejects a missing or differently owned attempt', async () => {
  const restoreInvocation = patch(Invocation, 'findOneAndUpdate', async () => ({
    executionLeaseExpiresAt: new Date('2030-01-01T00:06:00.000Z'),
  }));
  const restoreAttemptUpdate = patch(InvocationAttempt, 'findOneAndUpdate', async () => null);
  const restoreAttemptFind = patch(InvocationAttempt, 'findOne', () => terminalAttemptQuery(null));
  try {
    const renewed = await renewRuntimeExecutionOwnership(
      {
        invocationId: '507f1f77bcf86cd799439011',
        receivingWorkspaceId: 'workspace-a',
        executionOwner: 'worker:stale',
        executionLeaseId: '2b6f7a92-ff90-4e2c-a1a0-8896f26c3850',
        attemptId: '507f1f77bcf86cd799439012',
        capacityLease: {
          workspaceId: 'workspace-a',
          invocationId: '507f1f77bcf86cd799439011',
          leaseId: '2b6f7a92-ff90-4e2c-a1a0-8896f26c3850',
        },
      },
      { now: new Date('2030-01-01T00:00:00.000Z'), leaseDurationMs: 360_000 },
    );
    assert.equal(renewed, null);
  } finally {
    restoreAttemptFind();
    restoreAttemptUpdate();
    restoreInvocation();
  }
});

test('shutdown and ownership loss are ambiguous only after outbound transmission', () => {
  for (const code of [
    ErrorCodes.SHUTDOWN_INTERRUPTED_INVOCATION,
    ErrorCodes.DURABLE_WORK_LEASE_LOST,
    ErrorCodes.DURABLE_WORK_FINALIZATION_CONFLICT,
  ]) {
    assert.equal(ambiguousRuntimeOutcome({ code }, { externalCallStarted: false }), false);
    assert.equal(ambiguousRuntimeOutcome({ code }, { externalCallStarted: true }), true);
  }
  assert.equal(
    ambiguousRuntimeOutcome(
      { code: ErrorCodes.INTERNAL_SERVER_ERROR },
      { externalCallStarted: true, responsePersistenceUncertain: true },
    ),
    true,
  );
});
