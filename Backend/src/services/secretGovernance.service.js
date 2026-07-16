const crypto = require('node:crypto');
const mongoose = require('mongoose');
const GovernedSecret = require('../models/GovernedSecret');
const SecretVersion = require('../models/SecretVersion');
const CredentialBinding = require('../models/CredentialBinding');
const CredentialRotationAttempt = require('../models/CredentialRotationAttempt');
const EncryptionRewrapJob = require('../models/EncryptionRewrapJob');
const PassportConnection = require('../models/PassportConnection');
const Credential = require('../models/Credential');
const AuditLog = require('../models/AuditLog');
const OperationalAlert = require('../models/OperationalAlert');
const { createAuditLog, serializeAuditLog } = require('./auditService');
const { actorFromPartner, assertAuthorized } = require('./authorization.service');
const {
  currentKeyVersion,
  decryptSecret,
  encryptSecret,
  fingerprintLegacyCiphertext,
  fingerprintSecret,
  hasKeyVersion,
  healthMetadata,
  reencryptSecret,
} = require('./encryptionKeyProvider.service');
const {
  normalizeCredentialPayload,
  parseCredentialPayload,
  serializeCredentialPayload,
} = require('./credentialPayload.service');
const {
  providerManagedRotation,
  validateCredential,
} = require('./credentialProviderAdapters.service');
const metrics = require('./secretMetrics.service');
const { decryptPayload, hashKey } = require('../utils/crypto');
const { redactSecrets } = require('../utils/redact');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { enforceApproval, consumeApprovalGrants } = require('./approval.service');
const {
  CREDENTIAL_TYPES,
  SECRET_AUDIT_EVENTS,
  SECRET_LIMITS,
} = require('../constants/secretGovernance');

const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9._-]{1,99}$/i;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function safeDate(value, path, { future = false } = {}) {
  if (value == null || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || (future && date.getTime() <= Date.now())) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path, message: `${path} must be a valid${future ? ' future' : ''} ISO-8601 date.` },
    ]);
  }
  return date;
}

function boundedInteger(value, fallback, minimum, maximum, path) {
  const number = value == null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path, message: `${path} must be an integer between ${minimum} and ${maximum}.` },
    ]);
  }
  return number;
}

function actorScope(actor = {}, input = {}) {
  const partnerId = idOf(actor.partner?._id || actor.partnerId);
  if (!partnerId) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      'Partner authentication is required.',
    );
  }
  const requestedOrganizationId = idOf(input.organizationId || partnerId);
  if (requestedOrganizationId !== partnerId) {
    throw new AppError(403, ErrorCodes.AUTHORIZATION_DENIED, 'Authorization denied.', [], {
      reasonCode: 'TENANT_SCOPE_MISMATCH',
    });
  }
  return {
    partnerId,
    organizationId: partnerId,
    workspaceId: String(input.workspaceId || input.receivingWorkspaceId || '').trim() || undefined,
    actorId: `partner:${partnerId}`,
    authorizationActor: actorFromPartner(actor.partner || { _id: partnerId }),
  };
}

function resourceFromSecret(scope, secret, type = 'Secret') {
  return {
    type,
    id: secret?.secretId || idOf(secret) || 'secrets',
    partnerId: scope.partnerId,
    organizationId: scope.organizationId,
    workspaceId: secret?.workspaceId || scope.workspaceId,
  };
}

async function authorizeAction(permission, input, actor, secret, type) {
  const scope = actorScope(actor, input);
  if (secret && String(secret.organizationId) !== scope.organizationId) {
    throw new AppError(404, ErrorCodes.SECRET_NOT_FOUND, 'Secret was not found.');
  }
  if (secret?.workspaceId && scope.workspaceId && secret.workspaceId !== scope.workspaceId) {
    throw new AppError(404, ErrorCodes.SECRET_NOT_FOUND, 'Secret was not found.');
  }
  scope.authorizationDecision = await assertAuthorized(
    scope.authorizationActor,
    permission,
    resourceFromSecret(scope, secret, type),
    {
      requestId: actor.requestId,
      traceId: actor.traceId,
      workspaceId: secret?.workspaceId || scope.workspaceId,
      trustedSecret: secret,
    },
  );
  return scope;
}

async function enforceSecretApproval(
  scope,
  permission,
  secret,
  input,
  actor,
  operationType,
  versionId,
) {
  const enforcement = await enforceApproval({
    organizationId: scope.organizationId,
    workspaceId: secret.workspaceId || scope.workspaceId,
    requesterActorId: scope.authorizationActor.id,
    requesterActorType: scope.authorizationActor.type,
    permission,
    resourceType: versionId ? 'SecretVersion' : 'Secret',
    resourceId: versionId || secret.secretId,
    operationType,
    environment: process.env.NODE_ENV,
    policySnapshotRevision: scope.authorizationDecision?.policySnapshotRevision,
    safeRequestAttributes: input.safeRequestAttributes || {
      secretId: secret.secretId,
      versionId,
      revision: Number(input.revision ?? secret.revision),
    },
    approvalRequestId: input.approvalRequestId,
    approvalRequestIds: input.approvalRequestIds,
  });
  return consumeApprovalGrants(enforcement, {
    actorId: scope.authorizationActor.id,
    actorType: scope.authorizationActor.type,
    requestId: actor.requestId,
    traceId: actor.traceId,
  });
}

function tenantFilter(scope, secretId) {
  const filter = { organizationId: scope.organizationId };
  if (secretId) filter.secretId = secretId;
  if (scope.workspaceId) {
    filter.$or = [
      { workspaceId: scope.workspaceId },
      { workspaceId: { $exists: false } },
      { workspaceId: null },
      { workspaceId: '' },
    ];
  }
  return filter;
}

async function ownedSecret(secretId, scope, options = {}) {
  let query = GovernedSecret.findOne(tenantFilter(scope, secretId));
  if (options.session) query = query.session(options.session);
  const secret = await query;
  if (!secret) throw new AppError(404, ErrorCodes.SECRET_NOT_FOUND, 'Secret was not found.');
  return secret;
}

function serializeSecret(input, bindingCount) {
  const secret = typeof input?.toObject === 'function' ? input.toObject() : input;
  return {
    secretId: secret.secretId,
    organizationId: secret.organizationId,
    workspaceId: secret.workspaceId,
    name: secret.name,
    description: secret.description,
    provider: secret.provider,
    credentialType: secret.credentialType,
    ownershipScope: secret.ownershipScope,
    status: secret.status,
    activeVersionId: secret.activeVersionId,
    previousVersionId: secret.previousVersionId,
    gracePeriodEndsAt: secret.gracePeriodEndsAt,
    rotationPolicy: secret.rotationPolicy || {},
    expiryPolicy: secret.expiryPolicy || {},
    expiresAt: secret.expiresAt,
    healthStatus: secret.healthStatus,
    lastHealthCheckedAt: secret.lastHealthCheckedAt,
    lastHealthReasonCode: secret.lastHealthReasonCode,
    lastRotatedAt: secret.lastRotatedAt,
    revokedAt: secret.revokedAt,
    createdBy: secret.createdBy,
    updatedBy: secret.updatedBy,
    revision: secret.revision,
    schemaVersion: secret.schemaVersion,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
    ...(Number.isInteger(bindingCount) ? { bindingCount } : {}),
  };
}

