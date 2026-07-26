'use strict';

const crypto = require('node:crypto');
const net = require('node:net');
const { assertPlainData, redactPublicData } = require('@ghostbridge/protocol-core');
const { createNodeSecurityTransport } = require('./nodeTransport');

const TRUST_PROFILE_VERSION = 'ghostbridge-trust/0.1-draft';
const CANONICALIZATION_PROFILE = 'ghostbridge-jcs/0.1-draft';
const PROOF_PROFILE = 'ghostbridge-proof/0.1-draft';
const REQUEST_INTEGRITY_PROFILE = 'ghostbridge-http-signature/0.1-draft';
const PROOF_TYPE = 'ghostbridge-proof+jws';
const MANDATORY_ALGORITHM = 'EdDSA';
const ALLOWED_ALGORITHMS = Object.freeze(['EdDSA']);
const PROHIBITED_ALGORITHMS = Object.freeze(['none', 'HS256', 'HS384', 'HS512']);
const PRIVATE_JWK_MEMBERS = Object.freeze([
  'd',
  'p',
  'q',
  'dp',
  'dq',
  'qi',
  'oth',
  'k',
]);
const KEY_STATES = Object.freeze([
  'generated',
  'prepublished',
  'active',
  'retiring',
  'retired',
  'suspended',
  'revoked',
  'expired',
  'compromised',
]);
const KEY_PURPOSES = Object.freeze([
  'issuer_metadata',
  'passport_signing',
  'capability_signing',
  'install_resolution_signing',
  'connection_offer_signing',
  'revocation_signing',
  'agent_key_authorization',
  'execution_receipt_signing',
  'request_signing',
  'recovery',
]);
const TRUST_RESULTS = Object.freeze([
  'verified_and_trusted',
  'cryptographically_valid_review_required',
  'cryptographically_valid_untrusted_issuer',
  'verified_with_warning',
  'indeterminate',
  'suspended',
  'revoked',
  'blocked',
  'invalid',
]);
const ISSUER_STATUSES = Object.freeze([
  'active',
  'restricted',
  'suspended',
  'compromised',
  'retired',
]);
const REVOCATION_FRESHNESS = Object.freeze([
  'fresh',
  'nearing_expiry',
  'stale',
  'unavailable',
  'invalid',
  'rollback_detected',
]);
const ISSUER_REVIEW_STATES = Object.freeze([
  'discovered',
  'pending_review',
  'approved',
  'approved_with_limits',
  'suspended',
  'blocked',
  'expired_review',
  'revoked',
]);
const ISSUER_REVIEW_TRANSITIONS = Object.freeze({
  discovered: Object.freeze(['pending_review', 'blocked']),
  pending_review: Object.freeze(['approved', 'approved_with_limits', 'suspended', 'blocked']),
  approved: Object.freeze(['pending_review', 'suspended', 'blocked', 'expired_review', 'revoked']),
  approved_with_limits: Object.freeze(['pending_review', 'approved', 'suspended', 'blocked', 'expired_review', 'revoked']),
  suspended: Object.freeze(['pending_review', 'blocked', 'revoked']),
  blocked: Object.freeze(['pending_review', 'revoked']),
  expired_review: Object.freeze(['pending_review', 'blocked', 'revoked']),
  revoked: Object.freeze([]),
});
const TRUST_ERROR_CODES = Object.freeze([
  'ISSUER_INVALID',
  'ISSUER_NOT_TRUSTED',
  'ISSUER_BLOCKED',
  'ISSUER_SUSPENDED',
  'ISSUER_COMPROMISED',
  'ISSUER_METADATA_INVALID',
  'ISSUER_METADATA_EXPIRED',
  'ISSUER_METADATA_ROLLBACK',
  'ISSUER_DISCOVERY_FAILED',
  'JWKS_INVALID',
  'KEY_NOT_FOUND',
  'KEY_NOT_ACTIVE',
  'KEY_EXPIRED',
  'KEY_RETIRED',
  'KEY_REVOKED',
  'KEY_COMPROMISED',
  'KEY_TYPE_MISMATCH',
  'ALGORITHM_UNSUPPORTED',
  'ALGORITHM_NOT_ALLOWED',
  'PROOF_REQUIRED',
  'PROOF_INVALID',
  'SIGNATURE_INVALID',
  'PAYLOAD_DIGEST_MISMATCH',
  'CAPABILITY_MANIFEST_MISMATCH',
  'AUDIENCE_MISMATCH',
  'ISSUER_MISMATCH',
  'MESSAGE_EXPIRED',
  'MESSAGE_NOT_YET_VALID',
  'NONCE_REQUIRED',
  'NONCE_INVALID',
  'REPLAY_DETECTED',
  'REPLAY_CAPACITY_EXCEEDED',
  'REVOCATION_STATUS_STALE',
  'REVOCATION_STATUS_UNAVAILABLE',
  'REVOCATION_SET_INVALID',
  'REVOCATION_ROLLBACK',
  'CONNECTION_TRUST_INVALID',
  'RECEIPT_PROOF_INVALID',
  'HISTORICAL_TRUST_INDETERMINATE',
  'TRUST_POLICY_DENIED',
  'TRUST_REVIEW_REQUIRED',
  'UNSAFE_DISCOVERY_TARGET',
  'RESPONSE_TOO_LARGE',
]);
const DEFAULT_TRUST_LIMITS = Object.freeze({
  maximumIssuerMetadataBytes: 65_536,
  maximumJwksBytes: 131_072,
  maximumKeys: 64,
  maximumProofBytes: 32_768,
  maximumPassportBytes: 262_144,
  maximumCapabilityManifestEntries: 256,
  maximumRevocationEntries: 10_000,
  maximumCanonicalBytes: 1_048_576,
  maximumStringLength: 65_536,
  maximumArrayLength: 10_000,
  maximumObjectDepth: 32,
  maximumRedirects: 0,
  networkTimeoutMs: 5_000,
  verificationTimeoutMs: 5_000,
  maximumReplayEntries: 50_000,
  maximumCacheLifetimeMs: 3_600_000,
  clockSkewMs: 60_000,
});
const PROHIBITED_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const KEY_TRANSITIONS = Object.freeze({
  generated: Object.freeze(['prepublished', 'revoked']),
  prepublished: Object.freeze(['active', 'suspended', 'revoked', 'compromised']),
  active: Object.freeze(['retiring', 'suspended', 'revoked', 'expired', 'compromised']),
  retiring: Object.freeze(['retired', 'suspended', 'revoked', 'expired', 'compromised']),
  suspended: Object.freeze(['active', 'retiring', 'revoked', 'compromised']),
  retired: Object.freeze(['revoked', 'compromised']),
  expired: Object.freeze(['revoked', 'compromised']),
  compromised: Object.freeze(['revoked']),
  revoked: Object.freeze([]),
});

class GhostBridgeTrustError extends Error {
  constructor(code, safeMessage, options = {}) {
    super(String(safeMessage || 'Trust verification failed.').slice(0, 500));
    this.name = 'GhostBridgeTrustError';
    this.code = TRUST_ERROR_CODES.includes(code) ? code : 'PROOF_INVALID';
    this.safeMessage = this.message;
    this.retryable = options.retryable === true;
    if (options.details) this.details = safeDetails(options.details);
  }

