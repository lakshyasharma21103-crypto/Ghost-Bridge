const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const PassportInstallKey = require('../models/PassportInstallKey');
const { createAuditLog } = require('./auditService');
const { validateAgentPassportV1 } = require('./passportValidator');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { generateInstallKey, hashKey, encryptPayload } = require('../utils/crypto');

const INSTALL_MODES = ['delegated_runtime_access', 'auth_required', 'metadata_only'];
const KEY_SCOPES = ['resolve_only', 'connect', 'invoke'];

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function serializePartner(partner) {
  return {
    id: idOf(partner),
    name: partner.name,
    slug: partner.slug,
    status: partner.status,
    plan: partner.plan,
  };
}

function requireString(value, path) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path, message: `${path} is required.` },
    ]);
  }
  return value.trim();
}

function asDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function keyPrefix(rawKey) {
  return rawKey.slice(0, 'agentpass_install_'.length + 8);
}

function serializePassport(passport) {
  return {
    id: idOf(passport),
    partnerAgentId: passport.partnerAgentId,
    protocol: passport.protocol,
    agent: passport.agent,
    auth: passport.auth,
    runtime: passport.runtime,
    install: passport.install,
    health: passport.health,
    status: passport.status,
    validationErrors: passport.validationErrors || [],
    createdAt: passport.createdAt,
    updatedAt: passport.updatedAt,
  };
}

function serializeCapability(capability) {
  return {
    id: idOf(capability),
    passportId: idOf(capability.passportId),
    name: capability.name,
    description: capability.description,
    inputSchema: capability.inputSchema,
    outputSchema: capability.outputSchema,
    riskLevel: capability.riskLevel,
    runtimeToolName: capability.runtimeToolName,
    enabled: capability.enabled,
    createdAt: capability.createdAt,
    updatedAt: capability.updatedAt,
  };
}

