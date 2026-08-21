import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';

export const UNICODE_VERSION = '17.0.0';
export const MAX_CODE_POINT = 0x10ffff;
export const CODE_POINT_COUNT = MAX_CODE_POINT + 1;
export const UNICODE_SCALAR_COUNT = CODE_POINT_COUNT - 0x800;

export const IDNA_CATEGORIES = Object.freeze([
  'PVALID',
  'CONTEXTJ',
  'CONTEXTO',
  'DISALLOWED',
  'UNASSIGNED',
]);

const GENERAL_CATEGORIES = Object.freeze([
  'Lu',
  'Ll',
  'Lt',
  'Lm',
  'Lo',
  'Mn',
  'Mc',
  'Me',
  'Nd',
  'Nl',
  'No',
  'Pc',
  'Pd',
  'Ps',
  'Pe',
  'Pi',
  'Pf',
  'Po',
  'Sm',
  'Sc',
  'Sk',
  'So',
  'Zs',
  'Zl',
  'Zp',
  'Cc',
  'Cf',
  'Cs',
  'Co',
  'Cn',
]);
const GENERAL_CATEGORY_SET = new Set(GENERAL_CATEGORIES);
const MARK_GENERAL_CATEGORIES = Object.freeze(['Mn', 'Mc', 'Me']);
const MARK_GENERAL_CATEGORY_SET = new Set(MARK_GENERAL_CATEGORIES);

const EXPECTED_SOURCE_NAMES = Object.freeze([
  'idna/Idna2008.txt',
  'idna/ReadMe.txt',
  'license/Unicode-License-v3.txt',
  'ucd/DerivedNormalizationProps.txt',
  'ucd/ReadMe.txt',
  'ucd/Scripts.txt',
  'ucd/UnicodeData.txt',
  'ucd/extracted/DerivedBidiClass.txt',
  'ucd/extracted/DerivedJoiningType.txt',
]);

const JOINING_TYPE_ALIASES = Object.freeze({
  Join_Causing: 'C',
  Dual_Joining: 'D',
  Left_Joining: 'L',
  Non_Joining: 'U',
  Right_Joining: 'R',
  Transparent: 'T',
});

const BIDI_CLASS_ALIASES = Object.freeze({
  Arabic_Letter: 'AL',
  Boundary_Neutral: 'BN',
  European_Terminator: 'ET',
  Left_To_Right: 'L',
  Right_To_Left: 'R',
});

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

const CONTEXTO_SCRIPTS = Object.freeze(['Greek', 'Han', 'Hebrew', 'Hiragana', 'Katakana']);
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

function fail(message) {
  throw new Error(message);
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function decodeUtf8(bytes, label) {
  try {
    return utf8Decoder.decode(bytes);
  } catch {
    fail(`${label} is not strict UTF-8`);
  }
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function assertExactArray(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      `${label} mismatch: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`,
    );
  }
}

function assertLowercaseSha256(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/u.test(value))
    fail(`${label} must be a lowercase SHA-256 digest`);
}

function assertRelativePath(value, label) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.includes('\\') ||
    path.posix.isAbsolute(value)
  ) {
    fail(`${label} must be a nonempty portable relative path`);
  }
  if (value.split('/').some((part) => part === '' || part === '.' || part === '..'))
    fail(`${label} is not normalized`);
}

