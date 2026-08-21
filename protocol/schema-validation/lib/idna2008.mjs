import { createRequire } from 'node:module';

import {
  bidiClass,
  canonicalCombiningClass,
  frozenUnicodeEvidence,
  idna2008Category,
  isCombiningMark,
  isNfcCodePoints,
  isScript,
  joiningType,
  unicodeScalarValues,
} from './frozen-unicode17.mjs';

const require = createRequire(import.meta.url);
const punycode = require('punycode/');
const punycodeVersion = require('punycode/package.json').version;

if (punycodeVersion !== '2.3.1')
  throw new Error(`Unexpected RFC 3492 Punycode mechanism version: ${punycodeVersion}`);

const MAXIMUM_DNS_NAME_OCTETS = 253;
const MAXIMUM_DNS_LABEL_OCTETS = 63;
const ZWNJ = 0x200c;
const ZWJ = 0x200d;
const MIDDLE_DOT = 0x00b7;
const GREEK_LOWER_NUMERAL_SIGN = 0x0375;
const HEBREW_PUNCTUATION_GERESH = 0x05f3;
const HEBREW_PUNCTUATION_GERSHAYIM = 0x05f4;
const KATAKANA_MIDDLE_DOT = 0x30fb;

function validHyphenPositions(codePoints) {
  return (
    codePoints.length > 0 &&
    codePoints[0] !== 0x2d &&
    codePoints.at(-1) !== 0x2d &&
    !(codePoints[2] === 0x2d && codePoints[3] === 0x2d)
  );
}

function contextJValid(codePoints, index) {
  const codePoint = codePoints[index];
  if (index === 0) return false;
  if (canonicalCombiningClass(codePoints[index - 1]) === 9) return true;
  if (codePoint === ZWJ) return false;
  if (codePoint !== ZWNJ) return false;

  let before = index - 1;
  while (before >= 0 && joiningType(codePoints[before]) === 'T') before -= 1;
  if (before < 0 || !new Set(['L', 'D']).has(joiningType(codePoints[before]))) return false;
  let after = index + 1;
  while (after < codePoints.length && joiningType(codePoints[after]) === 'T') after += 1;
  return after < codePoints.length && new Set(['R', 'D']).has(joiningType(codePoints[after]));
}

function contextOValid(codePoints, index) {
  const codePoint = codePoints[index];
  if (codePoint === MIDDLE_DOT)
    return codePoints[index - 1] === 0x006c && codePoints[index + 1] === 0x006c;
  if (codePoint === GREEK_LOWER_NUMERAL_SIGN)
    return index + 1 < codePoints.length && isScript(codePoints[index + 1], 'Greek');
  if (codePoint === HEBREW_PUNCTUATION_GERESH || codePoint === HEBREW_PUNCTUATION_GERSHAYIM) {
    return index > 0 && isScript(codePoints[index - 1], 'Hebrew');
  }
  if (codePoint === KATAKANA_MIDDLE_DOT) {
    return codePoints.some((candidate) =>
      ['Hiragana', 'Katakana', 'Han'].some((script) => isScript(candidate, script)),
    );
  }
  if (codePoint >= 0x0660 && codePoint <= 0x0669) {
    return !codePoints.some((candidate) => candidate >= 0x06f0 && candidate <= 0x06f9);
  }
  if (codePoint >= 0x06f0 && codePoint <= 0x06f9) {
    return !codePoints.some((candidate) => candidate >= 0x0660 && candidate <= 0x0669);
  }
  return false;
}

function frozenIdnaLabelValid(codePoints) {
  if (!validHyphenPositions(codePoints)) return false;
  if (isCombiningMark(codePoints[0])) return false;
  for (let index = 0; index < codePoints.length; index += 1) {
    const category = idna2008Category(codePoints[index]);
    if (category === 'PVALID') continue;
    if (category === 'CONTEXTJ' && contextJValid(codePoints, index)) continue;
    if (category === 'CONTEXTO' && contextOValid(codePoints, index)) continue;
    return false;
  }
  return true;
}

function decodeWireLabel(label) {
  if (
    typeof label !== 'string' ||
    label.length < 1 ||
    label.length > MAXIMUM_DNS_LABEL_OCTETS ||
    !/^[a-z0-9-]+$/u.test(label) ||
    !/^(?:[a-z0-9]|[a-z0-9][a-z0-9-]*[a-z0-9])$/u.test(label)
  ) {
    return undefined;
  }

  if (!label.startsWith('xn--')) {
    const codePoints = [...label].map((character) => character.charCodeAt(0));
    return frozenIdnaLabelValid(codePoints) ? codePoints : undefined;
  }

  const payload = label.slice(4);
  if (payload.length === 0) return undefined;
  let decoded;
  try {
    decoded = punycode.decode(payload);
  } catch {
    return undefined;
  }
  const codePoints = unicodeScalarValues(decoded);
  if (!codePoints || codePoints.length === 0 || codePoints.every((codePoint) => codePoint <= 0x7f))
    return undefined;
  if (!isNfcCodePoints(codePoints) || !frozenIdnaLabelValid(codePoints)) return undefined;
  try {
    if (`xn--${punycode.encode(decoded)}` !== label) return undefined;
  } catch {
    return undefined;
  }
  return codePoints;
}

function bidiLabelValid(codePoints) {
  const classes = codePoints.map(bidiClass);
  const first = classes[0];
  let lastIndex = classes.length - 1;
  while (lastIndex >= 0 && classes[lastIndex] === 'NSM') lastIndex -= 1;
  if (lastIndex < 0) return false;
  if (first === 'R' || first === 'AL') {
    const allowed = new Set(['R', 'AL', 'AN', 'EN', 'ES', 'CS', 'ET', 'ON', 'BN', 'NSM']);
    if (classes.some((value) => !allowed.has(value))) return false;
    if (!new Set(['R', 'AL', 'EN', 'AN']).has(classes[lastIndex])) return false;
    return !(classes.includes('EN') && classes.includes('AN'));
  }
  if (first === 'L') {
    const allowed = new Set(['L', 'EN', 'ES', 'CS', 'ET', 'ON', 'BN', 'NSM']);
    return (
      classes.every((value) => allowed.has(value)) && new Set(['L', 'EN']).has(classes[lastIndex])
    );
  }
  return false;
}

export function canonicalDnsName(value) {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > MAXIMUM_DNS_NAME_OCTETS ||
    value.endsWith('.') ||
    !/^[a-z0-9.-]+$/u.test(value)
  ) {
    return false;
  }
  const wireLabels = value.split('.');
  const decodedLabels = [];
  for (const label of wireLabels) {
    const decoded = decodeWireLabel(label);
    if (!decoded) return false;
    decodedLabels.push(decoded);
  }
  const bidiDomain = decodedLabels.some((label) =>
    label.some((codePoint) => new Set(['R', 'AL', 'AN']).has(bidiClass(codePoint))),
  );
  return !bidiDomain || decodedLabels.every(bidiLabelValid);
}

export const idnaRuntimeEvidence = Object.freeze({
  ...frozenUnicodeEvidence,
  punycodeMechanism: `punycode@${punycodeVersion}`,
  uts46Mapping: false,
  bidiScope: 'complete-domain-label-sequence',
});