  toJSON() {
    return {
      errorCode: this.code,
      safeMessage: this.safeMessage,
      retryable: this.retryable,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

function trustError(code, message, options) {
  return new GhostBridgeTrustError(code, message, options);
}

function safeDetails(value) {
  try {
    const result = redactPublicData(value);
    const text = JSON.stringify(result);
    return text.length <= 4_000 ? result : { truncated: true };
  } catch {
    return { truncated: true };
  }
}

function normalizeIssuerId(value, options = {}) {
  let url;
  try {
    url = new URL(String(value || ''));
  } catch {
    throw trustError('ISSUER_INVALID', 'The issuer identifier is not a valid absolute URI.');
  }
  if (url.username || url.password) {
    throw trustError('ISSUER_INVALID', 'Issuer identifiers must not contain user information.');
  }
  if (url.hash) {
    throw trustError('ISSUER_INVALID', 'Issuer identifiers must not contain fragments.');
  }
  if (url.search) {
    throw trustError('ISSUER_INVALID', 'Issuer identifiers must not contain a query.');
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw trustError('ISSUER_INVALID', 'Issuer identifiers must identify an HTTPS origin.');
  }
  const local = isLocalHostname(url.hostname);
  if (url.protocol !== 'https:' && !(options.localTestMode === true && url.protocol === 'http:' && local)) {
    throw trustError('ISSUER_INVALID', 'Remote issuer identifiers must use HTTPS.');
  }
  if (local && options.localTestMode !== true) {
    throw trustError('UNSAFE_DISCOVERY_TARGET', 'Local issuer destinations require explicit local test mode.');
  }
  if (!local && isPrivateIp(url.hostname)) {
    throw trustError('UNSAFE_DISCOVERY_TARGET', 'Private-network issuer destinations are rejected.');
  }
  if (options.localTestMode === true && local && Array.isArray(options.allowedLocalIssuers)) {
    const candidate = url.origin.toLowerCase();
    const allowed = options.allowedLocalIssuers.map((item) => new URL(item).origin.toLowerCase());
    if (!allowed.includes(candidate)) {
      throw trustError('UNSAFE_DISCOVERY_TARGET', 'The local issuer is not explicitly allowlisted.');
    }
  }
  if (Array.isArray(options.allowedPorts) && url.port && !options.allowedPorts.includes(Number(url.port))) {
    throw trustError('ISSUER_INVALID', 'The issuer port is not allowed by policy.');
  }
  return url.origin.toLowerCase();
}

function issuerDiscoveryUrl(issuerId, options = {}) {
  return `${normalizeIssuerId(issuerId, options)}/.well-known/ghostbridge-issuer`;
}

function isLocalHostname(hostname) {
  const host = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase();
  return host === 'localhost' || host === '::1' || host.startsWith('127.');
}

function isPrivateIp(hostname) {
  const host = String(hostname || '').replace(/^\[|\]$/g, '');
  const kind = net.isIP(host);
  if (kind === 4) {
    const parts = host.split('.').map(Number);
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 0
    );
  }
  if (kind === 6) {
    const normalized = host.toLowerCase();
    return (
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    );
  }
  return false;
}

async function discoverIssuer(issuerId, options = {}) {
  const normalizedIssuer = normalizeIssuerId(issuerId, options);
  const url = issuerDiscoveryUrl(normalizedIssuer, options);
  let response;
  try {
    response = await trustTransport(options).get(url, {
      signal: options.signal,
      timeoutMs: boundedInteger(
        options.timeoutMs,
        50,
        30_000,
        DEFAULT_TRUST_LIMITS.networkTimeoutMs,
      ),
      maximumBytes:
        options.maximumBytes || DEFAULT_TRUST_LIMITS.maximumIssuerMetadataBytes,
      expectedContentTypes: ['application/json'],
      localFixtureMode: options.localTestMode === true,
      allowedLocalOrigins: options.allowedLocalIssuers,
      allowedPorts: options.allowedPorts,
    });
  } catch (error) {
    if (['UNSAFE_DISCOVERY_TARGET', 'RESPONSE_TOO_LARGE'].includes(error?.code)) {
      throw trustError(error.code, error.message, { retryable: error.retryable });
    }
    throw trustError('ISSUER_DISCOVERY_FAILED', 'Issuer discovery could not be completed.', {
      retryable: true,
    });
  }
  if (response.status >= 300 && response.status < 400) {
    throw trustError('ISSUER_DISCOVERY_FAILED', 'Issuer discovery redirects are rejected by default.');
  }
  if (!response.ok) {
    throw trustError('ISSUER_DISCOVERY_FAILED', 'Issuer discovery returned an unsuccessful response.', {
      retryable: response.status >= 500,
    });
  }
  const text = await boundedResponseText(
    response,
    options.maximumBytes || DEFAULT_TRUST_LIMITS.maximumIssuerMetadataBytes,
  );
  const metadata = parseJsonStrict(text, {
    maximumBytes: options.maximumBytes || DEFAULT_TRUST_LIMITS.maximumIssuerMetadataBytes,
  });
  return validateIssuerMetadata(metadata, {
    ...options,
    expectedIssuer: normalizedIssuer,
  });
}

async function loadIssuerJwks(metadata, options = {}) {
  const validatedMetadata = validateIssuerMetadata(metadata, {
    ...options,
    expectedIssuer: options.expectedIssuer || metadata.issuerId,
  });
  const endpoint = new URL(validatedMetadata.jwksUri);
  if (endpoint.origin.toLowerCase() !== new URL(validatedMetadata.issuerId).origin.toLowerCase() &&
      options.allowCrossOriginEndpoints !== true) {
    throw trustError('JWKS_INVALID', 'The JWKS endpoint is not bound to the issuer origin.');
  }
  let response;
  try {
    response = await trustTransport(options).get(endpoint, {
      signal: options.signal,
      timeoutMs: boundedInteger(
        options.timeoutMs,
        50,
        30_000,
        DEFAULT_TRUST_LIMITS.networkTimeoutMs,
      ),
      maximumBytes: options.maximumBytes || DEFAULT_TRUST_LIMITS.maximumJwksBytes,
      expectedContentTypes: ['application/jwk-set+json', 'application/json'],
      localFixtureMode: options.localTestMode === true,
      allowedLocalOrigins: options.allowedLocalIssuers,
      allowedPorts: options.allowedPorts,
    });
  } catch (error) {
    if (['UNSAFE_DISCOVERY_TARGET', 'RESPONSE_TOO_LARGE'].includes(error?.code)) {
      throw trustError(error.code, error.message, { retryable: error.retryable });
    }
    throw trustError('ISSUER_DISCOVERY_FAILED', 'Issuer public-key discovery could not be completed.', {
      retryable: true,
    });
  }
  if (response.status >= 300 && response.status < 400) {
    throw trustError('JWKS_INVALID', 'JWKS redirects are rejected by default.');
  }
  if (!response.ok) {
    throw trustError('ISSUER_DISCOVERY_FAILED', 'Issuer public-key discovery returned an unsuccessful response.', {
      retryable: response.status >= 500,
    });
  }
  const text = await boundedResponseText(
    response,
    options.maximumBytes || DEFAULT_TRUST_LIMITS.maximumJwksBytes,
  );
  return validateJwks(parseJsonStrict(text, {
    maximumBytes: options.maximumBytes || DEFAULT_TRUST_LIMITS.maximumJwksBytes,
  }), options);
}

function trustTransport(options) {
  if (options.transport && typeof options.transport.get === 'function') {
    return options.transport;
  }
  if (typeof options.fetch === 'function') {
    if (options.allowInsecureFixtureFetch !== true || options.localTestMode !== true) {
      throw trustError(
        'UNSAFE_DISCOVERY_TARGET',
        'A raw Fetch implementation is unsuitable for untrusted issuer discovery.',
      );
    }
    return {
      get: (url, requestOptions) =>
        options.fetch(url, {
          method: 'GET',
          redirect: 'manual',
          signal: requestOptions.signal,
          headers: { accept: requestOptions.expectedContentTypes.join(', ') },
        }),
    };
  }
  return createNodeSecurityTransport();
}

async function boundedResponseText(response, maximumBytes) {
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > maximumBytes) {
    throw trustError('RESPONSE_TOO_LARGE', 'The trust response exceeds its configured size limit.');
  }
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > maximumBytes) {
    throw trustError('RESPONSE_TOO_LARGE', 'The trust response exceeds its configured size limit.');
  }
  return text;
}

function validateIssuerMetadata(metadata, options = {}) {
  validatePlainTrustData(metadata, {
    maximumBytes: options.maximumBytes || DEFAULT_TRUST_LIMITS.maximumIssuerMetadataBytes,
    maximumArrayLength: 256,
  });
  requireFields(metadata, [
    'protocolVersion',
    'trustProfileVersion',
    'metadataVersion',
    'issuerId',
    'displayName',
    'status',
    'issuedAt',
    'updatedAt',
    'expiresAt',
    'supportedProtocolVersions',
    'supportedTrustProfiles',
    'supportedProofProfiles',
    'supportedAlgorithms',
    'jwksUri',
    'revocationSetUri',
    'rootKeyThumbprints',
    'metadataSequence',
  ], 'ISSUER_METADATA_INVALID');
  const issuer = normalizeIssuerId(metadata.issuerId, options);
  if (options.expectedIssuer && issuer !== normalizeIssuerId(options.expectedIssuer, options)) {
    throw trustError('ISSUER_MISMATCH', 'Issuer metadata does not match the requested issuer.');
  }
  if (metadata.trustProfileVersion !== TRUST_PROFILE_VERSION ||
      !metadata.supportedTrustProfiles.includes(TRUST_PROFILE_VERSION)) {
    throw trustError('ISSUER_METADATA_INVALID', 'Issuer metadata does not support the required trust profile.');
  }
  if (!ISSUER_STATUSES.includes(metadata.status)) {
    throw trustError('ISSUER_METADATA_INVALID', 'Issuer metadata contains an invalid status.');
  }
  if (metadata.status === 'suspended') {
    throw trustError('ISSUER_SUSPENDED', 'The issuer is suspended.');
  }
  if (metadata.status === 'compromised') {
    throw trustError('ISSUER_COMPROMISED', 'The issuer is marked compromised.');
  }
  if (!Number.isSafeInteger(metadata.metadataSequence) || metadata.metadataSequence < 1) {
    throw trustError('ISSUER_METADATA_INVALID', 'Issuer metadata sequence must be a positive integer.');
  }
  const now = clockValue(options.clock);
  validateTimeWindow(metadata, { now, clockSkewMs: options.clockSkewMs, requireFutureExpiry: true });
  if (
    Number.isSafeInteger(options.minimumMetadataSequence) &&
    metadata.metadataSequence < options.minimumMetadataSequence
  ) {
    throw trustError('ISSUER_METADATA_ROLLBACK', 'Issuer metadata rollback was detected.');
  }
  if (!Array.isArray(metadata.supportedAlgorithms) || metadata.supportedAlgorithms.length === 0) {
    throw trustError('ISSUER_METADATA_INVALID', 'Issuer metadata must declare supported algorithms.');
  }
  metadata.supportedAlgorithms.forEach((algorithm) =>
    assertAlgorithmAllowed(algorithm, options.allowedAlgorithms),
  );
  if (!Array.isArray(metadata.rootKeyThumbprints) || metadata.rootKeyThumbprints.length === 0) {
    throw trustError('ISSUER_METADATA_INVALID', 'Issuer metadata must declare root-key thumbprints.');
  }
  for (const field of ['jwksUri', 'revocationSetUri']) {
    validateIssuerEndpoint(metadata[field], issuer, options);
  }
  for (const field of [
    'securityPolicyUri',
    'privacyPolicyUri',
    'termsUri',
    'documentationUri',
  ]) {
    if (metadata[field]) validatePublicHttpsUri(metadata[field], options);
  }
  return Object.freeze(structuredClone(metadata));
}

