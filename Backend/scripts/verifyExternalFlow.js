const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { Writable } = require('node:stream');
const dotenv = require('dotenv');

const externalAgentPort = Number(process.env.EXTERNAL_FLOW_AGENT_PORT || 5002);
const gatewayPort = Number(process.env.EXTERNAL_FLOW_GATEWAY_PORT || 5014);
const runtimeToken = crypto.randomBytes(32).toString('base64url');

process.env.NODE_ENV = 'development';
process.env.PORT = String(gatewayPort);
process.env.EXTERNAL_TEST_AGENT_BASE_URL = `http://127.0.0.1:${externalAgentPort}`;
process.env.EXTERNAL_TEST_AGENT_RUNTIME_TOKEN = runtimeToken;
process.env.ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV = 'true';
process.env.RUNTIME_INVOCATION_TIMEOUT_MS = '430000';

const requestedVerificationTimeoutMs = Number(process.env.EXTERNAL_FLOW_REQUEST_TIMEOUT_MS);
const VERIFICATION_REQUEST_TIMEOUT_MS = Number.isInteger(requestedVerificationTimeoutMs)
  ? requestedVerificationTimeoutMs
  : 410_000;
if (
  VERIFICATION_REQUEST_TIMEOUT_MS <= 390_000 ||
  VERIFICATION_REQUEST_TIMEOUT_MS >= Number(process.env.RUNTIME_INVOCATION_TIMEOUT_MS)
) {
  throw new Error(
    'EXTERNAL_FLOW_REQUEST_TIMEOUT_MS must exceed 390000 and be less than RUNTIME_INVOCATION_TIMEOUT_MS.',
  );
}

const { createApp } = require('../src/app');
const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const AgentPassport = require('../src/models/AgentPassport');
const AuditLog = require('../src/models/AuditLog');
const Credential = require('../src/models/Credential');
const Invocation = require('../src/models/Invocation');
const PassportConnection = require('../src/models/PassportConnection');
const PassportInstallKey = require('../src/models/PassportInstallKey');
const { decryptPayload, hashKey } = require('../src/utils/crypto');
const { logger: gatewayLogger } = require('../src/utils/logger');
const { redactString } = require('../src/utils/redact');
const { readEnvironment: readExternalEnvironment } = require('../../external-agent/src/config/env');
const { createLogger: createExternalLogger } = require('../../external-agent/src/utils/logger');
const { start: startExternalAgent } = require('../../external-agent/src/server');

const WORKSPACE_ID = `workspace_external_flow_${Date.now()}`;
const USER_ID = `user_external_flow_${Date.now()}`;
const capturedGatewayLogs = [];
const capturedExternalLogs = [];
const capturedApiResponses = [];
const SAFE_HEALTH_STATUSES = new Set(['ok', 'healthy', 'alive']);
const SAFE_READINESS_STATUSES = new Set(['ready', 'not_ready']);
const SAFE_PROVIDER_NAMES = new Set(['gemini', 'mock']);
const SAFE_LIFECYCLE_STATUSES = new Set(['starting', 'ready', 'draining', 'stopped']);
const SAFE_GEMINI_OPERATIONS = new Set(['grounded_research', 'structured_formatting']);
const SAFE_FINAL_PROVIDER_STATUSES = new Set([
  'ABORTED',
  'ALREADY_EXISTS',
  'CANCELLED',
  'DATA_LOSS',
  'DEADLINE_EXCEEDED',
  'FAILED_PRECONDITION',
  'INTERNAL',
  'INVALID_ARGUMENT',
  'LOCAL_DEADLINE_EXCEEDED',
  'NOT_FOUND',
  'OK',
  'OUT_OF_RANGE',
  'PERMISSION_DENIED',
  'RESOURCE_EXHAUSTED',
  'TRANSIENT_TRANSPORT_FAILURE',
  'UNAUTHENTICATED',
  'UNAVAILABLE',
  'UNIMPLEMENTED',
  'UNKNOWN',
]);
const SAFE_SOURCE_EXTRACTION_CODES = new Set([
  'GEMINI_GROUNDING_METADATA_MISSING',
  'GEMINI_SOURCE_PARSING_FAILED',
]);

function verificationResearchTopic(now = new Date()) {
  const currentDate = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const date = currentDate.toISOString().slice(0, 10);
  return (
    'Using current official web sources, identify the latest published release/version status ' +
    'and publication dates of the Model Context Protocol and Agent2Agent Protocol ' +
    `specifications as of ${date}`
  );
}

const TOPIC = verificationResearchTopic();

const VERIFICATION_STAGES = Object.freeze([
  'external_health',
  'external_readiness',
  'sandbox_partner',
  'passport_upsert',
  'install_key_issue',
  'install_key_resolution',
  'credential_verification',
  'gateway_invocation',
  'invocation_persistence',
  'audit_persistence',
  'key_reuse',
  'direct_runtime_authentication',
  'secret_scan',
]);

