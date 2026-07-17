const assert = require('node:assert/strict');
const http = require('node:http');
const { Writable } = require('node:stream');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');
const { GEMINI_PROCESSING_OVERHEAD_MS, readEnvironment } = require('../src/config/env');
const {
  DEFAULT_BACKEND_RUNTIME_GATEWAY_TIMEOUT_MS,
  DEFAULT_LIVE_VERIFIER_TIMEOUT_MS,
  providerRequestBudget,
} = require('../src/config/timeoutBudget');
const { MockProvider } = require('../src/providers/mock.provider');
const {
  resolveVerifierTimeoutMs,
  verificationResearchTopic,
} = require('../scripts/verifyGeminiAgent');
const { startupErrorLogFields } = require('../src/server');
const { createLogger, safeLogPayload } = require('../src/utils/logger');
const { redactSecrets } = require('../src/utils/redact');
const { isRetryableError } = require('../src/utils/retryability');
const { readinessHandler } = require('../src/routes/health.routes');

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
  aiProvider: 'mock',
  gemini: {
    model: undefined,
    webSearchEnabled: false,
  },
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
  server = http.createServer(
    createApp({ config, logger: testLogger, provider: new MockProvider() }),
  );
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
    () =>
      readEnvironment({
        NODE_ENV: 'test',
        AI_PROVIDER: 'mock',
        EXTERNAL_AGENT_RUNTIME_TOKEN: 'too-short',
      }),
    /EXTERNAL_AGENT_RUNTIME_TOKEN.*32 characters/,
  );
});

test('Gemini environment requires an API key', () => {
  assert.throws(
    () =>
      readEnvironment({
        NODE_ENV: 'test',
        AI_PROVIDER: 'gemini',
        GEMINI_MODEL: 'available-model',
        EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
      }),
    /GEMINI_API_KEY.*required/,
  );
});

test('Gemini environment requires a configurable model', () => {
  assert.throws(
    () =>
      readEnvironment({
        NODE_ENV: 'test',
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
        EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
      }),
    /GEMINI_MODEL.*required/,
  );
});

test('Gemini attempt defaults leave room for every retry and request-level overhead', () => {
  const parsed = readEnvironment({
    NODE_ENV: 'test',
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
    GEMINI_MODEL: 'gemini-2.5-flash',
    EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
  });

  assert.equal(parsed.gemini.researchTimeoutMs, 120_000);
  assert.equal(parsed.gemini.formattingTimeoutMs, 60_000);
  assert.equal(parsed.gemini.researchMaxAttempts, 2);
  assert.equal(parsed.gemini.formattingMaxAttempts, 2);
  assert.equal(parsed.gemini.researchOperationTimeoutMs, 241_499);
  assert.equal(parsed.gemini.formattingOperationTimeoutMs, 121_499);
  assert.equal(parsed.gemini.retryDelayBudgetMs, 2_998);
  assert.equal(parsed.gemini.researchMaxOutputTokens, 512);
  assert.equal(parsed.gemini.researchFallbackMaxOutputTokens, 256);
  assert.equal(parsed.gemini.formattingMaxOutputTokens, 1_500);
  assert.equal(parsed.requestTimeoutMs, 390_000);
  assert.ok(parsed.requestTimeoutMs > 241_499 + 121_499 + GEMINI_PROCESSING_OVERHEAD_MS);
});

test('request timeout must exceed all Gemini attempts, maximum retry delays, and overhead', () => {
  assert.throws(
    () =>
      readEnvironment({
        NODE_ENV: 'test',
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
        GEMINI_MODEL: 'gemini-2.5-flash',
        GEMINI_RESEARCH_TIMEOUT_MS: '120000',
        GEMINI_FORMATTING_TIMEOUT_MS: '60000',
        GEMINI_RESEARCH_MAX_ATTEMPTS: '2',
        GEMINI_FORMATTING_MAX_ATTEMPTS: '2',
        REQUEST_TIMEOUT_MS: '372998',
        EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
      }),
    /REQUEST_TIMEOUT_MS.*all configured Gemini attempts, maximum retry delays, and processing overhead/,
  );
});

test('legacy Gemini timeout is used only for absent stage-specific settings', () => {
  const parsed = readEnvironment({
    NODE_ENV: 'test',
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
    GEMINI_MODEL: 'gemini-2.5-flash',
    GEMINI_REQUEST_TIMEOUT_MS: '40000',
    GEMINI_RESEARCH_TIMEOUT_MS: '50000',
    REQUEST_TIMEOUT_MS: '200000',
    EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
  });

  assert.equal(parsed.gemini.researchTimeoutMs, 50_000);
  assert.equal(parsed.gemini.formattingTimeoutMs, 40_000);
});

