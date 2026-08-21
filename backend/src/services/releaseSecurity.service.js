const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PLACEHOLDER = /^(?:<[^>\r\n]+>|$)/;
const EXCLUDED_SEGMENT =
  /(?:^|\/)(?:node_modules|dist|build|coverage|\.cache|test-results|playwright-report)(?:\/|$)/;
const DOCUMENTED_FIXTURE_PATHS = Object.freeze([
  /(?:^|\/)tests?(?:\/|$)/,
  /(?:^|\/)scripts\/verify[^/]*\.js$/i,
  /(?:^|\/)(?:developerSandboxService|dataAccessPerformanceHarness\.service|dataAccessRegistry\.service)\.js$/i,
  /^gemini-(?:basic-request|basic-response|models-response)\.json$/i,
]);
const MAX_SCANNED_FILE_BYTES = 2 * 1024 * 1024;
const PUBLIC_DATA_HASH_CHUNK_BYTES = 64 * 1024;
// These fingerprints are security-scanner classifications only, not Ghost Bridge
// protocol authority. Each entry authorizes only its exact reviewed path and
// bytes: it does not authorize future Unicode versions, sibling files, or
// arbitrary oversized files. A future path, version, or source requires a
// separately reviewed scanner fingerprint.
const REVIEWED_PUBLIC_DATA_FINGERPRINTS = Object.freeze([
  Object.freeze({
    path: 'protocol/unicode/17.0.0/source/ucd/UnicodeData.txt',
    byteLength: 2198209,
    sha256: '2e1efc1dcb59c575eedf5ccae60f95229f706ee6d031835247d843c11d96470c',
  }),
]);
// These exact fingerprints classify scanner input only. They are not protocol
// authority and deliberately do not authorize future paths or structures.
const FACET_PROPERTY_ARTIFACT_PATH =
  'protocol/registries/e1.r0-draft.1/release-data/facet-property.registry.json';
const RELEASE_DATA_SOURCE_PATH =
  'protocol/schema-validation/release-data/e1.r0-draft.1.source.json';
const FACET_PROPERTY_SCHEMA_ID = 'urn:uuid:876284f1-c7c1-468f-bab6-c679e564c3fe';
const FACET_PROPERTY_ARTIFACT_ID = 'urn:uuid:aef799c0-6fd3-4e3d-a0bd-c804e137661f';
const RELEASE_DATA_SOURCE_SCHEMA_ID = 'urn:uuid:377b6b6b-2c73-4309-9df8-343057a56e41';
const PROTOCOL_RELEASE = 'ghostbridge/e1.r0-draft.1';
const FACET_PROPERTY_REGISTRY_CLASS = 'gb.registry.facet-property';
const RELEASE_REGISTRY_TOKEN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const FACET_ARTIFACT_KEYS = Object.freeze([
  'artifactSchema',
  'protocolRelease',
  'registryClass',
  'facetPropertyArtifact',
  'facets',
  'failureCodes',
  'invariantProperties',
  'capabilityNarrowableProperties',
  'classificationRules',
  'releaseSelectionRoles',
  'approvalRoleAssignments',
  'taskRoleAssignments',
  'receiptRoleAssignments',
]);
const INVARIANT_PROPERTY_KEYS = Object.freeze([
  'token',
  'revision',
  'classification',
  'facets',
  'meaning',
  'roles',
  'failure',
]);
const NARROWABLE_PROPERTY_KEYS = Object.freeze([
  'token',
  'revision',
  'classification',
  'facets',
  'meaning',
  'applicableSources',
  'capabilityLocalReason',
  'noWidenNoWaiver',
  'conflictFailure',
]);
const RECEIPT_NARROWABLE_PROPERTY_KEYS = Object.freeze([
  ...NARROWABLE_PROPERTY_KEYS,
  'values',
  'optionalIsAlias',
  'stricterRequirementSources',
]);
const FILE_SCAN_BLOCKERS = Object.freeze({
  accessError: 'TRACKED_FILE_SCAN_ERROR',
  changedDuringScan: 'TRACKED_FILE_CHANGED_DURING_SCAN',
  fingerprintMismatch: 'TRACKED_FILE_FINGERPRINT_MISMATCH',
  oversize: 'TRACKED_FILE_SIZE_LIMIT_EXCEEDED',
  pathOutsideRepository: 'TRACKED_FILE_PATH_OUTSIDE_REPOSITORY',
  symlink: 'TRACKED_SYMBOLIC_LINK_BLOCKED',
  unsupportedType: 'TRACKED_FILE_TYPE_UNSUPPORTED',
});

