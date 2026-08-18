import { readFileSync } from "node:fs";

import { releaseDataFail } from "./errors.mjs";
import { decodeStrictUtf8, parseJsonSource } from "./json-source.mjs";
import { resolveRepositoryFilesystemPath } from "./path-policy.mjs";
import {
  DIAGNOSTICS,
  PROTOCOL_RELEASE,
  REGISTRY_DEFINITIONS,
  RELEASE_CONFORMANCE_LOCK_PATH,
} from "./release-data-constants.mjs";
import { sha256Base64url } from "./semantic-checks.mjs";

const LOCK_FORMAT = "ghostbridge-release-data-conformance-lock/v1";
const LOCK_STATUS = "nonsemantic-build-conformance-evidence";

function serializeProjection(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function failLock(message) {
  releaseDataFail(DIAGNOSTICS.SEMANTIC_LOCK, message);
}

function artifactRecordsFromSource(source) {
  if (!Array.isArray(source?.artifacts)) failLock("Maintained source has no artifact array");
  const descriptors = new Map(source.artifacts.map((descriptor) => [descriptor?.artifact?.registryClass, descriptor]));
  return REGISTRY_DEFINITIONS.map((definition) => {
    const descriptor = descriptors.get(definition.registryClass);
    const artifact = descriptor?.artifact;
    if (!artifact) failLock(`Maintained source is missing locked artifact: ${definition.registryClass}`);
    const bytes = serializeProjection(artifact);
    return {
      registryClass: definition.registryClass,
      path: definition.path,
      artifactSchema: definition.schemaId,
      identityField: definition.identityField,
      artifactIdentity: artifact[definition.identityField],
      artifactSha256: sha256Base64url(bytes),
      byteLength: bytes.byteLength,
    };
  });
}

export function buildReleaseDataConformanceProjection(source) {
  return {
    lockFormat: LOCK_FORMAT,
    protocolRelease: PROTOCOL_RELEASE,
    status: LOCK_STATUS,
    sourceSemanticSha256: sha256Base64url(serializeProjection(source)),
    artifacts: artifactRecordsFromSource(source),
  };
}

export function loadReleaseDataConformanceLock(repositoryRoot) {
  const absolutePath = resolveRepositoryFilesystemPath(repositoryRoot, RELEASE_CONFORMANCE_LOCK_PATH, "file", "release-data conformance-lock path");
  const bytes = readFileSync(absolutePath);
  const text = decodeStrictUtf8(bytes, RELEASE_CONFORMANCE_LOCK_PATH);
  return parseJsonSource(text, RELEASE_CONFORMANCE_LOCK_PATH);
}

export function verifyReleaseDataConformanceLock(lock, source) {
  const expected = buildReleaseDataConformanceProjection(source);
  if (JSON.stringify(lock) !== JSON.stringify(expected)) {
    failLock("Maintained release-data semantics do not match the separately reviewed conformance lock");
  }
  return { artifactCount: expected.artifacts.length, sourceSemanticSha256: expected.sourceSemanticSha256 };
}

export function verifyArtifactsAgainstConformanceLock(lock, artifactsByClass) {
  if (!(artifactsByClass instanceof Map)) failLock("Artifact conformance input is not a class map");
  if (!Array.isArray(lock?.artifacts) || lock.artifacts.length !== REGISTRY_DEFINITIONS.length) failLock("Conformance lock artifact set is malformed");
  for (const definition of REGISTRY_DEFINITIONS) {
    const locked = lock.artifacts.find((item) => item?.registryClass === definition.registryClass);
    const artifact = artifactsByClass.get(definition.registryClass);
    if (!locked || !artifact) failLock(`Conformance lock class set is incomplete: ${definition.registryClass}`);
    const bytes = serializeProjection(artifact);
    if (locked.path !== definition.path
      || locked.artifactSchema !== definition.schemaId
      || locked.identityField !== definition.identityField
      || locked.artifactIdentity !== artifact[definition.identityField]
      || locked.artifactSha256 !== sha256Base64url(bytes)
      || locked.byteLength !== bytes.byteLength) {
      failLock(`Artifact semantics do not match the reviewed lock: ${definition.registryClass}`);
    }
  }
  return { artifactCount: REGISTRY_DEFINITIONS.length };
}
