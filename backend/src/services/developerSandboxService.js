const crypto = require('node:crypto');
const AgentPassport = require('../models/AgentPassport');
const Partner = require('../models/Partner');
const Workspace = require('../models/Workspace');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { generatePartnerApiKey, hashPartnerApiKey } = require('../utils/crypto');
const { developmentDemoRuntimeUrl } = require('../utils/safeFetch');
const { createAuditLog } = require('./auditService');
const { issueInstallKey, upsertPartnerPassport } = require('./partnerService');

const DEFAULT_SANDBOX_PARTNER = {
  name: 'Developer Sandbox',
  slug: 'developer-sandbox',
};

const SANDBOX_PARTNER_AGENT_ID = 'developer_sandbox_research_test_agent';
const SANDBOX_WORKSPACE = {
  externalWorkspaceId: 'workspace_developer_sandbox',
  name: 'Developer Sandbox Workspace',
  slug: 'developer-sandbox',
};
const SANDBOX_KEY_TTL_MINUTES = 15;
const SANDBOX_RUNTIME_GRANT_TTL_MINUTES = 30;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function requireDevelopmentMode() {
  if (env.NODE_ENV !== 'development') {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Route not found.');
  }
}

function requireText(value, path, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path, message: `${path} is required.` },
    ]);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path, message: `${path} must be at most ${maxLength} characters.` },
    ]);
  }
  return normalized;
}

function normalizePartnerInput(input = {}) {
  const name = requireText(input.name || DEFAULT_SANDBOX_PARTNER.name, 'name', 120);
  const slug = requireText(input.slug || DEFAULT_SANDBOX_PARTNER.slug, 'slug', 80).toLowerCase();
  if (!SLUG_PATTERN.test(slug)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      {
        path: 'slug',
        message: 'slug must contain lowercase letters, digits, and single hyphens only.',
      },
    ]);
  }
  return { name, slug };
}

function serializeSandboxPartner(partner) {
  return {
    id: idOf(partner),
    name: partner.name,
    slug: partner.slug,
    status: partner.status,
    plan: partner.plan,
    createdAt: partner.createdAt,
  };
}

function serializeSandboxWorkspace(workspace) {
  return {
    externalWorkspaceId: workspace.externalWorkspaceId,
    name: workspace.name,
    status: workspace.status,
    environment: workspace.environment,
  };
}

