import {
  PROTOCOL_RELEASE_FIXTURE_CASE_ID_PATTERN_SOURCE,
  PROTOCOL_RELEASE_FIXTURE_DIAGNOSTIC_PRECEDENCE,
  PROTOCOL_RELEASE_FIXTURE_DIAGNOSTICS,
  PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID,
  PROTOCOL_RELEASE_SCHEMA_ID,
  ProtocolReleaseFixtureContractError,
  assertProtocolReleaseFixtureCaseContract,
  runEqualityCase,
  runOrderingCase,
} from './protocol-release-fixture-runner.mjs';
import { FoundationValidationError } from './errors.mjs';
import {
  PROTOCOL_RELEASE_MAXIMUM_COMPONENT,
  PROTOCOL_RELEASE_MAXIMUM_LENGTH,
  PROTOCOL_RELEASE_ORDER_RESULTS,
  PROTOCOL_RELEASE_STAGE_RANK,
  ProtocolReleaseValidationError,
  compareProtocolReleases,
  isProtocolRelease,
  parseProtocolRelease,
  protocolReleasesEqual,
} from './protocol-release.mjs';

const VALID_RELEASE = 'ghostbridge/e1.r0-draft.1';
const MISSING_EXPECTED_RESULT = 'MISSING';
const VALUE_CLASSIFICATION_ORACLE = Object.freeze({
  'structural-positive': Object.freeze([
    Object.freeze(['structural-only', 'pass', 'not-applicable']),
  ]),
  'structural-negative': Object.freeze([
    Object.freeze(['structural-only', 'fail', 'not-applicable']),
  ]),
  'semantic-positive': Object.freeze([Object.freeze(['validate', 'pass', 'pass'])]),
  'semantic-negative': Object.freeze([Object.freeze(['validate', 'pass', 'fail'])]),
  boundary: Object.freeze([
    Object.freeze(['structural-only', 'pass', 'not-applicable']),
    Object.freeze(['structural-only', 'fail', 'not-applicable']),
    Object.freeze(['validate', 'pass', 'pass']),
    Object.freeze(['validate', 'pass', 'fail']),
  ]),
});

function validationErrorCode(operation) {
  try {
    operation();
  } catch (error) {
    if (error instanceof ProtocolReleaseValidationError) return error.code;
    throw error;
  }
  return undefined;
}

function fixtureDiagnostic(operation) {
  try {
    operation();
  } catch (error) {
    if (error instanceof ProtocolReleaseFixtureContractError) return error.code;
    throw error;
  }
  return undefined;
}

function captureError(operation) {
  try {
    operation();
  } catch (error) {
    return error;
  }
  return undefined;
}

function reverseOrder(result) {
  if (result === 'LESS') return 'GREATER';
  if (result === 'GREATER') return 'LESS';
  return 'EQUAL';
}

function selectGreatest(values) {
  let greatest = values[0];
  for (let index = 1; index < values.length; index += 1) {
    if (compareProtocolReleases(greatest, values[index]) === 'LESS') greatest = values[index];
  }
  return greatest;
}

