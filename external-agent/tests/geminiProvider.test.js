const assert = require('node:assert/strict');
const http = require('node:http');
const { Writable } = require('node:stream');
const { test } = require('node:test');
const { createApp } = require('../src/app');
const {
  GeminiProvider,
  isBlockedResponse,
  mapGeminiError,
} = require('../src/providers/gemini.provider');
const { extractGeminiSources, requireGeminiSources } = require('../src/utils/extractGeminiSources');
const { createLogger } = require('../src/utils/logger');

const TEST_CONFIG = Object.freeze({
  apiKey: 'test-placeholder-not-a-real-api-key',
  model: 'project-configured-model',
  webSearchEnabled: true,
  requestTimeoutMs: 2_000,
  maxOutputTokens: 1_500,
  maxSources: 8,
  thinkingLevel: 'medium',
});

function candidate(text, options = {}) {
  return {
    candidates: [
      {
        finishReason: options.finishReason || 'STOP',
        content: { parts: text === undefined ? [] : [{ text }] },
        ...(options.sources
          ? {
              groundingMetadata: {
                groundingChunks: options.sources.map((source) => ({ web: source })),
              },
            }
          : {}),
      },
    ],
  };
}

function fakeClient(responses) {
  const calls = [];
  return {
    calls,
    models: {
      async generateContent(parameters) {
        calls.push(parameters);
        const next = responses.shift();
        if (next instanceof Error) throw next;
        return next;
      },
    },
  };
}

test('Gemini provider uses grounded research then strict formatting', async () => {
  const client = fakeClient([
    candidate('Grounded facts with uncertainty.', {
      sources: [
        { title: 'Primary source', uri: 'https://authority.example/report?utm_source=search' },
      ],
    }),
    candidate(JSON.stringify({ summary: 'Concise grounded synthesis.' })),
  ]);
  const provider = new GeminiProvider(TEST_CONFIG, { client });

  const result = await provider.research({ topic: 'Secure agent interoperability' });

  assert.deepEqual(result, {
    summary: 'Concise grounded synthesis.',
    sourceReferences: [{ title: 'Primary source', url: 'https://authority.example/report' }],
    webSearchUsed: true,
  });
  assert.equal(client.calls.length, 2);
  assert.deepEqual(client.calls[0].config.tools, [{ googleSearch: {} }]);
  assert.equal(client.calls[0].config.httpOptions.retryOptions.attempts, 1);
  assert.equal(client.calls[1].config.tools, undefined);
  assert.equal(client.calls[1].config.responseMimeType, 'application/json');
  assert.equal(client.calls[1].config.responseJsonSchema.additionalProperties, false);
  assert.equal(client.calls[0].model, TEST_CONFIG.model);
  assert.equal(client.calls[0].contents.includes('Secure agent interoperability'), true);
});

test('invalid formatter JSON maps to a safe structured-output error', async () => {
  const client = fakeClient([
    candidate('Grounded facts.', {
      sources: [{ title: 'Source', uri: 'https://authority.example/source' }],
    }),
    candidate('not-json'),
  ]);
  const provider = new GeminiProvider(TEST_CONFIG, { client });

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) => error.code === 'GEMINI_INVALID_STRUCTURED_OUTPUT' && error.details.length === 0,
  );
});

test('source extraction deduplicates normalized grounding URLs', () => {
  const response = candidate('Grounded.', {
    sources: [
      { title: 'First', uri: 'https://example.com/report?utm_source=one#section' },
      { title: 'Duplicate', uri: 'https://example.com/report' },
      { title: 'Second', uri: 'http://other.example/facts' },
    ],
  });

  assert.deepEqual(extractGeminiSources(response, { maxSources: 8 }), [
    { title: 'First', url: 'https://example.com/report' },
    { title: 'Second', url: 'http://other.example/facts' },
  ]);
});

test('source extraction rejects unsafe URLs and credential-like query parameters', () => {
  const response = candidate('Grounded.', {
    sources: [
      { title: 'Script', uri: 'javascript:alert(1)' },
      { title: 'Credential', uri: 'https://example.com/report?access_token=secret' },
      { title: 'Embedded auth', uri: 'https://user:password@example.com/report' },
      { title: 'Key leak', uri: `https://example.com/${TEST_CONFIG.apiKey}` },
    ],
  });

  assert.deepEqual(extractGeminiSources(response, { forbiddenValues: [TEST_CONFIG.apiKey] }), []);
  assert.throws(
    () => requireGeminiSources(response, { forbiddenValues: [TEST_CONFIG.apiKey] }),
    (error) => error.code === 'GEMINI_SOURCE_EXTRACTION_FAILED',
  );
});

