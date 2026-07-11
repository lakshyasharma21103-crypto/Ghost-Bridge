const assert = require('node:assert/strict');
const http = require('node:http');
const { Writable } = require('node:stream');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');
const { readEnvironment } = require('../src/config/env');
const { startupErrorLogFields } = require('../src/server');
const { createLogger, safeLogPayload } = require('../src/utils/logger');

const RUNTIME_TOKEN = 'test_runtime_secret_0123456789_abcdefghijklmnopqrstuvwxyz';
const INCORRECT_TOKEN = 'incorrect_runtime_secret_0123456789_abcdefghijklmnopqrstuvwxyz';
const logLines = [];
const logDestination = new Writable({
  write(chunk, _encoding, callback) {
    logLines.push(chunk.toString());
    callback();
  },
});
const testLogger = createLogger({ destination: logDestination, base: null });
const config = {
  port: 0,
  nodeEnv: 'test',
  runtimeToken: RUNTIME_TOKEN,
  allowedGatewayOrigins: [],
  requestTimeoutMs: 2_000,
  jsonBodyLimit: '32kb',
  rateLimitWindowMs: 60_000,
  rateLimitMax: 100,
};

let server;
let baseUrl;

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...options.headers,
  };
  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : options.rawBody
          ? options.body
          : JSON.stringify(options.body),
  });
  const text = await response.text();
  return {
    response,
    body: text ? JSON.parse(text) : null,
    text,
  };
}

function authorization(token = RUNTIME_TOKEN) {
  return { Authorization: `Bearer ${token}` };
}

function assertStructuredError(result, status, code) {
  assert.equal(result.response.status, status);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error.code, code);
  assert.equal(typeof result.body.error.message, 'string');
  assert.ok(Array.isArray(result.body.error.details));
  assert.match(result.body.error.requestId, /^req_/);
  assert.equal(Object.hasOwn(result.body.error, 'stack'), false);
}

before(async () => {
  server = http.createServer(createApp({ config, logger: testLogger }));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
});

test('environment validation requires a strong runtime token', () => {
  assert.throws(
    () => readEnvironment({ NODE_ENV: 'test', EXTERNAL_AGENT_RUNTIME_TOKEN: 'too-short' }),
    /EXTERNAL_AGENT_RUNTIME_TOKEN.*32 characters/,
  );
});

