import {
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadFoundationBundle } from "./lib/bundle-loader.mjs";
import { fail, releaseDataFail } from "./lib/errors.mjs";
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
  DIAGNOSTICS,
} from "./lib/release-data-constants.mjs";
import {
  loadReleaseDataConformanceLock,
  verifyArtifactsAgainstConformanceLock,
  verifyReleaseDataConformanceLock,
} from "./lib/release-data-conformance-lock.mjs";
import { loadReleaseDataFiles, validateReleaseDataBundle } from "./lib/release-data-loader.mjs";
import { createOfflineSchemaValidator } from "./lib/schema-safety.mjs";
import { canonicalBase64url, sha256Base64url } from "./lib/semantic-checks.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");
const PREFLIGHT_TOKEN = Symbol("release-data-generation-preflight");

const validationPaths = Object.freeze({
  manifest: "protocol/schemas/e1.r0-draft.1/foundation-manifest.json",
  schemas: "protocol/schemas/e1.r0-draft.1",
  fixtures: "protocol/fixtures/wire/e1.r0-draft.1/foundation",
  registries: "protocol/registries/e1.r0-draft.1",
});

export function serializeGeneratedJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assertExactStrings(actual, expected, label) {
  const left = [...actual].toSorted();
  const right = [...expected].toSorted();
  if (left.length !== new Set(left).size || JSON.stringify(left) !== JSON.stringify(right)) {
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
      if (descriptor[property] !== expected[property]) fail(`Release-data source ${registryClass} has wrong ${property}: ${String(descriptor[property])}`);
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

export function loadReleaseDataGenerationContext(root = repositoryRoot) {
  const foundation = loadFoundationBundle({
    repositoryRoot: root,
    manifestPath: validationPaths.manifest,
    schemaRoot: validationPaths.schemas,
    fixtureRoot: validationPaths.fixtures,
    registryRoot: validationPaths.registries,
  });
  const { ajv } = createOfflineSchemaValidator(foundation.schemas);
  const validatorsBySchema = new Map([...foundation.schemaIds].map((schemaId) => [schemaId, ajv.getSchema(schemaId)]));
  return { ajv, validatorsBySchema, validateManifest: validatorsBySchema.get(RELEASE_MANIFEST_SCHEMA_ID) };
}

function generatedBundle(generated) {
  return {
    manifest: generated.manifest,
    manifestRecord: { bytes: generated.manifestBytes, text: generated.manifestBytes.toString("utf8"), value: generated.manifest },
    artifactRecords: new Map([...generated.artifactBytes].map(([relativePath, bytes]) => [relativePath, { bytes }])),
  };
}

export function preflightReleaseDataGeneration({
  root = repositoryRoot,
  source = loadMaintainedSource(root),
  conformanceLock = loadReleaseDataConformanceLock(root),
  validationContext = loadReleaseDataGenerationContext(root),
} = {}) {
  const validateSource = validationContext.validatorsBySchema.get(RELEASE_SOURCE_SCHEMA_ID);
  if (typeof validateSource !== "function" || !validateSource(source)) {
    releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, `Maintained release-data source failed structural validation: ${validationContext.ajv.errorsText(validateSource?.errors)}`);
  }
  const generated = generateReleaseData(source);
  const candidateResult = validateReleaseDataBundle({
    bundle: generatedBundle(generated),
    validateManifest: validationContext.validateManifest,
    validatorsBySchema: validationContext.validatorsBySchema,
  });
  const lockResult = verifyReleaseDataConformanceLock(conformanceLock, source);
  verifyArtifactsAgainstConformanceLock(conformanceLock, candidateResult.artifactsByClass);
  return Object.freeze({
    [PREFLIGHT_TOKEN]: true,
    generated,
    source,
    conformanceLock,
    validationContext,
    candidateResult,
    lockResult,
  });
}

export function validateEstablishedReleaseForWrite({ generated, currentBundle, validateManifest }) {
  const manifest = currentBundle?.manifest;
  const entries = manifest?.registryArtifacts;
  if (typeof validateManifest !== "function" || !validateManifest(manifest)) {
    releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, "Current release-data manifest failed structural validation");
  }
  if (!Array.isArray(entries) || entries.length !== REGISTRY_DEFINITIONS.length) {
    releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, "Current release-data manifest is not the exact established seven-entry set");
  }
  assertExactStrings(entries.map((item) => item?.registryClass), REGISTRY_CLASS_SET, "Current release-data manifest class set");

  for (const definition of REGISTRY_DEFINITIONS) {
    const matches = entries.filter((item) => item.registryClass === definition.registryClass);
    if (matches.length !== 1) releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, `Current manifest must contain exactly one entry: ${definition.registryClass}`);
    const currentEntry = matches[0];
    const generatedEntry = generated.manifest.registryArtifacts.find((item) => item.registryClass === definition.registryClass);
    if (!generatedEntry) releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, `Candidate manifest is missing registry class: ${definition.registryClass}`);
    if (currentEntry.path !== definition.path || currentEntry.artifactSchema !== definition.schemaId || currentEntry.protocolRelease !== PROTOCOL_RELEASE) {
      releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, `Current manifest class/path/schema/release binding is invalid: ${definition.registryClass}`);
    }
    const record = currentBundle.artifactRecords.get(definition.path);
    if (!Buffer.isBuffer(record?.bytes)) releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, `Current artifact is missing: ${definition.path}`);
    const integrity = currentEntry.artifactByteIntegrity;
    if (integrity?.algorithm !== "sha-256" || !canonicalBase64url(integrity.value, 32, 32) || integrity.byteLength !== record.bytes.byteLength || sha256Base64url(record.bytes) !== integrity.value) {
      releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, `Current artifact integrity does not match its manifest reference: ${definition.registryClass}`);
    }
    let currentArtifact;
    try {
      currentArtifact = parseJsonSource(decodeStrictUtf8(record.bytes, definition.path), definition.path);
    } catch (error) {
      releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, `Current artifact cannot be parsed exactly: ${definition.registryClass}`, { cause: error });
    }
    if (currentArtifact?.registryClass !== definition.registryClass
      || currentArtifact?.protocolRelease !== PROTOCOL_RELEASE
      || currentArtifact?.artifactSchema !== definition.schemaId
      || typeof currentEntry[definition.identityField] !== "string"
      || currentArtifact[definition.identityField] !== currentEntry[definition.identityField]) {
      releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, `Current typed artifact identity does not match: ${definition.registryClass}`);
    }
    const candidateBytes = generated.artifactBytes.get(definition.path);
    if (!Buffer.isBuffer(candidateBytes)) releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, `Candidate artifact bytes are missing: ${definition.path}`);
    if (!record.bytes.equals(candidateBytes) && currentEntry[definition.identityField] === generatedEntry[definition.identityField]) {
      releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, `Changed artifact bytes require a new immutable typed identity: ${definition.registryClass}`);
    }
  }
  return { artifactCount: REGISTRY_DEFINITIONS.length };
}

