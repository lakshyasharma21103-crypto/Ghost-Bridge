import { assertAllDeclaredPathsProcessed, assertLoadedSchemaIdentity, assertMachineAssetCoverage, assertManifestDiskCoverage, assertRegularRepositoryEntry, validateManifestDeclarations } from "./bundle-loader.mjs";
import { errorMessage, fail } from "./errors.mjs";
import { assertFixtureClassification, runFixtureCase } from "./fixture-runner.mjs";
import { assertNoDuplicateObjectKeys, decodeStrictUtf8 } from "./json-source.mjs";
import {
  assertCanonicalPosixRelativePath,
  assertRepositoryPathComponentChain,
} from "./path-policy.mjs";
import { assertClosedCoreObjectSchemas, scanSchemaSafety } from "./schema-safety.mjs";
import { artifactByteIntegrityMatches, evaluateSemanticCheck, sha256Base64url } from "./semantic-checks.mjs";

function expectFailure(label, operation, expectedMessage) {
  try {
    operation();
  } catch (error) {
    const message = errorMessage(error);
    if (expectedMessage && !message.includes(expectedMessage)) {
      fail(`Tooling self-test ${label} failed with the wrong diagnostic: ${message}`, {
        cause: error,
      });
    }
    return;
  }
  fail(`Tooling self-test ${label} did not fail closed`);
}

function expectTrue(label, condition) {
  if (!condition) fail(`Tooling self-test ${label} did not pass`);
}

function runGroup(tests) {
  for (const [label, operation] of tests) operation(label);
  return tests.length;
}

export function runRawJsonParserSelfTests() {
  return runGroup([
    ["duplicate ordinary property", (label) => expectFailure(label, () => assertNoDuplicateObjectKeys('{"a":1,"a":2}', label), "Duplicate raw JSON member")],
    ["duplicate escaped property", (label) => expectFailure(label, () => assertNoDuplicateObjectKeys('{"a":1,"\\u0061":2}', label), "Duplicate raw JSON member")],
    ["nested duplicate", (label) => expectFailure(label, () => assertNoDuplicateObjectKeys('{"outer":{"x":1,"x":2}}', label), "Duplicate raw JSON member")],
    ["array object duplicate", (label) => expectFailure(label, () => assertNoDuplicateObjectKeys('[{"x":1,"x":2}]', label), "Duplicate raw JSON member")],
    ["JSON punctuation inside string", (label) => assertNoDuplicateObjectKeys('{"value":"{a:b,c}"}', label)],
    ["escaped quote and backslash", (label) => assertNoDuplicateObjectKeys('{"value":"quote: \\" slash: \\\\"}', label)],
    ["malformed JSON", (label) => expectFailure(label, () => assertNoDuplicateObjectKeys('{"a":[1,]}', label), "Trailing comma")],
    ["strict UTF-8", (label) => expectFailure(label, () => decodeStrictUtf8(Uint8Array.from([0xc3, 0x28]), label), "Strict UTF-8")],
  ]);
}

export function runPathPolicySelfTests() {
  return runGroup([
    ["valid POSIX-relative path", () => assertCanonicalPosixRelativePath("protocol/schemas/schema.json", "self-test")],
    ["leading slash", (label) => expectFailure(label, () => assertCanonicalPosixRelativePath("/absolute", label), "absolute")],
    ["trailing slash", (label) => expectFailure(label, () => assertCanonicalPosixRelativePath("trailing/", label), "trailing slash")],
    ["backslash", (label) => expectFailure(label, () => assertCanonicalPosixRelativePath("a\\b", label), "backslash")],
    ["empty segment", (label) => expectFailure(label, () => assertCanonicalPosixRelativePath("a//b", label), "empty segment")],
    ["dot segment", (label) => expectFailure(label, () => assertCanonicalPosixRelativePath("a/./b", label), "dot segment")],
    ["dot-dot segment", (label) => expectFailure(label, () => assertCanonicalPosixRelativePath("a/../b", label), "dot-dot segment")],
    ["Windows drive absolute", (label) => expectFailure(label, () => assertCanonicalPosixRelativePath("C:/Windows", label), "Windows drive")],
    ["Windows drive relative", (label) => expectFailure(label, () => assertCanonicalPosixRelativePath("C:relative", label), "Windows drive")],
    ["URI absolute form", (label) => expectFailure(label, () => assertCanonicalPosixRelativePath("file:/tmp/value", label), "scheme")],
    ["empty path", (label) => expectFailure(label, () => assertCanonicalPosixRelativePath("", label), "empty")],
  ]);
}

