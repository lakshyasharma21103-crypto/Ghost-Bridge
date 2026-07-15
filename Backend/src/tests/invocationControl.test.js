const assert = require('node:assert/strict');
const test = require('node:test');
const AuditLog = require('../models/AuditLog');
const Invocation = require('../models/Invocation');
const InvocationAttempt = require('../models/InvocationAttempt');
const PassportConnection = require('../models/PassportConnection');
const RuntimeCapacitySlot = require('../models/RuntimeCapacitySlot');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { createInvocationIdempotency } = require('../utils/idempotency');
const { classifyStuckInvocation } = require('../utils/stuckInvocation');
const { recoveryPolicyDecision } = require('../utils/recoveryPolicy');
const { serializeOperationalInvocation } = require('../utils/invocationControlView');
const {
  manualResolve,
  manualRetry,
  requestCancellation,
  scanStuckInvocations,
} = require('../services/invocationControl.service');
const { serviceLifecycle } = require('../services/serviceLifecycle.service');
const runtimeGateway = require('../services/runtimeGateway.service');

const IDS = Object.freeze({
  invocation: '64b000000000000000000001',
  connection: '64b000000000000000000002',
  passport: '64b000000000000000000003',
  partner: '64b000000000000000000004',
  child: '64b000000000000000000005',
  work: '64b000000000000000000006',
});
const HASH = `hmac-sha256:${'a'.repeat(64)}`;

function patch(object, key, value, patches) {
  patches.push([object, key, object[key]]);
  object[key] = value;
}

function restore(patches) {
  for (const [object, key, value] of patches.reverse()) object[key] = value;
}

function invocation(overrides = {}) {
  const inputSummary = { topic: 'safe replay topic' };
  const fingerprint = createInvocationIdempotency({
    clientKey: 'irrelevant-to-fingerprint',
    connectionId: IDS.connection,
    capability: 'research_topic',
    input: inputSummary,
  }).requestFingerprint;
  return {
    _id: IDS.invocation,
    __v: 2,
    connectionId: IDS.connection,
    passportId: IDS.passport,
    receivingWorkspaceId: 'workspace-a',
    capability: 'research_topic',
    runtimeType: 'rest',
    status: 'failed',
    lifecycleState: 'recovery_required',
    cancellationState: 'not_requested',
    cancellationOutcome: 'not_applicable',
    recoveryState: 'required',
    recoveryReasonCode: 'STALE_BEFORE_REMOTE_TRANSMISSION',
    recoveryEligible: true,
    recoveryDecision: 'operator_review_required',
    stuckClassification: 'stale_before_runtime',
    lastProgressStage: 'request_mapped',
    lastProgressAt: new Date('2030-01-01T00:00:00.000Z'),
    inputSummary,
    requestFingerprint: fingerprint,
    idempotencyKeyHash: HASH,
    clientIdempotencyProvided: true,
    attemptCount: 1,
    traceId: 'trace-safe',
    requestId: 'request-safe',
    error: { code: 'SAFE_FETCH_FAILED', stage: 'external_runtime_invocation', retryable: true },
    createdAt: new Date('2030-01-01T00:00:00.000Z'),
    updatedAt: new Date('2030-01-01T00:01:00.000Z'),
    ...overrides,
  };
}

function connection(overrides = {}) {
  return {
    _id: IDS.connection,
    partnerId: IDS.partner,
    receivingWorkspaceId: 'workspace-a',
    receivingUserId: 'user-a',
    status: 'connected',
    healthStatus: 'healthy',
    runtimeControl: {
      cancellationMode: 'unsupported',
      remoteIdempotencySupported: false,
      statusLookupSupported: false,
    },
    ...overrides,
  };
}

function actor(overrides = {}) {
  return {
    partner: { _id: IDS.partner },
    requestId: 'request-control',
    traceId: 'trace-control',
    observer: { emit() {} },
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    receivingWorkspaceId: 'workspace-a',
    receivingUserId: 'user-a',
    ...overrides,
  };
}

function queryResult(value) {
  return {
    select() {
      return Promise.resolve(value);
    },
  };
}

test('control models expose bounded safe cancellation, recovery, progress, and stuck fields', () => {
  const invocationPaths = Invocation.schema.paths;
  for (const field of [
    'cancellationState',
    'cancelRequestedAt',
    'cancelRequestedBy',
    'cancelReasonCode',
    'cancellationConfirmedAt',
    'cancellationOutcome',
    'cancellationRequestId',
    'cancellationTraceId',
    'recoveryState',
    'recoveryEligible',
    'recoveryDecision',
    'recoveryRequestedAt',
    'recoveryRequestedBy',
    'recoveryCompletedAt',
    'recoveryClaimId',
    'stuckDetectedAt',
    'stuckClassification',
    'lastProgressAt',
    'lastProgressStage',
    'runtimeDeadlineAt',
    'terminalizedAt',
  ]) {
    assert.ok(invocationPaths[field], `${field} must be persisted`);
  }
  assert.deepEqual(invocationPaths.cancelReasonCode.options.enum, [
    'USER_REQUESTED',
    'ADMIN_REQUESTED',
    'CLIENT_DISCONNECTED',
    'SERVICE_SHUTDOWN',
    'EXECUTION_TIMEOUT',
    'STUCK_INVOCATION',
    'REMOTE_OUTCOME_UNKNOWN',
    'OPERATOR_CONFIRMED_CANCELLED',
  ]);
  assert.ok(PassportConnection.schema.paths.runtimeControl);
  const indexes = Invocation.schema.indexes().map(([definition]) => JSON.stringify(definition));
  assert.ok(indexes.some((value) => value.includes('lastProgressAt')));
  assert.ok(indexes.some((value) => value.includes('runtimeDeadlineAt')));
});

