'use strict';

const { runTwoAgentWorkflow } = require('../protocol/examples/two-agent-workflow');

async function main() {
  const report = await runTwoAgentWorkflow({
    onCheck(check) {
      process.stdout.write(`PASS ${check.name}\n`);
    },
  });
  if (!report.checks.every((check) => check.status === 'pass')) {
    throw new Error('One or more Ghost Bridge Native checks failed.');
  }
  process.stdout.write('PASS Ghost Bridge Native protocol verification\n');
}

main().catch((error) => {
  process.stderr.write(`FAIL ${error.safeMessage || error.message}\n`);
  process.exitCode = 1;
});
