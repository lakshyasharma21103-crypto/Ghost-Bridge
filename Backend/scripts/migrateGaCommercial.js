const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const { ensureGaCommercialIndexes } = require('../src/services/gaCommercial.service');

async function run() {
  await connectDatabase();
  try {
    await ensureGaCommercialIndexes();
    process.stdout.write('PASS ga-commercial indexes\n');
    process.stdout.write('PASS ga-commercial migration\n');
  } finally {
    await disconnectDatabase();
  }
}

if (require.main === module) {
  run().catch((error) => {
    process.stderr.write(`FAIL ga-commercial migration: ${error.code || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { run };