test('missing grounding metadata fails without fabricated citations', async () => {
  const provider = new GeminiProvider(TEST_CONFIG, {
    client: fakeClient([candidate('Ungrounded answer.')]),
  });

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) => error.code === 'GEMINI_SOURCE_EXTRACTION_FAILED',
  );
});

test('timeout and rate-limit failures map to stable safe codes', () => {
  const timeout = mapGeminiError(new Error('raw timeout containing a secret'), { timedOut: true });
  const rateLimited = mapGeminiError(
    Object.assign(new Error('raw quota response'), { status: 429 }),
  );

  assert.equal(timeout.code, 'GEMINI_REQUEST_TIMEOUT');
  assert.equal(timeout.message.includes('secret'), false);
  assert.equal(rateLimited.code, 'GEMINI_RATE_LIMITED');
  assert.equal(rateLimited.statusCode, 503);
});

test('model and Google Search request failures map to configuration and search codes', () => {
  assert.equal(
    mapGeminiError(Object.assign(new Error('missing model'), { status: 404 })).code,
    'GEMINI_CONFIGURATION_ERROR',
  );
  assert.equal(
    mapGeminiError(Object.assign(new Error('tool rejected'), { status: 400 }), {
      stage: 'research',
      webSearchEnabled: true,
    }).code,
    'GEMINI_WEB_SEARCH_FAILED',
  );
});

test('blocked Gemini responses map without exposing provider internals', async () => {
  const blocked = candidate(undefined, { finishReason: 'SAFETY' });
  assert.equal(isBlockedResponse(blocked), true);
  const provider = new GeminiProvider(TEST_CONFIG, { client: fakeClient([blocked]) });

  await assert.rejects(
    () => provider.research({ topic: 'A valid research topic' }),
    (error) => error.code === 'GEMINI_RESPONSE_BLOCKED' && !error.message.includes('SAFETY'),
  );
});

test('authentication failures never expose the API key', async () => {
  const raw = Object.assign(new Error(`Rejected key ${TEST_CONFIG.apiKey}`), { status: 401 });
  const provider = new GeminiProvider(TEST_CONFIG, { client: fakeClient([raw]) });

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) =>
      error.code === 'GEMINI_AUTHENTICATION_FAILED' &&
      !error.message.includes(TEST_CONFIG.apiKey) &&
      JSON.stringify(error.details).includes(TEST_CONFIG.apiKey) === false,
  );
});

test('API key is absent from HTTP errors and captured logs', async (context) => {
  const raw = Object.assign(new Error(`Rejected key ${TEST_CONFIG.apiKey}`), { status: 401 });
  const provider = new GeminiProvider(TEST_CONFIG, { client: fakeClient([raw]) });
  const logLines = [];
  const logger = createLogger({
    base: null,
    destination: new Writable({
      write(chunk, _encoding, callback) {
        logLines.push(chunk.toString());
        callback();
      },
    }),
  });
  const runtimeToken = 'test_runtime_secret_0123456789_abcdefghijklmnopqrstuvwxyz';
  const server = http.createServer(
    createApp({
      provider,
      logger,
      config: {
        runtimeToken,
        allowedGatewayOrigins: [],
        requestTimeoutMs: 2_000,
        jsonBodyLimit: '32kb',
        rateLimitWindowMs: 60_000,
        rateLimitMax: 10,
        aiProvider: 'gemini',
        gemini: TEST_CONFIG,
      },
    }),
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(
    () => new Promise((resolve) => (server.closeAllConnections?.(), server.close(resolve))),
  );

  const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/research/invoke`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runtimeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic: 'Secure agents' }),
  });
  const text = await response.text();
  logger.flush?.();

  assert.equal(response.status, 502);
  assert.equal(JSON.parse(text).error.code, 'GEMINI_AUTHENTICATION_FAILED');
  assert.equal(text.includes(TEST_CONFIG.apiKey), false);
  assert.equal(logLines.join('').includes(TEST_CONFIG.apiKey), false);
});

test('only one transient retry is permitted across the research workflow', async () => {
  const transient = Object.assign(new Error('temporary'), { status: 503 });
  const client = fakeClient([
    transient,
    candidate('Grounded facts.', {
      sources: [{ title: 'Source', uri: 'https://authority.example/source' }],
    }),
    transient,
  ]);
  const provider = new GeminiProvider(TEST_CONFIG, {
    client,
    delay: async () => undefined,
    random: () => 0,
  });

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) => error.code === 'GEMINI_UPSTREAM_UNAVAILABLE',
  );
  assert.equal(client.calls.length, 3);
});
