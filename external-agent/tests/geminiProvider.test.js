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
const {
  extractGeminiSources,
  inspectGeminiResponseShape,
  requireGeminiSources,
} = require('../src/utils/extractGeminiSources');
const { createLogger } = require('../src/utils/logger');

const TEST_CONFIG = Object.freeze({
  apiKey: 'test-placeholder-not-a-real-api-key',
  model: 'gemini-3-flash-preview',
  webSearchEnabled: true,
  requestTimeoutMs: 2_000,
  formattingMaxAttempts: 2,
  maxOutputTokens: 1_500,
  maxSources: 8,
  thinkingLevel: 'medium',
});

function memoryLogger() {
  const entries = [];
  return {
    entries,
    info(fields, message) {
      entries.push({ level: 'info', fields, message });
    },
    warn(fields, message) {
      entries.push({ level: 'warn', fields, message });
    },
  };
}

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
  assert.deepEqual(client.calls[0].config.thinkingConfig, { thinkingLevel: 'MEDIUM' });
  assert.deepEqual(client.calls[1].config.thinkingConfig, { thinkingLevel: 'MEDIUM' });
  assert.notEqual(client.calls[0].config.abortSignal, client.calls[1].config.abortSignal);
  assert.equal(client.calls[0].config.abortSignal instanceof AbortSignal, true);
  assert.equal(client.calls[1].config.abortSignal instanceof AbortSignal, true);
});

test('grounded research local timeout is stage-aware and does not begin formatting', async () => {
  const calls = [];
  const logger = memoryLogger();
  const client = {
    models: {
      generateContent(parameters) {
        calls.push(parameters);
        return new Promise((_resolve, reject) => {
          parameters.config.abortSignal.addEventListener(
            'abort',
            () => reject(parameters.config.abortSignal.reason),
            { once: true },
          );
        });
      },
    },
  };
  const provider = new GeminiProvider(
    { ...TEST_CONFIG, researchTimeoutMs: 10, formattingTimeoutMs: 50 },
    { client, logger },
  );

  await assert.rejects(
    () =>
      provider.research({
        topic: 'sensitive research topic that must not be logged',
        requestId: 'req_research-timeout',
      }),
    (error) =>
      error.code === 'GEMINI_REQUEST_TIMEOUT' &&
      error.operation === 'grounded_research' &&
      error.reason === 'LOCAL_PROVIDER_DEADLINE_EXCEEDED' &&
      error.timeoutReason === 'LOCAL_PROVIDER_DEADLINE_EXCEEDED' &&
      error.configuredTimeoutMs === 10,
  );

  assert.equal(calls.length, 1);
  assert.equal(logger.entries.length, 2);
  const completion = logger.entries.find((entry) => entry.message === 'Gemini operation completed');
  assert.deepEqual(
    {
      requestId: completion.fields.requestId,
      operation: completion.fields.operation,
      model: completion.fields.model,
      configuredTimeoutMs: completion.fields.configuredTimeoutMs,
      locallyAborted: completion.fields.locallyAborted,
    },
    {
      requestId: 'req_research-timeout',
      operation: 'grounded_research',
      model: TEST_CONFIG.model,
      configuredTimeoutMs: 10,
      locallyAborted: true,
    },
  );
  assert.equal(Number.isInteger(completion.fields.durationMs), true);
  assert.equal(JSON.stringify(logger.entries).includes('sensitive research topic'), false);
  assert.equal(JSON.stringify(logger.entries).includes(TEST_CONFIG.apiKey), false);
});

