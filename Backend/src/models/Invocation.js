const mongoose = require('mongoose');
const { OPERATION_STAGE_NAMES, MAX_INVOCATION_STAGE_METRICS } = require('../constants/operations');
const {
  INVOCATION_CANCELLATION_OUTCOMES,
  INVOCATION_CANCELLATION_STATES,
  INVOCATION_CANCEL_REASON_CODES,
  INVOCATION_PROGRESS_STAGES,
  INVOCATION_RECOVERY_DECISIONS,
  INVOCATION_RECOVERY_STATES,
  INVOCATION_RETRY_STATES,
  INVOCATION_STATES,
  INVOCATION_STUCK_CLASSIFICATIONS,
  LEGACY_STATUS_TO_LIFECYCLE_STATE,
  LIFECYCLE_TIMESTAMP_FIELDS,
  MAX_INVOCATION_STATE_HISTORY,
} = require('../constants/invocationLifecycle');

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_HASH_PATTERN = /^(?:sha256|hmac-sha256):[a-f0-9]{64}$/;
const SAFE_OWNER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const invocationStageMetricSchema = new mongoose.Schema(
  {
    stage: { type: String, enum: OPERATION_STAGE_NAMES, required: true },
    durationMs: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['completed', 'failed'], required: true },
  },
  { _id: false },
);

const invocationStateHistorySchema = new mongoose.Schema(
  {
    fromState: { type: String, enum: INVOCATION_STATES, default: null },
    toState: { type: String, enum: INVOCATION_STATES, required: true },
    at: { type: Date, required: true },
    reasonCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    attemptNumber: { type: Number, min: 1 },
    traceId: { type: String, trim: true, maxlength: 128 },
    requestId: { type: String, trim: true, maxlength: 128 },
  },
  { _id: false, strict: 'throw' },
);

const invocationLifecycleTimestampsSchema = new mongoose.Schema(
  Object.fromEntries(
    Object.values(LIFECYCLE_TIMESTAMP_FIELDS).map((field) => [field, { type: Date }]),
  ),
  { _id: false, strict: 'throw' },
);

const encryptedExecutionPayloadSchema = new mongoose.Schema(
  {
    algorithm: { type: String, enum: ['aes-256-gcm'], required: true },
    iv: { type: String, required: true, maxlength: 64 },
    tag: { type: String, required: true, maxlength: 64 },
    ciphertext: { type: String, required: true, maxlength: 2_000_000 },
  },
  { _id: false, strict: 'throw' },
);

const authorizationEvidenceSchema = new mongoose.Schema(
  {
    permission: { type: String, required: true, trim: true, maxlength: 200 },
    actorType: { type: String, required: true, trim: true, maxlength: 64 },
    actorId: { type: String, required: true, trim: true, maxlength: 128 },
    organizationId: { type: String, trim: true, maxlength: 128 },
    workspaceId: { type: String, trim: true, maxlength: 256 },
    roleKeys: { type: [String], default: undefined },
    decision: { type: String, enum: ['ALLOW', 'DENY'], required: true },
    reasonCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    policySnapshotRevision: { type: Number, min: 0 },
    evaluatedAt: { type: Date, required: true },
  },
  { _id: false, strict: 'throw' },
);

