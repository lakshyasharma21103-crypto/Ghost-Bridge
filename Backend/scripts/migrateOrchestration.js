const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const OrchestrationDefinition = require('../src/models/OrchestrationDefinition');
const OrchestrationRun = require('../src/models/OrchestrationRun');
const OrchestrationNodeRun = require('../src/models/OrchestrationNodeRun');
const ApprovalRequest = require('../src/models/ApprovalRequest');
const Invocation = require('../src/models/Invocation');

const INDEX_MODELS = [
  OrchestrationDefinition,
  OrchestrationRun,
  OrchestrationNodeRun,
  ApprovalRequest,
  Invocation,
];

async function migrate() {
  await connectDatabase();
  if (databaseStatus() !== 'connected') {
    throw new Error('MongoDB is required for the orchestration migration.');
  }
  const results = [];
  for (const Model of INDEX_MODELS) {
    await Model.createIndexes();
    results.push({ model: Model.modelName, status: 'indexes_verified' });
  }
  const staleActiveCounts = await OrchestrationRun.countDocuments({
    status: { $in: ['queued', 'running', 'waiting_approval', 'cancel_requested'] },
    activeNodeCount: { $exists: false },
  });
  if (staleActiveCounts) {
    await OrchestrationRun.updateMany(
      {
        status: { $in: ['queued', 'running', 'waiting_approval', 'cancel_requested'] },
        activeNodeCount: { $exists: false },
      },
      { $set: { activeNodeCount: 0 } },
    );
  }
  console.log(
    JSON.stringify(
      {
        migration: 'phase-13d1-secure-orchestration',
        status: 'complete',
        restartSafe: true,
        staleActiveCountsBackfilled: staleActiveCounts,
        results,
      },
      null,
      2,
    ),
  );
  return results;
}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error(`Orchestration migration failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
}

module.exports = { INDEX_MODELS, migrate };
