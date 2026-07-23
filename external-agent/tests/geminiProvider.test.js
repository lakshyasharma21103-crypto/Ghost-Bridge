const assert = require('node:assert/strict');
const http = require('node:http');
const { Writable } = require('node:stream');
const { test } = require('node:test');
const { createApp } = require('../src/app');
const {
  GeminiProvider,
  chooseRetryDelay,
  isBlockedResponse,
  mapGeminiError,
  parseRetryAfterMs,
} = require('../src/providers/gemini.provider');
const {
  GEMINI_API_MODES,
  extractGeminiSources,
  inspectGeminiResponseShape,
  requireGeminiSources,
} = require('../src/utils/extractGeminiSources');
const { createLogger } = require('../src/utils/logger');
const { RuntimeError, serviceShutdownError } = require('../src/utils/errors');

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
                ...(options.webSearchQueries ? { webSearchQueries: options.webSearchQueries } : {}),
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

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
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

  const { researchDiagnostics, ...researchResult } = result;
  assert.deepEqual(researchResult, {
    summary: 'Concise grounded synthesis.',
    sourceReferences: [{ title: 'Primary source', url: 'https://authority.example/report' }],
    webSearchUsed: true,
  });
  assert.deepEqual(
    {
      attemptCount: researchDiagnostics.attemptCount,
      fallbackProfileUsed: researchDiagnostics.fallbackProfileUsed,
      finalProviderStatus: researchDiagnostics.finalProviderStatus,
      groundingMetadataCount: researchDiagnostics.groundingMetadataCount,
    },
    {
      attemptCount: 1,
      fallbackProfileUsed: false,
      finalProviderStatus: 'OK',
      groundingMetadataCount: 1,
    },
  );
  assert.equal(researchDiagnostics.attemptDurationsMs.length, 1);
  assert.equal(client.calls.length, 2);
  assert.deepEqual(client.calls[0].config.tools, [{ googleSearch: {} }]);
  assert.equal(client.calls[0].config.httpOptions.retryOptions.attempts, 1);
  assert.equal(client.calls[0].config.httpOptions.timeout, TEST_CONFIG.requestTimeoutMs);
  assert.equal(client.calls[0].config.maxOutputTokens, 512);
  assert.equal(client.calls[1].config.tools, undefined);
  assert.equal(client.calls[1].config.httpOptions.retryOptions.attempts, 1);
  assert.equal(client.calls[1].config.httpOptions.timeout, TEST_CONFIG.requestTimeoutMs);
  assert.equal(client.calls[1].config.maxOutputTokens, TEST_CONFIG.maxOutputTokens);
  assert.equal(client.calls[1].config.responseMimeType, 'application/json');
  assert.equal(client.calls[1].config.responseJsonSchema.additionalProperties, false);
  assert.equal(client.calls[0].model, TEST_CONFIG.model);
  assert.equal(client.calls[0].contents.includes('Secure agent interoperability'), true);
  assert.deepEqual(client.calls[0].config.thinkingConfig, { thinkingLevel: 'LOW' });
  assert.deepEqual(client.calls[1].config.thinkingConfig, { thinkingLevel: 'MEDIUM' });
  assert.equal(client.calls[0].config.responseMimeType, undefined);
  assert.equal(client.calls[0].config.responseJsonSchema, undefined);
  assert.notEqual(client.calls[0].config.abortSignal, client.calls[1].config.abortSignal);
  assert.equal(client.calls[0].config.abortSignal instanceof AbortSignal, true);
  assert.equal(client.calls[1].config.abortSignal instanceof AbortSignal, true);
});

