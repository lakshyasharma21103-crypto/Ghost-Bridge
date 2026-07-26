import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'all';
const agentSecurityTest =
  'packages/ghostbridge-native-agent/test/security15c1a.test.js';

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
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.stderr) process.stderr.write(String(result.stderr).slice(-16_000));
  if (result.status !== 0) {
    process.stdout.write(String(result.stdout || '').slice(-16_000));
    throw new Error(
      `${command} ${args.join(' ')} failed with status ${result.status}`,
    );
  }
  return String(result.stdout || '');
}

function nodeTest(files, pattern, cwd = root) {
  const args = ['--test'];
  if (pattern) args.push(`--test-name-pattern=${pattern}`);
  args.push(...files);
  run(process.execPath, args, cwd);
}

function frontendAuth() {
  nodeTest(['frontend/tests/phase15c1aR1InstallationAuth.test.mjs']);
  nodeTest(['backend/src/tests/platformInstallationAuth.test.js']);
}

function approvalBinding() {
  nodeTest([
    'packages/ghostbridge-protocol-core/test/approvalAction15c1aR1.test.js',
  ]);
  nodeTest(
    [agentSecurityTest],
    'R1 exact-action|R1 approval Decisions|durable Approval Decision',
  );
}

function authorizationBoundary() {
  nodeTest(
    [agentSecurityTest],
    'development authorization evidence|production authorization evidence',
  );
}

function taskReceipt() {
  nodeTest(
    [agentSecurityTest],
    'production cancellation and timeout|R1 waiting-for-approval|R1 accepted Task|R1 terminal failures',
  );
}

function storeContract() {
  nodeTest(
    [agentSecurityTest],
    'production construction|R1 local filesystem|R1 atomic Install Grant|R1 production redemption|R1 production.*rejects',
  );
}

function revocation() {
  nodeTest(
    [agentSecurityTest],
    'production authorization evidence and revocation freshness|R1 unknown Connection',
  );
}

function conformance() {
  for (const profile of ['core', 'governed']) {
    const output = run(process.execPath, [
      'scripts/verifyGhostBridgeBlackBoxConformance.mjs',
      `--profile=${profile}`,
    ]);
    const report = JSON.parse(output.trim().split(/\r?\n/).at(-1));
    assert.equal(report.passed, true);
    assert.equal(report.profile, profile);
    assert.equal(report.separateProcesses, true);
    const cases = new Map(
      report.transcript.map((entry) => [entry.testId, entry]),
    );
    for (const id of [
      'GB-C-MISSING-ENDPOINT-001',
      'GB-C-CROSS-ORIGIN-001',
    ]) {
      assert.equal(cases.get(id)?.status, 'pass');
      assert.equal(cases.get(id)?.safeEvidence?.rejectedWith, 'INVALID_MESSAGE');
    }
    if (profile === 'governed') {
      const exact = cases.get('GB-G-EXACT-ACTION-001');
      assert.equal(exact?.status, 'pass');
      assert.equal(exact?.safeEvidence?.rejectedWith, 'APPROVAL_INVALID');
      assert.equal(exact?.safeEvidence?.retainedApprovalReference, true);
      assert.equal(exact?.safeEvidence?.payloadSubstitutionRejected, true);
    }
  }
}

function ciContract() {
  const workflowPath = path.join(
    root,
    '.github',
    'workflows',
    'phase-15c1a.yml',
  );
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  for (const required of [
    'pull_request:',
    'branches:',
    '- main',
    'permissions:',
    'contents: read',
    'concurrency:',
    'cancel-in-progress: true',
    'timeout-minutes:',
    'ubuntu-latest',
    'mongo:7',
    'npm ci',
    'npm run typecheck',
    'npm run lint',
    'npm test',
    'npm run build',
    'npm run verify:ghostbridge-phase-15c1',
    'npm run verify:ghostbridge-phase-15c1a',
    'npm run verify:ghostbridge-phase-15c1a-r1',
    'npm run verify:phase-15c1a-r1-mongo-store-contract',
    'npm run verify:demo',
    'npm run verify:sandbox',
    'npm run verify:enterprise-operations',
    'npm run verify:durable-recovery',
    'npm run verify:ghostbridge-package-integrity',
  ]) {
    assert.ok(workflow.includes(required), `CI workflow omitted: ${required}`);
  }
  const actions = [...workflow.matchAll(/uses:\s*([^@\s]+)@([^\s#]+)/g)];
  assert.ok(actions.length >= 2, 'CI workflow must declare pinned Actions.');
  for (const [, action, reference] of actions) {
    assert.match(
      reference,
      /^[a-f0-9]{40}$/,
      `${action} is not pinned to a full commit SHA.`,
    );
  }
  assert.doesNotMatch(workflow, /uses:\s*[^@\s]+@v\d+/);
  assert.doesNotMatch(
    workflow,
    /verify:gemini-agent|verify:external-flow|perf:|migrate:|npm publish|deploy/i,
  );
}

const operations = {
  'frontend-auth': frontendAuth,
  'approval-binding': approvalBinding,
  'authorization-boundary': authorizationBoundary,
  'task-receipt': taskReceipt,
  'store-contract': storeContract,
  revocation,
  conformance,
  'ci-contract': ciContract,
};

if (mode === 'all') {
  for (const operation of Object.values(operations)) operation();
} else {
  if (!operations[mode]) {
    throw new Error(`Unknown Phase 15C.1A-R1 verifier: ${mode}`);
  }
  operations[mode]();
}

process.stdout.write(
  `${JSON.stringify({
    phase: '15C.1A-R1',
    verifier: mode,
    status: 'PASS',
    completedAt: new Date().toISOString(),
  })}\n`,
);
