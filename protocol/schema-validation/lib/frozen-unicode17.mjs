import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { fail } from './errors.mjs';

export const FROZEN_UNICODE_VERSION = '17.0.0';
export const FROZEN_UNICODE_SOURCE_SET_SHA256 =
  'd290a34d75c1ddeefb728594e421b9a74b1424d64181b0788e49da5d96665d9b';
export const FROZEN_IDNA2008_SHA256 =
  '83840db50200fc686ff850d4c156c47910054f118c50ea27a66d8c0ec2e17fb4';
export const FROZEN_IDNA_PROPERTIES_SHA256 =
  '5291042234cb645162fc20ef5dc3a4d763302c7441428d3f0293975403679c8d';

const MAX_CODE_POINT = 0x10ffff;
const CODE_POINT_COUNT = MAX_CODE_POINT + 1;
const UNICODE_SCALAR_COUNT = CODE_POINT_COUNT - 0x800;
const MAX_NORMALIZATION_CODE_POINTS = 4096;
const IDNA_CATEGORIES = Object.freeze([
  'PVALID',
  'CONTEXTJ',
  'CONTEXTO',
  'DISALLOWED',
  'UNASSIGNED',
]);
const JOINING_TYPES = Object.freeze(['U', 'R', 'L', 'D', 'C', 'T']);
const MARK_GENERAL_CATEGORIES = Object.freeze(['Mn', 'Mc', 'Me']);
const BIDI_CLASSES = Object.freeze([
  'L',
  'R',
  'AL',
  'EN',
  'ES',
  'ET',
  'AN',
  'CS',
  'B',
  'S',
  'WS',
  'ON',
  'LRE',
  'LRO',
  'RLE',
  'RLO',
  'PDF',
  'NSM',
  'BN',
  'FSI',
  'LRI',
  'RLI',
  'PDI',
]);

const HANGUL = Object.freeze({
  sBase: 0xac00,
  lBase: 0x1100,
  vBase: 0x1161,
  tBase: 0x11a7,
  lCount: 19,
  vCount: 21,
  tCount: 28,
  nCount: 588,
  sCount: 11172,
});

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function loadFrozenJson(relativeUrl, expectedSha256, expectedFormat) {
  const bytes = readFileSync(new URL(relativeUrl, import.meta.url));
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== expectedSha256) {
    fail(`Frozen Unicode generated-data SHA-256 mismatch for ${relativeUrl}: ${actualSha256}`);
  }
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    fail(`Frozen Unicode generated data is not valid JSON: ${relativeUrl}`, { cause: error });
  }
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    value.format !== expectedFormat ||
    value.unicodeVersion !== FROZEN_UNICODE_VERSION ||
    value.sourceSetSha256 !== FROZEN_UNICODE_SOURCE_SET_SHA256
  ) {
    fail(`Frozen Unicode generated-data identity mismatch for ${relativeUrl}`);
  }
  return value;
}

