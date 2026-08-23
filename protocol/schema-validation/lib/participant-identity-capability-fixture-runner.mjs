import path from 'node:path';

import { errorMessage, fail } from './errors.mjs';
import { validateProtocolJsonBytes } from './json-source.mjs';
import { evaluateSemanticCheck } from './semantic-checks.mjs';

export const PARTICIPANT_IDENTITY_CAPABILITY_FIXTURE_SCHEMA_ID =
  'urn:uuid:9e9d3cdc-2653-43b9-bd4f-06c1877c2c79';

const RAW_SOURCE_MAXIMUM_BYTES = 1024 * 1024;

const PARTICIPANT_SCHEMA_IDS = Object.freeze({
  lexicalCarriers: 'urn:uuid:5cbc8490-c503-4a92-bd28-4a2f3f58f9f5',
  issuerIdentity: 'urn:uuid:8276cdd7-e089-4a09-851f-7ef6ed23423c',
  agentIdentity: 'urn:uuid:8c3292ef-716d-4bee-84f8-0ed306d418d8',
  passportIdentity: 'urn:uuid:caef0478-5ff8-408b-9b1f-85a2147d6d63',
  passportVersion: 'urn:uuid:fb79f48a-3d0e-4e6c-b94f-b7cef193f79d',
  capabilityNamespaceIdentity: 'urn:uuid:c81a421d-70d0-4351-bcc4-d49392803efd',
  capabilityKey: 'urn:uuid:00086a2a-f7bf-44fb-b41c-71712786dd29',
  capabilityVersion: 'urn:uuid:da8bca1b-cfd7-4ef5-8813-9fe72530f51f',
  immutableArtifactIdentity: 'urn:uuid:2de2d1b9-2293-47ea-9f9a-ae73a2e5f1b5',
  passportReference: 'urn:uuid:c14ed3c3-22be-4011-a3e8-7a83e53dfb52',
  capabilityContractReference: 'urn:uuid:efb313d4-9db1-4fb4-b289-f979419c0da3',
});

const ALL_PARTICIPANT_TARGET_SCHEMA_IDS = Object.freeze(Object.values(PARTICIPANT_SCHEMA_IDS));
const RAW_PARTICIPANT_TARGET_SCHEMA_IDS = Object.freeze([
  PARTICIPANT_SCHEMA_IDS.passportIdentity,
  PARTICIPANT_SCHEMA_IDS.capabilityKey,
  PARTICIPANT_SCHEMA_IDS.passportReference,
  PARTICIPANT_SCHEMA_IDS.capabilityContractReference,
]);
const IDENTITY_TYPE_BY_TARGET_SCHEMA = Object.freeze({
  [PARTICIPANT_SCHEMA_IDS.issuerIdentity]: 'IssuerIdentity',
  [PARTICIPANT_SCHEMA_IDS.agentIdentity]: 'AgentIdentity',
  [PARTICIPANT_SCHEMA_IDS.capabilityNamespaceIdentity]: 'CapabilityNamespaceIdentity',
  [PARTICIPANT_SCHEMA_IDS.immutableArtifactIdentity]: 'ImmutableArtifactIdentity',
});

function checkContract(kind, targetSchemaIds, semanticInputBranch = undefined) {
  return Object.freeze({
    kind,
    targetSchemaIds: Object.freeze([...targetSchemaIds]),
    semanticInputBranch,
  });
}

