import { diagnosticCode, fail } from "./errors.mjs";
import { generateReleaseData } from "../generate-release-data.mjs";
import { DIAGNOSTICS, REGISTRY_CLASS_SET } from "./release-data-constants.mjs";
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

function resultSignature(result) {
  return JSON.stringify({
    classes: [...result.artifactsByClass.keys()].toSorted(),
    sourceDimensions: result.sourceDimensionCount,
    bindings: result.directionalBindingCount,
    facets: result.facetCount,
    invariantProperties: result.invariantPropertyCount,
    narrowableProperties: result.capabilityNarrowablePropertyCount,
    profiles: result.authenticationProfileCount,
  });
}

export function runReleaseDataSelfTests({ source, baselineBundle, baselineResult, validateManifest, validatorsBySchema, fixtureResult, constraintCoverage }) {
  let count = 0;
  const generatedFirst = generateReleaseData(source);
  const generatedSecond = generateReleaseData(structuredClone(source));
  expect(generatedFirst.manifestBytes.equals(generatedSecond.manifestBytes), "unchanged source manifest bytes");
  for (const [relativePath, bytes] of generatedFirst.artifactBytes) {
    expect(bytes.equals(generatedSecond.artifactBytes.get(relativePath)), `unchanged source artifact bytes ${relativePath}`);
  }
  count += 1;

  const firstArtifactBytes = generatedFirst.artifactBytes.values().next().value;
  const changedByte = Buffer.from(firstArtifactBytes);
  changedByte[0] ^= 0x01;
  expect(sha256Base64url(changedByte) !== sha256Base64url(firstArtifactBytes), "one changed byte changes SHA-256");
  count += 1;

  const lengthBundle = cloneBundle(baselineBundle);
  const firstEntry = lengthBundle.manifest.registryArtifacts[0];
  const firstRecord = lengthBundle.artifactRecords.get(firstEntry.path);
  firstRecord.bytes = Buffer.concat([firstRecord.bytes, Buffer.from([0x0a])]);
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

  expect(constraintCoverage.constraintCount === constraintCoverage.executableCheckCount, "semantic constraint coverage exact");
  count += 1;
  return { count };
}
