import { createRequire } from 'node:module';
import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EXPECTED_AJV_VERSION = '8.20.0';
const REVIEWED_AJV_SHA512_INTEGRITY =
  'sha512-Thbli+OlOj+iMPYFBVBfJ3OmCAnaSyNn4M1vz9T6Gka5Jt9ba/HIR56joy65tY6kx/FCF5VXNB819Y7/GUrBGA==';
const APPROVED_DIRECT_AJV_CONSUMERS = Object.freeze({
  'protocol/schema-validation/lib/schema-safety.mjs': Object.freeze(['ajv/dist/2020.js']),
  'protocol/schema-validation/validate-foundation.mjs': Object.freeze(['ajv/package.json']),
  'protocol/schema-validation/validate-r1.mjs': Object.freeze(['ajv/package.json']),
  'protocol/schema-validation/validate-release-data.mjs': Object.freeze(['ajv/package.json']),
});

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), '..');
const realRepositoryRoot = realpathSync(repositoryRoot);

class ProvenanceError extends Error {
  constructor(classification, detail) {
    super(`${classification}: ${detail}`);
    this.name = 'ProvenanceError';
  }
}

function fail(classification, detail) {
  throw new ProvenanceError(classification, detail);
}

function assert(condition, classification, detail) {
  if (!condition) fail(classification, detail);
}

