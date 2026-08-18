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

import { loadFoundationBundle, loadManifestAssets } from "./lib/bundle-loader.mjs";
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
import { verifyReleaseDataConstraintCoverage } from "./lib/release-data-constraint-coverage.mjs";
import { createOfflineSchemaValidator } from "./lib/schema-safety.mjs";
import { canonicalBase64url, sha256Base64url } from "./lib/semantic-checks.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");
const PREFLIGHT_TOKEN = Symbol("release-data-generation-preflight");
const preflightRecords = new WeakMap();

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
  const loadedAssets = loadManifestAssets({ repositoryRoot: root, manifest: foundation.manifest, schemaIds: foundation.schemaIds });
  const inventory = loadedAssets.assets.get(foundation.manifest.semanticConstraintInventory.path);
  return { ajv, validatorsBySchema, validateManifest: validatorsBySchema.get(RELEASE_MANIFEST_SCHEMA_ID), inventory };
}

function generatedBundle(generated) {
  return {
    manifest: generated.manifest,
    manifestRecord: { bytes: generated.manifestBytes, text: generated.manifestBytes.toString("utf8"), value: generated.manifest },
    artifactRecords: new Map([...generated.artifactBytes].map(([relativePath, bytes]) => [relativePath, { bytes }])),
  };
}

function cloneGeneratedCandidate(generated) {
  return {
    manifest: structuredClone(generated.manifest),
    manifestBytes: Buffer.from(generated.manifestBytes),
    artifactBytes: new Map([...generated.artifactBytes].map(([relativePath, bytes]) => [relativePath, Buffer.from(bytes)])),
  };
}

function generatedCandidateFingerprint(generated) {
  if (!generated || !Buffer.isBuffer(generated.manifestBytes) || !(generated.artifactBytes instanceof Map)) {
    releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, "Prevalidated generated candidate has an invalid representation");
  }
  const artifacts = [...generated.artifactBytes]
    .map(([relativePath, bytes]) => {
      if (typeof relativePath !== "string" || !Buffer.isBuffer(bytes)) releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, "Prevalidated generated artifact bytes are invalid");
      return { relativePath, sha256: sha256Base64url(bytes), byteLength: bytes.byteLength };
    })
    .toSorted((left, right) => (left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0));
  const projection = {
    manifestObjectSha256: sha256Base64url(serializeGeneratedJson(generated.manifest)),
    manifestBytesSha256: sha256Base64url(generated.manifestBytes),
    manifestByteLength: generated.manifestBytes.byteLength,
    artifacts,
  };
  return sha256Base64url(serializeGeneratedJson(projection));
}

function requireUnchangedPreflight(preflight) {
  const record = preflightRecords.get(preflight);
  if (preflight?.[PREFLIGHT_TOKEN] !== true || !record) {
    releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, "Generated release-data output was not produced by the complete preflight");
  }
  let currentFingerprint;
  try {
    currentFingerprint = generatedCandidateFingerprint(preflight.generated);
  } catch (error) {
    if (error?.code === DIAGNOSTICS.GENERATOR_PREFLIGHT) throw error;
    releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, "Prevalidated generated candidate became unreadable after preflight", { cause: error });
  }
  if (currentFingerprint !== record.fingerprint) {
    releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, "Prevalidated generated candidate changed after validation");
  }
  return record;
}

