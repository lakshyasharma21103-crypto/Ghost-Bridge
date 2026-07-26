const crypto = require('node:crypto');
const Credential = require('../models/Credential');
const CredentialBinding = require('../models/CredentialBinding');
const CredentialLease = require('../models/CredentialLease');
const GovernedSecret = require('../models/GovernedSecret');
const SecretVersion = require('../models/SecretVersion');
const PassportConnection = require('../models/PassportConnection');
const { databaseStatus } = require('../config/db');
const { env } = require('../config/env');
const { createAuditLog } = require('./auditService');
const { decryptSecret, EncryptionKeyProviderError } = require('./encryptionKeyProvider.service');
const { credentialHeaders, parseCredentialPayload } = require('./credentialPayload.service');
const { migrateLegacyCredential } = require('./secretGovernance.service');
const metrics = require('./secretMetrics.service');
const { decryptPayload } = require('../utils/crypto');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { SECRET_AUDIT_EVENTS, SECRET_LIMITS } = require('../constants/secretGovernance');
const { assertOperationalAccess } = require('./operationalState.service');

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function safeError(code, message, options = {}) {
  return new AppError(options.statusCode || 409, code, message, [], {
    reasonCode: options.reasonCode || code,
    retryable: options.retryable === true,
    recoveryRequired: options.recoveryRequired === true,
  });
}

function assertTenant(connection, input) {
  const organizationId = idOf(connection.organizationId || connection.partnerId);
  const workspaceId = String(connection.receivingWorkspaceId || '');
  const legacyTestScope =
    env.NODE_ENV !== 'production' &&
    databaseStatus() !== 'connected' &&
    !organizationId &&
    !String(input.organizationId || '');
  if (
    (!organizationId && !legacyTestScope) ||
    !workspaceId ||
    organizationId !== String(input.organizationId || '') ||
    workspaceId !== String(input.workspaceId || '') ||
    idOf(connection) !== String(input.connectionId || '')
  ) {
    throw safeError(ErrorCodes.SECRET_ACCESS_DENIED, 'Credential access denied.', {
      statusCode: 403,
      reasonCode: 'TENANT_SCOPE_MISMATCH',
    });
  }
  return { organizationId, workspaceId };
}

async function validateCredentialStateForConnection(input = {}) {
  const connection =
    input.trustedConnection ||
    (await PassportConnection.findOne({
      _id: input.connectionId,
      receivingWorkspaceId: input.workspaceId,
    }));
  if (!connection) throw safeError(ErrorCodes.SECRET_ACCESS_DENIED, 'Credential access denied.');
  assertTenant(connection, input);
  if (connection.status !== 'connected') {
    throw safeError(ErrorCodes.SECRET_ACCESS_DENIED, 'Connection is not connected.');
  }
  if (!connection.credentialBindingId) {
    if (!connection.credentialId) {
      const auth = input.passportAuth || connection.resolvedPassportSnapshot?.auth || {};
      const credentialRequired = Boolean(auth.type && auth.type !== 'no_auth_dev');
      if (input.allowMissing || !credentialRequired) {
        return { credentialRequired: false, legacy: true };
      }
      throw safeError(ErrorCodes.CREDENTIAL_REQUIRED, 'A runtime credential is required.');
    }
    const credential = await Credential.findOne({
      _id: connection.credentialId,
      connectionId: connection._id,
      status: 'active',
    }).lean();
    if (!credential) throw safeError(ErrorCodes.CREDENTIAL_REQUIRED, 'Credential is unavailable.');
    if (credential.expiresAt && new Date(credential.expiresAt) <= new Date()) {
      throw safeError(ErrorCodes.SECRET_EXPIRED, 'Credential is expired.');
    }
    return { credentialRequired: true, legacy: true };
  }
  if (
    input.expectedCredentialBindingId &&
    idOf(connection.credentialBindingId) !== idOf(input.expectedCredentialBindingId)
  ) {
    throw safeError(
      ErrorCodes.SECRET_BINDING_INVALID,
      'Credential binding changed before execution.',
      { reasonCode: 'QUEUED_CREDENTIAL_BINDING_CHANGED' },
    );
  }
  const binding = await CredentialBinding.findOne({
    _id: connection.credentialBindingId,
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
    connectionId: connection._id,
  }).lean();
  if (!binding || binding.status !== 'ACTIVE') {
    throw safeError(
      binding?.status === 'REVOKED'
        ? ErrorCodes.SECRET_BINDING_REVOKED
        : ErrorCodes.SECRET_BINDING_INVALID,
      'Credential binding is unavailable.',
    );
  }
  if (input.adapterId && binding.allowedAdapter !== input.adapterId) {
    throw safeError(ErrorCodes.SECRET_BINDING_INVALID, 'Credential adapter is not allowed.');
  }
  const secret = await GovernedSecret.findOne({
    organizationId: input.organizationId,
    secretId: binding.secretId,
  }).lean();
  if (!secret) throw safeError(ErrorCodes.SECRET_ACCESS_DENIED, 'Credential access denied.');
  const invalidLifecycle = lifecycleError(secret, new Date());
  if (invalidLifecycle) throw invalidLifecycle;
  const version = await SecretVersion.findOne({
    organizationId: input.organizationId,
    secretId: secret.secretId,
    versionId: secret.activeVersionId,
  }).lean();
  if (!version || version.status !== 'ACTIVE') {
    throw safeError(ErrorCodes.SECRET_VERSION_NOT_ACTIVE, 'Credential version is unavailable.');
  }
  if (version.expiresAt && new Date(version.expiresAt) <= new Date()) {
    throw safeError(ErrorCodes.SECRET_EXPIRED, 'Credential is expired.');
  }
  return {
    credentialRequired: true,
    legacy: false,
    bindingId: binding.bindingId,
    secretId: secret.secretId,
    secretVersionId: version.versionId,
  };
}