test('structured formatting local timeout is identified with a fresh controller', async () => {
  const calls = [];
  const logger = memoryLogger();
  const client = {
    models: {
      generateContent(parameters) {
        calls.push(parameters);
        if (calls.length === 1) {
          return Promise.resolve(
            candidate('Grounded facts.', {
              sources: [{ title: 'Source', uri: 'https://authority.example/source' }],
            }),
          );
        }
        return new Promise((_resolve, reject) => {
          parameters.config.abortSignal.addEventListener(
            'abort',
            () => reject(parameters.config.abortSignal.reason),
            { once: true },
          );
        });
      },
    },
  };
  const provider = new GeminiProvider(
    { ...TEST_CONFIG, researchTimeoutMs: 50, formattingTimeoutMs: 10 },
    { client, logger },
  );

  await assert.rejects(
    () =>
      provider.research({
        topic: 'Formatting timeout',
        requestId: 'req_formatting-timeout',
      }),
    (error) =>
      error.code === 'GEMINI_REQUEST_TIMEOUT' &&
      error.operation === 'structured_formatting' &&
      error.stage === 'structured_formatting' &&
      error.reason === 'LOCAL_PROVIDER_DEADLINE_EXCEEDED' &&
      error.timeoutReason === 'LOCAL_PROVIDER_DEADLINE_EXCEEDED' &&
      error.configuredTimeoutMs === 10 &&
      error.recoveryRequired === true &&
      error.recoveryReason === 'FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH',
  );

  assert.equal(calls.length, 2);
  assert.notEqual(calls[0].config.abortSignal, calls[1].config.abortSignal);
  assert.equal(calls[0].config.abortSignal.aborted, false);
  assert.equal(calls[1].config.abortSignal.aborted, true);
  const operationEntries = logger.entries.filter(
    (entry) => entry.message === 'Gemini operation completed',
  );
  assert.deepEqual(
    operationEntries.map((entry) => ({
      operation: entry.fields.operation,
      configuredTimeoutMs: entry.fields.configuredTimeoutMs,
      locallyAborted: entry.fields.locallyAborted,
    })),
    [
      {
        operation: 'grounded_research',
        configuredTimeoutMs: 50,
        locallyAborted: false,
      },
      {
        operation: 'structured_formatting',
        configuredTimeoutMs: 10,
        locallyAborted: true,
      },
    ],
  );
});

test('gemini-2.5-flash omits thinkingLevel and uses model defaults when unset', async () => {
  const client = fakeClient([
    candidate('Grounded facts.', {
      sources: [{ title: 'Source', uri: 'https://authority.example/source' }],
    }),
    candidate(JSON.stringify({ summary: 'Default thinking result.' })),
  ]);
  const provider = new GeminiProvider(
    {
      ...TEST_CONFIG,
      model: 'gemini-2.5-flash',
      thinkingLevel: undefined,
      thinkingBudget: undefined,
    },
    { client },
  );

  await provider.research({ topic: 'Model defaults' });

  assert.equal(client.calls.length, 2);
  for (const call of client.calls) {
    assert.equal(call.config.thinkingConfig, undefined);
  }
});

test('gemini-2.5-flash sends only a numeric thinkingBudget when configured', async () => {
  const client = fakeClient([
    candidate('Grounded facts.', {
      sources: [{ title: 'Source', uri: 'https://authority.example/source' }],
    }),
    candidate(JSON.stringify({ summary: 'Budgeted thinking result.' })),
  ]);
  const provider = new GeminiProvider(
    {
      ...TEST_CONFIG,
      model: 'gemini-2.5-flash',
      thinkingLevel: undefined,
      thinkingBudget: 256,
    },
    { client },
  );

  await provider.research({ topic: 'Budgeted thinking' });

  for (const call of client.calls) {
    assert.deepEqual(call.config.thinkingConfig, { thinkingBudget: 256 });
    assert.equal(call.config.thinkingConfig.thinkingLevel, undefined);
  }
});

