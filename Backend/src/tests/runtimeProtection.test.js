const assert = require('node:assert/strict');
const test = require('node:test');
const CircuitBreaker = require('../models/CircuitBreaker');
const RuntimeCapacitySlot = require('../models/RuntimeCapacitySlot');
const PassportConnection = require('../models/PassportConnection');
const { env } = require('../config/env');
const { ErrorCodes } = require('../utils/errorCodes');
const { classifyCircuitFailure } = require('../utils/circuitFailure');
const { toApiErrorResponse } = require('../utils/apiError');
const { isRetryableError } = require('../utils/retryability');
const { AppError } = require('../utils/AppError');
const {
  breakerScope,
  evaluateCircuit,
  recordCircuitFailure,
  recordCircuitSuccess,
  releaseCircuitProbe,
} = require('../services/circuitBreaker.service');
const {
  acquireRuntimeCapacity,
  releaseRuntimeCapacity,
} = require('../services/runtimeCapacity.service');
const {
  currentHealth,
  recordConnectionFailure,
  recordConnectionSuccess,
} = require('../services/connectionHealth.service');
const { createServiceLifecycle } = require('../services/serviceLifecycle.service');
const {
  invokeRest,
  safeRemoteError,
  safeRetryAfterMs,
} = require('../services/adapters/restAdapter');
const safeFetchUtility = require('../utils/safeFetch');
const { start } = require('../server');

function patch(object, key, replacement) {
  const original = object[key];
  object[key] = replacement;
  return () => {
    object[key] = original;
  };
}

function connection(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    receivingWorkspaceId: 'workspace-a',
    runtimeType: 'rest',
    runtimeEndpoint: 'https://runtime.example.test/invoke',
    healthStatus: 'unknown',
    ...overrides,
  };
}

function breaker(overrides = {}) {
  return {
    _id: '507f191e810c19729de860ea',
    connectionId: '507f1f77bcf86cd799439011',
    state: 'closed',
    version: 0,
    consecutiveFailureCount: 0,
    successCountSinceClose: 0,
    failureCountInWindow: 0,
    halfOpenProbeInFlight: false,
    ...overrides,
  };
}

test('authoritative circuit failure classification excludes caller failures and counts upstream failures', () => {
  for (const code of [
    'CAPABILITY_INPUT_INVALID',
    'POLICY_DENIED',
    'AUTHENTICATION_REQUIRED',
    'INSTALL_KEY_INVALID',
    'IDEMPOTENCY_CONFLICT',
    'UNSAFE_URL',
    'INVOCATION_CANCELLED',
    'SERVICE_SHUTDOWN',
  ]) {
    assert.equal(classifyCircuitFailure({ code }).countsTowardCircuit, false, code);
  }
  const unavailable = classifyCircuitFailure({
    code: 'RUNTIME_INVOCATION_FAILED',
    providerHttpStatus: 503,
  });
  assert.deepEqual(unavailable, {
    countsTowardCircuit: true,
    rateLimited: false,
    category: 'UPSTREAM_UNAVAILABLE',
    weight: 1,
    reason: 'PROVIDER_503',
  });
  const limited = classifyCircuitFailure({ providerHttpStatus: 429 });
  assert.equal(limited.countsTowardCircuit, false);
  assert.equal(limited.rateLimited, true);
});

test('breaker scope is tenant and connection isolated and stores only a runtime identity hash', () => {
  const first = breakerScope(connection(), 'runtime');
  const second = breakerScope(
    connection({ _id: '507f1f77bcf86cd799439012', receivingWorkspaceId: 'workspace-b' }),
    'runtime',
  );
  assert.notDeepEqual(first, second);
  assert.match(first.runtimeIdentityHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(first).includes('runtime.example.test'), false);
});

