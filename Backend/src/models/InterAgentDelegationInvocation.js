const mongoose = require('mongoose');
const {
  DATA_CLASSIFICATIONS,
  DELEGATION_INVOCATION_STATUSES,
} = require('../constants/interAgentDelegation');

const SAFE_HASH = /^(?:sha256|hmac-sha256):[a-f0-9]{64}$/;

const delegationInvocationSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, immutable: true, index: true },
    workspaceId: { type: String, required: true, trim: true, immutable: true, index: true },
    delegationGrantId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDelegationGrant', required: true, immutable: true, index: true },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDataContract', required: true, immutable: true },
    contractVersion: { type: Number, required: true, min: 1, immutable: true },
    orchestrationRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRun', immutable: true, index: true },
    sourceNodeRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationNodeRun', immutable: true, index: true },
    targetNodeRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationNodeRun', immutable: true, index: true },
    sourcePassportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport', required: true, immutable: true },
    targetPassportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport', required: true, immutable: true },
    sourceConnectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportConnection', required: true, immutable: true },
    targetConnectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportConnection', required: true, immutable: true },
    capability: { type: String, required: true, trim: true, immutable: true, maxlength: 200 },
    operation: { type: String, required: true, trim: true, immutable: true, maxlength: 200 },
    purposeCode: { type: String, required: true, trim: true, immutable: true, match: /^[A-Z][A-Z0-9_]{0,127}$/ },
    status: { type: String, enum: DELEGATION_INVOCATION_STATUSES, required: true, default: 'prepared', index: true },
    invocationOrdinal: { type: Number, required: true, min: 1, immutable: true },
    idempotencyKeyHash: { type: String, required: true, trim: true, immutable: true, match: SAFE_HASH, select: false },
    effectiveDataClassification: { type: String, enum: DATA_CLASSIFICATIONS, required: true, immutable: true, index: true },
    delegatedFieldCount: { type: Number, default: 0, min: 0, immutable: true },
    removedFieldCount: { type: Number, default: 0, min: 0, immutable: true },
    redactedFieldCount: { type: Number, default: 0, min: 0, immutable: true },
    transformedFieldCount: { type: Number, default: 0, min: 0, immutable: true },
    approximateInputBytes: { type: Number, default: 0, min: 0, immutable: true },
    approximateOutputBytes: { type: Number, default: 0, min: 0 },
    sourceSchemaHash: { type: String, required: true, trim: true, immutable: true, match: SAFE_HASH },
    targetSchemaHash: { type: String, required: true, trim: true, immutable: true, match: SAFE_HASH },
    inputPayloadHash: { type: String, trim: true, immutable: true, match: SAFE_HASH, select: false },
    outputPayloadHash: { type: String, trim: true, match: SAFE_HASH, select: false },
    policyDecisionCategory: { type: String, trim: true, maxlength: 64, immutable: true },
    approvalRequestId: { type: String, trim: true, maxlength: 128, immutable: true, index: true },
    runtimeInvocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invocation', index: true },
    requestId: { type: String, required: true, trim: true, immutable: true, index: true, maxlength: 128 },
    traceId: { type: String, required: true, trim: true, immutable: true, index: true, maxlength: 128 },
    parentTraceId: { type: String, trim: true, immutable: true, maxlength: 128 },
    safeFailureCode: { type: String, trim: true, match: /^[A-Z][A-Z0-9_]{0,127}$/ },
    safeFailureMessage: { type: String, trim: true, maxlength: 500 },
    retryability: { type: Boolean, default: false },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' },
);

delegationInvocationSchema.index({ organizationId: 1, workspaceId: 1, createdAt: -1, _id: -1 });
delegationInvocationSchema.index(
  { delegationGrantId: 1, invocationOrdinal: 1 },
  { unique: true, name: 'unique_grant_invocation_ordinal' },
);
delegationInvocationSchema.index({ orchestrationRunId: 1, createdAt: -1 });
delegationInvocationSchema.index({ sourceNodeRunId: 1, createdAt: -1 });
delegationInvocationSchema.index({ targetNodeRunId: 1, createdAt: -1 });
delegationInvocationSchema.index({ requestId: 1, createdAt: -1 });
delegationInvocationSchema.index({ traceId: 1, createdAt: -1 });
delegationInvocationSchema.index({ status: 1, createdAt: -1 });
delegationInvocationSchema.index(
  { delegationGrantId: 1, idempotencyKeyHash: 1 },
  { unique: true, name: 'unique_grant_invocation_idempotency' },
);

module.exports =
  mongoose.models.InterAgentDelegationInvocation ||
  mongoose.model('InterAgentDelegationInvocation', delegationInvocationSchema);
