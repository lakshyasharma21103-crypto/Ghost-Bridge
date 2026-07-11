const assert = require('node:assert/strict');
const test = require('node:test');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const PassportInstallKey = require('../models/PassportInstallKey');
const PassportConnection = require('../models/PassportConnection');
const Credential = require('../models/Credential');
const AuditLog = require('../models/AuditLog');
const safeFetchUtility = require('../utils/safeFetch');
const {
  generateInstallKey,
  hashKey,
  encryptPayload,
  decryptPayload,
} = require('../utils/crypto');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  resolveInstallKey,
  storeConnectionCredential,
  checkConnectionHealth,
} = require('../services/connectionService');

function patch(object, key, value, patches) {
  patches.push([object, key, object[key]]);
  object[key] = value;
}

function restore(patches) {
  for (const [object, key, value] of patches.reverse()) {
    object[key] = value;
  }
}

function identity() {
  return {
    receivingWorkspaceId: 'workspace_123',
    receivingUserId: 'user_123',
  };
}

function passport(status = 'valid') {
  return {
    _id: 'passport_123',
    partnerId: 'partner_123',
    protocol: 'agent-passport.v1',
    status,
    agent: {
      id: 'research-agent',
      name: 'Research Agent',
      provider: 'FlowAI',
      description: 'Searches the web and returns cited summaries.',
      version: '1.0.0',
    },
    auth: {
      type: 'api_key',
      header: 'Authorization',
      scheme: 'Bearer',
      scopes: ['agent.invoke'],
    },
    runtime: {
      type: 'rest',
      endpoint: 'https://example.com/api/agent/run',
      method: 'POST',
      inputField: 'instruction',
      outputField: 'response',
      supportsStreaming: false,
      supportsLongRunningTasks: false,
    },
    health: { endpoint: 'https://example.com/health' },
  };
}

function capabilitiesQuery() {
  return {
    sort: () => ({
      lean: async () => [
        {
          _id: 'capability_123',
          name: 'research_topic',
          description: 'Researches a topic and returns cited summaries.',
          inputSchema: { type: 'object', properties: { topic: { type: 'string' } } },
          outputSchema: { type: 'object', properties: { summary: { type: 'string' } } },
          riskLevel: 'low',
        },
      ],
    }),
  };
}

function activeInstallKey(rawKey, overrides = {}) {
  return {
    _id: 'install_key_123',
    passportId: 'passport_123',
    keyHash: hashKey(rawKey),
    keyPrefix: rawKey.slice(0, 'agentpass_install_'.length + 8),
    status: 'active',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    scope: 'invoke',
    installMode: 'auth_required',
    ...overrides,
  };
}

function connectionDocument(doc) {
  return {
    _id: 'connection_123',
    createdAt: new Date('2030-01-01T00:00:00.000Z'),
    updatedAt: new Date('2030-01-01T00:00:00.000Z'),
    ...doc,
    async save() {
      return this;
    },
  };
}

