import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmCommandForPlatform } from './lib/crossPlatformCommands.mjs';
import { verifyPhase15c1Cleanup } from './lib/phase15c1Cleanup.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
const npmCommand = npmCommandForPlatform();

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      npm_config_cache: path.join(root, 'node_modules', '.cache', 'npm-phase15c1'),
    },
  });
  if (result.error) {
    throw new Error(
      `Unable to start child process ${command}: ${result.error.code || result.error.message}`,
      { cause: result.error },
    );
  }
  if (result.status === null) {
    throw new Error(`${command} ${args.join(' ')} ended without an exit status.`);
  }
  if (result.status !== 0) {
    process.stderr.write(String(result.stdout || '').slice(-8_000));
    process.stderr.write(String(result.stderr || '').slice(-8_000));
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
  return String(result.stdout || '');
}

function nodeTest(...files) {
  run(process.execPath, ['--test', ...files]);
}

function backendTest(...files) {
  run(process.execPath, ['--test', ...files], path.join(root, 'backend'));
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function critical() {
  nodeTest(
    'backend/src/tests/reservedInvocation.test.js',
    'backend/src/tests/nativeProtocol.test.js',
  );
}

function network() {
  nodeTest('packages/ghostbridge-trust/test/networkSafety.test.js');
  backendTest('src/tests/securityFoundation.test.js');
}

function trust() {
  nodeTest(
    'packages/ghostbridge-trust/test/trust.test.js',
    'packages/ghostbridge-native-client/test/client.test.js',
    'packages/ghostbridge-native-agent/test/agent.test.js',
  );
}

function platformTruth() {
  nodeTest('backend/src/tests/nativeProtocol.test.js');
  const routes = read('backend/src/routes/nativeProtocolRoutes.js');
  assert.match(routes, /PLATFORM_NATIVE_PUBLIC_ENDPOINTS = Object\.freeze\(\{\}\)/);
  assert.doesNotMatch(routes, /request\.get\(['"]host['"]\)/);
}

function authenticatedScope() {
  nodeTest(
    'backend/src/tests/partnerAuth.test.js',
    'packages/ghostbridge-native-client/test/client.test.js',
  );
  assert.doesNotMatch(read('backend/src/middleware/authenticatePartner.js'), /Partner\.find\(/);
  assert.match(read('backend/src/controllers/passportController.js'), /authenticatedPrincipal/);
}

function packageIntegrity() {
  nodeTest('scripts/test/verifyPhase15c1Portability.test.mjs');
  const manifests = fs
    .readdirSync(path.join(root, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, 'packages', entry.name, 'package.json'));
  for (const manifestPath of manifests) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.ok(manifest.name.startsWith('@ghostbridge/'));
    assert.ok(manifest.exports?.['.']?.types);
    assert.ok(manifest.exports?.['.']?.require);
    run(npmCommand, ['pack', '--dry-run', '--json'], path.dirname(manifestPath));
  }
}

function cleanup() {
  verifyPhase15c1Cleanup(root);
  nodeTest('scripts/test/verifyPhase15c1Cleanup.test.mjs');
}

const operations = {
  critical,
  network,
  trust,
  platform: platformTruth,
  scope: authenticatedScope,
  package: packageIntegrity,
  cleanup,
  blackbox: () => run(process.execPath, ['scripts/verifyGhostBridgeBlackBoxConformance.mjs']),
};

if (!operations[mode]) throw new Error(`Unknown Phase 15C.1 verifier: ${mode}`);
operations[mode]();
process.stdout.write(`${JSON.stringify({ verifier: mode, status: 'PASS' })}\n`);