test('stale legacy 115000 stage fallback is rejected when its retry budget exceeds the request', () => {
  assert.throws(
    () =>
      readEnvironment({
        NODE_ENV: 'test',
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
        GEMINI_MODEL: 'gemini-2.5-flash',
        GEMINI_REQUEST_TIMEOUT_MS: '115000',
        REQUEST_TIMEOUT_MS: '300000',
        EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
      }),
    /REQUEST_TIMEOUT_MS.*472998 milliseconds/,
  );
});

test('stage-specific deadlines override a stale 115000 legacy fallback', () => {
  const parsed = readEnvironment({
    NODE_ENV: 'test',
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
    GEMINI_MODEL: 'gemini-2.5-flash',
    GEMINI_REQUEST_TIMEOUT_MS: '115000',
    GEMINI_RESEARCH_TIMEOUT_MS: '120000',
    GEMINI_FORMATTING_TIMEOUT_MS: '60000',
    REQUEST_TIMEOUT_MS: '390000',
    EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
  });

  assert.equal(parsed.gemini.researchTimeoutMs, 120_000);
  assert.equal(parsed.gemini.formattingTimeoutMs, 60_000);
  assert.notEqual(parsed.gemini.researchTimeoutMs, 115_000);
  assert.notEqual(parsed.gemini.formattingTimeoutMs, 115_000);
  assert.equal(parsed.requestTimeoutMs, 390_000);
});

test('maximum two-attempt retry budget fits beneath the default request deadline', () => {
  const budget = providerRequestBudget({
    researchTimeoutMs: 120_000,
    formattingTimeoutMs: 60_000,
    researchMaxAttempts: 2,
    formattingMaxAttempts: 2,
  });
  assert.deepEqual(budget, {
    researchOperationTimeoutMs: 241_499,
    formattingOperationTimeoutMs: 121_499,
    retryDelayBudgetMs: 2_998,
    totalTimeoutMs: 372_998,
  });
  assert.ok(budget.totalTimeoutMs < 390_000);
});

test('live verifier timeout is above the external request and remains explicitly bounded', () => {
  assert.equal(resolveVerifierTimeoutMs({ REQUEST_TIMEOUT_MS: '390000' }), 410_000);
  assert.equal(DEFAULT_LIVE_VERIFIER_TIMEOUT_MS, 410_000);
  assert.equal(DEFAULT_BACKEND_RUNTIME_GATEWAY_TIMEOUT_MS, 430_000);
  assert.throws(
    () =>
      resolveVerifierTimeoutMs({
        REQUEST_TIMEOUT_MS: '390000',
        EXTERNAL_AGENT_VERIFY_TIMEOUT_MS: '390000',
      }),
    /must exceed REQUEST_TIMEOUT_MS/,
  );
  assert.throws(
    () =>
      resolveVerifierTimeoutMs({
        REQUEST_TIMEOUT_MS: '390000',
        EXTERNAL_AGENT_VERIFY_TIMEOUT_MS: '430000',
        RUNTIME_INVOCATION_TIMEOUT_MS: '430000',
      }),
    /must be less than RUNTIME_INVOCATION_TIMEOUT_MS/,
  );
});

test('Gemini live verifier topic requires current concise multi-source Google Search research', () => {
  const topic = verificationResearchTopic(new Date('2026-07-17T12:00:00.000Z'));

  assert.match(topic, /Google Search/i);
  assert.match(topic, /current latest stable release/i);
  assert.match(topic, /2026-07-17/);
  assert.match(topic, /at least two genuine web sources/i);
  assert.match(topic, /source-backed factual findings/i);
  assert.match(topic, /concise/i);
});

test('formatting attempts are configurable only within the conservative bound', () => {
  const parsed = readEnvironment({
    NODE_ENV: 'test',
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
    GEMINI_MODEL: 'gemini-2.5-flash',
    GEMINI_FORMATTING_MAX_ATTEMPTS: '1',
    EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
  });

  assert.equal(parsed.gemini.formattingMaxAttempts, 1);
  for (const invalidValue of ['0', '3', '1.5']) {
    assert.throws(
      () =>
        readEnvironment({
          NODE_ENV: 'test',
          AI_PROVIDER: 'gemini',
          GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
          GEMINI_MODEL: 'gemini-2.5-flash',
          GEMINI_FORMATTING_MAX_ATTEMPTS: invalidValue,
          EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
        }),
      /GEMINI_FORMATTING_MAX_ATTEMPTS/,
    );
  }
});