test('model-incompatible thinking settings fail before a Gemini request', async () => {
  const gemini25Client = fakeClient([]);
  const gemini25Provider = new GeminiProvider(
    { ...TEST_CONFIG, model: 'gemini-2.5-flash', thinkingLevel: 'high' },
    { client: gemini25Client },
  );
  await assert.rejects(
    () => gemini25Provider.research({ topic: 'Invalid level' }),
    (error) =>
      error.code === 'GEMINI_CONFIGURATION_ERROR' &&
      error.details.length === 0 &&
      error.configuration.field === 'GEMINI_THINKING_LEVEL' &&
      error.configuration.model === 'gemini-2.5-flash' &&
      error.configuration.reason.includes('not supported'),
  );
  assert.equal(gemini25Client.calls.length, 0);

  const gemini3Client = fakeClient([]);
  const gemini3Provider = new GeminiProvider(
    { ...TEST_CONFIG, thinkingBudget: 256 },
    { client: gemini3Client },
  );
  await assert.rejects(
    () => gemini3Provider.research({ topic: 'Invalid budget' }),
    (error) =>
      error.code === 'GEMINI_CONFIGURATION_ERROR' &&
      error.configuration.field === 'GEMINI_THINKING_BUDGET' &&
      error.configuration.model === TEST_CONFIG.model &&
      error.configuration.reason.includes('not supported'),
  );
  assert.equal(gemini3Client.calls.length, 0);
});

test('configuration errors are public-safe while logs keep field, model, and reason', async (context) => {
  const invalidLevel = 'sensitive-invalid-thinking-value';
  const apiKey = 'sensitive-test-api-key-that-must-not-be-logged';
  const provider = new GeminiProvider(
    { ...TEST_CONFIG, apiKey, thinkingLevel: invalidLevel },
    { client: fakeClient([]) },
  );
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
        gemini: { ...TEST_CONFIG, apiKey, thinkingLevel: invalidLevel },
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
    body: JSON.stringify({ topic: 'Configuration diagnostics' }),
  });
  const text = await response.text();
  const body = JSON.parse(text);
  logger.flush?.();
  const capturedLogs = logLines.join('');

  assert.equal(response.status, 500);
  assert.equal(body.error.code, 'GEMINI_CONFIGURATION_ERROR');
  assert.equal(body.error.message, 'The research provider is not configured.');
  assert.deepEqual(body.error.details, []);
  assert.equal(text.includes(TEST_CONFIG.model), false);
  assert.equal(text.includes(invalidLevel), false);
  assert.match(capturedLogs, /GEMINI_THINKING_LEVEL/);
  assert.match(capturedLogs, /gemini-3-flash-preview/);
  assert.match(capturedLogs, /supported by the installed Gemini SDK/);
  assert.equal(capturedLogs.includes(invalidLevel), false);
  assert.equal(capturedLogs.includes(apiKey), false);
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
    (error) =>
      error.code === 'GEMINI_INVALID_STRUCTURED_OUTPUT' &&
      error.details.length === 0 &&
      error.operation === 'structured_formatting' &&
      error.recoveryRequired !== true,
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

test('documented grounding chunks extract web.uri and web.title', () => {
  const response = {
    candidates: [
      {
        finishReason: 'STOP',
        content: { parts: [{ text: 'Grounded text.' }] },
        groundingMetadata: {
          webSearchQueries: ['safe query'],
          groundingChunks: [
            {
              web: {
                uri: 'https://publisher.example/research',
                title: 'Publisher research',
              },
            },
          ],
          groundingSupports: [{ segment: { startIndex: 0, endIndex: 8 } }],
          searchEntryPoint: { renderedContent: 'not logged by diagnostics' },
        },
      },
    ],
    usageMetadata: { promptTokenCount: 10, toolUsePromptTokenCount: 5 },
  };

  assert.deepEqual(extractGeminiSources(response), [
    { title: 'Publisher research', url: 'https://publisher.example/research' },
  ]);
  assert.deepEqual(inspectGeminiResponseShape(response), {
    requestId: undefined,
    operation: 'grounded_research',
    model: undefined,
    candidateCount: 1,
    candidateFinishReasons: ['STOP'],
    contentPartCount: 1,
    groundingMetadataPresent: true,
    groundingMetadataKeys: [
      'groundingChunks',
      'groundingSupports',
      'searchEntryPoint',
      'webSearchQueries',
    ],
    webSearchQueryCount: 1,
    groundingChunkCount: 1,
    groundingSupportCount: 1,
    searchEntryPointPresent: true,
    usageMetadataKeys: ['promptTokenCount', 'toolUsePromptTokenCount'],
  });
});

