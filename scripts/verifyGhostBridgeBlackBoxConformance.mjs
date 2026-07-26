import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = process.argv.find((value) => value.startsWith('--profile='))?.split('=')[1] || 'core';
assert.ok(['core', 'governed', 'trust'].includes(profile), 'Unknown conformance profile.');
const child = spawn(process.execPath, ['scripts/black-box/raw-agent.mjs'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
const lines = readline.createInterface({ input: child.stdout });
const [firstLine] = await once(lines, 'line');
const { port } = JSON.parse(firstLine);
const origin = `http://127.0.0.1:${port}`;
const transcript = [];

async function check(id, operation) {
  try {
    const evidence = await operation();
    transcript.push({ id, status: 'pass', evidence });
  } catch (error) {
    transcript.push({ id, status: 'fail', safeMessage: String(error.message).slice(0, 300) });
    throw error;
  }
}

try {
  await check('GB-C1-DISCOVERY-001', async () => {
    const response = await fetch(`${origin}/.well-known/ghostbridge`, { redirect: 'manual' });
    assert.equal(response.status, 200);
    const document = JSON.parse(await response.text());
    assert.equal(document.protocol, 'ghostbridge');
    assert.equal(document.preferredVersion, 'ghostbridge/0.1-draft');
    assert.equal(document.features.delegation, false);
    return { preferredVersion: document.preferredVersion };
  });
  await check('GB-C1-PASSPORT-001', async () => {
    const passport = await fetch(`${origin}/ghostbridge/passport`).then((value) => value.json());
    assert.equal(passport.status, 'active');
    assert.ok(Date.parse(passport.expiresAt) > Date.now());
    return { passportId: passport.passportId };
  });
  await check('GB-C1-MALFORMED-DISCOVERY-001', async () => {
    const malformed = await fetch(`${origin}/negative/malformed-discovery`).then((value) =>
      value.json(),
    );
    assert.notEqual(malformed.protocol, 'ghostbridge');
    return { rejected: true };
  });
  await check('GB-T-AUDIENCE-001', async () => {
    const negative = await fetch(`${origin}/negative/wrong-audience`).then((value) => value.json());
    assert.equal(negative.errorCode, 'AUDIENCE_MISMATCH');
    assert.notEqual(negative.audience, 'raw-host');
    return { rejected: true };
  });
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 2_000))]);
}

const result = {
  protocolVersion: 'ghostbridge/0.1-draft',
  profile,
  hostProcessId: process.pid,
  agentProcessId: child.pid,
  separateProcesses: child.pid !== process.pid,
  passed: transcript.every((item) => item.status === 'pass'),
  transcript,
};
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!result.passed) process.exitCode = 1;
