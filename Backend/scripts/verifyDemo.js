const http = require('node:http');
const assert = require('node:assert/strict');

process.env.PORT = process.env.DEMO_VERIFY_PORT || '5011';

const { env } = require('../src/config/env');
const { createApp } = require('../src/app');
const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const {
  createOrRefreshFlowAiDemoPartner,
  buildFlowAiDemoPassport,
  FLOWAI_DEMO_PARTNER_AGENT_ID,
} = require('../src/services/demoService');
const Partner = require('../src/models/Partner');
const PassportInstallKey = require('../src/models/PassportInstallKey');
const Credential = require('../src/models/Credential');
const Invocation = require('../src/models/Invocation');
const AuditLog = require('../src/models/AuditLog');
const { hashKey } = require('../src/utils/crypto');

const WORKSPACE_ID = 'workspace_flowai_demo';
const USER_ID = 'user_flowai_demo';
const TOPIC = 'remaining FIFA matches in the US';

class DemoVerificationError extends Error {}

function report(label, detail) {
  console.log(`PASS ${label}: ${detail}`);
}

function fail(message) {
  console.error(`FAIL demo verification: ${message}`);
  process.exitCode = 1;
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

function close(server) {
  if (!server?.listening) return Promise.resolve();
  return new Promise((resolve) => server.close(resolve));
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new DemoVerificationError(`${options.label || path} returned unreadable JSON.`);
  }
  return { response, body };
}

function success(result, label) {
  if (!result.response.ok || result.body?.success !== true) {
    const code = result.body?.error?.code || `HTTP_${result.response.status}`;
    throw new DemoVerificationError(`${label} failed with ${code}.`);
  }
  return result.body.data;
}

function query(input) {
  return new URLSearchParams(input).toString();
}

