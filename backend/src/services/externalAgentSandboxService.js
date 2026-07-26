const AgentPassport = require('../models/AgentPassport');
const PassportConnection = require('../models/PassportConnection');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const safeFetchUtility = require('../utils/safeFetch');
const { createAuditLog } = require('./auditService');
const { requireSandboxPartnerAccess } = require('./developerSandboxService');
const { issueInstallKey, upsertPartnerPassport } = require('./partnerService');

const EXTERNAL_AGENT_PARTNER_AGENT_ID = 'external_research_agent_001';
const EXTERNAL_AGENT_INSTALL_KEY_TTL_MINUTES = 15;

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function externalAgentUrls() {
  const baseUrl = safeFetchUtility.externalTestAgentBaseUrl();
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new AppError(
      503,
      ErrorCodes.SERVICE_UNAVAILABLE,
      'External agent base URL is not configured correctly.',
    );
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new AppError(
      503,
      ErrorCodes.SERVICE_UNAVAILABLE,
      'External agent base URL is not configured correctly.',
    );
  }

  return {
    baseUrl,
    healthUrl: safeFetchUtility.externalTestAgentUrl(safeFetchUtility.EXTERNAL_AGENT_HEALTH_PATH),
    runtimeUrl: safeFetchUtility.externalTestAgentUrl(safeFetchUtility.EXTERNAL_AGENT_RUNTIME_PATH),
  };
}

function externalRuntimeToken() {
  const token = String(env.EXTERNAL_TEST_AGENT_RUNTIME_TOKEN || '');
  if (token.length < 32 || /\s/.test(token)) {
    throw new AppError(
      503,
      ErrorCodes.SERVICE_UNAVAILABLE,
      'External agent delegated runtime access is not configured.',
    );
  }
  return token;
}

function runtimeTokenConfigured() {
  const token = String(env.EXTERNAL_TEST_AGENT_RUNTIME_TOKEN || '');
  return token.length >= 32 && !/\s/.test(token);
}

function buildExternalAgentPassport() {
  return {
    protocol: 'agent-passport.v1',
    agent: {
      id: 'external-research-agent',
      name: 'External Research Agent',
      provider: 'Developer Sandbox',
      description: 'An independently hosted authenticated research runtime.',
      version: '1.0.0',
    },
    auth: {
      type: 'bearer_token',
      header: 'Authorization',
      scheme: 'Bearer',
      scopes: ['agent.invoke'],
    },
    runtime: {
      type: 'rest',
      endpoint: externalAgentUrls().runtimeUrl,
      method: 'POST',
      inputField: 'topic',
      outputField: 'response',
      supportsStreaming: false,
      supportsLongRunningTasks: false,
    },
    install: {
      supportedModes: ['delegated_runtime_access'],
      requiresUserConsent: false,
    },
    capabilities: [
      {
        name: 'research_topic',
        description: 'Invokes an independently hosted external research runtime.',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              minLength: 3,
              maxLength: 1000,
            },
          },
          required: ['topic'],
          additionalProperties: false,
        },
        outputSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            sources: {
              type: 'array',
              items: { type: 'string' },
            },
            runtime: { type: 'object' },
          },
          required: ['summary', 'sources'],
        },
        riskLevel: 'low',
      },
    ],
  };
}

function safePassport(passport, capabilitiesCount) {
  if (!passport) return null;
  return {
    passportId: idOf(passport),
    partnerAgentId: passport.partnerAgentId,
    status: passport.status,
    capabilitiesCount,
    agent: {
      id: passport.agent?.id,
      name: passport.agent?.name,
      provider: passport.agent?.provider,
      description: passport.agent?.description,
      version: passport.agent?.version,
    },
    runtime: {
      type: passport.runtime?.type,
      endpoint: passport.runtime?.endpoint,
    },
  };
}

async function externalAgentSandboxStatus(authenticatedPartner) {
  const partner = requireSandboxPartnerAccess(authenticatedPartner, idOf(authenticatedPartner));
  const urls = externalAgentUrls();
  const passport = await AgentPassport.findOne({
    partnerId: partner._id,
    partnerAgentId: EXTERNAL_AGENT_PARTNER_AGENT_ID,
  }).lean();
  const connection = passport
    ? await PassportConnection.findOne({ passportId: passport._id }).sort({ createdAt: -1 }).lean()
    : null;

  return {
    baseUrl: urls.baseUrl,
    delegatedAccessConfigured: runtimeTokenConfigured(),
    passport: safePassport(passport, undefined),
    connection: connection
      ? {
          connectionId: idOf(connection),
          status: connection.status,
          lastHealthStatus: connection.lastHealthStatus || null,
        }
      : null,
  };
}

