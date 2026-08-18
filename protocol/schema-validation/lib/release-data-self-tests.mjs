import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { diagnosticCode, fail } from "./errors.mjs";
import {
  generateReleaseData,
  preflightReleaseDataGeneration,
  validateEstablishedReleaseForWrite,
  writeGeneratedReleaseData,
} from "../generate-release-data.mjs";
import { DIAGNOSTICS, REGISTRY_CLASS_SET, REGISTRY_DEFINITIONS, RELEASE_MANIFEST_PATH } from "./release-data-constants.mjs";
import { verifyReleaseDataConstraintCoverage } from "./release-data-constraint-coverage.mjs";
import {
  capabilityKeysEqual,
  capabilityScopesEqual,
  RELEASE_DATA_SEMANTIC_CHECKERS,
  validateReleaseDataSemantics,
} from "./release-data-semantics.mjs";
import { validateReleaseDataBundle } from "./release-data-loader.mjs";
import { sha256Base64url } from "./semantic-checks.mjs";

function expect(condition, label) {
  if (!condition) fail(`Release-data self-test failed: ${label}`);
}

function expectDiagnostic(label, code, operation) {
  try {
    operation();
  } catch (error) {
    if (diagnosticCode(error) !== code) fail(`Release-data self-test ${label} produced wrong diagnostic: ${String(diagnosticCode(error))}`);
    return;
  }
  fail(`Release-data self-test did not fail closed: ${label}`);
}

function cloneBundle(bundle) {
  return {
    manifest: structuredClone(bundle.manifest),
    manifestRecord: bundle.manifestRecord,
    artifactRecords: new Map([...bundle.artifactRecords].map(([relativePath, record]) => [relativePath, { ...record, bytes: Buffer.from(record.bytes), value: structuredClone(record.value) }])),
  };
}

function cloneArtifacts(artifacts) {
  return new Map([...artifacts].map(([registryClass, artifact]) => [registryClass, structuredClone(artifact)]));
}

function resultSignature(result) {
  return JSON.stringify({
    classes: [...result.artifactsByClass.keys()].toSorted(),
    sourceDimensions: result.sourceDimensionCount,
    bindings: result.directionalBindingCount,
    facets: result.facetCount,
    invariantProperties: result.invariantPropertyCount,
    narrowableProperties: result.capabilityNarrowablePropertyCount,
    profiles: result.authenticationProfileCount,
    executedCheckers: [...result.executedSemanticCheckIds].toSorted(),
  });
}

function runReplacementRollbackSelfTest(preflight, repositoryRoot) {
  const testRoot = mkdtempSync(path.join(repositoryRoot, "protocol/schema-validation/.rda-replacement-self-test-"));
  const originals = new Map();
  try {
    const outputs = [
      ...REGISTRY_DEFINITIONS.map((definition) => [definition.path, preflight.generated.artifactBytes.get(definition.path)]),
      [RELEASE_MANIFEST_PATH, preflight.generated.manifestBytes],
    ];
    for (const [relativePath, original] of outputs) {
      const absolutePath = path.join(testRoot, ...relativePath.split("/"));
      mkdirSync(path.dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, original);
      originals.set(relativePath, original);
    }
    expectDiagnostic("replacement rollback", DIAGNOSTICS.GENERATOR_REPLACEMENT, () => writeGeneratedReleaseData(preflight, testRoot, {
      beforeReplace(relativePath, index) {
        if (index === 1) throw new Error(`injected replacement failure at ${relativePath}`);
      },
    }));
    for (const [relativePath, original] of originals) {
      const absolutePath = path.join(testRoot, ...relativePath.split("/"));
      expect(readFileSync(absolutePath).equals(original), `replacement rollback restored ${relativePath}`);
    }
  } finally {
    rmSync(testRoot, { recursive: true, force: true });
  }
}