test('delegated install key is consumed once and creates an encrypted connected credential', async () => {
  const patches = [];
  const audits = [];
  let createdConnection;
  let createdCredential;
  const rawKey = generateInstallKey();
  const runtimeGrant = {
    type: 'bearer_token',
    accessToken: 'partner-runtime-token',
    expiresAt: '2030-01-01T00:00:00.000Z',
  };
  const installKey = activeInstallKey(rawKey, {
    installMode: 'delegated_runtime_access',
    encryptedRuntimeGrant: encryptPayload(runtimeGrant),
    runtimeGrantExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
  });

  patch(PassportInstallKey, 'findOne', async () => installKey, patches);
  patch(PassportInstallKey, 'findOneAndUpdate', async (_filter, update) => {
    Object.assign(installKey, update.$set);
    return installKey;
  }, patches);
  patch(AgentPassport, 'findOne', async () => passport(), patches);
  patch(Capability, 'find', capabilitiesQuery, patches);
  patch(PassportConnection, 'create', async (doc) => {
    createdConnection = connectionDocument(doc);
    return createdConnection;
  }, patches);
  patch(Credential, 'create', async (doc) => {
    createdCredential = { _id: 'credential_123', ...doc };
    return createdCredential;
  }, patches);
  patch(AuditLog, 'create', async (payload) => {
    audits.push(payload);
    return payload;
  }, patches);

  try {
    const result = await resolveInstallKey({ key: rawKey, ...identity() }, 'req_test');

    assert.equal(result.status, 'connected');
    assert.equal(result.auth.type, 'delegated_runtime_access');
    assert.equal(result.capabilities.length, 1);
    assert.equal(result.keyConsumed, true);
    assert.equal(installKey.status, 'used');
    assert.equal(installKey.usedByWorkspaceId, 'workspace_123');
    assert.equal(createdConnection.credentialId, 'credential_123');
    assert.equal(createdCredential.type, 'delegated_runtime_access');
    assert.deepEqual(decryptPayload(createdCredential.encryptedPayload), runtimeGrant);
    assert.equal(JSON.stringify(createdCredential).includes('partner-runtime-token'), false);
    assert.equal(JSON.stringify(result).includes('partner-runtime-token'), false);
    assert.equal(JSON.stringify(audits).includes('partner-runtime-token'), false);
    assert.ok(audits.some((audit) => audit.action === 'install_key.consumed'));
    assert.ok(audits.some((audit) => audit.action === 'connection.created'));
  } finally {
    restore(patches);
  }
});

test('used, expired, and revoked install keys fail with structured error codes', async () => {
  const cases = [
    { status: 'used', code: ErrorCodes.INSTALL_KEY_ALREADY_USED },
    { status: 'revoked', code: ErrorCodes.INSTALL_KEY_REVOKED },
    { status: 'active', expiresAt: new Date(Date.now() - 1_000), code: ErrorCodes.INSTALL_KEY_EXPIRED },
  ];

  for (const item of cases) {
    const patches = [];
    const rawKey = generateInstallKey();
    const installKey = activeInstallKey(rawKey, item);
    patch(PassportInstallKey, 'findOne', async () => installKey, patches);
    patch(PassportInstallKey, 'updateOne', async () => ({ modifiedCount: 1 }), patches);
    patch(AuditLog, 'create', async (payload) => payload, patches);

    try {
      await assert.rejects(() => resolveInstallKey({ key: rawKey, ...identity() }, 'req_test'), {
        code: item.code,
      });
    } finally {
      restore(patches);
    }
  }
});

test('suspended passports cannot be resolved and leave the key active', async () => {
  const patches = [];
  const rawKey = generateInstallKey();
  const installKey = activeInstallKey(rawKey);

  patch(PassportInstallKey, 'findOne', async () => installKey, patches);
  patch(AgentPassport, 'findOne', async () => passport('suspended'), patches);
  patch(Capability, 'find', capabilitiesQuery, patches);
  patch(AuditLog, 'create', async (payload) => payload, patches);

  try {
    await assert.rejects(() => resolveInstallKey({ key: rawKey, ...identity() }, 'req_test'), {
      code: ErrorCodes.PASSPORT_UNAVAILABLE,
    });
    assert.equal(installKey.status, 'active');
  } finally {
    restore(patches);
  }
});

test('auth_required resolution creates a pending_auth connection without a credential', async () => {
  const patches = [];
  let createdConnection;
  let credentialCreated = false;
  const rawKey = generateInstallKey();
  const installKey = activeInstallKey(rawKey);

  patch(PassportInstallKey, 'findOne', async () => installKey, patches);
  patch(PassportInstallKey, 'findOneAndUpdate', async (_filter, update) => {
    Object.assign(installKey, update.$set);
    return installKey;
  }, patches);
  patch(AgentPassport, 'findOne', async () => passport(), patches);
  patch(Capability, 'find', capabilitiesQuery, patches);
  patch(PassportConnection, 'create', async (doc) => {
    createdConnection = connectionDocument(doc);
    return createdConnection;
  }, patches);
  patch(Credential, 'create', async () => {
    credentialCreated = true;
  }, patches);
  patch(AuditLog, 'create', async (payload) => payload, patches);

  try {
    const result = await resolveInstallKey({ key: rawKey, ...identity() }, 'req_test');
    assert.equal(result.status, 'pending_auth');
    assert.equal(result.auth.type, 'api_key');
    assert.equal(result.auth.credentialConfigured, false);
    assert.equal(createdConnection.credentialId, undefined);
    assert.equal(credentialCreated, false);
  } finally {
    restore(patches);
  }
});

