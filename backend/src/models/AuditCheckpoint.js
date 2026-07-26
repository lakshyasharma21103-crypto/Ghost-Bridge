const mongoose = require('mongoose');

const auditCheckpointSchema = new mongoose.Schema(
  {
    checkpointId: { type: String, required: true, unique: true, trim: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    partitionId: { type: String, required: true, trim: true },
    startSequence: { type: Number, required: true, min: 1 },
    endSequence: { type: Number, required: true, min: 1 },
    firstEventDigest: { type: String, required: true, trim: true },
    finalEventDigest: { type: String, required: true, trim: true },
    eventCount: { type: Number, required: true, min: 1 },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'VALID', 'INVALID', 'PARTIALLY_VERIFIABLE'],
      default: 'UNVERIFIED',
    },
    signingKeyId: { type: String, trim: true },
    signatureAlgorithm: { type: String, trim: true },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' },
);

auditCheckpointSchema.index(
  { organizationId: 1, partitionId: 1, startSequence: 1, endSequence: 1 },
  { unique: true, name: 'idempotent_audit_checkpoint_range' },
);
auditCheckpointSchema.index({ organizationId: 1, partitionId: 1, endSequence: -1 });

module.exports =
  mongoose.models.AuditCheckpoint || mongoose.model('AuditCheckpoint', auditCheckpointSchema);
