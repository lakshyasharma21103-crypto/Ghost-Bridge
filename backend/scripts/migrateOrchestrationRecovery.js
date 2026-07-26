const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const OrchestrationDefinition = require('../src/models/OrchestrationDefinition');
const OrchestrationRun = require('../src/models/OrchestrationRun');
const OrchestrationNodeRun = require('../src/models/OrchestrationNodeRun');
const OrchestrationRecoveryPolicy = require('../src/models/OrchestrationRecoveryPolicy');
const OrchestrationRecoveryDecision = require('../src/models/OrchestrationRecoveryDecision');
const OrchestrationCompensationPlan = require('../src/models/OrchestrationCompensationPlan');
const OrchestrationCompensationRun = require('../src/models/OrchestrationCompensationRun');
const OrchestrationInterventionRequest = require('../src/models/OrchestrationInterventionRequest');
const OrchestrationCheckpoint = require('../src/models/OrchestrationCheckpoint');
const OrchestrationCorrectedInput = require('../src/models/OrchestrationCorrectedInput');

const INDEX_MODELS = Object.freeze([
  OrchestrationDefinition,
  OrchestrationRun,
  OrchestrationNodeRun,
  OrchestrationRecoveryPolicy,
  OrchestrationRecoveryDecision,
  OrchestrationCompensationPlan,
  OrchestrationCompensationRun,
  OrchestrationInterventionRequest,
  OrchestrationCheckpoint,
  OrchestrationCorrectedInput,
]);

async function backfillMissing(Model, field, value, extraFilter = {}) {
  const result = await Model.updateMany(
    { ...extraFilter, [field]: { $exists: false } },
    { $set: { [field]: value } },
  );
  return Number(result.modifiedCount ?? result.nModified ?? 0);
}

async function migrate() {
  await connectDatabase();
  if (databaseStatus() !== 'connected') {
    throw new Error('MongoDB is required for the orchestration recovery migration.');
  }

  const indexes = [];
  for (const Model of INDEX_MODELS) {
    await Model.createIndexes();
    indexes.push({ model: Model.modelName, status: 'indexes_verified' });
  }

  const backfills = {};
  backfills.definitionCompensationEnabled = await backfillMissing(
    OrchestrationDefinition,
    'compensationEnabled',
    false,
  );
  backfills.definitionFailureStrategy = await backfillMissing(
    OrchestrationDefinition,
    'failureStrategy',
    'fail',
  );
  backfills.definitionMaximumRecoveryAttempts = await backfillMissing(
    OrchestrationDefinition,
    'maximumRecoveryAttempts',
    0,
  );
  backfills.definitionMaximumCompensationAttempts = await backfillMissing(
    OrchestrationDefinition,
    'maximumCompensationAttempts',
    0,
  );

  const definitionNodeResult = await OrchestrationDefinition.updateMany(
    { nodes: { $elemMatch: { recoverability: { $exists: false } } } },
    { $set: { 'nodes.$[node].recoverability': 'retryable' } },
    { arrayFilters: [{ 'node.recoverability': { $exists: false } }] },
  );
  backfills.definitionNodesRecoverability = Number(
    definitionNodeResult.modifiedCount ?? definitionNodeResult.nModified ?? 0,
  );

  backfills.runRecoveryAttempt = await backfillMissing(OrchestrationRun, 'recoveryAttempt', 0);
  backfills.runMaximumRecoveryAttempts = await backfillMissing(
    OrchestrationRun,
    'maximumRecoveryAttempts',
    0,
  );
  backfills.runMaximumCompensationAttempts = await backfillMissing(
    OrchestrationRun,
    'maximumCompensationAttempts',
    0,
  );
  backfills.runCheckpointSequence = await backfillMissing(
    OrchestrationRun,
    'checkpointSequence',
    0,
  );
  backfills.runUnresolvedSideEffects = await backfillMissing(
    OrchestrationRun,
    'unresolvedSideEffects',
    [],
  );

  backfills.nodeRecoverability = await backfillMissing(
    OrchestrationNodeRun,
    'recoverability',
    'retryable',
  );
  backfills.nodeRecoveryAttempt = await backfillMissing(
    OrchestrationNodeRun,
    'recoveryAttempt',
    0,
  );
  backfills.nodeMaximumRecoveryAttempts = await backfillMissing(
    OrchestrationNodeRun,
    'maximumRecoveryAttempts',
    0,
  );
  backfills.nodeCompensationStatus = await backfillMissing(
    OrchestrationNodeRun,
    'compensationStatus',
    'not_required',
  );
  backfills.nodeCompensationAttempt = await backfillMissing(
    OrchestrationNodeRun,
    'compensationAttempt',
    0,
  );
  backfills.nodeMaximumCompensationAttempts = await backfillMissing(
    OrchestrationNodeRun,
    'maximumCompensationAttempts',
    0,
  );

  const report = {
    migration: 'phase-13d4-orchestration-recovery',
    status: 'complete',
    restartSafe: true,
    nonDestructive: true,
    snapshotRewrites: 0,
    indexes,
    backfills,
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error(`Orchestration recovery migration failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
}

module.exports = { INDEX_MODELS, backfillMissing, migrate };
