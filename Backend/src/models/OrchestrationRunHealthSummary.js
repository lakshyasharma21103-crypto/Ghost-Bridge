const mongoose = require('mongoose');
const {
  RUN_HEALTH_CATEGORIES,
  SAFE_CODE_PATTERN,
} = require('../constants/orchestrationObservability');

const orchestrationRunHealthSummarySchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true, immutable: true },
    workspaceId: { type: String, required: true, trim: true, index: true, immutable: true },
    orchestrationDefinitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationDefinition', index: true },
    orchestrationRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRun', required: true, index: true, immutable: true },
    runStatus: { type: String, required: true, trim: true, maxlength: 80, index: true },
    progressPercent: { type: Number, min: 0, max: 100 },
    totalNodeCount: { type: Number, default: 0, min: 0 },
    terminalNodeCount: { type: Number, default: 0, min: 0 },
    succeededNodeCount: { type: Number, default: 0, min: 0 },
    failedNodeCount: { type: Number, default: 0, min: 0 },
    skippedNodeCount: { type: Number, default: 0, min: 0 },
    cancelledNodeCount: { type: Number, default: 0, min: 0 },
    blockedNodeCount: { type: Number, default: 0, min: 0 },
    waitingApprovalCount: { type: Number, default: 0, min: 0 },
    waitingInterventionCount: { type: Number, default: 0, min: 0 },
    activeNodeCount: { type: Number, default: 0, min: 0 },
    retryingNodeCount: { type: Number, default: 0, min: 0 },
    compensatingNodeCount: { type: Number, default: 0, min: 0 },
    compensatedNodeCount: { type: Number, default: 0, min: 0 },
    compensationFailedCount: { type: Number, default: 0, min: 0 },
    unresolvedSideEffectCount: { type: Number, default: 0, min: 0 },
    queueAgeMs: { type: Number, min: 0 },
    totalDurationMs: { type: Number, min: 0 },
    criticalPathDurationMs: { type: Number, min: 0 },
    currentCriticalNodeKey: { type: String, trim: true, maxlength: 100 },
    lastProgressAt: { type: Date, index: true },
    lastHeartbeatAt: { type: Date, index: true },
    staleSince: { type: Date, index: true },
    healthCategory: { type: String, enum: RUN_HEALTH_CATEGORIES, required: true, index: true },
    safeHealthReasons: [{ type: String, trim: true, match: SAFE_CODE_PATTERN }],
    snapshotAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true, strict: 'throw' },
);

orchestrationRunHealthSummarySchema.index(
  { organizationId: 1, workspaceId: 1, orchestrationRunId: 1 },
  { unique: true, name: 'unique_tenant_run_health_summary' },
);
orchestrationRunHealthSummarySchema.index({ organizationId: 1, workspaceId: 1, healthCategory: 1, snapshotAt: -1 });
orchestrationRunHealthSummarySchema.index({ organizationId: 1, workspaceId: 1, runStatus: 1, snapshotAt: -1 });

module.exports =
  mongoose.models.OrchestrationRunHealthSummary ||
  mongoose.model('OrchestrationRunHealthSummary', orchestrationRunHealthSummarySchema);