export function preflightReleaseDataGeneration(options = {}) {
  const root = options.root === undefined ? repositoryRoot : options.root;
  const sourceWasProvided = options.source !== undefined;
  const conformanceLockWasProvided = options.conformanceLock !== undefined;
  const validationContextWasProvided = options.validationContext !== undefined;
  const source = sourceWasProvided ? options.source : loadMaintainedSource(root);
  const conformanceLock = conformanceLockWasProvided ? options.conformanceLock : loadReleaseDataConformanceLock(root);
  const validationContext = validationContextWasProvided ? options.validationContext : loadReleaseDataGenerationContext(root);
  const validateSource = validationContext.validatorsBySchema.get(RELEASE_SOURCE_SCHEMA_ID);
  if (typeof validateSource !== "function" || !validateSource(source)) {
    releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, `Maintained release-data source failed structural validation: ${validationContext.ajv.errorsText(validateSource?.errors)}`);
  }
  const generated = generateReleaseData(source);
  const candidateResult = validateReleaseDataBundle({
    bundle: generatedBundle(generated),
    validateManifest: validationContext.validateManifest,
    validatorsBySchema: validationContext.validatorsBySchema,
    conformanceLock,
  });
  const lockResult = verifyReleaseDataConformanceLock(conformanceLock, source);
  verifyArtifactsAgainstConformanceLock(conformanceLock, candidateResult.artifactsByClass);
  const constraintCoverage = verifyReleaseDataConstraintCoverage(validationContext.inventory, candidateResult.executedSemanticCheckIds);
  const publicPreflight = Object.freeze({
    [PREFLIGHT_TOKEN]: true,
    generated,
    candidateFingerprint: generatedCandidateFingerprint(generated),
    artifactCount: candidateResult.artifactsByClass.size,
    executedSemanticCheckCount: constraintCoverage.executedCheckerCount,
  });
  preflightRecords.set(publicPreflight, Object.freeze({
    fingerprint: publicPreflight.candidateFingerprint,
    candidate: cloneGeneratedCandidate(generated),
    source: structuredClone(source),
    conformanceLock: structuredClone(conformanceLock),
    validationContext,
    lockResult,
    constraintCoverage,
    freshPreflightInputs: Object.freeze({
      root,
      ...(sourceWasProvided ? { source: structuredClone(source) } : {}),
      ...(conformanceLockWasProvided ? { conformanceLock: structuredClone(conformanceLock) } : {}),
      ...(validationContextWasProvided ? { validationContext } : {}),
    }),
  }));
  return publicPreflight;
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
  const currentManifestBytes = currentBundle?.manifestRecord?.bytes;
  if (!Buffer.isBuffer(currentManifestBytes)) releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, "Current release-data manifest bytes are unavailable");
  let parsedCurrentManifest;
  try {
    parsedCurrentManifest = parseJsonSource(decodeStrictUtf8(currentManifestBytes, RELEASE_MANIFEST_PATH), RELEASE_MANIFEST_PATH);
  } catch (error) {
    releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, "Current release-data manifest bytes cannot be parsed exactly", { cause: error });
  }
  if (JSON.stringify(parsedCurrentManifest) !== JSON.stringify(manifest)) {
    releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, "Current release-data manifest object does not match the validated manifest bytes");
  }
  assertExactStrings(entries.map((item) => item?.registryClass), REGISTRY_CLASS_SET, "Current release-data manifest class set");

  const validatedCurrentBytes = new Map([[RELEASE_MANIFEST_PATH, Buffer.from(currentManifestBytes)]]);

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
    validatedCurrentBytes.set(definition.path, Buffer.from(record.bytes));
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
  return { artifactCount: REGISTRY_DEFINITIONS.length, validatedCurrentBytes };
}

function stagedOutputs(generated) {
  return [
    ...REGISTRY_DEFINITIONS.map((definition) => [definition.path, generated.artifactBytes.get(definition.path)]),
    [RELEASE_MANIFEST_PATH, generated.manifestBytes],
  ];
}

function restoreReplacedOutputs(replacements) {
  const recoveryFailures = [];
  for (const item of replacements) {
    if (item.replaced) {
      try {
        const current = readFileSync(item.target);
        if (current.equals(item.candidate)) writeFileSync(item.target, item.original);
        else recoveryFailures.push(`${item.relativePath}: target changed after replacement and was not overwritten during recovery`);
      } catch (error) {
        recoveryFailures.push(`${item.relativePath}: ${String(error)}`);
      }
    }
    rmSync(item.staged, { force: true });
  }
  return recoveryFailures;
}