test('stuck classification respects the runtime deadline and distinguishes deterministic evidence', () => {
  const now = new Date('2030-01-01T00:10:00.000Z');
  const options = { now, stuckGraceMs: 60_000, finalizationGraceMs: 30_000 };
  assert.equal(
    classifyStuckInvocation(
      {
        lifecycleState: 'waiting_for_runtime',
        lastProgressStage: 'request_mapped',
        lastProgressAt: new Date('2030-01-01T00:00:00.000Z'),
        runtimeDeadlineAt: new Date('2030-01-01T00:20:00.000Z'),
      },
      options,
    ).classification,
    'not_stuck',
  );
  assert.equal(
    classifyStuckInvocation(
      {
        lifecycleState: 'running',
        lastProgressStage: 'request_mapped',
        lastProgressAt: new Date('2030-01-01T00:00:00.000Z'),
      },
      options,
    ).classification,
    'stale_before_runtime',
  );
  assert.equal(
    classifyStuckInvocation(
      {
        lifecycleState: 'waiting_for_runtime',
        lastProgressStage: 'outbound_request_started',
        lastProgressAt: new Date('2030-01-01T00:00:00.000Z'),
        runtimeDeadlineAt: new Date('2030-01-01T00:08:00.000Z'),
      },
      options,
    ).classification,
    'external_runtime_overdue',
  );
  assert.equal(
    classifyStuckInvocation(
      {
        lifecycleState: 'running',
        lastProgressStage: 'execution_claimed',
        lastProgressAt: now,
        executionLeaseExpiresAt: new Date('2030-01-01T00:09:00.000Z'),
      },
      options,
    ).classification,
    'lease_expired',
  );
  assert.equal(
    classifyStuckInvocation(
      {
        lifecycleState: 'waiting_for_runtime',
        lastProgressStage: 'finalization_started',
        lastProgressAt: new Date('2030-01-01T00:09:00.000Z'),
      },
      options,
    ).classification,
    'finalization_stalled',
  );
});

test('recovery policy allows only replay-proven work and ambiguity dominates stale stage metadata', () => {
  const safe = invocation();
  assert.deepEqual(
    recoveryPolicyDecision({
      invocation: safe,
      transmissionEvidence: 'not_transmitted',
      replayInputAvailable: true,
      idempotencyIdentityAvailable: true,
      connectionStatus: 'connected',
      connectionHealthState: 'healthy',
    }),
    {
      action: 'retry_allowed',
      reason: 'NO_REMOTE_TRANSMISSION',
      requiresSameIdempotencyKey: true,
    },
  );

  const unknown = invocation({
    cancellationState: 'outcome_unknown',
    cancellationOutcome: 'remote_unconfirmed',
    recoveryReasonCode: 'REMOTE_TIMEOUT_OUTCOME_AMBIGUOUS',
  });
  assert.equal(
    recoveryPolicyDecision({
      invocation: unknown,
      transmissionEvidence: 'not_transmitted',
      replayInputAvailable: true,
      idempotencyIdentityAvailable: true,
    }).reason,
    'REMOTE_OUTCOME_UNKNOWN',
  );
  assert.equal(
    recoveryPolicyDecision({
      invocation: unknown,
      transmissionEvidence: 'transmitted',
      replayInputAvailable: true,
      idempotencyIdentityAvailable: true,
      remoteIdempotencySupported: true,
      remoteIdempotencyAcknowledged: true,
    }).action,
    'retry_allowed',
  );
  assert.equal(
    recoveryPolicyDecision({
      invocation: invocation({ error: { code: 'CREDENTIAL_REQUIRED' } }),
      transmissionEvidence: 'not_transmitted',
      replayInputAvailable: true,
      idempotencyIdentityAvailable: true,
    }).reason,
    'FAILURE_CLASS_NOT_RETRYABLE',
  );
  assert.equal(
    recoveryPolicyDecision({
      invocation: invocation({
        recoveryDecision: 'retry_denied',
        recoveryDecisionReason: 'CREDENTIAL_EXPIRED',
      }),
      transmissionEvidence: 'not_transmitted',
      replayInputAvailable: true,
      idempotencyIdentityAvailable: true,
    }).reason,
    'FAILURE_CLASS_NOT_RETRYABLE',
  );
  assert.equal(
    recoveryPolicyDecision({
      invocation: invocation({
        recoveryDecision: 'retry_denied',
        recoveryDecisionReason: 'CIRCUIT_OPEN',
      }),
      transmissionEvidence: 'not_transmitted',
      replayInputAvailable: true,
      idempotencyIdentityAvailable: true,
    }).action,
    'retry_allowed',
  );
  assert.equal(
    recoveryPolicyDecision({
      invocation: safe,
      transmissionEvidence: 'not_transmitted',
      replayInputAvailable: false,
      idempotencyIdentityAvailable: true,
    }).reason,
    'REPLAY_INPUT_NOT_AVAILABLE',
  );
});

