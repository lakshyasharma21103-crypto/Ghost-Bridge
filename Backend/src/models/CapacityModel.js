const mongoose = require('mongoose');
const { DATABASE_PRESSURE_CATEGORIES } = require('../constants/productionScale');
const { WORKLOAD_DOMAIN_IDS } = require('../constants/performanceCapacity');
const SAFE_TEXT = (value) => !/(bearer\s+|mongodb(?:\+srv)?:\/\/|redis:\/\/|credential|secret|password|api.?key|private key)/i.test(String(value));

const safeTextArray = (maximum) => ({
  type: [{ type: String, trim: true, maxlength: 512 }],
  default: [],
  validate: (items) => items.length <= maximum && items.every(SAFE_TEXT),
});
const nonnegative = { type: Number, required: true, min: 0, max: 1_000_000_000 };

const schema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['platform', 'organization', 'workspace'], required: true, immutable: true },
    organizationId: { type: String, trim: true, maxlength: 200, immutable: true },
    workspaceId: { type: String, trim: true, maxlength: 200, immutable: true },
    workloadDomain: { type: String, enum: WORKLOAD_DOMAIN_IDS, required: true, immutable: true },
    scenarioId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    scenarioVersion: { type: Number, required: true, min: 1, max: 1_000_000, immutable: true },
    environmentFingerprintId: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    status: { type: String, enum: ['candidate', 'active', 'superseded', 'archived'], required: true, default: 'candidate' },
    modelVersion: { type: Number, required: true, min: 1, max: 1_000_000, immutable: true },
    observedArrivalRate: nonnegative,
    observedCompletionRate: nonnegative,
    observedConcurrency: nonnegative,
    observedQueueWait: { type: Number, required: true, min: 0, max: 2_592_000_000 },
    observedExecutionTime: { type: Number, required: true, min: 0, max: 2_592_000_000 },
    observedWorkerUtilization: { type: Number, required: true, min: 0, max: 10_000 },
    observedDatabasePressure: { type: String, enum: [...DATABASE_PRESSURE_CATEGORIES, 'unknown'], required: true },
    observedCacheHitRate: { type: Number, required: true, min: 0, max: 10_000 },
    saturationPointEstimate: nonnegative,
    sustainableThroughputEstimate: nonnegative,
    safeConcurrencyEstimate: nonnegative,
    queueDrainRateEstimate: nonnegative,
    queueDrainTimeEstimateMs: { type: Number, min: 0, max: 2_592_000_000 },
    reservedCapacityEstimate: nonnegative,
    minimumHeadroomBasisPoints: { type: Number, required: true, min: 0, max: 10_000 },
    headroomCategory: { type: String, enum: ['ample', 'adequate', 'limited', 'critical', 'unknown'], required: true, default: 'unknown' },
    headroomBasisPoints: { type: Number, min: -100_000, max: 10_000 },
    requiredExecutionWorkers: { type: Number, min: 0, max: 100_000 },
    recommendedPartitionCount: { type: Number, min: 1, max: 256 },
    confidenceCategory: { type: String, enum: ['low', 'medium', 'high'], required: true },
    assumptions: safeTextArray(64),
    limitations: safeTextArray(64),
    sourcePerformanceRunIds: { type: [{ type: String, trim: true, maxlength: 200 }], required: true, validate: (items) => items.length >= 1 && items.length <= 128 },
    createdBy: { type: String, required: true, trim: true, maxlength: 200, immutable: true },
    approvedBy: { type: String, trim: true, maxlength: 200 },
    approvedAt: Date,
    idempotencyKeyHash: { type: String, select: false, trim: true, maxlength: 80, immutable: true },
    requestFingerprint: { type: String, select: false, trim: true, maxlength: 80, immutable: true },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

schema.path('scope').validate(function validateScope(scope) {
  if (scope === 'platform') return !this.organizationId && !this.workspaceId;
  if (scope === 'organization') return Boolean(this.organizationId) && !this.workspaceId;
  return Boolean(this.organizationId) && Boolean(this.workspaceId);
}, 'Capacity-model scope identifiers are inconsistent.');
schema.path('sustainableThroughputEstimate').validate(function validateSustainable(value) { return value <= this.saturationPointEstimate; }, 'Sustainable throughput cannot exceed the estimated saturation point.');
schema.index({ scope: 1, workloadDomain: 1, status: 1 }, { name: 'capacity_model_scope_workload_status' });
schema.index({ environmentFingerprintId: 1 }, { name: 'capacity_model_environment' });
schema.index({ createdAt: -1 }, { name: 'capacity_model_created_at' });
schema.index({ organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 }, { unique: true, partialFilterExpression: { idempotencyKeyHash: { $type: 'string' } }, name: 'capacity_model_idempotency' });

module.exports = mongoose.models.CapacityModel || mongoose.model('CapacityModel', schema);
