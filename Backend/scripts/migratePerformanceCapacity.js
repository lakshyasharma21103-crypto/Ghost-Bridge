const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const { ensureModelIndexes } = require('./migrateDataAccessPerformance');

const phaseModels = [
  require('../src/models/PerformanceLoadScenario'),
  require('../src/models/PerformanceBudgetPolicy'),
  require('../src/models/PerformanceBaseline'),
  require('../src/models/PerformanceEnvironmentFingerprint'),
  require('../src/models/PerformanceTestRun'),
  require('../src/models/PerformanceMeasurementWindow'),
  require('../src/models/PerformanceFailureInjectionProfile'),
  require('../src/models/PerformanceFixtureSet'),
  require('../src/models/PerformanceRegressionEvaluation'),
  require('../src/models/CapacityModel'),
  require('../src/models/CapacityPlan'),
];

async function migrate() {
  await connectDatabase();
  if (databaseStatus() !== 'connected') throw new Error('MongoDB is required for the performance-capacity migration.');
  const results = [];
  for (const Model of phaseModels) results.push(...await ensureModelIndexes(Model));
  return results;
}

if (require.main === module) {
  migrate()
    .then((results) => {
      for (const item of results) process.stdout.write(`${item.action.toUpperCase()} ${item.indexName}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error?.message || error}\n`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
}

module.exports = { migrate, phaseModels };
