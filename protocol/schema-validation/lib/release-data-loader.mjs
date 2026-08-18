import { readFileSync } from "node:fs";

import { diagnosticCode, releaseDataFail } from "./errors.mjs";
import { decodeStrictUtf8, parseJsonSource } from "./json-source.mjs";
import { assertCanonicalPosixRelativePath, resolveRepositoryFilesystemPath } from "./path-policy.mjs";
import { canonicalBase64url, sha256Base64url } from "./semantic-checks.mjs";
import {
  DIAGNOSTICS,
  PROTOCOL_RELEASE,
  REGISTRY_BY_CLASS,
  REGISTRY_CLASS_SET,
  RELEASE_MANIFEST_PATH,
  RELEASE_MANIFEST_SCHEMA_ID,
} from "./release-data-constants.mjs";
import { validateReleaseDataSemantics } from "./release-data-semantics.mjs";

function requireCondition(condition, code, message) {
  if (!condition) releaseDataFail(code, message);
}

function exactSet(actual, expected) {
  const left = [...actual].toSorted();
  const right = [...expected].toSorted();
  return JSON.stringify(left) === JSON.stringify(right);
}

export function readExactJsonAsset(repositoryRoot, relativePath) {
  assertCanonicalPosixRelativePath(relativePath, "release-data asset path");
  const bytes = readFileSync(resolveRepositoryFilesystemPath(repositoryRoot, relativePath, "file", "release-data asset path"));
  const text = decodeStrictUtf8(bytes, relativePath);
  return { bytes, text, value: parseJsonSource(text, relativePath) };
}

export function readExactAssetBytes(repositoryRoot, relativePath) {
  assertCanonicalPosixRelativePath(relativePath, "release-data asset path");
  return readFileSync(resolveRepositoryFilesystemPath(repositoryRoot, relativePath, "file", "release-data asset path"));
}

export function loadReleaseDataFiles(repositoryRoot) {
  const manifestRecord = readExactJsonAsset(repositoryRoot, RELEASE_MANIFEST_PATH);
  const manifest = manifestRecord.value;
  if (!manifest || !Array.isArray(manifest.registryArtifacts)) {
    releaseDataFail(DIAGNOSTICS.MANIFEST_SCHEMA, "Release-data manifest has no registryArtifacts array");
  }
  const classes = manifest.registryArtifacts.map((entry) => entry?.registryClass);
  const unknown = [...new Set(classes.filter((value) => !REGISTRY_BY_CLASS.has(value)))].toSorted();
  requireCondition(unknown.length === 0, DIAGNOSTICS.UNKNOWN_CLASS, `Unknown registry class: ${JSON.stringify(unknown)}`);
  const duplicate = [...new Set(classes.filter((value, index) => classes.indexOf(value) !== index))].toSorted();
  requireCondition(duplicate.length === 0, DIAGNOSTICS.DUPLICATE_CLASS, `Duplicate registry class: ${JSON.stringify(duplicate)}`);
  const missing = REGISTRY_CLASS_SET.filter((value) => !classes.includes(value));
  requireCondition(missing.length === 0, DIAGNOSTICS.MISSING_CLASS, `Missing registry class: ${JSON.stringify(missing)}`);
  requireCondition(manifest.protocolRelease === PROTOCOL_RELEASE, DIAGNOSTICS.WRONG_RELEASE, "Release-data manifest has the wrong ProtocolRelease");
  const paths = manifest.registryArtifacts.map((entry) => entry.path);
  requireCondition(new Set(paths).size === paths.length, DIAGNOSTICS.MULTIPLY_REFERENCED, "A release-data artifact path is multiply referenced");
  for (const entry of manifest.registryArtifacts) {
    const expected = REGISTRY_BY_CLASS.get(entry.registryClass);
    requireCondition(entry.path === expected.path && entry.artifactSchema === expected.schemaId, DIAGNOSTICS.CLASS_MISMATCH, `Manifest class/path/schema mismatch: ${entry.registryClass}`);
  }
  const artifactRecords = new Map();
  for (const entry of manifest.registryArtifacts) {
    if (typeof entry?.path !== "string") continue;
    if (artifactRecords.has(entry.path)) continue;
    try {
      artifactRecords.set(entry.path, { bytes: readExactAssetBytes(repositoryRoot, entry.path) });
    } catch (error) {
      if (diagnosticCode(error)) throw error;
      releaseDataFail(DIAGNOSTICS.PARTIAL_LOAD, `Atomic artifact load failed: ${entry.path}`, { cause: error });
    }
  }
  return { manifest, manifestRecord, artifactRecords };
}