async function upsertPartnerPassport(partner, input, requestId) {
  const partnerAgentId = requireString(input?.partnerAgentId, 'partnerAgentId');
  const validation = validateAgentPassportV1(input?.passport);
  if (!validation.valid) {
    throw new AppError(
      400,
      ErrorCodes.PASSPORT_VALIDATION_FAILED,
      'Agent Passport validation failed.',
      validation.errors,
    );
  }

  const passport = await AgentPassport.findOneAndUpdate(
    { partnerId: partner._id, partnerAgentId },
    {
      $set: {
        partnerId: partner._id,
        partnerAgentId,
        protocol: validation.passport.protocol,
        agent: validation.passport.agent,
        auth: validation.passport.auth,
        runtime: validation.passport.runtime,
        install: validation.passport.install,
        health: validation.passport.health || {},
        status: 'valid',
        validationErrors: [],
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  await Capability.deleteMany({ passportId: passport._id });
  const capabilityDocs = validation.passport.capabilities.map((capability) => ({
    passportId: passport._id,
    name: capability.name,
    description: capability.description,
    inputSchema: capability.inputSchema,
    outputSchema: capability.outputSchema,
    riskLevel: capability.riskLevel,
    runtimeToolName: capability.runtimeToolName,
    enabled: capability.enabled,
  }));
  const capabilities = capabilityDocs.length ? await Capability.insertMany(capabilityDocs) : [];

  await createAuditLog(
    'partner',
    idOf(partner),
    'passport.upserted',
    'AgentPassport',
    idOf(passport),
    {
      partnerAgentId,
      status: 'valid',
      capabilitiesCount: capabilities.length,
    },
    requestId,
  );

  return {
    passportId: idOf(passport),
    status: passport.status,
    capabilitiesCount: capabilities.length,
    validationErrors: [],
  };
}

async function listPartnerPassports(partner) {
  const passports = await AgentPassport.find({ partnerId: partner._id })
    .sort({ updatedAt: -1 })
    .lean();
  const passportIds = passports.map((passport) => passport._id);
  const capabilityCounts = await Capability.aggregate([
    { $match: { passportId: { $in: passportIds } } },
    { $group: { _id: '$passportId', count: { $sum: 1 } } },
  ]);
  const countByPassport = new Map(capabilityCounts.map((item) => [idOf(item._id), item.count]));

  return {
    partner: serializePartner(partner),
    items: passports.map((passport) => ({
      ...serializePassport(passport),
      capabilitiesCount: countByPassport.get(idOf(passport)) || 0,
    })),
  };
}

async function requirePartnerPassport(partner, passportId) {
  const passport = await AgentPassport.findOne({ _id: passportId, partnerId: partner._id });
  if (!passport) {
    throw new AppError(404, ErrorCodes.PASSPORT_NOT_FOUND, 'Agent Passport was not found.');
  }
  return passport;
}

async function passportKeyStats(partner, passportId) {
  const [statusCounts, recentKeys] = await Promise.all([
    PassportInstallKey.aggregate([
      { $match: { partnerId: partner._id, passportId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    PassportInstallKey.find({ partnerId: partner._id, passportId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id keyPrefix status scope installMode expiresAt usedAt createdAt')
      .lean(),
  ]);

  return {
    counts: Object.fromEntries(statusCounts.map((item) => [item._id, item.count])),
    recent: recentKeys.map((item) => ({
      id: idOf(item),
      keyPrefix: item.keyPrefix,
      status: item.status,
      scope: item.scope,
      installMode: item.installMode,
      expiresAt: item.expiresAt,
      usedAt: item.usedAt,
      createdAt: item.createdAt,
    })),
  };
}

async function getPartnerPassportDetail(partner, passportId) {
  const passport = await requirePartnerPassport(partner, passportId);
  const [capabilities, keyStats] = await Promise.all([
    Capability.find({ passportId: passport._id }).sort({ name: 1 }).lean(),
    passportKeyStats(partner, passport._id),
  ]);

  return {
    passport: serializePassport(passport),
    capabilities: capabilities.map(serializeCapability),
    keyStats,
  };
}

function validateKeyRequest(body) {
  const scope = body?.scope || 'connect';
  const installMode = body?.installMode || 'auth_required';
  const expiresInMinutes = Number(body?.expiresInMinutes || 15);

  const issues = [];
  if (!KEY_SCOPES.includes(scope)) {
    issues.push({ path: 'scope', message: `scope must be one of: ${KEY_SCOPES.join(', ')}.` });
  }
  if (!INSTALL_MODES.includes(installMode)) {
    issues.push({
      path: 'installMode',
      message: `installMode must be one of: ${INSTALL_MODES.join(', ')}.`,
    });
  }
  if (!Number.isFinite(expiresInMinutes) || expiresInMinutes <= 0 || expiresInMinutes > 1440) {
    issues.push({
      path: 'expiresInMinutes',
      message: 'expiresInMinutes must be between 1 and 1440.',
    });
  }
  if (
    installMode === 'delegated_runtime_access' &&
    (!body?.runtimeGrant || typeof body.runtimeGrant !== 'object')
  ) {
    issues.push({
      path: 'runtimeGrant',
      message: 'runtimeGrant is required for delegated_runtime_access.',
    });
  }
  if (issues.length) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', issues);
  }

  return { scope, installMode, expiresInMinutes };
}

async function issueInstallKey(partner, passportId, body, requestId) {
  const passport = await requirePartnerPassport(partner, passportId);
  if (passport.status !== 'valid') {
    throw new AppError(
      409,
      ErrorCodes.CONFLICT,
      'Install keys can only be issued for valid passports.',
    );
  }

  const { scope, installMode, expiresInMinutes } = validateKeyRequest(body);
  if (!passport.install?.supportedModes?.includes(installMode)) {
    throw new AppError(409, ErrorCodes.CONFLICT, 'Install mode is not supported by this passport.');
  }
  const rawKey = generateInstallKey();
  const encryptedRuntimeGrant =
    installMode === 'delegated_runtime_access' ? encryptPayload(body.runtimeGrant) : undefined;
  const runtimeGrantExpiresAt =
    installMode === 'delegated_runtime_access' ? asDate(body.runtimeGrant?.expiresAt) : undefined;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const installKey = await PassportInstallKey.create({
    partnerId: partner._id,
    passportId: passport._id,
    keyHash: hashKey(rawKey),
    keyPrefix: keyPrefix(rawKey),
    status: 'active',
    expiresAt,
    scope,
    installMode,
    encryptedRuntimeGrant,
    runtimeGrantExpiresAt,
  });

  await createAuditLog(
    'partner',
    idOf(partner),
    'install_key.issued',
    'PassportInstallKey',
    idOf(installKey),
    {
      passportId: idOf(passport),
      keyPrefix: installKey.keyPrefix,
      scope,
      installMode,
      expiresAt,
      runtimeGrantProvided: Boolean(body.runtimeGrant),
    },
    requestId,
  );

  return {
    key: rawKey,
    keyPrefix: installKey.keyPrefix,
    expiresAt,
    installMode,
    shownOnlyOnce: true,
  };
}

async function suspendPassport(partner, passportId, requestId) {
  const passport = await requirePartnerPassport(partner, passportId);
  passport.status = 'suspended';
  await passport.save();

  await createAuditLog(
    'partner',
    idOf(partner),
    'passport.suspended',
    'AgentPassport',
    idOf(passport),
    { partnerAgentId: passport.partnerAgentId },
    requestId,
  );

  return { passportId: idOf(passport), status: passport.status };
}

async function revokeInstallKey(partner, keyId, requestId) {
  const installKey = await PassportInstallKey.findOne({
    _id: keyId,
    partnerId: partner._id,
  });
  if (!installKey) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Install key was not found.');
  }

  const previousStatus = installKey.status;
  installKey.status = 'revoked';
  await installKey.save();

  await createAuditLog(
    'partner',
    idOf(partner),
    'install_key.revoked',
    'PassportInstallKey',
    idOf(installKey),
    {
      passportId: idOf(installKey.passportId),
      keyPrefix: installKey.keyPrefix,
      previousStatus,
    },
    requestId,
  );

  return {
    keyId: idOf(installKey),
    status: installKey.status,
  };
}

module.exports = {
  upsertPartnerPassport,
  listPartnerPassports,
  getPartnerPassportDetail,
  issueInstallKey,
  suspendPassport,
  revokeInstallKey,
  serializePartner,
  serializePassport,
  keyPrefix,
};