test('persistent protection models expose the required tenant, state, expiry, and update indexes', () => {
  const circuitIndexes = CircuitBreaker.schema.indexes().map(([keys]) => JSON.stringify(keys));
  assert.ok(circuitIndexes.includes(JSON.stringify({ workspaceId: 1, connectionId: 1 })));
  assert.ok(circuitIndexes.includes(JSON.stringify({ state: 1, openUntil: 1 })));
  assert.ok(circuitIndexes.includes(JSON.stringify({ updatedAt: -1 })));
  const capacityIndexes = RuntimeCapacitySlot.schema
    .indexes()
    .map(([keys]) => JSON.stringify(keys));
  assert.ok(
    capacityIndexes.includes(
      JSON.stringify({ workspaceId: 1, scopeType: 1, scopeId: 1, slotNumber: 1 }),
    ),
  );
  assert.ok(capacityIndexes.includes(JSON.stringify({ workspaceId: 1, leaseExpiresAt: 1 })));
});

test('closed breaker opens at the configured eligible-failure threshold', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const before = breaker({
    failureCountInWindow: env.CIRCUIT_FAILURE_THRESHOLD - 1,
    consecutiveFailureCount: env.CIRCUIT_FAILURE_THRESHOLD - 1,
    failureWindowStartedAt: new Date(now.getTime() - 1_000),
  });
  let calls = 0;
  const restore = patch(CircuitBreaker, 'findOneAndUpdate', async (_filter, update) => {
    calls += 1;
    if (calls === 1) return before;
    return { ...before, ...update.$set, version: 1 };
  });
  try {
    const result = await recordCircuitFailure(
      connection(),
      'runtime',
      { code: 'RUNTIME_INVOCATION_FAILED', providerHttpStatus: 503 },
      { forcePersistence: true, now },
    );
    assert.equal(result.state, 'open');
    assert.equal(result.transitioned, 'opened');
    assert.ok(result.openUntil > now);
  } finally {
    restore();
  }
});

test('one Gemini timeout is transient but leaves a closed circuit closed', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const before = breaker();
  let calls = 0;
  const restore = patch(CircuitBreaker, 'findOneAndUpdate', async (_filter, update) => {
    calls += 1;
    if (calls === 1) return before;
    return { ...before, ...update.$set, version: 1 };
  });
  try {
    const metadata = { code: 'GEMINI_REQUEST_TIMEOUT', providerHttpStatus: 504 };
    assert.equal(isRetryableError(metadata), true);
    const classification = classifyCircuitFailure(metadata);
    assert.equal(classification.countsTowardCircuit, true);
    assert.equal(classification.weight, 1);

    const result = await recordCircuitFailure(connection(), 'runtime', metadata, {
      forcePersistence: true,
      now,
    });
    assert.equal(result.state, 'closed');
    assert.equal(result.transitioned, undefined);
    assert.equal(calls, 2);
  } finally {
    restore();
  }
});

test('open breaker fails fast with safe retry metadata', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const restore = patch(CircuitBreaker, 'findOneAndUpdate', async () =>
    breaker({ state: 'open', openUntil: new Date(now.getTime() + 5_000) }),
  );
  try {
    await assert.rejects(
      () => evaluateCircuit(connection(), 'runtime', { forcePersistence: true, now }),
      (error) => {
        assert.equal(error.code, ErrorCodes.CIRCUIT_OPEN);
        assert.equal(error.retryAfterMs, 5_000);
        assert.equal(error.circuitState, 'open');
        assert.equal(JSON.stringify(error).includes('runtime.example.test'), false);
        return true;
      },
    );
  } finally {
    restore();
  }
});

test('expired open breaker admits one half-open probe and rejects concurrent probes', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const open = breaker({ state: 'open', openUntil: new Date(now.getTime() - 1) });
  const halfOpen = breaker({ state: 'half_open', version: 1, halfOpenProbeInFlight: true });
  const responses = [open, halfOpen, halfOpen];
  const restore = patch(CircuitBreaker, 'findOneAndUpdate', async () => responses.shift());
  try {
    const admitted = await evaluateCircuit(connection(), 'runtime', {
      forcePersistence: true,
      now,
    });
    assert.equal(admitted.probe, true);
    assert.equal(admitted.state, 'half_open');
    await assert.rejects(
      () => evaluateCircuit(connection(), 'runtime', { forcePersistence: true, now }),
      { code: ErrorCodes.CIRCUIT_HALF_OPEN_PROBE_ACTIVE },
    );
  } finally {
    restore();
  }
});

