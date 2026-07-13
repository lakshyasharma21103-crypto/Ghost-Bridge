const mongoose = require('mongoose');
const { OPERATION_STAGE_NAMES, MAX_INVOCATION_STAGE_METRICS } = require('../constants/operations');

const invocationStageMetricSchema = new mongoose.Schema(
  {
    stage: { type: String, enum: OPERATION_STAGE_NAMES, required: true },
    durationMs: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['completed', 'failed'], required: true },
  },
  { _id: false },
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
    receivingWorkspaceId: { type: String, required: true, trim: true, index: true },
    capability: { type: String, required: true, trim: true, index: true },
    inputSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    output: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    error: { type: mongoose.Schema.Types.Mixed },
    durationMs: { type: Number },
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
invocationSchema.index({ passportId: 1, createdAt: -1 });
invocationSchema.index({ receivingWorkspaceId: 1, createdAt: -1 });
invocationSchema.index({ receivingWorkspaceId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.Invocation || mongoose.model('Invocation', invocationSchema);
