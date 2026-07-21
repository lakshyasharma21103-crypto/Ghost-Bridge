const mongoose = require('mongoose');
const { SELECTION_DECISION_STATUSES, TRUST_TIERS, VERIFICATION_STATUSES } = require('../constants/agentSelection');

const safeCandidateSchema = new mongoose.Schema(
  {
    passportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport', required: true },
    passportVersion: { type: String, required: true, trim: true, maxlength: 64 },
    connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportConnection', required: true },
    agentName: { type: String, required: true, trim: true, maxlength: 200 },
    publisherName: { type: String, required: true, trim: true, maxlength: 200 },
    score: { type: Number, required: true, min: 0, max: 10_000 },
    trustTier: { type: String, enum: TRUST_TIERS, required: true },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, required: true },
  },
  { _id: false, strict: 'throw' },
);

const selectionDecisionSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true, immutable: true },
    workspaceId: { type: String, required: true, trim: true, index: true, immutable: true },
    requestId: { type: String, required: true, trim: true, maxlength: 128, index: true, immutable: true },
    traceId: { type: String, required: true, trim: true, maxlength: 128, index: true, immutable: true },
    requestedBy: { type: String, required: true, trim: true, immutable: true },
    selectionPolicyId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentSelectionPolicy', immutable: true },
    selectionPolicyVersion: { type: Number, min: 0, required: true, immutable: true },
    orchestrationDefinitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationDefinition', immutable: true },
    orchestrationRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRun', index: true },
    orchestrationNodeKey: { type: String, trim: true, maxlength: 100, immutable: true },
    requestedCapability: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    requestedOperation: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    normalizedConstraints: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
    candidateSnapshotHash: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    evaluatedCandidateCount: { type: Number, required: true, min: 0, immutable: true },
    eligibleCandidateCount: { type: Number, required: true, min: 0, immutable: true },
    selectedPassportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport', immutable: true },
    selectedPassportVersion: { type: String, trim: true, maxlength: 64, immutable: true },
    selectedConnectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportConnection', immutable: true },
    selectedAgentName: { type: String, trim: true, maxlength: 200, immutable: true },
    selectedPublisherName: { type: String, trim: true, maxlength: 200, immutable: true },
    selectedTrustTier: { type: String, enum: TRUST_TIERS, immutable: true },
    selectedVerificationStatus: { type: String, enum: VERIFICATION_STATUSES, immutable: true },
    selectedScore: { type: Number, min: 0, max: 10_000, immutable: true },
    fallbackCandidates: { type: [safeCandidateSchema], default: [], immutable: true },
    safeDecisionReasons: [{ type: String, trim: true, maxlength: 128, immutable: true }],
    safeExclusionSummary: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
    healthSnapshotAt: { type: Date, immutable: true },
    decisionStatus: { type: String, enum: SELECTION_DECISION_STATUSES, required: true, index: true },
    approvalRequestId: { type: String, trim: true, maxlength: 128 },
    approvalResolvedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' },
);

selectionDecisionSchema.index({ organizationId: 1, workspaceId: 1, createdAt: -1, _id: -1 });
selectionDecisionSchema.index({ organizationId: 1, workspaceId: 1, decisionStatus: 1, createdAt: -1 });
selectionDecisionSchema.index({ orchestrationRunId: 1, orchestrationNodeKey: 1 });
selectionDecisionSchema.index({ selectedPassportId: 1, selectedConnectionId: 1, createdAt: -1 });

module.exports =
  mongoose.models.AgentSelectionDecision ||
  mongoose.model('AgentSelectionDecision', selectionDecisionSchema);
