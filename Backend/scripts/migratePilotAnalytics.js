const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const { ensurePilotAnalyticsIndexes } = require('../src/services/pilotAnalytics.service');

async function run() {
  await connectDatabase();
  try {
    await ensurePilotAnalyticsIndexes();
    process.stdout.write('PASS pilot-analytics indexes\n');
    process.stdout.write('PASS pilot-analytics migration\n');
  } finally {
    await disconnectDatabase();
  }
}

if (require.main === module) {
  run().catch((error) => {
    process.stderr.write(`FAIL pilot-analytics migration: ${error.code || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { run };