test('a successful half-open probe closes the breaker and a failed probe reopens it', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const halfOpen = breaker({ state: 'half_open', halfOpenProbeInFlight: true });
  let calls = 0;
  let restore = patch(CircuitBreaker, 'findOneAndUpdate', async (_filter, update) => {
    calls += 1;
    return calls === 1 ? halfOpen : { ...halfOpen, ...update.$set, state: 'closed' };
  });
  try {
    const success = await recordCircuitSuccess(connection(), 'runtime', {
      forcePersistence: true,
      now,
    });
    assert.equal(success.transitioned, 'closed');
  } finally {
    restore();
  }

  calls = 0;
  restore = patch(CircuitBreaker, 'findOneAndUpdate', async (_filter, update) => {
    calls += 1;
    return calls === 1 ? halfOpen : { ...halfOpen, ...update.$set, state: 'open' };
  });
  try {
    const failure = await recordCircuitFailure(
      connection(),
      'runtime',
      { code: 'SAFE_FETCH_TIMEOUT' },
      { forcePersistence: true, now },
    );
    assert.equal(failure.state, 'open');
    assert.equal(failure.reopened, true);
  } finally {
    restore();
  }
});

test('a local non-probe failure releases a half-open claim without changing breaker state', async () => {
  const halfOpen = breaker({
    state: 'half_open',
    halfOpenProbeInFlight: true,
    halfOpenProbesInFlight: 1,
  });
  let calls = 0;
  let appliedUpdate;
  const restore = patch(CircuitBreaker, 'findOneAndUpdate', async (_filter, update) => {
    calls += 1;
    if (calls === 1) return halfOpen;
    appliedUpdate = update;
    return { ...halfOpen, ...update.$set, version: 1 };
  });
  try {
    const released = await releaseCircuitProbe(connection(), 'runtime', {
      forcePersistence: true,
    });
    assert.equal(released.changed, true);
    assert.equal(released.state, 'half_open');
    assert.equal(released.remainingProbes, 0);
    assert.equal(appliedUpdate.$set.halfOpenProbeInFlight, false);
    assert.equal(appliedUpdate.$set.halfOpenProbesInFlight, 0);
  } finally {
    restore();
  }
});

test('provider 429 persists isolated rate-limit protection and safe Retry-After parsing is bounded', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z');
  const until = new Date(now.getTime() + 7_000);
  const restore = patch(CircuitBreaker, 'findOneAndUpdate', async () =>
    breaker({ rateLimitedUntil: until }),
  );
  try {
    const result = await recordCircuitFailure(
      connection(),
      'runtime',
      { providerHttpStatus: 429, retryAfterMs: 7_000 },
      { forcePersistence: true, now },
    );
    assert.equal(result.rateLimited, true);
    assert.equal(safeRetryAfterMs('7', now.getTime()), 7_000);
    assert.equal(safeRetryAfterMs('999999', now.getTime()), 3_600_000);
    assert.equal(safeRetryAfterMs('Bearer secret', now.getTime()), undefined);
  } finally {
    restore();
  }
});

test('connection health uses explicit transitions and never re-enables a disabled connection', async () => {
  let calls = 0;
  const restore = patch(PassportConnection, 'findOneAndUpdate', async (_filter, update) => {
    calls += 1;
    if (Array.isArray(update)) return { healthStatus: calls >= 3 ? 'unhealthy' : 'degraded' };
    return { healthStatus: 'healthy' };
  });
  try {
    assert.equal(currentHealth(connection()), 'unknown');
    const healthy = await recordConnectionSuccess(connection(), { forcePersistence: true });
    assert.equal(healthy.to, 'healthy');
    const degraded = await recordConnectionFailure(
      connection({ healthStatus: 'healthy' }),
      { providerHttpStatus: 503 },
      { forcePersistence: true },
    );
    assert.equal(degraded.to, 'degraded');
    const unhealthy = await recordConnectionFailure(
      connection({ healthStatus: 'degraded' }),
      { code: 'SAFE_FETCH_TIMEOUT' },
      { forcePersistence: true },
    );
    assert.equal(unhealthy.to, 'unhealthy');
    const callsBeforeDisabled = calls;
    const disabled = await recordConnectionSuccess(connection({ healthStatus: 'disabled' }), {
      forcePersistence: true,
    });
    assert.equal(disabled.to, 'disabled');
    assert.equal(calls, callsBeforeDisabled);
  } finally {
    restore();
  }
});

