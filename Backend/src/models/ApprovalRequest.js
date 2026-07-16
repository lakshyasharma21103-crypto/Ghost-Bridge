const mongoose = require('mongoose');
const { APPROVAL_REQUEST_STATUSES, COMPLIANCE_SCHEMA_VERSION } = require('../constants/compliance');

const approvalRequestSchema = new mongoose.Schema(
  {
    approvalRequestId: { type: String, required: true, unique: true, trim: true, index: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    workflowId: { type: String, required: true, trim: true, index: true },
    workflowVersion: { type: Number, required: true, min: 1 },
    requesterActorId: { type: String, required: true, trim: true, index: true },
    requesterActorType: { type: String, required: true, trim: true },
    permission: { type: String, required: true, trim: true },
    resourceType: { type: String, required: true, trim: true },
    resourceId: { type: String, required: true, trim: true, index: true },
    operationType: { type: String, required: true, trim: true },
    capabilityId: { type: String, trim: true },
    connectionId: { type: String, trim: true },
    invocationId: { type: String, trim: true, index: true },
    environment: { type: String, trim: true },
    requestFingerprint: { type: String, required: true, trim: true, index: true },
    fingerprintSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    authorizationSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    policySnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    requestedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: APPROVAL_REQUEST_STATUSES,
      default: 'PENDING',
      required: true,
      index: true,
    },
    currentStageSequence: { type: Number, required: true, default: 1, min: 1 },
    revision: { type: Number, default: 0, min: 0 },
    traceId: { type: String, trim: true, index: true },
    requestId: { type: String, trim: true, index: true },
    idempotencyKeyHash: { type: String, trim: true },
    reason: { type: String, trim: true, maxlength: 1_000 },
    invalidationReasonCode: { type: String, trim: true },
    metadataSchemaVersion: { type: Number, enum: [COMPLIANCE_SCHEMA_VERSION], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

approvalRequestSchema.index({ organizationId: 1, workspaceId: 1, status: 1, requestedAt: -1 });
approvalRequestSchema.index({ organizationId: 1, requesterActorId: 1, status: 1, requestedAt: -1 });
approvalRequestSchema.index({ organizationId: 1, resourceType: 1, resourceId: 1, status: 1 });
approvalRequestSchema.index({ organizationId: 1, expiresAt: 1, status: 1 });
approvalRequestSchema.index(
  { organizationId: 1, idempotencyKeyHash: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } },
    name: 'unique_tenant_approval_idempotency',
  },
);

module.exports =
  mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', approvalRequestSchema);