const DETECTORS = Object.freeze([
  {
    name: 'PRIVATE_KEY_BLOCK',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: 'MONGODB_EMBEDDED_CREDENTIAL',
    pattern: /mongodb(?:\+srv)?:\/\/[^:\s/"'<>]+:[^@\s/"'<>]+@/i,
  },
  {
    name: 'REDIS_EMBEDDED_CREDENTIAL',
    pattern: /rediss?:\/\/[^@\s/"'<>]*:[^@\s/"'<>]+@/i,
  },
  {
    name: 'AWS_ACCESS_KEY',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  },
  {
    name: 'GITHUB_TOKEN',
    pattern: /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{30,255}\b/,
  },
  {
    name: 'SLACK_TOKEN',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,255}\b/,
  },
  {
    name: 'PROVIDER_API_KEY',
    pattern: /\bAIza[0-9A-Za-z_-]{30,80}\b/,
  },
  {
    name: 'AUTHORIZATION_BEARER_TOKEN',
    pattern: /\bAuthorization\s*[:=]\s*["']?Bearer\s+[A-Za-z0-9._~+/-]{20,}/i,
  },
  {
    name: 'SIGNED_URL_CREDENTIAL',
    pattern:
      /[?&](?:X-Amz-Signature|X-Goog-Signature|Signature|sig|token)=[A-Fa-f0-9%_-]{20,}/i,
  },
]);

function normalizePath(filePath) {
  return String(filePath || '').replaceAll('\\', '/').replace(/^\.\/+/, '');
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value, expectedKeys) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...expectedKeys].sort(compareCodeUnits);
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isPublicRegistryToken(value) {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 128 &&
    RELEASE_REGISTRY_TOKEN.test(value)
  );
}

function isInvariantPropertyRecord(value) {
  return (
    hasExactKeys(value, INVARIANT_PROPERTY_KEYS) &&
    isPublicRegistryToken(value.token) &&
    Number.isInteger(value.revision) &&
    value.revision >= 1 &&
    value.classification === 'invariant' &&
    isStringArray(value.facets) &&
    isNonEmptyString(value.meaning) &&
    isNonEmptyString(value.roles) &&
    isStringArray(value.failure)
  );
}

function isNarrowablePropertyRecord(value) {
  const exactShape =
    hasExactKeys(value, NARROWABLE_PROPERTY_KEYS) ||
    hasExactKeys(value, RECEIPT_NARROWABLE_PROPERTY_KEYS);
  return (
    exactShape &&
    isPublicRegistryToken(value.token) &&
    Number.isInteger(value.revision) &&
    value.revision >= 1 &&
    value.classification === 'capability-narrowable' &&
    isStringArray(value.facets) &&
    isNonEmptyString(value.meaning) &&
    isStringArray(value.applicableSources) &&
    isNonEmptyString(value.capabilityLocalReason) &&
    isNonEmptyString(value.noWidenNoWaiver) &&
    isNonEmptyString(value.conflictFailure) &&
    (!Object.hasOwn(value, 'values') || isStringArray(value.values)) &&
    (!Object.hasOwn(value, 'optionalIsAlias') || typeof value.optionalIsAlias === 'boolean') &&
    (!Object.hasOwn(value, 'stricterRequirementSources') ||
      isStringArray(value.stricterRequirementSources))
  );
}

