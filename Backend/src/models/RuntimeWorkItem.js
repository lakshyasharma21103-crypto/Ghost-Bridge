const mongoose = require('mongoose');
const {
  DURABLE_MILESTONE_STATUSES,
  DURABLE_OUTBOX_EVENT_TYPES,
  DURABLE_RECOVERY_REASONS,
  DURABLE_WORK_MILESTONES,
  DURABLE_WORK_OPERATIONS,
  DURABLE_WORK_STATUSES,
  DURABLE_WORK_TYPES,
  MAX_DURABLE_WORK_MILESTONES,
} = require('../constants/durableWork');

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const durableMilestoneSchema = new mongoose.Schema(
  {
    name: { type: String, enum: DURABLE_WORK_MILESTONES, required: true },
    at: { type: Date, required: true },
    attemptNumber: { type: Number, required: true, min: 1 },
    safeStatus: { type: String, enum: DURABLE_MILESTONE_STATUSES, required: true },
  },
  { _id: false, strict: 'throw' },
);

const outboxRepairEventSchema = new mongoose.Schema(
  {
    eventKey: { type: String, required: true, match: SAFE_HASH_PATTERN },
    eventType: { type: String, enum: DURABLE_OUTBOX_EVENT_TYPES, required: true },
    reasonCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    recoveryReasonCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    cancellationReasonCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    workStatus: { type: String, enum: DURABLE_WORK_STATUSES },
    safeStage: { type: String, enum: DURABLE_WORK_MILESTONES },
    attemptNumber: { type: Number, min: 1 },
    executionGeneration: { type: Number, min: 1 },
    retryCount: { type: Number, min: 0 },
  },
  { _id: false, strict: 'throw' },
);

const runtimeWorkItemSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    receivingWorkspaceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    invocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invocation',
      required: true,
      index: true,
    },
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassportConnection',
      required: true,
      index: true,
    },
    credentialBindingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CredentialBinding',
      index: true,
    },
    credentialRequirement: {
      adapterId: { type: String, trim: true, maxlength: 64 },
      purpose: { type: String, trim: true, maxlength: 100 },
    },
    attemptNumber: { type: Number, required: true, min: 1 },
    workType: { type: String, enum: DURABLE_WORK_TYPES, required: true },
    dedupeKey: { type: String, required: true, match: SAFE_HASH_PATTERN, select: false },
    traceId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128 },

    status: {
      type: String,
      enum: DURABLE_WORK_STATUSES,
      default: 'pending',
      required: true,
      index: true,
    },
    priority: { type: Number, default: 0, min: -100, max: 100 },
    availableAt: { type: Date, required: true, index: true },
    claimedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },
    cancelledAt: { type: Date },
    deadLetteredAt: { type: Date },
    requeuedAt: { type: Date },
    requeueCount: { type: Number, default: 0, min: 0, max: 1 },

    leaseOwner: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, select: false },
    leaseTokenHash: { type: String, trim: true, match: SAFE_HASH_PATTERN, select: false },
    leaseAcquiredAt: { type: Date },
    leaseExpiresAt: { type: Date, index: true },
    lastHeartbeatAt: { type: Date },

    executionGeneration: { type: Number, required: true, min: 1 },
    retryCount: { type: Number, default: 0, min: 0 },
    maximumAttempts: { type: Number, required: true, min: 1, max: 20 },
    safeOperation: { type: String, enum: DURABLE_WORK_OPERATIONS, required: true },
    safeStage: { type: String, enum: DURABLE_WORK_MILESTONES },
    lastErrorCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    retryDecisionReason: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    recoveryReasonCode: { type: String, enum: DURABLE_RECOVERY_REASONS },
    milestones: {
      type: [durableMilestoneSchema],
      default: [],
      validate: {
        validator: (entries) => entries.length <= MAX_DURABLE_WORK_MILESTONES,
        message: `milestones cannot exceed ${MAX_DURABLE_WORK_MILESTONES} entries`,
      },
    },

    cancellationRequestedAt: { type: Date },
    cancellationReasonCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    outboxRepairRequiredAt: { type: Date, index: true },
    outboxRepairReasonCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    outboxRepairAttempts: { type: Number, default: 0, min: 0 },
    outboxRepairEvents: {
      type: [outboxRepairEventSchema],
      default: undefined,
      validate: {
        validator: (entries) => !entries || entries.length <= MAX_DURABLE_WORK_MILESTONES,
        message: 'outboxRepairEvents exceeds the bounded repair limit',
      },
    },
    version: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, strict: 'throw' },
);

runtimeWorkItemSchema.index({ dedupeKey: 1 }, { unique: true, name: 'unique_durable_work_dedupe' });
runtimeWorkItemSchema.index(
  {
    partnerId: 1,
    receivingWorkspaceId: 1,
    invocationId: 1,
    executionGeneration: 1,
    workType: 1,
  },
  { unique: true, name: 'unique_durable_execution_generation' },
);
runtimeWorkItemSchema.index({ status: 1, priority: -1, availableAt: 1, createdAt: 1 });
runtimeWorkItemSchema.index({ status: 1, leaseExpiresAt: 1 });
runtimeWorkItemSchema.index({ partnerId: 1, receivingWorkspaceId: 1, status: 1, createdAt: -1 });
runtimeWorkItemSchema.index({
  organizationId: 1,
  receivingWorkspaceId: 1,
  status: 1,
  createdAt: -1,
});
runtimeWorkItemSchema.index({ partnerId: 1, receivingWorkspaceId: 1, connectionId: 1, status: 1 });
runtimeWorkItemSchema.index({ invocationId: 1, status: 1, updatedAt: -1 });
runtimeWorkItemSchema.index({ credentialBindingId: 1, status: 1, availableAt: 1 });
runtimeWorkItemSchema.index({ outboxRepairRequiredAt: 1, updatedAt: 1 });

module.exports =
  mongoose.models.RuntimeWorkItem || mongoose.model('RuntimeWorkItem', runtimeWorkItemSchema);
