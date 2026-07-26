const mongoose = require('mongoose');
const { DR_PROVIDER_STATUSES } = require('../constants/enterpriseOperations');

const disasterRecoveryStatusSchema = new mongoose.Schema(
  {
    drStatusId: { type: String, required: true, unique: true, trim: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    component: { type: String, required: true, trim: true, index: true },
    status: { type: String, enum: DR_PROVIDER_STATUSES, default: 'UNKNOWN', index: true },
    source: { type: String, required: true, trim: true },
    observedAt: { type: Date, required: true },
    lastSuccessfulRestoreDrillAt: { type: Date },
    recoveryPointObjectiveMinutes: { type: Number, min: 0 },
    recoveryTimeObjectiveMinutes: { type: Number, min: 0 },
    safeMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: String, required: true, trim: true },
    revision: { type: Number, default: 0, min: 0 },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

disasterRecoveryStatusSchema.index(
  { organizationId: 1, workspaceId: 1, component: 1 },
  { unique: true },
);
disasterRecoveryStatusSchema.index({ organizationId: 1, status: 1, updatedAt: -1 });

module.exports =
  mongoose.models.DisasterRecoveryStatus ||
  mongoose.model('DisasterRecoveryStatus', disasterRecoveryStatusSchema);