test('caller cancellation aborts grounded research without starting formatting', async () => {
  const calls = [];
  const started = deferred();
  const client = {
    models: {
      generateContent(parameters) {
        calls.push(parameters);
        started.resolve(parameters.config.abortSignal);
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
  const provider = new GeminiProvider(TEST_CONFIG, { client });
  const caller = new AbortController();
  const operation = provider.research({ topic: 'Cancel active research', signal: caller.signal });

  const operationSignal = await started.promise;
  caller.abort();

  await assert.rejects(
    operation,
    (error) =>
      error.code === 'REQUEST_CANCELLED' &&
      error.reason === 'CLIENT_DISCONNECTED' &&
      error.operation === 'grounded_research' &&
      error.retryable !== true,
  );
  assert.equal(operationSignal.aborted, true);
  assert.equal(operationSignal.reason.code, 'REQUEST_CANCELLED');
  assert.equal(calls.length, 1);
});

test('a pre-aborted caller signal starts no Gemini operation', async () => {
  const client = fakeClient([
    candidate('This response must not be used.'),
    candidate(JSON.stringify({ summary: 'This response must not be used.' })),
  ]);
  const provider = new GeminiProvider(TEST_CONFIG, { client });
  const caller = new AbortController();
  caller.abort();

  await assert.rejects(
    () => provider.research({ topic: 'Already cancelled', signal: caller.signal }),
    (error) => error.code === 'REQUEST_CANCELLED' && error.reason === 'CLIENT_DISCONNECTED',
  );
  assert.equal(client.calls.length, 0);
});

test('cancellation after grounded response prevents the formatting provider call', async () => {
  const calls = [];
  const caller = new AbortController();
  const client = {
    models: {
      async generateContent(parameters) {
        calls.push(parameters);
        caller.abort();
        return candidate('Grounded facts that must not be formatted.', {
          sources: [{ title: 'Source', uri: 'https://authority.example/cancelled' }],
        });
      },
    },
  };
  const provider = new GeminiProvider(TEST_CONFIG, { client });

  await assert.rejects(
    () => provider.research({ topic: 'Cancel between stages', signal: caller.signal }),
    (error) => error.code === 'REQUEST_CANCELLED' && error.reason === 'CLIENT_DISCONNECTED',
  );
  assert.equal(calls.length, 1);
});

test('cancellation during formatting prevents a formatting retry', async () => {
  const calls = [];
  const formattingStarted = deferred();
  const caller = new AbortController();
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
        formattingStarted.resolve(parameters.config.abortSignal);
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
  const provider = new GeminiProvider(TEST_CONFIG, { client });
  const operation = provider.research({ topic: 'Cancel formatting', signal: caller.signal });

  await formattingStarted.promise;
  caller.abort();

  await assert.rejects(
    operation,
    (error) =>
      error.code === 'REQUEST_CANCELLED' &&
      error.reason === 'CLIENT_DISCONNECTED' &&
      error.operation === 'structured_formatting' &&
      error.stage === 'structured_formatting' &&
      error.recoveryRequired !== true,
  );
  assert.equal(calls.length, 2);
});

test('service shutdown and outer request timeout retain their typed parent reasons', async () => {
  const scenarios = [
    {
      abortReason: serviceShutdownError(),
      expectedCode: 'SERVICE_SHUTDOWN',
      expectedReason: 'SERVICE_SHUTDOWN',
    },
    {
      abortReason: new RuntimeError(408, 'REQUEST_TIMEOUT', 'Request timed out.'),
      expectedCode: 'REQUEST_TIMEOUT',
      expectedReason: undefined,
    },
  ];

  for (const scenario of scenarios) {
    const calls = [];
    const started = deferred();
    const client = {
      models: {
        generateContent(parameters) {
          calls.push(parameters);
          started.resolve();
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
    const provider = new GeminiProvider(TEST_CONFIG, { client });
    const parent = new AbortController();
    const operation = provider.research({ topic: 'Typed abort reason', signal: parent.signal });
    await started.promise;
    parent.abort(scenario.abortReason);

    await assert.rejects(
      operation,
      (error) =>
        error.code === scenario.expectedCode &&
        error.reason === scenario.expectedReason &&
        error.operation === 'grounded_research' &&
        error.code !== 'GEMINI_REQUEST_TIMEOUT',
    );
    assert.equal(calls.length, 1);
  }
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
    { client, logger, delay: async () => undefined, random: () => 0 },
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
      error.configuredTimeoutMs === 10 &&
      error.researchAttemptCount === 2 &&
      error.fallbackResearchProfileUsed === true,
  );

  assert.equal(calls.length, 2);
  assert.equal(calls[0].config.httpOptions.timeout, 10);
  assert.equal(calls[1].config.httpOptions.timeout, 10);
  assert.equal(calls[0].config.maxOutputTokens, 512);
  assert.equal(calls[1].config.maxOutputTokens, 256);
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
    { client, logger, delay: async () => undefined, random: () => 0 },
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
      error.operationTimeoutMs === 30_020 &&
      error.providerAttemptCount === 2 &&
      error.providerMaxAttempts === 2 &&
      error.retryDelayMs === 5_000 &&
      error.recoveryRequired === true &&
      error.recoveryReason === 'FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH',
  );

  assert.equal(calls.length, 3);
  assert.notEqual(calls[0].config.abortSignal, calls[1].config.abortSignal);
  assert.notEqual(calls[1].config.abortSignal, calls[2].config.abortSignal);
  assert.equal(calls[0].config.httpOptions.timeout, 50);
  assert.equal(calls[1].config.httpOptions.timeout, 10);
  assert.equal(calls[2].config.httpOptions.timeout, 10);
  assert.equal(calls[0].config.abortSignal.aborted, false);
  assert.equal(calls[1].config.abortSignal.aborted, true);
  assert.equal(calls[2].config.abortSignal.aborted, true);
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
    apiMode: 'models.generateContent',
    candidateCount: 1,
    candidateFinishReasons: ['STOP'],
    finishReason: 'STOP',
    responseStepTypes: [],
    googleSearchCallCount: 0,
    googleSearchResultCount: 0,
    citationAnnotationCount: 0,
    contentPartCount: 1,
    groundingMetadataPresent: true,
    groundingMetadataCount: 1,
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
    promptTokenCount: 10,
  });
});

test('Interactions responses use search steps and url_citation annotations only', () => {
  const response = {
    status: 'completed',
    output_text: 'Current answer with a generated URL https://invented.example/not-a-citation',
    steps: [
      {
        type: 'google_search_call',
        id: 'search_call_1',
        arguments: { queries: ['private query must not be logged'] },
      },
      {
        type: 'google_search_result',
        call_id: 'search_call_1',
        result: [{ search_suggestions: 'private provider search result' }],
      },
      {
        type: 'model_output',
        content: [
          {
            type: 'text',
            text: 'Private answer content.',
            annotations: [
              {
                type: 'url_citation',
                url: 'https://official.example/current-report?utm_source=search',
                title: 'Official current report',
                start_index: 0,
                end_index: 7,
              },
            ],
          },
        ],
      },
    ],
  };
  const options = { apiMode: GEMINI_API_MODES.INTERACTIONS };

  assert.deepEqual(extractGeminiSources(response, options), [
    { title: 'Official current report', url: 'https://official.example/current-report' },
  ]);
  assert.deepEqual(inspectGeminiResponseShape(response, options), {
    requestId: undefined,
    operation: 'grounded_research',
    model: undefined,
    apiMode: 'interactions.create',
    candidateCount: 0,
    candidateFinishReasons: [],
    finishReason: '[unavailable]',
    responseStepTypes: ['google_search_call', 'google_search_result', 'model_output'],
    googleSearchCallCount: 1,
    googleSearchResultCount: 1,
    citationAnnotationCount: 1,
    contentPartCount: 1,
    groundingMetadataPresent: false,
    groundingMetadataCount: 0,
    groundingMetadataKeys: [],
    webSearchQueryCount: 0,
    groundingChunkCount: 0,
    groundingSupportCount: 0,
    searchEntryPointPresent: false,
    usageMetadataKeys: [],
  });
  assert.doesNotMatch(
    JSON.stringify(inspectGeminiResponseShape(response, options)),
    /private|official\.example|invented\.example/i,
  );
});

test('Interactions generated URLs without provider citation annotations are rejected', () => {
  const response = {
    output_text: 'https://invented.example/top-level-output',
    steps: [
      { type: 'google_search_call', id: 'search_call_1', arguments: { queries: ['current fact'] } },
      {
        type: 'google_search_result',
        call_id: 'search_call_1',
        result: [{ search_suggestions: 'provider search UI content' }],
      },
      {
        type: 'model_output',
        content: [
          {
            type: 'text',
            text: 'Generated link: https://invented.example/answer-text-only',
            annotations: [],
          },
        ],
      },
    ],
  };
  const options = { apiMode: GEMINI_API_MODES.INTERACTIONS };

  assert.deepEqual(extractGeminiSources(response, options), []);
  assert.throws(
    () => requireGeminiSources(response, options),
    (error) =>
      error.code === 'GEMINI_GROUNDING_METADATA_MISSING' &&
      error.diagnostics.googleSearchCallCount === 1 &&
      error.diagnostics.googleSearchResultCount === 1 &&
      error.diagnostics.citationAnnotationCount === 0,
  );
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

test('source extraction accepts only genuine grounding metadata web chunks', () => {
  const textOnlyUrl = 'https://model-invented.example/not-provider-metadata';
  const response = {
    sources: ['https://fabricated-top-level.example/not-grounding-metadata'],
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
      usageMetadata: {
        promptTokenCount: 12,
        candidatesTokenCount: 34,
        thoughtsTokenCount: 5,
        totalTokenCount: 51,
        toolUsePromptTokenCount: 4,
        privateTokenPayload: 'sensitive-token-payload',
      },
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
  assert.equal(shapeLog.fields.apiMode, 'models.generateContent');
  assert.equal(shapeLog.fields.candidateCount, 1);
  assert.deepEqual(shapeLog.fields.responseStepTypes, []);
  assert.equal(shapeLog.fields.googleSearchCallCount, 0);
  assert.equal(shapeLog.fields.googleSearchResultCount, 0);
  assert.equal(shapeLog.fields.citationAnnotationCount, 0);
  assert.equal(shapeLog.fields.groundingMetadataPresent, true);
  assert.equal(shapeLog.fields.groundingChunkCount, 1);
  assert.equal(shapeLog.fields.finishReason, 'STOP');
  assert.equal(shapeLog.fields.webSearchQueryCount, 1);
  assert.equal(shapeLog.fields.configuredMaxOutputTokens, 512);
  assert.equal(Number.isInteger(shapeLog.fields.promptCharacterCount), true);
  assert.equal(shapeLog.fields.promptTokenCount, 12);
  assert.equal(shapeLog.fields.candidatesTokenCount, 34);
  assert.equal(shapeLog.fields.thoughtsTokenCount, 5);
  assert.equal(shapeLog.fields.totalTokenCount, 51);
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
    'sensitive-token-payload',
  ]) {
    assert.equal(serializedLogs.includes(forbidden), false);
  }
});

test('a successful response without search evidence fails immediately without fabricated citations', async () => {
  const client = fakeClient([candidate('Ungrounded answer with https://invented.example/first.')]);
  const provider = new GeminiProvider(TEST_CONFIG, {
    client,
  });

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) =>
      error.code === 'GEMINI_SOURCE_EXTRACTION_FAILED' &&
      error.internalCode === 'GEMINI_GROUNDING_METADATA_MISSING' &&
      error.operation === 'grounded_research' &&
      error.apiMode === 'models.generateContent' &&
      error.researchAttemptCount === 1 &&
      error.groundingFallbackUsed === false &&
      error.groundingMetadataPresent === false &&
      error.groundingChunkCount === 0 &&
      error.googleSearchCallCount === 0 &&
      error.citationAnnotationCount === 0,
  );
  assert.equal(client.calls.length, 1);
  assert.deepEqual(client.calls[0].config.tools, [{ googleSearch: {} }]);
});

test('an ungrounded successful response is not retried as a fallback', async () => {
  const logger = memoryLogger();
  const client = fakeClient([candidate('Response has no provider grounding evidence.')]);
  const provider = new GeminiProvider(TEST_CONFIG, {
    client,
    logger,
  });

  await assert.rejects(
    () =>
      provider.research({
        topic: 'Current facts requiring live verification',
        requestId: 'req_ungrounded-rejected',
      }),
    (error) =>
      error.code === 'GEMINI_SOURCE_EXTRACTION_FAILED' &&
      error.internalCode === 'GEMINI_GROUNDING_METADATA_MISSING' &&
      error.researchAttemptCount === 1 &&
      error.fallbackResearchProfileUsed === false,
  );

  const researchAttempts = logger.entries.filter(
    (entry) =>
      entry.fields.event === 'gemini.attempt.started' &&
      entry.fields.operation === 'grounded_research',
  );
  assert.equal(researchAttempts.length, 1);
  assert.equal(client.calls.length, 1);
});

test('an ungrounded MAX_TOKENS response is incomplete and remains safely rejected', async () => {
  const logger = memoryLogger();
  const client = fakeClient([
    candidate('Truncated answer with https://invented.example/truncated.', {
      finishReason: 'MAX_TOKENS',
    }),
  ]);
  const provider = new GeminiProvider(TEST_CONFIG, { client, logger });

  await assert.rejects(
    () => provider.research({ topic: 'Current facts requiring web evidence' }),
    (error) =>
      error.code === 'GEMINI_SOURCE_EXTRACTION_FAILED' &&
      error.internalCode === 'GEMINI_GROUNDING_METADATA_MISSING' &&
      error.finishReason === 'MAX_TOKENS' &&
      error.researchAttemptCount === 1 &&
      error.groundingChunkCount === 0,
  );
  assert.equal(client.calls.length, 1);
  const firstCompletion = logger.entries.find(
    (entry) =>
      entry.fields.event === 'gemini.attempt.completed' && entry.fields.attemptNumber === 1,
  );
  assert.equal(firstCompletion.fields.finishReason, 'MAX_TOKENS');
  assert.equal(firstCompletion.fields.retryReason, 'NONE');
});

test('a grounded MAX_TOKENS response is retried once and never accepted as complete', async () => {
  const groundedMaxTokens = candidate('Truncated but grounded.', {
    finishReason: 'MAX_TOKENS',
    webSearchQueries: ['current official update'],
    sources: [{ title: 'Official source', uri: 'https://authority.example/current' }],
  });
  const client = fakeClient([groundedMaxTokens, groundedMaxTokens]);
  const provider = new GeminiProvider(TEST_CONFIG, { client });

  await assert.rejects(
    () => provider.research({ topic: 'Current official update' }),
    (error) =>
      error.code === 'GEMINI_SOURCE_EXTRACTION_FAILED' &&
      error.internalCode === 'GEMINI_RESEARCH_RESPONSE_INCOMPLETE' &&
      error.finishReason === 'MAX_TOKENS' &&
      error.groundingMetadataPresent === true &&
      error.groundingChunkCount === 1 &&
      error.webSearchQueryCount === 1 &&
      error.researchAttemptCount === 2,
  );
  assert.equal(client.calls.length, 2);
  assert.deepEqual(client.calls[1].config.thinkingConfig, { thinkingLevel: 'LOW' });
  assert.equal(client.calls[1].config.maxOutputTokens, 256);
});

test('a grounded STOP fallback completes after an incomplete first response', async () => {
  const client = fakeClient([
    candidate('Truncated grounded first response.', {
      finishReason: 'MAX_TOKENS',
      sources: [{ title: 'First source', uri: 'https://one.example/update' }],
    }),
    candidate('Two complete grounded findings.', {
      webSearchQueries: ['updates in UTC date window'],
      sources: [
        { title: 'First source', uri: 'https://one.example/update' },
        { title: 'Second source', uri: 'https://two.example/update' },
      ],
    }),
    candidate(JSON.stringify({ summary: 'Completed grounded fallback.' })),
  ]);
  const provider = new GeminiProvider(TEST_CONFIG, { client });

  const result = await provider.research({ topic: 'Recent official updates' });

  assert.equal(result.summary, 'Completed grounded fallback.');
  assert.equal(result.researchDiagnostics.groundingFallbackUsed, true);
  assert.equal(result.sourceReferences.length, 2);
  assert.equal(client.calls.length, 3);
  assert.match(client.calls[1].config.systemInstruction, /grounding fallback/i);
  assert.equal(client.calls[1].config.maxOutputTokens, 256);
  assert.deepEqual(client.calls[1].config.thinkingConfig, { thinkingLevel: 'LOW' });
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
    {
      ...TEST_CONFIG,
      researchTimeoutMs: 115_000,
      formattingTimeoutMs: 90_000,
      researchMaxAttempts: 1,
    },
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
      operationTimeoutMs: body.error.operationTimeoutMs,
      providerAttemptCount: body.error.providerAttemptCount,
      providerMaxAttempts: body.error.providerMaxAttempts,
      retryDelayMs: body.error.retryDelayMs,
      researchAttemptCount: body.error.researchAttemptCount,
      fallbackResearchProfileUsed: body.error.fallbackResearchProfileUsed,
      finalProviderStatus: body.error.finalProviderStatus,
      groundingMetadataCount: body.error.groundingMetadataCount,
      requestId: body.error.requestId,
      traceId: body.error.traceId,
    },
    {
      code: 'GEMINI_REQUEST_TIMEOUT',
      operation: 'grounded_research',
      reason: 'GEMINI_DEADLINE_EXCEEDED',
      timeoutReason: 'GEMINI_DEADLINE_EXCEEDED',
      configuredTimeoutMs: 115_000,
      operationTimeoutMs: 125_000,
      providerAttemptCount: 1,
      providerMaxAttempts: 1,
      retryDelayMs: 0,
      researchAttemptCount: 1,
      fallbackResearchProfileUsed: false,
      finalProviderStatus: 'DEADLINE_EXCEEDED',
      groundingMetadataCount: 0,
      requestId: 'req_timeout-metadata',
      traceId: 'trace_timeout-metadata',
    },
  );
  assert.equal(body.error.researchAttemptDurationsMs.length, 1);
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

test('two retryable grounded-research failures stop after exactly two attempts', async () => {
  const unavailable = Object.assign(new Error('temporary unavailable'), { status: 503 });
  const deadline = Object.assign(new Error('temporary deadline'), {
    status: 504,
    providerStatus: 'DEADLINE_EXCEEDED',
  });
  const client = fakeClient([unavailable, deadline]);
  const provider = new GeminiProvider(
    { ...TEST_CONFIG, formattingMaxAttempts: 1 },
    {
      client,
      delay: async () => undefined,
      random: () => 0,
    },
  );

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) =>
      error.code === 'GEMINI_REQUEST_TIMEOUT' &&
      error.operation === 'grounded_research' &&
      error.researchAttemptCount === 2 &&
      error.fallbackResearchProfileUsed === true &&
      error.finalProviderStatus === 'DEADLINE_EXCEEDED' &&
      error.recoveryRequired !== true,
  );
  assert.equal(client.calls.length, 2);
  assert.deepEqual(client.calls[0].config.tools, [{ googleSearch: {} }]);
  assert.deepEqual(client.calls[1].config.tools, [{ googleSearch: {} }]);
});

