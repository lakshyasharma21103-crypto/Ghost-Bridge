const mongoose = require('mongoose');
const { TENANT_EXPORT_STATUSES } = require('../constants/enterpriseOperations');

const tenantDataExportSchema = new mongoose.Schema(
  {
    tenantExportId: { type: String, required: true, unique: true, trim: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    requestedBy: { type: String, required: true, trim: true },
    status: { type: String, enum: TENANT_EXPORT_STATUSES, default: 'PENDING', index: true },
    includedCategories: { type: [String], default: undefined },
    recordCounts: { type: mongoose.Schema.Types.Mixed, default: {} },
    manifestDigest: { type: String, trim: true },
    storageKey: { type: String, trim: true, select: false },
    downloadTokenHash: { type: String, trim: true, select: false },
    downloadExpiresAt: { type: Date, index: true },
    approvalRequestId: { type: String, trim: true },
    failureReasonCode: { type: String, trim: true },
    requestedAt: { type: Date, required: true, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    revision: { type: Number, default: 0, min: 0 },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

tenantDataExportSchema.index({ organizationId: 1, workspaceId: 1, status: 1, requestedAt: -1 });

module.exports =
  mongoose.models.TenantDataExport || mongoose.model('TenantDataExport', tenantDataExportSchema);