export function validateSourceManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))
    fail('Source manifest must be an object');
  if (manifest.format !== 'ghostbridge-unicode-source-manifest-v1')
    fail('Unknown source-manifest format');
  if (manifest.unicodeVersion !== UNICODE_VERSION)
    fail(`Source manifest must freeze Unicode ${UNICODE_VERSION}`);
  if (!Array.isArray(manifest.files) || manifest.files.length === 0)
    fail('Source manifest has no files');
  if (
    manifest.networkPolicy?.generation !== 'offline-only' ||
    manifest.networkPolicy?.normalValidation !== 'offline-only'
  ) {
    fail('Generation and normal validation must be offline-only');
  }
  if (manifest.networkPolicy?.mutableAliasAuthority !== false)
    fail('Mutable aliases must not be protocol authority');

  const paths = [];
  const logicalNames = [];
  for (const entry of manifest.files) {
    assertRelativePath(entry.path, 'Source path');
    assertRelativePath(entry.logicalName, 'Logical source name');
    if (!entry.path.startsWith('source/')) fail(`Source path is outside source/: ${entry.path}`);
    if (entry.unicodeVersion !== UNICODE_VERSION)
      fail(`Wrong Unicode version for ${entry.logicalName}`);
    if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength <= 0)
      fail(`Invalid byte length for ${entry.logicalName}`);
    assertLowercaseSha256(entry.sha256, `SHA-256 for ${entry.logicalName}`);
    if (
      !new Set(['authoritative-input', 'provenance-material', 'license-material']).has(entry.role)
    ) {
      fail(`Unknown source role for ${entry.logicalName}`);
    }
    if (entry.role !== 'license-material') {
      const prefix = `https://www.unicode.org/Public/${UNICODE_VERSION}/`;
      if (!entry.upstreamProvenance.startsWith(prefix))
        fail(`Non-versioned authoritative provenance for ${entry.logicalName}`);
    }
    if (typeof entry.purpose !== 'string' || entry.purpose.length === 0)
      fail(`Missing purpose for ${entry.logicalName}`);
    if (typeof entry.versionEvidence !== 'string' || entry.versionEvidence.length === 0) {
      fail(`Missing version evidence for ${entry.logicalName}`);
    }
    if (typeof entry.license !== 'string' || !entry.license.includes('Unicode License v3')) {
      fail(`Missing Unicode License v3 binding for ${entry.logicalName}`);
    }
    paths.push(entry.path);
    logicalNames.push(entry.logicalName);
  }
  if (new Set(paths).size !== paths.length || new Set(logicalNames).size !== logicalNames.length)
    fail('Duplicate source manifest entry');
  assertExactArray('Source manifest path ordering', paths, [...paths].sort());
  assertExactArray('Frozen source set', logicalNames, EXPECTED_SOURCE_NAMES);
  if (logicalNames.some((name) => name.includes('IdnaMappingTable')))
    fail('UTS #46 mapping table must not be an acceptance input');

  const digest = manifest.sourceSetDigest;
  if (
    digest?.algorithm !== 'sha-256' ||
    !Number.isSafeInteger(digest.byteLength) ||
    digest.byteLength <= 0
  ) {
    fail('Invalid source-set digest metadata');
  }
  assertLowercaseSha256(digest.value, 'Source-set digest');

  if (!Array.isArray(manifest.generated))
    fail('Source manifest generated inventory must be an array');
  const generatedPaths = manifest.generated.map((entry) => {
    assertRelativePath(entry.path, 'Generated path');
    if (!entry.path.startsWith('generated/'))
      fail(`Generated path is outside generated/: ${entry.path}`);
    if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength <= 0)
      fail(`Invalid generated length for ${entry.path}`);
    assertLowercaseSha256(entry.sha256, `Generated SHA-256 for ${entry.path}`);
    return entry.path;
  });
  if (new Set(generatedPaths).size !== generatedPaths.length)
    fail('Duplicate generated manifest path');
  assertExactArray('Generated manifest path ordering', generatedPaths, [...generatedPaths].sort());
  return manifest;
}

function sourceSetInput(files) {
  return files
    .map((entry) => `${entry.logicalName}\0${entry.byteLength}\0${entry.sha256}\n`)
    .join('');
}

export function verifySourceSetDigest(manifest) {
  const input = Buffer.from(sourceSetInput(manifest.files), 'utf8');
  if (input.byteLength !== manifest.sourceSetDigest.byteLength)
    fail('Source-set canonical byte length mismatch');
  const actual = sha256(input);
  if (actual !== manifest.sourceSetDigest.value) fail(`Source-set SHA-256 mismatch: ${actual}`);
  return actual;
}

async function listFilesRecursively(root, current = root) {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    fail(`Cannot enumerate ${current}: ${error.message}`);
  }
  const files = [];
  for (const entry of entries.sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  )) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...(await listFilesRecursively(root, absolute)));
    else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join('/'));
    else fail(`Unsupported filesystem entry in frozen Unicode data: ${absolute}`);
  }
  return files.sort();
}

function resolveInside(root, relativePath) {
  const absoluteRoot = path.resolve(root);
  const absolute = path.resolve(absoluteRoot, relativePath);
  if (absolute !== absoluteRoot && !absolute.startsWith(`${absoluteRoot}${path.sep}`))
    fail(`Path escapes Unicode foundation: ${relativePath}`);
  return absolute;
}

export function verifySourceBytes(entry, bytes) {
  if (!Buffer.isBuffer(bytes)) fail(`Source bytes are not a Buffer: ${entry.logicalName}`);
  if (bytes.byteLength !== entry.byteLength) {
    fail(
      `Source byte length mismatch for ${entry.logicalName}: expected=${entry.byteLength} actual=${bytes.byteLength}`,
    );
  }
  const actual = sha256(bytes);
  if (actual !== entry.sha256)
    fail(
      `Source SHA-256 mismatch for ${entry.logicalName}: expected=${entry.sha256} actual=${actual}`,
    );
  return actual;
}

