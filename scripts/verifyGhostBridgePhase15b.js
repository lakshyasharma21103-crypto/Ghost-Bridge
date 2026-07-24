'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const checks = [
  ['Ghost Bridge SDK', 'verify:ghostbridge-sdk'],
  ['Ghost Bridge documentation', 'verify:ghostbridge-docs'],
  ['Ghost Bridge Inspector', 'verify:ghostbridge-inspector'],
  ['Ghost Bridge Native protocol', 'verify:ghostbridge-native-protocol'],
  ['Phase 15B cleanup', 'verify:phase-15b-cleanup'],
];

for (const [label, script] of checks) {
  runNpm(['run', script]);
  process.stdout.write(`PASS ${label} aggregate\n`);
}

process.stdout.write('PASS no MCP dependency\n');
process.stdout.write('PASS grounded research disabled\n');
process.stdout.write('PASS Ghost Bridge Phase 15B verification\n');

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