test('grounded research attempts remain configurable within the one-retry bound', () => {
  const parsed = readEnvironment({
    NODE_ENV: 'test',
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
    GEMINI_MODEL: 'gemini-2.5-flash',
    GEMINI_RESEARCH_MAX_ATTEMPTS: '2',
    EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
  });

  assert.equal(parsed.gemini.researchMaxAttempts, 2);
  for (const invalidValue of ['0', '3', '1.5']) {
    assert.throws(
      () =>
        readEnvironment({
          NODE_ENV: 'test',
          AI_PROVIDER: 'gemini',
          GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
          GEMINI_MODEL: 'gemini-2.5-flash',
          GEMINI_RESEARCH_MAX_ATTEMPTS: invalidValue,
          EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
        }),
      /GEMINI_RESEARCH_MAX_ATTEMPTS/,
    );
  }
});

test('grounded research output budgets stay below the legacy formatting budget', () => {
  const parsed = readEnvironment({
    NODE_ENV: 'test',
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
    GEMINI_MODEL: 'gemini-2.5-flash',
    GEMINI_MAX_OUTPUT_TOKENS: '1800',
    EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
  });

  assert.equal(parsed.gemini.researchMaxOutputTokens, 512);
  assert.equal(parsed.gemini.researchFallbackMaxOutputTokens, 256);
  assert.equal(parsed.gemini.formattingMaxOutputTokens, 1_800);
  assert.throws(
    () =>
      readEnvironment({
        NODE_ENV: 'test',
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
        GEMINI_MODEL: 'gemini-2.5-flash',
        GEMINI_RESEARCH_MAX_OUTPUT_TOKENS: '256',
        GEMINI_RESEARCH_FALLBACK_MAX_OUTPUT_TOKENS: '256',
        EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
      }),
    /GEMINI_RESEARCH_FALLBACK_MAX_OUTPUT_TOKENS.*must be less than/,
  );
});

test('Gemini model rejects resource names that could disclose project identifiers', () => {
  assert.throws(
    () =>
      readEnvironment({
        NODE_ENV: 'test',
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
        GEMINI_MODEL: 'projects/private-project/locations/us/models/gemini',
        EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
      }),
    /GEMINI_MODEL.*without project or location identifiers/,
  );
});

test('Gemini thinking settings are optional and preserve model defaults', () => {
  const parsed = readEnvironment({
    NODE_ENV: 'test',
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
    GEMINI_MODEL: 'gemini-2.5-flash',
    GEMINI_THINKING_LEVEL: '',
    GEMINI_THINKING_BUDGET: '',
    EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
  });

  assert.equal(parsed.gemini.thinkingLevel, undefined);
  assert.equal(parsed.gemini.thinkingBudget, undefined);
});

test('Gemini 2.5 accepts a non-negative numeric thinking budget', () => {
  const parsed = readEnvironment({
    NODE_ENV: 'test',
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
    GEMINI_MODEL: 'gemini-2.5-flash',
    GEMINI_THINKING_BUDGET: '256',
    EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
  });

  assert.equal(parsed.gemini.thinkingBudget, 256);
  assert.equal(parsed.gemini.thinkingLevel, undefined);
});

test('Gemini environment rejects invalid and model-incompatible thinking fields', () => {
  assert.throws(
    () =>
      readEnvironment({
        NODE_ENV: 'test',
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
        GEMINI_MODEL: 'gemini-2.5-flash',
        GEMINI_THINKING_LEVEL: 'medium',
        EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
      }),
    /GEMINI_THINKING_LEVEL.*not supported.*gemini-2\.5-flash/,
  );
  assert.throws(
    () =>
      readEnvironment({
        NODE_ENV: 'test',
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
        GEMINI_MODEL: 'gemini-3-flash-preview',
        GEMINI_THINKING_BUDGET: '128',
        EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
      }),
    /GEMINI_THINKING_BUDGET.*not supported.*gemini-3-flash-preview/,
  );
  assert.throws(
    () =>
      readEnvironment({
        NODE_ENV: 'test',
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-placeholder-not-a-real-key',
        GEMINI_MODEL: 'gemini-2.5-flash',
        GEMINI_THINKING_BUDGET: '-1',
        EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
      }),
    /GEMINI_THINKING_BUDGET.*non-negative integer.*gemini-2\.5-flash/,
  );
});

