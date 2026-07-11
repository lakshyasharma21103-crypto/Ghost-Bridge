const assert = require('node:assert/strict');
const test = require('node:test');
const AgentPassport = require('../models/AgentPassport');
const AuditLog = require('../models/AuditLog');
const Capability = require('../models/Capability');
const PassportInstallKey = require('../models/PassportInstallKey');
const { env } = require('../config/env');
const { decryptPayload, verifyKey } = require('../utils/crypto');
const safeFetchUtility = require('../utils/safeFetch');
const { validateAgentPassportV1 } = require('../services/passportValidator');
const {
  buildExternalAgentPassport,
  checkExternalAgentHealth,
  issueExternalAgentInstallKey,
} = require('../services/externalAgentSandboxService');

function patch(object, key, value, patches) {
  patches.push([object, key, object[key]]);
  object[key] = value;
}

function restore(patches) {
  for (const [object, key, value] of patches.reverse()) {
    object[key] = value;
  }
}

function configureExternalRuntime(
  patches,
  runtimeToken = 'external_runtime_secret_0123456789_abcdefghijk',
) {
  patch(env, 'NODE_ENV', 'development', patches);
  patch(env, 'EXTERNAL_TEST_AGENT_BASE_URL', 'http://127.0.0.1:5002', patches);
  patch(env, 'EXTERNAL_TEST_AGENT_RUNTIME_TOKEN', runtimeToken, patches);
  patch(env, 'ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV', true, patches);
  return runtimeToken;
}

test('external test passport matches the authenticated runtime contract and contains no secret', () => {
  const patches = [];
  const runtimeToken = configureExternalRuntime(patches);

  try {
    const passport = buildExternalAgentPassport();
    const validation = validateAgentPassportV1(passport);

    assert.equal(validation.valid, true);
    assert.equal(passport.agent.name, 'External Research Agent');
    assert.equal(passport.auth.type, 'bearer_token');
    assert.equal(passport.auth.header, 'Authorization');
    assert.equal(passport.auth.scheme, 'Bearer');
    assert.equal(passport.runtime.endpoint, 'http://127.0.0.1:5002/v1/research/invoke');
    assert.deepEqual(passport.install.supportedModes, ['delegated_runtime_access']);
    assert.equal(passport.capabilities[0].inputSchema.additionalProperties, false);
    assert.equal(JSON.stringify(passport).includes(runtimeToken), false);
  } finally {
    restore(patches);
  }
});

test('external install-key issuance encrypts the backend-only token and returns only safe fields', async () => {
  const patches = [];
  const runtimeToken = configureExternalRuntime(patches);
  const partner = {
    _id: 'partner_external_123',
    status: 'active',
    plan: 'developer',
  };
  let storedPassport;
  let storedInstallKey;
  const audits = [];

  patch(
    AgentPassport,
    'findOneAndUpdate',
    async (_filter, update) => {
      storedPassport = {
        _id: 'passport_external_123',
        ...update.$set,
      };
      return storedPassport;
    },
    patches,
  );
  patch(Capability, 'deleteMany', async () => ({ deletedCount: 0 }), patches);
  patch(Capability, 'insertMany', async (documents) => documents, patches);
  patch(
    AgentPassport,
    'findOne',
    async () => ({
      _id: 'passport_external_123',
      partnerId: partner._id,
      partnerAgentId: 'external_research_agent_001',
      status: 'valid',
      install: { supportedModes: ['delegated_runtime_access'] },
    }),
    patches,
  );
  patch(
    PassportInstallKey,
    'create',
    async (document) => {
      storedInstallKey = document;
      return { _id: 'install_external_123', ...document };
    },
    patches,
  );
  patch(
    AuditLog,
    'create',
    async (payload) => {
      audits.push(payload);
      return payload;
    },
    patches,
  );

  try {
    const result = await issueExternalAgentInstallKey(partner, 'req_external_test');
    const decryptedGrant = decryptPayload(storedInstallKey.encryptedRuntimeGrant);

    assert.deepEqual(Object.keys(result).sort(), ['agent', 'expiresAt', 'key', 'passportId']);
    assert.equal(result.passportId, 'passport_external_123');
    assert.equal(result.agent.name, 'External Research Agent');
    assert.equal(verifyKey(result.key, storedInstallKey.keyHash), true);
    assert.equal(JSON.stringify(storedInstallKey).includes(result.key), false);
    assert.equal(JSON.stringify(storedInstallKey).includes(runtimeToken), false);
    assert.equal(decryptedGrant.accessToken, runtimeToken);
    assert.equal(decryptedGrant.type, 'bearer_token');
    assert.equal(decryptedGrant.header, 'Authorization');
    assert.equal(decryptedGrant.scheme, 'Bearer');
    assert.equal(JSON.stringify(storedPassport).includes(runtimeToken), false);
    assert.equal(JSON.stringify(audits).includes(runtimeToken), false);
    assert.equal(JSON.stringify(result).includes(runtimeToken), false);
  } finally {
    restore(patches);
  }
});

test('external health check returns safe service identity without using the runtime token', async () => {
  const patches = [];
  const runtimeToken = configureExternalRuntime(patches);
  const partner = {
    _id: 'partner_external_123',
    status: 'active',
    plan: 'developer',
  };
  let outbound;
  patch(
    safeFetchUtility,
    'safeFetch',
    async (url, options) => {
      outbound = { url, options };
      return {
        ok: true,
        status: 200,
        bodyText: JSON.stringify({
          success: true,
          data: {
            service: 'external-research-agent',
            status: 'healthy',
            version: '1.0.0',
          },
        }),
      };
    },
    patches,
  );

  try {
    const result = await checkExternalAgentHealth(partner);
    assert.equal(outbound.url, 'http://127.0.0.1:5002/health');
    assert.equal(Object.hasOwn(outbound.options.headers, 'Authorization'), false);
    assert.equal(result.health.healthy, true);
    assert.equal(result.health.service, 'external-research-agent');
    assert.equal(JSON.stringify(result).includes(runtimeToken), false);
  } finally {
    restore(patches);
  }
});
