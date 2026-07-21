const mongoose = require('mongoose');
const { DATA_CLASSIFICATIONS } = require('../constants/interAgentDelegation');
const {
  COMPENSATION_RUN_STATUSES,
  FAILURE_CATEGORIES,
  RECOVERY_LIMITS,
} = require('../constants/orchestrationRecovery');

const SAFE_CODE = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_HASH = /^(?:sha256|hmac-sha256):[a-f0-9]{64}$/;
const SECRET_TEXT = /(?:\bBearer\s+[A-Za-z0-9._~+/=-]{12,}|agentpass_(?:install|partner)_[A-Za-z0-9_-]+|\bauthorization\s*:\s*\S+|\b(?:api|provider|install)[_-]?key\s*[:=]\s*\S+)/i;

const orchestrationCompensationRunSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, immutable: true, index: true },
    workspaceId: { type: String, required: true, trim: true, immutable: true, index: true },
    orchestrationRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRun',
      required: true,
      immutable: true,
      index: true,
    },
    compensationPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationCompensationPlan',
      required: true,
      immutable: true,
      index: true,
    },
    compensationStepOrdinal: { type: Number, required: true, min: 1, immutable: true },
    originalNodeRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationNodeRun',
      required: true,
      immutable: true,
      index: true,
    },
    recoveryDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRecoveryDecision',
      immutable: true,
      index: true,
    },
    compensationDefinitionSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      immutable: true,
      select: false,
    },
    compensationDefinitionHash: { type: String, required: true, trim: true, match: SAFE_HASH, immutable: true },
    compensationDefinitionVersion: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    compensationConnectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassportConnection',
      required: true,
      immutable: true,
      index: true,
    },
    compensationPassportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentPassport',
      required: true,
      immutable: true,
    },
    compensationPassportVersion: { type: String, required: true, trim: true, maxlength: 100, immutable: true },
    compensationCapability: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    compensationOperation: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    dataContractId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDataContract', immutable: true },
    dataContractVersion: { type: Number, min: 1, immutable: true },
    delegationGrantId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDelegationGrant', index: true },
    status: {
      type: String,
      enum: COMPENSATION_RUN_STATUSES,
      required: true,
      default: 'pending',
      index: true,
    },
    attempt: { type: Number, required: true, default: 0, min: 0 },
    logicalCompensationAttempt: { type: Number, required: true, default: 1, min: 1, immutable: true },
    maximumAttempts: {
      type: Number,
      required: true,
      min: 1,
      max: RECOVERY_LIMITS.maximumCompensationAttempts,
      immutable: true,
    },
    nextAttemptAt: { type: Date, index: true },
    deadlineAt: { type: Date, required: true, immutable: true, index: true },
    inputClassification: { type: String, enum: DATA_CLASSIFICATIONS, required: true, immutable: true },
    outputClassification: { type: String, enum: DATA_CLASSIFICATIONS, immutable: true },
    inputSchemaHash: { type: String, required: true, trim: true, match: SAFE_HASH, immutable: true },
    outputSchemaHash: { type: String, required: true, trim: true, match: SAFE_HASH, immutable: true },
    inputPayloadHash: { type: String, trim: true, match: SAFE_HASH, immutable: true, select: false },
    outputPayloadHash: { type: String, trim: true, match: SAFE_HASH, select: false },
    approximateInputBytes: { type: Number, min: 0, immutable: true },
    approximateOutputBytes: { type: Number, min: 0 },
    idempotencyKeyHash: {
      type: String,
      required: true,
      trim: true,
      match: SAFE_HASH,
      immutable: true,
      select: false,
    },
    remoteIdempotencyKeyHash: { type: String, trim: true, match: SAFE_HASH, immutable: true, select: false },
    invocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invocation', index: true },
    approvalRequestId: { type: String, trim: true, maxlength: 128, index: true },
    interventionRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationInterventionRequest',
      index: true,
    },
    leaseOwner: { type: String, trim: true, maxlength: 128, select: false },
    leaseTokenHash: { type: String, trim: true, match: SAFE_HASH, select: false },
    leaseExpiresAt: { type: Date, index: true },
    heartbeatAt: { type: Date },
    requestId: { type: String, required: true, trim: true, maxlength: 128, immutable: true, index: true },
    traceId: { type: String, required: true, trim: true, maxlength: 128, immutable: true, index: true },
    parentTraceId: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    safeFailureCode: { type: String, trim: true, match: SAFE_CODE },
    safeFailureMessage: {
      type: String,
      trim: true,
      maxlength: RECOVERY_LIMITS.maximumSafeReasonLength,
      validate: (value) => !SECRET_TEXT.test(String(value || '')),
    },
    safeFailureCategory: { type: String, enum: FAILURE_CATEGORIES },
    retryability: { type: Boolean, default: false },
    outcomeUnknown: { type: Boolean, default: false },
    startedAt: { type: Date },
    completedAt: { type: Date },
    createdBy: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationCompensationRunSchema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 });
orchestrationCompensationRunSchema.index({ orchestrationRunId: 1, status: 1, createdAt: -1 });
orchestrationCompensationRunSchema.index({ originalNodeRunId: 1, status: 1, createdAt: -1 });
orchestrationCompensationRunSchema.index({ status: 1, leaseExpiresAt: 1 });
orchestrationCompensationRunSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
orchestrationCompensationRunSchema.index({ requestId: 1, createdAt: -1 });
orchestrationCompensationRunSchema.index({ traceId: 1, createdAt: -1 });
orchestrationCompensationRunSchema.index(
  { compensationPlanId: 1, compensationStepOrdinal: 1 },
  { unique: true, name: 'unique_compensation_plan_step' },
);
orchestrationCompensationRunSchema.index(
  { organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 },
  { unique: true, name: 'unique_tenant_compensation_idempotency' },
);

module.exports =
  mongoose.models.OrchestrationCompensationRun ||
  mongoose.model('OrchestrationCompensationRun', orchestrationCompensationRunSchema);
