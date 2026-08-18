import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fail } from "./lib/errors.mjs";
import { parseJsonSource, decodeStrictUtf8 } from "./lib/json-source.mjs";
import { assertCanonicalPosixRelativePath, resolveRepositoryFilesystemPath } from "./lib/path-policy.mjs";
import {
  PROTOCOL_RELEASE,
  REGISTRY_BY_CLASS,
  REGISTRY_CLASS_SET,
  REGISTRY_DEFINITIONS,
  RELEASE_MANIFEST_PATH,
  RELEASE_MANIFEST_SCHEMA_ID,
  RELEASE_SOURCE_PATH,
  RELEASE_SOURCE_SCHEMA_ID,
} from "./lib/release-data-constants.mjs";
import { sha256Base64url } from "./lib/semantic-checks.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");

export function serializeGeneratedJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assertExactStrings(actual, expected, label) {
  const left = [...actual].toSorted();
  const right = [...expected].toSorted();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    fail(`${label} mismatch: actual=${JSON.stringify(left)} expected=${JSON.stringify(right)}`);
  }
}

export function generateReleaseData(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) fail("Release-data source must be an object");
  if (source.sourceSchema !== RELEASE_SOURCE_SCHEMA_ID) fail("Release-data source has the wrong schema identity");
  if (source.protocolRelease !== PROTOCOL_RELEASE) fail("Release-data source has the wrong ProtocolRelease");
  if (!Array.isArray(source.artifacts)) fail("Release-data source artifacts must be an array");
  assertExactStrings(source.artifacts.map((item) => item?.artifact?.registryClass), REGISTRY_CLASS_SET, "Release-data source registry class set");

  const artifactBytes = new Map();
  const artifactIdentities = new Set();
  const artifactPaths = new Set();
  const manifestEntries = [];
  for (const descriptor of source.artifacts) {
    const registryClass = descriptor?.artifact?.registryClass;
    const expected = REGISTRY_BY_CLASS.get(registryClass);
    if (!expected) fail(`Unknown release-data source registry class: ${String(registryClass)}`);
    for (const property of ["identityField", "schemaId", "path"]) {
      if (descriptor[property] !== expected[property]) {
        fail(`Release-data source ${registryClass} has wrong ${property}: ${String(descriptor[property])}`);
      }
    }
    assertCanonicalPosixRelativePath(descriptor.path, `${registryClass} artifact path`);
    if (artifactPaths.has(descriptor.path)) fail(`Multiply referenced release-data source path: ${descriptor.path}`);
    artifactPaths.add(descriptor.path);
    const artifact = descriptor.artifact;
    if (artifact.protocolRelease !== PROTOCOL_RELEASE) fail(`Release-data source artifact has wrong ProtocolRelease: ${registryClass}`);
    if (artifact.artifactSchema !== descriptor.schemaId) fail(`Release-data source artifact has wrong schema identity: ${registryClass}`);
    const artifactIdentity = artifact[descriptor.identityField];
    if (typeof artifactIdentity !== "string") fail(`Release-data source artifact has no typed identity: ${registryClass}`);
    if (artifactIdentities.has(artifactIdentity)) fail(`Duplicate release-data artifact identity: ${artifactIdentity}`);
    artifactIdentities.add(artifactIdentity);
    const bytes = serializeGeneratedJson(artifact);
    artifactBytes.set(descriptor.path, bytes);
    manifestEntries.push({
      registryClass,
      protocolRelease: PROTOCOL_RELEASE,
      artifactSchema: descriptor.schemaId,
      path: descriptor.path,
      [descriptor.identityField]: artifactIdentity,
      artifactByteIntegrity: {
        algorithm: "sha-256",
        value: sha256Base64url(bytes),
        byteLength: bytes.byteLength,
      },
    });
  }

  const manifest = {
    manifestSchema: RELEASE_MANIFEST_SCHEMA_ID,
    protocolRelease: PROTOCOL_RELEASE,
    status: "draft-prerelease",
    registryArtifacts: manifestEntries,
  };
  return { manifest, manifestBytes: serializeGeneratedJson(manifest), artifactBytes };
}

export function loadMaintainedSource(root = repositoryRoot) {
  const absolutePath = resolveRepositoryFilesystemPath(root, RELEASE_SOURCE_PATH, "file", "release-data source path");
  const text = decodeStrictUtf8(readFileSync(absolutePath), RELEASE_SOURCE_PATH);
  return parseJsonSource(text, RELEASE_SOURCE_PATH);
}

export function writeGeneratedReleaseData(generated, root = repositoryRoot) {
  const currentManifestPath = resolveRepositoryFilesystemPath(root, RELEASE_MANIFEST_PATH, "file", "release-data manifest path");
  const currentManifestText = decodeStrictUtf8(readFileSync(currentManifestPath), RELEASE_MANIFEST_PATH);
  const currentManifest = parseJsonSource(currentManifestText, RELEASE_MANIFEST_PATH);
  if (Array.isArray(currentManifest.registryArtifacts)) {
    for (const definition of REGISTRY_DEFINITIONS) {
      const currentEntry = currentManifest.registryArtifacts.find((item) => item.registryClass === definition.registryClass);
      const generatedEntry = generated.manifest.registryArtifacts.find((item) => item.registryClass === definition.registryClass);
      if (!currentEntry || !generatedEntry) continue;
      const currentBytes = readFileSync(resolveRepositoryFilesystemPath(root, definition.path, "file", "generated artifact path"));
      const generatedBytes = generated.artifactBytes.get(definition.path);
      if (!currentBytes.equals(generatedBytes) && currentEntry[definition.identityField] === generatedEntry[definition.identityField]) {
        fail(`Changed artifact bytes require a new immutable typed identity: ${definition.registryClass}`);
      }
    }
  }
  for (const definition of REGISTRY_DEFINITIONS) {
    const bytes = generated.artifactBytes.get(definition.path);
    if (!bytes) fail(`Generated artifact bytes are missing: ${definition.path}`);
    writeFileSync(resolveRepositoryFilesystemPath(root, definition.path, "file", "generated artifact path"), bytes);
  }
  writeFileSync(resolveRepositoryFilesystemPath(root, RELEASE_MANIFEST_PATH, "file", "release-data manifest path"), generated.manifestBytes);
}

export function checkGeneratedReleaseData(generated, root = repositoryRoot) {
  const mismatches = [];
  for (const [relativePath, expectedBytes] of [[RELEASE_MANIFEST_PATH, generated.manifestBytes], ...generated.artifactBytes]) {
    const actualBytes = readFileSync(resolveRepositoryFilesystemPath(root, relativePath, "file", "generated asset path"));
    if (!actualBytes.equals(expectedBytes)) mismatches.push(relativePath);
  }
  if (mismatches.length > 0) fail(`Generated release-data assets are stale: ${JSON.stringify(mismatches.toSorted())}`);
  return { checkedFiles: 1 + generated.artifactBytes.size };
}

function main() {
  const mode = process.argv[2];
  if (process.argv.length !== 3 || (mode !== "--write" && mode !== "--check")) {
    fail("Usage: node protocol/schema-validation/generate-release-data.mjs (--write|--check)");
  }
  const generated = generateReleaseData(loadMaintainedSource());
  if (mode === "--write") {
    writeGeneratedReleaseData(generated);
    console.log(`RELEASE_DATA_GENERATION WRITE ${1 + generated.artifactBytes.size}`);
  } else {
    const result = checkGeneratedReleaseData(generated);
    console.log(`RELEASE_DATA_GENERATION CHECK ${result.checkedFiles}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) main();