function replaceGeneratedOutputs(generated, validatedCurrentBytes, root = repositoryRoot, { beforeReplace } = {}) {
  const replacements = [];
  try {
    for (const [relativePath, bytes] of stagedOutputs(generated)) {
      if (!Buffer.isBuffer(bytes)) releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, `Generated output is missing: ${relativePath}`);
      const validatedCurrent = validatedCurrentBytes.get(relativePath);
      if (!Buffer.isBuffer(validatedCurrent)) releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, `Validated current bytes are missing: ${relativePath}`);
      const target = resolveRepositoryFilesystemPath(root, relativePath, "file", "generated output path");
      const currentAtStaging = readFileSync(target);
      if (!currentAtStaging.equals(validatedCurrent)) releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, `Established target changed after validation: ${relativePath}`);
      const originalMode = statSync(target).mode & 0o777;
      const staged = `${target}.rda-stage-${process.pid}-${randomUUID()}`;
      try {
        const descriptor = openSync(staged, "wx", originalMode);
        try {
          writeFileSync(descriptor, bytes);
          fsyncSync(descriptor);
        } finally {
          closeSync(descriptor);
        }
      } catch (error) {
        rmSync(staged, { force: true });
        throw error;
      }
      replacements.push({ relativePath, target, staged, original: Buffer.from(validatedCurrent), candidate: Buffer.from(bytes), replaced: false });
    }
  } catch (error) {
    for (const item of replacements) rmSync(item.staged, { force: true });
    releaseDataFail(DIAGNOSTICS.GENERATOR_REPLACEMENT, "Failed while staging generated outputs; established files were not changed", { cause: error });
  }

  try {
    for (let index = 0; index < replacements.length; index += 1) {
      beforeReplace?.(replacements[index].relativePath, index);
      const currentBeforeReplace = readFileSync(replacements[index].target);
      if (!currentBeforeReplace.equals(replacements[index].original)) {
        releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, `Established target changed between validation and replacement: ${replacements[index].relativePath}`);
      }
      renameSync(replacements[index].staged, replacements[index].target);
      replacements[index].replaced = true;
    }
  } catch (error) {
    const recoveryFailures = restoreReplacedOutputs(replacements);
    releaseDataFail(DIAGNOSTICS.GENERATOR_REPLACEMENT, `Generated-output replacement failed; safely restorable prior outputs were restored${recoveryFailures.length === 0 ? "" : `; recovery limits=${JSON.stringify(recoveryFailures)}`}`, { cause: error });
  }
  return { writtenFiles: replacements.length, replacements };
}

export function writeGeneratedReleaseData(preflight, root = repositoryRoot, options = {}) {
  const initialRecord = requireUnchangedPreflight(preflight);
  const freshPreflight = preflightReleaseDataGeneration(initialRecord.freshPreflightInputs);
  const freshRecord = requireUnchangedPreflight(freshPreflight);
  if (freshRecord.fingerprint !== initialRecord.fingerprint) {
    releaseDataFail(DIAGNOSTICS.GENERATOR_PREFLIGHT, "Fresh write-time preflight does not match the previously reviewed candidate");
  }
  const candidate = freshRecord.candidate;
  let currentBundle;
  try {
    currentBundle = loadReleaseDataFiles(root);
  } catch (error) {
    releaseDataFail(DIAGNOSTICS.GENERATOR_CURRENT_STATE, "Established release-data manifest or artifact set could not be loaded exactly; implicit bootstrap is prohibited", { cause: error });
  }
  const establishedState = validateEstablishedReleaseForWrite({
    generated: candidate,
    currentBundle,
    validateManifest: freshRecord.validationContext.validateManifest,
  });
  const replacement = replaceGeneratedOutputs(candidate, establishedState.validatedCurrentBytes, root, options);
  try {
    options.beforeFinalVerification?.();
    const finalVerification = verifyFinalWrittenState(candidate, freshRecord, root);
    return { writtenFiles: replacement.writtenFiles, finalVerification };
  } catch (error) {
    const recoveryFailures = restoreReplacedOutputs(replacement.replacements);
    releaseDataFail(DIAGNOSTICS.GENERATOR_REPLACEMENT, `Post-replacement validation failed; safely restorable prior outputs were restored${recoveryFailures.length === 0 ? "" : `; recovery limits=${JSON.stringify(recoveryFailures)}`}`, { cause: error });
  }
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

function verifyFinalWrittenState(candidate, preflightRecord, root) {
  const finalBundle = loadReleaseDataFiles(root);
  const finalResult = validateReleaseDataBundle({
    bundle: finalBundle,
    validateManifest: preflightRecord.validationContext.validateManifest,
    validatorsBySchema: preflightRecord.validationContext.validatorsBySchema,
    conformanceLock: preflightRecord.conformanceLock,
  });
  const coverage = verifyReleaseDataConstraintCoverage(preflightRecord.validationContext.inventory, finalResult.executedSemanticCheckIds);
  verifyReleaseDataConformanceLock(preflightRecord.conformanceLock, preflightRecord.source);
  verifyArtifactsAgainstConformanceLock(preflightRecord.conformanceLock, finalResult.artifactsByClass);
  const reproduction = checkGeneratedReleaseData(candidate, root);
  return {
    artifactCount: finalResult.artifactsByClass.size,
    executedSemanticCheckCount: coverage.executedCheckerCount,
    reproducedFileCount: reproduction.checkedFiles,
  };
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