function stagedOutputs(generated) {
  return [
    ...REGISTRY_DEFINITIONS.map((definition) => [definition.path, generated.artifactBytes.get(definition.path)]),
    [RELEASE_MANIFEST_PATH, generated.manifestBytes],
  ];
}

function replaceGeneratedOutputs(generated, root = repositoryRoot, { beforeReplace } = {}) {
  const replacements = [];
  try {
    for (const [relativePath, bytes] of stagedOutputs(generated)) {
      if (!Buffer.isBuffer(bytes)) releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, `Generated output is missing: ${relativePath}`);
      const target = resolveRepositoryFilesystemPath(root, relativePath, "file", "generated output path");
      const original = readFileSync(target);
      const originalMode = statSync(target).mode & 0o777;
      const staged = `${target}.rda-stage-${process.pid}-${randomUUID()}`;
      const descriptor = openSync(staged, "wx", originalMode);
      try {
        writeFileSync(descriptor, bytes);
        fsyncSync(descriptor);
      } finally {
        closeSync(descriptor);
      }
      replacements.push({ relativePath, target, staged, original });
    }
  } catch (error) {
    for (const item of replacements) rmSync(item.staged, { force: true });
    releaseDataFail(DIAGNOSTICS.GENERATOR_REPLACEMENT, "Failed while staging generated outputs; established files were not changed", { cause: error });
  }

  try {
    for (let index = 0; index < replacements.length; index += 1) {
      beforeReplace?.(replacements[index].relativePath, index);
      renameSync(replacements[index].staged, replacements[index].target);
    }
  } catch (error) {
    const rollbackFailures = [];
    for (const item of replacements) {
      try {
        writeFileSync(item.target, item.original);
      } catch (rollbackError) {
        rollbackFailures.push(`${item.relativePath}: ${String(rollbackError)}`);
      }
      rmSync(item.staged, { force: true });
    }
    releaseDataFail(DIAGNOSTICS.GENERATOR_REPLACEMENT, `Generated-output replacement failed and originals were restored${rollbackFailures.length === 0 ? "" : `; rollback failures=${JSON.stringify(rollbackFailures)}`}`, { cause: error });
  }
  return { writtenFiles: replacements.length };
}

export function writeGeneratedReleaseData(preflight, root = repositoryRoot, options = undefined) {
  if (preflight?.[PREFLIGHT_TOKEN] !== true) releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, "Generated release-data output was not produced by the complete preflight");
  let currentBundle;
  try {
    currentBundle = loadReleaseDataFiles(root);
  } catch (error) {
    releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, "Established release-data manifest or artifact set could not be loaded exactly; implicit bootstrap is prohibited", { cause: error });
  }
  validateEstablishedReleaseForWrite({
    generated: preflight.generated,
    currentBundle,
    validateManifest: preflight.validationContext.validateManifest,
  });
  return replaceGeneratedOutputs(preflight.generated, root, options);
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
  if (process.argv.length !== 3 || (mode !== "--write" && mode !== "--check")) fail("Usage: node protocol/schema-validation/generate-release-data.mjs (--write|--check)");
  const preflight = preflightReleaseDataGeneration({ root: repositoryRoot });
  if (mode === "--write") {
    const result = writeGeneratedReleaseData(preflight, repositoryRoot);
    console.log(`RELEASE_DATA_GENERATION WRITE ${result.writtenFiles}`);
  } else {
    const result = checkGeneratedReleaseData(preflight.generated, repositoryRoot);
    console.log(`RELEASE_DATA_GENERATION CHECK ${result.checkedFiles}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) main();
