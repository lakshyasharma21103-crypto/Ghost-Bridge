const http = require('node:http');
const assert = require('node:assert/strict');

process.env.PORT = process.env.SANDBOX_VERIFY_PORT || '5013';

const { env } = require('../src/config/env');
const { createApp } = require('../src/app');
const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const Partner = require('../src/models/Partner');
const PassportInstallKey = require('../src/models/PassportInstallKey');
const Invocation = require('../src/models/Invocation');
const { hashKey } = require('../src/utils/crypto');

const WORKSPACE_ID = 'workspace_developer_sandbox';
const USER_ID = 'user_developer_sandbox';
const TOPIC = 'remaining FIFA matches in the US';

class SandboxVerificationError extends Error {}

function report(label, detail) {
  console.log(`PASS ${label}: ${detail}`);
}

function fail(message) {
  console.error(`FAIL sandbox verification: ${message}`);
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
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new SandboxVerificationError(`${options.label || path} returned unreadable JSON.`);
  }
  return { response, body };
}

function success(result, label) {
  if (!result.response.ok || result.body?.success !== true) {
    const code = result.body?.error?.code || `HTTP_${result.response.status}`;
    throw new SandboxVerificationError(`${label} failed with ${code}.`);
  }
  return result.body.data;
}

async function verify() {
  if (env.NODE_ENV !== 'development') {
    throw new SandboxVerificationError('NODE_ENV must be development.');
  }
  if (!env.MONGODB_URI) {
    throw new SandboxVerificationError('MONGODB_URI must be configured before running verify:sandbox.');
  }

  await connectDatabase();
  if (databaseStatus() !== 'connected') {
    throw new SandboxVerificationError('MongoDB is unavailable. Check the local database configuration.');
  }

  const server = http.createServer(createApp());
  try {
    await listen(server, env.PORT);
    const baseUrl = `http://127.0.0.1:${env.PORT}/api/v1`;
    const sandbox = success(
      await request(baseUrl, '/developer-sandbox/partners', {
        method: 'POST',
        body: {
          name: 'Developer Sandbox',
          slug: `developer-sandbox-verify-${Date.now()}`,
        },
        label: 'sandbox partner creation',
      }),
      'sandbox partner creation',
    );
    const storedPartner = await Partner.findById(sandbox.partner.id).lean();
    assert.equal(storedPartner.status, 'active');
    assert.equal(storedPartner.plan, 'developer');
    assert.equal(JSON.stringify(storedPartner).includes(sandbox.apiKey), false);
    report('sandbox partner', 'created with a hashed Partner API key');

    const partnerAuthHeaders = { 'X-Partner-Api-Key': sandbox.apiKey };
    const initiallyLoaded = success(
      await request(baseUrl, '/partner/agents', {
        headers: partnerAuthHeaders,
        label: 'sandbox load before passport creation',
      }),
      'sandbox load before passport creation',
    );
    assert.equal(initiallyLoaded.partner.id, sandbox.partner.id);
    assert.equal(initiallyLoaded.partner.slug, sandbox.partner.slug);
    assert.equal(initiallyLoaded.items.length, 0);
    assert.equal(Object.hasOwn(initiallyLoaded.partner, 'apiKeyHash'), false);
    assert.equal(JSON.stringify(initiallyLoaded).includes(sandbox.apiKey), false);
    report('sandbox load', 'Partner API key authenticated and returned only safe partner data');

    const passport = success(
      await request(baseUrl, `/developer-sandbox/partners/${sandbox.partner.id}/passport`, {
        method: 'POST',
        body: {},
        headers: partnerAuthHeaders,
        label: 'sandbox passport creation',
      }),
      'sandbox passport creation',
    );
    assert.equal(passport.status, 'valid');
    assert.equal(passport.capabilitiesCount, 1);
    report('test passport', 'Research Test Agent and research_topic capability created');

    const loadedWithPassport = success(
      await request(baseUrl, '/partner/agents', {
        headers: partnerAuthHeaders,
        label: 'sandbox load after passport creation',
      }),
      'sandbox load after passport creation',
    );
    const loadedPassport = loadedWithPassport.items.find(
      (item) => item.partnerAgentId === 'developer_sandbox_research_test_agent',
    );
    assert.equal(loadedPassport.id, passport.passportId);
    assert.equal(loadedPassport.agent.name, 'Research Test Agent');
    assert.equal(loadedPassport.status, 'valid');
    report('existing passport load', 'Research Test Agent loaded through the Partner API');

    const installKey = success(
      await request(baseUrl, `/developer-sandbox/passports/${passport.passportId}/keys`, {
        method: 'POST',
        body: {},
        headers: partnerAuthHeaders,
        label: 'sandbox install key issuance',
      }),
      'sandbox install key issuance',
    );
    assert.equal(installKey.shownOnlyOnce, true);
    const storedKey = await PassportInstallKey.findOne({ keyHash: hashKey(installKey.key) }).lean();
    assert.equal(storedKey.status, 'active');
    assert.equal(JSON.stringify(storedKey).includes(installKey.key), false);
    report('install key', 'issued once and stored only as a hash');

    const resolved = success(
      await request(baseUrl, '/passports/resolve', {
        method: 'POST',
        body: {
          key: installKey.key,
          receivingWorkspaceId: WORKSPACE_ID,
          receivingUserId: USER_ID,
        },
        label: 'sandbox key resolution',
      }),
      'sandbox key resolution',
    );
    assert.equal(resolved.status, 'connected');
    report('resolution', 'connected receiving-side runtime connection created');

    const invocation = success(
      await request(baseUrl, `/connections/${resolved.connectionId}/invoke`, {
        method: 'POST',
        body: {
          capability: 'research_topic',
          input: { topic: TOPIC },
          receivingWorkspaceId: WORKSPACE_ID,
          receivingUserId: USER_ID,
        },
        label: 'sandbox invocation',
      }),
      'sandbox invocation',
    );
    assert.equal(invocation.status, 'completed');
    assert.equal(invocation.output.summary, `Demo research result for ${TOPIC}`);
    assert.equal((await Invocation.findById(invocation.invocationId).lean()).status, 'completed');
    report('invocation', 'research_topic invoked through the REST Runtime Gateway');

    const reused = await request(baseUrl, '/passports/resolve', {
      method: 'POST',
      body: {
        key: installKey.key,
        receivingWorkspaceId: WORKSPACE_ID,
        receivingUserId: USER_ID,
      },
      label: 'sandbox key reuse',
    });
    assert.equal(reused.response.status, 409);
    assert.equal(reused.body?.error?.code, 'INSTALL_KEY_ALREADY_USED');
    report('key reuse protection', 'used install key rejected with INSTALL_KEY_ALREADY_USED');
    console.log('Sandbox verification completed successfully.');
  } finally {
    await close(server);
  }
}

async function main() {
  try {
    await verify();
  } catch (error) {
    fail(error instanceof SandboxVerificationError ? error.message : 'Unable to complete the sandbox flow.');
  } finally {
    await disconnectDatabase().catch(() => undefined);
  }
}

void main();
