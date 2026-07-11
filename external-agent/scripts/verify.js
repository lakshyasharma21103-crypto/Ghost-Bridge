const crypto = require('node:crypto');
const { Writable } = require('node:stream');
const { start } = require('../src/server');
const { MockProvider } = require('../src/providers/mock.provider');
const { createLogger } = require('../src/utils/logger');

const runtimeToken = crypto.randomBytes(32).toString('base64url');
const incorrectToken = crypto.randomBytes(32).toString('base64url');
const port = Number(process.env.EXTERNAL_AGENT_VERIFY_PORT || 5002);
const capturedLogs = [];
const destination = new Writable({
  write(chunk, _encoding, callback) {
    capturedLogs.push(chunk.toString());
    callback();
  },
});
const logger = createLogger({ destination, base: null });

function report(label, detail) {
  console.log(`PASS ${label}: ${detail}`);
}

async function request(baseUrl, path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${options.label || path} returned unreadable JSON.`);
  }
  return { body, response, text };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verify() {
  const runtime = await start({
    config: {
      port,
      nodeEnv: 'test',
      runtimeToken,
      allowedGatewayOrigins: [],
      requestTimeoutMs: 5_000,
      aiProvider: 'mock',
      gemini: { model: undefined, webSearchEnabled: false },
      jsonBodyLimit: '32kb',
      rateLimitWindowMs: 60_000,
      rateLimitMax: 100,
    },
    host: '127.0.0.1',
    logger,
    provider: new MockProvider(),
  });
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const health = await request(baseUrl, '/health', { label: 'health check' });
    assert(health.response.ok, 'Health endpoint did not return HTTP 200.');
    assert(
      health.body?.data?.service === 'external-research-agent',
      'Health response identified the wrong service.',
    );
    report('health', 'external-research-agent is healthy');

    const missing = await request(baseUrl, '/v1/research/invoke', {
      method: 'POST',
      body: { topic: 'external interoperability' },
      label: 'missing-token invocation',
    });
    assert(missing.response.status === 401, 'Missing token was not rejected with HTTP 401.');
    assert(
      missing.body?.error?.code === 'RUNTIME_AUTHENTICATION_FAILED',
      'Missing token returned the wrong error code.',
    );
    report('missing token', 'rejected with RUNTIME_AUTHENTICATION_FAILED');

    const incorrect = await request(baseUrl, '/v1/research/invoke', {
      method: 'POST',
      headers: { Authorization: `Bearer ${incorrectToken}` },
      body: { topic: 'external interoperability' },
      label: 'incorrect-token invocation',
    });
    assert(incorrect.response.status === 401, 'Incorrect token was not rejected with HTTP 401.');
    assert(
      !incorrect.text.includes(incorrectToken),
      'Incorrect token appeared in the API response.',
    );
    report('incorrect token', 'rejected without credential disclosure');

    const invalid = await request(baseUrl, '/v1/research/invoke', {
      method: 'POST',
      headers: { Authorization: `Bearer ${runtimeToken}` },
      body: { topic: 'x' },
      label: 'invalid-input invocation',
    });
    assert(invalid.response.status === 400, 'Invalid topic was not rejected with HTTP 400.');
    assert(
      invalid.body?.error?.code === 'VALIDATION_ERROR',
      'Invalid topic returned the wrong error code.',
    );
    assert(
      Array.isArray(invalid.body?.error?.details),
      'Validation error details were not structured.',
    );
    report('input validation', 'invalid topic rejected with structured details');

    const invoked = await request(baseUrl, '/v1/research/invoke', {
      method: 'POST',
      headers: { Authorization: `Bearer ${runtimeToken}` },
      body: { topic: 'external interoperability' },
      label: 'authenticated invocation',
    });
    assert(invoked.response.ok, 'Authenticated invocation did not succeed.');
    assert(
      invoked.body?.response?.runtime?.service === 'external-research-agent',
      'Invocation response did not prove external service origin.',
    );
    assert(
      invoked.body?.response?.summary === 'External agent result for: external interoperability',
      'Invocation summary was unexpected.',
    );
    assert(!invoked.text.includes(runtimeToken), 'Runtime token appeared in the success response.');
    assert(invoked.body?.response?.runtime?.provider === 'mock', 'Mock provider was not used.');
    report('authenticated invocation', 'deterministic mock runtime response returned');

    const finalHealth = await request(baseUrl, '/health', { label: 'final health check' });
    assert(
      finalHealth.response.ok && finalHealth.body?.data?.status === 'healthy',
      'Service was unhealthy after failed requests.',
    );
    report('failure resilience', 'service remains healthy');

    logger.flush?.();
    const logs = capturedLogs.join('');
    assert(!logs.includes(runtimeToken), 'Runtime token appeared in captured logs.');
    assert(!logs.includes(incorrectToken), 'Incorrect token appeared in captured logs.');
    report('secret handling', 'tokens absent from responses and captured logs');

    console.log('External agent verification completed successfully.');
  } finally {
    await runtime.shutdown('verification-complete');
  }
}

verify().catch((error) => {
  console.error(`FAIL external agent verification: ${error.message}`);
  process.exitCode = 1;
});