export function runProtocolReleaseSelfTests({ schemas, manifest, fixtureCorpusValidator }) {
  let count = 0;
  const namedProofs = new Set();
  const diagnosticResults = [];
  const expect = (condition, label) => {
    count += 1;
    if (!condition) throw new Error(`ProtocolRelease self-test failed: ${label}`);
  };

  const knownSchemaIds = new Set(manifest.schemas.map((entry) => entry.schemaId));
  expect(schemas.get(PROTOCOL_RELEASE_SCHEMA_ID)?.$id === PROTOCOL_RELEASE_SCHEMA_ID, 'schema ID');
  expect(
    schemas.get(PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID)?.$id === PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID,
    'fixture schema ID',
  );
  expect(knownSchemaIds.has(PROTOCOL_RELEASE_SCHEMA_ID), 'manifest primitive binding');
  expect(knownSchemaIds.has(PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID), 'manifest fixture binding');

  const seed = (expectedDiagnostic, testCase, classification) => {
    const actual = fixtureDiagnostic(() =>
      assertProtocolReleaseFixtureCaseContract({ testCase, classification, knownSchemaIds }),
    );
    expect(actual === expectedDiagnostic, `seed diagnostic ${expectedDiagnostic}`);
    diagnosticResults.push(Object.freeze({ diagnostic: expectedDiagnostic, result: 'PASS' }));
  };
  const baseValueCase = Object.freeze({
    id: 'FND-PROTOCOL-RELEASE-SEED-BASE',
    kind: 'value',
    targetSchema: PROTOCOL_RELEASE_SCHEMA_ID,
    operation: 'validate',
    value: VALID_RELEASE,
    structuralExpected: 'pass',
    semanticExpected: 'pass',
  });
  seed(
    'FND-PROTOCOL-RELEASE-FIXTURE-TARGET',
    { ...baseValueCase, targetSchema: 'urn:uuid:ffffffff-ffff-4fff-8fff-ffffffffffff' },
    'semantic-positive',
  );
  seed(
    'FND-PROTOCOL-RELEASE-FIXTURE-KIND',
    {
      id: 'FND-PROTOCOL-RELEASE-SEED-KIND',
      kind: 'unknown',
      targetSchema: PROTOCOL_RELEASE_SCHEMA_ID,
      operation: 'validate',
    },
    'semantic-positive',
  );
  seed(
    'FND-PROTOCOL-RELEASE-FIXTURE-EQUALITY-FIELDS',
    {
      id: 'FND-PROTOCOL-RELEASE-SEED-EQUALITY-FIELDS',
      kind: 'equality',
      targetSchema: PROTOCOL_RELEASE_SCHEMA_ID,
      operation: 'exact-equality',
      values: [VALID_RELEASE, VALID_RELEASE],
      equalExpected: true,
      left: VALID_RELEASE,
      right: VALID_RELEASE,
      orderExpected: 'EQUAL',
    },
    'equality-order',
  );
  seed(
    'FND-PROTOCOL-RELEASE-FIXTURE-ORDERING-FIELDS',
    {
      id: 'FND-PROTOCOL-RELEASE-SEED-ORDERING-FIELDS',
      kind: 'ordering',
      targetSchema: PROTOCOL_RELEASE_SCHEMA_ID,
      operation: 'compare',
      left: VALID_RELEASE,
      right: VALID_RELEASE,
      orderExpected: 'EQUAL',
      values: [VALID_RELEASE, VALID_RELEASE],
      equalExpected: true,
    },
    'equality-order',
  );
  seed(
    'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
    {
      ...baseValueCase,
      id: 'FND-PROTOCOL-RELEASE-SEED-ILLEGAL-EXECUTION',
      operation: 'validate',
      value: 'ghostbridge/e01.r0',
      structuralExpected: 'fail',
      semanticExpected: 'not-applicable',
    },
    'structural-negative',
  );
  const { semanticExpected: omittedExpected, ...missingExpectedCase } = baseValueCase;
  expect(omittedExpected === 'pass', 'seed expected-result construction');
  seed(
    'FND-PROTOCOL-RELEASE-FIXTURE-EXPECTED-RESULT',
    { ...missingExpectedCase, id: 'FND-PROTOCOL-RELEASE-SEED-EXPECTED-RESULT' },
    'semantic-positive',
  );
  seed(
    'FND-PROTOCOL-RELEASE-FIXTURE-SEMANTIC-FIELDS',
    {
      ...baseValueCase,
      id: 'FND-PROTOCOL-RELEASE-SEED-SEMANTIC-FIELDS',
      semanticCheck: 'none',
    },
    'semantic-positive',
  );
  seed(
    'FND-PROTOCOL-RELEASE-FIXTURE-TARGET-KIND',
    {
      ...baseValueCase,
      id: 'FND-PROTOCOL-RELEASE-SEED-TARGET-KIND',
      targetSchema: PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID,
    },
    'semantic-positive',
  );
  expect(
    diagnosticResults.length === PROTOCOL_RELEASE_FIXTURE_DIAGNOSTICS.length &&
      PROTOCOL_RELEASE_FIXTURE_DIAGNOSTICS.every(
        (diagnostic, index) => diagnosticResults[index].diagnostic === diagnostic,
      ),
    'complete ordered seeded diagnostic set',
  );

  const expectedDiagnosticPrecedence = Object.freeze([
    'FND-PROTOCOL-RELEASE-FIXTURE-TARGET',
    'FND-PROTOCOL-RELEASE-FIXTURE-KIND',
    'FND-PROTOCOL-RELEASE-FIXTURE-EQUALITY-FIELDS',
    'FND-PROTOCOL-RELEASE-FIXTURE-ORDERING-FIELDS',
    'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
    'FND-PROTOCOL-RELEASE-FIXTURE-EXPECTED-RESULT',
    'FND-PROTOCOL-RELEASE-FIXTURE-SEMANTIC-FIELDS',
    'FND-PROTOCOL-RELEASE-FIXTURE-TARGET-KIND',
  ]);
  expect(
    JSON.stringify(PROTOCOL_RELEASE_FIXTURE_DIAGNOSTIC_PRECEDENCE) ===
      JSON.stringify(expectedDiagnosticPrecedence),
    'explicit fixture diagnostic precedence declaration',
  );

  const overlappingDiagnosticCases = Object.freeze([
    Object.freeze({
      expected: 'FND-PROTOCOL-RELEASE-FIXTURE-TARGET',
      label: 'target precedes kind and semantic fields',
      classification: 'semantic-positive',
      testCase: {
        ...baseValueCase,
        id: 'FND-PROTOCOL-RELEASE-PRECEDENCE-TARGET',
        targetSchema: 'urn:uuid:ffffffff-ffff-4fff-8fff-ffffffffffff',
        kind: 'unknown',
        semanticCheck: 'none',
      },
    }),
    Object.freeze({
      expected: 'FND-PROTOCOL-RELEASE-FIXTURE-KIND',
      label: 'kind precedes semantic fields',
      classification: 'semantic-positive',
      testCase: {
        ...baseValueCase,
        id: 'FND-PROTOCOL-RELEASE-PRECEDENCE-KIND',
        kind: 'unknown',
        semanticCheck: 'none',
      },
    }),
    Object.freeze({
      expected: 'FND-PROTOCOL-RELEASE-FIXTURE-EQUALITY-FIELDS',
      label: 'equality fields precede ordering and later diagnostics',
      classification: 'semantic-positive',
      testCase: {
        ...baseValueCase,
        id: 'FND-PROTOCOL-RELEASE-PRECEDENCE-EQUALITY',
        targetSchema: PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID,
        values: [VALID_RELEASE, VALID_RELEASE],
        equalExpected: true,
        left: VALID_RELEASE,
        right: VALID_RELEASE,
        orderExpected: 'EQUAL',
        semanticCheck: 'none',
      },
    }),
    Object.freeze({
      expected: 'FND-PROTOCOL-RELEASE-FIXTURE-ORDERING-FIELDS',
      label: 'ordering fields precede later diagnostics',
      classification: 'semantic-positive',
      testCase: {
        ...baseValueCase,
        id: 'FND-PROTOCOL-RELEASE-PRECEDENCE-ORDERING',
        targetSchema: PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID,
        left: VALID_RELEASE,
        right: VALID_RELEASE,
        orderExpected: 'EQUAL',
        semanticCheck: 'none',
      },
    }),
    Object.freeze({
      expected: 'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      label: 'illegal execution precedes expected semantic and target-kind diagnostics',
      classification: 'semantic-positive',
      testCase: {
        id: 'FND-PROTOCOL-RELEASE-PRECEDENCE-ILLEGAL',
        kind: 'value',
        targetSchema: PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID,
        operation: 'invalid',
        value: VALID_RELEASE,
        structuralExpected: 'pass',
        semanticCheck: 'none',
      },
    }),
    Object.freeze({
      expected: 'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      label: 'invalid supplied structural result precedes missing semantic result',
      classification: 'semantic-positive',
      testCase: {
        id: 'FND-PROTOCOL-RELEASE-PRECEDENCE-PARTIAL-STRUCTURAL',
        kind: 'value',
        targetSchema: PROTOCOL_RELEASE_SCHEMA_ID,
        operation: 'validate',
        value: VALID_RELEASE,
        structuralExpected: 'INVALID-VALUE',
      },
    }),
    Object.freeze({
      expected: 'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      label: 'invalid supplied semantic result precedes missing structural result',
      classification: 'semantic-positive',
      testCase: {
        id: 'FND-PROTOCOL-RELEASE-PRECEDENCE-PARTIAL-SEMANTIC',
        kind: 'value',
        targetSchema: PROTOCOL_RELEASE_SCHEMA_ID,
        operation: 'validate',
        value: VALID_RELEASE,
        semanticExpected: 'INVALID-VALUE',
      },
    }),
    Object.freeze({
      expected: 'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      label: 'structural-positive rejects partial validate assignment',
      classification: 'structural-positive',
      testCase: {
        id: 'FND-PROTOCOL-RELEASE-PRECEDENCE-CLASS-STRUCTURAL-OPERATION',
        kind: 'value',
        targetSchema: PROTOCOL_RELEASE_SCHEMA_ID,
        operation: 'validate',
        value: VALID_RELEASE,
        structuralExpected: 'pass',
      },
    }),
    Object.freeze({
      expected: 'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      label: 'structural-positive rejects partial semantic pass assignment',
      classification: 'structural-positive',
      testCase: {
        id: 'FND-PROTOCOL-RELEASE-PRECEDENCE-CLASS-STRUCTURAL-SEMANTIC',
        kind: 'value',
        targetSchema: PROTOCOL_RELEASE_SCHEMA_ID,
        operation: 'structural-only',
        value: VALID_RELEASE,
        semanticExpected: 'pass',
      },
    }),
    Object.freeze({
      expected: 'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      label: 'semantic-positive rejects partial semantic fail assignment',
      classification: 'semantic-positive',
      testCase: {
        id: 'FND-PROTOCOL-RELEASE-PRECEDENCE-CLASS-SEMANTIC-RESULT',
        kind: 'value',
        targetSchema: PROTOCOL_RELEASE_SCHEMA_ID,
        operation: 'validate',
        value: VALID_RELEASE,
        semanticExpected: 'fail',
      },
    }),
    Object.freeze({
      expected: 'FND-PROTOCOL-RELEASE-FIXTURE-EXPECTED-RESULT',
      label: 'expected result precedes semantic fields and target kind',
      classification: 'semantic-positive',
      testCase: {
        id: 'FND-PROTOCOL-RELEASE-PRECEDENCE-EXPECTED',
        kind: 'value',
        targetSchema: PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID,
        operation: 'validate',
        value: VALID_RELEASE,
        structuralExpected: 'pass',
        semanticCheck: 'none',
      },
    }),
    Object.freeze({
      expected: 'FND-PROTOCOL-RELEASE-FIXTURE-SEMANTIC-FIELDS',
      label: 'semantic fields precede target kind',
      classification: 'semantic-positive',
      testCase: {
        ...baseValueCase,
        id: 'FND-PROTOCOL-RELEASE-PRECEDENCE-SEMANTIC',
        targetSchema: PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID,
        semanticCheck: 'none',
      },
    }),
  ]);
  for (const { classification, expected, label, testCase } of overlappingDiagnosticCases) {
    expect(
      fixtureDiagnostic(() =>
        assertProtocolReleaseFixtureCaseContract({ testCase, classification, knownSchemaIds }),
      ) === expected,
      `overlapping diagnostic precedence: ${label}`,
    );
  }

  const matrixClassifications = Object.freeze([
    'structural-positive',
    'structural-negative',
    'semantic-positive',
    'semantic-negative',
    'boundary',
  ]);
  const matrixOperations = Object.freeze(['structural-only', 'validate']);
  const matrixStructuralStates = Object.freeze([MISSING_EXPECTED_RESULT, 'pass', 'fail']);
  const matrixSemanticStates = Object.freeze([
    MISSING_EXPECTED_RESULT,
    'pass',
    'fail',
    'not-applicable',
  ]);
  const expectedMatrixCounts = { EXPECTED: 0, ILLEGAL: 0, PASS: 0 };
  const actualMatrixCounts = { EXPECTED: 0, ILLEGAL: 0, PASS: 0 };
  let expectedPartialIllegalCount = 0;
  let actualPartialIllegalCount = 0;
  let matrixTotal = 0;

  for (const classification of matrixClassifications) {
    for (const operation of matrixOperations) {
      for (const structuralState of matrixStructuralStates) {
        for (const semanticState of matrixSemanticStates) {
          const partial =
            structuralState === MISSING_EXPECTED_RESULT ||
            semanticState === MISSING_EXPECTED_RESULT;
          const compatible = VALUE_CLASSIFICATION_ORACLE[classification].some(
            ([tupleOperation, tupleStructural, tupleSemantic]) =>
              tupleOperation === operation &&
              (structuralState === MISSING_EXPECTED_RESULT ||
                tupleStructural === structuralState) &&
              (semanticState === MISSING_EXPECTED_RESULT || tupleSemantic === semanticState),
          );
          const expected = !compatible ? 'ILLEGAL' : partial ? 'EXPECTED' : 'PASS';
          expectedMatrixCounts[expected] += 1;
          if (partial && expected === 'ILLEGAL') expectedPartialIllegalCount += 1;

          const testCase = {
            id: `FND-PROTOCOL-RELEASE-MATRIX-${String(matrixTotal).padStart(3, '0')}`,
            kind: 'value',
            targetSchema: PROTOCOL_RELEASE_SCHEMA_ID,
            operation,
            value: VALID_RELEASE,
          };
          if (structuralState !== MISSING_EXPECTED_RESULT) {
            testCase.structuralExpected = structuralState;
          }
          if (semanticState !== MISSING_EXPECTED_RESULT) {
            testCase.semanticExpected = semanticState;
          }

          const diagnostic = fixtureDiagnostic(() =>
            assertProtocolReleaseFixtureCaseContract({
              testCase,
              classification,
              knownSchemaIds,
            }),
          );
          const actual =
            diagnostic === undefined
              ? 'PASS'
              : diagnostic === 'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION'
                ? 'ILLEGAL'
                : diagnostic === 'FND-PROTOCOL-RELEASE-FIXTURE-EXPECTED-RESULT'
                  ? 'EXPECTED'
                  : diagnostic;
          if (Object.hasOwn(actualMatrixCounts, actual)) actualMatrixCounts[actual] += 1;
          if (partial && actual === 'ILLEGAL') actualPartialIllegalCount += 1;
          expect(
            actual === expected,
            `classification matrix ${classification}/${operation}/${structuralState}/${semanticState}: expected=${expected} actual=${actual}`,
          );
          matrixTotal += 1;
        }
      }
    }
  }
  expect(matrixTotal === 120, 'classification matrix total 120');
  expect(
    expectedMatrixCounts.ILLEGAL === 92 &&
      expectedMatrixCounts.EXPECTED === 20 &&
      expectedMatrixCounts.PASS === 8,
    'independent classification matrix oracle distribution 92/20/8',
  );
  expect(
    actualMatrixCounts.ILLEGAL === 92 &&
      actualMatrixCounts.EXPECTED === 20 &&
      actualMatrixCounts.PASS === 8,
    'executed classification matrix distribution 92/20/8',
  );
  expect(expectedPartialIllegalCount === 40, 'oracle partial incompatible count 40');
  expect(actualPartialIllegalCount === 40, 'executed partial incompatible count 40');

  const caseIdSchemaPattern = schemas.get(PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID)?.$defs?.caseId
    ?.pattern;
  expect(
    caseIdSchemaPattern === PROTOCOL_RELEASE_FIXTURE_CASE_ID_PATTERN_SOURCE,
    'schema and runtime fixture case-ID patterns are identical',
  );
  expect(typeof fixtureCorpusValidator === 'function', 'compiled fixture corpus validator binding');
  const schemaCaseIdPattern = new RegExp(caseIdSchemaPattern, 'u');
  expect(schemaCaseIdPattern.test(baseValueCase.id), 'valid fixture case ID remains accepted');
  const syntheticFixtureCorpus = (id) => ({
    fixtureSchema: PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID,
    protocolRelease: VALID_RELEASE,
    classification: 'semantic-positive',
    cases: [{ ...baseValueCase, id }],
  });
  expect(
    fixtureCorpusValidator(syntheticFixtureCorpus(baseValueCase.id)) === true,
    'compiled fixture corpus validator accepts a valid synthetic case',
  );
  const hostileCaseIds = Object.freeze([
    'FND-PROTOCOL-RELEASE-X\n',
    'FND-PROTOCOL-RELEASE-X\r',
    'FND-PROTOCOL-RELEASE-X\r\n',
    'FND-PROTOCOL-RELEASE-X/trailing',
  ]);
  for (const hostileCaseId of hostileCaseIds) {
    expect(
      fixtureCorpusValidator(syntheticFixtureCorpus(hostileCaseId)) === false,
      `compiled fixture corpus rejects hostile case ID ${JSON.stringify(hostileCaseId)}`,
    );
    expect(
      !schemaCaseIdPattern.test(hostileCaseId),
      `schema fixture case-ID full-string rejection ${JSON.stringify(hostileCaseId)}`,
    );
    expect(
      fixtureDiagnostic(() =>
        assertProtocolReleaseFixtureCaseContract({
          testCase: { ...baseValueCase, id: hostileCaseId },
          classification: 'semantic-positive',
          knownSchemaIds,
        }),
      ) === 'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
      `runtime fixture case-ID full-string rejection ${JSON.stringify(hostileCaseId)}`,
    );
  }

  const invalidEqualityPreflight = captureError(() =>
    assertProtocolReleaseFixtureCaseContract({
      testCase: {
        id: 'FND-PROTOCOL-RELEASE-PREFLIGHT-EQUALITY',
        kind: 'equality',
        targetSchema: PROTOCOL_RELEASE_SCHEMA_ID,
        operation: 'exact-equality',
        values: ['ghostbridge/e01.r0', 'ghostbridge/e2147483648.r0'],
        equalExpected: false,
      },
      classification: 'equality-order',
      knownSchemaIds,
    }),
  );
  expect(
    invalidEqualityPreflight instanceof ProtocolReleaseFixtureContractError &&
      invalidEqualityPreflight.code === 'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
    'invalid equality operands reject in fixture preflight',
  );
  expect(
    invalidEqualityPreflight.message.includes('values[0], values[1]'),
    'both equality operands independently complete fixture preflight',
  );
  expect(
    invalidEqualityPreflight.cause instanceof ProtocolReleaseValidationError,
    'equality operand preflight preserves validation cause',
  );

  const invalidOrderingPreflight = captureError(() =>
    assertProtocolReleaseFixtureCaseContract({
      testCase: {
        id: 'FND-PROTOCOL-RELEASE-PREFLIGHT-ORDERING',
        kind: 'ordering',
        targetSchema: PROTOCOL_RELEASE_SCHEMA_ID,
        operation: 'compare',
        left: 'ghostbridge/0.1-draft',
        right: null,
        orderExpected: 'LESS',
      },
      classification: 'equality-order',
      knownSchemaIds,
    }),
  );
  expect(
    invalidOrderingPreflight instanceof ProtocolReleaseFixtureContractError &&
      invalidOrderingPreflight.code === 'FND-PROTOCOL-RELEASE-FIXTURE-ILLEGAL-EXECUTION',
    'invalid ordering operands reject in fixture preflight',
  );
  expect(
    invalidOrderingPreflight.message.includes('left, right'),
    'both ordering operands independently complete fixture preflight',
  );
  expect(
    invalidOrderingPreflight.cause instanceof ProtocolReleaseValidationError,
    'ordering operand preflight preserves validation cause',
  );
  namedProofs.add('PROTOCOL_RELEASE_SEEDED_DIAGNOSTICS_EXECUTED');

  const maximumIdentity = 'ghostbridge/e2147483647.r2147483647-experimental.2147483647';
  expect(PROTOCOL_RELEASE_MAXIMUM_COMPONENT === 2_147_483_647, 'maximum component constant');
  expect(PROTOCOL_RELEASE_MAXIMUM_LENGTH === 59, 'maximum length constant');
  expect(maximumIdentity.length === 59, 'maximum identity character length');
  expect(new TextEncoder().encode(maximumIdentity).length === 59, 'maximum identity UTF-8 length');
  const parsedMaximum = parseProtocolRelease(maximumIdentity);
  expect(parsedMaximum.epoch === 2_147_483_647, 'maximum epoch exactness');
  expect(parsedMaximum.revision === 2_147_483_647, 'maximum revision exactness');
  expect(parsedMaximum.iteration === 2_147_483_647, 'maximum iteration exactness');
  expect(parsedMaximum.stage === 'experimental', 'maximum identity stage');

  const validBoundaryValues = [
    'ghostbridge/e0.r1-draft.1',
    'ghostbridge/e1.r0-draft.1',
    'ghostbridge/e2147483647.r0-draft.1',
    'ghostbridge/e0.r2147483647-draft.1',
    'ghostbridge/e0.r1-draft.0',
    'ghostbridge/e0.r1-draft.2147483647',
    maximumIdentity,
  ];
  for (const value of validBoundaryValues)
    expect(isProtocolRelease(value), `valid boundary ${value}`);

  const rangeFailureValues = [
    'ghostbridge/e2147483648.r0',
    'ghostbridge/e2147483649.r0',
    'ghostbridge/e9999999999.r0',
    'ghostbridge/e0.r2147483648',
    'ghostbridge/e0.r2147483649',
    'ghostbridge/e0.r9999999999',
    'ghostbridge/e0.r0-draft.2147483648',
    'ghostbridge/e0.r0-draft.2147483649',
    'ghostbridge/e0.r0-draft.9999999999',
  ];
  for (const value of rangeFailureValues) {
    expect(
      validationErrorCode(() => parseProtocolRelease(value)) === 'FND-PROTOCOL-RELEASE-RANGE',
      `range rejection ${value}`,
    );
  }
  const lexicalFailureValues = [
    'ghostbridge/e10000000000.r0',
    'ghostbridge/e0.r10000000000',
    'ghostbridge/e0.r0-draft.10000000000',
    'ghostbridge/0.1-draft',
    'ghostbridge/e1.r0-draft.1\n',
    'ghostbridge/e1.r0-draft.1\r',
    'ghostbridge/e1.r0-draft.1\r\n',
  ];
  for (const value of lexicalFailureValues) {
    expect(!isProtocolRelease(value), `lexical rejection ${JSON.stringify(value)}`);
  }

  const hostileNonString = new Proxy(
    {},
    {
      get() {
        throw new Error('non-string input was processed');
      },
    },
  );
  expect(!isProtocolRelease(hostileNonString), 'non-string rejects before property access');
  expect(
    validationErrorCode(() => parseProtocolRelease(hostileNonString)) ===
      'FND-PROTOCOL-RELEASE-TYPE',
    'non-string type diagnostic',
  );

  const overlength = `${maximumIdentity}x`;
  let regexExecutions = 0;
  const originalRegExpExec = RegExp.prototype.exec;
  RegExp.prototype.exec = function instrumentedRegExpExec(...args) {
    regexExecutions += 1;
    return Reflect.apply(originalRegExpExec, this, args);
  };
  try {
    expect(
      validationErrorCode(() => parseProtocolRelease(overlength)) === 'FND-PROTOCOL-RELEASE-LENGTH',
      'overlength diagnostic',
    );
    expect(regexExecutions === 0, 'overlength rejects before regex execution');
  } finally {
    RegExp.prototype.exec = originalRegExpExec;
  }
  namedProofs.add('PROTOCOL_RELEASE_VALIDATION_BOUNDARIES_EXECUTED');

  expect(protocolReleasesEqual(VALID_RELEASE, VALID_RELEASE), 'valid exact equality');
  expect(
    !protocolReleasesEqual(VALID_RELEASE, 'ghostbridge/e1.r0-draft.2'),
    'valid exact inequality',
  );
  expect(
    validationErrorCode(() => protocolReleasesEqual('ghostbridge/e01.r0', VALID_RELEASE)) ===
      'FND-PROTOCOL-RELEASE-LEXICAL',
    'equality invalid left rejection',
  );
  expect(
    validationErrorCode(() =>
      protocolReleasesEqual(VALID_RELEASE, 'ghostbridge/e2147483648.r0'),
    ) === 'FND-PROTOCOL-RELEASE-RANGE',
    'equality invalid right rejection',
  );
  expect(
    validationErrorCode(() => compareProtocolReleases('ghostbridge/0.1-draft', VALID_RELEASE)) ===
      'FND-PROTOCOL-RELEASE-LEXICAL',
    'ordering invalid left rejection',
  );
  expect(
    validationErrorCode(() => compareProtocolReleases(VALID_RELEASE, null)) ===
      'FND-PROTOCOL-RELEASE-TYPE',
    'ordering invalid right rejection',
  );

  const equalityExecutionInconsistency = captureError(() =>
    runEqualityCase({
      id: 'FND-PROTOCOL-RELEASE-EXECUTION-EQUALITY-INCONSISTENCY',
      values: ['ghostbridge/e01.r0', VALID_RELEASE],
      equalExpected: false,
    }),
  );
  expect(
    equalityExecutionInconsistency instanceof FoundationValidationError &&
      equalityExecutionInconsistency.message.includes('changed after complete preflight') &&
      equalityExecutionInconsistency.cause instanceof ProtocolReleaseValidationError,
    'equality execution validation inconsistency is classified and cause-preserving',
  );
  const orderingExecutionInconsistency = captureError(() =>
    runOrderingCase({
      id: 'FND-PROTOCOL-RELEASE-EXECUTION-ORDERING-INCONSISTENCY',
      left: VALID_RELEASE,
      right: 'ghostbridge/e2147483648.r0',
      orderExpected: 'LESS',
    }),
  );
  expect(
    orderingExecutionInconsistency instanceof FoundationValidationError &&
      orderingExecutionInconsistency.message.includes('changed after complete preflight') &&
      orderingExecutionInconsistency.cause instanceof ProtocolReleaseValidationError,
    'ordering execution validation inconsistency is classified and cause-preserving',
  );

  const syntheticInternalFailure = new Error('synthetic ProtocolRelease operation failure');
  const operationRegExpExec = RegExp.prototype.exec;
  RegExp.prototype.exec = function failProtocolReleaseOperation(...args) {
    if (this.source.startsWith('^ghostbridge\\/e')) throw syntheticInternalFailure;
    return Reflect.apply(operationRegExpExec, this, args);
  };
  try {
    expect(
      captureError(() =>
        runEqualityCase({
          id: 'FND-PROTOCOL-RELEASE-EXECUTION-EQUALITY-INTERNAL',
          values: [VALID_RELEASE, VALID_RELEASE],
          equalExpected: true,
        }),
      ) === syntheticInternalFailure,
      'unexpected equality implementation failure propagates unchanged',
    );
    expect(
      captureError(() =>
        runOrderingCase({
          id: 'FND-PROTOCOL-RELEASE-EXECUTION-ORDERING-INTERNAL',
          left: VALID_RELEASE,
          right: VALID_RELEASE,
          orderExpected: 'EQUAL',
        }),
      ) === syntheticInternalFailure,
      'unexpected ordering implementation failure propagates unchanged',
    );
  } finally {
    RegExp.prototype.exec = operationRegExpExec;
  }
  namedProofs.add('PROTOCOL_RELEASE_INVALID_OPERAND_REJECTION_EXECUTED');

  const canonicalOrder = Object.freeze([
    'ghostbridge/e0.r0-experimental.0',
    'ghostbridge/e0.r0-experimental.1',
    'ghostbridge/e0.r0-draft.0',
    'ghostbridge/e0.r0-alpha.0',
    'ghostbridge/e0.r0-beta.0',
    'ghostbridge/e0.r0-rc.0',
    'ghostbridge/e0.r0-rc.2147483647',
    'ghostbridge/e0.r0',
    'ghostbridge/e0.r1-experimental.0',
    'ghostbridge/e1.r0-experimental.0',
    'ghostbridge/e1.r0',
  ]);
  expect(
    JSON.stringify(PROTOCOL_RELEASE_STAGE_RANK) ===
      JSON.stringify({ experimental: 0, draft: 1, alpha: 2, beta: 3, rc: 4, final: 5 }) &&
      Object.isFrozen(PROTOCOL_RELEASE_STAGE_RANK),
    'complete immutable stage rank',
  );
  expect(
    JSON.stringify(PROTOCOL_RELEASE_ORDER_RESULTS) === JSON.stringify(['LESS', 'EQUAL', 'GREATER']),
    'closed comparator result set',
  );

  for (let leftIndex = 0; leftIndex < canonicalOrder.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < canonicalOrder.length; rightIndex += 1) {
      const expected =
        leftIndex < rightIndex ? 'LESS' : leftIndex > rightIndex ? 'GREATER' : 'EQUAL';
      const actual = compareProtocolReleases(canonicalOrder[leftIndex], canonicalOrder[rightIndex]);
      expect(actual === expected, `literal total order ${leftIndex}/${rightIndex}`);
      expect(
        compareProtocolReleases(canonicalOrder[rightIndex], canonicalOrder[leftIndex]) ===
          reverseOrder(actual),
        `antisymmetry ${leftIndex}/${rightIndex}`,
      );
      expect(
        (actual === 'EQUAL') ===
          protocolReleasesEqual(canonicalOrder[leftIndex], canonicalOrder[rightIndex]),
        `equality consistency ${leftIndex}/${rightIndex}`,
      );
    }
  }
  for (let first = 0; first < canonicalOrder.length; first += 1) {
    for (let second = first + 1; second < canonicalOrder.length; second += 1) {
      for (let third = second + 1; third < canonicalOrder.length; third += 1) {
        expect(
          compareProtocolReleases(canonicalOrder[first], canonicalOrder[second]) === 'LESS' &&
            compareProtocolReleases(canonicalOrder[second], canonicalOrder[third]) === 'LESS' &&
            compareProtocolReleases(canonicalOrder[first], canonicalOrder[third]) === 'LESS',
          `transitivity ${first}/${second}/${third}`,
        );
      }
    }
  }
  expect(
    compareProtocolReleases('ghostbridge/e1.r0-experimental.0', 'ghostbridge/e0.r2147483647') ===
      'GREATER',
    'epoch precedence over all lower components',
  );
  expect(
    compareProtocolReleases('ghostbridge/e1.r1-experimental.0', 'ghostbridge/e1.r0') === 'GREATER',
    'revision precedence over stage and iteration',
  );
  expect(
    compareProtocolReleases(
      'ghostbridge/e1.r0-draft.0',
      'ghostbridge/e1.r0-experimental.2147483647',
    ) === 'GREATER',
    'stage precedence over iteration',
  );
  expect(
    compareProtocolReleases('ghostbridge/e1.r0-beta.1', 'ghostbridge/e1.r0-beta.0') === 'GREATER',
    'iteration precedence within one stage',
  );
  expect(
    compareProtocolReleases('ghostbridge/e1.r0', 'ghostbridge/e1.r0-rc.2147483647') === 'GREATER',
    'final follows every rc iteration',
  );
  namedProofs.add('PROTOCOL_RELEASE_COMPARATOR_TOTAL_ORDER_EXECUTED');

  const permutations = Object.freeze([
    canonicalOrder,
    Object.freeze([...canonicalOrder].reverse()),
    Object.freeze([
      canonicalOrder[5],
      canonicalOrder[0],
      canonicalOrder[10],
      canonicalOrder[3],
      canonicalOrder[8],
      canonicalOrder[1],
      canonicalOrder[7],
      canonicalOrder[2],
      canonicalOrder[9],
      canonicalOrder[4],
      canonicalOrder[6],
    ]),
    Object.freeze([
      canonicalOrder[10],
      canonicalOrder[8],
      canonicalOrder[6],
      canonicalOrder[4],
      canonicalOrder[2],
      canonicalOrder[0],
      canonicalOrder[9],
      canonicalOrder[7],
      canonicalOrder[5],
      canonicalOrder[3],
      canonicalOrder[1],
    ]),
  ]);
  for (const permutation of permutations) {
    expect(
      selectGreatest(permutation) === canonicalOrder.at(-1),
      'permutation and input-order independence',
    );
  }

  const originalLocaleCompare = String.prototype.localeCompare;
  String.prototype.localeCompare = function prohibitedLocaleCompare() {
    throw new Error('localeCompare must not be called');
  };
  try {
    expect(
      compareProtocolReleases('ghostbridge/e1.r0-alpha.0', 'ghostbridge/e1.r0-beta.0') === 'LESS',
      'locale independence',
    );
  } finally {
    String.prototype.localeCompare = originalLocaleCompare;
  }

  const originalSort = Array.prototype.sort;
  Array.prototype.sort = function prohibitedStableSort() {
    throw new Error('Array.sort must not be called');
  };
  try {
    expect(selectGreatest(permutations[2]) === canonicalOrder.at(-1), 'no stable-sort dependency');
  } finally {
    Array.prototype.sort = originalSort;
  }

  for (let repetition = 0; repetition < 50; repetition += 1) {
    for (let index = 0; index < canonicalOrder.length - 1; index += 1) {
      expect(
        compareProtocolReleases(canonicalOrder[index], canonicalOrder[index + 1]) === 'LESS',
        `deterministic repetition ${repetition}/${index}`,
      );
    }
  }
  namedProofs.add('PROTOCOL_RELEASE_COMPARATOR_DETERMINISM_EXECUTED');

  return { count, diagnosticResults, namedProofs };
}
