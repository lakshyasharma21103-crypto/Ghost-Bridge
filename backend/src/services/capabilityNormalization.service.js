const { canonicalize } = require('../utils/idempotency');
const { sha256 } = require('../utils/complianceCanonical');
const { AGENT_SELECTION_LIMITS } = require('../constants/agentSelection');
const { assertSafePayload } = require('./orchestrationValidation.service');
const { sanitizeSchema } = require('./schemaCompatibility.service');
const { AppError } = require('../utils/AppError');

const SAFE_KEY = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/;
const SAFE_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]{1,32})?$/;

function normalizationError(code, message, path) {
  throw new AppError(400, code, message, path ? [{ path, code, message }] : []);
}

function boundedUnique(values, options = {}) {
  const limit = options.limit || AGENT_SELECTION_LIMITS.maximumArrayItems;
  const maximumLength = options.maximumLength || 128;
  const normalized = [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))];
  if (normalized.length > limit || normalized.some((value) => value.length > maximumLength)) {
    normalizationError('AGENT_CAPABILITY_METADATA_INVALID', 'Capability metadata exceeds a safe bound.', options.path);
  }
  return normalized.sort();
}

function normalizeOperationKeys(capability = {}) {
  const operations = boundedUnique([capability.name, capability.runtimeToolName].filter(Boolean), {
    path: 'operationKeys',
  });
  if (!operations.length || operations.some((operation) => !SAFE_KEY.test(operation))) {
    normalizationError('AGENT_CAPABILITY_OPERATION_INVALID', 'Capability operation key is invalid.', 'operationKeys');
  }
  return operations;
}

function normalizeCapability(capability = {}, passport = {}) {
  assertSafePayload({
    name: capability.name,
    description: capability.description,
    inputSchema: capability.inputSchema,
    outputSchema: capability.outputSchema,
  }, '$capability');
  const capabilityKey = String(capability.name || '').trim();
  if (!SAFE_KEY.test(capabilityKey)) {
    normalizationError('AGENT_CAPABILITY_KEY_INVALID', 'Capability key is invalid.', 'capabilityKey');
  }
  const description = String(capability.description || '').trim();
  if (description.length > AGENT_SELECTION_LIMITS.maximumCapabilityDescriptionLength) {
    normalizationError('AGENT_CAPABILITY_DESCRIPTION_INVALID', 'Capability description exceeds the safe limit.', 'description');
  }
  const semanticVersion = String(passport.agent?.version || '').trim();
  if (!SAFE_VERSION.test(semanticVersion)) {
    normalizationError('AGENT_CAPABILITY_VERSION_INVALID', 'Capability semantic version is invalid.', 'semanticVersion');
  }
  return {
    capabilityKey,
    displayName: capabilityKey,
    description,
    operationKeys: normalizeOperationKeys(capability),
    inputSchema: sanitizeSchema(capability.inputSchema, '$capability.inputSchema'),
    outputSchema: sanitizeSchema(capability.outputSchema, '$capability.outputSchema'),
    semanticVersion,
    categories: boundedUnique([capability.category || 'UNCLASSIFIED'], { maximumLength: 64 }),
    dataHandlingDeclarations: boundedUnique([capability.classification || 'UNCLASSIFIED'], { maximumLength: 64 }),
    supportedRegions: [],
    costClass: 'unknown',
    latencyClass: 'unknown',
    verificationStatus: 'passport_validated',
  };
}

function normalizePassportCapabilities(passport, capabilities = []) {
  const normalized = capabilities.filter((capability) => capability.enabled !== false).map((capability) => normalizeCapability(capability, passport));
  const keys = new Set();
  for (const capability of normalized) {
    if (keys.has(capability.capabilityKey)) {
      normalizationError('AGENT_CAPABILITY_DUPLICATE', 'Duplicate capability declarations are forbidden.', 'capabilities');
    }
    keys.add(capability.capabilityKey);
  }
  return normalized.sort((left, right) => left.capabilityKey.localeCompare(right.capabilityKey));
}

function catalogSourceVersion(passport, connection, capabilities) {
  return sha256(canonicalize({
    passportId: String(passport._id),
    passportVersion: passport.agent?.version,
    passportStatus: passport.status,
    connectionId: String(connection._id),
    connectionStatus: connection.status,
    capabilities,
  }));
}

module.exports = {
  SAFE_KEY,
  catalogSourceVersion,
  normalizeCapability,
  normalizeOperationKeys,
  normalizePassportCapabilities,
};