test('503 followed by success uses one fallback grounded-research profile', async () => {
  const transient = Object.assign(new Error('temporary'), { status: 503 });
  const groundedText = 'Grounded facts after bounded provider recovery.';
  const delays = [];
  const logger = memoryLogger();
  const client = fakeClient([
    transient,
    candidate(groundedText, {
      sources: [{ title: 'Source', uri: 'https://authority.example/source' }],
    }),
    candidate(JSON.stringify({ summary: 'Recovered research.' })),
  ]);
  const attemptIds = ['attempt_primary', 'attempt_fallback', 'attempt_formatting'];
  const provider = new GeminiProvider(
    { ...TEST_CONFIG, researchMaxAttempts: 2, formattingMaxAttempts: 1 },
    {
      client,
      delay: async (milliseconds) => delays.push(milliseconds),
      random: () => 0,
      logger,
      attemptId: () => attemptIds.shift(),
    },
  );

  const result = await provider.research({
    topic: 'Secure agents',
    traceId: 'trace_retry-safe',
    requestId: 'req_retry-safe',
  });

  assert.equal(result.summary, 'Recovered research.');
  assert.deepEqual(result.researchDiagnostics, {
    attemptCount: 2,
    attemptDurationsMs: result.researchDiagnostics.attemptDurationsMs,
    fallbackProfileUsed: true,
    groundingFallbackUsed: false,
    finalProviderStatus: 'OK',
    groundingMetadataCount: 1,
    attempts: result.researchDiagnostics.attempts,
  });
  assert.deepEqual(delays, [5_000]);
  assert.equal(client.calls.length, 3);
  assert.deepEqual(client.calls[0].config.tools, [{ googleSearch: {} }]);
  assert.deepEqual(client.calls[1].config.tools, [{ googleSearch: {} }]);
  assert.equal(client.calls[2].config.tools, undefined);
  assert.equal(client.calls[0].config.maxOutputTokens, 512);
  assert.equal(client.calls[1].config.maxOutputTokens, 256);
  assert.match(client.calls[1].config.systemInstruction, /exactly 2 one-line records/i);
  assert.doesNotMatch(client.calls[1].config.systemInstruction, /grounding fallback/i);
  assert.equal(client.calls[1].contents.length < client.calls[0].contents.length, true);
  const researchAttempts = logger.entries.filter(
    (entry) =>
      entry.fields.event === 'gemini.attempt.started' &&
      entry.fields.operation === 'grounded_research',
  );
  assert.deepEqual(
    researchAttempts.map((entry) => entry.fields.attemptId),
    ['attempt_primary', 'attempt_fallback'],
  );
  assert.equal(
    researchAttempts.every(
      (entry) =>
        entry.fields.traceId === 'trace_retry-safe' && entry.fields.requestId === 'req_retry-safe',
    ),
    true,
  );
  assert.equal(JSON.stringify(logger.entries).includes('Secure agents'), false);
  assert.equal(JSON.stringify(logger.entries).includes(TEST_CONFIG.apiKey), false);
});

