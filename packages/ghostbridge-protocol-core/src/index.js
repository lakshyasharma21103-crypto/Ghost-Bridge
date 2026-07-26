'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const PROTOCOL_VERSION = 'ghostbridge/0.1-draft';
const PROTOCOL_STABILITY = 'experimental';
const PROFILE_IDS = Object.freeze({
  core: 'ghostbridge.core',
  governedExecution: 'ghostbridge.governed-execution',
  agentCoordination: 'ghostbridge.agent-coordination.experimental',
});
const AUTHENTICATION_MODES = Object.freeze([
  'none',
  'oauth',
  'mutual_tls',
  'signed_request',
  'managed_credential',
  'delegated_credential',
  'platform_brokered',
]);
const DEFAULT_PROFILE_DECLARATIONS = Object.freeze({
  core: Object.freeze({
    id: PROFILE_IDS.core,
    supported: true,
    status: 'draft',
    conformance: Object.freeze(['C1', 'C2', 'C3']),
  }),
  governedExecution: Object.freeze({
    id: PROFILE_IDS.governedExecution,
    supported: true,
    status: 'draft',
    conformance: Object.freeze(['G1', 'G2', 'G3']),
  }),
  agentCoordination: Object.freeze({
    id: PROFILE_IDS.agentCoordination,
    supported: false,
    status: 'deferred',
    conformance: Object.freeze([]),
  }),
});
const DEFAULT_LIMITS = Object.freeze({
  maximumMessageBytes: 262_144,
  maximumStringLength: 65_536,
  maximumArrayLength: 256,
  maximumObjectDepth: 16,
});
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SECRET_KEY_PATTERN =
  /(?:authorization|cookie|api[-_]?key|access[-_]?token|refresh[-_]?token|bearer|password|secret|database[-_]?uri|mongo(?:db)?[-_]?uri|system[-_]?prompt|chain[-_]?of[-_]?thought|hidden[-_]?reasoning|private[-_]?memory|source[-_]?code)/i;
const EXTENSION_IDENTIFIER_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\/[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/;
const EXTENSION_STATES = Object.freeze([
  'experimental',
  'candidate',
  'official',
  'deprecated',
  'removed',
]);

const ERROR_CODES = Object.freeze([
  'INVALID_MESSAGE',
  'MESSAGE_TOO_LARGE',
  'UNSUPPORTED_PROTOCOL_VERSION',
  'NO_COMMON_PROTOCOL_VERSION',
  'CORE_PROFILE_REQUIRED',
  'GOVERNED_PROFILE_REQUIRED',
  'NO_COMPATIBLE_AUTHENTICATION_MODE',
  'REQUIRED_EXTENSION_UNSUPPORTED',
  'INVALID_PASSPORT',
  'PASSPORT_EXPIRED',
  'PASSPORT_SUSPENDED',
  'PASSPORT_REVOKED',
  'INSTALL_GRANT_INVALID',
  'INSTALL_GRANT_EXPIRED',
  'INSTALL_GRANT_ALREADY_REDEEMED',
  'CONNECTION_NOT_ACTIVE',
  'CAPABILITY_NOT_FOUND',
  'CAPABILITY_VERSION_MISMATCH',
  'INPUT_CONTRACT_VIOLATION',
  'OUTPUT_CONTRACT_VIOLATION',
  'AUTHENTICATION_REQUIRED',
  'AUTHORIZATION_DENIED',
  'SCOPE_REQUIRED',
  'SCOPE_MISMATCH',
  'DELEGATION_REQUIRED',
  'DELEGATION_INVALID',
  'DELEGATION_EXPIRED',
  'DELEGATION_EXHAUSTED',
  'DATA_CONTRACT_VIOLATION',
  'APPROVAL_REQUIRED',
  'APPROVAL_INVALID',
  'APPROVAL_EXPIRED',
  'IDEMPOTENCY_CONFLICT',
  'IDEMPOTENCY_REQUIRED',
  'DEADLINE_EXCEEDED',
  'TASK_FAILED',
  'TASK_NOT_FOUND',
  'TASK_NOT_CANCELLABLE',
  'TASK_CANCELLED',
  'TERMINAL_PERSISTENCE_REQUIRED',
  'REVOKED',
  'PROVIDER_UNAVAILABLE',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
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
  'REVOCATION_STATUS_STALE',
  'REVOCATION_STATUS_UNAVAILABLE',
  'REVOCATION_SET_INVALID',
  'REVOCATION_ROLLBACK',
  'CONNECTION_TRUST_INVALID',
  'RECEIPT_PROOF_INVALID',
  'HISTORICAL_TRUST_INDETERMINATE',
  'TRUST_POLICY_DENIED',
  'TRUST_REVIEW_REQUIRED',
]);

class GhostBridgeProtocolError extends Error {
  constructor(errorCode, safeMessage, options = {}) {
    super(safeMessage);
    this.name = 'GhostBridgeProtocolError';
    this.protocolVersion = options.protocolVersion || PROTOCOL_VERSION;
    this.errorCode = ERROR_CODES.includes(errorCode) ? errorCode : 'INTERNAL_ERROR';
    this.safeMessage = String(safeMessage || 'The protocol request could not be completed.').slice(
      0,
      500,
    );
    this.retryable = options.retryable === true;
    if (Number.isFinite(options.retryAfterMs)) {
      this.retryAfterMs = Math.max(0, Math.min(86_400_000, options.retryAfterMs));
    }
    if (options.requestId) this.requestId = String(options.requestId).slice(0, 200);
    if (options.traceId) this.traceId = String(options.traceId).slice(0, 200);
    if (options.details) this.details = boundDetails(options.details);
  }

  toJSON() {
    return Object.fromEntries(
      Object.entries({
        protocolVersion: this.protocolVersion,
        messageType: 'protocol.error',
        errorCode: this.errorCode,
        safeMessage: this.safeMessage,
        retryable: this.retryable,
        retryAfterMs: this.retryAfterMs,
        requestId: this.requestId,
        traceId: this.traceId,
        details: this.details,
      }).filter(([, value]) => value !== undefined),
    );
  }
}

function protocolError(errorCode, safeMessage, options) {
  return new GhostBridgeProtocolError(errorCode, safeMessage, options);
}

function parseProtocolVersion(value) {
  const match = /^ghostbridge\/(\d+)\.(\d+)(?:-([a-z][a-z0-9-]*))?$/.exec(String(value || ''));
  if (!match) {
    throw protocolError('UNSUPPORTED_PROTOCOL_VERSION', 'The protocol version is not supported.');
  }
  return Object.freeze({
    raw: match[0],
    major: Number(match[1]),
    minor: Number(match[2]),
    channel: match[3] || 'stable',
    draft: match[3]?.includes('draft') === true,
  });
}

function validateProtocolVersion(value, supportedVersions = [PROTOCOL_VERSION]) {
  parseProtocolVersion(value);
  if (!supportedVersions.includes(value)) {
    throw protocolError('UNSUPPORTED_PROTOCOL_VERSION', 'The protocol version is not supported.', {
      details: { supportedVersions: supportedVersions.slice(0, 20) },
    });
  }
  return value;
}

function negotiateVersion({
  localSupported = [PROTOCOL_VERSION],
  remoteSupported,
  localPreferred = PROTOCOL_VERSION,
  remotePreferred,
  signedOrHighImpact = false,
  requestedVersion,
} = {}) {
  if (!Array.isArray(remoteSupported) || remoteSupported.length === 0) {
    throw protocolError(
      'UNSUPPORTED_PROTOCOL_VERSION',
      'The peer did not advertise a supported protocol version.',
    );
  }
  const local = [...new Set(localSupported.map((item) => parseProtocolVersion(item).raw))];
  const remote = [...new Set(remoteSupported.map((item) => parseProtocolVersion(item).raw))];
  const compatible = local.filter((version) => remote.includes(version));
  if (requestedVersion) {
    validateProtocolVersion(requestedVersion, compatible);
    return versionSelection(requestedVersion);
  }
  if (!compatible.length) {
    throw protocolError(
      'UNSUPPORTED_PROTOCOL_VERSION',
      'No mutually supported protocol version is available.',
      { details: { supportedVersions: local } },
    );
  }
  const preferred = [localPreferred, remotePreferred].find((item) => compatible.includes(item));
  const selected =
    preferred ||
    compatible
      .map(parseProtocolVersion)
      .sort((left, right) => right.major - left.major || right.minor - left.minor)[0].raw;
  if (signedOrHighImpact && localPreferred && selected !== localPreferred) {
    throw protocolError(
      'UNSUPPORTED_PROTOCOL_VERSION',
      'Silent version downgrade is not allowed for this message.',
    );
  }
  return versionSelection(selected);
}

function versionSelection(version) {
  const parsed = parseProtocolVersion(version);
  return {
    selectedVersion: version,
    stability: parsed.draft ? PROTOCOL_STABILITY : 'stable',
    warnings: parsed.draft ? ['Selected protocol version is an experimental draft.'] : [],
  };
}

function assertPlainData(value, limits = DEFAULT_LIMITS) {
  const normalized = { ...DEFAULT_LIMITS, ...limits };
  visit(value, '$', 0, normalized, new Set());
  return value;
}

function visit(value, location, depth, limits, ancestors) {
  if (depth > limits.maximumObjectDepth) {
    throw protocolError('INVALID_MESSAGE', 'The message exceeds the maximum object depth.', {
      details: { path: location },
    });
  }
  if (typeof value === 'string' && value.length > limits.maximumStringLength) {
    throw protocolError('INVALID_MESSAGE', 'A message string exceeds the configured limit.', {
      details: { path: location },
    });
  }
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw protocolError('INVALID_MESSAGE', 'The message contains a non-finite number.');
    }
    return;
  }
  if (typeof value !== 'object') {
    throw protocolError('INVALID_MESSAGE', 'Public protocol messages must contain plain data only.');
  }
  if (ancestors.has(value)) {
    throw protocolError('INVALID_MESSAGE', 'Cyclic protocol messages are not allowed.');
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    if (value.length > limits.maximumArrayLength) {
      throw protocolError('INVALID_MESSAGE', 'A message array exceeds the configured limit.', {
        details: { path: location },
      });
    }
    value.forEach((item, index) => visit(item, `${location}[${index}]`, depth + 1, limits, ancestors));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw protocolError('INVALID_MESSAGE', 'Protocol objects must be plain data.');
    }
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) {
        throw protocolError('INVALID_MESSAGE', 'The message contains a prohibited object key.', {
          details: { path: `${location}.${key}` },
        });
      }
      visit(value[key], `${location}.${key}`, depth + 1, limits, ancestors);
    }
  }
  ancestors.delete(value);
}

