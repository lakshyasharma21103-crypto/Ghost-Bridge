const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
  EXTERNAL_AGENT_BASE_URL_ENV,
  EXTERNAL_AGENT_RUNTIME_TOKEN_ENV,
  EXTERNAL_AGENT_REQUEST_TIMEOUT_MS,
  EXTERNAL_STARTUP_PROBE_TIMEOUT_MS,
  EXTERNAL_FLOW_GATEWAY_MAX_ATTEMPTS,
  EXTERNAL_FLOW_GATEWAY_RETRY_DELAY_MS,
  ExternalFlowVerificationError,
  LOCAL_SPAWNED_AGENT_MODE,
  REMOTE_LIVE_AGENT_MODE,
  RUNTIME_INVOCATION_TIMEOUT_MS,
  VERIFICATION_REQUEST_TIMEOUT_MS,
  VERIFICATION_STAGES,
  applyExternalRuntimeEnvironment,
  calculatedGeminiRetryBudgetMs,
  configuredTimeoutMs,
  externalAgentEnvironment,
  externalAgentProbeUrl,
  formatVerificationFailure,
  invokeGatewayWithTransientRetry,
  normalizeExternalAgentBaseUrl,
  request,
  requireExternalRuntimeConfiguration,
  resolveExternalAgentBaseUrl,
  resolveExternalRuntime,
  retryableGatewayProviderFailure,
  runStartupStage,
  sourceExtractionDiagnostics,
  success,
  validateExternalHealth,
  validateExternalReadiness,
  validateTimeoutHierarchy,
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

function immediateProbeTimeout() {
  const configuredTimeouts = [];
  return {
    configuredTimeouts,
    timerApi: {
      setTimeout(callback, timeoutMs) {
        configuredTimeouts.push(timeoutMs);
        queueMicrotask(callback);
        return { unref() {} };
      },
      clearTimeout() {},
    },
  };
}

function fetchUntilAborted(secret, causeCode) {
  return async (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener(
        'abort',
        () => {
          const error = new Error(`private network detail ${secret}`);
          error.name = 'TimeoutError';
          error.cause = Object.assign(new Error(`private socket detail ${secret}`), {
            code: causeCode,
          });
          reject(error);
        },
        { once: true },
      );
    });
}

