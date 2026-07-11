const { env } = require('../config/env');
const Partner = require('../models/Partner');
const { generatePartnerApiKey, hashPartnerApiKey } = require('../utils/crypto');
const { developmentDemoRuntimeUrl } = require('../utils/safeFetch');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { upsertPartnerPassport } = require('./partnerService');

const FLOWAI_DEMO_PARTNER = {
  name: 'FlowAI Demo',
  slug: 'flowai-demo',
};

const FLOWAI_DEMO_PARTNER_AGENT_ID = 'flowai_research_agent_001';

function requireDevelopmentMode() {
  if (env.NODE_ENV !== 'development') {
    throw new AppError(
      403,
      ErrorCodes.FORBIDDEN,
      'The FlowAI demo can only be seeded in development mode.',
    );
  }
}

function buildFlowAiDemoPassport() {
  return {
    protocol: 'agent-passport.v1',
    agent: {
      id: 'research-agent',
      name: 'Research Agent',
      provider: 'FlowAI Demo',
      description: 'Searches a topic and returns a demo cited summary.',
      version: '1.0.0',
    },
    auth: {
      type: 'no_auth_dev',
    },
    runtime: {
      type: 'rest',
      endpoint: developmentDemoRuntimeUrl(),
      method: 'POST',
      inputField: 'topic',
      outputField: 'response',
      supportsStreaming: false,
      supportsLongRunningTasks: false,
    },
    install: {
      supportedModes: ['delegated_runtime_access', 'auth_required'],
      requiresUserConsent: false,
    },
    capabilities: [
      {
        name: 'research_topic',
        description: 'Researches a topic and returns summary and sources.',
        inputSchema: {
          type: 'object',
          properties: {
            topic: { type: 'string' },
          },
          required: ['topic'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            sources: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        riskLevel: 'low',
      },
    ],
  };
}

async function createOrRefreshFlowAiDemoPartner() {
  requireDevelopmentMode();
  const apiKey = generatePartnerApiKey();
  const partner = await Partner.findOneAndUpdate(
    { slug: FLOWAI_DEMO_PARTNER.slug },
    {
      $set: {
        ...FLOWAI_DEMO_PARTNER,
        status: 'active',
        apiKeyHash: hashPartnerApiKey(apiKey),
        plan: 'developer',
      },
      $setOnInsert: {
        allowedOrigins: [],
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  return { partner, apiKey };
}

async function seedFlowAiDemo(requestId = 'seed_flowai_demo') {
  const { partner, apiKey } = await createOrRefreshFlowAiDemoPartner();
  const passport = await upsertPartnerPassport(
    partner,
    {
      partnerAgentId: FLOWAI_DEMO_PARTNER_AGENT_ID,
      passport: buildFlowAiDemoPassport(),
    },
    requestId,
  );

  return {
    partner,
    apiKey,
    passport,
    runtimeEndpoint: developmentDemoRuntimeUrl(),
  };
}

module.exports = {
  FLOWAI_DEMO_PARTNER,
  FLOWAI_DEMO_PARTNER_AGENT_ID,
  buildFlowAiDemoPassport,
  createOrRefreshFlowAiDemoPartner,
  seedFlowAiDemo,
};