export async function loadVerifiedSources(foundationRoot, manifest) {
  validateSourceManifest(manifest);
  verifySourceSetDigest(manifest);
  const declared = manifest.files.map((entry) => entry.path.slice('source/'.length));
  const actual = await listFilesRecursively(path.join(foundationRoot, 'source'));
  assertExactArray('Source directory inventory', actual, declared);

  const sources = new Map();
  for (const entry of manifest.files) {
    const bytes = await readFile(resolveInside(foundationRoot, entry.path));
    verifySourceBytes(entry, bytes);
    sources.set(
      entry.logicalName,
      Object.freeze({ entry, bytes, text: decodeUtf8(bytes, entry.logicalName) }),
    );
  }
  validateVersionEvidence(sources);
  return sources;
}

function requireSource(sources, logicalName) {
  const source = sources.get(logicalName);
  if (!source) fail(`Required source missing: ${logicalName}`);
  return source;
}

function assertContains(text, expected, label) {
  if (!text.includes(expected))
    fail(`${label} does not contain required version/provenance evidence: ${expected}`);
}

export function validateVersionEvidence(sources) {
  assertContains(
    requireSource(sources, 'idna/ReadMe.txt').text,
    'final data files for version 17.0.0',
    'IDNA ReadMe',
  );
  assertContains(
    requireSource(sources, 'idna/ReadMe.txt').text,
    'IDNA2008_Category Property for the same version',
    'IDNA ReadMe',
  );
  assertContains(requireSource(sources, 'ucd/ReadMe.txt').text, 'final data files', 'UCD ReadMe');
  assertContains(requireSource(sources, 'ucd/ReadMe.txt').text, 'Version 17.0.0', 'UCD ReadMe');
  assertContains(
    requireSource(sources, 'idna/Idna2008.txt').text,
    '# Idna2008-17.0.0.txt',
    'Idna2008.txt',
  );
  assertContains(
    requireSource(sources, 'ucd/DerivedNormalizationProps.txt').text,
    '# DerivedNormalizationProps-17.0.0.txt',
    'DerivedNormalizationProps.txt',
  );
  assertContains(
    requireSource(sources, 'ucd/Scripts.txt').text,
    '# Scripts-17.0.0.txt',
    'Scripts.txt',
  );
  assertContains(
    requireSource(sources, 'ucd/extracted/DerivedJoiningType.txt').text,
    '# DerivedJoiningType-17.0.0.txt',
    'DerivedJoiningType.txt',
  );
  assertContains(
    requireSource(sources, 'ucd/extracted/DerivedBidiClass.txt').text,
    '# DerivedBidiClass-17.0.0.txt',
    'DerivedBidiClass.txt',
  );
  assertContains(
    requireSource(sources, 'license/Unicode-License-v3.txt').text,
    'UNICODE LICENSE V3',
    'Unicode license',
  );
  assertContains(
    requireSource(sources, 'license/Unicode-License-v3.txt').text,
    'COPYRIGHT AND PERMISSION NOTICE',
    'Unicode license',
  );
  return true;
}

export function parseCodePointRange(value, label = 'range') {
  if (typeof value !== 'string' || !/^[0-9A-F]{4,6}(?:\.\.[0-9A-F]{4,6})?$/u.test(value.trim())) {
    fail(`Malformed ${label}: ${String(value)}`);
  }
  const [startText, endText = startText] = value.trim().split('..');
  const start = Number.parseInt(startText, 16);
  const end = Number.parseInt(endText, 16);
  if (start > end || end > MAX_CODE_POINT) fail(`Out-of-order or out-of-range ${label}: ${value}`);
  return [start, end];
}

export function parseUnicodePropertyFile(text, label = 'Unicode property file') {
  if (typeof text !== 'string') fail(`${label} must be text`);
  const records = [];
  const missing = [];
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index].endsWith('\r') ? lines[index].slice(0, -1) : lines[index];
    const lineNumber = index + 1;
    const missingMatch = raw.match(/^\s*#\s*@missing:\s*(.*?)\s*$/u);
    if (missingMatch) {
      const fields = missingMatch[1]
        .split('#', 1)[0]
        .split(';')
        .map((field) => field.trim());
      if (fields.length < 2 || fields.some((field) => field.length === 0))
        fail(`${label}:${lineNumber} malformed @missing rule`);
      const [start, end] = parseCodePointRange(fields[0], `${label}:${lineNumber} @missing range`);
      missing.push({ start, end, fields: fields.slice(1), lineNumber });
      continue;
    }
    const data = raw.split('#', 1)[0].trim();
    if (data.length === 0) continue;
    const fields = data.split(';').map((field) => field.trim());
    if (fields.length < 2 || fields[0].length === 0 || fields[1].length === 0)
      fail(`${label}:${lineNumber} malformed data record`);
    const [start, end] = parseCodePointRange(fields[0], `${label}:${lineNumber} range`);
    records.push({ start, end, fields: fields.slice(1), lineNumber });
  }
  if (records.length === 0) fail(`${label} has no data records`);
  return { label, records, missing };
}