async function checkExternalAgentHealth(authenticatedPartner) {
  requireSandboxPartnerAccess(authenticatedPartner, idOf(authenticatedPartner));
  const urls = externalAgentUrls();
  const checkedAt = new Date().toISOString();
  const result = await safeFetchUtility.safeFetch(urls.healthUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    timeoutMs: env.RUNTIME_REQUEST_TIMEOUT_MS,
    allowDevelopmentExternalAgent: true,
  });

  let service;
  let status;
  let version;
  try {
    const body = JSON.parse(result.bodyText || '{}');
    service = body?.data?.service;
    status = body?.data?.status;
    version = body?.data?.version;
  } catch {
    // The health result remains safe and unhealthy when the remote body is malformed.
  }

  return {
    baseUrl: urls.baseUrl,
    health: {
      healthy: result.ok && service === 'external-research-agent' && status === 'healthy',
      remoteStatus: result.status,
      service: service === 'external-research-agent' ? service : null,
      status: typeof status === 'string' ? status : null,
      version: typeof version === 'string' ? version : null,
      checkedAt,
    },
  };
}

async function upsertExternalAgentPassport(authenticatedPartner, requestId) {
  const partner = requireSandboxPartnerAccess(authenticatedPartner, idOf(authenticatedPartner));
  const passportDocument = buildExternalAgentPassport();
  const result = await upsertPartnerPassport(
    partner,
    {
      partnerAgentId: EXTERNAL_AGENT_PARTNER_AGENT_ID,
      passport: passportDocument,
    },
    requestId,
  );

  await createAuditLog(
    'system',
    'developer-sandbox',
    'external_sandbox_passport.upserted',
    'AgentPassport',
    result.passportId,
    {
      partnerId: idOf(partner),
      partnerAgentId: EXTERNAL_AGENT_PARTNER_AGENT_ID,
      runtimeEndpoint: passportDocument.runtime.endpoint,
      status: result.status,
    },
    requestId,
  );

  return {
    passportId: result.passportId,
    partnerAgentId: EXTERNAL_AGENT_PARTNER_AGENT_ID,
    status: result.status,
    capabilitiesCount: result.capabilitiesCount,
    agent: passportDocument.agent,
    runtime: {
      type: passportDocument.runtime.type,
      endpoint: passportDocument.runtime.endpoint,
    },
  };
}

async function issueExternalAgentInstallKey(authenticatedPartner, requestId) {
  const partner = requireSandboxPartnerAccess(authenticatedPartner, idOf(authenticatedPartner));
  const passport = await upsertExternalAgentPassport(partner, requestId);
  const runtimeToken = externalRuntimeToken();
  const result = await issueInstallKey(
    partner,
    passport.passportId,
    {
      scope: 'invoke',
      installMode: 'delegated_runtime_access',
      expiresInMinutes: EXTERNAL_AGENT_INSTALL_KEY_TTL_MINUTES,
      runtimeGrant: {
        type: 'bearer_token',
        header: 'Authorization',
        scheme: 'Bearer',
        accessToken: runtimeToken,
      },
    },
    requestId,
  );

  await createAuditLog(
    'system',
    'developer-sandbox',
    'external_sandbox_install_key.issued',
    'AgentPassport',
    passport.passportId,
    {
      partnerId: idOf(partner),
      partnerAgentId: EXTERNAL_AGENT_PARTNER_AGENT_ID,
      passportId: passport.passportId,
      keyPrefix: result.keyPrefix,
      scope: 'invoke',
      installMode: 'delegated_runtime_access',
    },
    requestId,
  );

  return {
    key: result.key,
    expiresAt: result.expiresAt,
    passportId: passport.passportId,
    agent: passport.agent,
  };
}

module.exports = {
  EXTERNAL_AGENT_PARTNER_AGENT_ID,
  buildExternalAgentPassport,
  checkExternalAgentHealth,
  externalAgentSandboxStatus,
  issueExternalAgentInstallKey,
  upsertExternalAgentPassport,
};
