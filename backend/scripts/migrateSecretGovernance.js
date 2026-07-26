const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const Credential = require('../src/models/Credential');
const PassportConnection = require('../src/models/PassportConnection');
const GovernedSecret = require('../src/models/GovernedSecret');
const SecretVersion = require('../src/models/SecretVersion');
const CredentialBinding = require('../src/models/CredentialBinding');
const CredentialLease = require('../src/models/CredentialLease');
const CredentialRotationAttempt = require('../src/models/CredentialRotationAttempt');
const EncryptionRewrapJob = require('../src/models/EncryptionRewrapJob');
const { migrateLegacyCredential } = require('../src/services/secretGovernance.service');

async function ensureIndexes() {
  await Promise.all([
    GovernedSecret.createIndexes(),
    SecretVersion.createIndexes(),
    CredentialBinding.createIndexes(),
    CredentialLease.createIndexes(),
    CredentialRotationAttempt.createIndexes(),
    EncryptionRewrapJob.createIndexes(),
  ]);
}

async function quarantine(credential, reasonCode) {
  await Credential.updateOne(
    { _id: credential._id, migrationStatus: { $ne: 'migrated' } },
    {
      $set: {
        migrationStatus: 'recovery_required',
        migrationReasonCode: reasonCode,
        schemaVersion: Math.max(1, Number(credential.schemaVersion || 1)),
      },
    },
  );
}

async function main() {
  await connectDatabase();
  if (databaseStatus() !== 'connected') {
    throw new Error('Secret-governance migration requires MongoDB.');
  }
  await ensureIndexes();
  const stats = { scanned: 0, migrated: 0, alreadyMigrated: 0, recoveryRequired: 0 };
  const cursor = Credential.find({}).select('+encryptedPayload').cursor();
  for await (const credential of cursor) {
    stats.scanned += 1;
    if (credential.migrationStatus === 'migrated' && credential.governedSecretId) {
      stats.alreadyMigrated += 1;
      continue;
    }
    const connection = await PassportConnection.findOne({
      _id: credential.connectionId,
      credentialId: credential._id,
    });
    if (!connection || !connection.partnerId || !connection.receivingWorkspaceId) {
      await quarantine(credential, 'AMBIGUOUS_AUTHORITATIVE_TENANT_OWNERSHIP');
      stats.recoveryRequired += 1;
      continue;
    }
    try {
      await migrateLegacyCredential(credential, connection, {
        actorId: 'system:secret-governance-migration',
      });
      stats.migrated += 1;
    } catch (error) {
      await quarantine(
        credential,
        /^[A-Z][A-Z0-9_]{0,127}$/.test(String(error?.code || ''))
          ? error.code
          : 'SECRET_MIGRATION_FAILED',
      );
      stats.recoveryRequired += 1;
    }
  }
  console.log(
    `Secret-governance migration complete: scanned=${stats.scanned} migrated=${stats.migrated} alreadyMigrated=${stats.alreadyMigrated} recoveryRequired=${stats.recoveryRequired}.`,
  );
}

main()
  .catch((error) => {
    console.error(`Secret-governance migration failed: ${error?.code || error?.name || 'ERROR'}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