function boundedSerialize(value, limits = DEFAULT_LIMITS) {
  assertPlainData(value, limits);
  const serialized = JSON.stringify(value);
  const bytes = Buffer.byteLength(serialized, 'utf8');
  const maximumMessageBytes = limits.maximumMessageBytes || DEFAULT_LIMITS.maximumMessageBytes;
  if (bytes > maximumMessageBytes) {
    throw protocolError('MESSAGE_TOO_LARGE', 'The protocol message exceeds the configured size.', {
      details: { maximumMessageBytes },
    });
  }
  return serialized;
}

function safeParse(value, options = {}) {
  const maximumMessageBytes =
    options.maximumMessageBytes || DEFAULT_LIMITS.maximumMessageBytes;
  if (Buffer.byteLength(String(value), 'utf8') > maximumMessageBytes) {
    throw protocolError('MESSAGE_TOO_LARGE', 'The protocol message exceeds the configured size.');
  }
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw protocolError('INVALID_MESSAGE', 'The protocol message is not valid JSON.');
  }
  assertPlainData(parsed, options);
  return parsed;
}

function validateExtensionIdentifier(identifier) {
  const value = String(identifier || '').toLowerCase();
  if (value.length > 255 || !EXTENSION_IDENTIFIER_PATTERN.test(value)) {
    throw protocolError('INVALID_MESSAGE', 'An extension identifier is invalid.', {
      details: { identifier: value.slice(0, 255) },
    });
  }
  return value;
}

function validateExtensionDeclaration(declaration) {
  assertRequired(declaration, ['identifier', 'version', 'status', 'required']);
  const identifier = validateExtensionIdentifier(declaration.identifier);
  if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(String(declaration.version))) {
    throw protocolError('INVALID_MESSAGE', 'An extension version is invalid.', {
      details: { identifier },
    });
  }
  if (!EXTENSION_STATES.includes(String(declaration.status).toLowerCase())) {
    throw protocolError('INVALID_MESSAGE', 'An extension status is invalid.', {
      details: { identifier },
    });
  }
  if (typeof declaration.required !== 'boolean') {
    throw protocolError('INVALID_MESSAGE', 'An extension required flag must be boolean.', {
      details: { identifier },
    });
  }
  if (declaration.profiles !== undefined) {
    if (
      !Array.isArray(declaration.profiles) ||
      declaration.profiles.length > 10 ||
      declaration.profiles.some((profile) => !Object.values(PROFILE_IDS).includes(profile))
    ) {
      throw protocolError('INVALID_MESSAGE', 'An extension profile declaration is invalid.', {
        details: { identifier },
      });
    }
  }
  for (const field of ['documentationReference', 'schemaReference']) {
    if (declaration[field] && !isSafeReference(declaration[field])) {
      throw protocolError('INVALID_MESSAGE', `An extension ${field} is unsafe.`, {
        details: { identifier },
      });
    }
  }
  return { ...declaration, identifier };
}

