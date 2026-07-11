const assert = require('node:assert/strict');
const test = require('node:test');
const AgentPassport = require('../models/AgentPassport');
const AuditLog = require('../models/AuditLog');
const Capability = require('../models/Capability');
const Partner = require('../models/Partner');
const PassportInstallKey = require('../models/PassportInstallKey');
const { verifyKey, decryptPayload } = require('../utils/crypto');
const { ErrorCodes } = require('../utils/errorCodes');
const { validateAgentPassportV1 } = require('../services/passportValidator');
const {
  buildDeveloperSandboxPassport,
  createSandboxPartner,
  createSandboxPassport,
  issueSandboxInstallKey,
} = require('../services/developerSandboxService');

function patch(object, key, value, patches) {
  patches.push([object, key, object[key]]);
  object[key] = value;
}

function restore(patches) {
  for (const [object, key, value] of patches.reverse()) {
    object[key] = value;
  }
}

test('Developer Sandbox passport is a valid no_auth_dev REST passport with research_topic', () => {
  const passport = buildDeveloperSandboxPassport();
  const validation = validateAgentPassportV1(passport);

  assert.equal(validation.valid, true);
  assert.equal(passport.agent.name, 'Research Test Agent');
  assert.equal(passport.auth.type, 'no_auth_dev');
  assert.equal(passport.runtime.type, 'rest');
  assert.equal(passport.capabilities[0].name, 'research_topic');
});

test('sandbox partner creation stores only an API key hash and returns the raw key once', async () => {
  const patches = [];
  let createdPartner;
  const audits = [];
  patch(Partner, 'findOne', () => ({ lean: async () => null }), patches);
  patch(Partner, 'create', async (document) => {
    createdPartner = { _id: 'partner_sandbox_123', ...document };
    return createdPartner;
  }, patches);
  patch(AuditLog, 'create', async (payload) => {
    audits.push(payload);
    return payload;
  }, patches);

  try {
    const result = await createSandboxPartner(
      { name: 'Developer Sandbox', slug: 'developer-sandbox-test' },
      'req_test',
    );

    assert.equal(result.partner.status, 'active');
    assert.equal(result.partner.plan, 'developer');
    assert.equal(result.shownOnlyOnce, true);
    assert.equal(JSON.stringify(createdPartner).includes(result.apiKey), false);
    assert.equal(verifyKey(result.apiKey, createdPartner.apiKeyHash), true);
    assert.equal(JSON.stringify(audits).includes(result.apiKey), false);
  } finally {
    restore(patches);
  }
});

test('existing sandbox partner keys are never recovered or regenerated', async () => {
  const patches = [];
  let createCalled = false;
  patch(Partner, 'findOne', () => ({
    lean: async () => ({ _id: 'partner_existing', slug: 'developer-sandbox' }),
  }), patches);
  patch(Partner, 'create', async () => {
    createCalled = true;
  }, patches);

  try {
    await assert.rejects(
      () => createSandboxPartner({ name: 'Developer Sandbox', slug: 'developer-sandbox' }, 'req_test'),
      (error) => {
        assert.equal(error.code, ErrorCodes.CONFLICT);
        assert.equal(
          error.message,
          'This seeded sandbox already exists. Enter the one-time Partner API key printed by npm run seed:sandbox to load it.',
        );
        assert.equal(JSON.stringify(error).includes('apiKeyHash'), false);
        return true;
      },
    );
    assert.equal(createCalled, false);
  } finally {
    restore(patches);
  }
});

test('sandbox creates the canonical passport and encrypted delegated install key', async () => {
  const patches = [];
  const audits = [];
  let createdInstallKey;
  let passportFindCalls = 0;
  let installPassportFilter;
  const partner = {
    _id: 'partner_sandbox_123',
    name: 'Developer Sandbox',
    slug: 'developer-sandbox',
    status: 'active',
    plan: 'developer',
  };
  patch(Partner, 'findOne', async () => partner, patches);
  patch(AgentPassport, 'findOneAndUpdate', async (_filter, update) => ({
    _id: 'passport_sandbox_123',
    status: update.$set.status,
    ...update.$set,
  }), patches);
  patch(Capability, 'deleteMany', async () => ({ deletedCount: 0 }), patches);
  patch(Capability, 'insertMany', async (documents) => documents, patches);
  patch(AgentPassport, 'findOne', async (filter) => {
    passportFindCalls += 1;
    if (passportFindCalls > 1) installPassportFilter = filter;
    return {
      _id: 'passport_sandbox_123',
      partnerId: partner._id,
      status: 'valid',
      install: { supportedModes: ['delegated_runtime_access', 'auth_required'] },
      ...(passportFindCalls === 1 ? {} : { partnerAgentId: 'developer_sandbox_research_test_agent' }),
    };
  }, patches);
  patch(PassportInstallKey, 'create', async (document) => {
    createdInstallKey = document;
    return { _id: 'install_key_sandbox_123', ...document };
  }, patches);
  patch(AuditLog, 'create', async (payload) => {
    audits.push(payload);
    return payload;
  }, patches);

  try {
    const passport = await createSandboxPassport(partner, partner._id, 'req_test');
    const key = await issueSandboxInstallKey(partner, passport.passportId, 'req_test');

    assert.equal(passport.status, 'valid');
    assert.equal(passport.capabilitiesCount, 1);
    assert.equal(installPassportFilter.partnerId, partner._id);
    assert.equal(key.shownOnlyOnce, true);
    assert.equal(verifyKey(key.key, createdInstallKey.keyHash), true);
    assert.equal(JSON.stringify(createdInstallKey).includes(key.key), false);
    assert.equal(JSON.stringify(createdInstallKey.encryptedRuntimeGrant).includes('sandbox_runtime_'), false);
    assert.match(decryptPayload(createdInstallKey.encryptedRuntimeGrant).accessToken, /^sandbox_runtime_/);
    assert.equal(JSON.stringify(audits).includes('sandbox_runtime_'), false);
  } finally {
    restore(patches);
  }
});

test('sandbox passport actions reject a key authenticated for a different partner', async () => {
  const partner = {
    _id: 'partner_sandbox_123',
    status: 'active',
    plan: 'developer',
  };

  await assert.rejects(
    () => createSandboxPassport(partner, 'partner_someone_else', 'req_test'),
    { code: ErrorCodes.FORBIDDEN },
  );
});