function isContainedWithin(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function readJson(relativePath, classification) {
  let source;
  try {
    source = readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
  } catch {
    fail(classification, `${relativePath} is not readable`);
  }

  try {
    return JSON.parse(source);
  } catch {
    fail(classification, `${relativePath} is not valid JSON`);
  }
}

function verifyRootOwnership() {
  const manifest = readJson('package.json', 'VALIDATOR_PROVENANCE_ROOT_OWNERSHIP_MISMATCH');
  assert(
    manifest.name === 'ghost-bridge' && manifest.private === true,
    'VALIDATOR_PROVENANCE_ROOT_OWNERSHIP_MISMATCH',
    'the inspected package is not the private Ghost Bridge repository root',
  );
  assert(
    manifest.devDependencies &&
      typeof manifest.devDependencies === 'object' &&
      !Array.isArray(manifest.devDependencies),
    'VALIDATOR_PROVENANCE_ROOT_OWNERSHIP_MISMATCH',
    'root devDependencies is missing',
  );
  assert(
    manifest.devDependencies.ajv === EXPECTED_AJV_VERSION,
    'VALIDATOR_PROVENANCE_ROOT_OWNERSHIP_MISMATCH',
    `root devDependencies.ajv must equal ${EXPECTED_AJV_VERSION}`,
  );
  assert(
    !manifest.dependencies || !Object.hasOwn(manifest.dependencies, 'ajv'),
    'VALIDATOR_PROVENANCE_ROOT_OWNERSHIP_MISMATCH',
    'root dependencies must not own Ajv',
  );
  assert(
    !/[\s~^*<>=|xX]/u.test(manifest.devDependencies.ajv),
    'VALIDATOR_PROVENANCE_ROOT_OWNERSHIP_MISMATCH',
    'root Ajv ownership must not use a version range',
  );
}

function verifyLockOwnership() {
  const lock = readJson('package-lock.json', 'VALIDATOR_PROVENANCE_LOCK_OWNERSHIP_MISMATCH');
  assert(
    lock.lockfileVersion === 3,
    'VALIDATOR_PROVENANCE_LOCK_OWNERSHIP_MISMATCH',
    'package-lock.json lockfileVersion must equal 3',
  );
  assert(
    lock.packages && typeof lock.packages === 'object' && !Array.isArray(lock.packages),
    'VALIDATOR_PROVENANCE_LOCK_OWNERSHIP_MISMATCH',
    'package-lock.json packages map is missing',
  );
  const rootRecord = lock.packages[''];
  assert(
    rootRecord && rootRecord.devDependencies?.ajv === EXPECTED_AJV_VERSION,
    'VALIDATOR_PROVENANCE_LOCK_OWNERSHIP_MISMATCH',
    `lock root devDependencies.ajv must equal ${EXPECTED_AJV_VERSION}`,
  );

  const ajvRecord = lock.packages['node_modules/ajv'];
  assert(
    ajvRecord && typeof ajvRecord === 'object',
    'VALIDATOR_PROVENANCE_LOCK_VERSION_MISMATCH',
    'locked node_modules/ajv record is missing',
  );
  assert(
    ajvRecord.version === EXPECTED_AJV_VERSION,
    'VALIDATOR_PROVENANCE_LOCK_VERSION_MISMATCH',
    `locked Ajv version must equal ${EXPECTED_AJV_VERSION}`,
  );

  let resolvedIsHttps = false;
  try {
    resolvedIsHttps =
      typeof ajvRecord.resolved === 'string' && new URL(ajvRecord.resolved).protocol === 'https:';
  } catch {
    resolvedIsHttps = false;
  }
  assert(
    resolvedIsHttps,
    'VALIDATOR_PROVENANCE_LOCK_INTEGRITY_MISMATCH',
    'locked Ajv resolved URL must use HTTPS',
  );
  assert(
    typeof ajvRecord.integrity === 'string' && ajvRecord.integrity.startsWith('sha512-'),
    'VALIDATOR_PROVENANCE_LOCK_INTEGRITY_MISMATCH',
    'locked Ajv integrity must use SHA-512',
  );
  assert(
    ajvRecord.integrity === REVIEWED_AJV_SHA512_INTEGRITY,
    'VALIDATOR_PROVENANCE_LOCK_INTEGRITY_MISMATCH',
    'locked Ajv integrity differs from the reviewed primary-engine identity',
  );
}

function resolveRootOwnedAjvIdentity() {
  let requireFromRoot;
  try {
    requireFromRoot = createRequire(pathToFileURL(path.join(repositoryRoot, 'package.json')));
  } catch {
    fail(
      'VALIDATOR_PROVENANCE_ROOT_RESOLUTION_FAILURE',
      'cannot create a resolver for the root dependency owner',
    );
  }

  let packageJsonPath;
  let packageManifest;
  try {
    packageJsonPath = realpathSync(requireFromRoot.resolve('ajv/package.json'));
    packageManifest = requireFromRoot('ajv/package.json');
  } catch {
    fail(
      'VALIDATOR_PROVENANCE_ROOT_RESOLUTION_FAILURE',
      'root-owned ajv/package.json does not resolve',
    );
  }

  assert(
    isContainedWithin(realRepositoryRoot, packageJsonPath),
    'VALIDATOR_PROVENANCE_RESOLUTION_OUTSIDE_REPOSITORY',
    'root-owned ajv/package.json resolves outside the Ghost Bridge repository',
  );
  assert(
    packageManifest.version === EXPECTED_AJV_VERSION,
    'VALIDATOR_PROVENANCE_RESOLVED_VERSION_MISMATCH',
    `root dependency owner resolves Ajv ${String(packageManifest.version)}`,
  );

  return { packageJsonPath, version: packageManifest.version };
}

function resolveAjvFromDirectConsumer(relativeSourcePath, approvedSpecifiers) {
  const absoluteSourcePath = path.join(repositoryRoot, relativeSourcePath);
  let requireFromSource;
  try {
    requireFromSource = createRequire(pathToFileURL(absoluteSourcePath));
  } catch {
    fail(
      'VALIDATOR_PROVENANCE_RESOLUTION_FAILURE',
      `cannot create source-relative resolver for ${relativeSourcePath}`,
    );
  }

  let packageJsonPath;
  let packageManifest;
  const resolvedEntryPoints = new Map();
  try {
    packageJsonPath = realpathSync(requireFromSource.resolve('ajv/package.json'));
    packageManifest = requireFromSource('ajv/package.json');
    for (const specifier of approvedSpecifiers) {
      resolvedEntryPoints.set(specifier, realpathSync(requireFromSource.resolve(specifier)));
    }
  } catch {
    fail(
      'VALIDATOR_PROVENANCE_RESOLUTION_FAILURE',
      `approved Ajv entry points do not resolve from ${relativeSourcePath}`,
    );
  }

  const resolutionEvidence = new Map([
    ['ajv/package.json', packageJsonPath],
    ...resolvedEntryPoints,
  ]);
  for (const [entryPoint, resolvedPath] of resolutionEvidence) {
    assert(
      isContainedWithin(realRepositoryRoot, resolvedPath),
      'VALIDATOR_PROVENANCE_RESOLUTION_OUTSIDE_REPOSITORY',
      `${entryPoint} resolves outside the Ghost Bridge repository from ${relativeSourcePath}`,
    );
  }

  assert(
    packageManifest.version === EXPECTED_AJV_VERSION,
    'VALIDATOR_PROVENANCE_RESOLVED_VERSION_MISMATCH',
    `${relativeSourcePath} resolves Ajv ${String(packageManifest.version)}`,
  );
  const packageRoot = path.dirname(packageJsonPath);
  for (const [specifier, resolvedPath] of resolvedEntryPoints) {
    assert(
      isContainedWithin(packageRoot, resolvedPath),
      'VALIDATOR_PROVENANCE_RESOLUTION_FAILURE',
      `${relativeSourcePath} resolves ${specifier} outside its Ajv package identity`,
    );
  }

  return { packageJsonPath, version: packageManifest.version };
}

function verifyDirectConsumerResolution(rootOwnedIdentity) {
  const resolutions = Object.entries(APPROVED_DIRECT_AJV_CONSUMERS).map(
    ([relativeSourcePath, approvedSpecifiers]) => ({
      relativeSourcePath,
      ...resolveAjvFromDirectConsumer(relativeSourcePath, approvedSpecifiers),
    }),
  );
  for (const resolution of resolutions) {
    assert(
      resolution.packageJsonPath === rootOwnedIdentity.packageJsonPath &&
        resolution.version === rootOwnedIdentity.version,
      'VALIDATOR_PROVENANCE_ROOT_RESOLUTION_MISMATCH',
      `${resolution.relativeSourcePath} does not resolve the root-owned Ajv package identity`,
    );
  }
}

const JAVASCRIPT_SOURCE_EXTENSIONS = new Set(['.mjs', '.js', '.cjs']);

function listJavaScriptSourceFiles(directoryPath) {
  const entries = readdirSync(directoryPath, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name, 'en'),
  );
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isSymbolicLink()) {
      fail(
        'VALIDATOR_PROVENANCE_IMPORT_CONTRACT_FILESYSTEM_MISMATCH',
        `symbolic links are prohibited in validator source: ${path.relative(repositoryRoot, entryPath)}`,
      );
    }
    if (entry.isDirectory()) files.push(...listJavaScriptSourceFiles(entryPath));
    else if (entry.isFile() && JAVASCRIPT_SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files;
}