test('operational invocation projection exposes controls but never task data, output, or raw errors', () => {
  const source = invocation({
    output: { secret: 'provider-output-secret' },
    inputSummary: { topic: 'private prompt value' },
    error: {
      code: 'SAFE_FETCH_FAILED',
      stage: 'external_runtime_invocation',
      rawBody: 'provider-body-secret',
      stack: 'private stack',
    },
  });
  const view = serializeOperationalInvocation(source, connection());
  assert.equal(view.runtimeType, 'rest');
  assert.equal(view.lifecycleState, 'recovery_required');
  assert.equal(view.safeError.code, 'SAFE_FETCH_FAILED');
  assert.equal(view.availableActions.resolveFailed.allowed, true);
  const serialized = JSON.stringify(view);
  for (const forbidden of [
    'provider-output-secret',
    'private prompt value',
    'provider-body-secret',
    'private stack',
    'inputSummary',
    'output',
    'rawBody',
  ]) {
    assert.equal(serialized.includes(forbidden), false, `${forbidden} must not be exposed`);
  }
});

test('pre-transmission cancellation is confirmed, idempotent, and tenant scoped', async () => {
  const patches = [];
  const current = invocation({
    lifecycleState: 'authorized',
    status: 'queued',
    cancellationState: 'not_requested',
    recoveryState: 'not_required',
    recoveryReasonCode: undefined,
    stuckClassification: 'not_stuck',
    lastProgressStage: 'authorized',
  });
  let updateCalls = 0;
  let cancellationCalls = 0;
  patch(Invocation, 'findOne', () => queryResult(current), patches);
  patch(PassportConnection, 'findOne', async () => connection(), patches);
  patch(AuditLog, 'create', async (payload) => payload, patches);
  patch(
    Invocation,
    'findOneAndUpdate',
    async (_filter, update) => {
      updateCalls += 1;
      Object.assign(current, update.$set);
      current.__v += 1;
      return current;
    },
    patches,
  );
  patch(
    serviceLifecycle,
    'requestCancellation',
    () => {
      cancellationCalls += 1;
      return { found: false, requested: false };
    },
    patches,
  );
  try {
    const first = await requestCancellation(
      IDS.invocation,
      input({ reasonCode: 'USER_REQUESTED' }),
      actor(),
    );
    assert.equal(first.lifecycleState, 'cancelled');
    assert.equal(first.cancellationState, 'confirmed');
    assert.equal(first.recoveryRequired, false);
    const second = await requestCancellation(
      IDS.invocation,
      input({ reasonCode: 'USER_REQUESTED' }),
      actor(),
    );
    assert.equal(second.idempotent, true);
    assert.equal(updateCalls, 1);
    assert.equal(cancellationCalls, 1);

    patch(PassportConnection, 'findOne', async () => null, patches);
    await assert.rejects(() => requestCancellation(IDS.invocation, input(), actor()), {
      code: ErrorCodes.INVOCATION_NOT_FOUND,
    });
  } finally {
    restore(patches);
  }
});

test('durable Work notification failure cannot undo cancellation or skip the local abort', async () => {
  const patches = [];
  const events = [];
  const current = invocation({
    lifecycleState: 'authorized',
    status: 'queued',
    cancellationState: 'not_requested',
    recoveryState: 'not_required',
    recoveryReasonCode: undefined,
    stuckClassification: 'not_stuck',
    lastProgressStage: 'authorized',
    currentWorkItemId: IDS.work,
  });
  patch(Invocation, 'findOne', () => queryResult(current), patches);
  patch(PassportConnection, 'findOne', async () => connection(), patches);
  patch(AuditLog, 'create', async (payload) => payload, patches);
  patch(
    Invocation,
    'findOneAndUpdate',
    async (_filter, update) => {
      Object.assign(current, update.$set);
      return current;
    },
    patches,
  );
  patch(
    RuntimeWorkItem,
    'findOneAndUpdate',
    async () => {
      throw new AppError(
        503,
        ErrorCodes.DURABLE_WORK_FINALIZATION_CONFLICT,
        'private provider output must not escape',
      );
    },
    patches,
  );
  let cancellationCalls = 0;
  patch(
    serviceLifecycle,
    'requestCancellation',
    () => {
      cancellationCalls += 1;
      return { found: true, requested: true };
    },
    patches,
  );
  try {
    const result = await requestCancellation(
      IDS.invocation,
      input({ reasonCode: 'USER_REQUESTED' }),
      actor({ observer: { emit: (...entry) => events.push(entry) } }),
    );
    assert.equal(result.lifecycleState, 'cancelled');
    assert.equal(result.cancellationState, 'confirmed');
    assert.equal(result.localAbortRequested, true);
    assert.equal(cancellationCalls, 1);
    assert.ok(
      events.some((entry) => entry[1] === 'invocation.cancel.durable_notification_deferred'),
    );
    assert.doesNotMatch(JSON.stringify(events), /private provider output/i);
  } finally {
    restore(patches);
  }
});

