const crypto = require('node:crypto');
const { env } = require('../config/env');

const INSTALL_KEY_PREFIX = 'agentpass_install_';
const PARTNER_API_KEY_PREFIX = 'agentpass_partner_';
const HASH_ALGORITHM = 'sha256';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function secureRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function generateInstallKey() {
  return `${INSTALL_KEY_PREFIX}${secureRandomToken(32)}`;
}

function generatePartnerApiKey() {
  return `${PARTNER_API_KEY_PREFIX}${secureRandomToken(32)}`;
}

function hashKey(rawKey) {
  if (typeof rawKey !== 'string' || rawKey.length === 0) {
    throw new Error('Cannot hash an empty key.');
  }

  return `${HASH_ALGORITHM}:${crypto.createHash(HASH_ALGORITHM).update(rawKey, 'utf8').digest('hex')}`;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left), 'utf8');
  const rightBuffer = Buffer.from(String(right), 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyKey(rawKey, hash) {
  if (typeof rawKey !== 'string' || typeof hash !== 'string') return false;
  return safeEqual(hashKey(rawKey), hash);
}

function hashPartnerApiKey(rawKey) {
  return hashKey(rawKey);
}

function encryptionKey() {
  const configured = env.CREDENTIAL_ENCRYPTION_KEY;
  if (!configured) {
    if (env.NODE_ENV === 'development') {
      return crypto
        .createHash('sha256')
        .update('agent-passport-runtime-gateway:development-encryption-key')
        .digest();
    }
    throw new Error('CREDENTIAL_ENCRYPTION_KEY is required outside development.');
  }

  if (/^[a-f0-9]{64}$/i.test(configured)) {
    return Buffer.from(configured, 'hex');
  }

  const base64 = Buffer.from(configured, 'base64');
  if (/^[A-Za-z0-9+/=_-]+$/.test(configured) && base64.length === 32) {
    return base64;
  }

  return crypto.createHash('sha256').update(configured, 'utf8').digest();
}

function encryptPayload(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    algorithm: ENCRYPTION_ALGORITHM,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decryptPayload(encryptedPayload) {
  if (!encryptedPayload || encryptedPayload.algorithm !== ENCRYPTION_ALGORITHM) {
    throw new Error('Encrypted payload algorithm is not supported.');
  }

  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    encryptionKey(),
    Buffer.from(encryptedPayload.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(encryptedPayload.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString('utf8'));
}

module.exports = {
  INSTALL_KEY_PREFIX,
  PARTNER_API_KEY_PREFIX,
  generateInstallKey,
  hashKey,
  verifyKey,
  generatePartnerApiKey,
  hashPartnerApiKey,
  encryptPayload,
  decryptPayload,
};