function secretContext(secret, version) {
  return {
    organizationId: secret.organizationId,
    workspaceId: secret.workspaceId,
    secretId: secret.secretId,
    versionId: version.versionId,
    credentialType: secret.credentialType,
    schemaVersion: 1,
  };
}

function lifecycleError(secret, now) {
  if (secret.status === 'DISABLED') {
    return safeError(ErrorCodes.SECRET_DISABLED, 'Credential is disabled.');
  }
  if (secret.status === 'REVOKED' || secret.status === 'DESTROYED') {
    return safeError(ErrorCodes.SECRET_REVOKED, 'Credential is revoked.');
  }
  if (secret.status === 'EXPIRED' || (secret.expiresAt && new Date(secret.expiresAt) <= now)) {
    return safeError(ErrorCodes.SECRET_EXPIRED, 'Credential is expired.');
  }
  if (secret.status !== 'ACTIVE') {
    return safeError(ErrorCodes.SECRET_ACCESS_DENIED, 'Credential is unavailable.');
  }
  return undefined;
}

async function auditAccess(event, input, metadata) {
  try {
    await createAuditLog(
      input.actorType || 'system',
      input.actorId || 'system:credential-broker',
      event,
      'Secret',
      metadata.secretId || 'unavailable',
      {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        connectionId: input.connectionId,
        invocationId: input.invocationId,
        adapterId: input.adapterId,
        purpose: input.purpose,
        ...metadata,
      },
      {
        requestId: input.requestId,
        traceId: input.traceId,
        invocationId: input.invocationId,
      },
    );
  } catch {
    // Existing runtime audit behavior is best-effort; secret use still fails closed independently.
  }
}

async function issueLease({ input, binding, secret, version, now }) {
  const ttlMs = Math.min(
    SECRET_LIMITS.maximumLeaseTtlMs,
    Math.max(1_000, Number(input.leaseTtlMs || SECRET_LIMITS.defaultLeaseTtlMs)),
  );
  const expiresAt = new Date(now.getTime() + ttlMs);
  const lease = await CredentialLease.create({
    leaseId: `lease_${crypto.randomUUID()}`,
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
    secretId: secret.secretId,
    secretVersionId: version.versionId,
    bindingId: binding.bindingId,
    connectionId: input.connectionId,
    invocationId: input.invocationId || undefined,
    adapterId: input.adapterId,
    allowedPurpose: input.purpose,
    oneUse: true,
    issuedAt: now,
    expiresAt,
    purgeAt: new Date(expiresAt.getTime() + SECRET_LIMITS.leaseEvidenceRetentionMs),
    status: 'ISSUED',
  });
  metrics.increment('credential_lease', { outcome: 'issued' });
  return lease;
}

