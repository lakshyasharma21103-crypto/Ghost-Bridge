const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
  EXTERNAL_AGENT_BASE_URL_ENV,
  EXTERNAL_STARTUP_PROBE_TIMEOUT_MS,
  ExternalFlowVerificationError,
  VERIFICATION_REQUEST_TIMEOUT_MS,
  VERIFICATION_STAGES,
  externalAgentProbeUrl,
  formatVerificationFailure,
  normalizeExternalAgentBaseUrl,
  request,
  resolveExternalAgentBaseUrl,
  sourceExtractionDiagnostics,
  success,
  validateExternalHealth,
  validateExternalReadiness,
  verifyExternalStartup,
  verificationResearchTopic,
  wrapVerificationFailure,
} = require('../../scripts/verifyExternalFlow');
const { generateInstallKey, generatePartnerApiKey } = require('../utils/crypto');

function endpointResult(data, options = {}) {
  const status = options.status || 200;
  return {
    response: {
      status,
      ok: status >= 200 && status < 300,
      headers: new Headers({
        'x-request-id': 'req_endpoint-test',
        'x-trace-id': 'trace_endpoint-test',
      }),
    },
    body: {
      success: options.success ?? status < 400,
      data,
      ...(options.error ? { error: options.error } : {}),
      meta: { requestId: 'req_endpoint-test', traceId: 'trace_endpoint-test' },
    },
  };
}

function readyData(overrides = {}) {
  return {
    service: 'external-research-agent',
    status: 'ready',
    version: '2.0.0',
    ai: { provider: 'gemini', configured: true },
    runtimeAuthentication: { configured: true },
    lifecycle: { status: 'ready' },
    ...overrides,
  };
}

function jsonFetchResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('runtime invocation timeout accepts at least 360000 milliseconds and rejects non-positive values', () => {
  const valid = spawnSync(
    process.execPath,
    [
      '-e',
      "process.stdout.write(String(require('./src/config/env').env.RUNTIME_INVOCATION_TIMEOUT_MS))",
    ],
    {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, NODE_ENV: 'development', RUNTIME_INVOCATION_TIMEOUT_MS: '360000' },
      encoding: 'utf8',
    },
  );
  assert.equal(valid.status, 0);
  assert.equal(Number(valid.stdout.trim()), 360_000);

  const invalid = spawnSync(process.execPath, ['-e', "require('./src/config/env')"], {
    cwd: path.resolve(__dirname, '../..'),
    env: { ...process.env, NODE_ENV: 'development', RUNTIME_INVOCATION_TIMEOUT_MS: '0' },
    encoding: 'utf8',
  });
  assert.notEqual(invalid.status, 0);
  assert.match(`${invalid.stdout}${invalid.stderr}`, /must be a positive integer/);
});