export function runArtifactExactByteSelfTests() {
  const emptyBytes = Buffer.alloc(0);
  const emptyDigest = sha256Base64url(emptyBytes);
  const emptyExact = { algorithm: "sha-256", value: emptyDigest, byteLength: 0 };
  const emptyInput = { artifactBytesHex: "" };
  const nonemptyBytes = Buffer.from([0x00]);
  const nonemptyDigest = sha256Base64url(nonemptyBytes);
  const nonemptyExact = { algorithm: "sha-256", value: nonemptyDigest, byteLength: 1 };
  const nonemptyInput = { artifactBytesHex: "00" };
  return runGroup([
    ["empty-byte exact digest", (label) => expectTrue(label, emptyDigest === "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU")],
    ["empty-byte exact match", (label) => expectTrue(label, artifactByteIntegrityMatches(emptyExact, emptyInput))],
    ["digest mismatch", (label) => expectTrue(label, !artifactByteIntegrityMatches({ ...emptyExact, value: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }, emptyInput))],
    ["byteLength mismatch", (label) => expectTrue(label, !artifactByteIntegrityMatches({ ...emptyExact, byteLength: 1 }, emptyInput))],
    ["malformed semantic bytes", (label) => expectTrue(label, !artifactByteIntegrityMatches(emptyExact, { artifactBytesHex: "0g" }))],
    ["one-byte exact digest", (label) => expectTrue(label, nonemptyDigest === "bjQLnP-zepicpUTmu3gKLHiQHT-zNzh2hRGjBhevoB0")],
    ["one-byte exact match", (label) => expectTrue(label, artifactByteIntegrityMatches(nonemptyExact, nonemptyInput))],
    ["one-byte content mismatch", (label) => expectTrue(label, !artifactByteIntegrityMatches(nonemptyExact, { artifactBytesHex: "01" }))],
    ["one-byte length mismatch", (label) => expectTrue(label, !artifactByteIntegrityMatches({ ...nonemptyExact, byteLength: 0 }, nonemptyInput))],
  ]);
}

export function runDirectoryEntrySelfTests() {
  const entry = (kind) => ({
    isSymbolicLink: () => kind === "symlink",
    isDirectory: () => kind === "directory",
    isFile: () => kind === "file",
  });
  return runGroup([
    ["regular directory entry", (label) => expectTrue(label, assertRegularRepositoryEntry(entry("directory"), label) === "directory")],
    ["regular file entry", (label) => expectTrue(label, assertRegularRepositoryEntry(entry("file"), label) === "file")],
    ["symbolic-link directory entry", (label) => expectFailure(label, () => assertRegularRepositoryEntry(entry("symlink"), label), "Symbolic-link")],
    ["non-regular directory entry", (label) => expectFailure(label, () => assertRegularRepositoryEntry(entry("special"), label), "Non-regular")],
  ]);
}

