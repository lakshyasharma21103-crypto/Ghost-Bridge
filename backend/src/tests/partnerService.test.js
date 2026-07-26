const assert = require('node:assert/strict');
const test = require('node:test');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const PassportInstallKey = require('../models/PassportInstallKey');
const AuditLog = require('../models/AuditLog');
const {
  upsertPartnerPassport,
  listPartnerPassports,
  issueInstallKey,
  suspendPassport,
  revokeInstallKey,
} = require('../services/partnerService');
const { decryptPayload, verifyKey } = require('../utils/crypto');

const partner = {
  _id: 'partner_123',
  name: 'FlowAI',
  slug: 'flowai',
  status: 'active',
  plan: 'developer',
  apiKeyHash: 'stored-hash-must-not-be-returned',
};

function validPassport() {
  return {
    protocol: 'agent-passport.v1',
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
    install: {
      supportedModes: ['delegated_runtime_access', 'auth_required'],
      requiresUserConsent: true,
    },
    capabilities: [
      {
        name: 'research_topic',
        description: 'Researches a topic and returns a summary with sources.',
        inputSchema: { type: 'object' },
        outputSchema: { type: 'object' },
        riskLevel: 'low',
      },
    ],
  };
}

function restore(patches) {
  for (const [object, key, value] of patches.reverse()) {
    object[key] = value;
  }
}

function patch(object, key, value, patches) {
  patches.push([object, key, object[key]]);
  object[key] = value;
}

test('partner can create or update a valid passport and capabilities are stored', async () => {
  const patches = [];
  const audits = [];
  let storedPassport;
  let deletedFilter;
  let insertedCapabilities;

  patch(AgentPassport, 'findOneAndUpdate', async (_filter, update) => {
    storedPassport = {
      _id: 'passport_123',
      partnerAgentId: update.$set.partnerAgentId,
      status: update.$set.status,
      ...update.$set,
    };
    return storedPassport;
  }, patches);
  patch(Capability, 'deleteMany', async (filter) => {
    deletedFilter = filter;
    return { deletedCount: 1 };
  }, patches);
  patch(Capability, 'insertMany', async (docs) => {
    insertedCapabilities = docs;
    return docs.map((doc, index) => ({ _id: `capability_${index}`, ...doc }));
  }, patches);
  patch(AuditLog, 'create', async (payload) => {
    audits.push(payload);
    return payload;
  }, patches);

  try {
    const result = await upsertPartnerPassport(
      partner,
      { partnerAgentId: 'flowai_agent_123', passport: validPassport() },
      'req_test',
    );

    assert.equal(result.passportId, 'passport_123');
    assert.equal(result.status, 'valid');
    assert.equal(result.capabilitiesCount, 1);
    assert.deepEqual(result.validationErrors, []);
    assert.equal(deletedFilter.passportId, 'passport_123');
    assert.equal(insertedCapabilities[0].name, 'research_topic');
    assert.equal(audits[0].action, 'passport.upserted');
  } finally {
    restore(patches);
  }
});

test('partner can list passports with capability counts', async () => {
  const patches = [];

  patch(AgentPassport, 'find', () => ({
    sort: () => ({
      lean: async () => [
        {
          _id: 'passport_123',
          partnerAgentId: 'flowai_agent_123',
          protocol: 'agent-passport.v1',
          agent: { name: 'Research Agent' },
          runtime: { type: 'rest' },
          install: {},
          status: 'valid',
          validationErrors: [],
        },
      ],
    }),
  }), patches);
  patch(Capability, 'aggregate', async () => [{ _id: 'passport_123', count: 1 }], patches);

  try {
    const result = await listPartnerPassports(partner);
    assert.deepEqual(result.partner, {
      id: 'partner_123',
      name: 'FlowAI',
      slug: 'flowai',
      status: 'active',
      plan: 'developer',
    });
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].capabilitiesCount, 1);
    assert.equal(JSON.stringify(result).includes('stored-hash-must-not-be-returned'), false);
    assert.equal(Object.hasOwn(result.partner, 'apiKeyHash'), false);
    assert.equal(Object.hasOwn(result.partner, 'apiKey'), false);
  } finally {
    restore(patches);
  }
});

