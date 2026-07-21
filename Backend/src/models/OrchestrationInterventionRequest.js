const mongoose = require('mongoose');
const {
  FAILURE_CATEGORIES,
  INTERVENTION_STATUSES,
  INTERVENTION_TYPES,
  RECOVERY_LIMITS,
} = require('../constants/orchestrationRecovery');

const SAFE_CODE = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_HASH = /^(?:sha256|hmac-sha256):[a-f0-9]{64}$/;
const SECRET_TEXT = /(?:\bBearer\s+[A-Za-z0-9._~+/=-]{12,}|agentpass_(?:install|partner)_[A-Za-z0-9_-]+|\bauthorization\s*:\s*\S+|\b(?:api|provider|install)[_-]?key\s*[:=]\s*\S+)/i;

const orchestrationInterventionRequestSchema = new mongoose.Schema(
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
    nodeRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationNodeRun', immutable: true, index: true },
    compensationRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationCompensationRun',
      immutable: true,
      index: true,
    },
    interventionType: { type: String, enum: INTERVENTION_TYPES, required: true, immutable: true, index: true },
    status: { type: String, enum: INTERVENTION_STATUSES, required: true, default: 'pending', index: true },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      immutable: true,
      validate: (value) => !SECRET_TEXT.test(String(value || '')),
    },
    safeSummary: {
      type: String,
      required: true,
      trim: true,
      maxlength: RECOVERY_LIMITS.maximumSafeSummaryLength,
      immutable: true,
      validate: (value) => !SECRET_TEXT.test(String(value || '')),
    },
    safeFailureCode: { type: String, trim: true, match: SAFE_CODE, immutable: true },
    safeFailureCategory: { type: String, enum: FAILURE_CATEGORIES, immutable: true, index: true },
    allowedActions: {
      type: [{ type: String, enum: INTERVENTION_TYPES }],
      required: true,
      immutable: true,
      validate: {
        validator: (entries) =>
          entries.length > 0 &&
          entries.length <= INTERVENTION_TYPES.length &&
          new Set(entries).size === entries.length,
        message: 'allowedActions must contain unique bounded intervention actions',
      },
    },
    requiredPermission: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    requiredApprovalType: { type: String, trim: true, maxlength: 128, immutable: true },
    assignedRoleIds: {
      type: [{ type: String, trim: true, maxlength: 128 }],
      default: [],
      immutable: true,
      validate: (entries) =>
        entries.length <= RECOVERY_LIMITS.maximumAssignedPrincipals &&
        new Set(entries).size === entries.length,
    },
    assignedUserIds: {
      type: [{ type: String, trim: true, maxlength: 128 }],
      default: [],
      immutable: true,
      validate: (entries) =>
        entries.length <= RECOVERY_LIMITS.maximumAssignedPrincipals &&
        new Set(entries).size === entries.length,
    },
    expiresAt: { type: Date, required: true, immutable: true, index: true },
    resolvedBy: { type: String, trim: true, maxlength: 128 },
    resolvedAt: { type: Date },
    resolutionAction: { type: String, enum: INTERVENTION_TYPES },
    safeResolutionReason: {
      type: String,
      trim: true,
      maxlength: RECOVERY_LIMITS.maximumSafeReasonLength,
      validate: (value) => !SECRET_TEXT.test(String(value || '')),
    },
    approvalRequestId: { type: String, trim: true, maxlength: 128, index: true },
    recoveryDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRecoveryDecision',
      index: true,
    },
    idempotencyKeyHash: { type: String, trim: true, match: SAFE_HASH, immutable: true, select: false },
    requestId: { type: String, required: true, trim: true, maxlength: 128, immutable: true, index: true },
    traceId: { type: String, required: true, trim: true, maxlength: 128, immutable: true, index: true },
    rejectedAt: { type: Date },
    expiredAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationInterventionRequestSchema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 });
orchestrationInterventionRequestSchema.index({ orchestrationRunId: 1, nodeRunId: 1, createdAt: -1 });
orchestrationInterventionRequestSchema.index({ status: 1, expiresAt: 1 });
orchestrationInterventionRequestSchema.index({ organizationId: 1, workspaceId: 1, assignedUserIds: 1, status: 1 });
orchestrationInterventionRequestSchema.index({ organizationId: 1, workspaceId: 1, assignedRoleIds: 1, status: 1 });
orchestrationInterventionRequestSchema.index({ approvalRequestId: 1, status: 1 });
orchestrationInterventionRequestSchema.index(
  { organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } },
    name: 'unique_tenant_intervention_idempotency',
  },
);

module.exports =
  mongoose.models.OrchestrationInterventionRequest ||
  mongoose.model('OrchestrationInterventionRequest', orchestrationInterventionRequestSchema);
