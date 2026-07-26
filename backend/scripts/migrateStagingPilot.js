const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const { ensureStagingPilotIndexes } = require('../src/services/stagingPilot.service');

async function run() {
  await connectDatabase();
  try {
    await ensureStagingPilotIndexes();
    process.stdout.write('PASS staging-pilot indexes\n');
    process.stdout.write('PASS staging-pilot migration\n');
  } finally {
    await disconnectDatabase();
  }
}

if (require.main === module) {
  run().catch((error) => {
    process.stderr.write(`FAIL staging-pilot migration: ${error.code || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { run };