test('source extraction inspects all candidates and supports SDK snake-case metadata', () => {
  const response = {
    candidates: [
      {
        groundingMetadata: {
          groundingChunks: [{ web: { uri: 'https://one.example/source', title: 'One' } }],
        },
      },
      {
        grounding_metadata: {
          grounding_chunks: [
            { web: { uri: 'https://two.example/source', title: 'Two' } },
            { web: { uri: 'https://one.example/source', title: 'Duplicate' } },
          ],
        },
      },
    ],
  };

  assert.deepEqual(extractGeminiSources(response), [
    { title: 'One', url: 'https://one.example/source' },
    { title: 'Two', url: 'https://two.example/source' },
  ]);
});

test('Google grounding redirect URLs are preserved as provider-issued references', () => {
  const redirect =
    'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGenuineRedirectToken';
  const response = candidate('Grounded.', {
    sources: [{ title: 'Grounded source', uri: redirect }],
  });

  assert.deepEqual(extractGeminiSources(response), [{ title: 'Grounded source', url: redirect }]);
});

test('non-web chunks are ignored and model-text URLs are never accepted', () => {
  const textOnlyUrl = 'https://model-invented.example/not-provider-metadata';
  const response = {
    candidates: [
      {
        content: { parts: [{ text: `Claim with [source](${textOnlyUrl})` }] },
        groundingMetadata: {
          groundingChunks: [
            { retrievedContext: { uri: 'https://retrieval.example/not-web' } },
            { maps: { uri: 'https://maps.example/not-web' } },
          ],
        },
      },
    ],
  };

  assert.deepEqual(extractGeminiSources(response), []);
  assert.throws(
    () => requireGeminiSources(response),
    (error) =>
      error.code === 'GEMINI_SOURCE_PARSING_FAILED' &&
      error.diagnostics.groundingMetadataPresent === true &&
      error.diagnostics.groundingChunkCount === 2 &&
      error.diagnostics.rejectedChunkCount === 2 &&
      error.diagnostics.rejectionReasons.includes('non_web_chunk_ignored'),
  );
});

test('grounding metadata present with malformed web chunks is a parsing failure', () => {
  const response = {
    candidates: [
      {
        finishReason: 'STOP',
        groundingMetadata: {
          groundingChunks: [{ web: {} }, { web: { uri: 'not-a-url' } }, null],
        },
      },
    ],
  };

  assert.throws(
    () => requireGeminiSources(response),
    (error) =>
      error.code === 'GEMINI_SOURCE_PARSING_FAILED' &&
      error.diagnostics.groundingChunkCount === 3 &&
      error.diagnostics.chunkShapeKeys.includes('web') &&
      error.diagnostics.rejectedChunkCount === 3 &&
      error.diagnostics.rejectionReasons.includes('missing_web_uri') &&
      error.diagnostics.rejectionReasons.includes('invalid_url'),
  );
});

test('completely missing grounding metadata is distinguished safely', () => {
  const response = candidate('A URL in text is ignored: https://invented.example/source');

  assert.deepEqual(extractGeminiSources(response), []);
  assert.throws(
    () => requireGeminiSources(response),
    (error) =>
      error.code === 'GEMINI_GROUNDING_METADATA_MISSING' &&
      error.diagnostics.candidateCount === 1 &&
      error.diagnostics.groundingMetadataPresent === false &&
      error.diagnostics.groundingChunkCount === 0,
  );
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
    (error) =>
      error.code === 'GEMINI_SOURCE_PARSING_FAILED' &&
      error.diagnostics.rejectionReasons.includes('credential_query_parameter') &&
      error.diagnostics.rejectionReasons.includes('obvious_secret_in_url'),
  );
});