function createVerifierLaunchFixture() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'external-flow-env-'));
  const fixtureBackend = path.join(fixtureRoot, 'backend');
  const fixtureScripts = path.join(fixtureBackend, 'scripts');
  const backendPackage = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'),
  );
  fs.mkdirSync(fixtureScripts, { recursive: true });
  fs.copyFileSync(
    path.resolve(__dirname, '../../scripts/verifyExternalFlow.js'),
    path.join(fixtureScripts, 'verifyExternalFlow.js'),
  );
  fs.writeFileSync(
    path.join(fixtureBackend, '.env'),
    'EXTERNAL_TEST_AGENT_BASE_URL=https://fixture-agent.example.test\n',
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'package.json'),
    `${JSON.stringify({ private: true, workspaces: ['backend'] }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(fixtureBackend, 'package.json'),
    `${JSON.stringify(
      {
        name: backendPackage.name,
        private: true,
        scripts: {
          'verify:external-flow': backendPackage.scripts['verify:external-flow'],
        },
      },
      null,
      2,
    )}\n`,
  );

  const env = { ...process.env, NODE_PATH: path.resolve(__dirname, '../../../node_modules') };
  delete env.EXTERNAL_TEST_AGENT_BASE_URL;

  return { env, fixtureBackend, fixtureRoot };
}

function assertEnvironmentLaunch(command, args, options) {
  const result = spawnSync(command, args, {
    ...options,
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.equal(result.stdout.split('External-flow verifier environment loaded.').length - 1, 1);
  assert.equal(result.stdout.includes('fixture-agent.example.test'), false);
  assert.equal(result.stderr, '');
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
  const calculatedRetryBudgetMs = calculatedGeminiRetryBudgetMs({
    gemini: {
      researchTimeoutMs: 120_000,
      researchFallbackTimeoutMs: 180_000,
      formattingTimeoutMs: 60_000,
      researchMaxAttempts: 2,
      formattingMaxAttempts: 2,
    },
  });
  const childEnvironment = externalAgentEnvironment({ localEnvironment: {}, environment: {} });

  assert.equal(EXTERNAL_AGENT_REQUEST_TIMEOUT_MS, 510_000);
  assert.equal(childEnvironment.REQUEST_TIMEOUT_MS, '510000');
  assert.equal(VERIFICATION_REQUEST_TIMEOUT_MS, 570_000);
  assert.equal(RUNTIME_INVOCATION_TIMEOUT_MS, 550_000);
  assert.equal(EXTERNAL_STARTUP_PROBE_TIMEOUT_MS, 30_000);
  assert.equal(calculatedRetryBudgetMs, 500_000);
  assert.ok(calculatedRetryBudgetMs < EXTERNAL_AGENT_REQUEST_TIMEOUT_MS);
  assert.ok(EXTERNAL_AGENT_REQUEST_TIMEOUT_MS < RUNTIME_INVOCATION_TIMEOUT_MS);
  assert.ok(RUNTIME_INVOCATION_TIMEOUT_MS < VERIFICATION_REQUEST_TIMEOUT_MS);
  assert.equal(
    configuredTimeoutMs(
      { RUNTIME_INVOCATION_TIMEOUT_MS: '550000' },
      'RUNTIME_INVOCATION_TIMEOUT_MS',
      1,
    ),
    550_000,
  );
  assert.match(source, /REQUEST_TIMEOUT_MS:\s*String\(EXTERNAL_AGENT_REQUEST_TIMEOUT_MS\)/);
  assert.match(source, /process\.env\.RUNTIME_INVOCATION_TIMEOUT_MS\s*=\s*String\(/);
  assert.equal(
    configuredTimeoutMs(
      { EXTERNAL_FLOW_REQUEST_TIMEOUT_MS: '0' },
      'EXTERNAL_FLOW_REQUEST_TIMEOUT_MS',
      570_000,
    ),
    0,
  );
  assert.doesNotMatch(source, /VERIFICATION_REQUEST_TIMEOUT_MS\s*<=\s*390_000/);
  assert.doesNotMatch(source, /must exceed 390000/);
  assert.doesNotMatch(source, /RUNTIME_REQUEST_TIMEOUT_MS\s*=.*70000/);
  assert.ok(source.indexOf('dotenv.config') < source.indexOf('const externalAgentPort'));
  assert.ok(source.indexOf('dotenv.config') < source.indexOf('VERIFICATION_REQUEST_TIMEOUT_MS'));
  assert.ok(source.indexOf('dotenv.config') < source.search(/process\.env(?:\.|\[)/));
  assert.doesNotMatch(
    source,
    /process\.env\.EXTERNAL_TEST_AGENT_BASE_URL\s*=\s*`http:\/\/127\.0\.0\.1/,
  );
});

test('invalid timeout hierarchy fails before runtime startup with a safe validation message', () => {
  let startupCalled = false;
  let failure;
  const state = { stage: 'environment_validation', stageStartedAt: 1_000 };

  try {
    validateTimeoutHierarchy({
      calculatedGeminiRetryBudgetMs: 472_998,
      externalAgentRequestTimeoutMs: 500_000,
      verificationRequestTimeoutMs: 500_000,
      runtimeInvocationTimeoutMs: 540_000,
    });
    startupCalled = true;
  } catch (error) {
    failure = wrapVerificationFailure(error, state, 1_010);
  }

  assert.equal(startupCalled, false);
  assert.equal(failure.stage, 'environment_validation');
  assert.equal(failure.applicationErrorCode, 'EXTERNAL_FLOW_TIMEOUT_HIERARCHY_INVALID');
  assert.equal(
    failure.timeoutBudgetValidationMessage,
    'RUNTIME_INVOCATION_TIMEOUT_MS must be less than EXTERNAL_FLOW_REQUEST_TIMEOUT_MS.',
  );
  const output = formatVerificationFailure(failure);
  assert.match(output, /Failed stage: environment_validation/);
  assert.match(output, /Startup stage: environment_validation/);
  assert.match(output, /Application error code: EXTERNAL_FLOW_TIMEOUT_HIERARCHY_INVALID/);
  assert.match(
    output,
    /Timeout-budget validation: RUNTIME_INVOCATION_TIMEOUT_MS must be less than EXTERNAL_FLOW_REQUEST_TIMEOUT_MS\./,
  );
});

