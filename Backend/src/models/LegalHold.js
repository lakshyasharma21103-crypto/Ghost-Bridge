const mongoose = require('mongoose');
const { LEGAL_HOLD_STATUSES } = require('../constants/compliance');

const legalHoldSchema = new mongoose.Schema(
  {
    legalHoldId: { type: String, required: true, unique: true, trim: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2_000 },
    scope: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: LEGAL_HOLD_STATUSES, default: 'DRAFT', index: true },
    effectiveFrom: { type: Date, required: true },
    effectiveUntil: { type: Date },
    createdBy: { type: String, required: true, trim: true },
    releasedBy: { type: String, trim: true },
    releasedAt: { type: Date },
    revision: { type: Number, default: 0, min: 0 },
    auditReferences: { type: [String], default: undefined },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

legalHoldSchema.index({ organizationId: 1, workspaceId: 1, status: 1, effectiveFrom: 1 });
legalHoldSchema.index({ organizationId: 1, 'scope.approvalRequestIds': 1, status: 1 });
legalHoldSchema.index({ organizationId: 1, 'scope.resourceIds': 1, status: 1 });

module.exports = mongoose.models.LegalHold || mongoose.model('LegalHold', legalHoldSchema);
