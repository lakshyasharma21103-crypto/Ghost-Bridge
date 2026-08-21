import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  artifactBuffers,
  buildCompleteProperty,
  buildIdna2008,
  buildRepositoryArtifacts,
  checkRepository,
  generateArtifactObjects,
  parseCodePointRange,
  parseUnicodeData,
  parseUnicodePropertyFile,
  verifySourceBytes,
} from '../lib/unicode-data.mjs';
import { normalizeNfcCodePoints } from '../../../schema-validation/lib/frozen-unicode17.mjs';

const foundationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryBuild = buildRepositoryArtifacts(foundationRoot);

test('frozen repository sources and generated data verify offline', async () => {
  const result = await checkRepository(foundationRoot);
  assert.equal(result.sourceFiles, 9);
  assert.equal(result.generatedFiles, 2);
  assert.equal(result.offlineFiles, 3);
});

test('generation is byte-identical for identical source bytes', async () => {
  const { manifest, sources } = await repositoryBuild;
  const first = artifactBuffers(generateArtifactObjects(manifest, sources));
  const second = artifactBuffers(generateArtifactObjects(manifest, sources));
  assert.deepEqual([...first.keys()], [...second.keys()]);
  for (const [relativePath, bytes] of first)
    assert.ok(bytes.equals(second.get(relativePath)), relativePath);
});

test('source byte-length and digest binding fails closed on corruption', async () => {
  const { manifest, sources } = await repositoryBuild;
  const entry = manifest.files[0];
  const corrupted = Buffer.from(sources.get(entry.logicalName).bytes);
  corrupted[corrupted.length - 1] ^= 1;
  assert.throws(() => verifySourceBytes(entry, corrupted), /SHA-256 mismatch/u);
  assert.throws(() => verifySourceBytes(entry, corrupted.subarray(1)), /byte length mismatch/u);
});

test('malformed code-point ranges reject', () => {
  for (const malformed of ['00gg', '110000', '0042..0041', '0000...0001', '0', '00000Z']) {
    assert.throws(
      () => parseCodePointRange(malformed, 'test range'),
      /Malformed|Out-of-order|out-of-range/u,
    );
  }
  assert.throws(
    () => parseUnicodePropertyFile('0000 PVALID\n', 'malformed.txt'),
    /malformed data record/u,
  );
});

test('overlapping property ranges reject', () => {
  const parsed = parseUnicodePropertyFile(
    '# @missing: 0000..10FFFF; UNASSIGNED\n0000..0002 ; PVALID\n0002..0003 ; DISALLOWED\n',
    'overlap.txt',
  );
  assert.throws(
    () =>
      buildCompleteProperty({
        ranges: parsed.records.map((record) => ({ ...record, value: record.fields[0] })),
        missing: parsed.missing.map((record) => ({ ...record, value: record.fields[0] })),
        allowedValues: ['PVALID', 'DISALLOWED', 'UNASSIGNED'],
        label: 'overlap.txt',
      }),
    /overlapping ranges/u,
  );
});

test('ordered missing rules and explicit ranges have deterministic precedence', () => {
  const parsed = parseUnicodePropertyFile(
    '# @missing: 0000..10FFFF; DEFAULT\n# @missing: 0100..01FF; NARROW\n0180..018F ; EXPLICIT\n',
    'ordered-missing.txt',
  );
  const complete = buildCompleteProperty({
    ranges: parsed.records.map((record) => ({ ...record, value: record.fields[0] })),
    missing: parsed.missing.map((record) => ({ ...record, value: record.fields[0] })),
    allowedValues: ['DEFAULT', 'NARROW', 'EXPLICIT'],
    label: 'ordered-missing.txt',
  });
  const lookup = (codePoint) =>
    complete.ranges.find(([start, end]) => codePoint >= start && codePoint <= end)?.[2];
  assert.equal(lookup(0x0000), 'DEFAULT');
  assert.equal(lookup(0x0100), 'NARROW');
  assert.equal(lookup(0x0180), 'EXPLICIT');
  assert.equal(lookup(0x0190), 'NARROW');
  assert.equal(lookup(0x0200), 'DEFAULT');
  assert.equal(complete.ranges[0][0], 0);
  assert.equal(complete.ranges.at(-1)[1], 0x10ffff);
  for (let index = 1; index < complete.ranges.length; index += 1) {
    assert.equal(complete.ranges[index][0], complete.ranges[index - 1][1] + 1);
  }
});

test('unknown IDNA category rejects', () => {
  const text = '# Idna2008-17.0.0.txt\n# @missing: 0000..10FFFF; UNASSIGNED\n0000 ; UNKNOWN\n';
  assert.throws(() => buildIdna2008(text), /unknown property value/u);
});

test('missing default coverage rejects', () => {
  assert.throws(
    () =>
      buildCompleteProperty({
        ranges: [{ start: 0, end: 0, value: 'PVALID', lineNumber: 1 }],
        missing: [],
        allowedValues: ['PVALID'],
        label: 'incomplete.txt',
      }),
    /no @missing\/default rule/u,
  );
});

test('wrong Idna2008 Unicode version rejects', () => {
  const text =
    '# Idna2008-15.1.0.txt\n# @missing: 0000..10FFFF; UNASSIGNED\n0000..10FFFF ; UNASSIGNED\n';
  assert.throws(() => buildIdna2008(text), /does not identify Unicode 17\.0\.0/u);
});

