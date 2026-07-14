const assert = require('node:assert/strict');
const test = require('node:test');
const Invocation = require('../models/Invocation');
const InvocationAttempt = require('../models/InvocationAttempt');
const {
  ALLOWED_INVOCATION_TRANSITIONS,
  MAX_INVOCATION_STATE_HISTORY,
  TERMINAL_INVOCATION_STATES,
} = require('../constants/invocationLifecycle');
const {
  assertTransition,
  canTransition,
  claimInvocationExecution,
  initialLifecycleFields,
  markExpiredInvocationLeaseRecovery,
  transitionInvocation,
  transitionUpdate,
} = require('../services/invocationLifecycle.service');

const INVOCATION_ID = '507f1f77bcf86cd799439011';
const CONNECTION_ID = '507f1f77bcf86cd799439012';
const PASSPORT_ID = '507f1f77bcf86cd799439013';
const WORKSPACE_ID = 'workspace-a';

function leanResult(value) {
  return {
    select() {
      return leanResult(value);
    },
    lean: async () => value,
  };
}

test('the invocation lifecycle declares every allowed transition and rejects all others', () => {
  for (const [fromState, allowedStates] of Object.entries(ALLOWED_INVOCATION_TRANSITIONS)) {
    for (const toState of allowedStates) {
      assert.equal(canTransition(fromState, toState), true, `${fromState} -> ${toState}`);
      assert.doesNotThrow(() => assertTransition(fromState, toState));
    }
  }

  for (const terminalState of TERMINAL_INVOCATION_STATES) {
    assert.deepEqual(ALLOWED_INVOCATION_TRANSITIONS[terminalState], []);
    assert.throws(
      () => assertTransition(terminalState, 'running'),
      (error) => error.code === 'INVOCATION_STATE_TRANSITION_INVALID',
    );
  }
  assert.throws(
    () => assertTransition('accepted', 'succeeded'),
    (error) => error.code === 'INVOCATION_STATE_TRANSITION_INVALID',
  );
});

test('initial lifecycle state and compatibility status are deterministic', () => {
  const now = new Date('2026-07-13T10:00:00.000Z');
  const fields = initialLifecycleFields({ now, traceId: 'trace-safe', requestId: 'req-safe' });
  assert.equal(fields.lifecycleState, 'accepted');
  assert.equal(fields.status, 'queued');
  assert.equal(fields.lifecycleTimestamps.acceptedAt, now);
  assert.deepEqual(fields.stateHistory, [
    {
      fromState: null,
      toState: 'accepted',
      at: now,
      reasonCode: 'INVOCATION_CREATED',
      traceId: 'trace-safe',
      requestId: 'req-safe',
    },
  ]);
});

test('new legacy Invocation documents receive an authoritative lifecycle projection', async () => {
  const invocation = new Invocation({
    connectionId: CONNECTION_ID,
    passportId: PASSPORT_ID,
    receivingWorkspaceId: WORKSPACE_ID,
    capability: 'research_topic',
    status: 'running',
    runtimeType: 'rest',
    traceId: 'trace-safe',
    requestId: 'req-safe',
  });
  await invocation.validate();
  assert.equal(invocation.lifecycleState, 'running');
  assert.equal(invocation.stateHistory.length, 1);
  assert.equal(invocation.stateHistory[0].toState, 'running');
  assert.ok(invocation.lifecycleTimestamps.runningAt instanceof Date);
});