async function createOrRefreshSandboxWorkspace(partner) {
  return Workspace.findOneAndUpdate(
    {
      partnerId: partner._id,
      externalWorkspaceId: SANDBOX_WORKSPACE.externalWorkspaceId,
    },
    {
      $set: {
        ...SANDBOX_WORKSPACE,
        organizationId: partner._id,
        status: 'active',
        environment: 'DEVELOPMENT',
        productionApproved: false,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

function buildDeveloperSandboxPassport() {
  return {
    protocol: 'agent-passport.v1',
    agent: {
      id: 'research-test-agent',
      name: 'Research Test Agent',
      provider: 'Developer Sandbox',
      description: 'Returns a local mock research summary for development testing.',
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
        description: 'Researches a topic and returns a development summary with sources.',
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

async function createSandboxPartner(input, requestId) {
  requireDevelopmentMode();
  const { name, slug } = normalizePartnerInput(input);
  const existing = await Partner.findOne({ slug }).lean();
  if (existing) {
    const isSeededSandbox = slug === DEFAULT_SANDBOX_PARTNER.slug;
    throw new AppError(
      409,
      ErrorCodes.CONFLICT,
      isSeededSandbox
        ? 'This seeded sandbox already exists. Enter the one-time Partner API key printed by npm run seed:sandbox to load it.'
        : 'A sandbox partner with this slug already exists.',
      [
        {
          path: 'slug',
          message: isSeededSandbox
            ? 'Load the existing seeded sandbox with its Partner API key.'
            : 'The sandbox slug is already in use.',
        },
      ],
    );
  }

  const apiKey = generatePartnerApiKey();
  const partner = await Partner.create({
    name,
    slug,
    status: 'active',
    plan: 'developer',
    apiKeyHash: hashPartnerApiKey(apiKey),
    allowedOrigins: [],
  });
  const workspace = await createOrRefreshSandboxWorkspace(partner);
  await createAuditLog(
    'system',
    'developer-sandbox',
    'sandbox_partner.created',
    'Partner',
    idOf(partner),
    { name: partner.name, slug: partner.slug, plan: partner.plan },
    requestId,
  );

  return {
    partner: serializeSandboxPartner(partner),
    workspace: serializeSandboxWorkspace(workspace),
    apiKey,
    shownOnlyOnce: true,
  };
}

function requireSandboxPartnerAccess(partner, partnerId) {
  requireDevelopmentMode();
  if (
    !partner ||
    idOf(partner) !== String(partnerId) ||
    partner.status !== 'active' ||
    partner.plan !== 'developer'
  ) {
    throw new AppError(
      403,
      ErrorCodes.FORBIDDEN,
      'This Partner API key cannot access the requested sandbox.',
    );
  }
  return partner;
}

async function createSandboxPassport(authenticatedPartner, partnerId, requestId) {
  const partner = requireSandboxPartnerAccess(authenticatedPartner, partnerId);
  const result = await upsertPartnerPassport(
    partner,
    {
      partnerAgentId: SANDBOX_PARTNER_AGENT_ID,
      passport: buildDeveloperSandboxPassport(),
    },
    requestId,
  );

  await createAuditLog(
    'system',
    'developer-sandbox',
    'sandbox_passport.created',
    'AgentPassport',
    result.passportId,
    { partnerId: idOf(partner), partnerAgentId: SANDBOX_PARTNER_AGENT_ID },
    requestId,
  );
  return result;
}

function sandboxRuntimeGrant() {
  return {
    type: 'bearer_token',
    accessToken: `sandbox_runtime_${crypto.randomBytes(32).toString('base64url')}`,
    expiresAt: new Date(Date.now() + SANDBOX_RUNTIME_GRANT_TTL_MINUTES * 60 * 1000).toISOString(),
  };
}

async function issueSandboxInstallKey(authenticatedPartner, passportId, requestId) {
  const partner = requireSandboxPartnerAccess(authenticatedPartner, idOf(authenticatedPartner));
  const passport = await AgentPassport.findOne({
    _id: passportId,
    partnerId: partner._id,
    status: 'valid',
  });
  if (!passport) {
    throw new AppError(404, ErrorCodes.PASSPORT_NOT_FOUND, 'Sandbox Agent Passport was not found.');
  }
  const result = await issueInstallKey(
    partner,
    idOf(passport),
    {
      scope: 'invoke',
      installMode: 'delegated_runtime_access',
      expiresInMinutes: SANDBOX_KEY_TTL_MINUTES,
      runtimeGrant: sandboxRuntimeGrant(),
    },
    requestId,
  );

  await createAuditLog(
    'system',
    'developer-sandbox',
    'sandbox_install_key.issued',
    'AgentPassport',
    idOf(passport),
    { partnerId: idOf(partner), keyPrefix: result.keyPrefix, scope: 'invoke' },
    requestId,
  );
  return result;
}

async function seedDeveloperSandbox(requestId = 'seed_developer_sandbox') {
  requireDevelopmentMode();
  const existing = await Partner.findOne({ slug: DEFAULT_SANDBOX_PARTNER.slug });
  const created = !existing;
  const createdPartner = created
    ? await createSandboxPartner(DEFAULT_SANDBOX_PARTNER, requestId)
    : null;
  const partner = existing || (await Partner.findById(createdPartner.partner.id));
  if (!created && (partner.status !== 'active' || partner.plan !== 'developer')) {
    partner.status = 'active';
    partner.plan = 'developer';
    await partner.save();
  }
  const workspace = await createOrRefreshSandboxWorkspace(partner);
  const passport = await createSandboxPassport(partner, idOf(partner), requestId);

  return {
    created,
    partner: serializeSandboxPartner(partner),
    workspace: serializeSandboxWorkspace(workspace),
    passport,
    apiKey: createdPartner?.apiKey || null,
    runtimeEndpoint: developmentDemoRuntimeUrl(),
  };
}

module.exports = {
  DEFAULT_SANDBOX_PARTNER,
  SANDBOX_PARTNER_AGENT_ID,
  SANDBOX_WORKSPACE,
  buildDeveloperSandboxPassport,
  createOrRefreshSandboxWorkspace,
  requireSandboxPartnerAccess,
  createSandboxPartner,
  createSandboxPassport,
  issueSandboxInstallKey,
  seedDeveloperSandbox,
};