test('external child startup failure reports external_runtime_start with safe diagnostics', async () => {
  const secret = 'runtime-token-secret-value-0123456789';
  const childError = Object.assign(new Error(`child failed with ${secret}`), {
    applicationErrorCode: 'EXTERNAL_AGENT_STARTUP_FAILED',
    exitCode: 17,
  });
  const state = { stage: 'environment_validation', stageStartedAt: 2_000 };
  let failure;

  try {
    await runStartupStage(state, 'external_runtime_start', async () => {
      throw childError;
    });
  } catch (error) {
    failure = wrapVerificationFailure(error, state, state.stageStartedAt + 25);
  }

  assert.equal(failure.stage, 'external_runtime_start');
  assert.equal(failure.applicationErrorCode, 'EXTERNAL_AGENT_STARTUP_FAILED');
  assert.equal(failure.processExitCode, 17);
  const output = formatVerificationFailure(failure);
  assert.match(output, /Failed stage: external_runtime_start/);
  assert.match(output, /Startup stage: external_runtime_start/);
  assert.match(output, /Process exit code: 17/);
  assert.equal(output.includes(secret), false);
});

test('verifier startup stages precede health and readiness in execution order', () => {
  assert.deepEqual(VERIFICATION_STAGES.slice(0, 5), [
    'environment_validation',
    'external_runtime_start',
    'gateway_start',
    'external_health',
    'external_readiness',
  ]);
});

test('remote mode preserves the configured runtime token without generating a replacement', () => {
  const configuredToken = 'remote-runtime-token-value-0123456789-abcdefgh';
  let randomCalls = 0;
  const configuration = resolveExternalRuntime(
    {
      [EXTERNAL_AGENT_BASE_URL_ENV]: '  https://agent.example.test  ',
      [EXTERNAL_AGENT_RUNTIME_TOKEN_ENV]: `  ${configuredToken}  `,
    },
    {
      randomBytes() {
        randomCalls += 1;
        throw new Error('remote mode must not generate a token');
      },
    },
  );

  assert.equal(configuration.mode, REMOTE_LIVE_AGENT_MODE);
  assert.equal(configuration.baseUrl, 'https://agent.example.test');
  assert.equal(configuration.runtimeToken, configuredToken);
  assert.equal(configuration.startLocalRuntime, false);
  assert.equal(randomCalls, 0);
});

test('remote mode without a token fails safely before connection creation', () => {
  let bootstrap;
  let connectionCreated = false;
  try {
    resolveExternalRuntime({
      [EXTERNAL_AGENT_BASE_URL_ENV]: 'https://agent.example.test',
    });
  } catch (error) {
    bootstrap = { error };
  }

  assert.throws(
    () => {
      requireExternalRuntimeConfiguration(bootstrap);
      connectionCreated = true;
    },
    (error) => {
      assert.equal(error.applicationErrorCode, 'EXTERNAL_TEST_AGENT_RUNTIME_TOKEN_MISSING');
      assert.equal(error.runtimeMode, REMOTE_LIVE_AGENT_MODE);
      assert.equal(error.authenticationStage, 'environment_validation');
      const output = formatVerificationFailure(
        wrapVerificationFailure(
          error,
          {
            stage: 'environment_validation',
            stageStartedAt: 1_000,
            runtimeMode: REMOTE_LIVE_AGENT_MODE,
          },
          1_010,
        ),
      );
      assert.match(output, /Application error code: EXTERNAL_TEST_AGENT_RUNTIME_TOKEN_MISSING/);
      assert.match(output, /Runtime mode: remote/);
      assert.match(output, /Authentication stage: environment_validation/);
      return true;
    },
  );
  assert.equal(connectionCreated, false);
});