test('workspace and connection bulkheads fail fast, release leases, and preserve tenant scope', async () => {
  const filters = [];
  let mode = 'workspace-full';
  const restoreFind = patch(RuntimeCapacitySlot, 'findOneAndUpdate', async (filter) => {
    filters.push(filter);
    if (mode === 'workspace-full') return null;
    if (filter.scopeType === 'workspace') return { slotNumber: 1 };
    return mode === 'connection-full' ? null : { slotNumber: 1 };
  });
  const restoreDelete = patch(RuntimeCapacitySlot, 'deleteMany', async () => ({ deletedCount: 2 }));
  try {
    await assert.rejects(
      () =>
        acquireRuntimeCapacity(connection(), '507f1f77bcf86cd799439013', {
          forcePersistence: true,
        }),
      (error) =>
        error.code === ErrorCodes.RUNTIME_CAPACITY_EXCEEDED &&
        error.reasonCode === 'WORKSPACE_CAPACITY_EXCEEDED',
    );
    mode = 'connection-full';
    await assert.rejects(
      () =>
        acquireRuntimeCapacity(connection(), '507f1f77bcf86cd799439013', {
          forcePersistence: true,
        }),
      (error) =>
        error.code === ErrorCodes.RUNTIME_CAPACITY_EXCEEDED &&
        error.reasonCode === 'CONNECTION_CAPACITY_EXCEEDED',
    );
    mode = 'available';
    const lease = await acquireRuntimeCapacity(
      connection({ receivingWorkspaceId: 'workspace-b' }),
      '507f1f77bcf86cd799439013',
      { forcePersistence: true },
    );
    assert.equal(lease.workspaceId, 'workspace-b');
    assert.ok(filters.some((filter) => filter.workspaceId === 'workspace-b'));
    assert.deepEqual(await releaseRuntimeCapacity(lease, { forcePersistence: true }), {
      released: 2,
    });
  } finally {
    restoreDelete();
    restoreFind();
  }
});

test('service lifecycle becomes unready immediately, drains active work, and aborts deterministically', async () => {
  const lifecycle = createServiceLifecycle();
  lifecycle.markReady();
  const active = lifecycle.registerInvocation('invocation-1', { workspaceId: 'workspace-a' });
  active.markExternalCallStarted();
  lifecycle.beginDraining();
  assert.equal(lifecycle.snapshot().ready, false);
  assert.throws(() => lifecycle.assertAcceptingInvocations(), {
    code: ErrorCodes.SERVICE_DRAINING,
  });
  assert.equal(lifecycle.abortActiveInvocations(), 1);
  assert.equal(active.signal.reason.code, ErrorCodes.SHUTDOWN_INTERRUPTED_INVOCATION);
  active.complete();
  assert.equal(await lifecycle.waitForIdle(50), true);
});

