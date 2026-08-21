import path from 'node:path';

import { fail } from './errors.mjs';
import { evaluateSemanticCheck } from './semantic-checks.mjs';

export const FOUNDATION_FIXTURE_SCHEMA_ID = 'urn:uuid:da99d351-12ed-42b8-8ddd-9fc761e638f0';

export function assertFixtureClassification(classification, testCase) {
  if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase))
    fail('Fixture case must be an object');
  const fixtureId = String(testCase.id);
  if (classification === 'structural-negative') {
    if (
      testCase.kind !== 'value' ||
      testCase.structuralExpected !== 'fail' ||
      testCase.semanticExpected !== 'not-applicable' ||
      testCase.semanticCheck !== 'none'
    ) {
      fail(`Misclassified structural-negative fixture: ${fixtureId}`);
    }
  } else if (classification === 'semantic-negative') {
    if (
      testCase.kind !== 'value' ||
      testCase.structuralExpected !== 'pass' ||
      testCase.semanticExpected !== 'fail' ||
      testCase.semanticCheck === 'none'
    ) {
      fail(`Misclassified semantic-negative fixture: ${fixtureId}`);
    }
  } else if (classification === 'semantic-positive') {
    const acceptedValueEvidence =
      testCase.kind === 'value' &&
      testCase.structuralExpected === 'pass' &&
      testCase.semanticExpected === 'pass' &&
      testCase.semanticCheck !== 'none';
    const acceptedEqualityEvidence =
      testCase.kind === 'equality' && testCase.semanticCheck !== 'none';
    if (!acceptedValueEvidence && !acceptedEqualityEvidence) {
      fail(`Misclassified semantic-positive fixture: ${fixtureId}`);
    }
  } else if (classification === 'structural-positive') {
    if (testCase.kind !== 'value' || testCase.structuralExpected !== 'pass') {
      fail(`Misclassified structural-positive fixture: ${fixtureId}`);
    }
  } else if (classification !== 'boundary') {
    fail(`Unknown fixture classification: ${String(classification)}`);
  }
}

export function runFixtureCase({
  testCase,
  classification,
  validateTarget,
  errorsText = () => 'validation failed',
}) {
  if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase))
    fail('Fixture case must be an object');
  if (typeof validateTarget !== 'function')
    fail(`Fixture ${String(testCase.id)} has no target validator`);
  if (classification !== undefined) assertFixtureClassification(classification, testCase);

  if (testCase.kind === 'value') {
    const hasSemanticInput = Object.hasOwn(testCase, 'semanticInput');
    if (testCase.semanticCheck === 'artifact-byte-integrity' && !hasSemanticInput) {
      fail(`Artifact fixture ${String(testCase.id)} has no semanticInput`);
    }
    if (testCase.semanticCheck !== 'artifact-byte-integrity' && hasSemanticInput) {
      fail(`Non-artifact fixture ${String(testCase.id)} supplies artifact semanticInput`);
    }
    const structuralPass = validateTarget(testCase.value) === true;
    const expectedStructuralPass = testCase.structuralExpected === 'pass';
    if (structuralPass !== expectedStructuralPass) {
      fail(
        `Structural expectation mismatch for ${String(testCase.id)}: expected=${testCase.structuralExpected} actual=${structuralPass ? 'pass' : 'fail'}; ${errorsText()}`,
      );
    }
    if (testCase.semanticExpected === 'not-applicable') {
      if (testCase.semanticCheck !== 'none') {
        fail(`Fixture ${String(testCase.id)} skips a non-none semantic check`);
      }
      return { semanticChecks: 0 };
    }
    if (testCase.semanticCheck === 'none') {
      fail(
        `Fixture ${String(testCase.id)} expects an applicable semantic result with no semantic check`,
      );
    }
    if (!structuralPass)
      fail(
        `Fixture ${String(testCase.id)} requests semantic validation after structural rejection`,
      );
    const semanticPass = evaluateSemanticCheck(testCase, { validateTarget });
    const expectedSemanticPass = testCase.semanticExpected === 'pass';
    if (semanticPass !== expectedSemanticPass) {
      fail(
        `Semantic expectation mismatch for ${String(testCase.id)}: expected=${testCase.semanticExpected} actual=${semanticPass ? 'pass' : 'fail'}`,
      );
    }
    return { semanticChecks: 1 };
  }

  if (testCase.kind === 'equality') {
    if (testCase.semanticCheck === 'none')
      fail(`Equality fixture ${String(testCase.id)} has no semantic check`);
    for (const value of testCase.values) {
      if (!validateTarget(value))
        fail(`Equality fixture contains structurally invalid value: ${String(testCase.id)}`);
    }
    if (!evaluateSemanticCheck(testCase, { validateTarget })) {
      fail(`Equality expectation mismatch for ${String(testCase.id)}`);
    }
    return { semanticChecks: 1 };
  }

  fail(`Unknown fixture kind ${String(testCase.kind)} in ${String(testCase.id)}`);
}

export function runFoundationFixtures({ manifest, assets, ajv }) {
  const fixtureCounts = new Map();
  const fixtureIds = new Set();
  const fixtureTargetSchemaIds = new Set();
  let fixtureCount = 0;
  let semanticCount = 0;
  const processedFixturePaths = new Set();

  const foundationEntries = manifest.fixtures.filter(
    (entry) => entry.schemaId === FOUNDATION_FIXTURE_SCHEMA_ID,
  );
  for (const fixtureEntry of [...foundationEntries].sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
  )) {
    const corpus = assets.get(fixtureEntry.path);
    if (!corpus || !Array.isArray(corpus.cases))
      fail(`Fixture corpus was not loaded: ${fixtureEntry.path}`);
    const filenameClassification = path.posix.basename(fixtureEntry.path, '.json');
    if (corpus.classification !== filenameClassification) {
      fail(`Fixture classification/path mismatch: ${fixtureEntry.path}`);
    }
    if (fixtureCounts.has(corpus.classification))
      fail(`Duplicate fixture classification: ${corpus.classification}`);
    fixtureCounts.set(corpus.classification, corpus.cases.length);

    for (const testCase of corpus.cases) {
      fixtureCount += 1;
      if (fixtureIds.has(testCase.id)) fail(`Duplicate fixture ID: ${String(testCase.id)}`);
      fixtureIds.add(testCase.id);
      fixtureTargetSchemaIds.add(testCase.targetSchema);
      const validateTarget = ajv.getSchema(testCase.targetSchema);
      if (!validateTarget)
        fail(`Fixture target schema is not preloaded: ${String(testCase.targetSchema)}`);
      const result = runFixtureCase({
        testCase,
        classification: corpus.classification,
        validateTarget,
        errorsText: () => ajv.errorsText(validateTarget.errors),
      });
      semanticCount += result.semanticChecks;
    }
    processedFixturePaths.add(fixtureEntry.path);
  }

  return {
    fixtureCounts,
    fixtureCount,
    semanticCount,
    fixtureTargetSchemaIds,
    processedFixturePaths,
  };
}