test('local mode generates one random token shared by the local runtime and delegated credential', () => {
  const generatedBytes = Buffer.alloc(32, 0xa7);
  let randomCalls = 0;
  const configuration = resolveExternalRuntime(
    {},
    {
      localPort: 5002,
      randomBytes(size) {
        randomCalls += 1;
        assert.equal(size, 32);
        return generatedBytes;
      },
    },
  );
  const backendEnvironment = {};
  applyExternalRuntimeEnvironment(configuration, backendEnvironment);
  const childEnvironment = externalAgentEnvironment({
    localEnvironment: {},
    environment: {},
    runtimeToken: configuration.runtimeToken,
  });
  const backendToken = Buffer.from(backendEnvironment[EXTERNAL_AGENT_RUNTIME_TOKEN_ENV], 'utf8');
  const childToken = Buffer.from(childEnvironment.EXTERNAL_AGENT_RUNTIME_TOKEN, 'utf8');

  assert.equal(configuration.mode, LOCAL_SPAWNED_AGENT_MODE);
  assert.equal(configuration.startLocalRuntime, true);
  assert.equal(configuration.baseUrl, 'http://127.0.0.1:5002');
  assert.equal(randomCalls, 1);
  assert.equal(crypto.timingSafeEqual(backendToken, childToken), true);
});

test('local mode uses a cryptographically generated 32-byte runtime token', () => {
  const configuration = resolveExternalRuntime({}, { localPort: 5002 });

  assert.equal(configuration.mode, LOCAL_SPAWNED_AGENT_MODE);
  assert.match(configuration.runtimeToken, /^[A-Za-z0-9_-]+$/);
  assert.equal(Buffer.from(configuration.runtimeToken, 'base64url').length, 32);
});

test('runtime authentication failures retain only safe mode and downstream diagnostics', () => {
  const runtimeToken = 'wrong-runtime-token-value-0123456789';
  const installKey = generateInstallKey();
  const result = endpointResult(undefined, {
    status: 502,
    success: false,
    error: {
      code: 'RUNTIME_AUTHENTICATION_FAILED',
      message: `Authorization: Bearer ${runtimeToken}`,
      details: [
        {
          path: 'runtime',
          remoteStatus: 401,
          message: `encrypted credential ${runtimeToken} install=${installKey}`,
        },
      ],
    },
  });
  let failure;

  try {
    success(result, 'gateway invocation', {
      connectionId: 'connection_123',
      runtimeMode: REMOTE_LIVE_AGENT_MODE,
    });
  } catch (error) {
    failure = wrapVerificationFailure(
      error,
      {
        stage: 'gateway_invocation',
        stageStartedAt: 2_000,
        connectionId: 'connection_123',
        runtimeMode: REMOTE_LIVE_AGENT_MODE,
      },
      2_025,
    );
  }

  assert.equal(failure.applicationErrorCode, 'RUNTIME_AUTHENTICATION_FAILED');
  assert.equal(failure.runtimeMode, REMOTE_LIVE_AGENT_MODE);
  assert.equal(failure.downstreamHttpStatusCategory, '4xx');
  assert.equal(failure.authenticationStage, 'runtime_authentication');
  assert.equal(failure.connectionId, 'connection_123');
  assert.equal(failure.requestId, 'req_endpoint-test');
  assert.equal(failure.traceId, 'trace_endpoint-test');
  const output = formatVerificationFailure(failure);
  assert.match(output, /Runtime mode: remote/);
  assert.match(output, /Downstream HTTP status category: 4xx/);
  assert.match(output, /Authentication stage: runtime_authentication/);
  assert.equal(output.includes(runtimeToken), false);
  assert.equal(output.includes(installKey), false);
  assert.doesNotMatch(output, /Authorization|Bearer|encrypted credential/i);
});