class ExternalFlowVerificationError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'ExternalFlowVerificationError';
    for (const field of [
      'stage',
      'httpStatus',
      'applicationErrorCode',
      'readinessStatus',
      'providerName',
      'draining',
      'sourceExtractionCode',
      'groundingMetadataPresent',
      'groundingChunkCount',
      'webSearchQueryCount',
      'researchAttemptCount',
      'researchAttemptDurationsMs',
      'fallbackResearchProfileUsed',
      'finalProviderStatus',
      'groundingMetadataCount',
      'requestId',
      'traceId',
      'durationMs',
      'operation',
      'timeoutReason',
      'configuredTimeoutMs',
      'connectionId',
    ]) {
      if (options[field] !== undefined) this[field] = options[field];
    }
  }
}

function safeCode(value) {
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,127}$/.test(value) ? value : undefined;
}

function safeIdentifier(value) {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9._-]{1,128}$/.test(value) ||
    /^agentpass_(?:install|partner)_/i.test(value)
  ) {
    return undefined;
  }
  return value;
}

function safeHealthStatus(value) {
  return SAFE_HEALTH_STATUSES.has(value) ? value : undefined;
}

function safeReadinessStatus(value) {
  return SAFE_READINESS_STATUSES.has(value) ? value : undefined;
}

function safeProviderName(value) {
  return SAFE_PROVIDER_NAMES.has(value) ? value : undefined;
}

function safeLifecycleStatus(value) {
  return SAFE_LIFECYCLE_STATUSES.has(value) ? value : undefined;
}

function safeSourceExtractionCode(value) {
  return SAFE_SOURCE_EXTRACTION_CODES.has(value) ? value : undefined;
}

function safeDiagnosticCount(value) {
  return Number.isInteger(value) && value >= 0 && value <= 1_000_000 ? value : undefined;
}

function safeGeminiOperation(value) {
  return SAFE_GEMINI_OPERATIONS.has(value) ? value : undefined;
}

function safeConfiguredTimeoutMs(value) {
  return Number.isInteger(value) && value >= 1_000 && value <= 600_000 ? value : undefined;
}

function safeAttemptDurations(value) {
  return Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 2 &&
    value.every((duration) => Number.isInteger(duration) && duration >= 0 && duration <= 600_000)
    ? value
    : undefined;
}

function safeFinalProviderStatus(value) {
  return SAFE_FINAL_PROVIDER_STATUSES.has(value) ? value : undefined;
}

function sourceExtractionDiagnostics(logChunks, identifiers = {}) {
  const records = (Array.isArray(logChunks) ? logChunks : [])
    .join('')
    .split(/\r?\n/)
    .filter(Boolean);

  for (let index = records.length - 1; index >= 0; index -= 1) {
    let record;
    try {
      record = JSON.parse(records[index]);
    } catch {
      continue;
    }
    if (!record || record.event !== 'gemini.source_extraction.failed') continue;
    if (identifiers.requestId && safeIdentifier(record.requestId) !== identifiers.requestId)
      continue;
    if (identifiers.traceId && safeIdentifier(record.traceId) !== identifiers.traceId) continue;

    return {
      sourceExtractionCode: safeSourceExtractionCode(record.internalCode),
      groundingMetadataPresent:
        typeof record.groundingMetadataPresent === 'boolean'
          ? record.groundingMetadataPresent
          : undefined,
      groundingChunkCount: safeDiagnosticCount(record.groundingChunkCount),
      webSearchQueryCount: safeDiagnosticCount(record.webSearchQueryCount),
    };
  }

  return {};
}

function errorField(error, field) {
  let current = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (current[field] !== undefined) return current[field];
    current = current.cause;
  }
  return undefined;
}