test('primary local timeout is followed by one successful grounded fallback', async () => {
  const calls = [];
  const client = {
    calls,
    models: {
      generateContent(parameters) {
        calls.push(parameters);
        if (calls.length === 1) {
          return new Promise((_resolve, reject) => {
            parameters.config.abortSignal.addEventListener(
              'abort',
              () => reject(parameters.config.abortSignal.reason),
              { once: true },
            );
          });
        }
        if (calls.length === 2) {
          return Promise.resolve(
            candidate('Grounded fallback after the local deadline.', {
              sources: [{ title: 'Source', uri: 'https://authority.example/local-recovery' }],
            }),
          );
        }
        return Promise.resolve(candidate(JSON.stringify({ summary: 'Recovered locally.' })));
      },
    },
  };
  const provider = new GeminiProvider(
    {
      ...TEST_CONFIG,
      researchTimeoutMs: 10,
      researchFallbackTimeoutMs: 50,
      formattingMaxAttempts: 1,
    },
    { client, delay: async () => undefined, random: () => 0 },
  );

  const result = await provider.research({ topic: 'Secure agents' });

  assert.equal(result.summary, 'Recovered locally.');
  assert.equal(result.researchDiagnostics.attemptCount, 2);
  assert.equal(result.researchDiagnostics.attempts[0].timeoutSource, 'local');
  assert.equal(
    result.researchDiagnostics.attempts[0].retryReason,
    'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
  );
  assert.equal(result.researchDiagnostics.attempts[0].retryable, true);
  assert.equal(result.researchDiagnostics.attempts[1].profile, 'fallback');
  assert.equal(result.researchDiagnostics.attempts[1].providerStatus, 'OK');
  assert.equal(calls.length, 3);
});