const PARTICIPANT_FIXTURE_CHECK_CONTRACT = Object.freeze({
  none: checkContract('value', ALL_PARTICIPANT_TARGET_SCHEMA_IDS),
  'issuer-identity': checkContract('value', [PARTICIPANT_SCHEMA_IDS.issuerIdentity]),
  'agent-identity': checkContract('value', [PARTICIPANT_SCHEMA_IDS.agentIdentity]),
  'passport-identity': checkContract('value', [PARTICIPANT_SCHEMA_IDS.passportIdentity]),
  'passport-issuer-match': checkContract(
    'value',
    [PARTICIPANT_SCHEMA_IDS.passportIdentity],
    'separateIssuer',
  ),
  'passport-version': checkContract('value', [PARTICIPANT_SCHEMA_IDS.passportVersion]),
  'capability-namespace-identity': checkContract('value', [
    PARTICIPANT_SCHEMA_IDS.capabilityNamespaceIdentity,
  ]),
  'capability-key': checkContract('value', [PARTICIPANT_SCHEMA_IDS.capabilityKey]),
  'capability-version': checkContract('value', [PARTICIPANT_SCHEMA_IDS.capabilityVersion]),
  'immutable-artifact-identity': checkContract('value', [
    PARTICIPANT_SCHEMA_IDS.immutableArtifactIdentity,
  ]),
  'typed-identity-separation': checkContract(
    'value',
    Object.keys(IDENTITY_TYPE_BY_TARGET_SCHEMA),
    'typedIdentityComparison',
  ),
  'typed-artifact-separation': checkContract(
    'value',
    [PARTICIPANT_SCHEMA_IDS.immutableArtifactIdentity],
    'typedArtifactComparison',
  ),
  'artifact-identity-integrity-separation': checkContract(
    'value',
    [PARTICIPANT_SCHEMA_IDS.immutableArtifactIdentity],
    'artifactIntegrity',
  ),
  'artifact-history-consistency': checkContract(
    'value',
    [PARTICIPANT_SCHEMA_IDS.immutableArtifactIdentity],
    'artifactHistory',
  ),
  'passport-reference-history-consistency': checkContract(
    'value',
    [PARTICIPANT_SCHEMA_IDS.passportReference],
    'passportReferenceHistory',
  ),
  'capability-contract-reference-history-consistency': checkContract(
    'value',
    [PARTICIPANT_SCHEMA_IDS.capabilityContractReference],
    'capabilityContractReferenceHistory',
  ),
  'issuer-identity-exact-equality': checkContract('equality', [
    PARTICIPANT_SCHEMA_IDS.issuerIdentity,
  ]),
  'agent-identity-exact-equality': checkContract('equality', [
    PARTICIPANT_SCHEMA_IDS.agentIdentity,
  ]),
  'passport-identity-equality': checkContract('equality', [
    PARTICIPANT_SCHEMA_IDS.passportIdentity,
  ]),
  'passport-version-exact-equality': checkContract('equality', [
    PARTICIPANT_SCHEMA_IDS.passportVersion,
  ]),
  'capability-namespace-exact-equality': checkContract('equality', [
    PARTICIPANT_SCHEMA_IDS.capabilityNamespaceIdentity,
  ]),
  'capability-key-equality': checkContract('equality', [PARTICIPANT_SCHEMA_IDS.capabilityKey]),
  'capability-version-exact-equality': checkContract('equality', [
    PARTICIPANT_SCHEMA_IDS.capabilityVersion,
  ]),
  'immutable-artifact-exact-equality': checkContract('equality', [
    PARTICIPANT_SCHEMA_IDS.immutableArtifactIdentity,
  ]),
  'passport-reference-coordinate-equality': checkContract('equality', [
    PARTICIPANT_SCHEMA_IDS.passportReference,
  ]),
  'capability-contract-reference-coordinate-equality': checkContract('equality', [
    PARTICIPANT_SCHEMA_IDS.capabilityContractReference,
  ]),
});

export const participantFixtureCheckContractIds = Object.freeze(
  Object.keys(PARTICIPANT_FIXTURE_CHECK_CONTRACT).sort(),
);

