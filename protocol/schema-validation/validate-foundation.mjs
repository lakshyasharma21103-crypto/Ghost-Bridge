import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertAllDeclaredPathsProcessed, loadFoundationBundle, loadManifestAssets } from "./lib/bundle-loader.mjs";
import { errorMessage, fail } from "./lib/errors.mjs";
import { runFoundationFixtures } from "./lib/fixture-runner.mjs";
import { loadAuthorityIndex, verifyBundleProvenance } from "./lib/provenance.mjs";
import { assertRecognizedAllocationRegistry, validateReleaseRegistry } from "./lib/registry-validation.mjs";
import { assertValidatorImportIsolation, createOfflineSchemaValidator, scanBundleSchemaSafety, validateAssetSchemas } from "./lib/schema-safety.mjs";
import { runRawJsonParserSelfTests, runSeededValidatorSelfTests } from "./lib/self-tests.mjs";
import { assertSemanticCheckDeclarations } from "./lib/semantic-checks.mjs";

const require = createRequire(import.meta.url);
const ajvVersion = require("ajv/package.json").version;
const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");

const paths = Object.freeze({
  manifest: "protocol/schemas/e1.r0-draft.1/foundation-manifest.json",
  schemas: "protocol/schemas/e1.r0-draft.1",
  fixtures: "protocol/fixtures/wire/e1.r0-draft.1/foundation",
  registries: "protocol/registries/e1.r0-draft.1",
  specification: "protocol/specification/e1.r0-draft.1",
  decisions: "protocol/decisions",
  representationProfile: "docs/protocol/d2-rp-01-e1.r0-draft.1-canonical-representation-profile.md",
  validation: "protocol/schema-validation",
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

  const registryResults = [];
  const processedRegistryPaths = new Set();
  for (const entry of bundle.manifest.registries) {
    assertRecognizedAllocationRegistry({ entry, manifest: bundle.manifest });
    const registry = loadedAssets.assets.get(entry.path);
    const validateRegistry = ajv.getSchema(entry.schemaId);
    if (registry === undefined) fail(`Declared registry was not loaded: ${entry.path}`);
    registryResults.push({
      entry,
      registry,
      validateRegistry,
      result: validateReleaseRegistry({
        registry,
        validateRegistry,
        errorsText: () => ajv.errorsText(validateRegistry.errors),
      }),
    });
    processedRegistryPaths.add(entry.path);
  }
  if (registryResults.length === 0) fail("No declared release-allocation registry was found");
  const registryProcessing = assertAllDeclaredPathsProcessed(
    "registry",
    bundle.manifest.registries.map((entry) => entry.path),
    processedRegistryPaths,
  );
  registryResults.sort((left, right) => (left.entry.path < right.entry.path ? -1 : left.entry.path > right.entry.path ? 1 : 0));

  const inventory = loadedAssets.assets.get(bundle.manifest.semanticConstraintInventory.path);
  const authority = loadAuthorityIndex({
    repositoryRoot,
    specificationRoot: paths.specification,
    decisionsRoot: paths.decisions,
    representationProfilePath: paths.representationProfile,
  });
  const provenance = verifyBundleProvenance({ manifest: bundle.manifest, inventory, authority });
  const fixtureSchemaIds = new Set(bundle.manifest.fixtures.map((entry) => entry.schemaId));
  let semanticCheckDeclarationCount = 0;
  for (const fixtureSchemaId of fixtureSchemaIds) {
    semanticCheckDeclarationCount += assertSemanticCheckDeclarations(bundle.schemas.get(fixtureSchemaId));
  }
  const fixtures = runFoundationFixtures({
    manifest: bundle.manifest,
    assets: loadedAssets.assets,
    ajv,
  });
  const fixtureProcessing = assertAllDeclaredPathsProcessed(
    "fixture",
    bundle.manifest.fixtures.map((entry) => entry.path),
    fixtures.processedFixturePaths,
  );
  const importIsolation = assertValidatorImportIsolation(repositoryRoot, paths.validation);

  const rawJsonSelfTests = runRawJsonParserSelfTests();
  const registry = registryResults[0];
  const seededSelfTests = runSeededValidatorSelfTests({
    bundle,
    registry: registry.registry,
    validateRegistry: registry.validateRegistry,
  });

  console.log(`VALIDATOR Ajv ${ajvVersion} Draft 2020-12`);
  console.log(`SCHEMAS ${bundle.schemas.size}`);
  console.log(`UNIQUE_SCHEMA_IDS ${bundle.schemaIds.size}`);
  console.log(`MANIFEST_SCHEMA_ENTRIES ${bundle.manifest.schemas.length}`);
  console.log(`MACHINE_ASSET_DISK_COVERAGE PASS schemas=${bundle.machineAssetCoverage.schemaCount} schema-json=${bundle.machineAssetCoverage.schemaJsonAssetCount} fixtures=${bundle.machineAssetCoverage.fixtureCount} registries=${bundle.machineAssetCoverage.registryCount}`);
  console.log(`DECLARED_PATH_ROLE_UNIQUENESS PASS ${bundle.machineAssetCoverage.declaredPathCount}`);
  console.log(`META_SCHEMA PASS ${metaSchemaPasses}/${bundle.schemas.size}`);
  console.log(`OFFLINE_REFS PASS ${schemaSafety.referenceCount}`);
  console.log("DIRECT_DEPENDENCY_CLOSURE PASS");
  console.log(`PROVENANCE PASS ${authority.requirementIds.size} REQ_IDS ${authority.decisionIds.size} H_IDS`);
  console.log(`SEMANTIC_CONSTRAINTS ${provenance.constraintCount}`);
  console.log(`DEFERRED_TYPES ${bundle.manifest.deferred.length}`);
  console.log(`FIXTURES ${fixtures.fixtureCount}`);
  console.log(`FIXTURE_TARGET_SCHEMAS ${fixtures.fixtureTargetSchemaIds.size}`);
  console.log(`FIXTURE_EXECUTION_COVERAGE PASS ${fixtureProcessing.processed}/${fixtureProcessing.declared}`);
  for (const [classification, count] of [...fixtures.fixtureCounts.entries()].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))) {
    console.log(`FIXTURE_CLASS ${classification} ${count}`);
  }
  console.log(`SEMANTIC_CHECKS PASS ${fixtures.semanticCount}`);
  console.log(`SEMANTIC_CHECK_IDENTIFIERS PASS ${semanticCheckDeclarationCount}`);
  console.log(`REGISTRY_EXACT_SET PASS facets=${registry.result.facetCount} auth=${registry.result.authenticationProfileCount}`);
  console.log(`REGISTRY_PROCESSING_COVERAGE PASS ${registryProcessing.processed}/${registryProcessing.declared}`);
  console.log("REGISTRY_ORDER_INDEPENDENCE PASS");
  console.log("TIMESTAMP_COMPARISON PASS ASCII_CODE_UNIT");
  console.log(`RAW_JSON_PARSER_SELF_TESTS PASS ${rawJsonSelfTests}`);
  console.log(`PATH_POLICY_SELF_TESTS PASS ${seededSelfTests.pathCount}`);
  console.log(`REGISTRY_SELF_TESTS PASS ${seededSelfTests.registryCount}`);
  console.log(`ARTIFACT_EXACT_BYTE_SELF_TESTS PASS ${seededSelfTests.artifactCount}`);
  console.log(`DIRECTORY_ENTRY_SELF_TESTS PASS ${seededSelfTests.directoryEntryCount}`);
  console.log(`ANCESTOR_COMPONENT_SELF_TESTS PASS ${seededSelfTests.ancestorComponentCount}`);
  console.log(`MACHINE_ASSET_COVERAGE_SELF_TESTS PASS ${seededSelfTests.machineAssetCoverageCount}`);
  console.log(`CLOSED_CORE_SELF_TESTS PASS ${seededSelfTests.closedCoreCount}`);
  console.log(`FIXTURE_CLASSIFICATION_SELF_TESTS PASS ${seededSelfTests.fixtureClassificationCount}`);
  console.log(`SEEDED_VALIDATOR_SELF_TESTS PASS ${seededSelfTests.totalCount}`);
  console.log(`VALIDATOR_SOURCE_FILES ${importIsolation.scannedFiles}`);
  console.log(`VALIDATOR_MODULES ${importIsolation.scannedModules}`);
  console.log("STATIC_SAFETY PASS");
  console.log("SECOND_VALIDATOR_EVIDENCE_PENDING");
  console.log("FOUNDATION_VALIDATION PASS");
}

try {
  main();
} catch (error) {
  console.error(`FOUNDATION_VALIDATION FAIL: ${errorMessage(error)}`);
  process.exitCode = 1;
}