test('transmitted cancellation becomes recovery_required and never claims remote confirmation', async () => {
  const patches = [];
  const audits = [];
  const current = invocation({
    lifecycleState: 'waiting_for_runtime',
    status: 'running',
    cancellationState: 'not_requested',
    cancellationOutcome: 'not_applicable',
    recoveryState: 'not_required',
    recoveryReasonCode: undefined,
    lastProgressStage: 'outbound_request_started',
    executionLeaseId: 'lease-safe',
    executionOwner: 'owner-safe',
  });
  patch(Invocation, 'findOne', () => queryResult(current), patches);
  patch(PassportConnection, 'findOne', async () => connection(), patches);
  patch(
    AuditLog,
    'create',
    async (payload) => {
      audits.push(payload);
      return payload;
    },
    patches,
  );
  patch(
    Invocation,
    'findOneAndUpdate',
    async (_filter, update) => {
      Object.assign(current, update.$set);
      return current;
    },
    patches,
  );
  let aborted = 0;
  patch(
    serviceLifecycle,
    'requestCancellation',
    () => {
      aborted += 1;
      return { found: true, requested: true, externalCallStarted: true };
    },
    patches,
  );
  try {
    const result = await requestCancellation(
      IDS.invocation,
      input({ reasonCode: 'USER_REQUESTED' }),
      actor(),
    );
    assert.equal(result.cancellationState, 'outcome_unknown');
    assert.equal(result.cancellationOutcome, 'remote_unconfirmed');
    assert.equal(result.recoveryRequired, true);
    assert.equal(aborted, 1);
    assert.ok(audits.some((entry) => entry.action === 'invocation.cancel.aborting'));
    assert.ok(audits.some((entry) => entry.action === 'invocation.cancel.outcome_unknown'));
    assert.ok(audits.some((entry) => entry.action === 'invocation.recovery.eligible'));
    assert.doesNotMatch(JSON.stringify(audits), /safe replay topic|credential|bearer|token/i);
  } finally {
    restore(patches);
  }
});

test('a recovery parent cannot be cancelled while its retry child is active', async () => {
  const patches = [];
  const current = invocation({
    recoveryState: 'retrying',
    recoveryChildInvocationId: IDS.child,
  });
  let writes = 0;
  let localAbortRequests = 0;
  patch(Invocation, 'findOne', () => queryResult(current), patches);
  patch(PassportConnection, 'findOne', async () => connection(), patches);
  patch(AuditLog, 'create', async (payload) => payload, patches);
  patch(
    Invocation,
    'findOneAndUpdate',
    async () => {
      writes += 1;
      return null;
    },
    patches,
  );
  patch(
    serviceLifecycle,
    'requestCancellation',
    () => {
      localAbortRequests += 1;
      return { requested: false };
    },
    patches,
  );
  try {
    await assert.rejects(
      () => requestCancellation(IDS.invocation, input(), actor()),
      (error) =>
        error.code === ErrorCodes.INVOCATION_CANCELLATION_REJECTED &&
        error.reasonCode === 'RECOVERY_RETRY_IN_PROGRESS',
    );
    assert.equal(writes, 0);
    assert.equal(localAbortRequests, 0);
  } finally {
    restore(patches);
  }
});

test('terminal cancellation is rejected without rewriting the invocation', async () => {
  const patches = [];
  let writes = 0;
  patch(
    Invocation,
    'findOne',
    () => queryResult(invocation({ lifecycleState: 'succeeded', status: 'completed' })),
    patches,
  );
  patch(PassportConnection, 'findOne', async () => connection(), patches);
  patch(AuditLog, 'create', async (payload) => payload, patches);
  patch(
    Invocation,
    'findOneAndUpdate',
    async () => {
      writes += 1;
      return null;
    },
    patches,
  );
  try {
    await assert.rejects(() => requestCancellation(IDS.invocation, input(), actor()), {
      code: ErrorCodes.INVOCATION_CANCELLATION_REJECTED,
    });
    assert.equal(writes, 0);
  } finally {
    restore(patches);
  }
});

test('resolved recovery cancellation emits a safe rejected audit', async () => {
  const patches = [];
  const current = invocation({ recoveryState: 'resolved', recoveryEligible: false });
  const auditActions = [];
  patch(Invocation, 'findOne', () => queryResult(current), patches);
  patch(PassportConnection, 'findOne', async () => connection(), patches);
  patch(
    AuditLog,
    'create',
    async (payload) => {
      auditActions.push(payload.action);
      return payload;
    },
    patches,
  );
  try {
    await assert.rejects(
      () => requestCancellation(IDS.invocation, input(), actor()),
      (error) =>
        error.code === ErrorCodes.INVOCATION_CANCELLATION_REJECTED &&
        error.reasonCode === 'RECOVERY_ALREADY_RESOLVED',
    );
    assert.ok(auditActions.includes('invocation.cancel.requested'));
    assert.ok(auditActions.includes('invocation.cancel.rejected'));
  } finally {
    restore(patches);
  }
});

