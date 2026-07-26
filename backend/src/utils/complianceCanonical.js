const crypto = require('node:crypto');
const { redactSecrets } = require('./redact');

function canonicalValue(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new TypeError('Canonical values must contain finite numbers.');
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalValue).filter((item) => item !== undefined);
  if (typeof value !== 'object') throw new TypeError('Canonical value type is not supported.');
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .flatMap((key) => {
        const normalized = canonicalValue(value[key]);
        return normalized === undefined ? [] : [[key, normalized]];
      }),
  );
}

function canonicalize(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(String(value)).digest('hex')}`;
}

function canonicalDigest(value) {
  return sha256(canonicalize(value));
}

function safePayloadDigest(value) {
  return canonicalDigest(redactSecrets(value));
}

function approvalFingerprint(input = {}) {
  const selected = {
    organizationId: String(input.organizationId || ''),
    workspaceId: String(input.workspaceId || ''),
    requesterActorId: String(input.requesterActorId || ''),
    permission: String(input.permission || ''),
    resourceType: String(input.resourceType || ''),
    resourceId: String(input.resourceId || ''),
    connectionId: String(input.connectionId || ''),
    capabilityId: String(input.capabilityId || ''),
    operationType: String(input.operationType || ''),
    environment: String(input.environment || ''),
    workflowId: String(input.workflowId || ''),
    workflowVersion: Number(input.workflowVersion || 0),
    policySnapshotRevision: Number(input.policySnapshotRevision || 0),
    safeAttributesDigest:
      input.safeAttributesDigest ||
      (Object.hasOwn(input, 'safeRequestAttributes')
        ? safePayloadDigest(input.safeRequestAttributes)
        : ''),
  };
  return { digest: canonicalDigest(selected), selected };
}

module.exports = {
  approvalFingerprint,
  canonicalDigest,
  canonicalValue,
  canonicalize,
  safePayloadDigest,
  sha256,
};
