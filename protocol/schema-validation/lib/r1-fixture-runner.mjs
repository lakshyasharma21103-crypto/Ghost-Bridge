import { errorMessage, fail } from './errors.mjs';
import { runFixtureCase } from './fixture-runner.mjs';
import { validateProtocolJsonBytes } from './json-source.mjs';

export const R1_WIRE_FIXTURE_SCHEMA_ID = 'urn:uuid:96c77461-15e3-455b-b96c-626f2b060d58';
export const R1_RAW_FIXTURE_SCHEMA_ID = 'urn:uuid:19b7f64a-9159-4a07-ac71-7404a64546e3';
export const RAW_CARRIER_LIMITS = Object.freeze({
  maximumBytes: 2 * 1024 * 1024,
  maximumDepth: 32,
  maximumWork: 100_000,
});

function carrierFailure(code, message) {
  fail(`[${code}] ${message}`);
}

function checkedAdd(left, right) {
  if (
    !Number.isSafeInteger(left) ||
    !Number.isSafeInteger(right) ||
    left < 0 ||
    right < 0 ||
    left > Number.MAX_SAFE_INTEGER - right
  ) {
    carrierFailure('RAW_CARRIER_ARITHMETIC', 'Lossless raw fixture carrier addition overflow');
  }
  return left + right;
}

function checkedMultiply(left, right) {
  if (
    !Number.isSafeInteger(left) ||
    !Number.isSafeInteger(right) ||
    left < 0 ||
    right < 0 ||
    (left !== 0 && right > Math.floor(Number.MAX_SAFE_INTEGER / left))
  ) {
    carrierFailure(
      'RAW_CARRIER_ARITHMETIC',
      'Lossless raw fixture carrier multiplication overflow',
    );
  }
  return left * right;
}

function analyzeSegment(segment, depth = 1, state = { visitedSegments: 0 }) {
  state.visitedSegments = checkedAdd(state.visitedSegments, 1);
  if (state.visitedSegments > RAW_CARRIER_LIMITS.maximumWork) {
    carrierFailure(
      'RAW_CARRIER_WORK',
      `Lossless raw fixture carrier exceeds ${RAW_CARRIER_LIMITS.maximumWork} analysis work units`,
    );
  }
  if (!segment || typeof segment !== 'object' || Array.isArray(segment)) {
    carrierFailure('RAW_CARRIER_SHAPE', 'Lossless raw fixture segment must be an object');
  }
  if (depth > RAW_CARRIER_LIMITS.maximumDepth) {
    carrierFailure(
      'RAW_CARRIER_DEPTH',
      `Lossless raw fixture carrier exceeds nesting depth ${RAW_CARRIER_LIMITS.maximumDepth}`,
    );
  }
  const repeat = segment.repeat ?? 1;
  if (!Number.isSafeInteger(repeat) || repeat < 1) {
    carrierFailure(
      'RAW_CARRIER_REPEAT',
      'Lossless raw fixture repeat must be a positive safe integer',
    );
  }
  const hasHex = Object.hasOwn(segment, 'hex');
  const hasSegments = Object.hasOwn(segment, 'segments');
  if (hasHex === hasSegments)
    carrierFailure(
      'RAW_CARRIER_SHAPE',
      'Lossless raw fixture segment must have exactly one payload form',
    );

  let unitBytes;
  let unitWork = 1;
  if (hasHex) {
    if (typeof segment.hex !== 'string') {
      carrierFailure('RAW_CARRIER_HEX', 'Lossless raw fixture hexadecimal payload is malformed');
    }
    if (segment.hex.length > RAW_CARRIER_LIMITS.maximumBytes * 2) {
      carrierFailure(
        'RAW_CARRIER_BYTES',
        `Lossless raw fixture carrier exceeds ${RAW_CARRIER_LIMITS.maximumBytes} expanded bytes`,
      );
    }
    if (segment.hex.length % 2 !== 0 || !/^[0-9a-f]*$/u.test(segment.hex)) {
      carrierFailure('RAW_CARRIER_HEX', 'Lossless raw fixture hexadecimal payload is malformed');
    }
    if (Object.keys(segment).some((key) => key !== 'hex' && key !== 'repeat')) {
      carrierFailure(
        'RAW_CARRIER_SHAPE',
        'Lossless raw fixture hexadecimal segment has an unknown member',
      );
    }
    unitBytes = segment.hex.length / 2;
  } else {
    if (
      !Array.isArray(segment.segments) ||
      segment.segments.length < 1 ||
      Object.keys(segment).some((key) => key !== 'segments' && key !== 'repeat')
    ) {
      carrierFailure('RAW_CARRIER_SHAPE', 'Lossless raw fixture group segment is malformed');
    }
    unitBytes = 0;
    for (const child of segment.segments) {
      const childAnalysis = analyzeSegment(child, depth + 1, state);
      unitBytes = checkedAdd(unitBytes, childAnalysis.bytes);
      unitWork = checkedAdd(unitWork, childAnalysis.work);
    }
  }
  return {
    bytes: checkedMultiply(unitBytes, repeat),
    work: checkedAdd(1, checkedMultiply(unitWork, repeat)),
  };
}