test('a receiving platform can add an encrypted credential to a pending connection', async () => {
  const patches = [];
  const audits = [];
  let createdCredential;
  const connection = connectionDocument({
    passportId: 'passport_123',
    receivingWorkspaceId: 'workspace_123',
    receivingUserId: 'user_123',
    status: 'pending_auth',
    runtimeType: 'rest',
    runtimeEndpoint: 'https://example.com/api/agent/run',
    resolvedPassportSnapshot: {
      agent: { name: 'Research Agent', provider: 'FlowAI', description: 'Summary agent' },
      auth: { type: 'api_key', header: 'X-API-Key' },
      runtime: { type: 'rest' },
      capabilities: [],
      installation: { installMode: 'auth_required', scope: 'connect' },
    },
  });

  patch(PassportConnection, 'findOne', async () => connection, patches);
  patch(Credential, 'create', async (doc) => {
    createdCredential = { _id: 'credential_123', ...doc };
    return createdCredential;
  }, patches);
  patch(AuditLog, 'create', async (payload) => {
    audits.push(payload);
    return payload;
  }, patches);

  try {
    const result = await storeConnectionCredential(
      'connection_123',
      {
        ...identity(),
        type: 'api_key',
        credential: { apiKey: 'receiving-platform-api-key' },
      },
      'req_test',
    );

    assert.equal(result.status, 'connected');
    assert.equal(result.auth.type, 'api_key');
    assert.equal(result.auth.credentialConfigured, true);
    assert.equal(createdCredential.type, 'api_key');
    assert.equal(JSON.stringify(createdCredential).includes('receiving-platform-api-key'), false);
    assert.equal(JSON.stringify(result).includes('receiving-platform-api-key'), false);
    assert.equal(JSON.stringify(audits).includes('receiving-platform-api-key'), false);
  } finally {
    restore(patches);
  }
});

test('health checks use safeFetch and do not return the remote body or credentials', async () => {
  const patches = [];
  const connection = connectionDocument({
    receivingWorkspaceId: 'workspace_123',
    receivingUserId: 'user_123',
    status: 'connected',
    runtimeType: 'rest',
    runtimeEndpoint: 'https://example.com/api/agent/run',
    resolvedPassportSnapshot: {
      health: { endpoint: 'https://example.com/health' },
    },
  });
  let safeFetchOptions;

  patch(PassportConnection, 'findOne', async () => connection, patches);
  patch(safeFetchUtility, 'safeFetch', async (_url, options) => {
    safeFetchOptions = options;
    return { ok: true, status: 204, bodyText: 'private remote output' };
  }, patches);
  patch(AuditLog, 'create', async (payload) => payload, patches);

  try {
    const result = await checkConnectionHealth('connection_123', identity(), 'req_test');
    assert.equal(result.health.healthy, true);
    assert.equal(result.health.remoteStatus, 204);
    assert.equal(JSON.stringify(result).includes('private remote output'), false);
    assert.equal(safeFetchOptions.method, 'GET');
    assert.deepEqual(safeFetchOptions.headers, {});
    assert.equal(connection.lastHealthStatus, 'healthy');
  } finally {
    restore(patches);
  }
});

test('MCP connections without an explicit HTTP health endpoint do not fake a health success', async () => {
  const patches = [];
  const connection = connectionDocument({
    receivingWorkspaceId: 'workspace_123',
    receivingUserId: 'user_123',
    status: 'connected',
    runtimeType: 'mcp',
    runtimeEndpoint: 'https://example.com/mcp',
    resolvedPassportSnapshot: {},
  });

  patch(PassportConnection, 'findOne', async () => connection, patches);

  try {
    await assert.rejects(() => checkConnectionHealth('connection_123', identity(), 'req_test'), {
      code: ErrorCodes.ADAPTER_NOT_IMPLEMENTED,
    });
  } finally {
    restore(patches);
  }
});