test('pending invocation admission is drain-counted, abortable, and transfers without an idle gap', async () => {
  const lifecycle = createServiceLifecycle();
  lifecycle.markReady();
  const admission = lifecycle.beginInvocationAdmission();
  assert.equal(lifecycle.snapshot().activeInvocationCount, 1);
  assert.equal(lifecycle.snapshot().pendingAdmissionCount, 1);

  lifecycle.beginDraining();
  assert.equal(await lifecycle.waitForIdle(1), false);
  assert.equal(lifecycle.abortActiveInvocations(), 1);
  assert.equal(admission.signal.reason.code, ErrorCodes.SHUTDOWN_INTERRUPTED_INVOCATION);

  const registered = lifecycle.registerInvocation('invocation-admitted-before-drain', {
    workspaceId: 'workspace-a',
    connectionId: 'connection-a',
    admission,
  });
  assert.equal(registered.signal, admission.signal);
  assert.equal(registered.signal.aborted, true);
  assert.equal(lifecycle.snapshot().pendingAdmissionCount, 0);
  assert.equal(lifecycle.snapshot().activeInvocationCount, 1);
  assert.equal(registered.complete(), true);
  assert.equal(await lifecycle.waitForIdle(50), true);
});

test('active execution cancellation is ownership-verified, idempotent, and replay-safe', () => {
  const lifecycle = createServiceLifecycle();
  lifecycle.markReady();
  const preClaim = lifecycle.registerInvocation('invocation-pre-claim', {
    workspaceId: 'workspace-a',
    connectionId: 'connection-a',
  });
  const preClaimRejected = lifecycle.requestCancellation('invocation-pre-claim', {
    workspaceId: 'workspace-other',
    connectionId: 'connection-a',
    reasonCode: 'USER_REQUESTED',
  });
  assert.equal(preClaimRejected.requested, false);
  const preClaimCancelled = lifecycle.requestCancellation('invocation-pre-claim', {
    workspaceId: 'workspace-a',
    connectionId: 'connection-a',
    reasonCode: 'USER_REQUESTED',
  });
  assert.equal(preClaimCancelled.requested, true);
  assert.equal(preClaim.signal.reason.recoveryRequired, undefined);
  preClaim.complete();
  const active = lifecycle.registerInvocation('invocation-1', {
    workspaceId: 'workspace-a',
    connectionId: 'connection-a',
  });
  const replay = lifecycle.registerInvocation('invocation-1', {
    workspaceId: 'workspace-other',
    connectionId: 'connection-other',
  });

  assert.equal(active.registered, true);
  assert.equal(replay.registered, false);
  assert.equal(replay.signal, active.signal);
  assert.equal(replay.complete(), false);
  assert.equal(lifecycle.snapshot().activeInvocationCount, 1);
  assert.equal(
    active.setExecutionOwnership({
      workspaceId: 'workspace-a',
      connectionId: 'connection-a',
      executionOwner: 'worker-a',
      executionLeaseId: 'lease-a',
    }),
    true,
  );
  assert.doesNotMatch(
    JSON.stringify(lifecycle.snapshot()),
    /worker-a|lease-a|executionOwner|executionLeaseId/,
  );

  const rejected = lifecycle.requestCancellation('invocation-1', {
    workspaceId: 'workspace-a',
    connectionId: 'connection-a',
    executionOwner: 'worker-b',
    executionLeaseId: 'lease-a',
    reasonCode: 'USER_REQUESTED',
  });
  assert.equal(rejected.found, true);
  assert.equal(rejected.requested, false);
  assert.equal(rejected.reasonCode, 'EXECUTION_OWNERSHIP_MISMATCH');
  assert.equal(active.signal.aborted, false);

  active.markExternalCallStarted();
  const requested = lifecycle.requestCancellation('invocation-1', {
    workspaceId: 'workspace-a',
    connectionId: 'connection-a',
    executionOwner: 'worker-a',
    executionLeaseId: 'lease-a',
    reasonCode: 'USER_REQUESTED',
    requestId: 'req-cancel-safe',
    traceId: 'trace-cancel-safe',
  });
  assert.equal(requested.found, true);
  assert.equal(requested.requested, true);
  assert.equal(requested.alreadyRequested, false);
  assert.equal(requested.externalCallStarted, true);
  assert.equal(active.signal.reason.code, ErrorCodes.INVOCATION_CANCELLED);
  assert.equal(active.signal.reason.reasonCode, 'USER_REQUESTED');
  assert.equal(active.signal.reason.recoveryRequired, true);
  assert.equal(active.signal.reason.requestId, 'req-cancel-safe');
  assert.equal(active.signal.reason.traceId, 'trace-cancel-safe');

  const repeated = lifecycle.requestCancellation('invocation-1', {
    workspaceId: 'workspace-a',
    connectionId: 'connection-a',
    executionOwner: 'worker-a',
    executionLeaseId: 'lease-a',
    reasonCode: 'ADMIN_REQUESTED',
  });
  assert.equal(repeated.requested, true);
  assert.equal(repeated.alreadyRequested, true);
  assert.equal(repeated.reasonCode, 'USER_REQUESTED');
  assert.equal(isRetryableError(active.signal.reason), false);
  assert.equal(classifyCircuitFailure(active.signal.reason).countsTowardCircuit, false);

  assert.equal(active.complete(), true);
  const replacement = lifecycle.registerInvocation('invocation-1', {
    workspaceId: 'workspace-a',
    connectionId: 'connection-a',
  });
  assert.equal(active.complete(), false);
  assert.equal(lifecycle.snapshot().activeInvocationCount, 1);
  replacement.complete();
});

