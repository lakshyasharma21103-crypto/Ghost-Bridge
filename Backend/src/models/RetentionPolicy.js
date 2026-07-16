const mongoose = require('mongoose');
const {
  RETENTION_POLICY_STATUSES,
  EVIDENCE_RETENTION_CLASSES,
} = require('../constants/compliance');

const retentionPolicySchema = new mongoose.Schema(
  {
    retentionPolicyId: { type: String, required: true, trim: true },
    version: { type: Number, required: true, min: 1 },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    eventCategory: { type: String, enum: EVIDENCE_RETENTION_CLASSES, required: true },
    retentionDays: { type: Number, required: true, min: 1, max: 36_500 },
    archiveBehavior: { type: String, enum: ['KEEP', 'ARCHIVE'], default: 'KEEP' },
    deletionEligible: { type: Boolean, default: false },
    legalHoldBehavior: { type: String, enum: ['PRESERVE'], default: 'PRESERVE' },
    status: { type: String, enum: RETENTION_POLICY_STATUSES, default: 'DRAFT', index: true },
    createdBy: { type: String, required: true, trim: true },
    activatedAt: { type: Date },
    retiredAt: { type: Date },
    revision: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

retentionPolicySchema.index(
  { organizationId: 1, retentionPolicyId: 1, version: 1 },
  { unique: true, name: 'unique_tenant_retention_policy_version' },
);
retentionPolicySchema.index({ organizationId: 1, workspaceId: 1, eventCategory: 1, status: 1 });

module.exports =
  mongoose.models.RetentionPolicy || mongoose.model('RetentionPolicy', retentionPolicySchema);