function validateProfileDeclarations(profiles = DEFAULT_PROFILE_DECLARATIONS) {
  assertPlainData(profiles);
  const allowedKeys = new Set(Object.keys(PROFILE_IDS));
  const keys = Object.keys(profiles);
  if (keys.length > allowedKeys.size || keys.some((key) => !allowedKeys.has(key))) {
    throw protocolError('INVALID_MESSAGE', 'The profile declaration contains an unknown profile.');
  }
  const normalized = {};
  for (const key of Object.keys(PROFILE_IDS)) {
    const declaration = profiles[key];
    if (!declaration) continue;
    if (typeof declaration.supported !== 'boolean') {
      throw protocolError('INVALID_MESSAGE', 'A profile supported flag must be boolean.', {
        details: { profile: PROFILE_IDS[key] },
      });
    }
    const status = String(
      declaration.status ||
        (key === 'agentCoordination'
          ? declaration.supported
            ? 'experimental'
            : 'deferred'
          : 'draft'),
    ).toLowerCase();
    const allowedStatuses =
      key === 'agentCoordination'
        ? ['experimental', 'deferred']
        : ['draft', 'experimental', 'deprecated'];
    if (!allowedStatuses.includes(status)) {
      throw protocolError('INVALID_MESSAGE', 'A profile status is invalid.', {
        details: { profile: PROFILE_IDS[key] },
      });
    }
    const conformance = declaration.conformance || [];
    const prefix = key === 'core' ? 'C' : key === 'governedExecution' ? 'G' : 'A';
    if (
      !Array.isArray(conformance) ||
      conformance.length > 10 ||
      conformance.some((level) => !new RegExp(`^${prefix}[1-3]$`).test(String(level)))
    ) {
      throw protocolError('INVALID_MESSAGE', 'A profile conformance declaration is invalid.', {
        details: { profile: PROFILE_IDS[key] },
      });
    }
    normalized[key] = Object.freeze({
      id: PROFILE_IDS[key],
      supported: declaration.supported,
      status,
      conformance: Object.freeze([...new Set(conformance.map(String))].sort()),
    });
  }
  return Object.freeze(normalized);
}

function negotiateAuthenticationMode({
  hostSupported = ['none'],
  agentSupported = ['none'],
  preferred,
} = {}) {
  const host = normalizeAuthenticationModes(hostSupported);
  const agent = normalizeAuthenticationModes(agentSupported);
  const compatible = host.filter((mode) => agent.includes(mode));
  if (!compatible.length) {
    throw protocolError(
      'NO_COMPATIBLE_AUTHENTICATION_MODE',
      'No compatible authentication mode is available.',
      { details: { hostSupported: host, agentSupported: agent } },
    );
  }
  const selectedMode = preferred && compatible.includes(preferred) ? preferred : compatible[0];
  return Object.freeze({
    selectedMode,
    compatibleModes: Object.freeze(compatible),
    explanation: authenticationModeExplanation(selectedMode),
  });
}

function checkCompatibility(input = {}) {
  assertPlainData(input);
  const host = input.host || {};
  const discovery = input.discovery || {};
  const passport = input.passport || {};
  const connectionOffer = input.connectionOffer || {};
  const agentProfiles = validateProfileDeclarations(
    discovery.profiles || passport.profiles || {
      core: { supported: false, status: 'draft', conformance: [] },
    },
  );
  const hostProfiles = validateProfileDeclarations(
    host.profiles || DEFAULT_PROFILE_DECLARATIONS,
  );
  const requiredProfiles = new Set(host.requiredProfiles || [PROFILE_IDS.core]);
  const reasons = [];
  const limitations = [];
  const hostVersions = host.supportedProtocolVersions || [PROTOCOL_VERSION];
  const agentVersions =
    discovery.supportedVersions || passport.supportedProtocolVersions || [];
  const commonVersions = hostVersions.filter((version) => agentVersions.includes(version));
  if (!commonVersions.length) reasons.push(reason('no_common_protocol_version'));
  if (
    requiredProfiles.has(PROFILE_IDS.core) &&
    (!agentProfiles.core?.supported ||
      !['C1', 'C2', 'C3'].every((level) => agentProfiles.core.conformance.includes(level)))
  ) {
    reasons.push(reason('missing_core_conformance'));
  }
  if (
    requiredProfiles.has(PROFILE_IDS.governedExecution) &&
    (!agentProfiles.governedExecution?.supported ||
      !['G1', 'G2', 'G3'].every((level) =>
        agentProfiles.governedExecution.conformance.includes(level),
      ))
  ) {
    reasons.push(reason('governed_profile_not_supported'));
  } else if (
    hostProfiles.governedExecution?.supported &&
    !agentProfiles.governedExecution?.supported
  ) {
    limitations.push(reason('governed_profile_not_supported'));
  }
  if (passport.status === 'revoked') reasons.push(reason('passport_revoked'));
  if (passport.expiresAt && Date.parse(passport.expiresAt) <= Date.now()) {
    reasons.push(reason('passport_expired'));
  }

  let authentication;
  try {
    authentication = negotiateAuthenticationMode({
      hostSupported: host.authenticationModes || ['none'],
      agentSupported:
        connectionOffer.authenticationModes ||
        (connectionOffer.authenticationMode ? [connectionOffer.authenticationMode] : ['none']),
      preferred: host.preferredAuthenticationMode,
    });
  } catch (error) {
    reasons.push(reason('no_compatible_authentication_mode'));
  }

  let extensions = { negotiated: [], unavailableOptional: [], gracefulDegradation: false };
  try {
    extensions = negotiateExtensions({
      client: host.extensions || [],
      agent: connectionOffer.extensions || passport.extensions || [],
    });
    if (extensions.gracefulDegradation) {
      limitations.push(reason('optional_extension_unavailable'));
    }
  } catch (error) {
    reasons.push(reason('required_extension_not_supported'));
  }

  const requiredFeatures = host.requiredGovernedFeatures || {};
  if (requiredFeatures.tasks && discovery.features?.tasks !== true) {
    reasons.push(reason('task_support_required'));
  }
  if (requiredFeatures.receipts && discovery.features?.receipts !== true) {
    reasons.push(reason('receipt_support_required'));
  }
  const status = reasons.length
    ? 'incompatible'
    : limitations.length
      ? 'compatible_with_limitations'
      : 'compatible';
  return Object.freeze({
    status,
    compatible: status !== 'incompatible',
    protocolVersion: commonVersions[0],
    profiles: Object.freeze({
      core: agentProfiles.core,
      governedExecution: agentProfiles.governedExecution,
      agentCoordination: agentProfiles.agentCoordination,
    }),
    authentication,
    extensions,
    reasons: Object.freeze(reasons),
    limitations: Object.freeze(limitations),
  });
}

