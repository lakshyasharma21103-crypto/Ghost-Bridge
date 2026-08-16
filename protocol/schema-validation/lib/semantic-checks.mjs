import { createHash } from "node:crypto";

import { fail } from "./errors.mjs";

export function canonicalBase64url(value, minimumBytes = 1, maximumBytes = Number.POSITIVE_INFINITY) {
  if (typeof value !== "string" || value.includes("=") || !/^[A-Za-z0-9_-]+$/u.test(value)) return false;
  const decoded = Buffer.from(value, "base64url");
  return (
    decoded.length >= minimumBytes &&
    decoded.length <= maximumBytes &&
    decoded.toString("base64url") === value
  );
}

export function canonicalTimestamp(value) {
  if (typeof value !== "string") return false;
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
  if (!canonicalTimestamp(left) || !canonicalTimestamp(right)) {
    fail("Timestamp comparison requires two canonical timestamps");
  }
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function semanticTimeEvidence(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.kind === "exact") return canonicalTimestamp(value.at);
  if (value.kind !== "interval" || !value.lower || !value.upper) return false;
  if (!canonicalTimestamp(value.lower.at) || !canonicalTimestamp(value.upper.at)) return false;
  const comparison = compareCanonicalTimestamps(value.lower.at, value.upper.at);
  return comparison < 0 || (comparison === 0 && value.lower.inclusive === true && value.upper.inclusive === true);
}

export function decodeArtifactBytesHex(semanticInput) {
  if (!semanticInput || typeof semanticInput !== "object" || Array.isArray(semanticInput)) return undefined;
  if (Object.keys(semanticInput).length !== 1 || typeof semanticInput.artifactBytesHex !== "string") return undefined;
  const hexadecimal = semanticInput.artifactBytesHex;
  if (hexadecimal.length % 2 !== 0 || !/^[0-9A-Fa-f]*$/u.test(hexadecimal)) return undefined;
  return Buffer.from(hexadecimal, "hex");
}

export function sha256Base64url(bytes) {
  return createHash("sha256").update(bytes).digest("base64url");
}

export function artifactByteIntegrityMatches(value, semanticInput) {
  const bytes = decodeArtifactBytesHex(semanticInput);
  if (bytes === undefined || !value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.algorithm !== "sha-256") return false;
  if (!canonicalBase64url(value.value, 32, 32)) return false;
  if (!Number.isSafeInteger(value.byteLength) || value.byteLength < 0) return false;
  return value.value === sha256Base64url(bytes) && value.byteLength === bytes.byteLength;
}

const semanticChecks = Object.freeze({
  none: () => true,
  "tenant-id": (testCase, context) => context.validateTarget(testCase.value),
  "tenant-exact-equality": (testCase) => (testCase.values[0] === testCase.values[1]) === testCase.equalExpected,
  "canonical-base64url": (testCase) => canonicalBase64url(testCase.value),
  "canonical-timestamp": (testCase) => canonicalTimestamp(testCase.value),
  "time-evidence": (testCase) => semanticTimeEvidence(testCase.value),
  "artifact-byte-integrity": (testCase) => artifactByteIntegrityMatches(testCase.value, testCase.semanticInput),
  "extension-identity": (testCase, context) => context.validateTarget(testCase.value),
});

export const semanticCheckIds = Object.freeze(Object.keys(semanticChecks).sort());

export function assertSemanticCheckDeclarations(fixtureSchema) {
  const valueIdentifiers = fixtureSchema?.$defs?.valueCase?.properties?.semanticCheck?.enum;
  const equalityIdentifier = fixtureSchema?.$defs?.equalityCase?.properties?.semanticCheck?.const;
  if (!Array.isArray(valueIdentifiers) || typeof equalityIdentifier !== "string") {
    fail("Fixture schema does not declare its semantic-check identifiers");
  }
  const declared = [...new Set([...valueIdentifiers, equalityIdentifier])].sort();
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
