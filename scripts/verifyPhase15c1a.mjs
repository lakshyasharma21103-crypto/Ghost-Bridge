import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'all';

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });
  if (result.status !== 0) {
    process.stdout.write(String(result.stdout || '').slice(-12_000));
    process.stderr.write(String(result.stderr || '').slice(-12_000));
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
  return String(result.stdout || '');
}

function nodeTest(files, pattern, cwd = root) {
  const args = ['--test'];
  if (pattern) args.push(`--test-name-pattern=${pattern}`);
  args.push(...files);
  run(process.execPath, args, cwd);
}

function platformAuth() {
  nodeTest(['backend/src/tests/platformInstallationAuth.test.js']);
}

function agentAuth() {
  nodeTest(
    ['packages/ghostbridge-native-agent/test/security15c1a.test.js'],
    'raw HTTP|production construction',
  );
}

function authorization() {
  nodeTest(
    ['packages/ghostbridge-native-agent/test/security15c1a.test.js'],
    'authorization denies|production authorization',
  );
}

function revocation() {
  nodeTest(
    ['packages/ghostbridge-native-agent/test/security15c1a.test.js'],
    'revocation freshness',
  );
}

function receipts() {
  nodeTest(
    ['packages/ghostbridge-native-agent/test/security15c1a.test.js'],
    'Receipt|Approval Decision',
  );
}

function transport() {
  nodeTest([
    'packages/ghostbridge-trust/test/networkSafety.test.js',
    'packages/ghostbridge-native-client/test/transport15c1a.test.js',
  ]);
  nodeTest(['src/tests/securityFoundation.test.js'], 'safeFetch', path.join(root, 'backend'));
}

function inspector() {
  nodeTest(['packages/ghostbridge-inspector/test/inspector.test.js']);
}

function conformance() {
  for (const profile of ['core', 'governed', 'trust']) {
    const output = run(process.execPath, [
      'scripts/verifyGhostBridgeBlackBoxConformance.mjs',
      `--profile=${profile}`,
    ]);
    const report = JSON.parse(output.trim().split(/\r?\n/).at(-1));
    assert.equal(report.passed, true);
    assert.equal(report.profile, profile);
    assert.equal(report.separateProcesses, true);
    assert.ok(report.testCount >= (profile === 'core' ? 15 : profile === 'governed' ? 24 : 35));
  }
}

function ciContract() {
  const workflowPath = path.join(root, '.github', 'workflows', 'phase-15c1a.yml');
  assert.ok(fs.existsSync(workflowPath), 'The Phase 15C.1A workflow is missing.');
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  for (const required of [
    'permissions:',
    'contents: read',
    'concurrency:',
    'ubuntu-latest',
    'mongo:7',
    'npm ci',
    'npm run typecheck',
    'npm run lint',
    'npm test',
    'npm run build',
    'npm run verify:ghostbridge-phase-15c1',
    'npm run verify:ghostbridge-phase-15c1a',
    'npm run verify:demo',
    'npm run verify:sandbox',
    'npm run verify:enterprise-operations',
    'npm run verify:durable-recovery',
    'npm run verify:ghostbridge-package-integrity',
  ]) {
    assert.ok(workflow.includes(required), `CI workflow omitted: ${required}`);
  }
  assert.doesNotMatch(
    workflow,
    /verify:gemini-agent|verify:external-flow|perf:|migrate:|npm publish|deploy/i,
  );

  const rootManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const workspace of rootManifest.workspaces) {
    if (workspace.includes('*')) continue;
    assert.ok(
      fs.existsSync(path.join(root, workspace)),
      `Workspace path has incorrect casing or is missing: ${workspace}`,
    );
  }
  const rootDirectories = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.deepEqual(
    rootDirectories.filter((name) => name.toLowerCase() === 'backend'),
    ['backend'],
  );

  const tracked = run('git', ['ls-files'])
    .split(/\r?\n/)
    .filter(Boolean);
  const casing = new Map();
  for (const file of tracked) {
    const folded = file.toLowerCase();
    assert.equal(casing.has(folded), false, `Case-colliding tracked path: ${file}`);
    casing.set(folded, file);
  }
}

const operations = {
  'platform-auth': platformAuth,
  'agent-auth': agentAuth,
  authorization,
  revocation,
  receipts,
  transport,
  inspector,
  conformance,
  'ci-contract': ciContract,
};

if (mode === 'all') {
  for (const operation of Object.values(operations)) operation();
} else {
  if (!operations[mode]) throw new Error(`Unknown Phase 15C.1A verifier: ${mode}`);
  operations[mode]();
}

process.stdout.write(
  `${JSON.stringify({
    phase: '15C.1A',
    verifier: mode,
    status: 'PASS',
    completedAt: new Date().toISOString(),
  })}\n`,
);