function normalizeRepositoryRelativePath(absolutePath) {
  return path.relative(repositoryRoot, absolutePath).split(path.sep).join('/');
}

function extractAjvSpecifiers(source) {
  const specifiers = [
    ...[...source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/gu)].map((match) => match[1]),
    ...[...source.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/gu)].map((match) => match[1]),
    ...[...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu)].map((match) => match[1]),
    ...[...source.matchAll(/\b[A-Za-z_$][\w$]*\s*\.\s*resolve\s*\(\s*["']([^"']+)["']\s*\)/gu)].map(
      (match) => match[1],
    ),
  ];
  return [
    ...new Set(
      specifiers.filter((specifier) => specifier === 'ajv' || specifier.startsWith('ajv/')),
    ),
  ].sort();
}

function verifyImportContract() {
  const validationRoot = path.join(repositoryRoot, 'protocol/schema-validation');
  let sourceFiles;
  try {
    sourceFiles = listJavaScriptSourceFiles(validationRoot);
  } catch (error) {
    if (error instanceof ProvenanceError) throw error;
    fail(
      'VALIDATOR_PROVENANCE_IMPORT_CONTRACT_FILESYSTEM_MISMATCH',
      'protocol/schema-validation cannot be inspected',
    );
  }

  const observedConsumers = new Map();
  for (const sourceFile of sourceFiles) {
    let source;
    try {
      source = readFileSync(sourceFile, 'utf8');
    } catch {
      fail(
        'VALIDATOR_PROVENANCE_IMPORT_CONTRACT_FILESYSTEM_MISMATCH',
        `validator source is not readable: ${path.relative(repositoryRoot, sourceFile)}`,
      );
    }
    const ajvSpecifiers = extractAjvSpecifiers(source);
    if (ajvSpecifiers.length > 0) {
      observedConsumers.set(normalizeRepositoryRelativePath(sourceFile), ajvSpecifiers);
    }
  }

  for (const [sourcePath, observedSpecifiers] of observedConsumers) {
    const approvedSpecifiers = APPROVED_DIRECT_AJV_CONSUMERS[sourcePath];
    assert(
      approvedSpecifiers !== undefined,
      'VALIDATOR_PROVENANCE_IMPORT_CONSUMER_CONTRACT_MISMATCH',
      `unapproved direct Ajv consumer: ${sourcePath}`,
    );
    assert(
      JSON.stringify(observedSpecifiers) === JSON.stringify([...approvedSpecifiers].sort()),
      'VALIDATOR_PROVENANCE_IMPORT_CONSUMER_CONTRACT_MISMATCH',
      `Ajv entry points differ for approved consumer: ${sourcePath}`,
    );
  }

  for (const [sourcePath, approvedSpecifiers] of Object.entries(APPROVED_DIRECT_AJV_CONSUMERS)) {
    const observedSpecifiers = observedConsumers.get(sourcePath);
    assert(
      observedSpecifiers !== undefined &&
        JSON.stringify(observedSpecifiers) === JSON.stringify([...approvedSpecifiers].sort()),
      'VALIDATOR_PROVENANCE_IMPORT_CONSUMER_CONTRACT_MISMATCH',
      `approved direct Ajv consumer is missing or changed: ${sourcePath}`,
    );
  }
}

function main() {
  verifyRootOwnership();
  verifyLockOwnership();
  const rootOwnedIdentity = resolveRootOwnedAjvIdentity();
  verifyImportContract();
  verifyDirectConsumerResolution(rootOwnedIdentity);
  console.log(
    `PASS owner=root-devDependency Ajv version=${EXPECTED_AJV_VERSION} Draft 2020-12 primary-engine identity`,
  );
}

try {
  main();
} catch (error) {
  if (error instanceof ProvenanceError) console.error(error.message);
  else console.error('VALIDATOR_PROVENANCE_VERIFIER_FAILURE: unexpected verifier failure');
  process.exitCode = 1;
}
