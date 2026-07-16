const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const Partner = require('../src/models/Partner');
const Policy = require('../src/models/Policy');
const PolicyRevision = require('../src/models/PolicyRevision');
const Capability = require('../src/models/Capability');
const Workspace = require('../src/models/Workspace');

async function main() {
  await connectDatabase();
  if (databaseStatus() !== 'connected') throw new Error('Policy migration requires MongoDB.');
  await Promise.all([
    Policy.createIndexes(),
    PolicyRevision.createIndexes(),
    Capability.createIndexes(),
    Workspace.createIndexes(),
  ]);
  const [partners, policyOrganizations] = await Promise.all([
    Partner.find({ status: { $ne: 'suspended' } })
      .select('_id')
      .lean(),
    Policy.distinct('organizationId'),
  ]);
  const organizationIds = [
    ...new Set([
      ...partners.map((partner) => String(partner._id)),
      ...policyOrganizations.map(String),
    ]),
  ];
  if (organizationIds.length) {
    await PolicyRevision.bulkWrite(
      organizationIds.map((organizationId) => ({
        updateOne: {
          filter: { organizationId },
          update: { $setOnInsert: { generation: 0, schemaVersion: 1 } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }
  console.log(
    `Policy engine migration complete for ${organizationIds.length} organization scope(s).`,
  );
}

main()
  .catch((error) => {
    console.error(`Policy engine migration failed: ${error?.code || error?.name || 'ERROR'}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
