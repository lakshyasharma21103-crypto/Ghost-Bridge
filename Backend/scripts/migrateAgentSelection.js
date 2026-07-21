const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const CapabilityCatalogEntry = require('../src/models/CapabilityCatalogEntry');
const AgentSelectionPolicy = require('../src/models/AgentSelectionPolicy');
const AgentSelectionDecision = require('../src/models/AgentSelectionDecision');
const OrchestrationDefinition = require('../src/models/OrchestrationDefinition');
const OrchestrationNodeRun = require('../src/models/OrchestrationNodeRun');
const ApprovalRequest = require('../src/models/ApprovalRequest');

const INDEX_MODELS = [
  CapabilityCatalogEntry,
  AgentSelectionPolicy,
  AgentSelectionDecision,
  OrchestrationDefinition,
  OrchestrationNodeRun,
  ApprovalRequest,
];

async function migrate() {
  await connectDatabase();
  if (databaseStatus() !== 'connected') throw new Error('MongoDB is required for the agent-selection migration.');
  const results = [];
  for (const Model of INDEX_MODELS) {
    await Model.createIndexes();
    results.push({ model: Model.modelName, status: 'indexes_verified' });
  }
  const legacyDefinitions = await OrchestrationDefinition.updateMany(
    { 'nodes.targetingMode': { $exists: false } },
    { $set: { 'nodes.$[].targetingMode': 'pinned', 'nodes.$[].selectionTiming': 'run_creation' } },
  );
  const legacyNodeRuns = await OrchestrationNodeRun.updateMany(
    { targetingMode: { $exists: false } },
    { $set: { targetingMode: 'pinned' } },
  );
  const output = {
    migration: 'phase-13d2-agent-selection',
    status: 'complete',
    restartSafe: true,
    definitionsBackfilled: legacyDefinitions.modifiedCount,
    nodeRunsBackfilled: legacyNodeRuns.modifiedCount,
    results,
  };
  console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error(`Agent-selection migration failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
}

module.exports = { INDEX_MODELS, migrate };