function normalizeValue(value, aliases) {
  return aliases?.[value] ?? value;
}

function directProperty(parsed, aliases) {
  return {
    ranges: parsed.records.map((record) => ({
      ...record,
      value: normalizeValue(record.fields[0], aliases),
    })),
    missing: parsed.missing.map((record) => ({
      ...record,
      value: normalizeValue(record.fields[0], aliases),
    })),
  };
}

function namedProperty(parsed, property, aliases) {
  const ranges = parsed.records
    .filter((record) => record.fields[0] === property)
    .map((record) => ({ ...record, value: normalizeValue(record.fields[1] ?? 'True', aliases) }));
  const missing = parsed.missing
    .filter((record) => record.fields[0] === property)
    .map((record) => ({ ...record, value: normalizeValue(record.fields[1] ?? 'True', aliases) }));
  if (ranges.length === 0) fail(`${parsed.label} does not define ${property}`);
  return { ranges, missing };
}

function validateExplicitRanges(ranges, allowed, label) {
  const sorted = [...ranges].sort(
    (left, right) => left.start - right.start || left.end - right.end,
  );
  let previous;
  for (const range of sorted) {
    if (!allowed.has(range.value))
      fail(`${label}:${range.lineNumber} unknown property value: ${range.value}`);
    if (previous && range.start <= previous.end) {
      fail(
        `${label} overlapping ranges at U+${range.start.toString(16).toUpperCase().padStart(4, '0')}`,
      );
    }
    previous = range;
  }
  return sorted;
}

export function buildCompleteProperty({ ranges, missing, allowedValues, label }) {
  if (
    !Array.isArray(allowedValues) ||
    allowedValues.length === 0 ||
    new Set(allowedValues).size !== allowedValues.length
  ) {
    fail(`${label} must declare a closed value set`);
  }
  const allowed = new Set(allowedValues);
  const sortedRanges = validateExplicitRanges(ranges, allowed, label);
  if (!Array.isArray(missing) || missing.length === 0)
    fail(`${label} has no @missing/default rule`);
  for (const rule of missing) {
    if (!allowed.has(rule.value))
      fail(`${label}:${rule.lineNumber} unknown @missing value: ${rule.value}`);
  }

  const valueIndexes = new Map(allowedValues.map((value, index) => [value, index]));
  const table = new Int16Array(CODE_POINT_COUNT);
  table.fill(-1);
  for (const rule of missing) {
    const valueIndex = valueIndexes.get(rule.value);
    table.fill(valueIndex, rule.start, rule.end + 1);
  }
  for (const range of sortedRanges)
    table.fill(valueIndexes.get(range.value), range.start, range.end + 1);

  const counts = Object.fromEntries(allowedValues.map((value) => [value, 0]));
  const scalarCounts = Object.fromEntries(allowedValues.map((value) => [value, 0]));
  for (let codePoint = 0; codePoint <= MAX_CODE_POINT; codePoint += 1) {
    const valueIndex = table[codePoint];
    if (valueIndex < 0)
      fail(`${label} does not cover U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`);
    const value = allowedValues[valueIndex];
    counts[value] += 1;
    if (codePoint < 0xd800 || codePoint > 0xdfff) scalarCounts[value] += 1;
  }

  const completeRanges = [];
  let start = 0;
  let previousValue = table[0];
  for (let codePoint = 1; codePoint <= CODE_POINT_COUNT; codePoint += 1) {
    const value = codePoint < CODE_POINT_COUNT ? table[codePoint] : -2;
    if (value !== previousValue) {
      completeRanges.push([start, codePoint - 1, allowedValues[previousValue]]);
      start = codePoint;
      previousValue = value;
    }
  }
  assertCompleteRangeTable(completeRanges, allowedValues, label);
  return {
    table,
    ranges: completeRanges,
    explicitRangeCount: sortedRanges.length,
    missingRuleCount: missing.length,
    counts,
    scalarCounts,
  };
}