test('external-flow verifier preserves the provider, request, client, and gateway timeout hierarchy', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../scripts/verifyExternalFlow.js'),
    'utf8',
  );

  assert.equal(VERIFICATION_REQUEST_TIMEOUT_MS, 410_000);
  assert.equal(EXTERNAL_STARTUP_PROBE_TIMEOUT_MS, 30_000);
  assert.match(source, /RUNTIME_INVOCATION_TIMEOUT_MS\s*=\s*'430000'/);
  assert.match(source, /REQUEST_TIMEOUT_MS:\s*'390000'/);
  assert.ok(120_000 < 390_000);
  assert.ok(60_000 < 390_000);
  assert.ok(390_000 < VERIFICATION_REQUEST_TIMEOUT_MS);
  assert.ok(VERIFICATION_REQUEST_TIMEOUT_MS < 430_000);
  assert.doesNotMatch(source, /RUNTIME_REQUEST_TIMEOUT_MS\s*=.*70000/);
  assert.ok(source.indexOf('dotenv.config') < source.indexOf('const externalAgentPort'));
  assert.ok(source.indexOf('dotenv.config') < source.indexOf('requestedVerificationTimeoutMs'));
  assert.doesNotMatch(
    source,
    /process\.env\.EXTERNAL_TEST_AGENT_BASE_URL\s*=\s*`http:\/\/127\.0\.0\.1/,
  );
});

test('external-agent base URL without a trailing slash is preserved safely', () => {
  assert.equal(EXTERNAL_AGENT_BASE_URL_ENV, 'EXTERNAL_TEST_AGENT_BASE_URL');
  assert.equal(
    resolveExternalAgentBaseUrl({ EXTERNAL_TEST_AGENT_BASE_URL: 'https://agent.example.test' }),
    'https://agent.example.test',
  );
  assert.equal(
    externalAgentProbeUrl('https://agent.example.test', 'external_health'),
    'https://agent.example.test/health',
  );
  assert.equal(
    externalAgentProbeUrl('https://agent.example.test', 'external_readiness'),
    'https://agent.example.test/ready',
  );
});

test('external-agent base URL trailing slashes are removed before probe paths are appended', () => {
  assert.equal(
    normalizeExternalAgentBaseUrl('https://agent.example.test/runtime///'),
    'https://agent.example.test/runtime',
  );
  assert.equal(
    externalAgentProbeUrl('https://agent.example.test/runtime///', 'external_health'),
    'https://agent.example.test/runtime/health',
  );
  assert.equal(
    externalAgentProbeUrl('https://agent.example.test/runtime///', 'external_readiness'),
    'https://agent.example.test/runtime/ready',
  );
});

test('external-flow verifier rejects a missing base URL without a localhost fallback', () => {
  assert.throws(
    () => resolveExternalAgentBaseUrl({}),
    (error) =>
      error.applicationErrorCode === 'EXTERNAL_AGENT_BASE_URL_MISSING' &&
      error.message.includes(EXTERNAL_AGENT_BASE_URL_ENV) &&
      !error.message.includes('localhost') &&
      !error.message.includes('127.0.0.1'),
  );
});

test('external-flow verifier rejects invalid, credentialed, and ambiguous base URLs', () => {
  for (const value of [
    'not a URL',
    'ftp://agent.example.test',
    'https://user:password@agent.example.test',
    'https://agent.example.test?token=private',
    'https://agent.example.test/health',
  ]) {
    assert.throws(
      () => normalizeExternalAgentBaseUrl(value),
      (error) => error.applicationErrorCode === 'EXTERNAL_AGENT_BASE_URL_INVALID',
    );
  }
});

test('external health probe timeout reports only safe network diagnostics', async () => {
  const timeout = new Error('private network error must not be reported');
  timeout.name = 'TimeoutError';
  timeout.cause = Object.assign(new Error('private connect details'), {
    code: 'UND_ERR_CONNECT_TIMEOUT',
  });

  await assert.rejects(
    () =>
      request('https://agent.example.test/', '/health', {
        probeStage: 'external_health',
        fetchFn: async () => {
          throw timeout;
        },
      }),
    (error) => {
      assert.equal(error.applicationErrorCode, 'VERIFICATION_REQUEST_TIMEOUT');
      assert.equal(error.timeoutReason, 'LOCAL_VERIFICATION_REQUEST_TIMEOUT');
      assert.equal(error.resolvedHostname, 'agent.example.test');
      assert.equal(error.probeTimeoutMs, 30_000);
      assert.equal(error.networkErrorName, 'TimeoutError');
      assert.equal(error.networkCauseCode, 'UND_ERR_CONNECT_TIMEOUT');
      assert.equal(error.probeStage, 'external_health');
      const output = formatVerificationFailure(
        wrapVerificationFailure(error, { stage: 'external_health', stageStartedAt: 1_000 }, 1_010),
      );
      assert.match(output, /Resolved hostname: agent\.example\.test/);
      assert.match(output, /Startup probe timeout ms: 30000/);
      assert.match(output, /Network error name: TimeoutError/);
      assert.match(output, /Network cause code: UND_ERR_CONNECT_TIMEOUT/);
      assert.match(output, /Startup probe stage: external_health/);
      assert.doesNotMatch(output, /private network|private connect/i);
      return true;
    },
  );
});

test('HTTP 503 health response is attributed to the external health probe', async () => {
  const state = { stage: 'external_health', stageStartedAt: 2_000 };
  let failure;
  try {
    await verifyExternalStartup('https://agent.example.test/', state, {
      requestFn: (baseUrl, pathname, options) =>
        request(baseUrl, pathname, {
          ...options,
          fetchFn: async () =>
            jsonFetchResponse({ success: false, error: { code: 'SERVICE_UNAVAILABLE' } }, 503),
        }),
      reportFn() {},
    });
  } catch (error) {
    failure = wrapVerificationFailure(error, state, state.stageStartedAt + 25);
  }

  assert.ok(failure);
  assert.equal(failure.stage, 'external_health');
  assert.equal(failure.httpStatus, 503);
  assert.equal(failure.applicationErrorCode, 'SERVICE_UNAVAILABLE');
  assert.equal(failure.resolvedHostname, 'agent.example.test');
  assert.equal(failure.probeTimeoutMs, 30_000);
  assert.equal(failure.probeStage, 'external_health');
});

test('successful startup probes use normalized health and readiness URLs exactly once', async () => {
  const urls = [];
  const diagnostics = [];
  const reports = [];
  const state = { stage: 'external_health', stageStartedAt: 3_000 };
  await verifyExternalStartup('https://agent.example.test/runtime///', state, {
    requestFn: async (baseUrl, pathname, options) => {
      const result = await request(baseUrl, pathname, {
        ...options,
        fetchFn: async (url) => {
          urls.push(url);
          return url.endsWith('/health')
            ? jsonFetchResponse({
                success: true,
                data: {
                  service: 'external-research-agent',
                  status: 'ok',
                  version: '2.0.0',
                },
              })
            : jsonFetchResponse({ success: true, data: readyData() });
        },
      });
      diagnostics.push(result.probeDiagnostics);
      return result;
    },
    reportFn: (label) => reports.push(label),
  });

  assert.deepEqual(urls, [
    'https://agent.example.test/runtime/health',
    'https://agent.example.test/runtime/ready',
  ]);
  assert.deepEqual(
    diagnostics.map(({ resolvedHostname, probeTimeoutMs, probeStage }) => ({
      resolvedHostname,
      probeTimeoutMs,
      probeStage,
    })),
    [
      {
        resolvedHostname: 'agent.example.test',
        probeTimeoutMs: 30_000,
        probeStage: 'external_health',
      },
      {
        resolvedHostname: 'agent.example.test',
        probeTimeoutMs: 30_000,
        probeStage: 'external_readiness',
      },
    ],
  );
  assert.deepEqual(reports, ['external liveness', 'external readiness']);
  assert.equal(state.stage, 'external_readiness');
});

test('verifier-local request failures retain safe outbound correlation identifiers', async () => {
  await assert.rejects(
    () =>
      request('http://external.test', '/invoke', {
        headers: {
          'X-Request-Id': 'req_local-timeout',
          'X-Trace-Id': 'trace_local-timeout',
        },
        fetchFn: async () => {
          const error = new Error('local timeout');
          error.name = 'TimeoutError';
          throw error;
        },
      }),
    (error) =>
      error.applicationErrorCode === 'VERIFICATION_REQUEST_TIMEOUT' &&
      error.timeoutReason === 'LOCAL_VERIFICATION_REQUEST_TIMEOUT' &&
      error.requestId === 'req_local-timeout' &&
      error.traceId === 'trace_local-timeout',
  );
});

test('external-flow verifier uses a current topic that requires official web research', () => {
  const topic = verificationResearchTopic(new Date('2026-07-14T12:00:00.000Z'));

  assert.match(topic, /Google Search/i);
  assert.match(topic, /exactly 2/i);
  assert.match(topic, /2026-07-08/);
  assert.match(topic, /at least 2 genuine/i);
  assert.match(topic, /source-backed factual findings/i);
  assert.match(topic, /no introduction or long explanations/i);
  assert.match(topic, /2026-07-14/);
  assert.doesNotMatch(topic, /^external authenticated agent interoperability$/i);
});

test('external liveness validates the Phase 13B2 health shape without provider metadata', () => {
  const health = validateExternalHealth(
    endpointResult({
      service: 'external-research-agent',
      status: 'ok',
      version: '2.0.0',
    }),
  );

  assert.equal(health.status, 'ok');
  assert.equal(Object.hasOwn(health, 'ai'), false);
  assert.equal(Object.hasOwn(health, 'provider'), false);
  assert.equal(
    VERIFICATION_STAGES.indexOf('external_readiness'),
    VERIFICATION_STAGES.indexOf('external_health') + 1,
  );
});

test('external readiness validates the documented Gemini and runtime-authentication fields', () => {
  const readiness = validateExternalReadiness(endpointResult(readyData()));

  assert.equal(readiness.status, 'ready');
  assert.deepEqual(readiness.ai, { provider: 'gemini', configured: true });
  assert.deepEqual(readiness.runtimeAuthentication, { configured: true });
  assert.deepEqual(readiness.lifecycle, { status: 'ready' });
});

test('external readiness rejects missing provider or runtime-authentication configuration', () => {
  assert.throws(
    () =>
      validateExternalReadiness(
        endpointResult(readyData({ ai: { provider: 'gemini', configured: false } })),
      ),
    /provider configuration is unavailable/i,
  );
  assert.throws(
    () =>
      validateExternalReadiness(
        endpointResult(readyData({ runtimeAuthentication: { configured: false } })),
      ),
    /runtime authentication configuration is unavailable/i,
  );
});

test('draining external readiness is rejected with safe Phase 13B2 diagnostics', () => {
  const result = endpointResult(
    readyData({ status: 'not_ready', lifecycle: { status: 'draining' } }),
    { status: 503, success: false },
  );

  assert.throws(
    () => validateExternalReadiness(result),
    (error) => {
      assert.equal(error.httpStatus, 503);
      assert.equal(error.readinessStatus, 'not_ready');
      assert.equal(error.providerName, 'gemini');
      assert.equal(error.draining, true);
      assert.equal(error.requestId, 'req_endpoint-test');
      assert.equal(error.traceId, 'trace_endpoint-test');
      return true;
    },
  );
});

test('an unavailable readiness response is attributed to external_readiness', async () => {
  const state = { stage: 'external_health', stageStartedAt: 1_000 };
  const health = endpointResult({
    service: 'external-research-agent',
    status: 'ok',
    version: '2.0.0',
  });
  const unavailable = endpointResult(
    readyData({
      status: 'not_ready',
      ai: { provider: 'gemini', configured: false },
      lifecycle: { status: 'starting' },
    }),
    { status: 503, success: false },
  );
  let failure;
  try {
    await verifyExternalStartup('http://external.test', state, {
      requestFn: async (_baseUrl, pathname) => (pathname === '/health' ? health : unavailable),
      reportFn() {},
    });
  } catch (error) {
    failure = wrapVerificationFailure(error, state, state.stageStartedAt + 250);
  }

  assert.ok(failure);
  assert.equal(failure.stage, 'external_readiness');
  assert.equal(failure.httpStatus, 503);
  assert.equal(failure.applicationErrorCode, undefined);
  assert.equal(failure.readinessStatus, 'not_ready');
  assert.equal(failure.providerName, 'gemini');
  assert.equal(failure.draining, false);
  assert.equal(failure.durationMs, 250);
  const output = formatVerificationFailure(failure);
  assert.match(output, /Failed stage: external_readiness/);
  assert.match(output, /HTTP status: 503/);
  assert.match(output, /Application error code: \[unavailable\]/);
  assert.match(output, /Duration ms: 250/);
});

test('readiness diagnostics never serialize secrets or untrusted response content', () => {
  const secret = 'gemini-api-key-secret-0123456789';
  const result = endpointResult(
    readyData({
      status: 'not_ready',
      ai: { provider: 'gemini', configured: false, apiKey: secret },
      lifecycle: { status: 'starting' },
      prompt: `private prompt ${secret}`,
      sources: [`https://example.test/?token=${secret}`],
    }),
    {
      status: 503,
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: `provider rejected ${secret}` },
    },
  );
  let failure;
  try {
    validateExternalReadiness(result);
  } catch (error) {
    failure = wrapVerificationFailure(
      error,
      { stage: 'external_readiness', stageStartedAt: 2_000 },
      2_025,
    );
  }
  const output = formatVerificationFailure(failure);

  assert.equal(output.includes(secret), false);
  assert.equal(output.includes('private prompt'), false);
  assert.equal(output.includes('example.test'), false);
  assert.match(output, /Readiness status: not_ready/);
  assert.match(output, /Provider: gemini/);
  assert.match(output, /Draining: false/);
});

