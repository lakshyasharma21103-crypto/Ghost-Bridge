const mongoose = require('mongoose');
const { HEADROOM_CATEGORIES, WORKLOAD_DOMAIN_IDS } = require('../constants/performanceCapacity');
const SAFE_TEXT = (value) => !/(bearer\s+|mongodb(?:\+srv)?:\/\/|redis:\/\/|credential|secret|password|api.?key|private key|provider.?account)/i.test(String(value));

const SAFE_CATEGORY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const safeTextArray = (maximum) => ({
  type: [{ type: String, trim: true, maxlength: 512 }],
  default: [],
  validate: (items) => items.length <= maximum && items.every(SAFE_TEXT),
});
const workerCount = { type: Number, required: true, min: 0, max: 100_000 };
const regionalRequirementSchema = new mongoose.Schema(
  {
    regionCategory: { type: String, required: true, trim: true, match: SAFE_CATEGORY },
    failoverPolicy: { type: String, enum: ['full_primary_load', 'critical_operations_only', 'degraded_mode', 'manual_scale_up'], required: true },
    requiredCapacityBasisPoints: { type: Number, required: true, min: 0, max: 20_000 },
    requiredExecutionWorkers: workerCount,
    requiredRecoveryWorkers: workerCount,
    headroomCategory: { type: String, enum: HEADROOM_CATEGORIES, required: true },
  },
  { _id: false, strict: 'throw' },
);

const schema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['platform', 'organization', 'workspace'], required: true },
    organizationId: { type: String, trim: true, maxlength: 200 },
    workspaceId: { type: String, trim: true, maxlength: 200 },
    workloadDomain: { type: String, enum: WORKLOAD_DOMAIN_IDS, required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2_000, default: '' },
    version: { type: Number, required: true, min: 1, max: 1_000_000 },
    status: { type: String, enum: ['draft', 'active', 'archived'], required: true, default: 'draft' },
    forecastWindow: { type: String, enum: ['current', 'seven_days', 'thirty_days', 'ninety_days'], required: true },
    expectedPeakRequestsPerSecond: { type: Number, required: true, min: 0, max: 1_000_000 },
    expectedPeakConcurrentRuns: { type: Number, required: true, min: 0, max: 1_000_000 },
    expectedPeakConcurrentNodes: { type: Number, required: true, min: 0, max: 10_000_000 },
    expectedQueueDepth: { type: Number, required: true, min: 0, max: 1_000_000_000 },
    expectedDataGrowthCategory: { type: String, enum: ['none', 'low', 'moderate', 'high', 'critical', 'unknown'], required: true },
    requiredExecutionWorkers: workerCount,
    requiredRecoveryWorkers: workerCount,
    requiredControlPlaneWorkers: workerCount,
    recommendedWorkerConcurrency: { type: Number, required: true, min: 1, max: 1_000 },
    recommendedPartitionCount: { type: Number, required: true, min: 1, max: 256 },
    recommendedDatabaseCapacityCategory: { type: String, required: true, trim: true, match: SAFE_CATEGORY },
    recommendedCacheCapacityCategory: { type: String, required: true, trim: true, match: SAFE_CATEGORY },
    reservedRecoveryCapacity: { type: Number, required: true, min: 0, max: 100_000 },
    minimumHeadroomBasisPoints: { type: Number, required: true, min: 0, max: 10_000 },
    regionalCapacityRequirements: { type: [regionalRequirementSchema], default: [], validate: (items) => items.length <= 32 },
    failoverCapacityRequirementBasisPoints: { type: Number, required: true, min: 0, max: 20_000 },
    sourceCapacityModelIds: { type: [{ type: String, trim: true, maxlength: 200 }], required: true, validate: (items) => items.length >= 1 && items.length <= 128 },
    assumptions: safeTextArray(64),
    limitations: safeTextArray(64),
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
  if (scope === 'platform') return !this.organizationId && !this.workspaceId;
  if (scope === 'organization') return Boolean(this.organizationId) && !this.workspaceId;
  return Boolean(this.organizationId) && Boolean(this.workspaceId);
}, 'Capacity-plan scope identifiers are inconsistent.');
schema.path('name').validate(SAFE_TEXT, 'Capacity-plan names must not contain credentials or provider account data.');
schema.path('description').validate(SAFE_TEXT, 'Capacity-plan descriptions must not contain credentials or provider account data.');
schema.path('regionalCapacityRequirements').validate((items) => new Set(items.map((item) => item.regionCategory)).size === items.length, 'Regional capacity categories must be unique.');
schema.index({ scope: 1, organizationId: 1, workspaceId: 1, status: 1 }, { name: 'capacity_plan_scope_status' });
schema.index({ workloadDomain: 1, status: 1 }, { name: 'capacity_plan_workload_status' });
schema.index({ scope: 1, organizationId: 1, workspaceId: 1, name: 1, version: 1 }, { unique: true, name: 'capacity_plan_name_version' });
schema.index({ organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 }, { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'capacity_plan_idempotency' });

module.exports = mongoose.models.CapacityPlan || mongoose.model('CapacityPlan', schema);
