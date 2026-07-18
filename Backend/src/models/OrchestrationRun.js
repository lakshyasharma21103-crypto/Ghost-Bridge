const mongoose = require('mongoose');
const {
  ORCHESTRATION_LIMITS,
  ORCHESTRATION_RUN_STATUSES,
} = require('../constants/orchestration');

const safeFailureSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true, maxlength: 128 },
    message: { type: String, trim: true, maxlength: 500 },
    category: { type: String, trim: true, maxlength: 64 },
    requestId: { type: String, trim: true, maxlength: 128 },
    traceId: { type: String, trim: true, maxlength: 128 },
    occurredAt: { type: Date },
  },
  { _id: false, strict: 'throw' },
);

const orchestrationRunSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    definitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationDefinition',
      required: true,
      index: true,
    },
    definitionName: { type: String, required: true, trim: true, maxlength: 200 },
    definitionVersion: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ORCHESTRATION_RUN_STATUSES,
      default: 'queued',
      required: true,
      index: true,
    },
    input: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
    finalOutput: { type: mongoose.Schema.Types.Mixed, select: false },
    failureSummary: { type: safeFailureSchema },
    requestedBy: { type: String, required: true, trim: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelRequestedAt: { type: Date },
    traceId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    requestId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    idempotencyKeyHash: { type: String, required: true, trim: true, select: false },
    requestFingerprint: { type: String, required: true, trim: true, select: false },
    clientIdempotencyProvided: { type: Boolean, default: false, select: false },
    concurrencyLimit: {
      type: Number,
      required: true,
      min: 1,
      max: ORCHESTRATION_LIMITS.maximumConcurrency,
    },
    maxRunDurationMs: {
      type: Number,
      required: true,
      min: ORCHESTRATION_LIMITS.minimumRunDurationMs,
      max: ORCHESTRATION_LIMITS.maximumRunDurationMs,
    },
    maxNodeExecutions: {
      type: Number,
      required: true,
      min: 1,
      max: ORCHESTRATION_LIMITS.maximumNodeExecutions,
    },
    nodeExecutionCount: { type: Number, default: 0, min: 0 },
    activeNodeCount: { type: Number, default: 0, min: 0 },
    definitionSnapshot: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationRunSchema.index(
  { organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 },
  { unique: true, name: 'unique_tenant_orchestration_run_idempotency' },
);
orchestrationRunSchema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 });
orchestrationRunSchema.index({ definitionId: 1, definitionVersion: 1, createdAt: -1 });
orchestrationRunSchema.index({ status: 1, updatedAt: 1 });
orchestrationRunSchema.index({ traceId: 1, createdAt: -1 });
orchestrationRunSchema.index({ requestId: 1, createdAt: -1 });

module.exports =
  mongoose.models.OrchestrationRun ||
  mongoose.model('OrchestrationRun', orchestrationRunSchema);