async function consumeLease(lease, input, now = new Date()) {
  if (lease.organizationId !== input.organizationId || lease.workspaceId !== input.workspaceId) {
    throw safeError(ErrorCodes.CREDENTIAL_LEASE_REVOKED, 'Credential lease is invalid.');
  }
  if (new Date(lease.expiresAt) <= now) {
    await CredentialLease.updateOne(
      { _id: lease._id, status: 'ISSUED' },
      { $set: { status: 'EXPIRED', rejectionReasonCode: 'CREDENTIAL_LEASE_EXPIRED' } },
    );
    metrics.increment('credential_lease', { outcome: 'rejected', reason: 'expired' });
    throw safeError(ErrorCodes.CREDENTIAL_LEASE_EXPIRED, 'Credential lease expired.');
  }
  const consumed = await CredentialLease.findOneAndUpdate(
    {
      _id: lease._id,
      leaseId: lease.leaseId,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      connectionId: input.connectionId,
      adapterId: input.adapterId,
      allowedPurpose: input.purpose,
      status: 'ISSUED',
      expiresAt: { $gt: now },
    },
    { $set: { status: 'CONSUMED', consumedAt: now } },
    { new: true },
  );
  if (!consumed) {
    metrics.increment('credential_lease', { outcome: 'rejected', reason: 'consumed_or_revoked' });
    throw safeError(ErrorCodes.CREDENTIAL_LEASE_REVOKED, 'Credential lease is no longer valid.');
  }
  return consumed;
}

async function legacyCredentialAccess(connection, input, defaults) {
  const credential = await Credential.findOne({
    _id: connection.credentialId,
    connectionId: connection._id,
    status: 'active',
  }).lean();
  if (!credential) throw safeError(ErrorCodes.CREDENTIAL_REQUIRED, 'Credential is unavailable.');
  if (credential.expiresAt && new Date(credential.expiresAt) <= new Date()) {
    throw safeError(ErrorCodes.SECRET_EXPIRED, 'Credential is expired.');
  }
  let payload;
  try {
    payload = decryptPayload(credential.encryptedPayload);
  } catch {
    throw safeError(
      ErrorCodes.SECRET_DECRYPTION_FAILED,
      'Stored credential could not be prepared securely.',
      { statusCode: 500, recoveryRequired: true },
    );
  }
  const headers = credentialHeaders(credential.type, payload, defaults);
  await auditAccess(SECRET_AUDIT_EVENTS.RUNTIME_ACCESS_ALLOWED, input, {
    secretId: credential.governedSecretId || `legacy:${idOf(credential)}`,
    secretVersionId: credential.governedVersionId,
    bindingId: idOf(connection.credentialBindingId) || undefined,
    decision: 'ALLOW',
    reasonCode: 'LEGACY_DUAL_READ_ALLOWED',
  });
  return {
    credentialHeaders: headers,
    safe: {
      legacy: true,
      secretId: credential.governedSecretId,
      secretVersionId: credential.governedVersionId,
      bindingId: idOf(connection.credentialBindingId) || undefined,
    },
    async release() {
      for (const key of Object.keys(headers)) delete headers[key];
      payload = undefined;
    },
  };
}