function serializeVersion(input) {
  const version = typeof input?.toObject === 'function' ? input.toObject() : input;
  return {
    versionId: version.versionId,
    secretId: version.secretId,
    version: version.version,
    status: version.status,
    validationStatus: version.validationStatus,
    validationMethod: version.validationMethod,
    validationReasonCode: version.validationReasonCode,
    validatedAt: version.validatedAt,
    encryptionAlgorithm: version.encryptionAlgorithm,
    encryptionKeyVersion: version.encryptionKeyVersion,
    encryptionFormat: version.encryptionFormat,
    encryptedAt: version.encryptedAt,
    integrityMetadata: version.integrityMetadata,
    safeFingerprint: version.safeFingerprint,
    activatedAt: version.activatedAt,
    retiredAt: version.retiredAt,
    revokedAt: version.revokedAt,
    expiresAt: version.expiresAt,
    destroyedAt: version.destroyedAt,
    createdBy: version.createdBy,
    revision: version.revision,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
  };
}

function serializeBinding(input) {
  const binding = typeof input?.toObject === 'function' ? input.toObject() : input;
  return {
    bindingId: binding.bindingId,
    organizationId: binding.organizationId,
    workspaceId: binding.workspaceId,
    connectionId: idOf(binding.connectionId),
    secretId: binding.secretId,
    provider: binding.provider,
    purpose: binding.purpose,
    allowedAdapter: binding.allowedAdapter,
    allowedEnvironment: binding.allowedEnvironment,
    capabilityRestrictions: binding.capabilityRestrictions || [],
    status: binding.status,
    revision: binding.revision,
    revokedAt: binding.revokedAt,
    createdAt: binding.createdAt,
    updatedAt: binding.updatedAt,
  };
}

function serializeRotation(input) {
  const attempt = typeof input?.toObject === 'function' ? input.toObject() : input;
  return {
    rotationAttemptId: attempt.rotationAttemptId,
    secretId: attempt.secretId,
    mode: attempt.mode,
    stage: attempt.stage,
    oldVersionId: attempt.oldVersionId,
    newVersionId: attempt.newVersionId,
    requestedBy: attempt.requestedBy,
    history: attempt.history || [],
    failureReasonCode: attempt.failureReasonCode,
    completedAt: attempt.completedAt,
    revision: attempt.revision,
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
  };
}

function secretContext(secret, versionId) {
  return {
    organizationId: secret.organizationId,
    workspaceId: secret.workspaceId,
    secretId: secret.secretId,
    versionId,
    credentialType: secret.credentialType,
    schemaVersion: 1,
  };
}

function providerName(value) {
  const provider = String(value || '')
    .trim()
    .toLowerCase();
  if (!PROVIDER_PATTERN.test(provider)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path: 'provider', message: 'provider must be a safe provider identifier.' },
    ]);
  }
  return provider;
}

function providerNameFromAuthoritativeMetadata(value) {
  const normalized = String(value || 'agent_runtime')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '')
    .slice(0, 100);
  return providerName(normalized || 'agent_runtime');
}

function credentialType(value) {
  const type = String(value || '')
    .trim()
    .toLowerCase();
  if (!CREDENTIAL_TYPES.includes(type)) {
    throw new AppError(
      400,
      ErrorCodes.CREDENTIAL_VALIDATION_FAILED,
      'Credential validation failed.',
    );
  }
  return type;
}

function secretName(value) {
  const name = String(value || '').trim();
  if (!name || name.length > SECRET_LIMITS.maximumNameLength) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path: 'name', message: 'name is required and must be at most 200 characters.' },
    ]);
  }
  return name;
}

async function audit(event, secret, scope, actor, metadata = {}) {
  await createAuditLog(
    'partner',
    scope.partnerId,
    event,
    'Secret',
    secret.secretId,
    {
      organizationId: scope.organizationId,
      workspaceId: secret.workspaceId,
      secretId: secret.secretId,
      provider: secret.provider,
      credentialType: secret.credentialType,
      ...redactSecrets(metadata),
    },
    { requestId: actor.requestId, traceId: actor.traceId, invocationId: metadata.invocationId },
  );
}

async function securityAlert(secret, type, reasonCode, severity = 'critical') {
  try {
    const now = new Date();
    const workspaceId = secret.workspaceId || `organization:${secret.organizationId}`;
    await OperationalAlert.updateOne(
      { dedupeKey: `secret-governance:${type}:${secret.organizationId}:${secret.secretId}` },
      {
        $set: {
          organizationId: mongoose.isValidObjectId(secret.organizationId)
            ? secret.organizationId
            : undefined,
          receivingWorkspaceId: workspaceId,
          type,
          scopeKey: secret.secretId,
          severity,
          status: 'active',
          title: 'Credential governance intervention required',
          summary: 'A governed credential requires safe operator review.',
          metricName: 'secret_governance_failure',
          observedValue: 1,
          thresholdValue: 1,
          safeValues: { reasonCode },
          lastSeenAt: now,
        },
        $setOnInsert: { firstSeenAt: now },
        $inc: { occurrenceCount: 1 },
      },
      { upsert: true },
    );
  } catch {
    // The protected operation still fails closed if alert persistence is unavailable.
  }
}

async function withTransaction(operation) {
  const session = await mongoose.startSession();
  try {
    let value;
    await session.withTransaction(async () => {
      value = await operation(session);
    });
    return value;
  } finally {
    await session.endSession();
  }
}

function encryptedVersionDocument({
  secret,
  payloadBuffer,
  version,
  versionId,
  actorId,
  expiresAt,
}) {
  const context = secretContext(secret, versionId);
  const encryptedPayload = encryptSecret({ plaintext: payloadBuffer, context });
  const fingerprint = fingerprintSecret({ plaintext: payloadBuffer, context });
  return {
    versionId,
    secretId: secret.secretId,
    organizationId: secret.organizationId,
    workspaceId: secret.workspaceId,
    version,
    encryptedPayload,
    encryptionFormat: 'AAD_V1',
    encryptionAlgorithm: encryptedPayload.algorithm,
    encryptionKeyVersion: encryptedPayload.keyVersion,
    integrityMetadata: { aadVersion: encryptedPayload.aadVersion, tenantBound: true },
    encryptedAt: new Date(),
    status: 'PENDING',
    validationStatus: 'PENDING',
    createdBy: actorId,
    expiresAt,
    fingerprintDigest: fingerprint.digest,
    safeFingerprint: fingerprint.display,
    schemaVersion: 1,
  };
}

