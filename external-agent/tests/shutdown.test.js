const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { createApp } = require('../src/app');
const { createServiceLifecycle } = require('../src/services/serviceLifecycle');
const { requestCancelledError } = require('../src/utils/errors');

const token = 'shutdown-test-runtime-token-1234567890';

function config() {
  return {
    runtimeToken: token,
    allowedGatewayOrigins: [],
    requestTimeoutMs: 5_000,
    shutdownDrainTimeoutMs: 100,
    jsonBodyLimit: '32kb',
    rateLimitWindowMs: 60_000,
    rateLimitMax: 120,
    aiProvider: 'mock',
    nodeEnv: 'test',
  };
}

function logger() {
  return { info() {}, warn() {}, error() {}, fatal() {} };
}

async function waitFor(predicate, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('Timed out waiting for test condition.');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test('external readiness becomes false while health remains live and no provider request is billed', async () => {
  const lifecycle = createServiceLifecycle();
  let researchCalls = 0;
  let configurationChecks = 0;
  const provider = {
    checkConfiguration() {
      configurationChecks += 1;
      return { provider: 'mock', configured: true };
    },
    async research() {
      researchCalls += 1;
      return { summary: 'not used', sourceReferences: [], webSearchUsed: false };
    },
  };
  const server = http.createServer(
    createApp({ config: config(), provider, lifecycle, logger: logger() }),
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    lifecycle.beginDraining();
    const health = await fetch(`${base}/health`);
    const healthBody = await health.json();
    assert.equal(health.status, 200);
    assert.equal(healthBody.data.status, 'ok');
    assert.equal(Object.hasOwn(healthBody.data, 'ai'), false);
    assert.equal(Object.hasOwn(healthBody.data, 'provider'), false);
    assert.equal(configurationChecks, 0);
    assert.equal(researchCalls, 0);

    const ready = await fetch(`${base}/ready`);
    const readyBody = await ready.json();
    const invoke = await fetch(`${base}/v1/research/invoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'safe shutdown test' }),
    });
    assert.equal(ready.status, 503);
    assert.equal(readyBody.data.status, 'not_ready');
    assert.deepEqual(readyBody.data.ai, { provider: 'mock', configured: true });
    assert.deepEqual(readyBody.data.runtimeAuthentication, { configured: true });
    assert.deepEqual(readyBody.data.lifecycle, { status: 'draining' });
    assert.equal(invoke.status, 503);
    assert.equal((await invoke.json()).error.code, 'SERVICE_DRAINING');
    assert.equal(configurationChecks, 1);
    assert.equal(researchCalls, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('external lifecycle allows active work to finish or aborts it after the drain deadline', async () => {
  const lifecycle = createServiceLifecycle();
  const active = lifecycle.register('request-1');
  lifecycle.beginDraining();
  assert.equal(await lifecycle.waitForIdle(10), false);
  assert.equal(lifecycle.abortActive(), 1);
  assert.equal(active.signal.reason.code, 'SERVICE_SHUTDOWN');
  assert.equal(active.signal.reason.reason, 'SERVICE_SHUTDOWN');
  assert.equal(active.signal.reason.recoveryRequired, true);
  assert.equal(active.signal.reason.recoveryReason, 'SHUTDOWN_DURING_EXTERNAL_INVOCATION');
  active.complete();
  assert.equal(await lifecycle.waitForIdle(10), true);
});

test('duplicate request IDs retain independent active registry entries and cleanup identities', () => {
  const lifecycle = createServiceLifecycle();
  const first = lifecycle.register({
    requestId: 'req_duplicate',
    traceId: 'trace_first',
    invocationId: 'invocation-first',
    topic: 'must not be retained',
  });
  const second = lifecycle.register({
    requestId: 'req_duplicate',
    traceId: 'trace_second',
    invocationId: 'invocation-second',
  });

  assert.equal(lifecycle.snapshot().activeRequestCount, 2);
  assert.equal(first.complete(), true);
  assert.equal(first.complete(), false);
  assert.equal(lifecycle.snapshot().activeRequestCount, 1);
  assert.equal(second.signal.aborted, false);
  assert.equal(second.complete(), true);
  assert.equal(lifecycle.snapshot().activeRequestCount, 0);
});

test('client disconnect aborts active work as REQUEST_CANCELLED and clears registry state', async () => {
  const lifecycle = createServiceLifecycle();
  let researchCalls = 0;
  let responseReceived = false;
  let markStarted;
  let markAborted;
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  const aborted = new Promise((resolve) => {
    markAborted = resolve;
  });
  const provider = {
    checkConfiguration() {
      return { provider: 'mock', configured: true };
    },
    async research({ signal }) {
      researchCalls += 1;
      markStarted();
      return new Promise((_resolve, reject) => {
        const onAbort = () => {
          markAborted(signal.reason);
          reject(signal.reason);
        };
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
      });
    },
  };
  const server = http.createServer(
    createApp({ config: config(), provider, lifecycle, logger: logger() }),
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const body = JSON.stringify({ topic: 'disconnect cancellation test' });
  const clientRequest = http.request(
    {
      host: '127.0.0.1',
      port: server.address().port,
      path: '/v1/research/invoke',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    (response) => {
      responseReceived = true;
      response.resume();
    },
  );
  clientRequest.on('error', () => undefined);

  try {
    clientRequest.end(body);
    await started;
    assert.equal(lifecycle.snapshot().activeRequestCount, 1);
    clientRequest.destroy();
    const reason = await aborted;
    assert.equal(reason.code, 'REQUEST_CANCELLED');
    assert.equal(reason.reason, 'CLIENT_DISCONNECTED');
    await waitFor(() => lifecycle.snapshot().activeRequestCount === 0);
    assert.equal(researchCalls, 1);
    assert.equal(responseReceived, false);
  } finally {
    clientRequest.destroy();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('outer request timeout stays distinct from cancellation and provider timeout', async () => {
  const lifecycle = createServiceLifecycle();
  let abortedReason;
  const provider = {
    checkConfiguration() {
      return { provider: 'mock', configured: true };
    },
    async research({ signal }) {
      return new Promise((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            abortedReason = signal.reason;
            reject(signal.reason);
          },
          { once: true },
        );
      });
    },
  };
  const server = http.createServer(
    createApp({
      config: { ...config(), requestTimeoutMs: 25 },
      provider,
      lifecycle,
      logger: logger(),
    }),
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/research/invoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'outer timeout test' }),
    });
    const responseBody = await response.json();
    assert.equal(response.status, 408);
    assert.equal(responseBody.error.code, 'REQUEST_TIMEOUT');
    assert.notEqual(responseBody.error.code, 'REQUEST_CANCELLED');
    assert.notEqual(responseBody.error.code, 'GEMINI_REQUEST_TIMEOUT');
    await waitFor(() => lifecycle.snapshot().activeRequestCount === 0);
    assert.equal(abortedReason.code, 'REQUEST_TIMEOUT');
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('writable cancellation responses expose only safe cancellation metadata', async () => {
  const secret = 'private cancellation prompt and token value';
  const provider = {
    checkConfiguration() {
      return { provider: 'mock', configured: true };
    },
    async research() {
      const error = requestCancelledError();
      error.prompt = secret;
      error.output = secret;
      error.token = secret;
      throw error;
    },
  };
  const server = http.createServer(createApp({ config: config(), provider, logger: logger() }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/research/invoke`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Request-Id': 'req_safe-cancel',
        'X-Trace-Id': 'trace_safe-cancel',
      },
      body: JSON.stringify({ topic: 'safe cancellation response' }),
    });
    const text = await response.text();
    const responseBody = JSON.parse(text);
    assert.equal(response.status, 499);
    assert.deepEqual(
      {
        code: responseBody.error.code,
        reason: responseBody.error.reason,
        retryable: responseBody.error.retryable,
        requestId: responseBody.error.requestId,
        traceId: responseBody.error.traceId,
      },
      {
        code: 'REQUEST_CANCELLED',
        reason: 'CLIENT_DISCONNECTED',
        retryable: false,
        requestId: 'req_safe-cancel',
        traceId: 'trace_safe-cancel',
      },
    );
    assert.equal(text.includes(secret), false);
    for (const field of ['prompt', 'output', 'token', 'stack']) {
      assert.equal(Object.hasOwn(responseBody.error, field), false);
    }
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