function assertCompatibility(input = {}) {
  const result = checkCompatibility(input);
  if (result.compatible) return result;
  const first = result.reasons[0]?.code;
  const code = {
    no_common_protocol_version: 'NO_COMMON_PROTOCOL_VERSION',
    missing_core_conformance: 'CORE_PROFILE_REQUIRED',
    governed_profile_not_supported: 'GOVERNED_PROFILE_REQUIRED',
    no_compatible_authentication_mode: 'NO_COMPATIBLE_AUTHENTICATION_MODE',
    required_extension_not_supported: 'REQUIRED_EXTENSION_UNSUPPORTED',
    passport_expired: 'PASSPORT_EXPIRED',
    passport_revoked: 'PASSPORT_REVOKED',
  }[first] || 'INVALID_MESSAGE';
  throw protocolError(code, 'The external agent is not compatible with this host.', {
    details: { reasons: result.reasons },
  });
}

function createInstallationPreview(input = {}) {
  const { discovery = {}, passport = {}, capabilities = [], connectionOffer = {}, scope = {} } =
    input;
  validateDiscovery(discovery);
  validatePassport(passport, input.validationOptions);
  capabilities.forEach(validateCapabilityContract);
  validateConnectionOffer(connectionOffer);
  const compatibility = input.compatibility || checkCompatibility(input);
  const preview = {
    agent: {
      agentId: passport.agentId,
      displayName: passport.displayName,
      safeDescription: passport.safeDescription,
      issuer: passport.issuer,
      passportId: passport.passportId,
      passportVersion: passport.passportVersion,
      status: passport.status,
      expiresAt: passport.expiresAt,
      revocationReference: passport.revocationReference,
    },
    protocolVersion: compatibility.protocolVersion,
    compatibility: {
      status: compatibility.status,
      profiles: compatibility.profiles,
      reasons: compatibility.reasons,
      limitations: compatibility.limitations,
    },
    authentication: {
      modes: connectionOffer.authenticationModes || [connectionOffer.authenticationMode],
      selectedMode: compatibility.authentication?.selectedMode,
      explanation: compatibility.authentication?.explanation,
    },
    capabilities: capabilities.slice(0, 100).map((capability) => ({
      capabilityKey: capability.capabilityKey,
      capabilityVersion: capability.capabilityVersion,
      displayName: capability.displayName,
      safeDescription: capability.safeDescription,
      riskCategory: capability.riskCategory,
      sideEffectCategory: capability.sideEffectCategory,
      approvalRequirement: capability.approvalRequirement,
      acceptedDataClasses: capability.acceptedDataClasses,
      producedDataClasses: capability.producedDataClasses,
      prohibitedDataClasses: capability.prohibitedDataClasses,
      requiredExtensions: (capability.extensions || []).filter?.((item) => item.required) || [],
    })),
    extensions: compatibility.extensions,
    requestedScope: {
      organizationScope: scope.organizationScope,
      ...(scope.workspaceScope ? { workspaceScope: scope.workspaceScope } : {}),
    },
    connectionOfferExpiresAt: connectionOffer.expiresAt,
    revocationState: passport.status === 'active' ? 'active' : passport.status,
  };
  assertNoSecretFields(
    preview,
    'INVALID_MESSAGE',
    'The installation preview contains a prohibited field.',
  );
  return Object.freeze(redactPublicData(preview));
}

function normalizeAuthenticationModes(modes) {
  if (!Array.isArray(modes) || !modes.length || modes.length > AUTHENTICATION_MODES.length) {
    throw protocolError('INVALID_MESSAGE', 'Authentication modes must be a non-empty array.');
  }
  const normalized = [...new Set(modes.map(String))];
  if (normalized.some((mode) => !AUTHENTICATION_MODES.includes(mode))) {
    throw protocolError('INVALID_MESSAGE', 'An authentication mode is invalid.');
  }
  return normalized;
}

function authenticationModeExplanation(mode) {
  return {
    none: 'No additional authentication setup is required.',
    oauth: 'The host completes an OAuth flow without exposing tokens in public messages.',
    mutual_tls: 'The host and agent authenticate with mutually verified certificates.',
    signed_request: 'The host signs each bounded protocol request.',
    managed_credential: 'An operator-managed credential is referenced without entering it in the install flow.',
    delegated_credential: 'A narrowly scoped credential is brokered outside public protocol messages.',
    platform_brokered: 'A compatible control plane brokers authentication and retains only a safe reference.',
  }[mode];
}

function reason(code) {
  return Object.freeze({ code });
}

function validateExtensions(extensions = {}) {
  assertPlainData(extensions);
  if (Array.isArray(extensions)) {
    return extensions.map(validateExtensionDeclaration);
  }
  for (const namespace of Object.keys(extensions)) {
    if (!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+(?:\/[a-z0-9._-]+)?$/i.test(namespace)) {
      throw protocolError('INVALID_MESSAGE', 'An extension namespace is invalid.', {
        details: { namespace },
      });
    }
  }
  return extensions;
}

function negotiateExtensions({ client = [], agent = [] } = {}) {
  const clientDeclarations = validateExtensions(client);
  const agentDeclarations = validateExtensions(agent);
  const clientById = new Map(clientDeclarations.map((item) => [item.identifier, item]));
  const agentById = new Map(agentDeclarations.map((item) => [item.identifier, item]));
  const negotiated = [];
  const unavailableOptional = [];
  const conflicts = [];

  for (const declaration of agentDeclarations) {
    const supported = clientById.get(declaration.identifier);
    if (!supported) {
      if (declaration.required) conflicts.push({
        identifier: declaration.identifier,
        reason: 'required_extension_unsupported',
      });
      else unavailableOptional.push(declaration.identifier);
      continue;
    }
    if (supported.version !== declaration.version) {
      if (declaration.required || supported.required) {
        conflicts.push({
          identifier: declaration.identifier,
          reason: 'extension_version_conflict',
          clientVersion: supported.version,
          agentVersion: declaration.version,
        });
      } else {
        unavailableOptional.push(declaration.identifier);
      }
      continue;
    }
    negotiated.push({
      identifier: declaration.identifier,
      version: declaration.version,
      status: declaration.status,
    });
  }
  for (const declaration of clientDeclarations) {
    if (declaration.required && !agentById.has(declaration.identifier)) {
      conflicts.push({
        identifier: declaration.identifier,
        reason: 'required_extension_unsupported',
      });
    }
  }
  if (conflicts.length) {
    throw protocolError('INVALID_MESSAGE', 'Required extensions could not be negotiated.', {
      details: { conflicts: conflicts.slice(0, 20) },
    });
  }
  return Object.freeze({
    negotiated: negotiated.sort((left, right) => left.identifier.localeCompare(right.identifier)),
    unavailableOptional: [...new Set(unavailableOptional)].sort(),
    gracefulDegradation: unavailableOptional.length > 0,
  });
}