export function runAncestorComponentSelfTests() {
  const ordinaryFileChain = [
    { path: "protocol", kind: "directory" },
    { path: "protocol/schemas", kind: "directory" },
    { path: "protocol/schemas/foundation-manifest.json", kind: "file" },
  ];
  return runGroup([
    ["ordinary ancestor chain", () => assertRepositoryPathComponentChain(ordinaryFileChain, "file", "self-test")],
    ["intermediate symbolic link", (label) => expectFailure(label, () => assertRepositoryPathComponentChain([
      ordinaryFileChain[0],
      { path: "protocol/schemas", kind: "symlink" },
      ordinaryFileChain[2],
    ], "file", label), "Symbolic-link repository path component")],
    ["terminal symbolic link", (label) => expectFailure(label, () => assertRepositoryPathComponentChain([
      ordinaryFileChain[0],
      ordinaryFileChain[1],
      { path: ordinaryFileChain[2].path, kind: "symlink" },
    ], "file", label), "Symbolic-link repository path component")],
    ["intermediate regular file", (label) => expectFailure(label, () => assertRepositoryPathComponentChain([
      ordinaryFileChain[0],
      { path: "protocol/schemas", kind: "file" },
      ordinaryFileChain[2],
    ], "file", label), "not an ordinary directory")],
    ["intermediate special entry", (label) => expectFailure(label, () => assertRepositoryPathComponentChain([
      ordinaryFileChain[0],
      { path: "protocol/schemas", kind: "special" },
      ordinaryFileChain[2],
    ], "file", label), "not an ordinary directory")],
  ]);
}

export function runMachineAssetCoverageSelfTests(bundle) {
  const manifestPath = "protocol/schemas/e1.r0-draft.1/foundation-manifest.json";
  const schemaRoot = "protocol/schemas/e1.r0-draft.1";
  const fixtureRoot = "protocol/fixtures/wire/e1.r0-draft.1/foundation";
  const registryRoot = "protocol/registries/e1.r0-draft.1";
  const coverage = (manifest, diskOverrides = {}) =>
    assertMachineAssetCoverage({
      manifest,
      manifestPath,
      schemaRoot,
      fixtureRoot,
      registryRoot,
      ...bundle.diskPaths,
      ...diskOverrides,
    });
  return runGroup([
    [
      "extra disk fixture",
      (label) =>
        expectFailure(
          label,
          () =>
            coverage(bundle.manifest, {
              fixtureRootFiles: [...bundle.diskPaths.fixtureRootFiles, `${fixtureRoot}/tooling-self-test-extra.json`],
            }),
          "fixture disk coverage mismatch",
        ),
    ],
    [
      "extra disk registry",
      (label) =>
        expectFailure(
          label,
          () =>
            coverage(bundle.manifest, {
              registryRootFiles: [...bundle.diskPaths.registryRootFiles, `${registryRoot}/tooling-self-test-extra.json`],
            }),
          "registry disk coverage mismatch",
        ),
    ],
    [
      "unexpected schema-root JSON",
      (label) =>
        expectFailure(
          label,
          () =>
            coverage(bundle.manifest, {
              schemaRootFiles: [...bundle.diskPaths.schemaRootFiles, `${schemaRoot}/tooling-self-test-extra.json`],
            }),
          "schema-root non-schema JSON asset disk coverage mismatch",
        ),
    ],
    [
      "fixture outside canonical root",
      (label) => {
        const candidate = structuredClone(bundle.manifest);
        candidate.fixtures[0].path = "protocol/fixtures/wire/e1.r0-draft.1/tooling-self-test.json";
        expectFailure(label, () => coverage(candidate), "outside canonical root");
      },
    ],
    [
      "registry outside canonical root",
      (label) => {
        const candidate = structuredClone(bundle.manifest);
        candidate.registries[0].path = "protocol/registries/tooling-self-test.json";
        expectFailure(label, () => coverage(candidate), "outside canonical root");
      },
    ],
    [
      "cross-role duplicate",
      (label) => {
        const candidate = structuredClone(bundle.manifest);
        candidate.semanticConstraintInventory.path = candidate.schemas[0].path;
        expectFailure(label, () => coverage(candidate), "Cross-role declared path collision");
      },
    ],
    [
      "declared registry not processed",
      (label) =>
        expectFailure(
          label,
          () =>
            assertAllDeclaredPathsProcessed(
              "registry",
              bundle.manifest.registries.map((entry) => entry.path),
              new Set(),
            ),
          "registry processing disk coverage mismatch",
        ),
    ],
  ]);
}

