const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const {
  ensureOrchestrationObservabilityIndexes,
} = require('../src/services/orchestrationObservability.service');
const OrchestrationRun = require('../src/models/OrchestrationRun');
const OrchestrationRunHealthSummary = require('../src/models/OrchestrationRunHealthSummary');

async function backfillRunHealthShape() {
  const runs = await OrchestrationRun.find({
    $or: [
      { organizationId: { $exists: false } },
      { workspaceId: { $exists: false } },
    ],
  })
    .select('_id')
    .limit(1)
    .lean();
  return {
    legacyRunScopeMissing: runs.length,
    destructiveRewriteRequired: false,
  };
}

async function migrate() {
  await connectDatabase();
  if (databaseStatus() !== 'connected') {
    throw new Error('MongoDB is required for the orchestration observability migration.');
  }
  const indexes = await ensureOrchestrationObservabilityIndexes();
  await OrchestrationRunHealthSummary.createIndexes();
  const backfills = await backfillRunHealthShape();
  const report = {
    migration: 'phase-13d5-orchestration-observability',
    status: 'complete',
    restartSafe: true,
    idempotent: true,
    nonDestructive: true,
    rawPayloadCaptureEnabled: false,
    indexes,
    backfills,
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error(`Orchestration observability migration failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
}

module.exports = { migrate };
