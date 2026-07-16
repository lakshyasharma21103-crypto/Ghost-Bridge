const crypto = require('node:crypto');
const { env } = require('../config/env');
const { ENCRYPTION_AAD_VERSION, SECRET_LIMITS } = require('../constants/secretGovernance');

const ALGORITHM = 'aes-256-gcm';

class EncryptionKeyProviderError extends Error {
  constructor(code, options = {}) {
    super('Secret cryptographic operation could not be completed securely.');
    this.name = 'EncryptionKeyProviderError';
    this.code = code;
    this.retryable = options.retryable === true;
    this.recoveryRequired = options.recoveryRequired !== false;
  }
}

function keyBuffer(configured) {
  if (!configured) {
    if (env.NODE_ENV !== 'development') {
      throw new EncryptionKeyProviderError('ENCRYPTION_KEY_UNAVAILABLE');
    }
    return crypto
      .createHash('sha256')
      .update('agent-passport-runtime-gateway:development-encryption-key')
      .digest();
  }
  if (/^[a-f0-9]{64}$/i.test(configured)) return Buffer.from(configured, 'hex');
  const base64 = Buffer.from(configured, 'base64');
  if (/^[A-Za-z0-9+/=_-]+$/.test(configured) && base64.length === 32) return base64;
  return crypto.createHash('sha256').update(configured, 'utf8').digest();
}

function contextFields(context = {}) {
  const fields = {
    organizationId: String(context.organizationId || '').trim(),
    workspaceId: String(context.workspaceId || '').trim(),
    secretId: String(context.secretId || '').trim(),
    versionId: String(context.versionId || '').trim(),
    credentialType: String(context.credentialType || '').trim(),
    schemaVersion: Number(context.schemaVersion || 1),
  };
  if (
    !fields.organizationId ||
    !fields.secretId ||
    !fields.versionId ||
    !fields.credentialType ||
    !Number.isInteger(fields.schemaVersion)
  ) {
    throw new EncryptionKeyProviderError('SECRET_ENCRYPTION_CONTEXT_INVALID', {
      recoveryRequired: false,
    });
  }
  return fields;
}

function authenticatedData(context) {
  const fields = contextFields(context);
  return Buffer.from(
    JSON.stringify([
      'ghost-bridge-secret',
      ENCRYPTION_AAD_VERSION,
      fields.organizationId,
      fields.workspaceId,
      fields.secretId,
      fields.versionId,
      fields.credentialType,
      fields.schemaVersion,
    ]),
    'utf8',
  );
}

function currentKeyVersion() {
  return env.CREDENTIAL_ENCRYPTION_KEY_VERSION;
}

function hasKeyVersion(version) {
  return Object.hasOwn(env.CREDENTIAL_ENCRYPTION_KEYS, String(version || ''));
}

function keyForVersion(version) {
  if (!hasKeyVersion(version)) {
    throw new EncryptionKeyProviderError('ENCRYPTION_KEY_UNAVAILABLE');
  }
  return keyBuffer(env.CREDENTIAL_ENCRYPTION_KEYS[version]);
}

function plaintextBuffer(value) {
  const buffer = Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(String(value), 'utf8');
  if (!buffer.length || buffer.length > SECRET_LIMITS.maximumPlaintextBytes) {
    buffer.fill(0);
    throw new EncryptionKeyProviderError('SECRET_VALUE_INVALID', { recoveryRequired: false });
  }
  return buffer;
}

function encryptSecret({ plaintext, context, keyVersion = currentKeyVersion() }) {
  const input = plaintextBuffer(plaintext);
  const aad = authenticatedData(context);
  const iv = crypto.randomBytes(12);
  const key = keyForVersion(keyVersion);
  try {
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(input), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      algorithm: ALGORITHM,
      keyVersion,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      aadVersion: ENCRYPTION_AAD_VERSION,
    };
  } finally {
    input.fill(0);
    key.fill(0);
    aad.fill(0);
  }
}

function decryptSecret({ encryptedPayload, context }) {
  if (
    !encryptedPayload ||
    encryptedPayload.algorithm !== ALGORITHM ||
    encryptedPayload.aadVersion !== ENCRYPTION_AAD_VERSION
  ) {
    throw new EncryptionKeyProviderError('SECRET_DECRYPTION_FAILED');
  }
  const aad = authenticatedData(context);
  const key = keyForVersion(encryptedPayload.keyVersion);
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(encryptedPayload.iv, 'base64'),
    );
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(encryptedPayload.tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedPayload.ciphertext, 'base64')),
      decipher.final(),
    ]);
  } catch (error) {
    if (error instanceof EncryptionKeyProviderError) throw error;
    throw new EncryptionKeyProviderError('SECRET_INTEGRITY_FAILED');
  } finally {
    key.fill(0);
    aad.fill(0);
  }
}

function fingerprintSecret({ plaintext, context }) {
  const input = plaintextBuffer(plaintext);
  const key = keyForVersion(currentKeyVersion());
  try {
    const digest = crypto
      .createHmac('sha256', key)
      .update('ghost-bridge-secret-fingerprint-v1\0')
      .update(authenticatedData(context))
      .update(input)
      .digest('hex');
    return { digest: `hmac-sha256:${digest}`, display: `fp_${digest.slice(0, 12)}` };
  } finally {
    input.fill(0);
    key.fill(0);
  }
}

function fingerprintLegacyCiphertext(encryptedPayload, context) {
  return fingerprintSecret({ plaintext: JSON.stringify(encryptedPayload), context });
}

function reencryptSecret({ encryptedPayload, context, targetKeyVersion = currentKeyVersion() }) {
  const plaintext = decryptSecret({ encryptedPayload, context });
  try {
    return encryptSecret({ plaintext, context, keyVersion: targetKeyVersion });
  } finally {
    plaintext.fill(0);
  }
}

function healthMetadata() {
  return {
    provider: 'environment-key-ring',
    configured: hasKeyVersion(currentKeyVersion()),
    currentKeyVersion: currentKeyVersion(),
    availableKeyVersions: Object.keys(env.CREDENTIAL_ENCRYPTION_KEYS).sort(),
  };
}

module.exports = {
  EncryptionKeyProviderError,
  authenticatedData,
  currentKeyVersion,
  decryptSecret,
  encryptSecret,
  fingerprintLegacyCiphertext,
  fingerprintSecret,
  hasKeyVersion,
  healthMetadata,
  reencryptSecret,
};
