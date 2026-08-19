import { createHash } from "node:crypto";
import { domainToASCII, domainToUnicode } from "node:url";

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

const IDNA2008_PVALID_EXCEPTIONS = new Set([0x00df, 0x03c2, 0x06fd, 0x06fe, 0x0f0b, 0x3007]);
const IDNA2008_DISALLOWED_EXCEPTIONS = new Set([
  0x0640,
  0x07fa,
  0x302e,
  0x302f,
  0x3031,
  0x3032,
  0x3033,
  0x3034,
  0x3035,
  0x303b,
]);

function idna2008ContextOValid(codePoints, index) {
  const codePoint = codePoints[index].codePointAt(0);
  if (codePoint === 0x00b7) return codePoints[index - 1] === "l" && codePoints[index + 1] === "l";
  if (codePoint === 0x0375) return /^\p{Script=Greek}$/u.test(codePoints[index + 1] ?? "");
  if (codePoint === 0x05f3 || codePoint === 0x05f4) return /^\p{Script=Hebrew}$/u.test(codePoints[index - 1] ?? "");
  if (codePoint === 0x30fb) {
    return codePoints.some((character) => /^(?:\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Han})$/u.test(character));
  }
  if (codePoint >= 0x0660 && codePoint <= 0x0669) {
    return !codePoints.some((character) => {
      const candidate = character.codePointAt(0);
      return candidate >= 0x06f0 && candidate <= 0x06f9;
    });
  }
  if (codePoint >= 0x06f0 && codePoint <= 0x06f9) {
    return !codePoints.some((character) => {
      const candidate = character.codePointAt(0);
      return candidate >= 0x0660 && candidate <= 0x0669;
    });
  }
  return false;
}

function idna2008DecodedLabelValid(label) {
  if (label.normalize("NFC") !== label) return false;
  const codePoints = [...label];
  for (const [index, character] of codePoints.entries()) {
    const codePoint = character.codePointAt(0);
    if (IDNA2008_DISALLOWED_EXCEPTIONS.has(codePoint)) return false;
    if (IDNA2008_PVALID_EXCEPTIONS.has(codePoint)) continue;
    if (
      codePoint === 0x00b7 ||
      codePoint === 0x0375 ||
      codePoint === 0x05f3 ||
      codePoint === 0x05f4 ||
      codePoint === 0x30fb ||
      (codePoint >= 0x0660 && codePoint <= 0x0669) ||
      (codePoint >= 0x06f0 && codePoint <= 0x06f9)
    ) {
      if (!idna2008ContextOValid(codePoints, index)) return false;
      continue;
    }
    if (codePoint === 0x200c || codePoint === 0x200d) continue;
    if (character === "-" || /^[\p{Letter}\p{Mark}\p{Decimal_Number}]$/u.test(character)) {
      if (character.normalize("NFKC") !== character) return false;
      continue;
    }
    return false;
  }
  return true;
}

export function canonicalDnsHost(value) {
  if (typeof value !== "string" || value.length === 0 || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/u.test(value)) {
    return false;
  }
  for (const label of value.split(".")) {
    if (label.length < 1 || label.length > 63) return false;
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label)) return false;
    if (label.slice(2, 4) === "--" && !label.startsWith("xn--")) return false;
    if (label.startsWith("xn--")) {
      const unicode = domainToUnicode(label);
      if (
        unicode === label ||
        unicode.length === 0 ||
        !idna2008DecodedLabelValid(unicode) ||
        domainToASCII(unicode) !== label
      ) {
        return false;
      }
    }
  }
  const unicode = domainToUnicode(value);
  return unicode.length > 0 && domainToASCII(unicode) === value;
}

export function canonicalIpv4Host(value) {
  if (typeof value !== "string") return false;
  const octets = value.split(".");
  return (
    octets.length === 4 &&
    octets.every((octet) => /^(?:0|[1-9][0-9]{0,2})$/u.test(octet) && Number(octet) <= 255)
  );
}

function parseIpv6Words(value) {
  if (typeof value !== "string" || value.length < 2 || value.includes("%") || value.includes(".") || !/^[0-9a-f:]+$/u.test(value)) {
    return undefined;
  }
  const doubleColon = value.indexOf("::");
  if (doubleColon !== -1 && value.indexOf("::", doubleColon + 2) !== -1) return undefined;
  const parseSide = (side) => {
    if (side === "") return [];
    const words = side.split(":");
    if (words.some((word) => !/^[0-9a-f]{1,4}$/u.test(word))) return undefined;
    return words.map((word) => Number.parseInt(word, 16));
  };
  if (doubleColon === -1) {
    const words = parseSide(value);
    return words?.length === 8 ? words : undefined;
  }
  const left = parseSide(value.slice(0, doubleColon));
  const right = parseSide(value.slice(doubleColon + 2));
  if (!left || !right || left.length + right.length >= 8) return undefined;
  return [...left, ...Array(8 - left.length - right.length).fill(0), ...right];
}

function renderCanonicalIpv6(words) {
  let bestStart = -1;
  let bestLength = 0;
  for (let index = 0; index < words.length; ) {
    if (words[index] !== 0) {
      index += 1;
      continue;
    }
    let end = index + 1;
    while (end < words.length && words[end] === 0) end += 1;
    const length = end - index;
    if (length > bestLength && length >= 2) {
      bestStart = index;
      bestLength = length;
    }
    index = end;
  }
  const text = words.map((word) => word.toString(16));
  if (bestStart === -1) return text.join(":");
  const before = text.slice(0, bestStart).join(":");
  const after = text.slice(bestStart + bestLength).join(":");
  return `${before}::${after}`;
}

export function canonicalIpv6Host(value) {
  const words = parseIpv6Words(value);
  if (!words) return false;
  const ipv4Mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  return !ipv4Mapped && renderCanonicalIpv6(words) === value;
}

export function canonicalOriginSyntax(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.scheme !== "https" && value.scheme !== "http") return false;
  if (!Number.isInteger(value.port) || value.port < 1 || value.port > 65535) return false;
  if (!value.host || typeof value.host !== "object" || Array.isArray(value.host)) return false;
  if (value.host.kind === "dns") return canonicalDnsHost(value.host.value);
  if (value.host.kind === "ipv4") return canonicalIpv4Host(value.host.value);
  if (value.host.kind === "ipv6") return canonicalIpv6Host(value.host.value);
  return false;
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

export function artifactByteIntegrityMatchesBytes(value, bytes) {
  if (!(bytes instanceof Uint8Array) || !value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.algorithm !== "sha-256") return false;
  if (!canonicalBase64url(value.value, 32, 32)) return false;
  if (!Number.isSafeInteger(value.byteLength) || value.byteLength < 0) return false;
  return value.value === sha256Base64url(bytes) && value.byteLength === bytes.byteLength;
}

export function artifactByteIntegrityMatches(value, semanticInput) {
  const bytes = decodeArtifactBytesHex(semanticInput);
  return bytes !== undefined && artifactByteIntegrityMatchesBytes(value, bytes);
}

const semanticChecks = Object.freeze({
  none: () => true,
  "tenant-id": (testCase, context) => context.validateTarget(testCase.value),
  "tenant-exact-equality": (testCase) => (testCase.values[0] === testCase.values[1]) === testCase.equalExpected,
  "canonical-base64url": (testCase) => canonicalBase64url(testCase.value),
  "canonical-timestamp": (testCase) => canonicalTimestamp(testCase.value),
  "time-evidence": (testCase) => semanticTimeEvidence(testCase.value),
  "origin-syntax": (testCase) => canonicalOriginSyntax(testCase.value),
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
