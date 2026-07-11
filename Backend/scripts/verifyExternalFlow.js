const crypto = require('node:crypto');
const http = require('node:http');
const { Writable } = require('node:stream');

const externalAgentPort = Number(process.env.EXTERNAL_FLOW_AGENT_PORT || 5002);
const gatewayPort = Number(process.env.EXTERNAL_FLOW_GATEWAY_PORT || 5014);
const runtimeToken = crypto.randomBytes(32).toString('base64url');

process.env.NODE_ENV = 'development';
process.env.PORT = String(gatewayPort);
process.env.EXTERNAL_TEST_AGENT_BASE_URL = `http://127.0.0.1:${externalAgentPort}`;
process.env.EXTERNAL_TEST_AGENT_RUNTIME_TOKEN = runtimeToken;
process.env.ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV = 'true';

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
const { createLogger: createExternalLogger } = require('../../external-agent/src/utils/logger');
const { start: startExternalAgent } = require('../../external-agent/src/server');

const WORKSPACE_ID = `workspace_external_flow_${Date.now()}`;
const USER_ID = `user_external_flow_${Date.now()}`;
const TOPIC = 'external authenticated agent interoperability';
const capturedGatewayLogs = [];
const capturedExternalLogs = [];
const capturedApiResponses = [];

class ExternalFlowVerificationError extends Error {}

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

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  capturedApiResponses.push(text);
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new ExternalFlowVerificationError(`${options.label || path} returned unreadable JSON.`);
  }
  return { response, body, text };
}

function success(result, label) {
  if (!result.response.ok || result.body?.success === false) {
    const code = result.body?.error?.code || `HTTP_${result.response.status}`;
    throw new ExternalFlowVerificationError(`${label} failed with ${code}.`);
  }
  return result.body.data;
}

async function verify() {
  const restoreGatewayLogger = captureGatewayLogger();
  let externalRuntime;
  let gatewayServer;

  try {
    await connectDatabase();
    if (databaseStatus() !== 'connected') {
      throw new ExternalFlowVerificationError(
        'MongoDB is unavailable. Configure Backend/.env before verification.',
      );
    }

    externalRuntime = await startExternalAgent({
      config: {
        port: externalAgentPort,
        nodeEnv: 'test',
        runtimeToken,
        allowedGatewayOrigins: [],
        requestTimeoutMs: 5_000,
        jsonBodyLimit: '32kb',
        rateLimitWindowMs: 60_000,
        rateLimitMax: 100,
      },
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
    report('external service', 'independent external-research-agent is healthy');

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
      }),
      'gateway invocation',
    );
    assert(invocation.status === 'completed', 'Gateway invocation did not complete.');
    assert(
      invocation.output?.runtime?.service === 'external-research-agent',
      'Invocation output did not prove external service origin.',
    );
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

    const persistedSurfaces = {
      passport: storedPassport,
      connection,
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
    report(
      'credential security',
      'token absent from metadata, responses, audits, invocations, and captured logs',
    );

    console.log('External authenticated Agent Passport flow verification completed successfully.');
  } finally {
    await close(gatewayServer);
    await externalRuntime?.shutdown('verification-complete');
    await disconnectDatabase().catch(() => undefined);
    restoreGatewayLogger();
  }
}

verify().catch((error) => {
  const message =
    error instanceof ExternalFlowVerificationError
      ? error.message
      : 'Unable to complete the external authenticated flow.';
  console.error(`FAIL external flow verification: ${message}`);
  process.exitCode = 1;
});