const invocationSchema = new mongoose.Schema(
  {
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassportConnection',
      required: true,
      index: true,
    },
    passportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentPassport',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      index: true,
    },
    receivingWorkspaceId: { type: String, required: true, trim: true, index: true },
    capability: { type: String, required: true, trim: true, index: true },
    inputSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    executionPayload: {
      type: encryptedExecutionPayloadSchema,
      select: false,
    },
    protectedReplayAvailable: { type: Boolean, default: false },
    authorizationEvidence: { type: authorizationEvidenceSchema },
    credentialBindingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CredentialBinding',
      index: true,
    },
    credentialRequirement: {
      adapterId: { type: String, trim: true, maxlength: 64 },
      purpose: { type: String, trim: true, maxlength: 100 },
    },
    executionGeneration: { type: Number, default: 1, min: 1 },
    currentWorkItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RuntimeWorkItem',
      index: true,
    },
    output: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    lifecycleState: {
      type: String,
      enum: INVOCATION_STATES,
      default() {
        return LEGACY_STATUS_TO_LIFECYCLE_STATE[this.status] || 'accepted';
      },
      required: true,
      index: true,
    },
    lifecycleTimestamps: { type: invocationLifecycleTimestampsSchema, default: () => ({}) },
    stateHistory: {
      type: [invocationStateHistorySchema],
      default: [],
      validate: {
        validator: (entries) => entries.length <= MAX_INVOCATION_STATE_HISTORY,
        message: `stateHistory cannot exceed ${MAX_INVOCATION_STATE_HISTORY} entries`,
      },
    },
    lastTransitionAt: { type: Date },
    terminalAt: { type: Date },
    terminalizedAt: { type: Date },
    cancellationState: {
      type: String,
      enum: INVOCATION_CANCELLATION_STATES,
      default: 'not_requested',
      required: true,
      index: true,
    },
    cancelRequestedAt: { type: Date },
    cancelRequestedBy: { type: String, trim: true, maxlength: 128 },
    cancelReasonCode: { type: String, enum: INVOCATION_CANCEL_REASON_CODES },
    cancellationConfirmedAt: { type: Date },
    cancellationOutcome: {
      type: String,
      enum: INVOCATION_CANCELLATION_OUTCOMES,
      default: 'not_applicable',
      required: true,
    },
    cancellationRequestId: { type: String, trim: true, maxlength: 128 },
    cancellationTraceId: { type: String, trim: true, maxlength: 128 },
    recoveryState: {
      type: String,
      enum: INVOCATION_RECOVERY_STATES,
      default: 'not_required',
      required: true,
      index: true,
    },
    recoveryReasonCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    recoveryEligible: { type: Boolean, default: false, index: true },
    recoveryDecision: {
      type: String,
      enum: INVOCATION_RECOVERY_DECISIONS,
      default: 'not_evaluated',
      required: true,
    },
    recoveryDecisionReason: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    recoveryRequestedAt: { type: Date },
    recoveryRequestedBy: { type: String, trim: true, maxlength: 128 },
    recoveryCompletedAt: { type: Date },
    recoveryClaimId: {
      type: String,
      trim: true,
      match: SAFE_OWNER_PATTERN,
      select: false,
    },
    recoveryClaimExpiresAt: { type: Date, index: true },
    recoveryRetrySequence: { type: Number, default: 0, min: 0 },
    recoveryParentInvocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invocation',
      index: true,
    },
    recoveryChildInvocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invocation',
    },
    stuckDetectedAt: { type: Date, index: true },
    stuckClassification: {
      type: String,
      enum: INVOCATION_STUCK_CLASSIFICATIONS,
      default: 'not_stuck',
      required: true,
      index: true,
    },
    lastProgressAt: { type: Date, index: true },
    lastProgressStage: { type: String, enum: INVOCATION_PROGRESS_STAGES },
    runtimeDeadlineAt: { type: Date, index: true },
    attemptCount: { type: Number, default: 0, min: 0 },
    retryState: {
      type: String,
      enum: INVOCATION_RETRY_STATES,
      default: 'not_evaluated',
      index: true,
    },
    retryDecisionReason: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    retryScheduledAt: { type: Date },
    idempotencyScope: { type: String, trim: true, maxlength: 200, select: false },
    idempotencyKeyHash: {
      type: String,
      trim: true,
      match: SAFE_HASH_PATTERN,
      select: false,
    },
    requestFingerprint: {
      type: String,
      trim: true,
      match: SAFE_HASH_PATTERN,
      select: false,
    },
    clientIdempotencyProvided: { type: Boolean, default: false },
    executionLeaseId: {
      type: String,
      trim: true,
      match: SAFE_OWNER_PATTERN,
      select: false,
    },
    executionLeaseExpiresAt: { type: Date, index: true, select: false },
    executionOwner: {
      type: String,
      trim: true,
      match: SAFE_OWNER_PATTERN,
      select: false,
    },
    error: { type: mongoose.Schema.Types.Mixed },
    durationMs: { type: Number },
    runtimeStatus: { type: Number, min: 100, max: 599 },
    runtimeType: { type: String, enum: ['rest', 'mcp'], required: true },
    traceId: { type: String, trim: true, index: true },
    requestId: { type: String, trim: true, index: true },
    stageMetrics: {
      type: [invocationStageMetricSchema],
      default: [],
      validate: {
        validator: (metrics) => metrics.length <= MAX_INVOCATION_STAGE_METRICS,
        message: `stageMetrics cannot exceed ${MAX_INVOCATION_STAGE_METRICS} entries`,
      },
    },
  },
  { timestamps: true },
);

