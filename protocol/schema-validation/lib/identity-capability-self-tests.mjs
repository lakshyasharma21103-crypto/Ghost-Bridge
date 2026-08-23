import {
  agentIdentitiesEqual,
  artifactHistoryIsConsistent,
  artifactIdentityIsDistinctFromIntegrityDigest,
  capabilityContractReferenceCoordinatesEqual,
  capabilityContractReferenceHistoryIsConsistent,
  capabilityKeysEqual,
  capabilityNamespaceIdentitiesEqual,
  capabilityScopesEqual,
  capabilityVersionsEqual,
  immutableArtifactIdentitiesEqual,
  isAgentIdentity,
  isCapabilityKey,
  isCapabilityNamespaceIdentity,
  isCapabilityVersion,
  isImmutableArtifactIdentity,
  isIssuerIdentity,
  isPassportIdentity,
  isPassportReference,
  isPassportVersion,
  issuerIdentitiesEqual,
  passportIdentitiesEqual,
  passportIssuerMatches,
  passportReferenceCoordinatesEqual,
  passportReferenceHistoryIsConsistent,
  passportReferenceMappingsEqual,
  passportVersionsEqual,
  typedArtifactIdentitiesAreSeparated,
  typedIdentityValuesAreSeparated,
} from './identity-capability-semantics.mjs';
import {
  capabilityKeysEqual as releaseCapabilityKeysEqual,
  capabilityScopesEqual as releaseCapabilityScopesEqual,
  isCapabilityKey as releaseIsCapabilityKey,
  isCapabilityVersion as releaseIsCapabilityVersion,
} from './release-data-semantics.mjs';
import { assertParticipantFixtureCheckContract } from './participant-identity-capability-fixture-runner.mjs';
import { assertSemanticRegistryCoverage, semanticCheckIds } from './semantic-checks.mjs';

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeDeep(child);
  }
  return value;
}

function fixtureSchemaDeclaringSemanticChecks(identifiers) {
  return {
    $id: 'urn:uuid:9e9d3cdc-2653-43b9-bd4f-06c1877c2c79',
    $defs: {
      valueCase: { properties: { semanticCheck: { enum: identifiers } } },
      equalityCase: { properties: { semanticCheck: { const: 'none' } } },
    },
  };
}

function semanticRegistryCoverageFails(identifiers) {
  try {
    assertSemanticRegistryCoverage([fixtureSchemaDeclaringSemanticChecks(identifiers)]);
    return false;
  } catch {
    return true;
  }
}

function operationFails(operation) {
  try {
    operation();
    return false;
  } catch {
    return true;
  }
}