test('stuck scan is bounded, tenant scoped, atomic, idempotent, and releases only matching expiry', async () => {
  const patches = [];
  const now = new Date('2030-01-01T00:10:00.000Z');
  const candidate = invocation({
    lifecycleState: 'waiting_for_runtime',
    status: 'running',
    lastProgressStage: 'outbound_request_started',
    lastProgressAt: new Date('2030-01-01T00:00:00.000Z'),
    runtimeDeadlineAt: new Date('2030-01-01T00:01:00.000Z'),
    executionLeaseId: 'lease-expired',
    executionLeaseExpiresAt: new Date('2030-01-01T00:02:00.000Z'),
  });
  patch(
    PassportConnection,
    'find',
    () => ({
      select: () => ({
        lean: async () => [connection({ receivingUserId: 'user-actual-owner' })],
      }),
    }),
    patches,
  );
  const observedLimits = [];
  patch(
    Invocation,
    'find',
    (filter) => ({
      select() {
        return this;
      },
      sort() {
        return this;
      },
      limit(limit) {
        observedLimits.push(limit);
        return Promise.resolve(filter.recoveryState === 'retrying' ? [] : [candidate]);
      },
    }),
    patches,
  );
  let updateCount = 0;
  patch(
    Invocation,
    'findOneAndUpdate',
    async (_filter, update) => {
      updateCount += 1;
      if (updateCount > 1) return null;
      return { ...candidate, ...update.$set };
    },
    patches,
  );
  patch(InvocationAttempt, 'findOneAndUpdate', async () => null, patches);
  let releaseFilter;
  patch(
    RuntimeCapacitySlot,
    'deleteMany',
    async (filter) => {
      releaseFilter = filter;
      return { deletedCount: 2 };
    },
    patches,
  );
  const scanAudits = [];
  patch(
    AuditLog,
    'create',
    async (payload) => {
      scanAudits.push(payload);
      return payload;
    },
    patches,
  );
  try {
    const first = await scanStuckInvocations(input({ limit: 1000 }), actor({ now }));
    assert.equal(observedLimits[0], 100);
    assert.equal(first.detected, 1);
    assert.equal(first.recoveryRequired, 1);
    assert.equal(releaseFilter.invocationId, IDS.invocation);
    assert.equal(releaseFilter.leaseId, 'lease-expired');
    assert.deepEqual(releaseFilter.leaseExpiresAt, { $lte: now });
    assert.ok(scanAudits.length >= 2);
    assert.ok(scanAudits.every((entry) => entry.metadata.receivingUserId === 'user-actual-owner'));
    const second = await scanStuckInvocations(input({ limit: 100 }), actor({ now }));
    assert.equal(second.detected, 0);
  } finally {
    restore(patches);
  }
});

test('stale accepted scan cancellation emits requested and confirmed audit events', async () => {
  const patches = [];
  const now = new Date('2030-01-01T00:10:00.000Z');
  const candidate = invocation({
    lifecycleState: 'accepted',
    status: 'queued',
    recoveryState: 'not_required',
    lastProgressStage: 'accepted',
    lastProgressAt: new Date('2030-01-01T00:00:00.000Z'),
    executionLeaseId: undefined,
    executionLeaseExpiresAt: undefined,
  });
  patch(
    PassportConnection,
    'find',
    () => ({ select: () => ({ lean: async () => [connection()] }) }),
    patches,
  );
  patch(
    Invocation,
    'find',
    (filter) => ({
      select() {
        return this;
      },
      sort() {
        return this;
      },
      limit() {
        return Promise.resolve(filter.recoveryState === 'retrying' ? [] : [candidate]);
      },
    }),
    patches,
  );
  patch(
    Invocation,
    'findOneAndUpdate',
    async (_filter, update) => ({ ...candidate, ...update.$set }),
    patches,
  );
  patch(InvocationAttempt, 'findOneAndUpdate', async () => null, patches);
  const auditActions = [];
  patch(
    AuditLog,
    'create',
    async (payload) => {
      auditActions.push(payload.action);
      return payload;
    },
    patches,
  );
  try {
    const result = await scanStuckInvocations(input({ limit: 10 }), actor({ now }));
    assert.equal(result.cancelled, 1);
    assert.ok(auditActions.includes('invocation.stuck.detected'));
    assert.ok(auditActions.includes('invocation.stuck.resolved'));
    assert.ok(auditActions.includes('invocation.cancel.requested'));
    assert.ok(auditActions.includes('invocation.cancel.confirmed'));
  } finally {
    restore(patches);
  }
});

test('expired recovery claim finds a reverse-linked active child and keeps it exclusively claimed', async () => {
  const patches = [];
  const now = new Date('2030-01-01T00:10:00.000Z');
  const parent = invocation({
    recoveryState: 'retrying',
    recoveryClaimId: 'claim-active-child',
    recoveryClaimExpiresAt: new Date('2030-01-01T00:09:00.000Z'),
  });
  const child = invocation({
    _id: IDS.child,
    lifecycleState: 'waiting_for_runtime',
    status: 'running',
    recoveryState: 'not_required',
    recoveryParentInvocationId: IDS.invocation,
    lastProgressStage: 'outbound_request_started',
  });
  patch(
    PassportConnection,
    'find',
    () => ({ select: () => ({ lean: async () => [connection()] }) }),
    patches,
  );
  patch(
    Invocation,
    'find',
    (filter) => ({
      select() {
        return this;
      },
      sort() {
        return this;
      },
      limit() {
        return Promise.resolve(filter.recoveryState === 'retrying' ? [parent] : []);
      },
    }),
    patches,
  );
  let childFilter;
  let childSort;
  patch(
    Invocation,
    'findOne',
    (filter) => {
      childFilter = filter;
      const query = {
        select() {
          return query;
        },
        sort(value) {
          childSort = value;
          return Promise.resolve(child);
        },
      };
      return query;
    },
    patches,
  );
  patch(
    Invocation,
    'findOneAndUpdate',
    async () => {
      throw new Error('an active recovery child must not release or resolve its parent claim');
    },
    patches,
  );
  try {
    const result = await scanStuckInvocations(input({ limit: 10 }), actor({ now }));
    assert.equal(result.detected, 0);
    assert.equal(result.recoveryClaimsReleased, 0);
    assert.equal(result.recoveryClaimsResolved, 0);
    assert.equal(childFilter._id, undefined);
    assert.equal(childFilter.recoveryParentInvocationId, IDS.invocation);
    assert.deepEqual(childSort, { createdAt: -1 });
  } finally {
    restore(patches);
  }
});

