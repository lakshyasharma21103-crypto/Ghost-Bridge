const mongoose = require('mongoose');
const {
  SAFE_CODE_PATTERN,
  SLO_EVALUATION_STATUSES,
} = require('../constants/orchestrationObservability');

const orchestrationSloEvaluationSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true, immutable: true },
    workspaceId: { type: String, required: true, trim: true, index: true, immutable: true },
    sloPolicyId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationSloPolicy', required: true, index: true },
    sloPolicyVersion: { type: Number, required: true, min: 1 },
    windowStart: { type: Date, required: true, index: true },
    windowEnd: { type: Date, required: true, index: true },
    evaluationStatus: { type: String, enum: SLO_EVALUATION_STATUSES, required: true, index: true },
    sampleSize: { type: Number, default: 0, min: 0 },
    successRateBasisPoints: { type: Number, min: 0, max: 10000, default: 0 },
    failureRateBasisPoints: { type: Number, min: 0, max: 10000, default: 0 },
    partialFailureRateBasisPoints: { type: Number, min: 0, max: 10000, default: 0 },
    retryRateBasisPoints: { type: Number, min: 0, max: 10000, default: 0 },
    queueWaitComplianceBasisPoints: { type: Number, min: 0, max: 10000, default: 0 },
    runDurationComplianceBasisPoints: { type: Number, min: 0, max: 10000, default: 0 },
    nodeDurationComplianceBasisPoints: { type: Number, min: 0, max: 10000, default: 0 },
    recoveryComplianceBasisPoints: { type: Number, min: 0, max: 10000, default: 0 },
    compensationComplianceBasisPoints: { type: Number, min: 0, max: 10000, default: 0 },
    errorBudgetRemainingBasisPoints: { type: Number, min: 0, max: 10000, default: 0 },
    burnRateScaledInteger: { type: Number, min: 0, default: 0 },
    safeBreachReasons: [{ type: String, trim: true, match: SAFE_CODE_PATTERN }],
    generatedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: false, strict: 'throw' },
);

orchestrationSloEvaluationSchema.index({ organizationId: 1, workspaceId: 1, sloPolicyId: 1, windowEnd: -1 });
orchestrationSloEvaluationSchema.index({ organizationId: 1, workspaceId: 1, evaluationStatus: 1, generatedAt: -1 });
orchestrationSloEvaluationSchema.index({ generatedAt: -1 });

module.exports =
  mongoose.models.OrchestrationSloEvaluation ||
  mongoose.model('OrchestrationSloEvaluation', orchestrationSloEvaluationSchema);