async function resolveCredentialForRuntime(input = {}) {
  const startedAt = Date.now();
  let secretForAudit;
  try {
    const connection =
      input.trustedConnection ||
      (await PassportConnection.findOne({
        _id: input.connectionId,
        receivingWorkspaceId: input.workspaceId,
      }));
    if (!connection) throw safeError(ErrorCodes.SECRET_ACCESS_DENIED, 'Credential access denied.');
    assertTenant(connection, input);
    await assertOperationalAccess({
      organizationId: input.organizationId || connection.organizationId || connection.partnerId,
      partnerId: connection.partnerId,
      workspaceId: input.workspaceId || connection.receivingWorkspaceId,
      connectionId: idOf(connection),
      adapterId: input.adapterId || connection.runtimeType,
      operation: 'CREDENTIAL_OPERATION',
      existingClaim: Boolean(input.durableWorkItemId),
    });
    if (connection.status !== 'connected') {
      throw safeError(ErrorCodes.SECRET_ACCESS_DENIED, 'Connection is not connected.');
    }

    if (!connection.credentialBindingId) {
      if (!connection.credentialId) {
        const auth = input.passportAuth || connection.resolvedPassportSnapshot?.auth || {};
        const credentialRequired = Boolean(auth.type && auth.type !== 'no_auth_dev');
        if (input.allowMissing || !credentialRequired) {
          return {
            credentialHeaders: {},
            safe: { credentialRequired: false },
            release: async () => undefined,
          };
        }
        throw safeError(ErrorCodes.CREDENTIAL_REQUIRED, 'A runtime credential is required.');
      }
      if (databaseStatus() === 'connected') {
        const legacy = await Credential.findOne({
          _id: connection.credentialId,
          connectionId: connection._id,
        }).lean();
        if (legacy) {
          try {
            await migrateLegacyCredential(legacy, connection, {
              actorId: 'system:credential-broker-migration',
            });
            const refreshed = await PassportConnection.findById(connection._id);
            return resolveCredentialForRuntime({ ...input, trustedConnection: refreshed });
          } catch (error) {
            if (env.NODE_ENV === 'production') throw error;
          }
        }
      }
      return legacyCredentialAccess(connection, input, input.passportAuth || {});
    }

    if (
      input.expectedCredentialBindingId &&
      idOf(connection.credentialBindingId) !== idOf(input.expectedCredentialBindingId)
    ) {
      throw safeError(
        ErrorCodes.SECRET_BINDING_INVALID,
        'Credential binding changed before execution.',
        { reasonCode: 'QUEUED_CREDENTIAL_BINDING_CHANGED' },
      );
    }
    const binding = await CredentialBinding.findOne({
      _id: connection.credentialBindingId,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      connectionId: connection._id,
    });
    if (!binding)
      throw safeError(ErrorCodes.SECRET_BINDING_INVALID, 'Credential binding is invalid.');
    if (binding.status === 'REVOKED') {
      throw safeError(ErrorCodes.SECRET_BINDING_REVOKED, 'Credential binding is revoked.');
    }
    if (binding.status !== 'ACTIVE') {
      throw safeError(ErrorCodes.SECRET_BINDING_INVALID, 'Credential binding is unavailable.');
    }
    if (binding.allowedAdapter !== input.adapterId) {
      throw safeError(ErrorCodes.SECRET_BINDING_INVALID, 'Credential adapter is not allowed.');
    }
    const environment = String(input.environment || env.NODE_ENV).toLowerCase();
    if (binding.allowedEnvironment !== 'any' && binding.allowedEnvironment !== environment) {
      throw safeError(ErrorCodes.SECRET_BINDING_INVALID, 'Credential environment is not allowed.');
    }
    if (
      binding.capabilityRestrictions?.length &&
      !binding.capabilityRestrictions.includes(String(input.capabilityId || ''))
    ) {
      throw safeError(ErrorCodes.SECRET_BINDING_INVALID, 'Credential capability is not allowed.');
    }
    if (
      binding.purpose !== input.purpose &&
      !(binding.purpose === 'runtime_invocation' && input.purpose === 'connection_health_check')
    ) {
      throw safeError(ErrorCodes.SECRET_BINDING_INVALID, 'Credential purpose is not allowed.');
    }

    const secret = await GovernedSecret.findOne({
      organizationId: input.organizationId,
      secretId: binding.secretId,
    });
    secretForAudit = secret;
    if (!secret) throw safeError(ErrorCodes.SECRET_ACCESS_DENIED, 'Credential access denied.');
    if (secret.workspaceId && secret.workspaceId !== input.workspaceId) {
      throw safeError(ErrorCodes.SECRET_ACCESS_DENIED, 'Credential access denied.');
    }
    const now = new Date();
    const stateError = lifecycleError(secret, now);
    if (stateError) {
      if (stateError.code === ErrorCodes.SECRET_EXPIRED) {
        await GovernedSecret.updateOne(
          { _id: secret._id, status: 'ACTIVE' },
          {
            $set: {
              status: 'EXPIRED',
              healthStatus: 'EXPIRED',
              lastHealthReasonCode: 'SECRET_EXPIRED',
            },
          },
        );
      }
      throw stateError;
    }
    if (!secret.activeVersionId) {
      throw safeError(
        ErrorCodes.SECRET_VERSION_NOT_ACTIVE,
        'Active credential version is unavailable.',
      );
    }
    const version = await SecretVersion.findOne({
      organizationId: input.organizationId,
      secretId: secret.secretId,
      versionId: secret.activeVersionId,
      status: 'ACTIVE',
    }).select('+encryptedPayload +legacyEncryptedPayload');
    if (!version) {
      throw safeError(
        ErrorCodes.SECRET_VERSION_NOT_ACTIVE,
        'Active credential version is unavailable.',
      );
    }
    if (version.expiresAt && new Date(version.expiresAt) <= now) {
      await SecretVersion.updateOne(
        { _id: version._id, status: 'ACTIVE' },
        { $set: { status: 'EXPIRED' }, $inc: { revision: 1 } },
      );
      throw safeError(ErrorCodes.SECRET_EXPIRED, 'Credential version is expired.');
    }

    const lease = await issueLease({ input, binding, secret, version, now });
    await consumeLease(lease, input, now);
    let plaintextBuffer;
    let payload;
    try {
      if (version.encryptionFormat === 'LEGACY_V1') {
        payload = decryptPayload(version.legacyEncryptedPayload);
      } else {
        plaintextBuffer = decryptSecret({
          encryptedPayload: version.encryptedPayload,
          context: secretContext(secret, version),
        });
        payload = parseCredentialPayload(plaintextBuffer);
      }
      const headers = credentialHeaders(secret.credentialType, payload, input.passportAuth || {});
      await auditAccess(SECRET_AUDIT_EVENTS.RUNTIME_ACCESS_ALLOWED, input, {
        secretId: secret.secretId,
        secretVersionId: version.versionId,
        bindingId: binding.bindingId,
        leaseId: lease.leaseId,
        decision: 'ALLOW',
        reasonCode: 'SECRET_RUNTIME_ACCESS_ALLOWED',
      });
      metrics.increment('credential_resolution', { outcome: 'success' });
      return {
        credentialHeaders: headers,
        safe: {
          secretId: secret.secretId,
          secretVersionId: version.versionId,
          bindingId: binding.bindingId,
          leaseId: lease.leaseId,
          leaseExpiresAt: lease.expiresAt,
          keyVersion: version.encryptionKeyVersion,
        },
        async release() {
          plaintextBuffer?.fill(0);
          plaintextBuffer = undefined;
          payload = undefined;
          for (const key of Object.keys(headers)) delete headers[key];
        },
      };
    } catch (error) {
      plaintextBuffer?.fill(0);
      await CredentialLease.updateOne(
        { _id: lease._id },
        {
          $set: {
            status: 'REJECTED',
            rejectionReasonCode: error.code || 'SECRET_DECRYPTION_FAILED',
          },
        },
      );
      throw error;
    }
  } catch (error) {
    const mapped =
      error instanceof EncryptionKeyProviderError
        ? safeError(
            error.code === 'ENCRYPTION_KEY_UNAVAILABLE'
              ? ErrorCodes.ENCRYPTION_KEY_UNAVAILABLE
              : error.code === 'SECRET_INTEGRITY_FAILED'
                ? ErrorCodes.SECRET_INTEGRITY_FAILED
                : ErrorCodes.SECRET_DECRYPTION_FAILED,
            'Stored credential could not be prepared securely.',
            { statusCode: 500, recoveryRequired: true },
          )
        : error;
    const reasonCode = mapped?.reasonCode || mapped?.code || ErrorCodes.SECRET_ACCESS_DENIED;
    metrics.increment('credential_resolution', { outcome: 'failure', reason: reasonCode });
    if (
      secretForAudit &&
      [
        ErrorCodes.SECRET_INTEGRITY_FAILED,
        ErrorCodes.ENCRYPTION_KEY_UNAVAILABLE,
        ErrorCodes.SECRET_REVOKED,
      ].includes(mapped?.code)
    ) {
      metrics.increment('credential_security_failure', { reason: mapped.code });
    }
    await auditAccess(SECRET_AUDIT_EVENTS.RUNTIME_ACCESS_DENIED, input, {
      secretId: secretForAudit?.secretId,
      decision: 'DENY',
      reasonCode,
    });
    throw mapped;
  } finally {
    metrics.observeBrokerDuration(Date.now() - startedAt);
  }
}

module.exports = {
  consumeLease,
  resolveCredentialForRuntime,
  validateCredentialStateForConnection,
};