export function assertCompleteRangeTable(ranges, allowedValues, label = 'range table') {
  if (!Array.isArray(ranges) || ranges.length === 0) fail(`${label} is empty`);
  const allowed = new Set(allowedValues);
  let next = 0;
  for (const range of ranges) {
    if (!Array.isArray(range) || range.length !== 3) fail(`${label} has malformed generated range`);
    const [start, end, value] = range;
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start !== next ||
      end < start ||
      end > MAX_CODE_POINT
    ) {
      fail(`${label} generated coverage is malformed at ${JSON.stringify(range)}`);
    }
    if (!allowed.has(value)) fail(`${label} has unknown generated value: ${String(value)}`);
    next = end + 1;
  }
  if (next !== CODE_POINT_COUNT) fail(`${label} generated coverage stops at ${next - 1}`);
  return true;
}

export function buildIdna2008(text, version = UNICODE_VERSION) {
  if (!text.startsWith(`# Idna2008-${version}.txt\n`))
    fail(`Idna2008.txt does not identify Unicode ${version}`);
  const parsed = parseUnicodePropertyFile(text, 'Idna2008.txt');
  const property = directProperty(parsed);
  if (
    property.missing.length !== 1 ||
    property.missing[0].start !== 0 ||
    property.missing[0].end !== MAX_CODE_POINT ||
    property.missing[0].value !== 'UNASSIGNED'
  ) {
    fail('Idna2008.txt must contain the exact full-range UNASSIGNED @missing rule');
  }
  const complete = buildCompleteProperty({
    ...property,
    allowedValues: IDNA_CATEGORIES,
    label: 'Idna2008.txt',
  });
  const encountered = sortedUnique(property.ranges.map((range) => range.value));
  assertExactArray('Idna2008 category set', encountered, [...IDNA_CATEGORIES].sort());
  return complete;
}

function mergeRanges(ranges, label) {
  const sorted = [...ranges].sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  const merged = [];
  for (const range of sorted) {
    const [start, end, value] = range;
    const previous = merged.at(-1);
    if (previous && start <= previous[1]) fail(`${label} ranges overlap`);
    if (previous && start === previous[1] + 1 && value === previous[2]) previous[1] = end;
    else merged.push([start, end, value]);
  }
  return merged;
}

export function parseUnicodeData(text) {
  if (typeof text !== 'string' || text.length === 0) fail('UnicodeData.txt must be nonempty text');
  const combining = [];
  const generalCategoryMarks = [];
  const decompositions = [];
  let assignedCodePoints = 0;
  let previousCodePoint = -1;
  let pendingRange;
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].endsWith('\r') ? lines[index].slice(0, -1) : lines[index];
    if (line.length === 0) continue;
    const fields = line.split(';');
    if (fields.length !== 15) fail(`UnicodeData.txt:${index + 1} must contain exactly 15 fields`);
    const [codePoint] = parseCodePointRange(fields[0], `UnicodeData.txt:${index + 1} code point`);
    if (codePoint <= previousCodePoint)
      fail(`UnicodeData.txt:${index + 1} is not strictly ordered`);
    previousCodePoint = codePoint;
    const name = fields[1];
    const generalCategory = fields[2];
    if (!GENERAL_CATEGORY_SET.has(generalCategory)) {
      fail(`UnicodeData.txt:${index + 1} unknown General_Category: ${generalCategory}`);
    }
    if (!/^(?:0|[1-9][0-9]{0,2})$/u.test(fields[3]))
      fail(`UnicodeData.txt:${index + 1} invalid combining class`);
    const ccc = Number(fields[3]);
    if (ccc > 254) fail(`UnicodeData.txt:${index + 1} combining class exceeds 254`);
    const decomposition = fields[5];
    const isFirst = name.endsWith(', First>');
    const isLast = name.endsWith(', Last>');
    if (isFirst) {
      if (pendingRange) fail(`UnicodeData.txt:${index + 1} nested First range`);
      pendingRange = {
        start: codePoint,
        name: name.slice(0, -8),
        generalCategory,
        ccc,
        decomposition,
        lineNumber: index + 1,
      };
      continue;
    }
    if (isLast) {
      if (!pendingRange || pendingRange.name !== name.slice(0, -7))
        fail(`UnicodeData.txt:${index + 1} unmatched Last range`);
      if (
        pendingRange.generalCategory !== generalCategory ||
        pendingRange.ccc !== ccc ||
        pendingRange.decomposition !== decomposition
      ) {
        fail(`UnicodeData.txt:${index + 1} range endpoint property mismatch`);
      }
      if (ccc !== 0) combining.push([pendingRange.start, codePoint, ccc]);
      if (MARK_GENERAL_CATEGORY_SET.has(generalCategory)) {
        generalCategoryMarks.push([pendingRange.start, codePoint]);
      }
      if (decomposition.length !== 0)
        fail(`UnicodeData.txt:${index + 1} range decomposition is unsupported`);
      assignedCodePoints += codePoint - pendingRange.start + 1;
      pendingRange = undefined;
      continue;
    }
    if (pendingRange) fail(`UnicodeData.txt:${index + 1} missing Last range endpoint`);
    assignedCodePoints += 1;
    if (ccc !== 0) combining.push([codePoint, codePoint, ccc]);
    if (MARK_GENERAL_CATEGORY_SET.has(generalCategory)) {
      generalCategoryMarks.push([codePoint, codePoint]);
    }
    if (decomposition.length !== 0 && !decomposition.startsWith('<')) {
      const mapping = decomposition
        .split(' ')
        .map(
          (token) => parseCodePointRange(token, `UnicodeData.txt:${index + 1} decomposition`)[0],
        );
      if (mapping.length === 0) fail(`UnicodeData.txt:${index + 1} empty canonical decomposition`);
      decompositions.push([codePoint, mapping]);
    }
  }
  if (pendingRange) fail(`UnicodeData.txt:${pendingRange.lineNumber} has no Last endpoint`);
  if (decompositions.length === 0) fail('UnicodeData.txt has no canonical decompositions');
  return {
    assignedCodePoints,
    canonicalCombiningClassRanges: mergeRanges(combining, 'Canonical_Combining_Class'),
    generalCategoryMarkRanges: mergeRanges(generalCategoryMarks, 'General_Category Mark').map(
      ([start, end]) => [start, end],
    ),
    canonicalDecompositions: decompositions,
  };
}

