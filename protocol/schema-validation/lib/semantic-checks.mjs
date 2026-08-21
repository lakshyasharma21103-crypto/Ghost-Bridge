import { createHash } from 'node:crypto';

import { fail } from './errors.mjs';
import { canonicalDnsName } from './idna2008.mjs';

export { canonicalDnsName } from './idna2008.mjs';

export function canonicalBase64url(
  value,
  minimumBytes = 1,
  maximumBytes = Number.POSITIVE_INFINITY,
) {
  if (typeof value !== 'string' || value.includes('=') || !/^[A-Za-z0-9_-]+$/u.test(value))
    return false;
  const decoded = Buffer.from(value, 'base64url');
  return (
    decoded.length >= minimumBytes &&
    decoded.length <= maximumBytes &&
    decoded.toString('base64url') === value
  );
}

export function canonicalBase64url32Octets(value) {
  return canonicalBase64url(value, 32, 32);
}

export function canonicalTimestamp(value) {
  if (typeof value !== 'string') return false;
  const match = value.match(
    /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])\.([0-9]{3})Z$/u,
  );
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || year > 9999) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

export function compareCanonicalTimestamps(left, right) {
  if (!canonicalTimestamp(left) || !canonicalTimestamp(right))
    fail('Timestamp comparison requires two canonical timestamps');
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function semanticTimeEvidence(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.kind === 'exact') return canonicalTimestamp(value.at);
  if (value.kind !== 'interval' || !value.lower || !value.upper) return false;
  if (!canonicalTimestamp(value.lower.at) || !canonicalTimestamp(value.upper.at)) return false;
  const comparison = compareCanonicalTimestamps(value.lower.at, value.upper.at);
  return (
    comparison < 0 ||
    (comparison === 0 && value.lower.inclusive === true && value.upper.inclusive === true)
  );
}

export function decodeArtifactBytesHex(semanticInput) {
  if (!semanticInput || typeof semanticInput !== 'object' || Array.isArray(semanticInput))
    return undefined;
  if (Object.keys(semanticInput).length !== 1 || typeof semanticInput.artifactBytesHex !== 'string')
    return undefined;
  const hexadecimal = semanticInput.artifactBytesHex;
  if (hexadecimal.length % 2 !== 0 || !/^[0-9A-Fa-f]*$/u.test(hexadecimal)) return undefined;
  return Buffer.from(hexadecimal, 'hex');
}

export function sha256Base64url(bytes) {
  return createHash('sha256').update(bytes).digest('base64url');
}

export function artifactByteIntegrityMatches(value, semanticInput) {
  const bytes = decodeArtifactBytesHex(semanticInput);
  if (bytes === undefined || !value || typeof value !== 'object' || Array.isArray(value))
    return false;
  if (value.algorithm !== 'sha-256' || !canonicalBase64url32Octets(value.value)) return false;
  if (!Number.isSafeInteger(value.byteLength) || value.byteLength < 0) return false;
  return value.value === sha256Base64url(bytes) && value.byteLength === bytes.byteLength;
}

export function semanticCommitmentRef(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.profile === 'gb-digest-jcs-sha256-v1' &&
    typeof value.domain === 'string' &&
    /^(?:[a-z]|[a-z][a-z0-9.-]{0,126}[a-z0-9])$/u.test(value.domain) &&
    canonicalBase64url32Octets(value.value)
  );
}

export function semanticCommitmentRefForOwner(value, profile, domain) {
  return semanticCommitmentRef(value) && value.profile === profile && value.domain === domain;
}

export function canonicalIpv4(value) {
  if (
    typeof value !== 'string' ||
    !/^(?:0|[1-9][0-9]{0,2})(?:\.(?:0|[1-9][0-9]{0,2})){3}$/u.test(value)
  )
    return false;
  const octets = value.split('.').map(Number);
  return octets.every((octet) => octet <= 255) && octets.join('.') === value;
}

function parseIpv6(value) {
  if (
    typeof value !== 'string' ||
    value.length < 2 ||
    value.length > 39 ||
    !/^[0-9a-f:]+$/u.test(value)
  )
    return undefined;
  const compressed = value.includes('::');
  if (compressed && value.indexOf('::') !== value.lastIndexOf('::')) return undefined;
  const halves = compressed ? value.split('::') : [value];
  const left = halves[0] === '' ? [] : halves[0].split(':');
  const right = compressed && halves[1] !== '' ? halves[1].split(':') : [];
  const explicit = compressed ? [...left, ...right] : left;
  if (explicit.some((group) => !/^[0-9a-f]{1,4}$/u.test(group))) return undefined;
  if ((!compressed && explicit.length !== 8) || (compressed && explicit.length >= 8))
    return undefined;
  const groups = explicit.map((group) => Number.parseInt(group, 16));
  if (compressed) groups.splice(left.length, 0, ...Array(8 - explicit.length).fill(0));
  return groups.length === 8 ? groups : undefined;
}