function isSafeReference(value) {
  try {
    const reference = String(value);
    if (reference.startsWith('/')) return !reference.startsWith('//') && !reference.includes('..');
    const url = new URL(reference);
    return ['https:', 'http:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function assertRequired(document, fields, errorCode = 'INVALID_MESSAGE') {
  assertPlainData(document);
  const missing = fields.filter(
    (field) => document?.[field] === undefined || document?.[field] === null || document?.[field] === '',
  );
  if (missing.length) {
    throw protocolError(errorCode, 'The protocol message is missing required fields.', {
      details: { missing },
    });
  }
  if (document.protocolVersion) validateProtocolVersion(document.protocolVersion);
  if (document.extensions) validateExtensions(document.extensions);
  return document;
}

function requireFuture(value, code, message, clock = Date.now) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= clock()) throw protocolError(code, message);
}

function validateDiscovery(document) {
  assertRequired(document, [
    'protocol',
    'supportedVersions',
    'preferredVersion',
    'status',
    'features',
    'transports',
    'maximumMessageBytes',
    'endpoints',
    'extensionNamespaces',
  ]);
  if (document.protocol !== 'ghostbridge') {
    throw protocolError('INVALID_MESSAGE', 'The discovery protocol identifier is invalid.');
  }
  if (!Array.isArray(document.supportedVersions) || !document.supportedVersions.length) {
    throw protocolError('INVALID_MESSAGE', 'Discovery must advertise supported versions.');
  }
  document.supportedVersions.forEach(parseProtocolVersion);
  validateProtocolVersion(document.preferredVersion, document.supportedVersions);
  if (
    !Number.isInteger(document.maximumMessageBytes) ||
    document.maximumMessageBytes < 1 ||
    document.maximumMessageBytes > 16_777_216
  ) {
    throw protocolError('INVALID_MESSAGE', 'Discovery contains an invalid message-size limit.');
  }
  if (document.profiles) validateProfileDeclarations(document.profiles);
  return document;
}

function validatePassport(document, options = {}) {
  assertRequired(
    document,
    [
      'protocolVersion',
      'passportId',
      'passportVersion',
      'agentId',
      'displayName',
      'safeDescription',
      'issuer',
      'issuedAt',
      'expiresAt',
      'status',
      'capabilities',
      'supportedProtocolVersions',
      'supportedTransports',
      'receiptSupport',
      'revocationReference',
    ],
    'INVALID_PASSPORT',
  );
  if (document.status === 'suspended') {
    throw protocolError('PASSPORT_SUSPENDED', 'The Agent Passport is suspended.');
  }
  if (document.status === 'revoked') {
    throw protocolError('PASSPORT_REVOKED', 'The Agent Passport is revoked.');
  }
  if (document.status === 'expired' || Date.parse(document.expiresAt) <= (options.clock || Date.now)()) {
    throw protocolError('PASSPORT_EXPIRED', 'The Agent Passport has expired.');
  }
  if (document.status !== 'active') {
    throw protocolError('INVALID_PASSPORT', 'The Agent Passport is not active.');
  }
  if (
    !Array.isArray(document.supportedProtocolVersions) ||
    !document.supportedProtocolVersions.includes(document.protocolVersion)
  ) {
    throw protocolError(
      'INVALID_PASSPORT',
      'The Agent Passport does not advertise its declared protocol version.',
    );
  }
  if (document.profiles) validateProfileDeclarations(document.profiles);
  assertNoSecretFields(document, 'INVALID_PASSPORT', 'The Agent Passport contains a prohibited field.');
  return document;
}

function validateCapabilityContract(document) {
  assertRequired(document, [
    'capabilityKey',
    'capabilityVersion',
    'displayName',
    'safeDescription',
    'inputContractReference',
    'outputContractReference',
    'acceptedDataClasses',
    'producedDataClasses',
    'prohibitedDataClasses',
    'riskCategory',
    'sideEffectCategory',
    'idempotencySupport',
    'asynchronousSupport',
    'cancellationSupport',
    'requiredPermissions',
    'approvalRequirement',
    'delegationPolicy',
    'timeoutBounds',
    'receiptRequirement',
    'status',
  ]);
  if (!['low', 'moderate', 'high', 'critical', 'unknown'].includes(document.riskCategory)) {
    throw protocolError('INVALID_MESSAGE', 'The Capability Contract risk category is invalid.');
  }
  if (
    !['none', 'read', 'reversible_write', 'irreversible_write', 'external_action', 'unknown'].includes(
      document.sideEffectCategory,
    )
  ) {
    throw protocolError('INVALID_MESSAGE', 'The Capability Contract side-effect category is invalid.');
  }
  if (document.inputSchema) validateContractSchema(document.inputSchema);
  if (document.outputSchema) validateContractSchema(document.outputSchema);
  return document;
}

function validateContractValue(value, schema, direction = 'input') {
  assertPlainData(value);
  validateContractSchema(schema);
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    removeAdditional: false,
    useDefaults: false,
    coerceTypes: false,
  });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(value)) {
    throw protocolError(
      direction === 'output' ? 'OUTPUT_CONTRACT_VIOLATION' : 'INPUT_CONTRACT_VIOLATION',
      `The ${direction} does not satisfy the declared contract.`,
      {
        details: {
          violations: (validate.errors || []).slice(0, 20).map((error) => ({
            path: error.instancePath || '/',
            keyword: error.keyword,
          })),
        },
      },
    );
  }
  return value;
}

function validateContractSchema(schema) {
  assertPlainData(schema);
  if (schema.type !== 'object' || schema.additionalProperties !== false) {
    throw protocolError(
      'INVALID_MESSAGE',
      'Public input and output schemas must be bounded object schemas.',
    );
  }
  return schema;
}

function validateInstallGrant(document, options = {}) {
  assertRequired(document, [
    'grantId',
    'issuer',
    'agentId',
    'organizationScope',
    'expiresAt',
    'status',
  ], 'INSTALL_GRANT_INVALID');
  if (document.status === 'redeemed') {
    throw protocolError('INSTALL_GRANT_ALREADY_REDEEMED', 'The Install Grant was already redeemed.');
  }
  requireFuture(
    document.expiresAt,
    'INSTALL_GRANT_EXPIRED',
    'The Install Grant has expired.',
    options.clock,
  );
  return document;
}

