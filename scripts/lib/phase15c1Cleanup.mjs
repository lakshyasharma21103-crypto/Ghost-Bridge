import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_ROOTS = new Set([
  '.github',
  'backend',
  'external-agent',
  'frontend',
  'packages',
  'protocol',
  'scripts',
]);

const SOURCE_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.mjs',
  '.scss',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);

const ROOT_SOURCE_FILES = new Set([
  'package.json',
  'package-lock.json',
]);

const SKIPPED_DIRECTORIES = new Set([
  '.cache',
  '.git',
  '.next',
  '.vite',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);

// These reports intentionally preserve the pre-cleanup spelling as historical evidence.
const HISTORICAL_REPORT_EXCLUSIONS = new Set([
  'docs/engineering/phase-15c1-audit-baseline.md',
  'docs/engineering/phase-15c1-cleanup-inventory.md',
  'docs/engineering/phase-15c1-hardening-report.md',
]);

function normalizedRelativePath(repositoryRoot, absolutePath) {
  return path.relative(repositoryRoot, absolutePath).split(path.sep).join('/');
}

function isIntendedSource(relativePath) {
  if (HISTORICAL_REPORT_EXCLUSIONS.has(relativePath)) return false;
  if (ROOT_SOURCE_FILES.has(relativePath)) return true;
  const [topLevel] = relativePath.split('/');
  return SOURCE_ROOTS.has(topLevel) && SOURCE_EXTENSIONS.has(path.extname(relativePath));
}

function collectIntendedSourceFiles(repositoryRoot) {
  const files = [];
  const visit = (directory) => {
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, 'en'));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const absolutePath = path.join(directory, entry.name);
      const relativePath = normalizedRelativePath(repositoryRoot, absolutePath);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) visit(absolutePath);
        continue;
      }
      if (entry.isFile() && isIntendedSource(relativePath)) {
        files.push({ absolutePath, relativePath });
      }
    }
  };
  visit(repositoryRoot);
  return files;
}

export function findUnintendedBackendPathReferences(repositoryRoot) {
  const uppercaseBackendPath = new RegExp(`${'Back'}${'end'}[\\\\/]`, 'g');
  const findings = [];
  for (const file of collectIntendedSourceFiles(repositoryRoot)) {
    const contents = fs.readFileSync(file.absolutePath, 'utf8');
    for (const [index, line] of contents.split(/\r?\n/).entries()) {
      uppercaseBackendPath.lastIndex = 0;
      if (uppercaseBackendPath.test(line)) {
        findings.push({
          path: file.relativePath,
          line: index + 1,
        });
      }
    }
  }
  return findings;
}

function read(repositoryRoot, relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

export function verifyPhase15c1Cleanup(repositoryRoot) {
  const inventory = read(
    repositoryRoot,
    'docs/engineering/phase-15c1-cleanup-inventory.md',
  );
  assert.match(
    inventory,
    /\| ID \| Path\/symbol\/route\/dependency \| Active callers \| Runtime loading mechanism \| Classification \| Action \| Replacement \| Evidence \|/,
  );
  assert.match(inventory, /Files deleted: none/);
  assert.ok(fs.existsSync(path.join(repositoryRoot, 'backend')));

  const rootDirectories = fs
    .readdirSync(repositoryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.equal(rootDirectories.includes(`${'Back'}${'end'}`), false);
  assert.equal(
    rootDirectories.filter((name) => name.toLowerCase() === 'backend').length,
    1,
  );

  const staleReferences = findUnintendedBackendPathReferences(repositoryRoot);
  assert.deepEqual(
    staleReferences,
    [],
    `Unintended uppercase backend path references remain: ${staleReferences
      .map((finding) => `${finding.path}:${finding.line}`)
      .join(', ')}`,
  );

  assert.doesNotMatch(
    read(repositoryRoot, 'frontend/src/components/Sidebar.jsx'),
    /Delegation Grants|Delegation Invocations/,
  );
  assert.match(
    read(repositoryRoot, 'backend/src/routes/index.js'),
    /EXPERIMENTAL_AGENT_COORDINATION_ENABLED/,
  );
  assert.match(
    read(repositoryRoot, 'backend/src/routes/connectionRoutes.js'),
    /LEGACY_MCP_ENABLED/,
  );
}

export const cleanupScanContract = Object.freeze({
  historicalReportExclusions: Object.freeze(
    [...HISTORICAL_REPORT_EXCLUSIONS].sort(),
  ),
  sourceRoots: Object.freeze([...SOURCE_ROOTS].sort()),
});