test('shutdown and caller cancellation retain distinct non-retryable abort reasons', () => {
  const lifecycle = createServiceLifecycle();
  const active = lifecycle.registerInvocation('invocation-shutdown', {
    workspaceId: 'workspace-a',
    connectionId: 'connection-a',
    executionOwner: 'worker-a',
    executionLeaseId: 'lease-a',
  });
  active.markExternalCallStarted();
  assert.equal(lifecycle.abortActiveInvocations(), 1);
  assert.equal(active.signal.reason.code, ErrorCodes.SHUTDOWN_INTERRUPTED_INVOCATION);
  assert.notEqual(active.signal.reason.code, ErrorCodes.INVOCATION_CANCELLED);
  assert.equal(isRetryableError(active.signal.reason), false);
  assert.equal(classifyCircuitFailure(active.signal.reason).countsTowardCircuit, false);
  active.complete();
});

test('REST adapter forwards cancellation and before-transmit controls into safeFetch', async () => {
  const controller = new AbortController();
  const beforeTransmit = () => {};
  let captured;
  const restore = patch(safeFetchUtility, 'safeFetch', async (_url, options) => {
    captured = options;
    return {
      ok: true,
      status: 200,
      headers: {},
      bodyText: JSON.stringify({ response: { ok: true } }),
    };
  });
  try {
    const result = await invokeRest({
      runtime: {
        endpoint: 'https://runtime.example.test/invoke',
        method: 'POST',
        inputField: 'topic',
        outputField: 'response',
      },
      input: { topic: 'bounded cancellation test' },
      observability: { signal: controller.signal, beforeTransmit },
    });
    assert.equal(result.ok, true);
    assert.equal(captured.signal, controller.signal);
    assert.equal(captured.beforeTransmit, beforeTransmit);
  } finally {
    restore();
  }
});

test('safe protection errors expose identifiers and timing but not runtime URLs or secrets', () => {
  const result = toApiErrorResponse(
    new AppError(503, ErrorCodes.CIRCUIT_OPEN, 'Runtime circuit is open.', [], {
      connectionId: 'connection-safe',
      retryAfterMs: 5_000,
      circuitState: 'open',
      reasonCode: 'PROVIDER_503',
      endpoint: 'https://secret.example.test/invoke?token=secret',
    }),
    { traceId: 'trace-safe', requestId: 'request-safe' },
  );
  assert.equal(result.body.error.retryAfterMs, 5_000);
  assert.equal(result.body.error.circuitState, 'open');
  assert.equal(result.body.error.connectionId, 'connection-safe');
  assert.equal(JSON.stringify(result.body).includes('secret.example.test'), false);
});