function validateConnectionOffer(document) {
  assertRequired(document, [
    'connectionOfferId',
    'agentId',
    'passportReference',
    'protocolVersion',
    'transportCategory',
    'runtimeReference',
    'authenticationMode',
    'authenticationSetupReference',
    'expiresAt',
    'acceptedOrganizationScope',
    'restrictions',
    'revocationReference',
  ]);
  if (!AUTHENTICATION_MODES.includes(document.authenticationMode)) {
    throw protocolError('INVALID_MESSAGE', 'The Connection Offer authentication mode is invalid.');
  }
  if (document.authenticationModes) normalizeAuthenticationModes(document.authenticationModes);
  if (
    document.authenticationModes &&
    !document.authenticationModes.includes(document.authenticationMode)
  ) {
    throw protocolError(
      'INVALID_MESSAGE',
      'The preferred authentication mode is not in the declared supported modes.',
    );
  }
  assertNoSecretFields(
    document,
    'INVALID_MESSAGE',
    'The Connection Offer contains a prohibited secret field.',
  );
  return document;
}

function validateInvocation(document, options = {}) {
  assertRequired(document, [
    'protocolVersion',
    'invocationId',
    'messageId',
    'organizationScope',
    'initiatingSubject',
    'targetAgentId',
    'targetPassportVersion',
    'capabilityKey',
    'capabilityVersion',
    'inputContractReference',
    'deadline',
    'payload',
    'payloadClassification',
    'requestedReceiptProfile',
  ]);
  requireFuture(document.deadline, 'DEADLINE_EXCEEDED', 'The Invocation deadline has elapsed.', options.clock);
  if (options.workspaceRequired && !document.workspaceScope) {
    throw protocolError('SCOPE_REQUIRED', 'Workspace scope is required.');
  }
  if (options.sideEffecting && !document.idempotencyKey) {
    throw protocolError(
      'IDEMPOTENCY_REQUIRED',
      'Side-effecting Invocations require an idempotency key.',
    );
  }
  if (document.targetUrl || document.endpointUrl) {
    throw protocolError('INVALID_MESSAGE', 'Arbitrary target URLs are not allowed in Invocations.');
  }
  return document;
}

function validateDelegation(document, options = {}) {
  assertRequired(document, [
    'delegationId',
    'delegatorAgentId',
    'delegateAgentId',
    'parentInvocationId',
    'organizationScope',
    'allowedCapabilityKeys',
    'allowedInputContractReferences',
    'allowedDataClasses',
    'prohibitedDataClasses',
    'maximumInvocations',
    'furtherDelegationAllowed',
    'startsAt',
    'expiresAt',
    'revocationReference',
  ], 'DELEGATION_INVALID');
  if (Date.parse(document.expiresAt) <= (options.clock || Date.now)()) {
    throw protocolError('DELEGATION_EXPIRED', 'The Delegation Grant has expired.');
  }
  if (options.capabilityKey && !document.allowedCapabilityKeys.includes(options.capabilityKey)) {
    throw protocolError('DELEGATION_INVALID', 'The Delegation Grant does not allow this capability.');
  }
  if (options.organizationScope && document.organizationScope !== options.organizationScope) {
    throw protocolError('SCOPE_MISMATCH', 'The Delegation Grant organization scope does not match.');
  }
  if (options.workspaceScope && document.workspaceScope !== options.workspaceScope) {
    throw protocolError('SCOPE_MISMATCH', 'The Delegation Grant workspace scope does not match.');
  }
  if (
    options.dataClasses?.some(
      (dataClass) =>
        !document.allowedDataClasses.includes(dataClass) ||
        document.prohibitedDataClasses.includes(dataClass),
    )
  ) {
    throw protocolError('DELEGATION_INVALID', 'The Delegation Grant does not allow a requested data class.');
  }
  if (options.requestFurtherDelegation && document.furtherDelegationAllowed !== true) {
    throw protocolError('DELEGATION_INVALID', 'Further delegation is not allowed.');
  }
  const maximumChainDepth = Number(
    document.maximumChainDepth ?? options.maximumChainDepth ?? 1,
  );
  if (options.chainDepth && Number(options.chainDepth) > maximumChainDepth) {
    throw protocolError('DELEGATION_INVALID', 'The Delegation Grant chain depth is exceeded.');
  }
  if (Number(document.remainingInvocations ?? document.maximumInvocations) <= 0) {
    throw protocolError('DELEGATION_EXHAUSTED', 'The Delegation Grant is exhausted.');
  }
  return document;
}

function projectDataContract(input, contract, options = {}) {
  assertRequired(contract, [
    'contractKey',
    'contractVersion',
    'direction',
    'allowedFields',
    'requiredFields',
    'prohibitedFields',
    'acceptedDataClasses',
    'prohibitedDataClasses',
    'maximumPayloadBytes',
    'maximumStringLength',
    'maximumArrayLength',
    'maximumObjectDepth',
    'status',
  ]);
  assertPlainData(input, {
    maximumMessageBytes: contract.maximumPayloadBytes,
    maximumStringLength: contract.maximumStringLength,
    maximumArrayLength: contract.maximumArrayLength,
    maximumObjectDepth: contract.maximumObjectDepth,
  });
  const prohibited = new Set(contract.prohibitedFields.map((field) => String(field).toLowerCase()));
  const projected = {};
  for (const field of contract.allowedFields) {
    const value = getPath(input, field);
    if (value === undefined) continue;
    if (prohibited.has(String(field).toLowerCase()) || SECRET_KEY_PATTERN.test(field)) {
      if (options.policy === 'redact') setPath(projected, field, '[REDACTED]');
      else throw protocolError('DATA_CONTRACT_VIOLATION', 'The payload contains a prohibited field.');
      continue;
    }
    setPath(projected, field, clonePlain(value));
  }
  const unexpected = collectLeafPaths(input).filter(
    (field) => !contract.allowedFields.some((allowed) => field === allowed || field.startsWith(`${allowed}.`)),
  );
  const secretUnexpected = unexpected.filter((field) => SECRET_KEY_PATTERN.test(field));
  if (secretUnexpected.length || (unexpected.length && options.rejectUnexpected !== false)) {
    throw protocolError('DATA_CONTRACT_VIOLATION', 'The payload contains fields outside the Data Contract.', {
      details: { prohibitedPaths: [...new Set([...secretUnexpected, ...unexpected])].slice(0, 20) },
    });
  }
  const missing = contract.requiredFields.filter((field) => getPath(projected, field) === undefined);
  if (missing.length) {
    throw protocolError('DATA_CONTRACT_VIOLATION', 'The payload is missing required fields.', {
      details: { missing },
    });
  }
  boundedSerialize(projected, { ...DEFAULT_LIMITS, maximumMessageBytes: contract.maximumPayloadBytes });
  return projected;
}

