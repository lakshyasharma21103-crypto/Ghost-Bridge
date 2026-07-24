#!/usr/bin/env node
'use strict';

const { COMMANDS, runConformance } = require('./index');

async function main() {
  const [command = 'verify-level-1', baseUrl = 'http://127.0.0.1:8787'] = process.argv.slice(2);
  if (!COMMANDS.includes(command)) {
    process.stderr.write(`Unknown command. Expected one of: ${COMMANDS.join(', ')}\n`);
    process.exitCode = 2;
    return;
  }
  try {
    const report = await runConformance({
      command,
      baseUrl,
      onResult(result) {
        process.stdout.write(`${result.status === 'pass' ? 'PASS' : 'FAIL'} ${result.name}\n`);
      },
    });
    if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(report)}\n`);
  } catch (error) {
    process.stderr.write(`FAIL ${error.safeMessage || error.message}\n`);
    process.exitCode = 1;
  }
}

main();
