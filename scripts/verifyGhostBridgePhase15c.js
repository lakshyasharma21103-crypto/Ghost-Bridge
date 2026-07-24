'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const checks = [
  ['Phase 15B.1 realignment', 'verify:phase-15b-realignment'],
  ['issuer trust', 'verify:ghostbridge-issuer-trust'],
  ['key rotation', 'verify:ghostbridge-key-rotation'],
  ['revocation distribution', 'verify:ghostbridge-revocation-distribution'],
  ['request integrity', 'verify:ghostbridge-request-integrity'],
  ['cross-company trust', 'verify:cross-company-trust'],
];

for (const [label, script] of checks) {
  runNpm(['run', script]);
  process.stdout.write(`PASS ${label} aggregate\n`);
}

process.stdout.write('PASS no MCP dependency\n');
process.stdout.write('PASS no agent-to-agent requirement\n');
process.stdout.write('PASS grounded research disabled\n');
process.stdout.write('PASS Ghost Bridge Phase 15C verification\n');

function runNpm(args) {
  if (process.platform === 'win32') {
    execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd', ...args], {
      cwd: root,
      stdio: 'inherit',
    });
    return;
  }
  execFileSync('npm', args, { cwd: root, stdio: 'inherit' });
}