test('timeout failures identify gateway_invocation and preserve the original cause', () => {
  const cause = new Error('socket aborted');
  cause.name = 'AbortError';
  cause.code = 'SAFE_FETCH_TIMEOUT';
  cause.statusCode = 504;
  cause.requestId = 'req_timeout-safe';
  const state = {
    stage: 'gateway_invocation',
    stageStartedAt: 1_000,
    connectionId: 'connection_123',
  };

  const wrapped = wrapVerificationFailure(cause, state, 1_250);

  assert.equal(wrapped.cause, cause);
  assert.equal(wrapped.stage, 'gateway_invocation');
  assert.equal(wrapped.httpStatus, 504);
  assert.equal(wrapped.applicationErrorCode, 'SAFE_FETCH_TIMEOUT');
  assert.equal(wrapped.timeoutReason, 'SAFE_FETCH_TIMEOUT');
  assert.equal(wrapped.requestId, 'req_timeout-safe');
  assert.equal(wrapped.durationMs, 250);
  assert.equal(wrapped.connectionId, 'connection_123');
  assert.match(formatVerificationFailure(wrapped), /Failed stage: gateway_invocation/);
});

test('Gemini stage timeouts report only safe operation and configured-deadline metadata', () => {
  const secret = 'private-provider-secret-0123456789';
  const result = endpointResult(undefined, {
    status: 502,
    success: false,
    error: {
      code: 'GEMINI_REQUEST_TIMEOUT',
      operation: 'grounded_research',
      timeoutReason: 'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
      configuredTimeoutMs: 115_000,
      researchAttemptCount: 2,
      researchAttemptDurationsMs: [23_000, 114_000],
      fallbackResearchProfileUsed: true,
      finalProviderStatus: 'DEADLINE_EXCEEDED',
      groundingMetadataCount: 0,
      requestId: 'req_endpoint-test',
      traceId: 'trace_endpoint-test',
      message: `private response ${secret}`,
      prompt: `private prompt ${secret}`,
      sources: [`https://example.test/?token=${secret}`],
      apiKey: secret,
    },
  });
  let failure;
  try {
    success(result, 'gateway invocation', { connectionId: 'connection_123' });
  } catch (error) {
    failure = wrapVerificationFailure(
      error,
      {
        stage: 'gateway_invocation',
        stageStartedAt: 3_000,
        connectionId: 'connection_123',
      },
      3_125,
    );
  }
  const output = formatVerificationFailure(failure);

  assert.equal(failure.operation, 'grounded_research');
  assert.equal(failure.timeoutReason, 'LOCAL_PROVIDER_DEADLINE_EXCEEDED');
  assert.equal(failure.configuredTimeoutMs, 115_000);
  assert.equal(failure.researchAttemptCount, 2);
  assert.deepEqual(failure.researchAttemptDurationsMs, [23_000, 114_000]);
  assert.equal(failure.fallbackResearchProfileUsed, true);
  assert.equal(failure.finalProviderStatus, 'DEADLINE_EXCEEDED');
  assert.equal(failure.groundingMetadataCount, 0);
  assert.match(output, /Failed stage: gateway_invocation/);
  assert.match(output, /Operation: grounded_research/);
  assert.match(output, /Timeout reason: LOCAL_PROVIDER_DEADLINE_EXCEEDED/);
  assert.match(output, /Configured timeout ms: 115000/);
  assert.match(output, /Research attempt count: 2/);
  assert.match(output, /Research attempt durations ms: 23000, 114000/);
  assert.match(output, /Fallback research profile used: true/);
  assert.match(output, /Final provider status: DEADLINE_EXCEEDED/);
  assert.match(output, /Genuine grounding metadata count: 0/);
  assert.match(output, /Request ID: req_endpoint-test/);
  assert.match(output, /Trace ID: trace_endpoint-test/);
  assert.equal(output.includes(secret), false);
  assert.equal(output.includes('private prompt'), false);
  assert.equal(output.includes('example.test'), false);
});