function encodeCanonicalIpv6(groups) {
  let bestStart = -1;
  let bestLength = 0;
  for (let index = 0; index < groups.length;) {
    if (groups[index] !== 0) {
      index += 1;
      continue;
    }
    let end = index;
    while (end < groups.length && groups[end] === 0) end += 1;
    const length = end - index;
    if (length >= 2 && length > bestLength) {
      bestStart = index;
      bestLength = length;
    }
    index = end;
  }
  const rendered = groups.map((group) => group.toString(16));
  if (bestStart < 0) return rendered.join(':');
  return `${rendered.slice(0, bestStart).join(':')}::${rendered.slice(bestStart + bestLength).join(':')}`;
}

export function canonicalIpv6(value) {
  const groups = parseIpv6(value);
  if (!groups) return false;
  const ipv4Mapped = groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  return !ipv4Mapped && encodeCanonicalIpv6(groups) === value;
}

export function semanticOrigin(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !value.host) return false;
  if (!Number.isInteger(value.port) || value.port < 1 || value.port > 65535) return false;
  if (value.scheme !== 'http' && value.scheme !== 'https') return false;
  if (value.host.kind === 'dns') return canonicalDnsName(value.host.value);
  if (value.host.kind === 'ipv4') return canonicalIpv4(value.host.value);
  if (value.host.kind === 'ipv6') return canonicalIpv6(value.host.value);
  return false;
}

export function createSemanticCheckRegistry(entries) {
  const registry = Object.create(null);
  for (const [identifier, predicate] of entries) {
    if (typeof identifier !== 'string' || typeof predicate !== 'function')
      fail('Invalid semantic-check registration');
    if (Object.hasOwn(registry, identifier))
      fail(`Duplicate semantic-check registration: ${identifier}`);
    registry[identifier] = predicate;
  }
  return Object.freeze(registry);
}

const semanticChecks = createSemanticCheckRegistry([
  ['none', () => true],
  ['tenant-id', (testCase, context) => context.validateTarget(testCase.value)],
  [
    'tenant-exact-equality',
    (testCase) => (testCase.values[0] === testCase.values[1]) === testCase.equalExpected,
  ],
  ['canonical-base64url', (testCase) => canonicalBase64url(testCase.value)],
  ['canonical-base64url-32-octets', (testCase) => canonicalBase64url32Octets(testCase.value)],
  ['canonical-timestamp', (testCase) => canonicalTimestamp(testCase.value)],
  ['time-evidence', (testCase) => semanticTimeEvidence(testCase.value)],
  [
    'artifact-byte-integrity',
    (testCase) => artifactByteIntegrityMatches(testCase.value, testCase.semanticInput),
  ],
  ['extension-identity', (testCase, context) => context.validateTarget(testCase.value)],
  [
    'extension-exact-equality',
    (testCase) => (testCase.values[0] === testCase.values[1]) === testCase.equalExpected,
  ],
  ['semantic-commitment-ref', (testCase) => semanticCommitmentRef(testCase.value)],
  ['origin', (testCase) => semanticOrigin(testCase.value)],
]);

export const semanticCheckIds = Object.freeze(Object.keys(semanticChecks).sort());

export function declaredSemanticCheckIds(fixtureSchema) {
  const valueIdentifiers = fixtureSchema?.$defs?.valueCase?.properties?.semanticCheck?.enum;
  const equalityIdentifier =
    fixtureSchema?.$defs?.equalityCase?.properties?.semanticCheck?.enum ??
    fixtureSchema?.$defs?.equalityCase?.properties?.semanticCheck?.const;
  const equalityIdentifiers = Array.isArray(equalityIdentifier)
    ? equalityIdentifier
    : [equalityIdentifier];
  if (
    !Array.isArray(valueIdentifiers) ||
    equalityIdentifiers.some((identifier) => typeof identifier !== 'string')
  ) {
    fail('Fixture schema does not declare its semantic-check identifiers');
  }
  return [...new Set([...valueIdentifiers, ...equalityIdentifiers])].sort();
}

export function assertSemanticCheckDeclarations(fixtureSchema) {
  const declared = declaredSemanticCheckIds(fixtureSchema);
  for (const identifier of declared) {
    if (!Object.hasOwn(semanticChecks, identifier))
      fail(`Declared semantic-check identifier is not implemented: ${identifier}`);
  }
  return declared.length;
}

export function assertSemanticRegistryCoverage(fixtureSchemas) {
  const declared = [...new Set(fixtureSchemas.flatMap(declaredSemanticCheckIds))].sort();
  if (JSON.stringify(declared) !== JSON.stringify(semanticCheckIds)) {
    fail(
      `Semantic-check declaration/implementation mismatch: declared=${JSON.stringify(declared)} implemented=${JSON.stringify(semanticCheckIds)}`,
    );
  }
  return declared.length;
}

export function evaluateSemanticCheck(testCase, context) {
  const check = semanticChecks[testCase.semanticCheck];
  if (!check) fail(`Unknown semantic-check identifier: ${String(testCase.semanticCheck)}`);
  return check(testCase, context) === true;
}
