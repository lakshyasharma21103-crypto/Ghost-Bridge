const mongoose = require('mongoose');
const { BACKPRESSURE_STATES, DATABASE_PRESSURE_CATEGORIES } = require('../constants/productionScale');
const SAFE_TEXT = (value) => !/(bearer\s+|mongodb(?:\+srv)?:\/\/|redis:\/\/|credential|secret|password|api.?key|private key)/i.test(String(value || ''));
const { WORKLOAD_DOMAIN_IDS } = require('../constants/performanceCapacity');

const BASIS_POINTS = { type: Number, required: true, min: 0, max: 10_000 };
const DURATION = { type: Number, required: true, min: 1, max: 2_592_000_000 };

const latencyBudgetSchema = new mongoose.Schema(
  {
    p50Ms: { ...DURATION, default: 1_000 },
    p90Ms: { ...DURATION, default: 2_000 },
    p95Ms: { ...DURATION, default: 5_000 },
    p99Ms: { ...DURATION, default: 10_000 },
    maximumMs: { ...DURATION, default: 30_000 },
  },
  { _id: false, strict: 'throw' },
);
const queueBudgetSchema = new mongoose.Schema(
  {
    p50QueueWaitMs: { ...DURATION, default: 1_000 },
    p95QueueWaitMs: { ...DURATION, default: 5_000 },
    p99QueueWaitMs: { ...DURATION, default: 10_000 },
    maximumOldestQueueAgeMs: { ...DURATION, default: 60_000 },
  },
  { _id: false, strict: 'throw' },
);
const executionBudgetSchema = new mongoose.Schema(
  {
    p95NodeExecutionMs: { ...DURATION, default: 30_000 },
    p95GatewayExecutionMs: { ...DURATION, default: 30_000 },
    p95DatabaseOperationMs: { ...DURATION, default: 5_000 },
    p95CacheOperationMs: { ...DURATION, default: 1_000 },
    p95PolicyEvaluationMs: { ...DURATION, default: 2_000 },
  },
  { _id: false, strict: 'throw' },
);
const orchestrationBudgetSchema = new mongoose.Schema(
  {
    p95RunDurationMs: { ...DURATION, default: 300_000 },
    p99RunDurationMs: { ...DURATION, default: 600_000 },
    maximumStuckRunRateBasisPoints: { ...BASIS_POINTS, default: 100 },
    maximumUnknownOutcomeRateBasisPoints: { ...BASIS_POINTS, default: 100 },
  },
  { _id: false, strict: 'throw' },
);
const capacityBudgetSchema = new mongoose.Schema(
  {
    maximumWorkerUtilizationBasisPoints: { ...BASIS_POINTS, default: 9_000 },
    minimumHeadroomBasisPoints: { ...BASIS_POINTS, default: 1_000 },
    maximumDatabasePressureCategory: { type: String, enum: DATABASE_PRESSURE_CATEGORIES, required: true, default: 'elevated' },
    maximumBackpressureState: { type: String, enum: BACKPRESSURE_STATES, required: true, default: 'elevated' },
    maximumLeaseExpiryRateBasisPoints: { ...BASIS_POINTS, default: 500 },
  },
  { _id: false, strict: 'throw' },
);
const fairnessBudgetSchema = new mongoose.Schema(
  {
    maximumTenantServiceSkewBasisPoints: { ...BASIS_POINTS, default: 2_000 },
    maximumTenantStarvationWindowMs: { ...DURATION, default: 60_000 },
  },
  { _id: false, strict: 'throw' },
);
const recoveryBudgetSchema = new mongoose.Schema(
  {
    p95RecoveryDurationMs: { ...DURATION, default: 300_000 },
    p95CompensationDurationMs: { ...DURATION, default: 300_000 },
    minimumRecoverySuccessRateBasisPoints: { ...BASIS_POINTS, default: 9_000 },
  },
  { _id: false, strict: 'throw' },
);
const regionalBudgetSchema = new mongoose.Schema(
  {
    maximumFailoverRtoMs: { ...DURATION, default: 900_000 },
    maximumFailoverRpoMs: { ...DURATION, default: 300_000 },
    maximumRegionalRoutingErrorRateBasisPoints: { ...BASIS_POINTS, default: 100 },
  },
  { _id: false, strict: 'throw' },
);

