const crypto = require('node:crypto');
const { env } = require('../config/env');
const { AppError } = require('./AppError');
const { ErrorCodes } = require('./errorCodes');

const MAX_IDEMPOTENCY_KEY_LENGTH = 256;
const HASH_PREFIX = 'hmac-sha256:';

function canonicalize(value, seen = new WeakSet()) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Request values must be finite numbers.');
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    throw new TypeError('Request values must be JSON serializable.');
  }
  if (seen.has(value)) throw new TypeError('Request values must not contain cycles.');
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    result = `[${value.map((item) => canonicalize(item, seen)).join(',')}]`;
  } else {
    result = `{${Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key], seen)}`)
      .join(',')}}`;
  }
  seen.delete(value);
  return result;
}

function hashingSecret() {
  // Production already requires CREDENTIAL_ENCRYPTION_KEY. Domain separation keeps
  // idempotency digests independent from encrypted credential material.
  return (
    env.CREDENTIAL_ENCRYPTION_KEY ||
    'agent-passport-runtime-gateway:development-idempotency-hashing-only'
  );
}

function secureDigest(purpose, value) {
  return `${HASH_PREFIX}${crypto
    .createHmac('sha256', hashingSecret())
    .update(`ghost-bridge:${purpose}:v1\0`, 'utf8')
    .update(String(value), 'utf8')
    .digest('hex')}`;
}

function normalizeClientKey(value) {
  if (value == null || value === '') {
    return { value: crypto.randomUUID(), clientProvided: false };
  }
  if (Array.isArray(value) || typeof value !== 'string') {
    throw new AppError(
      400,
      ErrorCodes.IDEMPOTENCY_KEY_INVALID,
      'Idempotency-Key must be a single string value.',
    );
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new AppError(
      400,
      ErrorCodes.IDEMPOTENCY_KEY_INVALID,
      `Idempotency-Key must contain between 1 and ${MAX_IDEMPOTENCY_KEY_LENGTH} characters.`,
    );
  }
  return { value: normalized, clientProvided: true };
}

function createInvocationIdempotency({ clientKey, connectionId, capability, input }) {
  const normalizedKey = normalizeClientKey(clientKey);
  const scope = `runtime.invoke:${String(connectionId)}`;
  const normalizedRequest = canonicalize({
    capability: String(capability),
    connectionId: String(connectionId),
    input,
  });
  return Object.freeze({
    scope,
    keyHash: secureDigest('idempotency-key', normalizedKey.value),
    requestFingerprint: secureDigest('invocation-request', normalizedRequest),
    clientProvided: normalizedKey.clientProvided,
  });
}

function hashesEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function isDuplicateKeyError(error) {
  return error?.code === 11000 || error?.code === 11001;
}

module.exports = {
  MAX_IDEMPOTENCY_KEY_LENGTH,
  canonicalize,
  createInvocationIdempotency,
  hashesEqual,
  isDuplicateKeyError,
  normalizeClientKey,
  secureDigest,
};