test('safe response-shape diagnostics never log text, URLs, topics, or secrets', async () => {
  const logger = memoryLogger();
  const secretTopic = 'sensitive-topic-that-must-not-be-logged';
  const sourceUrl = 'https://publisher.example/private-looking-path';
  const client = fakeClient([
    {
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ text: `private response text about ${secretTopic}` }] },
          groundingMetadata: {
            webSearchQueries: ['private query text'],
            groundingChunks: [{ web: { uri: sourceUrl, title: 'Private title' } }],
            groundingSupports: [{ segment: { text: 'private support text' } }],
            searchEntryPoint: { renderedContent: 'private rendered content' },
          },
        },
      ],
      usageMetadata: { promptTokenCount: 12, toolUsePromptTokenCount: 4 },
    },
    candidate(JSON.stringify({ summary: 'Safe summary.' })),
  ]);
  const provider = new GeminiProvider(TEST_CONFIG, { client, logger });

  await provider.research({ topic: secretTopic, requestId: 'req_safe-shape' });

  const shapeLog = logger.entries.find(
    (entry) => entry.message === 'Gemini grounded research response shape',
  );
  assert.ok(shapeLog);
  assert.equal(shapeLog.fields.requestId, 'req_safe-shape');
  assert.equal(shapeLog.fields.groundingMetadataPresent, true);
  assert.equal(shapeLog.fields.groundingChunkCount, 1);
  assert.equal(shapeLog.fields.webSearchQueryCount, 1);
  const serializedLogs = JSON.stringify(logger.entries);
  for (const forbidden of [
    secretTopic,
    TEST_CONFIG.apiKey,
    sourceUrl,
    'private response text',
    'private query text',
    'Private title',
    'private support text',
    'private rendered content',
  ]) {
    assert.equal(serializedLogs.includes(forbidden), false);
  }
});

test('missing grounding metadata fails without fabricated citations', async () => {
  const client = fakeClient([candidate('Ungrounded answer.')]);
  const provider = new GeminiProvider(TEST_CONFIG, {
    client,
  });

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) =>
      error.code === 'GEMINI_SOURCE_EXTRACTION_FAILED' &&
      error.internalCode === 'GEMINI_GROUNDING_METADATA_MISSING' &&
      error.operation === 'grounded_research' &&
      error.groundingMetadataPresent === false &&
      error.groundingChunkCount === 0,
  );
  assert.equal(client.calls.length, 1);
});

test('timeout and rate-limit failures map to stable safe codes', () => {
  const timeout = mapGeminiError(new Error('raw timeout containing a secret'), { timedOut: true });
  const rateLimited = mapGeminiError(
    Object.assign(new Error('raw quota response'), { status: 429 }),
  );

  assert.equal(timeout.code, 'GEMINI_REQUEST_TIMEOUT');
  assert.equal(timeout.reason, 'LOCAL_PROVIDER_DEADLINE_EXCEEDED');
  assert.equal(timeout.message.includes('secret'), false);
  assert.equal(rateLimited.code, 'GEMINI_RATE_LIMITED');
  assert.equal(rateLimited.statusCode, 503);
});

test('Gemini deadline responses preserve only safe upstream timeout diagnostics', () => {
  const raw = Object.assign(
    new Error(
      JSON.stringify({
        error: {
          code: 504,
          status: 'DEADLINE_EXCEEDED',
          message: 'raw response with secret-token-value',
        },
      }),
    ),
    { name: 'ApiError', status: 504 },
  );

  const mapped = mapGeminiError(raw, { operation: 'grounded_research' });

  assert.equal(mapped.code, 'GEMINI_REQUEST_TIMEOUT');
  assert.equal(mapped.reason, 'GEMINI_DEADLINE_EXCEEDED');
  assert.equal(mapped.operation, 'grounded_research');
  assert.equal(mapped.providerHttpStatus, 504);
  assert.equal(mapped.providerStatus, 'DEADLINE_EXCEEDED');
  assert.equal(JSON.stringify(mapped).includes('secret-token-value'), false);
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
  const client = fakeClient([raw]);
  const provider = new GeminiProvider(TEST_CONFIG, { client });

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) =>
      error.code === 'GEMINI_AUTHENTICATION_FAILED' &&
      !error.message.includes(TEST_CONFIG.apiKey) &&
      JSON.stringify(error.details).includes(TEST_CONFIG.apiKey) === false,
  );
  assert.equal(client.calls.length, 1);
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

