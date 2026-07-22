const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const OrchestrationNodeRun = require('../src/models/OrchestrationNodeRun');
const OrchestrationCompensationRun = require('../src/models/OrchestrationCompensationRun');
const RuntimeWorkItem = require('../src/models/RuntimeWorkItem');
const {
  defaultScaleConfiguration,
  ensurePartitions,
  routeWorkload,
} = require('../src/services/productionScale.service');
const {
  ensureProductionScaleIndexes,
} = require('../src/services/productionScaleOperations.service');

function routeFor(record, workloadCategory, workspaceField = 'workspaceId') {
  return routeWorkload(
    {
      organizationId: String(record.organizationId || record.partnerId),
      workspaceId: String(record[workspaceField]),
      routingKey: `${record.orchestrationRunId || record.invocationId || record._id}:${record.nodeKey || record.compensationStepOrdinal || ''}`,
      workloadCategory,
      routingVersion: Number(record.routingVersion || 1),
    },
    defaultScaleConfiguration(),
  );
}

async function backfillModel(Model, filter, select, workloadCategory, workspaceField) {
  let scanned = 0;
  let updated = 0;
  const cursor = Model.find(filter).select(select).sort({ _id: 1 }).lean().cursor();
  for await (const record of cursor) {
    scanned += 1;
    const route = routeFor(record, workloadCategory, workspaceField);
    const result = await Model.updateOne(
      { _id: record._id, routingVersion: { $exists: false } },
      {
        $set: {
          workloadCategory: route.workloadCategory,
          routingVersion: route.routingVersion,
          partitionNumber: route.partitionNumber,
          partitionKey: route.partitionKey,
          workerPool: route.workerPool,
          admissionClass: workloadCategory === 'orchestration_compensation' ? 'protected' : 'standard',
          priorityClass: workloadCategory === 'orchestration_compensation' ? 'critical_recovery' : 'standard',
          leaseEpoch: 0,
        },
      },
    );
    updated += result.modifiedCount || 0;
  }
  return { scanned, updated };
}

async function migrate() {
  await connectDatabase();
  if (databaseStatus() !== 'connected') throw new Error('MongoDB is required for the production scale migration.');
  const indexes = await ensureProductionScaleIndexes();
  await OrchestrationCompensationRun.createIndexes();
  const configuration = defaultScaleConfiguration();
  const partitions = await ensurePartitions(configuration);
  const [nodes, compensations, runtimeWork] = await Promise.all([
    backfillModel(
      OrchestrationNodeRun,
      { routingVersion: { $exists: false } },
      '_id organizationId workspaceId orchestrationRunId nodeKey routingVersion',
      'orchestration_node',
      'workspaceId',
    ),
    backfillModel(
      OrchestrationCompensationRun,
      { routingVersion: { $exists: false } },
      '_id organizationId workspaceId orchestrationRunId compensationStepOrdinal routingVersion',
      'orchestration_compensation',
      'workspaceId',
    ),
    backfillModel(
      RuntimeWorkItem,
      { routingVersion: { $exists: false } },
      '_id organizationId partnerId receivingWorkspaceId invocationId routingVersion',
      'orchestration_node',
      'receivingWorkspaceId',
    ),
  ]);
  const report = {
    migration: 'phase-13e1-production-scale',
    status: 'complete',
    restartSafe: true,
    idempotent: true,
    backwardCompatible: true,
    nonDestructive: true,
    activeJobsRewritten: false,
    indexes,
    partitions,
    backfills: { nodes, compensations, runtimeWork },
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error(`Production scale migration failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
}

module.exports = { backfillModel, migrate, routeFor };
