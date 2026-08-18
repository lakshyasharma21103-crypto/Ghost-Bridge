import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { diagnosticCode, fail } from "./errors.mjs";
import {
  generateReleaseData,
  preflightReleaseDataGeneration,
  serializeGeneratedJson,
  validateEstablishedReleaseForWrite,
  writeGeneratedReleaseData,
} from "../generate-release-data.mjs";
import { DIAGNOSTICS, REGISTRY_CLASS_SET, REGISTRY_DEFINITIONS, RELEASE_MANIFEST_PATH } from "./release-data-constants.mjs";
import { verifyReleaseDataConstraintCoverage } from "./release-data-constraint-coverage.mjs";
import { buildReleaseDataConformanceProjection } from "./release-data-conformance-lock.mjs";
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

function generatedOutputs(generated) {
  return [
    ...REGISTRY_DEFINITIONS.map((definition) => [definition.path, generated.artifactBytes.get(definition.path)]),
    [RELEASE_MANIFEST_PATH, generated.manifestBytes],
  ];
}

function captureOutputs(root, generated) {
  return new Map(generatedOutputs(generated).map(([relativePath]) => [relativePath, readFileSync(path.join(root, ...relativePath.split("/")))]));
}

function populateGeneratedOutputs(root, generated) {
  const originals = new Map();
  for (const [relativePath, bytes] of generatedOutputs(generated)) {
    const absolutePath = path.join(root, ...relativePath.split("/"));
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, bytes);
    originals.set(relativePath, Buffer.from(bytes));
  }
  return originals;
}

function expectOutputsEqual(root, expected, label) {
  for (const [relativePath, bytes] of expected) {
    expect(readFileSync(path.join(root, ...relativePath.split("/"))).equals(bytes), `${label}: ${relativePath}`);
  }
}

function mutateBundleArtifact(baselineBundle, registryClass, mutate) {
  const bundle = cloneBundle(baselineBundle);
  const entry = bundle.manifest.registryArtifacts.find((item) => item.registryClass === registryClass);
  const record = bundle.artifactRecords.get(entry.path);
  const artifact = JSON.parse(record.bytes.toString("utf8"));
  mutate(artifact);
  const bytes = serializeGeneratedJson(artifact);
  record.bytes = bytes;
  entry.artifactByteIntegrity = { algorithm: "sha-256", value: sha256Base64url(bytes), byteLength: bytes.byteLength };
  return bundle;
}

function runCheckerPredicateIntegritySelfTests({ baselineBundle, baselineResult, conformanceLock, validateManifest, validatorsBySchema }) {
  const cases = [
    {
      label: "invariant meaning",
      checkerId: "RDA-SEM-FACET-PROPERTY-INVENTORY",
      registryClass: "gb.registry.facet-property",
      mutate(artifact) { artifact.invariantProperties[0].meaning = "valid-schema changed meaning"; },
    },
    {
      label: "invariant role",
      checkerId: "RDA-SEM-FACET-PROPERTY-INVENTORY",
      registryClass: "gb.registry.facet-property",
      mutate(artifact) { artifact.invariantProperties[0].roles = "valid-schema changed role"; },
    },
    {
      label: "invariant valid failure code",
      checkerId: "RDA-SEM-FACET-PROPERTY-INVENTORY",
      registryClass: "gb.registry.facet-property",
      mutate(artifact) { artifact.invariantProperties[0].failure[0] = "FA"; },
    },
    {
      label: "source qualification",
      checkerId: "RDA-SEM-ATOMIC-SOURCE-AUTHORITY",
      registryClass: "gb.registry.source-claim-authority",
      mutate(artifact) { artifact.dimensions[0].authorizedClaims[0].qualification = "valid-schema changed qualification"; },
    },
    {
      label: "directional meaning",
      checkerId: "RDA-SEM-DIRECTIONAL-BINDINGS",
      registryClass: "gb.registry.directional-binding",
      mutate(artifact) { artifact.bindings[0].meaning = "valid-schema changed binding meaning"; },
    },
    {
      label: "external rule text",
      checkerId: "RDA-SEM-EXTERNAL-ELIGIBILITY",
      registryClass: "gb.registry.external-capability-eligibility",
      mutate(artifact) { artifact.eligibilityRules[0].rule = "valid-schema changed external rule"; },
    },
    {
      label: "narrowable no-waiver meaning",
      checkerId: "RDA-SEM-CAPABILITY-NARROWING",
      registryClass: "gb.registry.facet-property",
      mutate(artifact) { artifact.capabilityNarrowableProperties[0].noWidenNoWaiver = "valid-schema changed no-waiver meaning"; },
    },
  ];

  expectDiagnostic("full semantic API requires lock", DIAGNOSTICS.SEMANTIC_LOCK, () => validateReleaseDataSemantics(baselineResult.artifactsByClass));
  expectDiagnostic("full bundle API requires lock", DIAGNOSTICS.SEMANTIC_LOCK, () => validateReleaseDataBundle({ bundle: baselineBundle, validateManifest, validatorsBySchema }));
  for (const test of cases) {
    const artifacts = cloneArtifacts(baselineResult.artifactsByClass);
    test.mutate(artifacts.get(test.registryClass));
    const checker = RELEASE_DATA_SEMANTIC_CHECKERS.find((item) => item.id === test.checkerId);
    expect(Boolean(checker), `registered checker exists for ${test.label}`);
    expectDiagnostic(`direct checker rejects ${test.label}`, DIAGNOSTICS.SEMANTIC_LOCK, () => checker.check({ artifactsByClass: artifacts, conformanceLock, metrics: {} }));
    expectDiagnostic(`full semantics rejects ${test.label}`, DIAGNOSTICS.SEMANTIC_LOCK, () => validateReleaseDataSemantics(artifacts, { conformanceLock }));
    const bundle = mutateBundleArtifact(baselineBundle, test.registryClass, test.mutate);
    expectDiagnostic(`full bundle rejects ${test.label}`, DIAGNOSTICS.SEMANTIC_LOCK, () => validateReleaseDataBundle({ bundle, validateManifest, validatorsBySchema, conformanceLock }));
  }
  return 2 + (cases.length * 3);
}

