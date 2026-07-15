const mongoose = require('mongoose');
const {
  DURABLE_OUTBOX_EVENT_TYPES,
  DURABLE_WORK_MILESTONES,
  DURABLE_WORK_STATUSES,
} = require('../constants/durableWork');

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const safeOutboxMetadataSchema = new mongoose.Schema(
  {
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

const durableEventOutboxSchema = new mongoose.Schema(
  {
    eventKey: { type: String, required: true, match: SAFE_HASH_PATTERN, select: false },
    eventType: { type: String, enum: DURABLE_OUTBOX_EVENT_TYPES, required: true, index: true },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
      index: true,
    },
    receivingWorkspaceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    invocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invocation', required: true },
    workItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RuntimeWorkItem', required: true },
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassportConnection',
      required: true,
    },
    traceId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128 },
    safeMetadata: { type: safeOutboxMetadataSchema, default: () => ({}) },
    processedAt: { type: Date, index: true },
  },
  { timestamps: true, strict: 'throw' },
);

durableEventOutboxSchema.index(
  { eventKey: 1 },
  { unique: true, name: 'unique_durable_outbox_event' },
);
durableEventOutboxSchema.index({ processedAt: 1, createdAt: 1 });
durableEventOutboxSchema.index({ partnerId: 1, receivingWorkspaceId: 1, createdAt: -1 });
durableEventOutboxSchema.index({ invocationId: 1, createdAt: 1 });

module.exports =
  mongoose.models.DurableEventOutbox ||
  mongoose.model('DurableEventOutbox', durableEventOutboxSchema);
