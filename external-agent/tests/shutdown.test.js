const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { createApp } = require('../src/app');
const { createServiceLifecycle } = require('../src/services/serviceLifecycle');

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
  assert.equal(active.signal.reason.code, 'SHUTDOWN_INTERRUPTED_INVOCATION');
  assert.equal(active.signal.reason.recoveryRequired, true);
  active.complete();
  assert.equal(await lifecycle.waitForIdle(10), true);
});