export function validateReleaseDataBundle({ bundle, validateManifest, validatorsBySchema }) {
  const { manifest, artifactRecords } = bundle;
  requireCondition(manifest && typeof manifest === "object" && !Array.isArray(manifest), DIAGNOSTICS.MANIFEST_SCHEMA, "Release-data manifest must be an object");
  requireCondition(Array.isArray(manifest.registryArtifacts), DIAGNOSTICS.MANIFEST_SCHEMA, "Release-data manifest has no registryArtifacts array");
  const entries = manifest.registryArtifacts;
  const classes = entries.map((entry) => entry?.registryClass);
  const unknown = [...new Set(classes.filter((value) => !REGISTRY_BY_CLASS.has(value)))].toSorted();
  requireCondition(unknown.length === 0, DIAGNOSTICS.UNKNOWN_CLASS, `Unknown registry class: ${JSON.stringify(unknown)}`);
  const duplicate = [...new Set(classes.filter((value, index) => classes.indexOf(value) !== index))].toSorted();
  requireCondition(duplicate.length === 0, DIAGNOSTICS.DUPLICATE_CLASS, `Duplicate registry class: ${JSON.stringify(duplicate)}`);
  const missing = REGISTRY_CLASS_SET.filter((value) => !classes.includes(value));
  requireCondition(missing.length === 0, DIAGNOSTICS.MISSING_CLASS, `Missing registry class: ${JSON.stringify(missing)}`);
  requireCondition(entries.length === 7 && exactSet(classes, REGISTRY_CLASS_SET), DIAGNOSTICS.MANIFEST_SCHEMA, "Release-data manifest class cardinality is not exact");
  requireCondition(manifest.manifestSchema === RELEASE_MANIFEST_SCHEMA_ID, DIAGNOSTICS.MANIFEST_SCHEMA, "Release-data manifest schema identity is wrong");
  requireCondition(manifest.protocolRelease === PROTOCOL_RELEASE, DIAGNOSTICS.WRONG_RELEASE, "Release-data manifest has the wrong ProtocolRelease");

  const paths = entries.map((entry) => entry.path);
  requireCondition(new Set(paths).size === paths.length, DIAGNOSTICS.MULTIPLY_REFERENCED, "A release-data artifact path is multiply referenced");
  const unreferencedPaths = [...artifactRecords.keys()].filter((item) => !paths.includes(item)).toSorted();
  requireCondition(unreferencedPaths.length === 0, DIAGNOSTICS.UNREFERENCED_ARTIFACT, `Unreferenced artifact record cannot gain registry authority: ${JSON.stringify(unreferencedPaths)}`);
  const identities = [];
  for (const entry of entries) {
    const expected = REGISTRY_BY_CLASS.get(entry.registryClass);
    requireCondition(entry.protocolRelease === PROTOCOL_RELEASE, DIAGNOSTICS.WRONG_RELEASE, `Manifest entry has wrong ProtocolRelease: ${entry.registryClass}`);
    requireCondition(entry.path === expected.path && entry.artifactSchema === expected.schemaId, DIAGNOSTICS.CLASS_MISMATCH, `Manifest class/path/schema mismatch: ${entry.registryClass}`);
    requireCondition(typeof entry[expected.identityField] === "string", DIAGNOSTICS.WRONG_ARTIFACT_IDENTITY, `Manifest entry has wrong typed artifact identity field: ${entry.registryClass}`);
    identities.push(entry[expected.identityField]);
    const integrity = entry.artifactByteIntegrity;
    requireCondition(integrity && typeof integrity === "object" && !Array.isArray(integrity) && integrity.algorithm === "sha-256" && canonicalBase64url(integrity.value, 32, 32) && Number.isSafeInteger(integrity.byteLength) && integrity.byteLength >= 0, DIAGNOSTICS.WRONG_INTEGRITY_REFERENCE, `Manifest entry has invalid integrity reference: ${entry.registryClass}`);
  }
  requireCondition(new Set(identities).size === identities.length, DIAGNOSTICS.WRONG_ARTIFACT_IDENTITY, "Duplicate typed release-data artifact identity");

  if (typeof validateManifest === "function" && !validateManifest(manifest)) {
    releaseDataFail(DIAGNOSTICS.MANIFEST_SCHEMA, "Release-data manifest failed structural validation");
  }

  const artifactsByClass = new Map();
  for (const entry of entries) {
    const expected = REGISTRY_BY_CLASS.get(entry.registryClass);
    const record = artifactRecords.get(entry.path);
    requireCondition(record !== undefined, DIAGNOSTICS.PARTIAL_LOAD, `Atomic registry set is incomplete: ${entry.path}`);
    requireCondition(record.bytes.byteLength === entry.artifactByteIntegrity.byteLength, DIAGNOSTICS.WRONG_INTEGRITY_BYTE_LENGTH, `Artifact byte length mismatch: ${entry.registryClass}`);
    requireCondition(sha256Base64url(record.bytes) === entry.artifactByteIntegrity.value, DIAGNOSTICS.WRONG_INTEGRITY_SHA256, `Artifact SHA-256 mismatch: ${entry.registryClass}`);
    let artifact;
    try {
      const text = decodeStrictUtf8(record.bytes, entry.path);
      artifact = parseJsonSource(text, entry.path);
    } catch (error) {
      releaseDataFail(DIAGNOSTICS.INVALID_CONTENT, `Artifact JSON parsing failed after exact-byte integrity verification: ${entry.registryClass}`, { cause: error });
    }
    requireCondition(artifact?.registryClass === entry.registryClass, DIAGNOSTICS.CLASS_MISMATCH, `Artifact class does not match manifest: ${entry.registryClass}`);
    requireCondition(artifact?.protocolRelease === PROTOCOL_RELEASE && artifact.protocolRelease === entry.protocolRelease, DIAGNOSTICS.WRONG_RELEASE, `Artifact has wrong ProtocolRelease: ${entry.registryClass}`);
    requireCondition(artifact?.artifactSchema === expected.schemaId, DIAGNOSTICS.CLASS_MISMATCH, `Artifact schema does not match class: ${entry.registryClass}`);
    requireCondition(artifact?.[expected.identityField] === entry[expected.identityField], DIAGNOSTICS.WRONG_ARTIFACT_IDENTITY, `Artifact identity does not match manifest: ${entry.registryClass}`);
    const validateArtifact = validatorsBySchema?.get(expected.schemaId);
    requireCondition(typeof validateArtifact === "function", DIAGNOSTICS.INVALID_CONTENT, `Artifact schema validator is unavailable: ${expected.schemaId}`);
    requireCondition(validateArtifact(artifact), DIAGNOSTICS.INVALID_CONTENT, `Artifact failed structural validation: ${entry.registryClass}`);
    artifactsByClass.set(entry.registryClass, artifact);
  }
  requireCondition(artifactsByClass.size === 7, DIAGNOSTICS.PARTIAL_LOAD, "Atomic registry set did not load exactly seven classes");
  return { artifactsByClass, ...validateReleaseDataSemantics(artifactsByClass) };
}