test('primary and fallback 503 responses preserve unavailable classification and stop at two', async () => {
  const client = fakeClient([
    Object.assign(new Error('temporary primary outage'), { status: 503 }),
    Object.assign(new Error('temporary fallback outage'), { status: 503 }),
  ]);
  const provider = new GeminiProvider(
    { ...TEST_CONFIG, formattingMaxAttempts: 1 },
    { client, delay: async () => undefined, random: () => 0 },
  );

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) =>
      error.code === 'GEMINI_UPSTREAM_UNAVAILABLE' &&
      error.statusCode === 503 &&
      error.providerHttpStatus === 503 &&
      error.finalProviderStatus === 'UNAVAILABLE' &&
      error.researchAttemptCount === 2 &&
      error.fallbackResearchProfileUsed === true &&
      error.researchAttempts.length === 2 &&
      error.researchAttempts[0].retryable === true &&
      error.researchAttempts[1].retryable === false,
  );
  assert.equal(client.calls.length, 2);
});

test('fallback research has its own longer attempt deadline and safe per-attempt diagnostics', async () => {
  const transient = Object.assign(new Error('temporary'), { status: 503 });
  const client = fakeClient([
    transient,
    candidate('Grounded fallback.', {
      sources: [{ title: 'Source', uri: 'https://authority.example/fallback' }],
      webSearchQueries: ['current fallback evidence'],
    }),
    candidate(JSON.stringify({ summary: 'Recovered.' })),
  ]);
  const provider = new GeminiProvider(
    {
      ...TEST_CONFIG,
      researchTimeoutMs: 1_000,
      researchFallbackTimeoutMs: 3_000,
      researchOperationTimeoutMs: 20_000,
      formattingMaxAttempts: 1,
    },
    { client, delay: async () => undefined, random: () => 0 },
  );

  const result = await provider.research({ topic: 'Secure agents' });

  assert.equal(client.calls[0].config.httpOptions.timeout, 1_000);
  assert.equal(client.calls[1].config.httpOptions.timeout, 3_000);
  assert.equal(result.researchDiagnostics.attempts.length, 2);
  assert.deepEqual(
    result.researchDiagnostics.attempts.map((attempt) => ({
      attemptNumber: attempt.attemptNumber,
      profile: attempt.profile,
      configuredTimeoutMs: attempt.configuredTimeoutMs,
      providerStatus: attempt.providerStatus,
      retryDelayCategory: attempt.retryDelayCategory,
    })),
    [
      {
        attemptNumber: 1,
        profile: 'primary',
        configuredTimeoutMs: 1_000,
        providerStatus: 'UNAVAILABLE',
        retryDelayCategory: 'exponential_jitter',
      },
      {
        attemptNumber: 2,
        profile: 'fallback',
        configuredTimeoutMs: 3_000,
        providerStatus: 'OK',
        retryDelayCategory: 'none',
      },
    ],
  );
});

