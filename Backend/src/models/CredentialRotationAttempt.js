const mongoose = require('mongoose');
const { ROTATION_STAGES } = require('../constants/secretGovernance');

const rotationHistorySchema = new mongoose.Schema(
  {
    stage: { type: String, enum: ROTATION_STAGES, required: true },
    at: { type: Date, required: true },
    reasonCode: { type: String, trim: true, match: /^[A-Z][A-Z0-9_]{0,127}$/ },
  },
  { _id: false, strict: 'throw' },
);

const credentialRotationAttemptSchema = new mongoose.Schema(
  {
    rotationAttemptId: { type: String, required: true, trim: true, maxlength: 128 },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    secretId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    mode: { type: String, enum: ['MANUAL', 'PROVIDER_MANAGED'], required: true },
    stage: { type: String, enum: ROTATION_STAGES, required: true, index: true },
    idempotencyKeyHash: { type: String, required: true, trim: true, select: false },
    oldVersionId: { type: String, trim: true, maxlength: 128 },
    newVersionId: { type: String, trim: true, maxlength: 128 },
    requestedBy: { type: String, required: true, trim: true, maxlength: 128 },
    history: { type: [rotationHistorySchema], default: [] },
    failureReasonCode: { type: String, trim: true, match: /^[A-Z][A-Z0-9_]{0,127}$/ },
    completedAt: { type: Date },
    revision: { type: Number, default: 0, min: 0 },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

credentialRotationAttemptSchema.index(
  { organizationId: 1, rotationAttemptId: 1 },
  { unique: true, name: 'unique_tenant_rotation_attempt' },
);
credentialRotationAttemptSchema.index(
  { organizationId: 1, secretId: 1, idempotencyKeyHash: 1 },
  { unique: true, name: 'idempotent_secret_rotation' },
);
credentialRotationAttemptSchema.index({ organizationId: 1, stage: 1, updatedAt: -1 });

module.exports =
  mongoose.models.CredentialRotationAttempt ||
  mongoose.model('CredentialRotationAttempt', credentialRotationAttemptSchema);