test('external-flow verifier loads backend/.env from every supported launch directory', async (t) => {
  const { env, fixtureBackend, fixtureRoot } = createVerifierLaunchFixture();
  t.after(() => fs.rmSync(fixtureRoot, { force: true, recursive: true }));

  await t.test('from the repository root', () => {
    assertEnvironmentLaunch(
      process.execPath,
      ['backend/scripts/verifyExternalFlow.js', '--check-env-load'],
      { cwd: fixtureRoot, env },
    );
  });

  await t.test('from the backend directory', () => {
    assertEnvironmentLaunch(
      process.execPath,
      ['scripts/verifyExternalFlow.js', '--check-env-load'],
      { cwd: fixtureBackend, env },
    );
  });

  await t.test('through npm --workspace backend', () => {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    assertEnvironmentLaunch(
      npmCommand,
      ['--workspace', 'backend', 'run', 'verify:external-flow', '--', '--check-env-load'],
      {
        cwd: fixtureRoot,
        env,
        shell: process.platform === 'win32',
      },
    );
  });
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
  const secret = 'health-probe-secret-value';
  const timeout = immediateProbeTimeout();

  await assert.rejects(
    () =>
      request('https://agent.example.test/', '/health', {
        probeStage: 'external_health',
        headers: { Authorization: `Bearer ${secret}` },
        fetchFn: fetchUntilAborted(secret, 'UND_ERR_CONNECT_TIMEOUT'),
        timerApi: timeout.timerApi,
      }),
    (error) => {
      assert.deepEqual(timeout.configuredTimeouts, [30_000]);
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
      assert.match(output, /Configured startup probe timeout ms: 30000/);
      assert.match(output, /Network error name: TimeoutError/);
      assert.match(output, /Network cause code: UND_ERR_CONNECT_TIMEOUT/);
      assert.match(output, /Startup probe stage: external_health/);
      assert.match(output, /Duration ms: 10/);
      assert.equal(output.includes(secret), false);
      assert.doesNotMatch(output, /private network|private socket/i);
      return true;
    },
  );
});

test('slow external health response below 30 seconds succeeds without a billed request', async () => {
  const state = { stage: 'external_health', stageStartedAt: 1_000 };
  const urls = [];

  await verifyExternalStartup('https://agent.example.test/', state, {
    requestFn: (baseUrl, pathname, options) =>
      request(baseUrl, pathname, {
        ...options,
        fetchFn: async (url) => {
          urls.push(url);
          if (url.endsWith('/health')) {
            await new Promise((resolve) => setTimeout(resolve, 25));
            return jsonFetchResponse({
              success: true,
              data: {
                service: 'external-research-agent',
                status: 'ok',
                version: '2.0.0',
              },
            });
          }
          return jsonFetchResponse({ success: true, data: readyData() });
        },
      }),
    reportFn() {},
  });

  assert.deepEqual(urls, ['https://agent.example.test/health', 'https://agent.example.test/ready']);
  assert.equal(state.stage, 'external_readiness');
});