function runPreflightMutationSelfTests({ source, conformanceLock, validationContext, repositoryRoot, generated }) {
  const established = captureOutputs(repositoryRoot, generated);
  const cases = [
    {
      label: "artifact bytes mutated after preflight",
      mutate(preflight) { preflight.generated.artifactBytes.values().next().value[0] ^= 0x01; },
    },
    {
      label: "artifact identity mutated after preflight",
      mutate(preflight) {
        const entry = preflight.generated.manifest.registryArtifacts[0];
        const definition = REGISTRY_DEFINITIONS.find((item) => item.registryClass === entry.registryClass);
        entry[definition.identityField] = "urn:uuid:11111111-1111-4111-8111-111111111111";
      },
    },
    {
      label: "manifest integrity reference mutated after preflight",
      mutate(preflight) { preflight.generated.manifest.registryArtifacts[0].artifactByteIntegrity.value = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; },
    },
  ];
  for (const test of cases) {
    const preflight = preflightReleaseDataGeneration({ source, conformanceLock, validationContext });
    test.mutate(preflight);
    expectDiagnostic(test.label, DIAGNOSTICS.GENERATOR_PREFLIGHT, () => writeGeneratedReleaseData(preflight, repositoryRoot));
    expectOutputsEqual(repositoryRoot, established, `${test.label} did not reach disk`);
  }
  return cases.length;
}