test('HTTP timeout errors expose only safe stage deadline metadata', async (context) => {
  const providerSecret = 'private upstream timeout content that must not escape';
  const raw = Object.assign(new Error(providerSecret), {
    status: 504,
    response: { data: { prompt: providerSecret, apiKey: TEST_CONFIG.apiKey } },
  });
  const provider = new GeminiProvider(
    { ...TEST_CONFIG, researchTimeoutMs: 115_000, formattingTimeoutMs: 90_000 },
    { client: fakeClient([raw]) },
  );
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
        requestTimeoutMs: 300_000,
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
      'X-Request-Id': 'req_timeout-metadata',
      'X-Trace-Id': 'trace_timeout-metadata',
    },
    body: JSON.stringify({ topic: 'Safe timeout metadata' }),
  });
  const text = await response.text();
  const body = JSON.parse(text);
  logger.flush?.();

  assert.equal(response.status, 504);
  assert.deepEqual(
    {
      code: body.error.code,
      operation: body.error.operation,
      reason: body.error.reason,
      timeoutReason: body.error.timeoutReason,
      configuredTimeoutMs: body.error.configuredTimeoutMs,
      requestId: body.error.requestId,
      traceId: body.error.traceId,
    },
    {
      code: 'GEMINI_REQUEST_TIMEOUT',
      operation: 'grounded_research',
      reason: 'GEMINI_DEADLINE_EXCEEDED',
      timeoutReason: 'GEMINI_DEADLINE_EXCEEDED',
      configuredTimeoutMs: 115_000,
      requestId: 'req_timeout-metadata',
      traceId: 'trace_timeout-metadata',
    },
  );
  for (const forbidden of [providerSecret, TEST_CONFIG.apiKey, runtimeToken]) {
    assert.equal(text.includes(forbidden), false);
    assert.equal(logLines.join('').includes(forbidden), false);
  }
});

test('HTTP formatting failures expose only safe recovery classification', async (context) => {
  const groundedText = 'private grounded text that must never leave recovery diagnostics';
  const sourceUrl = 'https://authority.example/private-source';
  const rawProviderMessage = 'private upstream response body';
  const provider = new GeminiProvider(
    { ...TEST_CONFIG, formattingMaxAttempts: 1 },
    {
      client: fakeClient([
        candidate(groundedText, {
          sources: [{ title: 'Private source', uri: sourceUrl }],
        }),
        Object.assign(new Error(rawProviderMessage), { status: 503 }),
      ]),
    },
  );
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
        gemini: { ...TEST_CONFIG, formattingMaxAttempts: 1 },
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
      'X-Trace-Id': 'trace_formatting-recovery',
    },
    body: JSON.stringify({ topic: 'Secure agents' }),
  });
  const text = await response.text();
  const body = JSON.parse(text);
  logger.flush?.();

  assert.equal(response.status, 503);
  assert.equal(body.error.code, 'GEMINI_UPSTREAM_UNAVAILABLE');
  assert.equal(body.error.operation, 'structured_formatting');
  assert.equal(body.error.stage, 'structured_formatting');
  assert.equal(body.error.recoveryRequired, true);
  assert.equal(body.error.recoveryReason, 'FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH');
  assert.equal(body.error.traceId, 'trace_formatting-recovery');
  for (const forbidden of [groundedText, sourceUrl, rawProviderMessage, runtimeToken]) {
    assert.equal(text.includes(forbidden), false);
    assert.equal(logLines.join('').includes(forbidden), false);
  }
});

