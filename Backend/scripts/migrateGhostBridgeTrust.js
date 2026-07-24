const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const ConnectionTrustRecord = require('../src/models/ConnectionTrustRecord');
const IssuerTrustRecord = require('../src/models/IssuerTrustRecord');
const TrustReplayRecord = require('../src/models/TrustReplayRecord');

const INDEX_MODELS = [
  IssuerTrustRecord,
  ConnectionTrustRecord,
  TrustReplayRecord,
];

async function migrate() {
  await connectDatabase();
  if (databaseStatus() !== 'connected') {
    throw new Error('MongoDB is required for the Ghost Bridge trust migration.');
  }
  const results = [];
  for (const Model of INDEX_MODELS) {
    await Model.createIndexes();
    results.push({ model: Model.modelName, status: 'indexes_verified' });
  }
  const output = {
    migration: 'phase-15c-ghostbridge-trust',
    status: 'complete',
    additive: true,
    idempotent: true,
    restartSafe: true,
    nonDestructive: true,
    results,
  };
  console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error(`Ghost Bridge trust migration failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
}

module.exports = { INDEX_MODELS, migrate };
