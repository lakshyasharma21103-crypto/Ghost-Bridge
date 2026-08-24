import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertAllDeclaredPathsProcessed,
  loadFoundationBundle,
  loadManifestAssets,
} from './lib/bundle-loader.mjs';
import { errorMessage, fail } from './lib/errors.mjs';
import { FOUNDATION_FIXTURE_SCHEMA_ID, runFoundationFixtures } from './lib/fixture-runner.mjs';
import { runIdentityCapabilitySelfTests } from './lib/identity-capability-self-tests.mjs';
import {
  PARTICIPANT_IDENTITY_CAPABILITY_FIXTURE_SCHEMA_ID,
  participantFixtureCheckContractIds,
  runParticipantIdentityCapabilityFixtures,
} from './lib/participant-identity-capability-fixture-runner.mjs';
import {
  PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID,
  PROTOCOL_RELEASE_REQUIRED_PROOF_IDS,
  runProtocolReleaseFixtures,
} from './lib/protocol-release-fixture-runner.mjs';
import { runProtocolReleaseSelfTests } from './lib/protocol-release-self-tests.mjs';
import { loadAuthorityIndex, verifyBundleProvenance } from './lib/provenance.mjs';
import {
  loadReleaseDataFiles,
  validateReleaseDataBundleFoundationRegression,
} from './lib/release-data-loader.mjs';
import { R1_WIRE_FIXTURE_SCHEMA_ID, runR1Fixtures } from './lib/r1-fixture-runner.mjs';
import {
  assertValidatorImportIsolation,
  createOfflineSchemaValidator,
  scanBundleSchemaSafety,
  validateAssetSchemas,
} from './lib/schema-safety.mjs';
import {
  runR1SemanticPredicateSelfTests,
  runRawFixtureCarrierSelfTests,
  runRawJsonParserSelfTests,
  runSeededValidatorSelfTests,
} from './lib/self-tests.mjs';
import {
  assertSemanticCheckDeclarations,
  assertSemanticRegistryCoverage,
  declaredSemanticCheckIds,
} from './lib/semantic-checks.mjs';

const require = createRequire(import.meta.url);
const ajvVersion = require('ajv/package.json').version;
const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), '../..');

const paths = Object.freeze({
  manifest: 'protocol/schemas/e1.r0-draft.1/foundation-manifest.json',
  schemas: 'protocol/schemas/e1.r0-draft.1',
  fixtures: 'protocol/fixtures/wire/e1.r0-draft.1/foundation',
  registries: 'protocol/registries/e1.r0-draft.1',
  specification: 'protocol/specification/e1.r0-draft.1',
  decisions: 'protocol/decisions',
  representationProfile: 'docs/protocol/d2-rp-01-e1.r0-draft.1-canonical-representation-profile.md',
  validation: 'protocol/schema-validation',
});

