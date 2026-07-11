const assert = require('node:assert/strict');
const test = require('node:test');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const Partner = require('../models/Partner');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { generatePartnerApiKey, hashPartnerApiKey } = require('../utils/crypto');
const { ErrorCodes } = require('../utils/errorCodes');
const { listPartnerPassports } = require('../services/partnerService');

function runMiddleware(headers = {}) {
  return new Promise((resolve) => {
    const request = {
      header(name) {
        return headers[name] || headers[name.toLowerCase()];
      },
    };
    authenticatePartner(request, {}, (error) => resolve({ error, request }));
  });
}

test('partner auth rejects missing API key', async () => {
  const { error } = await runMiddleware();
  assert.equal(error.code, ErrorCodes.AUTHENTICATION_REQUIRED);
});

test('partner auth rejects invalid API key', async () => {
  const originalFind = Partner.find;
  Partner.find = () => ({
    select: () => ({
      lean: async () => [
        {
          _id: 'partner_123',
          status: 'active',
          apiKeyHash: hashPartnerApiKey(generatePartnerApiKey()),
        },
      ],
    }),
  });

  try {
    const { error } = await runMiddleware({ 'X-Partner-Api-Key': generatePartnerApiKey() });
    assert.equal(error.code, ErrorCodes.AUTHENTICATION_REQUIRED);
  } finally {
    Partner.find = originalFind;
  }
});

test('partner auth accepts a matching stored API key hash', async () => {
  const originalFind = Partner.find;
  const rawKey = generatePartnerApiKey();
  Partner.find = () => ({
    select: () => ({
      lean: async () => [
        {
          _id: 'partner_123',
          slug: 'flowai',
          status: 'active',
          apiKeyHash: hashPartnerApiKey(rawKey),
        },
      ],
    }),
  });

  try {
    const { error, request } = await runMiddleware({ 'X-Partner-Api-Key': rawKey });
    assert.equal(error, undefined);
    assert.equal(request.partner._id, 'partner_123');
  } finally {
    Partner.find = originalFind;
  }
});

test('a valid seeded partner key loads its safe identity and existing Research Test Agent passport', async () => {
  const rawKey = generatePartnerApiKey();
  const originalFindPartner = Partner.find;
  const originalFindPassports = AgentPassport.find;
  const originalAggregateCapabilities = Capability.aggregate;

  Partner.find = () => ({
    select: () => ({
      lean: async () => [{
        _id: 'partner_seeded',
        name: 'Developer Sandbox',
        slug: 'developer-sandbox',
        status: 'active',
        plan: 'developer',
        apiKeyHash: hashPartnerApiKey(rawKey),
      }],
    }),
  });
  AgentPassport.find = () => ({
    sort: () => ({
      lean: async () => [{
        _id: 'passport_seeded',
        partnerAgentId: 'developer_sandbox_research_test_agent',
        protocol: 'agent-passport.v1',
        agent: { name: 'Research Test Agent' },
        auth: { type: 'no_auth_dev' },
        runtime: { type: 'rest' },
        install: { supportedModes: ['delegated_runtime_access', 'auth_required'] },
        status: 'valid',
        validationErrors: [],
      }],
    }),
  });
  Capability.aggregate = async () => [{ _id: 'passport_seeded', count: 1 }];

  try {
    const { error, request } = await runMiddleware({ 'X-Partner-Api-Key': rawKey });
    assert.equal(error, undefined);

    const response = await listPartnerPassports(request.partner);
    assert.equal(response.partner.slug, 'developer-sandbox');
    assert.equal(response.items[0].partnerAgentId, 'developer_sandbox_research_test_agent');
    assert.equal(response.items[0].agent.name, 'Research Test Agent');
    assert.equal(response.items[0].status, 'valid');
    assert.equal(response.items[0].capabilitiesCount, 1);
    assert.equal(Object.hasOwn(response.partner, 'apiKeyHash'), false);
    assert.equal(JSON.stringify(response).includes(rawKey), false);
  } finally {
    Partner.find = originalFindPartner;
    AgentPassport.find = originalFindPassports;
    Capability.aggregate = originalAggregateCapabilities;
  }
});