async function createSecret(input = {}, actor = {}) {
  const scope = await authorizeAction('secret.create', input, actor);
  const workspaceId =
    String(input.policyWorkspaceId || input.workspaceId || '').trim() || undefined;
  const ownershipScope = workspaceId ? 'WORKSPACE' : 'ORGANIZATION';
  const type = credentialType(input.credentialType || input.type);
  const provider = providerName(input.provider);
  const secretId = `sec_${crypto.randomUUID()}`;
  const versionId = `sver_${crypto.randomUUID()}`;
  const expiresAt = safeDate(input.expiresAt, 'expiresAt', { future: true });
  const payload = normalizeCredentialPayload(type, input.credential || input.secretValue, {
    header: input.header,
    scheme: input.scheme,
  });
  const payloadBuffer = serializeCredentialPayload(payload);
  let created;
  try {
    created = await withTransaction(async (session) => {
      const secretPayload = {
        secretId,
        organizationId: scope.organizationId,
        workspaceId,
        name: secretName(input.name),
        description: String(input.description || '').trim(),
        provider,
        credentialType: type,
        ownershipScope,
        status: 'ACTIVE',
        activeVersionId: versionId,
        rotationPolicy: {
          mode: String(input.rotationPolicy?.mode || 'MANUAL').toUpperCase(),
          gracePeriodSeconds: boundedInteger(
            input.rotationPolicy?.gracePeriodSeconds,
            0,
            0,
            SECRET_LIMITS.maximumGracePeriodSeconds,
            'rotationPolicy.gracePeriodSeconds',
          ),
          rotationDueAt: safeDate(
            input.rotationPolicy?.rotationDueAt,
            'rotationPolicy.rotationDueAt',
            { future: true },
          ),
          warningWindowDays: boundedInteger(
            input.rotationPolicy?.warningWindowDays,
            14,
            0,
            365,
            'rotationPolicy.warningWindowDays',
          ),
        },
        expiryPolicy: {
          warningWindowDays: boundedInteger(
            input.expiryPolicy?.warningWindowDays,
            14,
            0,
            365,
            'expiryPolicy.warningWindowDays',
          ),
        },
        expiresAt,
        healthStatus: 'UNKNOWN',
        createdBy: scope.actorId,
        updatedBy: scope.actorId,
        schemaVersion: 1,
      };
      const [secret] = await GovernedSecret.create([secretPayload], { session });
      const versionDocument = encryptedVersionDocument({
        secret,
        payloadBuffer,
        version: 1,
        versionId,
        actorId: scope.actorId,
        expiresAt,
      });
      versionDocument.status = 'ACTIVE';
      versionDocument.validationStatus = 'VALIDATED';
      versionDocument.validationMethod = 'LOCAL_FORMAT';
      versionDocument.validationReasonCode = 'PROVIDER_VALIDATION_NOT_SUPPORTED';
      versionDocument.validatedAt = new Date();
      versionDocument.activatedAt = new Date();
      const [version] = await SecretVersion.create([versionDocument], { session });
      return { secret, version };
    });
  } finally {
    payloadBuffer.fill(0);
  }
  await audit(SECRET_AUDIT_EVENTS.CREATED, created.secret, scope, actor, {
    secretVersionId: created.version.versionId,
    newState: 'ACTIVE',
    encryptionKeyVersion: created.version.encryptionKeyVersion,
  });
  metrics.increment('secret_created', { status: 'ACTIVE' });
  return {
    ...serializeSecret(created.secret, 0),
    activeVersion: serializeVersion(created.version),
  };
}

async function listSecrets(input = {}, actor = {}) {
  const scope = await authorizeAction('secret.metadata.read', input, actor);
  const filter = tenantFilter(scope);
  if (input.status) filter.status = String(input.status).toUpperCase();
  if (input.provider) filter.provider = providerName(input.provider);
  const limit = boundedInteger(input.limit, 100, 1, 200, 'limit');
  const secrets = await GovernedSecret.find(filter).sort({ updatedAt: -1 }).limit(limit).lean();
  const counts = await CredentialBinding.aggregate([
    { $match: { organizationId: scope.organizationId, status: 'ACTIVE' } },
    { $group: { _id: '$secretId', count: { $sum: 1 } } },
  ]);
  const bySecret = new Map(counts.map((item) => [item._id, item.count]));
  return {
    items: secrets.map((secret) => serializeSecret(secret, bySecret.get(secret.secretId) || 0)),
  };
}

async function getSecret(secretId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.metadata.read', input, actor, secret);
  const bindingCount = await CredentialBinding.countDocuments({
    organizationId: scope.organizationId,
    secretId,
    status: 'ACTIVE',
  });
  return serializeSecret(secret, bindingCount);
}

async function listVersions(secretId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.metadata.read', input, actor, secret);
  const items = await SecretVersion.find({ organizationId: scope.organizationId, secretId })
    .sort({ version: -1 })
    .lean();
  return { secret: serializeSecret(secret), items: items.map(serializeVersion) };
}

async function nextVersionNumber(secret, options = {}) {
  let query = SecretVersion.findOne({
    organizationId: secret.organizationId,
    secretId: secret.secretId,
  }).sort({ version: -1 });
  if (options.session) query = query.session(options.session);
  const latest = await query.lean();
  return Number(latest?.version || 0) + 1;
}

async function addPendingVersion(secretId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.update', input, actor, secret);
  if (['REVOKED', 'DESTROYED'].includes(secret.status)) {
    throw new AppError(409, ErrorCodes.SECRET_REVOKED, 'Secret cannot accept a new version.');
  }
  const payload = normalizeCredentialPayload(
    secret.credentialType,
    input.credential || input.secretValue,
  );
  const payloadBuffer = serializeCredentialPayload(payload);
  const versionId = `sver_${crypto.randomUUID()}`;
  let version;
  try {
    const number = await nextVersionNumber(secret);
    version = await SecretVersion.create(
      encryptedVersionDocument({
        secret,
        payloadBuffer,
        version: number,
        versionId,
        actorId: scope.actorId,
        expiresAt: safeDate(input.expiresAt, 'expiresAt', { future: true }),
      }),
    );
  } finally {
    payloadBuffer.fill(0);
  }
  await audit(SECRET_AUDIT_EVENTS.VERSION_ADDED, secret, scope, actor, {
    secretVersionId: versionId,
    newState: 'PENDING',
    encryptionKeyVersion: version.encryptionKeyVersion,
  });
  return serializeVersion(version);
}

async function encryptedVersion(secret, versionId, options = {}) {
  let query = SecretVersion.findOne({
    organizationId: secret.organizationId,
    secretId: secret.secretId,
    versionId,
  }).select('+encryptedPayload +legacyEncryptedPayload +fingerprintDigest');
  if (options.session) query = query.session(options.session);
  const version = await query;
  if (!version)
    throw new AppError(404, ErrorCodes.SECRET_NOT_FOUND, 'Secret version was not found.');
  return version;
}

function decryptVersion(secret, version) {
  try {
    if (version.encryptionFormat === 'LEGACY_V1') {
      return decryptPayload(version.legacyEncryptedPayload);
    }
    const buffer = decryptSecret({
      encryptedPayload: version.encryptedPayload,
      context: secretContext(secret, version.versionId),
    });
    try {
      return parseCredentialPayload(buffer);
    } finally {
      buffer.fill(0);
    }
  } catch (error) {
    const code =
      error?.code === 'ENCRYPTION_KEY_UNAVAILABLE'
        ? ErrorCodes.ENCRYPTION_KEY_UNAVAILABLE
        : error?.code === 'SECRET_INTEGRITY_FAILED'
          ? ErrorCodes.SECRET_INTEGRITY_FAILED
          : ErrorCodes.SECRET_DECRYPTION_FAILED;
    throw new AppError(500, code, 'Stored credential could not be prepared securely.', [], {
      recoveryRequired: true,
      reasonCode: code,
    });
  }
}