export function runClosedCoreSelfTests(bundle) {
  const entry = { path: "tooling-self-test.schema.json" };
  const workspaceEntry = bundle.manifest.schemas.find((candidate) => candidate.logicalName === "WorkspaceScope");
  const timeEntry = bundle.manifest.schemas.find((candidate) => candidate.logicalName === "TimeEvidence");
  return runGroup([
    [
      "direct composed branch inherits root closure",
      () =>
        assertClosedCoreObjectSchemas(entry, {
          oneOf: [
            { type: "object", properties: { kind: { const: "a" } } },
            { type: "object", properties: { kind: { const: "b" } } },
          ],
          unevaluatedProperties: false,
        }),
    ],
    [
      "nested child object does not inherit root closure",
      (label) =>
        expectFailure(
          label,
          () =>
            assertClosedCoreObjectSchemas(entry, {
              type: "object",
              properties: {
                payload: { type: "object", properties: { value: { type: "string" } } },
              },
              unevaluatedProperties: false,
            }),
          "Object schema is not closed",
        ),
    ],
    [
      "nested child object with local closure",
      () =>
        assertClosedCoreObjectSchemas(entry, {
          type: "object",
          properties: {
            payload: {
              type: "object",
              properties: { value: { type: "string" } },
              additionalProperties: false,
            },
          },
          unevaluatedProperties: false,
        }),
    ],
    [
      "deep composition cannot leak closure to child instance",
      (label) =>
        expectFailure(
          label,
          () =>
            assertClosedCoreObjectSchemas(entry, {
              oneOf: [{ allOf: [{ type: "object", properties: { payload: { type: "object" } } }] }],
              unevaluatedProperties: false,
            }),
          "Object schema is not closed",
        ),
    ],
    [
      "object keywords without explicit type require closure",
      (label) =>
        expectFailure(
          label,
          () =>
            assertClosedCoreObjectSchemas(entry, {
              properties: { value: { type: "string" } },
            }),
          "Object schema is not closed",
        ),
    ],
    [
      "object union type requires closure",
      (label) =>
        expectFailure(
          label,
          () =>
            assertClosedCoreObjectSchemas(entry, {
              type: ["object", "null"],
              properties: { value: { type: "string" } },
            }),
          "Object schema is not closed",
        ),
    ],
    [
      "object keywords without type pass with local closure",
      () =>
        assertClosedCoreObjectSchemas(entry, {
          properties: { value: { type: "string" } },
          additionalProperties: false,
        }),
    ],
    [
      "object-keyword branch inherits same-instance closure",
      () =>
        assertClosedCoreObjectSchemas(entry, {
          oneOf: [
            { properties: { kind: { const: "a" } }, required: ["kind"] },
            { properties: { kind: { const: "b" } }, required: ["kind"] },
          ],
          unevaluatedProperties: false,
        }),
    ],
    [
      "object-keyword child does not inherit parent closure",
      (label) =>
        expectFailure(
          label,
          () =>
            assertClosedCoreObjectSchemas(entry, {
              properties: {
                payload: { properties: { value: { type: "string" } } },
              },
              unevaluatedProperties: false,
            }),
          "Object schema is not closed",
        ),
    ],
    ["WorkspaceScope unchanged", () => assertClosedCoreObjectSchemas(workspaceEntry, bundle.schemas.get(workspaceEntry.schemaId))],
    ["TimeEvidence unchanged", () => assertClosedCoreObjectSchemas(timeEntry, bundle.schemas.get(timeEntry.schemaId))],
  ]);
}

