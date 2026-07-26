const mongoose = require('mongoose');
const {
  DATA_CLASSIFICATIONS,
  DELEGATION_GRANT_STATUSES,
  INTER_AGENT_LIMITS,
} = require('../constants/interAgentDelegation');

const delegationGrantSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, immutable: true, index: true },
    workspaceId: { type: String, required: true, trim: true, immutable: true, index: true },
    orchestrationDefinitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationDefinition', immutable: true, index: true },
    orchestrationRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRun', immutable: true, index: true },
    sourceNodeRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationNodeRun', immutable: true, index: true },
    targetNodeRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationNodeRun', immutable: true, index: true },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDataContract', required: true, immutable: true, index: true },
    contractVersion: { type: Number, required: true, min: 1, immutable: true },
    sourcePassportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport', required: true, immutable: true },
    sourcePassportVersion: { type: String, required: true, trim: true, immutable: true, maxlength: 100 },
    sourceConnectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportConnection', required: true, immutable: true },
    targetPassportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport', required: true, immutable: true },
    targetPassportVersion: { type: String, required: true, trim: true, immutable: true, maxlength: 100 },
    targetConnectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportConnection', required: true, immutable: true },
    sourceCapability: { type: String, required: true, trim: true, immutable: true, maxlength: 200 },
    sourceOperation: { type: String, required: true, trim: true, immutable: true, maxlength: 200 },
    targetCapability: { type: String, required: true, trim: true, immutable: true, maxlength: 200 },
    targetOperation: { type: String, required: true, trim: true, immutable: true, maxlength: 200 },
    purpose: { type: String, required: true, trim: true, immutable: true, maxlength: 1_000 },
    purposeCode: { type: String, required: true, trim: true, immutable: true, match: /^[A-Z][A-Z0-9_]{0,127}$/ },
    status: { type: String, enum: DELEGATION_GRANT_STATUSES, default: 'pending', required: true, index: true },
    allowedInputSchemaHash: { type: String, required: true, trim: true, immutable: true },
    allowedOutputSchemaHash: { type: String, required: true, trim: true, immutable: true },
    allowedDataClassifications: [{ type: String, enum: DATA_CLASSIFICATIONS, immutable: true }],
    maximumDataClassification: { type: String, enum: DATA_CLASSIFICATIONS, required: true, immutable: true },
    invocationLimit: { type: Number, required: true, min: 1, max: INTER_AGENT_LIMITS.maximumInvocationLimit, immutable: true },
    invocationCount: { type: Number, default: 0, min: 0 },
    idempotencyReservationHashes: { type: [String], default: [], select: false },
    validFrom: { type: Date, required: true, immutable: true },
    expiresAt: { type: Date, required: true, immutable: true, index: true },
    delegationDepth: { type: Number, required: true, min: 1, max: INTER_AGENT_LIMITS.platformMaximumDelegationDepth, immutable: true },
    maximumDelegationDepth: { type: Number, required: true, min: 1, max: INTER_AGENT_LIMITS.platformMaximumDelegationDepth, immutable: true },
    allowFurtherDelegation: { type: Boolean, default: false, immutable: true },
    parentDelegationGrantId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDelegationGrant', immutable: true, index: true },
    passportPath: [{ type: String, trim: true, immutable: true, select: false }],
    approvalRequestId: { type: String, trim: true, maxlength: 128, index: true },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date },
    revocationReasonCode: { type: String, trim: true, match: /^[A-Z][A-Z0-9_]{0,127}$/ },
    revokedBy: { type: String, trim: true },
    revokedAt: { type: Date },
    firstUsedAt: { type: Date },
    completedAt: { type: Date },
    traceId: { type: String, required: true, trim: true, immutable: true, index: true, maxlength: 128 },
    requestId: { type: String, required: true, trim: true, immutable: true, index: true, maxlength: 128 },
    createdBy: { type: String, required: true, trim: true, immutable: true },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

delegationGrantSchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
delegationGrantSchema.index({ orchestrationRunId: 1, status: 1 });
delegationGrantSchema.index({ sourceNodeRunId: 1, status: 1 });
delegationGrantSchema.index({ targetNodeRunId: 1, status: 1 });
delegationGrantSchema.index({ contractId: 1, contractVersion: 1, status: 1 });
delegationGrantSchema.index({ status: 1, expiresAt: 1 });
delegationGrantSchema.index({ parentDelegationGrantId: 1, delegationDepth: 1 });
delegationGrantSchema.index({ _id: 1, status: 1, invocationCount: 1, invocationLimit: 1 });
delegationGrantSchema.index(
  { orchestrationRunId: 1, sourceNodeRunId: 1, targetNodeRunId: 1, contractId: 1 },
  {
    unique: true,
    name: 'unique_run_inter_agent_grant',
    partialFilterExpression: { orchestrationRunId: { $type: 'objectId' } },
  },
);

module.exports =
  mongoose.models.InterAgentDelegationGrant ||
  mongoose.model('InterAgentDelegationGrant', delegationGrantSchema);