export function runIdentityCapabilitySelfTests({ schemas, manifest }) {
  let count = 0;
  const namedProofs = new Set();
  const expect = (condition, label) => {
    count += 1;
    if (!condition) throw new Error(`Identity/capability self-test failed: ${label}`);
  };
  const expectProof = (proofId, condition, label) => {
    expect(condition, label);
    namedProofs.add(proofId);
  };

  const uuid8 = 'urn:uuid:12345678-1234-4123-8123-123456789abc';
  const uuid9 = 'urn:uuid:12345678-1234-4123-9123-123456789abc';
  const uuida = 'urn:uuid:12345678-1234-4123-a123-123456789abc';
  const uuidb = 'urn:uuid:12345678-1234-4123-b123-123456789abc';
  const otherUuid = 'urn:uuid:87654321-4321-4abc-8def-abcdef012345';
  const issuer = uuid8;
  const passport = freezeDeep({ issuer, local: 'fixture.passport' });
  const reorderedPassport = freezeDeep({ local: 'fixture.passport', issuer });
  const coreKey = freezeDeep({ namespaceClass: 'core', name: 'fixture.core' });
  const externalKey = freezeDeep({
    namespaceClass: 'external',
    namespace: uuid9,
    name: 'fixture.external',
  });
  const integrityEmpty = freezeDeep({
    algorithm: 'sha-256',
    value: '47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU',
    byteLength: 0,
  });
  const integrityA = freezeDeep({
    algorithm: 'sha-256',
    value: 'ypeBEsobvcr6wjGzmiPcTaeG7_gUfE5yuYB3ha_uSLs',
    byteLength: 1,
  });
  const passportReference = freezeDeep({
    passportIdentity: passport,
    passportVersion: 'v1',
    protocolRelease: 'ghostbridge/e1.r0-draft.1',
    passportArtifact: uuida,
    artifactByteIntegrity: integrityEmpty,
  });
  const capabilityReference = freezeDeep({
    protocolRelease: 'ghostbridge/e1.r0-draft.1',
    capabilityKey: coreKey,
    capabilityVersion: 'v1',
    capabilityContractArtifact: uuidb,
    artifactByteIntegrity: integrityEmpty,
  });
  const passportCrossVersionSameIntegrity = freezeDeep({
    ...passportReference,
    passportVersion: 'v2',
  });
  const passportCrossVersionDifferentIntegrity = freezeDeep({
    ...passportReference,
    passportVersion: 'v2',
    artifactByteIntegrity: integrityA,
  });
  const passportCrossIdentityDifferentIntegrity = freezeDeep({
    ...passportReference,
    passportIdentity: { issuer, local: 'fixture.other' },
    artifactByteIntegrity: integrityA,
  });
  const capabilityCrossVersionSameIntegrity = freezeDeep({
    ...capabilityReference,
    capabilityVersion: 'v2',
  });
  const capabilityCrossVersionDifferentIntegrity = freezeDeep({
    ...capabilityReference,
    capabilityVersion: 'v2',
    artifactByteIntegrity: integrityA,
  });
  const capabilityCrossKeyDifferentIntegrity = freezeDeep({
    ...capabilityReference,
    capabilityKey: { namespaceClass: 'core', name: 'fixture.other' },
    artifactByteIntegrity: integrityA,
  });
  const lexicalCarrierId = 'urn:uuid:5cbc8490-c503-4a92-bd28-4a2f3f58f9f5';
  const passportIdentitySchemaId = 'urn:uuid:caef0478-5ff8-408b-9b1f-85a2147d6d63';
  const passportVersionSchemaId = 'urn:uuid:fb79f48a-3d0e-4e6c-b94f-b7cef193f79d';
  const capabilityKeySchemaId = 'urn:uuid:00086a2a-f7bf-44fb-b41c-71712786dd29';
  const capabilityVersionSchemaId = 'urn:uuid:da8bca1b-cfd7-4ef5-8813-9fe72530f51f';
  const localIdentifierReference = `${lexicalCarrierId}#/$defs/localIdentifier1To128`;
  const versionTokenReference = `${lexicalCarrierId}#/$defs/versionToken1To64`;
  const manifestEntry = (schemaId) => manifest.schemas.find((entry) => entry.schemaId === schemaId);
  const lexicalCarrierSchema = schemas.get(lexicalCarrierId);
  const passportIdentitySchema = schemas.get(passportIdentitySchemaId);
  const passportVersionSchema = schemas.get(passportVersionSchemaId);
  const capabilityKeySchema = schemas.get(capabilityKeySchemaId);
  const capabilityVersionSchema = schemas.get(capabilityVersionSchemaId);
  const expectedLexicalCarrierDefinitions = freezeDeep({
    canonicalUuidV4Urn: {
      type: 'string',
      minLength: 45,
      maxLength: 45,
      pattern: '^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    },
    localIdentifier1To128: {
      type: 'string',
      minLength: 1,
      maxLength: 128,
      pattern: '^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$',
    },
    versionToken1To64: {
      type: 'string',
      minLength: 1,
      maxLength: 64,
      pattern: '^[a-z](?:[a-z0-9._-]{0,62}[a-z0-9])?$',
    },
  });
  const uuidBackedSchemaIds = [
    'urn:uuid:8276cdd7-e089-4a09-851f-7ef6ed23423c',
    'urn:uuid:8c3292ef-716d-4bee-84f8-0ed306d418d8',
    'urn:uuid:c81a421d-70d0-4351-bcc4-d49392803efd',
    'urn:uuid:2de2d1b9-2293-47ea-9f9a-ae73a2e5f1b5',
  ];

  expectProof(
    'LEXICAL_CARRIER_THREE_DEFS',
    JSON.stringify(lexicalCarrierSchema?.$defs) ===
      JSON.stringify(expectedLexicalCarrierDefinitions) &&
      lexicalCarrierSchema.$ref === '#/$defs/canonicalUuidV4Urn' &&
      uuidBackedSchemaIds.every(
        (schemaId) =>
          schemas.get(schemaId)?.$ref === lexicalCarrierId &&
          JSON.stringify(manifestEntry(schemaId)?.dependencies) ===
            JSON.stringify([lexicalCarrierId]),
      ) &&
      passportIdentitySchema?.properties?.local?.$ref === localIdentifierReference &&
      capabilityKeySchema?.oneOf?.every(
        (branch) => branch.properties?.name?.$ref === localIdentifierReference,
      ) &&
      JSON.stringify(manifestEntry(passportIdentitySchemaId)?.dependencies) ===
        JSON.stringify([lexicalCarrierId, 'urn:uuid:8276cdd7-e089-4a09-851f-7ef6ed23423c']) &&
      JSON.stringify(manifestEntry(capabilityKeySchemaId)?.dependencies) ===
        JSON.stringify([lexicalCarrierId, 'urn:uuid:c81a421d-70d0-4351-bcc4-d49392803efd']) &&
      manifest.schemas.every(
        (entry) =>
          !entry.schemaId.includes('#') &&
          entry.dependencies.every((dependency) => !dependency.includes('#')),
      ),
    'shared lexical carrier architecture',
  );
  expectProof(
    'VERSION_NOMINAL_SEPARATION',
    passportVersionSchemaId !== capabilityVersionSchemaId &&
      passportVersionSchema?.$id === passportVersionSchemaId &&
      capabilityVersionSchema?.$id === capabilityVersionSchemaId &&
      passportVersionSchema.$ref === versionTokenReference &&
      capabilityVersionSchema.$ref === versionTokenReference &&
      passportVersionSchema.$ref !== capabilityVersionSchemaId &&
      capabilityVersionSchema.$ref !== passportVersionSchemaId &&
      JSON.stringify(manifestEntry(passportVersionSchemaId)?.dependencies) ===
        JSON.stringify([lexicalCarrierId]) &&
      JSON.stringify(manifestEntry(capabilityVersionSchemaId)?.dependencies) ===
        JSON.stringify([lexicalCarrierId]) &&
      passportVersionsEqual !== capabilityVersionsEqual,
    'Passport and Capability version nominal separation',
  );

  expect(isIssuerIdentity(uuid8), 'UUID variant 8');
  expect(isAgentIdentity(uuid9), 'UUID variant 9');
  expect(isCapabilityNamespaceIdentity(uuida), 'UUID variant a');
  expect(isImmutableArtifactIdentity(uuidb), 'UUID variant b');
  expect(!isIssuerIdentity('urn:uuid:12345678-1234-5123-8123-123456789abc'), 'UUID version');
  expect(!isIssuerIdentity('urn:uuid:12345678-1234-4123-7123-123456789abc'), 'UUID variant');
  expect(
    !isIssuerIdentity('URN:UUID:12345678-1234-4123-8123-123456789ABC') &&
      !isIssuerIdentity('urn%3Auuid%3A12345678-1234-4123-8123-123456789abc'),
    'UUID exact spelling',
  );
  expect(
    issuerIdentitiesEqual(uuid8, uuid8) && agentIdentitiesEqual(uuid8, uuid8),
    'exact UUID equality',
  );
  expect(passportIdentitiesEqual(passport, reorderedPassport), 'Passport member order');
  expect(
    !passportIdentitiesEqual(passport, { issuer: otherUuid, local: passport.local }),
    'Passport issuer operand',
  );
  expect(
    !passportIdentitiesEqual(passport, { issuer, local: 'fixture.other' }),
    'Passport local operand',
  );
  expect(!isPassportIdentity(passport.local), 'Passport local incomplete');
  expect(passportIssuerMatches(passport, issuer), 'Passport issuer match');
  expect(!passportIssuerMatches(passport, otherUuid), 'Passport issuer mismatch');
  expect(isCapabilityKey(coreKey), 'Core intrinsic validity without allocation');
  expect(
    capabilityKeysEqual(coreKey, { name: coreKey.name, namespaceClass: 'core' }),
    'Core key member order',
  );
  expect(isCapabilityKey(externalKey), 'External namespace validity without authority');
  expect(capabilityKeysEqual(externalKey, { ...externalKey }), 'External key equality');
  expect(
    !capabilityKeysEqual(externalKey, { ...externalKey, namespace: otherUuid }),
    'External namespace operand',
  );
  expect(
    !capabilityKeysEqual(coreKey, {
      namespaceClass: 'external',
      namespace: uuid9,
      name: coreKey.name,
    }),
    'Core and External separation',
  );
  expect(
    capabilityKeysEqual(coreKey, coreKey) &&
      !capabilityScopesEqual(
        { capabilityKey: coreKey, capabilityVersion: 'v1' },
        { capabilityKey: coreKey, capabilityVersion: 'v2' },
      ),
    'Capability version excluded from key equality',
  );
  expect(passportVersionsEqual('v1', 'v1'), 'Passport version exact equality');
  expect(!passportVersionsEqual('v1', 'v01'), 'Passport version no normalization');
  expect(isPassportVersion('latest') && passportVersionsEqual('latest', 'latest'), 'opaque latest');
  expect(
    isPassportVersion('v1.2') && !passportVersionsEqual('v1.2', 'v1.10'),
    'opaque SemVer-looking token',
  );
  expect(capabilityVersionsEqual('v1', 'v1'), 'Capability version exact equality');
  expect(
    !capabilityScopesEqual(
      { capabilityKey: coreKey, capabilityVersion: 'v1' },
      { capabilityKey: externalKey, capabilityVersion: 'v1' },
    ),
    'same version under different capability keys',
  );
  expect(
    typedIdentityValuesAreSeparated('IssuerIdentity', uuid8, 'AgentIdentity', uuid8),
    'Issuer and Agent type separation',
  );
  expect(
    typedIdentityValuesAreSeparated('AgentIdentity', uuid8, 'CapabilityNamespaceIdentity', uuid8),
    'Agent and namespace type separation',
  );
  expect(
    typedIdentityValuesAreSeparated('ImmutableArtifactIdentity', uuid8, 'IssuerIdentity', uuid8),
    'artifact and issuer type separation',
  );
  expect(
    typedArtifactIdentitiesAreSeparated(
      'passportArtifact',
      uuid8,
      'capabilityContractArtifact',
      uuid8,
    ),
    'artifact semantic-class separation',
  );
  expect(
    artifactIdentityIsDistinctFromIntegrityDigest(uuid8, integrityEmpty),
    'artifact identity and digest separation',
  );
  expect(
    artifactHistoryIsConsistent([
      {
        artifactClass: 'passportArtifact',
        artifactIdentity: uuida,
        artifactByteIntegrity: integrityEmpty,
      },
      {
        artifactClass: 'passportArtifact',
        artifactIdentity: uuida,
        artifactByteIntegrity: integrityEmpty,
      },
    ]),
    'stable artifact binding',
  );
  expect(
    artifactHistoryIsConsistent([
      {
        artifactClass: 'passportArtifact',
        artifactIdentity: uuida,
        artifactByteIntegrity: integrityEmpty,
      },
      {
        artifactClass: 'passportArtifact',
        artifactIdentity: uuidb,
        artifactByteIntegrity: integrityA,
      },
    ]),
    'changed bytes use new artifact identity',
  );
  expect(
    !artifactHistoryIsConsistent([
      {
        artifactClass: 'passportArtifact',
        artifactIdentity: uuida,
        artifactByteIntegrity: integrityEmpty,
      },
      {
        artifactClass: 'passportArtifact',
        artifactIdentity: uuida,
        artifactByteIntegrity: integrityA,
      },
    ]),
    'artifact repoint rejection',
  );
  expect(isPassportReference(passportReference), 'Passport reference eligibility');
  expect(
    passportReferenceCoordinatesEqual(passportReference, { ...passportReference }),
    'Passport reference coordinate equality',
  );
  expect(
    passportReferenceMappingsEqual(passportReference, { ...passportReference }),
    'Passport reference mapping equality',
  );
  const conflictingPassportReference = freezeDeep({
    ...passportReference,
    passportArtifact: otherUuid,
  });
  expect(
    !passportReferenceHistoryIsConsistent([passportReference, conflictingPassportReference]),
    'Passport mapping conflict',
  );
  expect(
    !passportReferenceHistoryIsConsistent([conflictingPassportReference, passportReference]),
    'Passport mapping conflict order independence',
  );
  expect(
    passportReferenceHistoryIsConsistent([passportReference, passportReference]),
    'identical Passport record repetition does not invent rejection',
  );
  expectProof(
    'PASSPORT_CROSS_COORDINATE_ARTIFACT_REPOINT_REJECT',
    !passportReferenceHistoryIsConsistent([
      passportReference,
      passportCrossVersionDifferentIntegrity,
    ]),
    'Passport cross-version artifact repoint rejection',
  );
  expectProof(
    'PASSPORT_CROSS_COORDINATE_ARTIFACT_REPOINT_REVERSED_REJECT',
    !passportReferenceHistoryIsConsistent([
      passportCrossVersionDifferentIntegrity,
      passportReference,
    ]),
    'Passport cross-version artifact repoint order independence',
  );
  expect(
    !passportReferenceHistoryIsConsistent([
      passportReference,
      passportCrossIdentityDifferentIntegrity,
    ]),
    'Passport cross-identity artifact repoint rejection',
  );
  expect(
    capabilityContractReferenceCoordinatesEqual(capabilityReference, {
      ...capabilityReference,
    }),
    'capability contract coordinate equality',
  );
  expectProof(
    'SAME_TYPED_ARTIFACT_SAME_INTEGRITY_CROSS_COORDINATE',
    passportReferenceHistoryIsConsistent([passportReference, passportCrossVersionSameIntegrity]) &&
      capabilityContractReferenceHistoryIsConsistent([
        capabilityReference,
        capabilityCrossVersionSameIntegrity,
      ]),
    'same typed artifact and integrity across distinct coordinates',
  );
  expectProof(
    'CAPABILITY_CROSS_COORDINATE_ARTIFACT_REPOINT_REJECT',
    !capabilityContractReferenceHistoryIsConsistent([
      capabilityReference,
      capabilityCrossVersionDifferentIntegrity,
    ]),
    'Capability cross-version artifact repoint rejection',
  );
  expectProof(
    'CAPABILITY_CROSS_COORDINATE_ARTIFACT_REPOINT_REVERSED_REJECT',
    !capabilityContractReferenceHistoryIsConsistent([
      capabilityCrossVersionDifferentIntegrity,
      capabilityReference,
    ]),
    'Capability cross-version artifact repoint order independence',
  );
  expect(
    !capabilityContractReferenceHistoryIsConsistent([
      capabilityReference,
      capabilityCrossKeyDifferentIntegrity,
    ]),
    'Capability cross-key artifact repoint rejection',
  );
  expect(
    !capabilityContractReferenceHistoryIsConsistent([capabilityReference, capabilityReference]),
    'duplicate capability declaration rejection',
  );
  const conflictingCapabilityReference = freezeDeep({
    ...capabilityReference,
    capabilityContractArtifact: otherUuid,
  });
  expect(
    !capabilityContractReferenceHistoryIsConsistent([
      capabilityReference,
      conflictingCapabilityReference,
    ]),
    'conflicting capability declaration rejection',
  );
  expect(
    !capabilityContractReferenceHistoryIsConsistent([
      conflictingCapabilityReference,
      capabilityReference,
    ]),
    'capability conflict order independence',
  );
  expect(
    !isPassportIdentity(null) &&
      !isCapabilityKey([]) &&
      !isPassportVersion(1) &&
      !isCapabilityVersion({}) &&
      !passportReferenceHistoryIsConsistent([{}]) &&
      !capabilityContractReferenceHistoryIsConsistent([{}]),
    'invalid values fail closed',
  );
  const frozenSnapshot = JSON.stringify({
    passport,
    reorderedPassport,
    coreKey,
    externalKey,
    passportReference,
    capabilityReference,
  });
  passportIdentitiesEqual(passport, reorderedPassport);
  capabilityKeysEqual(coreKey, externalKey);
  passportReferenceHistoryIsConsistent([passportReference]);
  capabilityContractReferenceHistoryIsConsistent([capabilityReference]);
  expect(
    JSON.stringify({
      passport,
      reorderedPassport,
      coreKey,
      externalKey,
      passportReference,
      capabilityReference,
    }) === frozenSnapshot,
    'predicates do not mutate frozen input',
  );
  const localName128 = `a${'b'.repeat(126)}z`;
  const localName129 = `a${'b'.repeat(127)}z`;
  const version64 = `a${'b'.repeat(62)}z`;
  const version65 = `a${'b'.repeat(63)}z`;
  const keyValidityVectors = freezeDeep([
    { input: coreKey, expected: true },
    { input: externalKey, expected: true },
    { input: { namespaceClass: 'core', name: localName128 }, expected: true },
    { input: { namespaceClass: 'invalid', name: 'fixture.core' }, expected: false },
    { input: { namespaceClass: 'core', namespace: uuid9, name: 'fixture.core' }, expected: false },
    { input: { namespaceClass: 'external', name: 'fixture.external' }, expected: false },
    {
      input: {
        namespaceClass: 'external',
        namespace: 'urn:uuid:12345678-1234-4123-7123-123456789abc',
        name: 'fixture.external',
      },
      expected: false,
    },
    { input: { namespaceClass: 'core', name: '' }, expected: false },
    { input: { namespaceClass: 'core', name: 'UPPER' }, expected: false },
    { input: { namespaceClass: 'core', name: localName129 }, expected: false },
    { input: { namespaceClass: 'core', name: 'fixture.core', extra: true }, expected: false },
  ]);
  const keyEqualityVectors = freezeDeep([
    { left: coreKey, right: { ...coreKey }, expected: true },
    {
      left: externalKey,
      right: { ...externalKey, namespace: otherUuid },
      expected: false,
    },
  ]);
  const versionValidityVectors = freezeDeep([
    { input: 'a', expected: true },
    { input: version64, expected: true },
    { input: 'latest', expected: true },
    { input: 'v1.2', expected: true },
    { input: 'V1', expected: false },
    { input: '', expected: false },
    { input: null, expected: false },
    { input: version65, expected: false },
  ]);
  const scopeEqualityVectors = freezeDeep([
    {
      left: { capabilityKey: coreKey, capabilityVersion: 'v1', contextual: true },
      right: { capabilityKey: coreKey, capabilityVersion: 'v1', contextual: false },
      expected: true,
    },
  ]);
  expectProof(
    'RELEASE_DATA_EXTRACTION_BASELINE_VECTORS',
    keyValidityVectors.length === 11 &&
      keyEqualityVectors.length === 2 &&
      versionValidityVectors.length === 8 &&
      scopeEqualityVectors.length === 1 &&
      keyValidityVectors.every(({ input, expected }) => isCapabilityKey(input) === expected) &&
      keyEqualityVectors.every(
        ({ left, right, expected }) => capabilityKeysEqual(left, right) === expected,
      ) &&
      versionValidityVectors.every(
        ({ input, expected }) => isCapabilityVersion(input) === expected,
      ) &&
      scopeEqualityVectors.every(
        ({ left, right, expected }) => capabilityScopesEqual(left, right) === expected,
      ),
    'frozen pre-extraction capability predicate vectors',
  );
  expectProof(
    'RELEASE_DATA_SHARED_PREDICATE_OWNER',
    releaseIsCapabilityKey === isCapabilityKey &&
      releaseIsCapabilityVersion === isCapabilityVersion &&
      releaseCapabilityKeysEqual === capabilityKeysEqual &&
      releaseCapabilityScopesEqual === capabilityScopesEqual,
    'release-data shared predicate ownership and re-export identity',
  );

  const issuerIdentitySchemaId = 'urn:uuid:8276cdd7-e089-4a09-851f-7ef6ed23423c';
  const agentIdentitySchemaId = 'urn:uuid:8c3292ef-716d-4bee-84f8-0ed306d418d8';
  const unsupportedSchemaId = 'urn:uuid:16534fa9-8aa1-4324-b6b9-a2a1043682f3';
  const targetBindingFailureVectors = freezeDeep([
    {
      kind: 'value',
      targetSchema: issuerIdentitySchemaId,
      semanticCheck: 'agent-identity',
    },
    {
      kind: 'value',
      targetSchema: issuerIdentitySchemaId,
      semanticCheck: 'typed-identity-separation',
      semanticInput: {
        typedIdentityComparison: { valueType: 'AgentIdentity' },
      },
    },
    {
      kind: 'value',
      targetSchema: unsupportedSchemaId,
      semanticCheck: 'none',
    },
    {
      kind: 'equality',
      targetSchema: issuerIdentitySchemaId,
      semanticCheck: 'issuer-identity',
    },
  ]);
  const inputBindingFailureVectors = freezeDeep([
    {
      kind: 'value',
      targetSchema: issuerIdentitySchemaId,
      semanticCheck: 'issuer-identity',
      semanticInput: { separateIssuer: uuid8 },
    },
    {
      kind: 'value',
      targetSchema: passportIdentitySchemaId,
      semanticCheck: 'passport-issuer-match',
    },
    {
      kind: 'value',
      targetSchema: passportIdentitySchemaId,
      semanticCheck: 'passport-issuer-match',
      semanticInput: { artifactIntegrity: integrityEmpty },
    },
  ]);
  const rawTargetFailureVectors = freezeDeep([
    {
      kind: 'raw-source',
      targetSchema: agentIdentitySchemaId,
    },
  ]);
  expectProof(
    'PARTICIPANT_SEMANTIC_TARGET_BINDING',
    targetBindingFailureVectors.length === 4 &&
      targetBindingFailureVectors.every((testCase) =>
        operationFails(() => assertParticipantFixtureCheckContract(testCase)),
      ),
    'participant target/check/kind contract failure vectors',
  );
  expectProof(
    'PARTICIPANT_SEMANTIC_INPUT_BINDING',
    inputBindingFailureVectors.length === 3 &&
      inputBindingFailureVectors.every((testCase) =>
        operationFails(() => assertParticipantFixtureCheckContract(testCase)),
      ),
    'participant semanticInput contract failure vectors',
  );
  expectProof(
    'PARTICIPANT_RAW_TARGET_BINDING',
    rawTargetFailureVectors.length === 1 &&
      rawTargetFailureVectors.every((testCase) =>
        operationFails(() => assertParticipantFixtureCheckContract(testCase)),
      ),
    'participant raw-source target contract failure vector',
  );
  expect(
    capabilityNamespaceIdentitiesEqual(uuid9, uuid9) &&
      !capabilityNamespaceIdentitiesEqual(uuid9, otherUuid) &&
      immutableArtifactIdentitiesEqual(uuida, uuida) &&
      !immutableArtifactIdentitiesEqual(uuida, otherUuid) &&
      !agentIdentitiesEqual(uuid9, otherUuid),
    'nominal exact equality helpers',
  );
  expectProof(
    'SEMANTIC_REGISTRY_EXACT_COVERAGE',
    assertSemanticRegistryCoverage([fixtureSchemaDeclaringSemanticChecks(semanticCheckIds)]) ===
      semanticCheckIds.length,
    'semantic registry exact coverage',
  );
  const implementedOrphan = semanticCheckIds.find((identifier) => identifier !== 'none');
  expect(
    semanticRegistryCoverageFails(
      semanticCheckIds.filter((identifier) => identifier !== implementedOrphan),
    ),
    'semantic registry rejects an implemented orphan after declaration removal',
  );
  expect(
    semanticRegistryCoverageFails([...semanticCheckIds, 'fixture-declared-but-unimplemented']),
    'semantic registry rejects a declared but unimplemented check',
  );

  return { count, namedProofs };
}