function wrapVerificationFailure(error, state, now = Date.now()) {
  const httpStatus = Number(errorField(error, 'httpStatus') ?? errorField(error, 'statusCode'));
  const applicationErrorCode = safeCode(
    errorField(error, 'applicationErrorCode') ?? errorField(error, 'code'),
  );
  const rawTimeoutReason =
    errorField(error, 'timeoutReason') ??
    errorField(error, 'reason') ??
    (applicationErrorCode === 'SAFE_FETCH_TIMEOUT' ? 'SAFE_FETCH_TIMEOUT' : undefined) ??
    (errorField(error, 'name') === 'AbortError' ? 'LOCAL_VERIFICATION_REQUEST_TIMEOUT' : undefined);
  const rawDraining = errorField(error, 'draining');
  const rawGroundingMetadataPresent = errorField(error, 'groundingMetadataPresent');

  return new ExternalFlowVerificationError(
    error instanceof ExternalFlowVerificationError && typeof error.message === 'string'
      ? error.message
      : 'External-flow verification failed.',
    {
      cause: error,
      stage: state.stage,
      httpStatus: Number.isInteger(httpStatus) ? httpStatus : undefined,
      applicationErrorCode,
      readinessStatus: safeReadinessStatus(errorField(error, 'readinessStatus')),
      providerName: safeProviderName(errorField(error, 'providerName')),
      draining: typeof rawDraining === 'boolean' ? rawDraining : undefined,
      sourceExtractionCode: safeSourceExtractionCode(errorField(error, 'sourceExtractionCode')),
      groundingMetadataPresent:
        typeof rawGroundingMetadataPresent === 'boolean' ? rawGroundingMetadataPresent : undefined,
      groundingChunkCount: safeDiagnosticCount(errorField(error, 'groundingChunkCount')),
      webSearchQueryCount: safeDiagnosticCount(errorField(error, 'webSearchQueryCount')),
      researchAttemptCount: safeDiagnosticCount(errorField(error, 'researchAttemptCount')),
      researchAttemptDurationsMs: safeAttemptDurations(
        errorField(error, 'researchAttemptDurationsMs'),
      ),
      fallbackResearchProfileUsed:
        typeof errorField(error, 'fallbackResearchProfileUsed') === 'boolean'
          ? errorField(error, 'fallbackResearchProfileUsed')
          : undefined,
      finalProviderStatus: safeFinalProviderStatus(errorField(error, 'finalProviderStatus')),
      groundingMetadataCount: safeDiagnosticCount(errorField(error, 'groundingMetadataCount')),
      requestId: safeIdentifier(errorField(error, 'requestId')),
      traceId: safeIdentifier(errorField(error, 'traceId')),
      durationMs: Math.max(0, now - state.stageStartedAt),
      operation: safeGeminiOperation(errorField(error, 'operation')),
      timeoutReason: safeCode(rawTimeoutReason),
      configuredTimeoutMs: safeConfiguredTimeoutMs(errorField(error, 'configuredTimeoutMs')),
      connectionId:
        safeIdentifier(errorField(error, 'connectionId')) ?? safeIdentifier(state.connectionId),
    },
  );
}

function formatVerificationFailure(error) {
  return [
    'FAIL external flow verification',
    `Failed stage: ${VERIFICATION_STAGES.includes(error.stage) ? error.stage : '[unavailable]'}`,
    `HTTP status: ${Number.isInteger(error.httpStatus) ? error.httpStatus : '[unavailable]'}`,
    `Application error code: ${safeCode(error.applicationErrorCode) || '[unavailable]'}`,
    `Readiness status: ${safeReadinessStatus(error.readinessStatus) || '[unavailable]'}`,
    `Provider: ${safeProviderName(error.providerName) || '[unavailable]'}`,
    `Draining: ${typeof error.draining === 'boolean' ? error.draining : '[unavailable]'}`,
    `Source extraction code: ${safeSourceExtractionCode(error.sourceExtractionCode) || '[unavailable]'}`,
    `Grounding metadata present: ${
      typeof error.groundingMetadataPresent === 'boolean'
        ? error.groundingMetadataPresent
        : '[unavailable]'
    }`,
    `Grounding chunk count: ${safeDiagnosticCount(error.groundingChunkCount) ?? '[unavailable]'}`,
    `Web Search query count: ${safeDiagnosticCount(error.webSearchQueryCount) ?? '[unavailable]'}`,
    `Research attempt count: ${safeDiagnosticCount(error.researchAttemptCount) ?? '[unavailable]'}`,
    `Research attempt durations ms: ${
      safeAttemptDurations(error.researchAttemptDurationsMs)?.join(', ') || '[unavailable]'
    }`,
    `Fallback research profile used: ${
      typeof error.fallbackResearchProfileUsed === 'boolean'
        ? error.fallbackResearchProfileUsed
        : '[unavailable]'
    }`,
    `Final provider status: ${
      safeFinalProviderStatus(error.finalProviderStatus) || '[unavailable]'
    }`,
    `Genuine grounding metadata count: ${
      safeDiagnosticCount(error.groundingMetadataCount) ?? '[unavailable]'
    }`,
    `Safe message: ${redactString(String(error.message || 'External-flow verification failed.'))}`,
    `Request ID: ${safeIdentifier(error.requestId) || '[unavailable]'}`,
    `Trace ID: ${safeIdentifier(error.traceId) || '[unavailable]'}`,
    `Duration ms: ${Number.isInteger(error.durationMs) ? error.durationMs : '[unavailable]'}`,
    `Operation: ${safeGeminiOperation(error.operation) || '[unavailable]'}`,
    `Timeout reason: ${safeCode(error.timeoutReason) || '[unavailable]'}`,
    `Configured timeout ms: ${safeConfiguredTimeoutMs(error.configuredTimeoutMs) ?? '[unavailable]'}`,
    `Connection ID: ${safeIdentifier(error.connectionId) || '[unavailable]'}`,
  ].join('\n');
}

