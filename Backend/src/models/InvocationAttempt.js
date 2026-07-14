const mongoose = require('mongoose');
const {
  INVOCATION_ATTEMPT_STATUSES,
  INVOCATION_RETRY_DECISIONS,
  SAFE_INVOCATION_ATTEMPT_STAGES,
} = require('../constants/invocationLifecycle');

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_HASH_PATTERN = /^(?:sha256|hmac-sha256):[a-f0-9]{64}$/;
const SAFE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/;
const SAFE_OPERATION_PATTERN = /^[a-z][a-z0-9_.:-]{0,127}$/;

const invocationAttemptSchema = new mongoose.Schema(
  {
    invocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invocation',
      required: true,
      index: true,
    },
    receivingWorkspaceId: { type: String, required: true, trim: true, index: true },
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassportConnection',
      required: true,
      index: true,
    },
    attemptNumber: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: INVOCATION_ATTEMPT_STATUSES,
      default: 'started',
      required: true,
      index: true,
    },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
    durationMs: { type: Number, min: 0 },
    traceId: { type: String, trim: true, maxlength: 128, index: true },
    requestId: { type: String, trim: true, maxlength: 128, index: true },
    runtimeType: { type: String, enum: ['rest', 'mcp'], required: true },
    operation: { type: String, trim: true, match: SAFE_OPERATION_PATTERN },
    safeStage: { type: String, enum: SAFE_INVOCATION_ATTEMPT_STAGES },
    errorCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    causeCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    causeName: { type: String, trim: true, match: SAFE_NAME_PATTERN },
    retryable: { type: Boolean },
    providerHttpStatus: { type: Number, min: 100, max: 599 },
    timeoutReason: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    outcomeAmbiguous: { type: Boolean, default: false },
    retryDecision: {
      type: String,
      enum: INVOCATION_RETRY_DECISIONS,
      default: 'not_evaluated',
      required: true,
    },
    retryDecisionReason: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    retryScheduledAt: { type: Date },
    idempotencyKeyHash: {
      type: String,
      trim: true,
      match: SAFE_HASH_PATTERN,
      select: false,
    },
  },
  { timestamps: true, strict: 'throw' },
);

invocationAttemptSchema.index({ invocationId: 1, attemptNumber: 1 }, { unique: true });
invocationAttemptSchema.index({ receivingWorkspaceId: 1, invocationId: 1, attemptNumber: -1 });
invocationAttemptSchema.index({ receivingWorkspaceId: 1, status: 1, createdAt: -1 });
invocationAttemptSchema.index({ receivingWorkspaceId: 1, errorCode: 1, createdAt: -1 });

module.exports =
  mongoose.models.InvocationAttempt || mongoose.model('InvocationAttempt', invocationAttemptSchema);