test('Retry-After is bounded, categorized, and never shortens exponential backoff', () => {
  const secondsError = { response: { headers: { 'retry-after': '12' } } };
  const dateError = { headers: new Headers({ 'Retry-After': 'Thu, 23 Jul 2026 06:01:00 GMT' }) };

  assert.equal(parseRetryAfterMs(secondsError, 0), 12_000);
  assert.equal(parseRetryAfterMs({ headers: { 'retry-after': '999' } }, 0), 30_000);
  assert.deepEqual(chooseRetryDelay(secondsError, 1, 0, 0), {
    delayMs: 12_000,
    category: 'retry_after',
  });
  assert.deepEqual(chooseRetryDelay({ headers: { 'retry-after': '0' } }, 1, 0, 0), {
    delayMs: 5_000,
    category: 'retry_after',
  });
  assert.equal(parseRetryAfterMs(dateError, Date.parse('2026-07-23T06:00:55Z')), 5_000);
  assert.deepEqual(chooseRetryDelay({}, 1, 0.999_999, 0), {
    delayMs: 5_999,
    category: 'exponential_jitter',
  });
  assert.deepEqual(chooseRetryDelay({}, 2, 0, 0), {
    delayMs: 10_000,
    category: 'exponential_jitter',
  });
});

test('transient 429 respects Retry-After before the single grounded fallback', async () => {
  const rateLimited = Object.assign(new Error('temporary rate limit'), {
    status: 429,
    response: { headers: { 'retry-after': '7' } },
  });
  const delays = [];
  const client = fakeClient([
    rateLimited,
    candidate('Grounded fallback.', {
      sources: [{ title: 'Source', uri: 'https://authority.example/rate-recovery' }],
    }),
    candidate(JSON.stringify({ summary: 'Recovered after rate limit.' })),
  ]);
  const provider = new GeminiProvider(
    { ...TEST_CONFIG, formattingMaxAttempts: 1 },
    {
      client,
      delay: async (milliseconds) => delays.push(milliseconds),
      random: () => 0,
    },
  );

  const result = await provider.research({ topic: 'Secure agents' });

  assert.equal(result.summary, 'Recovered after rate limit.');
  assert.deepEqual(delays, [7_000]);
  assert.equal(result.researchDiagnostics.attemptCount, 2);
  assert.equal(result.researchDiagnostics.attempts[0].retryReason, 'PROVIDER_RATE_LIMITED');
  assert.equal(result.researchDiagnostics.attempts[0].retryDelayCategory, 'retry_after');
  assert.equal(client.calls.length, 3);
});