function main() {
  const bundle = loadFoundationBundle({
    repositoryRoot,
    manifestPath: paths.manifest,
    schemaRoot: paths.schemas,
    fixtureRoot: paths.fixtures,
    registryRoot: paths.registries,
  });
  const schemaSafety = scanBundleSchemaSafety(bundle);
  const { ajv, metaSchemaPasses } = createOfflineSchemaValidator(bundle.schemas);
  const releaseManifestEntry = bundle.manifest.registries.find(
    (entry) => entry.path === paths.registries + '/release-registry.json',
  );
  if (!releaseManifestEntry) fail('No declared release-data manifest was found');
  const validateRegistry = ajv.getSchema(releaseManifestEntry.schemaId);
  const validatorsBySchema = new Map(
    Array.from(bundle.schemaIds, (schemaId) => [schemaId, ajv.getSchema(schemaId)]),
  );
  const releaseDataBundle = loadReleaseDataFiles(repositoryRoot);
  const releaseData = validateReleaseDataBundleFoundationRegression({
    bundle: releaseDataBundle,
    validateManifest: validateRegistry,
    validatorsBySchema,
  });
  const loadedAssets = loadManifestAssets({
    repositoryRoot,
    manifest: bundle.manifest,
    schemaIds: bundle.schemaIds,
  });
  validateAssetSchemas({ ajv, manifest: bundle.manifest, assets: loadedAssets.assets });

  const processedRegistryPaths = new Set([
    releaseManifestEntry.path,
    ...Array.from(
      releaseData.artifactsByClass.values(),
      (artifact) =>
        bundle.manifest.registries.find((entry) => entry.schemaId === artifact.artifactSchema)
          ?.path,
    ),
  ]);
  if (processedRegistryPaths.has(undefined))
    fail('A loaded release-data artifact has no foundation-manifest entry');
  const registryProcessing = assertAllDeclaredPathsProcessed(
    'registry',
    bundle.manifest.registries.map((entry) => entry.path),
    processedRegistryPaths,
  );
  const inventory = loadedAssets.assets.get(bundle.manifest.semanticConstraintInventory.path);
  const authority = loadAuthorityIndex({
    repositoryRoot,
    specificationRoot: paths.specification,
    decisionsRoot: paths.decisions,
    representationProfilePath: paths.representationProfile,
  });
  const provenance = verifyBundleProvenance({ manifest: bundle.manifest, inventory, authority });
  const fixtureSchemaIds = new Set(
    bundle.manifest.fixtures
      .map((entry) => entry.schemaId)
      .filter(
        (schemaId) =>
          schemaId === FOUNDATION_FIXTURE_SCHEMA_ID ||
          schemaId === R1_WIRE_FIXTURE_SCHEMA_ID ||
          schemaId === PARTICIPANT_IDENTITY_CAPABILITY_FIXTURE_SCHEMA_ID,
      ),
  );
  let semanticCheckDeclarationCount = 0;
  const semanticFixtureSchemas = [];
  for (const fixtureSchemaId of fixtureSchemaIds) {
    const fixtureSchema = bundle.schemas.get(fixtureSchemaId);
    semanticFixtureSchemas.push(fixtureSchema);
    semanticCheckDeclarationCount += assertSemanticCheckDeclarations(fixtureSchema);
  }
  const semanticRegistryCoverage = assertSemanticRegistryCoverage(semanticFixtureSchemas);
  const participantFixtureSchema = bundle.schemas.get(
    PARTICIPANT_IDENTITY_CAPABILITY_FIXTURE_SCHEMA_ID,
  );
  const declaredParticipantCheckIds = declaredSemanticCheckIds(participantFixtureSchema);
  if (
    JSON.stringify(declaredParticipantCheckIds) !==
    JSON.stringify(participantFixtureCheckContractIds)
  ) {
    fail(
      `Participant fixture check contract mismatch: declared=${JSON.stringify(declaredParticipantCheckIds)} contracted=${JSON.stringify(participantFixtureCheckContractIds)}`,
    );
  }
  const neutralIdentityCarrierId = 'urn:uuid:5cbc8490-c503-4a92-bd28-4a2f3f58f9f5';
  const immutableArtifactIdentityId = 'urn:uuid:2de2d1b9-2293-47ea-9f9a-ae73a2e5f1b5';
  const participantFixtureManifestEntry = bundle.manifest.schemas.find(
    (entry) => entry.schemaId === PARTICIPANT_IDENTITY_CAPABILITY_FIXTURE_SCHEMA_ID,
  );
  if (
    participantFixtureSchema?.$defs?.typedIdentityComparison?.properties?.otherValue?.$ref !==
      neutralIdentityCarrierId ||
    !participantFixtureManifestEntry?.dependencies.includes(neutralIdentityCarrierId) ||
    !participantFixtureManifestEntry.dependencies.includes(immutableArtifactIdentityId)
  ) {
    fail('Participant typed-identity comparison does not use the neutral UUID carrier');
  }
  const directNamedProofs = new Set(['TYPED_IDENTITY_COMPARISON_NEUTRAL_CARRIER']);
  const fixtures = runFoundationFixtures({
    manifest: bundle.manifest,
    assets: loadedAssets.assets,
    ajv,
  });
  const r1Fixtures = runR1Fixtures({
    manifest: bundle.manifest,
    assets: loadedAssets.assets,
    ajv,
  });
  const participantIdentityCapabilityFixtures = runParticipantIdentityCapabilityFixtures({
    manifest: bundle.manifest,
    assets: loadedAssets.assets,
    ajv,
  });
  const protocolReleaseFixtures = runProtocolReleaseFixtures({
    manifest: bundle.manifest,
    assets: loadedAssets.assets,
    ajv,
  });
  const processedFixturePaths = new Set([
    ...fixtures.processedFixturePaths,
    ...r1Fixtures.processedFixturePaths,
    ...participantIdentityCapabilityFixtures.processedFixturePaths,
    ...protocolReleaseFixtures.processedFixturePaths,
  ]);
  const fixtureProcessing = assertAllDeclaredPathsProcessed(
    'fixture',
    bundle.manifest.fixtures.map((entry) => entry.path),
    processedFixturePaths,
  );
  const allFixtureTargetSchemaIds = new Set([
    ...fixtures.fixtureTargetSchemaIds,
    ...r1Fixtures.fixtureTargetSchemaIds,
    ...participantIdentityCapabilityFixtures.fixtureTargetSchemaIds,
    ...protocolReleaseFixtures.fixtureTargetSchemaIds,
  ]);
  const combinedFixtureCounts = new Map(fixtures.fixtureCounts);
  for (const [classification, count] of participantIdentityCapabilityFixtures.fixtureCounts) {
    combinedFixtureCounts.set(
      classification,
      (combinedFixtureCounts.get(classification) ?? 0) + count,
    );
  }
  for (const [classification, count] of protocolReleaseFixtures.fixtureCounts) {
    combinedFixtureCounts.set(
      classification,
      (combinedFixtureCounts.get(classification) ?? 0) + count,
    );
  }
  const fixtureCoveredAssetClasses = new Set([
    'representation-helper',
    'wire-primitive',
    'wire-foundation-object',
  ]);
  for (const entry of bundle.manifest.schemas.filter((item) =>
    fixtureCoveredAssetClasses.has(item.assetClass),
  )) {
    if (!allFixtureTargetSchemaIds.has(entry.schemaId))
      fail(`Foundation schema has no fixture coverage: ${entry.schemaId}`);
  }
  const importIsolation = assertValidatorImportIsolation(repositoryRoot, paths.validation);

  const rawJsonSelfTests = runRawJsonParserSelfTests();
  const rawCarrierSelfTests = runRawFixtureCarrierSelfTests();
  const r1SemanticSelfTests = runR1SemanticPredicateSelfTests();
  const participantIdentityCapabilitySelfTests = runIdentityCapabilitySelfTests({
    schemas: bundle.schemas,
    manifest: bundle.manifest,
  });
  const protocolReleaseSelfTests = runProtocolReleaseSelfTests({
    schemas: bundle.schemas,
    manifest: bundle.manifest,
    fixtureCorpusValidator: ajv.getSchema(PROTOCOL_RELEASE_FIXTURE_SCHEMA_ID),
  });
  const seededSelfTests = runSeededValidatorSelfTests({
    bundle,
    registry: releaseDataBundle.manifest,
    validateRegistry,
  });
  const completedNamedProofs = new Set([
    ...participantIdentityCapabilitySelfTests.namedProofs,
    ...protocolReleaseFixtures.namedProofs,
    ...protocolReleaseSelfTests.namedProofs,
    ...seededSelfTests.namedProofs,
    ...directNamedProofs,
  ]);
  const requiredEvidenceProofIds = Object.freeze([
    'PASSPORT_CROSS_COORDINATE_ARTIFACT_REPOINT_REJECT',
    'PASSPORT_CROSS_COORDINATE_ARTIFACT_REPOINT_REVERSED_REJECT',
    'CAPABILITY_CROSS_COORDINATE_ARTIFACT_REPOINT_REJECT',
    'CAPABILITY_CROSS_COORDINATE_ARTIFACT_REPOINT_REVERSED_REJECT',
    'SAME_TYPED_ARTIFACT_SAME_INTEGRITY_CROSS_COORDINATE',
    'SEMANTIC_REGISTRY_EXACT_COVERAGE',
    'TYPED_IDENTITY_COMPARISON_NEUTRAL_CARRIER',
    'EXTERNAL_SCHEMA_FRAGMENT_SAFETY',
    'LEXICAL_CARRIER_THREE_DEFS',
    'VERSION_NOMINAL_SEPARATION',
    'PARTICIPANT_SEMANTIC_TARGET_BINDING',
    'PARTICIPANT_SEMANTIC_INPUT_BINDING',
    'PARTICIPANT_RAW_TARGET_BINDING',
    'RELEASE_DATA_EXTRACTION_BASELINE_VECTORS',
    'RELEASE_DATA_SHARED_PREDICATE_OWNER',
  ]);
  for (const proofId of requiredEvidenceProofIds) {
    if (!completedNamedProofs.has(proofId))
      fail(`Mandatory named proof did not execute: ${proofId}`);
  }
  completedNamedProofs.add('REQUIRED_NAMED_PROOF_BINDING');
  const historicalNamedProofOutputIds = Object.freeze([
    ...requiredEvidenceProofIds,
    'REQUIRED_NAMED_PROOF_BINDING',
  ]);
  for (const proofId of PROTOCOL_RELEASE_REQUIRED_PROOF_IDS) {
    if (!completedNamedProofs.has(proofId)) {
      fail(`Mandatory ProtocolRelease named proof did not execute: ${proofId}`);
    }
  }
  completedNamedProofs.add('PROTOCOL_RELEASE_REQUIRED_NAMED_PROOF_BINDING');
  const protocolReleaseNamedProofOutputIds = Object.freeze([
    ...PROTOCOL_RELEASE_REQUIRED_PROOF_IDS,
    'PROTOCOL_RELEASE_REQUIRED_NAMED_PROOF_BINDING',
  ]);
  const namedProofOutputIds = Object.freeze([
    ...historicalNamedProofOutputIds,
    ...protocolReleaseNamedProofOutputIds,
  ]);
  const printNamedProof = (proofId) => {
    if (!completedNamedProofs.has(proofId))
      fail(`Named PASS output is not evidence-bound: ${proofId}`);
    console.log(`${proofId} PASS`);
  };
  const printProtocolReleasePass = (proofIds, output) => {
    for (const proofId of proofIds) {
      if (!completedNamedProofs.has(proofId)) {
        fail(`ProtocolRelease PASS output is not evidence-bound: ${proofId}`);
      }
    }
    console.log(output);
  };

  console.log(`VALIDATOR Ajv ${ajvVersion} Draft 2020-12`);
  console.log(`SCHEMAS ${bundle.schemas.size}`);
  console.log(`UNIQUE_SCHEMA_IDS ${bundle.schemaIds.size}`);
  console.log(`MANIFEST_SCHEMA_ENTRIES ${bundle.manifest.schemas.length}`);
  console.log(
    `MACHINE_ASSET_DISK_COVERAGE PASS schemas=${bundle.machineAssetCoverage.schemaCount} schema-json=${bundle.machineAssetCoverage.schemaJsonAssetCount} fixtures=${bundle.machineAssetCoverage.fixtureCount} registries=${bundle.machineAssetCoverage.registryCount}`,
  );
  console.log(
    `DECLARED_PATH_ROLE_UNIQUENESS PASS ${bundle.machineAssetCoverage.declaredPathCount}`,
  );
  console.log(`META_SCHEMA PASS ${metaSchemaPasses}/${bundle.schemas.size}`);
  console.log(`OFFLINE_REFS PASS ${schemaSafety.referenceCount}`);
  console.log('DIRECT_DEPENDENCY_CLOSURE PASS');
  console.log(
    `PROVENANCE PASS ${authority.requirementIds.size} REQ_IDS ${authority.decisionIds.size} H_IDS`,
  );
  console.log(`SEMANTIC_CONSTRAINTS ${provenance.constraintCount}`);
  console.log(`DEFERRED_TYPES ${bundle.manifest.deferred.length}`);
  console.log(
    `FIXTURES ${
      fixtures.fixtureCount +
      r1Fixtures.fixtureCount +
      participantIdentityCapabilityFixtures.fixtureCount +
      protocolReleaseFixtures.fixtureCount
    }`,
  );
  console.log(`FIXTURE_TARGET_SCHEMAS ${allFixtureTargetSchemaIds.size}`);
  console.log(
    `FIXTURE_EXECUTION_COVERAGE PASS ${fixtureProcessing.processed}/${fixtureProcessing.declared}`,
  );
  for (const [classification, count] of [...combinedFixtureCounts.entries()].sort(
    ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
  )) {
    console.log(`FIXTURE_CLASS ${classification} ${count}`);
  }
  console.log(`R1_WIRE_FIXTURES PASS ${r1Fixtures.wireCount}`);
  console.log(`R1_RAW_FIXTURES PASS ${r1Fixtures.rawCount}`);
  console.log(
    `PARTICIPANT_IDENTITY_CAPABILITY_FIXTURES PASS ${participantIdentityCapabilityFixtures.fixtureCount}`,
  );
  console.log(
    `PARTICIPANT_IDENTITY_CAPABILITY_RAW_FIXTURES PASS ${participantIdentityCapabilityFixtures.rawCount}`,
  );
  console.log(
    `PARTICIPANT_IDENTITY_CAPABILITY_SEMANTIC_CHECKS PASS ${participantIdentityCapabilityFixtures.semanticCount}`,
  );
  printProtocolReleasePass(
    ['PROTOCOL_RELEASE_LITERAL_ORACLES_EXECUTED'],
    `PROTOCOL_RELEASE_FIXTURES PASS ${protocolReleaseFixtures.fixtureCount}`,
  );
  printProtocolReleasePass(
    ['PROTOCOL_RELEASE_LITERAL_ORACLES_EXECUTED'],
    `PROTOCOL_RELEASE_SEMANTIC_EXECUTIONS PASS ${protocolReleaseFixtures.semanticCount}`,
  );
  printProtocolReleasePass(
    ['PROTOCOL_RELEASE_LITERAL_ORACLES_EXECUTED'],
    `PROTOCOL_RELEASE_EQUALITY_EXECUTIONS PASS ${protocolReleaseFixtures.equalityCount}`,
  );
  printProtocolReleasePass(
    ['PROTOCOL_RELEASE_LITERAL_ORACLES_EXECUTED'],
    `PROTOCOL_RELEASE_COMPARATOR_EXECUTIONS PASS ${protocolReleaseFixtures.comparatorCount}`,
  );
  printProtocolReleasePass(
    ['PROTOCOL_RELEASE_TARGET_COVERAGE_EXECUTED'],
    `PROTOCOL_RELEASE_TARGET_COVERAGE PASS ${protocolReleaseFixtures.fixtureTargetSchemaIds.size}`,
  );
  console.log(
    `SEMANTIC_CHECKS PASS ${
      fixtures.semanticCount +
      r1Fixtures.semanticCount +
      participantIdentityCapabilityFixtures.semanticCount +
      protocolReleaseFixtures.semanticCount
    }`,
  );
  console.log(`SEMANTIC_CHECK_IDENTIFIERS PASS ${semanticCheckDeclarationCount}`);
  console.log(`SEMANTIC_REGISTRY_COVERAGE PASS ${semanticRegistryCoverage}`);
  for (const proofId of namedProofOutputIds) printNamedProof(proofId);
  for (const { diagnostic, result } of protocolReleaseSelfTests.diagnosticResults) {
    printProtocolReleasePass(
      ['PROTOCOL_RELEASE_SEEDED_DIAGNOSTICS_EXECUTED'],
      `PROTOCOL_RELEASE_DIAGNOSTIC ${diagnostic} ${result}`,
    );
  }
  console.log(
    `REGISTRY_EXACT_SET PASS classes=${releaseData.artifactsByClass.size} facets=${releaseData.facetCount} auth=${releaseData.authenticationProfileCount}`,
  );
  console.log(
    `REGISTRY_PROCESSING_COVERAGE PASS ${registryProcessing.processed}/${registryProcessing.declared}`,
  );
  console.log('REGISTRY_ORDER_INDEPENDENCE PASS');
  console.log('TIMESTAMP_COMPARISON PASS ASCII_CODE_UNIT');
  console.log(`RAW_JSON_PARSER_SELF_TESTS PASS ${rawJsonSelfTests}`);
  console.log(`RAW_FIXTURE_CARRIER_SELF_TESTS PASS ${rawCarrierSelfTests}`);
  console.log(`R1_SEMANTIC_PREDICATE_SELF_TESTS PASS ${r1SemanticSelfTests}`);
  console.log(
    `PARTICIPANT_IDENTITY_CAPABILITY_SELF_TESTS PASS ${participantIdentityCapabilitySelfTests.count}`,
  );
  printProtocolReleasePass(
    [
      'PROTOCOL_RELEASE_SEEDED_DIAGNOSTICS_EXECUTED',
      'PROTOCOL_RELEASE_VALIDATION_BOUNDARIES_EXECUTED',
      'PROTOCOL_RELEASE_INVALID_OPERAND_REJECTION_EXECUTED',
      'PROTOCOL_RELEASE_COMPARATOR_TOTAL_ORDER_EXECUTED',
      'PROTOCOL_RELEASE_COMPARATOR_DETERMINISM_EXECUTED',
    ],
    `PROTOCOL_RELEASE_SELF_TESTS PASS ${protocolReleaseSelfTests.count}`,
  );
  console.log(`PATH_POLICY_SELF_TESTS PASS ${seededSelfTests.pathCount}`);
  console.log(`REGISTRY_SELF_TESTS PASS ${seededSelfTests.registryCount}`);
  console.log(`ARTIFACT_EXACT_BYTE_SELF_TESTS PASS ${seededSelfTests.artifactCount}`);
  console.log(`DIRECTORY_ENTRY_SELF_TESTS PASS ${seededSelfTests.directoryEntryCount}`);
  console.log(`ANCESTOR_COMPONENT_SELF_TESTS PASS ${seededSelfTests.ancestorComponentCount}`);
  console.log(
    `MACHINE_ASSET_COVERAGE_SELF_TESTS PASS ${seededSelfTests.machineAssetCoverageCount}`,
  );
  console.log(`CLOSED_CORE_SELF_TESTS PASS ${seededSelfTests.closedCoreCount}`);
  console.log(
    `FIXTURE_CLASSIFICATION_SELF_TESTS PASS ${seededSelfTests.fixtureClassificationCount}`,
  );
  console.log(
    `EXTERNAL_SCHEMA_FRAGMENT_SELF_TESTS PASS ${seededSelfTests.externalSchemaFragmentSafetyCount}`,
  );
  console.log(`SEEDED_VALIDATOR_SELF_TESTS PASS ${seededSelfTests.totalCount}`);
  console.log(`VALIDATOR_SOURCE_FILES ${importIsolation.scannedFiles}`);
  console.log(`VALIDATOR_MODULES ${importIsolation.scannedModules}`);
  console.log('STATIC_SAFETY PASS');
  console.log('SECOND_VALIDATOR_EVIDENCE_PENDING');
  console.log('FOUNDATION_VALIDATION PASS');
}

try {
  main();
} catch (error) {
  console.error(`FOUNDATION_VALIDATION FAIL: ${errorMessage(error)}`);
  process.exitCode = 1;
}