test('expired recovery claim without a child restores original safe retry evidence', async () => {
  const patches = [];
  const now = new Date('2030-01-01T00:10:00.000Z');
  const parent = invocation({
    recoveryState: 'retrying',
    recoveryClaimId: 'claim-before-child',
    recoveryClaimExpiresAt: new Date('2030-01-01T00:09:00.000Z'),
    recoveryChildInvocationId: undefined,
  });
  patch(
    PassportConnection,
    'find',
    () => ({ select: () => ({ lean: async () => [connection()] }) }),
    patches,
  );
  patch(
    Invocation,
    'find',
    (filter) => ({
      select() {
        return this;
      },
      sort() {
        return this;
      },
      limit() {
        return Promise.resolve(filter.recoveryState === 'retrying' ? [parent] : []);
      },
    }),
    patches,
  );
  let childFilter;
  patch(
    Invocation,
    'findOne',
    (filter) => {
      childFilter = filter;
      const query = {
        select() {
          return query;
        },
        sort() {
          return Promise.resolve(null);
        },
      };
      return query;
    },
    patches,
  );
  let updateDocument;
  patch(
    Invocation,
    'findOneAndUpdate',
    async (_filter, update) => {
      updateDocument = update;
      return { ...parent, ...update.$set };
    },
    patches,
  );
  const auditActions = [];
  patch(
    AuditLog,
    'create',
    async (payload) => {
      auditActions.push(payload.action);
      return payload;
    },
    patches,
  );
  try {
    const result = await scanStuckInvocations(input({ limit: 10 }), actor({ now }));
    assert.equal(result.recoveryClaimsReleased, 1);
    assert.equal(updateDocument.$set.recoveryState, 'required');
    assert.equal(updateDocument.$set.recoveryDecision, 'retry_allowed');
    assert.equal(updateDocument.$set.recoveryDecisionReason, 'NO_REMOTE_TRANSMISSION');
    assert.equal(Object.hasOwn(updateDocument.$set, 'recoveryReasonCode'), false);
    assert.equal(Object.hasOwn(updateDocument.$set, 'stuckClassification'), false);
    assert.equal(childFilter.recoveryParentInvocationId, IDS.invocation);
    assert.deepEqual(auditActions, ['invocation.recovery.eligible']);
  } finally {
    restore(patches);
  }
});

test('expired recovery claim resolves and backfills a reverse-linked successful child', async () => {
  const patches = [];
  const now = new Date('2030-01-01T00:10:00.000Z');
  const parent = invocation({
    recoveryState: 'retrying',
    recoveryClaimId: 'claim-succeeded-child',
    recoveryClaimExpiresAt: new Date('2030-01-01T00:09:00.000Z'),
  });
  const child = invocation({
    _id: IDS.child,
    lifecycleState: 'succeeded',
    status: 'completed',
    recoveryState: 'not_required',
    recoveryParentInvocationId: IDS.invocation,
  });
  patch(
    PassportConnection,
    'find',
    () => ({ select: () => ({ lean: async () => [connection()] }) }),
    patches,
  );
  patch(
    Invocation,
    'find',
    (filter) => ({
      select() {
        return this;
      },
      sort() {
        return this;
      },
      limit() {
        return Promise.resolve(filter.recoveryState === 'retrying' ? [parent] : []);
      },
    }),
    patches,
  );
  patch(
    Invocation,
    'findOne',
    () => {
      const query = {
        select() {
          return query;
        },
        sort() {
          return Promise.resolve(child);
        },
      };
      return query;
    },
    patches,
  );
  let updateFilter;
  let updateDocument;
  patch(
    Invocation,
    'findOneAndUpdate',
    async (filter, update) => {
      updateFilter = filter;
      updateDocument = update;
      return { ...parent, ...update.$set };
    },
    patches,
  );
  const auditActions = [];
  patch(
    AuditLog,
    'create',
    async (payload) => {
      auditActions.push(payload.action);
      return payload;
    },
    patches,
  );
  try {
    const result = await scanStuckInvocations(input({ limit: 10 }), actor({ now }));
    assert.equal(result.detected, 1);
    assert.equal(result.recoveryClaimsReleased, 0);
    assert.equal(result.recoveryClaimsResolved, 1);
    assert.equal(updateFilter.recoveryClaimId, 'claim-succeeded-child');
    assert.deepEqual(updateFilter.$or, [
      { recoveryChildInvocationId: { $exists: false } },
      { recoveryChildInvocationId: null },
    ]);
    assert.equal(updateDocument.$set.recoveryState, 'resolved');
    assert.equal(updateDocument.$set.recoveryDecisionReason, 'SAFE_RETRY_CHILD_SUCCEEDED');
    assert.equal(updateDocument.$set.recoveryChildInvocationId, IDS.child);
    assert.deepEqual(updateDocument.$unset, {
      recoveryClaimId: 1,
      recoveryClaimExpiresAt: 1,
    });
    assert.deepEqual(auditActions, ['invocation.recovery.resolved']);
  } finally {
    restore(patches);
  }
});