function sameArray(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isScalar(codePoint) {
  return (
    Number.isInteger(codePoint) &&
    codePoint >= 0 &&
    codePoint <= MAX_CODE_POINT &&
    !(codePoint >= 0xd800 && codePoint <= 0xdfff)
  );
}

function assertCompleteRanges(ranges, allowedValues, label) {
  if (!Array.isArray(ranges) || ranges.length === 0) fail(`${label} is empty`);
  const allowed = new Set(allowedValues);
  let next = 0;
  for (const range of ranges) {
    if (
      !Array.isArray(range) ||
      range.length !== 3 ||
      !Number.isInteger(range[0]) ||
      !Number.isInteger(range[1]) ||
      range[0] !== next ||
      range[1] < range[0] ||
      range[1] > MAX_CODE_POINT ||
      !allowed.has(range[2])
    ) {
      fail(`${label} is not a complete ordered range table`);
    }
    next = range[1] + 1;
  }
  if (next !== CODE_POINT_COUNT) fail(`${label} does not cover every Unicode code point`);
}

function assertSparseRanges(ranges, label, validateValue = () => true) {
  if (!Array.isArray(ranges)) fail(`${label} is not an array`);
  let previousEnd = -1;
  for (const range of ranges) {
    if (
      !Array.isArray(range) ||
      range.length < 2 ||
      range.length > 3 ||
      !Number.isInteger(range[0]) ||
      !Number.isInteger(range[1]) ||
      range[0] <= previousEnd ||
      range[1] < range[0] ||
      range[1] > MAX_CODE_POINT ||
      !validateValue(range[2])
    ) {
      fail(`${label} is not an ordered non-overlapping range table`);
    }
    previousEnd = range[1];
  }
}

function rangeValue(ranges, codePoint, fallback) {
  let lower = 0;
  let upper = ranges.length - 1;
  while (lower <= upper) {
    const middle = (lower + upper) >> 1;
    const range = ranges[middle];
    if (codePoint < range[0]) upper = middle - 1;
    else if (codePoint > range[1]) lower = middle + 1;
    else return range.length === 2 ? true : range[2];
  }
  return fallback;
}

const idnaData = loadFrozenJson(
  '../../unicode/17.0.0/generated/idna2008-ranges.json',
  FROZEN_IDNA2008_SHA256,
  'ghostbridge-unicode-idna2008-ranges-v1',
);
const propertyData = loadFrozenJson(
  '../../unicode/17.0.0/generated/idna-properties.json',
  FROZEN_IDNA_PROPERTIES_SHA256,
  'ghostbridge-unicode-idna-properties-v1',
);

if (
  !sameArray(idnaData.categories, IDNA_CATEGORIES) ||
  idnaData.coverage?.codePoints !== CODE_POINT_COUNT ||
  idnaData.coverage?.unicodeScalars !== UNICODE_SCALAR_COUNT ||
  idnaData.coverage?.generatedRanges !== 3066
) {
  fail('Frozen Unicode IDNA2008 structural invariants do not match the reviewed artifact');
}
assertCompleteRanges(idnaData.ranges, IDNA_CATEGORIES, 'Frozen IDNA2008 category table');

const normalization = propertyData.normalization;
const generalCategoryMark = propertyData.generalCategoryMark;
const contextJ = propertyData.contextJ;
const contextO = propertyData.contextO;
const bidi = propertyData.bidi;
const expectedCoverage = {
  unicodeDataAssignedCodePoints: 299382,
  canonicalCombiningClassRanges: 403,
  generalCategoryMarkRanges: 327,
  canonicalDecompositions: 2081,
  fullCompositionExclusionRanges: 73,
  nfcQuickCheckRanges: 242,
  joiningTypeRanges: 932,
  bidiClassRanges: 1267,
};
if (
  !normalization ||
  !generalCategoryMark ||
  !contextJ ||
  !contextO ||
  !bidi ||
  normalization.canonicalCombiningClassDefault !== 0 ||
  generalCategoryMark.unicodeDataField !== 2 ||
  !sameArray(generalCategoryMark.values, MARK_GENERAL_CATEGORIES) ||
  !sameArray(normalization.nfcQuickCheckValues, ['Y', 'N', 'M']) ||
  !sameArray(contextJ.joinControlCodePoints, [0x200c, 0x200d]) ||
  contextJ.viramaCanonicalCombiningClass !== 9 ||
  !sameArray(contextJ.joiningTypeValues, JOINING_TYPES) ||
  !sameArray(contextO.ruleCodePoints, [0x00b7, 0x0375, 0x05f3, 0x05f4, 0x30fb]) ||
  !sameArray(contextO.arabicIndicDigits, [0x0660, 0x0669]) ||
  !sameArray(contextO.extendedArabicIndicDigits, [0x06f0, 0x06f9]) ||
  bidi.scope !== 'complete-domain-label-sequence' ||
  !sameArray(bidi.values, BIDI_CLASSES) ||
  !sameArray(propertyData.coverage, expectedCoverage)
) {
  fail('Frozen Unicode property structural invariants do not match the reviewed artifact');
}

assertSparseRanges(
  normalization.canonicalCombiningClassRanges,
  'Frozen Canonical_Combining_Class table',
  (value) => Number.isInteger(value) && value > 0 && value <= 254,
);
assertSparseRanges(generalCategoryMark.ranges, 'Frozen General_Category Mark table');
assertSparseRanges(
  normalization.fullCompositionExclusionRanges,
  'Frozen Full_Composition_Exclusion table',
);
assertCompleteRanges(
  normalization.nfcQuickCheckRanges,
  ['Y', 'N', 'M'],
  'Frozen NFC_Quick_Check table',
);
assertSparseRanges(contextJ.viramaRanges, 'Frozen Virama table');
assertCompleteRanges(contextJ.joiningTypeRanges, JOINING_TYPES, 'Frozen Joining_Type table');
assertCompleteRanges(bidi.ranges, BIDI_CLASSES, 'Frozen Bidi_Class table');
for (const script of ['Greek', 'Han', 'Hebrew', 'Hiragana', 'Katakana']) {
  assertSparseRanges(contextO.scriptRanges?.[script], `Frozen ${script} Script table`);
}

const canonicalDecompositions = new Map();
let previousDecompositionCodePoint = -1;
for (const entry of normalization.canonicalDecompositions ?? []) {
  if (
    !Array.isArray(entry) ||
    entry.length !== 2 ||
    !isScalar(entry[0]) ||
    entry[0] <= previousDecompositionCodePoint ||
    !Array.isArray(entry[1]) ||
    entry[1].length === 0 ||
    entry[1].some((codePoint) => !isScalar(codePoint))
  ) {
    fail('Frozen canonical-decomposition table is malformed');
  }
  canonicalDecompositions.set(entry[0], Object.freeze([...entry[1]]));
  previousDecompositionCodePoint = entry[0];
}
if (canonicalDecompositions.size !== expectedCoverage.canonicalDecompositions) {
  fail('Frozen canonical-decomposition count mismatch');
}

const compositionPairs = new Map();
for (const [composite, decomposition] of canonicalDecompositions) {
  if (
    decomposition.length !== 2 ||
    rangeValue(normalization.fullCompositionExclusionRanges, composite, false)
  )
    continue;
  const key = `${decomposition[0]},${decomposition[1]}`;
  if (compositionPairs.has(key)) fail(`Duplicate frozen canonical-composition pair: ${key}`);
  compositionPairs.set(key, composite);
}

export const frozenUnicodeEvidence = Object.freeze({
  unicodeVersion: FROZEN_UNICODE_VERSION,
  sourceSetSha256: FROZEN_UNICODE_SOURCE_SET_SHA256,
  idna2008Sha256: FROZEN_IDNA2008_SHA256,
  idnaPropertiesSha256: FROZEN_IDNA_PROPERTIES_SHA256,
  idnaRangeCount: idnaData.ranges.length,
  generalCategoryMarkRangeCount: generalCategoryMark.ranges.length,
  normalizationDecompositionCount: canonicalDecompositions.size,
});

export function unicodeScalarValues(value) {
  if (typeof value !== 'string') return undefined;
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      if (!(second >= 0xdc00 && second <= 0xdfff)) return undefined;
      result.push(0x10000 + ((first - 0xd800) << 10) + (second - 0xdc00));
      index += 1;
    } else if (first >= 0xdc00 && first <= 0xdfff) {
      return undefined;
    } else {
      result.push(first);
    }
  }
  return result;
}