export function runFixtureClassificationSelfTests() {
  return runGroup([
    [
      "misclassified structural-negative",
      (label) =>
        expectFailure(
          label,
          () =>
            assertFixtureClassification("structural-negative", {
              id: label,
              kind: "value",
              structuralExpected: "pass",
              semanticExpected: "not-applicable",
              semanticCheck: "none",
            }),
          "Misclassified structural-negative",
        ),
    ],
    [
      "misclassified semantic-negative",
      (label) =>
        expectFailure(
          label,
          () =>
            assertFixtureClassification("semantic-negative", {
              id: label,
              kind: "value",
              structuralExpected: "pass",
              semanticExpected: "fail",
              semanticCheck: "none",
            }),
          "Misclassified semantic-negative",
        ),
    ],
    [
      "semantic-positive equality retained",
      () =>
        assertFixtureClassification("semantic-positive", {
          id: "tooling-self-test-equality",
          kind: "equality",
          semanticCheck: "tenant-exact-equality",
        }),
    ],
  ]);
}

export function runRegistryExactSetSelfTests({ registry, validateRegistry }) {
  const rejects = (label, candidate) => expectTrue(label, validateRegistry(candidate) === false);
  return runGroup([
    [
      "order independence",
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts.reverse();
        expectTrue(label, validateRegistry(candidate) === true);
      },
    ],
    [
      "wrong registry class",
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts[0].registryClass = "gb.registry.tool-self-test-wrong";
        rejects(label, candidate);
      },
    ],
    [
      "extra registry class",
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts.push({ ...candidate.registryArtifacts[0], registryClass: "gb.registry.tool-self-test-extra" });
        rejects(label, candidate);
      },
    ],
    [
      "missing registry class",
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts.pop();
        rejects(label, candidate);
      },
    ],
    [
      "duplicate registry class",
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts[1] = structuredClone(candidate.registryArtifacts[0]);
        rejects(label, candidate);
      },
    ],
    [
      "wrong typed artifact field",
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts[0].directionalBindingArtifact = candidate.registryArtifacts[0].sourceClaimAuthorityArtifact;
        delete candidate.registryArtifacts[0].sourceClaimAuthorityArtifact;
        rejects(label, candidate);
      },
    ],
    [
      "wrong artifact schema",
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts[0].artifactSchema = candidate.registryArtifacts[1].artifactSchema;
        rejects(label, candidate);
      },
    ],
  ]);
}

