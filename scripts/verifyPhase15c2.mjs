import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'all';
const integrationTest = 'backend/src/tests/platformNativeClient.test.js';
const authorityTest = 'backend/src/tests/platformNativeClientAuthority.test.js';

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
    env: { ...process.env, NODE_ENV: 'development' },
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.stderr) process.stderr.write(String(result.stderr).slice(-16_000));
  if (result.status !== 0) {
    process.stdout.write(String(result.stdout || '').slice(-16_000));
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
  return String(result.stdout || '');
}

function nodeTest(files, pattern) {
  const args = ['--test'];
  if (pattern) args.push(`--test-name-pattern=${pattern}`);
  args.push(...files);
  run(process.execPath, args);
}

function platformNativeClient() {
  const adapter = source('backend/src/services/platformNativeClient.service.js');
  const routes = source('backend/src/routes/platformNativeClientRoutes.js');
  const nativeClient = source('packages/ghostbridge-native-client/src/index.js');
  const demoVerifier = source('backend/scripts/verifyDemo.js');
  const sandboxVerifier = source('backend/scripts/verifySandbox.js');
  for (const required of [
    "require('@ghostbridge/native-client')",
    'createNodeSecurityTransport',
    'authenticatedScope',
    'maximumResponseBytes',
    'authenticationMaterialProvider',
    '#verifyCurrentTrust',
    '#verifyReceipt',
    "this.#seal('connection'",
    "this.#seal('task'",
    "this.#seal('approval'",
    'nativeClientPath: true',
  ]) {
    assert.ok(adapter.includes(required), `Platform adapter omitted: ${required}`);
  }
  for (const operation of [
    '/discovery',
    '/install',
    '/invoke',
    '/tasks/status',
    '/tasks/result',
    '/tasks/cancel',
    '/approvals/continue',
    '/receipts/get',
    '/receipts/verify',
    '/revocations/check',
  ]) {
    assert.ok(routes.includes(operation), `Platform Native Client route omitted: ${operation}`);
  }
  assert.match(nativeClient, /options\.maximumResponseBytes/);
  assert.doesNotMatch(adapter, /services\/adapters|runtimeGateway\.service/);
  for (const [name, verifier] of [
    ['demo', demoVerifier],
    ['sandbox', sandboxVerifier],
  ]) {
    assert.ok(
      verifier.includes("process.env.ALLOW_LEGACY_PROTOCOL_FIXTURES = 'true'"),
      `${name} verifier omitted the explicit legacy-fixture environment opt-in`,
    );
    assert.ok(
      verifier.includes("[LEGACY_FIXTURE_HEADER]: '1'"),
      `${name} verifier omitted the explicit legacy-fixture request opt-in`,
    );
  }
  assert.ok(
    demoVerifier.includes('retryPolicyEvaluation: true'),
    'demo verifier omitted its bounded idempotent policy-read retry',
  );
  nodeTest([authorityTest]);
}

function discovery() {
  nodeTest(
    [integrationTest],
    'Platform HTTP path discovers|invalid Agent Passport signature|Platform discovery rejects',
  );
}

function invocation() {
  nodeTest(
    [integrationTest],
    'Platform HTTP path discovers|exact-action approval continuation',
  );
}

function taskReceipt() {
  nodeTest(
    [integrationTest],
    'exact-action approval continuation|Receipt digest mismatches',
  );
}

function trustRevocation() {
  nodeTest(
    [integrationTest],
    'untrusted issuer|invalid Agent Passport signature',
  );
}

function scope() {
  nodeTest(
    [integrationTest, authorityTest],
    'cross-tenant|scope treats|production rejects fixture|legacy protocol routes|production runtime gateway',
  );
}

function ciContract() {
  const workflow = source('.github/workflows/phase-15c2.yml');
  for (const required of [
    'pull_request:',
    '- main',
    'permissions:',
    'contents: read',
    'concurrency:',
    'cancel-in-progress: true',
    'timeout-minutes:',
    'ubuntu-latest',
    'mongo:7',
    '- 20',
    '- 22',
    'npm ci',
    'npm run typecheck',
    'npm run lint',
    'npm test',
    'npm run build',
    'npm run verify:ghostbridge-phase-15c1',
    'npm run verify:ghostbridge-phase-15c1a',
    'npm run verify:ghostbridge-phase-15c1a-r1',
    'npm run verify:ghostbridge-phase-15c2',
    'npm run verify:phase-15c1a-r1-mongo-store-contract',
    'npm run verify:demo',
    'npm run verify:sandbox',
    'npm run verify:ghostbridge-package-integrity',
  ]) {
    assert.ok(workflow.includes(required), `Phase 15C.2 CI omitted: ${required}`);
  }
  const actions = [...workflow.matchAll(/uses:\s*([^@\s]+)@([^\s#]+)/g)];
  assert.ok(actions.length >= 2);
  for (const [, action, reference] of actions) {
    assert.match(reference, /^[a-f0-9]{40}$/, `${action} is not pinned to a full SHA`);
  }
  assert.doesNotMatch(
    workflow,
    /verify:gemini-agent|verify:external-flow|perf:|migrate:|npm publish|deploy/i,
  );
}

const operations = {
  'platform-native-client': platformNativeClient,
  discovery,
  invocation,
  'task-receipt': taskReceipt,
  'trust-revocation': trustRevocation,
  scope,
  'ci-contract': ciContract,
};

if (mode === 'all') {
  nodeTest([integrationTest, authorityTest]);
  platformNativeClient();
  ciContract();
} else {
  if (!operations[mode]) throw new Error(`Unknown Phase 15C.2 verifier: ${mode}`);
  operations[mode]();
}

process.stdout.write(
  `${JSON.stringify({
    phase: '15C.2',
    verifier: mode,
    status: 'PASS',
    completedAt: new Date().toISOString(),
  })}\n`,
);
