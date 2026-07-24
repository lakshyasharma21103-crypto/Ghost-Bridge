'use strict';

const { runTwoAgentWorkflow } = require('./index');

runTwoAgentWorkflow({
  onCheck(check) {
    process.stdout.write(`PASS ${check.name}\n`);
  },
})
  .then(() => {
    process.stdout.write('PASS Ghost Bridge Native two-agent workflow\n');
  })
  .catch((error) => {
    process.stderr.write(`FAIL ${error.safeMessage || error.message}\n`);
    process.exitCode = 1;
  });