test('504 followed by success retries grounded research once', async () => {
  const deadline = Object.assign(new Error('temporary deadline'), {
    status: 504,
    providerStatus: 'DEADLINE_EXCEEDED',
  });
  const client = fakeClient([
    deadline,
    candidate('Fallback grounded facts.', {
      sources: [{ title: 'Source', uri: 'https://authority.example/deadline-source' }],
    }),
    candidate(JSON.stringify({ summary: 'Recovered after deadline.' })),
  ]);
  const provider = new GeminiProvider(
    { ...TEST_CONFIG, formattingMaxAttempts: 1 },
    {
      client,
      delay: async () => undefined,
      random: () => 0,
    },
  );

  const result = await provider.research({ topic: 'Secure agents' });

  assert.equal(result.summary, 'Recovered after deadline.');
  assert.equal(result.researchDiagnostics.attemptCount, 2);
  assert.equal(result.researchDiagnostics.fallbackProfileUsed, true);
  assert.equal(client.calls.length, 3);
});

test('transient transport failure followed by success retries grounded research once', async () => {
  const transport = Object.assign(new Error('private socket failure'), { code: 'ECONNRESET' });
  const client = fakeClient([
    transport,
    candidate('Fallback grounded facts.', {
      sources: [{ title: 'Source', uri: 'https://authority.example/transport-source' }],
    }),
    candidate(JSON.stringify({ summary: 'Recovered after transport failure.' })),
  ]);
  const provider = new GeminiProvider(
    { ...TEST_CONFIG, formattingMaxAttempts: 1 },
    { client, delay: async () => undefined, random: () => 0 },
  );

  const result = await provider.research({ topic: 'Secure agents' });

  assert.equal(result.summary, 'Recovered after transport failure.');
  assert.equal(result.researchDiagnostics.attemptCount, 2);
  assert.equal(client.calls.length, 3);
});