function writeSegment(segment, target, offset) {
  const repeat = segment.repeat ?? 1;
  if (Object.hasOwn(segment, 'hex')) {
    const bytes = Buffer.from(segment.hex, 'hex');
    for (let index = 0; index < repeat; index += 1) {
      target.set(bytes, offset);
      offset += bytes.length;
    }
    return offset;
  }
  for (let index = 0; index < repeat; index += 1) {
    for (const child of segment.segments) offset = writeSegment(child, target, offset);
  }
  return offset;
}

export function decodeLosslessRawCarrier(segment) {
  const analysis = analyzeSegment(segment);
  if (analysis.bytes > RAW_CARRIER_LIMITS.maximumBytes) {
    carrierFailure(
      'RAW_CARRIER_BYTES',
      `Lossless raw fixture carrier exceeds ${RAW_CARRIER_LIMITS.maximumBytes} expanded bytes`,
    );
  }
  if (analysis.work > RAW_CARRIER_LIMITS.maximumWork) {
    carrierFailure(
      'RAW_CARRIER_WORK',
      `Lossless raw fixture carrier exceeds ${RAW_CARRIER_LIMITS.maximumWork} work units`,
    );
  }
  const bytes = new Uint8Array(analysis.bytes);
  if (analysis.bytes === 0) return bytes;
  const finalOffset = writeSegment(segment, bytes, 0);
  if (finalOffset !== analysis.bytes) fail('Lossless raw fixture carrier length mismatch');
  return bytes;
}

function runRawCase(testCase) {
  try {
    const bytes = decodeLosslessRawCarrier(testCase.source);
    const result = validateProtocolJsonBytes(bytes, {
      maximumBytes: testCase.maximumBytes,
      source: testCase.id,
    });
    if (testCase.expected !== 'pass') fail(`Raw fixture unexpectedly passed: ${testCase.id}`);
    if (
      testCase.expectedTokenCount !== undefined &&
      result.tokenCount !== testCase.expectedTokenCount
    ) {
      fail(
        `Raw fixture token-count mismatch for ${testCase.id}: expected=${testCase.expectedTokenCount} actual=${result.tokenCount}`,
      );
    }
  } catch (error) {
    const message = errorMessage(error);
    if (testCase.expected === 'pass')
      fail(`Raw fixture unexpectedly failed: ${testCase.id}: ${message}`, { cause: error });
    if (!message.includes(`[${testCase.expectedDiagnostic}]`)) {
      fail(`Raw fixture failed with the wrong diagnostic for ${testCase.id}: ${message}`, {
        cause: error,
      });
    }
  }
}

export function runR1Fixtures({ manifest, assets, ajv }) {
  const processedFixturePaths = new Set();
  const fixtureIds = new Set();
  const fixtureTargetSchemaIds = new Set();
  let wireCount = 0;
  let rawCount = 0;
  let semanticCount = 0;

  for (const entry of manifest.fixtures.filter(
    (item) => item.schemaId === R1_WIRE_FIXTURE_SCHEMA_ID,
  )) {
    const corpus = assets.get(entry.path);
    if (!corpus || !Array.isArray(corpus.cases))
      fail(`R1 wire fixture corpus was not loaded: ${entry.path}`);
    for (const testCase of corpus.cases) {
      if (fixtureIds.has(testCase.id)) fail(`Duplicate R1 fixture ID: ${testCase.id}`);
      fixtureIds.add(testCase.id);
      fixtureTargetSchemaIds.add(testCase.targetSchema);
      const validateTarget = ajv.getSchema(testCase.targetSchema);
      if (!validateTarget)
        fail(`R1 fixture target schema is not preloaded: ${testCase.targetSchema}`);
      const result = runFixtureCase({
        testCase,
        classification: testCase.classification,
        validateTarget,
        errorsText: () => ajv.errorsText(validateTarget.errors),
      });
      semanticCount += result.semanticChecks;
      wireCount += 1;
    }
    processedFixturePaths.add(entry.path);
  }

  for (const entry of manifest.fixtures.filter(
    (item) => item.schemaId === R1_RAW_FIXTURE_SCHEMA_ID,
  )) {
    const corpus = assets.get(entry.path);
    if (!corpus || !Array.isArray(corpus.cases))
      fail(`R1 raw fixture corpus was not loaded: ${entry.path}`);
    for (const testCase of corpus.cases) {
      if (fixtureIds.has(testCase.id)) fail(`Duplicate R1 fixture ID: ${testCase.id}`);
      fixtureIds.add(testCase.id);
      runRawCase(testCase);
      rawCount += 1;
    }
    processedFixturePaths.add(entry.path);
  }

  return {
    fixtureCount: wireCount + rawCount,
    fixtureTargetSchemaIds,
    processedFixturePaths,
    rawCount,
    semanticCount,
    wireCount,
  };
}