function sourceBindings(manifest) {
  return Object.fromEntries(manifest.files.map((entry) => [entry.logicalName, entry.sha256]));
}

function rangesForValue(completeRanges, value) {
  return completeRanges.filter((range) => range[2] === value).map(([start, end]) => [start, end]);
}

function binaryRanges(property, label) {
  const allowed = new Set(['True']);
  const sorted = validateExplicitRanges(property.ranges, allowed, label);
  return mergeRanges(
    sorted.map((range) => [range.start, range.end, true]),
    label,
  ).map(([start, end]) => [start, end]);
}

export function generateArtifactObjects(manifest, sources) {
  const idnaSource = requireSource(sources, 'idna/Idna2008.txt');
  const idna = buildIdna2008(idnaSource.text);

  const unicodeData = parseUnicodeData(requireSource(sources, 'ucd/UnicodeData.txt').text);
  const normalizationParsed = parseUnicodePropertyFile(
    requireSource(sources, 'ucd/DerivedNormalizationProps.txt').text,
    'DerivedNormalizationProps.txt',
  );
  const nfcProperty = namedProperty(normalizationParsed, 'NFC_QC', { Yes: 'Y' });
  const nfc = buildCompleteProperty({
    ...nfcProperty,
    allowedValues: ['Y', 'N', 'M'],
    label: 'NFC_Quick_Check',
  });
  const compositionExclusions = binaryRanges(
    namedProperty(normalizationParsed, 'Full_Composition_Exclusion'),
    'Full_Composition_Exclusion',
  );

  const scriptsParsed = parseUnicodePropertyFile(
    requireSource(sources, 'ucd/Scripts.txt').text,
    'Scripts.txt',
  );
  const scriptsProperty = directProperty(scriptsParsed);
  const scriptValues = sortedUnique([
    ...scriptsProperty.ranges.map((range) => range.value),
    ...scriptsProperty.missing.map((range) => range.value),
  ]);
  const scripts = buildCompleteProperty({
    ...scriptsProperty,
    allowedValues: scriptValues,
    label: 'Script',
  });
  const contextScriptRanges = Object.fromEntries(
    CONTEXTO_SCRIPTS.map((script) => {
      const ranges = rangesForValue(scripts.ranges, script);
      if (ranges.length === 0) fail(`Scripts.txt has no ${script} ranges`);
      return [script, ranges];
    }),
  );

  const joiningParsed = parseUnicodePropertyFile(
    requireSource(sources, 'ucd/extracted/DerivedJoiningType.txt').text,
    'DerivedJoiningType.txt',
  );
  const joining = buildCompleteProperty({
    ...directProperty(joiningParsed, JOINING_TYPE_ALIASES),
    allowedValues: ['U', 'R', 'L', 'D', 'C', 'T'],
    label: 'Joining_Type',
  });

  const bidiParsed = parseUnicodePropertyFile(
    requireSource(sources, 'ucd/extracted/DerivedBidiClass.txt').text,
    'DerivedBidiClass.txt',
  );
  const bidi = buildCompleteProperty({
    ...directProperty(bidiParsed, BIDI_CLASS_ALIASES),
    allowedValues: BIDI_CLASSES,
    label: 'Bidi_Class',
  });

  const common = {
    unicodeVersion: UNICODE_VERSION,
    sourceSetSha256: manifest.sourceSetDigest.value,
    sourceSha256: sourceBindings(manifest),
  };
  const idnaArtifact = {
    format: 'ghostbridge-unicode-idna2008-ranges-v1',
    ...common,
    authority:
      'IDNA2008_Category from Unicode 17.0.0 Idna2008.txt; UTS #46 mapping is not an input',
    defaultRule: { start: 0, end: MAX_CODE_POINT, value: 'UNASSIGNED' },
    categories: IDNA_CATEGORIES,
    coverage: {
      codePoints: CODE_POINT_COUNT,
      unicodeScalars: UNICODE_SCALAR_COUNT,
      explicitSourceRanges: idna.explicitRangeCount,
      missingRules: idna.missingRuleCount,
      generatedRanges: idna.ranges.length,
      codePointCounts: idna.counts,
      unicodeScalarCounts: idna.scalarCounts,
    },
    ranges: idna.ranges,
  };

  const viramaRanges = unicodeData.canonicalCombiningClassRanges
    .filter((range) => range[2] === 9)
    .map(([start, end]) => [start, end]);
  if (viramaRanges.length === 0) fail('UnicodeData.txt has no canonical combining class 9 ranges');
  if (unicodeData.generalCategoryMarkRanges.length === 0) {
    fail('UnicodeData.txt has no General_Category Mark ranges');
  }
  const propertiesArtifact = {
    format: 'ghostbridge-unicode-idna-properties-v1',
    ...common,
    normalization: {
      canonicalCombiningClassDefault: 0,
      canonicalCombiningClassRanges: unicodeData.canonicalCombiningClassRanges,
      canonicalDecompositions: unicodeData.canonicalDecompositions,
      fullCompositionExclusionRanges: compositionExclusions,
      nfcQuickCheckValues: ['Y', 'N', 'M'],
      nfcQuickCheckRanges: nfc.ranges,
      note: 'Hangul NFC decomposition/composition is algorithmic and is not represented by a versioned property table.',
    },
    generalCategoryMark: {
      unicodeDataField: 2,
      values: MARK_GENERAL_CATEGORIES,
      ranges: unicodeData.generalCategoryMarkRanges,
    },
    contextJ: {
      joinControlCodePoints: [0x200c, 0x200d],
      viramaCanonicalCombiningClass: 9,
      viramaRanges,
      joiningTypeValues: ['U', 'R', 'L', 'D', 'C', 'T'],
      joiningTypeRanges: joining.ranges,
    },
    contextO: {
      ruleCodePoints: [0x00b7, 0x0375, 0x05f3, 0x05f4, 0x30fb],
      arabicIndicDigits: [0x0660, 0x0669],
      extendedArabicIndicDigits: [0x06f0, 0x06f9],
      scriptRanges: contextScriptRanges,
    },
    bidi: {
      scope: 'complete-domain-label-sequence',
      values: BIDI_CLASSES,
      ranges: bidi.ranges,
    },
    coverage: {
      unicodeDataAssignedCodePoints: unicodeData.assignedCodePoints,
      canonicalCombiningClassRanges: unicodeData.canonicalCombiningClassRanges.length,
      generalCategoryMarkRanges: unicodeData.generalCategoryMarkRanges.length,
      canonicalDecompositions: unicodeData.canonicalDecompositions.length,
      fullCompositionExclusionRanges: compositionExclusions.length,
      nfcQuickCheckRanges: nfc.ranges.length,
      joiningTypeRanges: joining.ranges.length,
      bidiClassRanges: bidi.ranges.length,
    },
  };

  return new Map([
    ['generated/idna2008-ranges.json', idnaArtifact],
    ['generated/idna-properties.json', propertiesArtifact],
  ]);
}