test('mock provider cannot be selected in production', () => {
  assert.throws(
    () =>
      readEnvironment({
        NODE_ENV: 'production',
        AI_PROVIDER: 'mock',
        EXTERNAL_AGENT_RUNTIME_TOKEN: RUNTIME_TOKEN,
      }),
    /AI_PROVIDER.*not allowed in production/,
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
    status: 'ok',
    version: '2.0.0',
  });
  assert.match(result.body.meta.requestId, /^req_/);
});

test('readiness reports configuration without invoking the provider', async () => {
  const result = await request('/ready');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data.status, 'ready');
  assert.deepEqual(result.body.data.ai, { provider: 'mock', configured: true });
  assert.deepEqual(result.body.data.runtimeAuthentication, { configured: true });
  assert.equal(JSON.stringify(result.body).includes(RUNTIME_TOKEN), false);
});

test('readiness fails safely when provider configuration is unavailable and performs no AI request', () => {
  let researchCalls = 0;
  const provider = {
    checkConfiguration() {
      return { provider: 'gemini', configured: false };
    },
    research() {
      researchCalls += 1;
    },
  };
  const response = {
    statusCode: 200,
    payload: undefined,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
  readinessHandler(provider, { runtimeToken: RUNTIME_TOKEN })(
    { traceId: 'trace_ready-test', requestId: 'req_ready-test' },
    response,
  );
  assert.equal(response.statusCode, 503);
  assert.equal(response.payload.data.ai.provider, 'gemini');
  assert.equal(response.payload.data.ai.configured, false);
  assert.equal(researchCalls, 0);
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

test('valid bearer token returns Passport-compatible mock research output', async () => {
  const traceId = 'trace_external-flow-test';
  const requestId = 'req_external-flow-test';
  const result = await request('/v1/research/invoke', {
    method: 'POST',
    headers: {
      ...authorization(),
      'X-Trace-Id': traceId,
      'X-Request-Id': requestId,
      'X-Invocation-Id': 'invocation-safe-123',
    },
    body: { topic: '  latest AI infrastructure trends  ' },
  });

  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body.response, {
    summary: 'External agent result for: latest AI infrastructure trends',
    sources: ['https://example.com/external-agent-source'],
    runtime: {
      service: 'external-research-agent',
      version: '2.0.0',
      provider: 'mock',
      model: 'deterministic-test',
      webSearchUsed: false,
      sourceCount: 1,
      researchAttemptCount: 1,
      researchAttemptDurationsMs: [0],
      fallbackResearchProfileUsed: false,
      groundingFallbackUsed: false,
      finalProviderStatus: 'OK',
      groundingMetadataCount: 0,
    },
  });
  assert.equal(result.body.meta.traceId, traceId);
  assert.equal(result.body.meta.requestId, requestId);
  assert.equal(result.response.headers.get('x-trace-id'), traceId);
  assert.equal(result.response.headers.get('x-request-id'), requestId);
  assert.equal(result.text.includes(RUNTIME_TOKEN), false);
  await new Promise((resolve) => setImmediate(resolve));
  const diagnostics = logLines.join('');
  assert.match(diagnostics, new RegExp(traceId));
  assert.equal(diagnostics.includes('latest AI infrastructure trends'), false);
  assert.equal(diagnostics.includes('External agent result for:'), false);
});

test('invalid and oversized trace identifiers are replaced safely', async () => {
  const oversized = `trace_${'x'.repeat(200)}`;
  const result = await request('/health', { headers: { 'X-Trace-Id': oversized } });
  const returned = result.response.headers.get('x-trace-id');
  assert.notEqual(returned, oversized);
  assert.match(returned, /^trace_/);
});

test('external retryability and recursive redaction cover safe diagnostics', () => {
  assert.equal(isRetryableError({ code: 'GEMINI_RATE_LIMITED' }), false);
  assert.equal(isRetryableError({ code: 'RUNTIME_AUTHENTICATION_FAILED' }), false);
  assert.equal(isRetryableError({ code: 'GEMINI_WEB_SEARCH_FAILED', statusCode: 502 }), false);
  assert.equal(isRetryableError({ code: 'GEMINI_UNKNOWN_ERROR', statusCode: 502 }), false);
  const secret = 'external-secret-12345678';
  const redacted = redactSecrets({
    headers: { Authorization: `Bearer ${secret}` },
    nested: [{ apiKey: secret, encryptedPayload: { token: secret } }],
    url: `https://example.test/?runtimeToken=${secret}`,
    error: Object.assign(new Error(`failed while handling prompt ${secret}`), { topic: secret }),
  });
  assert.equal(JSON.stringify(redacted).includes(secret), false);
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