function facetPropertyTokens(value) {
  if (
    !hasExactKeys(value, FACET_ARTIFACT_KEYS) ||
    value.artifactSchema !== FACET_PROPERTY_SCHEMA_ID ||
    value.protocolRelease !== PROTOCOL_RELEASE ||
    value.registryClass !== FACET_PROPERTY_REGISTRY_CLASS ||
    value.facetPropertyArtifact !== FACET_PROPERTY_ARTIFACT_ID ||
    !Array.isArray(value.facets) ||
    !Array.isArray(value.failureCodes) ||
    !Array.isArray(value.invariantProperties) ||
    value.invariantProperties.length === 0 ||
    !value.invariantProperties.every(isInvariantPropertyRecord) ||
    !Array.isArray(value.capabilityNarrowableProperties) ||
    value.capabilityNarrowableProperties.length === 0 ||
    !value.capabilityNarrowableProperties.every(isNarrowablePropertyRecord) ||
    !isPlainObject(value.classificationRules) ||
    !isPlainObject(value.releaseSelectionRoles) ||
    !isPlainObject(value.approvalRoleAssignments) ||
    !isPlainObject(value.taskRoleAssignments) ||
    !isPlainObject(value.receiptRoleAssignments)
  ) {
    return null;
  }
  const tokens = [
    ...value.invariantProperties.map((record) => record.token),
    ...value.capabilityNarrowableProperties.map((record) => record.token),
  ];
  return new Set(tokens).size === tokens.length ? tokens : null;
}

function tokensFromMaintainedSource(value) {
  if (
    !hasExactKeys(value, [
      'sourceSchema',
      'protocolRelease',
      'status',
      'serialization',
      'artifacts',
    ]) ||
    value.sourceSchema !== RELEASE_DATA_SOURCE_SCHEMA_ID ||
    value.protocolRelease !== PROTOCOL_RELEASE ||
    value.status !== 'maintained-semantic-source' ||
    !hasExactKeys(value.serialization, [
      'encoding',
      'bom',
      'newline',
      'indentSpaces',
      'terminalNewline',
    ]) ||
    value.serialization.encoding !== 'UTF-8' ||
    value.serialization.bom !== false ||
    value.serialization.newline !== 'LF' ||
    value.serialization.indentSpaces !== 2 ||
    value.serialization.terminalNewline !== true ||
    !Array.isArray(value.artifacts)
  ) {
    return null;
  }
  const candidates = value.artifacts.filter(
    (descriptor) =>
      descriptor?.path === FACET_PROPERTY_ARTIFACT_PATH ||
      descriptor?.artifact?.registryClass === FACET_PROPERTY_REGISTRY_CLASS,
  );
  if (candidates.length !== 1) return null;
  const descriptor = candidates[0];
  if (
    !hasExactKeys(descriptor, ['path', 'schemaId', 'identityField', 'artifact']) ||
    descriptor.path !== FACET_PROPERTY_ARTIFACT_PATH ||
    descriptor.schemaId !== FACET_PROPERTY_SCHEMA_ID ||
    descriptor.identityField !== 'facetPropertyArtifact'
  ) {
    return null;
  }
  return facetPropertyTokens(descriptor.artifact);
}

function recognizedPublicProtocolIdentifierLines(content, filePath) {
  const normalizedPath = normalizePath(filePath);
  if (
    normalizedPath !== FACET_PROPERTY_ARTIFACT_PATH &&
    normalizedPath !== RELEASE_DATA_SOURCE_PATH
  ) {
    return new Set();
  }
  const text = String(content || '');
  if (Buffer.byteLength(text, 'utf8') > MAX_SCANNED_FILE_BYTES) return new Set();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return new Set();
    throw error;
  }
  const tokens =
    normalizedPath === FACET_PROPERTY_ARTIFACT_PATH
      ? facetPropertyTokens(parsed)
      : tokensFromMaintainedSource(parsed);
  if (!tokens) return new Set();

  const occurrences = new Map(tokens.map((token) => [token, []]));
  text.split(/\r?\n/).forEach((line, index) => {
    const match = line.match(/^\s*(?:\{\s*)?"token"\s*:\s*"([^"\\\r\n]+)"/);
    if (match && occurrences.has(match[1])) occurrences.get(match[1]).push(index + 1);
  });
  if ([...occurrences.values()].some((lineNumbers) => lineNumbers.length !== 1)) {
    return new Set();
  }
  return new Set([...occurrences.values()].map(([lineNumber]) => lineNumber));
}

function sensitiveVariableName(name) {
  const normalized = String(name || '').replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  if (/(?:_VERSION|_TIMEOUT|_LIMIT|_COUNT|_MAX|_MIN|OUTPUT_TOKENS)$/.test(normalized)) {
    return false;
  }
  return (
    ['MONGODB_URI', 'REDIS_URL', 'AUTHORIZATION'].includes(normalized) ||
    /(?:^|_)(?:SECRET|PASSWORD|TOKEN|API_KEY|PRIVATE_KEY|ENCRYPTION_KEY)$/.test(normalized)
  );
}

