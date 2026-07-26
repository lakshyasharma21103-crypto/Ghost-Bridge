const mongoose = require('mongoose');
const { REWRAP_STATUSES } = require('../constants/secretGovernance');

const encryptionRewrapJobSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true, trim: true, maxlength: 128 },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    targetKeyVersion: { type: String, required: true, trim: true, maxlength: 64 },
    status: {
      type: String,
      enum: REWRAP_STATUSES,
      default: 'PENDING',
      required: true,
      index: true,
    },
    scannedCount: { type: Number, default: 0, min: 0 },
    rewrappedCount: { type: Number, default: 0, min: 0 },
    skippedCount: { type: Number, default: 0, min: 0 },
    failureCount: { type: Number, default: 0, min: 0 },
    lastProcessedVersionId: { type: String, trim: true, maxlength: 128 },
    lastFailureReasonCode: { type: String, trim: true, match: /^[A-Z][A-Z0-9_]{0,127}$/ },
    requestedBy: { type: String, required: true, trim: true, maxlength: 128 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    revision: { type: Number, default: 0, min: 0 },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

encryptionRewrapJobSchema.index({ organizationId: 1, status: 1, updatedAt: -1 });
encryptionRewrapJobSchema.index({ organizationId: 1, targetKeyVersion: 1, createdAt: -1 });

module.exports =
  mongoose.models.EncryptionRewrapJob ||
  mongoose.model('EncryptionRewrapJob', encryptionRewrapJobSchema);