test('atomic transitions filter by tenant and expected state and bound safe history', async () => {
  const originalFindOneAndUpdate = Invocation.findOneAndUpdate;
  let captured;
  try {
    Invocation.findOneAndUpdate = async (filter, update, options) => {
      captured = { filter, update, options };
      return { _id: INVOCATION_ID, lifecycleState: update.$set.lifecycleState };
    };
    const now = new Date('2026-07-13T10:01:00.000Z');
    await transitionInvocation({
      invocationId: INVOCATION_ID,
      receivingWorkspaceId: WORKSPACE_ID,
      fromState: 'validating',
      toState: 'authorized',
      now,
      reasonCode: 'POLICY_APPROVED',
      traceId: 'trace-safe',
      requestId: 'req-safe',
    });

    assert.deepEqual(captured.filter, {
      _id: INVOCATION_ID,
      receivingWorkspaceId: WORKSPACE_ID,
      lifecycleState: 'validating',
    });
    assert.equal(captured.update.$set.lifecycleState, 'authorized');
    assert.equal(captured.update.$set.status, 'queued');
    assert.equal(captured.update.$set['lifecycleTimestamps.authorizedAt'], now);
    assert.equal(captured.update.$push.stateHistory.$slice, -MAX_INVOCATION_STATE_HISTORY);
    assert.deepEqual(Object.keys(captured.update.$push.stateHistory.$each[0]).sort(), [
      'at',
      'fromState',
      'reasonCode',
      'requestId',
      'toState',
      'traceId',
    ]);
    assert.equal(captured.options.new, true);
    assert.equal(captured.options.runValidators, true);
  } finally {
    Invocation.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('terminal outcome persistence is allowlisted and strips raw failure content', () => {
  const secret = 'Bearer raw-secret-token-value';
  const update = transitionUpdate('waiting_for_runtime', 'failed', {
    reasonCode: 'REMOTE_FAILURE',
    outcome: {
      durationMs: 125,
      attemptCount: 1,
      retryState: 'not_allowed',
      retryDecisionReason: 'AUTHENTICATION_FAILURE',
      error: {
        code: 'GEMINI_AUTHENTICATION_FAILED',
        stage: 'structured_formatting',
        retryable: false,
        providerHttpStatus: 502,
        message: secret,
        details: [{ Authorization: secret }],
      },
      stageMetrics: [
        { stage: 'external_runtime_invocation', status: 'failed', durationMs: 124.567 },
      ],
    },
  });
  assert.equal(update.$set.error.code, 'GEMINI_AUTHENTICATION_FAILED');
  assert.equal(update.$set.error.providerHttpStatus, 502);
  assert.equal(update.$set.error.message, undefined);
  assert.equal(update.$set.error.details, undefined);
  assert.equal(update.$set.stageMetrics[0].durationMs, 124.57);
  assert.doesNotMatch(
    JSON.stringify(update),
    /raw-secret-token-value|Authorization|message|details/,
  );
  assert.throws(
    () =>
      transitionUpdate('waiting_for_runtime', 'failed', {
        outcome: { credential: secret },
      }),
    (error) => error.code === 'VALIDATION_ERROR',
  );
});

test('simultaneous execution claims allow one owner and reject the second safely', async () => {
  const originalFindOneAndUpdate = Invocation.findOneAndUpdate;
  const originalFindOne = Invocation.findOne;
  let authorizedClaimCalls = 0;
  try {
    Invocation.findOneAndUpdate = async (filter, update) => {
      if (filter.lifecycleState === 'authorized') {
        authorizedClaimCalls += 1;
        return authorizedClaimCalls === 1
          ? { _id: INVOCATION_ID, lifecycleState: update.$set.lifecycleState }
          : null;
      }
      return null;
    };
    Invocation.findOne = () => leanResult({ _id: INVOCATION_ID, lifecycleState: 'running' });
    const first = await claimInvocationExecution({
      invocationId: INVOCATION_ID,
      receivingWorkspaceId: WORKSPACE_ID,
      executionOwner: 'worker-a',
      executionLeaseId: 'lease-a',
      leaseDurationMs: 60_000,
      now: new Date('2026-07-13T10:00:00.000Z'),
    });
    assert.equal(first.invocation.lifecycleState, 'running');
    assert.equal(first.executionLeaseId, 'lease-a');

    await assert.rejects(
      claimInvocationExecution({
        invocationId: INVOCATION_ID,
        receivingWorkspaceId: WORKSPACE_ID,
        executionOwner: 'worker-b',
        executionLeaseId: 'lease-b',
        leaseDurationMs: 60_000,
        now: new Date('2026-07-13T10:00:01.000Z'),
      }),
      (error) => error.code === 'INVOCATION_CONCURRENT_CLAIM_REJECTED',
    );
  } finally {
    Invocation.findOneAndUpdate = originalFindOneAndUpdate;
    Invocation.findOne = originalFindOne;
  }
});

test('an expired ambiguous execution lease atomically enters recovery_required', async () => {
  const original = Invocation.findOneAndUpdate;
  let captured;
  try {
    Invocation.findOneAndUpdate = async (filter, update) => {
      captured = { filter, update };
      return { _id: INVOCATION_ID, lifecycleState: 'recovery_required' };
    };
    const now = new Date('2026-07-13T10:05:00.000Z');
    const invocation = await markExpiredInvocationLeaseRecovery({
      invocationId: INVOCATION_ID,
      receivingWorkspaceId: WORKSPACE_ID,
      now,
    });
    assert.equal(invocation.lifecycleState, 'recovery_required');
    assert.equal(captured.filter.lifecycleState, 'running');
    assert.deepEqual(captured.filter.executionLeaseExpiresAt, { $lte: now });
    assert.equal(captured.update.$set.lifecycleState, 'recovery_required');
    assert.equal(captured.update.$set.recoveryReasonCode, 'EXECUTION_LEASE_EXPIRED');
    assert.deepEqual(captured.update.$unset, {
      executionLeaseId: 1,
      executionLeaseExpiresAt: 1,
      executionOwner: 1,
    });
  } finally {
    Invocation.findOneAndUpdate = original;
  }
});

test('InvocationAttempt is tenant-indexed, uniquely numbered, and rejects payload fields', async () => {
  const indexes = InvocationAttempt.schema.indexes();
  assert.ok(
    indexes.some(
      ([keys, options]) =>
        keys.invocationId === 1 && keys.attemptNumber === 1 && options.unique === true,
    ),
  );
  assert.ok(
    indexes.some(
      ([keys]) => keys.receivingWorkspaceId === 1 && keys.status === 1 && keys.createdAt === -1,
    ),
  );

  assert.throws(
    () =>
      new InvocationAttempt({
        invocationId: INVOCATION_ID,
        receivingWorkspaceId: WORKSPACE_ID,
        connectionId: CONNECTION_ID,
        attemptNumber: 1,
        runtimeType: 'rest',
        startedAt: new Date(),
        prompt: 'private task input',
      }),
    /prompt.*not in schema/i,
  );

  const attempt = new InvocationAttempt({
    invocationId: INVOCATION_ID,
    receivingWorkspaceId: WORKSPACE_ID,
    connectionId: CONNECTION_ID,
    attemptNumber: 1,
    runtimeType: 'rest',
    startedAt: new Date('2026-07-13T10:00:00.000Z'),
    completedAt: new Date('2026-07-13T10:00:01.000Z'),
    durationMs: 1000,
    status: 'failed',
    safeStage: 'external_runtime_invocation',
    errorCode: 'SAFE_FETCH_TIMEOUT',
    retryable: true,
    timeoutReason: 'REMOTE_OUTCOME_AMBIGUOUS',
    retryDecision: 'denied',
    retryDecisionReason: 'REMOTE_IDEMPOTENCY_NOT_CONFIRMED',
  });
  await attempt.validate();
  assert.doesNotMatch(
    JSON.stringify(attempt.toObject()),
    /prompt|output|sourceUrl|Authorization|credential/i,
  );
});

test('Invocation idempotency and lease indexes contain no raw-key field', () => {
  assert.equal(Invocation.schema.path('idempotencyKey'), undefined);
  assert.ok(Invocation.schema.path('idempotencyKeyHash'));
  assert.ok(Invocation.schema.path('requestFingerprint'));
  const indexes = Invocation.schema.indexes();
  const unique = indexes.find(
    ([, options]) => options.name === 'unique_workspace_invocation_idempotency',
  );
  assert.ok(unique);
  assert.deepEqual(unique[0], {
    receivingWorkspaceId: 1,
    idempotencyScope: 1,
    idempotencyKeyHash: 1,
  });
  assert.equal(unique[1].unique, true);
});