export function runReleaseDataSelfTests({
  source,
  conformanceLock,
  inventory,
  ajv,
  repositoryRoot,
  baselineBundle,
  baselineResult,
  validateManifest,
  validatorsBySchema,
  fixtureResult,
  constraintCoverage,
}) {
  let count = 0;
  const validationContext = { ajv, validatorsBySchema, validateManifest };
  const generatedFirst = generateReleaseData(source);
  const generatedSecond = generateReleaseData(structuredClone(source));
  const validPreflight = preflightReleaseDataGeneration({ source, conformanceLock, validationContext });
  expect(generatedFirst.manifestBytes.equals(generatedSecond.manifestBytes), "unchanged source manifest bytes");
  for (const [relativePath, bytes] of generatedFirst.artifactBytes) expect(bytes.equals(generatedSecond.artifactBytes.get(relativePath)), `unchanged source artifact bytes ${relativePath}`);
  count += 1;

  const firstArtifactBytes = generatedFirst.artifactBytes.values().next().value;
  const changedByte = Buffer.from(firstArtifactBytes);
  changedByte[0] ^= 0x01;
  expect(sha256Base64url(changedByte) !== sha256Base64url(firstArtifactBytes), "one changed byte changes SHA-256");
  count += 1;

  const lengthBundle = cloneBundle(baselineBundle);
  const firstEntry = lengthBundle.manifest.registryArtifacts[0];
  lengthBundle.artifactRecords.get(firstEntry.path).bytes = Buffer.concat([lengthBundle.artifactRecords.get(firstEntry.path).bytes, Buffer.from([0x0a])]);
  expectDiagnostic("changed artifact length", DIAGNOSTICS.WRONG_INTEGRITY_BYTE_LENGTH, () => validateReleaseDataBundle({ bundle: lengthBundle, validateManifest, validatorsBySchema }));
  count += 1;

  const traversalBundle = cloneBundle(baselineBundle);
  traversalBundle.manifest.registryArtifacts.reverse();
  const traversalResult = validateReleaseDataBundle({ bundle: traversalBundle, validateManifest, validatorsBySchema });
  expect(resultSignature(traversalResult) === resultSignature(baselineResult), "manifest artifact traversal order independence");
  count += 1;

  const fileOrderBundle = cloneBundle(baselineBundle);
  fileOrderBundle.artifactRecords = new Map([...fileOrderBundle.artifactRecords].reverse());
  const fileOrderResult = validateReleaseDataBundle({ bundle: fileOrderBundle, validateManifest, validatorsBySchema });
  expect(resultSignature(fileOrderResult) === resultSignature(baselineResult), "registry file order independence");
  count += 1;

  const unknownFileBundle = cloneBundle(baselineBundle);
  unknownFileBundle.artifactRecords.set("protocol/registries/e1.r0-draft.1/release-data/unknown-fixture.registry.json", { bytes: Buffer.from("{}\n"), text: "{}\n", value: {} });
  expectDiagnostic("unknown file cannot gain registry authority", DIAGNOSTICS.UNREFERENCED_ARTIFACT, () => validateReleaseDataBundle({ bundle: unknownFileBundle, validateManifest, validatorsBySchema }));
  count += 1;

  expect(JSON.stringify([...baselineResult.artifactsByClass.keys()].toSorted()) === JSON.stringify([...REGISTRY_CLASS_SET]), "each accepted registry class exactly once");
  count += 1;

  const sortedFixtureIds = [...fixtureResult.exercised].toSorted();
  expect(JSON.stringify(fixtureResult.exercised) === JSON.stringify(sortedFixtureIds), "deterministic fixture enumeration");
  expect(fixtureResult.positiveCount > 0 && fixtureResult.negativeCount > 0 && fixtureResult.fixtureCount === fixtureResult.positiveCount + fixtureResult.negativeCount, "every positive and negative fixture exercised");
  count += 2;

  expect(constraintCoverage.constraintCount === constraintCoverage.executedCheckerCount && constraintCoverage.constraintCount === constraintCoverage.registeredCheckerCount, "semantic constraint coverage exact");
  expectDiagnostic("removed checker fails coverage", DIAGNOSTICS.SEMANTIC_CHECK_COVERAGE, () => verifyReleaseDataConstraintCoverage(inventory, baselineResult.executedSemanticCheckIds, RELEASE_DATA_SEMANTIC_CHECKERS.slice(1)));
  function undeclaredFixtureChecker() {}
  const undeclared = [...RELEASE_DATA_SEMANTIC_CHECKERS, { id: "RDA-SEM-UNDECLARED-FIXTURE", check: undeclaredFixtureChecker }];
  expectDiagnostic("undeclared checker fails coverage", DIAGNOSTICS.SEMANTIC_CHECK_COVERAGE, () => verifyReleaseDataConstraintCoverage(inventory, [...baselineResult.executedSemanticCheckIds, "RDA-SEM-UNDECLARED-FIXTURE"], undeclared));
  expectDiagnostic("declared checker not executed fails coverage", DIAGNOSTICS.SEMANTIC_CHECK_COVERAGE, () => verifyReleaseDataConstraintCoverage(inventory, baselineResult.executedSemanticCheckIds.slice(1)));
  count += 4;

  const coreKey = { namespaceClass: "core", name: "fixture.core" };
  const externalKey = { namespaceClass: "external", namespace: "urn:uuid:12345678-1234-4123-8123-123456789abc", name: "fixture.external" };
  expect(capabilityKeysEqual(coreKey, { name: "fixture.core", namespaceClass: "core" }), "Core key equality ignores member order only");
  expect(capabilityKeysEqual(externalKey, structuredClone(externalKey)), "External key exact equality");
  expect(!capabilityKeysEqual(externalKey, { ...externalKey, namespace: "urn:uuid:12345678-1234-4123-8123-123456789abd" }), "External namespace is part of typed equality");
  expect(capabilityScopesEqual({ capabilityKey: coreKey, capabilityVersion: "v1" }, { capabilityKey: structuredClone(coreKey), capabilityVersion: "v1" }), "CapabilityVersion exact string equality");
  expect(!capabilityScopesEqual({ capabilityKey: coreKey, capabilityVersion: "v1" }, { capabilityKey: structuredClone(coreKey), capabilityVersion: "v2" }), "CapabilityVersion has no fallback equality");
  count += 1;

  for (const insertion of ["push", "unshift"]) {
    const duplicateArtifacts = cloneArtifacts(baselineResult.artifactsByClass);
    const claims = duplicateArtifacts.get("gb.registry.source-claim-authority").dimensions.find((item) => item.id === "agent-identity").authorizedClaims;
    claims[insertion]({ ...structuredClone(claims[0]), presence: "P" });
    expectDiagnostic(`duplicate source order ${insertion}`, DIAGNOSTICS.SOURCE_DUPLICATE_CLAIM, () => validateReleaseDataSemantics(duplicateArtifacts));
  }
  count += 2;

  const malformedManifest = cloneBundle(baselineBundle);
  malformedManifest.manifest.registryArtifacts = "not-an-array";
  expectDiagnostic("malformed current manifest blocks write", DIAGNOSTICS.GENERATOR_CURRENT_STATE, () => validateEstablishedReleaseForWrite({ generated: generatedFirst, currentBundle: malformedManifest, validateManifest }));
  const missingEntry = cloneBundle(baselineBundle);
  missingEntry.manifest.registryArtifacts.pop();
  expectDiagnostic("missing current registry entry blocks write", DIAGNOSTICS.GENERATOR_CURRENT_STATE, () => validateEstablishedReleaseForWrite({ generated: generatedFirst, currentBundle: missingEntry, validateManifest }));
  const integrityMismatch = cloneBundle(baselineBundle);
  integrityMismatch.artifactRecords.get(integrityMismatch.manifest.registryArtifacts[0].path).bytes[0] ^= 0x01;
  expectDiagnostic("current artifact integrity mismatch blocks write", DIAGNOSTICS.GENERATOR_CURRENT_STATE, () => validateEstablishedReleaseForWrite({ generated: generatedFirst, currentBundle: integrityMismatch, validateManifest }));
  const identityReuseSource = structuredClone(source);
  identityReuseSource.artifacts[0].artifact.dimensions[0].label = "Changed without a new identity";
  expectDiagnostic("immutable identity reuse blocks write", DIAGNOSTICS.GENERATOR_CURRENT_STATE, () => validateEstablishedReleaseForWrite({ generated: generateReleaseData(identityReuseSource), currentBundle: baselineBundle, validateManifest }));
  count += 4;

  const structurallyInvalidSource = structuredClone(source);
  delete structurallyInvalidSource.serialization;
  expectDiagnostic("structurally invalid source cannot be written", DIAGNOSTICS.GENERATOR_PREFLIGHT, () => preflightReleaseDataGeneration({ source: structurallyInvalidSource, conformanceLock, validationContext }));
  const semanticallyInvalidSource = structuredClone(source);
  semanticallyInvalidSource.artifacts.find((item) => item.artifact.registryClass === "gb.registry.source-claim-authority").artifact.contextSupplyObligations[0].authorizesClaim = true;
  expectDiagnostic("semantically invalid source cannot be written", DIAGNOSTICS.HOST_CONTEXT_AUTHORITY, () => preflightReleaseDataGeneration({ source: semanticallyInvalidSource, conformanceLock, validationContext }));
  const staleLockSource = structuredClone(source);
  staleLockSource.artifacts.find((item) => item.artifact.registryClass === "gb.registry.directional-binding").artifact.bindings[0].meaning = "Changed without reviewed lock update";
  expectDiagnostic("ordinary generation cannot rewrite semantic lock", DIAGNOSTICS.SEMANTIC_LOCK, () => preflightReleaseDataGeneration({ source: staleLockSource, conformanceLock, validationContext }));
  count += 3;

  runReplacementRollbackSelfTest(validPreflight, repositoryRoot);
  count += 1;
  return { count };
}
