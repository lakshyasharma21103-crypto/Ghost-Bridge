const CANONICAL_UUID_V4_URN =
  /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const LOCAL_IDENTIFIER_1_TO_128 = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/u;
const VERSION_TOKEN_1_TO_64 = /^[a-z](?:[a-z0-9._-]{0,62}[a-z0-9])?$/u;
const CANONICAL_BASE64URL_32_OCTETS = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;
const PROTOCOL_RELEASE = 'ghostbridge/e1.r0-draft.1';

export const IDENTITY_SEMANTIC_TYPES = Object.freeze([
  'AgentIdentity',
  'CapabilityNamespaceIdentity',
  'ImmutableArtifactIdentity',
  'IssuerIdentity',
]);

export const ARTIFACT_SEMANTIC_CLASSES = Object.freeze([
  'capabilityContractArtifact',
  'passportArtifact',
]);

function hasExactObjectKeys(value, expectedKeys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function exactValidatedStringEquality(predicate, left, right) {
  return predicate(left) && predicate(right) && left === right;
}

function nestedMap(root, keys) {
  let current = root;
  for (const key of keys) {
    let child = current.get(key);
    if (child === undefined) {
      child = new Map();
      current.set(key, child);
    }
    current = child;
  }
  return current;
}

export function isCanonicalUuidV4Urn(value) {
  return typeof value === 'string' && CANONICAL_UUID_V4_URN.test(value);
}

export function isIssuerIdentity(value) {
  return isCanonicalUuidV4Urn(value);
}

export function isAgentIdentity(value) {
  return isCanonicalUuidV4Urn(value);
}

export function isCapabilityNamespaceIdentity(value) {
  return isCanonicalUuidV4Urn(value);
}

export function isImmutableArtifactIdentity(value) {
  return isCanonicalUuidV4Urn(value);
}

export function issuerIdentitiesEqual(left, right) {
  return exactValidatedStringEquality(isIssuerIdentity, left, right);
}

export function agentIdentitiesEqual(left, right) {
  return exactValidatedStringEquality(isAgentIdentity, left, right);
}

export function capabilityNamespaceIdentitiesEqual(left, right) {
  return exactValidatedStringEquality(isCapabilityNamespaceIdentity, left, right);
}

export function immutableArtifactIdentitiesEqual(left, right) {
  return exactValidatedStringEquality(isImmutableArtifactIdentity, left, right);
}

const IDENTITY_VALIDATORS = Object.freeze({
  AgentIdentity: isAgentIdentity,
  CapabilityNamespaceIdentity: isCapabilityNamespaceIdentity,
  ImmutableArtifactIdentity: isImmutableArtifactIdentity,
  IssuerIdentity: isIssuerIdentity,
});

export function typedIdentityValuesEqual(leftType, left, rightType, right) {
  const leftValidator = IDENTITY_VALIDATORS[leftType];
  const rightValidator = IDENTITY_VALIDATORS[rightType];
  return (
    typeof leftValidator === 'function' &&
    typeof rightValidator === 'function' &&
    leftValidator(left) &&
    rightValidator(right) &&
    leftType === rightType &&
    left === right
  );
}

export function typedIdentityValuesAreSeparated(leftType, left, rightType, right) {
  const leftValidator = IDENTITY_VALIDATORS[leftType];
  const rightValidator = IDENTITY_VALIDATORS[rightType];
  return (
    leftType !== rightType &&
    typeof leftValidator === 'function' &&
    typeof rightValidator === 'function' &&
    leftValidator(left) &&
    rightValidator(right) &&
    !typedIdentityValuesEqual(leftType, left, rightType, right)
  );
}

export function isPassportIdentity(value) {
  return (
    hasExactObjectKeys(value, ['issuer', 'local']) &&
    isIssuerIdentity(value.issuer) &&
    typeof value.local === 'string' &&
    LOCAL_IDENTIFIER_1_TO_128.test(value.local)
  );
}

export function passportIdentitiesEqual(left, right) {
  return (
    isPassportIdentity(left) &&
    isPassportIdentity(right) &&
    left.issuer === right.issuer &&
    left.local === right.local
  );
}

export function passportIssuerMatches(passportIdentity, separatelyCarriedIssuer) {
  return (
    isPassportIdentity(passportIdentity) &&
    isIssuerIdentity(separatelyCarriedIssuer) &&
    passportIdentity.issuer === separatelyCarriedIssuer
  );
}

export function isPassportVersion(value) {
  return typeof value === 'string' && VERSION_TOKEN_1_TO_64.test(value);
}

export function passportVersionsEqual(left, right) {
  return exactValidatedStringEquality(isPassportVersion, left, right);
}

export function isCapabilityKey(value) {
  if (
    !hasExactObjectKeys(value, ['namespaceClass', 'name']) &&
    !hasExactObjectKeys(value, ['namespaceClass', 'namespace', 'name'])
  ) {
    return false;
  }
  if (typeof value.name !== 'string' || !LOCAL_IDENTIFIER_1_TO_128.test(value.name)) {
    return false;
  }
  if (value.namespaceClass === 'core') {
    return hasExactObjectKeys(value, ['namespaceClass', 'name']);
  }
  return (
    value.namespaceClass === 'external' &&
    hasExactObjectKeys(value, ['namespaceClass', 'namespace', 'name']) &&
    isCapabilityNamespaceIdentity(value.namespace)
  );
}

export function capabilityKeysEqual(left, right) {
  if (
    !isCapabilityKey(left) ||
    !isCapabilityKey(right) ||
    left.namespaceClass !== right.namespaceClass ||
    left.name !== right.name
  ) {
    return false;
  }
  return left.namespaceClass === 'core' || left.namespace === right.namespace;
}

export function isCapabilityVersion(value) {
  return typeof value === 'string' && VERSION_TOKEN_1_TO_64.test(value);
}

export function capabilityVersionsEqual(left, right) {
  return exactValidatedStringEquality(isCapabilityVersion, left, right);
}

export function capabilityScopesEqual(left, right) {
  return (
    Boolean(left && right) &&
    capabilityKeysEqual(left.capabilityKey, right.capabilityKey) &&
    capabilityVersionsEqual(left.capabilityVersion, right.capabilityVersion)
  );
}

export function typedArtifactIdentitiesEqual(leftClass, left, rightClass, right) {
  return (
    ARTIFACT_SEMANTIC_CLASSES.includes(leftClass) &&
    ARTIFACT_SEMANTIC_CLASSES.includes(rightClass) &&
    isImmutableArtifactIdentity(left) &&
    isImmutableArtifactIdentity(right) &&
    leftClass === rightClass &&
    left === right
  );
}

export function typedArtifactIdentitiesAreSeparated(leftClass, left, rightClass, right) {
  return (
    leftClass !== rightClass &&
    ARTIFACT_SEMANTIC_CLASSES.includes(leftClass) &&
    ARTIFACT_SEMANTIC_CLASSES.includes(rightClass) &&
    isImmutableArtifactIdentity(left) &&
    isImmutableArtifactIdentity(right) &&
    !typedArtifactIdentitiesEqual(leftClass, left, rightClass, right)
  );
}

export function isArtifactByteIntegrityRef(value) {
  return (
    hasExactObjectKeys(value, ['algorithm', 'value', 'byteLength']) &&
    value.algorithm === 'sha-256' &&
    typeof value.value === 'string' &&
    CANONICAL_BASE64URL_32_OCTETS.test(value.value) &&
    Number.isSafeInteger(value.byteLength) &&
    value.byteLength >= 0
  );
}

export function artifactByteIntegrityRefsEqual(left, right) {
  return (
    isArtifactByteIntegrityRef(left) &&
    isArtifactByteIntegrityRef(right) &&
    left.algorithm === right.algorithm &&
    left.value === right.value &&
    left.byteLength === right.byteLength
  );
}

export function artifactIdentityIsDistinctFromIntegrityDigest(artifactIdentity, integrity) {
  return (
    isImmutableArtifactIdentity(artifactIdentity) &&
    isArtifactByteIntegrityRef(integrity) &&
    artifactIdentity !== integrity.value
  );
}

export function isPassportReference(value) {
  return (
    hasExactObjectKeys(value, [
      'passportIdentity',
      'passportVersion',
      'protocolRelease',
      'passportArtifact',
      'artifactByteIntegrity',
    ]) &&
    value.protocolRelease === PROTOCOL_RELEASE &&
    isPassportIdentity(value.passportIdentity) &&
    isPassportVersion(value.passportVersion) &&
    isImmutableArtifactIdentity(value.passportArtifact) &&
    isArtifactByteIntegrityRef(value.artifactByteIntegrity)
  );
}

export function passportReferenceCoordinatesEqual(left, right) {
  return (
    isPassportReference(left) &&
    isPassportReference(right) &&
    left.protocolRelease === right.protocolRelease &&
    passportIdentitiesEqual(left.passportIdentity, right.passportIdentity) &&
    passportVersionsEqual(left.passportVersion, right.passportVersion)
  );
}

export function passportReferenceMappingsEqual(left, right) {
  return (
    passportReferenceCoordinatesEqual(left, right) &&
    typedArtifactIdentitiesEqual(
      'passportArtifact',
      left.passportArtifact,
      'passportArtifact',
      right.passportArtifact,
    ) &&
    artifactByteIntegrityRefsEqual(left.artifactByteIntegrity, right.artifactByteIntegrity)
  );
}

export function isCapabilityContractReference(value) {
  return (
    hasExactObjectKeys(value, [
      'protocolRelease',
      'capabilityKey',
      'capabilityVersion',
      'capabilityContractArtifact',
      'artifactByteIntegrity',
    ]) &&
    value.protocolRelease === PROTOCOL_RELEASE &&
    isCapabilityKey(value.capabilityKey) &&
    isCapabilityVersion(value.capabilityVersion) &&
    isImmutableArtifactIdentity(value.capabilityContractArtifact) &&
    isArtifactByteIntegrityRef(value.artifactByteIntegrity)
  );
}

export function capabilityContractReferenceCoordinatesEqual(left, right) {
  return (
    isCapabilityContractReference(left) &&
    isCapabilityContractReference(right) &&
    left.protocolRelease === right.protocolRelease &&
    capabilityKeysEqual(left.capabilityKey, right.capabilityKey) &&
    capabilityVersionsEqual(left.capabilityVersion, right.capabilityVersion)
  );
}

export function artifactHistoryIsConsistent(records) {
  if (!Array.isArray(records)) return false;
  const bindings = new Map();
  for (const record of records) {
    if (
      !hasExactObjectKeys(record, ['artifactClass', 'artifactIdentity', 'artifactByteIntegrity']) ||
      !ARTIFACT_SEMANTIC_CLASSES.includes(record.artifactClass) ||
      !isImmutableArtifactIdentity(record.artifactIdentity) ||
      !isArtifactByteIntegrityRef(record.artifactByteIntegrity)
    ) {
      return false;
    }
    const byIdentity = nestedMap(bindings, [record.artifactClass]);
    const previous = byIdentity.get(record.artifactIdentity);
    if (
      previous !== undefined &&
      !artifactByteIntegrityRefsEqual(previous, record.artifactByteIntegrity)
    ) {
      return false;
    }
    if (previous === undefined) {
      byIdentity.set(record.artifactIdentity, record.artifactByteIntegrity);
    }
  }
  return true;
}

function referenceArtifactHistoryIsConsistent(records, artifactClass, artifactIdentityProperty) {
  return artifactHistoryIsConsistent(
    records.map((reference) => ({
      artifactClass,
      artifactIdentity: reference[artifactIdentityProperty],
      artifactByteIntegrity: reference.artifactByteIntegrity,
    })),
  );
}

export function passportReferenceHistoryIsConsistent(records) {
  if (!Array.isArray(records) || !records.every(isPassportReference)) return false;
  if (!referenceArtifactHistoryIsConsistent(records, 'passportArtifact', 'passportArtifact')) {
    return false;
  }
  const mappings = new Map();
  for (const reference of records) {
    const coordinate = nestedMap(mappings, [
      reference.protocolRelease,
      reference.passportIdentity.issuer,
      reference.passportIdentity.local,
    ]);
    const previous = coordinate.get(reference.passportVersion);
    if (previous !== undefined && !passportReferenceMappingsEqual(previous, reference)) {
      return false;
    }
    if (previous === undefined) coordinate.set(reference.passportVersion, reference);
  }
  return true;
}

export function capabilityContractReferenceHistoryIsConsistent(records) {
  if (!Array.isArray(records) || !records.every(isCapabilityContractReference)) return false;
  if (
    !referenceArtifactHistoryIsConsistent(
      records,
      'capabilityContractArtifact',
      'capabilityContractArtifact',
    )
  ) {
    return false;
  }
  const declarations = new Map();
  for (const reference of records) {
    const key = reference.capabilityKey;
    const namespace = key.namespaceClass === 'external' ? key.namespace : '';
    const coordinate = nestedMap(declarations, [
      reference.protocolRelease,
      key.namespaceClass,
      namespace,
      key.name,
    ]);
    if (coordinate.has(reference.capabilityVersion)) return false;
    coordinate.set(reference.capabilityVersion, true);
  }
  return true;
}
