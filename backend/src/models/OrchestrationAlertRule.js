const mongoose = require('mongoose');
const {
  ALERT_COMPARISONS,
  ALERT_RULE_STATUSES,
  ALERT_SEVERITIES,
  ALERT_SIGNAL_TYPES,
  SLO_EVALUATION_WINDOWS,
} = require('../constants/orchestrationObservability');

const notificationChannelSchema = new mongoose.Schema(
  {
    channelType: { type: String, enum: ['incident', 'compliance_notification', 'audit_only'], default: 'audit_only' },
    targetId: { type: String, trim: true, maxlength: 128 },
  },
  { _id: false, strict: 'throw' },
);

const orchestrationAlertRuleSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true, immutable: true },
    workspaceId: { type: String, required: true, trim: true, index: true, immutable: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    version: { type: Number, required: true, min: 1, immutable: true },
    status: { type: String, enum: ALERT_RULE_STATUSES, default: 'draft', required: true, index: true },
    signalType: { type: String, enum: ALERT_SIGNAL_TYPES, required: true, index: true },
    threshold: { type: Number, required: true, min: 0, max: 1000000000 },
    comparison: { type: String, enum: ALERT_COMPARISONS, required: true, default: 'greater_than_or_equal' },
    evaluationWindow: { type: String, enum: SLO_EVALUATION_WINDOWS, required: true, default: 'rolling_24h' },
    minimumSampleSize: { type: Number, min: 1, max: 100000, default: 1 },
    severity: { type: String, enum: ALERT_SEVERITIES, required: true, default: 'warning', index: true },
    notificationChannels: { type: [notificationChannelSchema], default: [] },
    createIncident: { type: Boolean, default: false },
    suppressionWindowMs: { type: Number, min: 0, max: 2592000000, default: 0 },
    deduplicationWindowMs: { type: Number, min: 0, max: 2592000000, default: 3600000 },
    autoResolve: { type: Boolean, default: true },
    createdBy: { type: String, required: true, trim: true, maxlength: 128 },
    updatedBy: { type: String, required: true, trim: true, maxlength: 128 },
    activatedBy: { type: String, trim: true, maxlength: 128 },
    activatedAt: { type: Date },
    validationDigest: { type: String, trim: true, maxlength: 128, select: false },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationAlertRuleSchema.index(
  { organizationId: 1, workspaceId: 1, name: 1, version: 1 },
  { unique: true, name: 'unique_tenant_alert_rule_version' },
);
orchestrationAlertRuleSchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
orchestrationAlertRuleSchema.index({ organizationId: 1, workspaceId: 1, signalType: 1, status: 1 });
orchestrationAlertRuleSchema.index({ organizationId: 1, workspaceId: 1, severity: 1, status: 1 });

module.exports =
  mongoose.models.OrchestrationAlertRule ||
  mongoose.model('OrchestrationAlertRule', orchestrationAlertRuleSchema);