function safeAssignmentFinding(line, filePath) {
  const environmentFile = /(?:^|\/)\.env(?:\.example)?$/i.test(normalizePath(filePath));
  const match = environmentFile
    ? line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]{2,127})\s*=\s*(.*)$/)
    : line.match(
        /^\s*(?:\{\s*)?(?:const|let|var)?\s*["']?([A-Za-z][A-Za-z0-9_]*)["']?\s*[:=]\s*["'`]([^"'`]{16,})["'`]/,
      );
  if (!match || !sensitiveVariableName(match[1])) return null;
  const value = match[2].trim();
  if (
    PLACEHOLDER.test(value) ||
    value.includes('<') ||
    /^(?:undefined|null|false|true|process\.env|source\[|environment\.|input\.|options\.)/i.test(
      value,
    ) ||
    value.length < 16
  ) {
    return null;
  }
  return /ENCRYPTION_KEY/i.test(match[1])
    ? 'ENCRYPTION_KEY_ASSIGNMENT'
    : /JWT/i.test(match[1])
      ? 'JWT_SECRET_ASSIGNMENT'
      : /TOKEN/i.test(match[1])
        ? 'RUNTIME_TOKEN_ASSIGNMENT'
        : 'SECRET_ASSIGNMENT';
}

function safeFinding(detector, filePath, lineNumber) {
  return Object.freeze({
    detector,
    filePath: normalizePath(filePath),
    lineNumber,
    redacted: `<redacted:${detector}>`,
  });
}

function scanText(content, filePath = '<memory>') {
  const findings = [];
  const text = String(content || '');
  const lines = text.split(/\r?\n/);

  // Strong credential-content detection is deliberately independent of any
  // public-identifier classification and always runs first.
  lines.forEach((line, index) => {
    for (const detector of DETECTORS) {
      if (!detector.pattern.test(line)) continue;
      if (
        line.includes(`release-secret-scanner: allow ${detector.name}`) ||
        line.includes('release-secret-scanner: fixture')
      ) {
        continue;
      }
      findings.push(safeFinding(detector.name, filePath, index + 1));
    }
  });

  // Classification can suppress only the generic token-name assignment
  // heuristic. Invalid path, structure, JSON, value shape, or line mapping
  // produces an empty set and therefore reverts to ordinary scanning.
  const publicIdentifierLines = recognizedPublicProtocolIdentifierLines(text, filePath);
  lines.forEach((line, index) => {
    const assignmentDetector = safeAssignmentFinding(line, filePath);
    const publicProtocolIdentifier =
      assignmentDetector === 'RUNTIME_TOKEN_ASSIGNMENT' && publicIdentifierLines.has(index + 1);
    if (
      assignmentDetector &&
      !publicProtocolIdentifier &&
      !line.includes(`release-secret-scanner: allow ${assignmentDetector}`) &&
      !line.includes('release-secret-scanner: fixture')
    ) {
      findings.push(safeFinding(assignmentDetector, filePath, index + 1));
    }
  });
  return findings;
}

function gitTrackedFiles(repositoryRoot) {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  return output
    .split('\0')
    .map(normalizePath)
    .filter(Boolean)
    .sort(compareCodeUnits);
}

function isScannableTrackedPath(relativePath) {
  const normalized = normalizePath(relativePath);
  if (EXCLUDED_SEGMENT.test(normalized)) return false;
  if (/(?:^|\/)\.env(?:\..+)?$/i.test(normalized) && !/\.env\.example$/i.test(normalized)) {
    return false;
  }
  return /\.(?:c?js|mjs|json|ya?ml|toml|ini|conf|properties|env|example|md|txt|ps1)$/i.test(
    normalized,
  );
}

function sameFileIdentity(beforeOpen, afterOpen) {
  return (
    afterOpen.isFile() &&
    beforeOpen.dev === afterOpen.dev &&
    beforeOpen.ino === afterOpen.ino
  );
}

function reviewedPublicDataFingerprint(relativePath) {
  const normalized = normalizePath(relativePath);
  return REVIEWED_PUBLIC_DATA_FINGERPRINTS.find(
    (fingerprint) => fingerprint.path === normalized,
  );
}

function readBoundedFile(fileSystem, descriptor) {
  const bytes = Buffer.allocUnsafe(MAX_SCANNED_FILE_BYTES + 1);
  let byteLength = 0;
  while (byteLength < bytes.length) {
    const readLength = fileSystem.readSync(
      descriptor,
      bytes,
      byteLength,
      bytes.length - byteLength,
      null,
    );
    if (!Number.isInteger(readLength) || readLength < 0) {
      throw new Error('Invalid bounded file-read result');
    }
    if (readLength === 0) break;
    byteLength += readLength;
  }
  if (byteLength > MAX_SCANNED_FILE_BYTES) return { blocker: FILE_SCAN_BLOCKERS.oversize };
  return { content: bytes.subarray(0, byteLength).toString('utf8') };
}

function verifyPublicDataFingerprint(fileSystem, descriptor, fingerprint) {
  const digest = crypto.createHash('sha256');
  const chunk = Buffer.allocUnsafe(PUBLIC_DATA_HASH_CHUNK_BYTES);
  let byteLength = 0;
  while (byteLength < fingerprint.byteLength) {
    const readLimit = Math.min(chunk.length, fingerprint.byteLength - byteLength);
    let readLength;
    try {
      readLength = fileSystem.readSync(descriptor, chunk, 0, readLimit, null);
    } catch {
      return { blocker: FILE_SCAN_BLOCKERS.accessError };
    }
    if (!Number.isInteger(readLength) || readLength <= 0 || readLength > readLimit) {
      return { blocker: FILE_SCAN_BLOCKERS.fingerprintMismatch };
    }
    digest.update(chunk.subarray(0, readLength));
    byteLength += readLength;
  }
  if (
    byteLength !== fingerprint.byteLength ||
    digest.digest('hex') !== fingerprint.sha256
  ) {
    return { blocker: FILE_SCAN_BLOCKERS.fingerprintMismatch };
  }
  return { verifiedPublicData: true };
}

function inspectTrackedFile(absolutePath, relativePath, fileSystem) {
  const fingerprint = reviewedPublicDataFingerprint(relativePath);
  let entry;
  try {
    entry = fileSystem.lstatSync(absolutePath);
  } catch {
    return { blocker: FILE_SCAN_BLOCKERS.accessError };
  }
  if (entry.isSymbolicLink()) return { blocker: FILE_SCAN_BLOCKERS.symlink };
  if (!entry.isFile()) return { blocker: FILE_SCAN_BLOCKERS.unsupportedType };
  if (fingerprint) {
    if (entry.size !== fingerprint.byteLength) {
      return { blocker: FILE_SCAN_BLOCKERS.fingerprintMismatch };
    }
  } else if (entry.size > MAX_SCANNED_FILE_BYTES) {
    return { blocker: FILE_SCAN_BLOCKERS.oversize };
  }

  let descriptor;
  let inspection;
  try {
    const noFollow =
      typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    descriptor = fileSystem.openSync(absolutePath, fs.constants.O_RDONLY | noFollow);
    const openedEntry = fileSystem.fstatSync(descriptor);
    if (!sameFileIdentity(entry, openedEntry)) {
      inspection = { blocker: FILE_SCAN_BLOCKERS.changedDuringScan };
    } else if (fingerprint && openedEntry.size !== fingerprint.byteLength) {
      inspection = { blocker: FILE_SCAN_BLOCKERS.fingerprintMismatch };
    } else if (!fingerprint && openedEntry.size > MAX_SCANNED_FILE_BYTES) {
      inspection = { blocker: FILE_SCAN_BLOCKERS.oversize };
    } else if (fingerprint) {
      inspection = verifyPublicDataFingerprint(fileSystem, descriptor, fingerprint);
      if (inspection.verifiedPublicData) {
        const completedEntry = fileSystem.fstatSync(descriptor);
        if (!sameFileIdentity(entry, completedEntry)) {
          inspection = { blocker: FILE_SCAN_BLOCKERS.changedDuringScan };
        } else if (completedEntry.size !== fingerprint.byteLength) {
          inspection = { blocker: FILE_SCAN_BLOCKERS.fingerprintMismatch };
        }
      }
    } else {
      inspection = readBoundedFile(fileSystem, descriptor);
    }
  } catch {
    inspection = { blocker: FILE_SCAN_BLOCKERS.accessError };
  }
  if (descriptor !== undefined) {
    try {
      fileSystem.closeSync(descriptor);
    } catch {
      inspection = { blocker: FILE_SCAN_BLOCKERS.accessError };
    }
  }
  return inspection || { blocker: FILE_SCAN_BLOCKERS.accessError };
}

function scanTrackedFiles(repositoryRoot, options = {}) {
  const fileSystem = options.fileSystem || fs;
  const candidates = (options.files || gitTrackedFiles(repositoryRoot))
    .map(normalizePath)
    .filter(isScannableTrackedPath)
    .sort(compareCodeUnits);
  const fixtureFiles = candidates.filter((file) =>
    DOCUMENTED_FIXTURE_PATHS.some((pattern) => pattern.test(file)),
  );
  const files = candidates.filter((file) => !fixtureFiles.includes(file));
  const findings = [];
  let scannedFileCount = 0;
  let verifiedPublicDataFileCount = 0;
  let blockedFileCount = 0;
  for (const relativePath of files) {
    const absolutePath = path.resolve(repositoryRoot, relativePath);
    if (!absolutePath.startsWith(path.resolve(repositoryRoot) + path.sep)) {
      findings.push(safeFinding(FILE_SCAN_BLOCKERS.pathOutsideRepository, relativePath, null));
      blockedFileCount += 1;
      continue;
    }
    const inspection = inspectTrackedFile(absolutePath, relativePath, fileSystem);
    if (inspection.blocker) {
      findings.push(safeFinding(inspection.blocker, relativePath, null));
      blockedFileCount += 1;
      continue;
    }
    if (inspection.verifiedPublicData) {
      verifiedPublicDataFileCount += 1;
      continue;
    }
    findings.push(...scanText(inspection.content, relativePath));
    scannedFileCount += 1;
  }
  return Object.freeze({
    passed: findings.length === 0,
    candidateFileCount: files.length,
    scannedFileCount,
    verifiedPublicDataFileCount,
    blockedFileCount,
    documentedFixtureFileCount: fixtureFiles.length,
    findings: Object.freeze(findings),
    historyScanned: false,
  });
}

function validateEnvironmentExample(content, filePath) {
  const issues = [];
  String(content || '')
    .split(/\r?\n/)
    .forEach((line, index) => {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!match || !sensitiveVariableName(match[1])) return;
      const value = match[2].trim();
      if (value === '' || value.includes('<') || PLACEHOLDER.test(value)) return;
      issues.push({
        code: 'ENVIRONMENT_EXAMPLE_REAL_VALUE',
        variableName: match[1],
        filePath: normalizePath(filePath),
        lineNumber: index + 1,
      });
    });
  return issues;
}