test('Gemini timeout metadata crosses the REST and API boundaries through strict allowlists', async () => {
  const secret = 'private-provider-secret-0123456789';
  const remote = safeRemoteError({
    error: {
      code: 'GEMINI_REQUEST_TIMEOUT',
      stage: 'grounded_research',
      operation: 'grounded_research',
      reason: 'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
      timeoutReason: 'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
      configuredTimeoutMs: 115_000,
      retryable: true,
      prompt: `private prompt ${secret}`,
      sources: [`https://example.test/?token=${secret}`],
      apiKey: secret,
    },
  });

  assert.deepEqual(remote, {
    code: 'GEMINI_REQUEST_TIMEOUT',
    stage: 'grounded_research',
    operation: 'grounded_research',
    timeoutReason: 'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
    configuredTimeoutMs: 115_000,
    remoteRetryable: true,
  });
  assert.deepEqual(
    safeRemoteError({
      error: {
        code: 'GEMINI_UPSTREAM_UNAVAILABLE',
        timeoutReason: 'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
        configuredTimeoutMs: 115_000,
      },
    }),
    { code: 'GEMINI_UPSTREAM_UNAVAILABLE' },
  );

  const restore = patch(safeFetchUtility, 'safeFetch', async () => ({
    ok: false,
    status: 504,
    headers: {},
    bodyText: JSON.stringify({
      success: false,
      error: {
        code: 'GEMINI_REQUEST_TIMEOUT',
        stage: 'grounded_research',
        operation: 'grounded_research',
        timeoutReason: 'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
        configuredTimeoutMs: 115_000,
        retryable: true,
        prompt: `private prompt ${secret}`,
        sources: [`https://example.test/?token=${secret}`],
        apiKey: secret,
      },
    }),
  }));
  let gatewayError;
  try {
    await assert.rejects(
      () =>
        invokeRest({
          runtime: {
            endpoint: 'https://runtime.example.test/invoke',
            method: 'POST',
            inputField: 'topic',
          },
          input: { topic: 'Safe timeout metadata' },
        }),
      (error) => {
        gatewayError = error;
        return error.code === 'GEMINI_REQUEST_TIMEOUT';
      },
    );
  } finally {
    restore();
  }
  const response = toApiErrorResponse(gatewayError, {
    traceId: 'trace-timeout-safe',
    requestId: 'req-timeout-safe',
  });
  assert.deepEqual(
    {
      operation: response.body.error.operation,
      timeoutReason: response.body.error.timeoutReason,
      configuredTimeoutMs: response.body.error.configuredTimeoutMs,
      traceId: response.body.error.traceId,
      requestId: response.body.error.requestId,
    },
    {
      operation: 'grounded_research',
      timeoutReason: 'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
      configuredTimeoutMs: 115_000,
      traceId: 'trace-timeout-safe',
      requestId: 'req-timeout-safe',
    },
  );
  assert.equal(JSON.stringify(response.body).includes(secret), false);
  assert.equal(JSON.stringify(response.body).includes('example.test'), false);
});

test('backend shutdown drains active invocation tracking and closes HTTP plus database cleanly', async () => {
  const lifecycle = createServiceLifecycle();
  let disconnected = 0;
  const runtime = await start({
    port: 0,
    host: '127.0.0.1',
    lifecycle,
    connectDatabase: async () => {},
    disconnectDatabase: async () => {
      disconnected += 1;
    },
    logger: { info() {}, warn() {}, error() {}, fatal() {} },
  });
  const active = lifecycle.registerInvocation('invocation-drain');
  setTimeout(() => active.complete(), 10);
  const result = await runtime.shutdown('test');
  assert.equal(result.drained, true);
  assert.equal(runtime.server.listening, false);
  assert.equal(disconnected, 1);
  assert.equal(lifecycle.snapshot().phase, 'stopped');
});

test('a repeated backend shutdown request forces a deterministic result', async () => {
  const lifecycle = createServiceLifecycle();
  const runtime = await start({
    port: 0,
    host: '127.0.0.1',
    lifecycle,
    connectDatabase: async () => {},
    disconnectDatabase: async () => {},
    logger: { info() {}, warn() {}, error() {}, fatal() {} },
  });
  const first = runtime.shutdown('SIGTERM');
  const second = runtime.shutdown('SIGINT');
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(firstResult.forced, true);
  assert.equal(secondResult.forced, true);
  assert.equal(firstResult.exitCode, 1);
});