test('expired recovery claim links a pre-transmission failed child without manufacturing ambiguity', async () => {
  const patches = [];
  const now = new Date('2030-01-01T00:10:00.000Z');
  const parent = invocation({
    recoveryState: 'retrying',
    recoveryClaimId: 'claim-pre-transmission-child',
    recoveryClaimExpiresAt: new Date('2030-01-01T00:09:00.000Z'),
  });
  const child = invocation({
    _id: IDS.child,
    lifecycleState: 'failed',
    status: 'failed',
    recoveryState: 'not_required',
    recoveryParentInvocationId: IDS.invocation,
    lastProgressStage: 'request_mapped',
    error: { code: ErrorCodes.CIRCUIT_OPEN, retryable: true },
  });
  patch(
    PassportConnection,
    'find',
    () => ({ select: () => ({ lean: async () => [connection()] }) }),
    patches,
  );
  patch(
    Invocation,
    'find',
    (filter) => ({
      select() {
        return this;
      },
      sort() {
        return this;
      },
      limit() {
        return Promise.resolve(filter.recoveryState === 'retrying' ? [parent] : []);
      },
    }),
    patches,
  );
  patch(
    Invocation,
    'findOne',
    () => {
      const query = {
        select() {
          return query;
        },
        sort() {
          return Promise.resolve(child);
        },
      };
      return query;
    },
    patches,
  );
  let updateDocument;
  let releasedInvocation;
  patch(
    Invocation,
    'findOneAndUpdate',
    async (_filter, update) => {
      updateDocument = update;
      releasedInvocation = { ...parent, ...update.$set };
      return releasedInvocation;
    },
    patches,
  );
  const auditActions = [];
  patch(
    AuditLog,
    'create',
    async (payload) => {
      auditActions.push(payload.action);
      return payload;
    },
    patches,
  );
  try {
    const result = await scanStuckInvocations(input({ limit: 10 }), actor({ now }));
    assert.equal(result.recoveryClaimsReleased, 1);
    assert.equal(updateDocument.$set.recoveryState, 'required');
    assert.equal(updateDocument.$set.recoveryEligible, true);
    assert.equal(updateDocument.$set.recoveryDecision, 'retry_denied');
    assert.equal(updateDocument.$set.recoveryDecisionReason, ErrorCodes.CIRCUIT_OPEN);
    assert.equal(updateDocument.$set.recoveryChildInvocationId, IDS.child);
    assert.equal(Object.hasOwn(updateDocument.$set, 'recoveryReasonCode'), false);
    assert.equal(Object.hasOwn(updateDocument.$set, 'stuckClassification'), false);
    assert.deepEqual(auditActions, ['invocation.recovery.retry_denied']);
    assert.equal(
      serializeOperationalInvocation(releasedInvocation, connection()).recoveryDecision,
      'retry_allowed',
    );
  } finally {
    restore(patches);
  }
});

test('manual resolution is optimistic, recovery-only, and preserves original failure evidence', async () => {
  const patches = [];
  const current = invocation();
  patch(Invocation, 'findOne', () => queryResult(current), patches);
  patch(PassportConnection, 'findOne', async () => connection(), patches);
  patch(AuditLog, 'create', async (payload) => payload, patches);
  let updateFilter;
  let updateDocument;
  patch(
    Invocation,
    'findOneAndUpdate',
    async (filter, update) => {
      updateFilter = filter;
      updateDocument = update;
      return { ...current, ...update.$set };
    },
    patches,
  );
  try {
    const result = await manualResolve(
      IDS.invocation,
      input({
        version: 2,
        resolution: 'failed',
        reasonCode: 'OPERATOR_CONFIRMED_REMOTE_FAILURE',
      }),
      actor(),
    );
    assert.equal(updateFilter.lifecycleState, 'recovery_required');
    assert.equal(updateFilter.__v, 2);
    assert.equal(updateDocument.$set.recoveryState, 'resolved');
    assert.equal(Object.hasOwn(updateDocument.$set, 'error'), false);
    assert.equal(result.safeError.code, 'SAFE_FETCH_FAILED');
  } finally {
    restore(patches);
  }
});

test('manual cancelled resolution emits recovery and confirmed-cancellation audits', async () => {
  const patches = [];
  const current = invocation();
  const auditActions = [];
  patch(Invocation, 'findOne', () => queryResult(current), patches);
  patch(PassportConnection, 'findOne', async () => connection(), patches);
  patch(
    AuditLog,
    'create',
    async (payload) => {
      auditActions.push(payload.action);
      return payload;
    },
    patches,
  );
  patch(
    Invocation,
    'findOneAndUpdate',
    async (_filter, update) => ({ ...current, ...update.$set }),
    patches,
  );
  try {
    const result = await manualResolve(
      IDS.invocation,
      input({
        version: 2,
        resolution: 'cancelled',
        reasonCode: 'OPERATOR_CONFIRMED_CANCELLED',
      }),
      actor(),
    );
    assert.equal(result.lifecycleState, 'cancelled');
    assert.equal(result.cancellationState, 'confirmed');
    assert.ok(auditActions.includes('invocation.recovery.resolved'));
    assert.ok(auditActions.includes('invocation.cancel.confirmed'));
  } finally {
    restore(patches);
  }
});