test('transient grounded research failures never repeat Google Search', async () => {
  const transient = Object.assign(new Error('temporary'), { status: 503 });
  const client = fakeClient([transient]);
  const provider = new GeminiProvider(TEST_CONFIG, {
    client,
    delay: async () => undefined,
    random: () => 0,
  });

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) =>
      error.code === 'GEMINI_UPSTREAM_UNAVAILABLE' &&
      error.operation === 'grounded_research' &&
      error.recoveryRequired !== true,
  );
  assert.equal(client.calls.length, 1);
  assert.deepEqual(client.calls[0].config.tools, [{ googleSearch: {} }]);
});

test('a transient formatting failure retries only formatting with the in-memory research result', async () => {
  const transient = Object.assign(new Error('temporary'), { status: 503 });
  const groundedText = 'Grounded facts retained only for this request.';
  const logger = memoryLogger();
  const client = fakeClient([
    candidate(groundedText, {
      sources: [{ title: 'Source', uri: 'https://authority.example/source' }],
    }),
    transient,
    candidate(JSON.stringify({ summary: 'Recovered formatting.' })),
  ]);
  const provider = new GeminiProvider(TEST_CONFIG, {
    client,
    delay: async () => undefined,
    random: () => 0,
    logger,
  });

  const result = await provider.research({
    topic: 'Secure agents',
    traceId: 'trace_formatting-retry',
    requestId: 'req_formatting-retry',
  });

  assert.equal(result.summary, 'Recovered formatting.');
  assert.equal(client.calls.length, 3);
  assert.deepEqual(client.calls[0].config.tools, [{ googleSearch: {} }]);
  for (const formattingCall of client.calls.slice(1)) {
    assert.equal(formattingCall.contents, groundedText);
    assert.equal(formattingCall.config.tools, undefined);
  }
  const formattingCompletion = logger.entries.find(
    (entry) =>
      entry.message === 'Gemini operation completed' &&
      entry.fields.operation === 'structured_formatting',
  );
  assert.equal(formattingCompletion.fields.traceId, 'trace_formatting-retry');
  assert.equal(formattingCompletion.fields.requestId, 'req_formatting-retry');
  assert.equal(formattingCompletion.fields.providerAttemptCount, 2);
});

test('exhausted formatting-only retries return safe recovery metadata', async () => {
  const transient = () => Object.assign(new Error('private provider failure'), { status: 503 });
  const client = fakeClient([
    candidate('Private grounded text.', {
      sources: [{ title: 'Source', uri: 'https://authority.example/source' }],
    }),
    transient(),
    transient(),
  ]);
  const provider = new GeminiProvider(TEST_CONFIG, {
    client,
    delay: async () => undefined,
    random: () => 0,
  });

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) =>
      error.code === 'GEMINI_UPSTREAM_UNAVAILABLE' &&
      error.operation === 'structured_formatting' &&
      error.recoveryRequired === true &&
      error.recoveryReason === 'FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH' &&
      !JSON.stringify(error).includes('Private grounded text'),
  );
  assert.equal(client.calls.length, 3);
  assert.equal(
    client.calls.slice(1).some((call) => call.config.tools),
    false,
  );
});

test('formatting retries can be disabled without enabling a research retry', async () => {
  const transient = Object.assign(new Error('temporary'), { status: 503 });
  const client = fakeClient([
    candidate('Grounded facts.', {
      sources: [{ title: 'Source', uri: 'https://authority.example/source' }],
    }),
    transient,
  ]);
  const provider = new GeminiProvider(
    { ...TEST_CONFIG, formattingMaxAttempts: 1 },
    { client, delay: async () => undefined },
  );

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) => error.code === 'GEMINI_UPSTREAM_UNAVAILABLE' && error.recoveryRequired === true,
  );
  assert.equal(client.calls.length, 2);
});
