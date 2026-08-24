import path from 'node:path';

import { fail } from './errors.mjs';
import {
  ProtocolReleaseValidationError,
  compareProtocolReleases,
  isProtocolRelease,
  parseProtocolRelease,
  protocolReleasesEqual,
} from './protocol-release.mjs';

export const PROTOCOL_RELEASE_SCHEMA_ID = 'urn:uuid:f27a43b2-052e-4f02-aeb5-2ea4f21f4e17';
export const PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID = 'urn:uuid:96042323-b06d-4c04-a3ab-0b1d646f6869';

export const PROTOCOL_RELEASE_REQUIRED_PROOF_IDS = Object.freeze([
  'PROTOCOL_RELEASE_FIXTURE_CONTRACT_EXECUTED',
  'PROTOCOL_RELEASE_LITERAL_ORACLES_EXECUTED',
  'PROTOCOL_RELEASE_TARGET_COVERAGE_EXECUTED',
  'PROTOCOL_RELEASE_SEEDED_DIAGNOSTICS_EXECUTED',
  'PROTOCOL_RELEASE_VALIDATION_BOUNDARIES_EXECUTED',
  'PROTOCOL_RELEASE_INVALID_OPERAND_REJECTION_EXECUTED',
  'PROTOCOL_RELEASE_COMPARATOR_TOTAL_ORDER_EXECUTED',
  'PROTOCOL_RELEASE_COMPARATOR_DETERMINISM_EXECUTED',
]);

const PROTOCOL_RELEASE = 'ghostbridge/e1.r0-draft.1';
const UUID_V4_URN_PATTERN =
  /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?![\s\S])/u;
export const PROTOCOL_RELEASE_FIXTURE_CASE_ID_PATTERN_SOURCE =
  '^FND-PROTOCOL-RELEASE-[A-Z0-9-]+(?![\\s\\S])';
const CASE_ID_PATTERN = new RegExp(PROTOCOL_RELEASE_FIXTURE_CASE_ID_PATTERN_SOURCE, 'u');
const CLASSIFICATIONS = Object.freeze([
  'structural-positive',
  'structural-negative',
  'semantic-positive',
  'semantic-negative',
  'boundary',
  'equality-order',
]);
const KINDS = Object.freeze(['value', 'equality', 'ordering']);
const BASE_FIELDS = Object.freeze(['id', 'kind', 'targetSchema', 'operation']);
const VALUE_FIELDS = Object.freeze(['value', 'structuralExpected', 'semanticExpected']);
const EQUALITY_FIELDS = Object.freeze(['values', 'equalExpected']);
const ORDERING_FIELDS = Object.freeze(['left', 'right', 'orderExpected']);
const GENERIC_SEMANTIC_FIELDS = Object.freeze(['semanticCheck', 'semanticInput']);

const STRUCTURAL_POSITIVE_TUPLE = Object.freeze({
  operation: 'structural-only',
  structuralExpected: 'pass',
  semanticExpected: 'not-applicable',
});
const STRUCTURAL_NEGATIVE_TUPLE = Object.freeze({
  operation: 'structural-only',
  structuralExpected: 'fail',
  semanticExpected: 'not-applicable',
});
const SEMANTIC_POSITIVE_TUPLE = Object.freeze({
  operation: 'validate',
  structuralExpected: 'pass',
  semanticExpected: 'pass',
});
const SEMANTIC_NEGATIVE_TUPLE = Object.freeze({
  operation: 'validate',
  structuralExpected: 'pass',
  semanticExpected: 'fail',
});
const VALUE_CLASSIFICATION_TUPLES = Object.freeze({
  'structural-positive': Object.freeze([STRUCTURAL_POSITIVE_TUPLE]),
  'structural-negative': Object.freeze([STRUCTURAL_NEGATIVE_TUPLE]),
  'semantic-positive': Object.freeze([SEMANTIC_POSITIVE_TUPLE]),
  'semantic-negative': Object.freeze([SEMANTIC_NEGATIVE_TUPLE]),
  boundary: Object.freeze([
    STRUCTURAL_POSITIVE_TUPLE,
    STRUCTURAL_NEGATIVE_TUPLE,
    SEMANTIC_POSITIVE_TUPLE,
    SEMANTIC_NEGATIVE_TUPLE,
  ]),
});