export function artifactBuffers(artifacts) {
  return new Map(
    [...artifacts].map(([relativePath, value]) => [
      relativePath,
      Buffer.from(stableJson(value), 'utf8'),
    ]),
  );
}

export async function loadManifest(foundationRoot) {
  const manifestPath = path.join(foundationRoot, 'source-manifest.json');
  let bytes;
  try {
    bytes = await readFile(manifestPath);
  } catch (error) {
    fail(`Cannot read source manifest: ${error.message}`);
  }
  let manifest;
  try {
    manifest = JSON.parse(decodeUtf8(bytes, 'source-manifest.json'));
  } catch (error) {
    fail(`Cannot parse source manifest: ${error.message}`);
  }
  return validateSourceManifest(manifest);
}

export async function buildRepositoryArtifacts(foundationRoot) {
  const manifest = await loadManifest(foundationRoot);
  const sources = await loadVerifiedSources(foundationRoot, manifest);
  return { manifest, sources, artifacts: generateArtifactObjects(manifest, sources) };
}

export async function verifyGeneratedArtifacts(foundationRoot, manifest, artifacts) {
  const buffers = artifactBuffers(artifacts);
  const expectedPaths = [...buffers.keys()].sort();
  const declaredPaths = manifest.generated.map((entry) => entry.path);
  assertExactArray('Generated artifact inventory', declaredPaths, expectedPaths);
  const actualPaths = await listFilesRecursively(path.join(foundationRoot, 'generated'));
  assertExactArray(
    'Generated directory inventory',
    actualPaths.map((entry) => `generated/${entry}`),
    expectedPaths,
  );

  for (const entry of manifest.generated) {
    const expected = buffers.get(entry.path);
    if (expected.byteLength !== entry.byteLength)
      fail(`Generated manifest byte length drift: ${entry.path}`);
    if (sha256(expected) !== entry.sha256) fail(`Generated manifest SHA-256 drift: ${entry.path}`);
    const actual = await readFile(resolveInside(foundationRoot, entry.path));
    if (!actual.equals(expected)) fail(`Generated file drift: ${entry.path}`);
    if (actual.byteLength !== entry.byteLength || sha256(actual) !== entry.sha256)
      fail(`Generated file integrity failure: ${entry.path}`);
  }

  const idna = artifacts.get('generated/idna2008-ranges.json');
  assertCompleteRangeTable(idna.ranges, IDNA_CATEGORIES, 'Generated IDNA2008 table');
  const properties = artifacts.get('generated/idna-properties.json');
  assertCompleteRangeTable(
    properties.normalization.nfcQuickCheckRanges,
    ['Y', 'N', 'M'],
    'Generated NFC_QC table',
  );
  assertCompleteRangeTable(
    properties.contextJ.joiningTypeRanges,
    ['U', 'R', 'L', 'D', 'C', 'T'],
    'Generated joining table',
  );
  assertCompleteRangeTable(properties.bidi.ranges, BIDI_CLASSES, 'Generated Bidi table');
  return buffers;
}

