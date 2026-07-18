const mongoose = require('mongoose');
const { ORCHESTRATION_NODE_STATUSES } = require('../constants/orchestration');

const safeFailureSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, maxlength: 128 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    httpStatusCategory: { type: String, trim: true, maxlength: 32 },
    timeoutCategory: { type: String, trim: true, maxlength: 64 },
    retryable: { type: Boolean, required: true, default: false },
    requestId: { type: String, trim: true, maxlength: 128 },
    traceId: { type: String, trim: true, maxlength: 128 },
    attempt: { type: Number, min: 0 },
    occurredAt: { type: Date, required: true },
  },
  { _id: false, strict: 'throw' },
);

const orchestrationNodeRunSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    orchestrationRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRun',
      required: true,
      index: true,
    },
    nodeKey: { type: String, required: true, trim: true, maxlength: 100 },
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassportConnection',
      required: true,
      index: true,
    },
    passportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport', required: true },
    passportVersion: { type: String, required: true, trim: true, maxlength: 100 },
    capability: { type: String, required: true, trim: true, maxlength: 200 },
    operation: { type: String, required: true, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: ORCHESTRATION_NODE_STATUSES,
      required: true,
      default: 'blocked',
      index: true,
    },
    dependencyNodeKeys: [{ type: String, trim: true, maxlength: 100 }],
    resolvedInput: { type: mongoose.Schema.Types.Mixed, select: false },
    validatedOutput: { type: mongoose.Schema.Types.Mixed, select: false },
    safeFailure: { type: safeFailureSchema },
    continueOnFailure: { type: Boolean, default: false },
    attempt: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, required: true, min: 1, max: 5 },
    nextAttemptAt: { type: Date, index: true },
    timeoutMs: { type: Number, required: true, min: 100, max: 1_800_000 },
    leaseOwner: { type: String, trim: true, maxlength: 128, index: true },
    leaseToken: { type: String, trim: true, maxlength: 128, select: false },
    leaseExpiresAt: { type: Date, index: true },
    heartbeatAt: { type: Date },
    resumeAttempt: { type: Boolean, default: false, select: false },
    operationallyBlocked: { type: Boolean, default: false, select: false },
    operationalBlockReasonCode: { type: String, trim: true, maxlength: 128, select: false },
    operationalResumeStatus: { type: String, enum: ['ready', 'retry_wait'], select: false },
    invocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invocation', index: true },
    requestId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    traceId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    parentTraceId: { type: String, required: true, trim: true, maxlength: 128 },
    approvalRequestId: { type: String, trim: true, maxlength: 128, index: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationNodeRunSchema.index(
  { orchestrationRunId: 1, nodeKey: 1 },
  { unique: true, name: 'unique_orchestration_run_node' },
);
orchestrationNodeRunSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
orchestrationNodeRunSchema.index({ status: 1, leaseExpiresAt: 1 });
orchestrationNodeRunSchema.index({ orchestrationRunId: 1, status: 1, nodeKey: 1 });
orchestrationNodeRunSchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
orchestrationNodeRunSchema.index({ approvalRequestId: 1, status: 1 });

module.exports =
  mongoose.models.OrchestrationNodeRun ||
  mongoose.model('OrchestrationNodeRun', orchestrationNodeRunSchema);