export const PROTOCOL_RELEASE_FIXTURE_DIAGNOSTICS = Object.freeze([
  'FND-PROTOCOL-RELEASE-FIXTURE-TARGET',
  'FND-PROTOCOL-RELEASE-FIXTURE-KIND',
  'FND-PROTOCOL-RELEASE-FIXTURE-EQUALITY-FIELDS',
  'FND-PROTOCOL-RELEASE-FIXTURE-ORDERING-FIELDS',
  'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
  'FND-PROTOCOL-RELEASE-FIXTURE-EXPECTED-RESULT',
  'FND-PROTOCOL-RELEASE-FIXTURE-SEMANTIC-FIELDS',
  'FND-PROTOCOL-RELEASE-FIXTURE-TARGET-KIND',
]);

export const PROTOCOL_RELEASE_FIXTURE_DIAGNOSTIC_PRECEDENCE = Object.freeze([
  'FND-PROTOCOL-RELEASE-FIXTURE-TARGET',
  'FND-PROTOCOL-RELEASE-FIXTURE-KIND',
  'FND-PROTOCOL-RELEASE-FIXTURE-EQUALITY-FIELDS',
  'FND-PROTOCOL-RELEASE-FIXTURE-ORDERING-FIELDS',
  'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
  'FND-PROTOCOL-RELEASE-FIXTURE-EXPECTED-RESULT',
  'FND-PROTOCOL-RELEASE-FIXTURE-SEMANTIC-FIELDS',
  'FND-PROTOCOL-RELEASE-FIXTURE-TARGET-KIND',
]);

export class ProtocolReleaseFixtureContractError extends Error {
  constructor(code, message, options = undefined) {
    super(`${code}: ${message}`, options);
    this.name = 'ProtocolReleaseFixtureContractError';
    this.code = code;
  }
}

function contractFail(code, message, options = undefined) {
  throw new ProtocolReleaseFixtureContractError(code, message, options);
}

function hasAnyOwn(value, keys) {
  return keys.some((key) => Object.hasOwn(value, key));
}

function assertRequiredFields(testCase, fields, code, label) {
  if (fields.some((field) => !Object.hasOwn(testCase, field))) {
    contractFail(code, `${label} is missing a required field: ${String(testCase.id)}`);
  }
}

function assertExactFields(testCase, allowedFields, code, label) {
  if (Object.keys(testCase).some((field) => !allowedFields.includes(field))) {
    contractFail(code, `${label} carries an unexpected field: ${String(testCase.id)}`);
  }
}

function assertValueClassificationCompatibility(classification, testCase) {
  const hasStructuralExpected = Object.hasOwn(testCase, 'structuralExpected');
  const hasSemanticExpected = Object.hasOwn(testCase, 'semanticExpected');
  const compatible = (VALUE_CLASSIFICATION_TUPLES[classification] ?? []).some(
    (tuple) =>
      tuple.operation === testCase.operation &&
      (!hasStructuralExpected || tuple.structuralExpected === testCase.structuralExpected) &&
      (!hasSemanticExpected || tuple.semanticExpected === testCase.semanticExpected),
  );
  if (!compatible) {
    contractFail(
      'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      `Value operation/result assignment is incompatible with ${classification}: ${String(testCase.id)}`,
    );
  }
}

