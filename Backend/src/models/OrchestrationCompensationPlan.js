const mongoose = require('mongoose');
const {
  COMPENSATION_PLAN_STATUSES,
  FAILURE_CATEGORIES,
  RECOVERABILITIES,
  RECOVERY_LIMITS,
} = require('../constants/orchestrationRecovery');

const SAFE_CODE = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_HASH = /^(?:sha256|hmac-sha256):[a-f0-9]{64}$/;
const SAFE_STEP_KEY = /^[A-Za-z][A-Za-z0-9._:-]{0,127}$/;

function validOrderedSteps(steps = []) {
  if (steps.length > RECOVERY_LIMITS.maximumPlanSteps) return false;
  const keys = steps.map((step) => String(step.stepKey));
  const nodeRuns = steps.map((step) => String(step.originalNodeRunId));
  if (new Set(keys).size !== keys.length || new Set(nodeRuns).size !== nodeRuns.length) return false;
  const orderByKey = new Map(keys.map((key, index) => [key, index + 1]));
  return steps.every((step, index) => {
    const dependencies = (step.dependencyStepKeys || []).map(String);
    return (
      Number(step.order) === index + 1 &&
      new Set(dependencies).size === dependencies.length &&
      dependencies.every(
        (dependency) =>
          orderByKey.has(dependency) &&
          orderByKey.get(dependency) < Number(step.order) &&
          dependency !== String(step.stepKey),
      )
    );
  });
}

const compensationPlanStepSchema = new mongoose.Schema(
  {
    stepKey: { type: String, required: true, trim: true, match: SAFE_STEP_KEY, immutable: true },
    order: { type: Number, required: true, min: 1, immutable: true },
    originalNodeRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationNodeRun',
      required: true,
      immutable: true,
    },
    compensationRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationCompensationRun',
      immutable: true,
    },
    nodeKey: { type: String, required: true, trim: true, maxlength: 100, immutable: true },
    dependencyStepKeys: [{ type: String, trim: true, match: SAFE_STEP_KEY, immutable: true }],
    recoverability: { type: String, enum: RECOVERABILITIES, required: true, immutable: true },
    compensationRequired: { type: Boolean, required: true, immutable: true },
    approvalRequired: { type: Boolean, required: true, default: false, immutable: true },
    parallelSafe: { type: Boolean, required: true, default: false, immutable: true },
    safeReasonCode: { type: String, required: true, trim: true, match: SAFE_CODE, immutable: true },
    compensationDefinitionHash: { type: String, trim: true, match: SAFE_HASH, immutable: true },
  },
  { _id: false, strict: 'throw' },
);

const orchestrationCompensationPlanSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, immutable: true, index: true },
    workspaceId: { type: String, required: true, trim: true, immutable: true, index: true },
    orchestrationRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRun',
      required: true,
      immutable: true,
      index: true,
    },
    recoveryPolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRecoveryPolicy',
      immutable: true,
    },
    recoveryPolicyVersion: { type: Number, min: 1, immutable: true },
    triggerNodeRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationNodeRun',
      immutable: true,
      index: true,
    },
    triggerFailureCategory: { type: String, enum: FAILURE_CATEGORIES, immutable: true },
    triggerReasonCode: { type: String, required: true, trim: true, match: SAFE_CODE, immutable: true },
    status: {
      type: String,
      enum: COMPENSATION_PLAN_STATUSES,
      required: true,
      default: 'planned',
      index: true,
    },
    orderedSteps: {
      type: [compensationPlanStepSchema],
      required: true,
      validate: {
        validator: validOrderedSteps,
        message: 'orderedSteps must be unique, contiguous, bounded, and dependency ordered',
      },
      immutable: true,
    },
    completedStepCount: { type: Number, default: 0, min: 0 },
    failedStepCount: { type: Number, default: 0, min: 0 },
    nonReversibleStepCount: { type: Number, default: 0, min: 0 },
    skippedStepCount: { type: Number, default: 0, min: 0 },
    maximumParallelCompensations: {
      type: Number,
      required: true,
      min: 1,
      max: RECOVERY_LIMITS.maximumParallelCompensations,
      default: 1,
      immutable: true,
    },
    continueAfterFailure: { type: Boolean, required: true, default: false, immutable: true },
    planDigest: { type: String, required: true, trim: true, match: SAFE_HASH, immutable: true },
    idempotencyKeyHash: {
      type: String,
      required: true,
      trim: true,
      match: SAFE_HASH,
      immutable: true,
      select: false,
    },
    createdBy: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationCompensationPlanSchema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 });
orchestrationCompensationPlanSchema.index({ orchestrationRunId: 1, createdAt: -1 });
orchestrationCompensationPlanSchema.index({ triggerNodeRunId: 1, createdAt: -1 });
orchestrationCompensationPlanSchema.index(
  { organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 },
  { unique: true, name: 'unique_tenant_compensation_plan_idempotency' },
);

module.exports =
  mongoose.models.OrchestrationCompensationPlan ||
  mongoose.model('OrchestrationCompensationPlan', orchestrationCompensationPlanSchema);