function beginStage(state, stage) {
  if (!VERIFICATION_STAGES.includes(stage)) throw new Error('Unknown verification stage.');
  state.stage = stage;
  state.stageStartedAt = Date.now();
}

function report(label, detail) {
  console.log(`PASS ${label}: ${detail}`);
}

function assert(condition, message) {
  if (!condition) throw new ExternalFlowVerificationError(message);
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeAllListeners('error');
      resolve();
    });
  });
}

function close(server) {
  if (!server?.listening) return Promise.resolve();
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
}

function captureGatewayLogger() {
  const original = {};
  for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) {
    original[level] = gatewayLogger[level];
    gatewayLogger[level] = (...args) => {
      capturedGatewayLogs.push(JSON.stringify(args));
    };
  }
  return () => {
    for (const [level, method] of Object.entries(original)) {
      gatewayLogger[level] = method;
    }
  };
}

function externalLogger() {
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      capturedExternalLogs.push(chunk.toString());
      callback();
    },
  });
  return createExternalLogger({ destination, base: null });
}

function externalAgentConfig() {
  const envPath = path.resolve(__dirname, '../../external-agent/.env');
  const local = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};
  const overrides = {};
  for (const name of [
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'GEMINI_WEB_SEARCH_ENABLED',
    'GEMINI_RESEARCH_TIMEOUT_MS',
    'GEMINI_FORMATTING_TIMEOUT_MS',
    'GEMINI_RESEARCH_MAX_ATTEMPTS',
    'GEMINI_FORMATTING_MAX_ATTEMPTS',
    'GEMINI_REQUEST_TIMEOUT_MS',
    'GEMINI_RESEARCH_MAX_OUTPUT_TOKENS',
    'GEMINI_RESEARCH_FALLBACK_MAX_OUTPUT_TOKENS',
    'GEMINI_FORMATTING_MAX_OUTPUT_TOKENS',
    'GEMINI_MAX_OUTPUT_TOKENS',
    'GEMINI_MAX_SOURCES',
    'GEMINI_THINKING_LEVEL',
  ]) {
    if (process.env[name] !== undefined) overrides[name] = process.env[name];
  }

  return readExternalEnvironment({
    ...local,
    ...overrides,
    // This command is an explicitly billed live gate. Grounded research permits exactly one
    // application retry for the narrow transient policy enforced by GeminiProvider.
    GEMINI_RESEARCH_MAX_ATTEMPTS:
      process.env.EXTERNAL_FLOW_GEMINI_RESEARCH_MAX_ATTEMPTS ||
      overrides.GEMINI_RESEARCH_MAX_ATTEMPTS ||
      '2',
    PORT: String(externalAgentPort),
    NODE_ENV: 'development',
    EXTERNAL_AGENT_RUNTIME_TOKEN: runtimeToken,
    ALLOWED_GATEWAY_ORIGINS: '',
    REQUEST_TIMEOUT_MS: '390000',
    AI_PROVIDER: 'gemini',
  });
}