function preflightProtocolReleaseOperands(testCase) {
  const operands =
    testCase.kind === 'equality'
      ? [
          ['values[0]', testCase.values[0]],
          ['values[1]', testCase.values[1]],
        ]
      : [
          ['left', testCase.left],
          ['right', testCase.right],
        ];
  const invalidOperands = [];
  for (const [label, operand] of operands) {
    try {
      parseProtocolRelease(operand);
    } catch (error) {
      if (!(error instanceof ProtocolReleaseValidationError)) throw error;
      invalidOperands.push({ error, label });
    }
  }
  if (invalidOperands.length > 0) {
    contractFail(
      'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      `Fixture carries an invalid ${testCase.kind} operand (${invalidOperands
        .map(({ label }) => label)
        .join(', ')}): ${String(testCase.id)}`,
      { cause: invalidOperands[0].error },
    );
  }
}

export function assertProtocolReleaseFixtureCaseContract({
  testCase,
  classification,
  knownSchemaIds,
}) {
  if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase)) {
    contractFail('FND-PROTOCOL-RELEASE-FIXTURE-KIND', 'Fixture case must be an object');
  }
  if (
    typeof testCase.targetSchema !== 'string' ||
    !UUID_V4_URN_PATTERN.test(testCase.targetSchema) ||
    !(knownSchemaIds instanceof Set) ||
    !knownSchemaIds.has(testCase.targetSchema)
  ) {
    contractFail(
      'FND-PROTOCOL-RELEASE-FIXTURE-TARGET',
      `Fixture target is malformed or unknown: ${String(testCase.targetSchema)}`,
    );
  }
  if (!KINDS.includes(testCase.kind)) {
    contractFail(
      'FND-PROTOCOL-RELEASE-FIXTURE-KIND',
      `Fixture kind is unknown: ${String(testCase.kind)}`,
    );
  }

  if (testCase.kind === 'value') {
    if (hasAnyOwn(testCase, EQUALITY_FIELDS)) {
      contractFail(
        'FND-PROTOCOL-RELEASE-FIXTURE-EQUALITY-FIELDS',
        `Value case carries equality-only fields: ${String(testCase.id)}`,
      );
    }
    if (hasAnyOwn(testCase, ORDERING_FIELDS)) {
      contractFail(
        'FND-PROTOCOL-RELEASE-FIXTURE-ORDERING-FIELDS',
        `Value case carries ordering fields: ${String(testCase.id)}`,
      );
    }
    assertRequiredFields(
      testCase,
      [...BASE_FIELDS, 'value'],
      'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      'Value case',
    );
    assertExactFields(
      testCase,
      [...BASE_FIELDS, ...VALUE_FIELDS, ...GENERIC_SEMANTIC_FIELDS],
      'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      'Value case',
    );
  } else if (testCase.kind === 'equality') {
    if (hasAnyOwn(testCase, [...ORDERING_FIELDS, ...VALUE_FIELDS])) {
      contractFail(
        'FND-PROTOCOL-RELEASE-FIXTURE-EQUALITY-FIELDS',
        `Equality case carries non-equality fields: ${String(testCase.id)}`,
      );
    }
    assertRequiredFields(
      testCase,
      [...BASE_FIELDS, 'values'],
      'FND-PROTOCOL-RELEASE-FIXTURE-EQUALITY-FIELDS',
      'Equality case',
    );
    assertExactFields(
      testCase,
      [...BASE_FIELDS, ...EQUALITY_FIELDS, ...GENERIC_SEMANTIC_FIELDS],
      'FND-PROTOCOL-RELEASE-FIXTURE-EQUALITY-FIELDS',
      'Equality case',
    );
  } else {
    if (hasAnyOwn(testCase, [...EQUALITY_FIELDS, ...VALUE_FIELDS])) {
      contractFail(
        'FND-PROTOCOL-RELEASE-FIXTURE-ORDERING-FIELDS',
        `Ordering case carries non-ordering fields: ${String(testCase.id)}`,
      );
    }
    assertRequiredFields(
      testCase,
      [...BASE_FIELDS, 'left', 'right'],
      'FND-PROTOCOL-RELEASE-FIXTURE-ORDERING-FIELDS',
      'Ordering case',
    );
    assertExactFields(
      testCase,
      [...BASE_FIELDS, ...ORDERING_FIELDS, ...GENERIC_SEMANTIC_FIELDS],
      'FND-PROTOCOL-RELEASE-FIXTURE-ORDERING-FIELDS',
      'Ordering case',
    );
  }

  if (!CLASSIFICATIONS.includes(classification)) {
    contractFail(
      'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      `Fixture classification is unknown: ${String(classification)}`,
    );
  }
  if (typeof testCase.id !== 'string' || !CASE_ID_PATTERN.test(testCase.id)) {
    contractFail(
      'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      `Fixture ID is malformed: ${String(testCase.id)}`,
    );
  }

  if (testCase.kind === 'value') {
    const hasStructuralExpected = Object.hasOwn(testCase, 'structuralExpected');
    const hasSemanticExpected = Object.hasOwn(testCase, 'semanticExpected');
    if (!['structural-only', 'validate'].includes(testCase.operation)) {
      contractFail(
        'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
        `Value case has an invalid operation/result shape: ${testCase.id}`,
      );
    }
    if (
      (hasStructuralExpected && !['pass', 'fail'].includes(testCase.structuralExpected)) ||
      (hasSemanticExpected &&
        !['pass', 'fail', 'not-applicable'].includes(testCase.semanticExpected))
    ) {
      contractFail(
        'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
        `Value case has an invalid operation/result shape: ${testCase.id}`,
      );
    }
    assertValueClassificationCompatibility(classification, testCase);
  } else if (testCase.kind === 'equality') {
    if (
      classification !== 'equality-order' ||
      testCase.operation !== 'exact-equality' ||
      !Array.isArray(testCase.values) ||
      testCase.values.length !== 2 ||
      (Object.hasOwn(testCase, 'equalExpected') && typeof testCase.equalExpected !== 'boolean')
    ) {
      contractFail(
        'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
        `Equality case has an invalid operation/result shape: ${testCase.id}`,
      );
    }
    preflightProtocolReleaseOperands(testCase);
  } else {
    if (
      classification !== 'equality-order' ||
      testCase.operation !== 'compare' ||
      (Object.hasOwn(testCase, 'orderExpected') &&
        !['LESS', 'EQUAL', 'GREATER'].includes(testCase.orderExpected))
    ) {
      contractFail(
        'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
        `Ordering case has an invalid operation/result shape: ${testCase.id}`,
      );
    }
    preflightProtocolReleaseOperands(testCase);
  }

  if (testCase.kind === 'value') {
    assertRequiredFields(
      testCase,
      ['structuralExpected', 'semanticExpected'],
      'FND-PROTOCOL-RELEASE-FIXTURE-EXPECTED-RESULT',
      'Value case',
    );
  } else if (testCase.kind === 'equality') {
    assertRequiredFields(
      testCase,
      ['equalExpected'],
      'FND-PROTOCOL-RELEASE-FIXTURE-EXPECTED-RESULT',
      'Equality case',
    );
  } else {
    assertRequiredFields(
      testCase,
      ['orderExpected'],
      'FND-PROTOCOL-RELEASE-FIXTURE-EXPECTED-RESULT',
      'Ordering case',
    );
  }

  if (hasAnyOwn(testCase, GENERIC_SEMANTIC_FIELDS)) {
    contractFail(
      'FND-PROTOCOL-RELEASE-FIXTURE-SEMANTIC-FIELDS',
      `Fixture carries a generic semantic field: ${String(testCase.id)}`,
    );
  }

  if (testCase.targetSchema !== PROTOCOL_RELEASE_SCHEMA_ID) {
    contractFail(
      'FND-PROTOCOL-RELEASE-FIXTURE-TARGET-KIND',
      `Fixture kind is unsupported for known target: ${testCase.kind}/${testCase.targetSchema}`,
    );
  }

  return Object.freeze({ kind: testCase.kind });
}

function assertCorpusContract(entry, corpus) {
  if (!corpus || typeof corpus !== 'object' || Array.isArray(corpus)) {
    fail(`ProtocolRelease fixture corpus was not loaded: ${entry.path}`);
  }
  if (
    corpus.fixtureSchema !== PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID ||
    corpus.protocolRelease !== PROTOCOL_RELEASE ||
    !Array.isArray(corpus.cases)
  ) {
    fail(`ProtocolRelease fixture corpus metadata is invalid: ${entry.path}`);
  }
  const filenameClassification = path.posix.basename(entry.path, '.json');
  if (corpus.classification !== filenameClassification) {
    fail(`ProtocolRelease fixture classification/path mismatch: ${entry.path}`);
  }
}

function runValueCase(testCase, validateTarget, errorsText) {
  const structuralPass = validateTarget(testCase.value) === true;
  const expectedStructuralPass = testCase.structuralExpected === 'pass';
  if (structuralPass !== expectedStructuralPass) {
    fail(
      `ProtocolRelease structural expectation mismatch for ${testCase.id}: expected=${testCase.structuralExpected} actual=${structuralPass ? 'pass' : 'fail'}; ${errorsText()}`,
    );
  }
  if (testCase.operation === 'structural-only') return { semanticExecutions: 0 };

  const semanticPass = isProtocolRelease(testCase.value);
  const expectedSemanticPass = testCase.semanticExpected === 'pass';
  if (semanticPass !== expectedSemanticPass) {
    fail(
      `ProtocolRelease semantic expectation mismatch for ${testCase.id}: expected=${testCase.semanticExpected} actual=${semanticPass ? 'pass' : 'fail'}`,
    );
  }
  return { semanticExecutions: 1 };
}

export function runEqualityCase(testCase) {
  let actual;
  try {
    actual = protocolReleasesEqual(testCase.values[0], testCase.values[1]);
  } catch (error) {
    if (error instanceof ProtocolReleaseValidationError) {
      fail(`ProtocolRelease equality operand changed after complete preflight: ${testCase.id}`, {
        cause: error,
      });
    }
    throw error;
  }
  if (actual !== testCase.equalExpected) {
    fail(
      `ProtocolRelease equality expectation mismatch for ${testCase.id}: expected=${testCase.equalExpected} actual=${actual}`,
    );
  }
  return { equalityExecutions: 1, semanticExecutions: 1 };
}

export function runOrderingCase(testCase) {
  let actual;
  try {
    actual = compareProtocolReleases(testCase.left, testCase.right);
  } catch (error) {
    if (error instanceof ProtocolReleaseValidationError) {
      fail(`ProtocolRelease ordering operand changed after complete preflight: ${testCase.id}`, {
        cause: error,
      });
    }
    throw error;
  }
  if (actual !== testCase.orderExpected) {
    fail(
      `ProtocolRelease ordering expectation mismatch for ${testCase.id}: expected=${testCase.orderExpected} actual=${actual}`,
    );
  }
  return { comparatorExecutions: 1, semanticExecutions: 1 };
}

export function runProtocolReleaseFixtures({ manifest, assets, ajv }) {
  const entries = manifest.fixtures
    .filter((entry) => entry.schemaId === PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID)
    .toSorted((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  if (entries.length !== CLASSIFICATIONS.length) {
    fail(
      `ProtocolRelease fixture corpus count mismatch: expected=${CLASSIFICATIONS.length} actual=${entries.length}`,
    );
  }

  const knownSchemaIds = new Set(manifest.schemas.map((entry) => entry.schemaId));
  const prepared = [];
  const classifications = new Set();
  const fixtureIds = new Set();

  for (const entry of entries) {
    const corpus = assets.get(entry.path);
    assertCorpusContract(entry, corpus);
    if (classifications.has(corpus.classification)) {
      fail(`Duplicate ProtocolRelease fixture classification: ${corpus.classification}`);
    }
    classifications.add(corpus.classification);

    for (const testCase of corpus.cases) {
      if (fixtureIds.has(testCase?.id)) {
        fail(`Duplicate ProtocolRelease fixture ID: ${String(testCase?.id)}`);
      }
      assertProtocolReleaseFixtureCaseContract({
        testCase,
        classification: corpus.classification,
        knownSchemaIds,
      });
      const validateTarget = ajv.getSchema(testCase.targetSchema);
      if (!validateTarget) {
        fail(`ProtocolRelease fixture target schema is not preloaded: ${testCase.targetSchema}`);
      }
      fixtureIds.add(testCase.id);
      prepared.push({ corpus, entry, testCase, validateTarget });
    }
  }
  if (CLASSIFICATIONS.some((classification) => !classifications.has(classification))) {
    fail('ProtocolRelease fixture classification set is incomplete');
  }

  const fixtureCounts = new Map();
  const fixtureTargetSchemaIds = new Set();
  const processedFixturePaths = new Set();
  const namedProofs = new Set();
  let comparatorCount = 0;
  let equalityCount = 0;
  let fixtureCount = 0;
  let semanticCount = 0;

  for (const entry of entries) {
    const corpusCases = prepared.filter((item) => item.entry.path === entry.path);
    for (const { corpus, testCase, validateTarget } of corpusCases) {
      let result;
      if (testCase.kind === 'value') {
        result = runValueCase(testCase, validateTarget, () =>
          ajv.errorsText(validateTarget.errors),
        );
      } else if (testCase.kind === 'equality') {
        result = runEqualityCase(testCase);
      } else {
        result = runOrderingCase(testCase);
      }
      fixtureCount += 1;
      semanticCount += result.semanticExecutions ?? 0;
      equalityCount += result.equalityExecutions ?? 0;
      comparatorCount += result.comparatorExecutions ?? 0;
      fixtureTargetSchemaIds.add(testCase.targetSchema);
      if (corpus.classification !== path.posix.basename(entry.path, '.json')) {
        fail(`ProtocolRelease fixture classification changed during execution: ${entry.path}`);
      }
    }
    const corpus = assets.get(entry.path);
    fixtureCounts.set(corpus.classification, corpus.cases.length);
    processedFixturePaths.add(entry.path);
  }

  namedProofs.add('PROTOCOL_RELEASE_FIXTURE_CONTRACT_EXECUTED');
  namedProofs.add('PROTOCOL_RELEASE_LITERAL_ORACLES_EXECUTED');
  if (
    fixtureTargetSchemaIds.size !== 1 ||
    !fixtureTargetSchemaIds.has(PROTOCOL_RELEASE_SCHEMA_ID)
  ) {
    fail('ProtocolRelease fixture target coverage is not exact');
  }
  namedProofs.add('PROTOCOL_RELEASE_TARGET_COVERAGE_EXECUTED');

  return {
    comparatorCount,
    equalityCount,
    fixtureCount,
    fixtureCounts,
    fixtureTargetSchemaIds,
    namedProofs,
    processedFixturePaths,
    semanticCount,
  };
}