function validateIssuerEndpoint(value, issuer, options = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw trustError('ISSUER_METADATA_INVALID', 'Issuer metadata contains an invalid key endpoint.');
  }
  const endpointOrigin = normalizeIssuerId(url.origin, options);
  if (endpointOrigin !== issuer && options.allowCrossOriginEndpoints !== true) {
    throw trustError('ISSUER_METADATA_INVALID', 'Issuer key endpoints must use the issuer origin.');
  }
  if (url.username || url.password || url.hash || !['https:', ...(options.localTestMode ? ['http:'] : [])].includes(url.protocol)) {
    throw trustError('ISSUER_METADATA_INVALID', 'Issuer metadata contains an unsafe endpoint.');
  }
  return url.toString();
}

function validatePublicHttpsUri(value, options = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw trustError('ISSUER_METADATA_INVALID', 'Issuer metadata contains an invalid public URI.');
  }
  if (url.username || url.password || url.hash) {
    throw trustError('ISSUER_METADATA_INVALID', 'Issuer metadata contains an unsafe public URI.');
  }
  if (url.protocol !== 'https:' && !(options.localTestMode && url.protocol === 'http:' && isLocalHostname(url.hostname))) {
    throw trustError('ISSUER_METADATA_INVALID', 'Issuer metadata public URIs must use HTTPS.');
  }
  return url.toString();
}

function validateJwks(jwks, options = {}) {
  validatePlainTrustData(jwks, {
    maximumBytes: options.maximumBytes || DEFAULT_TRUST_LIMITS.maximumJwksBytes,
    maximumArrayLength: options.maximumKeys || DEFAULT_TRUST_LIMITS.maximumKeys,
  });
  if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) {
    throw trustError('JWKS_INVALID', 'The issuer JWKS must contain public keys.');
  }
  const maximumKeys = options.maximumKeys || DEFAULT_TRUST_LIMITS.maximumKeys;
  if (jwks.keys.length > maximumKeys) {
    throw trustError('JWKS_INVALID', 'The issuer JWKS contains too many keys.');
  }
  const kids = new Set();
  const activeThumbprints = new Set();
  const normalized = jwks.keys.map((key) => {
    const validated = validatePublicJwk(key, options);
    if (kids.has(validated.kid)) {
      throw trustError('JWKS_INVALID', 'The issuer JWKS contains a duplicate key identifier.');
    }
    kids.add(validated.kid);
    if (['active', 'retiring'].includes(validated.state)) {
      if (activeThumbprints.has(validated.thumbprint)) {
        throw trustError('JWKS_INVALID', 'The issuer JWKS contains a duplicate active key.');
      }
      activeThumbprints.add(validated.thumbprint);
    }
    return validated;
  });
  return Object.freeze({ ...structuredClone(jwks), keys: Object.freeze(normalized) });
}

function validatePublicJwk(jwk, options = {}) {
  validatePlainTrustData(jwk, { maximumBytes: 16_384, maximumArrayLength: 32 });
  for (const member of PRIVATE_JWK_MEMBERS) {
    if (Object.hasOwn(jwk, member)) {
      throw trustError('JWKS_INVALID', 'A public JWK contains private-key material.');
    }
  }
  if (options.productionMode === true && jwk.testOnly === true) {
    throw trustError('JWKS_INVALID', 'Test-only signing keys are prohibited in production mode.');
  }
  requireFields(jwk, [
    'kid',
    'kty',
    'use',
    'alg',
    'state',
    'notBefore',
    'expiresAt',
    'thumbprint',
    'purpose',
  ], 'JWKS_INVALID');
  if (!/^[A-Za-z0-9._~-]{1,128}$/.test(jwk.kid)) {
    throw trustError('JWKS_INVALID', 'A JWK key identifier is invalid.');
  }
  assertAlgorithmAllowed(jwk.alg, options.allowedAlgorithms);
  if (jwk.alg !== 'EdDSA' || jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || typeof jwk.x !== 'string') {
    throw trustError('KEY_TYPE_MISMATCH', 'The JWK type does not match its signature algorithm.');
  }
  if (jwk.use !== 'sig') throw trustError('JWKS_INVALID', 'A signing JWK must declare use "sig".');
  if (!KEY_STATES.includes(jwk.state)) throw trustError('JWKS_INVALID', 'A JWK state is invalid.');
  const purposes = Array.isArray(jwk.purpose) ? jwk.purpose : [jwk.purpose];
  if (!purposes.length || purposes.some((purpose) => !KEY_PURPOSES.includes(purpose))) {
    throw trustError('JWKS_INVALID', 'A JWK purpose is invalid.');
  }
  const calculated = calculateJwkThumbprint(jwk);
  if (jwk.thumbprint !== calculated) {
    throw trustError('JWKS_INVALID', 'A JWK thumbprint does not match its public key.');
  }
  validateTimestamp(jwk.notBefore, 'JWKS_INVALID');
  validateTimestamp(jwk.expiresAt, 'JWKS_INVALID');
  if (Date.parse(jwk.notBefore) >= Date.parse(jwk.expiresAt)) {
    throw trustError('JWKS_INVALID', 'A JWK validity window is invalid.');
  }
  return Object.freeze({ ...structuredClone(jwk), purpose: Object.freeze(purposes) });
}

function calculateJwkThumbprint(jwk) {
  let members;
  if (jwk?.kty === 'OKP') {
    members = { crv: jwk.crv, kty: jwk.kty, x: jwk.x };
  } else if (jwk?.kty === 'RSA') {
    members = { e: jwk.e, kty: jwk.kty, n: jwk.n };
  } else if (jwk?.kty === 'EC') {
    members = { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y };
  } else {
    throw trustError('KEY_TYPE_MISMATCH', 'The JWK type does not support a thumbprint.');
  }
  if (Object.values(members).some((value) => typeof value !== 'string' || !value)) {
    throw trustError('JWKS_INVALID', 'The JWK is missing thumbprint members.');
  }
  return crypto.createHash('sha256').update(canonicalize(members)).digest('base64url');
}

function assertAlgorithmAllowed(algorithm, allowedAlgorithms = ALLOWED_ALGORITHMS) {
  if (algorithm === 'none' || String(algorithm).startsWith('HS')) {
    throw trustError('ALGORITHM_NOT_ALLOWED', 'Symmetric and unsigned issuer proofs are prohibited.');
  }
  if (!allowedAlgorithms.includes(algorithm)) {
    throw trustError('ALGORITHM_UNSUPPORTED', 'The signature algorithm is not allowed.');
  }
  return algorithm;
}

function canonicalize(value, options = {}) {
  validatePlainTrustData(value, {
    maximumBytes: options.maximumBytes || DEFAULT_TRUST_LIMITS.maximumCanonicalBytes,
    maximumObjectDepth: options.maximumObjectDepth || DEFAULT_TRUST_LIMITS.maximumObjectDepth,
    maximumArrayLength: options.maximumArrayLength || DEFAULT_TRUST_LIMITS.maximumArrayLength,
    maximumStringLength: options.maximumStringLength || DEFAULT_TRUST_LIMITS.maximumStringLength,
  }, false);
  const serialized = serializeCanonical(value);
  const maximumBytes = options.maximumBytes || DEFAULT_TRUST_LIMITS.maximumCanonicalBytes;
  if (Buffer.byteLength(serialized, 'utf8') > maximumBytes) {
    throw trustError('RESPONSE_TOO_LARGE', 'The canonical payload exceeds its configured size limit.');
  }
  return serialized;
}

function serializeCanonical(value) {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw trustError('PROOF_INVALID', 'Canonical JSON requires finite numbers.');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    assertValidUnicode(value);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(serializeCanonical).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${serializeCanonical(value[key])}`)
    .join(',')}}`;
}

function assertValidUnicode(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw trustError('PROOF_INVALID', 'Canonical JSON contains invalid Unicode.');
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw trustError('PROOF_INVALID', 'Canonical JSON contains invalid Unicode.');
    }
  }
}

function parseJsonStrict(text, options = {}) {
  const source = Buffer.isBuffer(text)
    ? new TextDecoder('utf-8', { fatal: true }).decode(text)
    : String(text);
  const maximumBytes = options.maximumBytes || DEFAULT_TRUST_LIMITS.maximumCanonicalBytes;
  if (Buffer.byteLength(source, 'utf8') > maximumBytes) {
    throw trustError('RESPONSE_TOO_LARGE', 'The JSON document exceeds its configured size limit.');
  }
  detectDuplicateJsonKeys(source);
  let result;
  try {
    result = JSON.parse(source);
  } catch {
    throw trustError('PROOF_INVALID', 'The trust document is not valid JSON.');
  }
  validatePlainTrustData(result, { ...options, maximumBytes });
  return result;
}

