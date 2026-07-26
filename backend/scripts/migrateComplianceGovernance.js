const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const {
  ApprovalWorkflow,
  ApprovalRequest,
  ApprovalDecision,
  ApprovalGrant,
  ComplianceNotification,
  EvidenceEvent,
  AuditChainState,
  AuditCheckpoint,
  RetentionPolicy,
  LegalHold,
  EvidenceExport,
} = require('../src/models');
const { backfillEvidence } = require('../src/services/evidence.service');

async function ensureIndexes() {
  await Promise.all([
    ApprovalWorkflow.createIndexes(),
    ApprovalRequest.createIndexes(),
    ApprovalDecision.createIndexes(),
    ApprovalGrant.createIndexes(),
    ComplianceNotification.createIndexes(),
    EvidenceEvent.createIndexes(),
    AuditChainState.createIndexes(),
    AuditCheckpoint.createIndexes(),
    RetentionPolicy.createIndexes(),
    LegalHold.createIndexes(),
    EvidenceExport.createIndexes(),
  ]);
}

async function main() {
  await connectDatabase();
  if (databaseStatus() !== 'connected')
    throw new Error('Compliance-governance migration requires MongoDB.');
  await ensureIndexes();
  const totals = { processed: 0, created: 0, quarantined: 0, gaps: 0 };
  let afterId = process.env.COMPLIANCE_BACKFILL_AFTER_ID || undefined;
  const batchSize = Math.min(
    1_000,
    Math.max(1, Number(process.env.COMPLIANCE_BACKFILL_BATCH_SIZE || 250)),
  );
  do {
    const batch = await backfillEvidence({ afterId, limit: batchSize });
    totals.processed += batch.processed;
    totals.created += batch.created;
    totals.quarantined += batch.quarantined;
    totals.gaps += batch.gaps.length;
    afterId = batch.lastId;
    if (batch.processed < batchSize) break;
    console.log(
      `Compliance backfill checkpoint: afterId=${afterId} processed=${totals.processed}.`,
    );
  } while (afterId);
  console.log(
    `Compliance-governance migration complete: processed=${totals.processed} normalized=${totals.created} quarantined=${totals.quarantined} declaredGaps=${totals.gaps}.`,
  );
}

main()
  .catch((error) => {
    console.error(
      `Compliance-governance migration failed: ${error?.code || error?.name || 'ERROR'}`,
    );
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
