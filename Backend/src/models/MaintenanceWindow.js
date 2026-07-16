const mongoose = require('mongoose');
const {
  MAINTENANCE_MODES,
  MAINTENANCE_SCOPES,
  MAINTENANCE_STATUSES,
} = require('../constants/enterpriseOperations');

const maintenanceWindowSchema = new mongoose.Schema(
  {
    maintenanceId: { type: String, required: true, unique: true, trim: true },
    scopeType: { type: String, enum: MAINTENANCE_SCOPES, required: true, index: true },
    organizationId: { type: String, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    adapterId: { type: String, trim: true, index: true },
    connectionId: { type: String, trim: true, index: true },
    mode: { type: String, enum: MAINTENANCE_MODES, required: true },
    safeReason: { type: String, required: true, trim: true, maxlength: 1_000 },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, index: true },
    status: { type: String, enum: MAINTENANCE_STATUSES, default: 'DRAFT', index: true },
    createdBy: { type: String, required: true, trim: true },
    approvedBy: { type: String, trim: true },
    approvalRequestId: { type: String, trim: true },
    activatedAt: { type: Date },
    releasedAt: { type: Date },
    revision: { type: Number, default: 0, min: 0 },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

maintenanceWindowSchema.index({
  scopeType: 1,
  organizationId: 1,
  workspaceId: 1,
  status: 1,
  startsAt: 1,
});
maintenanceWindowSchema.index({ status: 1, endsAt: 1 });

module.exports =
  mongoose.models.MaintenanceWindow || mongoose.model('MaintenanceWindow', maintenanceWindowSchema);