function detectDuplicateJsonKeys(source) {
  let position = 0;
  const whitespace = () => {
    while (/\s/.test(source[position] || '')) position += 1;
  };
  const stringToken = () => {
    const start = position;
    if (source[position] !== '"') throw new Error('Expected JSON string.');
    position += 1;
    while (position < source.length) {
      if (source[position] === '\\') {
        position += 2;
      } else if (source[position] === '"') {
        position += 1;
        return JSON.parse(source.slice(start, position));
      } else {
        position += 1;
      }
    }
    throw new Error('Unterminated JSON string.');
  };
  const value = () => {
    whitespace();
    const token = source[position];
    if (token === '{') return object();
    if (token === '[') return array();
    if (token === '"') return stringToken();
    const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(source.slice(position));
    if (!match) throw new Error('Invalid JSON token.');
    position += match[0].length;
  };
  const object = () => {
    position += 1;
    const keys = new Set();
    whitespace();
    if (source[position] === '}') {
      position += 1;
      return;
    }
    while (position < source.length) {
      whitespace();
      const key = stringToken();
      if (keys.has(key)) throw trustError('PROOF_INVALID', 'Duplicate JSON object keys are prohibited.');
      if (PROHIBITED_OBJECT_KEYS.has(key)) {
        throw trustError('PROOF_INVALID', 'The trust document contains a prohibited object key.');
      }
      keys.add(key);
      whitespace();
      if (source[position] !== ':') throw new Error('Expected JSON colon.');
      position += 1;
      value();
      whitespace();
      if (source[position] === '}') {
        position += 1;
        return;
      }
      if (source[position] !== ',') throw new Error('Expected JSON comma.');
      position += 1;
    }
    throw new Error('Unterminated JSON object.');
  };
  const array = () => {
    position += 1;
    whitespace();
    if (source[position] === ']') {
      position += 1;
      return;
    }
    while (position < source.length) {
      value();
      whitespace();
      if (source[position] === ']') {
        position += 1;
        return;
      }
      if (source[position] !== ',') throw new Error('Expected JSON comma.');
      position += 1;
    }
    throw new Error('Unterminated JSON array.');
  };
  try {
    value();
    whitespace();
    if (position !== source.length) throw new Error('Trailing JSON content.');
  } catch (error) {
    if (error instanceof GhostBridgeTrustError) throw error;
    throw trustError('PROOF_INVALID', 'The trust document is not valid JSON.');
  }
}

function validatePlainTrustData(value, limits = {}, measure = true) {
  const normalized = {
    maximumBytes: limits.maximumBytes || DEFAULT_TRUST_LIMITS.maximumCanonicalBytes,
    maximumObjectDepth: limits.maximumObjectDepth || DEFAULT_TRUST_LIMITS.maximumObjectDepth,
    maximumArrayLength: limits.maximumArrayLength || DEFAULT_TRUST_LIMITS.maximumArrayLength,
    maximumStringLength: limits.maximumStringLength || DEFAULT_TRUST_LIMITS.maximumStringLength,
  };
  const visit = (item, depth, ancestors) => {
    if (depth > normalized.maximumObjectDepth) {
      throw trustError('PROOF_INVALID', 'The trust document exceeds its maximum depth.');
    }
    if (item === null || typeof item === 'boolean') return;
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) throw trustError('PROOF_INVALID', 'The trust document contains a non-finite number.');
      return;
    }
    if (typeof item === 'string') {
      if (item.length > normalized.maximumStringLength) {
        throw trustError('RESPONSE_TOO_LARGE', 'A trust document string exceeds its configured limit.');
      }
      assertValidUnicode(item);
      return;
    }
    if (typeof item !== 'object') {
      throw trustError('PROOF_INVALID', 'Trust documents must contain plain JSON data.');
    }
    if (ancestors.has(item)) throw trustError('PROOF_INVALID', 'Cyclic trust documents are prohibited.');
    ancestors.add(item);
    if (Array.isArray(item)) {
      if (item.length > normalized.maximumArrayLength) {
        throw trustError('RESPONSE_TOO_LARGE', 'A trust document array exceeds its configured limit.');
      }
      item.forEach((child) => visit(child, depth + 1, ancestors));
    } else {
      const prototype = Object.getPrototypeOf(item);
      if (prototype !== Object.prototype && prototype !== null) {
        throw trustError('PROOF_INVALID', 'Trust documents must use plain objects.');
      }
      for (const [key, child] of Object.entries(item)) {
        if (PROHIBITED_OBJECT_KEYS.has(key)) {
          throw trustError('PROOF_INVALID', 'The trust document contains a prohibited object key.');
        }
        visit(child, depth + 1, ancestors);
      }
    }
    ancestors.delete(item);
  };
  visit(value, 0, new Set());
  if (measure) {
    let bytes;
    try {
      bytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
    } catch {
      throw trustError('PROOF_INVALID', 'The trust document cannot be serialized.');
    }
    if (bytes > normalized.maximumBytes) {
      throw trustError('RESPONSE_TOO_LARGE', 'The trust document exceeds its configured size limit.');
    }
  }
  return value;
}

function digest(value) {
  return `sha256-${crypto.createHash('sha256').update(canonicalize(value)).digest('base64url')}`;
}

