import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkGeneratedReleaseData, generateReleaseData, loadMaintainedSource } from "./generate-release-data.mjs";
import { loadFoundationBundle, loadManifestAssets } from "./lib/bundle-loader.mjs";
import { errorMessage, fail } from "./lib/errors.mjs";
import { loadReleaseDataFiles, validateReleaseDataBundle } from "./lib/release-data-loader.mjs";
import { verifyReleaseDataConstraintCoverage } from "./lib/release-data-constraint-coverage.mjs";
import { loadReleaseDataConformanceLock, verifyArtifactsAgainstConformanceLock, verifyReleaseDataConformanceLock } from "./lib/release-data-conformance-lock.mjs";
import { runReleaseDataFixtures } from "./lib/release-data-fixtures.mjs";
import { runReleaseDataSelfTests } from "./lib/release-data-self-tests.mjs";
import { RELEASE_MANIFEST_SCHEMA_ID, RELEASE_SOURCE_SCHEMA_ID } from "./lib/release-data-constants.mjs";
import { loadAuthorityIndex, verifyBundleProvenance } from "./lib/provenance.mjs";
import { assertValidatorImportIsolation, createOfflineSchemaValidator, scanBundleSchemaSafety, validateAssetSchemas } from "./lib/schema-safety.mjs";

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
  const foundation = loadFoundationBundle({
    repositoryRoot,
    manifestPath: paths.manifest,
    schemaRoot: paths.schemas,
    fixtureRoot: paths.fixtures,
    registryRoot: paths.registries,
  });
  const schemaSafety = scanBundleSchemaSafety(foundation);
  const { ajv, metaSchemaPasses } = createOfflineSchemaValidator(foundation.schemas);
  const validatorsBySchema = new Map([...foundation.schemaIds].map((schemaId) => [schemaId, ajv.getSchema(schemaId)]));
  const releaseBundle = loadReleaseDataFiles(repositoryRoot);
  const validateManifest = validatorsBySchema.get(RELEASE_MANIFEST_SCHEMA_ID);
  const releaseData = validateReleaseDataBundle({ bundle: releaseBundle, validateManifest, validatorsBySchema });
  const loadedAssets = loadManifestAssets({ repositoryRoot, manifest: foundation.manifest, schemaIds: foundation.schemaIds });
  validateAssetSchemas({ ajv, manifest: foundation.manifest, assets: loadedAssets.assets });

  const source = loadMaintainedSource(repositoryRoot);
  const validateSource = validatorsBySchema.get(RELEASE_SOURCE_SCHEMA_ID);
  if (typeof validateSource !== "function" || !validateSource(source)) fail(`Maintained release-data source failed structural validation: ${ajv.errorsText(validateSource?.errors)}`);
  const generated = generateReleaseData(source);
  const conformanceLock = loadReleaseDataConformanceLock(repositoryRoot);
  const conformanceLockResult = verifyReleaseDataConformanceLock(conformanceLock, source);
  verifyArtifactsAgainstConformanceLock(conformanceLock, releaseData.artifactsByClass);
  const reproduction = checkGeneratedReleaseData(generated, repositoryRoot);

  const inventory = loadedAssets.assets.get(foundation.manifest.semanticConstraintInventory.path);
  const constraintCoverage = verifyReleaseDataConstraintCoverage(inventory, releaseData.executedSemanticCheckIds);
  const authority = loadAuthorityIndex({
    repositoryRoot,
    specificationRoot: paths.specification,
    decisionsRoot: paths.decisions,
    representationProfilePath: paths.representationProfile,
  });
  const provenance = verifyBundleProvenance({ manifest: foundation.manifest, inventory, authority });
  const fixtureResult = runReleaseDataFixtures({ repositoryRoot, validatorsBySchema, validateManifest });
  const selfTests = runReleaseDataSelfTests({
    source,
    conformanceLock,
    inventory,
    ajv,
    repositoryRoot,
    baselineBundle: releaseBundle,
    baselineResult: releaseData,
    validateManifest,
    validatorsBySchema,
    fixtureResult,
    constraintCoverage,
  });
  const importIsolation = assertValidatorImportIsolation(repositoryRoot, paths.validation);

  console.log(`RELEASE_DATA_VALIDATOR Ajv ${ajvVersion} Draft 2020-12`);
  console.log(`SCHEMAS ${foundation.schemas.size}`);
  console.log(`META_SCHEMA PASS ${metaSchemaPasses}/${foundation.schemas.size}`);
  console.log(`OFFLINE_REFS PASS ${schemaSafety.referenceCount}`);
  console.log(`PROVENANCE PASS constraints=${provenance.constraintCount}`);
  console.log(`GENERATOR_REPRODUCIBILITY PASS files=${reproduction.checkedFiles}`);
  console.log(`SEMANTIC_CONFORMANCE_LOCK PASS artifacts=${conformanceLockResult.artifactCount}`);
  console.log(`REGISTRY_CLASS_SET PASS ${releaseData.artifactsByClass.size}/7`);
  console.log(`SOURCE_CLAIM_DIMENSIONS PASS ${releaseData.sourceDimensionCount}/81`);
  console.log(`DIRECTIONAL_BINDINGS PASS ${releaseData.directionalBindingCount}/20`);
  console.log(`FACETS PASS ${releaseData.facetCount}/5`);
  console.log(`INVARIANT_PROPERTIES PASS ${releaseData.invariantPropertyCount}/54`);
  console.log(`CAPABILITY_NARROWABLE_PROPERTIES PASS ${releaseData.capabilityNarrowablePropertyCount}/5`);
  console.log(`AUTHENTICATION_PROFILES PASS ${releaseData.authenticationProfileCount}/2`);
  console.log(`SEMANTIC_CONSTRAINT_COVERAGE PASS executed=${constraintCoverage.executedCheckerCount}/${constraintCoverage.constraintCount} registered=${constraintCoverage.registeredCheckerCount}`);
  console.log(`FIXTURE_CORPUS PASS total=${fixtureResult.fixtureCount} positive=${fixtureResult.positiveCount} negative=${fixtureResult.negativeCount}`);
  console.log(`DETERMINISTIC_SELF_TESTS PASS ${selfTests.count}`);
  console.log(`VALIDATOR_IMPORT_ISOLATION PASS files=${importIsolation.scannedFiles} modules=${importIsolation.scannedModules}`);
  console.log("NETWORK_DEPENDENCY NONE");
  console.log("OFFICIAL_RUNTIME_IMPORT NONE");
  console.log("RELEASE_DATA_VALIDATION PASS");
}

try {
  main();
} catch (error) {
  console.error(`RELEASE_DATA_VALIDATION FAIL: ${errorMessage(error)}`);
  process.exitCode = 1;
}