function runFilesystemReplacementSelfTests({ source, conformanceLock, validationContext, repositoryRoot, generated }) {
  const makePreflight = () => preflightReleaseDataGeneration({ source, conformanceLock, validationContext });
  let count = 0;

  const raceRoot = mkdtempSync(path.join(repositoryRoot, "protocol/schema-validation/.rda-race-self-test-"));
  try {
    const originals = populateGeneratedOutputs(raceRoot, generated);
    const racedPath = REGISTRY_DEFINITIONS[1].path;
    const concurrentBytes = Buffer.from("concurrent validated-target change\n", "utf8");
    expectDiagnostic("target changed before replacement", DIAGNOSTICS.GENERATOR_REPLACEMENT, () => writeGeneratedReleaseData(makePreflight(), raceRoot, {
      beforeReplace(relativePath, index) {
        if (index === 1) writeFileSync(path.join(raceRoot, ...relativePath.split("/")), concurrentBytes);
      },
    }));
    for (const [relativePath, original] of originals) {
      const expected = relativePath === racedPath ? concurrentBytes : original;
      expect(readFileSync(path.join(raceRoot, ...relativePath.split("/"))).equals(expected), `race recovery preserves correct bytes: ${relativePath}`);
    }
    count += 1;
  } finally {
    rmSync(raceRoot, { recursive: true, force: true });
  }

  const changedSource = structuredClone(source);
  const changedSourceArtifact = changedSource.artifacts.find((item) => item.artifact.registryClass === "gb.registry.source-claim-authority").artifact;
  changedSourceArtifact.sourceClaimAuthorityArtifact = "urn:uuid:22222222-2222-4222-8222-222222222222";
  changedSourceArtifact.dimensions[0].label = "Valid test-only changed Agent identity label";
  const changedLock = buildReleaseDataConformanceProjection(changedSource);
  const makeChangedPreflight = () => preflightReleaseDataGeneration({ source: changedSource, conformanceLock: changedLock, validationContext });
  const verificationRoot = mkdtempSync(path.join(repositoryRoot, "protocol/schema-validation/.rda-final-verification-self-test-"));
  const establishedManifestValidator = validationContext.validateManifest;
  try {
    const originals = populateGeneratedOutputs(verificationRoot, generated);
    expectDiagnostic("post-replacement verification failure", DIAGNOSTICS.GENERATOR_REPLACEMENT, () => writeGeneratedReleaseData(makeChangedPreflight(), verificationRoot, {
      beforeFinalVerification() { validationContext.validateManifest = () => false; },
    }));
    expectOutputsEqual(verificationRoot, originals, "post-verification recovery restored established bytes");
    count += 1;
  } finally {
    validationContext.validateManifest = establishedManifestValidator;
    rmSync(verificationRoot, { recursive: true, force: true });
  }

  const successRoot = mkdtempSync(path.join(repositoryRoot, "protocol/schema-validation/.rda-success-self-test-"));
  try {
    populateGeneratedOutputs(successRoot, generated);
    const result = writeGeneratedReleaseData(makePreflight(), successRoot);
    expect(result.finalVerification.artifactCount === 7, "successful write final exact class set");
    expect(result.finalVerification.executedSemanticCheckCount === 15, "successful write final semantic checker execution");
    expect(result.finalVerification.reproducedFileCount === 8, "successful write final generated-byte reproduction");
    count += 1;
  } finally {
    rmSync(successRoot, { recursive: true, force: true });
  }
  return count;
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
  const validationContext = { ajv, validatorsBySchema, validateManifest, inventory };
  const generatedFirst = generateReleaseData(source);
  const generatedSecond = generateReleaseData(structuredClone(source));
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
  expectDiagnostic("changed artifact length", DIAGNOSTICS.WRONG_INTEGRITY_BYTE_LENGTH, () => validateReleaseDataBundle({ bundle: lengthBundle, validateManifest, validatorsBySchema, conformanceLock }));
  count += 1;

  const traversalBundle = cloneBundle(baselineBundle);
  traversalBundle.manifest.registryArtifacts.reverse();
  const traversalResult = validateReleaseDataBundle({ bundle: traversalBundle, validateManifest, validatorsBySchema, conformanceLock });
  expect(resultSignature(traversalResult) === resultSignature(baselineResult), "manifest artifact traversal order independence");
  count += 1;

  const fileOrderBundle = cloneBundle(baselineBundle);
  fileOrderBundle.artifactRecords = new Map([...fileOrderBundle.artifactRecords].reverse());
  const fileOrderResult = validateReleaseDataBundle({ bundle: fileOrderBundle, validateManifest, validatorsBySchema, conformanceLock });
  expect(resultSignature(fileOrderResult) === resultSignature(baselineResult), "registry file order independence");
  count += 1;

  const unknownFileBundle = cloneBundle(baselineBundle);
  unknownFileBundle.artifactRecords.set("protocol/registries/e1.r0-draft.1/release-data/unknown-fixture.registry.json", { bytes: Buffer.from("{}\n"), text: "{}\n", value: {} });
  expectDiagnostic("unknown file cannot gain registry authority", DIAGNOSTICS.UNREFERENCED_ARTIFACT, () => validateReleaseDataBundle({ bundle: unknownFileBundle, validateManifest, validatorsBySchema, conformanceLock }));
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
    expectDiagnostic(`duplicate source order ${insertion}`, DIAGNOSTICS.SOURCE_DUPLICATE_CLAIM, () => validateReleaseDataSemantics(duplicateArtifacts, { conformanceLock }));
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

  count += runCheckerPredicateIntegritySelfTests({ baselineBundle, baselineResult, conformanceLock, validateManifest, validatorsBySchema });
  count += runPreflightMutationSelfTests({ source, conformanceLock, validationContext, repositoryRoot, generated: generatedFirst });
  count += runFilesystemReplacementSelfTests({ source, conformanceLock, validationContext, repositoryRoot, generated: generatedFirst });
  return { count };
}