export async function assertOfflineImplementation(foundationRoot) {
  const files = [
    path.join(foundationRoot, 'generate.mjs'),
    path.join(foundationRoot, 'lib', 'unicode-data.mjs'),
    path.join(foundationRoot, 'test', 'unicode-data.test.mjs'),
  ];
  const forbidden = [
    'fe' + 'tch',
    'XML' + 'HttpRequest',
    'http' + '.request',
    'https' + '.request',
    'Invoke-' + 'WebRequest',
    'cu' + 'rl',
  ];
  const networkModules = new Set(
    ['http', 'https', 'http2', 'net', 'tls', 'dns', 'dgram', 'child_process'].map(
      (name) => `node:${name}`,
    ),
  );
  const importPattern = /(?:\bfrom\s+|\bimport\s*)["']([^"']+)["']/gu;
  for (const file of files) {
    const fileStat = await stat(file);
    if (!fileStat.isFile()) fail(`Offline implementation path is not a file: ${file}`);
    const text = decodeUtf8(await readFile(file), path.basename(file));
    if (forbidden.some((token) => text.includes(token)))
      fail(`Network-capable code found in offline generator/test: ${file}`);
    if (/\bimport\s*\(/u.test(text))
      fail(`Dynamic import is prohibited in offline generator/test: ${file}`);
    for (const match of text.matchAll(importPattern)) {
      const specifier = match[1];
      if (networkModules.has(specifier))
        fail(`Network/process module is prohibited in offline generator/test: ${specifier}`);
      if (
        !specifier.startsWith('node:') &&
        !specifier.startsWith('./') &&
        !specifier.startsWith('../')
      ) {
        fail(`External package import is prohibited in offline generator/test: ${specifier}`);
      }
    }
  }
  return files.length;
}

export async function checkRepository(foundationRoot) {
  const { manifest, artifacts } = await buildRepositoryArtifacts(foundationRoot);
  const buffers = await verifyGeneratedArtifacts(foundationRoot, manifest, artifacts);
  const offlineFiles = await assertOfflineImplementation(foundationRoot);
  return {
    sourceFiles: manifest.files.length,
    generatedFiles: buffers.size,
    offlineFiles,
    sourceSetSha256: manifest.sourceSetDigest.value,
    generated: [...buffers].map(([relativePath, bytes]) => ({
      path: relativePath,
      byteLength: bytes.byteLength,
      sha256: sha256(bytes),
    })),
  };
}