function validateApprovalChallenge(document) {
  assertRequired(document, [
    'challengeId',
    'invocationId',
    'organizationScope',
    'actionKey',
    'approvalActionDigest',
    'safeSummary',
    'requiredRoleCategories',
    'approvalLimits',
    'expiresAt',
    'requestedBy',
    'policyDecisionReference',
    'status',
  ]);
  assertApprovalActionDigest(document.approvalActionDigest);
  return document;
}

function validateApprovalDecision(document, challenge, options = {}) {
  assertRequired(document, [
    'challengeId',
    'decisionId',
    'decision',
    'approvalActionDigest',
    'approvedLimits',
    'decidedBy',
    'decidedAt',
    'safeReasonCode',
  ], 'APPROVAL_INVALID');
  if (challenge) {
    validateApprovalChallenge(challenge);
    if (document.challengeId !== challenge.challengeId) {
      throw protocolError('APPROVAL_INVALID', 'The Approval Decision is not bound to this challenge.');
    }
    if (document.approvalActionDigest !== challenge.approvalActionDigest) {
      throw protocolError(
        'APPROVAL_INVALID',
        'The Approval Decision is not bound to the challenged action.',
      );
    }
    if (Date.parse(challenge.expiresAt) <= (options.clock || Date.now)()) {
      throw protocolError('APPROVAL_EXPIRED', 'The Approval Challenge has expired.');
    }
    if (challenge.status !== 'pending') {
      throw protocolError('APPROVAL_INVALID', 'The Approval Challenge cannot be reused.');
    }
    if (!limitsWithin(document.approvedLimits, challenge.approvalLimits)) {
      throw protocolError('APPROVAL_INVALID', 'The Approval Decision exceeds the challenged limits.');
    }
  }
  assertApprovalActionDigest(document.approvalActionDigest);
  return document;
}

function createApprovalAction(input = {}) {
  assertRequired(input, [
    'invocationId',
    'connectionId',
    'capabilityKey',
    'capabilityVersion',
    'organizationScope',
    'inputContractReference',
    'approvalLimits',
    'policyDecisionReference',
    'validityBoundary',
  ], 'APPROVAL_INVALID');
  const requiredStrings = [
    'invocationId',
    'connectionId',
    'capabilityKey',
    'capabilityVersion',
    'organizationScope',
    'inputContractReference',
    'policyDecisionReference',
    'validityBoundary',
  ];
  if (
    requiredStrings.some(
      (field) =>
        typeof input[field] !== 'string' ||
        !input[field].trim() ||
        input[field].length > 500,
    ) ||
    (input.workspaceScope !== undefined &&
      (typeof input.workspaceScope !== 'string' ||
        !input.workspaceScope.trim() ||
        input.workspaceScope.length > 200)) ||
    (input.sideEffectCategory !== undefined &&
      (typeof input.sideEffectCategory !== 'string' ||
        !input.sideEffectCategory.trim() ||
        input.sideEffectCategory.length > 100)) ||
    !Number.isFinite(Date.parse(input.validityBoundary)) ||
    !input.approvalLimits ||
    typeof input.approvalLimits !== 'object' ||
    Array.isArray(input.approvalLimits)
  ) {
    throw protocolError('APPROVAL_INVALID', 'The approval action binding is invalid.');
  }
  const payloadDigest = input.payload !== undefined
    ? canonicalApprovalDigest(input.payload)
    : input.payloadDigest;
  assertApprovalActionDigest(payloadDigest);
  const action = removeUndefined({
    invocationId: input.invocationId,
    connectionId: input.connectionId,
    capabilityKey: input.capabilityKey,
    capabilityVersion: input.capabilityVersion,
    organizationScope: input.organizationScope,
    workspaceScope: input.workspaceScope,
    inputContractReference: input.inputContractReference,
    payloadDigest,
    sideEffectCategory: input.sideEffectCategory,
    approvalLimits: clonePlain(input.approvalLimits),
    policyDecisionReference: input.policyDecisionReference,
    validityBoundary: input.validityBoundary,
  });
  assertPlainData(action, {
    ...DEFAULT_LIMITS,
    maximumMessageBytes: Math.min(DEFAULT_LIMITS.maximumMessageBytes, 32_768),
  });
  return Object.freeze(action);
}

function approvalActionDigest(input) {
  return canonicalApprovalDigest(createApprovalAction(input));
}

function assertApprovalActionDigest(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) {
    throw protocolError('APPROVAL_INVALID', 'The approval action digest is invalid.');
  }
  return value;
}

function canonicalApprovalDigest(value) {
  assertPlainData(value);
  return digest(canonicalizeApprovalValue(value));
}

function canonicalizeApprovalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalizeApprovalValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeApprovalValue(value[key])]),
  );
}

const TASK_TRANSITIONS = Object.freeze({
  accepted: ['queued', 'running', 'cancelled', 'revoked'],
  queued: ['running', 'cancelled', 'timed_out', 'revoked'],
  running: ['waiting_for_approval', 'waiting_for_dependency', 'completed', 'failed', 'cancelled', 'timed_out', 'recovery_required', 'compensation_required', 'revoked'],
  waiting_for_approval: ['running', 'failed', 'cancelled', 'timed_out', 'revoked'],
  waiting_for_dependency: ['running', 'failed', 'cancelled', 'timed_out', 'revoked'],
  recovery_required: ['running', 'failed', 'cancelled', 'compensation_required'],
  compensation_required: ['running', 'completed', 'failed'],
  completed: [],
  failed: [],
  cancelled: [],
  timed_out: [],
  revoked: [],
});

function validateTask(document) {
  assertRequired(document, [
    'taskId',
    'invocationId',
    'state',
    'safeProgressCategory',
    'createdAt',
    'updatedAt',
    'deadline',
    'cancellationSupported',
    'retryCategory',
    'nextActionCategory',
  ]);
  if (!Object.hasOwn(TASK_TRANSITIONS, document.state)) {
    throw protocolError('INVALID_MESSAGE', 'The Execution Task state is invalid.');
  }
  return document;
}

function transitionTask(task, state, at = new Date().toISOString()) {
  validateTask(task);
  if (!TASK_TRANSITIONS[task.state].includes(state)) {
    throw protocolError('INVALID_MESSAGE', 'The Execution Task transition is invalid.');
  }
  return {
    ...task,
    state,
    updatedAt: at,
    ...(state === 'running' && !task.startedAt ? { startedAt: at } : {}),
    ...(['completed', 'failed', 'cancelled', 'timed_out', 'revoked'].includes(state)
      ? { completedAt: at }
      : {}),
  };
}

