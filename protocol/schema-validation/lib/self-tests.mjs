import {
  assertLoadedSchemaIdentity,
  assertManifestDiskCoverage,
  validateManifestDeclarations,
} from "./bundle-loader.mjs";
import { errorMessage, fail } from "./errors.mjs";
import { runFixtureCase } from "./fixture-runner.mjs";
import { assertNoDuplicateObjectKeys, decodeStrictUtf8 } from "./json-source.mjs";
import { assertCanonicalPosixRelativePath } from "./path-policy.mjs";
import { scanSchemaSafety } from "./schema-safety.mjs";
import {
  artifactByteIntegrityMatches,
  evaluateSemanticCheck,
  sha256Base64url,
} from "./semantic-checks.mjs";

function expectFailure(label, operation, expectedMessage) {
  try {
    operation();
  } catch (error) {
    const message = errorMessage(error);
    if (expectedMessage && !message.includes(expectedMessage)) {
      fail(`Tooling self-test ${label} failed with the wrong diagnostic: ${message}`, { cause: error });
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
  const digest = sha256Base64url(emptyBytes);
  const exact = { algorithm: "sha-256", value: digest, byteLength: 0 };
  const input = { artifactBytesHex: "" };
  return runGroup([
    ["empty-byte exact digest", (label) => expectTrue(label, digest === "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU")],
    ["positive exact-byte match", (label) => expectTrue(label, artifactByteIntegrityMatches(exact, input))],
    ["digest mismatch", (label) => expectTrue(label, !artifactByteIntegrityMatches({ ...exact, value: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }, input))],
    ["byteLength mismatch", (label) => expectTrue(label, !artifactByteIntegrityMatches({ ...exact, byteLength: 1 }, input))],
    ["malformed semantic bytes", (label) => expectTrue(label, !artifactByteIntegrityMatches(exact, { artifactBytesHex: "0g" }))],
  ]);
}

export function runRegistryExactSetSelfTests({ registry, validateRegistry }) {
  const rejects = (label, candidate) => expectTrue(label, validateRegistry(candidate) === false);
  return runGroup([
    ["order independence", (label) => {
      const candidate = structuredClone(registry);
      candidate.facets.reverse();
      candidate.authenticationProfiles.reverse();
      expectTrue(label, validateRegistry(candidate) === true);
    }],
    ["wrong facet", (label) => {
      const candidate = structuredClone(registry);
      candidate.facets[0].id = "gb.facet.tool-self-test-wrong";
      rejects(label, candidate);
    }],
    ["extra facet", (label) => {
      const candidate = structuredClone(registry);
      candidate.facets.push({ ...candidate.facets[0], id: "gb.facet.tool-self-test-extra" });
      rejects(label, candidate);
    }],
    ["missing facet", (label) => {
      const candidate = structuredClone(registry);
      candidate.facets.pop();
      rejects(label, candidate);
    }],
    ["wrong authentication profile", (label) => {
      const candidate = structuredClone(registry);
      candidate.authenticationProfiles[0].id = "gb.auth.tool-self-test-wrong";
      rejects(label, candidate);
    }],
    ["extra authentication profile", (label) => {
      const candidate = structuredClone(registry);
      candidate.authenticationProfiles.push({ ...candidate.authenticationProfiles[0], id: "gb.auth.tool-self-test-extra" });
      rejects(label, candidate);
    }],
    ["missing authentication profile", (label) => {
      const candidate = structuredClone(registry);
      candidate.authenticationProfiles.pop();
      rejects(label, candidate);
    }],
  ]);
}

export function runSeededValidatorSelfTests({ bundle, registry, validateRegistry }) {
  const manifest = bundle.manifest;
  const firstEntry = manifest.schemas[0];
  const firstSchema = bundle.schemas.get(firstEntry.schemaId);
  const schemaIds = bundle.schemaIds;
  const syntheticText = JSON.stringify(firstSchema);
  const tests = [
    ["duplicate schema $id", (label) => {
      const secondEntry = manifest.schemas[1];
      const candidate = structuredClone(bundle.schemas.get(secondEntry.schemaId));
      candidate.$id = firstSchema.$id;
      expectFailure(
        label,
        () => assertLoadedSchemaIdentity(secondEntry, candidate, new Set([firstSchema.$id])),
        "Duplicate schema $id",
      );
    }],
    ["missing manifest schema", (label) => {
      const candidate = structuredClone(manifest);
      candidate.schemas.pop();
      expectFailure(label, () => assertManifestDiskCoverage(candidate, bundle.onDiskSchemaPaths), "count mismatch");
    }],
    ["missing dependency", (label) => {
      const candidate = structuredClone(manifest);
      candidate.schemas[0].dependencies.push("urn:uuid:00000000-0000-4000-8000-000000000000");
      expectFailure(label, () => validateManifestDeclarations(candidate), "Missing dependency");
    }],
    ["duplicate manifest path", (label) => {
      const candidate = structuredClone(manifest);
      candidate.schemas[1].path = candidate.schemas[0].path;
      expectFailure(label, () => validateManifestDeclarations(candidate), "Duplicate manifest schema path");
    }],
    ["unresolved $ref", (label) => {
      const candidate = { ...structuredClone(firstSchema), $defs: { toolingSelfTest: { $ref: "urn:uuid:00000000-0000-4000-8000-000000000000" } } };
      expectFailure(label, () => scanSchemaSafety({ entry: firstEntry, schema: candidate, text: JSON.stringify(candidate), schemaIds }), "Unresolved schema reference");
    }],
    ["unknown semantic-check identifier", (label) => expectFailure(label, () => evaluateSemanticCheck({ semanticCheck: "unknown-tool-self-test" }, {}), "Unknown semantic-check")],
    ["semantic-negative unexpectedly passes", (label) => expectFailure(label, () => runFixtureCase({
      testCase: {
        id: "TOOL-SELF-TEST-SEMANTIC-NEGATIVE",
        kind: "value",
        value: "accepted",
        structuralExpected: "pass",
        semanticExpected: "fail",
        semanticCheck: "none",
      },
      validateTarget: () => true,
    }), "Semantic expectation mismatch")],
    ["prohibited default", (label) => {
      const candidate = { ...structuredClone(firstSchema), $defs: { toolingSelfTest: { type: "string", default: "x" } } };
      expectFailure(label, () => scanSchemaSafety({ entry: firstEntry, schema: candidate, text: syntheticText, schemaIds }), "Prohibited default");
    }],
    ["prohibited nullable", (label) => {
      const candidate = { ...structuredClone(firstSchema), $defs: { toolingSelfTest: { type: "string", nullable: true } } };
      expectFailure(label, () => scanSchemaSafety({ entry: firstEntry, schema: candidate, text: syntheticText, schemaIds }), "Prohibited nullable");
    }],
    ["external Ghost Bridge schema reference", (label) => {
      const candidate = { ...structuredClone(firstSchema), $defs: { toolingSelfTest: { $ref: "urn:ghostbridge:tool-self-test" } } };
      expectFailure(label, () => scanSchemaSafety({ entry: firstEntry, schema: candidate, text: JSON.stringify(candidate), schemaIds }), "External Ghost Bridge")
    }],
  ];
  const coreCount = runGroup(tests);
  const pathCount = runPathPolicySelfTests();
  const registryCount = runRegistryExactSetSelfTests({ registry, validateRegistry });
  const artifactCount = runArtifactExactByteSelfTests();
  return { coreCount, pathCount, registryCount, artifactCount, totalCount: coreCount + pathCount + registryCount + artifactCount };
}