async function request(baseUrl, path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = Math.max(
    VERIFICATION_REQUEST_TIMEOUT_MS,
    Number(options.timeoutMs) || VERIFICATION_REQUEST_TIMEOUT_MS,
  );
  const timer = setTimeout(
    () => controller.abort(new DOMException('Verification request timed out', 'TimeoutError')),
    timeoutMs,
  );
  timer.unref?.();
  let response;
  try {
    response = await (options.fetchFn || fetch)(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    throw new ExternalFlowVerificationError('Verification HTTP request failed.', {
      cause: error,
      applicationErrorCode:
        error?.name === 'TimeoutError' ? 'VERIFICATION_REQUEST_TIMEOUT' : undefined,
      timeoutReason:
        error?.name === 'TimeoutError' ? 'LOCAL_VERIFICATION_REQUEST_TIMEOUT' : undefined,
      requestId: safeIdentifier(
        options.headers?.['X-Request-Id'] || options.headers?.['x-request-id'],
      ),
      traceId: safeIdentifier(options.headers?.['X-Trace-Id'] || options.headers?.['x-trace-id']),
      connectionId: options.connectionId,
    });
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text();
  capturedApiResponses.push(text);
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new ExternalFlowVerificationError(`${options.label || path} returned unreadable JSON.`, {
      cause: error,
      httpStatus: response.status,
      requestId: response.headers.get('x-request-id') || undefined,
      connectionId: options.connectionId,
    });
  }
  return { response, body, text };
}

function success(result, label, options = {}) {
  if (!result.response.ok || result.body?.success === false) {
    const code = result.body?.error?.code || `HTTP_${result.response.status}`;
    const identifiers = safeResponseIdentifiers(result);
    const sourceDiagnostics =
      code === 'GEMINI_SOURCE_EXTRACTION_FAILED'
        ? sourceExtractionDiagnostics(
            options.externalLogChunks ?? capturedExternalLogs,
            identifiers,
          )
        : {};
    const timeoutDiagnostics =
      code === 'GEMINI_REQUEST_TIMEOUT'
        ? {
            timeoutReason: safeCode(
              result.body?.error?.timeoutReason || result.body?.error?.reason,
            ),
            configuredTimeoutMs: safeConfiguredTimeoutMs(result.body?.error?.configuredTimeoutMs),
          }
        : {};
    throw new ExternalFlowVerificationError(`${label} failed.`, {
      httpStatus: result.response.status,
      applicationErrorCode: safeCode(code),
      ...identifiers,
      ...sourceDiagnostics,
      operation: safeGeminiOperation(result.body?.error?.operation),
      researchAttemptCount: safeDiagnosticCount(result.body?.error?.researchAttemptCount),
      researchAttemptDurationsMs: safeAttemptDurations(
        result.body?.error?.researchAttemptDurationsMs,
      ),
      fallbackResearchProfileUsed:
        typeof result.body?.error?.fallbackResearchProfileUsed === 'boolean'
          ? result.body.error.fallbackResearchProfileUsed
          : undefined,
      finalProviderStatus: safeFinalProviderStatus(result.body?.error?.finalProviderStatus),
      groundingMetadataCount: safeDiagnosticCount(result.body?.error?.groundingMetadataCount),
      ...timeoutDiagnostics,
      connectionId: options.connectionId,
    });
  }
  return result.body.data;
}

function safeResponseIdentifiers(result) {
  return {
    requestId: safeIdentifier(
      result?.body?.meta?.requestId ||
        result?.body?.error?.requestId ||
        result?.response?.headers?.get?.('x-request-id'),
    ),
    traceId: safeIdentifier(
      result?.body?.meta?.traceId ||
        result?.body?.error?.traceId ||
        result?.response?.headers?.get?.('x-trace-id'),
    ),
  };
}

function validateExternalHealth(result) {
  const identifiers = safeResponseIdentifiers(result);
  const health = result?.body?.data;
  const options = {
    httpStatus: Number.isInteger(result?.response?.status) ? result.response.status : undefined,
    applicationErrorCode: safeCode(result?.body?.error?.code),
    ...identifiers,
  };
  if (!result?.response?.ok || result?.body?.success === false) {
    throw new ExternalFlowVerificationError('External liveness check failed.', options);
  }
  if (health?.service !== 'external-research-agent') {
    throw new ExternalFlowVerificationError(
      'External health identified the wrong service.',
      options,
    );
  }
  if (!safeHealthStatus(health?.status)) {
    throw new ExternalFlowVerificationError(
      'External health did not confirm process liveness.',
      options,
    );
  }
  return health;
}

function readinessDiagnostics(result) {
  const readiness = result?.body?.data;
  const lifecycleStatus = safeLifecycleStatus(readiness?.lifecycle?.status);
  return {
    httpStatus: Number.isInteger(result?.response?.status) ? result.response.status : undefined,
    applicationErrorCode: safeCode(result?.body?.error?.code),
    readinessStatus: safeReadinessStatus(readiness?.status),
    providerName: safeProviderName(readiness?.ai?.provider),
    draining: lifecycleStatus ? lifecycleStatus === 'draining' : undefined,
    ...safeResponseIdentifiers(result),
  };
}

function validateExternalReadiness(result) {
  const readiness = result?.body?.data;
  const diagnostics = readinessDiagnostics(result);
  const fail = (message) => {
    throw new ExternalFlowVerificationError(message, diagnostics);
  };
  if (!result?.response?.ok || result?.body?.success === false) {
    fail('External service is not ready.');
  }
  if (readiness?.service !== 'external-research-agent') {
    fail('External readiness identified the wrong service.');
  }
  if (readiness?.status !== 'ready') {
    fail('External readiness did not confirm the service is ready.');
  }
  if (readiness?.lifecycle?.status !== 'ready') {
    fail('External readiness did not confirm that the service is accepting work.');
  }
  if (readiness?.ai?.provider !== 'gemini') {
    fail('External readiness did not identify Gemini.');
  }
  if (readiness?.ai?.configured !== true) {
    fail('External Gemini provider configuration is unavailable.');
  }
  if (readiness?.runtimeAuthentication?.configured !== true) {
    fail('External runtime authentication configuration is unavailable.');
  }
  return readiness;
}

async function verifyExternalStartup(externalBaseUrl, state, options = {}) {
  const requestFn = options.requestFn || request;
  const reportFn = options.reportFn || report;
  beginStage(state, 'external_health');
  validateExternalHealth(await requestFn(externalBaseUrl, '/health', { label: 'external health' }));
  reportFn('external liveness', 'independent research-agent process is alive');

  beginStage(state, 'external_readiness');
  validateExternalReadiness(
    await requestFn(externalBaseUrl, '/ready', { label: 'external readiness' }),
  );
  reportFn(
    'external readiness',
    'Gemini and runtime authentication are configured without a provider request',
  );
}

async function verify() {
  const restoreGatewayLogger = captureGatewayLogger();
  const state = {
    stage: 'external_health',
    stageStartedAt: Date.now(),
    connectionId: undefined,
  };
  let externalRuntime;
  let gatewayServer;
  let geminiApiKey;
  let verificationFailure;

  try {
    await connectDatabase();
    if (databaseStatus() !== 'connected') {
      throw new ExternalFlowVerificationError(
        'MongoDB is unavailable. Configure Backend/.env before verification.',
      );
    }

    const agentConfig = externalAgentConfig();
    geminiApiKey = agentConfig.gemini.apiKey;
    externalRuntime = await startExternalAgent({
      config: agentConfig,
      host: '127.0.0.1',
      logger: externalLogger(),
    });
    gatewayServer = http.createServer(createApp());
    await listen(gatewayServer, gatewayPort);

    const externalBaseUrl = `http://127.0.0.1:${externalAgentPort}`;
    const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}/api/v1`;

    await verifyExternalStartup(externalBaseUrl, state);

    beginStage(state, 'sandbox_partner');
    const partner = success(
      await request(gatewayBaseUrl, '/developer-sandbox/partners', {
        method: 'POST',
        body: {
          name: 'External Flow Verification',
          slug: `external-flow-${Date.now()}`,
        },
        label: 'sandbox partner creation',
      }),
      'sandbox partner creation',
    );
    const partnerHeaders = { 'X-Partner-Api-Key': partner.apiKey };
    report('sandbox partner', 'created with one-time Partner API key');

    beginStage(state, 'passport_upsert');
    const passport = success(
      await request(gatewayBaseUrl, '/developer-sandbox/external-agent/passport', {
        method: 'POST',
        headers: partnerHeaders,
        body: {},
        label: 'external passport upsert',
      }),
      'external passport upsert',
    );
    assert(passport.status === 'valid', 'External Agent Passport is not valid.');
    assert(
      passport.runtime.endpoint === `${externalBaseUrl}/v1/research/invoke`,
      'Passport runtime does not belong to the independent external service.',
    );
    assert(
      !passport.runtime.endpoint.includes('/api/v1/demo/'),
      'Passport still points to the gateway mock route.',
    );
    report('external passport', 'valid passport points to independent authenticated runtime');

    beginStage(state, 'install_key_issue');
    const issued = success(
      await request(gatewayBaseUrl, '/developer-sandbox/external-agent/install-key', {
        method: 'POST',
        headers: partnerHeaders,
        body: {},
        label: 'external install-key issuance',
      }),
      'external install-key issuance',
    );
    const storedKey = await PassportInstallKey.findOne({ keyHash: hashKey(issued.key) }).lean();
    assert(storedKey?.status === 'active', 'Install key was not persisted as active.');
    assert(!JSON.stringify(storedKey).includes(issued.key), 'Raw install key was persisted.');
    assert(
      !JSON.stringify(storedKey).includes(runtimeToken),
      'Runtime token was persisted in plaintext on the install key.',
    );
    assert(
      decryptPayload(storedKey.encryptedRuntimeGrant).accessToken === runtimeToken,
      'Encrypted install grant does not contain the expected token.',
    );
    report('delegated install key', 'raw key returned once and runtime grant encrypted');

    beginStage(state, 'install_key_resolution');
    const resolved = success(
      await request(gatewayBaseUrl, '/passports/resolve', {
        method: 'POST',
        body: {
          key: issued.key,
          receivingWorkspaceId: WORKSPACE_ID,
          receivingUserId: USER_ID,
        },
        label: 'install-key resolution',
      }),
      'install-key resolution',
    );
    assert(
      resolved.status === 'connected',
      'Delegated install key did not create a connected connection.',
    );
    assert(
      resolved.auth.credentialConfigured === true,
      'Resolved connection has no delegated credential.',
    );
    state.connectionId = resolved.connectionId;

    beginStage(state, 'credential_verification');
    const connection = await PassportConnection.findById(resolved.connectionId).lean();
    const credential = await Credential.findById(connection.credentialId).lean();
    assert(
      credential?.type === 'delegated_runtime_access',
      'Connection credential type is incorrect.',
    );
    assert(
      !JSON.stringify(credential).includes(runtimeToken),
      'Credential contains plaintext runtime token.',
    );
    assert(
      decryptPayload(credential.encryptedPayload).accessToken === runtimeToken,
      'Connection credential did not preserve delegated access securely.',
    );
    assert(
      !JSON.stringify(connection.resolvedPassportSnapshot).includes(runtimeToken),
      'Connection snapshot contains runtime token.',
    );
    report('resolution', 'connected connection created with encrypted delegated credential');

    beginStage(state, 'gateway_invocation');
    const traceId = `trace_${crypto.randomUUID()}`;
    const requestId = `req_${crypto.randomUUID()}`;
    const invocationResult = await request(
      gatewayBaseUrl,
      `/connections/${resolved.connectionId}/invoke`,
      {
        method: 'POST',
        headers: { 'X-Trace-Id': traceId, 'X-Request-Id': requestId },
        body: {
          capability: 'research_topic',
          input: { topic: TOPIC },
          receivingWorkspaceId: WORKSPACE_ID,
          receivingUserId: USER_ID,
        },
        label: 'gateway invocation',
        timeoutMs: VERIFICATION_REQUEST_TIMEOUT_MS,
        connectionId: resolved.connectionId,
      },
    );
    const invocation = success(invocationResult, 'gateway invocation', {
      connectionId: resolved.connectionId,
    });
    assert(
      invocationResult.response.headers.get('x-trace-id') === traceId,
      'Gateway trace ID was not preserved.',
    );
    assert(
      invocationResult.response.headers.get('x-request-id') === requestId,
      'Gateway request ID was not preserved.',
    );
    assert(invocation.invocationId, 'Gateway invocation ID is missing.');
    assert(invocation.status === 'completed', 'Gateway invocation did not complete.');
    assert(
      invocation.output?.runtime?.service === 'external-research-agent',
      'Invocation output did not prove external service origin.',
    );
    assert(
      typeof invocation.output?.summary === 'string' && invocation.output.summary.trim(),
      'Invocation summary is empty.',
    );
    assert(Array.isArray(invocation.output?.sources), 'Invocation sources are absent.');
    assert(invocation.output.sources.length > 0, 'Invocation sources are empty.');
    assert(
      invocation.output.sources.every((source) => {
        try {
          return new URL(source).protocol === 'https:';
        } catch {
          return false;
        }
      }),
      'Invocation sources must contain only valid HTTPS URLs.',
    );
    assert(invocation.output.runtime.provider === 'gemini', 'Invocation provider is not Gemini.');
    assert(invocation.output.runtime.model, 'Invocation model is absent.');
    assert(
      invocation.output.runtime.webSearchUsed === true,
      'Invocation did not report Google Search use.',
    );
    if (invocation.output.runtime.sourceCount != null) {
      assert(
        Number.isInteger(invocation.output.runtime.sourceCount) &&
          invocation.output.runtime.sourceCount === invocation.output.sources.length,
        'Invocation runtime source count does not match returned sources.',
      );
    }
    const researchRuntime = invocation.output.runtime;
    assert(
      Number.isInteger(researchRuntime.researchAttemptCount) &&
        researchRuntime.researchAttemptCount >= 1 &&
        researchRuntime.researchAttemptCount <= 2,
      'Invocation research attempt count is invalid.',
    );
    assert(
      safeAttemptDurations(researchRuntime.researchAttemptDurationsMs)?.length ===
        researchRuntime.researchAttemptCount,
      'Invocation research attempt durations are invalid.',
    );
    assert(
      typeof researchRuntime.fallbackResearchProfileUsed === 'boolean' &&
        researchRuntime.fallbackResearchProfileUsed ===
          (researchRuntime.researchAttemptCount === 2),
      'Invocation fallback research profile reporting is invalid.',
    );
    assert(
      researchRuntime.finalProviderStatus === 'OK',
      'Invocation final Gemini provider status is not OK.',
    );
    assert(
      Number.isInteger(researchRuntime.groundingMetadataCount) &&
        researchRuntime.groundingMetadataCount > 0,
      'Invocation genuine grounding metadata count is absent.',
    );
    report('research attempt count', String(researchRuntime.researchAttemptCount));
    report('research attempt durations ms', researchRuntime.researchAttemptDurationsMs.join(', '));
    report('fallback research profile used', String(researchRuntime.fallbackResearchProfileUsed));
    report('final provider status', researchRuntime.finalProviderStatus);
    report('genuine grounding metadata count', String(researchRuntime.groundingMetadataCount));

    beginStage(state, 'invocation_persistence');
    const storedInvocation = await Invocation.findById(invocation.invocationId).lean();
    assert(storedInvocation?.status === 'completed', 'Completed invocation was not persisted.');
    assert(storedInvocation.traceId === traceId, 'Persisted invocation trace ID does not match.');
    assert(
      storedInvocation.requestId === requestId,
      'Persisted invocation request ID does not match.',
    );
    assert(
      !JSON.stringify(storedInvocation).includes(runtimeToken),
      'Invocation contains runtime token.',
    );
    report(
      'runtime gateway invocation',
      'bearer-authenticated external response completed and persisted',
    );
    assert(
      capturedGatewayLogs.join('').includes(traceId),
      'Gateway diagnostics do not contain the invocation trace ID.',
    );
    assert(
      capturedExternalLogs.join('').includes(traceId),
      'External-agent diagnostics do not contain the gateway trace ID.',
    );
    assert(
      capturedExternalLogs.join('').includes(invocation.invocationId),
      'External-agent diagnostics do not contain the invocation ID.',
    );
    report(
      'trace propagation',
      'traceId, requestId, and invocationId correlated across both services',
    );

    beginStage(state, 'audit_persistence');
    const storedPassport = await AgentPassport.findById(passport.passportId).lean();
    const auditLogs = await AuditLog.find({
      $or: [
        {
          entityId: { $in: [passport.passportId, resolved.connectionId, invocation.invocationId] },
        },
        { 'metadata.passportId': passport.passportId },
        { 'metadata.receivingWorkspaceId': WORKSPACE_ID },
      ],
    }).lean();
    assert(auditLogs.length >= 5, 'Expected external-flow audit logs were not persisted.');

    beginStage(state, 'key_reuse');
    const reused = await request(gatewayBaseUrl, '/passports/resolve', {
      method: 'POST',
      body: {
        key: issued.key,
        receivingWorkspaceId: WORKSPACE_ID,
        receivingUserId: USER_ID,
      },
      label: 'install-key reuse',
    });
    assert(reused.response.status === 409, 'Install key reuse did not return HTTP 409.');
    assert(
      reused.body?.error?.code === 'INSTALL_KEY_ALREADY_USED',
      'Install key reuse returned the wrong error code.',
    );
    report('one-time key', 'reuse rejected with INSTALL_KEY_ALREADY_USED');

    beginStage(state, 'direct_runtime_authentication');
    const direct = await request(externalBaseUrl, '/v1/research/invoke', {
      method: 'POST',
      body: { topic: TOPIC },
      label: 'direct unauthenticated invocation',
    });
    assert(
      direct.response.status === 401,
      'Direct invocation without bearer token did not return 401.',
    );
    assert(
      direct.body?.error?.code === 'RUNTIME_AUTHENTICATION_FAILED',
      'Direct authentication failure returned the wrong code.',
    );
    report('direct runtime authentication', 'missing bearer token rejected with 401');

    beginStage(state, 'secret_scan');
    const persistedSurfaces = {
      passport: storedPassport,
      installKey: storedKey,
      connection,
      credential,
      invocation: storedInvocation,
      audits: auditLogs,
    };
    assert(
      !JSON.stringify(persistedSurfaces).includes(runtimeToken),
      'Runtime token appeared in persisted metadata.',
    );
    assert(
      !capturedApiResponses.join('').includes(runtimeToken),
      'Runtime token appeared in an API response.',
    );
    assert(
      !capturedGatewayLogs.join('').includes(runtimeToken),
      'Runtime token appeared in gateway logs.',
    );
    assert(
      !capturedExternalLogs.join('').includes(runtimeToken),
      'Runtime token appeared in external-agent logs.',
    );
    if (geminiApiKey) {
      assert(
        !JSON.stringify(persistedSurfaces).includes(geminiApiKey) &&
          !capturedApiResponses.join('').includes(geminiApiKey) &&
          !capturedGatewayLogs.join('').includes(geminiApiKey) &&
          !capturedExternalLogs.join('').includes(geminiApiKey),
        'Gemini API key escaped the external provider configuration.',
      );
    }
    report(
      'credential security',
      'runtime and Gemini credentials absent from persistence, responses, and logs',
    );

    console.log('External authenticated Agent Passport flow verification completed successfully.');
  } catch (error) {
    verificationFailure = wrapVerificationFailure(error, state);
  } finally {
    for (const cleanup of [
      () => close(gatewayServer),
      () => externalRuntime?.shutdown('verification-complete'),
      () => disconnectDatabase(),
    ]) {
      try {
        await cleanup();
      } catch (error) {
        if (!verificationFailure) verificationFailure = wrapVerificationFailure(error, state);
      }
    }
    try {
      restoreGatewayLogger();
    } catch (error) {
      if (!verificationFailure) verificationFailure = wrapVerificationFailure(error, state);
    }
  }

  if (verificationFailure) throw verificationFailure;
}

if (require.main === module) {
  verify().catch((error) => {
    const diagnosticError =
      error instanceof ExternalFlowVerificationError
        ? error
        : wrapVerificationFailure(error, {
            stage: 'external_health',
            stageStartedAt: Date.now(),
          });
    console.error(formatVerificationFailure(diagnosticError));
    process.exitCode = 1;
  });
}

module.exports = {
  ExternalFlowVerificationError,
  VERIFICATION_REQUEST_TIMEOUT_MS,
  VERIFICATION_STAGES,
  beginStage,
  formatVerificationFailure,
  request,
  readinessDiagnostics,
  sourceExtractionDiagnostics,
  success,
  validateExternalHealth,
  validateExternalReadiness,
  verify,
  verifyExternalStartup,
  verificationResearchTopic,
  wrapVerificationFailure,
};