test('UnicodeData field 2 deterministically derives only General_Category Mark ranges', async () => {
  const { artifacts, sources } = await repositoryBuild;
  const unicodeDataText = sources.get('ucd/UnicodeData.txt').text;
  const parsed = parseUnicodeData(unicodeDataText);
  const repeated = parseUnicodeData(unicodeDataText);
  const generated = artifacts.get('generated/idna-properties.json').generalCategoryMark;
  const lookup = (ranges, codePoint) =>
    ranges.some(([start, end]) => codePoint >= start && codePoint <= end);
  const fieldsFor = (codePoint) => {
    const prefix = `${codePoint.toString(16).toUpperCase().padStart(4, '0')};`;
    return unicodeDataText
      .split('\n')
      .find((line) => line.startsWith(prefix))
      .split(';');
  };

  assert.equal(generated.unicodeDataField, 2);
  assert.deepEqual(generated.values, ['Mn', 'Mc', 'Me']);
  assert.deepEqual(generated.ranges, parsed.generalCategoryMarkRanges);
  assert.deepEqual(repeated.generalCategoryMarkRanges, parsed.generalCategoryMarkRanges);
  assert.equal(fieldsFor(0x0900)[2], 'Mn');
  assert.equal(fieldsFor(0x0900)[3], '0');
  assert.equal(fieldsFor(0x0903)[2], 'Mc');
  assert.equal(fieldsFor(0x0903)[3], '0');
  assert.equal(lookup(generated.ranges, 0x0900), true);
  assert.equal(lookup(generated.ranges, 0x0903), true);
  assert.equal(lookup(generated.ranges, 0x0061), false);

  const categorySamples = [
    '00C0;LATIN CAPITAL LETTER A WITH GRAVE;Lu;0;L;0041 0300;;;;N;LATIN CAPITAL LETTER A GRAVE;;;00E0;',
    '0300;COMBINING GRAVE ACCENT;Mn;230;NSM;;;;;N;NON-SPACING GRAVE;;;;',
    '0488;COMBINING CYRILLIC HUNDRED THOUSANDS SIGN;Me;0;NSM;;;;;N;;;;;',
    '0903;DEVANAGARI SIGN VISARGA;Mc;0;L;;;;;N;;;;;',
  ].join('\n');
  assert.deepEqual(parseUnicodeData(categorySamples).generalCategoryMarkRanges, [
    [0x0300, 0x0300],
    [0x0488, 0x0488],
    [0x0903, 0x0903],
  ]);
  assert.throws(
    () => parseUnicodeData(categorySamples.replace(';Lu;', ';XX;')),
    /unknown General_Category/u,
  );
  assert.throws(
    () => parseUnicodeData(categorySamples.replace(';Lu;', ';;')),
    /unknown General_Category/u,
  );
});

test('frozen NFC matches the complete official Unicode 17 normalization corpus', async () => {
  const manifestPath = path.join(foundationRoot, 'test', 'normalization-test-manifest.json');
  const evidence = JSON.parse(await readFile(manifestPath, 'utf8'));
  const { manifest } = await repositoryBuild;
  const comparisonEntry = manifest.comparisonOnlySources.find(
    (entry) => entry.logicalName === 'ucd/NormalizationTest.txt',
  );
  assert.ok(comparisonEntry);
  assert.equal(comparisonEntry.metadataPath, 'test/normalization-test-manifest.json');
  for (const property of [
    'unicodeVersion',
    'path',
    'upstreamProvenance',
    'byteLength',
    'sha256',
    'role',
    'propertyAuthority',
    'normalRuntimeRead',
  ]) {
    assert.equal(comparisonEntry[property], evidence[property]);
  }
  assert.equal(evidence.format, 'ghostbridge-unicode-normalization-test-evidence-v1');
  assert.equal(evidence.unicodeVersion, '17.0.0');
  assert.equal(evidence.role, 'comparison/test-only');
  assert.equal(evidence.propertyAuthority, false);
  assert.equal(evidence.normalRuntimeRead, false);
  const bytes = await readFile(path.join(foundationRoot, evidence.path));
  assert.equal(bytes.byteLength, evidence.byteLength);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), evidence.sha256);
  const parseSequence = (field) =>
    field.length === 0 ? [] : field.split(' ').map((value) => Number.parseInt(value, 16));
  let records = 0;
  for (const rawLine of bytes.toString('utf8').split('\n')) {
    const data = rawLine.split('#', 1)[0].trim();
    if (data.length === 0 || data.startsWith('@')) continue;
    const fields = data.split(';').map((field) => field.trim());
    assert.ok(fields.length >= 5, `Malformed NormalizationTest record: ${rawLine}`);
    const [source, nfc, nfd, nfkc, nfkd] = fields.slice(0, 5).map(parseSequence);
    assert.deepEqual(normalizeNfcCodePoints(source), nfc);
    assert.deepEqual(normalizeNfcCodePoints(nfc), nfc);
    assert.deepEqual(normalizeNfcCodePoints(nfd), nfc);
    assert.deepEqual(normalizeNfcCodePoints(nfkc), nfkc);
    assert.deepEqual(normalizeNfcCodePoints(nfkd), nfkc);
    records += 1;
  }
  assert.equal(records, evidence.recordCount);
});