export function assertParticipantFixtureCheckContract(testCase) {
  if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase)) {
    fail('Participant fixture contract requires one case object');
  }
  if (testCase.kind === 'raw-source') {
    if (!RAW_PARTICIPANT_TARGET_SCHEMA_IDS.includes(testCase.targetSchema)) {
      fail(`Participant raw-source target is not permitted: ${String(testCase.targetSchema)}`);
    }
    if (Object.hasOwn(testCase, 'semanticCheck') || Object.hasOwn(testCase, 'semanticInput')) {
      fail(`Participant raw-source evidence carries semantic fields: ${String(testCase.id)}`);
    }
    return Object.freeze({ participantIdentityType: undefined });
  }

  const contract = PARTICIPANT_FIXTURE_CHECK_CONTRACT[testCase.semanticCheck];
  if (!contract) {
    fail(`Participant semantic check has no fixture contract: ${String(testCase.semanticCheck)}`);
  }
  if (testCase.kind !== contract.kind) {
    fail(
      `Participant semantic check is not permitted for fixture kind: ${String(testCase.semanticCheck)}/${String(testCase.kind)}`,
    );
  }
  if (!contract.targetSchemaIds.includes(testCase.targetSchema)) {
    fail(
      `Participant semantic check is not permitted for target schema: ${String(testCase.semanticCheck)}/${String(testCase.targetSchema)}`,
    );
  }
  if (contract.semanticInputBranch === undefined) {
    if (Object.hasOwn(testCase, 'semanticInput')) {
      fail(`Participant semantic check forbids semanticInput: ${String(testCase.semanticCheck)}`);
    }
  } else {
    const semanticInput = testCase.semanticInput;
    if (
      !semanticInput ||
      typeof semanticInput !== 'object' ||
      Array.isArray(semanticInput) ||
      Object.keys(semanticInput).length !== 1 ||
      !Object.hasOwn(semanticInput, contract.semanticInputBranch)
    ) {
      fail(
        `Participant semantic check requires exact semanticInput branch ${contract.semanticInputBranch}: ${String(testCase.semanticCheck)}`,
      );
    }
  }

  const participantIdentityType = IDENTITY_TYPE_BY_TARGET_SCHEMA[testCase.targetSchema];
  if (
    testCase.semanticCheck === 'typed-identity-separation' &&
    testCase.semanticInput.typedIdentityComparison.valueType !== participantIdentityType
  ) {
    fail(
      `Participant typed identity valueType disagrees with target schema: ${String(testCase.targetSchema)}`,
    );
  }
  return Object.freeze({ participantIdentityType });
}

function assertFixtureClassification(classification, testCase) {
  const id = String(testCase?.id);
  if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase)) {
    fail('Participant identity/capability fixture case must be an object');
  }
  if (classification === 'structural-negative') {
    const valueCase =
      testCase.kind === 'value' &&
      testCase.structuralExpected === 'fail' &&
      testCase.semanticExpected === 'not-applicable' &&
      testCase.semanticCheck === 'none';
    const rawCase =
      testCase.kind === 'raw-source' &&
      testCase.rawExpected === 'fail' &&
      testCase.structuralExpected === 'not-applicable';
    if (!valueCase && !rawCase) {
      fail(`Misclassified participant structural-negative fixture: ${id}`);
    }
    return;
  }
  if (classification === 'structural-positive') {
    if (
      testCase.kind !== 'value' ||
      testCase.structuralExpected !== 'pass' ||
      testCase.semanticExpected !== 'not-applicable' ||
      testCase.semanticCheck !== 'none'
    ) {
      fail(`Misclassified participant structural-positive fixture: ${id}`);
    }
    return;
  }
  if (classification === 'semantic-negative') {
    if (
      testCase.kind !== 'value' ||
      testCase.structuralExpected !== 'pass' ||
      testCase.semanticExpected !== 'fail' ||
      testCase.semanticCheck === 'none'
    ) {
      fail(`Misclassified participant semantic-negative fixture: ${id}`);
    }
    return;
  }
  if (classification === 'semantic-positive') {
    const valueCase =
      testCase.kind === 'value' &&
      testCase.structuralExpected === 'pass' &&
      testCase.semanticExpected === 'pass' &&
      testCase.semanticCheck !== 'none';
    const equalityCase = testCase.kind === 'equality';
    if (!valueCase && !equalityCase) {
      fail(`Misclassified participant semantic-positive fixture: ${id}`);
    }
    return;
  }
  if (classification !== 'boundary') {
    fail(`Unknown participant fixture classification: ${String(classification)}`);
  }
}

function runValueCase(testCase, validateTarget, errorsText, contractContext) {
  const structuralPass = validateTarget(testCase.value) === true;
  const expectedStructuralPass = testCase.structuralExpected === 'pass';
  if (structuralPass !== expectedStructuralPass) {
    fail(
      `Participant structural expectation mismatch for ${testCase.id}: expected=${testCase.structuralExpected} actual=${structuralPass ? 'pass' : 'fail'}; ${errorsText()}`,
    );
  }
  if (testCase.semanticExpected === 'not-applicable') {
    if (testCase.semanticCheck !== 'none' || Object.hasOwn(testCase, 'semanticInput')) {
      fail(`Participant fixture skips supplied semantic evidence: ${testCase.id}`);
    }
    return 0;
  }
  if (!structuralPass || testCase.semanticCheck === 'none') {
    fail(`Participant fixture requests invalid semantic execution: ${testCase.id}`);
  }
  const semanticPass = evaluateSemanticCheck(testCase, { validateTarget, ...contractContext });
  const expectedSemanticPass = testCase.semanticExpected === 'pass';
  if (semanticPass !== expectedSemanticPass) {
    fail(
      `Participant semantic expectation mismatch for ${testCase.id}: expected=${testCase.semanticExpected} actual=${semanticPass ? 'pass' : 'fail'}`,
    );
  }
  return 1;
}

