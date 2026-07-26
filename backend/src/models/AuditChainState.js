const mongoose = require('mongoose');

const auditChainStateSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true },
    partitionId: { type: String, required: true, trim: true },
    chainId: { type: String, required: true, trim: true },
    nextSequence: { type: Number, required: true, default: 1, min: 1 },
    finalDigest: { type: String, trim: true },
    lastOccurredAt: { type: Date },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

auditChainStateSchema.index(
  { organizationId: 1, partitionId: 1 },
  { unique: true, name: 'unique_tenant_audit_chain_partition' },
);

module.exports =
  mongoose.models.AuditChainState || mongoose.model('AuditChainState', auditChainStateSchema);