test('succeeded invocation retry is denied without a misleading recovery conflict', async () => {
  const patches = [];
  const current = invocation({
    lifecycleState: 'succeeded',
    status: 'completed',
    recoveryState: 'not_required',
    recoveryEligible: false,
  });
  const auditActions = [];
  patch(Invocation, 'findOne', () => queryResult(current), patches);
  patch(PassportConnection, 'findOne', async () => connection(), patches);
  patch(
    AuditLog,
    'create',
    async (payload) => {
      auditActions.push(payload.action);
      return payload;
    },
    patches,
  );
  patch(
    Invocation,
    'findOneAndUpdate',
    async () => {
      throw new Error('immutable succeeded work must not enter a recovery update');
    },
    patches,
  );
  try {
    await assert.rejects(
      () => manualRetry(IDS.invocation, input({ version: 2 }), actor()),
      (error) =>
        error.code === ErrorCodes.INVOCATION_RECOVERY_ACTION_DENIED &&
        error.reasonCode === 'RECOVERY_NOT_REQUIRED',
    );
    assert.deepEqual(auditActions, [
      'invocation.recovery.retry_requested',
      'invocation.recovery.retry_denied',
    ]);
  } finally {
    restore(patches);
  }
});

test('simultaneous manual retry claims once and preserves remote idempotency', async () => {
  const patches = [];
  const original = invocation();
  patch(Invocation, 'findOne', () => queryResult(original), patches);
  patch(PassportConnection, 'findOne', async () => connection(), patches);
  patch(AuditLog, 'create', async (payload) => payload, patches);
  patch(Invocation, 'updateOne', async () => ({ modifiedCount: 1 }), patches);
  let claimAvailable = true;
  let claimUpdate;
  patch(
    Invocation,
    'findOneAndUpdate',
    async (filter, update) => {
      if (filter.$or) {
        if (!claimAvailable) return null;
        claimAvailable = false;
        claimUpdate = update;
        return { ...original, ...update.$set };
      }
      if (filter.recoveryClaimExpiresAt?.$gt) {
        return { ...original, ...update.$set };
      }
      if (filter.recoveryState === 'retrying') {
        return { ...original, ...update.$set, recoveryChildInvocationId: IDS.child };
      }
      return null;
    },
    patches,
  );
  let runtimeCalls = 0;
  let runtimeActor;
  patch(
    runtimeGateway,
    'invoke',
    async (_connectionId, _capability, _replayInput, invocationActor) => {
      runtimeCalls += 1;
      runtimeActor = invocationActor;
      await invocationActor.onInvocationCreated(IDS.child);
      await new Promise((resolve) => setImmediate(resolve));
      return {
        invocationId: IDS.child,
        lifecycleState: 'succeeded',
        traceId: invocationActor.traceId,
        requestId: invocationActor.requestId,
      };
    },
    patches,
  );
  try {
    const results = await Promise.allSettled([
      manualRetry(IDS.invocation, input({ version: 2 }), actor()),
      manualRetry(IDS.invocation, input({ version: 2 }), actor()),
    ]);
    assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
    assert.equal(results.filter((item) => item.status === 'rejected').length, 1);
    assert.equal(runtimeCalls, 1);
    assert.equal(runtimeActor.remoteIdempotencyKeyHash, HASH);
    assert.equal(runtimeActor.recoveryParentInvocationId, IDS.invocation);
    assert.deepEqual(claimUpdate.$unset, { recoveryChildInvocationId: 1 });
  } finally {
    restore(patches);
  }
});

test('manual retry propagates circuit/capacity protection and returns the original to review', async () => {
  for (const code of [ErrorCodes.CIRCUIT_OPEN, ErrorCodes.RUNTIME_CAPACITY_EXCEEDED]) {
    const patches = [];
    const original = invocation();
    patch(Invocation, 'findOne', () => queryResult(original), patches);
    patch(PassportConnection, 'findOne', async () => connection(), patches);
    patch(AuditLog, 'create', async (payload) => payload, patches);
    let reset;
    patch(
      Invocation,
      'findOneAndUpdate',
      async (_filter, update) => ({ ...original, ...update.$set }),
      patches,
    );
    patch(
      Invocation,
      'updateOne',
      async (_filter, update) => {
        reset = update.$set;
        return { modifiedCount: 1 };
      },
      patches,
    );
    patch(
      runtimeGateway,
      'invoke',
      async () => {
        throw new AppError(503, code, 'Runtime protection rejected retry.');
      },
      patches,
    );
    try {
      await assert.rejects(() => manualRetry(IDS.invocation, input({ version: 2 }), actor()), {
        code,
      });
      assert.equal(reset.recoveryState, 'required');
      assert.equal(reset.recoveryEligible, true);
      assert.equal(reset.recoveryDecision, 'retry_denied');
      assert.equal(reset.recoveryDecisionReason, code);
    } finally {
      restore(patches);
    }
  }
});