invocationSchema.index({ connectionId: 1, createdAt: -1 });
invocationSchema.index({ partnerId: 1, receivingWorkspaceId: 1, createdAt: -1 });
invocationSchema.index({ organizationId: 1, receivingWorkspaceId: 1, createdAt: -1 });
invocationSchema.index({ passportId: 1, createdAt: -1 });
invocationSchema.index({ receivingWorkspaceId: 1, createdAt: -1 });
invocationSchema.index({ receivingWorkspaceId: 1, status: 1, createdAt: -1 });
invocationSchema.index({ receivingWorkspaceId: 1, lifecycleState: 1, createdAt: -1 });
invocationSchema.index({ receivingWorkspaceId: 1, retryState: 1, createdAt: -1 });
invocationSchema.index({ receivingWorkspaceId: 1, cancellationState: 1, createdAt: -1 });
invocationSchema.index({ receivingWorkspaceId: 1, recoveryState: 1, updatedAt: -1 });
invocationSchema.index({ receivingWorkspaceId: 1, recoveryEligible: 1, updatedAt: -1 });
invocationSchema.index({ receivingWorkspaceId: 1, recoveryState: 1, recoveryClaimExpiresAt: 1 });
invocationSchema.index({ receivingWorkspaceId: 1, lifecycleState: 1, lastProgressAt: 1 });
invocationSchema.index({ receivingWorkspaceId: 1, lifecycleState: 1, runtimeDeadlineAt: 1 });
invocationSchema.index({ lifecycleState: 1, executionLeaseExpiresAt: 1 });
invocationSchema.index(
  { receivingWorkspaceId: 1, idempotencyScope: 1, idempotencyKeyHash: 1 },
  {
    unique: true,
    name: 'unique_workspace_invocation_idempotency',
    partialFilterExpression: {
      idempotencyScope: { $type: 'string' },
      idempotencyKeyHash: { $type: 'string' },
    },
  },
);

invocationSchema.pre('validate', function initializeLifecycleHistory(next) {
  if (!this.isNew || this.stateHistory.length > 0) {
    next();
    return;
  }

  const at = this.lastTransitionAt || new Date();
  this.lastTransitionAt = at;
  const timestampField = LIFECYCLE_TIMESTAMP_FIELDS[this.lifecycleState];
  if (timestampField && !this.lifecycleTimestamps?.[timestampField]) {
    this.lifecycleTimestamps[timestampField] = at;
  }
  this.stateHistory.push({
    fromState: null,
    toState: this.lifecycleState,
    at,
    reasonCode: 'INVOCATION_CREATED',
    traceId: this.traceId,
    requestId: this.requestId,
  });
  next();
});

module.exports = mongoose.models.Invocation || mongoose.model('Invocation', invocationSchema);