export function idna2008Category(codePoint) {
  return isScalar(codePoint) ? rangeValue(idnaData.ranges, codePoint) : undefined;
}

export function canonicalCombiningClass(codePoint) {
  return isScalar(codePoint)
    ? rangeValue(normalization.canonicalCombiningClassRanges, codePoint, 0)
    : undefined;
}

export function isCombiningMark(codePoint) {
  return isScalar(codePoint) && rangeValue(generalCategoryMark.ranges, codePoint, false) === true;
}

export function joiningType(codePoint) {
  return isScalar(codePoint) ? rangeValue(contextJ.joiningTypeRanges, codePoint) : undefined;
}

export function bidiClass(codePoint) {
  return isScalar(codePoint) ? rangeValue(bidi.ranges, codePoint) : undefined;
}

export function isScript(codePoint, script) {
  const ranges = contextO.scriptRanges[script];
  return (
    isScalar(codePoint) && Array.isArray(ranges) && rangeValue(ranges, codePoint, false) === true
  );
}

function hangulDecomposition(codePoint) {
  const sIndex = codePoint - HANGUL.sBase;
  if (sIndex < 0 || sIndex >= HANGUL.sCount) return undefined;
  const l = HANGUL.lBase + Math.floor(sIndex / HANGUL.nCount);
  const v = HANGUL.vBase + Math.floor((sIndex % HANGUL.nCount) / HANGUL.tCount);
  const tIndex = sIndex % HANGUL.tCount;
  return tIndex === 0 ? [l, v] : [l, v, HANGUL.tBase + tIndex];
}

