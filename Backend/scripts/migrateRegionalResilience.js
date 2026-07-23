const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const models = require('../src/models');
const { ensureModelIndexes } = require('./migrateDataAccessPerformance');

const phaseModels = [
  models.RegionalDeploymentConfiguration,
  models.RegionalServiceRegistration,
  models.RegionalHealthSnapshot,
  models.RegionalWriteAuthority,
  models.RegionalAuthorityTransition,
  models.RegionalRoutingDecision,
  models.RegionalReplicationHealth,
  models.DisasterRecoveryPolicy,
  models.RegionalFailoverPlan,
  models.BackupManifest,
  models.BackupIntegrityManifest,
  models.DisasterRecoveryRestore,
  models.DisasterRecoveryDrill,
  models.QueuePartition,
  models.WorkerRegistration,
  models.WorkloadAdmissionDecision,
  models.OrchestrationCheckpoint,
  models.OrchestrationTraceSpan,
  models.ProjectionMetadata,
];

async function migrate() {
  await connectDatabase();
  if (databaseStatus() !== 'connected') throw new Error('MongoDB is required for the regional resilience migration.');
  const results = [];
  for (const Model of phaseModels) results.push(...await ensureModelIndexes(Model));
  const backfills = [
    [models.QueuePartition, { regionalOwnershipEpoch: { $exists: false } }, { $set: { regionalOwnershipEpoch: 0, regionalStatus: 'active' } }, 'QueuePartition.regionalOwnershipEpoch'],
    [models.WorkerRegistration, { regionalStatus: { $exists: false } }, { $set: { regionalStatus: 'active', writeAuthorityEpoch: 0, authorityLeaseEpoch: 0, supportedRegionalOwnershipEpochs: [] } }, 'WorkerRegistration.regionalFencing'],
    [models.OrchestrationCheckpoint, { authorityEpoch: { $exists: false } }, { $set: { authorityEpoch: 0 } }, 'OrchestrationCheckpoint.authorityEpoch'],
    [models.ProjectionMetadata, { sourceAuthorityEpoch: { $exists: false } }, { $set: { sourceAuthorityEpoch: 0 } }, 'ProjectionMetadata.sourceAuthorityEpoch'],
  ];
  for (const [Model, filter, update, name] of backfills) {
    const result = await Model.updateMany(filter, update);
    results.push({ action: 'backfill', indexName: name, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  }
  return results;
}

if (require.main === module) {
  migrate()
    .then((results) => { for (const item of results) process.stdout.write(`${item.action.toUpperCase()} ${item.indexName}\n`); })
    .catch((error) => { process.stderr.write(`${error?.message || error}\n`); process.exitCode = 1; })
    .finally(() => disconnectDatabase());
}

module.exports = { migrate, phaseModels };