function validateReceipt(document) {
  assertRequired(document, [
    'receiptId',
    'invocationId',
    'taskId',
    'agentId',
    'passportVersion',
    'capabilityKey',
    'capabilityVersion',
    'organizationScope',
    'outcome',
    'outputContractReference',
    'startedAt',
    'completedAt',
    'attemptCount',
    'outputDigest',
    'evidenceDigest',
    'revocationStateAtExecution',
  ]);
  if (
    ![
      'completed',
      'failed',
      'cancelled',
      'timed_out',
      'rejected',
      'revoked',
      'partially_completed',
      'compensated',
    ].includes(document.outcome)
  ) {
    throw protocolError('INVALID_MESSAGE', 'The Execution Receipt outcome is invalid.');
  }
  assertNoSecretFields(
    document,
    'INVALID_MESSAGE',
    'The Execution Receipt contains a prohibited secret field.',
  );
  return document;
}

function validateRevocation(document) {
  return assertRequired(document, [
    'revocationId',
    'subjectType',
    'subjectReference',
    'status',
    'reasonCode',
    'effectiveAt',
    'issuedBy',
  ]);
}

function redactPublicData(value) {
  const cleaned = removeUndefined(value);
  assertPlainData(cleaned);
  return redactWalk(cleaned);
}

function redactWalk(value) {
  if (Array.isArray(value)) return value.map(redactWalk);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : redactWalk(child),
    ]),
  );
}

function removeUndefined(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined).map(removeUndefined);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [key, removeUndefined(child)]),
  );
}

function digest(value) {
  return crypto.createHash('sha256').update(boundedSerialize(value)).digest('base64url');
}

function createDeterministicTestSigner(secret = 'ghostbridge-test-only-signing-secret') {
  return {
    algorithm: 'HMAC-SHA256-TEST-ONLY',
    sign(value) {
      return crypto.createHmac('sha256', secret).update(boundedSerialize(value)).digest('base64url');
    },
    verify(value, signature) {
      const expected = this.sign(value);
      const received = String(signature || '');
      if (expected.length !== received.length) return false;
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
    },
  };
}

function loadSchemas() {
  const schemaDirectory = path.resolve(__dirname, '../../../protocol/schemas/0.1-draft');
  return Object.fromEntries(
    fs
      .readdirSync(schemaDirectory)
      .filter((file) => file.endsWith('.schema.json'))
      .sort()
      .map((file) => [file.replace('.schema.json', ''), JSON.parse(fs.readFileSync(path.join(schemaDirectory, file), 'utf8'))]),
  );
}

function createSchemaValidators() {
  const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: true });
  addFormats(ajv);
  const schemas = loadSchemas();
  Object.values(schemas).forEach((schema) => ajv.addSchema(schema));
  return {
    schemas,
    validate(name, document) {
      const schema = schemas[name];
      if (!schema) throw new Error(`Unknown Ghost Bridge schema: ${name}`);
      const validate = ajv.getSchema(schema.$id) || ajv.compile(schema);
      if (!validate(document)) {
        throw protocolError('INVALID_MESSAGE', 'The protocol message does not match its JSON Schema.', {
          details: validate.errors?.slice(0, 20).map((error) => ({
            path: error.instancePath || '$',
            keyword: error.keyword,
          })),
        });
      }
      return document;
    },
  };
}

function getPath(value, dottedPath) {
  return String(dottedPath).split('.').reduce((current, segment) => current?.[segment], value);
}

function setPath(target, dottedPath, value) {
  const segments = String(dottedPath).split('.');
  let current = target;
  segments.forEach((segment, index) => {
    if (FORBIDDEN_KEYS.has(segment)) {
      throw protocolError('INVALID_MESSAGE', 'A Data Contract path contains a prohibited key.');
    }
    if (index === segments.length - 1) current[segment] = value;
    else current = current[segment] ||= {};
  });
}

function collectLeafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return prefix ? [prefix] : [];
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child)
      ? collectLeafPaths(child, next)
      : [next];
  });
}

function assertNoSecretFields(value, errorCode, message) {
  const prohibited = collectLeafPaths(value).filter((field) => SECRET_KEY_PATTERN.test(field));
  if (prohibited.length) {
    throw protocolError(errorCode, message, {
      details: { prohibitedPaths: prohibited.slice(0, 20) },
    });
  }
}

function limitsWithin(approved, challenged) {
  if (!approved || typeof approved !== 'object') return true;
  return Object.entries(approved).every(([key, value]) => {
    if (!Object.hasOwn(challenged || {}, key)) return false;
    const limit = challenged[key];
    if (typeof value === 'number' && typeof limit === 'number') return value <= limit;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return limitsWithin(value, limit);
    }
    return value === limit;
  });
}

function clonePlain(value) {
  return safeParse(boundedSerialize(value));
}

function boundDetails(details) {
  try {
    const cleaned = redactPublicData(details);
    const serialized = JSON.stringify(cleaned);
    if (serialized.length <= 4_000) return cleaned;
  } catch {
    // Fall through to the safe generic detail.
  }
  return { truncated: true };
}

module.exports = {
  AUTHENTICATION_MODES,
  DEFAULT_LIMITS,
  DEFAULT_PROFILE_DECLARATIONS,
  ERROR_CODES,
  EXTENSION_STATES,
  GhostBridgeProtocolError,
  PROTOCOL_STABILITY,
  PROTOCOL_VERSION,
  PROFILE_IDS,
  TASK_TRANSITIONS,
  assertPlainData,
  boundedSerialize,
  approvalActionDigest,
  createApprovalAction,
  createDeterministicTestSigner,
  createInstallationPreview,
  createSchemaValidators,
  digest,
  loadSchemas,
  negotiateVersion,
  negotiateExtensions,
  negotiateAuthenticationMode,
  parseProtocolVersion,
  projectDataContract,
  protocolError,
  redactPublicData,
  safeParse,
  transitionTask,
  validateApprovalChallenge,
  validateApprovalDecision,
  validateCapabilityContract,
  validateContractValue,
  validateConnectionOffer,
  validateDelegation,
  validateDiscovery,
  validateExtensions,
  validateExtensionDeclaration,
  validateExtensionIdentifier,
  validateProfileDeclarations,
  validateInstallGrant,
  validateInvocation,
  validatePassport,
  validateProtocolVersion,
  validateReceipt,
  validateRevocation,
  validateTask,
  checkCompatibility,
  assertCompatibility,
};
