const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const InterAgentDataContract = require('../src/models/InterAgentDataContract');
const InterAgentDelegationGrant = require('../src/models/InterAgentDelegationGrant');
const InterAgentDelegationInvocation = require('../src/models/InterAgentDelegationInvocation');
const InterAgentDelegationReference = require('../src/models/InterAgentDelegationReference');
const OrchestrationDefinition = require('../src/models/OrchestrationDefinition');
const OrchestrationNodeRun = require('../src/models/OrchestrationNodeRun');
const Invocation = require('../src/models/Invocation');

const INDEX_MODELS = [
  InterAgentDataContract,
  InterAgentDelegationGrant,
  InterAgentDelegationInvocation,
  InterAgentDelegationReference,
  OrchestrationDefinition,
  OrchestrationNodeRun,
  Invocation,
];

async function migrate() {
  await connectDatabase();
  if (databaseStatus() !== 'connected') {
    throw new Error('MongoDB is required for the inter-agent-delegation migration.');
  }
  const results = [];
  for (const Model of INDEX_MODELS) {
    await Model.createIndexes();
    results.push({ model: Model.modelName, status: 'indexes_verified' });
  }
  const legacyDefinitions = await OrchestrationDefinition.updateMany(
    { edges: { $elemMatch: { mappingMode: { $exists: false } } } },
    { $set: { 'edges.$[edge].mappingMode': 'direct' } },
    { arrayFilters: [{ 'edge.mappingMode': { $exists: false } }] },
  );
  const output = {
    migration: 'phase-13d3-inter-agent-delegation',
    status: 'complete',
    restartSafe: true,
    nonDestructive: true,
    definitionsBackfilled: legacyDefinitions.modifiedCount,
    results,
  };
  console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error(`Inter-agent-delegation migration failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
}

module.exports = { INDEX_MODELS, migrate };
