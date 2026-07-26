const mongoose = require('mongoose');
const { TENANT_DELETION_STATUSES } = require('../constants/enterpriseOperations');

const deletionStepSchema = new mongoose.Schema(
  {
    collectionName: { type: String, required: true, trim: true },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], required: true },
    deletedCount: { type: Number, default: 0, min: 0 },
    completedAt: { type: Date },
    reasonCode: { type: String, trim: true },
  },
  { _id: false, strict: 'throw' },
);

const tenantDeletionJobSchema = new mongoose.Schema(
  {
    deletionJobId: { type: String, required: true, unique: true, trim: true },
    operationId: { type: String, required: true, trim: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    requestedBy: { type: String, required: true, trim: true },
    approvedBy: { type: String, trim: true },
    approvalRequestId: { type: String, trim: true },
    status: { type: String, enum: TENANT_DELETION_STATUSES, default: 'REQUESTED', index: true },
    safeReason: { type: String, required: true, trim: true, maxlength: 1_000 },
    confirmationDigest: { type: String, required: true, trim: true },
    preview: { type: mongoose.Schema.Types.Mixed, default: {} },
    blockers: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    deletionSteps: { type: [deletionStepSchema], default: [] },
    lastCompletedStage: { type: String, trim: true },
    failureReasonCode: { type: String, trim: true },
    requestedAt: { type: Date, required: true, default: Date.now },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    revision: { type: Number, default: 0, min: 0 },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

tenantDeletionJobSchema.index({ organizationId: 1, operationId: 1 }, { unique: true });
tenantDeletionJobSchema.index({ organizationId: 1, status: 1, requestedAt: -1 });

module.exports =
  mongoose.models.TenantDeletionJob || mongoose.model('TenantDeletionJob', tenantDeletionJobSchema);
