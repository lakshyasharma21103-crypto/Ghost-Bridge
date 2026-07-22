const mongoose = require('mongoose');
const {
  ALERT_SEVERITIES,
  ALERT_SIGNAL_TYPES,
  ALERT_STATUSES,
  SAFE_CODE_PATTERN,
  SAFE_IDENTIFIER_PATTERN,
} = require('../constants/orchestrationObservability');

const orchestrationAlertSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true, immutable: true },
    workspaceId: { type: String, required: true, trim: true, index: true, immutable: true },
    alertRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationAlertRule', required: true, index: true },
    alertRuleVersion: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ALERT_STATUSES, default: 'open', required: true, index: true },
    severity: { type: String, enum: ALERT_SEVERITIES, required: true, index: true },
    signalType: { type: String, enum: ALERT_SIGNAL_TYPES, required: true, index: true },
    fingerprint: { type: String, required: true, trim: true, maxlength: 128, index: true },
    safeSummary: { type: String, required: true, trim: true, maxlength: 1000 },
    safeReasonCodes: [{ type: String, trim: true, match: SAFE_CODE_PATTERN }],
    affectedDefinitionCount: { type: Number, default: 0, min: 0 },
    affectedRunCount: { type: Number, default: 0, min: 0 },
    affectedWorkerCount: { type: Number, default: 0, min: 0 },
    firstObservedAt: { type: Date, required: true, index: true },
    lastObservedAt: { type: Date, required: true, index: true },
    occurrenceCount: { type: Number, default: 1, min: 1 },
    acknowledgedBy: { type: String, trim: true, maxlength: 128 },
    acknowledgedAt: { type: Date },
    suppressedBy: { type: String, trim: true, maxlength: 128 },
    suppressedUntil: { type: Date },
    resolvedBy: { type: String, trim: true, maxlength: 128 },
    resolvedAt: { type: Date },
    incidentId: { type: String, trim: true, maxlength: 128, index: true },
    traceId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128 },
    requestId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationAlertSchema.index({ organizationId: 1, workspaceId: 1, status: 1, lastObservedAt: -1 });
orchestrationAlertSchema.index({ organizationId: 1, workspaceId: 1, severity: 1, status: 1 });
orchestrationAlertSchema.index({ organizationId: 1, workspaceId: 1, signalType: 1, status: 1 });
orchestrationAlertSchema.index(
  { organizationId: 1, workspaceId: 1, alertRuleId: 1, fingerprint: 1 },
  { unique: true, name: 'unique_tenant_alert_fingerprint' },
);
orchestrationAlertSchema.index({ firstObservedAt: -1 });
orchestrationAlertSchema.index({ lastObservedAt: -1 });

module.exports =
  mongoose.models.OrchestrationAlert ||
  mongoose.model('OrchestrationAlert', orchestrationAlertSchema);