const schema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['platform', 'organization', 'workspace', 'orchestration_definition', 'workload_domain'], required: true },
    organizationId: { type: String, trim: true, maxlength: 200 },
    workspaceId: { type: String, trim: true, maxlength: 200 },
    orchestrationDefinitionId: { type: String, trim: true, maxlength: 200 },
    workloadDomain: { type: String, enum: WORKLOAD_DOMAIN_IDS },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2_000, default: '' },
    version: { type: Number, required: true, min: 1, max: 1_000_000 },
    status: { type: String, enum: ['draft', 'active', 'archived'], required: true, default: 'draft' },
    minimumSampleSize: { type: Number, required: true, min: 1, max: 10_000_000, default: 10 },
    maximumErrorRateBasisPoints: { ...BASIS_POINTS, default: 100 },
    maximumUnexpectedFailureRateBasisPoints: { ...BASIS_POINTS, default: 100 },
    maximumTimeoutRateBasisPoints: { ...BASIS_POINTS, default: 100 },
    maximumRetryRateBasisPoints: { ...BASIS_POINTS, default: 1_000 },
    maximumOverloadRejectionRateBasisPoints: { ...BASIS_POINTS, default: 10_000 },
    maximumQuotaRejectionRateBasisPoints: { ...BASIS_POINTS, default: 10_000 },
    latencyBudgets: { type: latencyBudgetSchema, required: true, default: () => ({}) },
    queueBudgets: { type: queueBudgetSchema, required: true, default: () => ({}) },
    executionBudgets: { type: executionBudgetSchema, required: true, default: () => ({}) },
    orchestrationBudgets: { type: orchestrationBudgetSchema, required: true, default: () => ({}) },
    capacityBudgets: { type: capacityBudgetSchema, required: true, default: () => ({}) },
    fairnessBudgets: { type: fairnessBudgetSchema, required: true, default: () => ({}) },
    recoveryBudgets: { type: recoveryBudgetSchema, required: true, default: () => ({}) },
    regionalBudgets: { type: regionalBudgetSchema, required: true, default: () => ({}) },
    regressionToleranceBasisPoints: { ...BASIS_POINTS, default: 500 },
    absoluteRegressionToleranceMs: { type: Number, required: true, min: 0, max: 2_592_000_000, default: 50 },
    validation: {
      valid: Boolean,
      safeReasonCodes: [{ type: String, trim: true, maxlength: 128 }],
      validatedAt: Date,
    },
    idempotencyKeyHash: { type: String, select: false, trim: true, maxlength: 80 },
    requestFingerprint: { type: String, select: false, trim: true, maxlength: 80 },
    createdBy: { type: String, required: true, trim: true, maxlength: 200 },
    updatedBy: { type: String, trim: true, maxlength: 200 },
    activatedBy: { type: String, trim: true, maxlength: 200 },
    archivedBy: { type: String, trim: true, maxlength: 200 },
    activatedAt: Date,
    archivedAt: Date,
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

schema.path('scope').validate(function validateScope(scope) {
  if (scope === 'platform') return !this.organizationId && !this.workspaceId && !this.orchestrationDefinitionId;
  if (scope === 'organization') return Boolean(this.organizationId) && !this.workspaceId;
  if (scope === 'workspace') return Boolean(this.organizationId) && Boolean(this.workspaceId);
  if (scope === 'orchestration_definition') return Boolean(this.organizationId) && Boolean(this.workspaceId) && Boolean(this.orchestrationDefinitionId);
  return Boolean(this.workloadDomain);
}, 'Budget scope identifiers are inconsistent.');
schema.path('description').validate(SAFE_TEXT, 'Budget descriptions must not contain credentials or connection data.');
schema.path('latencyBudgets').validate((value) => value.p50Ms <= value.p90Ms && value.p90Ms <= value.p95Ms && value.p95Ms <= value.p99Ms && value.p99Ms <= value.maximumMs, 'Latency percentiles must be monotonic.');
schema.path('queueBudgets').validate((value) => value.p50QueueWaitMs <= value.p95QueueWaitMs && value.p95QueueWaitMs <= value.p99QueueWaitMs && value.p99QueueWaitMs <= value.maximumOldestQueueAgeMs, 'Queue percentiles must be monotonic.');

schema.index({ scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, { name: 'performance_budget_scope_status' });
schema.index({ workloadDomain: 1, status: 1 }, { name: 'performance_budget_workload_status' });
schema.index({ scope: 1, organizationId: 1, workspaceId: 1, name: 1, version: 1 }, { unique: true, name: 'performance_budget_name_version' });
schema.index({ organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 }, { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'performance_budget_idempotency' });

module.exports = mongoose.models.PerformanceBudgetPolicy || mongoose.model('PerformanceBudgetPolicy', schema);