function runEqualityCase(testCase, validateTarget, contractContext) {
  for (const value of testCase.values) {
    if (validateTarget(value) !== true) {
      fail(`Participant equality fixture contains an invalid value: ${testCase.id}`);
    }
  }
  if (!evaluateSemanticCheck(testCase, { validateTarget, ...contractContext })) {
    fail(`Participant equality expectation mismatch: ${testCase.id}`);
  }
  return 1;
}

function runRawSourceCase(testCase) {
  try {
    const bytes = Buffer.from(testCase.source, 'utf8');
    validateProtocolJsonBytes(bytes, {
      maximumBytes: RAW_SOURCE_MAXIMUM_BYTES,
      source: testCase.id,
    });
    fail(`Participant raw-source fixture unexpectedly passed: ${testCase.id}`);
  } catch (error) {
    const message = errorMessage(error);
    if (!message.includes(`[${testCase.expectedDiagnostic}]`)) {
      fail(
        `Participant raw-source fixture failed with the wrong diagnostic for ${testCase.id}: ${message}`,
        { cause: error },
      );
    }
  }
}

export function runParticipantIdentityCapabilityFixtures({ manifest, assets, ajv }) {
  const fixtureCounts = new Map();
  const fixtureIds = new Set();
  const fixtureTargetSchemaIds = new Set();
  const processedFixturePaths = new Set();
  let fixtureCount = 0;
  let rawCount = 0;
  let semanticCount = 0;

  const entries = manifest.fixtures
    .filter((entry) => entry.schemaId === PARTICIPANT_IDENTITY_CAPABILITY_FIXTURE_SCHEMA_ID)
    .toSorted((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));

  for (const entry of entries) {
    const corpus = assets.get(entry.path);
    if (!corpus || !Array.isArray(corpus.cases)) {
      fail(`Participant identity/capability fixture corpus was not loaded: ${entry.path}`);
    }
    const filenameClassification = path.posix.basename(entry.path, '.json');
    if (corpus.classification !== filenameClassification) {
      fail(`Participant fixture classification/path mismatch: ${entry.path}`);
    }
    if (fixtureCounts.has(corpus.classification)) {
      fail(`Duplicate participant fixture classification: ${corpus.classification}`);
    }
    fixtureCounts.set(corpus.classification, corpus.cases.length);

    for (const testCase of corpus.cases) {
      if (fixtureIds.has(testCase.id)) {
        fail(`Duplicate participant fixture ID: ${String(testCase.id)}`);
      }
      assertFixtureClassification(corpus.classification, testCase);
      const contractContext = assertParticipantFixtureCheckContract(testCase);
      const validateTarget = ajv.getSchema(testCase.targetSchema);
      if (!validateTarget) {
        fail(`Participant fixture target schema is not preloaded: ${testCase.targetSchema}`);
      }
      fixtureIds.add(testCase.id);
      fixtureCount += 1;
      if (testCase.kind !== 'raw-source') fixtureTargetSchemaIds.add(testCase.targetSchema);

      if (testCase.kind === 'raw-source') {
        runRawSourceCase(testCase);
        rawCount += 1;
      } else if (testCase.kind === 'value') {
        semanticCount += runValueCase(
          testCase,
          validateTarget,
          () => ajv.errorsText(validateTarget.errors),
          contractContext,
        );
      } else if (testCase.kind === 'equality') {
        semanticCount += runEqualityCase(testCase, validateTarget, contractContext);
      } else {
        fail(`Unknown participant fixture kind: ${String(testCase.kind)}`);
      }
    }
    processedFixturePaths.add(entry.path);
  }

  return {
    fixtureCount,
    fixtureCounts,
    fixtureTargetSchemaIds,
    processedFixturePaths,
    rawCount,
    semanticCount,
  };
}
