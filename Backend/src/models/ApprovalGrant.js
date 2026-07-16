const mongoose = require('mongoose');
const { APPROVAL_GRANT_STATUSES, COMPLIANCE_SCHEMA_VERSION } = require('../constants/compliance');

const approvalGrantSchema = new mongoose.Schema(
  {
    approvalGrantId: { type: String, required: true, unique: true, trim: true },
    approvalRequestId: { type: String, required: true, unique: true, trim: true, index: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    requesterActorId: { type: String, required: true, trim: true },
    permission: { type: String, required: true, trim: true },
    resourceType: { type: String, required: true, trim: true },
    resourceId: { type: String, required: true, trim: true },
    operationType: { type: String, required: true, trim: true },
    requestFingerprint: { type: String, required: true, trim: true, index: true },
    issuedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date },
    revokedAt: { type: Date },
    status: { type: String, enum: APPROVAL_GRANT_STATUSES, default: 'ACTIVE', index: true },
    singleUse: { type: Boolean, default: true },
    workflowId: { type: String, required: true, trim: true },
    workflowVersion: { type: Number, required: true, min: 1 },
    decisionIds: { type: [String], required: true },
    policySnapshotRevision: { type: Number, min: 0 },
    authorizationSnapshotReference: { type: String, trim: true },
    schemaVersion: { type: Number, enum: [COMPLIANCE_SCHEMA_VERSION], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

approvalGrantSchema.index({ organizationId: 1, status: 1, expiresAt: 1 });
approvalGrantSchema.index({
  organizationId: 1,
  requesterActorId: 1,
  resourceType: 1,
  resourceId: 1,
});

module.exports =
  mongoose.models.ApprovalGrant || mongoose.model('ApprovalGrant', approvalGrantSchema);
