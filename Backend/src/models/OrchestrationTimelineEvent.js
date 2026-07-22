const mongoose = require('mongoose');
const {
  SAFE_CODE_PATTERN,
  SAFE_IDENTIFIER_PATTERN,
  TIMELINE_EVENT_CATEGORIES,
} = require('../constants/orchestrationObservability');

const orchestrationTimelineEventSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true, immutable: true },
    workspaceId: { type: String, required: true, trim: true, index: true, immutable: true },
    orchestrationDefinitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationDefinition', index: true },
    orchestrationRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRun', required: true, index: true },
    nodeRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationNodeRun', index: true },
    compensationRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationCompensationRun', index: true },
    recoveryDecisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRecoveryDecision', index: true },
    interventionRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationInterventionRequest', index: true },
    approvalRequestId: { type: String, trim: true, maxlength: 128, index: true },
    delegationGrantId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDelegationGrant', index: true },
    delegationInvocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDelegationInvocation', index: true },
    selectionDecisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentSelectionDecision', index: true },
    checkpointId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationCheckpoint', index: true },
    incidentId: { type: String, trim: true, maxlength: 128, index: true },
    eventType: { type: String, required: true, trim: true, maxlength: 160, index: true },
    eventCategory: { type: String, enum: TIMELINE_EVENT_CATEGORIES, required: true, index: true },
    safeStatus: { type: String, trim: true, maxlength: 80 },
    safeReasonCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    safeSummary: { type: String, trim: true, maxlength: 1000 },
    actorType: { type: String, enum: ['partner', 'user', 'system', 'service_account', 'unknown'], default: 'unknown' },
    actorId: { type: String, trim: true, maxlength: 128 },
    traceId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128, index: true },
    requestId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128, index: true },
    parentTraceId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128 },
    sequence: { type: Number, required: true, min: 0, index: true },
    occurredAt: { type: Date, required: true, index: true },
    ingestedAt: { type: Date, required: true, default: Date.now },
    sourceCollection: { type: String, required: true, trim: true, maxlength: 128 },
    sourceRecordId: { type: String, required: true, trim: true, maxlength: 160 },
    sourceVersion: { type: String, trim: true, maxlength: 128 },
  },
  { timestamps: false, strict: 'throw' },
);

orchestrationTimelineEventSchema.index({ organizationId: 1, workspaceId: 1, orchestrationRunId: 1, occurredAt: 1, sequence: 1 });
orchestrationTimelineEventSchema.index({ organizationId: 1, workspaceId: 1, traceId: 1, occurredAt: 1 });
orchestrationTimelineEventSchema.index({ orchestrationRunId: 1, nodeRunId: 1, occurredAt: 1 });
orchestrationTimelineEventSchema.index({ organizationId: 1, workspaceId: 1, eventCategory: 1, occurredAt: -1 });
orchestrationTimelineEventSchema.index(
  { organizationId: 1, workspaceId: 1, orchestrationRunId: 1, sourceCollection: 1, sourceRecordId: 1, eventType: 1 },
  { unique: true, name: 'unique_tenant_timeline_source_event' },
);

module.exports =
  mongoose.models.OrchestrationTimelineEvent ||
  mongoose.model('OrchestrationTimelineEvent', orchestrationTimelineEventSchema);