test('startup error logging preserves diagnostics while redacting secrets', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  const rawSecret = 'startup-secret-value-0123456789';

  try {
    const fields = startupErrorLogFields(
      new Error(`Unable to start with Bearer ${rawSecret} token=${rawSecret}`),
    );
    const serialized = JSON.stringify({
      message: fields.err.message,
      stack: fields.err.stack,
      errorMessage: fields.errorMessage,
      errorStack: fields.errorStack,
    });

    assert.equal(fields.err instanceof Error, true);
    assert.match(fields.errorMessage, /Unable to start/);
    assert.equal(serialized.includes(rawSecret), false);
    assert.match(serialized, /\[redacted\]/);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('health endpoint identifies the independent external service', async () => {
  const result = await request('/health');

  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body.data, {
    service: 'external-research-agent',
    status: 'healthy',
    version: '1.0.0',
  });
  assert.match(result.body.meta.requestId, /^req_/);
});

test('missing bearer token returns the structured authentication error', async () => {
  const result = await request('/v1/research/invoke', {
    method: 'POST',
    body: { topic: 'external runtimes' },
  });

  assertStructuredError(result, 401, 'RUNTIME_AUTHENTICATION_FAILED');
  assert.equal(result.body.error.message, 'Runtime authentication failed.');
  assert.deepEqual(result.body.error.details, []);
});

test('unsupported authentication scheme is rejected', async () => {
  const result = await request('/v1/research/invoke', {
    method: 'POST',
    headers: { Authorization: `Basic ${RUNTIME_TOKEN}` },
    body: { topic: 'external runtimes' },
  });

  assertStructuredError(result, 401, 'RUNTIME_AUTHENTICATION_FAILED');
});

test('invalid bearer token is rejected without returning either token', async () => {
  const result = await request('/v1/research/invoke', {
    method: 'POST',
    headers: authorization(INCORRECT_TOKEN),
    body: { topic: 'external runtimes' },
  });

  assertStructuredError(result, 401, 'RUNTIME_AUTHENTICATION_FAILED');
  assert.equal(result.text.includes(INCORRECT_TOKEN), false);
  assert.equal(result.text.includes(RUNTIME_TOKEN), false);
});

test('missing topic returns structured validation details', async () => {
  const result = await request('/v1/research/invoke', {
    method: 'POST',
    headers: authorization(),
    body: {},
  });

  assertStructuredError(result, 400, 'VALIDATION_ERROR');
  assert.equal(result.body.error.details[0].path, 'topic');
});

test('non-string topic is rejected', async () => {
  const result = await request('/v1/research/invoke', {
    method: 'POST',
    headers: authorization(),
    body: { topic: { value: 'external runtimes' } },
  });

  assertStructuredError(result, 400, 'VALIDATION_ERROR');
  assert.equal(result.body.error.details[0].path, 'topic');
});

test('topic shorter than three trimmed characters is rejected', async () => {
  const result = await request('/v1/research/invoke', {
    method: 'POST',
    headers: authorization(),
    body: { topic: '  x ' },
  });

  assertStructuredError(result, 400, 'VALIDATION_ERROR');
});

test('topic longer than 1000 characters is rejected', async () => {
  const result = await request('/v1/research/invoke', {
    method: 'POST',
    headers: authorization(),
    body: { topic: 'x'.repeat(1001) },
  });

  assertStructuredError(result, 400, 'VALIDATION_ERROR');
});

test('unknown input fields are rejected', async () => {
  const result = await request('/v1/research/invoke', {
    method: 'POST',
    headers: authorization(),
    body: { topic: 'external runtimes', executable: '<script>' },
  });

  assertStructuredError(result, 400, 'VALIDATION_ERROR');
});

test('JSON body limit rejects oversized payloads with a structured error', async () => {
  const result = await request('/v1/research/invoke', {
    method: 'POST',
    headers: authorization(),
    body: JSON.stringify({ topic: 'x'.repeat(40_000) }),
    rawBody: true,
  });

  assertStructuredError(result, 413, 'PAYLOAD_TOO_LARGE');
});

test('valid bearer token returns deterministic external research output', async () => {
  const result = await request('/v1/research/invoke', {
    method: 'POST',
    headers: authorization(),
    body: { topic: '  latest AI infrastructure trends  ' },
  });

  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body.response, {
    summary: 'External agent result for: latest AI infrastructure trends',
    sources: ['https://example.com/external-agent-source'],
    runtime: {
      service: 'external-research-agent',
      version: '1.0.0',
    },
  });
  assert.match(result.body.meta.requestId, /^req_/);
  assert.equal(result.text.includes(RUNTIME_TOKEN), false);
});

test('invalid JSON returns a production-safe structured error', async () => {
  const result = await request('/v1/research/invoke', {
    method: 'POST',
    headers: authorization(),
    body: '{"topic":',
    rawBody: true,
  });

  assertStructuredError(result, 400, 'INVALID_JSON');
});

test('runtime secrets are redacted from structured logs', () => {
  testLogger.info(
    safeLogPayload({
      headers: { authorization: `Bearer ${RUNTIME_TOKEN}` },
      runtimeToken: RUNTIME_TOKEN,
      note: `Bearer ${RUNTIME_TOKEN}`,
    }),
    'Redaction verification',
  );

  const captured = logLines.join('');
  assert.equal(captured.includes(RUNTIME_TOKEN), false);
  assert.equal(captured.includes(INCORRECT_TOKEN), false);
  assert.match(captured, /\[redacted\]/);
});