async function verify() {
  if (env.NODE_ENV !== 'development') {
    throw new DemoVerificationError('NODE_ENV must be development.');
  }
  if (!env.MONGODB_URI) {
    throw new DemoVerificationError('MONGODB_URI must be configured before running verify:demo.');
  }

  await connectDatabase();
  if (databaseStatus() !== 'connected') {
    throw new DemoVerificationError(
      'MongoDB is unavailable. Check the local database configuration.',
    );
  }

  const server = http.createServer(createApp());
  try {
    await listen(server, env.PORT);
    const baseUrl = `http://127.0.0.1:${env.PORT}/api/v1`;
    const { partner, apiKey } = await createOrRefreshFlowAiDemoPartner();
    const partnerHeaders = { 'X-Partner-Api-Key': apiKey };
    const storedPartner = await Partner.findById(partner._id).lean();
    assert.equal(JSON.stringify(storedPartner).includes(apiKey), false);
    report('partner', 'FlowAI Demo partner is active and its API key is stored only as a hash');

    const passport = success(
      await request(baseUrl, '/partner/agents', {
        method: 'POST',
        headers: partnerHeaders,
        body: {
          partnerAgentId: FLOWAI_DEMO_PARTNER_AGENT_ID,
          passport: buildFlowAiDemoPassport(),
        },
        label: 'passport registration',
      }),
      'passport registration',
    );
    assert.equal(passport.status, 'valid');
    assert.equal(passport.capabilitiesCount, 1);
    report('passport', 'Agent Passport v1 validated and stored with research_topic capability');

    const issued = success(
      await request(baseUrl, `/partner/agents/${passport.passportId}/keys`, {
        method: 'POST',
        headers: partnerHeaders,
        body: {
          scope: 'invoke',
          installMode: 'delegated_runtime_access',
          expiresInMinutes: 15,
          runtimeGrant: {
            type: 'bearer_token',
            accessToken: 'flowai-demo-runtime-grant',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
        },
        label: 'install key issuance',
      }),
      'install key issuance',
    );
    assert.equal(issued.shownOnlyOnce, true);
    assert.match(issued.key, /^agentpass_install_[A-Za-z0-9_-]{32,}$/);
    report('install key', 'one-time invoke grant issued without persisting its raw value');

    const resolved = success(
      await request(baseUrl, '/passports/resolve', {
        method: 'POST',
        body: {
          key: issued.key,
          receivingWorkspaceId: WORKSPACE_ID,
          receivingUserId: USER_ID,
        },
        label: 'install key resolution',
      }),
      'install key resolution',
    );
    assert.equal(resolved.status, 'connected');
    assert.equal(resolved.keyConsumed, true);
    assert.equal(resolved.capabilities[0].name, 'research_topic');
    assert.equal(JSON.stringify(resolved).includes('flowai-demo-runtime-grant'), false);
    report('resolution', 'key consumed and connected runtime connection created');

    const invoked = success(
      await request(baseUrl, `/connections/${resolved.connectionId}/invoke`, {
        method: 'POST',
        body: {
          capability: 'research_topic',
          input: { topic: TOPIC },
          receivingWorkspaceId: WORKSPACE_ID,
          receivingUserId: USER_ID,
        },
        label: 'runtime invocation',
      }),
      'runtime invocation',
    );
    assert.equal(invoked.status, 'completed');
    assert.equal(invoked.output.summary, `Demo research result for ${TOPIC}`);
    report('invocation', 'REST adapter returned normalized mock research output');

    const identity = { receivingWorkspaceId: WORKSPACE_ID, receivingUserId: USER_ID };
    const invocationList = success(
      await request(baseUrl, `/invocations?${query(identity)}`, { label: 'invocation history' }),
      'invocation history',
    );
    assert.ok(invocationList.items.some((item) => item.invocationId === invoked.invocationId));

    const auditList = success(
      await request(baseUrl, `/audit-logs?${query(identity)}`, { label: 'audit history' }),
      'audit history',
    );
    assert.ok(auditList.items.some((item) => item.action === 'install_key.consumed'));
    assert.ok(auditList.items.some((item) => item.action === 'invocation.completed'));

    const operationsIdentity = { ...identity, window: '24h' };
    const operationsSummary = success(
      await request(baseUrl, `/operations/summary?${query(operationsIdentity)}`, {
        label: 'operations summary',
      }),
      'operations summary',
    );
    assert.equal(operationsSummary.readiness.status, 'ready');
    assert.ok(operationsSummary.passports.active >= 1);
    assert.ok(operationsSummary.connections.active >= 1);
    assert.ok(operationsSummary.invocations.successful >= 1);
    assert.ok(operationsSummary.installations.keysResolved >= 1);

    const operationsLatency = success(
      await request(baseUrl, `/operations/latency?${query(operationsIdentity)}`, {
        label: 'operations latency',
      }),
      'operations latency',
    );
    assert.ok(operationsLatency.overall.count >= 1);
    assert.ok(
      operationsLatency.stages.some((item) => item.stage === 'external_runtime_invocation'),
    );

    const operationsErrors = success(
      await request(baseUrl, `/operations/errors?${query(operationsIdentity)}`, {
        label: 'operations errors',
      }),
      'operations errors',
    );
    assert.ok(Array.isArray(operationsErrors.groups));

    const operationsFunnel = success(
      await request(baseUrl, `/operations/passport-funnel?${query(operationsIdentity)}`, {
        label: 'operations funnel',
      }),
      'operations funnel',
    );
    const funnelCounts = Object.fromEntries(
      operationsFunnel.steps.map((item) => [item.key, item.count]),
    );
    assert.ok(funnelCounts.keysResolved >= 1);
    assert.ok(funnelCounts.firstSuccessfulInvocation >= 1);

    const operationsAlerts = success(
      await request(baseUrl, `/operations/alerts?${query(identity)}`, {
        label: 'operations alerts',
      }),
      'operations alerts',
    );
    assert.ok(Array.isArray(operationsAlerts.items));
    assert.equal(
      JSON.stringify({
        operationsSummary,
        operationsLatency,
        operationsErrors,
        operationsFunnel,
        operationsAlerts,
      }).includes(TOPIC),
      false,
    );
    report('operations', 'workspace metrics, latency, funnel, errors, and alerts are tenant-safe');

    const [storedInvocation, storedCredential, storedKey] = await Promise.all([
      Invocation.findById(invoked.invocationId).lean(),
      Credential.findOne({ connectionId: resolved.connectionId }).lean(),
      PassportInstallKey.findOne({ keyHash: hashKey(issued.key) }).lean(),
    ]);
    assert.equal(storedInvocation?.status, 'completed');
    assert.ok(storedCredential?.encryptedPayload);
    assert.equal(JSON.stringify(storedCredential).includes('flowai-demo-runtime-grant'), false);
    assert.equal(storedKey?.status, 'used');
    assert.equal(JSON.stringify(storedKey).includes(issued.key), false);

    const persistedAudits = await AuditLog.find({
      $or: [
        { entityId: passport.passportId },
        { entityId: resolved.connectionId },
        { entityId: invoked.invocationId },
        { 'metadata.passportId': passport.passportId },
      ],
    })
      .select('action')
      .lean();
    const actions = new Set(persistedAudits.map((item) => item.action));
    assert.ok(actions.has('passport.upserted'));
    assert.ok(actions.has('install_key.issued'));
    assert.ok(actions.has('install_key.consumed'));
    assert.ok(actions.has('connection.created'));
    assert.ok(actions.has('invocation.completed'));
    report('persistence', 'invocation and redacted audit records are present');

    const reused = await request(baseUrl, '/passports/resolve', {
      method: 'POST',
      body: {
        key: issued.key,
        receivingWorkspaceId: WORKSPACE_ID,
        receivingUserId: USER_ID,
      },
      label: 'install key reuse',
    });
    assert.equal(reused.response.status, 409);
    assert.equal(reused.body?.error?.code, 'INSTALL_KEY_ALREADY_USED');
    report('key reuse protection', 'used install key was rejected with INSTALL_KEY_ALREADY_USED');

    console.log('Demo verification completed successfully.');
  } finally {
    await close(server);
  }
}

async function main() {
  try {
    await verify();
  } catch (error) {
    fail(
      error instanceof DemoVerificationError ? error.message : 'Unable to complete the demo flow.',
    );
  } finally {
    await disconnectDatabase().catch(() => undefined);
  }
}

void main();
