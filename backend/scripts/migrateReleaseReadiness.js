const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const { ensureReleaseReadinessIndexes } = require('../src/services/releaseReadiness.service');

async function migrate() {
  await connectDatabase();
  if (databaseStatus() !== 'connected') {
    throw new Error('MongoDB is required for the release-readiness migration.');
  }
  return ensureReleaseReadinessIndexes();
}

if (require.main === module) {
  migrate()
    .then((results) => {
      for (const item of results) {
        process.stdout.write(`ENSURED ${item.model}\n`);
      }
    })
    .catch((error) => {
      process.stderr.write(`${error?.message || error}\n`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
}

module.exports = { migrate };