export function runSeededValidatorSelfTests({ bundle, registry, validateRegistry }) {
  const manifest = bundle.manifest;
  const firstEntry = manifest.schemas[0];
  const firstSchema = bundle.schemas.get(firstEntry.schemaId);
  const schemaIds = bundle.schemaIds;
  const syntheticText = JSON.stringify(firstSchema);
  const tests = [
    [
      "duplicate schema $id",
      (label) => {
        const secondEntry = manifest.schemas[1];
        const candidate = structuredClone(bundle.schemas.get(secondEntry.schemaId));
        candidate.$id = firstSchema.$id;
        expectFailure(label, () => assertLoadedSchemaIdentity(secondEntry, candidate, new Set([firstSchema.$id])), "Duplicate schema $id");
      },
    ],
    [
      "missing manifest schema",
      (label) => {
        const candidate = structuredClone(manifest);
        candidate.schemas.pop();
        expectFailure(label, () => assertManifestDiskCoverage(candidate, bundle.onDiskSchemaPaths), "count mismatch");
      },
    ],
    [
      "missing dependency",
      (label) => {
        const candidate = structuredClone(manifest);
        candidate.schemas[0].dependencies.push("urn:uuid:00000000-0000-4000-8000-000000000000");
        expectFailure(label, () => validateManifestDeclarations(candidate), "Missing dependency");
      },
    ],
    [
      "duplicate manifest path",
      (label) => {
        const candidate = structuredClone(manifest);
        candidate.schemas[1].path = candidate.schemas[0].path;
        expectFailure(label, () => validateManifestDeclarations(candidate), "Duplicate manifest schema path");
      },
    ],
    [
      "unresolved $ref",
      (label) => {
        const candidate = {
          ...structuredClone(firstSchema),
          $defs: { toolingSelfTest: { $ref: "urn:uuid:00000000-0000-4000-8000-000000000000" } },
        };
        expectFailure(
          label,
          () =>
            scanSchemaSafety({
              entry: firstEntry,
              schema: candidate,
              text: JSON.stringify(candidate),
              schemaIds,
            }),
          "Unresolved schema reference",
        );
      },
    ],
    ["unknown semantic-check identifier", (label) => expectFailure(label, () => evaluateSemanticCheck({ semanticCheck: "unknown-tool-self-test" }, {}), "Unknown semantic-check")],
    [
      "semantic-negative unexpectedly passes",
      (label) =>
        expectFailure(
          label,
          () =>
            runFixtureCase({
              testCase: {
                id: "TOOL-SELF-TEST-SEMANTIC-NEGATIVE",
                kind: "value",
                value: "accepted",
                structuralExpected: "pass",
                semanticExpected: "fail",
                semanticCheck: "tenant-id",
              },
              validateTarget: () => true,
            }),
          "Semantic expectation mismatch",
        ),
    ],
    [
      "prohibited default",
      (label) => {
        const candidate = {
          ...structuredClone(firstSchema),
          $defs: { toolingSelfTest: { type: "string", default: "x" } },
        };
        expectFailure(
          label,
          () =>
            scanSchemaSafety({
              entry: firstEntry,
              schema: candidate,
              text: syntheticText,
              schemaIds,
            }),
          "Prohibited default",
        );
      },
    ],
    [
      "prohibited nullable",
      (label) => {
        const candidate = {
          ...structuredClone(firstSchema),
          $defs: { toolingSelfTest: { type: "string", nullable: true } },
        };
        expectFailure(
          label,
          () =>
            scanSchemaSafety({
              entry: firstEntry,
              schema: candidate,
              text: syntheticText,
              schemaIds,
            }),
          "Prohibited nullable",
        );
      },
    ],
    [
      "external Ghost Bridge schema reference",
      (label) => {
        const candidate = {
          ...structuredClone(firstSchema),
          $defs: { toolingSelfTest: { $ref: "urn:ghostbridge:tool-self-test" } },
        };
        expectFailure(
          label,
          () =>
            scanSchemaSafety({
              entry: firstEntry,
              schema: candidate,
              text: JSON.stringify(candidate),
              schemaIds,
            }),
          "External Ghost Bridge",
        );
      },
    ],
  ];
  const coreCount = runGroup(tests);
  const pathCount = runPathPolicySelfTests();
  const registryCount = runRegistryExactSetSelfTests({ registry, validateRegistry });
  const artifactCount = runArtifactExactByteSelfTests();
  const directoryEntryCount = runDirectoryEntrySelfTests();
  const ancestorComponentCount = runAncestorComponentSelfTests();
  const machineAssetCoverageCount = runMachineAssetCoverageSelfTests(bundle);
  const closedCoreCount = runClosedCoreSelfTests(bundle);
  const fixtureClassificationCount = runFixtureClassificationSelfTests();
  return {
    coreCount,
    pathCount,
    registryCount,
    artifactCount,
    directoryEntryCount,
    ancestorComponentCount,
    machineAssetCoverageCount,
    closedCoreCount,
    fixtureClassificationCount,
    totalCount:
      coreCount +
      pathCount +
      registryCount +
      artifactCount +
      directoryEntryCount +
      ancestorComponentCount +
      machineAssetCoverageCount +
      closedCoreCount +
      fixtureClassificationCount,
  };
}