test('external readiness probe timeout reports its stage and safe network diagnostics', async () => {
  const secret = 'readiness-probe-secret-value';
  const timeout = immediateProbeTimeout();
  const state = { stage: 'external_health', stageStartedAt: 2_000 };
  let failure;

  try {
    await verifyExternalStartup('https://ready-agent.example.test/', state, {
      requestFn: (baseUrl, pathname, options) =>
        request(baseUrl, pathname, {
          ...options,
          ...(pathname === '/ready'
            ? {
                headers: { 'X-Probe-Credential': secret },
                fetchFn: fetchUntilAborted(secret, 'ETIMEDOUT'),
                timerApi: timeout.timerApi,
              }
            : {
                fetchFn: async () =>
                  jsonFetchResponse({
                    success: true,
                    data: {
                      service: 'external-research-agent',
                      status: 'ok',
                      version: '2.0.0',
                    },
                  }),
              }),
        }),
      reportFn() {},
    });
  } catch (error) {
    failure = wrapVerificationFailure(error, state, state.stageStartedAt + 40);
  }

  assert.ok(failure);
  assert.deepEqual(timeout.configuredTimeouts, [30_000]);
  assert.equal(failure.stage, 'external_readiness');
  assert.equal(failure.resolvedHostname, 'ready-agent.example.test');
  assert.equal(failure.probeStage, 'external_readiness');
  assert.equal(failure.probeTimeoutMs, 30_000);
  assert.equal(failure.networkErrorName, 'TimeoutError');
  assert.equal(failure.networkCauseCode, 'ETIMEDOUT');
  assert.equal(failure.durationMs, 40);
  const output = formatVerificationFailure(failure);
  assert.match(output, /Startup probe stage: external_readiness/);
  assert.match(output, /Configured startup probe timeout ms: 30000/);
  assert.match(output, /Duration ms: 40/);
  assert.equal(output.includes(secret), false);
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

test('gateway invocation does not replay a transient Gemini outage beyond internal attempts', async () => {
  const transient = endpointResult(undefined, {
    status: 502,
    success: false,
    error: { code: 'GEMINI_UPSTREAM_UNAVAILABLE', operation: 'grounded_research' },
  });
  const responses = [transient];
  const calls = [];
  const delays = [];
  const retries = [];
  const uuids = ['trace-first', 'request-first', 'trace-second', 'request-second'];

  await assert.rejects(() =>
    invokeGatewayWithTransientRetry({
      baseUrl: 'http://gateway.example.test',
      body: { capability: 'research_topic', input: { topic: 'Public advisories' } },
      connectionId: 'connection_123',
      maxAttempts: 2,
      retryDelayMs: 25,
      randomUUID: () => uuids.shift(),
      requestFn: async (baseUrl, pathname, options) => {
        calls.push({ baseUrl, pathname, options });
        return responses.shift();
      },
      delayFn: async (delayMs) => delays.push(delayMs),
      retryReportFn: (details) => retries.push(details),
      runtimeMode: REMOTE_LIVE_AGENT_MODE,
    }),
  );

  assert.equal(EXTERNAL_FLOW_GATEWAY_MAX_ATTEMPTS, 1);
  assert.equal(EXTERNAL_FLOW_GATEWAY_RETRY_DELAY_MS, 5_000);
  assert.equal(calls.length, 1);
  assert.deepEqual(delays, []);
  assert.equal(calls[0].options.headers['X-Trace-Id'], 'trace_trace-first');
  assert.deepEqual(retries, []);
});

test('gateway invocation preserves a completed Gemini research timeout without replay', async () => {
  const timeout = endpointResult(undefined, {
    status: 502,
    success: false,
    error: {
      code: 'GEMINI_REQUEST_TIMEOUT',
      operation: 'grounded_research',
      timeoutReason: 'GEMINI_DEADLINE_EXCEEDED',
    },
  });
  const responses = [timeout];
  let delayCount = 0;

  await assert.rejects(() =>
    invokeGatewayWithTransientRetry({
      baseUrl: 'http://gateway.example.test',
      body: { capability: 'research_topic', input: { topic: 'Public advisories' } },
      connectionId: 'connection_123',
      maxAttempts: 2,
      requestFn: async () => responses.shift(),
      delayFn: async () => {
        delayCount += 1;
      },
      retryReportFn() {},
      runtimeMode: REMOTE_LIVE_AGENT_MODE,
    }),
  );

  assert.equal(retryableGatewayProviderFailure(timeout), true);
  assert.equal(delayCount, 0);
});

test('gateway invocation does not retry non-transient runtime failures', async () => {
  const authenticationFailure = endpointResult(undefined, {
    status: 502,
    success: false,
    error: { code: 'RUNTIME_AUTHENTICATION_FAILED' },
  });
  let requestCount = 0;
  let delayCount = 0;

  await assert.rejects(
    () =>
      invokeGatewayWithTransientRetry({
        baseUrl: 'http://gateway.example.test',
        body: { capability: 'research_topic', input: { topic: 'Public advisories' } },
        connectionId: 'connection_123',
        maxAttempts: 2,
        requestFn: async () => {
          requestCount += 1;
          return authenticationFailure;
        },
        delayFn: async () => {
          delayCount += 1;
        },
        runtimeMode: REMOTE_LIVE_AGENT_MODE,
      }),
    (error) => error.applicationErrorCode === 'RUNTIME_AUTHENTICATION_FAILED',
  );

  assert.equal(retryableGatewayProviderFailure(authenticationFailure), false);
  assert.equal(requestCount, 1);
  assert.equal(delayCount, 0);
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