async function validateVersion(secretId, versionId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.rotate', input, actor, secret);
  const version = await encryptedVersion(secret, versionId);
  if (version.status !== 'PENDING') {
    throw new AppError(409, ErrorCodes.CONFLICT, 'Only pending versions can be validated.');
  }
  const payload = decryptVersion(secret, version);
  let result;
  try {
    result = await validateCredential({
      provider: secret.provider,
      credentialType: secret.credentialType,
      payload,
      context: { secretId, versionId, nonDestructive: true },
    });
  } catch {
    result = {
      validationStatus: 'UNKNOWN',
      validationMethod: 'PROVIDER_SAFE_CHECK',
      healthStatus: 'UNAVAILABLE',
      reasonCode: 'CREDENTIAL_PROVIDER_UNAVAILABLE',
    };
  }
  const updated = await SecretVersion.findOneAndUpdate(
    { _id: version._id, revision: version.revision, status: 'PENDING' },
    {
      $set: {
        validationStatus: result.validationStatus,
        validationMethod: result.validationMethod,
        validationReasonCode: result.reasonCode,
        validatedAt: new Date(),
      },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!updated) throw new AppError(409, ErrorCodes.SECRET_ROTATION_CONFLICT, 'Version changed.');
  await GovernedSecret.updateOne(
    { _id: secret._id },
    {
      $set: {
        healthStatus: result.healthStatus || 'UNKNOWN',
        lastHealthCheckedAt: new Date(),
        lastHealthReasonCode: result.reasonCode,
      },
    },
  );
  await audit(SECRET_AUDIT_EVENTS.VERSION_VALIDATED, secret, scope, actor, {
    secretVersionId: versionId,
    newState: result.validationStatus,
    reasonCode: result.reasonCode,
  });
  metrics.increment('credential_validation', { outcome: result.validationStatus });
  return serializeVersion(updated);
}

async function activateVersionInternal(secret, versionId, actorId, options = {}) {
  const gracePeriodSeconds = boundedInteger(
    options.gracePeriodSeconds,
    Number(secret.rotationPolicy?.gracePeriodSeconds || 0),
    0,
    SECRET_LIMITS.maximumGracePeriodSeconds,
    'gracePeriodSeconds',
  );
  const now = new Date();
  return withTransaction(async (session) => {
    const authoritativeSecret = await GovernedSecret.findOne({
      _id: secret._id,
      revision: Number(secret.revision || 0),
      status: { $nin: ['REVOKED', 'DESTROYED'] },
    }).session(session);
    if (!authoritativeSecret) {
      throw new AppError(409, ErrorCodes.SECRET_ROTATION_CONFLICT, 'Secret changed concurrently.');
    }
    const next = await SecretVersion.findOne({
      organizationId: secret.organizationId,
      secretId: secret.secretId,
      versionId,
      status: 'PENDING',
      validationStatus: 'VALIDATED',
    }).session(session);
    if (!next) {
      throw new AppError(
        409,
        ErrorCodes.SECRET_VERSION_NOT_ACTIVE,
        'A validated pending version is required.',
      );
    }
    if (next.expiresAt && new Date(next.expiresAt).getTime() <= now.getTime()) {
      throw new AppError(409, ErrorCodes.SECRET_EXPIRED, 'Secret version has expired.');
    }
    const oldVersionId = authoritativeSecret.activeVersionId;
    if (oldVersionId) {
      await SecretVersion.updateOne(
        {
          organizationId: secret.organizationId,
          secretId: secret.secretId,
          versionId: oldVersionId,
          status: 'ACTIVE',
        },
        {
          $set: gracePeriodSeconds ? { status: 'PREVIOUS' } : { status: 'RETIRED', retiredAt: now },
          $inc: { revision: 1 },
        },
        { session, runValidators: true },
      );
    }
    const activated = await SecretVersion.findOneAndUpdate(
      { _id: next._id, status: 'PENDING', validationStatus: 'VALIDATED' },
      { $set: { status: 'ACTIVE', activatedAt: now }, $inc: { revision: 1 } },
      { new: true, session, runValidators: true },
    );
    if (!activated) {
      throw new AppError(
        409,
        ErrorCodes.SECRET_ROTATION_CONFLICT,
        'Version activation conflicted.',
      );
    }
    authoritativeSecret.activeVersionId = versionId;
    authoritativeSecret.previousVersionId = oldVersionId || undefined;
    authoritativeSecret.gracePeriodEndsAt = gracePeriodSeconds
      ? new Date(now.getTime() + gracePeriodSeconds * 1_000)
      : undefined;
    authoritativeSecret.status = 'ACTIVE';
    authoritativeSecret.healthStatus = 'UNKNOWN';
    authoritativeSecret.lastRotatedAt = now;
    authoritativeSecret.updatedBy = actorId;
    authoritativeSecret.revision = Number(authoritativeSecret.revision || 0) + 1;
    await authoritativeSecret.save({ session });
    return { secret: authoritativeSecret, version: activated, oldVersionId };
  });
}

async function activateVersion(secretId, versionId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.rotate', input, actor, secret);
  await enforceSecretApproval(
    scope,
    'secret.rotate',
    secret,
    input,
    actor,
    'CREDENTIAL_VERSION_ACTIVATION',
    versionId,
  );
  const result = await activateVersionInternal(secret, versionId, scope.actorId, input);
  await audit(SECRET_AUDIT_EVENTS.VERSION_ACTIVATED, result.secret, scope, actor, {
    secretVersionId: versionId,
    oldVersionId: result.oldVersionId,
    newState: 'ACTIVE',
  });
  metrics.increment('credential_rotation', { outcome: 'success' });
  return { secret: serializeSecret(result.secret), version: serializeVersion(result.version) };
}

async function retireVersion(secretId, versionId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.rotate', input, actor, secret);
  if (secret.activeVersionId === versionId) {
    throw new AppError(409, ErrorCodes.CONFLICT, 'The active version cannot be retired.');
  }
  const version = await SecretVersion.findOneAndUpdate(
    {
      organizationId: scope.organizationId,
      secretId,
      versionId,
      status: { $in: ['PREVIOUS', 'PENDING'] },
    },
    { $set: { status: 'RETIRED', retiredAt: new Date() }, $inc: { revision: 1 } },
    { new: true, runValidators: true },
  );
  if (!version) throw new AppError(409, ErrorCodes.CONFLICT, 'Version cannot be retired.');
  return serializeVersion(version);
}

async function revokeVersion(secretId, versionId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.revoke', input, actor, secret);
  await enforceSecretApproval(
    scope,
    'secret.revoke',
    secret,
    input,
    actor,
    'CREDENTIAL_VERSION_REVOCATION',
    versionId,
  );
  const now = new Date();
  const version = await SecretVersion.findOneAndUpdate(
    {
      organizationId: scope.organizationId,
      secretId,
      versionId,
      status: { $nin: ['DESTROYED', 'REVOKED'] },
    },
    { $set: { status: 'REVOKED', revokedAt: now }, $inc: { revision: 1 } },
    { new: true, runValidators: true },
  );
  if (!version)
    throw new AppError(404, ErrorCodes.SECRET_NOT_FOUND, 'Secret version was not found.');
  if (secret.activeVersionId === versionId) {
    await GovernedSecret.updateOne(
      { _id: secret._id },
      {
        $set: {
          status: 'REVOKED',
          healthStatus: 'REVOKED',
          revokedAt: now,
          updatedBy: scope.actorId,
        },
        $unset: { activeVersionId: 1 },
        $inc: { revision: 1 },
      },
    );
    await revokeBindingsAndConnections(scope.organizationId, secretId, now, 'SECRET_REVOKED');
  }
  await audit(SECRET_AUDIT_EVENTS.REVOKED, secret, scope, actor, {
    secretVersionId: versionId,
    oldState: version.status,
    newState: 'REVOKED',
  });
  return serializeVersion(version);
}

async function revokeBindingsAndConnections(organizationId, secretId, now, reasonCode) {
  const bindings = await CredentialBinding.find({
    organizationId,
    secretId,
    status: 'ACTIVE',
  })
    .select('_id connectionId')
    .lean();
  if (!bindings.length) return;
  const bindingIds = bindings.map((binding) => binding._id);
  await CredentialBinding.updateMany(
    { _id: { $in: bindingIds }, organizationId, status: 'ACTIVE' },
    { $set: { status: 'REVOKED', revokedAt: now }, $inc: { revision: 1 } },
  );
  await PassportConnection.updateMany(
    {
      _id: { $in: bindings.map((binding) => binding.connectionId) },
      credentialBindingId: { $in: bindingIds },
    },
    {
      $set: {
        status: 'error',
        healthStatus: 'unhealthy',
        lastHealthStatus: 'unhealthy',
        lastHealthFailureAt: now,
        lastHealthReasonCode: reasonCode,
      },
    },
  );
}

async function setSecretStatus(secretId, status, permission, event, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction(permission, input, actor, secret);
  await enforceSecretApproval(scope, permission, secret, input, actor, `SECRET_${status}`);
  const now = new Date();
  const set = {
    status,
    healthStatus: status === 'ACTIVE' ? 'UNKNOWN' : status === 'DISABLED' ? 'UNAVAILABLE' : status,
    updatedBy: scope.actorId,
    ...(status === 'REVOKED' ? { revokedAt: now } : {}),
  };
  const updated = await GovernedSecret.findOneAndUpdate(
    { _id: secret._id, revision: Number(input.revision ?? secret.revision) },
    { $set: set, $inc: { revision: 1 } },
    { new: true, runValidators: true },
  );
  if (!updated) throw new AppError(409, ErrorCodes.CONFLICT, 'Secret changed concurrently.');
  if (status === 'REVOKED') {
    await revokeBindingsAndConnections(scope.organizationId, secretId, now, 'SECRET_REVOKED');
  }
  await audit(event, updated, scope, actor, { oldState: secret.status, newState: status });
  return serializeSecret(updated);
}

const disableSecret = (secretId, input, actor) =>
  setSecretStatus(
    secretId,
    'DISABLED',
    'secret.revoke',
    SECRET_AUDIT_EVENTS.DISABLED,
    input,
    actor,
  );
const enableSecret = (secretId, input, actor) =>
  setSecretStatus(secretId, 'ACTIVE', 'secret.update', 'SECRET_ENABLED', input, actor);
const revokeSecret = (secretId, input, actor) =>
  setSecretStatus(secretId, 'REVOKED', 'secret.revoke', SECRET_AUDIT_EVENTS.REVOKED, input, actor);

async function destroyVersion(secretId, versionId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.destroy', input, actor, secret);
  await enforceSecretApproval(
    scope,
    'secret.destroy',
    secret,
    input,
    actor,
    'CREDENTIAL_VERSION_DESTRUCTION',
    versionId,
  );
  if (secret.activeVersionId === versionId) {
    throw new AppError(409, ErrorCodes.CONFLICT, 'Revoke the active version before destruction.');
  }
  const version = await SecretVersion.findOneAndUpdate(
    {
      organizationId: scope.organizationId,
      secretId,
      versionId,
      status: { $in: ['REVOKED', 'RETIRED', 'EXPIRED'] },
    },
    {
      $set: {
        status: 'DESTROYED',
        destroyedAt: new Date(),
        destructionReasonCode: 'ADMINISTRATIVE_DESTRUCTION',
      },
      $unset: { encryptedPayload: 1, legacyEncryptedPayload: 1 },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!version) throw new AppError(409, ErrorCodes.CONFLICT, 'Version cannot be destroyed.');
  await audit(SECRET_AUDIT_EVENTS.DESTROYED, secret, scope, actor, {
    secretVersionId: versionId,
    newState: 'DESTROYED',
  });
  return serializeVersion(version);
}

async function listBindings(secretId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.binding.read', input, actor, secret, 'CredentialBinding');
  const items = await CredentialBinding.find({ organizationId: scope.organizationId, secretId })
    .sort({ updatedAt: -1 })
    .lean();
  return { items: items.map(serializeBinding) };
}

async function createBinding(secretId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.binding.manage', input, actor, secret, 'CredentialBinding');
  if (secret.status !== 'ACTIVE') {
    throw new AppError(409, ErrorCodes.SECRET_DISABLED, 'Only active secrets can be bound.');
  }
  const connection = await PassportConnection.findOne({
    _id: input.connectionId,
    partnerId: scope.partnerId,
    $or: [
      { organizationId: scope.organizationId },
      { organizationId: { $exists: false } },
      { organizationId: null },
    ],
  });
  if (!connection)
    throw new AppError(404, ErrorCodes.CONNECTION_NOT_FOUND, 'Connection not found.');
  if (secret.workspaceId && secret.workspaceId !== connection.receivingWorkspaceId) {
    throw new AppError(403, ErrorCodes.SECRET_ACCESS_DENIED, 'Authorization denied.', [], {
      reasonCode: 'CROSS_WORKSPACE_BINDING_DENIED',
    });
  }
  if (scope.workspaceId && scope.workspaceId !== connection.receivingWorkspaceId) {
    throw new AppError(404, ErrorCodes.CONNECTION_NOT_FOUND, 'Connection not found.');
  }
  const allowedAdapter = String(input.allowedAdapter || connection.runtimeType).toLowerCase();
  if (allowedAdapter !== connection.runtimeType) {
    throw new AppError(400, ErrorCodes.SECRET_BINDING_INVALID, 'Binding adapter is invalid.');
  }
  const binding = await CredentialBinding.create({
    bindingId: `bind_${crypto.randomUUID()}`,
    organizationId: scope.organizationId,
    workspaceId: connection.receivingWorkspaceId,
    connectionId: connection._id,
    secretId,
    provider: secret.provider,
    purpose: String(input.purpose || 'runtime_invocation').trim(),
    allowedAdapter,
    allowedEnvironment: String(input.allowedEnvironment || 'any').toLowerCase(),
    capabilityRestrictions: Array.isArray(input.capabilityRestrictions)
      ? [
          ...new Set(
            input.capabilityRestrictions
              .map(String)
              .map((item) => item.trim())
              .filter(Boolean),
          ),
        ]
      : undefined,
    status: 'ACTIVE',
    createdBy: scope.actorId,
    updatedBy: scope.actorId,
  });
  connection.credentialBindingId = binding._id;
  await connection.save();
  await audit(SECRET_AUDIT_EVENTS.BOUND, secret, scope, actor, {
    bindingId: binding.bindingId,
    connectionId: idOf(connection),
    newState: 'ACTIVE',
  });
  return serializeBinding(binding);
}

async function revokeBinding(secretId, bindingId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.binding.manage', input, actor, secret, 'CredentialBinding');
  const binding = await CredentialBinding.findOneAndUpdate(
    { organizationId: scope.organizationId, secretId, bindingId, status: { $ne: 'REVOKED' } },
    {
      $set: { status: 'REVOKED', revokedAt: new Date(), updatedBy: scope.actorId },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!binding) throw new AppError(404, ErrorCodes.SECRET_NOT_FOUND, 'Binding was not found.');
  await PassportConnection.updateOne(
    { _id: binding.connectionId, credentialBindingId: binding._id },
    {
      $unset: { credentialBindingId: 1 },
      $set: {
        status: 'error',
        healthStatus: 'unhealthy',
        lastHealthReasonCode: 'SECRET_BINDING_REVOKED',
      },
    },
  );
  await audit(SECRET_AUDIT_EVENTS.UNBOUND, secret, scope, actor, {
    bindingId,
    connectionId: idOf(binding.connectionId),
    newState: 'REVOKED',
  });
  return serializeBinding(binding);
}

async function rotateSecret(secretId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  let secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.rotate', input, actor, secret);
  const mode = String(input.mode || 'MANUAL').toUpperCase();
  if (mode === 'PROVIDER_MANAGED') {
    const support = await providerManagedRotation({
      provider: secret.provider,
      credentialType: secret.credentialType,
    });
    if (!support.supported) {
      throw new AppError(
        501,
        ErrorCodes.CREDENTIAL_PROVIDER_UNAVAILABLE,
        'Provider-managed credential rotation is not supported for this provider.',
      );
    }
    throw new AppError(
      501,
      ErrorCodes.CREDENTIAL_PROVIDER_UNAVAILABLE,
      'Provider-managed rotation requires a provider-specific implementation.',
    );
  }
  const idempotencyValue = String(input.idempotencyKey || actor.requestId || '').trim();
  if (!idempotencyValue) {
    throw new AppError(400, ErrorCodes.IDEMPOTENCY_KEY_INVALID, 'Idempotency key is required.');
  }
  const idempotencyKeyHash = hashKey(idempotencyValue);
  const existing = await CredentialRotationAttempt.findOne({
    organizationId: scope.organizationId,
    secretId,
    idempotencyKeyHash,
  });
  if (existing) return serializeRotation(existing);
  const attempt = await CredentialRotationAttempt.create({
    rotationAttemptId: `rot_${crypto.randomUUID()}`,
    organizationId: scope.organizationId,
    workspaceId: secret.workspaceId,
    secretId,
    mode,
    stage: 'REQUESTED',
    idempotencyKeyHash,
    oldVersionId: secret.activeVersionId,
    requestedBy: scope.actorId,
    history: [{ stage: 'REQUESTED', at: new Date() }],
  });
  await audit(SECRET_AUDIT_EVENTS.ROTATION_STARTED, secret, scope, actor, {
    rotationAttemptId: attempt.rotationAttemptId,
    oldVersionId: secret.activeVersionId,
  });
  try {
    const version = await addPendingVersion(secretId, input, actor);
    attempt.newVersionId = version.versionId;
    attempt.stage = 'NEW_VERSION_STORED';
    attempt.history.push({ stage: 'NEW_VERSION_STORED', at: new Date() });
    await attempt.save();
    attempt.stage = 'VALIDATING';
    attempt.history.push({ stage: 'VALIDATING', at: new Date() });
    await attempt.save();
    await validateVersion(secretId, version.versionId, input, actor);
    attempt.stage = 'VALIDATED';
    attempt.history.push({ stage: 'VALIDATED', at: new Date() });
    await attempt.save();
    secret = await GovernedSecret.findById(secret._id);
    attempt.stage = 'ACTIVATING';
    attempt.history.push({ stage: 'ACTIVATING', at: new Date() });
    await attempt.save();
    const activated = await activateVersionInternal(
      secret,
      version.versionId,
      scope.actorId,
      input,
    );
    const hasGrace = Boolean(activated.secret.gracePeriodEndsAt);
    attempt.stage = hasGrace ? 'GRACE_PERIOD' : 'COMPLETED';
    attempt.history.push({ stage: 'ACTIVE', at: new Date() });
    if (hasGrace) attempt.history.push({ stage: 'GRACE_PERIOD', at: new Date() });
    else {
      attempt.history.push({ stage: 'OLD_VERSION_RETIRED', at: new Date() });
      attempt.history.push({ stage: 'COMPLETED', at: new Date() });
      attempt.completedAt = new Date();
    }
    await attempt.save();
    await audit(SECRET_AUDIT_EVENTS.ROTATION_COMPLETED, activated.secret, scope, actor, {
      rotationAttemptId: attempt.rotationAttemptId,
      oldVersionId: activated.oldVersionId,
      secretVersionId: version.versionId,
      newState: attempt.stage,
    });
    metrics.increment('credential_rotation', { outcome: 'success' });
    return serializeRotation(attempt);
  } catch (error) {
    attempt.stage = attempt.newVersionId ? 'RECOVERY_REQUIRED' : 'FAILED';
    attempt.failureReasonCode = error.code || 'SECRET_ROTATION_FAILED';
    attempt.history.push({
      stage: attempt.stage,
      at: new Date(),
      reasonCode: attempt.failureReasonCode,
    });
    await attempt.save().catch(() => undefined);
    await audit(SECRET_AUDIT_EVENTS.ROTATION_FAILED, secret, scope, actor, {
      rotationAttemptId: attempt.rotationAttemptId,
      reasonCode: attempt.failureReasonCode,
      newState: attempt.stage,
    }).catch(() => undefined);
    metrics.increment('credential_rotation', {
      outcome: 'failure',
      reason: attempt.failureReasonCode,
    });
    if (attempt.stage === 'RECOVERY_REQUIRED')
      await securityAlert(secret, 'secret_rotation_recovery', attempt.failureReasonCode);
    throw error;
  }
}

async function listRotations(secretId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.metadata.read', input, actor, secret);
  const items = await CredentialRotationAttempt.find({
    organizationId: scope.organizationId,
    secretId,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return { items: items.map(serializeRotation) };
}

async function secretHealth(secretId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.health.read', input, actor, secret);
  return {
    secretId,
    status: secret.status,
    healthStatus: secret.healthStatus,
    lastHealthCheckedAt: secret.lastHealthCheckedAt,
    reasonCode: secret.lastHealthReasonCode,
    providerValidationRequired: secret.healthStatus === 'UNKNOWN',
  };
}

async function checkSecretHealth(secretId, input = {}, actor = {}) {
  const scope = actorScope(actor, input);
  const secret = await ownedSecret(secretId, scope);
  await authorizeAction('secret.health.check', input, actor, secret);
  if (!secret.activeVersionId) {
    throw new AppError(409, ErrorCodes.SECRET_VERSION_NOT_ACTIVE, 'No active version exists.');
  }
  const version = await encryptedVersion(secret, secret.activeVersionId);
  const payload = decryptVersion(secret, version);
  let result;
  try {
    result = await validateCredential({
      provider: secret.provider,
      credentialType: secret.credentialType,
      payload,
      context: { secretId, versionId: version.versionId, nonDestructive: true },
    });
  } catch {
    result = { healthStatus: 'UNAVAILABLE', reasonCode: 'CREDENTIAL_PROVIDER_UNAVAILABLE' };
  }
  const updated = await GovernedSecret.findOneAndUpdate(
    { _id: secret._id },
    {
      $set: {
        healthStatus: result.healthStatus || 'UNKNOWN',
        lastHealthCheckedAt: new Date(),
        lastHealthReasonCode: result.reasonCode,
      },
    },
    { new: true, runValidators: true },
  );
  metrics.increment('credential_validation', { outcome: updated.healthStatus });
  return secretHealth(secretId, input, actor);
}

async function keyVersionUsage(input = {}, actor = {}) {
  const scope = await authorizeAction(
    'encryption-key.metadata.read',
    input,
    actor,
    undefined,
    'EncryptionKey',
  );
  const match = { organizationId: scope.organizationId };
  if (scope.workspaceId) match.workspaceId = scope.workspaceId;
  const counts = await SecretVersion.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          keyVersion: '$encryptionKeyVersion',
          status: '$status',
          format: '$encryptionFormat',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.keyVersion': 1, '_id.status': 1 } },
  ]);
  return {
    provider: healthMetadata(),
    usage: counts.map((item) => ({ ...item._id, count: item.count })),
  };
}

async function runRewrap(input = {}, actor = {}) {
  const scope = await authorizeAction(
    'encryption-key.rotate',
    input,
    actor,
    undefined,
    'EncryptionKey',
  );
  const targetKeyVersion = String(input.targetKeyVersion || currentKeyVersion()).trim();
  if (!hasKeyVersion(targetKeyVersion)) {
    throw new AppError(
      409,
      ErrorCodes.ENCRYPTION_KEY_UNAVAILABLE,
      'Requested encryption key version is unavailable.',
    );
  }
  const batchSize = boundedInteger(
    input.batchSize,
    50,
    1,
    SECRET_LIMITS.maximumRewrapBatchSize,
    'batchSize',
  );
  let job;
  if (input.jobId) {
    job = await EncryptionRewrapJob.findOne({
      jobId: input.jobId,
      organizationId: scope.organizationId,
      targetKeyVersion,
    });
  } else {
    job = await EncryptionRewrapJob.create({
      jobId: `rewrap_${crypto.randomUUID()}`,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      targetKeyVersion,
      status: 'PENDING',
      requestedBy: scope.actorId,
    });
    await createAuditLog(
      'partner',
      scope.partnerId,
      SECRET_AUDIT_EVENTS.REWRAP_STARTED,
      'EncryptionRewrapJob',
      job.jobId,
      { organizationId: scope.organizationId, workspaceId: scope.workspaceId, targetKeyVersion },
      { requestId: actor.requestId, traceId: actor.traceId },
    );
  }
  if (!job) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Rewrap job was not found.');
  if (job.status === 'COMPLETED') {
    return {
      jobId: job.jobId,
      targetKeyVersion: job.targetKeyVersion,
      status: job.status,
      scannedCount: job.scannedCount,
      rewrappedCount: job.rewrappedCount,
      skippedCount: job.skippedCount,
      failureCount: job.failureCount,
      lastFailureReasonCode: job.lastFailureReasonCode,
      completedAt: job.completedAt,
      idempotent: true,
    };
  }
  job.status = 'RUNNING';
  job.startedAt ||= new Date();
  await job.save();
  const filter = {
    organizationId: scope.organizationId,
    encryptionFormat: 'AAD_V1',
    encryptionKeyVersion: { $ne: targetKeyVersion },
    status: { $ne: 'DESTROYED' },
  };
  if (scope.workspaceId) filter.workspaceId = scope.workspaceId;
  if (job.lastProcessedVersionId) filter.versionId = { $gt: job.lastProcessedVersionId };
  const versions = await SecretVersion.find(filter)
    .select('+encryptedPayload')
    .sort({ versionId: 1 })
    .limit(batchSize);
  for (const version of versions) {
    job.scannedCount += 1;
    job.lastProcessedVersionId = version.versionId;
    try {
      const secret = await GovernedSecret.findOne({
        organizationId: scope.organizationId,
        secretId: version.secretId,
      }).lean();
      if (!secret) throw new Error('SECRET_NOT_FOUND');
      const encryptedPayload = reencryptSecret({
        encryptedPayload: version.encryptedPayload,
        context: secretContext(secret, version.versionId),
        targetKeyVersion,
      });
      const result = await SecretVersion.updateOne(
        {
          _id: version._id,
          encryptionKeyVersion: version.encryptionKeyVersion,
          revision: version.revision,
        },
        {
          $set: {
            encryptedPayload,
            encryptionKeyVersion: targetKeyVersion,
            encryptedAt: new Date(),
          },
          $inc: { revision: 1 },
        },
        { runValidators: true },
      );
      if (result.modifiedCount !== 1) throw new Error('REWRAP_CONFLICT');
      job.rewrappedCount += 1;
      metrics.increment('encryption_rewrap', { outcome: 'success', keyVersion: targetKeyVersion });
    } catch (error) {
      job.failureCount += 1;
      job.lastFailureReasonCode =
        error?.code === 'ENCRYPTION_KEY_UNAVAILABLE'
          ? 'ENCRYPTION_KEY_UNAVAILABLE'
          : 'ENCRYPTION_REWRAP_RECORD_FAILED';
      metrics.increment('encryption_rewrap', {
        outcome: 'failure',
        reason: job.lastFailureReasonCode,
      });
    }
    await job.save();
  }
  const remaining = await SecretVersion.exists(filter);
  if (!remaining) {
    job.status = job.failureCount ? 'COMPLETED_WITH_FAILURES' : 'COMPLETED';
    job.completedAt = new Date();
    await job.save();
    await createAuditLog(
      'partner',
      scope.partnerId,
      job.failureCount ? SECRET_AUDIT_EVENTS.REWRAP_FAILED : SECRET_AUDIT_EVENTS.REWRAP_COMPLETED,
      'EncryptionRewrapJob',
      job.jobId,
      {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        targetKeyVersion,
        scannedCount: job.scannedCount,
        rewrappedCount: job.rewrappedCount,
        failureCount: job.failureCount,
      },
      { requestId: actor.requestId, traceId: actor.traceId },
    );
  }
  return {
    jobId: job.jobId,
    targetKeyVersion: job.targetKeyVersion,
    status: job.status,
    scannedCount: job.scannedCount,
    rewrappedCount: job.rewrappedCount,
    skippedCount: job.skippedCount,
    failureCount: job.failureCount,
    lastFailureReasonCode: job.lastFailureReasonCode,
    completedAt: job.completedAt,
  };
}

async function secretAudit(input = {}, actor = {}) {
  const scope = await authorizeAction('secret.audit.read', input, actor, undefined, 'SecretAudit');
  const filter = {
    organizationId: scope.organizationId,
    $or: [
      { entityType: { $in: ['Secret', 'CredentialBinding', 'EncryptionRewrapJob'] } },
      { action: { $regex: /^(SECRET_|ENCRYPTION_REWRAP_)/ } },
    ],
  };
  if (scope.workspaceId) filter.workspaceId = scope.workspaceId;
  if (input.secretId) filter.$and = [{ 'metadata.secretId': String(input.secretId) }];
  const limit = boundedInteger(input.limit, 100, 1, 200, 'limit');
  const items = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return { items: items.map(serializeAuditLog) };
}

async function governCredentialForConnection({
  connection,
  credential,
  payload,
  actorId = 'system:credential-governance',
}) {
  const organizationId = idOf(connection.organizationId || connection.partnerId);
  const workspaceId = connection.receivingWorkspaceId;
  const existingBinding = connection.credentialBindingId
    ? await CredentialBinding.findOne({
        _id: connection.credentialBindingId,
        organizationId,
        connectionId: connection._id,
        status: 'ACTIVE',
      })
    : null;
  const payloadBuffer = serializeCredentialPayload(payload);
  try {
    if (existingBinding) {
      let secret = await GovernedSecret.findOne({
        organizationId,
        secretId: existingBinding.secretId,
      });
      if (!secret) throw new Error('Credential binding references a missing secret.');
      const versionId = `sver_${crypto.randomUUID()}`;
      const number = await nextVersionNumber(secret);
      const document = encryptedVersionDocument({
        secret,
        payloadBuffer,
        version: number,
        versionId,
        actorId,
        expiresAt: credential.expiresAt,
      });
      document.validationStatus = 'VALIDATED';
      document.validationMethod = 'LOCAL_FORMAT';
      document.validationReasonCode = 'PROVIDER_VALIDATION_NOT_SUPPORTED';
      document.validatedAt = new Date();
      await SecretVersion.create(document);
      secret = await GovernedSecret.findById(secret._id);
      const activated = await activateVersionInternal(secret, versionId, actorId);
      await Credential.updateOne(
        { _id: credential._id },
        {
          $set: {
            governedSecretId: secret.secretId,
            governedVersionId: versionId,
            credentialBindingId: existingBinding._id,
            migrationStatus: 'migrated',
            schemaVersion: 2,
          },
        },
      );
      return { secret: activated.secret, version: activated.version, binding: existingBinding };
    }
    const secretId = `sec_${crypto.randomUUID()}`;
    const versionId = `sver_${crypto.randomUUID()}`;
    const bindingId = `bind_${crypto.randomUUID()}`;
    const provider = providerNameFromAuthoritativeMetadata(
      connection.resolvedPassportSnapshot?.agent?.provider || 'agent_runtime',
    );
    const result = await withTransaction(async (session) => {
      const [secret] = await GovernedSecret.create(
        [
          {
            secretId,
            organizationId,
            workspaceId,
            name: `${connection.resolvedPassportSnapshot?.agent?.name || 'Agent'} runtime credential`,
            description: 'Governed connection credential.',
            provider,
            credentialType: credential.type,
            ownershipScope: 'WORKSPACE',
            status: 'ACTIVE',
            activeVersionId: versionId,
            healthStatus: 'UNKNOWN',
            createdBy: actorId,
            updatedBy: actorId,
          },
        ],
        { session },
      );
      const versionDocument = encryptedVersionDocument({
        secret,
        payloadBuffer,
        version: 1,
        versionId,
        actorId,
        expiresAt: credential.expiresAt,
      });
      Object.assign(versionDocument, {
        status: 'ACTIVE',
        validationStatus: 'VALIDATED',
        validationMethod: 'LOCAL_FORMAT',
        validationReasonCode: 'PROVIDER_VALIDATION_NOT_SUPPORTED',
        validatedAt: new Date(),
        activatedAt: new Date(),
      });
      const [version] = await SecretVersion.create([versionDocument], { session });
      const [binding] = await CredentialBinding.create(
        [
          {
            bindingId,
            organizationId,
            workspaceId,
            connectionId: connection._id,
            secretId,
            provider,
            purpose: 'runtime_invocation',
            allowedAdapter: connection.runtimeType,
            allowedEnvironment: 'any',
            status: 'ACTIVE',
            createdBy: actorId,
            updatedBy: actorId,
          },
        ],
        { session },
      );
      await Credential.updateOne(
        { _id: credential._id },
        {
          $set: {
            governedSecretId: secretId,
            governedVersionId: versionId,
            credentialBindingId: binding._id,
            migrationStatus: 'migrated',
            schemaVersion: 2,
          },
        },
        { session },
      );
      return { secret, version, binding };
    });
    return result;
  } finally {
    payloadBuffer.fill(0);
  }
}

async function migrateLegacyCredential(credential, connection, options = {}) {
  const organizationId = idOf(connection?.organizationId || connection?.partnerId);
  const workspaceId = String(connection?.receivingWorkspaceId || '').trim();
  if (!organizationId || !workspaceId || idOf(connection?._id) !== idOf(credential.connectionId)) {
    await Credential.updateOne(
      { _id: credential._id },
      { $set: { migrationStatus: 'recovery_required', schemaVersion: 2 } },
    );
    return { status: 'recovery_required', reasonCode: 'AMBIGUOUS_TENANT_OWNERSHIP' };
  }
  if (credential.migrationStatus === 'migrated' && connection.credentialBindingId) {
    return { status: 'migrated', idempotent: true };
  }
  const suffix = idOf(credential._id);
  const secretId = `sec_legacy_${suffix}`;
  const versionId = `sver_legacy_${suffix}`;
  const bindingId = `bind_legacy_${suffix}`;
  const secretStatus =
    credential.status === 'revoked'
      ? 'REVOKED'
      : credential.status === 'expired'
        ? 'EXPIRED'
        : credential.status === 'invalid'
          ? 'DISABLED'
          : 'ACTIVE';
  const versionStatus =
    secretStatus === 'ACTIVE'
      ? 'ACTIVE'
      : secretStatus === 'EXPIRED'
        ? 'EXPIRED'
        : secretStatus === 'REVOKED'
          ? 'REVOKED'
          : 'RETIRED';
  const context = {
    organizationId,
    workspaceId,
    secretId,
    versionId,
    credentialType: credential.type,
    schemaVersion: 1,
  };
  const fingerprint = fingerprintLegacyCiphertext(credential.encryptedPayload, context);
  const provider = providerNameFromAuthoritativeMetadata(
    connection.resolvedPassportSnapshot?.agent?.provider || 'agent_runtime',
  );
  const actorId = options.actorId || 'system:credential-migration';
  const result = await withTransaction(async (session) => {
    await GovernedSecret.updateOne(
      { organizationId, secretId },
      {
        $setOnInsert: {
          secretId,
          organizationId,
          workspaceId,
          name: `${connection.resolvedPassportSnapshot?.agent?.name || 'Legacy agent'} runtime credential`,
          description: 'Migrated legacy encrypted credential.',
          provider,
          credentialType: credential.type,
          ownershipScope: 'WORKSPACE',
          status: secretStatus,
          ...(secretStatus === 'ACTIVE' ? { activeVersionId: versionId } : {}),
          expiresAt: credential.expiresAt,
          healthStatus:
            secretStatus === 'REVOKED'
              ? 'REVOKED'
              : secretStatus === 'EXPIRED'
                ? 'EXPIRED'
                : 'UNKNOWN',
          createdBy: actorId,
          updatedBy: actorId,
          schemaVersion: 1,
        },
      },
      { upsert: true, session, runValidators: true, setDefaultsOnInsert: true },
    );
    await SecretVersion.updateOne(
      { organizationId, versionId },
      {
        $setOnInsert: {
          versionId,
          secretId,
          organizationId,
          workspaceId,
          version: 1,
          legacyEncryptedPayload: credential.encryptedPayload,
          encryptionFormat: 'LEGACY_V1',
          encryptionAlgorithm: credential.encryptedPayload.algorithm,
          encryptionKeyVersion: currentKeyVersion(),
          integrityMetadata: { aadVersion: 0, tenantBound: false },
          encryptedAt: credential.createdAt || new Date(),
          status: versionStatus,
          validationStatus: 'VALIDATED',
          validationMethod: 'LEGACY_MIGRATION',
          validationReasonCode: 'LEGACY_CIPHERTEXT_RETAINED',
          validatedAt: new Date(),
          createdBy: actorId,
          ...(versionStatus === 'ACTIVE'
            ? { activatedAt: credential.createdAt || new Date() }
            : {}),
          expiresAt: credential.expiresAt,
          fingerprintDigest: fingerprint.digest,
          safeFingerprint: fingerprint.display,
          schemaVersion: 1,
        },
      },
      { upsert: true, session, runValidators: true, setDefaultsOnInsert: true },
    );
    await CredentialBinding.updateOne(
      { organizationId, bindingId },
      {
        $setOnInsert: {
          bindingId,
          organizationId,
          workspaceId,
          connectionId: connection._id,
          secretId,
          provider,
          purpose: 'runtime_invocation',
          allowedAdapter: connection.runtimeType,
          allowedEnvironment: 'any',
          status: secretStatus === 'ACTIVE' ? 'ACTIVE' : 'REVOKED',
          createdBy: actorId,
          updatedBy: actorId,
        },
      },
      { upsert: true, session, runValidators: true, setDefaultsOnInsert: true },
    );
    const binding = await CredentialBinding.findOne({ organizationId, bindingId }).session(session);
    await Credential.updateOne(
      { _id: credential._id },
      {
        $set: {
          governedSecretId: secretId,
          governedVersionId: versionId,
          credentialBindingId: binding._id,
          migrationStatus: 'migrated',
          schemaVersion: 2,
        },
      },
      { session },
    );
    await PassportConnection.updateOne(
      { _id: connection._id, partnerId: connection.partnerId },
      { $set: { credentialBindingId: binding._id } },
      { session },
    );
    return binding;
  });
  return { status: 'migrated', secretId, versionId, bindingId: result.bindingId };
}

module.exports = {
  activateVersion,
  addPendingVersion,
  checkSecretHealth,
  createBinding,
  createSecret,
  decryptVersion,
  destroyVersion,
  disableSecret,
  enableSecret,
  getSecret,
  governCredentialForConnection,
  keyVersionUsage,
  listBindings,
  listRotations,
  listSecrets,
  listVersions,
  migrateLegacyCredential,
  revokeBinding,
  revokeSecret,
  revokeVersion,
  retireVersion,
  rotateSecret,
  runRewrap,
  secretAudit,
  secretHealth,
  serializeBinding,
  serializeSecret,
  serializeVersion,
  validateVersion,
};