function validateEnvironmentExamples(repositoryRoot) {
  const files = gitTrackedFiles(repositoryRoot).filter((file) => /\.env\.example$/i.test(file));
  const issues = files.flatMap((file) =>
    validateEnvironmentExample(fs.readFileSync(path.resolve(repositoryRoot, file), 'utf8'), file),
  );
  return { passed: issues.length === 0, files, issues };
}

function validateGitignore(repositoryRoot) {
  const requiredPatterns = [
    '.env',
    '.env.*',
    '**/.env',
    '**/.env.*',
    '!.env.example',
    '!**/.env.example',
  ];
  const content = fs.readFileSync(path.resolve(repositoryRoot, '.gitignore'), 'utf8');
  const lines = new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#')),
  );
  const missingPatterns = requiredPatterns.filter((pattern) => !lines.has(pattern));
  const trackedRealEnvironmentFiles = gitTrackedFiles(repositoryRoot).filter(
    (file) => /(?:^|\/)\.env(?:\..+)?$/i.test(file) && !/\.env\.example$/i.test(file),
  );
  return {
    passed: missingPatterns.length === 0 && trackedRealEnvironmentFiles.length === 0,
    missingPatterns,
    trackedRealEnvironmentFiles,
  };
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

module.exports = {
  DETECTORS,
  DOCUMENTED_FIXTURE_PATHS,
  gitTrackedFiles,
  isScannableTrackedPath,
  normalizePath,
  scanText,
  scanTrackedFiles,
  sha256,
  sensitiveVariableName,
  validateEnvironmentExample,
  validateEnvironmentExamples,
  validateGitignore,
};
