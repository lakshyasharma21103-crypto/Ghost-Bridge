const mongoose = require('mongoose');
const { EVIDENCE_EXPORT_STATUSES } = require('../constants/compliance');

const evidenceExportSchema = new mongoose.Schema(
  {
    evidenceExportId: { type: String, required: true, unique: true, trim: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    requestedBy: { type: String, required: true, trim: true },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: EVIDENCE_EXPORT_STATUSES, default: 'PENDING', index: true },
    eventCount: { type: Number, min: 0 },
    storageKey: { type: String, trim: true, select: false },
    packageDigest: { type: String, trim: true },
    failureReasonCode: { type: String, trim: true },
    knownGaps: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    approvalRequestId: { type: String, trim: true },
    requestedAt: { type: Date, required: true, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    expiresAt: { type: Date, index: true },
    revision: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

evidenceExportSchema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 });
evidenceExportSchema.index({ organizationId: 1, expiresAt: 1, status: 1 });

module.exports =
  mongoose.models.EvidenceExport || mongoose.model('EvidenceExport', evidenceExportSchema);
