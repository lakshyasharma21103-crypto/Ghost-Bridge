import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertAllDeclaredPathsProcessed,
  loadFoundationBundle,
  loadManifestAssets,
} from './lib/bundle-loader.mjs';
import { errorMessage, fail } from './lib/errors.mjs';
import { FOUNDATION_FIXTURE_SCHEMA_ID } from './lib/fixture-runner.mjs';
import { idnaRuntimeEvidence } from './lib/idna2008.mjs';
import { loadAuthorityIndex, verifyBundleProvenance } from './lib/provenance.mjs';
import {
  R1_RAW_FIXTURE_SCHEMA_ID,
  R1_WIRE_FIXTURE_SCHEMA_ID,
  runR1Fixtures,
} from './lib/r1-fixture-runner.mjs';
import {
  assertValidatorImportIsolation,
  createOfflineSchemaValidator,
  scanBundleSchemaSafety,
  validateAssetSchemas,
} from './lib/schema-safety.mjs';
import {
  runArtifactExactByteSelfTests,
  runR1SemanticPredicateSelfTests,
  runRawFixtureCarrierSelfTests,
  runRawJsonParserSelfTests,
} from './lib/self-tests.mjs';
import {
  assertSemanticCheckDeclarations,
  assertSemanticRegistryCoverage,
} from './lib/semantic-checks.mjs';

const require = createRequire(import.meta.url);
const ajvVersion = require('ajv/package.json').version;
const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), '../..');

const paths = Object.freeze({
  decisions: 'protocol/decisions',
  fixtures: 'protocol/fixtures/wire/e1.r0-draft.1/foundation',
  manifest: 'protocol/schemas/e1.r0-draft.1/foundation-manifest.json',
  registries: 'protocol/registries/e1.r0-draft.1',
  representationProfile: 'docs/protocol/d2-rp-01-e1.r0-draft.1-canonical-representation-profile.md',
  schemas: 'protocol/schemas/e1.r0-draft.1',
  specification: 'protocol/specification/e1.r0-draft.1',
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
  const loadedAssets = loadManifestAssets({
    repositoryRoot,
    manifest: bundle.manifest,
    schemaIds: bundle.schemaIds,
  });
  validateAssetSchemas({ ajv, manifest: bundle.manifest, assets: loadedAssets.assets });

  const inventory = loadedAssets.assets.get(bundle.manifest.semanticConstraintInventory.path);
  const authority = loadAuthorityIndex({
    repositoryRoot,
    specificationRoot: paths.specification,
    decisionsRoot: paths.decisions,
    representationProfilePath: paths.representationProfile,
  });
  const provenance = verifyBundleProvenance({ manifest: bundle.manifest, inventory, authority });

  const semanticSchemas = [FOUNDATION_FIXTURE_SCHEMA_ID, R1_WIRE_FIXTURE_SCHEMA_ID].map(
    (schemaId) => bundle.schemas.get(schemaId),
  );
  for (const schema of semanticSchemas) assertSemanticCheckDeclarations(schema);
  const semanticRegistryCoverage = assertSemanticRegistryCoverage(semanticSchemas);
  const fixtures = runR1Fixtures({ manifest: bundle.manifest, assets: loadedAssets.assets, ajv });
  const declaredR1FixturePaths = bundle.manifest.fixtures
    .filter(
      (entry) =>
        entry.schemaId === R1_WIRE_FIXTURE_SCHEMA_ID || entry.schemaId === R1_RAW_FIXTURE_SCHEMA_ID,
    )
    .map((entry) => entry.path);
  const processing = assertAllDeclaredPathsProcessed(
    'R1 fixture',
    declaredR1FixturePaths,
    fixtures.processedFixturePaths,
  );
  const requiredTargetIds = new Set([
    'urn:uuid:d62d6621-999a-43f1-bf80-08c253750ac9',
    'urn:uuid:ee29d276-909a-4189-8828-421bbd369735',
    'urn:uuid:0e6ccf5f-fbef-41eb-a4b8-dbe1c895d381',
    'urn:uuid:573ee187-8f71-4747-b7d3-c2d3baf86964',
    'urn:uuid:16534fa9-8aa1-4324-b6b9-a2a1043682f3',
    'urn:uuid:ac23dacd-18f3-4920-aa45-15aa695f1234',
  ]);
  for (const schemaId of requiredTargetIds) {
    if (!fixtures.fixtureTargetSchemaIds.has(schemaId))
      fail(`R1 schema/predicate has no wire fixture coverage: ${schemaId}`);
  }
  const selfTests = runRawJsonParserSelfTests();
  const carrierSelfTests = runRawFixtureCarrierSelfTests();
  const semanticSelfTests = runR1SemanticPredicateSelfTests();
  const artifactSelfTests = runArtifactExactByteSelfTests();
  const importIsolation = assertValidatorImportIsolation(repositoryRoot, paths.validation);

  console.log(`R1_VALIDATOR Ajv ${ajvVersion} Draft 2020-12`);
  console.log(`R1_UNICODE_VERSION ${idnaRuntimeEvidence.unicodeVersion}`);
  console.log(`R1_UNICODE_SOURCE_SET_SHA256 ${idnaRuntimeEvidence.sourceSetSha256}`);
  console.log(`R1_IDNA2008_GENERATED_SHA256 ${idnaRuntimeEvidence.idna2008Sha256}`);
  console.log(`R1_IDNA_PROPERTIES_GENERATED_SHA256 ${idnaRuntimeEvidence.idnaPropertiesSha256}`);
  console.log(`R1_PUNYCODE_MECHANISM ${idnaRuntimeEvidence.punycodeMechanism}`);
  console.log('R1_UTS46_MAPPING PROHIBITED_NOT_USED');
  console.log(`R1_BIDI_SCOPE ${idnaRuntimeEvidence.bidiScope}`);
  console.log(`R1_META_SCHEMA PASS ${metaSchemaPasses}/${bundle.schemas.size}`);
  console.log(`R1_OFFLINE_REFS PASS ${schemaSafety.referenceCount}`);
  console.log(`R1_PROVENANCE PASS ${provenance.constraintCount}`);
  console.log(`R1_WIRE_FIXTURES PASS ${fixtures.wireCount}`);
  console.log(`R1_RAW_FIXTURES PASS ${fixtures.rawCount}`);
  console.log(`R1_SEMANTIC_CHECKS PASS ${fixtures.semanticCount}`);
  console.log(`R1_SEMANTIC_REGISTRY_COVERAGE PASS ${semanticRegistryCoverage}`);
  console.log(`R1_FIXTURE_PROCESSING_COVERAGE PASS ${processing.processed}/${processing.declared}`);
  console.log(`R1_RAW_SELF_TESTS PASS ${selfTests}`);
  console.log(`R1_RAW_CARRIER_SELF_TESTS PASS ${carrierSelfTests}`);
  console.log(`R1_SEMANTIC_SELF_TESTS PASS ${semanticSelfTests}`);
  console.log(`R1_ARTIFACT_SELF_TESTS PASS ${artifactSelfTests}`);
  console.log(
    `R1_VALIDATOR_IMPORT_ISOLATION PASS files=${importIsolation.scannedFiles} modules=${importIsolation.scannedModules}`,
  );
  console.log('R1_SECOND_VALIDATOR_EVIDENCE_PENDING');
  console.log('D2_01R1_REVISION_2_VALIDATION PASS');
}

try {
  main();
} catch (error) {
  console.error(`D2_01R1_REVISION_2_VALIDATION FAIL: ${errorMessage(error)}`);
  process.exitCode = 1;
}