async function createProof(payload, signer, options = {}) {
  validatePlainTrustData(payload);
  if (!signer || typeof signer.sign !== 'function') throw new TypeError('A signer is required.');
  const issuedAt = signedIssuanceTime(payload);
  const algorithm = assertAlgorithmAllowed(options.algorithm || signer.algorithm || MANDATORY_ALGORITHM);
  const kid = String(options.kid || signer.kid || '');
  if (!/^[A-Za-z0-9._~-]{1,128}$/.test(kid)) throw trustError('PROOF_INVALID', 'A protected key identifier is required.');
  const header = {
    alg: algorithm,
    kid,
    typ: options.type || PROOF_TYPE,
    gbp: options.profile || PROOF_PROFILE,
  };
  const encodedHeader = base64urlJson(header);
  const encodedPayload = Buffer.from(canonicalize(payload), 'utf8').toString('base64url');
  const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`, 'ascii');
  const signature = await signer.sign(signingInput, { algorithm, kid, purpose: options.purpose });
  const compact = `${encodedHeader}.${encodedPayload}.${Buffer.from(signature).toString('base64url')}`;
  if (Buffer.byteLength(compact, 'utf8') > DEFAULT_TRUST_LIMITS.maximumProofBytes) {
    throw trustError('RESPONSE_TOO_LARGE', 'The proof exceeds its configured size limit.');
  }
  return Object.freeze({
    format: 'JWS',
    profile: PROOF_PROFILE,
    protectedJws: compact,
    kid,
    algorithm,
    createdAt: options.createdAt || issuedAt,
  });
}

async function signDocument(document, signer, options = {}) {
  const payload = withoutProof(document);
  const proof = await createProof(payload, signer, options);
  return Object.freeze({ ...structuredClone(payload), proof });
}

function verifyProof(payload, proof, jwks, options = {}) {
  if (!proof || typeof proof.protectedJws !== 'string') {
    throw trustError('PROOF_REQUIRED', 'A protected JWS proof is required.');
  }
  if (proof.format !== 'JWS' || proof.profile !== PROOF_PROFILE) {
    throw trustError('PROOF_INVALID', 'The proof format or profile is unsupported.');
  }
  if (Buffer.byteLength(proof.protectedJws, 'utf8') > (options.maximumProofBytes || DEFAULT_TRUST_LIMITS.maximumProofBytes)) {
    throw trustError('RESPONSE_TOO_LARGE', 'The proof exceeds its configured size limit.');
  }
  const parts = proof.protectedJws.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw trustError('PROOF_INVALID', 'The JWS proof is malformed.');
  }
  let header;
  let encodedPayload;
  try {
    header = parseJsonStrict(Buffer.from(parts[0], 'base64url'), { maximumBytes: 4_096 });
    encodedPayload = Buffer.from(parts[1], 'base64url').toString('utf8');
  } catch (error) {
    if (error instanceof GhostBridgeTrustError) throw error;
    throw trustError('PROOF_INVALID', 'The JWS proof is malformed.');
  }
  const allowedHeaders = new Set(['alg', 'kid', 'typ', 'gbp']);
  if (Object.keys(header).some((key) => !allowedHeaders.has(key))) {
    throw trustError('PROOF_INVALID', 'The protected JWS contains an unsupported header.');
  }
  if (header.crit || header.jku || header.x5u || header.jwk) {
    throw trustError('PROOF_INVALID', 'External or critical JWS headers are not accepted.');
  }
  assertAlgorithmAllowed(header.alg, options.allowedAlgorithms);
  if (header.typ !== PROOF_TYPE || header.gbp !== PROOF_PROFILE) {
    throw trustError('PROOF_INVALID', 'The protected JWS type or profile is invalid.');
  }
  if (header.kid !== proof.kid || header.alg !== proof.algorithm) {
    throw trustError('PROOF_INVALID', 'Protected proof fields do not match the proof metadata.');
  }
  const issuedAt = signedIssuanceTime(payload);
  if (proof.createdAt !== issuedAt) {
    throw trustError(
      'PROOF_INVALID',
      'Unsigned proof creation metadata does not match the signed issuance time.',
    );
  }
  const canonicalPayload = canonicalize(payload, { maximumBytes: options.maximumPayloadBytes });
  if (encodedPayload !== canonicalPayload) {
    throw trustError('PAYLOAD_DIGEST_MISMATCH', 'The signed payload does not match the supplied document.');
  }
  const validatedJwks = validateJwks(jwks, options);
  const key = validatedJwks.keys.find((candidate) => candidate.kid === header.kid);
  if (!key) throw trustError('KEY_NOT_FOUND', 'The signing key was not found in the trusted issuer key set.');
  assertKeyUsable(key, {
    ...options,
    purpose: options.purpose,
    issuedAt: options.issuedAt || issuedAt,
    historical: options.historical === true,
  });
  let publicKey;
  try {
    publicKey = crypto.createPublicKey({ key: stripJwkMetadata(key), format: 'jwk' });
  } catch {
    throw trustError('KEY_TYPE_MISMATCH', 'The public signing key is invalid.');
  }
  const valid = crypto.verify(
    null,
    Buffer.from(`${parts[0]}.${parts[1]}`, 'ascii'),
    publicKey,
    Buffer.from(parts[2], 'base64url'),
  );
  if (!valid) throw trustError('SIGNATURE_INVALID', 'The trust-object signature is invalid.');
  return Object.freeze({
    valid: true,
    cryptographicValidity: 'valid',
    algorithm: header.alg,
    kid: header.kid,
    keyThumbprint: key.thumbprint,
    keyState: key.state,
    purpose: options.purpose,
  });
}

function verifyDocument(document, jwks, options = {}) {
  validatePlainTrustData(document, { maximumBytes: options.maximumPayloadBytes || DEFAULT_TRUST_LIMITS.maximumPassportBytes });
  const payload = withoutProof(document);
  const documentIssuer = payload.issuer || payload.issuerId;
  if (options.expectedIssuer && documentIssuer !== options.expectedIssuer) {
    throw trustError('ISSUER_MISMATCH', 'The signed object issuer does not match the expected issuer.');
  }
  validateTimeWindow(payload, {
    now: clockValue(options.clock),
    clockSkewMs: options.clockSkewMs,
    requireFutureExpiry: options.requireFutureExpiry,
  });
  if (options.expectedAudience) validateAudience(payload.audience, options.expectedAudience);
  const proofResult = verifyProof(payload, document.proof, jwks, {
    ...options,
    issuedAt: payload.issuedAt || payload.generatedAt || payload.completedAt,
  });
  return Object.freeze({ ...proofResult, payload: Object.freeze(structuredClone(payload)) });
}

function withoutProof(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw trustError('PROOF_INVALID', 'A signed trust object must be a plain object.');
  }
  const { proof, ...payload } = document;
  return payload;
}

function stripJwkMetadata(key) {
  const allowed = ['kty', 'use', 'key_ops', 'alg', 'kid', 'crv', 'x', 'y', 'n', 'e', 'x5c', 'x5t', 'x5t#S256'];
  return Object.fromEntries(Object.entries(key).filter(([name]) => allowed.includes(name)));
}

function assertKeyUsable(key, options = {}) {
  if (options.purpose) {
    const purposes = Array.isArray(key.purpose) ? key.purpose : [key.purpose];
    if (!purposes.includes(options.purpose)) {
      throw trustError('KEY_NOT_ACTIVE', 'The signing key is not authorized for this proof purpose.');
    }
  }
  const issuedAt = Date.parse(options.issuedAt);
  if (!Number.isFinite(issuedAt)) throw trustError('PROOF_INVALID', 'The signed object issuance time is invalid.');
  if (issuedAt < Date.parse(key.notBefore)) throw trustError('KEY_NOT_ACTIVE', 'The key was not active at issuance.');
  if (issuedAt >= Date.parse(key.expiresAt)) throw trustError('KEY_EXPIRED', 'The key was expired at issuance.');
  if (key.state === 'revoked') throw trustError('KEY_REVOKED', 'The signing key is revoked.');
  if (key.state === 'compromised') throw trustError('KEY_COMPROMISED', 'The signing key is compromised.');
  if (key.state === 'suspended') throw trustError('KEY_NOT_ACTIVE', 'The signing key is suspended.');
  if (key.state === 'expired') throw trustError('KEY_EXPIRED', 'The signing key is expired.');
  if (['generated', 'prepublished'].includes(key.state)) {
    throw trustError('KEY_NOT_ACTIVE', 'The signing key is not active.');
  }
  if (key.state === 'retired' && !options.historical) {
    throw trustError('KEY_RETIRED', 'A retired key cannot authorize a new trust object.');
  }
  return key;
}

function validateAudience(actual, expected) {
  if (!actual) throw trustError('AUDIENCE_MISMATCH', 'The signed object is missing its required audience.');
  const actualValues = Array.isArray(actual) ? actual : [actual];
  const expectedValues = Array.isArray(expected) ? expected : [expected];
  if (actualValues.includes('*') || !expectedValues.every((value) => actualValues.includes(value))) {
    throw trustError('AUDIENCE_MISMATCH', 'The signed object audience does not match the intended recipient.');
  }
  return true;
}

function validateCapabilityManifest(manifest, contracts, passport, options = {}) {
  if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length > DEFAULT_TRUST_LIMITS.maximumCapabilityManifestEntries) {
    throw trustError('CAPABILITY_MANIFEST_MISMATCH', 'The Capability Manifest entry set is invalid.');
  }
  const contractMap = new Map((contracts || []).map((contract) => [contract.capabilityKey, contract]));
  if (contractMap.size !== contracts.length || contractMap.size !== manifest.capabilities.length) {
    throw trustError('CAPABILITY_MANIFEST_MISMATCH', 'The Capability Manifest does not exactly match the capability set.');
  }
  for (const entry of manifest.capabilities) {
    const contract = contractMap.get(entry.capabilityKey);
    if (!contract || contract.capabilityVersion !== entry.capabilityVersion || digest(contract) !== entry.contractDigest) {
      throw trustError('CAPABILITY_MANIFEST_MISMATCH', 'A Capability Contract does not match its signed manifest.');
    }
  }
  if (
    manifest.agentId !== passport.agentId ||
    manifest.passportId !== passport.passportId ||
    manifest.passportVersion !== passport.passportVersion ||
    digest(withoutProof(manifest)) !== passport.capabilityManifestDigest
  ) {
    throw trustError('CAPABILITY_MANIFEST_MISMATCH', 'The Capability Manifest is not bound to this Agent Passport.');
  }
  if (options.jwks) {
    verifyDocument(manifest, options.jwks, {
      ...options,
      purpose: 'capability_signing',
      expectedIssuer: passport.issuer,
    });
  }
  return Object.freeze({ valid: true, manifestDigest: passport.capabilityManifestDigest });
}

function validateAgentExecutionKey(passport, key, options = {}) {
  const authorization = passport.authorizedAgentExecutionKeys?.find(
    (entry) => entry.kid === key.kid && entry.thumbprint === key.thumbprint,
  );
  if (!authorization) throw trustError('KEY_NOT_FOUND', 'The agent execution key is not authorized by the Passport.');
  const purpose = options.purpose || 'execution_receipt_signing';
  if (!authorization.purposes?.includes(purpose) || authorization.status !== 'active') {
    throw trustError('KEY_NOT_ACTIVE', 'The agent execution key is not authorized for this purpose.');
  }
  const at = Date.parse(options.at || new Date().toISOString());
  if (at < Date.parse(authorization.notBefore) || at >= Date.parse(authorization.expiresAt)) {
    throw trustError('KEY_EXPIRED', 'The agent execution key is outside its authorized validity window.');
  }
  return authorization;
}

function evaluateTrustPolicy(input = {}) {
  const issuerId = input.issuerId;
  const organizationPolicy = normalizeTrustPolicy(input.organizationPolicy);
  const workspacePolicy = input.workspacePolicy ? normalizeTrustPolicy(input.workspacePolicy) : undefined;
  if (workspacePolicy && workspacePolicy.organizationPolicyVersion &&
      workspacePolicy.organizationPolicyVersion !== organizationPolicy.version) {
    throw trustError('TRUST_POLICY_DENIED', 'The workspace trust policy is not based on the active organization policy.');
  }
  const blocked = new Set([
    ...organizationPolicy.blockedIssuerIds,
    ...(workspacePolicy?.blockedIssuerIds || []),
  ]);
  if (blocked.has(issuerId)) return trustResult('blocked', ['issuer_blocked']);
  const orgAllowed = organizationPolicy.allowedIssuerIds.includes(issuerId);
  const workspaceAllowed = !workspacePolicy || workspacePolicy.allowedIssuerIds.length === 0 ||
    workspacePolicy.allowedIssuerIds.includes(issuerId);
  if (orgAllowed && workspaceAllowed) {
    if (input.rootKeyThumbprint && organizationPolicy.pinnedRootThumbprints.length &&
        !organizationPolicy.pinnedRootThumbprints.includes(input.rootKeyThumbprint)) {
      return trustResult('invalid', ['root_key_pin_mismatch']);
    }
    return trustResult('verified_and_trusted', ['valid_signature', 'issuer_allowlisted']);
  }
  const behavior = workspacePolicy?.unknownIssuerBehavior || organizationPolicy.unknownIssuerBehavior;
  if (behavior === 'block' || input.highImpact === true) {
    return trustResult('cryptographically_valid_untrusted_issuer', ['issuer_unknown']);
  }
  if (behavior === 'limited_core_only') {
    return trustResult('verified_with_warning', ['issuer_unknown', 'core_only']);
  }
  return trustResult('cryptographically_valid_review_required', ['issuer_unknown']);
}

function normalizeTrustPolicy(policy = {}) {
  return Object.freeze({
    version: String(policy.version || '1'),
    organizationPolicyVersion: policy.organizationPolicyVersion
      ? String(policy.organizationPolicyVersion)
      : undefined,
    allowedIssuerIds: Object.freeze([...(policy.allowedIssuerIds || [])]),
    blockedIssuerIds: Object.freeze([...(policy.blockedIssuerIds || [])]),
    pinnedRootThumbprints: Object.freeze([...(policy.pinnedRootThumbprints || [])]),
    acceptedAlgorithms: Object.freeze([...(policy.acceptedAlgorithms || ALLOWED_ALGORITHMS)]),
    requiredTrustProfile: policy.requiredTrustProfile || TRUST_PROFILE_VERSION,
    unknownIssuerBehavior: policy.unknownIssuerBehavior || 'administrator_review',
    maximumRevocationStalenessMs: boundedInteger(
      policy.maximumRevocationStalenessMs,
      0,
      86_400_000,
      300_000,
    ),
  });
}

function trustResult(category, reasonCodes, evidence = {}) {
  if (!TRUST_RESULTS.includes(category)) throw new TypeError('Unknown trust-result category.');
  return Object.freeze({
    category,
    trusted: category === 'verified_and_trusted',
    cryptographicallyValid: !['invalid', 'indeterminate'].includes(category),
    reasonCodes: Object.freeze([...new Set(reasonCodes)].slice(0, 32)),
    evidence: Object.freeze(safeDetails(evidence)),
  });
}

function validateRevocationSet(document, jwks, options = {}) {
  validatePlainTrustData(document, {
    maximumBytes: options.maximumBytes || DEFAULT_TRUST_LIMITS.maximumCanonicalBytes,
    maximumArrayLength: options.maximumEntries || DEFAULT_TRUST_LIMITS.maximumRevocationEntries,
  });
  requireFields(document, [
    'protocolVersion',
    'trustProfileVersion',
    'revocationSetId',
    'issuer',
    'sequence',
    'generatedAt',
    'nextUpdate',
    'status',
    'previousSetDigest',
    'entries',
    'proof',
  ], 'REVOCATION_SET_INVALID');
  if (!Number.isSafeInteger(document.sequence) || document.sequence < 1) {
    throw trustError('REVOCATION_SET_INVALID', 'The revocation-set sequence is invalid.');
  }
  if (Number.isSafeInteger(options.minimumSequence) && document.sequence < options.minimumSequence) {
    throw trustError('REVOCATION_ROLLBACK', 'A revocation-set rollback was detected.');
  }
  if (options.previousSet) {
    if (document.issuer !== options.previousSet.issuer) {
      throw trustError('REVOCATION_ROLLBACK', 'The revocation-set issuer chain is invalid.');
    }
    if (document.sequence !== Number(options.previousSet.sequence) + 1) {
      throw trustError('REVOCATION_ROLLBACK', 'The revocation-set sequence must be contiguous.');
    }
    if (document.previousSetDigest !== digest(withoutProof(options.previousSet))) {
      throw trustError('REVOCATION_ROLLBACK', 'The revocation-set digest chain is invalid.');
    }
  } else if (document.sequence > 1 && options.allowSignedCheckpoint !== true) {
    throw trustError(
      'REVOCATION_ROLLBACK',
      'A non-initial revocation set requires its verified predecessor.',
    );
  }
  if (!Array.isArray(document.entries) || document.entries.length > (options.maximumEntries || DEFAULT_TRUST_LIMITS.maximumRevocationEntries)) {
    throw trustError('REVOCATION_SET_INVALID', 'The revocation-set entry list is invalid.');
  }
  const seen = new Set();
  for (const entry of document.entries) {
    requireFields(entry, ['subjectType', 'subjectReference', 'status', 'reasonCode', 'effectiveAt'], 'REVOCATION_SET_INVALID');
    const key = `${entry.subjectType}:${entry.subjectReference}`;
    if (seen.has(key)) throw trustError('REVOCATION_SET_INVALID', 'The revocation set contains duplicate subjects.');
    seen.add(key);
  }
  verifyDocument(document, jwks, {
    ...options,
    purpose: 'revocation_signing',
    expectedIssuer: options.expectedIssuer || document.issuer,
  });
  return Object.freeze({
    valid: true,
    sequence: document.sequence,
    freshness: revocationFreshness(document, options),
    digest: digest(withoutProof(document)),
  });
}

function revocationFreshness(document, options = {}) {
  const now = clockValue(options.clock);
  const generatedAt = Date.parse(document.generatedAt);
  const nextUpdate = Date.parse(document.nextUpdate);
  if (!Number.isFinite(generatedAt) || !Number.isFinite(nextUpdate) || generatedAt >= nextUpdate) return 'invalid';
  if (now > nextUpdate) return 'stale';
  const remaining = nextUpdate - now;
  const lifetime = nextUpdate - generatedAt;
  return remaining <= Math.min(lifetime * 0.2, 60_000) ? 'nearing_expiry' : 'fresh';
}

class RevocationCache {
  constructor(options = {}) {
    this.maximumEntries = boundedInteger(options.maximumEntries, 1, 1_000, 100);
    this.records = new Map();
  }

  put(issuer, document, verification) {
    const current = this.records.get(issuer);
    const documentDigest = digest(withoutProof(document));
    if (current && document.sequence === current.document.sequence) {
      if (documentDigest !== current.digest) {
        throw trustError('REVOCATION_ROLLBACK', 'Revocation content changed at the same sequence.');
      }
      return this.get(issuer);
    }
    if (current && document.sequence !== current.document.sequence + 1) {
      throw trustError('REVOCATION_ROLLBACK', 'A non-contiguous revocation-set sequence was rejected.');
    }
    if (current && document.previousSetDigest !== current.digest) {
      throw trustError('REVOCATION_ROLLBACK', 'The revocation-set previous digest is invalid.');
    }
    this.records.set(issuer, {
      document: structuredClone(document),
      verification: structuredClone(verification),
      digest: documentDigest,
    });
    this.trim();
    return this.get(issuer);
  }

  get(issuer) {
    const record = this.records.get(issuer);
    return record ? structuredClone(record) : undefined;
  }

  lookup(issuer, subjectType, subjectReference, options = {}) {
    const record = this.records.get(issuer);
    if (!record) return { status: 'unknown', freshness: 'unavailable' };
    const freshness = revocationFreshness(record.document, options);
    const entry = record.document.entries.find(
      (item) => item.subjectType === subjectType && item.subjectReference === subjectReference,
    );
    return { status: entry?.status || 'active', freshness, entry: entry ? structuredClone(entry) : undefined };
  }

  invalidate(issuer) {
    return this.records.delete(issuer);
  }

  trim() {
    while (this.records.size > this.maximumEntries) this.records.delete(this.records.keys().next().value);
  }
}

class ReplayCache {
  constructor(options = {}) {
    this.maximumEntries = boundedInteger(
      options.maximumEntries,
      1,
      1_000_000,
      DEFAULT_TRUST_LIMITS.maximumReplayEntries,
    );
    this.clock = options.clock || Date.now;
    this.entries = new Map();
  }

  consume(input) {
    requireFields(input, ['issuer', 'kid', 'messageId', 'audience', 'expiresAt'], 'NONCE_INVALID');
    const now = this.clock();
    this.prune(now);
    const expiresAt = Date.parse(input.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      throw trustError('MESSAGE_EXPIRED', 'The authenticated message has expired.');
    }
    const key = digest({
      issuer: input.issuer,
      kid: input.kid,
      messageId: input.messageId,
      audience: input.audience,
      nonce: input.nonce || null,
      connectionId: input.connectionId || null,
    });
    if (this.entries.has(key)) throw trustError('REPLAY_DETECTED', 'The authenticated message was already presented.');
    if (this.entries.size >= this.maximumEntries) {
      throw trustError(
        'REPLAY_CAPACITY_EXCEEDED',
        'Replay protection capacity is exhausted; the message was rejected.',
        { retryable: true },
      );
    }
    this.entries.set(key, expiresAt);
    return true;
  }

  prune(now = this.clock()) {
    for (const [key, expiresAt] of this.entries) if (expiresAt <= now) this.entries.delete(key);
  }
}

class AntiRollbackStore {
  constructor() {
    this.sequences = new Map();
  }

  observe(namespace, issuer, sequence, documentOrDigest, options = {}) {
    if (!Number.isSafeInteger(sequence) || sequence < 1) throw trustError('PROOF_INVALID', 'A sequence must be a positive integer.');
    const documentDigest =
      typeof documentOrDigest === 'string' ? documentOrDigest : digest(documentOrDigest);
    const key = `${namespace}:${issuer}`;
    const previous = this.sequences.get(key);
    const rollbackCode =
      namespace === 'revocation' ? 'REVOCATION_ROLLBACK' : 'ISSUER_METADATA_ROLLBACK';
    if (previous && sequence < previous.sequence) {
      throw trustError(namespace === 'revocation' ? 'REVOCATION_ROLLBACK' : 'ISSUER_METADATA_ROLLBACK', 'A trust-document rollback was detected.');
    }
    if (previous && sequence === previous.sequence) {
      if (documentDigest !== previous.digest) {
        throw trustError(rollbackCode, 'Trust-document content changed at the same sequence.');
      }
      return previous.sequence;
    }
    if (previous && options.contiguous === true && sequence !== previous.sequence + 1) {
      throw trustError(rollbackCode, 'A contiguous trust-document sequence was skipped.');
    }
    if (previous && options.previousDigest && options.previousDigest !== previous.digest) {
      throw trustError(rollbackCode, 'The trust-document previous digest is invalid.');
    }
    this.sequences.set(key, { sequence, digest: documentDigest });
    return sequence;
  }
}

class IssuerReviewWorkflow {
  #records = new Map();
  #clock;
  #audit;
  #issuerOptions;

  constructor(options = {}) {
    this.#clock = typeof options.clock === 'function' ? options.clock : Date.now;
    this.#audit = typeof options.audit === 'function' ? options.audit : () => {};
    this.#issuerOptions = {
      localTestMode: options.localTestMode === true,
      allowedLocalIssuers: options.allowedLocalIssuers || [],
    };
  }

  discover(input) {
    validatePlainTrustData(input);
    const issuerId = normalizeIssuerId(input.issuerId, this.#issuerOptions);
    const existing = this.#records.get(issuerId);
    const now = new Date(this.#clock()).toISOString();
    const evidence = issuerReviewEvidence(input, issuerId);
    const record = Object.freeze({
      ...(existing || {}),
      issuerId,
      state: existing?.state || 'discovered',
      evidence,
      approvedScope: existing?.approvedScope,
      discoveredAt: existing?.discoveredAt || now,
      updatedAt: now,
      reviewedAt: existing?.reviewedAt,
      reviewedBy: existing?.reviewedBy,
    });
    this.#records.set(issuerId, record);
    this.#emit(existing ? 'trust.issuer.metadata_verified' : 'trust.issuer.discovered', record);
    return record;
  }

  requestReview(issuerId, context = {}) {
    return this.#transition(issuerId, 'pending_review', context);
  }

  decide(issuerId, decision, context = {}) {
    if (!['approved', 'approved_with_limits', 'suspended', 'blocked', 'revoked'].includes(decision)) {
      throw trustError('TRUST_POLICY_DENIED', 'The issuer review decision is not supported.');
    }
    if (typeof context.reviewedBy !== 'string' || !context.reviewedBy.trim()) {
      throw trustError('TRUST_POLICY_DENIED', 'An administrator identity is required for an issuer review decision.');
    }
    if (decision === 'approved_with_limits' && !context.approvedScope) {
      throw trustError('TRUST_POLICY_DENIED', 'A limited issuer approval requires an explicit approved scope.');
    }
    return this.#transition(issuerId, decision, context);
  }

  expire(issuerId, context = {}) {
    return this.#transition(issuerId, 'expired_review', context);
  }

  get(issuerId) {
    const normalized = normalizeIssuerId(issuerId, this.#issuerOptions);
    return this.#records.get(normalized);
  }

  list() {
    return [...this.#records.values()].sort((left, right) =>
      left.issuerId.localeCompare(right.issuerId),
    );
  }

  #transition(issuerId, nextState, context) {
    validatePlainTrustData(context);
    const normalized = normalizeIssuerId(issuerId, this.#issuerOptions);
    const current = this.#records.get(normalized);
    if (!current) {
      throw trustError('ISSUER_NOT_TRUSTED', 'The issuer has not been discovered for administrator review.');
    }
    if (!ISSUER_REVIEW_TRANSITIONS[current.state]?.includes(nextState)) {
      throw trustError('TRUST_POLICY_DENIED', 'The issuer review state transition is not allowed.');
    }
    const now = new Date(this.#clock()).toISOString();
    const record = Object.freeze({
      ...current,
      state: nextState,
      ...(context.approvedScope
        ? { approvedScope: normalizeIssuerApprovalScope(context.approvedScope, this.#clock()) }
        : nextState === 'approved'
          ? { approvedScope: Object.freeze({ scope: 'organization' }) }
          : {}),
      ...(context.reviewedBy ? { reviewedBy: context.reviewedBy.slice(0, 200) } : {}),
      ...(context.reasonCode ? { reasonCode: String(context.reasonCode).slice(0, 100) } : {}),
      ...(context.reviewedBy ? { reviewedAt: now } : {}),
      updatedAt: now,
    });
    this.#records.set(normalized, record);
    const event = {
      pending_review: 'trust.issuer.review_requested',
      approved: 'trust.issuer.approved',
      approved_with_limits: 'trust.issuer.approved',
      blocked: 'trust.issuer.blocked',
      suspended: 'trust.issuer.suspended',
      expired_review: 'trust.issuer.review_expired',
      revoked: 'trust.issuer.revoked',
    }[nextState];
    this.#emit(event, record);
    return record;
  }

  #emit(event, record) {
    this.#audit(event, redactPublicData({
      issuerId: record.issuerId,
      state: record.state,
      reviewedBy: record.reviewedBy,
      reasonCode: record.reasonCode,
      updatedAt: record.updatedAt,
    }));
  }
}

function issuerReviewEvidence(input, issuerId) {
  const source = input.evidence || input;
  const evidence = {
    issuerId,
    displayName: String(source.displayName || issuerId).slice(0, 200),
    httpsOrigin: issuerId,
    rootKeyThumbprints: boundedStringArray(source.rootKeyThumbprints, 16, 100),
    operationalKeyCount: boundedInteger(source.operationalKeyCount, 0, DEFAULT_TRUST_LIMITS.maximumKeys, 0),
    supportedAlgorithms: boundedStringArray(source.supportedAlgorithms, 8, 32),
    metadataValidity: String(source.metadataValidity || 'not_evaluated').slice(0, 40),
    trustProfile: String(source.trustProfile || source.trustProfileVersion || TRUST_PROFILE_VERSION).slice(0, 100),
    publicSecurityPolicy: boundedOptionalUrl(source.publicSecurityPolicy, issuerId),
    publicPrivacyPolicy: boundedOptionalUrl(source.publicPrivacyPolicy, issuerId),
    publicDocumentation: boundedOptionalUrl(source.publicDocumentation, issuerId),
    registryEvidence: source.registryEvidence ? redactPublicData(source.registryEvidence) : undefined,
    conformanceEvidence: source.conformanceEvidence ? redactPublicData(source.conformanceEvidence) : undefined,
    knownWarnings: boundedStringArray(source.knownWarnings, 32, 100),
    revocationFreshness: REVOCATION_FRESHNESS.includes(source.revocationFreshness)
      ? source.revocationFreshness
      : 'unavailable',
  };
  return Object.freeze(Object.fromEntries(
    Object.entries(evidence).filter(([, value]) => value !== undefined),
  ));
}

function normalizeIssuerApprovalScope(scope, now) {
  validatePlainTrustData(scope);
  if (!['organization', 'workspace'].includes(scope.scope)) {
    throw trustError('TRUST_POLICY_DENIED', 'Issuer approval scope must be organization or workspace.');
  }
  if (scope.scope === 'workspace' && !scope.workspaceId) {
    throw trustError('TRUST_POLICY_DENIED', 'Workspace issuer approval requires a workspace identifier.');
  }
  if (scope.expiresAt && Date.parse(scope.expiresAt) <= now) {
    throw trustError('TRUST_POLICY_DENIED', 'Issuer approval expiration must be in the future.');
  }
  const riskCeiling = scope.riskCeiling || 'low';
  if (!['low', 'moderate', 'high', 'critical'].includes(riskCeiling)) {
    throw trustError('TRUST_POLICY_DENIED', 'Issuer approval risk ceiling is invalid.');
  }
  return Object.freeze({
    scope: scope.scope,
    ...(scope.workspaceId ? { workspaceId: String(scope.workspaceId).slice(0, 200) } : {}),
    selectedAgentIds: boundedStringArray(scope.selectedAgentIds, 256, 200),
    selectedCapabilityKeys: boundedStringArray(scope.selectedCapabilityKeys, 256, 200),
    riskCeiling,
    ...(scope.expiresAt ? { expiresAt: new Date(scope.expiresAt).toISOString() } : {}),
  });
}

function boundedStringArray(value, maximumEntries, maximumLength) {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value) || value.length > maximumEntries) {
    throw trustError('TRUST_POLICY_DENIED', 'Issuer review evidence exceeds its allowed bounds.');
  }
  return Object.freeze(value.map((entry) => {
    if (typeof entry !== 'string' || !entry || entry.length > maximumLength) {
      throw trustError('TRUST_POLICY_DENIED', 'Issuer review evidence contains an invalid value.');
    }
    return entry;
  }));
}

function boundedOptionalUrl(value, issuerId) {
  if (value === undefined) return undefined;
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' && new URL(issuerId).protocol === 'https:') {
    throw trustError('TRUST_POLICY_DENIED', 'Public issuer evidence URLs must use HTTPS.');
  }
  if (parsed.username || parsed.password || parsed.hash) {
    throw trustError('TRUST_POLICY_DENIED', 'Public issuer evidence URL is unsafe.');
  }
  return parsed.toString();
}

function createRequestDescriptor(request) {
  requireFields(request, [
    'method',
    'path',
    'audience',
    'connectionId',
    'protocolVersion',
    'invocationId',
    'messageId',
    'issuedAt',
    'expiresAt',
    'nonce',
  ], 'PROOF_INVALID');
  const method = String(request.method).toUpperCase();
  const path = String(request.path);
  if (!/^[A-Z]+$/.test(method) || !path.startsWith('/') || path.includes('#')) {
    throw trustError('PROOF_INVALID', 'The signed request method or path is invalid.');
  }
  const body = request.body === undefined ? null : request.body;
  return Object.freeze({
    profile: REQUEST_INTEGRITY_PROFILE,
    method,
    path,
    contentDigest: digest(body),
    audience: request.audience,
    connectionId: request.connectionId,
    protocolVersion: request.protocolVersion,
    invocationId: request.invocationId,
    messageId: request.messageId,
    issuedAt: request.issuedAt,
    expiresAt: request.expiresAt,
    nonce: request.nonce,
    ...(request.organizationScope ? { organizationScope: request.organizationScope } : {}),
    ...(request.workspaceScope ? { workspaceScope: request.workspaceScope } : {}),
  });
}

async function signRequest(request, signer, options = {}) {
  const descriptor = createRequestDescriptor(request);
  return Object.freeze({
    descriptor,
    proof: await createProof(descriptor, signer, {
      ...options,
      purpose: options.purpose || 'request_signing',
    }),
  });
}

function verifyRequest(request, signedRequest, jwks, options = {}) {
  const expected = createRequestDescriptor(request);
  if (canonicalize(expected) !== canonicalize(signedRequest.descriptor)) {
    throw trustError('PAYLOAD_DIGEST_MISMATCH', 'The signed request does not match the HTTP request.');
  }
  if (!options.expectedAudience) {
    throw trustError(
      'AUDIENCE_MISMATCH',
      'Expected audience must come from trusted Connection configuration.',
    );
  }
  validateAudience(expected.audience, options.expectedAudience);
  if (options.connectionId && expected.connectionId !== options.connectionId) {
    throw trustError('CONNECTION_TRUST_INVALID', 'The signed request is bound to another Connection.');
  }
  if (options.organizationScope && expected.organizationScope !== options.organizationScope) {
    throw trustError('CONNECTION_TRUST_INVALID', 'The signed request is bound to another organization.');
  }
  if (options.workspaceScope && expected.workspaceScope !== options.workspaceScope) {
    throw trustError('CONNECTION_TRUST_INVALID', 'The signed request is bound to another workspace.');
  }
  validateTimeWindow(expected, {
    now: clockValue(options.clock),
    clockSkewMs: options.clockSkewMs,
    requireFutureExpiry: true,
  });
  const verification = verifyProof(expected, signedRequest.proof, jwks, {
    ...options,
    purpose: options.purpose || 'request_signing',
    issuedAt: expected.issuedAt,
  });
  if (options.replayCache) {
    options.replayCache.consume({
      issuer: options.issuer || 'connection-host',
      kid: verification.kid,
      messageId: expected.messageId,
      audience: expected.audience,
      nonce: expected.nonce,
      connectionId: expected.connectionId,
      expiresAt: expected.expiresAt,
    });
  }
  return Object.freeze({ ...verification, descriptor: expected });
}

function verifyReceipt(receipt, passport, jwks, options = {}) {
  const issuedAt = receipt.completedAt || receipt.issuedAt;
  const key = validateJwks(jwks, options).keys.find((item) => item.kid === receipt.agentExecutionKeyId);
  if (!key) throw trustError('KEY_NOT_FOUND', 'The Receipt execution key was not found.');
  validateAgentExecutionKey(passport, key, { purpose: 'execution_receipt_signing', at: issuedAt });
  if (
    receipt.agentId !== passport.agentId ||
    receipt.passportId !== passport.passportId ||
    receipt.passportVersion !== passport.passportVersion
  ) {
    throw trustError('RECEIPT_PROOF_INVALID', 'The Receipt is not bound to the verified Agent Passport.');
  }
  const verification = verifyDocument(receipt, jwks, {
    ...options,
    historical: true,
    purpose: 'execution_receipt_signing',
    expectedIssuer: passport.issuer,
    requireFutureExpiry: false,
  });
  if (Object.hasOwn(options, 'actualOutput')) {
    assertDigestBinding(receipt.outputDigest, options.actualOutput, 'Receipt output');
  }
  if (Object.hasOwn(options, 'actualEvidence')) {
    assertDigestBinding(receipt.evidenceDigest, options.actualEvidence, 'Receipt evidence');
  }
  if (options.invocation) {
    for (const field of ['invocationId', 'organizationScope', 'workspaceScope']) {
      if (
        options.invocation[field] !== undefined &&
        receipt[field] !== options.invocation[field]
      ) {
        throw trustError(
          'RECEIPT_PROOF_INVALID',
          `The Receipt ${field} binding does not match the Invocation context.`,
        );
      }
    }
  }
  if (
    options.connectionTrustRecord?.connectionId &&
    options.invocation?.connectionId &&
    options.connectionTrustRecord.connectionId !== options.invocation.connectionId
  ) {
    throw trustError(
      'CONNECTION_TRUST_INVALID',
      'The Receipt context is not bound to the Connection Trust Record.',
    );
  }
  return Object.freeze({
    ...verification,
    historicalStatus: historicalReceiptStatus(receipt, key, options.revocationEntry),
  });
}

function historicalReceiptStatus(receipt, key, revocationEntry) {
  if (!revocationEntry) {
    return key.state === 'retired' ? 'valid_with_current_retired_key' : 'valid_at_issuance';
  }
  if (revocationEntry.status === 'compromised') {
    const compromiseTime = Date.parse(revocationEntry.compromiseTime);
    const issued = Date.parse(receipt.completedAt || receipt.issuedAt);
    if (!Number.isFinite(compromiseTime)) return 'indeterminate_due_to_compromise';
    return issued < compromiseTime ? 'indeterminate_due_to_compromise' : 'invalid_due_to_revocation';
  }
  if (revocationEntry.status === 'revoked') return 'invalid_due_to_revocation';
  return key.state === 'retired' ? 'valid_with_current_retired_key' : 'valid_at_issuance';
}

function assertKeyTransition(from, to) {
  if (!KEY_STATES.includes(from) || !KEY_STATES.includes(to) || !KEY_TRANSITIONS[from].includes(to)) {
    throw trustError('KEY_NOT_ACTIVE', 'The requested key-state transition is not allowed.');
  }
  return true;
}

function validateTimeWindow(document, options = {}) {
  const now = options.now ?? Date.now();
  const skew = boundedInteger(options.clockSkewMs, 0, 300_000, DEFAULT_TRUST_LIMITS.clockSkewMs);
  if (document.issuedAt) {
    const issuedAt = validateTimestamp(document.issuedAt, 'MESSAGE_NOT_YET_VALID');
    if (issuedAt > now + skew) throw trustError('MESSAGE_NOT_YET_VALID', 'The signed object was issued too far in the future.');
  }
  if (document.notBefore) {
    const notBefore = validateTimestamp(document.notBefore, 'MESSAGE_NOT_YET_VALID');
    if (notBefore > now + skew) throw trustError('MESSAGE_NOT_YET_VALID', 'The signed object is not yet valid.');
  }
  if (options.requireFutureExpiry === true && !document.expiresAt) {
    throw trustError('MESSAGE_EXPIRED', 'The signed object is missing its required expiration.');
  }
  if (document.expiresAt && options.requireFutureExpiry !== false) {
    const expiresAt = validateTimestamp(document.expiresAt, 'MESSAGE_EXPIRED');
    if (expiresAt <= now - skew) throw trustError('MESSAGE_EXPIRED', 'The signed object has expired.');
  }
  return true;
}

function signedIssuanceTime(payload) {
  const value = payload?.issuedAt || payload?.generatedAt || payload?.completedAt;
  if (!value) {
    throw trustError(
      'PROOF_INVALID',
      'A signed object must contain an authoritative issuance timestamp.',
    );
  }
  validateTimestamp(value, 'PROOF_INVALID');
  return value;
}

function assertDigestBinding(expected, actual, label) {
  const calculated = digest(actual);
  const left = Buffer.from(String(expected || ''), 'utf8');
  const right = Buffer.from(calculated, 'utf8');
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw trustError('RECEIPT_PROOF_INVALID', `${label} digest does not match the actual value.`);
  }
}

function validateTimestamp(value, code = 'PROOF_INVALID') {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw trustError(code, 'A trust-object timestamp is invalid.');
  return time;
}

function requireFields(document, fields, code) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw trustError(code, 'The trust document is malformed.');
  }
  const missing = fields.filter((field) => document[field] === undefined || document[field] === null || document[field] === '');
  if (missing.length) throw trustError(code, 'The trust document is missing required fields.', { details: { missing } });
  return document;
}

function base64urlJson(value) {
  return Buffer.from(canonicalize(value), 'utf8').toString('base64url');
}

function clockValue(clock) {
  return typeof clock === 'function' ? clock() : Date.now();
}

function boundedInteger(value, minimum, maximum, fallback) {
  return Number.isInteger(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;
}

module.exports = {
  ALLOWED_ALGORITHMS,
  AntiRollbackStore,
  CANONICALIZATION_PROFILE,
  DEFAULT_TRUST_LIMITS,
  GhostBridgeTrustError,
  ISSUER_STATUSES,
  ISSUER_REVIEW_STATES,
  ISSUER_REVIEW_TRANSITIONS,
  IssuerReviewWorkflow,
  KEY_PURPOSES,
  KEY_STATES,
  KEY_TRANSITIONS,
  MANDATORY_ALGORITHM,
  PROHIBITED_ALGORITHMS,
  PROOF_PROFILE,
  REQUEST_INTEGRITY_PROFILE,
  REVOCATION_FRESHNESS,
  ReplayCache,
  RevocationCache,
  TRUST_ERROR_CODES,
  TRUST_PROFILE_VERSION,
  TRUST_RESULTS,
  assertAlgorithmAllowed,
  assertKeyTransition,
  assertKeyUsable,
  calculateJwkThumbprint,
  canonicalize,
  createNodeSecurityTransport,
  createProof,
  createRequestDescriptor,
  digest,
  discoverIssuer,
  evaluateTrustPolicy,
  historicalReceiptStatus,
  isPrivateIp,
  issuerDiscoveryUrl,
  loadIssuerJwks,
  normalizeIssuerId,
  normalizeTrustPolicy,
  parseJsonStrict,
  revocationFreshness,
  signDocument,
  signRequest,
  trustError,
  trustResult,
  validateAgentExecutionKey,
  validateAudience,
  validateCapabilityManifest,
  validateIssuerMetadata,
  validateJwks,
  validatePlainTrustData,
  validatePublicJwk,
  validateRevocationSet,
  validateTimeWindow,
  verifyDocument,
  verifyProof,
  verifyReceipt,
  verifyRequest,
  withoutProof,
};