test('Gemini upstream failures retain only their allowlisted operation diagnostic', () => {
  const secret = 'private-provider-secret-0123456789';
  const result = endpointResult(undefined, {
    status: 502,
    success: false,
    error: {
      code: 'GEMINI_UPSTREAM_UNAVAILABLE',
      operation: 'structured_formatting',
      requestId: 'req_endpoint-test',
      traceId: 'trace_endpoint-test',
      message: `private response ${secret}`,
      providerResponse: secret,
    },
  });
  let failure;
  try {
    success(result, 'gateway invocation', { connectionId: 'connection_123' });
  } catch (error) {
    failure = wrapVerificationFailure(
      error,
      {
        stage: 'gateway_invocation',
        stageStartedAt: 3_000,
        connectionId: 'connection_123',
      },
      3_125,
    );
  }
  const output = formatVerificationFailure(failure);

  assert.equal(failure.operation, 'structured_formatting');
  assert.match(output, /Application error code: GEMINI_UPSTREAM_UNAVAILABLE/);
  assert.match(output, /Operation: structured_formatting/);
  assert.equal(output.includes(secret), false);
});

test('source-extraction failures report only correlated allowlisted Gemini shape diagnostics', () => {
  const secret = 'gemini-api-key-secret-0123456789';
  const result = endpointResult(undefined, {
    status: 502,
    success: false,
    error: {
      code: 'GEMINI_SOURCE_EXTRACTION_FAILED',
      requestId: 'req_endpoint-test',
      traceId: 'trace_endpoint-test',
      message: `private provider content ${secret}`,
    },
  });
  const externalLogChunks = [
    `${JSON.stringify({
      event: 'gemini.source_extraction.failed',
      requestId: 'req_endpoint-test',
      traceId: 'trace_endpoint-test',
      internalCode: 'GEMINI_GROUNDING_METADATA_MISSING',
      apiMode: 'models.generateContent',
      candidateCount: 1,
      configuredMaxOutputTokens: 2048,
      promptCharacterCount: 731,
      promptTokenCount: 182,
      candidatesTokenCount: 73,
      thoughtsTokenCount: 12,
      totalTokenCount: 267,
      responseStepTypes: [],
      googleSearchCallCount: 0,
      googleSearchResultCount: 0,
      citationAnnotationCount: 0,
      groundingMetadataPresent: false,
      groundingChunkCount: 0,
      webSearchQueryCount: 0,
      finishReason: 'STOP',
      prompt: `private prompt ${secret}`,
      sources: [`https://example.test/?token=${secret}`],
    })}\n`,
    `${JSON.stringify({
      event: 'gemini.source_extraction.failed',
      requestId: 'req_unrelated',
      traceId: 'trace_unrelated',
      internalCode: 'UNTRUSTED_CODE',
      groundingMetadataPresent: 'false',
      groundingChunkCount: -1,
      webSearchQueryCount: 9_999_999,
    })}\n`,
  ];

  assert.deepEqual(
    sourceExtractionDiagnostics(externalLogChunks, {
      requestId: 'req_endpoint-test',
      traceId: 'trace_endpoint-test',
    }),
    {
      sourceExtractionCode: 'GEMINI_GROUNDING_METADATA_MISSING',
      apiMode: 'models.generateContent',
      candidateCount: 1,
      configuredMaxOutputTokens: 2048,
      promptCharacterCount: 731,
      promptTokenCount: 182,
      candidatesTokenCount: 73,
      thoughtsTokenCount: 12,
      totalTokenCount: 267,
      responseStepTypes: [],
      googleSearchCallCount: 0,
      googleSearchResultCount: 0,
      citationAnnotationCount: 0,
      groundingMetadataPresent: false,
      groundingChunkCount: 0,
      webSearchQueryCount: 0,
      finishReason: 'STOP',
    },
  );

  let failure;
  try {
    success(result, 'gateway invocation', {
      connectionId: 'connection_123',
      externalLogChunks,
    });
  } catch (error) {
    failure = wrapVerificationFailure(
      error,
      {
        stage: 'gateway_invocation',
        stageStartedAt: 2_000,
        connectionId: 'connection_123',
      },
      2_025,
    );
  }
  const output = formatVerificationFailure(failure);

  assert.match(output, /Application error code: GEMINI_SOURCE_EXTRACTION_FAILED/);
  assert.match(output, /Source extraction code: GEMINI_GROUNDING_METADATA_MISSING/);
  assert.match(output, /API mode: models\.generateContent/);
  assert.match(output, /Response candidate count: 1/);
  assert.match(output, /Response step types: \[none\]/);
  assert.match(output, /Google Search call count: 0/);
  assert.match(output, /Google Search result count: 0/);
  assert.match(output, /Citation annotation count: 0/);
  assert.match(output, /Grounding metadata present: false/);
  assert.match(output, /Grounding chunk count: 0/);
  assert.match(output, /Web Search query count: 0/);
  assert.match(output, /Finish reason: STOP/);
  assert.match(output, /Request ID: req_endpoint-test/);
  assert.match(output, /Trace ID: trace_endpoint-test/);
  assert.equal(output.includes(secret), false);
  assert.equal(output.includes('private prompt'), false);
  assert.equal(output.includes('example.test'), false);
  assert.equal(output.includes('UNTRUSTED_CODE'), false);
});

test('verification diagnostics redact secrets without serializing the cause', () => {
  const installKey = generateInstallKey();
  const partnerKey = generatePartnerApiKey();
  const runtimeToken = 'runtime-secret-value-0123456789';
  const cause = new Error(
    `Bearer ${runtimeToken} install=${installKey} partner=${partnerKey} api-key-secret-value`,
  );
  const wrapped = wrapVerificationFailure(
    cause,
    {
      stage: 'secret_scan',
      stageStartedAt: 2_000,
      connectionId: installKey,
    },
    2_010,
  );
  const output = formatVerificationFailure(wrapped);

  assert.equal(wrapped.cause, cause);
  assert.equal(wrapped instanceof ExternalFlowVerificationError, true);
  assert.equal(output.includes(runtimeToken), false);
  assert.equal(output.includes(installKey), false);
  assert.equal(output.includes(partnerKey), false);
  assert.equal(output.includes('api-key-secret-value'), false);
  assert.match(output, /Safe message: External-flow verification failed\./);
  assert.equal(VERIFICATION_STAGES.includes(wrapped.stage), true);
});
