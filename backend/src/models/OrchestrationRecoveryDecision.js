const mongoose = require('mongoose');
const {
  RECOVERY_DECISION_STATUSES,
  RECOVERY_DECISION_TYPES,
  RECOVERY_LIMITS,
} = require('../constants/orchestrationRecovery');

const SAFE_CODE = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_HASH = /^(?:sha256|hmac-sha256):[a-f0-9]{64}$/;
const SAFE_METADATA_KEY = /^[A-Za-z][A-Za-z0-9_-]{0,127}$/;
const PRIVATE_METADATA_KEY = /^(?:authorization|headers?|api[_-]?key|access[_-]?token|credentials?|provider[_-]?key|install[_-]?key|runtime[_-]?credential|encrypted[_-]?delegated[_-]?credential|delegation[_-]?reference|system[_-]?prompt|chain[_-]?of[_-]?thought|hidden[_-]?reasoning|private[_-]?memory|input|output|payload|raw[_-]?payload|context|snapshot)$/i;
const SECRET_TEXT = /(?:\bBearer\s+[A-Za-z0-9._~+/=-]{12,}|agentpass_(?:install|partner)_[A-Za-z0-9_-]+|\bauthorization\s*:\s*\S+|\b(?:api|provider|install)[_-]?key\s*[:=]\s*\S+)/i;

function safeChangeMetadata(value, depth = 0, state = { entries: 0 }) {
  if (depth > 6 || state.entries > 200) return false;
  if (value == null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') {
    return value.length <= 1_000 && !/(?:bearer\s+\S+|agentpass_(?:install|partner)_)/i.test(value);
  }
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) {
    if (value.length > 200) return false;
    return value.every((item) => safeChangeMetadata(item, depth + 1, state));
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    return false;
  }
  for (const [key, child] of Object.entries(value)) {
    state.entries += 1;
    if (
      state.entries > 200 ||
      !SAFE_METADATA_KEY.test(key) ||
      PRIVATE_METADATA_KEY.test(key) ||
      !safeChangeMetadata(child, depth + 1, state)
    ) {
      return false;
    }
  }
  return true;
}

const orchestrationRecoveryDecisionSchema = new mongoose.Schema(
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
    nodeRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationNodeRun',
      immutable: true,
      index: true,
    },
    compensationRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationCompensationRun',
      immutable: true,
      index: true,
    },
    decisionType: {
      type: String,
      enum: RECOVERY_DECISION_TYPES,
      required: true,
      immutable: true,
      index: true,
    },
    decisionStatus: {
      type: String,
      enum: RECOVERY_DECISION_STATUSES,
      required: true,
      default: 'pending',
      index: true,
    },
    requestedBy: { type: String, required: true, trim: true, immutable: true, maxlength: 128 },
    requestedAt: { type: Date, required: true, default: Date.now, immutable: true },
    approvedBy: { type: String, trim: true, maxlength: 128 },
    approvedAt: { type: Date },
    approvalRequestId: { type: String, trim: true, maxlength: 128, index: true },
    safeReasonCode: { type: String, required: true, trim: true, match: SAFE_CODE, immutable: true },
    safeReasonMessage: {
      type: String,
      trim: true,
      maxlength: RECOVERY_LIMITS.maximumSafeReasonLength,
      immutable: true,
      validate: (value) => !SECRET_TEXT.test(String(value || '')),
    },
    policyDecisionCategory: { type: String, trim: true, maxlength: 64, immutable: true },
    recoveryPolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRecoveryPolicy',
      immutable: true,
    },
    recoveryPolicyVersion: { type: Number, min: 1, immutable: true },
    previousState: { type: String, required: true, trim: true, maxlength: 64, immutable: true },
    requestedState: { type: String, trim: true, maxlength: 64, immutable: true },
    resultingState: { type: String, trim: true, maxlength: 64 },
    idempotencyKeyHash: {
      type: String,
      required: true,
      trim: true,
      match: SAFE_HASH,
      immutable: true,
      select: false,
    },
    requestFingerprint: {
      type: String,
      required: true,
      trim: true,
      match: SAFE_HASH,
      immutable: true,
      select: false,
    },
    requestId: { type: String, required: true, trim: true, maxlength: 128, immutable: true, index: true },
    traceId: { type: String, required: true, trim: true, maxlength: 128, immutable: true, index: true },
    safeChangeSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      immutable: true,
      validate: {
        validator: (value) => {
          try {
            return (
              Buffer.byteLength(JSON.stringify(value), 'utf8') <= 20_000 &&
              safeChangeMetadata(value)
            );
          } catch {
            return false;
          }
        },
        message: 'safeChangeSummary must contain bounded public recovery metadata only',
      },
    },
    replacementSelectionDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentSelectionDecision',
      index: true,
    },
    correctedInputId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationCorrectedInput',
      index: true,
    },
    correctedInputSchemaHash: { type: String, trim: true, match: SAFE_HASH },
    appliedAt: { type: Date },
    failedAt: { type: Date },
    expiredAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' },
);

orchestrationRecoveryDecisionSchema.index({ organizationId: 1, workspaceId: 1, createdAt: -1, _id: -1 });
orchestrationRecoveryDecisionSchema.index({ orchestrationRunId: 1, nodeRunId: 1, createdAt: -1 });
orchestrationRecoveryDecisionSchema.index({ organizationId: 1, workspaceId: 1, decisionStatus: 1, createdAt: -1 });
orchestrationRecoveryDecisionSchema.index({ organizationId: 1, workspaceId: 1, decisionType: 1, createdAt: -1 });
orchestrationRecoveryDecisionSchema.index({ approvalRequestId: 1, decisionStatus: 1 });
orchestrationRecoveryDecisionSchema.index(
  { organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 },
  { unique: true, name: 'unique_tenant_recovery_decision_idempotency' },
);

module.exports =
  mongoose.models.OrchestrationRecoveryDecision ||
  mongoose.model('OrchestrationRecoveryDecision', orchestrationRecoveryDecisionSchema);
