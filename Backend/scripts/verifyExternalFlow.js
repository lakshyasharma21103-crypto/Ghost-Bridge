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
process.env.RUNTIME_INVOCATION_TIMEOUT_MS = '330000';

const requestedVerificationTimeoutMs = Number(process.env.EXTERNAL_FLOW_REQUEST_TIMEOUT_MS);
const VERIFICATION_REQUEST_TIMEOUT_MS =
  Number.isInteger(requestedVerificationTimeoutMs) && requestedVerificationTimeoutMs >= 360_000
    ? requestedVerificationTimeoutMs
    : 360_000;

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
const TOPIC = 'external authenticated agent interoperability';
const capturedGatewayLogs = [];
const capturedExternalLogs = [];
const capturedApiResponses = [];

const VERIFICATION_STAGES = Object.freeze([
  'external_health',
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
      'requestId',
      'durationMs',
      'timeoutReason',
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

  return new ExternalFlowVerificationError(
    error instanceof ExternalFlowVerificationError && typeof error.message === 'string'
      ? error.message
      : 'External-flow verification failed.',
    {
      cause: error,
      stage: state.stage,
      httpStatus: Number.isInteger(httpStatus) ? httpStatus : undefined,
      applicationErrorCode,
      requestId: safeIdentifier(errorField(error, 'requestId')),
      durationMs: Math.max(0, now - state.stageStartedAt),
      timeoutReason: safeCode(rawTimeoutReason),
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
    `Safe message: ${redactString(String(error.message || 'External-flow verification failed.'))}`,
    `Request ID: ${safeIdentifier(error.requestId) || '[unavailable]'}`,
    `Duration ms: ${Number.isInteger(error.durationMs) ? error.durationMs : '[unavailable]'}`,
    `Timeout reason: ${safeCode(error.timeoutReason) || '[unavailable]'}`,
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
    'GEMINI_REQUEST_TIMEOUT_MS',
    'GEMINI_MAX_OUTPUT_TOKENS',
    'GEMINI_MAX_SOURCES',
    'GEMINI_THINKING_LEVEL',
  ]) {
    if (process.env[name] !== undefined) overrides[name] = process.env[name];
  }

  return readExternalEnvironment({
    ...local,
    ...overrides,
    PORT: String(externalAgentPort),
    NODE_ENV: 'development',
    EXTERNAL_AGENT_RUNTIME_TOKEN: runtimeToken,
    ALLOWED_GATEWAY_ORIGINS: '',
    REQUEST_TIMEOUT_MS: '300000',
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
    response = await fetch(`${baseUrl}${path}`, {
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
    throw new ExternalFlowVerificationError(`${label} failed.`, {
      httpStatus: result.response.status,
      applicationErrorCode: safeCode(code),
      requestId:
        result.body?.error?.requestId || result.response.headers.get('x-request-id') || undefined,
      timeoutReason: result.body?.error?.reason,
      connectionId: options.connectionId,
    });
  }
  return result.body.data;
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

    const health = success(
      await request(externalBaseUrl, '/health', { label: 'external health' }),
      'external health',
    );
    assert(
      health.service === 'external-research-agent',
      'External health identified the wrong service.',
    );
    assert(health.ai?.provider === 'gemini', 'External health did not identify Gemini.');
    assert(health.ai?.configured === true, 'External Gemini provider is not configured.');
    report('external service', 'independent Gemini research agent is healthy');

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
    const invocation = success(
      await request(gatewayBaseUrl, `/connections/${resolved.connectionId}/invoke`, {
        method: 'POST',
        body: {
          capability: 'research_topic',
          input: { topic: TOPIC },
          receivingWorkspaceId: WORKSPACE_ID,
          receivingUserId: USER_ID,
        },
        label: 'gateway invocation',
        timeoutMs: VERIFICATION_REQUEST_TIMEOUT_MS,
        connectionId: resolved.connectionId,
      }),
      'gateway invocation',
      { connectionId: resolved.connectionId },
    );
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

    beginStage(state, 'invocation_persistence');
    const storedInvocation = await Invocation.findById(invocation.invocationId).lean();
    assert(storedInvocation?.status === 'completed', 'Completed invocation was not persisted.');
    assert(
      !JSON.stringify(storedInvocation).includes(runtimeToken),
      'Invocation contains runtime token.',
    );
    report(
      'runtime gateway invocation',
      'bearer-authenticated external response completed and persisted',
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
  success,
  verify,
  wrapVerificationFailure,
};
