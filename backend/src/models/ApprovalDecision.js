const mongoose = require('mongoose');
const { APPROVAL_DECISIONS, COMPLIANCE_SCHEMA_VERSION } = require('../constants/compliance');

const approvalDecisionSchema = new mongoose.Schema(
  {
    decisionId: { type: String, required: true, unique: true, trim: true },
    approvalRequestId: { type: String, required: true, trim: true, index: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    stageId: { type: String, required: true, trim: true },
    stageSequence: { type: Number, required: true, min: 1 },
    approverActorId: { type: String, required: true, trim: true, index: true },
    approverActorType: { type: String, required: true, trim: true },
    decision: { type: String, enum: APPROVAL_DECISIONS, required: true },
    comment: { type: String, trim: true, maxlength: 1_000 },
    decidedAt: { type: Date, required: true, default: Date.now },
    authorizationEvidence: { type: mongoose.Schema.Types.Mixed, required: true },
    policyEvidence: { type: mongoose.Schema.Types.Mixed, required: true },
    traceId: { type: String, trim: true },
    requestId: { type: String, trim: true },
    requestRevision: { type: Number, required: true, min: 0 },
    schemaVersion: { type: Number, enum: [COMPLIANCE_SCHEMA_VERSION], default: 1 },
  },
  { timestamps: true, strict: 'throw' },
);

approvalDecisionSchema.index(
  { organizationId: 1, approvalRequestId: 1, stageId: 1, approverActorId: 1 },
  { unique: true, name: 'unique_approver_decision_per_stage' },
);
approvalDecisionSchema.index({ organizationId: 1, approvalRequestId: 1, stageSequence: 1 });

module.exports =
  mongoose.models.ApprovalDecision || mongoose.model('ApprovalDecision', approvalDecisionSchema);