test('delegated install key stores only key hash and encrypted runtime grant', async () => {
  const patches = [];
  const audits = [];
  let createdInstallKey;

  patch(AgentPassport, 'findOne', async () => ({
    _id: 'passport_123',
    partnerId: partner._id,
    status: 'valid',
    install: { supportedModes: ['delegated_runtime_access', 'auth_required'] },
  }), patches);
  patch(PassportInstallKey, 'create', async (doc) => {
    createdInstallKey = doc;
    return { _id: 'key_123', ...doc };
  }, patches);
  patch(AuditLog, 'create', async (payload) => {
    audits.push(payload);
    return payload;
  }, patches);

  try {
    const runtimeGrant = {
      type: 'bearer_token',
      accessToken: 'partner_runtime_token_here',
      expiresAt: '2030-01-01T00:00:00.000Z',
    };
    const result = await issueInstallKey(
      partner,
      'passport_123',
      {
        scope: 'invoke',
        installMode: 'delegated_runtime_access',
        expiresInMinutes: 15,
        runtimeGrant,
      },
      'req_test',
    );

    assert.match(result.key, /^agentpass_install_/);
    assert.equal(result.shownOnlyOnce, true);
    assert.equal(createdInstallKey.keyHash.includes(result.key), false);
    assert.equal(verifyKey(result.key, createdInstallKey.keyHash), true);
    assert.deepEqual(decryptPayload(createdInstallKey.encryptedRuntimeGrant), runtimeGrant);
    assert.equal(JSON.stringify(createdInstallKey).includes('partner_runtime_token_here'), false);
    assert.equal(JSON.stringify(audits[0]).includes('partner_runtime_token_here'), false);
  } finally {
    restore(patches);
  }
});

test('auth_required install key works without runtime grant', async () => {
  const patches = [];
  let createdInstallKey;

  patch(AgentPassport, 'findOne', async () => ({
    _id: 'passport_123',
    partnerId: partner._id,
    status: 'valid',
    install: { supportedModes: ['delegated_runtime_access', 'auth_required'] },
  }), patches);
  patch(PassportInstallKey, 'create', async (doc) => {
    createdInstallKey = doc;
    return { _id: 'key_123', ...doc };
  }, patches);
  patch(AuditLog, 'create', async (payload) => payload, patches);

  try {
    const result = await issueInstallKey(
      partner,
      'passport_123',
      {
        scope: 'connect',
        installMode: 'auth_required',
        expiresInMinutes: 15,
      },
      'req_test',
    );

    assert.match(result.key, /^agentpass_install_/);
    assert.equal(createdInstallKey.installMode, 'auth_required');
    assert.equal(createdInstallKey.encryptedRuntimeGrant, undefined);
  } finally {
    restore(patches);
  }
});

test('passport and install key revocation work and create audit logs', async () => {
  const patches = [];
  const audits = [];
  let passportSaved = false;
  let keySaved = false;

  patch(AgentPassport, 'findOne', async () => ({
    _id: 'passport_123',
    partnerAgentId: 'flowai_agent_123',
    status: 'valid',
    async save() {
      passportSaved = true;
      return this;
    },
  }), patches);
  patch(PassportInstallKey, 'findOne', async () => ({
    _id: 'key_123',
    passportId: 'passport_123',
    keyPrefix: 'agentpass_install_abcd1234',
    status: 'active',
    async save() {
      keySaved = true;
      return this;
    },
  }), patches);
  patch(AuditLog, 'create', async (payload) => {
    audits.push(payload);
    return payload;
  }, patches);

  try {
    const passportResult = await suspendPassport(partner, 'passport_123', 'req_test');
    const keyResult = await revokeInstallKey(partner, 'key_123', 'req_test');

    assert.equal(passportResult.status, 'suspended');
    assert.equal(keyResult.status, 'revoked');
    assert.equal(passportSaved, true);
    assert.equal(keySaved, true);
    assert.ok(audits.some((audit) => audit.action === 'passport.suspended'));
    assert.ok(audits.some((audit) => audit.action === 'install_key.revoked'));
  } finally {
    restore(patches);
  }
});