function appendCanonicalDecomposition(codePoint, output) {
  const stack = [codePoint];
  while (stack.length > 0) {
    const current = stack.pop();
    const decomposition = hangulDecomposition(current) ?? canonicalDecompositions.get(current);
    if (!decomposition) {
      output.push(current);
      if (output.length > MAX_NORMALIZATION_CODE_POINTS)
        fail('Frozen NFC expansion exceeds its deterministic bound');
      continue;
    }
    for (let index = decomposition.length - 1; index >= 0; index -= 1)
      stack.push(decomposition[index]);
    if (stack.length + output.length > MAX_NORMALIZATION_CODE_POINTS)
      fail('Frozen NFC work exceeds its deterministic bound');
  }
}

function composeHangul(left, right) {
  const lIndex = left - HANGUL.lBase;
  if (lIndex >= 0 && lIndex < HANGUL.lCount) {
    const vIndex = right - HANGUL.vBase;
    if (vIndex >= 0 && vIndex < HANGUL.vCount) {
      return HANGUL.sBase + (lIndex * HANGUL.vCount + vIndex) * HANGUL.tCount;
    }
  }
  const sIndex = left - HANGUL.sBase;
  if (sIndex >= 0 && sIndex < HANGUL.sCount && sIndex % HANGUL.tCount === 0) {
    const tIndex = right - HANGUL.tBase;
    if (tIndex > 0 && tIndex < HANGUL.tCount) return left + tIndex;
  }
  return undefined;
}

function canonicalComposite(left, right) {
  return composeHangul(left, right) ?? compositionPairs.get(`${left},${right}`);
}

export function normalizeNfcCodePoints(codePoints) {
  if (
    !Array.isArray(codePoints) ||
    codePoints.length > MAX_NORMALIZATION_CODE_POINTS ||
    codePoints.some((codePoint) => !isScalar(codePoint))
  ) {
    fail('Frozen NFC input must be a bounded Unicode scalar-value array');
  }
  const decomposed = [];
  for (const codePoint of codePoints) appendCanonicalDecomposition(codePoint, decomposed);

  for (let index = 1; index < decomposed.length; index += 1) {
    const combiningClass = canonicalCombiningClass(decomposed[index]);
    if (combiningClass === 0) continue;
    let orderedIndex = index;
    while (orderedIndex > 0) {
      const previousClass = canonicalCombiningClass(decomposed[orderedIndex - 1]);
      if (previousClass === 0 || previousClass <= combiningClass) break;
      [decomposed[orderedIndex - 1], decomposed[orderedIndex]] = [
        decomposed[orderedIndex],
        decomposed[orderedIndex - 1],
      ];
      orderedIndex -= 1;
    }
  }

  if (decomposed.length === 0) return [];
  const composed = [decomposed[0]];
  let starterPosition = 0;
  let starter = decomposed[0];
  let lastCombiningClass = canonicalCombiningClass(decomposed[0]);
  for (let index = 1; index < decomposed.length; index += 1) {
    const current = decomposed[index];
    const currentClass = canonicalCombiningClass(current);
    const composite = canonicalComposite(starter, current);
    if (
      composite !== undefined &&
      (lastCombiningClass === 0 || lastCombiningClass < currentClass)
    ) {
      composed[starterPosition] = composite;
      starter = composite;
      continue;
    }
    if (currentClass === 0) {
      starterPosition = composed.length;
      starter = current;
    }
    composed.push(current);
    lastCombiningClass = currentClass;
  }
  return composed;
}

export function isNfcCodePoints(codePoints) {
  const normalized = normalizeNfcCodePoints(codePoints);
  return (
    normalized.length === codePoints.length &&
    normalized.every((codePoint, index) => codePoint === codePoints[index])
  );
}