test('permanent provider errors are not retried', async () => {
  for (const status of [400, 401, 403]) {
    const permanent = Object.assign(new Error('permanent private failure'), { status });
    const client = fakeClient([permanent]);
    let delayCount = 0;
    const provider = new GeminiProvider(TEST_CONFIG, {
      client,
      delay: async () => {
        delayCount += 1;
      },
      random: () => 0,
    });

    await assert.rejects(() => provider.research({ topic: 'Secure agents' }));
    assert.equal(client.calls.length, 1);
    assert.equal(delayCount, 0);
  }
});

test('retry budget exhaustion prevents the fallback provider call', async () => {
  let now = 0;
  let delayCount = 0;
  const transient = Object.assign(new Error('temporary'), { status: 503 });
  const client = {
    calls: [],
    models: {
      async generateContent(parameters) {
        client.calls.push(parameters);
        now = 600;
        throw transient;
      },
    },
  };
  const provider = new GeminiProvider(
    {
      ...TEST_CONFIG,
      researchTimeoutMs: 1_000,
      researchOperationTimeoutMs: 1_500,
      formattingMaxAttempts: 1,
    },
    {
      client,
      now: () => now,
      random: () => 0,
      delay: async () => {
        delayCount += 1;
      },
    },
  );

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) =>
      error.code === 'GEMINI_RESEARCH_BUDGET_EXHAUSTED' &&
      error.reason === 'OVERALL_RESEARCH_DEADLINE_EXCEEDED' &&
      error.retryBudgetExhausted === true &&
      error.researchAttemptCount === 1,
  );
  assert.equal(client.calls.length, 1);
  assert.equal(delayCount, 0);
});

test('grounded-research operation deadline bounds a hanging provider attempt', async () => {
  const calls = [];
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
    {
      ...TEST_CONFIG,
      researchTimeoutMs: 1_000,
      researchOperationTimeoutMs: 20,
      researchMaxAttempts: 1,
      formattingMaxAttempts: 1,
    },
    { client },
  );

  await assert.rejects(
    () => provider.research({ topic: 'Secure agents' }),
    (error) =>
      error.code === 'GEMINI_RESEARCH_BUDGET_EXHAUSTED' &&
      error.reason === 'OVERALL_RESEARCH_DEADLINE_EXCEEDED' &&
      error.configuredTimeoutMs <= 20 &&
      error.operationTimeoutMs === 20 &&
      error.researchAttemptCount === 1,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].config.httpOptions.timeout <= 20, true);
});

test('cancellation during grounded-research backoff stops the retry', async () => {
  const backoffStarted = deferred();
  const caller = new AbortController();
  const transient = Object.assign(new Error('temporary'), { status: 503 });
  const client = fakeClient([transient]);
  const provider = new GeminiProvider(TEST_CONFIG, {
    client,
    delay: (milliseconds, signal) => {
      backoffStarted.resolve(milliseconds);
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    },
    random: () => 0,
  });
  const operation = provider.research({ topic: 'Secure agents', signal: caller.signal });
  assert.equal(await backoffStarted.promise, 5_000);
  caller.abort();

  await assert.rejects(
    operation,
    (error) =>
      error.code === 'REQUEST_CANCELLED' &&
      error.operation === 'grounded_research' &&
      error.recoveryRequired !== true,
  );
  assert.equal(client.calls.length, 1);
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
