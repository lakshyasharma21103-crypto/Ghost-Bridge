const mongoose = require('mongoose');
const {
  ALERT_SIGNAL_TYPES,
  SLO_EVALUATION_WINDOWS,
  SLO_POLICY_STATUSES,
} = require('../constants/orchestrationObservability');

const burnRateWindowSchema = new mongoose.Schema(
  {
    window: { type: String, enum: SLO_EVALUATION_WINDOWS, required: true },
    burnRateThresholdScaledInteger: { type: Number, required: true, min: 0, max: 100000 },
    signalType: { type: String, enum: ALERT_SIGNAL_TYPES, default: 'error_budget_burn' },
  },
  { _id: false, strict: 'throw' },
);

const orchestrationSloPolicySchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true, immutable: true },
    workspaceId: { type: String, required: true, trim: true, index: true, immutable: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    version: { type: Number, required: true, min: 1, immutable: true },
    status: { type: String, enum: SLO_POLICY_STATUSES, default: 'draft', required: true, index: true },
    appliesToDefinitionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationDefinition' }],
    appliesToCapabilityCategories: [{ type: String, trim: true, maxlength: 80 }],
    appliesToCriticalityLevels: [{ type: String, trim: true, maxlength: 80 }],
    availabilityTargetBasisPoints: { type: Number, min: 0, max: 10000, default: 9900 },
    successTargetBasisPoints: { type: Number, min: 0, max: 10000, default: 9900 },
    partialFailureBudgetBasisPoints: { type: Number, min: 0, max: 10000, default: 100 },
    maximumQueueWaitMs: { type: Number, min: 1, max: 2592000000, default: 300000 },
    maximumRunDurationMs: { type: Number, min: 1, max: 2592000000, default: 1800000 },
    maximumNodeDurationMs: { type: Number, min: 1, max: 2592000000, default: 300000 },
    maximumRecoveryDurationMs: { type: Number, min: 1, max: 2592000000, default: 900000 },
    maximumCompensationDurationMs: { type: Number, min: 1, max: 2592000000, default: 900000 },
    maximumApprovalWaitMs: { type: Number, min: 1, max: 2592000000, default: 86400000 },
    maximumInterventionWaitMs: { type: Number, min: 1, max: 2592000000, default: 86400000 },
    maximumRetryRateBasisPoints: { type: Number, min: 0, max: 10000, default: 1000 },
    maximumFailureRateBasisPoints: { type: Number, min: 0, max: 10000, default: 100 },
    maximumStuckRunCount: { type: Number, min: 0, max: 100000, default: 0 },
    evaluationWindow: { type: String, enum: SLO_EVALUATION_WINDOWS, default: 'rolling_24h', required: true },
    minimumSampleSize: { type: Number, min: 1, max: 100000, default: 10 },
    burnRateWindows: { type: [burnRateWindowSchema], default: [] },
    alertPolicyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationAlertRule' }],
    createdBy: { type: String, required: true, trim: true, maxlength: 128 },
    updatedBy: { type: String, required: true, trim: true, maxlength: 128 },
    activatedBy: { type: String, trim: true, maxlength: 128 },
    archivedBy: { type: String, trim: true, maxlength: 128 },
    activatedAt: { type: Date },
    archivedAt: { type: Date },
    validationDigest: { type: String, trim: true, maxlength: 128, select: false },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationSloPolicySchema.index(
  { organizationId: 1, workspaceId: 1, name: 1, version: 1 },
  { unique: true, name: 'unique_tenant_slo_policy_version' },
);
orchestrationSloPolicySchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
orchestrationSloPolicySchema.index({ organizationId: 1, workspaceId: 1, name: 1, version: -1 });

module.exports =
  mongoose.models.OrchestrationSloPolicy ||
  mongoose.model('OrchestrationSloPolicy', orchestrationSloPolicySchema);
