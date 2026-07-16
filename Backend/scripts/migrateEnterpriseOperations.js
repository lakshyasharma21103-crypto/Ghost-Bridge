const mongoose = require('mongoose');
const { connectDatabase, disconnectDatabase, databaseStatus } = require('../src/config/db');
const Organization = require('../src/models/Organization');
const Workspace = require('../src/models/Workspace');
const EnterpriseUser = require('../src/models/EnterpriseUser');
const ServiceAccount = require('../src/models/ServiceAccount');
const LifecycleTransition = require('../src/models/LifecycleTransition');
const MaintenanceWindow = require('../src/models/MaintenanceWindow');
const AccessReviewCampaign = require('../src/models/AccessReviewCampaign');
const AccessReviewItem = require('../src/models/AccessReviewItem');
const OperationalConfiguration = require('../src/models/OperationalConfiguration');
const OperationalIncident = require('../src/models/OperationalIncident');
const SecurityEvent = require('../src/models/SecurityEvent');
const TenantDataExport = require('../src/models/TenantDataExport');
const TenantDeletionJob = require('../src/models/TenantDeletionJob');
const TenantDeletionTombstone = require('../src/models/TenantDeletionTombstone');
const OperationalRecovery = require('../src/models/OperationalRecovery');
const DisasterRecoveryStatus = require('../src/models/DisasterRecoveryStatus');

const INDEX_MODELS = [
  Organization,
  Workspace,
  EnterpriseUser,
  ServiceAccount,
  LifecycleTransition,
  MaintenanceWindow,
  AccessReviewCampaign,
  AccessReviewItem,
  OperationalConfiguration,
  OperationalIncident,
  SecurityEvent,
  TenantDataExport,
  TenantDeletionJob,
  TenantDeletionTombstone,
  OperationalRecovery,
  DisasterRecoveryStatus,
];

async function backfillModel(Model, defaults, options = {}) {
  const batchSize = Math.max(1, Math.min(Number(options.batchSize || 500), 2_000));
  let afterId =
    options.afterId && mongoose.isValidObjectId(options.afterId) ? options.afterId : undefined;
  let processed = 0;
  let modified = 0;
  while (true) {
    const items = await Model.find({ ...(afterId ? { _id: { $gt: afterId } } : {}) })
      .sort({ _id: 1 })
      .limit(batchSize)
      .select('_id status lifecycleRevision')
      .lean();
    if (!items.length) break;
    for (const item of items) {
      const set = {};
      for (const [key, value] of Object.entries(defaults)) {
        if (item[key] === undefined || item[key] === null) set[key] = value;
      }
      if (Object.keys(set).length) {
        const result = await Model.updateOne({ _id: item._id }, { $set: set });
        modified += result.modifiedCount;
      }
      processed += 1;
      afterId = item._id;
    }
    console.log(
      JSON.stringify({ model: Model.modelName, processed, modified, checkpoint: String(afterId) }),
    );
  }
  return {
    model: Model.modelName,
    processed,
    modified,
    checkpoint: afterId ? String(afterId) : null,
  };
}

async function migrate() {
  await connectDatabase();
  if (databaseStatus() !== 'connected')
    throw new Error('MongoDB is required for the enterprise operations migration.');
  for (const Model of INDEX_MODELS) await Model.createIndexes();
  const results = [];
  results.push(
    await backfillModel(
      Organization,
      { status: 'active', lifecycleRevision: 0 },
      { afterId: process.env.ENTERPRISE_ORGANIZATION_AFTER_ID },
    ),
  );
  results.push(
    await backfillModel(
      Workspace,
      { status: 'active', lifecycleRevision: 0 },
      { afterId: process.env.ENTERPRISE_WORKSPACE_AFTER_ID },
    ),
  );
  results.push(
    await backfillModel(
      EnterpriseUser,
      { lifecycleRevision: 0 },
      { afterId: process.env.ENTERPRISE_MEMBERSHIP_AFTER_ID },
    ),
  );
  results.push(
    await backfillModel(
      ServiceAccount,
      { lifecycleRevision: 0 },
      { afterId: process.env.ENTERPRISE_SERVICE_ACCOUNT_AFTER_ID },
    ),
  );
  console.log(
    JSON.stringify(
      {
        migration: 'phase-13c5-enterprise-operations',
        status: 'complete',
        safeDefaults: {
          organization: 'active',
          workspace: 'active',
          maintenance: 'absent-means-none',
          tenantDeletionEnabledAutomatically: false,
        },
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
      console.error(`Enterprise operations migration failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
}

module.exports = { INDEX_MODELS, backfillModel, migrate };
