const mongoose = require('mongoose');
const {
  SAFE_CODE_PATTERN,
  SAFE_IDENTIFIER_PATTERN,
  TRACE_SPAN_TYPES,
} = require('../constants/orchestrationObservability');

const orchestrationTraceSpanSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true, immutable: true },
    workspaceId: { type: String, required: true, trim: true, index: true, immutable: true },
    traceId: { type: String, required: true, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128, index: true },
    spanId: { type: String, required: true, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128 },
    parentSpanId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128, index: true },
    orchestrationRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRun', required: true, index: true },
    nodeRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationNodeRun', index: true },
    invocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invocation', index: true },
    approvalRequestId: { type: String, trim: true, maxlength: 128, index: true },
    compensationRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationCompensationRun', index: true },
    recoveryDecisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRecoveryDecision', index: true },
    delegationInvocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDelegationInvocation', index: true },
    selectionDecisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentSelectionDecision', index: true },
    spanType: { type: String, enum: TRACE_SPAN_TYPES, required: true, index: true },
    operation: { type: String, required: true, trim: true, maxlength: 200 },
    status: { type: String, trim: true, maxlength: 80, index: true },
    safeErrorCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    startedAt: { type: Date, required: true, index: true },
    completedAt: { type: Date },
    durationMs: { type: Number, min: 0 },
    attempt: { type: Number, min: 0 },
    queueWaitMs: { type: Number, min: 0 },
    executionMs: { type: Number, min: 0 },
    providerCategory: { type: String, trim: true, maxlength: 80 },
    capability: { type: String, trim: true, maxlength: 200 },
    orchestrationNodeKey: { type: String, trim: true, maxlength: 100 },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false, strict: 'throw' },
);

orchestrationTraceSpanSchema.index(
  { organizationId: 1, workspaceId: 1, traceId: 1, spanId: 1 },
  { unique: true, name: 'unique_tenant_trace_span' },
);
orchestrationTraceSpanSchema.index({ organizationId: 1, workspaceId: 1, traceId: 1, startedAt: 1 });
orchestrationTraceSpanSchema.index({ traceId: 1, parentSpanId: 1 });
orchestrationTraceSpanSchema.index({ orchestrationRunId: 1, nodeRunId: 1, spanType: 1 });
orchestrationTraceSpanSchema.index({ organizationId: 1, workspaceId: 1, status: 1, startedAt: -1 });
orchestrationTraceSpanSchema.index({ startedAt: -1 });

module.exports =
  mongoose.models.OrchestrationTraceSpan ||
  mongoose.model('OrchestrationTraceSpan', orchestrationTraceSpanSchema);
